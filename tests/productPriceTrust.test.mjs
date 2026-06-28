import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessProductPriceTrust } from "../lib/productPriceTrust.ts";

const verifiedAt = "2026-06-20T00:00:00.000Z";

function field(value, sourceUrl, sourceType = "retailer_page", confidence = "High") {
  return {
    confidence,
    sourceType,
    sourceUrl,
    value,
    verifiedAt,
  };
}

function offer(price, url = "https://www.example.com/product/example-123", overrides = {}) {
  return {
    availability: field("In stock", url),
    price: field(price, url, overrides.sourceType || "retailer_page", overrides.confidence || "High"),
    priceCurrency: field("USD", url),
    retailer: overrides.retailer || "Example Store",
    url,
  };
}

function product(overrides = {}) {
  return {
    category: "Outdoor basketball hoop",
    estimated_price_range: "$799",
    metadata: {
      offers: [offer(799)],
    },
    name: "Example In-Ground Basketball Hoop System",
    ...overrides,
  };
}

describe("shared product price trust", () => {
  it("trusts product-page or retailer offer prices for budget checks", () => {
    const trust = assessProductPriceTrust(product());

    assert.equal(trust.status, "verified");
    assert.equal(trust.price, 799);
    assert.equal(trust.canUseForBudget, true);
    assert.equal(trust.canBeExactWithBudget, true);
  });

  it("does not treat vague ceiling text as a verified product price", () => {
    const trust = assessProductPriceTrust(
      product({
        estimated_price_range: "Under $300",
        metadata: { offers: [] },
      }),
    );

    assert.equal(trust.status, "missing");
    assert.equal(trust.price, null);
    assert.equal(trust.canBeExactWithBudget, false);
  });

  it("does not treat monthly payment text as a product price", () => {
    const trust = assessProductPriceTrust(
      product({
        estimated_price_range: "$35/mo with financing",
        metadata: { offers: [] },
      }),
    );

    assert.equal(trust.status, "missing");
    assert.equal(trust.canUseForBudget, false);
  });

  it("marks conflicting fake-low and product-page prices as unsafe for exact budget matches", () => {
    const trust = assessProductPriceTrust(
      product({
        estimated_price_range: "$35 at target.com",
        metadata: {
          offers: [offer(799, "https://www.target.com/p/example-hoop/-/A-123")],
        },
      }),
    );

    assert.equal(trust.status, "conflicting");
    assert.equal(trust.price, 799);
    assert.equal(trust.canBeExactWithBudget, false);
    assert.match(trust.displayText, /needs verification/i);
  });

  it("rejects implausibly low category prices as suspicious", () => {
    const trust = assessProductPriceTrust(
      product({
        category: "Stroller car seat travel system",
        estimated_price_range: "$35",
        metadata: {
          offers: [offer(35, "https://www.example.com/products/stroller-combo")],
        },
        name: "Example Stroller and Car Seat Travel System",
      }),
    );

    assert.equal(trust.status, "suspicious");
    assert.equal(trust.price, null);
    assert.equal(trust.canBeExactWithBudget, false);
  });

  it("rejects the reproduced cross-category $10 full-product offers", () => {
    const cases = [
      {
        category: "shop vac",
        name: "Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet ...",
      },
      {
        category: "dash cam",
        name: "Dash Cam Front and Rear, 1080P Dash Camera for Cars, 3 ...",
      },
      {
        category: "wireless earbuds",
        name: "Wireless Earbuds, Bluetooth 5.4 Headphones Bass Stereo, Ear ...",
      },
    ];

    for (const testCase of cases) {
      const trust = assessProductPriceTrust(
        product({
          ...testCase,
          estimated_price_range: "$10",
          metadata: {
            offers: [offer(10, "https://www.amazon.com/dp/example")],
          },
        }),
      );

      assert.equal(trust.status, "suspicious", testCase.category);
      assert.equal(trust.price, null, testCase.category);
      assert.equal(trust.canUseForBudget, false, testCase.category);
      assert.equal(trust.canBeExactWithBudget, false, testCase.category);
    }
  });

  it("keeps a plausible genuinely cheap wireless-earbud offer verified above the tiny-price floor", () => {
    const trust = assessProductPriceTrust(
      product({
        category: "wireless earbuds",
        estimated_price_range: "$12.99",
        metadata: {
          offers: [
            offer(12.99, "https://www.example.com/products/wireless-earbuds"),
          ],
        },
        name: "Basic Bluetooth Wireless Earbuds with Microphone",
      }),
    );

    assert.equal(trust.status, "verified");
    assert.equal(trust.price, 12.99);
    assert.equal(trust.canUseForBudget, true);
    assert.equal(trust.canBeExactWithBudget, true);
  });

  it("rejects promo-sized prices for full-size refrigerators without blocking compact fridges", () => {
    const fullSizeTrust = assessProductPriceTrust(
      product({
        category: "Refrigerator",
        estimated_price_range: "$515",
        metadata: {
          offers: [
            offer(515, "https://www.lg.com/us/refrigerators/lg-lf25s6560s-french-3-door-refrigerator", {
              retailer: "lg.com",
              sourceType: "manufacturer_page",
            }),
          ],
        },
        name: "LG 25 cu. ft. Smart Standard-Depth MAX French Door Refrigerator",
      }),
    );

    assert.equal(fullSizeTrust.status, "suspicious");
    assert.equal(fullSizeTrust.price, null);
    assert.equal(fullSizeTrust.canBeExactWithBudget, false);

    const compactTrust = assessProductPriceTrust(
      product({
        category: "Mini fridge",
        estimated_price_range: "$129",
        metadata: {
          offers: [offer(129, "https://www.example.com/compact-fridge")],
        },
        name: "Example 3.2 cu ft compact mini fridge",
      }),
    );

    assert.equal(compactTrust.status, "verified");
    assert.equal(compactTrust.price, 129);
  });

  it("treats a specific, plausible text-only price as budget-usable but flagged for verification", () => {
    const trust = assessProductPriceTrust(
      product({
        estimated_price_range: "$299",
        metadata: { offers: [] },
      }),
    );

    // A specific text price that cleared the implausibly-low/conflicting checks is good
    // enough to test against a budget (so clearly-in-budget products are not all forced
    // into near matches), while still flagged as needs-verification on the card.
    assert.equal(trust.status, "needs_verification");
    assert.equal(trust.price, 299);
    assert.equal(trust.canUseForBudget, true);
    assert.match(trust.displayText, /needs verification/i);
  });

  it("does not treat a vague text price range as budget-usable", () => {
    const rangeTrust = assessProductPriceTrust(
      product({ estimated_price_range: "$250 to $350", metadata: { offers: [] } }),
    );
    assert.equal(rangeTrust.canUseForBudget, false);
    assert.equal(rangeTrust.status, "needs_verification");

    const approxTrust = assessProductPriceTrust(
      product({ estimated_price_range: "around $250", metadata: { offers: [] } }),
    );
    assert.equal(approxTrust.canUseForBudget, false);
  });

  it("uses the lowest trustworthy purchasable offer when multiple verified offers exist", () => {
    const trust = assessProductPriceTrust(
      product({
        category: "Garden hose",
        estimated_price_range: "About $39.97 to $44.98",
        metadata: {
          offers: [
            offer(44.98, "https://www.lowes.com/pd/example-hose/123", {
              retailer: "Lowe's",
            }),
            offer(39.97, "https://www.homedepot.com/p/example-hose/123", {
              retailer: "The Home Depot",
            }),
          ],
        },
        name: "Example 50 ft Garden Hose",
      }),
    );

    assert.equal(trust.status, "verified");
    assert.equal(trust.price, 39.97);
    assert.equal(trust.canUseForBudget, true);
  });
});

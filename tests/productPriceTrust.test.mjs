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

  it("keeps text-only prices visible but not strong enough for exact budget matching", () => {
    const trust = assessProductPriceTrust(
      product({
        estimated_price_range: "$299",
        metadata: { offers: [] },
      }),
    );

    assert.equal(trust.status, "needs_verification");
    assert.equal(trust.price, 299);
    assert.equal(trust.canUseForBudget, false);
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

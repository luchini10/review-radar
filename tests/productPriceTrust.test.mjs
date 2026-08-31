import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessProductPriceTrust } from "../lib/productPriceTrust.ts";

function field(value, sourceType = "retailer_page") {
  return {
    confidence: "High",
    sourceType,
    sourceUrl: "https://shop.example/products/item",
    value,
    verifiedAt: "2026-08-31T00:00:00.000Z",
  };
}

function offer(price, sourceType = "retailer_page") {
  return {
    price: field(price, sourceType),
    priceCurrency: field("USD", sourceType),
  };
}

describe("selection price trust", () => {
  it("trusts a plausible product-page offer", () => {
    const trust = assessProductPriceTrust({
      category: "tablet",
      metadata: { offers: [offer(799)] },
      name: "Apple iPad Pro M4",
    });

    assert.deepEqual(trust, { price: 799, status: "verified" });
  });

  it("returns missing when no structured or search offer exists", () => {
    assert.deepEqual(
      assessProductPriceTrust({
        category: "tablet",
        metadata: { offers: [] },
        name: "Apple iPad Pro M4",
      }),
      { price: null, status: "missing" },
    );
  });

  it("does not trust an implausibly tiny full-product offer", () => {
    const trust = assessProductPriceTrust({
      category: "shop vac",
      metadata: { offers: [offer(10)] },
      name: "RIDGID 12 Gallon 5 Peak HP Wet Dry Shop Vacuum",
    });

    assert.equal(trust.status, "suspicious");
    assert.equal(trust.price, null);
  });

  it("uses the lowest plausible current offer", () => {
    const trust = assessProductPriceTrust({
      category: "monitor",
      metadata: { offers: [offer(199), offer(179, "json_ld")] },
      name: "Acer 27 inch QHD 180Hz Gaming Monitor",
    });

    assert.equal(trust.status, "verified");
    assert.equal(trust.price, 179);
  });

  it("does not use model-generated price text", () => {
    const trust = assessProductPriceTrust({
      category: "tablet",
      estimated_price_range: "$799",
      metadata: { offers: [] },
      name: "Apple iPad Pro M4",
    });

    assert.deepEqual(trust, { price: null, status: "missing" });
  });

  it("does not label a foreign or unknown-currency amount as USD", () => {
    const foreign = offer(199);
    foreign.priceCurrency = field("EUR");
    const unknown = offer(179);
    unknown.priceCurrency = field(null);

    assert.deepEqual(
      assessProductPriceTrust({
        category: "monitor",
        metadata: { offers: [foreign, unknown] },
        name: "Example 27 inch monitor",
      }),
      { price: null, status: "missing" },
    );
  });
});

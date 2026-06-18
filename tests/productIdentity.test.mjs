import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { areSameCanonicalProduct } from "../lib/productIdentity.ts";

function product(name, product_page_url = "") {
  return {
    citations: [],
    common_complaints: [],
    confidence_score: 80,
    cons: [],
    estimated_price_range: "$149",
    name,
    not_for: [],
    price_value_verdict: "Test verdict.",
    product_image_url: "",
    product_page_url,
    pros: [],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended: "Test recommendation.",
  };
}

describe("product identity", () => {
  it("treats a named model and its product-family listing as the same product", () => {
    assert.equal(
      areSameCanonicalProduct(
        product(
          "De'Longhi Stilosa Espresso Machine (EC260BK)",
          "https://www.target.com/p/stilosa-espresso-machine-by-delonghi-ec260bk/-/A-80182504",
        ),
        product(
          "De'Longhi Stilosa Espresso Machine",
          "https://www.wholelattelove.com/products/delonghi-stilosa-espresso-machine",
        ),
      ),
      true,
    );
  });

  it("does not merge different explicit model numbers", () => {
    assert.equal(
      areSameCanonicalProduct(
        product("Acme Comfort Plus Sleeper Sofa SS2000"),
        product("Acme Comfort Plus Sleeper Sofa SS3000"),
      ),
      false,
    );
  });
});

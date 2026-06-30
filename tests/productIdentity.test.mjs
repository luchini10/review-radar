import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  areSameCanonicalProduct,
  areSameExactModelProduct,
} from "../lib/productIdentity.ts";

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
  it("keeps products that differ only by a single-digit size as DISTINCT", () => {
    // Regression: these used to collapse to the same canonical id (the single-digit
    // size was dropped), merging different vacs and shrinking the result list.
    assert.equal(
      areSameCanonicalProduct(
        product("Stanley 5 Gallon Wet/Dry Vacuum"),
        product("Stanley 6 Gallon Wet/Dry Vacuum"),
      ),
      false,
    );
    assert.equal(
      areSameCanonicalProduct(
        product("Craftsman 9 Gallon Wet/Dry Vac"),
        product("Craftsman 16 Gallon Wet/Dry Vac"),
      ),
      false,
    );
  });

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
      areSameExactModelProduct(
        product("Acme Comfort Plus Sleeper Sofa SS2000"),
        product("Acme Comfort Plus Sleeper Sofa SS3000"),
      ),
      false,
    );
  });

  it("treats retailer-specific M27Q titles as the same exact model", () => {
    assert.equal(
      areSameExactModelProduct(
        product(
          "Gigabyte M27Q Gaming Monitor (Rev. 1.0)",
          "https://www.gigabyte.com/Monitor/M27Q-rev-10",
        ),
        product(
          'Gigabyte M27Q 27" QHD FreeSync Premium IPS Gaming Monitor',
          "https://www.bestbuy.com/site/gigabyte-m27q/12345.p",
        ),
      ),
      true,
    );
  });

  it("keeps related but explicitly different model variants distinct", () => {
    assert.equal(
      areSameExactModelProduct(
        product("Gigabyte M27Q Gaming Monitor"),
        product("Gigabyte M27Q2 QD Gaming Monitor"),
      ),
      false,
    );
    assert.equal(
      areSameExactModelProduct(
        product("Gigabyte M27Q Gaming Monitor"),
        product("Gigabyte M27Q-P Gaming Monitor"),
      ),
      false,
    );
  });

  it("does not treat shared specification tokens as exact model identity", () => {
    assert.equal(
      areSameExactModelProduct(
        product("Acme AX3000 WiFi6 Router"),
        product("Acme RE7000 WiFi6 Range Extender"),
      ),
      false,
    );
  });

  it("treats the same shoe model from different retailers as one product", () => {
    assert.equal(
      areSameCanonicalProduct(
        product(
          "Nike Reactx Infinity Run 4 - Men's - Champs Sports",
          "https://www.champssports.com/product/model/nike-reactx-infinity-run-4-mens/413789.html",
        ),
        product(
          "Nike Reactx Infinity Run 4 - Men's | Foot Locker",
          "https://www.footlocker.com/product/model/nike-reactx-infinity-run-4-mens/413789.html",
        ),
      ),
      true,
    );
  });
});

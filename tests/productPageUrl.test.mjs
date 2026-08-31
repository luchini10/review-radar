import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productPageMatchesIdentity } from "../lib/productPageUrl.ts";

describe("selection product-page identity", () => {
  it("accepts a matching retailer product-detail page", () => {
    assert.equal(
      productPageMatchesIdentity({
        brand: "Acer",
        model: "XV272U",
        pageTitle: "Acer Nitro XV272U 27 inch QHD Gaming Monitor",
        pageUrl:
          "https://www.bestbuy.com/site/acer-nitro-xv272u-gaming-monitor/6570234.p",
        productName: "Acer Nitro XV272U 27 inch QHD Gaming Monitor",
      }),
      true,
    );
  });

  it("rejects category, search, and editorial pages", () => {
    for (const pageUrl of [
      "https://www.bestbuy.com/site/searchpage.jsp?st=acer+xv272u",
      "https://www.amazon.com/s?k=acer+xv272u",
      "https://example.com/reviews/best-gaming-monitors",
    ]) {
      assert.equal(
        productPageMatchesIdentity({
          brand: "Acer",
          model: "XV272U",
          pageTitle: "Acer XV272U gaming monitors",
          pageUrl,
          productName: "Acer Nitro XV272U Gaming Monitor",
        }),
        false,
        pageUrl,
      );
    }
  });

  it("rejects a sibling model even when brand and family overlap", () => {
    assert.equal(
      productPageMatchesIdentity({
        brand: "Roborock",
        model: "Q10 S5 Plus",
        pageTitle: "Roborock Q10 X5 Plus Robot Vacuum",
        pageUrl:
          "https://us.roborock.com/products/roborock-q10-x5-plus",
        productName: "Roborock Q10 S5 Plus Robot Vacuum",
      }),
      false,
    );
  });

  it("requires positive identity evidence on unknown domains", () => {
    assert.equal(
      productPageMatchesIdentity({
        brand: "Dell",
        model: "G2724D",
        pageTitle: "Generic 27 inch gaming monitor",
        pageUrl: "https://unknown.example/products/gaming-monitor-123",
        productName: "Dell G2724D Gaming Monitor",
      }),
      false,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  baseProductCategoryFromQuery,
  detectBedSize,
} from "../lib/productCategory.ts";

describe("base product category cleanup", () => {
  it("removes orientation words from furniture category text", () => {
    assert.equal(baseProductCategoryFromQuery("left-facing sectional"), "sectional");
    assert.equal(
      baseProductCategoryFromQuery("right hand facing sectional under 90 inches"),
      "sectional",
    );
  });

});

describe("detectBedSize", () => {
  it("detects bed sizes only in a sleep/furniture context", () => {
    assert.equal(detectBedSize("king size mattress"), "king");
    assert.equal(detectBedSize("queen bed frame"), "queen");
    assert.equal(detectBedSize("california king mattress"), "california king");
    assert.equal(detectBedSize("twin xl mattress"), "twin xl");
  });

  it("does NOT fire for unrelated queries (incl. non-sleep 'bed')", () => {
    assert.equal(detectBedSize("full HD monitor"), null);
    assert.equal(detectBedSize("king cab truck bed liner"), null);
    assert.equal(detectBedSize("running shoes"), null);
  });

  it("can match a product name without requiring context", () => {
    assert.equal(
      detectBedSize("Leesa Studio Twin Mattress - Article furniture", { requireContext: false }),
      "twin",
    );
    assert.equal(detectBedSize("Leesa Studio King", { requireContext: false }), "king");
  });
});

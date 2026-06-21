import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectPrimarySize,
  variantFamilyKey,
} from "../lib/productVariantFamily.ts";

function product(name, brand) {
  return {
    name,
    metadata: brand
      ? {
          brand: {
            confidence: "High",
            sourceType: "json_ld",
            sourceUrl: "https://example.com/p",
            value: brand,
            verifiedAt: "2026-01-01T00:00:00.000Z",
          },
          offers: [],
        }
      : { offers: [] },
  };
}

describe("detectPrimarySize", () => {
  it("reads a size/capacity unit, ignoring power (HP) and voltage", () => {
    assert.equal(detectPrimarySize("Vacmaster 8 Gallon 4.5 Peak HP Wet Dry Vacuum"), "8 gallon");
    assert.equal(detectPrimarySize("RIDGID 4 Gallon 5.0 Peak HP Wet Dry Vacuum"), "4 gallon");
    assert.equal(detectPrimarySize("Samsung 65 inch QLED TV"), "65 inch");
    assert.equal(detectPrimarySize('LG 75" Smart TV'), "75 inch");
    assert.equal(detectPrimarySize("LG 25 cu ft French Door Refrigerator"), "25 cuft");
  });

  it("returns null when there is no size unit", () => {
    assert.equal(detectPrimarySize("DeWalt 20V MAX Cordless Drill"), null);
    assert.equal(detectPrimarySize(""), null);
  });
});

describe("variantFamilyKey (brand + size)", () => {
  it("groups same-brand same-size variants that differ only by spec/model", () => {
    assert.equal(
      variantFamilyKey(product("Vacmaster 8 Gallon 4.5 Peak HP Wet Dry Vacuum")),
      variantFamilyKey(product("Vacmaster 8 Gallon 3.5 Peak HP Wet Dry Vacuum")),
    );
  });

  it("keeps DIFFERENT sizes in different families even when they share a spec token", () => {
    // Regression for the earlier size-blind merge: 4-gal (5.0 HP) vs 5-gal (3 HP).
    assert.notEqual(
      variantFamilyKey(product("RIDGID 4 Gallon 5.0 Peak HP Wet Dry Vacuum")),
      variantFamilyKey(product("RIDGID 5 Gallon 3 Peak HP Wet Dry Vacuum")),
    );
    assert.notEqual(
      variantFamilyKey(product("Stanley 5 Gallon 3 Peak HP Wet Dry Vacuum")),
      variantFamilyKey(product("Stanley 6 Gallon 3 Peak HP Wet Dry Vacuum")),
    );
  });

  it("uses the metadata brand when present", () => {
    assert.equal(
      variantFamilyKey(product("8 Gallon 4 HP Wet Dry Vacuum", "Vacmaster")),
      variantFamilyKey(product("8 Gallon 6 HP Wet Dry Vacuum", "Vacmaster")),
    );
  });

  it("returns null (never collapses) when brand or size is unknown", () => {
    assert.equal(variantFamilyKey(product("DeWalt Cordless Drill")), null); // no size
    assert.equal(variantFamilyKey(product("8 Gallon Wet Dry Vacuum")), null); // no brand token
  });
});

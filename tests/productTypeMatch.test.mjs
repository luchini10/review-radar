import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";

describe("classifyProductTypeMatch (shared wrong-product-type verdict)", () => {
  it("rejects a different product type (gaming chair for an office chair)", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "RESPAWN Racing Style Gaming Chair with footrest",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "wrong_type");
  });

  it("rejects an accessory/complement (chair mat for an office chair)", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Heavy Duty Chair Mat for Carpet",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "complement");
  });

  it("rejects a component substitution (cooktop for an oven, water filter for a refrigerator)", () => {
    const cooktop = classifyProductTypeMatch({
      evidenceText: "36 inch Gas Cooktop with 5 sealed burners",
      requestedCategory: "oven",
    });
    assert.equal(cooktop.canBeExactMatch, false);
    assert.equal(cooktop.status, "component_substitution");

    const filter = classifyProductTypeMatch({
      evidenceText: "Replacement Water Filter cartridge",
      requestedCategory: "refrigerator",
    });
    assert.equal(filter.canBeExactMatch, false);
    assert.equal(filter.status, "component_substitution");
  });

  it("accepts the requested product type for a listed category", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Ergonomic Mesh Office Chair with lumbar support",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, true);
    assert.equal(verdict.status, "ok");
  });

  it("does not block categories without a type rule (no false rejection)", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Stinger 12 Gallon Wet/Dry Shop Vacuum",
      requestedCategory: "shop vac",
    });

    assert.equal(verdict.canBeExactMatch, true);
    assert.equal(verdict.status, "ok");
  });
});

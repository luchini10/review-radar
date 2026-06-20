import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeIntent } from "../lib/productTypeIntent.ts";

describe("product type intent classifier", () => {
  it("keeps toaster ovens separate from full-size ovens and ranges", () => {
    const valid = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "Breville Smart Oven Air Fryer Pro countertop toaster oven",
    });
    const wallOven = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "GE 30 inch built-in electric wall oven with convection",
    });
    const range = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "Samsung freestanding gas range with conventional oven",
    });

    assert.equal(valid.status, "exact");
    assert.equal(valid.canBeExactMatch, true);
    assert.equal(wallOven.status, "irrelevant");
    assert.equal(wallOven.canBeExactMatch, false);
    assert.equal(range.status, "irrelevant");
    assert.equal(range.canBeExactMatch, false);
  });

  it("treats accessories as complements, not exact products", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "microwave",
      candidateText: "Universal microwave turntable replacement plate",
    });

    assert.equal(verdict.status, "complement");
    assert.equal(verdict.canBeExactMatch, false);
  });

  it("returns needs verification when a specific product type is not proven", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "office chair",
      candidateText: "Ergonomic seating with adjustable arms",
    });

    assert.equal(verdict.status, "needs_verification");
    assert.equal(verdict.canBeExactMatch, false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyNearMatch } from "../lib/nearMatchClassification.ts";

function productWithComparisons(requirementComparisons) {
  return {
    citations: [],
    common_complaints: [],
    confidence_score: 80,
    cons: [],
    estimated_price_range: "$229.99",
    name: "Example Near Match",
    not_for: [],
    price_value_verdict: "",
    product_image_url: "",
    product_page_url: "",
    pros: [],
    recommendation_type: "Close Match",
    source_consensus: "Mixed",
    why_recommended: "",
    requirementComparisons,
  };
}

describe("near match classification", () => {
  it("does not call an in-budget product over budget when another requirement failed", () => {
    const product = productWithComparisons([
      {
        required: "Budget: $300 or less",
        productHas: "Price: $229.99",
        status: "matched",
      },
      {
        required: "Pet Hair",
        productHas: "Pet Hair: pet hair",
        status: "failed",
      },
    ]);

    assert.equal(classifyNearMatch(product).label, "Close Match");
  });

  it("only uses over-budget labeling for failed budget or price comparisons", () => {
    const product = productWithComparisons([
      {
        required: "Budget: $300 or less",
        productHas: "Price: $349",
        status: "failed",
      },
    ]);

    assert.equal(classifyNearMatch(product).label, "Over Budget");
  });

  it("keeps unknown prices in needs verification instead of over budget", () => {
    const product = productWithComparisons([
      {
        required: "Budget: $300 or less",
        productHas: "Price: not verified",
        status: "unknown",
      },
    ]);

    assert.equal(classifyNearMatch(product).label, "Needs Verification");
  });

  it("keeps confirmed over-budget products labeled over budget even with other unknowns", () => {
    const product = productWithComparisons([
      {
        required: "Budget: $300 or less",
        productHas: "Price: $349",
        status: "failed",
      },
      {
        required: "HEPA filter",
        productHas: "HEPA filter: not verified",
        status: "unknown",
      },
    ]);

    assert.equal(classifyNearMatch(product).label, "Over Budget");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterResultByDealbreakerStrength } from "../lib/dealbreakerVisibility.ts";

function product(name, requirementComparisons = []) {
  return {
    best_for: "Test shoppers.",
    category: "Test category",
    citations: [],
    common_complaints: [],
    confidence_score: 80,
    cons: [],
    estimated_price_range: "$229.99",
    name,
    not_for: [],
    price_value_verdict: "",
    product_image_url: "",
    product_page_url: "",
    pros: [],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended: "",
    requirementComparisons,
  };
}

function result() {
  return {
    assumptions: [],
    exactMatches: [product("Exact 1"), product("Exact 2")],
    final_buying_advice: "Test advice.",
    nearMatches: [
      product("Needs verification", [
        {
          productHas: "Price: not verified",
          required: "Budget: $300 or less",
          status: "unknown",
        },
      ]),
      product("Over budget", [
        {
          productHas: "Price: $349",
          required: "Budget: $300 or less",
          status: "failed",
        },
      ]),
      product("Close match", [
        {
          productHas: "Pet hair: not included",
          required: "Pet hair",
          status: "failed",
        },
      ]),
    ],
    recommendations: [],
    search_summary: "Test.",
    what_to_avoid: [],
  };
}

describe("dealbreaker visibility", () => {
  it("strict shows exact matches only", () => {
    const visible = filterResultByDealbreakerStrength(result(), "strict");

    assert.deepEqual(
      visible.exactMatches.map((item) => item.name),
      ["Exact 1", "Exact 2"],
    );
    assert.deepEqual(visible.nearMatches, []);
    assert.equal(visible.hiddenCounts.total, 3);
  });

  it("balanced shows needs-verification near matches only when exact matches are below seven", () => {
    const visible = filterResultByDealbreakerStrength(result(), "balanced");

    assert.deepEqual(
      visible.nearMatches.map((item) => item.name),
      ["Needs verification"],
    );
    assert.equal(visible.hiddenCounts.nearMatches, 2);
    assert.equal(visible.hiddenCounts.total, 2);
  });

  it("flexible shows all close matches when exact matches are below seven", () => {
    const visible = filterResultByDealbreakerStrength(result(), "flexible");

    assert.equal(visible.exactMatches.length, 2);
    assert.equal(visible.nearMatches.length, 3);
    assert.equal(visible.hiddenCounts.total, 0);
  });

  it("hides close matches when seven exact Best Matches are already available", () => {
    const fullResult = {
      ...result(),
      exactMatches: Array.from({ length: 7 }, (_, index) =>
        product(`Exact ${index + 1}`),
      ),
    };
    const visible = filterResultByDealbreakerStrength(fullResult, "flexible");

    assert.equal(visible.exactMatches.length, 7);
    assert.equal(visible.nearMatches.length, 0);
    assert.equal(visible.hiddenCounts.total, 0);
  });
});

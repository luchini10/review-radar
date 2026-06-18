import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { validateProductAgainstRequirements } from "../lib/requirementValidation.ts";
import { recommendationScoringTestExports } from "../lib/recommendationScoring.ts";

const { scoreProduct } = recommendationScoringTestExports;

function field(value) {
  return {
    confidence: "High",
    sourceType: "json_ld",
    sourceUrl: "https://example.com/p",
    value,
    verifiedAt: "2026-06-14T00:00:00.000Z",
  };
}

function offer(price) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer: "example.com",
    url: "https://example.com/p",
  };
}

function completeProduct(requirementCheck) {
  return {
    recommendation_type: "Best Match",
    name: "Complete Blower",
    category: "leaf blower",
    product_page_url: "https://example.com/complete-blower",
    product_image_url: "https://example.com/image.jpg",
    why_recommended: "A leaf blower with confirmed specs.",
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$250",
    confidence_score: 80,
    source_consensus: "Strong",
    price_value_verdict: "Good value.",
    best_for: "Yard cleanup.",
    not_for: [],
    citations: [
      { title: "Review", url: "https://example.com/review", what_it_supports: "Specs." },
    ],
    requirementCheck,
    metadata: {
      brand: field("ExampleCo"),
      canonicalUrl: field("https://example.com/p"),
      image: field("https://example.com/image.jpg"),
      modelNumber: field("EX-100"),
      offers: [offer(250)],
      rating: field(4.5),
      reviewCount: field(400),
      title: field("Complete Blower"),
    },
  };
}

function withSpecValidation(run) {
  const previous = process.env.REVIEW_RADAR_SPEC_VALIDATION;

  process.env.REVIEW_RADAR_SPEC_VALIDATION = "on";

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.REVIEW_RADAR_SPEC_VALIDATION;
    } else {
      process.env.REVIEW_RADAR_SPEC_VALIDATION = previous;
    }
  }
}

describe("soft-spec misses populate the non-gating softUnknown bucket", () => {
  it("records a soft-spec fail in softUnknownRequirements without eliminating", () => {
    withSpecValidation(() => {
      const result = validateProductAgainstRequirements(
        completeProduct({ exactMatch: true, passed: [], failed: [], unknown: [] }),
        {
          priorities: "600 cfm",
          extractedRequirements: extractStructuredRequirements({
            query: "leaf blower",
            priorities: "600 cfm",
          }),
        },
      );

      assert.equal(result.isMatch, true);
      assert.equal(result.missingRequirements.length, 0);
      assert.equal(result.unknownRequirements.length, 0);
      assert.ok(result.softUnknownRequirements.some((label) => /CFM/.test(label)));
    });
  });
});

describe("softUnknown lowers confidence via missingDataPenalty (no flag needed to score)", () => {
  it("adds penalty per soft miss and lowers totalScore", () => {
    const input = { query: "leaf blower" };
    const clean = scoreProduct(
      completeProduct({ exactMatch: true, passed: [], failed: [], unknown: [], softUnknown: [] }),
      input,
    );
    const soft = scoreProduct(
      completeProduct({
        exactMatch: true,
        passed: [],
        failed: [],
        unknown: [],
        softUnknown: ["CFM: at least 600 CFM"],
      }),
      input,
    );

    assert.equal(soft.missingDataPenalty - clean.missingDataPenalty, 4);
    assert.equal(Math.round((clean.totalScore - soft.totalScore) * 100) / 100, 4);
  });
});

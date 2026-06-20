import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeRubricFit } from "../lib/buyingRubric.ts";
import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";

const { scoreProduct } = recommendationScoringTestExports;

function field(value) {
  return {
    confidence: "High",
    sourceType: "serper",
    sourceUrl: "https://example.com/p",
    value,
    verifiedAt: "2026-06-20T00:00:00.000Z",
  };
}

function product(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "trail running shoes",
    product_page_url: `https://example.com/products/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "https://example.com/image.jpg",
    why_recommended: "Trail shoe candidate.",
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$120",
    confidence_score: 80,
    source_consensus: "Strong",
    price_value_verdict: "Good evidence for the price.",
    best_for: "Trail runners.",
    not_for: [],
    citations: [
      {
        title: "Trail shoe review",
        url: "https://example.com/review",
        what_it_supports: "Supports traction and cushioning evidence.",
      },
    ],
    metadata: {
      brand: field("ExampleCo"),
      offers: [
        {
          availability: field("InStock"),
          price: field(120),
          priceCurrency: field("USD"),
          retailer: "example.com",
          url: "https://example.com/p",
        },
      ],
      rating: field(4.5),
      reviewCount: field(500),
      title: field(name),
    },
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: trail running shoes", "Budget: $150 or less"],
      unknown: [],
    },
    ...overrides,
  };
}

function input() {
  return {
    budget: "$150",
    discoveryStrategy: {
      avoidCandidatePatterns: [],
      buyingRubric: {
        category: "trail running shoes",
        commonTradeoffs: ["cushioning vs ground feel"],
        mustVerifyFacts: ["trail grip", "cushioning"],
        qualitySignals: ["trail grip", "cushioning", "durable outsole"],
        redFlags: ["poor grip", "sole separation"],
        reviewSignals: ["owner reviews mention stable traction"],
        searchQueries: ["trail running shoe grip cushioning reviews under $150"],
      },
      discoveryQueries: [],
      expectedProducts: [],
      searchIntent: "Find trail running shoes.",
      verificationFacts: [],
    },
    query: "trail running shoes",
  };
}

describe("universal buying rubric scoring", () => {
  it("boosts supported rubric evidence and penalizes supported red flags", () => {
    const strong = computeRubricFit(
      product("ExampleCo Trail Runner", {
        pros: ["Trail grip is strong on loose dirt.", "Cushioning is comfortable."],
        why_recommended: "Owner reviews mention stable traction and a durable outsole.",
      }),
      input(),
    );
    const risky = computeRubricFit(
      product("ExampleCo Trail Runner Risky", {
        cons: ["Some owners report poor grip and sole separation."],
      }),
      input(),
    );

    assert.ok(strong.boost > 0);
    assert.ok(strong.matchedSignals.includes("trail grip"));
    assert.ok(risky.penalty > strong.penalty);
    assert.ok(risky.redFlags.includes("poor grip"));
  });

  it("improves ranking for a better rubric-backed product without changing hard gates", () => {
    const request = input();
    const thin = product("Thin Trail Shoe", {
      why_recommended: "A trail shoe listing with little product-specific evidence.",
    });
    const strong = product("Strong Trail Shoe", {
      pros: ["Trail grip is strong.", "Cushioning is comfortable.", "Durable outsole."],
      why_recommended: "Owner reviews mention stable traction.",
    });
    const failing = product("Road Shoe With Great Grip", {
      category: "road running shoes",
      pros: ["Trail grip and cushioning are strong."],
      requirementCheck: {
        exactMatch: false,
        failed: ["Category: trail running shoes"],
        passed: ["Budget: $150 or less"],
        unknown: [],
      },
    });
    const result = scoreAndSelectRecommendations(
      {
        assumptions: [],
        exactMatches: [thin, strong],
        final_buying_advice: "Choose a displayed product.",
        nearMatches: [failing],
        recommendations: [],
        search_summary: "Showing matches.",
        what_to_avoid: [],
      },
      request,
    );

    assert.equal(result.exactMatches[0].name, "Strong Trail Shoe");
    assert.equal(result.nearMatches.some((item) => item.name === "Road Shoe With Great Grip"), false);
    assert.ok(scoreProduct(strong, request).rubricFitScore > scoreProduct(thin, request).rubricFitScore);
  });
});

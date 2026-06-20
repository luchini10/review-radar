import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectCategoryProfile } from "../lib/categoryProfiles.ts";
import { computeCategoryFit } from "../lib/categoryScoring.ts";
import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const { scoreProduct } = recommendationScoringTestExports;

function field(value) {
  return {
    confidence: "High",
    sourceType: "serper",
    sourceUrl: "https://example.com/p",
    value,
    verifiedAt: "2026-06-14T00:00:00.000Z",
  };
}

function buildBlower(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "leaf blower",
    product_page_url: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "https://example.com/image.jpg",
    why_recommended: "Cordless leaf blower with confirmed specs.",
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
    metadata: {
      brand: field("ExampleCo"),
      offers: [{ availability: field("InStock"), price: field(250), priceCurrency: field("USD"), retailer: "example.com", url: "https://example.com/p" }],
      rating: field(4.5),
      reviewCount: field(400),
      title: field(name),
    },
    ...overrides,
  };
}

function blowerInput() {
  return {
    query: "leaf blower",
    priorities: "at least 600 cfm",
    extractedRequirements: extractStructuredRequirements({
      query: "leaf blower",
      priorities: "at least 600 cfm",
    }),
  };
}

function withoutCategoryScoring(run) {
  const previous = process.env.REVIEW_RADAR_CATEGORY_SCORING;

  process.env.REVIEW_RADAR_CATEGORY_SCORING = "off";

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.REVIEW_RADAR_CATEGORY_SCORING;
    } else {
      process.env.REVIEW_RADAR_CATEGORY_SCORING = previous;
    }
  }
}

describe("selectCategoryProfile (config-driven, generic loop)", () => {
  it("maps queries to profiles by keyword and falls back to default", () => {
    assert.equal(selectCategoryProfile("cordless leaf blower").key, "leaf_blower");
    assert.equal(selectCategoryProfile("gas pressure washer").key, "pressure_washer");
    assert.equal(selectCategoryProfile("stick vacuum").key, "cordless_vacuum");
    assert.equal(selectCategoryProfile("gas grill").key, "grill");
    assert.equal(selectCategoryProfile("countertop toaster oven").key, "toaster_oven");
    assert.equal(selectCategoryProfile("65 inch TV").key, "tv");
    assert.equal(selectCategoryProfile("gaming laptop").key, "laptop");
    assert.equal(selectCategoryProfile("standing desk").key, "default");
  });
});

describe("computeCategoryFit for grills", () => {
  it("rewards a grill that exposes burners and BTU", () => {
    const product = buildBlower("Weber Genesis 4-Burner Gas Grill 48,000 BTU", {
      category: "gas grill",
    });
    const fit = computeCategoryFit(product, {
      query: "gas grill",
      extractedRequirements: extractStructuredRequirements({ query: "gas grill" }),
    });

    assert.equal(fit.profileKey, "grill");
    assert.ok(fit.boost >= 2);
  });
});

describe("computeCategoryFit (capped additive boost)", () => {
  it("rewards a present spec and a passed spec requirement", () => {
    const fit = computeCategoryFit(buildBlower("EGO 650 CFM Cordless Leaf Blower"), blowerInput());

    // cfm present (+1) and cfm requirement passed (+2) = 3.
    assert.equal(fit.profileKey, "leaf_blower");
    assert.equal(fit.boost, 3);
  });

  it("gives less to a product that fails the spec requirement", () => {
    const fit = computeCategoryFit(buildBlower("Budget 400 CFM Leaf Blower"), blowerInput());

    // cfm present (+1), requirement not passed (no +2) = 1.
    assert.equal(fit.boost, 1);
  });

  it("treats a spec-less product neutrally (no boost, no penalty)", () => {
    const fit = computeCategoryFit(buildBlower("Generic Leaf Blower"), blowerInput());

    assert.equal(fit.boost, 0);
  });

  it("gives no boost for an uncategorized query (default profile)", () => {
    const fit = computeCategoryFit(buildBlower("Some 650 CFM Thing"), {
      query: "standing desk",
      extractedRequirements: extractStructuredRequirements({ query: "standing desk" }),
    });

    assert.equal(fit.profileKey, "default");
    assert.equal(fit.boost, 0);
  });
});

describe("category boost is gated by the flag", () => {
  it("adds exactly the computed boost by default and can be disabled", () => {
    const input = blowerInput();
    const high = buildBlower("EGO 650 CFM Cordless Leaf Blower");
    const low = buildBlower("Budget 400 CFM Leaf Blower");

    const highOn = scoreProduct(high, input).totalScore;
    const lowOn = scoreProduct(low, input).totalScore;
    const { highOff, lowOff } = withoutCategoryScoring(() => ({
      highOff: scoreProduct(high, input).totalScore,
      lowOff: scoreProduct(low, input).totalScore,
    }));

    assert.equal(Math.round((highOn - highOff) * 100) / 100, 3);
    assert.equal(Math.round((lowOn - lowOff) * 100) / 100, 1);
  });

  it("always records categoryFitScore in the breakdown for debug visibility", () => {
    const breakdown = scoreProduct(buildBlower("EGO 650 CFM Cordless Leaf Blower"), blowerInput());

    assert.equal(breakdown.categoryFitScore, 3);
    assert.equal(breakdown.categoryProfileKey, "leaf_blower");
  });
});

describe("category boost reorders exact matches when enabled", () => {
  it("ranks the in-spec blower above the weaker one by default", () => {
    const input = blowerInput();
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [
          buildBlower("Budget 400 CFM Leaf Blower"),
          buildBlower("EGO 650 CFM Cordless Leaf Blower"),
        ],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      input,
    );

    assert.equal(result.exactMatches[0].name, "EGO 650 CFM Cordless Leaf Blower");
    assert.equal(result.exactMatches[0].rank, 1);
  });

  it("rewards richer toaster oven facts over a thin toaster oven listing", () => {
    const input = {
      query: "toaster oven",
      extractedRequirements: extractStructuredRequirements({ query: "toaster oven" }),
    };
    const rich = buildBlower("Ninja 1800 W 8-in-1 6-Slice Countertop Toaster Oven 450 F", {
      category: "toaster oven",
      why_recommended: "A well-documented countertop toaster oven.",
    });
    const thin = buildBlower("Generic Countertop Toaster Oven", {
      category: "toaster oven",
      why_recommended: "A toaster oven with limited specs.",
    });

    const richScore = scoreProduct(rich, input);
    const thinScore = scoreProduct(thin, input);

    assert.equal(richScore.categoryProfileKey, "toaster_oven");
    assert.ok((richScore.categoryFitScore || 0) > (thinScore.categoryFitScore || 0));
    assert.ok(richScore.totalScore > thinScore.totalScore);
  });
});

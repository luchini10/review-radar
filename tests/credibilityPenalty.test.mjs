import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";

const { credibilityFloorPenalty, scoreProduct } = recommendationScoringTestExports;

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

function base(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "gadget",
    product_page_url: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "",
    why_recommended: `${name} is a gadget.`,
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$200",
    confidence_score: 75,
    source_consensus: "Mixed",
    price_value_verdict: "",
    best_for: "",
    not_for: [],
    citations: [],
    metadata: { offers: [] },
    ...overrides,
  };
}

// Many evidence signals + mainstream review volume => strong tier / strong evidence.
function strongProduct(name = "Popular Brand Gadget") {
  return base(name, {
    product_image_url: "https://example.com/image.jpg",
    citations: [
      { title: "Product page", url: "https://example.com/p", what_it_supports: "Specs." },
      { title: "RTINGS review", url: "https://www.rtings.com/gadget", what_it_supports: "Tested performance." },
    ],
    metadata: {
      brand: field("Sony"),
      canonicalUrl: field("https://example.com/p"),
      image: field("https://example.com/image.jpg"),
      modelNumber: field("SN-100"),
      offers: [offer(200)],
      rating: field(4.6),
      reviewCount: field(1500),
      title: field(name),
    },
  });
}

// Single retailer source, no brand/rating/reviews => weak tier / weak evidence.
function weakProduct(name = "Obscure Gadget") {
  return base(name, {
    citations: [
      { title: "Listing", url: "https://example.com/obscure", what_it_supports: "A listing." },
    ],
  });
}

function withCredibilityPenalty(run) {
  const previous = process.env.REVIEW_RADAR_CREDIBILITY_PENALTY;

  process.env.REVIEW_RADAR_CREDIBILITY_PENALTY = "on";

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.REVIEW_RADAR_CREDIBILITY_PENALTY;
    } else {
      process.env.REVIEW_RADAR_CREDIBILITY_PENALTY = previous;
    }
  }
}

describe("credibilityFloorPenalty (graded, evidence-softened)", () => {
  it("penalizes weak and moderate tiers, never strong", () => {
    assert.equal(credibilityFloorPenalty("weak", weakProduct()), 18);
    assert.equal(credibilityFloorPenalty("moderate", weakProduct()), 6);
    assert.equal(credibilityFloorPenalty("strong", weakProduct()), 0);
  });

  it("halves the penalty when the product still has strong evidence", () => {
    assert.equal(credibilityFloorPenalty("weak", strongProduct()), 9);
  });
});

describe("credibility floor penalty is computed for debug but consolidated out of scoring", () => {
  // Phase 2 consolidation: weak credibility used to be charged via three stacked
  // terms (marketConfidenceAdjustment + marketConfidencePenalty + the flag-gated
  // credibilityFloorPenalty). The floor penalty is still computed for debug
  // visibility, but it is no longer subtracted from any score, so the legacy
  // REVIEW_RADAR_CREDIBILITY_PENALTY flag is now a no-op.
  it("no longer changes totalScore when the legacy flag is toggled", () => {
    const input = { query: "gadget" };
    const weak = weakProduct();
    const breakdown = scoreProduct(weak, input);
    const off = breakdown.totalScore;
    const on = withCredibilityPenalty(() => scoreProduct(weak, input).totalScore);

    assert.ok(breakdown.credibilityFloorPenalty > 0); // still computed for debug
    assert.equal(off, on); // ...but not applied, so the flag is a no-op
  });

  it("still ranks a strong product above a weak one via the always-on credibility term", () => {
    const input = { query: "gadget" };
    const margin =
      scoreProduct(strongProduct(), input).totalScore -
      scoreProduct(weakProduct(), input).totalScore;

    assert.ok(margin > 0);
  });
});

describe("credibility penalty is a push-down, not a hard block", () => {
  it("keeps the weak product in results, just ranked below the strong one", () => {
    withCredibilityPenalty(() => {
      const result = scoreAndSelectRecommendations(
        {
          search_summary: "Showing exact matches.",
          assumptions: [],
          exactMatches: [weakProduct(), strongProduct()],
          nearMatches: [],
          recommendations: [],
          what_to_avoid: [],
          final_buying_advice: "Choose among the displayed products.",
        },
        { query: "gadget" },
      );

      const names = [...result.exactMatches, ...result.nearMatches].map((p) => p.name);

      assert.ok(names.includes("Obscure Gadget"));
      assert.ok(names.includes("Popular Brand Gadget"));
      assert.equal(result.exactMatches[0].name, "Popular Brand Gadget");
    });
  });
});

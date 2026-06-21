import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCanonicalIdentity } from "../lib/productIdentity.ts";
import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

function field(value, confidence = "High") {
  return {
    confidence,
    sourceType: "json_ld",
    sourceUrl: "https://example.com/product",
    value,
    verifiedAt: "2026-05-26T00:00:00.000Z",
  };
}

function offer(price) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer: "example.com",
    url: "https://example.com/product",
  };
}

function offerWithSource(price, sourceType, confidence = "High", url = "https://example.com/product") {
  return {
    availability: field("InStock"),
    price: {
      ...field(price, confidence),
      sourceType,
      sourceUrl: url,
    },
    priceCurrency: field("USD"),
    retailer: "example.com",
    url,
  };
}

function buildProduct(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "couch",
    product_page_url: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "https://example.com/image.jpg",
    why_recommended: `${name} is a beige couch with confirmed specs.`,
    pros: ["Available in beige.", "Measures 60 inches wide."],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$600",
    confidence_score: 82,
    source_consensus: "Strong",
    price_value_verdict: "Fits the stated budget.",
    best_for: "Buyers who need an exact match.",
    not_for: [],
    citations: [
      {
        title: "Product page",
        url: "https://example.com/product",
        what_it_supports: "Supports specs and price.",
      },
    ],
    matchedRequirements: ["Category: couch", "Color: Beige"],
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: couch", "Color: Beige"],
      unknown: [],
    },
    metadata: {
      brand: field("ExampleCo"),
      canonicalUrl: field(`https://example.com/${name}`),
      colors: field(["beige"]),
      dimensions: {
        unit: "in",
        width: field(60),
      },
      modelNumber: field(name),
      offers: [offer(600)],
      rating: field(4.6),
      reviewCount: field(250),
      title: field(name),
    },
    ...overrides,
  };
}

describe("recommendation scoring and ranked Best Match selection", () => {
  it("creates score breakdowns and unique ranked Best Match results", () => {
    const input = {
      budget: "under $1000",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1000",
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      }),
      query: "couch",
      selectedFeatures: ["Color: Beige"],
    };
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [
          buildProduct("Alpha Sofa"),
          buildProduct("Bravo Sofa", {
            metadata: {
              ...buildProduct("Bravo Sofa").metadata,
              offers: [offer(450)],
            },
          }),
          buildProduct("Charlie Sofa", {
            confidence_score: 88,
            metadata: {
              ...buildProduct("Charlie Sofa").metadata,
              offers: [offer(900)],
              rating: field(4.8),
              reviewCount: field(600),
            },
          }),
          buildProduct("Delta Sofa"),
          buildProduct("Echo Sofa"),
        ],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      input,
    );

    const labels = result.exactMatches.map((product) => product.rankLabel);
    const canonicalIds = result.exactMatches.map(
      (product) => product.canonicalIdentity?.canonicalId,
    );

    assert.deepEqual(labels, [
      "#1 Best Match",
      "#2 Best Match",
      "#3 Best Match",
      "#4 Best Match",
      "#5 Best Match",
    ]);
    assert.ok(
      result.exactMatches.every(
        (product, index) =>
          product.rank === index + 1 &&
          product.recommendation_type === "Best Match" &&
          product.rankReason,
      ),
    );
    assert.equal(
      result.search_summary,
      "Showing 5 exact matches. Your requirements are restrictive, so closest alternatives are shown separately.",
    );
    assert.equal(new Set(canonicalIds).size, result.exactMatches.length);
    assert.ok(result.exactMatches.every((product) => product.scoreBreakdown));
    assert.ok(result.searchCoverage);
  });

  it("downgrades exact-looking products with conflicting price evidence", () => {
    const input = {
      budget: "under $3000",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $3000",
        query: "basketball hoop",
      }),
      query: "basketball hoop",
    };
    const conflicting = buildProduct("Conflicting Price Hoop", {
      category: "basketball hoop",
      estimated_price_range: "$35 at target.com",
      metadata: {
        ...buildProduct("Conflicting Price Hoop").metadata,
        offers: [
          offerWithSource(799, "json_ld", "High", "https://target.example.com/hoop"),
          offerWithSource(35, "snippet", "Low", "https://target.example.com/hoop"),
        ],
      },
    });
    const verified = buildProduct("Verified Price Hoop", {
      category: "basketball hoop",
      estimated_price_range: "$899",
      metadata: {
        ...buildProduct("Verified Price Hoop").metadata,
        offers: [offerWithSource(899, "json_ld", "High")],
      },
    });

    const result = scoreAndSelectRecommendations(
      {
        search_summary: "",
        assumptions: [],
        exactMatches: [conflicting, verified],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "",
      },
      input,
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Verified Price Hoop"],
    );
    assert.equal(result.nearMatches[0].name, "Conflicting Price Hoop");
    assert.equal(
      result.nearMatches[0].reliabilityCheck.priceConfidence,
      "conflicting",
    );
  });

  it("downgrades exact-looking products with implausibly tiny full-product prices", () => {
    const input = {
      budget: "under $400",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $400",
        query: "car seat stroller combo",
      }),
      query: "car seat stroller combo",
    };
    const suspicious = buildProduct("Graco Modes Nest Travel System", {
      category: "car seat stroller combo",
      estimated_price_range: "$35",
      metadata: {
        ...buildProduct("Graco Modes Nest Travel System").metadata,
        offers: [offerWithSource(35, "retailer_page", "Medium")],
      },
      price_value_verdict: "At $35, this looks like an exceptional value.",
    });
    const verified = buildProduct("Evenflo Pivot Modular Travel System", {
      category: "car seat stroller combo",
      estimated_price_range: "$329.99",
      metadata: {
        ...buildProduct("Evenflo Pivot Modular Travel System").metadata,
        offers: [offerWithSource(329.99, "json_ld", "High")],
      },
      price_value_verdict: "At $329.99, this is a plausible travel-system price.",
    });

    const result = scoreAndSelectRecommendations(
      {
        search_summary: "",
        assumptions: [],
        exactMatches: [suspicious, verified],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "",
      },
      input,
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Evenflo Pivot Modular Travel System"],
    );
    assert.equal(result.nearMatches[0].name, "Graco Modes Nest Travel System");
    assert.equal(
      result.nearMatches[0].reliabilityCheck.priceConfidence,
      "suspicious",
    );
  });

  it("downgrades exact-looking ordinary products with accessory-like tiny prices", () => {
    const input = {
      budget: "under $250",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $250",
        priorities: "Levoit only, HEPA filter",
        query: "air purifier",
      }),
      priorities: "Levoit only, HEPA filter",
      query: "air purifier",
    };
    const suspicious = buildProduct("LEVOIT Air Purifier for Home Allergies Pet Hair in Bedroom", {
      category: "air purifier",
      estimated_price_range: "$10",
      why_recommended: "A Levoit air purifier with HEPA filtration for bedroom use.",
      pros: ["HEPA filtration for bedroom air cleaning."],
      metadata: {
        ...buildProduct("LEVOIT Air Purifier for Home Allergies Pet Hair in Bedroom").metadata,
        brand: field("Levoit"),
        offers: [offerWithSource(10, "retailer_page", "Medium", "https://amazon.example.com/levoit-air-purifier")],
      },
      price_value_verdict: "At $10, this looks like an exceptional value.",
    });
    const verified = buildProduct("Levoit Core 300-P Air Purifier", {
      category: "air purifier",
      estimated_price_range: "$89.99",
      why_recommended: "A Levoit air purifier with HEPA filtration for bedroom use.",
      pros: ["HEPA filtration for bedroom air cleaning."],
      metadata: {
        ...buildProduct("Levoit Core 300-P Air Purifier").metadata,
        brand: field("Levoit"),
        offers: [offerWithSource(89.99, "json_ld", "High", "https://levoit.example.com/core-300-p")],
      },
      price_value_verdict: "A plausible full air-purifier price.",
    });

    const result = scoreAndSelectRecommendations(
      {
        search_summary: "",
        assumptions: [],
        exactMatches: [suspicious, verified],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "",
      },
      input,
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Levoit Core 300-P Air Purifier"],
    );
    assert.equal(
      result.nearMatches[0].reliabilityCheck.priceConfidence,
      "suspicious",
    );
  });

  it("keeps the visible search summary aligned with selected exact matches", () => {
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing 2 exact matches.",
        assumptions: [],
        exactMatches: [
          buildProduct("Alpha Sofa"),
          buildProduct("Bravo Sofa"),
          buildProduct("Charlie Sofa"),
          buildProduct("Delta Sofa"),
        ],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.exactMatches.length, 4);
    assert.equal(
      result.search_summary,
      "Showing 4 exact matches. Your requirements are restrictive, so closest alternatives are shown separately.",
    );
  });

  it("does not let duplicate canonical products occupy multiple ranked positions", () => {
    const first = buildProduct("Example Sofa", {
      metadata: {
        ...buildProduct("Example Sofa").metadata,
        modelNumber: field("MODEL-1"),
      },
    });
    const duplicate = buildProduct("Example Sofa Variant", {
      metadata: {
        ...buildProduct("Example Sofa Variant").metadata,
        modelNumber: field("MODEL-1"),
      },
    });
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [first, duplicate],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(getCanonicalIdentity(first).canonicalId, getCanonicalIdentity(duplicate).canonicalId);
    assert.equal(result.exactMatches.length, 1);
  });

  it("excludes over-budget products from exact Best Match results", () => {
    const input = {
      budget: "under $1000",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1000",
        query: "red refrigerator",
      }),
      query: "red refrigerator",
    };
    const premiumOnly = buildProduct("Premium Red Refrigerator", {
      category: "refrigerator",
      estimated_price_range: "Around $1,700",
      metadata: {
        ...buildProduct("Premium Red Refrigerator").metadata,
        offers: [offer(1700)],
      },
      recommendation_type: "Best Match",
    });
    const budgetOne = buildProduct("Budget Red Fridge", {
      category: "refrigerator",
      estimated_price_range: "$399",
      metadata: {
        ...buildProduct("Budget Red Fridge").metadata,
        offers: [offer(399)],
      },
    });
    const budgetTwo = buildProduct("Value Red Fridge", {
      category: "refrigerator",
      estimated_price_range: "$699",
      metadata: {
        ...buildProduct("Value Red Fridge").metadata,
        offers: [offer(699)],
      },
    });
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [premiumOnly, budgetOne, budgetTwo],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      input,
    );
    assert.equal(
      result.exactMatches.some(
        (product) => product.name === "Premium Red Refrigerator",
      ),
      false,
    );
    assert.ok(
      result.exactMatches.every((product) => {
        const offer = product.metadata?.offers?.[0]?.price?.value;

        return offer === undefined || offer === null || offer <= 1000;
      }),
    );
  });

  it("keeps above-budget products out of exact matches and leaves them as close matches", () => {
    const input = {
      budget: "under $1000",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1000",
        query: "red refrigerator",
      }),
      query: "red refrigerator",
    };
    const exactOne = buildProduct("Solid In-Budget Red Fridge", {
      category: "refrigerator",
      metadata: {
        ...buildProduct("Solid In-Budget Red Fridge").metadata,
        offers: [offer(899)],
        rating: field(4.1),
        reviewCount: field(80),
      },
    });
    const exactTwo = buildProduct("Budget Red Fridge", {
      category: "refrigerator",
      metadata: {
        ...buildProduct("Budget Red Fridge").metadata,
        offers: [offer(599)],
        rating: field(4.0),
        reviewCount: field(60),
      },
    });
    const premiumUpgrade = buildProduct("Premium Above Budget Red Fridge", {
      category: "refrigerator",
      citations: [
        ...buildProduct("Premium Above Budget Red Fridge").citations,
        {
          title: "Expert refrigerator review",
          url: "https://example.com/expert-refrigerator-review",
          what_it_supports: "Supports stronger build quality and performance.",
        },
      ],
      estimated_price_range: "$1,249",
      metadata: {
        ...buildProduct("Premium Above Budget Red Fridge").metadata,
        offers: [offer(1249)],
        rating: field(4.8),
        reviewCount: field(2400),
      },
      requirementCheck: {
        exactMatch: false,
        failed: ["Budget: $1,000 or less"],
        passed: ["Category: refrigerator"],
        unknown: [],
      },
      requirementComparisons: [
        {
          productHas: "Price: $1,249",
          required: "Budget: $1,000 or less",
          status: "failed",
        },
      ],
    });
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [exactOne, exactTwo],
        nearMatches: [premiumUpgrade],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      input,
    );

    assert.deepEqual(result.premiumAboveBudget, []);
    assert.equal(
      result.exactMatches.some(
        (product) => product.name === "Premium Above Budget Red Fridge",
      ),
      false,
    );
    assert.equal(
      result.nearMatches.some(
        (product) => product.name === "Premium Above Budget Red Fridge",
      ),
      true,
    );
  });

  it("does not create a premium-above-budget section for unrequested bundles", () => {
    const input = {
      budget: "under $1000",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1000",
        query: "air purifier",
      }),
      query: "air purifier",
    };
    const exactOne = buildProduct("Solid In-Budget Air Purifier", {
      category: "Air purifier",
      estimated_price_range: "$499",
      metadata: {
        ...buildProduct("Solid In-Budget Air Purifier").metadata,
        offers: [offer(499)],
        rating: field(4.2),
        reviewCount: field(120),
      },
      pros: ["HEPA filtration.", "Quiet bedroom mode."],
    });
    const exactTwo = buildProduct("Budget Air Purifier", {
      category: "Air purifier",
      estimated_price_range: "$249",
      metadata: {
        ...buildProduct("Budget Air Purifier").metadata,
        offers: [offer(249)],
        rating: field(4.1),
        reviewCount: field(90),
      },
      pros: ["HEPA filtration."],
    });
    const bundleUpgrade = buildProduct("Premium Air Purifier Bundle", {
      category: "Air purifier",
      citations: [
        ...buildProduct("Premium Air Purifier Bundle").citations,
        {
          title: "Expert air purifier review",
          url: "https://example.com/expert-air-purifier-review",
          what_it_supports: "Supports stronger filtration and quiet performance.",
        },
      ],
      estimated_price_range: "$1,249",
      metadata: {
        ...buildProduct("Premium Air Purifier Bundle").metadata,
        offers: [offer(1249)],
        rating: field(4.9),
        reviewCount: field(3000),
      },
      product_page_url: "https://example.com/products/premium-air-purifier-bundle",
      requirementCheck: {
        exactMatch: false,
        failed: ["Budget: $1,000 or less"],
        passed: ["Category: air purifier"],
        unknown: [],
      },
      requirementComparisons: [
        {
          productHas: "Price: $1,249",
          required: "Budget: $1,000 or less",
          status: "failed",
        },
      ],
      why_recommended:
        "A premium bundle with extra filters and stronger quality evidence.",
    });
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [exactOne, exactTwo],
        nearMatches: [bundleUpgrade],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      input,
    );

    assert.deepEqual(result.premiumAboveBudget, []);
  });

  it("keeps no-results advice generic when there are no exact matches", () => {
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "No exact matches.",
        assumptions: [],
        exactMatches: [],
        nearMatches: [
          buildProduct("Near Match Sofa", {
            disqualifiedReason: "Misses required filter: Color: Beige",
            requirementCheck: {
              exactMatch: false,
              failed: ["Color: Beige"],
              passed: ["Category: couch"],
              unknown: [],
            },
          }),
        ],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice:
          "No exact match met every requirement. Near Match Sofa is close.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Gray"],
      },
    );

    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.recommendations.length, 0);
    assert.doesNotMatch(result.final_buying_advice, /Near Match Sofa/);
  });

  it("revalidates near matches before display so stale avoid failures cannot leak", () => {
    const input = {
      budget: "under $1500",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1500",
        priorities: "under 90 inches wide, pet-friendly, and not gray",
        query: "left-facing sectional",
      }),
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "No exact matches.",
        assumptions: [],
        exactMatches: [],
        nearMatches: [
          buildProduct("KIVIK Sectional", {
            category: "sectional",
            estimated_price_range: "$999",
            name: "KIVIK sectional, 4-seat with chaise, Tibbleby beige/gray",
            why_recommended:
              "Close option, but the not gray requirement could not be verified.",
            pros: ["Sectional with chaise.", "Tibbleby beige/gray cover."],
            requirementCheck: {
              exactMatch: false,
              failed: [],
              passed: ["Category: sectional"],
              unknown: ["Pet-friendly"],
            },
          }),
          buildProduct("Left Facing Sectional", {
            category: "sectional",
            estimated_price_range: "Price not verified",
            pros: ["Left-facing sectional sofa.", "Performance fabric upholstery."],
            requirementCheck: {
              exactMatch: false,
              failed: [],
              passed: ["Category: sectional"],
              unknown: ["Budget: $1,500 or less"],
            },
          }),
        ],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice:
          "No exact match met every requirement. Review the closest alternatives below and decide which requirement you are willing to relax.",
      },
      input,
    );

    const displayedNames = [
      ...result.exactMatches,
      ...result.nearMatches,
    ].map((product) => product.name);

    assert.equal(displayedNames.includes("KIVIK sectional, 4-seat with chaise, Tibbleby beige/gray"), false);
    assert.equal(displayedNames.includes("Left Facing Sectional"), true);
  });

  it("uses metadata offers when scoring product price", () => {
    const product = buildProduct("Metadata Price Sofa", {
      estimated_price_range: "$1,500",
      metadata: {
        ...buildProduct("Metadata Price Sofa").metadata,
        offers: [offer(700)],
      },
    });

    assert.equal(
      recommendationScoringTestExports.productPrice(product),
      700,
    );
  });

  it("does not let a tiny number of perfect ratings beat stronger owner-review evidence", () => {
    const input = {
      budget: "under $1000",
      query: "couch",
    };
    const thinReviewProduct = buildProduct("Thin Review Sofa", {
      metadata: {
        ...buildProduct("Thin Review Sofa").metadata,
        rating: field(5),
        reviewCount: field(3),
      },
    });
    const strongReviewProduct = buildProduct("Strong Review Sofa", {
      metadata: {
        ...buildProduct("Strong Review Sofa").metadata,
        rating: field(4.5),
        reviewCount: field(1200),
      },
    });
    const thinScore =
      recommendationScoringTestExports.scoreProduct(thinReviewProduct, input);
    const strongScore =
      recommendationScoringTestExports.scoreProduct(strongReviewProduct, input);

    assert.ok(
      (strongScore.ownerReviewStrengthScore || 0) >
        (thinScore.ownerReviewStrengthScore || 0),
    );
    assert.ok(strongScore.totalScore > thinScore.totalScore);
  });

  it("uses Reddit owner opinion as a modest ranking signal", () => {
    const input = {
      query: "couch",
      selectedFeatures: ["Color: Beige"],
    };
    const positiveOwnerOpinion = buildProduct("Positive Owner Sofa", {
      evidenceBucket: {
        negativeEvidence: [],
        ownerOpinion: {
          concerns: [],
          praises: ["Owners repeatedly recommend it."],
          redditThreadCount: 3,
          sentiment: "positive",
          sourceCount: 3,
          sourceUrls: ["https://www.reddit.com/r/furniture/comments/positive/"],
          summary:
            "Reddit owner discussions are mostly positive in the snippets found.",
        },
        positiveEvidence: [],
        repeatedComplaints: [],
        unknowns: [],
      },
    });
    const negativeOwnerOpinion = buildProduct("Negative Owner Sofa", {
      evidenceBucket: {
        negativeEvidence: [],
        ownerOpinion: {
          concerns: ["Owners mention durability or breakage concerns."],
          praises: [],
          redditThreadCount: 3,
          sentiment: "negative",
          sourceCount: 3,
          sourceUrls: ["https://www.reddit.com/r/furniture/comments/negative/"],
          summary:
            "Reddit owner discussions surface more concerns than praise in the snippets found.",
        },
        positiveEvidence: [],
        repeatedComplaints: [],
        unknowns: [],
      },
    });
    const positiveScore = recommendationScoringTestExports.scoreProduct(
      positiveOwnerOpinion,
      input,
    );
    const negativeScore = recommendationScoringTestExports.scoreProduct(
      negativeOwnerOpinion,
      input,
    );

    assert.ok((positiveScore.ownerOpinionScore || 0) > 0);
    assert.ok((negativeScore.ownerOpinionScore || 0) < 0);
    assert.ok(positiveScore.totalScore > negativeScore.totalScore);
  });

  it("penalizes repeated product-risk complaints instead of ranking by rating alone", () => {
    const input = {
      budget: "under $1000",
      query: "refrigerator",
    };
    const cleanProduct = buildProduct("Quiet Refrigerator", {
      category: "refrigerator",
      metadata: {
        ...buildProduct("Quiet Refrigerator").metadata,
        rating: field(4.5),
        reviewCount: field(900),
      },
    });
    const riskyProduct = buildProduct("Risky Refrigerator", {
      category: "refrigerator",
      common_complaints: [
        "Noise complaints (3 sources)",
        "Ice maker failures (2 sources)",
        "Poor durability complaints (2 sources)",
      ],
      evidenceBucket: {
        negativeEvidence: [],
        positiveEvidence: [],
        repeatedComplaints: [
          {
            complaint: "Noise complaints",
            evidenceSnippets: ["Owners repeatedly mention loud compressor noise."],
            severity: "medium",
            sourceCount: 3,
          },
          {
            complaint: "Ice maker failures",
            evidenceSnippets: ["Reviewers repeatedly mention broken ice makers."],
            severity: "high",
            sourceCount: 2,
          },
        ],
        unknowns: [],
      },
      metadata: {
        ...buildProduct("Risky Refrigerator").metadata,
        rating: field(4.7),
        reviewCount: field(900),
      },
    });
    const cleanScore =
      recommendationScoringTestExports.scoreProduct(cleanProduct, input);
    const riskyScore =
      recommendationScoringTestExports.scoreProduct(riskyProduct, input);

    assert.ok((riskyScore.repeatedComplaintPenalty || 0) > 0);
    assert.ok(cleanScore.totalScore > riskyScore.totalScore);
  });

  it("adds a missing-data penalty when important buying facts are unverified", () => {
    const input = {
      budget: "under $1000",
      query: "cordless drill",
    };
    const completeProduct =
      recommendationScoringTestExports.scoreProduct(
        buildProduct("Complete Drill"),
        input,
      );
    const sparseProduct =
      recommendationScoringTestExports.scoreProduct(
        buildProduct("Sparse Drill", {
          citations: [],
          metadata: {
            offers: [],
          },
          product_image_url: "",
        }),
        input,
      );

    assert.ok((sparseProduct.missingDataPenalty || 0) > 0);
    assert.ok(completeProduct.totalScore > sparseProduct.totalScore);
  });

  it("penalizes products with missing buying-rubric facts without making them hard failures", () => {
    const input = {
      budget: "under $2500",
      query: "refrigerator",
    };
    const complete = buildProduct("Complete Stainless Refrigerator", {
      category: "refrigerator",
      confidence_score: 94,
      evidenceBucket: {
        negativeEvidence: [],
        positiveEvidence: [
          {
            claim: "Exact dimensions and installation fit",
            confidence: "Medium",
            sourceTitle: "Spec sheet",
            sourceUrl: "https://example.com/specs",
            snippet: "Dimensions and installation fit are verified.",
          },
        ],
        repeatedComplaints: [],
        unknowns: [],
      },
    });
    const missingRubricFacts = buildProduct("Thin Stainless Refrigerator", {
      category: "refrigerator",
      confidence_score: 94,
      evidenceBucket: {
        negativeEvidence: [],
        positiveEvidence: [],
        repeatedComplaints: [],
        unknowns: [
          {
            topic: "Rubric fact: Exact dimensions and installation fit",
            reason: "Important rubric fact was not clearly verified.",
          },
          {
            topic: "Rubric fact: Total capacity",
            reason: "Important rubric fact was not clearly verified.",
          },
        ],
      },
    });
    const completeScore =
      recommendationScoringTestExports.scoreProduct(complete, input);
    const thinScore =
      recommendationScoringTestExports.scoreProduct(missingRubricFacts, input);
    const result = scoreAndSelectRecommendations(
      {
        assumptions: [],
        exactMatches: [missingRubricFacts],
        final_buying_advice: "",
        nearMatches: [],
        recommendations: [missingRubricFacts],
        search_summary: "",
        what_to_avoid: [],
      },
      input,
    );

    assert.ok((thinScore.missingDataPenalty || 0) > (completeScore.missingDataPenalty || 0));
    assert.ok(completeScore.totalScore > thinScore.totalScore);
    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.exactMatches[0].confidence_score, 72);
  });

  it("penalizes missing critical rubric facts more than missing minor rubric facts", () => {
    const input = {
      budget: "under $2500",
      query: "refrigerator",
    };
    const missingMinorFact = buildProduct("Minor Missing Fact Refrigerator", {
      category: "refrigerator",
      estimated_price_range: "$1,999",
      evidenceBucket: {
        negativeEvidence: [],
        positiveEvidence: [],
        repeatedComplaints: [],
        unknowns: [
          {
            importance: "minor",
            topic: "Rubric fact: Available color options",
            reason: "Minor cosmetic fact was not clearly verified.",
          },
        ],
      },
    });
    const missingCriticalFact = buildProduct("Critical Missing Fact Refrigerator", {
      category: "refrigerator",
      estimated_price_range: "$1,999",
      evidenceBucket: {
        negativeEvidence: [],
        positiveEvidence: [],
        repeatedComplaints: [],
        unknowns: [
          {
            importance: "critical",
            topic: "Rubric fact: Current product price",
            reason: "Critical purchase fact was not clearly verified.",
          },
        ],
      },
    });
    const minorScore = recommendationScoringTestExports.scoreProduct(
      missingMinorFact,
      input,
    );
    const criticalScore = recommendationScoringTestExports.scoreProduct(
      missingCriticalFact,
      input,
    );

    assert.equal(
      (criticalScore.missingDataPenalty || 0) -
        (minorScore.missingDataPenalty || 0),
      4.25,
    );
  });

  it("does not let a broad marketplace page outrank a specialist source by default", () => {
    const input = {
      budget: "under $1000",
      query: "couch",
    };
    const marketplaceProduct = buildProduct("Marketplace Sofa", {
      product_page_url: "https://www.walmart.com/ip/marketplace-sofa/123",
      citations: [
        {
          title: "Walmart product page",
          url: "https://www.walmart.com/ip/marketplace-sofa/123",
          what_it_supports: "Supports marketplace listing metadata.",
        },
      ],
    });
    const specialistProduct = buildProduct("Specialist Sofa", {
      product_page_url: "https://www.article.com/product/specialist-sofa",
      citations: [
        {
          title: "Article product page",
          url: "https://www.article.com/product/specialist-sofa",
          what_it_supports: "Supports product specs.",
        },
        {
          title: "Expert review",
          url: "https://www.thespruce.com/specialist-sofa-review",
          what_it_supports: "Supports owner-focused review context.",
        },
      ],
    });
    const marketplaceScore =
      recommendationScoringTestExports.scoreProduct(marketplaceProduct, input);
    const specialistScore =
      recommendationScoringTestExports.scoreProduct(specialistProduct, input);

    assert.ok(specialistScore.sourceQualityScore > marketplaceScore.sourceQualityScore);
    assert.ok(specialistScore.totalScore > marketplaceScore.totalScore);
  });
});

describe("source diversity in ranked selection", () => {
  function fromHost(name, host, reviews) {
    const base = buildProduct(name);

    return buildProduct(name, {
      product_page_url: `https://${host}/p/${name.toLowerCase().replace(/\s+/g, "-")}`,
      metadata: { ...base.metadata, reviewCount: field(reviews) },
    });
  }

  it("does not let a single retailer fill every slot", () => {
    const alphas = [1, 2, 3, 4, 5, 6].map((i) =>
      fromHost(`Alpha Sofa ${i}`, "alpha-store.com", 3000 - i),
    );
    const betas = [1, 2].map((i) => fromHost(`Beta Sofa ${i}`, "beta-store.com", 120 - i));
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "Showing exact matches.",
        assumptions: [],
        exactMatches: [...alphas, ...betas],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "Choose among the displayed products.",
      },
      { query: "couch", selectedFeatures: ["Color: Beige"] },
    );
    const hosts = result.exactMatches.map(
      (product) => new URL(product.product_page_url).hostname,
    );

    assert.equal(result.exactMatches.length, 7);
    assert.ok(
      hosts.filter((host) => host === "beta-store.com").length >= 2,
      "both lower-scored second-source products should still be shown",
    );
    assert.ok(
      hosts.filter((host) => host === "alpha-store.com").length <= 5,
      "the dominant retailer should be capped, not fill every slot",
    );
  });
});

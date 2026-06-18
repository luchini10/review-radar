import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProductRecommendationCardData } from "../lib/productCardViewModel.ts";

const verifiedAt = "2026-06-14T00:00:00.000Z";

function field(value, confidence = "High", sourceType = "json_ld") {
  return {
    confidence,
    sourceType,
    sourceUrl: "https://example.com/product",
    value,
    verifiedAt,
  };
}

function offer(price, retailer = "samsung.com") {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer,
    url: `https://${retailer}/product`,
  };
}

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example Product 500",
    category: "Test category",
    product_page_url: "https://example.com/product",
    product_image_url: "https://example.com/image.jpg",
    why_recommended:
      "This is the strongest all-around option because it has useful features and broad review support.",
    pros: ["Strong performance.", "Easy setup."],
    cons: ["Can be noisy."],
    common_complaints: [],
    estimated_price_range: "$899.99",
    confidence_score: 88,
    source_consensus: "Strong",
    price_value_verdict: "Strong value for buyers who want reliable performance.",
    best_for: "Buyers who want a strong all-around option.",
    not_for: ["Buyers who need the cheapest usable option."],
    citations: [
      {
        title: "Official product page",
        url: "https://example.com/product",
        what_it_supports: "Confirms specs, price, and official product identity.",
      },
      {
        title: "Expert review",
        url: "https://reviews.example.com/example-product-500",
        what_it_supports: "Supports performance and tradeoff context.",
      },
    ],
    matchedRequirements: ["Category: Test category", "Feature: Easy setup"],
    metadata: {
      availability: field("InStock"),
      brand: field("ExampleCo"),
      canonicalUrl: field("https://example.com/product"),
      colors: field(["black", "white"]),
      dimensions: {
        height: field(10),
        unit: "in",
        width: field(20),
      },
      image: field("https://example.com/image.jpg"),
      modelNumber: field("EP500"),
      offers: [offer(899.99)],
      rating: field(4.7),
      reviewCount: field(987),
      title: field("Example Product 500"),
    },
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: Test category", "Feature: Easy setup"],
      unknown: [],
    },
    requirementComparisons: [
      {
        productHas: "Feature: Easy setup",
        required: "Feature: Easy setup",
        status: "matched",
      },
    ],
    ...overrides,
  };
}

describe("product card view model", () => {
  it("formats the header offer and rating without duplicating rating in specs or signals", () => {
    const card = buildProductRecommendationCardData(buildProduct());
    const specLabels = [
      ...card.specs.universal,
      ...card.specs.categorySpecific,
    ].map((spec) => spec.label);

    assert.equal(card.offer?.displayText, "$899.99 at samsung.com");
    assert.equal(card.rating?.text, "4.7 from 987 reviews");
    assert.equal(
      card.quickSignals.some((signal) => /rating/i.test(signal.label)),
      false,
    );
    assert.equal(specLabels.includes("Rating"), false);
  });

  it("hides optional fields cleanly when metadata is sparse", () => {
    const card = buildProductRecommendationCardData(
      buildProduct({
        metadata: {
          offers: [],
        },
        product_image_url: "",
      }),
    );
    const allSpecs = [...card.specs.universal, ...card.specs.categorySpecific];

    assert.equal(card.image.src, "");
    assert.equal(card.rating, undefined);
    assert.ok(allSpecs.every((spec) => spec.label && spec.value));
  });

  it("maps evidence to shopper-friendly High, Medium, or Low labels", () => {
    const high = buildProductRecommendationCardData(buildProduct());
    const low = buildProductRecommendationCardData(
      buildProduct({
        citations: [],
        confidence_score: 58,
        evidence_strength: "weak",
        metadata: {
          offers: [],
        },
        source_consensus: "Weak",
      }),
    );

    assert.equal(high.evidence.quality, "High");
    assert.equal(low.evidence.quality, "Low");
    assert.doesNotMatch(low.evidence.explanation, /\d+%/);
  });

  it("keeps pros and cons product-focused instead of evidence-note focused", () => {
    const card = buildProductRecommendationCardData(
      buildProduct({
        cons: ["Some review snippets mention noise."],
        pros: [
          "Review snippets mention good suction performance.",
          "Official price shown as $899.99, staying within the main budget.",
        ],
      }),
    );

    assert.deepEqual(card.pros, ["Good suction performance."]);
    assert.deepEqual(card.cons, ["Can be noisy."]);
    assert.doesNotMatch([...card.pros, ...card.cons].join("\n"), /review snippets/i);
    assert.doesNotMatch([...card.pros, ...card.cons].join("\n"), /budget/i);
  });

  it("labels weak-evidence products as fallback picks", () => {
    const card = buildProductRecommendationCardData(
      buildProduct({
        citations: [],
        confidence_score: 58,
        evidence_strength: "weak",
        metadata: {
          offers: [],
        },
        source_consensus: "Weak",
      }),
    );

    assert.equal(card.badge.label, "Fallback Pick");
    assert.match(card.badge.description, /limited review history/i);
  });

  it("groups citation types for easier scanning", () => {
    const card = buildProductRecommendationCardData(buildProduct());

    assert.deepEqual(
      card.citations.map((citation) => citation.label),
      ["Official product page", "Expert review"],
    );
  });

  it("surfaces Reddit owner opinion as shopper-facing card data", () => {
    const card = buildProductRecommendationCardData(
      buildProduct({
        evidenceBucket: {
          negativeEvidence: [],
          ownerOpinion: {
            concerns: ["Owners mention durability or breakage concerns."],
            praises: ["Owners repeatedly recommend it."],
            redditThreadCount: 3,
            sentiment: "mixed",
            sourceCount: 3,
            sourceUrls: [
              "https://www.reddit.com/r/example/comments/product/",
            ],
            summary:
              "Reddit owner discussions are mixed, with both praise and concerns.",
          },
          positiveEvidence: [],
          repeatedComplaints: [],
          unknowns: [],
        },
      }),
    );

    assert.equal(card.ownerOpinion?.label, "Mixed");
    assert.equal(card.ownerOpinion?.tone, "warning");
    assert.ok(
      card.quickSignals.some((signal) => signal.label === "Owner opinion"),
    );
    assert.deepEqual(card.ownerOpinion?.praises, [
      "Owners repeatedly recommend it.",
    ]);
  });
});

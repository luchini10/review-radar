import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreAndSelectRecommendations } from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

// Baseline ranking tripwire. These snapshots lock the CURRENT output of
// scoreAndSelectRecommendations so that shadow-mode spec extraction (and later
// phases) must either keep them byte-identical or produce a reviewed diff.

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

function buildProduct(name, overrides = {}) {
  const base = {
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
    price_value_verdict: "Solid value for the build quality.",
    best_for: "Buyers who need an exact match.",
    not_for: [],
    citations: [
      {
        citation_type: "product-page-self",
        title: `${name} product page`,
        url: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
        what_it_supports: "Supports specs and price.",
      },
    ],
    metadata: {
      brand: field("ExampleCo"),
      canonicalUrl: field(`https://example.com/${name}`),
      colors: field(["beige"]),
      dimensions: { unit: "in", width: field(60) },
      modelNumber: field(name),
      offers: [offer(600)],
      rating: field(4.6),
      reviewCount: field(250),
      title: field(name),
    },
  };

  return {
    ...base,
    ...overrides,
    metadata: { ...base.metadata, ...(overrides.metadata || {}) },
  };
}

function snapshot(result) {
  return {
    exact: result.exactMatches.map((product) => ({
      name: product.name,
      rank: product.rank,
      total: Math.round((product.scoreBreakdown?.totalScore ?? 0) * 100) / 100,
      match: Math.round((product.matchScore ?? 0) * 100) / 100,
    })),
    near: result.nearMatches.map((product) => product.name),
  };
}

// Scenario A: constrained category (couch, beige + under $1000), products with
// distinct credibility so ordering is stable.
function scenarioA() {
  const input = {
    budget: "under $1000",
    query: "couch",
    selectedFeatures: ["Color: Beige"],
    extractedRequirements: extractStructuredRequirements({
      budget: "under $1000",
      query: "couch",
      selectedFeatures: ["Color: Beige"],
    }),
  };

  return scoreAndSelectRecommendations(
    {
      search_summary: "Showing exact matches.",
      assumptions: [],
      exactMatches: [
        buildProduct("Aspen Sofa"),
        buildProduct("Brook Sofa", {
          metadata: { offers: [offer(450)], rating: field(4.4), reviewCount: field(120) },
        }),
        buildProduct("Cedar Sofa", {
          confidence_score: 88,
          metadata: { offers: [offer(900)], rating: field(4.8), reviewCount: field(1500) },
        }),
        buildProduct("Dune Sofa", {
          metadata: { offers: [offer(700)], rating: field(4.1), reviewCount: field(30) },
        }),
      ],
      nearMatches: [],
      recommendations: [],
      what_to_avoid: [],
      final_buying_advice: "Choose among the displayed products.",
    },
    input,
  );
}

// Scenario B: no hard requirements (open query), ordering driven by credibility.
function scenarioB() {
  const input = { query: "headphones" };
  const make = (name, price, rating, reviews, host) =>
    buildProduct(name, {
      category: "headphones",
      estimated_price_range: `$${price}`,
      product_page_url: `https://shop.example.com/products/${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`,
      pros: ["Comfortable fit.", "Clear sound."],
      why_recommended: `${name} is a well-reviewed pair of headphones.`,
      citations: [
        {
          citation_type:
            /rtings|cnet/i.test(host)
              ? "independent-editorial"
              : "weak-uncorroborated",
          title: `${name} performance review`,
          url: host,
          what_it_supports: "Supports performance.",
        },
      ],
      metadata: {
        offers: [offer(price)],
        rating: field(rating),
        reviewCount: field(reviews),
        colors: field([]),
      },
    });

  return scoreAndSelectRecommendations(
    {
      search_summary: "Showing exact matches.",
      assumptions: [],
      exactMatches: [
        make("Wave One", 200, 4.5, 3200, "https://www.rtings.com/wave-one"),
        make("Echo Two", 150, 4.2, 40, "https://www.example-audio.com/echo-two"),
        make("Pulse Three", 300, 4.7, 900, "https://www.cnet.com/pulse-three"),
      ],
      nearMatches: [],
      recommendations: [],
      what_to_avoid: [],
      final_buying_advice: "Choose among the displayed products.",
    },
    input,
  );
}

if (process.env.DUMP_SNAPSHOT) {
  console.log("SCENARIO_A", JSON.stringify(snapshot(scenarioA())));
  console.log("SCENARIO_B", JSON.stringify(snapshot(scenarioB())));
}

describe("ranking baseline snapshot", () => {
  it("scenario A: constrained couch ordering is stable", () => {
    const actual = snapshot(scenarioA());

    assert.deepEqual(actual, {
      exact: [
        { name: "Cedar Sofa", rank: 1, total: 159.19, match: 286.56 },
        { name: "Aspen Sofa", rank: 2, total: 150.98, match: 279.26 },
        { name: "Brook Sofa", rank: 3, total: 123.41, match: 243.1 },
        { name: "Dune Sofa", rank: 4, total: 106.39, match: 222.33 },
      ],
      near: [],
    });
  });

  it("scenario B: open headphones query orders by credibility", () => {
    const actual = snapshot(scenarioB());

    assert.deepEqual(actual, {
      exact: [
        { name: "Wave One", rank: 1, total: 173.99, match: 281.89 },
        { name: "Pulse Three", rank: 2, total: 163.68, match: 272.45 },
        { name: "Echo Two", rank: 3, total: 130.67, match: 232.19 },
      ],
      near: [],
    });
  });
});

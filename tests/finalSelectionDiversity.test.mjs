import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  scoreAndSelectRecommendations,
  scoreAndSelectRecommendationsWithTrace,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

function field(value) {
  return {
    confidence: "High",
    sourceType: "retailer_page",
    sourceUrl: "https://example.com/source",
    value,
    verifiedAt: "2026-06-29T00:00:00.000Z",
  };
}

function offer(price, url) {
  return {
    availability: field("InStock"),
    price: {
      ...field(price),
      sourceUrl: url,
    },
    priceCurrency: field("USD"),
    retailer: new URL(url).hostname,
    url,
  };
}

function product(name, options = {}) {
  const {
    brand = name.split(/\s+/)[0],
    category = "gaming monitor",
    model,
    price = 299,
    rating = 4.5,
    reviews = 500,
    url = `https://example.com/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    pros = ["Strong general-purpose performance."],
  } = options;

  return {
    recommendation_type: "Best Match",
    name,
    category,
    product_page_url: url,
    product_image_url: `${new URL(url).origin}/images/product.jpg`,
    why_recommended: `${name} is a well-supported ${category}.`,
    pros,
    cons: [],
    common_complaints: [],
    estimated_price_range: `$${price}`,
    confidence_score: 84,
    source_consensus: "Strong",
    price_value_verdict: "Competitive for the category.",
    best_for: "General buyers.",
    not_for: [],
    citations: [
      {
        title: `${name} product page`,
        url,
        what_it_supports: "Product identity, specifications, and price.",
        citation_type: "retailer-marketplace",
      },
    ],
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: [`Category: ${category}`],
      unknown: [],
    },
    metadata: {
      brand: field(brand),
      canonicalUrl: field(url),
      offers: [offer(price, url)],
      rating: field(rating),
      reviewCount: field(reviews),
      title: field(name),
      ...(model ? { modelNumber: field(model) } : {}),
    },
  };
}

function input(query) {
  const request = { query };

  return {
    ...request,
    extractedRequirements: extractStructuredRequirements(request),
  };
}

function result(products) {
  return {
    search_summary: "Showing exact matches.",
    assumptions: [],
    exactMatches: products,
    nearMatches: [],
    recommendations: [],
    what_to_avoid: [],
    final_buying_advice: "Choose among the displayed products.",
  };
}

describe("Phase 5H final-selection diversity", () => {
  it("collapses cross-retailer representations of the exact same model", () => {
    const products = [
      product("Gigabyte M27Q Gaming Monitor (Rev. 1.0)", {
        brand: "Gigabyte",
        url: "https://www.gigabyte.com/Monitor/M27Q-rev-10",
      }),
      product('Gigabyte M27Q 27" QHD FreeSync Premium IPS Gaming Monitor', {
        brand: "Gigabyte",
        url: "https://www.bestbuy.com/site/gigabyte-m27q-gaming-monitor/12345.p",
      }),
      product("ViewSonic XG271QG Elite Gaming Monitor", {
        brand: "ViewSonic",
        model: "XG271QG",
      }),
      product("LG 27G810A UltraGear Gaming Monitor", {
        brand: "LG",
        model: "27G810A",
      }),
      product("Dell G2724D Gaming Monitor", {
        brand: "Dell",
        model: "G2724D",
      }),
      product("ASUS ROG XG27ACS Gaming Monitor", {
        brand: "ASUS",
        model: "XG27ACS",
      }),
      product("Samsung Odyssey G6 Gaming Monitor", {
        brand: "Samsung",
        model: "G60SD",
      }),
      product("AOC Q27G3XMN Gaming Monitor", {
        brand: "AOC",
        model: "Q27G3XMN",
      }),
    ];
    const scored = scoreAndSelectRecommendationsWithTrace(
      result(products),
      input("gaming monitor"),
    );

    assert.equal(
      scored.result.exactMatches.filter((candidate) => /\bm27q\b/i.test(candidate.name)).length,
      1,
    );
    assert.equal(scored.result.exactMatches.length, 7);
    assert.ok(
      scored.finalSelectionTrace.some(
        (candidate) =>
          /\bm27q\b/i.test(candidate.name) &&
          candidate.decisionReason === "duplicate_identity_collapsed" &&
          candidate.collapsedBy,
      ),
    );
  });

  it("uses a soft model-family guard so a third near-variant does not crowd out a distinct choice", () => {
    const products = [
      product("Philips Sonicare 4100 Electric Toothbrush", {
        brand: "Philips",
        category: "electric toothbrush",
        model: "HX3681/24",
        rating: 4.8,
        reviews: 5000,
      }),
      product("Philips Sonicare 4300 Electric Toothbrush", {
        brand: "Philips",
        category: "electric toothbrush",
        model: "HX6807/51",
        rating: 4.7,
        reviews: 4200,
      }),
      product("Philips Sonicare 5300 Electric Toothbrush", {
        brand: "Philips",
        category: "electric toothbrush",
        model: "HX7101/01",
        rating: 4.7,
        reviews: 3600,
      }),
      product("Oral-B iO Series 5 Electric Toothbrush", {
        brand: "Oral-B",
        category: "electric toothbrush",
        model: "IO5",
        reviews: 1200,
      }),
      product("Aquasonic Black Series Electric Toothbrush", {
        brand: "Aquasonic",
        category: "electric toothbrush",
        model: "SCTB",
        reviews: 900,
      }),
      product("Burst Pro Sonic Electric Toothbrush", {
        brand: "Burst",
        category: "electric toothbrush",
        model: "PRO",
        reviews: 700,
      }),
      product("Quip Ultra Electric Toothbrush", {
        brand: "Quip",
        category: "electric toothbrush",
        model: "ULTRA",
        reviews: 600,
      }),
      product("SURI 2.0 Sustainable Electric Toothbrush", {
        brand: "SURI",
        category: "electric toothbrush",
        model: "SURI2",
        rating: 4.4,
        reviews: 450,
      }),
    ];
    const scored = scoreAndSelectRecommendationsWithTrace(
      result(products),
      input("electric toothbrush"),
    );

    assert.ok(scored.result.exactMatches.some((candidate) => candidate.name.startsWith("SURI")));
    assert.ok(
      scored.result.exactMatches.filter((candidate) => /sonicare/i.test(candidate.name)).length <= 2,
    );
    assert.ok(
      scored.finalSelectionTrace.some(
        (candidate) =>
          /sonicare/i.test(candidate.name) &&
          !candidate.selected &&
          candidate.decisionReason === "family_concentration_adjusted" &&
          candidate.familyConcentrationPenalty > 0,
      ),
    );
  });

  it("demotes a niche form factor for broad intent but keeps it eligible when explicitly requested", () => {
    const niche = product("Sunny Under Desk Walking Pad Treadmill", {
      brand: "Sunny",
      category: "treadmill",
      model: "SF-T7945",
      rating: 4.8,
      reviews: 4500,
      pros: ["Compact under-desk walking pad for office use."],
    });
    const mainstream = product("Horizon 7.0 AT Full-Size Treadmill", {
      brand: "Horizon",
      category: "treadmill",
      model: "7.0AT",
      rating: 4.6,
      reviews: 1800,
      pros: ["Full-size running deck for general home workouts."],
    });

    const broad = scoreAndSelectRecommendationsWithTrace(
      result([niche, mainstream]),
      input("treadmill"),
    );
    const explicit = scoreAndSelectRecommendationsWithTrace(
      result([niche, mainstream]),
      input("under desk treadmill"),
    );
    const broadNicheTrace = broad.finalSelectionTrace.find(
      (candidate) => candidate.name === niche.name,
    );
    const explicitNicheTrace = explicit.finalSelectionTrace.find(
      (candidate) => candidate.name === niche.name,
    );

    assert.equal(broad.result.exactMatches[0]?.name, mainstream.name);
    assert.equal(explicit.result.exactMatches[0]?.name, niche.name);
    assert.ok((broadNicheTrace?.formFactorPenalty || 0) > 0);
    assert.ok(
      broadNicheTrace?.offFormFactorModifiers.includes("walking-pad"),
    );
    assert.equal(explicitNicheTrace?.formFactorPenalty, 0);
  });

  it("allows distinct products from the same retailer and same brand when they are different families", () => {
    const products = [
      product("Ninja DualBrew Coffee Maker", {
        brand: "Ninja",
        category: "coffee maker",
        model: "CFP101",
        url: "https://www.target.com/p/ninja-dualbrew/-/A-1001",
      }),
      product("Ninja Espresso Pro Machine", {
        brand: "Ninja",
        category: "coffee maker",
        model: "ES601",
        url: "https://www.target.com/p/ninja-espresso-pro/-/A-1002",
      }),
    ];
    const scored = scoreAndSelectRecommendations(result(products), input("coffee maker"));

    assert.deepEqual(
      scored.exactMatches.map((candidate) => candidate.name),
      products.map((candidate) => candidate.name),
    );
  });

  it("keeps Phase 5G citation-strength scoring intact while tracing selection adjustments", () => {
    const independent = product("Editorially Supported Coffee Maker", {
      brand: "Acme",
      category: "coffee maker",
      model: "CM100",
    });
    independent.citations.push({
      title: `${independent.name} independent tested review`,
      url: "https://reviews.example/reviews/cm100",
      what_it_supports: `Independent testing of ${independent.name}.`,
      citation_type: "independent-editorial",
    });
    const retailerOnly = product("Retailer Only Coffee Maker", {
      brand: "Beta",
      category: "coffee maker",
      model: "CM200",
    });

    const traced = scoreAndSelectRecommendationsWithTrace(
      result([independent, retailerOnly]),
      input("coffee maker"),
    );
    const independentTrace = traced.finalSelectionTrace.find(
      (candidate) => candidate.name === independent.name,
    );

    assert.equal(independentTrace?.citationStrengthScore, 7);
    assert.equal(independentTrace?.selected, true);
  });
});

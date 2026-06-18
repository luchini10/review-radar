import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";
import { buildProductRecommendationCardData } from "../lib/productCardViewModel.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import {
  cheapPreFilterRawCandidates,
  searchSerperForProducts,
  serperTestExports,
} from "../lib/search/serper.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";

function field(value) {
  return {
    confidence: "High",
    sourceType: "retailer_page",
    sourceUrl: "https://example.com/source",
    value,
    verifiedAt: "2026-06-12T00:00:00.000Z",
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

function offerFrom(price, retailer, url) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer,
    url,
  };
}

function buildProduct(name, options = {}) {
  const {
    price = 100,
    rating = 4.5,
    reviews = 500,
    expert = false,
    rich = true,
    complaints = [],
    confidence = 82,
    overrides = {},
  } = options;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const citations = [
    {
      title: `${name} product page`,
      url: `https://retailerone.example/p/${slug}`,
      what_it_supports: "Specs and price.",
    },
  ];

  if (rich) {
    citations.push({
      title: expert
        ? `Wirecutter best cordless vacuum review: ${name}`
        : `${name} second retailer listing`,
      url: `https://retailertwo.example/p/${slug}`,
      what_it_supports: expert
        ? "Expert hands-on review and tested comparison."
        : "Second source for price and specs.",
    });
  }

  return {
    recommendation_type: "Close Match",
    name,
    category: "cordless vacuum",
    product_page_url: `https://retailerone.example/p/${slug}`,
    product_image_url: rich ? `https://retailerone.example/img/${slug}.jpg` : "",
    why_recommended: `${name} is a cordless vacuum candidate.`,
    pros: ["Cordless operation.", "Strong suction reported.", "Lightweight design."],
    cons: [],
    common_complaints: complaints,
    estimated_price_range: `$${price}`,
    confidence_score: confidence,
    source_consensus: rich ? "Mixed" : "Weak",
    price_value_verdict: "Reasonable for the class.",
    best_for: "Apartment cleaning.",
    not_for: [],
    citations,
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: cordless vacuum"],
      unknown: [],
    },
    metadata: rich
      ? {
          brand: field("ExampleCo"),
          modelNumber: field(name.replace(/\s+/g, "").toUpperCase()),
          offers: [offer(price)],
          rating: rating === null ? undefined : field(rating),
          reviewCount: reviews === null ? undefined : field(reviews),
          title: field(name),
        }
      : { offers: price === null ? [] : [offer(price)] },
    ...overrides,
  };
}

function vacuumInput(budget = "under $300") {
  const request = { query: "cordless vacuum", budget };

  return {
    ...request,
    extractedRequirements: extractStructuredRequirements(request),
  };
}

function buildResult(products) {
  return {
    search_summary: "Test result.",
    assumptions: [],
    exactMatches: products,
    nearMatches: [],
    recommendations: [],
    what_to_avoid: [],
    final_buying_advice: "Choose among the displayed products.",
  };
}

function rankLabels(result) {
  return result.exactMatches.map((product) => product.rankLabel);
}

describe("ranked Best Match rules", () => {
  it("ranks stronger exact matches above complaint-heavy cheap products", () => {
    const junkCheap = buildProduct("Junk Cheap Cordless Vacuum", {
      price: 35,
      rating: 3.9,
      reviews: 80,
      complaints: [
        "Stopped working after a month",
        "Very noisy on carpet",
        "Weak battery life complaints",
        "Brush motor problems",
      ],
    });
    const solidBudget = buildProduct("Solid Budget Cordless Vacuum", {
      price: 59,
      rating: 4.5,
      reviews: 900,
    });
    const midPick = buildProduct("Mid Cordless Vacuum", {
      price: 129,
      rating: 4.6,
      reviews: 1500,
      expert: true,
    });
    const premiumStrong = buildProduct("Premium Strong Cordless Vacuum", {
      price: 249,
      rating: 4.7,
      reviews: 2200,
      expert: true,
    });
    const result = scoreAndSelectRecommendations(
      buildResult([junkCheap, solidBudget, midPick, premiumStrong]),
      vacuumInput(),
    );
    const topPick = result.exactMatches[0];

    assert.ok(topPick, "expected a top ranked pick");
    assert.notEqual(topPick.name, "Junk Cheap Cordless Vacuum");
    assert.deepEqual(rankLabels(result), [
      "#1 Best Match",
      "#2 Best Match",
      "#3 Best Match",
      "#4 Best Match",
    ]);
  });

  it("keeps weak evidence conservative even when the product is an exact match", () => {
    const solidBudget = buildProduct("Solid Budget Cordless Vacuum", {
      price: 59,
      rating: 4.5,
      reviews: 900,
    });
    const midPick = buildProduct("Mid Cordless Vacuum", {
      price: 129,
      rating: 4.6,
      reviews: 1500,
      expert: true,
    });
    const weakExpensive = buildProduct("Weak Expensive Cordless Vacuum", {
      price: 279,
      rich: false,
      rating: null,
      reviews: null,
      confidence: 88,
    });
    const result = scoreAndSelectRecommendations(
      buildResult([solidBudget, midPick, weakExpensive]),
      vacuumInput(),
    );
    const weakSelected = result.exactMatches.find(
      (product) => product.name === "Weak Expensive Cordless Vacuum",
    );

    assert.ok(weakSelected);
    assert.equal(weakSelected.recommendation_type, "Best Match");
    assert.ok(
      weakSelected.confidence_score <= 68,
      `weak evidence confidence should be capped, got ${weakSelected.confidence_score}`,
    );
    assert.equal(weakSelected.evidence_strength, "weak");
    assert.ok((weakSelected.rank || 0) > 1);
  });

  it("does not label expensive products as budget picks because all exact matches use rank labels", () => {
    const lowerPriceQuality = buildProduct("Lower Price Quality Cordless Vacuum", {
      price: 890,
      rating: 4.5,
      reviews: 900,
      expert: true,
    });
    const lowerPriceBackup = buildProduct("Lower Price Backup Cordless Vacuum", {
      price: 999,
      rating: 4.4,
      reviews: 650,
      expert: true,
    });
    const premiumQuality = buildProduct("Premium Quality Cordless Vacuum", {
      price: 1999,
      rating: 4.8,
      reviews: 2400,
      expert: true,
      overrides: {
        source_consensus: "Strong",
      },
    });
    const result = scoreAndSelectRecommendations(
      buildResult([lowerPriceQuality, lowerPriceBackup, premiumQuality]),
      vacuumInput("under $3000"),
    );

    assert.ok(result.exactMatches.length > 0);
    assert.ok(result.exactMatches.every((product) => product.rankLabel?.includes("Best Match")));
    assert.doesNotMatch(
      result.exactMatches.map((product) => product.rankLabel).join("\n"),
      /Budget|Premium|Value|Alternative|Overall|Honorable/i,
    );
  });

  it("uses the strongest all-around quality and evidence candidate for #1 Best Match", () => {
    const cheapButLimited = buildProduct("Cheap Limited Cordless Vacuum", {
      price: 79,
      rating: 4.2,
      reviews: 120,
      rich: false,
    });
    const fairMiddle = buildProduct("Fair Middle Cordless Vacuum", {
      price: 129,
      rating: 4.4,
      reviews: 500,
    });
    const strongerAllAround = buildProduct("Stronger All Around Cordless Vacuum", {
      price: 229,
      rating: 4.8,
      reviews: 3200,
      expert: true,
      overrides: {
        source_consensus: "Strong",
      },
    });
    const result = scoreAndSelectRecommendations(
      buildResult([cheapButLimited, fairMiddle, strongerAllAround]),
      vacuumInput("under $300"),
    );
    const topPick = result.exactMatches[0];

    assert.ok(topPick, "expected a #1 Best Match");
    assert.equal(topPick.name, "Stronger All Around Cordless Vacuum");
    assert.equal(topPick.rankLabel, "#1 Best Match");
  });

  it("prioritizes mainstream popularity for broad brand-only searches", () => {
    const obscureNike = buildProduct("Nike Unknown Outlet Basketball Shoe", {
      price: 69,
      rating: 4.9,
      reviews: 3,
      rich: false,
      overrides: {
        category: "basketball shoes",
        pros: ["Nike basketball shoe under budget."],
        why_recommended: "Nike basketball shoe under budget.",
        metadata: {
          brand: field("Nike"),
          offers: [offer(69)],
          rating: field(4.9),
          reviewCount: field(3),
          title: field("Nike Unknown Outlet Basketball Shoe"),
        },
      },
    });
    const mainstreamNike = buildProduct("Nike G.T. Cut Academy Basketball Shoes", {
      price: 95,
      rating: 4.7,
      reviews: 2400,
      expert: true,
      overrides: {
        category: "basketball shoes",
        pros: [
          "Nike basketball shoe under budget.",
          "Mainstream model with broad review coverage.",
        ],
        source_consensus: "Strong",
        why_recommended:
          "Nike G.T. Cut Academy is a mainstream basketball shoe with broad review coverage.",
        metadata: {
          brand: field("Nike"),
          offers: [offer(95)],
          rating: field(4.7),
          reviewCount: field(2400),
          title: field("Nike G.T. Cut Academy Basketball Shoes"),
        },
      },
    });
    const request = {
      budget: "$300",
      priorities: "Must be Nike only",
      query: "basketball shoes",
    };
    const result = scoreAndSelectRecommendations(
      buildResult([obscureNike, mainstreamNike]),
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );
    const topPick = result.exactMatches[0];

    assert.ok(topPick, "expected a #1 Best Match");
    assert.equal(
      topPick.name,
      "Nike G.T. Cut Academy Basketball Shoes",
    );
    assert.ok((topPick.scoreBreakdown?.popularityScore || 0) > 0);
  });

  it("ranks credible high-review products above obscure low-review products that also match", () => {
    const obscureMatch = buildProduct("MysteryMax Cordless Vacuum", {
      price: 89,
      rating: 4.9,
      reviews: 4,
      rich: false,
      confidence: 90,
      overrides: {
        citations: [
          {
            title: "MysteryMax product listing",
            url: "https://tinyshop.example/mysterymax-vacuum",
            what_it_supports: "Single retailer listing.",
          },
        ],
        product_page_url: "https://tinyshop.example/mysterymax-vacuum",
      },
    });
    const credibleMatch = buildProduct("Dyson V15 Detect Cordless Vacuum", {
      price: 549,
      rating: 4.6,
      reviews: 3800,
      expert: true,
      overrides: {
        citations: [
          {
            title: "Dyson official product page",
            url: "https://www.dyson.com/vacuum-cleaners/cordless/v15",
            what_it_supports: "Official product identity and specs.",
          },
          {
            title: "Best Buy Dyson V15 customer reviews",
            url: "https://www.bestbuy.com/site/dyson-v15-detect",
            what_it_supports: "Retailer listing and customer review volume.",
          },
          {
            title: "Wirecutter cordless vacuum review",
            url: "https://www.nytimes.com/wirecutter/reviews/best-cordless-stick-vacuum/",
            what_it_supports: "Independent review coverage.",
          },
        ],
        metadata: {
          ...buildProduct("Dyson V15 Detect Cordless Vacuum").metadata,
          brand: field("Dyson"),
          offers: [
            offerFrom(
              549,
              "Best Buy",
              "https://www.bestbuy.com/site/dyson-v15-detect",
            ),
          ],
          rating: field(4.6),
          reviewCount: field(3800),
          title: field("Dyson V15 Detect Cordless Vacuum"),
        },
        product_page_url: "https://www.dyson.com/vacuum-cleaners/cordless/v15",
        source_consensus: "Strong",
      },
    });
    const result = scoreAndSelectRecommendations(
      buildResult([obscureMatch, credibleMatch]),
      vacuumInput("under $700"),
    );
    const topPick = result.exactMatches[0];
    const obscureSelected = result.exactMatches.find(
      (product) => product.name === "MysteryMax Cordless Vacuum",
    );

    assert.equal(topPick?.name, "Dyson V15 Detect Cordless Vacuum");
    assert.ok(topPick);
    assert.ok(obscureSelected);
    assert.equal(
      recommendationScoringTestExports.marketConfidenceTier(topPick),
      "strong",
    );
    assert.equal(
      recommendationScoringTestExports.marketConfidenceTier(obscureSelected),
      "weak",
    );
  });

  it("does not keep a credible product as an exact match when it violates a hard budget", () => {
    const credibleOverBudget = buildProduct("Dyson V15 Detect Cordless Vacuum", {
      price: 549,
      rating: 4.6,
      reviews: 3800,
      expert: true,
      overrides: {
        metadata: {
          ...buildProduct("Dyson V15 Detect Cordless Vacuum").metadata,
          brand: field("Dyson"),
          offers: [offer(549)],
          rating: field(4.6),
          reviewCount: field(3800),
        },
        source_consensus: "Strong",
      },
    });
    const weakInBudget = buildProduct("Budget Cordless Vacuum", {
      price: 89,
      rich: false,
      rating: null,
      reviews: null,
    });
    const result = scoreAndSelectRecommendations(
      buildResult([credibleOverBudget, weakInBudget]),
      vacuumInput("under $100"),
    );

    assert.equal(
      result.exactMatches.some(
        (product) => product.name === "Dyson V15 Detect Cordless Vacuum",
      ),
      false,
    );
    assert.ok(
      result.nearMatches.some(
        (product) => product.name === "Dyson V15 Detect Cordless Vacuum",
      ),
      "popular products that violate hard budget rules must be separated",
    );
  });

  it("uses weak-credibility products only as visible fallback picks when stronger matches are unavailable", () => {
    const weakOnly = buildProduct("TinyBrand Cordless Vacuum", {
      price: 79,
      rich: false,
      rating: null,
      reviews: null,
      confidence: 91,
      overrides: {
        citations: [
          {
            title: "TinyBrand product listing",
            url: "https://smallshop.example/tinybrand-vacuum",
            what_it_supports: "Single product listing.",
          },
        ],
        product_page_url: "https://smallshop.example/tinybrand-vacuum",
      },
    });
    const result = scoreAndSelectRecommendations(
      buildResult([weakOnly]),
      vacuumInput("under $100"),
    );
    const selected = result.exactMatches[0];
    const card = buildProductRecommendationCardData(selected);

    assert.equal(
      recommendationScoringTestExports.marketConfidenceTier(selected),
      "weak",
    );
    assert.equal(card.badge.label, "#1 Best Match");
    assert.match(card.badge.description, /hard requirements/i);
    assert.ok(selected.confidence_score <= 62);
  });

  it("fills the top ranked positions from strong and moderate credibility before weak products", () => {
    const strongProducts = [1, 2, 3].map((index) =>
      buildProduct(`Strong Credible Vacuum ${index}`, {
        price: 150 + index,
        rating: 4.6,
        reviews: 1200 + index * 100,
        expert: true,
        overrides: {
          citations: [
            {
              title: `Official product page ${index}`,
              url: `https://www.dyson.com/vacuum-cleaners/credible-${index}`,
              what_it_supports: "Official product identity.",
            },
            {
              title: `Best Buy reviews ${index}`,
              url: `https://www.bestbuy.com/site/credible-vacuum-${index}`,
              what_it_supports: "Retailer review volume.",
            },
            {
              title: `Expert tested review ${index}`,
              url: `https://reviews.example.com/credible-vacuum-${index}`,
              what_it_supports: "Independent tested review.",
            },
          ],
          metadata: {
            ...buildProduct(`Strong Credible Vacuum ${index}`).metadata,
            brand: field("Dyson"),
            offers: [
              offerFrom(
                150 + index,
                "Best Buy",
                `https://www.bestbuy.com/site/credible-vacuum-${index}`,
              ),
            ],
            rating: field(4.6),
            reviewCount: field(1200 + index * 100),
          },
          product_page_url: `https://www.dyson.com/vacuum-cleaners/credible-${index}`,
          source_consensus: "Strong",
        },
      }),
    );
    const moderateProducts = [1, 2].map((index) =>
      buildProduct(`Moderate Credible Vacuum ${index}`, {
        price: 100 + index,
        rating: 4.3,
        reviews: 90 + index,
      }),
    );
    const weakProducts = [1, 2].map((index) =>
      buildProduct(`Weak Mystery Vacuum ${index}`, {
        price: 60 + index,
        rich: false,
        rating: null,
        reviews: null,
      }),
    );
    const result = scoreAndSelectRecommendations(
      buildResult([...weakProducts, ...moderateProducts, ...strongProducts]),
      vacuumInput("under $700"),
    );

    assert.equal(result.exactMatches.length, 7);
    assert.equal(
      result.exactMatches.slice(0, 5).some((product) =>
        product.name.startsWith("Weak Mystery Vacuum"),
      ),
      false,
      "weak credibility products should not fill the first five ranks when enough stronger products exist",
    );
  });

  it("limits exact Best Matches to seven ranked products", () => {
    const products = Array.from({ length: 9 }, (_, index) =>
      buildProduct(`Ranked Cordless Vacuum ${index + 1}`, {
        price: 100 + index,
        rating: 4.7 - index * 0.02,
        reviews: 1200 - index * 50,
        expert: index < 4,
      }),
    );
    const result = scoreAndSelectRecommendations(
      buildResult(products),
      vacuumInput("under $700"),
    );

    assert.equal(result.exactMatches.length, 7);
    assert.deepEqual(rankLabels(result), [
      "#1 Best Match",
      "#2 Best Match",
      "#3 Best Match",
      "#4 Best Match",
      "#5 Best Match",
      "#6 Best Match",
      "#7 Best Match",
    ]);
    assert.equal(result.nearMatches.length, 0);
  });

  it("keeps ranked positions unique across duplicate canonical products", () => {
    const first = buildProduct("Twin Cordless Vacuum", { price: 99 });
    const second = buildProduct("Twin Cordless Vacuum", { price: 101 });
    const third = buildProduct("Other Cordless Vacuum", { price: 149 });
    const result = scoreAndSelectRecommendations(
      buildResult([first, second, third]),
      vacuumInput(),
    );
    const ids = result.exactMatches.map(
      (product) => product.canonicalIdentity?.canonicalId,
    );

    assert.equal(new Set(ids).size, ids.length);
  });

  it("moves AI-claimed exact matches that violate the firm budget into near matches", () => {
    const overBudget = buildProduct("Over Budget Cordless Vacuum", {
      price: 450,
      rating: 4.8,
      reviews: 3000,
    });
    const inBudget = buildProduct("In Budget Cordless Vacuum", {
      price: 199,
      rating: 4.5,
      reviews: 700,
    });
    const result = scoreAndSelectRecommendations(
      buildResult([overBudget, inBudget]),
      vacuumInput("under $300"),
    );

    assert.equal(
      result.exactMatches.some(
        (product) => product.name === "Over Budget Cordless Vacuum",
      ),
      false,
    );
    assert.ok(
      result.nearMatches.some(
        (product) => product.name === "Over Budget Cordless Vacuum",
      ),
    );
  });

  it("excludes products that contain a stated dealbreaker", () => {
    const velvetProduct = buildProduct("Velvet Trim Cordless Vacuum", {
      price: 99,
      overrides: {
        pros: ["Velvet trim finish.", "Strong suction reported."],
      },
    });
    const cleanProduct = buildProduct("Clean Cordless Vacuum", { price: 119 });
    const request = {
      query: "cordless vacuum",
      budget: "under $300",
      avoid: "velvet",
    };
    const result = scoreAndSelectRecommendations(
      buildResult([velvetProduct, cleanProduct]),
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(
      result.exactMatches.some(
        (product) => product.name === "Velvet Trim Cordless Vacuum",
      ),
      false,
    );
  });
});

describe("junk candidate filtering", () => {
  function rawCandidate(name, price = 99) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      id: `raw-${slug}`,
      name,
      brand: null,
      category: "cordless drill",
      productUrl: `https://shop.example.com/p/${slug}`,
      imageUrl: `https://shop.example.com/img/${slug}.jpg`,
      retailer: "Example Store",
      price,
      rating: 4.4,
      reviewCount: 150,
      availableColors: [],
      dimensions: { width: null, depth: null, height: null, unit: null },
      keySpecs: [],
      evidenceSources: [
        {
          title: name,
          url: `https://shop.example.com/p/${slug}`,
          snippet: "Product listing.",
        },
      ],
      requirementCheck: { exactMatch: false, passed: [], failed: [], unknown: [] },
    };
  }

  it("rejects used/refurbished and accessory-for listings unless requested", () => {
    const input = {
      query: "cordless drill",
      extractedRequirements: extractStructuredRequirements({
        query: "cordless drill",
      }),
    };
    const result = cheapPreFilterRawCandidates(
      [
        rawCandidate("DEWALT 20V Cordless Drill Kit"),
        rawCandidate("DEWALT 20V Cordless Drill (Renewed)"),
        rawCandidate("Refurbished Milwaukee Cordless Drill"),
        rawCandidate("Replacement Battery for DEWALT Cordless Drill"),
        rawCandidate("Drill Brush Attachment for Bathroom Cleaning"),
        rawCandidate("Makita Cordless Drill Kit with Charger for Home Projects"),
      ],
      input,
    );
    const names = result.candidates.map((candidate) => candidate.name);

    assert.ok(names.includes("DEWALT 20V Cordless Drill Kit"));
    assert.ok(
      names.includes("Makita Cordless Drill Kit with Charger for Home Projects"),
      "bundles described with 'with ... for ...' must not be treated as accessories",
    );
    assert.equal(names.includes("DEWALT 20V Cordless Drill (Renewed)"), false);
    assert.equal(names.includes("Refurbished Milwaukee Cordless Drill"), false);
    assert.equal(
      names.includes("Replacement Battery for DEWALT Cordless Drill"),
      false,
    );
    assert.equal(
      names.includes("Drill Brush Attachment for Bathroom Cleaning"),
      false,
    );
  });

  it("keeps refurbished listings when the user asked for them", () => {
    const input = {
      query: "refurbished cordless drill",
      extractedRequirements: extractStructuredRequirements({
        query: "refurbished cordless drill",
      }),
    };
    const result = cheapPreFilterRawCandidates(
      [rawCandidate("Refurbished Milwaukee Cordless Drill")],
      input,
    );

    assert.equal(result.candidates.length, 1);
  });

  it("exposes the junk detectors for direct checks", () => {
    assert.equal(
      serperTestExports.isLikelyUsedOrRefurbished(
        rawCandidate("Open Box LG Refrigerator"),
      ),
      true,
    );
    assert.equal(
      serperTestExports.isAccessoryForAnotherProduct(
        rawCandidate("Charger for Dyson V8 Vacuum"),
      ),
      true,
    );
    assert.equal(
      serperTestExports.isAccessoryForAnotherProduct(
        rawCandidate("Vacuum Kit with Charger for Quick Cleanups"),
      ),
      false,
    );
  });
});

describe("market coverage rescue", () => {
  it("runs broader rescue searches when the candidate pool is thin", async () => {
    const originalKey = process.env.SERPER_API_KEY;
    const originalFetch = global.fetch;

    process.env.SERPER_API_KEY = "test-serper-key";
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          shopping: [
            {
              title: "Lone Cordless Vacuum V1",
              link: "https://shop.example.com/p/lone-cordless-vacuum",
              source: "Example Store",
              price: "$149",
              snippet: "Cordless stick vacuum listing.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    try {
      const input = {
        query: "cordless vacuum under $300",
        extractedRequirements: extractStructuredRequirements({
          query: "cordless vacuum under $300",
        }),
      };
      const plan = generateSearchPlan(input);
      const result = await searchSerperForProducts(plan, input);

      assert.ok(result.stats.marketCoverage);
      assert.ok(
        result.stats.marketCoverage.rescueQueriesRun >= 1,
        "thin pools should trigger rescue searches",
      );
      assert.ok(
        result.stats.searchedShoppingQueries.some((query) =>
          /^(?:best|top rated)\b/i.test(query),
        ),
      );
    } finally {
      global.fetch = originalFetch;
      if (originalKey === undefined) {
        delete process.env.SERPER_API_KEY;
      } else {
        process.env.SERPER_API_KEY = originalKey;
      }
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cheapPreFilterRawCandidates,
  mergeProductRecommendations,
  normalizeSerperShoppingResults,
  serperCandidateToRecommendation,
  searchSerperForProducts,
} from "../lib/search/serper.ts";
import { getSearchDepthConfig } from "../lib/search/sourcePacks.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { validateProductImageCandidate } from "../lib/productImageResolver.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";
import { createRecommendationPostHandler } from "../app/api/recommendations/route.ts";

function buildRawCandidate(overrides = {}) {
  return {
    id: "serper-test",
    name: "Example Sleeper Sofa",
    brand: null,
    category: "sleeper sofa",
    productUrl: "https://shop.example.com/p/example-sleeper-sofa",
    imageUrl: "https://shop.example.com/images/example.jpg",
    retailer: "Example Store",
    price: 450,
    rating: 4.5,
    reviewCount: 120,
    availableColors: [],
    dimensions: { width: null, depth: null, height: null, unit: null },
    keySpecs: [],
    evidenceSources: [
      {
        title: "Example Sleeper Sofa",
        url: "https://shop.example.com/p/example-sleeper-sofa",
        snippet: "Sleeper sofa product listing.",
      },
    ],
    requirementCheck: {
      exactMatch: false,
      passed: [],
      failed: [],
      unknown: [],
    },
    ...overrides,
  };
}

function buildRecommendation(overrides = {}) {
  return {
    recommendation_type: "Close Match",
    name: "Example Sleeper Sofa",
    category: "sleeper sofa",
    product_page_url: "https://shop.example.com/p/example-sleeper-sofa",
    product_image_url: "",
    why_recommended: "Test product.",
    pros: ["Test pro."],
    cons: ["Test con."],
    common_complaints: [],
    estimated_price_range: "$450",
    confidence_score: 60,
    source_consensus: "Weak",
    price_value_verdict: "Test verdict.",
    best_for: "Test buyer.",
    not_for: ["Test non-buyer."],
    citations: [
      {
        title: "Example",
        url: "https://shop.example.com/p/example-sleeper-sofa",
        what_it_supports: "Test citation.",
      },
    ],
    ...overrides,
  };
}

describe("search depth defaults", () => {
  it("defaults to standard depth in production and dev depth elsewhere", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = "production";
      assert.equal(getSearchDepthConfig("").depth, "standard");
      assert.equal(getSearchDepthConfig(undefined).depth, "standard");
      assert.equal(getSearchDepthConfig("dev").depth, "dev");

      process.env.NODE_ENV = "development";
      assert.equal(getSearchDepthConfig("").depth, "dev");
      assert.equal(getSearchDepthConfig("deep").depth, "deep");
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });
});

describe("budget range parsing", () => {
  it("treats budget ranges as a firm limit at the upper bound", () => {
    const between = extractStructuredRequirements({
      query: "sleeper sofa",
      budget: "between $500 and $700",
    });
    assert.equal(between.budgetRules[0].amount, 700);
    assert.equal(between.budgetRules[0].operator, "max");

    const dashed = extractStructuredRequirements({
      query: "sleeper sofa",
      budget: "$500-$700",
    });
    assert.equal(dashed.budgetRules[0].amount, 700);

    const bare = extractStructuredRequirements({
      query: "sleeper sofa",
      budget: "500 to 700",
    });
    assert.equal(bare.budgetRules[0].amount, 700);

    const inline = extractStructuredRequirements({
      query: "sleeper sofa between $500 and $700",
    });
    assert.equal(inline.budgetRules[0].amount, 700);
  });

  it("does not read size ranges as budget ranges", () => {
    const sizeOnly = extractStructuredRequirements({
      query: "sofa between 60 and 70 inches wide",
    });
    assert.equal(sizeOnly.budgetRules.length, 0);

    const unchanged = extractStructuredRequirements({
      query: "sleeper sofa",
      budget: "under $700",
    });
    assert.equal(unchanged.budgetRules[0].amount, 700);
    assert.equal(unchanged.budgetRules[0].operator, "max");
  });
});

describe("Serper coverage improvements", () => {
  it("keeps more than 10 shopping results from a single response", () => {
    const shopping = Array.from({ length: 25 }, (_, index) => ({
      title: `Example Sleeper Sofa Model SS${100 + index} 63 in. Wide`,
      link: `https://shop.example.com/p/sleeper-sofa-ss${100 + index}`,
      source: "Example Store",
      price: `$${400 + index}`,
      imageUrl: `https://shop.example.com/images/ss${100 + index}.jpg`,
      rating: 4.5,
      ratingCount: 100 + index,
      snippet: "Sleeper sofa with compact width.",
    }));
    const candidates = normalizeSerperShoppingResults(
      { shopping },
      "sleeper sofa",
      "sleeper sofa",
    );

    assert.equal(candidates.length, 20);
  });

  it("keeps premium-above-budget candidates within the category premium cap", () => {
    const input = { query: "sleeper sofa", budget: "under $500" };
    const requestWithRequirements = {
      ...input,
      extractedRequirements: extractStructuredRequirements(input),
    };
    const inBudget = buildRawCandidate({
      id: "serper-a",
      name: "Example Sleeper Sofa Alpha",
      productUrl: "https://shop.example.com/p/sofa-alpha",
      price: 450,
    });
    const premiumUpgrade = buildRawCandidate({
      id: "serper-b",
      name: "Example Sleeper Sofa Bravo",
      productUrl: "https://shop.example.com/p/sofa-bravo",
      price: 850,
    });
    const wayOverCap = buildRawCandidate({
      id: "serper-c",
      name: "Example Sleeper Sofa Charlie",
      productUrl: "https://shop.example.com/p/sofa-charlie",
      price: 1200,
    });
    const result = cheapPreFilterRawCandidates(
      [inBudget, premiumUpgrade, wayOverCap],
      requestWithRequirements,
    );
    const names = result.candidates.map((candidate) => candidate.name);

    assert.ok(names.includes("Example Sleeper Sofa Alpha"));
    assert.ok(names.includes("Example Sleeper Sofa Bravo"));
    assert.equal(names.includes("Example Sleeper Sofa Charlie"), false);
    assert.equal(result.rejectedCount, 1);
  });

  it("does not turn conflicting-brand search snippets into product pros", () => {
    const recommendation = serperCandidateToRecommendation(
      buildRawCandidate({
        name: "XREY Air Purifiers For Home Large Room",
        category: "air purifier",
        productUrl: "https://www.walmart.com/ip/xrey-air-purifier",
        evidenceSources: [
          {
            title: "XREY Air Purifiers For Home Large Room",
            url: "https://www.walmart.com/ip/xrey-air-purifier",
            snippet:
              "AIRFIRE Air Purifier H13 HEPA for Allergies & Pets, 975 Sq.ft, Quiet Was.",
          },
        ],
      }),
    );

    assert.equal(
      recommendation.pros.some((pro) => /AIRFIRE/i.test(pro)),
      false,
    );
  });

  it("keeps weak-evidence fallback text out of product pros", () => {
    const recommendation = serperCandidateToRecommendation(
      buildRawCandidate({
        name: "OLIXIS Air Purifier for Home Bedroom",
        category: "air purifier",
        price: null,
        evidenceSources: [
          {
            title: "OLIXIS Air Purifier for Home Bedroom",
            url: "https://www.walmart.com/ip/olixis-air-purifier",
            snippet:
              ". HEPA Filter Quiet Sleep Mode SKU:N709P241723K-1-GIGA. Regular price Was $149. reg - Sale.",
          },
        ],
      }),
    );
    const pros = recommendation.pros.join("\n");

    assert.doesNotMatch(pros, /limited review evidence/i);
    assert.doesNotMatch(pros, /Listing details:\s*\./i);
    assert.doesNotMatch(pros, /\bSKU\b/i);
    assert.doesNotMatch(pros, /regular price/i);
    assert.doesNotMatch(pros, /\breg\b/i);
    assert.doesNotMatch(pros, /\bsale\b/i);
    assert.doesNotMatch(pros, /\bWas\b/i);
    assert.match(pros, /Listing details: HEPA Filter Quiet Sleep Mode/i);
  });

  it("spends organic discovery slots on product-page queries instead of reddit/youtube", async () => {
    const originalKey = process.env.SERPER_API_KEY;
    const originalFetch = global.fetch;

    process.env.SERPER_API_KEY = "test-serper-key";
    global.fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    try {
      const input = { query: "sleeper sofa under $700" };
      const requestWithRequirements = {
        ...input,
        extractedRequirements: extractStructuredRequirements(input),
      };
      const plan = generateSearchPlan(requestWithRequirements);
      const result = await searchSerperForProducts(plan, requestWithRequirements);

      assert.ok(result.stats.organicCalls >= 1);
      for (const query of result.stats.searchedOrganicQueries) {
        assert.doesNotMatch(query, /\b(?:reddit|youtube)\b/i);
      }
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

describe("duplicate handling with model awareness", () => {
  it("merges the same model sold by different retailers", () => {
    const wayfairListing = buildRecommendation({
      name: "Acme SS2000 Comfort Sleeper Sofa - Wayfair",
      product_page_url: "https://www.wayfair.com/pdp/acme-ss2000",
      product_image_url: "",
    });
    const walmartListing = buildRecommendation({
      name: "Acme SS2000 Comfort Sleeper Sofa, Gray - Walmart.com",
      product_page_url: "https://www.walmart.com/ip/acme-ss2000/12345",
      product_image_url: "https://i5.walmartimages.com/acme-ss2000.jpg",
    });
    const merged = mergeProductRecommendations([wayfairListing], [walmartListing]);

    assert.equal(merged.products.length, 1);
    assert.equal(merged.duplicateCount, 1);
    assert.equal(
      merged.products[0].product_image_url,
      "https://i5.walmartimages.com/acme-ss2000.jpg",
    );
  });

  it("does not merge different model numbers even with near-identical titles", () => {
    const firstModel = buildRecommendation({
      name: "Acme Comfort Plus Convertible Sleeper Sofa Bed Memory Foam Queen Gray Fabric SS2000",
      product_page_url: "https://shop.example.com/p/acme-ss2000",
    });
    const secondModel = buildRecommendation({
      name: "Acme Comfort Plus Convertible Sleeper Sofa Bed Memory Foam Queen Gray Fabric SS3000",
      product_page_url: "https://shop.example.com/p/acme-ss3000",
    });
    const merged = mergeProductRecommendations([firstModel], [secondModel]);

    assert.equal(merged.products.length, 2);
    assert.equal(merged.duplicateCount, 0);
  });
});

describe("product image candidates", () => {
  it("accepts Google Shopping thumbnails as product image candidates", () => {
    const result = validateProductImageCandidate(
      {
        source: "existing",
        url: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTexampleexampleexample",
        evidenceText: "Example Sleeper Sofa",
      },
      { productName: "Example Sleeper Sofa", category: "sleeper sofa" },
    );

    assert.equal(result.accepted, true);
  });

  it("still rejects non-image URLs on unknown hosts", () => {
    const result = validateProductImageCandidate(
      {
        source: "existing",
        url: "https://example.com/somepage?q=1",
        evidenceText: "Example Sleeper Sofa",
      },
      { productName: "Example Sleeper Sofa", category: "sleeper sofa" },
    );

    assert.equal(result.accepted, false);
  });
});

describe("AI research failure fallback", () => {
  it("falls back to Serper candidates when the AI research call fails", async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY;

    process.env.OPENAI_API_KEY = "test-openai-key";

    try {
      const serperCandidate = buildRawCandidate({
        id: "serper-microwave",
        name: "Example Countertop Microwave EM720",
        category: "microwave",
        productUrl: "https://shop.example.com/p/example-microwave-em720",
        imageUrl: "https://shop.example.com/images/em720.jpg",
        price: 89,
        evidenceSources: [
          {
            title: "Example Countertop Microwave EM720",
            url: "https://shop.example.com/p/example-microwave-em720",
            snippet: "Compact countertop microwave product listing.",
          },
        ],
      });
      const nearSerperCandidate = buildRawCandidate({
        id: "serper-microwave-near",
        name: "Example Countertop Microwave EM721",
        category: "microwave",
        productUrl: "https://shop.example.com/p/example-microwave-em721",
        imageUrl: "https://shop.example.com/images/em721.jpg",
        price: null,
        evidenceSources: [
          {
            title: "Example Countertop Microwave EM721",
            url: "https://shop.example.com/p/example-microwave-em721",
            snippet: "Compact countertop microwave product listing.",
          },
        ],
      });
      const handler = createRecommendationPostHandler({
        collectReachableCitationUrls: async () => new Set(),
        createOpenAIClient: async () => ({
          responses: {
            create: async () => {
              throw new Error("Upstream AI research timeout");
            },
          },
        }),
        enrichProductAssets: async (result) => result,
        enrichResultWithReviewEvidence: async (result) => result,
        searchSerperForProducts: async () => ({
          candidates: [serperCandidate, nearSerperCandidate],
          stats: {
            categoryGroup: "appliances",
            generatedQueries: [],
            selectedSourcePack: [],
            searchedShoppingQueries: [],
            searchedOrganicQueries: [],
            searchedRetailerDomainQueries: [],
            searchedDirectRetailerQueries: [],
            shoppingCalls: 1,
            organicCalls: 0,
            retailerDomainCalls: 0,
            directRetailerCalls: 0,
            collectedCandidates: 2,
            duplicateCandidatesRemoved: 0,
            maxEnrichedProducts: 6,
            preFilteredCandidates: 2,
            rejectedCandidates: 0,
            searchDepth: "dev",
            sourceTimeouts: 0,
          },
        }),
        verifyMissingRequirementEvidence: async (result) => result,
      });
      const response = await handler(
        new Request("http://localhost/api/recommendations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "microwave under $100" }),
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.ok(body.result);
      assert.equal("debug" in body, false);

      const shownProducts = [
        ...body.result.exactMatches,
        ...body.result.nearMatches,
      ];

      assert.ok(
        shownProducts.some((product) =>
          product.name.includes("Example Countertop Microwave"),
        ),
      );

      const debugResponse = await handler(
        new Request("http://localhost/api/recommendations", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-reviewradar-debug": "true",
          },
          body: JSON.stringify({ query: "microwave under $100" }),
        }),
      );
      const debugBody = await debugResponse.json();

      assert.equal(debugResponse.status, 200);
      assert.equal(debugBody.debug.fallbackReason, "ai_research_error");
      assert.equal(
        debugBody.debug.stageFunnel.path,
        "search_candidate_fallback",
      );
      assert.deepEqual(
        debugBody.debug.stageFunnel.stages.map((stage) => stage.stage),
        [
          "candidatePool",
          "afterRequirementFilter",
          "afterEnrichment",
          "afterAssets",
          "afterRescue",
          "afterRevalidation",
          "final",
        ],
      );
      assert.deepEqual(
        debugBody.debug.stageFunnel.sourceUpgradeTraces,
        [],
      );
      const afterRequirementFilter =
        debugBody.debug.stageFunnel.stages.find(
          (stage) => stage.stage === "afterRequirementFilter",
        );
      assert.deepEqual(afterRequirementFilter.names, [
        "Example Countertop Microwave EM720",
      ]);
      assert.deepEqual(afterRequirementFilter.near, [
        "Example Countertop Microwave EM721",
      ]);
      assert.ok(
        Array.isArray(debugBody.debug.stageFunnel.finalSelectionTrace),
      );
      assert.equal(
        "stageFunnel" in debugBody.result,
        false,
      );
    } finally {
      if (originalOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
    }
  });

  it("still returns a safe error when AI research fails with no Serper candidates", async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY;

    process.env.OPENAI_API_KEY = "test-openai-key";

    try {
      const handler = createRecommendationPostHandler({
        collectReachableCitationUrls: async () => new Set(),
        createOpenAIClient: async () => ({
          responses: {
            create: async () => {
              throw new Error("Upstream AI research timeout");
            },
          },
        }),
        enrichProductAssets: async (result) => result,
        enrichResultWithReviewEvidence: async (result) => result,
        searchSerperForProducts: async () => ({
          candidates: [],
          stats: {
            categoryGroup: "appliances",
            generatedQueries: [],
            selectedSourcePack: [],
            searchedShoppingQueries: [],
            searchedOrganicQueries: [],
            searchedRetailerDomainQueries: [],
            searchedDirectRetailerQueries: [],
            shoppingCalls: 0,
            organicCalls: 0,
            retailerDomainCalls: 0,
            directRetailerCalls: 0,
            collectedCandidates: 0,
            duplicateCandidatesRemoved: 0,
            maxEnrichedProducts: 6,
            preFilteredCandidates: 0,
            rejectedCandidates: 0,
            searchDepth: "dev",
            sourceTimeouts: 0,
          },
        }),
        verifyMissingRequirementEvidence: async (result) => result,
      });
      const response = await handler(
        new Request("http://localhost/api/recommendations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "microwave" }),
        }),
      );

      assert.equal(response.status, 502);
    } finally {
      if (originalOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
    }
  });
});

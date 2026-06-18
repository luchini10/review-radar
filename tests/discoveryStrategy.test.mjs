import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  augmentSearchPlanWithDiscoveryStrategy,
  buildDeterministicGapCheck,
  buildOpenAIDiscoveryStrategy,
  candidateMatchesDiscoveryTarget,
  discoveryContextForPrompt,
} from "../lib/discoveryStrategy.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";

function rawCandidate(overrides = {}) {
  return {
    id: "candidate-1",
    name: "Nike G.T. Cut Academy Basketball Shoes",
    brand: "Nike",
    category: "basketball shoes",
    productUrl: "https://www.nike.com/t/gt-cut-academy",
    imageUrl: "https://static.nike.com/gt-cut.jpg",
    retailer: "Nike",
    price: 95,
    rating: 4.7,
    reviewCount: 2400,
    availableColors: [],
    dimensions: { width: null, depth: null, height: null, unit: null },
    keySpecs: ["basketball shoes"],
    evidenceSources: [
      {
        title: "Nike G.T. Cut Academy Basketball Shoes",
        url: "https://www.nike.com/t/gt-cut-academy",
        snippet: "Nike basketball shoes with Zoom Air.",
      },
    ],
    requirementCheck: { exactMatch: false, failed: [], passed: [], unknown: [] },
    ...overrides,
  };
}

function shoeRequest() {
  const request = {
    budget: "$300",
    priorities: "Must be Nike only",
    query: "basketball shoes",
  };

  return {
    ...request,
    extractedRequirements: extractStructuredRequirements(request),
  };
}

const strategy = {
  avoidCandidatePatterns: ["used shoes", "replacement laces"],
  discoveryQueries: [
    "best Nike basketball shoes under $300",
    "top rated Nike basketball sneakers",
  ],
  expectedProducts: [
    {
      aliases: ["GT Cut Academy", "G.T. Cut Academy"],
      brand: "Nike",
      priority: "high",
      productLine: "G.T. Cut Academy",
      whyExpected: "Mainstream Nike basketball shoe line.",
    },
    {
      aliases: ["LeBron basketball shoes"],
      brand: "Nike",
      priority: "medium",
      productLine: "LeBron",
      whyExpected: "Recognizable Nike basketball line.",
    },
  ],
  searchIntent: "Find mainstream Nike basketball shoes under budget.",
  verificationFacts: ["current price", "exact product page", "review count"],
};

describe("AI discovery strategy helpers", () => {
  it("augments the deterministic search plan without replacing it", () => {
    const request = shoeRequest();
    const basePlan = generateSearchPlan(request);
    const plan = augmentSearchPlanWithDiscoveryStrategy(
      basePlan,
      strategy,
      request,
    );
    const joined = plan.queries.map((query) => query.query).join("\n");

    assert.match(joined, /best Nike basketball shoes under \$300/);
    assert.match(joined, /Nike G\.T\. Cut Academy basketball shoes under \$300/);
    assert.ok(plan.queries.length <= 18);
    assert.equal(plan.stagedQueries.pass1.length <= 8, true);
  });

  it("detects expected mainstream products that are missing from the first candidate pool", () => {
    const request = shoeRequest();
    const gapCheck = buildDeterministicGapCheck(request, strategy, [
      rawCandidate(),
    ]);

    assert.deepEqual(gapCheck.missingExpectedProducts, ["Nike LeBron"]);
    assert.ok(
      gapCheck.followUpQueries.some((query) =>
        /Nike LeBron basketball shoes under \$300/i.test(query),
      ),
    );
  });

  it("matches discovery targets using brand and product-line aliases", () => {
    assert.equal(
      candidateMatchesDiscoveryTarget(rawCandidate(), strategy.expectedProducts[0]),
      true,
    );
    assert.equal(
      candidateMatchesDiscoveryTarget(
        rawCandidate({
          brand: "Adidas",
          evidenceSources: [
            {
              title: "Adidas Dame 9 Basketball Shoes",
              url: "https://www.adidas.com/us/dame-9",
              snippet: "Adidas basketball shoes with Lightstrike cushioning.",
            },
          ],
          keySpecs: ["basketball shoes"],
          name: "Adidas Dame 9 Basketball Shoes",
          productUrl: "https://www.adidas.com/us/dame-9",
        }),
        strategy.expectedProducts[0],
      ),
      false,
    );
  });

  it("parses OpenAI strategy JSON but falls back safely on invalid output", async () => {
    const validClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify(strategy),
        }),
      },
    };
    const invalidClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({ not: "a strategy" }),
        }),
      },
    };

    const parsed = await buildOpenAIDiscoveryStrategy({
      client: validClient,
      input: shoeRequest(),
      model: "test-model",
    });
    const fallback = await buildOpenAIDiscoveryStrategy({
      client: invalidClient,
      input: shoeRequest(),
      model: "test-model",
    });

    assert.equal(parsed.expectedProducts[0].productLine, "G.T. Cut Academy");
    assert.deepEqual(fallback.expectedProducts, []);
  });

  it("summarizes strategy and gap-check context for the final research prompt", () => {
    const context = discoveryContextForPrompt(strategy, {
      followUpQueries: ["Nike LeBron basketball shoes under $300"],
      missingExpectedProducts: ["Nike LeBron"],
      notes: ["LeBron was missing from the first pass."],
      suspiciousCandidateNames: ["Unknown Outlet Shoe"],
    });

    assert.match(context, /Expected mainstream products or lines/);
    assert.match(context, /Gap check missing expected products: Nike LeBron/);
    assert.match(context, /Suspicious candidates to treat cautiously/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  augmentSearchPlanWithDiscoveryStrategy,
  buildDeterministicGapCheck,
  buildOpenAIDiscoveryGapCheck,
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
  buyingRubric: {
    category: "basketball shoes",
    commonTradeoffs: ["court feel vs cushioning"],
    mustVerifyFacts: ["traction", "cushioning", "support"],
    qualitySignals: ["traction", "cushioning", "ankle support"],
    redFlags: ["durability complaints", "poor grip"],
    reviewSignals: ["owner reviews mention grip", "expert testing mentions support"],
    searchQueries: ["Nike basketball shoes traction cushioning reviews $300"],
  },
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
    assert.match(joined, /Nike basketball shoes traction cushioning reviews under \$300/);
    assert.match(joined, /Nike G\.T\. Cut Academy basketball shoes under \$300/);
    assert.ok(plan.queries.length <= 18);
    assert.equal(plan.stagedQueries.pass1.length <= 8, true);
  });

  it("keeps AI-added search queries budget-bound when a hard budget exists", () => {
    const request = shoeRequest();
    const basePlan = generateSearchPlan(request);
    const plan = augmentSearchPlanWithDiscoveryStrategy(
      basePlan,
      {
        ...strategy,
        discoveryQueries: ["Nike LeBron basketball shoes $300"],
      },
      request,
    );
    const joined = plan.queries.map((query) => query.query).join("\n");

    assert.match(joined, /Nike LeBron basketball shoes under \$300/);
    assert.doesNotMatch(joined, /Nike LeBron basketball shoes \$300\b/);
  });

  it("keeps hard-filter budget and brand searches ahead of AI strategy expansion", () => {
    const request = shoeRequest();
    const basePlan = generateSearchPlan(request);
    const crowdedStrategy = {
      ...strategy,
      discoveryQueries: Array.from({ length: 8 }, (_, index) =>
        `premium Nike racing shoe line ${index + 1}`,
      ),
      expectedProducts: strategy.expectedProducts.map((target) => ({
        ...target,
        productLine: `${target.productLine} Elite`,
      })),
    };
    const plan = augmentSearchPlanWithDiscoveryStrategy(
      basePlan,
      crowdedStrategy,
      request,
    );
    const firstQueries = plan.stagedQueries.pass1
      .slice(0, 4)
      .map((query) => query.query)
      .join("\n")
      .toLowerCase();
    const joined = plan.queries.map((query) => query.query).join("\n");

    assert.match(firstQueries, /basketball shoes nike under \$300/);
    assert.match(firstQueries, /nike basketball shoes under \$300/);
    assert.match(joined, /premium Nike racing shoe line 1/);
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
    assert.equal(parsed.buyingRubric?.category, "basketball shoes");
    assert.deepEqual(parsed.buyingRubric?.qualitySignals.slice(0, 2), [
      "traction",
      "cushioning",
    ]);
    assert.deepEqual(fallback.expectedProducts, []);
    assert.equal(fallback.buyingRubric, undefined);
  });

  it("pins both planning calls only when REVIEW_RADAR_PINNED_PLANNING is on", async () => {
    const previous = process.env.REVIEW_RADAR_PINNED_PLANNING;
    const requests = [];
    const client = {
      responses: {
        create: async (options) => {
          requests.push(options);

          return {
            output_text: JSON.stringify(
              options.text.format.name === "review_radar_discovery_strategy"
                ? strategy
                : {
                    followUpQueries: [],
                    missingExpectedProducts: [],
                    notes: [],
                    suspiciousCandidateNames: [],
                  },
            ),
          };
        },
      },
    };

    try {
      process.env.REVIEW_RADAR_PINNED_PLANNING = "on";
      await buildOpenAIDiscoveryStrategy({
        client,
        input: shoeRequest(),
        model: "gpt-5.4-mini",
      });
      await buildOpenAIDiscoveryGapCheck({
        candidates: [rawCandidate()],
        client,
        input: shoeRequest(),
        model: "gpt-5.4-mini",
        strategy,
      });

      assert.equal(requests.length, 2);
      assert.equal(
        requests.every(
          (request) => request.model === "gpt-5.4-mini-2026-03-17",
        ),
        true,
      );
      assert.equal(
        requests.every((request) => request.temperature === 0),
        true,
      );

      requests.length = 0;
      await buildOpenAIDiscoveryStrategy({
        client,
        input: shoeRequest(),
        model: "custom-helper-model",
      });
      assert.equal(requests[0].model, "custom-helper-model");
      assert.equal("temperature" in requests[0], false);

      requests.length = 0;
      delete process.env.REVIEW_RADAR_PINNED_PLANNING;
      await buildOpenAIDiscoveryStrategy({
        client,
        input: shoeRequest(),
        model: "gpt-5.4-mini",
      });
      await buildOpenAIDiscoveryGapCheck({
        candidates: [rawCandidate()],
        client,
        input: shoeRequest(),
        model: "gpt-5.4-mini",
        strategy,
      });

      assert.equal(requests.length, 2);
      assert.equal(
        requests.every((request) => request.model === "gpt-5.4-mini"),
        true,
      );
      assert.equal(
        requests.every((request) => !("temperature" in request)),
        true,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_PINNED_PLANNING;
      } else {
        process.env.REVIEW_RADAR_PINNED_PLANNING = previous;
      }
    }
  });

  it("normalizes AI gap-check follow-up queries to budget-bound wording", async () => {
    const client = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            followUpQueries: ["Nike LeBron basketball shoes $300"],
            missingExpectedProducts: ["Nike LeBron"],
            notes: ["LeBron was missing."],
            suspiciousCandidateNames: [],
          }),
        }),
      },
    };
    const gapCheck = await buildOpenAIDiscoveryGapCheck({
      candidates: [rawCandidate()],
      client,
      input: shoeRequest(),
      model: "test-model",
      strategy,
    });

    assert.ok(
      gapCheck.followUpQueries.some((query) =>
        /Nike LeBron basketball shoes under \$300/i.test(query),
      ),
    );
    assert.ok(
      !gapCheck.followUpQueries.some((query) =>
        /Nike LeBron basketball shoes \$300\b/i.test(query),
      ),
    );
  });

  it("summarizes strategy and gap-check context for the final research prompt", () => {
    const context = discoveryContextForPrompt(strategy, {
      followUpQueries: ["Nike LeBron basketball shoes under $300"],
      missingExpectedProducts: ["Nike LeBron"],
      notes: ["LeBron was missing from the first pass."],
      suspiciousCandidateNames: ["Unknown Outlet Shoe"],
    });

    assert.match(context, /Expected mainstream products or lines/);
    assert.match(context, /Buying rubric quality signals: traction; cushioning; ankle support/);
    assert.match(context, /Buying rubric red flags: durability complaints; poor grip/);
    assert.match(context, /Gap check missing expected products: Nike LeBron/);
    assert.match(context, /Suspicious candidates to treat cautiously/);
  });
});

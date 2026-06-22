import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdaptiveVerificationBudget,
  chooseFinalResearchContext,
  mapWithConcurrency,
  selectFinalResearchCandidates,
  shouldRunFollowUpDiscovery,
} from "../lib/recommendationPerformance.ts";

function product(name) {
  return {
    best_for: "Test shoppers.",
    category: "Test category",
    citations: [],
    common_complaints: [],
    confidence_score: 82,
    cons: [],
    estimated_price_range: "$100",
    name,
    not_for: [],
    price_value_verdict: "",
    product_image_url: "",
    product_page_url: `https://example.com/${name}`,
    pros: [],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended: "",
  };
}

function result({ exact = 0, near = 0, premium = 0 } = {}) {
  return {
    assumptions: [],
    exactMatches: Array.from({ length: exact }, (_, index) =>
      product(`Exact ${index}`),
    ),
    final_buying_advice: "",
    nearMatches: Array.from({ length: near }, (_, index) =>
      product(`Near ${index}`),
    ),
    premiumAboveBudget: Array.from({ length: premium }, (_, index) =>
      product(`Premium ${index}`),
    ),
    recommendations: [],
    search_summary: "",
    what_to_avoid: [],
  };
}

function request(overrides = {}) {
  return {
    budget: "$300",
    query: "cordless drill",
    ...overrides,
  };
}

function candidate(id, overrides = {}) {
  return {
    availableColors: [],
    brand: null,
    category: "cordless drill",
    dimensions: {
      depth: null,
      height: null,
      unit: null,
      width: null,
    },
    evidenceSources: [],
    id,
    imageUrl: null,
    keySpecs: [],
    name: `Product ${id}`,
    price: null,
    productUrl: `https://retailer${id % 4}.com/p/${id}`,
    rating: null,
    requirementCheck: { passed: false, reasons: [] },
    retailer: null,
    reviewCount: null,
    ...overrides,
  };
}

describe("recommendation performance policy", () => {
  it("limits expensive proof work when there are already seven likely exact matches", () => {
    const budget = buildAdaptiveVerificationBudget({
      categoryGroup: "tool",
      maxEnrichedProducts: 15,
      request: request(),
      result: result({ exact: 8, near: 5 }),
      serperCandidateCount: 30,
    });

    assert.equal(budget.maxProducts, 9);
    assert.equal(budget.maxFactsPerProduct, 2);
    assert.equal(budget.reason, "enough_exact_candidates");
  });

  it("keeps enough close matches when exact matches are limited", () => {
    const budget = buildAdaptiveVerificationBudget({
      categoryGroup: "tool",
      maxEnrichedProducts: 15,
      request: request(),
      result: result({ exact: 4, near: 8 }),
      serperCandidateCount: 30,
    });

    assert.equal(budget.maxProducts, 7);
    assert.equal(budget.reason, "some_exact_candidates");
  });

  it("caps broader rescue when exact matches are scarce", () => {
    const budget = buildAdaptiveVerificationBudget({
      categoryGroup: "general",
      maxEnrichedProducts: 15,
      request: request({ priorities: "brushless battery charger compact" }),
      result: result({ exact: 1, near: 12 }),
      serperCandidateCount: 30,
    });

    assert.equal(budget.maxProducts, 7);
    assert.equal(budget.reason, "few_exact_candidates");
  });

  it("uses medium final context only when candidate coverage is strong", () => {
    const candidates = Array.from({ length: 16 }, (_, index) =>
      candidate(index, {
        price: index < 8 ? 99 + index : null,
      }),
    );

    assert.equal(
      chooseFinalResearchContext({
        candidates,
        discoveryGapCount: 0,
        sourceTimeouts: 0,
      }),
      "medium",
    );
    assert.equal(
      chooseFinalResearchContext({
        candidates: candidates.slice(0, 5),
        discoveryGapCount: 1,
        sourceTimeouts: 0,
      }),
      "high",
    );
  });

  it("shortlists while preserving hard matches and expected mainstream products", () => {
    const candidates = Array.from({ length: 40 }, (_, index) =>
      candidate(index, {
        name: index === 35 ? "Nike LeBron Witness Basketball Shoes" : `Item ${index}`,
        brand: index === 35 ? "Nike" : null,
        price: index % 3 === 0 ? 120 : null,
        requirementCheck: {
          passed: index === 30,
          reasons: [],
        },
      }),
    );

    const shortlist = selectFinalResearchCandidates({
      candidates,
      expectedProducts: [{ brand: "Nike", productLine: "LeBron Witness" }],
      limit: 12,
    });

    assert.equal(shortlist.length, 12);
    assert.ok(shortlist.some((item) => item.id === 30));
    assert.ok(shortlist.some((item) => item.id === 35));
  });

  it("runs independent work with a bounded concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    const values = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 15));
        active -= 1;
        return item * 10;
      },
    );

    assert.deepEqual(values, [10, 20, 30, 40, 50]);
    assert.equal(maxActive, 2);
  });

  it("runs follow-up discovery only when coverage is actually weak", () => {
    const candidates = Array.from({ length: 14 }, (_, index) =>
      candidate(index, { price: index < 8 ? 100 + index : null }),
    );

    assert.equal(
      shouldRunFollowUpDiscovery({
        candidates,
        followUpQueryCount: 3,
        marketCoverage: {
          candidateCount: 14,
          pricedCandidateCount: 8,
          retailerHostCount: 4,
        },
        missingExpectedProductCount: 1,
      }),
      false,
    );
    assert.equal(
      shouldRunFollowUpDiscovery({
        candidates: candidates.slice(0, 6),
        followUpQueryCount: 3,
        marketCoverage: {
          candidateCount: 6,
          pricedCandidateCount: 2,
          retailerHostCount: 2,
        },
        missingExpectedProductCount: 1,
      }),
      true,
    );
  });
});

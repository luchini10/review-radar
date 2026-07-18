import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeTwoLayerQualityGate,
  TWO_LAYER_QUALITY_GATE_BARS,
  TWO_LAYER_QUALITY_GATE_CASES,
  TWO_LAYER_QUALITY_GATE_VERSION,
} from "../scripts/two-layer-quality-gate.mjs";

const commit = "a".repeat(40);

function requirementChecks(caseId) {
  const expected = TWO_LAYER_QUALITY_GATE_CASES.find(
    (candidate) => candidate.id === caseId,
  ).expectedRequirementTexts;
  return expected.map((requirement) => ({
    requirement,
    status: "Pass",
    explanation: "Evidence supports this requirement.",
    trust: "research_synthesis",
    label: "AI research synthesis",
    sourceIds: ["s1"],
  }));
}

function card(caseId, rank, brand, productName, model) {
  const sourceIds = ["s1", "s2"];
  return {
    key: `${caseId}-${rank}`,
    rank,
    recommendationStatus: "Best Match",
    identity: {
      brand,
      product_name: productName,
      model,
      variant: null,
    },
    identityVerification: {
      state: "not_verified",
      label: "Exact model and variant not independently verified",
      observedAt: null,
    },
    assessment: {
      why: { value: "Why", sourceIds },
      bestFor: { value: "Best for", sourceIds },
      mainTradeoff: { value: "Tradeoff", sourceIds },
    },
    pros: [{ value: "Pro", sourceIds }],
    cons: [{ value: "Con", sourceIds }],
    requirementChecks: requirementChecks(caseId),
    claims: [
      {
        value: "Claim",
        sourceIds,
        trust: "source_reported",
        label: "Source-reported",
        claimType: "other",
        evidenceScope: "unresolved",
      },
    ],
    commerce: {
      state: "not_verified",
      label: "Check current price",
      priceAmount: null,
      currency: null,
      seller: null,
      productUrl: null,
      availability: null,
      observedAt: null,
    },
    image: { state: "not_verified", label: "Not independently verified", url: null },
  };
}

function cardsFor(caseId) {
  if (caseId === "broad-shop-vac") {
    return [
      card(caseId, 1, "RIDGID", "RIDGID NXT Wet Dry Vacuum", "HD1400"),
      card(caseId, 2, "Vacmaster", "Vacmaster Beast Wet Dry Vacuum", "VFB511B"),
      card(caseId, 3, "CRAFTSMAN", "CRAFTSMAN Wet Dry Vacuum", "CMXEVBE17595"),
      card(caseId, 4, "DEWALT", "DEWALT Wet Dry Vacuum", "DXV12P"),
      card(caseId, 5, "Stanley", "Stanley Wet Dry Vacuum", "SL18116P"),
    ];
  }
  return [
    card(caseId, 1, "eufy", "eufy C10 Robot Vacuum", "C10"),
    card(caseId, 2, "Shark", "Shark Matrix Robot Vacuum", "RV2300S"),
    card(caseId, 3, "Roborock", "Roborock Q5 Max+ Robot Vacuum", "Q5 Max+"),
  ];
}

function fixture(caseId, run) {
  const cards = cardsFor(caseId);
  return {
    gateVersion: TWO_LAYER_QUALITY_GATE_VERSION,
    caseId,
    run,
    commit,
    wallClockMs: 240_000,
    route: { status: 200, state: "completed" },
    completion: {
      modelRequested: "gpt-5.6-terra",
      modelReturned: "gpt-5.6-terra",
      durationMs: 700,
      usage: {
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 20_000,
        totalTokens: 120_000,
        webSearchCalls: 10,
      },
      sourceCount: 2,
    },
    formatter: {
      formatterVersion: "oai-two-layer-deterministic-formatter-v2",
      recommendationCount: cards.length,
      registeredSourceCount: 2,
      ignoredTransactionalSectionCount: cards.length,
      ignoredUnregisteredCitationUrlCount: 0,
    },
    cards,
    sources: [
      {
        id: "s1",
        label: "Research source",
        title: "Sanitized source title",
        url: `https://sources.example/${caseId}/${run}`,
      },
      {
        id: "s2",
        label: "Research source",
        title: "Second sanitized source title",
        url: `https://evidence.example/${caseId}/${run}`,
      },
    ],
  };
}

function fixtures() {
  return TWO_LAYER_QUALITY_GATE_CASES.flatMap((testCase) =>
    [1, 2, 3].map((run) => fixture(testCase.id, run)),
  );
}

function manualReviewFor(sample) {
  const productAudits = sample.flatMap((item) =>
    item.cards.map((product) => ({
      caseId: item.caseId,
      run: item.run,
      productKey: product.key,
      eligibility: "pass",
      requirementAccuracy:
        item.caseId === "con-robot-vac-300-selfempty" ? "pass" : "not_applicable",
    })),
  );
  const sourceAudits = sample.flatMap((item) =>
    item.cards.slice(0, 2).map((product) => ({
      caseId: item.caseId,
      run: item.run,
      productKey: product.key,
      sourceIds: ["s1", "s2"],
      status: "pass",
    })),
  );
  return {
    productAudits,
    sourceAudits,
    blindComparisons: [
      { caseId: "broad-shop-vac", result: "win" },
      { caseId: "con-robot-vac-300-selfempty", result: "tie" },
    ],
  };
}

describe("OAI-T5A two-layer quality gate", () => {
  it("freezes only the two ratified cases, three runs each, and absolute bars", () => {
    assert.equal(TWO_LAYER_QUALITY_GATE_VERSION, "oai-t5-quality-gate-v1");
    assert.deepEqual(
      TWO_LAYER_QUALITY_GATE_CASES.map((item) => ({ id: item.id, runs: item.runs })),
      [
        { id: "broad-shop-vac", runs: 3 },
        { id: "con-robot-vac-300-selfempty", runs: 3 },
      ],
    );
    assert.equal(TWO_LAYER_QUALITY_GATE_BARS.broadLeaderMeanMinimum, 4);
    assert.equal(TWO_LAYER_QUALITY_GATE_BARS.broadLeaderRunMinimum, 3);
    assert.equal(TWO_LAYER_QUALITY_GATE_BARS.minimumPairwiseJaccard, 0.6);
    assert.equal(TWO_LAYER_QUALITY_GATE_BARS.minimumCardsPerRun, 3);
    assert.equal(TWO_LAYER_QUALITY_GATE_BARS.maximumCardsPerRun, 5);
  });

  it("passes a complete, stable, source-bound sample only after manual review", () => {
    const sample = fixtures();
    const result = analyzeTwoLayerQualityGate({
      fixtures: sample,
      manualReview: manualReviewFor(sample),
    });
    assert.equal(result.decision, "pass");
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.pendingManualReview, []);
    assert.deepEqual(result.metrics.broadLeaderRecall.perRun, [5, 5, 5]);
    assert.equal(result.metrics.broadLeaderRecall.mean, 5);
    assert.ok(
      result.metrics.stability.every((item) =>
        item.pairwiseJaccard.every((value) => value === 1),
      ),
    );
    assert.equal(result.metrics.totalCreates, 6);
    assert.equal(result.metrics.totalWebSearchCalls, 60);
    assert.equal(result.metrics.routeCompletionRate, 1);
    assert.equal(result.metrics.sourceBindingRate, 1);
    assert.equal(result.metrics.unsafeProductCount, 0);
    assert.equal(result.metrics.unsafeTransactionalFieldCount, 0);
    assert.ok(result.metrics.estimatedCostUsd > 0);
  });

  it("never calls a mechanically clean sample final without the human audits", () => {
    const result = analyzeTwoLayerQualityGate({ fixtures: fixtures() });
    assert.equal(result.decision, "needs_manual_review");
    assert.equal(result.failures.length, 0);
    assert.ok(result.pendingManualReview.length > 0);
  });

  it("does not accept a source audit that omits the two inspected source IDs", () => {
    const sample = fixtures();
    const review = manualReviewFor(sample);
    review.sourceAudits[0].sourceIds = [];
    const result = analyzeTwoLayerQualityGate({
      fixtures: sample,
      manualReview: review,
    });
    assert.equal(result.decision, "fail");
    assert.ok(
      result.failures.includes(
        "manual_source_selection_invalid:broad-shop-vac:1:broad-shop-vac-1",
      ),
    );
  });

  it("does not let an extra comparison row bypass the required quality win", () => {
    const sample = fixtures();
    const review = manualReviewFor(sample);
    review.blindComparisons = [
      { caseId: "broad-shop-vac", result: "tie" },
      { caseId: "con-robot-vac-300-selfempty", result: "tie" },
      { caseId: "unknown-extra-case", result: "win" },
    ];
    const result = analyzeTwoLayerQualityGate({
      fixtures: sample,
      manualReview: review,
    });
    assert.equal(result.decision, "fail");
    assert.ok(result.failures.includes("unknown_blind_comparison:unknown-extra-case"));
    assert.ok(result.failures.includes("no_material_quality_win"));
  });

  it("does not accept a broad Best Match with unverified market availability", () => {
    const sample = fixtures();
    sample[0].cards[0].requirementChecks[0].status = "Needs verification";
    const result = analyzeTwoLayerQualityGate({
      fixtures: sample,
      manualReview: manualReviewFor(sample),
    });
    assert.equal(result.decision, "fail");
    assert.ok(
      result.failures.includes(
        "best_match_requirement_not_pass:broad-shop-vac:1:broad-shop-vac-1:Currently available for purchase in the United States",
      ),
    );
  });

  it("fails on weak recall, unresolved constrained Best Matches, or unsafe fields", () => {
    const sample = fixtures();
    sample[0].cards = sample[0].cards.slice(0, 2);
    sample[3].cards[0].requirementChecks.at(-1).status = "Needs verification";
    sample[4].cards[0].commerce = {
      state: "verified",
      label: "Independently verified",
      priceAmount: 199,
      currency: "USD",
      seller: "Unsafe",
      productUrl: "https://unsafe.invalid/product",
      availability: "in_stock",
      observedAt: "2026-07-18T12:00:00.000Z",
    };
    sample[5].cards[0].claims[0].value = "Current price: EUR 249.99";
    sample[5].sources[0].title = "Example listing - $249.99";
    sample[5].completion.usage.outputTokens = 500_000;
    const result = analyzeTwoLayerQualityGate({
      fixtures: sample,
      manualReview: manualReviewFor(sample),
    });
    assert.equal(result.decision, "fail");
    assert.ok(result.failures.includes("run_card_count_out_of_bounds:broad-shop-vac:1"));
    assert.ok(
      result.failures.includes(
        "best_match_requirement_not_pass:con-robot-vac-300-selfempty:1:con-robot-vac-300-selfempty-1:self-emptying",
      ),
    );
    assert.ok(
      result.failures.includes(
        "unsafe_transactional_field:con-robot-vac-300-selfempty:2:con-robot-vac-300-selfempty-1",
      ),
    );
    assert.ok(
      result.failures.includes(
        "unsafe_transactional_field:con-robot-vac-300-selfempty:3:con-robot-vac-300-selfempty-1",
      ),
    );
    assert.ok(
      result.failures.includes(
        "unsafe_transactional_source_title:con-robot-vac-300-selfempty:3",
      ),
    );
    assert.ok(result.failures.includes("unsafe_transactional_field_count_exceeded"));
    assert.ok(result.failures.includes("estimated_cost_ceiling_exceeded"));
  });
});

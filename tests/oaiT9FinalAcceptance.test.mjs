import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  OAI_T9_ACCEPTANCE_CASES,
  OAI_T9_ACCEPTANCE_ENVELOPE,
  OAI_T9_AUDIT_ALLOWANCE,
  OAI_T9_SOL_PRICING,
  analyzeOaiT9Acceptance,
  buildOaiT9AcceptancePlan,
  buildOaiT9BlindPacket,
  buildOaiT9ManualReviewTemplate,
  estimateOaiT9SolCost,
} from "../scripts/oai-t9-final-acceptance.mjs";
import {
  retrieveOaiT9SelectedImages,
} from "../scripts/run-oai-t9-final-acceptance.mjs";

const MODEL = "gpt-5.6-sol";
const PROMPT_VERSION = "direct-terra-master-prompt-v3";
const COMMIT = "a".repeat(40);

const PRODUCTS = {
  "eval-broad-office-chair": [
    "Herman Miller Aeron Office Chair",
    "Steelcase Leap Office Chair",
    "Haworth Fern Office Chair",
    "Branch Ergonomic Office Chair",
    "HON Ignition Office Chair",
  ],
  "eval-con-gas-grill-600-4burner": [
    "Char-Broil Performance Four Burner Propane Gas Grill",
    "Monument Four Burner Propane Gas Grill",
    "Nexgrill Four Burner Propane Gas Grill",
    "Dyna-Glo Four Burner Propane Gas Grill",
    "Acme Four Burner Propane Gas Grill",
  ],
  "eval-con-cordless-drill-150-brushless": [
    "DEWALT Atomic Brushless Cordless Drill",
    "Ryobi ONE+ HP Brushless Cordless Drill",
    "CRAFTSMAN V20 Brushless Cordless Drill",
    "SKIL Brushless Cordless Drill",
    "Acme Brushless Cordless Drill",
  ],
  "eval-con-robot-vac-300-selfempty": [
    "Shark Matrix Self-Emptying Robot Vacuum",
    "eufy C10 Self-Emptying Robot Vacuum",
    "Roborock Q5 Self-Emptying Robot Vacuum",
    "Roomba 105 Self-Emptying Robot Vacuum",
    "Acme Self-Emptying Robot Vacuum",
  ],
};

function reportFor(testCase, products = PRODUCTS[testCase.id]) {
  return products
    .map((name, index) => {
      const rank = index + 1;
      const sourceOne = `https://manufacturer.example/${testCase.id}/${rank}`;
      const sourceTwo = `https://reviewer.example/${testCase.id}/${rank}`;
      const constraintText =
        testCase.kind === "constrained"
          ? testCase.id.includes("gas-grill")
            ? "Four burner liquid propane model. Observed price $499."
            : testCase.id.includes("cordless-drill")
              ? "Brushless model. Observed price $129."
              : "Included self-emptying dock. Observed price $279."
          : "An ergonomic office chair supported by product and review evidence.";
      return [
        `## #${rank} Best Match — ${name}`,
        constraintText,
        `Sources: [Manufacturer](${sourceOne}) and [Independent review](${sourceTwo}).`,
      ].join("\n");
    })
    .join("\n\n");
}

function slateFor(products, constrained) {
  return {
    status: "structured_v1",
    entries: [
      ...products.map((name, index) => ({
        identityKey: name.toLowerCase(),
        disposition: "ranked",
        finalRank: index + 1,
        evidenceQuality: "high",
        requirementVerdicts: [
          {
            requirementId: constrained ? "hard_requirement" : "market_us",
            verdict: "pass",
          },
        ],
      })),
      ...[1, 2, 3].map((suffix) => ({
        identityKey: `rejected candidate ${suffix}`,
        disposition: "rejected",
        finalRank: null,
        evidenceQuality: "low",
        requirementVerdicts: [
          { requirementId: "market_us", verdict: "pass" },
        ],
      })),
    ],
  };
}

function fixtureFor(testCase, run, products = PRODUCTS[testCase.id]) {
  const reportMarkdown = reportFor(testCase, products);
  const citationUrls = [
    ...reportMarkdown.matchAll(/https:\/\/[^)\s]+/g),
  ].map((match) => match[0]);
  return {
    acceptanceVersion: "oai-t9-sol-acceptance-v1",
    caseId: testCase.id,
    run,
    commit: COMMIT,
    promptVersion: PROMPT_VERSION,
    modelRequested: MODEL,
    modelReturned: MODEL,
    wallClockMs: 1_000,
    route: { status: 200, state: "completed", failureReason: null },
    counters: {
      creates: 1,
      hostedSearches: 5,
      retrieves: 3,
      safetyCancels: 0,
      serperShoppingRequests: 0,
      serperOrganicRequests: 0,
      candidatePageFetches: 0,
      selectedImageRetrievals: 0,
    },
    usage: {
      inputTokens: 10_000,
      cachedInputTokens: 0,
      outputTokens: 5_000,
      webSearchCalls: 5,
    },
    reportMarkdown,
    citationUrls,
    priceEstimates:
      testCase.kind === "constrained"
        ? products.map((_, index) => ({
            rank: index + 1,
            low: testCase.id.includes("gas-grill")
              ? 499
              : testCase.id.includes("cordless-drill")
                ? 129
                : 279,
            high: testCase.id.includes("gas-grill")
              ? 549
              : testCase.id.includes("cordless-drill")
                ? 139
                : 289,
          }))
        : [],
    productAssets: products.map((productName, index) => ({
      rank: index + 1,
      productName,
      productUrl: null,
      imageUrl: null,
    })),
    selectedImageChecks: [],
    firstLoss: {
      recommendation: {
        candidateSlate: slateFor(products, testCase.kind === "constrained"),
      },
      assets: [],
      rankedProducts: {
        accountingComplete: true,
        rankedProductCount: products.length,
      },
    },
  };
}

function completeSample() {
  return OAI_T9_ACCEPTANCE_CASES.flatMap((testCase) =>
    [1, 2, 3].map((run) => fixtureFor(testCase, run)),
  );
}

function completeManualReview(fixtures) {
  const review = buildOaiT9ManualReviewTemplate(fixtures);
  review.measurementDefect.status = "none";
  for (const row of review.recommendationAudits) {
    row.identityAndType = "pass";
    if (row.hardRequirements === "pending") row.hardRequirements = "pass";
  }
  for (const row of review.assetAudits) {
    if (row.destinationIdentity === "pending") {
      row.destinationInspected = true;
      row.destinationIdentity = "pass";
    }
    if (row.imageIdentity === "pending") row.imageIdentity = "pass";
  }
  for (const row of review.sourceAudits) {
    row.inspectedSourceUrls = row.eligibleSourceUrls.slice(0, 2);
    row.claimSupport = "pass";
  }
  for (const [index, row] of review.blindComparisons.entries()) {
    row.preferredSide = index < 2 ? "A" : "tie";
  }
  return review;
}

function blindKey() {
  return {
    schemaVersion: "oai-t9-blind-comparison-key-v1",
    commit: COMMIT,
    cases: OAI_T9_ACCEPTANCE_CASES.map((testCase) => ({
      caseId: testCase.id,
      currentSide: "A",
      baselineSide: "B",
    })),
  };
}

describe("OAI-T9 final acceptance preflight", () => {
  it("freezes exactly four cases by three runs with the complete envelope", () => {
    const plan = buildOaiT9AcceptancePlan(COMMIT);

    assert.equal(plan.commit, COMMIT);
    assert.equal(plan.model, MODEL);
    assert.equal(plan.reasoning, "high");
    assert.equal(plan.promptVersion, PROMPT_VERSION);
    assert.equal(plan.cases.length, 4);
    assert.equal(plan.cases.reduce((sum, item) => sum + item.runs, 0), 12);
    assert.deepEqual(plan.envelope, OAI_T9_ACCEPTANCE_ENVELOPE);
    assert.equal(plan.pricing.hardCeilingUsd, 22);
    assert.deepEqual(
      plan.auditAllowanceRequiredToSatisfyPlan,
      OAI_T9_AUDIT_ALLOWANCE,
    );
    assert.equal(
      Object.keys(plan.baselineReportHashes).length,
      12,
    );
  });

  it("prices the saved worst-case observation conservatively", () => {
    const usage = {
      ...OAI_T9_SOL_PRICING.observedT8dMaximum,
      cachedInputTokens: 0,
    };
    const conservative = estimateOaiT9SolCost(usage, {
      conservative: true,
    });

    assert.equal(Number(conservative.toFixed(6)), 1.633816);
    assert.equal(Number((conservative * 12).toFixed(6)), 19.605795);
    assert.ok(
      conservative * 12 < OAI_T9_SOL_PRICING.hardCeilingUsd,
    );
  });

  it("builds a blinded packet without exposing which side is current", () => {
    const fixtures = completeSample();
    const baselineReports = fixtures.map((fixture) => ({
      caseId: fixture.caseId,
      run: fixture.run,
      reportMarkdown: `${fixture.reportMarkdown}\nBaseline marker.`,
    }));
    const { packet, key } = buildOaiT9BlindPacket({
      fixtures,
      baselineReports,
      commit: COMMIT,
    });

    assert.equal(packet.cases.length, 4);
    assert.equal(key.cases.length, 4);
    assert.equal(JSON.stringify(packet).includes("currentSide"), false);
    assert.equal(JSON.stringify(packet).includes("baselineSide"), false);
  });

  it("never retrieves an audit image through a private DNS answer", async () => {
    const outputDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "oai-t9-image-audit-"),
    );
    let transportCalled = false;
    const counters = { selectedImageRetrievals: 0 };
    const globalCounters = { selectedImageRetrievals: 0 };
    try {
      const result = await retrieveOaiT9SelectedImages({
        outputDirectory,
        caseId: "eval-broad-office-chair",
        run: 1,
        productAssets: [
          {
            rank: 1,
            productName: "Example Chair",
            productUrl: null,
            imageUrl: "https://images.example.test/example.jpg",
          },
        ],
        counters,
        globalCounters,
        resolveHost: async () => ["10.0.0.2"],
        transport: async () => {
          transportCalled = true;
          throw new Error("must not run");
        },
      });

      assert.equal(transportCalled, false);
      assert.equal(result.length, 1);
      assert.equal(result[0].rank, 1);
      assert.equal(result[0].status, "failed");
      assert.equal(result[0].reason, "non_public_image_host");
      assert.match(result[0].urlHash, /^[a-f0-9]{64}$/);
      assert.equal(counters.selectedImageRetrievals, 1);
      assert.equal(globalCounters.selectedImageRetrievals, 1);
    } finally {
      await fs.rm(outputDirectory, { recursive: true, force: true });
    }
  });
});

describe("OAI-T9 terminal acceptance decisions", () => {
  it("requires the manual identity, source, asset, and blind review", () => {
    const result = analyzeOaiT9Acceptance({
      fixtures: completeSample(),
    });

    assert.equal(result.terminalDecision, "needs_manual_review");
    assert.ok(result.pendingManualReview.length > 0);
    assert.deepEqual(result.failures.route, []);
    assert.deepEqual(result.failures.recommendation, []);
  });

  it("passes only when every automated and human gate passes", () => {
    const fixtures = completeSample();
    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview: completeManualReview(fixtures),
      blindKey: blindKey(),
    });

    assert.equal(
      result.terminalDecision,
      "all_gates_pass_promotion_eligible_separate_approval",
    );
    assert.deepEqual(result.pendingManualReview, []);
    assert.deepEqual(result.failures, {
      measurement: [],
      route: [],
      recommendation: [],
      evidence: [],
      assetSafety: [],
    });
  });

  it("allows disclosed uncertainty below a constrained Best Match", () => {
    const fixtures = completeSample();
    const fixture = fixtures.find(
      (item) =>
        item.caseId === "eval-con-robot-vac-300-selfempty" && item.run === 1,
    );
    fixture.firstLoss.recommendation.candidateSlate.entries
      .find((entry) => entry.finalRank === 2)
      .requirementVerdicts[0].verdict = "needs_verification";
    const review = completeManualReview(fixtures);
    review.recommendationAudits.find(
      (row) =>
        row.caseId === "eval-con-robot-vac-300-selfempty" &&
        row.run === 1 &&
        row.rank === 2,
    ).hardRequirements = "needs_verification";

    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview: review,
      blindKey: blindKey(),
    });

    assert.equal(
      result.terminalDecision,
      "all_gates_pass_promotion_eligible_separate_approval",
    );
  });

  it("rejects a bad within-case pair even when other runs are stable", () => {
    const fixtures = completeSample();
    const testCase = OAI_T9_ACCEPTANCE_CASES[0];
    const replacement = [
      "Alpha Work Chair",
      "Beta Work Chair",
      "Gamma Work Chair",
      "Delta Work Chair",
      "Epsilon Work Chair",
    ];
    fixtures[2] = fixtureFor(testCase, 3, replacement);
    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview: completeManualReview(fixtures),
      blindKey: blindKey(),
    });

    assert.equal(result.terminalDecision, "single_call_architecture_no_go");
    assert.ok(
      result.failures.recommendation.includes(
        "stability_failed:eval-broad-office-chair",
      ),
    );
  });

  it("isolates an asset-only safety failure from recommendation quality", () => {
    const fixtures = completeSample();
    fixtures[0].productAssets[0].productUrl =
      "https://retailer.example/wrong-sibling";
    const review = completeManualReview(fixtures);
    review.assetAudits[0].destinationIdentity = "fail";
    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview: review,
      blindKey: blindKey(),
    });

    assert.equal(
      result.terminalDecision,
      "asset_safety_only_disable_assets_keep_recommendations",
    );
    assert.deepEqual(result.failures.recommendation, []);
    assert.deepEqual(result.failures.evidence, []);
    assert.deepEqual(result.failures.assetSafety, [
      "wrong_destination:eval-broad-office-chair:1:rank-1",
    ]);
  });

  it("invalidates the sample when the human audit finds a measurement defect", () => {
    const fixtures = completeSample();
    const review = completeManualReview(fixtures);
    review.measurementDefect.status = "invalid";
    review.measurementDefect.reason = "The blind packet revealed the answer.";
    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview: review,
      blindKey: blindKey(),
    });

    assert.equal(
      result.terminalDecision,
      "invalid_sample_stop_for_architecture_decision",
    );
    assert.deepEqual(result.failures.measurement, [
      "human_declared_measurement_defect",
    ]);
  });
});

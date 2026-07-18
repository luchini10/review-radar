import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTwoLayerManualReviewTemplate,
  TWO_LAYER_GATE_LIVE_APPROVAL_ID,
  TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT,
  TWO_LAYER_GATE_POLL_INTERVAL_MS,
  twoLayerGatePreflightPlan,
  validateTwoLayerGateProcessEnvironment,
} from "../scripts/run-two-layer-quality-gate.mjs";

describe("OAI-T5A one-request-at-a-time live gate harness", () => {
  it("is preflight-only by default and freezes all six approved runs", () => {
    const plan = twoLayerGatePreflightPlan("a".repeat(40));
    assert.equal(plan.status, "preflight_only_no_provider_calls");
    assert.equal(plan.approvalId, TWO_LAYER_GATE_LIVE_APPROVAL_ID);
    assert.equal(plan.commit, "a".repeat(40));
    assert.deepEqual(
      plan.cases.map((item) => [item.caseId, item.run]),
      [
        ["broad-shop-vac", 1],
        ["broad-shop-vac", 2],
        ["broad-shop-vac", 3],
        ["con-robot-vac-300-selfempty", 1],
        ["con-robot-vac-300-selfempty", 2],
        ["con-robot-vac-300-selfempty", 3],
      ],
    );
  });

  it("caps every invocation at one create, bounded polling, and one cancel", () => {
    const plan = twoLayerGatePreflightPlan();
    assert.deepEqual(plan.perAttemptCeilings, {
      creates: 1,
      retrieves: TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT,
      cancels: 1,
      pollIntervalMs: TWO_LAYER_GATE_POLL_INTERVAL_MS,
    });
    assert.equal(plan.planning.responsesCreates, 6);
    assert.equal(plan.planning.maximumHostedSearchCalls, 120);
    assert.equal(plan.planning.retries, 0);
    assert.equal(plan.planning.replacements, 0);
  });

  it("generates traceable product, two-source, and blind-review rows", () => {
    const template = buildTwoLayerManualReviewTemplate([
      {
        caseId: "broad-shop-vac",
        run: 1,
        cards: [
          {
            key: "example",
            identity: { brand: "Example", product_name: "Vac", model: "V1" },
            recommendationStatus: "Best Match",
            assessment: {
              why: { sourceIds: ["s1"] },
              bestFor: { sourceIds: ["s2"] },
              mainTradeoff: { sourceIds: [] },
            },
            pros: [],
            cons: [],
            requirementChecks: [],
            claims: [],
          },
        ],
      },
    ]);
    assert.equal(template.productAudits[0].eligibility, "pending");
    assert.deepEqual(template.sourceAudits[0].sourceIds, ["s1", "s2"]);
    assert.equal(template.sourceAudits[0].status, "pending");
    assert.deepEqual(
      template.blindComparisons.map((item) => item.caseId),
      ["broad-shop-vac", "con-robot-vac-300-selfempty"],
    );
  });

  it("rejects missing or undersized process-only secrets before live use", () => {
    assert.throws(
      () => validateTwoLayerGateProcessEnvironment({}),
      /Set process-only OPENAI_API_KEY/,
    );
    assert.throws(
      () =>
        validateTwoLayerGateProcessEnvironment({
          OPENAI_API_KEY: "test-key",
          REVIEW_RADAR_JOB_TOKEN_SECRET: "too-short",
        }),
      /at least 32 UTF-8 bytes/,
    );
    assert.deepEqual(
      validateTwoLayerGateProcessEnvironment({
        OPENAI_API_KEY: "  test-key  ",
        REVIEW_RADAR_JOB_TOKEN_SECRET: "s".repeat(32),
      }),
      {
        apiKey: "test-key",
        jobTokenSecret: "s".repeat(32),
      },
    );
  });
});

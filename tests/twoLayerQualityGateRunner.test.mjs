import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTwoLayerLifecycleSmokeFixture,
  buildTwoLayerManualReviewTemplate,
  TWO_LAYER_GATE_LIVE_APPROVAL_ID,
  TWO_LAYER_GATE_LIVE_EXECUTION_AVAILABLE,
  TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT,
  TWO_LAYER_GATE_POLL_INTERVAL_MS,
  TWO_LAYER_SMOKE_LIVE_APPROVAL_ID,
  TWO_LAYER_SMOKE_LIVE_EXECUTION_AVAILABLE,
  TWO_LAYER_SMOKE_PLANNING,
  twoLayerGatePreflightPlan,
  twoLayerLifecycleSmokePreflightPlan,
  validateTwoLayerGateProcessEnvironment,
} from "../scripts/run-two-layer-quality-gate.mjs";

describe("OAI-T5A one-request-at-a-time live gate harness", () => {
  it("retires the spent T5B approval while retaining its frozen record", () => {
    const plan = twoLayerGatePreflightPlan("a".repeat(40));
    assert.equal(plan.status, "retired_after_t5b_stop_no_provider_calls");
    assert.equal(plan.liveExecutionAvailable, false);
    assert.equal(TWO_LAYER_GATE_LIVE_EXECUTION_AVAILABLE, false);
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

  it("freezes one new structured-output smoke without reviving T5B", () => {
    const plan = twoLayerLifecycleSmokePreflightPlan("b".repeat(40));
    assert.equal(plan.status, "awaiting_exact_approval_no_provider_calls");
    assert.equal(plan.liveExecutionAvailable, true);
    assert.equal(TWO_LAYER_SMOKE_LIVE_EXECUTION_AVAILABLE, true);
    assert.equal(plan.approvalId, TWO_LAYER_SMOKE_LIVE_APPROVAL_ID);
    assert.equal(plan.commit, "b".repeat(40));
    assert.deepEqual(
      plan.cases.map((item) => [item.caseId, item.run, item.request]),
      [["broad-shop-vac", 1, { query: "shop vac" }]],
    );
    assert.equal(TWO_LAYER_GATE_LIVE_EXECUTION_AVAILABLE, false);
    assert.notEqual(
      TWO_LAYER_SMOKE_LIVE_APPROVAL_ID,
      TWO_LAYER_GATE_LIVE_APPROVAL_ID,
    );
  });

  it("caps the smoke at one response and twenty hosted searches", () => {
    const plan = twoLayerLifecycleSmokePreflightPlan();
    assert.deepEqual(plan.perAttemptCeilings, {
      creates: 1,
      retrieves: TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT,
      cancels: 1,
      hostedSearchCalls: 20,
      pollIntervalMs: TWO_LAYER_GATE_POLL_INTERVAL_MS,
    });
    assert.deepEqual(TWO_LAYER_SMOKE_PLANNING, {
      model: "gpt-5.6-terra",
      reasoning: "high",
      responsesCreates: 1,
      maximumHostedSearchCalls: 20,
      retries: 0,
      replacements: 0,
      serperCalls: 0,
      searchApiCalls: 0,
      directSourcePageOpens: 0,
      proposedHardCeilingUsd: 7,
    });
  });

  it("persists only the bounded smoke evidence contract", () => {
    const fixture = buildTwoLayerLifecycleSmokeFixture({
      item: { caseId: "broad-shop-vac", run: 1 },
      commit: "c".repeat(40),
      wallClockMs: 1234,
      completion: {
        modelRequested: "gpt-5.6-terra",
        modelReturned: "gpt-5.6-terra",
        durationMs: 1200,
        sourceCount: 2,
        usage: { webSearchCalls: 2, totalTokens: 100 },
      },
      structure: {
        contractVersion: "oai-two-layer-structured-output-v1",
        recommendationCount: 1,
      },
      cards: [{ key: "safe-card" }],
      sources: [{ id: "s1", title: "Source", url: "https://example.com" }],
      providerId: "resp_must_not_persist",
      rawOutput: "must not persist",
      jobToken: "must not persist",
    });
    assert.equal(fixture.route.status, 200);
    assert.equal(fixture.route.state, "completed");
    assert.equal(fixture.smokeVersion, "oai-t5d-structured-lifecycle-smoke-v1");
    const serialized = JSON.stringify(fixture);
    assert.doesNotMatch(serialized, /resp_must_not_persist/);
    assert.doesNotMatch(serialized, /must not persist/);
    assert.doesNotMatch(serialized, /jobToken|providerId|rawOutput/);
  });
});

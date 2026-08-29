import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  estimatePhaseDCost,
  OAI_T10_PHASE_D_CASE,
  OAI_T10_PHASE_D_CEILINGS,
  phaseDPlan,
  validatePhaseDCreateRequest,
  validatePhaseDLiveApproval,
} from "../scripts/oai-t10-phase-d.mjs";

const commit = "f".repeat(40);
const approvalArgs = [
  `--approved-commit=${commit}`,
  "--approved-openai-creates=2",
  "--approved-hosted-searches=10",
  "--approved-openai-retrieves=60",
  "--approved-safety-cancels=1",
  "--approved-serper-shopping-attempts=15",
  "--approved-source-page-fetches=30",
  "--approved-source-page-http-attempts=90",
  "--approved-dollar-ceiling=3",
];

describe("OAI-T10 Phase D live-feasibility harness", () => {
  it("freezes one broad case and the complete network envelope", () => {
    const plan = phaseDPlan(commit);
    assert.deepEqual(OAI_T10_PHASE_D_CASE.shopperRequest, {
      query: "shop vac",
    });
    assert.deepEqual(plan.ceilings, OAI_T10_PHASE_D_CEILINGS);
    assert.equal(plan.model, "gpt-5.6-terra");
    assert.equal(plan.researchReasoning, "high");
    assert.equal(plan.presentationReasoning, "medium");
    assert.equal(plan.networkPolicy.retries, false);
    assert.equal(plan.networkPolicy.replacements, false);
    assert.equal(plan.networkPolicy.fallbacks, false);
    assert.equal(plan.networkPolicy.serperOrganic, false);
    assert.equal(plan.networkPolicy.searchApi, false);
    assert.equal(plan.networkPolicy.additionalCases, false);
    assert.equal(plan.networkPolicy.deployment, false);
    assert.equal(plan.schemaVersion, "oai-t10-phase-d-plan-v2");
    assert.deepEqual(Object.keys(plan.pricing), [
      "approvalEnvelope",
      "currentEstimate",
    ]);
    assert.equal(plan.pricing.approvalEnvelope.asOf, "2026-07-25");
    assert.equal(
      plan.pricing.approvalEnvelope.purpose,
      "frozen_approval_envelope",
    );
    assert.equal(plan.pricing.currentEstimate.asOf, "2026-08-29");
    assert.equal(plan.pricing.currentEstimate.purpose, "dated_current_estimate");
    assert.equal(
      plan.pricing.currentEstimate.billingMode,
      "standard_non_regional",
    );
    assert.deepEqual(plan.pricing.currentEstimate.shortContext, {
      inputPerMillionUsd: 2,
      cachedInputPerMillionUsd: 0.2,
      outputPerMillionUsd: 12,
    });
  });

  it("defaults the executable runner to a zero-network dry run", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/run-oai-t10-phase-d.mjs"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const plan = JSON.parse(output);
    assert.equal(plan.mode, "dry-run");
    assert.equal(plan.case.id, "broad-shop-vac");
    assert.equal(plan.ceilings.openAiCreates, 2);
    assert.equal(plan.ceilings.sourcePageHttpAttempts, 90);
  });

  it("allows only the frozen research and no-web presentation creates", () => {
    assert.doesNotThrow(() =>
      validatePhaseDCreateRequest(
        {
          model: "gpt-5.6-terra",
          background: true,
          reasoning: { effort: "high" },
          max_tool_calls: 10,
          tools: [{ type: "web_search" }],
        },
        1,
      ),
    );
    assert.doesNotThrow(() =>
      validatePhaseDCreateRequest(
        {
          model: "gpt-5.6-terra",
          background: false,
          reasoning: { effort: "medium" },
        },
        2,
      ),
    );
    for (const [body, number] of [
      [
        {
          model: "gpt-5.6-terra",
          background: true,
          reasoning: { effort: "medium" },
          max_tool_calls: 10,
        },
        1,
      ],
      [
        {
          model: "gpt-5.6-terra",
          background: false,
          reasoning: { effort: "medium" },
          tools: [{ type: "web_search" }],
        },
        2,
      ],
      [{ model: "gpt-5.6-terra" }, 3],
    ]) {
      assert.throws(() => validatePhaseDCreateRequest(body, number));
    }
  });

  it("requires the exact commit, every ceiling, clean tracked state, and process keys", () => {
    assert.equal(
      validatePhaseDLiveApproval({
        args: approvalArgs,
        commit,
        trackedChanges: [],
        outputExists: false,
        environment: {
          OPENAI_API_KEY: "present",
          SERPER_API_KEY: "present",
        },
      }).hardCeilingUsd,
      3,
    );

    for (const change of [
      { args: approvalArgs.slice(1) },
      {
        args: approvalArgs.map((value) =>
          value.startsWith("--approved-source-page-fetches=")
            ? "--approved-source-page-fetches=31"
            : value,
        ),
      },
      { trackedChanges: [" M lib/example.ts"] },
      { outputExists: true },
      { environment: { OPENAI_API_KEY: "", SERPER_API_KEY: "present" } },
      { environment: { OPENAI_API_KEY: "present", SERPER_API_KEY: "" } },
    ]) {
      assert.throws(() =>
        validatePhaseDLiveApproval({
          args: approvalArgs,
          commit,
          trackedChanges: [],
          outputExists: false,
          environment: {
            OPENAI_API_KEY: "present",
            SERPER_API_KEY: "present",
          },
          ...change,
        }),
      );
    }
  });

  it("prices research and presentation separately with a conservative cache-write view", () => {
    const cost = estimatePhaseDCost([
      {
        stage: "research_poll",
        outcome: "completed",
        ledger: {
          usage: {
            inputTokens: 10_000,
            cachedInputTokens: 2_000,
            outputTokens: 4_000,
            webSearchCalls: 7,
          },
        },
      },
      {
        stage: "presentation",
        outcome: "completed",
        ledger: {
          usage: {
            inputTokens: 20_000,
            cachedInputTokens: 0,
            outputTokens: 2_000,
            webSearchCalls: 0,
          },
        },
      },
      {
        stage: "research_start",
        outcome: "pending",
        ledger: { usage: { inputTokens: 999_999 } },
      },
    ]);
    assert.equal(cost.completedLedgerCount, 2);
    assert.equal(cost.accountedLedgerCount, 2);
    assert.equal(cost.duplicateTerminalLedgerCount, 0);
    assert.deepEqual(cost.usage, {
      inputTokens: 30_000,
      cachedInputTokens: 2_000,
      outputTokens: 6_000,
      webSearchCalls: 7,
    });
    assert.equal("standardUsd" in cost, false);
    assert.equal("conservativeUsd" in cost, false);
    assert.ok(cost.approvalEnvelopeUsd > 0);
    assert.ok(
      cost.approvalEnvelopeConservativeUsd >= cost.approvalEnvelopeUsd,
    );
    assert.ok(cost.currentEstimateUsd < cost.approvalEnvelopeUsd);
    assert.ok(
      cost.approvalEnvelopeConservativeUsd <
        OAI_T10_PHASE_D_CEILINGS.hardCeilingUsd,
    );
    assert.deepEqual(cost.pricingBasis, {
      approvalEnvelopeAsOf: "2026-07-25",
      currentEstimateAsOf: "2026-08-29",
    });
  });

  it("prices terminal provider usage even when local research validation fails", () => {
    const cost = estimatePhaseDCost([
      {
        stage: "research_start",
        outcome: "pending",
        ledger: {
          operation: "research_start",
          usage: { inputTokens: 999_999 },
        },
      },
      {
        stage: "research_poll",
        outcome: "failed",
        validationReason: "research_candidate_duplicate",
        ledger: {
          operation: "research_poll",
          failureReason: "invalid_research_contract",
          usage: {
            inputTokens: 21_932,
            cachedInputTokens: 0,
            outputTokens: 5_318,
            webSearchCalls: 2,
          },
        },
      },
    ]);

    assert.equal(cost.accountedLedgerCount, 1);
    assert.equal(cost.completedLedgerCount, 0);
    assert.equal(cost.duplicateTerminalLedgerCount, 0);
    assert.deepEqual(cost.usage, {
      inputTokens: 21_932,
      cachedInputTokens: 0,
      outputTokens: 5_318,
      webSearchCalls: 2,
    });
    assert.equal(cost.approvalEnvelopeUsd, 0.1546);
    assert.equal(cost.approvalEnvelopeConservativeUsd, 0.168307);
    assert.equal(cost.currentEstimateUsd, 0.12768);
  });

  it("uses explicit short/long-context, cache, and web-search rate cards", () => {
    const cost = estimatePhaseDCost([
      {
        stage: "research_poll",
        outcome: "completed",
        ledger: {
          operation: "research_poll",
          usage: {
            inputTokens: 300_000,
            cachedInputTokens: 100_000,
            outputTokens: 1_000,
            webSearchCalls: 1,
          },
        },
      },
    ]);

    assert.equal(cost.approvalEnvelopeUsd, 1.0825);
    assert.equal(cost.approvalEnvelopeConservativeUsd, 1.9075);
    assert.equal(cost.currentEstimateUsd, 0.868);
  });

  it("gates only on the frozen approval envelope and versions new evidence", () => {
    const runner = fs.readFileSync("scripts/run-oai-t10-phase-d.mjs", "utf8");
    assert.match(runner, /approvalEnvelopeConservativeUsd/);
    assert.doesNotMatch(runner, /cost\.conservativeUsd/);
    assert.match(runner, /oai-t10-phase-d-sanitized-v2/);
  });

  it("deduplicates only repeated terminal diagnostics for the same response", () => {
    const cost = estimatePhaseDCost([
      {
        stage: "research_poll",
        outcome: "completed",
        ledger: {
          operation: "research_poll",
          responseIdHash: "same-safe-response-hash",
          usage: {
            inputTokens: 100,
            cachedInputTokens: 20,
            outputTokens: 30,
            webSearchCalls: 1,
          },
        },
      },
      {
        stage: "research_poll",
        outcome: "failed",
        ledger: {
          operation: "research_poll",
          responseIdHash: "same-safe-response-hash",
          usage: {
            inputTokens: 120,
            cachedInputTokens: 10,
            outputTokens: 25,
            webSearchCalls: 1,
          },
        },
      },
    ]);

    assert.equal(cost.accountedLedgerCount, 1);
    assert.equal(cost.completedLedgerCount, 0);
    assert.equal(cost.duplicateTerminalLedgerCount, 1);
    assert.deepEqual(cost.usage, {
      inputTokens: 120,
      cachedInputTokens: 20,
      outputTokens: 30,
      webSearchCalls: 1,
    });
  });

  it("sums distinct or unidentifiable terminal responses conservatively", () => {
    const cost = estimatePhaseDCost([
      {
        stage: "research_poll",
        outcome: "completed",
        ledger: {
          operation: "research_poll",
          responseIdHash: "first-safe-response-hash",
          usage: {
            inputTokens: 100,
            cachedInputTokens: 20,
            outputTokens: 30,
            webSearchCalls: 1,
          },
        },
      },
      {
        stage: "research_poll",
        outcome: "failed",
        ledger: {
          operation: "research_poll",
          responseIdHash: "second-safe-response-hash",
          usage: {
            inputTokens: 120,
            cachedInputTokens: 10,
            outputTokens: 25,
            webSearchCalls: 2,
          },
        },
      },
      {
        stage: "research_poll",
        outcome: "failed",
        ledger: {
          operation: "research_poll",
          responseIdHash: null,
          usage: {
            inputTokens: 40,
            cachedInputTokens: 5,
            outputTokens: 10,
            webSearchCalls: 1,
          },
        },
      },
    ]);

    assert.equal(cost.accountedLedgerCount, 3);
    assert.equal(cost.completedLedgerCount, 1);
    assert.equal(cost.duplicateTerminalLedgerCount, 2);
    assert.deepEqual(cost.usage, {
      inputTokens: 260,
      cachedInputTokens: 35,
      outputTokens: 65,
      webSearchCalls: 4,
    });
  });
});

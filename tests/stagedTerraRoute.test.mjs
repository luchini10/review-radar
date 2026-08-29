import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRecommendationRouteHandlers } from "../app/api/recommendations/route.ts";
import {
  STAGED_TERRA_CLIENT_REQUEST_HEADER,
  STAGED_TERRA_JOB_TOKEN_HEADER,
} from "../lib/stagedTerraApiContract.ts";
import { createStagedTerraRecommendationHandlers } from "../lib/stagedTerraRecommendationRoute.ts";

const secret = "s".repeat(32);
const shopper = { query: "cordless vacuum", budget: "under $500" };

function request(method, body, headers = {}) {
  return new Request("http://localhost/api/recommendations", {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function researchOutput() {
  return {
    schemaVersion: "staged-terra-research-v1",
    candidates: Array.from({ length: 8 }, (_, index) => ({
      candidateId: `candidate_${index + 1}`,
      productName: `Example V${index + 1}00 cordless vacuum`,
      brand: "Example",
      model: `V${index + 1}00`,
      productType: "cordless vacuum",
      sourceUrls: [`https://store.example/v${index + 1}00`],
      requirementLeads: [],
      factLeads: [],
    })),
  };
}

describe("OAI-T10 staged Terra route", () => {
  it("runs start, poll, deterministic verification, and independent presentation without exposing ids or diagnostics", async () => {
    const diagnostics = [];
    let collectionCalls = 0;
    let presentationCalls = 0;
    const research = researchOutput();
    const evidencePackage = {
      schemaVersion: "staged-terra-evidence-v1",
      requestFingerprint: "f".repeat(64),
      requirements: [],
      evidence: [],
      candidates: [
        {
          candidateId: "candidate_1",
          productName: "Example V100 cordless vacuum",
          brand: "Example",
          model: "V100",
          productType: "cordless vacuum",
          eligibility: "eligible",
          exclusionReason: null,
          requirementVerdicts: [],
          facts: [],
          assets: {
            productUrl: null,
            productUrlEvidenceId: null,
            imageUrl: null,
            imageUrlEvidenceId: null,
          },
        },
      ],
    };
    const handlers = createStagedTerraRecommendationHandlers({
      validateRequest: (body) => ({ data: body }),
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => ({ responses: {} }),
      now: () => 10_000,
      startResearch: async () => ({
        ok: true,
        responseId: "resp_research123",
        status: "queued",
        requestFingerprint: (
          await import("../lib/stagedTerraContract.ts")
        ).buildStagedTerraRequestFingerprint(shopper),
        promptVersion: "staged-terra-research-prompt-v1",
        ledger: {
          operation: "research_start",
          responseIdHash: "hash-only",
        },
      }),
      pollResearch: async () => ({
        ok: true,
        state: "completed",
        researchOutput: research,
        ledger: {
          operation: "research_poll",
          responseIdHash: "hash-only",
        },
      }),
      collectVerificationInputs: async () => {
        collectionCalls += 1;
        return {
          candidates: [],
          diagnostics: {
            candidateCount: 8,
            sourceFetchAttempts: 8,
            successfulSourceFetches: 4,
            commerceRequests: 0,
            commerceRows: 0,
          },
        };
      },
      materializeEvidence: () => ({
        evidencePackage,
        diagnostics: { candidates: [] },
      }),
      runPresentation: async () => {
        presentationCalls += 1;
        return {
          ok: true,
          presentation: {
            schemaVersion: "staged-terra-presentation-v1",
            rankedProducts: [],
            closeMatchCandidateIds: [],
            finalAdvice: [],
          },
          ledger: {
            operation: "presentation",
            responseIdHash: "presentation-hash-only",
          },
        };
      },
      renderPresentation: () => ({
        cards: [],
        sources: [],
        finalAdvice: ["Verified advice"],
      }),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    const started = await handlers.POST(request("POST", shopper));
    assert.equal(started.status, 202);
    const pending = await started.json();
    assert.equal(pending.pipeline, "staged_terra");
    assert.equal(JSON.stringify(pending).includes("resp_research123"), false);

    const completed = await handlers.GET(
      request("GET", undefined, {
        [STAGED_TERRA_JOB_TOKEN_HEADER]: pending.jobToken,
      }),
    );
    assert.equal(completed.status, 200);
    const body = await completed.json();
    assert.deepEqual(body.finalAdvice, ["Verified advice"]);
    assert.equal("diagnostics" in body, false);
    assert.equal("evidencePackage" in body, false);
    assert.equal(JSON.stringify(diagnostics).includes("resp_research123"), false);

    const repeated = await handlers.GET(
      request("GET", undefined, {
        [STAGED_TERRA_JOB_TOKEN_HEADER]: pending.jobToken,
      }),
    );
    assert.equal(repeated.status, 200);
    assert.deepEqual((await repeated.json()).finalAdvice, ["Verified advice"]);
    assert.equal(collectionCalls, 1);
    assert.equal(presentationCalls, 1);
  });

  it("keeps legacy routing byte-equivalent unless both staged flags select it", async () => {
    const calls = [];
    const legacy = async () => {
      calls.push("legacy");
      return Response.json({ result: { exactMatches: [] } });
    };
    const staged = {
      POST: async () => {
        calls.push("staged");
        return Response.json({ pipeline: "staged" });
      },
      GET: async () => Response.json({}),
      DELETE: async () => Response.json({}),
    };

    const off = createRecommendationRouteHandlers({
      getStagedTerraEnabled: () => false,
      legacyPost: legacy,
      stagedTerraHandlers: staged,
    });
    await off.POST(
      request("POST", shopper, { [STAGED_TERRA_CLIENT_REQUEST_HEADER]: "1" }),
    );
    assert.deepEqual(calls, ["legacy"]);

    const on = createRecommendationRouteHandlers({
      getStagedTerraEnabled: () => true,
      legacyPost: legacy,
      stagedTerraHandlers: staged,
    });
    await on.POST(
      request("POST", shopper, { [STAGED_TERRA_CLIENT_REQUEST_HEADER]: "1" }),
    );
    assert.deepEqual(calls, ["legacy", "staged"]);
  });

  it("rejects a job-token payload that cannot fit before starting paid research", async () => {
    let starts = 0;
    const oversized = {
      ...shopper,
      selectedFeatures: Array.from({ length: 12 }, (_, index) => ({
        id: `feature-${index}-${"i".repeat(80)}`,
        name: "n".repeat(200),
        type: "text",
        operator: "equals",
        value: "v".repeat(500),
        unit: "u".repeat(50),
        required: true,
        source: "smart_features",
      })),
    };
    const handlers = createStagedTerraRecommendationHandlers({
      validateRequest: (body) => ({ data: body }),
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      startResearch: async () => {
        starts += 1;
        throw new Error("must not start");
      },
    });

    const response = await handlers.POST(request("POST", oversized));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_request");
    assert.equal(starts, 0);
  });

  it("retains only a bounded research validation reason on a failed poll", async () => {
    const fingerprint = (
      await import("../lib/stagedTerraContract.ts")
    ).buildStagedTerraRequestFingerprint(shopper);

    for (const testCase of [
      {
        validationReason: "research_candidate_duplicate",
        expectedReason: "research_candidate_duplicate",
      },
      {
        validationReason: "unbounded_private_reason",
        expectedReason: undefined,
      },
    ]) {
      const diagnostics = [];
      const handlers = createStagedTerraRecommendationHandlers({
        validateRequest: (body) => ({ data: body }),
        getEnvironment: () => ({
          openAiApiKey: "test-key",
          jobTokenSecret: secret,
          enabled: true,
        }),
        createOpenAIClient: async () => ({ responses: {} }),
        startResearch: async () => ({
          ok: true,
          responseId: "resp_research123",
          status: "queued",
          requestFingerprint: fingerprint,
          promptVersion: "staged-terra-research-prompt-v1",
          ledger: { operation: "research_start" },
        }),
        pollResearch: async () => ({
          ok: false,
          validationReason: testCase.validationReason,
          rawOutput: "private raw model output",
          providerResponseId: "resp_private-provider-id",
          sourceUrl: "https://private.example/product",
          prompt: "private prompt canary",
          secret: "private secret canary",
          ledger: {
            operation: "research_poll",
            responseIdHash: "hash-only",
            failureReason: "invalid_research_contract",
            usage: {
              inputTokens: 21_932,
              cachedInputTokens: 0,
              outputTokens: 5_318,
              totalTokens: 27_250,
              webSearchCalls: 2,
            },
          },
        }),
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      });

      const started = await handlers.POST(request("POST", shopper));
      const pending = await started.json();
      const failed = await handlers.GET(
        request("GET", undefined, {
          [STAGED_TERRA_JOB_TOKEN_HEADER]: pending.jobToken,
        }),
      );
      assert.equal(failed.status, 502);
      const publicBody = await failed.json();
      const failedPoll = diagnostics.find(
        (diagnostic) =>
          diagnostic.stage === "research_poll" &&
          diagnostic.outcome === "failed",
      );
      assert.equal(failedPoll?.validationReason, testCase.expectedReason);
      assert.equal(
        JSON.stringify(publicBody).includes(testCase.validationReason),
        false,
      );
      const serializedDiagnostics = JSON.stringify(diagnostics);
      for (const privateValue of [
        "private raw model output",
        "resp_private-provider-id",
        "https://private.example/product",
        "private prompt canary",
        "private secret canary",
        "unbounded_private_reason",
      ]) {
        assert.equal(serializedDiagnostics.includes(privateValue), false);
      }
    }
  });

  it("sanitizes a completion-stage exception instead of rejecting the route promise", async () => {
    const fingerprint = (
      await import("../lib/stagedTerraContract.ts")
    ).buildStagedTerraRequestFingerprint(shopper);
    const handlers = createStagedTerraRecommendationHandlers({
      validateRequest: (body) => ({ data: body }),
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => ({ responses: {} }),
      startResearch: async () => ({
        ok: true,
        responseId: "resp_research123",
        status: "queued",
        requestFingerprint: fingerprint,
        promptVersion: "staged-terra-research-prompt-v1",
        ledger: { operation: "research_start" },
      }),
      pollResearch: async () => ({
        ok: true,
        state: "completed",
        researchOutput: researchOutput(),
        ledger: { operation: "research_poll" },
      }),
      collectVerificationInputs: async () => {
        throw new Error("private source failure");
      },
    });

    const started = await handlers.POST(request("POST", shopper));
    const pending = await started.json();
    const completed = await handlers.GET(
      request("GET", undefined, {
        [STAGED_TERRA_JOB_TOKEN_HEADER]: pending.jobToken,
      }),
    );
    assert.equal(completed.status, 502);
    const body = await completed.json();
    assert.equal(body.code, "verification_failed");
    assert.equal(JSON.stringify(body).includes("private source failure"), false);
  });
});

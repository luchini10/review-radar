import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDirectTerraRecommendationHandlers } from "../lib/directTerraRecommendationRoute.ts";
import {
  DIRECT_TERRA_JOB_TOKEN_HEADER,
  isDirectTerraCompletedResponse,
  isDirectTerraPendingResponse,
} from "../lib/directTerraApiContract.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";

const secret = "test-only-direct-terra-secret-32-bytes";
const nowMs = 1_789_000_000_000;
const exactReport = "# Ranked products\n\n## #1 Best Match — Model A\n\nExact explanation [Source](https://example.com/a).";

function request(method, body, token) {
  return new Request("http://localhost/api/recommendations-v2", {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { [DIRECT_TERRA_JOB_TOKEN_HEADER]: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("clean direct Terra V2 route", () => {
  it("starts, polls, and returns the untouched report with unverified commerce", async () => {
    const handlers = createDirectTerraRecommendationHandlers({
      createOpenAIClient: async () => ({ responses: {} }),
      getEnvironment: () => ({ openAiApiKey: "test-key", jobTokenSecret: secret }),
      now: () => nowMs,
      startResearch: async () => ({
        ok: true,
        responseId: "resp_direct_123456789",
        status: "in_progress",
        promptVersion: DIRECT_TERRA_PROMPT_VERSION,
        promptHash: "a".repeat(64),
        ledger: {},
      }),
      pollResearch: async () => ({
        ok: true,
        state: "completed",
        status: "completed",
        reportMarkdown: exactReport,
        citationUrls: ["https://example.com/a"],
        sourceHosts: ["example.com"],
        disabledCitationCount: 1,
        ledger: {},
      }),
    });

    const started = await handlers.POST(
      request("POST", {
        query: "refrigerator",
        budget: "under $2,000",
        priorities: "quiet and reliable",
      }),
    );
    const pending = await started.json();
    assert.equal(started.status, 202);
    assert.equal(isDirectTerraPendingResponse(pending), true);

    const completedResponse = await handlers.GET(
      request("GET", null, pending.jobToken),
    );
    const completed = await completedResponse.json();
    assert.equal(completedResponse.status, 200);
    assert.equal(isDirectTerraCompletedResponse(completed), true);
    assert.equal(completed.reportMarkdown, exactReport);
    assert.equal(completed.transactionalStatus, "unverified");
    assert.deepEqual(completed.citationUrls, ["https://example.com/a"]);
    assert.equal(completed.disabledCitationCount, 1);
  });

  it("rejects malformed shopper input before creating a provider request", async () => {
    let starts = 0;
    const handlers = createDirectTerraRecommendationHandlers({
      createOpenAIClient: async () => ({ responses: {} }),
      getEnvironment: () => ({ openAiApiKey: "test-key", jobTokenSecret: secret }),
      startResearch: async () => {
        starts += 1;
        throw new Error("should not run");
      },
    });

    const response = await handlers.POST(request("POST", { query: "" }));
    assert.equal(response.status, 400);
    assert.equal(starts, 0);
  });

  it("fails closed when the server-side V2 flag is off", async () => {
    const handlers = createDirectTerraRecommendationHandlers({
      getEnvironment: () => ({
        enabled: false,
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
      }),
    });

    const response = await handlers.POST(
      request("POST", { query: "refrigerator" }),
    );

    assert.equal(response.status, 500);
  });

  it("rejects malformed disabled-citation counters at the client contract", () => {
    const response = {
      pipeline: "direct_terra",
      version: "direct-terra-api-v1",
      state: "completed",
      reportMarkdown: exactReport,
      citationUrls: ["https://example.com/a"],
      sourceHosts: ["example.com"],
      transactionalStatus: "unverified",
    };

    assert.equal(isDirectTerraCompletedResponse(response), true);
    assert.equal(
      isDirectTerraCompletedResponse({ ...response, disabledCitationCount: -1 }),
      false,
    );
    assert.equal(
      isDirectTerraCompletedResponse({ ...response, disabledCitationCount: 1 }),
      true,
    );
  });
});

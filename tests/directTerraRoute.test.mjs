import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDirectTerraRecommendationHandlers } from "../lib/directTerraRecommendationRoute.ts";
import {
  DIRECT_TERRA_JOB_TOKEN_HEADER,
  isDirectTerraCompletedResponse,
  isDirectTerraPendingResponse,
} from "../lib/directTerraApiContract.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";
import { SEARCH_PROGRESS_ID_HEADER } from "../lib/searchProgress.ts";
import {
  getSearchProgress,
  searchProgressTestExports,
} from "../lib/searchProgressStore.ts";

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
        assetTargets: [],
        responseSources: [],
        disabledCitationCount: 1,
        priceEstimates: [
          {
            rank: 1,
            brand: "Example",
            model: "Model A",
            currency: "USD",
            low: 399,
            high: 449,
            median: 424,
            sourceCount: 2,
          },
        ],
        rejectedPriceObservationCount: 0,
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
    assert.equal(completed.priceEstimates[0].median, 424);
    assert.deepEqual(completed.productAssets, []);
    assert.equal(completed.rejectedPriceObservationCount, 0);
  });

  it("adds exact product assets without changing Terra's report or rank", async () => {
    const createdTransports = [];
    const resolvedInputs = [];
    const handlers = createDirectTerraRecommendationHandlers({
      createOpenAIClient: async () => ({ responses: {} }),
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        serperApiKey: "test-only-serper-key",
      }),
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
        assetTargets: [
          {
            key: "rank-1-example-model-a",
            rank: 1,
            productName: "Model A",
            brand: "Example",
            model: "Model A",
            category: "Model A",
          },
        ],
        responseSources: [
          { url: "https://example.com/a", title: "Example Model A" },
        ],
        disabledCitationCount: 0,
        priceEstimates: [],
        rejectedPriceObservationCount: 0,
        ledger: {},
      }),
      createSerperTransport: (config) => {
        createdTransports.push(config);
        return async () => ({ shopping: [] });
      },
      resolveProductAssets: async (input) => {
        resolvedInputs.push(input);
        return [
          {
            rank: 1,
            productName: "Model A",
            productUrl: "https://example.com/a",
            imageUrl: "https://images.example/model-a.jpg",
          },
        ];
      },
    });

    const started = await handlers.POST(
      request("POST", { query: "refrigerator" }),
    );
    const pending = await started.json();
    const completedResponse = await handlers.GET(
      request("GET", null, pending.jobToken),
    );
    const completed = await completedResponse.json();

    assert.equal(completed.reportMarkdown, exactReport);
    assert.deepEqual(completed.productAssets, [
      {
        rank: 1,
        productName: "Model A",
        productUrl: "https://example.com/a",
        imageUrl: "https://images.example/model-a.jpg",
      },
    ]);
    assert.equal(createdTransports.length, 1);
    assert.equal(resolvedInputs.length, 1);
    assert.equal(typeof resolvedInputs[0].serperTransport, "function");

    const repeatedResponse = await handlers.GET(
      request("GET", null, pending.jobToken),
    );
    const repeated = await repeatedResponse.json();
    assert.deepEqual(repeated.productAssets, completed.productAssets);
    assert.equal(
      resolvedInputs.length,
      1,
      "a repeated completed poll must not spend another Shopping batch",
    );
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
      version: "direct-terra-api-v3",
      state: "completed",
      reportMarkdown: exactReport,
      citationUrls: ["https://example.com/a"],
      sourceHosts: ["example.com"],
      productAssets: [],
      priceEstimates: [],
      rejectedPriceObservationCount: 0,
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
    assert.equal(
      isDirectTerraCompletedResponse({
        ...response,
        productAssets: [
          {
            rank: 1,
            productName: "Model A",
            productUrl: "javascript:alert(1)",
            imageUrl: null,
          },
        ],
      }),
      false,
    );
    assert.equal(
      isDirectTerraCompletedResponse({
        ...response,
        productAssets: [
          {
            rank: 1,
            productName: "Model A",
            productUrl: null,
            imageUrl: null,
            providerId: "must-not-cross-client-boundary",
          },
        ],
      }),
      false,
    );
    assert.equal(
      isDirectTerraCompletedResponse({
        ...response,
        priceEstimates: [
          {
            rank: 1,
            brand: "Example",
            model: "Model A",
            currency: "USD",
            low: 500,
            high: 400,
            median: 450,
            sourceCount: 2,
          },
        ],
      }),
      false,
    );
  });
});

describe("direct Terra V2 live progress narration", () => {
  const progressId = "dt-progress-0001";

  function progressRequest(method, body, token) {
    return new Request("http://localhost/api/recommendations-v2", {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { [DIRECT_TERRA_JOB_TOKEN_HEADER]: token } : {}),
        [SEARCH_PROGRESS_ID_HEADER]: progressId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function handlersWithPoll(pollResearch) {
    return createDirectTerraRecommendationHandlers({
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
      pollResearch,
    });
  }

  it("reports milestones across start, deep-research polling, and completion", async () => {
    searchProgressTestExports.resetSearchProgressStore();
    let polls = 0;
    const handlers = handlersWithPoll(async () => {
      polls += 1;
      if (polls === 1) {
        return {
          ok: true,
          state: "pending",
          status: "in_progress",
          ledger: { usage: { webSearchCalls: 3 } },
        };
      }
      return {
        ok: true,
        state: "completed",
        status: "completed",
        reportMarkdown: exactReport,
        citationUrls: ["https://example.com/a"],
        sourceHosts: ["example.com"],
        assetTargets: [],
        responseSources: [],
        disabledCitationCount: 0,
        priceEstimates: [],
        rejectedPriceObservationCount: 0,
        ledger: { usage: { webSearchCalls: 3 } },
      };
    });

    const started = await handlers.POST(
      progressRequest("POST", { query: "refrigerator" }),
    );
    const pending = await started.json();
    const afterStart = getSearchProgress(progressId);
    assert.equal(afterStart.status, "running");
    assert.deepEqual(
      afterStart.events.map((event) => event.milestone),
      ["understand_request", "plan_strategy"],
    );

    await handlers.GET(progressRequest("GET", null, pending.jobToken));
    const afterPending = getSearchProgress(progressId);
    // >= 2 web searches advances the roadmap to deep research, contiguously.
    assert.deepEqual(
      afterPending.events.map((event) => event.milestone),
      [
        "understand_request",
        "plan_strategy",
        "search_market",
        "expand_coverage",
        "deep_research",
      ],
    );
    assert.equal(afterPending.status, "running");

    await handlers.GET(progressRequest("GET", null, pending.jobToken));
    const afterComplete = getSearchProgress(progressId);
    assert.equal(afterComplete.status, "done");
    assert.ok(
      ["verify_sources", "verify_facts", "rank_results"].every((milestone) =>
        afterComplete.events.some((event) => event.milestone === milestone),
      ),
    );
  });

  it("marks progress errored when polling fails", async () => {
    searchProgressTestExports.resetSearchProgressStore();
    const handlers = handlersWithPoll(async () => ({
      ok: false,
      reason: "research_failed",
      details: [],
      ledger: {},
    }));
    const started = await handlers.POST(
      progressRequest("POST", { query: "refrigerator" }),
    );
    const pending = await started.json();
    await handlers.GET(progressRequest("GET", null, pending.jobToken));
    assert.equal(getSearchProgress(progressId).status, "error");
  });

  it("does nothing to the store when no progress header is sent", async () => {
    searchProgressTestExports.resetSearchProgressStore();
    const handlers = handlersWithPoll(async () => ({
      ok: true,
      state: "completed",
      status: "completed",
      reportMarkdown: exactReport,
      citationUrls: ["https://example.com/a"],
      sourceHosts: ["example.com"],
      assetTargets: [],
      responseSources: [],
      disabledCitationCount: 0,
      priceEstimates: [],
      rejectedPriceObservationCount: 0,
      ledger: { usage: { webSearchCalls: 1 } },
    }));
    const started = await handlers.POST(
      request("POST", { query: "refrigerator" }),
    );
    const pending = await started.json();
    await handlers.GET(request("GET", null, pending.jobToken));
    assert.equal(searchProgressTestExports.trackedSearchCount(), 0);
  });
});

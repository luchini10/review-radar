import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { createDirectTerraRecommendationHandlers } from "../lib/directTerraRecommendationRoute.ts";
import {
  DIRECT_TERRA_JOB_TOKEN_HEADER,
  isDirectTerraCompletedResponse,
  isDirectTerraPendingResponse,
} from "../lib/directTerraApiContract.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";
import { buildDirectTerraRequirementContract } from "../lib/directTerraCandidateSlate.ts";
import { issueDirectTerraJobToken } from "../lib/directTerraJobToken.ts";
import { SEARCH_PROGRESS_ID_HEADER } from "../lib/searchProgress.ts";
import {
  getSearchProgress,
  searchProgressTestExports,
} from "../lib/searchProgressStore.ts";
import {
  createPaidRequestAdmission,
  DEFAULT_PAID_REQUEST_ADMISSION,
} from "../lib/paidRequestAdmission.ts";

const secret = "test-only-direct-terra-secret-32-bytes";
const nowMs = 1_789_000_000_000;
const exactReport = "# Ranked products\n\n## #1 Best Match — Model A\n\nExact explanation [Source](https://example.com/a).";

beforeEach(() => {
  DEFAULT_PAID_REQUEST_ADMISSION.resetForTests();
});

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
        createdTransports.push({ kind: "shopping", config });
        return async () => ({ shopping: [] });
      },
      createSerperOrganicTransport: (config) => {
        createdTransports.push({ kind: "organic", config });
        return async () => ({ organic: [] });
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
    assert.deepEqual(
      createdTransports.map(({ kind }) => kind),
      ["shopping", "organic"],
    );
    assert.equal(resolvedInputs.length, 1);
    assert.equal(resolvedInputs[0].targets[0].category, "refrigerator");
    assert.equal(typeof resolvedInputs[0].serperTransport, "function");
    assert.equal(typeof resolvedInputs[0].serperOrganicTransport, "function");

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

  it("rejects unsafe or duplicate Smart Feature IDs before provider work", async () => {
    let starts = 0;
    const handlers = createDirectTerraRecommendationHandlers({
      createOpenAIClient: async () => ({ responses: {} }),
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
      }),
      startResearch: async () => {
        starts += 1;
        throw new Error("should not run");
      },
    });
    const feature = {
      id: "self-emptying",
      name: "Self-emptying",
      type: "boolean",
      operator: "required",
      value: true,
      required: true,
      source: "smart_features",
    };

    const unsafe = await handlers.POST(
      request("POST", {
        query: "robot vacuum",
        selectedFeatures: [{ ...feature, id: "unsafe\u0000id" }],
      }),
    );
    const duplicate = await handlers.POST(
      request("POST", {
        query: "robot vacuum",
        selectedFeatures: [feature, feature],
      }),
    );

    assert.equal(unsafe.status, 400);
    assert.equal(duplicate.status, 400);
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

describe("PR-023 direct Terra request admission", () => {
  function admissionHandlers({ admission, onClientCreate }) {
    return createDirectTerraRecommendationHandlers({
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => {
        onClientCreate();
        return { responses: {} };
      },
      paidRequestAdmission: admission,
    });
  }

  it("rejects oversized JSON and a saturated paid-work boundary before client creation", async () => {
    let clientCreates = 0;
    const openAdmission = createPaidRequestAdmission({
      maxConcurrent: 10,
      maxStartsPerWindow: 100,
    });
    const oversizedHandlers = admissionHandlers({
      admission: openAdmission,
      onClientCreate: () => {
        clientCreates += 1;
      },
    });
    const oversized = await oversizedHandlers.POST(
      request("POST", {
        query: "refrigerator",
        padding: "x".repeat(65_536),
      }),
    );

    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, "request_body_too_large");
    assert.equal(clientCreates, 0);

    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
    });
    const occupied = admission.tryAcquire();
    assert.equal(occupied.ok, true);
    const saturatedHandlers = admissionHandlers({
      admission,
      onClientCreate: () => {
        clientCreates += 1;
      },
    });
    const saturated = await saturatedHandlers.POST(
      request("POST", { query: "refrigerator" }),
    );
    const saturatedBody = await saturated.json();

    assert.equal(saturated.status, 429);
    assert.equal(saturated.headers.get("Retry-After"), "1");
    assert.equal(saturatedBody.code, "temporarily_rate_limited");
    assert.equal(clientCreates, 0);
    occupied.release();
  });

  it("holds a background-job permit until cancellation", async () => {
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
    });
    const handlers = createDirectTerraRecommendationHandlers({
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => ({ responses: {} }),
      now: () => nowMs,
      paidRequestAdmission: admission,
      startResearch: async () => ({
        ok: true,
        responseId: "resp_background123",
        status: "queued",
        promptVersion: DIRECT_TERRA_PROMPT_VERSION,
        promptHash: "a".repeat(64),
        ledger: {},
      }),
      cancelResearch: async () => ({
        ok: true,
        status: "cancelled",
        ledger: {},
      }),
    });

    const first = await handlers.POST(
      request("POST", { query: "refrigerator" }),
    );
    const firstBody = await first.json();
    assert.equal(first.status, 202);
    assert.equal(
      (await handlers.POST(request("POST", { query: "refrigerator" }))).status,
      429,
    );
    assert.equal(
      (await handlers.DELETE(request("DELETE", null, firstBody.jobToken))).status,
      200,
    );
    assert.equal(
      (await handlers.POST(request("POST", { query: "refrigerator" }))).status,
      202,
    );
  });

  it("contains a queued job when app-token construction fails", async () => {
    let currentTime = nowMs;
    let cancelCalls = 0;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
      now: () => currentTime,
    });
    const handlers = createDirectTerraRecommendationHandlers({
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => ({ responses: {} }),
      issueJobToken: () => {
        throw new Error("expected token failure");
      },
      now: () => currentTime,
      paidRequestAdmission: admission,
      startResearch: async () => ({
        ok: true,
        responseId: "resp_token_failure123",
        status: "queued",
        promptVersion: DIRECT_TERRA_PROMPT_VERSION,
        promptHash: "a".repeat(64),
        ledger: { status: "queued" },
      }),
      cancelResearch: async () => {
        cancelCalls += 1;
        return {
          ok: true,
          status: "in_progress",
          ledger: { status: "in_progress" },
        };
      },
    });

    const failed = await handlers.POST(
      request("POST", { query: "refrigerator" }),
    );
    assert.equal(failed.status, 502);
    assert.equal(cancelCalls, 1);
    assert.equal(admission.stats().active, 1);
    assert.equal(admission.tryAcquire().ok, false);

    currentTime += 24 * 60 * 60 * 1_000;
    const recovered = admission.tryAcquire();
    assert.equal(recovered.ok, true);
    recovered.release();
  });

  it("skips saturated optional asset work and retries it after capacity recovers", async () => {
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
    });
    let assetCalls = 0;
    const handlers = createDirectTerraRecommendationHandlers({
      getEnvironment: () => ({
        openAiApiKey: "test-key",
        jobTokenSecret: secret,
        enabled: true,
      }),
      createOpenAIClient: async () => ({ responses: {} }),
      now: () => nowMs,
      paidRequestAdmission: admission,
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
            category: "refrigerator",
          },
        ],
        responseSources: [],
        disabledCitationCount: 0,
        priceEstimates: [],
        rejectedPriceObservationCount: 0,
        ledger: { usage: { webSearchCalls: 1 } },
      }),
      resolveProductAssets: async () => {
        assetCalls += 1;
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
    const shopperRequest = { query: "refrigerator" };
    const token = issueDirectTerraJobToken({
      responseId: "resp_assets123",
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash: "a".repeat(64),
      productCategory: shopperRequest.query,
      requirementContract: buildDirectTerraRequirementContract(shopperRequest),
      secret,
      nowMs,
      ttlMs: 60_000,
    });
    const occupied = admission.tryAcquire();
    assert.equal(occupied.ok, true);

    const saturated = await handlers.GET(request("GET", null, token));
    assert.equal(saturated.status, 200);
    assert.equal(assetCalls, 0);
    assert.equal((await saturated.json()).productAssets[0].productUrl, null);

    occupied.release();
    const recovered = await handlers.GET(request("GET", null, token));
    assert.equal(recovered.status, 200);
    assert.equal(assetCalls, 1);
    assert.equal(
      (await recovered.json()).productAssets[0].productUrl,
      "https://example.com/a",
    );
    assert.equal(admission.stats().active, 0);
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

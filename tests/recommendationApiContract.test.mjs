import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as routeModule from "../app/api/recommendations/route.ts";

const product = {
  category: "gaming monitor",
  imageUrl: "https://cdn.example/acer-xv272u.jpg",
  name: "Acer Nitro XV272U",
  price: { amount: 179.99, currency: "USD" },
  productPageUrl:
    "https://www.bestbuy.com/site/acer-nitro-xv272u/6570234.p",
};

function admission() {
  return {
    tryAcquire() {
      return { ok: true, release() {} };
    },
  };
}

function dependencies(overrides = {}) {
  return {
    buildSelectionPlan: async () => ({
      plan: { queries: ["gaming monitor"], targets: [] },
      telemetry: {
        openAiCalls: 1,
        promptChars: 300,
        systemPromptChars: 700,
        usedFallback: false,
      },
    }),
    createOpenAIClient: async () => null,
    paidRequestAdmission: admission(),
    selectProducts: async () => ({
      result: { recommendations: [product] },
      telemetry: {
        assetCandidates: 1,
        candidatesAfterHardFilters: 1,
        candidatesDiscovered: 3,
        candidatesReturned: 1,
        duplicateCandidatesRemoved: 0,
        logicalSearchCalls: 3,
        physicalSearchAttempts: 3,
        queries: ["gaming monitor"],
        rejectedByAssetSafety: 0,
        rejectedByRequirements: 0,
        resolutionQueries: [],
        searchDiagnostics: [],
      },
    }),
    ...overrides,
  };
}

function request(body, headers = {}) {
  return new Request("http://localhost/api/recommendations", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

describe("selection-only recommendation API", () => {
  it("exports only POST and returns the minimal product contract", async () => {
    const response = await routeModule.createRecommendationPostHandler(
      dependencies(),
    )(
      request({
        query: "gaming monitor",
        budget: "$500",
        priorities: "27-inch 1440p at least 144Hz",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { result: { recommendations: [product] } });
    assert.equal("GET" in routeModule, false);
    assert.equal("DELETE" in routeModule, false);
    assert.equal(JSON.stringify(body).includes("citations"), false);
    assert.equal(JSON.stringify(body).includes("why_recommended"), false);
  });

  it("validates before planning or search", async () => {
    let calls = 0;
    const response = await routeModule.createRecommendationPostHandler(
      dependencies({
        buildSelectionPlan: async () => {
          calls += 1;
          throw new Error("must not run");
        },
        selectProducts: async () => {
          calls += 1;
          throw new Error("must not run");
        },
      }),
    )(request({ query: "" }));

    assert.equal(response.status, 400);
    assert.equal(calls, 0);
    assert.equal(typeof (await response.json()).error, "string");
  });

  it("rejects conflicting hard requirements before paid providers run", async () => {
    let calls = 0;
    const response = await routeModule.createRecommendationPostHandler(
      dependencies({
        buildSelectionPlan: async () => {
          calls += 1;
          throw new Error("must not run");
        },
      }),
    )(
      request({
        query: "office chair",
        budget: "$100",
        priorities: "must be premium",
      }),
    );

    assert.equal(response.status, 400);
    assert.equal(calls, 0);
    assert.match((await response.json()).error, /conflicting requirements/i);
  });

  it("returns a compact local debug envelope only when requested", async () => {
    const response = await routeModule.createRecommendationPostHandler(
      dependencies(),
    )(
      request(
        { query: "gaming monitor" },
        { "x-reviewradar-debug": "true" },
      ),
    );
    const body = await response.json();

    assert.equal(body.debug.architecture, "selection_only_v1");
    assert.equal(body.debug.openAiCalls, 1);
    assert.equal(body.debug.search.candidatesReturned, 1);
    assert.equal("requirements" in body.debug, false);
    assert.equal(JSON.stringify(body.debug).includes("citations"), false);
  });

  it("rejects saturated paid-work admission without planning", async () => {
    let planned = false;
    const response = await routeModule.createRecommendationPostHandler(
      dependencies({
        paidRequestAdmission: {
          tryAcquire() {
            return { ok: false, retryAfterSeconds: 7 };
          },
        },
        buildSelectionPlan: async () => {
          planned = true;
          throw new Error("must not run");
        },
      }),
    )(request({ query: "gaming monitor" }));

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "7");
    assert.equal(planned, false);
  });
});

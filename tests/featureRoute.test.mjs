import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createFeaturePostHandler,
  GENERATED_FEATURE_CACHE_MAX_ENTRIES,
  GENERATED_FEATURE_CACHE_TTL_MS,
} from "../app/api/features/route.ts";
import { createBoundedAsyncCache } from "../lib/cache.ts";
import { USER_ERROR_MESSAGES } from "../lib/errorMessages.ts";
import { createPaidRequestAdmission } from "../lib/paidRequestAdmission.ts";

const unknownCategory = "quantum flux organizer";

function generatedFeatures(category = unknownCategory) {
  return {
    category,
    features: Array.from({ length: 5 }, (_, index) => ({
      id: `feature-${index + 1}`,
      name: `Feature ${index + 1}`,
      description: `Measurable feature ${index + 1}.`,
      type: "enum",
      possibleValues: ["Option A", "Option B"],
      operators: ["equals"],
      unit: "",
      examples: ["Option A", "Option B"],
      commonlyImportant: true,
    })),
  };
}

function jsonRequest(body, headers = {}) {
  return new Request("http://localhost/api/features", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function buildHandler({
  admission = createPaidRequestAdmission({
    maxConcurrent: 100,
    maxStartsPerWindow: 1_000,
  }),
  cache = createBoundedAsyncCache({ maxEntries: 100 }),
  create = async () => ({ output_text: JSON.stringify(generatedFeatures()) }),
  getEnvironment = () => ({
    apiKey: "test-openai-key",
    model: "test-model",
  }),
  onClientCreate = () => {},
} = {}) {
  return {
    admission,
    cache,
    handler: createFeaturePostHandler({
      cache,
      createOpenAIClient: async () => {
        onClientCreate();
        return { responses: { create } };
      },
      getEnvironment,
      paidRequestAdmission: admission,
    }),
  };
}

describe("PR-023 generated feature route", () => {
  it("rejects declared and actual oversized bodies before client creation", async () => {
    let clientCreates = 0;
    const { handler } = buildHandler({
      onClientCreate: () => {
        clientCreates += 1;
      },
    });

    const declared = await handler(
      jsonRequest(
        { productCategory: unknownCategory },
        { "Content-Length": "65537" },
      ),
    );
    const actual = await handler(
      jsonRequest({
        productCategory: unknownCategory,
        padding: "x".repeat(65_536),
      }),
    );

    assert.equal(declared.status, 413);
    assert.equal(actual.status, 413);
    assert.equal(clientCreates, 0);
  });

  it("rejects oversized and mistyped context fields instead of truncating them", async () => {
    let clientCreates = 0;
    const { handler } = buildHandler({
      onClientCreate: () => {
        clientCreates += 1;
      },
    });
    const invalidBodies = [
      { productCategory: "x".repeat(81) },
      { productCategory: unknownCategory, budget: "x".repeat(241) },
      { productCategory: unknownCategory, importantDetails: "x".repeat(241) },
      { productCategory: unknownCategory, budget: 500 },
      { productCategory: unknownCategory, importantDetails: [] },
    ];

    for (const body of invalidBodies) {
      const response = await handler(jsonRequest(body));
      assert.equal(response.status, 400);
    }
    assert.equal(clientCreates, 0);
  });

  it("coalesces identical misses and caches only the same complete request context", async () => {
    let modelCalls = 0;
    let releaseFirst;
    const firstBarrier = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const cache = createBoundedAsyncCache({ maxEntries: 2 });
    const { handler } = buildHandler({
      cache,
      create: async () => {
        modelCalls += 1;
        if (modelCalls === 1) await firstBarrier;
        return { output_text: JSON.stringify(generatedFeatures()) };
      },
    });
    const body = { productCategory: unknownCategory, budget: "under $100" };

    const first = handler(jsonRequest(body));
    const second = handler(jsonRequest(body));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(modelCalls, 1);
    releaseFirst();
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);

    assert.equal((await handler(jsonRequest(body))).status, 200);
    assert.equal(modelCalls, 1);
    assert.equal(
      (
        await handler(
          jsonRequest({
            productCategory: unknownCategory,
            budget: "under $200",
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handler(
          jsonRequest({
            productCategory: unknownCategory,
            budget: "under $300",
          }),
        )
      ).status,
      200,
    );
    assert.equal(modelCalls, 3);
    assert.deepEqual(cache.stats(), {
      entries: 2,
      inFlight: 0,
      maxEntries: 2,
    });
  });

  it("does not reuse generated features after the configured model changes", async () => {
    let model = "model-a";
    let modelCalls = 0;
    const { handler } = buildHandler({
      create: async () => {
        modelCalls += 1;
        return { output_text: JSON.stringify(generatedFeatures()) };
      },
      getEnvironment: () => ({
        apiKey: "test-openai-key",
        model,
      }),
    });
    const body = { productCategory: unknownCategory };

    assert.equal((await handler(jsonRequest(body))).status, 200);
    assert.equal((await handler(jsonRequest(body))).status, 200);
    model = "model-b";
    assert.equal((await handler(jsonRequest(body))).status, 200);
    assert.equal(modelCalls, 2);
  });

  it("does not retain failures and releases admission for a safe retry", async () => {
    let attempts = 0;
    const { admission, cache, handler } = buildHandler({
      create: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("private provider failure");
        return { output_text: JSON.stringify(generatedFeatures()) };
      },
    });

    const first = await handler(
      jsonRequest({ productCategory: unknownCategory }),
    );
    const firstBody = await first.json();
    assert.equal(first.status, 200);
    assert.equal(typeof firstBody.warning, "string");
    assert.equal(
      JSON.stringify(firstBody).includes("private provider failure"),
      false,
    );
    assert.equal(cache.stats().entries, 0);
    assert.equal(admission.stats().active, 0);

    const second = await handler(
      jsonRequest({ productCategory: unknownCategory }),
    );
    assert.equal(second.status, 200);
    assert.equal(attempts, 2);
    assert.equal(cache.stats().entries, 1);
    assert.equal(admission.stats().active, 0);
  });

  it("returns 429 before client creation when paid-work admission is saturated", async () => {
    let clientCreates = 0;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
    });
    const occupied = admission.tryAcquire();
    assert.equal(occupied.ok, true);
    const { handler } = buildHandler({
      admission,
      onClientCreate: () => {
        clientCreates += 1;
      },
    });

    const rejected = await handler(
      jsonRequest({ productCategory: unknownCategory }),
    );
    assert.equal(rejected.status, 429);
    assert.equal(rejected.headers.get("Retry-After"), "1");
    assert.deepEqual(await rejected.json(), {
      error: USER_ERROR_MESSAGES.temporaryRateLimit,
    });
    assert.equal(clientCreates, 0);

    occupied.release();
    const accepted = await handler(
      jsonRequest({ productCategory: unknownCategory }),
    );
    assert.equal(accepted.status, 200);
    assert.equal(clientCreates, 1);
    assert.equal(admission.stats().active, 0);
  });

  it("publishes finite production cache bounds", () => {
    assert.equal(GENERATED_FEATURE_CACHE_MAX_ENTRIES, 100);
    assert.equal(GENERATED_FEATURE_CACHE_TTL_MS, 21_600_000);
  });
});

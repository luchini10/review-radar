import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import * as route from "../app/api/recommendations/route.ts";
import { createRecommendationPostHandler } from "../lib/recommendationHandler.ts";
import { enrichProductImages } from "../lib/productImages.ts";
import { RequestCancelledError } from "../lib/requestCancellation.ts";
import { ProductResearchError } from "../lib/productResearch.ts";

const product = { name: "Example Brewer", productPageUrl: "https://example.com/brewer" };
function dependencies(overrides = {}) {
  return {
    createOpenAIClient: async () => ({ responses: { create: async () => { throw new Error("Mock research owns this request"); } } }),
    paidRequestAdmission: { tryAcquire: () => ({ ok: true, release() {} }) },
    researchProducts: async () => ({ result: { recommendations: [product] }, debug: { openAiCalls: 1, hostedSearchCalls: 3 } }),
    enrichProductImages: async ({ products }) => ({ recommendations: products, debug: {} }),
    ...overrides,
  };
}
function request(body, headers = {}, signal) {
  return new Request("http://localhost/api/recommendations", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers }, signal });
}
let previousKey, previousSerperKey;
beforeEach(() => {
  previousKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "test-only-key";
  previousSerperKey = process.env.SERPER_API_KEY; process.env.SERPER_API_KEY = "test-only-image-key";
});
afterEach(() => {
  if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
  if (previousSerperKey === undefined) delete process.env.SERPER_API_KEY; else process.env.SERPER_API_KEY = previousSerperKey;
});

describe("single-request research API", () => {
  it("reports only an allowlisted failure reason in requested local debug", async () => {
    const handler = createRecommendationPostHandler(dependencies({ researchProducts: async () => { throw new ProductResearchError("timeout"); } }));
    const local = await handler(request({ query: "coffee maker" }, { "x-reviewradar-debug": "true" }));
    assert.equal(local.status, 502);
    assert.equal((await local.json()).debug.failureReason, "timeout");
    const normal = await handler(request({ query: "coffee maker" }));
    assert.equal("debug" in await normal.json(), false);
  });
  it("returns names and links in research order with no commerce fields", async () => {
    const products = [product, { name: "Another Brewer", productPageUrl: "https://example.com/another" }];
    let calls = 0;
    const response = await createRecommendationPostHandler(dependencies({ researchProducts: async () => {
      calls++; return { result: { recommendations: products }, debug: { openAiCalls: 1 } };
    }}))(request({ query: "coffee maker", budget: "$500" }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { result: { recommendations: products } });
    assert.equal(calls, 1);
    assert.deepEqual(Object.keys(route).sort(), ["POST", "maxDuration", "runtime"]);
  });
  it("validates malformed input before research", async () => {
    let calls = 0;
    const response = await createRecommendationPostHandler(dependencies({ researchProducts: async () => { calls++; throw new Error(); } }))(request({ query: "" }));
    assert.equal(response.status, 400); assert.equal(calls, 0);
  });
  it("passes budget and preferences as research guidance without the old price gates", async () => {
    let observed;
    const handler = createRecommendationPostHandler(dependencies({ researchProducts: async ({ input }) => {
      observed = input; return { result: { recommendations: [product] }, debug: {} };
    }}));
    const response = await handler(request({ query: "office chair", budget: "$100", priorities: "prefer premium quality" }));
    assert.equal(response.status, 200);
    assert.equal(observed.budget, "$100"); assert.equal(observed.priorities, "prefer premium quality");
    assert.equal("extractedRequirements" in observed, false);
  });
  it("requires configuration and never disguises failure as empty success", async () => {
    delete process.env.OPENAI_API_KEY;
    let called = false;
    const missing = await createRecommendationPostHandler(dependencies({ researchProducts: async () => { called = true; throw new Error(); } }))(request({ query: "coffee maker" }));
    assert.equal(missing.status, 503); assert.equal(called, false);
    process.env.OPENAI_API_KEY = "test-only-key";
    const failed = await createRecommendationPostHandler(dependencies({ researchProducts: async () => { throw new Error("secret provider payload"); } }))(request({ query: "coffee maker" }, { "x-reviewradar-debug": "true" }));
    assert.equal(failed.status, 502); assert.equal(JSON.stringify(await failed.json()).includes("secret"), false);
  });
  it("releases admission on failure and returns cancellation distinctly", async () => {
    let released = 0;
    const response = await createRecommendationPostHandler(dependencies({
      paidRequestAdmission: { tryAcquire: () => ({ ok: true, release() { released++; } }) },
      researchProducts: async () => { throw new RequestCancelledError(); },
    }))(request({ query: "coffee maker" }));
    assert.equal(response.status, 499); assert.equal(released, 1);
  });
  it("rejects saturated work before research", async () => {
    let called = false;
    const response = await createRecommendationPostHandler(dependencies({
      paidRequestAdmission: { tryAcquire: () => ({ ok: false, retryAfterSeconds: 7 }) },
      researchProducts: async () => { called = true; throw new Error(); },
    }))(request({ query: "coffee maker" }));
    assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), "7"); assert.equal(called, false);
  });
  it("keeps debug out of the public envelope and provides bounded local counters", async () => {
    const response = await createRecommendationPostHandler(dependencies())(request({ query: "coffee maker" }, { "x-reviewradar-debug": "true" }));
    const body = await response.json();
    assert.equal(body.debug.architecture, "single_request_product_research"); assert.equal(body.debug.openAiCalls, 1);
    assert.equal("search" in body.debug, false);
  });

  it("adds optional images after research without changing the five selections or their order", async () => {
    const products = Array.from({ length: 5 }, (_, i) => ({ name: `Example Brewer X${i}`, productPageUrl: `https://example.com/x${i}` }));
    let calls = 0, researched = false;
    const response = await createRecommendationPostHandler(dependencies({
      researchProducts: async () => { researched = true; return { result: { recommendations: products }, debug: { openAiCalls: 1 } }; },
      enrichProductImages: options => enrichProductImages({ ...options, fetchImpl: async (_, init) => {
        assert.equal(researched, true); assert.equal(init.headers["X-API-KEY"], "test-only-image-key");
        const index = calls++;
        if (index === 1) return new Response("provider error", { status: 500 });
        const row = { title: index === 3 ? "Other Brewer" : products[index].name, link: products[index].productPageUrl,
          imageUrl: `https://encrypted-tbn0.gstatic.com/shopping?q=tbn:${index}` };
        return Response.json({ shopping: [row] });
      } }),
    }))(request({ query: "coffee maker" }, { "x-reviewradar-debug": "true" }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(calls, 5);
    assert.deepEqual(body.result.recommendations.map(({ name, productPageUrl }) => ({ name, productPageUrl })), products);
    assert.equal(body.result.recommendations.filter(item => item.image).length, 3);
    assert.equal(body.debug.openAiCalls, 1); assert.equal(body.debug.imageMatches, 3);
    assert.equal(body.debug.imageErrors, 1); assert.equal(body.debug.imageNoMatches, 1);
    assert.equal(JSON.stringify(body).includes("test-only"), false);
  });

  it("preserves successful research if the optional image step unexpectedly throws", async () => {
    const response = await createRecommendationPostHandler(dependencies({
      enrichProductImages: async () => { throw new Error("private provider details"); },
    }))(request({ query: "coffee maker" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: { recommendations: [product] } });
  });

  it("cancels during image lookup and releases the admission slot", async () => {
    const controller = new AbortController(); let released = 0;
    const response = await createRecommendationPostHandler(dependencies({
      paidRequestAdmission: { tryAcquire: () => ({ ok: true, release() { released++; } }) },
      enrichProductImages: async () => { controller.abort(); throw new RequestCancelledError(); },
    }))(request({ query: "coffee maker" }, {}, controller.signal));
    assert.equal(response.status, 499); assert.equal(released, 1);
  });
});

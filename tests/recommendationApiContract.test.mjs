import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createRecommendationPostHandler } from "../app/api/recommendations/route.ts";
import { USER_ERROR_MESSAGES } from "../lib/errorMessages.ts";

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalOpenAiModel = process.env.OPENAI_MODEL;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-api-key";
  delete process.env.OPENAI_MODEL;
});

afterEach(() => {
  if (originalOpenAiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
  }

  if (originalOpenAiModel === undefined) {
    delete process.env.OPENAI_MODEL;
  } else {
    process.env.OPENAI_MODEL = originalOpenAiModel;
  }
});

function jsonRequest(body, headers = {}) {
  return new Request("http://localhost/api/recommendations", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    method: "POST",
  });
}

function rawRequest(body) {
  return new Request("http://localhost/api/recommendations", {
    body,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

async function readJson(response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

function emptySerperResult() {
  return {
    candidates: [],
    stats: {
      categoryGroup: "general",
      collectedCandidates: 0,
      directRetailerCalls: 0,
      duplicateCandidatesRemoved: 0,
      maxEnrichedProducts: 0,
      organicCalls: 0,
      preFilteredCandidates: 0,
      rejectedCandidates: 0,
      retailerDomainCalls: 0,
      searchedRetailerDomainQueries: [],
      searchedShoppingQueries: [],
      searchDepth: "standard",
      selectedSourcePack: "general",
      shoppingCalls: 0,
      sourceTimeouts: 0,
    },
  };
}

function buildProduct(overrides = {}) {
  return {
    best_for: "Small kitchens that need a compact appliance.",
    category: "Microwave",
    citations: [
      {
        title: "Example product page",
        url: "https://example.com/products/example-countertop-microwave",
        what_it_supports: "Product details and review evidence.",
      },
    ],
    common_complaints: [],
    confidence_score: 82,
    cons: ["Smaller interior than family-size models."],
    estimated_price_range: "$120 to $150",
    name: "Example Countertop Microwave",
    not_for: ["Large families that need more capacity."],
    price_value_verdict: "Good value for a compact microwave.",
    product_image_url: "",
    product_page_url: "https://example.com/products/example-countertop-microwave",
    pros: ["Compact footprint.", "Simple controls."],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended:
      "It has cited product details and enough evidence to compare against the request.",
    ...overrides,
  };
}

function modelPayload(products) {
  return {
    assumptions: [],
    candidate_products: products,
    final_buying_advice: "Review the displayed products and verify current availability.",
    generated_queries: Array.from(
      { length: 8 },
      (_, index) => `microwave research query ${index + 1}`,
    ),
    raw_candidate_count: products.length,
    search_summary: "Mocked product research completed.",
    what_to_avoid: [],
  };
}

function modelResponse(products, verifiedUrls = undefined) {
  const urls =
    verifiedUrls ??
    products.flatMap((product) =>
      product.citations.map((citation) => citation.url),
    );

  return {
    output: [
      {
        action: {
          sources: urls.map((url) => ({ url })),
        },
        type: "web_search_call",
      },
    ],
    output_text: JSON.stringify(modelPayload(products)),
  };
}

function buildHandler({
  collectReachableCitationUrls = async () => new Set(),
  createError,
  modelError,
  onModelCreate = () => {},
  response = modelResponse([buildProduct()]),
  searchSerperForProducts = async () => emptySerperResult(),
} = {}) {
  return createRecommendationPostHandler({
    collectReachableCitationUrls,
    createOpenAIClient: async () => {
      if (createError) {
        throw createError;
      }

      return {
        responses: {
          create: async (input, options) => {
            onModelCreate(input, options);

            if (modelError) {
              throw modelError;
            }

            return response;
          },
        },
      };
    },
    enrichProductAssets: async (result) => result,
    enrichResultWithReviewEvidence: async (result) => result,
    searchSerperForProducts,
    upgradeWeakSourceEvidence: async (result) => ({ result, sourceUpgradeTraces: [] }),
    verifyMissingRequirementEvidence: async (result) => result,
  });
}

describe("recommendation API contract", () => {
  it("returns a safe error for invalid JSON", async () => {
    const handler = buildHandler();
    const response = await readJson(await handler(rawRequest("{")));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: "The request body must be valid JSON.",
    });
  });

  it("returns a safe error for a non-object request body", async () => {
    const handler = buildHandler();
    const response = await readJson(await handler(jsonRequest(null)));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: "The request body must be a JSON object.",
    });
  });

  it("requires a product category query", async () => {
    const handler = buildHandler();
    const response = await readJson(await handler(jsonRequest({ budget: "$100" })));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.emptySearch,
    });
  });

  it("rejects vague category queries", async () => {
    const handler = buildHandler();
    const response = await readJson(await handler(jsonRequest({ query: "anything" })));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.vagueSearch,
    });
  });

  it("returns a safe missing API key error before provider calls", async () => {
    delete process.env.OPENAI_API_KEY;
    let providerCalled = false;
    const handler = buildHandler({
      createError: new Error("provider should not be called"),
    });
    const guardedHandler = createRecommendationPostHandler({
      collectReachableCitationUrls: async () => new Set(),
      createOpenAIClient: async () => {
        providerCalled = true;
        throw new Error("provider should not be called");
      },
      enrichProductAssets: async (result) => result,
      enrichResultWithReviewEvidence: async (result) => result,
      searchSerperForProducts: async () => emptySerperResult(),
      upgradeWeakSourceEvidence: async (result) => ({ result, sourceUpgradeTraces: [] }),
      verifyMissingRequirementEvidence: async (result) => result,
    });

    assert.ok(handler);
    const response = await readJson(
      await guardedHandler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 500);
    assert.equal(providerCalled, false);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.missingApiKey,
    });
  });

  it("returns a stable exact-match response shape for a mocked valid model response", async () => {
    const handler = buildHandler();
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 200);
    assert.ok(response.body.result);
    assert.equal(Array.isArray(response.body.result.exactMatches), true);
    assert.equal(Array.isArray(response.body.result.nearMatches), true);
    assert.equal(Array.isArray(response.body.result.recommendations), true);
    assert.equal(response.body.result.exactMatches[0].name, "Example Countertop Microwave");
    assert.equal("scoreBreakdown" in response.body.result.exactMatches[0], false);
  });

  it("uses GPT-5.4 Mini for helper stages and final synthesis", async () => {
    const models = [];
    const timeouts = [];
    const handler = buildHandler({
      onModelCreate: (input, options) => {
        models.push(input.model);
        timeouts.push(options?.timeout);
      },
    });
    const response = await readJson(
      await handler(
        jsonRequest({
          query: "microwave",
        }),
      ),
    );

    assert.equal(response.status, 200);
    assert.equal(models[0], "gpt-5.4-mini");
    assert.equal(models[models.length - 1], "gpt-5.4-mini");
    assert.equal(timeouts[timeouts.length - 1], 180000);
  });

  it("includes stage timing data in debug responses", async () => {
    const handler = buildHandler();
    const response = await readJson(
      await handler(
        jsonRequest(
          { query: "microwave" },
          {
            "x-reviewradar-debug": "true",
          },
        ),
      ),
    );

    assert.equal(response.status, 200);
    assert.ok(response.body.debug.timing);
    assert.equal(typeof response.body.debug.timing.totalMs, "number");
    assert.equal(Array.isArray(response.body.debug.timing.stages), true);
    assert.equal(Array.isArray(response.body.debug.timing.slowestStages), true);
    assert.ok(
      response.body.debug.timing.stages.some(
        (stage) => stage.label === "openai_final_research",
      ),
    );
  });

  it("returns a stable near-match response shape when a mocked product misses a hard requirement", async () => {
    const blackMicrowave = buildProduct({
      best_for: "Shoppers who can be flexible on color.",
      cons: ["Black finish does not match a white-finish requirement."],
      name: "Black Countertop Microwave",
      pros: ["Compact footprint.", "Simple controls."],
      why_recommended:
        "It is a relevant compact microwave, but it misses the requested finish.",
    });
    const handler = buildHandler({
      response: modelResponse([blackMicrowave]),
    });
    const response = await readJson(
      await handler(
        jsonRequest({
          query: "microwave",
          selectedFeatures: ["Color: White"],
        }),
      ),
    );

    assert.equal(response.status, 200);
    assert.ok(response.body.result);
    assert.equal(Array.isArray(response.body.result.exactMatches), true);
    assert.equal(Array.isArray(response.body.result.nearMatches), true);
    assert.equal(response.body.result.exactMatches.length, 0);
    assert.equal(response.body.result.nearMatches[0].name, "Black Countertop Microwave");
    assert.match(response.body.result.nearMatches[0].near_match_reason, /Color/i);
  });

  it("returns a safe error for malformed model JSON", async () => {
    const handler = buildHandler({
      response: {
        output: [],
        output_text: "{not valid json",
      },
    });
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.badStructuredOutput,
    });
  });

  it("returns a safe error for an empty model response", async () => {
    const handler = buildHandler({
      response: {
        output: [],
        output_text: "",
      },
    });
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.noReliableEvidence,
    });
  });

  it("returns a safe citation-validation failure when sources are not verified", async () => {
    const handler = buildHandler({
      response: modelResponse([buildProduct()], [
        "https://different.example.com/review",
      ]),
    });
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 422);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.noReliableEvidence,
    });
  });

  it("returns safe provider failure messages without raw secrets", async () => {
    const handler = buildHandler({
      modelError: new Error(
        "fetch failed Authorization: Bearer fake-token api_key=sk-fake-secret-value",
      ),
    });
    const response = await readJson(
      await handler(
        jsonRequest(
          { query: "microwave" },
          {
            "x-reviewradar-debug": "true",
          },
        ),
      ),
    );
    const serialized = JSON.stringify(response.body);

    assert.equal(response.status, 502);
    assert.equal(response.body.error, USER_ERROR_MESSAGES.networkError);
    assert.equal(serialized.includes("sk-fake-secret-value"), false);
    assert.equal(serialized.includes("fake-token"), false);
  });

  it("returns a safe timeout error", async () => {
    const timeoutError = new Error("The request was aborted.");
    timeoutError.name = "AbortError";
    const handler = buildHandler({
      modelError: timeoutError,
    });
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(response.body, {
      error: USER_ERROR_MESSAGES.slowResponse,
    });
  });
});

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createRecommendationPostHandler } from "../app/api/recommendations/route.ts";
import { USER_ERROR_MESSAGES } from "../lib/errorMessages.ts";
import { createPaidRequestAdmission } from "../lib/paidRequestAdmission.ts";

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalOpenAiModel = process.env.OPENAI_MODEL;
const originalPinnedPlanning = process.env.REVIEW_RADAR_PINNED_PLANNING;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-api-key";
  delete process.env.OPENAI_MODEL;
  delete process.env.REVIEW_RADAR_PINNED_PLANNING;
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

  if (originalPinnedPlanning === undefined) {
    delete process.env.REVIEW_RADAR_PINNED_PLANNING;
  } else {
    process.env.REVIEW_RADAR_PINNED_PLANNING = originalPinnedPlanning;
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

function fallbackSerperResult() {
  return {
    candidates: [
      {
        id: "fallback-microwave-em720",
        name: "Example Countertop Microwave EM720",
        brand: null,
        category: "microwave",
        productUrl:
          "https://shop.example.com/p/example-countertop-microwave-em720",
        imageUrl:
          "https://shop.example.com/images/example-countertop-microwave-em720.jpg",
        retailer: "Example Store",
        price: 89,
        rating: 4.5,
        reviewCount: 120,
        availableColors: [],
        dimensions: {
          width: null,
          depth: null,
          height: null,
          unit: null,
        },
        keySpecs: [],
        evidenceSources: [],
        requirementCheck: {
          exactMatch: false,
          passed: [],
          failed: [],
          unknown: [],
        },
      },
    ],
    stats: {
      categoryGroup: "appliances",
      collectedCandidates: 1,
      directRetailerCalls: 0,
      duplicateCandidatesRemoved: 0,
      funnel: {
        rawNames: ["Example Countertop Microwave EM720"],
        rejected: [],
      },
      maxEnrichedProducts: 1,
      organicCalls: 0,
      preFilteredCandidates: 1,
      rejectedCandidates: 0,
      retailerDomainCalls: 0,
      searchedRetailerDomainQueries: [],
      searchedShoppingQueries: ["Example Countertop Microwave EM720"],
      searchDepth: "standard",
      seedProductNames: ["Example Countertop Microwave EM720"],
      selectedSourcePack: "appliances",
      shoppingCalls: 1,
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
  onClientCreate = () => {},
  onModelCreate = () => {},
  paidRequestAdmission = createPaidRequestAdmission({
    maxConcurrent: 100,
    maxStartsPerWindow: 1_000,
  }),
  response = modelResponse([buildProduct()]),
  searchSerperForProducts = async () => emptySerperResult(),
  upgradeWeakSourceEvidence = async (result) => ({
    result,
    sourceUpgradeDecisions: [],
    sourceUpgradeTraces: [],
  }),
} = {}) {
  return createRecommendationPostHandler({
    collectReachableCitationUrls,
    createOpenAIClient: async () => {
      onClientCreate();
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
    paidRequestAdmission,
    searchSerperForProducts,
    upgradeWeakSourceEvidence,
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

  it("rejects declared and actual oversized bodies before client creation", async () => {
    for (const request of [
      new Request("http://localhost/api/recommendations", {
        body: JSON.stringify({ query: "microwave" }),
        headers: {
          "Content-Length": "65537",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
      rawRequest(
        JSON.stringify({
          query: "microwave",
          padding: "x".repeat(65_536),
        }),
      ),
    ]) {
      let clientCreates = 0;
      const handler = buildHandler({
        onClientCreate: () => {
          clientCreates += 1;
        },
      });

      const response = await readJson(await handler(request));

      assert.equal(response.status, 413);
      assert.equal(clientCreates, 0);
    }
  });

  it("rejects oversized shopper fields before client creation", async () => {
    const oversizedBodies = [
      { query: `microwave ${"q".repeat(200)}` },
      { query: "microwave", budget: "b".repeat(501) },
      { query: "microwave", priorities: "p".repeat(2_001) },
      { query: "microwave", avoid: "a".repeat(2_001) },
      {
        query: "microwave",
        selectedFeatures: [
          {
            id: "feature-id",
            name: "Feature name",
            type: "text",
            operator: "equals",
            value: "v".repeat(501),
            required: true,
            source: "smart_features",
          },
        ],
      },
    ];

    for (const body of oversizedBodies) {
      let clientCreates = 0;
      const handler = buildHandler({
        onClientCreate: () => {
          clientCreates += 1;
        },
      });

      const response = await readJson(await handler(jsonRequest(body)));

      assert.equal(response.status, 400);
      assert.equal(clientCreates, 0);
    }
  });

  it("rejects saturated paid work before client creation and releases successful work", async () => {
    let clientCreates = 0;
    const paidRequestAdmission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 100,
    });
    const occupied = paidRequestAdmission.tryAcquire();
    assert.equal(occupied.ok, true);
    const handler = buildHandler({
      onClientCreate: () => {
        clientCreates += 1;
      },
      paidRequestAdmission,
    });

    const rejected = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );
    assert.equal(rejected.status, 429);
    assert.deepEqual(rejected.body, {
      error: USER_ERROR_MESSAGES.temporaryRateLimit,
    });
    assert.equal(clientCreates, 0);

    occupied.release();
    const accepted = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );
    assert.equal(accepted.status, 200);
    assert.equal(clientCreates, 1);
    assert.equal(paidRequestAdmission.stats().active, 0);
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
      paidRequestAdmission: createPaidRequestAdmission({
        maxConcurrent: 100,
        maxStartsPerWindow: 1_000,
      }),
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
    assert.equal("debug" in response.body, false);
    assert.equal(JSON.stringify(response.body).includes("searchLedger"), false);
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

  it("reports the resolved planning snapshot without changing final synthesis", async () => {
    process.env.REVIEW_RADAR_PINNED_PLANNING = "on";
    const requests = [];
    const handler = buildHandler({
      onModelCreate: (input) => requests.push(input),
    });
    const response = await readJson(
      await handler(
        jsonRequest(
          { query: "microwave" },
          { "x-reviewradar-debug": "true" },
        ),
      ),
    );

    assert.equal(response.status, 200);
    assert.equal(requests[0].model, "gpt-5.4-mini-2026-03-17");
    assert.equal(requests[0].temperature, 0);
    assert.equal(requests[requests.length - 1].model, "gpt-5.4-mini");
    assert.equal("temperature" in requests[requests.length - 1], false);
    assert.equal(
      response.body.debug.stageFunnel.searchLedger.header.helperModel,
      "gpt-5.4-mini-2026-03-17",
    );
    assert.equal(
      response.body.debug.stageFunnel.searchLedger.header.flags
        .REVIEW_RADAR_PINNED_PLANNING,
      "on",
    );
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
    const searchLedger = response.body.debug.stageFunnel.searchLedger;
    assert.ok(searchLedger);
    assert.equal(typeof searchLedger.header.commitHash, "string");
    assert.ok(searchLedger.header.commitHash.length > 0);
    assert.equal(searchLedger.header.helperModel, "gpt-5.4-mini");
    assert.equal(searchLedger.header.finalModel, "gpt-5.4-mini");
    assert.equal(typeof searchLedger.header.flags, "object");
    assert.equal(
      typeof searchLedger.header.serperCacheEmptyAtStart,
      "boolean",
    );
    assert.equal(searchLedger.dispatch.reconciliation.balanced, true);
    assert.equal(searchLedger.candidateLineage.unknownFirstLossCount, 0);
  });

  it("includes source-upgrade trigger decisions only in debug responses", async () => {
    const sourceUpgradeDecisions = [
      {
        missingEvidence: ["verified_price", "owner_rating"],
        modelTokens: ["example100"],
        name: "Example Countertop Microwave",
        reason: "selected_for_upgrade",
        selected: true,
        shouldUpgrade: true,
      },
    ];
    const handler = buildHandler({
      upgradeWeakSourceEvidence: async (result) => ({
        result,
        sourceUpgradeDecisions,
        sourceUpgradeTraces: [],
      }),
    });

    const debugResponse = await readJson(
      await handler(
        jsonRequest(
          { query: "microwave" },
          { "x-reviewradar-debug": "true" },
        ),
      ),
    );

    assert.equal(debugResponse.status, 200);
    assert.deepEqual(
      debugResponse.body.debug.stageFunnel.sourceUpgradeDecisions,
      sourceUpgradeDecisions,
    );
    assert.equal(
      "sourceUpgradeDecisions" in debugResponse.body.result,
      false,
    );
  });

  it("preserves current diagnostics on no-reliable-evidence fallback responses", async () => {
    const handler = buildHandler({
      response: modelResponse([buildProduct()], []),
      searchSerperForProducts: async () => fallbackSerperResult(),
    });
    const debugResponse = await readJson(
      await handler(
        jsonRequest(
          { query: "microwave" },
          { "x-reviewradar-debug": "true" },
        ),
      ),
    );
    const normalResponse = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(debugResponse.status, 200);
    assert.equal(
      debugResponse.body.debug.fallbackReason,
      "no_reliable_evidence",
    );
    assert.equal(
      debugResponse.body.debug.stageFunnel.path,
      "search_candidate_fallback",
    );
    assert.deepEqual(
      debugResponse.body.debug.stageFunnel.sourceUpgradeTraces,
      [],
    );
    assert.ok(
      Array.isArray(
        debugResponse.body.debug.stageFunnel.finalSelectionTrace,
      ),
    );
    assert.equal(
      debugResponse.body.debug.fallbackTrace.stagesBypassed.some(
        (entry) => entry.stage === "source_quality_upgrade",
      ),
      true,
    );
    assert.equal("debug" in normalResponse.body, false);
    assert.deepEqual(
      debugResponse.body.result.exactMatches.map((product) => product.name),
      normalResponse.body.result.exactMatches.map((product) => product.name),
    );
    assert.deepEqual(
      debugResponse.body.result.nearMatches.map((product) => product.name),
      normalResponse.body.result.nearMatches.map((product) => product.name),
    );
  });

  it("returns a stable near-match response shape when a mocked product misses a hard requirement", async () => {
    const blackMicrowave = buildProduct({
      best_for: "Shoppers who can be flexible on color.",
      citations: [
        {
          title: "Black countertop microwave",
          url: "https://example.com/products/black-countertop-microwave",
          what_it_supports: "Product details and review evidence.",
        },
      ],
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

  it("retains a strict product page when only companion editorial evidence is provider-verified", async () => {
    const productUrl =
      "https://example.com/products/example-countertop-microwave";
    const editorialUrl =
      "https://www.techradar.com/home/small-appliances/best-microwaves";
    const product = buildProduct({
      citations: [
        {
          title: "Best microwaves",
          url: editorialUrl,
          what_it_supports: "Independent comparison evidence.",
        },
        {
          title: "Example Countertop Microwave",
          url: productUrl,
          what_it_supports: "Specific manufacturer product page.",
        },
      ],
    });
    const handler = buildHandler({
      collectReachableCitationUrls: async (result) =>
        new Set(
          result.recommendations.flatMap((recommendation) =>
            recommendation.citations
              .map((citation) => citation.url)
              .filter((url) => url === productUrl),
          ),
        ),
      response: modelResponse([product], [editorialUrl]),
    });
    const response = await readJson(
      await handler(jsonRequest({ query: "microwave" })),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.result.exactMatches[0].name, product.name);
    assert.equal(
      response.body.result.exactMatches[0].citations[0].url,
      productUrl,
    );
    assert.equal(
      response.body.result.exactMatches[0].citations[1].url,
      editorialUrl,
    );
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

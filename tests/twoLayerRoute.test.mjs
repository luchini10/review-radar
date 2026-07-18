import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createRecommendationRouteHandlers,
} from "../app/api/recommendations/route.ts";
import {
  createTwoLayerRecommendationHandlers,
} from "../lib/twoLayerRecommendationRoute.ts";
import {
  TWO_LAYER_API_VERSION,
} from "../lib/twoLayerApiContract.ts";
import {
  issueTwoLayerJobToken,
  verifyTwoLayerJobToken,
} from "../lib/twoLayerJobToken.ts";

const secret = "test-only-route-secret-with-at-least-32-bytes";
const nowMs = 1_789_000_000_000;
const responseId = "resp_route_123456789";

const productUrl = "https://shop.example.com/products/example-vacuum";
const testUrl = "https://tests.example.org/example-vacuum";
const rawAnswer = `
# #1 Best Match - Example Vacuum, model EV100

**Recommendation status:** **Best Match**

### Why it ranks #1
The Example Vacuum is a balanced choice. ([shop.example.com](${productUrl}))

### Current price
- Price not verified.

### Overall assessment
Best for mixed floors. Its main tradeoff is weight. ([tests.example.org](${testUrl}))

### Pros
- Strong pickup

### Cons
- Heavy for stairs

### Sources
- **Product source:** Example product page. ([shop.example.com](${productUrl}))
- **Professional source:** Example test. ([tests.example.org](${testUrl}))
`.trim();

function request(method, body, token) {
  return new Request("http://localhost/api/recommendations", {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-reviewradar-job-token": token } : {}),
    },
    method,
  });
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

function completedResponse() {
  return {
    id: responseId,
    status: "completed",
    model: "gpt-5.6-terra",
    output_text: rawAnswer,
    usage: {
      input_tokens: 2_000,
      output_tokens: 1_000,
      total_tokens: 3_000,
    },
    output: [
      {
        type: "web_search_call",
        action: {
          sources: [
            { url: productUrl, title: "Example Vacuum" },
            { url: testUrl, title: "Example Vacuum test" },
          ],
        },
      },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: rawAnswer,
            annotations: [
              { type: "url_citation", url: productUrl, title: "Example Vacuum" },
              { type: "url_citation", url: testUrl, title: "Example Vacuum test" },
            ],
          },
        ],
      },
    ],
  };
}

function lifecycle({ retrieveResponses = [] } = {}) {
  const calls = [];
  let retrieveIndex = 0;
  return {
    calls,
    createOpenAIClient: async (_apiKey, options) => {
      calls.push({ method: "client", options });
      return {
        responses: {
          create: async (body) => {
            calls.push({ method: "create", body });
            return { id: responseId, status: "queued" };
          },
          retrieve: async (id, query) => {
            calls.push({ method: "retrieve", id, query });
            return (
              retrieveResponses[retrieveIndex++] ?? {
                id: responseId,
                status: "in_progress",
              }
            );
          },
          cancel: async (id) => {
            calls.push({ method: "cancel", id });
            return { id, status: "cancelled" };
          },
        },
      };
    },
  };
}

function buildTwoLayerHandlers(simulation, overrides = {}) {
  return createTwoLayerRecommendationHandlers({
    createOpenAIClient: simulation.createOpenAIClient,
    getEnvironment: () => ({
      openAiApiKey: "test-openai-key",
      jobTokenSecret: secret,
    }),
    now: () => nowMs,
    validateRequest: (body) =>
      body && typeof body === "object" && body.query === "vacuum"
        ? { data: { query: "vacuum" } }
        : { error: "Invalid shopper request." },
    ...overrides,
  });
}

function withRawAnswer(response, answer) {
  response.output_text = answer;
  const message = response.output.find((item) => item.type === "message");
  const outputText = message?.content?.find((item) => item.type === "output_text");
  if (outputText) outputText.text = answer;
  return response;
}

function expectedVerificationFailure() {
  return {
    pipeline: "two_layer",
    version: TWO_LAYER_API_VERSION,
    state: "failed",
    code: "verification_failed",
    error: "Research finished, but its evidence could not be verified safely.",
  };
}

describe("OAI-T4B exact server-mode dispatcher", () => {
  it("delegates missing and explicit legacy modes without touching two-layer code", async () => {
    for (const mode of [undefined, "", "legacy"]) {
      const calls = [];
      const expectedBody = JSON.stringify({ result: { marker: "byte-stable" } });
      const handlers = createRecommendationRouteHandlers({
        getPipelineMode: () => mode,
        legacyPost: async () => {
          calls.push("legacy");
          return new Response(expectedBody, {
            headers: { "Content-Type": "application/json" },
            status: 207,
          });
        },
        twoLayerHandlers: {
          POST: async () => {
            calls.push("two-layer");
            return Response.json({ error: "wrong path" }, { status: 500 });
          },
          GET: async () => new Response(null, { status: 500 }),
          DELETE: async () => new Response(null, { status: 500 }),
        },
      });

      const response = await handlers.POST(request("POST", { query: "vacuum" }));
      assert.equal(response.status, 207);
      assert.equal(await response.text(), expectedBody);
      assert.deepEqual(calls, ["legacy"]);
    }
  });

  it("rejects invalid modes and legacy polling methods without provider calls", async () => {
    for (const [mode, method, status] of [
      ["unexpected", "POST", 500],
      [" legacy ", "POST", 500],
      ["legacy", "GET", 405],
      [undefined, "DELETE", 405],
    ]) {
      const calls = [];
      const handlers = createRecommendationRouteHandlers({
        getPipelineMode: () => mode,
        legacyPost: async () => {
          calls.push("legacy");
          return new Response(null, { status: 500 });
        },
        twoLayerHandlers: {
          POST: async () => {
            calls.push("two-layer");
            return new Response(null, { status: 500 });
          },
          GET: async () => {
            calls.push("two-layer");
            return new Response(null, { status: 500 });
          },
          DELETE: async () => {
            calls.push("two-layer");
            return new Response(null, { status: 500 });
          },
        },
      });
      const response = await handlers[method](request(method));
      assert.equal(response.status, status);
      assert.deepEqual(calls, []);
    }
  });
});

describe("OAI-T4B signed background route lifecycle", () => {
  it("starts one no-retry response and returns only a signed app token", async () => {
    const simulation = lifecycle();
    const handlers = buildTwoLayerHandlers(simulation);
    const response = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );

    assert.equal(response.status, 202);
    assert.equal(response.body.pipeline, "two_layer");
    assert.equal(response.body.version, TWO_LAYER_API_VERSION);
    assert.equal(response.body.state, "pending");
    assert.equal(response.body.status, "queued");
    assert.equal(typeof response.body.jobToken, "string");
    assert.equal(JSON.stringify(response.body).includes(responseId), false);
    assert.deepEqual(
      simulation.calls.map((call) => call.method),
      ["client", "create"],
    );
    assert.deepEqual(simulation.calls[0].options, { maxRetries: 0 });

    const verified = verifyTwoLayerJobToken({
      token: response.body.jobToken,
      secret,
      nowMs,
    });
    assert.equal(verified.ok, true);
    assert.match(verified.payload.promptHash, /^[a-f0-9]{64}$/);
  });

  it("fails before provider creation when config or shopper input is invalid", async () => {
    for (const [environment, body, status] of [
      [{ openAiApiKey: "", jobTokenSecret: secret }, { query: "vacuum" }, 500],
      [{ openAiApiKey: "test", jobTokenSecret: "short" }, { query: "vacuum" }, 500],
      [
        { openAiApiKey: "test", jobTokenSecret: secret },
        { query: "invalid" },
        400,
      ],
    ]) {
      const simulation = lifecycle();
      const handlers = buildTwoLayerHandlers(simulation, {
        getEnvironment: () => environment,
      });
      const response = await handlers.POST(request("POST", body));
      assert.equal(response.status, status);
      assert.deepEqual(simulation.calls, []);
    }
  });

  it("polls the same response and returns only verified presentation data", async () => {
    const simulation = lifecycle({
      retrieveResponses: [
        { id: responseId, status: "in_progress" },
        completedResponse(),
      ],
    });
    const handlers = buildTwoLayerHandlers(simulation);
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );

    const pending = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );
    assert.equal(pending.status, 202);
    assert.equal(pending.body.state, "pending");
    assert.equal(pending.body.jobToken, start.body.jobToken);

    const completed = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );
    assert.equal(completed.status, 200);
    assert.equal(completed.body.state, "completed");
    assert.equal(completed.body.cards.length, 1);
    assert.equal(completed.body.cards[0].identity.product_name, "Example Vacuum");
    assert.equal(completed.body.cards[0].commerce.state, "not_verified");
    assert.equal(completed.body.cards[0].commerce.priceAmount, null);
    assert.deepEqual(
      completed.body.sources.map((source) => source.url),
      [productUrl, testUrl],
    );
    assert.deepEqual(
      completed.body.sources.map((source) => source.label),
      ["Research source", "Research source"],
    );
    const serialized = JSON.stringify(completed.body);
    assert.equal(serialized.includes(rawAnswer), false);
    assert.equal(serialized.includes("responseSources"), false);
    assert.equal(serialized.includes(responseId), false);
    assert.deepEqual(
      simulation.calls.map((call) => call.method),
      ["client", "create", "client", "retrieve", "client", "retrieve"],
    );
  });

  it("attributes a malformed master-prompt answer without exposing internals", async () => {
    const malformedAnswer = rawAnswer.replace("### Pros", "### Advantages");
    const simulation = lifecycle({
      retrieveResponses: [
        withRawAnswer(completedResponse(), malformedAnswer),
      ],
    });
    const diagnostics = [];
    const handlers = buildTwoLayerHandlers(simulation, {
      onVerificationFailure: (diagnostic) => diagnostics.push(diagnostic),
    });
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );
    const completed = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );

    assert.equal(completed.status, 502);
    assert.deepEqual(completed.body, expectedVerificationFailure());
    assert.deepEqual(diagnostics, [
      { stage: "formatter", reason: "product_shape" },
    ]);
    const serialized = JSON.stringify(completed.body);
    assert.equal(serialized.includes(malformedAnswer), false);
    assert.equal(serialized.includes(productUrl), false);
    assert.equal(serialized.includes(responseId), false);
  });

  it("attributes an unregistered cited source without exposing its URL", async () => {
    const response = completedResponse();
    response.output[0].action.sources = [
      { url: productUrl, title: "Example Vacuum" },
    ];
    response.output[1].content[0].annotations = [
      { type: "url_citation", url: productUrl, title: "Example Vacuum" },
    ];
    const simulation = lifecycle({ retrieveResponses: [response] });
    const diagnostics = [];
    const handlers = buildTwoLayerHandlers(simulation, {
      onVerificationFailure: (diagnostic) => diagnostics.push(diagnostic),
    });
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );
    const completed = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );

    assert.equal(completed.status, 502);
    assert.deepEqual(completed.body, expectedVerificationFailure());
    assert.deepEqual(diagnostics, [
      { stage: "formatter", reason: "source_registry" },
    ]);
    assert.equal(JSON.stringify(completed.body).includes(testUrl), false);
  });

  it("attributes presentation validation separately and fails closed", async () => {
    const simulation = lifecycle({ retrieveResponses: [completedResponse()] });
    const diagnostics = [];
    const handlers = buildTwoLayerHandlers(simulation, {
      buildPresentation: () => {
        throw new Error(`sensitive presentation failure ${productUrl}`);
      },
      onVerificationFailure: (diagnostic) => diagnostics.push(diagnostic),
    });
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );
    const completed = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );

    assert.equal(completed.status, 502);
    assert.deepEqual(completed.body, expectedVerificationFailure());
    assert.deepEqual(diagnostics, [
      { stage: "presentation", reason: "presentation_validation" },
    ]);
    assert.equal(JSON.stringify(completed.body).includes(productUrl), false);
  });

  it("keeps the fail-closed response stable when diagnostics reporting fails", async () => {
    const malformedAnswer = rawAnswer.replace("### Pros", "### Advantages");
    const simulation = lifecycle({
      retrieveResponses: [
        withRawAnswer(completedResponse(), malformedAnswer),
      ],
    });
    const handlers = buildTwoLayerHandlers(simulation, {
      onVerificationFailure: () => {
        throw new Error("diagnostic sink unavailable");
      },
    });
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );
    const completed = await readJson(
      await handlers.GET(request("GET", undefined, start.body.jobToken)),
    );

    assert.equal(completed.status, 502);
    assert.deepEqual(completed.body, expectedVerificationFailure());
  });

  it("rejects invalid and expired tokens before creating a client", async () => {
    const simulation = lifecycle();
    const handlers = buildTwoLayerHandlers(simulation);
    const expiredToken = issueTwoLayerJobToken({
      responseId,
      promptVersion: "oai-two-layer-master-prompt-v1",
      promptHash: "a".repeat(64),
      secret,
      nowMs: nowMs - 11 * 60_000,
      ttlMs: 10 * 60_000,
    });

    for (const [token, expectedStatus] of [
      ["not-a-token", 400],
      [expiredToken, 410],
    ]) {
      const response = await handlers.GET(request("GET", undefined, token));
      assert.equal(response.status, expectedStatus);
    }
    assert.deepEqual(simulation.calls, []);
  });

  it("does not accept a job token from the request URL", async () => {
    const simulation = lifecycle();
    const handlers = buildTwoLayerHandlers(simulation);
    const token = issueTwoLayerJobToken({
      responseId,
      promptVersion: "oai-two-layer-master-prompt-v1",
      promptHash: "a".repeat(64),
      secret,
      nowMs,
      ttlMs: 10 * 60_000,
    });
    const response = await handlers.GET(
      new Request(
        `http://localhost/api/recommendations?job=${encodeURIComponent(token)}`,
      ),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(simulation.calls, []);
  });

  it("cancels exactly once without starting a replacement", async () => {
    const simulation = lifecycle();
    const handlers = buildTwoLayerHandlers(simulation);
    const start = await readJson(
      await handlers.POST(request("POST", { query: "vacuum" })),
    );
    const cancelled = await readJson(
      await handlers.DELETE(request("DELETE", undefined, start.body.jobToken)),
    );

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.state, "cancelled");
    assert.deepEqual(
      simulation.calls.map((call) => call.method),
      ["client", "create", "client", "cancel"],
    );
  });
});

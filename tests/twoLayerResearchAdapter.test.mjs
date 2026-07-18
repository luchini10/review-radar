import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildNormalizedShopperRequest } from "../lib/autonomousResearchContract.ts";
import {
  buildTwoLayerResearchRequest,
  cancelTwoLayerResearch,
  extractTwoLayerResponseSources,
  pollTwoLayerResearch,
  startTwoLayerResearch,
  TWO_LAYER_RESEARCH_CONFIG,
} from "../lib/twoLayerResearchAdapter.ts";

const productUrl = "https://shop.example.com/products/example-vacuum";
const testUrl = "https://tests.example.org/example-vacuum";
const rawAnswer = JSON.stringify({
  version: "oai-two-layer-structured-output-v1",
  sources: [
    { id: "s1", url: productUrl },
    { id: "s2", url: testUrl },
  ],
  recommendations: [
    {
      key: "example-vacuum",
      rank: 1,
      recommendation_status: "Best Match",
      identity: {
        brand: "Example",
        product_name: "Example Vacuum",
        model: "EV100",
        variant: null,
        source_ids: ["s1"],
      },
      assessment: {
        why: "The Example Vacuum is a balanced choice.",
        best_for: "Mixed floors",
        main_tradeoff: "Heavy for stairs",
        source_ids: ["s1", "s2"],
      },
      pros: [{ text: "Strong pickup", source_ids: ["s2"] }],
      cons: [{ text: "Heavy for stairs", source_ids: ["s2"] }],
      requirement_checks: [
        {
          requirement: "Currently available for purchase in the United States",
          status: "Pass",
          explanation: "The exact product page is current.",
          source_ids: ["s1"],
        },
      ],
      claims: [],
    },
  ],
});

function completedResponse(overrides = {}) {
  return {
    id: "resp_test_123456789",
    status: "completed",
    model: "gpt-5.6-terra",
    output_text: rawAnswer,
    usage: {
      input_tokens: 2_000,
      output_tokens: 1_000,
      total_tokens: 3_000,
      input_tokens_details: { cached_tokens: 500 },
    },
    output: [
      {
        type: "web_search_call",
        action: {
          type: "search",
          query: "example vacuum review",
          sources: [
            { url: `${productUrl}?utm_source=openai`, title: "Example Vacuum" },
            { url: testUrl },
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
    ...overrides,
  };
}

function mockClient({ createResponse, retrieveResponse, cancelResponse, errorAt } = {}) {
  const calls = [];
  return {
    calls,
    client: {
      responses: {
        create: async (body, options) => {
          calls.push({ method: "create", body, options });
          if (errorAt === "create") {
            throw new Error(
              "Bearer secret-token shopper private text sk-test-secret-value",
            );
          }
          return createResponse ?? { id: "resp_test_123456789", status: "queued" };
        },
        retrieve: async (responseId, query, options) => {
          calls.push({ method: "retrieve", responseId, query, options });
          if (errorAt === "retrieve") throw new Error("private retrieve failure");
          return retrieveResponse ?? completedResponse();
        },
        cancel: async (responseId, options) => {
          calls.push({ method: "cancel", responseId, options });
          if (errorAt === "cancel") throw new Error("private cancel failure");
          return cancelResponse ?? { id: responseId, status: "cancelled" };
        },
      },
    },
  };
}

const normalizedRequest = buildNormalizedShopperRequest({ query: "vacuum" });

describe("OAI-T5C structured background adapter", () => {
  it("builds the exact one-create Terra/high hosted-search request", () => {
    const request = buildTwoLayerResearchRequest(normalizedRequest);

    assert.equal(request.model, "gpt-5.6-terra");
    assert.deepEqual(request.reasoning, { effort: "high" });
    assert.equal(request.background, true);
    assert.equal(request.store, false);
    assert.equal(request.max_output_tokens, 24_000);
    assert.equal(request.max_tool_calls, 20);
    assert.deepEqual(request.tools, [{ type: "web_search" }]);
    assert.equal(request.tool_choice, "required");
    assert.deepEqual(request.include, ["web_search_call.action.sources"]);
    assert.equal(request.text.format.type, "json_schema");
    assert.equal(request.text.format.strict, true);
    assert.equal(
      request.text.format.schema.properties.recommendations.items.properties
        .requirement_checks.minItems,
      1,
    );
    const requestText = JSON.stringify(request);
    assert.equal(requestText.includes("price_amount"), false);
    assert.equal(requestText.includes("product_url"), false);
  });

  it("starts once and returns an opaque response ID without polling", async () => {
    const simulation = mockClient();
    const result = await startTwoLayerResearch({
      client: simulation.client,
      normalizedRequest,
      now: () => 10,
    });

    assert.equal(result.ok, true);
    assert.equal(result.responseId, "resp_test_123456789");
    assert.equal(result.status, "queued");
    assert.deepEqual(simulation.calls.map((call) => call.method), ["create"]);
    assert.equal(simulation.calls[0].options.timeout, TWO_LAYER_RESEARCH_CONFIG.requestTimeoutMs);
    assert.equal(JSON.stringify(result.ledger).includes("SHOPPER_REQUEST"), false);
  });

  it("returns pending polls and carries complete-source inclusion", async () => {
    for (const status of ["queued", "in_progress"]) {
      const simulation = mockClient({
        retrieveResponse: { id: "resp_test_123456789", status },
      });
      const result = await pollTwoLayerResearch({
        client: simulation.client,
        responseId: "resp_test_123456789",
        promptVersion: "oai-two-layer-master-prompt-v3",
        promptHash: "a".repeat(64),
      });

      assert.equal(result.ok, true);
      assert.equal(result.state, "pending");
      assert.equal(result.status, status);
      assert.deepEqual(simulation.calls[0].query, {
        include: ["web_search_call.action.sources"],
      });
    }
  });

  it("merges response-owned action and citation metadata without leaking paths to the ledger", async () => {
    const sources = extractTwoLayerResponseSources(completedResponse());
    assert.deepEqual(sources, [
      { url: productUrl, title: "Example Vacuum", type: null },
      { url: testUrl, title: "Example Vacuum test", type: null },
    ]);

    const simulation = mockClient();
    const result = await pollTwoLayerResearch({
      client: simulation.client,
      responseId: "resp_test_123456789",
      promptVersion: "oai-two-layer-master-prompt-v3",
      promptHash: "a".repeat(64),
      now: () => 25,
    });

    assert.equal(result.ok, true);
    assert.equal(result.state, "completed");
    assert.equal(result.research.recommendations[0].identity.product_name, "Example Vacuum");
    assert.equal(result.structureDiagnostic.contractVersion, "oai-two-layer-structured-output-v1");
    assert.deepEqual(result.ledger.sourceHosts, ["shop.example.com", "tests.example.org"]);
    const ledgerText = JSON.stringify(result.ledger);
    assert.equal(ledgerText.includes("/products/example-vacuum"), false);
    assert.equal(ledgerText.includes(rawAnswer), false);
  });

  it("returns a source-bound structured research object without a formatter", async () => {
    const simulation = mockClient();
    const result = await pollTwoLayerResearch({
      client: simulation.client,
      responseId: "resp_test_123456789",
      promptVersion: "oai-two-layer-master-prompt-v3",
      promptHash: "a".repeat(64),
    });
    assert.equal(result.ok, true);
    assert.equal(result.state, "completed");

    assert.equal(result.research.recommendations.length, 1);
    assert.deepEqual(result.research.sources.map((source) => source.role), [
      "other",
      "other",
    ]);
  });

  it("fails closed when a cited source has no response-owned title", async () => {
    const response = completedResponse({
      output: [
        {
          type: "web_search_call",
          action: { sources: [{ url: productUrl }, { url: testUrl }] },
        },
        {
          type: "message",
          content: [{ type: "output_text", text: rawAnswer, annotations: [] }],
        },
      ],
    });
    const simulation = mockClient({ retrieveResponse: response });
    const result = await pollTwoLayerResearch({
      client: simulation.client,
      responseId: "resp_test_123456789",
      promptVersion: "oai-two-layer-master-prompt-v3",
      promptHash: "a".repeat(64),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "contract_invalid");
    assert.equal(result.verification.cause, "required_registered_source_missing");
  });

  it("rejects every terminal or incomplete research state without fallback", async () => {
    for (const [response, reason] of [
      [{ id: "resp_test_123456789", status: "failed" }, "terminal_failure"],
      [{ id: "resp_test_123456789", status: "cancelled" }, "cancelled"],
      [{ id: "resp_test_123456789", status: "incomplete" }, "incomplete_response"],
      [
        {
          ...completedResponse(),
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        },
        "refusal",
      ],
      [{ ...completedResponse(), output: [] }, "missing_web_search"],
      [{ ...completedResponse(), output_text: "" }, "missing_output_text"],
    ]) {
      const simulation = mockClient({ retrieveResponse: response });
      const result = await pollTwoLayerResearch({
        client: simulation.client,
        responseId: "resp_test_123456789",
        promptVersion: "oai-two-layer-master-prompt-v3",
        promptHash: "a".repeat(64),
      });
      assert.equal(result.ok, false, reason);
      assert.equal(result.reason, reason, reason);
      assert.deepEqual(simulation.calls.map((call) => call.method), ["retrieve"]);
    }
  });

  it("redacts create, retrieve, and cancel failures without retrying", async () => {
    for (const operation of ["create", "retrieve", "cancel"]) {
      const simulation = mockClient({ errorAt: operation });
      const result =
        operation === "create"
          ? await startTwoLayerResearch({ client: simulation.client, normalizedRequest })
          : operation === "retrieve"
            ? await pollTwoLayerResearch({
                client: simulation.client,
                responseId: "resp_test_123456789",
                promptVersion: "oai-two-layer-master-prompt-v3",
                promptHash: "a".repeat(64),
              })
            : await cancelTwoLayerResearch({
                client: simulation.client,
                responseId: "resp_test_123456789",
                promptVersion: "oai-two-layer-master-prompt-v3",
                promptHash: "a".repeat(64),
              });

      assert.equal(result.ok, false, operation);
      assert.equal(result.reason, "request_error", operation);
      assert.equal(simulation.calls.length, 1, operation);
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes("sk-test-secret-value"), false);
      assert.equal(serialized.includes("secret-token"), false);
      assert.equal(serialized.includes("shopper private text"), false);
    }
  });

  it("rejects a provider response for a different background job", async () => {
    for (const operation of ["retrieve", "cancel"]) {
      const simulation = mockClient(
        operation === "retrieve"
          ? { retrieveResponse: completedResponse({ id: "resp_other_123456789" }) }
          : { cancelResponse: { id: "resp_other_123456789", status: "cancelled" } },
      );
      const result =
        operation === "retrieve"
          ? await pollTwoLayerResearch({
              client: simulation.client,
              responseId: "resp_test_123456789",
              promptVersion: "oai-two-layer-master-prompt-v3",
              promptHash: "a".repeat(64),
            })
          : await cancelTwoLayerResearch({
              client: simulation.client,
              responseId: "resp_test_123456789",
              promptVersion: "oai-two-layer-master-prompt-v3",
              promptHash: "a".repeat(64),
            });

      assert.equal(result.ok, false, operation);
      assert.equal(result.reason, "response_id_mismatch", operation);
      assert.equal(simulation.calls.length, 1, operation);
    }
  });

  it("cancels exactly once and accepts the provider's terminal status", async () => {
    const simulation = mockClient();
    const result = await cancelTwoLayerResearch({
      client: simulation.client,
      responseId: "resp_test_123456789",
      promptVersion: "oai-two-layer-master-prompt-v3",
      promptHash: "a".repeat(64),
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "cancelled");
    assert.deepEqual(simulation.calls.map((call) => call.method), ["cancel"]);
  });
});

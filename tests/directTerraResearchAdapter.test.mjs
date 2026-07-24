import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";

const responseId = "resp_direct_123456789";
const promptHash = "a".repeat(64);
const report =
  "# Ranked products\n\n## #1 Best Match - Model A\n\n[Source](https://example.com/a)";

function clientWith(overrides = {}) {
  return {
    responses: {
      create: async () => ({
        id: responseId,
        model: "gpt-5.6-terra",
        output: [],
        status: "in_progress",
      }),
      retrieve: async () => ({
        id: responseId,
        model: "gpt-5.6-terra",
        output: [],
        status: "in_progress",
      }),
      cancel: async () => ({
        id: responseId,
        model: "gpt-5.6-terra",
        output: [],
        status: "cancelled",
      }),
      ...overrides,
    },
  };
}

describe("direct Terra V2 provider adapter", () => {
  it("creates exactly the typed Terra/high background contract with a hard tool ceiling", async () => {
    const calls = [];
    const client = clientWith({
      create: async (body, options) => {
        calls.push({ body, options });
        return {
          id: responseId,
          model: "gpt-5.6-terra",
          output: [],
          status: "in_progress",
        };
      },
    });

    const result = await startDirectTerraResearch({
      client,
      shopperRequest: { query: "refrigerator", budget: "under $2,000" },
      now: () => 100,
    });

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, "gpt-5.6-terra");
    assert.deepEqual(calls[0].body.reasoning, { effort: "high" });
    assert.equal(calls[0].body.background, true);
    assert.deepEqual(calls[0].body.tools, [{ type: "web_search" }]);
    assert.equal(calls[0].body.tool_choice, "required");
    assert.equal(calls[0].body.max_tool_calls, 20);
    assert.deepEqual(calls[0].body.include, [
      "web_search_call.action.sources",
    ]);
    assert.equal(calls[0].body.text.format.type, "json_schema");
    assert.equal(calls[0].body.text.format.strict, true);
    assert.deepEqual(calls[0].options, { timeout: 120_000 });
  });

  it("records and dispatches an explicit Sol comparison model without changing defaults", async () => {
    const calls = [];
    const client = clientWith({
      create: async (body) => {
        calls.push(body);
        return {
          id: responseId,
          model: "gpt-5.6-sol",
          output: [],
          status: "in_progress",
        };
      },
    });

    const result = await startDirectTerraResearch({
      client,
      shopperRequest: { query: "robot vacuum", budget: "under $300" },
      model: "gpt-5.6-sol",
      now: () => 100,
    });

    assert.equal(result.ok, true);
    assert.equal(calls[0].model, "gpt-5.6-sol");
    assert.equal(result.ledger.modelRequested, "gpt-5.6-sol");
    assert.equal(result.ledger.modelReturned, "gpt-5.6-sol");
  });

  it("retrieves response-owned sources and returns Terra's report unchanged", async () => {
    const calls = [];
    const client = clientWith({
      retrieve: async (...args) => {
        calls.push(args);
        return {
          id: responseId,
          model: "gpt-5.6-terra",
          status: "completed",
          output: [
            {
              type: "web_search_call",
              action: {
                type: "search",
                query: "model a",
                sources: [{ type: "url", url: "https://example.com/a" }],
              },
            },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    report_markdown: report,
                    price_observations: [],
                  }),
                  annotations: [],
                },
              ],
            },
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
          },
        };
      },
    });

    const result = await pollDirectTerraResearch({
      client,
      responseId,
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash,
      now: () => 100,
    });

    assert.equal(result.ok, true);
    assert.equal(result.state, "completed");
    assert.equal(result.reportMarkdown, report);
    assert.deepEqual(result.citationUrls, ["https://example.com/a"]);
    assert.equal(result.disabledCitationCount, 0);
    assert.deepEqual(result.priceEstimates, []);
    assert.deepEqual(result.assetTargets, []);
    assert.deepEqual(result.responseSources, [
      { url: "https://example.com/a" },
    ]);
    assert.equal(result.rejectedPriceObservationCount, 0);
    assert.deepEqual(calls, [
      [
        responseId,
        { include: ["web_search_call.action.sources"] },
        { timeout: 120_000 },
      ],
    ]);
  });

  it("fails closed on a mismatched provider response ID", async () => {
    const result = await pollDirectTerraResearch({
      client: clientWith({
        retrieve: async () => ({
          id: "resp_different_123456789",
          model: "gpt-5.6-terra",
          output: [],
          status: "in_progress",
        }),
      }),
      responseId,
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash,
      now: () => 100,
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "response_id_mismatch");
  });

  it("uses the Responses cancel endpoint for the tracked provider job", async () => {
    const calls = [];
    const result = await cancelDirectTerraResearch({
      client: clientWith({
        cancel: async (...args) => {
          calls.push(args);
          return {
            id: responseId,
            model: "gpt-5.6-terra",
            output: [],
            status: "cancelled",
          };
        },
      }),
      responseId,
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash,
      now: () => 100,
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "cancelled");
    assert.deepEqual(calls, [[responseId, { timeout: 120_000 }]]);
  });
});

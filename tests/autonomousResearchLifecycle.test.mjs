import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildNormalizedShopperRequest } from "../lib/autonomousResearchContract.ts";
import {
  runAutonomousResearch,
  runRequirementInterpreter,
  sanitizeAutonomousResponseForEvidence,
} from "../lib/autonomousResearchAdapter.ts";
import {
  completedSimulatedResponse,
  createScriptedResponsesClient,
} from "./helpers/autonomousResearchSimulator.mjs";

const config = {
  model: "configured-web-search-model",
  reasoning: "high",
  maxOutputTokens: 12_000,
  maxToolCalls: 20,
  requestTimeoutMs: 120_000,
  overallTimeoutMs: 600_000,
  pollIntervalMs: 500,
  maxPolls: 4,
};

const interpreterConfig = {
  model: "configured-web-search-model",
  reasoning: "high",
  maxOutputTokens: 4_000,
  maxInputCharacters: 50_000,
  requestTimeoutMs: 120_000,
};

function runWithScript(script, overrides = {}) {
  const { client, calls } = createScriptedResponsesClient(script);
  let clock = 0;
  const result = runAutonomousResearch({
    client,
    normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
    config: { ...config, ...overrides },
    now: () => clock,
    sleep: async (milliseconds) => {
      clock += milliseconds;
    },
  });
  return { result, calls, clock: () => clock };
}

describe("autonomous Responses boundary flight simulator", () => {
  it("carries complete-source inclusion through every queued and in-progress poll", async () => {
    const { result, calls } = runWithScript({
      createResponse: { id: "resp_123", status: "queued" },
      retrieveResponses: [
        { id: "resp_123", status: "in_progress" },
        completedSimulatedResponse(),
      ],
    });

    assert.equal((await result).ok, true);
    const retrieveCalls = calls.filter((call) => call.method === "retrieve");
    assert.equal(retrieveCalls.length, 2);
    for (const call of retrieveCalls) {
      assert.deepEqual(call.query, {
        include: ["web_search_call.action.sources"],
      });
    }
  });

  it("accepts a registered slate URL supplied only by final retrieved action.sources", async () => {
    const { result } = runWithScript({
      createResponse: { id: "resp_123", status: "in_progress", output: [] },
      retrieveResponses: [completedSimulatedResponse()],
    });
    assert.equal((await result).ok, true);
  });

  it("does not retrieve after sleeping across the overall deadline", async () => {
    const { result, calls } = runWithScript(
      {
        createResponse: { id: "resp_123", status: "in_progress" },
        retrieveResponses: [completedSimulatedResponse()],
      },
      { requestTimeoutMs: 30_000, overallTimeoutMs: 30_000, pollIntervalMs: 30_000 },
    );
    const settled = await result;
    assert.equal(settled.ok, false);
    assert.equal(settled.reason, "overall_timeout");
    assert.deepEqual(calls.map((call) => call.method), ["create"]);
  });

  it("rejects a retrieve that completes after the overall deadline", async () => {
    let clock = 0;
    const calls = [];
    const result = await runAutonomousResearch({
      client: {
        responses: {
          create: async () => {
            calls.push("create");
            return { id: "resp_123", status: "in_progress" };
          },
          retrieve: async () => {
            calls.push("retrieve");
            clock += 29_500;
            return completedSimulatedResponse();
          },
        },
      },
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config: {
        ...config,
        requestTimeoutMs: 30_000,
        overallTimeoutMs: 30_000,
      },
      now: () => clock,
      sleep: async (milliseconds) => {
        clock += milliseconds;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "overall_timeout");
    assert.deepEqual(calls, ["create", "retrieve"]);
    assert.equal(result.response.status, "completed");
    assert.equal(result.ledger.status, "completed");
    assert.equal(result.ledger.usage.totalTokens, 3_000);
  });

  it("stops exactly at the poll ceiling without an extra retrieve", async () => {
    const { result, calls } = runWithScript(
      {
        createResponse: { id: "resp_123", status: "queued" },
        retrieveResponses: [{ id: "resp_123", status: "in_progress" }],
      },
      { maxPolls: 1 },
    );
    const settled = await result;
    assert.equal(settled.ok, false);
    assert.equal(settled.reason, "poll_limit_exceeded");
    assert.equal(calls.filter((call) => call.method === "retrieve").length, 1);
    assert.equal(settled.ledger.polls, 1);
  });

  it("fails closed on every documented terminal status", async () => {
    for (const [status, reason] of [
      ["failed", "terminal_failure"],
      ["cancelled", "terminal_failure"],
      ["incomplete", "incomplete_response"],
      ["unexpected", "terminal_failure"],
    ]) {
      const { result } = runWithScript({ createResponse: { id: "resp_123", status } });
      const settled = await result;
      assert.equal(settled.ok, false, status);
      assert.equal(settled.reason, reason, status);
    }
  });

  it("distinguishes create and retrieve failures without retrying either request", async () => {
    const createFailure = createScriptedResponsesClient({
      createResponse: null,
      createError: Object.assign(
        new Error(
          "Authorization: Bearer secret-token-value ORIGINAL_REQUEST_JSON_START private shopper text ORIGINAL_REQUEST_JSON_END sk-test-secret-value",
        ),
        { status: 500 },
      ),
    });
    const createResult = await runAutonomousResearch({
      client: createFailure.client,
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
    });
    assert.equal(createResult.reason, "request_error");
    assert.equal(createFailure.calls.length, 1);
    assert.equal(createResult.details.join(" ").includes("sk-test-secret-value"), false);
    assert.equal(createResult.details.join(" ").includes("secret-token-value"), false);
    assert.equal(createResult.details.join(" ").includes("private shopper text"), false);

    const retrieveFailure = createScriptedResponsesClient({
      createResponse: { id: "resp_123", status: "queued" },
      retrieveResponses: [],
      retrieveErrorAt: 0,
    });
    const retrieveResult = await runAutonomousResearch({
      client: retrieveFailure.client,
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
      sleep: async () => {},
    });
    assert.equal(retrieveResult.reason, "request_error");
    assert.deepEqual(
      retrieveFailure.calls.map((call) => call.method),
      ["create", "retrieve"],
    );
  });

  it("retains source actions and annotations but strips raw output, reasoning, and secrets", () => {
    const sanitized = sanitizeAutonomousResponseForEvidence({
      ...completedSimulatedResponse(),
      request: { headers: { authorization: "Bearer secret" }, input: "private prompt" },
      output: [
        {
          id: "ws_1",
          type: "web_search_call",
          status: "completed",
          action: {
            type: "search",
            query: "example query",
            sources: [{ url: "https://example.com/products/m1" }],
          },
        },
        { type: "reasoning", summary: [{ text: "private reasoning" }] },
        {
          id: "msg_1",
          type: "message",
          status: "completed",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "private model output",
              annotations: [
                { type: "url_citation", url: "https://example.com/products/m1" },
              ],
            },
          ],
        },
      ],
    });
    const serialized = JSON.stringify(sanitized);
    assert.match(serialized, /example query/);
    assert.match(serialized, /url_citation/);
    for (const forbidden of ["private prompt", "Bearer secret", "private reasoning", "private model output"]) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
  });

  it("fails every interpreter boundary safely without browsing or retrying", async () => {
    const originalRequest = {
      query: "vacuum",
      priorities: "Must handle dog hair",
      avoid: "corded models",
    };
    const deterministicRequest = buildNormalizedShopperRequest(originalRequest);
    const validOutput = {
      version: "oai-interpreter-v1",
      product_category: "vacuum",
      budget_text: null,
      hard_requirements: ["Feature: Dog Hair"],
      preferences: [],
      avoid: ["Avoid corded models"],
      assumptions: [],
      unresolved_questions: [],
    };
    const cases = [
      [{ id: "int_1", status: "incomplete" }, "incomplete_response"],
      [{ id: "int_1", status: "failed" }, "terminal_failure"],
      [
        {
          id: "int_1",
          status: "completed",
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        },
        "refusal",
      ],
      [
        {
          id: "int_1",
          status: "completed",
          output_text: JSON.stringify(validOutput),
          output: [{ type: "web_search_call" }],
        },
        "unexpected_web_search",
      ],
      [{ id: "int_1", status: "completed", output: [] }, "missing_output_text"],
      [
        { id: "int_1", status: "completed", output_text: "{", output: [] },
        "invalid_json",
      ],
      [
        {
          id: "int_1",
          status: "completed",
          output_text: JSON.stringify({ ...validOutput, extra: true }),
          output: [],
        },
        "schema_invalid",
      ],
      [
        {
          id: "int_1",
          status: "completed",
          output_text: JSON.stringify({ ...validOutput, product_category: "air purifier" }),
          output: [],
        },
        "interpreter_meaning_changed",
      ],
    ];

    for (const [response, expectedReason] of cases) {
      const simulation = createScriptedResponsesClient({ createResponse: response });
      const result = await runRequirementInterpreter({
        client: simulation.client,
        originalRequest,
        deterministicRequest,
        config: interpreterConfig,
      });
      assert.equal(result.ok, false, expectedReason);
      assert.equal(result.reason, expectedReason);
      assert.deepEqual(simulation.calls.map((call) => call.method), ["create"]);
      assert.equal("tools" in simulation.calls[0].body, false);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cancelTwoLayerRecommendationJob,
  runRecommendationRequest,
} from "../lib/recommendationClient.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("OAI-T4B browser recommendation lifecycle", () => {
  it("keeps a legacy response to one unchanged POST", async () => {
    const calls = [];
    const result = await runRecommendationRequest({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return jsonResponse({ result: { marker: "legacy" } });
      },
      payload: { query: "vacuum" },
      signal: new AbortController().signal,
    });

    assert.deepEqual(result, {
      pipeline: "legacy",
      result: { marker: "legacy" },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/recommendations");
    assert.equal(calls[0].init.method, "POST");
  });

  it("uses one POST and polls only the returned signed job", async () => {
    const calls = [];
    const pending = [];
    const responses = [
      jsonResponse(
        {
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "pending",
          status: "queued",
          jobToken: "signed-job-token",
          pollAfterMs: 2_000,
          expiresAtMs: 1_789_000_600_000,
        },
        202,
      ),
      jsonResponse(
        {
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "pending",
          status: "in_progress",
          jobToken: "signed-job-token",
          pollAfterMs: 2_000,
          expiresAtMs: 1_789_000_600_000,
        },
        202,
      ),
      jsonResponse({
        pipeline: "two_layer",
        version: "oai-two-layer-api-v1",
        state: "completed",
        presentationVersion: "oai-two-layer-presentation-v1",
        cards: [{ key: "example" }],
        sources: [{ id: "s1", label: "Official product", title: "Example", url: "https://example.com" }],
      }),
    ];
    const result = await runRecommendationRequest({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return responses.shift();
      },
      now: () => 1_789_000_000_000,
      onTwoLayerPending: (state) => pending.push(state),
      payload: { query: "vacuum" },
      signal: new AbortController().signal,
      sleep: async () => {},
    });

    assert.equal(result.pipeline, "two_layer");
    assert.equal(result.cards[0].key, "example");
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map((call) => call.init.method), ["POST", "GET", "GET"]);
    assert.match(calls[1].url, /job=signed-job-token/);
    assert.equal(calls[1].url, calls[2].url);
    assert.deepEqual(pending.map((state) => state.status), ["queued", "in_progress"]);
  });

  it("stops on malformed or failed responses without retrying", async () => {
    for (const response of [
      jsonResponse({ unexpected: true }),
      jsonResponse(
        {
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "failed",
          code: "research_failed",
          error: "Research failed safely.",
        },
        502,
      ),
    ]) {
      let calls = 0;
      await assert.rejects(
        () =>
          runRecommendationRequest({
            fetchImpl: async () => {
              calls += 1;
              return response;
            },
            payload: { query: "vacuum" },
            signal: new AbortController().signal,
          }),
        /Research failed safely|unexpected response/i,
      );
      assert.equal(calls, 1);
    }
  });

  it("sends one independent DELETE for a known job token", async () => {
    const calls = [];
    const result = await cancelTwoLayerRecommendationJob({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return jsonResponse({
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "cancelled",
          status: "cancelled",
        });
      },
      jobToken: "signed-job-token",
    });

    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, "DELETE");
  });
});

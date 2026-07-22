import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runDirectTerraRecommendationRequest } from "../lib/directTerraClient.ts";

describe("direct Terra V2 browser lifecycle", () => {
  it("uses only the V2 endpoint and preserves the completed report", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      if (calls.length === 1) {
        return Response.json(
          {
            pipeline: "direct_terra",
            version: "direct-terra-api-v3",
            state: "pending",
            status: "in_progress",
            jobToken: "opaque-job-token",
            pollAfterMs: 2_000,
            expiresAtMs: 10_000,
          },
          { status: 202 },
        );
      }
      return Response.json({
        pipeline: "direct_terra",
        version: "direct-terra-api-v3",
        state: "completed",
        reportMarkdown: "# Exact Terra report",
        citationUrls: ["https://example.com/a"],
        sourceHosts: ["example.com"],
        productAssets: [],
        disabledCitationCount: 1,
        priceEstimates: [
          {
            rank: 1,
            brand: "Example",
            model: "Model A",
            currency: "USD",
            low: 399,
            high: 449,
            median: 424,
            sourceCount: 2,
          },
        ],
        rejectedPriceObservationCount: 0,
        transactionalStatus: "unverified",
      });
    };

    const result = await runDirectTerraRecommendationRequest({
      payload: { query: "refrigerator" },
      signal: new AbortController().signal,
      fetchImpl,
      now: () => 0,
      sleep: async () => {},
    });

    assert.equal(result.reportMarkdown, "# Exact Terra report");
    assert.equal(result.disabledCitationCount, 1);
    assert.equal(result.priceEstimates[0].median, 424);
    assert.equal(calls[0].url, "/api/recommendations-v2");
    assert.equal(calls[1].url, "/api/recommendations-v2");
    assert.equal(calls.some((call) => call.url === "/api/recommendations"), false);
  });

  it("cancels a known provider job when polling exits before completion", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      if (init.method === "POST") {
        return Response.json(
          {
            pipeline: "direct_terra",
            version: "direct-terra-api-v3",
            state: "pending",
            status: "in_progress",
            jobToken: "opaque-job-token",
            pollAfterMs: 2_000,
            expiresAtMs: 10_000,
          },
          { status: 202 },
        );
      }
      if (init.method === "DELETE") {
        return Response.json({
          pipeline: "direct_terra",
          version: "direct-terra-api-v3",
          state: "cancelled",
          status: "cancelled",
        });
      }
      return Response.json({ unexpected: true });
    };

    await assert.rejects(
      runDirectTerraRecommendationRequest({
        payload: { query: "refrigerator" },
        signal: new AbortController().signal,
        fetchImpl,
        now: () => 0,
        sleep: async () => {},
      }),
      /unexpected response/i,
    );

    assert.deepEqual(
      calls.map((call) => call.init.method),
      ["POST", "GET", "DELETE"],
    );
  });

  it("cancels a known job when the pending observer fails", async () => {
    const methods = [];
    const fetchImpl = async (_url, init) => {
      methods.push(init.method);
      if (init.method === "POST") {
        return Response.json(
          {
            pipeline: "direct_terra",
            version: "direct-terra-api-v3",
            state: "pending",
            status: "in_progress",
            jobToken: "opaque-job-token",
            pollAfterMs: 2_000,
            expiresAtMs: 10_000,
          },
          { status: 202 },
        );
      }
      return Response.json({
        pipeline: "direct_terra",
        version: "direct-terra-api-v3",
        state: "cancelled",
        status: "cancelled",
      });
    };

    await assert.rejects(
      runDirectTerraRecommendationRequest({
        payload: { query: "refrigerator" },
        signal: new AbortController().signal,
        fetchImpl,
        now: () => 0,
        sleep: async () => {},
        onPending: () => {
          throw new Error("observer failed");
        },
      }),
      /observer failed/,
    );

    assert.deepEqual(methods, ["POST", "DELETE"]);
  });
});

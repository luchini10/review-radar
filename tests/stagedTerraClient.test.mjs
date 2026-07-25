import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cancelRecommendationJob,
  runRecommendationRequest,
} from "../lib/recommendationClient.ts";
import {
  STAGED_TERRA_CLIENT_REQUEST_HEADER,
  STAGED_TERRA_JOB_TOKEN_HEADER,
} from "../lib/stagedTerraApiContract.ts";

describe("OAI-T10 staged Terra browser lifecycle", () => {
  it("selects staged mode, polls only its opaque job, and returns the public briefing", async () => {
    const requests = [];
    const fetchImpl = async (_url, options) => {
      requests.push(options);
      if (options.method === "POST") {
        return Response.json(
          {
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "pending",
            status: "queued",
            jobToken: "opaque-staged-token",
            pollAfterMs: 2_000,
            expiresAtMs: 100_000,
          },
          { status: 202 },
        );
      }
      return Response.json({
        pipeline: "staged_terra",
        version: "staged-terra-api-v1",
        state: "completed",
        presentationVersion: "staged-terra-presentation-v1",
        cards: [],
        sources: [],
        finalAdvice: ["Verified advice"],
      });
    };
    const result = await runRecommendationRequest({
      payload: { query: "cordless vacuum" },
      signal: new AbortController().signal,
      fetchImpl,
      now: () => 1_000,
      sleep: async () => {},
      stagedTerra: true,
    });
    assert.equal(result.pipeline, "staged_terra");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].headers[STAGED_TERRA_CLIENT_REQUEST_HEADER], "1");
    assert.equal(
      requests[1].headers[STAGED_TERRA_JOB_TOKEN_HEADER],
      "opaque-staged-token",
    );
  });

  it("cancels a staged job with only the staged token header", async () => {
    let options;
    const cancelled = await cancelRecommendationJob({
      jobToken: "opaque-staged-token",
      stagedTerra: true,
      fetchImpl: async (_url, requestOptions) => {
        options = requestOptions;
        return Response.json({
          pipeline: "staged_terra",
          version: "staged-terra-api-v1",
          state: "cancelled",
          status: "cancelled",
        });
      },
    });
    assert.equal(cancelled, true);
    assert.equal(
      options.headers[STAGED_TERRA_JOB_TOKEN_HEADER],
      "opaque-staged-token",
    );
    assert.equal(JSON.stringify(options).includes("resp_"), false);
  });

  it("cancels a known staged job when browser polling aborts", async () => {
    const methods = [];
    const controller = new AbortController();
    await assert.rejects(
      runRecommendationRequest({
        payload: { query: "cordless vacuum" },
        signal: controller.signal,
        stagedTerra: true,
        fetchImpl: async (_url, options) => {
          methods.push(options.method);
          if (options.method === "POST") {
            return Response.json(
              {
                pipeline: "staged_terra",
                version: "staged-terra-api-v1",
                state: "pending",
                status: "queued",
                jobToken: "opaque-staged-token",
                pollAfterMs: 2_000,
                expiresAtMs: 100_000,
              },
              { status: 202 },
            );
          }
          return Response.json({
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "cancelled",
            status: "cancelled",
          });
        },
        now: () => 1_000,
        sleep: async () => {
          controller.abort();
          throw new DOMException("aborted", "AbortError");
        },
      }),
      { name: "AbortError" },
    );
    assert.deepEqual(methods, ["POST", "DELETE"]);
  });
});

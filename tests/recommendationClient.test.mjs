import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RecommendationClientError,
  runRecommendationRequest,
} from "../lib/recommendationClient.ts";

const result = {
  recommendations: [
    {
      category: "gaming monitor",
      imageUrl: null,
      name: "Dell G2724D",
      price: { amount: 199, currency: "USD" },
      productPageUrl: "https://www.dell.com/en-us/shop/dell-g2724d/apd/210-bhxc",
    },
  ],
};

describe("selection recommendation client", () => {
  it("uses one POST request and accepts only the minimal result", async () => {
    const controller = new AbortController();
    const calls = [];
    const response = await runRecommendationRequest({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return Response.json({ result });
      },
      payload: { query: "gaming monitor" },
      signal: controller.signal,
    });

    assert.deepEqual(response, result);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/recommendations");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.signal, controller.signal);
  });

  it("rejects report-shaped or malformed products", async () => {
    await assert.rejects(
      () =>
        runRecommendationRequest({
          fetchImpl: async () =>
            Response.json({
              result: {
                recommendations: [
                  {
                    name: "Legacy report item",
                    unexpected_report_field: "Generated prose",
                  },
                ],
              },
            }),
          payload: { query: "monitor" },
          signal: new AbortController().signal,
        }),
      RecommendationClientError,
    );
  });

  it("surfaces a safe server error and malformed JSON response", async () => {
    await assert.rejects(
      () =>
        runRecommendationRequest({
          fetchImpl: async () =>
            Response.json({ error: "Search is temporarily unavailable." }, { status: 502 }),
          payload: { query: "monitor" },
          signal: new AbortController().signal,
        }),
      /temporarily unavailable/,
    );
    await assert.rejects(
      () =>
        runRecommendationRequest({
          fetchImpl: async () =>
            new Response("<html>error</html>", {
              headers: { "content-type": "text/html" },
              status: 502,
            }),
          payload: { query: "monitor" },
          signal: new AbortController().signal,
        }),
      /unexpected response/,
    );
  });
});

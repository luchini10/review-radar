import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RecommendationClientError,
  runRecommendationRequest,
} from "../lib/recommendationClient.ts";

const result = {
  recommendations: [
    {
      name: "Dell G2724D",
      productPageUrl: "https://www.dell.com/en-us/shop/dell-g2724d/apd/210-bhxc",
    },
  ],
};

describe("selection recommendation client", () => {
  it("accepts a valid optional image while keeping its product name and original link", async () => {
    const image = { url: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:example", sourceUrl: "https://example.com/monitor", sourceTitle: "Dell G2724D", productId: "12345" };
    const response = await runRecommendationRequest({
      fetchImpl: async () => Response.json({ result: { recommendations: [{ ...result.recommendations[0], image }] } }),
      payload: { query: "monitor" }, signal: new AbortController().signal,
    });
    assert.deepEqual(response.recommendations, [{ ...result.recommendations[0], image }]);
  });

  it("discards malformed optional images without discarding valid products", async () => {
    for (const image of [null, "https://example.com/photo.jpg", {},
      { url: "http://localhost/image", sourceUrl: "https://example.com/monitor", sourceTitle: "Dell G2724D" },
      { url: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:x", sourceUrl: "https://example.com/monitor" },
    ]) {
      const response = await runRecommendationRequest({
        fetchImpl: async () => Response.json({ result: { recommendations: [{ ...result.recommendations[0], image }] } }),
        payload: { query: "monitor" }, signal: new AbortController().signal,
      });
      assert.deepEqual(response, result);
    }
  });

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

  it("rejects unsafe links, obsolete fields and oversized shortlists", async () => {
    const product = result.recommendations[0];
    for (const recommendations of [
      [{ ...product, productPageUrl: "javascript:alert(1)" }],
      [{ ...product, productPageUrl: "https://user:secret@example.com/item" }],
      [{ ...product, price: null }],
      [{ ...product, name: " " }],
      Array.from({ length: 6 }, () => product),
    ]) {
      await assert.rejects(() => runRecommendationRequest({
        fetchImpl: async () => Response.json({ result: { recommendations } }),
        payload: { query: "monitor" }, signal: new AbortController().signal,
      }), RecommendationClientError);
    }
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

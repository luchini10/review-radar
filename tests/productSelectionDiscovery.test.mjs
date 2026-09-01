import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { selectProducts } from "../lib/productSelection.ts";

const originalApiKey = process.env.SERPER_API_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = originalApiKey;
});

describe("market-quality discovery orchestration", () => {
  it("builds the scout plan from a bounded current-commerce roster", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let serperCalls = 0;
    let observedCandidates = null;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("google.serper.dev")) {
        serperCalls += 1;
        const request = JSON.parse(init.body);
        return new Response(
          JSON.stringify({
            shopping:
              request.q === "robot vacuum $300"
                ? [
                    {
                      extractedPrice: 249,
                      link: "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
                      offers: "8+",
                      position: 1,
                      productId: "123",
                      rating: 4.6,
                      ratingCount: 1200,
                      source: "Home Depot",
                      title: "Alpha A100 Robot Vacuum",
                    },
                  ]
                : [],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response("unavailable", { status: 503 });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: async (candidates) => {
        observedCandidates = candidates;
        assert.equal(serperCalls, 3);
        return { queries: [], targets: [] };
      },
    });

    assert.deepEqual(observedCandidates, [
      {
        brand: "Alpha",
        modelIdentifiers: ["a100"],
        name: "Alpha A100 Robot Vacuum",
        offerCount: 8,
        position: 1,
        price: 249,
        rating: 4.6,
        ratingCount: 1200,
        retailer: "Home Depot",
      },
    ]);
    assert.equal(selected.telemetry.logicalSearchCalls, 3);
  });

  it("starts all three neutral Shopping searches while the scout plan is pending", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let finishPlan;
    let markThreeSearchesStarted;
    let fetchCalls = 0;
    const threeSearchesStarted = new Promise((resolve) => {
      markThreeSearchesStarted = resolve;
    });
    const pendingPlan = new Promise((resolve) => {
      finishPlan = resolve;
    });
    globalThis.fetch = async () => {
      fetchCalls += 1;
      if (fetchCalls === 3) markThreeSearchesStarted();
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selectionPromise = selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: pendingPlan,
    });

    await threeSearchesStarted;
    assert.equal(fetchCalls, 3);
    finishPlan({
      queries: [],
      targets: [],
    });
    const selected = await selectionPromise;

    assert.equal(selected.telemetry.logicalSearchCalls, 3);
    assert.deepEqual(selected.telemetry.marketTargetQueries, []);
    assert.deepEqual(selected.telemetry.marketTargets, []);
    assert.deepEqual(selected.telemetry.returnedCandidateSignals, []);
    assert.equal(selected.result.recommendations.length, 0);
  });

  it("adds no more than three exact Shopping searches and three strong-target page searches", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const targets = ["A100", "B200", "C300", "D400", "E500"].map(
      (model, consensusOrder) => ({
        aliases: [],
        brand: `Brand${consensusOrder}`,
        consensusOrder,
        evidenceTier: "strong",
        model,
        sourceUrls: ["https://www.rtings.com/example"],
      }),
    );

    const selected = await selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: { queries: [], targets },
    });

    assert.equal(fetchCalls, 9);
    assert.equal(selected.telemetry.neutralQueries.length, 3);
    assert.equal(selected.telemetry.marketTargetQueries.length, 3);
    assert.equal(selected.telemetry.logicalSearchCalls, 9);
    assert.equal(selected.telemetry.resolutionQueries.length, 3);
    assert.deepEqual(
      selected.telemetry.marketTargets.map(({ model, tier }) => ({ model, tier })),
      targets.map(({ model }) => ({ model, tier: "strong" })),
    );
    assert.deepEqual(
      selected.telemetry.marketTargetQueries.map((query) => query.split(" ")[1]),
      ["A100", "B200", "C300"],
    );
  });

  it("attaches strong evidence to an exact target recovered by page search", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url) => {
      const endpoint = String(url);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link: "https://127.0.0.1/products/alpha-a100",
                snippet: "Self-emptying robot vacuum",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.equal(selected.telemetry.logicalSearchCalls, 5);
    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.equal(selected.telemetry.rankedCandidates[0].evidenceTier, "strong");
    assert.deepEqual(selected.telemetry.resolutionQueries, [
      "Alpha A100 robot vacuum",
    ]);
    assert.equal(selected.result.recommendations.length, 0);
  });

  it("does not let an aggregate Shopping hit suppress exact product-page recovery", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link: "https://www.examplestore.com/products/alpha-a100",
                snippet: "Current Alpha A100 robot vacuum product page",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "Alpha A100 robot vacuum") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&q=alpha+a100",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.deepEqual(selected.telemetry.marketTargetQueries, [
      "Alpha A100 robot vacuum",
    ]);
    assert.ok(
      selected.telemetry.resolutionQueries.includes(
        "Alpha a100 robot vacuum Example Store product page",
      ),
    );
    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.ok(
      selected.telemetry.rankedCandidates.some(
        (candidate) =>
          candidate.evidenceTier === "strong" &&
          candidate.price === 249 &&
          candidate.productUrl ===
            "https://www.examplestore.com/products/alpha-a100" &&
          candidate.retailer === "Example Store",
      ),
    );
    assert.ok(selected.telemetry.logicalSearchCalls <= 15);
  });

  it("recovers a strong target from an inline direct Shopping offer without another call", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 239,
                link: "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
                productId: "222",
                rating: 4.7,
                ratingCount: 800,
                source: "Home Depot",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "Alpha A100 robot vacuum") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:111",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.ok(
      selected.telemetry.rankedCandidates.some(
        (candidate) =>
          candidate.evidenceTier === "strong" &&
          candidate.price === 239 &&
          candidate.productUrl ===
            "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
      ),
    );
    assert.ok(selected.telemetry.logicalSearchCalls <= 9);
  });

  it("rejects a non-new condition exposed only by the resolved product URL", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link:
                  "https://www.examplestore.com/products/alpha-a100-reconditioned",
                snippet: "Current Alpha A100 robot vacuum product page",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "robot vacuum $300") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&q=alpha+a100",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: { queries: [], targets: [] },
    });

    assert.equal(selected.telemetry.rejectedByCondition, 1);
    assert.deepEqual(selected.result.recommendations, []);
  });
});

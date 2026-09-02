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
  it("starts both neutral Shopping paths while the scout plan is pending", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let finishPlan;
    let markTwoSearchesStarted;
    let fetchCalls = 0;
    const twoSearchesStarted = new Promise((resolve) => {
      markTwoSearchesStarted = resolve;
    });
    const pendingPlan = new Promise((resolve) => {
      finishPlan = resolve;
    });
    globalThis.fetch = async () => {
      fetchCalls += 1;
      if (fetchCalls === 2) markTwoSearchesStarted();
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

    await twoSearchesStarted;
    assert.equal(fetchCalls, 2);
    finishPlan({
      queries: [],
      targets: [],
    });
    const selected = await selectionPromise;

    assert.equal(selected.telemetry.logicalSearchCalls, 2);
    assert.deepEqual(selected.telemetry.marketTargetQueries, []);
    assert.deepEqual(selected.telemetry.marketTargets, []);
    assert.deepEqual(selected.telemetry.returnedCandidateSignals, []);
    assert.equal(selected.result.recommendations.length, 0);
  });

  it("uses two neutral, four exact-target, and at most three target-page searches", async () => {
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
        discoveryPath: [
          "market_leader",
          "request_fit",
          "coverage_gap",
          "market_leader",
          "request_fit",
        ][consensusOrder],
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
      plan: { targets },
    });

    assert.equal(fetchCalls, 9);
    assert.equal(selected.telemetry.neutralQueries.length, 2);
    assert.equal(selected.telemetry.marketTargetQueries.length, 4);
    assert.equal(selected.telemetry.logicalSearchCalls, 9);
    assert.equal(selected.telemetry.resolutionQueries.length, 3);
    assert.deepEqual(
      selected.telemetry.marketTargets.map(({ model, tier }) => ({ model, tier })),
      targets.map(({ model }) => ({ model, tier: "strong" })),
    );
    assert.deepEqual(
      selected.telemetry.marketTargetQueries.map((query) => query.split(" ")[1]),
      ["A100", "B200", "C300", "D400"],
    );
    assert.equal(
      selected.telemetry.discoveryStopReason,
      "expected_target_search_limit",
    );
    assert.deepEqual(
      selected.telemetry.expectedTargetCoverage.map(({ model, status }) => ({
        model,
        status,
      })),
      [
        { model: "A100", status: "missing_after_target_search" },
        { model: "B200", status: "missing_after_target_search" },
        { model: "C300", status: "missing_after_target_search" },
        { model: "D400", status: "missing_after_target_search" },
        { model: "E500", status: "missing_not_searched_limit" },
      ],
    );
    assert.deepEqual(
      selected.telemetry.discoveryPathContributions.map(
        ({ path, queries }) => ({ path, queries: queries.length }),
      ),
      [
        { path: "broad_commerce", queries: 1 },
        { path: "request_fit_commerce", queries: 1 },
        { path: "expected_target_commerce", queries: 4 },
        { path: "expected_target_page", queries: 3 },
      ],
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
                link: "https://www.alpha.com/products/alpha-a100",
                snippet: "Self-emptying robot vacuum",
                title: "Alpha A100 Robot Vacuum",
              },
              {
                link:
                  "https://www.consumerreports.org/appliances/robot-vacuums/alpha-a100/m123456/",
                snippet: "Independent test result",
                title: "Alpha A100 Robot Vacuum Review",
              },
              {
                link: "https://device.report/manual/alpha-a100",
                snippet: "Owner manual",
                title: "Alpha A100 Robot Vacuum Manual",
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

    assert.equal(selected.telemetry.logicalSearchCalls, 4);
    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.equal(selected.telemetry.rankedCandidates[0].evidenceTier, "strong");
    assert.deepEqual(selected.telemetry.resolutionQueries, [
      "Alpha A100 robot vacuum",
    ]);
    assert.deepEqual(
      selected.telemetry.resolutionDiagnostics[0].pageCandidates.map(
        ({ score }) => score,
      ),
      [1, 0, 0],
    );
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
      plan: { targets: [] },
    });

    assert.equal(selected.telemetry.rejectedByCondition, 1);
    assert.deepEqual(selected.result.recommendations, []);
  });
});

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
});

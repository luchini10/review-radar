import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { productSelectionTestExports } from "../lib/productSelection.ts";

const benchmarkPath = new URL(
  "./benchmarks/pr13-market-leaders-v2026-09a.json",
  import.meta.url,
);
const liveAccuracyBenchmarkPath = new URL(
  "./benchmarks/pr14-live-accuracy-v2026-09a.json",
  import.meta.url,
);

async function benchmark() {
  return JSON.parse(await readFile(benchmarkPath, "utf8"));
}

async function liveAccuracyBenchmark() {
  return JSON.parse(await readFile(liveAccuracyBenchmarkPath, "utf8"));
}

describe("PR-13 market-leader benchmark", () => {
  it("freezes one independently sourced exact leader for all eight cases", async () => {
    const value = await benchmark();

    assert.equal(value.version, "leaders-v2026-09a");
    assert.equal(value.frozenAt, "2026-09-01");
    assert.equal(value.market, "US");
    assert.equal(value.cases.length, 8);
    assert.equal(new Set(value.cases.map((entry) => entry.id)).size, 8);

    for (const entry of value.cases) {
      assert.equal(typeof entry.request.query, "string");
      assert.equal(typeof entry.request.budget, "string");
      assert.equal(typeof entry.request.priorities, "string");
      assert.equal(entry.leaders.length, 1);

      const leader = entry.leaders[0];
      assert.ok(leader.brand.trim());
      assert.ok(leader.model.trim());
      assert.ok(Array.isArray(leader.aliases));
      assert.ok(leader.sourceUrls.length >= 2);
      assert.ok(leader.comparativeSourceUrls.length >= 1);
      assert.ok(
        leader.comparativeSourceUrls.every((url) =>
          leader.sourceUrls.includes(url),
        ),
      );

      const domains = leader.sourceUrls.map(
        (url) => new URL(url).hostname.toLowerCase().replace(/^www\./, ""),
      );
      assert.equal(new Set(domains).size, domains.length);
      assert.ok(leader.sourceUrls.every((url) => new URL(url).protocol === "https:"));
    }
  });

  it("can attach every frozen exact leader without giving the registry runtime authority", async () => {
    const value = await benchmark();

    for (const entry of value.cases) {
      const leader = entry.leaders[0];
      const candidate = {
        availableColors: [],
        brand: leader.brand,
        category: entry.request.query,
        dimensions: {
          depth: null,
          height: null,
          unit: null,
          width: null,
        },
        evidenceSources: [],
        id: entry.id,
        imageUrl: null,
        keySpecs: [],
        name: `${leader.brand} ${leader.model} ${entry.request.query}`,
        price: 1,
        productUrl: "https://shop.example/products/exact-model",
      };
      const target = {
        aliases: leader.aliases,
        brand: leader.brand,
        consensusOrder: 0,
        evidenceTier: "strong",
        model: leader.model,
        sourceUrls: leader.sourceUrls,
      };
      const [attached] = productSelectionTestExports.attachMarketEvidence(
        [candidate],
        [target],
      );

      assert.equal(
        attached.marketEvidence?.targetModel,
        leader.model,
        `${entry.id} exact leader did not bind`,
      );
    }
  });
});

describe("request-time live-accuracy benchmark", () => {
  it("freezes independent broad and constrained evidence before live QA", async () => {
    const value = await liveAccuracyBenchmark();

    assert.equal(value.version, "live-accuracy-v2026-09a");
    assert.equal(value.frozenAt, "2026-09-01");
    assert.equal(value.market, "US");
    assert.equal(value.rounds, 1);
    assert.equal(value.acceptance.maximumLatencyMs, 30_000);
    assert.equal(value.acceptance.maximumP95LatencyMs, 25_000);
    assert.equal(value.cases.length, 10);
    assert.equal(new Set(value.cases.map((entry) => entry.id)).size, 10);
    assert.equal(value.cases.filter((entry) => entry.kind === "broad").length, 5);
    assert.equal(
      value.cases.filter((entry) => entry.kind === "constrained").length,
      5,
    );

    for (const entry of value.cases) {
      assert.ok(entry.request.query.trim());
      assert.ok(entry.request.budget.trim());
      assert.equal(entry.leaders.length, 1);

      const leader = entry.leaders[0];
      assert.ok(leader.brand.trim());
      assert.ok(leader.model.trim());
      assert.ok(Array.isArray(leader.aliases));
      assert.ok(leader.sourceUrls.length >= 2);
      assert.ok(leader.comparativeSourceUrls.length >= 1);
      assert.ok(
        leader.comparativeSourceUrls.every((url) =>
          leader.sourceUrls.includes(url),
        ),
      );

      const domains = leader.sourceUrls.map(
        (url) => new URL(url).hostname.toLowerCase().replace(/^www\./, ""),
      );
      assert.equal(new Set(domains).size, domains.length);
      assert.ok(leader.sourceUrls.every((url) => new URL(url).protocol === "https:"));
    }
  });

  it("keeps each frozen leader attachable only by exact product identity", async () => {
    const value = await liveAccuracyBenchmark();

    for (const entry of value.cases) {
      const leader = entry.leaders[0];
      const target = {
        aliases: leader.aliases,
        brand: leader.brand,
        consensusOrder: 0,
        evidenceTier: "strong",
        model: leader.model,
        sourceUrls: leader.sourceUrls,
      };
      const candidate = {
        availableColors: [],
        brand: leader.brand,
        category: entry.request.query,
        dimensions: { depth: null, height: null, unit: null, width: null },
        evidenceSources: [],
        id: entry.id,
        imageUrl: null,
        keySpecs: [],
        name: `${leader.brand} ${leader.model} ${entry.request.query}`,
        price: 1,
        productUrl: "https://shop.example/products/exact-model",
      };
      const sibling = {
        ...candidate,
        id: `${entry.id}-sibling`,
        name: `${leader.brand} unrelated-sibling-999 ${entry.request.query}`,
      };
      const [attached, isolatedSibling] =
        productSelectionTestExports.attachMarketEvidence(
          [candidate, sibling],
          [target],
        );

      assert.equal(attached.marketEvidence?.targetModel, leader.model);
      assert.equal(Boolean(isolatedSibling.marketEvidence), false);
    }
  });
});

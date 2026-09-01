import assert from "node:assert/strict";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  clearMarketEvidenceIndexStateForTests,
  lookupMarketEvidence,
  MARKET_EVIDENCE_FRESH_MS,
  MARKET_EVIDENCE_INDEX_VERSION,
  marketEvidenceIndexTestExports,
  refreshMarketEvidenceIndex,
} from "../lib/marketEvidenceIndex.ts";
import {
  MARKET_SCOUT_MODEL,
  MARKET_SCOUT_PROMPT_VERSION,
} from "../lib/marketScout.ts";

const input = {
  budget: "$300",
  priorities: "must be self-emptying",
  query: "robot vacuum",
};
const rtings = "https://www.rtings.com/vacuum/reviews/example/model-pro";
const reviewed = "https://www.reviewed.com/vacuums/content/example-model-review";

let temporaryDirectory;
let indexPath;

function responseWith({ targets, urls = [rtings, reviewed] } = {}) {
  return {
    output: [
      {
        action: {
          sources: urls.map((url) => ({ type: "url", url })),
          type: "search",
        },
        status: "completed",
        type: "web_search_call",
      },
    ],
    output_text: JSON.stringify({
      targets: targets || [
        {
          aliases: ["Example Pro"],
          brand: "Example",
          model: "Model Pro",
          sourceUrls: urls,
        },
      ],
    }),
    status: "completed",
    usage: { input_tokens: 200, output_tokens: 50, total_tokens: 250 },
  };
}

function clientReturning(response, calls = []) {
  return {
    responses: {
      async create(options, requestOptions) {
        calls.push({ options, requestOptions });
        return response;
      },
    },
  };
}

beforeEach(async () => {
  clearCacheForTests();
  clearMarketEvidenceIndexStateForTests();
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), "reviewradar-market-index-"));
  indexPath = path.join(temporaryDirectory, "market-evidence-index.json");
});

afterEach(async () => {
  await unlink(indexPath).catch(() => {});
  await rmdir(temporaryDirectory).catch(() => {});
});

describe("market evidence index", () => {
  it("returns deterministic discovery with no quality boost on a cold miss", async () => {
    const result = await lookupMarketEvidence({ indexPath, input });

    assert.equal(result.needsRefresh, true);
    assert.deepEqual(result.plan.targets, []);
    assert.equal(result.telemetry.indexStatus, "miss");
    assert.equal(result.telemetry.fallbackReason, "index_miss");
    assert.equal(result.telemetry.openAiCalls, 0);
  });

  it("persists only a hashed request key and validated source-bound targets", async () => {
    const now = 1_800_000_000_000;
    const refreshed = await refreshMarketEvidenceIndex({
      client: clientReturning(responseWith()),
      force: true,
      indexPath,
      input,
      now: () => now,
    });
    const stored = await readFile(indexPath, "utf8");
    const lookedUp = await lookupMarketEvidence({
      indexPath,
      input,
      now: () => now + 1_000,
    });

    assert.equal(refreshed.status, "updated");
    assert.doesNotMatch(stored, /robot vacuum|self-emptying|\$300/i);
    assert.equal(lookedUp.needsRefresh, false);
    assert.equal(lookedUp.telemetry.indexStatus, "fresh");
    assert.equal(lookedUp.telemetry.indexAgeMs, 1_000);
    assert.equal(lookedUp.telemetry.openAiCalls, 0);
    assert.deepEqual(lookedUp.telemetry.indexedResearch, {
      acceptedSourceUrls: 2,
      evidenceTiers: { none: 0, strong: 1, supported: 0 },
      hostedSearchCalls: 1,
      inputTokens: 200,
      openAiCalls: 1,
      outputTokens: 50,
      totalTokens: 250,
    });
    assert.equal(lookedUp.plan.targets[0].evidenceTier, "strong");
    assert.deepEqual(lookedUp.plan.targets[0].sourceUrls, [
      "https://rtings.com/vacuum/reviews/example/model-pro",
      "https://reviewed.com/vacuums/content/example-model-review",
    ]);
  });

  it("fails closed when an entry reaches the 24-hour freshness boundary", async () => {
    const now = 1_800_000_000_000;
    await refreshMarketEvidenceIndex({
      client: clientReturning(responseWith()),
      force: true,
      indexPath,
      input,
      now: () => now,
    });
    const result = await lookupMarketEvidence({
      indexPath,
      input,
      now: () => now + MARKET_EVIDENCE_FRESH_MS,
    });

    assert.deepEqual(result.plan.targets, []);
    assert.equal(result.needsRefresh, true);
    assert.equal(result.telemetry.indexStatus, "stale");
    assert.equal(result.telemetry.fallbackReason, "index_stale");
  });

  it("rejects malformed index data instead of trusting persisted tiers", async () => {
    await writeFile(indexPath, "{\"version\":1,\"entries\":[]}", "utf8");
    const result = await lookupMarketEvidence({ indexPath, input });

    assert.deepEqual(result.plan.targets, []);
    assert.equal(result.telemetry.indexStatus, "invalid");
    assert.equal(result.telemetry.fallbackReason, "index_invalid");
  });

  it("recomputes persisted source tiers and drops unsupported targets", async () => {
    const key = marketEvidenceIndexTestExports.marketEvidenceKey(input);
    await writeFile(
      indexPath,
      JSON.stringify({
        entries: {
          [key]: {
            createdAtMs: Date.now(),
            model: MARKET_SCOUT_MODEL,
            promptVersion: MARKET_SCOUT_PROMPT_VERSION,
            research: {
              acceptedSourceUrls: 1,
              evidenceTiers: { none: 0, strong: 1, supported: 0 },
              hostedSearchCalls: 1,
              inputTokens: 100,
              openAiCalls: 1,
              outputTokens: 20,
              totalTokens: 120,
            },
            targets: [
              {
                aliases: [],
                brand: "Example",
                consensusOrder: 0,
                evidenceTier: "strong",
                model: "Model Pro",
                sourceUrls: ["https://www.amazon.com/dp/B000000000"],
              },
            ],
          },
        },
        version: MARKET_EVIDENCE_INDEX_VERSION,
      }),
      "utf8",
    );
    const result = await lookupMarketEvidence({ indexPath, input });

    assert.deepEqual(result.plan.targets, []);
    assert.equal(result.telemetry.indexStatus, "invalid");
  });

  it("does not overwrite a valid entry when a later refresh lacks evidence", async () => {
    const now = 1_800_000_000_000;
    await refreshMarketEvidenceIndex({
      client: clientReturning(responseWith()),
      force: true,
      indexPath,
      input,
      now: () => now,
    });
    const before = await readFile(indexPath, "utf8");
    clearCacheForTests();
    const failed = await refreshMarketEvidenceIndex({
      client: clientReturning(
        responseWith({ urls: ["https://www.amazon.com/dp/B000000000"] }),
      ),
      force: true,
      indexPath,
      input,
      now: () => now + 5_000,
    });

    assert.equal(failed.status, "failed");
    assert.equal(await readFile(indexPath, "utf8"), before);
  });

  it("coalesces concurrent refreshes and throttles repeated failures", async () => {
    let finishProvider;
    let calls = 0;
    const provider = new Promise((resolve) => {
      finishProvider = resolve;
    });
    const client = {
      responses: {
        async create() {
          calls += 1;
          return provider;
        },
      },
    };
    const first = refreshMarketEvidenceIndex({ client, indexPath, input });
    const second = refreshMarketEvidenceIndex({ client, indexPath, input });
    finishProvider(responseWith());
    const [firstResult, secondResult] = await Promise.all([first, second]);
    const throttled = await refreshMarketEvidenceIndex({ client, indexPath, input });

    assert.equal(calls, 1);
    assert.equal(firstResult.status, "updated");
    assert.equal(secondResult.status, "updated");
    assert.equal(throttled.status, "throttled");
  });

  it("admits only one background refresh across different request keys", async () => {
    let finishProvider;
    const provider = new Promise((resolve) => {
      finishProvider = resolve;
    });
    const client = {
      responses: {
        async create() {
          return provider;
        },
      },
    };
    const first = refreshMarketEvidenceIndex({ client, indexPath, input });
    const busy = await refreshMarketEvidenceIndex({
      client,
      indexPath,
      input: { ...input, query: "gaming monitor" },
    });
    finishProvider(responseWith());
    await first;

    assert.equal(busy.status, "busy");
  });
});

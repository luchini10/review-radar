import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cacheStats,
  clearCacheForTests,
  createBoundedAsyncCache,
  getCachedOrLoad,
  normalizeCacheKey,
} from "../lib/cache.ts";

describe("shared async cache bounds", () => {
  it("normalizes equivalent inputs without delimiter collisions", () => {
    const first = normalizeCacheKey([
      " Test-Namespace  ",
      "Product",
      "UNDER $100",
    ]);
    assert.equal(
      first,
      normalizeCacheKey(["test-namespace", "product", "under $100"]),
    );
    assert.match(first, /^test-namespace\|[a-f0-9]{64}$/);
    assert.equal(first.includes("product"), false);
    assert.equal(first.includes("under $100"), false);
    assert.notEqual(
      normalizeCacheKey(["a|b", "c"]),
      normalizeCacheKey(["a", "b|c"]),
    );
  });

  it("coalesces identical concurrent misses", async () => {
    clearCacheForTests();
    let loaderCalls = 0;
    let release;
    const blocked = new Promise((resolve) => {
      release = resolve;
    });
    const loader = async () => {
      loaderCalls += 1;
      await blocked;
      return { value: "shared" };
    };

    const first = getCachedOrLoad("same-key", 60_000, loader);
    const second = getCachedOrLoad("same-key", 60_000, loader);
    await Promise.resolve();
    release();

    const values = await Promise.all([first, second]);
    assert.deepEqual(values, [{ value: "shared" }, { value: "shared" }]);
    assert.equal(loaderCalls, 1);
    assert.equal(cacheStats().entries, 1);
    clearCacheForTests();
  });

  it("does not retain zero-TTL entries", async () => {
    clearCacheForTests();

    for (let index = 0; index < 512; index += 1) {
      await getCachedOrLoad(`zero-ttl-${index}`, 0, async () => index);
    }

    assert.equal(cacheStats().entries, 0);
    clearCacheForTests();
  });

  it("evicts by bounded LRU order and expires entries deterministically", async () => {
    let currentTime = 1_000;
    const bounded = createBoundedAsyncCache({
      maxEntries: 2,
      now: () => currentTime,
    });
    const loads = new Map();
    const load = (key) => async () => {
      loads.set(key, (loads.get(key) ?? 0) + 1);
      return `${key}-${loads.get(key)}`;
    };

    await bounded.getCachedOrLoad("a", 100, load("a"));
    await bounded.getCachedOrLoad("b", 100, load("b"));
    await bounded.getCachedOrLoad("a", 100, load("a"));
    await bounded.getCachedOrLoad("c", 100, load("c"));
    assert.equal(bounded.stats().entries, 2);

    assert.equal(await bounded.getCachedOrLoad("b", 100, load("b")), "b-2");
    assert.equal(loads.get("a"), 1);
    assert.equal(loads.get("b"), 2);

    currentTime = 1_101;
    assert.equal(await bounded.getCachedOrLoad("b", 100, load("b")), "b-3");
    assert.equal(bounded.stats().entries, 1);
  });

  it("coalesces failures, clears in-flight state, and permits a clean retry", async () => {
    const bounded = createBoundedAsyncCache({ maxEntries: 2 });
    let attempts = 0;
    const fail = async () => {
      attempts += 1;
      throw new Error("expected failure");
    };

    const first = bounded.getCachedOrLoad("failure", 100, fail);
    const second = bounded.getCachedOrLoad("failure", 100, fail);
    await assert.rejects(() => Promise.all([first, second]), /expected failure/);
    assert.equal(attempts, 1);
    assert.deepEqual(bounded.stats(), {
      entries: 0,
      inFlight: 0,
      maxEntries: 2,
    });

    assert.equal(
      await bounded.getCachedOrLoad("failure", 100, async () => "recovered"),
      "recovered",
    );
  });
});

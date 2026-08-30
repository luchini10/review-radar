import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  searchSerperForProducts,
  searchSerperOrganic,
} from "../lib/search/serper.ts";

const CANONICAL_ENV_URL = new URL("../.env.example", import.meta.url);
const COMPATIBILITY_ENV_URL = new URL("../.env.local.example", import.meta.url);
const README_URL = new URL("../README.md", import.meta.url);
const EXPECTED_PUBLIC_KEYS = [
  "OPENAI_API_KEY",
  "SERPER_API_KEY",
  "SEARCH_DEPTH",
  "OPENAI_MODEL",
  "REVIEW_RADAR_PIPELINE_MODE",
  "REVIEW_RADAR_JOB_TOKEN_SECRET",
  "REVIEW_RADAR_PINNED_PLANNING",
  "REVIEW_RADAR_CONSTRAINT_ALLOCATION",
  "REVIEW_RADAR_NORMALIZATION_RECOVERY",
  "REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION",
  "REVIEW_RADAR_DIRECT_TERRA",
  "NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA",
  "REVIEW_RADAR_STAGED_TERRA",
  "NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA",
];
const DISABLED_KEY_CASES = [
  ["missing", undefined],
  ["empty", ""],
  ["whitespace", "   "],
  ["documented-placeholder", "your_serper_key_here"],
  ["case-folded-placeholder", " YOUR_SERPER_KEY_HERE "],
  ["api-key-placeholder", "your_serper_api_key_here"],
  ["replacement-placeholder", "replace_with_your_serper_api_key"],
  ["replace-me-placeholder", "replace_me"],
];

function restoreEnvironmentValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

async function withMockedSerperKey(key, callback) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.SERPER_API_KEY;
  const originalMaxAttempts = process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS;
  const originalNodeEnv = process.env.NODE_ENV;
  const calls = [];

  clearCacheForTests();
  if (key === undefined) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = key;
  process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS = "1";
  process.env.NODE_ENV = "test";
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ organic: [], shopping: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    return await callback(calls);
  } finally {
    clearCacheForTests();
    globalThis.fetch = originalFetch;
    restoreEnvironmentValue("SERPER_API_KEY", originalKey);
    restoreEnvironmentValue(
      "REVIEW_RADAR_MAX_SERPER_ATTEMPTS",
      originalMaxAttempts,
    );
    restoreEnvironmentValue("NODE_ENV", originalNodeEnv);
  }
}

describe("safe public Serper configuration", { concurrency: false }, () => {
  it("keeps one canonical public template with optional Serper disabled", async () => {
    const [canonical, compatibilityCopy, readme] = await Promise.all([
      readFile(CANONICAL_ENV_URL, "utf8"),
      readFile(COMPATIBILITY_ENV_URL, "utf8"),
      readFile(README_URL, "utf8"),
    ]);

    assert.equal(compatibilityCopy, canonical);
    const publicKeys = canonical
      .split(/\r?\n/)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map((line) => line.slice(0, line.indexOf("=")));

    assert.equal(publicKeys.length, EXPECTED_PUBLIC_KEYS.length);
    assert.equal(new Set(publicKeys).size, publicKeys.length);
    assert.deepEqual(
      [...publicKeys].sort(),
      [...EXPECTED_PUBLIC_KEYS].sort(),
    );
    assert.deepEqual(canonical.match(/^SERPER_API_KEY=.*$/gm), [
      "SERPER_API_KEY=",
    ]);
    assert.match(readme, /Copy-Item \.env\.example \.env\.local/);
    assert.match(readme, /\.env\.local\.example.*compatibility copy/i);
    assert.doesNotMatch(readme, /SERPER_API_KEY=your_serper_key_here/);
  });

  for (const [id, value] of DISABLED_KEY_CASES) {
    it(`stops ${id} before wrapper dispatch`, async () => {
      await withMockedSerperKey(value, async (calls) => {
        assert.deepEqual(
          await searchSerperOrganic(`configuration-wrapper-${id}`, "vacuum"),
          [],
        );
        assert.equal(calls.length, 0, `dispatched for ${JSON.stringify(value)}`);
      });
    });
  }

  for (const [id, value] of DISABLED_KEY_CASES.filter(
    ([caseId]) =>
      caseId === "documented-placeholder" ||
      caseId === "whitespace" ||
      caseId === "replace-me-placeholder",
  )) {
    it(`uses the same ${id} gate for product discovery`, async () => {
      await withMockedSerperKey(value, async (calls) => {
        const result = await searchSerperForProducts(
          [`configuration-discovery-${id}`],
          "vacuum",
        );

        assert.equal(result.stats.skippedReason, "missing_api_key");
        assert.equal(calls.length, 0, `dispatched for ${JSON.stringify(value)}`);
      });
    });
  }

  it("preserves an ordinary configured key and exact header value", async () => {
    const key = "synthetic-non-placeholder-serper-key";

    await withMockedSerperKey(key, async (calls) => {
      assert.deepEqual(
        await searchSerperOrganic("configuration-valid-control", "vacuum"),
        [],
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].init.headers["X-API-KEY"], key);
    });
  });

  it("does not reject an ordinary key that merely contains placeholder words", async () => {
    const key = "synthetic-replace_me-suffix";

    await withMockedSerperKey(key, async (calls) => {
      assert.deepEqual(
        await searchSerperOrganic("configuration-substring-control", "vacuum"),
        [],
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].init.headers["X-API-KEY"], key);
    });
  });
});

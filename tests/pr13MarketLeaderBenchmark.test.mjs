import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const benchmarkPath = new URL(
  "./benchmarks/pr13-market-leaders-v2026-09a.json",
  import.meta.url,
);

async function benchmark() {
  return JSON.parse(await readFile(benchmarkPath, "utf8"));
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
});

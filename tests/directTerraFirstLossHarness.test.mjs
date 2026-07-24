import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

describe("Direct-Terra first-loss diagnostic harness", () => {
  it("preflights exactly one run for each of four frozen cases with zero network", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        "scripts/run-oai-t8c-multi-category-validation.mjs",
        "--first-loss-diagnostic",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          SERPER_API_KEY: "",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.status, "preflight_passed");
    assert.equal(
      parsed.plan.schemaVersion,
      "oai-t8d-root-cause-diagnostic-plan-v1",
    );
    assert.equal(parsed.plan.mode, "dry-run");
    assert.equal(parsed.plan.cases.length, 4);
    assert.equal(parsed.plan.runsPerCase, 1);
    assert.equal(parsed.plan.totalCreates, 4);
    assert.equal(parsed.plan.ceilings.hardCeilingUsd, 5);
    assert.equal(parsed.plan.ceilings.hostedSearchesPerRun, 20);
    assert.equal(parsed.plan.ceilings.serperShoppingPerRun, 5);
    assert.equal(parsed.plan.ceilings.serperOrganicPerRun, 8);
    assert.equal(parsed.plan.ceilings.pageFetchesPerRun, 5);
  });
});

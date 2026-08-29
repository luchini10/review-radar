import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { agentLoopControllerTestExports } from "../scripts/agent-loop-controller.mjs";
import {
  loadBenchmarkManifest,
  loadTrackedBatchDefinitions,
  reconcileBenchmarkWorkerResult,
  reconcileBenchmarkWorkerResults,
  runBenchmarkCases,
  validateBatchMatrix,
} from "../scripts/qa-benchmark.mjs";
import { qaLoopVerifierTestExports } from "../scripts/verify-loop-result.mjs";

async function matrix() {
  const manifest = await loadBenchmarkManifest();
  const batches = await loadTrackedBatchDefinitions();
  return { batches, manifest };
}

function workerResult(batch, manifest) {
  return {
    batchName: batch.name,
    benchmark: runBenchmarkCases(manifest, batch.benchmarkCaseIds),
    command: { code: 0 },
    findings: [],
    mode: "deterministic-benchmark",
  };
}

function historicalFailingBroadResult(batch, manifest) {
  const result = workerResult(batch, manifest);
  const caseResult = result.benchmark.caseResults.find(
    (item) => item.caseId === "broad-running-mainstream",
  );
  caseResult.exactCandidateIds = caseResult.exactCandidateIds.filter(
    (candidateId) => candidateId !== "brooks-ghost-15",
  );
  caseResult.nearCandidateIds.push("brooks-ghost-15");
  const statusInvariant = caseResult.invariantResults.find(
    (invariant) => invariant.id === "trusted-mainstream-control-is-exact",
  );
  statusInvariant.actualStatus = "near";
  statusInvariant.passed = false;
  const countInvariant = caseResult.invariantResults.find(
    (invariant) => invariant.id === "broad-case-retains-an-exact-choice",
  );
  countInvariant.actual = caseResult.exactCandidateIds.length;
  caseResult.passed = false;
  result.benchmark.passed = false;
  result.benchmark.totals.casesPassed -= 1;
  result.benchmark.totals.invariantsPassed -= 1;
  result.command.code = 1;
  result.findings = [
    {
      exactMatchAffected: true,
      failureType: "offline_benchmark_invariant_failed",
      note: "broad-running-mainstream failed its trusted control invariant.",
      rootCause: "deterministic_benchmark_regression",
      severity: "high",
    },
  ];
  return result;
}

describe("tracked offline QA benchmark matrix", () => {
  it("assigns every required shape to one distinct named batch", async () => {
    const { batches, manifest } = await matrix();
    const summary = validateBatchMatrix(batches, manifest);

    assert.equal(summary.batchCount, 5);
    assert.equal(summary.caseCount, 10);
    assert.deepEqual(summary.coverage, [
      "accessory",
      "broad",
      "compatibility",
      "constrained",
      "duplicate_family",
      "fake_price",
      "missing_evidence",
      "non_product_page",
      "overconstrained",
      "wrong_type",
    ]);
    assert.equal(
      new Set(batches.flatMap((batch) => batch.benchmarkCaseIds)).size,
      manifest.cases.length,
    );
  });

  it("executes every declared case and persists every invariant outcome", async () => {
    const { batches, manifest } = await matrix();

    for (const batch of batches) {
      const result = workerResult(batch, manifest);
      const reconciliation = reconcileBenchmarkWorkerResult({
        batch,
        manifest,
        workerResult: result,
      });

      assert.equal(reconciliation.passed, true, reconciliation.errors.join("\n"));
      assert.deepEqual(
        result.benchmark.executedCaseIds,
        batch.benchmarkCaseIds,
      );
      assert.equal(result.benchmark.passed, true);
      assert.ok(
        result.benchmark.caseResults.every(
          (caseResult) =>
            caseResult.invariantResults.length > 0 &&
            caseResult.invariantResults.every(
              (invariant) => typeof invariant.passed === "boolean",
            ),
        ),
      );
    }
  });

  it("rejects unknown or unassigned case ids in tracked batch definitions", async () => {
    const { batches, manifest } = await matrix();
    const unknown = structuredClone(batches);
    unknown[0].benchmarkCaseIds[0] = "unknown-case";
    assert.throws(
      () => validateBatchMatrix(unknown, manifest),
      /unknown case unknown-case/,
    );

    const missing = structuredClone(batches);
    missing[0].benchmarkCaseIds.pop();
    assert.throws(
      () => validateBatchMatrix(missing, manifest),
      /not assigned to its partition/,
    );
  });

  it("requires explicit price and product ground truth for every candidate", async () => {
    const { batches, manifest } = await matrix();
    const missingOracle = structuredClone(manifest);
    delete missingOracle.candidateOracles["brooks-ghost-15"];

    assert.throws(
      () => validateBatchMatrix(batches, missingOracle),
      /candidateOracles must exactly cover every candidate id/,
    );
  });
});

describe("benchmark worker reconciliation", () => {
  it("keeps a consistent failing invariant as valid evidence, not an integrity error", async () => {
    const { batches, manifest } = await matrix();
    const batch = batches.find((item) => item.name === "broad-mainstream");
    const failing = historicalFailingBroadResult(batch, manifest);
    const reconciliation = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: failing,
    });

    assert.equal(failing.benchmark.passed, false);
    assert.equal(reconciliation.passed, true, reconciliation.errors.join("\n"));
  });

  it("rejects tampered price-trust and product-eligibility failure claims", async () => {
    const { batches, manifest } = await matrix();
    const tamperCases = [
      {
        batchName: "broad-mainstream",
        candidateId: "brooks-ghost-15",
        invariantType: "all_exact_price_trusted",
      },
      {
        batchName: "wrong-category",
        candidateId: "ergonomic-chair-control",
        invariantType: "all_exact_product_eligible",
      },
    ];

    for (const tamperCase of tamperCases) {
      const batch = batches.find((item) => item.name === tamperCase.batchName);
      const tampered = structuredClone(workerResult(batch, manifest));
      const caseResult = tampered.benchmark.caseResults.find((item) =>
        item.invariantResults.some(
          (invariant) => invariant.type === tamperCase.invariantType,
        ),
      );
      const invariant = caseResult.invariantResults.find(
        (item) => item.type === tamperCase.invariantType,
      );
      invariant.failedCandidateIds = [tamperCase.candidateId];
      invariant.passed = false;
      caseResult.passed = false;
      tampered.benchmark.passed = false;
      tampered.benchmark.totals.casesPassed -= 1;
      tampered.benchmark.totals.invariantsPassed -= 1;

      const reconciliation = reconcileBenchmarkWorkerResult({
        batch,
        manifest,
        workerResult: tampered,
      });

      assert.equal(reconciliation.passed, false);
      assert.ok(
        reconciliation.errors.some((error) =>
          /outcome is inconsistent/.test(error),
        ),
      );
    }
  });

  it("fails closed on duplicated, missing, unknown, or mismatched work", async () => {
    const { batches, manifest } = await matrix();
    const batch = batches.find((item) => item.name === "broad-mainstream");
    const valid = workerResult(batch, manifest);

    const duplicate = structuredClone(valid);
    duplicate.benchmark.executedCaseIds.push(
      duplicate.benchmark.executedCaseIds[0],
    );
    const duplicateResult = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: duplicate,
    });
    assert.equal(duplicateResult.passed, false);
    assert.ok(duplicateResult.errors.some((error) => /duplicate case/.test(error)));

    const missing = structuredClone(valid);
    missing.benchmark.executedCaseIds.pop();
    const missingResult = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: missing,
    });
    assert.equal(missingResult.passed, false);
    assert.ok(
      missingResult.errors.some((error) => /do not exactly match/.test(error)),
    );

    const unknown = structuredClone(valid);
    unknown.benchmark.executedCaseIds[0] = "unknown-case";
    const unknownResult = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: unknown,
    });
    assert.equal(unknownResult.passed, false);
    assert.ok(unknownResult.errors.some((error) => /unknown case/.test(error)));

    const mismatch = structuredClone(valid);
    mismatch.benchmark.caseResults[0].invariantResults.pop();
    const mismatchResult = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: mismatch,
    });
    assert.equal(mismatchResult.passed, false);
    assert.ok(
      mismatchResult.errors.some((error) =>
        /invariant results do not match/.test(error),
      ),
    );
  });

  it("requires exactly one reconciled result for every requested batch", async () => {
    const { batches, manifest } = await matrix();
    const selected = batches.filter((batch) =>
      ["broad-mainstream", "price-trust"].includes(batch.name),
    );
    const results = selected.map((batch) => workerResult(batch, manifest));
    const valid = reconcileBenchmarkWorkerResults({
      batches,
      manifest,
      requestedBatchNames: selected.map((batch) => batch.name),
      workerResults: results,
    });
    assert.equal(valid.passed, true, valid.errors.join("\n"));

    const missing = reconcileBenchmarkWorkerResults({
      batches,
      manifest,
      requestedBatchNames: selected.map((batch) => batch.name),
      workerResults: results.slice(0, 1),
    });
    assert.equal(missing.passed, false);
    assert.ok(
      missing.errors.some((error) => /produced 0 worker results/.test(error)),
    );
  });
});

describe("before/after verifier benchmark integrity", () => {
  it("accepts a valid historical failure followed by a passing current result", async () => {
    const { batches, manifest } = await matrix();
    const batch = batches.find((item) => item.name === "broad-mainstream");
    const before = historicalFailingBroadResult(batch, manifest);
    const after = workerResult(batch, manifest);
    const comparison = qaLoopVerifierTestExports.verify(
      [before],
      [after],
      { batches, manifest },
    );

    assert.equal(comparison.accepted, true, comparison.rejectedReasons.join("\n"));
    assert.equal(comparison.beforeFindingCount, 1);
    assert.equal(comparison.afterFindingCount, 0);
    assert.deepEqual(comparison.resolvedRootCauses, [
      "deterministic_benchmark_regression",
    ]);
  });

  it("rejects a fabricated before failure even when a no-op after result passes", async () => {
    const { batches, manifest } = await matrix();
    const batch = batches.find((item) => item.name === "broad-mainstream");
    const before = structuredClone(workerResult(batch, manifest));
    const caseResult = before.benchmark.caseResults[0];
    const invariant = caseResult.invariantResults.find(
      (item) => item.type === "all_exact_price_trusted",
    );
    invariant.failedCandidateIds = ["brooks-ghost-15"];
    invariant.passed = false;
    caseResult.passed = false;
    before.benchmark.passed = false;
    before.benchmark.totals.casesPassed -= 1;
    before.benchmark.totals.invariantsPassed -= 1;
    before.findings = [
      {
        exactMatchAffected: true,
        failureType: "offline_benchmark_invariant_failed",
        rootCause: "deterministic_benchmark_regression",
        severity: "high",
      },
    ];
    const after = workerResult(batch, manifest);

    const comparison = qaLoopVerifierTestExports.verify(
      [before],
      [after],
      { batches, manifest },
    );

    assert.equal(comparison.accepted, false);
    assert.ok(
      comparison.rejectedReasons.some((reason) =>
        /outcome is inconsistent/.test(reason),
      ),
    );
  });

  it("fails closed when one path in a requested result set is missing", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "rr-verifier-"));
    const existing = join(tempDirectory, "existing.json");
    const missing = join(tempDirectory, "missing.json");

    try {
      await writeFile(existing, "{}", "utf8");
      await assert.rejects(
        () => qaLoopVerifierTestExports.loadResultSet([existing, missing]),
        /Verifier input does not exist/,
      );
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("accepts only exactly comparable deterministic coverage", async () => {
    const { batches, manifest } = await matrix();
    const batch = batches.find((item) => item.name === "price-trust");
    const before = workerResult(batch, manifest);
    const after = structuredClone(before);
    const accepted = qaLoopVerifierTestExports.verify(
      [before],
      [after],
      { batches, manifest },
    );

    assert.equal(accepted.accepted, true);
    assert.equal(accepted.benchmarkComparison.passed, true);

    after.benchmark.executedCaseIds.pop();
    const rejected = qaLoopVerifierTestExports.verify(
      [before],
      [after],
      { batches, manifest },
    );
    assert.equal(rejected.accepted, false);
    assert.ok(
      rejected.rejectedReasons.some((reason) =>
        /coverage does not exactly match|executed case ids do not exactly match/i.test(
          reason,
        ),
      ),
    );
  });
});

describe("controller authority and benchmark status", () => {
  it("treats benchmark reconciliation failure as a failed run", () => {
    assert.equal(
      agentLoopControllerTestExports.statusLabel(
        [],
        [],
        null,
        [],
        { errors: ["missing work"], passed: false },
      ),
      "benchmark-reconciliation-failed",
    );
  });

  it("distinguishes a valid failing invariant from worker execution failure", () => {
    assert.equal(
      agentLoopControllerTestExports.statusLabel(
        [],
        [{ code: 1 }],
        null,
        [{ rootCause: "deterministic_benchmark_regression" }],
        { errors: [], passed: true },
      ),
      "needs-fix",
    );
    assert.equal(
      agentLoopControllerTestExports.statusLabel(
        [],
        [{ code: 1 }],
        null,
        [],
        { errors: [], passed: true },
      ),
      "worker-error",
    );
  });

  it("does not overwrite the authoritative handoff or copy Markdown to Desktop", async () => {
    const source = await readFile(
      new URL("../scripts/agent-loop-controller.mjs", import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(source, /RR Markdowns|syncMarkdownSnapshots|nextTaskPath/);
    assert.match(source, /join\(workerDir, nextTaskSuggestionFile\)/);
    assert.match(source, /authoritative handoff remains/);
  });
});

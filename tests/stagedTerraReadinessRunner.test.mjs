import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildStagedTerraResearchRequest,
  STAGED_TERRA_PRESENTATION_INSTRUCTIONS,
} from "../lib/stagedTerraPrompt.ts";
import { stagedTerraPresentationJsonSchema } from "../lib/stagedTerraContract.ts";

import {
  buildStagedTerraReadinessRunPlan,
  buildStagedTerraReadinessRunnerCheckpoint,
  executeStagedTerraReadinessAttempt,
  parseStagedTerraReadinessAttemptIndex,
  readStagedTerraReadinessPriorArtifactPrefix,
  stagedTerraReadinessCeilingFailures,
  stagedTerraReadinessOutputDirectory,
  STAGED_TERRA_READINESS_LIVE_PLAN_VERSION,
  STAGED_TERRA_READINESS_MATRIX_FILE_SHA256,
  validateStagedTerraReadinessCreateRequest,
  validateStagedTerraReadinessRunApproval,
} from "../scripts/staged-terra-readiness-runner.mjs";
import {
  authenticateStagedTerraReadinessTrustSurface,
  createStagedTerraReadinessCheckpointWriter,
  discoverStagedTerraReadinessImportClosure,
  inspectStagedTerraReadinessOutputBoundary,
  readStagedTerraReadinessArtifactFile,
} from "../scripts/staged-terra-readiness-io.mjs";

const matrixBytes = readFileSync(
  "tests/fixtures/staged-terra-readiness-matrix-v3.json",
);
const matrix = JSON.parse(matrixBytes.toString("utf8"));
const commitSha = "f".repeat(40);
const currentDate = "2026-08-29";
const trustSurface = {
  ok: true,
  manifestSha256: "b".repeat(64),
  entries: [{ path: "scripts/run-staged-terra-readiness.mjs" }],
  failures: [],
};

function plan(overrides = {}) {
  return buildStagedTerraReadinessRunPlan({
    matrix,
    matrixBytes,
    trustSurface,
    commitSha,
    attemptIndex: 1,
    previousArtifactSha256: null,
    currentDate,
    repoRoot: process.cwd(),
    ...overrides,
  });
}

function approvalArgs(value = plan()) {
  const ceilings = value.ceilings;
  return [
    "--execute",
    `--approved-commit=${value.commitSha}`,
    `--approved-matrix-file-sha256=${value.matrixFileSha256}`,
    `--approved-matrix-canonical-sha256=${value.matrixCanonicalSha256}`,
    `--approved-trust-surface-sha256=${value.trustSurface.manifestSha256}`,
    `--approved-attempt-index=${value.attempt.index}`,
    `--approved-case-id=${value.attempt.caseId}`,
    `--approved-run=${value.attempt.run}`,
    `--approved-run-id=${value.attempt.runId}`,
    `--approved-attempt-nonce=${value.attempt.nonce}`,
    `--approved-previous-artifact-sha256=${value.attempt.previousArtifactSha256 ?? "none"}`,
    `--approved-openai-creates=${ceilings.openAiCreates}`,
    `--approved-openai-retrieves=${ceilings.openAiRetrieves}`,
    `--approved-hosted-searches=${ceilings.hostedSearches}`,
    `--approved-safety-cancels=${ceilings.safetyCancels}`,
    `--approved-serper-shopping-attempts=${ceilings.serperShoppingAttempts}`,
    `--approved-source-page-fetches=${ceilings.sourcePageFetches}`,
    `--approved-source-page-http-attempts=${ceilings.sourcePageHttpAttempts}`,
    `--approved-dollar-ceiling=${ceilings.conservativeUsd}`,
    `--approved-wall-clock-ms=${value.maximumCompletedWallClockMs}`,
    `--approved-retries=${value.networkPolicy.retries}`,
    `--approved-replacements=${value.networkPolicy.replacements}`,
    `--approved-fallbacks=${value.networkPolicy.fallbacks}`,
    `--approved-serper-organic-attempts=${value.networkPolicy.serperOrganicAttempts}`,
    `--approved-search-api-attempts=${value.networkPolicy.searchApiAttempts}`,
    `--approved-additional-cases=${value.networkPolicy.additionalCases}`,
    `--approved-output-relative-path=${value.outputRelativePath}`,
  ];
}

function counters() {
  return {
    openAiCreates: 0,
    openAiRetrieves: 0,
    hostedSearches: 0,
    safetyCancels: 0,
    serperShoppingAttempts: 0,
    sourcePageFetches: 0,
    sourcePageHttpAttempts: 0,
    retries: 0,
    replacements: 0,
    fallbacks: 0,
    serperOrganicAttempts: 0,
    searchApiAttempts: 0,
    additionalCases: 0,
  };
}

function pending(jobToken, status = "queued") {
  return {
    pipeline: "staged_terra",
    version: "staged-terra-api-v1",
    state: "pending",
    status,
    jobToken,
    pollAfterMs: 2_000,
    expiresAtMs: Date.parse("2026-08-29T13:00:00.000Z"),
  };
}

function completed() {
  return {
    pipeline: "staged_terra",
    version: "staged-terra-api-v1",
    state: "completed",
    presentationVersion: "staged-terra-presentation-v1",
    cards: [],
    sources: [],
    finalAdvice: [],
  };
}

function presentationRequest() {
  const requirements = [];
  const input = {
    schema_version: "staged-terra-evidence-package-v1",
    request_fingerprint: "a".repeat(64),
    requirements,
    evidence: [],
    candidates: [],
  };
  return {
    model: "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    instructions: STAGED_TERRA_PRESENTATION_INSTRUCTIONS,
    input: [
      "VERIFIED_EVIDENCE_PACKAGE_JSON_START",
      JSON.stringify(input, null, 2),
      "VERIFIED_EVIDENCE_PACKAGE_JSON_END",
    ].join("\n"),
    background: false,
    max_output_tokens: 8_000,
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "review_radar_staged_terra_presentation",
        strict: true,
        schema: stagedTerraPresentationJsonSchema(requirements),
      },
    },
  };
}

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PR-9B staged Terra readiness runner", () => {
  it("freezes the first exact matrix attempt and every no-extra-work ceiling", () => {
    const value = plan();
    assert.equal(value.schemaVersion, STAGED_TERRA_READINESS_LIVE_PLAN_VERSION);
    assert.equal(value.schemaVersion, "staged-terra-readiness-live-plan-v3");
    assert.equal(value.mode, "dry-run");
    assert.equal(
      value.matrixFileSha256,
      STAGED_TERRA_READINESS_MATRIX_FILE_SHA256,
    );
    assert.equal(
      value.matrixCanonicalSha256,
      "0bc9d3626e266c4ec6592cfc1489d9199cb42e51b537183964637e1ea46a3660",
    );
    assert.deepEqual(value.attempt, {
      index: 1,
      key: "broad-shop-vac:1",
      caseId: "broad-shop-vac",
      run: 1,
      runId: "pr9c-01-broad-shop-vac-r1",
      nonce:
        "nonce-08d54c916c21d7c3c98aa355420cdac73ca8fcd4878148eff2a6a663d63db5b5",
      previousArtifactSha256: null,
      shopperRequest: { query: "shop vac" },
      requestSha256:
        "4682f590b09102f5520362661053a7f1dedf92088e2dc87009b9bff57cbd9081",
    });
    assert.deepEqual(value.ceilings, matrix.qualityBars.perRunCeilings);
    assert.equal(value.maximumCompletedWallClockMs, 720_000);
    assert.deepEqual(value.networkPolicy, {
      retries: 0,
      replacements: 0,
      fallbacks: 0,
      serperOrganicAttempts: 0,
      searchApiAttempts: 0,
      additionalCases: 0,
      nextAttemptAutomatic: false,
      flagPromotion: false,
      deployment: false,
    });
    assert.equal(
      path.basename(value.outputDirectory),
      "pr9c-01-broad-shop-vac-r1-fffffff",
    );
    assert.throws(() =>
      stagedTerraReadinessOutputDirectory({
        repoRoot: process.cwd(),
        runId: "../outside",
        commitSha,
      }),
    );
  });

  it("defaults the executable to a zero-network plan for attempt one", () => {
    const output = execFileSync(
      process.execPath,
      ["--no-warnings", "scripts/run-staged-terra-readiness.mjs"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const value = JSON.parse(output);
    assert.equal(value.mode, "dry-run");
    assert.equal(value.attempt.index, 1);
    assert.equal(value.attempt.runId, "pr9c-01-broad-shop-vac-r1");
    assert.equal(value.networkPolicy.nextAttemptAutomatic, false);
    assert.equal(value.ceilings.conservativeUsd, 1);
    assert.ok(
      ["authenticated", "unauthenticated"].includes(value.trustSurface.status),
    );
    assert.equal(typeof value.outputRelativePath, "string");
  });

  it("validates an execute attempt selector before prior artifact I/O", async () => {
    const source = readFileSync(
      "scripts/run-staged-terra-readiness.mjs",
      "utf8",
    );
    const main = source.indexOf("async function main()");
    const prefixRead = source.indexOf(
      "readStagedTerraReadinessPriorArtifactPrefix({",
      main,
    );
    const validation = source.lastIndexOf(
      "parseStagedTerraReadinessAttemptIndex({",
      prefixRead,
    );
    const approvalClosure = source.lastIndexOf(
      "parseStagedTerraReadinessApprovalArguments(args)",
      prefixRead,
    );
    assert.ok(main >= 0);
    assert.ok(approvalClosure > main);
    assert.ok(validation > main);
    assert.ok(prefixRead >= 0);
    assert.ok(approvalClosure < prefixRead);
    assert.ok(validation < prefixRead);

    for (const value of ["0", "-1", "1.5", "7"]) {
      assert.throws(() =>
        parseStagedTerraReadinessAttemptIndex({ matrix, value }),
      );
    }

    let artifactReads = 0;
    const readArtifactFile = async () => {
      artifactReads += 1;
      return { ok: true, bytes: Buffer.from("{}", "utf8") };
    };
    for (const attemptIndex of [0, -1, 1.5, matrix.attemptPlan.length + 1]) {
      await assert.rejects(() =>
        readStagedTerraReadinessPriorArtifactPrefix({
          matrix,
          attemptIndex,
          commitSha,
          repoRoot: process.cwd(),
          readArtifactFile,
        }),
      );
    }
    assert.equal(artifactReads, 0);
  });

  it("requires exact origin, matrix, attempt, ceiling, clean-state, and credential approval", () => {
    const value = plan();
    assert.equal(
      validateStagedTerraReadinessRunApproval({
        args: approvalArgs(value),
        plan: value,
        branch: "main",
        trackedChanges: [],
        trustSurface,
        outputBoundary: {
          ok: true,
          expectedLeafState: "absent",
          failures: [],
        },
        credentials: { openAiPresent: true, serperSafe: true },
      }).attempt.runId,
      value.attempt.runId,
    );

    const mutations = [
      { args: approvalArgs(value).slice(1) },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-commit=")
            ? `--approved-commit=${"e".repeat(40)}`
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-trust-surface-sha256=")
            ? `--approved-trust-surface-sha256=${"e".repeat(64)}`
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-matrix-file-sha256=")
            ? `--approved-matrix-file-sha256=${"e".repeat(64)}`
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-matrix-canonical-sha256=")
            ? `--approved-matrix-canonical-sha256=${"e".repeat(64)}`
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-attempt-nonce=")
            ? "--approved-attempt-nonce=nonce-" + "e".repeat(64)
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-dollar-ceiling=")
            ? "--approved-dollar-ceiling=2"
            : item,
        ),
      },
      {
        args: approvalArgs(value).map((item) =>
          item.startsWith("--approved-output-relative-path=")
            ? "--approved-output-relative-path=tests/fixtures/elsewhere"
            : item,
        ),
      },
      { args: [...approvalArgs(value), "--unexpected=true"] },
      { args: [...approvalArgs(value), approvalArgs(value)[1]] },
      { branch: "feature" },
      { trackedChanges: [" M lib/example.ts"] },
      {
        trustSurface: {
          ok: false,
          manifestSha256: null,
          entries: [],
          failures: ["trust_surface_git_entry_invalid:runner"],
        },
      },
      {
        trustSurface: {
          ...trustSurface,
          manifestSha256: "e".repeat(64),
        },
      },
      {
        outputBoundary: {
          ok: false,
          expectedLeafState: "absent",
          failures: ["output_parent_indirect:live_root"],
        },
      },
      { credentials: { openAiPresent: false, serperSafe: true } },
      { credentials: { openAiPresent: true, serperSafe: false } },
    ];
    for (const mutation of mutations) {
      assert.throws(() =>
        validateStagedTerraReadinessRunApproval({
          args: approvalArgs(value),
          plan: value,
          branch: "main",
          trackedChanges: [],
          trustSurface,
          outputBoundary: {
            ok: true,
            expectedLeafState: "absent",
            failures: [],
          },
          credentials: { openAiPresent: true, serperSafe: true },
          ...mutation,
        }),
      );
    }
  });

  it("authenticates the transitive local import closure and rejects untracked or changed trust files", async () => {
    const temporaryRepo = mkdtempSync(path.join(tmpdir(), "rr-pr4b-trust-"));
    try {
      const trackedSource =
        'import value from "./dependency.mjs";\nawait import("./dynamic.json", { with: { type: "json" } });\nexport default value;\n';
      writeFileSync(path.join(temporaryRepo, "tracked.mjs"), trackedSource);
      writeFileSync(
        path.join(temporaryRepo, "dependency.mjs"),
        "export default 1;\n",
      );
      writeFileSync(path.join(temporaryRepo, "dynamic.json"), '{"ok":true}\n');
      execFileSync("git", ["init", "--quiet"], { cwd: temporaryRepo });
      execFileSync("git", ["config", "core.autocrlf", "false"], {
        cwd: temporaryRepo,
      });
      execFileSync(
        "git",
        ["add", "tracked.mjs", "dependency.mjs", "dynamic.json"],
        { cwd: temporaryRepo },
      );
      execFileSync(
        "git",
        [
          "-c",
          "user.name=ReviewRadar Test",
          "-c",
          "user.email=review-radar@example.invalid",
          "commit",
          "--quiet",
          "-m",
          "fixture",
        ],
        { cwd: temporaryRepo },
      );
      const fixtureCommit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: temporaryRepo,
        encoding: "utf8",
      }).trim();
      const authenticated =
        await authenticateStagedTerraReadinessTrustSurface({
          repoRoot: temporaryRepo,
          commitSha: fixtureCommit,
          rootPaths: ["tracked.mjs"],
          fixedPaths: [],
        });
      assert.equal(authenticated.ok, true);
      assert.match(authenticated.manifestSha256, /^[a-f0-9]{64}$/);
      assert.deepEqual(
        authenticated.entries.map((entry) => entry.path),
        ["dependency.mjs", "dynamic.json", "tracked.mjs"],
      );
      assert.deepEqual(
        (
          await discoverStagedTerraReadinessImportClosure({
            repoRoot: temporaryRepo,
            rootPaths: ["tracked.mjs"],
          })
        ).paths,
        ["dependency.mjs", "dynamic.json", "tracked.mjs"],
      );

      writeFileSync(
        path.join(temporaryRepo, "nonliteral.mjs"),
        'const target = "./dependency.mjs";\nawait import(target);\n',
      );
      const nonliteral = await discoverStagedTerraReadinessImportClosure({
        repoRoot: temporaryRepo,
        rootPaths: ["nonliteral.mjs"],
      });
      assert.equal(nonliteral.ok, false);
      assert.ok(
        nonliteral.failures.includes(
          "trust_surface_dynamic_import_nonliteral:nonliteral.mjs",
        ),
      );

      const indirect = await authenticateStagedTerraReadinessTrustSurface({
        repoRoot: temporaryRepo,
        commitSha: fixtureCommit,
        rootPaths: [".git"],
        fixedPaths: [],
      });
      assert.equal(indirect.ok, false);
      assert.ok(
        indirect.failures.includes("trust_surface_file_indirect:.git"),
      );

      writeFileSync(path.join(temporaryRepo, "untracked.mjs"), "export default 2;\n");
      writeFileSync(
        path.join(temporaryRepo, "tracked.mjs"),
        `${trackedSource}import "./untracked.mjs";\n`,
      );
      const untracked = await authenticateStagedTerraReadinessTrustSurface({
        repoRoot: temporaryRepo,
        commitSha: fixtureCommit,
        rootPaths: ["tracked.mjs"],
        fixedPaths: [],
      });
      assert.equal(untracked.ok, false);
      assert.ok(
        untracked.failures.includes(
          "trust_surface_git_entry_invalid:untracked.mjs",
        ),
      );

      writeFileSync(path.join(temporaryRepo, "tracked.mjs"), trackedSource);
      writeFileSync(
        path.join(temporaryRepo, "dependency.mjs"),
        "export default 3;\n",
      );
      const changed = await authenticateStagedTerraReadinessTrustSurface({
        repoRoot: temporaryRepo,
        commitSha: fixtureCommit,
        rootPaths: ["tracked.mjs"],
        fixedPaths: [],
      });
      assert.equal(changed.ok, false);
      assert.ok(
        changed.failures.includes(
          "trust_surface_working_blob_mismatch:dependency.mjs",
        ),
      );
    } finally {
      rmSync(temporaryRepo, { recursive: true, force: true });
    }
  });

  it("rejects indirect output parents and reauthenticates the created leaf", async () => {
    const temporaryRepo = mkdtempSync(path.join(tmpdir(), "rr-pr4b-output-"));
    try {
      const liveRoot = path.join(
        temporaryRepo,
        "tests",
        "fixtures",
        "review-radar-live",
      );
      const outputDirectory = path.join(liveRoot, "attempt-abcdef0");
      mkdirSync(liveRoot, { recursive: true });
      assert.equal(
        (
          await inspectStagedTerraReadinessOutputBoundary({
            repoRoot: temporaryRepo,
            outputDirectory,
          })
        ).ok,
        true,
      );
      mkdirSync(outputDirectory);
      assert.equal(
        (
          await inspectStagedTerraReadinessOutputBoundary({
            repoRoot: temporaryRepo,
            outputDirectory,
            expectedLeafState: "directory",
          })
        ).ok,
        true,
      );

      rmSync(outputDirectory, { recursive: true, force: true });
      rmSync(liveRoot, { recursive: true, force: true });
      const redirected = path.join(temporaryRepo, "redirected-live-output");
      mkdirSync(redirected);
      symlinkSync(
        redirected,
        liveRoot,
        process.platform === "win32" ? "junction" : "dir",
      );
      const indirect = await inspectStagedTerraReadinessOutputBoundary({
        repoRoot: temporaryRepo,
        outputDirectory,
      });
      assert.equal(indirect.ok, false);
      assert.ok(
        indirect.failures.includes("output_parent_indirect:live_root"),
      );
    } finally {
      rmSync(temporaryRepo, { recursive: true, force: true });
    }
  });

  it("reads only one direct bounded prior artifact file", async () => {
    const temporaryRepo = mkdtempSync(path.join(tmpdir(), "rr-pr9b-prior-"));
    try {
      const outputDirectory = path.join(
        temporaryRepo,
        "tests",
        "fixtures",
        "review-radar-live",
        "prior-attempt-abcdef0",
      );
      mkdirSync(outputDirectory, { recursive: true });
      const artifactFile = path.join(outputDirectory, "artifact.json");
      const expected = Buffer.from('{"artifact":"bounded"}', "utf8");
      writeFileSync(artifactFile, expected);
      const direct = await readStagedTerraReadinessArtifactFile({
        repoRoot: temporaryRepo,
        outputDirectory,
      });
      assert.equal(direct.ok, true);
      assert.deepEqual(direct.bytes, expected);

      rmSync(artifactFile);
      mkdirSync(artifactFile);
      const indirect = await readStagedTerraReadinessArtifactFile({
        repoRoot: temporaryRepo,
        outputDirectory,
      });
      assert.equal(indirect.ok, false);
      assert.ok(indirect.failures.includes("prior_artifact_file_indirect"));

      rmSync(artifactFile, { recursive: true });
      writeFileSync(artifactFile, Buffer.alloc(1_000_001));
      const oversized = await readStagedTerraReadinessArtifactFile({
        repoRoot: temporaryRepo,
        outputDirectory,
      });
      assert.equal(oversized.ok, false);
      assert.ok(
        oversized.failures.includes("prior_artifact_file_size_invalid"),
      );

      const outsideDirectory = path.join(temporaryRepo, "outside-live-root");
      mkdirSync(outsideDirectory);
      const outside = await readStagedTerraReadinessArtifactFile({
        repoRoot: temporaryRepo,
        outputDirectory: outsideDirectory,
      });
      assert.equal(outside.ok, false);
      assert.ok(
        outside.failures.includes(
          "prior_artifact_output_leaf_outside_fixed_root",
        ),
      );
      assert.equal(
        outside.failures.includes("prior_artifact_file_unavailable"),
        false,
      );
    } finally {
      rmSync(temporaryRepo, { recursive: true, force: true });
    }
  });

  it("retains the prior append-only checkpoint when a later write is interrupted", async () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "rr-pr4b-checkpoint-"),
    );
    try {
      const writer = createStagedTerraReadinessCheckpointWriter({
        outputDirectory: temporaryDirectory,
      });
      await writer.schedule(Buffer.from("first checkpoint\n", "utf8"));
      await writer.schedule(Buffer.from("second checkpoint\n", "utf8"));
      assert.equal(
        readFileSync(
          path.join(temporaryDirectory, "attempt-000000.json"),
          "utf8",
        ),
        "first checkpoint\n",
      );
      assert.equal(
        readFileSync(
          path.join(temporaryDirectory, "attempt-000001.json"),
          "utf8",
        ),
        "second checkpoint\n",
      );

      const retained = [];
      let writes = 0;
      const interruptedWriter = createStagedTerraReadinessCheckpointWriter({
        outputDirectory: temporaryDirectory,
        writeSnapshot: async (_file, bytes) => {
          writes += 1;
          if (writes === 2) throw new Error("simulated interrupted update");
          retained.push(bytes.toString("utf8"));
        },
      });
      await interruptedWriter.schedule(Buffer.from("retained", "utf8"));
      await assert.rejects(
        interruptedWriter.schedule(Buffer.from("not retained", "utf8")),
      );
      assert.deepEqual(retained, ["retained"]);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("rejects an expired matrix and a non-chainable later attempt before approval", () => {
    assert.equal(
      plan({
        trustSurface: {
          ok: false,
          manifestSha256: null,
          entries: [],
          failures: ["trust_surface_git_entry_invalid:runner"],
        },
      }).trustSurface.status,
      "unauthenticated",
    );
    assert.throws(() =>
      plan({ matrixBytes: Buffer.concat([matrixBytes, Buffer.from(" ")]) }),
    );
    assert.throws(() =>
      plan({ matrix: { ...matrix, reviewedAt: "2026-08-28" } }),
    );
    assert.throws(() => plan({ currentDate: "2026-09-13" }));
    assert.throws(() =>
      plan({ attemptIndex: 2, previousArtifactSha256: null }),
    );
    assert.throws(() =>
      plan({
        attemptIndex: 2,
        previousArtifactSha256: "a".repeat(64),
        priorArtifacts: [],
      }),
    );
  });

  it("allows only exact Terra/high research and Terra/medium no-web presentation creates", () => {
    const value = plan();
    const research = buildStagedTerraResearchRequest(
      value.attempt.shopperRequest,
    );
    assert.doesNotThrow(() =>
      validateStagedTerraReadinessCreateRequest(
        research,
        1,
        value,
      ),
    );
    assert.doesNotThrow(() =>
      validateStagedTerraReadinessCreateRequest(
        presentationRequest(),
        2,
        value,
      ),
    );
    assert.throws(() =>
      validateStagedTerraReadinessCreateRequest(
        {
          ...research,
          tools: [],
        },
        1,
        value,
      ),
    );
    assert.throws(() =>
      validateStagedTerraReadinessCreateRequest(
        {
          ...research,
          tools: [{ type: "web_search" }, { type: "code_interpreter" }],
        },
        1,
        value,
      ),
    );
    assert.throws(() =>
      validateStagedTerraReadinessCreateRequest(
        { ...presentationRequest(), tools: [{ type: "web_search" }] },
        2,
        value,
      ),
    );
  });

  it("captures one completed public terminal directly into the canonical builder", async () => {
    const value = plan();
    const itemCounters = counters();
    const checkpoints = [];
    const calls = { post: 0, get: 0, delete: 0, build: 0 };
    let tick = 0;
    const result = await executeStagedTerraReadinessAttempt({
      matrix,
      plan: value,
      counters: itemCounters,
      routeDiagnostics: [],
      handlers: {
        POST: async () => {
          calls.post += 1;
          itemCounters.openAiCreates += 1;
          return response(202, pending("opaque-token"));
        },
        GET: async () => {
          calls.get += 1;
          itemCounters.openAiRetrieves += 1;
          return calls.get === 1
            ? response(202, pending("opaque-token", "in_progress"))
            : response(200, completed());
        },
        DELETE: async () => {
          calls.delete += 1;
          return response(200, {
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "cancelled",
            status: "cancelled",
          });
        },
      },
      sleep: async () => {},
      now: () => Date.parse("2026-08-29T12:00:00.000Z") + tick++ * 1_000,
      persistCheckpoint: async (checkpoint) => checkpoints.push(checkpoint),
      buildArtifact: (input) => {
        calls.build += 1;
        assert.equal(input.caseId, "broad-shop-vac");
        assert.equal(input.runId, "pr9c-01-broad-shop-vac-r1");
        assert.equal(input.terminalResponse.statusCode, 200);
        assert.equal(input.terminalResponse.body.state, "completed");
        assert.equal("jobToken" in input.terminalResponse.body, false);
        return Buffer.from('{"canonical":true}', "utf8");
      },
    });

    assert.deepEqual(calls, { post: 1, get: 2, delete: 0, build: 1 });
    assert.equal(result.status, "artifact_captured_review_required");
    assert.equal(result.terminalCode, null);
    assert.equal(result.wallClockMs, 5_000);
    assert.equal(result.artifact.toString("utf8"), '{"canonical":true}');
    assert.ok(checkpoints.length >= 2);
    assert.equal(
      checkpoints.some((item) => "jobToken" in item),
      false,
    );
  });

  it("halts on every paid, forbidden, or wall-clock ceiling class", () => {
    const value = plan();
    const accounting = {
      ...counters(),
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      webSearchCalls: 0,
      conservativeUsd: 0,
    };
    assert.deepEqual(
      stagedTerraReadinessCeilingFailures({
        plan: value,
        accounting,
        wallClockMs: value.maximumCompletedWallClockMs,
      }),
      [],
    );
    const breached = {
      ...accounting,
      openAiCreates: value.ceilings.openAiCreates + 1,
      webSearchCalls: value.ceilings.hostedSearches + 1,
      conservativeUsd: value.ceilings.conservativeUsd + 0.01,
      retries: 1,
    };
    assert.deepEqual(
      stagedTerraReadinessCeilingFailures({
        plan: value,
        accounting: breached,
        wallClockMs: value.maximumCompletedWallClockMs + 1,
      }),
      [
        "openAiCreates",
        "conservativeUsd",
        "webSearchCalls",
        "retries",
        "maximumCompletedWallClockMs",
      ],
    );
  });

  it("captures a closed public failure but never treats it as authority to continue", async () => {
    const value = plan();
    const itemCounters = counters();
    let buildInput = null;
    const result = await executeStagedTerraReadinessAttempt({
      matrix,
      plan: value,
      counters: itemCounters,
      routeDiagnostics: [],
      handlers: {
        POST: async () => response(202, pending("opaque-token")),
        GET: async () => {
          itemCounters.openAiRetrieves += 1;
          return response(502, {
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "failed",
            code: "verification_failed",
            error:
              "Research finished, but enough evidence could not be verified safely.",
          });
        },
        DELETE: async () => {
          throw new Error("a terminal public failure must not be cancelled");
        },
      },
      sleep: async () => {},
      now: () => Date.parse("2026-08-29T12:00:00.000Z"),
      persistCheckpoint: async () => {},
      buildArtifact: (input) => {
        buildInput = input;
        return Buffer.from("failure-artifact", "utf8");
      },
    });

    assert.equal(result.status, "artifact_captured_review_required");
    assert.equal(result.terminalCode, "verification_failed");
    assert.equal(buildInput.terminalResponse.statusCode, 502);
  });

  it("captures a closed initial research failure without inventing a job", async () => {
    let gets = 0;
    let buildInput = null;
    const result = await executeStagedTerraReadinessAttempt({
      matrix,
      plan: plan(),
      counters: counters(),
      routeDiagnostics: [],
      handlers: {
        POST: async () =>
          response(502, {
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "failed",
            code: "research_failed",
            error: "Research could not be completed safely. Please try again.",
          }),
        GET: async () => {
          gets += 1;
          throw new Error("no job exists to poll");
        },
        DELETE: async () => {
          throw new Error("no job exists to cancel");
        },
      },
      sleep: async () => {},
      now: () => Date.parse("2026-08-29T12:00:00.000Z"),
      persistCheckpoint: async () => {},
      buildArtifact: (input) => {
        buildInput = input;
        return Buffer.from("research-failure-artifact", "utf8");
      },
    });

    assert.equal(gets, 0);
    assert.equal(result.terminalCode, "research_failed");
    assert.equal(buildInput.terminalResponse.statusCode, 502);
  });

  it("does not checkpoint a terminal that the canonical artifact builder rejects", async () => {
    const checkpoints = [];
    let cancels = 0;
    const result = await executeStagedTerraReadinessAttempt({
      matrix,
      plan: plan(),
      counters: counters(),
      routeDiagnostics: [],
      handlers: {
        POST: async () => response(202, pending("opaque-token")),
        GET: async () => response(200, completed()),
        DELETE: async () => {
          cancels += 1;
          return response(200, { state: "cancelled" });
        },
      },
      sleep: async () => {},
      now: () => Date.parse("2026-08-29T12:00:00.000Z"),
      persistCheckpoint: async (checkpoint) => checkpoints.push(checkpoint),
      buildArtifact: () => {
        throw new Error("canonical projection rejected");
      },
    });

    assert.equal(result.failureCode, "artifact_build_failed");
    assert.equal(cancels, 0);
    assert.equal(checkpoints.at(-1).terminal, null);
  });

  it("uses at most one best-effort cancel after an infrastructure failure and persists no raw error", async () => {
    const value = plan();
    const itemCounters = counters();
    let cancels = 0;
    const result = await executeStagedTerraReadinessAttempt({
      matrix,
      plan: value,
      counters: itemCounters,
      routeDiagnostics: [],
      handlers: {
        POST: async () => response(202, pending("opaque-token")),
        GET: async () => {
          throw new Error("secret transport detail must not persist");
        },
        DELETE: async () => {
          cancels += 1;
          itemCounters.safetyCancels += 1;
          return response(200, {
            pipeline: "staged_terra",
            version: "staged-terra-api-v1",
            state: "cancelled",
            status: "cancelled",
          });
        },
      },
      sleep: async () => {},
      now: () => Date.parse("2026-08-29T12:00:00.000Z"),
      persistCheckpoint: async () => {},
      buildArtifact: () => {
        throw new Error("no artifact is valid without a public terminal");
      },
    });

    assert.equal(cancels, 1);
    assert.equal(result.status, "attempt_stopped_without_artifact");
    assert.equal(result.failureCode, "unexpected_execution_failure");
    assert.equal(JSON.stringify(result).includes("secret transport"), false);
  });

  it("keeps checkpoints closed and the executable free of fixture replay paths", () => {
    const checkpoint = buildStagedTerraReadinessRunnerCheckpoint({
      plan: plan(),
      status: "running",
      counters: counters(),
      routeDiagnostics: [],
      terminal: null,
      failureCode: null,
      startedAt: "2026-08-29T12:00:00.000Z",
      updatedAt: "2026-08-29T12:00:01.000Z",
    });
    assert.deepEqual(Object.keys(checkpoint), [
      "schemaVersion",
      "plan",
      "status",
      "startedAt",
      "updatedAt",
      "counters",
      "routeDiagnostics",
      "terminal",
      "failureCode",
    ]);
    assert.equal("jobToken" in checkpoint, false);
    assert.equal("error" in checkpoint, false);

    const source = readFileSync(
      "scripts/run-staged-terra-readiness.mjs",
      "utf8",
    );
    const ioSource = readFileSync(
      "scripts/staged-terra-readiness-io.mjs",
      "utf8",
    );
    const completeSource = `${source}\n${ioSource}`;
    assert.match(source, /buildStagedTerraReadinessArtifact/);
    assert.match(source, /maxRetries:\s*0/);
    assert.match(ioSource, /ls-tree/);
    assert.match(ioSource, /hash-object/);
    assert.match(ioSource, /lstat/);
    assert.match(ioSource, /realpath/);
    assert.match(ioSource, /handle\.sync/);
    assert.ok(
      source.indexOf("finalPriorArtifacts") <
        source.lastIndexOf("createOpenAIClient("),
    );
    assert.doesNotMatch(completeSource, /readdir/);
    assert.doesNotMatch(completeSource, /result\.json/);
    assert.doesNotMatch(completeSource, /OAI_T10_PHASE_D_CASE/);
    assert.doesNotMatch(completeSource, /console\.log\(process\.env/);
  });
});

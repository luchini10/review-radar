import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS,
  buildDirectTerraAssetProbePlan,
  buildSanitizedDirectTerraAssetProbePlan,
  buildSanitizedDirectTerraAssetProbeEvidence,
  runDirectTerraAssetCoverageProbe,
  validateDirectTerraAssetProbeApproval,
} from "../lib/directTerraAssetCoverageProbe.ts";
import {
  DirectTerraSerperTransportError,
  createDirectTerraSerperShoppingTransport,
} from "../lib/directTerraSerperTransport.ts";

const EXECUTE = process.argv.includes("--execute");
const APPROVED_SEARCHES = Number(
  process.argv
    .find((argument) => argument.startsWith("--approved-searches="))
    ?.split("=")[1] || "0",
);
const APPROVED_COMMIT =
  process.argv
    .find((argument) => argument.startsWith("--approved-commit="))
    ?.split("=")[1] || "";

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function outputPath(repositoryCommit) {
  return `tests/fixtures/review-radar-live/oai-t8a-asset-coverage-probe-${repositoryCommit.slice(0, 7)}/result.json`;
}

function trackedPhaseChanges() {
  const output = gitOutput([
    "status",
    "--porcelain",
    "--untracked-files=no",
    "--",
    "app",
    "components",
    "docs",
    "lib",
    "scripts",
    "tests",
  ]);
  return output ? output.split(/\r?\n/) : [];
}

async function main() {
  const repositoryCommit = gitOutput(["rev-parse", "HEAD"]);
  const relativePath = outputPath(repositoryCommit);
  const path = resolve(relativePath);
  const dryRunPlan = {
    mode: "dry-run",
    outputPath: relativePath,
    ...buildDirectTerraAssetProbePlan({ repositoryCommit }),
  };

  if (!EXECUTE) {
    process.stdout.write(`${JSON.stringify(dryRunPlan, null, 2)}\n`);
    return;
  }

  const evidencePlan = {
    mode: "execute",
    outputPath: relativePath,
    ...buildSanitizedDirectTerraAssetProbePlan({ repositoryCommit }),
  };

  const apiKey = process.env.SERPER_API_KEY || "";
  validateDirectTerraAssetProbeApproval({
    approvedSearches: APPROVED_SEARCHES,
    approvedCommit: APPROVED_COMMIT,
    repositoryCommit,
    apiKey,
    outputExists: existsSync(path),
    trackedPhaseChanges: trackedPhaseChanges(),
  });

  let physicalAttempts = 0;
  const running = {
    ...evidencePlan,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    physicalAttempts,
    targetCount: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length,
  };
  atomicWriteJson(path, running);

  try {
    const transport = createDirectTerraSerperShoppingTransport({ apiKey });
    const result = await runDirectTerraAssetCoverageProbe({
      transport,
      beforeAttempt: (attempt) => {
        physicalAttempts = attempt;
        atomicWriteJson(path, { ...running, physicalAttempts });
      },
    });
    const evidence = buildSanitizedDirectTerraAssetProbeEvidence({
      repositoryCommit,
      physicalAttempts,
      batch: result.batch,
      diagnostics: result.diagnostics,
    });
    atomicWriteJson(path, {
      ...evidencePlan,
      status: "complete",
      startedAt: running.startedAt,
      completedAt: new Date().toISOString(),
      ...evidence,
    });
    process.stdout.write(`${JSON.stringify(evidence.summary, null, 2)}\n`);
  } catch (error) {
    atomicWriteJson(path, {
      ...running,
      status: "failed",
      completedAt: new Date().toISOString(),
      physicalAttempts,
      reason:
        error instanceof DirectTerraSerperTransportError
          ? error.code
          : "unexpected_error",
    });
    throw error;
  }
}

await main();

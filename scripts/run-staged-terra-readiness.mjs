// Dry-run-first serial capture for the PR-9B staged Terra readiness matrix.

import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchHybridSource,
  LIVE_HYBRID_FETCH_DEPENDENCIES,
} from "../lib/autonomousFactVerifier.ts";
import {
  createDirectTerraSerperShoppingTransport,
  directTerraSerperApiKeyIsValid,
} from "../lib/directTerraSerperTransport.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";
import { createStagedTerraRecommendationHandlers } from "../lib/stagedTerraRecommendationRoute.ts";
import {
  collectStagedTerraVerificationInputs,
  pollStagedTerraResearch,
} from "../lib/stagedTerraRuntime.ts";
import { materializeStagedTerraEvidencePackage } from "../lib/stagedTerraVerifier.ts";
import {
  buildStagedTerraReadinessArtifact,
  buildStagedTerraReadinessReviewPacket,
  parseStagedTerraReadinessArtifact,
  stagedTerraReadinessAccounting,
} from "./staged-terra-readiness-artifact.mjs";
import {
  authenticateStagedTerraReadinessPriorPrefix,
  buildStagedTerraReadinessRunPlan,
  executeStagedTerraReadinessAttempt,
  parseStagedTerraReadinessApprovalArguments,
  parseStagedTerraReadinessAttemptIndex,
  readStagedTerraReadinessPriorArtifactPrefix,
  STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
  stagedTerraReadinessCeilingFailures,
  validateStagedTerraReadinessCreateRequest,
  validateStagedTerraReadinessRunApproval,
} from "./staged-terra-readiness-runner.mjs";
import {
  authenticateStagedTerraReadinessTrustSurface,
  createStagedTerraReadinessCheckpointWriter,
  inspectStagedTerraReadinessOutputBoundary,
  readStagedTerraReadinessArtifactFile,
  writeStagedTerraReadinessFileExclusive,
} from "./staged-terra-readiness-io.mjs";
import { createStagedTerraRegisteredProductTraceCollector } from "./staged-terra-readiness-trace.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const matrixPath = path.join(
  repoRoot,
  "tests",
  "fixtures",
  "staged-terra-readiness-matrix-v3.json",
);

function gitOutput(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function currentCommit() {
  return gitOutput(["rev-parse", "HEAD"]);
}

function currentBranch() {
  return gitOutput(["branch", "--show-current"]);
}

function trackedChanges() {
  const output = gitOutput(["status", "--porcelain", "--untracked-files=no"]);
  return output ? output.split(/\r?\n/) : [];
}

function argument(args, name) {
  const matches = args.filter((value) => value.startsWith(`--${name}=`));
  if (matches.length > 1) throw new Error(`Argument ${name} is repeated.`);
  return matches[0]?.slice(name.length + 3) ?? "";
}

function dryRunSelection(args, matrix) {
  const allowed = new Set(["attempt-index", "previous-artifact-sha256"]);
  for (const value of args) {
    if (!value.startsWith("--") || !value.includes("=")) {
      throw new Error("Dry-run arguments must use --name=value form.");
    }
    const name = value.slice(2, value.indexOf("="));
    if (!allowed.has(name)) throw new Error(`Unknown dry-run argument ${name}.`);
  }
  const attemptText = argument(args, "attempt-index") || "1";
  const previousText = argument(args, "previous-artifact-sha256");
  return {
    attemptIndex: parseStagedTerraReadinessAttemptIndex({
      matrix,
      value: attemptText,
    }),
    previousArtifactSha256: previousText || null,
  };
}

async function readMatrix() {
  const bytes = await fs.readFile(matrixPath);
  return {
    bytes,
    matrix: JSON.parse(bytes.toString("utf8")),
  };
}

function canonicalCheckpointBytes(checkpoint) {
  return Buffer.from(`${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const commitSha = currentCommit();
  const matrixRecord = await readMatrix();
  const { bytes: matrixBytes, matrix } = matrixRecord;
  const trustSurface =
    await authenticateStagedTerraReadinessTrustSurface({
      repoRoot,
      commitSha,
    });
  const approvalValues = execute
    ? parseStagedTerraReadinessApprovalArguments(args)
    : null;
  const drySelection = execute ? null : dryRunSelection(args, matrix);
  const attemptIndex = execute
    ? parseStagedTerraReadinessAttemptIndex({
        matrix,
        value: approvalValues.get("approved-attempt-index"),
      })
    : drySelection.attemptIndex;
  const previousText = execute
    ? approvalValues.get("approved-previous-artifact-sha256")
    : drySelection.previousArtifactSha256;
  const previousArtifactSha256 =
    previousText === "" || previousText === "none" ? null : previousText;
  const priorArtifacts = await readStagedTerraReadinessPriorArtifactPrefix({
    matrix,
    attemptIndex,
    commitSha,
    repoRoot,
    readArtifactFile: readStagedTerraReadinessArtifactFile,
  });
  const plan = buildStagedTerraReadinessRunPlan({
    matrix,
    matrixBytes,
    trustSurface,
    commitSha,
    attemptIndex,
    previousArtifactSha256,
    priorArtifacts,
    currentDate: new Date(),
    repoRoot,
  });
  if (!execute) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  const outputBoundary = await inspectStagedTerraReadinessOutputBoundary({
    repoRoot,
    outputDirectory: plan.outputDirectory,
  });
  validateStagedTerraReadinessRunApproval({
    args,
    plan,
    branch: currentBranch(),
    trackedChanges: trackedChanges(),
    trustSurface,
    outputBoundary,
    credentials: {
      openAiPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
      serperSafe: directTerraSerperApiKeyIsValid(
        process.env.SERPER_API_KEY ?? "",
      ),
    },
  });

  const finalTrustSurface =
    await authenticateStagedTerraReadinessTrustSurface({
      repoRoot,
      commitSha,
    });
  if (
    finalTrustSurface.ok !== true ||
    finalTrustSurface.manifestSha256 !== plan.trustSurface.manifestSha256
  ) {
    throw new Error("The live trust surface changed after approval.");
  }
  const finalOutputBoundary =
    await inspectStagedTerraReadinessOutputBoundary({
      repoRoot,
      outputDirectory: plan.outputDirectory,
    });
  if (!finalOutputBoundary.ok) {
    throw new Error("The readiness output boundary changed after approval.");
  }
  const finalPriorArtifacts =
    await readStagedTerraReadinessPriorArtifactPrefix({
      matrix,
      attemptIndex,
      commitSha,
      repoRoot,
      readArtifactFile: readStagedTerraReadinessArtifactFile,
    });
  const finalPriorPrefix = authenticateStagedTerraReadinessPriorPrefix({
    matrix,
    attemptIndex,
    previousArtifactSha256,
    priorArtifacts: finalPriorArtifacts,
    approvedCommitSha: commitSha,
    now: new Date(),
  });
  if (JSON.stringify(finalPriorPrefix) !== JSON.stringify(plan.priorPrefix)) {
    throw new Error("The prior readiness artifact prefix changed after approval.");
  }

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, {
    baseURL: STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
    maxRetries: 0,
  });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI retry suppression is not active.");
  }

  await fs.mkdir(plan.outputDirectory);
  const createdOutputBoundary =
    await inspectStagedTerraReadinessOutputBoundary({
      repoRoot,
      outputDirectory: plan.outputDirectory,
      expectedLeafState: "directory",
    });
  if (!createdOutputBoundary.ok) {
    throw new Error("The created readiness output directory is indirect.");
  }
  const artifactFile = path.join(plan.outputDirectory, "artifact.json");
  let latestCheckpoint = null;
  const checkpointWriter = createStagedTerraReadinessCheckpointWriter({
    outputDirectory: plan.outputDirectory,
  });
  const scheduleCheckpoint = (checkpoint) => {
    latestCheckpoint = structuredClone(checkpoint);
    return checkpointWriter.schedule(canonicalCheckpointBytes(checkpoint));
  };
  const persistCurrent = () => {
    if (!latestCheckpoint) return Promise.resolve();
    return scheduleCheckpoint({
      ...latestCheckpoint,
      updatedAt: new Date().toISOString(),
      counters: structuredClone(counters),
      routeDiagnostics: structuredClone(routeDiagnostics),
    });
  };

  const counters = {
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
  const routeDiagnostics = [];
  const testCase = matrix.cases.find(
    (candidate) => candidate.id === plan.attempt.caseId,
  );
  if (!testCase) {
    throw new Error("The approved readiness case is missing from the matrix.");
  }
  const registeredProductTrace =
    createStagedTerraRegisteredProductTraceCollector({ testCase });

  const client = {
    responses: {
      create: async (body, options) => {
        if (counters.openAiCreates >= plan.ceilings.openAiCreates) {
          throw new Error("OpenAI create ceiling exceeded.");
        }
        const createNumber = counters.openAiCreates + 1;
        validateStagedTerraReadinessCreateRequest(
          body,
          createNumber,
          plan,
        );
        counters.openAiCreates += 1;
        await persistCurrent();
        return sdkClient.responses.create(body, options);
      },
      retrieve: async (...retrieveArgs) => {
        if (counters.openAiRetrieves >= plan.ceilings.openAiRetrieves) {
          throw new Error("OpenAI retrieve ceiling exceeded.");
        }
        counters.openAiRetrieves += 1;
        await persistCurrent();
        return sdkClient.responses.retrieve(...retrieveArgs);
      },
      cancel: async (...cancelArgs) => {
        if (counters.safetyCancels >= plan.ceilings.safetyCancels) {
          throw new Error("OpenAI safety-cancel ceiling exceeded.");
        }
        counters.safetyCancels += 1;
        await persistCurrent();
        return sdkClient.responses.cancel(...cancelArgs);
      },
    },
  };

  const baseShopping = createDirectTerraSerperShoppingTransport({
    apiKey: process.env.SERPER_API_KEY,
  });
  const shoppingTransport = async (shoppingRequest) => {
    if (
      counters.serperShoppingAttempts >=
      plan.ceilings.serperShoppingAttempts
    ) {
      throw new Error("Serper Shopping ceiling exceeded.");
    }
    counters.serperShoppingAttempts += 1;
    await persistCurrent();
    return baseShopping(shoppingRequest);
  };
  const sourceFetchDependencies = {
    ...LIVE_HYBRID_FETCH_DEPENDENCIES,
    transport: async (input) => {
      if (
        counters.sourcePageHttpAttempts >=
        plan.ceilings.sourcePageHttpAttempts
      ) {
        throw new Error("Source-page physical HTTP ceiling exceeded.");
      }
      counters.sourcePageHttpAttempts += 1;
      await persistCurrent();
      return LIVE_HYBRID_FETCH_DEPENDENCIES.transport(input);
    },
  };
  const fetchSource = async (url) => {
    if (counters.sourcePageFetches >= plan.ceilings.sourcePageFetches) {
      throw new Error("Source-page fetch ceiling exceeded.");
    }
    counters.sourcePageFetches += 1;
    await persistCurrent();
    return fetchHybridSource(url, sourceFetchDependencies);
  };

  const jobTokenSecret = randomBytes(32).toString("hex");
  const handlers = createStagedTerraRecommendationHandlers({
    createOpenAIClient: async () => client,
    getEnvironment: () => ({
      enabled: true,
      openAiApiKey: "process-only-present",
      serperApiKey: process.env.SERPER_API_KEY,
      jobTokenSecret,
    }),
    validateRequest: (body) =>
      JSON.stringify(body) === JSON.stringify(plan.attempt.shopperRequest)
        ? { data: structuredClone(plan.attempt.shopperRequest) }
        : { error: "The request differs from the approved readiness case." },
    pollResearch: (input) =>
      pollStagedTerraResearch({
        ...input,
        onEvaluationSnapshot: (snapshot) => {
          registeredProductTrace.captureResearch(snapshot);
        },
      }),
    collectVerificationInputs: (input) =>
      collectStagedTerraVerificationInputs({
        ...input,
        fetchSource,
      }),
    materializeEvidence: (input) => {
      const result = materializeStagedTerraEvidencePackage(input);
      registeredProductTrace.captureVerification({
        researchOutput: input.researchOutput,
        verifierResult: result,
      });
      return result;
    },
    createShoppingTransport: () => shoppingTransport,
    onDiagnostic: (diagnostic) => {
      routeDiagnostics.push(structuredClone(diagnostic));
      const webSearchCalls = Number(diagnostic.ledger?.usage?.webSearchCalls);
      if (Number.isFinite(webSearchCalls)) {
        counters.hostedSearches = Math.max(
          counters.hostedSearches,
          webSearchCalls,
        );
      }
    },
  });

  const result = await executeStagedTerraReadinessAttempt({
    matrix,
    plan,
    counters,
    routeDiagnostics,
    handlers,
    sleep,
    persistCheckpoint: scheduleCheckpoint,
    buildArtifact: (input) =>
      buildStagedTerraReadinessArtifact({
        ...input,
        registeredProductTrace: registeredProductTrace.snapshot(),
      }),
  });
  await checkpointWriter.drain();

  if (result.artifact) {
    const parsed = parseStagedTerraReadinessArtifact(result.artifact);
    if (!parsed.ok) {
      throw new Error("The in-memory readiness artifact did not reauthenticate.");
    }
    const accounting = stagedTerraReadinessAccounting(parsed.payload);
    const ceilingFailures = stagedTerraReadinessCeilingFailures({
      plan,
      accounting,
      wallClockMs: result.wallClockMs,
    });
    const ceilingBreached = ceilingFailures.length > 0;
    await writeStagedTerraReadinessFileExclusive(
      artifactFile,
      result.artifact,
    );
    const artifactSha256 = createHash("sha256")
      .update(result.artifact)
      .digest("hex");
    const terminalFailed = result.terminalCode !== null;
    const reviewPacket = buildStagedTerraReadinessReviewPacket(result.artifact);
    process.stdout.write(
      `${JSON.stringify({
        status:
          ceilingBreached || terminalFailed
            ? "artifact_captured_halt_required"
            : "artifact_captured_review_required",
        commitSha,
        trustSurfaceSha256: plan.trustSurface.manifestSha256,
        attemptIndex: plan.attempt.index,
        runId: plan.attempt.runId,
        terminalCode: result.terminalCode,
        wallClockMs: result.wallClockMs,
        counters,
        conservativeUsd: accounting.conservativeUsd,
        ceilingFailures,
        artifactSha256,
        reviewPacket,
        outputDirectory: plan.outputDirectory,
        outputRelativePath: plan.outputRelativePath,
        appendOnlyCheckpointsRetained: true,
        nextAttemptAutomatic: false,
      })}\n`,
    );
    if (ceilingBreached || terminalFailed) process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `${JSON.stringify({
      status: result.status,
      commitSha,
      trustSurfaceSha256: plan.trustSurface.manifestSha256,
      attemptIndex: plan.attempt.index,
      runId: plan.attempt.runId,
      failureCode: result.failureCode,
      counters,
      outputDirectory: plan.outputDirectory,
      outputRelativePath: plan.outputRelativePath,
      appendOnlyCheckpointsRetained: true,
      nextAttemptAutomatic: false,
    })}\n`,
  );
  process.exitCode = 1;
}

await main().catch(() => {
  process.stderr.write("Readiness runner stopped before a trusted terminal result.\n");
  process.exitCode = 1;
});

// One dry-run-first feasibility smoke for the complete staged Terra path.
// Live execution requires an exact reviewed commit and every numeric ceiling.

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  fetchHybridSource,
  LIVE_HYBRID_FETCH_DEPENDENCIES,
} from "../lib/autonomousFactVerifier.ts";
import {
  createDirectTerraSerperShoppingTransport,
  directTerraSerperApiKeyIsValid,
} from "../lib/directTerraSerperTransport.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";
import {
  isStagedTerraCompletedResponse,
  isStagedTerraPendingResponse,
  STAGED_TERRA_JOB_TOKEN_HEADER,
} from "../lib/stagedTerraApiContract.ts";
import { createStagedTerraRecommendationHandlers } from "../lib/stagedTerraRecommendationRoute.ts";
import { collectStagedTerraVerificationInputs } from "../lib/stagedTerraRuntime.ts";
import {
  estimatePhaseDCost,
  OAI_T10_PHASE_D_CASE,
  OAI_T10_PHASE_D_CEILINGS,
  phaseDPlan,
  validatePhaseDCreateRequest,
  validatePhaseDLiveApproval,
} from "./oai-t10-phase-d.mjs";

const EXECUTE = process.argv.includes("--execute");
const POLL_INTERVAL_MS = 2_000;

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function currentCommit() {
  return gitOutput(["rev-parse", "HEAD"]);
}

function trackedChanges() {
  const output = gitOutput(["status", "--porcelain", "--untracked-files=no"]);
  return output ? output.split(/\r?\n/) : [];
}

function evidenceDirectory(commit) {
  return path.resolve(
    `tests/fixtures/review-radar-live/oai-t10-phase-d-${commit.slice(0, 7)}`,
  );
}

async function directoryHasEvidence(directory) {
  try {
    return (await fs.readdir(directory)).length > 0;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function request(method, body, jobToken) {
  return new Request("http://localhost/api/recommendations", {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(jobToken ? { [STAGED_TERRA_JOB_TOKEN_HEADER]: jobToken } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function main() {
  const commit = currentCommit();
  const runPlan = {
    ...phaseDPlan(commit),
    mode: EXECUTE ? "execute" : "dry-run",
    outputDirectory: evidenceDirectory(commit),
  };
  if (!EXECUTE) {
    process.stdout.write(`${JSON.stringify(runPlan, null, 2)}\n`);
    return;
  }

  const outputDirectory = evidenceDirectory(commit);
  validatePhaseDLiveApproval({
    args: process.argv.slice(2),
    commit,
    trackedChanges: trackedChanges(),
    outputExists: await directoryHasEvidence(outputDirectory),
    environment: process.env,
  });
  if (!directTerraSerperApiKeyIsValid(process.env.SERPER_API_KEY ?? "")) {
    throw new Error("SERPER_API_KEY is not configured safely.");
  }

  const counters = {
    openAiCreates: 0,
    openAiRetrieves: 0,
    safetyCancels: 0,
    hostedSearches: 0,
    serperShoppingAttempts: 0,
    sourcePageFetches: 0,
    sourcePageHttpAttempts: 0,
    retries: 0,
    replacements: 0,
    fallbacks: 0,
    serperOrganicAttempts: 0,
    searchApiAttempts: 0,
  };
  const diagnostics = [];
  const evidence = {
    schemaVersion: "oai-t10-phase-d-sanitized-v4",
    capturedAt: new Date().toISOString(),
    commit,
    case: OAI_T10_PHASE_D_CASE,
    ceilings: OAI_T10_PHASE_D_CEILINGS,
    pricing: runPlan.pricing,
    counters,
    diagnostics,
    cost: null,
    outcome: {
      status: "running",
      wallClockMs: 0,
      failure: null,
    },
    publicResponse: null,
  };
  const attemptFile = path.join(outputDirectory, "attempt.json");
  const resultFile = path.join(outputDirectory, "result.json");
  const startedAtMs = Date.now();
  let writeChain = Promise.resolve();
  const persistAttempt = () => {
    writeChain = writeChain.then(() => writeJson(attemptFile, evidence));
    return writeChain;
  };
  await persistAttempt();

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, {
    maxRetries: 0,
  });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI SDK retry suppression is not active.");
  }
  const client = {
    responses: {
      create: async (body, options) => {
        if (
          counters.openAiCreates >= OAI_T10_PHASE_D_CEILINGS.openAiCreates
        ) {
          throw new Error("OpenAI create ceiling exceeded.");
        }
        const createNumber = counters.openAiCreates + 1;
        validatePhaseDCreateRequest(body, createNumber);
        counters.openAiCreates += 1;
        await persistAttempt();
        return sdkClient.responses.create(body, options);
      },
      retrieve: async (...args) => {
        if (
          counters.openAiRetrieves >=
          OAI_T10_PHASE_D_CEILINGS.openAiRetrieves
        ) {
          throw new Error("OpenAI retrieve ceiling exceeded.");
        }
        counters.openAiRetrieves += 1;
        await persistAttempt();
        return sdkClient.responses.retrieve(...args);
      },
      cancel: async (...args) => {
        if (
          counters.safetyCancels >= OAI_T10_PHASE_D_CEILINGS.safetyCancels
        ) {
          throw new Error("OpenAI safety-cancel ceiling exceeded.");
        }
        counters.safetyCancels += 1;
        await persistAttempt();
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  const baseShopping = createDirectTerraSerperShoppingTransport({
    apiKey: process.env.SERPER_API_KEY,
  });
  const shoppingTransport = async (shoppingRequest) => {
    if (
      counters.serperShoppingAttempts >=
      OAI_T10_PHASE_D_CEILINGS.serperShoppingAttempts
    ) {
      throw new Error("Serper Shopping ceiling exceeded.");
    }
    counters.serperShoppingAttempts += 1;
    await persistAttempt();
    return baseShopping(shoppingRequest);
  };
  const sourceFetchDependencies = {
    ...LIVE_HYBRID_FETCH_DEPENDENCIES,
    transport: async (input) => {
      if (
        counters.sourcePageHttpAttempts >=
        OAI_T10_PHASE_D_CEILINGS.sourcePageHttpAttempts
      ) {
        throw new Error("Source-page physical HTTP ceiling exceeded.");
      }
      counters.sourcePageHttpAttempts += 1;
      await persistAttempt();
      return LIVE_HYBRID_FETCH_DEPENDENCIES.transport(input);
    },
  };
  const fetchSource = async (url) => {
    if (
      counters.sourcePageFetches >=
      OAI_T10_PHASE_D_CEILINGS.sourcePageFetches
    ) {
      throw new Error("Source-page fetch ceiling exceeded.");
    }
    counters.sourcePageFetches += 1;
    await persistAttempt();
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
      JSON.stringify(body) ===
      JSON.stringify(OAI_T10_PHASE_D_CASE.shopperRequest)
        ? { data: OAI_T10_PHASE_D_CASE.shopperRequest }
        : { error: "The request differs from the frozen Phase D case." },
    collectVerificationInputs: (input) =>
      collectStagedTerraVerificationInputs({
        ...input,
        fetchSource,
      }),
    createShoppingTransport: () => shoppingTransport,
    onDiagnostic: (diagnostic) => {
      diagnostics.push(structuredClone(diagnostic));
      const webSearchCalls = Number(
        diagnostic.ledger?.usage?.webSearchCalls,
      );
      if (Number.isFinite(webSearchCalls)) {
        counters.hostedSearches = Math.max(
          counters.hostedSearches,
          webSearchCalls,
        );
      }
    },
  });

  let jobToken = null;
  let terminalBody = null;
  let terminalStatus = null;
  let completed = false;
  try {
    const started = await handlers.POST(
      request("POST", OAI_T10_PHASE_D_CASE.shopperRequest),
    );
    const startBody = await parseJson(started);
    if (
      started.status !== 202 ||
      !isStagedTerraPendingResponse(startBody)
    ) {
      terminalBody = startBody;
      terminalStatus = started.status;
      throw new Error("The staged route did not start a pending research job.");
    }
    jobToken = startBody.jobToken;

    for (
      let pollNumber = 0;
      pollNumber < OAI_T10_PHASE_D_CEILINGS.openAiRetrieves;
      pollNumber += 1
    ) {
      await sleep(POLL_INTERVAL_MS);
      const response = await handlers.GET(request("GET", undefined, jobToken));
      const body = await parseJson(response);
      if (response.status === 202 && isStagedTerraPendingResponse(body)) {
        if (body.jobToken !== jobToken) {
          throw new Error("The staged route changed the opaque job token.");
        }
        continue;
      }
      terminalBody = body;
      terminalStatus = response.status;
      if (
        response.status !== 200 ||
        !isStagedTerraCompletedResponse(body)
      ) {
        throw new Error("The staged route did not complete its public contract.");
      }
      if (body.cards.length === 0 || body.sources.length === 0) {
        throw new Error(
          "The staged route completed without a renderable verified briefing.",
        );
      }
      if (
        "jobToken" in body ||
        "diagnostics" in body ||
        "evidencePackage" in body
      ) {
        throw new Error("The public response crossed a private-state boundary.");
      }
      completed = true;
      break;
    }
    if (!completed) {
      throw new Error("The research job reached the retrieve ceiling.");
    }
    if (
      counters.hostedSearches < 1 ||
      counters.hostedSearches > OAI_T10_PHASE_D_CEILINGS.hostedSearches
    ) {
      throw new Error("Hosted-search usage is outside the approved envelope.");
    }
    evidence.cost = estimatePhaseDCost(diagnostics);
    for (const stage of ["research_poll", "verification", "presentation"]) {
      if (
        !diagnostics.some(
          (diagnostic) =>
            diagnostic.stage === stage && diagnostic.outcome === "completed",
        )
      ) {
        throw new Error(`The ${stage} stage did not complete successfully.`);
      }
    }
    if (
      evidence.cost.accountedLedgerCount !== 2 ||
      evidence.cost.completedLedgerCount !== 2 ||
      evidence.cost.duplicateTerminalLedgerCount !== 0
    ) {
      throw new Error(
        "Research and presentation usage were not both accounted.",
      );
    }
    if (
      evidence.cost.approvalEnvelopeConservativeUsd >
      OAI_T10_PHASE_D_CEILINGS.hardCeilingUsd
    ) {
      throw new Error("Estimated cost exceeded the approved dollar ceiling.");
    }
    evidence.publicResponse = terminalBody;
    evidence.outcome.status = "passed";
  } catch (error) {
    evidence.outcome.status = "failed";
    evidence.outcome.failure = {
      message:
        error instanceof Error ? error.message : "Unknown Phase D failure.",
      httpStatus: terminalStatus,
      publicCode:
        terminalBody &&
        typeof terminalBody === "object" &&
        typeof terminalBody.code === "string"
          ? terminalBody.code
          : null,
    };
    if (jobToken && !completed && counters.safetyCancels === 0) {
      try {
        await handlers.DELETE(request("DELETE", undefined, jobToken));
      } catch {
        // The one approved safety cancel is best effort.
      }
    }
    evidence.cost = estimatePhaseDCost(diagnostics);
    process.exitCode = 1;
  } finally {
    evidence.outcome.wallClockMs = Date.now() - startedAtMs;
    await persistAttempt();
  }

  if (evidence.outcome.status === "passed") {
    await writeJson(resultFile, evidence);
    await fs.rm(attemptFile);
  }
  process.stdout.write(
    `${JSON.stringify({
      status: evidence.outcome.status,
      commit,
      counters,
      cost: evidence.cost,
      cardCount: Array.isArray(evidence.publicResponse?.cards)
        ? evidence.publicResponse.cards.length
        : 0,
      sourceCount: Array.isArray(evidence.publicResponse?.sources)
        ? evidence.publicResponse.sources.length
        : 0,
      failure: evidence.outcome.failure,
      outputDirectory,
    })}\n`,
  );
}

await main();

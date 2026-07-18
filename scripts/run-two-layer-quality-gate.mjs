import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createOpenAIClient } from "../lib/openaiClient.ts";
import {
  createTwoLayerRecommendationHandlers,
} from "../lib/twoLayerRecommendationRoute.ts";
import {
  TWO_LAYER_CANCEL_BEFORE_EXPIRY_MS,
  TWO_LAYER_JOB_TOKEN_HEADER,
} from "../lib/twoLayerApiContract.ts";
import { isValidTwoLayerJobTokenSecret } from "../lib/twoLayerJobToken.ts";
import {
  analyzeTwoLayerQualityGate,
  TWO_LAYER_QUALITY_GATE_BARS,
  TWO_LAYER_QUALITY_GATE_CASES,
  TWO_LAYER_QUALITY_GATE_PLANNING,
  TWO_LAYER_QUALITY_GATE_VERSION,
  twoLayerCardSourceIds,
} from "./two-layer-quality-gate.mjs";

export const TWO_LAYER_GATE_LIVE_APPROVAL_ID = "oai-t5b-six-run-v1";
export const TWO_LAYER_GATE_POLL_INTERVAL_MS = 10_000;
export const TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT = 60;

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function exactRequestKey(value) {
  return JSON.stringify(value);
}

function frozenRuns() {
  return TWO_LAYER_QUALITY_GATE_CASES.flatMap((testCase) =>
    Array.from({ length: testCase.runs }, (_, index) => ({
      caseId: testCase.id,
      request: structuredClone(testCase.request),
      run: index + 1,
    })),
  );
}

function fixtureName(item) {
  return `${item.caseId}.run${item.run}.json`;
}

function attemptName(item) {
  return `${item.caseId}.run${item.run}.attempt.json`;
}

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function currentCommit() {
  const commit = gitOutput(["rev-parse", "HEAD"]);
  if (!/^[a-f0-9]{40}$/i.test(commit)) {
    throw new Error("The quality gate requires a full Git commit hash");
  }
  return commit;
}

function assertTrackedTreeClean() {
  const trackedStatus = gitOutput([
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (trackedStatus) {
    throw new Error("Commit the tracked quality-gate contract before live use");
  }
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, json(value), { encoding: "utf8", flag: "wx" });
}

async function replaceJson(filePath, value) {
  await fs.writeFile(filePath, json(value), "utf8");
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function responseJson(response) {
  return { body: await response.json(), status: response.status };
}

function request(method, body, token) {
  return new Request("http://localhost/api/recommendations", {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { [TWO_LAYER_JOB_TOKEN_HEADER]: token } : {}),
    },
    method,
  });
}

function safeAttemptRecord(item, commit, status, counters, extra = {}) {
  return {
    version: TWO_LAYER_QUALITY_GATE_VERSION,
    approvalId: TWO_LAYER_GATE_LIVE_APPROVAL_ID,
    caseId: item.caseId,
    run: item.run,
    commit,
    status,
    providerCalls: {
      creates: counters.creates,
      retrieves: counters.retrieves,
      cancels: counters.cancels,
    },
    ...extra,
  };
}

async function completedFixtures(outputDirectory) {
  const fixtures = [];
  for (const item of frozenRuns()) {
    const fixture = await readJsonIfPresent(
      path.join(outputDirectory, fixtureName(item)),
    );
    if (fixture) fixtures.push(fixture);
  }
  return fixtures;
}

async function nextFrozenRun(outputDirectory) {
  for (const item of frozenRuns()) {
    const attempt = await readJsonIfPresent(
      path.join(outputDirectory, attemptName(item)),
    );
    if (!attempt) return item;
    if (attempt.status !== "completed") {
      throw new Error(
        `A prior ${item.caseId} run ${item.run} attempt is ${attempt.status}; replacement spend requires new approval`,
      );
    }
    const fixture = await readJsonIfPresent(
      path.join(outputDirectory, fixtureName(item)),
    );
    if (!fixture) {
      throw new Error("A completed attempt is missing its sanitized fixture");
    }
  }
  return null;
}

function exactValidator(expectedRequest) {
  const expected = exactRequestKey(expectedRequest);
  return (body) =>
    exactRequestKey(body) === expected
      ? { data: structuredClone(expectedRequest) }
      : { error: "The live runner accepts only its frozen shopper request." };
}

function immediateStopFailures(analysis, item) {
  const runKey = `${item.caseId}:${item.run}`;
  const failures = analysis.failures.filter((failure) =>
    failure.includes(runKey),
  );
  if (
    item.caseId === "broad-shop-vac" &&
    analysis.metrics.broadLeaderRecall.perRun[item.run - 1] <
      TWO_LAYER_QUALITY_GATE_BARS.broadLeaderRunMinimum
  ) {
    failures.push("broad_leader_run_minimum_failed");
  }
  if (item.caseId === "broad-shop-vac" && item.run === 3) {
    for (const failure of [
      "broad_leader_mean_failed",
      `stability_failed:${item.caseId}`,
    ]) {
      if (analysis.failures.includes(failure)) failures.push(failure);
    }
  }
  if (analysis.failures.includes("estimated_cost_ceiling_exceeded")) {
    failures.push("estimated_cost_ceiling_exceeded");
  }
  return [...new Set(failures)];
}

export function buildTwoLayerManualReviewTemplate(fixtures) {
  return {
    productAudits: fixtures.flatMap((fixture) =>
      fixture.cards.map((card) => ({
        caseId: fixture.caseId,
        run: fixture.run,
        productKey: card.key,
        identity: card.identity,
        eligibility: "pending",
        requirementAccuracy:
          fixture.caseId === "con-robot-vac-300-selfempty" &&
          card.recommendationStatus === "Best Match"
            ? "pending"
            : "not_applicable",
        notes: "",
      })),
    ),
    sourceAudits: fixtures.flatMap((fixture) =>
      fixture.cards.slice(0, 2).map((card) => ({
        caseId: fixture.caseId,
        run: fixture.run,
        productKey: card.key,
        sourceIds: [...new Set(twoLayerCardSourceIds(card))].slice(0, 2),
        status: "pending",
        notes: "",
      })),
    ),
    blindComparisons: TWO_LAYER_QUALITY_GATE_CASES.map((testCase) => ({
      caseId: testCase.id,
      result: "pending",
      notes: "",
    })),
  };
}

export function validateTwoLayerGateProcessEnvironment(environment = process.env) {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  const jobTokenSecret = environment.REVIEW_RADAR_JOB_TOKEN_SECRET;
  if (!apiKey || !jobTokenSecret) {
    throw new Error(
      "Set process-only OPENAI_API_KEY and REVIEW_RADAR_JOB_TOKEN_SECRET values",
    );
  }
  if (!isValidTwoLayerJobTokenSecret(jobTokenSecret)) {
    throw new Error(
      "REVIEW_RADAR_JOB_TOKEN_SECRET must contain at least 32 UTF-8 bytes",
    );
  }
  return { apiKey, jobTokenSecret };
}

export function twoLayerGatePreflightPlan(commit = "<commit-after-T5A>") {
  return {
    status: "preflight_only_no_provider_calls",
    approvalId: TWO_LAYER_GATE_LIVE_APPROVAL_ID,
    commit,
    cases: frozenRuns(),
    planning: TWO_LAYER_QUALITY_GATE_PLANNING,
    perAttemptCeilings: {
      creates: 1,
      retrieves: TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT,
      cancels: 1,
      pollIntervalMs: TWO_LAYER_GATE_POLL_INTERVAL_MS,
    },
    rules: [
      "One invocation advances exactly one frozen run.",
      "No retries, fallbacks, replacements, or persisted provider identifiers.",
      "A failed or interrupted attempt blocks every later run until new approval.",
      "Secrets are read only from the process environment; .env.local is not loaded or changed.",
    ],
  };
}

async function executeNextRun({ commit, outputDirectory }) {
  const halted = await readJsonIfPresent(path.join(outputDirectory, "HALTED.json"));
  if (halted) throw new Error(`The gate is halted: ${halted.reason}`);
  const item = await nextFrozenRun(outputDirectory);
  if (!item) {
    return { status: "all_provider_runs_already_completed" };
  }

  const { apiKey, jobTokenSecret } = validateTwoLayerGateProcessEnvironment();
  const sdkClient = await createOpenAIClient(apiKey, { maxRetries: 0 });

  const counters = { creates: 0, retrieves: 0, cancels: 0 };
  const attemptPath = path.join(outputDirectory, attemptName(item));
  await writeJson(
    attemptPath,
    safeAttemptRecord(item, commit, "reserved_before_create", counters, {
      startedAt: new Date().toISOString(),
    }),
  );

  const boundedClient = {
    responses: {
      create: async (...args) => {
        counters.creates += 1;
        if (counters.creates > 1) {
          throw new Error("Per-attempt OpenAI create ceiling exceeded");
        }
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        counters.retrieves += 1;
        if (counters.retrieves > TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT) {
          throw new Error("Per-attempt OpenAI retrieve ceiling exceeded");
        }
        return sdkClient.responses.retrieve(...args);
      },
      cancel: async (...args) => {
        counters.cancels += 1;
        if (counters.cancels > 1) {
          throw new Error("Per-attempt OpenAI cancel ceiling exceeded");
        }
        return sdkClient.responses.cancel(...args);
      },
    },
  };
  let completion = null;
  let formatter = null;
  let verificationFailure = null;
  const handlers = createTwoLayerRecommendationHandlers({
    createOpenAIClient: async (_key, options) => {
      if (options?.maxRetries !== 0) {
        throw new Error("OpenAI retry suppression is not active");
      }
      return boundedClient;
    },
    getEnvironment: () => ({ openAiApiKey: apiKey, jobTokenSecret }),
    validateRequest: exactValidator(item.request),
    onResearchCompleted: (diagnostic) => {
      completion = structuredClone(diagnostic);
    },
    onResearchFormatted: (diagnostic) => {
      formatter = structuredClone(diagnostic);
    },
    onVerificationFailure: (diagnostic) => {
      verificationFailure = structuredClone(diagnostic);
    },
  });

  const wallStart = Date.now();
  let token = null;
  try {
    const started = await responseJson(
      await handlers.POST(request("POST", item.request)),
    );
    if (started.status !== 202 || started.body?.state !== "pending") {
      throw new Error(`Start route failed safely with status ${started.status}`);
    }
    token = started.body.jobToken;
    const expiresAtMs = started.body.expiresAtMs;
    let terminal = null;
    while (!terminal) {
      if (
        Date.now() >= expiresAtMs - TWO_LAYER_CANCEL_BEFORE_EXPIRY_MS ||
        counters.retrieves >= TWO_LAYER_GATE_MAX_RETRIEVES_PER_ATTEMPT
      ) {
        await handlers.DELETE(request("DELETE", undefined, token));
        throw new Error(
          "Research was cancelled at the bounded polling or token-expiry limit",
        );
      }
      await sleep(TWO_LAYER_GATE_POLL_INTERVAL_MS);
      const polled = await responseJson(
        await handlers.GET(request("GET", undefined, token)),
      );
      if (polled.status === 202 && polled.body?.state === "pending") continue;
      terminal = polled;
    }
    if (terminal.status !== 200 || terminal.body?.state !== "completed") {
      throw new Error(`Completion route failed safely with status ${terminal.status}`);
    }
    if (!completion || !formatter) {
      throw new Error("Required bounded completion diagnostics are missing");
    }

    const fixture = {
      gateVersion: TWO_LAYER_QUALITY_GATE_VERSION,
      caseId: item.caseId,
      run: item.run,
      commit,
      wallClockMs: Date.now() - wallStart,
      route: { status: terminal.status, state: terminal.body.state },
      completion,
      formatter,
      cards: terminal.body.cards,
      sources: terminal.body.sources,
    };
    await writeJson(path.join(outputDirectory, fixtureName(item)), fixture);
    await replaceJson(
      attemptPath,
      safeAttemptRecord(item, commit, "completed", counters, {
        completedAt: new Date().toISOString(),
      }),
    );

    const fixtures = await completedFixtures(outputDirectory);
    const partialAnalysis = analyzeTwoLayerQualityGate({ fixtures });
    const stopFailures = immediateStopFailures(partialAnalysis, item);
    if (stopFailures.length > 0) {
      await writeJson(path.join(outputDirectory, "HALTED.json"), {
        reason: "absolute_per_run_gate_failed",
        caseId: item.caseId,
        run: item.run,
        failures: stopFailures,
      });
      return { status: "halted", item, counters, failures: stopFailures };
    }
    if (fixtures.length === TWO_LAYER_QUALITY_GATE_PLANNING.responsesCreates) {
      await writeJson(
        path.join(outputDirectory, "manual-review.template.json"),
        buildTwoLayerManualReviewTemplate(fixtures),
      );
      await writeJson(
        path.join(outputDirectory, "mechanical-analysis.json"),
        partialAnalysis,
      );
      if (partialAnalysis.failures.length > 0) {
        await writeJson(path.join(outputDirectory, "HALTED.json"), {
          reason: "final_mechanical_gate_failed",
          failures: partialAnalysis.failures,
        });
      }
      return {
        status:
          partialAnalysis.failures.length === 0
            ? "provider_window_complete_manual_review_required"
            : "halted",
        item,
        counters,
        analysis: partialAnalysis,
      };
    }
    return { status: "one_run_completed", item, counters };
  } catch (error) {
    await replaceJson(
      attemptPath,
      safeAttemptRecord(item, commit, "failed", counters, {
        completedAt: new Date().toISOString(),
        failure: {
          name: error instanceof Error ? error.name : "UnknownError",
          message:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "Unknown live-run failure",
          verification: verificationFailure,
        },
      }),
    );
    throw error;
  }
}

async function main() {
  const approvalArgument = process.argv.find((value) =>
    value.startsWith("--execute-live="),
  );
  if (approvalArgument !== `--execute-live=${TWO_LAYER_GATE_LIVE_APPROVAL_ID}`) {
    process.stdout.write(json(twoLayerGatePreflightPlan()));
    return;
  }

  assertTrackedTreeClean();
  const commit = currentCommit();
  const outputDirectory = path.resolve(
    `tests/fixtures/review-radar-live/oai-t5b-two-layer-${commit.slice(0, 7)}`,
  );
  await fs.mkdir(outputDirectory, { recursive: true });
  const result = await executeNextRun({ commit, outputDirectory });
  process.stdout.write(
    json({
      ...result,
      outputDirectory,
    }),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown gate-runner error"}\n`,
    );
    process.exitCode = 1;
  });
}

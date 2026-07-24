// OAI-T9 terminal Sol acceptance runner.
//
// Dry-run is the default and dispatches no network request. Live execution is
// available only with --execute plus an exact current commit, dollar ceiling,
// and acknowledgment of the audit allowance required by the written gate.

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DIRECT_TERRA_JOB_TOKEN_HEADER,
} from "../lib/directTerraApiContract.ts";
import {
  createDirectTerraRecommendationHandlers,
} from "../lib/directTerraRecommendationRoute.ts";
import {
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import {
  DIRECT_TERRA_COMPARISON_MODEL,
  DIRECT_TERRA_PROMPT_VERSION,
} from "../lib/directTerraPrompt.ts";
import {
  buildDirectTerraRecommendationFirstLossDiagnostic,
  buildDirectTerraRankedProductAccounting,
} from "../lib/directTerraFirstLoss.ts";
import {
  resolveDirectTerraProductAssets,
} from "../lib/directTerraProductAssets.ts";
import {
  createDirectTerraProductPageTransport,
} from "../lib/directTerraProductPageFetcher.ts";
import {
  isPublicHybridFetchAddress,
  nodeHybridTransport,
  resolveHybridHost,
} from "../lib/autonomousFactVerifier.ts";
import {
  createDirectTerraSerperOrganicTransport,
  createDirectTerraSerperShoppingTransport,
  directTerraSerperApiKeyIsValid,
} from "../lib/directTerraSerperTransport.ts";
import {
  scoreDirectTerraRunProspective,
} from "../lib/directTerraEvaluation.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";
import {
  GOLD,
  coversLeaderProspective07d,
} from "./goldBenchmark.mjs";
import {
  OAI_T9_ACCEPTANCE_CASES,
  OAI_T9_ACCEPTANCE_ENVELOPE,
  OAI_T9_ACCEPTANCE_VERSION,
  OAI_T9_AUDIT_ALLOWANCE,
  OAI_T9_SOL_PRICING,
  analyzeOaiT9Acceptance,
  buildOaiT9AcceptancePlan,
  buildOaiT9BlindPacket,
  buildOaiT9ManualReviewTemplate,
  estimateOaiT9SolCost,
  loadAndVerifyOaiT9Baseline,
} from "./oai-t9-final-acceptance.mjs";

const POLL_INTERVAL_MS = 5_000;

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function currentCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function trackedStatus() {
  return execFileSync(
    "git",
    ["status", "--short", "--untracked-files=no"],
    { encoding: "utf8" },
  ).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function benchmarkById(id) {
  const benchmark = GOLD.find((item) => item.id === id);
  if (!benchmark) throw new Error(`Missing frozen benchmark ${id}`);
  return benchmark;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function directoryEntries(directory) {
  try {
    return await fs.readdir(directory);
  } catch {
    return [];
  }
}

function contentTypeExtension(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function headerValue(headers, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function retrieveOaiT9SelectedImages({
  outputDirectory,
  caseId,
  run,
  productAssets,
  counters,
  globalCounters,
  resolveHost = resolveHybridHost,
  transport = nodeHybridTransport,
}) {
  const checks = [];
  for (const asset of productAssets) {
    if (!asset.imageUrl) continue;
    if (
      counters.selectedImageRetrievals >=
        OAI_T9_AUDIT_ALLOWANCE.selectedImagesPerRun ||
      globalCounters.selectedImageRetrievals >=
        OAI_T9_AUDIT_ALLOWANCE.selectedImageRetrievals
    ) {
      throw new Error("selected_image_retrieval_ceiling_exceeded");
    }
    counters.selectedImageRetrievals += 1;
    globalCounters.selectedImageRetrievals += 1;
    const urlHash = createHash("sha256")
      .update(asset.imageUrl, "utf8")
      .digest("hex");
    try {
      const url = new URL(asset.imageUrl);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        (url.port && url.port !== "443")
      ) {
        throw new Error("unsafe_image_url");
      }
      const addresses = await resolveHost(url.hostname);
      if (
        addresses.length === 0 ||
        addresses.some((address) => !isPublicHybridFetchAddress(address))
      ) {
        throw new Error("non_public_image_host");
      }
      const response = await transport({
        url,
        address: addresses[0],
        timeoutMs: 30_000,
        maxBytes: 8 * 1024 * 1024,
        accept:
          "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.1",
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`image_http_${response.status}`);
      }
      const contentType = headerValue(
        response.headers,
        "content-type",
      )
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!contentType?.startsWith("image/")) {
        throw new Error("non_image_content_type");
      }
      const body = Buffer.from(response.body);
      if (body.byteLength > 8 * 1024 * 1024) {
        throw new Error("image_body_too_large");
      }
      const fileName = `${caseId}.run${run}.rank${asset.rank}.${contentTypeExtension(
        contentType,
      )}`;
      await fs.writeFile(path.join(outputDirectory, fileName), body);
      checks.push({
        rank: asset.rank,
        status: "retrieved",
        contentType,
        byteLength: body.byteLength,
        urlHash,
        fileName,
      });
    } catch (error) {
      checks.push({
        rank: asset.rank,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown_error",
        urlHash,
      });
    }
  }
  return checks;
}

function blankCounters() {
  return {
    creates: 0,
    hostedSearches: 0,
    retrieves: 0,
    safetyCancels: 0,
    serperShoppingRequests: 0,
    serperOrganicRequests: 0,
    candidatePageFetches: 0,
    selectedImageRetrievals: 0,
  };
}

function assertCounter({
  perRunValue,
  globalValue,
  perRunMaximum,
  globalMaximum,
  label,
}) {
  if (perRunValue >= perRunMaximum || globalValue >= globalMaximum) {
    throw new Error(`${label}_ceiling_exceeded`);
  }
}

function validateLiveAuthorization({ commit }) {
  const approvedCommit = argumentValue("--approved-commit");
  const approvedDollarCeiling = Number(
    argumentValue("--approved-dollar-ceiling"),
  );
  if (approvedCommit !== commit) {
    throw new Error(
      "Live execution requires --approved-commit=<current full commit>.",
    );
  }
  if (approvedDollarCeiling !== OAI_T9_SOL_PRICING.hardCeilingUsd) {
    throw new Error(
      `Live execution requires --approved-dollar-ceiling=${OAI_T9_SOL_PRICING.hardCeilingUsd}.`,
    );
  }
  if (!process.argv.includes("--approved-audit-allowance")) {
    throw new Error(
      "Live execution requires --approved-audit-allowance because image and source review are mandatory gates.",
    );
  }
  if (trackedStatus()) {
    throw new Error("Tracked worktree must be clean before the live window.");
  }
}

export function oaiT9AcceptancePreflight(repositoryRoot = process.cwd()) {
  const commit = currentCommit();
  const baselineReports = loadAndVerifyOaiT9Baseline(repositoryRoot);
  return {
    plan: buildOaiT9AcceptancePlan(commit),
    baseline: {
      reportCount: baselineReports.length,
      reportHashesVerified: true,
    },
    command:
      `node --no-warnings scripts/run-oai-t9-final-acceptance.mjs --execute ` +
      `--approved-commit=${commit} ` +
      `--approved-dollar-ceiling=${OAI_T9_SOL_PRICING.hardCeilingUsd} ` +
      "--approved-audit-allowance",
  };
}

async function runOne({
  sdkClient,
  apiKey,
  serperApiKey,
  jobTokenSecret,
  testCase,
  run,
  outputDirectory,
  globalCounters,
}) {
  const counters = blankCounters();
  const assetDiagnostics = [];
  let capturedCompletion = null;
  let latestLedger = null;
  let resolvedTargets = [];
  let boundaryFailure = null;

  const wrappedClient = {
    responses: {
      create: async (...args) => {
        assertCounter({
          perRunValue: counters.creates,
          globalValue: globalCounters.creates,
          perRunMaximum: 1,
          globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.responsesCreates,
          label: "create",
        });
        counters.creates += 1;
        globalCounters.creates += 1;
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        assertCounter({
          perRunValue: counters.retrieves,
          globalValue: globalCounters.retrieves,
          perRunMaximum: 60,
          globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.retrieves,
          label: "retrieve",
        });
        counters.retrieves += 1;
        globalCounters.retrieves += 1;
        return sdkClient.responses.retrieve(...args);
      },
      cancel: async (...args) => {
        assertCounter({
          perRunValue: counters.safetyCancels,
          globalValue: globalCounters.safetyCancels,
          perRunMaximum: 1,
          globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.safetyCancels,
          label: "cancel",
        });
        counters.safetyCancels += 1;
        globalCounters.safetyCancels += 1;
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  const shoppingBase = createDirectTerraSerperShoppingTransport({
    apiKey: serperApiKey,
  });
  const organicBase = createDirectTerraSerperOrganicTransport({
    apiKey: serperApiKey,
  });
  const pageBase = createDirectTerraProductPageTransport({});
  const shoppingTransport = async (request) => {
    assertCounter({
      perRunValue: counters.serperShoppingRequests,
      globalValue: globalCounters.serperShoppingRequests,
      perRunMaximum: 5,
      globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.serperShoppingRequests,
      label: "serper_shopping",
    });
    counters.serperShoppingRequests += 1;
    globalCounters.serperShoppingRequests += 1;
    return shoppingBase(request);
  };
  const organicTransport = async (request) => {
    assertCounter({
      perRunValue: counters.serperOrganicRequests,
      globalValue: globalCounters.serperOrganicRequests,
      perRunMaximum: 8,
      globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.serperOrganicRequests,
      label: "serper_organic",
    });
    counters.serperOrganicRequests += 1;
    globalCounters.serperOrganicRequests += 1;
    return organicBase(request);
  };
  const pageTransport = async (url) => {
    assertCounter({
      perRunValue: counters.candidatePageFetches,
      globalValue: globalCounters.candidatePageFetches,
      perRunMaximum: 5,
      globalMaximum: OAI_T9_ACCEPTANCE_ENVELOPE.candidatePageFetches,
      label: "candidate_page_fetch",
    });
    counters.candidatePageFetches += 1;
    globalCounters.candidatePageFetches += 1;
    return pageBase(url);
  };

  const handlers = createDirectTerraRecommendationHandlers({
    createOpenAIClient: async () => wrappedClient,
    getEnvironment: () => ({
      openAiApiKey: apiKey,
      jobTokenSecret,
      serperApiKey,
      enabled: true,
    }),
    startResearch: async (args) => {
      const result = await startDirectTerraResearch({
        ...args,
        model: DIRECT_TERRA_COMPARISON_MODEL,
      });
      latestLedger = result.ledger ?? latestLedger;
      return result;
    },
    pollResearch: async (args) => {
      const result = await pollDirectTerraResearch({
        ...args,
        model: DIRECT_TERRA_COMPARISON_MODEL,
      });
      latestLedger = result.ledger ?? latestLedger;
      if (result.ok && result.state === "completed") {
        capturedCompletion = result;
      }
      return result;
    },
    cancelResearch: async (args) => {
      const result = await cancelDirectTerraResearch({
        ...args,
        model: DIRECT_TERRA_COMPARISON_MODEL,
      });
      latestLedger = result.ledger ?? latestLedger;
      return result;
    },
    createSerperTransport: () => shoppingTransport,
    createSerperOrganicTransport: () => organicTransport,
    createProductPageTransport: () => pageTransport,
    resolveProductAssets: async (args) => {
      resolvedTargets = structuredClone(args.targets);
      try {
        return await resolveDirectTerraProductAssets({
          ...args,
          recordFirstLossDiagnostic: (diagnostic) =>
            assetDiagnostics.push(diagnostic),
        });
      } catch (error) {
        boundaryFailure =
          error instanceof Error ? error.message : "asset_resolution_error";
        throw error;
      }
    },
  });

  const startedAt = Date.now();
  let routeStatus = 0;
  let routeBody = null;
  let failureReason = null;
  let jobToken = null;
  let researchCompleted = false;
  try {
    const postResponse = await handlers.POST(
      new Request("http://reviewradar.local/api/direct-terra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(testCase.request),
      }),
    );
    const postBody = await postResponse.json();
    if (postResponse.status !== 202 || typeof postBody.jobToken !== "string") {
      routeStatus = postResponse.status;
      routeBody = postBody;
      throw new Error(`route_start_failed_${postResponse.status}`);
    }
    jobToken = postBody.jobToken;

    while (true) {
      if (counters.retrieves >= 60) {
        await handlers.DELETE(
          new Request("http://reviewradar.local/api/direct-terra", {
            method: "DELETE",
            headers: { [DIRECT_TERRA_JOB_TOKEN_HEADER]: jobToken },
          }),
        );
        throw new Error("retrieve_ceiling_reached");
      }
      await sleep(POLL_INTERVAL_MS);
      const getResponse = await handlers.GET(
        new Request("http://reviewradar.local/api/direct-terra", {
          headers: { [DIRECT_TERRA_JOB_TOKEN_HEADER]: jobToken },
        }),
      );
      const getBody = await getResponse.json();
      routeStatus = getResponse.status;
      routeBody = getBody;
      if (getResponse.status === 202) continue;
      if (getResponse.status !== 200 || getBody.state !== "completed") {
        throw new Error(`route_poll_failed_${getResponse.status}`);
      }
      researchCompleted = true;
      break;
    }
    if (boundaryFailure) throw new Error(boundaryFailure);
    if (!capturedCompletion) {
      throw new Error("completed_route_missing_server_completion");
    }
  } catch (error) {
    failureReason = error instanceof Error ? error.message : "unknown_error";
    // A known unfinished background job must not be abandoned merely because
    // the route or harness failed. The DELETE handler verifies the same
    // capability token and the wrapped client enforces one cancel per run.
    if (
      jobToken &&
      !researchCompleted &&
      counters.safetyCancels < 1
    ) {
      try {
        await handlers.DELETE(
          new Request("http://reviewradar.local/api/direct-terra", {
            method: "DELETE",
            headers: { [DIRECT_TERRA_JOB_TOKEN_HEADER]: jobToken },
          }),
        );
      } catch {
        // The failed cancellation remains visible in its counter and the
        // route failure remains in the fixed twelve-run denominator.
      }
    }
  }

  const usage = latestLedger?.usage ?? {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    webSearchCalls: 0,
  };
  counters.hostedSearches = usage.webSearchCalls;
  globalCounters.hostedSearches += usage.webSearchCalls;
  if (
    counters.hostedSearches > 20 ||
    globalCounters.hostedSearches >
      OAI_T9_ACCEPTANCE_ENVELOPE.hostedSearches
  ) {
    failureReason ??= "hosted_search_ceiling_exceeded";
  }

  const productAssets = array(routeBody?.productAssets);
  let selectedImageChecks = [];
  if (!failureReason && routeStatus === 200) {
    try {
      selectedImageChecks = await retrieveOaiT9SelectedImages({
        outputDirectory,
        caseId: testCase.id,
        run,
        productAssets,
        counters,
        globalCounters,
      });
    } catch (error) {
      failureReason =
        error instanceof Error ? error.message : "image_retrieval_error";
    }
  }

  const benchmark = benchmarkById(testCase.goldId);
  const reportMarkdown =
    typeof routeBody?.reportMarkdown === "string"
      ? routeBody.reportMarkdown
      : "";
  const priceEstimates = array(routeBody?.priceEstimates);
  const score =
    reportMarkdown && capturedCompletion
      ? scoreDirectTerraRunProspective({
          reportMarkdown,
          priceEstimates,
          goldEntry: benchmark,
          coversLeader: coversLeaderProspective07d,
        })
      : null;
  const recommendationFirstLoss =
    score && capturedCompletion
      ? buildDirectTerraRecommendationFirstLossDiagnostic({
          searchCallCount: usage.webSearchCalls,
          searchActions: capturedCompletion.searchActions,
          sourceHosts: capturedCompletion.sourceHosts,
          responseSourceTitles: capturedCompletion.responseSources
            .map((source) => source.title)
            .filter((title) => typeof title === "string"),
          reportMarkdown,
          leaders: benchmark.coreLeaders,
          rankedProducts: score.rankedProducts,
          coversLeader: coversLeaderProspective07d,
          requirementVerdicts: {
            wrongTypeCount: score.wrongTypeHits.length,
            budgetViolationCount:
              score.constraint?.budgetViolations.length ?? 0,
            featureCoverage:
              score.constraint?.features.map((feature) => ({
                label: feature.label,
                coverageRate: feature.coverageRate,
              })) ?? [],
          },
          candidateSlateDiagnostic:
            capturedCompletion.candidateSlateDiagnostic,
        })
      : null;
  const rankedProductAccounting =
    capturedCompletion && reportMarkdown
      ? buildDirectTerraRankedProductAccounting({
          reportMarkdown,
          targets: resolvedTargets,
          productAssets,
          assetDiagnostics,
        })
      : null;

  return {
    acceptanceVersion: OAI_T9_ACCEPTANCE_VERSION,
    caseId: testCase.id,
    run,
    commit: currentCommit(),
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    modelRequested: DIRECT_TERRA_COMPARISON_MODEL,
    modelReturned: latestLedger?.modelReturned ?? null,
    wallClockMs: Date.now() - startedAt,
    route: {
      status: routeStatus,
      state: routeBody?.state ?? "failed",
      failureReason,
    },
    counters,
    usage,
    estimatedCostUsd: Number(
      estimateOaiT9SolCost(usage).toFixed(6),
    ),
    conservativeCostUpperBoundUsd: Number(
      estimateOaiT9SolCost(usage, { conservative: true }).toFixed(6),
    ),
    reportMarkdown,
    citationUrls: array(routeBody?.citationUrls),
    researchSources: capturedCompletion?.responseSources ?? [],
    priceEstimates,
    productAssets,
    selectedImageChecks,
    scoreProspective07d: score,
    firstLoss: {
      recommendation: recommendationFirstLoss,
      assets: assetDiagnostics,
      rankedProducts: rankedProductAccounting,
    },
  };
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

async function execute(repositoryRoot) {
  const commit = currentCommit();
  validateLiveAuthorization({ commit });
  const plan = buildOaiT9AcceptancePlan(commit);
  const baselineReports = loadAndVerifyOaiT9Baseline(repositoryRoot);
  const shortCommit = commit.slice(0, 7);
  const outputDirectory = path.resolve(
    repositoryRoot,
    `tests/fixtures/review-radar-live/oai-t9-sol-acceptance-${shortCommit}`,
  );
  if ((await directoryEntries(outputDirectory)).length > 0) {
    throw new Error(
      `Evidence already exists at ${outputDirectory}; refusing replacement.`,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const serperApiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  if (!directTerraSerperApiKeyIsValid(serperApiKey ?? "")) {
    throw new Error("SERPER_API_KEY is not configured safely.");
  }
  const jobTokenSecret =
    process.env.REVIEW_RADAR_JOB_TOKEN_SECRET?.trim() ||
    randomBytes(32).toString("hex");
  if (Buffer.byteLength(jobTokenSecret, "utf8") < 32) {
    throw new Error("REVIEW_RADAR_JOB_TOKEN_SECRET must be at least 32 bytes.");
  }

  const sdkClient = await createOpenAIClient(apiKey, { maxRetries: 0 });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI SDK retry suppression is not active.");
  }

  const globalCounters = blankCounters();
  const summary = {
    schemaVersion: "oai-t9-sol-acceptance-summary-v1",
    plan,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totals: {
      ...blankCounters(),
      estimatedCostUsd: 0,
      conservativeCostUpperBoundUsd: 0,
      wallClockMs: 0,
    },
    runs: [],
    stoppedForCeiling: null,
  };
  const windowStartedAt = Date.now();
  await writeJson(path.join(outputDirectory, "summary.json"), summary);

  const fixtures = [];
  outer: for (const testCase of OAI_T9_ACCEPTANCE_CASES) {
    for (let run = 1; run <= testCase.runs; run += 1) {
      const fixture = await runOne({
        sdkClient,
        apiKey,
        serperApiKey,
        jobTokenSecret,
        testCase,
        run,
        outputDirectory,
        globalCounters,
      });
      fixtures.push(fixture);
      await writeJson(
        path.join(outputDirectory, `${testCase.id}.run${run}.json`),
        fixture,
      );
      const standardCost = fixtures.reduce(
        (sum, item) => sum + item.estimatedCostUsd,
        0,
      );
      const conservativeCost = fixtures.reduce(
        (sum, item) => sum + item.conservativeCostUpperBoundUsd,
        0,
      );
      summary.runs.push({
        caseId: testCase.id,
        run,
        route: fixture.route,
        rankedCount: fixture.scoreProspective07d?.rankedCount ?? 0,
        recall:
          fixture.scoreProspective07d
            ? `${fixture.scoreProspective07d.leaderRecall.count}/${fixture.scoreProspective07d.leaderRecall.total}`
            : "not_scored",
        counters: fixture.counters,
        estimatedCostUsd: fixture.estimatedCostUsd,
        conservativeCostUpperBoundUsd:
          fixture.conservativeCostUpperBoundUsd,
      });
      summary.totals = {
        ...globalCounters,
        estimatedCostUsd: Number(standardCost.toFixed(6)),
        conservativeCostUpperBoundUsd: Number(
          conservativeCost.toFixed(6),
        ),
        wallClockMs: Date.now() - windowStartedAt,
      };
      await writeJson(path.join(outputDirectory, "summary.json"), summary);
      if (
        conservativeCost >
        OAI_T9_SOL_PRICING.hardCeilingUsd
      ) {
        summary.stoppedForCeiling = "dollar_ceiling";
        break outer;
      }
    }
  }

  if (fixtures.length === 12) {
    const { packet, key } = buildOaiT9BlindPacket({
      fixtures,
      baselineReports,
      commit,
    });
    await writeJson(
      path.join(outputDirectory, "blind-comparison-packet.json"),
      packet,
    );
    await writeJson(
      path.join(outputDirectory, "blind-comparison-key.json"),
      key,
    );
    await writeJson(
      path.join(outputDirectory, "manual-review.json"),
      buildOaiT9ManualReviewTemplate(fixtures),
    );
  }
  summary.completedAt = new Date().toISOString();
  summary.totals.wallClockMs = Date.now() - windowStartedAt;
  await writeJson(path.join(outputDirectory, "summary.json"), summary);
  process.stdout.write(
    `${JSON.stringify({
      status:
        fixtures.length === 12
          ? "live_window_complete_manual_review_required"
          : "live_window_stopped_before_completion",
      outputDirectory,
      totals: summary.totals,
      completedRuns: fixtures.length,
      failedRoutes: fixtures.filter(
        (fixture) => fixture.route.status !== 200,
      ).length,
      stoppedForCeiling: summary.stoppedForCeiling,
    }, null, 2)}\n`,
  );
}

export async function main(repositoryRoot = process.cwd()) {
  const evaluateDirectory = argumentValue("--evaluate");
  if (evaluateDirectory) {
    const liveEvidenceRoot = path.resolve(
      repositoryRoot,
      "tests/fixtures/review-radar-live",
    );
    const evidenceDirectory = path.resolve(repositoryRoot, evaluateDirectory);
    const relativeEvidenceDirectory = path.relative(
      liveEvidenceRoot,
      evidenceDirectory,
    );
    if (
      relativeEvidenceDirectory.startsWith("..") ||
      path.isAbsolute(relativeEvidenceDirectory) ||
      !/^oai-t9-sol-acceptance-[a-f0-9]{7,40}$/i.test(
        path.basename(evidenceDirectory),
      )
    ) {
      throw new Error(
        "--evaluate must name one OAI-T9 evidence directory under tests/fixtures/review-radar-live.",
      );
    }
    const fixtures = [];
    for (const testCase of OAI_T9_ACCEPTANCE_CASES) {
      for (let run = 1; run <= testCase.runs; run += 1) {
        fixtures.push(
          JSON.parse(
            await fs.readFile(
              path.join(
                evidenceDirectory,
                `${testCase.id}.run${run}.json`,
              ),
              "utf8",
            ),
          ),
        );
      }
    }
    const manualReview = JSON.parse(
      await fs.readFile(
        path.join(evidenceDirectory, "manual-review.json"),
        "utf8",
      ),
    );
    const blindKey = JSON.parse(
      await fs.readFile(
        path.join(evidenceDirectory, "blind-comparison-key.json"),
        "utf8",
      ),
    );
    const result = analyzeOaiT9Acceptance({
      fixtures,
      manualReview,
      blindKey,
    });
    await writeJson(
      path.join(evidenceDirectory, "acceptance-result.json"),
      result,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (!process.argv.includes("--execute")) {
    process.stdout.write(
      `${JSON.stringify(oaiT9AcceptancePreflight(repositoryRoot), null, 2)}\n`,
    );
    return;
  }
  await execute(repositoryRoot);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  await main();
}

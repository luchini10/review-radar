import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { productSelectionTestExports } from "../lib/productSelection.ts";
import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");
const DEFAULT_BENCHMARK = "pr14-live-accuracy-v2026-09a";
const REQUEST_TIMEOUT_MS = 120_000;
const SERVER_START_TIMEOUT_MS = 45_000;
const SERVER_STOP_TIMEOUT_MS = 5_000;
const PUBLIC_PRODUCT_KEYS = [
  "category",
  "imageUrl",
  "name",
  "price",
  "productPageUrl",
];

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function benchmarkUrl() {
  const name = argumentValue("benchmark") || DEFAULT_BENCHMARK;
  if (!/^[a-z0-9-]+$/i.test(name)) {
    throw new Error("--benchmark must be a benchmark filename stem, not a path.");
  }
  return new URL(`../tests/benchmarks/${name}.json`, import.meta.url);
}

function requireApprovedRun(expectedRuns) {
  const approvedRuns = Number(argumentValue("approved-runs"));
  const phase = argumentValue("phase") || "current";
  if (approvedRuns !== expectedRuns) {
    throw new Error(
      `This live audit requires --approved-runs=${expectedRuns}; received ${String(approvedRuns)}.`,
    );
  }
  if (!new Set(["before", "after", "current"]).has(phase)) {
    throw new Error("--phase must be before, after, or current.");
  }
  return phase;
}

async function persistReport(report) {
  const requestedPath = argumentValue("report-file");
  if (!requestedPath) return;

  const reportPath = path.resolve(requestedPath);
  const normalizedPath = reportPath.replaceAll("\\", "/").toLowerCase();
  if (
    path.basename(reportPath).toLowerCase() === ".env.local" ||
    normalizedPath.includes("/tests/fixtures/review-radar-live/")
  ) {
    throw new Error("The report path cannot target a protected repository path.");
  }

  const temporaryPath = `${reportPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, reportPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function budgetLimit(request) {
  const values = String(request.budget || "")
    .replaceAll(",", "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values?.length ? Math.max(...values) : null;
}

function candidateMatchesLeader(name, leader) {
  return productSelectionTestExports.candidateMatchesTarget(
    { brand: leader.brand, name },
    {
      aliases: leader.aliases,
      brand: leader.brand,
      consensusOrder: 0,
      evidenceTier: "strong",
      model: leader.model,
      sourceUrls: leader.sourceUrls,
    },
  );
}

function matchingLeader(name, leaders) {
  return leaders.find((leader) => candidateMatchesLeader(name, leader)) || null;
}

function normalResponseBytes(body) {
  const result = asRecord(body).result;
  return Object.keys(result).length === 0
    ? 0
    : Buffer.byteLength(JSON.stringify({ result }));
}

function publicShapeIsValid(body) {
  const bodyRecord = asRecord(body);
  const result = asRecord(bodyRecord.result);
  if (
    Object.keys(bodyRecord).some((key) => key !== "result" && key !== "debug") ||
    Object.keys(result).some((key) => key !== "recommendations")
  ) {
    return false;
  }

  return asArray(result.recommendations).every((value) => {
    const product = asRecord(value);
    const keys = Object.keys(product).sort();
    return (
      keys.length === PUBLIC_PRODUCT_KEYS.length &&
      keys.every((key, index) => key === [...PUBLIC_PRODUCT_KEYS].sort()[index])
    );
  });
}

function uniqueProducts(result) {
  const seen = new Set();
  return asArray(asRecord(result).recommendations).flatMap((value) => {
    const product = asRecord(value);
    const name = typeof product.name === "string" ? product.name : "";
    const productPageUrl =
      typeof product.productPageUrl === "string" ? product.productPageUrl : "";
    const key = `${name.toLowerCase()}|${productPageUrl.toLowerCase()}`;
    if (!name || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        name,
        price: asRecord(product.price).amount ?? null,
        productPageUrl,
      },
    ];
  });
}

function appendBounded(existing, chunk) {
  const combined = `${existing}${chunk}`;
  return combined.length > 8_000 ? combined.slice(-8_000) : combined;
}

function waitForExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    waitForExit(child).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), SERVER_STOP_TIMEOUT_MS)),
  ]);
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}

async function waitUntilReady(baseUrl, child, serverOutput) {
  const deadline = performance.now() + SERVER_START_TIMEOUT_MS;
  while (performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Next.js exited before readiness. ${serverOutput()}`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.status > 0) return;
    } catch {
      // The fresh dev server is still compiling or binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js did not become ready in ${SERVER_START_TIMEOUT_MS} ms. ${serverOutput()}`);
}

function startServer(port) {
  let output = "";
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout.on("data", (chunk) => {
    output = appendBounded(output, chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    output = appendBounded(output, chunk.toString());
  });
  return { child, output: () => output };
}

function verifiedLeaderState(search, leaders, request) {
  const limit = budgetLimit(request);
  const matches = asArray(search.verifiedCandidates).filter((value) => {
    const candidate = asRecord(value);
    return matchingLeader(String(candidate.name || ""), leaders);
  });
  const eligible = matches.some((value) => {
    const candidate = asRecord(value);
    const price = Number(candidate.price);
    return (
      candidate.availabilityStatus === "available" &&
      (candidate.priceStatus === "verified" || candidate.priceStatus === "usable") &&
      Number.isFinite(price) &&
      price > 0 &&
      (limit === null || price <= limit) &&
      asArray(candidate.requirementFailures).length === 0
    );
  });
  const rankedMatches = asArray(search.rankedCandidates).filter((value) => {
    const candidate = asRecord(value);
    return matchingLeader(String(candidate.name || ""), leaders);
  });
  const rankedOnlyOverBudget =
    limit !== null &&
    rankedMatches.length > 0 &&
    rankedMatches.every((value) => {
      const price = Number(asRecord(value).price);
      return Number.isFinite(price) && price > limit;
    });
  const currentIneligible =
    !eligible &&
    (rankedOnlyOverBudget ||
      (matches.length > 0 &&
        matches.every((value) => {
          const candidate = asRecord(value);
          const price = Number(candidate.price);
          return (
            (candidate.availabilityStatus !== "available" &&
              candidate.availabilityStatus !== "unknown") ||
            (Number.isFinite(price) && limit !== null && price > limit)
          );
        })));
  return {
    currentIneligible,
    eligible,
    observed: matches.length > 0 || rankedMatches.length > 0,
  };
}

function acceptedCandidatesAreSafe(products, search, request) {
  const limit = budgetLimit(request);
  const verified = asArray(search.verifiedCandidates).map(asRecord);
  return products.every((product) => {
    const typeMatch = classifyProductTypeMatch({
      evidenceText: product.name,
      identityText: product.name,
      requestedCategory: request.query,
    });
    return (
      typeMatch.canBeExactMatch &&
      !productSelectionTestExports.isNonUsMarketUrl(product.productPageUrl) &&
      verified.some((candidate) => {
        const price = Number(candidate.price);
        return (
          candidate.name === product.name &&
          candidate.pageUrl === product.productPageUrl &&
          candidate.availabilityStatus === "available" &&
          (candidate.priceStatus === "verified" ||
            candidate.priceStatus === "usable") &&
          Number.isFinite(price) &&
          price > 0 &&
          (limit === null || price <= limit) &&
          asArray(candidate.requirementFailures).length === 0
        );
      })
    );
  });
}

function strongBeforeUnscored(returnedSignals) {
  const tiers = returnedSignals.map((value) => asRecord(value).evidenceTier || null);
  const lastStrong = tiers.lastIndexOf("strong");
  const firstUnscored = tiers.indexOf(null);
  return lastStrong < 0 || firstUnscored < 0 || lastStrong < firstUnscored;
}

function evidenceBindingsAreExact(returnedSignals, marketTargets) {
  const targetsByIdentity = new Map(
    marketTargets.map((value) => {
      const target = asRecord(value);
      return [
        `${String(target.brand || "").toLowerCase()}|${String(target.model || "").toLowerCase()}`,
        target,
      ];
    }),
  );
  return returnedSignals.every((value) => {
    const signal = asRecord(value);
    const targetBrand = String(signal.targetBrand || "");
    const targetModel = String(signal.targetModel || "");
    if (!targetBrand || !targetModel) return !signal.evidenceTier;
    const target = targetsByIdentity.get(
      `${targetBrand.toLowerCase()}|${targetModel.toLowerCase()}`,
    );
    if (!target || !signal.evidenceTier) return false;
    return productSelectionTestExports.candidateMatchesTarget(
      {
        brand: String(target.brand || ""),
        evidenceSources: asArray(signal.identityEvidenceSources).map((value) => {
          const source = asRecord(value);
          return {
            snippet: String(source.snippet || ""),
            snippetProvenance:
              source.snippetProvenance === "query-derived"
                ? "query-derived"
                : "source-derived",
            title: String(source.title || ""),
            url: String(source.url || ""),
          };
        }),
        name: String(signal.name || ""),
        productUrl: String(signal.productPageUrl || ""),
      },
      {
        aliases: asArray(target.aliases).map(String),
        brand: String(target.brand || ""),
        consensusOrder: asFiniteNumber(target.consensusOrder),
        evidenceTier: target.tier === "strong" ? "strong" : "supported",
        model: targetModel,
        sourceUrls: [],
      },
    );
  });
}

function compactTelemetry(body, benchmarkCase) {
  const debug = asRecord(asRecord(body).debug);
  const scout = asRecord(debug.marketScout);
  const search = asRecord(debug.search);
  const products = uniqueProducts(asRecord(body).result);
  const returnedSignals = asArray(search.returnedCandidateSignals).map(asRecord);
  const marketTargets = asArray(search.marketTargets).map(asRecord);
  const topThreeLeaderIndex = products
    .slice(0, 3)
    .findIndex((product) => matchingLeader(product.name, benchmarkCase.leaders));
  const verifiedState = verifiedLeaderState(
    search,
    benchmarkCase.leaders,
    benchmarkCase.request,
  );
  return {
    acceptedCandidatesSafe: acceptedCandidatesAreSafe(
      products,
      search,
      benchmarkCase.request,
    ),
    evidenceBindingsExact: evidenceBindingsAreExact(returnedSignals, marketTargets),
    hostedSearchCalls: asFiniteNumber(scout.hostedSearchCalls),
    logicalSerperOperations: asFiniteNumber(search.logicalSearchCalls),
    marketTargets: marketTargets.map((target) => {
      return {
        aliases: asArray(target.aliases).map(String),
        brand: target.brand || "",
        model: target.model || "",
        sourceCount: asFiniteNumber(target.sourceCount),
        tier: target.tier || null,
      };
    }),
    openAiCalls: asFiniteNumber(scout.openAiCalls),
    physicalSerperAttempts: asFiniteNumber(search.physicalSearchAttempts),
    products,
    returnedSignals: returnedSignals.map((signal) => ({
      bayesianRating: signal.bayesianRating ?? null,
      evidenceTier: signal.evidenceTier || null,
      name: signal.name || "",
      productPageUrl: signal.productPageUrl || "",
      rating: signal.rating ?? null,
      ratingCount: signal.ratingCount ?? null,
      targetBrand: signal.targetBrand || null,
      targetModel: signal.targetModel || null,
    })),
    rejectionCounts: {
      assetSafety: asFiniteNumber(search.rejectedByAssetSafety),
      availability: asFiniteNumber(search.rejectedByAvailability),
      condition: asFiniteNumber(search.rejectedByCondition),
      merchant: asFiniteNumber(search.rejectedByMerchant),
      price: asFiniteNumber(search.rejectedByPrice),
      requirements: asFiniteNumber(search.rejectedByRequirements),
    },
    verifiedCandidates: asArray(search.verifiedCandidates).map((value) => {
      const candidate = asRecord(value);
      return {
        availabilityStatus: candidate.availabilityStatus || "unknown",
        name: candidate.name || "",
        pageUrl: candidate.pageUrl || "",
        price: candidate.price ?? null,
        priceStatus: candidate.priceStatus || "missing",
        requirementFailures: asArray(candidate.requirementFailures).map(String),
      };
    }),
    scoutFallbackReason: scout.fallbackReason || null,
    scoutInputTokens: asFiniteNumber(scout.inputTokens),
    scoutOutputTokens: asFiniteNumber(scout.outputTokens),
    scoutUsedFallback: Boolean(scout.usedFallback),
    evidencedTargetReturned: returnedSignals.some(
      (signal) => signal.evidenceTier === "strong" || signal.evidenceTier === "supported",
    ),
    strongTargetReturned: returnedSignals.some(
      (signal) => signal.evidenceTier === "strong",
    ),
    strongBeforeUnscored: strongBeforeUnscored(returnedSignals),
    topThreeLeader: topThreeLeaderIndex >= 0,
    topThreeLeaderPosition: topThreeLeaderIndex < 0 ? null : topThreeLeaderIndex + 1,
    verifiedLeaderCurrentIneligible: verifiedState.currentIneligible,
    verifiedLeaderEligible: verifiedState.eligible,
    verifiedLeaderObserved: verifiedState.observed,
  };
}

async function runCase(benchmarkCase, round, baseUrl) {
  try {
    const startedAt = performance.now();
    let response;
    let text = "";
    try {
      response = await fetch(`${baseUrl}/api/recommendations`, {
        body: JSON.stringify(benchmarkCase.request),
        headers: {
          "Content-Type": "application/json",
          "x-reviewradar-debug": "true",
        },
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      text = await response.text();
    } catch (error) {
      return {
        caseId: benchmarkCase.id,
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
        round,
        status: 0,
      };
    }

    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
    const debug = asRecord(asRecord(body).debug);
    return {
      caseId: benchmarkCase.id,
      debugResponseBytes: Buffer.byteLength(text),
      durationMs: Math.round(performance.now() - startedAt),
      error: typeof asRecord(body).error === "string" ? asRecord(body).error : null,
      normalResponseBytes: normalResponseBytes(body),
      publicShapeValid: publicShapeIsValid(body),
      round,
      serverDurationMs: asFiniteNumber(asRecord(debug.timing).totalMs),
      status: response.status,
      ...compactTelemetry(body, benchmarkCase),
    };
  } catch (error) {
    return {
      caseId: benchmarkCase.id,
      durationMs: 0,
      error: error instanceof Error ? error.message : String(error),
      round,
      status: 0,
    };
  }
}

function nearestRankPercentile(values, percentile) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((first, second) => first - second);
  return ordered[Math.max(0, Math.ceil(percentile * ordered.length) - 1)];
}

function summarize(results, cases, acceptanceConfig) {
  const expectedRuns = results.length;
  const successful = results.filter((result) => result.status === 200 && !result.error);
  const nonEmpty = successful.filter((result) => asArray(result.products).length > 0);
  const benchmarkEligible = successful.filter(
    (result) => !result.verifiedLeaderCurrentIneligible,
  );
  const leaderHits = benchmarkEligible.filter((result) => result.topThreeLeader);
  const durations = results.map((result) => result.durationMs).filter((value) => value > 0);
  const normalBytes = successful.map((result) => result.normalResponseBytes);
  const byCase = Object.fromEntries(
    cases.map((benchmarkCase) => {
      const caseRuns = results.filter((result) => result.caseId === benchmarkCase.id);
      return [
        benchmarkCase.id,
        {
          leaderTopThree: caseRuns.filter((result) => result.topThreeLeader).length,
          nonEmpty: caseRuns.filter((result) => asArray(result.products).length > 0).length,
          runs: caseRuns.length,
        },
      ];
    }),
  );
  const totalInputTokens = successful.reduce(
    (total, result) => total + result.scoutInputTokens,
    0,
  );
  const totalOutputTokens = successful.reduce(
    (total, result) => total + result.scoutOutputTokens,
    0,
  );
  const estimatedModelCostUsd =
    (totalInputTokens * 0.75) / 1_000_000 +
    (totalOutputTokens * 4.5) / 1_000_000;
  const minimumLeaderRate = asFiniteNumber(acceptanceConfig.minimumLeaderTopThreeRate);
  const minimumNonEmpty = asFiniteNumber(acceptanceConfig.minimumNonEmpty);
  const maximumLatencyMs = asFiniteNumber(acceptanceConfig.maximumLatencyMs);
  const maximumP95LatencyMs = asFiniteNumber(
    acceptanceConfig.maximumP95LatencyMs,
  );
  const requiredCaseNonEmpty = asRecord(acceptanceConfig.requiredCaseNonEmpty);
  const maximumObservedLatencyMs = Math.max(0, ...durations);
  const p95LatencyMs = nearestRankPercentile(durations, 0.95);

  return {
    acceptance: {
      acceptedCandidatesSafe: successful.every((result) => result.acceptedCandidatesSafe),
      evidenceBindingsExact: successful.every((result) => result.evidenceBindingsExact),
      freshResearchAttemptedEachRequest: successful.every(
        (result) => result.openAiCalls === 1 && result.physicalSerperAttempts > 0,
      ),
      leaderTopThreeAtLeastConfiguredRate:
        benchmarkEligible.length > 0 &&
        leaderHits.length / benchmarkEligible.length >= minimumLeaderRate,
      latencyMaximumAtMostConfigured:
        maximumLatencyMs > 0 && maximumObservedLatencyMs <= maximumLatencyMs,
      latencyP95AtMostConfigured:
        maximumP95LatencyMs > 0 && p95LatencyMs <= maximumP95LatencyMs,
      nonEmptyAtLeastConfiguredMinimum: nonEmpty.length >= minimumNonEmpty,
      oneOpenAiResponseEach: successful.every((result) => result.openAiCalls === 1),
      publicShapeUnchanged: successful.every((result) => result.publicShapeValid),
      requiredCaseRecall: Object.entries(requiredCaseNonEmpty).every(
        ([caseId, minimum]) =>
          asFiniteNumber(asRecord(byCase[caseId]).nonEmpty) >= asFiniteNumber(minimum),
      ),
      serperAtMost15: successful.every((result) => result.logicalSerperOperations <= 15),
      strongAheadOfUnscored: successful.every((result) => result.strongBeforeUnscored),
      webSearchAtMost3: successful.every((result) => result.hostedSearchCalls <= 3),
      zeroRequestFailures: successful.length === expectedRuns,
    },
    byCase,
    calls: {
      hostedSearchCalls: successful.reduce(
        (total, result) => total + result.hostedSearchCalls,
        0,
      ),
      logicalSerperOperations: successful.reduce(
        (total, result) => total + result.logicalSerperOperations,
        0,
      ),
      maximumHostedSearchCalls: Math.max(
        0,
        ...successful.map((result) => result.hostedSearchCalls),
      ),
      maximumLogicalSerperOperations: Math.max(
        0,
        ...successful.map((result) => result.logicalSerperOperations),
      ),
      openAiResponses: successful.reduce((total, result) => total + result.openAiCalls, 0),
      physicalSerperAttempts: successful.reduce(
        (total, result) => total + result.physicalSerperAttempts,
        0,
      ),
    },
    latencyMs: {
      maximum: maximumObservedLatencyMs,
      mean: durations.length
        ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
        : 0,
      minimum: durations.length ? Math.min(...durations) : 0,
      p95NearestRank: p95LatencyMs,
    },
    leaderRecall: {
      benchmarkEligibleRuns: benchmarkEligible.length,
      currentIneligibleRuns: successful.length - benchmarkEligible.length,
      topThreeHits: leaderHits.length,
      topThreeRate: benchmarkEligible.length
        ? Number((leaderHits.length / benchmarkEligible.length).toFixed(4))
        : 0,
      verifiedEligibleHits: successful.filter(
        (result) => result.verifiedLeaderEligible && result.topThreeLeader,
      ).length,
      verifiedEligibleRuns: successful.filter((result) => result.verifiedLeaderEligible).length,
      verifiedLeaderObservedRuns: successful.filter(
        (result) => result.verifiedLeaderObserved,
      ).length,
    },
    nonEmpty: {
      count: nonEmpty.length,
      rate: expectedRuns ? Number((nonEmpty.length / expectedRuns).toFixed(4)) : 0,
    },
    payloadBytes: {
      maximum: Math.max(0, ...normalBytes),
      mean: normalBytes.length
        ? Math.round(normalBytes.reduce((total, value) => total + value, 0) / normalBytes.length)
        : 0,
    },
    scout: {
      fallbackRuns: successful.filter((result) => result.scoutUsedFallback).length,
      fallbackReasons: successful.reduce((counts, result) => {
        const reason = result.scoutFallbackReason;
        if (reason) counts[reason] = (counts[reason] || 0) + 1;
        return counts;
      }, {}),
      modelTokens: {
        estimatedCostUsdAtPublishedModelRatesOnly: Number(estimatedModelCostUsd.toFixed(6)),
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      returnedEvidenceRuns: successful.filter(
        (result) => result.evidencedTargetReturned,
      ).length,
      returnedStrongRuns: successful.filter((result) => result.strongTargetReturned)
        .length,
      strongTargetPlanRuns: successful.filter((result) =>
        asArray(result.marketTargets).some((target) => asRecord(target).tier === "strong"),
      ).length,
    },
    successfulRuns: successful.length,
  };
}

const benchmark = JSON.parse(await readFile(benchmarkUrl(), "utf8"));
const cases = asArray(benchmark.cases);
const rounds = Math.floor(asFiniteNumber(benchmark.rounds));
if (cases.length === 0 || rounds < 1) {
  throw new Error("The selected benchmark must define at least one case and one round.");
}
const expectedRuns = cases.length * rounds;
const phase = requireApprovedRun(expectedRuns);

const portBase = 43_000 + (process.pid % 1_000);
const server = startServer(portBase);
const baseUrl = `http://127.0.0.1:${portBase}`;
const results = [];
const startedAt = new Date().toISOString();
try {
  await waitUntilReady(baseUrl, server.child, server.output);
  await fetch(`${baseUrl}/api/recommendations`, {
    method: "GET",
    signal: AbortSignal.timeout(SERVER_START_TIMEOUT_MS),
  }).then((response) => response.text());

  for (let round = 1; round <= rounds; round += 1) {
    for (const benchmarkCase of cases) {
      const runNumber = results.length + 1;
      process.stderr.write(
        `[live-accuracy ${phase}] ${runNumber}/${expectedRuns} round=${round} case=${benchmarkCase.id}\n`,
      );
      results.push(await runCase(benchmarkCase, round, baseUrl));
    }
  }
} finally {
  await stopServer(server.child);
}

const report = {
  benchmark: benchmark.version,
  completedAt: new Date().toISOString(),
  phase,
  schemaVersion: 2,
  startedAt,
  summary: summarize(results, cases, asRecord(benchmark.acceptance)),
  runs: results,
};

const outputReport =
  argumentValue("summary-only") === "true"
    ? {
        ...report,
        runs: results.map((result) => ({
          caseId: result.caseId,
          durationMs: result.durationMs,
          evidenceBindingsExact: Boolean(result.evidenceBindingsExact),
          error: result.error || null,
          evidencedTargetReturned: Boolean(result.evidencedTargetReturned),
          hostedSearchCalls: result.hostedSearchCalls ?? null,
          logicalSerperOperations: result.logicalSerperOperations ?? null,
          marketTargets: result.marketTargets || [],
          normalResponseBytes: result.normalResponseBytes ?? null,
          openAiCalls: result.openAiCalls ?? null,
          products: asArray(result.products).map((product) => asRecord(product).name || ""),
          round: result.round,
          scoutFallbackReason: result.scoutFallbackReason || null,
          status: result.status,
          strongTargetReturned: Boolean(result.strongTargetReturned),
          topThreeLeader: Boolean(result.topThreeLeader),
        })),
      }
    : report;

await persistReport(outputReport);
process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
if (Object.values(report.summary.acceptance).some((passed) => !passed)) {
  process.exitCode = 1;
}

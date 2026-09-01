import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { detectRequirementConflicts } from "../lib/requirementConflicts.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { lookupMarketEvidence } from "../lib/marketEvidenceIndex.ts";
import { productSelectionTestExports } from "../lib/productSelection.ts";
import { validateRecommendationRequest } from "../lib/recommendationRequestValidation.ts";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");
const benchmarkUrl = new URL(
  "../tests/benchmarks/pr13-market-leaders-v2026-09a.json",
  import.meta.url,
);
const EXPECTED_RUNS = 24;
const EXPECTED_INDEX_REFRESHES = 8;
const REQUEST_TIMEOUT_MS = 30_000;
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

function requireApprovedRun() {
  const approvedRuns = Number(argumentValue("approved-runs"));
  const approvedRefreshes = Number(argumentValue("approved-refreshes"));
  const phase = argumentValue("phase");
  if (approvedRuns !== EXPECTED_RUNS) {
    throw new Error(
      `This live matrix requires --approved-runs=${EXPECTED_RUNS}; received ${String(approvedRuns)}.`,
    );
  }
  if (phase !== "before" && phase !== "after") {
    throw new Error("This live matrix requires --phase=before or --phase=after.");
  }
  if (approvedRefreshes !== EXPECTED_INDEX_REFRESHES) {
    throw new Error(
      `This indexed matrix requires --approved-refreshes=${EXPECTED_INDEX_REFRESHES}; received ${String(approvedRefreshes)}.`,
    );
  }
  return phase;
}

function preparedRequest(value) {
  const validation = validateRecommendationRequest(value);
  if ("error" in validation) throw new Error(validation.error);
  const input = {
    ...validation.data,
    extractedRequirements: extractStructuredRequirements(validation.data),
  };
  const conflicts = detectRequirementConflicts(input);
  if (conflicts.length > 0) {
    throw new Error(`Conflicting benchmark requirements: ${conflicts.join(" ")}`);
  }
  return input;
}

async function waitForIndexedEvidence(input, indexPath, refreshStartedAtMs) {
  const deadline = performance.now() + 135_000;
  while (performance.now() < deadline) {
    const lookup = await lookupMarketEvidence({ indexPath, input });
    if (
      lookup.telemetry.lastRefreshAttempt &&
      lookup.telemetry.lastRefreshAttempt.completedAtMs >= refreshStartedAtMs
    ) {
      return lookup;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

async function refreshBenchmarkIndex(benchmarkCases, indexPath, portBase) {
  const refreshes = [];
  for (const [index, benchmarkCase] of benchmarkCases.entries()) {
    process.stderr.write(`[market index] refreshing case=${benchmarkCase.id}\n`);
    const input = preparedRequest(benchmarkCase.request);
    const server = startServer(portBase + index, indexPath);
    const baseUrl = `http://127.0.0.1:${portBase + index}`;
    const startedAt = performance.now();
    const refreshStartedAtMs = Date.now();
    try {
      await waitUntilReady(baseUrl, server.child, server.output);
      const response = await fetch(`${baseUrl}/api/recommendations`, {
        body: JSON.stringify(benchmarkCase.request),
        headers: {
          "Content-Type": "application/json",
          "x-reviewradar-debug": "true",
        },
        method: "POST",
        signal: AbortSignal.timeout(30_000),
      });
      const body = asRecord(await response.json().catch(() => ({})));
      const lookup = response.status === 200
        ? await waitForIndexedEvidence(input, indexPath, refreshStartedAtMs)
        : null;
      const attempt = lookup?.telemetry.lastRefreshAttempt;
      const research = attempt?.research;
      const updated = attempt?.status === "updated" && lookup?.telemetry.indexStatus === "fresh";
      refreshes.push({
        acceptedSourceUrls: research?.acceptedSourceUrls || 0,
        durationMs: Math.round(performance.now() - startedAt),
        evidenceTiers: research?.evidenceTiers || { none: 0, strong: 0, supported: 0 },
        error:
          response.status === 200 && updated
            ? null
            : attempt?.fallbackReason
              ? `Market research failed: ${attempt.fallbackReason}.`
            : typeof body.error === "string"
              ? body.error
              : `Index refresh did not complete after HTTP ${response.status}.`,
        hostedSearchCalls: research?.hostedSearchCalls || 0,
        id: benchmarkCase.id,
        inputTokens: research?.inputTokens || 0,
        openAiCalls: research?.openAiCalls || 0,
        outputTokens: research?.outputTokens || 0,
        sourceUrls: updated
          ? [...new Set(lookup.plan.targets.flatMap((target) => target.sourceUrls))]
          : [],
        status: updated ? "updated" : "failed",
        targetCount: updated ? lookup.plan.targets.length : 0,
        targets: updated
          ? lookup.plan.targets.map((target) => ({
              brand: target.brand,
              model: target.model,
              sourceUrls: target.sourceUrls,
              tier: target.evidenceTier,
            }))
          : [],
        totalTokens: research?.totalTokens || 0,
        warmLogicalSerperOperations: asFiniteNumber(
          asRecord(asRecord(body.debug).search).logicalSearchCalls,
        ),
      });
    } catch (error) {
      refreshes.push({
        acceptedSourceUrls: 0,
        durationMs: Math.round(performance.now() - startedAt),
        evidenceTiers: { none: 0, strong: 0, supported: 0 },
        error: error instanceof Error ? error.message : String(error),
        hostedSearchCalls: 0,
        id: benchmarkCase.id,
        inputTokens: 0,
        openAiCalls: 0,
        outputTokens: 0,
        status: "failed",
        sourceUrls: [],
        targetCount: 0,
        targets: [],
        totalTokens: 0,
        warmLogicalSerperOperations: 0,
      });
    } finally {
      await stopServer(server.child);
    }
  }
  return refreshes;
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

function startServer(port, indexPath) {
  let output = "";
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        REVIEWRADAR_MARKET_INDEX_PATH: indexPath,
      },
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
  const currentIneligible =
    matches.length > 0 &&
    matches.every((value) => {
      const candidate = asRecord(value);
      const price = Number(candidate.price);
      return (
        (candidate.availabilityStatus !== "available" &&
          candidate.availabilityStatus !== "unknown") ||
        (Number.isFinite(price) && limit !== null && price > limit)
      );
    });
  return { currentIneligible, eligible, observed: matches.length > 0 };
}

function acceptedCandidatesAreSafe(products, search, request) {
  const limit = budgetLimit(request);
  const verified = asArray(search.verifiedCandidates).map(asRecord);
  return products.every((product) =>
    verified.some((candidate) => {
      const price = Number(candidate.price);
      return (
        candidate.name === product.name &&
        candidate.pageUrl === product.productPageUrl &&
        candidate.availabilityStatus === "available" &&
        (candidate.priceStatus === "verified" || candidate.priceStatus === "usable") &&
        Number.isFinite(price) &&
        price > 0 &&
        (limit === null || price <= limit) &&
        asArray(candidate.requirementFailures).length === 0
      );
    }),
  );
}

function strongBeforeUnscored(returnedSignals) {
  const tiers = returnedSignals.map((value) => asRecord(value).evidenceTier || null);
  const lastStrong = tiers.lastIndexOf("strong");
  const firstUnscored = tiers.indexOf(null);
  return lastStrong < 0 || firstUnscored < 0 || lastStrong < firstUnscored;
}

function compactTelemetry(body, benchmarkCase) {
  const debug = asRecord(asRecord(body).debug);
  const scout = asRecord(debug.marketScout);
  const search = asRecord(debug.search);
  const products = uniqueProducts(asRecord(body).result);
  const returnedSignals = asArray(search.returnedCandidateSignals).map(asRecord);
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
    hostedSearchCalls: asFiniteNumber(scout.hostedSearchCalls),
    indexAgeMs:
      typeof scout.indexAgeMs === "number" ? asFiniteNumber(scout.indexAgeMs) : null,
    indexStatus: scout.indexStatus || null,
    logicalSerperOperations: asFiniteNumber(search.logicalSearchCalls),
    marketTargets: asArray(search.marketTargets).map((value) => {
      const target = asRecord(value);
      return {
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
      rating: signal.rating ?? null,
      ratingCount: signal.ratingCount ?? null,
      targetModel: signal.targetModel || null,
    })),
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

async function runCase(benchmarkCase, round, port, indexPath) {
  const server = startServer(port, indexPath);
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitUntilReady(baseUrl, server.child, server.output);
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
  } finally {
    await stopServer(server.child);
  }
}

function nearestRankPercentile(values, percentile) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((first, second) => first - second);
  return ordered[Math.max(0, Math.ceil(percentile * ordered.length) - 1)];
}

function summarize(results, cases, indexRefreshes) {
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
  const totalInputTokens = indexRefreshes.reduce(
    (total, result) => total + result.inputTokens,
    0,
  );
  const totalOutputTokens = indexRefreshes.reduce(
    (total, result) => total + result.outputTokens,
    0,
  );
  const estimatedModelCostUsd =
    (totalInputTokens * 0.75) / 1_000_000 +
    (totalOutputTokens * 4.5) / 1_000_000;

  return {
    acceptance: {
      acceptedCandidatesSafe: successful.every((result) => result.acceptedCandidatesSafe),
      cacheColdMaximumAtMost30Seconds: Math.max(0, ...durations) <= 30_000,
      cacheColdP95AtMost25Seconds:
        nearestRankPercentile(durations, 0.95) <= 25_000,
      leaderTopThreeAtLeast80Percent:
        benchmarkEligible.length > 0 && leaderHits.length / benchmarkEligible.length >= 0.8,
      nonEmptyAtLeast21Of24: nonEmpty.length >= 21,
      freshIndexForEveryRequest: successful.every(
        (result) => result.indexStatus === "fresh",
      ),
      indexRefreshAtMostThreeHostedSearches: indexRefreshes.every(
        (result) => result.hostedSearchCalls <= 3,
      ),
      indexRefreshesSucceeded: indexRefreshes.every(
        (result) => result.status === "updated",
      ),
      publicShapeUnchanged: successful.every((result) => result.publicShapeValid),
      serperAtMost15: successful.every((result) => result.logicalSerperOperations <= 15),
      shopVacAtLeast2Of3: byCase["shop-vacuum"].nonEmpty >= 2,
      strongAheadOfUnscored: successful.every((result) => result.strongBeforeUnscored),
      zeroOpenAiResponsesInRequest: successful.every(
        (result) => result.openAiCalls === 0,
      ),
      zeroWebSearchInRequest: successful.every(
        (result) => result.hostedSearchCalls === 0,
      ),
      zeroRequestFailures: successful.length === EXPECTED_RUNS,
    },
    byCase,
    calls: {
      backgroundHostedSearchCalls: indexRefreshes.reduce(
        (total, result) => total + result.hostedSearchCalls,
        0,
      ),
      backgroundOpenAiResponses: indexRefreshes.reduce(
        (total, result) => total + result.openAiCalls,
        0,
      ),
      requestHostedSearchCalls: successful.reduce(
        (total, result) => total + result.hostedSearchCalls,
        0,
      ),
      logicalSerperOperations: successful.reduce(
        (total, result) => total + result.logicalSerperOperations,
        0,
      ),
      maximumBackgroundHostedSearchCalls: Math.max(
        0,
        ...indexRefreshes.map((result) => result.hostedSearchCalls),
      ),
      maximumRequestHostedSearchCalls: Math.max(
        0,
        ...successful.map((result) => result.hostedSearchCalls),
      ),
      maximumLogicalSerperOperations: Math.max(
        0,
        ...successful.map((result) => result.logicalSerperOperations),
      ),
      requestOpenAiResponses: successful.reduce(
        (total, result) => total + result.openAiCalls,
        0,
      ),
      physicalSerperAttempts: successful.reduce(
        (total, result) => total + result.physicalSerperAttempts,
        0,
      ),
    },
    latencyMs: {
      maximum: Math.max(0, ...durations),
      mean: durations.length
        ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
        : 0,
      minimum: durations.length ? Math.min(...durations) : 0,
      p95NearestRank: nearestRankPercentile(durations, 0.95),
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
      rate: Number((nonEmpty.length / EXPECTED_RUNS).toFixed(4)),
    },
    payloadBytes: {
      maximum: Math.max(0, ...normalBytes),
      mean: normalBytes.length
        ? Math.round(normalBytes.reduce((total, value) => total + value, 0) / normalBytes.length)
        : 0,
    },
    marketEvidence: {
      indexFallbackRuns: successful.filter((result) => result.scoutUsedFallback).length,
      indexFallbackReasons: successful.reduce((counts, result) => {
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
      refreshes: indexRefreshes,
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

const phase = requireApprovedRun();
const benchmark = JSON.parse(await readFile(benchmarkUrl, "utf8"));
if (asArray(benchmark.cases).length * 3 !== EXPECTED_RUNS) {
  throw new Error(`Expected eight benchmark cases and three rounds; found ${asArray(benchmark.cases).length}.`);
}

const portBase = 43_000 + (process.pid % 1_000);
const results = [];
const startedAt = new Date().toISOString();
const indexPath = path.join(
  tmpdir(),
  `reviewradar-market-index-${process.pid}-${randomUUID()}.json`,
);
let indexRefreshes = [];
try {
  indexRefreshes = await refreshBenchmarkIndex(
    benchmark.cases,
    indexPath,
    portBase - 100,
  );
  for (let round = 1; round <= 3; round += 1) {
    for (const benchmarkCase of benchmark.cases) {
      const runNumber = results.length + 1;
      process.stderr.write(
        `[indexed quality ${phase}] ${runNumber}/${EXPECTED_RUNS} round=${round} case=${benchmarkCase.id}\n`,
      );
      results.push(
        await runCase(benchmarkCase, round, portBase + runNumber, indexPath),
      );
    }
  }
} finally {
  await unlink(indexPath).catch(() => {});
}

const report = {
  architecture: "market_quality_v2_indexed",
  benchmark: benchmark.version,
  completedAt: new Date().toISOString(),
  phase,
  schemaVersion: 2,
  startedAt,
  summary: summarize(results, benchmark.cases, indexRefreshes),
  runs: results,
};

const outputReport =
  argumentValue("summary-only") === "true"
    ? {
        ...report,
        runs: results.map((result) => ({
          caseId: result.caseId,
          durationMs: result.durationMs,
          error: result.error || null,
          evidencedTargetReturned: Boolean(result.evidencedTargetReturned),
          hostedSearchCalls: result.hostedSearchCalls ?? null,
          indexAgeMs: result.indexAgeMs ?? null,
          indexStatus: result.indexStatus || null,
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

process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
if (Object.values(report.summary.acceptance).some((passed) => !passed)) {
  process.exitCode = 1;
}

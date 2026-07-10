// Deterministic, zero-provider benchmark for the debug-only search ledger.
// It measures a representative plan assembly with and without ledger capture.

import { performance } from "node:perf_hooks";

import {
  augmentSearchPlanWithDiscoveryStrategy,
} from "../lib/discoveryStrategy.ts";
import {
  buildSearchObservabilitySnapshot,
  createSearchObservabilityLedger,
  runWithSearchObservabilityLedger,
  searchPlanObservabilityObserver,
} from "../lib/searchObservabilityLedger.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";

const input = {
  query: "robot vacuum",
  budget: "under $300",
  priorities: "self-emptying dock included; good pet-hair pickup",
  avoid: "dock sold separately; mop-only products",
  selectedFeatures: [
    { name: "Self-emptying", description: "Dock empties the dust bin" },
    { name: "Smart mapping", description: "Room maps and no-go zones" },
  ],
};

const strategy = {
  avoidCandidatePatterns: ["accessory only", "dock sold separately"],
  buyingRubric: {
    category: "robot vacuum",
    commonTradeoffs: ["navigation versus price"],
    mustVerifyFacts: ["self-empty dock included", "current price"],
    qualitySignals: ["reliable dock emptying", "pet-hair pickup"],
    redFlags: ["dock sold separately", "replacement part"],
    reviewSignals: ["owner reports of dock clogs"],
    searchQueries: [
      "best self emptying robot vacuum under $300",
      "robot vacuum self empty dock pet hair reviews",
    ],
  },
  discoveryQueries: [
    "self emptying robot vacuum under $300",
    "robot vacuum self empty dock included price",
    "budget robot vacuum automatic dirt disposal",
    "robot vacuum pet hair self emptying reviews",
  ],
  expectedProducts: [
    {
      aliases: ["RV1+"],
      brand: "Example",
      priority: "high",
      productLine: "RV1 Plus",
      whyExpected: "Representative mainstream budget model",
    },
    {
      aliases: ["CleanBot S2 Auto"],
      brand: "ExampleTwo",
      priority: "medium",
      productLine: "S2 Auto-Empty",
      whyExpected: "Representative alternate product line",
    },
  ],
  searchIntent: "Budget robot vacuum with a self-emptying dock included",
  verificationFacts: ["price", "dock included", "pet-hair performance"],
};

function exercise(enabled, iteration) {
  const state = enabled
    ? createSearchObservabilityLedger({
        requestId: `benchmark-${iteration}`,
        commitHash: "benchmark",
        flags: {},
        helperModel: "benchmark-helper",
        finalModel: "benchmark-final",
        serperCacheEmptyAtStart: true,
      })
    : null;

  return runWithSearchObservabilityLedger(state, () => {
    const plan = augmentSearchPlanWithDiscoveryStrategy(
      generateSearchPlan(
        input,
        enabled ? searchPlanObservabilityObserver : undefined,
      ),
      strategy,
      input,
      enabled ? searchPlanObservabilityObserver : undefined,
    );
    const snapshot = buildSearchObservabilitySnapshot();
    return JSON.stringify({ plan, snapshot }).length;
  });
}

function measureOne(enabled, iteration) {
  const start = performance.now();
  const checksum = exercise(enabled, iteration);
  return { checksum, elapsedMs: performance.now() - start };
}

function trimmedMean(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const trim = Math.floor(ordered.length * 0.1);
  const kept = ordered.slice(trim, ordered.length - trim);
  return kept.reduce((total, value) => total + value, 0) / kept.length;
}

function measurePairs(iterations) {
  const disabledSamples = [];
  const enabledSamples = [];
  let disabledChecksum = 0;
  let enabledChecksum = 0;

  for (let index = 0; index < iterations; index += 1) {
    const order = index % 2 === 0 ? [false, true] : [true, false];
    for (const enabled of order) {
      const sample = measureOne(enabled, index);
      if (enabled) {
        enabledSamples.push(sample.elapsedMs);
        enabledChecksum += sample.checksum;
      } else {
        disabledSamples.push(sample.elapsedMs);
        disabledChecksum += sample.checksum;
      }
    }
  }

  return {
    disabledChecksum,
    disabledMsPerRequest: trimmedMean(disabledSamples),
    enabledChecksum,
    enabledMsPerRequest: trimmedMean(enabledSamples),
  };
}

const warmupIterations = 20;
const measuredIterations = Number(process.env.LEDGER_BENCHMARK_ITERATIONS || 100);
measurePairs(warmupIterations);

const measurement = measurePairs(measuredIterations);
const disabledMsPerRequest = measurement.disabledMsPerRequest;
const enabledMsPerRequest = measurement.enabledMsPerRequest;
const measuredOverheadMsPerRequest = Math.max(
  0,
  enabledMsPerRequest - disabledMsPerRequest,
);
const typicalRequestDurationMs = Number(
  process.env.LEDGER_TYPICAL_REQUEST_MS || 84_000,
);
const projectedTypicalRequestOverheadPercent =
  (measuredOverheadMsPerRequest / typicalRequestDurationMs) * 100;
const withinBudget =
  measuredOverheadMsPerRequest < 200 ||
  projectedTypicalRequestOverheadPercent < 2;

const report = {
  providerCalls: 0,
  measuredIterations,
  disabledMsPerRequest: Number(disabledMsPerRequest.toFixed(3)),
  enabledMsPerRequest: Number(enabledMsPerRequest.toFixed(3)),
  measuredOverheadMsPerRequest: Number(measuredOverheadMsPerRequest.toFixed(3)),
  typicalRequestDurationMs,
  projectedTypicalRequestOverheadPercent: Number(
    projectedTypicalRequestOverheadPercent.toFixed(4),
  ),
  threshold: "under 200 ms per request OR under 2% of a typical request",
  withinBudget,
  checksumChangedBecauseLedgerWasSerialized:
    measurement.disabledChecksum !== measurement.enabledChecksum,
};

console.log(JSON.stringify(report, null, 2));

if (!withinBudget) {
  process.exitCode = 1;
}

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  GOLD,
  coversLeader,
  coversLeaderProspective07c,
} from "./goldBenchmark.mjs";

const leaderLabel = (leader) =>
  [leader.brand, ...(leader.lines || [])].filter(Boolean).join(" / ");
const increment = (map, key, amount = 1) =>
  map.set(key, (map.get(key) || 0) + amount);
const frequencyRows = (map) =>
  [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((first, second) => second.count - first.count || first.reason.localeCompare(second.reason));

function benchmarkForRequest(request) {
  return GOLD.find((item) =>
    request.budget
      ? item.id === "con-robot-vac-300-selfempty"
      : item.id === "broad-shop-vac",
  );
}

function lossReasons(records) {
  const frequency = new Map();

  for (const record of records) {
    if (!record.firstLoss) continue;
    increment(
      frequency,
      `${record.firstLoss.stage}:${record.firstLoss.subreason}`,
    );
  }

  return frequencyRows(frequency);
}

function analyzeWithMatcher({
  benchmark,
  candidateRecords,
  finalProducts,
  matcher,
  productDiscoveryAttempts,
  productDiscoveryQueryIds,
}) {
  const rawNames = productDiscoveryAttempts.flatMap((attempt) =>
    attempt.results.map((result) => result.title),
  );
  const discoveryRecords = candidateRecords.filter((candidate) =>
    candidate.queryIds.some((queryId) => productDiscoveryQueryIds.has(queryId)),
  );
  const normalizedRecords = discoveryRecords.filter(
    (candidate) => candidate.source === "serper" && candidate.normalized,
  );
  const dedupedRecords = normalizedRecords.filter(
    (candidate) =>
      !candidate.mergedIntoCandidateId && candidate.firstLoss?.stage !== "raw_dedupe",
  );
  const prefilterRecords = dedupedRecords.filter(
    (candidate) => candidate.prefilterAccepted === true,
  );
  const postMergeRecords = prefilterRecords.filter(
    (candidate) => candidate.firstLoss?.stage !== "candidate_merge",
  );
  const finalNames = finalProducts.map((product) => product.name);

  const leaders = benchmark.coreLeaders.map((leader) => {
    const rawMatches = rawNames.filter((name) => matcher(name, leader));
    const rawRecordMatches = discoveryRecords.filter(
      (candidate) =>
        candidate.source === "raw_serper_result" && matcher(candidate.name, leader),
    );
    const normalizedMatches = normalizedRecords.filter((candidate) =>
      matcher(candidate.name, leader),
    );
    const dedupedMatches = dedupedRecords.filter((candidate) =>
      matcher(candidate.name, leader),
    );
    const prefilterMatches = prefilterRecords.filter((candidate) =>
      matcher(candidate.name, leader),
    );
    const postMergeMatches = postMergeRecords.filter((candidate) =>
      matcher(candidate.name, leader),
    );
    const displayedMatches = finalNames.filter((name) => matcher(name, leader));

    let terminalStage = "displayed";
    let terminalReasons = [];
    if (rawMatches.length === 0) {
      terminalStage = "absent_from_raw_digests";
    } else if (normalizedMatches.length === 0) {
      terminalStage = "lost_in_normalization";
      terminalReasons = lossReasons(rawRecordMatches);
    } else if (dedupedMatches.length === 0) {
      terminalStage = "lost_in_raw_dedupe";
      terminalReasons = lossReasons(normalizedMatches);
    } else if (prefilterMatches.length === 0) {
      terminalStage = "lost_in_cheap_prefilter";
      terminalReasons = lossReasons(dedupedMatches);
    } else if (postMergeMatches.length === 0) {
      terminalStage = "lost_in_ai_serper_merge";
      terminalReasons = lossReasons(prefilterMatches);
    } else if (displayedMatches.length === 0) {
      terminalStage = "lost_after_merge";
      terminalReasons = lossReasons(postMergeMatches);
    }

    return {
      leader: leaderLabel(leader),
      rawPresence: rawMatches.length > 0,
      rawAppearanceCount: rawMatches.length,
      normalizedPresence: normalizedMatches.length > 0,
      normalizedCandidateCount: normalizedMatches.length,
      rawDedupeSurvival: dedupedMatches.length > 0,
      prefilterSurvival: prefilterMatches.length > 0,
      preAiPoolPresence: prefilterMatches.length > 0,
      postMergePresence: postMergeMatches.length > 0,
      displayedPresence: displayedMatches.length > 0,
      displayedNames: displayedMatches,
      terminalStage,
      terminalReasons,
    };
  });

  const recordedResultLossFrequency = new Map();
  for (const candidate of discoveryRecords) {
    if (!candidate.firstLoss) continue;
    const matchingLeaderCount = benchmark.coreLeaders.filter((leader) =>
      matcher(candidate.name, leader),
    ).length;
    if (matchingLeaderCount === 0) continue;
    increment(
      recordedResultLossFrequency,
      `${candidate.firstLoss.stage}:${candidate.firstLoss.subreason}`,
      matchingLeaderCount,
    );
  }

  return {
    preAiPoolRecall: {
      covered: leaders.filter((leader) => leader.preAiPoolPresence).length,
      total: benchmark.coreLeaders.length,
    },
    finalRecall: {
      covered: leaders.filter((leader) => leader.displayedPresence).length,
      total: benchmark.coreLeaders.length,
    },
    leaders,
    recordedLeaderResultLossFrequency: frequencyRows(recordedResultLossFrequency),
  };
}

export function analyzeReadinessFixture(fixture, path = "<memory>") {
  const request = fixture._request || { query: fixture._query };
  const benchmark = benchmarkForRequest(request);
  const ledger = fixture.debug?.stageFunnel?.searchLedger;

  if (!ledger || !benchmark) {
    throw new Error(`${path}: missing ledger or benchmark`);
  }

  const productDiscoveryQueryIds = new Set(
    ledger.planAssembly
      .filter((query) => query.purpose === "product_discovery")
      .map((query) => query.id),
  );
  const productDiscoveryAttempts = ledger.dispatch.attempts.filter((attempt) =>
    productDiscoveryQueryIds.has(attempt.queryId),
  );
  const finalProducts = [
    ...(fixture.result?.exactMatches || []),
    ...(fixture.result?.nearMatches || []),
  ];
  const exactProducts = fixture.result?.exactMatches || [];
  const analysisInput = {
    benchmark,
    candidateRecords: ledger.candidateLineage.candidates,
    finalProducts,
    productDiscoveryAttempts,
    productDiscoveryQueryIds,
  };
  const current07b = analyzeWithMatcher({
    ...analysisInput,
    matcher: coversLeader,
  });
  const prospective07c = analyzeWithMatcher({
    ...analysisInput,
    matcher: coversLeaderProspective07c,
  });
  const finalNames = finalProducts.map((product) => product.name);
  const aiDisplayed = ledger.candidateLineage.candidates
    .filter(
      (candidate) =>
        candidate.source === "final_openai_research" &&
        candidate.selected &&
        finalNames.some(
          (name) =>
            name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ===
            candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
        ),
    )
    .map((candidate) => candidate.name);
  const malformedQueries = ledger.dispatch.attempts
    .map((attempt) => attempt.finalOutboundQuery)
    .filter((query) => /site:\*|\b([a-z0-9]+)\s+\1\b/i.test(query));
  const exactHardConstraintFailures = exactProducts
    .filter(
      (product) =>
        (product.requirementCheck?.failed || []).length > 0 ||
        (product.requirementCheck?.unknown || []).length > 0,
    )
    .map((product) => product.name);

  return {
    path,
    request,
    reconciliation: ledger.dispatch.reconciliation,
    cacheCold: ledger.header.serperCacheEmptyAtStart,
    seedSearchesRun: fixture.debug.seedSearchesRun,
    current07b,
    prospective07c,
    sensitivityDelta: {
      preAiPoolCovered:
        prospective07c.preAiPoolRecall.covered - current07b.preAiPoolRecall.covered,
      finalCovered:
        prospective07c.finalRecall.covered - current07b.finalRecall.covered,
    },
    aiDisplayed,
    exactHardConstraintFailures,
    malformedQueries,
    finalNames,
  };
}

export function aggregateReadinessAnalyses(analyses) {
  const broad = analyses.filter((analysis) => !analysis.request.budget);
  const frequency = new Map();
  const terminalFrequency = new Map();

  for (const analysis of analyses) {
    for (const row of analysis.current07b.recordedLeaderResultLossFrequency) {
      increment(frequency, row.reason, row.count);
    }
    for (const leader of analysis.current07b.leaders) {
      increment(terminalFrequency, leader.terminalStage);
    }
  }

  const mean = (values) =>
    values.length === 0
      ? 0
      : values.reduce((total, value) => total + value, 0) / values.length;

  return {
    contract: {
      preAiPool:
        "source=serper; product_discovery provenance; normalized; raw-dedupe survivor; cheap-prefilter accepted; candidate_merge still counts as pre-AI presence",
      caveat:
        "candidate_merge can be inflated by URL/name lineage mismatches; this can overstate pre-AI presence but cannot create a false miss",
    },
    broadCurrent07bMean: mean(
      broad.map((analysis) => analysis.current07b.preAiPoolRecall.covered),
    ),
    broadProspective07cMean: mean(
      broad.map((analysis) => analysis.prospective07c.preAiPoolRecall.covered),
    ),
    recordedLeaderResultLossFrequency: frequencyRows(frequency),
    leaderRunTerminalFrequency: frequencyRows(terminalFrequency),
  };
}

function runCli(paths) {
  if (paths.length === 0) {
    console.error("Usage: node scripts/analyze-readiness-fixtures.mjs <fixture>...");
    process.exitCode = 1;
    return;
  }

  const analyses = paths.map((path) =>
    analyzeReadinessFixture(JSON.parse(readFileSync(path, "utf8")), path),
  );
  console.log(JSON.stringify({
    aggregate: aggregateReadinessAnalyses(analyses),
    runs: analyses,
  }, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli(process.argv.slice(2));
}

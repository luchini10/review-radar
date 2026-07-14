import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  GOLD,
  coversLeader,
  coversLeaderProspective07c,
} from "./goldBenchmark.mjs";
import { areSameExactModelProduct } from "../lib/productIdentity.ts";
import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";

const leaderLabel = (leader) =>
  [leader.brand, ...(leader.lines || [])].filter(Boolean).join(" / ");
const increment = (map, key, amount = 1) =>
  map.set(key, (map.get(key) || 0) + amount);
const frequencyRows = (map) =>
  [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((first, second) => second.count - first.count || first.reason.localeCompare(second.reason));

const C4_REQUESTS = {
  broad: { query: "shop vac" },
  constrained: {
    query: "robot vacuum",
    budget: "under $300",
    priorities: "self-emptying",
  },
};

const PROSPECTIVE_07C_CONSTRAINED_LEADERS = [
  { brand: "shark", lines: ["matrix", "ai", "iq"] },
  { brand: "eufy", lines: ["c10", "clean", "x8"] },
  { brand: "roborock", lines: ["q5", "q10"] },
  { brand: "roomba", lines: ["105", "i3", "i4", "i5"] },
];

function requestContract(request, c4Shape) {
  const knownShape = c4Shape && Object.hasOwn(C4_REQUESTS, c4Shape);
  const expected = knownShape
    ? C4_REQUESTS[c4Shape]
    : request?.budget
      ? C4_REQUESTS.constrained
      : C4_REQUESTS.broad;
  const keys = Object.keys(request || {}).sort();
  const expectedKeys = Object.keys(expected).sort();
  const valid =
    (!c4Shape || knownShape) &&
    JSON.stringify(keys) === JSON.stringify(expectedKeys) &&
    expectedKeys.every((key) => request?.[key] === expected[key]);

  return { valid, expected, actual: request };
}

function sourcePath(value) {
  if (!value) return "";
  if (value.startsWith("/")) return value;

  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

function sourceEvidenceText(name, urlsOrPaths) {
  const values = Array.isArray(urlsOrPaths) ? urlsOrPaths : [urlsOrPaths];
  return [name, ...values.map(sourcePath)].filter(Boolean).join(" ");
}

function normalizedWords(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function duplicateFinalPairs(products) {
  const duplicates = [];
  for (let first = 0; first < products.length; first += 1) {
    for (let second = first + 1; second < products.length; second += 1) {
      if (areSameExactModelProduct(products[first], products[second])) {
        duplicates.push([products[first].name, products[second].name]);
      }
    }
  }
  return duplicates;
}

function jaccard(first, second) {
  const a = new Set(first.map(normalizedWords));
  const b = new Set(second.map(normalizedWords));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((value) => b.has(value)).length / union.size;
}

function pairwiseMean(runs, field) {
  const scores = [];
  for (let first = 0; first < runs.length; first += 1) {
    for (let second = first + 1; second < runs.length; second += 1) {
      scores.push(jaccard(runs[first][field], runs[second][field]));
    }
  }
  return scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : null;
}

function benchmarkForRequest(request) {
  return GOLD.find((item) =>
    request.budget
      ? item.id === "con-robot-vac-300-selfempty"
      : item.id === "broad-shop-vac",
  );
}

function prospective07cBenchmark(benchmark) {
  return benchmark.id === "con-robot-vac-300-selfempty"
    ? { ...benchmark, coreLeaders: PROSPECTIVE_07C_CONSTRAINED_LEADERS }
    : benchmark;
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
  sourceEvidence = false,
}) {
  const rawResults = productDiscoveryAttempts.flatMap((attempt) =>
    attempt.results,
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
  const recoveryRecords = discoveryRecords.filter((candidate) =>
    ["would_recover", "recovered"].includes(
      candidate.normalizationRecovery?.outcome,
    ),
  );
  const recoveryObserved = discoveryRecords.some(
    (candidate) => candidate.normalizationRecovery,
  );
  const counterfactualObserved = discoveryRecords.some(
    (candidate) => candidate.normalizationCounterfactual,
  );
  const modeNormalizedRecords = (mode) =>
    discoveryRecords.flatMap((candidate) => {
      const counterfactual = candidate.normalizationCounterfactual;
      if (!counterfactual) {
        return candidate.source === "serper" && candidate.normalized
          ? [candidate]
          : [];
      }

      const outcome = mode === "flag_on"
        ? counterfactual.flagOn
        : counterfactual.flagOff;
      return outcome.normalizedCandidateId
        ? [{ ...candidate, productUrl: outcome.productUrl }]
        : [];
    });
  const flagOffNormalizedRecords = modeNormalizedRecords("flag_off");
  const flagOnNormalizedRecords = modeNormalizedRecords("flag_on");
  const recoveredRuntimeRecords = discoveryRecords.filter(
    (candidate) => candidate.normalizationRecovery?.outcome === "recovered",
  );
  const matchText = (name, urlOrPath, leader) =>
    matcher(
      sourceEvidence ? sourceEvidenceText(name, urlOrPath) : name,
      leader,
    );

  const leaders = benchmark.coreLeaders.map((leader) => {
    const rawTitleMatches = rawResults.filter((result) =>
      matcher(result.title, leader),
    );
    const rawMatches = rawResults.filter((result) =>
      matchText(result.title, result.urlPaths || [], leader),
    );
    const rawRecordMatches = discoveryRecords.filter(
      (candidate) =>
        candidate.source === "raw_serper_result" &&
        matchText(
          candidate.name,
          candidate.sourceIdentityPaths || candidate.productUrl,
          leader,
        ),
    );
    const normalizedMatches = normalizedRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const dedupedMatches = dedupedRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const prefilterMatches = prefilterRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const postMergeMatches = postMergeRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const displayedMatches = finalProducts
      .filter((product) =>
        matchText(product.name, product.product_page_url, leader),
      )
      .map((product) => product.name);
    const recoveryMatches = recoveryRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const flagOffNormalizedMatches = flagOffNormalizedRecords.filter(
      (candidate) => matchText(candidate.name, candidate.productUrl, leader),
    );
    const flagOnNormalizedMatches = flagOnNormalizedRecords.filter(
      (candidate) => matchText(candidate.name, candidate.productUrl, leader),
    );

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
      rawTitlePresence: rawTitleMatches.length > 0,
      rawPresence: rawMatches.length > 0,
      rawAppearanceCount: rawMatches.length,
      sourceEvidenceOnlyRawNames: rawMatches
        .filter((result) => !matcher(result.title, leader))
        .map((result) => result.title),
      normalizedPresence: normalizedMatches.length > 0,
      normalizedCandidateCount: normalizedMatches.length,
      rawDedupeSurvival: dedupedMatches.length > 0,
      prefilterSurvival: prefilterMatches.length > 0,
      preAiPoolPresence: prefilterMatches.length > 0,
      postMergePresence: postMergeMatches.length > 0,
      displayedPresence: displayedMatches.length > 0,
      displayedNames: displayedMatches,
      normalizationRecoveryOpportunity: recoveryMatches.length > 0,
      normalizationRecoveryNames: Array.from(
        new Set(recoveryMatches.map((candidate) => candidate.name)),
      ),
      flagOffNormalizedPresence: flagOffNormalizedMatches.length > 0,
      flagOnNormalizedPresence: flagOnNormalizedMatches.length > 0,
      terminalStage,
      terminalReasons,
    };
  });

  const recordedResultLossFrequency = new Map();
  for (const candidate of discoveryRecords) {
    if (!candidate.firstLoss) continue;
    const matchingLeaderCount = benchmark.coreLeaders.filter((leader) =>
      matchText(candidate.name, candidate.productUrl, leader),
    ).length;
    if (matchingLeaderCount === 0) continue;
    increment(
      recordedResultLossFrequency,
      `${candidate.firstLoss.stage}:${candidate.firstLoss.subreason}`,
      matchingLeaderCount,
    );
  }

  return {
    preAiPoolNames: prefilterRecords.map((candidate) => candidate.name),
    preAiPoolRecall: {
      covered: leaders.filter((leader) => leader.preAiPoolPresence).length,
      total: benchmark.coreLeaders.length,
    },
    finalRecall: {
      covered: leaders.filter((leader) => leader.displayedPresence).length,
      total: benchmark.coreLeaders.length,
    },
    normalizationRecovery: {
      observed: recoveryObserved,
      uniqueLeaderRunOpportunities: leaders.filter(
        (leader) => leader.normalizationRecoveryOpportunity,
      ).length,
      productNames: Array.from(
        new Set(
          leaders.flatMap((leader) => leader.normalizationRecoveryNames),
        ),
      ),
    },
    normalizationCounterfactual: {
      observed: counterfactualObserved,
      flagOffNormalizedRecall: {
        covered: leaders.filter((leader) => leader.flagOffNormalizedPresence)
          .length,
        total: benchmark.coreLeaders.length,
      },
      flagOnNormalizedRecall: {
        covered: leaders.filter((leader) => leader.flagOnNormalizedPresence)
          .length,
        total: benchmark.coreLeaders.length,
      },
      addedResults: discoveryRecords
        .filter((candidate) => candidate.normalizationCounterfactual?.delta === "added")
        .map((candidate) => candidate.name),
      removedForSafety: discoveryRecords
        .filter(
          (candidate) =>
            candidate.normalizationCounterfactual?.delta === "removed_for_safety",
        )
        .map((candidate) => candidate.name),
      parityViolations: discoveryRecords.filter(
        (candidate) =>
          candidate.normalizationCounterfactual?.runtimeMatchesSelected === false,
      ).length,
      recoveredSurvival: recoveredRuntimeRecords.map((candidate) => ({
        name: candidate.name,
        prefilterAccepted: candidate.prefilterAccepted,
        firstLoss: candidate.firstLoss,
        selected: candidate.selected,
        finalOutcome: candidate.finalOutcome,
      })),
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
    benchmark: prospective07cBenchmark(benchmark),
    matcher: coversLeaderProspective07c,
    sourceEvidence: true,
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
  const wrongTypeFinalCards = finalProducts
    .filter((product) =>
      benchmark.wrongTypeTerms.some((term) =>
        normalizedWords(product.name).includes(normalizedWords(term)),
      ),
    )
    .map((product) => product.name);
  const falseAccessoryCollapses = ledger.candidateLineage.candidates
    .filter((candidate) => candidate.identityCollapsedInto)
    .filter((candidate) =>
      !classifyProductTypeMatch({
        allowedCheckText: candidate.name,
        evidenceText: sourceEvidenceText(candidate.name, candidate.productUrl),
        identityText: candidate.name,
        requestedCategory: benchmark.category,
      }).canBeExactMatch,
    )
    .map((candidate) => ({
      name: candidate.name,
      collapsedInto: candidate.identityCollapsedInto,
    }));
  const contract = requestContract(request, fixture._c4Shape);
  const flags = ledger.header.flags || {};
  const attemptGuard = ledger.dispatch.attemptGuard;
  const validityReasons = fixture._c4Shape
    ? [
        ...(fixture._exclusionReasons || []),
        ...(fixture._sampleStatus === "usable" ? [] : ["fixture_not_marked_usable"]),
        ...(contract.valid ? [] : ["request_contract_mismatch"]),
        ...(ledger.header.serperCacheEmptyAtStart ? [] : ["warm_serper_cache"]),
        ...(ledger.header.commitHash ? [] : ["missing_commit_hash"]),
        ...(flags.REVIEW_RADAR_NORMALIZATION_RECOVERY === "on"
          ? []
          : ["normalization_recovery_not_on"]),
        ...(flags.REVIEW_RADAR_CONSTRAINT_ALLOCATION === "on"
          ? []
          : ["constraint_allocation_not_on"]),
        ...(["unset", "off"].includes(flags.REVIEW_RADAR_PINNED_PLANNING)
          ? []
          : ["pinned_planning_not_off"]),
        ...(flags.REVIEW_RADAR_MAX_SERPER_ATTEMPTS === "120"
          ? []
          : ["attempt_ceiling_not_120"]),
        ...(ledger.dispatch.reconciliation.balanced ? [] : ["ledger_unbalanced"]),
        ...(attemptGuard ? [] : ["missing_attempt_guard"]),
        ...(attemptGuard?.maxAttempts === 120 ? [] : ["attempt_guard_not_120"]),
        ...(attemptGuard?.reservedAttempts ===
        ledger.dispatch.reconciliation.physicalAttempts
          ? []
          : ["attempt_guard_reconciliation_mismatch"]),
        ...(attemptGuard?.tripped ? ["attempt_ceiling_tripped"] : []),
      ]
    : [];

  return {
    path,
    request,
    requestContract: contract,
    sampleValidity: {
      usable: validityReasons.length === 0,
      reasons: Array.from(new Set(validityReasons)),
    },
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
    wrongTypeFinalCards,
    duplicateFinalPairs: duplicateFinalPairs(finalProducts),
    falseAccessoryCollapses,
    malformedQueries,
    preAiPoolNames: prospective07c.preAiPoolNames,
    finalNames,
  };
}

export function aggregateReadinessAnalyses(analyses) {
  const usableAnalyses = analyses.filter(
    (analysis) => analysis.sampleValidity.usable,
  );
  const broad = usableAnalyses.filter((analysis) => !analysis.request.budget);
  const constrained = usableAnalyses.filter((analysis) => analysis.request.budget);
  const frequency = new Map();
  const terminalFrequency = new Map();

  for (const analysis of usableAnalyses) {
    for (const row of analysis.current07b.recordedLeaderResultLossFrequency) {
      increment(frequency, row.reason, row.count);
    }
    for (const leader of analysis.current07b.leaders) {
      increment(terminalFrequency, leader.terminalStage);
    }
  }

  const mean = (values) =>
    values.length === 0
      ? null
      : values.reduce((total, value) => total + value, 0) / values.length;

  return {
    contract: {
      preAiPool:
        "source=serper; product_discovery provenance; normalized; raw-dedupe survivor; cheap-prefilter accepted; candidate_merge still counts as pre-AI presence",
      caveat:
        "candidate_merge can be inflated by URL/name lineage mismatches; this can overstate pre-AI presence but cannot create a false miss",
      counterfactual:
        "flag-off versus flag-on normalization is computed on the same provider result; final recall is absolute flag-on evidence, not a reconstructed flag-off final",
    },
    invalidRequestContracts: analyses
      .filter((analysis) => !analysis.requestContract.valid)
      .map((analysis) => analysis.path),
    invalidSamples: analyses
      .filter((analysis) => !analysis.sampleValidity.usable)
      .map((analysis) => ({
        path: analysis.path,
        reasons: analysis.sampleValidity.reasons,
      })),
    sampleCounts: {
      dispatched: analyses.length,
      usable: usableAnalyses.length,
      broadUsable: broad.length,
      constrainedUsable: constrained.length,
    },
    broadCurrent07bMean: mean(
      broad.map((analysis) => analysis.current07b.preAiPoolRecall.covered),
    ),
    broadProspective07cMean: mean(
      broad.map((analysis) => analysis.prospective07c.preAiPoolRecall.covered),
    ),
    broadFlagOffNormalizedMean: mean(
      broad.map(
        (analysis) =>
          analysis.prospective07c.normalizationCounterfactual
            .flagOffNormalizedRecall.covered,
      ),
    ),
    broadFlagOnNormalizedMean: mean(
      broad.map(
        (analysis) =>
          analysis.prospective07c.normalizationCounterfactual
            .flagOnNormalizedRecall.covered,
      ),
    ),
    normalizationCounterfactual: {
      observedRuns: usableAnalyses.filter(
        (analysis) =>
          analysis.prospective07c.normalizationCounterfactual.observed,
      ).length,
      parityViolations: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.prospective07c.normalizationCounterfactual.parityViolations,
        0,
      ),
    },
    safety: {
      wrongTypeFinalCards: usableAnalyses.flatMap(
        (analysis) => analysis.wrongTypeFinalCards,
      ),
      exactHardConstraintFailures: usableAnalyses.flatMap(
        (analysis) => analysis.exactHardConstraintFailures,
      ),
      duplicateFinalPairs: usableAnalyses.flatMap(
        (analysis) => analysis.duplicateFinalPairs,
      ),
      falseAccessoryCollapses: usableAnalyses.flatMap(
        (analysis) => analysis.falseAccessoryCollapses,
      ),
    },
    stability: {
      broadPoolPairwiseJaccard: pairwiseMean(broad, "preAiPoolNames"),
      broadFinalPairwiseJaccard: pairwiseMean(broad, "finalNames"),
      constrainedPoolPairwiseJaccard: pairwiseMean(
        constrained,
        "preAiPoolNames",
      ),
      constrainedFinalPairwiseJaccard: pairwiseMean(constrained, "finalNames"),
    },
    cost: {
      includesSpentExcludedRuns: true,
      physicalAttempts: analyses.reduce(
        (total, analysis) =>
          total + analysis.reconciliation.physicalAttempts,
        0,
      ),
      retries: analyses.reduce(
        (total, analysis) => total + analysis.reconciliation.retries,
        0,
      ),
      fallbacks: analyses.reduce(
        (total, analysis) => total + analysis.reconciliation.fallbacks,
        0,
      ),
    },
    normalizationRecovery: {
      observedRuns: usableAnalyses.filter(
        (analysis) => analysis.current07b.normalizationRecovery.observed,
      ).length,
      current07bUniqueLeaderRunOpportunities: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.current07b.normalizationRecovery.uniqueLeaderRunOpportunities,
        0,
      ),
      prospective07cUniqueLeaderRunOpportunities: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.prospective07c.normalizationRecovery
            .uniqueLeaderRunOpportunities,
        0,
      ),
    },
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

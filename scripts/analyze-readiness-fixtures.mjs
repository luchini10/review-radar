import { readFileSync } from "node:fs";

import { GOLD, coversLeader } from "./goldBenchmark.mjs";

const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error("Usage: node scripts/analyze-readiness-fixtures.mjs <fixture>...");
  process.exit(1);
}

const PRE_POOL_LOSSES = new Set([
  "lost_in_normalization",
  "raw_dedupe",
  "cheap_prefilter",
]);

const covered = (names, leader) => names.some((name) => coversLeader(name, leader));
const leaderLabel = (leader) =>
  [leader.brand, ...(leader.lines || [])].filter(Boolean).join(" / ");

for (const path of paths) {
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  const request = fixture._request || { query: fixture._query };
  const benchmark = GOLD.find((item) =>
    request.budget
      ? item.id === "con-robot-vac-300-selfempty"
      : item.id === "broad-shop-vac",
  );
  const ledger = fixture.debug?.stageFunnel?.searchLedger;

  if (!ledger || !benchmark) {
    console.error(`${path}: missing ledger or benchmark`);
    process.exitCode = 1;
    continue;
  }

  const productDiscoveryQueryIds = new Set(
    ledger.planAssembly
      .filter((query) => query.purpose === "product_discovery")
      .map((query) => query.id),
  );
  const productDiscoveryAttempts = ledger.dispatch.attempts.filter((attempt) =>
    productDiscoveryQueryIds.has(attempt.queryId),
  );
  const serperPool = ledger.candidateLineage.candidates.filter(
    (candidate) =>
      candidate.source === "serper" &&
      candidate.normalized &&
      !candidate.mergedIntoCandidateId &&
      candidate.queryIds.some((queryId) => productDiscoveryQueryIds.has(queryId)) &&
      !PRE_POOL_LOSSES.has(candidate.firstLoss?.stage),
  );
  const serperPoolNames = serperPool.map((candidate) => candidate.name);
  const rawNames = productDiscoveryAttempts.flatMap((attempt) =>
    attempt.results.map((result) => result.title),
  );
  const finalProducts = [
    ...(fixture.result?.exactMatches || []),
    ...(fixture.result?.nearMatches || []),
  ];
  const finalNames = finalProducts.map((product) => product.name);
  const exactProducts = fixture.result?.exactMatches || [];
  const aiDisplayed = ledger.candidateLineage.candidates
    .filter(
      (candidate) =>
        candidate.source === "final_openai_research" &&
        candidate.selected &&
        covered(finalNames, { brand: candidate.name, lines: [] }),
    )
    .map((candidate) => candidate.name);

  const leaderAttribution = benchmark.coreLeaders.map((leader) => {
    if (covered(serperPoolNames, leader)) {
      return { leader: leaderLabel(leader), result: "serper_normalized_pool" };
    }
    if (covered(rawNames, leader)) {
      const rawRecord = ledger.candidateLineage.candidates.find(
        (candidate) =>
          candidate.source === "raw_serper_result" &&
          coversLeader(candidate.name, leader),
      );
      return {
        leader: leaderLabel(leader),
        result: "present_raw_lost_before_pool",
        firstLoss: rawRecord?.firstLoss || null,
      };
    }
    return { leader: leaderLabel(leader), result: "absent_from_raw_digests" };
  });

  const exactHardConstraintFailures = exactProducts.filter((product) =>
    (product.requirementCheck?.failed || []).length > 0 ||
    (product.requirementCheck?.unknown || []).length > 0,
  ).map((product) => product.name);
  const malformedQueries = ledger.dispatch.attempts
    .map((attempt) => attempt.finalOutboundQuery)
    .filter((query) => /site:\*|\b([a-z0-9]+)\s+\1\b/i.test(query));

  console.log(JSON.stringify({
    path,
    request,
    reconciliation: ledger.dispatch.reconciliation,
    cacheCold: ledger.header.serperCacheEmptyAtStart,
    seedSearchesRun: fixture.debug.seedSearchesRun,
    serperPoolRecall: {
      covered: leaderAttribution.filter(
        (item) => item.result === "serper_normalized_pool",
      ).length,
      total: benchmark.coreLeaders.length,
    },
    finalRecall: {
      covered: benchmark.coreLeaders.filter((leader) => covered(finalNames, leader)).length,
      total: benchmark.coreLeaders.length,
    },
    leaderAttribution,
    aiDisplayed,
    exactHardConstraintFailures,
    malformedQueries,
    finalNames,
  }, null, 2));
}

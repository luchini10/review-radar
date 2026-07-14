// Bounded live C5 diagnostic. This script does not implement a production
// resolver. It asks whether four recurring, type-safe identity leads from the
// saved C4 broad runs can be turned into safe product pages by exact targeted
// Serper lookups.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cacheStats } from "../lib/cache.ts";
import {
  buildSearchObservabilitySnapshot,
  createSearchObservabilityLedger,
  registerSearchQuery,
  resolveReviewRadarCommitHash,
  reviewRadarFlagSnapshot,
  runWithSearchObservabilityLedger,
} from "../lib/searchObservabilityLedger.ts";
import {
  cheapPreFilterRawCandidates,
  dedupeRawCandidates,
  searchSerperOrganic,
  searchSerperShoppingWithDiagnostics,
} from "../lib/search/serper.ts";
import {
  analyzeProductPageResolutionCandidate,
} from "./analyze-readiness-fixtures.mjs";

const SERPER_BASE_URL = "https://google.serper.dev";
const CATEGORY = "shop vac";
const TARGET_RECALL = 5;
const RESULTS_PER_QUERY = 10;
const DEFAULT_OUTPUT = "shop-vac.c5-resolution-probe.json";
const LIVE_FIXTURE_DIR = "tests/fixtures/review-radar-live";

export const APPROVED_PROBE_BUDGET = Object.freeze({
  logicalSearches: 8,
  plannedPhysicalAttempts: 8,
  maxPhysicalAttempts: 24,
});

export const DEFAULT_C4_BROAD_FIXTURES = Object.freeze([
  `${LIVE_FIXTURE_DIR}/shop-vac.c4-07c-run1.json`,
  `${LIVE_FIXTURE_DIR}/shop-vac.c4-07c-run2.json`,
  `${LIVE_FIXTURE_DIR}/shop-vac.c4-07c-run3.json`,
]);

export const FROZEN_RESOLUTION_TARGETS = Object.freeze([
  Object.freeze({
    leader: "ridgid / nxt / wd / hd",
    name: "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
  }),
  Object.freeze({
    leader: "vacmaster",
    name: "Vacmaster 5 Gallon Wet Dry Vacuum",
  }),
  Object.freeze({
    leader: "craftsman",
    name: "Craftsman 6 Gallon 3.5 Peak HP Wet/Dry Shop Vacuum CMXEVBE17584",
  }),
  Object.freeze({
    leader: "stanley",
    name: "Stanley Wet/Dry Vacuum SL18115",
  }),
]);

const TARGET_NAME_BY_LEADER = Object.fromEntries(
  FROZEN_RESOLUTION_TARGETS.map((target) => [target.leader, target.name]),
);

function frozenLeader(leader, materialized, qualified = true) {
  return Object.freeze({
    capturedMaterializedPresence: materialized,
    leader,
    qualifiedIdentityLeadNames: qualified
      ? [TARGET_NAME_BY_LEADER[leader]]
      : [],
    qualifiedIdentityLeadPresence: qualified,
  });
}

export const FROZEN_C4_BASELINE = Object.freeze([
  Object.freeze({
    path: DEFAULT_C4_BROAD_FIXTURES[0],
    sha256: "ace922c65d0325851924c05c0268f4b91fd8dae55d802db603bca6a889a8dec8",
    identityResolution: Object.freeze({
      leaders: Object.freeze([
        frozenLeader("ridgid / nxt / wd / hd", false),
        frozenLeader("vacmaster", false),
        frozenLeader("craftsman", false),
        frozenLeader("dewalt", true, false),
        frozenLeader("stanley", false),
        frozenLeader("shop vac", true, false),
        frozenLeader("workshop", false, false),
      ]),
    }),
  }),
  Object.freeze({
    path: DEFAULT_C4_BROAD_FIXTURES[1],
    sha256: "b25257501ac520ae329c7b0cffdac84742ea6dab0ac2693adfe43180e00d0a21",
    identityResolution: Object.freeze({
      leaders: Object.freeze([
        frozenLeader("ridgid / nxt / wd / hd", false),
        frozenLeader("vacmaster", false),
        frozenLeader("craftsman", false),
        frozenLeader("dewalt", true, false),
        frozenLeader("stanley", false),
        frozenLeader("shop vac", true, false),
        frozenLeader("workshop", false, false),
      ]),
    }),
  }),
  Object.freeze({
    path: DEFAULT_C4_BROAD_FIXTURES[2],
    sha256: "f54fdd7154a3a37c764390097305047b266e1652623c91d070356c1ffe6f6121",
    identityResolution: Object.freeze({
      leaders: Object.freeze([
        frozenLeader("ridgid / nxt / wd / hd", true, false),
        frozenLeader("vacmaster", false),
        frozenLeader("craftsman", false),
        frozenLeader("dewalt", true, false),
        frozenLeader("stanley", true, false),
        frozenLeader("shop vac", true, false),
        frozenLeader("workshop", false, false),
      ]),
    }),
  }),
]);

function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function queryForTarget(target, vertical) {
  return vertical === "shopping" ? target.name : `${target.name} product page`;
}

function queryPlanRow(target, vertical) {
  const query = queryForTarget(target, vertical);
  return {
    endpoint: `${SERPER_BASE_URL}/${vertical === "shopping" ? "shopping" : "search"}`,
    leader: target.leader,
    query,
    requestBody: {
      gl: "us",
      hl: "en",
      num: RESULTS_PER_QUERY,
      q: query,
    },
    targetName: target.name,
    vertical,
  };
}

export function buildResolutionProbePlan(
  analyses,
  targets = FROZEN_RESOLUTION_TARGETS,
) {
  if (!Array.isArray(analyses) || analyses.length !== 3) {
    throw new Error("The C5 probe requires exactly three C4 broad analyses.");
  }

  const targetsByLeader = new Map(targets.map((target) => [target.leader, target]));
  const runs = analyses.map((analysis) => {
    const leaders = analysis.identityResolution?.leaders;
    if (!Array.isArray(leaders) || leaders.length !== 7) {
      throw new Error(`${analysis.path || "<unknown>"}: expected seven frozen leaders.`);
    }

    const missingLeaders = leaders
      .filter(
        (leader) =>
          !leader.capturedMaterializedPresence &&
          leader.qualifiedIdentityLeadPresence,
      )
      .map((leader) => {
        const target = targetsByLeader.get(leader.leader);
        if (!target) {
          throw new Error(
            `No frozen target covers ${leader.leader} in ${analysis.path}.`,
          );
        }
        const targetPresent = leader.qualifiedIdentityLeadNames.some(
          (name) => normalized(name) === normalized(target.name),
        );
        if (!targetPresent) {
          throw new Error(
            `Frozen target does not cover ${leader.leader} in ${analysis.path}.`,
          );
        }
        return leader.leader;
      });

    return {
      baselineCovered: leaders.filter(
        (leader) => leader.capturedMaterializedPresence,
      ).length,
      missingLeaders,
      path: analysis.path,
      ...(analysis.sha256 ? { sha256: analysis.sha256 } : {}),
      total: leaders.length,
    };
  });

  const plannedTargets = targets.map((target) => ({
    ...target,
    coveredRuns: runs
      .filter((run) => run.missingLeaders.includes(target.leader))
      .map((run) => run.path),
  }));
  for (const target of plannedTargets) {
    if (target.coveredRuns.length === 0) {
      throw new Error(`Frozen target ${target.name} does not cover a measured gap.`);
    }
  }

  const queries = plannedTargets.flatMap((target) => [
    queryPlanRow(target, "shopping"),
    queryPlanRow(target, "organic"),
  ]);
  if (queries.length !== APPROVED_PROBE_BUDGET.logicalSearches) {
    throw new Error(
      `Probe planned ${queries.length} logical searches; approval permits ${APPROVED_PROBE_BUDGET.logicalSearches}.`,
    );
  }

  return {
    budget: APPROVED_PROBE_BUDGET,
    category: CATEGORY,
    queries,
    runs,
    targetRecall: TARGET_RECALL,
    targets: plannedTargets,
  };
}

function candidateSummary(candidate) {
  return {
    category: candidate.category,
    name: candidate.name,
    price: candidate.price,
    retailer: candidate.retailer,
    url: candidate.productUrl,
  };
}

export function evaluateProbeTargetCandidates({ candidates, target }) {
  const deduped = dedupeRawCandidates(candidates).candidates;
  const prefilter = cheapPreFilterRawCandidates(deduped, { query: CATEGORY });
  const accepted = [];
  const rejected = prefilter.rejected.map((candidate) => ({
    name: candidate.name,
    reason: `cheap_prefilter_${candidate.reason}`,
    url: null,
  }));

  for (const candidate of prefilter.candidates) {
    const decision = analyzeProductPageResolutionCandidate({
      category: CATEGORY,
      leadName: target.name,
      pageTitle: candidate.name,
      pageUrl: candidate.productUrl,
    });
    const row = {
      ...candidateSummary(candidate),
      exactIdentity: decision.exactIdentity,
      pageEligibility: decision.pageEligibility,
      pageTypeStatus: decision.pageTypeStatus,
    };

    if (decision.strictResolutionAccepted) {
      accepted.push(row);
    } else {
      rejected.push({
        ...row,
        reason: decision.rejectionReason,
      });
    }
  }

  return {
    accepted,
    duplicateCount: candidates.length - deduped.length,
    prefilterRejectedCount: prefilter.rejectedCount,
    rejected,
    resolved: accepted.length > 0,
  };
}

function invalidProbeReasons(ledger, targetResults) {
  const reconciliation = ledger?.dispatch?.reconciliation || {};
  const attemptGuard = ledger?.dispatch?.attemptGuard || {};
  const attempts = ledger?.dispatch?.attempts || [];
  const reasons = [];

  if ((reconciliation.cacheHits || 0) > 0) reasons.push("warm_cache");
  if (!reconciliation.balanced) reasons.push("ledger_unbalanced");
  if (attemptGuard.tripped) reasons.push("attempt_ceiling_tripped");
  if (attempts.some((attempt) => attempt.error)) {
    reasons.push("serper_request_error");
  }
  if (
    reconciliation.logicalSearches !== APPROVED_PROBE_BUDGET.logicalSearches
  ) {
    reasons.push("logical_search_count_mismatch");
  }
  if (
    reconciliation.physicalAttempts >
    APPROVED_PROBE_BUDGET.maxPhysicalAttempts
  ) {
    reasons.push("physical_attempt_ceiling_exceeded");
  }
  if (attemptGuard.maxAttempts !== APPROVED_PROBE_BUDGET.maxPhysicalAttempts) {
    reasons.push("attempt_guard_mismatch");
  }
  if (targetResults.length !== FROZEN_RESOLUTION_TARGETS.length) {
    reasons.push("target_result_count_mismatch");
  }

  return Array.from(new Set(reasons));
}

export function scoreResolutionProbe({ ledger, plan, targetResults }) {
  const resultByLeader = new Map(
    targetResults.map((result) => [result.leader, result]),
  );
  const runs = plan.runs.map((run) => {
    const newlyResolved = run.missingLeaders.filter(
      (leader) => resultByLeader.get(leader)?.resolved === true,
    );
    return {
      baselineCovered: run.baselineCovered,
      newlyResolved,
      path: run.path,
      projectedCovered: run.baselineCovered + newlyResolved.length,
      total: run.total,
    };
  });
  const projectedMean = mean(runs.map((run) => run.projectedCovered));
  const invalidReasons = invalidProbeReasons(ledger, targetResults);
  const verdict =
    invalidReasons.length > 0
      ? "probe_inconclusive"
      : projectedMean >= plan.targetRecall
        ? "probe_pass"
        : "probe_fail_below_5_of_7";

  return {
    invalidReasons,
    projectedMean,
    runs,
    targetRecall: plan.targetRecall,
    verdict,
  };
}

export function assertApprovedLiveExecution({
  apiKey,
  cacheEntries,
  confirmed,
  outputPath,
  trackedChanges,
}) {
  if (!confirmed) {
    throw new Error("Dry run only. Pass --confirm to use the approved live budget.");
  }
  if (!apiKey) throw new Error("SERPER_API_KEY is missing.");
  if (cacheEntries !== 0) {
    throw new Error(`Serper cache must be cold; found ${cacheEntries} entries.`);
  }
  if (trackedChanges.trim()) {
    throw new Error("Tracked worktree must be clean before the live probe.");
  }
  if (existsSync(outputPath)) {
    throw new Error(`Refusing to overwrite existing probe fixture: ${outputPath}`);
  }
}

function loadFrozenAnalyses() {
  for (const baseline of FROZEN_C4_BASELINE) {
    if (!existsSync(baseline.path)) {
      throw new Error(`Missing frozen C4 fixture: ${baseline.path}`);
    }
    const actual = createHash("sha256")
      .update(readFileSync(baseline.path))
      .digest("hex");
    if (actual !== baseline.sha256) {
      throw new Error(
        `${baseline.path}: SHA-256 mismatch; refuse to spend against changed evidence.`,
      );
    }
  }
  return FROZEN_C4_BASELINE;
}

function parseArgs(args) {
  let confirmed = false;
  let output = DEFAULT_OUTPUT;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--confirm") {
      confirmed = true;
    } else if (arg === "--out" && args[index + 1]) {
      output = args[++index];
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (basename(output) !== output) {
    throw new Error("--out must be a filename within the live-fixture directory.");
  }
  return {
    confirmed,
    output,
  };
}

function writeProbeFixture(outputPath, fixture) {
  mkdirSync(LIVE_FIXTURE_DIR, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2));
}

async function runLiveProbe({ outputPath, plan }) {
  process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS = String(
    APPROVED_PROBE_BUDGET.maxPhysicalAttempts,
  );
  const ledgerState = createSearchObservabilityLedger({
    commitHash: resolveReviewRadarCommitHash(),
    finalModel: "none",
    flags: reviewRadarFlagSnapshot(),
    helperModel: "none",
    serperCacheEmptyAtStart: true,
  });
  const targetResults = [];
  const queryResults = [];
  const baseFixture = {
    _probeType: "c5_resolution_feasibility",
    _savedAt: new Date().toISOString(),
    _sampleStatus: "running",
    _version: "1",
    plan,
  };
  writeProbeFixture(outputPath, baseFixture);

  await runWithSearchObservabilityLedger(ledgerState, async () => {
    for (const target of plan.targets) {
      const candidates = [];
      for (const vertical of ["shopping", "organic"]) {
        const query = queryForTarget(target, vertical);
        const queryId = registerSearchQuery({
          origin: "market_rescue",
          phase: "c5_live_resolution_probe",
          purpose: "product_discovery",
          query,
          sourceDetail: `resolution_probe_${vertical}`,
        });
        const context = {
          origin: "market_rescue",
          phase: "c5_live_resolution_probe",
          purpose: "product_discovery",
          queryId,
          originalQuery: query,
          sourceDetail: `resolution_probe_${vertical}`,
        };
        let verticalCandidates;
        let diagnostics = null;
        if (vertical === "shopping") {
          const result = await searchSerperShoppingWithDiagnostics(
            query,
            CATEGORY,
            {},
            context,
          );
          verticalCandidates = result.candidates;
          diagnostics = result.diagnostics;
        } else {
          verticalCandidates = await searchSerperOrganic(
            query,
            CATEGORY,
            context,
          );
        }
        candidates.push(...verticalCandidates);
        queryResults.push({
          candidates: verticalCandidates.map(candidateSummary),
          diagnostics,
          leader: target.leader,
          query,
          targetName: target.name,
          vertical,
        });
        writeProbeFixture(outputPath, {
          ...baseFixture,
          _sampleStatus: "running",
          ledger: buildSearchObservabilitySnapshot(),
          queryResults,
          targetResults,
        });
      }

      targetResults.push({
        leader: target.leader,
        targetName: target.name,
        ...evaluateProbeTargetCandidates({ candidates, target }),
      });
      writeProbeFixture(outputPath, {
        ...baseFixture,
        _sampleStatus: "running",
        ledger: buildSearchObservabilitySnapshot(),
        queryResults,
        targetResults,
      });
    }

    const ledger = buildSearchObservabilitySnapshot();
    const score = scoreResolutionProbe({ ledger, plan, targetResults });
    const sampleStatus =
      score.verdict === "probe_inconclusive" ? "spent_inconclusive" : "usable";
    writeProbeFixture(outputPath, {
      ...baseFixture,
      _completedAt: new Date().toISOString(),
      _sampleStatus: sampleStatus,
      ledger,
      queryResults,
      score,
      targetResults,
    });
    return score;
  });

  return JSON.parse(readFileSync(outputPath, "utf8"));
}

async function runCli(args) {
  const options = parseArgs(args);
  const analyses = loadFrozenAnalyses();
  const plan = buildResolutionProbePlan(analyses);
  const outputPath = join(LIVE_FIXTURE_DIR, options.output);

  if (!options.confirmed) {
    console.log(JSON.stringify({ mode: "dry_run", outputPath, plan }, null, 2));
    console.log("No live call dispatched. Pass --confirm only with the approved 8/8/24 budget.");
    return;
  }

  const trackedChanges = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf8", windowsHide: true },
  );
  assertApprovedLiveExecution({
    apiKey: process.env.SERPER_API_KEY,
    cacheEntries: cacheStats().entries,
    confirmed: options.confirmed,
    outputPath,
    trackedChanges,
  });

  const fixture = await runLiveProbe({ outputPath, plan });
  console.log(JSON.stringify({
    outputPath,
    physicalAttempts: fixture.ledger.dispatch.reconciliation.physicalAttempts,
    projectedMean: fixture.score.projectedMean,
    sampleStatus: fixture._sampleStatus,
    verdict: fixture.score.verdict,
  }, null, 2));
  if (fixture.score.verdict === "probe_inconclusive") process.exitCode = 2;
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

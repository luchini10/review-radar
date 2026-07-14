import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPROVED_PROBE_BUDGET,
  FROZEN_RESOLUTION_TARGETS,
  assertApprovedLiveExecution,
  buildResolutionProbePlan,
  evaluateProbeTargetCandidates,
  scoreResolutionProbe,
} from "../scripts/probe-resolution-feasibility.mjs";

function leader(leaderName, targetName, materialized) {
  return {
    leader: leaderName,
    capturedMaterializedPresence: materialized,
    qualifiedIdentityLeadPresence: Boolean(targetName),
    qualifiedIdentityLeadNames: targetName ? [targetName] : [],
  };
}

function syntheticAnalyses() {
  const target = Object.fromEntries(
    FROZEN_RESOLUTION_TARGETS.map((item) => [item.leader, item.name]),
  );
  const common = (materialized = {}) => [
    leader("ridgid / nxt / wd / hd", target["ridgid / nxt / wd / hd"], materialized.ridgid),
    leader("vacmaster", target.vacmaster, materialized.vacmaster),
    leader("craftsman", target.craftsman, materialized.craftsman),
    leader("dewalt", "DEWALT DXV06P", true),
    leader("stanley", target.stanley, materialized.stanley),
    leader("shop vac", "Shop-Vac 5989305", true),
    leader("workshop", null, false),
  ];

  return [
    { path: "run1.json", identityResolution: { leaders: common() } },
    { path: "run2.json", identityResolution: { leaders: common() } },
    {
      path: "run3.json",
      identityResolution: {
        leaders: common({ ridgid: true, stanley: true }),
      },
    },
  ];
}

function ledger(overrides = {}) {
  return {
    dispatch: {
      attemptGuard: {
        maxAttempts: APPROVED_PROBE_BUDGET.maxPhysicalAttempts,
        reservedAttempts: APPROVED_PROBE_BUDGET.plannedPhysicalAttempts,
        tripped: false,
      },
      reconciliation: {
        balanced: true,
        cacheHits: 0,
        cacheMisses: APPROVED_PROBE_BUDGET.logicalSearches,
        fallbacks: 0,
        logicalSearches: APPROVED_PROBE_BUDGET.logicalSearches,
        physicalAttempts: APPROVED_PROBE_BUDGET.plannedPhysicalAttempts,
        retries: 0,
      },
      attempts: [],
      ...overrides,
    },
  };
}

function candidate({ name, url }) {
  return {
    id: `candidate-${name}`,
    name,
    brand: null,
    category: "shop vac",
    productUrl: url,
    imageUrl: null,
    retailer: new URL(url).hostname,
    price: 99,
    rating: 4.5,
    reviewCount: 100,
    availableColors: [],
    dimensions: {
      width: null,
      depth: null,
      height: null,
      unit: null,
    },
    keySpecs: [],
    evidenceSources: [
      {
        title: name,
        url,
        snippet: "",
        snippetProvenance: "source-derived",
      },
    ],
    requirementCheck: {
      exactMatch: false,
      passed: [],
      failed: [],
      unknown: [],
    },
  };
}

describe("C5 live resolution-feasibility probe", () => {
  it("refuses live execution without confirmation, a cold cache, and a clean tracked tree", () => {
    const valid = {
      apiKey: "test-key",
      cacheEntries: 0,
      confirmed: true,
      outputPath:
        "tests/fixtures/review-radar-live/__resolution-probe-guard-never-created__.json",
      trackedChanges: "",
    };

    assert.throws(
      () => assertApprovedLiveExecution({ ...valid, confirmed: false }),
      /Dry run only/,
    );
    assert.throws(
      () => assertApprovedLiveExecution({ ...valid, cacheEntries: 1 }),
      /cache must be cold/,
    );
    assert.throws(
      () => assertApprovedLiveExecution({ ...valid, trackedChanges: " M app.ts" }),
      /Tracked worktree must be clean/,
    );
    assert.doesNotThrow(() => assertApprovedLiveExecution(valid));
  });

  it("freezes four targets, eight exact queries, and the approved physical-attempt limits", () => {
    const plan = buildResolutionProbePlan(syntheticAnalyses());

    assert.deepEqual(APPROVED_PROBE_BUDGET, {
      logicalSearches: 8,
      plannedPhysicalAttempts: 8,
      maxPhysicalAttempts: 24,
    });
    assert.equal(plan.targets.length, 4);
    assert.equal(plan.queries.length, 8);
    assert.deepEqual(
      plan.runs.map((run) => run.baselineCovered),
      [2, 2, 4],
    );
    assert.deepEqual(plan.queries[0], {
      endpoint: "https://google.serper.dev/shopping",
      leader: "ridgid / nxt / wd / hd",
      query: "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
      requestBody: {
        gl: "us",
        hl: "en",
        num: 10,
        q: "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
      },
      targetName: "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
      vertical: "shopping",
    });
    assert.equal(plan.queries[1].vertical, "organic");
    assert.equal(
      plan.queries[1].query,
      "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200 product page",
    );
  });

  it("refuses a plan when a missing leader/run identity is not covered by a frozen target", () => {
    const analyses = syntheticAnalyses();
    analyses[0].identityResolution.leaders.find(
      (item) => item.leader === "vacmaster",
    ).qualifiedIdentityLeadNames = ["Vacmaster Unfrozen Identity"];

    assert.throws(
      () => buildResolutionProbePlan(analyses),
      /Frozen target does not cover vacmaster in run1\.json/,
    );
  });

  it("counts only candidates that survive prefilter and the repaired page trust boundary", () => {
    const target = FROZEN_RESOLUTION_TARGETS[0];
    const result = evaluateProbeTargetCandidates({
      candidates: [
        candidate({
          name: target.name,
          url: "https://www.homedepot.com/p/RIDGID-HD1200/222222",
        }),
        candidate({
          name: "Karcher 12 Gallon Wet Dry Shop Vacuum",
          url: "https://www.homedepot.com/p/Karcher-12-Gallon-Wet-Dry-Shop-Vacuum/111111",
        }),
      ],
      target,
    });

    assert.equal(result.resolved, true);
    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0].name, target.name);
    assert.equal(
      result.rejected.some(
        (item) =>
          item.name === "Karcher 12 Gallon Wet Dry Shop Vacuum" &&
          item.reason === "product_page_selector_rejected",
      ),
      true,
    );
  });

  it("passes only when valid resolutions raise the three-run mean to the frozen 5/7 floor", () => {
    const plan = buildResolutionProbePlan(syntheticAnalyses());
    const targetResults = FROZEN_RESOLUTION_TARGETS.map((target) => ({
      leader: target.leader,
      resolved: target.leader !== "vacmaster",
    }));
    const passing = scoreResolutionProbe({
      ledger: ledger(),
      plan,
      targetResults,
    });

    assert.deepEqual(
      passing.runs.map((run) => run.projectedCovered),
      [5, 5, 5],
    );
    assert.equal(passing.projectedMean, 5);
    assert.equal(passing.verdict, "probe_pass");

    const failing = scoreResolutionProbe({
      ledger: ledger(),
      plan,
      targetResults: targetResults.map((result) => ({
        ...result,
        resolved: ["ridgid / nxt / wd / hd", "stanley"].includes(result.leader),
      })),
    });
    assert.equal(failing.projectedMean, 4);
    assert.equal(failing.verdict, "probe_fail_below_5_of_7");
  });

  it("marks cache hits, ledger imbalance, request errors, or a tripped ceiling inconclusive", () => {
    const plan = buildResolutionProbePlan(syntheticAnalyses());
    const targetResults = FROZEN_RESOLUTION_TARGETS.map((target) => ({
      leader: target.leader,
      resolved: true,
    }));
    const invalidLedger = ledger({
      attemptGuard: {
        maxAttempts: 24,
        reservedAttempts: 24,
        tripped: true,
      },
      reconciliation: {
        balanced: false,
        cacheHits: 1,
        cacheMisses: 7,
        fallbacks: 0,
        logicalSearches: 8,
        physicalAttempts: 24,
        retries: 0,
      },
      attempts: [{ error: "request_error" }],
    });
    const result = scoreResolutionProbe({
      ledger: invalidLedger,
      plan,
      targetResults,
    });

    assert.equal(result.verdict, "probe_inconclusive");
    assert.deepEqual(result.invalidReasons, [
      "warm_cache",
      "ledger_unbalanced",
      "attempt_ceiling_tripped",
      "serper_request_error",
    ]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateReadinessAnalyses,
  analyzeReadinessFixture,
} from "../scripts/analyze-readiness-fixtures.mjs";

function candidate(overrides) {
  return {
    candidateId: overrides.candidateId,
    name: overrides.name,
    productUrl: overrides.productUrl || "",
    sourceIdentityPaths: overrides.sourceIdentityPaths || [],
    source: overrides.source,
    queryIds: overrides.queryIds || ["q-1"],
    normalized: overrides.normalized,
    prefilterAccepted: overrides.prefilterAccepted ?? null,
    mergedIntoCandidateId: overrides.mergedIntoCandidateId || null,
    firstLoss: overrides.firstLoss || null,
    normalizationRecovery: overrides.normalizationRecovery || null,
    normalizationCounterfactual: overrides.normalizationCounterfactual || null,
    selected: false,
  };
}

function fixture() {
  return {
    _query: "shop vac",
    _request: { query: "shop vac" },
    result: { exactMatches: [], nearMatches: [] },
    debug: {
      seedSearchesRun: 0,
      stageFunnel: {
        searchLedger: {
          header: { serperCacheEmptyAtStart: true },
          planAssembly: [
            { id: "q-1", purpose: "product_discovery" },
            { id: "q-2", purpose: "source_upgrade" },
          ],
          dispatch: {
            attempts: [
              {
                queryId: "q-1",
                finalOutboundQuery: "shop vac",
                results: [
                  { title: "RIDGID WD4070 Wet/Dry Vacuum" },
                  { title: "Shop-Vac 8 Gallon Wet/Dry Vacuum" },
                ],
              },
              {
                queryId: "q-2",
                finalOutboundQuery: "RIDGID WD4070",
                results: [{ title: "RIDGID WD4070 Wet/Dry Vacuum" }],
              },
            ],
            reconciliation: {
              logicalSearches: 2,
              cacheHits: 0,
              cacheMisses: 2,
              physicalAttempts: 2,
              retries: 0,
              fallbacks: 0,
              balanced: true,
            },
          },
          candidateLineage: {
            candidates: [
              candidate({
                candidateId: "raw-q-1-01",
                name: "RIDGID WD4070 Wet/Dry Vacuum",
                source: "raw_serper_result",
                normalized: false,
                firstLoss: {
                  stage: "lost_in_normalization",
                  subreason: "search_or_listing_url",
                },
                normalizationRecovery: {
                  mode: "shadow",
                  outcome: "would_recover",
                  originalRejectionReason: "search_or_listing_url",
                  originalUrl: "https://www.google.com/search?q=ridgid+wd4070",
                  proposedUrl: "https://shop.example.com/products/ridgid-wd4070",
                  blocker: null,
                },
                normalizationCounterfactual: {
                  runtimeMode: "flag_off",
                  runtimeMatchesSelected: true,
                  delta: "added",
                  flagOff: {
                    normalizedCandidateId: null,
                    productUrl: "",
                    rejectionReason: "search_or_listing_url",
                  },
                  flagOn: {
                    normalizedCandidateId: "serper-ridgid-wd4070",
                    productUrl: "https://shop.example.com/products/ridgid-wd4070",
                    rejectionReason: null,
                  },
                },
              }),
              candidate({
                candidateId: "serper-shop-vac",
                name: "Shop-Vac 8 Gallon Wet/Dry Vacuum",
                source: "serper",
                normalized: true,
                prefilterAccepted: true,
                firstLoss: {
                  stage: "candidate_merge",
                  subreason: "not_present_after_ai_serper_candidate_merge",
                },
              }),
              candidate({
                candidateId: "serper-source-upgrade-ridgid",
                name: "RIDGID WD4070 Wet/Dry Vacuum",
                source: "serper",
                queryIds: ["q-2"],
                normalized: true,
                prefilterAccepted: true,
              }),
            ],
          },
        },
      },
    },
  };
}

describe("R7 readiness fixture analyzer", () => {
  it("separates raw, normalized, prefilter, and post-merge presence", () => {
    const analysis = analyzeReadinessFixture(fixture());
    const shopVac = analysis.current07c.leaders.find(
      (leader) => leader.leader === "shop vac",
    );

    assert.equal(shopVac.rawPresence, true);
    assert.equal(shopVac.normalizedPresence, true);
    assert.equal(shopVac.rawDedupeSurvival, true);
    assert.equal(shopVac.prefilterSurvival, true);
    assert.equal(shopVac.preAiPoolPresence, true);
    assert.equal(shopVac.postMergePresence, false);
    assert.equal(shopVac.terminalStage, "lost_in_ai_serper_merge");
  });

  it("excludes later source-upgrade candidates from the discovery pool", () => {
    const analysis = analyzeReadinessFixture(fixture());
    const historicalRidgid = analysis.historical07b.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );
    const currentRidgid = analysis.current07c.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );

    assert.equal(historicalRidgid.rawPresence, false);
    assert.equal(currentRidgid.rawPresence, true);
    assert.equal(currentRidgid.normalizedPresence, false);
    assert.equal(currentRidgid.preAiPoolPresence, false);
    assert.deepEqual(currentRidgid.terminalReasons, [
      {
        reason: "lost_in_normalization:search_or_listing_url",
        count: 1,
      },
    ]);
    assert.equal(historicalRidgid.normalizationRecoveryOpportunity, false);
    assert.equal(currentRidgid.normalizationRecoveryOpportunity, true);
    assert.deepEqual(currentRidgid.normalizationRecoveryNames, [
      "RIDGID WD4070 Wet/Dry Vacuum",
    ]);
  });

  it("states the candidate-merge inflation caveat in aggregate output", () => {
    const analysis = analyzeReadinessFixture(fixture());
    const aggregate = aggregateReadinessAnalyses([analysis]);

    assert.match(aggregate.contract.preAiPool, /candidate_merge still counts/);
    assert.match(aggregate.contract.caveat, /inflated by URL\/name lineage/);
    assert.equal(aggregate.normalizationRecovery.observedRuns, 1);
    assert.equal(
      aggregate.normalizationRecovery.current07cUniqueLeaderRunOpportunities,
      1,
    );
    assert.equal(aggregate.normalizationCounterfactual.observedRuns, 1);
    assert.equal(aggregate.normalizationCounterfactual.parityViolations, 0);
    assert.equal(aggregate.broadFlagOnNormalizedMean, 2);
    assert.equal(aggregate.broadFlagOffNormalizedMean, 1);
  });

  it("credits brand evidence from source paths without changing title-only reporting", () => {
    const input = fixture();
    const rawRidgid =
      input.debug.stageFunnel.searchLedger.candidateLineage.candidates[0];
    rawRidgid.name = "14 Gallon 6 Peak HP NXT Wet Dry Vacuum HD1400";
    rawRidgid.sourceIdentityPaths = [
      "/search",
      "/p/RIDGID-14-Gallon-NXT-Wet-Dry-Vacuum-HD1400/123456789",
    ];
    rawRidgid.normalizationCounterfactual.flagOn.productUrl =
      "https://merchant.example/p/RIDGID-14-Gallon-NXT-Wet-Dry-Vacuum-HD1400/123456789";
    input.debug.stageFunnel.searchLedger.dispatch.attempts[0].results =
      input.debug.stageFunnel.searchLedger.dispatch.attempts[0].results.filter(
        (result) => !result.title.startsWith("RIDGID"),
      );
    input.debug.stageFunnel.searchLedger.dispatch.attempts[0].results.push({
      title: "14 Gallon 6 Peak HP NXT Wet Dry Vacuum HD1400",
      urlPaths: [
        "/search",
        "/p/RIDGID-14-Gallon-NXT-Wet-Dry-Vacuum-HD1400/123456789",
      ],
    });

    const analysis = analyzeReadinessFixture(input);
    const historicalRidgid = analysis.historical07b.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );
    const currentRidgid = analysis.current07c.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );

    assert.equal(historicalRidgid.rawPresence, false);
    assert.equal(currentRidgid.rawTitlePresence, false);
    assert.equal(currentRidgid.rawPresence, true);
    assert.equal(historicalRidgid.flagOnNormalizedPresence, false);
    assert.equal(currentRidgid.flagOnNormalizedPresence, true);
    assert.deepEqual(currentRidgid.sourceEvidenceOnlyRawNames, [
      "14 Gallon 6 Peak HP NXT Wet Dry Vacuum HD1400",
    ]);
  });

  it("pins the exact C4 request bytes including the literal dollar budget", () => {
    const input = fixture();
    input._request = {
      query: "robot vacuum",
      budget: "under $300",
      priorities: "self-emptying",
    };
    assert.equal(analyzeReadinessFixture(input).requestContract.valid, true);

    input._request.budget = "under ";
    assert.equal(analyzeReadinessFixture(input).requestContract.valid, false);

    input._request = { query: "shop vac" };
    input._c4Shape = "constrained";
    assert.equal(analyzeReadinessFixture(input).requestContract.valid, false);
  });

  it("excludes spent-invalid runs from quality metrics while retaining their cost", () => {
    const analysis = analyzeReadinessFixture(fixture());
    analysis.sampleValidity = { usable: false, reasons: ["warm_serper_cache"] };

    const aggregate = aggregateReadinessAnalyses([analysis]);
    assert.deepEqual(aggregate.sampleCounts, {
      dispatched: 1,
      usable: 0,
      broadUsable: 0,
      constrainedUsable: 0,
    });
    assert.equal(aggregate.broadCurrent07cMean, null);
    assert.equal(aggregate.cost.physicalAttempts, 2);
    assert.equal(aggregate.cost.includesSpentExcludedRuns, true);
  });
});

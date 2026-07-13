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
    source: overrides.source,
    queryIds: overrides.queryIds || ["q-1"],
    normalized: overrides.normalized,
    prefilterAccepted: overrides.prefilterAccepted ?? null,
    mergedIntoCandidateId: overrides.mergedIntoCandidateId || null,
    firstLoss: overrides.firstLoss || null,
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
    const shopVac = analysis.current07b.leaders.find(
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
    const currentRidgid = analysis.current07b.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );
    const prospectiveRidgid = analysis.prospective07c.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );

    assert.equal(currentRidgid.rawPresence, false);
    assert.equal(prospectiveRidgid.rawPresence, true);
    assert.equal(prospectiveRidgid.normalizedPresence, false);
    assert.equal(prospectiveRidgid.preAiPoolPresence, false);
    assert.deepEqual(prospectiveRidgid.terminalReasons, [
      {
        reason: "lost_in_normalization:search_or_listing_url",
        count: 1,
      },
    ]);
  });

  it("states the candidate-merge inflation caveat in aggregate output", () => {
    const analysis = analyzeReadinessFixture(fixture());
    const aggregate = aggregateReadinessAnalyses([analysis]);

    assert.match(aggregate.contract.preAiPool, /candidate_merge still counts/);
    assert.match(aggregate.contract.caveat, /inflated by URL\/name lineage/);
  });
});

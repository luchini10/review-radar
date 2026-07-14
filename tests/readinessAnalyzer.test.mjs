import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateReadinessAnalyses,
  analyzeProductPageResolutionCandidate,
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
    finalOutcome: overrides.finalOutcome || "neither",
    selected: overrides.selected || false,
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
    assert.equal(
      aggregate.canonicalProviderDiscovery.metric,
      "identityResolution.recall.identityLeadUpperBound",
    );
    assert.match(
      aggregate.canonicalProviderDiscovery.supersedes,
      /path-supplemented raw presence/i,
    );
    assert.equal(aggregate.canonicalProviderDiscovery.broadMean, 1);
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

  it("detects wrong-type evidence in a final card's full metadata when its display title is truncated", () => {
    const input = fixture();
    input._request = {
      query: "robot vacuum",
      budget: "under $300",
      priorities: "self-emptying",
    };
    input._c4Shape = "constrained";
    input.result.nearMatches = [
      {
        name: "Shark PowerPro Bagless Cordless HEPA Filter Portable ...",
        metadata: {
          title: {
            value:
              "Shark PowerPro Bagless Cordless HEPA Filter Portable Stick Vacuum Cleaner IZ372HD",
          },
        },
        pros: ["Listing details: lightweight cordless floor cleaning."],
      },
    ];

    const analysis = analyzeReadinessFixture(input);

    assert.deepEqual(analysis.wrongTypeFinalCards, [
      "Shark PowerPro Bagless Cordless HEPA Filter Portable ...",
    ]);
  });

  it("keeps provider identity leads non-renderable until a strict matching product page is captured", () => {
    const input = fixture();
    const rawRidgid =
      input.debug.stageFunnel.searchLedger.candidateLineage.candidates[0];
    rawRidgid.name = "RIDGID 12 Gallon NXT Wet/Dry Shop Vacuum";
    rawRidgid.normalizationRecovery.originalUrl =
      "https://www.google.com/search?ibp=oshop&udm=28&prds=catalogid:12345,localAnnotatedOfferId:67890";
    input.debug.stageFunnel.searchLedger.candidateLineage.candidates.push(
      candidate({
        candidateId: "raw-q-1-04",
        name: "Shop-Vac 8 Gallon Wet/Dry Vacuum SV5430116",
        source: "raw_serper_result",
        normalized: false,
        firstLoss: {
          stage: "lost_in_normalization",
          subreason: "search_or_listing_url",
        },
        normalizationRecovery: {
          mode: "enabled",
          outcome: "blocked",
          originalRejectionReason: "search_or_listing_url",
          originalUrl:
            "https://www.google.com/search?ibp=oshop&udm=28&prds=localAnnotatedOfferId:67890,catalogid:54321",
          proposedUrl: null,
          blocker: "no_serper_supplied_merchant_url",
        },
      }),
    );
    input.debug.stageFunnel.searchLedger.dispatch.attempts[1].results = [
      {
        title: "Karcher 12 Gallon NXT Wet Dry Shop Vacuum",
        host: "homedepot.com",
        urlPaths: ["/p/Karcher-12-Gallon-NXT-Wet-Dry-Shop-Vacuum/111111"],
      },
      {
        title: "RIDGID 12 Gallon NXT Wet/Dry Shop Vacuum",
        host: "homedepot.com",
        urlPaths: ["/p/RIDGID-12-Gallon-NXT-Wet-Dry-Shop-Vacuum/222222"],
      },
    ];

    const analysis = analyzeReadinessFixture(input);
    const ridgid = analysis.identityResolution.leaders.find((leader) =>
      leader.leader.startsWith("ridgid"),
    );

    assert.equal(ridgid.qualifiedIdentityLeadPresence, true);
    assert.equal(analysis.identityResolution.qualifiedProviderIdentityCount, 2);
    assert.equal(ridgid.capturedDiscoveryResolutionPresence, false);
    assert.equal(
      ridgid.capturedAnyStageResolutionPresence,
      true,
      JSON.stringify(ridgid, null, 2),
    );
    assert.equal(ridgid.capturedMaterializedPresence, true);
    assert.deepEqual(ridgid.capturedSafePageUrls, [
      "https://homedepot.com/p/RIDGID-12-Gallon-NXT-Wet-Dry-Shop-Vacuum/222222",
    ]);
    assert.equal(
      analysis.identityResolution
        .existingSelectorPotentialIdentityGapLeadCount,
      0,
    );
    assert.match(
      analysis.identityResolution.contract.safeResolution,
      /exact-model equality remains diagnostic/i,
    );
  });

  it("RR-087 rejects a structured shopping accessory at the canonical type gate", () => {
    const input = fixture();
    input.debug.stageFunnel.searchLedger.dispatch.attempts[0].results.push({
      title: "WORKSHOP Wet/Dry Vacs Blower Nozzle Vacuum Attachment WS25006A",
      host: "google.com",
      urlPaths: ["/search", "/shopping"],
    });
    input.debug.stageFunnel.searchLedger.candidateLineage.candidates.push(
      candidate({
        candidateId: "raw-q-1-03",
        name: "WORKSHOP Wet/Dry Vacs Blower Nozzle Vacuum Attachment WS25006A",
        source: "raw_serper_result",
        normalized: false,
        firstLoss: {
          stage: "lost_in_normalization",
          subreason: "search_or_listing_url",
        },
        normalizationRecovery: {
          mode: "enabled",
          outcome: "blocked",
          originalRejectionReason: "search_or_listing_url",
          originalUrl:
            "https://www.google.com/search?ibp=oshop&udm=28&prds=catalogid:98765,localAnnotatedOfferId:43210",
          proposedUrl: null,
          blocker: "no_serper_supplied_merchant_url",
        },
      }),
    );

    const analysis = analyzeReadinessFixture(input);
    const workshop = analysis.identityResolution.leaders.find(
      (leader) => leader.leader === "workshop",
    );

    assert.equal(workshop.qualifiedIdentityLeadPresence, false);
    assert.equal(workshop.riskyIdentityLeadPresence, false);
    assert.deepEqual(workshop.riskyIdentityLeadNames, []);
    assert.deepEqual(
      analysis.identityResolution.existingTypeGateComplementGapNames,
      [],
    );
  });

  it("RR-085 keeps another product's Workshop path out of canonical provider identity coverage", () => {
    const input = fixture();
    input.debug.stageFunnel.searchLedger.dispatch.attempts[0].results.push({
      title: "DEWALT 12 Gallon Poly Wet/Dry Vac DXV12P",
      urlPaths: [
        "/DEWALT-Workshop-Commercial-Capacity-DXV12P/dp/B07BYGDFKB",
      ],
    });
    input.debug.stageFunnel.searchLedger.candidateLineage.candidates.push(
      candidate({
        candidateId: "raw-q-1-05",
        name: "DEWALT 12 Gallon Poly Wet/Dry Vac DXV12P",
        source: "raw_serper_result",
        normalized: false,
        sourceIdentityPaths: [
          "/DEWALT-Workshop-Commercial-Capacity-DXV12P/dp/B07BYGDFKB",
        ],
        firstLoss: {
          stage: "lost_in_normalization",
          subreason: "search_or_listing_url",
        },
        normalizationRecovery: {
          mode: "enabled",
          outcome: "blocked",
          originalRejectionReason: "search_or_listing_url",
          originalUrl:
            "https://www.google.com/search?ibp=oshop&udm=28&prds=catalogid:24680,localAnnotatedOfferId:13579",
          proposedUrl: null,
          blocker: "no_serper_supplied_merchant_url",
        },
      }),
    );

    const analysis = analyzeReadinessFixture(input);
    const historicalWorkshop = analysis.current07c.leaders.find(
      (leader) => leader.leader === "workshop",
    );
    const canonicalWorkshop = analysis.identityResolution.leaders.find(
      (leader) => leader.leader === "workshop",
    );

    assert.equal(historicalWorkshop.rawPresence, true);
    assert.equal(canonicalWorkshop.qualifiedIdentityLeadPresence, false);
    assert.equal(canonicalWorkshop.identityLeadUpperBoundPresence, false);
  });

  it("RR-086 rejects a wrong-brand page at the current selector seam", () => {
    const result = analyzeProductPageResolutionCandidate({
      category: "shop vac",
      leadName: "RIDGID 12 Gallon Wet/Dry Shop Vacuum",
      pageTitle: "Karcher 12 Gallon Wet Dry Shop Vacuum",
      pageUrl:
        "https://homedepot.com/p/Karcher-12-Gallon-Wet-Dry-Shop-Vacuum/111111",
    });

    assert.equal(result.existingSelectorAccepted, false);
    assert.equal(result.strictResolutionAccepted, false);
    assert.equal(result.rejectionReason, "product_page_selector_rejected");
  });

  it("keeps C5 blocked when the identity ceiling passes but captured safe resolution and selector safety do not", () => {
    const analysis = analyzeReadinessFixture(fixture());
    analysis.identityResolution.recall.identityLeadUpperBound.covered = 6;
    analysis.identityResolution.recall.capturedMaterialized.covered = 2;
    analysis.identityResolution.existingSelectorPotentialIdentityGapLeadCount = 1;

    const aggregate = aggregateReadinessAnalyses([
      structuredClone(analysis),
      structuredClone(analysis),
      structuredClone(analysis),
    ]);

    assert.equal(aggregate.c5Decision.identityLeadUpperBoundMean, 6);
    assert.equal(aggregate.c5Decision.capturedMaterializedMean, 2);
    assert.equal(aggregate.c5Decision.target, 5);
    assert.equal(
      aggregate.c5Decision.verdict,
      "repair_product_page_identity_before_resolution_probe",
    );
  });

  it("pins the C5 live contract and attributes identity-resolution contribution", () => {
    const input = fixture();
    const ledger = input.debug.stageFunnel.searchLedger;
    input._c4Shape = "broad";
    input._validationPhase = "c5";
    input._sampleStatus = "usable";
    input._exclusionReasons = [];
    input._captureDurationMs = 81234;
    ledger.header = {
      commitHash: "abc1234",
      flags: {
        REVIEW_RADAR_CONSTRAINT_ALLOCATION: "on",
        REVIEW_RADAR_MAX_SERPER_ATTEMPTS: "120",
        REVIEW_RADAR_NORMALIZATION_RECOVERY: "off",
        REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION: "on",
        REVIEW_RADAR_PINNED_PLANNING: "unset",
      },
      serperCacheEmptyAtStart: true,
    };
    ledger.planAssembly.push({
      id: "q-3",
      origin: "identity_resolution",
      phase: "bounded_organic_identity_resolution",
      purpose: "product_discovery",
      originalQuery: "RIDGID HD1200 product page",
      status: "dispatched",
    });
    ledger.dispatch.attempts.push({
      queryId: "q-3",
      durationMs: 250,
      finalOutboundQuery: "RIDGID HD1200 product page",
      results: [],
    });
    ledger.dispatch.reconciliation = {
      logicalSearches: 3,
      cacheHits: 0,
      cacheMisses: 3,
      physicalAttempts: 3,
      retries: 0,
      fallbacks: 0,
      balanced: true,
    };
    ledger.dispatch.attemptGuard = {
      maxAttempts: 120,
      reservedAttempts: 3,
      tripped: false,
    };
    ledger.candidateLineage.candidates.push(
      candidate({
        candidateId: "serper-ridgid-hd1200",
        finalOutcome: "exact",
        name: "RIDGID HD1200 Wet Dry Shop Vacuum",
        normalized: true,
        prefilterAccepted: true,
        productUrl: "https://example.com/p/ridgid-hd1200",
        queryIds: ["q-3"],
        selected: true,
        source: "serper",
      }),
    );
    ledger.contributions = {
      byOrigin: [
        {
          origin: "identity_resolution",
          queries: 1,
          rawResults: 1,
          normalizedCandidates: 1,
          uniqueCandidates: 1,
          citationValid: 1,
          requirementValid: 1,
          revalidated: 1,
          exactSelections: 1,
          nearSelections: 0,
        },
      ],
    };

    const analysis = analyzeReadinessFixture(input);
    const aggregate = aggregateReadinessAnalyses([analysis]);

    assert.equal(analysis.sampleValidity.usable, true);
    assert.equal(analysis.validationPhase, "c5");
    assert.deepEqual(
      analysis.c5RuntimeContribution.identityResolution.outboundQueries,
      ["RIDGID HD1200 product page"],
    );
    assert.equal(
      analysis.c5RuntimeContribution.identityResolution.contribution.finalSelections,
      1,
    );
    assert.equal(aggregate.sampleContract.allUsableRunsShareCommit, true);
    assert.equal(aggregate.cost.meanRequestDurationMs, 81234);
    assert.equal(aggregate.c5RuntimeContribution.identityResolution.dispatchedQueries, 1);

    input.debug.stageFunnel.searchLedger.header.flags.REVIEW_RADAR_NORMALIZATION_RECOVERY =
      "on";
    const invalid = analyzeReadinessFixture(input);
    assert.equal(invalid.sampleValidity.usable, false);
    assert.ok(
      invalid.sampleValidity.reasons.includes("normalization_recovery_not_off"),
    );
  });
});

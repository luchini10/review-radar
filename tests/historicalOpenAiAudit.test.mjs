import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateHistoricalOpenAiContributions,
  analyzeHistoricalOpenAiContributionFixture,
} from "../scripts/analyze-readiness-fixtures.mjs";

function fixture({ includeAi = true, budget } = {}) {
  return {
    _request: { query: "shop vac", ...(budget ? { budget } : {}) },
    result: {
      exactMatches: [
        {
          name: "RIDGID HD1200 NXT Wet Dry Vacuum",
          priceTrust: { price: 109 },
        },
      ],
      nearMatches: [],
    },
    debug: {
      stageFunnel: {
        searchLedger: {
          candidateLineage: {
            candidates: includeAi
              ? [
                  {
                    name: "RIDGID HD1200 NXT Wet Dry Vacuum",
                    productUrl: "https://example.com/products/ridgid-hd1200",
                    source: "final_openai_research",
                    selected: true,
                    firstLoss: null,
                  },
                  {
                    name: "DEWALT 12 Gallon Wet Dry Vacuum",
                    productUrl: "https://example.com/search?q=dewalt",
                    source: "final_openai_research",
                    selected: false,
                    firstLoss: {
                      stage: "citation_verification",
                      subreason: "no_verified_citation",
                    },
                  },
                ]
              : [],
          },
        },
      },
    },
  };
}

describe("OAI-1 historical OpenAI-row audit", () => {
  it("scores only explicit lineage and labels the old prompt contamination", () => {
    const analysis = analyzeHistoricalOpenAiContributionFixture(
      fixture(),
      "saved.json",
    );

    assert.equal(analysis.aiCandidateCount, 2);
    assert.equal(analysis.selectedCount, 1);
    assert.equal(analysis.selectedWithObservedPriceCount, 1);
    assert.equal(analysis.rawLeaderCoverage.covered, 2);
    assert.equal(analysis.selectedLeaderCoverage.covered, 1);
    assert.equal(analysis.contamination.autonomousArchitectureTested, false);
    assert.equal(analysis.contamination.modelReceivedAppGeneratedQueries, true);
    assert.equal(analysis.contamination.modelReceivedSerperCandidates, true);
    assert.match(analysis.safetySignals.contract, /signals/);
  });

  it("does not infer contribution when lineage is absent", () => {
    assert.equal(
      analyzeHistoricalOpenAiContributionFixture(fixture({ includeAi: false })),
      null,
    );
  });

  it("retains malformed spent evidence but excludes it from coverage means", () => {
    const usable = analyzeHistoricalOpenAiContributionFixture(
      fixture(),
      "usable.json",
    );
    const excluded = analyzeHistoricalOpenAiContributionFixture(
      fixture({ budget: "under " }),
      "spent-excluded.json",
    );
    const aggregate = aggregateHistoricalOpenAiContributions([
      usable,
      excluded,
      null,
    ]);

    assert.deepEqual(aggregate.fixtureCounts, {
      inventory: 3,
      explicitOpenAiLineage: 2,
      usableHistorical: 1,
      excludedHistorical: 1,
    });
    assert.equal(aggregate.candidateCounts.rows, 4);
    assert.equal(aggregate.leaderCoverage.rawMean, 2);
    assert.match(aggregate.contract.limitation, /cannot pass or fail/);
    assert.deepEqual(aggregate.exclusions[0].reasons.sort(), [
      "malformed_budget",
      "spent_excluded_fixture",
    ]);
  });
});

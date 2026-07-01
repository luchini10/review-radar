// Deterministic replay fixture tests — zero Serper/OpenAI calls.
// Loads the synthetic robot-vacuum fixture and asserts the analysis engine produces
// correct output for stage funnel, citation strength, thin-winner detection, and
// lost-leader tracking.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { analyzeFixture } from "../scripts/replay-quality-fixtures.mjs";

const FIXTURE = JSON.parse(
  readFileSync("tests/fixtures/robot-vacuum-synthetic.json", "utf8"),
);

const analysis = analyzeFixture(FIXTURE);

describe("analyzeFixture — synthetic robot vacuum fixture", () => {
  it("reads query and gold leaders from fixture metadata", () => {
    assert.equal(analysis.query, "best robot vacuum");
    assert.deepEqual(analysis.goldLeaders, [
      "Roborock S8 Pro Ultra",
      "iRobot Roomba j7+",
      "Shark Matrix RV2502WD",
    ]);
    assert.equal(analysis.isSynthetic, true);
  });

  it("reports 7 candidates in the pool", () => {
    assert.equal(analysis.poolCandidates, 7);
  });

  it("produces 8 stage entries (candidatePool through final)", () => {
    assert.equal(analysis.stageFunnelAnalysis.length, 8);
    const stageNames = analysis.stageFunnelAnalysis.map((s) => s.stage);
    assert.ok(stageNames.includes("candidatePool"));
    assert.ok(stageNames.includes("afterCitationVerify"));
    assert.ok(stageNames.includes("afterRescue"));
    assert.ok(stageNames.includes("final"));
  });

  it("shows citation verify as the major drop stage (5 dropped)", () => {
    const s = analysis.stageFunnelAnalysis.find((s) => s.stage === "afterCitationVerify");
    assert.ok(s, "afterCitationVerify stage present");
    assert.equal(s.dropped.length, 5, "5 candidates dropped at citation verify");
    assert.ok(s.dropped.includes("Shark Matrix RV2502WD"), "Shark Matrix dropped at citation verify");
    assert.ok(s.dropped.includes("Roborock S8 Pro Ultra"), "Roborock dropped at citation verify (rescued later)");
    assert.equal(s.count, 2, "2 candidates survived citation verify");
  });

  it("shows rescue adding 2 products back at afterRescue", () => {
    const s = analysis.stageFunnelAnalysis.find((s) => s.stage === "afterRescue");
    assert.ok(s, "afterRescue stage present");
    assert.equal(s.added.length, 2, "2 candidates rescued");
    assert.ok(s.added.includes("Roborock S8 Pro Ultra"), "Roborock rescued");
    assert.ok(s.added.includes("iRobot Roomba j7+"), "Roomba j7+ rescued");
    assert.equal(s.dropped.length, 0, "no drops at rescue stage");
  });

  it("reports 4 final exact matches", () => {
    assert.equal(analysis.finalProducts.length, 4);
  });

  it("identifies #1 as SELF-ONLY (rescued product)", () => {
    const winner = analysis.finalProducts[0];
    assert.equal(winner.name, "Roborock S8 Pro Ultra");
    assert.equal(winner.citStrength, "SELF-ONLY");
    assert.equal(winner.priceVerified, true);
  });

  it("classifies #3 as INDEPENDENT (editorial-cited)", () => {
    const roombaI7 = analysis.finalProducts.find((p) => p.name === "iRobot Roomba i7+");
    assert.ok(roombaI7, "iRobot Roomba i7+ present in final");
    assert.equal(roombaI7.citStrength, "INDEPENDENT");
    assert.ok(roombaI7.citSummary.includes("editorial"), "summary mentions editorial");
    assert.ok(roombaI7.citSummary.includes("retailer"), "summary mentions retailer");
  });

  it("classifies #4 as RETAILER (marketplace-only citation)", () => {
    const eufy = analysis.finalProducts.find((p) => p.name === "Eufy RoboVac X9 Pro");
    assert.ok(eufy, "Eufy present in final");
    assert.equal(eufy.citStrength, "RETAILER");
  });

  it("flags thinWinner=true and weakWinner=false for SELF-ONLY #1 with verified price", () => {
    assert.equal(analysis.citationAnalysis.thinWinner, true);
    assert.equal(analysis.citationAnalysis.weakWinner, false);
  });

  it("identifies the INDEPENDENT candidate ranked below the thin winner", () => {
    const better = analysis.citationAnalysis.betterSupportedBelowWinner;
    assert.equal(better.length, 1, "exactly 1 independently-cited candidate below winner");
    assert.equal(better[0].name, "iRobot Roomba i7+");
    assert.equal(better[0].citStrength, "INDEPENDENT");
  });

  it("reports Shark Matrix as the only lost leader", () => {
    assert.equal(analysis.lostLeaders.length, 1);
    assert.ok(analysis.lostLeaders.includes("Shark Matrix RV2502WD"));
    assert.ok(!analysis.lostLeaders.includes("Roborock S8 Pro Ultra"), "Roborock in final");
    assert.ok(!analysis.lostLeaders.includes("iRobot Roomba j7+"), "Roomba j7+ in final");
  });

  it("maps Shark Matrix drop point to afterCitationVerify", () => {
    const dp = analysis.lostLeaderDropPoints["Shark Matrix RV2502WD"];
    assert.ok(dp, "drop point present");
    assert.ok(dp.includes("dropped"), `expected 'dropped' in drop point, got: ${dp}`);
    assert.ok(dp.includes("afterCitationVerify"), `expected afterCitationVerify, got: ${dp}`);
  });

  it("maps Roborock to final (rescued → survived)", () => {
    assert.equal(analysis.dropMap["Roborock S8 Pro Ultra"], "final");
  });

  it("accepts old source-upgrade traces without Phase 3M diagnostic fields", () => {
    const oldFixture = {
      _query: "gas grill",
      result: { exactMatches: [], nearMatches: [] },
      debug: {
        stageFunnel: {
          stages: [],
          sourceUpgradeTraces: [
            {
              name: "Weber Spirit E-325",
              query: "Weber Spirit E-325 gas grill",
              evidenceAttached: false,
              attachedFields: [],
            },
          ],
        },
      },
    };

    const oldAnalysis = analyzeFixture(oldFixture);

    assert.equal(oldAnalysis.sourceUpgradeTraces.length, 1);
    assert.equal(
      oldAnalysis.sourceUpgradeTraces[0].primarySearchDiagnostics,
      undefined,
    );
    assert.equal(oldAnalysis.sourceUpgradeDecisions, null);
  });

  it("preserves source-upgrade trigger decisions for replay diagnostics", () => {
    const sourceUpgradeDecisions = [
      {
        missingEvidence: ["verified_price", "owner_rating"],
        modelTokens: ["e325"],
        name: "Weber Spirit E-325",
        reason: "selected_for_upgrade",
        selected: true,
        shouldUpgrade: true,
      },
      {
        missingEvidence: ["product_specific_commerce_evidence"],
        modelTokens: ["hd0900"],
        name: "RIDGID HD0900",
        reason: "sufficient_evidence",
        selected: false,
        shouldUpgrade: false,
      },
    ];
    const fixture = {
      _query: "shop vac",
      result: { exactMatches: [], nearMatches: [] },
      debug: {
        stageFunnel: {
          sourceUpgradeDecisions,
          sourceUpgradeTraces: [],
          stages: [],
        },
      },
    };

    const fixtureAnalysis = analyzeFixture(fixture);

    assert.deepEqual(
      fixtureAnalysis.sourceUpgradeDecisions,
      sourceUpgradeDecisions,
    );
  });

  it("preserves current fallback-path diagnostics while old fixtures remain compatible", () => {
    const fallbackTrace = {
      reason: "ai_research_error",
      source: "serper_candidates",
      stagesBypassed: [
        {
          stage: "source_quality_upgrade",
          reason: "fallback_path_does_not_run_source_upgrade",
        },
      ],
    };
    const fixture = {
      _query: "microwave",
      result: { exactMatches: [], nearMatches: [] },
      debug: {
        fallbackTrace,
        stageFunnel: {
          path: "search_candidate_fallback",
          stages: [
            { stage: "candidatePool", names: ["Example Microwave"] },
            { stage: "final", names: ["Example Microwave"] },
          ],
          sourceUpgradeDecisions: [],
          sourceUpgradeTraces: [],
          finalSelectionTrace: [],
        },
      },
    };

    const analysis = analyzeFixture(fixture);

    assert.deepEqual(analysis.fallbackTrace, fallbackTrace);
    assert.equal(analysis.stageFunnelAnalysis.length, 2);

    const oldAnalysis = analyzeFixture({
      _query: "microwave",
      result: { exactMatches: [], nearMatches: [] },
    });
    assert.equal(oldAnalysis.fallbackTrace, null);
  });
});

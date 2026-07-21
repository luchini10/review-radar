import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_EVAL_CASES,
  identityKey,
  parseRankedProducts,
  scoreDirectTerraCaseStability,
  scoreDirectTerraRun,
} from "../lib/directTerraEvaluation.ts";
import { GOLD, coversLeader } from "../scripts/goldBenchmark.mjs";

function goldById(id) {
  const entry = GOLD.find((g) => g.id === id);
  if (!entry) throw new Error(`Missing GOLD entry ${id}`);
  return entry;
}

describe("direct-Terra eval case contract", () => {
  it("every frozen case maps to a real GOLD entry and sends no leader names", () => {
    for (const evalCase of DIRECT_TERRA_EVAL_CASES) {
      const gold = goldById(evalCase.goldId);
      assert.ok(gold, `case ${evalCase.id} must map to a GOLD entry`);
      // The request text sent to Terra must not leak any core-leader brand.
      const requestText = JSON.stringify(evalCase.request).toLowerCase();
      for (const leader of gold.coreLeaders) {
        assert.ok(
          !requestText.includes(leader.brand.toLowerCase()),
          `case ${evalCase.id} request leaks leader brand ${leader.brand}`,
        );
      }
    }
  });

  it("covers one broad and three constrained cases across four categories", () => {
    const kinds = DIRECT_TERRA_EVAL_CASES.map((c) => c.kind);
    assert.equal(kinds.filter((k) => k === "broad").length, 1);
    assert.equal(kinds.filter((k) => k === "constrained").length, 3);
    assert.equal(new Set(DIRECT_TERRA_EVAL_CASES.map((c) => c.goldId)).size, 4);
    // No shop-vac (the overfit anchor); T7B/T6D already give shop-vac data.
    assert.ok(
      DIRECT_TERRA_EVAL_CASES.every((c) => !c.request.query.includes("shop vac")),
    );
  });
});

describe("ranked-product parsing", () => {
  const report = [
    "# Shop Vac Buying Guide",
    "Intro prose.",
    "## #1 Best Match — RIDGID HD1200 NXT Wet/Dry Vac",
    "It is powerful. self-emptying not applicable.",
    "### Sources",
    "- [Home Depot](https://homedepot.com/p/1)",
    "## #2 Best Match — DEWALT DXV12P Quiet Vac",
    "Quiet and brushless motor.",
    "## Close matches",
    "- Something else",
    "## What to avoid",
  ].join("\n");

  it("extracts ranked products and bounds each section at the next ## heading", () => {
    const products = parseRankedProducts(report);
    assert.equal(products.length, 2);
    assert.equal(products[0].rank, 1);
    assert.match(products[0].name, /RIDGID HD1200/);
    // The product's own ### Sources sub-section stays inside its section...
    assert.match(products[0].section, /Sources/);
    // ...but the next product's content does not bleed in.
    assert.ok(!products[0].section.includes("brushless"));
    assert.match(products[1].section, /brushless/);
  });

  it("does not treat Close matches / What to avoid as ranked products", () => {
    const products = parseRankedProducts(report);
    assert.ok(products.every((p) => /Best Match/i.test(`#${p.rank} Best Match`)));
    assert.ok(!products.some((p) => /avoid/i.test(p.name)));
  });

  it("builds a brand+model identity key", () => {
    assert.equal(identityKey("RIDGID HD1200, 12-Gallon NXT"), "ridgid hd1200");
    assert.equal(identityKey("Herman Miller Aeron"), "herman miller");
  });
});

describe("scoring against the hand-audited T7B shop-vac fixture (ground truth)", () => {
  const fixturePath = path.resolve(
    "tests/fixtures/review-radar-live/oai-t7b-v2-price-smoke-3a1e87e/broad-shop-vac.run1.json",
  );
  const available = fs.existsSync(fixturePath);

  it("reproduces the frozen matcher on T7B: mechanical 5/7, 0 wrong-type, 3/5 priced", { skip: !available }, () => {
    const evidence = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const { reportMarkdown, priceEstimates } = evidence.completion;
    const gold = goldById("broad-shop-vac");
    const score = scoreDirectTerraRun({
      reportMarkdown,
      priceEstimates,
      goldEntry: gold,
      coversLeader,
    });

    // Five ranked products in the T7B report.
    assert.equal(score.rankedCount, 5);
    // The FROZEN matcher mechanically reports 5/7: RIDGID, DEWALT, Vacmaster,
    // CRAFTSMAN, plus the generic "shop vac" brand row, which matches the
    // literal "Shop Vac" descriptor in the CRAFTSMAN title. This is the exact
    // documented T6D caveat (mechanical 5/7 vs. honest semantic 4/7). The
    // scorer must faithfully reproduce the frozen matcher, quirk and all —
    // the eval's four chosen categories have no generic-word brand, so this
    // over-count does not recur there.
    assert.equal(score.leaderRecall.count, 5);
    for (const brand of ["ridgid", "vacmaster", "craftsman", "dewalt", "shop vac"]) {
      assert.ok(
        score.leaderRecall.covered.includes(brand),
        `expected core leader ${brand} covered; got ${score.leaderRecall.covered.join(",")}`,
      );
    }
    // Milwaukee is an acceptable alternate, scored separately (not a failure,
    // not a core-leader substitute).
    assert.ok(score.alternatesCovered.includes("milwaukee"));
    // No wrong-type product in the final set.
    assert.equal(score.wrongTypeHits.length, 0);
    // Three of five ranked products carried a displayed price estimate.
    assert.equal(score.priceCoverage.priced, 3);
    assert.equal(score.priceCoverage.total, 5);
  });
});

describe("constraint scoring", () => {
  const gold = goldById("con-robot-vac-300-selfempty");

  it("flags a price estimate whose low end exceeds the budget", () => {
    const report = [
      "## #1 Best Match — Roborock Q5 Robot Vacuum",
      "Has a self-emptying clean base dock.",
      "## #2 Best Match — Shark Matrix Self-Empty Robot",
      "Includes a self-empty base.",
    ].join("\n");
    const score = scoreDirectTerraRun({
      reportMarkdown: report,
      priceEstimates: [
        { rank: 1, low: 279, high: 299, median: 289 },
        { rank: 2, low: 349, high: 399, median: 374 }, // over $300
      ],
      goldEntry: gold,
      coversLeader,
    });
    assert.ok(score.constraint);
    assert.equal(score.constraint.budgetMax, 300);
    assert.equal(score.constraint.budgetViolations.length, 1);
    assert.equal(score.constraint.budgetViolations[0].rank, 2);
    // Both products discuss self-emptying in their section.
    const selfEmpty = score.constraint.features.find((f) => f.label === "self-emptying");
    assert.ok(selfEmpty);
    assert.equal(selfEmpty.coverageRate, 1);
  });

  it("detects a wrong-type product in a constrained set", () => {
    const report = [
      "## #1 Best Match — Roborock Q5 Robot Vacuum",
      "Self-emptying.",
      "## #2 Best Match — Shark Stick Vacuum Corded",
      "A stick vacuum, not a robot.",
    ].join("\n");
    const score = scoreDirectTerraRun({
      reportMarkdown: report,
      priceEstimates: [],
      goldEntry: gold,
      coversLeader,
    });
    assert.ok(score.wrongTypeHits.some((hit) => hit.term === "stick vacuum"));
  });
});

describe("stability aggregation", () => {
  it("computes leader-set Jaccard and recall mean across runs", () => {
    const mk = (leaders) => ({
      rankedCount: leaders.length,
      rankedProducts: [],
      leaderRecall: { covered: leaders, missed: [], total: 7, count: leaders.length },
      alternatesCovered: [],
      wrongTypeHits: [],
      constraint: null,
      priceCoverage: { priced: 0, total: leaders.length, rate: 0 },
      identityKeys: leaders,
      leaderKeys: leaders,
    });
    const stability = scoreDirectTerraCaseStability([
      mk(["a", "b", "c"]),
      mk(["a", "b", "d"]),
      mk(["a", "b", "c"]),
    ]);
    assert.equal(stability.runs, 3);
    assert.deepEqual(stability.recallCounts, [3, 3, 3]);
    assert.equal(stability.recallMean, 3);
    // Pairwise leader-set Jaccard: (0.5 + 1 + 0.5) / 3 = 0.6667.
    assert.ok(Math.abs(stability.leaderSetJaccard - 2 / 3) < 1e-9);
  });

  it("perfectly stable runs score Jaccard 1", () => {
    const same = {
      rankedCount: 2,
      rankedProducts: [],
      leaderRecall: { covered: ["x", "y"], missed: [], total: 7, count: 2 },
      alternatesCovered: [],
      wrongTypeHits: [],
      constraint: null,
      priceCoverage: { priced: 0, total: 2, rate: 0 },
      identityKeys: ["x 1", "y 2"],
      leaderKeys: ["x", "y"],
    };
    const stability = scoreDirectTerraCaseStability([same, same, same]);
    assert.equal(stability.leaderSetJaccard, 1);
    assert.equal(stability.identitySetJaccard, 1);
  });
});

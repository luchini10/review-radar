import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeDirectTerraSavedRun,
  buildDirectTerraAssetFirstLossDiagnostic,
  buildDirectTerraRankedProductAccounting,
  buildDirectTerraRecommendationFirstLossDiagnostic,
  classifyDirectTerraLeaderLosses,
  summarizeDirectTerraAssetVerification,
  summarizeDirectTerraFirstLossRuns,
} from "../lib/directTerraFirstLoss.ts";
import { verifyDirectTerraAssetCandidates } from "../lib/directTerraAssetVerifier.ts";
import { resolveDirectTerraProductAssets } from "../lib/directTerraProductAssets.ts";

const report = `# Product Research Report

## 1 Best Match: Acme Alpha A-100
Useful recommendation.

## 2 Best Match: Beta Home Comfort Chair
Useful recommendation.

## 3 Best Match: Gamma Q7 Robot Vacuum
Useful recommendation.
`;

describe("Direct-Terra first-loss observability", () => {
  it("accounts for every ranked product without provider text or identifiers", () => {
    const audit = analyzeDirectTerraSavedRun({
      id: "saved-run",
      reportMarkdown: report,
      productAssets: [
        {
          rank: 1,
          productName: "Acme Alpha A-100",
          productUrl: "https://acme.example/products/a-100",
          imageUrl: "https://images.acme.example/a-100.jpg",
        },
        {
          rank: 2,
          productName: "Beta Home Comfort Chair",
          productUrl: null,
          imageUrl: null,
        },
      ],
      score: {
        leaderRecall: {
          covered: ["acme"],
          missed: ["gamma"],
          total: 2,
          count: 1,
        },
      },
    });

    assert.equal(audit.accountingComplete, true);
    assert.equal(audit.rankedProductCount, 3);
    assert.equal(audit.products.length, 3);
    assert.equal(audit.products[0].firstLoss, "displayed_complete");
    assert.equal(
      audit.products[1].firstLoss,
      "downstream_resolution_evidence_not_retained",
    );
    assert.equal(
      audit.products[2].firstLoss,
      "target_identity_not_extracted",
    );
    assert.deepEqual(audit.recommendation.leaders, [
      { leaderKey: "acme", outcome: "ranked" },
      {
        leaderKey: "gamma",
        outcome: "terra_source_evidence_not_retained",
      },
    ]);

    const serialized = JSON.stringify(audit);
    assert.equal(serialized.includes("provider-secret"), false);
    assert.equal(serialized.includes("query"), false);
    assert.equal(serialized.includes("sourceTitle"), false);
  });

  it("marks non-preferred links as a selection-policy loss", () => {
    const audit = analyzeDirectTerraSavedRun({
      id: "other-host",
      reportMarkdown:
        "# Product Research Report\n\n## 1 Best Match: Acme Alpha A-100\n",
      productAssets: [
        {
          rank: 1,
          productName: "Acme Alpha A-100",
          productUrl: "https://obscure-store.example/item/a-100",
          imageUrl: "https://cdn.example/a-100.jpg",
        },
      ],
      score: null,
    });

    assert.equal(
      audit.products[0].firstLoss,
      "display_link_suppressed_nonpreferred_host",
    );
    assert.equal(audit.products[0].displayedLinkUnderCurrentPolicy, false);
  });

  it("reduces verifier decisions to bounded reason counts", () => {
    const target = {
      key: "rank-1-acme-a-100",
      rank: 1,
      productName: "Acme Alpha A-100 Widget",
      brand: "Acme",
      model: "A-100",
      category: "widget",
    };
    const verification = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Acme Alpha A-100 Widget",
          productUrl: "https://acme.example/products/a-100",
        },
        {
          title: "Acme Alpha A-101 Widget",
          productUrl: "https://acme.example/products/a-101",
        },
      ],
    });

    const summary = summarizeDirectTerraAssetVerification(verification);
    assert.equal(summary.candidateCount, 2);
    assert.equal(summary.acceptedWebsiteCount, 1);
    assert.equal(summary.identityReasons.accepted_exact_identity, 1);
    assert.equal(summary.identityReasons.model_not_in_title, 1);
    assert.equal(JSON.stringify(summary).includes("Acme Alpha"), false);
    assert.equal(JSON.stringify(summary).includes("https://"), false);
  });

  it("distinguishes leaders absent from sources from leaders found but not ranked", () => {
    const leaders = [
      { brand: "Acme", lines: ["Alpha"] },
      { brand: "Beta", lines: ["Comfort"] },
      { brand: "Gamma", lines: ["Q7"] },
    ];
    const coversLeader = (name, leader) => {
      const text = name.toLowerCase();
      return (
        text.includes(leader.brand.toLowerCase()) &&
        leader.lines.some((line) => text.includes(line.toLowerCase()))
      );
    };
    const classified = classifyDirectTerraLeaderLosses({
      leaders,
      rankedProductNames: ["Acme Alpha A-100"],
      responseSourceTitles: ["Beta Comfort official product page"],
      coversLeader,
    });

    assert.deepEqual(classified, [
      { leaderKey: "acme", outcome: "ranked" },
      {
        leaderKey: "beta",
        outcome: "terra_source_evidence_present_not_ranked",
      },
      { leaderKey: "gamma", outcome: "terra_source_evidence_absent" },
    ]);
  });

  it("captures sanitized research, ranking, and requirement attribution", () => {
    const leaders = [
      { brand: "Acme", lines: ["Alpha"] },
      { brand: "Beta", lines: ["Comfort"] },
    ];
    const coversLeader = (name, leader) => {
      const text = name.toLowerCase();
      return (
        text.includes(leader.brand.toLowerCase()) &&
        leader.lines.some((line) => text.includes(line.toLowerCase()))
      );
    };
    const diagnostic = buildDirectTerraRecommendationFirstLossDiagnostic({
      searchCallCount: 7,
      searchActions: [
        {
          type: "search",
          queries: ["best Acme Alpha reviews"],
          host: null,
          pattern: null,
        },
      ],
      sourceHosts: ["acme.example", "retailer.example"],
      responseSourceTitles: [
        "Acme Alpha official page with private provider wording",
      ],
      leaders,
      rankedProducts: [{ rank: 1, name: "Beta Comfort Chair" }],
      coversLeader,
      requirementVerdicts: {
        wrongTypeCount: 0,
        budgetViolationCount: 0,
        featureCoverage: [{ label: "lightweight", coverageRate: 1 }],
      },
    });

    assert.deepEqual(diagnostic.leaders, [
      {
        leaderKey: "acme",
        outcome: "terra_source_evidence_present_not_ranked",
      },
      { leaderKey: "beta", outcome: "ranked" },
    ]);
    assert.equal(diagnostic.searchCallCount, 7);
    assert.equal(
      diagnostic.searchActions[0].queries[0],
      "best Acme Alpha reviews",
    );
    assert.equal(diagnostic.sourceHostCount, 2);
    assert.deepEqual(diagnostic.candidateSlate, {
      status: "not_exposed_by_current_contract",
      identities: [],
    });
    assert.deepEqual(diagnostic.rankedProducts, [
      { rank: 1, identityKey: "beta comfort" },
    ]);
    assert.equal(
      JSON.stringify(diagnostic).includes("private provider wording"),
      false,
    );
  });

  it("summarizes multiple categories without hiding incomplete accounting", () => {
    const complete = analyzeDirectTerraSavedRun({
      id: "complete",
      reportMarkdown:
        "# Product Research Report\n\n## 1 Best Match: Acme Alpha A-100\n",
      productAssets: [],
      score: null,
    });
    const summary = summarizeDirectTerraFirstLossRuns([complete]);

    assert.equal(summary.runCount, 1);
    assert.equal(summary.rankedProductCount, 1);
    assert.equal(summary.accountedProductCount, 1);
    assert.equal(summary.incompleteRunCount, 0);
    assert.equal(summary.firstLossCounts.target_identity_not_extracted, 1);
  });

  it("emits one sanitized end-to-end trace per target without changing assets", async () => {
    const target = {
      key: "rank-1-roborock-q7-m5-plus",
      rank: 1,
      productName: "Roborock Q7 M5+ Robot Vacuum",
      brand: "Roborock",
      model: "Q7 M5+",
      category: "robot vacuum",
    };
    const traces = [];
    const assets = await resolveDirectTerraProductAssets({
      targets: [target],
      reportMarkdown:
        "# Product Research Report\n\n## 1 Best Match: Roborock Q7 M5+ Robot Vacuum\n",
      activeCitationUrls: [],
      responseSources: [],
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "Roborock Q7 M5+ Robot Vacuum",
            link: "https://us.roborock.com/products/roborock-q7-m5-plus",
          },
        ],
      }),
      serperTransport: async () => ({
        shopping: [
          {
            title: "Roborock Q7 M5+ Robot Vacuum",
            link: "https://www.google.com/shopping/product/secret-provider-id",
            imageUrl: "https://encrypted-tbn0.gstatic.com/shopping?q=opaque",
          },
        ],
      }),
      recordFirstLossDiagnostic: (trace) => traces.push(trace),
    });

    assert.deepEqual(assets, [
      {
        rank: 1,
        productName: target.productName,
        productUrl: "https://us.roborock.com/products/roborock-q7-m5-plus",
        imageUrl: "https://encrypted-tbn0.gstatic.com/shopping?q=opaque",
      },
    ]);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].displayedLink, true);
    assert.equal(traces[0].displayedImage, true);
    assert.equal(traces[0].websiteFirstLoss, null);
    assert.equal(traces[0].imageFirstLoss, null);
    assert.deepEqual(
      traces[0].lanes.map((lane) => lane.lane),
      ["citation", "organic_primary", "shopping", "organic_retailer"],
    );
    assert.equal(traces[0].lanes[3].status, "not_attempted");
    const serialized = JSON.stringify(traces);
    assert.equal(serialized.includes("secret-provider-id"), false);
    assert.equal(serialized.includes("google.com"), false);
    assert.equal(serialized.includes("Roborock Q7"), false);
    assert.equal(serialized.includes("query"), false);
  });

  it("assigns one deterministic downstream first-loss stage", () => {
    const verification = {
      candidateCount: 0,
      identityAcceptedCount: 0,
      acceptedWebsiteCount: 0,
      acceptedImageCount: 0,
      identityReasons: {},
      productUrlReasons: {},
      imageUrlReasons: {},
    };
    const diagnostic = buildDirectTerraAssetFirstLossDiagnostic({
      targetKey: "rank-1",
      rank: 1,
      lanes: [
        {
          targetKey: "rank-1",
          rank: 1,
          lane: "citation",
          status: "completed",
          rawResultCount: 0,
          consideredResultCount: 0,
          mappedCandidateCount: 0,
          verification,
        },
        {
          targetKey: "rank-1",
          rank: 1,
          lane: "organic_primary",
          status: "completed",
          rawResultCount: 10,
          consideredResultCount: 10,
          mappedCandidateCount: 0,
          verification,
        },
        {
          targetKey: "rank-1",
          rank: 1,
          lane: "shopping",
          status: "completed",
          rawResultCount: 20,
          consideredResultCount: 20,
          mappedCandidateCount: 2,
          verification: {
            ...verification,
            candidateCount: 2,
            identityReasons: { model_not_in_title: 2 },
          },
        },
      ],
      page: "not_selected",
      displayedLink: false,
      displayedImage: false,
    });

    assert.equal(diagnostic.websiteFirstLoss, "normalization_rejected");
    assert.equal(diagnostic.imageFirstLoss, "identity_verification_rejected");

    const selectionLoss = buildDirectTerraAssetFirstLossDiagnostic({
      targetKey: "rank-1",
      rank: 1,
      lanes: [
        {
          targetKey: "rank-1",
          rank: 1,
          lane: "shopping",
          status: "completed",
          rawResultCount: 1,
          consideredResultCount: 1,
          mappedCandidateCount: 1,
          verification: {
            ...verification,
            candidateCount: 1,
            acceptedImageCount: 1,
          },
        },
      ],
      page: "not_configured",
      displayedLink: false,
      displayedImage: false,
    });
    assert.equal(selectionLoss.imageFirstLoss, "selection_discarded");
  });

  it("never lets a failing diagnostic sink change product assets", async () => {
    const target = {
      key: "rank-1-roborock-q7-m5-plus",
      rank: 1,
      productName: "Roborock Q7 M5+ Robot Vacuum",
      brand: "Roborock",
      model: "Q7 M5+",
      category: "robot vacuum",
    };
    const assets = await resolveDirectTerraProductAssets({
      targets: [target],
      reportMarkdown:
        "# Product Research Report\n\n## 1 Best Match: Roborock Q7 M5+ Robot Vacuum\n",
      activeCitationUrls: [],
      responseSources: [],
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "Roborock Q7 M5+ Robot Vacuum",
            link: "https://us.roborock.com/products/roborock-q7-m5-plus",
          },
        ],
      }),
      recordFirstLossDiagnostic: () => {
        throw new Error("diagnostic sink unavailable");
      },
    });

    assert.equal(
      assets[0].productUrl,
      "https://us.roborock.com/products/roborock-q7-m5-plus",
    );
  });

  it("accounts for ranked products that never became asset targets", () => {
    const accounting = buildDirectTerraRankedProductAccounting({
      reportMarkdown: report,
      targets: [
        {
          key: "rank-1-acme-a-100",
          rank: 1,
          productName: "Acme Alpha A-100",
          brand: "Acme",
          model: "A-100",
          category: "widget",
        },
      ],
      productAssets: [
        {
          rank: 1,
          productName: "Acme Alpha A-100",
          productUrl: null,
          imageUrl: null,
        },
      ],
      assetDiagnostics: [
        buildDirectTerraAssetFirstLossDiagnostic({
          targetKey: "rank-1-acme-a-100",
          rank: 1,
          lanes: [],
          page: "not_configured",
          displayedLink: false,
          displayedImage: false,
        }),
      ],
    });

    assert.equal(accounting.accountingComplete, true);
    assert.equal(accounting.rankedProductCount, 3);
    assert.deepEqual(
      accounting.products.map((product) => product.outcome),
      [
        "asset_resolution_accounted",
        "target_identity_not_extracted",
        "target_identity_not_extracted",
      ],
    );
  });
});

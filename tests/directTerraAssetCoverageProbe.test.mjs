import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE,
  DIRECT_TERRA_ASSET_PROBE_VERSION,
  FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS,
  buildDirectTerraAssetProbePlan,
  buildSanitizedDirectTerraAssetProbeEvidence,
  runDirectTerraAssetCoverageProbe,
  validateDirectTerraAssetProbeApproval,
} from "../lib/directTerraAssetCoverageProbe.ts";
import { directTerraAssetTargetIsCoherent } from "../lib/directTerraAssetVerifier.ts";

const commit = "a".repeat(40);

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

describe("Direct-Terra asset coverage probe preflight", () => {
  it("freezes one five-product Direct-Terra report with coherent exact identities", () => {
    assert.equal(FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length, 5);
    assert.deepEqual(
      FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.map((target) => target.rank),
      [1, 2, 3, 4, 5],
    );
    assert.ok(FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.every(directTerraAssetTargetIsCoherent));

    const plan = buildDirectTerraAssetProbePlan({ repositoryCommit: commit });
    assert.equal(plan.version, DIRECT_TERRA_ASSET_PROBE_VERSION);
    assert.equal(plan.repositoryCommit, commit);
    assert.deepEqual(plan.bounds, {
      logicalSearches: 5,
      physicalAttempts: 5,
      attemptsPerTarget: 1,
      retries: 0,
      fallbacks: 0,
      replacements: 0,
      resultsPerSearch: 20,
    });
    assert.deepEqual(plan.requiredCoverage, DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE);
  });

  it("runs exactly once per target and scores website and image coverage separately", async () => {
    const requests = [];
    const { batch, diagnostics, summary } = await runDirectTerraAssetCoverageProbe({
      transport: async (request) => {
        requests.push(request);
        const target = FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS[requests.length - 1];
        const modelSlug = slug(target.model);
        return {
          shopping: [
            {
              title: target.productName,
              productLink: `https://merchant.example/products/${modelSlug}`,
              imageUrl: `https://images.example.com/products/${modelSlug}.jpg`,
              source: "must not survive",
              price: "$1.00",
              productId: "provider-id",
            },
          ],
        };
      },
    });

    assert.equal(requests.length, 5);
    assert.equal(batch.transportCallCount, 5);
    assert.equal(diagnostics.length, 5);
    assert.equal(summary.websiteCoverage.accepted, 5);
    assert.equal(summary.imageCoverage.accepted, 5);
    assert.equal(summary.fullyDecoratedCount, 5);
    assert.equal(summary.mechanicalCoveragePass, true);
    assert.equal(summary.verdict, "pending_manual_identity_audit");
  });

  it("does not let strong image availability hide inadequate website coverage", async () => {
    const { summary, batch, diagnostics } = await runDirectTerraAssetCoverageProbe({
      transport: async () => ({
        shopping: [
          {
            title: "Unrelated Product",
            productLink: "https://www.google.com/shopping/product/123",
            imageUrl: "https://images.example.com/products/available.jpg",
          },
        ],
      }),
    });

    assert.equal(summary.websiteCoverage.accepted, 0);
    assert.equal(summary.imageCoverage.accepted, 0);
    assert.equal(summary.providerImageCandidateCount, 5);
    assert.equal(summary.googleWrapperOnlyRowCount, 5);
    assert.equal(summary.verdict, "probe_fail_website_coverage");

    const evidence = buildSanitizedDirectTerraAssetProbeEvidence({
      repositoryCommit: commit,
      physicalAttempts: 5,
      batch,
      diagnostics,
    });
    const serialized = JSON.stringify(evidence);
    assert.equal(serialized.includes("provider-id"), false);
    assert.equal(serialized.includes("must not survive"), false);
    assert.equal(serialized.includes("$1.00"), false);
    assert.equal(serialized.includes("X-API-KEY"), false);
    assert.equal(serialized.includes("rawResponse"), false);
    assert.equal(serialized.includes("RIDGID HD1200 shop vacuum"), false);
  });

  it("requires four safe websites and four safe images, not only one combined metric", async () => {
    let index = 0;
    const { summary } = await runDirectTerraAssetCoverageProbe({
      transport: async () => {
        const target = FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS[index];
        index += 1;
        const modelSlug = slug(target.model);
        return {
          shopping: [
            {
              title: target.productName,
              productLink: `https://merchant.example/products/${modelSlug}`,
              imageUrl:
                index <= 3
                  ? `https://images.example.com/products/${modelSlug}.jpg`
                  : "https://images.example.com/no-image.jpg",
            },
          ],
        };
      },
    });

    assert.equal(summary.websiteCoverage.accepted, 5);
    assert.equal(summary.imageCoverage.accepted, 3);
    assert.equal(summary.verdict, "probe_fail_image_coverage");
  });

  it("requires exact numeric and commit-pinned approval plus process-only configuration", () => {
    assert.doesNotThrow(() =>
      validateDirectTerraAssetProbeApproval({
        approvedSearches: 5,
        approvedCommit: commit,
        repositoryCommit: commit,
        apiKey: "test-serper-key-with-enough-length",
        outputExists: false,
        trackedPhaseChanges: [],
      }),
    );

    const invalid = [
      { approvedSearches: 4 },
      { approvedCommit: "b".repeat(40) },
      { apiKey: "" },
      { apiKey: " test-serper-key-with-enough-length " },
      { outputExists: true },
      { trackedPhaseChanges: ["lib/directTerraSerperTransport.ts"] },
    ];
    for (const override of invalid) {
      assert.throws(
        () =>
          validateDirectTerraAssetProbeApproval({
            approvedSearches: 5,
            approvedCommit: commit,
            repositoryCommit: commit,
            apiKey: "test-serper-key-with-enough-length",
            outputExists: false,
            trackedPhaseChanges: [],
            ...override,
          }),
        /live probe preflight/i,
      );
    }
  });

  it("refuses to serialize evidence whose physical-attempt ledger does not reconcile", async () => {
    const { batch, diagnostics } = await runDirectTerraAssetCoverageProbe({
      transport: async () => ({ shopping: [] }),
    });

    assert.throws(
      () =>
        buildSanitizedDirectTerraAssetProbeEvidence({
          repositoryCommit: commit,
          physicalAttempts: 4,
          batch,
          diagnostics,
        }),
      /attempt ledger/i,
    );
  });

  it("keeps the CLI dry-run by default and excludes old providers, local env files, routes, and UI", async () => {
    const source = await readFile(
      new URL("../scripts/run-oai-t8a-asset-coverage-probe.mjs", import.meta.url),
      "utf8",
    );
    assert.match(source, /--execute/);
    assert.match(source, /process\.env\.SERPER_API_KEY/);
    assert.doesNotMatch(source, /\.env\.local|OPENAI|SEARCHAPI/i);
    assert.doesNotMatch(source, /search\/serper|app\/api|components\//);
    assert.doesNotMatch(source, /retry|fallback/i);
  });
});

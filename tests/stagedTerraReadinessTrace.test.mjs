import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createStagedTerraRegisteredProductTraceCollector,
  stagedTerraRegisteredProductMatchesIdentity,
  stagedTerraRegisteredProducts,
} from "../scripts/staged-terra-readiness-trace.mjs";

const testCase = {
  mustConsiderProducts: [
    {
      id: "ridgid-hd1200",
      brandAliases: ["RIDGID"],
      modelAliases: ["HD1200"],
    },
  ],
  illustrativeProducts: [
    {
      id: "dewalt-dxv12p-qt",
      brandAliases: ["DEWALT"],
      modelAliases: ["DXV12P-QT"],
    },
  ],
};

function candidate(candidateId, brand, productName, model) {
  return {
    candidateId,
    brand,
    productName,
    model,
    productType: "wet dry vacuum",
  };
}

function diagnostic(candidateId, overrides = {}) {
  return {
    candidateId,
    outcome: "eligible",
    firstLoss: "no_loss_eligible",
    acceptedSourceCount: 2,
    rejectedSourceCount: 0,
    rejectionReasons: [],
    assetIdentityAccepted: true,
    completeProductRelationshipProven: true,
    identitySafeProductUrlProven: true,
    verifiedPriceCount: 1,
    productUrlAvailable: true,
    imageUrlAvailable: true,
    ...overrides,
  };
}

describe("registered-product readiness trace", () => {
  it("rejects overlapping normalized aliases across registered products", () => {
    const overlapping = structuredClone(testCase);
    overlapping.illustrativeProducts[0].brandAliases = [" ridgid "];
    overlapping.illustrativeProducts[0].modelAliases = [" HD1200 "];

    assert.throws(
      () => stagedTerraRegisteredProducts(overlapping),
      /registered_product_registry_invalid/,
    );
  });

  it("retains only registered public IDs and bounded stage counts", () => {
    const collector = createStagedTerraRegisteredProductTraceCollector({
      testCase,
    });
    const ridgid = candidate(
      "candidate_1",
      "RIDGID",
      "private-candidate-title-canary",
      "HD1200",
    );
    const dewalt = candidate(
      "candidate_2",
      "DEWALT",
      "private-second-title-canary",
      "DXV12P-QT",
    );
    collector.captureResearch({
      validatedCandidates: [ridgid, dewalt],
      acceptedCandidates: [ridgid],
    });
    collector.captureVerification({
      researchOutput: {
        candidates: [ridgid],
      },
      verifierResult: {
        diagnostics: {
          candidates: [diagnostic("candidate_1")],
        },
      },
    });

    const trace = collector.snapshot();
    assert.deepEqual(trace.products[0], {
      id: "ridgid-hd1200",
      registry: "must_consider",
      validatedResearchCandidates: 1,
      acceptedResearchCandidates: 1,
      verification: {
        eligible: 1,
        closeMatch: 0,
        excluded: 0,
        firstLoss: {
          assetIdentity: 0,
          relationship: 0,
          productUrl: 0,
          hardRequirementFailed: 0,
          hardRequirementNotVerified: 0,
          noLossEligible: 1,
        },
      },
    });
    assert.deepEqual(trace.products[1], {
      id: "dewalt-dxv12p-qt",
      registry: "illustrative",
      validatedResearchCandidates: 1,
      acceptedResearchCandidates: 0,
      verification: {
        eligible: 0,
        closeMatch: 0,
        excluded: 0,
        firstLoss: {
          assetIdentity: 0,
          relationship: 0,
          productUrl: 0,
          hardRequirementFailed: 0,
          hardRequirementNotVerified: 0,
          noLossEligible: 0,
        },
      },
    });
    const serialized = JSON.stringify(trace);
    assert.doesNotMatch(serialized, /private-candidate-title-canary/i);
    assert.doesNotMatch(serialized, /private-second-title-canary/i);
    assert.doesNotMatch(serialized, /candidate_1|candidate_2/i);
    assert.doesNotMatch(serialized, /"brand"|"model"|"productName"/i);
  });

  it("classifies verifier loss without accepting sibling model aliases", () => {
    assert.equal(
      stagedTerraRegisteredProductMatchesIdentity(
        { brand: "RIDGID", model: "HD1200B" },
        testCase.mustConsiderProducts[0],
      ),
      false,
    );
    const collector = createStagedTerraRegisteredProductTraceCollector({
      testCase,
    });
    const ridgid = candidate(
      "candidate_1",
      "RIDGID",
      "RIDGID 12 Gallon Wet Dry Vacuum",
      "HD1200",
    );
    collector.captureResearch({
      validatedCandidates: [ridgid],
      acceptedCandidates: [ridgid],
    });
    collector.captureVerification({
      researchOutput: { candidates: [ridgid] },
      verifierResult: {
        diagnostics: {
          candidates: [
            diagnostic("candidate_1", {
              outcome: "excluded",
              firstLoss: "asset_identity_unproven",
              assetIdentityAccepted: false,
              completeProductRelationshipProven: false,
              identitySafeProductUrlProven: false,
            }),
          ],
        },
      },
    });
    assert.equal(
      collector.snapshot().products[0].verification.firstLoss.assetIdentity,
      1,
    );
    assert.throws(
      () =>
        collector.captureResearch({
          validatedCandidates: [],
          acceptedCandidates: [],
        }),
      /research_duplicate/,
    );
  });
});

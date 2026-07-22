import {
  MAX_DIRECT_TERRA_SHOPPING_RESULTS,
  buildDirectTerraAssetQuery,
  resolveDirectTerraAssetsWithSerperShopping,
  type DirectTerraSerperAssetBatch,
  type DirectTerraSerperAssetDiagnostic,
  type DirectTerraSerperShoppingTransport,
} from "./directTerraSerperAssetAdapter.ts";
import type { DirectTerraAssetTarget } from "./directTerraAssetVerifier.ts";
import { directTerraSerperApiKeyIsValid } from "./directTerraSerperTransport.ts";

export const DIRECT_TERRA_ASSET_PROBE_VERSION =
  "direct-terra-asset-coverage-probe-v2";

export const FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS = Object.freeze(
  [
    {
      key: "rank-1-ridgid-hd1200",
      rank: 1,
      productName: "RIDGID HD1200 Wet/Dry Shop Vacuum",
      brand: "RIDGID",
      model: "HD1200",
      category: "shop vacuum",
    },
    {
      key: "rank-2-dewalt-dxv12p-qt",
      rank: 2,
      productName: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
      brand: "DEWALT",
      model: "DXV12P-QT",
      category: "shop vacuum",
    },
    {
      key: "rank-3-vacmaster-vfb511b-0202",
      rank: 3,
      productName: "Vacmaster VFB511B 0202 Beast Series Wet/Dry Shop Vacuum",
      brand: "Vacmaster",
      model: "VFB511B 0202",
      category: "shop vacuum",
    },
    {
      key: "rank-4-craftsman-cmxevbe17595",
      rank: 4,
      productName: "CRAFTSMAN CMXEVBE17595 Wet/Dry Shop Vacuum",
      brand: "CRAFTSMAN",
      model: "CMXEVBE17595",
      category: "shop vacuum",
    },
    {
      key: "rank-5-milwaukee-0910-20",
      rank: 5,
      productName: "Milwaukee 0910-20 M18 FUEL Wet/Dry Shop Vacuum",
      brand: "Milwaukee",
      model: "0910-20",
      category: "shop vacuum",
    },
  ].map((target) => Object.freeze(target)),
) satisfies ReadonlyArray<DirectTerraAssetTarget>;

export const DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE = Object.freeze({
  safeWebsites: 4,
  safeImages: 4,
  totalProducts: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length,
});

export type DirectTerraAssetCoverageSummary = {
  targetCount: number;
  transportCallCount: number;
  providerCompletedCount: number;
  providerRawShoppingResultCount: number;
  providerConsideredShoppingResultCount: number;
  providerDiscardedShoppingResultCount: number;
  providerDirectProductUrlCandidateCount: number;
  providerImageCandidateCount: number;
  googleWrapperOnlyRowCount: number;
  websiteCoverage: { accepted: number; total: number; rate: number };
  imageCoverage: { accepted: number; total: number; rate: number };
  fullyDecoratedCount: number;
  mechanicalCoveragePass: boolean;
  verdict:
    | "probe_fail_website_coverage"
    | "probe_fail_image_coverage"
    | "pending_manual_identity_audit";
};

export function buildDirectTerraAssetProbePlan(input: {
  repositoryCommit: string;
}) {
  return {
    version: DIRECT_TERRA_ASSET_PROBE_VERSION,
    repositoryCommit: input.repositoryCommit,
    bounds: {
      logicalSearches: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length,
      physicalAttempts: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length,
      attemptsPerTarget: 1,
      retries: 0,
      fallbacks: 0,
      replacements: 0,
      resultsPerSearch: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
    },
    requiredCoverage: DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE,
    targets: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.map((target) => ({
      ...target,
      query: buildDirectTerraAssetQuery(target),
    })),
  };
}

export function buildSanitizedDirectTerraAssetProbePlan(input: {
  repositoryCommit: string;
}) {
  const plan = buildDirectTerraAssetProbePlan(input);
  return {
    version: plan.version,
    repositoryCommit: plan.repositoryCommit,
    bounds: plan.bounds,
    requiredCoverage: plan.requiredCoverage,
    targets: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.map((target) => ({
      key: target.key,
      rank: target.rank,
      productName: target.productName,
      brand: target.brand,
      model: target.model,
      category: target.category,
    })),
  };
}

export function summarizeDirectTerraAssetCoverage(input: {
  batch: DirectTerraSerperAssetBatch;
  diagnostics: DirectTerraSerperAssetDiagnostic[];
}): DirectTerraAssetCoverageSummary {
  const total = FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length;
  const safeWebsites = input.batch.items.filter(
    (item) => item.verification.productUrlStatus === "accepted_identity_safe",
  ).length;
  const safeImages = input.batch.items.filter(
    (item) => item.verification.imageUrlStatus === "accepted_identity_safe",
  ).length;
  const fullyDecoratedCount = input.batch.items.filter(
    (item) =>
      item.verification.productUrlStatus === "accepted_identity_safe" &&
      item.verification.imageUrlStatus === "accepted_identity_safe",
  ).length;
  const websitePass =
    safeWebsites >= DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE.safeWebsites;
  const imagePass = safeImages >= DIRECT_TERRA_ASSET_PROBE_REQUIRED_COVERAGE.safeImages;

  return {
    targetCount: total,
    transportCallCount: input.batch.transportCallCount,
    providerCompletedCount: input.batch.items.filter(
      (item) => item.providerStatus === "completed",
    ).length,
    providerRawShoppingResultCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.rawShoppingResultCount,
      0,
    ),
    providerConsideredShoppingResultCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.consideredShoppingResultCount,
      0,
    ),
    providerDiscardedShoppingResultCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.discardedShoppingResultCount,
      0,
    ),
    providerDirectProductUrlCandidateCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.directProductUrlCandidateCount,
      0,
    ),
    providerImageCandidateCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.imageCandidateCount,
      0,
    ),
    googleWrapperOnlyRowCount: input.diagnostics.reduce(
      (sum, diagnostic) => sum + diagnostic.googleWrapperOnlyRowCount,
      0,
    ),
    websiteCoverage: { accepted: safeWebsites, total, rate: safeWebsites / total },
    imageCoverage: { accepted: safeImages, total, rate: safeImages / total },
    fullyDecoratedCount,
    mechanicalCoveragePass: websitePass && imagePass,
    verdict: !websitePass
      ? "probe_fail_website_coverage"
      : !imagePass
        ? "probe_fail_image_coverage"
        : "pending_manual_identity_audit",
  };
}

export async function runDirectTerraAssetCoverageProbe(input: {
  transport: DirectTerraSerperShoppingTransport;
  beforeAttempt?: (attempt: number) => void;
}) {
  const diagnostics: DirectTerraSerperAssetDiagnostic[] = [];
  let attempts = 0;
  const transport: DirectTerraSerperShoppingTransport = async (request) => {
    attempts += 1;
    if (attempts > FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length) {
      throw new Error("Direct-Terra asset probe attempt ceiling reached.");
    }
    input.beforeAttempt?.(attempts);
    return input.transport(request);
  };
  const batch = await resolveDirectTerraAssetsWithSerperShopping({
    targets: FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.map((target) => ({ ...target })),
    transport,
    recordDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  });
  const summary = summarizeDirectTerraAssetCoverage({ batch, diagnostics });
  return { batch, diagnostics, summary };
}

export function buildSanitizedDirectTerraAssetProbeEvidence(input: {
  repositoryCommit: string;
  physicalAttempts: number;
  batch: DirectTerraSerperAssetBatch;
  diagnostics: DirectTerraSerperAssetDiagnostic[];
}) {
  const reconciles =
    input.physicalAttempts === input.batch.transportCallCount &&
    input.batch.items.length === FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length &&
    input.diagnostics.length === input.batch.items.length &&
    input.batch.items.every(
      (item, index) => item.targetKey === input.diagnostics[index]?.targetKey,
    );
  if (!reconciles) {
    throw new Error("Direct-Terra asset probe attempt ledger does not reconcile.");
  }

  return {
    version: DIRECT_TERRA_ASSET_PROBE_VERSION,
    repositoryCommit: input.repositoryCommit,
    physicalAttempts: input.physicalAttempts,
    diagnostics: input.diagnostics.map((diagnostic) => ({
      targetKey: diagnostic.targetKey,
      rank: diagnostic.rank,
      providerStatus: diagnostic.providerStatus,
      providerPayloadShape: diagnostic.providerPayloadShape,
      rawShoppingResultCount: diagnostic.rawShoppingResultCount,
      consideredShoppingResultCount: diagnostic.consideredShoppingResultCount,
      discardedShoppingResultCount: diagnostic.discardedShoppingResultCount,
      mappedCandidateCount: diagnostic.mappedCandidateCount,
      directProductUrlCandidateCount: diagnostic.directProductUrlCandidateCount,
      imageCandidateCount: diagnostic.imageCandidateCount,
      googleWrapperOnlyRowCount: diagnostic.googleWrapperOnlyRowCount,
    })),
    items: input.batch.items.map((item) => ({
      targetKey: item.targetKey,
      rank: item.rank,
      productName: item.productName,
      providerStatus: item.providerStatus,
      rawShoppingResultCount: item.rawShoppingResultCount,
      mappedCandidateCount: item.mappedCandidateCount,
      verification: item.verification,
    })),
    summary: summarizeDirectTerraAssetCoverage({
      batch: input.batch,
      diagnostics: input.diagnostics,
    }),
  };
}

export function validateDirectTerraAssetProbeApproval(input: {
  approvedSearches: number;
  approvedCommit: string;
  repositoryCommit: string;
  apiKey: string;
  outputExists: boolean;
  trackedPhaseChanges: string[];
}) {
  const valid =
    input.approvedSearches === FROZEN_DIRECT_TERRA_ASSET_PROBE_TARGETS.length &&
    /^[a-f0-9]{40}$/i.test(input.approvedCommit) &&
    input.approvedCommit === input.repositoryCommit &&
    directTerraSerperApiKeyIsValid(input.apiKey) &&
    !input.outputExists &&
    input.trackedPhaseChanges.length === 0;
  if (!valid) {
    throw new Error("Live probe preflight rejected the requested execution.");
  }
}

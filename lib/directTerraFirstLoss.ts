import {
  type DirectTerraAssetCandidate,
  type DirectTerraAssetTarget,
  type DirectTerraAssetVerification,
} from "./directTerraAssetVerifier.ts";
import {
  brandEvidenceMatches,
  canonicalBrand,
  detectKnownBrands,
} from "./brandMatching.ts";
import { classifyDirectTerraLinkHost } from "./directTerraLinkPreference.ts";
import { strongModelTokens } from "./productIdentity.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";
import {
  identityKey,
  parseRankedProducts,
} from "./directTerraEvaluation.ts";
import {
  extractDirectTerraAssetTargets,
  type DirectTerraSearchAction,
} from "./directTerraResponse.ts";
import type { DirectTerraCandidateSlateDiagnostic } from "./directTerraCandidateSlate.ts";

export const DIRECT_TERRA_FIRST_LOSS_VERSION =
  "direct-terra-first-loss-v2";

export type DirectTerraProductAssetLike = {
  rank: number;
  productName: string;
  productUrl: string | null;
  imageUrl: string | null;
};

export type DirectTerraProductFirstLoss =
  | "displayed_complete"
  | "target_identity_not_extracted"
  | "website_resolution_evidence_not_retained"
  | "image_resolution_evidence_not_retained"
  | "downstream_resolution_evidence_not_retained"
  | "display_link_suppressed_nonpreferred_host";

export type DirectTerraLeaderOutcome =
  | "ranked"
  | "terra_report_named_not_ranked"
  | "terra_source_evidence_absent"
  | "terra_source_evidence_present_not_ranked"
  | "terra_source_evidence_not_retained";

type LeaderLike = {
  brand: string;
  lines: string[];
};

type LeaderOutcome = {
  leaderKey: string;
  outcome: DirectTerraLeaderOutcome;
};

type SavedScoreLike = {
  leaderRecall?: {
    covered?: unknown;
    missed?: unknown;
    total?: unknown;
    count?: unknown;
  };
} | null;

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function reasonCounts<T extends string>(values: T[]) {
  const counts: Partial<Record<T, number>> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function summarizeDirectTerraAssetVerification(
  verification: DirectTerraAssetVerification,
  context?: {
    target: DirectTerraAssetTarget;
    candidates: DirectTerraAssetCandidate[];
  },
) {
  const decisions = verification.decisions;
  const candidateIdentitySamples = context
    ? decisions.slice(0, 20).map((decision) => {
        const candidate = context.candidates[decision.candidateIndex] ?? {};
        const title =
          typeof candidate.title === "string" ? candidate.title : "";
        const productUrl =
          typeof candidate.productUrl === "string"
            ? candidate.productUrl
            : "";
        const knownBrands = detectKnownBrands(title).map((brand) =>
          canonicalBrand(brand).toLowerCase(),
        );
        if (
          brandEvidenceMatches(title, context.target.brand) &&
          !knownBrands.includes(
            canonicalBrand(context.target.brand).toLowerCase(),
          )
        ) {
          knownBrands.push(canonicalBrand(context.target.brand).toLowerCase());
        }
        let pathIdentity: string[] = [];
        if (productUrl) {
          try {
            pathIdentity = normalizedDiagnosticTokens(
              decodeURIComponent(new URL(productUrl).pathname),
            );
          } catch {
            pathIdentity = [];
          }
        }
        return {
          candidateIndex: decision.candidateIndex,
          titleIdentity: normalizedDiagnosticTokens(title),
          brandEvidence: [...new Set(knownBrands)].slice(0, 4),
          strongModelEvidence: [...strongModelTokens(title)].slice(0, 8),
          typeStatus: classifyProductTypeMatch({
            evidenceText: title,
            identityText: title,
            requestedCategory: context.target.category,
          }).status,
          hostClass: productUrl
            ? classifyDirectTerraLinkHost(productUrl, context.target.brand)
            : "other",
          pathIdentity,
          identityAccepted: decision.identityAccepted,
          identityReason: decision.identityReason,
          relationship: decision.relationship,
          relationshipReason: decision.relationshipReason,
          productUrlAccepted: decision.productUrlAccepted,
          productUrlReason: decision.productUrlReason,
          imageUrlAccepted: decision.imageUrlAccepted,
          imageUrlReason: decision.imageUrlReason,
        };
      })
    : [];
  return {
    candidateCount: decisions.length,
    identityAcceptedCount: decisions.filter(
      (decision) => decision.identityAccepted,
    ).length,
    acceptedWebsiteCount: decisions.filter(
      (decision) => decision.productUrlAccepted,
    ).length,
    acceptedImageCount: decisions.filter(
      (decision) => decision.imageUrlAccepted,
    ).length,
    identityReasons: reasonCounts(
      decisions.map((decision) => decision.identityReason),
    ),
    relationships: reasonCounts(
      decisions.map((decision) => decision.relationship),
    ),
    relationshipReasons: reasonCounts(
      decisions.map((decision) => decision.relationshipReason),
    ),
    productUrlReasons: reasonCounts(
      decisions.map((decision) => decision.productUrlReason),
    ),
    imageUrlReasons: reasonCounts(
      decisions.map((decision) => decision.imageUrlReason),
    ),
    candidateIdentitySamples,
  };
}

function normalizedDiagnosticTokens(value: string) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 20);
}

export type DirectTerraVerificationSummary = ReturnType<
  typeof summarizeDirectTerraAssetVerification
>;

export type DirectTerraProviderLaneDiagnostic = {
  targetKey: string;
  rank: number;
  lane: "citation" | "organic_primary" | "organic_retailer" | "shopping";
  status:
    | "completed"
    | "invalid_response"
    | "transport_error"
    | "not_attempted";
  rawResultCount: number;
  consideredResultCount: number;
  mappedCandidateCount: number;
  verification: DirectTerraVerificationSummary;
};

export type DirectTerraPageLaneDiagnostic = {
  targetKey: string;
  rank: number;
  status:
    | "not_configured"
    | "not_selected"
    | "budget_exhausted"
    | "skipped_known_bot_wall"
    | "transport_error"
    | "page_unavailable"
    | "page_assets_unavailable"
    | "verified_without_image"
    | "accepted_page_image";
};

export type DirectTerraAssetFirstLossDiagnostic = {
  schemaVersion: typeof DIRECT_TERRA_FIRST_LOSS_VERSION;
  targetKey: string;
  rank: number;
  lanes: DirectTerraProviderLaneDiagnostic[];
  page: DirectTerraPageLaneDiagnostic["status"];
  displayedLink: boolean;
  displayedImage: boolean;
  websiteFirstLoss:
    | null
    | "provider_result_absent"
    | "provider_response_invalid"
    | "normalization_rejected"
    | "identity_verification_rejected"
    | "selection_nonpreferred_host";
  imageFirstLoss:
    | null
    | "provider_result_absent"
    | "provider_response_invalid"
    | "normalization_rejected"
    | "identity_verification_rejected"
    | "selection_discarded"
    | "page_fetch_unavailable";
};

const laneOrder: DirectTerraProviderLaneDiagnostic["lane"][] = [
  "citation",
  "organic_primary",
  "shopping",
  "organic_retailer",
];

function providerFirstLoss(
  lanes: DirectTerraProviderLaneDiagnostic[],
  acceptedKey: "acceptedWebsiteCount" | "acceptedImageCount",
) {
  if (
    lanes.some(
      (lane) => lane.verification[acceptedKey] > 0,
    )
  ) {
    return "selection_nonpreferred_host" as const;
  }
  if (lanes.some((lane) => lane.mappedCandidateCount > 0)) {
    return "identity_verification_rejected" as const;
  }
  if (lanes.some((lane) => lane.consideredResultCount > 0)) {
    return "normalization_rejected" as const;
  }
  if (
    lanes.some(
      (lane) =>
        lane.status === "invalid_response" ||
        lane.status === "transport_error",
    )
  ) {
    return "provider_response_invalid" as const;
  }
  return "provider_result_absent" as const;
}

export function buildDirectTerraAssetFirstLossDiagnostic({
  targetKey,
  rank,
  lanes,
  page,
  displayedLink,
  displayedImage,
  selectedWebsiteWasNonPreferred = false,
}: {
  targetKey: string;
  rank: number;
  lanes: DirectTerraProviderLaneDiagnostic[];
  page: DirectTerraPageLaneDiagnostic["status"];
  displayedLink: boolean;
  displayedImage: boolean;
  selectedWebsiteWasNonPreferred?: boolean;
}): DirectTerraAssetFirstLossDiagnostic {
  const orderedLanes = [...lanes].sort(
    (left, right) =>
      laneOrder.indexOf(left.lane) - laneOrder.indexOf(right.lane),
  );
  const websiteLanes = orderedLanes.filter(
    (lane) => lane.lane !== "shopping",
  );
  const shoppingLanes = orderedLanes.filter(
    (lane) => lane.lane === "shopping",
  );
  const websiteFirstLoss = displayedLink
    ? null
    : selectedWebsiteWasNonPreferred
      ? "selection_nonpreferred_host"
      : providerFirstLoss(websiteLanes, "acceptedWebsiteCount");
  let imageFirstLoss: DirectTerraAssetFirstLossDiagnostic["imageFirstLoss"] =
    null;
  if (!displayedImage) {
    const shoppingLoss = providerFirstLoss(
      shoppingLanes,
      "acceptedImageCount",
    );
    imageFirstLoss =
      shoppingLoss === "provider_result_absent" &&
      page !== "not_configured" &&
      page !== "not_selected" &&
      page !== "accepted_page_image"
        ? "page_fetch_unavailable"
        : shoppingLoss === "selection_nonpreferred_host"
          ? "selection_discarded"
          : shoppingLoss;
  }
  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    targetKey,
    rank,
    lanes: orderedLanes,
    page,
    displayedLink,
    displayedImage,
    websiteFirstLoss,
    imageFirstLoss,
  };
}

export function classifyDirectTerraLeaderLosses({
  leaders,
  rankedProductNames,
  reportNamedNonRankedProducts = [],
  responseSourceTitles,
  coversLeader,
}: {
  leaders: LeaderLike[];
  rankedProductNames: string[];
  reportNamedNonRankedProducts?: string[];
  responseSourceTitles: string[] | null;
  coversLeader: (name: string, leader: LeaderLike) => boolean;
}): LeaderOutcome[] {
  return leaders.map((leader) => {
    const leaderKey = leader.brand.toLowerCase();
    if (rankedProductNames.some((name) => coversLeader(name, leader))) {
      return { leaderKey, outcome: "ranked" as const };
    }
    if (
      reportNamedNonRankedProducts.some((name) =>
        coversLeader(name, leader),
      )
    ) {
      return {
        leaderKey,
        outcome: "terra_report_named_not_ranked" as const,
      };
    }
    if (responseSourceTitles === null) {
      return {
        leaderKey,
        outcome: "terra_source_evidence_not_retained" as const,
      };
    }
    if (responseSourceTitles.some((title) => coversLeader(title, leader))) {
      return {
        leaderKey,
        outcome: "terra_source_evidence_present_not_ranked" as const,
      };
    }
    return {
      leaderKey,
      outcome: "terra_source_evidence_absent" as const,
    };
  });
}

export function extractDirectTerraNamedNonRankedProducts(
  reportMarkdown: string,
) {
  const products: string[] = [];
  let inNonRankedSection = false;
  for (const line of (reportMarkdown || "").split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      inNonRankedSection =
        /\b(?:close matches?|not ranked|other candidates?|rejected candidates?)\b/i.test(
          heading[1],
        );
      continue;
    }
    if (!inNonRankedSection) continue;
    const named = line.match(
      /^\s*(?:[-*]|\d+[.)])\s+\*\*([^*]{2,200}?)(?::)?\*\*\s*(?::|[—–-])?/,
    );
    if (named?.[1]) products.push(named[1].trim());
  }
  return [...new Set(products)].slice(0, 50);
}

export function buildDirectTerraRecommendationFirstLossDiagnostic({
  searchCallCount,
  searchActions,
  sourceHosts,
  responseSourceTitles,
  reportMarkdown,
  leaders,
  rankedProducts,
  coversLeader,
  requirementVerdicts,
  candidateSlateDiagnostic,
}: {
  searchCallCount: number;
  searchActions: DirectTerraSearchAction[];
  sourceHosts: string[];
  responseSourceTitles: string[] | null;
  reportMarkdown: string;
  leaders: LeaderLike[];
  rankedProducts: { rank: number; name: string }[];
  coversLeader: (name: string, leader: LeaderLike) => boolean;
  requirementVerdicts: {
    wrongTypeCount: number;
    budgetViolationCount: number;
    featureCoverage: { label: string; coverageRate: number }[];
  };
  candidateSlateDiagnostic?: DirectTerraCandidateSlateDiagnostic | null;
}) {
  const namedNonRankedProducts =
    extractDirectTerraNamedNonRankedProducts(reportMarkdown);
  const distinctHosts = [
    ...new Set(
      sourceHosts
        .map((host) => host.trim().toLowerCase().replace(/^www\./, ""))
        .filter(Boolean),
    ),
  ].sort();
  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    searchCallCount: Math.max(0, Math.floor(searchCallCount)),
    searchActions: searchActions.slice(0, 100).map((action) => ({
      type: action.type,
      queries: action.queries.slice(0, 20).map((query) => query.slice(0, 500)),
      host: action.host?.slice(0, 253) ?? null,
      pattern: action.pattern?.slice(0, 200) ?? null,
    })),
    sourceHostCount: distinctHosts.length,
    sourceHosts: distinctHosts,
    candidateSlate: candidateSlateDiagnostic
      ? {
          status: "structured_v1" as const,
          entries: candidateSlateDiagnostic.entries,
        }
      : {
          status:
            namedNonRankedProducts.length > 0
              ? ("partially_exposed_by_report" as const)
              : ("not_exposed_by_current_contract" as const),
          identities: namedNonRankedProducts.map(identityKey),
        },
    rankedProducts: [...rankedProducts]
      .sort((left, right) => left.rank - right.rank)
      .map((product) => ({
        rank: product.rank,
        identityKey: identityKey(product.name),
      })),
    leaders: classifyDirectTerraLeaderLosses({
      leaders,
      rankedProductNames: rankedProducts.map((product) => product.name),
      reportNamedNonRankedProducts: namedNonRankedProducts,
      responseSourceTitles,
      coversLeader,
    }),
    requirementVerdicts: {
      wrongTypeCount: Math.max(
        0,
        Math.floor(requirementVerdicts.wrongTypeCount),
      ),
      budgetViolationCount: Math.max(
        0,
        Math.floor(requirementVerdicts.budgetViolationCount),
      ),
      featureCoverage: requirementVerdicts.featureCoverage.map((feature) => ({
        label: feature.label.slice(0, 120),
        coverageRate: Math.max(0, Math.min(1, feature.coverageRate)),
      })),
    },
  };
}

export function buildDirectTerraRankedProductAccounting({
  reportMarkdown,
  targets,
  productAssets,
  assetDiagnostics,
}: {
  reportMarkdown: string;
  targets: DirectTerraAssetTarget[];
  productAssets: DirectTerraProductAssetLike[];
  assetDiagnostics: DirectTerraAssetFirstLossDiagnostic[];
}) {
  const ranked = parseRankedProducts(reportMarkdown);
  const targetByRank = new Map(targets.map((target) => [target.rank, target]));
  const assetByRank = new Map(productAssets.map((asset) => [asset.rank, asset]));
  const diagnosticByRank = new Map(
    assetDiagnostics.map((diagnostic) => [diagnostic.rank, diagnostic]),
  );
  const products = ranked.map((product) => {
    const target = targetByRank.get(product.rank);
    const asset = assetByRank.get(product.rank);
    const diagnostic = diagnosticByRank.get(product.rank);
    if (!target) {
      return {
        rank: product.rank,
        identityKey: identityKey(product.name),
        outcome: "target_identity_not_extracted" as const,
        displayedLink: false,
        displayedImage: false,
      };
    }
    if (!asset || !diagnostic) {
      return {
        rank: product.rank,
        identityKey: identityKey(product.name),
        outcome: "asset_trace_missing" as const,
        displayedLink: Boolean(asset?.productUrl),
        displayedImage: Boolean(asset?.imageUrl),
      };
    }
    return {
      rank: product.rank,
      identityKey: identityKey(product.name),
      outcome: "asset_resolution_accounted" as const,
      displayedLink: diagnostic.displayedLink,
      displayedImage: diagnostic.displayedImage,
      websiteFirstLoss: diagnostic.websiteFirstLoss,
      imageFirstLoss: diagnostic.imageFirstLoss,
    };
  });
  const orphanTargetCount = targets.filter(
    (target) => !ranked.some((product) => product.rank === target.rank),
  ).length;
  const orphanDiagnosticCount = assetDiagnostics.filter(
    (diagnostic) =>
      !ranked.some((product) => product.rank === diagnostic.rank),
  ).length;
  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    rankedProductCount: ranked.length,
    accountedProductCount: products.filter(
      (product) => product.outcome !== "asset_trace_missing",
    ).length,
    orphanTargetCount,
    orphanDiagnosticCount,
    accountingComplete:
      orphanTargetCount === 0 &&
      orphanDiagnosticCount === 0 &&
      products.every((product) => product.outcome !== "asset_trace_missing"),
    products,
  };
}

function recommendationFromSavedScore(score: SavedScoreLike) {
  const covered = stringList(score?.leaderRecall?.covered);
  const missed = stringList(score?.leaderRecall?.missed);
  const leaders: LeaderOutcome[] = [
    ...covered.map((leaderKey) => ({
      leaderKey,
      outcome: "ranked" as const,
    })),
    ...missed.map((leaderKey) => ({
      leaderKey,
      outcome: "terra_source_evidence_not_retained" as const,
    })),
  ];
  return {
    status: leaders.length > 0 ? ("accounted" as const) : ("not_scored" as const),
    leaders,
    evidenceLimitation:
      missed.length > 0
        ? "Saved fixture omitted source titles, so missed leaders cannot be split between absent-from-research and found-but-not-ranked."
        : null,
  };
}

function classifySavedProduct({
  historicalTargeted,
  hasLink,
  hasImage,
  displayedLinkUnderCurrentPolicy,
}: {
  historicalTargeted: boolean;
  hasLink: boolean;
  hasImage: boolean;
  displayedLinkUnderCurrentPolicy: boolean;
}): DirectTerraProductFirstLoss {
  if (!historicalTargeted) return "target_identity_not_extracted";
  if (hasLink && !displayedLinkUnderCurrentPolicy) {
    return "display_link_suppressed_nonpreferred_host";
  }
  if (hasLink && hasImage) return "displayed_complete";
  if (!hasLink && !hasImage) {
    return "downstream_resolution_evidence_not_retained";
  }
  if (!hasLink) return "website_resolution_evidence_not_retained";
  return "image_resolution_evidence_not_retained";
}

export function analyzeDirectTerraSavedRun({
  id,
  reportMarkdown,
  productAssets,
  score,
}: {
  id: string;
  reportMarkdown: string;
  productAssets: DirectTerraProductAssetLike[];
  score: SavedScoreLike;
}) {
  const ranked = parseRankedProducts(reportMarkdown);
  // Historical fixtures intentionally omit raw price observations. This replay
  // therefore measures heading-only extraction, not the complete current
  // target set (which may still use structured identity as a fallback).
  const headingReplayTargets = extractDirectTerraAssetTargets({
    reportMarkdown,
    priceObservations: [],
  });
  const rankedByRank = new Map(ranked.map((product) => [product.rank, product]));
  const headingReplayTargetRanks = new Set(
    headingReplayTargets.map((target) => target.rank),
  );
  const historicalAssetsByRank = new Map(
    productAssets.map((asset) => [asset.rank, asset]),
  );

  const duplicateRankCount =
    ranked.length - new Set(ranked.map((product) => product.rank)).size;
  const orphanHistoricalAssetCount = productAssets.filter(
    (asset) => !rankedByRank.has(asset.rank),
  ).length;
  const orphanHeadingReplayTargetCount = headingReplayTargets.filter(
    (target) => !rankedByRank.has(target.rank),
  ).length;

  const products = ranked.map((product) => {
    const historical = historicalAssetsByRank.get(product.rank);
    const historicalTargeted = Boolean(historical);
    const headingReplayTargeted = headingReplayTargetRanks.has(product.rank);
    const hasLink = Boolean(historical?.productUrl);
    const hasImage = Boolean(historical?.imageUrl);
    const displayedLinkUnderCurrentPolicy = Boolean(
      historical?.productUrl &&
        classifyDirectTerraLinkHost(
          historical.productUrl,
          headingReplayTargets.find((target) => target.rank === product.rank)
            ?.brand ??
            product.name.split(/\s+/)[0] ??
            "",
        ) !== "other",
    );
    return {
      rank: product.rank,
      productName: product.name,
      historicalTargeted,
      headingReplayTargeted,
      headingReplayRecovered:
        !historicalTargeted && headingReplayTargeted,
      hasHistoricalLink: hasLink,
      hasHistoricalImage: hasImage,
      displayedLinkUnderCurrentPolicy,
      firstLoss: classifySavedProduct({
        historicalTargeted,
        hasLink,
        hasImage,
        displayedLinkUnderCurrentPolicy,
      }),
    };
  });

  const accountedProductCount = products.filter((product) =>
    Boolean(product.firstLoss),
  ).length;
  const accountingComplete =
    duplicateRankCount === 0 &&
    orphanHistoricalAssetCount === 0 &&
    orphanHeadingReplayTargetCount === 0 &&
    accountedProductCount === ranked.length;

  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    id,
    accountingComplete,
    rankedProductCount: ranked.length,
    accountedProductCount,
    duplicateRankCount,
    orphanHistoricalAssetCount,
    orphanHeadingReplayTargetCount,
    historicalTargetCount: historicalAssetsByRank.size,
    headingReplayTargetCount: headingReplayTargetRanks.size,
    headingReplayRecoveredCount: products.filter(
      (product) => product.headingReplayRecovered,
    ).length,
    products,
    recommendation: recommendationFromSavedScore(score),
  };
}

type SavedRunAudit = ReturnType<typeof analyzeDirectTerraSavedRun>;

export function summarizeDirectTerraFirstLossRuns(runs: SavedRunAudit[]) {
  const firstLossCounts: Partial<Record<DirectTerraProductFirstLoss, number>> =
    {};
  const recommendationOutcomeCounts: Partial<
    Record<DirectTerraLeaderOutcome, number>
  > = {};
  for (const run of runs) {
    for (const product of run.products) {
      firstLossCounts[product.firstLoss] =
        (firstLossCounts[product.firstLoss] ?? 0) + 1;
    }
    for (const leader of run.recommendation.leaders) {
      recommendationOutcomeCounts[leader.outcome] =
        (recommendationOutcomeCounts[leader.outcome] ?? 0) + 1;
    }
  }
  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    runCount: runs.length,
    rankedProductCount: runs.reduce(
      (sum, run) => sum + run.rankedProductCount,
      0,
    ),
    accountedProductCount: runs.reduce(
      (sum, run) => sum + run.accountedProductCount,
      0,
    ),
    incompleteRunCount: runs.filter((run) => !run.accountingComplete).length,
    historicalTargetCount: runs.reduce(
      (sum, run) => sum + run.historicalTargetCount,
      0,
    ),
    headingReplayTargetCount: runs.reduce(
      (sum, run) => sum + run.headingReplayTargetCount,
      0,
    ),
    headingReplayRecoveredCount: runs.reduce(
      (sum, run) => sum + run.headingReplayRecoveredCount,
      0,
    ),
    firstLossCounts,
    recommendationOutcomeCounts,
  };
}

export function emptyDirectTerraVerificationSummary(): DirectTerraVerificationSummary {
  return {
    candidateCount: 0,
    identityAcceptedCount: 0,
    acceptedWebsiteCount: 0,
    acceptedImageCount: 0,
    identityReasons: {},
    relationships: {},
    relationshipReasons: {},
    productUrlReasons: {},
    imageUrlReasons: {},
    candidateIdentitySamples: [],
  };
}

import type {
  RawProductCandidate,
  RecommendationApiRequest,
  RecommendationResult,
} from "../types/review-radar";

export type VerificationBudget = {
  concurrency: number;
  fullTrustLadderProductCount: number;
  maxFactsPerProduct: number;
  maxProducts: number;
  reason: string;
};

export type FinalResearchContextSize = "medium" | "high";

const DEFAULT_VERIFICATION_CONCURRENCY = 3;
const DEFAULT_MAX_MAIN_VERIFICATION_PRODUCTS = 9;
const DEFAULT_MAX_FACTS_PER_PRODUCT = 2;
const DEFAULT_SHORTLIST_SIZE = 28;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function verificationConcurrency() {
  return boundedInteger(
    process.env.REVIEW_RADAR_VERIFICATION_CONCURRENCY,
    DEFAULT_VERIFICATION_CONCURRENCY,
    1,
    6,
  );
}

function maxMainVerificationProducts() {
  return boundedInteger(
    process.env.REVIEW_RADAR_MAX_MAIN_VERIFICATION_PRODUCTS,
    DEFAULT_MAX_MAIN_VERIFICATION_PRODUCTS,
    4,
    15,
  );
}

function normalizedText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requestSpecificity(request: RecommendationApiRequest) {
  const priorities = normalizedText(request.priorities);
  const selectedFeatureCount = request.selectedFeatures?.length || 0;
  const hardRequirementCount =
    request.extractedRequirements?.requiredConstraints?.length || 0;
  const specConstraintCount =
    request.extractedRequirements?.specConstraints?.length || 0;

  return {
    selectedFeatureCount,
    hardRequirementCount,
    priorityTokenCount: priorities ? priorities.split(" ").length : 0,
    specConstraintCount,
  };
}

function isBroadCommonSearch(options: {
  categoryGroup?: string;
  request: RecommendationApiRequest;
  serperCandidateCount: number;
}) {
  const specificity = requestSpecificity(options.request);
  const specificConstraintCount =
    specificity.selectedFeatureCount +
    specificity.hardRequirementCount +
    specificity.specConstraintCount;

  return (
    options.categoryGroup !== undefined &&
    options.categoryGroup !== "general" &&
    options.serperCandidateCount >= 12 &&
    specificConstraintCount <= 2 &&
    specificity.priorityTokenCount <= 8
  );
}

export function buildAdaptiveVerificationBudget(options: {
  categoryGroup?: string;
  maxEnrichedProducts: number;
  request: RecommendationApiRequest;
  result: RecommendationResult;
  serperCandidateCount: number;
}): VerificationBudget {
  const exactCount = options.result.exactMatches.length;
  const closeCount =
    options.result.nearMatches.length + (options.result.premiumAboveBudget?.length || 0);
  const configuredCap = Math.min(
    options.maxEnrichedProducts,
    maxMainVerificationProducts(),
  );
  const broadCommon = isBroadCommonSearch({
    categoryGroup: options.categoryGroup,
    request: options.request,
    serperCandidateCount: options.serperCandidateCount,
  });

  if (exactCount >= 7) {
    return {
      concurrency: verificationConcurrency(),
      fullTrustLadderProductCount: 3,
      maxFactsPerProduct: DEFAULT_MAX_FACTS_PER_PRODUCT,
      maxProducts: Math.min(configuredCap, 7 + Math.min(closeCount, 2)),
      reason: "enough_exact_candidates",
    };
  }

  if (exactCount >= 3) {
    return {
      concurrency: verificationConcurrency(),
      fullTrustLadderProductCount: 3,
      maxFactsPerProduct: DEFAULT_MAX_FACTS_PER_PRODUCT,
      maxProducts: Math.min(configuredCap, Math.max(7, exactCount)),
      reason: "some_exact_candidates",
    };
  }

  return {
    concurrency: verificationConcurrency(),
    fullTrustLadderProductCount: broadCommon ? 4 : 3,
    maxFactsPerProduct: DEFAULT_MAX_FACTS_PER_PRODUCT,
    // Verify up to the 7-slot display cap even in the thin-result tier, so the
    // speed policy can never leave a qualifying product short of a shown slot
    // (the frozen-set test showed 6 here dropped 1 exact when 7+ would qualify).
    maxProducts: Math.min(configuredCap, broadCommon ? 9 : 7),
    reason: broadCommon ? "broad_common_search" : "few_exact_candidates",
  };
}

function candidateHost(candidate: RawProductCandidate) {
  try {
    return new URL(candidate.productUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function candidateHasExpectedProduct(
  candidate: RawProductCandidate,
  expectedProducts: Array<{ brand?: string; productLine?: string }>,
) {
  const text = normalizedText(
    [
      candidate.name,
      candidate.brand || "",
      candidate.category,
      candidate.keySpecs.join(" "),
      candidate.evidenceSources.map((source) => source.title).join(" "),
    ].join(" "),
  );

  return expectedProducts.some((product) => {
    const brand = normalizedText(product.brand);
    const line = normalizedText(product.productLine);

    if (brand && !text.includes(brand)) {
      return false;
    }

    return !line || text.includes(line);
  });
}

function candidateScore(
  candidate: RawProductCandidate,
  expectedProducts: Array<{ brand?: string; productLine?: string }>,
) {
  let score = 0;

  if (candidate.requirementCheck?.passed) score += 40;
  if (candidate.price !== null) score += 18;
  if (candidate.reviewCount && candidate.reviewCount >= 100) score += 12;
  if (candidate.reviewCount && candidate.reviewCount >= 25) score += 6;
  if (candidate.rating && candidate.rating >= 4.2) score += 8;
  if (candidate.evidenceSources.length >= 3) score += 8;
  if (candidateHasExpectedProduct(candidate, expectedProducts)) score += 22;
  if (candidate.productUrl) score += 4;

  return score;
}

export function selectFinalResearchCandidates(options: {
  candidates: RawProductCandidate[];
  expectedProducts?: Array<{ brand?: string; productLine?: string }>;
  limit?: number;
}) {
  const limit = options.limit ?? DEFAULT_SHORTLIST_SIZE;

  if (options.candidates.length <= limit) {
    return options.candidates;
  }

  const expectedProducts = options.expectedProducts || [];
  const selected = new Map<string, RawProductCandidate>();
  const add = (candidate: RawProductCandidate) => {
    if (selected.size >= limit) {
      return;
    }

    selected.set(candidate.id || candidate.productUrl || candidate.name, candidate);
  };

  for (const candidate of options.candidates) {
    if (candidate.requirementCheck?.passed || candidateHasExpectedProduct(candidate, expectedProducts)) {
      add(candidate);
    }
  }

  const hosts = new Set(Array.from(selected.values()).map(candidateHost));
  const ranked = [...options.candidates].sort(
    (a, b) =>
      candidateScore(b, expectedProducts) - candidateScore(a, expectedProducts),
  );

  for (const candidate of ranked) {
    const host = candidateHost(candidate);

    if (host && !hosts.has(host)) {
      add(candidate);
      hosts.add(host);
    }
  }

  for (const candidate of ranked) {
    add(candidate);
  }

  return Array.from(selected.values()).slice(0, limit);
}

export function chooseFinalResearchContext(options: {
  candidates: RawProductCandidate[];
  discoveryGapCount: number;
  sourceTimeouts: number;
}) : FinalResearchContextSize {
  const configured = (process.env.REVIEW_RADAR_FAST_FINAL_CONTEXT || "auto")
    .toLowerCase()
    .trim();

  if (configured === "medium" || configured === "high") {
    return configured;
  }

  const pricedCount = options.candidates.filter(
    (candidate) => candidate.price !== null,
  ).length;
  const hosts = new Set(options.candidates.map(candidateHost).filter(Boolean));

  if (
    options.sourceTimeouts === 0 &&
    options.candidates.length >= 12 &&
    pricedCount >= 5 &&
    hosts.size >= 3 &&
    (options.discoveryGapCount === 0 || options.candidates.length >= 13)
  ) {
    return "medium";
  }

  return "high";
}

export function shouldRunFollowUpDiscovery(options: {
  candidates: RawProductCandidate[];
  followUpQueryCount: number;
  marketCoverage?: {
    candidateCount: number;
    pricedCandidateCount: number;
    retailerHostCount: number;
  };
  missingExpectedProductCount: number;
}) {
  if (options.followUpQueryCount === 0) {
    return false;
  }

  const candidateCount =
    options.marketCoverage?.candidateCount ?? options.candidates.length;
  const pricedCandidateCount =
    options.marketCoverage?.pricedCandidateCount ??
    options.candidates.filter((candidate) => candidate.price !== null).length;
  const retailerHostCount =
    options.marketCoverage?.retailerHostCount ??
    new Set(options.candidates.map(candidateHost).filter(Boolean)).size;

  if (candidateCount < 10 || pricedCandidateCount < 5 || retailerHostCount < 3) {
    return true;
  }

  return options.missingExpectedProductCount >= 3;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(safeConcurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

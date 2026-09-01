import type {
  ProductFieldEvidence,
  ProductAvailabilityTrust,
  ProductMetadata,
  ProductPriceTrust,
  RawProductCandidate,
  RecommendationApiRequest,
  SelectionProductRecommendation,
  SelectionRecommendationResult,
} from "@/types/review-radar";
import {
  brandAppearsOnlyAsMeasurement,
  brandEvidenceMatches,
  canonicalBrand,
  inferKnownBrand,
  stripLeadingSourceOrRetailerLabel,
} from "./brandMatching.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { enrichProductAssets } from "./productAssets.ts";
import {
  exactModelIdentifiers,
  haveConflictingNamedModelVariants,
  haveConflictingNumericProductSpecs,
  namedModelVariantTokens,
  stableModelIdentifiers,
} from "./productIdentity.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import {
  classifyProductEligibility,
  normalizeProductEligibilityUrl,
} from "./productEligibility.ts";
import { sourceUrlPathIdentitySegments } from "./sourceUrlIdentity.ts";
import {
  hasUnrequestedNonNewCondition,
  likelyAccessory,
  prefilterProductCandidates,
  searchProductPages,
  searchShoppingProducts,
  type ProductSearchExecutionOptions,
} from "./productSearch.ts";
import { parseMaxBudgetAmount } from "./priceParsing.ts";
import { throwIfRequestCancelled } from "./requestCancellation.ts";
import {
  matchSemanticFeatureEvidence,
  semanticAliasesFor,
} from "./semanticMatching.ts";
import { isNonProductSource } from "./search/sourceSafety.ts";
import {
  neutralShoppingQueries,
  type MarketScoutPlan,
  type MarketScoutTarget,
} from "./marketScout.ts";
import {
  evaluateSpecConstraint,
  extractSpecsFromText,
} from "./specExtraction.ts";

const MAX_NEUTRAL_SEARCH_QUERIES = 3;
const MAX_MARKET_TARGET_SEARCH_QUERIES = 3;
const MAX_DISCOVERY_SEARCH_QUERIES =
  MAX_NEUTRAL_SEARCH_QUERIES + MAX_MARKET_TARGET_SEARCH_QUERIES;
const MAX_TOTAL_SEARCH_QUERIES = 15;
const MAX_VERIFICATION_CANDIDATES = 9;
const VERIFICATION_WAVE_SIZE = 3;
const MAX_PAGE_ALTERNATIVES_PER_CANDIDATE = 2;
const MAX_PREFILTERED_CANDIDATES = MAX_VERIFICATION_CANDIDATES * 8;
const MAX_RECOMMENDATIONS = 5;

type SelectionAssetCandidate = {
  availabilityTrust?: ProductAvailabilityTrust;
  candidate: RawProductCandidate;
  category: string;
  imageUrl: string;
  metadata: ProductMetadata;
  name: string;
  pageUrl: string;
  priceTrust?: ProductPriceTrust;
};

type AcceptedSelection = {
  asset: SelectionAssetCandidate;
  recommendation: SelectionProductRecommendation;
};

export type ProductSelectionTelemetry = {
  assetCandidates: number;
  candidatesAfterHardFilters: number;
  candidatesDiscovered: number;
  candidatesReturned: number;
  duplicateCandidatesRemoved: number;
  logicalSearchCalls: number;
  marketEvidenceCandidates: number;
  marketTargets: Array<{
    aliases: string[];
    brand: string;
    consensusOrder: number;
    model: string;
    sourceCount: number;
    tier: "strong" | "supported";
  }>;
  marketTargetQueries: string[];
  neutralQueries: string[];
  physicalSearchAttempts: number;
  queries: string[];
  rankedCandidates: Array<{
    bayesianRating: number | null;
    evidenceTier: "strong" | "supported" | null;
    name: string;
    offerCount: number | null;
    price: number | null;
    productUrl: string;
    rating: number | null;
    ratingCount: number | null;
    retailer: string | null;
  }>;
  rejectedByAssetSafety: number;
  rejectedByAvailability: number;
  rejectedByCondition: number;
  rejectedByMerchant: number;
  rejectedByPrice: number;
  rejectedByRequirements: number;
  resolutionDiagnostics: Array<{
    discoveryName: string;
    pageCandidates: Array<{
      name: string;
      score: number;
      url: string;
    }>;
    status: "direct" | "query_budget_exhausted" | "resolved" | "unresolved";
  }>;
  resolutionQueries: string[];
  returnedCandidateSignals: Array<{
    bayesianRating: number | null;
    consensusOrder: number | null;
    evidenceTier: "strong" | "supported" | null;
    identityEvidenceSources: Array<{
      snippet: string;
      snippetProvenance?: "query-derived" | "source-derived";
      title: string;
      url: string;
    }>;
    name: string;
    offerCount: number | null;
    productPageUrl: string;
    rating: number | null;
    ratingCount: number | null;
    targetBrand: string | null;
    targetModel: string | null;
  }>;
  searchDiagnostics: Array<{
    errorKind?: string;
    query: string;
    rawShoppingResults: number;
    rejectionReasons: Record<string, number>;
    returnedCandidates: number;
  }>;
  verificationWaves: Array<{
    acceptedCandidates: number;
    candidateNames: string[];
    cumulativeAcceptedCandidates: number;
    cumulativeLogicalSearchCalls: number;
    rejectedByAssetSafety: number;
    rejectedByAvailability: number;
    rejectedByCondition: number;
    rejectedByPrice: number;
    rejectedByRequirements: number;
    wave: number;
  }>;
  verifiedCandidates: Array<{
    availabilityStatus: string;
    name: string;
    pageUrl: string;
    price: number | null;
    priceStatus: string;
    requirementFailures: string[];
  }>;
};

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateModelTokens(value: string) {
  return stableModelIdentifiers(value);
}

const NON_BRAND_LEADING_WORDS = new Set([
  "best",
  "commercial",
  "cordless",
  "corded",
  "electric",
  "gaming",
  "portable",
  "professional",
  "robot",
  "shop",
  "smart",
  "vac",
  "vacuum",
  "wet",
  "dry",
]);

function leadingBrandCandidate(value: string) {
  const name = stripLeadingSourceOrRetailerLabel(value).trim();
  const firstToken = name.match(/^([A-Za-z][A-Za-z0-9+&.'-]{1,30})\b/)?.[1];
  if (!firstToken) return null;

  const normalized = normalizedText(firstToken);
  if (
    !normalized ||
    NON_BRAND_LEADING_WORDS.has(normalized) ||
    /\d/.test(normalized) ||
    /^(?:gal|gallon|hp|hz|inch|peak|psi|volt|watt)$/i.test(normalized)
  ) {
    return null;
  }

  return canonicalBrand(firstToken);
}

function selectionBrand(candidate: RawProductCandidate) {
  const leading = leadingBrandCandidate(candidate.name);
  if (leading) return leading;

  const knownFromName = inferKnownBrand(candidate.name);
  if (
    knownFromName &&
    !brandAppearsOnlyAsMeasurement(candidate.name, knownFromName)
  ) {
    return knownFromName;
  }

  const supplied = candidate.brand?.trim() || "";
  if (
    supplied &&
    brandEvidenceMatches(candidate.name, supplied) &&
    !brandAppearsOnlyAsMeasurement(candidate.name, supplied)
  ) {
    return canonicalBrand(supplied);
  }

  return null;
}

const MODEL_CONFIGURATION_UNITS = new Set([
  "gb",
  "tb",
  "hz",
  "mah",
  "w",
  "watt",
  "watts",
  "v",
  "volt",
  "volts",
]);

function modelIdentityWords(value: string, brand: string) {
  const brandWords = new Set(normalizedText(brand).split(" ").filter(Boolean));
  const words = normalizedText(value).split(" ").filter(Boolean);
  const identityWords: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if (brandWords.has(word)) continue;
    if (/^\d+(?:\.\d+)?(?:gb|tb|hz|mah|w|v)$/.test(word)) continue;
    if (/^\d+(?:\.\d+)?$/.test(word) && MODEL_CONFIGURATION_UNITS.has(next)) {
      index += 1;
      continue;
    }
    identityWords.push(word);
  }

  return identityWords;
}

function containsContiguousWords(observed: string[], expected: string[]) {
  if (expected.length === 0 || observed.length < expected.length) return false;
  return observed.some((_, start) =>
    expected.every((word, offset) => observed[start + offset] === word),
  );
}

function requiredModelQualifiers(value: string) {
  const normalized = normalizedText(value)
    .replace(/\bgeneration\s*(\d+)\b/g, "gen$1")
    .replace(/\bgen\s*(\d+)\b/g, "gen$1");
  return [
    ...(normalized.match(/\bgen\d+\b/g) || []),
    ...(normalized.match(/\b20\d{2}\b/g) || []),
  ];
}

function modelLabelMatchesCandidate(
  candidateName: string,
  label: string,
  targetBrand: string,
) {
  if (
    haveConflictingNamedModelVariants(label, candidateName) ||
    haveConflictingNumericProductSpecs(label, candidateName)
  ) {
    return false;
  }
  const normalizedCandidateName = normalizedText(candidateName)
    .replace(/\bgeneration\s*(\d+)\b/g, "gen$1")
    .replace(/\bgen\s*(\d+)\b/g, "gen$1");
  if (
    requiredModelQualifiers(label).some(
      (qualifier) => !normalizedCandidateName.includes(qualifier),
    )
  ) {
    return false;
  }

  const brandWords = new Set(normalizedText(targetBrand).split(" "));
  const targetIdentifiers = exactModelIdentifiers(label).filter(
    (identifier) => !brandWords.has(identifier),
  );
  const candidateIdentifiers = new Set(exactModelIdentifiers(candidateName));
  const candidateWords = normalizedCandidateName.split(" ").filter(Boolean);
  for (let start = 0; start < candidateWords.length; start += 1) {
    let combined = "";
    for (
      let end = start;
      end < Math.min(candidateWords.length, start + 3);
      end += 1
    ) {
      combined += candidateWords[end];
      if (
        combined.length <= 32 &&
        /[a-z]/.test(combined) &&
        /\d/.test(combined)
      ) {
        candidateIdentifiers.add(combined);
      }
    }
  }
  if (targetIdentifiers.length > 0) {
    return targetIdentifiers.every((identifier) => {
      if (candidateIdentifiers.has(identifier)) return true;
      if (identifier.length < 3) return false;
      return [...candidateIdentifiers].some(
        (observed) =>
          observed.startsWith(identifier) &&
          observed.slice(identifier.length) === "b",
      );
    });
  }

  const expectedWords = modelIdentityWords(label, targetBrand);
  const observedWords = normalizedText(candidateName).split(" ").filter(Boolean);
  if (expectedWords.length === 0) return false;
  if (containsContiguousWords(observedWords, expectedWords)) return true;

  return (
    expectedWords.length >= 2 &&
    expectedWords.every((word) => observedWords.includes(word)) &&
    containsContiguousWords(observedWords, expectedWords.slice(0, 2))
  );
}

function identifierKind(identifier: string) {
  if (/^\d+$/.test(identifier)) return "numeric";
  if (/^[a-z]\d{1,2}$/.test(identifier)) return "short_alphanumeric";
  if (/^[a-z]+$/.test(identifier)) return "alpha";
  return "mixed";
}

function compatibleIdentifier(first: string, second: string) {
  if (first === second) return true;
  if (first.length < 3 || second.length < 3) return false;
  const [shorter, longer] =
    first.length <= second.length ? [first, second] : [second, first];
  return (
    longer.startsWith(shorter) &&
    longer.slice(shorter.length) === "b"
  );
}

function primaryIdentityConflictsWithLabel(
  primaryIdentity: string,
  label: string,
  targetBrand: string,
) {
  const brandWords = new Set(normalizedText(targetBrand).split(" "));
  const targetIdentifiers = exactModelIdentifiers(label).filter(
    (identifier) => !brandWords.has(identifier),
  );
  const primaryIdentifiers = exactModelIdentifiers(primaryIdentity).filter(
    (identifier) => !brandWords.has(identifier),
  );

  return primaryIdentifiers.some((observed) => {
    if (
      targetIdentifiers.some((target) =>
        compatibleIdentifier(target, observed),
      )
    ) {
      return false;
    }
    return targetIdentifiers.some(
      (target) => identifierKind(target) === identifierKind(observed),
    );
  });
}

function candidateMatchesTarget(
  candidate: RawProductCandidate,
  target: MarketScoutTarget,
) {
  const primaryIdentityText = [
    candidate.name,
    ...sourceUrlPathIdentitySegments(candidate.productUrl),
  ].join(" ");
  const labels = [target.model, ...target.aliases];
  const brandWords = new Set(normalizedText(target.brand).split(" "));
  const specificIdentifiers = (label: string) =>
    exactModelIdentifiers(label).filter(
      (identifier) => !brandWords.has(identifier),
    );
  const identityBearingLabels =
    specificIdentifiers(target.model).length > 0
      ? labels.filter((label) => specificIdentifiers(label).length > 0)
      : labels;
  let matchingLabels = identityBearingLabels.filter((label) =>
    modelLabelMatchesCandidate(primaryIdentityText, label, target.brand),
  );
  if (
    matchingLabels.length === 0 &&
    candidateHasDirectProductPage(candidate)
  ) {
    const sourceIdentityText = (candidate.evidenceSources || [])
      .filter(
        (source) =>
          !source.snippetProvenance ||
          source.snippetProvenance === "source-derived",
      )
      .map((source) => `${source.title} ${source.snippet}`)
      .join(" ");
    if (sourceIdentityText) {
      matchingLabels = identityBearingLabels.filter(
        (label) =>
          !primaryIdentityConflictsWithLabel(
            primaryIdentityText,
            label,
            target.brand,
          ) &&
          modelLabelMatchesCandidate(sourceIdentityText, label, target.brand),
      );
    }
  }
  if (matchingLabels.length === 0) return false;

  const candidateBrand = selectionBrand(candidate);
  const targetBrand = normalizedText(canonicalBrand(target.brand));
  if (
    candidateBrand &&
    normalizedText(canonicalBrand(candidateBrand)) === targetBrand
  ) {
    return true;
  }

  const explicitKnownBrand = inferKnownBrand(candidate.name);
  if (
    explicitKnownBrand &&
    normalizedText(canonicalBrand(explicitKnownBrand)) !== targetBrand
  ) {
    return false;
  }

  const suppliedBrand = normalizedText(canonicalBrand(candidate.brand || ""));
  if (!suppliedBrand) {
    const pageHost = parsedPageUrl(candidate.productUrl)?.hostname || "";
    return brandMatchesHost(target.brand, pageHost);
  }
  if (suppliedBrand !== targetBrand) return false;
  if (!candidateBrand) return true;

  const inferredLeadingBrand = normalizedText(canonicalBrand(candidateBrand));
  return matchingLabels.some(
    (label) =>
      normalizedText(modelIdentityWords(label, target.brand)[0] || "") ===
      inferredLeadingBrand,
  );
}

function candidateHasDirectProductPage(candidate: RawProductCandidate) {
  return classifyProductEligibility({
    brand: candidate.brand,
    category: candidate.category,
    imageUrl: candidate.imageUrl,
    name: candidate.name,
    price: candidate.price,
    retailer: candidate.retailer,
    sourceTitle: candidate.name,
    sourceType: "serper",
    url: candidate.productUrl,
  }).canRenderAsProductCard;
}

function tierScore(tier: "none" | "strong" | "supported" | undefined) {
  return tier === "strong" ? 2 : tier === "supported" ? 1 : 0;
}

function matchingMarketTarget(
  candidate: RawProductCandidate,
  targets: MarketScoutTarget[],
) {
  return targets
    .filter((target) => candidateMatchesTarget(candidate, target))
    .sort(
      (first, second) =>
        tierScore(second.evidenceTier) - tierScore(first.evidenceTier) ||
        first.consensusOrder - second.consensusOrder,
    )[0];
}

function attachMarketEvidence(
  candidates: RawProductCandidate[],
  targets: MarketScoutTarget[],
) {
  return candidates.map((candidate) => {
    const target = matchingMarketTarget(candidate, targets);
    if (!target || target.evidenceTier === "none") return candidate;
    return {
      ...candidate,
      marketEvidence: {
        consensusOrder: target.consensusOrder,
        sourceUrls: [...target.sourceUrls],
        targetBrand: target.brand,
        targetModel: target.model,
        tier: target.evidenceTier,
      },
    } satisfies RawProductCandidate;
  });
}

function marketTargetSearchQuery(
  input: RecommendationApiRequest,
  target: MarketScoutTarget,
) {
  return [target.brand, target.model, baseProductCategoryFromQuery(input.query)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function marketTargetResolutionQuery(
  input: RecommendationApiRequest,
  target: MarketScoutTarget,
  discoveryCandidates: RawProductCandidate[],
) {
  const merchantOffer = discoveryCandidates.find(
    (candidate) =>
      candidate.currentShoppingOffer === true &&
      Boolean(primaryRetailerName(candidate.retailer)),
  );
  return merchantOffer
    ? productPageSearchQuery(
        merchantOffer,
        baseProductCategoryFromQuery(input.query),
      )
    : marketTargetSearchQuery(input, target);
}

function targetResolutionCandidatesFor(
  candidates: RawProductCandidate[],
  target: MarketScoutTarget,
  budgetLimit: number | null,
) {
  return candidates
    .filter((candidate) => candidateMatchesTarget(candidate, target))
    .map((candidate, originalIndex) => ({
      candidate,
      inBudget:
        candidate.price !== null &&
        (budgetLimit === null || candidate.price <= budgetLimit),
      merchantScore: merchantTrustScore(candidate),
      originalIndex,
      ratingCount: candidate.commerceSignals?.ratingCount || 0,
    }))
    .sort(
      (first, second) =>
        Number(second.inBudget) - Number(first.inBudget) ||
        Number(second.candidate.currentShoppingOffer === true) -
          Number(first.candidate.currentShoppingOffer === true) ||
        second.merchantScore - first.merchantScore ||
        second.ratingCount - first.ratingCount ||
        first.originalIndex - second.originalIndex,
    )
    .map(({ candidate }) => candidate);
}

function marketTargetsNeedingSearch(
  discovered: RawProductCandidate[],
  targets: MarketScoutTarget[],
) {
  return targets
    .filter(
      (target) =>
        target.evidenceTier !== "none" &&
        !discovered.some((candidate) => candidateMatchesTarget(candidate, target)),
    )
    .sort(
      (first, second) =>
        tierScore(second.evidenceTier) - tierScore(first.evidenceTier) ||
        first.consensusOrder - second.consensusOrder,
    )
    .slice(0, MAX_MARKET_TARGET_SEARCH_QUERIES);
}

function primaryRetailerName(value: string | null | undefined) {
  return (value || "").split(/\s+(?:-|–|—|\||·)\s+/)[0]?.trim() || "";
}

function merchantTrustScore(candidate: RawProductCandidate) {
  const retailer = primaryRetailerName(candidate.retailer);
  const compactRetailer = normalizedText(retailer).replace(/\s+/g, "");
  if (!compactRetailer || isSecondaryMarketCandidate(candidate)) return 0;

  if (
    REPUTABLE_PRODUCT_PAGE_DOMAINS.some((domain) => {
      const merchant = normalizedText(
        domain.replace(/\.(?:com|org|net)$/, ""),
      ).replace(/\s+/g, "");
      return (
        merchant.length >= 4 &&
        (compactRetailer.includes(merchant) ||
          merchant.includes(compactRetailer))
      );
    })
  ) {
    return 3;
  }

  const brand = normalizedText(selectionBrand(candidate) || "").replace(
    /\s+/g,
    "",
  );
  if (
    brand.length >= 4 &&
    (compactRetailer.includes(brand) || brand.includes(compactRetailer))
  ) {
    return 2;
  }

  return /\.(?:com|net|org)\b/i.test(retailer) ? 1 : 0;
}

function resolutionAuthorityScore(candidate: RawProductCandidate) {
  return (
    (candidateHasUsablePage(candidate) ? 4 : 0) +
    (candidateModelTokens(candidate.name).length > 0 ? 2 : 0) +
    (selectionBrand(candidate) ? 1 : 0)
  );
}

function bayesianCommerceRating(
  signals: RawProductCandidate["commerceSignals"],
) {
  const rating = signals?.rating;
  const count = signals?.ratingCount;
  if (
    rating === null ||
    rating === undefined ||
    count === null ||
    count === undefined ||
    !Number.isFinite(rating) ||
    !Number.isSafeInteger(count) ||
    rating < 0 ||
    rating > 5 ||
    count < 0
  ) {
    return null;
  }
  return (rating * count + 4.0 * 50) / (count + 50);
}

function commerceVolume(candidate: RawProductCandidate) {
  return {
    offerCount: candidate.commerceSignals?.offerCount || 0,
    ratingCount: candidate.commerceSignals?.ratingCount || 0,
  };
}

function rankCandidates(
  candidates: RawProductCandidate[],
  targets: MarketScoutTarget[],
  input: RecommendationApiRequest,
) {
  return attachMarketEvidence(candidates, targets)
    .map((candidate, originalIndex) => ({
      bayesianRating:
        bayesianCommerceRating(candidate.commerceSignals) ??
        Number.NEGATIVE_INFINITY,
      candidate,
      consensusOrder:
        candidate.marketEvidence?.consensusOrder ?? Number.POSITIVE_INFINITY,
      discoveryOrder: candidate.discoveryOrder ?? originalIndex,
      evidenceScore: tierScore(candidate.marketEvidence?.tier),
      merchantScore: merchantTrustScore(candidate),
      offerCount: commerceVolume(candidate).offerCount,
      preferenceScore: candidatePreferenceScore(candidate, input),
      ratingCount: commerceVolume(candidate).ratingCount,
      resolutionScore: resolutionAuthorityScore(candidate),
      originalIndex,
    }))
    .sort((first, second) => {
      return (
        second.evidenceScore - first.evidenceScore ||
        second.preferenceScore - first.preferenceScore ||
        first.consensusOrder - second.consensusOrder ||
        second.bayesianRating - first.bayesianRating ||
        second.ratingCount - first.ratingCount ||
        second.offerCount - first.offerCount ||
        second.resolutionScore - first.resolutionScore ||
        second.merchantScore - first.merchantScore ||
        first.discoveryOrder - second.discoveryOrder ||
        first.originalIndex - second.originalIndex
      );
    })
    .map(({ candidate }) => candidate);
}

function selectVerificationCandidates(
  candidates: RawProductCandidate[],
  maximum: number,
) {
  if (maximum <= 0) return [];

  const selected: RawProductCandidate[] = [];
  const deferred: RawProductCandidate[] = [];
  const seenOffers = new Set<string>();
  const identityCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const identity = discoveryIdentityKey(candidate);
    const maximumForIdentity = candidate.marketEvidence ? 2 : 1;
    if ((identityCounts.get(identity) || 0) >= maximumForIdentity) continue;
    const offer = verificationOfferKey(candidate);
    if (seenOffers.has(offer)) continue;
    seenOffers.add(offer);
    identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);

    const brand = normalizedText(selectionBrand(candidate) || "");
    if (brand && (brandCounts.get(brand) || 0) >= 2) {
      deferred.push(candidate);
      continue;
    }

    selected.push(candidate);
    if (brand) brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    if (selected.length >= maximum) return selected;
  }

  for (const candidate of deferred) {
    selected.push(candidate);
    if (selected.length >= maximum) break;
  }

  return selected;
}

function discoveryIdentityKey(candidate: RawProductCandidate) {
  const brand = normalizedText(selectionBrand(candidate) || "");
  const models = candidateModelTokens(candidate.name).sort();
  const variants = namedModelVariantTokens(candidate.name).sort();
  return models.length > 0
    ? `${brand}|${models.join("|")}|${variants.join("|")}`
    : normalizedText(candidate.name);
}

function candidateMerchantKey(candidate: RawProductCandidate) {
  const parsed = parsedPageUrl(candidate.productUrl);
  const host = parsed?.hostname.toLowerCase().replace(/^www\./, "") || "";
  const retailer = normalizedText(primaryRetailerName(candidate.retailer));
  return `${host}|${retailer}`;
}

function verificationOfferKey(candidate: RawProductCandidate) {
  return `${discoveryIdentityKey(candidate)}|${candidateMerchantKey(candidate)}`;
}

function strongerMarketEvidence(
  first: RawProductCandidate["marketEvidence"],
  second: RawProductCandidate["marketEvidence"],
) {
  if (!first) return second;
  if (!second) return first;
  return (
    tierScore(second.tier) > tierScore(first.tier) ||
    (second.tier === first.tier &&
      second.consensusOrder < first.consensusOrder)
  )
    ? second
    : first;
}

function strongerCommerceSignals(
  first: RawProductCandidate["commerceSignals"],
  second: RawProductCandidate["commerceSignals"],
) {
  if (!first) return second;
  if (!second) return first;
  const firstRatingCount = first.ratingCount || 0;
  const secondRatingCount = second.ratingCount || 0;
  if (secondRatingCount !== firstRatingCount) {
    return secondRatingCount > firstRatingCount ? second : first;
  }
  const firstOffers = first.offerCount || 0;
  const secondOffers = second.offerCount || 0;
  if (secondOffers !== firstOffers) return secondOffers > firstOffers ? second : first;
  return (second.position ?? Number.POSITIVE_INFINITY) <
    (first.position ?? Number.POSITIVE_INFINITY)
    ? second
    : first;
}

function dedupeSelectionCandidates(candidates: RawProductCandidate[]) {
  const seen = new Map<string, RawProductCandidate>();
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const key = discoveryIdentityKey(candidate);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, candidate);
      continue;
    }
    duplicateCount += 1;
    const existingHasDirectPage = candidateHasUsablePage(existing);
    const candidateHasDirectPage = candidateHasUsablePage(candidate);
    const primary =
      candidateHasDirectPage && !existingHasDirectPage ? candidate : existing;
    const secondary = primary === existing ? candidate : existing;
    const earliestDiscoveryOrder = Math.min(
      primary.discoveryOrder ?? Number.POSITIVE_INFINITY,
      secondary.discoveryOrder ?? Number.POSITIVE_INFINITY,
    );
    const mergedCommerceSignals = strongerCommerceSignals(
      primary.commerceSignals,
      secondary.commerceSignals,
    );
    const mergedMarketEvidence = strongerMarketEvidence(
      primary.marketEvidence,
      secondary.marketEvidence,
    );
    seen.set(key, {
      ...primary,
      availableColors: Array.from(
        new Set([...primary.availableColors, ...secondary.availableColors]),
      ),
      evidenceSources: [
        ...primary.evidenceSources,
        ...secondary.evidenceSources,
      ],
      ...(mergedCommerceSignals ? { commerceSignals: mergedCommerceSignals } : {}),
      ...(Number.isFinite(earliestDiscoveryOrder)
        ? { discoveryOrder: earliestDiscoveryOrder }
        : {}),
      imageUrl: primary.imageUrl || secondary.imageUrl,
      keySpecs: Array.from(
        new Set([...primary.keySpecs, ...secondary.keySpecs]),
      ).slice(0, 10),
      ...(mergedMarketEvidence ? { marketEvidence: mergedMarketEvidence } : {}),
      price: primary.price ?? secondary.price,
    });
  }

  return { candidates: [...seen.values()], duplicateCount };
}

function dedupeVerificationCandidates(candidates: RawProductCandidate[]) {
  const evidencedOffers = new Set<string>();
  const retained: RawProductCandidate[] = [];
  const ordinary: RawProductCandidate[] = [];

  for (const candidate of candidates) {
    if (!candidate.marketEvidence) {
      ordinary.push(candidate);
      continue;
    }
    const offer = verificationOfferKey(candidate);
    if (evidencedOffers.has(offer)) continue;
    evidencedOffers.add(offer);
    retained.push(candidate);
  }

  const dedupedOrdinary = dedupeSelectionCandidates(ordinary);
  return {
    candidates: [...retained, ...dedupedOrdinary.candidates],
    duplicateCount:
      candidates.length - retained.length - dedupedOrdinary.candidates.length,
  };
}

function interleaveSearchCandidates(
  candidateGroups: RawProductCandidate[][],
) {
  const interleaved: RawProductCandidate[] = [];
  const maximumLength = Math.max(0, ...candidateGroups.map((group) => group.length));
  for (let index = 0; index < maximumLength; index += 1) {
    for (const group of candidateGroups) {
      const candidate = group[index];
      if (candidate) interleaved.push(candidate);
    }
  }
  return interleaved;
}

function candidateModel(candidate: RawProductCandidate) {
  const models = candidateModelTokens(candidate.name);
  return models.length === 1 ? models[0] : undefined;
}

function productPageSearchQuery(
  candidate: RawProductCandidate,
  category: string,
) {
  const models = candidateModelTokens(candidate.name);
  const catalogModels = hyphenatedCatalogModelTokens(candidate.name);
  const targetModel = candidate.marketEvidence?.targetModel || "";
  if (models.length > 0 || catalogModels.length > 0 || targetModel) {
    return [
      selectionBrand(candidate),
      targetModel,
      ...models,
      ...catalogModels,
      ...namedModelVariantTokens(candidate.name),
      category,
      candidate.currentShoppingOffer
        ? primaryRetailerName(candidate.retailer)
        : "",
      "product page",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return `"${candidate.name}" ${candidate.retailer || ""} product page`
    .replace(/\s+/g, " ")
    .trim();
}

function candidateHasUsablePage(candidate: RawProductCandidate) {
  let pageIdentityEvidence = candidate.productUrl;
  try {
    pageIdentityEvidence = decodeURIComponent(pageIdentityEvidence);
  } catch {
    // The undecoded URL still provides bounded identity evidence.
  }
  if (
    haveConflictingNumericProductSpecs(candidate.name, pageIdentityEvidence) ||
    haveConflictingExtractedProductSpecs(candidate.name, pageIdentityEvidence) ||
    hasConflictingProductUrlBrand(candidate)
  ) {
    return false;
  }

  return productPageMatchesIdentity({
    brand: selectionBrand(candidate) || undefined,
    model: candidateModel(candidate),
    pageTitle: candidate.name,
    pageUrl: candidate.productUrl,
    productName: candidate.name,
  });
}

const REPUTABLE_PRODUCT_PAGE_DOMAINS = [
  "acehardware.com",
  "amazon.com",
  "appliancesconnection.com",
  "bhphotovideo.com",
  "bestbuy.com",
  "costco.com",
  "contractorsupplynetwork.com",
  "crateandbarrel.com",
  "crutchfield.com",
  "dickssportinggoods.com",
  "flooranddecor.com",
  "harborfreight.com",
  "homedepot.com",
  "lowes.com",
  "menards.com",
  "microcenter.com",
  "newegg.com",
  "nfm.com",
  "samsclub.com",
  "target.com",
  "tractorsupply.com",
  "walmart.com",
  "wayfair.com",
];

const SECONDARY_MARKET_DOMAINS = [
  "ebay.com",
  "etsy.com",
  "facebook.com",
  "mercari.com",
  "offerup.com",
  "poshmark.com",
];

function isSecondaryMarketCandidate(candidate: RawProductCandidate) {
  const retailer = normalizedText(primaryRetailerName(candidate.retailer));
  if (
    SECONDARY_MARKET_DOMAINS.some((domain) => {
      const merchant = normalizedText(domain.replace(/\.(?:com|org|net)$/, ""));
      return retailer.split(" ").includes(merchant);
    }) ||
    /\b(?:back market|reebelo)\b/.test(retailer) ||
    /\bpawn(?:shop|america)?\b/.test(retailer)
  ) {
    return true;
  }

  const parsed = parsedPageUrl(candidate.productUrl);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return SECONDARY_MARKET_DOMAINS.some((domain) => domainMatches(host, domain));
}

function isNonUsMarketHost(host: string) {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  const topLevelDomain = labels.at(-1) || "";
  if (/^[a-z]{2}$/.test(topLevelDomain) && topLevelDomain !== "us") return true;
  if (labels.length <= 2) return false;
  const marketLabel = labels[0];
  return (
    /^(?:[a-z]{2}|[a-z]{2}-[a-z]{2})$/.test(marketLabel) &&
    !["en-us", "us"].includes(marketLabel)
  );
}

const NON_US_MARKET_PATH_SEGMENTS = new Set([
  "au",
  "ca",
  "cn",
  "de",
  "es",
  "eu",
  "fr",
  "gb",
  "in",
  "it",
  "jp",
  "kr",
  "mx",
  "my",
  "nl",
  "nz",
  "sg",
  "uk",
]);

function isNonUsMarketPath(path: string) {
  const marketSegment = path
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase();
  if (!marketSegment) return false;
  if (NON_US_MARKET_PATH_SEGMENTS.has(marketSegment)) return true;
  return (
    /^[a-z]{2}-[a-z]{2}$/.test(marketSegment) &&
    !marketSegment.split("-").includes("us")
  );
}

function parsedPageUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isNonUsMarketUrl(value: string) {
  const parsed = parsedPageUrl(value);
  return Boolean(
    parsed &&
      (isNonUsMarketHost(parsed.hostname) ||
        isNonUsMarketPath(parsed.pathname)),
  );
}

function domainMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function brandMatchesHost(brand: string | null, host: string) {
  if (!brand) return false;
  const compactBrand = normalizedText(brand).replace(/\s+/g, "");
  const hostLabels = host
    .split(".")
    .slice(0, -1)
    .map((label) => normalizedText(label).replace(/\s+/g, ""));
  return (
    compactBrand.length >= 4 &&
    hostLabels.some(
      (label) => label === compactBrand || label.startsWith(compactBrand),
    )
  );
}

function retailerMatchesHost(retailer: string | null | undefined, host: string) {
  if (!retailer) return false;
  const compactRetailer = normalizedText(primaryRetailerName(retailer)).replace(
    /\s+/g,
    "",
  );
  if (compactRetailer.length < 4) return false;
  return host
    .split(".")
    .slice(0, -1)
    .map((label) => normalizedText(label).replace(/\s+/g, ""))
    .some(
      (label) =>
        label.length >= 4 &&
        (compactRetailer.includes(label) || label.includes(compactRetailer)),
    );
}

function reputableProductPageScore(host: string, path: string) {
  if (
    !REPUTABLE_PRODUCT_PAGE_DOMAINS.some((domain) =>
      domainMatches(host, domain),
    )
  ) {
    return -1;
  }

  const knownRetailerPath =
    domainMatches(host, "amazon.com")
      ? /\/(?:dp|gp\/product)\//.test(path)
      : domainMatches(host, "walmart.com")
        ? /\/ip\//.test(path)
        : domainMatches(host, "homedepot.com")
          ? /\/p\//.test(path) &&
            !/\/p\/(?:answers?|questions?|reviews?)\//.test(path)
          : domainMatches(host, "lowes.com")
            ? /\/pd\//.test(path)
            : domainMatches(host, "target.com")
              ? /\/p\//.test(path)
              : domainMatches(host, "bestbuy.com")
                ? /(?:\/site\/[^/]+\/\d+\.p$|\/product\/[^/]+\/[a-z0-9]+(?:\/sku\/\d+)?$)/.test(
                    path,
                  )
                : domainMatches(host, "newegg.com")
                  ? /\/p\/[a-z0-9]{8,}$/.test(path)
                  : /\/(?:dp|ip|item|p|pd|pdp|product|products|sku|site)\//.test(
                      path,
                    ) || /\d{5,}/.test(path.split("/").pop() || "");
  return knownRetailerPath ? 300 : -1;
}

function hasProductPagePathShape(path: string) {
  return (
    /\/(?:dp|gp\/product|ip|item|p|pd|pdp|product|products|sku|site)\//.test(
      path,
    ) || /\d{5,}/.test(path.split("/").pop() || "")
  );
}

function pageSourceScore(
  candidate: RawProductCandidate,
  expectedBrand = selectionBrand(candidate),
  expectedRetailer = candidate.retailer,
) {
  const parsed = parsedPageUrl(candidate.productUrl);
  if (!parsed) return -1;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.toLowerCase();
  if (
    isNonUsMarketUrl(candidate.productUrl) ||
    SECONDARY_MARKET_DOMAINS.some((domain) => domainMatches(host, domain)) ||
    isNonProductSource(candidate.productUrl) ||
    /\/(?:discontinued|partsaccessories)(?:[/._-]|$)/.test(path) ||
    /\/(?:answers?|article|best-|blog|browse|categories?|collections?|compare|deals?|guide|news|questions?|reviews?|roundup|search)(?:[/.\-_]|$)/.test(
      path,
    ) ||
    /\/p\/pl(?:[/.\-_]|$)/.test(path)
  ) {
    return -1;
  }

  const brandPage = brandMatchesHost(expectedBrand, host);
  const retailerScore = reputableProductPageScore(host, path);
  const merchantMatch = retailerMatchesHost(expectedRetailer, host);
  if (merchantMatch && brandPage) return 450;
  if (merchantMatch && retailerScore > 0) return 400;
  if (merchantMatch && hasProductPagePathShape(path)) return 250;
  if (brandPage) return 350;
  if (retailerScore > 0) return retailerScore;

  return -1;
}

const identityNoise = new Set([
  "accessories",
  "cordless",
  "corded",
  "included",
  "product",
  "shop",
  "vacuum",
  "with",
]);

function identityTokens(value: string) {
  return normalizedText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !identityNoise.has(token));
}

function escapeIdentityPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function modelIdentifierShape(value: string) {
  return value.replace(/\d+/g, "#");
}

function productSlugLeadingBrand(value: string) {
  const parsed = parsedPageUrl(value);
  if (!parsed) return null;
  const segments = parsed.pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .filter(Boolean);
  const detailIndex = segments.findIndex((segment) =>
    /^(?:dp|ip|item|p|pd|pdp|product|products|site)$/i.test(segment),
  );
  const slug = detailIndex >= 0 ? segments[detailIndex + 1] || "" : "";
  return slug ? leadingBrandCandidate(slug.replace(/[-_]+/g, " ")) : null;
}

function hasConflictingProductUrlBrand(
  candidate: RawProductCandidate,
  productUrl = candidate.productUrl,
) {
  const expected = normalizedText(selectionBrand(candidate) || "");
  const observed = normalizedText(productSlugLeadingBrand(productUrl) || "");
  return Boolean(expected && observed && expected !== observed);
}

function haveConflictingExtractedProductSpecs(
  firstText: string,
  secondText: string,
) {
  const first = extractSpecsFromText(firstText, "name");
  const second = extractSpecsFromText(secondText, "evidence");
  return Object.entries(first).some(([spec, firstValue]) => {
    const secondValue = second[spec];
    return (
      firstValue?.kind === "numeric" &&
      secondValue?.kind === "numeric" &&
      firstValue.value !== secondValue.value
    );
  });
}

function hyphenatedCatalogModelBases(value: string) {
  return new Set(
    hyphenatedCatalogModelTokens(value).map((model) => model.split(/[-/]/)[0]),
  );
}

function hyphenatedCatalogModelTokens(value: string) {
  return [...new Set(value.match(/\b\d{3,6}[-/]\d{1,4}[a-z]?\b/gi) || [])];
}

function haveConflictingHyphenatedCatalogModels(
  firstText: string,
  secondText: string,
) {
  const first = hyphenatedCatalogModelBases(firstText);
  const second = hyphenatedCatalogModelBases(secondText);
  return (
    first.size > 0 &&
    second.size > 0 &&
    ![...first].some((model) => second.has(model))
  );
}

function hasConflictingPathModelSibling(
  discoveryCandidate: RawProductCandidate,
  pageCandidate: RawProductCandidate,
  pathIdentity: string,
) {
  const targetModels = stableModelIdentifiers(discoveryCandidate.name);
  const titleModels = new Set(stableModelIdentifiers(pageCandidate.name));
  const pathModels = stableModelIdentifiers(pathIdentity);
  return targetModels.some(
    (target) =>
      titleModels.has(target) &&
      pathModels.some(
        (observed) =>
          observed !== target &&
          modelIdentifierShape(observed) === modelIdentifierShape(target),
      ),
  );
}

function officialLetterSuffixModelMatch(
  discoveryCandidate: RawProductCandidate,
  pageCandidate: RawProductCandidate,
) {
  const discoveryBrand = selectionBrand(discoveryCandidate);
  const parsed = parsedPageUrl(pageCandidate.productUrl);
  if (
    !discoveryBrand ||
    !parsed ||
    !brandMatchesHost(discoveryBrand, parsed.hostname.toLowerCase())
  ) {
    return false;
  }

  const discoveryWords = new Set(
    identityTokens(discoveryCandidate.name).filter(
      (token) => !/\d/.test(token) && token !== normalizedText(discoveryBrand),
    ),
  );
  const descriptiveOverlap = identityTokens(pageCandidate.name).filter(
    (token) => discoveryWords.has(token),
  ).length;
  if (descriptiveOverlap < 2) return false;

  let pageIdentity = `${pageCandidate.name} ${pageCandidate.productUrl}`;
  try {
    pageIdentity = decodeURIComponent(pageIdentity);
  } catch {
    // The undecoded URL still provides bounded identity evidence.
  }

  return candidateModelTokens(discoveryCandidate.name)
    .filter(
      (model) =>
        model.length >= 6 && /[a-z]/i.test(model) && /\d/.test(model),
    )
    .some((model) => {
      const parts = model.match(/[a-z]+|\d+/gi) || [];
      if (parts.length < 2) return false;
      const basePattern = parts.map(escapeIdentityPattern).join("[^a-z0-9]*");
      return new RegExp(
        `(?:^|[^a-z0-9])${basePattern}[a-z]{2,8}(?:[^a-z0-9]|$)`,
        "i",
      ).test(pageIdentity);
    });
}

function pageIdentityScore(
  discoveryCandidate: RawProductCandidate,
  pageCandidate: RawProductCandidate,
) {
  let pageIdentityEvidence = `${pageCandidate.name} ${pageCandidate.productUrl}`;
  try {
    pageIdentityEvidence = decodeURIComponent(pageIdentityEvidence);
  } catch {
    // Keep the undecoded URL as identity evidence when it contains malformed escapes.
  }
  const strongestPathIdentity = sourceUrlPathIdentitySegments(
    pageCandidate.productUrl,
  ).sort((first, second) => second.length - first.length)[0] || "";
  if (
    likelyAccessory(`${pageCandidate.name} ${pageCandidate.productUrl}`) ||
    hasConflictingProductUrlBrand(
      discoveryCandidate,
      pageCandidate.productUrl,
    ) ||
    haveConflictingExtractedProductSpecs(
      discoveryCandidate.name,
      pageCandidate.name,
    ) ||
    haveConflictingExtractedProductSpecs(
      discoveryCandidate.name,
      pageCandidate.productUrl,
    ) ||
    haveConflictingHyphenatedCatalogModels(
      discoveryCandidate.name,
      pageIdentityEvidence,
    ) ||
    haveConflictingNamedModelVariants(
      discoveryCandidate.name,
      `${pageCandidate.name} ${pageCandidate.productUrl}`,
    ) ||
    haveConflictingNumericProductSpecs(
      discoveryCandidate.name,
      pageCandidate.name,
    ) ||
    haveConflictingNumericProductSpecs(
      discoveryCandidate.name,
      pageCandidate.productUrl,
    )
  ) {
    return 0;
  }

  const discoveryBrand = selectionBrand(discoveryCandidate);
  const sourceScore = pageSourceScore(
    pageCandidate,
    discoveryBrand,
    discoveryCandidate.retailer,
  );
  if (sourceScore < 0) return 0;

  if (
    productPageMatchesIdentity({
      brand: discoveryBrand || undefined,
      model: candidateModel(discoveryCandidate),
      pageTitle: pageCandidate.name,
      pageUrl: pageCandidate.productUrl,
      productName: discoveryCandidate.name,
    })
  ) {
    return 700 + sourceScore;
  }

  if (officialLetterSuffixModelMatch(discoveryCandidate, pageCandidate)) {
    return 650 + sourceScore;
  }
  if (
    hasConflictingPathModelSibling(
      discoveryCandidate,
      pageCandidate,
      strongestPathIdentity,
    )
  ) {
    return 0;
  }

  const discoveryModels = candidateModelTokens(discoveryCandidate.name);
  const pageIdentityText = (() => {
    try {
      return decodeURIComponent(
        `${pageCandidate.name} ${pageCandidate.productUrl}`,
      ).toLowerCase();
    } catch {
      return `${pageCandidate.name} ${pageCandidate.productUrl}`.toLowerCase();
    }
  })();
  const exactModelMatches = discoveryModels.filter((model) =>
    new RegExp(`(^|[^a-z0-9])${model}([^a-z0-9]|$)`, "i").test(
      pageIdentityText,
    ),
  ).length;
  const normalizedDiscoveryBrand = normalizedText(discoveryBrand || "");
  const pageText = normalizedText(
    `${pageCandidate.name} ${selectionBrand(pageCandidate) || ""} ${pageCandidate.productUrl}`,
  );
  const brandMatches =
    !normalizedDiscoveryBrand || pageText.includes(normalizedDiscoveryBrand);
  if (!brandMatches) return 0;

  if (discoveryModels.length > 0) {
    return exactModelMatches > 0
      ? 600 + exactModelMatches * 20 + sourceScore
      : 0;
  }

  const discoveryTokens = identityTokens(discoveryCandidate.name);
  const pageTokens = new Set(identityTokens(pageCandidate.name));
  const tokenMatches = discoveryTokens.filter((token) =>
    pageTokens.has(token),
  ).length;
  const overlap =
    discoveryTokens.length > 0 ? tokenMatches / discoveryTokens.length : 0;
  return overlap >= 0.6 && tokenMatches >= 3
    ? 300 + tokenMatches + sourceScore
    : 0;
}

function resolvedCandidate(
  discoveryCandidate: RawProductCandidate,
  pageCandidates: RawProductCandidate[],
) {
  return resolvedCandidates(discoveryCandidate, pageCandidates)[0] || null;
}

function resolvedCandidates(
  discoveryCandidate: RawProductCandidate,
  pageCandidates: RawProductCandidate[],
) {
  const seenHosts = new Set<string>();
  const rankedPages = pageCandidates
    .map((candidate) => ({
      candidate,
      score: pageIdentityScore(discoveryCandidate, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score);
  const primary = rankedPages[0];
  const remaining = rankedPages.slice(1).sort((first, second) => {
    const commercePage = (entry: (typeof rankedPages)[number]) => {
      const parsed = parsedPageUrl(entry.candidate.productUrl);
      if (!parsed) return false;
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      return (
        retailerMatchesHost(discoveryCandidate.retailer, host) ||
        reputableProductPageScore(host, parsed.pathname.toLowerCase()) > 0
      );
    };
    return (
      Number(commercePage(second)) - Number(commercePage(first)) ||
      second.score - first.score
    );
  });

  return (primary ? [primary, ...remaining] : []).flatMap(
    ({ candidate: page }) => {
      const pageHost =
        parsedPageUrl(page.productUrl)?.hostname
          .toLowerCase()
          .replace(/^www\./, "") || "";
      if (!pageHost || seenHosts.has(pageHost)) return [];
      seenHosts.add(pageHost);

      const pageMatchesShoppingMerchant = retailerMatchesHost(
        discoveryCandidate.retailer,
        pageHost,
      );
      const pageHasBoundShoppingOffer =
        page.currentShoppingOffer === true &&
        page.price !== null &&
        retailerMatchesHost(page.retailer, pageHost) &&
        candidateHasDirectProductPage(page);
      return [
        {
          ...discoveryCandidate,
          brand: selectionBrand(discoveryCandidate) || selectionBrand(page),
          commerceSignals: pageHasBoundShoppingOffer
            ? page.commerceSignals || discoveryCandidate.commerceSignals
            : discoveryCandidate.commerceSignals,
          evidenceSources: [
            ...discoveryCandidate.evidenceSources,
            ...page.evidenceSources,
          ],
          imageUrl: pageHasBoundShoppingOffer
            ? page.imageUrl || discoveryCandidate.imageUrl
            : discoveryCandidate.imageUrl || page.imageUrl,
          price: pageHasBoundShoppingOffer
            ? page.price
            : pageMatchesShoppingMerchant
              ? discoveryCandidate.price
              : null,
          currentShoppingOffer:
            pageHasBoundShoppingOffer ||
            (pageMatchesShoppingMerchant &&
              discoveryCandidate.currentShoppingOffer === true),
          keySpecs: [
            ...new Set([
              ...discoveryCandidate.keySpecs,
              page.name,
            ]),
          ],
          productUrl: page.productUrl,
          retailer: pageHasBoundShoppingOffer
            ? page.retailer
            : discoveryCandidate.retailer,
        },
      ];
    },
  )
    .slice(0, MAX_PAGE_ALTERNATIVES_PER_CANDIDATE);
}

function targetPageIsUsable(
  candidate: RawProductCandidate,
  target: MarketScoutTarget,
  discoveryCandidates: RawProductCandidate[],
) {
  return (
    candidateMatchesTarget(candidate, target) &&
    (pageSourceScore(candidate, target.brand, null) >= 0 ||
      discoveryCandidates.some(
        (discoveryCandidate) =>
          pageIdentityScore(discoveryCandidate, candidate) > 0,
      ))
  );
}

function hasUnrequestedNonUsVoltage(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const requestText = `${input.query} ${input.priorities || ""}`;
  if (/\b(?:220|230|240)\s*v(?:olt)?\b/i.test(requestText)) return false;

  const candidateText = [
    candidate.name,
    candidate.keySpecs.join(" "),
    candidate.evidenceSources
      .map((source) => `${source.title} ${source.snippet}`)
      .join(" "),
  ].join(" ");
  return /\b(?:220|230|240)\s*v(?:olt)?\b/i.test(candidateText);
}

async function resolveProductPages(options: {
  candidates: RawProductCandidate[];
  category: string;
  executionOptions: ProductSearchExecutionOptions;
  maximumQueries: number;
}) {
  const queries: string[] = [];
  const tasks = options.candidates.map(async (candidate) => {
    if (candidateHasUsablePage(candidate)) {
      return {
        candidates: [candidate],
        diagnostic: {
          discoveryName: candidate.name,
          pageCandidates: [],
          status: "direct" as const,
        },
      };
    }
    if (queries.length >= options.maximumQueries) {
      return {
        candidates: [],
        diagnostic: {
          discoveryName: candidate.name,
          pageCandidates: [],
          status: "query_budget_exhausted" as const,
        },
      };
    }

    const query = productPageSearchQuery(candidate, options.category);
    queries.push(query);
    const pageCandidates = await searchProductPages(
      query,
      options.category,
      options.executionOptions,
    );
    const resolved = resolvedCandidates(candidate, pageCandidates);
    return {
      candidates: resolved,
      diagnostic: {
        discoveryName: candidate.name,
        pageCandidates: pageCandidates.map((pageCandidate) => ({
          name: pageCandidate.name,
          score: pageIdentityScore(candidate, pageCandidate),
          url: pageCandidate.productUrl,
        })),
        status:
          resolved.length > 0 ? ("resolved" as const) : ("unresolved" as const),
      },
    };
  });
  const resolved = await Promise.all(tasks);

  return {
    candidates: resolved.flatMap((entry) => entry.candidates),
    diagnostics: resolved.map((entry) => entry.diagnostic),
    queries,
  };
}

async function processVerificationWaves<TCandidate, TAccepted, TOutcome>(options: {
  acceptedCount: (accepted: TAccepted[]) => number;
  candidates: TCandidate[];
  maximumAccepted: number;
  signal?: AbortSignal;
  verifyWave: (
    candidates: TCandidate[],
    wave: number,
    accepted: TAccepted[],
  ) => Promise<{ accepted: TAccepted[]; outcome: TOutcome }>;
  waveSize: number;
}) {
  const accepted: TAccepted[] = [];
  const outcomes: TOutcome[] = [];

  for (
    let offset = 0, wave = 1;
    offset < options.candidates.length;
    offset += options.waveSize, wave += 1
  ) {
    throwIfRequestCancelled(options.signal);
    const waveCandidates = options.candidates.slice(
      offset,
      offset + options.waveSize,
    );
    const result = await options.verifyWave(waveCandidates, wave, accepted);
    accepted.push(...result.accepted);
    outcomes.push(result.outcome);
    if (options.acceptedCount(accepted) >= options.maximumAccepted) break;
  }

  return { accepted, outcomes };
}

function evidence<T>(
  value: T,
  sourceUrl: string,
  confidence: ProductFieldEvidence<T>["confidence"] = "Medium",
): ProductFieldEvidence<T> {
  return {
    confidence,
    sourceType: "serper",
    sourceUrl,
    value,
    verifiedAt: new Date().toISOString(),
  };
}

function candidateMetadata(candidate: RawProductCandidate): ProductMetadata {
  const sourceUrl =
    candidate.evidenceSources[0]?.url || candidate.productUrl;
  const price = candidate.price;
  const metadata: ProductMetadata = {
    offers:
      price === null
        ? []
        : [
            {
              price: evidence<number | null>(price, sourceUrl),
              priceCurrency: evidence<string | null>("USD", sourceUrl),
            },
          ],
    title: evidence<string | null>(candidate.name, sourceUrl),
  };

  const brand = selectionBrand(candidate);
  if (brand) {
    metadata.brand = evidence<string | null>(brand, sourceUrl);
  }
  if (candidate.imageUrl) {
    metadata.image = evidence<string | null>(candidate.imageUrl, sourceUrl);
  }
  const modelTokens = candidateModelTokens(candidate.name);
  if (modelTokens.length === 1) {
    metadata.modelNumber = evidence<string | null>(modelTokens[0], sourceUrl);
  }

  return metadata;
}

function toAssetCandidate(
  candidate: RawProductCandidate,
  category: string,
): SelectionAssetCandidate {
  return {
    availabilityTrust: candidate.currentShoppingOffer
      ? { source: "shopping_offer", status: "available" }
      : undefined,
    candidate,
    category,
    imageUrl: candidate.imageUrl || "",
    metadata: candidateMetadata(candidate),
    name: candidate.name,
    pageUrl: candidate.productUrl,
  };
}

function maxBudget(input: RecommendationApiRequest) {
  return (
    parseMaxBudgetAmount(input.budget) ??
    parseMaxBudgetAmount(input.query, { requireDollarSignForRanges: true })
  );
}

function productPagePathEvidence(value: string) {
  try {
    return decodeURIComponent(new URL(value).pathname).replace(/[-_/]+/g, " ");
  } catch {
    return "";
  }
}

function selectionEvidenceText(product: SelectionAssetCandidate) {
  const metadata = product.metadata;
  return [
    product.name,
    metadata.title?.value || "",
    metadata.brand?.value || "",
    metadata.modelNumber?.value || "",
    ...(metadata.colors?.value || []),
    ...product.candidate.keySpecs,
    productPagePathEvidence(product.pageUrl),
  ]
    .filter(Boolean)
    .join(" ");
}

function directConstraintMatch(text: string, value: string) {
  const normalizedValue = normalizedText(value);
  const normalizedEvidence = normalizedText(text);
  const displayResolutionAliases: Record<string, RegExp> = {
    "1080p": /\b(?:1080p|1920x1080|full hd|fhd)\b/,
    "1440p": /\b(?:1440p|2560x1440|qhd|wqhd)\b/,
    "2160p": /\b(?:2160p|3840x2160|4k|uhd)\b/,
  };
  if (displayResolutionAliases[normalizedValue]?.test(normalizedEvidence)) {
    return true;
  }
  if (
    normalizedValue === "self emptying" &&
    /\bself empty(?:ing)?\b/.test(normalizedEvidence)
  ) {
    return true;
  }
  if (matchSemanticFeatureEvidence(text, value).status === "pass") return true;
  return semanticAliasesFor(value).some((alias) => {
    const normalizedAlias = normalizedText(alias);
    return normalizedAlias && normalizedEvidence.includes(normalizedAlias);
  });
}

function sizeConstraintMatches(
  product: SelectionAssetCandidate,
  constraint: NonNullable<
    RecommendationApiRequest["extractedRequirements"]
  >["sizeConstraints"][number],
) {
  const dimensions = product.metadata.dimensions;
  if (!dimensions) return false;
  const values =
    constraint.dimension === "any"
      ? [
          dimensions.width?.value,
          dimensions.depth?.value,
          dimensions.height?.value,
        ]
      : constraint.dimension === "length"
        ? []
        : [dimensions[constraint.dimension]?.value];
  const valuesInInches = values
    .filter((value): value is number => typeof value === "number")
    .map((value) => (dimensions.unit === "cm" ? value / 2.54 : value));
  if (valuesInInches.length === 0) return false;
  const targetInches =
    constraint.unit === "ft" ? constraint.value * 12 : constraint.value;
  return valuesInInches.some((value) =>
    constraint.operator === "max"
      ? value <= targetInches
      : value >= targetInches,
  );
}

function selectionRequirementResult(
  product: SelectionAssetCandidate,
  input: RecommendationApiRequest,
) {
  const structured = input.extractedRequirements;
  if (!structured) return { failed: [], isMatch: true };

  const evidenceText = selectionEvidenceText(product);
  const failed: string[] = [];
  for (const constraint of structured.requiredConstraints) {
    if (constraint.type === "budget") continue;
    const matches =
      constraint.type === "brand"
        ? brandEvidenceMatches(evidenceText, constraint.value)
        : directConstraintMatch(evidenceText, constraint.value);
    if (!matches) failed.push(constraint.label);
  }
  for (const constraint of structured.avoidConstraints) {
    if (directConstraintMatch(evidenceText, constraint.value)) {
      failed.push(constraint.label);
    }
  }
  for (const constraint of structured.sizeConstraints) {
    if (!sizeConstraintMatches(product, constraint)) {
      failed.push(constraint.label);
    }
  }

  const productSpecs = extractSpecsFromText(evidenceText, "metadata");
  for (const constraint of structured.specConstraints || []) {
    const status = evaluateSpecConstraint(constraint, productSpecs);
    const isKnownPreferenceConflict =
      constraint.strictness === "soft" &&
      constraint.source !== "avoid" &&
      status === "fail";

    if (
      (constraint.strictness === "hard" && status !== "pass") ||
      isKnownPreferenceConflict
    ) {
      failed.push(constraint.label);
    }
  }

  return { failed, isMatch: failed.length === 0 };
}

function candidatePreferenceScore(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const structured = input.extractedRequirements;
  if (!structured) return 0;
  const evidenceText = [candidate.name, ...candidate.keySpecs].join(" ");
  let score = 0;
  for (const constraint of structured.preferredConstraints) {
    if (directConstraintMatch(evidenceText, constraint.value)) score += 1;
  }
  for (const constraint of structured.specConstraints || []) {
    if (
      constraint.strictness === "soft" &&
      evaluateSpecConstraint(
        constraint,
        extractSpecsFromText(evidenceText, "name"),
      ) === "pass"
    ) {
      score += 1;
    }
  }
  return score;
}

function selectionPreferenceScore(
  product: SelectionAssetCandidate,
  input: RecommendationApiRequest,
) {
  const structured = input.extractedRequirements;
  if (!structured) return 0;
  const evidenceText = selectionEvidenceText(product);
  let score = 0;
  for (const constraint of structured.preferredConstraints) {
    if (directConstraintMatch(evidenceText, constraint.value)) score += 1;
  }
  const productSpecs = extractSpecsFromText(evidenceText, "metadata");
  for (const constraint of structured.specConstraints || []) {
    if (
      constraint.strictness === "soft" &&
      evaluateSpecConstraint(constraint, productSpecs) === "pass"
    ) {
      score += 1;
    }
  }
  return score;
}

function trustedPrice(
  product: SelectionAssetCandidate,
  budgetLimit: number | null,
) {
  const trust = product.priceTrust;
  const price = trust?.price ?? null;
  const usable =
    price !== null &&
    Number.isFinite(price) &&
    price > 0 &&
    (trust?.status === "verified" || trust?.status === "usable");

  if (budgetLimit !== null && (!usable || price > budgetLimit)) {
    return { accepted: false, price: null };
  }

  return {
    accepted: true,
    price: usable ? price : null,
  };
}

function trustedAvailability(product: SelectionAssetCandidate) {
  return product.availabilityTrust?.status === "available";
}

function productIdentityKey(product: SelectionAssetCandidate) {
  const brand = normalizedText(selectionBrand(product.candidate) || "");
  const models = candidateModelTokens(product.name).sort();
  const variants = namedModelVariantTokens(product.name).sort();
  if (models.length > 0) {
    return `${brand}|${models.join("|")}|${variants.join("|")}`;
  }
  return normalizedText(product.name);
}

function rankAcceptedSelections(
  products: AcceptedSelection[],
  input: RecommendationApiRequest,
) {
  return products
    .map((product, originalIndex) => {
      const candidate = product.asset.candidate;
      const volume = commerceVolume(candidate);
      return {
        bayesianRating:
          bayesianCommerceRating(candidate.commerceSignals) ??
          Number.NEGATIVE_INFINITY,
        consensusOrder:
          candidate.marketEvidence?.consensusOrder ?? Number.POSITIVE_INFINITY,
        discoveryOrder: candidate.discoveryOrder ?? originalIndex,
        evidenceScore: tierScore(candidate.marketEvidence?.tier),
        merchantScore: merchantTrustScore(candidate),
        offerCount: volume.offerCount,
        originalIndex,
        preferenceScore: selectionPreferenceScore(product.asset, input),
        product,
        ratingCount: volume.ratingCount,
        resolutionScore: resolutionAuthorityScore(candidate),
      };
    })
    .sort(
      (first, second) =>
        second.evidenceScore - first.evidenceScore ||
        second.preferenceScore - first.preferenceScore ||
        first.consensusOrder - second.consensusOrder ||
        second.bayesianRating - first.bayesianRating ||
        second.ratingCount - first.ratingCount ||
        second.offerCount - first.offerCount ||
        second.resolutionScore - first.resolutionScore ||
        second.merchantScore - first.merchantScore ||
        first.discoveryOrder - second.discoveryOrder ||
        first.originalIndex - second.originalIndex,
    )
    .map(({ product }) => product);
}

function selectDistinctProducts(
  products: AcceptedSelection[],
) {
  const selected: typeof products = [];
  const seenIdentities = new Set<string>();
  const seenPageUrls = new Set<string>();
  const brandCounts = new Map<string, number>();

  const tryAdd = (item: (typeof products)[number], enforceBrandDiversity: boolean) => {
    const identity = productIdentityKey(item.asset);
    const pageUrl = normalizeProductEligibilityUrl(item.asset.pageUrl);
    const brand = normalizedText(selectionBrand(item.asset.candidate) || "unknown");
    if (seenIdentities.has(identity)) return;
    if (pageUrl && seenPageUrls.has(pageUrl)) return;
    if (enforceBrandDiversity && (brandCounts.get(brand) || 0) >= 2) return;
    seenIdentities.add(identity);
    if (pageUrl) seenPageUrls.add(pageUrl);
    brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    selected.push(item);
  };

  for (const product of products) {
    tryAdd(product, true);
    if (selected.length >= MAX_RECOMMENDATIONS) break;
  }
  if (selected.length < MAX_RECOMMENDATIONS) {
    for (const product of products) {
      tryAdd(product, false);
      if (selected.length >= MAX_RECOMMENDATIONS) break;
    }
  }

  return selected.map(({ recommendation }) => recommendation);
}

export async function selectProducts(options: {
  input: RecommendationApiRequest;
  plan: MarketScoutPlan | Promise<MarketScoutPlan>;
  signal?: AbortSignal;
}): Promise<{
  result: SelectionRecommendationResult;
  telemetry: ProductSelectionTelemetry;
}> {
  const { input, signal } = options;
  const budgetLimit = maxBudget(input);
  const neutralQueries = neutralShoppingQueries(input).slice(
    0,
    MAX_NEUTRAL_SEARCH_QUERIES,
  );
  let physicalSearchAttempts = 0;
  const assetRequestCache = new Map();
  const executionOptions: ProductSearchExecutionOptions = {
    onAttempt: () => {
      physicalSearchAttempts += 1;
    },
    requestCache: new Map(),
    signal,
  };
  const neutralSearchPromise = Promise.all(
    neutralQueries.map((query) =>
      searchShoppingProducts(
        query,
        baseProductCategoryFromQuery(input.query),
        executionOptions,
      ),
    ),
  );
  const [neutralSearchResults, plan] = await Promise.all([
    neutralSearchPromise,
    Promise.resolve(options.plan),
  ]);
  throwIfRequestCancelled(signal);
  const neutralDiscovered = interleaveSearchCandidates(
    neutralSearchResults.map((result) => result.candidates),
  );
  const neutralTargetCoverageCandidates = prefilterProductCandidates(
    neutralDiscovered,
    input,
    MAX_PREFILTERED_CANDIDATES,
  ).candidates.filter(
    (candidate) =>
      !isSecondaryMarketCandidate(candidate) &&
      !hasUnrequestedNonUsVoltage(candidate, input),
  );
  throwIfRequestCancelled(signal);
  const searchedTargets = marketTargetsNeedingSearch(
    neutralTargetCoverageCandidates,
    plan.targets,
  );
  const marketTargetQueries = searchedTargets
    .map((target) => marketTargetSearchQuery(input, target))
    .filter(Boolean)
    .slice(0, MAX_MARKET_TARGET_SEARCH_QUERIES);
  const marketTargetSearchResults = await Promise.all(
    marketTargetQueries.map((query) =>
      searchShoppingProducts(
        query,
        baseProductCategoryFromQuery(input.query),
        executionOptions,
      ),
    ),
  );
  const shoppingDiscovered = interleaveSearchCandidates(
    [...neutralSearchResults, ...marketTargetSearchResults].map(
      (result) => result.candidates,
    ),
  );
  const targetResolutionCandidates = prefilterProductCandidates(
    shoppingDiscovered,
    input,
    MAX_PREFILTERED_CANDIDATES,
  ).candidates.filter(
    (candidate) =>
      !isSecondaryMarketCandidate(candidate) &&
      !hasUnrequestedNonUsVoltage(candidate, input),
  );
  const targetResolutionTargets = plan.targets
    .filter(
      (target) =>
        target.evidenceTier === "strong" &&
        !targetResolutionCandidates.some((candidate) =>
          candidateMatchesTarget(candidate, target) &&
          candidateHasDirectProductPage(candidate),
        ),
    )
    .slice(0, MAX_MARKET_TARGET_SEARCH_QUERIES);
  const targetResolutionBindings = targetResolutionTargets.map((target) => ({
    discoveryCandidates: targetResolutionCandidatesFor(
      targetResolutionCandidates,
      target,
      budgetLimit,
    ),
    target,
  }));
  const targetResolutionQueries = targetResolutionBindings.map(
    ({ discoveryCandidates, target }) =>
      marketTargetResolutionQuery(input, target, discoveryCandidates),
  );
  const targetPageSearchResults = await Promise.all(
    targetResolutionQueries.map((query) =>
      searchProductPages(
        query,
        baseProductCategoryFromQuery(input.query),
        executionOptions,
      ),
    ),
  );
  const targetResolvedCandidates = targetPageSearchResults.flatMap<RawProductCandidate>(
    (candidates, index): RawProductCandidate[] => {
      const binding = targetResolutionBindings[index];
      if (!binding) return [];
      const exactPages: RawProductCandidate[] = candidates.filter((candidate) =>
        targetPageIsUsable(
          candidate,
          binding.target,
          binding.discoveryCandidates,
        ),
      );
      const merchantBoundPages = binding.discoveryCandidates.flatMap((candidate) =>
          resolvedCandidates(candidate, exactPages),
        );
      return merchantBoundPages.length > 0 || binding.discoveryCandidates.length > 0
        ? merchantBoundPages
        : exactPages;
    },
  );
  const searchResults = [
    ...neutralSearchResults,
    ...marketTargetSearchResults,
  ].slice(0, MAX_DISCOVERY_SEARCH_QUERIES);
  const queries = [...neutralQueries, ...marketTargetQueries].slice(
    0,
    MAX_DISCOVERY_SEARCH_QUERIES,
  );
  const discovered = attachMarketEvidence(
    [...shoppingDiscovered, ...targetResolvedCandidates].map((candidate, discoveryOrder) => ({
      ...candidate,
      discoveryOrder,
    })),
    plan.targets,
  );
  const deduped = dedupeVerificationCandidates(discovered);
  const prefiltered = prefilterProductCandidates(
    deduped.candidates,
    input,
    MAX_PREFILTERED_CANDIDATES,
  );
  const primaryMarketCandidates = prefiltered.candidates.filter(
    (candidate) => !isSecondaryMarketCandidate(candidate),
  );
  const marketCompatibleCandidates = primaryMarketCandidates.filter(
    (candidate) => !hasUnrequestedNonUsVoltage(candidate, input),
  );
  const ranked = selectVerificationCandidates(
    rankCandidates(marketCompatibleCandidates, plan.targets, input),
    MAX_VERIFICATION_CANDIDATES,
  );
  const category = baseProductCategoryFromQuery(input.query);
  const resolutionDiagnostics: ProductSelectionTelemetry["resolutionDiagnostics"] =
    targetResolutionTargets.map((target, index) => ({
      discoveryName: `${target.brand} ${target.model}`,
      pageCandidates: targetPageSearchResults[index].map((candidate) => ({
        name: candidate.name,
        score: targetPageIsUsable(
          candidate,
          target,
          targetResolutionBindings[index]?.discoveryCandidates || [],
        )
          ? 1
          : 0,
        url: candidate.productUrl,
      })),
      status: targetResolvedCandidates.some((candidate) =>
        candidateMatchesTarget(candidate, target),
      )
        ? "resolved"
        : "unresolved",
    }));
  const resolutionQueries: string[] = [...targetResolutionQueries];
  const verifiedCandidates: ProductSelectionTelemetry["verifiedCandidates"] = [];
  let assetCandidatesCount = 0;
  let rejectedByAssetSafety = 0;
  let rejectedByAvailability = 0;
  let rejectedByCondition = 0;
  let rejectedByPrice = 0;
  let rejectedByRequirements = 0;

  const verification = await processVerificationWaves<
    RawProductCandidate,
    AcceptedSelection,
    ProductSelectionTelemetry["verificationWaves"][number]
  >({
    acceptedCount: (accepted) => selectDistinctProducts(accepted).length,
    candidates: ranked,
    maximumAccepted: MAX_RECOMMENDATIONS,
    signal,
    verifyWave: async (waveCandidates, wave, previouslyAccepted) => {
      const resolved = await resolveProductPages({
        candidates: waveCandidates,
        category,
        executionOptions,
        maximumQueries: Math.max(
          0,
          MAX_TOTAL_SEARCH_QUERIES - queries.length - resolutionQueries.length,
        ),
      });
      resolutionDiagnostics.push(...resolved.diagnostics);
      resolutionQueries.push(...resolved.queries);

      const conditionCompatibleCandidates = resolved.candidates.filter(
        (candidate) => !hasUnrequestedNonNewCondition(candidate, input),
      );
      const assetCandidates = conditionCompatibleCandidates.map((candidate) =>
        toAssetCandidate(candidate, category),
      );
      assetCandidatesCount += assetCandidates.length;
      const enriched = await enrichProductAssets(
        { recommendations: assetCandidates },
        {
          concurrency: VERIFICATION_WAVE_SIZE,
          requestCache: assetRequestCache,
          signal,
        },
      );
      const pageAssets = enriched.recommendations.filter((product) =>
        Boolean(product.pageUrl),
      );
      const availableAssets = pageAssets.filter(trustedAvailability);
      const validAssets = availableAssets.filter(
        (product) => selectionRequirementResult(product, input).isMatch,
      );
      const waveAccepted: AcceptedSelection[] = validAssets.flatMap((asset) => {
        const price = trustedPrice(asset, budgetLimit);
        if (!price.accepted) return [];

        return [
          {
            asset,
            recommendation: {
              category: asset.category,
              imageUrl: asset.imageUrl || null,
              name: asset.name,
              price:
                price.price === null
                  ? null
                  : { amount: price.price, currency: "USD" as const },
              productPageUrl: asset.pageUrl,
            },
          },
        ];
      });
      const waveRejectedByAssetSafety =
        enriched.recommendations.length - pageAssets.length;
      const waveRejectedByCondition =
        resolved.candidates.length - conditionCompatibleCandidates.length;
      const waveRejectedByAvailability =
        pageAssets.length - availableAssets.length;
      const waveRejectedByRequirements =
        availableAssets.length - validAssets.length;
      const waveRejectedByPrice = validAssets.length - waveAccepted.length;
      rejectedByAssetSafety += waveRejectedByAssetSafety;
      rejectedByAvailability += waveRejectedByAvailability;
      rejectedByCondition += waveRejectedByCondition;
      rejectedByRequirements += waveRejectedByRequirements;
      rejectedByPrice += waveRejectedByPrice;
      verifiedCandidates.push(
        ...enriched.recommendations.map((product) => ({
          availabilityStatus: product.availabilityTrust?.status || "unknown",
          name: product.name,
          pageUrl: product.pageUrl,
          price: product.priceTrust?.price ?? null,
          priceStatus: product.priceTrust?.status || "missing",
          requirementFailures: selectionRequirementResult(product, input).failed,
        })),
      );

      return {
        accepted: waveAccepted,
        outcome: {
          acceptedCandidates: waveAccepted.length,
          candidateNames: waveCandidates.map((candidate) => candidate.name),
          cumulativeAcceptedCandidates: selectDistinctProducts([
            ...previouslyAccepted,
            ...waveAccepted,
          ]).length,
          cumulativeLogicalSearchCalls:
            queries.length + resolutionQueries.length,
          rejectedByAssetSafety: waveRejectedByAssetSafety,
          rejectedByAvailability: waveRejectedByAvailability,
          rejectedByCondition: waveRejectedByCondition,
          rejectedByPrice: waveRejectedByPrice,
          rejectedByRequirements: waveRejectedByRequirements,
          wave,
        },
      };
    },
    waveSize: VERIFICATION_WAVE_SIZE,
  });
  const rankedAccepted = rankAcceptedSelections(verification.accepted, input);
  const recommendations = selectDistinctProducts(rankedAccepted);
  const returnedCandidateSignals = recommendations.flatMap((recommendation) => {
    const accepted = rankedAccepted.find(
      (candidate) =>
        normalizeProductEligibilityUrl(candidate.recommendation.productPageUrl) ===
        normalizeProductEligibilityUrl(recommendation.productPageUrl),
    );
    if (!accepted) return [];
    const candidate = accepted.asset.candidate;
    return [
      {
        bayesianRating: bayesianCommerceRating(candidate.commerceSignals),
        consensusOrder: candidate.marketEvidence?.consensusOrder ?? null,
        evidenceTier: candidate.marketEvidence?.tier || null,
        identityEvidenceSources: candidate.evidenceSources.slice(0, 8).map((source) => ({
          snippet: source.snippet.slice(0, 500),
          ...(source.snippetProvenance
            ? { snippetProvenance: source.snippetProvenance }
            : {}),
          title: source.title.slice(0, 300),
          url: source.url,
        })),
        name: recommendation.name,
        offerCount: candidate.commerceSignals?.offerCount ?? null,
        productPageUrl: recommendation.productPageUrl,
        rating: candidate.commerceSignals?.rating ?? null,
        ratingCount: candidate.commerceSignals?.ratingCount ?? null,
        targetBrand: candidate.marketEvidence?.targetBrand || null,
        targetModel: candidate.marketEvidence?.targetModel || null,
      },
    ];
  });

  return {
    result: { recommendations },
    telemetry: {
      assetCandidates: assetCandidatesCount,
      candidatesAfterHardFilters: marketCompatibleCandidates.length,
      candidatesDiscovered: discovered.length,
      candidatesReturned: recommendations.length,
      duplicateCandidatesRemoved: deduped.duplicateCount,
      logicalSearchCalls: queries.length + resolutionQueries.length,
      marketEvidenceCandidates: new Set(
        marketCompatibleCandidates
          .filter((candidate) => Boolean(candidate.marketEvidence))
          .map(discoveryIdentityKey),
      ).size,
      marketTargetQueries,
      marketTargets: plan.targets.flatMap((target) =>
        target.evidenceTier === "none"
          ? []
          : [
              {
                aliases: [...target.aliases],
                brand: target.brand,
                consensusOrder: target.consensusOrder,
                model: target.model,
                sourceCount: target.sourceUrls.length,
                tier: target.evidenceTier,
              },
            ],
      ),
      neutralQueries,
      physicalSearchAttempts,
      queries,
      rankedCandidates: ranked.map((candidate) => ({
        bayesianRating: bayesianCommerceRating(candidate.commerceSignals),
        evidenceTier: candidate.marketEvidence?.tier || null,
        name: candidate.name,
        offerCount: candidate.commerceSignals?.offerCount ?? null,
        price: candidate.price,
        productUrl: candidate.productUrl,
        rating: candidate.commerceSignals?.rating ?? null,
        ratingCount: candidate.commerceSignals?.ratingCount ?? null,
        retailer: candidate.retailer || null,
      })),
      rejectedByAssetSafety,
      rejectedByAvailability,
      rejectedByCondition,
      rejectedByMerchant:
        prefiltered.candidates.length - primaryMarketCandidates.length,
      rejectedByPrice,
      rejectedByRequirements,
      resolutionDiagnostics,
      resolutionQueries,
      returnedCandidateSignals,
      searchDiagnostics: searchResults.map((searchResult, index) => ({
        ...(searchResult.diagnostics.errorKind
          ? { errorKind: searchResult.diagnostics.errorKind }
          : {}),
        query: queries[index],
        rawShoppingResults: searchResult.diagnostics.rawShoppingResults,
        rejectionReasons: searchResult.diagnostics.rejectionReasons,
        returnedCandidates: searchResult.diagnostics.returnedCandidates,
      })),
      verificationWaves: verification.outcomes,
      verifiedCandidates,
    },
  };
}

export const productSelectionTestExports = {
  attachMarketEvidence,
  bayesianCommerceRating,
  candidateMatchesTarget,
  candidateModelTokens,
  candidateHasUsablePage,
  candidateMetadata,
  dedupeSelectionCandidates,
  dedupeVerificationCandidates,
  discoveryIdentityKey,
  interleaveSearchCandidates,
  isNonUsMarketUrl,
  isSecondaryMarketCandidate,
  maxBudget,
  operationLimits: {
    discoverySearches: MAX_DISCOVERY_SEARCH_QUERIES,
    neutralSearches: MAX_NEUTRAL_SEARCH_QUERIES,
    resolutionCandidates: MAX_VERIFICATION_CANDIDATES,
    targetSearches: MAX_MARKET_TARGET_SEARCH_QUERIES,
    totalLogicalSearches: MAX_TOTAL_SEARCH_QUERIES,
  },
  pageIdentityScore,
  pageSourceScore,
  processVerificationWaves,
  productIdentityKey,
  productPageSearchQuery,
  rankAcceptedSelections,
  rankCandidates,
  resolvedCandidate,
  resolvedCandidates,
  resolveProductPages,
  selectionBrand,
  selectionRequirementResult,
  selectDistinctProducts,
  selectVerificationCandidates,
  marketTargetsNeedingSearch,
  trustedAvailability,
  trustedPrice,
};

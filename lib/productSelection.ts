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
  haveConflictingNamedModelVariants,
  haveConflictingNumericProductSpecs,
  namedModelVariantTokens,
  stableModelIdentifiers,
} from "./productIdentity.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import { normalizeProductEligibilityUrl } from "./productEligibility.ts";
import { sourceUrlPathIdentitySegments } from "./sourceUrlIdentity.ts";
import {
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
import type { SelectionPlan, SelectionTarget } from "./selectionPlanner.ts";
import {
  evaluateSpecConstraint,
  extractSpecsFromText,
} from "./specExtraction.ts";

const MAX_SEARCH_QUERIES = 3;
const MAX_TOTAL_SEARCH_QUERIES = 12;
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
  physicalSearchAttempts: number;
  queries: string[];
  rankedCandidates: Array<{
    name: string;
    price: number | null;
    productUrl: string;
    retailer: string | null;
  }>;
  rejectedByAssetSafety: number;
  rejectedByAvailability: number;
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

function targetTerms(target: SelectionTarget) {
  return [
    `${target.brand} ${target.model}`,
    target.model,
    ...target.aliases,
  ]
    .map(normalizedText)
    .filter(Boolean);
}

function candidateMatchesTarget(
  candidate: RawProductCandidate,
  target: SelectionTarget,
) {
  const candidateText = normalizedText(
    [
      candidate.name,
      candidate.brand || "",
      candidate.keySpecs.join(" "),
      candidate.evidenceSources
        .map((source) => `${source.title} ${source.snippet}`)
        .join(" "),
    ].join(" "),
  );
  const brand = normalizedText(target.brand);

  return (
    (!brand || candidateText.includes(brand)) &&
    targetTerms(target).some((term) => candidateText.includes(term))
  );
}

function targetPriority(candidate: RawProductCandidate, targets: SelectionTarget[]) {
  const index = targets.findIndex((target) =>
    candidateMatchesTarget(candidate, target),
  );
  return index < 0 ? Number.POSITIVE_INFINITY : index;
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

function rankCandidates(
  candidates: RawProductCandidate[],
  targets: SelectionTarget[],
  input: RecommendationApiRequest,
) {
  return candidates
    .map((candidate, originalIndex) => ({
      candidate,
      originalIndex,
      merchantScore: merchantTrustScore(candidate),
      resolutionScore: resolutionAuthorityScore(candidate),
      requirementScore: candidateRequirementScore(candidate, input),
      targetIndex: targetPriority(candidate, targets),
      adjustedIndex:
        originalIndex -
        (Number.isFinite(targetPriority(candidate, targets))
          ? Math.max(1, 3 - targetPriority(candidate, targets))
          : 0),
    }))
    .sort((first, second) => {
      return (
        second.requirementScore - first.requirementScore ||
        second.resolutionScore - first.resolutionScore ||
        second.merchantScore - first.merchantScore ||
        first.adjustedIndex - second.adjustedIndex ||
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
  const seenIdentities = new Set<string>();
  const brandCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const identity = discoveryIdentityKey(candidate);
    if (seenIdentities.has(identity)) continue;
    seenIdentities.add(identity);

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
    seen.set(key, {
      ...primary,
      availableColors: Array.from(
        new Set([...primary.availableColors, ...secondary.availableColors]),
      ),
      evidenceSources: [
        ...primary.evidenceSources,
        ...secondary.evidenceSources,
      ],
      imageUrl: primary.imageUrl || secondary.imageUrl,
      keySpecs: Array.from(
        new Set([...primary.keySpecs, ...secondary.keySpecs]),
      ).slice(0, 10),
      price: primary.price ?? secondary.price,
    });
  }

  return { candidates: [...seen.values()], duplicateCount };
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
  if (models.length > 0) {
    return [
      selectionBrand(candidate),
      ...models,
      ...namedModelVariantTokens(candidate.name),
      category,
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

function parsedPageUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
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
    isNonUsMarketHost(host) ||
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
    haveConflictingNamedModelVariants(
      discoveryCandidate.name,
      `${pageCandidate.name} ${pageCandidate.productUrl}`,
    ) ||
    haveConflictingNumericProductSpecs(
      discoveryCandidate.name,
      pageIdentityEvidence,
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
      return [
        {
          ...discoveryCandidate,
          brand: selectionBrand(discoveryCandidate) || selectionBrand(page),
          evidenceSources: [
            ...discoveryCandidate.evidenceSources,
            ...page.evidenceSources,
          ],
          imageUrl: discoveryCandidate.imageUrl || page.imageUrl,
          price: pageMatchesShoppingMerchant ? discoveryCandidate.price : null,
          currentShoppingOffer:
            pageMatchesShoppingMerchant &&
            discoveryCandidate.currentShoppingOffer === true,
          productUrl: page.productUrl,
        },
      ];
    },
  )
    .slice(0, MAX_PAGE_ALTERNATIVES_PER_CANDIDATE);
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

function selectionEvidenceText(product: SelectionAssetCandidate) {
  const metadata = product.metadata;
  return [
    product.name,
    metadata.title?.value || "",
    metadata.brand?.value || "",
    metadata.modelNumber?.value || "",
    ...(metadata.colors?.value || []),
    ...product.candidate.keySpecs,
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

function candidateRequirementScore(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const structured = input.extractedRequirements;
  if (!structured) return 0;
  const evidenceText = [candidate.name, ...candidate.keySpecs].join(" ");
  let score = 0;
  for (const constraint of structured.requiredConstraints) {
    if (constraint.type === "budget") continue;
    if (directConstraintMatch(evidenceText, constraint.value)) score += 40;
  }
  for (const constraint of structured.preferredConstraints) {
    if (directConstraintMatch(evidenceText, constraint.value)) score += 20;
  }
  for (const constraint of structured.specConstraints || []) {
    if (
      evaluateSpecConstraint(
        constraint,
        extractSpecsFromText(evidenceText, "name"),
      ) === "pass"
    ) {
      score += constraint.strictness === "hard" ? 30 : 12;
    }
  }
  const budgetLimit = maxBudget(input);
  if (
    budgetLimit !== null &&
    candidate.price !== null &&
    candidate.price <= budgetLimit
  ) {
    score += 10;
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
  plan: SelectionPlan;
  signal?: AbortSignal;
}): Promise<{
  result: SelectionRecommendationResult;
  telemetry: ProductSelectionTelemetry;
}> {
  const { input, plan, signal } = options;
  const queries = plan.queries.slice(0, MAX_SEARCH_QUERIES);
  let physicalSearchAttempts = 0;
  const executionOptions: ProductSearchExecutionOptions = {
    onAttempt: () => {
      physicalSearchAttempts += 1;
    },
    signal,
  };
  const searchResults = await Promise.all(
    queries.map((query) =>
      searchShoppingProducts(
        query,
        baseProductCategoryFromQuery(input.query),
        executionOptions,
      ),
    ),
  );
  const discovered = interleaveSearchCandidates(
    searchResults.map((result) => result.candidates),
  );
  const deduped = dedupeSelectionCandidates(discovered);
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
  const budgetLimit = maxBudget(input);
  const resolutionDiagnostics: ProductSelectionTelemetry["resolutionDiagnostics"] = [];
  const resolutionQueries: string[] = [];
  const verifiedCandidates: ProductSelectionTelemetry["verifiedCandidates"] = [];
  let assetCandidatesCount = 0;
  let rejectedByAssetSafety = 0;
  let rejectedByAvailability = 0;
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

      const assetCandidates = resolved.candidates.map((candidate) =>
        toAssetCandidate(candidate, category),
      );
      assetCandidatesCount += assetCandidates.length;
      const enriched = await enrichProductAssets(
        { recommendations: assetCandidates },
        {
          concurrency: VERIFICATION_WAVE_SIZE,
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
      const waveRejectedByAvailability =
        pageAssets.length - availableAssets.length;
      const waveRejectedByRequirements =
        availableAssets.length - validAssets.length;
      const waveRejectedByPrice = validAssets.length - waveAccepted.length;
      rejectedByAssetSafety += waveRejectedByAssetSafety;
      rejectedByAvailability += waveRejectedByAvailability;
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
          rejectedByPrice: waveRejectedByPrice,
          rejectedByRequirements: waveRejectedByRequirements,
          wave,
        },
      };
    },
    waveSize: VERIFICATION_WAVE_SIZE,
  });
  const recommendations = selectDistinctProducts(verification.accepted);

  return {
    result: { recommendations },
    telemetry: {
      assetCandidates: assetCandidatesCount,
      candidatesAfterHardFilters: marketCompatibleCandidates.length,
      candidatesDiscovered: discovered.length,
      candidatesReturned: recommendations.length,
      duplicateCandidatesRemoved: deduped.duplicateCount,
      logicalSearchCalls: queries.length + resolutionQueries.length,
      physicalSearchAttempts,
      queries,
      rankedCandidates: ranked.map((candidate) => ({
        name: candidate.name,
        price: candidate.price,
        productUrl: candidate.productUrl,
        retailer: candidate.retailer || null,
      })),
      rejectedByAssetSafety,
      rejectedByAvailability,
      rejectedByMerchant:
        prefiltered.candidates.length - primaryMarketCandidates.length,
      rejectedByPrice,
      rejectedByRequirements,
      resolutionDiagnostics,
      resolutionQueries,
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
  candidateMatchesTarget,
  candidateModelTokens,
  candidateHasUsablePage,
  candidateMetadata,
  dedupeSelectionCandidates,
  discoveryIdentityKey,
  interleaveSearchCandidates,
  isSecondaryMarketCandidate,
  maxBudget,
  pageIdentityScore,
  pageSourceScore,
  processVerificationWaves,
  productIdentityKey,
  productPageSearchQuery,
  rankCandidates,
  resolvedCandidate,
  resolvedCandidates,
  resolveProductPages,
  selectionBrand,
  selectionRequirementResult,
  selectDistinctProducts,
  selectVerificationCandidates,
  trustedAvailability,
  trustedPrice,
};

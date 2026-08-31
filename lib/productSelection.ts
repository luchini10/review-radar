import type {
  ProductFieldEvidence,
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
  haveConflictingNumericProductSpecs,
  strongModelTokens,
} from "./productIdentity.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import {
  prefilterProductCandidates,
  searchProductPages,
  searchShoppingProducts,
  type ProductSearchExecutionOptions,
} from "./productSearch.ts";
import { parseMaxBudgetAmount } from "./priceParsing.ts";
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
const MAX_TOTAL_SEARCH_QUERIES = 8;
const MAX_ASSET_CANDIDATES = 5;
const MAX_RECOMMENDATIONS = 5;

type SelectionAssetCandidate = {
  candidate: RawProductCandidate;
  category: string;
  imageUrl: string;
  metadata: ProductMetadata;
  name: string;
  pageUrl: string;
  priceTrust?: ProductPriceTrust;
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
  rejectedByAssetSafety: number;
  rejectedByRequirements: number;
  resolutionQueries: string[];
  searchDiagnostics: Array<{
    errorKind?: string;
    query: string;
    rawShoppingResults: number;
    rejectionReasons: Record<string, number>;
    returnedCandidates: number;
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
  return [...strongModelTokens(value)].filter(
    (token) =>
      !/(?:gallon|gallons|inch|inches|peak|volt|volts|watt|watts)$/i.test(token) &&
      !/^\d+(?:hp|hz|rpm|psi)$/i.test(token),
  );
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

function rankCandidates(
  candidates: RawProductCandidate[],
  targets: SelectionTarget[],
  input: RecommendationApiRequest,
) {
  return candidates
    .map((candidate, originalIndex) => ({
      candidate,
      originalIndex,
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
        first.adjustedIndex - second.adjustedIndex ||
        first.originalIndex - second.originalIndex
      );
    })
    .map(({ candidate }) => candidate);
}

function discoveryIdentityKey(candidate: RawProductCandidate) {
  const brand = normalizedText(selectionBrand(candidate) || "");
  const models = candidateModelTokens(candidate.name).sort();
  return models.length > 0
    ? `${brand}|${models.join("|")}`
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
    seen.set(key, {
      ...existing,
      availableColors: Array.from(
        new Set([...existing.availableColors, ...candidate.availableColors]),
      ),
      evidenceSources: [
        ...existing.evidenceSources,
        ...candidate.evidenceSources,
      ],
      imageUrl: existing.imageUrl || candidate.imageUrl,
      keySpecs: Array.from(
        new Set([...existing.keySpecs, ...candidate.keySpecs]),
      ).slice(0, 10),
      price: existing.price ?? candidate.price,
    });
  }

  return { candidates: [...seen.values()], duplicateCount };
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
    return [selectionBrand(candidate), ...models, category, "product page"]
      .filter(Boolean)
      .join(" ");
  }
  return `"${candidate.name}" product page`;
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

function pageSourceScore(candidate: RawProductCandidate) {
  const parsed = parsedPageUrl(candidate.productUrl);
  if (!parsed) return -1;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.toLowerCase();
  if (
    SECONDARY_MARKET_DOMAINS.some((domain) => domainMatches(host, domain)) ||
    isNonProductSource(candidate.productUrl) ||
    /\/(?:article|best-|blog|deal|guide|news|reviews?|roundup)(?:[/.\-_]|$)/.test(
      path,
    )
  ) {
    return -1;
  }

  if (brandMatchesHost(selectionBrand(candidate), host)) return 350;
  if (
    REPUTABLE_PRODUCT_PAGE_DOMAINS.some((domain) =>
      domainMatches(host, domain),
    )
  ) {
    const knownRetailerPath =
      domainMatches(host, "amazon.com")
        ? /\/(?:dp|gp\/product)\//.test(path)
        : domainMatches(host, "walmart.com")
          ? /\/ip\//.test(path)
          : domainMatches(host, "homedepot.com")
            ? /\/p\//.test(path) && !/\/p\/reviews\//.test(path)
            : domainMatches(host, "lowes.com")
              ? /\/pd\//.test(path)
              : domainMatches(host, "target.com")
                ? /\/p\//.test(path)
                : domainMatches(host, "bestbuy.com")
                  ? /(?:\/site\/[^/]+\/\d+\.p$|\/product\/[^/]+\/[a-z0-9]+\/sku\/\d+$)/.test(
                      path,
                    )
                  : /\/(?:dp|ip|item|p|pd|pdp|product|products|sku|site)\//.test(
                      path,
                    ) || /\d{5,}/.test(path.split("/").pop() || "");
    return knownRetailerPath ? 300 : -1;
  }

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
  if (
    haveConflictingNumericProductSpecs(
      discoveryCandidate.name,
      pageIdentityEvidence,
    )
  ) {
    return 0;
  }

  const sourceScore = pageSourceScore(pageCandidate);
  if (sourceScore < 0) return 0;

  const discoveryBrand = selectionBrand(discoveryCandidate);
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
  const page = pageCandidates
    .map((candidate) => ({
      candidate,
      score: pageIdentityScore(discoveryCandidate, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)[0]?.candidate;
  if (!page) return null;

  return {
    ...discoveryCandidate,
    brand: selectionBrand(discoveryCandidate) || selectionBrand(page),
    evidenceSources: [
      ...discoveryCandidate.evidenceSources,
      ...page.evidenceSources,
    ],
    imageUrl: discoveryCandidate.imageUrl || page.imageUrl,
    productUrl: page.productUrl,
  };
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
    if (candidateHasUsablePage(candidate)) return candidate;
    if (queries.length >= options.maximumQueries) return null;

    const query = productPageSearchQuery(candidate, options.category);
    queries.push(query);
    const pageCandidates = await searchProductPages(
      query,
      options.category,
      options.executionOptions,
    );
    const resolved = resolvedCandidate(candidate, pageCandidates);
    return resolved;
  });
  const resolved = await Promise.all(tasks);

  return {
    candidates: resolved.filter(
      (candidate): candidate is RawProductCandidate => candidate !== null,
    ),
    queries,
  };
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
  const sourceUrl = candidate.productUrl;
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
    if (
      constraint.strictness === "hard" &&
      evaluateSpecConstraint(constraint, productSpecs) !== "pass"
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

function productIdentityKey(product: SelectionAssetCandidate) {
  const brand = normalizedText(selectionBrand(product.candidate) || "");
  const models = candidateModelTokens(product.name).sort();
  if (models.length > 0) return `${brand}|${models.join("|")}`;
  return normalizedText(product.name);
}

function selectDistinctProducts(
  products: Array<{
    asset: SelectionAssetCandidate;
    recommendation: SelectionProductRecommendation;
  }>,
) {
  const selected: typeof products = [];
  const seenIdentities = new Set<string>();
  const brandCounts = new Map<string, number>();

  const tryAdd = (item: (typeof products)[number], enforceBrandDiversity: boolean) => {
    const identity = productIdentityKey(item.asset);
    const brand = normalizedText(selectionBrand(item.asset.candidate) || "unknown");
    if (seenIdentities.has(identity)) return;
    if (enforceBrandDiversity && (brandCounts.get(brand) || 0) >= 2) return;
    seenIdentities.add(identity);
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
  const discovered = searchResults.flatMap((result) => result.candidates);
  const deduped = dedupeSelectionCandidates(discovered);
  const prefiltered = prefilterProductCandidates(
    deduped.candidates,
    input,
    MAX_ASSET_CANDIDATES * 3,
  );
  const marketCompatibleCandidates = prefiltered.candidates.filter(
    (candidate) => !hasUnrequestedNonUsVoltage(candidate, input),
  );
  const ranked = rankCandidates(
    marketCompatibleCandidates,
    plan.targets,
    input,
  ).slice(
    0,
    MAX_ASSET_CANDIDATES,
  );
  const resolved = await resolveProductPages({
    candidates: ranked,
    category: baseProductCategoryFromQuery(input.query),
    executionOptions,
    maximumQueries: Math.max(
      0,
      MAX_TOTAL_SEARCH_QUERIES - queries.length,
    ),
  });
  const assetCandidates = resolved.candidates
    .map((candidate) =>
      toAssetCandidate(candidate, baseProductCategoryFromQuery(input.query)),
    );
  const enriched = await enrichProductAssets(
    { recommendations: assetCandidates },
    {
      concurrency: 4,
      signal,
    },
  );
  const validAssets = enriched.recommendations.filter(
    (product) =>
      Boolean(product.pageUrl) &&
      selectionRequirementResult(product, input).isMatch,
  );
  const budgetLimit = maxBudget(input);
  const accepted = validAssets.flatMap((asset) => {
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
  const recommendations = selectDistinctProducts(accepted);

  return {
    result: { recommendations },
    telemetry: {
      assetCandidates: assetCandidates.length,
      candidatesAfterHardFilters: marketCompatibleCandidates.length,
      candidatesDiscovered: discovered.length,
      candidatesReturned: recommendations.length,
      duplicateCandidatesRemoved: deduped.duplicateCount,
      logicalSearchCalls: queries.length + resolved.queries.length,
      physicalSearchAttempts,
      queries,
      rejectedByAssetSafety:
        enriched.recommendations.length -
        enriched.recommendations.filter((product) => product.pageUrl)
          .length,
      rejectedByRequirements:
        enriched.recommendations.filter((product) => product.pageUrl)
          .length - validAssets.length,
      resolutionQueries: resolved.queries,
      searchDiagnostics: searchResults.map((searchResult, index) => ({
        ...(searchResult.diagnostics.errorKind
          ? { errorKind: searchResult.diagnostics.errorKind }
          : {}),
        query: queries[index],
        rawShoppingResults: searchResult.diagnostics.rawShoppingResults,
        rejectionReasons: searchResult.diagnostics.rejectionReasons,
        returnedCandidates: searchResult.diagnostics.returnedCandidates,
      })),
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
  maxBudget,
  pageIdentityScore,
  pageSourceScore,
  productIdentityKey,
  productPageSearchQuery,
  rankCandidates,
  resolvedCandidate,
  selectionBrand,
  selectionRequirementResult,
  selectDistinctProducts,
  trustedPrice,
};

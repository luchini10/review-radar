import type {
  ProductFieldEvidence,
  ProductMetadata,
  ProductRecommendation,
  RawProductCandidate,
  RecommendationApiRequest,
  SearchPlan,
  SearchQueryCandidate,
} from "@/types/review-radar";
import type { SelectedSmartFeature } from "@/types/smart-features";
import {
  brandEvidenceMatches,
  canonicalBrand,
  inferKnownBrand,
} from "../brandMatching.ts";
import { getCachedOrLoad, normalizeCacheKey } from "../cache.ts";
import { candidateMatchesDiscoveryTarget } from "../discoveryStrategy.ts";
import { offFormFactorModifiers } from "../formFactor.ts";
import { baseProductCategoryFromQuery, detectBedSize } from "../productCategory.ts";
import { sanitizeProductPros } from "../productCopySanitizer.ts";
import {
  candidateEligibility,
  classifyProductEligibility,
} from "../productEligibility.ts";
import { classifyProductTypeMatch } from "../productTypeMatch.ts";
import { assessProductPriceTrust } from "../productPriceTrust.ts";
import { parseBestMoneyAmount } from "../priceParsing.ts";
import { getPremiumCap } from "../requirementExtraction.ts";
import { selectedSmartFeatureSearchText } from "../smartFeatureSelection.ts";
import { evaluateSpecConstraint, extractSpecsFromText } from "../specExtraction.ts";
import {
  detectCategoryGroup,
  generateRetailerDomainQueries,
  getSearchDepthConfig,
  getSourcePack,
  type CategoryGroup,
  type DirectRetailerEngine,
  type SearchDepthConfig,
} from "./sourcePacks.ts";
import { sourceTier, SOURCE_NAME_TOKENS } from "./sourceTier.ts";

export const MAX_RESULTS_PER_QUERY = 10;
// Serper often returns more results than requested (especially /shopping).
// Normalization keeps up to this many per response so already-paid-for
// results are not discarded before dedupe and pre-filtering.
export const MAX_NORMALIZED_RESULTS_PER_QUERY = 20;
export const DEFAULT_MAX_RAW_CANDIDATES = 75;

const SERPER_BASE_URL = "https://google.serper.dev";
const SERPER_ENDPOINT_PATHS = {
  images: "/images",
  search: "/search",
  shopping: "/shopping",
  videos: "/videos",
} as const;
const SERPER_REQUEST_TIMEOUT_MS = 8000;
const SERPER_CACHE_TTL_MS = 1000 * 60 * 20;

type SerperVertical = keyof typeof SERPER_ENDPOINT_PATHS;

export type SerperSearchStats = {
  categoryGroup: string;
  generatedQueries: string[];
  selectedSourcePack: string[];
  searchedShoppingQueries: string[];
  searchedOrganicQueries: string[];
  searchedRetailerDomainQueries: string[];
  searchedDirectRetailerQueries: string[];
  shoppingCalls: number;
  organicCalls: number;
  retailerDomainCalls: number;
  directRetailerCalls: number;
  collectedCandidates: number;
  duplicateCandidatesRemoved: number;
  maxEnrichedProducts: number;
  preFilteredCandidates: number;
  rejectedCandidates: number;
  searchDepth: string;
  skippedReason?: "missing_api_key";
  sourceTimeouts: number;
  marketCoverage?: MarketCoverageSnapshot;
  seedSearchesRun: number;
  seedProductNames: string[];
  // Debug-only discovery funnel (names per stage + cheap-filter rejections). Read by
  // the route's stageFunnel debug payload to measure where products are lost. Never
  // affects discovery/ranking.
  funnel?: DiscoveryFunnel;
};

export type DiscoveryFunnel = {
  rawNames: string[]; // every candidate discovered, before dedupe/filter
  dedupedNames: string[]; // after canonical dedupe
  keptNames: string[]; // after the cheap pre-filter
  rejected: Array<{ name: string; reason: string }>; // cut by the cheap filter, with reason
};

export type MarketCoverageSnapshot = {
  candidateCount: number;
  pricedCandidateCount: number;
  rescueQueriesRun: number;
  retailerHostCount: number;
};

export type SerperSearchResult = {
  candidates: RawProductCandidate[];
  stats: SerperSearchStats;
};

type DiscoveryTask = {
  run: () => Promise<RawProductCandidate[]>;
  source: "directRetailer" | "organic" | "retailerDomain" | "shopping";
};

type SerperShoppingResult = {
  title?: unknown;
  link?: unknown;
  productLink?: unknown;
  product_link?: unknown;
  source?: unknown;
  price?: unknown;
  extractedPrice?: unknown;
  extracted_price?: unknown;
  priceRaw?: unknown;
  price_raw?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  thumbnail?: unknown;
  thumbnailUrl?: unknown;
  rating?: unknown;
  ratingCount?: unknown;
  rating_count?: unknown;
  reviews?: unknown;
  snippet?: unknown;
  extensions?: unknown;
  position?: unknown;
};

type SerperOrganicResult = {
  title?: unknown;
  link?: unknown;
  displayedLink?: unknown;
  displayed_link?: unknown;
  imageUrl?: unknown;
  thumbnail?: unknown;
  snippet?: unknown;
  source?: unknown;
  position?: unknown;
};

type SerperImageResult = {
  title?: unknown;
  imageUrl?: unknown;
  link?: unknown;
  source?: unknown;
  thumbnail?: unknown;
  position?: unknown;
};

type SerperVideoResult = {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
  source?: unknown;
  channel?: unknown;
  imageUrl?: unknown;
  thumbnail?: unknown;
  date?: unknown;
  duration?: unknown;
  position?: unknown;
};

export type SerperEvidenceSource = {
  title: string;
  url: string;
  snippet: string;
};

type SerperResponse = {
  images?: SerperImageResult[];
  shopping?: SerperShoppingResult[];
  organic?: SerperOrganicResult[];
  videos?: SerperVideoResult[];
  error?: unknown;
};

const knownColors = [
  "beige",
  "black",
  "blue",
  "brown",
  "charcoal",
  "cream",
  "gray",
  "grey",
  "green",
  "ivory",
  "navy",
  "red",
  "tan",
  "taupe",
  "white",
];

const knownMaterials = [
  "fabric",
  "leather",
  "linen",
  "metal",
  "microfiber",
  "performance fabric",
  "plastic",
  "polyester",
  "velvet",
  "wood",
];

const concreteAvoidTerms = [...knownColors, ...knownMaterials];

const marketplaceOrBigBoxDomains = [
  "amazon.com",
  "aliexpress.com",
  "costco.com",
  "ebay.com",
  "target.com",
  "temu.com",
  "walmart.com",
];

const retailerNameDomains: Record<string, string> = {
  "ace hardware": "acehardware.com",
  "advance auto parts": "advanceautoparts.com",
  "ashley": "ashleyfurniture.com",
  "ashley furniture": "ashleyfurniture.com",
  "backcountry": "backcountry.com",
  "bass pro": "basspro.com",
  "best buy": "bestbuy.com",
  "b&h": "bhphotovideo.com",
  "b and h": "bhphotovideo.com",
  "cabela": "cabelas.com",
  "chewy": "chewy.com",
  "costco": "costco.com",
  "crutchfield": "crutchfield.com",
  "home depot": "homedepot.com",
  "ikea": "ikea.com",
  "lowe": "lowes.com",
  "lowes": "lowes.com",
  "macys": "macys.com",
  "macy": "macys.com",
  "micro center": "microcenter.com",
  "newegg": "newegg.com",
  "nordstrom": "nordstrom.com",
  "petco": "petco.com",
  "petsmart": "petsmart.com",
  "rei": "rei.com",
  "sephora": "sephora.com",
  "target": "target.com",
  "ulta": "ulta.com",
  "walmart": "walmart.com",
  "wayfair": "wayfair.com",
  "zappos": "zappos.com",
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  return match?.[0] ? Number(match[0]) : null;
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return false;
  }

  const pattern = escapeRegExp(normalizedTerm).replace(/\s+/g, "\\s+");

  return new RegExp(`(^|\\s)${pattern}(\\s|$)`, "i").test(text);
}

function normalizeUrlKey(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizedHost(url: URL) {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

function domainMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function domainFromRetailerName(retailer: string | null) {
  const normalizedRetailer = normalizeText(retailer || "");

  if (!normalizedRetailer) {
    return "";
  }

  for (const [name, domain] of Object.entries(retailerNameDomains)) {
    if (normalizedRetailer.includes(name)) {
      return domain;
    }
  }

  return "";
}

function candidateSourceDomains(candidate: RawProductCandidate) {
  const domains = new Set<string>();

  const productUrl = parseUrl(candidate.productUrl);
  if (productUrl) {
    domains.add(normalizedHost(productUrl));
  }

  for (const source of candidate.evidenceSources) {
    const sourceUrl = parseUrl(source.url);

    if (sourceUrl) {
      domains.add(normalizedHost(sourceUrl));
    }
  }

  const retailerDomain = domainFromRetailerName(candidate.retailer);
  if (retailerDomain) {
    domains.add(retailerDomain);
  }

  return Array.from(domains);
}

function isMarketplaceOrBigBoxDomain(domain: string) {
  return marketplaceOrBigBoxDomains.some((marketplaceDomain) =>
    domainMatches(domain, marketplaceDomain),
  );
}

function sourcePackBonusForDomain(
  domain: string,
  categoryGroup: CategoryGroup,
) {
  if (isMarketplaceOrBigBoxDomain(domain)) {
    return 0;
  }

  const sourcePack = getSourcePack(categoryGroup);
  const index = sourcePack.retailerDomains.findIndex((sourceDomain) =>
    domainMatches(domain, sourceDomain),
  );

  if (index < 0) {
    return 0;
  }

  if (index < 3) {
    return 12;
  }

  if (index < 6) {
    return 7;
  }

  if (index < 8) {
    return 3;
  }

  return 0;
}

function candidateSourceQualityScore(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const categoryGroup = detectCategoryGroup(input.query);
  const domains = candidateSourceDomains(candidate);

  if (domains.length === 0) {
    return 0;
  }

  const sourcePackScore = Math.max(
    ...domains.map((domain) => sourcePackBonusForDomain(domain, categoryGroup)),
    0,
  );
  const specialistOrBrandScore = domains.some(
    (domain) => !isMarketplaceOrBigBoxDomain(domain),
  )
    ? 4
    : 0;
  const bigBoxPenalty = domains.some(isMarketplaceOrBigBoxDomain) ? -10 : 0;

  return Math.max(sourcePackScore, specialistOrBrandScore) + bigBoxPenalty;
}

function hashId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return `serper-${hash.toString(36)}`;
}

function parsePrice(value: unknown, fallback: unknown) {
  return (
    parseBestMoneyAmount(value, {
      allowBareNumeric: true,
      allowBareRange: true,
    }) ??
    parseBestMoneyAmount(fallback, {
      allowBareNumeric: true,
      allowBareRange: true,
    })
  );
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function parseReviewCount(value: unknown) {
  return asNumber(value);
}

function extractColors(text: string) {
  const normalized = normalizeText(text);

  return knownColors.filter((color) =>
    new RegExp(`(^|\\W)${color}(\\W|$)`, "i").test(normalized),
  );
}

function extractWidth(text: string) {
  const patterns = [
    /\b(?:width|wide|w)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")\s*(?:w|wide|width)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}

function extractDimension(text: string, dimension: "depth" | "height" | "width") {
  if (dimension === "width") {
    return extractWidth(text);
  }

  const dimensionWords =
    dimension === "depth" ? "(?:depth|deep|d)" : "(?:height|high|tall|h)";
  const patterns = [
    new RegExp(
      `\\b${dimensionWords}\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\b`,
      "i",
    ),
    new RegExp(
      `\\b(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\s*${dimensionWords}\\b`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}

function compact<T>(items: T[]) {
  return items.filter(Boolean);
}

function serperVerticalForSearchType(searchType: string | undefined): SerperVertical {
  if (
    searchType === "images" ||
    searchType === "shopping" ||
    searchType === "videos"
  ) {
    return searchType;
  }

  return "search";
}

function serperEndpointForSearchType(searchType: string | undefined) {
  const vertical = serperVerticalForSearchType(searchType);

  return `${SERPER_BASE_URL}${SERPER_ENDPOINT_PATHS[vertical]}`;
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
) {
  const results: T[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

function serperConcurrency(depth: string) {
  if (depth === "deep") {
    return 6;
  }

  if (depth === "standard") {
    return 4;
  }

  return 3;
}

function cleanMetadataText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function ensureSentencePunctuation(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function titleLooksLikeSpecificProduct(title: string) {
  const normalized = normalizeText(title);
  const genericPatterns = [
    /\bcustomer reviews?\s+for\b/i,
    /\bfor sale\b/i,
    /\byou'?ll love\b/i,
    /\bsearch results?\b/i,
    /\bresults for\b/i,
    /^\s*compare\s+(?:at|prices?|stores?)\b/i,
    /\bcompare\s+at\s+\d+\+?\s+stores\b/i,
    /\bprice comparison\b/i,
    /\bshop\b/i,
    /\bshopping\b/i,
    /\bcategory\b/i,
    /\bcollection\b/i,
    /\bbuy online\b/i,
    /\b(?:buying advice|shopping advice|purchase advice)\b/i,
    /\bthings?\s+to\s+avoid\s+when\s+(?:buying|purchasing|shopping\s+for)\b/i,
    /\bcomplaints?\s+(?:about|for|with|on)\b/i,
    /\breviews?\s*(?:&|and|-|\/)\s*guides?\b/i,
    /\breviews?\s*$/i,
    /\b(?:support article|help library|error code list|troubleshooting|recall notice)\b/i,
    /\b(?:deals?|sales?)\s+20\d{2}\b/i,
    /\b20\d{2}\s+(?:deals?|sales?)\b/i,
    /\b(?:best|top)\s+.+\s+(?:deals?|sales?)\b/i,
    /\b(?:is|are)\s+on\s+sale\b/i,
    /\blowest\s+price\s+ever\b/i,
    /^(?:ranking|ranked)\s+(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^\s*cut\s+in\s+half\b/i,
    /^\s*review\s*:/i,
    /\breview\b\s*(?:\||-|$)/i,
    /\b(?:tried\s+and\s+tested|tested\s+and\s+reviewed|hands[-\s]?on\s+review)\b/i,
    /\b(?:official images|release info|newsroom|built for|colorways?\s+\+\s+release dates|complete guide|franchise history|shuffles?\s+its\s+lineup)\b/i,
    /\b\w+\s+out,\s+\w+.+\s+in\?\s*$/i,
    /\b(?:rule\s+no\.?|court dimensions?|backboard dimensions?|dimensions?\s*(?:&|and)\s*drawings?|equipment\s*-\s*nba official)\b/i,
    /\bthings?\s+to\s+avoid\s+when\s+(?:buying|purchasing|shopping\s+for)\b/i,
    /\bguides?\s*\(20\d{2}\)\b/i,
    /\byours for\b/i,
    /\bi'?ve\s+ever\b/i,
    /^\s*(?:the\s+)?[a-z0-9][^.!?]{5,120}\s+(?:is|are)\s+one\s+of\b/i,
    /^\s*(?:boost|get|level up|make|save|score|snag|turn|up your|upgrade)\b.{0,120}\bwith\s+(?:the|a|an)\b/i,
    /\bunder\s+\$?\d+\b/i,
    /\b(?:shoes|sneakers|boots|sandals|shirts|pants|jackets|chairs|desks|tables|vacuums|appliances|tools|grills|mattresses|sofas|couches|tvs|televisions|laptops)\s+(?:for|from)\s+(?:men|women|kids|top brands|speed|running|basketball|walking|pc gaming)\b/i,
    /^\s*(?:basketball|running|walking|training|tennis|hiking)\s+(?:shoes|sneakers)\s*(?:\||-|for|from)\b/i,
    /^\s*(?:business|gaming)\s+laptops?\s*(?:\||-|for|from)\b/i,
    /\b\d{2,3}\s*(?:inch|in\.?|")\s+(?:tvs?|televisions)\s*(?:\||-|for|from)\b/i,
    /\b(?:desks|refrigerators|microwaves|microwave ovens|countertop microwave ovens|mini fridges|sectional sleeper sofas|sofas|couches|vacuums|gloves)\s*[-|]\s*(?:wayfair|aj madison|the home depot|amazon|walmart|target|lowe'?s|best buy)\b/i,
    /^\s*\$?\d+(?:\.\d+)?\s*(?:to|-)\s*\$?\d+(?:\.\d+)?\b/i,
  ];

  if (genericPatterns.some((pattern) => pattern.test(title))) {
    return false;
  }

  if (title.includes(" / ") && !/\b(?:model|adult|youth|inch|in\.|series|pro)\b/i.test(title)) {
    return false;
  }

  return normalized.split(" ").filter((word) => word.length > 1).length >= 3;
}

function titleHasModelOrSku(title: string) {
  const normalized = normalizeText(title);
  const tokens = normalized.split(" ").filter(Boolean);

  return tokens.some((token) => {
    if (token.length < 4 || token.length > 24) {
      return false;
    }

    if (!/[a-z]/i.test(token) || !/\d/.test(token)) {
      return false;
    }

    return /^[a-z0-9-]+$/i.test(token);
  });
}

function pathLooksLikeProductDetail(url: URL) {
  const path = url.pathname.toLowerCase();
  const normalizedPath = path.replace(/\/+$/, "");
  const productPathPatterns = [
    /\/(?:dp|gp\/product)\//i,
    /\/(?:ip|p|pd|pdp|product|products|item|sku|site)\//i,
  ];

  if (productPathPatterns.some((pattern) => pattern.test(normalizedPath))) {
    return normalizedPath.split("/").filter(Boolean).length >= 2;
  }

  const finalSegment = normalizedPath.split("/").filter(Boolean).pop() || "";

  return (
    finalSegment.length >= 10 &&
    /\d/.test(finalSegment) &&
    /[a-z]/i.test(finalSegment) &&
    !/\b(?:search|results|category|collection|browse|catalog|shop)\b/i.test(finalSegment)
  );
}

function isKnownProductUrl(url: URL) {
  const host = normalizedHost(url);
  const path = url.pathname.toLowerCase();

  if (host.endsWith("amazon.com")) {
    return /\/(?:dp|gp\/product)\//i.test(path);
  }

  if (host.endsWith("walmart.com")) {
    return /\/ip\//i.test(path);
  }

  if (host.endsWith("target.com")) {
    return /\/p\//i.test(path);
  }

  if (host.endsWith("nike.com")) {
    return /\/t\//i.test(path);
  }

  if (host.endsWith("homedepot.com")) {
    return /\/p\//i.test(path) && !/\/p\/reviews\//i.test(path);
  }

  if (host.endsWith("lowes.com")) {
    return /\/pd\//i.test(path);
  }

  if (host.endsWith("bestbuy.com")) {
    return /\/site\//i.test(path) && !/\/site\/questions\//i.test(path);
  }

  if (host.endsWith("wayfair.com")) {
    return /\/pdp\//i.test(path);
  }

  if (host.endsWith("ajmadison.com")) {
    return /\/cgi-bin\/ajmadison\/[^/]+\.html$/i.test(path);
  }

  return false;
}

function isEvidenceOrDiscussionDomain(url: URL) {
  const host = normalizedHost(url);
  const evidenceDomains = [
    "apartmenttherapy.com",
    "bareefers.org",
    "cnet.com",
    "consumerreports.org",
    "devaise.com",
    "facebook.com",
    "forbes.com",
    "goodhousekeeping.com",
    "home-barista.com",
    "instagram.com",
    "laptopmag.com",
    "mashable.com",
    "nytimes.com",
    "pcmag.com",
    "pinterest.com",
    "price.com",
    "popularmechanics.com",
    "reddit.com",
    "runrepeat.com",
    "runnersworld.com",
    "rtings.com",
    "sneakerfiles.com",
    "techradar.com",
    "theverge.com",
    "tomsguide.com",
    "wirecutter.com",
    "windowscentral.com",
    "wwd.com",
    "youtube.com",
    "youtu.be",
  ];

  return evidenceDomains.some((domain) => domainMatches(host, domain));
}

function pathLooksLikeEvidenceOrSupportPage(url: URL) {
  const path = url.pathname.toLowerCase();

  return [
    /\/(?:advice|community|communities|conversation|conversations)\//i,
    /\/(?:article|articles)\//i,
    /\/(?:blog|blogs)\//i,
    /\/(?:forum|forums)\//i,
    /\/(?:help|help-library|support)\//i,
    /\/(?:post|posts|reel|reels)\//i,
    /\/(?:q-a|qa|question|questions)\//i,
    /\/(?:review|reviews)\//i,
    /\/(?:thread|threads)\//i,
    /\/(?:topic|topics)\//i,
    /viewtopic/i,
    /\.pdf$/i,
  ].some((pattern) => pattern.test(path));
}

function isLikelySearchOrListingUrl(url: URL) {
  const host = normalizedHost(url);
  const path = normalizeText(url.pathname);
  const rawPath = url.pathname.toLowerCase();
  const searchKeys = ["k", "q", "query", "search"];

  if (
    searchKeys.some((key) => url.searchParams.has(key)) &&
    /\b(?:s|search|results|sale|shop|browse|category|collection)\b/i.test(path)
  ) {
    return true;
  }

  if (host.endsWith("amazon.com") && !isKnownProductUrl(url)) {
    return true;
  }

  if (host.endsWith("wayfair.com")) {
    return (
      /\/(?:furniture|keyword\.php)\//i.test(rawPath) ||
      /\/sb\d+\//i.test(rawPath) ||
      rawPath.includes("keyword.php")
    ) && !isKnownProductUrl(url);
  }

  if (host.endsWith("ajmadison.com")) {
    return /\/c\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("homedepot.com")) {
    return /\/b\//i.test(rawPath) || /\/p\/reviews\//i.test(rawPath);
  }

  if (host.endsWith("lowes.com")) {
    return /\/(?:c|pl)\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("target.com")) {
    return /\/(?:s|c)\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host === "about.nike.com" || host === "news.nike.com") {
    return true;
  }

  if (host.endsWith("nike.com")) {
    return !/\/t\//i.test(rawPath);
  }

  if (host.endsWith("dickssportinggoods.com")) {
    return /\/(?:a|c|f|s)\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("footlocker.com")) {
    return /\/(?:buy|category|search|collection)\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("walmart.com")) {
    return /\/(?:browse|cp|search)\//i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("bestbuy.com")) {
    return /\/site\/(?:searchpage|shop|collection)\b/i.test(rawPath) && !isKnownProductUrl(url);
  }

  if (host.endsWith("ikea.com")) {
    return /\/(?:cat|rooms|search)\//i.test(rawPath);
  }

  const genericPathPatterns = [
    /\bsearch\b/i,
    /\bresults\b/i,
    /\bcategory\b/i,
    /\bcategories\b/i,
    /\bcollection\b/i,
    /\bcollections\b/i,
    /\bbrowse\b/i,
    /\bcatalog\b/i,
    /\bshop\b/i,
  ];

  return genericPathPatterns.some((pattern) => pattern.test(path));
}

function looksLikeSpecificProductCandidate(input: {
  imageUrl: string;
  price: number | null;
  snippet: string;
  title: string;
  url: string;
}) {
  const parsedUrl = parseUrl(input.url);

  if (!input.title || !parsedUrl || !isHttpUrl(input.url)) {
    return false;
  }

  if (!titleLooksLikeSpecificProduct(input.title)) {
    return false;
  }

  if (isLikelySearchOrListingUrl(parsedUrl)) {
    return false;
  }

  if (isEvidenceOrDiscussionDomain(parsedUrl)) {
    return false;
  }

  if (pathLooksLikeEvidenceOrSupportPage(parsedUrl)) {
    return false;
  }

  if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
    return false;
  }

  const eligibility = classifyProductEligibility({
    imageUrl: input.imageUrl,
    name: input.title,
    price: input.price,
    productName: input.title,
    snippet: input.snippet,
    sourceTitle: input.title,
    sourceType: "serper",
    url: input.url,
  });

  if (!eligibility.canRenderAsProductCard) {
    return false;
  }

  return (
    isKnownProductUrl(parsedUrl) ||
    pathLooksLikeProductDetail(parsedUrl) ||
    titleHasModelOrSku(input.title) ||
    (input.price !== null && Boolean(input.imageUrl && isHttpUrl(input.imageUrl)))
  );
}

function buildCandidateFromResult(input: {
  category: string;
  imageUrl: string;
  price: number | null;
  query: string;
  rating: number | null;
  retailer: string | null;
  reviewCount: number | null;
  snippet: string;
  title: string;
  url: string;
}): RawProductCandidate | null {
  if (!input.title || !isHttpUrl(input.url)) {
    return null;
  }

  if (!looksLikeSpecificProductCandidate(input)) {
    return null;
  }

  const evidenceText = `${input.title} ${input.snippet}`;
  const brand = inferKnownBrand(`${evidenceText} ${input.url} ${input.retailer || ""}`);
  const width = extractWidth(evidenceText);
  const depth = extractDimension(evidenceText, "depth");
  const height = extractDimension(evidenceText, "height");
  const titleColors = extractColors(input.title);
  const availableColors = Array.from(
    new Set(titleColors.length > 0 ? titleColors : extractColors(evidenceText)),
  );
  const keySpecs = compact([
    input.price !== null ? `Price: $${input.price}` : "",
    input.rating !== null ? `Rating: ${input.rating}` : "",
    input.reviewCount !== null ? `Reviews: ${input.reviewCount}` : "",
    width !== null ? `Width: ${width} inches` : "",
    depth !== null ? `Depth: ${depth} inches` : "",
    height !== null ? `Height: ${height} inches` : "",
    availableColors.length > 0
      ? `Available colors mentioned: ${availableColors.join(", ")}`
      : "",
    input.snippet ? `Search snippet: ${cleanMetadataText(input.snippet)}` : "",
  ]).slice(0, 6);

  return {
    id: hashId(`${input.title}|${input.url}`),
    name: input.title,
    brand,
    category: input.category,
    productUrl: input.url,
    imageUrl: input.imageUrl && isHttpUrl(input.imageUrl) ? input.imageUrl : null,
    retailer: input.retailer,
    price: input.price,
    rating: input.rating,
    reviewCount: input.reviewCount,
    availableColors,
    dimensions: {
      width,
      depth,
      height,
      unit: width !== null || depth !== null || height !== null ? "in" : null,
    },
    keySpecs,
    evidenceSources: [
      {
        title: input.title,
        url: input.url,
        snippet:
          input.snippet ||
          `Found by Serper for query "${input.query}". Verify current price and availability before buying.`,
      },
    ],
    requirementCheck: {
      exactMatch: false,
      passed: [],
      failed: [],
      unknown: [],
    },
  };
}

export function normalizeSerperShoppingResults(
  response: SerperResponse,
  query: string,
  category: string,
) {
  return (response.shopping || [])
    .slice(0, MAX_NORMALIZED_RESULTS_PER_QUERY)
    .flatMap((result) => {
      const title = asString(result.title);
      const productUrl = firstString(result.productLink, result.product_link, result.link);
      const snippet = compact([
        asString(result.snippet),
        Array.isArray(result.extensions) ? result.extensions.join(" ") : "",
        asString(result.position) ? `Position: ${asString(result.position)}` : "",
      ]).join(" ");
      const candidate = buildCandidateFromResult({
        category,
        imageUrl: firstString(
          result.imageUrl,
          result.image,
          result.thumbnailUrl,
          result.thumbnail,
        ),
        price: parsePrice(
          result.extractedPrice ?? result.extracted_price ?? result.price,
          result.priceRaw ?? result.price_raw,
        ),
        query,
        rating: asNumber(result.rating),
        retailer: asString(result.source) || null,
        reviewCount:
          parseReviewCount(result.ratingCount) ??
          parseReviewCount(result.rating_count) ??
          parseReviewCount(result.reviews),
        snippet,
        title,
        url: productUrl,
      });

      return candidate ? [candidate] : [];
    });
}

export function normalizeSerperOrganicResults(
  response: SerperResponse,
  query: string,
  category: string,
) {
  return (response.organic || [])
    .slice(0, MAX_RESULTS_PER_QUERY)
    .flatMap((result) => {
      const title = asString(result.title);
      const url = asString(result.link);
      const candidate = buildCandidateFromResult({
        category,
        imageUrl: firstString(result.imageUrl, result.thumbnail),
        price: null,
        query,
        rating: null,
        retailer:
          asString(result.source) ||
          asString(result.displayedLink) ||
          asString(result.displayed_link) ||
          null,
        reviewCount: null,
        snippet: asString(result.snippet),
        title,
        url,
      });

      return candidate ? [candidate] : [];
    });
}

function directResults(response: SerperResponse): Array<Record<string, unknown>> {
  return [
    ...(response.shopping || []),
    ...(response.organic || []),
  ].filter(isRecord);
}

export function normalizeSerperDirectResults(
  response: SerperResponse,
  query: string,
  category: string,
  engine: DirectRetailerEngine,
) {
  return directResults(response)
    .slice(0, MAX_NORMALIZED_RESULTS_PER_QUERY)
    .flatMap((result) => {
      const title = asString(result.title);
      const productUrl = firstString(result.productLink, result.product_link, result.link);
      const snippet = compact([
        asString(result.snippet),
        Array.isArray(result.extensions) ? result.extensions.join(" ") : "",
        `Source: ${engine}`,
      ]).join(" ");
      const candidate = buildCandidateFromResult({
        category,
        imageUrl: firstString(
          result.imageUrl,
          result.image,
          result.thumbnailUrl,
          result.thumbnail,
        ),
        price: parsePrice(
          result.extractedPrice ?? result.extracted_price ?? result.price,
          result.priceRaw ?? result.price_raw,
        ),
        query,
        rating: asNumber(result.rating),
        retailer: asString(result.source) || engine,
        reviewCount:
          parseReviewCount(result.ratingCount) ??
          parseReviewCount(result.rating_count) ??
          parseReviewCount(result.reviews),
        snippet,
        title,
        url: productUrl,
      });

      return candidate ? [candidate] : [];
    });
}

export function normalizeSerperImageSources(
  response: SerperResponse,
  maxResults = 6,
): SerperEvidenceSource[] {
  return (response.images || [])
    .slice(0, maxResults)
    .flatMap((result) => {
      const title = asString(result.title) || "Image result";
      const url = asString(result.link) || asString(result.imageUrl);
      const imageUrl = asString(result.imageUrl) || asString(result.thumbnail);
      const source = asString(result.source);

      if (!isHttpUrl(url)) {
        return [];
      }

      return [
        {
          title,
          url,
          snippet: compact([
            source ? `Source: ${source}` : "",
            imageUrl ? `Image: ${imageUrl}` : "",
            asString(result.position) ? `Position: ${asString(result.position)}` : "",
          ]).join(" "),
        },
      ];
    });
}

export function normalizeSerperVideoSources(
  response: SerperResponse,
  maxResults = 6,
): SerperEvidenceSource[] {
  return (response.videos || [])
    .slice(0, maxResults)
    .flatMap((result) => {
      const title = asString(result.title);
      const url = asString(result.link);
      const snippet = compact([
        asString(result.snippet),
        asString(result.channel) ? `Channel: ${asString(result.channel)}` : "",
        asString(result.source) ? `Source: ${asString(result.source)}` : "",
        asString(result.date) ? `Date: ${asString(result.date)}` : "",
        asString(result.duration) ? `Duration: ${asString(result.duration)}` : "",
      ]).join(" ");

      if (!title || !isHttpUrl(url)) {
        return [];
      }

      return [
        {
          title,
          url,
          snippet,
        },
      ];
    });
}

async function fetchSerper(params: Record<string, string>) {
  const apiKey = process.env.SERPER_API_KEY;
  const query = params.q || params.query;
  const searchType = params.searchType || "search";
  const endpoint = serperEndpointForSearchType(searchType);
  const fallbackEndpoint = serperEndpointForSearchType("search");

  if (!apiKey || !query) {
    return null;
  }

  const cacheKey = normalizeCacheKey([
    "serper",
    serperVerticalForSearchType(searchType),
    query,
    "us",
    "en",
    String(MAX_RESULTS_PER_QUERY),
  ]);

  return getCachedOrLoad(cacheKey, SERPER_CACHE_TTL_MS, async () => {
    const requestBody = JSON.stringify({
      gl: "us",
      hl: "en",
      num: MAX_RESULTS_PER_QUERY,
      q: query,
    });
    const requestHeaders = {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    };
    // Each attempt gets its own AbortController so a timed-out attempt does
    // not poison the retry or the vertical-to-standard fallback request.
    const runRequest = async (url: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        SERPER_REQUEST_TIMEOUT_MS,
      );

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Serper request failed with status ${response.status}`);
        }

        const data = (await response.json()) as SerperResponse;

        if (data.error) {
          throw new Error("Serper returned an error.");
        }

        return data;
      } finally {
        clearTimeout(timeout);
      }
    };
    const runRequestWithRetry = async (url: string) => {
      try {
        return await runRequest(url);
      } catch (error) {
        if (!isTransientSerperError(error)) {
          throw error;
        }

        logSerperWarning("Retrying Serper request after a transient error.", {
          searchType,
          message: error instanceof Error ? error.message : "Unknown error",
        });

        return await runRequest(url);
      }
    };

    try {
      return await runRequestWithRetry(endpoint);
    } catch (error) {
      if (endpoint === fallbackEndpoint) {
        throw error;
      }

      logSerperWarning("Vertical search fell back to standard search.", {
        searchType,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return await runRequest(fallbackEndpoint);
    }
  });
}

function isTransientSerperError(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  // Client errors (4xx) will not succeed on retry; everything else
  // (timeouts/aborts, network failures, 5xx) is worth one more attempt.
  return !/status 4\d\d/.test(error.message);
}

function logSerperWarning(message: string, detail?: unknown) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.warn("[ReviewRadar Serper]", message, detail || "");
}

function directRetailerSiteQuery(engine: DirectRetailerEngine) {
  return engine === "walmart" ? "site:walmart.com" : "site:homedepot.com";
}

export async function searchSerperShopping(
  query: string,
  category = query,
): Promise<RawProductCandidate[]> {
  try {
    const response = await fetchSerper({
      q: query,
      searchType: "shopping",
    });

    if (!response) {
      return [];
    }

    const shoppingCandidates = normalizeSerperShoppingResults(
      response,
      query,
      category,
    );

    return shoppingCandidates.length > 0
      ? shoppingCandidates
      : normalizeSerperOrganicResults(response, query, category);
  } catch (error) {
    logSerperWarning("Shopping search skipped after an API error.", {
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function searchSerperOrganic(
  query: string,
  category = query,
): Promise<RawProductCandidate[]> {
  try {
    const response = await fetchSerper({
      q: query,
      searchType: "organic",
    });

    return response ? normalizeSerperOrganicResults(response, query, category) : [];
  } catch (error) {
    logSerperWarning("Organic search skipped after an API error.", {
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function searchSerperDirectRetailer(
  engine: DirectRetailerEngine,
  query: string,
  category = query,
): Promise<RawProductCandidate[]> {
  try {
    const response = await fetchSerper({
      q: `${directRetailerSiteQuery(engine)} ${query}`,
      searchType: `direct-${engine}`,
    });

    return response
      ? normalizeSerperDirectResults(response, query, category, engine)
      : [];
  } catch (error) {
    logSerperWarning("Direct retailer search skipped after an API error.", {
      engine,
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function searchSerperOrganicEvidence(
  query: string,
  maxResults = 6,
): Promise<SerperEvidenceSource[]> {
  try {
    const response = await fetchSerper({
      q: query,
      searchType: "evidence",
    });

    return response ? normalizeSerperOrganicSources(response, maxResults) : [];
  } catch (error) {
    logSerperWarning("Evidence search skipped after an API error.", {
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export function normalizeSerperOrganicSources(
  response: SerperResponse,
  maxResults = 6,
): SerperEvidenceSource[] {
  return (response.organic || [])
    .slice(0, maxResults)
    .flatMap((result) => {
      const title = asString(result.title);
      const url = asString(result.link);
      const snippet = asString(result.snippet);

      if (!title || !isHttpUrl(url)) {
        return [];
      }

      return [
        {
          title,
          url,
          snippet,
        },
      ];
    });
}

export async function searchSerperImageEvidence(
  query: string,
  maxResults = 6,
): Promise<SerperEvidenceSource[]> {
  try {
    const response = await fetchSerper({
      q: query,
      searchType: "images",
    });

    if (!response) {
      return [];
    }

    const imageSources = normalizeSerperImageSources(response, maxResults);

    return imageSources.length > 0
      ? imageSources
      : normalizeSerperOrganicSources(response, maxResults);
  } catch (error) {
    logSerperWarning("Image evidence search skipped after an API error.", {
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function searchSerperVideoEvidence(
  query: string,
  maxResults = 6,
): Promise<SerperEvidenceSource[]> {
  try {
    const response = await fetchSerper({
      q: query,
      searchType: "videos",
    });

    if (!response) {
      return [];
    }

    const videoSources = normalizeSerperVideoSources(response, maxResults);

    return videoSources.length > 0
      ? videoSources
      : normalizeSerperOrganicSources(response, maxResults);
  } catch (error) {
    logSerperWarning("Video evidence search skipped after an API error.", {
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

function candidateKey(candidate: RawProductCandidate) {
  const urlKey = normalizeUrlKey(candidate.productUrl);
  const nameKey = normalizeText(candidate.name);

  return urlKey || nameKey;
}

function mergeRawCandidateEvidence(
  existing: RawProductCandidate,
  incoming: RawProductCandidate,
) {
  const seenSources = new Set(
    existing.evidenceSources.map((source) => normalizeUrlKey(source.url)),
  );
  const evidenceSources = [
    ...existing.evidenceSources,
    ...incoming.evidenceSources.filter((source) => {
      const key = normalizeUrlKey(source.url);

      if (!key || seenSources.has(key)) {
        return false;
      }

      seenSources.add(key);
      return true;
    }),
  ];

  return {
    ...existing,
    imageUrl: existing.imageUrl || incoming.imageUrl,
    price: existing.price ?? incoming.price,
    rating: existing.rating ?? incoming.rating,
    reviewCount: existing.reviewCount ?? incoming.reviewCount,
    availableColors: Array.from(
      new Set([...existing.availableColors, ...incoming.availableColors]),
    ),
    dimensions: {
      width: existing.dimensions.width ?? incoming.dimensions.width,
      depth: existing.dimensions.depth ?? incoming.dimensions.depth,
      height: existing.dimensions.height ?? incoming.dimensions.height,
      unit: existing.dimensions.unit ?? incoming.dimensions.unit,
    },
    keySpecs: Array.from(new Set([...existing.keySpecs, ...incoming.keySpecs]))
      .slice(0, 10),
    evidenceSources,
  };
}

export function dedupeRawCandidates(candidates: RawProductCandidate[]) {
  const seen = new Map<string, RawProductCandidate>();
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const key = candidateKey(candidate);

    if (!key) {
      continue;
    }

    const existing = seen.get(key);

    if (existing) {
      seen.set(key, mergeRawCandidateEvidence(existing, candidate));
      duplicateCount += 1;
      continue;
    }

    seen.set(key, candidate);
  }

  return {
    candidates: Array.from(seen.values()).slice(0, DEFAULT_MAX_RAW_CANDIDATES),
    duplicateCount,
  };
}

function parseMoneyAmount(value: string) {
  return Number(value.replace(/,/g, ""));
}

function looksLikeDimensionAmount(text: string, matchEndIndex: number) {
  return /^\s*(?:inches|inch|in\.?|")\b/i.test(text.slice(matchEndIndex));
}

function parseBudgetRangeMax(value: string, requireDollarSign: boolean) {
  const rangePatterns = [
    /\bbetween\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:and|to|-|–)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
    /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:-|–|to)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
  ];

  for (const pattern of rangePatterns) {
    for (const match of value.matchAll(pattern)) {
      if (requireDollarSign && !match[0].includes("$")) {
        continue;
      }

      const low = match[1] ? parseMoneyAmount(match[1]) : null;
      const high = match[2] ? parseMoneyAmount(match[2]) : null;

      if (
        low === null ||
        high === null ||
        !Number.isFinite(low) ||
        !Number.isFinite(high) ||
        looksLikeDimensionAmount(value, (match.index || 0) + match[0].length)
      ) {
        continue;
      }

      return Math.max(low, high);
    }
  }

  return null;
}

function parseMaxBudget(
  value: string | undefined,
  requireDollarSignForRanges = false,
) {
  if (!value) {
    return null;
  }

  const text = value;
  const rangeMax = parseBudgetRangeMax(text, requireDollarSignForRanges);

  if (rangeMax !== null) {
    return rangeMax;
  }

  const patterns = [
    /\b(?:under|less than|below|no more than|at most|max|maximum)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
    /\$\s*([\d,]+(?:\.\d+)?)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = match[1] ? parseMoneyAmount(match[1]) : null;

      if (amount === null || !Number.isFinite(amount)) {
        continue;
      }

      if (looksLikeDimensionAmount(text, (match.index || 0) + match[0].length)) {
        continue;
      }

      return amount;
    }
  }

  return null;
}

function maxBudgetFromInput(input: RecommendationApiRequest) {
  const structuredBudget = input.extractedRequirements?.budgetRules.find(
    (rule) => rule.operator === "max" && rule.amount !== null,
  );

  return (
    structuredBudget?.amount ??
    parseMaxBudget(input.budget) ??
    parseMaxBudget(input.query, true)
  );
}

function parseMaxWidth(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /\b(?:under|less than|below|no bigger than|no larger than|at most|max|maximum)\s*(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")/i,
  );

  return match?.[1] ? Number(match[1]) : null;
}

function sizeConstraintsFromInput(input: RecommendationApiRequest): Array<{
  dimension: "depth" | "height" | "length" | "width";
  operator: "max" | "min";
  value: number;
}> {
  const structured = input.extractedRequirements?.sizeConstraints || [];

  if (structured.length > 0) {
    return structured
      .filter(
        (constraint) =>
          constraint.dimension === "width" ||
          constraint.dimension === "depth" ||
          constraint.dimension === "height" ||
          constraint.dimension === "length",
      )
      .map((constraint) => ({
        dimension:
          constraint.dimension === "depth" ||
          constraint.dimension === "height" ||
          constraint.dimension === "length"
            ? constraint.dimension
            : "width",
        operator: constraint.operator,
        value: constraint.value,
      }));
  }

  const maxWidth = parseMaxWidth(input.priorities);

  return maxWidth !== null
    ? [{ dimension: "width" as const, operator: "max" as const, value: maxWidth }]
    : [];
}

function selectedColors(input: RecommendationApiRequest) {
  const selectedFeatureColors = ((input.selectedFeatures || []) as Array<SelectedSmartFeature | string>)
    .filter((feature) =>
      typeof feature === "string"
        ? /^color\s*:/i.test(feature)
        : feature.name.toLowerCase().includes("color"),
    )
    .map((feature) =>
      typeof feature === "string"
        ? feature.split(":").slice(1).join(":").trim().toLowerCase()
        : String(feature.value).trim().toLowerCase(),
    )
    .filter(Boolean);
  const structuredColors = [
    ...(input.extractedRequirements?.colorConstraints || []),
    ...(input.extractedRequirements?.requiredConstraints || []).filter(
      (constraint) => constraint.type === "color",
    ),
  ].map((constraint) => constraint.value.toLowerCase());

  return Array.from(new Set([...selectedFeatureColors, ...structuredColors]));
}

function splitUserList(value: string | undefined) {
  return (value || "")
    .split(/[,;]|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedRequiredFeatureValues(input: RecommendationApiRequest) {
  const smartFeatureValues = (input.selectedFeatures || [])
    .map((feature) => selectedSmartFeatureSearchText(feature))
    .filter(Boolean);
  const structuredFeatureValues = (input.extractedRequirements?.requiredConstraints || [])
    .filter((constraint) => constraint.type === "feature")
    .map((constraint) => constraint.value)
    .filter(Boolean);

  return Array.from(new Set([...smartFeatureValues, ...structuredFeatureValues]));
}

function selectedBrandValues(input: RecommendationApiRequest) {
  return Array.from(
    new Set(
      (input.extractedRequirements?.brandConstraints || [])
        .map((constraint) => canonicalBrand(constraint.value))
        .filter(Boolean),
    ),
  );
}

function normalizeAvoidTerm(value: string) {
  return normalizeText(value)
    .replace(
      /^(?:avoid|no|not|without|do not want|don't want|does not have|must not be|cannot be)\s+/i,
      "",
    )
    .trim();
}

function selectedConcreteAvoidValues(input: RecommendationApiRequest) {
  const explicitAvoids = splitUserList(input.avoid).map(normalizeAvoidTerm);
  const structuredAvoids = (input.extractedRequirements?.avoidConstraints || [])
    .map((constraint) => normalizeAvoidTerm(constraint.value || constraint.label))
    .filter(Boolean);
  const allAvoids = [...explicitAvoids, ...structuredAvoids];

  return Array.from(
    new Set(
      allAvoids.filter((avoid) =>
        concreteAvoidTerms.some((term) => normalizeText(term) === avoid),
      ),
    ),
  );
}

function candidateText(candidate: RawProductCandidate) {
  return normalizeText(
    [
      candidate.name,
      candidate.brand || "",
      candidate.category,
      candidate.retailer || "",
      candidate.availableColors.join(" "),
      candidate.keySpecs.join(" "),
      candidate.evidenceSources.map((source) => source.snippet).join(" "),
    ].join(" "),
  );
}

function candidateEvidenceText(candidate: RawProductCandidate) {
  return normalizeText(
    [
      candidate.name,
      candidate.brand || "",
      candidate.retailer || "",
      candidate.availableColors.join(" "),
      candidate.keySpecs.join(" "),
      candidate.evidenceSources.map((source) => source.snippet).join(" "),
    ].join(" "),
  );
}

function categoryLooksRelevant(candidate: RawProductCandidate, input: RecommendationApiRequest) {
  const text = candidateText(candidate);
  const baseCategory = baseProductCategoryFromQuery(input.query);
  const requirementTerms = new Set(
    (input.extractedRequirements?.requiredConstraints || [])
      .flatMap((constraint) => normalizeText(constraint.value).split(" "))
      .filter(Boolean),
  );
  const ignoredTerms = new Set([
    ...knownColors,
    ...requirementTerms,
    "and",
    "below",
    "best",
    "buy",
    "for",
    "has",
    "less",
    "max",
    "maximum",
    "more",
    "sale",
    "than",
    "under",
    "with",
  ]);
  const queryTerms = normalizeText(baseCategory)
    .split(" ")
    .filter(
      (term) =>
        term.length > 2 &&
        !/^\d+$/.test(term) &&
        !ignoredTerms.has(term),
    );

  if (queryTerms.length === 0) {
    return true;
  }

  return queryTerms.some((term) => text.includes(term));
}

const usedOrRefurbishedPattern =
  /\b(?:refurbished|renewed|re-?certified|pre[-\s]?owned|open[-\s]?box|second[-\s]?hand|used)\b/i;

function userRequestedUsedOrRefurbished(input: RecommendationApiRequest) {
  return usedOrRefurbishedPattern.test(
    `${input.query} ${input.priorities || ""} ${input.avoid || ""}`,
  );
}

function isLikelyUsedOrRefurbished(candidate: RawProductCandidate) {
  return usedOrRefurbishedPattern.test(candidate.name);
}

const accessoryForPattern =
  /\b(?:case|cover|sleeve|skin|screen protector|protector|stand|mount|holder|charger|cable|adapter|remote|filter|bag|belt|blade|attachment|accessory|accessories|part|parts)\s+(?:set\s+)?for\b|\breplacement\s+(?:part|parts|filter|filters|battery|batteries|blade|blades|belt|belts|bag|bags|remote|hose)\b/i;
const accessoryBundleContextPattern = /\b(?:with|includes?|including|and|plus|w)\s*\/?\s*$/i;

function isAccessoryForAnotherProduct(candidate: RawProductCandidate) {
  const match = candidate.name.match(accessoryForPattern);

  if (!match || match.index === undefined) {
    return false;
  }

  // "Drill Kit with Charger for home projects" is a bundle, not an accessory:
  // skip matches that immediately follow bundle words like "with"/"includes".
  const before = candidate.name.slice(Math.max(0, match.index - 14), match.index);

  return !accessoryBundleContextPattern.test(before);
}

function isLikelyAccessory(candidate: RawProductCandidate) {
  const text = candidateText(candidate);
  const accessoryTerms = [
    "replacement",
    "cover only",
    "slipcover",
    "parts",
    "part",
    "adapter",
    "mount",
    "stand only",
    "manual",
    "protector",
  ];

  return accessoryTerms.some((term) => containsNormalizedTerm(text, term));
}

// The structured requirements (specs, size, color) we already extract should
// also tighten the candidate pool — not just the late validation step. These
// reuse the same shared extractors so discovery and validation agree. A
// VERIFIED conflict rejects; thin/unknown candidate text never rejects.
function requiredSizeValue(input: RecommendationApiRequest) {
  return (
    (input.extractedRequirements?.requiredConstraints || []).find(
      (constraint) => constraint.type === "size",
    )?.value || null
  );
}

function requiredColorValues(input: RecommendationApiRequest) {
  const fromRequirements = (input.extractedRequirements?.colorConstraints || []).map(
    (constraint) => normalizeText(constraint.value),
  );

  return Array.from(new Set([...selectedColors(input), ...fromRequirements]));
}

function hardSpecConflict(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const hardSpecs = (input.extractedRequirements?.specConstraints || []).filter(
    (constraint) => constraint.strictness === "hard",
  );

  if (hardSpecs.length === 0) {
    return false;
  }

  const candidateSpecs = extractSpecsFromText(candidateEvidenceText(candidate));

  return hardSpecs.some(
    (constraint) => evaluateSpecConstraint(constraint, candidateSpecs) === "fail",
  );
}

function requiredSizeConflict(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const requiredSize = requiredSizeValue(input);

  if (!requiredSize) {
    return false;
  }

  // Use the candidate's own name (never its echoed category) for size.
  const candidateSize = detectBedSize(candidate.name, { requireContext: false });

  return Boolean(candidateSize && candidateSize !== requiredSize);
}

function candidateDimensionValues(
  candidate: RawProductCandidate,
  dimension: "depth" | "height" | "length" | "width",
) {
  if (dimension !== "length") {
    const value = candidate.dimensions[dimension];

    return value !== null ? [value] : [];
  }

  return Array.from(
    candidateEvidenceText(candidate).matchAll(/\b(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\b/gi),
  )
    .filter(
      (match) =>
        !/\b(?:sq|square|cu|cubic)\s*$/i.test(
          candidateEvidenceText(candidate).slice(
            Math.max(0, (match.index || 0) - 12),
            match.index || 0,
          ),
        ),
    )
    .map((match) => (match[1] ? Number(match[1]) : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function sizeConstraintConflicts(
  constraint: ReturnType<typeof sizeConstraintsFromInput>[number],
  values: number[],
) {
  if (values.length === 0) {
    return false;
  }

  if (constraint.dimension === "length" && constraint.operator === "min") {
    return !values.some((value) => Math.abs(value - constraint.value) < 0.1);
  }

  return values.some(
    (value) =>
      (constraint.operator === "max" && value > constraint.value) ||
      (constraint.operator === "min" && value < constraint.value),
  );
}

function cheapCandidateRejectionReason(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  if (
    !classifyProductTypeMatch({
      evidenceText: candidateEvidenceText(candidate),
      requestedCategory: baseProductCategoryFromQuery(input.query),
    }).canBeExactMatch
  ) {
    return "wrong_category";
  }

  if (!categoryLooksRelevant(candidate, input)) {
    return "wrong_category";
  }

  const requiredBrands = selectedBrandValues(input);

  if (
    requiredBrands.length > 0 &&
    !requiredBrands.some((brand) => brandEvidenceMatches(candidateText(candidate), brand))
  ) {
    return "wrong_brand";
  }

  if (isLikelyAccessory(candidate)) {
    return "accessory_or_part";
  }

  if (isAccessoryForAnotherProduct(candidate)) {
    return "accessory_or_part";
  }

  if (
    !userRequestedUsedOrRefurbished(input) &&
    isLikelyUsedOrRefurbished(candidate)
  ) {
    return "used_or_refurbished";
  }

  const maxBudget = maxBudgetFromInput(input);

  if (maxBudget !== null && candidate.price !== null) {
    // Keep slightly-over-budget candidates available as close matches.
    // Hard budget enforcement for Best Match ranking happens later in
    // requirement validation.
    const premiumCap =
      input.extractedRequirements?.budgetRules[0]?.premiumCap ??
      getPremiumCap(maxBudget, input.query);
    const overBudgetCutoff = Math.max(maxBudget * 1.4, premiumCap ?? 0);

    if (candidate.price > overBudgetCutoff) {
      return "over_budget";
    }
  }

  const requiredColors = requiredColorValues(input);

  if (
    requiredColors.length > 0 &&
    candidate.availableColors.length > 0 &&
    !requiredColors.some((color) => candidate.availableColors.includes(color))
  ) {
    return "wrong_color";
  }

  const avoidedAttributes = selectedConcreteAvoidValues(input);
  const evidenceText = candidateEvidenceText(candidate);

  if (
    avoidedAttributes.length > 0 &&
    avoidedAttributes.some(
      (term) =>
        candidate.availableColors.includes(term) ||
        new RegExp(`(^|\\W)${escapeRegExp(term)}(\\W|$)`, "i").test(evidenceText),
    )
  ) {
    return "avoid_term";
  }

  const sizeConstraints = sizeConstraintsFromInput(input);

  for (const constraint of sizeConstraints) {
    const values = candidateDimensionValues(candidate, constraint.dimension);

    if (sizeConstraintConflicts(constraint, values)) {
      return "wrong_dimensions";
    }
  }

  if (hardSpecConflict(candidate, input)) {
    return "wrong_spec";
  }

  if (requiredSizeConflict(candidate, input)) {
    return "wrong_size";
  }

  return null;
}

function candidateFitScore(candidate: RawProductCandidate, input: RecommendationApiRequest) {
  let score = 0;
  const text = candidateText(candidate);
  const maxBudget = maxBudgetFromInput(input);
  const sizeConstraints = sizeConstraintsFromInput(input);
  const colors = selectedColors(input);

  if (categoryLooksRelevant(candidate, input)) {
    score += 15;
  }

  score += candidateSourceQualityScore(candidate, input);

  const requiredBrands = selectedBrandValues(input);

  if (
    requiredBrands.length > 0 &&
    requiredBrands.some((brand) => brandEvidenceMatches(text, brand))
  ) {
    score += 16;
  } else if (candidate.brand) {
    score += 4;
  }

  if (maxBudget !== null && candidate.price !== null && candidate.price <= maxBudget) {
    score += 15;
  }

  for (const constraint of sizeConstraints) {
    const values = candidateDimensionValues(candidate, constraint.dimension);

    if (
      values.length > 0 &&
      !sizeConstraintConflicts(constraint, values)
    ) {
      score += 10;
    }
  }

  if (
    colors.length > 0 &&
    colors.some((color) => candidate.availableColors.includes(color))
  ) {
    score += 15;
  }

  for (const value of selectedRequiredFeatureValues(input)) {
    if (value && text.includes(normalizeText(value))) {
      score += 10;
    }
  }

  if (candidate.productUrl) {
    score += 5;
  }

  if (candidate.imageUrl) {
    score += 3;
  }

  // Corroboration: a product seen across multiple sources or searches is a
  // stronger candidate than a single isolated listing.
  const corroboratingHosts = new Set(
    candidate.evidenceSources
      .map((source) => {
        const parsed = parseUrl(source.url);

        return parsed ? normalizedHost(parsed) : "";
      })
      .filter(Boolean),
  ).size;

  if (corroboratingHosts > 1) {
    score += Math.min(6, (corroboratingHosts - 1) * 3);
  }

  if (candidate.rating !== null) {
    score += candidate.rating >= 4.5 ? 5 : candidate.rating >= 4.2 ? 3 : 1;
  }

  if (candidate.reviewCount !== null) {
    score += Math.min(12, Math.log10(candidate.reviewCount + 1) * 3);
  }

  if (
    input.discoveryStrategy?.expectedProducts.some((target) =>
      candidateMatchesDiscoveryTarget(candidate, target),
    )
  ) {
    score += 8;
  }

  // Reward candidates whose own text confirms the requested specs/size, so the
  // pool ranks proven matches above unverified ones before final scoring.
  const candidateSpecs = extractSpecsFromText(candidateEvidenceText(candidate));

  for (const constraint of input.extractedRequirements?.specConstraints || []) {
    if (evaluateSpecConstraint(constraint, candidateSpecs) === "pass") {
      score += 8;
    }
  }

  const requiredSizeForFit = requiredSizeValue(input);

  if (
    requiredSizeForFit &&
    detectBedSize(candidate.name, { requireContext: false }) === requiredSizeForFit
  ) {
    score += 10;
  }

  // Deprioritize (never reject) candidates carrying a smaller/niche form factor
  // the user did not request — a tabletop/travel/mini variant is a different
  // product class than the full-size default. Capped so a single marketing word
  // can't sink an otherwise-strong candidate.
  const offFormFactor = offFormFactorModifiers(
    candidateEvidenceText(candidate),
    `${input.query} ${input.priorities || ""}`,
  );

  score -= Math.min(offFormFactor.length, 2) * 8;

  return score;
}

function hardEvidenceTarget(input: RecommendationApiRequest) {
  const target =
    (maxBudgetFromInput(input) !== null ? 1 : 0) +
    (selectedBrandValues(input).length > 0 ? 1 : 0) +
    (selectedColors(input).length > 0 ? 1 : 0) +
    sizeConstraintsFromInput(input).length +
    selectedRequiredFeatureValues(input).length;

  return Math.min(2, target);
}

function hardEvidenceMatchCount(candidate: RawProductCandidate, input: RecommendationApiRequest) {
  let count = 0;
  const text = candidateText(candidate);
  const maxBudget = maxBudgetFromInput(input);

  if (maxBudget !== null && candidate.price !== null && candidate.price <= maxBudget) {
    count += 1;
  }

  const requiredBrands = selectedBrandValues(input);

  if (
    requiredBrands.length > 0 &&
    requiredBrands.some((brand) => brandEvidenceMatches(text, brand))
  ) {
    count += 1;
  }

  const colors = selectedColors(input);

  if (
    colors.length > 0 &&
    colors.some((color) => candidate.availableColors.includes(color))
  ) {
    count += 1;
  }

  for (const constraint of sizeConstraintsFromInput(input)) {
    const values = candidateDimensionValues(candidate, constraint.dimension);

    if (
      values.length > 0 &&
      !sizeConstraintConflicts(constraint, values)
    ) {
      count += 1;
    }
  }

  for (const value of selectedRequiredFeatureValues(input)) {
    if (value && text.includes(normalizeText(value))) {
      count += 1;
    }
  }

  return count;
}

function minimumUsefulFitScore(depth: SearchDepthConfig["depth"]) {
  if (depth === "deep") {
    return 34;
  }

  if (depth === "standard") {
    return 32;
  }

  return 28;
}

function isUsefulCoverageCandidate(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
  depth: SearchDepthConfig["depth"],
) {
  const target = hardEvidenceTarget(input);

  if (target > 0 && hardEvidenceMatchCount(candidate, input) < target) {
    return false;
  }

  return candidateFitScore(candidate, input) >= minimumUsefulFitScore(depth);
}

export function cheapPreFilterRawCandidates(
  candidates: RawProductCandidate[],
  input: RecommendationApiRequest,
  maxCandidates = DEFAULT_MAX_RAW_CANDIDATES,
) {
  const kept: RawProductCandidate[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];

  for (const candidate of candidates) {
    const reason = cheapCandidateRejectionReason(candidate, input);

    if (reason) {
      rejected.push({ name: candidate.name, reason });
      continue;
    }

    kept.push(candidate);
  }

  return {
    candidates: kept
      .sort((first, second) => candidateFitScore(second, input) - candidateFitScore(first, input))
      .slice(0, maxCandidates),
    rejectedCount: rejected.length,
    rejected,
  };
}

// Editorial "best of" articles (Wirecutter, RTINGS, etc. — already in the source
// packs) are curated lists of known-good products. This pure helper mines product
// NAMES (brand + model) out of those result titles/snippets so discovery can turn
// the list into structured, priced shopping candidates instead of relying only on
// raw shopping results and the LLM's guesses.
//
// It is category-agnostic: a seed is a run of "name tokens" (TitleCase / proper
// nouns / model tokens) that contains a real MODEL NUMBER. Real editorial picks
// almost always carry a model number ("Weber Spirit II E-310", "Traeger Pro 575"),
// while generic phrases ("Best Gas Grills"), brand+stray-word noise ("DeWalt Find"),
// and bare years ("2026 Lab") are rejected because they have no model number. No
// product category or brand is hardcoded.
const SEED_NAME_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "is", "are", "was", "our", "we", "best", "top",
  "pick", "picks", "value", "budget", "overall", "editor", "editors", "choice",
  "tested", "review", "reviews", "for", "with", "of", "at", "to", "in", "on", "by",
  "this", "that", "it", "its", "also", "new", "vs", "versus", "why", "how", "what",
  "plus", "get", "buy", "under", "over", "most", "more", "guide", "year", "deals",
  // common editorial-sentence words that are not product names
  "find", "see", "shop", "check", "read", "learn", "compare", "save", "deal",
  "sale", "today", "now", "here", "makes", "make", "your", "you", "their", "out",
  "from", "list", "ranked", "rated", "rating", "buying", "good", "great", "love",
  "tried", "use", "used", "than", "but", "all", "some", "which", "these", "those",
]);

function trimSeedToken(token: string) {
  return token.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9]+$/, "");
}

function seedTokenHasDigit(token: string) {
  return /[0-9]/.test(token);
}

// A model-number token has a digit but is NOT a bare 4-digit year — best-of
// article titles are full of years ("2026") and brand+word noise ("DeWalt Find"),
// neither of which is a product. Real picks carry a model number: "WD4080",
// "E-310", "575", "6-Gallon".
function isSeedModelNumberToken(token: string) {
  return seedTokenHasDigit(token) && !/^(?:19|20)\d{2}$/.test(token);
}

// A "name token" is part of a product name: a TitleCase word, a roman numeral, or
// a model-number token — never a stopword.
function isSeedNameToken(token: string) {
  if (!token || token.length > 24) {
    return false;
  }

  if (SEED_NAME_STOPWORDS.has(token.toLowerCase())) {
    return false;
  }

  return (
    /^[A-Z][A-Za-z0-9+.\-]*$/.test(token) ||
    /^[IVX]{1,4}$/.test(token) ||
    seedTokenHasDigit(token)
  );
}

// Best-of / top-rated editorial queries the seeding step mines for every search,
// so the canonical top products for ANY category get pulled into the candidate
// pool (not just whatever live shopping happened to surface). Budget-aware so it
// anchors on the best products that FIT the shopper's budget. Category-agnostic.
export function buildBestOfSeedQueries(
  category: string,
  maxBudget: number | null,
): string[] {
  const base = (category || "").trim();

  if (!base) {
    return [];
  }

  const budgetSuffix = maxBudget !== null ? ` under $${maxBudget}` : "";

  return Array.from(
    new Set([
      `best ${base}${budgetSuffix}`,
      `top rated ${base}`,
      `most popular ${base}`,
    ]),
  );
}

// A "word token" is a lexical proper-noun word (ends in a lowercase letter), not a
// bare model/acronym — used to recognize brand-led names like "Coway Airmega".
function isSeedWordToken(token: string) {
  return token.length >= 2 && /^[A-Za-z][A-Za-z.&'-]*[a-z]$/.test(token);
}

// A run is "brand-led" when it has at least two proper-noun words (brand + product
// line), e.g. "Herman Miller Aeron", "Coway Airmega", "Shark Matrix" — even with no
// model number. Dictionary-free, so it works for ANY brand/category.
function isBrandLedSeedRun(run: string[]) {
  return run.filter(isSeedWordToken).length >= 2;
}

function normalizeSeedWords(tokens: string[]) {
  return tokens.map((token) => token.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);
}

// Light de-pluralize so "Grills" matches a "grill" category ("gas" stays "gas").
function depluralizeWord(word: string) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

// A run that is just the searched category ("Robot Vacuum" for a robot vacuum
// search, "Gas Grills" for a gas grill search) is the category, not a product.
function isCategorySubsetRun(run: string[], category: string) {
  const catWords = new Set(
    normalizeSeedWords((category || "").split(/\s+/)).map(depluralizeWord),
  );

  if (catWords.size === 0) {
    return false;
  }

  const runWords = normalizeSeedWords(run).map(depluralizeWord);

  return runWords.length > 0 && runWords.every((word) => catWords.has(word));
}

// A run containing a SOURCE/retailer name ("Consumer Reports", "RTINGS.com",
// "WIRED", "Amazon Prime") is editorial/snippet noise, not a product name. Checks
// every token (with a trailing TLD stripped) so "RTINGS.com" matches "rtings".
function containsSourceName(run: string[]) {
  return normalizeSeedWords(run).some(
    (word) => SOURCE_NAME_TOKENS.has(word) || SOURCE_NAME_TOKENS.has(word.replace(/(?:com|org|net)$/, "")),
  );
}

// A run that starts with a bare year ("2026 Shark Eufy ...") is a best-of headline
// fragment, not a product.
function isYearLedRun(run: string[]) {
  return /^(?:19|20)\d{2}$/.test(run[0] || "");
}

export function extractSeedProductNames(
  sources: Array<{ title?: string; snippet?: string; url?: string }>,
  maxSeeds = 6,
  category = "",
): string[] {
  // Mine the most trusted (Tier-1 editorial) lists first so their named leaders
  // win the limited seed slots.
  const ordered = [...sources].sort(
    (first, second) => sourceTier(first.url || "") - sourceTier(second.url || ""),
  );

  const seen = new Map<string, { name: string; order: number }>();
  let order = 0;

  for (const source of ordered) {
    const rawText = `${source?.title || ""} . ${source?.snippet || ""}`;
    const rawTokens = rawText.split(/\s+/).map(trimSeedToken).filter(Boolean);

    let index = 0;

    while (index < rawTokens.length) {
      if (!isSeedNameToken(rawTokens[index])) {
        index += 1;
        continue;
      }

      const run: string[] = [];

      while (
        index < rawTokens.length &&
        run.length < 6 &&
        isSeedNameToken(rawTokens[index])
      ) {
        run.push(rawTokens[index]);
        index += 1;
      }

      // Accept a run that carries a real model number ("Weber Spirit II E-310") OR
      // is brand-led ("Coway Airmega"). Reject category-only and source-name runs,
      // and bare-year / generic noise (no model number AND not brand-led).
      const accepted =
        run.length >= 2 &&
        (run.some(isSeedModelNumberToken) || isBrandLedSeedRun(run)) &&
        !isCategorySubsetRun(run, category) &&
        !containsSourceName(run) &&
        !isYearLedRun(run);

      if (accepted) {
        const name = run.join(" ").replace(/\s+/g, " ").trim();
        const key = name.toLowerCase();

        if (!seen.has(key)) {
          seen.set(key, { name, order: order++ });
        }
      }
    }
  }

  return [...seen.values()]
    .sort((first, second) => first.order - second.order)
    .slice(0, maxSeeds)
    .map((entry) => entry.name);
}

function legacyPlan(queries: string[], categoryGroup: string): SearchPlan {
  const candidates = queries.map((query, index) => ({
    family: index < 6 ? "canonical_shopping" : "fallback",
    query,
    stage: index < 8 ? 1 : index < 14 ? 2 : 3,
  })) as SearchQueryCandidate[];

  return {
    categoryGroup,
    queries: candidates,
    stagedQueries: {
      pass1: candidates.filter((query) => query.stage === 1).slice(0, 8),
      pass2: candidates.filter((query) => query.stage === 2).slice(0, 6),
      pass3: candidates.filter((query) => query.stage === 3).slice(0, 4),
    },
  };
}

function shouldRunAsShopping(query: SearchQueryCandidate) {
  return (
    query.family === "canonical_shopping" ||
    query.family === "hard_filter" ||
    query.family === "synonym"
  );
}

function shouldRunAsOrganic(query: SearchQueryCandidate) {
  return (
    query.family === "editorial_review" ||
    query.family === "fallback" ||
    query.family === "owner_experience"
  );
}

function minimumUsefulCandidateTarget(depth: SearchDepthConfig["depth"]) {
  if (depth === "deep") {
    return 26;
  }

  if (depth === "standard") {
    return 24;
  }

  return 18;
}

export async function searchSerperForProducts(
  searchInput: SearchPlan | string[],
  inputOrCategory?: RecommendationApiRequest | string,
  category = "Product",
): Promise<SerperSearchResult> {
  const input =
    typeof inputOrCategory === "object"
      ? inputOrCategory
      : {
          query: inputOrCategory || category,
        };
  const categoryName = typeof inputOrCategory === "string" ? inputOrCategory : input.query;
  const searchConfig = getSearchDepthConfig();
  const baseCategoryName = baseProductCategoryFromQuery(categoryName);
  const categoryGroup = detectCategoryGroup(baseCategoryName);
  const sourcePack = getSourcePack(categoryGroup);
  const plan = Array.isArray(searchInput)
    ? legacyPlan(searchInput, categoryGroup)
    : searchInput;
  const generatedQueryStrings = plan.queries.map((query) => query.query);
  const fallbackRetailerDomainQueries = generateRetailerDomainQueries(
    input,
    categoryGroup,
    searchConfig,
  ).map((query) => ({
    family: "retailer_domain" as const,
    query,
    stage: 2 as const,
  }));
  const planRetailerQueries = plan.queries.filter(
    (query) => query.family === "retailer_domain",
  );
  const retailerDomainCandidates =
    planRetailerQueries.length > 0
      ? planRetailerQueries
      : fallbackRetailerDomainQueries;
  const directRetailerEngines = sourcePack.directRetailerEngines.slice(
    0,
    searchConfig.maxDirectRetailerQueries,
  );
  const searchedShoppingQueries: string[] = [];
  const searchedOrganicQueries: string[] = [];
  const searchedRetailerDomainQueries: string[] = [];
  const searchedDirectRetailerQueries: string[] = [];
  const stats: SerperSearchStats = {
    categoryGroup,
    generatedQueries: generatedQueryStrings,
    selectedSourcePack: sourcePack.retailerDomains,
    searchedShoppingQueries,
    searchedOrganicQueries,
    searchedRetailerDomainQueries,
    searchedDirectRetailerQueries,
    shoppingCalls: 0,
    organicCalls: 0,
    retailerDomainCalls: 0,
    directRetailerCalls: 0,
    collectedCandidates: 0,
    duplicateCandidatesRemoved: 0,
    maxEnrichedProducts: searchConfig.maxEnrichedProducts,
    preFilteredCandidates: 0,
    rejectedCandidates: 0,
    searchDepth: searchConfig.depth,
    sourceTimeouts: 0,
    seedSearchesRun: 0,
    seedProductNames: [],
  };

  if (!process.env.SERPER_API_KEY) {
    logSerperWarning("SERPER_API_KEY is missing. Skipping Serper discovery.");
    return {
      candidates: [],
      stats: {
        ...stats,
        skippedReason: "missing_api_key",
      },
    };
  }

  const directBaseQuery =
    retailerDomainCandidates[0]?.query.replace(/^site:[^\s]+\s+/, "") ||
    generatedQueryStrings[0] ||
    baseCategoryName;
  const collected: RawProductCandidate[] = [];
  const used = {
    directRetailer: 0,
    organic: 0,
    retailerDomain: 0,
    shopping: 0,
  };

  async function runDiscoveryTasks(tasks: DiscoveryTask[]) {
    const taskResults = await runWithConcurrency(
      tasks.map((task) => async () => ({
        candidates: await task.run(),
        source: task.source,
      })),
      serperConcurrency(searchConfig.depth),
    );

    for (const result of taskResults) {
      if (result.source === "shopping") {
        stats.shoppingCalls += 1;
      } else if (result.source === "organic") {
        stats.organicCalls += 1;
      } else if (result.source === "retailerDomain") {
        stats.retailerDomainCalls += 1;
      } else {
        stats.directRetailerCalls += 1;
      }

      collected.push(...result.candidates);
    }
  }

  function usefulCandidateCount() {
    const dedupedCandidates = dedupeRawCandidates(collected);
    const preFilteredCandidates = cheapPreFilterRawCandidates(
      dedupedCandidates.candidates,
      input,
      searchConfig.maxRawCandidates,
    );

    return preFilteredCandidates.candidates.filter((candidate) =>
      isUsefulCoverageCandidate(candidate, input, searchConfig.depth),
    ).length;
  }

  function organicDiscoveryPriority(query: SearchQueryCandidate) {
    // Editorial "best of" sources lead the limited organic budget — they seed
    // known-good products — while the broad "fallback" queries go last so a
    // single retailer's catalog can't dominate.
    if (query.family === "editorial_review") {
      return 0;
    }

    if (query.family === "fallback") {
      return 2;
    }

    return 1;
  }

  function isDiscussionPhrasedQuery(query: SearchQueryCandidate) {
    // Reddit/YouTube-phrased queries return discussion pages that the
    // candidate filter rejects, so they waste the limited organic budget.
    // They stay in the plan for the AI research prompt.
    return /\b(?:reddit|youtube)\b/i.test(query.query);
  }

  function tasksForStage(stageQueries: SearchQueryCandidate[]) {
    const tasks: DiscoveryTask[] = [];
    const organicCandidates: SearchQueryCandidate[] = [];

    for (const query of stageQueries) {
      if (
        shouldRunAsShopping(query) &&
        used.shopping < searchConfig.maxGoogleShoppingQueries
      ) {
        used.shopping += 1;
        searchedShoppingQueries.push(query.query);
        tasks.push({
          run: () => searchSerperShopping(query.query, baseCategoryName),
          source: "shopping",
        });
        continue;
      }

      if (
        query.family === "retailer_domain" &&
        used.retailerDomain < searchConfig.maxRetailerDomainQueries
      ) {
        used.retailerDomain += 1;
        searchedRetailerDomainQueries.push(query.query);
        tasks.push({
          run: () => searchSerperOrganic(query.query, baseCategoryName),
          source: "retailerDomain",
        });
        continue;
      }

      if (shouldRunAsOrganic(query) && !isDiscussionPhrasedQuery(query)) {
        organicCandidates.push(query);
      }
    }

    const prioritizedOrganic = [...organicCandidates].sort(
      (first, second) =>
        organicDiscoveryPriority(first) - organicDiscoveryPriority(second),
    );

    for (const query of prioritizedOrganic) {
      if (used.organic >= searchConfig.maxGoogleOrganicQueries) {
        break;
      }

      used.organic += 1;
      searchedOrganicQueries.push(query.query);
      tasks.push({
        run: () =>
          searchSerperOrganic(`${query.query} product page`, baseCategoryName),
        source: "organic",
      });
    }

    return tasks;
  }

  await runDiscoveryTasks(tasksForStage(plan.stagedQueries.pass1));

  // Editorial seeding: mine known-good product names from "best of" / "top rated"
  // lists and shopping-search them, so the category's canonical top products enter
  // the pool as structured, priced candidates. The best-of queries are built here
  // (budget-aware) so EVERY search — any category — anchors on the top products,
  // not just whatever live shopping happened to surface. Plan-generated editorial
  // "best/top" queries are also mined; the complaints/long-term query is skipped
  // because it surfaces problems, not top picks.
  const editorialQueries = uniqueStatStrings([
    ...buildBestOfSeedQueries(baseCategoryName, maxBudgetFromInput(input)),
    ...plan.queries
      .filter(
        (query) =>
          query.family === "editorial_review" &&
          /\b(?:best|top[\s-]?rated|most popular)\b/i.test(query.query),
      )
      .map((query) => query.query),
  ]);

  if (editorialQueries.length > 0) {
    const editorialEvidenceBudget = searchConfig.depth === "deep" ? 3 : 2;
    const editorialSources = (
      await runWithConcurrency(
        editorialQueries
          .slice(0, editorialEvidenceBudget)
          .map((query) => async () => {
            stats.organicCalls += 1;

            return searchSerperOrganicEvidence(query);
          }),
        serperConcurrency(searchConfig.depth),
      )
    ).flat();

    const seedNames = extractSeedProductNames(
      editorialSources,
      searchConfig.maxGoogleShoppingQueries,
      baseCategoryName,
    ).filter(
      (seed) =>
        !searchedShoppingQueries.some(
          (searched) => normalizeText(searched) === normalizeText(seed),
        ),
    );

    if (seedNames.length > 0) {
      stats.seedProductNames = seedNames;

      const seedTasks: DiscoveryTask[] = seedNames.map((seed) => {
        searchedShoppingQueries.push(seed);
        stats.seedSearchesRun += 1;

        return {
          run: () => searchSerperShopping(seed, baseCategoryName),
          source: "shopping" as const,
        };
      });

      await runDiscoveryTasks(seedTasks);
    }
  }

  if (usefulCandidateCount() < 15) {
    await runDiscoveryTasks(tasksForStage(plan.stagedQueries.pass2));
  }

  const usefulTarget = minimumUsefulCandidateTarget(searchConfig.depth);

  if (usefulCandidateCount() < usefulTarget) {
    await runDiscoveryTasks(tasksForStage(plan.stagedQueries.pass3));
  }

  if (
    usefulCandidateCount() < usefulTarget &&
    directRetailerEngines.length > 0
  ) {
    const directTasks = directRetailerEngines
      .filter(() => used.directRetailer < searchConfig.maxDirectRetailerQueries)
      .map((engine) => {
        used.directRetailer += 1;
        searchedDirectRetailerQueries.push(engine);

        return {
          run: () =>
            searchSerperDirectRetailer(engine, directBaseQuery, baseCategoryName),
          source: "directRetailer" as const,
        };
      });

    await runDiscoveryTasks(directTasks);
  }

  function marketCoverageSnapshot(kept: RawProductCandidate[]) {
    const hosts = new Set(
      kept
        .map((candidate) => {
          const parsed = parseUrl(candidate.productUrl);

          return parsed ? normalizedHost(parsed) : "";
        })
        .filter(Boolean),
    );

    return {
      candidateCount: kept.length,
      pricedCandidateCount: kept.filter((candidate) => candidate.price !== null)
        .length,
      retailerHostCount: hosts.size,
    };
  }

  function keptCandidates() {
    return cheapPreFilterRawCandidates(
      dedupeRawCandidates(collected).candidates,
      input,
      searchConfig.maxRawCandidates,
    ).candidates;
  }

  // Market-coverage check: when the pool is small, thinly priced, or comes
  // from too few retailers, run up to two broader rescue searches before
  // choosing winners from a weak result set.
  let rescueQueriesRun = 0;
  const preRescueCoverage = marketCoverageSnapshot(keptCandidates());

  if (
    preRescueCoverage.candidateCount < 10 ||
    preRescueCoverage.retailerHostCount < 3 ||
    preRescueCoverage.pricedCandidateCount < 6
  ) {
    const rescueBudget = maxBudgetFromInput(input);
    const rescueBrand = selectedBrandValues(input)[0] || "";
    const brandedCategory = [rescueBrand, baseCategoryName]
      .filter(Boolean)
      .join(" ");
    const rescueQueries = [
      `best ${brandedCategory}${
        rescueBudget !== null ? ` under $${rescueBudget}` : ""
      }`,
      `top rated ${brandedCategory}`,
      rescueBrand
        ? `${brandedCategory} most popular${
            rescueBudget !== null ? ` under $${rescueBudget}` : ""
          }`
        : "",
    ].filter(
      (query) =>
        query &&
        !searchedShoppingQueries.some(
          (searched) => normalizeText(searched) === normalizeText(query),
        ),
    );
    const rescueTasks: DiscoveryTask[] = rescueQueries
      .slice(0, rescueBrand ? 3 : 2)
      .map((query) => {
        searchedShoppingQueries.push(query);
        rescueQueriesRun += 1;

        return {
          run: () => searchSerperShopping(query, baseCategoryName),
          source: "shopping" as const,
        };
      });

    if (rescueTasks.length > 0) {
      await runDiscoveryTasks(rescueTasks);
    }
  }

  const deduped = dedupeRawCandidates(collected);
  const preFiltered = cheapPreFilterRawCandidates(
    deduped.candidates,
    input,
    searchConfig.maxRawCandidates,
  );

  return {
    candidates: preFiltered.candidates,
    stats: {
      ...stats,
      collectedCandidates: collected.length,
      duplicateCandidatesRemoved: deduped.duplicateCount,
      preFilteredCandidates: preFiltered.candidates.length,
      rejectedCandidates: preFiltered.rejectedCount,
      marketCoverage: {
        ...marketCoverageSnapshot(preFiltered.candidates),
        rescueQueriesRun,
      },
      funnel: {
        rawNames: collected.map((candidate) => candidate.name),
        dedupedNames: deduped.candidates.map((candidate) => candidate.name),
        keptNames: preFiltered.candidates.map((candidate) => candidate.name),
        rejected: preFiltered.rejected,
      },
    },
  };
}

function uniqueStatStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function coverageForCandidates(
  candidates: RawProductCandidate[],
  rescueQueriesRun = 0,
): MarketCoverageSnapshot {
  const hosts = new Set(
    candidates
      .map((candidate) => {
        const parsed = parseUrl(candidate.productUrl);

        return parsed ? normalizedHost(parsed) : "";
      })
      .filter(Boolean),
  );

  return {
    candidateCount: candidates.length,
    pricedCandidateCount: candidates.filter((candidate) => candidate.price !== null)
      .length,
    rescueQueriesRun,
    retailerHostCount: hosts.size,
  };
}

export function mergeSerperSearchResults(
  primary: SerperSearchResult,
  followUp: SerperSearchResult,
): SerperSearchResult {
  const deduped = dedupeRawCandidates([
    ...primary.candidates,
    ...followUp.candidates,
  ]);
  const primaryRescueQueries = primary.stats.marketCoverage?.rescueQueriesRun || 0;
  const followUpRescueQueries = followUp.stats.marketCoverage?.rescueQueriesRun || 0;

  return {
    candidates: deduped.candidates,
    stats: {
      ...primary.stats,
      generatedQueries: uniqueStatStrings([
        ...primary.stats.generatedQueries,
        ...followUp.stats.generatedQueries,
      ]),
      searchedShoppingQueries: uniqueStatStrings([
        ...primary.stats.searchedShoppingQueries,
        ...followUp.stats.searchedShoppingQueries,
      ]),
      searchedOrganicQueries: uniqueStatStrings([
        ...primary.stats.searchedOrganicQueries,
        ...followUp.stats.searchedOrganicQueries,
      ]),
      searchedRetailerDomainQueries: uniqueStatStrings([
        ...primary.stats.searchedRetailerDomainQueries,
        ...followUp.stats.searchedRetailerDomainQueries,
      ]),
      searchedDirectRetailerQueries: uniqueStatStrings([
        ...primary.stats.searchedDirectRetailerQueries,
        ...followUp.stats.searchedDirectRetailerQueries,
      ]),
      shoppingCalls: primary.stats.shoppingCalls + followUp.stats.shoppingCalls,
      organicCalls: primary.stats.organicCalls + followUp.stats.organicCalls,
      retailerDomainCalls:
        primary.stats.retailerDomainCalls + followUp.stats.retailerDomainCalls,
      directRetailerCalls:
        primary.stats.directRetailerCalls + followUp.stats.directRetailerCalls,
      collectedCandidates:
        primary.stats.collectedCandidates + followUp.stats.collectedCandidates,
      duplicateCandidatesRemoved:
        primary.stats.duplicateCandidatesRemoved +
        followUp.stats.duplicateCandidatesRemoved +
        deduped.duplicateCount,
      preFilteredCandidates: deduped.candidates.length,
      rejectedCandidates:
        primary.stats.rejectedCandidates + followUp.stats.rejectedCandidates,
      sourceTimeouts: primary.stats.sourceTimeouts + followUp.stats.sourceTimeouts,
      seedSearchesRun:
        primary.stats.seedSearchesRun + followUp.stats.seedSearchesRun,
      seedProductNames: uniqueStatStrings([
        ...primary.stats.seedProductNames,
        ...followUp.stats.seedProductNames,
      ]),
      marketCoverage: coverageForCandidates(
        deduped.candidates,
        primaryRescueQueries + followUpRescueQueries,
      ),
      funnel:
        primary.stats.funnel || followUp.stats.funnel
          ? {
              rawNames: [
                ...(primary.stats.funnel?.rawNames || []),
                ...(followUp.stats.funnel?.rawNames || []),
              ],
              dedupedNames: deduped.candidates.map((candidate) => candidate.name),
              keptNames: deduped.candidates.map((candidate) => candidate.name),
              rejected: [
                ...(primary.stats.funnel?.rejected || []),
                ...(followUp.stats.funnel?.rejected || []),
              ],
            }
          : undefined,
    },
  };
}

function formatPrice(price: number | null) {
  return price === null
    ? "Price not verified"
    : `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function buildSerperPros(candidate: RawProductCandidate) {
  const pros = compact([
    candidate.availableColors.length > 0
      ? `Available color ${pluralize(
          candidate.availableColors.length,
          "option",
        )}: ${candidate.availableColors.join(", ")}.`
      : "",
    candidate.dimensions.width !== null
      ? `Compact ${candidate.dimensions.width}-inch width.`
      : "",
    candidate.rating !== null &&
    candidate.rating >= 4 &&
    candidate.reviewCount !== null
      ? `Search result lists a ${candidate.rating} rating from ${candidate.reviewCount} reviews.`
      : "",
    candidate.rating !== null && candidate.rating >= 4 && candidate.reviewCount === null
      ? `Search result lists a ${candidate.rating} rating.`
      : "",
  ]).slice(0, 4);

  return pros;
}

function sanitizeListingSnippet(snippet: string) {
  // Strip promo and price noise so the listing evidence is usable in pros
  // without marketing language leaking into the UI.
  return snippet
    .replace(/\b\d+(?:\.\d+)?%\s*off\b/gi, " ")
    .replace(/\bprice:\s*\$?[\d,]+(?:\.\d+)?\b/gi, " ")
    .replace(/\$\s*[\d,]+(?:\.\d+)?\b/g, " ")
    .replace(/\bfree (?:shipping|delivery|returns)\b/gi, " ")
    .replace(/\bwas\b\.?/gi, " ")
    .replace(/\bSKU\s*:\s*[A-Z0-9-]+\b/gi, " ")
    .replace(/\b(?:regular|sale)\s+price\b/gi, " ")
    .replace(/\breg(?:ular)?\.?\b/gi, " ")
    .replace(/\bsale\b/gi, " ")
    .replace(/\bitem weight\b.*$/i, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/([.,;])(?:\s*\1)+/g, "$1")
    .replace(/^[\s.,;:|/-]+|[\s.,;:|/-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_LISTING_IDENTITY_WORDS = new Set([
  "air",
  "allergen",
  "allergy",
  "and",
  "appliance",
  "bedroom",
  "best",
  "cleaner",
  "compact",
  "coverage",
  "filter",
  "for",
  "hepa",
  "home",
  "large",
  "living",
  "portable",
  "product",
  "purifier",
  "purifiers",
  "quiet",
  "room",
  "shop",
  "the",
  "true",
  "with",
]);

function leadingListingIdentity(value: string) {
  return normalizeText(value)
    .split(" ")
    .find(
      (word) =>
        word.length >= 3 &&
        !GENERIC_LISTING_IDENTITY_WORDS.has(word) &&
        !/^\d+$/.test(word),
    );
}

function listingSnippetMatchesCandidate(
  candidate: RawProductCandidate,
  snippet: string,
) {
  const candidateIdentity = leadingListingIdentity(candidate.name);
  const snippetIdentity = leadingListingIdentity(snippet);
  const normalizedSnippet = normalizeText(snippet);
  const strongSnippetIdentity = snippet.match(/\b[A-Z][A-Z0-9]{2,}\b/)?.[0];

  if (!candidateIdentity || !snippetIdentity) {
    return true;
  }

  if (normalizedSnippet.includes(candidateIdentity)) {
    return true;
  }

  if (snippetIdentity === candidateIdentity) {
    return true;
  }

  return normalizeText(strongSnippetIdentity || "") !== snippetIdentity;
}

function buildSerperListingDetailsPro(candidate: RawProductCandidate) {
  // Carry the raw listing snippets into the recommendation so requirement
  // validation can see evidence like "includes two batteries and charger"
  // that only exists in the search snippet.
  const snippets = Array.from(
    new Set(
      candidate.evidenceSources
        .map((source) => sanitizeListingSnippet(source.snippet))
        .filter(
          (snippet) =>
            snippet.length > 2 &&
            !snippet.startsWith("Found by Serper for query") &&
            listingSnippetMatchesCandidate(candidate, snippet),
        ),
    ),
  );

  if (snippets.length === 0) {
    return "";
  }

  return `Listing details: ${ensureSentencePunctuation(cleanMetadataText(snippets.slice(0, 2).join(" ")))}`;
}

function buildSerperCitationSupport(candidate: RawProductCandidate) {
  const facts = compact([
    candidate.price !== null ? `price ${formatPrice(candidate.price)}` : "",
    candidate.availableColors.length > 0
      ? `colors ${candidate.availableColors.join(", ")}`
      : "",
    candidate.dimensions.width !== null
      ? `width ${candidate.dimensions.width} inches`
      : "",
    candidate.rating !== null ? `rating ${candidate.rating}` : "",
    candidate.reviewCount !== null ? `${candidate.reviewCount} reviews` : "",
    candidate.retailer ? `retailer ${candidate.retailer}` : "",
  ]);

  return facts.length > 0
    ? `Search listing metadata supports: ${facts.join("; ")}.`
    : "Supports this product candidate's listing metadata from search results.";
}

function serperField<T>(
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
  const metadata: ProductMetadata = {
    offers: [],
    title: serperField(candidate.name, sourceUrl, "Medium"),
  };

  if (candidate.brand) {
    metadata.brand = serperField(candidate.brand, sourceUrl, "Medium");
  }

  if (candidate.imageUrl) {
    metadata.image = serperField(candidate.imageUrl, sourceUrl, "Medium");
  }

  if (candidate.rating !== null) {
    metadata.rating = serperField(candidate.rating, sourceUrl, "Medium");
  }

  if (candidate.reviewCount !== null) {
    metadata.reviewCount = serperField(candidate.reviewCount, sourceUrl, "Medium");
  }

  if (
    candidate.dimensions.width !== null ||
    candidate.dimensions.depth !== null ||
    candidate.dimensions.height !== null
  ) {
    metadata.dimensions = {
      unit: candidate.dimensions.unit,
      ...(candidate.dimensions.width !== null
        ? { width: serperField(candidate.dimensions.width, sourceUrl, "Medium") }
        : {}),
      ...(candidate.dimensions.depth !== null
        ? { depth: serperField(candidate.dimensions.depth, sourceUrl, "Medium") }
        : {}),
      ...(candidate.dimensions.height !== null
        ? { height: serperField(candidate.dimensions.height, sourceUrl, "Medium") }
        : {}),
    };
  }

  if (candidate.price !== null) {
    metadata.offers.push({
      availability: serperField(null, sourceUrl, "Low"),
      price: serperField(candidate.price, sourceUrl, "Medium"),
      priceCurrency: serperField("USD", sourceUrl, "Medium"),
      retailer: candidate.retailer,
      url: sourceUrl,
    });
  }

  return metadata;
}

export function serperCandidateToRecommendation(
  candidate: RawProductCandidate,
): ProductRecommendation {
  const source = candidate.evidenceSources[0];
  const metadata = candidateMetadata(candidate);
  const recommendation: ProductRecommendation = {
    recommendation_type: "Close Match",
    name: candidate.name,
    category: candidate.category,
    product_page_url: candidate.productUrl,
    product_image_url: candidate.imageUrl || "",
    why_recommended:
      "Found as a broader product candidate from Google search results. ReviewRadar still checks it against your required filters before showing it as an exact match.",
    pros: sanitizeProductPros(compact([
      ...buildSerperPros(candidate),
      buildSerperListingDetailsPro(candidate),
    ])),
    cons: ["Long-term owner evidence may be limited from this source alone."],
    common_complaints: [],
    estimated_price_range: formatPrice(candidate.price),
    confidence_score: 60,
    source_consensus: "Weak",
    price_value_verdict:
      candidate.price === null
        ? "Price was not verified in the search result."
        : "Price was found in search metadata; verify current price and availability before buying.",
    best_for:
      "Buyers who want additional candidates checked against their required filters.",
    not_for: ["Buyers who only want products backed by long-term review consensus."],
    citations: candidate.evidenceSources.map((sourceItem) => ({
      title: sourceItem.title || source?.title || candidate.name,
      url: sourceItem.url,
      what_it_supports: buildSerperCitationSupport(candidate),
    })),
    metadata,
    productEligibility: candidateEligibility(candidate),
  };

  return {
    ...recommendation,
    priceTrust: assessProductPriceTrust(recommendation),
  };
}

function productUrlKey(product: ProductRecommendation) {
  return normalizeUrlKey(product.product_page_url);
}

const RETAILER_TITLE_SUFFIX_PATTERN =
  /\s*[-|–]\s*(?:amazon(?:\.com)?|walmart(?:\.com)?|target(?:\.com)?|wayfair(?:\.com)?|best buy|the home depot|home depot|lowe'?s(?:\.com)?|costco(?:\.com)?|ikea|ebay|overstock(?:\.com)?|aj madison)\s*$/i;

function stripRetailerTitleSuffix(name: string) {
  return name.replace(RETAILER_TITLE_SUFFIX_PATTERN, "").trim() || name;
}

function productNameKey(product: ProductRecommendation) {
  return normalizeText(stripRetailerTitleSuffix(product.name));
}

function productTokens(product: ProductRecommendation) {
  return new Set(productNameKey(product).split(" ").filter((word) => word.length > 2));
}

function looksLikeSpecToken(token: string) {
  // Spec-style tokens ("1080p", "120hz", "16gb", "4th") appear across many
  // different products and must not be treated as model numbers.
  return /^\d+[a-z]{1,3}$/i.test(token);
}

function productModelTokens(product: ProductRecommendation) {
  return new Set(
    productNameKey(product)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 4 &&
          token.length <= 24 &&
          /[a-z]/i.test(token) &&
          /\d/.test(token) &&
          /^[a-z0-9-]+$/i.test(token) &&
          !looksLikeSpecToken(token),
      ),
  );
}

function titleSimilarity(first: ProductRecommendation, second: ProductRecommendation) {
  const firstTokens = productTokens(first);
  const secondTokens = productTokens(second);

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  const intersection = Array.from(firstTokens).filter((token) =>
    secondTokens.has(token),
  ).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;

  return union === 0 ? 0 : intersection / union;
}

function areDuplicateProducts(
  first: ProductRecommendation,
  second: ProductRecommendation,
) {
  const firstUrl = productUrlKey(first);
  const secondUrl = productUrlKey(second);

  if (firstUrl && secondUrl && firstUrl === secondUrl) {
    return true;
  }

  const firstName = productNameKey(first);
  const secondName = productNameKey(second);

  if (firstName && firstName === secondName) {
    return true;
  }

  const firstModels = productModelTokens(first);
  const secondModels = productModelTokens(second);

  if (firstModels.size > 0 && secondModels.size > 0) {
    const sharedModel = Array.from(firstModels).some((token) =>
      secondModels.has(token),
    );

    // Different model/SKU tokens mean different products (sizes, configs,
    // or generations) even when the rest of the title looks the same.
    if (!sharedModel) {
      return false;
    }

    // A shared model token across retailers is the same product even when
    // retailer-specific title wording lowers plain title similarity.
    return titleSimilarity(first, second) >= 0.5;
  }

  return titleSimilarity(first, second) >= 0.85;
}

function mergeRecommendationEvidence(
  existing: ProductRecommendation,
  incoming: ProductRecommendation,
) {
  const seenCitationUrls = new Set(
    existing.citations.map((citation) => normalizeUrlKey(citation.url)),
  );
  const citations = [
    ...existing.citations,
    ...incoming.citations.filter((citation) => {
      const key = normalizeUrlKey(citation.url);

      if (!key || seenCitationUrls.has(key)) {
        return false;
      }

      seenCitationUrls.add(key);
      return true;
    }),
  ];
  const seenOfferUrls = new Set(
    (existing.metadata?.offers || [])
      .map((offer) => normalizeUrlKey(offer.url))
      .filter(Boolean),
  );
  const incomingOffers = (incoming.metadata?.offers || []).filter((offer) => {
    const key = normalizeUrlKey(offer.url);

    if (!key || seenOfferUrls.has(key)) {
      return false;
    }

    seenOfferUrls.add(key);
    return true;
  });
  const metadata =
    existing.metadata || incoming.metadata
      ? {
          ...(incoming.metadata || { offers: [] }),
          ...(existing.metadata || { offers: [] }),
          offers: [...(existing.metadata?.offers || []), ...incomingOffers],
        }
      : undefined;

  return {
    ...existing,
    product_page_url: existing.product_page_url || incoming.product_page_url,
    product_image_url: existing.product_image_url || incoming.product_image_url,
    citations,
    metadata,
  };
}

export function mergeProductRecommendations(
  existingProducts: ProductRecommendation[],
  serperProducts: ProductRecommendation[],
) {
  const merged = [...existingProducts];
  let duplicateCount = 0;

  for (const incoming of serperProducts) {
    const duplicateIndex = merged.findIndex((product) =>
      areDuplicateProducts(product, incoming),
    );

    if (duplicateIndex >= 0) {
      merged[duplicateIndex] = mergeRecommendationEvidence(
        merged[duplicateIndex],
        incoming,
      );
      duplicateCount += 1;
      continue;
    }

    merged.push(incoming);
  }

  return {
    products: merged.slice(0, DEFAULT_MAX_RAW_CANDIDATES),
    duplicateCount,
  };
}

export const serperTestExports = {
  hardEvidenceMatchCount,
  isAccessoryForAnotherProduct,
  isLikelyUsedOrRefurbished,
  isUsefulCoverageCandidate,
  minimumUsefulFitScore,
  serperEndpointForSearchType,
  serperVerticalForSearchType,
};

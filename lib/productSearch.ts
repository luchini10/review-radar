import type {
  RawProductCandidate,
  RecommendationApiRequest,
} from "@/types/review-radar";
import { inferKnownBrand } from "./brandMatching.ts";
import { parseBestMoneyAmount, parseMaxBudgetAmount } from "./priceParsing.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";
import {
  rethrowIfRequestCancelled,
  throwIfRequestCancelled,
} from "./requestCancellation.ts";
import { isNonProductSource } from "./search/sourceSafety.ts";

const SERPER_BASE_URL = "https://google.serper.dev";
const SEARCH_RESULT_LIMIT = 10;
const SHOPPING_NORMALIZATION_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 8_000;

type SerperShoppingResult = {
  extracted_price?: unknown;
  extractedPrice?: unknown;
  extensions?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  link?: unknown;
  offers?: unknown;
  position?: unknown;
  price?: unknown;
  price_raw?: unknown;
  priceRaw?: unknown;
  product_link?: unknown;
  productLink?: unknown;
  productId?: unknown;
  rating?: unknown;
  ratingCount?: unknown;
  snippet?: unknown;
  source?: unknown;
  thumbnail?: unknown;
  thumbnailUrl?: unknown;
  title?: unknown;
};

type SerperOrganicResult = {
  imageUrl?: unknown;
  link?: unknown;
  snippet?: unknown;
  thumbnail?: unknown;
  title?: unknown;
};

type SerperResponse = {
  error?: unknown;
  organic?: SerperOrganicResult[];
  shopping?: SerperShoppingResult[];
};

export type ProductSearchExecutionOptions = {
  onAttempt?: () => void;
  requestCache?: Map<string, Promise<SerperResponse | null>>;
  signal?: AbortSignal;
};

export type ShoppingSearchDiagnostics = {
  errorKind?: "api_error" | "missing_api_key_or_query";
  rawShoppingResults: number;
  rejectionReasons: Record<string, number>;
  returnedCandidates: number;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]) {
  return values.map(asString).find(Boolean) || "";
}

function finiteNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.replace(/,/g, "").trim())
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function nonnegativeInteger(value: unknown) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 && Number.isSafeInteger(parsed)
    ? parsed
    : null;
}

function positiveInteger(value: unknown) {
  const parsed = nonnegativeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function offerCount(value: unknown) {
  if (typeof value === "number") return nonnegativeInteger(value);
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/\d+/);
  return match ? nonnegativeInteger(Number(match[0])) : null;
}

function productIdentifier(value: unknown) {
  if (typeof value === "string") {
    const compact = value.trim().slice(0, 200);
    return compact || null;
  }
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : null;
}

function commerceSignals(result: SerperShoppingResult, fallbackPosition: number) {
  const rating = finiteNumber(result.rating);
  return {
    offerCount: offerCount(result.offers),
    position: positiveInteger(result.position) ?? fallbackPosition,
    productId: productIdentifier(result.productId),
    rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
    ratingCount: nonnegativeInteger(result.ratingCount),
  };
}

function parseHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function normalizedHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `product-${hash.toString(36)}`;
}

function configuredApiKey() {
  const value = process.env.SERPER_API_KEY?.trim();
  if (!value) return null;
  if (
    new Set([
      "replace_me",
      "replace_with_your_serper_api_key",
      "your_serper_api_key_here",
      "your_serper_key_here",
    ]).has(value.toLowerCase())
  ) {
    return null;
  }
  return value;
}

function sanitizeQuery(value: string) {
  return value
    .replace(/(?:^|\s)site:(?:"[^"]+"|'[^']+'|\S+)/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

async function fetchSerper(
  vertical: "search" | "shopping",
  query: string,
  options: ProductSearchExecutionOptions,
) {
  throwIfRequestCancelled(options.signal);
  const apiKey = configuredApiKey();
  const safeQuery = sanitizeQuery(query);
  if (!apiKey || !safeQuery) return null;

  const cacheKey = JSON.stringify([
    vertical,
    safeQuery.toLowerCase(),
    "us",
    "en",
    SEARCH_RESULT_LIMIT,
  ]);
  let request = options.requestCache?.get(cacheKey);
  if (!request) {
    request = (async () => {
      options.onAttempt?.();
      const controller = new AbortController();
      const forwardAbort = () => controller.abort(options.signal?.reason);
      options.signal?.addEventListener("abort", forwardAbort, { once: true });
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const result = await fetch(`${SERPER_BASE_URL}/${vertical}`, {
          body: JSON.stringify({
            gl: "us",
            hl: "en",
            num: SEARCH_RESULT_LIMIT,
            q: safeQuery,
          }),
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          method: "POST",
          signal: controller.signal,
        });
        if (!result.ok) {
          throw new Error(`Serper request failed with status ${result.status}`);
        }
        const body = (await result.json()) as SerperResponse;
        if (body.error) throw new Error("Serper returned an error.");
        return body;
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", forwardAbort);
      }
    })();
    options.requestCache?.set(cacheKey, request);
  }
  let response: SerperResponse | null;
  try {
    response = await request;
  } catch (error) {
    if (options.requestCache?.get(cacheKey) === request) {
      options.requestCache.delete(cacheKey);
    }
    throw error;
  }
  throwIfRequestCancelled(options.signal);
  return response;
}

function priceFromResult(result: SerperShoppingResult) {
  return (
    parseBestMoneyAmount(
      result.extractedPrice ?? result.extracted_price ?? result.price,
      { allowBareNumeric: true, allowBareRange: true },
    ) ??
    parseBestMoneyAmount(result.priceRaw ?? result.price_raw, {
      allowBareNumeric: true,
      allowBareRange: true,
    })
  );
}

function extractDimension(
  text: string,
  dimension: "depth" | "height" | "width",
) {
  const label =
    dimension === "width"
      ? "(?:width|wide|w)"
      : dimension === "depth"
        ? "(?:depth|deep|d)"
        : "(?:height|high|tall|h)";
  for (const pattern of [
    new RegExp(`\\b${label}\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|\")\\b`, "i"),
    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|\")\\s*${label}\\b`, "i"),
  ]) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

const COLORS = [
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
  "silver",
  "tan",
  "taupe",
  "white",
];

function extractColors(text: string) {
  const normalized = normalizeText(text);
  return COLORS.filter((color) =>
    new RegExp(`(^|\\s)${color}(\\s|$)`, "i").test(normalized),
  );
}

function googleOfferUrl(url: URL) {
  const identifiers = url.searchParams.get("prds") || "";
  return (
    (normalizedHost(url) === "google.com" ||
      normalizedHost(url).endsWith(".google.com")) &&
    url.pathname.toLowerCase() === "/search" &&
    url.searchParams.get("ibp") === "oshop" &&
    url.searchParams.get("udm") === "28" &&
    /(?:pid|productid|catalogid|localannotatedofferid):/i.test(identifiers)
  );
}

function genericTitle(title: string, category: string) {
  const normalized = normalizeText(title);
  const normalizedCategory = normalizeText(category);
  return (
    normalized.length < 5 ||
    normalized.split(" ").length < 2 ||
    /^(?:best|shop|top rated)\b/.test(normalized) ||
    normalized === normalizedCategory
  );
}

export function likelyAccessory(title: string) {
  return (
    /\b(?:replacement|spare)\b/i.test(title) ||
    /\b(?:adapter|attachment|bag|battery|belt|brush|case|charger|cover|filter|hose|mount|parts?|stand)\s+(?:for|compatible\s+with)\b/i.test(
      title,
    )
  );
}

function candidateFromFields(input: {
  category: string;
  commerceSignals?: RawProductCandidate["commerceSignals"];
  currentShoppingOffer?: boolean;
  imageUrl: string;
  price: number | null;
  retailer?: string | null;
  snippet: string;
  title: string;
  url: string;
}) {
  const url = parseHttpUrl(input.url);
  if (!url || genericTitle(input.title, input.category)) return null;
  const evidenceText = `${input.title} ${input.snippet}`.trim();
  const width = extractDimension(evidenceText, "width");
  const depth = extractDimension(evidenceText, "depth");
  const height = extractDimension(evidenceText, "height");
  const availableColors = extractColors(evidenceText);

  return {
    availableColors,
    brand: inferKnownBrand(input.title),
    category: input.category,
    ...(input.commerceSignals ? { commerceSignals: input.commerceSignals } : {}),
    ...(input.currentShoppingOffer ? { currentShoppingOffer: true } : {}),
    dimensions: {
      depth,
      height,
      unit: width !== null || depth !== null || height !== null ? "in" : null,
      width,
    },
    evidenceSources: [
      {
        snippet: input.snippet,
        snippetProvenance: "source-derived" as const,
        title: input.title,
        url: input.url,
      },
    ],
    id: hashId(`${input.title}|${input.url}`),
    imageUrl: parseHttpUrl(input.imageUrl)?.toString() || null,
    keySpecs: input.snippet ? [input.snippet.slice(0, 500)] : [],
    name: input.title,
    price: input.price,
    productUrl: input.url,
    ...(input.retailer ? { retailer: input.retailer } : {}),
  } satisfies RawProductCandidate;
}

function shoppingUrl(result: SerperShoppingResult) {
  const values = [result.productLink, result.product_link, result.link]
    .map(asString)
    .filter(Boolean);
  return (
    values.find((value) => {
      const url = parseHttpUrl(value);
      return url && !normalizedHost(url).endsWith("google.com");
    }) ||
    values[0] ||
    ""
  );
}

function normalizeShoppingResult(
  result: SerperShoppingResult,
  category: string,
  fallbackPosition = 1,
) {
  const title = asString(result.title);
  const url = shoppingUrl(result);
  const parsed = parseHttpUrl(url);
  const price = priceFromResult(result);
  if (!title || !parsed) return { candidate: null, reason: "invalid_structure" };
  const retailer =
    asString(result.source) ||
    (!googleOfferUrl(parsed) ? normalizedHost(parsed) : null);
  if (genericTitle(title, category)) {
    return { candidate: null, reason: "generic_title" };
  }
  if (likelyAccessory(title)) {
    return { candidate: null, reason: "accessory_or_part" };
  }
  if (isNonProductSource(parsed.toString())) {
    return { candidate: null, reason: "non_product_source" };
  }
  if (googleOfferUrl(parsed) && (price === null || !retailer)) {
    return { candidate: null, reason: "incomplete_google_offer" };
  }

  const snippet = [
    asString(result.snippet),
    Array.isArray(result.extensions) ? result.extensions.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    candidate: candidateFromFields({
      category,
      commerceSignals: commerceSignals(result, fallbackPosition),
      currentShoppingOffer: price !== null && Boolean(retailer),
      imageUrl: firstString(
        result.imageUrl,
        result.image,
        result.thumbnailUrl,
        result.thumbnail,
      ),
      price,
      retailer,
      snippet,
      title,
      url,
    }),
    reason: null,
  };
}

function emptyShoppingDiagnostics(
  errorKind: ShoppingSearchDiagnostics["errorKind"],
): ShoppingSearchDiagnostics {
  return {
    errorKind,
    rawShoppingResults: 0,
    rejectionReasons: {},
    returnedCandidates: 0,
  };
}

export async function searchShoppingProducts(
  query: string,
  category = query,
  options: ProductSearchExecutionOptions = {},
): Promise<{
  candidates: RawProductCandidate[];
  diagnostics: ShoppingSearchDiagnostics;
}> {
  try {
    const response = await fetchSerper("shopping", query, options);
    if (!response) {
      return {
        candidates: [],
        diagnostics: emptyShoppingDiagnostics("missing_api_key_or_query"),
      };
    }
    const raw = (response.shopping || []).slice(0, SHOPPING_NORMALIZATION_LIMIT);
    const normalized = raw.map((result, index) =>
      normalizeShoppingResult(result, category, index + 1),
    );
    const rejectionReasons: Record<string, number> = {};
    for (const item of normalized) {
      if (!item.candidate) {
        const reason = item.reason || "normalization_failed";
        rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
      }
    }
    const candidates = normalized.flatMap((item) =>
      item.candidate ? [item.candidate] : [],
    );
    return {
      candidates,
      diagnostics: {
        rawShoppingResults: response.shopping?.length || 0,
        rejectionReasons,
        returnedCandidates: candidates.length,
      },
    };
  } catch (error) {
    rethrowIfRequestCancelled(error, options.signal);
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ReviewRadar product search] shopping request skipped");
    }
    return {
      candidates: [],
      diagnostics: emptyShoppingDiagnostics("api_error"),
    };
  }
}

export async function searchProductPages(
  query: string,
  category = query,
  options: ProductSearchExecutionOptions = {},
) {
  try {
    const response = await fetchSerper("search", query, options);
    if (!response) return [];
    const inlineShoppingCandidates = (response.shopping || [])
      .slice(0, SEARCH_RESULT_LIMIT)
      .flatMap((result, index) => {
        const normalized = normalizeShoppingResult(result, category, index + 1);
        if (!normalized.candidate) return [];
        const parsed = parseHttpUrl(normalized.candidate.productUrl);
        return parsed && !googleOfferUrl(parsed) ? [normalized.candidate] : [];
      });
    const organicCandidates = (response.organic || [])
      .slice(0, SEARCH_RESULT_LIMIT)
      .flatMap((result) => {
        const candidate = candidateFromFields({
          category,
          imageUrl: firstString(result.imageUrl, result.thumbnail),
          price: null,
          snippet: asString(result.snippet),
          title: asString(result.title),
          url: asString(result.link),
        });
        return candidate ? [candidate] : [];
      });
    const seenUrls = new Set<string>();
    return [...inlineShoppingCandidates, ...organicCandidates].filter(
      (candidate) => {
        const normalizedUrl = candidate.productUrl.toLowerCase();
        if (seenUrls.has(normalizedUrl)) return false;
        seenUrls.add(normalizedUrl);
        return true;
      },
    );
  } catch (error) {
    rethrowIfRequestCancelled(error, options.signal);
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ReviewRadar product search] page search skipped");
    }
    return [];
  }
}

const NON_NEW_CONDITION_PATTERN =
  /\b(?:open[- ]box|preowned|pre-owned|recertified|reconditioned|refurbished|renewed|used)\b/i;

function requestedUsedOrRefurbished(input: RecommendationApiRequest) {
  return NON_NEW_CONDITION_PATTERN.test(
    `${input.query} ${input.priorities || ""}`,
  );
}

function productPathConditionText(value: string) {
  try {
    return new URL(value).pathname.replace(/[-_]+/g, " ");
  } catch {
    return "";
  }
}

export function hasUnrequestedNonNewCondition(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  if (requestedUsedOrRefurbished(input)) return false;
  return NON_NEW_CONDITION_PATTERN.test(
    [
      candidate.name,
      candidate.keySpecs.join(" "),
      productPathConditionText(candidate.productUrl),
      candidate.evidenceSources
        .map((source) => `${source.title} ${source.snippet}`)
        .join(" "),
    ].join(" "),
  );
}

function prefilterRejectionReason(
  candidate: RawProductCandidate,
  input: RecommendationApiRequest,
) {
  const evidence = `${candidate.name} ${candidate.keySpecs.join(" ")}`;
  if (
    !classifyProductTypeMatch({
      allowedCheckText: evidence,
      evidenceText: evidence,
      identityText: candidate.name,
      requestedCategory: baseProductCategoryFromQuery(input.query),
    }).canBeExactMatch
  ) {
    return "wrong_category";
  }
  if (likelyAccessory(candidate.name)) return "accessory_or_part";
  if (hasUnrequestedNonNewCondition(candidate, input)) {
    return "used_or_refurbished";
  }
  const budgetLimit =
    parseMaxBudgetAmount(input.budget) ??
    parseMaxBudgetAmount(input.query, { requireDollarSignForRanges: true });
  if (
    budgetLimit !== null &&
    candidate.price !== null &&
    candidate.price > budgetLimit * 1.4
  ) {
    return "over_budget";
  }
  return null;
}

export function prefilterProductCandidates(
  candidates: RawProductCandidate[],
  input: RecommendationApiRequest,
  maximum: number,
) {
  const accepted: RawProductCandidate[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];
  for (const candidate of candidates) {
    const reason = prefilterRejectionReason(candidate, input);
    if (reason) rejected.push({ name: candidate.name, reason });
    else accepted.push(candidate);
  }
  return {
    candidates: accepted.slice(0, maximum),
    rejected,
    rejectedCount: rejected.length,
  };
}

export const productSearchTestExports = {
  commerceSignals,
  candidateFromFields,
  genericTitle,
  googleOfferUrl,
  likelyAccessory,
  normalizeShoppingResult,
  prefilterRejectionReason,
  sanitizeQuery,
};

import type { RawProductCandidate } from "@/types/review-radar";
import {
  candidateFromFields,
  type ProductSearchExecutionOptions,
} from "./productSearch.ts";
import {
  rethrowIfRequestCancelled,
  throwIfRequestCancelled,
} from "./requestCancellation.ts";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const REQUEST_TIMEOUT_MS = 6_500;
const PRODUCT_RESULT_LIMIT = 20;
const OFFER_RESULT_LIMIT = 13;

type SerpApiShoppingResult = {
  delivery?: unknown;
  extracted_price?: unknown;
  extensions?: unknown;
  immersive_product_page_token?: unknown;
  position?: unknown;
  price?: unknown;
  product_id?: unknown;
  product_link?: unknown;
  rating?: unknown;
  reviews?: unknown;
  second_hand_condition?: unknown;
  snippet?: unknown;
  source?: unknown;
  thumbnail?: unknown;
  title?: unknown;
};

type SerpApiStoreResult = {
  details_and_offers?: unknown;
  discount?: unknown;
  extracted_price?: unknown;
  link?: unknown;
  name?: unknown;
  price?: unknown;
  rating?: unknown;
  reviews?: unknown;
  tag?: unknown;
  title?: unknown;
};

type SerpApiResponse = {
  error?: unknown;
  product_results?: {
    brand?: unknown;
    rating?: unknown;
    reviews?: unknown;
    stores?: unknown;
    title?: unknown;
  };
  search_metadata?: {
    status?: unknown;
  };
  shopping_results?: unknown;
};

export type CanonicalCommerceProduct = {
  candidate: RawProductCandidate;
  pageToken: string;
  productId: string;
};

export type CanonicalCommerceDiagnostics = {
  errorKind?: "api_error" | "invalid_response" | "missing_api_key_or_query";
  rawResults: number;
  returnedCandidates: number;
};

export type CanonicalCommerceExecutionOptions = Pick<
  ProductSearchExecutionOptions,
  "signal"
> & {
  onAttempt?: (kind: "offer_lookup" | "product_search") => void;
  requestCache?: Map<string, Promise<SerpApiResponse | null>>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

function finiteNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.replace(/[$,]/g, "").trim())
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

function rating(value: unknown) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function compactIdentifier(value: unknown) {
  const compact = asString(value).slice(0, 300);
  return compact || null;
}

function parseHttpUrl(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function configuredApiKey() {
  const value = process.env.SERPAPI_API_KEY?.trim();
  if (!value) return null;
  if (
    new Set([
      "replace_me",
      "replace_with_your_serpapi_api_key",
      "your_serpapi_api_key_here",
      "your_serpapi_key_here",
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

function requestKey(parameters: URLSearchParams) {
  const sanitized = new URLSearchParams(parameters);
  sanitized.delete("api_key");
  sanitized.sort();
  return sanitized.toString();
}

async function fetchSerpApi(
  parameters: URLSearchParams,
  kind: "offer_lookup" | "product_search",
  options: CanonicalCommerceExecutionOptions,
) {
  throwIfRequestCancelled(options.signal);
  const apiKey = configuredApiKey();
  if (!apiKey) return null;

  const key = requestKey(parameters);
  let request = options.requestCache?.get(key);
  if (!request) {
    request = (async () => {
      options.onAttempt?.(kind);
      const controller = new AbortController();
      const forwardAbort = () => controller.abort(options.signal?.reason);
      options.signal?.addEventListener("abort", forwardAbort, { once: true });
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const requestParameters = new URLSearchParams(parameters);
        requestParameters.set("api_key", apiKey);
        const response = await fetch(
          `${SERPAPI_BASE_URL}?${requestParameters.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Canonical commerce request failed: ${response.status}`);
        }
        const body = (await response.json()) as SerpApiResponse;
        if (
          body.error ||
          (body.search_metadata?.status &&
            asString(body.search_metadata.status).toLowerCase() !== "success")
        ) {
          throw new Error("Canonical commerce provider returned an error.");
        }
        return body;
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", forwardAbort);
      }
    })();
    options.requestCache?.set(key, request);
  }

  try {
    const response = await request;
    throwIfRequestCancelled(options.signal);
    return response;
  } catch (error) {
    if (options.requestCache?.get(key) === request) {
      options.requestCache.delete(key);
    }
    throw error;
  }
}

function emptyDiagnostics(
  errorKind: CanonicalCommerceDiagnostics["errorKind"],
): CanonicalCommerceDiagnostics {
  return { errorKind, rawResults: 0, returnedCandidates: 0 };
}

function shoppingProductCandidate(
  result: SerpApiShoppingResult,
  category: string,
  fallbackPosition: number,
) {
  const pageToken = compactIdentifier(result.immersive_product_page_token);
  const productId = compactIdentifier(result.product_id);
  const productUrl = parseHttpUrl(result.product_link);
  if (!pageToken || !productId || !productUrl) return null;

  const extensions = stringArray(result.extensions);
  const candidate = candidateFromFields({
    category,
    commerceSignals: {
      offerCount: null,
      position: positiveInteger(result.position) ?? fallbackPosition,
      productId,
      rating: rating(result.rating),
      ratingCount: nonnegativeInteger(result.reviews),
    },
    discoveryProvider: "serpapi",
    imageUrl: asString(result.thumbnail),
    price: finiteNumber(result.extracted_price ?? result.price),
    retailer: asString(result.source) || null,
    snippet: [
      asString(result.snippet),
      asString(result.delivery),
      asString(result.second_hand_condition),
      ...extensions,
    ]
      .filter(Boolean)
      .join(" "),
    title: asString(result.title),
    url: productUrl.toString(),
  });
  if (!candidate) return null;

  return { candidate, pageToken, productId } satisfies CanonicalCommerceProduct;
}

export async function searchCanonicalCommerceProducts(
  query: string,
  category = query,
  options: CanonicalCommerceExecutionOptions = {},
): Promise<{
  diagnostics: CanonicalCommerceDiagnostics;
  products: CanonicalCommerceProduct[];
}> {
  const safeQuery = sanitizeQuery(query);
  if (!configuredApiKey() || !safeQuery) {
    return {
      diagnostics: emptyDiagnostics("missing_api_key_or_query"),
      products: [],
    };
  }

  const parameters = new URLSearchParams({
    engine: "google_shopping_light",
    gl: "us",
    hl: "en",
    location: "United States",
    no_cache: "true",
    q: safeQuery,
  });
  try {
    const response = await fetchSerpApi(parameters, "product_search", options);
    const raw = Array.isArray(response?.shopping_results)
      ? (response.shopping_results as SerpApiShoppingResult[]).slice(
          0,
          PRODUCT_RESULT_LIMIT,
        )
      : [];
    if (!response || !Array.isArray(response.shopping_results)) {
      return {
        diagnostics: emptyDiagnostics("invalid_response"),
        products: [],
      };
    }
    const products = raw.flatMap((result, index) => {
      const product = shoppingProductCandidate(result, category, index + 1);
      return product ? [product] : [];
    });
    return {
      diagnostics: {
        rawResults: raw.length,
        returnedCandidates: products.length,
      },
      products,
    };
  } catch (error) {
    rethrowIfRequestCancelled(error, options.signal);
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ReviewRadar canonical commerce] product search skipped");
    }
    return { diagnostics: emptyDiagnostics("api_error"), products: [] };
  }
}

function storeAvailability(store: SerpApiStoreResult) {
  const text = stringArray(store.details_and_offers).join(" ");
  if (/\b(?:out of stock|sold out|unavailable)\b/i.test(text)) {
    return "unavailable" as const;
  }
  if (/\b(?:in stock|available (?:online|now|for)|ready for pickup)\b/i.test(text)) {
    return "available" as const;
  }
  return "unknown" as const;
}

function storeCandidate(input: {
  canonicalBrand: string;
  canonicalTitle: string;
  category: string;
  offerCount: number;
  product: CanonicalCommerceProduct;
  result: SerpApiStoreResult;
  position: number;
  productRating: number | null;
  productRatingCount: number | null;
}) {
  const availability = storeAvailability(input.result);
  if (availability === "unavailable") return null;
  const url = parseHttpUrl(input.result.link);
  if (!url) return null;
  const price = finiteNumber(input.result.extracted_price ?? input.result.price);
  const retailer = asString(input.result.name);
  const title = asString(input.result.title) || input.canonicalTitle;
  const details = stringArray(input.result.details_and_offers);

  return candidateFromFields({
    category: input.category,
    commerceSignals: {
      offerCount: input.offerCount,
      position: input.position,
      productId: input.product.productId,
      rating: input.productRating ?? rating(input.result.rating),
      ratingCount:
        input.productRatingCount ?? nonnegativeInteger(input.result.reviews),
    },
    currentShoppingOffer:
      availability === "available" && price !== null && Boolean(retailer),
    discoveryProvider: "serpapi",
    imageUrl: input.product.candidate.imageUrl || "",
    price,
    retailer: retailer || null,
    snippet: [
      input.canonicalTitle,
      input.canonicalBrand,
      ...details,
      asString(input.result.tag),
      asString(input.result.discount),
    ]
      .filter(Boolean)
      .join(" "),
    title,
    url: url.toString(),
  });
}

export async function fetchCanonicalCommerceOffers(
  product: CanonicalCommerceProduct,
  category: string,
  options: CanonicalCommerceExecutionOptions = {},
): Promise<{
  candidates: RawProductCandidate[];
  diagnostics: CanonicalCommerceDiagnostics;
}> {
  if (!configuredApiKey() || !product.pageToken) {
    return {
      candidates: [],
      diagnostics: emptyDiagnostics("missing_api_key_or_query"),
    };
  }

  const parameters = new URLSearchParams({
    engine: "google_immersive_product",
    more_stores: "true",
    no_cache: "true",
    page_token: product.pageToken,
  });
  try {
    const response = await fetchSerpApi(parameters, "offer_lookup", options);
    const results = response?.product_results;
    if (!response || !results || !Array.isArray(results.stores)) {
      return {
        candidates: [],
        diagnostics: emptyDiagnostics("invalid_response"),
      };
    }
    const stores = (results.stores as SerpApiStoreResult[]).slice(
      0,
      OFFER_RESULT_LIMIT,
    );
    const canonicalTitle = asString(results.title) || product.candidate.name;
    const canonicalBrand =
      asString(results.brand) || product.candidate.brand || "";
    const productRating =
      rating(results.rating) ??
      product.candidate.commerceSignals?.rating ??
      null;
    const productRatingCount =
      nonnegativeInteger(results.reviews) ??
      product.candidate.commerceSignals?.ratingCount ??
      null;
    const candidates = stores.flatMap((result, index) => {
      const candidate = storeCandidate({
        canonicalBrand,
        canonicalTitle,
        category,
        offerCount: stores.length,
        position: index + 1,
        product,
        productRating,
        productRatingCount,
        result,
      });
      return candidate ? [candidate] : [];
    });
    return {
      candidates,
      diagnostics: {
        rawResults: stores.length,
        returnedCandidates: candidates.length,
      },
    };
  } catch (error) {
    rethrowIfRequestCancelled(error, options.signal);
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ReviewRadar canonical commerce] offer lookup skipped");
    }
    return { candidates: [], diagnostics: emptyDiagnostics("api_error") };
  }
}

export const canonicalCommerceTestExports = {
  configuredApiKey,
  requestKey,
  sanitizeQuery,
  shoppingProductCandidate,
  storeAvailability,
};

import { createHash } from "node:crypto";
import { getCachedOrLoad, normalizeCacheKey } from "./cache.ts";
import {
  fetchSafeProductPage,
  LIVE_PRODUCT_PAGE_FETCH_DEPENDENCIES,
  type SafeProductPageFetchDependencies,
  type SafeProductPageFetchResult,
} from "./safeProductPageFetch.ts";
import {
  extractProductImageCandidatesFromHtml,
  imageResolutionToField,
  logImageResolutionDebug,
  resolveBestProductImage,
  type ProductImageCandidate,
  type ProductImageContext,
} from "./productImageResolver.ts";
import {
  parseBestMoneyAmount,
} from "./priceParsing.ts";
import { assessProductPriceTrust } from "./productPriceTrust.ts";
import type {
  ProductFieldEvidence,
  ProductMetadata,
  ProductOffer,
  ProductPriceTrust,
} from "@/types/review-radar";
import {
  haveConflictingCompoundModelSequences,
  haveConflictingDescriptiveModelSequences,
} from "./productIdentity.ts";
import { sourceUrlPathIdentitySegments } from "./sourceUrlIdentity.ts";
import { throwIfRequestCancelled } from "./requestCancellation.ts";

type ProductAssetRecommendation = {
  category?: string;
  imageUrl: string;
  name: string;
  pageUrl: string;
  priceTrust?: ProductPriceTrust;
  metadata?: ProductMetadata;
};

type ProductAssetResult = {
  recommendations: ProductAssetRecommendation[];
};

type ProductAssetEnrichmentOptions = {
  concurrency?: number;
  fetchDependencies?: SafeProductPageFetchDependencies;
  signal?: AbortSignal;
};

type ProductPageFetchResult = {
  clearRequestedUrl: boolean;
  html: string;
};

const PRODUCT_ASSET_TIMEOUT_MS = 5000;
const PRODUCT_ASSET_CACHE_TTL_MS = 1000 * 60 * 30;
const PRODUCT_ASSET_MAX_BYTES = 1_500_000;
const PRODUCT_ASSET_MAX_REDIRECTS = 2;
const PRODUCT_ASSET_CONCURRENCY = 4;
const PRODUCT_ASSET_CONTENT_TYPES = [
  "application/xhtml+xml",
  "text/html",
] as const;
const LIKELY_PRODUCT_PATH_PARTS = [
  "/dp/",
  "/gp/product/",
  "/ip/",
  "/item/",
  "/p/",
  "/pd/",
  "/product",
  "/products",
  "/shop/",
  "/site/",
  "/sku",
  "/catalog/product",
  "/buy/",
];
const EDITORIAL_PATH_PARTS = [
  "/article",
  "/best-",
  "/blog",
  "/deal",
  "/guide",
  "/news",
  "/product-reviews",
  "/review",
  "/reviews",
  "/roundup",
];
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
  "stainless steel",
  "tan",
  "taupe",
  "white",
];

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "tag" ||
        lowerKey === "ascsubtag" ||
        lowerKey === "linkcode" ||
        lowerKey === "camp" ||
        lowerKey === "creative" ||
        lowerKey === "creativeasin" ||
        lowerKey === "srsltid"
      ) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function getProductWords(productName: string) {
  return productName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function productNameHasUrlMatch(productName: string, url: string) {
  try {
    const parsed = new URL(url);
    const searchableUrl = decodeURIComponent(
      `${parsed.hostname} ${parsed.pathname}`,
    ).toLowerCase();
    const words = getProductWords(productName);

    if (words.length === 0) {
      return false;
    }

    const matches = words.filter((word) => searchableUrl.includes(word));
    return matches.length >= Math.min(2, words.length);
  } catch {
    return false;
  }
}

function looksLikeEditorialUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    return EDITORIAL_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return true;
  }
}

function looksLikeProductPageUrl(url: string, productName: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (looksLikeEditorialUrl(url)) {
      return false;
    }

    return (
      LIKELY_PRODUCT_PATH_PARTS.some((part) => path.includes(part)) ||
      parsed.searchParams.has("sku") ||
      parsed.searchParams.has("model") ||
      productNameHasUrlMatch(productName, url)
    );
  } catch {
    return false;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function compactText(value: string) {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function getMetaContent(html: string, property: string) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function resolveUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function productNameHasPageMatch(productName: string, html: string) {
  const words = getProductWords(productName);

  if (words.length === 0) {
    return false;
  }

  const searchableHtml = html.toLowerCase();
  const matches = words.filter((word) => searchableHtml.includes(word));

  return matches.length >= Math.min(2, words.length);
}

function shouldClearRequestedProductUrl(result: SafeProductPageFetchResult) {
  return (
    !result.ok &&
    (result.reason === "credentials_forbidden" ||
      result.reason === "invalid_url" ||
      result.reason === "non_default_port" ||
      result.reason === "non_public_address")
  );
}

async function fetchText(
  url: string,
  fetchDependencies: SafeProductPageFetchDependencies,
  signal?: AbortSignal,
): Promise<ProductPageFetchResult> {
  throwIfRequestCancelled(signal);
  const cacheKey = productPageCacheKey(url);

  return getCachedOrLoad(cacheKey, PRODUCT_ASSET_CACHE_TTL_MS, async (sharedSignal) => {
    const result = await fetchSafeProductPage(url, fetchDependencies, {
      allowedContentTypes: PRODUCT_ASSET_CONTENT_TYPES,
      maxBytes: PRODUCT_ASSET_MAX_BYTES,
      maxRedirects: PRODUCT_ASSET_MAX_REDIRECTS,
      timeoutMs: PRODUCT_ASSET_TIMEOUT_MS,
      signal: sharedSignal,
    });
    return {
      clearRequestedUrl: shouldClearRequestedProductUrl(result),
      html: result.ok ? result.body : "",
    };
  }, undefined, { signal });
}

function productPageCacheKey(url: string) {
  const urlDigest = createHash("sha256")
    .update(normalizeUrl(url))
    .digest("hex");
  return normalizeCacheKey(["product-page", urlDigest]);
}

function productImageContext(
  product: ProductAssetRecommendation,
  pageUrl = "",
): ProductImageContext {
  return {
    brand: product.metadata?.brand?.value || null,
    category: product.category || null,
    modelNumber: product.metadata?.modelNumber?.value || null,
    pageUrl,
    productName: product.name,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function field<T>(
  value: T,
  sourceUrl: string,
  sourceType: ProductFieldEvidence<T>["sourceType"],
  confidence: ProductFieldEvidence<T>["confidence"],
): ProductFieldEvidence<T> {
  return {
    confidence,
    sourceType,
    sourceUrl,
    value,
    verifiedAt: new Date().toISOString(),
  };
}

function offerKey(offer: ProductOffer) {
  return [
    offer.price.sourceUrl,
    offer.priceCurrency.value || "unknown-currency",
    offer.price.value ?? "unknown",
  ].join("|");
}

function mergeOffers(
  existing: ProductOffer[] = [],
  incoming: ProductOffer[] = [],
) {
  const seen = new Set<string>();
  const offers: ProductOffer[] = [];

  for (const offer of [...incoming, ...existing]) {
    const key = offerKey(offer);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    offers.push(offer);
  }

  return offers;
}

function mergeMetadata(
  existing: ProductMetadata | undefined,
  incoming: ProductMetadata,
): ProductMetadata {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    brand: incoming.brand || existing.brand,
    colors: incoming.colors || existing.colors,
    dimensions:
      incoming.dimensions || existing.dimensions
        ? {
            unit: incoming.dimensions?.unit || existing.dimensions?.unit || null,
            depth: incoming.dimensions?.depth || existing.dimensions?.depth,
            height: incoming.dimensions?.height || existing.dimensions?.height,
            width: incoming.dimensions?.width || existing.dimensions?.width,
          }
        : undefined,
    image: incoming.image || existing.image,
    modelNumber: incoming.modelNumber || existing.modelNumber,
    offers: mergeOffers(existing.offers, incoming.offers),
    title: incoming.title || existing.title,
  };
}

function jsonLdScripts(html: string) {
  return Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  )
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (!isRecord(value)) {
    return [];
  }

  const graph = value["@graph"];
  const nested = Array.isArray(graph) ? graph.flatMap(flattenJsonLd) : [];

  return [value, ...nested];
}

function jsonLdTypeMatches(value: unknown, type: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonLdTypeMatches(item, type));
  }

  return typeof value === "string" && value.toLowerCase() === type.toLowerCase();
}

function parseJsonLdProducts(html: string) {
  const products: Record<string, unknown>[] = [];

  for (const script of jsonLdScripts(html)) {
    try {
      const parsed = JSON.parse(decodeHtml(script));
      products.push(
        ...flattenJsonLd(parsed).filter((item) =>
          jsonLdTypeMatches(item["@type"], "Product"),
        ),
      );
    } catch {
      // Ignore malformed page metadata.
    }
  }

  return products;
}

function allOffers(product: Record<string, unknown>) {
  const offers = product.offers;

  if (Array.isArray(offers)) {
    return offers.filter(isRecord);
  }

  return isRecord(offers) ? [offers] : [];
}

function priceFromValue(value: unknown) {
  return parseBestMoneyAmount(value, {
    allowBareNumeric: true,
    allowBareRange: true,
  });
}

function normalizedIdentityTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function productIdentityTextMatches(targetName: string, evidenceName: string) {
  const targetTokens = normalizedIdentityTokens(targetName);
  const evidenceTokens = normalizedIdentityTokens(evidenceName);

  if (targetTokens.length === 0 || evidenceTokens.length === 0) {
    return false;
  }

  if (targetTokens.join(" ") === evidenceTokens.join(" ")) {
    return true;
  }

  const targetModels = targetTokens.filter(
    (token) => /\d/.test(token) && /[a-z]/.test(token),
  );
  const evidenceModels = evidenceTokens.filter(
    (token) => /\d/.test(token) && /[a-z]/.test(token),
  );

  if (
    targetModels.length > 0 &&
    evidenceModels.length > 0 &&
    !targetModels.some((token) => evidenceModels.includes(token))
  ) {
    return false;
  }

  const evidenceSet = new Set(evidenceTokens);
  const overlap = targetTokens.filter((token) => evidenceSet.has(token)).length;
  const shorterLength = Math.min(targetTokens.length, evidenceTokens.length);

  return overlap >= 2 && overlap / shorterLength >= 0.5;
}

function selectMatchingJsonLdProduct(
  products: Record<string, unknown>[],
  targetName: string,
) {
  return (
    products.find((product) =>
      productIdentityTextMatches(targetName, asString(product.name)),
    ) || null
  );
}

function getFirstHeadingText(html: string) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match?.[1] ? compactText(match[1]) : "";
}

function getTagAttribute(tag: string, attribute: string) {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedAttribute}=["']([^"']*)["']`, "i"),
  );

  return match?.[1] ? decodeHtml(match[1].trim()) : "";
}

function explicitPriceText(value: string) {
  return (
    /[$€£¥]/.test(value) ||
    /\b[A-Z]{3}\b/.test(value) ||
    /\d[.,]\d{2}\b/.test(value)
  );
}

function priceFromProductScopedDataTag(tag: string, targetName: string) {
  const identityText = [
    "data-product-title",
    "data-product-name",
    "data-title",
    "aria-label",
    "title",
  ]
    .map((attribute) => getTagAttribute(tag, attribute))
    .find((value) => value.length > 0);

  if (!identityText || !productIdentityTextMatches(targetName, identityText)) {
    return null;
  }

  const rawPrice = [
    "data-product-price",
    "data-current-price",
    "data-sale-price",
    "data-price",
  ]
    .map((attribute) => getTagAttribute(tag, attribute))
    .find((value) => value.length > 0);

  if (!rawPrice) {
    return null;
  }

  const unit = [
    "data-price-unit",
    "data-price-format",
    "data-currency-unit",
  ]
    .map((attribute) => getTagAttribute(tag, attribute).toLowerCase())
    .find((value) => value.length > 0);

  if (/^\d+$/.test(rawPrice)) {
    if (unit && /^(?:cent|cents|minor|minor-unit|minor-units)$/.test(unit)) {
      return Number(rawPrice) / 100;
    }

    return null;
  }

  return explicitPriceText(rawPrice) ? priceFromValue(rawPrice) : null;
}

function priceFromPriceSpecification(value: unknown): number | null {
  if (Array.isArray(value)) {
    const prices = value
      .map(priceFromPriceSpecification)
      .filter((price): price is number => price !== null);

    return prices.length > 0 ? Math.min(...prices) : null;
  }

  if (!isRecord(value)) {
    return priceFromValue(value);
  }

  const directPrices = [
    value.price,
    value.minPrice,
    value.lowPrice,
    value.salePrice,
    value.currentPrice,
  ]
    .map(priceFromValue)
    .filter((price): price is number => price !== null);

  if (directPrices.length > 0) {
    return Math.min(...directPrices);
  }

  return null;
}

function priceFromOffer(offer: Record<string, unknown>) {
  const directPrices = [
    offer.price,
    offer.salePrice,
    offer.currentPrice,
    offer.lowPrice,
    offer.highPrice,
  ]
    .map(priceFromValue)
    .filter((price): price is number => price !== null);
  const specificationPrice = priceFromPriceSpecification(
    offer.priceSpecification,
  );

  if (specificationPrice !== null) {
    directPrices.push(specificationPrice);
  }

  return directPrices.length > 0 ? Math.min(...directPrices) : null;
}

function lowestOfferPrice(offers: Record<string, unknown>[]) {
  const prices = offers
    .map(priceFromOffer)
    .filter((price): price is number => price !== null);

  return prices.length > 0 ? Math.min(...prices) : null;
}

function getPriceCurrencyFromRecord(record: Record<string, unknown>) {
  const directCurrency = asString(record.priceCurrency);

  if (directCurrency) {
    return directCurrency;
  }

  const specification = record.priceSpecification;

  if (Array.isArray(specification)) {
    for (const item of specification) {
      if (isRecord(item)) {
        const currency = asString(item.priceCurrency);

        if (currency) {
          return currency;
        }
      }
    }
  }

  if (isRecord(specification)) {
    return asString(specification.priceCurrency);
  }

  return "";
}

function getMetaItempropContent(html: string, itemprop: string) {
  const escapedItemprop = itemprop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+itemprop=["']${escapedItemprop}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${escapedItemprop}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function visiblePriceContextLooksPromotional(
  text: string,
  index: number,
  endIndex: number,
  nextPriceIndex: number | null,
) {
  const before = text.slice(Math.max(0, index - 120), index);
  const afterEnd =
    nextPriceIndex === null ? endIndex + 180 : Math.min(nextPriceIndex, endIndex + 180);
  const after = text.slice(endIndex, afterEnd);
  const immediateBefore = before.slice(-48);
  const hasCurrentPriceLabel =
    /\b(?:current|list|regular|retail|sale)\s+price\s*$/i.test(immediateBefore) ||
    /\bprice\s*$/i.test(immediateBefore);

  return (
    (!hasCurrentPriceLabel &&
      /\b(?:apply for|\bpay\b|credit card|consumer card|financing|finance|installments?|monthly|payment\s+plan|affirm|afterpay|klarna)\b/i.test(
        immediateBefore,
      )) ||
    /^\s*(?:\/\s*mo|\/\s*month|mo\.?\b|per\s+month\b|a\s+month\b|monthly\b|month\b|installments?\b)/i.test(after) ||
    /\b(?:after\s+\$?\d|credit card|consumer card|qualifying purchase|upon opening|coupon|promo code|with coupon|off your total|financing|finance|installments?|monthly|payment\s+plan|affirm|afterpay|klarna)\b/i.test(
      after,
    )
  );
}

function visibleProductPagePrice(html: string) {
  const visibleText = compactText(html);
  const matches: Array<{ endIndex: number; index: number; value: string }> = [];

  for (const match of visibleText.matchAll(
    /\$\s*(\d[\d,]*)\s*(?:\.|¢|\s)\s*(\d{2})\b/g,
  )) {
    matches.push({
      endIndex: (match.index || 0) + match[0].length,
      index: match.index || 0,
      value: `${match[1]}.${match[2]}`,
    });
  }

  for (const match of visibleText.matchAll(
    /\$\s*(\d[\d,]*(?:\.\d{2})?)\b(?!\s*(?:\.|¢|\s)\s*\d{2}\b)/g,
  )) {
    matches.push({
      endIndex: (match.index || 0) + match[0].length,
      index: match.index || 0,
      value: match[1] || "",
    });
  }

  const sortedMatches = matches.sort((a, b) => a.index - b.index);

  for (const [matchIndex, match] of sortedMatches.entries()) {
    const nextPriceIndex = sortedMatches[matchIndex + 1]?.index ?? null;

    if (
      visiblePriceContextLooksPromotional(
        visibleText,
        match.index,
        match.endIndex,
        nextPriceIndex,
      )
    ) {
      continue;
    }

    const price = priceFromValue(match.value);

    if (price !== null) {
      return price;
    }
  }

  return null;
}
function priceFromPageMetadata(input: {
  html: string;
  pageIdentityTitle: string;
  targetName: string;
}) {
  const pageIdentityMatches = productIdentityTextMatches(
    input.targetName,
    input.pageIdentityTitle,
  );
  const metaValues = pageIdentityMatches
    ? [
        getMetaContent(input.html, "product:price:amount"),
        getMetaContent(input.html, "og:price:amount"),
        getMetaContent(input.html, "twitter:data1"),
        getMetaContent(input.html, "price"),
        getMetaItempropContent(input.html, "price"),
        getMetaItempropContent(input.html, "lowPrice"),
      ]
    : [];
  const dataPrices = Array.from(
    input.html.matchAll(
      /<[^>]+\b(?:data-price|data-sale-price|data-current-price|data-product-price)=["'][^"']+["'][^>]*>/gi,
    ),
  )
    .map((match) =>
      priceFromProductScopedDataTag(match[0], input.targetName),
    )
    .filter((price): price is number => price !== null);
  const namedPriceValues = [
    ...Array.from(
      input.html.matchAll(
        /<(?:input|meta)[^>]+(?:name|id)=["'](?:price|product[_-]?price|current[_-]?price|sale[_-]?price)["'][^>]+value=["']([^"']+)["'][^>]*>/gi,
      ),
    ),
    ...Array.from(
      input.html.matchAll(
        /<(?:input|meta)[^>]+value=["']([^"']+)["'][^>]+(?:name|id)=["'](?:price|product[_-]?price|current[_-]?price|sale[_-]?price)["'][^>]*>/gi,
      ),
    ),
  ]
    .map((match) => decodeHtml(match[1] || ""))
    .filter((value) => pageIdentityMatches && explicitPriceText(value));
  // Do not scrape loose `"price": 35` style values from retailer app-state.
  // Those blobs often contain shipping thresholds, financing payments, promo
  // amounts, or related-product prices that are not the linked product price.
  const structuredPrices = [
    ...metaValues,
    ...dataPrices,
    ...namedPriceValues,
  ]
    .map(priceFromValue)
    .filter((price): price is number => price !== null);

  if (structuredPrices.length > 0) {
    return Math.min(...structuredPrices);
  }

  return pageIdentityMatches ? visibleProductPagePrice(input.html) : null;
}

function priceCurrencyFromPageMetadata(html: string) {
  return (
    getMetaContent(html, "product:price:currency") ||
    getMetaContent(html, "og:price:currency") ||
    getMetaItempropContent(html, "priceCurrency")
  );
}

function getBrand(product: Record<string, unknown>) {
  const brand = product.brand;

  if (isRecord(brand)) {
    return asString(brand.name);
  }

  return asString(brand);
}

function getCanonicalLink(html: string, pageUrl: string) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);

  return match?.[1] ? normalizeUrl(resolveUrl(decodeHtml(match[1]), pageUrl)) : "";
}

function extractColorsFromText(text: string) {
  const normalized = text.toLowerCase();

  return knownColors.filter((color) =>
    new RegExp(`(^|\\W)${color.replace(/\s+/g, "\\s+")}(\\W|$)`, "i").test(
      normalized,
    ),
  );
}

function extractWidthFromText(text: string) {
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

function extractDimensionFromText(
  text: string,
  dimension: "depth" | "height" | "width",
) {
  if (dimension === "width") {
    return extractWidthFromText(text);
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

function extractSpecTableText(html: string) {
  const rows = Array.from(
    html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi),
  ).flatMap((row) => {
    const cells = Array.from(
      (row[1] || "").matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
    ).map((cell) => compactText(cell[1] || ""));

    return cells.length >= 2 ? [`${cells[0]}: ${cells.slice(1).join(" ")}`] : [];
  });
  const definitionRows = Array.from(
    html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi),
  ).map((match) => `${compactText(match[1] || "")}: ${compactText(match[2] || "")}`);

  return [...rows, ...definitionRows].join(" | ").slice(0, 5000);
}

function buildMetadata(input: {
  html: string;
  pageUrl: string;
  product: ProductAssetRecommendation;
  productImageUrl: string;
}) {
  const product = selectMatchingJsonLdProduct(
    parseJsonLdProducts(input.html),
    input.product.name,
  );
  const offers = product ? allOffers(product) : [];
  const offer = offers[0] || null;
  const pageIdentityTitle =
    (product ? asString(product.name) : "") ||
    getMetaContent(input.html, "og:title") ||
    getMetaContent(input.html, "twitter:title") ||
    getFirstHeadingText(input.html);
  const pageTitle =
    pageIdentityTitle ||
    input.product.name;
  const canonicalUrl = getCanonicalLink(input.html, input.pageUrl) || input.pageUrl;
  const brand = product ? getBrand(product) : "";
  const pageMetadataPrice = priceFromPageMetadata({
    html: input.html,
    pageIdentityTitle,
    targetName: input.product.name,
  });
  const price = lowestOfferPrice(offers) ?? pageMetadataPrice;
  const priceCurrency =
    (offer ? getPriceCurrencyFromRecord(offer) : "") ||
    priceCurrencyFromPageMetadata(input.html);
  const modelNumber = product
    ? asString(product.model) || asString(product.mpn)
    : "";
  const colorValue = product ? asString(product.color) : "";
  const colors = Array.from(
    new Set([
      ...extractColorsFromText(colorValue),
      ...extractColorsFromText(`${pageTitle} ${input.product.name}`),
    ]),
  );
  const specText = extractSpecTableText(input.html);
  const dimensionText = `${pageTitle} ${asString(product?.description)} ${input.product.name} ${specText}`;
  const width = extractWidthFromText(
    dimensionText,
  );
  const depth = extractDimensionFromText(dimensionText, "depth");
  const height = extractDimensionFromText(dimensionText, "height");
  const sourceType = product ? "json_ld" : "open_graph";
  const metadata: ProductMetadata = {
    offers: [],
    title: field(pageTitle, canonicalUrl, sourceType, product ? "High" : "Medium"),
  };

  if (brand) {
    metadata.brand = field(brand, canonicalUrl, "json_ld", "High");
  }

  if (modelNumber) {
    metadata.modelNumber = field(modelNumber, canonicalUrl, "json_ld", "High");
  }

  if (colors.length > 0) {
    metadata.colors = field(colors, canonicalUrl, sourceType, product ? "High" : "Medium");
  }

  if (width !== null || depth !== null || height !== null) {
    metadata.dimensions = {
      unit: "in",
      ...(width !== null
        ? { width: field(width, canonicalUrl, sourceType, product ? "High" : "Medium") }
        : {}),
      ...(depth !== null
        ? { depth: field(depth, canonicalUrl, "retailer_page", product ? "Medium" : "Low") }
        : {}),
      ...(height !== null
        ? { height: field(height, canonicalUrl, "retailer_page", product ? "Medium" : "Low") }
        : {}),
    };
  }

  if (input.productImageUrl) {
    metadata.image = field(input.productImageUrl, canonicalUrl, sourceType, "Medium");
  }

  if (offer || price !== null || priceCurrency) {
    const priceSourceType = offer ? "json_ld" : "retailer_page";
    const priceConfidence = offer ? "High" : "Medium";

    metadata.offers.push({
      price: field(price, canonicalUrl, priceSourceType, priceConfidence),
      priceCurrency: field(priceCurrency || null, canonicalUrl, priceSourceType, priceConfidence),
    });
  }

  return metadata;
}

function withVerifiedOfferPriceFields<T extends ProductAssetRecommendation>(
  product: T,
): T {
  return {
    ...product,
    priceTrust: assessProductPriceTrust(product),
  };
}

async function getVerifiedProductAssets(
  product: ProductAssetRecommendation,
  fetchDependencies: SafeProductPageFetchDependencies,
  signal?: AbortSignal,
) {
  throwIfRequestCancelled(signal);
  const proposedProductPageUrl = normalizeUrl(product.pageUrl);
  const proposedPathIdentitySegments = sourceUrlPathIdentitySegments(
    proposedProductPageUrl,
  );
  const explicitModel = product.metadata?.modelNumber?.value || "";
  const primaryProductPageUrl =
    proposedPathIdentitySegments.some((segment) =>
      haveConflictingCompoundModelSequences(product.name, segment),
    ) ||
    (explicitModel &&
      proposedPathIdentitySegments.some((segment) =>
        haveConflictingDescriptiveModelSequences(explicitModel, segment),
      ))
    ? ""
    : proposedProductPageUrl;
  const productPageUrl = primaryProductPageUrl;
  const initialImageCandidates: ProductImageCandidate[] = [];

  if (product.imageUrl) {
    initialImageCandidates.push({
      evidenceText: "",
      source: "existing",
      url: product.imageUrl,
    });
  }

  if (product.metadata?.image?.value) {
    initialImageCandidates.push({
      evidenceText: "",
      source: "trusted_metadata",
      url: product.metadata.image.value,
    });
  }
  let imageResolution = resolveBestProductImage(
    initialImageCandidates,
    productImageContext(product, productPageUrl),
  );

  if (!productPageUrl || !isHttpUrl(productPageUrl)) {
    logImageResolutionDebug(product.name, imageResolution);

    return {
      metadata: {
        ...(product.metadata || { offers: [] }),
        ...(imageResolution.url
          ? {
              image: imageResolutionToField(
                imageResolution,
                imageResolution.url,
              ),
            }
          : {}),
      },
      pageUrl: "",
      imageUrl: imageResolution.url,
    };
  }

  const pageFetch = await fetchText(
    productPageUrl,
    fetchDependencies,
    signal,
  );
  const html = pageFetch.html;
  const likelyProductPage = looksLikeProductPageUrl(
    productPageUrl,
    product.name,
  );

  if (pageFetch.clearRequestedUrl) {
    logImageResolutionDebug(product.name, imageResolution);

    return {
      metadata: {
        ...(product.metadata || { offers: [] }),
        ...(imageResolution.url
          ? {
              image: imageResolutionToField(
                imageResolution,
                imageResolution.url,
              ),
            }
          : {}),
      },
      pageUrl: "",
      imageUrl: imageResolution.url,
    };
  }

  if (looksLikeEditorialUrl(productPageUrl)) {
    logImageResolutionDebug(product.name, imageResolution);

    return {
      metadata: {
        ...(product.metadata || { offers: [] }),
        ...(imageResolution.url
          ? {
              image: imageResolutionToField(
                imageResolution,
                imageResolution.url,
              ),
            }
          : {}),
      },
      pageUrl: "",
      imageUrl: imageResolution.url,
    };
  }

  const pageMatchesProduct = html
    ? productNameHasPageMatch(product.name, html)
    : false;

  if (html && !pageMatchesProduct && !likelyProductPage) {
    logImageResolutionDebug(product.name, imageResolution);

    return {
      metadata: {
        ...(product.metadata || { offers: [] }),
        ...(imageResolution.url
          ? {
              image: imageResolutionToField(
                imageResolution,
                imageResolution.url,
              ),
            }
          : {}),
      },
      pageUrl: "",
      imageUrl: imageResolution.url,
    };
  }

  if (!html && !likelyProductPage) {
    logImageResolutionDebug(product.name, imageResolution);

    return {
      metadata: {
        ...(product.metadata || { offers: [] }),
        ...(imageResolution.url
          ? {
              image: imageResolutionToField(
                imageResolution,
                imageResolution.url,
              ),
            }
          : {}),
      },
      pageUrl: "",
      imageUrl: imageResolution.url,
    };
  }

  if (html) {
    const pageImageResolution = resolveBestProductImage(
      [
        ...initialImageCandidates,
        ...extractProductImageCandidatesFromHtml(
          html,
          productPageUrl,
          productImageContext(product, productPageUrl),
          { pageIdentityVerified: pageMatchesProduct },
        ),
      ],
      productImageContext(product, productPageUrl),
    );

    imageResolution =
      pageImageResolution.confidence !== "none"
        ? {
            ...pageImageResolution,
            rejected: [
              ...imageResolution.rejected,
              ...pageImageResolution.rejected,
            ],
          }
        : {
            ...imageResolution,
            rejected: [
              ...imageResolution.rejected,
              ...pageImageResolution.rejected,
            ],
          };
  }

  const productImageUrl = imageResolution.url;
  const metadata = html
    ? mergeMetadata(
        product.metadata,
        buildMetadata({
          html,
          pageUrl: productPageUrl,
          product,
          productImageUrl,
        }),
      )
    : product.metadata || { offers: [] };
  const imageField = imageResolutionToField(imageResolution, productPageUrl);
  const metadataWithImage = {
    ...metadata,
    ...(imageField ? { image: imageField } : {}),
  };

  logImageResolutionDebug(product.name, imageResolution);

  return {
    pageUrl: productPageUrl,
    imageUrl: productImageUrl,
    metadata: metadataWithImage,
  };
}

export async function enrichProductAssets<T extends ProductAssetResult>(
  result: T,
  options: ProductAssetEnrichmentOptions = {},
): Promise<T> {
  throwIfRequestCancelled(options.signal);
  const fetchDependencies =
    options.fetchDependencies ?? LIVE_PRODUCT_PAGE_FETCH_DEPENDENCIES;
  const requestedConcurrency = options.concurrency ?? PRODUCT_ASSET_CONCURRENCY;
  const concurrency = Number.isFinite(requestedConcurrency)
    ? Math.min(
        PRODUCT_ASSET_CONCURRENCY,
        Math.max(1, Math.floor(requestedConcurrency)),
      )
    : PRODUCT_ASSET_CONCURRENCY;

  async function enrichProducts(products: ProductAssetRecommendation[]) {
    const output = new Array<ProductAssetRecommendation>(products.length);
    let nextIndex = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, products.length) },
      async () => {
        while (nextIndex < products.length) {
          const index = nextIndex;
          nextIndex += 1;
          throwIfRequestCancelled(options.signal);
          const recommendation = products[index];
          const assets = await getVerifiedProductAssets(
            recommendation,
            fetchDependencies,
            options.signal,
          );
          output[index] = withVerifiedOfferPriceFields({
            ...recommendation,
            ...assets,
          });
        }
      },
    );
    await Promise.all(workers);
    return output;
  }

  const recommendations = await enrichProducts(result.recommendations);

  return {
    ...result,
    recommendations,
  };
}

export const productAssetsTestExports = {
  buildMetadata,
  extractDimensionFromText,
  extractSpecTableText,
  mergeMetadata,
  productPageCacheKey,
  withVerifiedOfferPriceFields,
};

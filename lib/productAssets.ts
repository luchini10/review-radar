import { getCachedOrLoad, normalizeCacheKey } from "./cache.ts";
import {
  extractProductImageCandidatesFromHtml,
  imageResolutionToField,
  logImageResolutionDebug,
  resolveBestProductImage,
  type ProductImageCandidate,
  type ProductImageContext,
  type ProductImageResolution,
} from "./productImageResolver.ts";
import {
  parseBestMoneyAmount,
  priceTextLooksUnverified,
  formatDollars,
} from "./priceParsing.ts";
import { assessProductPriceTrust } from "./productPriceTrust.ts";
import { searchSerperImageEvidence } from "./search/serper.ts";
import type {
  ProductFieldEvidence,
  ProductMetadata,
  ProductOffer,
  ProductPriceTrust,
} from "@/types/review-radar";

type ProductAssetRecommendation = {
  category?: string;
  estimated_price_range?: string;
  name: string;
  priceTrust?: ProductPriceTrust;
  price_value_verdict?: string;
  product_page_url: string;
  product_image_url: string;
  citations?: {
    url: string;
  }[];
  metadata?: ProductMetadata;
};

type ProductAssetResult = {
  recommendations: ProductAssetRecommendation[];
  exactMatches?: ProductAssetRecommendation[];
  premiumAboveBudget?: ProductAssetRecommendation[];
  nearMatches?: ProductAssetRecommendation[];
};

const PRODUCT_ASSET_TIMEOUT_MS = 5000;
const PRODUCT_ASSET_CACHE_TTL_MS = 1000 * 60 * 30;
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
        lowerKey === "creativeasin"
      ) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
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

async function fetchText(url: string) {
  const cacheKey = normalizeCacheKey(["product-page", normalizeUrl(url)]);

  return getCachedOrLoad(cacheKey, PRODUCT_ASSET_CACHE_TTL_MS, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PRODUCT_ASSET_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "ReviewRadar/0.1 product research metadata fetcher",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return "";
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("text/html")) {
        return "";
      }

      return await response.text();
    } catch {
      return "";
    } finally {
      clearTimeout(timeout);
    }
  });
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

async function getImageFromCitationPages(
  product: ProductAssetRecommendation,
): Promise<ProductImageResolution> {
  const citationUrls = product.citations?.map((citation) => citation.url) || [];
  const rejected: ProductImageResolution["rejected"] = [];

  for (const citationUrl of citationUrls.slice(0, 3)) {
    const normalizedCitationUrl = normalizeUrl(citationUrl);

    if (!normalizedCitationUrl || !isHttpUrl(normalizedCitationUrl)) {
      continue;
    }

    const html = await fetchText(normalizedCitationUrl);

    if (!html || !productNameHasPageMatch(product.name, html)) {
      continue;
    }

    const resolution = resolveBestProductImage(
      extractProductImageCandidatesFromHtml(
        html,
        normalizedCitationUrl,
        productImageContext(product, normalizedCitationUrl),
      ),
      productImageContext(product, normalizedCitationUrl),
    );

    rejected.push(...resolution.rejected);

    if (resolution.url && resolution.confidence !== "none") {
      return resolution;
    }
  }

  return {
    confidence: "none",
    rejected,
    source: null,
    url: "",
  };
}

async function getProductPageFromCitationPages(product: ProductAssetRecommendation) {
  const citationUrls = product.citations?.map((citation) => citation.url) || [];

  for (const citationUrl of citationUrls.slice(0, 3)) {
    const normalizedCitationUrl = normalizeUrl(citationUrl);

    if (!normalizedCitationUrl || !isHttpUrl(normalizedCitationUrl)) {
      continue;
    }

    const html = await fetchText(normalizedCitationUrl);

    if (!html || !productNameHasPageMatch(product.name, html)) {
      continue;
    }

    const anchorPattern =
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorPattern.exec(html)) !== null) {
      const href = resolveUrl(decodeHtml(match[1]), normalizedCitationUrl);
      const anchorText = stripHtml(match[2]);

      if (!href || !isHttpUrl(href) || looksLikeEditorialUrl(href)) {
        continue;
      }

      const hrefHostDiffersFromCitation =
        normalizeHostname(href) !== normalizeHostname(normalizedCitationUrl);
      const hrefLooksLikeProduct = looksLikeProductPageUrl(href, product.name);
      const anchorNamesProduct = productNameHasPageMatch(
        product.name,
        anchorText,
      );

      if (
        hrefLooksLikeProduct ||
        (hrefHostDiffersFromCitation && anchorNamesProduct)
      ) {
        return normalizeUrl(href);
      }
    }
  }

  return "";
}

async function getImageFromSerper(
  product: ProductAssetRecommendation,
): Promise<ProductImageResolution> {
  const sources = await searchSerperImageEvidence(
    `${product.name} product image`,
    3,
  );
  const candidates: ProductImageCandidate[] = sources.flatMap((source) => {
    const match = source.snippet.match(/\bImage:\s*(https?:\/\/\S+)/i);
    const imageUrl = match?.[1]?.trim();

    if (!imageUrl) {
      return [];
    }

    return [
      {
        evidenceText: `${source.title} ${source.url} ${source.snippet}`,
        source: "serp",
        url: imageUrl,
      },
    ];
  });

  return resolveBestProductImage(candidates, productImageContext(product));
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

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);

  return match?.[0] ? Number(match[0]) : null;
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
    offer.url,
    offer.retailer || "",
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
    availability: incoming.availability || existing.availability,
    brand: incoming.brand || existing.brand,
    canonicalUrl: incoming.canonicalUrl || existing.canonicalUrl,
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
    gtin: incoming.gtin || existing.gtin,
    image: incoming.image || existing.image,
    modelNumber: incoming.modelNumber || existing.modelNumber,
    offers: mergeOffers(existing.offers, incoming.offers),
    rating: incoming.rating || existing.rating,
    reviewCount: incoming.reviewCount || existing.reviewCount,
    sku: incoming.sku || existing.sku,
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

function getAggregateRating(product: Record<string, unknown>) {
  const rating = product.aggregateRating;

  return isRecord(rating) ? rating : null;
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
  const rating = product ? getAggregateRating(product) : null;
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
  const availability = offer ? asString(offer.availability) : "";
  const sku = product ? asString(product.sku) : "";
  const modelNumber = product
    ? asString(product.model) || asString(product.mpn)
    : "";
  const gtin = product
    ? asString(product.gtin) ||
      asString(product.gtin8) ||
      asString(product.gtin12) ||
      asString(product.gtin13) ||
      asString(product.gtin14)
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

  metadata.canonicalUrl = field(canonicalUrl, canonicalUrl, "retailer_page", "High");

  if (brand) {
    metadata.brand = field(brand, canonicalUrl, "json_ld", "High");
  }

  if (sku) {
    metadata.sku = field(sku, canonicalUrl, "json_ld", "High");
  }

  if (modelNumber) {
    metadata.modelNumber = field(modelNumber, canonicalUrl, "json_ld", "High");
  }

  if (gtin) {
    metadata.gtin = field(gtin, canonicalUrl, "json_ld", "High");
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

  if (rating) {
    const ratingValue = asNumber(rating.ratingValue);
    const reviewCount = asNumber(rating.reviewCount || rating.ratingCount);

    if (ratingValue !== null) {
      metadata.rating = field(ratingValue, canonicalUrl, "json_ld", "High");
    }

    if (reviewCount !== null) {
      metadata.reviewCount = field(reviewCount, canonicalUrl, "json_ld", "High");
    }
  }

  if (offer || price !== null || availability || priceCurrency) {
    const priceSourceType = offer ? "json_ld" : "retailer_page";
    const priceConfidence = offer ? "High" : "Medium";

    metadata.offers.push({
      availability: field(availability || null, canonicalUrl, priceSourceType, offer ? "High" : "Low"),
      price: field(price, canonicalUrl, priceSourceType, priceConfidence),
      priceCurrency: field(priceCurrency || null, canonicalUrl, priceSourceType, priceConfidence),
      retailer: normalizeHostname(canonicalUrl) || null,
      url: canonicalUrl,
    });
  }

  return metadata;
}

function withVerifiedOfferPriceFields<T extends ProductAssetRecommendation>(
  product: T,
): T {
  const priceTrust = assessProductPriceTrust(product);

  if (!priceTrust.canUseForBudget || priceTrust.price === null) {
    const hasAnyOfferPrice =
      product.metadata?.offers.some(
        (offer) => offer.price.value !== null && Number.isFinite(offer.price.value),
      ) || priceTrust.price !== null;

    return hasAnyOfferPrice
      ? {
          ...product,
          priceTrust,
          estimated_price_range: "Price not verified",
          price_value_verdict:
            "Price evidence looked unusually low for the full product; verify the current store price before buying.",
        }
      : {
          ...product,
          priceTrust,
        };
  }

  const nextProduct = {
    ...product,
    priceTrust,
    estimated_price_range: formatDollars(priceTrust.price),
  };

  if (
    product.price_value_verdict &&
    priceTextLooksUnverified(product.price_value_verdict)
  ) {
    nextProduct.price_value_verdict =
      "Price was found from product-page or shopping metadata; verify current price and availability before buying.";
  }

  return nextProduct;
}

async function getVerifiedProductAssets(product: ProductAssetRecommendation) {
  const citationProductPageUrl = product.product_page_url
    ? ""
    : await getProductPageFromCitationPages(product);
  const productPageUrl =
    normalizeUrl(product.product_page_url) || citationProductPageUrl;
  const initialImageCandidates: ProductImageCandidate[] = [];

  if (product.product_image_url) {
    initialImageCandidates.push({
      evidenceText: `${product.name} ${product.category || ""}`,
      source: "existing",
      url: product.product_image_url,
    });
  }

  if (product.metadata?.image?.value) {
    initialImageCandidates.push({
      evidenceText: `${product.name} ${product.metadata.image.sourceUrl}`,
      source: "trusted_metadata",
      url: product.metadata.image.value,
    });
  }
  let imageResolution = resolveBestProductImage(
    initialImageCandidates,
    productImageContext(product, productPageUrl),
  );
  const citationImageResolution =
    imageResolution.confidence === "none"
      ? await getImageFromCitationPages(product)
      : {
          confidence: "none" as const,
          rejected: [],
          source: null,
          url: "",
        };
  const serperImageResolution =
    imageResolution.confidence === "none" &&
    citationImageResolution.confidence === "none"
      ? await getImageFromSerper(product)
      : {
          confidence: "none" as const,
          rejected: [],
          source: null,
          url: "",
        };

  imageResolution =
    imageResolution.confidence !== "none"
      ? {
          ...imageResolution,
          rejected: [
            ...imageResolution.rejected,
            ...citationImageResolution.rejected,
            ...serperImageResolution.rejected,
          ],
        }
      : citationImageResolution.confidence !== "none"
        ? {
            ...citationImageResolution,
            rejected: [
              ...imageResolution.rejected,
              ...citationImageResolution.rejected,
              ...serperImageResolution.rejected,
            ],
          }
        : {
            ...serperImageResolution,
            rejected: [
              ...imageResolution.rejected,
              ...citationImageResolution.rejected,
              ...serperImageResolution.rejected,
            ],
          };

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
      product_page_url: "",
      product_image_url: imageResolution.url,
    };
  }

  const html = await fetchText(productPageUrl);
  const likelyProductPage = looksLikeProductPageUrl(
    productPageUrl,
    product.name,
  );

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
      product_page_url: "",
      product_image_url: imageResolution.url,
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
      product_page_url: "",
      product_image_url: imageResolution.url,
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
      product_page_url: "",
      product_image_url: imageResolution.url,
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
    product_page_url: productPageUrl,
    product_image_url: productImageUrl,
    metadata: metadataWithImage,
  };
}

export async function enrichProductAssets<T extends ProductAssetResult>(
  result: T,
): Promise<T> {
  async function enrichProducts(products: ProductAssetRecommendation[]) {
    return Promise.all(products.map(async (recommendation) => {
      const assets = await getVerifiedProductAssets(recommendation);

      return withVerifiedOfferPriceFields({
        ...recommendation,
        ...assets,
      });
    }));
  }

  const recommendations = await enrichProducts(result.recommendations);
  const exactMatches = result.exactMatches
    ? await enrichProducts(result.exactMatches)
    : undefined;
  const nearMatches = result.nearMatches
    ? await enrichProducts(result.nearMatches)
    : undefined;
  const premiumAboveBudget = result.premiumAboveBudget
    ? await enrichProducts(result.premiumAboveBudget)
    : undefined;

  return {
    ...result,
    ...(exactMatches ? { exactMatches } : {}),
    ...(premiumAboveBudget ? { premiumAboveBudget } : {}),
    ...(nearMatches ? { nearMatches } : {}),
    recommendations,
  };
}

export const productAssetsTestExports = {
  buildMetadata,
  extractDimensionFromText,
  extractSpecTableText,
  mergeMetadata,
  withVerifiedOfferPriceFields,
};

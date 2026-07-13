import type {
  CanonicalProductIdentity,
  ProductMetadata,
  ProductRecommendation,
} from "@/types/review-radar";
import { canonicalBrand, detectKnownBrands } from "./brandMatching.ts";
import { sourceUrlPathIdentityText } from "./sourceUrlIdentity.ts";

const genericWords = new Set([
  "and",
  "bed",
  "best",
  "chair",
  "couch",
  "for",
  "in",
  "inch",
  "new",
  "of",
  "product",
  "sale",
  "set",
  "shop",
  "sofa",
  "champs",
  "locker",
  "foot",
  "finish",
  "line",
  "retailer",
  "sports",
  "store",
  "the",
  "with",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return normalizeText(value)
    .split(" ")
    // Keep multi-character words AND any single DIGIT — a single-digit size/spec
    // ("5 Gallon" vs "6 Gallon") is often the only thing distinguishing two real
    // products, so dropping it merged different models into one canonical id and
    // collapsed the result list. Single letters are still dropped as noise.
    .filter((word) => (word.length > 1 || /\d/.test(word)) && !genericWords.has(word))
    .slice(0, 10)
    .join(" ");
}

function titleTokens(value: string) {
  return normalizeTitle(value)
    .split(" ")
    .filter(Boolean);
}

function modelLikeTokens(tokens: string[]) {
  return tokens.filter((token) => /\d/.test(token));
}

export function strongModelTokens(value: string) {
  const rawTokens = value.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [];
  const tokens = new Set<string>();

  for (const raw of rawTokens) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (
      normalized.length < 4 ||
      normalized.length > 24 ||
      !/[a-z]/.test(normalized) ||
      !/\d/.test(normalized) ||
      /^\d+(?:p|hz|gb|tb|mah|w|v|in|inch)$/i.test(normalized) ||
      /^(?:ddr|gen|hdmi|hdr|ips|oled|qled|series|uhd|usb|wifi)\d+[a-z]*$/i.test(
        normalized,
      )
    ) {
      continue;
    }

    tokens.add(normalized);
  }

  return tokens;
}

function identityBrand(product: ProductRecommendation) {
  const explicit =
    product.metadata?.brand?.value ||
    product.canonicalIdentity?.brand;

  if (explicit) {
    return normalizeText(canonicalBrand(explicit));
  }

  const detected = detectKnownBrands(
    `${product.name || ""} ${product.metadata?.title?.value || ""}`,
  );

  if (detected.length > 0) {
    return normalizeText(canonicalBrand(detected[0]));
  }

  const first = normalizeText(product.name).split(" ")[0] || "";

  return first.length >= 3 && !/\d/.test(first) ? first : "";
}

function productStrongModelTokens(product: ProductRecommendation) {
  // URL models are inference evidence only when the existing eligibility
  // verdict says this is a renderable product page. Collection/editorial pages
  // must never lend a model to a product identity.
  const trustedUrlIdentity = product.productEligibility?.canRenderAsProductCard
    ? [
        sourceUrlPathIdentityText(product.product_page_url),
        sourceUrlPathIdentityText(product.metadata?.canonicalUrl?.value),
      ].join(" ")
    : "";

  return strongModelTokens(
    [
      product.metadata?.modelNumber?.value,
      product.canonicalIdentity?.modelNumber,
      product.name,
      product.metadata?.title?.value,
      trustedUrlIdentity,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function nonModelTokens(tokens: string[]) {
  return tokens.filter((token) => !/\d/.test(token));
}

function tokenSubset(shorter: string[], longer: string[]) {
  const longerSet = new Set(longer);

  return shorter.every((token) => longerSet.has(token));
}

function sameProductFamilyTitle(firstTitle: string, secondTitle: string) {
  const firstTokens = titleTokens(firstTitle);
  const secondTokens = titleTokens(secondTitle);
  const firstModels = modelLikeTokens(firstTokens);
  const secondModels = modelLikeTokens(secondTokens);

  if (
    firstModels.length > 0 &&
    secondModels.length > 0 &&
    !firstModels.some((token) => secondModels.includes(token))
  ) {
    return false;
  }

  const firstNonModels = nonModelTokens(firstTokens);
  const secondNonModels = nonModelTokens(secondTokens);
  const shorter =
    firstNonModels.length <= secondNonModels.length ? firstNonModels : secondNonModels;
  const longer =
    firstNonModels.length <= secondNonModels.length ? secondNonModels : firstNonModels;

  return shorter.length >= 3 && tokenSubset(shorter, longer);
}

function normalizeUrl(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function fieldValue<T>(value: { value: T } | undefined) {
  return value?.value ?? null;
}

function urlKey(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

// RR-060: retailers serve one listing under many URL shapes (a truncated
// `/p/335012888` and a full slug ending in the same id). A trailing
// pure-numeric path segment of 6+ digits is a listing id, so host+id is a
// stronger identity key than the full path. Short numeric segments stay
// excluded to avoid treating sizes or model numbers as listing ids.
function retailerListingKey(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments.at(-1) || "";

    if (!/^\d{6,}$/.test(lastSegment)) {
      return "";
    }

    // Compact dates are ambiguous: editorial/archive paths are not listing
    // ids, while an explicit product-detail route may legitimately use the
    // same eight digits as its item id.
    const isDateShaped = /^(?:19|20)\d{6}$/.test(lastSegment);
    const hasProductDetailMarker = pathSegments
      .slice(0, -1)
      .some((segment) => /^(?:p|pd|product|products|dp|ip)$/i.test(segment));
    const hasEditorialArchiveMarker = pathSegments
      .slice(0, -1)
      .some((segment) => /^(?:review|reviews|article|articles|blog|blogs|news|archive|archives|post|posts|story|stories)$/i.test(segment));
    if (isDateShaped && (!hasProductDetailMarker || hasEditorialArchiveMarker)) {
      return "";
    }

    return `${parsed.hostname.replace(/^www\./, "")} listing ${lastSegment}`.toLowerCase();
  } catch {
    return "";
  }
}

// RR-071: two products can share brand and a size-shaped token ("12gallon")
// while their names state DIFFERENT hard numeric specs (5.5 vs 5 peak HP).
// Conflicting values for the same robust unit prove different machines, so
// they must never be inferred to be one exact model. Units prone to
// truncation noise (inches) are deliberately excluded.
const CONFLICT_SPEC_UNIT_ALIASES: Record<string, string> = {
  ah: "ah",
  amp: "amp",
  amps: "amp",
  btu: "btu",
  cfm: "cfm",
  scfm: "cfm",
  gal: "gallon",
  gallon: "gallon",
  gallons: "gallon",
  hp: "hp",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  psi: "psi",
  qt: "qt",
  quart: "qt",
  quarts: "qt",
  volt: "volt",
  volts: "volt",
  watt: "watt",
  watts: "watt",
};

function numericSpecValues(text: string) {
  const values = new Map<string, Set<number>>();

  for (const match of text.matchAll(
    /(\d+(?:\.\d+)?)[\s-]*(?:peak[\s-]*)?(gallons?|gal|hp|quarts?|qt|psi|scfm|cfm|btu|watts?|volts?|amps?|ah|lbs?|pounds?)\b/gi,
  )) {
    const unit = CONFLICT_SPEC_UNIT_ALIASES[(match[2] || "").toLowerCase()];
    const value = Number(match[1]);

    if (!unit || !Number.isFinite(value)) {
      continue;
    }

    const existing = values.get(unit) || new Set<number>();
    existing.add(value);
    values.set(unit, existing);
  }

  return values;
}

function conflictingNumericSpecs(firstText: string, secondText: string) {
  const firstValues = numericSpecValues(firstText);
  const secondValues = numericSpecValues(secondText);

  for (const [unit, valuesA] of firstValues) {
    const valuesB = secondValues.get(unit);

    if (!valuesB) {
      continue;
    }

    if (![...valuesA].some((value) => valuesB.has(value))) {
      return true;
    }
  }

  return false;
}

function identitySpecText(product: ProductRecommendation) {
  return [product.name, fieldValue(product.metadata?.title)]
    .filter(Boolean)
    .join(" ");
}

function identityConfidence(metadata: ProductMetadata | undefined) {
  if (metadata?.gtin?.value || metadata?.modelNumber?.value) {
    return "High" as const;
  }

  if (metadata?.brand?.value || metadata?.sku?.value || metadata?.canonicalUrl?.value) {
    return "Medium" as const;
  }

  return "Low" as const;
}

export function getCanonicalIdentity(
  product: ProductRecommendation,
): CanonicalProductIdentity {
  const metadata = product.metadata;
  const brand = fieldValue(metadata?.brand);
  const gtin = fieldValue(metadata?.gtin);
  const modelNumber = fieldValue(metadata?.modelNumber);
  const sku = fieldValue(metadata?.sku);
  const canonicalUrl =
    normalizeUrl(fieldValue(metadata?.canonicalUrl) || product.product_page_url) ||
    null;
  const normalizedTitle = normalizeTitle(
    fieldValue(metadata?.title) || product.name,
  );
  const highConfidenceKey =
    gtin ||
    (brand && modelNumber ? `${brand}-${modelNumber}` : "") ||
    (brand && sku ? `${brand}-${sku}` : "");
  const mediumConfidenceKey = canonicalUrl
    ? retailerListingKey(canonicalUrl) || urlKey(canonicalUrl)
    : "";
  const fallbackKey = normalizedTitle || normalizeText(product.name);

  return {
    brand,
    canonicalId: normalizeText(
      highConfidenceKey || mediumConfidenceKey || fallbackKey,
    ),
    canonicalUrl,
    confidence: identityConfidence(metadata),
    gtin,
    modelNumber,
    normalizedTitle,
    sku,
  };
}

export function withCanonicalIdentity<T extends ProductRecommendation>(product: T): T {
  return {
    ...product,
    canonicalIdentity: getCanonicalIdentity(product),
  };
}

export function areSameCanonicalProduct(
  first: ProductRecommendation,
  second: ProductRecommendation,
) {
  const firstIdentity = first.canonicalIdentity || getCanonicalIdentity(first);
  const secondIdentity = second.canonicalIdentity || getCanonicalIdentity(second);

  if (firstIdentity.canonicalId && firstIdentity.canonicalId === secondIdentity.canonicalId) {
    return true;
  }

  const firstTitle = firstIdentity.normalizedTitle;
  const secondTitle = secondIdentity.normalizedTitle;

  return Boolean(
    firstTitle &&
      secondTitle &&
      (firstTitle === secondTitle || sameProductFamilyTitle(firstTitle, secondTitle)),
  );
}

export function areSameExactModelProduct(
  first: ProductRecommendation,
  second: ProductRecommendation,
) {
  const firstIdentity = first.canonicalIdentity || getCanonicalIdentity(first);
  const secondIdentity = second.canonicalIdentity || getCanonicalIdentity(second);
  const firstBrand = identityBrand(first);
  const secondBrand = identityBrand(second);
  const firstModels = productStrongModelTokens(first);
  const secondModels = productStrongModelTokens(second);
  const sharedStrongModel = [...firstModels].some((token) => secondModels.has(token));

  if (firstModels.size > 0 && secondModels.size > 0 && !sharedStrongModel) {
    return false;
  }

  if (firstIdentity.canonicalId && firstIdentity.canonicalId === secondIdentity.canonicalId) {
    return true;
  }

  // RR-071: identical canonical ids above prove one listing, but every
  // remaining path is inference from names — and names stating conflicting
  // hard numeric specs (5.5 vs 5 peak HP) prove different machines.
  if (
    conflictingNumericSpecs(identitySpecText(first), identitySpecText(second))
  ) {
    return false;
  }

  if (
    sharedStrongModel &&
    firstBrand &&
    secondBrand &&
    firstBrand === secondBrand
  ) {
    return true;
  }

  const firstTitle = firstIdentity.normalizedTitle;
  const secondTitle = secondIdentity.normalizedTitle;

  return Boolean(firstTitle && secondTitle && firstTitle === secondTitle);
}

export const productIdentityTestExports = {
  normalizeTitle,
  sameProductFamilyTitle,
  strongModelTokens,
};

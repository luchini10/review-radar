import { brandEvidenceMatches } from "./brandMatching.ts";
import { classifyProductEligibility } from "./productEligibility.ts";
import { parseBestMoneyAmount } from "./priceParsing.ts";

export const AUTONOMOUS_COMMERCE_VERIFIER_VERSION =
  "oai-hybrid-commerce-verifier-v1";

export type CommerceVerificationTarget = {
  key: string;
  brand: string;
  productName: string;
  model: string;
  category: string;
};

export type CommerceShoppingResult = {
  title?: unknown;
  link?: unknown;
  productLink?: unknown;
  product_link?: unknown;
  source?: unknown;
  price?: unknown;
  extractedPrice?: unknown;
  extracted_price?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  thumbnail?: unknown;
  thumbnailUrl?: unknown;
  rating?: unknown;
  ratingCount?: unknown;
  rating_count?: unknown;
  reviews?: unknown;
  snippet?: unknown;
  position?: unknown;
};

export type CommerceResultDecision = {
  index: number;
  title: string;
  seller: string;
  productUrl: string | null;
  priceAmount: number | null;
  matchedIdentifiers: string[];
  accepted: boolean;
  reason:
    | "accepted_exact_offer"
    | "missing_title"
    | "brand_not_in_title"
    | "stable_identifier_not_in_title"
    | "missing_merchant_product_url"
    | "missing_price"
    | "missing_seller"
    | "non_new_offer"
    | "explicit_accessory_offer"
    | "product_ineligible";
};

export type VerifiedCommerceOffer = {
  targetKey: string;
  provider: "serper_shopping";
  providerPosition: number;
  title: string;
  matchedIdentifiers: string[];
  priceAmount: number;
  currency: "USD";
  seller: string;
  productUrl: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

export type CommerceVerification = {
  verifierVersion: typeof AUTONOMOUS_COMMERCE_VERIFIER_VERSION;
  target: CommerceVerificationTarget;
  query: string;
  decisions: CommerceResultDecision[];
  offer: VerifiedCommerceOffer | null;
  disposition: "verified" | "inconclusive";
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function asString(value: unknown) {
  if (typeof value === "string") return compact(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const MEASUREMENT_IDENTIFIERS = /^(?:\d+(?:p|hz|gb|tb|mah|w|v|in|inch|psi|hp))$/i;

export function stableCommerceIdentifiers(value: string) {
  return [
    ...new Set(
      (value.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [])
        .map(normalizeToken)
        .filter(
          (token) =>
            token.length >= 3 &&
            token.length <= 32 &&
            /\d/.test(token) &&
            !MEASUREMENT_IDENTIFIERS.test(token) &&
            (/[a-z]/.test(token) || token.length >= 6),
        ),
    ),
  ];
}

function titleContainsIdentifier(title: string, identifier: string) {
  return (title.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [])
    .map(normalizeToken)
    .includes(identifier);
}

function parseHttpUrl(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed;
  } catch {
    return null;
  }
}

function isGoogleWrapper(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "googleusercontent.com" ||
    host.endsWith(".googleusercontent.com")
  );
}

function merchantProductUrl(result: CommerceShoppingResult) {
  const candidates = [result.productLink, result.product_link, result.link];
  for (const candidate of candidates) {
    const parsed = parseHttpUrl(candidate);
    if (parsed && !isGoogleWrapper(parsed)) return parsed.toString();
  }
  return null;
}

function firstImageUrl(result: CommerceShoppingResult) {
  for (const candidate of [
    result.imageUrl,
    result.image,
    result.thumbnailUrl,
    result.thumbnail,
  ]) {
    const parsed = parseHttpUrl(candidate);
    if (parsed) return parsed.toString();
  }
  return null;
}

function resultPrice(result: CommerceShoppingResult) {
  return parseBestMoneyAmount(
    result.extractedPrice ?? result.extracted_price ?? result.price,
    { allowBareNumeric: true },
  );
}

function isExplicitAccessoryOffer(title: string) {
  const accessory =
    /\b(?:adapter|attachment|bag|battery|belt|brush(?:roll)?|charger|filter|hose|nozzle|part|replacement|roller)\b/i;
  const accessoryRelation =
    /^\s*(?:replacement|compatible|accessory|spare)\b/i.test(title) ||
    /\b(?:compatible\s+with|fits?|made\s+for|replacement\s+for)\b/i.test(title);
  const completeProductContext =
    /\b(?:vacuum|cleaner|machine|appliance|tool)\s+(?:with|includes?|including)\b/i.test(
      title,
    );
  return accessory.test(title) && accessoryRelation && !completeProductContext;
}

function isNonNewOffer(title: string) {
  return /\b(?:used|pre[-\s]?owned|refurbished|renewed|open[-\s]?box)\b/i.test(
    title,
  );
}

export function commerceVerificationQuery(target: CommerceVerificationTarget) {
  const pieces = [target.brand, target.model, target.category]
    .flatMap((value) => value.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [])
    .filter(Boolean);
  const seen = new Set<string>();
  return pieces
    .filter((piece) => {
      const key = normalizeToken(piece);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

function decisionForResult(
  target: CommerceVerificationTarget,
  result: CommerceShoppingResult,
  index: number,
): CommerceResultDecision {
  const title = asString(result.title);
  const seller = asString(result.source);
  const productUrl = merchantProductUrl(result);
  const priceAmount = resultPrice(result);
  const identifiers = stableCommerceIdentifiers(target.model);
  const matchedIdentifiers = identifiers.filter((identifier) =>
    titleContainsIdentifier(title, identifier),
  );
  const base = {
    index,
    title: title.slice(0, 240),
    seller: seller.slice(0, 120),
    productUrl,
    priceAmount,
    matchedIdentifiers,
  };

  if (!title) return { ...base, accepted: false, reason: "missing_title" };
  if (!brandEvidenceMatches(title, target.brand)) {
    return { ...base, accepted: false, reason: "brand_not_in_title" };
  }
  if (identifiers.length === 0 || matchedIdentifiers.length === 0) {
    return {
      ...base,
      accepted: false,
      reason: "stable_identifier_not_in_title",
    };
  }
  if (!productUrl) {
    return { ...base, accepted: false, reason: "missing_merchant_product_url" };
  }
  if (priceAmount === null || priceAmount <= 0) {
    return { ...base, accepted: false, reason: "missing_price" };
  }
  if (!seller) {
    return { ...base, accepted: false, reason: "missing_seller" };
  }
  if (isNonNewOffer(title)) {
    return { ...base, accepted: false, reason: "non_new_offer" };
  }
  if (isExplicitAccessoryOffer(title)) {
    return { ...base, accepted: false, reason: "explicit_accessory_offer" };
  }
  const eligibility = classifyProductEligibility({
    brand: target.brand,
    category: target.category,
    name: title,
    price: priceAmount,
    retailer: seller,
    snippet: asString(result.snippet),
    sourceTitle: title,
    sourceType: "serper",
    url: productUrl,
  });
  if (!eligibility.canRenderAsProductCard) {
    return { ...base, accepted: false, reason: "product_ineligible" };
  }
  return { ...base, accepted: true, reason: "accepted_exact_offer" };
}

export function verifyCommerceShoppingResults(input: {
  target: CommerceVerificationTarget;
  results: CommerceShoppingResult[];
}): CommerceVerification {
  const query = commerceVerificationQuery(input.target);
  const decisions = input.results.map((result, index) =>
    decisionForResult(input.target, result, index),
  );
  const selected = decisions.find((decision) => decision.accepted) || null;
  const sourceResult = selected ? input.results[selected.index] : null;
  const offer =
    selected && sourceResult && selected.productUrl && selected.priceAmount !== null
      ? {
          targetKey: input.target.key,
          provider: "serper_shopping" as const,
          providerPosition:
            asNumber(sourceResult.position) ?? selected.index + 1,
          title: selected.title,
          matchedIdentifiers: selected.matchedIdentifiers,
          priceAmount: selected.priceAmount,
          currency: "USD" as const,
          seller: selected.seller,
          productUrl: selected.productUrl,
          imageUrl: firstImageUrl(sourceResult),
          rating: asNumber(sourceResult.rating),
          reviewCount:
            asNumber(sourceResult.ratingCount) ??
            asNumber(sourceResult.rating_count) ??
            asNumber(sourceResult.reviews),
        }
      : null;
  return {
    verifierVersion: AUTONOMOUS_COMMERCE_VERIFIER_VERSION,
    target: input.target,
    query,
    decisions,
    offer,
    disposition: offer ? "verified" : "inconclusive",
  };
}

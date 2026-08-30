import {
  brandEvidenceMatches,
  canonicalBrand,
  detectKnownBrands,
} from "./brandMatching.ts";
import { classifyProductEligibility } from "./productEligibility.ts";
import {
  modelIdentityRelation,
  stableModelIdentifiers,
} from "./productIdentity.ts";
import { parseBestMoneyAmount } from "./priceParsing.ts";

export const AUTONOMOUS_COMMERCE_VERIFIER_VERSION =
  "oai-hybrid-commerce-verifier-v2";

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

export function stableCommerceIdentifiers(value: string) {
  return stableModelIdentifiers(value);
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
  const identity = targetTitleMatches(target, title);
  const base = {
    index,
    title: title.slice(0, 240),
    seller: seller.slice(0, 120),
    productUrl,
    priceAmount,
    matchedIdentifiers: identity.matchedIdentifiers,
  };

  if (!title) return { ...base, accepted: false, reason: "missing_title" };
  if (!identity.brandMatches || identity.brandConflicts) {
    return { ...base, accepted: false, reason: "brand_not_in_title" };
  }
  if (
    identity.identifiers.length === 0 ||
    !identity.coreMatches ||
    identity.modelConflicts ||
    !identity.descriptiveModelTermsMatch ||
    !identity.matchesCompleteAlias
  ) {
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

export const SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION =
  "oai-hybrid-searchapi-product-offers-v2";

type SearchApiShoppingResult = {
  position?: unknown;
  title?: unknown;
  product_token?: unknown;
};

type SearchApiOffer = {
  position?: unknown;
  title?: unknown;
  link?: unknown;
  price?: unknown;
  extracted_price?: unknown;
  availability?: unknown;
  condition?: unknown;
  details?: unknown;
  merchant?: unknown;
};

type SearchApiProduct = {
  title?: unknown;
  brand?: unknown;
};

type SearchApiTokenDecision = {
  index: number;
  providerPosition: number;
  title: string;
  matchedIdentifiers: string[];
  hasProductToken: boolean;
  accepted: boolean;
  reason:
    | "missing_title"
    | "brand_not_in_title"
    | "brand_conflict_in_title"
    | "model_conflict_in_title"
    | "stable_identifier_not_in_title"
    | "descriptive_model_terms_not_in_title"
    | "missing_product_token"
    | "accepted_exact_product_token";
};

type SearchApiOfferDecision = {
  index: number;
  providerPosition: number;
  title: string;
  seller: string;
  productUrl: string | null;
  priceAmount: number | null;
  matchedIdentifiers: string[];
  availabilityEvidence: string[];
  accepted: boolean;
  reason:
    | "accepted_exact_offer"
    | "missing_title"
    | "brand_not_in_offer_title"
    | "offer_brand_conflict"
    | "offer_model_conflict"
    | "stable_identifier_not_in_offer_title"
    | "descriptive_model_terms_not_in_offer_title"
    | "missing_merchant_product_url"
    | "missing_price"
    | "missing_seller"
    | "offer_unavailable"
    | "in_stock_not_confirmed"
    | "non_new_offer"
    | "explicit_accessory_offer"
    | "product_ineligible";
};

export type SearchApiTokenSelection = {
  verifierVersion: typeof SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION;
  target: CommerceVerificationTarget;
  query: string;
  disposition: "selected" | "inconclusive" | "invalid_schema";
  reason:
    | "exact_product_token_selected"
    | "no_exact_product_token"
    | "invalid_shopping_results_schema";
  decisions: SearchApiTokenDecision[];
  selected: {
    productToken: string;
    providerPosition: number;
    title: string;
    matchedIdentifiers: string[];
  } | null;
};

export type VerifiedSearchApiOffer = {
  targetKey: string;
  provider: "searchapi_product_offers";
  providerPosition: number;
  selectedShoppingTitle: string;
  canonicalProductTitle: string;
  canonicalBrand: string;
  offerTitle: string;
  matchedIdentifiers: string[];
  priceAmount: number;
  currency: "USD";
  seller: string;
  productUrl: string;
  availabilityEvidence: string[];
};

export type SearchApiOfferVerification = {
  verifierVersion: typeof SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION;
  target: CommerceVerificationTarget;
  selectedShoppingTitle: string;
  canonicalProduct: {
    title: string;
    brand: string;
  } | null;
  disposition: "verified" | "inconclusive" | "invalid_schema";
  reason:
    | "verified_exact_offer"
    | "no_qualifying_offer"
    | "invalid_product_offers_schema"
    | "selected_shopping_identity_invalid"
    | "canonical_brand_conflict"
    | "canonical_model_conflict";
  decisions: SearchApiOfferDecision[];
  offer: VerifiedSearchApiOffer | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function boundedProductToken(value: unknown) {
  if (typeof value !== "string") return "";
  const token = value.trim();
  if (
    token.length < 16 ||
    token.length > 32_768 ||
    /[\u0000-\u001f\u007f]/.test(token)
  ) {
    return "";
  }
  return token;
}

function targetTitleMatches(
  target: CommerceVerificationTarget,
  title: string,
) {
  const modelRelation = modelIdentityRelation(target.model, title);
  return {
    ...modelRelation,
    modelConflicts: modelRelation.hasConflict,
    brandMatches: Boolean(title && brandEvidenceMatches(title, target.brand)),
    brandConflicts: hasConflictingKnownBrand(title, target.brand),
  };
}

function hasConflictingKnownBrand(text: string, requiredBrand: string) {
  const required = canonicalBrand(requiredBrand).toLocaleLowerCase();
  return detectKnownBrands(text).some(
    (detected) => canonicalBrand(detected).toLocaleLowerCase() !== required,
  );
}

export function searchApiShoppingRequestParams(
  target: CommerceVerificationTarget,
) {
  return {
    engine: "google_shopping" as const,
    gl: "us" as const,
    hl: "en" as const,
    q: commerceVerificationQuery(target),
  };
}

export function searchApiOffersRequestParams(productToken: string) {
  return {
    engine: "google_product_offers" as const,
    gl: "us" as const,
    hl: "en" as const,
    page: 1 as const,
    product_token: productToken,
  };
}

export function selectSearchApiProductToken(input: {
  target: CommerceVerificationTarget;
  payload: unknown;
}): SearchApiTokenSelection {
  const query = commerceVerificationQuery(input.target);
  if (
    !isRecord(input.payload) ||
    !Array.isArray(input.payload.shopping_results)
  ) {
    return {
      verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
      target: input.target,
      query,
      disposition: "invalid_schema",
      reason: "invalid_shopping_results_schema",
      decisions: [],
      selected: null,
    };
  }

  const shoppingResults = input.payload.shopping_results as SearchApiShoppingResult[];
  const decisions = shoppingResults.map((result, index): SearchApiTokenDecision => {
    const title = asString(result.title).slice(0, 300);
    const token = boundedProductToken(result.product_token);
    const identity = targetTitleMatches(input.target, title);
    const base = {
      index,
      providerPosition: asNumber(result.position) ?? index + 1,
      title,
      matchedIdentifiers: identity.matchedIdentifiers,
      hasProductToken: Boolean(token),
    };
    if (!title) {
      return { ...base, accepted: false, reason: "missing_title" };
    }
    if (!identity.brandMatches) {
      return { ...base, accepted: false, reason: "brand_not_in_title" };
    }
    if (identity.brandConflicts) {
      return { ...base, accepted: false, reason: "brand_conflict_in_title" };
    }
    if (identity.modelConflicts) {
      return { ...base, accepted: false, reason: "model_conflict_in_title" };
    }
    if (
      identity.identifiers.length === 0 ||
      !identity.coreMatches
    ) {
      return {
        ...base,
        accepted: false,
        reason: "stable_identifier_not_in_title",
      };
    }
    if (!identity.descriptiveModelTermsMatch) {
      return {
        ...base,
        accepted: false,
        reason: "descriptive_model_terms_not_in_title",
      };
    }
    if (!identity.matchesCompleteAlias) {
      return {
        ...base,
        accepted: false,
        reason: "stable_identifier_not_in_title",
      };
    }
    if (!token) {
      return { ...base, accepted: false, reason: "missing_product_token" };
    }
    return { ...base, accepted: true, reason: "accepted_exact_product_token" };
  });
  const selectedDecision = decisions.find((decision) => decision.accepted) || null;
  const selectedResult = selectedDecision
    ? shoppingResults[selectedDecision.index]
    : null;
  const productToken = boundedProductToken(selectedResult?.product_token);
  const selected =
    selectedDecision && productToken
      ? {
          productToken,
          providerPosition: selectedDecision.providerPosition,
          title: selectedDecision.title,
          matchedIdentifiers: selectedDecision.matchedIdentifiers,
        }
      : null;
  return {
    verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
    target: input.target,
    query,
    disposition: selected ? "selected" : "inconclusive",
    reason: selected ? "exact_product_token_selected" : "no_exact_product_token",
    decisions,
    selected,
  };
}

function offerMerchantUrl(value: unknown) {
  const parsed = parseHttpUrl(value);
  return parsed && !isGoogleWrapper(parsed) ? parsed.toString() : null;
}

function offerSeller(offer: SearchApiOffer) {
  if (!isRecord(offer.merchant)) return "";
  return asString(offer.merchant.name).slice(0, 120);
}

function offerAvailabilityEvidence(offer: SearchApiOffer) {
  const details = Array.isArray(offer.details)
    ? offer.details.map(asString).filter(Boolean)
    : [];
  const availability = asString(offer.availability);
  if (availability) details.push(availability);
  return details.slice(0, 12).map((detail) => detail.slice(0, 200));
}

function canonicalProductConflicts(input: {
  target: CommerceVerificationTarget;
  product: SearchApiProduct;
}) {
  const title = asString(input.product.title).slice(0, 300);
  const brand = asString(input.product.brand).slice(0, 120);
  const brandMatches = brandEvidenceMatches(brand, input.target.brand);
  const titleMatches = brandEvidenceMatches(title, input.target.brand);
  if (
    (!brandMatches && !titleMatches) ||
    hasConflictingKnownBrand(brand, input.target.brand) ||
    hasConflictingKnownBrand(title, input.target.brand)
  ) {
    return "canonical_brand_conflict" as const;
  }
  const canonicalIdentity = targetTitleMatches(input.target, title);
  if (
    canonicalIdentity.modelConflicts ||
    (canonicalIdentity.hasTargetEvidenceInObservedText &&
      !canonicalIdentity.matchesCompleteAlias)
  ) {
    return "canonical_model_conflict" as const;
  }
  return null;
}

function decisionForSearchApiOffer(
  target: CommerceVerificationTarget,
  offer: SearchApiOffer,
  index: number,
): SearchApiOfferDecision {
  const title = asString(offer.title).slice(0, 300);
  const identity = targetTitleMatches(target, title);
  const seller = offerSeller(offer);
  const productUrl = offerMerchantUrl(offer.link);
  const priceAmount = parseBestMoneyAmount(
    offer.extracted_price ?? offer.price,
    { allowBareNumeric: true },
  );
  const availabilityEvidence = offerAvailabilityEvidence(offer);
  const availabilityText = compact(availabilityEvidence.join(" "));
  const conditionText = compact(
    `${title} ${asString(offer.condition)} ${availabilityText}`,
  );
  const base = {
    index,
    providerPosition: asNumber(offer.position) ?? index + 1,
    title,
    seller,
    productUrl,
    priceAmount,
    matchedIdentifiers: identity.matchedIdentifiers,
    availabilityEvidence,
  };
  if (!title) return { ...base, accepted: false, reason: "missing_title" };
  if (!identity.brandMatches) {
    return { ...base, accepted: false, reason: "brand_not_in_offer_title" };
  }
  if (identity.brandConflicts) {
    return { ...base, accepted: false, reason: "offer_brand_conflict" };
  }
  if (identity.modelConflicts) {
    return { ...base, accepted: false, reason: "offer_model_conflict" };
  }
  if (
    identity.identifiers.length === 0 ||
    !identity.coreMatches
  ) {
    return {
      ...base,
      accepted: false,
      reason: "stable_identifier_not_in_offer_title",
    };
  }
  if (!identity.descriptiveModelTermsMatch) {
    return {
      ...base,
      accepted: false,
      reason: "descriptive_model_terms_not_in_offer_title",
    };
  }
  if (!identity.matchesCompleteAlias) {
    return {
      ...base,
      accepted: false,
      reason: "stable_identifier_not_in_offer_title",
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
  if (/\b(?:out of stock|sold out|unavailable)\b/i.test(availabilityText)) {
    return { ...base, accepted: false, reason: "offer_unavailable" };
  }
  if (!/\bin stock\b/i.test(availabilityText)) {
    return { ...base, accepted: false, reason: "in_stock_not_confirmed" };
  }
  if (isNonNewOffer(conditionText)) {
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
    sourceTitle: title,
    sourceType: "search",
    url: productUrl,
  });
  if (!eligibility.canRenderAsProductCard) {
    return { ...base, accepted: false, reason: "product_ineligible" };
  }
  return { ...base, accepted: true, reason: "accepted_exact_offer" };
}

export function verifySearchApiProductOffers(input: {
  target: CommerceVerificationTarget;
  selectedShoppingTitle: string;
  payload: unknown;
}): SearchApiOfferVerification {
  if (
    !isRecord(input.payload) ||
    !isRecord(input.payload.product) ||
    !Array.isArray(input.payload.offers)
  ) {
    return {
      verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
      target: input.target,
      selectedShoppingTitle: compact(input.selectedShoppingTitle).slice(0, 300),
      canonicalProduct: null,
      disposition: "invalid_schema",
      reason: "invalid_product_offers_schema",
      decisions: [],
      offer: null,
    };
  }

  const selectedShoppingTitle = compact(input.selectedShoppingTitle).slice(0, 300);
  const selectedIdentity = targetTitleMatches(input.target, selectedShoppingTitle);
  const product = input.payload.product as SearchApiProduct;
  const canonicalProduct = {
    title: asString(product.title).slice(0, 300),
    brand: asString(product.brand).slice(0, 120),
  };
  const base: Pick<
    SearchApiOfferVerification,
    | "verifierVersion"
    | "target"
    | "selectedShoppingTitle"
    | "canonicalProduct"
  > = {
    verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
    target: input.target,
    selectedShoppingTitle,
    canonicalProduct,
  };
  if (
    !selectedIdentity.brandMatches ||
    selectedIdentity.brandConflicts ||
    selectedIdentity.modelConflicts ||
    selectedIdentity.identifiers.length === 0 ||
    !selectedIdentity.coreMatches ||
    !selectedIdentity.descriptiveModelTermsMatch ||
    !selectedIdentity.matchesCompleteAlias
  ) {
    return {
      ...base,
      disposition: "inconclusive",
      reason: "selected_shopping_identity_invalid",
      decisions: [],
      offer: null,
    };
  }
  const canonicalConflict = canonicalProductConflicts({
    target: input.target,
    product,
  });
  if (canonicalConflict) {
    return {
      ...base,
      disposition: "inconclusive",
      reason: canonicalConflict,
      decisions: [],
      offer: null,
    };
  }

  const offers = input.payload.offers as SearchApiOffer[];
  const decisions = offers.map((offer, index) =>
    decisionForSearchApiOffer(input.target, offer, index),
  );
  const selectedDecision = decisions.find((decision) => decision.accepted) || null;
  const verifiedOffer =
    selectedDecision &&
    selectedDecision.productUrl &&
    selectedDecision.priceAmount !== null
      ? {
          targetKey: input.target.key,
          provider: "searchapi_product_offers" as const,
          providerPosition: selectedDecision.providerPosition,
          selectedShoppingTitle,
          canonicalProductTitle: canonicalProduct.title,
          canonicalBrand: canonicalProduct.brand,
          offerTitle: selectedDecision.title,
          matchedIdentifiers: selectedDecision.matchedIdentifiers,
          priceAmount: selectedDecision.priceAmount,
          currency: "USD" as const,
          seller: selectedDecision.seller,
          productUrl: selectedDecision.productUrl,
          availabilityEvidence: selectedDecision.availabilityEvidence,
        }
      : null;
  return {
    ...base,
    disposition: verifiedOffer ? "verified" : "inconclusive",
    reason: verifiedOffer ? "verified_exact_offer" : "no_qualifying_offer",
    decisions,
    offer: verifiedOffer,
  };
}

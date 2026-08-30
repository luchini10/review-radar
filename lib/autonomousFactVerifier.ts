import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export const AUTONOMOUS_FACT_VERIFIER_VERSION = "oai-hybrid-verifier-v2";

export type HybridVerificationStatus =
  | "verified"
  | "contradicted"
  | "inconclusive"
  | "unavailable"
  | "cleared";

export type HybridSourceRole =
  | "official_product"
  | "purchase_page"
  | "manufacturer_spec"
  | "professional_test"
  | "owner_feedback"
  | "warranty_support"
  | "other";

export type HybridProvisionalProduct = {
  identity: {
    brand: string;
    productName: string;
    model: string;
  };
  priceAmount: number | null;
  currency: string;
  seller: string;
  productUrl: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

export type HybridObservedOffer = {
  priceAmount: number | null;
  currency: string | null;
  availability: string | null;
  seller: string | null;
  url: string | null;
};

export type HybridObservedProductEntity = {
  name: string;
  brand: string;
  model: string;
  sku: string;
  mpn: string;
  gtin: string;
  url: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  offers: HybridObservedOffer[];
};

export type HybridPageObservation = {
  requestedUrl: string;
  finalUrl: string;
  observedAt: string;
  status: number;
  contentType: string;
  byteLength: number;
  contentHash: string;
  redirectCount: number;
  pageTitle: string;
  heading: string;
  entities: HybridObservedProductEntity[];
  testedModels: string[];
  dealerOnly: boolean;
  reviewsUnavailable: boolean;
  extractionDisposition:
    | "structured_products"
    | "no_structured_product"
    | "unsupported_content";
};

export type HybridVerificationReceipt<T> = {
  status: HybridVerificationStatus;
  reason:
    | "exact_entity_observed"
    | "provisional_value_confirmed"
    | "provisional_value_replaced"
    | "exact_entity_value_missing"
    | "exact_product_not_found"
    | "multiple_exact_entities"
    | "no_structured_product_entity"
    | "source_role_cannot_establish_offer"
    | "source_role_cannot_establish_owner_rating"
    | "dealer_only_no_direct_purchase"
    | "reviews_currently_unavailable"
    | "exact_tested_model_observed"
    | "different_tested_model_observed"
    | "tested_model_not_exposed"
    | "unsupported_content";
  provisionalValue: T | null;
  observedValue: T | null;
  sourceUrl: string;
  observedAt: string;
};

export type HybridSourceVerification = {
  verifierVersion: typeof AUTONOMOUS_FACT_VERIFIER_VERSION;
  sourceRole: HybridSourceRole;
  sourceUrl: string;
  exactEntityIndex: number | null;
  identity: HybridVerificationReceipt<{
    brand: string;
    productName: string;
    model: string;
  }>;
  price: HybridVerificationReceipt<number>;
  currency: HybridVerificationReceipt<string>;
  seller: HybridVerificationReceipt<string>;
  purchaseUrl: HybridVerificationReceipt<string>;
  availability: HybridVerificationReceipt<string>;
  imageUrl: HybridVerificationReceipt<string>;
  rating: HybridVerificationReceipt<number>;
  reviewCount: HybridVerificationReceipt<number>;
  editorialModel: HybridVerificationReceipt<string>;
};

export type HybridFetchFailureReason =
  | "invalid_url"
  | "credentials_forbidden"
  | "non_default_port"
  | "host_resolution_failed"
  | "non_public_address"
  | "redirect_missing_location"
  | "redirect_limit_exceeded"
  | "unsupported_content_type"
  | "http_status_not_usable"
  | "response_too_large"
  | "request_timeout"
  | "request_failed";

export type HybridFetchResult =
  | {
      ok: true;
      requestedUrl: string;
      finalUrl: string;
      status: number;
      contentType: string;
      byteLength: number;
      redirectCount: number;
      attempts: number;
      body: string;
      contentHash: string;
    }
  | {
      ok: false;
      requestedUrl: string;
      finalUrl: string | null;
      status: number | null;
      contentType: string | null;
      byteLength: number;
      redirectCount: number;
      attempts: number;
      reason: HybridFetchFailureReason;
    };

export type HybridFetchConfig = {
  maxRedirects: number;
  maxBytes: number;
  timeoutMs: number;
  allowedContentTypes: readonly string[];
};

export const DEFAULT_HYBRID_FETCH_CONFIG: HybridFetchConfig = {
  maxRedirects: 2,
  maxBytes: 2_000_000,
  timeoutMs: 12_000,
  allowedContentTypes: ["text/html", "application/xhtml+xml"],
};

export type HybridTransportResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Uint8Array;
};

export type HybridFetchDependencies = {
  resolveHost: (hostname: string) => Promise<string[]>;
  transport: (input: {
    url: URL;
    address: string;
    timeoutMs: number;
    maxBytes: number;
    accept?: string;
  }) => Promise<HybridTransportResponse>;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIdentity(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identifierTokens(value: string) {
  return new Set(
    (value.match(/[A-Za-z0-9]+/g) || [])
      .map((token) => token.toLowerCase())
      .filter(
        (token) =>
          token.length >= 2 &&
          /\d/.test(token) &&
          !/^\d+(?:p|hz|gb|tb|mah|w|v|in|inch|psi|hp)$/i.test(token),
      ),
  );
}

type StableIdentifierRelation =
  | "exact_alias"
  | "conflicting"
  | "unrelated"
  | "unavailable";

function proposedIdentifierAliases(value: string) {
  // A spaced separator is an explicit alias declaration. Whitespace alone is
  // not: `X100 A1` is one compound identity, while `12704570 / SUZE0`
  // documents two acceptable stable identifiers.
  const aliases = value.split(/\s+(?:\/|\||;|or)\s+/i);
  return aliases
    .map((alias) => identifierTokens(alias))
    .filter((tokens) => tokens.size > 0);
}

function stableIdentifierRelation(
  proposedModel: string,
  observedModel: string,
): StableIdentifierRelation {
  const aliases = proposedIdentifierAliases(proposedModel);
  const observedTokens = identifierTokens(observedModel);
  if (aliases.length === 0 || observedTokens.size === 0) return "unavailable";

  const proposedTokens = new Set(aliases.flatMap((tokens) => [...tokens]));
  const overlaps = [...observedTokens].some((token) => proposedTokens.has(token));
  if (!overlaps) return "unrelated";

  const containsExactAlias = aliases.some((alias) =>
    [...alias].every((token) => observedTokens.has(token)),
  );
  const containsUndocumentedIdentifier = [...observedTokens].some(
    (token) => !proposedTokens.has(token),
  );

  return containsExactAlias && !containsUndocumentedIdentifier
    ? "exact_alias"
    : "conflicting";
}

function identityBrandMatches(proposedBrand: string, entity: HybridObservedProductEntity) {
  const proposed = normalizeIdentity(proposedBrand);
  const observed = normalizeIdentity(entity.brand || entity.name);
  return Boolean(
    proposed &&
      observed &&
      (observed === proposed ||
        observed.startsWith(`${proposed} `) ||
        observed.includes(` ${proposed} `)),
  );
}

function entityModelTokens(entity: HybridObservedProductEntity) {
  return identifierTokens(
    [entity.model, entity.sku, entity.mpn, entity.gtin, entity.name].join(" "),
  );
}

function entityMatchesExactProduct(
  product: HybridProvisionalProduct,
  entity: HybridObservedProductEntity,
) {
  if (!identityBrandMatches(product.identity.brand, entity)) return false;
  const proposedModels = identifierTokens(product.identity.model);
  if (proposedModels.size === 0) return false;
  const observedModels = entityModelTokens(entity);
  return [...proposedModels].some((token) => observedModels.has(token));
}

function professionalTestEntityMatchesExactProduct(
  product: HybridProvisionalProduct,
  entity: HybridObservedProductEntity,
) {
  if (!identityBrandMatches(product.identity.brand, entity)) return false;

  const modelRelation = stableIdentifierRelation(
    product.identity.model,
    entity.model,
  );
  if (modelRelation === "conflicting" || modelRelation === "unrelated") {
    return false;
  }

  const alternateIdentifierRelations = [entity.mpn, entity.sku, entity.gtin]
    .filter(Boolean)
    .map((value) => stableIdentifierRelation(product.identity.model, value));

  if (alternateIdentifierRelations.includes("conflicting")) return false;
  if (
    modelRelation === "exact_alias" ||
    alternateIdentifierRelations.includes("exact_alias")
  ) {
    return true;
  }

  return (
    stableIdentifierRelation(product.identity.model, entity.name) === "exact_alias"
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  if (typeof value === "string") return compact(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^0-9.-]+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&lt;|&#60;/gi, "<")
    .replace(/&gt;|&#62;/gi, ">");
}

function stripHtml(value: string) {
  return compact(
    decodeHtml(
      value
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  const record = asRecord(value);
  if (!record) return [];
  const graph = Array.isArray(record["@graph"])
    ? (record["@graph"] as unknown[]).flatMap(flattenJsonLd)
    : [];
  return [record, ...graph];
}

function typeIncludesProduct(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(typeIncludesProduct);
  return typeof value === "string" && value.toLowerCase() === "product";
}

function jsonLdProducts(html: string) {
  const products: Record<string, unknown>[] = [];
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(decodeHtml(script[1] || ""));
      products.push(
        ...flattenJsonLd(parsed).filter((item) => typeIncludesProduct(item["@type"])),
      );
    } catch {
      // Malformed page metadata is untrusted and ignored.
    }
  }
  return products;
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return "";
  }
  const record = asRecord(value);
  if (record) {
    return asString(record.url) || asString(record.contentUrl) || asString(record.name);
  }
  return asString(value);
}

function absoluteUrl(value: string, baseUrl: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value, baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function recordBrand(product: Record<string, unknown>) {
  const brand = product.brand;
  const record = asRecord(brand);
  return asString(record?.name) || asString(brand);
}

function productOffers(product: Record<string, unknown>, baseUrl: string) {
  const rawOffers = Array.isArray(product.offers) ? product.offers : [product.offers];
  return rawOffers.flatMap((value): HybridObservedOffer[] => {
    const offer = asRecord(value);
    if (!offer) return [];
    const specification = asRecord(offer.priceSpecification);
    const seller = asRecord(offer.seller);
    return [
      {
        priceAmount:
          asNumber(offer.price) ??
          asNumber(offer.lowPrice) ??
          asNumber(specification?.price),
        currency:
          asString(offer.priceCurrency) ||
          asString(specification?.priceCurrency) ||
          null,
        availability: asString(offer.availability) || null,
        seller: asString(seller?.name) || asString(offer.seller) || null,
        url: absoluteUrl(asString(offer.url), baseUrl),
      },
    ];
  });
}

function productRating(product: Record<string, unknown>) {
  const rating = asRecord(product.aggregateRating);
  return {
    rating: asNumber(rating?.ratingValue),
    reviewCount: asNumber(rating?.reviewCount) ?? asNumber(rating?.ratingCount),
  };
}

function observedEntity(product: Record<string, unknown>, baseUrl: string) {
  const rating = productRating(product);
  return {
    name: asString(product.name),
    brand: recordBrand(product),
    model: asString(product.model),
    sku: asString(product.sku),
    mpn: asString(product.mpn),
    gtin:
      asString(product.gtin) ||
      asString(product.gtin8) ||
      asString(product.gtin12) ||
      asString(product.gtin13) ||
      asString(product.gtin14),
    url: absoluteUrl(asString(product.url), baseUrl),
    imageUrl: absoluteUrl(firstString(product.image), baseUrl),
    rating: rating.rating,
    reviewCount: rating.reviewCount,
    offers: productOffers(product, baseUrl),
  } satisfies HybridObservedProductEntity;
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return compact(decodeHtml(match[1]));
  }
  return "";
}

function tagText(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? stripHtml(match[1]) : "";
}

function extractTestedModels(html: string) {
  const labels = [
    /(?:model\s+tested|tested\s+model|model\s+reviewed)\s*[:\-]\s*([a-z0-9][a-z0-9 ./_-]{1,80})/gi,
    /<t[hd][^>]*>\s*(?:model\s+tested|tested\s+model|model\s+reviewed)\s*<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi,
  ];
  const found = new Set<string>();
  for (const pattern of labels) {
    for (const match of html.matchAll(pattern)) {
      const value = stripHtml(match[1] || "");
      if (value) found.add(value);
    }
  }
  return [...found];
}

export function observeHybridSourceHtml(input: {
  html: string;
  requestedUrl: string;
  finalUrl?: string;
  observedAt: string;
  status?: number;
  contentType?: string;
  redirectCount?: number;
}): HybridPageObservation {
  const finalUrl = input.finalUrl || input.requestedUrl;
  const contentType = (input.contentType || "text/html").toLowerCase();
  const isHtml =
    contentType.startsWith("text/html") ||
    contentType.startsWith("application/xhtml+xml");
  const entities = isHtml
    ? jsonLdProducts(input.html).map((product) => observedEntity(product, finalUrl))
    : [];
  const visibleText = isHtml ? stripHtml(input.html) : "";
  const hasDealerAction = /\bfind\s+(?:a\s+)?dealer\b/i.test(visibleText);
  return {
    requestedUrl: input.requestedUrl,
    finalUrl,
    observedAt: input.observedAt,
    status: input.status ?? 200,
    contentType,
    byteLength: Buffer.byteLength(input.html),
    contentHash: createHash("sha256").update(input.html).digest("hex"),
    redirectCount: input.redirectCount ?? 0,
    pageTitle: metaContent(input.html, "og:title") || tagText(input.html, "title"),
    heading: tagText(input.html, "h1"),
    entities,
    testedModels: isHtml ? extractTestedModels(input.html) : [],
    // Treat an explicit dealer action conservatively even if an unrelated
    // carousel elsewhere on the page contains an Add-to-cart control.
    dealerOnly: hasDealerAction,
    reviewsUnavailable:
      /\breviews?\s+(?:are\s+)?(?:temporarily\s+)?unavailable\b/i.test(visibleText),
    extractionDisposition: !isHtml
      ? "unsupported_content"
      : entities.length > 0
        ? "structured_products"
        : "no_structured_product",
  };
}

function receipt<T>(input: {
  status: HybridVerificationStatus;
  reason: HybridVerificationReceipt<T>["reason"];
  provisionalValue: T | null;
  observedValue: T | null;
  observation: HybridPageObservation;
}): HybridVerificationReceipt<T> {
  return {
    status: input.status,
    reason: input.reason,
    provisionalValue: input.provisionalValue,
    observedValue: input.observedValue,
    sourceUrl: input.observation.finalUrl,
    observedAt: input.observation.observedAt,
  };
}

function unavailableReceipt<T>(
  provisionalValue: T | null,
  observation: HybridPageObservation,
  reason: HybridVerificationReceipt<T>["reason"],
) {
  return receipt<T>({
    status: "unavailable",
    reason,
    provisionalValue,
    observedValue: null,
    observation,
  });
}

function missingReceipt<T>(
  provisionalValue: T | null,
  observation: HybridPageObservation,
  reason: HybridVerificationReceipt<T>["reason"] = "exact_entity_value_missing",
) {
  return receipt<T>({
    status: provisionalValue === null ? "inconclusive" : "cleared",
    reason,
    provisionalValue,
    observedValue: null,
    observation,
  });
}

function observedReceipt<T>(
  provisionalValue: T | null,
  observedValue: T,
  observation: HybridPageObservation,
  equal: (left: T, right: T) => boolean = Object.is,
) {
  return receipt<T>({
    status: "verified",
    reason:
      provisionalValue !== null && equal(provisionalValue, observedValue)
        ? "provisional_value_confirmed"
        : provisionalValue !== null
          ? "provisional_value_replaced"
          : "exact_entity_observed",
    provisionalValue,
    observedValue,
    observation,
  });
}

function identityReceipt(
  product: HybridProvisionalProduct,
  observation: HybridPageObservation,
  matches: number[],
) {
  const provisional = {
    brand: product.identity.brand,
    productName: product.identity.productName,
    model: product.identity.model,
  };
  if (observation.extractionDisposition === "unsupported_content") {
    return receipt({
      status: "inconclusive",
      reason: "unsupported_content",
      provisionalValue: provisional,
      observedValue: null,
      observation,
    });
  }
  if (matches.length === 1) {
    const entity = observation.entities[matches[0]];
    return receipt({
      status: "verified",
      reason: "exact_entity_observed",
      provisionalValue: provisional,
      observedValue: {
        brand: entity.brand || product.identity.brand,
        productName: entity.name || product.identity.productName,
        model: entity.model || entity.mpn || entity.sku || product.identity.model,
      },
      observation,
    });
  }
  if (matches.length > 1) {
    return receipt({
      status: "inconclusive",
      reason: "multiple_exact_entities",
      provisionalValue: provisional,
      observedValue: null,
      observation,
    });
  }
  return receipt({
    status: observation.entities.length > 0 ? "contradicted" : "inconclusive",
    reason:
      observation.entities.length > 0
        ? "exact_product_not_found"
        : "no_structured_product_entity",
    provisionalValue: provisional,
    observedValue: null,
    observation,
  });
}

function uniqueObservedPrice(offers: HybridObservedOffer[]) {
  const prices = [...new Set(offers.map((offer) => offer.priceAmount).filter((v): v is number => v !== null))];
  return prices.length === 1 ? prices[0] : null;
}

function uniqueObservedString(values: Array<string | null>) {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))];
  return unique.length === 1 ? unique[0] : null;
}

function editorialModelReceipt(
  product: HybridProvisionalProduct,
  observation: HybridPageObservation,
) {
  const relations = observation.testedModels.map((model) => ({
    model,
    relation: stableIdentifierRelation(product.identity.model, model),
  }));
  const matching = relations.find((item) => item.relation === "exact_alias");
  const conflicting = relations.some((item) => item.relation === "conflicting");
  if (matching && !conflicting) {
    return receipt({
      status: "verified",
      reason: "exact_tested_model_observed",
      provisionalValue: product.identity.model,
      observedValue: matching.model,
      observation,
    });
  }
  if (observation.testedModels.length > 0) {
    return receipt({
      status: "contradicted",
      reason: "different_tested_model_observed",
      provisionalValue: product.identity.model,
      observedValue: observation.testedModels.join(" | "),
      observation,
    });
  }
  return receipt({
    status: "inconclusive",
    reason: "tested_model_not_exposed",
    provisionalValue: product.identity.model,
    observedValue: null,
    observation,
  });
}

function professionalTestIdentityReceipt(
  product: HybridProvisionalProduct,
  observation: HybridPageObservation,
  editorialModel: HybridVerificationReceipt<string>,
) {
  return receipt({
    status:
      editorialModel.status === "contradicted"
        ? "contradicted"
        : "inconclusive",
    reason: editorialModel.reason,
    provisionalValue: {
      brand: product.identity.brand,
      productName: product.identity.productName,
      model: product.identity.model,
    },
    observedValue: null,
    observation,
  });
}

export function verifyHybridProductSource(input: {
  product: HybridProvisionalProduct;
  sourceRole: HybridSourceRole;
  observation: HybridPageObservation;
}): HybridSourceVerification {
  const { product, sourceRole, observation } = input;
  const matches = observation.entities.flatMap((entity, index) =>
    (sourceRole === "professional_test"
      ? professionalTestEntityMatchesExactProduct(product, entity)
      : entityMatchesExactProduct(product, entity))
      ? [index]
      : [],
  );
  const editorialModel = editorialModelReceipt(product, observation);
  const professionalTestEntityAuthorized =
    sourceRole !== "professional_test" || editorialModel.status === "verified";
  const identity = professionalTestEntityAuthorized
    ? identityReceipt(product, observation, matches)
    : professionalTestIdentityReceipt(product, observation, editorialModel);
  const exactEntity =
    professionalTestEntityAuthorized && matches.length === 1
      ? observation.entities[matches[0]]
      : null;
  const canEstablishOffer =
    sourceRole === "purchase_page" || sourceRole === "official_product";
  const canEstablishOwnerRating =
    sourceRole === "purchase_page" ||
    sourceRole === "official_product" ||
    sourceRole === "owner_feedback";

  let price = missingReceipt(product.priceAmount, observation);
  let currency = missingReceipt(product.currency || null, observation);
  let seller = missingReceipt(product.seller || null, observation);
  let purchaseUrl = missingReceipt(product.productUrl, observation);
  let availability = missingReceipt<string>(null, observation);
  let imageUrl = missingReceipt(product.imageUrl, observation);
  let rating = missingReceipt(product.rating, observation);
  let reviewCount = missingReceipt(product.reviewCount, observation);

  if (!canEstablishOffer) {
    price = missingReceipt(
      product.priceAmount,
      observation,
      "source_role_cannot_establish_offer",
    );
    currency = missingReceipt(
      product.currency || null,
      observation,
      "source_role_cannot_establish_offer",
    );
    seller = missingReceipt(
      product.seller || null,
      observation,
      "source_role_cannot_establish_offer",
    );
    purchaseUrl = missingReceipt(
      product.productUrl,
      observation,
      "source_role_cannot_establish_offer",
    );
    availability = missingReceipt<string>(
      null,
      observation,
      "source_role_cannot_establish_offer",
    );
  } else if (exactEntity) {
    const observedPrice = uniqueObservedPrice(exactEntity.offers);
    const observedUrl =
      exactEntity.url ||
      uniqueObservedString(exactEntity.offers.map((offer) => offer.url)) ||
      observation.finalUrl;
    const observedAvailability = uniqueObservedString(
      exactEntity.offers.map((offer) => offer.availability),
    );
    const observedCurrency = uniqueObservedString(
      exactEntity.offers
        .filter((offer) => observedPrice === null || offer.priceAmount === observedPrice)
        .map((offer) => offer.currency),
    );
    const observedSeller = uniqueObservedString(
      exactEntity.offers
        .filter((offer) => observedPrice === null || offer.priceAmount === observedPrice)
        .map((offer) => offer.seller),
    );
    price =
      observedPrice === null
        ? missingReceipt(product.priceAmount, observation)
        : observedReceipt(product.priceAmount, observedPrice, observation);
    currency = observedCurrency
      ? observedReceipt(
          product.currency || null,
          observedCurrency,
          observation,
          (left, right) => left.toUpperCase() === right.toUpperCase(),
        )
      : missingReceipt(product.currency || null, observation);
    seller = observedSeller
      ? observedReceipt(
          product.seller || null,
          observedSeller,
          observation,
          (left, right) => normalizeIdentity(left) === normalizeIdentity(right),
        )
      : missingReceipt(product.seller || null, observation);
    purchaseUrl = observedReceipt(
      product.productUrl,
      observedUrl,
      observation,
      (left, right) => {
        try {
          return new URL(left).toString() === new URL(right).toString();
        } catch {
          return false;
        }
      },
    );
    availability = observation.dealerOnly
      ? unavailableReceipt<string>(null, observation, "dealer_only_no_direct_purchase")
      : observedAvailability
        ? observedReceipt<string>(null, observedAvailability, observation)
        : missingReceipt<string>(null, observation);
  }

  if (!canEstablishOwnerRating) {
    rating = missingReceipt(
      product.rating,
      observation,
      "source_role_cannot_establish_owner_rating",
    );
    reviewCount = missingReceipt(
      product.reviewCount,
      observation,
      "source_role_cannot_establish_owner_rating",
    );
  }

  if (exactEntity) {
    imageUrl = exactEntity.imageUrl
      ? observedReceipt(product.imageUrl, exactEntity.imageUrl, observation)
      : missingReceipt(product.imageUrl, observation);
    if (canEstablishOwnerRating && observation.reviewsUnavailable) {
      rating = unavailableReceipt(
        product.rating,
        observation,
        "reviews_currently_unavailable",
      );
      reviewCount = unavailableReceipt(
        product.reviewCount,
        observation,
        "reviews_currently_unavailable",
      );
    } else if (canEstablishOwnerRating) {
      rating =
        exactEntity.rating === null
          ? missingReceipt(product.rating, observation)
          : observedReceipt(product.rating, exactEntity.rating, observation);
      reviewCount =
        exactEntity.reviewCount === null
          ? missingReceipt(product.reviewCount, observation)
          : observedReceipt(
              product.reviewCount,
              exactEntity.reviewCount,
              observation,
            );
    }
  }

  if (!professionalTestEntityAuthorized) {
    imageUrl = missingReceipt(
      product.imageUrl,
      observation,
      editorialModel.reason,
    );
  }

  return {
    verifierVersion: AUTONOMOUS_FACT_VERIFIER_VERSION,
    sourceRole,
    sourceUrl: observation.finalUrl,
    exactEntityIndex:
      professionalTestEntityAuthorized && matches.length === 1
        ? matches[0]
        : null,
    identity,
    price,
    currency,
    seller,
    purchaseUrl,
    availability,
    imageUrl,
    rating,
    reviewCount,
    editorialModel,
  };
}

function parseIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(value: number, base: string, prefix: number) {
  const baseValue = parseIpv4(base);
  if (baseValue === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPublicHybridFetchAddress(address: string) {
  const kind = isIP(address);
  if (kind === 4) {
    const value = parseIpv4(address);
    return (
      value !== null &&
      !BLOCKED_IPV4_RANGES.some(([base, prefix]) => inIpv4Range(value, base, prefix))
    );
  }
  if (kind !== 6) return false;
  const normalized = address.toLowerCase().split("%")[0];
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPublicHybridFetchAddress(mapped);
  return !(
    normalized === "::" ||
    normalized === "::1" ||
    /^f[cd]/.test(normalized) ||
    /^fe[89ab]/.test(normalized) ||
    /^ff/.test(normalized) ||
    /^2001:db8(?::|$)/.test(normalized)
  );
}

function parseSafeHybridUrl(value: string): URL | HybridFetchFailureReason {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "invalid_url";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "invalid_url";
  }
  if (parsed.username || parsed.password) return "credentials_forbidden";
  if (
    parsed.port &&
    !(
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    )
  ) {
    return "non_default_port";
  }
  parsed.hash = "";
  return parsed;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
  return Array.isArray(entry) ? entry[0] || "" : entry || "";
}

function failure(input: {
  requestedUrl: string;
  currentUrl?: URL | null;
  status?: number | null;
  contentType?: string | null;
  byteLength?: number;
  redirects: number;
  attempts: number;
  reason: HybridFetchFailureReason;
}): HybridFetchResult {
  return {
    ok: false,
    requestedUrl: input.requestedUrl,
    finalUrl: input.currentUrl?.toString() || null,
    status: input.status ?? null,
    contentType: input.contentType ?? null,
    byteLength: input.byteLength ?? 0,
    redirectCount: input.redirects,
    attempts: input.attempts,
    reason: input.reason,
  };
}

export async function fetchHybridSource(
  requestedUrl: string,
  dependencies: HybridFetchDependencies,
  config: HybridFetchConfig = DEFAULT_HYBRID_FETCH_CONFIG,
): Promise<HybridFetchResult> {
  let currentValue = requestedUrl;
  let redirects = 0;
  let attempts = 0;
  while (true) {
    const parsed = parseSafeHybridUrl(currentValue);
    if (typeof parsed === "string") {
      return failure({
        requestedUrl,
        redirects,
        attempts,
        reason: parsed,
      });
    }
    let addresses: string[];
    try {
      addresses = await dependencies.resolveHost(parsed.hostname);
    } catch {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        redirects,
        attempts,
        reason: "host_resolution_failed",
      });
    }
    if (addresses.length === 0) {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        redirects,
        attempts,
        reason: "host_resolution_failed",
      });
    }
    if (addresses.some((address) => !isPublicHybridFetchAddress(address))) {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        redirects,
        attempts,
        reason: "non_public_address",
      });
    }
    attempts += 1;
    let response: HybridTransportResponse;
    try {
      response = await dependencies.transport({
        url: parsed,
        address: addresses[0],
        timeoutMs: config.timeoutMs,
        maxBytes: config.maxBytes,
      });
    } catch (error) {
      const reason: HybridFetchFailureReason =
        error instanceof Error && error.name === "AbortError"
          ? "request_timeout"
          : error instanceof Error && error.message === "response_too_large"
            ? "response_too_large"
            : "request_failed";
      return failure({
        requestedUrl,
        currentUrl: parsed,
        redirects,
        attempts,
        reason,
      });
    }
    const location = headerValue(response.headers, "location");
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!location) {
        return failure({
          requestedUrl,
          currentUrl: parsed,
          status: response.status,
          redirects,
          attempts,
          reason: "redirect_missing_location",
        });
      }
      if (redirects >= config.maxRedirects) {
        return failure({
          requestedUrl,
          currentUrl: parsed,
          status: response.status,
          redirects,
          attempts,
          reason: "redirect_limit_exceeded",
        });
      }
      currentValue = new URL(location, parsed).toString();
      redirects += 1;
      continue;
    }
    const contentType = headerValue(response.headers, "content-type")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (response.status < 200 || response.status >= 300) {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        status: response.status,
        contentType,
        byteLength: response.body.byteLength,
        redirects,
        attempts,
        reason: "http_status_not_usable",
      });
    }
    if (
      !config.allowedContentTypes.some(
        (allowed) => contentType === allowed || contentType.startsWith(`${allowed};`),
      )
    ) {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        status: response.status,
        contentType,
        byteLength: response.body.byteLength,
        redirects,
        attempts,
        reason: "unsupported_content_type",
      });
    }
    if (response.body.byteLength > config.maxBytes) {
      return failure({
        requestedUrl,
        currentUrl: parsed,
        status: response.status,
        contentType,
        byteLength: response.body.byteLength,
        redirects,
        attempts,
        reason: "response_too_large",
      });
    }
    const body = Buffer.from(response.body).toString("utf8");
    return {
      ok: true,
      requestedUrl,
      finalUrl: parsed.toString(),
      status: response.status,
      contentType,
      byteLength: response.body.byteLength,
      redirectCount: redirects,
      attempts,
      body,
      contentHash: createHash("sha256").update(response.body).digest("hex"),
    };
  }
}

export async function resolveHybridHost(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(addresses.map((entry) => entry.address))];
}

export function nodeHybridTransport(input: {
  url: URL;
  address: string;
  timeoutMs: number;
  maxBytes: number;
  accept?: string;
}): Promise<HybridTransportResponse> {
  return new Promise((resolve, reject) => {
    const request = (input.url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        protocol: input.url.protocol,
        hostname: input.address,
        port: input.url.port || (input.url.protocol === "https:" ? 443 : 80),
        method: "GET",
        path: `${input.url.pathname}${input.url.search}`,
        servername: input.url.hostname,
        headers: {
          Host: input.url.host,
          Accept:
            input.accept ??
            "text/html,application/xhtml+xml;q=0.9",
          "Accept-Encoding": "identity",
          "User-Agent": "ReviewRadar/0.1 exact-product verifier",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let byteLength = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          byteLength += buffer.byteLength;
          if (byteLength > input.maxBytes) {
            response.destroy(new Error("response_too_large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
        response.on("error", reject);
      },
    );
    request.setTimeout(input.timeoutMs, () => {
      const error = new Error("request_timeout");
      error.name = "AbortError";
      request.destroy(error);
    });
    request.on("error", reject);
    request.end();
  });
}

export const LIVE_HYBRID_FETCH_DEPENDENCIES: HybridFetchDependencies = {
  resolveHost: resolveHybridHost,
  transport: nodeHybridTransport,
};

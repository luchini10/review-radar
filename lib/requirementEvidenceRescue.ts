import type {
  ProductFieldEvidence,
  ProductMetadata,
  ProductOffer,
  ProductRecommendation,
  RawProductCandidate,
  RecommendationApiRequest,
  RecommendationResult,
} from "@/types/review-radar";
import {
  searchSerperOrganicEvidence,
  searchSerperShopping,
  searchSerperShoppingWithDiagnostics,
  type SerperEvidenceSource,
  type SerperShoppingSearchDiagnostics,
  type SerperShoppingSearchResult,
} from "./search/serper.ts";
import {
  brandEvidenceMatches,
  brandAppearsOnlyAsMeasurement,
  canonicalBrand,
  inferKnownBrand,
  isSourceOrRetailerLabel,
  stripLeadingSourceOrRetailerLabel,
} from "./brandMatching.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import {
  featureEvidenceSupports,
  validateProductAgainstRequirements,
} from "./requirementValidation.ts";
import {
  classifyRubricFactImportance,
  isRubricFactUnknownTopic,
  rubricFactFromUnknownTopic,
  rubricImportanceRank,
} from "./rubricFactImportance.ts";
import { mapWithConcurrency } from "./recommendationPerformance.ts";
import { extractSpecsFromText } from "./specExtraction.ts";
import { sourceTier } from "./search/sourceTier.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";
import {
  classifyProductEvidenceIdentity,
  hasExplicitVariantConflict,
} from "./productEvidenceIdentity.ts";
import { resolveBestProductImage } from "./productImageResolver.ts";

type VerifiableFactKind = "color" | "dimension" | "feature" | "price" | "spec";

type MissingFact = {
  dimension?: "width" | "depth" | "height";
  kind: VerifiableFactKind;
  label: string;
  queryTerm: string;
  rubricUnknownTopic?: string;
  spec?: string;
  value?: string;
};

// Phase 4b gate: spec evidence rescue (targeted re-search to flip a hard-spec
// unknown to passed) only runs when enabled.
function specSearchEnabled() {
  return process.env.REVIEW_RADAR_SPEC_SEARCH === "on";
}

type VerificationOptions = {
  concurrency?: number;
  maxFactsPerProduct?: number;
  maxProducts?: number;
};

const MAX_PRODUCTS_TO_VERIFY = 8;
const MAX_FACTS_PER_PRODUCT = 2;
const COLOR_VALUES = [
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
const GENERIC_PRODUCT_WORDS = new Set([
  "and",
  "best",
  "black",
  "built",
  "chair",
  "couch",
  "finish",
  "for",
  "free",
  "inch",
  "inches",
  "oven",
  "product",
  "range",
  "sale",
  "sofa",
  "steel",
  "stainless",
  "the",
  "with",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const UNTRUSTED_REQUIREMENT_VERIFICATION_HOSTS = [
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "reddit.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
];

export function sourceTrustedForRequirementVerification(url: string) {
  const host = sourceHost(url);

  if (!host) {
    return false;
  }

  return !UNTRUSTED_REQUIREMENT_VERIFICATION_HOSTS.some(
    (blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`),
  );
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

function significantTokens(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !GENERIC_PRODUCT_WORDS.has(token) &&
        !COLOR_VALUES.includes(token),
    );
}

type ModelIdentityStrength = "family" | "strong";

type ModelIdentityCandidate = {
  end: number;
  normalized: string;
  raw: string;
  score: number;
  start: number;
  strength: ModelIdentityStrength;
  style: "compact" | "descriptive" | "digit_dash" | "word_number";
};

type ExtractedModelIdentity = {
  candidates: ModelIdentityCandidate[];
  familyTokens: string[];
  strongTokens: string[];
  tokens: string[];
};

const MEASUREMENT_MODEL_PREFIXES = new Set([
  "amp",
  "amps",
  "ah",
  "btu",
  "cfm",
  "db",
  "ft",
  "gal",
  "gallon",
  "gpm",
  "hp",
  "hz",
  "in",
  "inch",
  "kw",
  "lb",
  "mah",
  "mph",
  "oz",
  "pint",
  "psi",
  "rpm",
  "v",
  "vac",
  "volt",
  "volts",
  "w",
  "watt",
  "watts",
]);

const NON_MODEL_WORD_NUMBER_PREFIXES = new Set([
  "best",
  "count",
  "generic",
  "generation",
  "model",
  "pack",
  "series",
  "set",
  "size",
  "type",
]);

function normalizeModelToken(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function isMeasurementModelToken(value: string) {
  if (!/\s/.test(value)) return false;
  const prefix = normalizeModelToken(value).match(/^[a-z]+/)?.[0] || "";
  return (
    MEASUREMENT_MODEL_PREFIXES.has(prefix) ||
    NON_MODEL_WORD_NUMBER_PREFIXES.has(prefix)
  );
}

function extractModelIdentity(
  value: string,
  options: { brandQualified?: boolean } = {},
): ExtractedModelIdentity {
  const byToken = new Map<string, ModelIdentityCandidate>();

  const addCandidate = (
    match: RegExpMatchArray,
    style: ModelIdentityCandidate["style"],
    score: number,
    strength: ModelIdentityStrength = "strong",
  ) => {
    if (match.index === undefined) return;
    const raw = match[0].trim();
    const normalized = normalizeModelToken(raw);
    if (!normalized || isMeasurementModelToken(raw)) return;

    const shortToken = normalized.length < 4;
    if (
      !options.brandQualified &&
      (shortToken || strength === "family" || style === "digit_dash")
    ) {
      return;
    }

    const candidate: ModelIdentityCandidate = {
      end: match.index + match[0].length,
      normalized,
      raw,
      score,
      start: match.index,
      strength: shortToken ? "family" : strength,
      style,
    };
    const existing = byToken.get(normalized);
    if (!existing || candidate.score > existing.score) {
      byToken.set(normalized, candidate);
    }
  };

  for (const match of value.matchAll(/\b[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*\b/g)) {
    const compact = !/\s/.test(match[0]);
    addCandidate(match, "compact", compact ? 120 : 90);
  }
  for (const match of value.matchAll(/\b\d{1,3}(?:-\d{1,4}){2,}\b/g)) {
    addCandidate(match, "digit_dash", 105);
  }
  for (const match of value.matchAll(
    /\b[A-Z][a-z][A-Za-z0-9-]{2,}\s+\d{2,4}[A-Z0-9-]*\b/g,
  )) {
    addCandidate(match, "word_number", 100);
  }
  for (const match of value.matchAll(
    /\b(?:[A-Z][a-z][A-Za-z0-9+.-]{2,}|[A-Z]{2,})(?:\s+(?:[A-Z][A-Za-z0-9+.-]{1,}|[A-Z]{2,})){1,3}\s+[A-Z][A-Za-z0-9.-]*\+/g,
  )) {
    addCandidate(match, "descriptive", 80, "family");
  }

  const candidates = Array.from(byToken.values()).sort(
    (first, second) => second.score - first.score || first.start - second.start,
  );
  const strongTokens = candidates
    .filter((candidate) => candidate.strength === "strong")
    .map((candidate) => candidate.normalized);
  const familyTokens = candidates
    .filter((candidate) => candidate.strength === "family")
    .map((candidate) => candidate.normalized);

  return {
    candidates,
    familyTokens,
    strongTokens,
    tokens: [...strongTokens, ...familyTokens],
  };
}

function productModelIdentity(product: ProductRecommendation): ExtractedModelIdentity {
  const brandQualified = Boolean(sourceUpgradeBrand(product));
  const fromName = extractModelIdentity(
    stripLeadingSourceOrRetailerLabel(product.name),
    { brandQualified },
  );
  const metadataTokens = [
    product.metadata?.modelNumber?.value || "",
    product.metadata?.sku?.value || "",
    product.metadata?.gtin?.value || "",
  ]
    .map(normalizeModelToken)
    .filter(
      (token) => token.length >= 4 || (brandQualified && token.length >= 2),
    );
  const metadataStrong = metadataTokens.filter((token) => token.length >= 4);
  const metadataFamily = metadataTokens.filter((token) => token.length < 4);

  return {
    candidates: fromName.candidates,
    familyTokens: Array.from(
      new Set([...metadataFamily, ...fromName.familyTokens]),
    ),
    strongTokens: Array.from(
      new Set([...metadataStrong, ...fromName.strongTokens]),
    ),
    tokens: Array.from(new Set([...metadataTokens, ...fromName.tokens])),
  };
}

function modelTokens(product: ProductRecommendation) {
  return productModelIdentity(product).tokens;
}

function modelFamilyPrefix(value: string) {
  return value.replace(/[^a-z0-9]/g, "").match(/^[a-z]+/)?.[0] || "";
}

function hasConflictingModelToken(
  targetModelTokens: string[],
  candidateModelTokens: string[],
) {
  return candidateModelTokens.some((candidateModel) => {
    const candidatePrefix = modelFamilyPrefix(candidateModel);
    if (!candidatePrefix) return false;

    return targetModelTokens.some((targetModel) => {
      const targetPrefix = modelFamilyPrefix(targetModel);
      return (
        targetPrefix === candidatePrefix &&
        targetModel !== candidateModel
      );
    });
  });
}

function hasConflictingDigitDashModel(
  targetIdentity: ExtractedModelIdentity,
  candidateIdentity: ExtractedModelIdentity,
) {
  const targetModels = targetIdentity.candidates.filter(
    (candidate) =>
      candidate.strength === "strong" && candidate.style === "digit_dash",
  );
  const candidateModels = candidateIdentity.candidates.filter(
    (candidate) =>
      candidate.strength === "strong" && candidate.style === "digit_dash",
  );

  return (
    targetModels.length > 0 &&
    candidateModels.length > 0 &&
    !candidateModels.some((candidate) =>
      targetModels.some((target) => target.normalized === candidate.normalized),
    )
  );
}

function identityUrlText(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.pathname;
  } catch {
    return value.split(/[?#]/, 1)[0] || "";
  }
}

function evidenceText(candidate: RawProductCandidate | SerperEvidenceSource) {
  if ("evidenceSources" in candidate) {
    return normalizeText(
      [
        stripLeadingSourceOrRetailerLabel(candidate.name),
        isSourceOrRetailerLabel(candidate.brand) ? "" : candidate.brand || "",
        candidate.availableColors.join(" "),
        candidate.keySpecs.join(" "),
        ...candidate.evidenceSources.flatMap((source) => [
          stripLeadingSourceOrRetailerLabel(source.title),
          source.snippetProvenance === "query-derived" ? "" : source.snippet,
          identityUrlText(source.url),
        ]),
      ].join(" "),
    );
  }

  return normalizeText(
    [
      stripLeadingSourceOrRetailerLabel(candidate.title),
      candidate.snippet,
      identityUrlText(candidate.url),
    ].join(" "),
  );
}

function evidenceUrl(candidate: RawProductCandidate | SerperEvidenceSource) {
  return "productUrl" in candidate ? candidate.productUrl : candidate.url;
}

function evidenceTitle(candidate: RawProductCandidate | SerperEvidenceSource) {
  return stripLeadingSourceOrRetailerLabel(
    "name" in candidate ? candidate.name : candidate.title,
  );
}

function sourceDerivedBrandEvidence(
  candidate: RawProductCandidate | SerperEvidenceSource,
) {
  if ("evidenceSources" in candidate) {
    return [
      stripLeadingSourceOrRetailerLabel(candidate.name),
      candidate.availableColors.join(" "),
      candidate.keySpecs.join(" "),
      ...candidate.evidenceSources.flatMap((source) => [
        stripLeadingSourceOrRetailerLabel(source.title),
        source.snippetProvenance === "query-derived" ? "" : source.snippet,
        identityUrlText(source.url),
      ]),
    ].join(" ");
  }

  return [
    stripLeadingSourceOrRetailerLabel(candidate.title),
    candidate.snippet,
    identityUrlText(candidate.url),
  ].join(" ");
}

function evidenceBrand(
  candidate: RawProductCandidate | SerperEvidenceSource,
  candidateTitle: string,
  targetBrand: string | null,
) {
  const explicitBrand = "brand" in candidate ? candidate.brand?.trim() : "";
  if (explicitBrand && !isSourceOrRetailerLabel(explicitBrand)) {
    if (canonicalBrand(explicitBrand) === "HP") {
      const sourceEvidence = sourceDerivedBrandEvidence(candidate);
      const knownSourceBrand = inferKnownBrand(sourceEvidence);

      if (
        knownSourceBrand &&
        canonicalBrand(knownSourceBrand) !== "HP"
      ) {
        return knownSourceBrand;
      }

      if (
        targetBrand &&
        canonicalBrand(targetBrand) !== "HP" &&
        brandEvidenceMatches(sourceEvidence, targetBrand) &&
        (brandAppearsOnlyAsMeasurement(sourceEvidence, explicitBrand) ||
          !brandEvidenceMatches(sourceEvidence, explicitBrand))
      ) {
        return targetBrand;
      }
    }

    return explicitBrand;
  }

  return inferKnownBrand(candidateTitle) || leadingBrandFromTitle(candidateTitle);
}

const FAMILY_IDENTITY_CATEGORY_MODIFIERS = new Set([
  "best",
  "cordless",
  "electric",
  "gas",
  "portable",
  "smart",
  "wet",
  "wireless",
]);

function familyIdentitySupportsCategory(evidence: string, category: string) {
  const evidenceWords = new Set(normalizeText(evidence).split(/\s+/).filter(Boolean));
  const categoryWords = normalizeText(category)
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 3 && !FAMILY_IDENTITY_CATEGORY_MODIFIERS.has(word),
    );

  return (
    categoryWords.length > 0 &&
    categoryWords.every(
      (word) =>
        evidenceWords.has(word) ||
        (word === "vac" && evidenceWords.has("vacuum")) ||
        (word === "tv" && evidenceWords.has("television")),
    )
  );
}

function looksLikeSameProduct(
  product: ProductRecommendation,
  candidate: RawProductCandidate | SerperEvidenceSource,
  requestedCategory?: string,
) {
  const text = evidenceText(candidate);
  const normalizedEvidence = normalizeModelToken(text);
  const productName = stripLeadingSourceOrRetailerLabel(product.name);
  const productTypeVerdict = requestedCategory
    ? classifyProductTypeMatch({
        evidenceText: text,
        requestedCategory,
      })
    : null;

  if (productTypeVerdict && !productTypeVerdict.canBeExactMatch) {
    return false;
  }

  const candidateTitle = evidenceTitle(candidate);
  if (
    hasExplicitVariantConflict(
      productName,
      `${candidateTitle} ${identityUrlText(evidenceUrl(candidate))}`,
      requestedCategory,
    )
  ) {
    return false;
  }

  const targetIdentity = productModelIdentity(product);
  const targetBrand = sourceUpgradeBrand(product);
  const candidateBrand = evidenceBrand(candidate, candidateTitle, targetBrand);
  const candidateIdentity = extractModelIdentity(candidateTitle, {
    brandQualified: Boolean(candidateBrand),
  });
  const hasConflictingStrongModel =
    candidateIdentity.strongTokens.length > 0 &&
    (hasConflictingModelToken(
      targetIdentity.strongTokens,
      candidateIdentity.strongTokens,
    ) || hasConflictingDigitDashModel(targetIdentity, candidateIdentity));

  if (targetIdentity.strongTokens.length > 0) {
    if (hasConflictingStrongModel) {
      return false;
    }

    const hasExactStrongModel = targetIdentity.strongTokens.some((model) =>
      normalizedEvidence.includes(model),
    );
    if (!hasExactStrongModel) {
      return false;
    }

    if (
      targetBrand &&
      candidateBrand &&
      !brandEvidenceMatches(candidateBrand, targetBrand)
    ) {
      return false;
    }

    return true;
  }

  if (
    targetBrand &&
    !brandEvidenceMatches(text, targetBrand)
  ) {
    return false;
  }

  if (
    targetIdentity.strongTokens.length === 0 &&
    targetIdentity.familyTokens.length > 0 &&
    (!requestedCategory || !familyIdentitySupportsCategory(text, requestedCategory))
  ) {
    return false;
  }

  const productTokens = Array.from(
    new Set(
      significantTokens(
        [
          productName,
          isSourceOrRetailerLabel(product.metadata?.brand?.value)
            ? ""
            : product.metadata?.brand?.value || "",
          stripLeadingSourceOrRetailerLabel(
            product.metadata?.title?.value || "",
          ),
        ].join(" "),
      ),
    ),
  );
  const candidateTokens = new Set(significantTokens(text));
  const matches = productTokens.filter((token) => candidateTokens.has(token));

  return matches.length >= Math.min(3, Math.max(2, productTokens.length));
}

function cleanLabelValue(label: string) {
  const [, ...rest] = label.split(":");

  return (rest.join(":") || label)
    .replace(/\b(?:not verified|or less|required|under|at least)\b/gi, " ")
    .replace(/\$[\d,]+(?:\.\d+)?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readableFactSentence(label: string) {
  const clean = cleanLabelValue(label);
  const readable = clean
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");

  if (!readable) {
    return "";
  }

  return `${readable.charAt(0).toUpperCase()}${readable.slice(1)}.`;
}

export function missingFactFromLabel(label: string): MissingFact {
  const normalized = normalizeText(label);

  if (normalized.includes("budget") || normalized.includes("price")) {
    return {
      kind: "price",
      label,
      queryTerm: "current price",
    };
  }

  const dimension =
    normalized.includes("depth") || normalized.includes("deep")
      ? "depth"
      : normalized.includes("height") ||
          normalized.includes("tall") ||
          normalized.includes("high")
        ? "height"
        : normalized.includes("width") ||
            normalized.includes("wide") ||
            normalized.includes("inches") ||
            normalized.includes(" inch")
          ? "width"
          : undefined;

  if (dimension) {
    return {
      dimension,
      kind: "dimension",
      label,
      queryTerm: `${dimension} dimensions specifications`,
    };
  }

  if (normalized.includes("color") || normalized.includes("finish")) {
    const explicitColor = COLOR_VALUES.find((color) => normalized.includes(color));

    return {
      kind: "color",
      label,
      queryTerm: explicitColor || cleanLabelValue(label) || "color finish",
      value: explicitColor || cleanLabelValue(label),
    };
  }

  const textSpecs = extractSpecsFromText(label);
  const numericSpecId = Object.keys(textSpecs).find(
    (id) => textSpecs[id].kind === "numeric",
  );

  if (numericSpecId) {
    return {
      kind: "spec",
      spec: numericSpecId,
      label,
      queryTerm: cleanLabelValue(label) || label,
      value: cleanLabelValue(label),
    };
  }

  return {
    kind: "feature",
    label,
    queryTerm: cleanLabelValue(label) || label,
    value: cleanLabelValue(label),
  };
}

function capitalizeSentence(value: string) {
  const trimmed = value.trim();

  return trimmed
    ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
    : trimmed;
}

// Pure: records a numeric spec found in evidence as a verified pro (+ citation)
// so requirement revalidation flips that spec from unknown to passed. The actual
// value found drives correctness — a value that does not satisfy the requirement
// simply will not pass on revalidation.
export function applySpecEvidenceFromText(
  product: ProductRecommendation,
  fact: MissingFact,
  text: string,
  sourceUrl: string,
  sourceTitle: string,
): ProductRecommendation {
  if (!fact.spec) {
    return product;
  }

  const found = extractSpecsFromText(text)[fact.spec];

  if (!found || typeof found.value !== "number") {
    return product;
  }

  let updated = product;

  if (
    sourceUrl &&
    !updated.citations.some((citation) => citation.url === sourceUrl)
  ) {
    updated = {
      ...updated,
      citations: [
        ...updated.citations,
        {
          title: sourceTitle || updated.name,
          url: sourceUrl,
          what_it_supports: `Verification source checked ${fact.label}.`,
        },
      ],
    };
  }

  const proText = `${capitalizeSentence(found.raw)}.`;

  if (
    !updated.pros.some((pro) =>
      normalizeText(pro).includes(normalizeText(found.raw)),
    )
  ) {
    updated = { ...updated, pros: [...updated.pros, proText] };
  }

  return updated;
}

function candidatePriceEvidence(candidate: RawProductCandidate) {
  return candidate.price === null ? null : candidate.price;
}

function hasVerifiedPrice(product: ProductRecommendation) {
  return Boolean(
    product.metadata?.offers.some(
      (offer) =>
        offer.price.value !== null &&
        Number.isFinite(offer.price.value) &&
        offer.price.confidence !== "Low",
    ),
  );
}

function removeVerifiedRubricUnknown(
  product: ProductRecommendation,
  fact: MissingFact,
) {
  if (!fact.rubricUnknownTopic || !product.evidenceBucket?.unknowns.length) {
    return product;
  }

  const unknowns = product.evidenceBucket.unknowns.filter(
    (item) => item.topic !== fact.rubricUnknownTopic,
  );

  if (unknowns.length === product.evidenceBucket.unknowns.length) {
    return product;
  }

  return {
    ...product,
    evidenceBucket: {
      ...product.evidenceBucket,
      unknowns,
    },
  };
}

function candidateColorEvidence(candidate: RawProductCandidate, fact: MissingFact) {
  const expectedColor = normalizeText(fact.value || fact.queryTerm);
  const colors = candidate.availableColors.filter((color) => {
    const normalizedColor = normalizeText(color);

    return (
      normalizedColor === expectedColor ||
      normalizedColor.includes(expectedColor) ||
      expectedColor.includes(normalizedColor)
    );
  });

  if (colors.length > 0) {
    return colors;
  }

  return expectedColor && evidenceText(candidate).includes(expectedColor)
    ? [fact.value || fact.queryTerm]
    : [];
}

function extractDimensionFromText(
  text: string,
  dimension: "width" | "depth" | "height",
) {
  const dimensionWords =
    dimension === "depth"
      ? "(?:depth|deep|d)"
      : dimension === "height"
        ? "(?:height|high|tall|h)"
        : "(?:width|wide|w)";
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

function candidateDimensionEvidence(candidate: RawProductCandidate, fact: MissingFact) {
  const dimension = fact.dimension || "width";
  const structured = candidate.dimensions[dimension];

  if (structured !== null && structured !== undefined) {
    return structured;
  }

  return extractDimensionFromText(evidenceText(candidate), dimension);
}

function sourceSupportsFact(source: SerperEvidenceSource, fact: MissingFact) {
  const text = evidenceText(source);

  if (fact.kind === "color") {
    const expectedColor = normalizeText(fact.value || fact.queryTerm);

    return expectedColor ? text.includes(expectedColor) : false;
  }

  if (fact.kind === "dimension") {
    return extractDimensionFromText(text, fact.dimension || "width") !== null;
  }

  if (fact.kind === "feature") {
    return featureEvidenceSupports(text, fact.value || fact.queryTerm);
  }

  if (fact.kind === "spec" && fact.spec) {
    const found = extractSpecsFromText(text)[fact.spec];

    return Boolean(found && typeof found.value === "number");
  }

  return false;
}

function addVerifiedFeaturePro(
  product: ProductRecommendation,
  fact: MissingFact,
) {
  const label = fact.value || fact.queryTerm;
  const pro = readableFactSentence(label);

  // Pros feed the requirement validator's positive evidence text, so adding
  // the verified feature here is what flips the requirement from unknown to
  // passed on revalidation.
  if (!pro) {
    return product;
  }

  if (
    product.pros.some((existing) =>
      normalizeText(existing).includes(normalizeText(label)),
    )
  ) {
    return product;
  }

  return {
    ...product,
    pros: [...product.pros, pro],
  };
}

function mergeColors(
  metadata: ProductMetadata,
  colors: string[],
  sourceUrl: string,
): ProductMetadata {
  const existingColors = metadata.colors?.value || [];
  const mergedColors = Array.from(
    new Set([...existingColors, ...colors].map((color) => color.trim()).filter(Boolean)),
  );

  if (mergedColors.length === existingColors.length) {
    return metadata;
  }

  return {
    ...metadata,
    colors: field(mergedColors, sourceUrl, "serper", "Medium"),
  };
}

function mergeDimension(
  metadata: ProductMetadata,
  dimension: "width" | "depth" | "height",
  value: number,
  sourceUrl: string,
): ProductMetadata {
  const existing = metadata.dimensions?.[dimension]?.value;

  if (existing !== null && existing !== undefined && Number.isFinite(existing)) {
    return metadata;
  }

  return {
    ...metadata,
    dimensions: {
      ...(metadata.dimensions || {}),
      [dimension]: field(value, sourceUrl, "serper", "Medium"),
      unit: metadata.dimensions?.unit || "in",
    },
  };
}

function mergeOffer(
  metadata: ProductMetadata,
  price: number,
  candidate: RawProductCandidate,
): ProductMetadata {
  const alreadyHasPrice = metadata.offers.some(
    (offer) => offer.price.value !== null && Number.isFinite(offer.price.value),
  );

  if (alreadyHasPrice) {
    return metadata;
  }

  const offer: ProductOffer = {
    availability: field(null, candidate.productUrl, "serper", "Low"),
    price: field(price, candidate.productUrl, "serper", "Medium"),
    priceCurrency: field("USD", candidate.productUrl, "serper", "Medium"),
    retailer: candidate.retailer || sourceHost(candidate.productUrl) || null,
    url: candidate.productUrl,
  };

  return {
    ...metadata,
    offers: [...metadata.offers, offer],
  };
}

function addVerificationCitation(
  product: ProductRecommendation,
  source: RawProductCandidate | SerperEvidenceSource,
  fact: MissingFact,
) {
  const url = evidenceUrl(source);

  if (!url || product.citations.some((citation) => citation.url === url)) {
    return product;
  }

  return {
    ...product,
    citations: [
      ...product.citations,
      {
        title: evidenceTitle(source) || product.name,
        url,
        what_it_supports: `Verification source checked ${fact.label}.`,
      },
    ],
  };
}

export function buildVerificationQueries(
  product: ProductRecommendation,
  missingLabels: string[],
  category: string,
  maxFacts = MAX_FACTS_PER_PRODUCT,
) {
  return missingLabels.slice(0, maxFacts).map((label) => {
    const fact = missingFactFromLabel(label);

    return {
      fact,
      query: `${product.name} ${fact.queryTerm} ${category}`
        .replace(/\s+/g, " ")
        .trim(),
    };
  });
}

// Google Shopping matches on product IDENTITY (brand + model), so the rescue
// shopping leg searches the product name + category rather than the descriptive
// verification phrase ("... current price ...") used for the organic-evidence
// leg. The descriptive words are noise for a shopping engine and reduce the
// match rate — the very thing that leaves products with a text-only price.
// General across all fact kinds and categories.
export function buildRescueShoppingQuery(
  product: Pick<ProductRecommendation, "name">,
  category: string,
) {
  return `${product.name} ${category}`.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queryWords(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function containsCategoryWords(query: string, category: string) {
  const queryWordSet = new Set(queryWords(query));
  const categoryWords = queryWords(category).filter(
    (word) => !GENERIC_PRODUCT_WORDS.has(word),
  );

  return categoryWords.length > 0 && categoryWords.every((word) => queryWordSet.has(word));
}

function removeTrailingCategory(query: string, category: string) {
  const pattern = new RegExp(`\\s+${escapeRegExp(category)}\\s*$`, "i");
  return query.replace(pattern, "").trim();
}

function stripRetailDisplayFiller(query: string) {
  return query
    .replace(
      /\s+in\s+(?:black|white|gray|grey|red|blue|green|brown|stainless steel)\b.*$/i,
      "",
    )
    .replace(
      /\s+with\s+(?:stainless steel|black|white|gray|grey|red|blue|green|brown)\b.*$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const MODEL_SUFFIX_WORDS = new Set([
  "ai",
  "combo",
  "fuel",
  "max",
  "plus",
  "pro",
  "se",
  "sib",
  "ultra",
]);

const LEADING_BRAND_STOPWORDS = new Set([
  "best",
  "black",
  "built",
  "compact",
  "cordless",
  "electric",
  "energy",
  "generic",
  "heavy",
  "new",
  "portable",
  "premium",
  "professional",
  "smart",
  "stainless",
  "the",
  "white",
]);

const MODEL_CONTEXT_STOPWORDS = new Set([
  "blower",
  "desktop",
  "drill",
  "grill",
  "laptop",
  "pc",
  "refrigerator",
  "tool",
  "tv",
  "vac",
  "vacuum",
]);

function leadingBrandFromTitle(name: string) {
  const firstWord = name.trim().split(/\s+/)[0] || "";
  if (!firstWord || firstWord.includes("/") || /\d/.test(firstWord)) return null;

  const candidate = firstWord
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z0-9+&.-]+$/, "");
  const normalized = normalizeText(candidate);

  if (
    candidate.length < 2 ||
    !normalized ||
    LEADING_BRAND_STOPWORDS.has(normalized)
  ) {
    return null;
  }

  return candidate;
}

function identityWordsBefore(
  name: string,
  candidate: ModelIdentityCandidate,
  count: number,
  detectedBrand: string | null,
) {
  if (count <= 0) return [];

  const detectedBrandNormalized = normalizeText(detectedBrand || "");
  const detectedBrandWords = new Set(
    detectedBrandNormalized.split(/\s+/).filter(Boolean),
  );
  return name
    .slice(0, candidate.start)
    .trim()
    .split(/\s+/)
    .slice(-count)
    .map((word) => word.replace(/[^A-Za-z0-9+&.-]/g, ""))
    .filter((word) => {
      const normalized = normalizeText(word);
      return (
        normalized &&
        normalized !== detectedBrandNormalized &&
        !detectedBrandWords.has(normalized) &&
        !GENERIC_PRODUCT_WORDS.has(normalized) &&
        !MEASUREMENT_MODEL_PREFIXES.has(normalized) &&
        (!detectedBrand || !MODEL_CONTEXT_STOPWORDS.has(normalized)) &&
        !/^\d/.test(normalized)
      );
    });
}

function identitySuffixAfter(
  name: string,
  candidate: ModelIdentityCandidate,
) {
  const suffix =
    name
      .slice(candidate.end)
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^A-Za-z0-9+&-]/g, "") || "";
  const normalized = normalizeText(suffix);

  if (
    !suffix ||
    MEASUREMENT_MODEL_PREFIXES.has(normalized) ||
    (!MODEL_SUFFIX_WORDS.has(normalized) && !/^[A-Z]{2,4}\+?$/.test(suffix))
  ) {
    return "";
  }

  return suffix;
}

function selectedModelIdentityPhrase(
  name: string,
  detectedBrand: string | null,
) {
  const identity = extractModelIdentity(name, {
    brandQualified: Boolean(detectedBrand),
  });
  const candidate = identity.candidates[0];
  if (!candidate) return "";

  let prefixCount = 0;
  if (candidate.style === "digit_dash") {
    prefixCount = 2;
  } else if (candidate.style === "compact" && /\s/.test(candidate.raw)) {
    prefixCount = 1;
  } else if (detectedBrand && candidate.style === "compact") {
    prefixCount = 1;
  } else if (!detectedBrand && candidate.style === "compact") {
    prefixCount = 2;
  }

  const prefix = identityWordsBefore(
    name,
    candidate,
    prefixCount,
    detectedBrand,
  );
  const suffix = identitySuffixAfter(name, candidate);

  return [...prefix, candidate.raw.replace(/\s+/g, " "), suffix]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildModelIdentityQuery(name: string, detectedBrand: string | null) {
  const modelIdentity = selectedModelIdentityPhrase(name, detectedBrand);
  if (!modelIdentity) return "";

  if (detectedBrand) {
    return normalizeModelToken(modelIdentity).includes(
      normalizeModelToken(detectedBrand),
    )
      ? modelIdentity
      : `${detectedBrand} ${modelIdentity}`;
  }

  return modelIdentity;
}

function sourceUpgradeBrand(
  product: Pick<ProductRecommendation, "name" | "metadata">,
) {
  const productName = stripLeadingSourceOrRetailerLabel(product.name);
  const metadataBrand = product.metadata?.brand?.value?.trim() || "";
  if (
    metadataBrand &&
    !isSourceOrRetailerLabel(metadataBrand) &&
    !brandAppearsOnlyAsMeasurement(productName, metadataBrand)
  ) {
    return metadataBrand;
  }

  return inferKnownBrand(productName) || leadingBrandFromTitle(productName);
}

export function buildSourceUpgradeShoppingQuery(
  product: Pick<ProductRecommendation, "name" | "metadata">,
  category: string,
) {
  const productName = stripLeadingSourceOrRetailerLabel(product.name);
  const modelIdentity = buildModelIdentityQuery(
    productName,
    sourceUpgradeBrand(product),
  );

  if (modelIdentity) {
    return removeTrailingCategory(modelIdentity, category);
  }

  let query = stripRetailDisplayFiller(productName);

  if (!containsCategoryWords(query, category)) {
    query = `${query} ${category}`;
  }

  return query.replace(/\s+/g, " ").trim();
}

const MAX_SOURCE_UPGRADE_QUERY_LENGTH = 120;

function clampQueryLength(query: string) {
  let words = query.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);

  while (words.join(" ").length > MAX_SOURCE_UPGRADE_QUERY_LENGTH && words.length > 1) {
    words = words.slice(0, -1);
  }

  return words.join(" ");
}

export function buildSourceUpgradeFallbackShoppingQuery(
  product: Pick<ProductRecommendation, "name" | "metadata">,
  category: string,
  primaryQuery = buildSourceUpgradeShoppingQuery(product, category),
) {
  const base = primaryQuery.replace(/\s+/g, " ").trim();
  if (!base) return "";

  const baseWords = new Set(queryWords(base));
  const contextWords = queryWords(category).filter(
    (word) => !GENERIC_PRODUCT_WORDS.has(word) && !baseWords.has(word),
  );

  if (contextWords.length === 0) {
    return "";
  }

  return clampQueryLength(`${base} ${contextWords.join(" ")}`);
}

function safeSameProductCandidateImage(
  product: ProductRecommendation,
  candidate: RawProductCandidate,
  category: string,
) {
  if (!candidate.imageUrl) return "";

  return resolveBestProductImage(
    [
      {
        contextVerified: true,
        evidenceText: evidenceText(candidate),
        source: "serp",
        url: candidate.imageUrl,
      },
    ],
    {
      brand: sourceUpgradeBrand(product),
      category,
      modelNumber: modelTokens(product)[0] || null,
      pageUrl: candidate.productUrl,
      productName: product.name,
    },
  ).url;
}

async function applyCandidateEvidence(
  product: ProductRecommendation,
  fact: MissingFact,
  category: string,
) {
  const candidates = await searchSerperShopping(
    buildRescueShoppingQuery(product, category),
    category,
  );
  let updated = product;
  let metadata: ProductMetadata = updated.metadata || { offers: [] };

  for (const candidate of candidates.slice(0, 6)) {
    if (!looksLikeSameProduct(updated, candidate)) {
      continue;
    }

    if (fact.kind === "price") {
      const price = candidatePriceEvidence(candidate);

      if (price !== null) {
        metadata = mergeOffer(metadata, price, candidate);
        updated = addVerificationCitation(updated, candidate, fact);
        updated = removeVerifiedRubricUnknown(updated, fact);

        if (!updated.product_page_url && candidate.productUrl) {
          updated = {
            ...updated,
            product_page_url: candidate.productUrl,
          };
        }

        const candidateImage = safeSameProductCandidateImage(
          updated,
          candidate,
          category,
        );

        if (!updated.product_image_url && candidateImage) {
          updated = {
            ...updated,
            product_image_url: candidateImage,
          };
        }

        break;
      }
    }

    if (fact.kind === "color") {
      const colors = candidateColorEvidence(candidate, fact);

      if (colors.length > 0) {
        metadata = mergeColors(metadata, colors, candidate.productUrl);
        updated = addVerificationCitation(updated, candidate, fact);
        updated = removeVerifiedRubricUnknown(updated, fact);
        break;
      }
    }

    if (fact.kind === "dimension") {
      const dimensionValue = candidateDimensionEvidence(candidate, fact);

      if (dimensionValue !== null && Number.isFinite(dimensionValue)) {
        metadata = mergeDimension(
          metadata,
          fact.dimension || "width",
          dimensionValue,
          candidate.productUrl,
        );
        updated = addVerificationCitation(updated, candidate, fact);
        updated = removeVerifiedRubricUnknown(updated, fact);
        break;
      }
    }

    if (
      fact.kind === "feature" &&
      featureEvidenceSupports(evidenceText(candidate), fact.value || fact.queryTerm)
    ) {
      updated = addVerificationCitation(updated, candidate, fact);
      updated = addVerifiedFeaturePro(updated, fact);
      updated = removeVerifiedRubricUnknown(updated, fact);
      break;
    }

    if (fact.kind === "spec") {
      const updatedWithSpec = applySpecEvidenceFromText(
        updated,
        fact,
        evidenceText(candidate),
        candidate.productUrl,
        evidenceTitle(candidate),
      );

      if (updatedWithSpec !== updated) {
        updated = removeVerifiedRubricUnknown(updatedWithSpec, fact);
        break;
      }
    }
  }

  return {
    ...updated,
    metadata,
  };
}

async function applyOrganicEvidence(
  product: ProductRecommendation,
  fact: MissingFact,
  query: string,
) {
  if (fact.kind === "price") {
    return product;
  }

  const sources = await searchSerperOrganicEvidence(query, 4);
  let updated = product;

  for (const source of sources) {
    if (
      !sourceTrustedForRequirementVerification(source.url) ||
      !looksLikeSameProduct(updated, source) ||
      !sourceSupportsFact(source, fact)
    ) {
      continue;
    }

    updated = addVerificationCitation(updated, source, fact);

    if (fact.kind === "color") {
      updated = {
        ...updated,
        metadata: mergeColors(
          updated.metadata || { offers: [] },
          [fact.value || fact.queryTerm],
          source.url,
        ),
      };
      updated = removeVerifiedRubricUnknown(updated, fact);
    }

    if (fact.kind === "dimension") {
      const dimensionValue = extractDimensionFromText(
        evidenceText(source),
        fact.dimension || "width",
      );

      if (dimensionValue !== null && Number.isFinite(dimensionValue)) {
        updated = {
          ...updated,
          metadata: mergeDimension(
            updated.metadata || { offers: [] },
            fact.dimension || "width",
            dimensionValue,
            source.url,
          ),
        };
        updated = removeVerifiedRubricUnknown(updated, fact);
      }
    }

    if (fact.kind === "feature") {
      updated = addVerifiedFeaturePro(updated, fact);
      updated = removeVerifiedRubricUnknown(updated, fact);
    }

    if (fact.kind === "spec") {
      const updatedWithSpec = applySpecEvidenceFromText(
        updated,
        fact,
        evidenceText(source),
        source.url,
        source.title,
      );

      if (updatedWithSpec !== updated) {
        updated = removeVerifiedRubricUnknown(updatedWithSpec, fact);
      }
    }

    break;
  }

  return updated;
}

function rubricUnknownFacts(product: ProductRecommendation) {
  return (product.evidenceBucket?.unknowns || [])
    .filter((item) => isRubricFactUnknownTopic(item.topic))
    .map((item) => {
      const label = rubricFactFromUnknownTopic(item.topic);
      const importance =
        item.importance || classifyRubricFactImportance(label).importance;

      return {
        fact: {
          ...missingFactFromLabel(label),
          label,
          rubricUnknownTopic: item.topic,
        },
        importance,
      };
    })
    .filter((item) => item.importance !== "minor")
    .sort((a, b) => {
      const importance =
        rubricImportanceRank(b.importance) - rubricImportanceRank(a.importance);

      return importance || a.fact.label.localeCompare(b.fact.label);
    })
    .map((item) => item.fact);
}

async function rescueProduct(
  product: ProductRecommendation,
  requirements: RecommendationApiRequest,
  options: VerificationOptions,
) {
  const validation = validateProductAgainstRequirements(product, {
    avoid: requirements.avoid,
    budget: requirements.budget,
    category: baseProductCategoryFromQuery(requirements.query),
    extractedRequirements: requirements.extractedRequirements,
    priorities: requirements.priorities,
    selectedFeatures: requirements.selectedFeatures,
  });
  const rubricFactsToVerify = rubricUnknownFacts(product);

  if (validation.unknownRequirements.length === 0 && rubricFactsToVerify.length === 0) {
    const unverifedPriceFailures = validation.missingRequirements.filter(
      (label) =>
        missingFactFromLabel(label).kind === "price" && !hasVerifiedPrice(product),
    );

    if (unverifedPriceFailures.length === 0) {
      return product;
    }
  }

  const category = baseProductCategoryFromQuery(requirements.query);
  const maxFacts = options.maxFactsPerProduct ?? MAX_FACTS_PER_PRODUCT;
  const unverifiedPriceFailures = validation.missingRequirements.filter(
    (label) =>
      missingFactFromLabel(label).kind === "price" && !hasVerifiedPrice(product),
  );
  const labelsToVerify = Array.from(
    new Set([...validation.unknownRequirements, ...unverifiedPriceFailures]),
  );
  const requirementQueries = buildVerificationQueries(
    product,
    labelsToVerify.slice(0, maxFacts),
    category,
    maxFacts,
  );
  const rubricQueries = rubricFactsToVerify
    .slice(0, Math.max(0, maxFacts - requirementQueries.length))
    .map((fact) => ({
      fact,
      query: `${product.name} ${fact.queryTerm} ${category}`
        .replace(/\s+/g, " ")
        .trim(),
    }));
  let updated = product;

  for (const { fact, query } of [...requirementQueries, ...rubricQueries]) {
    if (fact.kind === "spec" && !specSearchEnabled()) {
      continue;
    }

    updated = await applyCandidateEvidence(updated, fact, category);
    updated = await applyOrganicEvidence(updated, fact, query);
  }

  return updated;
}

function replaceProductsByName(
  products: ProductRecommendation[],
  replacements: Map<string, ProductRecommendation>,
) {
  return products.map((product) => replacements.get(product.name) || product);
}

function productReplacementKey(product: ProductRecommendation) {
  return `${product.name}|${product.product_page_url}`;
}

function productsNeedingVerification(result: RecommendationResult) {
  const seen = new Set<string>();
  const candidates = [
    ...result.nearMatches,
    ...(result.premiumAboveBudget || []),
    ...result.recommendations,
    ...result.exactMatches,
  ];

  return candidates.filter((product) => {
    const key = productReplacementKey(product);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// ── Phase 3E: Source-quality upgrade ─────────────────────────────────────────
// A light second-pass that runs AFTER the requirement rescue and revalidation,
// but BEFORE final scoring. It targets candidates that:
//   1. Have a model-number token in their name/metadata (strong product identity)
//   2. Pass all hard requirements (requirementCheck.failed is empty)
//   3. Are missing at least two evidence pillars: verified price, owner rating,
//      or identity-safe product-specific commerce evidence
//
// For each qualifying candidate (capped at MAX_SOURCE_UPGRADE_CANDIDATES) a
// primary shopping search, plus at most one bounded fallback, finds the same
// product on a retailer or editorial page and merges newly-found price, rating,
// review-count, and citation data before scoring runs.
//
// Safety invariants (never violated):
//   - Identity gate: looksLikeSameProduct must pass before any evidence is merged
//   - Failed-requirement candidates are never touched
//   - mergeOffer is reused as-is: adds an offer only when no price exists yet
//   - No budget or eligibility rules are changed
//   - The candidate set (names / product types) is unchanged: upgrade is metadata-only

const MAX_SOURCE_UPGRADE_CANDIDATES = 3;

export type SourceUpgradeCandidateSample = {
  stage?: "fallback" | "primary";
  name: string;
  host: string;
  price: number | null;
  rating: number | null;
  identityMatch: boolean;
  rejectionReason: "identity_mismatch" | "no_attachable_fields" | null;
};

export type SourceUpgradeEvidencePillar =
  | "owner_rating"
  | "product_specific_commerce_evidence"
  | "verified_price";

export type SourceUpgradeDecision = {
  missingEvidence: SourceUpgradeEvidencePillar[];
  modelTokens: string[];
  name: string;
  reason:
    | "candidate_cap"
    | "failed_requirements"
    | "selected_for_upgrade"
    | "sufficient_evidence"
    | "weak_identity";
  selected: boolean;
  shouldUpgrade: boolean;
};

type SourceUpgradeSearchOutcome =
  | "evidence_attached"
  | "identity_rejected"
  | "no_attachable_fields"
  | "shopping_results_empty";

export type SourceUpgradeTrace = {
  name: string;
  originalProductName: string;
  cleanedProductName: string;
  metadataBrand: string | null;
  detectedBrand: string | null;
  detectedModelTokens: string[];
  modelIdentityPhrase: string;
  selectedIdentityPhrase: string;
  categoryContext: string;
  query: string;
  primaryQuery: string;
  triggerReason: "missing_multiple_evidence_pillars";
  missingEvidence: SourceUpgradeEvidencePillar[];
  fallbackQuery?: string;
  fallbackReason?: "primary_empty" | "primary_identity_rejected";
  fallbackUsed: boolean;
  primaryOutcome?: SourceUpgradeSearchOutcome;
  fallbackOutcome?: SourceUpgradeSearchOutcome;
  evidenceAttached: boolean;
  attachedFields: string[];
  primaryCandidatesReturned: number;
  fallbackCandidatesReturned: number;
  candidatesReturned: number;
  candidatesEvaluated: number;
  attachableCandidates: number;
  primarySearchDiagnostics?: SerperShoppingSearchDiagnostics;
  fallbackSearchDiagnostics?: SerperShoppingSearchDiagnostics;
  noMatchReason?: "shopping_results_empty" | "identity_rejected" | "no_attachable_fields";
  candidateSample: SourceUpgradeCandidateSample[];
};

type SourceUpgradeOutcome<T> = {
  result: T;
  sourceUpgradeDecisions: SourceUpgradeDecision[];
  sourceUpgradeTraces: SourceUpgradeTrace[];
};

// Returns true when a product already has a useful independent commerce source —
// a tier-1 editorial citation or a tier-2 marketplace/retailer citation that is
// not the product's own page. Same-brand subdomains (store.ridgid.com vs
// ridgid.com) and manufacturer sites on different domains (makitatools.com when
// the product page is on amazon.com) are tier-3 and therefore do NOT count as
// useful commerce evidence.
function hasUsefulCommerceEvidence(product: ProductRecommendation): boolean {
  const productHost = sourceHost(product.product_page_url);
  return (product.citations || []).some((c) => {
    const host = sourceHost(c.url || "");
    if (!host || host === productHost) return false;
    const tier = sourceTier(host);
    if (tier !== 1 && tier !== 2) return false;

    return (
      classifyProductEvidenceIdentity({
        category: product.category,
        productName: product.name,
        sourceTitle: c.title,
        url: c.url,
      }) === "same_product"
    );
  });
}

function sourceUpgradeDecision(product: ProductRecommendation): SourceUpgradeDecision {
  const detectedModelTokens = modelTokens(product);
  const missingEvidence: SourceUpgradeEvidencePillar[] = [];

  if (!hasVerifiedPrice(product)) {
    missingEvidence.push("verified_price");
  }
  if (!product.metadata?.rating?.value) {
    missingEvidence.push("owner_rating");
  }
  if (!hasUsefulCommerceEvidence(product)) {
    missingEvidence.push("product_specific_commerce_evidence");
  }

  if ((product.requirementCheck?.failed?.length ?? 0) > 0) {
    return {
      missingEvidence,
      modelTokens: detectedModelTokens,
      name: product.name,
      reason: "failed_requirements",
      selected: false,
      shouldUpgrade: false,
    };
  }

  if (detectedModelTokens.length === 0) {
    return {
      missingEvidence,
      modelTokens: detectedModelTokens,
      name: product.name,
      reason: "weak_identity",
      selected: false,
      shouldUpgrade: false,
    };
  }

  const shouldUpgrade = missingEvidence.length >= 2;
  return {
    missingEvidence,
    modelTokens: detectedModelTokens,
    name: product.name,
    reason: shouldUpgrade ? "selected_for_upgrade" : "sufficient_evidence",
    selected: false,
    shouldUpgrade,
  };
}

export function needsSourceUpgrade(product: ProductRecommendation) {
  return sourceUpgradeDecision(product).shouldUpgrade;
}

function mergeRatingData(
  metadata: ProductMetadata,
  candidate: RawProductCandidate,
): ProductMetadata {
  const hasRating = Boolean(metadata.rating?.value);
  const hasReviewCount = Boolean(metadata.reviewCount?.value);

  if (
    (hasRating || candidate.rating === null) &&
    (hasReviewCount || candidate.reviewCount === null)
  ) {
    return metadata;
  }

  return {
    ...metadata,
    ...(!hasRating && candidate.rating !== null
      ? { rating: field(candidate.rating, candidate.productUrl, "serper", "Medium") }
      : {}),
    ...(!hasReviewCount && candidate.reviewCount !== null
      ? { reviewCount: field(candidate.reviewCount, candidate.productUrl, "serper", "Medium") }
      : {}),
  };
}

type SourceUpgradeSearchFn = (
  query: string,
  category: string,
) => Promise<RawProductCandidate[] | SerperShoppingSearchResult>;

function sourceUpgradeSearchResult(
  result: RawProductCandidate[] | SerperShoppingSearchResult,
) {
  return Array.isArray(result)
    ? { candidates: result, diagnostics: undefined }
    : result;
}

async function upgradeProductSource(
  product: ProductRecommendation,
  category: string,
  searchFn: SourceUpgradeSearchFn,
  decision: SourceUpgradeDecision,
): Promise<{ product: ProductRecommendation; trace: SourceUpgradeTrace }> {
  const cleanedProductName = stripRetailDisplayFiller(product.name);
  const detectedBrand = sourceUpgradeBrand(product);
  const modelIdentityPhrase = buildModelIdentityQuery(
    product.name,
    detectedBrand,
  );
  const query = buildSourceUpgradeShoppingQuery(product, category);
  const fallbackQuery = buildSourceUpgradeFallbackShoppingQuery(product, category, query);
  const metadataBrand = product.metadata?.brand?.value || null;
  const trace: SourceUpgradeTrace = {
    name: product.name,
    originalProductName: product.name,
    cleanedProductName,
    metadataBrand,
    detectedBrand,
    detectedModelTokens: modelTokens(product),
    modelIdentityPhrase,
    selectedIdentityPhrase: query,
    categoryContext: category,
    query,
    primaryQuery: query,
    triggerReason: "missing_multiple_evidence_pillars",
    missingEvidence: decision.missingEvidence,
    fallbackUsed: false,
    evidenceAttached: false,
    attachedFields: [],
    primaryCandidatesReturned: 0,
    fallbackCandidatesReturned: 0,
    candidatesReturned: 0,
    candidatesEvaluated: 0,
    attachableCandidates: 0,
    candidateSample: [],
  };

  let updated = product;
  let metadata = updated.metadata || { offers: [] };
  let anyIdentityMatch = false;
  const sampleEntries: SourceUpgradeCandidateSample[] = [];

  const evaluateCandidates = (
    candidates: RawProductCandidate[],
    stage: "fallback" | "primary",
  ): SourceUpgradeSearchOutcome => {
    if (candidates.length === 0) {
      return "shopping_results_empty";
    }

    let stageIdentityMatch = false;

    for (const candidate of candidates.slice(0, 6)) {
      const identityMatch = looksLikeSameProduct(updated, candidate, category);
      const candidatePrice = candidatePriceEvidence(candidate);

      let sampleEntry: SourceUpgradeCandidateSample | null = null;
      if (sampleEntries.length < 5) {
        sampleEntry = {
          stage,
          name: (candidate.name || "").slice(0, 80),
          host: sourceHost(candidate.productUrl || ""),
          price: candidatePrice,
          rating: candidate.rating ?? null,
          identityMatch,
          rejectionReason: identityMatch ? "no_attachable_fields" : "identity_mismatch",
        };
        sampleEntries.push(sampleEntry);
      }

      if (!identityMatch) continue;

      stageIdentityMatch = true;
      anyIdentityMatch = true;
      trace.candidatesEvaluated++;

      let attached = false;

      if (candidatePrice !== null && !hasVerifiedPrice(updated)) {
        metadata = mergeOffer(metadata, candidatePrice, candidate);
        trace.attachedFields.push("price");
        attached = true;
      }

      const hasRatingBefore = Boolean(metadata.rating?.value);
      const hasReviewCountBefore = Boolean(metadata.reviewCount?.value);
      metadata = mergeRatingData(metadata, candidate);
      if (!hasRatingBefore && Boolean(metadata.rating?.value)) {
        trace.attachedFields.push("rating");
        attached = true;
      }
      if (!hasReviewCountBefore && Boolean(metadata.reviewCount?.value)) {
        trace.attachedFields.push("reviewCount");
        attached = true;
      }

      const syntheticFact: MissingFact = {
        kind: "price",
        label: "Source upgrade",
        queryTerm: "",
      };
      const withCitation = addVerificationCitation(updated, candidate, syntheticFact);
      if (withCitation !== updated) {
        updated = withCitation;
        trace.attachedFields.push("citation");
        attached = true;
      }

      const candidateImage = safeSameProductCandidateImage(
        updated,
        candidate,
        category,
      );
      if (!updated.product_image_url && candidateImage) {
        updated = { ...updated, product_image_url: candidateImage };
        trace.attachedFields.push("image");
        attached = true;
      }

      if (attached) {
        if (sampleEntry) sampleEntry.rejectionReason = null;
        trace.attachableCandidates++;
        trace.evidenceAttached = true;
        return "evidence_attached";
      }
    }

    return stageIdentityMatch ? "no_attachable_fields" : "identity_rejected";
  };

  const primaryResult = sourceUpgradeSearchResult(await searchFn(query, category));
  trace.primarySearchDiagnostics = primaryResult.diagnostics;
  trace.primaryCandidatesReturned = primaryResult.candidates.length;
  trace.primaryOutcome = evaluateCandidates(primaryResult.candidates, "primary");

  const fallbackReason =
    trace.primaryOutcome === "shopping_results_empty"
      ? "primary_empty"
      : trace.primaryOutcome === "identity_rejected"
        ? "primary_identity_rejected"
        : undefined;

  if (
    !trace.evidenceAttached &&
    fallbackReason &&
    fallbackQuery &&
    fallbackQuery !== query
  ) {
    trace.fallbackQuery = fallbackQuery;
    trace.fallbackReason = fallbackReason;
    trace.fallbackUsed = true;
    const fallbackResult = sourceUpgradeSearchResult(
      await searchFn(fallbackQuery, category),
    );
    trace.fallbackSearchDiagnostics = fallbackResult.diagnostics;
    trace.fallbackCandidatesReturned = fallbackResult.candidates.length;
    trace.fallbackOutcome = evaluateCandidates(
      fallbackResult.candidates,
      "fallback",
    );
  }

  trace.candidatesReturned =
    trace.primaryCandidatesReturned + trace.fallbackCandidatesReturned;

  trace.candidateSample = sampleEntries;
  if (!trace.evidenceAttached) {
    trace.noMatchReason =
      trace.candidatesReturned === 0
        ? "shopping_results_empty"
        : anyIdentityMatch
          ? "no_attachable_fields"
          : "identity_rejected";
  }

  return { product: { ...updated, metadata }, trace };
}

export async function upgradeWeakSourceEvidence<T extends RecommendationResult>(
  result: T,
  requirements: RecommendationApiRequest,
  options: {
    concurrency?: number;
    searchFn?: SourceUpgradeSearchFn;
  } = {},
): Promise<SourceUpgradeOutcome<T>> {
  const category = baseProductCategoryFromQuery(requirements.query);
  const searchFn =
    options.searchFn ??
    ((query, searchCategory) =>
      searchSerperShoppingWithDiagnostics(query, searchCategory, {
        allowGoogleShoppingOfferEvidence: true,
      }));

  const seen = new Set<string>();
  const allCandidates = [
    ...result.recommendations,
    ...result.exactMatches,
    ...result.nearMatches,
    ...(result.premiumAboveBudget || []),
  ];
  const uniqueCandidates = allCandidates.filter((p) => {
    const key = productReplacementKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const evaluatedCandidates = uniqueCandidates.map((product, index) => ({
    decision: sourceUpgradeDecision(product),
    index,
    product,
  }));
  const selectedCandidates = evaluatedCandidates
    .filter(({ decision }) => decision.shouldUpgrade)
    .sort(
      (first, second) =>
        second.decision.missingEvidence.length -
          first.decision.missingEvidence.length ||
        first.index - second.index,
    )
    .slice(0, MAX_SOURCE_UPGRADE_CANDIDATES);
  const selectedIndexes = new Set(
    selectedCandidates.map(({ index }) => index),
  );
  const sourceUpgradeDecisions = evaluatedCandidates.map(
    ({ decision, index }) => {
      if (selectedIndexes.has(index)) {
        return {
          ...decision,
          reason: "selected_for_upgrade" as const,
          selected: true,
        };
      }

      if (decision.shouldUpgrade) {
        return {
          ...decision,
          reason: "candidate_cap" as const,
          selected: false,
        };
      }

      return decision;
    },
  );
  const upgradeTargets = selectedCandidates.map(({ product }) => product);

  if (upgradeTargets.length === 0) {
    return { result, sourceUpgradeDecisions, sourceUpgradeTraces: [] };
  }

  const upgrades = await mapWithConcurrency(
    selectedCandidates,
    options.concurrency ?? 1,
    ({ decision, product }) =>
      upgradeProductSource(product, category, searchFn, decision),
  );

  const replacements = new Map<string, ProductRecommendation>();
  const sourceUpgradeTraces: SourceUpgradeTrace[] = [];

  for (const [index, product] of upgradeTargets.entries()) {
    const { product: upgraded, trace } = upgrades[index];
    sourceUpgradeTraces.push(trace);
    if (trace.evidenceAttached) {
      replacements.set(product.name, upgraded);
    }
  }

  if (replacements.size === 0) {
    return { result, sourceUpgradeDecisions, sourceUpgradeTraces };
  }

  return {
    result: {
      ...result,
      recommendations: replaceProductsByName(result.recommendations, replacements),
      exactMatches: replaceProductsByName(result.exactMatches, replacements),
      nearMatches: replaceProductsByName(result.nearMatches, replacements),
      premiumAboveBudget: result.premiumAboveBudget
        ? replaceProductsByName(result.premiumAboveBudget, replacements)
        : undefined,
    },
    sourceUpgradeDecisions,
    sourceUpgradeTraces,
  };
}

export async function verifyMissingRequirementEvidence<T extends RecommendationResult>(
  result: T,
  requirements: RecommendationApiRequest,
  options: VerificationOptions = {},
): Promise<T> {
  const maxProducts = options.maxProducts ?? MAX_PRODUCTS_TO_VERIFY;
  const productsToVerify = productsNeedingVerification(result).slice(0, maxProducts);
  const rescuedProducts = await mapWithConcurrency(
    productsToVerify,
    options.concurrency ?? 1,
    (product) => rescueProduct(product, requirements, options),
  );
  const replacements = new Map<string, ProductRecommendation>();

  for (const [index, product] of productsToVerify.entries()) {
    const rescued = rescuedProducts[index];

    if (rescued !== product) {
      replacements.set(product.name, rescued);
    }
  }

  if (replacements.size === 0) {
    return result;
  }

  return {
    ...result,
    exactMatches: replaceProductsByName(result.exactMatches, replacements),
    nearMatches: replaceProductsByName(result.nearMatches, replacements),
    premiumAboveBudget: result.premiumAboveBudget
      ? replaceProductsByName(result.premiumAboveBudget, replacements)
      : undefined,
    recommendations: replaceProductsByName(result.recommendations, replacements),
  };
}

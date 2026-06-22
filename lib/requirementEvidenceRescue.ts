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
  type SerperEvidenceSource,
} from "./search/serper.ts";
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

function modelTokens(product: ProductRecommendation) {
  const metadataTokens = [
    product.metadata?.modelNumber?.value || "",
    product.metadata?.sku?.value || "",
    product.metadata?.gtin?.value || "",
  ];
  const nameTokens =
    product.name.match(/\b[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*\b/g) || [];

  return [...metadataTokens, ...nameTokens]
    .map((token) => normalizeText(token).replace(/\s+/g, ""))
    .filter((token) => token.length >= 4);
}

function evidenceText(candidate: RawProductCandidate | SerperEvidenceSource) {
  if ("evidenceSources" in candidate) {
    return normalizeText(
      [
        candidate.name,
        candidate.brand || "",
        candidate.category,
        candidate.retailer || "",
        candidate.availableColors.join(" "),
        candidate.keySpecs.join(" "),
        ...candidate.evidenceSources.flatMap((source) => [
          source.title,
          source.snippet,
          source.url,
        ]),
      ].join(" "),
    );
  }

  return normalizeText([candidate.title, candidate.snippet, candidate.url].join(" "));
}

function evidenceUrl(candidate: RawProductCandidate | SerperEvidenceSource) {
  return "productUrl" in candidate ? candidate.productUrl : candidate.url;
}

function evidenceTitle(candidate: RawProductCandidate | SerperEvidenceSource) {
  return "name" in candidate ? candidate.name : candidate.title;
}

function looksLikeSameProduct(
  product: ProductRecommendation,
  candidate: RawProductCandidate | SerperEvidenceSource,
) {
  const text = evidenceText(candidate);
  const normalizedEvidence = text.replace(/\s+/g, "");

  if (modelTokens(product).some((model) => normalizedEvidence.includes(model))) {
    return true;
  }

  const productTokens = significantTokens(
    [
      product.name,
      product.metadata?.brand?.value || "",
      product.metadata?.title?.value || "",
    ].join(" "),
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

        if (!updated.product_image_url && candidate.imageUrl) {
          updated = {
            ...updated,
            product_image_url: candidate.imageUrl,
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

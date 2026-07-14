import {
  ensureFinalAdviceUsesDisplayedProducts,
  reconcileBudgetCopyForValidation,
  validateProductAgainstRequirements,
} from "./requirementValidation.ts";
import { candidateMatchesDiscoveryTarget } from "./discoveryStrategy.ts";
import {
  areSameExactModelProduct,
  getCanonicalIdentity,
  withCanonicalIdentity,
} from "./productIdentity.ts";
import {
  modelFamilyKey,
  variantFamilyKey,
} from "./productVariantFamily.ts";
import { offFormFactorModifiers } from "./formFactor.ts";
import type {
  FinalSelectionCandidateStream,
  FinalSelectionDecisionReason,
  FinalSelectionTraceEntry,
} from "./recommendationFunnel.ts";
import { computeCategoryFit } from "./categoryScoring.ts";
import { computeRubricFit } from "./buyingRubric.ts";
import {
  assessProductCredibility,
  credibilityTierRank,
} from "./productCredibility.ts";
import {
  formatDollars,
  parseMaxBudgetAmount,
} from "./priceParsing.ts";
import { productRecommendationEligibility } from "./productEligibility.ts";
import { classifyProductEvidenceIdentity } from "./productEvidenceIdentity.ts";
import { assessProductPriceTrust } from "./productPriceTrust.ts";
import { assessProductReliability } from "./productReliability.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import {
  classifyRubricFactImportance,
  isRubricFactUnknownTopic,
  rubricFactFromUnknownTopic,
} from "./rubricFactImportance.ts";
import type {
  ProductCredibilityTier,
  ProductRecommendation,
  RecommendationApiRequest,
  RecommendationResult,
  ScoreBreakdown,
  SearchCoverage,
} from "@/types/review-radar";

const MAX_EXACT_MATCHES = 7;
const MAX_NEAR_MATCHES = 5;
const MODEL_FAMILY_REPEAT_PENALTY = 12;
const MODEL_FAMILY_REPEAT_PENALTY_CAP = 24;
const OFF_FORM_FACTOR_PENALTY = 50;
const OFF_FORM_FACTOR_PENALTY_CAP = 50;
const broadRetailerDomains = [
  "amazon.com",
  "costco.com",
  "ebay.com",
  "target.com",
  "temu.com",
  "walmart.com",
];

function productPrice(product: ProductRecommendation) {
  if (product.priceTrust) {
    return product.priceTrust.canUseForBudget ? product.priceTrust.price : null;
  }

  const trust = assessProductPriceTrust(product);

  return trust.canUseForBudget ? trust.price : null;
}

function budgetAmount(input: RecommendationApiRequest) {
  const structuredBudget = input.extractedRequirements?.budgetRules.find(
    (rule) => rule.operator === "max" && rule.amount !== null,
  )?.amount;

  if (structuredBudget !== undefined) {
    return structuredBudget;
  }

  return (
    parseMaxBudgetAmount(input.budget) ??
    parseMaxBudgetAmount(input.query, { requireDollarSignForRanges: true })
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function consensusScore(value: string) {
  if (value === "Strong") {
    return 16;
  }

  if (value === "Mixed") {
    return 10;
  }

  if (value === "Niche") {
    return 7;
  }

  return 3;
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isBroadRetailerHost(value: string) {
  return broadRetailerDomains.some(
    (domain) => value === domain || value.endsWith(`.${domain}`),
  );
}

function ownerRating(product: ProductRecommendation) {
  return product.metadata?.rating?.value ?? null;
}

function ownerReviewCount(product: ProductRecommendation) {
  return product.metadata?.reviewCount?.value ?? null;
}

function smoothedRating(product: ProductRecommendation) {
  const rating = ownerRating(product);
  const reviews = ownerReviewCount(product) || 0;

  if (rating === null || rating === undefined) {
    return 0;
  }

  const priorRating = 4.0;
  const priorCount = 40;

  return ((rating * reviews) + (priorRating * priorCount)) / (reviews + priorCount);
}

function ownerRatingScore(product: ProductRecommendation) {
  const rating = smoothedRating(product);

  if (rating <= 0) {
    return 0;
  }

  return clamp((rating - 3.2) * 11, 0, 20);
}

function ownerReviewStrengthScore(product: ProductRecommendation) {
  const reviews = ownerReviewCount(product);

  if (!reviews || reviews <= 0) {
    return 0;
  }

  if (reviews < 10) {
    return 2;
  }

  if (reviews < 50) {
    return 5;
  }

  if (reviews < 200) {
    return 9;
  }

  if (reviews < 1000) {
    return 14;
  }

  return clamp(16 + Math.log10(reviews / 1000 + 1) * 3, 16, 20);
}

function ownerOpinionScore(product: ProductRecommendation) {
  const opinion = product.evidenceBucket?.ownerOpinion;

  if (!opinion || opinion.sentiment === "limited") {
    return 0;
  }

  const sourceBonus = Math.min(4, opinion.redditThreadCount);

  if (opinion.sentiment === "positive") {
    return 5 + sourceBonus;
  }

  if (opinion.sentiment === "negative") {
    return -10 - sourceBonus;
  }

  return -2;
}

function broadSearchPopularityMultiplier(input: RecommendationApiRequest) {
  const requirements = input.extractedRequirements;
  const nonBrandHardConstraints = (requirements?.requiredConstraints || []).filter(
    (constraint) => constraint.type !== "budget" && constraint.type !== "brand",
  ).length;
  const sizeConstraintCount = requirements?.sizeConstraints.length || 0;
  const selectedFeatureCount = input.selectedFeatures?.length || 0;

  return nonBrandHardConstraints + sizeConstraintCount + selectedFeatureCount <= 1
    ? 1.25
    : 0.75;
}

function availabilityScore(product: ProductRecommendation) {
  const availability = product.metadata?.offers[0]?.availability.value?.toLowerCase() || "";

  if (!availability) {
    return product.product_page_url ? 7 : 2;
  }

  if (availability.includes("instock") || availability.includes("in stock")) {
    return 10;
  }

  if (availability.includes("outofstock") || availability.includes("out of stock")) {
    return -12;
  }

  return 6;
}

function fitScore(product: ProductRecommendation) {
  const passed = product.requirementCheck?.passed.length || 0;
  const failed = product.requirementCheck?.failed.length || 0;
  const unknown = product.requirementCheck?.unknown.length || 0;
  const exactBonus = product.requirementCheck?.exactMatch ? 8 : 0;

  return clamp(28 + exactBonus + passed * 3 - failed * 22 - unknown * 12, 0, 45);
}

const expertSourcePatterns = [
  /\bbest\b/i,
  /\bbuying guide\b/i,
  /\bexpert\b/i,
  /\bhands[-\s]?on\b/i,
  /\breview\b/i,
  /\btested\b/i,
  /\bwirecutter\b/i,
  /\bconsumer reports\b/i,
  /\brtings\b/i,
  /\btom'?s guide\b/i,
  /\bcnet\b/i,
];

function citationStrengthScoringEnabled() {
  return process.env.REVIEW_RADAR_CITATION_STRENGTH !== "off";
}

function productSpecificCitations(product: ProductRecommendation) {
  const hasTypedCitations = product.citations.some(
    (citation) => citation.citation_type,
  );

  // Older deterministic fixtures predate citation_type. Preserve their
  // historical baseline while production results use the verified type.
  if (!citationStrengthScoringEnabled() || !hasTypedCitations) {
    return product.citations;
  }

  return product.citations.filter(
    (citation) =>
      classifyProductEvidenceIdentity({
        category: product.category,
        productName: product.name,
        sourceTitle: citation.title,
        url: citation.url,
      }) === "same_product",
  );
}

function productSpecificCitationStrengthScore(product: ProductRecommendation) {
  if (!citationStrengthScoringEnabled()) {
    return 0;
  }

  const typedCitations = product.citations.filter(
    (citation) => citation.citation_type,
  );

  if (typedCitations.length === 0) {
    return 0;
  }

  const eligibleCitations = productSpecificCitations(product);
  const hostsByType = (citationType: string) =>
    new Set(
      eligibleCitations
        .filter((citation) => citation.citation_type === citationType)
        .map((citation) => hostname(citation.url))
        .filter(Boolean),
    ).size;
  const independentCount = hostsByType("independent-editorial");
  const retailerCount = hostsByType("retailer-marketplace");

  if (independentCount > 0) {
    return Math.min(
      8,
      6 + Math.max(0, independentCount - 1) * 2 + Math.min(1, retailerCount),
    );
  }

  if (retailerCount > 0) {
    return Math.min(4, 2 + Math.max(0, retailerCount - 1));
  }

  if (
    eligibleCitations.length > 0 &&
    eligibleCitations.every(
      (citation) => citation.citation_type === "product-page-self",
    )
  ) {
    return -2;
  }

  return 0;
}

function expertMentionScore(product: ProductRecommendation) {
  const sourceTexts = [
    ...productSpecificCitations(product).map(
      (citation) =>
        `${citation.title} ${citation.url} ${citation.what_it_supports}`,
    ),
    ...(product.evidenceBucket?.positiveEvidence || []).map(
      (item) => `${item.sourceTitle} ${item.snippet}`,
    ),
    ...(product.evidenceBucket?.negativeEvidence || []).map(
      (item) => `${item.sourceTitle} ${item.snippet}`,
    ),
  ];
  const expertMentions = sourceTexts.filter((text) =>
    expertSourcePatterns.some((pattern) => pattern.test(text)),
  ).length;

  return clamp(expertMentions * 3, 0, 15);
}

function evidenceFieldCount(product: ProductRecommendation) {
  return product.metadata
    ? [
        product.metadata.brand,
        product.metadata.canonicalUrl,
        product.metadata.gtin,
        product.metadata.modelNumber,
        product.metadata.rating,
        product.metadata.reviewCount,
        product.metadata.image,
        product.metadata.title,
      ].filter(Boolean).length
    : 0;
}

function sourceQualityScore(product: ProductRecommendation) {
  const metadataBonus = evidenceFieldCount(product) * 1.2;
  const eligibleCitations = productSpecificCitations(product);
  const citationBonus = Math.min(9, eligibleCitations.length * 2);
  const productHost = hostname(product.product_page_url);
  const citationHosts = eligibleCitations
    .map((citation) => hostname(citation.url))
    .filter(Boolean);
  const hasTypedCitations = product.citations.some(
    (citation) => citation.citation_type,
  );
  const independentCitationCount =
    citationStrengthScoringEnabled() && hasTypedCitations
      ? new Set(
          eligibleCitations
            .filter(
              (citation) =>
                citation.citation_type === "independent-editorial",
            )
            .map((citation) => hostname(citation.url))
            .filter(Boolean),
        ).size
      : citationHosts.filter((host) => !isBroadRetailerHost(host)).length;
  const broadRetailerPenalty =
    productHost && isBroadRetailerHost(productHost)
      ? independentCitationCount > 0
        ? 4
        : 10
      : 0;
  const independentSourceBonus = Math.min(8, independentCitationCount * 2);
  const identityBonus =
    product.canonicalIdentity?.confidence === "High"
      ? 4
      : product.canonicalIdentity?.confidence === "Medium"
        ? 2
        : 0;

  return clamp(
    consensusScore(product.source_consensus) +
      metadataBonus +
      citationBonus +
      independentSourceBonus +
      identityBonus -
      broadRetailerPenalty,
    0,
    30,
  );
}

function evidenceScore(product: ProductRecommendation) {
  return clamp(
    expertMentionScore(product) +
      sourceQualityScore(product) * 0.65 +
      evidenceFieldCount(product),
    0,
    35,
  );
}

function productPopularityScore(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
) {
  const marketConfidence = assessProductCredibility(product, input);
  const strategyTargetBonus = input.discoveryStrategy?.expectedProducts.some(
    (target) =>
      candidateMatchesDiscoveryTarget(
        {
          brand: product.metadata?.brand?.value || null,
          name: [
            product.name,
            product.metadata?.title?.value || "",
            product.product_page_url,
          ].join(" "),
        },
        target,
      ),
  )
    ? 4
    : 0;

  return clamp(
    (marketConfidence.score * 0.22 + strategyTargetBonus) *
      broadSearchPopularityMultiplier(input),
    0,
    24,
  );
}

function qualityScore(product: ProductRecommendation) {
  return clamp(
    ownerRatingScore(product) +
      ownerReviewStrengthScore(product) +
      expertMentionScore(product) * 0.75 +
      sourceQualityScore(product) * 0.5,
    0,
    45,
  );
}

function priceValueScore(product: ProductRecommendation, input: RecommendationApiRequest) {
  const price = productPrice(product);
  const budget = budgetAmount(input);
  const quality = qualityScore(product);

  if (price === null || budget === null) {
    return clamp(quality * 0.35, 4, 14);
  }

  if (price > budget) {
    return clamp(quality * 0.25 - 8, 0, 10);
  }

  const budgetUse = Math.max(0.1, price / budget);
  const affordabilityBonus =
    budgetUse <= 0.45 ? 10 : budgetUse <= 0.75 ? 8 : budgetUse <= 1 ? 5 : 0;
  const qualityForPrice = quality * (budgetUse <= 1 ? 0.45 : 0.25);

  return clamp(qualityForPrice + affordabilityBonus, 0, 30);
}

const complaintPenaltyPatterns: Array<[RegExp, number]> = [
  [/\b(?:ice maker|icemaker).*(?:fail|failure|broken|issue|problem)/i, 12],
  [/\b(?:poor durability|durability|breakage|broke|broken|stopped working)/i, 10],
  [/\b(?:bad battery|poor battery|short battery|battery life)/i, 9],
  [/\b(?:bad assembly|difficult assembly|hard to assemble|assembly problem)/i, 8],
  [/\b(?:noise|noisy|loud)\b/i, 7],
  [/\b(?:leak|leaking|water leak)\b/i, 8],
  [/\b(?:warranty|support|customer service).*(?:complaint|problem|issue|poor|bad)/i, 7],
  [/\b(?:comfort|firm cushion|too firm|uncomfortable)\b/i, 6],
];

function complaintPenalty(product: ProductRecommendation) {
  const repeatedComplaints = product.evidenceBucket?.repeatedComplaints || [];
  const complaintText = [
    ...product.common_complaints,
    ...product.cons,
    ...repeatedComplaints.map(
      (complaint) =>
        `${complaint.complaint} ${complaint.evidenceSnippets.join(" ")}`,
    ),
  ].join(" ");
  const patternPenalty = complaintPenaltyPatterns.reduce(
    (total, [pattern, penalty]) =>
      pattern.test(complaintText) ? total + penalty : total,
    0,
  );
  const repeatedPenalty = repeatedComplaints.reduce((total, complaint) => {
    const severityPenalty =
      complaint.severity === "high" ? 8 : complaint.severity === "medium" ? 5 : 3;

    return total + severityPenalty + Math.min(6, complaint.sourceCount * 2);
  }, 0);
  const complaintCountPenalty = product.common_complaints.length * 2;

  return clamp(patternPenalty + repeatedPenalty + complaintCountPenalty, 0, 35);
}

function missingDataPenalty(product: ProductRecommendation) {
  const missing = [
    productPrice(product) === null,
    ownerRating(product) === null,
    ownerReviewCount(product) === null,
    !product.metadata?.brand?.value,
    !product.metadata?.modelNumber?.value && !product.metadata?.gtin?.value,
    !product.metadata?.canonicalUrl?.value && !product.product_page_url,
    !product.metadata?.offers?.length,
    !product.product_image_url,
  ].filter(Boolean).length;
  const unknownRequired = product.requirementCheck?.unknown.length || 0;
  const softUnknown = product.requirementCheck?.softUnknown?.length || 0;
  const weakIdentity = product.canonicalIdentity?.confidence === "Low" ? 5 : 0;
  const rubricUnknownPenalty = rubricUnknownPenaltyForProduct(product);

  return clamp(
    missing * 2.5 +
      unknownRequired * 8 +
      softUnknown * 4 +
      weakIdentity +
      rubricUnknownPenalty,
    0,
    45,
  );
}

function rubricUnknownPenaltyForProduct(product: ProductRecommendation) {
  const rubricUnknowns =
    product.evidenceBucket?.unknowns.filter((item) =>
      isRubricFactUnknownTopic(item.topic),
    ) || [];
  const weightedPenalty = rubricUnknowns.reduce((total, item) => {
    const verdict = classifyRubricFactImportance(
      rubricFactFromUnknownTopic(item.topic),
    );

    return total + verdict.weight;
  }, 0);

  return Math.min(16, weightedPenalty);
}

export type EvidenceStrength = "strong" | "medium" | "weak";

function distinctCitationHostCount(product: ProductRecommendation) {
  return new Set(
    product.citations.map((citation) => hostname(citation.url)).filter(Boolean),
  ).size;
}

function evidenceSignalCount(product: ProductRecommendation) {
  const eligibleCitations = productSpecificCitations(product);

  return [
    productPrice(product) !== null,
    ownerRating(product) !== null,
    (ownerReviewCount(product) || 0) >= 10,
    eligibleCitations.length >= 2,
    distinctCitationHostCount({
      ...product,
      citations: eligibleCitations,
    }) >= 2,
    Boolean(product.product_image_url),
    Boolean(product.metadata?.brand?.value),
    Boolean(product.metadata?.modelNumber?.value || product.metadata?.gtin?.value),
    expertMentionScore(product) > 0,
    (product.metadata?.offers.length || 0) > 0,
  ].filter(Boolean).length;
}

export function evidenceStrengthForProduct(
  product: ProductRecommendation,
): EvidenceStrength {
  const signals = evidenceSignalCount(product);

  if (signals >= 6) {
    return "strong";
  }

  return signals >= 3 ? "medium" : "weak";
}

// Honest-confidence caps: a product cannot keep a high confidence score when
// the evidence behind it is thin, no matter what the AI claimed.
const CONFIDENCE_CAP_BY_EVIDENCE: Record<EvidenceStrength, number> = {
  medium: 84,
  strong: 100,
  weak: 68,
};

const CONFIDENCE_CAP_BY_MARKET_TIER = {
  moderate: 82,
  strong: 100,
  weak: 62,
} as const;

function withHonestConfidence<T extends ProductRecommendation>(product: T): T {
  const strength = evidenceStrengthForProduct(product);
  const marketConfidence = product.marketConfidence || assessProductCredibility(product);
  const rubricConfidenceCap = rubricUnknownConfidenceCap(product);
  const cap = Math.min(
    CONFIDENCE_CAP_BY_EVIDENCE[strength],
    CONFIDENCE_CAP_BY_MARKET_TIER[marketConfidence.tier],
    rubricConfidenceCap,
  );

  if (
    product.confidence_score <= cap &&
    product.evidence_strength === strength &&
    product.marketConfidence?.tier === marketConfidence.tier
  ) {
    return product;
  }

  return {
    ...product,
    confidence_score: Math.min(product.confidence_score, cap),
    evidence_strength: strength,
    marketConfidence,
  };
}

function rubricUnknownConfidenceCap(product: ProductRecommendation) {
  const rubricUnknowns =
    product.evidenceBucket?.unknowns.filter((item) =>
      isRubricFactUnknownTopic(item.topic),
    ) || [];

  if (!rubricUnknowns.length) {
    return 100;
  }

  return Math.min(
    ...rubricUnknowns.map((item) =>
      classifyRubricFactImportance(rubricFactFromUnknownTopic(item.topic))
        .confidenceCap,
    ),
  );
}

function marketConfidenceTier(product: ProductRecommendation) {
  return (
    product.marketConfidence?.tier ||
    product.scoreBreakdown?.marketConfidenceTier ||
    assessProductCredibility(product).tier
  );
}

function marketConfidencePenalty(product: ProductRecommendation) {
  const tier = marketConfidenceTier(product);

  if (tier === "weak") {
    return 22;
  }

  return tier === "moderate" ? 5 : 0;
}

function scoreDebugReasons(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
  breakdown: Omit<ScoreBreakdown, "totalScore">,
) {
  const price = productPrice(product);
  const budget = budgetAmount(input);
  const rating = ownerRating(product);
  const reviews = ownerReviewCount(product);

  return [
    `Requirement fit ${Math.round(breakdown.requirementFitScore ?? breakdown.fitScore)} from ${
      product.requirementCheck?.passed.length || 0
    } passed, ${product.requirementCheck?.failed.length || 0} failed, and ${
      product.requirementCheck?.unknown.length || 0
    } unknown requirements.`,
    rating !== null
      ? `Owner rating ${rating} with ${reviews ?? 0} reviews; review-count strength ${
          Math.round(breakdown.ownerReviewStrengthScore || 0)
        } limits low-review products.`
      : "Owner rating was not verified, so owner rating and review strength are limited.",
    `Evidence uses ${product.citations.length} citation(s), ${evidenceFieldCount(
      product,
    )} structured metadata field(s), and ${product.source_consensus} source consensus.`,
    `Product-specific citation-strength adjustment ${Math.round(
      breakdown.citationStrengthScore || 0,
    )}; generic, conflicting, and untyped citation evidence receives no Phase 5G credit.`,
    `Popularity signal ${Math.round(
      breakdown.popularityScore || 0,
    )} from review volume, rating, known-brand evidence, and source visibility.`,
    (breakdown.ownerOpinionScore || 0) !== 0
      ? `Reddit owner-opinion signal ${Math.round(
          breakdown.ownerOpinionScore || 0,
        )}.`
      : "No clear Reddit owner-opinion adjustment was applied.",
    price !== null && budget !== null
      ? `Price ${price.toLocaleString("en-US")} compared with budget ${budget.toLocaleString(
          "en-US",
        )}.`
      : "Price or budget was not fully verified, so price/value confidence is limited.",
    (breakdown.repeatedComplaintPenalty || 0) > 0
      ? `Repeated complaint risk penalty ${Math.round(
          breakdown.repeatedComplaintPenalty || 0,
        )}.`
      : "No repeated complaint penalty was applied.",
    (breakdown.missingDataPenalty || 0) > 0
      ? `Missing data penalty ${Math.round(
          breakdown.missingDataPenalty || 0,
        )} for unverified product facts.`
      : "No meaningful missing-data penalty was applied.",
    (breakdown.rubricFitScore || 0) > 0 || (breakdown.rubricPenalty || 0) > 0
      ? `Buying rubric adjustment: +${Math.round(
          breakdown.rubricFitScore || 0,
        )} for supported category quality signals and -${Math.round(
          breakdown.rubricPenalty || 0,
        )} for missing or negative rubric evidence.`
      : "No buying-rubric adjustment was applied.",
  ];
}

// Category-fit is a small, capped nudge. It is on by default now that the
// profiles/spec dictionary have regression coverage, but can be disabled for
// before/after QA with REVIEW_RADAR_CATEGORY_SCORING=off.
function categoryScoringEnabled() {
  return process.env.REVIEW_RADAR_CATEGORY_SCORING !== "off";
}


function credibilityFloorPenalty(
  tier: ProductCredibilityTier,
  product: ProductRecommendation,
) {
  const base = tier === "weak" ? 18 : tier === "moderate" ? 6 : 0;

  if (base === 0) {
    return 0;
  }

  return evidenceStrengthForProduct(product) === "strong" ? base / 2 : base;
}

export function scoreProduct(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
): ScoreBreakdown {
  const scoredProduct = product.canonicalIdentity
    ? product
    : {
        ...product,
        canonicalIdentity: getCanonicalIdentity(product),
      };
  const marketConfidence = assessProductCredibility(scoredProduct, input);
  const categoryFit = computeCategoryFit(scoredProduct, input);
  const rubricFit = computeRubricFit(scoredProduct, input);
  const credibilityFloor = credibilityFloorPenalty(
    marketConfidence.tier,
    scoredProduct,
  );
  const breakdown = {
    availabilityScore: availabilityScore(scoredProduct),
    categoryFitScore: categoryFit.boost,
    categoryProfileKey: categoryFit.profileKey,
    citationStrengthScore:
      productSpecificCitationStrengthScore(scoredProduct),
    credibilityFloorPenalty: credibilityFloor,
    evidenceScore: evidenceScore(scoredProduct),
    expertMentionScore: expertMentionScore(scoredProduct),
    fitScore: fitScore(scoredProduct),
    marketConfidencePenalty: marketConfidencePenalty({
      ...scoredProduct,
      marketConfidence,
    }),
    marketConfidenceScore: marketConfidence.score,
    marketConfidenceTier: marketConfidence.tier,
    missingDataPenalty: missingDataPenalty(scoredProduct),
    ownerOpinionScore: ownerOpinionScore(scoredProduct),
    ownerRatingScore: ownerRatingScore(scoredProduct),
    ownerReviewStrengthScore: ownerReviewStrengthScore(scoredProduct),
    popularityScore: productPopularityScore(scoredProduct, input),
    priceValueScore: priceValueScore(scoredProduct, input),
    qualityScore: qualityScore(scoredProduct),
    repeatedComplaintPenalty: complaintPenalty(scoredProduct),
    requirementFitScore: fitScore(scoredProduct),
    rubricFitScore: rubricFit.boost,
    rubricPenalty: rubricFit.penalty,
    rubricProfileKey: rubricFit.profileKey,
    sourceQualityScore: sourceQualityScore(scoredProduct),
    valueScore: priceValueScore(scoredProduct, input),
  };
  const totalScore =
    breakdown.requirementFitScore +
    breakdown.ownerRatingScore +
    breakdown.ownerReviewStrengthScore +
    breakdown.ownerOpinionScore +
    breakdown.expertMentionScore +
    breakdown.citationStrengthScore +
    breakdown.sourceQualityScore +
    breakdown.popularityScore +
    breakdown.priceValueScore +
    breakdown.marketConfidenceScore * 0.3 +
    breakdown.availabilityScore +
    (categoryScoringEnabled() ? breakdown.categoryFitScore : 0) -
    (breakdown.rubricPenalty || 0) +
    (breakdown.rubricFitScore || 0) -
    breakdown.repeatedComplaintPenalty -
    breakdown.missingDataPenalty -
    breakdown.marketConfidencePenalty;

  return {
    ...breakdown,
    ...(process.env.NODE_ENV !== "production"
      ? { scoreDebug: scoreDebugReasons(scoredProduct, input, breakdown) }
      : {}),
    totalScore,
  };
}

function withScore(product: ProductRecommendation, input: RecommendationApiRequest) {
  const canonicalProduct = withHonestConfidence(withCanonicalIdentity(product));
  const productEligibility = productRecommendationEligibility(canonicalProduct);
  const priceTrust = assessProductPriceTrust(canonicalProduct);
  const marketConfidence = assessProductCredibility(canonicalProduct, input);
  const productWithMarketConfidence = {
    ...canonicalProduct,
    marketConfidence,
    priceTrust,
    productEligibility,
  };
  const reliabilityCheck = assessProductReliability(productWithMarketConfidence);

  return {
    ...productWithMarketConfidence,
    confidence_score: Math.min(
      canonicalProduct.confidence_score,
      CONFIDENCE_CAP_BY_MARKET_TIER[marketConfidence.tier],
    ),
    reliabilityCheck,
    scoreBreakdown: {
      ...scoreProduct(productWithMarketConfidence, input),
      evidenceSignalCount: evidenceSignalCount(productWithMarketConfidence),
    },
  };
}

function canonicalId(product: ProductRecommendation) {
  return product.canonicalIdentity?.canonicalId || getCanonicalIdentity(product).canonicalId;
}

function rankedMatchScore(product: ProductRecommendation) {
  const breakdown = product.scoreBreakdown;

  if (!breakdown) {
    return 0;
  }

  const evidenceStrengthBonus =
    evidenceStrengthForProduct(product) === "strong"
      ? 10
      : evidenceStrengthForProduct(product) === "medium"
        ? 4
        : -12;
  const marketConfidenceAdjustment =
    marketConfidenceTier(product) === "strong"
      ? 8
      : marketConfidenceTier(product) === "moderate"
        ? 2
        : -18;

  return (
    (breakdown.requirementFitScore || breakdown.fitScore || 0) * 3 +
    (breakdown.qualityScore || 0) * 1.2 +
    (breakdown.priceValueScore || breakdown.valueScore || 0) * 0.9 +
    (breakdown.sourceQualityScore || 0) * 0.75 +
    (breakdown.citationStrengthScore || 0) +
    (breakdown.ownerRatingScore || 0) * 0.65 +
    (breakdown.ownerReviewStrengthScore || 0) * 0.65 +
    (breakdown.ownerOpinionScore || 0) +
    (breakdown.popularityScore || 0) * 0.45 +
    (breakdown.marketConfidenceScore || 0) * 0.25 +
    (breakdown.availabilityScore || 0) * 0.5 +
    (categoryScoringEnabled() ? breakdown.categoryFitScore || 0 : 0) +
    (breakdown.rubricFitScore || 0) * 1.2 -
    (breakdown.rubricPenalty || 0) * 1.2 +
    evidenceStrengthBonus +
    marketConfidenceAdjustment -
    (breakdown.missingDataPenalty || 0) * 0.85 -
    (breakdown.repeatedComplaintPenalty || 0) * 1.1
  );
}

function sortByRankedMatchStrength(products: ProductRecommendation[]) {
  return [...products].sort((first, second) => {
    const firstRequirementScore =
      first.scoreBreakdown?.requirementFitScore || first.scoreBreakdown?.fitScore || 0;
    const secondRequirementScore =
      second.scoreBreakdown?.requirementFitScore || second.scoreBreakdown?.fitScore || 0;
    const requirementDelta = secondRequirementScore - firstRequirementScore;

    if (requirementDelta !== 0) {
      return requirementDelta;
    }

    const scoreDelta = rankedMatchScore(second) - rankedMatchScore(first);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const tierDelta =
      credibilityTierRank(marketConfidenceTier(first)) -
      credibilityTierRank(marketConfidenceTier(second));

    if (tierDelta !== 0) {
      return tierDelta;
    }

    return (second.scoreBreakdown?.totalScore || 0) - (first.scoreBreakdown?.totalScore || 0);
  });
}

function hasMajorUnresolvedDrawback(product: ProductRecommendation) {
  return (product.scoreBreakdown?.repeatedComplaintPenalty || 0) >= 25;
}

function rankReason(product: ProductRecommendation, rank: number, input: RecommendationApiRequest) {
  const breakdown = product.scoreBreakdown;
  const matchedCount = product.requirementCheck?.passed.length || 0;
  const price = productPrice(product);
  const budget = budgetAmount(input);
  const rating = ownerRating(product);
  const reviews = ownerReviewCount(product);
  const evidenceStrength = evidenceStrengthForProduct(product);
  const priceConfidence = product.reliabilityCheck?.priceConfidence;
  const parts = [
    rank === 1
      ? "Highest ranked exact match after checking hard requirements first."
      : "Ranked as an exact match after checking hard requirements first.",
    matchedCount > 0
      ? `Matches ${matchedCount} verified requirement${matchedCount === 1 ? "" : "s"}.`
      : "",
    price !== null && budget !== null
      ? `${priceConfidence === "verified" ? "Verified" : "Usable"} price ${formatDollars(price)} is within the ${formatDollars(budget)} limit.`
      : "",
    reviews
      ? `${reviews.toLocaleString("en-US")} customer review${reviews === 1 ? "" : "s"}${
          rating ? ` with a ${rating} rating` : ""
        } support the credibility signal.`
      : "",
    breakdown && (breakdown.sourceQualityScore || 0) > 0
      ? `${evidenceStrength[0].toUpperCase()}${evidenceStrength.slice(1)} evidence quality from citations, source coverage, and product data.`
      : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function withRank(
  product: ProductRecommendation,
  index: number,
  input: RecommendationApiRequest,
): ProductRecommendation {
  const rank = index + 1;
  const reason = rankReason(product, rank, input);

  return {
    ...product,
    recommendation_type: "Best Match",
    rank,
    rankLabel: `#${rank} Best Match`,
    rankReason: reason,
    matchScore: rankedMatchScore(product),
    credibilityScore: product.marketConfidence?.score,
    slot_reasoning: reason,
    scoreBreakdown: product.scoreBreakdown
      ? {
          ...product.scoreBreakdown,
          scoreDebug: [
            ...(product.scoreBreakdown.scoreDebug || []),
            "Final selection allows repeated retailers and distinct same-brand products; exact-model duplicates collapse, while repeated model families and unrequested niche form factors receive bounded selection-only adjustments.",
          ],
        }
      : product.scoreBreakdown,
  };
}

function withCloseMatch(product: ProductRecommendation): ProductRecommendation {
  const reliabilityWarnings = product.reliabilityCheck?.warnings || [];
  const reliabilityReason = reliabilityWarnings[0];

  return {
    ...product,
    recommendation_type: "Close Match",
    rank: undefined,
    rankLabel: undefined,
    rankReason: undefined,
    matchScore: rankedMatchScore(product),
    credibilityScore: product.marketConfidence?.score,
    near_match_reason:
      product.near_match_reason ||
      reliabilityReason ||
      "Close option, but one required detail could not be verified.",
  };
}

function reliableEnoughForBestMatch(product: ProductRecommendation) {
  if (product.productEligibility?.canRenderAsProductCard === false) {
    return false;
  }

  if (product.reliabilityCheck?.canBeBestMatch === false) {
    return false;
  }

  return true;
}

type ExactSelectionDiagnostic = {
  reason: FinalSelectionDecisionReason;
  collapsedBy: string | null;
  modelFamilyKey: string | null;
  familyRepeatCount: number;
  familyConcentrationPenalty: number;
  formFactorPenalty: number;
  adjustedSelectionScore: number;
  offFormFactorModifiers: string[];
};

type ExactSelectionResult = {
  products: ProductRecommendation[];
  diagnostics: Map<string, ExactSelectionDiagnostic>;
};

type CrossStreamDuplicateDiagnostic = {
  collapsedBy: string;
};

function selectionRequestText(input: RecommendationApiRequest) {
  return [
    input.query,
    ...(input.selectedFeatures || []),
    input.priorities,
  ]
    .filter(Boolean)
    .join(" ");
}

function selectionCandidateText(product: ProductRecommendation) {
  return [
    product.name,
    product.category,
    product.metadata?.title?.value,
    product.best_for,
  ]
    .filter(Boolean)
    .join(" ");
}

function selectionFamilyKeys(
  product: ProductRecommendation,
  requestedText: string,
) {
  return [
    variantFamilyKey(product),
    modelFamilyKey(product, requestedText),
  ].filter((value): value is string => Boolean(value));
}

function selectionAdjustment(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
  familyCounts: Map<string, number>,
) {
  const requestedText = selectionRequestText(input);
  const familyKeys = selectionFamilyKeys(product, requestedText);
  const familyRepeatCount = familyKeys.reduce(
    (highest, key) => Math.max(highest, familyCounts.get(key) || 0),
    0,
  );
  const familyConcentrationPenalty = Math.min(
    MODEL_FAMILY_REPEAT_PENALTY_CAP,
    familyRepeatCount * MODEL_FAMILY_REPEAT_PENALTY,
  );
  const offModifiers = offFormFactorModifiers(
    selectionCandidateText(product),
    requestedText,
  );
  const formFactorPenalty = Math.min(
    OFF_FORM_FACTOR_PENALTY_CAP,
    offModifiers.length * OFF_FORM_FACTOR_PENALTY,
  );

  return {
    modelFamilyKey: modelFamilyKey(product, requestedText),
    familyKeys,
    familyRepeatCount,
    familyConcentrationPenalty,
    formFactorPenalty,
    adjustedSelectionScore:
      rankedMatchScore(product) -
      familyConcentrationPenalty -
      formFactorPenalty,
    offFormFactorModifiers: offModifiers,
  };
}

function requirementFitScore(product: ProductRecommendation) {
  return (
    product.scoreBreakdown?.requirementFitScore ||
    product.scoreBreakdown?.fitScore ||
    0
  );
}

function selectRankedExactMatches(
  products: ProductRecommendation[],
  input: RecommendationApiRequest,
): ExactSelectionResult {
  const sorted = sortByRankedMatchStrength(products);
  const diagnostics = new Map<string, ExactSelectionDiagnostic>();
  const unique: ProductRecommendation[] = [];

  // Exact-model identity is a hard safety invariant. URL variants and retailer
  // listings of the same manufacturer model compete for one slot; similar but
  // explicitly different model/size tokens remain separate candidates.
  for (const product of sorted) {
    const duplicateWinner = unique.find((candidate) =>
      areSameExactModelProduct(candidate, product),
    );

    if (duplicateWinner) {
      const adjustment = selectionAdjustment(product, input, new Map());
      diagnostics.set(product.name, {
        reason: "duplicate_identity_collapsed",
        collapsedBy: duplicateWinner.name,
        ...adjustment,
      });
      continue;
    }

    unique.push(product);
  }

  const selected: ProductRecommendation[] = [];
  const remaining = [...unique];
  const familyCounts = new Map<string, number>();
  const baseOrder = new Map(sorted.map((product, index) => [product.name, index]));

  while (remaining.length > 0 && selected.length < MAX_EXACT_MATCHES) {
    remaining.sort((first, second) => {
      const requirementDelta =
        requirementFitScore(second) - requirementFitScore(first);

      if (requirementDelta !== 0) {
        return requirementDelta;
      }

      const firstAdjustment = selectionAdjustment(first, input, familyCounts);
      const secondAdjustment = selectionAdjustment(second, input, familyCounts);
      const adjustedDelta =
        secondAdjustment.adjustedSelectionScore -
        firstAdjustment.adjustedSelectionScore;

      if (adjustedDelta !== 0) {
        return adjustedDelta;
      }

      const tierDelta =
        credibilityTierRank(marketConfidenceTier(first)) -
        credibilityTierRank(marketConfidenceTier(second));

      if (tierDelta !== 0) {
        return tierDelta;
      }

      return (baseOrder.get(first.name) ?? 0) - (baseOrder.get(second.name) ?? 0);
    });

    const product = remaining.shift();

    if (!product) {
      break;
    }

    const adjustment = selectionAdjustment(product, input, familyCounts);
    selected.push(product);
    diagnostics.set(product.name, {
      reason: "selected",
      collapsedBy: null,
      ...adjustment,
    });

    for (const key of adjustment.familyKeys) {
      familyCounts.set(key, (familyCounts.get(key) || 0) + 1);
    }
  }

  for (const product of remaining) {
    const adjustment = selectionAdjustment(product, input, familyCounts);
    const reason: FinalSelectionDecisionReason =
      adjustment.familyConcentrationPenalty >= adjustment.formFactorPenalty &&
      adjustment.familyConcentrationPenalty > 0
        ? "family_concentration_adjusted"
        : adjustment.formFactorPenalty > 0
          ? "off_form_factor_adjusted"
          : "ranked_below_cutoff";

    diagnostics.set(product.name, {
      reason,
      collapsedBy: null,
      ...adjustment,
    });
  }

  return {
    products: selected.map((product, index) => withRank(product, index, input)),
    diagnostics,
  };
}

function dedupeNearCandidatesAgainstDisplayedExact(
  products: ProductRecommendation[],
  selectedExact: ProductRecommendation[],
) {
  const unique: ProductRecommendation[] = [];
  const diagnostics = new Map<string, CrossStreamDuplicateDiagnostic>();

  // RR-060: exact and near candidates are separate presentation streams, not
  // separate identity domains. Once an exact representation wins, the same
  // enriched manufacturer model cannot consume a near slot; near-vs-near
  // duplicates likewise compete for one slot in their existing ranked order.
  for (const product of products) {
    const duplicateWinner = [...selectedExact, ...unique].find((candidate) =>
      areSameExactModelProduct(candidate, product),
    );

    if (duplicateWinner) {
      diagnostics.set(product.name, { collapsedBy: duplicateWinner.name });
      continue;
    }

    unique.push(product);
  }

  return { diagnostics, products: unique };
}

function canonicalCount(products: ProductRecommendation[]) {
  return new Set(products.map(canonicalId)).size;
}

function selectedExactSummary(exactCount: number, fallback: string) {
  if (exactCount >= MAX_EXACT_MATCHES) {
    return "Showing the top 7 exact Best Matches based on your requirements.";
  }

  if (exactCount > 0) {
    return `Showing ${exactCount} exact ${
      exactCount === 1 ? "match" : "matches"
    }. Your requirements are restrictive, so closest alternatives are shown separately.`;
  }

  return fallback;
}

function applyCurrentRequirementCheck(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
) {
  const validation = validateProductAgainstRequirements(product, {
    avoid: input.avoid,
    budget: input.budget,
    category: baseProductCategoryFromQuery(input.query),
    extractedRequirements: input.extractedRequirements,
    priorities: input.priorities,
    selectedFeatures: input.selectedFeatures,
  });

  const cleanedProduct = reconcileBudgetCopyForValidation(product, validation);

  return {
    ...cleanedProduct,
    requirementCheck: {
      exactMatch: validation.isMatch,
      failed: validation.missingRequirements,
      passed: validation.matchedRequirements,
      unknown: validation.unknownRequirements,
      softUnknown: validation.softUnknownRequirements,
    },
    matchedRequirements: validation.matchedRequirements,
    missingRequirements: [
      ...validation.missingRequirements,
      ...validation.unknownRequirements,
    ],
    unknownRequirements: validation.unknownRequirements,
    requirementComparisons: validation.requirementComparisons,
    disqualifiedReason: validation.disqualifiedReason,
    near_match_reason: validation.disqualifiedReason || undefined,
  };
}

function hasDisqualifyingRequirementFailure(product: ProductRecommendation) {
  const failed = product.requirementCheck?.failed || product.missingRequirements || [];

  return failed.some((requirement) => /^(?:Category|Avoid):/i.test(requirement));
}

// Build a per-candidate trace explaining every selection decision in
// scoreAndSelectRecommendations. Pure debug — reads existing computed values,
// changes nothing, never affects the returned product set or ranking.
function buildFinalSelectionTrace(
  revalidatedCandidates: ProductRecommendation[],
  exactScored: ProductRecommendation[],
  nearCandidatesAll: ProductRecommendation[],   // pre-slice, sorted by totalScore
  nearScored: ProductRecommendation[],           // sliced to 8
  reliabilityNear: ProductRecommendation[],
  selectedExact: ProductRecommendation[],
  selectedNear: ProductRecommendation[],
  input: RecommendationApiRequest,
  exactSelectionDiagnostics: Map<string, ExactSelectionDiagnostic>,
  crossStreamDuplicateDiagnostics: Map<
    string,
    CrossStreamDuplicateDiagnostic
  >,
): FinalSelectionTraceEntry[] {
  const exactScoredNames = new Set(exactScored.map((p) => p.name));
  const nearCandidatesAllNames = new Set(nearCandidatesAll.map((p) => p.name));
  const reliabilityNearNames = new Set(reliabilityNear.map((p) => p.name));
  const selectedExactNames = new Set(selectedExact.map((p) => p.name));
  const selectedNearNames = new Set(selectedNear.map((p) => p.name));
  const exactFull = selectedExact.length >= MAX_EXACT_MATCHES;

  // Build lookup from name → scored product (has scoreBreakdown, priceTrust, etc.)
  const scoredByName = new Map<string, ProductRecommendation>(
    [...exactScored, ...nearCandidatesAll].map((p) => [p.name, p]),
  );

  return revalidatedCandidates.map((rawProduct): FinalSelectionTraceEntry => {
    const name = rawProduct.name || "";
    const scored = scoredByName.get(name);
    const product = scored ?? rawProduct;
    const check = product.requirementCheck;
    const breakdown = product.scoreBreakdown;
    const priceTrust = product.priceTrust;

    // Classify which stream this candidate ended up in.
    let stream: FinalSelectionCandidateStream;
    if (exactScoredNames.has(name)) {
      stream = reliabilityNearNames.has(name) ? "reliabilityNear" : "exactScored";
    } else if (nearCandidatesAllNames.has(name)) {
      stream = "nearScored";
    } else {
      const disqualifying = (check?.failed ?? []).some((r) => /^(?:Category|Avoid):/i.test(r));
      stream = disqualifying ? "disqualified" : "unknown";
    }

    const selected = selectedExactNames.has(name) || selectedNearNames.has(name);
    const selectedExactItem = selectedExact.find((p) => p.name === name);
    const finalRank = selectedExactItem?.rank ?? null;

    const reliableEnoughForExact =
      exactScoredNames.has(name) ? !reliabilityNearNames.has(name) : null;

    // Determine why the candidate was or was not selected.
    let decisionReason: FinalSelectionDecisionReason;
    const crossStreamDuplicate = crossStreamDuplicateDiagnostics.get(name);

    if (selected) {
      decisionReason = "selected";
    } else if (crossStreamDuplicate) {
      decisionReason = "duplicate_identity_collapsed";
    } else if (stream === "exactScored") {
      const selectionDiagnostic = exactSelectionDiagnostics.get(name);
      decisionReason = selectionDiagnostic?.reason ?? "missing_trace_reason";
    } else if (stream === "reliabilityNear") {
      decisionReason = "not_reliable_enough_for_exact";
    } else if (stream === "nearScored") {
      if (exactFull) {
        decisionReason = "near_only_exact_full";
      } else {
        decisionReason = "ranked_below_cutoff";
      }
    } else if (stream === "disqualified") {
      const failed = check?.failed ?? [];
      if (failed.some((r) => /^Category:/i.test(r))) {
        decisionReason = "disqualified_category";
      } else if (failed.some((r) => /^Avoid:/i.test(r))) {
        decisionReason = "disqualified_avoid";
      } else {
        decisionReason = "disqualified_other";
      }
    } else {
      decisionReason = "missing_trace_reason";
    }

    const selectionDiagnostic = exactSelectionDiagnostics.get(name);
    const collapsedBy =
      selectionDiagnostic?.collapsedBy ??
      crossStreamDuplicate?.collapsedBy ??
      null;

    // Citation type breakdown.
    const citTypes = (product.citations ?? []).map(
      (c) => c.citation_type ?? "weak-uncorroborated",
    );
    const independentCitationCount = citTypes.filter(
      (t) => t === "independent-editorial",
    ).length;
    const retailerCitationCount = citTypes.filter(
      (t) => t === "retailer-marketplace",
    ).length;

    const offModifiers =
      selectionDiagnostic?.offFormFactorModifiers ??
      offFormFactorModifiers(
        selectionCandidateText(product),
        selectionRequestText(input),
      );

    return {
      name,
      canonicalId: product.canonicalIdentity?.canonicalId ?? null,
      variantFamilyKey: variantFamilyKey(product),
      modelFamilyKey:
        selectionDiagnostic?.modelFamilyKey ??
        modelFamilyKey(product, selectionRequestText(input)),
      brand: product.metadata?.brand?.value ?? product.canonicalIdentity?.brand ?? null,
      model:
        product.metadata?.modelNumber?.value ??
        product.canonicalIdentity?.modelNumber ??
        null,
      productUrl: product.product_page_url ?? "",
      stream,
      selected,
      finalRank,
      decisionReason,
      collapsedBy,
      reliableEnoughForExact,
      exactMatch: check?.exactMatch ?? false,
      failed: check?.failed ?? [],
      unknown: check?.unknown ?? [],
      passed: check?.passed ?? [],
      rankedMatchScore: breakdown ? Math.round(rankedMatchScore(product) * 10) / 10 : null,
      totalScore: breakdown ? Math.round((breakdown.totalScore ?? 0) * 10) / 10 : null,
      requirementFitScore: breakdown?.requirementFitScore ?? breakdown?.fitScore ?? null,
      sourceQualityScore: breakdown?.sourceQualityScore ?? null,
      citationStrengthScore: breakdown?.citationStrengthScore ?? null,
      priceValueScore: breakdown?.priceValueScore ?? breakdown?.valueScore ?? null,
      missingDataPenalty: breakdown?.missingDataPenalty ?? null,
      marketConfidenceTier: breakdown?.marketConfidenceTier ?? product.marketConfidence?.tier ?? null,
      evidenceStrength: product.evidence_strength ?? null,
      citationCount: (product.citations ?? []).length,
      independentCitationCount,
      retailerCitationCount,
      price: priceTrust?.price ?? null,
      priceTrustStatus: priceTrust?.status ?? null,
      canUseForBudget: priceTrust?.canUseForBudget ?? null,
      offFormFactorModifiers: offModifiers,
      familyRepeatCount: selectionDiagnostic?.familyRepeatCount ?? 0,
      familyConcentrationPenalty:
        selectionDiagnostic?.familyConcentrationPenalty ?? 0,
      formFactorPenalty: selectionDiagnostic?.formFactorPenalty ?? 0,
      adjustedSelectionScore:
        selectionDiagnostic?.adjustedSelectionScore ??
        (breakdown ? Math.round(rankedMatchScore(product) * 10) / 10 : null),
    };
  });
}

type ScoreAndSelectOutput = {
  result: RecommendationResult;
  finalSelectionTrace: FinalSelectionTraceEntry[];
};

function scoreAndSelectImpl(
  result: RecommendationResult,
  input: RecommendationApiRequest,
  coverage: Partial<SearchCoverage>,
): ScoreAndSelectOutput {
  const revalidatedCandidates = [...result.exactMatches, ...result.nearMatches].map(
    (product) => applyCurrentRequirementCheck(product, input),
  );
  const exactScored = revalidatedCandidates
    .filter(
      (product) =>
        product.requirementCheck?.exactMatch === true &&
        product.requirementCheck.failed.length === 0 &&
        product.requirementCheck.unknown.length === 0,
    )
    .map((product) => withScore(product, input));
  // nearCandidatesAll: all candidates that cleared the near filter, sorted by
  // totalScore, before the 8-product slice. Needed for the trace to identify
  // products ranked 9th+ (ranked_below_cutoff in the near pool).
  const nearCandidatesAll = revalidatedCandidates
    .filter(
      (product) =>
        product.requirementCheck?.exactMatch !== true &&
        !hasDisqualifyingRequirementFailure(product),
    )
    .map((product) => withScore(product, input))
    .sort(
      (first, second) =>
        (second.scoreBreakdown?.totalScore || 0) -
        (first.scoreBreakdown?.totalScore || 0),
    );
  const nearScored = nearCandidatesAll.map(withCloseMatch).slice(0, 8);
  const reliableExact = exactScored.filter(reliableEnoughForBestMatch);
  const reliabilityNear = exactScored
    .filter((product) => !reliableEnoughForBestMatch(product))
    .map(withCloseMatch);
  const exactSelection = selectRankedExactMatches(reliableExact, input);
  const selectedExact = exactSelection.products;
  const nearSelection = dedupeNearCandidatesAgainstDisplayedExact(
    [...reliabilityNear, ...nearScored],
    selectedExact,
  );
  const selectedNear =
    selectedExact.length < MAX_EXACT_MATCHES
      ? nearSelection.products.slice(0, MAX_NEAR_MATCHES)
      : [];
  const knownNames = [...exactScored, ...nearScored].map((product) => product.name);
  const selectedResult = ensureFinalAdviceUsesDisplayedProducts(
    {
      ...result,
      exactMatches: selectedExact,
      premiumAboveBudget: [],
      nearMatches: selectedNear,
      recommendations: selectedExact,
      search_summary: selectedExactSummary(
        selectedExact.length,
        result.search_summary,
      ),
      searchCoverage: {
        canonicalProductCount: canonicalCount([
          ...exactScored,
          ...nearScored,
        ]),
        enrichedProductCount: [...exactScored, ...nearScored].filter(
          (product) => product.metadata,
        ).length,
        exactMatchCount: selectedExact.length,
        executedQueryCount: coverage.executedQueryCount ?? 0,
        generatedQueryCount:
          coverage.generatedQueryCount ?? result.generated_queries?.length ?? 0,
        nearMatchCount: selectedNear.length,
        rawCandidateCount:
          coverage.rawCandidateCount ?? result.raw_candidate_count ?? 0,
        sourceTimeouts: coverage.sourceTimeouts ?? 0,
        stageCounts: coverage.stageCounts ?? {
          pass1: 0,
          pass2: 0,
          pass3: 0,
        },
      },
    },
    knownNames,
  );

  const finalSelectionTrace = buildFinalSelectionTrace(
    revalidatedCandidates,
    exactScored,
    nearCandidatesAll,
    nearScored,
    reliabilityNear,
    selectedExact,
    selectedNear,
    input,
    exactSelection.diagnostics,
    nearSelection.diagnostics,
  );

  return { result: selectedResult, finalSelectionTrace };
}

export function scoreAndSelectRecommendations(
  result: RecommendationResult,
  input: RecommendationApiRequest,
  coverage: Partial<SearchCoverage> = {},
): RecommendationResult {
  return scoreAndSelectImpl(result, input, coverage).result;
}

export function scoreAndSelectRecommendationsWithTrace(
  result: RecommendationResult,
  input: RecommendationApiRequest,
  coverage: Partial<SearchCoverage> = {},
): ScoreAndSelectOutput {
  return scoreAndSelectImpl(result, input, coverage);
}

export const recommendationScoringTestExports = {
  credibilityFloorPenalty,
  evidenceSignalCount,
  evidenceStrengthForProduct,
  hasMajorUnresolvedDrawback,
  productSpecificCitationStrengthScore,
  rankedMatchScore,
  marketConfidenceTier,
  productPrice,
  scoreProduct,
};

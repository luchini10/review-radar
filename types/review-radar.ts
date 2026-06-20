import type { SelectedSmartFeature } from "@/types/smart-features";

export type SearchRequest = {
  category: string;
  budget: string;
  priorities: string;
  selectedFeatures: SelectedSmartFeature[];
};

export type RecommendationApiRequest = {
  query: string;
  budget?: string;
  priorities?: string;
  avoid?: string;
  selectedFeatures?: SelectedSmartFeature[];
  extractedRequirements?: StructuredRequirements;
  discoveryStrategy?: ProductDiscoveryStrategy;
  discoveryGapCheck?: ProductDiscoveryGapCheck;
};

export type RecommendationApiResponse =
  | {
      result: RecommendationResult;
    }
  | {
      error: string;
    };

export type RecommendationType =
  | "Best Match"
  | "Close Match";

export type SourceConsensus = "Strong" | "Mixed" | "Weak" | "Niche";

export type Citation = {
  title: string;
  url: string;
  what_it_supports: string;
};

export type RequirementCheck = {
  exactMatch: boolean;
  passed: string[];
  failed: string[];
  unknown: string[];
  // Non-gating: soft-spec misses that lower confidence but never eliminate.
  softUnknown?: string[];
  notApplicable?: string[];
};

export type RequirementComparison = {
  required: string;
  productHas: string;
  status: "failed" | "unknown" | "matched" | "violated" | "missing_evidence" | "not_applicable";
};

export type StructuredConstraintType =
  | "brand"
  | "budget"
  | "color"
  | "compatibility"
  | "dealbreaker"
  | "feature"
  | "material"
  | "quality"
  | "size"
  | "use_case";

export type StructuredConstraintStrictness = "hard" | "soft" | "dealbreaker";

export type StructuredConstraintMatchingMode =
  | "ai_assisted"
  | "deterministic";

export type StructuredConstraint = {
  aliases?: string[];
  id: string;
  label: string;
  matchingMode?: StructuredConstraintMatchingMode;
  normalizedMeaning?: string;
  originalText?: string;
  source: "budget" | "important_details" | "smart_feature" | "avoid";
  strictness?: StructuredConstraintStrictness;
  type: StructuredConstraintType;
  value: string;
};

export type SizeConstraint = {
  id: string;
  label: string;
  dimension: "width" | "depth" | "height" | "length" | "any";
  operator: "max" | "min";
  unit: "in" | "ft";
  value: number;
};

export type BudgetRule = {
  amount: number | null;
  flexible: boolean;
  label: string;
  operator: "max" | "target" | "unknown";
  premiumCap: number | null;
};

export type SpecConstraintKind = "numeric" | "boolean";

export type SpecConstraintOperator = "min" | "max" | "equals";

// A numeric/boolean performance-spec requirement parsed from user input
// (e.g. "600+ CFM", "battery included"). Currently populated in shadow mode:
// it is extracted and surfaced for debugging but is not yet consumed by
// search, validation, or scoring.
export type SpecConstraint = {
  id: string;
  spec: string;
  label: string;
  kind: SpecConstraintKind;
  operator: SpecConstraintOperator;
  unit: string | null;
  value: number;
  strictness: "hard" | "soft";
  source: "query" | "priorities" | "smart_feature" | "avoid";
};

export type StructuredRequirements = {
  requiredConstraints: StructuredConstraint[];
  avoidConstraints: StructuredConstraint[];
  preferredConstraints: StructuredConstraint[];
  sizeConstraints: SizeConstraint[];
  specConstraints?: SpecConstraint[];
  colorConstraints: StructuredConstraint[];
  materialConstraints: StructuredConstraint[];
  brandConstraints: StructuredConstraint[];
  budgetRules: BudgetRule[];
  ambiguousConstraints: StructuredConstraint[];
  summary: string[];
};

export type SearchQueryFamily =
  | "canonical_shopping"
  | "hard_filter"
  | "retailer_domain"
  | "editorial_review"
  | "owner_experience"
  | "synonym"
  | "fallback";

export type SearchQueryStage = 1 | 2 | 3;

export type SearchQueryCandidate = {
  family: SearchQueryFamily;
  query: string;
  stage: SearchQueryStage;
};

export type SearchPlan = {
  categoryGroup: string;
  queries: SearchQueryCandidate[];
  stagedQueries: {
    pass1: SearchQueryCandidate[];
    pass2: SearchQueryCandidate[];
    pass3: SearchQueryCandidate[];
  };
};

export type ProductDiscoveryTarget = {
  aliases: string[];
  brand: string;
  priority: "high" | "medium" | "low";
  productLine: string;
  whyExpected: string;
};

export type ProductDiscoveryStrategy = {
  avoidCandidatePatterns: string[];
  discoveryQueries: string[];
  expectedProducts: ProductDiscoveryTarget[];
  searchIntent: string;
  verificationFacts: string[];
};

export type ProductDiscoveryGapCheck = {
  followUpQueries: string[];
  missingExpectedProducts: string[];
  notes: string[];
  suspiciousCandidateNames: string[];
};

export type ProductFieldEvidence<T = string | number | string[] | null> = {
  confidence: "High" | "Medium" | "Low";
  sourceType:
    | "json_ld"
    | "open_graph"
    | "retailer_page"
    | "manufacturer_page"
    | "serper"
    | "openai"
    | "snippet";
  sourceUrl: string;
  value: T;
  verifiedAt: string;
};

export type ProductOffer = {
  availability: ProductFieldEvidence<string | null>;
  price: ProductFieldEvidence<number | null>;
  priceCurrency: ProductFieldEvidence<string | null>;
  retailer: string | null;
  url: string;
};

export type ProductPriceConfidence =
  | "verified"
  | "likely"
  | "range"
  | "suspicious"
  | "unverified"
  | "conflicting";

export type ProductEligibilityVerdict = {
  status:
    | "buyable_product"
    | "likely_product"
    | "evidence_only"
    | "listing_or_search"
    | "non_product"
    | "unknown";
  confidence: "high" | "medium" | "low";
  canRenderAsProductCard: boolean;
  canUseAsEvidence: boolean;
  reasons: string[];
};

export type ProductPriceTrust = {
  status:
    | "verified"
    | "usable"
    | "needs_verification"
    | "suspicious"
    | "conflicting"
    | "missing";
  price: number | null;
  canUseForBudget: boolean;
  canBeExactWithBudget: boolean;
  displayText: string;
  warnings: string[];
  sources: string[];
};

export type ProductReliabilityCheck = {
  canBeBestMatch: boolean;
  identityConfidence: "high" | "medium" | "low";
  price: number | null;
  priceConfidence: ProductPriceConfidence;
  reasons: string[];
  warnings: string[];
};

export type ProductMetadata = {
  availability?: ProductFieldEvidence<string | null>;
  brand?: ProductFieldEvidence<string | null>;
  canonicalUrl?: ProductFieldEvidence<string | null>;
  colors?: ProductFieldEvidence<string[]>;
  dimensions?: {
    depth?: ProductFieldEvidence<number | null>;
    height?: ProductFieldEvidence<number | null>;
    unit?: "in" | "cm" | null;
    width?: ProductFieldEvidence<number | null>;
  };
  gtin?: ProductFieldEvidence<string | null>;
  image?: ProductFieldEvidence<string | null>;
  modelNumber?: ProductFieldEvidence<string | null>;
  offers: ProductOffer[];
  rating?: ProductFieldEvidence<number | null>;
  reviewCount?: ProductFieldEvidence<number | null>;
  sku?: ProductFieldEvidence<string | null>;
  title?: ProductFieldEvidence<string | null>;
};

export type ProductSpecSource =
  | "name"
  | "title"
  | "keySpecs"
  | "metadata"
  | "evidence";

// A single performance spec observed on a product (e.g. cfm: 650). Extracted
// in shadow mode for debugging; not yet consumed by validation or scoring.
export type ProductSpecValue = {
  spec: string;
  kind: SpecConstraintKind;
  value: number | boolean;
  unit: string | null;
  raw: string;
  source: ProductSpecSource;
};

export type ProductSpecMap = Record<string, ProductSpecValue>;

export type CanonicalProductIdentity = {
  brand: string | null;
  canonicalId: string;
  canonicalUrl: string | null;
  confidence: "High" | "Medium" | "Low";
  gtin: string | null;
  modelNumber: string | null;
  normalizedTitle: string;
  sku: string | null;
};

export type ScoreBreakdown = {
  availabilityScore: number;
  categoryFitScore?: number;
  categoryProfileKey?: string;
  credibilityFloorPenalty?: number;
  evidenceScore: number;
  evidenceSignalCount?: number;
  expertMentionScore?: number;
  fitScore: number;
  marketConfidencePenalty?: number;
  marketConfidenceScore?: number;
  marketConfidenceTier?: ProductCredibilityTier;
  missingDataPenalty?: number;
  ownerOpinionScore?: number;
  ownerRatingScore?: number;
  ownerReviewStrengthScore?: number;
  popularityScore?: number;
  priceValueScore?: number;
  qualityScore: number;
  repeatedComplaintPenalty?: number;
  requirementFitScore?: number;
  riskPenalty: number;
  scoreDebug?: string[];
  sourceQualityScore?: number;
  totalScore: number;
  valueScore: number;
};

export type ProductCredibilityTier = "strong" | "moderate" | "weak";

export type ProductCredibility = {
  dataCompletenessScore: number;
  editorialSourceCount: number;
  independentSourceCount: number;
  label: string;
  majorRetailerCount: number;
  rating: number | null;
  reviewCount: number | null;
  score: number;
  signals: string[];
  sourceCount: number;
  tier: ProductCredibilityTier;
  warnings: string[];
};

export type SearchCoverage = {
  canonicalProductCount: number;
  enrichedProductCount: number;
  exactMatchCount: number;
  executedQueryCount: number;
  generatedQueryCount: number;
  nearMatchCount: number;
  rawCandidateCount: number;
  sourceTimeouts: number;
  stageCounts: {
    pass1: number;
    pass2: number;
    pass3: number;
  };
};

export type EvidenceConfidence = "High" | "Medium" | "Low";

export type ProductEvidenceItem = {
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  snippet: string;
  confidence: EvidenceConfidence;
};

export type RepeatedComplaintEvidence = {
  complaint: string;
  sourceCount: number;
  evidenceSnippets: string[];
  severity: "low" | "medium" | "high";
};

export type ProductEvidenceUnknown = {
  topic: string;
  reason: string;
};

export type ProductOwnerOpinion = {
  concerns: string[];
  praises: string[];
  redditThreadCount: number;
  sentiment: "positive" | "mixed" | "negative" | "limited";
  sourceCount: number;
  sourceUrls: string[];
  summary: string;
};

export type ProductEvidenceBucket = {
  positiveEvidence: ProductEvidenceItem[];
  negativeEvidence: ProductEvidenceItem[];
  ownerOpinion?: ProductOwnerOpinion;
  repeatedComplaints: RepeatedComplaintEvidence[];
  unknowns: ProductEvidenceUnknown[];
};

export type RawProductCandidate = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  productUrl: string;
  imageUrl: string | null;
  retailer: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  availableColors: string[];
  dimensions: {
    width: number | null;
    depth: number | null;
    height: number | null;
    unit: "in" | "cm" | null;
  };
  keySpecs: string[];
  evidenceSources: {
    title: string;
    url: string;
    snippet: string;
  }[];
  requirementCheck: RequirementCheck;
};

export type ProductRecommendation = {
  recommendation_type: RecommendationType;
  rank?: number;
  rankLabel?: string;
  rankReason?: string;
  matchScore?: number;
  credibilityScore?: number;
  name: string;
  category: string;
  product_page_url: string;
  product_image_url: string;
  why_recommended: string;
  pros: string[];
  cons: string[];
  common_complaints: string[];
  estimated_price_range: string;
  confidence_score: number;
  source_consensus: SourceConsensus;
  price_value_verdict: string;
  best_for: string;
  not_for: string[];
  citations: Citation[];
  near_match_reason?: string;
  evidence_strength?: "strong" | "medium" | "weak";
  slot_reasoning?: string;
  requirementCheck?: RequirementCheck;
  matchedRequirements?: string[];
  missingRequirements?: string[];
  unknownRequirements?: string[];
  requirementComparisons?: RequirementComparison[];
  evidenceBucket?: ProductEvidenceBucket;
  disqualifiedReason?: string | null;
  canonicalIdentity?: CanonicalProductIdentity;
  metadata?: ProductMetadata;
  marketConfidence?: ProductCredibility;
  priceTrust?: ProductPriceTrust;
  productEligibility?: ProductEligibilityVerdict;
  reliabilityCheck?: ProductReliabilityCheck;
  scoreBreakdown?: ScoreBreakdown;
};

export type RecommendationResult = {
  search_summary: string;
  assumptions: string[];
  extractedRequirements?: StructuredRequirements;
  generated_queries?: string[];
  raw_candidate_count?: number;
  exactMatches: ProductRecommendation[];
  premiumAboveBudget?: ProductRecommendation[];
  nearMatches: ProductRecommendation[];
  recommendations: ProductRecommendation[];
  searchCoverage?: SearchCoverage;
  what_to_avoid: string[];
  final_buying_advice: string;
};

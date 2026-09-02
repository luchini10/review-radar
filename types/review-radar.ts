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
};

export type SelectionPrice = {
  amount: number;
  currency: "USD";
};

export type SelectionProductRecommendation = {
  category: string;
  imageUrl: string | null;
  name: string;
  price: SelectionPrice | null;
  productPageUrl: string;
};

export type SelectionRecommendationResult = {
  recommendations: SelectionProductRecommendation[];
};

export type RecommendationApiResponse =
  | { result: SelectionRecommendationResult }
  | { error: string };

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

export type ProductFieldEvidence<T = string | number | string[] | null> = {
  confidence: "High" | "Medium" | "Low";
  sourceType:
    | "json_ld"
    | "open_graph"
    | "retailer_page"
    | "manufacturer_page"
    | "serpapi"
    | "serper"
    | "snippet";
  sourceUrl: string;
  value: T;
  verifiedAt: string;
};

export type ProductOffer = {
  availability?: ProductFieldEvidence<
    | "in_stock"
    | "limited_availability"
    | "out_of_stock"
    | "preorder"
    | "unknown"
  >;
  price: ProductFieldEvidence<number | null>;
  priceCurrency: ProductFieldEvidence<string | null>;
};

export type ProductAvailabilityTrust = {
  source:
    | "page_metadata"
    | "shopping_offer"
    | "structured_availability"
    | "structured_offer"
    | "unverified_page";
  status: "available" | "unavailable" | "unknown";
};

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
    | "suspicious"
    | "conflicting"
    | "missing";
  price: number | null;
};

export type ProductMetadata = {
  brand?: ProductFieldEvidence<string | null>;
  colors?: ProductFieldEvidence<string[]>;
  dimensions?: {
    depth?: ProductFieldEvidence<number | null>;
    height?: ProductFieldEvidence<number | null>;
    unit?: "in" | "cm" | null;
    width?: ProductFieldEvidence<number | null>;
  };
  image?: ProductFieldEvidence<string | null>;
  modelNumber?: ProductFieldEvidence<string | null>;
  offers: ProductOffer[];
  title?: ProductFieldEvidence<string | null>;
};

export type ProductSpecSource =
  | "name"
  | "title"
  | "keySpecs"
  | "metadata"
  | "evidence";

export type ProductSpecValue = {
  spec: string;
  kind: SpecConstraintKind;
  value: number | boolean;
  unit: string | null;
  raw: string;
  source: ProductSpecSource;
};

export type ProductSpecMap = Record<string, ProductSpecValue>;

export type RawProductCandidate = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  productUrl: string;
  imageUrl: string | null;
  price: number | null;
  currentShoppingOffer?: boolean;
  discoveryProvider?: "serpapi" | "serper";
  commerceSignals?: {
    offerCount: number | null;
    position: number | null;
    productId: string | null;
    rating: number | null;
    ratingCount: number | null;
  };
  discoveryOrder?: number;
  marketEvidence?: {
    consensusOrder: number;
    sourceUrls: string[];
    targetBrand: string;
    targetModel: string;
    tier: "strong" | "supported";
  };
  retailer?: string | null;
  availableColors: string[];
  dimensions: {
    width: number | null;
    depth: number | null;
    height: number | null;
    unit: "in" | "cm" | null;
  };
  keySpecs: string[];
  evidenceSources: Array<{
    title: string;
    url: string;
    snippet: string;
    snippetProvenance?: "source-derived" | "query-derived";
  }>;
};

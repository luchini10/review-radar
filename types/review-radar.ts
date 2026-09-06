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

export type ProductImage = {
  url: string;
  sourceUrl: string;
  sourceTitle: string;
  productId?: string;
};

export type SelectionProductRecommendation = {
  name: string;
  productPageUrl: string;
  image?: ProductImage;
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

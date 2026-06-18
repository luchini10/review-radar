export type SmartFeatureType =
  | "enum"
  | "boolean"
  | "number"
  | "range"
  | "text"
  | "exclusion";

export type SmartFeatureOperator =
  | "equals"
  | "not_equals"
  | "includes"
  | "not_includes"
  | "lte"
  | "gte"
  | "between"
  | "required";

export type SmartFeatureValue = string | number | boolean | [number, number];

export type SmartFeature = {
  id: string;
  name: string;
  description: string;
  type: SmartFeatureType;
  possibleValues?: string[];
  operators: SmartFeatureOperator[];
  unit?: string;
  examples: string[];
  commonlyImportant: boolean;
};

export type SelectedSmartFeature = {
  id: string;
  name: string;
  type: SmartFeatureType;
  operator: SmartFeatureOperator;
  value: SmartFeatureValue;
  unit?: string;
  required: true;
  source: "smart_features";
};

export type SmartFeatureResponse = {
  category: string;
  features: SmartFeature[];
  warning?: string;
};

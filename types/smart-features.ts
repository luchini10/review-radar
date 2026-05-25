export type SmartFeature = {
  name: string;
  description: string;
  examples: string[];
};

export type SmartFeatureResponse = {
  category: string;
  features: SmartFeature[];
  warning?: string;
};

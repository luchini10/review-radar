export type SearchRequest = {
  category: string;
  budget: string;
  useCase: string;
  dealBreaker: string;
};

export type RecommendationApiRequest = {
  query: string;
  budget?: string;
  useCase?: string;
  dealBreakers?: string;
};

export type RecommendationApiResponse =
  | {
      result: RecommendationResult;
    }
  | {
      error: string;
    };

export type RecommendationType =
  | "Best Overall"
  | "Best Value"
  | "Best Budget"
  | "Best Premium"
  | "Best for User Need"
  | "Avoid";

export type SourceConsensus = "Strong" | "Mixed" | "Weak" | "Niche";

export type Citation = {
  title: string;
  url: string;
  what_it_supports: string;
};

export type ProductRecommendation = {
  recommendation_type: RecommendationType;
  name: string;
  category: string;
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
};

export type RecommendationResult = {
  search_summary: string;
  assumptions: string[];
  recommendations: ProductRecommendation[];
  what_to_avoid: string[];
  final_buying_advice: string;
};

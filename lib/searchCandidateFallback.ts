import { filterResultByRequirements } from "./requirementValidation.ts";
import type {
  ProductRecommendation,
  RecommendationApiRequest,
  RecommendationResult,
} from "@/types/review-radar";

type SearchCandidateFallbackBase = Omit<
  RecommendationResult,
  "exactMatches" | "nearMatches"
> & {
  exactMatches?: ProductRecommendation[];
  nearMatches?: ProductRecommendation[];
};

export function buildSearchCandidateFallbackResult(
  baseResult: SearchCandidateFallbackBase,
  searchCandidates: ProductRecommendation[],
  requirements: RecommendationApiRequest,
) {
  return filterResultByRequirements(
    {
      ...baseResult,
      raw_candidate_count: searchCandidates.length,
      recommendations: searchCandidates,
    },
    requirements,
  );
}

import { extractStructuredRequirements } from "./requirementExtraction.ts";
import type {
  RecommendationApiRequest,
  SearchRequest,
} from "@/types/review-radar";

type SearchRequestPayloadInput = Pick<
  SearchRequest,
  "budget" | "category" | "priorities" | "selectedFeatures"
> &
  Partial<Pick<RecommendationApiRequest, "avoid">>;

type PayloadOptions = {
  includeExtractedRequirements?: boolean;
};

export function cleanSearchText(value: string | undefined) {
  return value?.trim() ?? "";
}

function optionalCleanText(value: string | undefined) {
  const trimmed = cleanSearchText(value);

  return trimmed ? trimmed : undefined;
}

export function cleanSearchFormInput(
  input: SearchRequestPayloadInput,
): SearchRequestPayloadInput {
  return {
    ...input,
    avoid: optionalCleanText(input.avoid),
    budget: cleanSearchText(input.budget),
    category: cleanSearchText(input.category),
    priorities: cleanSearchText(input.priorities),
  };
}

export function buildRecommendationApiPayload(
  input: SearchRequestPayloadInput,
  options: PayloadOptions = {},
): RecommendationApiRequest {
  const cleaned = cleanSearchFormInput(input);
  const payload: RecommendationApiRequest = {
    query: cleaned.category,
  };
  const budget = optionalCleanText(cleaned.budget);
  const priorities = optionalCleanText(cleaned.priorities);
  const avoid = optionalCleanText(cleaned.avoid);

  if (budget) {
    payload.budget = budget;
  }

  if (priorities) {
    payload.priorities = priorities;
  }

  if (avoid) {
    payload.avoid = avoid;
  }

  if (cleaned.selectedFeatures.length > 0) {
    payload.selectedFeatures = cleaned.selectedFeatures;
  }

  if (options.includeExtractedRequirements) {
    payload.extractedRequirements = extractStructuredRequirements(payload);
  }

  return payload;
}

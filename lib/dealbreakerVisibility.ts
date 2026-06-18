import { classifyNearMatch } from "./nearMatchClassification.ts";
import type {
  ProductRecommendation,
  RecommendationResult,
} from "@/types/review-radar";

export const dealbreakerStrengths = ["strict", "balanced", "flexible"] as const;

export type DealbreakerStrength = (typeof dealbreakerStrengths)[number];

export type DealbreakerVisibility = {
  exactMatches: ProductRecommendation[];
  hiddenCounts: {
    nearMatches: number;
    total: number;
  };
  nearMatches: ProductRecommendation[];
};

function visibleNearMatches(
  products: ProductRecommendation[],
  strength: DealbreakerStrength,
) {
  if (strength === "strict") {
    return [];
  }

  if (strength === "balanced") {
    return products.filter(
      (product) => classifyNearMatch(product).label === "Needs Verification",
    );
  }

  return products;
}

export function filterResultByDealbreakerStrength(
  result: RecommendationResult,
  strength: DealbreakerStrength,
): DealbreakerVisibility {
  const nearMatches =
    result.exactMatches.length < 7 ? result.nearMatches || [] : [];
  const visibleNearMatchesResult = visibleNearMatches(nearMatches, strength);
  const hiddenNearCount = nearMatches.length - visibleNearMatchesResult.length;

  return {
    exactMatches: result.exactMatches,
    hiddenCounts: {
      nearMatches: hiddenNearCount,
      total: hiddenNearCount,
    },
    nearMatches: visibleNearMatchesResult,
  };
}

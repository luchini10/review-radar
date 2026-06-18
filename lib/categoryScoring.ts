// Category-aware scoring as a small, capped ADDITIVE boost — deliberately not a
// reweight of the ranking formula. For a product's category profile, it rewards:
//   - presence of each category-relevant spec (well-documented category fit), and
//   - verifiably meeting a stated spec requirement (proven category fit).
// Absent specs are neutral (no penalty). The boost is clamped small so it nudges
// ties rather than dominating the score. Computed in shadow for debug visibility;
// only added to the score behind a flag (see recommendationScoring.ts).

import { selectCategoryProfile } from "./categoryProfiles.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { evaluateSpecConstraint, extractProductSpecs } from "./specExtraction.ts";
import type {
  ProductRecommendation,
  RecommendationApiRequest,
} from "@/types/review-radar";

const MAX_BOOST = 8;
const PRESENT_POINTS = 1;
const PASS_POINTS = 2;

export type CategoryFit = {
  boost: number;
  profileKey: string;
};

export function computeCategoryFit(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
): CategoryFit {
  const profile = selectCategoryProfile(baseProductCategoryFromQuery(input.query));

  if (profile.keySpecs.length === 0) {
    return { boost: 0, profileKey: profile.key };
  }

  const productSpecs = extractProductSpecs(product);
  const specConstraints = input.extractedRequirements?.specConstraints || [];
  let boost = 0;

  for (const spec of profile.keySpecs) {
    if (productSpecs[spec]) {
      boost += PRESENT_POINTS;
    }

    const constraint = specConstraints.find((item) => item.spec === spec);

    if (constraint && evaluateSpecConstraint(constraint, productSpecs) === "pass") {
      boost += PASS_POINTS;
    }
  }

  return { boost: Math.min(MAX_BOOST, boost), profileKey: profile.key };
}

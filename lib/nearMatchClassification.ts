import type { ProductRecommendation } from "@/types/review-radar";

type NearMatchClassification = {
  description: string;
  label: string;
};

function comparisonText(product: ProductRecommendation) {
  return (product.requirementComparisons || [])
    .map((item) => `${item.required} ${item.productHas} ${item.status}`)
    .join(" ")
    .toLowerCase();
}

function isPriceComparison(
  comparison: NonNullable<ProductRecommendation["requirementComparisons"]>[number],
) {
  return /\b(?:budget|price)\b/i.test(
    `${comparison.required} ${comparison.productHas}`,
  );
}

export function classifyNearMatch(product: ProductRecommendation): NearMatchClassification {
  const comparisons = product.requirementComparisons || [];
  const text = comparisonText(product);
  const hasFailedPrice = comparisons.some(
    (comparison) => isPriceComparison(comparison) && comparison.status === "failed",
  );
  const hasUnknownPrice = comparisons.some(
    (comparison) =>
      isPriceComparison(comparison) &&
      (comparison.status === "unknown" ||
        /\bnot verified\b/i.test(comparison.productHas)),
  );

  if (hasFailedPrice) {
    return {
      description: "the price does not meet the stated budget",
      label: "Over Budget",
    };
  }

  if (hasUnknownPrice || /\bnot verified\b|\bunknown\b|\bmissing\b/.test(text)) {
    return {
      description: "one required detail could not be verified",
      label: "Needs Verification",
    };
  }

  if (/\bcolor\b|\bfinish\b/.test(text)) {
    return {
      description: "the color or finish does not match",
      label: "Different Finish",
    };
  }

  if (/\bwidth\b|\bdepth\b|\bheight\b|\bsize\b|\binches\b/.test(text)) {
    return {
      description: "the size does not match",
      label: "Size Mismatch",
    };
  }

  return {
    description: "it does not meet every required detail",
    label: "Close Match",
  };
}

import type { RecommendationApiRequest } from "@/types/review-radar";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.$"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsNegativeColor(text: string, color: string) {
  const normalizedText = normalize(text);
  const normalizedColor = normalize(color);

  if (!normalizedColor) {
    return false;
  }

  return new RegExp(
    `\\b(?:not|no|without|avoid|do not want|don't want)\\b(?:\\W+\\w+){0,3}\\W+${normalizedColor}\\b|\\b${normalizedColor}\\b(?:\\W+\\w+){0,3}\\W+\\b(?:not|avoid|unwanted)\\b`,
    "i",
  ).test(normalizedText);
}

export function detectRequirementConflicts(input: RecommendationApiRequest) {
  const conflicts: string[] = [];
  const details = input.priorities || "";
  const selectedColors = (input.selectedFeatures || [])
    .filter((feature) => feature.name.toLowerCase().includes("color"))
    .map((feature) => String(feature.value));

  for (const color of selectedColors) {
    if (containsNegativeColor(details, color)) {
      conflicts.push(
        `Smart Features require ${color}, but Important Details say not to include ${color}.`,
      );
    }
  }

  const sizeConstraints = input.extractedRequirements?.sizeConstraints || [];
  for (const dimension of ["width", "depth", "height"] as const) {
    const maximum = Math.min(
      ...sizeConstraints
        .filter((constraint) => constraint.dimension === dimension && constraint.operator === "max")
        .map((constraint) => constraint.value),
    );
    const minimum = Math.max(
      ...sizeConstraints
        .filter((constraint) => constraint.dimension === dimension && constraint.operator === "min")
        .map((constraint) => constraint.value),
    );

    if (
      Number.isFinite(maximum) &&
      Number.isFinite(minimum) &&
      minimum > maximum
    ) {
      conflicts.push(
        `${dimension} requirements conflict: at least ${minimum} inches and under ${maximum} inches cannot both be true.`,
      );
    }
  }

  const maxBudget = input.extractedRequirements?.budgetRules.find(
    (rule) => rule.operator === "max" && rule.amount !== null,
  )?.amount;
  const detailsText = normalize(details);

  if (
    maxBudget !== undefined &&
    maxBudget !== null &&
    maxBudget < 300 &&
    /\b(?:premium|high end|oled|professional grade)\b/.test(detailsText)
  ) {
    conflicts.push(
      "Budget appears very restrictive for a premium requirement. Increase the budget or remove the premium requirement.",
    );
  }

  return conflicts;
}

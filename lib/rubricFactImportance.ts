export type RubricFactImportance = "critical" | "important" | "minor";

export type RubricFactImportanceVerdict = {
  importance: RubricFactImportance;
  weight: number;
  confidenceCap: number;
  reason: string;
};

const CRITICAL_FACT_PATTERNS = [
  /\b(?:current|actual|full|sale)?\s*price\b/,
  /\b(?:budget|under|at or below|cost)\b/,
  /\b(?:availability|in stock|stock status|sold by|retailer)\b/,
  /\b(?:product type|configuration|form factor)\b/,
  /\b(?:compatibility|compatible|fits?|fitment)\b/,
  /\b(?:dimension|width|height|depth|clearance|installation|size)\b/,
  /\b(?:capacity|cu ft|cubic feet|load capacity|weight limit)\b/,
  /\b(?:safety|certification|certified|recall)\b/,
];

const MINOR_FACT_PATTERNS = [
  /\b(?:color options?|available colors?|style|cosmetic|aesthetic)\b/,
  /\b(?:finish|appearance)\b/,
  /\b(?:shipping|delivery window)\b/,
  /\b(?:app|smart app|remote control)\b/,
];

const IMPORTANT_FACT_PATTERNS = [
  /\b(?:model|model number|sku|gtin)\b/,
  /\b(?:warranty|return policy|returns)\b/,
  /\b(?:material|build|construction|durability|quality)\b/,
  /\b(?:performance|power|runtime|battery|noise|energy|efficiency)\b/,
  /\b(?:review|rating|owner|complaint)\b/,
  /\b(?:included|accessor(?:y|ies)|attachment)\b/,
];

export function classifyRubricFactImportance(
  fact: string,
): RubricFactImportanceVerdict {
  const normalized = fact.toLowerCase();

  if (CRITICAL_FACT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      confidenceCap: 72,
      importance: "critical",
      reason:
        "This missing fact could change whether the product is buyable, compatible, in budget, or the right product type.",
      weight: 5,
    };
  }

  if (MINOR_FACT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      confidenceCap: 88,
      importance: "minor",
      reason:
        "This missing fact is useful for shopping confidence, but it is less likely to change the core recommendation.",
      weight: 0.75,
    };
  }

  if (IMPORTANT_FACT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      confidenceCap: 78,
      importance: "important",
      reason:
        "This missing fact affects trust or product quality, but it is not usually enough by itself to reject the product.",
      weight: 2.5,
    };
  }

  return {
    confidenceCap: 82,
    importance: "important",
    reason:
      "This missing fact appears relevant to the buying decision, but its exact importance is not category-specific.",
    weight: 2,
  };
}

export function rubricImportanceRank(importance: RubricFactImportance) {
  if (importance === "critical") {
    return 3;
  }

  return importance === "important" ? 2 : 1;
}

export function isRubricFactUnknownTopic(topic: string) {
  return /^Rubric fact:/i.test(topic);
}

export function rubricFactFromUnknownTopic(topic: string) {
  return topic.replace(/^Rubric fact:\s*/i, "").trim();
}

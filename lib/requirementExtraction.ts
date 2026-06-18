import { z } from "zod";
import { canonicalBrand, detectKnownBrands } from "./brandMatching.ts";
import { detectCategoryGroup } from "./search/sourcePacks.ts";
import { detectBedSize } from "./productCategory.ts";
import { extractSpecConstraints } from "./specExtraction.ts";
import {
  selectedSmartFeatureLabel,
  selectedSmartFeatureSearchText,
} from "./smartFeatureSelection.ts";
import {
  enrichConstraintWithSemantics,
  knownSemanticFeatureValues,
  requiredSemanticFeatureValues,
  semanticConstraintType,
} from "./semanticMatching.ts";
import type {
  BudgetRule,
  RecommendationApiRequest,
  SizeConstraint,
  SpecConstraint,
  StructuredConstraint,
  StructuredRequirements,
} from "@/types/review-radar";
import type { SelectedSmartFeature, SmartFeatureValue } from "@/types/smart-features";

export const structuredConstraintSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    source: z.enum(["budget", "important_details", "smart_feature", "avoid"]),
    type: z.enum([
      "brand",
      "budget",
      "color",
      "compatibility",
      "dealbreaker",
      "feature",
      "material",
      "quality",
      "size",
      "use_case",
    ]),
    value: z.string().min(1),
    originalText: z.string().min(1).optional(),
    normalizedMeaning: z.string().min(1).optional(),
    aliases: z.array(z.string().min(1)).optional(),
    strictness: z.enum(["hard", "soft", "dealbreaker"]).optional(),
    matchingMode: z.enum(["deterministic", "ai_assisted"]).optional(),
  })
  .strict();

export const sizeConstraintSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    dimension: z.enum(["width", "depth", "height", "length", "any"]),
    operator: z.enum(["max", "min"]),
    unit: z.enum(["in", "ft"]),
    value: z.number().positive(),
  })
  .strict();

export const budgetRuleSchema = z
  .object({
    amount: z.number().positive().nullable(),
    flexible: z.boolean(),
    label: z.string().min(1),
    operator: z.enum(["max", "target", "unknown"]),
    premiumCap: z.number().positive().nullable(),
  })
  .strict();

export const specConstraintSchema = z
  .object({
    id: z.string().min(1),
    spec: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(["numeric", "boolean"]),
    operator: z.enum(["min", "max", "equals"]),
    unit: z.string().min(1).nullable(),
    value: z.number(),
    strictness: z.enum(["hard", "soft"]),
    source: z.enum(["query", "priorities", "smart_feature", "avoid"]),
  })
  .strict();

export const structuredRequirementsSchema = z
  .object({
    requiredConstraints: z.array(structuredConstraintSchema),
    avoidConstraints: z.array(structuredConstraintSchema),
    preferredConstraints: z.array(structuredConstraintSchema),
    sizeConstraints: z.array(sizeConstraintSchema),
    specConstraints: z.array(specConstraintSchema).default([]),
    colorConstraints: z.array(structuredConstraintSchema),
    materialConstraints: z.array(structuredConstraintSchema),
    brandConstraints: z.array(structuredConstraintSchema),
    budgetRules: z.array(budgetRuleSchema),
    ambiguousConstraints: z.array(structuredConstraintSchema),
    summary: z.array(z.string().min(1)),
  })
  .strict();

const colorValues = [
  "beige",
  "black",
  "blue",
  "brown",
  "charcoal",
  "cream",
  "gray",
  "grey",
  "green",
  "ivory",
  "navy",
  "red",
  "stainless steel",
  "tan",
  "taupe",
  "white",
];

const materialValues = [
  "aluminum",
  "solid wood",
  "hardwood",
  "engineered wood",
  "fabric",
  "leather",
  "linen",
  "mdf",
  "metal",
  "microfiber",
  "particleboard",
  "performance fabric",
  "plastic",
  "polyester",
  "steel",
  "upholstered",
  "upholstery",
  "velvet",
  "wood",
];

const baseProductFeatureValues = [
  "allergies",
  "allergy",
  "allergy-friendly",
  "adjustable shelves",
  "battery life",
  "box spring not required",
  "cordless",
  "counter depth",
  "drawers",
  "easy assembly",
  "energy efficient",
  "fingerprint resistant",
  "hepa filter",
  "hepa",
  "hdmi 2.1",
  "ice maker",
  "inverter",
  "left-facing",
  "left facing",
  "no box spring required",
  "pet-friendly",
  "pet friendly",
  "pet hair",
  "quiet",
  "reclining",
  "stick",
  "storage drawers",
  "third rack",
  "120hz",
  "usb-c",
  "usb c",
  "vented",
  "washable covers",
  "water dispenser",
  "window kit",
  "warranty",
];

const productFeatureValues = Array.from(
  new Set([...baseProductFeatureValues, ...knownSemanticFeatureValues]),
);

const baseConcreteRequiredFeatureValues = [
  "allergies",
  "allergy",
  "allergy-friendly",
  "box spring not required",
  "cordless",
  "drawers",
  "hepa filter",
  "hepa",
  "hdmi 2.1",
  "ice maker",
  "left-facing",
  "left facing",
  "no box spring required",
  "pet-friendly",
  "pet friendly",
  "pet hair",
  "quiet",
  "storage drawers",
  "third rack",
  "120hz",
  "usb-c",
  "usb c",
  "vented",
  "window kit",
];

const concreteRequiredFeatureValues = Array.from(
  new Set([...baseConcreteRequiredFeatureValues, ...requiredSemanticFeatureValues]),
);

const negativePhrases = [
  "avoid",
  "do not want",
  "don't want",
  "dont want",
  "no ",
  "not ",
  "without",
];

let idCounter = 0;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanRequiredTextValue(value: string) {
  return normalizeText(value)
    .replace(/\b(?:only|brand)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addUnique<T extends { label: string; value: number | string }>(
  items: T[],
  item: T,
) {
  const key = `${normalizeText(item.label)}|${normalizeText(String(item.value))}`;

  if (
    items.some(
      (existing) =>
        `${normalizeText(existing.label)}|${normalizeText(String(existing.value))}` ===
        key,
    )
  ) {
    return;
  }

  items.push(item);
}

function constraint(
  type: StructuredConstraint["type"],
  value: string,
  label: string,
  source: StructuredConstraint["source"],
): StructuredConstraint {
  return enrichConstraintWithSemantics({
    id: nextId(type),
    label,
    source,
    type,
    value: value.trim(),
  });
}

function parseMoneyAmount(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/\$?\s*([\d,]+(?:\.\d+)?)/);

  return match?.[1] ? Number(match[1].replace(/,/g, "")) : null;
}

function looksLikeDimensionAmount(text: string, matchEndIndex: number) {
  return /^\s*(?:inches|inch|in\.?|")\b/i.test(text.slice(matchEndIndex));
}

function parseBudgetRangeMax(
  value: string | undefined,
  requireDollarSign: boolean,
) {
  if (!value) {
    return null;
  }

  const rangePatterns = [
    /\bbetween\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:and|to|-|–)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
    /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:-|–|to)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
  ];

  for (const pattern of rangePatterns) {
    for (const match of value.matchAll(pattern)) {
      if (requireDollarSign && !match[0].includes("$")) {
        continue;
      }

      const low = match[1] ? Number(match[1].replace(/,/g, "")) : null;
      const high = match[2] ? Number(match[2].replace(/,/g, "")) : null;

      if (
        low === null ||
        high === null ||
        !Number.isFinite(low) ||
        !Number.isFinite(high) ||
        looksLikeDimensionAmount(value, (match.index || 0) + match[0].length)
      ) {
        continue;
      }

      return Math.max(low, high);
    }
  }

  return null;
}

function parseInlineBudgetAmount(value: string | undefined) {
  if (!value) {
    return null;
  }

  const text = normalizeText(value);
  const moneyMatch = text.match(
    /\b(?:under|less than|below|no more than|at most|max|maximum)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/i,
  );

  if (!moneyMatch?.[1]) {
    return null;
  }

  const amount = Number(moneyMatch[1].replace(/,/g, ""));

  if (!Number.isFinite(amount)) {
    return null;
  }

  const afterAmount = text.slice((moneyMatch.index || 0) + moneyMatch[0].length);

  if (/^\s*(?:inches|inch|in\.?|")\b/i.test(afterAmount)) {
    return null;
  }

  return amount;
}

export function getPremiumCap(
  budgetAmount: number | null,
  category: string,
) {
  if (budgetAmount === null || !Number.isFinite(budgetAmount)) {
    return null;
  }

  const categoryGroup = detectCategoryGroup(category);
  const allowanceByCategory: Record<string, number> = {
    appliances: 1200,
    automotive: 700,
    baby: 500,
    beauty: 300,
    clothing: 300,
    electronics: 700,
    furniture: 1000,
    general: 500,
    home_improvement: 800,
    outdoor: 800,
    pet: 400,
    shoes: 300,
    tools: 600,
  };
  const multiplierByCategory: Record<string, number> = {
    appliances: 1.75,
    electronics: 1.8,
    furniture: 1.8,
    general: 2,
    tools: 1.8,
  };
  const allowance = allowanceByCategory[categoryGroup] ?? 500;
  const multiplier = multiplierByCategory[categoryGroup] ?? 2;

  return Math.round(Math.min(budgetAmount * multiplier, budgetAmount + allowance));
}

function parseBudgetRule(input: RecommendationApiRequest): BudgetRule | null {
  // Budget ranges ("between $500 and $700", "$500-$700") use the upper bound
  // as the firm limit so in-range products are not wrongly rejected.
  const amount =
    parseBudgetRangeMax(input.budget, false) ??
    parseBudgetRangeMax(input.query, true) ??
    parseMoneyAmount(input.budget) ??
    parseInlineBudgetAmount(input.query);

  if (amount === null) {
    return input.budget?.trim()
      ? {
          amount: null,
          flexible: true,
          label: input.budget.trim(),
          operator: "unknown",
          premiumCap: null,
        }
      : null;
  }

  const text = normalizeText(input.budget || input.query || "");
  const flexible = /\b(?:about|around|flexible|roughly|target)\b/i.test(text);
  const operator =
    /\b(?:under|less than|below|no more than|at most|max|maximum)\b/i.test(text) ||
    !flexible
      ? "max"
      : "target";

  return {
    amount,
    flexible,
    label: operator === "max" ? `Budget: $${amount} or less` : `Budget target: $${amount}`,
    operator,
    premiumCap: getPremiumCap(amount, input.query),
  };
}

function smartFeatureValueToString(value: SmartFeatureValue) {
  return Array.isArray(value) ? value.join(" to ") : String(value);
}

function smartFeatureConstraintType(featureName: string, value: string) {
  const normalizedName = normalizeText(featureName);
  const normalizedValue = normalizeText(value);

  if (normalizedName.includes("color") || colorValues.includes(normalizedValue)) {
    return "color";
  }

  if (
    normalizedName.includes("material") ||
    normalizedName.includes("fabric") ||
    materialValues.includes(normalizedValue)
  ) {
    return "material";
  }

  if (normalizedName.includes("brand")) {
    return "brand";
  }

  if (
    normalizedName.includes("size") ||
    normalizedName.includes("width") ||
    normalizedName.includes("depth") ||
    normalizedName.includes("height") ||
    normalizedName.includes("length")
  ) {
    return "size";
  }

  return semanticConstraintType("feature", value);
}

function parseLegacySelectedFeature(value: string) {
  const [name, ...rest] = value.split(":");
  const featureName = name.trim();
  const featureValue = rest.join(":").trim() || featureName;
  const normalizedName = normalizeText(featureName);
  const type: StructuredConstraint["type"] = normalizedName.includes("color")
    ? "color"
    : normalizedName.includes("material") || normalizedName.includes("fabric")
      ? "material"
      : normalizedName.includes("brand")
        ? "brand"
        : normalizedName.includes("size") || normalizedName.includes("width")
          ? "size"
      : "feature";

  return constraint(
    type,
    featureValue,
    featureName && featureValue !== featureName
      ? `${featureName}: ${featureValue}`
      : featureValue,
    "smart_feature",
  );
}

function selectedFeatureToConstraint(
  feature: SelectedSmartFeature | string,
): StructuredConstraint {
  if (typeof feature === "string") {
    return parseLegacySelectedFeature(feature);
  }

  // Boolean "required" features must keep the feature name as the value.
  // Storing the literal string "true" created an unverifiable requirement
  // that blocked exact matches for every boolean Smart Feature search.
  const value =
    feature.operator === "required" && feature.value === true
      ? feature.name
      : smartFeatureValueToString(feature.value);
  const type = smartFeatureConstraintType(feature.name, value);

  return constraint(
    type,
    value,
    selectedSmartFeatureLabel(feature),
    "smart_feature",
  );
}

function numericSmartFeatureValue(value: SelectedSmartFeature["value"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);

    return match?.[0] ? Number(match[0]) : null;
  }

  return null;
}

function sizeConstraintUnit(unit: string | undefined): SizeConstraint["unit"] {
  return normalizeText(unit || "").includes("ft") ? "ft" : "in";
}

function sizeUnitLabel(unit: SizeConstraint["unit"]) {
  return unit === "ft" ? "ft" : "in";
}

function selectedFeatureToSizeConstraints(
  feature: SelectedSmartFeature | string,
): SizeConstraint[] {
  if (typeof feature === "string") {
    return [];
  }

  const normalizedName = normalizeText(feature.name);
  const dimension = normalizedName.includes("depth")
    ? "depth"
    : normalizedName.includes("height")
      ? "height"
      : normalizedName.includes("length") || normalizedName.includes("long")
        ? "length"
      : normalizedName.includes("width") || normalizedName.includes("size")
        ? "width"
        : null;

  if (!dimension) {
    return [];
  }

  if (
    feature.operator === "equals" &&
    dimension !== "length"
  ) {
    return [];
  }

  const unit = sizeConstraintUnit(feature.unit);

  if (feature.operator === "between" && Array.isArray(feature.value)) {
    return [
      {
        id: nextId("size"),
        label: `${feature.name}: at least ${feature.value[0]} ${sizeUnitLabel(unit)}`,
        dimension,
        operator: "min",
        unit,
        value: feature.value[0],
      },
      {
        id: nextId("size"),
        label: `${feature.name}: under ${feature.value[1]} ${sizeUnitLabel(unit)}`,
        dimension,
        operator: "max",
        unit,
        value: feature.value[1],
      },
    ];
  }

  const numericValue = numericSmartFeatureValue(feature.value);

  if (
    numericValue === null ||
    !["lte", "gte", "between", "equals"].includes(feature.operator)
  ) {
    return [];
  }

  return [
    {
      id: nextId("size"),
      label:
        feature.operator === "lte"
          ? `${feature.name}: under ${numericValue} ${sizeUnitLabel(unit)}`
          : feature.operator === "equals" && dimension === "length"
            ? `${feature.name}: ${numericValue} ${sizeUnitLabel(unit)}`
            : `${feature.name}: at least ${numericValue} ${sizeUnitLabel(unit)}`,
      dimension,
      operator: feature.operator === "lte" ? "max" : "min",
      unit,
      value: numericValue,
    },
  ];
}

function sentenceParts(value: string | undefined) {
  return (value || "")
    .split(/[,;]|\band\b/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseSizeConstraints(value: string | undefined): SizeConstraint[] {
  const text = value || "";
  const constraints: SizeConstraint[] = [];
  const dimensionWords =
    "(width|wide|depth|deep|height|high|tall|length|long)";
  const maxWords =
    "(?:under|less than|below|no bigger than|no larger than|no deeper than|no taller than|at most|max|maximum)";
  const minWords = "(?:at least|min|minimum)";
  const patterns: Array<{
    defaultDimension: SizeConstraint["dimension"];
    operator: SizeConstraint["operator"];
    pattern: RegExp;
    plainLabel?: boolean;
    unit: SizeConstraint["unit"];
  }> = [
    {
      defaultDimension: "width",
      operator: "max",
      pattern: new RegExp(
        `\\b${maxWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\s*(?:${dimensionWords})?\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "width",
      operator: "min",
      pattern: new RegExp(
        `\\b${minWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\s*(?:${dimensionWords})?\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "width",
      operator: "max",
      pattern: new RegExp(
        `\\b${dimensionWords}\\s*(?:${maxWords})?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "length",
      operator: "max",
      pattern: new RegExp(
        `\\b${maxWords}\\s*(\\d+(?:\\.\\d+)?)\\s*[-\\s]*(?:feet|foot|ft\\.?)\\s*(?:length|long)?\\b`,
        "gi",
      ),
      unit: "ft",
    },
    {
      defaultDimension: "length",
      operator: "min",
      pattern: new RegExp(
        `\\b${minWords}\\s*(\\d+(?:\\.\\d+)?)\\s*[-\\s]*(?:feet|foot|ft\\.?)\\s*(?:length|long)?\\b`,
        "gi",
      ),
      unit: "ft",
    },
    {
      defaultDimension: "length",
      operator: "min",
      pattern: new RegExp(
        `\\b(?:length|long)\\s*(?:${minWords})?\\s*(\\d+(?:\\.\\d+)?)\\s*[-\\s]*(?:feet|foot|ft\\.?)\\b`,
        "gi",
      ),
      plainLabel: true,
      unit: "ft",
    },
    {
      defaultDimension: "length",
      operator: "min",
      pattern: /\b(\d+(?:\.\d+)?)\s*[-\s]*(?:feet|foot|ft\.?)\b/gi,
      plainLabel: true,
      unit: "ft",
    },
  ];

  function dimensionFromMatch(
    pattern: RegExp,
    match: RegExpMatchArray,
    fallback: SizeConstraint["dimension"],
  ): SizeConstraint["dimension"] {
    const dimensionText =
      pattern.source.startsWith("\\b(width") || pattern.source.startsWith("\\b(width|")
        ? match[1]
        : match[2];
    const normalized = normalizeText(dimensionText || "");

    if (normalized.includes("depth") || normalized.includes("deep")) {
      return "depth";
    }

    if (
      normalized.includes("height") ||
      normalized.includes("high") ||
      normalized.includes("tall")
    ) {
      return "height";
    }

    if (normalized.includes("width") || normalized.includes("wide")) {
      return "width";
    }

    if (normalized.includes("length") || normalized.includes("long")) {
      return "length";
    }

    return fallback;
  }

  function labelForDimension(
    dimension: SizeConstraint["dimension"],
    operator: SizeConstraint["operator"],
    amount: number,
    unit: SizeConstraint["unit"],
    plainLabel = false,
  ) {
    const dimensionLabel =
      dimension === "depth"
        ? "Depth"
        : dimension === "height"
          ? "Height"
          : dimension === "length"
            ? "Length"
            : "Width";
    const unitLabel = unit === "ft" ? "ft" : "inches";

    if (plainLabel && dimension === "length") {
      return `${dimensionLabel}: ${amount} ${unitLabel}`;
    }

    return operator === "max"
      ? `${dimensionLabel}: under ${amount} ${unitLabel}`
      : `${dimensionLabel}: at least ${amount} ${unitLabel}`;
  }

  function isAreaOrVolumeFootMeasurement(match: RegExpMatchArray) {
    if (match.index === undefined) {
      return false;
    }

    return /\b(?:sq|square|cu|cubic)\s*$/i.test(text.slice(Math.max(0, match.index - 12), match.index));
  }

  for (const item of patterns) {
    for (const match of text.matchAll(item.pattern)) {
      if (item.unit === "ft" && isAreaOrVolumeFootMeasurement(match)) {
        continue;
      }

      const amountMatch = Array.from(match).find((part, index) =>
        index > 0 && /^\d+(?:\.\d+)?$/.test(part || ""),
      );
      const amount = amountMatch ? Number(amountMatch) : null;

      if (!amount || !Number.isFinite(amount)) {
        continue;
      }

      const dimension = dimensionFromMatch(
        item.pattern,
        match,
        item.defaultDimension,
      );

      addUnique(constraints, {
        id: nextId("size"),
        label: labelForDimension(dimension, item.operator, amount, item.unit, item.plainLabel),
        dimension,
        operator: item.operator,
        unit: item.unit,
        value: amount,
      });
    }
  }

  return constraints;
}

function valueMatchesKnown(value: string, knownValues: string[]) {
  const normalized = normalizeText(value);

  return knownValues.find((known) =>
    new RegExp(`(^|\\W)${known.replace(/\s+/g, "\\s+")}(\\W|$)`, "i").test(
      normalized,
    ),
  );
}

function compactKnownValue(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function matchingKnownValues(value: string, knownValues: string[]) {
  const matches = knownValues
    .filter((known) => valueMatchesKnown(value, [known]))
    .sort(
      (first, second) =>
        compactKnownValue(second).length - compactKnownValue(first).length,
    );
  const selected: string[] = [];

  for (const match of matches) {
    const compactMatch = compactKnownValue(match);

    if (
      selected.some((existing) => {
        const compactExisting = compactKnownValue(existing);

        return (
          compactExisting === compactMatch ||
          compactExisting.includes(compactMatch)
        );
      })
    ) {
      continue;
    }

    selected.push(match);
  }

  return selected;
}

function extractColorConstraints(text: string, source: StructuredConstraint["source"]) {
  return colorValues.flatMap((color) =>
    valueMatchesKnown(text, [color])
      ? [constraint("color", color, `Color: ${titleCase(color)}`, source)]
      : [],
  );
}

function extractMaterialConstraints(text: string, source: StructuredConstraint["source"]) {
  return matchingKnownValues(text, materialValues).map((material) =>
    constraint("material", material, `Material: ${titleCase(material)}`, source),
  );
}

function extractFeatureConstraints(text: string, source: StructuredConstraint["source"]) {
  return matchingKnownValues(text, productFeatureValues).map((feature) =>
    constraint("feature", feature, `Feature: ${titleCase(feature)}`, source),
  );
}

function extractConcreteRequiredFeatureConstraints(
  text: string,
  source: StructuredConstraint["source"],
) {
  return matchingKnownValues(text, concreteRequiredFeatureValues).map((feature) =>
    constraint("feature", feature, `Feature: ${titleCase(feature)}`, source),
  );
}

function extractQueryRequiredConstraints(value: string | undefined) {
  const text = value || "";
  const required: StructuredConstraint[] = [];

  for (const brand of detectKnownBrands(text)) {
    addUnique(
      required,
      constraint("brand", canonicalBrand(brand), `Brand: ${canonicalBrand(brand)}`, "important_details"),
    );
  }

  for (const item of [
    ...extractColorConstraints(text, "important_details"),
    ...extractMaterialConstraints(text, "important_details"),
    ...extractFeatureConstraints(text, "important_details"),
  ]) {
    addUnique(required, item);
  }

  // Size is a mutually-exclusive enumerated attribute, extracted like color and
  // material so it flows through the shared requirement-validation path.
  const bedSize = detectBedSize(text);

  if (bedSize) {
    addUnique(
      required,
      constraint("size", bedSize, `Size: ${titleCase(bedSize)}`, "important_details"),
    );
  }

  const withFeaturePatterns = [
    /\bwith\s+([a-z][a-z\s-]{2,40})\b/gi,
    /\bhas\s+([a-z][a-z\s-]{2,40})\b/gi,
  ];

  for (const pattern of withFeaturePatterns) {
    for (const match of text.matchAll(pattern)) {
      const rawValue = (match[1] || "")
        .replace(/\b(?:under|less than|below|no more than|at most|max|maximum)\b.*$/i, "")
        .trim();

      if (!rawValue || rawValue.length < 3 || /\d/.test(rawValue)) {
        continue;
      }

      const color = valueMatchesKnown(rawValue, colorValues);
      const material = valueMatchesKnown(rawValue, materialValues);

      addUnique(
        required,
        constraint(
          color ? "color" : material ? "material" : "feature",
          color || material || rawValue,
          color
            ? `Color: ${titleCase(color)}`
            : material
              ? `Material: ${titleCase(material)}`
              : `Feature: ${titleCase(rawValue)}`,
          "important_details",
        ),
      );
    }
  }

  return required;
}

function requiredSummaryLines(requiredConstraints: StructuredConstraint[]) {
  const alternativeTypes = new Set<StructuredConstraint["type"]>([
    "brand",
    "color",
    "material",
  ]);
  const grouped = new Map<
    StructuredConstraint["type"],
    StructuredConstraint[]
  >();

  for (const item of requiredConstraints) {
    if (!alternativeTypes.has(item.type)) {
      continue;
    }

    grouped.set(item.type, [...(grouped.get(item.type) || []), item]);
  }

  const groupedTypes = new Set(
    Array.from(grouped.entries())
      .filter(([, items]) => items.length > 1)
      .map(([type]) => type),
  );
  const emittedGroups = new Set<StructuredConstraint["type"]>();

  return requiredConstraints.flatMap((item) => {
    if (!groupedTypes.has(item.type)) {
      return [`Required: ${item.label}`];
    }

    if (emittedGroups.has(item.type)) {
      return [];
    }

    emittedGroups.add(item.type);

    const label =
      item.type === "color"
        ? "Color"
        : item.type === "material"
          ? "Material"
          : "Brand";
    const values = (grouped.get(item.type) || []).map((constraint) =>
      titleCase(constraint.value),
    );

    return [`Required: ${label}: ${values.join(" or ")}`];
  });
}

function parseAvoidPart(part: string) {
  const normalized = normalizeText(part);
  const noBoxSpringRequired = normalized.match(
    /\bno\s+box\s+spring\s+(?:required|needed|necessary)\b/i,
  );

  if (noBoxSpringRequired) {
    return "";
  }

  const avoidPatterns = [
    /\b(?:avoid|do not want|don't want|dont want|without)\s+([^,.]+)/i,
    /\bno\s+([^,.]+)/i,
    /\bnot\s+([^,.]+)/i,
  ];

  for (const pattern of avoidPatterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function removeAvoidClause(part: string) {
  const normalized = normalizeText(part);
  const noBoxSpringRequired = normalized.match(
    /\bno\s+box\s+spring\s+(?:required|needed|necessary)\b/i,
  );
  const explicitAvoid = normalized.match(
    /\b(?:avoid|do not want|don't want|dont want|without)\s+[^,.]+/i,
  );

  if (explicitAvoid) {
    return normalized.replace(explicitAvoid[0], "").trim();
  }

  if (noBoxSpringRequired) {
    return part;
  }

  return normalized
    .replace(/\bno\s+[^,.]+/i, "")
    .replace(/\bnot\s+[^,.]+/i, "")
    .trim();
}

function parseRequiredTextPart(part: string) {
  const requiredPatterns = [
    /\b(?:must be|has to be|needs to be|only)\s+([^,.]+)/i,
    /\b(?:must have|has to have|needs to have|need to have|needs|requires?)\s+([^,.]+)/i,
    /\b([a-z][a-z\s-]+)\s+only\b/i,
    /\bfits?\s+(small spaces?|apartments?|compact spaces?)\b/i,
  ];

  for (const pattern of requiredPatterns) {
    const match = part.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function classifyImportantDetails(value: string | undefined) {
  const required: StructuredConstraint[] = [];
  const avoid: StructuredConstraint[] = [];
  const preferred: StructuredConstraint[] = [];
  const ambiguous: StructuredConstraint[] = [];

  for (const part of sentenceParts(value)) {
    const avoidValue = parseAvoidPart(part);
    const featurePart = avoidValue ? removeAvoidClause(part) : part;

    if (avoidValue) {
      addUnique(
        avoid,
        constraint("feature", avoidValue, `Avoid: ${avoidValue}`, "important_details"),
      );

      if (!featurePart) {
        continue;
      }
    }

    const requiredValue = parseRequiredTextPart(featurePart);

    if (requiredValue) {
      const brands = detectKnownBrands(requiredValue);

      if (brands.length > 0) {
        brands.forEach((brand) =>
          addUnique(
            required,
            constraint(
              "brand",
              canonicalBrand(brand),
              `Brand: ${canonicalBrand(brand)}`,
              "important_details",
            ),
          ),
        );
        continue;
      }

      if (
        /\d/.test(requiredValue) &&
        /\b(?:inch|inches|in\.?|wide|depth|deep|height|tall|under|less than|below|at least|min|max|maximum)\b/i.test(
          requiredValue,
        )
      ) {
        continue;
      }

      const cleanRequiredValue = cleanRequiredTextValue(requiredValue);
      const color = valueMatchesKnown(cleanRequiredValue, colorValues);
      const material = valueMatchesKnown(cleanRequiredValue, materialValues);
      const type: StructuredConstraint["type"] = color
        ? "color"
        : material
          ? "material"
          : cleanRequiredValue.includes("space")
            ? "use_case"
            : "feature";

      addUnique(
        required,
        constraint(
          type,
          color || material || cleanRequiredValue || requiredValue,
          type === "color"
            ? `Color: ${titleCase(color || cleanRequiredValue || requiredValue)}`
            : type === "material"
              ? `Material: ${titleCase(material || cleanRequiredValue || requiredValue)}`
              : cleanRequiredValue || requiredValue,
          "important_details",
        ),
      );
      continue;
    }

    const colors = extractColorConstraints(featurePart, "important_details");
    const materials = extractMaterialConstraints(featurePart, "important_details");
    const features = extractFeatureConstraints(featurePart, "important_details");
    const requiredFeatures = extractConcreteRequiredFeatureConstraints(
      featurePart,
      "important_details",
    );

    if (colors.length || materials.length || features.length || requiredFeatures.length) {
      colors.forEach((item) => addUnique(preferred, item));
      materials.forEach((item) => addUnique(required, item));
      features.forEach((item) =>
        requiredFeatures.some(
          (requiredItem) => normalizeText(requiredItem.value) === normalizeText(item.value),
        )
          ? addUnique(required, item)
          : addUnique(preferred, item),
      );
      requiredFeatures.forEach((item) => addUnique(required, item));
      continue;
    }

    if (featurePart.length > 2) {
      addUnique(
        ambiguous,
        constraint("feature", featurePart, featurePart, "important_details"),
      );
    }
  }

  return {
    ambiguous,
    avoid,
    preferred,
    required,
  };
}

// Numeric/boolean performance specs are extracted in SHADOW MODE: collected and
// returned so debugging and later phases can read them, but deliberately kept
// out of `summary` and every other constraint bucket so no current consumer
// (search, validation, scoring, the LLM prompt) changes behavior.
function collectSpecConstraints(
  input: RecommendationApiRequest,
  selectedFeatures: RecommendationApiRequest["selectedFeatures"],
): SpecConstraint[] {
  const selectedFeatureText = (selectedFeatures || [])
    .map((feature) =>
      typeof feature === "string"
        ? feature
        : selectedSmartFeatureSearchText(feature),
    )
    .join(" ");
  const collected = [
    ...extractSpecConstraints(input.query, "query"),
    ...extractSpecConstraints(input.priorities, "priorities"),
    ...extractSpecConstraints(selectedFeatureText, "smart_feature"),
    ...extractSpecConstraints(input.avoid, "avoid"),
  ];
  const byId = new Map<string, SpecConstraint>();

  for (const constraint of collected) {
    const existing = byId.get(constraint.id);

    if (!existing) {
      byId.set(constraint.id, constraint);
      continue;
    }

    if (existing.strictness !== "hard" && constraint.strictness === "hard") {
      byId.set(constraint.id, constraint);
    }
  }

  return Array.from(byId.values());
}

export function extractStructuredRequirements(
  input: RecommendationApiRequest,
): StructuredRequirements {
  idCounter = 0;

  const budgetRule = parseBudgetRule(input);
  const selectedFeatures = input.selectedFeatures || [];
  const selectedFeatureSizeConstraints = selectedFeatures.flatMap(
    selectedFeatureToSizeConstraints,
  );
  const detailClassifications = classifyImportantDetails(input.priorities);
  const queryRequiredConstraints = extractQueryRequiredConstraints(input.query);
  const explicitAvoids = sentenceParts(input.avoid).map((item) =>
    constraint("feature", item, `Avoid: ${item}`, "avoid"),
  );
  const sizeConstraints = [
    ...parseSizeConstraints(input.query),
    ...parseSizeConstraints(input.priorities),
    ...selectedFeatureSizeConstraints,
  ];
  const specConstraints = collectSpecConstraints(input, selectedFeatures);
  const requiredConstraints: StructuredConstraint[] = [];
  const avoidConstraints: StructuredConstraint[] = [];
  const preferredConstraints: StructuredConstraint[] = [];
  const ambiguousConstraints: StructuredConstraint[] = [];

  if (budgetRule && budgetRule.operator === "max") {
    addUnique(
      requiredConstraints,
      constraint("budget", String(budgetRule.amount), budgetRule.label, "budget"),
    );
  }

  for (const feature of selectedFeatures) {
    const item = selectedFeatureToConstraint(feature);

    if (
      typeof feature !== "string" &&
      (feature.operator === "not_equals" || feature.operator === "not_includes")
    ) {
      addUnique(
        avoidConstraints,
        constraint(
          item.type,
          selectedSmartFeatureSearchText(feature),
          `Avoid: ${selectedSmartFeatureSearchText(feature)}`,
          "smart_feature",
        ),
      );
      continue;
    }

    if (
      item.type === "size" &&
      selectedFeatureSizeConstraints.some((size) =>
        normalizeText(size.label).includes(normalizeText(item.value)),
      )
    ) {
      continue;
    }

    addUnique(requiredConstraints, item);
  }

  for (const item of detailClassifications.required) {
    addUnique(requiredConstraints, item);
  }

  for (const item of queryRequiredConstraints) {
    addUnique(requiredConstraints, item);
  }

  for (const item of [...detailClassifications.avoid, ...explicitAvoids]) {
    addUnique(avoidConstraints, item);
  }

  for (const item of detailClassifications.preferred) {
    addUnique(preferredConstraints, item);
  }

  for (const item of detailClassifications.ambiguous) {
    const normalized = normalizeText(item.value);
    const isProbablyNegative = negativePhrases.some((phrase) =>
      normalized.includes(normalizeText(phrase)),
    );

    addUnique(isProbablyNegative ? avoidConstraints : ambiguousConstraints, item);
  }

  const allConstraints = [
    ...requiredConstraints,
    ...avoidConstraints,
    ...preferredConstraints,
  ];
  const colorConstraints = allConstraints.filter((item) => item.type === "color");
  const materialConstraints = allConstraints.filter(
    (item) => item.type === "material",
  );
  const brandConstraints = allConstraints.filter((item) => item.type === "brand");
  const summary = [
    ...requiredSummaryLines(requiredConstraints),
    ...sizeConstraints.map((item) => `Required: ${item.label}`),
    ...avoidConstraints.map((item) => item.label),
    ...preferredConstraints.map((item) => `Preferred: ${item.label}`),
    ...ambiguousConstraints.map((item) => `Needs review: ${item.label}`),
  ];
  const parsed = structuredRequirementsSchema.parse({
    requiredConstraints,
    avoidConstraints,
    preferredConstraints,
    sizeConstraints,
    specConstraints,
    colorConstraints,
    materialConstraints,
    brandConstraints,
    budgetRules: budgetRule ? [budgetRule] : [],
    ambiguousConstraints,
    summary,
  });

  return parsed;
}

export function constraintsToText(requirements?: StructuredRequirements) {
  if (!requirements) {
    return "No structured requirements were extracted.";
  }

  return requirements.summary.length > 0
    ? requirements.summary.join("\n")
    : "No structured requirements were extracted.";
}

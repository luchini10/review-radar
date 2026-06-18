import type {
  SelectedSmartFeature,
  SmartFeature,
  SmartFeatureOperator,
  SmartFeatureValue,
} from "@/types/smart-features";
import { smartFeatureCategoryKey } from "./smartFeatureCategory.ts";

export { smartFeatureCategoryKey };

export type LegacySelectedFeature = string;
export type AnySelectedFeature = SelectedSmartFeature | LegacySelectedFeature;

const validTypes = new Set(["enum", "boolean", "number", "range", "text", "exclusion"]);
const validOperators = new Set([
  "equals",
  "not_equals",
  "includes",
  "not_includes",
  "lte",
  "gte",
  "between",
  "required",
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.$"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string) {
  return normalize(value).replace(/\s+/g, "-");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatValueWithUnit(value: string, unit: string | undefined) {
  const cleanUnit = unit?.trim();

  if (!cleanUnit) {
    return value;
  }

  const normalizedValue = normalize(value);
  const normalizedUnit = normalize(cleanUnit);

  if (
    normalizedUnit &&
    new RegExp(`(?:^|\\s)${escapeRegExp(normalizedUnit)}$`, "i").test(normalizedValue)
  ) {
    return value;
  }

  return `${value} ${cleanUnit}`;
}

function parseNumber(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match?.[0] ? Number(match[0]) : null;
}

function parseRange(value: string) {
  const match = value
    .replace(/,/g, "")
    .match(/(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/i);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return [Number(match[1]), Number(match[2])] as [number, number];
}

export function selectedSmartFeatureLabel(feature: AnySelectedFeature) {
  if (typeof feature === "string") {
    return feature;
  }

  const rawValue = Array.isArray(feature.value)
    ? `${feature.value[0]}-${feature.value[1]}`
    : String(feature.value);
  const value = formatValueWithUnit(rawValue, feature.unit);
  const operator =
    feature.operator === "lte"
      ? "under "
      : feature.operator === "gte"
        ? "at least "
        : feature.operator === "not_equals" ||
            feature.operator === "not_includes"
          ? "not "
          : "";

  return feature.operator === "required" && feature.value === true
    ? feature.name
    : `${feature.name}: ${operator}${value}`;
}

export function selectedSmartFeatureSearchText(feature: AnySelectedFeature) {
  if (typeof feature === "string") {
    const [, ...rest] = feature.split(":");
    return (rest.join(":") || feature).trim();
  }

  const rawValue = Array.isArray(feature.value)
    ? `${feature.value[0]} to ${feature.value[1]}`
    : String(feature.value);
  const value = formatValueWithUnit(rawValue, feature.unit);

  if (feature.operator === "lte") {
    return `${feature.name} under ${value}`;
  }

  if (feature.operator === "gte") {
    return `${feature.name} at least ${value}`;
  }

  if (feature.operator === "between") {
    return `${feature.name} ${value}`;
  }

  if (feature.operator === "not_equals" || feature.operator === "not_includes") {
    return `without ${feature.name} ${value}`;
  }

  if (feature.operator === "required" && feature.value === true) {
    return feature.name;
  }

  return `${feature.name} ${value}`.trim();
}

export function selectedSmartFeatureKey(feature: AnySelectedFeature) {
  return typeof feature === "string"
    ? slug(feature)
    : slug(
        [
          feature.id,
          feature.name,
          feature.operator,
          Array.isArray(feature.value)
            ? feature.value.join("-")
            : String(feature.value),
          feature.unit || "",
        ].join(" "),
      );
}

export function isSelectedSmartFeature(value: unknown): value is SelectedSmartFeature {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<SelectedSmartFeature>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    validTypes.has(candidate.type) &&
    typeof candidate.operator === "string" &&
    validOperators.has(candidate.operator) &&
    candidate.required === true &&
    candidate.source === "smart_features" &&
    candidate.value !== undefined
  );
}

export function legacyStringToSelectedSmartFeature(value: string): SelectedSmartFeature {
  const [featureName, ...rest] = value.split(":");
  const name = featureName.trim() || "Feature";
  const rawValue = rest.join(":").trim() || name;

  return {
    id: slug(`${name}-${rawValue}`),
    name,
    type: normalize(name).includes("color")
      ? "enum"
      : normalize(name).includes("size") || normalize(name).includes("width")
        ? "number"
        : "text",
    operator: "equals",
    value: rawValue,
    required: true,
    source: "smart_features",
  };
}

export function normalizeSelectedSmartFeatures(
  values: unknown,
): SelectedSmartFeature[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const features = values.flatMap((item) => {
    if (isSelectedSmartFeature(item)) {
      return [item];
    }

    return typeof item === "string" && item.trim()
      ? [legacyStringToSelectedSmartFeature(item.trim())]
      : [];
  });
  const seen = new Set<string>();

  return features.filter((feature) => {
    const key = selectedSmartFeatureKey(feature);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function inferOperator(rawValue: string, feature: SmartFeature): SmartFeatureOperator {
  const value = normalize(rawValue);

  if (feature.type === "boolean") {
    return "required";
  }

  if (/\b(?:under|less than|below|no more than|at most|max|maximum)\b|≤|<=/i.test(value)) {
    return "lte";
  }

  if (/\b(?:at least|min|minimum|more than|over)\b|≥|>=/i.test(value)) {
    return "gte";
  }

  if (parseRange(rawValue)) {
    return "between";
  }

  return feature.operators.includes("equals") ? "equals" : feature.operators[0] || "equals";
}

function valueForOperator(rawValue: string, operator: SmartFeatureOperator, feature: SmartFeature): SmartFeatureValue {
  if (feature.type === "boolean") {
    return true;
  }

  if (operator === "between") {
    return parseRange(rawValue) || rawValue.trim();
  }

  if (
    feature.type === "number" ||
    feature.type === "range" ||
    operator === "lte" ||
    operator === "gte"
  ) {
    const parsed = parseNumber(rawValue);

    return parsed === null ? rawValue.trim() : parsed;
  }

  return rawValue.trim();
}

export function createSelectedSmartFeature(
  feature: SmartFeature,
  rawValue: string,
): SelectedSmartFeature {
  const operator = inferOperator(rawValue, feature);
  const value = valueForOperator(rawValue, operator, feature);
  const valueKey = Array.isArray(value) ? value.join("-") : String(value);

  return {
    id: slug(`${feature.id || feature.name}-${operator}-${valueKey}`),
    name: feature.name,
    type: feature.type,
    operator,
    value,
    unit: feature.unit || undefined,
    required: true,
    source: "smart_features",
  };
}

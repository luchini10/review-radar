import type { RecommendationApiRequest } from "@/types/review-radar";
import { getSearchValidationError, USER_ERROR_MESSAGES } from "./errorMessages.ts";
import {
  isSelectedSmartFeature,
  normalizeSelectedSmartFeatures,
} from "./smartFeatureSelection.ts";

const QUERY_MAX_LENGTH = 200;
const BUDGET_MAX_LENGTH = 500;
const DETAILS_MAX_LENGTH = 2_000;
const LEGACY_FEATURE_MAX_LENGTH = 500;
const FEATURE_ID_MAX_LENGTH = 100;
const FEATURE_NAME_MAX_LENGTH = 200;
const FEATURE_VALUE_MAX_LENGTH = 500;
const FEATURE_UNIT_MAX_LENGTH = 50;

export const RECOMMENDATION_REQUEST_ERROR_MESSAGES = {
  invalidAvoid: "Deal-breakers must be text.",
  invalidBody: "The request body must be a JSON object.",
  invalidBudget: "Budget must be text.",
  invalidPriorities: "Important details must be text.",
  invalidSmartFeature: "One Smart Feature selection could not be read.",
  invalidSmartFeatureList: "Smart Features must be sent as a list of selections.",
  queryTooLong: "The product search is too long.",
  tooManySmartFeatures: "Choose up to 12 Smart Features.",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalStringError(field: keyof RecommendationApiRequest) {
  if (field === "budget") {
    return RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidBudget;
  }
  if (field === "priorities") {
    return RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidPriorities;
  }
  if (field === "avoid") {
    return RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidAvoid;
  }
  return "This field must be text.";
}

function getOptionalString(
  body: Record<string, unknown>,
  field: keyof RecommendationApiRequest,
) {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return { error: optionalStringError(field) };

  const maximumLength =
    field === "budget" ? BUDGET_MAX_LENGTH : DETAILS_MAX_LENGTH;
  if (value.length > maximumLength) {
    return { error: optionalStringError(field) };
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function getOptionalSelectedFeatures(body: Record<string, unknown>) {
  const value = body.selectedFeatures;
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    return {
      error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidSmartFeatureList,
    };
  }
  if (value.length > 12) {
    return {
      error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.tooManySmartFeatures,
    };
  }

  const expectedKeys = new Set([
    "id",
    "name",
    "type",
    "operator",
    "value",
    "unit",
    "required",
    "source",
  ]);
  const featureValueIsBounded = (featureValue: unknown) => {
    if (typeof featureValue === "string") {
      return featureValue.length <= FEATURE_VALUE_MAX_LENGTH;
    }
    if (typeof featureValue === "number") return Number.isFinite(featureValue);
    if (typeof featureValue === "boolean") return true;
    return (
      Array.isArray(featureValue) &&
      featureValue.length === 2 &&
      featureValue.every(
        (item) => typeof item === "number" && Number.isFinite(item),
      )
    );
  };
  const featureIsBounded = (item: unknown) => {
    if (item === null || item === undefined) return true;
    if (typeof item === "string") {
      return item.length <= LEGACY_FEATURE_MAX_LENGTH;
    }
    if (
      !isSelectedSmartFeature(item) ||
      Object.keys(item).some((key) => !expectedKeys.has(key))
    ) {
      return false;
    }
    return (
      item.id.trim().length > 0 &&
      item.id.length <= FEATURE_ID_MAX_LENGTH &&
      item.name.trim().length > 0 &&
      item.name.length <= FEATURE_NAME_MAX_LENGTH &&
      featureValueIsBounded(item.value) &&
      (item.unit === undefined ||
        (typeof item.unit === "string" &&
          item.unit.length <= FEATURE_UNIT_MAX_LENGTH))
    );
  };
  if (!value.every(featureIsBounded)) {
    return {
      error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidSmartFeature,
    };
  }

  const items = normalizeSelectedSmartFeatures(value);
  const nonEmptyInputCount = value.filter(
    (item) =>
      item !== null &&
      item !== undefined &&
      !(typeof item === "string" && !item.trim()),
  ).length;
  if (items.length === 0 && nonEmptyInputCount > 0) {
    return {
      error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidSmartFeature,
    };
  }

  return items.slice(0, 12);
}

export function validateRecommendationRequest(body: unknown):
  | { data: RecommendationApiRequest }
  | { error: string } {
  if (!isRecord(body)) {
    return { error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.invalidBody };
  }

  const query = body.query;
  if (typeof query !== "string") {
    return { error: USER_ERROR_MESSAGES.emptySearch };
  }
  if (query.length > QUERY_MAX_LENGTH) {
    return { error: RECOMMENDATION_REQUEST_ERROR_MESSAGES.queryTooLong };
  }

  const searchValidationError = getSearchValidationError(query);
  if (searchValidationError) return { error: searchValidationError };

  const data: RecommendationApiRequest = { query: query.trim() };
  for (const field of ["budget", "priorities", "avoid"] as const) {
    const value = getOptionalString(body, field);
    if (isRecord(value) && typeof value.error === "string") {
      return { error: value.error };
    }
    if (typeof value === "string") data[field] = value;
  }

  const selectedFeatures = getOptionalSelectedFeatures(body);
  if (isRecord(selectedFeatures) && typeof selectedFeatures.error === "string") {
    return { error: selectedFeatures.error };
  }
  if (Array.isArray(selectedFeatures) && selectedFeatures.length > 0) {
    data.selectedFeatures = selectedFeatures;
  }

  return { data };
}

export const recommendationRequestValidationTestExports = {
  getOptionalSelectedFeatures,
  getOptionalString,
  isRecord,
};

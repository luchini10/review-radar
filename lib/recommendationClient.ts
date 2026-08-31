import type {
  RecommendationApiRequest,
  SelectionProductRecommendation,
  SelectionRecommendationResult,
} from "../types/review-radar.ts";

type FetchImplementation = typeof fetch;

type RunRecommendationRequestOptions = {
  fetchImpl?: FetchImplementation;
  payload: RecommendationApiRequest;
  signal: AbortSignal;
};

export class RecommendationClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrice(value: unknown) {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.amount === "number" &&
      Number.isFinite(value.amount) &&
      value.amount > 0 &&
      value.currency === "USD")
  );
}

function isProduct(value: unknown): value is SelectionProductRecommendation {
  if (!isRecord(value)) return false;

  return (
    typeof value.category === "string" &&
    (value.imageUrl === null || typeof value.imageUrl === "string") &&
    typeof value.name === "string" &&
    isPrice(value.price) &&
    typeof value.productPageUrl === "string" &&
    value.productPageUrl.length > 0
  );
}

function selectionResult(value: unknown): SelectionRecommendationResult | null {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) return null;
  if (!value.recommendations.every(isProduct)) return null;

  return {
    recommendations: value.recommendations,
  };
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new RecommendationClientError(
      "ReviewRadar received an unexpected response.",
    );
  }
}

export async function runRecommendationRequest({
  fetchImpl = fetch,
  payload,
  signal,
}: RunRecommendationRequestOptions): Promise<SelectionRecommendationResult> {
  const response = await fetchImpl("/api/recommendations", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal,
  });
  const body = await parseJson(response);
  const error =
    isRecord(body) && typeof body.error === "string" ? body.error : null;

  if (!response.ok || error) {
    throw new RecommendationClientError(
      error || "ReviewRadar could not complete this product search.",
    );
  }

  const result = isRecord(body) ? selectionResult(body.result) : null;
  if (!result) {
    throw new RecommendationClientError(
      "ReviewRadar received an unexpected response.",
    );
  }

  return result;
}

export const recommendationClientTestExports = {
  isPrice,
  isProduct,
  selectionResult,
};

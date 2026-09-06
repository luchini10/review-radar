import type {
  RecommendationApiRequest,
  SelectionProductRecommendation,
  SelectionRecommendationResult,
} from "../types/review-radar.ts";
import { isProductImage } from "./productImage.ts";

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

function isProduct(value: unknown): value is SelectionProductRecommendation {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !["name", "productPageUrl", "image"].includes(key)) ||
      typeof value.name !== "string" || !value.name.trim() || value.name.length > 200 ||
      typeof value.productPageUrl !== "string" || value.productPageUrl.length > 2048) return false;
  try {
    const url = new URL(value.productPageUrl);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

function selectionResult(value: unknown): SelectionRecommendationResult | null {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) return null;
  if (value.recommendations.length > 5 || !value.recommendations.every(isProduct)) return null;

  return {
    recommendations: value.recommendations.map(({ name, productPageUrl, image }) => ({
      name,
      productPageUrl,
      // Invalid optional imagery must not discard a valid recommended product.
      ...(isProductImage(image) ? { image: {
        url: image.url, sourceUrl: image.sourceUrl, sourceTitle: image.sourceTitle,
        ...(image.productId ? { productId: image.productId } : {}),
      } } : {}),
    })),
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
  isProduct,
  selectionResult,
};

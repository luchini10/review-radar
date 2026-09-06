import { NextResponse } from "next/server.js";
import { readBoundedJsonBody } from "./boundedJsonRequest.ts";
import { createOpenAIClient } from "./openaiClient.ts";
import { DEFAULT_PAID_REQUEST_ADMISSION, type PaidRequestAdmission } from "./paidRequestAdmission.ts";
import { ProductResearchError, researchProducts } from "./productResearch.ts";
import { enrichProductImages } from "./productImages.ts";
import { validateRecommendationRequest } from "./recommendationRequestValidation.ts";
import { isRequestCancelledError, throwIfRequestCancelled } from "./requestCancellation.ts";
import { USER_ERROR_MESSAGES } from "./errorMessages.ts";
import type { SelectionRecommendationResult } from "../types/review-radar.ts";

type Dependencies = {
  createOpenAIClient: typeof createOpenAIClient;
  paidRequestAdmission: PaidRequestAdmission;
  researchProducts: typeof researchProducts;
  enrichProductImages: typeof enrichProductImages;
};
const defaults: Dependencies = {
  createOpenAIClient,
  paidRequestAdmission: DEFAULT_PAID_REQUEST_ADMISSION,
  researchProducts,
  enrichProductImages,
};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function handlePost(request: Request, dependencies: Dependencies) {
  const startedAt = performance.now();
  const admission = dependencies.paidRequestAdmission.tryAcquire();
  if (!admission.ok) {
    return json({ error: USER_ERROR_MESSAGES.temporaryRateLimit }, 429, {
      "Retry-After": String(admission.retryAfterSeconds),
    });
  }
  try {
    const body = await readBoundedJsonBody(request);
    if (!body.ok) {
      const tooLarge = body.reason === "body_too_large";
      return json({ error: tooLarge
        ? "The request body is too large."
        : "The request body must be valid JSON." }, tooLarge ? 413 : 400);
    }
    const validated = validateRecommendationRequest(body.value);
    if ("error" in validated) return json({ error: validated.error }, 400);
    throwIfRequestCancelled(request.signal);
    const key = process.env.OPENAI_API_KEY;
    if (!key) return json({ error: USER_ERROR_MESSAGES.searchUnavailable }, 503);
    const client = await dependencies.createOpenAIClient(key, { maxRetries: 0 });
    const researched = await dependencies.researchProducts({
      client,
      input: validated.data,
      signal: request.signal,
    });
    throwIfRequestCancelled(request.signal);
    const debug = process.env.NODE_ENV !== "production" && request.headers.get("x-reviewradar-debug") === "true";
    let result: SelectionRecommendationResult = researched.result;
    let imageDebug: Record<string, unknown>;
    try {
      const images = await dependencies.enrichProductImages({
        products: result.recommendations,
        apiKey: process.env.SERPER_API_KEY?.trim(),
        signal: request.signal,
      });
      result = { recommendations: images.recommendations };
      imageDebug = images.debug;
    } catch (error) {
      if (isRequestCancelledError(error)) throw error;
      throwIfRequestCancelled(request.signal);
      // Optional pictures must never turn successful research into a failed list.
      imageDebug = { imageEnrichmentFailed: true };
    }
    throwIfRequestCancelled(request.signal);
    return json(debug ? {
      result,
      debug: {
        architecture: "single_request_product_research",
        ...researched.debug,
        ...imageDebug,
        totalMs: Math.round(performance.now() - startedAt),
      },
    } : { result });
  } catch (error) {
    if (isRequestCancelledError(error) || request.signal.aborted) {
      return json({ error: USER_ERROR_MESSAGES.requestCancelled }, 499);
    }
    // Provider responses and exception messages may contain private data.
    const debug = process.env.NODE_ENV !== "production" && request.headers.get("x-reviewradar-debug") === "true";
    return json({ error: USER_ERROR_MESSAGES.searchUnavailable,
      ...(debug ? { debug: { failureReason: error instanceof ProductResearchError ? error.reason : "request_failed", totalMs: Math.round(performance.now() - startedAt) } } : {}),
    }, 502);
  } finally {
    admission.release();
  }
}

export function createRecommendationPostHandler(overrides: Partial<Dependencies> = {}) {
  const dependencies = { ...defaults, ...overrides };
  return (request: Request) => handlePost(request, dependencies);
}

import { NextResponse } from "next/server.js";

import { readBoundedJsonBody } from "../../../lib/boundedJsonRequest.ts";
import { createOpenAIClient } from "../../../lib/openaiClient.ts";
import {
  DEFAULT_PAID_REQUEST_ADMISSION,
  type PaidRequestAdmission,
} from "../../../lib/paidRequestAdmission.ts";
import { selectProducts } from "../../../lib/productSelection.ts";
import { detectRequirementConflicts } from "../../../lib/requirementConflicts.ts";
import { extractStructuredRequirements } from "../../../lib/requirementExtraction.ts";
import {
  RECOMMENDATION_REQUEST_ERROR_MESSAGES,
  validateRecommendationRequest,
} from "../../../lib/recommendationRequestValidation.ts";
import {
  isRequestCancelledError,
  throwIfRequestCancelled,
} from "../../../lib/requestCancellation.ts";
import { buildMarketScoutPlan } from "../../../lib/marketScout.ts";
import { USER_ERROR_MESSAGES } from "../../../lib/errorMessages.ts";

export const runtime = "nodejs";
export const maxDuration = 150;

const DEBUG_HEADER = "x-reviewradar-debug";

type TimingStage = {
  durationMs: number;
  label: string;
};

type RecommendationRouteDependencies = {
  buildMarketScoutPlan: typeof buildMarketScoutPlan;
  createOpenAIClient: typeof createOpenAIClient;
  paidRequestAdmission: PaidRequestAdmission;
  selectProducts: typeof selectProducts;
};

const defaultDependencies: RecommendationRouteDependencies = {
  buildMarketScoutPlan,
  createOpenAIClient,
  paidRequestAdmission: DEFAULT_PAID_REQUEST_ADMISSION,
  selectProducts,
};

function createRequestTiming() {
  const startedAt = performance.now();
  const stages: TimingStage[] = [];

  return {
    async measure<T>(label: string, operation: () => Promise<T>) {
      const stageStartedAt = performance.now();
      try {
        return await operation();
      } finally {
        stages.push({
          durationMs: Math.round(performance.now() - stageStartedAt),
          label,
        });
      }
    },
    measureSync<T>(label: string, operation: () => T) {
      const stageStartedAt = performance.now();
      try {
        return operation();
      } finally {
        stages.push({
          durationMs: Math.round(performance.now() - stageStartedAt),
          label,
        });
      }
    },
    summary() {
      return {
        slowestStages: [...stages]
          .sort((first, second) => second.durationMs - first.durationMs)
          .slice(0, 5),
        stages,
        totalMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}

function wantsLocalDebug(request: Request) {
  return (
    process.env.NODE_ENV !== "production" &&
    request.headers.get(DEBUG_HEADER) === "true"
  );
}

async function optionalOpenAIClient(
  apiKey: string | undefined,
  dependencies: RecommendationRouteDependencies,
) {
  if (!apiKey) return null;
  try {
    return await dependencies.createOpenAIClient(apiKey);
  } catch {
    return null;
  }
}

function requestCancelledResponse() {
  return NextResponse.json(
    { error: USER_ERROR_MESSAGES.requestCancelled },
    { headers: { "Cache-Control": "no-store" }, status: 499 },
  );
}

async function handlePost(
  request: Request,
  dependencies: RecommendationRouteDependencies,
) {
  const includeDebug = wantsLocalDebug(request);
  const timing = createRequestTiming();
  const admission = dependencies.paidRequestAdmission.tryAcquire();

  if (!admission.ok) {
    return NextResponse.json(
      { error: USER_ERROR_MESSAGES.temporaryRateLimit },
      {
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(admission.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  try {
    const bodyResult = await timing.measure("read_request_body", () =>
      readBoundedJsonBody(request),
    );
    if (!bodyResult.ok) {
      return NextResponse.json(
        {
          error:
            bodyResult.reason === "body_too_large"
              ? "The request body is too large."
              : "The request body must be valid JSON.",
        },
        {
          headers: { "Cache-Control": "no-store" },
          status: bodyResult.reason === "body_too_large" ? 413 : 400,
        },
      );
    }

    const validation = timing.measureSync("validate_request", () =>
      validateRecommendationRequest(bodyResult.value),
    );
    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { headers: { "Cache-Control": "no-store" }, status: 400 },
      );
    }

    const input = timing.measureSync("extract_requirements", () => ({
      ...validation.data,
      extractedRequirements: extractStructuredRequirements(validation.data),
    }));
    const conflicts = timing.measureSync("detect_requirement_conflicts", () =>
      detectRequirementConflicts(input),
    );
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: `Please fix conflicting requirements: ${conflicts.join(" ")}` },
        { headers: { "Cache-Control": "no-store" }, status: 400 },
      );
    }

    throwIfRequestCancelled(request.signal);
    const client = await timing.measure("create_optional_openai_client", () =>
      optionalOpenAIClient(process.env.OPENAI_API_KEY, dependencies),
    );
    const scoutPromise = timing.measure("openai_market_scout", () =>
      dependencies.buildMarketScoutPlan({
        client,
        input,
        signal: request.signal,
      }),
    );
    const selected = await timing.measure("select_products", () =>
      dependencies.selectProducts({
        input,
        plan: scoutPromise.then((scouted) => scouted.plan),
        signal: request.signal,
      }),
    );
    const scouted = await scoutPromise;
    throwIfRequestCancelled(request.signal);
    const everyShoppingSearchFailed =
      selected.telemetry.searchDiagnostics.length > 0 &&
      selected.telemetry.searchDiagnostics.every(
        (diagnostic) => Boolean(diagnostic.errorKind),
      );
    if (everyShoppingSearchFailed) {
      return NextResponse.json(
        { error: USER_ERROR_MESSAGES.searchUnavailable },
        { headers: { "Cache-Control": "no-store" }, status: 502 },
      );
    }
    const debug = {
      architecture: "market_quality_live_v4_independent_concurrent",
      marketScout: scouted.telemetry,
      openAiCalls: scouted.telemetry.openAiCalls,
      search: selected.telemetry,
      timing: timing.summary(),
    };

    return NextResponse.json(
      includeDebug
        ? { result: selected.result, debug }
        : { result: selected.result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isRequestCancelledError(error) || request.signal.aborted) {
      return requestCancelledResponse();
    }

    return NextResponse.json(
      includeDebug
        ? {
            error: "ReviewRadar could not complete this product search.",
            debug: {
              architecture: "market_quality_live_v4_independent_concurrent",
              error:
                error instanceof Error
                  ? { name: error.name, message: error.message.slice(0, 300) }
                  : { name: typeof error },
              timing: timing.summary(),
            },
          }
        : { error: "ReviewRadar could not complete this product search." },
      { headers: { "Cache-Control": "no-store" }, status: 502 },
    );
  } finally {
    admission.release();
  }
}

export function createRecommendationPostHandler(
  overrides: Partial<RecommendationRouteDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };
  return (request: Request) => handlePost(request, dependencies);
}

export const recommendationRouteTestExports = {
  requestErrorMessages: RECOMMENDATION_REQUEST_ERROR_MESSAGES,
  validateRequest: validateRecommendationRequest,
};

export const POST = createRecommendationPostHandler();

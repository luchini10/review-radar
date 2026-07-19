import { getSearchValidationError } from "./errorMessages.ts";
import { createOpenAIClient as createDefaultOpenAIClient } from "./openaiClient.ts";
import {
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "./directTerraResearchAdapter.ts";
import {
  isValidDirectTerraJobTokenSecret,
  issueDirectTerraJobToken,
  verifyDirectTerraJobToken,
} from "./directTerraJobToken.ts";
import {
  DIRECT_TERRA_API_VERSION,
  DIRECT_TERRA_JOB_TOKEN_HEADER,
  DIRECT_TERRA_JOB_TTL_MS,
  DIRECT_TERRA_POLL_AFTER_MS,
  type DirectTerraFailureResponse,
} from "./directTerraApiContract.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";
import type {
  SelectedSmartFeature,
  SmartFeatureOperator,
  SmartFeatureType,
  SmartFeatureValue,
} from "../types/smart-features.ts";

type DirectTerraEnvironment = {
  openAiApiKey: string | undefined;
  jobTokenSecret: string | undefined;
  enabled?: boolean;
};

type RouteHandler = (request: Request) => Promise<Response>;

export type DirectTerraRecommendationHandlers = {
  POST: RouteHandler;
  GET: RouteHandler;
  DELETE: RouteHandler;
};

type HandlerOptions = {
  createOpenAIClient?: typeof createDefaultOpenAIClient;
  getEnvironment?: () => DirectTerraEnvironment;
  now?: () => number;
  startResearch?: typeof startDirectTerraResearch;
  pollResearch?: typeof pollDirectTerraResearch;
  cancelResearch?: typeof cancelDirectTerraResearch;
};

const ERROR_MESSAGES = {
  invalidJson: "The request body must be valid JSON.",
  invalidRequest: "The shopper request is invalid.",
  invalidJob: "This research job is invalid. Please start a new search.",
  expiredJob: "This research job expired. Please start a new search.",
  missingConfig: "ReviewRadar's direct Terra mode is not configured.",
  researchCancelled: "This research job was cancelled.",
  researchFailed: "Research could not be completed safely. Please try again.",
  verificationFailed:
    "Research finished, but its citations could not be verified safely.",
} as const;

const FEATURE_TYPES = new Set<SmartFeatureType>([
  "enum",
  "boolean",
  "number",
  "range",
  "text",
  "exclusion",
]);
const FEATURE_OPERATORS = new Set<SmartFeatureOperator>([
  "equals",
  "not_equals",
  "includes",
  "not_includes",
  "lte",
  "gte",
  "between",
  "required",
]);
const ALLOWED_REQUEST_KEYS = new Set([
  "query",
  "budget",
  "priorities",
  "avoid",
  "selectedFeatures",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(body: unknown, status: number) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function failure(code: string, error: string, status: number) {
  return json(
    {
      pipeline: "direct_terra",
      version: DIRECT_TERRA_API_VERSION,
      state: "failed",
      code,
      error,
    } satisfies DirectTerraFailureResponse,
    status,
  );
}

function configuredEnvironment(environment: DirectTerraEnvironment) {
  return Boolean(
    environment.enabled !== false &&
      environment.openAiApiKey?.trim() &&
      environment.jobTokenSecret &&
      isValidDirectTerraJobTokenSecret(environment.jobTokenSecret),
  );
}

function cleanOptionalText(value: unknown, maximumLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return undefined;
  return text.length <= maximumLength ? text : null;
}

function validFeatureValue(value: unknown): value is SmartFeatureValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "string" || value.length <= 500;
  }
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function cleanFeature(value: unknown): SelectedSmartFeature | null {
  if (!isRecord(value)) return null;
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
  if (Object.keys(value).some((key) => !expectedKeys.has(key))) return null;
  if (
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    value.id.length > 100 ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.length > 200 ||
    typeof value.type !== "string" ||
    !FEATURE_TYPES.has(value.type as SmartFeatureType) ||
    typeof value.operator !== "string" ||
    !FEATURE_OPERATORS.has(value.operator as SmartFeatureOperator) ||
    !validFeatureValue(value.value) ||
    value.required !== true ||
    value.source !== "smart_features" ||
    (value.unit !== undefined &&
      (typeof value.unit !== "string" || value.unit.length > 50))
  ) {
    return null;
  }
  return {
    id: value.id.trim(),
    name: value.name.trim(),
    type: value.type as SmartFeatureType,
    operator: value.operator as SmartFeatureOperator,
    value: value.value,
    ...(typeof value.unit === "string" && value.unit.trim()
      ? { unit: value.unit.trim() }
      : {}),
    required: true,
    source: "smart_features",
  };
}

function validateRequest(body: unknown): DirectTerraShopperRequest | null {
  if (!isRecord(body)) return null;
  if (Object.keys(body).some((key) => !ALLOWED_REQUEST_KEYS.has(key))) return null;
  if (typeof body.query !== "string" || body.query.length > 200) return null;
  const query = body.query.trim();
  if (getSearchValidationError(query)) return null;
  const budget = cleanOptionalText(body.budget, 500);
  const priorities = cleanOptionalText(body.priorities, 2_000);
  const avoid = cleanOptionalText(body.avoid, 2_000);
  if (budget === null || priorities === null || avoid === null) return null;

  let selectedFeatures: SelectedSmartFeature[] | undefined;
  if (body.selectedFeatures !== undefined) {
    if (!Array.isArray(body.selectedFeatures) || body.selectedFeatures.length > 25) {
      return null;
    }
    const parsedFeatures = body.selectedFeatures.map(cleanFeature);
    if (
      !parsedFeatures.every(
        (feature): feature is SelectedSmartFeature => feature !== null,
      )
    ) {
      return null;
    }
    selectedFeatures = parsedFeatures;
  }

  return {
    query,
    ...(budget ? { budget } : {}),
    ...(priorities ? { priorities } : {}),
    ...(avoid ? { avoid } : {}),
    ...(selectedFeatures?.length ? { selectedFeatures } : {}),
  };
}

function tokenFromRequest(request: Request) {
  return request.headers.get(DIRECT_TERRA_JOB_TOKEN_HEADER)?.trim() || "";
}

function failureForResearchReason(reason: string) {
  if (reason === "cancelled") {
    return failure("research_cancelled", ERROR_MESSAGES.researchCancelled, 409);
  }
  if (reason === "invalid_config") {
    return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
  }
  if (reason === "invalid_report") {
    return failure("verification_failed", ERROR_MESSAGES.verificationFailed, 502);
  }
  return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
}

export function createDirectTerraRecommendationHandlers({
  createOpenAIClient = createDefaultOpenAIClient,
  getEnvironment = () => ({
    openAiApiKey: process.env.OPENAI_API_KEY,
    jobTokenSecret: process.env.REVIEW_RADAR_JOB_TOKEN_SECRET,
    enabled: process.env.REVIEW_RADAR_DIRECT_TERRA === "on",
  }),
  now = Date.now,
  startResearch = startDirectTerraResearch,
  pollResearch = pollDirectTerraResearch,
  cancelResearch = cancelDirectTerraResearch,
}: HandlerOptions = {}): DirectTerraRecommendationHandlers {
  const POST: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("invalid_json", ERROR_MESSAGES.invalidJson, 400);
    }
    const shopperRequest = validateRequest(body);
    if (!shopperRequest) {
      return failure("invalid_request", ERROR_MESSAGES.invalidRequest, 400);
    }

    try {
      const client = await createOpenAIClient(environment.openAiApiKey!, {
        maxRetries: 0,
      });
      const result = await startResearch({ client, shopperRequest, now });
      if (!result.ok) return failureForResearchReason(result.reason);
      const issuedAtMs = now();
      const token = issueDirectTerraJobToken({
        responseId: result.responseId,
        promptVersion: result.promptVersion,
        promptHash: result.promptHash,
        secret: environment.jobTokenSecret!,
        nowMs: issuedAtMs,
        ttlMs: DIRECT_TERRA_JOB_TTL_MS,
      });
      return json(
        {
          pipeline: "direct_terra",
          version: DIRECT_TERRA_API_VERSION,
          state: "pending",
          status: result.status === "queued" ? "queued" : "in_progress",
          jobToken: token,
          pollAfterMs: DIRECT_TERRA_POLL_AFTER_MS,
          expiresAtMs: issuedAtMs + DIRECT_TERRA_JOB_TTL_MS,
        },
        202,
      );
    } catch {
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    }
  };

  const GET: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const token = tokenFromRequest(request);
    const verified = verifyDirectTerraJobToken({
      token,
      secret: environment.jobTokenSecret!,
      nowMs: now(),
    });
    if (!verified.ok) {
      return failure(
        verified.reason === "expired_token" ? "expired_job" : "invalid_job",
        verified.reason === "expired_token"
          ? ERROR_MESSAGES.expiredJob
          : ERROR_MESSAGES.invalidJob,
        verified.reason === "expired_token" ? 410 : 400,
      );
    }

    try {
      const client = await createOpenAIClient(environment.openAiApiKey!, {
        maxRetries: 0,
      });
      const result = await pollResearch({
        client,
        responseId: verified.payload.responseId,
        promptVersion: verified.payload.promptVersion,
        promptHash: verified.payload.promptHash,
        now,
      });
      if (!result.ok) return failureForResearchReason(result.reason);
      if (result.state === "pending") {
        return json(
          {
            pipeline: "direct_terra",
            version: DIRECT_TERRA_API_VERSION,
            state: "pending",
            status: result.status,
            jobToken: token,
            pollAfterMs: DIRECT_TERRA_POLL_AFTER_MS,
            expiresAtMs: verified.payload.expiresAtMs,
          },
          202,
        );
      }
      return json(
        {
          pipeline: "direct_terra",
          version: DIRECT_TERRA_API_VERSION,
          state: "completed",
          reportMarkdown: result.reportMarkdown,
          citationUrls: result.citationUrls,
          sourceHosts: result.sourceHosts,
          transactionalStatus: "unverified",
        },
        200,
      );
    } catch {
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    }
  };

  const DELETE: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const verified = verifyDirectTerraJobToken({
      token: tokenFromRequest(request),
      secret: environment.jobTokenSecret!,
      nowMs: now(),
    });
    if (!verified.ok) {
      return failure(
        verified.reason === "expired_token" ? "expired_job" : "invalid_job",
        verified.reason === "expired_token"
          ? ERROR_MESSAGES.expiredJob
          : ERROR_MESSAGES.invalidJob,
        verified.reason === "expired_token" ? 410 : 400,
      );
    }

    try {
      const client = await createOpenAIClient(environment.openAiApiKey!, {
        maxRetries: 0,
      });
      const result = await cancelResearch({
        client,
        responseId: verified.payload.responseId,
        promptVersion: verified.payload.promptVersion,
        promptHash: verified.payload.promptHash,
        now,
      });
      if (!result.ok) return failureForResearchReason(result.reason);
      if (result.status !== "cancelled") {
        return failure(
          "job_not_cancelled",
          "This research job could no longer be cancelled.",
          409,
        );
      }
      return json(
        {
          pipeline: "direct_terra",
          version: DIRECT_TERRA_API_VERSION,
          state: "cancelled",
          status: "cancelled",
        },
        200,
      );
    } catch {
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    }
  };

  return { POST, GET, DELETE };
}

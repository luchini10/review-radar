import {
  createOpenAIClient as createDefaultOpenAIClient,
} from "./openaiClient.ts";
import { buildNormalizedShopperRequest } from "./autonomousResearchContract.ts";
import { formatTwoLayerMasterPromptAnswer } from "./twoLayerFormatter.ts";
import {
  buildTwoLayerProductCards,
  TWO_LAYER_PRESENTATION_VERSION,
} from "./twoLayerRecommendation.ts";
import {
  cancelTwoLayerResearch,
  pollTwoLayerResearch,
  startTwoLayerResearch,
} from "./twoLayerResearchAdapter.ts";
import {
  isValidTwoLayerJobTokenSecret,
  issueTwoLayerJobToken,
  verifyTwoLayerJobToken,
} from "./twoLayerJobToken.ts";
import {
  TWO_LAYER_API_VERSION,
  TWO_LAYER_JOB_TTL_MS,
  TWO_LAYER_POLL_AFTER_MS,
  type TwoLayerDisplaySource,
  type TwoLayerFailureResponse,
} from "./twoLayerApiContract.ts";
import type { RecommendationApiRequest } from "../types/review-radar.ts";

type ValidatedRequest =
  | { data: RecommendationApiRequest }
  | { error: string };

type TwoLayerEnvironment = {
  openAiApiKey: string | undefined;
  jobTokenSecret: string | undefined;
};

type TwoLayerRecommendationHandlerOptions = {
  createOpenAIClient?: typeof createDefaultOpenAIClient;
  getEnvironment?: () => TwoLayerEnvironment;
  now?: () => number;
  validateRequest: (body: unknown) => ValidatedRequest;
  startResearch?: typeof startTwoLayerResearch;
  pollResearch?: typeof pollTwoLayerResearch;
  cancelResearch?: typeof cancelTwoLayerResearch;
};

type RouteHandler = (request: Request) => Promise<Response>;

export type TwoLayerRecommendationHandlers = {
  POST: RouteHandler;
  GET: RouteHandler;
  DELETE: RouteHandler;
};

const ERROR_MESSAGES = {
  invalidJson: "The request body must be valid JSON.",
  invalidJob: "This research job is invalid. Please start a new search.",
  expiredJob: "This research job expired. Please start a new search.",
  missingConfig: "ReviewRadar's two-layer research mode is not configured.",
  researchCancelled: "This research job was cancelled.",
  researchFailed: "Research could not be completed safely. Please try again.",
  startFailed: "Research could not be started. Please try again.",
  verificationFailed:
    "Research finished, but its evidence could not be verified safely.",
} as const;

function json(body: unknown, status: number) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function failure(code: string, error: string, status: number) {
  return json(
    {
      pipeline: "two_layer",
      version: TWO_LAYER_API_VERSION,
      state: "failed",
      code,
      error,
    } satisfies TwoLayerFailureResponse,
    status,
  );
}

function sourceLabel(role: string) {
  const labels: Record<string, string> = {
    official_product: "Official product",
    purchase_page: "Purchase page",
    manufacturer_spec: "Manufacturer specification",
    professional_test: "Professional test",
    owner_feedback: "Owner feedback",
    warranty_support: "Warranty or support",
    other: "Research source",
  };
  return labels[role] || labels.other;
}

function configuredEnvironment(environment: TwoLayerEnvironment) {
  return Boolean(
    environment.openAiApiKey?.trim() &&
      environment.jobTokenSecret &&
      isValidTwoLayerJobTokenSecret(environment.jobTokenSecret),
  );
}

function jobTokenFromRequest(request: Request) {
  try {
    return new URL(request.url).searchParams.get("job") || "";
  } catch {
    return "";
  }
}

function failureForResearchReason(reason: string) {
  if (reason === "cancelled") {
    return failure("research_cancelled", ERROR_MESSAGES.researchCancelled, 409);
  }
  if (reason === "invalid_config") {
    return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
  }
  return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
}

export function createTwoLayerRecommendationHandlers({
  createOpenAIClient = createDefaultOpenAIClient,
  getEnvironment = () => ({
    openAiApiKey: process.env.OPENAI_API_KEY,
    jobTokenSecret: process.env.REVIEW_RADAR_JOB_TOKEN_SECRET,
  }),
  now = Date.now,
  validateRequest,
  startResearch = startTwoLayerResearch,
  pollResearch = pollTwoLayerResearch,
  cancelResearch = cancelTwoLayerResearch,
}: TwoLayerRecommendationHandlerOptions): TwoLayerRecommendationHandlers {
  const POST: RouteHandler = async (request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: ERROR_MESSAGES.invalidJson }, 400);
    }
    const validation = validateRequest(body);
    if ("error" in validation) {
      return json({ error: validation.error }, 400);
    }

    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }

    try {
      const client = await createOpenAIClient(environment.openAiApiKey!, {
        maxRetries: 0,
      });
      const result = await startResearch({
        client,
        normalizedRequest: buildNormalizedShopperRequest(validation.data),
        now,
      });
      if (!result.ok) {
        return failureForResearchReason(result.reason);
      }

      const issuedAtMs = now();
      const expiresAtMs = issuedAtMs + TWO_LAYER_JOB_TTL_MS;
      const jobToken = issueTwoLayerJobToken({
        responseId: result.responseId,
        promptVersion: result.promptVersion,
        promptHash: result.promptHash,
        secret: environment.jobTokenSecret!,
        nowMs: issuedAtMs,
        ttlMs: TWO_LAYER_JOB_TTL_MS,
      });
      return json(
        {
          pipeline: "two_layer",
          version: TWO_LAYER_API_VERSION,
          state: "pending",
          status: result.status === "queued" ? "queued" : "in_progress",
          jobToken,
          pollAfterMs: TWO_LAYER_POLL_AFTER_MS,
          expiresAtMs,
        },
        202,
      );
    } catch {
      return failure("research_start_failed", ERROR_MESSAGES.startFailed, 502);
    }
  };

  const GET: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const token = jobTokenFromRequest(request);
    const verified = verifyTwoLayerJobToken({
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
            pipeline: "two_layer",
            version: TWO_LAYER_API_VERSION,
            state: "pending",
            status: result.status,
            jobToken: token,
            pollAfterMs: TWO_LAYER_POLL_AFTER_MS,
            expiresAtMs: verified.payload.expiresAtMs,
          },
          202,
        );
      }

      let formatted;
      let presentation;
      try {
        formatted = formatTwoLayerMasterPromptAnswer({
          rawResearchText: result.rawResearchText,
          responseSources: result.responseSources,
        });
        presentation = buildTwoLayerProductCards({
          rawResearchText: result.rawResearchText,
          responseSourceUrls: result.responseSources.map((source) => source.url),
          formattedOutput: formatted.formattedOutput,
          receiptInputs: [],
        });
      } catch {
        return failure(
          "verification_failed",
          ERROR_MESSAGES.verificationFailed,
          502,
        );
      }

      const sources: TwoLayerDisplaySource[] =
        formatted.formattedOutput.sources.map((source) => ({
          id: source.id,
          label: sourceLabel(source.role),
          title: source.title,
          url: source.url,
        }));
      return json(
        {
          pipeline: "two_layer",
          version: TWO_LAYER_API_VERSION,
          state: "completed",
          presentationVersion: TWO_LAYER_PRESENTATION_VERSION,
          cards: presentation.cards,
          sources,
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
    const verified = verifyTwoLayerJobToken({
      token: jobTokenFromRequest(request),
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
          pipeline: "two_layer",
          version: TWO_LAYER_API_VERSION,
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

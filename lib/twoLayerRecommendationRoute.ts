import {
  createOpenAIClient as createDefaultOpenAIClient,
} from "./openaiClient.ts";
import { buildNormalizedShopperRequest } from "./autonomousResearchContract.ts";
import {
  buildTwoLayerStructuredProductCards,
  TWO_LAYER_PRESENTATION_VERSION,
  type TwoLayerStructuredOutputDiagnostic,
  type TwoLayerStructuredOutputFailureCause,
} from "./twoLayerRecommendation.ts";
import { twoLayerResearchDisplayText } from "./twoLayerDisplayText.ts";
import {
  hashTwoLayerRequirementTexts,
} from "./twoLayerMasterPrompt.ts";
import {
  cancelTwoLayerResearch,
  pollTwoLayerResearch,
  startTwoLayerResearch,
  type TwoLayerResearchLedger,
} from "./twoLayerResearchAdapter.ts";
import {
  isValidTwoLayerJobTokenSecret,
  issueTwoLayerJobToken,
  verifyTwoLayerJobToken,
} from "./twoLayerJobToken.ts";
import {
  TWO_LAYER_API_VERSION,
  TWO_LAYER_JOB_TOKEN_HEADER,
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

export type TwoLayerVerificationFailureDiagnostic =
  | {
      stage: "research_contract";
      reason: "invalid_json" | "schema_invalid" | "contract_invalid";
      cause: TwoLayerStructuredOutputFailureCause;
    }
  | {
      stage: "presentation";
      reason: "presentation_validation";
      cause: "presentation_unknown";
    };

export type TwoLayerCompletionDiagnostic = {
  modelRequested: string;
  modelReturned: string | null;
  durationMs: number;
  usage: TwoLayerResearchLedger["usage"];
  sourceCount: number;
};

export type TwoLayerStructuredCompletionDiagnostic =
  TwoLayerStructuredOutputDiagnostic;

type TwoLayerRecommendationHandlerOptions = {
  createOpenAIClient?: typeof createDefaultOpenAIClient;
  getEnvironment?: () => TwoLayerEnvironment;
  now?: () => number;
  validateRequest: (body: unknown) => ValidatedRequest;
  startResearch?: typeof startTwoLayerResearch;
  pollResearch?: typeof pollTwoLayerResearch;
  cancelResearch?: typeof cancelTwoLayerResearch;
  buildPresentation?: typeof buildTwoLayerStructuredProductCards;
  onVerificationFailure?: (
    diagnostic: TwoLayerVerificationFailureDiagnostic,
  ) => void;
  onResearchCompleted?: (diagnostic: TwoLayerCompletionDiagnostic) => void;
  onResearchStructured?: (
    diagnostic: TwoLayerStructuredCompletionDiagnostic,
  ) => void;
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
  return request.headers.get(TWO_LAYER_JOB_TOKEN_HEADER)?.trim() || "";
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

function defaultVerificationFailureReporter(
  diagnostic: TwoLayerVerificationFailureDiagnostic,
) {
  console.warn(
    "[ReviewRadar two-layer verification]",
    diagnostic.stage,
    diagnostic.reason,
    diagnostic.cause,
  );
}

function defaultCompletionReporter(diagnostic: TwoLayerCompletionDiagnostic) {
  console.info(
    "[ReviewRadar two-layer completion]",
    JSON.stringify(diagnostic),
  );
}

function defaultStructuredCompletionReporter(
  diagnostic: TwoLayerStructuredCompletionDiagnostic,
) {
  console.info(
    "[ReviewRadar two-layer structured contract]",
    JSON.stringify(diagnostic),
  );
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
  buildPresentation = buildTwoLayerStructuredProductCards,
  onVerificationFailure = defaultVerificationFailureReporter,
  onResearchCompleted = defaultCompletionReporter,
  onResearchStructured = defaultStructuredCompletionReporter,
}: TwoLayerRecommendationHandlerOptions): TwoLayerRecommendationHandlers {
  const reportVerificationFailure = (
    diagnostic: TwoLayerVerificationFailureDiagnostic,
  ) => {
    try {
      onVerificationFailure(diagnostic);
    } catch {
      // Observability must never change the fail-closed route response.
    }
  };
  const reportCompletion = (diagnostic: TwoLayerCompletionDiagnostic) => {
    try {
      onResearchCompleted(diagnostic);
    } catch {
      // Observability must never change the completed route response.
    }
  };
  const reportStructuredCompletion = (
    diagnostic: TwoLayerStructuredCompletionDiagnostic,
  ) => {
    try {
      onResearchStructured(diagnostic);
    } catch {
      // Observability must never change the completed route response.
    }
  };

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
      const normalizedRequest = buildNormalizedShopperRequest(validation.data);
      const result = await startResearch({
        client,
        normalizedRequest,
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
        requirementsHash: hashTwoLayerRequirementTexts(
          normalizedRequest.evaluation_requirements.map((item) => item.text),
        ),
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
      if (!result.ok) {
        if (result.ledger.status === "completed") {
          reportCompletion({
            modelRequested: result.ledger.modelRequested,
            modelReturned: result.ledger.modelReturned,
            durationMs: result.ledger.durationMs,
            usage: { ...result.ledger.usage },
            sourceCount: result.ledger.sourceCount,
          });
        }
        if ("verification" in result) {
          reportVerificationFailure({
            stage: "research_contract",
            reason: result.verification.reason,
            cause: result.verification.cause,
          });
          return failure(
            "verification_failed",
            ERROR_MESSAGES.verificationFailed,
            502,
          );
        }
        return failureForResearchReason(result.reason);
      }
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

      reportCompletion({
        modelRequested: result.ledger.modelRequested,
        modelReturned: result.ledger.modelReturned,
        durationMs: result.ledger.durationMs,
        usage: { ...result.ledger.usage },
        sourceCount: result.ledger.sourceCount,
      });

      if (
        !result.research.recommendations.every(
          (recommendation) =>
            hashTwoLayerRequirementTexts(
              recommendation.requirement_checks.map(
                (requirement) => requirement.requirement,
              ),
            ) === verified.payload.requirementsHash,
        )
      ) {
        reportVerificationFailure({
          stage: "research_contract",
          reason: "contract_invalid",
          cause: "requirement_contract_mismatch",
        });
        return failure(
          "verification_failed",
          ERROR_MESSAGES.verificationFailed,
          502,
        );
      }
      reportStructuredCompletion(result.structureDiagnostic);

      let presentation;
      try {
        presentation = buildPresentation({
          research: result.research,
          receiptInputs: [],
        });
      } catch {
        reportVerificationFailure({
          stage: "presentation",
          reason: "presentation_validation",
          cause: "presentation_unknown",
        });
        return failure(
          "verification_failed",
          ERROR_MESSAGES.verificationFailed,
          502,
        );
      }

      const sources: TwoLayerDisplaySource[] =
        result.research.sources.map((source) => ({
          id: source.id,
          label: sourceLabel(source.role),
          title: twoLayerResearchDisplayText(source.title),
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

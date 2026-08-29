import { createOpenAIClient as createDefaultOpenAIClient } from "./openaiClient.ts";
import {
  createDirectTerraSerperShoppingTransport as createDefaultShoppingTransport,
  directTerraSerperApiKeyIsValid,
} from "./directTerraSerperTransport.ts";
import {
  STAGED_TERRA_API_VERSION,
  STAGED_TERRA_JOB_TOKEN_HEADER,
  STAGED_TERRA_JOB_TTL_MS,
  STAGED_TERRA_POLL_AFTER_MS,
  type StagedTerraFailureResponse,
} from "./stagedTerraApiContract.ts";
import {
  isValidStagedTerraJobTokenSecret,
  issueStagedTerraJobToken,
  stagedTerraJobTokenCanCarryShopperRequest,
  verifyStagedTerraJobToken,
} from "./stagedTerraJobToken.ts";
import { renderStagedTerraPresentation } from "./stagedTerraRenderer.ts";
import {
  cancelStagedTerraResearch,
  collectStagedTerraVerificationInputs,
  pollStagedTerraResearch,
  runStagedTerraPresentation,
  startStagedTerraResearch,
  type StagedTerraRuntimeLedger,
} from "./stagedTerraRuntime.ts";
import {
  materializeStagedTerraEvidencePackage,
  type StagedTerraVerifierAggregateDiagnostic,
} from "./stagedTerraVerifier.ts";
import {
  isStagedTerraResearchCandidateSourceValidationReason,
  isStagedTerraResearchCandidateValidationReason,
  isStagedTerraResearchValidationReason,
  type StagedTerraResearchCandidateSourceValidationReason,
  type StagedTerraResearchCandidateValidationReason,
  type StagedTerraResearchValidationReason,
} from "./stagedTerraContract.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";
import type { RecommendationApiRequest } from "../types/review-radar.ts";

type ValidatedRequest =
  | { data: RecommendationApiRequest }
  | { error: string };

type Environment = {
  openAiApiKey: string | undefined;
  jobTokenSecret: string | undefined;
  serperApiKey?: string | undefined;
  enabled?: boolean;
};

export type StagedTerraServerDiagnostic = {
  stage:
    | "research_start"
    | "research_poll"
    | "verification"
    | "presentation";
  outcome: "pending" | "completed" | "failed";
  ledger?: StagedTerraRuntimeLedger;
  validationReason?: StagedTerraResearchValidationReason;
  candidateValidationReason?: StagedTerraResearchCandidateValidationReason;
  candidateSourceValidationReason?: StagedTerraResearchCandidateSourceValidationReason;
  counts?: {
    candidates: number;
    sourceFetchAttempts: number;
    successfulSourceFetches: number;
    commerceRequests: number;
    commerceRows: number;
    eligibleCandidates: number;
    closeMatchCandidates: number;
    excludedCandidates: number;
  };
  verificationAttribution?: StagedTerraVerifierAggregateDiagnostic;
};

type HandlerOptions = {
  createOpenAIClient?: typeof createDefaultOpenAIClient;
  getEnvironment?: () => Environment;
  validateRequest: (body: unknown) => ValidatedRequest;
  now?: () => number;
  startResearch?: typeof startStagedTerraResearch;
  pollResearch?: typeof pollStagedTerraResearch;
  cancelResearch?: typeof cancelStagedTerraResearch;
  collectVerificationInputs?: typeof collectStagedTerraVerificationInputs;
  materializeEvidence?: typeof materializeStagedTerraEvidencePackage;
  runPresentation?: typeof runStagedTerraPresentation;
  renderPresentation?: typeof renderStagedTerraPresentation;
  createShoppingTransport?: typeof createDefaultShoppingTransport;
  onDiagnostic?: (diagnostic: StagedTerraServerDiagnostic) => void;
};

type RouteHandler = (request: Request) => Promise<Response>;

export type StagedTerraRecommendationHandlers = {
  POST: RouteHandler;
  GET: RouteHandler;
  DELETE: RouteHandler;
};

const ERROR_MESSAGES = {
  invalidJson: "The request body must be valid JSON.",
  invalidJob: "This research job is invalid. Please start a new search.",
  expiredJob: "This research job expired. Please start a new search.",
  missingConfig: "ReviewRadar's staged Terra mode is not configured.",
  researchFailed: "Research could not be completed safely. Please try again.",
  verificationFailed:
    "Research finished, but enough evidence could not be verified safely.",
  presentationFailed:
    "Evidence was verified, but the final briefing could not be completed safely.",
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
      pipeline: "staged_terra",
      version: STAGED_TERRA_API_VERSION,
      state: "failed",
      code,
      error,
    } satisfies StagedTerraFailureResponse,
    status,
  );
}

function configured(environment: Environment) {
  return Boolean(
    environment.enabled !== false &&
      environment.openAiApiKey?.trim() &&
      environment.jobTokenSecret &&
      isValidStagedTerraJobTokenSecret(environment.jobTokenSecret),
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedCount(value: unknown, maximum: number) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximum
    ? value
    : null;
}

function sanitizeVerificationAttribution(
  value: unknown,
  expected: {
    candidates: number;
    eligible: number;
    closeMatch: number;
    excluded: number;
  },
): StagedTerraVerifierAggregateDiagnostic | undefined {
  const aggregate = record(value);
  const firstLoss = record(aggregate?.candidateFirstLossCounts);
  const sourceRejections = record(
    aggregate?.sourceRejectionCandidateCounts,
  );
  const claimRejections = record(aggregate?.claimRejectionCandidateCounts);
  if (!aggregate || !firstLoss || !sourceRejections || !claimRejections) {
    return undefined;
  }
  const assetIdentityUnproven = boundedCount(
    firstLoss.assetIdentityUnproven,
    expected.candidates,
  );
  const completeProductRelationshipUnproven = boundedCount(
    firstLoss.completeProductRelationshipUnproven,
    expected.candidates,
  );
  const identitySafeProductUrlUnavailable = boundedCount(
    firstLoss.identitySafeProductUrlUnavailable,
    expected.candidates,
  );
  const hardRequirementFailed = boundedCount(
    firstLoss.hardRequirementFailed,
    expected.candidates,
  );
  const hardRequirementNotVerified = boundedCount(
    firstLoss.hardRequirementNotVerified,
    expected.candidates,
  );
  const noLossEligible = boundedCount(
    firstLoss.noLossEligible,
    expected.candidates,
  );
  const sourceNotOwnedByCandidate = boundedCount(
    sourceRejections.sourceNotOwnedByCandidate,
    expected.candidates,
  );
  const sourceInputInvalid = boundedCount(
    sourceRejections.sourceInputInvalid,
    expected.candidates,
  );
  const observedClaimInvalid = boundedCount(
    claimRejections.observedClaimInvalid,
    expected.candidates,
  );
  if (
    assetIdentityUnproven === null ||
    completeProductRelationshipUnproven === null ||
    identitySafeProductUrlUnavailable === null ||
    hardRequirementFailed === null ||
    hardRequirementNotVerified === null ||
    noLossEligible === null ||
    sourceNotOwnedByCandidate === null ||
    sourceInputInvalid === null ||
    observedClaimInvalid === null ||
    assetIdentityUnproven +
      completeProductRelationshipUnproven +
      identitySafeProductUrlUnavailable +
      hardRequirementFailed +
      hardRequirementNotVerified +
      noLossEligible !==
      expected.candidates ||
    noLossEligible !== expected.eligible ||
    hardRequirementNotVerified !== expected.closeMatch ||
    assetIdentityUnproven +
      completeProductRelationshipUnproven +
      identitySafeProductUrlUnavailable +
      hardRequirementFailed !==
      expected.excluded
  ) {
    return undefined;
  }
  return {
    candidateFirstLossCounts: {
      assetIdentityUnproven,
      completeProductRelationshipUnproven,
      identitySafeProductUrlUnavailable,
      hardRequirementFailed,
      hardRequirementNotVerified,
      noLossEligible,
    },
    sourceRejectionCandidateCounts: {
      sourceNotOwnedByCandidate,
      sourceInputInvalid,
    },
    claimRejectionCandidateCounts: { observedClaimInvalid },
  };
}

function shopperRequest(
  request: RecommendationApiRequest,
): DirectTerraShopperRequest | null {
  if (
    request.query.length > 200 ||
    (request.budget?.length ?? 0) > 500 ||
    (request.priorities?.length ?? 0) > 2_000 ||
    (request.avoid?.length ?? 0) > 2_000 ||
    (request.selectedFeatures?.length ?? 0) > 12
  ) {
    return null;
  }
  return {
    query: request.query,
    ...(request.budget ? { budget: request.budget } : {}),
    ...(request.priorities ? { priorities: request.priorities } : {}),
    ...(request.avoid ? { avoid: request.avoid } : {}),
    ...(request.selectedFeatures?.length
      ? { selectedFeatures: request.selectedFeatures }
      : {}),
  };
}

function defaultDiagnosticReporter(diagnostic: StagedTerraServerDiagnostic) {
  console.info(
    "[ReviewRadar staged Terra]",
    JSON.stringify(diagnostic),
  );
}

export function createStagedTerraRecommendationHandlers({
  createOpenAIClient = createDefaultOpenAIClient,
  getEnvironment = () => ({
    openAiApiKey: process.env.OPENAI_API_KEY,
    jobTokenSecret: process.env.REVIEW_RADAR_JOB_TOKEN_SECRET,
    serperApiKey: process.env.SERPER_API_KEY,
    enabled: process.env.REVIEW_RADAR_STAGED_TERRA === "on",
  }),
  validateRequest,
  now = Date.now,
  startResearch = startStagedTerraResearch,
  pollResearch = pollStagedTerraResearch,
  cancelResearch = cancelStagedTerraResearch,
  collectVerificationInputs = collectStagedTerraVerificationInputs,
  materializeEvidence = materializeStagedTerraEvidencePackage,
  runPresentation = runStagedTerraPresentation,
  renderPresentation = renderStagedTerraPresentation,
  createShoppingTransport = createDefaultShoppingTransport,
  onDiagnostic = defaultDiagnosticReporter,
}: HandlerOptions): StagedTerraRecommendationHandlers {
  const completions = new Map<
    string,
    {
      expiresAtMs: number;
      promise: Promise<{ body: unknown; status: number }>;
    }
  >();

  function resolveCompletionOnce({
    responseId,
    expiresAtMs,
    load,
  }: {
    responseId: string;
    expiresAtMs: number;
    load: () => Promise<Response>;
  }) {
    const currentTime = now();
    for (const [key, entry] of completions) {
      if (entry.expiresAtMs <= currentTime) completions.delete(key);
    }
    const existing = completions.get(responseId);
    if (existing) {
      return existing.promise.then((result) => json(result.body, result.status));
    }
    if (completions.size >= 100) {
      const oldest = completions.keys().next().value;
      if (oldest) completions.delete(oldest);
    }
    const promise = load().then(async (response) => ({
      body: await response.json(),
      status: response.status,
    }));
    completions.set(responseId, { expiresAtMs, promise });
    return promise.then((result) => json(result.body, result.status));
  }

  const report = (diagnostic: StagedTerraServerDiagnostic) => {
    try {
      onDiagnostic(diagnostic);
    } catch {
      // Server-only diagnostics must never alter the route outcome.
    }
  };

  const POST: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configured(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("invalid_json", ERROR_MESSAGES.invalidJson, 400);
    }
    const validation = validateRequest(body);
    if ("error" in validation) return json({ error: validation.error }, 400);
    const normalized = shopperRequest(validation.data);
    const currentTime = now();
    if (
      !normalized ||
      !stagedTerraJobTokenCanCarryShopperRequest({
        shopperRequest: normalized,
        nowMs: currentTime,
        ttlMs: STAGED_TERRA_JOB_TTL_MS,
      })
    ) {
      return failure("invalid_request", "The shopper request is too large.", 400);
    }
    try {
      const client = await createOpenAIClient(environment.openAiApiKey!, {
        maxRetries: 0,
      });
      const result = await startResearch({
        client,
        shopperRequest: normalized,
        now,
      });
      if (!result.ok) {
        report({
          stage: "research_start",
          outcome: "failed",
          ledger: result.ledger,
        });
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      report({
        stage: "research_start",
        outcome: result.status === "completed" ? "completed" : "pending",
        ledger: result.ledger,
      });
      const issuedAtMs = now();
      let jobToken: string;
      try {
        jobToken = issueStagedTerraJobToken({
          responseId: result.responseId,
          requestFingerprint: result.requestFingerprint,
          shopperRequest: normalized,
          secret: environment.jobTokenSecret!,
          nowMs: issuedAtMs,
          ttlMs: STAGED_TERRA_JOB_TTL_MS,
        });
      } catch {
        if (result.status !== "completed") {
          try {
            await cancelResearch({
              client,
              responseId: result.responseId,
              now,
            });
          } catch {
            // The known non-terminal research job received one safety cancel.
          }
        }
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      return json(
        {
          pipeline: "staged_terra",
          version: STAGED_TERRA_API_VERSION,
          state: "pending",
          status: result.status === "queued" ? "queued" : "in_progress",
          jobToken,
          pollAfterMs: STAGED_TERRA_POLL_AFTER_MS,
          expiresAtMs: issuedAtMs + STAGED_TERRA_JOB_TTL_MS,
        },
        202,
      );
    } catch {
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    }
  };

  const GET: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configured(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const token =
      request.headers.get(STAGED_TERRA_JOB_TOKEN_HEADER)?.trim() ?? "";
    const verified = verifyStagedTerraJobToken({
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
      const research = await pollResearch({
        client,
        responseId: verified.payload.responseId,
        requestFingerprint: verified.payload.requestFingerprint,
        shopperRequest: verified.payload.shopperRequest,
        now,
      });
      if (!research.ok) {
        const validationReason =
          "validationReason" in research &&
          isStagedTerraResearchValidationReason(research.validationReason)
            ? research.validationReason
            : undefined;
        const candidateValidationReason =
          validationReason === "research_candidate_invalid" &&
          "candidateValidationReason" in research &&
          isStagedTerraResearchCandidateValidationReason(
            research.candidateValidationReason,
          )
            ? research.candidateValidationReason
            : undefined;
        const candidateSourceValidationReason =
          candidateValidationReason === "candidate_sources" &&
          "candidateSourceValidationReason" in research &&
          isStagedTerraResearchCandidateSourceValidationReason(
            research.candidateSourceValidationReason,
          )
            ? research.candidateSourceValidationReason
            : undefined;
        report({
          stage: "research_poll",
          outcome: "failed",
          ledger: research.ledger,
          ...(validationReason ? { validationReason } : {}),
          ...(candidateValidationReason ? { candidateValidationReason } : {}),
          ...(candidateSourceValidationReason
            ? { candidateSourceValidationReason }
            : {}),
        });
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      if (research.state === "pending") {
        report({
          stage: "research_poll",
          outcome: "pending",
          ledger: research.ledger,
        });
        return json(
          {
            pipeline: "staged_terra",
            version: STAGED_TERRA_API_VERSION,
            state: "pending",
            status: research.status,
            jobToken: token,
            pollAfterMs: STAGED_TERRA_POLL_AFTER_MS,
            expiresAtMs: verified.payload.expiresAtMs,
          },
          202,
        );
      }
      report({
        stage: "research_poll",
        outcome: "completed",
        ledger: research.ledger,
      });
      return await resolveCompletionOnce({
        responseId: verified.payload.responseId,
        expiresAtMs: verified.payload.expiresAtMs,
        load: async () => {
          const shoppingTransport =
            environment.serperApiKey &&
            directTerraSerperApiKeyIsValid(environment.serperApiKey)
              ? createShoppingTransport({ apiKey: environment.serperApiKey })
              : undefined;
          const collected = await collectVerificationInputs({
            researchOutput: research.researchOutput,
            shoppingTransport,
            now,
          });
          const verifiedEvidence = materializeEvidence({
            shopperRequest: verified.payload.shopperRequest,
            researchOutput: research.researchOutput,
            market: "US",
            candidates: collected.candidates,
          });
          const eligibilityCounts =
            verifiedEvidence.evidencePackage.candidates.reduce(
              (counts, candidate) => {
                counts[candidate.eligibility] += 1;
                return counts;
              },
              { eligible: 0, close_match: 0, excluded: 0 },
            );
          const counts = {
            candidates: collected.diagnostics.candidateCount,
            sourceFetchAttempts: collected.diagnostics.sourceFetchAttempts,
            successfulSourceFetches:
              collected.diagnostics.successfulSourceFetches,
            commerceRequests: collected.diagnostics.commerceRequests,
            commerceRows: collected.diagnostics.commerceRows,
            eligibleCandidates: eligibilityCounts.eligible,
            closeMatchCandidates: eligibilityCounts.close_match,
            excludedCandidates: eligibilityCounts.excluded,
          };
          const verificationAttribution = sanitizeVerificationAttribution(
            verifiedEvidence.diagnostics.aggregate,
            {
              candidates: counts.candidates,
              eligible: counts.eligibleCandidates,
              closeMatch: counts.closeMatchCandidates,
              excluded: counts.excludedCandidates,
            },
          );
          if (eligibilityCounts.eligible === 0) {
            report({
              stage: "verification",
              outcome: "failed",
              counts,
              ...(verificationAttribution ? { verificationAttribution } : {}),
            });
            return failure(
              "verification_failed",
              ERROR_MESSAGES.verificationFailed,
              502,
            );
          }
          report({
            stage: "verification",
            outcome: "completed",
            counts,
            ...(verificationAttribution ? { verificationAttribution } : {}),
          });
          const presented = await runPresentation({
            client,
            evidencePackage: verifiedEvidence.evidencePackage,
            now,
          });
          if (!presented.ok) {
            report({
              stage: "presentation",
              outcome: "failed",
              ledger: presented.ledger,
            });
            return failure(
              "presentation_failed",
              ERROR_MESSAGES.presentationFailed,
              502,
            );
          }
          report({
            stage: "presentation",
            outcome: "completed",
            ledger: presented.ledger,
          });
          let rendered;
          try {
            rendered = renderPresentation({
              evidencePackage: verifiedEvidence.evidencePackage,
              presentation: presented.presentation,
              observedAt: new Date(now()).toISOString(),
            });
          } catch {
            return failure(
              "presentation_failed",
              ERROR_MESSAGES.presentationFailed,
              502,
            );
          }
          return json(
            {
              pipeline: "staged_terra",
              version: STAGED_TERRA_API_VERSION,
              state: "completed",
              presentationVersion: presented.presentation.schemaVersion,
              cards: rendered.cards,
              sources: rendered.sources,
              finalAdvice: rendered.finalAdvice,
            },
            200,
          );
        },
      });
    } catch {
      return failure("verification_failed", ERROR_MESSAGES.verificationFailed, 502);
    }
  };

  const DELETE: RouteHandler = async (request) => {
    const environment = getEnvironment();
    if (!configured(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const verified = verifyStagedTerraJobToken({
      token:
        request.headers.get(STAGED_TERRA_JOB_TOKEN_HEADER)?.trim() ?? "",
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
        now,
      });
      if (!result.ok || result.status !== "cancelled") {
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      return json(
        {
          pipeline: "staged_terra",
          version: STAGED_TERRA_API_VERSION,
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

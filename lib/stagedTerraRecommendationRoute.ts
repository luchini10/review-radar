import { createOpenAIClient as createDefaultOpenAIClient } from "./openaiClient.ts";
import { readBoundedJsonBody } from "./boundedJsonRequest.ts";
import { USER_ERROR_MESSAGES } from "./errorMessages.ts";
import {
  createPaidRequestLeaseRegistry,
  DEFAULT_PAID_REQUEST_ADMISSION,
  paidProviderJobStatusIsTerminal,
  type PaidRequestAdmission,
} from "./paidRequestAdmission.ts";
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
  isStagedTerraResearchCandidateIdentityValidationReason,
  isStagedTerraResearchCandidateSourceValidationReason,
  isStagedTerraResearchCandidateValidationReason,
  isStagedTerraResearchValidationReason,
  STAGED_TERRA_RESEARCH_IDENTITY_SOURCE_REJECTION_KEYS,
  type StagedTerraResearchIdentitySourceFilterDiagnostic,
  type StagedTerraResearchCandidateIdentityValidationReason,
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
  candidateIdentityValidationReason?: StagedTerraResearchCandidateIdentityValidationReason;
  candidateSourceValidationReason?: StagedTerraResearchCandidateSourceValidationReason;
  identitySourceFilter?: StagedTerraResearchIdentitySourceFilterDiagnostic;
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
  paidRequestAdmission?: PaidRequestAdmission;
  startResearch?: typeof startStagedTerraResearch;
  pollResearch?: typeof pollStagedTerraResearch;
  cancelResearch?: typeof cancelStagedTerraResearch;
  issueJobToken?: typeof issueStagedTerraJobToken;
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
  bodyTooLarge: "The request body is too large.",
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

function json(body: unknown, status: number, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  return Response.json(body, {
    headers: responseHeaders,
    status,
  });
}

function failure(
  code: string,
  error: string,
  status: number,
  headers?: HeadersInit,
) {
  return json(
    {
      pipeline: "staged_terra",
      version: STAGED_TERRA_API_VERSION,
      state: "failed",
      code,
      error,
    } satisfies StagedTerraFailureResponse,
    status,
    headers,
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

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  );
}

function boundedCountRecord<const Keys extends readonly string[]>(
  value: unknown,
  expectedKeys: Keys,
  maximum: number,
): { [Key in Keys[number]]: number } | null {
  const candidate = record(value);
  if (!candidate || !hasExactKeys(candidate, expectedKeys)) return null;
  const result = {} as { [Key in Keys[number]]: number };
  for (const key of expectedKeys) {
    const typedKey = key as Keys[number];
    const count = boundedCount(candidate[typedKey], maximum);
    if (count === null) return null;
    result[typedKey] = count;
  }
  return result;
}

function countTotal(value: Record<string, number>) {
  return Object.values(value).reduce((sum, count) => sum + count, 0);
}

const IDENTITY_SOURCE_FILTER_KEYS = [
  "submittedCandidates",
  "acceptedCandidates",
  "deferredMissingTitleCandidates",
  "rejectedCandidates",
  "rejectionCandidateCounts",
] as const;

function sanitizeIdentitySourceFilter(
  value: unknown,
  context:
    | {
        outcome: "completed";
        candidateCount: number;
      }
    | {
        outcome: "failed";
        validationReason: StagedTerraResearchValidationReason | undefined;
        candidateValidationReason:
          | StagedTerraResearchCandidateValidationReason
          | undefined;
        candidateSourceValidationReason:
          | StagedTerraResearchCandidateSourceValidationReason
          | undefined;
      },
): StagedTerraResearchIdentitySourceFilterDiagnostic | undefined {
  const candidate = record(value);
  if (!candidate || !hasExactKeys(candidate, IDENTITY_SOURCE_FILTER_KEYS)) {
    return undefined;
  }
  const submittedCandidates = boundedCount(candidate.submittedCandidates, 15);
  const acceptedCandidates = boundedCount(candidate.acceptedCandidates, 15);
  const deferredMissingTitleCandidates = boundedCount(
    candidate.deferredMissingTitleCandidates,
    15,
  );
  const rejectedCandidates = boundedCount(candidate.rejectedCandidates, 15);
  const rejectionCandidateCounts = boundedCountRecord(
    candidate.rejectionCandidateCounts,
    STAGED_TERRA_RESEARCH_IDENTITY_SOURCE_REJECTION_KEYS,
    rejectedCandidates ?? 0,
  );
  const rejectionCountTotal = rejectionCandidateCounts
    ? countTotal(rejectionCandidateCounts)
    : null;
  if (
    submittedCandidates === null ||
    submittedCandidates < 8 ||
    acceptedCandidates === null ||
    deferredMissingTitleCandidates === null ||
    rejectedCandidates === null ||
    !rejectionCandidateCounts ||
    acceptedCandidates + rejectedCandidates !== submittedCandidates ||
    deferredMissingTitleCandidates > acceptedCandidates ||
    (rejectedCandidates === 0 && rejectionCountTotal !== 0) ||
    (rejectedCandidates > 0 &&
      (rejectionCountTotal === null ||
        rejectionCountTotal < rejectedCandidates ||
        rejectionCountTotal > 2 * rejectedCandidates)) ||
    (context.outcome === "completed" &&
      (acceptedCandidates < 1 ||
        acceptedCandidates !== context.candidateCount)) ||
    (context.outcome === "failed" &&
      (context.validationReason !== "research_candidate_invalid" ||
        context.candidateValidationReason !== "candidate_sources" ||
        context.candidateSourceValidationReason !==
          "candidate_source_identity_unproven" ||
        acceptedCandidates !== 0 ||
        deferredMissingTitleCandidates !== 0 ||
        rejectedCandidates !== submittedCandidates))
  ) {
    return undefined;
  }
  return {
    submittedCandidates,
    acceptedCandidates,
    deferredMissingTitleCandidates,
    rejectedCandidates,
    rejectionCandidateCounts,
  };
}

const VERIFICATION_ATTRIBUTION_KEYS = [
  "candidateFirstLossCounts",
  "assetIdentityFailureCandidateCounts",
  "commerceOutcomeCandidateCounts",
  "completeProductRelationshipFailureCandidateCounts",
  "identitySafeProductUrlFailureCandidateCounts",
  "sourceRejectionCandidateCounts",
  "claimRejectionCandidateCounts",
] as const;

const CANDIDATE_FIRST_LOSS_KEYS = [
  "assetIdentityUnproven",
  "completeProductRelationshipUnproven",
  "identitySafeProductUrlUnavailable",
  "hardRequirementFailed",
  "hardRequirementNotVerified",
  "noLossEligible",
] as const;

const ASSET_IDENTITY_FAILURE_KEYS = [
  "noAssetCandidates",
  "invalidTargetIdentity",
  "missingTitle",
  "brandNotInTitle",
  "modelNotInTitle",
  "modelConflictInTitle",
  "wrongProductType",
] as const;

const COMMERCE_OUTCOME_KEYS = [
  "noShoppingRows",
  "targetStableIdentifierUnavailable",
  "acceptedExactOffer",
  "missingTitle",
  "brandNotInTitle",
  "stableIdentifierNotInTitle",
  "missingMerchantProductUrl",
  "missingPrice",
  "missingSeller",
  "nonNewOffer",
  "explicitAccessoryOffer",
  "productIneligible",
] as const;

const COMPLETE_PRODUCT_RELATIONSHIP_FAILURE_KEYS = [
  "nonProductPage",
  "complementPrimaryItem",
  "productTypeConflict",
  "complementRelationshipWording",
  "insufficientCompleteProductEvidence",
] as const;

const IDENTITY_SAFE_PRODUCT_URL_FAILURE_KEYS = [
  "missingOrInvalidProductUrl",
  "unsafeProductUrlHost",
  "productUrlRedirectWrapper",
  "productUrlIneligible",
  "productUrlTypeConflict",
  "productUrlDescriptiveIdentityConflict",
  "productUrlIdentityMismatch",
] as const;

const SOURCE_REJECTION_KEYS = [
  "sourceNotOwnedByCandidate",
  "sourceInputInvalid",
] as const;

const CLAIM_REJECTION_KEYS = ["observedClaimInvalid"] as const;

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
  if (
    !aggregate ||
    !hasExactKeys(aggregate, VERIFICATION_ATTRIBUTION_KEYS)
  ) {
    return undefined;
  }
  const firstLoss = boundedCountRecord(
    aggregate.candidateFirstLossCounts,
    CANDIDATE_FIRST_LOSS_KEYS,
    expected.candidates,
  );
  if (!firstLoss) return undefined;
  const assetIdentityFailures = boundedCountRecord(
    aggregate.assetIdentityFailureCandidateCounts,
    ASSET_IDENTITY_FAILURE_KEYS,
    firstLoss.assetIdentityUnproven,
  );
  const commerceOutcomes = boundedCountRecord(
    aggregate.commerceOutcomeCandidateCounts,
    COMMERCE_OUTCOME_KEYS,
    firstLoss.assetIdentityUnproven,
  );
  const relationshipFailures = boundedCountRecord(
    aggregate.completeProductRelationshipFailureCandidateCounts,
    COMPLETE_PRODUCT_RELATIONSHIP_FAILURE_KEYS,
    firstLoss.completeProductRelationshipUnproven,
  );
  const productUrlFailures = boundedCountRecord(
    aggregate.identitySafeProductUrlFailureCandidateCounts,
    IDENTITY_SAFE_PRODUCT_URL_FAILURE_KEYS,
    firstLoss.identitySafeProductUrlUnavailable,
  );
  const sourceRejections = boundedCountRecord(
    aggregate.sourceRejectionCandidateCounts,
    SOURCE_REJECTION_KEYS,
    expected.candidates,
  );
  const claimRejections = boundedCountRecord(
    aggregate.claimRejectionCandidateCounts,
    CLAIM_REJECTION_KEYS,
    expected.candidates,
  );
  if (
    !assetIdentityFailures ||
    !commerceOutcomes ||
    !relationshipFailures ||
    !productUrlFailures ||
    !sourceRejections ||
    !claimRejections
  ) {
    return undefined;
  }
  if (
    countTotal(firstLoss) !== expected.candidates ||
    firstLoss.noLossEligible !== expected.eligible ||
    firstLoss.hardRequirementNotVerified !== expected.closeMatch ||
    firstLoss.assetIdentityUnproven +
      firstLoss.completeProductRelationshipUnproven +
      firstLoss.identitySafeProductUrlUnavailable +
      firstLoss.hardRequirementFailed !==
      expected.excluded ||
    countTotal(assetIdentityFailures) < firstLoss.assetIdentityUnproven ||
    countTotal(commerceOutcomes) < firstLoss.assetIdentityUnproven ||
    countTotal(relationshipFailures) <
      firstLoss.completeProductRelationshipUnproven ||
    countTotal(productUrlFailures) <
      firstLoss.identitySafeProductUrlUnavailable
  ) {
    return undefined;
  }
  return {
    candidateFirstLossCounts: firstLoss,
    assetIdentityFailureCandidateCounts: assetIdentityFailures,
    commerceOutcomeCandidateCounts: commerceOutcomes,
    completeProductRelationshipFailureCandidateCounts: relationshipFailures,
    identitySafeProductUrlFailureCandidateCounts: productUrlFailures,
    sourceRejectionCandidateCounts: sourceRejections,
    claimRejectionCandidateCounts: claimRejections,
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
  paidRequestAdmission = DEFAULT_PAID_REQUEST_ADMISSION,
  startResearch = startStagedTerraResearch,
  pollResearch = pollStagedTerraResearch,
  cancelResearch = cancelStagedTerraResearch,
  issueJobToken = issueStagedTerraJobToken,
  collectVerificationInputs = collectStagedTerraVerificationInputs,
  materializeEvidence = materializeStagedTerraEvidencePackage,
  runPresentation = runStagedTerraPresentation,
  renderPresentation = renderStagedTerraPresentation,
  createShoppingTransport = createDefaultShoppingTransport,
  onDiagnostic = defaultDiagnosticReporter,
}: HandlerOptions): StagedTerraRecommendationHandlers {
  const backgroundPaidLeases = createPaidRequestLeaseRegistry({
    admission: paidRequestAdmission,
    namespace: "staged-terra",
    now,
  });
  const completions = new Map<
    string,
    {
      expiresAtMs: number;
      promise: Promise<{
        body: unknown;
        retryAfter: string | undefined;
        status: number;
      }>;
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
      return existing.promise.then((result) =>
        json(
          result.body,
          result.status,
          result.retryAfter
            ? { "Retry-After": result.retryAfter }
            : undefined,
        ),
      );
    }
    if (completions.size >= 100) {
      const oldest = completions.keys().next().value;
      if (oldest) completions.delete(oldest);
    }
    const loaded = load().then(async (response) => ({
      body: await response.json(),
      retryAfter: response.headers.get("Retry-After") ?? undefined,
      status: response.status,
    }));
    type CompletionPromise = Promise<{
      body: unknown;
      retryAfter: string | undefined;
      status: number;
    }>;
    const deleteIfCurrent = (expected: CompletionPromise) => {
      if (completions.get(responseId)?.promise === expected) {
        completions.delete(responseId);
      }
    };
    const promise: CompletionPromise = loaded.then(
      (result) => {
        if (result.status === 429) deleteIfCurrent(promise);
        return result;
      },
      (error) => {
        deleteIfCurrent(promise);
        throw error;
      },
    );
    completions.set(responseId, { expiresAtMs, promise });
    return promise.then((result) =>
      json(
        result.body,
        result.status,
        result.retryAfter ? { "Retry-After": result.retryAfter } : undefined,
      ),
    );
  }

  const report = (diagnostic: StagedTerraServerDiagnostic) => {
    try {
      onDiagnostic(diagnostic);
    } catch {
      // Server-only diagnostics must never alter the route outcome.
    }
  };

  const POST: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
    const environment = getEnvironment();
    if (!configured(environment)) {
      return failure("invalid_config", ERROR_MESSAGES.missingConfig, 500);
    }
    const bodyResult = await readBoundedJsonBody(request);
    if (!bodyResult.ok) {
      return failure(
        bodyResult.reason === "body_too_large"
          ? "request_body_too_large"
          : "invalid_json",
        bodyResult.reason === "body_too_large"
          ? ERROR_MESSAGES.bodyTooLarge
          : ERROR_MESSAGES.invalidJson,
        bodyResult.reason === "body_too_large" ? 413 : 400,
      );
    }
    const validation = validateRequest(bodyResult.value);
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
    const admission = paidRequestAdmission.tryAcquire();
    if (!admission.ok) {
      return failure(
        "temporarily_rate_limited",
        USER_ERROR_MESSAGES.temporaryRateLimit,
        429,
        { "Retry-After": String(admission.retryAfterSeconds) },
      );
    }
    let admissionTransferred = false;
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
        jobToken = issueJobToken({
          responseId: result.responseId,
          requestFingerprint: result.requestFingerprint,
          shopperRequest: normalized,
          secret: environment.jobTokenSecret!,
          nowMs: issuedAtMs,
          ttlMs: STAGED_TERRA_JOB_TTL_MS,
        });
      } catch {
        if (["queued", "in_progress"].includes(result.status)) {
          let cancellationIsTerminal = false;
          try {
            const cancellation = await cancelResearch({
              client,
              responseId: result.responseId,
              now,
            });
            cancellationIsTerminal =
              paidProviderJobStatusIsTerminal(cancellation.ledger.status) ||
              (cancellation.ok &&
                paidProviderJobStatusIsTerminal(cancellation.status));
          } catch {
            // A failed safety cancel leaves the known job admitted to expiry.
          }
          if (!cancellationIsTerminal) {
            admissionTransferred = backgroundPaidLeases.track(
              result.responseId,
              issuedAtMs + STAGED_TERRA_JOB_TTL_MS,
              admission,
            );
          }
        }
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      if (["queued", "in_progress"].includes(result.status)) {
        admissionTransferred = backgroundPaidLeases.track(
          result.responseId,
          issuedAtMs + STAGED_TERRA_JOB_TTL_MS,
          admission,
        );
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
    } finally {
      if (!admissionTransferred) admission.release();
    }
  };

  const GET: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
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
        if (paidProviderJobStatusIsTerminal(research.ledger.status)) {
          backgroundPaidLeases.release(verified.payload.responseId);
        }
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
        const candidateIdentityValidationReason =
          candidateValidationReason === "candidate_identity" &&
          "candidateIdentityValidationReason" in research &&
          isStagedTerraResearchCandidateIdentityValidationReason(
            research.candidateIdentityValidationReason,
          )
            ? research.candidateIdentityValidationReason
            : undefined;
        const identitySourceFilter =
          "identitySourceFilter" in research
            ? sanitizeIdentitySourceFilter(research.identitySourceFilter, {
                outcome: "failed",
                validationReason,
                candidateValidationReason,
                candidateSourceValidationReason,
              })
            : undefined;
        report({
          stage: "research_poll",
          outcome: "failed",
          ledger: research.ledger,
          ...(validationReason ? { validationReason } : {}),
          ...(candidateValidationReason ? { candidateValidationReason } : {}),
          ...(candidateIdentityValidationReason
            ? { candidateIdentityValidationReason }
            : {}),
          ...(candidateSourceValidationReason
            ? { candidateSourceValidationReason }
            : {}),
          ...(identitySourceFilter ? { identitySourceFilter } : {}),
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
      backgroundPaidLeases.release(verified.payload.responseId);
      const identitySourceFilter =
        "identitySourceFilter" in research
          ? sanitizeIdentitySourceFilter(research.identitySourceFilter, {
              outcome: "completed",
              candidateCount: research.researchOutput.candidates.length,
            })
          : undefined;
      report({
        stage: "research_poll",
        outcome: "completed",
        ledger: research.ledger,
        ...(identitySourceFilter ? { identitySourceFilter } : {}),
      });
      return await resolveCompletionOnce({
        responseId: verified.payload.responseId,
        expiresAtMs: verified.payload.expiresAtMs,
        load: async () => {
          const completionAdmission = paidRequestAdmission.tryAcquire();
          if (!completionAdmission.ok) {
            return failure(
              "temporarily_rate_limited",
              USER_ERROR_MESSAGES.temporaryRateLimit,
              429,
              {
                "Retry-After": String(
                  completionAdmission.retryAfterSeconds,
                ),
              },
            );
          }
          try {
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
                ...(verificationAttribution
                  ? { verificationAttribution }
                  : {}),
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
          } finally {
            completionAdmission.release();
          }
        },
      });
    } catch {
      return failure("verification_failed", ERROR_MESSAGES.verificationFailed, 502);
    }
  };

  const DELETE: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
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
      if (
        paidProviderJobStatusIsTerminal(result.ledger.status) ||
        (result.ok && paidProviderJobStatusIsTerminal(result.status))
      ) {
        backgroundPaidLeases.release(verified.payload.responseId);
      }
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

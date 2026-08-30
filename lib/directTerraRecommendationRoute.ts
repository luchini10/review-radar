import {
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "./errorMessages.ts";
import { createOpenAIClient as createDefaultOpenAIClient } from "./openaiClient.ts";
import { readBoundedJsonBody } from "./boundedJsonRequest.ts";
import {
  createPaidRequestLeaseRegistry,
  DEFAULT_PAID_REQUEST_ADMISSION,
  paidProviderJobStatusIsTerminal,
  type PaidRequestAdmission,
} from "./paidRequestAdmission.ts";
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
  isDirectTerraProductAssetArray,
  type DirectTerraFailureResponse,
  type DirectTerraProductAsset,
} from "./directTerraApiContract.ts";
import { resolveDirectTerraProductAssets as resolveDefaultProductAssets } from "./directTerraProductAssets.ts";
import type { DirectTerraAssetTarget } from "./directTerraAssetVerifier.ts";
import {
  createDirectTerraSerperOrganicTransport as createDefaultSerperOrganicTransport,
  createDirectTerraSerperShoppingTransport as createDefaultSerperTransport,
  directTerraSerperApiKeyIsValid,
} from "./directTerraSerperTransport.ts";
import { createDirectTerraProductPageTransport as createDefaultProductPageTransport } from "./directTerraProductPageFetcher.ts";
import {
  beginSearchProgress,
  completeSearchProgress,
  reportSearchProgressMilestone,
  searchProgressIdFromRequest,
} from "./searchProgressStore.ts";
import type { SearchProgressMilestoneKey } from "./searchProgress.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";
import {
  buildDirectTerraRequirementContract,
  directTerraRequirementContractFromIds,
  isDirectTerraRequirementId,
} from "./directTerraCandidateSlate.ts";
import type {
  SelectedSmartFeature,
  SmartFeatureOperator,
  SmartFeatureType,
  SmartFeatureValue,
} from "../types/smart-features.ts";

type DirectTerraEnvironment = {
  openAiApiKey: string | undefined;
  jobTokenSecret: string | undefined;
  serperApiKey?: string | undefined;
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
  paidRequestAdmission?: PaidRequestAdmission;
  startResearch?: typeof startDirectTerraResearch;
  pollResearch?: typeof pollDirectTerraResearch;
  cancelResearch?: typeof cancelDirectTerraResearch;
  issueJobToken?: typeof issueDirectTerraJobToken;
  createSerperTransport?: typeof createDefaultSerperTransport;
  createSerperOrganicTransport?: typeof createDefaultSerperOrganicTransport;
  createProductPageTransport?: typeof createDefaultProductPageTransport;
  resolveProductAssets?: typeof resolveDefaultProductAssets;
};

const ERROR_MESSAGES = {
  bodyTooLarge: "The request body is too large.",
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
      pipeline: "direct_terra",
      version: DIRECT_TERRA_API_VERSION,
      state: "failed",
      code,
      error,
    } satisfies DirectTerraFailureResponse,
    status,
    headers,
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
    !isDirectTerraRequirementId(`smart_feature:${value.id.trim()}`) ||
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
      ) ||
      new Set(parsedFeatures.map((feature) => feature?.id)).size !==
        parsedFeatures.length
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

// The background job reports progress across separate start/poll requests, so
// the milestones are driven by observed job state rather than timing stages.
// The roadmap is monotonic; `reportProgressUpTo` fills the contiguous prefix so
// no earlier milestone is left pending once a later one is reached.
const DIRECT_TERRA_PROGRESS_SEQUENCE: SearchProgressMilestoneKey[] = [
  "understand_request",
  "plan_strategy",
  "search_market",
  "expand_coverage",
  "deep_research",
  "verify_sources",
  "verify_facts",
  "rank_results",
];

function reportProgressUpTo(
  progressId: string | null,
  milestone: SearchProgressMilestoneKey,
) {
  if (!progressId) return;
  const end = DIRECT_TERRA_PROGRESS_SEQUENCE.indexOf(milestone);
  for (let index = 0; index <= end; index += 1) {
    reportSearchProgressMilestone(progressId, DIRECT_TERRA_PROGRESS_SEQUENCE[index]);
  }
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
    serperApiKey: process.env.SERPER_API_KEY,
    enabled: process.env.REVIEW_RADAR_DIRECT_TERRA === "on",
  }),
  now = Date.now,
  paidRequestAdmission = DEFAULT_PAID_REQUEST_ADMISSION,
  startResearch = startDirectTerraResearch,
  pollResearch = pollDirectTerraResearch,
  cancelResearch = cancelDirectTerraResearch,
  issueJobToken = issueDirectTerraJobToken,
  createSerperTransport = createDefaultSerperTransport,
  createSerperOrganicTransport = createDefaultSerperOrganicTransport,
  createProductPageTransport = createDefaultProductPageTransport,
  resolveProductAssets = resolveDefaultProductAssets,
}: HandlerOptions = {}): DirectTerraRecommendationHandlers {
  const backgroundPaidLeases = createPaidRequestLeaseRegistry({
    admission: paidRequestAdmission,
    namespace: "direct-terra",
    now,
  });
  const assetResolutions = new Map<
    string,
    { expiresAtMs: number; promise: Promise<DirectTerraProductAsset[]> }
  >();

  function resolveProductAssetsOnce({
    responseId,
    expiresAtMs,
    load,
  }: {
    responseId: string;
    expiresAtMs: number;
    load: () => Promise<DirectTerraProductAsset[]>;
  }) {
    const currentTime = now();
    for (const [key, entry] of assetResolutions) {
      if (entry.expiresAtMs <= currentTime) assetResolutions.delete(key);
    }
    const existing = assetResolutions.get(responseId);
    if (existing) return existing.promise;

    // The token TTL already bounds each record. The hard entry ceiling also
    // prevents an unusually busy process from retaining an unbounded map.
    if (assetResolutions.size >= 100) {
      const oldestKey = assetResolutions.keys().next().value;
      if (oldestKey) assetResolutions.delete(oldestKey);
    }
    const promise = load().catch((error) => {
      if (assetResolutions.get(responseId)?.promise === promise) {
        assetResolutions.delete(responseId);
      }
      throw error;
    });
    assetResolutions.set(responseId, { expiresAtMs, promise });
    return promise;
  }

  function safeAssetsForTargets(
    targets: DirectTerraAssetTarget[],
    value: unknown,
  ): DirectTerraProductAsset[] {
    const resolvedByRank = new Map(
      isDirectTerraProductAssetArray(value)
        ? value.map((asset) => [asset.rank, asset] as const)
        : [],
    );
    return targets.map((target) => {
      const asset = resolvedByRank.get(target.rank);
      return asset?.productName === target.productName
        ? asset
        : {
            rank: target.rank,
            productName: target.productName,
            productUrl: null,
            imageUrl: null,
          };
    });
  }

  const POST: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
    const environment = getEnvironment();
    if (!configuredEnvironment(environment)) {
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
    const shopperRequest = validateRequest(bodyResult.value);
    if (!shopperRequest) {
      return failure("invalid_request", ERROR_MESSAGES.invalidRequest, 400);
    }

    const progressId = searchProgressIdFromRequest(request);
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
      const result = await startResearch({ client, shopperRequest, now });
      if (!result.ok) {
        if (progressId) completeSearchProgress(progressId, "error");
        return failureForResearchReason(result.reason);
      }
      if (progressId) {
        beginSearchProgress(progressId);
        reportProgressUpTo(progressId, "plan_strategy");
      }
      const issuedAtMs = now();
      const requirementContract =
        buildDirectTerraRequirementContract(shopperRequest);
      let token: string;
      try {
        token = issueJobToken({
          responseId: result.responseId,
          promptVersion: result.promptVersion,
          promptHash: result.promptHash,
          productCategory: shopperRequest.query,
          requirementContract,
          secret: environment.jobTokenSecret!,
          nowMs: issuedAtMs,
          ttlMs: DIRECT_TERRA_JOB_TTL_MS,
        });
      } catch {
        if (["queued", "in_progress"].includes(result.status)) {
          let cancellationIsTerminal = false;
          try {
            const cancellation = await cancelResearch({
              client,
              responseId: result.responseId,
              promptVersion: result.promptVersion,
              promptHash: result.promptHash,
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
              issuedAtMs + DIRECT_TERRA_JOB_TTL_MS,
              admission,
            );
          }
        }
        if (progressId) completeSearchProgress(progressId, "error");
        return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
      }
      if (["queued", "in_progress"].includes(result.status)) {
        admissionTransferred = backgroundPaidLeases.track(
          result.responseId,
          issuedAtMs + DIRECT_TERRA_JOB_TTL_MS,
          admission,
        );
      }
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
      if (progressId) completeSearchProgress(progressId, "error");
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    } finally {
      if (!admissionTransferred) admission.release();
    }
  };

  const GET: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
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

    const progressId = searchProgressIdFromRequest(request);
    const requirementContract = directTerraRequirementContractFromIds(
      verified.payload.requirementIds,
    );
    if (!requirementContract) {
      return failure("invalid_job", ERROR_MESSAGES.invalidJob, 400);
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
        requirementContract,
        now,
      });
      if (!result.ok) {
        if (paidProviderJobStatusIsTerminal(result.ledger.status)) {
          backgroundPaidLeases.release(verified.payload.responseId);
        }
        if (progressId) completeSearchProgress(progressId, "error");
        return failureForResearchReason(result.reason);
      }
      if (result.state === "pending") {
        // Advance the roadmap as Terra actually researches: once it has run
        // hosted web searches it is reading pages (deep research), otherwise it
        // is still gathering the market.
        reportProgressUpTo(
          progressId,
          result.ledger.usage.webSearchCalls >= 2 ? "deep_research" : "search_market",
        );
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
      backgroundPaidLeases.release(verified.payload.responseId);
      reportProgressUpTo(progressId, "rank_results");
      const assetTargets = result.assetTargets.map((target) => ({
        ...target,
        // The encrypted job capability carries only the shopper's product
        // category across the start/poll boundary. Restore it server-side so
        // descriptive product names receive the same type-conflict protection
        // as coded model names.
        category: verified.payload.productCategory,
      }));
      let productAssets: DirectTerraProductAsset[] = assetTargets.map(
        (target) => ({
          rank: target.rank,
          productName: target.productName,
          productUrl: null,
          imageUrl: null,
        }),
      );
      try {
        const resolved = await resolveProductAssetsOnce({
          responseId: verified.payload.responseId,
          expiresAtMs: verified.payload.expiresAtMs,
          load: async () => {
            const assetAdmission = paidRequestAdmission.tryAcquire();
            if (!assetAdmission.ok) {
              throw new Error("Product asset admission is unavailable.");
            }
            try {
              const serperTransport =
                environment.serperApiKey &&
                directTerraSerperApiKeyIsValid(environment.serperApiKey)
                  ? createSerperTransport({ apiKey: environment.serperApiKey })
                  : undefined;
              const serperOrganicTransport =
                environment.serperApiKey &&
                directTerraSerperApiKeyIsValid(environment.serperApiKey)
                  ? createSerperOrganicTransport({
                      apiKey: environment.serperApiKey,
                    })
                  : undefined;
              // T8B: one bounded fetch per verified product page so the photo
              // and canonical clean URL come from the manufacturer's or
              // retailer's own page. It only touches already-verified URLs.
              const productPageTransport = createProductPageTransport({});
              return await resolveProductAssets({
                targets: assetTargets,
                reportMarkdown: result.reportMarkdown,
                activeCitationUrls: result.citationUrls,
                responseSources: result.responseSources,
                serperTransport,
                serperOrganicTransport,
                productPageTransport,
              });
            } finally {
              assetAdmission.release();
            }
          },
        });
        productAssets = safeAssetsForTargets(assetTargets, resolved);
      } catch {
        // Decoration is optional. A failed image or website lookup must never
        // delete, rewrite, reorder, or fail Terra's completed report.
      }
      if (progressId) completeSearchProgress(progressId, "done");
      return json(
        {
          pipeline: "direct_terra",
          version: DIRECT_TERRA_API_VERSION,
          state: "completed",
          reportMarkdown: result.reportMarkdown,
          citationUrls: result.citationUrls,
          sourceHosts: result.sourceHosts,
          disabledCitationCount: result.disabledCitationCount,
          priceEstimates: result.priceEstimates,
          productAssets,
          rejectedPriceObservationCount: result.rejectedPriceObservationCount,
          transactionalStatus: "unverified",
        },
        200,
      );
    } catch {
      if (progressId) completeSearchProgress(progressId, "error");
      return failure("research_failed", ERROR_MESSAGES.researchFailed, 502);
    }
  };

  const DELETE: RouteHandler = async (request) => {
    backgroundPaidLeases.sweep();
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
      if (
        paidProviderJobStatusIsTerminal(result.ledger.status) ||
        (result.ok && paidProviderJobStatusIsTerminal(result.status))
      ) {
        backgroundPaidLeases.release(verified.payload.responseId);
      }
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

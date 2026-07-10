import { NextResponse } from "next/server.js";
import {
  createOpenAIClient,
  MissingOpenAISdkError,
} from "../../../lib/openaiClient.ts";
import {
  getSafeOpenAIErrorMessage,
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "../../../lib/errorMessages.ts";
import { collectReachableCitationUrls } from "../../../lib/citationUrlVerification.ts";
import {
  filterResultToVerifiedCitations,
  getProductPageCitationVerificationResult,
  getRecommendationResultIssue,
} from "../../../lib/recommendationResultValidation.ts";
import { normalizeResearchResult } from "../../../lib/normalizeResearchResult.ts";
import { enrichResultWithReviewEvidence } from "../../../lib/productEvidence.ts";
import {
  prioritizeProductPageUrl,
  prioritizeProductPageUrlsInResult,
} from "../../../lib/productPageUrl.ts";
import { enrichProductAssets } from "../../../lib/productAssets.ts";
import {
  upgradeWeakSourceEvidence,
  verifyMissingRequirementEvidence,
} from "../../../lib/requirementEvidenceRescue.ts";
import {
  recommendationResultJsonSchema,
  recommendationResultSchema,
} from "../../../lib/recommendationSchema.ts";
import {
  buildNoExactMatchesResult,
  filterResultByRequirements,
  hasFirmRequirementFilters,
  revalidateResultCandidates,
} from "../../../lib/requirementValidation.ts";
import {
  buildResearchPrompt,
  researchSystemPrompt,
} from "../../../lib/researchPrompt.ts";
import { collectVerifiedSourceUrls } from "../../../lib/responseSources.ts";
import { extractStructuredRequirements } from "../../../lib/requirementExtraction.ts";
import {
  extractProductSpecs,
  validateSpecConstraints,
} from "../../../lib/specExtraction.ts";
import {
  applyNarrationToResult,
  buildSynthesisPrompt,
  narrationResultJsonSchema,
  narrationSystemPrompt,
  parseNarration,
} from "../../../lib/finalSynthesis.ts";
import { detectRequirementConflicts } from "../../../lib/requirementConflicts.ts";
import { normalizeSelectedSmartFeatures } from "../../../lib/smartFeatureSelection.ts";
import {
  augmentSearchPlanWithDiscoveryStrategy,
  buildOpenAIDiscoveryGapCheck,
  buildOpenAIDiscoveryStrategy,
} from "../../../lib/discoveryStrategy.ts";
import {
  generateSearchPlan,
} from "../../../lib/searchQueryExpansion.ts";
import {
  buildAdaptiveVerificationBudget,
  chooseFinalResearchContext,
  selectFinalResearchCandidates,
  shouldRunFollowUpDiscovery,
} from "../../../lib/recommendationPerformance.ts";
import { buildSearchCandidateFallbackResult } from "../../../lib/searchCandidateFallback.ts";
import {
  mergeSerperSearchResults,
  mergeProductRecommendations,
  searchSerperForProducts,
  serperCandidateToRecommendation,
} from "../../../lib/search/serper.ts";
import {
  scoreAndSelectRecommendationsWithTrace,
} from "../../../lib/recommendationScoring.ts";
import { candidateSnapshot, resultNames } from "../../../lib/recommendationFunnel.ts";
import { cacheStats } from "../../../lib/cache.ts";
import {
  buildSearchObservabilitySnapshot,
  createSearchObservabilityLedger,
  finalizeCandidateLineage,
  resolveReviewRadarCommitHash,
  reviewRadarFlagSnapshot,
  runWithSearchObservabilityLedger,
  searchPlanObservabilityObserver,
} from "../../../lib/searchObservabilityLedger.ts";
import type {
  ProductBuyingRubric,
  ProductRecommendation,
  RecommendationApiRequest,
  RecommendationResult,
  SearchPlan,
} from "../../../types/review-radar";

export const runtime = "nodejs";

const SERVER_RESEARCH_TIMEOUT_MS = 180000;
const DEBUG_HEADER = "x-reviewradar-debug";

const REQUEST_ERROR_MESSAGES = {
  invalidAvoid: "Deal-breakers must be text.",
  invalidBody: "The request body must be a JSON object.",
  invalidBudget: "Budget must be text.",
  invalidJson: "The request body must be valid JSON.",
  invalidPriorities: "Important details must be text.",
  invalidSmartFeature: "One Smart Feature selection could not be read.",
  invalidSmartFeatureList: "Smart Features must be sent as a list of selections.",
  tooManySmartFeatures: "Choose up to 12 Smart Features.",
} as const;

function helperModel() {
  return process.env.OPENAI_HELPER_MODEL || "gpt-5.4-mini";
}

function finalResearchModel() {
  return process.env.OPENAI_FINAL_MODEL || "gpt-5.4-mini";
}

type RecommendationRouteDependencies = {
  collectReachableCitationUrls: typeof collectReachableCitationUrls;
  createOpenAIClient: typeof createOpenAIClient;
  enrichProductAssets: typeof enrichProductAssets;
  enrichResultWithReviewEvidence: typeof enrichResultWithReviewEvidence;
  searchSerperForProducts: typeof searchSerperForProducts;
  upgradeWeakSourceEvidence: typeof upgradeWeakSourceEvidence;
  verifyMissingRequirementEvidence: typeof verifyMissingRequirementEvidence;
};

const defaultRecommendationRouteDependencies: RecommendationRouteDependencies = {
  collectReachableCitationUrls,
  createOpenAIClient,
  enrichProductAssets,
  enrichResultWithReviewEvidence,
  searchSerperForProducts,
  upgradeWeakSourceEvidence,
  verifyMissingRequirementEvidence,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalStringError(field: keyof RecommendationApiRequest) {
  if (field === "budget") {
    return REQUEST_ERROR_MESSAGES.invalidBudget;
  }

  if (field === "priorities") {
    return REQUEST_ERROR_MESSAGES.invalidPriorities;
  }

  if (field === "avoid") {
    return REQUEST_ERROR_MESSAGES.invalidAvoid;
  }

  return "This field must be text.";
}

function getOptionalString(
  body: Record<string, unknown>,
  field: keyof RecommendationApiRequest,
) {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return {
      error: optionalStringError(field),
    };
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getOptionalSelectedFeatures(
  body: Record<string, unknown>,
  field: keyof RecommendationApiRequest,
) {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return {
      error: REQUEST_ERROR_MESSAGES.invalidSmartFeatureList,
    };
  }

  if (value.length > 12) {
    return {
      error: REQUEST_ERROR_MESSAGES.tooManySmartFeatures,
    };
  }

  const items = normalizeSelectedSmartFeatures(value);

  const nonEmptyInputCount = value.filter(
    (item) => item !== null && item !== undefined && !(typeof item === "string" && !item.trim()),
  ).length;

  if (items.length === 0 && nonEmptyInputCount > 0) {
    return {
      error: REQUEST_ERROR_MESSAGES.invalidSmartFeature,
    };
  }

  return items.slice(0, 12);
}

function validateRequest(body: unknown) {
  if (!isRecord(body)) {
    return {
      error: REQUEST_ERROR_MESSAGES.invalidBody,
    };
  }

  const query = body.query;

  if (typeof query !== "string") {
    return {
      error: USER_ERROR_MESSAGES.emptySearch,
    };
  }

  const searchValidationError = getSearchValidationError(query);

  if (searchValidationError) {
    return {
      error: searchValidationError,
    };
  }

  const requestBody: RecommendationApiRequest = {
    query: query.trim(),
  };

  for (const field of ["budget", "priorities", "avoid"] as const) {
    const result = getOptionalString(body, field);

    if (isRecord(result) && typeof result.error === "string") {
      return {
        error: result.error,
      };
    }

    if (typeof result === "string") {
      requestBody[field] = result;
    }
  }

  const selectedFeatures = getOptionalSelectedFeatures(body, "selectedFeatures");

  if (isRecord(selectedFeatures) && typeof selectedFeatures.error === "string") {
    return {
      error: selectedFeatures.error,
    };
  }

  if (Array.isArray(selectedFeatures) && selectedFeatures.length > 0) {
    requestBody.selectedFeatures = selectedFeatures;
  }

  return {
    data: requestBody,
  };
}

function getOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text;
  }

  return "";
}

function wantsLocalDebug(request: Request) {
  return (
    process.env.NODE_ENV !== "production" &&
    request.headers.get(DEBUG_HEADER) === "true"
  );
}

function redactSecrets(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(
      /(api[_-]?key|authorization|x-api-key)\s*[:=]\s*["']?[^"'\s,;]+/gi,
      "$1=[redacted]",
    );
}

function summarizeCaughtError(error: unknown) {
  if (!isRecord(error)) {
    return {
      name: error instanceof Error ? error.name : typeof error,
      message:
        error instanceof Error ? redactSecrets(error.message).slice(0, 500) : "",
    };
  }

  const summary: Record<string, unknown> = {};

  for (const key of ["name", "status", "code", "type", "param"] as const) {
    const value = error[key];

    if (typeof value === "string" || typeof value === "number") {
      summary[key] =
        typeof value === "string" ? redactSecrets(value).slice(0, 120) : value;
    }
  }

  if (typeof error.message === "string") {
    summary.message = redactSecrets(error.message).slice(0, 500);
  }

  return summary;
}

function errorResponse(
  error: string,
  status: number,
  debug: unknown,
  includeDebug: boolean,
) {
  return NextResponse.json(
    includeDebug ? { error, debug } : { error },
    { status },
  );
}

function logDiscoveryDebug(stats: Record<string, unknown>) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.REVIEW_RADAR_DEBUG_LOGS !== "true"
  ) {
    return;
  }

  console.info("[ReviewRadar discovery]", stats);
}

type TimingStage = {
  durationMs: number;
  label: string;
};

function roundMs(value: number) {
  return Math.round(value);
}

function createRequestTiming() {
  const startedAt = performance.now();
  const stages: TimingStage[] = [];

  function record(label: string, started: number) {
    stages.push({
      durationMs: roundMs(performance.now() - started),
      label,
    });
  }

  return {
    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const started = performance.now();

      try {
        return await fn();
      } finally {
        record(label, started);
      }
    },
    measureSync<T>(label: string, fn: () => T): T {
      const started = performance.now();

      try {
        return fn();
      } finally {
        record(label, started);
      }
    },
    summary() {
      const totalMs = roundMs(performance.now() - startedAt);
      const slowestStages = [...stages]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5);

      return {
        slowestStages,
        stages,
        totalMs,
      };
    },
  };
}

function logTimingDebug(stats: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[ReviewRadar timing]", stats);
}

function removeUserHiddenProductFields(
  product: ProductRecommendation,
): ProductRecommendation {
  const visibleProduct = { ...product };
  delete visibleProduct.buyingRubric;
  delete visibleProduct.scoreBreakdown;
  delete visibleProduct.priceTrust;
  delete visibleProduct.productEligibility;

  return visibleProduct;
}

function attachBuyingRubricToProducts(
  result: RecommendationResult,
  buyingRubric: ProductBuyingRubric | undefined,
): RecommendationResult {
  if (!buyingRubric) {
    return result;
  }

  const attach = (product: ProductRecommendation): ProductRecommendation => ({
    ...product,
    buyingRubric,
  });

  return {
    ...result,
    exactMatches: result.exactMatches.map(attach),
    premiumAboveBudget: (result.premiumAboveBudget || []).map(attach),
    nearMatches: result.nearMatches.map(attach),
    recommendations: result.recommendations.map(attach),
  };
}

function removeUserHiddenResultFields(
  result: RecommendationResult,
): RecommendationResult {
  const visibleResult: RecommendationResult = {
    ...result,
    exactMatches: result.exactMatches.map(removeUserHiddenProductFields),
    premiumAboveBudget: (result.premiumAboveBudget || []).map(
      removeUserHiddenProductFields,
    ),
    nearMatches: result.nearMatches.map(removeUserHiddenProductFields),
    recommendations: result.recommendations.map(removeUserHiddenProductFields),
  };

  // Shadow-mode spec extraction: keep specConstraints out of the user-visible
  // response so it only appears in the debug payload during this phase.
  if (visibleResult.extractedRequirements?.specConstraints) {
    const visibleRequirements = { ...visibleResult.extractedRequirements };

    delete visibleRequirements.specConstraints;
    visibleResult.extractedRequirements = visibleRequirements;
  }

  return visibleResult;
}

type ServerSearchFallbackCoverage = {
  executedQueryCount: number;
  generatedQueryCount: number;
  rawCandidateCount: number;
  sourceTimeouts: number;
  stageCounts: { pass1: number; pass2: number; pass3: number };
};

async function buildServerSearchFallbackResult(options: {
  baseResult: Parameters<typeof buildSearchCandidateFallbackResult>[0];
  discoveryCoverage: ServerSearchFallbackCoverage;
  maxEnrichedProducts: number;
  requestWithRequirements: RecommendationApiRequest;
  routeDependencies: RecommendationRouteDependencies;
  serperRecommendations: ProductRecommendation[];
}) {
  const {
    baseResult,
    discoveryCoverage,
    maxEnrichedProducts,
    requestWithRequirements,
    routeDependencies,
    serperRecommendations,
  } = options;
  const searchCandidateResult = buildSearchCandidateFallbackResult(
    baseResult,
    serperRecommendations,
    requestWithRequirements,
  );
  const fallbackEvidenceResult =
    await routeDependencies.enrichResultWithReviewEvidence(
      searchCandidateResult,
      {
        maxProducts: maxEnrichedProducts,
      },
    );
  const fallbackAssetResult =
    await routeDependencies.enrichProductAssets(fallbackEvidenceResult);
  const fallbackVerifiedFactsResult =
    await routeDependencies.verifyMissingRequirementEvidence(
      fallbackAssetResult,
      requestWithRequirements,
      {
        maxProducts: maxEnrichedProducts,
      },
    );
  const fallbackRevalidatedResult = revalidateResultCandidates(
    fallbackVerifiedFactsResult,
    requestWithRequirements,
  );
  const { result: fallbackResult, finalSelectionTrace } =
    scoreAndSelectRecommendationsWithTrace(
      {
        ...fallbackRevalidatedResult,
        extractedRequirements: requestWithRequirements.extractedRequirements,
      },
      requestWithRequirements,
      {
        ...discoveryCoverage,
        rawCandidateCount: serperRecommendations.length,
      },
    );
  const prioritizedResult = prioritizeProductPageUrlsInResult(fallbackResult);
  finalizeCandidateLineage({
    candidatePool: serperRecommendations,
    citationValid: serperRecommendations,
    requirementExact: searchCandidateResult.recommendations,
    requirementNear: searchCandidateResult.nearMatches,
    revalidatedExact: fallbackRevalidatedResult.exactMatches,
    revalidatedNear: fallbackRevalidatedResult.nearMatches,
    finalExact: prioritizedResult.exactMatches,
    finalNear: prioritizedResult.nearMatches,
    finalSelectionTrace,
  });
  const searchLedger = buildSearchObservabilitySnapshot();

  return {
    result: prioritizedResult,
    stageFunnel: {
      path: "search_candidate_fallback" as const,
      stages: [
        {
          stage: "candidatePool",
          names: resultNames(serperRecommendations),
        },
        {
          stage: "afterRequirementFilter",
          names: resultNames(searchCandidateResult.recommendations),
          near: resultNames(searchCandidateResult.nearMatches),
        },
        {
          stage: "afterEnrichment",
          names: resultNames(fallbackEvidenceResult.recommendations),
          near: resultNames(fallbackEvidenceResult.nearMatches),
        },
        {
          stage: "afterAssets",
          names: resultNames(fallbackAssetResult.recommendations),
          near: resultNames(fallbackAssetResult.nearMatches),
        },
        {
          stage: "afterRescue",
          names: resultNames(fallbackVerifiedFactsResult.recommendations),
          near: resultNames(fallbackVerifiedFactsResult.nearMatches),
        },
        {
          stage: "afterRevalidation",
          names: resultNames(fallbackRevalidatedResult.exactMatches),
          near: resultNames(fallbackRevalidatedResult.nearMatches),
        },
        {
          stage: "final",
          names: resultNames(prioritizedResult.exactMatches),
          near: resultNames(prioritizedResult.nearMatches),
        },
      ],
      poolCandidates: serperRecommendations.map((product) =>
        candidateSnapshot(product),
      ),
      postFilterCandidates: searchCandidateResult.recommendations.map(
        (product) => candidateSnapshot(product),
      ),
      sourceUpgradeDecisions: [],
      sourceUpgradeTraces: [],
      finalSelectionTrace,
      searchLedger,
      stagesBypassed: [
        {
          stage: "citation_verification",
          reason: "serper_candidates_are_provider_verified",
        },
        {
          stage: "source_quality_upgrade",
          reason: "fallback_path_does_not_run_source_upgrade",
        },
      ],
    },
  };
}

function shouldRunNoExactSanityFallback(options: {
  categoryGroup: string | undefined;
  request: RecommendationApiRequest;
  serperCandidateCount: number;
}) {
  const { categoryGroup, request, serperCandidateCount } = options;

  if (!categoryGroup || categoryGroup === "general" || serperCandidateCount < 3) {
    return false;
  }

  const requirements = request.extractedRequirements;
  const specificHardConstraintCount = (requirements?.requiredConstraints || []).filter(
    (constraint) => constraint.type !== "budget" && constraint.type !== "brand",
  ).length;
  const sizeConstraintCount = requirements?.sizeConstraints.length || 0;
  const maxBudgetRule = requirements?.budgetRules.find(
    (rule) => rule.operator === "max" && rule.amount !== null,
  );
  const budget =
    typeof maxBudgetRule?.amount === "number" ? maxBudgetRule.amount : undefined;

  if (specificHardConstraintCount + sizeConstraintCount > 1) {
    return false;
  }

  return budget === undefined || budget >= 50;
}

async function handleRecommendationPostWithContext(
  request: Request,
  routeDependencies: RecommendationRouteDependencies,
  includeDebug: boolean,
) {
  const timing = createRequestTiming();
  const withTimingDebug = (debug: Record<string, unknown>) => ({
    ...debug,
    timing: timing.summary(),
  });
  let debugStage = "read_request";
  let body: unknown;
  // Captured after Serper discovery so a later AI-research failure can still
  // return verified search candidates instead of a hard error.
  let fallbackContext: {
    generatedQueries: string[];
    requestWithRequirements: RecommendationApiRequest;
    searchPlan: SearchPlan;
    serperResult: Awaited<ReturnType<typeof searchSerperForProducts>>;
  } | null = null;

  try {
    body = await timing.measure("read_request_body", () => request.json());
  } catch {
    return NextResponse.json(
      { error: REQUEST_ERROR_MESSAGES.invalidJson },
      { status: 400 },
    );
  }

  const validation = validateRequest(body);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: USER_ERROR_MESSAGES.missingApiKey,
      },
      { status: 500 },
    );
  }

  try {
    debugStage = "openai_request";
    const client = await timing.measure("create_openai_client", () =>
      routeDependencies.createOpenAIClient(apiKey),
    );
    const helperResearchModel = helperModel();
    const finalSynthesisModel = finalResearchModel();
    const extractedRequirements = timing.measureSync(
      "extract_requirements",
      () => extractStructuredRequirements(validation.data),
    );
    const requestWithRequirements = {
      ...validation.data,
      extractedRequirements,
    };
    const requirementConflicts = timing.measureSync(
      "detect_requirement_conflicts",
      () => detectRequirementConflicts(requestWithRequirements),
    );

    if (requirementConflicts.length > 0) {
      return NextResponse.json(
        {
          error: `Please fix conflicting requirements: ${requirementConflicts.join(" ")}`,
        },
        { status: 400 },
      );
    }

    debugStage = "discovery_strategy";
    const discoveryStrategy = await timing.measure(
      "openai_discovery_strategy",
      () =>
        buildOpenAIDiscoveryStrategy({
          client,
          input: requestWithRequirements,
          model: helperResearchModel,
          observer: includeDebug ? searchPlanObservabilityObserver : undefined,
        }),
    );
    const searchPlan = timing.measureSync(
      "build_search_plan",
      () =>
        augmentSearchPlanWithDiscoveryStrategy(
          generateSearchPlan(
            requestWithRequirements,
            includeDebug ? searchPlanObservabilityObserver : undefined,
          ),
          discoveryStrategy,
          requestWithRequirements,
          includeDebug ? searchPlanObservabilityObserver : undefined,
        ),
    );
    const generatedQueries = searchPlan.queries.map((query) => query.query);
    const requestWithStrategy = {
      ...requestWithRequirements,
      discoveryStrategy,
    };

    debugStage = "serper_discovery";
    let serperResult = await timing.measure(
      "serper_discovery",
      () =>
        routeDependencies.searchSerperForProducts(
          searchPlan,
          requestWithStrategy,
        ),
    );

    debugStage = "discovery_gap_check";
    const discoveryGapCheck = await timing.measure(
      "openai_discovery_gap_check",
      () =>
        buildOpenAIDiscoveryGapCheck({
          candidates: serperResult.candidates,
          client,
          input: requestWithStrategy,
          model: helperResearchModel,
          observer: includeDebug ? searchPlanObservabilityObserver : undefined,
          strategy: discoveryStrategy,
        }),
    );

    const runFollowUpDiscovery = timing.measureSync(
      "decide_follow_up_discovery",
      () =>
        shouldRunFollowUpDiscovery({
          candidates: serperResult.candidates,
          followUpQueryCount: discoveryGapCheck.followUpQueries.length,
          marketCoverage: serperResult.stats.marketCoverage,
          missingExpectedProductCount:
            discoveryGapCheck.missingExpectedProducts.length,
        }),
    );

    if (runFollowUpDiscovery) {
      const followUpSerperResult =
        await timing.measure(
          "serper_follow_up_discovery",
          () =>
            routeDependencies.searchSerperForProducts(
              discoveryGapCheck.followUpQueries,
              {
                ...requestWithStrategy,
                discoveryGapCheck,
              },
            ),
        );

      serperResult = timing.measureSync(
        "merge_follow_up_discovery",
        () => mergeSerperSearchResults(serperResult, followUpSerperResult),
      );
    }

    const requestWithDiscovery = {
      ...requestWithStrategy,
      discoveryGapCheck,
    };

    fallbackContext = {
      generatedQueries,
      requestWithRequirements: requestWithDiscovery,
      searchPlan,
      serperResult,
    };

    const finalResearchCandidates = timing.measureSync(
      "shortlist_final_research_candidates",
      () =>
        selectFinalResearchCandidates({
          candidates: serperResult.candidates,
          expectedProducts: discoveryStrategy.expectedProducts,
        }),
    );
    const finalSearchContextSize = timing.measureSync(
      "choose_final_search_context",
      () =>
        chooseFinalResearchContext({
          candidates: finalResearchCandidates,
          discoveryGapCount: runFollowUpDiscovery
            ? discoveryGapCheck.followUpQueries.length
            : 0,
          sourceTimeouts: serperResult.stats.sourceTimeouts,
        }),
    );

    const response = await timing.measure("openai_final_research", () =>
      client.responses.create({
        model: finalSynthesisModel,
        max_output_tokens: 16000,
        tools: [
          {
            type: "web_search",
            search_context_size: finalSearchContextSize,
          },
        ],
        tool_choice: "required",
        include: ["web_search_call.action.sources"],
        input: [
          {
            role: "system",
            content: researchSystemPrompt,
          },
          {
            role: "user",
            content: buildResearchPrompt(
              requestWithDiscovery,
              generatedQueries,
              finalResearchCandidates,
              serperResult.stats.marketCoverage,
            ),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "review_radar_recommendations",
            schema: recommendationResultJsonSchema,
            strict: true,
          },
        },
      }, {
        timeout: SERVER_RESEARCH_TIMEOUT_MS,
      }),
    );

    const outputText = getOutputText(response);

    if (!outputText) {
      return errorResponse(
        USER_ERROR_MESSAGES.noReliableEvidence,
        502,
        withTimingDebug({
          finalSynthesisModel,
          stage: "read_output_text",
          outputTextLength: 0,
        }),
        includeDebug,
      );
    }

    let parsed: unknown;

    try {
      debugStage = "parse_output_text";
      parsed = timing.measureSync("parse_final_research_json", () =>
        JSON.parse(outputText),
      );
    } catch {
      return errorResponse(
        USER_ERROR_MESSAGES.badStructuredOutput,
        502,
        withTimingDebug({
          finalSynthesisModel,
          stage: "parse_output_text",
          outputTextLength: outputText.length,
        }),
        includeDebug,
      );
    }

    debugStage = "validate_structured_output";
    const result = timing.measureSync(
      "validate_final_research_schema",
      () => recommendationResultSchema.safeParse(normalizeResearchResult(parsed)),
    );

    if (!result.success) {
      return errorResponse(
        USER_ERROR_MESSAGES.badStructuredOutput,
        502,
        withTimingDebug({
          finalSynthesisModel,
          stage: "validate_structured_output",
          issues: result.error.issues.slice(0, 12).map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }),
        includeDebug,
      );
    }

    const serperRecommendations = timing.measureSync(
      "normalize_serper_candidates",
      () => serperResult.candidates.map(serperCandidateToRecommendation),
    );
    const mergedCandidates = timing.measureSync(
      "merge_ai_and_serper_candidates",
      () =>
        mergeProductRecommendations(
          result.data.candidate_products,
          serperRecommendations,
        ),
    );
    const candidateResult = {
      ...result.data,
      generated_queries:
        result.data.generated_queries.length > 0
          ? result.data.generated_queries
          : generatedQueries,
      raw_candidate_count: mergedCandidates.products.length,
      recommendations: mergedCandidates.products,
    };

    debugStage = "verify_citations";
    let verifiedUrls = timing.measureSync(
      "collect_verified_openai_sources",
      () => collectVerifiedSourceUrls(response),
    );
    // Serper candidate URLs come from live Google results, so they are
    // treated as verified without a network re-check. Re-fetching them
    // dropped real products whenever retailers bot-walled the request
    // (Amazon 503s, Home Depot timeouts, etc.).
    const serperVerifiedUrls = new Set(
      serperRecommendations.flatMap((product) =>
        product.citations.map((citation) => citation.url),
      ),
    );

    verifiedUrls = new Set([...verifiedUrls, ...serperVerifiedUrls]);

    const productPagesNeedingVerification =
      getProductPageCitationVerificationResult(candidateResult, verifiedUrls);

    if (productPagesNeedingVerification.recommendations.length > 0) {
      const reachableProductPageUrls = await timing.measure(
        "collect_reachable_product_page_urls",
        () =>
          routeDependencies.collectReachableCitationUrls(
            productPagesNeedingVerification,
          ),
      );

      verifiedUrls = new Set([...verifiedUrls, ...reachableProductPageUrls]);
    }

    if (verifiedUrls.size === 0) {
      verifiedUrls =
        await timing.measure("collect_reachable_citation_urls", () =>
          routeDependencies.collectReachableCitationUrls(candidateResult),
        );
    }

    const verifiedResult = timing.measureSync(
      "filter_to_verified_citations",
      () => {
        const filteredResult = filterResultToVerifiedCitations(
          candidateResult,
          verifiedUrls,
        );

        return {
          ...filteredResult,
          recommendations: filteredResult.recommendations.map(
            prioritizeProductPageUrl,
          ),
        };
      },
    );
    const discoveryCoverage = {
      executedQueryCount:
        serperResult.stats.shoppingCalls +
        serperResult.stats.organicCalls +
        serperResult.stats.retailerDomainCalls +
        serperResult.stats.directRetailerCalls,
      generatedQueryCount: generatedQueries.length,
      rawCandidateCount: candidateResult.recommendations.length,
      sourceTimeouts: serperResult.stats.sourceTimeouts,
      stageCounts: {
        pass1: searchPlan.stagedQueries.pass1.length,
        pass2: searchPlan.stagedQueries.pass2.length,
        pass3: searchPlan.stagedQueries.pass3.length,
      },
    };
    const resultIssue = timing.measureSync(
      "check_recommendation_result_quality",
      () => getRecommendationResultIssue(verifiedResult, verifiedUrls),
    );

    if (resultIssue) {
      if (
        resultIssue === "no_reliable_evidence" &&
        serperRecommendations.length > 0
      ) {
        debugStage = "search_candidate_fallback";
        const fallbackOutcome = await timing.measure(
          "search_candidate_fallback",
          () =>
            buildServerSearchFallbackResult({
              baseResult: candidateResult,
              discoveryCoverage,
              maxEnrichedProducts: serperResult.stats.maxEnrichedProducts,
              requestWithRequirements: requestWithDiscovery,
              routeDependencies,
              serperRecommendations,
            }),
        );
        const prioritizedFallbackResult = fallbackOutcome.result;
        const fallbackDebug = {
          fallbackReason: resultIssue,
          fallbackSource: "serper_candidates",
          fallbackTrace: {
            reason: resultIssue,
            source: "serper_candidates",
            stagesBypassed: fallbackOutcome.stageFunnel.stagesBypassed,
          },
          generatedQueries,
          searchPlanStages: {
            pass1: searchPlan.stagedQueries.pass1.map((query) => query.query),
            pass2: searchPlan.stagedQueries.pass2.map((query) => query.query),
            pass3: searchPlan.stagedQueries.pass3.map((query) => query.query),
          },
          serperCandidateCount: serperRecommendations.length,
          stageFunnel: {
            ...fallbackOutcome.stageFunnel,
            raw: serperResult.stats.funnel?.rawNames || [],
            seeds: serperResult.stats.seedProductNames,
            rejectedCheap: serperResult.stats.funnel?.rejected || [],
          },
          timing: timing.summary(),
          verifiedUrlCount: verifiedUrls.size,
        };
        const userVisibleFallbackResult = removeUserHiddenResultFields(
          prioritizedFallbackResult,
        );

        return NextResponse.json(
          includeDebug
            ? {
                result: prioritizedFallbackResult,
                debug: fallbackDebug,
              }
            : { result: userVisibleFallbackResult },
        );
      }

      if (
        resultIssue === "no_reliable_evidence" &&
        hasFirmRequirementFilters(requestWithDiscovery)
      ) {
        return NextResponse.json({
          result: prioritizeProductPageUrlsInResult(
            buildNoExactMatchesResult(candidateResult),
          ),
        });
      }

      return errorResponse(
        resultIssue === "no_reliable_evidence"
          ? USER_ERROR_MESSAGES.noReliableEvidence
          : USER_ERROR_MESSAGES.badStructuredOutput,
        resultIssue === "no_reliable_evidence" ? 422 : 502,
        withTimingDebug({
          finalSynthesisModel,
          stage: "trust_validation",
          resultIssue,
          verifiedUrlCount: verifiedUrls.size,
          candidateCount: candidateResult.recommendations.length,
          remainingCount: verifiedResult.recommendations.length,
        }),
        includeDebug,
      );
    }

    debugStage = "filter_requirements";
    const requirementFilteredResult = timing.measureSync(
      "filter_requirements",
      () => filterResultByRequirements(verifiedResult, requestWithDiscovery),
    );
    const rubricAwareResult = timing.measureSync(
      "attach_buying_rubric",
      () =>
        attachBuyingRubricToProducts(
          requirementFilteredResult,
          discoveryStrategy.buyingRubric,
        ),
    );
    const verificationBudget = timing.measureSync(
      "build_adaptive_verification_budget",
      () =>
        buildAdaptiveVerificationBudget({
          categoryGroup: serperResult.stats.categoryGroup,
          maxEnrichedProducts: serperResult.stats.maxEnrichedProducts,
          request: requestWithDiscovery,
          result: rubricAwareResult,
          serperCandidateCount: serperRecommendations.length,
        }),
    );
    const evidenceEnrichedResult =
      await timing.measure(
        "review_evidence_enrichment",
        () =>
          routeDependencies.enrichResultWithReviewEvidence(
            rubricAwareResult,
            {
              mode: "trust_ladder",
              concurrency: verificationBudget.concurrency,
              fullTrustLadderProductCount:
                verificationBudget.fullTrustLadderProductCount,
              maxProducts: verificationBudget.maxProducts,
            },
          ),
      );
    const assetEnrichedResult =
      await timing.measure("product_asset_enrichment", () =>
        routeDependencies.enrichProductAssets(evidenceEnrichedResult),
      );
    const verifiedFactsResult =
      await timing.measure(
        "missing_requirement_evidence_rescue",
        () =>
          routeDependencies.verifyMissingRequirementEvidence(
            assetEnrichedResult,
            requestWithDiscovery,
            {
              concurrency: verificationBudget.concurrency,
              maxFactsPerProduct: verificationBudget.maxFactsPerProduct,
              maxProducts: verificationBudget.maxProducts,
            },
          ),
      );
    const revalidatedAssetResult = timing.measureSync(
      "revalidate_after_enrichment",
      () => revalidateResultCandidates(verifiedFactsResult, requestWithDiscovery),
    );

    if (
      revalidatedAssetResult.exactMatches.length === 0 &&
      shouldRunNoExactSanityFallback({
        categoryGroup: serperResult.stats.categoryGroup,
        request: requestWithDiscovery,
        serperCandidateCount: serperRecommendations.length,
      })
    ) {
      debugStage = "no_exact_sanity_fallback";
      const sanityFallbackOutcome = await timing.measure(
        "no_exact_sanity_fallback",
        () =>
          buildServerSearchFallbackResult({
            baseResult: {
              ...candidateResult,
              search_summary:
                "ReviewRadar expanded this common search after the first pass found no exact matches.",
              final_buying_advice:
                "These products come from expanded shopping search results checked against your required filters. Verify current price, fit, and availability before buying.",
            },
            discoveryCoverage,
            maxEnrichedProducts: serperResult.stats.maxEnrichedProducts,
            requestWithRequirements: requestWithDiscovery,
            routeDependencies,
            serperRecommendations,
          }),
      );
      const sanityFallbackResult = sanityFallbackOutcome.result;

      if (
        sanityFallbackResult.exactMatches.length > 0 ||
        sanityFallbackResult.nearMatches.length > 0
      ) {
        return NextResponse.json(
          includeDebug
            ? {
                result: sanityFallbackResult,
                debug: {
                  fallbackReason: "no_exact_common_search_sanity_check",
                  fallbackSource: "serper_candidates",
                  fallbackTrace: {
                    reason: "no_exact_common_search_sanity_check",
                    source: "serper_candidates",
                    stagesBypassed:
                      sanityFallbackOutcome.stageFunnel.stagesBypassed,
                  },
                  generatedQueries,
                  searchPlanStages: {
                    pass1: searchPlan.stagedQueries.pass1.map(
                      (query) => query.query,
                    ),
                    pass2: searchPlan.stagedQueries.pass2.map(
                      (query) => query.query,
                    ),
                    pass3: searchPlan.stagedQueries.pass3.map(
                      (query) => query.query,
                    ),
                  },
                  serperCandidateCount: serperRecommendations.length,
                  stageFunnel: {
                    ...sanityFallbackOutcome.stageFunnel,
                    raw: serperResult.stats.funnel?.rawNames || [],
                    seeds: serperResult.stats.seedProductNames,
                    rejectedCheap:
                      serperResult.stats.funnel?.rejected || [],
                  },
                  timing: timing.summary(),
                },
              }
            : { result: removeUserHiddenResultFields(sanityFallbackResult) },
        );
      }
    }

    const {
      result: sourceUpgradedResult,
      sourceUpgradeDecisions = [],
      sourceUpgradeTraces,
    } =
      await timing.measure(
        "source_quality_upgrade",
        () =>
          routeDependencies.upgradeWeakSourceEvidence(
            revalidatedAssetResult,
            requestWithDiscovery,
          ),
      );
    const { result: enrichedResult, finalSelectionTrace } = timing.measureSync(
      "score_and_select_results",
      () =>
        scoreAndSelectRecommendationsWithTrace(
          {
            ...sourceUpgradedResult,
            extractedRequirements,
          },
          requestWithDiscovery,
          discoveryCoverage,
        ),
    );
    if (includeDebug) {
      finalizeCandidateLineage({
        candidatePool: candidateResult.recommendations,
        citationValid: verifiedResult.recommendations,
        requirementExact: requirementFilteredResult.recommendations,
        requirementNear: requirementFilteredResult.nearMatches,
        revalidatedExact: revalidatedAssetResult.exactMatches,
        revalidatedNear: revalidatedAssetResult.nearMatches,
        finalExact: enrichedResult.exactMatches,
        finalNear: enrichedResult.nearMatches,
        finalSelectionTrace,
      });
    }
    const searchLedger = includeDebug
      ? buildSearchObservabilitySnapshot()
      : undefined;
    const discoveryDebug: Record<string, unknown> = {
      generatedQueries,
      // Shadow-mode spec extraction: surfaced for before/after comparison only.
      // The per-candidate extraction work is gated on includeDebug so production
      // requests do no extra work.
      specConstraints:
        requestWithDiscovery.extractedRequirements?.specConstraints || [],
      candidateSpecs: includeDebug
        ? serperRecommendations.slice(0, 20).map((product) => {
            const specs = extractProductSpecs(product);

            return {
              name: product.name,
              specs,
              specValidation: validateSpecConstraints(
                specs,
                requestWithDiscovery.extractedRequirements?.specConstraints || [],
              ),
            };
          })
        : undefined,
      searchPlanStages: {
        pass1: searchPlan.stagedQueries.pass1.map((query) => query.query),
        pass2: searchPlan.stagedQueries.pass2.map((query) => query.query),
        pass3: searchPlan.stagedQueries.pass3.map((query) => query.query),
      },
      // Stage-by-stage pipeline funnel (debug only): the product names present in the
      // working set after EACH stage, so a scorecard can pinpoint exactly where a
      // candidate (e.g. a known leader) is dropped. Plus rich per-candidate snapshots
      // of the discovered pool so a dropped leader's detail is available. Measurement
      // only — reads existing results, changes nothing.
      stageFunnel: includeDebug
        ? {
            raw: serperResult.stats.funnel?.rawNames || [],
            seeds: serperResult.stats.seedProductNames,
            rejectedCheap: serperResult.stats.funnel?.rejected || [],
            stages: [
              { stage: "candidatePool", names: resultNames(candidateResult.recommendations) },
              { stage: "afterCitationVerify", names: resultNames(verifiedResult.recommendations) },
              { stage: "afterRequirementFilter", names: resultNames(requirementFilteredResult.recommendations), near: resultNames(requirementFilteredResult.nearMatches) },
              { stage: "afterEnrichment", names: resultNames(evidenceEnrichedResult.recommendations) },
              { stage: "afterAssets", names: resultNames(assetEnrichedResult.recommendations) },
              { stage: "afterRescue", names: resultNames(verifiedFactsResult.recommendations) },
              {
                stage: "afterRevalidation",
                names: [
                  ...resultNames(revalidatedAssetResult.exactMatches),
                  ...resultNames(revalidatedAssetResult.nearMatches),
                ],
              },
              {
                stage: "final",
                names: resultNames(enrichedResult.exactMatches),
                near: resultNames(enrichedResult.nearMatches),
              },
            ],
            // Rich snapshots of the full discovered pool + the post-verify and
            // post-filter sets, so a dropped leader's brand/tier/price/citations and
            // requirementCheck are inspectable at the point it was last present.
            poolCandidates: candidateResult.recommendations.map((product) => candidateSnapshot(product)),
            postVerifyCandidates: verifiedResult.recommendations.map((product) => candidateSnapshot(product)),
            postFilterCandidates: requirementFilteredResult.recommendations.map((product) => candidateSnapshot(product)),
            // Per-candidate trace of every final-selection decision: which stream
            // each candidate ended up in (exactScored / nearScored / etc.) and
            // exactly why it was selected, collapsed, dropped, or demoted. This
            // covers candidates that reach scoreAndSelectRecommendations — pipeline
            // stages before this point are covered by the stages[] funnel above.
            sourceUpgradeDecisions,
            sourceUpgradeTraces,
            finalSelectionTrace,
            searchLedger,
          }
        : undefined,
      serperCandidateCount: serperResult.stats.collectedCandidates,
      serperDuplicateCount: serperResult.stats.duplicateCandidatesRemoved,
      mergedDuplicateCount: mergedCandidates.duplicateCount,
      rawCandidateCount: candidateResult.recommendations.length,
      exactMatchCount: revalidatedAssetResult.exactMatches.length,
      nearMatchCount: revalidatedAssetResult.nearMatches.length,
      categoryGroup: serperResult.stats.categoryGroup,
      selectedSourcePack: serperResult.stats.selectedSourcePack,
      serperSearchedQueries: serperResult.stats.searchedShoppingQueries,
      retailerDomainQueries: serperResult.stats.searchedRetailerDomainQueries,
      searchDepth: serperResult.stats.searchDepth,
      serperShoppingCalls: serperResult.stats.shoppingCalls,
      serperOrganicCalls: serperResult.stats.organicCalls,
      seedSearchesRun: serperResult.stats.seedSearchesRun,
      seedProductNames: serperResult.stats.seedProductNames,
      serperRetailerDomainCalls: serperResult.stats.retailerDomainCalls,
      serperDirectRetailerCalls: serperResult.stats.directRetailerCalls,
      preFilteredCandidateCount: serperResult.stats.preFilteredCandidates,
      rejectedCandidateCount: serperResult.stats.rejectedCandidates,
      finalResearchCandidateCount: finalResearchCandidates.length,
      finalResearchOriginalCandidateCount: serperResult.candidates.length,
      finalSearchContextSize,
      followUpDiscoveryRun: runFollowUpDiscovery,
      verificationBudget,
      discoveryExpectedProducts: discoveryStrategy.expectedProducts.map(
        (target) => [target.brand, target.productLine].filter(Boolean).join(" "),
      ),
      discoveryBuyingRubric: discoveryStrategy.buyingRubric,
      discoveryFollowUpQueries: discoveryGapCheck.followUpQueries,
      discoveryMissingExpectedProducts:
        discoveryGapCheck.missingExpectedProducts,
      finalSynthesisModel,
      helperModel: helperResearchModel,
      serperSkippedReason: serperResult.stats.skippedReason,
      sourceTimeouts: serperResult.stats.sourceTimeouts,
    };

    logDiscoveryDebug(discoveryDebug);

    // Phase 5: optional explainer pass. The product set, ranking, prices, specs,
    // and citations are already final; this only rewrites buyer-facing prose for
    // the displayed cards, guarded so nothing can be added or altered. Any
    // failure falls back to the deterministic prose.
    let narratedResult = enrichedResult;

    if (process.env.REVIEW_RADAR_LLM_NARRATION?.trim() === "on") {
      try {
        const narrationResponse = await timing.measure(
          "openai_narration",
          () =>
            client.responses.create(
              {
                model: helperResearchModel,
                max_output_tokens: 4000,
                input: [
                  { role: "system", content: narrationSystemPrompt },
                  {
                    role: "user",
                    content: buildSynthesisPrompt(
                      enrichedResult,
                      requestWithDiscovery,
                    ),
                  },
                ],
                text: {
                  format: {
                    type: "json_schema",
                    name: "review_radar_narration",
                    schema: narrationResultJsonSchema,
                    strict: true,
                  },
                },
              },
              { timeout: 60000 },
            ),
        );
        const narration = timing.measureSync("parse_narration", () =>
          parseNarration(getOutputText(narrationResponse)),
        );

        if (narration) {
          narratedResult = timing.measureSync("apply_narration", () =>
            applyNarrationToResult(enrichedResult, narration),
          );
        }
      } catch (error) {
        logDiscoveryDebug(withTimingDebug({
          stage: "llm_narration_failed",
          error: summarizeCaughtError(error),
        }));
      }
    }

    const prioritizedResult = timing.measureSync(
      "prioritize_product_page_urls",
      () => prioritizeProductPageUrlsInResult(narratedResult),
    );
    const userVisibleResult = timing.measureSync(
      "remove_user_hidden_fields",
      () => removeUserHiddenResultFields(prioritizedResult),
    );
    const timingSummary = timing.summary();

    discoveryDebug.timing = timingSummary;
    logTimingDebug({
      exactMatches: prioritizedResult.exactMatches.length,
      finalSynthesisModel,
      nearMatches: prioritizedResult.nearMatches.length,
      query: validation.data.query,
      searchDepth: serperResult.stats.searchDepth,
      slowestStages: timingSummary.slowestStages,
      totalMs: timingSummary.totalMs,
    });

    return NextResponse.json(
      includeDebug
        ? {
            result: prioritizedResult,
            debug: discoveryDebug,
          }
        : { result: userVisibleResult },
    );
  } catch (error) {
    if (error instanceof MissingOpenAISdkError) {
      return NextResponse.json(
        { error: USER_ERROR_MESSAGES.missingApiKey },
        { status: 500 },
      );
    }

    // If AI research failed after Serper discovery succeeded, fall back to
    // the verified search candidates instead of failing the whole request.
    if (fallbackContext && fallbackContext.serperResult.candidates.length > 0) {
      const activeFallbackContext = fallbackContext;

      try {
        const serperRecommendations = timing.measureSync(
          "fallback_normalize_serper_candidates",
          () =>
            activeFallbackContext.serperResult.candidates.map(
              serperCandidateToRecommendation,
            ),
        );
        const stats = activeFallbackContext.serperResult.stats;
        const fallbackOutcome = await timing.measure(
          "ai_error_search_fallback",
          () =>
            buildServerSearchFallbackResult({
              baseResult: {
                search_summary:
                  "Live AI research was unavailable, so these picks come from shopping search results checked against your filters.",
                assumptions: [
                  "AI research failed during this search, so results rely on shopping search data only.",
                ],
                generated_queries: activeFallbackContext.generatedQueries,
                raw_candidate_count: serperRecommendations.length,
                recommendations: [],
                what_to_avoid: [],
                final_buying_advice:
                  "These picks come from live shopping search results. Verify current price, specs, and availability before buying.",
              },
              discoveryCoverage: {
                executedQueryCount:
                  stats.shoppingCalls +
                  stats.organicCalls +
                  stats.retailerDomainCalls +
                  stats.directRetailerCalls,
                generatedQueryCount: activeFallbackContext.generatedQueries.length,
                rawCandidateCount: serperRecommendations.length,
                sourceTimeouts: stats.sourceTimeouts,
                stageCounts: {
                  pass1: activeFallbackContext.searchPlan.stagedQueries.pass1.length,
                  pass2: activeFallbackContext.searchPlan.stagedQueries.pass2.length,
                  pass3: activeFallbackContext.searchPlan.stagedQueries.pass3.length,
                },
              },
              maxEnrichedProducts: stats.maxEnrichedProducts,
              requestWithRequirements: activeFallbackContext.requestWithRequirements,
              routeDependencies,
              serperRecommendations,
            }),
        );
        const prioritizedFallbackResult = fallbackOutcome.result;

        logTimingDebug({
          fallbackSource: "serper_candidates",
          query: activeFallbackContext.requestWithRequirements.query,
          slowestStages: timing.summary().slowestStages,
          stage: debugStage,
          totalMs: timing.summary().totalMs,
        });

        if (
          prioritizedFallbackResult.exactMatches.length > 0 ||
          prioritizedFallbackResult.nearMatches.length > 0
        ) {
          return NextResponse.json(
            includeDebug
              ? {
                  result: prioritizedFallbackResult,
                  debug: withTimingDebug({
                    fallbackReason: "ai_research_error",
                    fallbackSource: "serper_candidates",
                    fallbackTrace: {
                      reason: "ai_research_error",
                      source: "serper_candidates",
                      stagesBypassed:
                        fallbackOutcome.stageFunnel.stagesBypassed,
                    },
                    generatedQueries: activeFallbackContext.generatedQueries,
                    searchPlanStages: {
                      pass1:
                        activeFallbackContext.searchPlan.stagedQueries.pass1.map(
                          (query) => query.query,
                        ),
                      pass2:
                        activeFallbackContext.searchPlan.stagedQueries.pass2.map(
                          (query) => query.query,
                        ),
                      pass3:
                        activeFallbackContext.searchPlan.stagedQueries.pass3.map(
                          (query) => query.query,
                        ),
                    },
                    stageFunnel: {
                      ...fallbackOutcome.stageFunnel,
                      raw: stats.funnel?.rawNames || [],
                      seeds: stats.seedProductNames,
                      rejectedCheap: stats.funnel?.rejected || [],
                    },
                    stage: debugStage,
                    error: summarizeCaughtError(error),
                  }),
                }
              : {
                  result: removeUserHiddenResultFields(
                    prioritizedFallbackResult,
                  ),
                },
          );
        }
      } catch (fallbackError) {
        logDiscoveryDebug(withTimingDebug({
          stage: "ai_error_search_fallback_failed",
          error: summarizeCaughtError(fallbackError),
        }));
      }
    }

    return errorResponse(
      getSafeOpenAIErrorMessage(error),
      502,
      withTimingDebug({
        stage: debugStage,
        error: summarizeCaughtError(error),
      }),
      includeDebug,
    );
  }
}

async function handleRecommendationPost(
  request: Request,
  routeDependencies: RecommendationRouteDependencies,
) {
  const includeDebug = wantsLocalDebug(request);
  const ledger = includeDebug
    ? createSearchObservabilityLedger({
        commitHash: resolveReviewRadarCommitHash(),
        flags: reviewRadarFlagSnapshot(),
        helperModel: helperModel(),
        finalModel: finalResearchModel(),
        serperCacheEmptyAtStart: cacheStats().entries === 0,
      })
    : null;

  return runWithSearchObservabilityLedger(ledger, () =>
    handleRecommendationPostWithContext(
      request,
      routeDependencies,
      includeDebug,
    ),
  );
}

export function createRecommendationPostHandler(
  dependencies: Partial<RecommendationRouteDependencies> = {},
) {
  const routeDependencies = {
    ...defaultRecommendationRouteDependencies,
    ...dependencies,
  };

  return (request: Request) =>
    handleRecommendationPost(request, routeDependencies);
}

export const POST = createRecommendationPostHandler();

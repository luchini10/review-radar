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
  getRecommendationResultIssue,
} from "../../../lib/recommendationResultValidation.ts";
import { normalizeResearchResult } from "../../../lib/normalizeResearchResult.ts";
import { enrichResultWithReviewEvidence } from "../../../lib/productEvidence.ts";
import { prioritizeProductPageUrlsInResult } from "../../../lib/productPageUrl.ts";
import { enrichProductAssets } from "../../../lib/productAssets.ts";
import { verifyMissingRequirementEvidence } from "../../../lib/requirementEvidenceRescue.ts";
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
import { buildSearchCandidateFallbackResult } from "../../../lib/searchCandidateFallback.ts";
import {
  mergeSerperSearchResults,
  mergeProductRecommendations,
  searchSerperForProducts,
  serperCandidateToRecommendation,
} from "../../../lib/search/serper.ts";
import { scoreAndSelectRecommendations } from "../../../lib/recommendationScoring.ts";
import type {
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
  verifyMissingRequirementEvidence: typeof verifyMissingRequirementEvidence;
};

const defaultRecommendationRouteDependencies: RecommendationRouteDependencies = {
  collectReachableCitationUrls,
  createOpenAIClient,
  enrichProductAssets,
  enrichResultWithReviewEvidence,
  searchSerperForProducts,
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

function removeUserHiddenProductFields(
  product: ProductRecommendation,
): ProductRecommendation {
  const visibleProduct = { ...product };
  delete visibleProduct.scoreBreakdown;

  return visibleProduct;
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
  const fallbackResult = scoreAndSelectRecommendations(
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

  return prioritizeProductPageUrlsInResult(fallbackResult);
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

async function handleRecommendationPost(
  request: Request,
  routeDependencies: RecommendationRouteDependencies,
) {
  const includeDebug = wantsLocalDebug(request);
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
    body = await request.json();
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
    const client = await routeDependencies.createOpenAIClient(apiKey);
    const helperResearchModel = helperModel();
    const finalSynthesisModel = finalResearchModel();
    const extractedRequirements = extractStructuredRequirements(validation.data);
    const requestWithRequirements = {
      ...validation.data,
      extractedRequirements,
    };
    const requirementConflicts = detectRequirementConflicts(requestWithRequirements);

    if (requirementConflicts.length > 0) {
      return NextResponse.json(
        {
          error: `Please fix conflicting requirements: ${requirementConflicts.join(" ")}`,
        },
        { status: 400 },
      );
    }

    debugStage = "discovery_strategy";
    const discoveryStrategy = await buildOpenAIDiscoveryStrategy({
      client,
      input: requestWithRequirements,
      model: helperResearchModel,
    });
    const searchPlan = augmentSearchPlanWithDiscoveryStrategy(
      generateSearchPlan(requestWithRequirements),
      discoveryStrategy,
      requestWithRequirements,
    );
    const generatedQueries = searchPlan.queries.map((query) => query.query);
    const requestWithStrategy = {
      ...requestWithRequirements,
      discoveryStrategy,
    };

    debugStage = "serper_discovery";
    let serperResult = await routeDependencies.searchSerperForProducts(
      searchPlan,
      requestWithStrategy,
    );

    debugStage = "discovery_gap_check";
    const discoveryGapCheck = await buildOpenAIDiscoveryGapCheck({
      candidates: serperResult.candidates,
      client,
      input: requestWithStrategy,
      model: helperResearchModel,
      strategy: discoveryStrategy,
    });

    if (discoveryGapCheck.followUpQueries.length > 0) {
      const followUpSerperResult =
        await routeDependencies.searchSerperForProducts(
          discoveryGapCheck.followUpQueries,
          {
            ...requestWithStrategy,
            discoveryGapCheck,
          },
        );

      serperResult = mergeSerperSearchResults(
        serperResult,
        followUpSerperResult,
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

    const response = await client.responses.create({
      model: finalSynthesisModel,
      max_output_tokens: 16000,
      tools: [
        {
          type: "web_search",
          search_context_size: "high",
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
            serperResult.candidates,
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
    });

    const outputText = getOutputText(response);

    if (!outputText) {
      return errorResponse(
        USER_ERROR_MESSAGES.noReliableEvidence,
        502,
        {
          finalSynthesisModel,
          stage: "read_output_text",
          outputTextLength: 0,
        },
        includeDebug,
      );
    }

    let parsed: unknown;

    try {
      debugStage = "parse_output_text";
      parsed = JSON.parse(outputText);
    } catch {
      return errorResponse(
        USER_ERROR_MESSAGES.badStructuredOutput,
        502,
        {
          finalSynthesisModel,
          stage: "parse_output_text",
          outputTextLength: outputText.length,
        },
        includeDebug,
      );
    }

    debugStage = "validate_structured_output";
    const result = recommendationResultSchema.safeParse(
      normalizeResearchResult(parsed),
    );

    if (!result.success) {
      return errorResponse(
        USER_ERROR_MESSAGES.badStructuredOutput,
        502,
        {
          finalSynthesisModel,
          stage: "validate_structured_output",
          issues: result.error.issues.slice(0, 12).map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        },
        includeDebug,
      );
    }

    const serperRecommendations = serperResult.candidates.map(
      serperCandidateToRecommendation,
    );
    const mergedCandidates = mergeProductRecommendations(
      result.data.candidate_products,
      serperRecommendations,
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
    let verifiedUrls = collectVerifiedSourceUrls(response);
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

    if (verifiedUrls.size === 0) {
      verifiedUrls =
        await routeDependencies.collectReachableCitationUrls(candidateResult);
    }

    const verifiedResult = filterResultToVerifiedCitations(
      candidateResult,
      verifiedUrls,
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
    const resultIssue = getRecommendationResultIssue(verifiedResult, verifiedUrls);

    if (resultIssue) {
      if (
        resultIssue === "no_reliable_evidence" &&
        serperRecommendations.length > 0
      ) {
        debugStage = "search_candidate_fallback";
        const prioritizedFallbackResult = await buildServerSearchFallbackResult({
          baseResult: candidateResult,
          discoveryCoverage,
          maxEnrichedProducts: serperResult.stats.maxEnrichedProducts,
          requestWithRequirements: requestWithDiscovery,
          routeDependencies,
          serperRecommendations,
        });
        const fallbackDebug = {
          fallbackReason: resultIssue,
          fallbackSource: "serper_candidates",
          serperCandidateCount: serperRecommendations.length,
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
        {
          finalSynthesisModel,
          stage: "trust_validation",
          resultIssue,
          verifiedUrlCount: verifiedUrls.size,
          candidateCount: candidateResult.recommendations.length,
          remainingCount: verifiedResult.recommendations.length,
        },
        includeDebug,
      );
    }

    debugStage = "filter_requirements";
    const requirementFilteredResult = filterResultByRequirements(
      verifiedResult,
      requestWithDiscovery,
    );
    const evidenceEnrichedResult =
      await routeDependencies.enrichResultWithReviewEvidence(
        requirementFilteredResult,
        {
          mode: "trust_ladder",
          maxProducts: serperResult.stats.maxEnrichedProducts,
        },
      );
    const assetEnrichedResult =
      await routeDependencies.enrichProductAssets(evidenceEnrichedResult);
    const verifiedFactsResult =
      await routeDependencies.verifyMissingRequirementEvidence(
      assetEnrichedResult,
      requestWithDiscovery,
      {
        maxProducts: serperResult.stats.maxEnrichedProducts,
      },
      );
    const revalidatedAssetResult = revalidateResultCandidates(
      verifiedFactsResult,
      requestWithDiscovery,
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
      const sanityFallbackResult = await buildServerSearchFallbackResult({
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
      });

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
                  serperCandidateCount: serperRecommendations.length,
                },
              }
            : { result: removeUserHiddenResultFields(sanityFallbackResult) },
        );
      }
    }

    const enrichedResult = scoreAndSelectRecommendations(
      {
        ...revalidatedAssetResult,
        extractedRequirements,
      },
      requestWithDiscovery,
      discoveryCoverage,
    );
    const discoveryDebug = {
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
      serperRetailerDomainCalls: serperResult.stats.retailerDomainCalls,
      serperDirectRetailerCalls: serperResult.stats.directRetailerCalls,
      preFilteredCandidateCount: serperResult.stats.preFilteredCandidates,
      rejectedCandidateCount: serperResult.stats.rejectedCandidates,
      discoveryExpectedProducts: discoveryStrategy.expectedProducts.map(
        (target) => [target.brand, target.productLine].filter(Boolean).join(" "),
      ),
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

    if (process.env.REVIEW_RADAR_LLM_NARRATION === "on") {
      try {
        const narrationResponse = await client.responses.create(
          {
            model: helperResearchModel,
            max_output_tokens: 4000,
            input: [
              { role: "system", content: narrationSystemPrompt },
              {
                role: "user",
                content: buildSynthesisPrompt(enrichedResult, requestWithDiscovery),
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
        );
        const narration = parseNarration(getOutputText(narrationResponse));

        if (narration) {
          narratedResult = applyNarrationToResult(enrichedResult, narration);
        }
      } catch (error) {
        logDiscoveryDebug({
          stage: "llm_narration_failed",
          error: summarizeCaughtError(error),
        });
      }
    }

    const prioritizedResult = prioritizeProductPageUrlsInResult(narratedResult);
    const userVisibleResult = removeUserHiddenResultFields(prioritizedResult);

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
      try {
        const serperRecommendations =
          fallbackContext.serperResult.candidates.map(
            serperCandidateToRecommendation,
          );
        const stats = fallbackContext.serperResult.stats;
        const prioritizedFallbackResult = await buildServerSearchFallbackResult({
          baseResult: {
            search_summary:
              "Live AI research was unavailable, so these picks come from shopping search results checked against your filters.",
            assumptions: [
              "AI research failed during this search, so results rely on shopping search data only.",
            ],
            generated_queries: fallbackContext.generatedQueries,
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
            generatedQueryCount: fallbackContext.generatedQueries.length,
            rawCandidateCount: serperRecommendations.length,
            sourceTimeouts: stats.sourceTimeouts,
            stageCounts: {
              pass1: fallbackContext.searchPlan.stagedQueries.pass1.length,
              pass2: fallbackContext.searchPlan.stagedQueries.pass2.length,
              pass3: fallbackContext.searchPlan.stagedQueries.pass3.length,
            },
          },
          maxEnrichedProducts: stats.maxEnrichedProducts,
          requestWithRequirements: fallbackContext.requestWithRequirements,
          routeDependencies,
          serperRecommendations,
        });

        if (
          prioritizedFallbackResult.exactMatches.length > 0 ||
          prioritizedFallbackResult.nearMatches.length > 0
        ) {
          return NextResponse.json(
            includeDebug
              ? {
                  result: prioritizedFallbackResult,
                  debug: {
                    fallbackReason: "ai_research_error",
                    fallbackSource: "serper_candidates",
                    stage: debugStage,
                    error: summarizeCaughtError(error),
                  },
                }
              : {
                  result: removeUserHiddenResultFields(
                    prioritizedFallbackResult,
                  ),
                },
          );
        }
      } catch (fallbackError) {
        logDiscoveryDebug({
          stage: "ai_error_search_fallback_failed",
          error: summarizeCaughtError(fallbackError),
        });
      }
    }

    return errorResponse(
      getSafeOpenAIErrorMessage(error),
      502,
      {
        stage: debugStage,
        error: summarizeCaughtError(error),
      },
      includeDebug,
    );
  }
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

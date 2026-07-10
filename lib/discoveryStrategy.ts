import { z } from "zod";

import type {
  ProductBuyingRubric,
  ProductDiscoveryGapCheck,
  ProductDiscoveryStrategy,
  ProductDiscoveryTarget,
  RawProductCandidate,
  RecommendationApiRequest,
  SearchPlan,
  SearchQueryCandidate,
  SearchQueryStage,
} from "@/types/review-radar";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { parseMaxBudgetAmount } from "./priceParsing.ts";
import type { SearchPlanObservabilityObserver } from "./searchObservabilityTypes.ts";

const DISCOVERY_STRATEGY_TIMEOUT_MS = 25000;
const DISCOVERY_GAP_TIMEOUT_MS = 20000;

type OpenAIResponsesClient = {
  responses: {
    create: (
      options: Record<string, unknown>,
      requestOptions?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

const discoveryTargetSchema = z
  .object({
    aliases: z.array(z.string().min(1)).max(6),
    brand: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    productLine: z.string(),
    whyExpected: z.string(),
  })
  .strict();

const buyingRubricSchema = z
  .object({
    category: z.string(),
    commonTradeoffs: z.array(z.string().min(1)).max(8),
    mustVerifyFacts: z.array(z.string().min(1)).max(10),
    qualitySignals: z.array(z.string().min(1)).max(10),
    redFlags: z.array(z.string().min(1)).max(10),
    reviewSignals: z.array(z.string().min(1)).max(8),
    searchQueries: z.array(z.string().min(1)).max(8),
  })
  .strict();

export const discoveryStrategySchema = z
  .object({
    avoidCandidatePatterns: z.array(z.string().min(1)).max(12),
    buyingRubric: buyingRubricSchema,
    discoveryQueries: z.array(z.string().min(1)).max(12),
    expectedProducts: z.array(discoveryTargetSchema).max(12),
    searchIntent: z.string(),
    verificationFacts: z.array(z.string().min(1)).max(10),
  })
  .strict();

export const discoveryGapCheckSchema = z
  .object({
    followUpQueries: z.array(z.string().min(1)).max(8),
    missingExpectedProducts: z.array(z.string().min(1)).max(12),
    notes: z.array(z.string().min(1)).max(8),
    suspiciousCandidateNames: z.array(z.string().min(1)).max(12),
  })
  .strict();

export const discoveryStrategyJsonSchema = {
  type: "object",
  properties: {
    searchIntent: { type: "string" },
    discoveryQueries: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
    },
    expectedProducts: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          brand: { type: "string" },
          productLine: { type: "string" },
          aliases: {
            type: "array",
            maxItems: 6,
            items: { type: "string" },
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          whyExpected: { type: "string" },
        },
        required: ["brand", "productLine", "aliases", "priority", "whyExpected"],
        additionalProperties: false,
      },
    },
    avoidCandidatePatterns: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
    },
    buyingRubric: {
      type: "object",
      properties: {
        category: { type: "string" },
        mustVerifyFacts: {
          type: "array",
          maxItems: 10,
          items: { type: "string" },
        },
        qualitySignals: {
          type: "array",
          maxItems: 10,
          items: { type: "string" },
        },
        commonTradeoffs: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
        redFlags: {
          type: "array",
          maxItems: 10,
          items: { type: "string" },
        },
        reviewSignals: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
        searchQueries: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: [
        "category",
        "mustVerifyFacts",
        "qualitySignals",
        "commonTradeoffs",
        "redFlags",
        "reviewSignals",
        "searchQueries",
      ],
      additionalProperties: false,
    },
    verificationFacts: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
  },
  required: [
    "searchIntent",
    "discoveryQueries",
    "expectedProducts",
    "avoidCandidatePatterns",
    "buyingRubric",
    "verificationFacts",
  ],
  additionalProperties: false,
} as const;

export const discoveryGapCheckJsonSchema = {
  type: "object",
  properties: {
    missingExpectedProducts: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
    },
    followUpQueries: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    suspiciousCandidateNames: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
    },
    notes: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: [
    "missingExpectedProducts",
    "followUpQueries",
    "suspiciousCandidateNames",
    "notes",
  ],
  additionalProperties: false,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function outputText(response: unknown) {
  if (!isRecord(response)) {
    return "";
  }

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = response.output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((content) =>
      isRecord(content) && typeof content.text === "string" ? content.text : "",
    )
    .join("")
    .trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[], max = values.length) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    const key = normalizeText(clean);

    if (!clean || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(clean);

    if (unique.length >= max) {
      break;
    }
  }

  return unique;
}

function emptyDiscoveryStrategy(): ProductDiscoveryStrategy {
  return {
    avoidCandidatePatterns: [],
    buyingRubric: undefined,
    discoveryQueries: [],
    expectedProducts: [],
    searchIntent: "",
    verificationFacts: [],
  };
}

function emptyGapCheck(): ProductDiscoveryGapCheck {
  return {
    followUpQueries: [],
    missingExpectedProducts: [],
    notes: [],
    suspiciousCandidateNames: [],
  };
}

function normalizeRubric(rubric: ProductBuyingRubric | undefined) {
  if (!rubric) {
    return undefined;
  }

  return {
    category: rubric.category.trim(),
    commonTradeoffs: uniqueStrings(rubric.commonTradeoffs, 8),
    mustVerifyFacts: uniqueStrings(rubric.mustVerifyFacts, 10),
    qualitySignals: uniqueStrings(rubric.qualitySignals, 10),
    redFlags: uniqueStrings(rubric.redFlags, 10),
    reviewSignals: uniqueStrings(rubric.reviewSignals, 8),
    searchQueries: uniqueStrings(rubric.searchQueries, 8),
  };
}

function normalizeStrategy(strategy: ProductDiscoveryStrategy) {
  return {
    avoidCandidatePatterns: uniqueStrings(strategy.avoidCandidatePatterns, 12),
    buyingRubric: normalizeRubric(strategy.buyingRubric),
    discoveryQueries: uniqueStrings(strategy.discoveryQueries, 12),
    expectedProducts: strategy.expectedProducts
      .filter((target) => target.brand.trim() || target.productLine.trim())
      .slice(0, 12)
      .map((target) => ({
        ...target,
        aliases: uniqueStrings(target.aliases, 6),
        brand: target.brand.trim(),
        productLine: target.productLine.trim(),
        whyExpected: target.whyExpected.trim(),
      })),
    searchIntent: strategy.searchIntent.trim(),
    verificationFacts: uniqueStrings(strategy.verificationFacts, 10),
  };
}

function normalizeGapCheck(gapCheck: ProductDiscoveryGapCheck) {
  return {
    followUpQueries: uniqueStrings(gapCheck.followUpQueries, 8),
    missingExpectedProducts: uniqueStrings(gapCheck.missingExpectedProducts, 12),
    notes: uniqueStrings(gapCheck.notes, 8),
    suspiciousCandidateNames: uniqueStrings(gapCheck.suspiciousCandidateNames, 12),
  };
}

function budgetText(input: RecommendationApiRequest) {
  const amount =
    input.extractedRequirements?.budgetRules.find(
      (rule) => rule.operator === "max" && rule.amount !== null,
    )?.amount ??
    parseMaxBudgetAmount(input.budget) ??
    parseMaxBudgetAmount(input.query, { requireDollarSignForRanges: true });

  return amount ? `under $${amount}` : "";
}

function budgetBoundQuery(input: RecommendationApiRequest, query: string) {
  const budget = budgetText(input);

  if (!budget) {
    return query;
  }

  const amount = budget.match(/\$[\d,]+/)?.[0];

  if (!amount) {
    return query;
  }

  const amountPattern = amount.replace("$", "\\$");
  const boundedAmountPattern = new RegExp(
    `\\b(?:under|less\\s+than|below|at\\s+most|max(?:imum)?|no\\s+more\\s+than)\\s+${amountPattern}\\b`,
    "i",
  );

  if (boundedAmountPattern.test(query)) {
    return query;
  }

  if (new RegExp(`${amountPattern}\\b`, "i").test(query)) {
    return query.replace(new RegExp(`${amountPattern}\\b`, "i"), budget);
  }

  return `${query} ${budget}`;
}

function selectedBrandText(input: RecommendationApiRequest) {
  return (input.extractedRequirements?.brandConstraints || [])
    .map((constraint) => constraint.value)
    .filter(Boolean)
    .join(", ");
}

function requestSummary(input: RecommendationApiRequest) {
  return [
    `Product category: ${input.query}`,
    `Budget: ${input.budget || "Not specified"}`,
    `Important details: ${input.priorities || "Not specified"}`,
    `Avoid: ${input.avoid || "Not specified"}`,
    `Required brand(s): ${selectedBrandText(input) || "Not specified"}`,
    `Parsed requirements: ${
      input.extractedRequirements?.summary.join("; ") || "None"
    }`,
  ].join("\n");
}

export async function buildOpenAIDiscoveryStrategy(options: {
  client: OpenAIResponsesClient;
  input: RecommendationApiRequest;
  model: string;
  observer?: SearchPlanObservabilityObserver;
}) {
  const { client, input, model, observer } = options;

  try {
    const response = await client.responses.create(
      {
        model,
        max_output_tokens: 1800,
        input: [
          {
            role: "system",
            content:
              "You are the search strategist for Review Radar. Your job is to improve product discovery, not to choose final recommendations. Return mainstream products or product lines that a shopper would expect for the request, better live-search queries, product types to avoid, facts that must be verified, and a buying rubric that describes what evidence matters for this category. The rubric must contain evidence targets, common tradeoffs, red flags, review signals, and search queries; it must not choose winners or make product-specific claims. When the buyer gives a brand and budget, include budget-appropriate mainstream/value product lines before premium flagship lines. Do not let premium examples replace obvious affordable candidates. Do not invent prices. Do not include unsafe, unrelated, used/refurbished, accessory-only, or category-page results unless the user asked for them.",
          },
          {
            role: "user",
            content: `${requestSummary(input)}\n\nCreate a discovery plan and a category buying rubric. Expected products and rubric items are only hints; Review Radar will verify them with live product-page evidence before display or ranking.`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "review_radar_discovery_strategy",
            schema: discoveryStrategyJsonSchema,
            strict: true,
          },
        },
      },
      {
        timeout: DISCOVERY_STRATEGY_TIMEOUT_MS,
      },
    );
    const text = outputText(response);
    const parsed = discoveryStrategySchema.safeParse(JSON.parse(text));

    if (parsed.success) {
      observer?.recordRawAiStrategy(parsed.data);
      return normalizeStrategy(parsed.data);
    }

    return emptyDiscoveryStrategy();
  } catch {
    return emptyDiscoveryStrategy();
  }
}

function candidateSummary(candidate: RawProductCandidate) {
  return [
    candidate.name,
    candidate.brand ? `brand: ${candidate.brand}` : "",
    candidate.price !== null ? `price: $${candidate.price}` : "",
    candidate.rating !== null ? `rating: ${candidate.rating}` : "",
    candidate.reviewCount !== null ? `reviews: ${candidate.reviewCount}` : "",
    candidate.retailer ? `retailer: ${candidate.retailer}` : "",
    candidate.productUrl ? `url: ${candidate.productUrl}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function targetLabel(target: ProductDiscoveryTarget) {
  return [target.brand, target.productLine].filter(Boolean).join(" ").trim();
}

function targetQuery(
  input: RecommendationApiRequest,
  target: ProductDiscoveryTarget,
) {
  return [target.brand, target.productLine, baseProductCategoryFromQuery(input.query), budgetText(input)]
    .filter(Boolean)
    .join(" ");
}

function targetSearchTerms(target: ProductDiscoveryTarget) {
  return uniqueStrings([
    target.productLine,
    targetLabel(target),
    ...target.aliases,
  ]);
}

export function candidateMatchesDiscoveryTarget(
  candidate: RawProductCandidate | { name: string; brand?: string | null },
  target: ProductDiscoveryTarget,
) {
  const text = normalizeText(
    [
      candidate.name,
      "category" in candidate ? candidate.category : "",
      "brand" in candidate ? candidate.brand || "" : "",
      "productUrl" in candidate ? candidate.productUrl : "",
      "retailer" in candidate ? candidate.retailer || "" : "",
      "keySpecs" in candidate ? candidate.keySpecs.join(" ") : "",
      "evidenceSources" in candidate
        ? candidate.evidenceSources
            .map((source) => `${source.title} ${source.snippet}`)
            .join(" ")
        : "",
    ].join(" "),
  );
  const brand = normalizeText(target.brand);
  const brandMatches = !brand || text.includes(brand);
  const termMatches = targetSearchTerms(target).some((term) => {
    const normalizedTerm = normalizeText(term);
    const tokens = normalizedTerm.split(" ").filter((token) => token.length > 2);

    return (
      normalizedTerm.length > 0 &&
      (text.includes(normalizedTerm) ||
        (tokens.length >= 2 && tokens.every((token) => text.includes(token))))
    );
  });

  return brandMatches && termMatches;
}

export function buildDeterministicGapCheck(
  input: RecommendationApiRequest,
  strategy: ProductDiscoveryStrategy,
  candidates: RawProductCandidate[],
) {
  if (strategy.expectedProducts.length === 0) {
    return emptyGapCheck();
  }

  const missingTargets = strategy.expectedProducts.filter(
    (target) =>
      target.priority !== "low" &&
      !candidates.some((candidate) =>
        candidateMatchesDiscoveryTarget(candidate, target),
      ),
  );
  const followUpQueries = missingTargets.flatMap((target) => [
    targetQuery(input, target),
    ...target.aliases
      .slice(0, 2)
      .map((alias) =>
        [target.brand, alias, baseProductCategoryFromQuery(input.query), budgetText(input)]
          .filter(Boolean)
          .join(" "),
      ),
  ]);

  return normalizeGapCheck({
    followUpQueries,
    missingExpectedProducts: missingTargets.map(targetLabel),
    notes:
      missingTargets.length > 0
        ? ["Some expected mainstream products were missing from the first Serper pass."]
        : [],
    suspiciousCandidateNames: [],
  });
}

export async function buildOpenAIDiscoveryGapCheck(options: {
  candidates: RawProductCandidate[];
  client: OpenAIResponsesClient;
  input: RecommendationApiRequest;
  model: string;
  observer?: SearchPlanObservabilityObserver;
  strategy: ProductDiscoveryStrategy;
}) {
  const { candidates, client, input, model, observer, strategy } = options;

  if (strategy.expectedProducts.length === 0) {
    return emptyGapCheck();
  }

  try {
    const response = await client.responses.create(
      {
        model,
        max_output_tokens: 1400,
        input: [
          {
            role: "system",
            content:
              "You are a product discovery gap checker. Compare expected mainstream products against the live Serper candidate pool. Do not choose winners. Only request follow-up searches for expected, relevant, buyable products that appear missing or poorly represented. Do not request used/refurbished/accessory/category-page searches unless the user asked for them.",
          },
          {
            role: "user",
            content: [
              requestSummary(input),
              "",
              "Discovery strategy expected products:",
              strategy.expectedProducts.map((target, index) =>
                `${index + 1}. ${targetLabel(target)} (${target.priority}) aliases: ${target.aliases.join(", ")}`,
              ).join("\n") || "None",
              "",
              "Live Serper candidates:",
              candidates.slice(0, 50).map((candidate, index) =>
                `${index + 1}. ${candidateSummary(candidate)}`,
              ).join("\n") || "None",
              "",
              "Return missing expected products, follow-up queries, suspicious candidates, and short notes.",
            ].join("\n"),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "review_radar_discovery_gap_check",
            schema: discoveryGapCheckJsonSchema,
            strict: true,
          },
        },
      },
      {
        timeout: DISCOVERY_GAP_TIMEOUT_MS,
      },
    );
    const text = outputText(response);
    const parsed = discoveryGapCheckSchema.safeParse(JSON.parse(text));

    if (parsed.success) {
      observer?.recordRawAiGapCheck(parsed.data);
      const deterministic = buildDeterministicGapCheck(input, strategy, candidates);
      const normalized = normalizeGapCheck(parsed.data);

      return normalizeGapCheck({
        followUpQueries: [
          ...normalized.followUpQueries.map((query) =>
            budgetBoundQuery(input, query),
          ),
          ...deterministic.followUpQueries,
        ],
        missingExpectedProducts: [
          ...normalized.missingExpectedProducts,
          ...deterministic.missingExpectedProducts,
        ],
        notes: [...normalized.notes, ...deterministic.notes],
        suspiciousCandidateNames: normalized.suspiciousCandidateNames,
      });
    }
  } catch {
    // Fall through to the deterministic check.
  }

  return buildDeterministicGapCheck(input, strategy, candidates);
}

function queryCandidate(
  query: string,
  stage: SearchQueryStage,
  sourceDetail: string,
  observer: SearchPlanObservabilityObserver | undefined,
): SearchQueryCandidate {
  const candidate: SearchQueryCandidate = {
    family: "canonical_shopping",
    query,
    stage,
  };
  const queryId = observer?.registerSearchQuery({
    origin: "ai_discovery_strategy",
    phase: "plan_assembly",
    query,
    family: candidate.family,
    stage,
    sourceDetail,
  });

  return observer?.attachSearchQueryId(candidate, queryId) || candidate;
}

function stageQueries(
  queries: SearchQueryCandidate[],
  stage: SearchQueryStage,
  protectedPass1Count = 0,
  observer?: SearchPlanObservabilityObserver,
) {
  const limits = {
    1: 8,
    2: 6,
    3: 4,
  } as const;

  const candidates = queries.filter((query) => query.stage === stage);
  const selected = candidates.slice(0, limits[stage]);

  for (const query of candidates.slice(limits[stage])) {
    const id = observer?.searchQueryId(query);
    const protectedAllocation =
      stage === 1 &&
      protectedPass1Count > 0 &&
      observer?.queryOrigin(id) === "ai_discovery_strategy";
    observer?.recordQueryCull(
      id,
      protectedAllocation
        ? "protected_slot_allocation"
        : "pass_stage_truncation",
      protectedAllocation
        ? `${protectedPass1Count} protected deterministic pass-1 slots within pass-1 cap ${limits[stage]}`
        : `pass-${stage} cap ${limits[stage]}`,
    );
  }

  return selected;
}

export function augmentSearchPlanWithDiscoveryStrategy(
  plan: SearchPlan,
  strategy: ProductDiscoveryStrategy,
  input: RecommendationApiRequest,
  observer?: SearchPlanObservabilityObserver,
): SearchPlan {
  if (
    strategy.discoveryQueries.length === 0 &&
    strategy.expectedProducts.length === 0 &&
    !strategy.buyingRubric?.searchQueries.length
  ) {
    return plan;
  }

  const targetQueries = strategy.expectedProducts
    .filter((target) => target.priority !== "low")
    .flatMap((target) => [
      targetQuery(input, target),
      ...target.aliases.slice(0, 1).map((alias) =>
        [target.brand, alias, budgetText(input)].filter(Boolean).join(" "),
      ),
    ]);
  const strategyQueries = [
    ...strategy.discoveryQueries
      .slice(0, 4)
      .map((query) =>
        queryCandidate(budgetBoundQuery(input, query), 1, "discovery_query_pass1", observer),
      ),
    ...(strategy.buyingRubric?.searchQueries || [])
      .slice(0, 3)
      .map((query) =>
        queryCandidate(budgetBoundQuery(input, query), 1, "buying_rubric_query", observer),
      ),
    ...targetQueries
      .slice(0, 4)
      .map((query) =>
        queryCandidate(budgetBoundQuery(input, query), 1, "expected_product_target", observer),
      ),
    ...strategy.discoveryQueries
      .slice(4, 8)
      .map((query) =>
        queryCandidate(budgetBoundQuery(input, query), 2, "discovery_query_pass2", observer),
      ),
    ...targetQueries
      .slice(4, 8)
      .map((query) =>
        queryCandidate(budgetBoundQuery(input, query), 2, "expected_product_target", observer),
      ),
  ];
  const protectedBasePass1 = plan.stagedQueries.pass1.slice(0, 4);
  const protectedBaseKeys = new Set(
    protectedBasePass1.map((query) => normalizeText(query.query)),
  );
  const seen = new Map<string, string | undefined>();
  const merged = [
    // Keep the app-generated hard-filter queries first. AI strategy queries are
    // useful expansion, but they must not crowd out brand/budget/category searches.
    ...protectedBasePass1,
    ...strategyQueries,
    ...plan.queries.filter(
      (query) => !protectedBaseKeys.has(normalizeText(query.query)),
    ),
  ].filter((query) => {
    const key = normalizeText(query.query);

    if (!key) {
      return false;
    }

    if (seen.has(key)) {
      observer?.recordQueryMerge(observer.searchQueryId(query), seen.get(key));
      return false;
    }

    seen.set(key, observer?.searchQueryId(query));
    return true;
  });
  const pass1 = stageQueries(merged, 1, protectedBasePass1.length, observer);
  const pass2 = stageQueries(merged, 2, 0, observer);
  const pass3 = stageQueries(merged, 3, 0, observer);

  return {
    categoryGroup: plan.categoryGroup,
    queries: [...pass1, ...pass2, ...pass3],
    stagedQueries: {
      pass1,
      pass2,
      pass3,
    },
  };
}

export function discoveryContextForPrompt(
  strategy: ProductDiscoveryStrategy | undefined,
  gapCheck: ProductDiscoveryGapCheck | undefined,
) {
  if (!strategy && !gapCheck) {
    return "";
  }

  const lines = [
    "AI discovery strategy before Serper verification:",
    strategy?.searchIntent ? `Search intent: ${strategy.searchIntent}` : "",
    strategy?.expectedProducts.length
      ? `Expected mainstream products or lines: ${strategy.expectedProducts
          .map(targetLabel)
          .join("; ")}`
      : "",
    strategy?.verificationFacts.length
      ? `Facts Serper/product pages must verify: ${strategy.verificationFacts.join("; ")}`
      : "",
    strategy?.buyingRubric
      ? `Buying rubric quality signals: ${strategy.buyingRubric.qualitySignals.join("; ")}`
      : "",
    strategy?.buyingRubric?.redFlags.length
      ? `Buying rubric red flags: ${strategy.buyingRubric.redFlags.join("; ")}`
      : "",
    strategy?.buyingRubric?.reviewSignals.length
      ? `Review signals to look for: ${strategy.buyingRubric.reviewSignals.join("; ")}`
      : "",
    gapCheck?.missingExpectedProducts.length
      ? `Gap check missing expected products: ${gapCheck.missingExpectedProducts.join("; ")}`
      : "",
    gapCheck?.followUpQueries.length
      ? `Serper follow-up searches requested: ${gapCheck.followUpQueries.join("; ")}`
      : "",
    gapCheck?.suspiciousCandidateNames.length
      ? `Suspicious candidates to treat cautiously: ${gapCheck.suspiciousCandidateNames.join("; ")}`
      : "",
  ].filter(Boolean);

  return lines.length > 1 ? lines.join("\n") : "";
}

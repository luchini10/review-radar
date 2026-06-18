import { z } from "zod";

import type {
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

export const discoveryStrategySchema = z
  .object({
    avoidCandidatePatterns: z.array(z.string().min(1)).max(12),
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

function normalizeStrategy(strategy: ProductDiscoveryStrategy) {
  return {
    avoidCandidatePatterns: uniqueStrings(strategy.avoidCandidatePatterns, 12),
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
}) {
  const { client, input, model } = options;

  try {
    const response = await client.responses.create(
      {
        model,
        max_output_tokens: 1800,
        input: [
          {
            role: "system",
            content:
              "You are the search strategist for Review Radar. Your job is to improve product discovery, not to choose final recommendations. Return mainstream products or product lines that a shopper would expect for the request, better live-search queries, product types to avoid, and facts that must be verified. Do not invent prices. Do not include unsafe, unrelated, used/refurbished, accessory-only, or category-page results unless the user asked for them.",
          },
          {
            role: "user",
            content: `${requestSummary(input)}\n\nCreate a discovery plan. Expected products are only hints; Review Radar will verify them with live product-page evidence before display.`,
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

    return parsed.success ? normalizeStrategy(parsed.data) : emptyDiscoveryStrategy();
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
  strategy: ProductDiscoveryStrategy;
}) {
  const { candidates, client, input, model, strategy } = options;

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
      const deterministic = buildDeterministicGapCheck(input, strategy, candidates);
      const normalized = normalizeGapCheck(parsed.data);

      return normalizeGapCheck({
        followUpQueries: [
          ...normalized.followUpQueries,
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
): SearchQueryCandidate {
  return {
    family: "canonical_shopping",
    query,
    stage,
  };
}

function stageQueries(queries: SearchQueryCandidate[], stage: SearchQueryStage) {
  const limits = {
    1: 8,
    2: 6,
    3: 4,
  } as const;

  return queries.filter((query) => query.stage === stage).slice(0, limits[stage]);
}

export function augmentSearchPlanWithDiscoveryStrategy(
  plan: SearchPlan,
  strategy: ProductDiscoveryStrategy,
  input: RecommendationApiRequest,
): SearchPlan {
  if (
    strategy.discoveryQueries.length === 0 &&
    strategy.expectedProducts.length === 0
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
    ...strategy.discoveryQueries.slice(0, 4).map((query) => queryCandidate(query, 1)),
    ...targetQueries.slice(0, 4).map((query) => queryCandidate(query, 1)),
    ...strategy.discoveryQueries.slice(4, 8).map((query) => queryCandidate(query, 2)),
    ...targetQueries.slice(4, 8).map((query) => queryCandidate(query, 2)),
  ];
  const seen = new Set<string>();
  const merged = [...strategyQueries, ...plan.queries].filter((query) => {
    const key = normalizeText(query.query);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
  const pass1 = stageQueries(merged, 1);
  const pass2 = stageQueries(merged, 2);
  const pass3 = stageQueries(merged, 3);

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

import { z } from "zod";

import type { RecommendationApiRequest } from "@/types/review-radar";
import {
  rethrowIfRequestCancelled,
  throwIfRequestCancelled,
} from "./requestCancellation.ts";

type OpenAIResponsesClient = {
  responses: {
    create: (
      options: Record<string, unknown>,
      requestOptions?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

const SELECTION_PLANNER_TIMEOUT_MS = 20_000;
const MAX_SELECTION_QUERIES = 4;

const targetSchema = z
  .object({
    aliases: z.array(z.string().min(1)).max(3),
    brand: z.string(),
    model: z.string().min(1),
  })
  .strict();

const selectionPlanSchema = z
  .object({
    mainstreamProducts: z.array(targetSchema).max(5),
    searchQueries: z.array(z.string().min(1)).min(1).max(3),
  })
  .strict();

const selectionPlanJsonSchema = {
  type: "object",
  properties: {
    mainstreamProducts: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          aliases: {
            type: "array",
            maxItems: 3,
            items: { type: "string" },
          },
          brand: { type: "string" },
          model: { type: "string" },
        },
        required: ["aliases", "brand", "model"],
        additionalProperties: false,
      },
    },
    searchQueries: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["mainstreamProducts", "searchQueries"],
  additionalProperties: false,
} as const;

export type SelectionTarget = z.infer<typeof targetSchema>;

export type SelectionPlan = {
  queries: string[];
  targets: SelectionTarget[];
};

export type SelectionPlannerTelemetry = {
  openAiCalls: number;
  promptChars: number;
  systemPromptChars: number;
  usedFallback: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function outputText(response: unknown) {
  return isRecord(response) && typeof response.output_text === "string"
    ? response.output_text
    : "";
}

function uniqueStrings(values: string[], maximum = MAX_SELECTION_QUERIES) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const compact = value.replace(/\s+/g, " ").trim().slice(0, 200);
    const key = compact.toLowerCase();
    if (!compact || seen.has(key) || seen.size >= maximum) return [];
    seen.add(key);
    return [compact];
  });
}

function requestSearchText(input: RecommendationApiRequest) {
  return [input.query, input.budget, input.priorities]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function deterministicQueries(input: RecommendationApiRequest) {
  const constrained = requestSearchText(input);

  return uniqueStrings([
    constrained,
    `${input.query} ${input.priorities || ""}`,
    `${input.query} ${input.budget || ""}`,
    input.query,
  ]);
}

function normalizePlan(
  input: RecommendationApiRequest,
  value: z.infer<typeof selectionPlanSchema> | null,
): SelectionPlan {
  const queries = uniqueStrings([
    requestSearchText(input),
    ...(value?.searchQueries || []),
    ...deterministicQueries(input),
  ]);

  return {
    queries,
    targets: value?.mainstreamProducts || [],
  };
}

const systemPrompt = [
  "You plan a fast product-shopping search.",
  "Return mainstream, currently sold product models likely to satisfy the shopper's explicit category, budget, and requirements, plus three concise Google Shopping queries.",
  "Return only product models and shopping queries; do not generate evaluation prose.",
  "Do not invent prices or claim that a requirement is verified.",
  "Exclude accessories, replacement parts, used or refurbished products unless requested, and unrelated product types.",
  "Favor distinct mainstream models spanning strong practical choices rather than cosmetic variants.",
  "Assume the United States retail market unless the shopper specifies another market; exclude 220-240V-only products by default.",
].join(" ");

function userPrompt(input: RecommendationApiRequest) {
  return [
    `Category: ${input.query}`,
    `Budget: ${input.budget || "not specified"}`,
    `Important requirements: ${input.priorities || "not specified"}`,
    `Avoid: ${input.avoid || "not specified"}`,
    `Parsed hard requirements: ${
      input.extractedRequirements?.summary.join("; ") || "none"
    }`,
    "Return only the compact discovery plan. Search queries must describe buyable full products.",
  ].join("\n");
}

export async function buildSelectionPlan(options: {
  client?: OpenAIResponsesClient | null;
  input: RecommendationApiRequest;
  model: string;
  signal?: AbortSignal;
}): Promise<{ plan: SelectionPlan; telemetry: SelectionPlannerTelemetry }> {
  const { client, input, model, signal } = options;
  const prompt = userPrompt(input);

  if (!client) {
    return {
      plan: normalizePlan(input, null),
      telemetry: {
        openAiCalls: 0,
        promptChars: prompt.length,
        systemPromptChars: systemPrompt.length,
        usedFallback: true,
      },
    };
  }

  try {
    throwIfRequestCancelled(signal);
    const response = await client.responses.create(
      {
        model,
        max_output_tokens: 1_000,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "review_radar_selection_plan",
            schema: selectionPlanJsonSchema,
            strict: true,
          },
        },
      },
      { signal, timeout: SELECTION_PLANNER_TIMEOUT_MS },
    );
    throwIfRequestCancelled(signal);
    const parsed = selectionPlanSchema.safeParse(JSON.parse(outputText(response)));

    if (parsed.success) {
      return {
        plan: normalizePlan(input, parsed.data),
        telemetry: {
          openAiCalls: 1,
          promptChars: prompt.length,
          systemPromptChars: systemPrompt.length,
          usedFallback: false,
        },
      };
    }
  } catch (error) {
    rethrowIfRequestCancelled(error, signal);
  }

  return {
    plan: normalizePlan(input, null),
    telemetry: {
      openAiCalls: 1,
      promptChars: prompt.length,
      systemPromptChars: systemPrompt.length,
      usedFallback: true,
    },
  };
}

export const selectionPlannerTestExports = {
  deterministicQueries,
  normalizePlan,
  selectionPlanJsonSchema,
  selectionPlanSchema,
  systemPrompt,
  userPrompt,
};

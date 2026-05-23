import { z } from "zod";

export const recommendationTypeSchema = z.enum([
  "Best Overall",
  "Best Value",
  "Best Budget",
  "Best Premium",
  "Best for User Need",
  "Avoid",
]);

export const sourceConsensusSchema = z.enum([
  "Strong",
  "Mixed",
  "Weak",
  "Niche",
]);

export const citationSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().url(),
    what_it_supports: z.string().min(1),
  })
  .strict();

export const productRecommendationSchema = z
  .object({
    recommendation_type: recommendationTypeSchema,
    name: z.string().min(1),
    category: z.string().min(1),
    why_recommended: z.string().min(1),
    pros: z.array(z.string().min(1)),
    cons: z.array(z.string().min(1)),
    common_complaints: z.array(z.string().min(1)),
    estimated_price_range: z.string().min(1),
    confidence_score: z.number().min(0).max(100),
    source_consensus: sourceConsensusSchema,
    price_value_verdict: z.string().min(1),
    best_for: z.string().min(1),
    not_for: z.array(z.string().min(1)),
    citations: z.array(citationSchema),
  })
  .strict();

export const recommendationResultSchema = z
  .object({
    search_summary: z.string().min(1),
    assumptions: z.array(z.string().min(1)),
    recommendations: z.array(productRecommendationSchema).max(6),
    what_to_avoid: z.array(z.string().min(1)),
    final_buying_advice: z.string().min(1),
  })
  .strict();

const citationJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    url: { type: "string" },
    what_it_supports: { type: "string" },
  },
  required: ["title", "url", "what_it_supports"],
  additionalProperties: false,
} as const;

const productRecommendationJsonSchema = {
  type: "object",
  properties: {
    recommendation_type: {
      type: "string",
      enum: [
        "Best Overall",
        "Best Value",
        "Best Budget",
        "Best Premium",
        "Best for User Need",
        "Avoid",
      ],
    },
    name: { type: "string" },
    category: { type: "string" },
    why_recommended: { type: "string" },
    pros: {
      type: "array",
      items: { type: "string" },
    },
    cons: {
      type: "array",
      items: { type: "string" },
    },
    common_complaints: {
      type: "array",
      items: { type: "string" },
    },
    estimated_price_range: { type: "string" },
    confidence_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },
    source_consensus: {
      type: "string",
      enum: ["Strong", "Mixed", "Weak", "Niche"],
    },
    price_value_verdict: { type: "string" },
    best_for: { type: "string" },
    not_for: {
      type: "array",
      items: { type: "string" },
    },
    citations: {
      type: "array",
      items: citationJsonSchema,
    },
  },
  required: [
    "recommendation_type",
    "name",
    "category",
    "why_recommended",
    "pros",
    "cons",
    "common_complaints",
    "estimated_price_range",
    "confidence_score",
    "source_consensus",
    "price_value_verdict",
    "best_for",
    "not_for",
    "citations",
  ],
  additionalProperties: false,
} as const;

export const recommendationResultJsonSchema = {
  type: "object",
  properties: {
    search_summary: { type: "string" },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      maxItems: 6,
      items: productRecommendationJsonSchema,
    },
    what_to_avoid: {
      type: "array",
      items: { type: "string" },
    },
    final_buying_advice: { type: "string" },
  },
  required: [
    "search_summary",
    "assumptions",
    "recommendations",
    "what_to_avoid",
    "final_buying_advice",
  ],
  additionalProperties: false,
} as const;

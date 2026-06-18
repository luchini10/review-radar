import { z } from "zod";

export const recommendationTypeSchema = z.enum([
  "Best Match",
  "Close Match",
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

const optionalUrlSchema = z
  .string()
  .refine((value) => value === "" || z.string().url().safeParse(value).success);

export const productRecommendationSchema = z
  .object({
    recommendation_type: recommendationTypeSchema,
    name: z.string().min(1),
    category: z.string().min(1),
    product_page_url: optionalUrlSchema,
    product_image_url: optionalUrlSchema,
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
    generated_queries: z.array(z.string().min(1)).min(8).max(18),
    raw_candidate_count: z.number().int().min(0).max(50),
    candidate_products: z.array(productRecommendationSchema).max(50),
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
        "Best Match",
        "Close Match",
      ],
    },
    name: { type: "string" },
    category: { type: "string" },
    product_page_url: { type: "string" },
    product_image_url: { type: "string" },
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
    "product_page_url",
    "product_image_url",
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
    generated_queries: {
      type: "array",
      minItems: 8,
      maxItems: 18,
      items: { type: "string" },
    },
    raw_candidate_count: {
      type: "integer",
    },
    candidate_products: {
      type: "array",
      maxItems: 50,
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
    "generated_queries",
    "raw_candidate_count",
    "candidate_products",
    "what_to_avoid",
    "final_buying_advice",
  ],
  additionalProperties: false,
} as const;

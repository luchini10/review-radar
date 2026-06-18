// Phase 5: the final LLM becomes an explainer, not a finder.
//
// After the app has discovered, verified, deduped, filtered, and scored the
// product cards, an optional narration pass rewrites ONLY the buyer-facing
// explanation prose for the already-selected products. `applyNarrationToResult`
// is a hard guard: the narration can never add or remove products, reorder
// them, or touch citations, prices, specs, scores, pros, or cons. Anything the
// model returns for a product that is not displayed is dropped.

import { z } from "zod";
import type {
  ProductRecommendation,
  RecommendationApiRequest,
  RecommendationResult,
} from "@/types/review-radar";

export const narrationSystemPrompt = `
You are ReviewRadar's explanation writer.

You receive an already-finalized, validated, and ranked list of products. The
ranking, prices, specs, citations, pros, and cons are decided. Your only job is
to write clear, buyer-facing explanation prose for each product using only the
facts provided.

Rules:
- Do not add or remove products. Only write for the products given.
- Reference each product by its exact provided name.
- Do not invent or change specs, prices, ratings, review counts, citations, or sources.
- Do not change which products are recommended or their order.
- Do not restate requirement-matching language (e.g. "matches your search") as a benefit.
- Keep each field concise, plain text, and free of markdown.
- Only return the requested JSON shape.
`.trim();

export const narrationResultJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          why_recommended: { type: "string" },
          best_for: { type: "string" },
          price_value_verdict: { type: "string" },
          not_for: { type: "array", items: { type: "string" } },
        },
        required: [
          "name",
          "why_recommended",
          "best_for",
          "price_value_verdict",
          "not_for",
        ],
      },
    },
  },
  required: ["products"],
};

const narrationItemSchema = z.object({
  name: z.string().min(1),
  why_recommended: z.string().optional(),
  best_for: z.string().optional(),
  price_value_verdict: z.string().optional(),
  not_for: z.array(z.string()).optional(),
});

const narrationResultSchema = z.object({
  products: z.array(narrationItemSchema),
});

export type ProductNarration = z.infer<typeof narrationItemSchema>;

export function parseNarration(outputText: string): ProductNarration[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    return null;
  }

  const result = narrationResultSchema.safeParse(parsed);

  return result.success ? result.data.products : null;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

// The guard. Applies only the four explanation fields, only to products that are
// actually displayed, taken from the narration entry matching by exact name.
export function applyNarrationToResult(
  result: RecommendationResult,
  narrations: ProductNarration[],
): RecommendationResult {
  const byName = new Map<string, ProductNarration>();

  for (const narration of narrations) {
    if (narration && typeof narration.name === "string" && narration.name.trim()) {
      byName.set(normalizeName(narration.name), narration);
    }
  }

  if (byName.size === 0) {
    return result;
  }

  const applyToProduct = (product: ProductRecommendation): ProductRecommendation => {
    const narration = byName.get(normalizeName(product.name));

    if (!narration) {
      return product;
    }

    const whyRecommended = cleanString(narration.why_recommended);
    const bestFor = cleanString(narration.best_for);
    const priceValueVerdict = cleanString(narration.price_value_verdict);
    const notFor = cleanStringList(narration.not_for);

    return {
      ...product,
      ...(whyRecommended ? { why_recommended: whyRecommended } : {}),
      ...(bestFor ? { best_for: bestFor } : {}),
      ...(priceValueVerdict ? { price_value_verdict: priceValueVerdict } : {}),
      ...(notFor ? { not_for: notFor } : {}),
    };
  };

  return {
    ...result,
    exactMatches: result.exactMatches.map(applyToProduct),
    nearMatches: result.nearMatches.map(applyToProduct),
    recommendations: result.recommendations.map(applyToProduct),
    premiumAboveBudget: (result.premiumAboveBudget || []).map(applyToProduct),
  };
}

function productFacts(product: ProductRecommendation) {
  const verifiedRequirements = (product.requirementComparisons || [])
    .filter((comparison) => comparison.status === "matched")
    .map((comparison) => `${comparison.required} (${comparison.productHas})`);
  const facts = [
    product.rankLabel ? `rank: ${product.rankLabel}` : `type: ${product.recommendation_type}`,
    product.estimated_price_range ? `price: ${product.estimated_price_range}` : "",
    verifiedRequirements.length > 0
      ? `verified: ${verifiedRequirements.slice(0, 6).join("; ")}`
      : "",
    product.pros.length > 0 ? `pros: ${product.pros.slice(0, 5).join("; ")}` : "",
    product.cons.length > 0 ? `cons: ${product.cons.slice(0, 5).join("; ")}` : "",
    product.citations.length > 0
      ? `sources: ${product.citations.length} cited`
      : "",
  ].filter(Boolean);

  return `- ${product.name}\n  ${facts.join("\n  ")}`;
}

export function buildSynthesisPrompt(
  result: RecommendationResult,
  input: RecommendationApiRequest,
) {
  const displayed = [...result.exactMatches, ...result.nearMatches];
  const productBlocks =
    displayed.length > 0
      ? displayed.map(productFacts).join("\n")
      : "No products were selected.";

  return `
The buyer searched for: ${input.query}
What matters most: ${input.priorities || "Not specified"}
Avoid: ${input.avoid || "Not specified"}

These products are already finalized, validated, and ranked. Write explanation
prose for each using only the facts shown. Do not add products, change specs,
prices, or sources, or change the ranking.

Products:
${productBlocks}

Return JSON of this exact shape:
{
  "products": [
    {
      "name": string,            // exactly as shown above
      "why_recommended": string, // why it earned its place, from the facts shown
      "best_for": string,        // who should buy it
      "price_value_verdict": string,
      "not_for": string[]        // who should skip it
    }
  ]
}

Only include products shown above. Reference each by its exact name.
`.trim();
}

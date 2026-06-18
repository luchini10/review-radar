import {
  sanitizeProductCons,
  sanitizeProductPros,
} from "./productCopySanitizer.ts";

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Fall through and look for an embedded web URL.
  }

  const match = trimmed.match(/https?:\/\/[^\s<>"')]+/i);

  if (!match?.[0]) {
    return "";
  }

  try {
    const parsed = new URL(match[0].replace(/[.,;:]+$/, ""));

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeResearchResult(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  function normalizeProducts(products: unknown) {
    return Array.isArray(products)
      ? products.map((recommendation) => {
        if (!isRecord(recommendation)) {
          return recommendation;
        }

        const citations = Array.isArray(recommendation.citations)
          ? recommendation.citations.map((citation) => {
              if (!isRecord(citation)) {
                return citation;
              }

              return {
                ...citation,
                url: normalizeUrl(citation.url),
              };
            })
          : recommendation.citations;

        return {
          ...recommendation,
          cons: Array.isArray(recommendation.cons)
            ? sanitizeProductCons(recommendation.cons.filter((item) => typeof item === "string"))
            : recommendation.cons,
          product_page_url: normalizeUrl(recommendation.product_page_url),
          product_image_url: normalizeUrl(recommendation.product_image_url),
          pros: Array.isArray(recommendation.pros)
            ? sanitizeProductPros(recommendation.pros.filter((item) => typeof item === "string"))
            : recommendation.pros,
          citations,
        };
      })
      : products;
  }

  const normalized = { ...value };

  if ("candidate_products" in normalized) {
    normalized.candidate_products = normalizeProducts(normalized.candidate_products);
  }

  if ("recommendations" in normalized) {
    normalized.recommendations = normalizeProducts(normalized.recommendations);
  }

  return normalized;
}

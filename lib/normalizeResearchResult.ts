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

  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.map((recommendation) => {
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
          product_page_url: normalizeUrl(recommendation.product_page_url),
          product_image_url: normalizeUrl(recommendation.product_image_url),
          citations,
        };
      })
    : value.recommendations;

  return {
    ...value,
    recommendations,
  };
}

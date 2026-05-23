type CitationLike = {
  url: string;
};

type RecommendationLike = {
  citations: CitationLike[];
  confidence_score: number;
  source_consensus: string;
};

type RecommendationResultLike = {
  recommendations: RecommendationLike[];
};

export type RecommendationResultIssue =
  | "bad_structured_output"
  | "no_reliable_evidence";

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function citationUrlIsVerified(url: string, verifiedUrls: Set<string>) {
  return verifiedUrls.has(normalizeUrl(url));
}

export function getRecommendationResultIssue(
  result: RecommendationResultLike,
  verifiedUrls: Set<string>,
): RecommendationResultIssue | null {
  if (result.recommendations.length === 0) {
    return "no_reliable_evidence";
  }

  if (verifiedUrls.size === 0) {
    return "no_reliable_evidence";
  }

  for (const recommendation of result.recommendations) {
    if (recommendation.citations.length === 0) {
      return "no_reliable_evidence";
    }

    for (const citation of recommendation.citations) {
      if (!citationUrlIsVerified(citation.url, verifiedUrls)) {
        return "no_reliable_evidence";
      }
    }

    if (
      recommendation.source_consensus === "Strong" &&
      recommendation.confidence_score < 90
    ) {
      return "bad_structured_output";
    }

    if (
      recommendation.source_consensus === "Weak" &&
      recommendation.confidence_score >= 75
    ) {
      return "bad_structured_output";
    }

    if (
      recommendation.source_consensus === "Niche" &&
      recommendation.confidence_score >= 90
    ) {
      return "bad_structured_output";
    }
  }

  return null;
}

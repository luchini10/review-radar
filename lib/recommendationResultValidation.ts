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
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function normalizeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getVerifiedCitationUrl(url: string, verifiedUrls: Set<string>) {
  const normalizedUrl = normalizeUrl(url);

  if (verifiedUrls.has(normalizedUrl)) {
    return normalizedUrl;
  }

  for (const verifiedUrl of verifiedUrls) {
    const normalizedVerifiedUrl = normalizeUrl(verifiedUrl);

    if (normalizedVerifiedUrl === normalizedUrl) {
      return normalizedVerifiedUrl;
    }
  }

  const citationHost = normalizeHostname(normalizedUrl);

  if (!citationHost) {
    return null;
  }

  for (const verifiedUrl of verifiedUrls) {
    const normalizedVerifiedUrl = normalizeUrl(verifiedUrl);

    if (normalizeHostname(normalizedVerifiedUrl) === citationHost) {
      return normalizedVerifiedUrl;
    }
  }

  return null;
}

function citationUrlIsVerified(url: string, verifiedUrls: Set<string>) {
  return getVerifiedCitationUrl(url, verifiedUrls) !== null;
}

function alignSourceConsensus(sourceConsensus: string, confidenceScore: number) {
  if (sourceConsensus === "Strong" && confidenceScore < 90) {
    return confidenceScore >= 75 ? "Mixed" : "Weak";
  }

  if (sourceConsensus === "Weak" && confidenceScore >= 75) {
    return "Mixed";
  }

  if (sourceConsensus === "Niche" && confidenceScore >= 90) {
    return "Mixed";
  }

  return sourceConsensus;
}

export function filterResultToVerifiedCitations<T extends RecommendationResultLike>(
  result: T,
  verifiedUrls: Set<string>,
): T {
  return {
    ...result,
    recommendations: result.recommendations
      .map((recommendation) => {
        const citations = recommendation.citations.flatMap((citation) => {
          const verifiedUrl = getVerifiedCitationUrl(citation.url, verifiedUrls);

          if (!verifiedUrl) {
            return [];
          }

          if (normalizeUrl(citation.url) === verifiedUrl) {
            return [{ ...citation, url: verifiedUrl }];
          }

          return [
            {
              ...citation,
              title: `Verified source: ${normalizeHostname(verifiedUrl)}`,
              url: verifiedUrl,
              what_it_supports:
                "Verified source from the web research used for this recommendation.",
            },
          ];
        });

        return {
          ...recommendation,
          citations,
          source_consensus: alignSourceConsensus(
            recommendation.source_consensus,
            recommendation.confidence_score,
          ),
        };
      })
      .filter((recommendation) => recommendation.citations.length > 0),
  };
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

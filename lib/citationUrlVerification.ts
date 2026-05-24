type CitationUrlRecommendation = {
  citations: {
    url: string;
  }[];
};

type CitationUrlResult = {
  recommendations: CitationUrlRecommendation[];
};

const CITATION_CHECK_TIMEOUT_MS = 5000;

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
    return "";
  }
}

async function citationUrlIsReachable(url: string) {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CITATION_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        Range: "bytes=0-2048",
        "User-Agent": "ReviewRadar/0.1 citation verifier",
      },
      signal: controller.signal,
    });

    return response.status < 500 && response.status !== 404;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectReachableCitationUrls(result: CitationUrlResult) {
  const urls = Array.from(
    new Set(
      result.recommendations.flatMap((recommendation) =>
        recommendation.citations.map((citation) => normalizeUrl(citation.url)),
      ),
    ),
  ).filter(Boolean);

  const checks = await Promise.all(
    urls.map(async (url) => ({
      ok: await citationUrlIsReachable(url),
      url,
    })),
  );

  return new Set(
    checks.filter((check) => check.ok).map((check) => check.url),
  );
}

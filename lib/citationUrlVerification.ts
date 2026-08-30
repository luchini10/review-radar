import {
  fetchHybridSource,
  LIVE_HYBRID_FETCH_DEPENDENCIES,
  type HybridFetchDependencies,
  type HybridFetchResult,
} from "./autonomousFactVerifier.ts";
import { mapWithConcurrency } from "./recommendationPerformance.ts";
import { throwIfRequestCancelled } from "./requestCancellation.ts";

type CitationUrlRecommendation = {
  citations: {
    url: string;
  }[];
};

type CitationUrlResult = {
  recommendations: CitationUrlRecommendation[];
};

const CITATION_CHECK_TIMEOUT_MS = 5000;
const CITATION_CHECK_MAX_BYTES = 4096;
const CITATION_CHECK_MAX_REDIRECTS = 2;
const CITATION_CHECK_CONCURRENCY = 4;
const CITATION_CHECK_CONTENT_TYPES = [
  "application/json",
  "application/pdf",
  "application/xhtml+xml",
  "text/html",
  "text/plain",
] as const;

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

function citationFetchIsReachable(result: HybridFetchResult) {
  if (result.ok) return true;
  if (
    result.reason === "redirect_limit_exceeded" ||
    result.reason === "redirect_missing_location" ||
    result.reason === "request_timeout" ||
    result.reason === "response_too_large" ||
    result.reason === "unsupported_content_type"
  ) {
    return true;
  }
  if (result.reason !== "http_status_not_usable" || result.status === null) {
    return false;
  }
  if (result.status === 404 || result.status === 410) return false;
  return (
    (result.status >= 200 && result.status < 500) || result.status === 503
  );
}

async function citationUrlIsReachable(
  url: string,
  fetchDependencies: HybridFetchDependencies,
  signal?: AbortSignal,
) {
  throwIfRequestCancelled(signal);
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return false;
  }

  const fetchResult = await fetchHybridSource(
    normalizedUrl,
    fetchDependencies,
    {
      allowedContentTypes: CITATION_CHECK_CONTENT_TYPES,
      maxBytes: CITATION_CHECK_MAX_BYTES,
      maxRedirects: CITATION_CHECK_MAX_REDIRECTS,
      timeoutMs: CITATION_CHECK_TIMEOUT_MS,
      signal,
    },
  );
  return citationFetchIsReachable(fetchResult);
}

export async function collectReachableCitationUrls(
  result: CitationUrlResult,
  fetchDependencies: HybridFetchDependencies = LIVE_HYBRID_FETCH_DEPENDENCIES,
  options: { signal?: AbortSignal } = {},
) {
  throwIfRequestCancelled(options.signal);
  const urls = Array.from(
    new Set(
      result.recommendations.flatMap((recommendation) =>
        recommendation.citations.map((citation) => normalizeUrl(citation.url)),
      ),
    ),
  ).filter(Boolean);

  const checks = await mapWithConcurrency(
    urls,
    CITATION_CHECK_CONCURRENCY,
    async (url) => {
      throwIfRequestCancelled(options.signal);
      return {
        ok: await citationUrlIsReachable(
          url,
          fetchDependencies,
          options.signal,
        ),
        url,
      };
    },
  );

  return new Set(
    checks.filter((check) => check.ok).map((check) => check.url),
  );
}

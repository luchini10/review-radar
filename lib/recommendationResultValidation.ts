type CitationLike = {
  url: string;
};

type RecommendationLike = {
  citations: CitationLike[];
  confidence_score: number;
  name?: string;
  recommendation_type?: string;
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

function normalizeProductName(name: string | undefined) {
  if (!name) {
    return "";
  }

  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(carpet|cleaner|portable|review|vacuum)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urlLooksLikeGenericListingPage(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const path = parsed.pathname.toLowerCase();
  const genericPathPattern =
    /(?:^|\/)(?:search|searchpage|collections?|category|categories?|catalog|browse)(?:[/.]|$)/;

  if (genericPathPattern.test(path) || /(?:^|[/.])[^/]*hidden[^/]*(?:[/.]|$)/.test(path)) {
    return true;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "nike.com" && path.startsWith("/w/")) {
    return true;
  }

  if (
    host === "dickssportinggoods.com" &&
    /\/(?:c|f|s)\//i.test(path)
  ) {
    return true;
  }

    if (
      host === "footlocker.com" &&
      /\/(?:buy|category|search|collection)\//i.test(path)
    ) {
      return true;
    }

  return /(?:^|\/)(?:[^/]*(?:vacuums|vacuum-cleaners|air-purifiers|pet_cordless_vacuums|cordless_vacuums|running-shoes|dog-foods))(?:\/)?$/.test(
    path,
  );
}

/**
 * Detects category/listing/article pages that the AI cited as products.
 * These should be filtered out before they reach exactMatches/nearMatches.
 */
function isNonProductPageResult(name: string | undefined, primaryUrl: string): boolean {
  // ── URL-based checks ──────────────────────────────────────────────────────
  let parsed: URL | null = null;

  try {
    parsed = new URL(primaryUrl);
  } catch {
    // not a valid URL — let it pass
  }

  if (parsed) {
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();

    if (urlLooksLikeGenericListingPage(primaryUrl)) {
      return true;
    }

    if (
      host === "homedepot.com" &&
      (path.startsWith("/b/") || path.startsWith("/c/"))
    ) {
      return true;
    }

    if (
      host === "walmart.com" &&
      (path.startsWith("/browse/") || path.startsWith("/cp/"))
    ) {
      return true;
    }

    if (host === "target.com" && path.startsWith("/c/")) {
      return true;
    }

    if (host === "runrepeat.com") {
      return true;
    }

    if (
      host === "klarna.com" ||
      host === "pinterest.com" ||
      host === "sneakerfiles.com" ||
      host === "wwd.com"
    ) {
      return true;
    }

    if (
      (host === "nba.com" || host.endsWith(".nba.com")) &&
      /\b(?:rule|rules|court|dimension|dimensions|equipment)\b/i.test(path)
    ) {
      return true;
    }

    if (host === "espn.com" && path.includes("/story/")) {
      return true;
    }

    if (host === "about.nike.com" || host === "news.nike.com") {
      return true;
    }

    // Zappos: filter/category URLs always end in .zso
    if (host === "zappos.com" && path.endsWith(".zso")) {
      return true;
    }

    // Chewy: /b/ is their category tree; /best/ is articles
    if (host === "chewy.com" && (path.startsWith("/b/") || path.startsWith("/best/"))) {
      return true;
    }

    // Nike: /w/ is their product listing/filter pages
    if (host === "nike.com" && path.startsWith("/w/")) {
      return true;
    }

    // Nike buyable product pages use /t/. Brand/category/story pages are not
    // product detail pages even when they name a shoe line.
    if (host === "nike.com" && !/\/t\//i.test(path)) {
      return true;
    }

    if (
      host === "dickssportinggoods.com" &&
      /\/(?:a|c|f|s)\//i.test(path)
    ) {
      return true;
    }

    // The Spruce / Spruce Pets / Spruce Eats — review/roundup article sites
    if (host === "thespruce.com" || host === "thesprucepets.com" || host === "thespruceats.com") {
      return true;
    }

    // ENERGY STAR — spec/certification documents, not products
    if (host === "energystar.gov" && path.includes("/spec/")) {
      return true;
    }

    // Amazon search results
    if (host === "amazon.com" && path.startsWith("/s")) {
      return true;
    }

    // Walmart search
    if (host === "walmart.com" && path.startsWith("/search")) {
      return true;
    }
  }

  // ── Name-based checks ─────────────────────────────────────────────────────
  if (!name) {
    return false;
  }

  const n = name.trim();

  // "The 8 Best Budget Dog Foods of 2026" / "Best Budget Dog Foods 2026"
  if (/^(?:the\s+)?\d+\s+best\b/i.test(n) || /^best\s+\w.{3,}\s+of\s+20\d\d/i.test(n)) {
    return true;
  }

  // "Ranking the top 74 sneakers..." / "Top 10 products ranked..."
  if (
    /^(?:ranking|ranked)\s+(?:the\s+)?(?:top|best)\s+\d+\b/i.test(n) ||
    /^(?:the\s+)?(?:top|best)\s+\d+\b/i.test(n)
  ) {
    return true;
  }

  // Review pages are evidence sources, not buyable product recommendations.
  if (
    /^\s*cut\s+in\s+half\b/i.test(n) ||
    /\breview\b\s*(?:\||-|$)/i.test(n) ||
    /\b(?:official images|release info|newsroom|built for|colorways?\s+\+\s+release dates|complete guide|franchise history|shuffles?\s+its\s+lineup)\b/i.test(n) ||
    /\b\w+\s+out,\s+\w+.+\s+in\?\s*$/i.test(n) ||
    /\b(?:rule\s+no\.?|court dimensions?|backboard dimensions?|dimensions?\s*(?:&|and)\s*drawings?|equipment\s*-\s*nba official)\b/i.test(n)
  ) {
    return true;
  }

  // Broad category/listing titles rather than a specific buyable product.
  if (
    /\b(?:shoes|sneakers|boots|sandals|shirts|pants|jackets|chairs|desks|tables|vacuums|appliances|tools|grills|mattresses|sofas|couches)\s+(?:for|from)\s+(?:men|women|kids|top brands|speed|running|basketball|walking)\b/i.test(n) ||
    /^\s*(?:basketball|running|walking|training|tennis|hiking)\s+(?:shoes|sneakers)\s*(?:\||-|for|from)\b/i.test(n)
  ) {
    return true;
  }

  // "X + FREE SHIPPING - Zappos.com" (category listing page titles)
  if (/\+\s*free\s+shipping/i.test(n)) {
    return true;
  }

  // "According to Reviews" — editorial roundup
  if (/according\s+to\s+reviews/i.test(n)) {
    return true;
  }

  // "The 6 Best Air Purifiers The Spruce Has Tested"
  if (/\bhas\s+tested\b/i.test(n)) {
    return true;
  }

  // "Dry Dog Food - Healthy, High Quality Dog Food from Top Brands"
  if (/\bfrom\s+top\s+brands\b/i.test(n)) {
    return true;
  }

  // "Specification Version X" (standards docs)
  if (/\bspecification\s+version\s+\d/i.test(n)) {
    return true;
  }

  return false;
}

export function filterResultToVerifiedCitations<T extends RecommendationResultLike>(
  result: T,
  verifiedUrls: Set<string>,
): T {
  const seenProductNames = new Set<string>();
  const seenProductUrls = new Set<string>();

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
      .filter((recommendation) => {
        if (recommendation.citations.length === 0) {
          return false;
        }

        const primaryUrl = recommendation.citations[0]?.url ?? "";

        // Drop category pages, article roundups, and listing pages the AI
        // cited as products — they should never appear in exactMatches/nearMatches.
        if (isNonProductPageResult(recommendation.name, primaryUrl)) {
          return false;
        }

        // URL-based deduplication: two products pointing to the same primary
        // product page are the same product (e.g. slight name variants).
        if (primaryUrl && seenProductUrls.has(normalizeUrl(primaryUrl))) {
          return false;
        }

        if (primaryUrl) {
          seenProductUrls.add(normalizeUrl(primaryUrl));
        }

        const normalizedProductName = normalizeProductName(recommendation.name);

        if (!normalizedProductName) {
          return true;
        }

        if (seenProductNames.has(normalizedProductName)) {
          return false;
        }

        seenProductNames.add(normalizedProductName);
        return true;
      }),
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

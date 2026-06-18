import { detectKnownBrands } from "./brandMatching.ts";
import { candidateMatchesDiscoveryTarget } from "./discoveryStrategy.ts";
import type {
  ProductCredibility,
  ProductCredibilityTier,
  ProductDiscoveryTarget,
  ProductRecommendation,
  RecommendationApiRequest,
} from "@/types/review-radar";

const majorRetailerDomains = [
  "amazon.com",
  "bestbuy.com",
  "costco.com",
  "homedepot.com",
  "lowes.com",
  "macys.com",
  "rei.com",
  "samsclub.com",
  "target.com",
  "walmart.com",
  "wayfair.com",
];

const broadMarketplaceDomains = [
  "aliexpress.com",
  "ebay.com",
  "temu.com",
];

const editorialPatterns = [
  /\bbest\b/i,
  /\bbuying guide\b/i,
  /\bcomparison\b/i,
  /\bexpert\b/i,
  /\bhands[-\s]?on\b/i,
  /\blong[-\s]?term\b/i,
  /\breview(?:ed|s)?\b/i,
  /\btested\b/i,
  /\bwirecutter\b/i,
  /\bconsumer reports\b/i,
  /\brtings\b/i,
  /\btom'?s guide\b/i,
  /\bcnet\b/i,
];

const officialPatterns = [
  /\bofficial\b/i,
  /\bmanufacturer\b/i,
  /\bbrand page\b/i,
  /\bproduct page\b/i,
];

type SourceRecord = {
  host: string;
  text: string;
  url: string;
};

function compact(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(host: string, domains: string[]) {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isMajorRetailerHost(host: string) {
  return hostMatches(host, majorRetailerDomains);
}

function isBroadMarketplaceHost(host: string) {
  return hostMatches(host, broadMarketplaceDomains);
}

function uniqueHosts(sources: SourceRecord[]) {
  return new Set(sources.map((source) => source.host).filter(Boolean));
}

function sourceRecords(product: ProductRecommendation) {
  const records: SourceRecord[] = [];

  for (const citation of product.citations) {
    records.push({
      host: hostOf(citation.url),
      text: `${citation.title} ${citation.what_it_supports} ${citation.url}`,
      url: citation.url,
    });
  }

  if (product.product_page_url) {
    records.push({
      host: hostOf(product.product_page_url),
      text: `${product.name} product page ${product.product_page_url}`,
      url: product.product_page_url,
    });
  }

  if (product.metadata?.canonicalUrl?.value) {
    records.push({
      host: hostOf(product.metadata.canonicalUrl.value),
      text: `${product.name} canonical product page ${product.metadata.canonicalUrl.value}`,
      url: product.metadata.canonicalUrl.value,
    });
  }

  for (const offer of product.metadata?.offers || []) {
    if (!offer.url) {
      continue;
    }

    records.push({
      host: hostOf(offer.url),
      text: `${offer.retailer || ""} offer ${offer.url}`,
      url: offer.url,
    });
  }

  for (const item of [
    ...(product.evidenceBucket?.positiveEvidence || []),
    ...(product.evidenceBucket?.negativeEvidence || []),
  ]) {
    records.push({
      host: hostOf(item.sourceUrl),
      text: `${item.sourceTitle} ${item.claim} ${item.snippet} ${item.sourceUrl}`,
      url: item.sourceUrl,
    });
  }

  for (const url of product.evidenceBucket?.ownerOpinion?.sourceUrls || []) {
    records.push({
      host: hostOf(url),
      text: `${product.name} reddit owner opinion ${url}`,
      url,
    });
  }

  const seen = new Set<string>();

  return records.filter((record) => {
    const key = `${record.host}:${record.url}`;

    if (!record.url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function reviewVolumeScore(reviewCount: number | null) {
  if (!reviewCount || reviewCount <= 0) {
    return 0;
  }

  if (reviewCount < 10) {
    return 2;
  }

  if (reviewCount < 50) {
    return 6;
  }

  if (reviewCount < 200) {
    return 10;
  }

  if (reviewCount < 1000) {
    return 16;
  }

  return clamp(22 + Math.log10(reviewCount / 1000 + 1) * 3, 22, 26);
}

function ratingScore(rating: number | null) {
  if (rating === null || rating === undefined || !Number.isFinite(rating)) {
    return 0;
  }

  if (rating >= 4.7) {
    return 10;
  }

  if (rating >= 4.5) {
    return 8;
  }

  if (rating >= 4.2) {
    return 6;
  }

  if (rating >= 4) {
    return 3;
  }

  if (rating >= 3.7) {
    return 0;
  }

  return -5;
}

function sourceCoverageScore(sourceCount: number, independentSourceCount: number) {
  const base =
    sourceCount <= 0
      ? 0
      : sourceCount === 1
        ? 3
        : sourceCount === 2
          ? 8
          : sourceCount === 3
            ? 12
            : 15;

  return clamp(base + Math.min(5, independentSourceCount * 1.5), 0, 20);
}

function dataCompleteness(product: ProductRecommendation) {
  const checks = [
    Boolean(product.metadata?.brand?.value || product.canonicalIdentity?.brand),
    Boolean(product.metadata?.modelNumber?.value || product.metadata?.gtin?.value),
    Boolean(product.metadata?.canonicalUrl?.value || product.product_page_url),
    Boolean(product.product_image_url || product.metadata?.image?.value),
    Boolean(product.metadata?.offers?.length),
    Boolean(
      product.metadata?.offers?.some((offer) => offer.price.value !== null) ||
        product.estimated_price_range,
    ),
    Boolean(product.metadata?.rating?.value),
    Boolean(product.metadata?.reviewCount?.value),
    product.citations.length >= 2,
    Boolean(product.evidenceBucket?.positiveEvidence.length),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 16);
}

function productBrandText(product: ProductRecommendation) {
  return compact(
    [
      product.name,
      product.metadata?.brand?.value || "",
      product.metadata?.title?.value || "",
      product.canonicalIdentity?.brand || "",
      product.product_page_url,
    ].join(" "),
  );
}

function brandSourceCount(product: ProductRecommendation, sources: SourceRecord[]) {
  const explicitBrand =
    product.metadata?.brand?.value ||
    product.canonicalIdentity?.brand ||
    detectKnownBrands(productBrandText(product))[0] ||
    "";
  const normalizedBrand = explicitBrand.toLowerCase();

  if (!normalizedBrand) {
    return 0;
  }

  return new Set(
    sources
      .filter((source) => source.text.toLowerCase().includes(normalizedBrand))
      .map((source) => source.host)
      .filter(Boolean),
  ).size;
}

function strategyTargetMatches(
  product: ProductRecommendation,
  targets: ProductDiscoveryTarget[] | undefined,
) {
  if (!targets || targets.length === 0) {
    return false;
  }

  return targets.some((target) =>
    candidateMatchesDiscoveryTarget(
      {
        brand: product.metadata?.brand?.value || product.canonicalIdentity?.brand,
        name: [
          product.name,
          product.metadata?.title?.value || "",
          product.product_page_url,
        ].join(" "),
      },
      target,
    ),
  );
}

export function credibilityTierRank(
  tier: ProductCredibilityTier | undefined,
) {
  if (tier === "strong") {
    return 0;
  }

  if (tier === "moderate") {
    return 1;
  }

  return 2;
}

export function assessProductCredibility(
  product: ProductRecommendation,
  input?: RecommendationApiRequest,
): ProductCredibility {
  const sources = sourceRecords(product);
  const hosts = uniqueHosts(sources);
  const hostList = Array.from(hosts);
  const sourceCount = hosts.size;
  const majorRetailerCount = hostList.filter(isMajorRetailerHost).length;
  const independentSourceCount = hostList.filter(
    (host) => !isMajorRetailerHost(host) && !isBroadMarketplaceHost(host),
  ).length;
  const editorialSourceCount = sources.filter((source) =>
    editorialPatterns.some((pattern) => pattern.test(source.text)),
  ).length;
  const officialPageFound = sources.some((source) =>
    officialPatterns.some((pattern) => pattern.test(source.text)),
  );
  const reviewCount = product.metadata?.reviewCount?.value ?? null;
  const rating = product.metadata?.rating?.value ?? null;
  const hasKnownBrand = detectKnownBrands(productBrandText(product)).length > 0;
  const repeatedBrandSources = brandSourceCount(product, sources);
  const completeness = dataCompleteness(product);
  const targetBonus = strategyTargetMatches(
    product,
    input?.discoveryStrategy?.expectedProducts,
  )
    ? 5
    : 0;
  const brandScore =
    (hasKnownBrand ? 8 : product.metadata?.brand?.value ? 4 : 0) +
    Math.min(4, repeatedBrandSources * 1.5);
  const retailerScore =
    majorRetailerCount <= 0
      ? 0
      : majorRetailerCount === 1
        ? 5
        : majorRetailerCount === 2
          ? 8
          : 10;
  const editorialScore = clamp(editorialSourceCount * 4, 0, 12);
  const penalties = [
    !reviewCount ? 8 : reviewCount < 10 ? 6 : 0,
    rating === null ? 5 : 0,
    sourceCount <= 1 ? 7 : 0,
    !product.product_page_url && !product.metadata?.canonicalUrl?.value ? 5 : 0,
    !majorRetailerCount && !officialPageFound ? 4 : 0,
    !product.metadata?.brand?.value && !product.canonicalIdentity?.brand ? 4 : 0,
    !product.product_image_url && !product.metadata?.image?.value ? 3 : 0,
  ].reduce((total, value) => total + value, 0);
  const score = clamp(
    reviewVolumeScore(reviewCount) +
      ratingScore(rating) +
      sourceCoverageScore(sourceCount, independentSourceCount) +
      retailerScore +
      editorialScore +
      brandScore +
      completeness +
      targetBonus -
      penalties,
    0,
    100,
  );
  const enoughForStrong =
    Boolean(product.product_page_url || product.metadata?.canonicalUrl?.value) &&
    (reviewCount !== null && reviewCount >= 200
      ? true
      : sourceCount >= 3 || editorialSourceCount >= 1);
  const credibleOwnerReviewBase =
    reviewCount !== null &&
    reviewCount >= 50 &&
    rating !== null &&
    rating >= 4;
  const tier: ProductCredibilityTier =
    score >= 68 && enoughForStrong
      ? "strong"
      : (score >= 42 || (score >= 36 && credibleOwnerReviewBase)) &&
          (Boolean(reviewCount && reviewCount >= 10) ||
            sourceCount >= 2 ||
            majorRetailerCount >= 1)
        ? "moderate"
        : "weak";
  const label =
    tier === "strong"
      ? "Strong market confidence"
      : tier === "moderate"
        ? "Moderate market confidence"
        : "Limited market confidence";
  const signals = [
    rating !== null && reviewCount
      ? `${rating} stars from ${reviewCount.toLocaleString("en-US")} reviews`
      : reviewCount
        ? `${reviewCount.toLocaleString("en-US")} reviews found`
        : "",
    sourceCount > 0
      ? `${sourceCount.toLocaleString("en-US")} source${
          sourceCount === 1 ? "" : "s"
        } checked`
      : "",
    majorRetailerCount > 0
      ? `Available or cited by ${majorRetailerCount} major retailer${
          majorRetailerCount === 1 ? "" : "s"
        }`
      : "",
    editorialSourceCount > 0
      ? `${editorialSourceCount} editorial or hands-on review source${
          editorialSourceCount === 1 ? "" : "s"
        } found`
      : "",
    officialPageFound ? "Official or exact product page found" : "",
    repeatedBrandSources >= 2 ? "Brand appears across multiple sources" : "",
  ].filter(Boolean);
  const warnings = [
    !reviewCount
      ? "No verified customer review count found."
      : reviewCount < 10
        ? `Limited review history: only ${reviewCount} reviews found.`
        : "",
    rating === null ? "No verified average rating found." : "",
    sourceCount <= 1 ? "Only one supporting source found." : "",
    !majorRetailerCount && !officialPageFound
      ? "No major retailer or official product-page signal found."
      : "",
    !product.metadata?.brand?.value && !product.canonicalIdentity?.brand
      ? "Brand was not confidently verified."
      : "",
  ].filter(Boolean);

  return {
    dataCompletenessScore: completeness,
    editorialSourceCount,
    independentSourceCount,
    label,
    majorRetailerCount,
    rating,
    reviewCount,
    score,
    signals,
    sourceCount,
    tier,
    warnings,
  };
}

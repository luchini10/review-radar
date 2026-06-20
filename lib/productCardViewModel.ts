import { classifyNearMatch } from "./nearMatchClassification.ts";
import { assessProductCredibility } from "./productCredibility.ts";
import {
  sanitizeProductCons,
  sanitizeProductPros,
} from "./productCopySanitizer.ts";
import { getProductPageLink } from "./productPageUrl.ts";
import type {
  Citation,
  ProductOffer,
  ProductRecommendation,
  RequirementComparison,
} from "../types/review-radar.ts";

export type ProductCardDisplayMode =
  | "recommendation"
  | "nearMatch";

export type ProductCardTone = "positive" | "neutral" | "warning";

export type ProductCardEvidenceQuality = "High" | "Medium" | "Low";

export type ProductRecommendationCardData = {
  badge: {
    description: string;
    label: string;
    rank?: number;
    tone: "blue" | "slate";
  };
  buyerFit: {
    bestFor: string[];
    notFor: string[];
  };
  category: string;
  citations: Array<{
    host: string;
    label: string;
    supports: string;
    title: string;
    type: string;
    url: string;
  }>;
  evidence: {
    customerReviewCount?: number;
    explanation: string;
    quality: ProductCardEvidenceQuality;
    sourcesChecked: number;
    warnings: string[];
  };
  image: {
    alt: string;
    src: string;
  };
  nearMatch?: {
    details: string[];
    label: string;
    summary: string;
  };
  offer?: {
    ctaLabel: string;
    displayText: string;
    priceText?: string;
    retailer?: string;
    url?: string;
    valueNote?: string;
  };
  ownerOpinion?: {
    concerns: string[];
    label: string;
    praises: string[];
    summary: string;
    tone: ProductCardTone;
  };
  pros: string[];
  cons: string[];
  quickSignals: Array<{
    label: string;
    tone: ProductCardTone;
    value: string;
  }>;
  recommendationReasons: string[];
  rating?: {
    count?: number;
    text: string;
    value: number;
  };
  specs: {
    categorySpecific: Array<{ label: string; value: string }>;
    universal: Array<{ label: string; value: string }>;
  };
  summary: string;
  title: string;
  tradeoff?: string;
};

const retailerDomains = [
  "amazon.com",
  "bestbuy.com",
  "costco.com",
  "homedepot.com",
  "lowes.com",
  "target.com",
  "walmart.com",
  "wayfair.com",
];

function compact(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return compact(value).toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function uniqueByText(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const clean = compact(value);
    const key = normalizeKey(clean);

    if (!clean || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(clean);
  }

  return output;
}

function firstSentence(value: string, fallback = "") {
  const clean = compact(value);

  if (!clean) {
    return fallback;
  }

  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);

  return compact(match?.[1] || clean);
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function labelFromHost(url: string) {
  const host = hostOf(url);

  if (!host) {
    return "";
  }

  return host;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

function offerPrice(offer: ProductOffer) {
  return offer.price.value;
}

function bestVerifiedOffer(product: ProductRecommendation) {
  const offers = product.metadata?.offers || [];
  const priced = offers
    .filter((offer) => offerPrice(offer) !== null)
    .sort((first, second) => (offerPrice(first) || 0) - (offerPrice(second) || 0));

  return priced[0] || offers.find((offer) => offer.url) || null;
}

function buildOffer(product: ProductRecommendation) {
  const link = getProductPageLink(product);
  const offer = bestVerifiedOffer(product);
  const reliability = product.reliabilityCheck;
  const fallbackOfferPrice = offer ? offerPrice(offer) : null;
  const reliablePrice =
    reliability === undefined
      ? fallbackOfferPrice
      : reliability.price !== null &&
          reliability.priceConfidence !== "suspicious" &&
          reliability.priceConfidence !== "conflicting" &&
          reliability.priceConfidence !== "unverified"
        ? reliability.price
        : null;
  const priceText = reliablePrice !== null ? formatMoney(reliablePrice) : "";
  const retailer = compact(offer?.retailer || labelFromHost(offer?.url || link?.url || ""));
  const fallbackPrice = compact(product.estimated_price_range);
  const displayText =
    reliability?.priceConfidence === "conflicting" ||
    reliability?.priceConfidence === "suspicious"
      ? "Verify current store price"
      : priceText
        ? `${priceText}${retailer ? ` at ${retailer}` : ""}`
        : fallbackPrice || (link ? "Verify current store price" : "");

  if (!displayText && !link) {
    return undefined;
  }

  return {
    ctaLabel: priceText ? "View best offer" : "View product",
    displayText,
    priceText: priceText || undefined,
    retailer: retailer || undefined,
    url: link?.url || offer?.url || product.product_page_url || undefined,
    valueNote: compact(product.price_value_verdict) || undefined,
  };
}

function buildRating(product: ProductRecommendation) {
  const rating = product.metadata?.rating?.value;
  const count = product.metadata?.reviewCount?.value;

  if (rating === null || rating === undefined || !Number.isFinite(rating)) {
    return undefined;
  }

  return {
    count: count === null || count === undefined ? undefined : count,
    text:
      count === null || count === undefined
        ? `${rating} rating`
        : `${rating} from ${count.toLocaleString("en-US")} reviews`,
    value: rating,
  };
}

function safeProductImage(product: ProductRecommendation) {
  return product.metadata?.image?.confidence === "Low" ? "" : product.product_image_url;
}

function evidenceSourceCount(product: ProductRecommendation) {
  const urls = new Set(
    product.citations
      .map((citation) => citation.url)
      .filter((url) => compact(url).length > 0),
  );

  if (product.product_page_url) {
    urls.add(product.product_page_url);
  }

  for (const offer of product.metadata?.offers || []) {
    if (offer.url) {
      urls.add(offer.url);
    }
  }

  return urls.size;
}

function evidenceQuality(product: ProductRecommendation): ProductCardEvidenceQuality {
  const sources = evidenceSourceCount(product);
  const reviewCount = product.metadata?.reviewCount?.value || 0;

  if (
    product.source_consensus === "Strong" &&
    product.confidence_score >= 85 &&
    sources >= 2 &&
    reviewCount >= 50
  ) {
    return "High";
  }

  if (
    product.source_consensus === "Weak" ||
    product.confidence_score < 65 ||
    (sources <= 1 && reviewCount < 25) ||
    product.evidence_strength === "weak"
  ) {
    return "Low";
  }

  return "Medium";
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralValue}`;
}

function buildEvidence(product: ProductRecommendation) {
  const marketConfidence =
    product.marketConfidence || assessProductCredibility(product);
  const quality = evidenceQuality(product);
  const sourcesChecked = Math.max(
    evidenceSourceCount(product),
    marketConfidence.sourceCount,
  );
  const reviewCount =
    marketConfidence.reviewCount || product.metadata?.reviewCount?.value || undefined;
  const warnings = uniqueByText([
    ...marketConfidence.warnings,
    ...(product.unknownRequirements || []),
    ...(product.evidenceBucket?.unknowns || []).map(
      (unknown) => `${unknown.topic}: ${unknown.reason}`,
    ),
  ]).slice(0, 3);
  const parts = [
    sourcesChecked > 0 ? plural(sourcesChecked, "source") : "Limited sources found",
    reviewCount ? plural(reviewCount, "customer review") : "",
  ].filter(Boolean);
  const signalText = marketConfidence.signals.slice(0, 3).join(". ");
  const limitation =
    marketConfidence.tier === "weak"
      ? "Selected as a fallback because stronger market evidence was limited."
      : quality === "Low"
        ? "Treat this as a preliminary recommendation because the evidence is limited."
        : quality === "Medium"
          ? "Some claims rely on limited or mixed source coverage."
          : "Multiple useful signals support the recommendation.";

  return {
    customerReviewCount: reviewCount,
    explanation: `${marketConfidence.label}. ${
      signalText || parts.join(" and ") || "Limited sources found"
    }. ${limitation}`,
    quality,
    sourcesChecked,
    warnings,
  };
}

function buildBadge(
  product: ProductRecommendation,
  displayMode: ProductCardDisplayMode,
) {
  const marketConfidence =
    product.marketConfidence || assessProductCredibility(product);

  if (displayMode === "nearMatch") {
    const classification = classifyNearMatch(product);

    return {
      description: `Close option, but ${classification.description}.`,
      label: classification.label,
      tone: "slate" as const,
    };
  }

  if (
    product.disqualifiedReason ||
    product.requirementCheck?.exactMatch === false ||
    (product.requirementCheck?.failed?.length || 0) > 0
  ) {
    return {
      description:
        "This recommendation has an unresolved requirement concern, so review the details before treating it as an exact match.",
      label: "Needs Review",
      tone: "slate" as const,
    };
  }

  if (product.rankLabel) {
    return {
      description:
        product.rankReason ||
        "Ranked by requirement fit, product quality, evidence, and price.",
      label: product.rankLabel,
      rank: product.rank,
      tone: "blue" as const,
    };
  }

  if (marketConfidence.tier === "weak") {
    return {
      description:
        "Matches the search, but has limited review history compared with more established options.",
      label: "Fallback Pick",
      tone: "slate" as const,
    };
  }

  return {
    description: "Matched the hard requirements after validation.",
    label: "Best Match",
    tone: "blue" as const,
  };
}

function comparisonLabel(value: string) {
  return compact(value)
    .replace(/^Feature:\s*/i, "")
    .replace(/^Category:\s*/i, "")
    .replace(/^Budget:\s*/i, "")
    .trim();
}

function usefulMatchedRequirements(product: ProductRecommendation) {
  const comparisons = product.requirementComparisons || [];
  const matched = comparisons
    .filter((comparison) => comparison.status === "matched")
    .map((comparison) => comparison.required);
  const passed = product.requirementCheck?.passed || [];
  const explicit = product.matchedRequirements || [];

  return uniqueByText([...matched, ...passed, ...explicit])
    .map(comparisonLabel)
    .filter((item) => item && !/^(?:category|budget)$/i.test(item))
    .slice(0, 4);
}

function shopperPros(product: ProductRecommendation) {
  return uniqueByText(sanitizeProductPros(product.pros))
    .filter((item) => !/^limited review evidence/i.test(item))
    .slice(0, 5);
}

function shopperCons(product: ProductRecommendation) {
  return uniqueByText(sanitizeProductCons(product.cons))
    .filter((item) => !/^(?:independent review depth|feature durability):/i.test(item))
    .slice(0, 4);
}

function firstTradeoff(product: ProductRecommendation, cons: string[]) {
  return (
    cons[0] ||
    product.common_complaints.find((item) => compact(item)) ||
    product.unknownRequirements?.find((item) => compact(item)) ||
    undefined
  );
}

function buildReasons(
  product: ProductRecommendation,
  evidence: ProductRecommendationCardData["evidence"],
) {
  const matched = usefulMatchedRequirements(product);
  const positiveEvidence =
    product.evidenceBucket?.positiveEvidence.map((item) => item.claim) || [];
  const reasons = [
    product.rankReason || product.slot_reasoning || firstSentence(product.why_recommended),
    matched.length > 0 ? `Matches key filters: ${matched.join(", ")}.` : "",
    ...sanitizeProductPros(positiveEvidence).slice(0, 2),
    evidence.sourcesChecked > 1
      ? `Supported by ${plural(evidence.sourcesChecked, "source")}${
          evidence.customerReviewCount
            ? ` and ${plural(evidence.customerReviewCount, "customer review")}`
            : ""
        }.`
      : "",
  ];

  return uniqueByText(reasons).slice(0, 4);
}

function buildQuickSignals(
  product: ProductRecommendation,
  offer: ProductRecommendationCardData["offer"],
  evidence: ProductRecommendationCardData["evidence"],
  ownerOpinion?: ProductRecommendationCardData["ownerOpinion"],
  tradeoff?: string,
) {
  return [
    product.best_for
      ? { label: "Best for", tone: "positive" as const, value: product.best_for }
      : null,
    tradeoff
      ? { label: "Tradeoff", tone: "warning" as const, value: tradeoff }
      : null,
    ownerOpinion
      ? {
          label: "Owner opinion",
          tone: ownerOpinion.tone,
          value: `${ownerOpinion.label} - ${ownerOpinion.summary}`,
        }
      : {
          label: "Evidence",
          tone: evidence.quality === "Low" ? ("warning" as const) : ("neutral" as const),
          value: `${evidence.quality} - ${evidence.explanation}`,
        },
    offer?.displayText
      ? { label: "Price", tone: "neutral" as const, value: offer.displayText }
      : null,
  ].filter(
    (item): item is { label: string; tone: ProductCardTone; value: string } =>
      Boolean(item && compact(item.value)),
  ).slice(0, 4);
}

function buildOwnerOpinion(product: ProductRecommendation) {
  const opinion = product.evidenceBucket?.ownerOpinion;

  if (!opinion || opinion.sourceCount === 0) {
    return undefined;
  }

  const label =
    opinion.sentiment === "positive"
      ? "Positive"
      : opinion.sentiment === "negative"
        ? "Concerning"
        : opinion.sentiment === "mixed"
          ? "Mixed"
          : "Limited";
  const tone: ProductCardTone =
    opinion.sentiment === "positive"
      ? "positive"
      : opinion.sentiment === "negative" || opinion.sentiment === "mixed"
        ? "warning"
        : "neutral";

  return {
    concerns: opinion.concerns.slice(0, 3),
    label,
    praises: opinion.praises.slice(0, 3),
    summary: opinion.summary,
    tone,
  };
}

function dimensionSpec(label: string, value: number | null | undefined, unit = "in") {
  return value === null || value === undefined ? null : { label, value: `${value} ${unit}` };
}

function sourceValue(value: string | null | undefined) {
  return compact(value).replace(/^https?:\/\//i, "");
}

function comparisonSpec(comparison: RequirementComparison) {
  if (comparison.status !== "matched") {
    return null;
  }

  const required = comparisonLabel(comparison.required);
  const productHas = compact(comparison.productHas).replace(/^.+?:\s*/, "");

  if (
    !required ||
    !productHas ||
    /^(?:budget|category|price)$/i.test(required) ||
    /\bnot verified\b/i.test(productHas)
  ) {
    return null;
  }

  return {
    label: required,
    value: productHas,
  };
}

function buildSpecs(product: ProductRecommendation, offer: ProductRecommendationCardData["offer"]) {
  const dimensions = product.metadata?.dimensions;
  const unit = dimensions?.unit || "in";
  const universal = [
    product.metadata?.brand?.value || product.canonicalIdentity?.brand
      ? { label: "Brand", value: sourceValue(product.metadata?.brand?.value || product.canonicalIdentity?.brand) }
      : null,
    product.metadata?.modelNumber?.value
      ? { label: "Model", value: sourceValue(product.metadata.modelNumber.value) }
      : null,
    product.category ? { label: "Category", value: product.category } : null,
    offer?.displayText ? { label: "Current offer", value: offer.displayText } : null,
    offer?.retailer ? { label: "Retailer", value: offer.retailer } : null,
    bestVerifiedOffer(product)?.availability.value
      ? { label: "Availability", value: sourceValue(bestVerifiedOffer(product)?.availability.value) }
      : null,
    product.metadata?.colors?.value?.length
      ? { label: "Colors", value: product.metadata.colors.value.slice(0, 4).join(", ") }
      : null,
    dimensionSpec("Width", dimensions?.width?.value, unit),
    dimensionSpec("Depth", dimensions?.depth?.value, unit),
    dimensionSpec("Height", dimensions?.height?.value, unit),
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item && compact(item.value)),
  );
  const categorySpecific = uniqueSpecs(
    (product.requirementComparisons || [])
      .map(comparisonSpec)
      .filter((item): item is { label: string; value: string } => Boolean(item)),
  ).slice(0, 6);

  return {
    categorySpecific,
    universal: uniqueSpecs(universal).slice(0, 8),
  };
}

function uniqueSpecs(specs: Array<{ label: string; value: string }>) {
  const seen = new Set<string>();
  const output: Array<{ label: string; value: string }> = [];

  for (const spec of specs) {
    const key = `${normalizeKey(spec.label)}:${normalizeKey(spec.value)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(spec);
  }

  return output;
}

function citationType(citation: Citation) {
  const text = normalizeKey(`${citation.title} ${citation.what_it_supports} ${citation.url}`);
  const host = hostOf(citation.url);

  if (/\bofficial\b|\bmanufacturer\b|\bbrand page\b/.test(text)) {
    return { label: "Official product page", type: "manufacturer" };
  }

  if (/\bspecs?\b|\bspecification\b|\bdimensions?\b/.test(text)) {
    return { label: "Specs source", type: "specs" };
  }

  if (
    /\bexpert\b|\btested\b|\bhands on\b|\breview\b/.test(text) &&
    !/\bcustomer reviews?\b/.test(text)
  ) {
    return { label: "Expert review", type: "expert_review" };
  }

  if (/\bcustomer\b|\bowner\b|\breddit\b|\bforum\b|\breviews?\b/.test(text)) {
    return { label: "Customer review source", type: "customer_reviews" };
  }

  if (retailerDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return { label: "Retailer listing", type: "retailer" };
  }

  return { label: "Source", type: "other" };
}

function buildCitations(product: ProductRecommendation) {
  return product.citations.map((citation) => {
    const type = citationType(citation);

    return {
      host: hostOf(citation.url),
      label: type.label,
      supports: compact(citation.what_it_supports),
      title: compact(citation.title),
      type: type.type,
      url: citation.url,
    };
  });
}

function buildNearMatch(product: ProductRecommendation, displayMode: ProductCardDisplayMode) {
  if (displayMode === "recommendation" && !product.disqualifiedReason) {
    return undefined;
  }

  const classification = classifyNearMatch(product);
  const details = uniqueByText([
    ...(product.requirementComparisons || [])
      .filter((comparison) => comparison.status !== "matched" && comparison.status !== "not_applicable")
      .map((comparison) =>
        comparison.productHas
          ? `${comparison.required}: ${comparison.productHas}`
          : comparison.required,
      ),
    ...(product.missingRequirements || []),
    product.near_match_reason || "",
    product.disqualifiedReason || "",
  ]).slice(0, 4);
  return {
    details,
    label: "What to check",
    summary: `This product is close, but ${classification.description}.`,
  };
}

function buyerFitList(value: string) {
  return compact(value) ? [compact(value)] : [];
}

function buildSummary(product: ProductRecommendation) {
  return firstSentence(
    product.why_recommended,
    "A cited option ReviewRadar found for this search.",
  );
}

export function buildProductRecommendationCardData(
  product: ProductRecommendation,
  displayMode: ProductCardDisplayMode = "recommendation",
): ProductRecommendationCardData {
  const offer = buildOffer(product);
  const rating = buildRating(product);
  const evidence = buildEvidence(product);
  const ownerOpinion = buildOwnerOpinion(product);
  const pros = shopperPros(product);
  const cons = shopperCons(product);
  const tradeoff = firstTradeoff(product, cons);

  return {
    badge: buildBadge(product, displayMode),
    buyerFit: {
      bestFor: buyerFitList(product.best_for),
      notFor: uniqueByText(product.not_for).slice(0, 4),
    },
    category: product.category,
    citations: buildCitations(product),
    evidence,
    image: {
      alt: product.name,
      src: safeProductImage(product),
    },
    nearMatch: buildNearMatch(product, displayMode),
    offer,
    ownerOpinion,
    pros,
    cons,
    quickSignals: buildQuickSignals(
      product,
      offer,
      evidence,
      ownerOpinion,
      tradeoff,
    ),
    recommendationReasons: buildReasons(product, evidence),
    rating,
    specs: buildSpecs(product, offer),
    summary: buildSummary(product),
    title: product.name,
    tradeoff,
  };
}

export const productCardViewModelTestExports = {
  bestVerifiedOffer,
  evidenceQuality,
  formatMoney,
};

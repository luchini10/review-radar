import type { ProductFieldEvidence } from "@/types/review-radar";

export type ProductImageConfidence = "high" | "medium" | "low" | "none";

export type ProductImageCandidateSource =
  | "existing"
  | "json_ld"
  | "metadata"
  | "page_image"
  | "serp"
  | "trusted_metadata";

export type ProductImageCandidate = {
  baseUrl?: string;
  evidenceText?: string;
  height?: number | null;
  source: ProductImageCandidateSource;
  url: string;
  width?: number | null;
};

export type ProductImageRejection = {
  reason: string;
  source: ProductImageCandidateSource;
  url: string;
};

export type ProductImageContext = {
  brand?: string | null;
  category?: string | null;
  modelNumber?: string | null;
  pageUrl?: string;
  productName: string;
};

export type ProductImageResolution = {
  confidence: ProductImageConfidence;
  rejected: ProductImageRejection[];
  source: ProductImageCandidateSource | null;
  url: string;
};

const IMAGE_EXTENSIONS = [".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"];
const PLACEHOLDER_TERMS = [
  "blank",
  "default-image",
  "favicon",
  "icon",
  "logo",
  "missing-image",
  "no-image",
  "placeholder",
  "pixel",
  "sprite",
  "spacer",
  "transparent",
];

const NON_PRODUCT_IMAGE_PATTERNS = [
  /\/images\/g\/01\/digital\/video\//i,
  /\/images\/g\/01\/amazonstores\//i,
  /\/images\/g\/01\/(?:advertising|marketing|merch)\//i,
  /(?:countdown|graphicalcountdown|primevideo|amazon-live)/i,
];

const IMAGE_PATH_TERMS = [
  "cdn",
  "image",
  "images",
  "img",
  "media",
  "photo",
  "photos",
  "product",
  "products",
  "static",
];

const SOURCE_PRIORITY: Record<ProductImageCandidateSource, number> = {
  existing: 600,
  serp: 560,
  trusted_metadata: 540,
  metadata: 520,
  json_ld: 500,
  page_image: 360,
};

function normalizeUrl(value: string, baseUrl = "") {
  if (!value) {
    return "";
  }

  try {
    const parsed = baseUrl ? new URL(value, baseUrl) : new URL(value);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }

    parsed.hash = "";

    for (const key of Array.from(parsed.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "ascsubtag" ||
        lowerKey === "camp" ||
        lowerKey === "creative" ||
        lowerKey === "creativeasin" ||
        lowerKey === "linkcode" ||
        lowerKey === "tag"
      ) {
        parsed.searchParams.delete(key);
      }
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productWords(value: string | null | undefined) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function compactProductWords(context: ProductImageContext) {
  return Array.from(
    new Set([
      ...productWords(context.productName),
      ...productWords(context.brand),
      ...productWords(context.modelNumber),
    ]),
  );
}

function categoryWords(context: ProductImageContext) {
  return productWords(context.category).filter((word) => word.length >= 4);
}

function textMatchesContext(text: string, context: ProductImageContext) {
  const normalized = normalizeText(text);
  const words = compactProductWords(context);
  const model = normalizeText(context.modelNumber);

  if (model && normalized.includes(model)) {
    return true;
  }

  if (words.length === 0) {
    return false;
  }

  const matches = words.filter((word) => normalized.includes(word)).length;

  return matches >= Math.min(2, words.length);
}

function weakTextMatchesContext(text: string, context: ProductImageContext) {
  const normalized = normalizeText(text);
  const productMatch = compactProductWords(context).some((word) =>
    normalized.includes(word),
  );
  const categoryMatch = categoryWords(context).some((word) =>
    normalized.includes(word),
  );

  return productMatch && categoryMatch;
}

function urlSearchText(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(`${parsed.hostname} ${parsed.pathname}`);
  } catch {
    return url;
  }
}

function urlHasImageExtension(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension));
  } catch {
    return false;
  }
}

const TRUSTED_IMAGE_HOST_SUFFIXES = [
  // Google Shopping/search thumbnails (e.g. encrypted-tbn0.gstatic.com/shopping?q=tbn:...)
  // are valid product images but have no extension or image-like path.
  "gstatic.com",
  "googleusercontent.com",
  "ggpht.com",
];

function isTrustedImageHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  return TRUSTED_IMAGE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function urlLooksImageLike(url: string) {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname).toLowerCase();
    const search = parsed.searchParams;

    return (
      urlHasImageExtension(url) ||
      isTrustedImageHost(parsed.hostname) ||
      IMAGE_PATH_TERMS.some((term) => path.includes(term)) ||
      search.has("format") ||
      search.has("width") ||
      search.has("w") ||
      search.has("height") ||
      search.has("h")
    );
  } catch {
    return false;
  }
}

function hasRejectedTerm(url: string) {
  const normalized = decodeURIComponent(url).toLowerCase();
  return PLACEHOLDER_TERMS.some((term) => normalized.includes(term));
}

function isKnownNonProductImage(url: string) {
  const decoded = decodeURIComponent(url);

  return NON_PRODUCT_IMAGE_PATTERNS.some((pattern) => pattern.test(decoded));
}

function dimensionFromUrl(url: string, names: string[]) {
  try {
    const parsed = new URL(url);

    for (const name of names) {
      const value = parsed.searchParams.get(name);
      const numeric = value ? Number.parseInt(value, 10) : null;

      if (numeric && Number.isFinite(numeric)) {
        return numeric;
      }
    }

    const text = decodeURIComponent(parsed.pathname);
    const pair =
      text.match(/(?:^|[-_])(\d{2,4})x(\d{2,4})(?:[-_.]|$)/i) ||
      text.match(/[?&](?:size|dimensions)=(\d{2,4})x(\d{2,4})/i);

    if (pair?.[1]) {
      return Number.parseInt(pair[1], 10);
    }
  } catch {
    return null;
  }

  return null;
}

function inferredDimensions(candidate: ProductImageCandidate, url: string) {
  return {
    height:
      candidate.height ??
      dimensionFromUrl(url, ["height", "h", "hei"]) ??
      null,
    width:
      candidate.width ??
      dimensionFromUrl(url, ["width", "w", "wid"]) ??
      null,
  };
}

function confidenceRank(confidence: ProductImageConfidence) {
  if (confidence === "high") {
    return 3;
  }

  if (confidence === "medium") {
    return 2;
  }

  if (confidence === "low") {
    return 1;
  }

  return 0;
}

function fieldConfidence(
  confidence: ProductImageConfidence,
): ProductFieldEvidence<string | null>["confidence"] {
  if (confidence === "high") {
    return "High";
  }

  if (confidence === "medium") {
    return "Medium";
  }

  return "Low";
}

function sourceType(
  source: ProductImageCandidateSource,
): ProductFieldEvidence<string | null>["sourceType"] {
  if (source === "json_ld") {
    return "json_ld";
  }

  if (source === "metadata" || source === "trusted_metadata") {
    return "open_graph";
  }

  if (source === "serp") {
    return "serper";
  }

  return "retailer_page";
}

function candidateConfidence(
  candidate: ProductImageCandidate,
  url: string,
  context: ProductImageContext,
): ProductImageConfidence {
  const evidence = `${candidate.evidenceText || ""} ${urlSearchText(url)}`;
  const strongMatch = textMatchesContext(evidence, context);
  const weakMatch = weakTextMatchesContext(evidence, context);

  if (
    candidate.source === "existing" ||
    candidate.source === "serp" ||
    candidate.source === "trusted_metadata"
  ) {
    return strongMatch || weakMatch ? "high" : "medium";
  }

  if (candidate.source === "metadata" || candidate.source === "json_ld") {
    return strongMatch || weakMatch ? "high" : "medium";
  }

  if (strongMatch) {
    return "medium";
  }

  return weakMatch ? "low" : "none";
}

export function validateProductImageCandidate(
  candidate: ProductImageCandidate,
  context: ProductImageContext,
):
  | { accepted: true; confidence: ProductImageConfidence; score: number; url: string }
  | { accepted: false; rejection: ProductImageRejection } {
  const url = normalizeUrl(candidate.url, candidate.baseUrl || context.pageUrl || "");

  if (!url) {
    return {
      accepted: false,
      rejection: {
        reason: "empty or invalid image URL",
        source: candidate.source,
        url: candidate.url,
      },
    };
  }

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.endsWith(".svg") || lowerUrl.includes(".svg?")) {
    return {
      accepted: false,
      rejection: { reason: "SVG/icon image URL", source: candidate.source, url },
    };
  }

  if (hasRejectedTerm(url)) {
    return {
      accepted: false,
      rejection: {
        reason: "placeholder, logo, icon, sprite, or tracking image URL",
        source: candidate.source,
        url,
      },
    };
  }

  if (isKnownNonProductImage(url)) {
    return {
      accepted: false,
      rejection: {
        reason: "retailer promo, store, or video artwork is not a product image",
        source: candidate.source,
        url,
      },
    };
  }

  if (!urlLooksImageLike(url)) {
    return {
      accepted: false,
      rejection: {
        reason: "URL does not look like a usable image",
        source: candidate.source,
        url,
      },
    };
  }

  const dimensions = inferredDimensions(candidate, url);

  if (
    (dimensions.width !== null && dimensions.width < 120) ||
    (dimensions.height !== null && dimensions.height < 120)
  ) {
    return {
      accepted: false,
      rejection: {
        reason: "image dimensions look too small for a product photo",
        source: candidate.source,
        url,
      },
    };
  }

  let confidence = candidateConfidence(candidate, url, context);

  if (new URL(url).protocol === "http:" && confidence === "high") {
    confidence = "medium";
  }

  if (confidence === "none" || confidence === "low") {
    return {
      accepted: false,
      rejection: {
        reason: "image did not strongly match the product",
        source: candidate.source,
        url,
      },
    };
  }

  return {
    accepted: true,
    confidence,
    score: SOURCE_PRIORITY[candidate.source] + confidenceRank(confidence),
    url,
  };
}

function attrMap(tag: string) {
  const attrs: Record<string, string> = {};

  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2]);
  }

  return attrs;
}

function firstSrcsetUrl(value: string) {
  const candidates = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [url, descriptor] = item.split(/\s+/);
      const width = descriptor?.endsWith("w")
        ? Number.parseInt(descriptor, 10)
        : 0;

      return { url, width };
    })
    .filter((item) => item.url)
    .sort((left, right) => right.width - left.width);

  return candidates[0]?.url || "";
}

function jsonLdScripts(html: string) {
  return Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  )
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (!isRecord(value)) {
    return [];
  }

  const graph = value["@graph"];
  const nested = Array.isArray(graph) ? graph.flatMap(flattenJsonLd) : [];

  return [value, ...nested];
}

function jsonLdTypeMatches(value: unknown, type: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonLdTypeMatches(item, type));
  }

  return typeof value === "string" && value.toLowerCase() === type.toLowerCase();
}

function imageValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(imageValues);
  }

  if (isRecord(value)) {
    return imageValues(value.url || value.contentUrl);
  }

  return [];
}

function getMetaContent(html: string, property: string) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

export function extractProductImageCandidatesFromHtml(
  html: string,
  pageUrl: string,
  context: ProductImageContext,
): ProductImageCandidate[] {
  const candidates: ProductImageCandidate[] = [];
  const metaImages = [
    getMetaContent(html, "og:image"),
    getMetaContent(html, "og:image:secure_url"),
    getMetaContent(html, "twitter:image"),
    getMetaContent(html, "twitter:image:src"),
  ].filter(Boolean);

  for (const image of metaImages) {
    candidates.push({
      baseUrl: pageUrl,
      evidenceText: context.productName,
      source: "metadata",
      url: image,
    });
  }

  for (const script of jsonLdScripts(html)) {
    try {
      const parsed = JSON.parse(decodeHtml(script));
      const products = flattenJsonLd(parsed).filter((item) =>
        jsonLdTypeMatches(item["@type"], "Product"),
      );

      for (const product of products) {
        const evidenceText = [
          typeof product.name === "string" ? product.name : "",
          context.productName,
        ]
          .filter(Boolean)
          .join(" ");

        for (const image of imageValues(product.image)) {
          candidates.push({
            baseUrl: pageUrl,
            evidenceText,
            source: "json_ld",
            url: image,
          });
        }
      }
    } catch {
      // Ignore malformed structured data.
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attrMap(match[0]);
    const src =
      attrs.src ||
      attrs["data-src"] ||
      attrs["data-original"] ||
      attrs["data-image"] ||
      firstSrcsetUrl(attrs.srcset || attrs["data-srcset"] || "");

    if (!src) {
      continue;
    }

    candidates.push({
      baseUrl: pageUrl,
      evidenceText: [
        attrs.alt,
        attrs.title,
        attrs["aria-label"],
        attrs.class,
        attrs.id,
      ]
        .filter(Boolean)
        .join(" "),
      height: attrs.height ? Number.parseInt(attrs.height, 10) : null,
      source: "page_image",
      url: src,
      width: attrs.width ? Number.parseInt(attrs.width, 10) : null,
    });
  }

  return candidates;
}

function safeUrlForLog(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return "";
  }
}

export function logImageResolutionDebug(
  productName: string,
  resolution: ProductImageResolution,
) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.REVIEW_RADAR_DEBUG_LOGS !== "true"
  ) {
    return;
  }

  console.info("[ReviewRadar image resolver]", {
    confidence: resolution.confidence,
    productName,
    rejected: resolution.rejected.map((item) => ({
      reason: item.reason,
      source: item.source,
      url: safeUrlForLog(item.url),
    })),
    source: resolution.source,
    url: resolution.url ? safeUrlForLog(resolution.url) : "",
  });
}

export function resolveBestProductImage(
  candidates: ProductImageCandidate[],
  context: ProductImageContext,
): ProductImageResolution {
  const rejected: ProductImageRejection[] = [];
  const accepted = candidates.flatMap((candidate) => {
    const result = validateProductImageCandidate(candidate, context);

    if (!result.accepted) {
      rejected.push(result.rejection);
      return [];
    }

    return [
      {
        confidence: result.confidence,
        score: result.score,
        source: candidate.source,
        url: result.url,
      },
    ];
  });
  const best = accepted.sort((left, right) => right.score - left.score)[0];

  if (!best) {
    return {
      confidence: "none",
      rejected,
      source: null,
      url: "",
    };
  }

  return {
    confidence: best.confidence,
    rejected,
    source: best.source,
    url: best.url,
  };
}

export function imageResolutionToField(
  resolution: ProductImageResolution,
  fallbackSourceUrl: string,
): ProductFieldEvidence<string | null> | undefined {
  if (!resolution.url || resolution.confidence === "none") {
    return undefined;
  }

  return {
    confidence: fieldConfidence(resolution.confidence),
    sourceType: sourceType(resolution.source || "page_image"),
    sourceUrl: fallbackSourceUrl,
    value: resolution.url,
    verifiedAt: new Date().toISOString(),
  };
}

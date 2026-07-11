import type { ProductFieldEvidence } from "@/types/review-radar";
import { SOURCE_NAME_TOKENS } from "./search/sourceTier.ts";

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
  contextVerified?: boolean;
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
const PAGE_EXTENSIONS = [".aspx", ".htm", ".html", ".php"];
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
  "static",
];

const NON_PRODUCT_IDENTITY_WORDS = new Set([
  "com",
  "http",
  "https",
  "marketplace",
  "retailer",
  "store",
  "www",
]);

// RR-061 (wrong-model imagery): tokens that look like model identifiers but are
// CDN/image-pipeline artifacts. An image filename may only veto a product match
// when its model-shaped tokens are real identity claims, so size markers,
// Amazon image modifiers (_AC_SL1500_), retina suffixes (@2x), camera/file
// counters, version markers, and unit measurements are all exempt.
const MODEL_TOKEN_EXCLUSIONS = [
  /^v\d+$/,
  /^\d+x\d*$/,
  /^x\d+$/,
  /^[wh]\d+$/,
  /^(?:ac|br|cb|cr|fm|pj|pt|ql|qu|ri|sl|sr|ss|sx|sy|ul|ux|uy)\d{2,5}$/,
  /^(?:alt|angle|banner|dsc|frame|gallery|image|img|item|page|photo|pic|slide|step|thumb|thumbnail|view)\d+$/,
  /^\d+(?:bit|cc|cm|dpi|ft|g|gal|gallon|gb|hp|hz|in|inch|k|kg|l|lb|lbs|mah|mb|ml|mm|mp|oz|p|pc|pcs|pk|px|qt|tb|v|w|wh)$/,
];

// Words that describe an image rather than a product family. These exclusions
// keep split filename pairs such as `front_2` and `black_20` from becoming
// model claims while allowing unfamiliar family names without a brand list.
const GENERIC_IMAGE_FILENAME_WORDS = new Set([
  "alt",
  "angle",
  "back",
  "banner",
  "black",
  "bedroom",
  "blue",
  "bottom",
  "box",
  "brown",
  "bundle",
  "carpet",
  "carton",
  "closeup",
  "color",
  "colour",
  "count",
  "centimeter",
  "centimeters",
  "dark",
  "detail",
  "demo",
  "desktop",
  "display",
  "floor",
  "front",
  "foot",
  "feet",
  "gallon",
  "gallons",
  "gallery",
  "gray",
  "green",
  "grey",
  "grid",
  "hero",
  "image",
  "img",
  "inch",
  "inches",
  "item",
  "kit",
  "kilogram",
  "kilograms",
  "kitchen",
  "landscape",
  "large",
  "left",
  "lifestyle",
  "liter",
  "liters",
  "litre",
  "litres",
  "living",
  "main",
  "model",
  "millimeter",
  "millimeters",
  "orange",
  "open",
  "option",
  "ounce",
  "ounces",
  "pack",
  "package",
  "photo",
  "pic",
  "product",
  "portrait",
  "position",
  "pound",
  "pounds",
  "quart",
  "quarts",
  "rear",
  "red",
  "right",
  "room",
  "scene",
  "shot",
  "side",
  "silver",
  "slide",
  "small",
  "step",
  "set",
  "studio",
  "style",
  "swatch",
  "thumb",
  "thumbnail",
  "top",
  "tile",
  "unit",
  "units",
  "view",
  "variant",
  "white",
  "yellow",
  "zoom",
]);

const HARD_NON_PRODUCT_ASSET_PATTERN =
  /(?:^|[-_/])(?:article|badge|banner|blog|category|collection|departments?|favicon|flyouts?|icon|layouts?|logo|manual|masthead|menus?|navigation|nav|rating|review|social|sprite|stars?|support|top-nav|tracking|wordmark)(?:[-_/.]|$)/i;
const SOFT_NON_PRODUCT_ASSET_PATTERN =
  /(?:^|[-_/])hero(?:[-_/.]|$)/i;

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
    .filter(
      (word) =>
        word.length >= 3 &&
        !NON_PRODUCT_IDENTITY_WORDS.has(word) &&
        !SOURCE_NAME_TOKENS.has(word),
    );
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
    return decodeURIComponent(parsed.pathname);
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

function urlHasPageExtension(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return PAGE_EXTENSIONS.some((extension) => path.endsWith(extension));
  } catch {
    return false;
  }
}

function urlEndsAtImageDirectory(url: string) {
  try {
    const path = decodeURIComponent(new URL(url).pathname)
      .toLowerCase()
      .replace(/\/+$/, "");
    const finalSegment = path.split("/").filter(Boolean).at(-1) || "";

    return [
      "assets",
      "image",
      "images",
      "img",
      "media",
      "photo",
      "photos",
      "productimage",
      "productimages",
    ].includes(finalSegment);
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

function urlLooksImageLike(url: string, contextVerified = false) {
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
      search.has("h") ||
      (contextVerified && Boolean(path.split("/").filter(Boolean).at(-1)))
    );
  } catch {
    return false;
  }
}

// A malformed URL (a bad "%" escape) makes decodeURIComponent throw URIError,
// which previously crashed the whole request (HTTP 502) from deep in enrichment.
// Decode defensively and fall back to the raw string.
function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasRejectedTerm(url: string) {
  const normalized = safeDecodeURIComponent(url).toLowerCase();
  return PLACEHOLDER_TERMS.some((term) => normalized.includes(term));
}

function isKnownNonProductImage(url: string) {
  const decoded = safeDecodeURIComponent(url);

  return NON_PRODUCT_IMAGE_PATTERNS.some((pattern) => pattern.test(decoded));
}

function nonProductAssetReason(
  candidate: ProductImageCandidate,
  url: string,
  context: ProductImageContext,
) {
  const decodedPath = safeDecodeURIComponent(new URL(url).pathname);

  if (HARD_NON_PRODUCT_ASSET_PATTERN.test(decodedPath)) {
    return "generic navigation, category, editorial, logo, or UI artwork";
  }

  if (
    SOFT_NON_PRODUCT_ASSET_PATTERN.test(decodedPath) &&
    !(
      candidate.contextVerified &&
      textMatchesContext(candidate.evidenceText || "", context)
    )
  ) {
    return "generic hero artwork is not tied to the product";
  }

  return "";
}

function modelIdentityTokens(text: string) {
  const tokens = new Set<string>();

  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (
      raw.length < 2 ||
      raw.length > 8 ||
      !/[a-z]/.test(raw) ||
      !/\d/.test(raw) ||
      MODEL_TOKEN_EXCLUSIONS.some((pattern) => pattern.test(raw))
    ) {
      continue;
    }

    tokens.add(raw);
  }

  return Array.from(tokens);
}

function filenameIdentityParts(filename: string) {
  return filename
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function nonFamilyFilenameWords(context: ProductImageContext) {
  return new Set([
    ...GENERIC_IMAGE_FILENAME_WORDS,
    ...NON_PRODUCT_IDENTITY_WORDS,
    ...SOURCE_NAME_TOKENS,
    ...productWords(context.brand),
    ...categoryWords(context),
  ]);
}

function splitModelIdentityClaims(
  parts: string[],
  context: ProductImageContext,
) {
  const claims = new Map<string, { token: string; word: string }>();
  const excludedWords = nonFamilyFilenameWords(context);

  for (let index = 0; index < parts.length - 1; index += 1) {
    const left = parts[index] || "";
    const right = parts[index + 1] || "";
    const word = /^[a-z]{3,16}$/.test(left)
      ? left
      : /^[a-z]{3,16}$/.test(right)
        ? right
        : "";
    const number = /^\d{1,4}$/.test(left)
      ? left
      : /^\d{1,4}$/.test(right)
        ? right
        : "";

    if (word && number && !excludedWords.has(word)) {
      const token = `${word}${number}`;
      claims.set(token, { token, word });
    }
  }

  return Array.from(claims.values());
}

function repeatedFamilyIdentityTokens(
  parts: string[],
  context: ProductImageContext,
) {
  const counts = new Map<string, number>();
  const excludedWords = nonFamilyFilenameWords(context);

  for (const part of parts) {
    if (!/^[a-z]{4,16}$/.test(part) || excludedWords.has(part)) {
      continue;
    }

    counts.set(part, (counts.get(part) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([token]) => token);
}

function mixedModelFamilyWords(
  parts: string[],
  context: ProductImageContext,
) {
  const words = new Set<string>();
  const excludedWords = nonFamilyFilenameWords(context);

  for (let index = 0; index < parts.length - 1; index += 1) {
    const family = parts[index] || "";
    const model = parts[index + 1] || "";

    if (
      /^[a-z]{3,16}$/.test(family) &&
      !excludedWords.has(family) &&
      modelIdentityTokens(model).length > 0
    ) {
      words.add(family);
    }
  }

  return words;
}

// RR-061 (wrong-model imagery): a filename that explicitly identifies a
// different model must veto the image even on an identity-verified product
// page — live evidence showed Saros Z70 artwork rendering on a Roborock
// Q5 Max+ card because page context outweighed the conflicting model in the
// image path. The guard only arms when the product itself carries model-shaped
// identity, and any filename token compatible with the product clears it, so
// products without model identifiers and multi-model comparison shots stay
// fail-safe.
function conflictingModelIdentityReason(
  url: string,
  context: ProductImageContext,
) {
  const identityText = [context.productName, context.brand, context.modelNumber]
    .filter(Boolean)
    .join(" ");
  const identityParts = identityText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const targetSplitClaims = splitModelIdentityClaims(identityParts, context);
  const targetMixedModelFamilies = mixedModelFamilyWords(
    identityParts,
    context,
  );

  if (
    modelIdentityTokens(identityText).length === 0 &&
    targetSplitClaims.length === 0
  ) {
    return "";
  }

  let filename = "";

  try {
    filename =
      safeDecodeURIComponent(new URL(url).pathname)
        .split("/")
        .filter(Boolean)
        .at(-1) || "";
  } catch {
    return "";
  }

  const filenameParts = filenameIdentityParts(filename);
  const mixedImageTokens = modelIdentityTokens(filenameParts.join(" "));
  const splitImageClaims = splitModelIdentityClaims(filenameParts, context);
  const repeatedFamilyTokens = repeatedFamilyIdentityTokens(
    filenameParts,
    context,
  );

  const identityCompact = identityText.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const identityWords = new Set(
    identityParts.filter((part) => /^[a-z]+$/.test(part)),
  );
  const imageTokens = [
    ...mixedImageTokens,
    ...splitImageClaims.map((claim) => claim.token),
  ];

  if (imageTokens.some((token) => identityCompact.includes(token))) {
    return "";
  }

  const foreignSplitTokens = splitImageClaims
    .filter((claim) => {
      const targetClaimsSameFamily = targetSplitClaims.some(
        (targetClaim) => targetClaim.word === claim.word,
      );

      // A family word already present in the target may be followed by a
      // non-model number such as a size. Treat it as conflicting only when the
      // target itself asserts a different word-number family identity.
      return (
        !identityWords.has(claim.word) ||
        targetClaimsSameFamily ||
        targetMixedModelFamilies.has(claim.word)
      );
    })
    .map((claim) => claim.token);

  const foreignTokens = [
    ...mixedImageTokens,
    ...foreignSplitTokens,
    ...repeatedFamilyTokens.filter(
      (token) => !identityCompact.includes(token),
    ),
  ];

  if (foreignTokens.length === 0) {
    return "";
  }

  return `image filename identifies a different model (${Array.from(new Set(foreignTokens)).join(", ")})`;
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

  if (candidate.contextVerified) {
    return strongMatch || weakMatch ? "high" : "medium";
  }

  if (
    candidate.source === "existing" ||
    candidate.source === "serp" ||
    candidate.source === "trusted_metadata"
  ) {
    return strongMatch || weakMatch ? "high" : "none";
  }

  if (candidate.source === "metadata" || candidate.source === "json_ld") {
    return strongMatch || weakMatch ? "high" : "none";
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

  if (urlHasPageExtension(url)) {
    return {
      accepted: false,
      rejection: {
        reason: "HTML or page URL cannot be used as a product image",
        source: candidate.source,
        url,
      },
    };
  }

  if (urlEndsAtImageDirectory(url)) {
    return {
      accepted: false,
      rejection: {
        reason: "image URL points to a directory rather than an asset",
        source: candidate.source,
        url,
      },
    };
  }

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

  const genericAssetReason = nonProductAssetReason(candidate, url, context);

  if (genericAssetReason) {
    return {
      accepted: false,
      rejection: {
        reason: genericAssetReason,
        source: candidate.source,
        url,
      },
    };
  }

  const modelConflictReason = conflictingModelIdentityReason(url, context);

  if (modelConflictReason) {
    return {
      accepted: false,
      rejection: {
        reason: modelConflictReason,
        source: candidate.source,
        url,
      },
    };
  }

  if (!urlLooksImageLike(url, candidate.contextVerified)) {
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
  options: { pageIdentityVerified?: boolean } = {},
): ProductImageCandidate[] {
  const candidates: ProductImageCandidate[] = [];
  const pageIdentityText = [
    getMetaContent(html, "og:title"),
    getMetaContent(html, "twitter:title"),
    stripHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""),
    stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ""),
  ]
    .filter(Boolean)
    .join(" ");
  const pageIdentityVerified =
    Boolean(options.pageIdentityVerified) ||
    textMatchesContext(pageIdentityText, context);
  const metaImages = [
    getMetaContent(html, "og:image"),
    getMetaContent(html, "og:image:secure_url"),
    getMetaContent(html, "twitter:image"),
    getMetaContent(html, "twitter:image:src"),
  ].filter(Boolean);

  for (const image of metaImages) {
    candidates.push({
      baseUrl: pageUrl,
      contextVerified: pageIdentityVerified,
      evidenceText: pageIdentityText,
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
        const evidenceText =
          typeof product.name === "string" ? product.name : "";

        if (!textMatchesContext(evidenceText, context)) {
          continue;
        }

        for (const image of imageValues(product.image)) {
          candidates.push({
            baseUrl: pageUrl,
            contextVerified: true,
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
      // A matching page establishes the page's identity, not every image's.
      // Page images must carry their own product evidence in attributes/path.
      contextVerified: false,
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

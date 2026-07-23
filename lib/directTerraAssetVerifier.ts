import {
  brandEvidenceMatches,
  canonicalBrand,
  detectKnownBrands,
} from "./brandMatching.ts";
import { classifyProductEligibility } from "./productEligibility.ts";
import { validateProductImageCandidate } from "./productImageResolver.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import {
  haveConflictingCompoundModelSequences,
  strongModelTokens,
} from "./productIdentity.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";
import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";
import {
  directTerraModelInUrlPath,
  isDirectTerraManufacturerHost,
} from "./directTerraLinkPreference.ts";

export const DIRECT_TERRA_ASSET_VERIFIER_VERSION =
  "direct-terra-asset-verifier-v2";

export type DirectTerraAssetTarget = {
  key: string;
  rank: number;
  productName: string;
  brand: string;
  model: string;
  category: string;
};

export type DirectTerraAssetCandidate = {
  title?: unknown;
  productUrl?: unknown;
  imageUrl?: unknown;
  imageSource?: unknown;
  snippet?: unknown;
};

export type DirectTerraAssetDecision = {
  candidateIndex: number;
  title: string;
  identityAccepted: boolean;
  identityReason:
    | "accepted_exact_identity"
    | "accepted_manufacturer_slug_identity"
    | "missing_title"
    | "brand_not_in_title"
    | "invalid_target_identity"
    | "model_not_in_title"
    | "model_conflict_in_title"
    | "weak_target_identity"
    | "wrong_product_type";
  productUrlAccepted: boolean;
  productUrlReason:
    | "accepted_identity_safe"
    | "identity_not_safe"
    | "missing_or_invalid_product_url"
    | "unsafe_product_url_host"
    | "product_url_redirect_wrapper"
    | "product_url_ineligible"
    | "product_url_identity_mismatch";
  imageUrlAccepted: boolean;
  imageUrlReason: string;
  productUrl: string | null;
  imageUrl: string | null;
};

export type DirectTerraAssetVerification = {
  verifierVersion: typeof DIRECT_TERRA_ASSET_VERIFIER_VERSION;
  targetKey: string;
  rank: number;
  productName: string;
  productUrl: string | null;
  imageUrl: string | null;
  productUrlStatus: "accepted_identity_safe" | "unavailable";
  imageUrlStatus: "accepted_identity_safe" | "unavailable";
  decisions: DirectTerraAssetDecision[];
};

function asText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizedIdentityTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .match(/[a-z0-9]+/g) || [];
}

function targetModelTokens(model: string) {
  const tokens = normalizedIdentityTokens(model);
  const hasNumericIdentity = tokens.some((token) => /\d/.test(token));

  return tokens.filter((token) =>
    hasNumericIdentity
      ? token.length >= 2
      : token.length >= 3,
  );
}

function titleContainsEveryModelToken(title: string, model: string) {
  const required = targetModelTokens(model);
  if (required.length === 0) return false;
  const titleTokens = new Set(normalizedIdentityTokens(title));
  return required.every((token) => titleTokens.has(token));
}

function titleHasConflictingModel(targetModel: string, title: string) {
  if (haveConflictingCompoundModelSequences(targetModel, title)) return true;

  const identityModels = (value: string) =>
    new Set(
      [...strongModelTokens(value)].filter(
        (model) => !DIRECT_TERRA_MEASUREMENT_MODEL.test(model),
      ),
    );
  const targetModels = identityModels(targetModel);
  const titleModels = identityModels(title);
  return (
    targetModels.size > 0 &&
    [...titleModels].some((model) => !targetModels.has(model))
  );
}

function canonicalHttpUrl(value: unknown) {
  const text = asText(value, 4_096);
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return normalizeTwoLayerSourceUrl(parsed.toString());
  } catch {
    return null;
  }
}

function unsafeNetworkHost(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const unbracketedHost = host.replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) ||
    unbracketedHost.includes(":")
  );
}

function unsafeProductHost(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  return (
    unsafeNetworkHost(url) ||
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "googleusercontent.com" ||
    host.endsWith(".googleusercontent.com") ||
    host === "gstatic.com" ||
    host.endsWith(".gstatic.com")
  );
}

const REDIRECT_HOSTS = [
  "anrdoezrs.net",
  "awin1.com",
  "clickserve.dartsearch.net",
  "dpbolvw.net",
  "jdoqocy.com",
  "kqzyfj.com",
  "linksynergy.com",
  "rakutenadvertising.com",
  "shareasale.com",
  "skimresources.com",
  "tkqlhce.com",
];

function isRedirectWrapper(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    REDIRECT_HOSTS.some(
      (redirectHost) =>
        host === redirectHost || host.endsWith(`.${redirectHost}`),
    )
  ) {
    return true;
  }

  return /(?:^|\/)(?:click|deeplink|out|redirect|redirector|track|tracking)(?:\/|$)/i.test(
    parsed.pathname,
  );
}

function compactIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const DIRECT_TERRA_MEASUREMENT_MODEL = /^\d+(?:amp|amps|bit|btu|burner|burners|cc|cfm|cm|cup|cups|db|door|doors|dpi|drawer|drawers|ft|gal|gallon|gallons|gb|hp|hz|in|inch|inches|k|kg|l|lb|lbs|mah|mb|ml|mm|mp|oz|p|pc|pcs|piece|pieces|pk|psi|px|qt|speed|speeds|stage|stages|tb|tier|tiers|v|volt|volts|w|watt|watts|wh|zone|zones)$/i;
const DIRECT_TERRA_DATE_MODEL = /^(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\d|3[01]))?$/;
const DIRECT_TERRA_NUMERIC_COMPOUND_MODEL = /^\d{2,}(?:[-/]\d{2,})+$/;
const DIRECT_TERRA_NON_MODEL_TECHNOLOGY = /^(?:ddr|gen|hdmi|hdr|ips|oled|qled|series|uhd|usb|wifi)\d+[a-z]*$/i;
const DIRECT_TERRA_GENERIC_LEADING_WORDS = new Set([
  "best",
  "latest",
  "new",
  "official",
  "our",
  "recommended",
  "top",
]);

export function directTerraStrongModelToken(value: string) {
  const compact = compactIdentity(value);
  if (
    !compact ||
    compact.length > 24 ||
    /^\d{4}$/.test(compact) ||
    DIRECT_TERRA_DATE_MODEL.test(value) ||
    DIRECT_TERRA_MEASUREMENT_MODEL.test(compact)
  ) {
    return false;
  }
  return (
    (compact.length >= 4 &&
      /[a-z]/.test(compact) &&
      /\d/.test(compact) &&
      !DIRECT_TERRA_NON_MODEL_TECHNOLOGY.test(compact)) ||
    DIRECT_TERRA_NUMERIC_COMPOUND_MODEL.test(value)
  );
}

export function extractDirectTerraHeadingIdentity(productName: string) {
  const tokens =
    productName.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [];
  const modelIndex = tokens.findIndex(
    (token, index) => index > 0 && directTerraStrongModelToken(token),
  );
  if (modelIndex < 1) return null;

  const prefixTokens = tokens.slice(0, modelIndex);
  while (
    prefixTokens.length > 1 &&
    DIRECT_TERRA_GENERIC_LEADING_WORDS.has(prefixTokens[0].toLowerCase())
  ) {
    prefixTokens.shift();
  }
  const detectedBrands = detectKnownBrands(prefixTokens.join(" "));
  const fallbackBrand = prefixTokens[0];
  const brand = detectedBrands.length === 1 ? detectedBrands[0] : fallbackBrand;
  if (!brand || /\d/.test(brand)) return null;

  // Compound model capture: a mixed alphanumeric model followed by a bare
  // 3-6 digit block is one identity ("VFB511B 0202"), not a foreign sibling.
  // Years and measurement-shaped suffixes never join, so "HD1640, 16-Gallon"
  // and "… 2024" keep their single-token model.
  let model = tokens[modelIndex];
  const suffix = tokens[modelIndex + 1];
  if (
    suffix &&
    /[a-z]/i.test(model) &&
    /\d/.test(model) &&
    /^\d{3,6}$/.test(suffix) &&
    !/^(?:19|20)\d{2}$/.test(suffix) &&
    !DIRECT_TERRA_MEASUREMENT_MODEL.test(compactIdentity(suffix))
  ) {
    model = `${model} ${suffix}`;
  }
  return { brand, model };
}

export function directTerraAssetIdentitiesAgree(
  left: { brand: string; model: string },
  right: { brand: string; model: string },
) {
  return (
    compactIdentity(canonicalBrand(left.brand)) ===
      compactIdentity(canonicalBrand(right.brand)) &&
    compactIdentity(left.model) === compactIdentity(right.model)
  );
}

export function directTerraAssetTargetIsCoherent(
  target: DirectTerraAssetTarget,
) {
  if (
    !target.key.trim() ||
    !Number.isInteger(target.rank) ||
    target.rank < 1 ||
    !target.productName.trim() ||
    !target.brand.trim() ||
    !target.model.trim() ||
    !target.category.trim()
  ) {
    return false;
  }

  if (!brandEvidenceMatches(target.productName, target.brand)) return false;
  if (!titleContainsEveryModelToken(target.productName, target.model)) return false;
  if (titleHasConflictingModel(target.model, target.productName)) return false;

  return classifyProductTypeMatch({
    evidenceText: target.productName,
    identityText: target.productName,
    requestedCategory: target.category,
  }).canBeExactMatch;
}

function identityDecision(
  target: DirectTerraAssetTarget,
  title: string,
): Pick<DirectTerraAssetDecision, "identityAccepted" | "identityReason"> {
  if (!directTerraAssetTargetIsCoherent(target)) {
    return { identityAccepted: false, identityReason: "invalid_target_identity" };
  }

  if (!title) {
    return { identityAccepted: false, identityReason: "missing_title" };
  }

  if (targetModelTokens(target.model).length === 0) {
    return { identityAccepted: false, identityReason: "weak_target_identity" };
  }

  if (!brandEvidenceMatches(title, target.brand)) {
    return { identityAccepted: false, identityReason: "brand_not_in_title" };
  }

  if (!titleContainsEveryModelToken(title, target.model)) {
    return { identityAccepted: false, identityReason: "model_not_in_title" };
  }

  if (titleHasConflictingModel(target.model, title)) {
    return { identityAccepted: false, identityReason: "model_conflict_in_title" };
  }

  const typeMatch = classifyProductTypeMatch({
    evidenceText: title,
    identityText: title,
    requestedCategory: target.category,
  });

  if (!typeMatch.canBeExactMatch) {
    return { identityAccepted: false, identityReason: "wrong_product_type" };
  }

  return { identityAccepted: true, identityReason: "accepted_exact_identity" };
}

// Manufacturer product pages routinely omit the SKU from the page TITLE while
// carrying it exactly in the URL slug (milwaukeetool.com/products/0910-20 is
// titled "M18 FUEL NEXUS 6 Gallon Wet/Dry Vacuum"). When — and only when —
// the title's sole identity failure is the missing model, a strictly
// brand-owned host whose path carries the exact model (and no conflicting
// one) may stand in for title-model evidence. The title must still prove the
// brand, carry no conflicting model, and pass the product-type gate, and the
// candidate still faces the eligibility and page-identity gates afterward —
// so accessory titles, foreign-brand hosts, and sibling-model paths all
// remain rejected. This deliberately does NOT apply to retailers, whose
// catalogs host every sibling model on look-alike paths.
function manufacturerSlugIdentity(
  target: DirectTerraAssetTarget,
  title: string,
  candidateUrl: string | null,
) {
  if (!candidateUrl) return false;
  try {
    const pathText = decodeURIComponent(new URL(candidateUrl).pathname)
      .replace(/[-_/.+]+/g, " ")
      .trim();
    return (
      isDirectTerraManufacturerHost(candidateUrl, target.brand) &&
      directTerraModelInUrlPath(candidateUrl, target.model) &&
      !titleHasConflictingModel(target.model, pathText) &&
      brandEvidenceMatches(title, target.brand) &&
      !titleHasConflictingModel(target.model, title) &&
      classifyProductTypeMatch({
        evidenceText: title,
        identityText: title,
        requestedCategory: target.category,
      }).canBeExactMatch
    );
  } catch {
    return false;
  }
}

function evaluateCandidate(
  target: DirectTerraAssetTarget,
  candidate: DirectTerraAssetCandidate,
  candidateIndex: number,
): DirectTerraAssetDecision {
  const title = asText(candidate.title, 300);
  let identity: Pick<
    DirectTerraAssetDecision,
    "identityAccepted" | "identityReason"
  > = identityDecision(target, title);
  if (
    !identity.identityAccepted &&
    identity.identityReason === "model_not_in_title" &&
    manufacturerSlugIdentity(target, title, canonicalHttpUrl(candidate.productUrl))
  ) {
    identity = {
      identityAccepted: true,
      identityReason: "accepted_manufacturer_slug_identity",
    };
  }
  const base = {
    candidateIndex,
    title,
    ...identity,
  };

  if (!identity.identityAccepted) {
    return {
      ...base,
      productUrlAccepted: false,
      productUrlReason: "identity_not_safe",
      imageUrlAccepted: false,
      imageUrlReason: "identity_not_safe",
      productUrl: null,
      imageUrl: null,
    };
  }

  const productUrl = canonicalHttpUrl(candidate.productUrl);
  let safeProductUrl: string | null = null;
  let productUrlReason: DirectTerraAssetDecision["productUrlReason"] =
    "missing_or_invalid_product_url";

  if (productUrl && isRedirectWrapper(productUrl)) {
    productUrlReason = "product_url_redirect_wrapper";
  } else if (productUrl && unsafeProductHost(productUrl)) {
    productUrlReason = "unsafe_product_url_host";
  } else if (productUrl) {
    const eligibility = classifyProductEligibility({
      brand: target.brand,
      category: target.category,
      name: title,
      productName: target.productName,
      snippet: asText(candidate.snippet, 800),
      sourceTitle: title,
      sourceType: "serper",
      url: productUrl,
    });

    if (!eligibility.canRenderAsProductCard) {
      productUrlReason = "product_url_ineligible";
    } else if (
      !productPageMatchesIdentity({
        brand: target.brand,
        model: target.model,
        pageTitle: title,
        pageUrl: productUrl,
        productName: target.productName,
      })
    ) {
      productUrlReason = "product_url_identity_mismatch";
    } else {
      safeProductUrl = productUrl;
      productUrlReason = "accepted_identity_safe";
    }
  }

  const rawImageUrl = asText(candidate.imageUrl, 4_096);
  if (!rawImageUrl) {
    return {
      ...base,
      productUrlAccepted: Boolean(safeProductUrl),
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "missing_image_url",
      productUrl: safeProductUrl,
      imageUrl: null,
    };
  }

  const parsedImageUrl = canonicalHttpUrl(rawImageUrl);
  if (!parsedImageUrl || unsafeNetworkHost(parsedImageUrl)) {
    return {
      ...base,
      productUrlAccepted: Boolean(safeProductUrl),
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "unsafe_image_url_host",
      productUrl: safeProductUrl,
      imageUrl: null,
    };
  }

  // A Shopping image may be useful even when that provider row exposes no
  // direct merchant URL (for example, when Serper returns only a Google
  // wrapper that the adapter deliberately discards). A present-but-unsafe
  // direct URL is different: it is conflicting evidence from the same row and
  // must continue to poison the image rather than letting a wrong-model page
  // lend its thumbnail to the locked Terra product.
  const productUrlWasSupplied = Boolean(asText(candidate.productUrl, 4_096));
  if (productUrlWasSupplied && !safeProductUrl) {
    return {
      ...base,
      productUrlAccepted: false,
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "candidate_product_url_not_safe",
      productUrl: null,
      imageUrl: null,
    };
  }

  if (!safeProductUrl && candidate.imageSource !== "serper_shopping") {
    return {
      ...base,
      productUrlAccepted: false,
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "image_source_not_trusted",
      productUrl: null,
      imageUrl: null,
    };
  }

  const image = validateProductImageCandidate(
    {
      evidenceText: title,
      source: "serp",
      url: parsedImageUrl,
    },
    {
      brand: target.brand,
      category: target.category,
      modelNumber: target.model,
      pageUrl: safeProductUrl || undefined,
      productName: target.productName,
    },
  );

  if (!image.accepted) {
    return {
      ...base,
      productUrlAccepted: Boolean(safeProductUrl),
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: image.rejection.reason,
      productUrl: safeProductUrl,
      imageUrl: null,
    };
  }

  return {
    ...base,
    productUrlAccepted: Boolean(safeProductUrl),
    productUrlReason,
    imageUrlAccepted: true,
    imageUrlReason: "accepted_identity_safe",
    productUrl: safeProductUrl,
    imageUrl: image.url,
  };
}

export function verifyDirectTerraAssetCandidates(input: {
  target: DirectTerraAssetTarget;
  candidates: DirectTerraAssetCandidate[];
}): DirectTerraAssetVerification {
  const decisions = input.candidates.map((candidate, candidateIndex) =>
    evaluateCandidate(input.target, candidate, candidateIndex),
  );
  const productUrl =
    decisions.find((decision) => decision.productUrlAccepted)?.productUrl || null;
  const imageUrl =
    decisions.find((decision) => decision.imageUrlAccepted)?.imageUrl || null;

  return {
    verifierVersion: DIRECT_TERRA_ASSET_VERIFIER_VERSION,
    targetKey: input.target.key,
    rank: input.target.rank,
    productName: input.target.productName,
    productUrl,
    imageUrl,
    productUrlStatus: productUrl ? "accepted_identity_safe" : "unavailable",
    imageUrlStatus: imageUrl ? "accepted_identity_safe" : "unavailable",
    decisions,
  };
}

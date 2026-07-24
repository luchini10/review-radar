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
import { classifyDirectTerraLinkHost } from "./directTerraLinkPreference.ts";

export const DIRECT_TERRA_ASSET_VERIFIER_VERSION =
  "direct-terra-asset-verifier-v4";

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
    | "product_url_type_conflict"
    | "product_url_descriptive_identity_conflict"
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

// The identifying core of a model is its digit-bearing tokens; a trailing
// pure-alpha trim suffix (DXV12P-"QT", the "quiet" trim) is how one core
// vacuum is bundled/branded, and retailers routinely drop it (they list
// "DXV12P"). For a BUY LINK to the right product we require the digit-bearing
// core and treat the alpha trim as optional. Alpha-only models keep every
// token; this only relaxes models that actually have a numeric core.
function modelCoreTokens(model: string) {
  const tokens = targetModelTokens(model);
  const digitTokens = tokens.filter((token) => /\d/.test(token));
  return digitTokens.length > 0 ? digitTokens : tokens;
}

function titleContainsEveryModelToken(title: string, model: string) {
  const required = modelCoreTokens(model);
  if (required.length === 0) return false;
  const titleTokens = new Set(normalizedIdentityTokens(title));
  return required.every((token) => titleTokens.has(token));
}

// Two compact model strings describe the same product when they share the same
// numeric core and differ only by an ALPHABETIC affix — the way one product is
// written several ways:
//   (a) a dropped alpha trim SUFFIX: retailers list "dxv12p" for "dxv12pqt";
//   (b) an added alpha series/line PREFIX: "m2415bz" (Mesa II) for "415bz".
// A different number is never compatible — "q7" vs "q70" and "hd1200" vs
// "hd1400" stay conflicting — and a different trim suffix ("dxv12pqta" adding
// its own "a") stays a distinct sibling SKU. Prefix/suffix boundaries are
// required to be a letter so a numeric extension can never masquerade as an
// affix.
function titleModelCompatibleWithTarget(titleModel: string, targetModel: string) {
  if (titleModel === targetModel) return true;
  // (a) title is the base; target appends an alpha trim suffix.
  if (
    targetModel.startsWith(titleModel) &&
    /[a-z]/i.test(targetModel.charAt(titleModel.length))
  ) {
    return true;
  }
  // (b) title prepends an alpha series/line code to the target's base model.
  if (
    titleModel.length > targetModel.length &&
    titleModel.endsWith(targetModel) &&
    /^[a-z]/i.test(titleModel)
  ) {
    return true;
  }
  return false;
}

function titleHasConflictingModel(targetModel: string, title: string) {
  if (haveConflictingCompoundModelSequences(targetModel, title)) return true;

  const identityModels = (value: string) =>
    new Set(
      [...strongModelTokens(value)].filter(
        (model) => !DIRECT_TERRA_MEASUREMENT_MODEL.test(model),
      ),
    );
  const targetModels = [...identityModels(targetModel)];
  const titleModels = identityModels(title);
  if (targetModels.length === 0) return false;
  // A title carries a conflicting model only when one of its strong models is
  // compatible with NO target model (so a base-model retailer listing is
  // compatible, while a sibling suffix or a different number is not).
  return [...titleModels].some(
    (titleModel) =>
      !targetModels.some((target) =>
        titleModelCompatibleWithTarget(titleModel, target),
      ),
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

// The core model appears in the URL path (every digit-bearing token present in
// the compacted pathname). A trailing alpha trim suffix that retailers drop is
// tolerated, while a different number is not.
// A URL path DIRECTORY segment that equals an accessory/part section marks a
// part page ("/accessories/0910-20-filter"). Segment equality (not a substring
// of the flattened path) keeps a complete product sold "…-with-Hose-and-
// Accessories-DXV12P" — where the word only appears inside the slug — eligible.
function urlHasAccessoryPathSegment(url: string) {
  try {
    return new URL(url).pathname
      .toLowerCase()
      .split("/")
      .filter(Boolean)
      .some((segment) =>
        /^(?:accessor(?:y|ies)|parts|replacement-parts|spare-parts)$/.test(
          segment,
        ),
      );
  } catch {
    return false;
  }
}

function coreModelInUrlPath(url: string, model: string) {
  try {
    const pathCompact = compactIdentity(
      decodeURIComponent(new URL(url).pathname),
    );
    const core = modelCoreTokens(model);
    return core.length > 0 && core.every((token) => pathCompact.includes(token));
  } catch {
    return false;
  }
}

// A title can correctly name the locked product while its destination path
// names a different descriptive variant (for example, a standard office chair
// title pointing at a gaming-chair page). Treat positive wrong-type evidence
// in the path as a veto. Sparse or neutral paths continue; this rule admits
// nothing and reuses the shared category-independent type contract.
function productUrlPathHasTypeConflict(
  target: DirectTerraAssetTarget,
  productUrl: string,
) {
  try {
    const pathText = decodeURIComponent(new URL(productUrl).pathname)
      .replace(/[-_/.+]+/g, " ")
      .trim();
    return !classifyProductTypeMatch({
      evidenceText: pathText,
      identityText: pathText,
      requestedCategory: target.category,
    }).canBeExactMatch;
  } catch {
    return true;
  }
}

const DIRECT_TERRA_URL_STRUCTURE_WORDS = new Set([
  "asset",
  "assets",
  "buy",
  "catalog",
  "cdn",
  "detail",
  "details",
  "en",
  "eu",
  "file",
  "files",
  "image",
  "images",
  "img",
  "item",
  "items",
  "media",
  "official",
  "online",
  "p",
  "pd",
  "pdp",
  "product",
  "products",
  "shop",
  "static",
  "store",
  "uk",
  "us",
]);

const DIRECT_TERRA_CONFIGURATION_WORDS = new Set([
  "color",
  "colour",
  "configurable",
  "configuration",
  "finish",
  "material",
  "option",
  "options",
  "select",
  "selection",
  "style",
  "styles",
]);

const DIRECT_TERRA_COLOR_FINISH_WORDS = new Set([
  "beige",
  "black",
  "blue",
  "brown",
  "charcoal",
  "chrome",
  "gold",
  "graphite",
  "gray",
  "green",
  "grey",
  "natural",
  "oak",
  "orange",
  "pink",
  "purple",
  "red",
  "silver",
  "stainless",
  "steel",
  "tan",
  "walnut",
  "white",
  "yellow",
]);

function addInflectionVariants(tokens: Set<string>) {
  for (const token of [...tokens]) {
    if (token.length < 3) continue;
    if (token.endsWith("ies") && token.length > 4) {
      tokens.add(`${token.slice(0, -3)}y`);
    } else if (token.endsWith("s") && token.length > 3) {
      tokens.add(token.slice(0, -1));
    } else if (token.endsWith("y")) {
      tokens.add(`${token.slice(0, -1)}ies`);
    } else {
      tokens.add(`${token}s`);
    }
  }
}

function opaquePathToken(token: string) {
  return (
    /^\d{5,}$/.test(token) ||
    /^[a-f0-9]{12,}$/i.test(token) ||
    /^\d{2,5}x\d{2,5}$/i.test(token)
  );
}

// Descriptive product identities lack the numeric boundary that makes coded
// siblings easy to distinguish. Once a candidate title has proved the locked
// identity, its destination path may repeat that identity plus ordinary
// commerce scaffolding, category words, colors/configuration labels, or an
// opaque retailer ID. Any other path word is unexplained identity evidence:
// it may name a sibling/edition the title did not disclose, so fail closed.
//
// This is intentionally a veto, never an admission rule. Numeric/alphanumeric
// models keep the established exact-model contract unchanged.
function productUrlPathHasDescriptiveIdentityConflict(
  target: DirectTerraAssetTarget,
  title: string,
  productUrl: string,
) {
  const modelTokens = modelCoreTokens(target.model);
  if (
    modelTokens.length === 0 ||
    modelTokens.some((token) => /\d/.test(token))
  ) {
    return false;
  }

  try {
    const pathTokens = new URL(productUrl).pathname
      .split("/")
      .filter(Boolean)
      .flatMap((segment) => {
        const decoded = decodeURIComponent(segment).replace(
          /\.[a-z0-9]{1,5}$/i,
          "",
        );
        return normalizedIdentityTokens(decoded);
      });
    const pathTokenSet = new Set(pathTokens);
    if (!modelTokens.every((token) => pathTokenSet.has(token))) {
      return false;
    }

    const explainedTokens = new Set(
      normalizedIdentityTokens(
        `${title} ${target.brand} ${target.category} ${target.model}`,
      ),
    );
    addInflectionVariants(explainedTokens);
    for (const token of DIRECT_TERRA_URL_STRUCTURE_WORDS) {
      explainedTokens.add(token);
    }
    for (const token of DIRECT_TERRA_CONFIGURATION_WORDS) {
      explainedTokens.add(token);
    }
    for (const token of DIRECT_TERRA_COLOR_FINISH_WORDS) {
      explainedTokens.add(token);
    }

    return pathTokens.some(
      (token) => !explainedTokens.has(token) && !opaquePathToken(token),
    );
  } catch {
    return true;
  }
}

// Retailer and manufacturer product pages routinely omit the SKU from the page
// TITLE while carrying it exactly in the URL slug (homedepot.com/p/DEWALT-…-
// DXV12P/305323712 is titled "DEWALT 12 Gal. Wet/Dry Vacuum"; retailers list
// the base model without the "-QT" trim). When the title's only identity gap
// is the missing model, a manufacturer or popular-retailer product page whose
// path carries the core model (and no conflicting sibling) may stand in for
// title-model evidence. The title must still prove the brand, carry no
// conflicting model, and pass the product-type gate; the URL still faces the
// eligibility gate afterward. So accessory titles ("… filter"), category
// pages, foreign brands, and sibling-model paths (DXV10P) all remain rejected.
function urlSlugIdentity(
  target: DirectTerraAssetTarget,
  title: string,
  candidateUrl: string | null,
) {
  if (!candidateUrl) return false;
  try {
    const hostClass = classifyDirectTerraLinkHost(candidateUrl, target.brand);
    if (hostClass !== "manufacturer" && hostClass !== "popular_retailer") {
      return false;
    }
    const pathText = decodeURIComponent(new URL(candidateUrl).pathname)
      .replace(/[-_/.+]+/g, " ")
      .trim();
    // A brand-owned manufacturer host proves the brand on its own; a retailer
    // hosts every brand, so its title must still carry the brand. Either way,
    // a title that names a DIFFERENT known brand (a milwaukeetool.com page
    // titled "DEWALT …") is conflicting and can never be blessed by the host.
    const titleBrands = detectKnownBrands(title);
    const targetBrandKey = compactIdentity(canonicalBrand(target.brand));
    const titleNamesConflictingBrand =
      titleBrands.length > 0 &&
      !titleBrands.some(
        (brand) => compactIdentity(canonicalBrand(brand)) === targetBrandKey,
      );
    const brandProven =
      !titleNamesConflictingBrand &&
      (hostClass === "manufacturer" || brandEvidenceMatches(title, target.brand));
    return (
      coreModelInUrlPath(candidateUrl, target.model) &&
      !titleHasConflictingModel(target.model, pathText) &&
      brandProven &&
      !titleHasConflictingModel(target.model, title) &&
      // An accessories/parts path segment ("…/accessories/0910-20-filter")
      // is a part page even when the scraped title describes the parent
      // product; reject it before trusting the slug.
      !urlHasAccessoryPathSegment(candidateUrl) &&
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
  // The URL slug proved identity; the path carries the core model, so the
  // later productPageMatchesIdentity title/URL re-check is redundant and would
  // re-impose the exact-trim strictness this path deliberately relaxes.
  let slugProvenIdentity = false;
  if (
    !identity.identityAccepted &&
    (identity.identityReason === "model_not_in_title" ||
      identity.identityReason === "brand_not_in_title") &&
    urlSlugIdentity(target, title, canonicalHttpUrl(candidate.productUrl))
  ) {
    identity = {
      identityAccepted: true,
      identityReason: "accepted_manufacturer_slug_identity",
    };
    slugProvenIdentity = true;
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
  } else if (productUrl && productUrlPathHasTypeConflict(target, productUrl)) {
    productUrlReason = "product_url_type_conflict";
  } else if (
    productUrl &&
    productUrlPathHasDescriptiveIdentityConflict(target, title, productUrl)
  ) {
    productUrlReason = "product_url_descriptive_identity_conflict";
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
      // For slug-proven identity the URL path already carried the core model
      // (and no conflicting sibling); re-running the exact-trim page matcher
      // here would defeat that. Eligibility above still blocks category and
      // accessory pages. Title-proven candidates keep the full page matcher.
      !slugProvenIdentity &&
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

  if (
    productUrlPathHasDescriptiveIdentityConflict(
      target,
      title,
      parsedImageUrl,
    )
  ) {
    return {
      ...base,
      productUrlAccepted: Boolean(safeProductUrl),
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "image_url_descriptive_identity_conflict",
      productUrl: safeProductUrl,
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

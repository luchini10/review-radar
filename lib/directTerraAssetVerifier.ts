import { brandEvidenceMatches } from "./brandMatching.ts";
import { classifyProductEligibility } from "./productEligibility.ts";
import { validateProductImageCandidate } from "./productImageResolver.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import {
  haveConflictingCompoundModelSequences,
  strongModelTokens,
} from "./productIdentity.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";
import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";

export const DIRECT_TERRA_ASSET_VERIFIER_VERSION =
  "direct-terra-asset-verifier-v1";

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
  snippet?: unknown;
};

export type DirectTerraAssetDecision = {
  candidateIndex: number;
  title: string;
  identityAccepted: boolean;
  identityReason:
    | "accepted_exact_identity"
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

  const targetModels = strongModelTokens(targetModel);
  const titleModels = strongModelTokens(title);
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

function unsafeProductHost(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const unbracketedHost = host.replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) ||
    unbracketedHost.includes(":") ||
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

function evaluateCandidate(
  target: DirectTerraAssetTarget,
  candidate: DirectTerraAssetCandidate,
  candidateIndex: number,
): DirectTerraAssetDecision {
  const title = asText(candidate.title, 300);
  const identity = identityDecision(target, title);
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

  if (!safeProductUrl) {
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

  const rawImageUrl = asText(candidate.imageUrl, 4_096);
  if (!rawImageUrl) {
    return {
      ...base,
      productUrlAccepted: true,
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: "missing_image_url",
      productUrl: safeProductUrl,
      imageUrl: null,
    };
  }

  const image = validateProductImageCandidate(
    {
      evidenceText: title,
      source: "serp",
      url: rawImageUrl,
    },
    {
      brand: target.brand,
      category: target.category,
      modelNumber: target.model,
      pageUrl: safeProductUrl,
      productName: target.productName,
    },
  );

  if (!image.accepted) {
    return {
      ...base,
      productUrlAccepted: true,
      productUrlReason,
      imageUrlAccepted: false,
      imageUrlReason: image.rejection.reason,
      productUrl: safeProductUrl,
      imageUrl: null,
    };
  }

  return {
    ...base,
    productUrlAccepted: true,
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

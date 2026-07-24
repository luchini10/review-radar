import { classifyProductEligibility } from "./productEligibility.ts";
import { classifyProductTypeIntent } from "./productTypeIntent.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";

export const DIRECT_TERRA_PRODUCT_RELATIONSHIP_VERSION =
  "direct-terra-product-relationship-v1";

export type DirectTerraProductRelationship =
  | "complete_product"
  | "bundle_including_product"
  | "accessory_or_replacement"
  | "different_product"
  | "non_product_page"
  | "unknown";

export type DirectTerraProductRelationshipVerdict = {
  relationship: DirectTerraProductRelationship;
  reason:
    | "complete_product_type_proven"
    | "bundle_complete_product_included"
    | "complement_relationship_wording"
    | "complement_primary_item"
    | "identity_not_proven"
    | "product_type_conflict"
    | "non_product_page"
    | "insufficient_complete_product_evidence";
};

type RelationshipTarget = {
  brand: string;
  model: string;
  productName: string;
  category: string;
};

type RelationshipInput = {
  target: RelationshipTarget;
  title?: unknown;
  snippet?: unknown;
  productUrl?: unknown;
  structuredProductNames?: unknown;
  identityAccepted: boolean;
  identityReason?: string;
};

const COMPLEMENT_ITEM_PATTERN =
  /\b(?:accessor(?:y|ies)|attachments?|replacement\s+parts?|spare\s+parts?|parts?\s+kit|batter(?:y|ies)|chargers?|charging\s+(?:base|dock|station)|docks?|docking\s+stations?|bases?|clean\s+bases?|tanks?|reservoirs?|filters?|hoses?|brush(?:es|rolls?)?|mop\s+pads?|pads?|bags?|nozzles?|wands?|wheels?|casters?|belts?|bins?|dustbins?|adapters?|mounts?|brackets?|covers?|shelves?|trays?|drawers?|remotes?|cables?|cords?)\b/i;

const DIRECTED_COMPLEMENT_PATTERN =
  /(?:^|\b)(?:replacement|spare)\b|^\s*(?:new\s+)?(?:\d+\s*(?:pack|packs|pc|pcs|piece|pieces)\s+)?for\b|\b(?:compatible|works?|designed|made|suitable)\s+(?:for|with)\b|\b(?:fits?|fitment)\s+(?:for\s+|with\s+)?\b/i;

const INCLUDED_COMPLEMENT_PATTERN =
  /\b(?:with|includes?|including|comes\s+with|supplied\s+with|bundled\s+with|kit\s+with)\b.{0,100}\b(?:accessor(?:y|ies)|attachments?|batter(?:y|ies)|chargers?|docks?|stations?|bases?|tanks?|filters?|hoses?|brush(?:es|rolls?)?|pads?|bags?|nozzles?|wands?|wheels?|casters?|belts?|bins?|adapters?|mounts?|brackets?|covers?|shelves?|trays?|drawers?|remotes?|cables?|cords?)\b/i;

const NON_TYPE_WORDS = new Set([
  "and",
  "best",
  "black",
  "blue",
  "brushless",
  "corded",
  "cordless",
  "electric",
  "for",
  "gray",
  "green",
  "high",
  "included",
  "kit",
  "large",
  "max",
  "new",
  "plus",
  "powered",
  "pro",
  "red",
  "self",
  "smart",
  "small",
  "under",
  "white",
  "with",
  "without",
  "xr",
]);

const MEASUREMENT_OR_SPEC_TOKEN =
  /^(?:\d+(?:\.\d+)?|amp|amps|bit|btu|burner|burners|cc|cfm|door|doors|ft|gal|gallon|gallons|gb|hp|hz|in|inch|inches|kg|l|lb|lbs|mah|ml|mm|mp|oz|pc|pcs|psi|qt|tb|v|volt|volts|w|watt|watts|wh)$/i;

function text(value: unknown, maxLength = 1_000) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function textArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => text(entry, 300))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizedTokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function comparableTokenForms(value: string) {
  const forms = new Set([value]);
  if (
    value.length > 3 &&
    value.endsWith("s") &&
    !value.endsWith("ss") &&
    value !== "gas"
  ) {
    forms.add(value.slice(0, -1));
  }
  return forms;
}

function urlPathText(value: string) {
  try {
    return decodeURIComponent(new URL(value).pathname)
      .replace(/[-_/.+]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function categoryDescriptorTokens(target: RelationshipTarget) {
  const brandTokens = new Set(normalizedTokens(target.brand));
  return normalizedTokens(target.category).filter(
    (token) =>
      token.length >= 3 &&
      !brandTokens.has(token) &&
      !NON_TYPE_WORDS.has(token) &&
      !MEASUREMENT_OR_SPEC_TOKEN.test(token),
  );
}

function fallbackTypeEvidence(
  target: RelationshipTarget,
  primaryEvidence: string,
) {
  const descriptors = categoryDescriptorTokens(target);
  if (descriptors.length === 0) return false;
  const evidenceTokens = new Set(
    normalizedTokens(primaryEvidence).flatMap((token) => [
      ...comparableTokenForms(token),
    ]),
  );
  return descriptors.every((token) =>
    [...comparableTokenForms(token)].some((form) => evidenceTokens.has(form)),
  );
}

function completeProductTypeProven(
  target: RelationshipTarget,
  primaryEvidence: string,
) {
  const intent = classifyProductTypeIntent({
    candidateText: primaryEvidence,
    candidateIdentityText: primaryEvidence,
    requestedText: target.category,
  });

  if (intent.status === "exact") return true;
  return fallbackTypeEvidence(target, primaryEvidence);
}

function requestedProductIsTheComplementItem(target: RelationshipTarget) {
  return COMPLEMENT_ITEM_PATTERN.test(target.category);
}

function complementLeadsDirectedRelationship(
  target: RelationshipTarget,
  evidence: string,
) {
  if (requestedProductIsTheComplementItem(target)) return false;
  const relation = evidence.match(
    /\b(?:for|compatible\s+(?:for|with)|fits?(?:\s+(?:for|with))?|made\s+for|designed\s+for|suitable\s+for)\b/i,
  );
  if (relation?.index === undefined) return false;
  const beforeRelationship = evidence.slice(0, relation.index).trim();
  return (
    COMPLEMENT_ITEM_PATTERN.test(beforeRelationship) &&
    !completeProductTypeProven(target, beforeRelationship)
  );
}

export function classifyDirectTerraProductRelationship(
  input: RelationshipInput,
): DirectTerraProductRelationshipVerdict {
  const title = text(input.title, 500);
  const structuredNames = textArray(input.structuredProductNames);
  const primaryEvidence = [title, ...structuredNames].filter(Boolean).join(" ");
  const snippet = text(input.snippet, 1_000);
  const productUrl = text(input.productUrl, 4_096);
  const pathEvidence = urlPathText(productUrl);
  const allEvidence = [primaryEvidence, snippet, pathEvidence]
    .filter(Boolean)
    .join(" ");
  const typeEvidence = [primaryEvidence, pathEvidence]
    .filter(Boolean)
    .join(" ");

  const eligibility = classifyProductEligibility({
    brand: input.target.brand,
    category: input.target.category,
    name: primaryEvidence,
    productName: input.target.productName,
    snippet,
    sourceTitle: primaryEvidence,
    sourceType: "serper",
    url: productUrl || null,
  });
  if (
    eligibility.status === "non_product" ||
    eligibility.status === "evidence_only" ||
    eligibility.status === "listing_or_search"
  ) {
    return {
      relationship: "non_product_page",
      reason: "non_product_page",
    };
  }

  if (!input.identityAccepted) {
    if (input.identityReason === "wrong_product_type") {
      const rejectedTypeMatch = classifyProductTypeMatch({
        evidenceText: primaryEvidence,
        identityText: primaryEvidence,
        requestedCategory: input.target.category,
      });
      if (
        rejectedTypeMatch.status === "complement" ||
        rejectedTypeMatch.status === "component_substitution"
      ) {
        return {
          relationship: "accessory_or_replacement",
          reason: "complement_primary_item",
        };
      }
    }
    return {
      relationship: "different_product",
      reason: "identity_not_proven",
    };
  }

  const typeMatch = classifyProductTypeMatch({
    evidenceText: primaryEvidence,
    identityText: primaryEvidence,
    requestedCategory: input.target.category,
  });
  if (!typeMatch.canBeExactMatch) {
    if (
      typeMatch.status === "complement" ||
      typeMatch.status === "component_substitution"
    ) {
      return {
        relationship: "accessory_or_replacement",
        reason: "complement_primary_item",
      };
    }
    return {
      relationship: "different_product",
      reason: "product_type_conflict",
    };
  }

  const typeProven = completeProductTypeProven(
    input.target,
    typeEvidence,
  );
  const pathNamesComplement =
    !requestedProductIsTheComplementItem(input.target) &&
    COMPLEMENT_ITEM_PATTERN.test(pathEvidence);
  const pathIncludesComplement =
    pathNamesComplement && INCLUDED_COMPLEMENT_PATTERN.test(pathEvidence);
  if (pathNamesComplement && !pathIncludesComplement) {
    return {
      relationship: "accessory_or_replacement",
      reason: "complement_primary_item",
    };
  }
  const includesComplement =
    INCLUDED_COMPLEMENT_PATTERN.test(primaryEvidence) &&
    COMPLEMENT_ITEM_PATTERN.test(primaryEvidence);
  if (typeProven && includesComplement) {
    return {
      relationship: "bundle_including_product",
      reason: "bundle_complete_product_included",
    };
  }

  const directedComplement = DIRECTED_COMPLEMENT_PATTERN.test(allEvidence);
  const complementBeforeRelationship =
    complementLeadsDirectedRelationship(input.target, primaryEvidence) ||
    complementLeadsDirectedRelationship(input.target, pathEvidence);
  const namesComplementItem =
    !requestedProductIsTheComplementItem(input.target) &&
    COMPLEMENT_ITEM_PATTERN.test(allEvidence);
  if (
    complementBeforeRelationship ||
    (directedComplement && (namesComplementItem || !typeProven))
  ) {
    return {
      relationship: "accessory_or_replacement",
      reason: "complement_relationship_wording",
    };
  }
  if (!typeProven && namesComplementItem) {
    return {
      relationship: "accessory_or_replacement",
      reason: "complement_primary_item",
    };
  }

  if (typeProven) {
    return {
      relationship: "complete_product",
      reason: "complete_product_type_proven",
    };
  }

  return {
    relationship: "unknown",
    reason: "insufficient_complete_product_evidence",
  };
}

export function directTerraRelationshipCanSupplyAsset(
  relationship: DirectTerraProductRelationship,
) {
  return (
    relationship === "complete_product" ||
    relationship === "bundle_including_product"
  );
}

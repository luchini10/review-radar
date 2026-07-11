import { isComponentSubstitution } from "./formFactor.ts";
import { classifyProductTypeIntent } from "./productTypeIntent.ts";

// Single shared "is this the requested KIND of product?" verdict.
//
// Discovery (`lib/search/serper.ts`) and validation (`lib/requirementValidation.ts`)
// previously each repeated the same pair of checks — product-type intent
// (`classifyProductTypeIntent`) plus the component-substitution model
// (`isComponentSubstitution`) — to keep wrong-type products (a cooktop for an
// "oven", a bed frame for a "mattress", a gaming chair for an "office chair") out
// of exact matches. This helper composes them in one place so both layers agree.
//
// Pure and text-based: callers pass the candidate's evidence text and the
// requested base category. No product type is hardcoded here — the categories
// live in the shared data registries (`productTypeIntent`, `formFactor`).
//
// This is the consolidation seam for the product-accuracy hardening plan
// (Phase 1). Additional wrong-type signals (cross-category conflict rules,
// required-category evidence) are folded in here in later steps once parity is
// proven; for now those remain in `requirementValidation` and run alongside this.

export type ProductTypeMatchStatus =
  | "ok"
  | "wrong_type"
  | "complement"
  | "component_substitution"
  | "type_conflict";

export type ProductTypeMatchVerdict = {
  canBeExactMatch: boolean;
  status: ProductTypeMatchStatus;
  reason: string;
};

// Mirror of `requirementValidation.normalizeText` — the conflict rules below were
// written against this exact normalization, so keep the two in sync. Lowercases,
// expands "&", canonicalizes ft/in units, and collapses punctuation/whitespace.
function normalizeProductTypeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/(\d)\s*[-]?\s*(?:feet|foot|ft\.?)\b/g, "$1 ft")
    .replace(/(\d)\s*[-]?\s*(?:inches|inch|in\.?)\b/g, "$1 in")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ProductTypeConflictRule = {
  allowedEvidence?: RegExp;
  conflictingEvidence: RegExp;
  requestedCategory: RegExp;
};

// Cross-category conflict rules: when the request is category A but the
// candidate's evidence positively shows category-B signals (and not A's own
// signals), it is the wrong product. Each rejects only on POSITIVE conflicting
// evidence — most carry an `allowedEvidence` guard — so they are safe at the
// discovery layer as well as validation. Moved here from `requirementValidation`
// so discovery and validation share one set.
const PRODUCT_TYPE_CONFLICT_RULES: ProductTypeConflictRule[] = [
  {
    allowedEvidence: /\b(?:sectional|sofa|couch|loveseat)\b/,
    conflictingEvidence: /\b(?:ottoman|bench|coffee table|side table|mattress|bed frame)\b/,
    requestedCategory: /\b(?:sectional|sofa|couch|loveseat)\b/,
  },
  {
    allowedEvidence:
      /\b(?:office chair|task chair|desk chair|ergonomic chair|computer chair|executive chair|mesh chair|work chair)\b/,
    conflictingEvidence:
      /\b(?:accent chair|dining chair|lounge chair|gaming chair|racing chair|pillow|cushion|chair mat|floor mat|seat cover)\b/,
    requestedCategory: /\b(?:office chair|task chair|desk chair|computer chair)\b/,
  },
  {
    allowedEvidence: /\bdehumidifier\b/,
    conflictingEvidence:
      /\b(?:wine|beverage)\s+(?:refrigerator|fridge|cooler)\b/,
    requestedCategory: /\bdehumidifier\b/,
  },
  {
    allowedEvidence: /\b(?:bed frame|platform bed|storage bed)\b/,
    conflictingEvidence: /\b(?:mattress|nightstand|dresser|headboard only)\b/,
    requestedCategory: /\bbed frame\b/,
  },
  {
    allowedEvidence:
      /\bmattress\b(?!\s+(?:base|foundation|frame|pad|platform|protector|support|topper)\b)/,
    conflictingEvidence:
      /\b(?:bed|bed frame|platform bed|storage bed|upholstered bed|headboard|foundation|box spring|bunkie board)\b/,
    requestedCategory: /\bmattress\b/,
  },
  {
    allowedEvidence: /\b(?:pressure washer|power washer|high pressure washer|psi|gpm|spray gun|spray wand|foam cannon|foam lance|soap cannon)\b/,
    conflictingEvidence: /\b(?:washer dryer|washer and dryer|electric dryer|front load washer|top load washer|laundry center|laundry tower|washing machine|dryer set|laundry)\b/,
    requestedCategory: /\bpressure washer\b/,
  },
  {
    conflictingEvidence: /\b(?:monitor|display|speaker|subwoofer|soundbar|amplifier|receiver|projector|camera|headphones|earbuds)\b/,
    requestedCategory: /\b(?:tv stand|media console|media unit|entertainment center|bookcase|bookshelf|shelving unit|storage cabinet)\b/,
  },
  {
    allowedEvidence: /\b(?:speaker|subwoofer|soundbar|amplifier|receiver|audio)\b/,
    conflictingEvidence: /\b(?:tv stand|media console|sofa|couch|chair|table|dresser|bed frame)\b/,
    requestedCategory: /\b(?:speaker|subwoofer|soundbar|amplifier|receiver)\b/,
  },
];

function hasProductTypeConflict(evidenceText: string, requestedCategory: string) {
  const evidence = normalizeProductTypeText(evidenceText);
  const requested = normalizeProductTypeText(requestedCategory);

  return PRODUCT_TYPE_CONFLICT_RULES.some((rule) => {
    if (!rule.requestedCategory.test(requested)) {
      return false;
    }

    if (!rule.conflictingEvidence.test(evidence)) {
      return false;
    }

    return rule.allowedEvidence ? !rule.allowedEvidence.test(evidence) : true;
  });
}

export function classifyProductTypeMatch(input: {
  allowedCheckText?: string | undefined;
  evidenceText: string | undefined;
  identityText?: string | undefined;
  requestedCategory: string | undefined;
}): ProductTypeMatchVerdict {
  const evidenceText = input.evidenceText || "";
  const requestedCategory = input.requestedCategory || "";

  // Rich recommendation prose may confirm a sparse product name, but it must
  // never erase a wrong-type signal in the lean evidence. Check that evidence
  // first; a complement is allowed to continue because the richer text may
  // prove that the complement is bundled with the requested product.
  const evidenceOnlyIntent = input.allowedCheckText
    ? classifyProductTypeIntent({
        candidateText: evidenceText,
        candidateIdentityText: input.identityText,
        requestedText: requestedCategory,
      })
    : null;

  if (evidenceOnlyIntent?.status === "irrelevant") {
    return {
      canBeExactMatch: false,
      status: "wrong_type",
      reason: evidenceOnlyIntent.reason,
    };
  }

  const intent = classifyProductTypeIntent({
    allowedCheckText: input.allowedCheckText,
    candidateText: evidenceText,
    candidateIdentityText: input.identityText,
    requestedText: requestedCategory,
  });

  if (intent.status === "irrelevant") {
    return { canBeExactMatch: false, status: "wrong_type", reason: intent.reason };
  }

  if (intent.status === "complement") {
    return { canBeExactMatch: false, status: "complement", reason: intent.reason };
  }

  if (isComponentSubstitution(evidenceText, requestedCategory)) {
    return {
      canBeExactMatch: false,
      status: "component_substitution",
      reason:
        "Candidate names a component or variant of the requested product, not the product itself.",
    };
  }

  if (hasProductTypeConflict(evidenceText, requestedCategory)) {
    return {
      canBeExactMatch: false,
      status: "type_conflict",
      reason:
        "Candidate's evidence shows a conflicting product category for the request.",
    };
  }

  return {
    canBeExactMatch: true,
    status: "ok",
    reason: "Candidate is the requested kind of product (no wrong-type signal).",
  };
}

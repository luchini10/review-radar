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
  | "component_substitution";

export type ProductTypeMatchVerdict = {
  canBeExactMatch: boolean;
  status: ProductTypeMatchStatus;
  reason: string;
};

export function classifyProductTypeMatch(input: {
  evidenceText: string | undefined;
  requestedCategory: string | undefined;
}): ProductTypeMatchVerdict {
  const evidenceText = input.evidenceText || "";
  const requestedCategory = input.requestedCategory || "";

  const intent = classifyProductTypeIntent({
    candidateText: evidenceText,
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

  return {
    canBeExactMatch: true,
    status: "ok",
    reason: "Candidate is the requested kind of product (no wrong-type signal).",
  };
}

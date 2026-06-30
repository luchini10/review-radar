// Data-only model of product FORM FACTOR / SUBTYPE — the physical-form axis
// that separates a full-size product from a smaller/niche variant, and a real
// product from one of its components.
//
// This replaces the per-category hardcoded exceptions that used to live in the
// discovery filter and validation (`isCooktopOnlyForOvenSearch`,
// `isStandaloneRefrigeratorAccessory`, refrigerator/oven literals). Both behaviors
// are expressed here as cross-category DATA so adding a case is a data edit, never
// a new code branch. No product category appears in control flow downstream.
//
// Two independent mechanisms:
//   1. Form-factor modifiers — a candidate carrying a "smaller/niche variant"
//      modifier the user did NOT request is a different product CLASS than the
//      full-size default (a tabletop grill for a "gas grill" search). This is a
//      soft DEPRIORITIZATION, never a rejection — modifiers can be marketing noise.
//   2. Component substitutions — a candidate that names a COMPONENT/variant of the
//      requested appliance (a cooktop for an "oven" search, an ice-maker for a
//      "refrigerator" search) without also being the appliance itself is the wrong
//      product. This IS a rejection, but only when the base category matches and
//      the real product is absent from the evidence (3-state safe).

// Regexes are declared WITHOUT the global flag so shared `lastIndex` state never
// leaks between `.test` calls.

const FORM_FACTOR_MODIFIERS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "tabletop", aliases: ["tabletop", "table top", "table-top"] },
  {
    canonical: "walking-pad",
    aliases: ["walking pad", "walking-pad", "walkingpad", "under desk", "under-desk"],
  },
  {
    canonical: "travel",
    aliases: ["travel", "traveler", "travelers", "travel-friendly", "travel size", "travel-size"],
  },
  { canonical: "mini", aliases: ["mini", "miniature"] },
  { canonical: "handheld", aliases: ["handheld", "hand held", "hand-held"] },
  { canonical: "portable", aliases: ["portable"] },
  {
    canonical: "compact",
    aliases: ["compact", "small space", "smaller space", "space saving", "space-saving"],
  },
];

const REQUESTED_FORM_FACTOR_COMPATIBILITY: Record<string, Set<string>> = {
  "walking-pad": new Set(["compact", "portable"]),
  handheld: new Set(["compact", "portable"]),
  mini: new Set(["compact", "portable"]),
  tabletop: new Set(["compact", "portable"]),
  travel: new Set(["compact", "mini", "portable"]),
};

function aliasPattern(alias: string) {
  // Match the alias with flexible whitespace/hyphen between words, on word
  // boundaries so "mini" never fires inside "minimum".
  return new RegExp(`(^|\\W)${alias.replace(/[-\s]+/g, "[\\s-]+")}(\\W|$)`, "i");
}

// Returns the set of canonical form-factor modifiers present in `text`.
export function detectFormFactors(text: string | undefined): Set<string> {
  const value = text || "";
  const found = new Set<string>();

  if (!value) {
    return found;
  }

  for (const modifier of FORM_FACTOR_MODIFIERS) {
    if (modifier.aliases.some((alias) => aliasPattern(alias).test(value))) {
      found.add(modifier.canonical);
    }
  }

  return found;
}

// Modifiers the CANDIDATE carries that the user did NOT request — i.e. signals
// that the candidate is a narrower/different form factor than what was asked for.
// When the request itself names a modifier (e.g. "portable grill"), that modifier
// is expected and not counted.
export function offFormFactorModifiers(
  candidateText: string | undefined,
  requestedText: string | undefined,
): string[] {
  const requested = detectFormFactors(requestedText);
  const compatible = new Set(
    [...requested].flatMap((modifier) => [
      ...(REQUESTED_FORM_FACTOR_COMPATIBILITY[modifier] || []),
    ]),
  );

  return [...detectFormFactors(candidateText)].filter(
    (modifier) => !requested.has(modifier) && !compatible.has(modifier),
  );
}

type ComponentSubstitution = {
  // The requested base category this rule applies to.
  base: RegExp;
  // Evidence that the candidate is a component/variant of that category.
  substitute: RegExp;
  // ...but it is fine if the evidence ALSO shows the real product (then it is the
  // product with the component, not the bare component).
  satisfiedBy: RegExp;
};

const COMPONENT_SUBSTITUTIONS: ComponentSubstitution[] = [
  // A cooktop is the burner surface of an oven/range/stove — not the appliance.
  {
    base: /\b(?:oven|range|stove)\b/i,
    substitute: /\bcooktop\b/i,
    satisfiedBy: /\b(?:oven|range|stove)\b/i,
  },
  // Refrigerator parts/accessories sold standalone are not the refrigerator.
  {
    base: /\b(?:refrigerator|fridge)\b/i,
    substitute:
      /\b(?:ice\s*-?\s*maker|icemaker|water filter|air filter|replacement shelf|door bin|crisper drawer|refrigerator handle)\b/i,
    satisfiedBy: /\b(?:refrigerator|fridge|freezer|mini fridge)\b/i,
  },
  // A bed frame, platform bed, or foundation is furniture for a mattress, not
  // the mattress itself.
  {
    base: /\bmattress\b/i,
    substitute:
      /\b(?:bed|bed frame|platform bed|storage bed|upholstered bed|headboard|foundation|box spring|bunkie board)\b/i,
    satisfiedBy:
      /\bmattress\b(?!\s+(?:base|foundation|frame|pad|platform|protector|support|topper)\b)/i,
  },
];

// True when the candidate's evidence names a component/variant of the requested
// base category without also being the full product. Caller supplies the
// candidate's evidence text and the base category derived from the query.
export function isComponentSubstitution(
  evidenceText: string | undefined,
  baseCategory: string | undefined,
): boolean {
  const evidence = evidenceText || "";
  const base = baseCategory || "";

  if (!evidence || !base) {
    return false;
  }

  return COMPONENT_SUBSTITUTIONS.some(
    (rule) =>
      rule.base.test(base) &&
      rule.substitute.test(evidence) &&
      !rule.satisfiedBy.test(evidence),
  );
}

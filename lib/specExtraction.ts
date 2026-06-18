// Deterministic, side-effect-free extraction of numeric/boolean performance
// specs, driven entirely by SPEC_DICTIONARY. Two entry points:
//
//   extractSpecConstraints(text, source) -> spec *requirements* from user input
//   extractProductSpecs(product)         -> observed spec values on a product
//
// SHADOW MODE: nothing in this file is consumed by search, validation, or
// scoring yet. It is computed and surfaced for debugging so later phases can
// promote it after before/after comparison.

import {
  SPEC_DICTIONARY,
  type SpecDefinition,
} from "./specDictionary.ts";
import type {
  ProductRecommendation,
  ProductSpecMap,
  ProductSpecSource,
  SpecConstraint,
} from "@/types/review-radar";

const MIN_WORDS =
  /(?:at least|minimum|\bmin\b|no less than|over|more than|greater than|above|starting at)/i;
const MAX_WORDS =
  /(?:under|less than|below|at most|max(?:imum)?|no more than|up to|within)/i;
const HARD_WORDS =
  /(?:must|need|needs|required|require|requires|has to|have to|\bonly\b|at least|no less than|under|less than|below|at most|no more than|maximum|minimum)/i;

function globalRegex(pattern: RegExp): RegExp {
  return pattern.flags.includes("g")
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

function unitSuffix(unit: string | null) {
  return unit ? ` ${unit}` : "";
}

function numericLabel(
  label: string,
  operator: SpecConstraint["operator"],
  value: number,
  unit: string | null,
) {
  if (operator === "min") {
    return `${label}: at least ${value}${unitSuffix(unit)}`;
  }

  if (operator === "max") {
    return `${label}: under ${value}${unitSuffix(unit)}`;
  }

  return `${label}: ${value}${unitSuffix(unit)}`;
}

export function extractSpecConstraints(
  text: string | undefined,
  source: SpecConstraint["source"] = "query",
): SpecConstraint[] {
  const raw = (text || "").trim();

  if (!raw) {
    return [];
  }

  const lower = raw.toLowerCase();
  const found = new Map<string, SpecConstraint>();

  const add = (constraint: SpecConstraint) => {
    const existing = found.get(constraint.id);

    if (!existing) {
      found.set(constraint.id, constraint);
      return;
    }

    // On a duplicate spec+operator+value, keep the stricter reading.
    if (existing.strictness !== "hard" && constraint.strictness === "hard") {
      found.set(constraint.id, constraint);
    }
  };

  for (const definition of SPEC_DICTIONARY) {
    if (definition.kind === "numeric") {
      for (const matcher of definition.matchers) {
        for (const match of lower.matchAll(globalRegex(matcher))) {
          const value = Number(String(match[1]).replace(/,/g, ""));

          if (!Number.isFinite(value)) {
            continue;
          }

          const index = match.index ?? 0;
          const matched = match[0];
          const preWindow = lower.slice(Math.max(0, index - 28), index);
          const hasPlus = /\d\s*\+/.test(matched);
          const hasMinWord = MIN_WORDS.test(preWindow);
          const hasMaxWord = MAX_WORDS.test(preWindow);
          const operator: SpecConstraint["operator"] =
            hasPlus || hasMinWord
              ? "min"
              : hasMaxWord
                ? "max"
                : definition.direction === "lower"
                  ? "max"
                  : definition.direction === "exact"
                    ? "equals"
                    : "min";
          const explicit = hasPlus || hasMinWord || hasMaxWord;
          const strictness: SpecConstraint["strictness"] =
            explicit || source === "smart_feature" || HARD_WORDS.test(preWindow)
              ? "hard"
              : "soft";

          add({
            id: `spec-${definition.id}-${operator}-${value}`,
            spec: definition.id,
            kind: "numeric",
            operator,
            unit: definition.unit,
            value,
            strictness,
            source,
            label: numericLabel(definition.label, operator, value, definition.unit),
          });
        }
      }

      continue;
    }

    // Boolean spec. In an "avoid" context the polarity flips: avoiding
    // "bare tool" means the buyer wants a battery-included product.
    const positiveMatch = raw.match(definition.truePattern);
    const negativeMatch = raw.match(definition.falsePattern);
    let value: 0 | 1 | null = null;
    let anchorIndex = 0;

    if (source === "avoid") {
      if (negativeMatch) {
        value = 1;
        anchorIndex = negativeMatch.index ?? 0;
      } else if (positiveMatch) {
        value = 0;
        anchorIndex = positiveMatch.index ?? 0;
      }
    } else if (positiveMatch) {
      value = 1;
      anchorIndex = positiveMatch.index ?? 0;
    } else if (negativeMatch) {
      value = 0;
      anchorIndex = negativeMatch.index ?? 0;
    }

    if (value === null) {
      continue;
    }

    const preWindow = lower.slice(Math.max(0, anchorIndex - 28), anchorIndex);
    const strictness: SpecConstraint["strictness"] =
      source === "smart_feature" || HARD_WORDS.test(preWindow) ? "hard" : "soft";

    add({
      id: `spec-${definition.id}-bool-${value}`,
      spec: definition.id,
      kind: "boolean",
      operator: "equals",
      unit: null,
      value,
      strictness,
      source,
      label: value === 1 ? definition.label : `Not ${definition.label.toLowerCase()}`,
    });
  }

  return Array.from(found.values());
}

function readSpecFromText(definition: SpecDefinition, text: string) {
  if (definition.kind === "numeric") {
    for (const matcher of definition.matchers) {
      const match = text.match(matcher);
      const value = match ? Number(String(match[1]).replace(/,/g, "")) : Number.NaN;

      if (match && Number.isFinite(value)) {
        return { value, raw: match[0].trim() } as const;
      }
    }

    return null;
  }

  // A negative ("bare tool") signal is decisive for product evidence.
  const negativeMatch = text.match(definition.falsePattern);

  if (negativeMatch) {
    return { value: false, raw: negativeMatch[0].trim() } as const;
  }

  const positiveMatch = text.match(definition.truePattern);

  if (positiveMatch) {
    return { value: true, raw: positiveMatch[0].trim() } as const;
  }

  return null;
}

// Structural input so both ProductRecommendation and the narrower ProductLike
// used by requirement validation can be passed without coupling.
type SpecExtractableProduct = Pick<
  ProductRecommendation,
  | "name"
  | "metadata"
  | "why_recommended"
  | "best_for"
  | "pros"
  | "cons"
  | "common_complaints"
  | "citations"
>;

export function extractProductSpecs(product: SpecExtractableProduct): ProductSpecMap {
  const citationText = product.citations
    .map((citation) => `${citation.title} ${citation.what_it_supports}`)
    .join(" ");
  const evidenceText = [
    product.why_recommended,
    product.best_for,
    ...product.pros,
    ...product.cons,
    ...product.common_complaints,
    citationText,
  ]
    .filter(Boolean)
    .join(" ");
  // Highest-confidence text first: a verified product title beats prose.
  const segments: Array<{ source: ProductSpecSource; text: string }> = [
    { source: "title", text: product.metadata?.title?.value || "" },
    { source: "name", text: product.name || "" },
    { source: "evidence", text: evidenceText },
  ];
  const specs: ProductSpecMap = {};

  for (const definition of SPEC_DICTIONARY) {
    for (const segment of segments) {
      if (!segment.text) {
        continue;
      }

      const reading = readSpecFromText(definition, segment.text);

      if (reading) {
        specs[definition.id] = {
          spec: definition.id,
          kind: definition.kind,
          value: reading.value,
          unit: definition.unit,
          raw: reading.raw,
          source: segment.source,
        };
        break;
      }
    }
  }

  return specs;
}

export type SpecConstraintStatus = "pass" | "fail" | "unknown";

// Three-state evaluation of one spec requirement against a product's observed
// specs. "unknown" means the product simply lacks that spec value — it is never
// the same as a verified "fail".
export function evaluateSpecConstraint(
  constraint: SpecConstraint,
  productSpecs: ProductSpecMap,
): SpecConstraintStatus {
  const observed = productSpecs[constraint.spec];

  if (!observed) {
    return "unknown";
  }

  if (constraint.kind === "boolean") {
    const wantTrue = constraint.value === 1;

    return observed.value === wantTrue ? "pass" : "fail";
  }

  const observedValue =
    typeof observed.value === "number" ? observed.value : Number.NaN;

  if (!Number.isFinite(observedValue)) {
    return "unknown";
  }

  if (constraint.operator === "max") {
    return observedValue <= constraint.value ? "pass" : "fail";
  }

  if (constraint.operator === "min") {
    return observedValue >= constraint.value ? "pass" : "fail";
  }

  return observedValue === constraint.value ? "pass" : "fail";
}

export type SpecValidation = {
  passed: SpecConstraint[];
  failed: SpecConstraint[];
  unknown: SpecConstraint[];
};

export function validateSpecConstraints(
  productSpecs: ProductSpecMap,
  specConstraints: SpecConstraint[],
): SpecValidation {
  const passed: SpecConstraint[] = [];
  const failed: SpecConstraint[] = [];
  const unknown: SpecConstraint[] = [];

  for (const constraint of specConstraints) {
    const status = evaluateSpecConstraint(constraint, productSpecs);

    if (status === "pass") {
      passed.push(constraint);
    } else if (status === "fail") {
      failed.push(constraint);
    } else {
      unknown.push(constraint);
    }
  }

  return { passed, failed, unknown };
}

// Extract specs from a single block of arbitrary text (e.g. a candidate's
// title/snippet during evidence rescue). Unlike extractProductSpecs, there is
// no segment priority — every dictionary match in the text is recorded.
export function extractSpecsFromText(
  text: string,
  source: ProductSpecSource = "evidence",
): ProductSpecMap {
  const specs: ProductSpecMap = {};

  if (!text) {
    return specs;
  }

  for (const definition of SPEC_DICTIONARY) {
    const reading = readSpecFromText(definition, text);

    if (reading) {
      specs[definition.id] = {
        spec: definition.id,
        kind: definition.kind,
        value: reading.value,
        unit: definition.unit,
        raw: reading.raw,
        source,
      };
    }
  }

  return specs;
}

export function specEvidenceSatisfies(
  constraint: SpecConstraint,
  text: string,
): boolean {
  return evaluateSpecConstraint(constraint, extractSpecsFromText(text)) === "pass";
}

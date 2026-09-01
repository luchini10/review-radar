// Data-only registry of numeric/boolean performance specs.
//
// This is intentionally a flat, config-driven list: adding a spec (or a new
// category's specs) is a data edit here, never a code branch elsewhere. It is
// deliberately cross-category (blowers, pressure washers, vacuums, tools,
// appliances) so nothing downstream hardcodes a single product category.
//
// `matchers` for numeric specs must each capture the numeric amount in group 1.
// Regexes are declared case-insensitive and WITHOUT the global flag; callers add
// `g` per use so shared regex `lastIndex` state never leaks between calls.

export type SpecDirection = "higher" | "lower" | "exact";

export type NumericSpecDefinition = {
  id: string;
  label: string;
  unit: string;
  kind: "numeric";
  direction: SpecDirection;
  matchers: RegExp[];
};

export type BooleanSpecDefinition = {
  id: string;
  label: string;
  unit: null;
  kind: "boolean";
  truePattern: RegExp;
  falsePattern: RegExp;
};

export type SpecDefinition = NumericSpecDefinition | BooleanSpecDefinition;

export const SPEC_DICTIONARY: SpecDefinition[] = [
  {
    id: "cfm",
    label: "CFM",
    unit: "CFM",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{2,4})\s*\+?\s*cfm\b/i],
  },
  {
    id: "mph",
    label: "MPH",
    unit: "MPH",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{2,3})\s*\+?\s*mph\b/i],
  },
  {
    id: "psi",
    label: "PSI",
    unit: "PSI",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{3,4})\s*\+?\s*psi\b/i],
  },
  {
    id: "gpm",
    label: "GPM",
    unit: "GPM",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d(?:\.\d+)?)\s*\+?\s*gpm\b/i],
  },
  {
    id: "runtimeMin",
    label: "Runtime",
    unit: "min",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{1,3})\s*\+?\s*min(?:ute)?s?\s*(?:of\s*)?(?:runtime|run\s*time|run-time|per\s*charge|on\s*a\s*charge|battery\s*life)/i,
      /(?:runtime|run\s*time|run-time|battery\s*life)\b[^.\d]{0,14}(\d{1,3})\s*\+?\s*min(?:ute)?s?\b/i,
    ],
  },
  {
    id: "suctionAirwatts",
    label: "Suction",
    unit: "AW",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{2,3})\s*\+?\s*(?:aw|air\s*watts?)\b/i],
  },
  {
    id: "weightLb",
    label: "Weight",
    unit: "lb",
    kind: "numeric",
    direction: "lower",
    matchers: [/(\d{1,3}(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i],
  },
  {
    id: "noiseDb",
    label: "Noise",
    unit: "dB",
    kind: "numeric",
    direction: "lower",
    matchers: [/(\d{2,3})\s*\+?\s*(?:db|dba|decibels?)\b/i],
  },
  {
    id: "capacityL",
    label: "Capacity",
    unit: "L",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{1,3}(?:\.\d+)?)\s*(?:liters?|litres?)\b/i,
      /(?:capacity|tank|bin|dust\s*bin)\b[^.\d]{0,12}(\d{1,3}(?:\.\d+)?)\s*(?:l|liters?|litres?)\b/i,
    ],
  },
  {
    id: "capacityCups",
    label: "Cup capacity",
    unit: "cups",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{1,2})\s*-?\s*cups?\b/i],
  },
  {
    id: "btu",
    label: "BTU",
    unit: "BTU",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d[\d,]{2,6})\s*\+?\s*btus?\b/i],
  },
  {
    id: "cookingAreaSqIn",
    label: "Cooking area",
    unit: "sq in",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{3,4})\s*(?:sq\.?\s*in(?:ches)?|square\s*inch(?:es)?)\b/i],
  },
  {
    id: "burners",
    label: "Burners",
    unit: "burners",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{1,2})\s*-?\s*burners?\b/i],
  },
  {
    id: "wattage",
    label: "Wattage",
    unit: "W",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{3,5})\s*\+?\s*(?:w|watt|watts)\b/i,
      /(\d{3,5})\s*-?\s*watt\b/i,
    ],
  },
  {
    id: "sliceCapacity",
    label: "Slice capacity",
    unit: "slices",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{1,2})\s*-?\s*slice\b/i],
  },
  {
    id: "functionCount",
    label: "Cooking functions",
    unit: "functions",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{1,2})\s*-?\s*in\s*-?\s*1\b/i,
      /(\d{1,2})\s+(?:cooking\s*)?functions?\b/i,
      /(\d{1,2})\s+(?:preset|presets|settings)\b/i,
    ],
  },
  {
    id: "capacityQt",
    label: "Capacity",
    unit: "qt",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{1,3}(?:\.\d+)?)\s*(?:qt|quart|quarts)\b/i,
      /(?:capacity)\b[^.\d]{0,12}(\d{1,3}(?:\.\d+)?)\s*(?:qt|quart|quarts)\b/i,
    ],
  },
  {
    id: "temperatureF",
    label: "Max temperature",
    unit: "F",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{3})\s*(?:°\s*)?f\b/i,
      /(?:up\s*to|max(?:imum)?|temperature)\b[^.\d]{0,18}(\d{3})\s*(?:degrees?|°)?\s*(?:f|fahrenheit)?\b/i,
    ],
  },
  {
    id: "screenSizeIn",
    label: "Screen size",
    unit: "in",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{2,3}(?:\.\d+)?)\s*(?:(?:in\.?|inch(?:es)?)\b|["”](?=\W|$))/i,
      /(\d{2,3}(?:\.\d+)?)\s*-\s*inch\b/i,
    ],
  },
  {
    id: "refreshRateHz",
    label: "Refresh rate",
    unit: "Hz",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{2,3})\s*\+?\s*hz\b/i],
  },
  {
    id: "displayResolutionHeightPx",
    label: "Display resolution",
    unit: "p",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{3,4})\s*p\b/i,
      /\b\d{3,5}\s*[x×]\s*(\d{3,4})\b/i,
    ],
  },
  {
    id: "storageGb",
    label: "Storage",
    unit: "GB",
    kind: "numeric",
    direction: "higher",
    matchers: [
      /(\d{2,5})\s*\+?\s*gb\s*(?:ssd|storage|drive)\b/i,
      /(?:storage|ssd|solid\s*state\s*drive)\b[^.\d]{0,18}(\d{2,5})\s*\+?\s*gb\b/i,
    ],
  },
  {
    id: "memoryGb",
    label: "Memory",
    unit: "GB RAM",
    kind: "numeric",
    direction: "higher",
    matchers: [/(\d{1,3})\s*\+?\s*gb\s*(?:ram|memory)\b/i],
  },
  {
    id: "batteryIncluded",
    label: "Battery included",
    unit: null,
    kind: "boolean",
    truePattern:
      /\b(?:batter(?:y|ies)\s+(?:and\s+charger\s+)?included|includes?\s+(?:\(\d+\)\s+)?(?:(?:a|one|two|three|four|\d+)\s+)?(?:\d+(?:\.\d+)?\s*(?:ah|v)\s+)?(?:lithium(?:-ion)?\s+)?batter(?:y|ies)|(?:with|w\/)\s+(?:\(\d+\)\s+)?(?:(?:a|one|two|three|four|\d+)\s+)?(?:\d+(?:\.\d+)?\s*(?:ah|v)\s+)?(?:lithium(?:-ion)?\s+)?batter(?:y|ies)|\bkit\b.{0,45}\bbatter(?:y|ies)|batter(?:y|ies)\s+(?:and\s+charger\s+)?kit|comes?\s+with\s+(?:a\s+)?battery)\b/i,
    falsePattern:
      /\b(?:bare\s*tool|tool[\s-]?only|without\s+(?:a\s+)?battery|no\s+battery|batter(?:y|ies)\s+not\s+included|sold\s+as\s+(?:a\s+)?bare\s*tool)\b/i,
  },
];

export function getSpecDefinition(specId: string): SpecDefinition | undefined {
  return SPEC_DICTIONARY.find((definition) => definition.id === specId);
}

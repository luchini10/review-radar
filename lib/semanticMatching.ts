import type {
  StructuredConstraint,
  StructuredConstraintMatchingMode,
  StructuredConstraintStrictness,
  StructuredConstraintType,
} from "@/types/review-radar";

export type SemanticMatchStatus =
  | "fail"
  | "needs_verification"
  | "pass"
  | "unknown";

export type NormalizedRequirement = {
  aliases: string[];
  matchingMode: StructuredConstraintMatchingMode;
  normalizedMeaning: string;
  originalText: string;
  strictness: StructuredConstraintStrictness;
  type: StructuredConstraintType;
};

type NumericSignal = {
  label: string;
  max?: number;
  min?: number;
  subjects: string[];
  unit: "db" | "ft" | "lb";
};

type SemanticFeatureDefinition = {
  aliases: string[];
  canonical: string;
  conflictingAliases?: string[];
  concrete?: boolean;
  matchingMode?: StructuredConstraintMatchingMode;
  numericSignals?: NumericSignal[];
  strictness?: StructuredConstraintStrictness;
  type: StructuredConstraintType;
};

const semanticFeatureDefinitions: SemanticFeatureDefinition[] = [
  {
    aliases: [
      "cordless",
      "battery powered",
      "battery-powered",
      "battery operated",
      "battery-operated",
      "lithium ion",
      "lithium-ion",
      "rechargeable",
    ],
    canonical: "cordless",
    conflictingAliases: ["corded", "corded electric"],
    concrete: true,
    type: "feature",
  },
  {
    aliases: ["wireless", "bluetooth", "2.4 ghz wireless", "2.4ghz wireless"],
    canonical: "wireless",
    conflictingAliases: ["wired only", "corded only"],
    concrete: true,
    type: "feature",
  },
  {
    aliases: ["left handed", "left-handed", "for left hand", "left hand model"],
    canonical: "left handed",
    conflictingAliases: ["right handed", "right-handed", "for right hand"],
    concrete: true,
    type: "feature",
  },
  {
    aliases: ["brushless", "brushless motor", "brushless drill"],
    canonical: "brushless",
    conflictingAliases: ["brushed motor", "brushed drill"],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "charger",
      "charger included",
      "includes charger",
      "battery charger",
    ],
    canonical: "charger included",
    conflictingAliases: ["charger not included", "without charger", "tool only"],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "built in burr grinder",
      "built-in burr grinder",
      "integrated burr grinder",
      "integrated grinder",
      "built in grinder",
      "built-in grinder",
    ],
    canonical: "built in burr grinder",
    conflictingAliases: [
      "no built in grinder",
      "without grinder",
      "separate grinder",
      "external grinder",
    ],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "built in pump",
      "built-in pump",
      "integrated pump",
      "pump included",
    ],
    canonical: "built in pump",
    conflictingAliases: [
      "no built in pump",
      "without pump",
      "gravity drain only",
    ],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "continuous drain",
      "continuous drainage",
      "continuous drain option",
      "continuous drain hose",
    ],
    canonical: "continuous drain",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "pet hair",
      "pet fur",
      "dog hair",
      "dog fur",
      "cat hair",
      "cat fur",
      "animal hair",
      "animal fur",
      "fur pickup",
      "pet hair pickup",
      "pet hair cleaning",
      "pet-hair-focused",
      "pet focused",
      "pet-oriented",
      "pet homes",
      "pet home",
      "for pets",
    ],
    canonical: "pet hair",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "lightweight",
      "light weight",
      "light-weight",
      "easy to carry",
      "portable",
      "low weight",
      "compact and light",
    ],
    canonical: "lightweight",
    concrete: true,
    numericSignals: [
      {
        label: "low weight",
        max: 10,
        subjects: ["weight", "weighs", "design", "body", "build", "vacuum", "laptop"],
        unit: "lb",
      },
    ],
    type: "quality",
  },
  {
    aliases: [
      "quiet",
      "quiet operation",
      "low noise",
      "low-noise",
      "low db",
      "low dB",
      "low dba",
      "low decibel",
      "low decibels",
      "silent",
      "sleep mode",
      "whisper quiet",
    ],
    canonical: "quiet",
    concrete: true,
    numericSignals: [
      {
        label: "low noise rating",
        max: 55,
        subjects: ["noise", "sound", "operation"],
        unit: "db",
      },
    ],
    type: "quality",
  },
  {
    aliases: [
      "nugget ice",
      "nugget-style ice",
      "nugget style ice",
      "chewable ice",
      "soft chewable ice",
      "pellet ice",
      "pebble ice",
      "sonic ice",
    ],
    canonical: "nugget ice",
    conflictingAliases: [
      "bullet ice",
      "bullet-shaped ice",
      "bullet shaped ice",
      "cube ice",
      "cubed ice",
      "ice cubes",
    ],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "self emptying",
      "self-emptying",
      "self empty",
      "self-empty",
      "auto empty",
      "auto-empty",
      "automatic emptying",
      "automatic dirt disposal",
      "self empty base",
      "self-empty base",
      "auto empty dock",
      "auto-empty dock",
      "self empty station",
      "self-empty station",
    ],
    canonical: "self emptying",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "self cleaning",
      "self-cleaning",
      "auto cleaning",
      "auto-cleaning",
      "automatic cleaning",
      "automatic-cleaning",
      "cleaning cycle",
      "self clean",
      "self-clean",
    ],
    canonical: "self cleaning",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "programmable",
      "programmable brew",
      "programmable brewing",
      "programmable timer",
      "delay brew",
      "delayed brew",
      "24 hour programmable",
      "24-hour programmable",
    ],
    canonical: "programmable",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "compact",
      "small footprint",
      "space saving",
      "space-saving",
      "countertop friendly",
      "small space",
      "small spaces",
    ],
    canonical: "compact",
    concrete: true,
    type: "quality",
  },
  {
    aliases: [
      "steam wand",
      "manual steam wand",
      "milk frother",
      "milk frothing",
      "milk steaming wand",
      "milk steamer",
      "frothing wand",
      "frother wand",
      "cappuccino wand",
      "latte wand",
    ],
    canonical: "steam wand",
    conflictingAliases: [
      "no steam wand",
      "without steam wand",
      "external milk frother",
      "separate milk frother",
    ],
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "co shutoff",
      "co shutdown",
      "carbon monoxide shutoff",
      "carbon monoxide shutdown",
      "co minder",
      "co-minder",
    ],
    canonical: "co shutoff",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "easy cleaning",
      "easy clean",
      "easy cleanup",
      "easy to clean",
      "dishwasher safe",
      "dishwasher-safe",
      "removable drip tray",
      "removable water tank",
      "removable water reservoir",
      "removable tank",
      "cleaning cycle",
      "auto clean",
      "self cleaning",
      "self-cleaning",
    ],
    canonical: "easy cleaning",
    concrete: true,
    type: "quality",
  },
  {
    aliases: [
      "adjustable lumbar",
      "adjustable lumbar support",
      "lumbar support",
      "adjustable back support",
      "back support",
    ],
    canonical: "adjustable lumbar",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "foam cannon",
      "foam sprayer",
      "foam lance",
      "foam blaster",
      "soap cannon",
      "snow foam lance",
      "snow foam cannon",
    ],
    canonical: "foam cannon",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "soap applicator",
      "detergent applicator",
      "soap dispenser",
      "soap tank",
      "detergent tank",
      "soap nozzle",
    ],
    canonical: "soap applicator",
    concrete: true,
    type: "feature",
  },
  {
    aliases: [
      "long hose",
      "longer hose",
      "extended hose",
      "extension hose",
      "high pressure hose",
      "kink resistant hose",
    ],
    canonical: "long hose",
    concrete: true,
    numericSignals: [
      {
        label: "hose length",
        min: 20,
        subjects: ["hose"],
        unit: "ft",
      },
    ],
    type: "feature",
  },
  {
    aliases: [
      "glass shelves",
      "glass shelf",
      "glass shelving",
      "tempered glass shelves",
      "spillproof glass shelves",
    ],
    canonical: "glass shelves",
    concrete: true,
    strictness: "dealbreaker",
    type: "dealbreaker",
  },
  {
    aliases: [
      "pod-only",
      "pod only",
      "pods only",
      "capsule only",
      "capsules only",
      "k-cup only",
      "k cup only",
      "single serve pods only",
      "only uses pods",
      "only works with pods",
    ],
    canonical: "pod-only",
    concrete: true,
    strictness: "dealbreaker",
    type: "compatibility",
  },
  {
    aliases: [
      "gas",
      "gas powered",
      "gas-powered",
      "gas engine",
      "gas motor",
      "natural gas",
      "propane",
    ],
    canonical: "gas",
    concrete: true,
    strictness: "dealbreaker",
    type: "dealbreaker",
  },
];

const semanticDefinitionsByAlias = new Map<string, SemanticFeatureDefinition>();

for (const definition of semanticFeatureDefinitions) {
  for (const alias of [definition.canonical, ...definition.aliases]) {
    const normalizedAlias = normalizeMeaning(alias);

    if (!semanticDefinitionsByAlias.has(normalizedAlias)) {
      semanticDefinitionsByAlias.set(normalizedAlias, definition);
    }
  }
}

export const knownSemanticFeatureValues = Array.from(
  new Set(
    semanticFeatureDefinitions.flatMap((definition) => [
      definition.canonical,
      ...definition.aliases,
    ]),
  ),
);

export const requiredSemanticFeatureValues = Array.from(
  new Set(
    semanticFeatureDefinitions.flatMap((definition) => [
      definition.canonical,
      ...definition.aliases,
    ]),
  ),
);

export function normalizeMeaning(value: string | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/&/g, " and ")
    .replace(/(\d)\s*(?:feet|foot|ft\.)\b/g, "$1 ft")
    .replace(/(\d)\s*(?:inches|inch|in\.)\b/g, "$1 in")
    .replace(/\bk[\s-]?cup\b/g, "k cup")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9$.'"\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function singularizeToken(token: string) {
  if (token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("sses")) {
    return token.slice(0, -2);
  }

  if (token.length > 3 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

export function normalizedTokens(value: string) {
  return normalizeMeaning(value)
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeToken);
}

function compactMeaning(value: string) {
  return normalizeMeaning(value).replace(/[^a-z0-9]+/g, "");
}

function phrasePattern(value: string) {
  return escapeRegExp(normalizeMeaning(value)).replace(/\s+/g, "\\s+");
}

export function containsMeaning(text: string, phrase: string) {
  const normalizedPhrase = normalizeMeaning(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  return new RegExp(`(^|\\W)${phrasePattern(normalizedPhrase)}(\\W|$)`, "i").test(
    normalizeMeaning(text),
  );
}

function aliasForms(value: string) {
  const normalized = normalizeMeaning(value);
  const tokens = normalizedTokens(normalized);

  return Array.from(
    new Set([
      normalized,
      tokens.join(" "),
      normalized.replace(/\s+/g, "-"),
    ].filter(Boolean)),
  );
}

export function semanticDefinitionFor(value: string) {
  const normalized = normalizeMeaning(value);
  const compact = compactMeaning(value);
  const direct = semanticDefinitionsByAlias.get(normalized);

  if (direct) {
    return direct;
  }

  return semanticFeatureDefinitions.find((definition) =>
    [definition.canonical, ...definition.aliases].some((alias) => {
      const aliasCompact = compactMeaning(alias);

      return aliasCompact === compact || compact.includes(aliasCompact);
    }),
  );
}

export function semanticAliasesFor(value: string) {
  const definition = semanticDefinitionFor(value);
  const aliases = definition
    ? [definition.canonical, ...definition.aliases]
    : [value];

  return Array.from(new Set(aliases.flatMap(aliasForms)));
}

export function semanticCanonicalValue(value: string) {
  return semanticDefinitionFor(value)?.canonical || normalizeMeaning(value);
}

export function semanticConstraintType(
  fallbackType: StructuredConstraintType,
  value: string,
) {
  return semanticDefinitionFor(value)?.type || fallbackType;
}

export function isConcreteSemanticAttribute(value: string) {
  const definition = semanticDefinitionFor(value);

  return Boolean(definition?.concrete);
}

export function normalizeRequirement(
  input: Pick<StructuredConstraint, "label" | "source" | "type" | "value"> & {
    strictness?: StructuredConstraintStrictness;
  },
): NormalizedRequirement {
  const definition = semanticDefinitionFor(input.value);
  const strictness =
    input.strictness ||
    definition?.strictness ||
    (input.source === "avoid" || input.label.startsWith("Avoid:")
      ? "dealbreaker"
      : "hard");
  const normalizedMeaning = definition?.canonical || normalizeMeaning(input.value);

  return {
    aliases: semanticAliasesFor(input.value),
    matchingMode: definition?.matchingMode || "deterministic",
    normalizedMeaning,
    originalText: input.value,
    strictness,
    type: definition?.type || input.type,
  };
}

export function enrichConstraintWithSemantics(
  constraint: StructuredConstraint,
  strictness?: StructuredConstraintStrictness,
): StructuredConstraint {
  const normalized = normalizeRequirement({
    label: constraint.label,
    source: constraint.source,
    strictness,
    type: constraint.type,
    value: constraint.value,
  });

  return {
    ...constraint,
    aliases: normalized.aliases,
    matchingMode: normalized.matchingMode,
    normalizedMeaning: normalized.normalizedMeaning,
    originalText: constraint.originalText || constraint.value,
    strictness: normalized.strictness,
    type: normalized.type,
  };
}

function unitPattern(unit: NumericSignal["unit"]) {
  if (unit === "ft") {
    return "(?:ft|feet|foot|')";
  }

  if (unit === "lb") {
    return "(?:lb|lbs|pounds?|pound)";
  }

  return "(?:db|dba|decibels?|decibel)";
}

function numericSignalMatches(text: string, signal: NumericSignal) {
  const normalized = normalizeMeaning(text);
  const units = unitPattern(signal.unit);
  const number = "(\\d+(?:\\.\\d+)?)";
  const measure = `${number}\\s*(?:${units})`;
  const subjects = signal.subjects
    .map((subject) => phrasePattern(subject))
    .join("|");
  const measurementBeforeSubject = new RegExp(
    `\\b${measure}\\b(?:\\s+\\w+){0,6}\\s+\\b(?:${subjects})\\b`,
    "i",
  );
  const subjectBeforeMeasurement = new RegExp(
    `\\b(?:${subjects})\\b(?:\\s+\\w+){0,6}\\s+\\b${measure}\\b`,
    "i",
  );

  for (const pattern of [measurementBeforeSubject, subjectBeforeMeasurement]) {
    const match = normalized.match(pattern);
    const amount = match?.[1] ? Number(match[1]) : null;

    if (amount === null || !Number.isFinite(amount)) {
      continue;
    }

    if (signal.min !== undefined && amount < signal.min) {
      continue;
    }

    if (signal.max !== undefined && amount > signal.max) {
      continue;
    }

    return `${amount} ${signal.unit}`;
  }

  return "";
}

function negativeContextPattern(term: string) {
  const pattern = phrasePattern(term);

  return [
    new RegExp(
      `\\b(?:not|no|without|lacks?|lacking|missing|unavailable|absent|excludes?|excluding|doesn'?t\\s+include|does\\s+not\\s+include)\\b(?:\\W+\\w+){0,5}\\W+${pattern}\\b`,
      "i",
    ),
    new RegExp(
      `\\b${pattern}\\b(?:\\W+\\w+){0,5}\\W+\\b(?:not\\s+included|excluded|missing|absent|not\\s+available|unavailable|sold\\s+separately)\\b`,
      "i",
    ),
  ];
}

function textForNegativeContext(text: string, term: string) {
  const termPattern = new RegExp(`\\b${phrasePattern(term)}\\b`, "i");

  return text.replace(/\bno\s+(?:\w+\s+){0,4}(?:required|needed)\b/gi, (match) =>
    termPattern.test(match) ? match : match.replace(/\bno\s+/i, ""),
  );
}

function verificationUncertaintyPattern(term: string) {
  const pattern = phrasePattern(term);

  return [
    new RegExp(
      `\\b(?:not|cannot|can't|could\\s+not|did\\s+not|does\\s+not)\\b(?:\\W+\\w+){0,3}\\W+(?:verify|verified|confirm|confirmed|prove|proven)\\b(?:\\W+\\w+){0,5}\\W+${pattern}\\b`,
      "i",
    ),
    new RegExp(
      `\\b${pattern}\\b(?:\\W+\\w+){0,5}\\W+\\b(?:not\\s+verified|not\\s+confirmed|not\\s+proven|unverified|unknown|unclear)\\b`,
      "i",
    ),
  ];
}

function hasSemanticVerificationUncertainty(text: string, value: string) {
  const normalized = normalizeMeaning(text);

  return semanticAliasesFor(value).some((alias) =>
    verificationUncertaintyPattern(alias).some((pattern) => pattern.test(normalized)),
  );
}

function hasSemanticConflict(text: string, value: string) {
  const definition = semanticDefinitionFor(value);
  const normalized = normalizeMeaning(text);

  return Boolean(
    definition?.conflictingAliases?.some((alias) =>
      containsMeaning(normalized, alias),
    ),
  );
}

export function hasSemanticNegativeContext(text: string, value: string) {
  const normalized = normalizeMeaning(text);

  return semanticAliasesFor(value).some((alias) => {
    const negativeText = textForNegativeContext(normalized, alias);

    return (
      negativeContextPattern(alias).some((pattern) => pattern.test(negativeText)) &&
      !verificationUncertaintyPattern(alias).some((pattern) => pattern.test(normalized))
    );
  });
}

function tokensSupport(text: string, value: string) {
  const requirementTokens = normalizedTokens(value).filter((token) => token.length >= 3);

  if (requirementTokens.length === 0) {
    return false;
  }

  const textTokens = new Set(normalizedTokens(text));

  return requirementTokens.every((token) => textTokens.has(token));
}

export function matchSemanticFeatureEvidence(text: string, value: string) {
  const definition = semanticDefinitionFor(value);
  const normalizedText = normalizeMeaning(text);

  if (hasSemanticVerificationUncertainty(normalizedText, value)) {
    return {
      evidence: `${semanticCanonicalValue(value)}: not verified`,
      status: "needs_verification" as const,
    };
  }

  if (hasSemanticNegativeContext(normalizedText, value)) {
    return {
      evidence: `${semanticCanonicalValue(value)}: negated or unavailable`,
      status: "fail" as const,
    };
  }

  if (hasSemanticConflict(normalizedText, value)) {
    return {
      evidence: `${semanticCanonicalValue(value)}: conflicting product subtype`,
      status: "fail" as const,
    };
  }

  for (const alias of semanticAliasesFor(value)) {
    if (containsMeaning(normalizedText, alias)) {
      return {
        evidence: alias,
        status: "pass" as const,
      };
    }
  }

  for (const signal of definition?.numericSignals || []) {
    const matched = numericSignalMatches(normalizedText, signal);

    if (matched) {
      return {
        evidence: `${signal.label}: ${matched}`,
        status: "pass" as const,
      };
    }
  }

  if (!definition && tokensSupport(normalizedText, value)) {
    return {
      evidence: value,
      status: "pass" as const,
    };
  }

  return {
    evidence: `${semanticCanonicalValue(value)}: not verified`,
    status: "needs_verification" as const,
  };
}

export function violatesSemanticDealbreaker(text: string, value: string) {
  if (hasSemanticNegativeContext(text, value)) {
    return false;
  }

  return matchSemanticFeatureEvidence(text, value).status === "pass";
}

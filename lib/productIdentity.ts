import type {
  CanonicalProductIdentity,
  ProductMetadata,
  ProductRecommendation,
} from "@/types/review-radar";
import { canonicalBrand, detectKnownBrands } from "./brandMatching.ts";
import { sourceUrlPathIdentityText } from "./sourceUrlIdentity.ts";
import { classifyProductTypeMatch } from "./productTypeMatch.ts";

const genericWords = new Set([
  "and",
  "bed",
  "best",
  "chair",
  "couch",
  "for",
  "in",
  "inch",
  "new",
  "of",
  "product",
  "sale",
  "set",
  "shop",
  "sofa",
  "champs",
  "locker",
  "foot",
  "finish",
  "line",
  "retailer",
  "sports",
  "store",
  "the",
  "with",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return normalizeText(value)
    .split(" ")
    // Keep multi-character words AND any single DIGIT — a single-digit size/spec
    // ("5 Gallon" vs "6 Gallon") is often the only thing distinguishing two real
    // products, so dropping it merged different models into one canonical id and
    // collapsed the result list. Single letters are still dropped as noise.
    .filter((word) => (word.length > 1 || /\d/.test(word)) && !genericWords.has(word))
    .slice(0, 10)
    .join(" ");
}

function titleTokens(value: string) {
  return normalizeTitle(value)
    .split(" ")
    .filter(Boolean);
}

function modelLikeTokens(tokens: string[]) {
  return tokens.filter((token) => /\d/.test(token));
}

export function strongModelTokens(value: string) {
  const rawTokens = value.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [];
  const tokens = new Set<string>();

  for (const raw of rawTokens) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (
      normalized.length < 4 ||
      normalized.length > 24 ||
      !/[a-z]/.test(normalized) ||
      !/\d/.test(normalized) ||
      /^\d+(?:p|hz|gb|tb|mah|w|v|in|inch)$/i.test(normalized) ||
      /^(?:ddr|gen|hdmi|hdr|ips|oled|qled|series|uhd|usb|wifi)\d+[a-z]*$/i.test(
        normalized,
      )
    ) {
      continue;
    }

    tokens.add(normalized);
  }

  return tokens;
}

const MODEL_IDENTITY_MEASUREMENT_TOKEN =
  /^\d+(?:\.\d+)?(?:ah|amp|amps|battery|batteries|bit|blade|blades|btu|burner|burners|cc|cfm|channel|channels|cm|color|colors|core|cores|count|counts|cup|cups|day|days|db|degree|degrees|door|doors|dpi|drawer|drawers|ft|gal|gallon|gallons|gb|gpm|hp|hz|in|inch|inches|k|kg|l|lb|lbs|lumen|lumens|mah|mb|ml|mm|mode|modes|month|months|mp|mph|oz|p|pack|packs|pc|pcs|piece|pieces|pk|port|ports|pound|pounds|program|programs|psi|px|qt|quart|quarts|rpm|scfm|setting|settings|speed|speeds|stage|stages|tb|thread|threads|tier|tiers|v|volt|volts|w|watt|watts|wh|year|years|yr|yrs|zone|zones)$/i;

export function isModelIdentityMeasurementToken(value: string) {
  return MODEL_IDENTITY_MEASUREMENT_TOKEN.test(value.trim());
}

function looksLikeMixedCompoundModelComponent(token: string) {
  return (
    token.length >= 2 &&
    token.length <= 24 &&
    /[a-z]/i.test(token) &&
    /\d/.test(token) &&
    /^[a-z0-9]+$/i.test(token) &&
    !isModelIdentityMeasurementToken(token) &&
    !/^(?:ddr|gen|hdmi|hdr|ips|oled|qled|series|uhd|usb|wifi)\d+[a-z]*$/i.test(
      token,
    )
  );
}

function looksLikeNumericCompoundModelComponent(token: string) {
  return /^\d{1,8}(?:\.\d{1,4})?$/.test(token);
}

function looksLikeCompoundModelComponent(token: string) {
  return (
    looksLikeMixedCompoundModelComponent(token) ||
    looksLikeNumericCompoundModelComponent(token)
  );
}

const EXPLICIT_MODEL_ALIAS_SEPARATOR = /\s+(?:\/|\||;|or)\s+/i;

export function splitModelIdentityAliases(value: string) {
  return value
    .split(EXPLICIT_MODEL_ALIAS_SEPARATOR)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

export function stableModelIdentifiers(value: string) {
  return [
    ...new Set(
      (value.match(/[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)*/g) || [])
        .map((token) => token.toLowerCase().replace(/[^a-z0-9]+/g, ""))
        .filter(
          (token) =>
            token.length >= 3 &&
            token.length <= 32 &&
            /\d/.test(token) &&
            !isModelIdentityMeasurementToken(token) &&
            (/[a-z]/.test(token) || token.length >= 6),
        ),
    ),
  ];
}

function mixedModelComponentTokens(value: string) {
  const technologyComponents = technologyMixedModelComponentTokens(value);
  return new Set(
    value
      .split(EXPLICIT_MODEL_ALIAS_SEPARATOR)
      .flatMap((alias) => normalizeText(alias).split(" "))
      .filter(
        (token) =>
          looksLikeMixedCompoundModelComponent(token) &&
          !technologyComponents.has(token),
      ),
  );
}

function hasHardCompoundBoundary(value: string) {
  return /[,;&|+]/.test(value);
}

function hasDisallowedIdentityAssertionBoundary(value: string) {
  // A comma may punctuate an otherwise complete recognized assertion
  // ("model, also known as X"). Keep every other compound separator hard,
  // and call this only after the full connector grammar has matched so
  // ordinary "model, supports/includes/features X" prose gains no authority.
  return /[;&|+]/.test(value);
}

function modelIdentityBearingText(value: string) {
  // Product titles sometimes preserve a historical comparison in a clearly
  // delimited annotation (for example, "(Upgraded from Q5 Max+)"). That
  // referenced model is not part of the product identity being asserted.
  // Keep this exception narrow: ordinary prose and connectors remain inside
  // the identity-bearing text and therefore cannot hide a sibling component.
  const withoutHistoricalComparisons = value.replace(
    /\(\s*(?:(?:upgraded|updated)\s+from|successor\s+to|replaces?|compared\s+(?:to|with)|versus|vs\.?)\b[^)]*\)/gi,
    " ",
  );
  return stripBoundedTechnologyVersions(withoutHistoricalComparisons);
}

type ModelIdentityLexeme = {
  end: number;
  start: number;
  token: string;
};

function modelIdentityLexemes(value: string): ModelIdentityLexeme[] {
  return [...value.matchAll(/\d+\.\d+|[A-Za-z0-9]+/g)].map((match) => ({
    end: (match.index ?? 0) + match[0].length,
    start: match.index ?? 0,
    token: match[0].toLowerCase(),
  }));
}

const NON_IDENTITY_NUMERIC_PREFIX = new Set([
  "cost",
  "hdmi",
  "msrp",
  "pcie",
  "price",
  "sale",
  "usb",
  "wifi",
]);
const NON_IDENTITY_NUMERIC_SUFFIX = new Set([
  "aud",
  "cad",
  "dollar",
  "dollars",
  "eur",
  "gbp",
  "jpy",
  "usd",
]);
const NON_IDENTITY_NUMERIC_TECH_PREFIX = new Set([
  "android",
  "bluetooth",
  "ddr",
  "displayport",
  "firmware",
  "generation",
  "gen",
  "hdmi",
  "ios",
  "pcie",
  "software",
  "thunderbolt",
  "usb",
  "usbc",
  "wifi",
]);
const NON_IDENTITY_NUMERIC_TECH_PHRASE = new Set([
  ...NON_IDENTITY_NUMERIC_TECH_PREFIX,
  "bluetoothle",
  "bluetoothlowenergy",
  "displayportaltmode",
  "hdmiearc",
  "usbtypec",
  "wifi6e",
]);
const MODEL_IDENTITY_LABEL = new Set([
  "model",
  "trim",
  "variant",
  "version",
]);
const MODEL_IDENTITY_LABEL_QUALIFIERS = new Map([
  [
    "model",
    new Set([
      "code",
      "designation",
      "id",
      "identifier",
      "name",
      "no",
      "number",
    ]),
  ],
  [
    "trim",
    new Set(["code", "designation", "id", "identifier", "level", "name"]),
  ],
  [
    "variant",
    new Set([
      "code",
      "designation",
      "id",
      "identifier",
      "name",
      "number",
    ]),
  ],
  ["version", new Set(["number"])],
]);
const TECHNOLOGY_IDENTITY_GOVERNING_LABEL = new Set([
  "model",
  "trim",
  "variant",
]);
const MODEL_IDENTITY_COMPACT_LABEL = new Set(
  [...MODEL_IDENTITY_LABEL_QUALIFIERS].flatMap(([label, qualifiers]) =>
    [...qualifiers].map((qualifier) => `${label}${qualifier}`),
  ),
);
const TECHNOLOGY_IDENTITY_GOVERNING_COMPACT_LABEL = new Set(
  [...TECHNOLOGY_IDENTITY_GOVERNING_LABEL].flatMap((label) =>
    [...(MODEL_IDENTITY_LABEL_QUALIFIERS.get(label) || [])].map(
      (qualifier) => `${label}${qualifier}`,
    ),
  ),
);

function isModelIdentityLabelToken(token: string) {
  return (
    MODEL_IDENTITY_LABEL.has(token) || MODEL_IDENTITY_COMPACT_LABEL.has(token)
  );
}

function isTechnologyIdentityGoverningLabelToken(token: string) {
  return (
    TECHNOLOGY_IDENTITY_GOVERNING_LABEL.has(token) ||
    TECHNOLOGY_IDENTITY_GOVERNING_COMPACT_LABEL.has(token)
  );
}

const MODEL_IDENTITY_ASSERTION_PREDICATES = [
  ["called"],
  ["designated"],
  ["designated", "as"],
  ["equal", "to"],
  ["equals"],
  ["identified", "as"],
  ["known", "as"],
  ["labeled", "as"],
  ["labelled", "as"],
  ["named"],
  ["referred", "to", "as"],
] as const;
const MAX_MODEL_IDENTITY_ASSERTION_CONNECTOR_LEXEMES =
  2 +
  Math.max(
    ...MODEL_IDENTITY_ASSERTION_PREDICATES.map(
      (sequence) => sequence.length,
    ),
  );

type BoundedIdentityLabelSpan = {
  endIndex: number;
  isQualified: boolean;
  startIndex: number;
};

type BoundedForwardIdentityAssertion = {
  connectorEndIndex: number | null;
  connectorStartIndex: number | null;
  label: BoundedIdentityLabelSpan;
};

type BoundedReverseIdentityAssertion = {
  connectorEndIndex: number | null;
  connectorStartIndex: number | null;
  label: BoundedIdentityLabelSpan;
};

function isModelIdentityAssertionConnector(tokens: string[]) {
  if (tokens.length === 0) return false;
  let cursor = 0;
  let hasIs = false;
  if (tokens[cursor] === "is") {
    hasIs = true;
    cursor += 1;
  }
  if (tokens[cursor] === "also") cursor += 1;

  if (cursor === tokens.length) {
    return hasIs && tokens.length === 1;
  }

  const predicate = tokens.slice(cursor);
  return MODEL_IDENTITY_ASSERTION_PREDICATES.some(
    (allowed) =>
      allowed.length === predicate.length &&
      allowed.every((token, index) => token === predicate[index]),
  );
}

function identityLabelTokenAllowed(token: string, technologyOnly: boolean) {
  return technologyOnly
    ? isTechnologyIdentityGoverningLabelToken(token)
    : isModelIdentityLabelToken(token);
}

function boundedIdentityLabelSpanEndingAt(
  value: string,
  lexemes: ModelIdentityLexeme[],
  endIndex: number,
  technologyOnly: boolean,
): BoundedIdentityLabelSpan | null {
  const end = lexemes[endIndex];
  if (!end) return null;

  if (identityLabelTokenAllowed(end.token, technologyOnly)) {
    return {
      endIndex,
      isQualified: MODEL_IDENTITY_COMPACT_LABEL.has(end.token),
      startIndex: endIndex,
    };
  }

  const start = lexemes[endIndex - 1];
  if (
    !start ||
    !identityLabelTokenAllowed(start.token, technologyOnly) ||
    !MODEL_IDENTITY_LABEL_QUALIFIERS.get(start.token)?.has(end.token) ||
    hasHardCompoundBoundary(value.slice(start.end, end.start))
  ) {
    return null;
  }

  return {
    endIndex,
    isQualified: true,
    startIndex: endIndex - 1,
  };
}

function boundedIdentityLabelSpanStartingAt(
  value: string,
  lexemes: ModelIdentityLexeme[],
  startIndex: number,
  technologyOnly: boolean,
): BoundedIdentityLabelSpan | null {
  const start = lexemes[startIndex];
  if (!start || !identityLabelTokenAllowed(start.token, technologyOnly)) {
    return null;
  }

  if (MODEL_IDENTITY_COMPACT_LABEL.has(start.token)) {
    return { endIndex: startIndex, isQualified: true, startIndex };
  }

  const qualifier = lexemes[startIndex + 1];
  if (
    qualifier &&
    MODEL_IDENTITY_LABEL_QUALIFIERS.get(start.token)?.has(qualifier.token) &&
    !hasHardCompoundBoundary(value.slice(start.end, qualifier.start))
  ) {
    return { endIndex: startIndex + 1, isQualified: true, startIndex };
  }

  return { endIndex: startIndex, isQualified: false, startIndex };
}

function boundedForwardIdentityAssertionBefore(
  value: string,
  lexemes: ModelIdentityLexeme[],
  valueStartIndex: number,
  technologyOnly = false,
): BoundedForwardIdentityAssertion | null {
  const firstValue = lexemes[valueStartIndex];
  const immediatelyBefore = lexemes[valueStartIndex - 1];
  if (!firstValue || !immediatelyBefore) return null;

  const directLabel = boundedIdentityLabelSpanEndingAt(
    value,
    lexemes,
    valueStartIndex - 1,
    technologyOnly,
  );
  if (
    directLabel &&
    !hasHardCompoundBoundary(
      value.slice(lexemes[directLabel.endIndex].end, firstValue.start),
    )
  ) {
    return {
      connectorEndIndex: null,
      connectorStartIndex: null,
      label: directLabel,
    };
  }

  const determinerIndex =
    immediatelyBefore.token === "the" ? valueStartIndex - 1 : null;
  const connectorEndIndex =
    determinerIndex === null ? valueStartIndex - 1 : determinerIndex - 1;
  for (
    let connectorLength = 1;
    connectorLength <= MAX_MODEL_IDENTITY_ASSERTION_CONNECTOR_LEXEMES;
    connectorLength += 1
  ) {
    const connectorStartIndex = connectorEndIndex - connectorLength + 1;
    if (connectorStartIndex <= 0) continue;
    if (!isModelIdentityAssertionConnector(
      lexemes
        .slice(connectorStartIndex, connectorEndIndex + 1)
        .map((lexeme) => lexeme.token),
    )) {
      continue;
    }

    const label = boundedIdentityLabelSpanEndingAt(
      value,
      lexemes,
      connectorStartIndex - 1,
      technologyOnly,
    );
    if (!label) continue;

    let hasHardBoundary = false;
    for (
      let index = label.endIndex;
      index < valueStartIndex;
      index += 1
    ) {
      if (
        hasDisallowedIdentityAssertionBoundary(
          value.slice(lexemes[index].end, lexemes[index + 1].start),
        )
      ) {
        hasHardBoundary = true;
        break;
      }
    }
    if (hasHardBoundary) continue;

    return {
      connectorEndIndex,
      connectorStartIndex,
      label,
    };
  }

  return null;
}

function boundedReverseIdentityAssertionAfter(
  value: string,
  lexemes: ModelIdentityLexeme[],
  valueEndIndex: number,
  technologyOnly = false,
): BoundedReverseIdentityAssertion | null {
  const lastValue = lexemes[valueEndIndex];
  if (!lastValue) return null;

  const directLabel = boundedIdentityLabelSpanStartingAt(
    value,
    lexemes,
    valueEndIndex + 1,
    technologyOnly,
  );
  if (
    directLabel &&
    !hasHardCompoundBoundary(
      value.slice(lastValue.end, lexemes[directLabel.startIndex].start),
    )
  ) {
    return {
      connectorEndIndex: null,
      connectorStartIndex: null,
      label: directLabel,
    };
  }

  const connectorStartIndex = valueEndIndex + 1;
  for (
    let connectorLength = 1;
    connectorLength <= MAX_MODEL_IDENTITY_ASSERTION_CONNECTOR_LEXEMES;
    connectorLength += 1
  ) {
    const connectorEndIndex = connectorStartIndex + connectorLength - 1;
    if (!isModelIdentityAssertionConnector(
      lexemes
        .slice(connectorStartIndex, connectorEndIndex + 1)
        .map((lexeme) => lexeme.token),
    )) {
      continue;
    }

    let labelStartIndex = connectorEndIndex + 1;
    if (lexemes[labelStartIndex]?.token === "the") labelStartIndex += 1;
    const label = boundedIdentityLabelSpanStartingAt(
      value,
      lexemes,
      labelStartIndex,
      technologyOnly,
    );
    if (!label) continue;

    let hasHardBoundary = false;
    for (
      let index = valueEndIndex;
      index < label.startIndex;
      index += 1
    ) {
      if (
        hasDisallowedIdentityAssertionBoundary(
          value.slice(lexemes[index].end, lexemes[index + 1].start),
        )
      ) {
        hasHardBoundary = true;
        break;
      }
    }
    if (hasHardBoundary) continue;

    return {
      connectorEndIndex,
      connectorStartIndex,
      label,
    };
  }

  return null;
}

function isForwardIdentityAssertionBridgeLexeme(
  value: string,
  lexemes: ModelIdentityLexeme[],
  index: number,
) {
  for (
    let valueIndex = index + 1;
    valueIndex <=
    Math.min(
      index + MAX_MODEL_IDENTITY_ASSERTION_CONNECTOR_LEXEMES + 3,
      lexemes.length - 1,
    );
    valueIndex += 1
  ) {
    if (!looksLikeCompoundModelComponent(lexemes[valueIndex].token)) continue;
    const assertion = boundedForwardIdentityAssertionBefore(
      value,
      lexemes,
      valueIndex,
    );
    if (!assertion) continue;
    const bridgeEnd =
      assertion.connectorEndIndex ?? assertion.label.endIndex;
    if (index >= assertion.label.startIndex && index <= bridgeEnd) return true;
  }

  return false;
}

type NumericIdentityContext = {
  mode: "default" | "documented" | "observed";
  repeatedFamilyTokens?: Set<string>;
  targetDocumentsAmbiguousNumeric?: boolean;
  targetFamilyTokens?: Set<string>;
};

const DEFAULT_NUMERIC_IDENTITY_CONTEXT: NumericIdentityContext = {
  mode: "default",
};

function isAmbiguousNumericComponent(token: string) {
  if (token.includes(".")) return true;
  const numericValue = Number(token);
  return token.length === 4 && numericValue >= 1900 && numericValue <= 2099;
}

function technologyPhraseHasBoundedIdentityGovernor(
  value: string,
  lexemes: ModelIdentityLexeme[],
  startIndex: number,
  endIndex: number,
) {
  if (!lexemes[startIndex] || !lexemes[endIndex]) return false;

  if (
    boundedForwardIdentityAssertionBefore(
      value,
      lexemes,
      startIndex,
      true,
    ) ||
    boundedReverseIdentityAssertionAfter(value, lexemes, endIndex, true)
  ) {
    return true;
  }

  // A technology value may include its own bounded version clause before a
  // reverse identity assertion: "Bluetooth LE version 5.0 is the modelName".
  // Find that numeric value through the same forward label/copula grammar
  // instead of maintaining a separate adjacency-only special case.
  for (
    let numericIndex = endIndex + 2;
    numericIndex <=
    Math.min(
      endIndex + MAX_MODEL_IDENTITY_ASSERTION_CONNECTOR_LEXEMES + 4,
      lexemes.length - 1,
    );
    numericIndex += 1
  ) {
    const numeric = lexemes[numericIndex];
    if (!looksLikeNumericCompoundModelComponent(numeric?.token || "")) {
      continue;
    }
    const versionAssertion = boundedForwardIdentityAssertionBefore(
      value,
      lexemes,
      numericIndex,
    );
    if (
      !versionAssertion ||
      versionAssertion.label.startIndex !== endIndex + 1 ||
      lexemes[versionAssertion.label.startIndex]?.token !== "version"
    ) {
      continue;
    }
    if (
      boundedReverseIdentityAssertionAfter(value, lexemes, numericIndex, true)
    ) {
      return true;
    }
  }

  return false;
}

function adjacentTechnologyPrefixStartIndex(
  value: string,
  lexemes: ModelIdentityLexeme[],
  labelIndex: number,
) {
  const label = lexemes[labelIndex];
  if (!label) return null;

  // Technology versions commonly expand one anchor into a short phrase
  // (Bluetooth Low Energy, USB Type-C, DisplayPort Alt Mode). Match only an
  // allowlisted suffix ending immediately before the identity label, stop at
  // the same hard punctuation used by compound identity parsing, and cap the
  // lookbehind at three lexemes so unrelated prose cannot hide a sibling.
  let phrase = "";
  let right = label;
  for (let offset = 1; offset <= 3; offset += 1) {
    const candidate = lexemes[labelIndex - offset];
    if (
      !candidate ||
      hasHardCompoundBoundary(value.slice(candidate.end, right.start))
    ) {
      break;
    }
    phrase = `${candidate.token}${phrase}`;
    if (
      NON_IDENTITY_NUMERIC_TECH_PHRASE.has(phrase) &&
      !technologyPhraseHasBoundedIdentityGovernor(
        value,
        lexemes,
        labelIndex - offset,
        labelIndex - 1,
      )
    ) {
      return labelIndex - offset;
    }
    right = candidate;
  }

  return null;
}

function hasAdjacentTechnologyPrefix(
  value: string,
  lexemes: ModelIdentityLexeme[],
  labelIndex: number,
) {
  return adjacentTechnologyPrefixStartIndex(value, lexemes, labelIndex) !== null;
}

function technologyMixedModelComponentTokens(value: string) {
  const lexemes = modelIdentityLexemes(value);
  const components = new Set<string>();

  for (let endIndex = 0; endIndex < lexemes.length; endIndex += 1) {
    let phrase = "";
    let right: ModelIdentityLexeme | undefined;
    for (let offset = 0; offset < 3; offset += 1) {
      const candidate = lexemes[endIndex - offset];
      if (
        !candidate ||
        (right &&
          hasHardCompoundBoundary(value.slice(candidate.end, right.start)))
      ) {
        break;
      }
      phrase = `${candidate.token}${phrase}`;
      if (
        NON_IDENTITY_NUMERIC_TECH_PHRASE.has(phrase) &&
        !technologyPhraseHasBoundedIdentityGovernor(
          value,
          lexemes,
          endIndex - offset,
          endIndex,
        )
      ) {
        for (
          let index = endIndex - offset;
          index <= endIndex;
          index += 1
        ) {
          const token = lexemes[index]?.token;
          if (token && looksLikeMixedCompoundModelComponent(token)) {
            components.add(token);
          }
        }
      }
      right = candidate;
    }
  }

  return components;
}

function stripBoundedTechnologyVersions(value: string) {
  const lexemes = modelIdentityLexemes(value);
  const ranges: Array<{ end: number; start: number }> = [];

  for (let index = 0; index < lexemes.length; index += 1) {
    const numeric = lexemes[index];
    if (!looksLikeNumericCompoundModelComponent(numeric.token)) continue;

    const versionAssertion = boundedForwardIdentityAssertionBefore(
      value,
      lexemes,
      index,
    );
    const labelIndex = versionAssertion?.label.startIndex ?? -1;
    if (labelIndex < 0 || lexemes[labelIndex]?.token !== "version") {
      continue;
    }

    const technologyStartIndex = adjacentTechnologyPrefixStartIndex(
      value,
      lexemes,
      labelIndex,
    );
    if (technologyStartIndex === null) continue;
    ranges.push({
      end: numeric.end,
      start: lexemes[technologyStartIndex].start,
    });
  }

  let result = value;
  for (const range of ranges.reverse()) {
    result = `${result.slice(0, range.start)} ${result.slice(range.end)}`;
  }
  return result;
}

function hasBoundedIdentityLabelBeforeNumeric(
  value: string,
  lexemes: ModelIdentityLexeme[],
  numericIndex: number,
) {
  const assertion = boundedForwardIdentityAssertionBefore(
    value,
    lexemes,
    numericIndex,
  );
  return Boolean(
    assertion &&
      !hasAdjacentTechnologyPrefix(
        value,
        lexemes,
        assertion.label.startIndex,
      ),
  );
}

function hasBoundedIdentityLabelAfterNumeric(
  value: string,
  lexemes: ModelIdentityLexeme[],
  numericIndex: number,
) {
  const assertion = boundedReverseIdentityAssertionAfter(
    value,
    lexemes,
    numericIndex,
  );

  // A direct bare phrase such as "2024 model year" is ordinary catalog prose,
  // not an exact model assertion. Reverse ambiguous numerics therefore require
  // an explicit copula or a bounded qualified/compact label. The existing
  // repeated-family rule below still handles "2024 model X100" safely.
  return Boolean(
    assertion &&
      (assertion.connectorStartIndex !== null || assertion.label.isQualified),
  );
}

function hasFamilyTiedIdentityLabelAfterNumeric(
  value: string,
  lexemes: ModelIdentityLexeme[],
  numericIndex: number,
  context: NumericIdentityContext,
) {
  const numeric = lexemes[numericIndex];
  const label = lexemes[numericIndex + 1];
  const family = lexemes[numericIndex + 2];
  if (
    !numeric ||
    !label ||
    !family ||
    !isModelIdentityLabelToken(label.token) ||
    hasHardCompoundBoundary(value.slice(numeric.end, label.start)) ||
    hasHardCompoundBoundary(value.slice(label.end, family.start)) ||
    !looksLikeMixedCompoundModelComponent(family.token) ||
    !context.targetFamilyTokens?.has(family.token)
  ) {
    return false;
  }

  return Boolean(context.repeatedFamilyTokens?.has(family.token));
}

function observedNumericHasIdentityContext(input: {
  context: NumericIdentityContext;
  index: number;
  lexemes: ModelIdentityLexeme[];
  value: string;
}) {
  if (input.context.mode === "documented") return true;
  if (input.context.mode !== "observed") return false;
  if (
    hasBoundedIdentityLabelBeforeNumeric(
      input.value,
      input.lexemes,
      input.index,
    ) ||
    hasBoundedIdentityLabelAfterNumeric(
      input.value,
      input.lexemes,
      input.index,
    ) ||
    hasFamilyTiedIdentityLabelAfterNumeric(
      input.value,
      input.lexemes,
      input.index,
      input.context,
    )
  ) {
    return true;
  }

  const previous = input.lexemes[input.index - 1];
  const numeric = input.lexemes[input.index];
  if (!previous || !numeric) return false;
  const separatorBefore = input.value.slice(previous.end, numeric.start);
  if (
    hasHardCompoundBoundary(separatorBefore) ||
    !looksLikeMixedCompoundModelComponent(previous.token) ||
    !input.context.targetFamilyTokens?.has(previous.token)
  ) {
    return false;
  }

  return Boolean(
    input.context.targetDocumentsAmbiguousNumeric ||
      input.context.repeatedFamilyTokens?.has(previous.token),
  );
}

function isNonIdentityNumericLexeme(
  value: string,
  lexemes: ModelIdentityLexeme[],
  index: number,
  context: NumericIdentityContext = DEFAULT_NUMERIC_IDENTITY_CONTEXT,
) {
  const lexeme = lexemes[index];
  if (!lexeme || !looksLikeNumericCompoundModelComponent(lexeme.token)) {
    return false;
  }

  const previous = lexemes[index - 1];
  const previousPrevious = lexemes[index - 2];
  const next = lexemes[index + 1];
  const nextNext = lexemes[index + 2];
  const separatorBefore = value.slice(previous?.end ?? 0, lexeme.start);
  const separatorAfter = value.slice(lexeme.end, next?.start ?? value.length);
  const immediateBefore = value.slice(
    Math.max(previous?.end ?? 0, lexeme.start - 4),
    lexeme.start,
  );
  const immediateAfter = value.slice(
    lexeme.end,
    Math.min(value.length, lexeme.end + 12),
  );

  if (/[$£€¥]\s*$/.test(immediateBefore) || /^\s*%/.test(immediateAfter)) {
    return true;
  }
  if (
    previous &&
    NON_IDENTITY_NUMERIC_PREFIX.has(previous.token) &&
    !hasHardCompoundBoundary(separatorBefore)
  ) {
    return true;
  }
  if (
    next &&
    NON_IDENTITY_NUMERIC_SUFFIX.has(next.token) &&
    !hasHardCompoundBoundary(separatorAfter)
  ) {
    return true;
  }

  const adjacentThousandsGroup =
    (previous &&
      /^\d{1,3}$/.test(previous.token) &&
      lexeme.token.length === 3 &&
      separatorBefore === ",") ||
    (next &&
      lexeme.token.length <= 3 &&
      /^\d{3}$/.test(next.token) &&
      separatorAfter === ",");
  if (adjacentThousandsGroup) {
    return true;
  }

  if (
    next &&
    /^[a-z]+$/.test(next.token) &&
    !hasHardCompoundBoundary(separatorAfter) &&
    isModelIdentityMeasurementToken(`${lexeme.token}${next.token}`)
  ) {
    return true;
  }

  const leadsDimension =
    next &&
    /^(?:by|x)$/.test(next.token) &&
    nextNext &&
    looksLikeNumericCompoundModelComponent(nextNext.token);
  const trailsDimension =
    previous &&
    /^(?:by|x)$/.test(previous.token) &&
    previousPrevious &&
    looksLikeNumericCompoundModelComponent(previousPrevious.token);
  if (leadsDimension || trailsDimension) {
    return true;
  }

  if (hasAdjacentTechnologyPrefix(value, lexemes, index)) {
    return true;
  }

  if (
    isAmbiguousNumericComponent(lexeme.token) &&
    !observedNumericHasIdentityContext({
      context,
      index,
      lexemes,
      value,
    })
  ) {
    return true;
  }

  return false;
}

function numericModelComponentTokens(
  value: string,
  context: NumericIdentityContext = DEFAULT_NUMERIC_IDENTITY_CONTEXT,
) {
  const lexemes = modelIdentityLexemes(value);
  return new Set(
    lexemes
      .filter(
        (lexeme, index) =>
          looksLikeNumericCompoundModelComponent(lexeme.token) &&
          !isNonIdentityNumericLexeme(value, lexemes, index, context),
      )
      .map((lexeme) => lexeme.token),
  );
}

function documentedNumericIdentityContext(): NumericIdentityContext {
  return { mode: "documented" };
}

function observedNumericIdentityContext(
  targetModel: string,
  observedText: string,
): NumericIdentityContext {
  const targetFamilyTokens = mixedModelComponentTokens(targetModel);
  const counts = new Map<string, number>();
  for (const lexeme of modelIdentityLexemes(observedText)) {
    if (!looksLikeMixedCompoundModelComponent(lexeme.token)) continue;
    counts.set(lexeme.token, (counts.get(lexeme.token) || 0) + 1);
  }
  const repeatedFamilyTokens = new Set(
    [...counts]
      .filter(([token, count]) => count > 1 && targetFamilyTokens.has(token))
      .map(([token]) => token),
  );
  const documentedContext = documentedNumericIdentityContext();
  const targetDocumentsAmbiguousNumeric = splitModelIdentityAliases(targetModel)
    .flatMap((alias) => [
      ...numericModelComponentTokens(alias, documentedContext),
    ])
    .some((token) => isAmbiguousNumericComponent(token));

  return {
    mode: "observed",
    repeatedFamilyTokens,
    targetDocumentsAmbiguousNumeric,
    targetFamilyTokens,
  };
}

function hasUndocumentedObservedModelComponent(
  targetModel: string,
  observedText: string,
) {
  const identityBearingText = modelIdentityBearingText(observedText);
  const observedContext = observedNumericIdentityContext(
    targetModel,
    identityBearingText,
  );
  const observedComponents = mixedModelComponentTokens(identityBearingText);
  const observedNumericComponents = numericModelComponentTokens(
    identityBearingText,
    observedContext,
  );
  if (observedComponents.size === 0 && observedNumericComponents.size === 0) {
    return false;
  }

  const observedCompoundSequences = compoundModelSequencesWithContext(
    identityBearingText,
    observedContext,
  );
  const observedStableIdentifiers = new Set(
    stableModelIdentifiers(identityBearingText),
  );
  const allowedComponents = new Set<string>();
  const allowedNumericComponents = new Set<string>();
  let matchedDocumentedAlias = false;
  let matchedNumericCompoundAlias = false;

  for (const alias of splitModelIdentityAliases(targetModel)) {
    const aliasComponents = mixedModelComponentTokens(alias);
    if (aliasComponents.size === 0) continue;
    const aliasCompoundSequences = compoundModelSequencesWithContext(
      alias,
      documentedNumericIdentityContext(),
    );
    const aliasNumericComponents = new Set(
      [...aliasCompoundSequences]
        .flatMap((sequence) => sequence.split(":"))
        .filter((component) => looksLikeNumericCompoundModelComponent(component)),
    );
    const aliasStableIdentifiers = stableModelIdentifiers(alias);
    const matchedCompoundSequences = [...aliasCompoundSequences].filter(
      (sequence) =>
        observedCompoundSequences.has(sequence) ||
        observedStableIdentifiers.has(sequence.replace(/:/g, "")),
    );
    const compatibleLeadingSeriesSequences =
      aliasCompoundSequences.size === 0
        ? [...observedCompoundSequences].filter((sequence) => {
            const parts = sequence.split(":");
            return (
              parts.length === 2 &&
              aliasComponents.has(parts[1]) &&
              !aliasComponents.has(parts[0]) &&
              looksLikeMixedCompoundModelComponent(parts[0])
            );
          })
        : [];
    const aliasMatches =
      aliasCompoundSequences.size > 0
        ? matchedCompoundSequences.length > 0
        : aliasStableIdentifiers.some((identifier) =>
              observedStableIdentifiers.has(identifier),
            ) ||
            [...aliasComponents].some((component) =>
              observedComponents.has(component),
            ) ||
            compatibleLeadingSeriesSequences.length > 0;
    if (!aliasMatches) continue;

    matchedDocumentedAlias = true;
    if (aliasNumericComponents.size > 0) {
      matchedNumericCompoundAlias = true;
      for (const component of aliasNumericComponents) {
        allowedNumericComponents.add(component);
      }
    }
    for (const component of aliasComponents) {
      allowedComponents.add(component);
    }
    for (const identifier of aliasStableIdentifiers) {
      allowedComponents.add(identifier);
    }
    for (const sequence of aliasCompoundSequences) {
      allowedComponents.add(sequence.replace(/:/g, ""));
    }
    for (const sequence of compatibleLeadingSeriesSequences) {
      for (const component of sequence.split(":")) {
        allowedComponents.add(component);
      }
    }
  }

  if (!matchedDocumentedAlias) return false;

  // Connector words are unbounded prose. Once an observation states one
  // complete documented identity, every other model-shaped component must be
  // part of a complete documented alias (or an accepted leading-series form).
  // Measurement and explicit technology/spec tokens were already excluded by
  // looksLikeMixedCompoundModelComponent(). This makes the veto independent of
  // wording such as "and", "plus", "featuring", "variant", or any synonym.
  const hasUndocumentedMixedComponent = [...observedComponents].some(
    (component) => !allowedComponents.has(component),
  );
  if (hasUndocumentedMixedComponent) return true;

  // A pure number is normally specification data, so this closure activates
  // only when the matched documented alias itself has a separate numeric
  // compound suffix (for example, X100 20). Context-classified measurements,
  // prices, years, dimensions, and technology versions never enter the set.
  return (
    matchedNumericCompoundAlias &&
    [...observedNumericComponents].some(
      (component) => !allowedNumericComponents.has(component),
    )
  );
}

// A model can be expressed as a run of individually weak tokens ("Q7 M5",
// "X100 A1"). A single short token is too ambiguous to trust globally, but
// two or more adjacent mixed letter/digit tokens form useful identity evidence.
function compoundModelSequencesWithContext(
  value: string,
  context: NumericIdentityContext,
) {
  const sequences = new Set<string>();
  const aliases = splitModelIdentityAliases(value);

  for (const alias of aliases) {
    const lexemes = modelIdentityLexemes(alias);
    let run: string[] = [];
    let previousEnd = 0;

    const flush = () => {
      if (
        run.length >= 2 &&
        run.some((token) => looksLikeMixedCompoundModelComponent(token))
      ) {
        sequences.add(run.join(":"));
      }

      run = [];
    };

    for (let index = 0; index < lexemes.length; index += 1) {
      const lexeme = lexemes[index];
      const separatorBefore = alias.slice(previousEnd, lexeme.start);
      if (hasHardCompoundBoundary(separatorBefore)) flush();
      if (run.length > 0 && separatorBefore.includes("(")) {
        const closingParenthesis = alias.indexOf(")", lexeme.start);
        const parenthesizedComponentCount = lexemes
          .slice(index)
          .filter(
            (candidate) =>
              (closingParenthesis < 0 ||
                candidate.start < closingParenthesis) &&
              looksLikeCompoundModelComponent(candidate.token),
          ).length;
        // One parenthesized weak suffix is safe formatting (X100 (A1)). A
        // parenthesized multi-token model is a separate alias annotation
        // (415BZ (M2-415BZ)) and must not be fused to the preceding model.
        if (parenthesizedComponentCount >= 2) flush();
      }

      const next = lexemes[index + 1];
      const separatorToNext = next
        ? alias.slice(lexeme.end, next.start)
        : "";
      if (
        context.mode !== "default" &&
        (isModelIdentityLabelToken(lexeme.token) ||
          isForwardIdentityAssertionBridgeLexeme(alias, lexemes, index)) &&
        run.some((component) => looksLikeMixedCompoundModelComponent(component))
      ) {
        previousEnd = lexeme.end;
        continue;
      }
      if (
        looksLikeNumericCompoundModelComponent(lexeme.token) &&
        isNonIdentityNumericLexeme(alias, lexemes, index, context)
      ) {
        flush();
        previousEnd = lexeme.end;
        continue;
      }
      const splitMeasurement = Boolean(
        looksLikeNumericCompoundModelComponent(lexeme.token) &&
          next &&
          /^[a-z]+$/.test(next.token) &&
          !hasHardCompoundBoundary(separatorToNext) &&
          isModelIdentityMeasurementToken(`${lexeme.token}${next.token}`),
      );
      if (splitMeasurement) {
        flush();
        previousEnd = lexeme.end;
        continue;
      }

      const token = lexeme.token;
      if (
        looksLikeMixedCompoundModelComponent(token) ||
        (looksLikeNumericCompoundModelComponent(token) && run.length > 0)
      ) {
        run.push(token);
      } else {
        flush();
      }
      previousEnd = lexeme.end;
    }

    flush();
  }
  return sequences;
}

export function compoundModelSequences(value: string) {
  return compoundModelSequencesWithContext(
    value,
    DEFAULT_NUMERIC_IDENTITY_CONTEXT,
  );
}

export function haveConflictingCompoundModelSequences(
  first: string,
  second: string,
) {
  const firstModels = compoundModelSequencesWithContext(
    first,
    documentedNumericIdentityContext(),
  );
  const identityBearingSecond = modelIdentityBearingText(second);
  const secondModels = compoundModelSequencesWithContext(
    identityBearingSecond,
    observedNumericIdentityContext(first, identityBearingSecond),
  );

  if (hasUndocumentedObservedModelComponent(first, identityBearingSecond)) {
    return true;
  }
  if (secondModels.size === 0) return false;
  if (firstModels.size > 0) {
    return [...secondModels].some((model) => !firstModels.has(model));
  }

  // A short documented anchor such as Q50 has no compound sequence by itself.
  // A separate two-component model such as Y7 B2 is still explicit sibling
  // evidence and must not be hidden beside the exact short-anchor name.
  const documentedComponents = mixedModelComponentTokens(first);
  return (
    documentedComponents.size > 0 &&
    [...secondModels].some((sequence) => {
      const parts = sequence.split(":");
      const repeatsDocumentedAnchor = parts.some((part) =>
        documentedComponents.has(part),
      );
      const addsUndocumentedComponent = parts.some(
        (part) => !documentedComponents.has(part),
      );
      const compatibleLeadingSeriesExpansion =
        parts.length === 2 &&
        documentedComponents.has(parts[1]) &&
        !documentedComponents.has(parts[0]) &&
        looksLikeMixedCompoundModelComponent(parts[0]);
      const statesIndependentCompoundIdentity =
        parts.filter((part) => looksLikeMixedCompoundModelComponent(part))
          .length >= 2;
      if (compatibleLeadingSeriesExpansion) return false;
      return (
        (repeatsDocumentedAnchor && addsUndocumentedComponent) ||
        statesIndependentCompoundIdentity
      );
    })
  );
}

export function haveConflictingStrongModelTokens(
  targetModel: string,
  observedText: string,
) {
  const documented = new Set([
    ...strongModelTokens(targetModel),
    ...mixedModelComponentTokens(targetModel),
    ...stableModelIdentifiers(targetModel),
    ...[
      ...compoundModelSequencesWithContext(
        targetModel,
        documentedNumericIdentityContext(),
      ),
    ].map((sequence) => sequence.replace(/:/g, "")),
  ]);
  if (documented.size === 0) return false;
  return [...strongModelTokens(modelIdentityBearingText(observedText))]
    .filter((model) => !isModelIdentityMeasurementToken(model))
    .some((model) => !documented.has(model));
}

const MODEL_DESCRIPTOR_STOP_WORDS = new Set([
  "and",
  "for",
  "model",
  "mpn",
  "or",
  "series",
  "sku",
  "the",
  "with",
]);

function modelDescriptorTerms(tokens: string[]) {
  return tokens.filter(
    (token) =>
      /^[a-z]+$/.test(token) &&
      token.length >= 3 &&
      !MODEL_DESCRIPTOR_STOP_WORDS.has(token),
  );
}

// Some families put an alphabetic trim after one stable model anchor (for
// example, "Q50 Max" versus "Q50 Pro"). An observed title is contradictory
// when it repeats a documented anchor with an undocumented descriptor
// sequence. This is a veto only: missing descriptor evidence remains
// inconclusive and cannot establish identity by itself.
export function haveConflictingDescriptiveModelSequences(
  targetModel: string,
  observedText: string,
) {
  const allowedByAnchor = new Map<string, string[][]>();

  for (const alias of targetModel.split(EXPLICIT_MODEL_ALIAS_SEPARATOR)) {
    const tokens = normalizeText(alias).split(" ").filter(Boolean);
    const anchors = new Set([
      ...strongModelTokens(alias),
      ...tokens.filter((token) => looksLikeMixedCompoundModelComponent(token)),
    ]);

    for (const anchor of anchors) {
      const anchorIndex = tokens.indexOf(anchor);
      if (anchorIndex < 0) continue;
      const descriptors = modelDescriptorTerms(tokens.slice(anchorIndex + 1));
      if (descriptors.length === 0) continue;
      const allowed = allowedByAnchor.get(anchor) || [];
      allowed.push(descriptors);
      allowedByAnchor.set(anchor, allowed);
    }
  }

  if (allowedByAnchor.size === 0) return false;
  const observedTokens = normalizeText(modelIdentityBearingText(observedText))
    .split(" ")
    .filter(Boolean);
  let conflictingDescriptorObserved = false;

  for (let index = 0; index < observedTokens.length; index += 1) {
    const allowed = allowedByAnchor.get(observedTokens[index]);
    if (!allowed) continue;

    const following: string[] = [];
    for (let cursor = index + 1; cursor < observedTokens.length; cursor += 1) {
      const token = observedTokens[cursor];
      if (/\d/.test(token)) break;
      if (
        /^[a-z]+$/.test(token) &&
        token.length >= 3 &&
        !MODEL_DESCRIPTOR_STOP_WORDS.has(token)
      ) {
        following.push(token);
      }
    }

    const hasEnoughEvidence = allowed.some(
      (sequence) => following.length >= sequence.length,
    );
    if (!hasEnoughEvidence) continue;
    if (
      allowed.some((sequence) =>
        sequence.every((token, offset) => following[offset] === token),
      )
    ) {
      continue;
    } else {
      conflictingDescriptorObserved = true;
    }
  }

  return conflictingDescriptorObserved;
}

export type ModelIdentityRelation = {
  coreMatches: boolean;
  descriptiveModelTerms: string[];
  descriptiveModelTermsMatch: boolean;
  hasConflict: boolean;
  hasDocumentedIdentity: boolean;
  hasTargetEvidenceInObservedText: boolean;
  identifiers: string[];
  matchedIdentifiers: string[];
  matchesCompleteAlias: boolean;
};

// Exact-identity consumers need a positive relation, not only an absence of
// contradictions. In particular, a family token ("X100") cannot establish a
// compound model ("X100 A1"). This shared relation canonicalizes safe
// punctuation and joined/split measurements, requires one complete documented
// alias, and then applies every global sibling/trim veto.
export function modelIdentityRelation(
  targetModel: string,
  observedText: string,
): ModelIdentityRelation {
  const identityBearingObservedText = modelIdentityBearingText(observedText);
  const observedContext = observedNumericIdentityContext(
    targetModel,
    identityBearingObservedText,
  );
  const observedStableIdentifiers = new Set(
    stableModelIdentifiers(identityBearingObservedText),
  );
  const observedCompoundSequences = compoundModelSequencesWithContext(
    identityBearingObservedText,
    observedContext,
  );
  const observedWords = new Set(
    normalizeText(identityBearingObservedText).split(" ").filter(Boolean),
  );
  const relations = splitModelIdentityAliases(targetModel).map((alias) => {
    const stableIdentifiers = stableModelIdentifiers(alias);
    const compoundSequences = [
      ...compoundModelSequencesWithContext(
        alias,
        documentedNumericIdentityContext(),
      ),
    ];
    const descriptiveTerms = modelDescriptorTerms(
      normalizeText(alias).split(" ").filter(Boolean),
    );
    const matchedStableIdentifiers = stableIdentifiers.filter((identifier) =>
      observedStableIdentifiers.has(identifier),
    );
    const matchedCompoundSequences = compoundSequences.filter(
      (sequence) =>
        observedCompoundSequences.has(sequence) ||
        observedStableIdentifiers.has(sequence.replace(/:/g, "")),
    );
    const coreMatches =
      compoundSequences.length > 0
        ? matchedCompoundSequences.length > 0
        : matchedStableIdentifiers.length > 0;
    const descriptiveTermsMatch = descriptiveTerms.every((term) =>
      observedWords.has(term),
    );
    const compoundComponents = new Set(
      compoundSequences.flatMap((sequence) => sequence.split(":")),
    );
    const hasTargetEvidenceInObservedText =
      matchedStableIdentifiers.length > 0 ||
      matchedCompoundSequences.length > 0 ||
      [...compoundComponents].some((component) => observedWords.has(component));

    return {
      compoundSequences,
      coreMatches,
      descriptiveTerms,
      descriptiveTermsMatch,
      hasTargetEvidenceInObservedText,
      matchedCompoundSequences,
      matchedStableIdentifiers,
      matchesCompleteAlias: coreMatches && descriptiveTermsMatch,
      stableIdentifiers,
    };
  });
  const hasConflict =
    haveConflictingStrongModelTokens(targetModel, identityBearingObservedText) ||
    haveConflictingCompoundModelSequences(
      targetModel,
      identityBearingObservedText,
    ) ||
    haveConflictingDescriptiveModelSequences(
      targetModel,
      identityBearingObservedText,
    );
  const identifiers = [
    ...new Set(
      relations.flatMap((relation) => [
        ...relation.stableIdentifiers,
        ...relation.compoundSequences,
      ]),
    ),
  ];
  const matchedIdentifiers = [
    ...new Set(
      relations.flatMap((relation) => [
        ...relation.matchedStableIdentifiers,
        ...relation.matchedCompoundSequences,
      ]),
    ),
  ];
  const coreMatches = relations.some((relation) => relation.coreMatches);

  return {
    coreMatches,
    descriptiveModelTerms: [
      ...new Set(relations.flatMap((relation) => relation.descriptiveTerms)),
    ],
    descriptiveModelTermsMatch: relations.some(
      (relation) => relation.coreMatches && relation.descriptiveTermsMatch,
    ),
    hasConflict,
    hasDocumentedIdentity: identifiers.length > 0,
    hasTargetEvidenceInObservedText: relations.some(
      (relation) => relation.hasTargetEvidenceInObservedText,
    ),
    identifiers,
    matchedIdentifiers,
    matchesCompleteAlias:
      !hasConflict &&
      relations.some((relation) => relation.matchesCompleteAlias),
  };
}

function identityBrand(product: ProductRecommendation) {
  const explicit =
    product.metadata?.brand?.value ||
    product.canonicalIdentity?.brand;

  if (explicit) {
    return normalizeText(canonicalBrand(explicit));
  }

  const detected = detectKnownBrands(
    `${product.name || ""} ${product.metadata?.title?.value || ""}`,
  );

  if (detected.length > 0) {
    return normalizeText(canonicalBrand(detected[0]));
  }

  const first = normalizeText(product.name).split(" ")[0] || "";

  return first.length >= 3 && !/\d/.test(first) ? first : "";
}

function productStrongModelTokens(product: ProductRecommendation) {
  // URL models are inference evidence only when the existing eligibility
  // verdict says this is a renderable product page. Collection/editorial pages
  // must never lend a model to a product identity.
  const trustedUrlIdentity = product.productEligibility?.canRenderAsProductCard
    ? [
        sourceUrlPathIdentityText(product.product_page_url),
        sourceUrlPathIdentityText(product.metadata?.canonicalUrl?.value),
      ].join(" ")
    : "";

  return strongModelTokens(
    [
      product.metadata?.modelNumber?.value,
      product.canonicalIdentity?.modelNumber,
      product.name,
      product.metadata?.title?.value,
      trustedUrlIdentity,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function nonModelTokens(tokens: string[]) {
  return tokens.filter((token) => !/\d/.test(token));
}

function tokenSubset(shorter: string[], longer: string[]) {
  const longerSet = new Set(longer);

  return shorter.every((token) => longerSet.has(token));
}

function sameProductFamilyTitle(firstTitle: string, secondTitle: string) {
  const firstTokens = titleTokens(firstTitle);
  const secondTokens = titleTokens(secondTitle);
  const firstModels = modelLikeTokens(firstTokens);
  const secondModels = modelLikeTokens(secondTokens);

  if (
    firstModels.length > 0 &&
    secondModels.length > 0 &&
    !firstModels.some((token) => secondModels.includes(token))
  ) {
    return false;
  }

  const firstNonModels = nonModelTokens(firstTokens);
  const secondNonModels = nonModelTokens(secondTokens);
  const shorter =
    firstNonModels.length <= secondNonModels.length ? firstNonModels : secondNonModels;
  const longer =
    firstNonModels.length <= secondNonModels.length ? secondNonModels : firstNonModels;

  return shorter.length >= 3 && tokenSubset(shorter, longer);
}

function normalizeUrl(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function fieldValue<T>(value: { value: T } | undefined) {
  return value?.value ?? null;
}

function urlKey(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

// RR-060: retailers serve one listing under many URL shapes (a truncated
// `/p/335012888` and a full slug ending in the same id). A trailing
// pure-numeric path segment of 6+ digits is a listing id, so host+id is a
// stronger identity key than the full path. Short numeric segments stay
// excluded to avoid treating sizes or model numbers as listing ids.
function retailerListingKey(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments.at(-1) || "";

    if (!/^\d{6,}$/.test(lastSegment)) {
      return "";
    }

    // Compact dates are ambiguous: editorial/archive paths are not listing
    // ids, while an explicit product-detail route may legitimately use the
    // same eight digits as its item id.
    const isDateShaped = /^(?:19|20)\d{6}$/.test(lastSegment);
    const hasProductDetailMarker = pathSegments
      .slice(0, -1)
      .some((segment) => /^(?:p|pd|product|products|dp|ip)$/i.test(segment));
    const hasEditorialArchiveMarker = pathSegments
      .slice(0, -1)
      .some((segment) => /^(?:review|reviews|article|articles|blog|blogs|news|archive|archives|post|posts|story|stories)$/i.test(segment));
    if (isDateShaped && (!hasProductDetailMarker || hasEditorialArchiveMarker)) {
      return "";
    }

    return `${parsed.hostname.replace(/^www\./, "")} listing ${lastSegment}`.toLowerCase();
  } catch {
    return "";
  }
}

// RR-071: two products can share brand and a size-shaped token ("12gallon")
// while their names state DIFFERENT hard numeric specs (5.5 vs 5 peak HP).
// Conflicting values for the same robust unit prove different machines, so
// they must never be inferred to be one exact model. Units prone to
// truncation noise (inches) are deliberately excluded.
const CONFLICT_SPEC_UNIT_ALIASES: Record<string, string> = {
  ah: "ah",
  amp: "amp",
  amps: "amp",
  btu: "btu",
  cfm: "cfm",
  scfm: "cfm",
  gal: "gallon",
  gallon: "gallon",
  gallons: "gallon",
  hp: "hp",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  psi: "psi",
  qt: "qt",
  quart: "qt",
  quarts: "qt",
  volt: "volt",
  volts: "volt",
  watt: "watt",
  watts: "watt",
};

function numericSpecValues(text: string) {
  const values = new Map<string, Set<number>>();

  for (const match of text.matchAll(
    /(\d+(?:\.\d+)?)[\s-]*(?:peak[\s-]*)?(gallons?|gal|hp|quarts?|qt|psi|scfm|cfm|btu|watts?|volts?|amps?|ah|lbs?|pounds?)\b/gi,
  )) {
    const unit = CONFLICT_SPEC_UNIT_ALIASES[(match[2] || "").toLowerCase()];
    const value = Number(match[1]);

    if (!unit || !Number.isFinite(value)) {
      continue;
    }

    const existing = values.get(unit) || new Set<number>();
    existing.add(value);
    values.set(unit, existing);
  }

  return values;
}

function conflictingNumericSpecs(firstText: string, secondText: string) {
  const firstValues = numericSpecValues(firstText);
  const secondValues = numericSpecValues(secondText);

  for (const [unit, valuesA] of firstValues) {
    const valuesB = secondValues.get(unit);

    if (!valuesB) {
      continue;
    }

    if (![...valuesA].some((value) => valuesB.has(value))) {
      return true;
    }
  }

  return false;
}

export function haveConflictingNumericProductSpecs(
  firstText: string,
  secondText: string,
) {
  return conflictingNumericSpecs(firstText, secondText);
}

function identitySpecText(product: ProductRecommendation) {
  return [product.name, fieldValue(product.metadata?.title)]
    .filter(Boolean)
    .join(" ");
}

function productTypeAllowsInferredIdentity(product: ProductRecommendation) {
  const requestedCategory = product.category || "";

  if (!requestedCategory) {
    return true;
  }

  const allowedCheckText = [product.name, fieldValue(product.metadata?.title)]
    .filter(Boolean)
    .join(" ");
  const vetoEvidenceText = [
    allowedCheckText,
    sourceUrlPathIdentityText(product.product_page_url),
    sourceUrlPathIdentityText(product.metadata?.canonicalUrl?.value),
  ]
    .filter(Boolean)
    .join(" ");

  return classifyProductTypeMatch({
    allowedCheckText,
    evidenceText: vetoEvidenceText,
    identityText: product.name,
    requestedCategory,
  }).canBeExactMatch;
}

function identityConfidence(metadata: ProductMetadata | undefined) {
  if (metadata?.gtin?.value || metadata?.modelNumber?.value) {
    return "High" as const;
  }

  if (metadata?.brand?.value || metadata?.sku?.value || metadata?.canonicalUrl?.value) {
    return "Medium" as const;
  }

  return "Low" as const;
}

export function getCanonicalIdentity(
  product: ProductRecommendation,
): CanonicalProductIdentity {
  const metadata = product.metadata;
  const brand = fieldValue(metadata?.brand);
  const gtin = fieldValue(metadata?.gtin);
  const modelNumber = fieldValue(metadata?.modelNumber);
  const sku = fieldValue(metadata?.sku);
  const canonicalUrl =
    normalizeUrl(fieldValue(metadata?.canonicalUrl) || product.product_page_url) ||
    null;
  const normalizedTitle = normalizeTitle(
    fieldValue(metadata?.title) || product.name,
  );
  const highConfidenceKey =
    gtin ||
    (brand && modelNumber ? `${brand}-${modelNumber}` : "") ||
    (brand && sku ? `${brand}-${sku}` : "");
  const mediumConfidenceKey = canonicalUrl
    ? retailerListingKey(canonicalUrl) || urlKey(canonicalUrl)
    : "";
  const fallbackKey = normalizedTitle || normalizeText(product.name);

  return {
    brand,
    canonicalId: normalizeText(
      highConfidenceKey || mediumConfidenceKey || fallbackKey,
    ),
    canonicalUrl,
    confidence: identityConfidence(metadata),
    gtin,
    modelNumber,
    normalizedTitle,
    sku,
  };
}

export function withCanonicalIdentity<T extends ProductRecommendation>(product: T): T {
  return {
    ...product,
    canonicalIdentity: getCanonicalIdentity(product),
  };
}

export function areSameCanonicalProduct(
  first: ProductRecommendation,
  second: ProductRecommendation,
) {
  const firstIdentity = first.canonicalIdentity || getCanonicalIdentity(first);
  const secondIdentity = second.canonicalIdentity || getCanonicalIdentity(second);

  if (firstIdentity.canonicalId && firstIdentity.canonicalId === secondIdentity.canonicalId) {
    return true;
  }

  const firstTitle = firstIdentity.normalizedTitle;
  const secondTitle = secondIdentity.normalizedTitle;

  return Boolean(
    firstTitle &&
      secondTitle &&
      (firstTitle === secondTitle || sameProductFamilyTitle(firstTitle, secondTitle)),
  );
}

export function areSameExactModelProduct(
  first: ProductRecommendation,
  second: ProductRecommendation,
) {
  const firstIdentity = first.canonicalIdentity || getCanonicalIdentity(first);
  const secondIdentity = second.canonicalIdentity || getCanonicalIdentity(second);
  const firstBrand = identityBrand(first);
  const secondBrand = identityBrand(second);
  const firstModels = productStrongModelTokens(first);
  const secondModels = productStrongModelTokens(second);
  const sharedStrongModel = [...firstModels].some((token) => secondModels.has(token));

  if (firstModels.size > 0 && secondModels.size > 0 && !sharedStrongModel) {
    return false;
  }

  if (firstIdentity.canonicalId && firstIdentity.canonicalId === secondIdentity.canonicalId) {
    return true;
  }

  // RR-071: identical canonical ids above prove one listing, but every
  // remaining path is inference from names — and names stating conflicting
  // hard numeric specs (5.5 vs 5 peak HP) prove different machines.
  if (
    conflictingNumericSpecs(identitySpecText(first), identitySpecText(second))
  ) {
    return false;
  }

  // URL-carried model tokens are inference evidence, not proof that two pages
  // describe the same kind of product. A replacement filter or hose may name
  // its parent model in the slug; the shared product-type verdict must still
  // allow both cards before that token can collapse them. Canonical listing-id
  // equality above remains stronger than this inference-only veto.
  if (
    sharedStrongModel &&
    (!productTypeAllowsInferredIdentity(first) ||
      !productTypeAllowsInferredIdentity(second))
  ) {
    return false;
  }

  if (
    sharedStrongModel &&
    firstBrand &&
    secondBrand &&
    firstBrand === secondBrand
  ) {
    return true;
  }

  const firstTitle = firstIdentity.normalizedTitle;
  const secondTitle = secondIdentity.normalizedTitle;

  return Boolean(firstTitle && secondTitle && firstTitle === secondTitle);
}

export const productIdentityTestExports = {
  normalizeTitle,
  sameProductFamilyTitle,
  strongModelTokens,
};

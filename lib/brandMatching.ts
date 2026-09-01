import { SOURCE_NAME_TOKENS } from "./search/sourceSafety.ts";

type BrandDefinition = {
  aliases: string[];
  canonical: string;
};

const brandDefinitions: BrandDefinition[] = [
  { canonical: "Nike", aliases: ["nike", "nike air", "nike zoom"] },
  { canonical: "Nike", aliases: ["air jordan", "jordan brand", "jordan"] },
  { canonical: "Adidas", aliases: ["adidas", "adidas performance", "adizero"] },
  { canonical: "New Balance", aliases: ["new balance", "newbalance", "nb"] },
  { canonical: "ASICS", aliases: ["asics"] },
  { canonical: "Brooks", aliases: ["brooks"] },
  { canonical: "Hoka", aliases: ["hoka", "hoka one one"] },
  { canonical: "Puma", aliases: ["puma"] },
  { canonical: "Reebok", aliases: ["reebok"] },
  { canonical: "Saucony", aliases: ["saucony"] },
  { canonical: "Skechers", aliases: ["skechers"] },
  { canonical: "Under Armour", aliases: ["under armour", "underarmour"] },
  { canonical: "Converse", aliases: ["converse"] },
  { canonical: "Vans", aliases: ["vans"] },
  { canonical: "Apple", aliases: ["apple"] },
  { canonical: "Samsung", aliases: ["samsung"] },
  { canonical: "LG", aliases: ["lg"] },
  { canonical: "Sony", aliases: ["sony"] },
  { canonical: "Bose", aliases: ["bose"] },
  { canonical: "Dell", aliases: ["dell"] },
  { canonical: "HP", aliases: ["hp", "hewlett packard", "hewlett-packard"] },
  { canonical: "Lenovo", aliases: ["lenovo"] },
  { canonical: "GE", aliases: ["ge", "ge appliances"] },
  { canonical: "Whirlpool", aliases: ["whirlpool"] },
  { canonical: "KitchenAid", aliases: ["kitchenaid", "kitchen aid"] },
  { canonical: "Bosch", aliases: ["bosch"] },
  { canonical: "Dyson", aliases: ["dyson"] },
  { canonical: "Shark", aliases: ["shark"] },
  { canonical: "Bissell", aliases: ["bissell"] },
  {
    canonical: "Technivorm",
    aliases: ["technivorm", "moccamaster", "technivorm moccamaster"],
  },
  { canonical: "DeWalt", aliases: ["dewalt", "de walt", "20v max", "20 volt max", "atomic 20v", "atomic 20 volt", "flexvolt"] },
  { canonical: "Milwaukee", aliases: ["milwaukee", "m12 fuel", "m18 fuel", "m12 redlithium", "m18 redlithium"] },
  { canonical: "Makita", aliases: ["makita"] },
  { canonical: "Ryobi", aliases: ["ryobi"] },
  { canonical: "Amazon Basics", aliases: ["amazon basics"] },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

const ADDITIONAL_SOURCE_LABEL_KEYS = new Set([
  "ebay",
  "marketplace",
  "retailer",
]);

function sourceLabelKey(value: string) {
  return compact(
    value
      .replace(/^\s*the\s+/i, "")
      .replace(/\.(?:com|org|net)\b/gi, " "),
  );
}

export function isSourceOrRetailerLabel(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return false;

  const key = sourceLabelKey(raw);
  return (
    /\.(?:com|org|net)\b/i.test(raw) ||
    SOURCE_NAME_TOKENS.has(key) ||
    ADDITIONAL_SOURCE_LABEL_KEYS.has(key) ||
    /(?:marketplace|retailer|store)$/.test(key)
  );
}

export function stripLeadingSourceOrRetailerLabel(value: string) {
  let cleaned = value.trim();

  for (let pass = 0; pass < 2; pass += 1) {
    const match = cleaned.match(/^([^:]{2,50}):\s*(.+)$/);
    if (!match || !isSourceOrRetailerLabel(match[1])) break;
    cleaned = match[2].trim();
  }

  return cleaned;
}

function aliasPattern(alias: string) {
  return new RegExp(`(^|\\W)${normalize(alias).replace(/\s+/g, "\\s+")}(\\W|$)`, "i");
}

function matchesAlias(text: string, alias: string) {
  const normalizedText = normalize(text);
  const normalizedAlias = normalize(alias);

  if (!normalizedAlias) {
    return false;
  }

  if (aliasPattern(normalizedAlias).test(normalizedText)) {
    return true;
  }

  if (normalizedAlias.length <= 3) {
    return false;
  }

  if (
    !normalizedAlias.includes(" ") &&
    normalizedText
      .split(/\s+/)
      .some(
        (word) =>
          word.length > normalizedAlias.length &&
          word.includes(normalizedAlias),
      )
  ) {
    return false;
  }

  return compact(normalizedText).includes(compact(normalizedAlias));
}

function brandEvidenceText(text: string, canonical: string) {
  if (canonical !== "HP") {
    return text;
  }

  return text
    .replace(/\bhorsepower\s*\(\s*hp\s*\)/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:peak\s+)?hp\b/gi, " ")
    .replace(/\b(?:peak|max(?:imum)?|rated)\s+hp\b/gi, " ")
    .replace(
      /\b(?:motor|engine|pump|compressor|suction)\s+(?:rated\s+)?hp\b/gi,
      " ",
    )
    .replace(
      /\bhp\s+(?:motor|engine|pump|compressor|suction|rating)\b/gi,
      " ",
    );
}

function definitionMatches(text: string, definition: BrandDefinition) {
  const evidence = brandEvidenceText(text, definition.canonical);
  return (
    matchesAlias(evidence, definition.canonical) ||
    definition.aliases.some((alias) => matchesAlias(evidence, alias))
  );
}

export function canonicalBrand(value: string) {
  const normalizedValue = normalize(value)
    .replace(/\bonly\b/g, " ")
    .replace(/\bbrand\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const definition of brandDefinitions) {
    if (
      normalize(definition.canonical) === normalizedValue ||
      definition.aliases.some((alias) => normalize(alias) === normalizedValue)
    ) {
      return definition.canonical;
    }
  }

  return value.trim();
}

export function brandAliasesFor(value: string) {
  const canonical = canonicalBrand(value);
  const aliases = new Set<string>([canonical, value.trim()]);

  for (const definition of brandDefinitions) {
    if (definition.canonical === canonical) {
      definition.aliases.forEach((alias) => aliases.add(alias));
    }
  }

  return Array.from(aliases).filter(Boolean);
}

export function detectKnownBrands(text: string) {
  const matches = new Set<string>();

  for (const definition of brandDefinitions) {
    if (definitionMatches(text, definition)) {
      matches.add(definition.canonical);
    }
  }

  return Array.from(matches);
}

export function brandEvidenceMatches(text: string, requiredBrand: string) {
  const canonical = canonicalBrand(requiredBrand);
  const evidence = brandEvidenceText(text, canonical);
  return brandAliasesFor(requiredBrand).some((alias) => matchesAlias(evidence, alias));
}

export function brandAppearsOnlyAsMeasurement(
  text: string,
  requiredBrand: string,
) {
  const canonical = canonicalBrand(requiredBrand);
  if (canonical !== "HP") return false;

  const aliases = brandAliasesFor(requiredBrand);
  return (
    aliases.some((alias) => matchesAlias(text, alias)) &&
    !aliases.some((alias) =>
      matchesAlias(brandEvidenceText(text, canonical), alias),
    )
  );
}

export function inferKnownBrand(text: string) {
  return detectKnownBrands(text)[0] || null;
}

export function isKnownBrand(value: string) {
  return detectKnownBrands(value).length > 0;
}

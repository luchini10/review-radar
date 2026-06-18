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
  { canonical: "Dell", aliases: ["dell"] },
  { canonical: "HP", aliases: ["hp"] },
  { canonical: "Lenovo", aliases: ["lenovo"] },
  { canonical: "GE", aliases: ["ge", "ge appliances"] },
  { canonical: "Whirlpool", aliases: ["whirlpool"] },
  { canonical: "KitchenAid", aliases: ["kitchenaid", "kitchen aid"] },
  { canonical: "Bosch", aliases: ["bosch"] },
  { canonical: "Dyson", aliases: ["dyson"] },
  { canonical: "Shark", aliases: ["shark"] },
  { canonical: "Bissell", aliases: ["bissell"] },
  { canonical: "DeWalt", aliases: ["dewalt", "de walt"] },
  { canonical: "Milwaukee", aliases: ["milwaukee"] },
  { canonical: "Makita", aliases: ["makita"] },
  { canonical: "Ryobi", aliases: ["ryobi"] },
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

  return compact(normalizedText).includes(compact(normalizedAlias));
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
    if (
      matchesAlias(text, definition.canonical) ||
      definition.aliases.some((alias) => matchesAlias(text, alias))
    ) {
      matches.add(definition.canonical);
    }
  }

  return Array.from(matches);
}

export function brandEvidenceMatches(text: string, requiredBrand: string) {
  return brandAliasesFor(requiredBrand).some((alias) => matchesAlias(text, alias));
}

export function inferKnownBrand(text: string) {
  return detectKnownBrands(text)[0] || null;
}

export function isKnownBrand(value: string) {
  return detectKnownBrands(value).length > 0;
}

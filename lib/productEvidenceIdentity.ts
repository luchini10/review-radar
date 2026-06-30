export type ProductEvidenceIdentity =
  | "same_product"
  | "generic_evidence"
  | "conflicting_product"
  | "unknown";

type ProductEvidenceIdentityInput = {
  category?: string | null;
  productName: string;
  sourceTitle?: string | null;
  url?: string | null;
};

const GENERIC_IDENTITY_WORDS = new Set([
  "adult",
  "and",
  "bag",
  "brand",
  "buy",
  "complete",
  "dry",
  "food",
  "for",
  "formula",
  "free",
  "from",
  "official",
  "online",
  "product",
  "products",
  "recipe",
  "shipping",
  "shop",
  "store",
  "the",
  "with",
]);

const PROTEIN_VARIANTS = new Set([
  "beef",
  "bison",
  "chicken",
  "duck",
  "fish",
  "lamb",
  "pork",
  "rabbit",
  "salmon",
  "shrimp",
  "tuna",
  "turkey",
  "venison",
]);

const FLAVOR_VARIANTS = new Set([
  "banana",
  "berry",
  "caramel",
  "chocolate",
  "cinnamon",
  "mint",
  "peanut",
  "strawberry",
  "vanilla",
]);

const LIFE_STAGE_VARIANTS = new Set([
  "adult",
  "kitten",
  "puppy",
  "senior",
]);

const RECIPE_BASE_VARIANTS = new Set([
  "barley",
  "oatmeal",
  "pea",
  "potato",
  "rice",
]);

const COLOR_VARIANTS = new Set([
  "beige",
  "black",
  "blue",
  "brown",
  "gold",
  "green",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "ruby",
  "silver",
  "tan",
  "white",
  "yellow",
]);

const NUMERIC_SERIES_UNITS = new Set([
  "amp",
  "amps",
  "btu",
  "cfm",
  "count",
  "ct",
  "cup",
  "cups",
  "gallon",
  "gallons",
  "gb",
  "ghz",
  "gram",
  "grams",
  "hp",
  "hz",
  "inch",
  "inches",
  "lb",
  "lbs",
  "liter",
  "liters",
  "mah",
  "mph",
  "ounce",
  "ounces",
  "oz",
  "pack",
  "packs",
  "pint",
  "pints",
  "psi",
  "qt",
  "quarts",
  "tb",
  "volt",
  "volts",
  "watt",
  "watts",
]);

const NUMERIC_SERIES_CONTEXT_WORDS = new Set([
  ...GENERIC_IDENTITY_WORDS,
  "cordless",
  "edition",
  "electric",
  "generation",
  "model",
  "plus",
  "pro",
  "rechargeable",
  "series",
  "smart",
  "ultra",
  "wireless",
]);

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string | null | undefined) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function urlPathText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const segments = decodeURIComponent(new URL(value).pathname)
      .split("/")
      .filter(Boolean);

    return segments
      .filter((segment, index) => {
        const previous = segments[index - 1]?.toLowerCase() || "";

        if (/^\d+(?:\.p)?$/i.test(segment)) {
          return false;
        }

        return !(
          previous === "dp" &&
          /^b0[a-z0-9]{8,}$/i.test(segment)
        );
      })
      .join(" ");
  } catch {
    return "";
  }
}

export function isGenericProductEvidenceUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const segments = new URL(value).pathname
      .toLowerCase()
      .split("/")
      .filter(Boolean);
    const finalSegment = segments[segments.length - 1] || "";

    if (
      segments.some((segment) =>
        /^(?:brand|brands|category|categories|collection|collections|families|family)$/.test(
          segment,
        ),
      )
    ) {
      return true;
    }

    return (
      segments.includes("f") &&
      /_(?:c|f)[a-z0-9_-]*$/i.test(finalSegment)
    );
  } catch {
    return false;
  }
}

function modelLikeTokens(value: string) {
  return tokens(value).filter(
    (token) =>
      token.length >= 3 &&
      /[a-z]/.test(token) &&
      /\d/.test(token) &&
      !/^\d+(?:lb|lbs|oz|inch|in|count|ct|pack)$/.test(token),
  );
}

function explicitModelConflict(productName: string, sourceText: string) {
  const productModels = modelLikeTokens(productName);
  const sourceModels = modelLikeTokens(sourceText);

  return (
    productModels.length > 0 &&
    sourceModels.length > 0 &&
    !productModels.some((model) => sourceModels.includes(model))
  );
}

type NumericSeriesIdentity = {
  anchors: Set<string>;
  value: string;
};

function numericSeriesIdentities(value: string, category?: string | null) {
  const cleanValue = value.replace(/\$\s*\d[\d,]*(?:\.\d+)?/g, " ");
  const valueTokens = tokens(cleanValue);
  const categoryWords = categoryTokens(category);
  const identities: NumericSeriesIdentity[] = [];

  for (let index = 0; index < valueTokens.length; index += 1) {
    const token = valueTokens[index];
    if (!/^\d{3,5}$/.test(token)) continue;

    const numericValue = Number(token);
    if (numericValue >= 1900 && numericValue <= 2099) continue;
    if (NUMERIC_SERIES_UNITS.has(valueTokens[index + 1] || "")) continue;

    const anchors = new Set(
      valueTokens
        .slice(Math.max(0, index - 4), index)
        .filter(
          (word) =>
            word.length >= 3 &&
            /[a-z]/.test(word) &&
            !NUMERIC_SERIES_CONTEXT_WORDS.has(word) &&
            !categoryWords.has(word),
        ),
    );
    if (anchors.size > 0) {
      identities.push({ anchors, value: token });
    }
  }

  return identities;
}

function explicitNumericSeriesConflict(
  productName: string,
  sourceText: string,
  category?: string | null,
) {
  const productSeries = numericSeriesIdentities(productName, category);
  const sourceSeries = numericSeriesIdentities(sourceText, category);

  return productSeries.some((productIdentity) =>
    sourceSeries.some(
      (sourceIdentity) =>
        productIdentity.value !== sourceIdentity.value &&
        Array.from(productIdentity.anchors).some((anchor) =>
          sourceIdentity.anchors.has(anchor),
        ),
    ),
  );
}

function valuesFromGroup(value: string, group: Set<string>) {
  return new Set(tokens(value).filter((token) => group.has(token)));
}

function disjointExplicitValues(
  productName: string,
  sourceText: string,
  group: Set<string>,
) {
  const productValues = valuesFromGroup(productName, group);
  const sourceValues = valuesFromGroup(sourceText, group);

  return (
    productValues.size > 0 &&
    sourceValues.size > 0 &&
    !Array.from(productValues).some((value) => sourceValues.has(value))
  );
}

export function hasExplicitVariantConflict(
  productName: string,
  sourceText: string,
  category?: string | null,
) {
  if (!sourceText) {
    return false;
  }

  if (explicitModelConflict(productName, sourceText)) {
    return true;
  }

  if (explicitNumericSeriesConflict(productName, sourceText, category)) {
    return true;
  }

  const context = normalizeText(`${category || ""} ${productName}`);
  const foodOrSupplementContext =
    /\b(?:beverage|drink|food|nutrition|protein|shake|snack|supplement|treat)\b/.test(
      context,
    );
  const cosmeticContext =
    /\b(?:blush|concealer|cosmetic|eyeshadow|foundation|lipstick|makeup|nail|shade)\b/.test(
      context,
    );

  if (
    foodOrSupplementContext &&
    (disjointExplicitValues(productName, sourceText, PROTEIN_VARIANTS) ||
      disjointExplicitValues(productName, sourceText, FLAVOR_VARIANTS) ||
      disjointExplicitValues(productName, sourceText, LIFE_STAGE_VARIANTS) ||
      disjointExplicitValues(productName, sourceText, RECIPE_BASE_VARIANTS))
  ) {
    return true;
  }

  return (
    cosmeticContext &&
    disjointExplicitValues(productName, sourceText, COLOR_VARIANTS)
  );
}

function categoryTokens(category: string | null | undefined) {
  return new Set(tokens(category));
}

function distinctiveTokens(
  value: string,
  category: string | null | undefined,
) {
  const categoryWords = categoryTokens(category);

  return tokens(value).filter(
    (token) =>
      token.length > 1 &&
      !GENERIC_IDENTITY_WORDS.has(token) &&
      !categoryWords.has(token) &&
      !/^\d+$/.test(token) &&
      !/^(?:lb|lbs|oz|inch|in|count|ct|pack)$/.test(token),
  );
}

function textSupportsProductIdentity(
  productName: string,
  sourceText: string,
  category: string | null | undefined,
) {
  const productTokens = distinctiveTokens(productName, category);
  const sourceTokens = new Set(distinctiveTokens(sourceText, category));

  if (productTokens.length === 0 || sourceTokens.size === 0) {
    return false;
  }

  const productModels = modelLikeTokens(productName);

  if (
    productModels.length > 0 &&
    productModels.some((model) => sourceTokens.has(model))
  ) {
    return true;
  }

  const overlap = productTokens.filter((token) => sourceTokens.has(token)).length;
  const requiredOverlap = Math.max(2, Math.ceil(productTokens.length * 0.55));

  return overlap >= requiredOverlap;
}

export function classifyProductEvidenceIdentity(
  input: ProductEvidenceIdentityInput,
): ProductEvidenceIdentity {
  if (isGenericProductEvidenceUrl(input.url)) {
    return "generic_evidence";
  }

  const pathText = urlPathText(input.url);
  const sourceTitle = input.sourceTitle || "";

  if (
    hasExplicitVariantConflict(
      input.productName,
      sourceTitle,
      input.category,
    ) ||
    hasExplicitVariantConflict(
      input.productName,
      pathText,
      input.category,
    )
  ) {
    return "conflicting_product";
  }

  if (
    textSupportsProductIdentity(
      input.productName,
      sourceTitle,
      input.category,
    ) ||
    textSupportsProductIdentity(
      input.productName,
      pathText,
      input.category,
    )
  ) {
    return "same_product";
  }

  return "unknown";
}

export const productEvidenceIdentityTestExports = {
  hasExplicitVariantConflict,
};

import type { ProductRecommendation } from "@/types/review-radar";
import { canonicalBrand, detectKnownBrands } from "./brandMatching.ts";

// Variant family = same BRAND + same SIZE/CAPACITY. Products in the same family
// differ only by model number / minor spec (e.g. "Vacmaster 8-Gallon 4.5 HP" vs
// "Vacmaster 8-Gallon 3.5 HP"), so the selection step keeps only the most popular/
// trusted one. Different sizes (5- vs 6-gallon) are DIFFERENT families and both
// stay. We deliberately read only true size/capacity units — never power (HP),
// voltage, etc. — so a horsepower difference doesn't masquerade as a size
// difference (that size-blind merge was the bug in the earlier attempt).

// Regexes declared WITHOUT the global flag; each capture group 1 is the amount.
const SIZE_UNITS: Array<{ canonical: string; pattern: RegExp }> = [
  { canonical: "gallon", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:gallons?|gal)\b/i },
  { canonical: "cuft", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:cu\.?\s*ft|cubic\s*feet|cu\.?\s*foot)\b/i },
  { canonical: "quart", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:quarts?|qt)\b/i },
  { canonical: "liter", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:liters?|litres?)\b/i },
  { canonical: "inch", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:inch(?:es)?|")/i },
  { canonical: "oz", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:ounces?|oz)\b/i },
  { canonical: "lb", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:pounds?|lbs?)\b/i },
  { canonical: "ml", pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:milliliters?|ml)\b/i },
];

const GENERIC_BRAND_WORDS = new Set([
  "best", "top", "the", "new", "shop", "buy", "premium", "professional", "portable",
  "cordless", "corded", "wet", "dry", "heavy", "duty", "compact", "large", "small",
  // size/spec words must never be mistaken for a brand
  "gallon", "gallons", "inch", "inches", "quart", "liter", "litre", "ounce", "pound",
  "pounds", "cubic", "peak", "vacuum", "vac",
]);

function normalize(value: string | null | undefined) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// The most prominent size/capacity in the text, normalized to "<amount> <unit>"
// (e.g. "8 gallon", "65 inch"). Returns the first size unit found scanning the
// curated list in order. Null when no size is present.
export function detectPrimarySize(text: string | undefined): string | null {
  const value = text || "";

  for (const unit of SIZE_UNITS) {
    const match = value.match(unit.pattern);

    if (match) {
      const amount = Number(match[1]);

      if (Number.isFinite(amount) && amount > 0) {
        return `${amount} ${unit.canonical}`;
      }
    }
  }

  return null;
}

function variantBrand(product: ProductRecommendation): string | null {
  const metaBrand = product.metadata?.brand?.value;

  if (metaBrand) {
    return normalize(canonicalBrand(metaBrand));
  }

  const known = detectKnownBrands(product.name || "");

  if (known.length > 0) {
    return normalize(canonicalBrand(known[0]));
  }

  // Fallback: the FIRST token of the name is usually the brand. Reject it if it is
  // a number, a size/spec word, or a generic word — then there is no usable brand.
  const firstToken = normalize(product.name).split(" ")[0] || "";

  if (firstToken.length >= 3 && !/\d/.test(firstToken) && !GENERIC_BRAND_WORDS.has(firstToken)) {
    return firstToken;
  }

  return null;
}

// A stable key for "same brand + same size" — or null when brand or size is
// unknown, in which case the product is NEVER collapsed (kept distinct, safe).
export function variantFamilyKey(product: ProductRecommendation): string | null {
  const brand = variantBrand(product);
  const size = detectPrimarySize(
    `${product.name || ""} ${product.metadata?.title?.value || ""}`,
  );

  if (!brand || !size) {
    return null;
  }

  return `${brand}|${size}`;
}

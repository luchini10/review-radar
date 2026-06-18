const colorWords = [
  "beige",
  "black",
  "blue",
  "brown",
  "charcoal",
  "cream",
  "gray",
  "grey",
  "green",
  "ivory",
  "navy",
  "red",
  "tan",
  "taupe",
  "white",
];

function normalizeSpacing(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripKnownFilterText(value: string) {
  let text = ` ${value.toLowerCase()} `;

  text = text.replace(
    /\b(?:under|less than|below|no bigger than|no larger than|no deeper than|no taller than|at most|max|maximum)\s*\d+(?:\.\d+)?\s*(?:inches|inch|in\.?|")\s*(?:wide|width|deep|depth|high|height|tall)?\b/g,
    " ",
  );
  text = text.replace(
    /\b(?:at least|min|minimum)\s*\d+(?:\.\d+)?\s*(?:inches|inch|in\.?|")\s*(?:wide|width|deep|depth|high|height|tall)?\b/g,
    " ",
  );
  text = text.replace(
    /\b(?:under|less than|below|no more than|at most|max|maximum)\s*\$?\s*[\d,]+(?:\.\d+)?\b/g,
    " ",
  );

  for (const color of colorWords) {
    text = text.replace(new RegExp(`\\b${color}\\b`, "g"), " ");
  }

  text = text.replace(
    /\b(?:left|right)[\s-]?(?:hand|arm)?[\s-]?facing\b|\b[lr]af\b/g,
    " ",
  );

  return normalizeSpacing(text);
}

export function baseProductCategoryFromQuery(query: string) {
  const stripped = stripKnownFilterText(query)
    .replace(/\b(?:best|top rated|recommended|sale|deals?)\b/g, " ")
    .replace(/\b(?:for sale|buy online)\b/g, " ");
  const cleaned = normalizeSpacing(stripped);

  return cleaned || normalizeSpacing(query);
}

// Bed/mattress sizes are mutually exclusive enumerated values. We only treat a
// word like "king"/"full" as a SIZE inside a sleep/furniture context, so it
// never fires for unrelated queries (e.g. "full HD monitor"). Ordered most-
// specific first so "california king" wins over "king" and "twin xl" over "twin".
// Explicit sleep terms only — deliberately NOT bare "bed" (avoids "truck bed",
// "flower bed", "tanning bed", etc.).
const BED_CONTEXT_PATTERN =
  /\b(?:mattress|bedding|bedroom|bed frame|platform bed|bunk bed|headboard|sheets?|comforter|duvet|bedspread|box spring|sleeper)\b/i;

const BED_SIZES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "california king", aliases: ["california king", "cal king", "ca king", "cal-king", "calking"] },
  { canonical: "split king", aliases: ["split king"] },
  { canonical: "twin xl", aliases: ["twin xl", "twin extra long"] },
  { canonical: "full xl", aliases: ["full xl"] },
  { canonical: "twin", aliases: ["twin"] },
  { canonical: "full", aliases: ["full"] },
  { canonical: "queen", aliases: ["queen"] },
  { canonical: "king", aliases: ["king"] },
];

// requireContext defaults true (for queries). Pass false when the caller already
// knows the search is bed-related (e.g. matching a product within a bed search).
export function detectBedSize(
  text: string | undefined,
  options: { requireContext?: boolean } = {},
): string | null {
  const value = text || "";
  const requireContext = options.requireContext ?? true;

  if (!value || (requireContext && !BED_CONTEXT_PATTERN.test(value))) {
    return null;
  }

  const normalized = ` ${value.toLowerCase()} `;

  for (const size of BED_SIZES) {
    for (const alias of size.aliases) {
      const pattern = new RegExp(
        `(^|\\W)${alias.replace(/\s+/g, "\\s+")}(\\W|$)`,
        "i",
      );

      if (pattern.test(normalized)) {
        return size.canonical;
      }
    }
  }

  return null;
}

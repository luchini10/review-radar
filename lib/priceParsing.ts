type MoneyExtractionOptions = {
  allowBareNumeric?: boolean;
  allowBareRange?: boolean;
};

const negativePriceContext =
  /\b(?:not|no|unknown|unavailable|unverified|verify|varies|depends|missing|absent)\b/i;

function normalizePriceText(value: string) {
  return value.replace(/[–—]/g, "-");
}

export function parseMoneyAmount(value: string) {
  const amount = Number(value.replace(/,/g, ""));

  return Number.isFinite(amount) ? amount : null;
}

function usablePriceAmount(value: string | undefined) {
  if (!value) {
    return null;
  }

  const amount = parseMoneyAmount(value);

  if (amount === null || amount <= 0 || amount >= 1_000_000) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function hasCurrencyMarker(value: string) {
  return /[$]|\b(?:usd|us\$|dollars?)\b/i.test(value);
}

function pushAmount(amounts: number[], value: string | undefined) {
  const amount = usablePriceAmount(value);

  if (amount !== null) {
    amounts.push(amount);
  }
}

function isPercentMatch(text: string, matchStart: number, matchedText: string) {
  const after = text.slice(matchStart + matchedText.length, matchStart + matchedText.length + 3);

  return /^\s*%/.test(after) || /\d[\d,]*(?:\.\d+)?\s*%/.test(matchedText);
}

function textAroundMatchHasPriceContext(text: string, matchStart: number) {
  const before = text.slice(Math.max(0, matchStart - 48), matchStart);

  return /\b(?:as low as|starting at|starts at|current price|sale price|list price|regular price|retail price|low price|price|sale|offer|now|from|msrp)\b/i.test(
    before,
  );
}

function bareRangeIsEntireValue(text: string, matchedText: string) {
  const remainder = text
    .replace(matchedText, " ")
    .replace(/\b(?:about|around|roughly|approximately|price|range|from|usd|dollars?)\b/gi, " ")
    .replace(/[:$]/g, " ")
    .trim();

  return remainder.length === 0;
}

export function extractMoneyAmounts(
  value: unknown,
  options: MoneyExtractionOptions = {},
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 && value < 1_000_000 ? [Math.round(value * 100) / 100] : [];
  }

  if (typeof value !== "string") {
    return [];
  }

  const text = normalizePriceText(value);
  const amounts: number[] = [];
  const rangePattern =
    /((?:[$]\s*|(?:us\$|usd)\s*)?)(\d[\d,]*(?:\.\d+)?)\s*(?:-|to)\s*((?:[$]\s*|(?:us\$|usd)\s*)?)(\d[\d,]*(?:\.\d+)?)/gi;

  for (const match of text.matchAll(rangePattern)) {
    const matchedText = match[0];
    const matchStart = match.index || 0;
    const hasContext =
      hasCurrencyMarker(matchedText) ||
      textAroundMatchHasPriceContext(text, matchStart) ||
      (options.allowBareRange && bareRangeIsEntireValue(text, matchedText));

    if (!hasContext) {
      continue;
    }

    pushAmount(amounts, match[2]);
    pushAmount(amounts, match[4]);
  }

  const leadingCurrencyPattern =
    /(?:[$]\s*|(?:us\$|usd)\s*)(\d[\d,]*(?:\.\d+)?)/gi;

  for (const match of text.matchAll(leadingCurrencyPattern)) {
    if (!isPercentMatch(text, match.index || 0, match[0])) {
      pushAmount(amounts, match[1]);
    }
  }

  const trailingCurrencyPattern =
    /(\d[\d,]*(?:\.\d+)?)\s*(?:usd|dollars?)\b/gi;

  for (const match of text.matchAll(trailingCurrencyPattern)) {
    if (!isPercentMatch(text, match.index || 0, match[0])) {
      pushAmount(amounts, match[1]);
    }
  }

  const labeledPricePattern =
    /\b(?:as low as|starting at|starts at|current price|sale price|list price|regular price|retail price|low price|price|sale|offer|now|from|msrp)\b([^0-9$]{0,48})\$?\s*(\d[\d,]*(?:\.\d+)?)/gi;

  for (const match of text.matchAll(labeledPricePattern)) {
    const beforeLabel = text.slice(Math.max(0, (match.index || 0) - 16), match.index || 0);

    if (/\bno\s*$/i.test(beforeLabel)) {
      continue;
    }

    if (negativePriceContext.test(match[1] || "")) {
      continue;
    }

    if (!isPercentMatch(text, match.index || 0, match[0])) {
      pushAmount(amounts, match[2]);
    }
  }

  if (options.allowBareNumeric) {
    const exactNumber = text.match(
      /^\s*(?:about|around|roughly|approximately|price(?:\s*range)?\s*:?)?\s*(\d[\d,]*(?:\.\d+)?)\s*$/,
    );

    if (exactNumber?.[1]) {
      pushAmount(amounts, exactNumber[1]);
    }
  }

  return Array.from(new Set(amounts));
}

export function parseBestMoneyAmount(
  value: unknown,
  options: MoneyExtractionOptions = {},
) {
  const amounts = extractMoneyAmounts(value, options);

  return amounts.length > 0 ? Math.min(...amounts) : null;
}

export function priceTextLooksUnverified(value: string) {
  return /\b(?:not verified|not surfaced|not listed|no price|price unavailable|price unknown|unknown|unavailable|varies|depends|likely|maybe|around above|roughly above)\b/i.test(
    value,
  );
}

function priceTextLooksLikeVagueCeiling(value: string) {
  return /^\s*(?:under|below|less than|underneath|sub)\s+\$?\s*\d[\d,]*(?:\.\d+)?\s*(?:dollars?)?\s*$/i.test(
    value,
  );
}

export function parseBestProductPriceText(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (priceTextLooksUnverified(value) || priceTextLooksLikeVagueCeiling(value)) {
    return null;
  }

  const price = parseBestMoneyAmount(value, {
    allowBareNumeric: true,
    allowBareRange: true,
  });

  if (price !== null) {
    return price;
  }

  return null;
}

const PRICE_ABS_FLOOR = 10;
const PRICE_REL_FLOOR = 0.25;

// Reject offer prices that are implausibly low relative to the product's own
// stronger price evidence — a "$1" financing line or a "$100" accessory parse on
// a ~$450 grill. Returns the best (lowest) plausible price, or null when every
// signal looks broken, so the price is treated as unverified rather than
// fake-cheap (which would falsely pass a budget filter and inflate value).
export function plausibleProductPrice(
  offerPrices: Array<number | null | undefined>,
  textPrice: number | null,
): number | null {
  const offers = offerPrices.filter(
    (price): price is number =>
      typeof price === "number" && Number.isFinite(price) && price > 0,
  );
  const hasTextPrice =
    textPrice !== null && Number.isFinite(textPrice) && textPrice > 0;
  const signals = hasTextPrice ? [textPrice, ...offers] : offers;

  if (signals.length === 0) {
    return null;
  }

  const reference = Math.max(...signals);
  const minPlausible = Math.max(PRICE_ABS_FLOOR, reference * PRICE_REL_FLOOR);
  const plausibleOffers = offers
    .filter((price) => price >= minPlausible)
    .sort((first, second) => first - second);

  if (plausibleOffers.length > 0) {
    return plausibleOffers[0];
  }

  if (hasTextPrice && textPrice >= minPlausible) {
    return textPrice;
  }

  return null;
}

function looksLikeDimensionAmount(text: string, matchEndIndex: number) {
  return /^\s*(?:inches|inch|in\.?|")\b/i.test(text.slice(matchEndIndex));
}

function parseBudgetRangeMax(value: string, requireDollarSign: boolean) {
  const text = normalizePriceText(value);
  const rangePatterns = [
    /\bbetween\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
    /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:-|to)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
  ];

  for (const pattern of rangePatterns) {
    for (const match of text.matchAll(pattern)) {
      if (requireDollarSign && !match[0].includes("$")) {
        continue;
      }

      const low = match[1] ? parseMoneyAmount(match[1]) : null;
      const high = match[2] ? parseMoneyAmount(match[2]) : null;

      if (
        low === null ||
        high === null ||
        !Number.isFinite(low) ||
        !Number.isFinite(high) ||
        looksLikeDimensionAmount(text, (match.index || 0) + match[0].length)
      ) {
        continue;
      }

      return Math.max(low, high);
    }
  }

  return null;
}

export function parseMaxBudgetAmount(
  value: string | undefined,
  options: { requireDollarSignForRanges?: boolean } = {},
) {
  if (!value) {
    return null;
  }

  const text = normalizePriceText(value);
  const rangeMax = parseBudgetRangeMax(
    text,
    options.requireDollarSignForRanges || false,
  );

  if (rangeMax !== null) {
    return rangeMax;
  }

  const patterns = [
    /\b(?:under|less than|below|no more than|at most|max|maximum)\s*\$?\s*([\d,]+(?:\.\d+)?)\b/gi,
    /\$\s*([\d,]+(?:\.\d+)?)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = match[1] ? parseMoneyAmount(match[1]) : null;

      if (amount === null || !Number.isFinite(amount)) {
        continue;
      }

      if (looksLikeDimensionAmount(text, (match.index || 0) + match[0].length)) {
        continue;
      }

      return amount;
    }
  }

  return null;
}

export function formatDollars(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

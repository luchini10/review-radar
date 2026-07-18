const markdownLinkPattern = /\[([^\]\r\n]+)\]\((https?:\/\/[^)\s]+)\)/gi;
const currencyAmountPattern =
  /(?:\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY)\s*(?:[$€£¥]\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|[$€£¥]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY)\b)/gi;

export const TWO_LAYER_UNVERIFIED_PRICE_TEXT =
  "current price not independently verified";

export function twoLayerDisplayText(value: string) {
  return value.replace(markdownLinkPattern, "$1");
}

export function twoLayerResearchDisplayText(value: string) {
  return twoLayerDisplayText(value).replace(
    currencyAmountPattern,
    TWO_LAYER_UNVERIFIED_PRICE_TEXT,
  );
}

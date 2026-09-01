export const USER_ERROR_MESSAGES = {
  emptySearch: "Please enter a product category.",
  networkError: "Something went wrong while finding products. Try again.",
  requestCancelled: "The request was cancelled.",
  searchUnavailable:
    "Product search is temporarily unavailable. Please try again shortly.",
  slowResponse:
    "The search is taking longer than expected. Try again with a narrower request.",
  temporaryRateLimit:
    "The recommendation engine is busy. Wait a minute, then try again.",
  vagueSearch: "Please enter a more specific product category.",
} as const;

const vagueSearchTerms = new Set([
  "best",
  "cheap",
  "good",
  "great",
  "anything",
  "item",
  "items",
  "product",
  "products",
  "stuff",
  "thing",
  "things",
]);

export function getSearchValidationError(query: string) {
  const trimmed = query.trim();
  const normalizedWords = trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean);

  if (!trimmed) {
    return USER_ERROR_MESSAGES.emptySearch;
  }

  if (trimmed.length < 3 || normalizedWords.length === 0) {
    return USER_ERROR_MESSAGES.vagueSearch;
  }

  if (normalizedWords.every((word) => vagueSearchTerms.has(word))) {
    return USER_ERROR_MESSAGES.vagueSearch;
  }

  return null;
}

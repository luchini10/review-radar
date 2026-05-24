export const USER_ERROR_MESSAGES = {
  badStructuredOutput: "Something went wrong while researching. Try again.",
  emptySearch: "Please enter a product category.",
  missingApiKey: "The recommendation engine is not configured yet.",
  modelUnavailable:
    "The selected OpenAI model is not available for this account.",
  networkError: "Something went wrong while researching. Try again.",
  noReliableEvidence: "I could not find enough reliable evidence for that search.",
  openAiFailure: "Something went wrong while researching. Try again.",
  slowResponse:
    "Research is taking longer than expected. Try again with a narrower search.",
  temporaryRateLimit:
    "The recommendation engine is busy. Wait a minute, then try again.",
  usageLimit:
    "The recommendation engine has reached its usage limit. Check billing or try again later.",
  vagueSearch: "Please enter a more specific product category.",
} as const;

const vagueSearchTerms = new Set([
  "best",
  "cheap",
  "good",
  "great",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getSafeOpenAIErrorMessage(error: unknown) {
  if (!isRecord(error)) {
    return USER_ERROR_MESSAGES.openAiFailure;
  }

  const status = typeof error.status === "number" ? error.status : undefined;
  const code = typeof error.code === "string" ? error.code : undefined;
  const type = typeof error.type === "string" ? error.type : undefined;
  const message = typeof error.message === "string" ? error.message : "";

  if (status === 401) {
    return USER_ERROR_MESSAGES.missingApiKey;
  }

  if (code === "model_not_found") {
    return USER_ERROR_MESSAGES.modelUnavailable;
  }

  if (status === 403) {
    return USER_ERROR_MESSAGES.openAiFailure;
  }

  if (status === 429) {
    if (code === "insufficient_quota") {
      return USER_ERROR_MESSAGES.usageLimit;
    }

    if (code === "rate_limit_exceeded") {
      return USER_ERROR_MESSAGES.temporaryRateLimit;
    }

    if (type === "tokens" || type === "requests") {
      return USER_ERROR_MESSAGES.temporaryRateLimit;
    }

    return USER_ERROR_MESSAGES.usageLimit;
  }

  if (code === "ENOTFOUND" || code === "ECONNRESET" || code === "ETIMEDOUT") {
    return USER_ERROR_MESSAGES.networkError;
  }

  if (message.toLowerCase().includes("connection error")) {
    return USER_ERROR_MESSAGES.networkError;
  }

  if (message.toLowerCase().includes("timeout")) {
    return USER_ERROR_MESSAGES.slowResponse;
  }

  if (message.toLowerCase().includes("unsupported")) {
    return USER_ERROR_MESSAGES.openAiFailure;
  }

  return USER_ERROR_MESSAGES.openAiFailure;
}

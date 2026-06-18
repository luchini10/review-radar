import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSafeOpenAIErrorMessage,
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "../lib/errorMessages.ts";

describe("search validation messages", () => {
  it("rejects an empty search with a simple message", () => {
    assert.equal(
      getSearchValidationError("   "),
      USER_ERROR_MESSAGES.emptySearch,
    );
  });

  it("rejects a search that is too vague", () => {
    assert.equal(
      getSearchValidationError("best cheap product"),
      USER_ERROR_MESSAGES.vagueSearch,
    );
    assert.equal(
      getSearchValidationError("anything"),
      USER_ERROR_MESSAGES.vagueSearch,
    );
    assert.equal(
      getSearchValidationError("cheap item"),
      USER_ERROR_MESSAGES.vagueSearch,
    );
  });

  it("accepts a normal product search", () => {
    assert.equal(getSearchValidationError("gaming chair"), null);
  });
});

describe("OpenAI failure messages", () => {
  it("returns the configured message when the API key is missing or invalid", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({ status: 401 }),
      USER_ERROR_MESSAGES.missingApiKey,
    );
  });

  it("returns a simple message for a general API failure", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({ status: 500 }),
      USER_ERROR_MESSAGES.openAiFailure,
    );
  });

  it("returns a clear message when the selected model is unavailable", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({ code: "model_not_found", status: 404 }),
      USER_ERROR_MESSAGES.modelUnavailable,
    );
  });

  it("returns a simple message for a web or network failure", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({ code: "ETIMEDOUT" }),
      USER_ERROR_MESSAGES.networkError,
    );
  });

  it("returns a slow-response message for timeout errors", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({ message: "Request timeout" }),
      USER_ERROR_MESSAGES.slowResponse,
    );
  });

  it("separates temporary rate limits from exhausted quota", () => {
    assert.equal(
      getSafeOpenAIErrorMessage({
        code: "rate_limit_exceeded",
        status: 429,
      }),
      USER_ERROR_MESSAGES.temporaryRateLimit,
    );

    assert.equal(
      getSafeOpenAIErrorMessage({
        code: "insufficient_quota",
        status: 429,
      }),
      USER_ERROR_MESSAGES.usageLimit,
    );
  });
});

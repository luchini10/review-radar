import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isBudgetComplianceCopy,
  sanitizeProductCons,
  sanitizeProductPros,
} from "../lib/productCopySanitizer.ts";

describe("product pros and cons copy sanitizer", () => {
  it("removes budget compliance phrasing from pros", () => {
    const pros = sanitizeProductPros([
      "Review snippets mention good suction performance.",
      "Official price shown as $899.99, staying within the main budget.",
      "Stays within budget for most shoppers.",
      "Fits the stated price range.",
      "Under budget at the official retailer.",
    ]);

    assert.deepEqual(pros, ["Good suction performance."]);
  });

  it("removes budget compliance phrasing from cons", () => {
    const cons = sanitizeProductCons([
      "Price is under budget but availability may vary.",
      "Some owner reviews mention weak battery life.",
    ]);

    assert.deepEqual(cons, [
      "Some owner reviews mention weak battery life.",
    ]);
  });

  it("allows value-for-money judgments when tied to product evidence", () => {
    const valuePro =
      "Review evidence suggests strong performance for the money compared with similar models.";

    assert.equal(isBudgetComplianceCopy(valuePro), false);
    assert.deepEqual(sanitizeProductPros([valuePro]), [valuePro]);
  });

  it("rewrites evidence-preface wording into shopper-facing product copy", () => {
    assert.deepEqual(
      sanitizeProductPros(["Review evidence mentions durable build quality."]),
      ["Durable build quality."],
    );
    assert.deepEqual(
      sanitizeProductPros(["Search evidence confirms: Easy To Clean (target.com)."]),
      ["Easy to clean."],
    );
    assert.deepEqual(
      sanitizeProductCons(["Some review snippets mention noise."]),
      ["Can be noisy."],
    );
  });
});

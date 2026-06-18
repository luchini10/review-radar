import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseBestMoneyAmount,
  parseBestProductPriceText,
  parseMaxBudgetAmount,
  plausibleProductPrice,
} from "../lib/priceParsing.ts";

describe("price parsing", () => {
  it("uses the lowest current-looking money amount from sale text", () => {
    assert.equal(parseBestMoneyAmount("Was $599.99, now $349.99"), 349.99);
  });

  it("uses the lowest available price from a current product price range", () => {
    assert.equal(parseBestProductPriceText("About $39.97 to $44.98"), 39.97);
  });

  it("does not treat model or review numbers as product prices", () => {
    assert.equal(
      parseBestProductPriceText(
        "No price listed; model 9000 has 4.8-star owner feedback.",
      ),
      null,
    );
  });

  it("does not treat vague ceiling text as an exact product price", () => {
    assert.equal(parseBestProductPriceText("Under $300"), null);
    assert.equal(parseBestProductPriceText("less than 500 dollars"), null);
  });

  it("uses the upper bound for budget ranges", () => {
    assert.equal(parseMaxBudgetAmount("$400-$600"), 600);
    assert.equal(parseMaxBudgetAmount("between $500 and $700"), 700);
  });
});

describe("plausibleProductPrice (rejects broken low prices)", () => {
  it("keeps a normal price unchanged", () => {
    assert.equal(plausibleProductPrice([449], 449), 449);
    assert.equal(plausibleProductPrice([449, 499], 449), 449);
  });

  it("drops a $1 offer in favor of the real price evidence", () => {
    assert.equal(plausibleProductPrice([1], 449), 449);
    assert.equal(plausibleProductPrice([1, 449], null), 449);
  });

  it("drops an implausible $100 offer against a ~$450 product", () => {
    assert.equal(plausibleProductPrice([100], 449), 449);
    assert.equal(plausibleProductPrice([100, 249], 449), 249);
  });

  it("returns null (unverified) when every signal is implausibly low", () => {
    assert.equal(plausibleProductPrice([1], 1), null);
    assert.equal(plausibleProductPrice([], null), null);
  });

  it("does not reject genuinely cheap, consistent prices", () => {
    assert.equal(plausibleProductPrice([12, 15], 15), 12);
  });

  it("falls back to a plausible text price when there are no offers", () => {
    assert.equal(plausibleProductPrice([], 449), 449);
  });
});

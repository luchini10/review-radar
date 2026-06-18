import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBudgetInput } from "../lib/budgetInputFormatting.ts";

describe("budget input formatting", () => {
  it("turns a bare number into a dollar amount", () => {
    assert.equal(formatBudgetInput("200"), "$200");
  });

  it("adds dollar signs to budget phrases", () => {
    assert.equal(formatBudgetInput("under 500"), "under $500");
    assert.equal(formatBudgetInput("less than 1500"), "less than $1,500");
  });

  it("formats both sides of a budget range", () => {
    assert.equal(formatBudgetInput("500 to 700"), "$500 to $700");
    assert.equal(formatBudgetInput("500-700"), "$500-$700");
  });

  it("keeps existing dollar formatting stable", () => {
    assert.equal(formatBudgetInput("$200"), "$200");
    assert.equal(formatBudgetInput("under $1500"), "under $1,500");
  });

  it("preserves decimal amounts while typing", () => {
    assert.equal(formatBudgetInput("199.99"), "$199.99");
    assert.equal(formatBudgetInput("199."), "$199.");
  });
});

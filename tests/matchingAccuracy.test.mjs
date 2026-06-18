/**
 * matchingAccuracy.test.mjs
 *
 * Tests for the matching and verification pipeline.
 * Covers the specific bugs fixed in this round:
 *   1. Price range — lowest price used for budget comparison (Math.min)
 *   2. parseMaxBudget range handling
 *   3. disqualifiedReason wording (Misses vs Needs verification)
 *   4. Matched budget comparison is recorded for UI evidence display
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateProductAgainstRequirements,
  filterResultByRequirements,
} from "../lib/requirementValidation.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const verifiedAt = "2026-01-01T00:00:00.000Z";

function metadataOffer(price, retailer = "Example Store") {
  return {
    availability: { confidence: "High", sourceType: "json_ld", sourceUrl: "https://example.com", value: "InStock", verifiedAt },
    price: { confidence: "High", sourceType: "json_ld", sourceUrl: "https://example.com", value: price, verifiedAt },
    priceCurrency: { confidence: "High", sourceType: "json_ld", sourceUrl: "https://example.com", value: "USD", verifiedAt },
    retailer,
    url: "https://example.com/product",
  };
}

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example Drill Driver Kit",
    category: "power drill",
    product_page_url: "https://example.com/drill",
    product_image_url: "",
    why_recommended: "Compact drill driver kit with battery and charger.",
    pros: ["20V brushless motor.", "Includes battery and charger."],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$149",
    confidence_score: 80,
    source_consensus: "Strong",
    price_value_verdict: "Good value for the kit.",
    best_for: "DIY users.",
    not_for: [],
    citations: [{ title: "Example", url: "https://example.com", what_it_supports: "Test." }],
    ...overrides,
  };
}

// ─── Budget / price tests ────────────────────────────────────────────────────

describe("budget comparison — price range uses lowest price", () => {
  it("passes budget when lowest price in range is within budget", () => {
    // "$449-$599" lowest = $449 ≤ $500 → should PASS
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$449-$599" }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      `Should not be over budget. missingRequirements: ${JSON.stringify(result.missingRequirements)}`,
    );
  });

  it("fails budget when lowest price in range exceeds budget", () => {
    // "$549-$699" lowest = $549 > $500 → should FAIL
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$549-$699" }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.ok(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      `Should be over budget. missingRequirements: ${JSON.stringify(result.missingRequirements)}`,
    );
  });

  it("passes budget when single price is equal to budget limit", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$500" }),
      {
        budget: "under $500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "under $500" }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      `$500 product should pass a $500 budget limit`,
    );
  });

  it("marks price as unknown (not over budget) when price is missing", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "Price not verified" }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      "Missing price should not appear as 'over budget'",
    );
    assert.ok(
      result.unknownRequirements.some((r) => /budget/i.test(r)),
      `Missing price should be in unknownRequirements: ${JSON.stringify(result.unknownRequirements)}`,
    );
  });

  it("does not treat model or review numbers as prices", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range:
          "No price listed on the product page; model 9000 has 4.8-star owner feedback.",
      }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      `Model/review numbers should not be marked over budget: ${JSON.stringify(result.missingRequirements)}`,
    );
    assert.ok(
      result.unknownRequirements.some((r) => /budget/i.test(r)),
      `No listed price should remain an unknown budget requirement: ${JSON.stringify(result.unknownRequirements)}`,
    );
  });

  it("uses offer price when structured metadata is present", () => {
    // metadata offer at $389; estimated_price_range is vague — offer price wins
    const result = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range: "Around $400",
        metadata: { offers: [metadataOffer(389)] },
      }),
      {
        budget: "$400",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$400" }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      `Offer price $389 should pass $400 budget`,
    );
  });

  it("fails budget when offer price exceeds limit", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range: "$399",
        metadata: { offers: [metadataOffer(599)] },
      }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.ok(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      `Offer price $599 should fail $500 budget`,
    );
  });
});

describe("budget comparison — budget range in user input", () => {
  it("uses upper bound of budget range as the limit", () => {
    // budget "$400-$600" → limit = $600; product at $550 should pass
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$550" }),
      {
        budget: "$400-$600",
        extractedRequirements: extractStructuredRequirements({
          query: "drill",
          budget: "$400-$600",
        }),
      },
    );

    assert.equal(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      false,
      `$550 should be within a $400-$600 budget range`,
    );
  });

  it("fails when price exceeds upper bound of budget range", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$650" }),
      {
        budget: "$400-$600",
        extractedRequirements: extractStructuredRequirements({
          query: "drill",
          budget: "$400-$600",
        }),
      },
    );

    assert.ok(
      result.missingRequirements.some((r) => /budget/i.test(r)),
      `$650 should be over a $400-$600 budget range`,
    );
  });
});

describe("budget comparison — matched comparison recorded for UI", () => {
  it("records a matched comparison with price evidence when budget passes", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "$299" }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    const budgetComparison = result.requirementComparisons.find(
      (c) => /budget/i.test(c.required),
    );

    assert.ok(budgetComparison, "Budget comparison should be recorded");
    assert.equal(budgetComparison?.status, "matched");
    assert.match(budgetComparison?.productHas || "", /\$299/, "Should include the price found");
  });

  it("records unknown status with 'not verified' when price is missing", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ estimated_price_range: "varies" }),
      {
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    const budgetComparison = result.requirementComparisons.find(
      (c) => /budget/i.test(c.required),
    );

    assert.ok(budgetComparison, "Budget comparison should be recorded");
    assert.equal(budgetComparison?.status, "unknown");
    assert.match(budgetComparison?.productHas || "", /not verified/i);
  });
});

describe("disqualifiedReason wording — failed vs unknown", () => {
  it("uses 'Misses required filter' when a hard requirement is clearly failed", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({ cons: ["Not available in beige."] }),
      { selectedFeatures: [{ id: "f1", name: "Color", operator: "equals", value: "beige" }] },
    );

    assert.ok(result.disqualifiedReason, "Should have a disqualifiedReason");
    assert.match(
      result.disqualifiedReason || "",
      /misses required filter/i,
      `Expected 'Misses required filter' for a clear failure, got: ${result.disqualifiedReason}`,
    );
  });

  it("uses 'Needs verification' when a requirement is unknown, not failed", () => {
    // Product with no color evidence at all → unknown, not failed
    const result = validateProductAgainstRequirements(
      buildProduct({
        name: "Drill Driver Kit",
        pros: ["Good torque."],
        cons: [],
        why_recommended: "Solid cordless drill.",
        best_for: "Home use.",
      }),
      { selectedFeatures: [{ id: "f1", name: "Color", operator: "equals", value: "beige" }] },
    );

    assert.ok(result.disqualifiedReason, "Should have a disqualifiedReason");
    assert.match(
      result.disqualifiedReason || "",
      /needs verification/i,
      `Expected 'Needs verification' for unknown, got: ${result.disqualifiedReason}`,
    );
    // Must NOT say "Misses required filter" for an unknown requirement
    assert.doesNotMatch(
      result.disqualifiedReason || "",
      /misses required filter/i,
    );
  });
});

describe("filterResultByRequirements — budget and match status", () => {
  it("puts over-budget product into nearMatches, not exactMatches", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test.",
        assumptions: [],
        recommendations: [
          buildProduct({ estimated_price_range: "$349" }),       // within $400 budget
          buildProduct({                                          // over $400 budget
            name: "Expensive Drill",
            product_page_url: "https://example.com/expensive",
            estimated_price_range: "$549",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test.",
      },
      {
        query: "drill",
        budget: "under $400",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "under $400" }),
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(result.exactMatches[0].name, "Example Drill Driver Kit");
    assert.equal(result.nearMatches[0].name, "Expensive Drill");
  });

  it("price range product at $449-$599 passes a $500 budget as exact match", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test.",
        assumptions: [],
        recommendations: [
          buildProduct({ estimated_price_range: "$449-$599" }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test.",
      },
      {
        query: "drill",
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    assert.equal(
      result.exactMatches.length,
      1,
      `Product at $449 min should be exact match for $500 budget. nearMatches: ${JSON.stringify(result.nearMatches.map((p) => p.name))}`,
    );
    assert.equal(result.nearMatches.length, 0);
  });

  it("product with unknown price goes to nearMatches (unknown, not over-budget)", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test.",
        assumptions: [],
        recommendations: [
          buildProduct({ estimated_price_range: "not available" }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test.",
      },
      {
        query: "drill",
        budget: "$500",
        extractedRequirements: extractStructuredRequirements({ query: "drill", budget: "$500" }),
      },
    );

    // Unknown price → nearMatch (unknown), not exactMatch
    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.nearMatches.length, 1);

    // Near match reason should say "Needs verification", not "Misses required filter"
    const nearMatchReason = result.nearMatches[0].near_match_reason || "";
    assert.match(nearMatchReason, /needs verification/i, 
      `Unknown price should say 'Needs verification', got: ${nearMatchReason}`);
  });
});

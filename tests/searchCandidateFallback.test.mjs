import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { buildSearchCandidateFallbackResult } from "../lib/searchCandidateFallback.ts";

function buildSearchCandidate(overrides = {}) {
  return {
    recommendation_type: "Close Match",
    name: "Example Red Refrigerator",
    category: "Refrigerator",
    product_page_url: "https://appliances.example.com/red-refrigerator",
    product_image_url: "https://appliances.example.com/red-refrigerator.jpg",
    why_recommended:
      "Search result metadata found a red refrigerator product page with current price evidence.",
    pros: ["Available in red.", "Specific refrigerator product page."],
    cons: ["Long-term review evidence may be limited from this source alone."],
    common_complaints: [],
    estimated_price_range: "$899",
    confidence_score: 60,
    source_consensus: "Weak",
    price_value_verdict:
      "Price was found in search metadata; verify current price and availability before buying.",
    best_for: "Buyers looking for a red refrigerator under $1000.",
    not_for: ["Buyers who only want products backed by long-term review consensus."],
    citations: [
      {
        title: "Example Red Refrigerator",
        url: "https://appliances.example.com/red-refrigerator",
        what_it_supports: "Search listing metadata supports price and red color.",
      },
    ],
    ...overrides,
  };
}

describe("search candidate fallback", () => {
  it("uses search-derived candidates instead of returning an empty no-match result", () => {
    const request = {
      budget: "under $1000",
      query: "red refrigerator under $1000",
    };
    const result = buildSearchCandidateFallbackResult(
      {
        search_summary: "OpenAI candidate evidence was weak.",
        assumptions: [],
        exactMatches: [],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "No reliable OpenAI recommendations.",
      },
      Array.from({ length: 5 }, (_, index) =>
        buildSearchCandidate({
          name: `Example Red Refrigerator ${index + 1}`,
          product_page_url: `https://appliances.example.com/red-refrigerator-${index + 1}`,
          estimated_price_range: `$${849 + index * 20}`,
        }),
      ),
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 5);
    assert.equal(result.nearMatches.length, 0);
    assert.equal(result.recommendations.length, 5);
  });

  it("keeps close search-derived candidates separate when they miss a requirement", () => {
    const request = {
      budget: "under $1000",
      query: "red refrigerator under $1000",
    };
    const result = buildSearchCandidateFallbackResult(
      {
        search_summary: "OpenAI candidate evidence was weak.",
        assumptions: [],
        exactMatches: [],
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "No reliable OpenAI recommendations.",
      },
      [
        buildSearchCandidate(),
        buildSearchCandidate({
          name: "Example Black Refrigerator",
          product_page_url: "https://appliances.example.com/black-refrigerator",
          why_recommended:
            "Search result metadata found a black refrigerator product page with current price evidence.",
          pros: ["Available in black.", "Specific refrigerator product page."],
        }),
      ],
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 1);
    assert.deepEqual(result.nearMatches[0].requirementComparisons, [
      // Budget matched: the app now records a "matched" comparison so the UI
      // can show what price evidence was used.
      {
        required: "Budget: $1,000 or less",
        productHas: "Price: $899",
        status: "matched",
      },
      {
        productHas: "Color: black",
        required: "Color: Red",
        status: "failed",
      },
    ]);
  });

  it("returns mainstream exact matches for broad brand-only shoe searches", () => {
    const cases = [
      {
        budget: "$300",
        priorities: "Must be Nike only",
        query: "basketball shoes",
        expected: "Nike G.T. Cut Academy Basketball Shoes",
        expectedBrand: "Nike",
        wrongBrand: "Adidas Dame 9 Basketball Shoes",
      },
      {
        budget: "$200",
        priorities: "Must be Nike only",
        query: "running shoes",
        expected: "Nike Pegasus 41 Running Shoes",
        expectedBrand: "Nike",
        wrongBrand: "Brooks Ghost 16 Running Shoes",
      },
      {
        budget: "$200",
        priorities: "Must be Adidas only",
        query: "basketball shoes",
        expected: "Adidas Dame 9 Basketball Shoes",
        expectedBrand: "Adidas",
        wrongBrand: "Nike G.T. Cut Academy Basketball Shoes",
      },
      {
        budget: "$150",
        priorities: "Must be New Balance only",
        query: "walking shoes",
        expected: "New Balance 877 Walking Shoes",
        expectedBrand: "New Balance",
        wrongBrand: "Skechers GO WALK Walking Shoes",
      },
    ];

    for (const testCase of cases) {
      const request = {
        budget: testCase.budget,
        priorities: testCase.priorities,
        query: testCase.query,
      };
      const result = buildSearchCandidateFallbackResult(
        {
          search_summary: "OpenAI candidate evidence was weak.",
          assumptions: [],
          exactMatches: [],
          nearMatches: [],
          recommendations: [],
          what_to_avoid: [],
          final_buying_advice: "No reliable OpenAI recommendations.",
        },
        [
          buildSearchCandidate({
            category: testCase.query,
            estimated_price_range: "$120",
            name: testCase.expected,
            product_page_url: `https://shop.example.com/${testCase.expected
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`,
            pros: [
              `${testCase.expectedBrand} ${testCase.query} product page.`,
              "Widely sold model with many shopper reviews.",
            ],
            why_recommended: `${testCase.expected} is a ${testCase.expectedBrand} ${testCase.query} under budget.`,
            metadata: {
              brand: {
                confidence: "High",
                sourceType: "serper",
                sourceUrl: "https://shop.example.com/product",
                value: testCase.expectedBrand,
                verifiedAt: "2026-01-01T00:00:00.000Z",
              },
            },
          }),
          buildSearchCandidate({
            category: testCase.query,
            estimated_price_range: "$110",
            name: testCase.wrongBrand,
            product_page_url: `https://shop.example.com/${testCase.wrongBrand
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`,
            pros: [`${testCase.wrongBrand} ${testCase.query} product page.`],
            why_recommended: `${testCase.wrongBrand} is under budget but is not the required brand.`,
          }),
        ],
        {
          ...request,
          extractedRequirements: extractStructuredRequirements(request),
        },
      );

      assert.equal(
        result.exactMatches.some((product) => product.name === testCase.expected),
        true,
        `${testCase.query} should keep the requested mainstream brand`,
      );
      assert.equal(
        result.exactMatches.some(
          (product) => product.name === testCase.wrongBrand,
        ),
        false,
        `${testCase.query} should not exact-match the wrong brand`,
      );
    }
  });
});

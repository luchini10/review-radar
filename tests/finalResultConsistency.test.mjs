import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdviceFromDisplayedResults,
  ensureFinalAdviceUsesDisplayedProducts,
  filterResultByRequirements,
  getUnexpectedProductMentions,
} from "../lib/requirementValidation.ts";

function buildProduct(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "Couch",
    product_page_url: "https://example.com/product",
    product_image_url: "https://example.com/product.jpg",
    why_recommended: `${name} is a beige couch that measures 60 inches wide.`,
    pros: ["Available in beige.", "Measures 60 inches wide."],
    cons: ["Limited delivery windows."],
    common_complaints: ["Some delivery delays."],
    estimated_price_range: "$699-$899",
    confidence_score: 86,
    source_consensus: "Mixed",
    price_value_verdict: "Fits the stated budget and requirements.",
    best_for: "People who need a compact beige couch.",
    not_for: ["People who need a large sectional."],
    citations: [
      {
        title: "Example source",
        url: "https://example.com/review",
        what_it_supports: "Supports this fake test product.",
      },
    ],
    ...overrides,
  };
}

describe("final result consistency", () => {
  it("detects product names in advice that are not displayed", () => {
    const unexpected = getUnexpectedProductMentions(
      "Choose American Leather first, but Koala is a cheaper backup.",
      ["American Leather Comfort Sleeper"],
      ["American Leather Comfort Sleeper", "Koala Sofa Bed"],
    );

    assert.deepEqual(unexpected, ["Koala Sofa Bed"]);
  });

  it("rewrites final advice using only displayed product names", () => {
    const result = ensureFinalAdviceUsesDisplayedProducts(
      {
        search_summary: "Showing 2 exact matches.",
        assumptions: [],
        recommendations: [
          buildProduct("American Leather Comfort Sleeper"),
          buildProduct("Mercer41 Convertible Chaise Lounge Sleeper Sofa"),
        ],
        what_to_avoid: [],
        final_buying_advice:
          "Choose American Leather over Koala, and skip TinyHomie unless you need a cheaper couch.",
      },
      [
        "American Leather Comfort Sleeper",
        "Mercer41 Convertible Chaise Lounge Sleeper Sofa",
        "Koala Sofa Bed",
        "TinyHomie Small Sleeper Sofa",
      ],
    );

    assert.match(result.final_buying_advice, /Only 2 exact matches/);
    assert.match(result.final_buying_advice, /American Leather Comfort Sleeper/);
    assert.match(
      result.final_buying_advice,
      /Mercer41 Convertible Chaise Lounge Sleeper Sofa/,
    );
    assert.doesNotMatch(result.final_buying_advice, /Koala|TinyHomie/);
  });

  it("removes rejected product names from what to avoid", () => {
    const result = ensureFinalAdviceUsesDisplayedProducts(
      {
        search_summary: "Showing 1 exact match.",
        assumptions: [],
        recommendations: [buildProduct("American Leather Comfort Sleeper")],
        what_to_avoid: [
          "Avoid Koala Sofa Bed because it was not beige.",
          "Avoid products with unverified dimensions.",
        ],
        final_buying_advice: "American Leather is the only exact match.",
      },
      ["American Leather Comfort Sleeper", "Koala Sofa Bed"],
    );

    assert.deepEqual(result.what_to_avoid, [
      "Avoid products with unverified dimensions.",
    ]);
  });

  it("keeps filtered advice aligned with displayed cards only", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Raw model result.",
        assumptions: [],
        recommendations: [
          buildProduct("American Leather Comfort Sleeper", {
            recommendation_type: "Best Match",
          }),
          buildProduct("Mercer41 Convertible Chaise Lounge Sleeper Sofa", {
            recommendation_type: "Best Match",
          }),
          buildProduct("Koala Sofa Bed", {
            cons: ["Not available in beige."],
            pros: ["Measures 60 inches wide."],
            why_recommended: "Koala Sofa Bed measures 60 inches wide.",
          }),
          buildProduct("TinyHomie Small Sleeper Sofa", {
            cons: ["Only available in gray, not beige."],
            pros: ["Measures 58 inches wide."],
            why_recommended:
              "TinyHomie Small Sleeper Sofa measures 58 inches wide.",
          }),
        ],
        what_to_avoid: ["Koala Sofa Bed was a near match but not beige."],
        final_buying_advice:
          "Compare American Leather and Mercer41, but Koala and TinyHomie are cheaper alternatives.",
      },
      {
        query: "couch",
        budget: "under $1000",
        priorities: "has to be under 64 inches",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.recommendations.length, 2);
    assert.match(result.final_buying_advice, /Only 2 exact matches/);
    assert.doesNotMatch(result.final_buying_advice, /Koala|TinyHomie/);
    assert.deepEqual(result.what_to_avoid, []);
  });

  it("builds no-product advice without product names", () => {
    const advice = buildAdviceFromDisplayedResults([]);

    assert.match(advice, /No exact matches found/);
  });
});

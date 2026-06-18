import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateProductAgainstRequirements } from "../lib/requirementValidation.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

function requirementsFor(query, budget = "under $2000") {
  return {
    category: query,
    budget,
    extractedRequirements: extractStructuredRequirements({ query, budget }),
  };
}

function f(value) {
  return { confidence: "High", sourceType: "serper", sourceUrl: "https://example.com/p", value, verifiedAt: "2026-06-14T00:00:00.000Z" };
}

function buildProduct(name, category = "king size mattress") {
  return {
    recommendation_type: "Best Match", name, category,
    product_page_url: "https://example.com/p", product_image_url: "",
    why_recommended: "", pros: [], cons: [], common_complaints: [],
    estimated_price_range: "$500", confidence_score: 70, source_consensus: "Mixed",
    price_value_verdict: "", best_for: "", not_for: [], citations: [],
    metadata: {
      offers: [{ availability: f("InStock"), price: f(500), priceCurrency: f("USD"), retailer: "x", url: "x" }],
      title: f(name),
    },
  };
}

const kingSearch = requirementsFor("king size mattress");

describe("bed-size enforcement", () => {
  it("rejects a Twin mattress for a king-size search (despite the echoed category)", () => {
    const v = validateProductAgainstRequirements(
      buildProduct("Leesa Studio Twin Mattress - Article furniture"),
      kingSearch,
    );

    assert.equal(v.isMatch, false);
    assert.ok(v.missingRequirements.some((l) => /Size: King/.test(l)));
  });

  it("accepts a King mattress for a king-size search", () => {
    const v = validateProductAgainstRequirements(
      buildProduct("Leesa Studio King Mattress - Article furniture"),
      kingSearch,
    );

    assert.ok(v.matchedRequirements.some((l) => /Size: King/.test(l)));
    assert.equal(v.isMatch, true);
  });

  it("marks a size-less mattress (e.g. Trundle) as unverified, not exact", () => {
    const v = validateProductAgainstRequirements(
      buildProduct("Leesa Trundle Mattress - Article furniture"),
      kingSearch,
    );

    assert.equal(v.isMatch, false);
    assert.ok(v.unknownRequirements.some((l) => /Size: King/.test(l)));
  });

  it("adds no size requirement for a non-bed category", () => {
    const v = validateProductAgainstRequirements(
      buildProduct("Generic 4K Monitor", "4k monitor"),
      requirementsFor("4k monitor"),
    );

    assert.ok(!v.matchedRequirements.some((l) => /^Size:/.test(l)));
    assert.ok(!v.missingRequirements.some((l) => /^Size:/.test(l)));
  });
});

// Same root cause as the size bug — proves the shared-layer fix is general, not
// bed-specific: the self-assigned category must not satisfy ANY attribute.
describe("self-assigned category does not satisfy attributes (color)", () => {
  it("rejects a White chair for a 'black office chair' search despite its echoed category", () => {
    const v = validateProductAgainstRequirements(
      buildProduct("White Ergonomic Office Chair", "black office chair"),
      requirementsFor("black office chair"),
    );

    assert.equal(v.isMatch, false);
    assert.equal(v.matchedRequirements.some((l) => /Color:\s*Black/i.test(l)), false);
    assert.ok(v.missingRequirements.some((l) => /Color:\s*Black/i.test(l)));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyNarrationToResult,
  buildSynthesisPrompt,
  parseNarration,
} from "../lib/finalSynthesis.ts";

function buildProduct(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    rank: 1,
    rankLabel: "#1 Best Match",
    name,
    category: "blower",
    product_page_url: "https://example.com/p",
    product_image_url: "",
    why_recommended: "Original why.",
    pros: ["Original pro."],
    cons: ["Original con."],
    common_complaints: [],
    estimated_price_range: "$250",
    confidence_score: 80,
    source_consensus: "Strong",
    price_value_verdict: "Original verdict.",
    best_for: "Original best.",
    not_for: ["Original not."],
    citations: [{ title: "T", url: "https://example.com/c", what_it_supports: "S" }],
    scoreBreakdown: { totalScore: 100, fitScore: 1, qualityScore: 1, riskPenalty: 0 },
    ...overrides,
  };
}

function buildResult(exact = [], near = []) {
  return {
    search_summary: "",
    assumptions: [],
    exactMatches: exact,
    nearMatches: near,
    recommendations: exact,
    what_to_avoid: [],
    final_buying_advice: "",
  };
}

describe("applyNarrationToResult (guard)", () => {
  it("rewrites only the four prose fields for a matching displayed product", () => {
    const result = buildResult([buildProduct("Alpha Blower")]);
    const updated = applyNarrationToResult(result, [
      {
        name: "Alpha Blower",
        why_recommended: "New why.",
        best_for: "New best.",
        price_value_verdict: "New verdict.",
        not_for: ["New not."],
      },
    ]);
    const product = updated.exactMatches[0];

    assert.equal(product.why_recommended, "New why.");
    assert.equal(product.best_for, "New best.");
    assert.equal(product.price_value_verdict, "New verdict.");
    assert.deepEqual(product.not_for, ["New not."]);
  });

  it("only overwrites fields the narration actually provides", () => {
    const result = buildResult([buildProduct("Alpha Blower")]);
    const updated = applyNarrationToResult(result, [
      { name: "Alpha Blower", why_recommended: "Only why." },
    ]);
    const product = updated.exactMatches[0];

    assert.equal(product.why_recommended, "Only why.");
    assert.equal(product.best_for, "Original best.");
    assert.equal(product.price_value_verdict, "Original verdict.");
    assert.deepEqual(product.not_for, ["Original not."]);
  });

  it("drops narration for products that are not displayed and never adds products", () => {
    const result = buildResult([buildProduct("Alpha Blower")]);
    const updated = applyNarrationToResult(result, [
      { name: "Alpha Blower", why_recommended: "New why." },
      { name: "Invented Product", why_recommended: "Should be ignored." },
    ]);
    const names = [...updated.exactMatches, ...updated.nearMatches].map((p) => p.name);

    assert.equal(updated.exactMatches.length, 1);
    assert.equal(names.includes("Invented Product"), false);
  });

  it("never touches set, citations, prices, specs, scores, pros, or cons", () => {
    const original = buildResult([buildProduct("Alpha Blower")]);
    const updated = applyNarrationToResult(original, [
      {
        name: "Alpha Blower",
        why_recommended: "New why.",
        // Hostile extra fields that must be ignored by the guard:
        estimated_price_range: "$1",
        citations: [{ title: "X", url: "https://evil.example/x", what_it_supports: "fake" }],
        pros: ["Injected pro."],
        confidence_score: 5,
        rank: 99,
      },
    ]);
    const product = updated.exactMatches[0];

    assert.equal(product.estimated_price_range, "$250");
    assert.deepEqual(product.citations, original.exactMatches[0].citations);
    assert.deepEqual(product.pros, ["Original pro."]);
    assert.deepEqual(product.cons, ["Original con."]);
    assert.equal(product.confidence_score, 80);
    assert.equal(product.rank, 1);
    assert.deepEqual(product.scoreBreakdown, original.exactMatches[0].scoreBreakdown);
  });
});

describe("parseNarration", () => {
  it("parses a valid narration payload", () => {
    const parsed = parseNarration(
      '{"products":[{"name":"A","why_recommended":"w","best_for":"b","price_value_verdict":"v","not_for":[]}]}',
    );

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, "A");
  });

  it("returns null for invalid JSON or the wrong shape", () => {
    assert.equal(parseNarration("not json"), null);
    assert.equal(parseNarration('{"wrong":1}'), null);
  });
});

describe("buildSynthesisPrompt", () => {
  it("lists displayed products and the required JSON shape", () => {
    const prompt = buildSynthesisPrompt(buildResult([buildProduct("Alpha Blower")]), {
      query: "leaf blower",
      priorities: "600 cfm",
    });

    assert.match(prompt, /Alpha Blower/);
    assert.match(prompt, /"why_recommended"/);
    assert.match(prompt, /leaf blower/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cheapPreFilterRawCandidates } from "../lib/search/serper.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

function cand(name, overrides = {}) {
  return {
    id: name,
    name,
    brand: overrides.brand ?? null,
    category: overrides.category ?? "product",
    productUrl: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
    imageUrl: "https://example.com/i.jpg",
    retailer: "example.com",
    price: overrides.price ?? 300,
    rating: 4.3,
    reviewCount: 150,
    availableColors: overrides.availableColors ?? [],
    dimensions: { width: null, depth: null, height: null, unit: null },
    keySpecs: overrides.keySpecs ?? [],
    evidenceSources: [{ title: name, url: `https://example.com/${name}`, snippet: overrides.snippet ?? "" }],
    requirementCheck: { exactMatch: false, passed: [], failed: [], unknown: [] },
  };
}

function keptNames(candidates, input) {
  return cheapPreFilterRawCandidates(candidates, input, 50).candidates.map((c) => c.name);
}

describe("discovery filter applies structured requirements", () => {
  it("rejects a wrong-size candidate (Twin) for a king-size search", () => {
    const input = {
      query: "king size mattress",
      extractedRequirements: extractStructuredRequirements({ query: "king size mattress" }),
    };
    const names = keptNames(
      [
        cand("Leesa King Mattress", { category: "king size mattress" }),
        cand("Leesa Twin Mattress", { category: "king size mattress" }),
      ],
      input,
    );

    assert.ok(names.includes("Leesa King Mattress"));
    assert.ok(!names.includes("Leesa Twin Mattress"));
  });

  it("rejects a candidate that verifiably fails a HARD spec (400 vs ≥600 CFM)", () => {
    const input = {
      query: "cordless leaf blower",
      priorities: "at least 600 cfm",
      extractedRequirements: extractStructuredRequirements({
        query: "cordless leaf blower",
        priorities: "at least 600 cfm",
      }),
    };
    const names = keptNames(
      [
        cand("EGO 650 CFM Cordless Leaf Blower", { category: "cordless leaf blower", keySpecs: ["650 CFM"] }),
        cand("Budget 400 CFM Cordless Leaf Blower", { category: "cordless leaf blower", keySpecs: ["400 CFM"] }),
      ],
      input,
    );

    assert.ok(names.includes("EGO 650 CFM Cordless Leaf Blower"));
    assert.ok(!names.includes("Budget 400 CFM Cordless Leaf Blower"));
  });

  it("does not reject when the candidate's size/spec is simply unknown (thin text)", () => {
    const input = {
      query: "king size mattress",
      extractedRequirements: extractStructuredRequirements({ query: "king size mattress" }),
    };
    const names = keptNames(
      [cand("Leesa Studio Mattress", { category: "king size mattress" })],
      input,
    );

    assert.ok(names.includes("Leesa Studio Mattress"));
  });

  it("rejects a component-substitution candidate (cooktop) for an oven search", () => {
    const input = {
      query: "gas range",
      extractedRequirements: extractStructuredRequirements({ query: "gas range" }),
    };
    const names = keptNames(
      [
        cand("GE 30 inch Gas Range", { category: "gas range" }),
        cand("GE 36 inch Gas Cooktop", { category: "gas range" }),
      ],
      input,
    );

    assert.ok(names.includes("GE 30 inch Gas Range"));
    assert.ok(!names.includes("GE 36 inch Gas Cooktop"));
  });

  it("rejects bed-frame candidates for a mattress search", () => {
    const input = {
      query: "king size mattress",
      extractedRequirements: extractStructuredRequirements({ query: "king size mattress" }),
    };
    const names = keptNames(
      [
        cand("Nectar Classic 12 King Mattress", { category: "king size mattress" }),
        cand("Basi King Bed Frame - Oak", {
          category: "king size mattress",
          snippet: "Oak king bed frame with slats.",
        }),
        cand("Tessu King Low Profile Upholstered Bed", {
          category: "king size mattress",
          snippet: "Upholstered platform bed frame.",
        }),
        cand("Hudson Bed", {
          category: "king size mattress",
          snippet: "King bed furniture from a home retailer.",
        }),
      ],
      input,
    );

    assert.ok(names.includes("Nectar Classic 12 King Mattress"));
    assert.ok(!names.includes("Basi King Bed Frame - Oak"));
    assert.ok(!names.includes("Tessu King Low Profile Upholstered Bed"));
    assert.ok(!names.includes("Hudson Bed"));
  });

  it("rejects a cross-category conflict candidate at discovery (washing machine for pressure washer)", () => {
    const input = {
      query: "electric pressure washer",
      extractedRequirements: extractStructuredRequirements({ query: "electric pressure washer" }),
    };
    const names = keptNames(
      [
        cand("Sun Joe SPX3000 Electric Pressure Washer 2030 PSI", {
          category: "electric pressure washer",
          keySpecs: ["2030 PSI"],
        }),
        cand("Samsung 4.5 cu ft Front Load Washing Machine", {
          category: "electric pressure washer",
        }),
      ],
      input,
    );

    assert.ok(names.includes("Sun Joe SPX3000 Electric Pressure Washer 2030 PSI"));
    assert.ok(!names.includes("Samsung 4.5 cu ft Front Load Washing Machine"));
  });

  it("deprioritizes (but keeps) an off-form-factor candidate below a full-size one", () => {
    const input = {
      query: "gas grill",
      extractedRequirements: extractStructuredRequirements({ query: "gas grill" }),
    };
    const result = cheapPreFilterRawCandidates(
      [
        cand("Cuisinart Tabletop Gas Grill", { category: "gas grill" }),
        cand("Weber Spirit II Gas Grill", { category: "gas grill" }),
      ],
      input,
      50,
    );
    const ordered = result.candidates.map((c) => c.name);

    // Both kept (soft penalty, never a reject) but the full-size unit ranks first.
    assert.ok(ordered.includes("Cuisinart Tabletop Gas Grill"));
    assert.ok(ordered.indexOf("Weber Spirit II Gas Grill") < ordered.indexOf("Cuisinart Tabletop Gas Grill"));
  });
});

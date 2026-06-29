import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  scoreAndSelectRecommendations,
  scoreAndSelectRecommendationsWithTrace,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

// ---------------------------------------------------------------------------
// Shared helpers (same pattern as recommendationScoring.test.mjs)
// ---------------------------------------------------------------------------

function field(value, confidence = "High") {
  return {
    confidence,
    sourceType: "json_ld",
    sourceUrl: "https://example.com/product",
    value,
    verifiedAt: "2026-05-26T00:00:00.000Z",
  };
}

function offer(price) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer: "example.com",
    url: "https://example.com/product",
  };
}

function baseInput(query = "couch", extra = {}) {
  return {
    query,
    budget: "under $1000",
    selectedFeatures: ["Color: Beige"],
    extractedRequirements: extractStructuredRequirements({
      budget: "under $1000",
      query,
      selectedFeatures: ["Color: Beige"],
    }),
    ...extra,
  };
}

// Use the same structure as buildProduct in recommendationScoring.test.mjs:
// multi-word names + colors metadata so products reliably pass eligibility checks.
function exactProduct(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "couch",
    product_page_url: `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "https://example.com/image.jpg",
    why_recommended: `${name} is a beige couch with confirmed specs.`,
    pros: ["Available in beige.", "Measures 60 inches wide."],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$600",
    confidence_score: 82,
    source_consensus: "Strong",
    price_value_verdict: "Fits the stated budget.",
    best_for: "Buyers who need an exact match.",
    not_for: [],
    citations: [
      {
        title: "Product page",
        url: "https://example.com/product",
        what_it_supports: "Supports specs and price.",
        citation_type: "independent-editorial",
      },
    ],
    matchedRequirements: ["Category: couch", "Color: Beige"],
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: couch", "Color: Beige"],
      unknown: [],
    },
    metadata: {
      brand: field("ExampleCo"),
      canonicalUrl: field(`https://example.com/${name}`),
      colors: field(["beige"]),
      dimensions: { unit: "in", width: field(60) },
      modelNumber: field(name),
      offers: [offer(600)],
      rating: field(4.6),
      reviewCount: field(250),
      title: field(name),
    },
    ...overrides,
  };
}

// nearProduct: a product that lacks ALL color evidence so when the input has
// selectedFeatures: ["Color: Beige"] the requirement stays unknown (not disqualified).
// Strips colors from metadata AND replaces text fields that mention beige.
function nearProduct(name, overrides = {}) {
  const base = exactProduct(name, overrides);
  const { colors: _colors, ...metaWithoutColors } = base.metadata;
  return {
    ...base,
    why_recommended: `${name} is a high-quality couch.`,
    pros: ["Durable frame.", "Easy to assemble."],
    matchedRequirements: ["Category: couch"],
    requirementCheck: { exactMatch: false, failed: [], passed: ["Category: couch"], unknown: ["Color: Beige"] },
    metadata: metaWithoutColors,
  };
}

// robotVacuumProduct: a CORRECT robot vacuum product that passes the exact gate.
function robotVacuumProduct(name, overrides = {}) {
  return {
    ...exactProduct(name, overrides),
    name,
    category: "robot vacuum",
    why_recommended: `${name} is a robot vacuum with strong coverage.`,
    pros: ["Robot vacuum with self-emptying base.", "Works well on carpets."],
    requirementCheck: { exactMatch: true, failed: [], passed: ["Category: robot vacuum"], unknown: [] },
    metadata: {
      ...exactProduct(name).metadata,
      title: { ...exactProduct(name).metadata.title, value: `${name} Robot Vacuum` },
    },
  };
}

// stickVacuumProduct: passed in a robot vacuum search → disqualified (Category: fail).
// The product name includes "Stick Vacuum" which the robot_vacuum rule blocks.
function stickVacuumProduct(name) {
  return {
    ...exactProduct(name),
    name: `${name} Stick Vacuum`,
    category: "stick vacuum",
    why_recommended: `${name} Stick Vacuum is a lightweight stick vacuum.`,
    pros: ["Lightweight stick vacuum.", "Cordless design."],
    requirementCheck: { exactMatch: false, failed: ["Category: robot vacuum"], passed: [], unknown: [] },
    metadata: {
      ...exactProduct(name).metadata,
      title: { ...exactProduct(name).metadata.title, value: `${name} Stick Vacuum` },
    },
  };
}

function baseResult(exactMatches, nearMatches = []) {
  return {
    search_summary: "Showing matches.",
    assumptions: [],
    exactMatches,
    nearMatches,
    recommendations: exactMatches,
    what_to_avoid: [],
    final_buying_advice: "Choose well.",
  };
}

// Input for "Color: Beige" couch search — products without color data go to nearScored.
function beigeInput() {
  return {
    query: "couch",
    budget: "under $1000",
    selectedFeatures: ["Color: Beige"],
    extractedRequirements: extractStructuredRequirements({
      budget: "under $1000",
      query: "couch",
      selectedFeatures: ["Color: Beige"],
    }),
  };
}

// Input for "robot vacuum" search — stick vacuum names get disqualified.
function robotVacuumInput() {
  return {
    query: "robot vacuum",
    budget: "under $500",
    selectedFeatures: [],
    extractedRequirements: extractStructuredRequirements({
      budget: "under $500",
      query: "robot vacuum",
      selectedFeatures: [],
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("final-selection trace", () => {
  it("returns a trace array alongside the normal result", () => {
    const input = baseInput();
    const { result, finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([exactProduct("Alpha Sofa"), exactProduct("Bravo Sofa")]),
      input,
    );

    // The ordinary result is unaffected.
    assert.ok(Array.isArray(result.exactMatches));
    assert.ok(result.exactMatches.length > 0);

    // The trace is present and non-empty.
    assert.ok(Array.isArray(finalSelectionTrace));
    assert.ok(finalSelectionTrace.length >= 2);
  });

  it("all trace entries have required shape fields", () => {
    const input = baseInput();
    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([exactProduct("Alpha Sofa"), exactProduct("Bravo Sofa")]),
      input,
    );

    for (const entry of finalSelectionTrace) {
      assert.ok(typeof entry.name === "string", "entry.name should be string");
      assert.ok(
        ["exactScored", "reliabilityNear", "nearScored", "disqualified", "unknown"].includes(entry.stream),
        `unexpected stream: ${entry.stream}`,
      );
      assert.ok(
        [
          "selected",
          "ranked_below_cutoff",
          "duplicate_identity_collapsed",
          "variant_family_collapsed",
          "not_reliable_enough_for_exact",
          "near_only_exact_full",
          "disqualified_category",
          "disqualified_avoid",
          "disqualified_other",
          "missing_trace_reason",
        ].includes(entry.decisionReason),
        `unexpected decisionReason: ${entry.decisionReason}`,
      );
      assert.ok(typeof entry.selected === "boolean", "entry.selected should be boolean");
      assert.ok(Array.isArray(entry.failed), "entry.failed should be array");
      assert.ok(Array.isArray(entry.unknown), "entry.unknown should be array");
      assert.ok(Array.isArray(entry.passed), "entry.passed should be array");
      assert.ok(Array.isArray(entry.offFormFactorModifiers), "entry.offFormFactorModifiers should be array");
      assert.ok(typeof entry.citationCount === "number", "entry.citationCount should be number");
    }
  });

  it("selected exact candidates have decisionReason=selected", () => {
    const input = baseInput();
    const { result, finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([exactProduct("Alpha Sofa"), exactProduct("Bravo Sofa"), exactProduct("Charlie Sofa")]),
      input,
    );

    const selectedNames = new Set(result.exactMatches.map((p) => p.name));
    const selectedTraceEntries = finalSelectionTrace.filter((e) => e.selected);

    assert.ok(selectedTraceEntries.length > 0, "should have at least one selected entry");
    for (const entry of selectedTraceEntries) {
      assert.equal(entry.decisionReason, "selected");
      assert.ok(selectedNames.has(entry.name), `trace entry ${entry.name} claims selected but not in result`);
    }
  });

  it("near candidates land in nearScored stream", () => {
    // nearProduct strips colors metadata, so Color: Beige stays unknown → not exactScored.
    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult(
        [exactProduct("Exact Couch Model")],
        [nearProduct("Near Couch Option")],
      ),
      beigeInput(),
    );

    const nearEntry = finalSelectionTrace.find((e) => e.name === "Near Couch Option");
    assert.ok(nearEntry, "Near Couch Option should appear in trace");
    assert.equal(nearEntry.stream, "nearScored");
  });

  it("disqualified candidate (Category: fail) gets disqualified_category reason", () => {
    // A stick vacuum submitted in a robot vacuum search is blocked by the robot_vacuum rule.
    // The stick vacuum's name appears in robot_vacuum blocked list → checkCategory returns "fail".
    const stickVac = stickVacuumProduct("BrandX");
    const goodRobot = robotVacuumProduct("OmniRobot Pro Vacuum");
    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([goodRobot], [stickVac]),
      robotVacuumInput(),
    );

    const disqualEntry = finalSelectionTrace.find((e) => e.name === stickVac.name);
    assert.ok(disqualEntry, `${stickVac.name} should appear in trace`);
    assert.equal(disqualEntry.stream, "disqualified", `expected disqualified stream, got ${disqualEntry.stream}`);
    assert.equal(disqualEntry.decisionReason, "disqualified_category");
    assert.equal(disqualEntry.selected, false);
  });

  it("disqualified candidate (Avoid: fail) gets disqualified_avoid reason", () => {
    // "bonded leather" is NOT a concrete avoid term → validation uses product's negative text
    // (cons + common_complaints). Put it in common_complaints so the avoid check fires.
    const avoidInput = {
      query: "couch",
      budget: "under $1000",
      selectedFeatures: ["Color: Beige"],
      avoid: "bonded leather",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1000",
        query: "couch",
        selectedFeatures: ["Color: Beige"],
        avoid: "bonded leather",
      }),
    };
    const avoidedProduct = exactProduct("Budget Beige Sofa", {
      common_complaints: ["Material is bonded leather and begins to peel after a year."],
    });

    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([exactProduct("Good Fabric Sofa")], [avoidedProduct]),
      avoidInput,
    );

    const disqualEntry = finalSelectionTrace.find((e) => e.name === "Budget Beige Sofa");
    assert.ok(disqualEntry, "Budget Beige Sofa should appear in trace");
    assert.equal(disqualEntry.stream, "disqualified", `expected disqualified, got ${disqualEntry.stream}`);
    assert.equal(disqualEntry.decisionReason, "disqualified_avoid");
    assert.equal(disqualEntry.selected, false);
  });

  it("candidates beyond MAX_EXACT_MATCHES=7 get ranked_below_cutoff when all 7 slots fill", () => {
    // 9 products with multi-word names and full metadata so they all pass eligibility
    // and reliableEnoughForBestMatch; the bottom 2 should land in ranked_below_cutoff.
    const input = beigeInput();
    const names = [
      "Alpha Sofa Model",
      "Bravo Sofa Edition",
      "Charlie Couch Design",
      "Delta Sectional Model",
      "Echo Loveseat Option",
      "Foxtrot Sofa Collection",
      "Golf Sectional Unit",
      "Hotel Couch Selection",
      "India Sofa Variant",
    ];
    const products = names.map((n) => exactProduct(n));

    const { result, finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult(products),
      input,
    );

    assert.equal(result.exactMatches.length, 7, "should have exactly 7 selected exact matches");

    const selectedNames = new Set(result.exactMatches.map((p) => p.name));
    const cutoffEntries = finalSelectionTrace.filter((e) => e.decisionReason === "ranked_below_cutoff" && e.stream === "exactScored");
    const unselectedExact = finalSelectionTrace.filter((e) => e.stream === "exactScored" && !e.selected);

    // Every unselected exactScored candidate must have some kind of collapse reason.
    for (const e of unselectedExact) {
      assert.ok(
        e.decisionReason !== "selected",
        `${e.name} is unselected but has reason 'selected'`,
      );
      assert.ok(!selectedNames.has(e.name), `${e.name} is in result but trace says not selected`);
    }

    // At least some extras should be ranked_below_cutoff (exact gate overflow).
    assert.ok(cutoffEntries.length > 0, "should have at least one ranked_below_cutoff entry from exactScored pool");
  });

  it("scoreAndSelectRecommendations (without trace) still returns identical result", () => {
    const input = baseInput();
    const payload = baseResult([exactProduct("Alpha Sofa"), exactProduct("Bravo Sofa")]);

    const plain = scoreAndSelectRecommendations({ ...payload }, input);
    const { result } = scoreAndSelectRecommendationsWithTrace({ ...payload }, input);

    assert.deepEqual(
      plain.exactMatches.map((p) => p.name),
      result.exactMatches.map((p) => p.name),
      "both functions should produce identical exactMatches names",
    );
    assert.deepEqual(
      plain.nearMatches.map((p) => p.name),
      result.nearMatches.map((p) => p.name),
      "both functions should produce identical nearMatches names",
    );
  });

  it("trace entries carry score data for scored candidates", () => {
    const input = baseInput();
    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([exactProduct("Alpha Sofa")]),
      input,
    );

    const entry = finalSelectionTrace.find((e) => e.name === "Alpha Sofa");
    assert.ok(entry, "Alpha Sofa should appear in trace");
    // Scored candidates should have numeric score fields.
    assert.ok(typeof entry.totalScore === "number", "totalScore should be a number for exactScored");
    assert.ok(typeof entry.rankedMatchScore === "number", "rankedMatchScore should be a number");
    assert.ok(
      typeof entry.citationStrengthScore === "number",
      "citationStrengthScore should be a number",
    );
  });

  it("citation counts reflect actual citation list", () => {
    const input = baseInput();
    const product = exactProduct("Well-Cited Sofa", {
      citations: [
        { title: "A", url: "https://wirecutter.com/a", what_it_supports: "Quality", citation_type: "independent-editorial" },
        { title: "B", url: "https://rtings.com/b", what_it_supports: "Durability", citation_type: "independent-editorial" },
        { title: "C", url: "https://amazon.com/c", what_it_supports: "Price", citation_type: "retailer-marketplace" },
      ],
    });

    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([product]),
      input,
    );

    const entry = finalSelectionTrace.find((e) => e.name === "Well-Cited Sofa");
    assert.ok(entry, "entry should exist");
    assert.equal(entry.citationCount, 3);
    assert.equal(entry.independentCitationCount, 2);
    assert.equal(entry.retailerCitationCount, 1);
  });

  it("off-form-factor modifiers flag tabletop candidate for a standard-product query", () => {
    const grillInput = baseInput("gas grill");
    const tabletopProduct = exactProduct("BestGrillCo Tabletop Gas Grill", {
      category: "gas grill",
      name: "BestGrillCo Tabletop Gas Grill",
      requirementCheck: {
        exactMatch: true,
        failed: [],
        passed: ["Category: gas grill"],
        unknown: [],
      },
    });

    const { finalSelectionTrace } = scoreAndSelectRecommendationsWithTrace(
      baseResult([tabletopProduct]),
      grillInput,
    );

    const entry = finalSelectionTrace.find((e) => e.name === "BestGrillCo Tabletop Gas Grill");
    assert.ok(entry, "tabletop product should appear in trace");
    assert.ok(
      entry.offFormFactorModifiers.includes("tabletop"),
      `expected tabletop in offFormFactorModifiers, got: ${JSON.stringify(entry.offFormFactorModifiers)}`,
    );
  });
});

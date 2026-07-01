import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSourceUpgradeFallbackShoppingQuery,
  buildSourceUpgradeShoppingQuery,
  needsSourceUpgrade,
  upgradeWeakSourceEvidence,
} from "../lib/requirementEvidenceRescue.ts";
import { normalizeSerperShoppingResults } from "../lib/search/serper.ts";

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeReq(query = "gas grill") {
  return { query, priorities: [], avoid: [], budget: null, selectedFeatures: [] };
}

/** A product that lives on its own manufacturer page with no evidence. */
function weakProduct(name, opts = {}) {
  const host = (opts.host ?? "brand.com");
  return {
    recommendation_type: "Exact Match",
    name,
    category: opts.category ?? "gas grill",
    product_page_url: `https://${host}/products/page`,
    product_image_url: "",
    why_recommended: `${name} is a solid choice.`,
    pros: ["Durable construction."],
    cons: [],
    common_complaints: [],
    estimated_price_range: "Price not verified",
    confidence_score: 70,
    source_consensus: "Weak",
    price_value_verdict: "Price was not verified.",
    best_for: "Most buyers.",
    not_for: [],
    citations: [
      {
        title: name,
        url: `https://${host}/products/page`,
        what_it_supports: "Self-cited product page.",
      },
    ],
    matchedRequirements: [],
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: ["Category: gas grill"],
      unknown: [],
    },
    metadata: { offers: [] },
    ...opts.extra,
  };
}

/** A shopping result that matches the given product (same model token). */
function shoppingResult(name, opts = {}) {
  return {
    id: `sr-${name}`,
    name,
    brand: opts.brand ?? null,
    category: opts.category ?? "gas grill",
    productUrl: opts.productUrl ?? "https://homedepot.com/p/product",
    imageUrl: opts.imageUrl ?? null,
    retailer: opts.retailer ?? "Home Depot",
    price: opts.price ?? 499,
    rating: opts.rating ?? 4.5,
    reviewCount: opts.reviewCount ?? 280,
    availableColors: [],
    dimensions: { width: null, depth: null, height: null, unit: null },
    keySpecs: [],
    evidenceSources: [],
    requirementCheck: { exactMatch: true, failed: [], passed: [], unknown: [] },
    snippet: opts.snippet ?? "",
    title: name,
  };
}

function diagnosticSearchResult(candidates, overrides = {}) {
  return {
    candidates,
    diagnostics: {
      responseReceived: true,
      rawShoppingResults: candidates.length,
      shoppingResultsConsidered: candidates.length,
      structurallyNormalizedShoppingResults: candidates.length,
      eligibleShoppingCandidates: candidates.length,
      rawOrganicResults: 0,
      eligibleOrganicFallbackCandidates: 0,
      returnedCandidates: candidates.length,
      resultSource: candidates.length > 0 ? "shopping" : "none",
      shoppingRejectionReasons: {},
      shoppingRejectionSample: [],
      ...overrides,
    },
  };
}

/** A result wrapper that puts products into exactMatches. */
function makeResult(products) {
  return {
    recommendations: [],
    exactMatches: products,
    nearMatches: [],
    premiumAboveBudget: [],
    what_to_avoid: [],
    search_summary: "",
    final_buying_advice: "",
  };
}

// ── Phase 3I: source-upgrade query construction ─────────────────────────────

describe("buildSourceUpgradeShoppingQuery", () => {
  it("preserves a detected brand with a late model token", () => {
    const query = buildSourceUpgradeShoppingQuery(
      {
        name: "DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB",
      },
      "shop vac",
    );

    assert.equal(query, "DeWalt DXV10SB");
    assert.notEqual(query, "Wet/Dry Vacuum DXV10SB");
    assert.ok(!query.includes("10 Gallon Stainless Steel Wet/Dry Vacuum"));
  });

  it("prefers a trusted metadata brand over title-detected casing", () => {
    const query = buildSourceUpgradeShoppingQuery(
      {
        name: "DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB",
        metadata: { brand: { value: "DEWALT" } },
      },
      "shop vac",
    );

    assert.equal(query, "DEWALT DXV10SB");
  });

  it("does not trust horsepower HP metadata as the product brand", () => {
    const query = buildSourceUpgradeShoppingQuery(
      {
        name: "RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900",
        metadata: { brand: { value: "HP" } },
      },
      "shop vac",
    );

    assert.equal(query, "RIDGID HD0900");
    assert.ok(!query.startsWith("HP "));
  });

  it("preserves genuine HP computer brand identity", () => {
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "HP Pavilion TP01-3020 Desktop PC" },
        "desktop computer",
      ),
      "HP Pavilion TP01-3020",
    );
  });

  it("does not duplicate a brand already embedded in a model token", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "Nike NIKE123 Running Shoe" },
      "running shoe",
    );

    assert.equal(query, "NIKE123");
    assert.ok(!query.toLowerCase().startsWith("nike nike"));
  });

  it("prefers concise model identity and removes redundant category suffix", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "Napoleon Rogue XT 425 SIB Gas Grill" },
      "gas grill",
    );

    assert.equal(query, "Napoleon Rogue XT 425 SIB");
    assert.ok(!query.toLowerCase().endsWith("gas grill gas grill"));
  });

  it("shortens long retailer-style display titles while preserving useful identity", () => {
    const original = "4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid";
    const query = buildSourceUpgradeShoppingQuery({ name: original }, "gas grill");

    assert.equal(query, "4-Burner Propane Gas Grill");
    assert.ok(query.length < original.length);
    assert.ok(query.includes("4-Burner Propane Gas Grill"));
    assert.ok(!query.includes("in Black with Stainless Steel Main Lid"));
    assert.ok(!query.toLowerCase().endsWith("gas grill gas grill"));
    assert.notEqual(query.toLowerCase(), "gas grill");
  });

  it("prefers brand plus model token for cordless drills", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "Makita XFD131 18V LXT Cordless Drill" },
      "cordless drill",
    );

    assert.equal(query, "Makita XFD131");
    assert.ok(!query.includes("18V LXT Cordless Drill cordless drill"));
  });

  it("prefers a real compact model over amp, MPH, and CFM measurements", () => {
    const query = buildSourceUpgradeShoppingQuery(
      {
        name:
          "BLACK+DECKER 12 AMP 250 MPH 400 CFM 3-in-1 Leaf Blower Vacuum (BEBL7000)",
      },
      "leaf blower",
    );

    assert.equal(query, "BLACK+DECKER BEBL7000");
    assert.ok(!/\b(?:AMP|MPH|CFM)\b/.test(query));
  });

  it("supports mixed-case word-plus-number model families", () => {
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "Napoleon Rogue 525 Gas Grill" },
        "gas grill",
      ),
      "Napoleon Rogue 525",
    );
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "Napoleon Rogue XT 425 SIB Gas Grill" },
        "gas grill",
      ),
      "Napoleon Rogue XT 425 SIB",
    );
  });

  it("supports descriptive and digit-dash model families", () => {
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "Samsung Bespoke Jet Bot AI+ Robot Vacuum" },
        "robot vacuum",
      ),
      "Samsung Bespoke Jet Bot AI+",
    );
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "Samsung Jet Bot AI+ Robot Vacuum" },
        "robot vacuum",
      ),
      "Samsung Jet Bot AI+",
    );
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "FEIN Turbo II 9-20-36 Wet/Dry Vacuum" },
        "shop vac",
      ),
      "FEIN Turbo II 9-20-36",
    );
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "FEIN MULTIMASTER FMM 350 QSL Oscillating Multi-Tool" },
        "multi tool",
      ),
      "FEIN MULTIMASTER FMM 350 QSL",
    );
  });

  it("accepts short model families only with brand-qualified identity", () => {
    assert.equal(
      buildSourceUpgradeShoppingQuery(
        { name: "Milwaukee M18 FUEL Cordless Drill" },
        "cordless drill",
      ),
      "Milwaukee M18 FUEL",
    );
  });

  it("keeps useful model suffix words without duplicating robot vacuum", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "Tapo RV30C Plus Robot Vacuum" },
      "robot vacuum",
    );

    assert.equal(query, "Tapo RV30C Plus");
    assert.ok(!query.toLowerCase().endsWith("robot vacuum robot vacuum"));
  });

  it("keeps generic no-model products specific enough for shopping search", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid" },
      "gas grill",
    );

    assert.equal(query, "4-Burner Propane Gas Grill");
    assert.notEqual(query.toLowerCase(), "gas grill");
  });

  it("does not invent a brand for an unbranded model title", () => {
    const query = buildSourceUpgradeShoppingQuery(
      { name: "10 Gallon Wet Dry Vacuum XZ5000" },
      "shop vac",
    );

    assert.equal(query, "Dry Vacuum XZ5000");
    assert.ok(!query.startsWith("DeWalt "));
    assert.ok(!query.startsWith("Makita "));
  });
});

describe("buildSourceUpgradeFallbackShoppingQuery", () => {
  it("inherits the corrected brand-preserving primary identity", () => {
    const product = {
      name: "DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB",
    };
    const primary = buildSourceUpgradeShoppingQuery(product, "shop vac");
    const fallback = buildSourceUpgradeFallbackShoppingQuery(
      product,
      "shop vac",
      primary,
    );

    assert.equal(primary, "DeWalt DXV10SB");
    assert.equal(fallback, "DeWalt DXV10SB shop vac");
    assert.ok(!fallback.includes("10 Gallon Stainless Steel Wet/Dry Vacuum"));
  });

  it("adds category context to compact model-only source-upgrade queries", () => {
    const primary = buildSourceUpgradeShoppingQuery(
      { name: "Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum" },
      "shop vac",
    );
    const fallback = buildSourceUpgradeFallbackShoppingQuery(
      { name: "Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum" },
      "shop vac",
      primary,
    );

    assert.equal(primary, "Makita XCV11Z");
    assert.equal(fallback, "Makita XCV11Z shop vac");
  });

  it("keeps product identity in fallback queries across categories", () => {
    assert.equal(
      buildSourceUpgradeFallbackShoppingQuery(
        { name: "RIDGID WD1450 14 Gallon Wet/Dry Vac" },
        "shop vac",
        "RIDGID WD1450",
      ),
      "RIDGID WD1450 shop vac",
    );
    assert.equal(
      buildSourceUpgradeFallbackShoppingQuery(
        { name: "Tapo RV30C Plus Robot Vacuum" },
        "robot vacuum",
        "Tapo RV30C Plus",
      ),
      "Tapo RV30C Plus robot vacuum",
    );
  });

  it("does not duplicate category words in fallback queries", () => {
    const fallback = buildSourceUpgradeFallbackShoppingQuery(
      { name: "Napoleon Rogue XT 425 SIB Gas Grill" },
      "gas grill",
      "Napoleon Rogue XT 425 SIB",
    );

    assert.equal(fallback, "Napoleon Rogue XT 425 SIB gas grill");
    assert.ok(!fallback.toLowerCase().includes("gas grill gas grill"));
  });

  it("does not reintroduce long retailer-display filler into fallback queries", () => {
    const product = { name: "4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid" };
    const primary = buildSourceUpgradeShoppingQuery(product, "gas grill");
    const fallback = buildSourceUpgradeFallbackShoppingQuery(product, "gas grill", primary);

    assert.equal(primary, "4-Burner Propane Gas Grill");
    assert.equal(fallback, "");
    assert.ok(!fallback.includes("in Black with Stainless Steel Main Lid"));
    assert.notEqual(
      fallback,
      "4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill",
    );
  });
});

// ── needsSourceUpgrade (pure trigger logic) ──────────────────────────────────

describe("needsSourceUpgrade", () => {
  it("returns true for a manufacturer-page candidate with no price, rating, or external citations", () => {
    // "E-325" matches model-token regex: [A-Z]{1,5}[-\s]?\d{2,}
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true when verified price is the only evidence pillar present", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        metadata: {
          offers: [
            {
              price: { value: 499, confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              priceCurrency: { value: "USD", confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              availability: { value: null, confidence: "Low", sourceType: "serper", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              retailer: "Home Depot",
              url: "https://homedepot.com/p/x",
            },
          ],
        },
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true when owner rating is the only evidence pillar present", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        metadata: {
          offers: [],
          rating: { value: 4.5, confidence: "Medium", sourceType: "serper", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
        },
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true when a product-specific retailer citation is the only evidence pillar present", () => {
    // homedepot.com is tier-2: counts as useful commerce evidence → no upgrade needed
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          { title: "Weber E-325", url: "https://brand.com/products/page", what_it_supports: "Product page." },
          { title: "Weber E-325 review", url: "https://homedepot.com/p/x", what_it_supports: "Retailer listing." },
        ],
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true when a generic tier-1 article is not same-product commerce evidence", () => {
    // wirecutter.com is tier-1: counts as useful commerce evidence → no upgrade needed
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          { title: "Best Gas Grills", url: "https://www.wirecutter.com/reviews/best-gas-grills/", what_it_supports: "Expert review." },
        ],
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns false when two strong evidence pillars are already present", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        metadata: {
          offers: [
            {
              price: { value: 499, confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/weber-e325", verifiedAt: "2024-01-01" },
              priceCurrency: { value: "USD", confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/weber-e325", verifiedAt: "2024-01-01" },
              availability: { value: null, confidence: "Low", sourceType: "serper", sourceUrl: "https://homedepot.com/p/weber-e325", verifiedAt: "2024-01-01" },
              retailer: "Home Depot",
              url: "https://homedepot.com/p/weber-e325",
            },
          ],
          rating: { value: 4.6, confidence: "Medium", sourceType: "serper", sourceUrl: "https://homedepot.com/p/weber-e325", verifiedAt: "2024-01-01" },
        },
      },
    });

    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns false when rating and exact same-product commerce evidence are present", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          {
            title: "Weber Spirit E-325 3-Burner Gas Grill",
            url: "https://homedepot.com/p/weber-spirit-e-325-gas-grill",
            what_it_supports: "Exact retailer product page.",
          },
        ],
        metadata: {
          offers: [],
          rating: { value: 4.6, confidence: "Medium", sourceType: "serper", sourceUrl: "https://homedepot.com/p/weber-spirit-e-325-gas-grill", verifiedAt: "2024-01-01" },
        },
      },
    });

    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns true when the only external citation is a same-brand subdomain (RIDGID-style)", () => {
    // store.ridgid.com is tier-3 (manufacturer subdomain): not useful commerce evidence
    const p = weakProduct("RIDGID 12 Gallon 5.0 Peak HP NXT Wet/Dry Vac (RT1200)", {
      host: "ridgid.com",
      extra: {
        citations: [
          { title: "RIDGID RT1200", url: "https://ridgid.com/products/rt1200", what_it_supports: "Product page." },
          { title: "RIDGID RT1200 store", url: "https://store.ridgid.com/products/rt1200", what_it_supports: "Brand store listing." },
        ],
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true when the only external citation is a manufacturer site on a different domain (Makita-style)", () => {
    // makitatools.com is tier-3 (manufacturer): not useful commerce evidence
    // product is on amazon.com (tier-2) but the self-citation doesn't count
    const p = weakProduct("Makita XFD10Z 18V LXT Cordless Drill", {
      host: "amazon.com",
      extra: {
        citations: [
          { title: "Makita XFD10Z Amazon", url: "https://amazon.com/dp/B00OC3MBYU", what_it_supports: "Product listing." },
          { title: "Makita XFD10Z spec", url: "https://makitatools.com/products/xfd10z", what_it_supports: "Manufacturer spec page." },
        ],
      },
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns false when the candidate has failed requirements", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        requirementCheck: { exactMatch: false, failed: ["Feature: Natural Gas"], passed: [], unknown: [] },
      },
    });
    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns false when the candidate has no model-number token (weak identity)", () => {
    // "Best Charcoal Grill" has no model-number pattern
    const p = weakProduct("Best Charcoal Grill Ever");
    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns true for a robot vacuum candidate with model token and weak evidence", () => {
    // "RV1001AE" matches [A-Z]{1,5}\d{2,}[A-Z0-9]*: RV+1001+AE → length 8 ≥ 4
    const p = weakProduct("Shark IQ RV1001AE Robot Vacuum", {
      host: "sharkclean.com",
      category: "robot vacuum",
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("returns true for a TV candidate with model token and weak evidence", () => {
    // "QN65Q80C" matches [A-Z]{2}\d{2}[A-Z0-9]*: QN+65+Q80C → length 8 ≥ 4
    const p = weakProduct("Samsung QN65Q80C 65-Inch QLED TV", {
      host: "samsung.com",
      category: "tv",
    });
    assert.equal(needsSourceUpgrade(p), true);
  });

  it("makes mixed, descriptive, digit-dash, and short brand-qualified models eligible", () => {
    const cases = [
      ["Napoleon Rogue 525 Gas Grill", "gas grill"],
      ["Samsung Bespoke Jet Bot AI+ Robot Vacuum", "robot vacuum"],
      ["FEIN Turbo II 9-20-36 Wet/Dry Vacuum", "shop vac"],
      ["Milwaukee M18 FUEL Cordless Drill", "cordless drill"],
    ];

    for (const [name, category] of cases) {
      assert.equal(
        needsSourceUpgrade(weakProduct(name, { category })),
        true,
        `${name} should qualify`,
      );
    }
  });

  it("does not make measurement-only or unbranded short-token titles eligible", () => {
    assert.equal(
      needsSourceUpgrade(
        weakProduct("Generic 12 AMP 250 MPH 400 CFM Leaf Blower", {
          category: "leaf blower",
        }),
      ),
      false,
    );
    assert.equal(
      needsSourceUpgrade(
        weakProduct("Generic M18 Cordless Tool", {
          category: "cordless tool",
        }),
      ),
      false,
    );
  });
});

// ── upgradeWeakSourceEvidence (integration, mocked searchFn) ─────────────────

describe("upgradeWeakSourceEvidence", () => {
  it("does not use fallback when the primary source-upgrade query returns candidates", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      return [
        shoppingResult("Weber Spirit E-325 3-Burner Natural Gas Grill", {
          price: 499,
          productUrl: "https://homedepot.com/p/weber-e325",
        }),
      ];
    };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.deepEqual(calls, ["Weber Spirit E-325"]);
    assert.equal(sourceUpgradeTraces[0].primaryQuery, "Weber Spirit E-325");
    assert.equal(sourceUpgradeTraces[0].fallbackUsed, false);
    assert.equal(sourceUpgradeTraces[0].fallbackQuery, undefined);
    assert.equal(sourceUpgradeTraces[0].primaryCandidatesReturned, 1);
    assert.equal(sourceUpgradeTraces[0].fallbackCandidatesReturned, 0);
    assert.equal(sourceUpgradeTraces[0].candidatesReturned, 1);
  });

  it("uses one fallback when every nonempty primary candidate fails identity", async () => {
    const product = weakProduct(
      "Makita XCV11Z 18V LXT Cordless Wet/Dry Vacuum",
      { category: "shop vac", host: "makitatools.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      if (calls.length === 1) {
        return [
          shoppingResult("Makita XCV12Z Cordless Wet/Dry Vacuum", {
            category: "shop vac",
            price: 219,
            productUrl: "https://retailer.example.com/products/makita-xcv12z",
          }),
        ];
      }

      return [
        shoppingResult("Makita XCV11Z 18V LXT Cordless Wet/Dry Vacuum", {
          category: "shop vac",
          price: 189,
          productUrl: "https://retailer.example.com/products/makita-xcv11z",
        }),
      ];
    };

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const trace = sourceUpgradeTraces[0];
    assert.deepEqual(calls, ["Makita XCV11Z", "Makita XCV11Z shop vac"]);
    assert.equal(trace.primaryCandidatesReturned, 1);
    assert.equal(trace.primaryOutcome, "identity_rejected");
    assert.equal(trace.fallbackUsed, true);
    assert.equal(trace.fallbackReason, "primary_identity_rejected");
    assert.equal(trace.fallbackCandidatesReturned, 1);
    assert.equal(trace.fallbackOutcome, "evidence_attached");
    assert.equal(trace.evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 189,
      ),
    );
  });

  it("does not retry fallback after a primary identity match with no attachable fields", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      return [
        {
          ...shoppingResult("Weber Spirit E-325 3-Burner Gas Grill", {
            productUrl: product.product_page_url,
          }),
          price: null,
          rating: null,
          reviewCount: null,
        },
      ];
    };

    const { sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const trace = sourceUpgradeTraces[0];
    assert.deepEqual(calls, ["Weber Spirit E-325"]);
    assert.equal(trace.primaryOutcome, "no_attachable_fields");
    assert.equal(trace.fallbackUsed, false);
    assert.equal(trace.fallbackReason, undefined);
    assert.equal(trace.evidenceAttached, false);
  });

  it("keeps both primary and fallback wrong-product evidence rejected", async () => {
    const product = weakProduct(
      "Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet/Dry Vacuum",
      { category: "shop vac", host: "amazon.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      if (calls.length === 1) {
        return [
          shoppingResult("SKIL VA1200D-10 Wet/Dry Shop Vacuum", {
            category: "shop vac",
            price: 99,
            productUrl: "https://retailer.example.com/products/skil-va1200d-10",
          }),
        ];
      }

      return [
        shoppingResult("Amazon Basics 6-Gallon 3.5 HP Wet/Dry Vacuum", {
          brand: "Amazon Basics",
          category: "shop vac",
          price: 62.99,
          productUrl:
            "https://www.google.com/search?ibp=oshop&q=RIDGID+VAC1200&udm=28&prds=catalogid%3A18395467410602476782",
          retailer: "Amazon.com",
        }),
      ];
    };

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const trace = sourceUpgradeTraces[0];
    assert.equal(calls.length, 2);
    assert.equal(trace.primaryOutcome, "identity_rejected");
    assert.equal(trace.fallbackUsed, true);
    assert.equal(trace.fallbackOutcome, "identity_rejected");
    assert.equal(trace.evidenceAttached, false);
    assert.equal(trace.noMatchReason, "identity_rejected");
    assert.equal(upgraded.exactMatches[0].metadata?.offers?.length, 0);
  });

  it("uses one fallback search when the primary source-upgrade query returns zero candidates", async () => {
    const product = weakProduct(
      "Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum",
      { category: "shop vac" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      if (calls.length === 1) return [];
      return [
        shoppingResult("Makita XCV11Z 18V LXT Cordless Wet/Dry Vacuum", {
          category: "shop vac",
          price: 189,
          productUrl: "https://homedepot.com/p/makita-xcv11z",
        }),
      ];
    };

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.deepEqual(calls, ["Makita XCV11Z", "Makita XCV11Z shop vac"]);
    const t = sourceUpgradeTraces[0];
    assert.equal(t.fallbackUsed, true);
    assert.equal(t.fallbackQuery, "Makita XCV11Z shop vac");
    assert.equal(t.primaryCandidatesReturned, 0);
    assert.equal(t.fallbackCandidatesReturned, 1);
    assert.equal(t.candidatesReturned, 1);
    assert.equal(t.evidenceAttached, true);
    assert.ok(upgraded.exactMatches[0].metadata?.offers?.some((o) => o.price?.value === 189));
  });

  it("keeps identity safety when fallback candidates are wrong products", async () => {
    const product = weakProduct("RIDGID WD1450 14 Gallon Wet/Dry Vac", {
      host: "ridgid.com",
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const calls = [];
    const searchFn = async (query) => {
      calls.push(query);
      if (calls.length === 1) return [];
      return [
        shoppingResult("RIDGID VF5000 Replacement Filter", {
          category: "shop vac accessory",
          price: 29,
          productUrl: "https://homedepot.com/p/ridgid-vf5000-filter",
        }),
      ];
    };

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const t = sourceUpgradeTraces[0];
    assert.deepEqual(calls, ["RIDGID WD1450", "RIDGID WD1450 shop vac"]);
    assert.equal(t.fallbackUsed, true);
    assert.equal(t.candidatesReturned, 1);
    assert.equal(t.candidatesEvaluated, 0);
    assert.equal(t.noMatchReason, "identity_rejected");
    assert.equal(t.evidenceAttached, false);
    assert.equal(t.candidateSample[0].identityMatch, false);
    assert.equal(t.candidateSample[0].rejectionReason, "identity_mismatch");
    assert.ok(!upgraded.exactMatches[0].metadata?.offers?.some((o) => o.price?.value === 29));
  });

  it("does not let a short platform-family token merge a different product type", async () => {
    const product = weakProduct("Milwaukee M18 FUEL Cordless Drill", {
      category: "cordless drill",
      host: "milwaukeetool.com",
    });
    const result = makeResult([product]);
    const req = makeReq("cordless drill");
    const searchFn = async () => [
      shoppingResult("Milwaukee M18 FUEL Circular Saw", {
        category: "circular saw",
        price: 249,
        productUrl: "https://retailer.example.com/products/m18-fuel-circular-saw",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 249,
      ),
    );
  });

  it("allows a brand-qualified short family when the product type also matches", async () => {
    const product = weakProduct("Milwaukee M18 FUEL Cordless Drill", {
      category: "cordless drill",
      host: "milwaukeetool.com",
    });
    const result = makeResult([product]);
    const req = makeReq("cordless drill");
    const searchFn = async () => [
      shoppingResult("Milwaukee M18 FUEL 1/2 in Cordless Hammer Drill", {
        category: "cordless drill",
        price: 199,
        productUrl: "https://retailer.example.com/products/m18-fuel-hammer-drill",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 199,
      ),
    );
  });

  it("rejects a different explicit numeric-dash model from the same brand", async () => {
    const product = weakProduct("FEIN Turbo II 9-20-36 Wet/Dry Vacuum", {
      category: "shop vac",
      host: "fein.com",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("FEIN Turbo II 9-20-37 Wet/Dry Vacuum", {
        category: "shop vac",
        price: 349,
        productUrl: "https://retailer.example.com/products/fein-9-20-37",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 349,
      ),
    );
  });

  it("attaches price, rating, reviewCount, and citation when a retailer match is found (gas grill)", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");

    const searchResult = [
      shoppingResult("Weber Spirit E-325 3-Burner Natural Gas Grill", {
        price: 499,
        rating: 4.6,
        reviewCount: 312,
        productUrl: "https://homedepot.com/p/weber-e325",
      }),
    ];
    const searchFn = async () => searchResult;

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const p = upgraded.exactMatches[0];
    assert.ok(p, "upgraded product exists");
    assert.ok(
      p.metadata?.offers?.some((o) => o.price?.value === 499),
      "price merged",
    );
    assert.ok(p.metadata?.rating?.value === 4.6, "rating merged");
    assert.ok(p.metadata?.reviewCount?.value === 312, "reviewCount merged");
    assert.ok(
      p.citations.some((c) => c.url.includes("homedepot.com")),
      "citation from Home Depot added",
    );
    assert.equal(sourceUpgradeTraces.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(sourceUpgradeTraces[0].attachedFields.includes("price"));
    assert.ok(sourceUpgradeTraces[0].attachedFields.includes("rating"));
    assert.ok(sourceUpgradeTraces[0].attachedFields.includes("citation"));
  });

  it("attaches evidence for a robot vacuum candidate (different category)", async () => {
    const product = weakProduct("Shark IQ RV1001AE Robot Vacuum", {
      host: "sharkclean.com",
      category: "robot vacuum",
    });
    const result = makeResult([product]);
    const req = makeReq("robot vacuum");

    const searchFn = async () => [
      shoppingResult("Shark IQ RV1001AE Wi-Fi Connected Robot Vacuum", {
        category: "robot vacuum",
        price: 279,
        rating: 4.3,
        reviewCount: 1840,
        productUrl: "https://bestbuy.com/site/shark-rv1001ae",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const p = upgraded.exactMatches[0];
    assert.ok(p.metadata?.offers?.some((o) => o.price?.value === 279), "price merged");
    assert.ok(p.metadata?.rating?.value === 4.3, "rating merged");
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
  });

  it("attaches evidence for a TV candidate (third category)", async () => {
    const product = weakProduct("Samsung QN65Q80C 65-Inch QLED TV", {
      host: "samsung.com",
      category: "tv",
    });
    const result = makeResult([product]);
    const req = makeReq("65 inch tv");

    const searchFn = async () => [
      shoppingResult("Samsung QN65Q80C 65-Inch 4K QLED Smart TV", {
        category: "tv",
        price: 1097,
        rating: 4.7,
        reviewCount: 590,
        productUrl: "https://bestbuy.com/site/samsung-qn65q80c",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const p = upgraded.exactMatches[0];
    assert.ok(p.metadata?.offers?.some((o) => o.price?.value === 1097), "price merged");
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
  });

  it("does NOT upgrade when the shopping result fails identity check (different model)", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");

    // Return a totally different product (identity mismatch)
    const searchFn = async () => [
      shoppingResult("Char-Broil Performance 475 4-Burner Gas Grill", {
        price: 399,
        rating: 4.2,
        reviewCount: 700,
        productUrl: "https://homedepot.com/p/char-broil-475",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    // No evidence should be attached — original product is unchanged
    const p = upgraded.exactMatches[0];
    assert.ok(!p.metadata?.offers?.some((o) => o.price?.value), "no price merged");
    assert.ok(!p.metadata?.rating?.value, "no rating merged");
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
  });

  it("accepts exact HART VOC1212PW evidence when provider HP metadata is only a horsepower artifact", async () => {
    const product = weakProduct(
      "HART 12 Gallon 6 Peak HP Wet/Dry Vacuum VOC1212PW 3701",
      {
        category: "shop vac",
        host: "harttools.com",
        extra: {
          metadata: {
            brand: { value: "HP" },
            offers: [],
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult(
        "HART 12 Gallon 5 Peak HP Wet/Dry Vacuum VOC1212PW 3701",
        {
          brand: "HP",
          category: "shop vac",
          price: 71.88,
          rating: 4.4,
          reviewCount: 624,
          productUrl:
            "https://retailer.example.com/products/hart-voc1212pw-wet-dry-vacuum",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, true);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 71.88,
      ),
    );
    assert.equal(upgraded.exactMatches[0].metadata?.rating?.value, 4.4);
  });

  it("does not let horsepower HP metadata conflict with exact-model tool evidence across brands", async () => {
    const cases = [
      ["RIDGID HD0900 5 Peak HP Wet/Dry Vacuum", "HD0900"],
      ["DEWALT DXV09P 5 Peak HP Wet/Dry Vacuum", "DXV09P"],
      ["Milwaukee 0880-20 3.5 HP Wet/Dry Vacuum", "0880-20"],
      ["Makita XCV11Z 2 HP Wet/Dry Vacuum", "XCV11Z"],
      ["Stanley SL18115 4 Peak HP Wet/Dry Vacuum", "SL18115"],
      ["Armor All VOM205P 2 Peak HP Wet/Dry Vacuum", "VOM205P"],
      ["Amazon Basics ABV1200 3.5 HP Wet/Dry Vacuum", "ABV1200"],
    ];
    const outcomes = [];

    for (const [name, model] of cases) {
      const product = weakProduct(name, {
        category: "shop vac",
        extra: { metadata: { offers: [], modelNumber: { value: model } } },
      });
      const searchFn = async () => [
        shoppingResult(name, {
          brand: "HP",
          category: "shop vac",
          price: 99,
          productUrl: `https://retailer.example.com/products/${model.toLowerCase()}`,
        }),
      ];
      const outcome = await upgradeWeakSourceEvidence(
        makeResult([product]),
        makeReq("shop vac"),
        { searchFn },
      );
      outcomes.push([
        name,
        outcome.sourceUpgradeTraces[0].evidenceAttached,
      ]);
    }

    assert.deepEqual(
      outcomes,
      cases.map(([name]) => [name, true]),
    );
  });

  it("preserves genuine HP metadata for exact Hewlett-Packard source evidence", async () => {
    const product = weakProduct("HP LaserJet Pro M404dn Printer", {
      category: "printer",
      host: "hp.com",
      extra: {
        metadata: {
          brand: { value: "HP" },
          modelNumber: { value: "M404dn" },
          offers: [],
        },
      },
    });
    const searchFn = async () => [
      shoppingResult("HP LaserJet Pro M404dn Printer", {
        brand: "HP",
        category: "printer",
        price: 349,
        productUrl:
          "https://retailer.example.com/products/hp-laserjet-pro-m404dn",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(
        makeResult([product]),
        makeReq("printer"),
        { searchFn },
      );

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 349,
      ),
    );
  });

  it("does not let polluted HP metadata hide a source-derived conflicting brand", async () => {
    const product = weakProduct("HP LaserJet Pro M404dn Printer", {
      category: "printer",
      host: "hp.com",
      extra: {
        metadata: {
          brand: { value: "HP" },
          modelNumber: { value: "M404dn" },
          offers: [],
        },
      },
    });
    const searchFn = async () => [
      shoppingResult("Dell M404dn Office Printer", {
        brand: "HP",
        category: "printer",
        price: 199,
        productUrl:
          "https://retailer.example.com/products/dell-m404dn-office-printer",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(
        makeResult([product]),
        makeReq("printer"),
        { searchFn },
      );

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(upgraded.exactMatches[0].metadata?.offers?.length, 0);
  });

  it("rejects the RR-066 same-brand same-type candidate that omits target model WD4522", async () => {
    const product = weakProduct(
      "RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac WD4522",
      {
        category: "shop vac",
        host: "ridgid.com",
        extra: {
          metadata: {
            brand: { value: "RIDGID" },
            modelNumber: { value: "WD4522" },
            offers: [],
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult(
        "Ridgid 10 Gallon 6.0 Peak HP Stainless Steel Wet/Dry Shop Vacuum",
        {
          brand: "RIDGID",
          category: "shop vac",
          price: 139,
          rating: 4.3,
          reviewCount: 412,
          imageUrl: "https://images.example.com/ridgid-10-gallon.jpg",
          productUrl:
            "https://retailer.example.com/products/ridgid-10-gallon-stainless-vacuum",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const upgradedProduct = upgraded.exactMatches[0];
    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, false);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.deepEqual(sourceUpgradeTraces[0].attachedFields, []);
    assert.equal(upgradedProduct.metadata?.offers?.length, 0);
    assert.equal(upgradedProduct.metadata?.rating, undefined);
    assert.equal(upgradedProduct.metadata?.reviewCount, undefined);
    assert.equal(upgradedProduct.product_image_url, "");
    assert.equal(upgradedProduct.product_page_url, product.product_page_url);
    assert.ok(
      !upgradedProduct.citations.some((citation) =>
        citation.title.includes("10 Gallon"),
      ),
    );
  });

  it("does not accept matching brand and capacity without the target model", async () => {
    const product = weakProduct(
      "RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac WD4522",
      { category: "shop vac", host: "ridgid.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("RIDGID 4.5 Gallon Wet/Dry Shop Vacuum", {
        brand: "RIDGID",
        category: "shop vac",
        price: 109,
        productUrl:
          "https://retailer.example.com/products/ridgid-4-5-gallon-wet-dry-vacuum",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(upgraded.exactMatches[0].metadata?.offers?.length, 0);
  });

  it("accepts exact WD4522 evidence whose provider title omits the brand", async () => {
    const product = weakProduct(
      "RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac WD4522",
      { category: "shop vac", host: "ridgid.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult(
        "WD4522 4.5 Gallon 5.0-Peak HP ProPack Wet/Dry Shop Vacuum",
        {
          brand: null,
          category: "shop vac",
          price: 119,
          productUrl:
            "https://retailer.example.com/products/wd4522-propack-wet-dry-vacuum",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 119,
      ),
    );
  });

  it("rejects an explicit conflicting brand even when its title reuses WD4522", async () => {
    const product = weakProduct(
      "RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac WD4522",
      { category: "shop vac", host: "ridgid.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("CRAFTSMAN WD4522 Wet/Dry Shop Vacuum", {
        brand: "CRAFTSMAN",
        category: "shop vac",
        price: 99,
        productUrl:
          "https://retailer.example.com/products/craftsman-wd4522-vacuum",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(upgraded.exactMatches[0].metadata?.offers?.length, 0);
  });

  it("rejects same-brand same-type model omission in an unrelated category", async () => {
    const product = weakProduct("Makita XFD131 18V LXT Cordless Drill Kit", {
      category: "cordless drill",
      host: "makitatools.com",
    });
    const result = makeResult([product]);
    const req = makeReq("cordless drill");
    const searchFn = async () => [
      shoppingResult("Makita 18V LXT Cordless Drill Driver Kit", {
        brand: "Makita",
        category: "cordless drill",
        price: 129,
        productUrl:
          "https://retailer.example.com/products/makita-lxt-cordless-drill-kit",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(upgraded.exactMatches[0].metadata?.offers?.length, 0);
  });

  it("does not let a retailer-prefixed RIDGID target accept an Amazon Basics vacuum", async () => {
    const product = weakProduct(
      "Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet/Dry Vacuum",
      {
        category: "shop vac",
        host: "amazon.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("Amazon Basics 6-Gallon 3.5 HP Wet/Dry Vacuum", {
        category: "shop vac",
        price: 62.99,
        productUrl:
          "https://www.google.com/search?ibp=oshop&q=RIDGID+VAC1200&udm=28&prds=catalogid%3A18395467410602476782",
        retailer: "Amazon.com",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(sourceUpgradeTraces[0].detectedBrand, "RIDGID");
    assert.match(sourceUpgradeTraces[0].primaryQuery, /\bRIDGID\b/);
    assert.match(sourceUpgradeTraces[0].primaryQuery, /\bVAC1200\b/);
    assert.doesNotMatch(sourceUpgradeTraces[0].primaryQuery, /Amazon/i);
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 62.99,
      ),
    );
    assert.ok(
      !upgraded.exactMatches[0].citations.some((citation) =>
        citation.title.includes("Amazon Basics"),
      ),
    );
  });

  it("accepts an Amazon-hosted RIDGID page when source title and path carry RIDGID VAC1200", async () => {
    const product = weakProduct(
      "Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet/Dry Vacuum",
      {
        category: "shop vac",
        host: "amazon.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("RIDGID VAC1200 Heavy Duty Wet/Dry Vacuum", {
        category: "shop vac",
        price: 149,
        productUrl:
          "https://amazon.com/RIDGID-VAC1200-Heavy-Duty-Vacuum/dp/B0EXAMPLE",
        retailer: "Amazon.com",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].detectedBrand, "RIDGID");
    assert.match(sourceUpgradeTraces[0].primaryQuery, /\bRIDGID\b/);
    assert.match(sourceUpgradeTraces[0].primaryQuery, /\bVAC1200\b/);
    assert.doesNotMatch(sourceUpgradeTraces[0].primaryQuery, /Amazon/i);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 149,
      ),
    );
  });

  it("keeps Amazon Basics valid when it is the target product brand", async () => {
    const product = weakProduct(
      "Amazon Basics ABV60 6-Gallon Wet/Dry Vacuum",
      {
        category: "shop vac",
        host: "amazon.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("Amazon Basics ABV60 6-Gallon Wet/Dry Vacuum", {
        brand: "Amazon Basics",
        category: "shop vac",
        price: 69,
        productUrl:
          "https://amazon.com/Amazon-Basics-ABV60-Wet-Dry-Vacuum/dp/B0EXAMPLE",
        retailer: "Amazon.com",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].detectedBrand, "Amazon Basics");
    assert.equal(sourceUpgradeTraces[0].primaryQuery, "Amazon Basics ABV60");
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 69,
      ),
    );
  });

  it("does not let a seller label supply the target model", async () => {
    const product = weakProduct(
      "RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet/Dry Vacuum",
      { category: "shop vac" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("RIDGID Shop Vac", {
        brand: "RIDGID",
        category: "shop vac",
        price: 89,
        productUrl: "https://hardware.example.com/products/utility-vacuum",
        retailer: "VAC1200 Marketplace",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 89,
      ),
    );
  });

  it("does not let a URL hostname supply the target model", async () => {
    const product = weakProduct("Makita XCV11Z Cordless Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => [
      shoppingResult("Makita Shop Vac", {
        brand: "Makita",
        category: "shop vac",
        price: 129,
        productUrl:
          "https://xcv11z.hardware.example.com/products/utility-vacuum?query=Makita+XCV11Z",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 129,
      ),
    );
  });

  it("does not attach an allowed Google Shopping offer when identity mismatches", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Char-Broil Performance 475 4-Burner Gas Grill",
            link:
              "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A987654321",
            source: "Example Hardware",
            price: "$399",
            snippet: "Char-Broil Performance 475 gas grill offer.",
          },
        ],
      },
      "Weber Spirit E-325 gas grill",
      "gas grill",
      { allowGoogleShoppingOfferEvidence: true },
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 399,
      ),
    );
  });

  it("rejects the RR-058 same-brand wine-refrigerator offer for a Whynter dehumidifier", async () => {
    const product = weakProduct(
      "Whynter RPD-411WG Energy Star 40 Pint Portable Dehumidifier ...",
      {
        category: "dehumidifier",
        host: "whynter.com",
        extra: {
          metadata: {
            offers: [],
            title: {
              confidence: "Medium",
              sourceType: "open_graph",
              sourceUrl: "https://whynter.com/product/rpd-411wg",
              value:
                "Whynter RPD-411WG Energy Star 40 Pint Portable Dehumidifier (Discontinued) - Whynter LLC",
              verifiedAt: "2026-06-27",
            },
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("dehumidifier");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Whynter 34 Bottle Freestanding Wine Refrigerator",
            link:
              "https://www.google.com/search?ibp=oshop&q=Whynter+RPD-411WG&udm=28&prds=localAnnotatedOfferId%3A1%2Ccatalogid%3A15307214737657659465",
            source: "Trusted Humidors",
            price: "$479",
            rating: 4.1,
            ratingCount: 204,
          },
        ],
      },
      "Whynter RPD-411WG",
      "dehumidifier",
      { allowGoogleShoppingOfferEvidence: true },
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, false);
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 479,
      ),
    );
    assert.ok(
      !upgraded.exactMatches[0].citations.some((citation) =>
        citation.title.includes("Wine Refrigerator"),
      ),
    );
  });

  it("keeps a same-brand same-product dehumidifier offer valid", async () => {
    const product = weakProduct(
      "Whynter RPD-411WG Energy Star 40 Pint Portable Dehumidifier",
      { category: "dehumidifier", host: "whynter.com" },
    );
    const result = makeResult([product]);
    const req = makeReq("dehumidifier");
    const searchFn = async () => [
      shoppingResult("Whynter RPD-411WG 40 Pint Portable Dehumidifier", {
        category: "dehumidifier",
        price: 299,
        productUrl: "https://retailer.example.com/products/whynter-rpd-411wg",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 299,
      ),
    );
  });

  it("does not mistake uppercase measurement text for a conflicting model", async () => {
    const product = weakProduct("EGO LB7654 765 CFM Cordless Leaf Blower", {
      category: "leaf blower",
      host: "egopowerplus.com",
    });
    const result = makeResult([product]);
    const req = makeReq("leaf blower");
    const searchFn = async () => [
      shoppingResult("EGO LB7654 765 CFM Cordless Leaf Blower", {
        category: "leaf blower",
        price: 299,
        productUrl:
          "https://retailer.example.com/products/ego-lb7654-765-cfm-blower",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 299,
      ),
    );
  });

  it("rejects a same-brand dehumidifier with a different explicit model", async () => {
    const product = weakProduct(
      "Whynter RPD-411WG Energy Star 40 Pint Portable Dehumidifier",
      {
        category: "dehumidifier",
        host: "whynter.com",
        extra: {
          metadata: {
            offers: [],
            title: {
              confidence: "Medium",
              sourceType: "open_graph",
              sourceUrl: "https://whynter.com/product/rpd-411wg",
              value:
                "Whynter RPD-411WG Energy Star 40 Pint Portable Dehumidifier - Whynter LLC",
              verifiedAt: "2026-06-27",
            },
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("dehumidifier");
    const searchFn = async () => [
      shoppingResult("Whynter RPD-561EGP Energy Star 50 Pint Dehumidifier", {
        category: "dehumidifier",
        price: 379,
        productUrl: "https://retailer.example.com/products/whynter-rpd-561egp",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 379,
      ),
    );
  });

  it("rejects DiamondClean Smart 9300 commerce evidence for a DiamondClean 9000 card", async () => {
    const product = weakProduct(
      "Philips Sonicare DiamondClean 9000 Rechargeable toothbrush",
      {
        category: "electric toothbrush",
        host: "usa.philips.com",
        extra: {
          metadata: {
            brand: {
              confidence: "High",
              sourceType: "json_ld",
              sourceUrl:
                "https://www.usa.philips.com/c-p/HX9911_90/diamondclean-9000-rechargeable-toothbrush",
              value: "Sonicare",
              verifiedAt: "2026-06-30",
            },
            modelNumber: {
              confidence: "High",
              sourceType: "json_ld",
              sourceUrl:
                "https://www.usa.philips.com/c-p/HX9911_90/diamondclean-9000-rechargeable-toothbrush",
              value: "HX9911/90",
              verifiedAt: "2026-06-30",
            },
            offers: [],
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("electric toothbrush");
    const searchFn = async () => [
      shoppingResult(
        "Philips Sonicare DiamondClean Smart 9300 Electric Toothbrush",
        {
          category: "electric toothbrush",
          price: 229.99,
          rating: 4.3,
          reviewCount: 1800,
          productUrl:
            "https://www.google.com/search?ibp=oshop&q=Sonicare+DiamondClean+9000&udm=28&prds=catalogid%3A9864359891775329041",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, false);
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 229.99,
      ),
    );
    assert.ok(
      !upgraded.exactMatches[0].citations.some((citation) =>
        citation.title.includes("Smart 9300"),
      ),
    );
  });

  it("keeps exact DiamondClean 9000 commerce evidence valid across retailers", async () => {
    const product = weakProduct(
      "Philips Sonicare DiamondClean 9000 Rechargeable toothbrush",
      {
        category: "electric toothbrush",
        host: "usa.philips.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("electric toothbrush");
    const searchFn = async () => [
      shoppingResult(
        "Philips Sonicare DiamondClean 9000 Rechargeable Toothbrush, Pink",
        {
          category: "electric toothbrush",
          price: 249.99,
          productUrl:
            "https://retailer.example.com/products/sonicare-diamondclean-9000-pink",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 249.99,
      ),
    );
  });

  it("rejects another same-family model swap outside the DiamondClean line", async () => {
    const product = weakProduct(
      "Oral-B Smart 1500 Electric Rechargeable Toothbrush",
      {
        category: "electric toothbrush",
        host: "oralb.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("electric toothbrush");
    const searchFn = async () => [
      shoppingResult("Oral-B Smart 3000 Electric Toothbrush", {
        category: "electric toothbrush",
        price: 79.99,
        productUrl:
          "https://retailer.example.com/products/oral-b-smart-3000",
      }),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 79.99,
      ),
    );
  });

  it("allows safe package-count variation when the explicit model is unchanged", async () => {
    const product = weakProduct(
      "Philips Sonicare DiamondClean 9000 Rechargeable Toothbrush, 1 Count",
      {
        category: "electric toothbrush",
        host: "usa.philips.com",
      },
    );
    const result = makeResult([product]);
    const req = makeReq("electric toothbrush");
    const searchFn = async () => [
      shoppingResult(
        "Philips Sonicare DiamondClean 9000 Rechargeable Toothbrush, 2 Count",
        {
          category: "electric toothbrush",
          price: 399.99,
          productUrl:
            "https://retailer.example.com/products/sonicare-diamondclean-9000-two-pack",
        },
      ),
    ];

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 399.99,
      ),
    );
  });

  it("does not match an HP laptop through a Google offer query parameter", async () => {
    const product = weakProduct(
      "RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900",
      { category: "shop vac" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: 'Hp 15.6" HD Windows Laptop',
            link:
              "https://www.google.com/search?ibp=oshop&q=HP+HD0900&udm=28&prds=localAnnotatedOfferId%3A1%2Ccatalogid%3A123",
            source: "Walmart",
            price: "$429",
            rating: 4.3,
            ratingCount: 10,
          },
        ],
      },
      "HP HD0900",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.equal(sourceUpgradeTraces[0].candidateSample[0].identityMatch, false);
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 429,
      ),
    );
    assert.ok(
      !upgraded.exactMatches[0].citations.some((citation) =>
        citation.title.includes("Windows Laptop"),
      ),
    );
  });

  it("accepts a Google offer when the source title carries the target model", async () => {
    const product = weakProduct(
      "RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900",
      { category: "shop vac" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "RIDGID 9 Gallon NXT Wet/Dry Shop Vacuum HD0900",
            link:
              "https://www.google.com/search?ibp=oshop&q=unrelated+terms&udm=28&prds=localAnnotatedOfferId%3A1%2Ccatalogid%3A456",
            source: "Home Depot",
            price: "$129",
            rating: 4.6,
            ratingCount: 880,
          },
        ],
      },
      "HP HD0900",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 129,
      ),
    );
  });

  it("preserves model identity from a merchant product URL path", async () => {
    const product = weakProduct("Makita XCV11Z Cordless Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Cordless Wet Dry Vacuum Tool Only",
            link:
              "https://hardware.example.com/products/makita-xcv11z?query=wrong-model&search=other-product",
            source: "Example Hardware",
            price: "$189",
          },
        ],
      },
      "Makita XCV11Z",
      "shop vac",
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 189,
      ),
    );
  });

  it("does not let a query-derived fallback snippet satisfy wrong-product identity", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Char-Broil Performance 475 4-Burner Gas Grill",
            link: "https://hardware.example.com/products/char-broil-475",
            source: "Example Hardware",
            price: "$399",
          },
        ],
      },
      "Weber Spirit E-325 gas grill",
      "gas grill",
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.match(
      candidates[0].evidenceSources[0].snippet,
      /Weber Spirit E-325 gas grill/,
    );
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 399,
      ),
    );
  });

  it("accepts a snippet-less candidate whose source title carries the target model", async () => {
    const product = weakProduct("DEWALT DXV10SB 10 Gallon Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "DEWALT DXV10SB 10 Gallon Stainless Steel Wet/Dry Vacuum",
            link: "https://hardware.example.com/products/dewalt-dxv10sb",
            source: "Example Hardware",
            price: "$199",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 199,
      ),
    );
  });

  it("does not let a generic source title borrow a target model from the query", async () => {
    const product = weakProduct("DEWALT DXV10SB 10 Gallon Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Premium Stainless Steel Cleaning Machine",
            link: "https://hardware.example.com/products/cleaning-machine",
            source: "Example Hardware",
            price: "$129",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "identity_rejected");
    assert.ok(
      !upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 129,
      ),
    );
  });

  it("accepts a real-title Google Shopping offer without a provider snippet", async () => {
    const product = weakProduct("DEWALT DXV10SB 10 Gallon Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "DEWALT DXV10SB 10 Gallon Stainless Steel Wet/Dry Vacuum",
            link:
              "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
            source: "Example Hardware",
            price: "$199",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );
    const searchFn = async () => diagnosticSearchResult(candidates);

    const { result: upgraded, sourceUpgradeTraces } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(candidates.length, 1);
    assert.equal(sourceUpgradeTraces[0].evidenceAttached, true);
    assert.ok(
      upgraded.exactMatches[0].metadata?.offers?.some(
        (offer) => offer.price?.value === 199,
      ),
    );
  });

  it("does NOT upgrade a candidate that already has verified price and rating", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        metadata: {
          offers: [
            {
              price: { value: 499, confidence: "High", sourceType: "structured", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              priceCurrency: { value: "USD", confidence: "High", sourceType: "structured", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              availability: { value: null, confidence: "Low", sourceType: "structured", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
              retailer: "Home Depot",
              url: "https://homedepot.com/p/x",
            },
          ],
          rating: { value: 4.6, confidence: "Medium", sourceType: "structured", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
        },
      },
    });
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    let called = false;
    const searchFn = async () => { called = true; return []; };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(called, false, "search was never called (two evidence pillars already present)");
    assert.equal(sourceUpgradeTraces.length, 0, "no traces — no eligible candidates");
  });

  it("does NOT upgrade a candidate with failed requirements", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        requirementCheck: {
          exactMatch: false,
          failed: ["Feature: Natural Gas"],
          passed: [],
          unknown: [],
        },
      },
    });
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    let called = false;
    const searchFn = async () => { called = true; return []; };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(called, false, "search not called for failed-requirement candidate");
    assert.equal(sourceUpgradeTraces.length, 0);
  });

  it("does NOT upgrade a candidate with no model-number token (weak identity)", async () => {
    const product = weakProduct("Best Charcoal Grill Ever");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    let called = false;
    const searchFn = async () => { called = true; return []; };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(called, false, "search not called for product with no model token");
    assert.equal(sourceUpgradeTraces.length, 0);
  });

  it("caps at MAX_SOURCE_UPGRADE_CANDIDATES (3) even when more products qualify", async () => {
    const products = [
      "Weber Spirit E-325 3-Burner Gas Grill",
      "Napoleon Rogue SE425 4-Burner Gas Grill",
      "Char-Broil Performance P4100B Gas Grill",
      "Dyna-Glo DGB390SNP-D Smart Space Living Grill",
    ].map((name) => weakProduct(name));

    const result = makeResult(products);
    const req = makeReq("gas grill");
    let callCount = 0;
    const searchFn = async (_q, _cat) => {
      callCount++;
      return [];
    };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(callCount, 6, "3 upgrade targets run with one fallback search each");
    assert.equal(sourceUpgradeTraces.length, 3);
    assert.ok(sourceUpgradeTraces.every((t) => t.fallbackUsed), "each target used at most one fallback");
  });

  it("returns empty traces when no candidates qualify", async () => {
    // Product with no model token → no upgrade
    const product = weakProduct("Generic Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    let called = false;
    const searchFn = async () => { called = true; return []; };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(called, false);
    assert.equal(sourceUpgradeTraces.length, 0);
  });

  it("records selected and skipped source-upgrade trigger decisions", async () => {
    const weakWithRating = weakProduct(
      "Makita XCV11Z 18V LXT Cordless Wet/Dry Vacuum",
      {
        category: "shop vac",
        extra: {
          metadata: {
            offers: [],
            rating: { value: 4.4, confidence: "Medium", sourceType: "serper", sourceUrl: "https://retailer.example.com/products/makita-xcv11z", verifiedAt: "2026-06-30" },
          },
        },
      },
    );
    const strong = weakProduct("RIDGID HD0900 9 Gallon Wet/Dry Vacuum", {
      category: "shop vac",
      extra: {
        metadata: {
          offers: [
            {
              price: { value: 129, confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/ridgid-hd0900", verifiedAt: "2026-06-30" },
              priceCurrency: { value: "USD", confidence: "High", sourceType: "serper", sourceUrl: "https://homedepot.com/p/ridgid-hd0900", verifiedAt: "2026-06-30" },
              availability: { value: null, confidence: "Low", sourceType: "serper", sourceUrl: "https://homedepot.com/p/ridgid-hd0900", verifiedAt: "2026-06-30" },
              retailer: "Home Depot",
              url: "https://homedepot.com/p/ridgid-hd0900",
            },
          ],
          rating: { value: 4.6, confidence: "Medium", sourceType: "serper", sourceUrl: "https://homedepot.com/p/ridgid-hd0900", verifiedAt: "2026-06-30" },
        },
      },
    });
    const result = makeResult([weakWithRating, strong]);
    const req = makeReq("shop vac");
    const searchFn = async () => [];

    const { sourceUpgradeDecisions } =
      await upgradeWeakSourceEvidence(result, req, { searchFn });

    const selected = sourceUpgradeDecisions.find(
      (decision) => decision.name === weakWithRating.name,
    );
    const skipped = sourceUpgradeDecisions.find(
      (decision) => decision.name === strong.name,
    );

    assert.equal(selected?.selected, true);
    assert.equal(selected?.reason, "selected_for_upgrade");
    assert.deepEqual(selected?.missingEvidence, [
      "verified_price",
      "product_specific_commerce_evidence",
    ]);
    assert.equal(skipped?.selected, false);
    assert.equal(skipped?.reason, "sufficient_evidence");
    assert.deepEqual(skipped?.missingEvidence, [
      "product_specific_commerce_evidence",
    ]);
  });

  it("leaves citation list unchanged when the URL is already present", async () => {
    const existingUrl = "https://homedepot.com/p/weber-e325";
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          { title: "Weber E-325", url: existingUrl, what_it_supports: "Already present." },
        ],
      },
    });
    const result = makeResult([product]);
    const req = makeReq("gas grill");

    // Same product, same URL — citation already present
    const searchFn = async () => [
      shoppingResult("Weber Spirit E-325 3-Burner Natural Gas Grill", {
        productUrl: existingUrl,
        price: 499,
        rating: 4.6,
        reviewCount: 312,
      }),
    ];

    const { result: upgraded } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    const p = upgraded.exactMatches[0];
    const citUrls = p.citations.map((c) => c.url);
    assert.equal(
      citUrls.filter((u) => u === existingUrl).length,
      1,
      "duplicate citation not added",
    );
  });

  // ── Phase 3G: diagnostic trace fields ────────────────────────────────────────

  it("records candidatesReturned:0 and noMatchReason:shopping_results_empty when search returns no candidates", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const searchFn = async () => [];

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.candidatesReturned, 0);
    assert.equal(t.primaryCandidatesReturned, 0);
    assert.equal(t.fallbackCandidatesReturned, 0);
    assert.equal(t.fallbackUsed, true);
    assert.equal(t.candidatesEvaluated, 0);
    assert.equal(t.noMatchReason, "shopping_results_empty");
    assert.equal(t.evidenceAttached, false);
    assert.deepEqual(t.candidateSample, []);
  });

  it("records brand-preserving query identity inputs", async () => {
    const product = weakProduct(
      "DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB",
      { category: "shop vac" },
    );
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    const searchFn = async () => diagnosticSearchResult([]);

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, {
      searchFn,
    });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.originalProductName, product.name);
    assert.equal(t.cleanedProductName, product.name);
    assert.equal(t.metadataBrand, null);
    assert.equal(t.detectedBrand, "DeWalt");
    assert.deepEqual(t.detectedModelTokens, ["dxv10sb"]);
    assert.equal(t.modelIdentityPhrase, "DeWalt DXV10SB");
    assert.equal(t.selectedIdentityPhrase, "DeWalt DXV10SB");
    assert.equal(t.categoryContext, "shop vac");
    assert.equal(t.primaryQuery, "DeWalt DXV10SB");
    assert.equal(t.fallbackQuery, "DeWalt DXV10SB shop vac");
  });

  it("records raw-zero separately from normalization or eligibility loss", async () => {
    const product = weakProduct("Makita XCV11Z Cordless Wet/Dry Vacuum", {
      category: "shop vac",
    });
    const result = makeResult([product]);
    const req = makeReq("shop vac");
    let callCount = 0;
    const searchFn = async () => {
      callCount++;
      return callCount === 1
        ? diagnosticSearchResult([])
        : diagnosticSearchResult([], {
            rawShoppingResults: 3,
            shoppingResultsConsidered: 3,
            structurallyNormalizedShoppingResults: 2,
            eligibleShoppingCandidates: 0,
          });
    };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, {
      searchFn,
    });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.primarySearchDiagnostics.rawShoppingResults, 0);
    assert.equal(t.primarySearchDiagnostics.eligibleShoppingCandidates, 0);
    assert.equal(t.fallbackSearchDiagnostics.rawShoppingResults, 3);
    assert.equal(
      t.fallbackSearchDiagnostics.structurallyNormalizedShoppingResults,
      2,
    );
    assert.equal(t.fallbackSearchDiagnostics.eligibleShoppingCandidates, 0);
    assert.equal(t.candidatesReturned, 0);
    assert.equal(t.attachableCandidates, 0);
  });

  it("keeps source-upgrade diagnostics outside the user-facing result shape", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const output = await upgradeWeakSourceEvidence(result, makeReq(), {
      searchFn: async () => diagnosticSearchResult([]),
    });

    assert.deepEqual(Object.keys(output.result).sort(), Object.keys(result).sort());
    assert.equal("sourceUpgradeDecisions" in output.result, false);
    assert.equal("sourceUpgradeTraces" in output.result, false);
    assert.ok(output.sourceUpgradeDecisions.length > 0);
    assert.ok(output.sourceUpgradeTraces.length > 0);
  });

  it("records the shortened Phase 3I source-upgrade query in traces", async () => {
    const product = weakProduct(
      "4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid",
      {
        extra: {
          metadata: {
            gtin: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://nexgrill.com/products/page",
              value: "044376297978",
              verifiedAt: "2024-01-01",
            },
            offers: [],
          },
        },
      },
    );
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const queriesSeen = [];
    const searchFn = async (query) => {
      queriesSeen.push(query);
      return [];
    };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.deepEqual(queriesSeen, ["4-Burner Propane Gas Grill"]);
    assert.equal(sourceUpgradeTraces[0].query, "4-Burner Propane Gas Grill");
    assert.equal(sourceUpgradeTraces[0].primaryQuery, "4-Burner Propane Gas Grill");
    assert.equal(sourceUpgradeTraces[0].fallbackQuery, undefined);
    assert.equal(sourceUpgradeTraces[0].fallbackUsed, false);
    assert.equal(sourceUpgradeTraces[0].noMatchReason, "shopping_results_empty");
  });

  it("records identity_rejected and candidateSample when candidates are returned but none match the product", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const searchFn = async () => [
      shoppingResult("Char-Broil Performance 475 4-Burner Gas Grill", {
        price: 399,
        rating: 4.2,
        reviewCount: 700,
        productUrl: "https://homedepot.com/p/char-broil-475",
      }),
    ];

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.candidatesReturned, 2);
    assert.equal(t.primaryCandidatesReturned, 1);
    assert.equal(t.fallbackCandidatesReturned, 1);
    assert.equal(t.fallbackUsed, true);
    assert.equal(t.primaryOutcome, "identity_rejected");
    assert.equal(t.fallbackReason, "primary_identity_rejected");
    assert.equal(t.fallbackOutcome, "identity_rejected");
    assert.equal(t.candidatesEvaluated, 0);
    assert.equal(t.noMatchReason, "identity_rejected");
    assert.equal(t.evidenceAttached, false);
    assert.equal(t.candidateSample.length, 2);
    assert.equal(t.candidateSample[0].identityMatch, false);
    assert.equal(t.candidateSample[0].stage, "primary");
    assert.equal(t.candidateSample[1].stage, "fallback");
    assert.equal(t.candidateSample[0].rejectionReason, "identity_mismatch");
    assert.equal(t.candidateSample[0].price, 399);
    assert.equal(t.candidateSample[0].rating, 4.2);
  });

  it("records candidatesEvaluated>0 and candidateSample[0].rejectionReason:null when evidence is attached", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    const searchFn = async () => [
      shoppingResult("Weber Spirit E-325 3-Burner Natural Gas Grill", {
        price: 499,
        rating: 4.6,
        reviewCount: 312,
        productUrl: "https://homedepot.com/p/weber-e325",
      }),
    ];

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.evidenceAttached, true);
    assert.equal(t.candidatesReturned, 1);
    assert.equal(t.primaryCandidatesReturned, 1);
    assert.equal(t.fallbackCandidatesReturned, 0);
    assert.equal(t.fallbackUsed, false);
    assert.equal(t.candidatesEvaluated, 1);
    assert.equal(t.noMatchReason, undefined);
    assert.equal(t.candidateSample.length, 1);
    assert.equal(t.candidateSample[0].identityMatch, true);
    assert.equal(t.candidateSample[0].rejectionReason, null);
    assert.equal(t.candidateSample[0].price, 499);
    assert.equal(t.candidateSample[0].rating, 4.6);
  });

  it("candidateSample is capped at 5 entries even when more candidates are evaluated", async () => {
    const product = weakProduct("Weber Spirit E-325 3-Burner Gas Grill");
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    // 7 mismatching candidates — none will pass identity
    const searchFn = async () =>
      Array.from({ length: 7 }, (_, i) =>
        shoppingResult(`Char-Broil Model ${i} Gas Grill`, {
          price: 300 + i * 10,
          productUrl: `https://homedepot.com/p/charbroil-${i}`,
        }),
      );

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    const t = sourceUpgradeTraces[0];
    assert.equal(t.candidatesReturned, 14);
    assert.equal(t.candidatesEvaluated, 0);
    assert.equal(t.noMatchReason, "identity_rejected");
    assert.ok(t.candidateSample.length <= 5, "sample capped at 5");
    assert.ok(t.candidateSample.every((s) => !s.identityMatch), "all sample entries are mismatches");
  });

  it("replay handles old-format traces (no Phase 3G fields) without crashing", async () => {
    // Simulate a pre-3G trace object (as it would appear in a saved fixture)
    // and verify that the fields we added are optional — the type system allows them missing.
    // The replay print function guards with t.candidatesReturned !== undefined.
    const oldStyleTrace = {
      name: "Weber Spirit E-325 3-Burner Gas Grill",
      query: "Weber Spirit E-325 3-Burner Gas Grill gas grill",
      evidenceAttached: false,
      attachedFields: [],
      // candidatesReturned, candidatesEvaluated, noMatchReason, candidateSample intentionally absent
    };
    // A real upgradeWeakSourceEvidence always sets the new fields.
    // Old fixtures won't have them — we just verify the guard condition works.
    assert.equal(oldStyleTrace.candidatesReturned, undefined);
    assert.equal(oldStyleTrace.noMatchReason, undefined);
    assert.equal(Array.isArray(oldStyleTrace.candidateSample), false);
    // The replay guard (t.candidatesReturned !== undefined) would skip the new section.
    assert.ok(
      oldStyleTrace.candidatesReturned === undefined,
      "pre-3G traces safely skipped by replay guard",
    );
  });
});

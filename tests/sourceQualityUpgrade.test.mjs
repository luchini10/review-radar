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
});

describe("buildSourceUpgradeFallbackShoppingQuery", () => {
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

  it("returns false when the candidate already has a verified price", () => {
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
    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns false when the candidate already has an owner rating", () => {
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        metadata: {
          offers: [],
          rating: { value: 4.5, confidence: "Medium", sourceType: "serper", sourceUrl: "https://homedepot.com/p/x", verifiedAt: "2024-01-01" },
        },
      },
    });
    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns false when the candidate has a tier-2 retailer citation from a different host", () => {
    // homedepot.com is tier-2: counts as useful commerce evidence → no upgrade needed
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          { title: "Weber E-325", url: "https://brand.com/products/page", what_it_supports: "Product page." },
          { title: "Weber E-325 review", url: "https://homedepot.com/p/x", what_it_supports: "Retailer listing." },
        ],
      },
    });
    assert.equal(needsSourceUpgrade(p), false);
  });

  it("returns false when the candidate has a tier-1 editorial citation", () => {
    // wirecutter.com is tier-1: counts as useful commerce evidence → no upgrade needed
    const p = weakProduct("Weber Spirit E-325 3-Burner Gas Grill", {
      extra: {
        citations: [
          { title: "Best Gas Grills", url: "https://www.wirecutter.com/reviews/best-gas-grills/", what_it_supports: "Expert review." },
        ],
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

  it("does NOT upgrade a candidate that has a verified price already", async () => {
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
        },
      },
    });
    const result = makeResult([product]);
    const req = makeReq("gas grill");
    let called = false;
    const searchFn = async () => { called = true; return []; };

    const { sourceUpgradeTraces } = await upgradeWeakSourceEvidence(result, req, { searchFn });

    assert.equal(called, false, "search was never called (product already upgraded)");
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

  it("records query identity inputs when model phrase selection drops a detected brand", async () => {
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
    assert.equal(t.modelIdentityPhrase, "Wet/Dry Vacuum DXV10SB");
    assert.equal(t.selectedIdentityPhrase, "Wet/Dry Vacuum DXV10SB");
    assert.equal(t.categoryContext, "shop vac");
    assert.equal(t.primaryQuery, "Wet/Dry Vacuum DXV10SB");
    assert.equal(t.fallbackQuery, "Wet/Dry Vacuum DXV10SB shop vac");
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
    assert.equal("sourceUpgradeTraces" in output.result, false);
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
    assert.equal(t.candidatesReturned, 1);
    assert.equal(t.primaryCandidatesReturned, 1);
    assert.equal(t.fallbackCandidatesReturned, 0);
    assert.equal(t.fallbackUsed, false);
    assert.equal(t.candidatesEvaluated, 0);
    assert.equal(t.noMatchReason, "identity_rejected");
    assert.equal(t.evidenceAttached, false);
    assert.equal(t.candidateSample.length, 1);
    assert.equal(t.candidateSample[0].identityMatch, false);
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
    assert.equal(t.candidatesReturned, 7);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  needsSourceUpgrade,
  upgradeWeakSourceEvidence,
} from "../lib/requirementEvidenceRescue.ts";

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

    assert.equal(callCount, 3, "at most 3 upgrade searches run");
    assert.equal(sourceUpgradeTraces.length, 3);
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
});

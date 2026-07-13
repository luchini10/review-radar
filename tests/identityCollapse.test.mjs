import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  areSameCanonicalProduct,
  areSameExactModelProduct,
  getCanonicalIdentity,
} from "../lib/productIdentity.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { cheapPreFilterRawCandidates } from "../lib/search/serper.ts";

function product(name, url, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: overrides.category || "shop vac",
    product_page_url: url,
    product_image_url: "",
    why_recommended: "",
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$120",
    confidence_score: 80,
    source_consensus: "Mixed",
    price_value_verdict: "",
    best_for: "",
    not_for: [],
    citations: [],
    ...overrides,
  };
}

function cardEligibleIdentity(brand) {
  return {
    metadata: { brand: { value: brand } },
    productEligibility: {
      status: "buyable_product",
      confidence: "high",
      canRenderAsProductCard: true,
      canUseAsEvidence: true,
      reasons: ["Product detail page."],
    },
  };
}

describe("Phase R5 identity collapse safety", () => {
  // RR-071 live capture (phase-6d-post-rr061-shop-vac.run1.json ~line 2771):
  // the Beast 5.5 HP collapsed into a different 5 HP machine because brand +
  // the shared "12gallon" token looked like one exact model.
  it("RR-071: conflicting numeric specs block exact-model collapse", () => {
    const beast = product(
      "Vacmaster Professional Beast Series 12-Gallon 5.5 Peak HP Wet/Dry Vacuum",
      "https://vacmaster.com/wet-dry-vacuums/vacmaster-pro/12-gallon-5-5-peak-hp-wet-dry-vacuum/",
    );
    const fiveHp = product(
      "Vacmaster 12-Gallon 5 Peak HP Wet/Dry Vacuum",
      "https://vacmaster.com/wet-dry-vacuums/vacmaster/12-gallon-5-peak-hp-wet-dry-vacuum/",
    );

    assert.equal(areSameExactModelProduct(beast, fiveHp), false);
    assert.equal(areSameExactModelProduct(fiveHp, beast), false);
  });

  // RR-060 live capture (robot-vacuum-under-300-self-emptying.r4-after-run3.json):
  // the same Home Depot listing 335012888 rendered twice because the truncated
  // and slugged URL forms produced different canonical ids.
  it("RR-060: the same retailer listing id collapses across URL variants", () => {
    const truncated = product(
      "iRobot Roomba 105 Combo 13. 2 in. Robotic Vacuum and Mop + ...",
      "https://www.homedepot.com/p/335012888",
      { category: "robot vacuum" },
    );
    const slugged = product(
      "iRobot Roomba 105 Combo 13.2 in. Robotic Vacuum and Mop + with Smart Navigation + AutoEmpty Dock",
      "https://www.homedepot.com/p/iRobot-Roomba-105-Combo-13-2-in-Robotic-Vacuum-and-Mop-with-Smart-Navigation-AutoEmpty-Dock-in-Black-Y354020/335012888",
      { category: "robot vacuum" },
    );

    assert.equal(areSameExactModelProduct(truncated, slugged), true);
    assert.equal(areSameCanonicalProduct(truncated, slugged), true);
  });

  it("RR-060: collapses a cross-retailer model carried by one trusted product URL", () => {
    const ace = product(
      "Bissell Garage Pro Wet/Dry Vacuum -18P03",
      "https://acevacuums.com/products/bissell-garage-pro-wet-dry-vac-18p03",
      {
        metadata: {
          brand: { value: "Bissell" },
          modelNumber: { value: "18P03" },
          title: { value: "Bissell Garage Pro Wet/Dry Vacuum -18P03" },
        },
        productEligibility: {
          status: "buyable_product",
          confidence: "high",
          canRenderAsProductCard: true,
          canUseAsEvidence: true,
          reasons: ["Product detail page."],
        },
      },
    );
    const bissell = product(
      "Garage Pro Wet/Dry Vac | BISSELL Vacuums",
      "https://www.bissell.com/s/bissell_ca/product/garage-pro-wet%2Fdry-vac-18P03.html",
      {
        metadata: {
          brand: { value: "Bissell" },
          title: { value: "Powerful Pickup" },
        },
        productEligibility: {
          status: "buyable_product",
          confidence: "high",
          canRenderAsProductCard: true,
          canUseAsEvidence: true,
          reasons: ["Product detail page."],
        },
      },
    );

    assert.equal(areSameExactModelProduct(ace, bissell), true);
    assert.equal(areSameExactModelProduct(bissell, ace), true);
  });

  it("RR-060: URL model evidence cannot collapse a vacuum into its replacement filter", () => {
    const vacuum = product(
      "RIDGID HD1400 14 Gallon Wet Dry Vacuum",
      "https://shop.example/products/ridgid-hd1400-wet-dry-vacuum",
      cardEligibleIdentity("RIDGID"),
    );
    const filter = product(
      "RIDGID Replacement Filter for Wet Dry Vacuums",
      "https://shop.example/products/ridgid-hd1400-filter",
      cardEligibleIdentity("RIDGID"),
    );

    assert.equal(areSameExactModelProduct(vacuum, filter), false);
    assert.equal(areSameExactModelProduct(filter, vacuum), false);
  });

  it("RR-060: URL model evidence cannot collapse a vacuum into its hose", () => {
    const vacuum = product(
      "DEWALT DXV12P Wet Dry Vacuum",
      "https://shop.example/products/dewalt-dxv12p-wet-dry-vacuum",
      cardEligibleIdentity("DEWALT"),
    );
    const hose = product(
      "DEWALT Replacement Hose for Wet Dry Vacuums",
      "https://shop.example/products/dewalt-dxv12p-hose",
      cardEligibleIdentity("DEWALT"),
    );

    assert.equal(areSameExactModelProduct(vacuum, hose), false);
    assert.equal(areSameExactModelProduct(hose, vacuum), false);
  });

  it("RR-060: inferred-model controls preserve true duplicates and distinct models", () => {
    const original = product(
      "RIDGID HD1400 14 Gallon Wet Dry Vacuum",
      "https://first.example/products/ridgid-hd1400-wet-dry-vacuum",
      cardEligibleIdentity("RIDGID"),
    );
    const duplicate = product(
      "RIDGID 14 Gallon Wet Dry Vacuum",
      "https://second.example/products/ridgid-hd1400-vac",
      cardEligibleIdentity("RIDGID"),
    );
    const differentModel = product(
      "RIDGID HD1600 16 Gallon Wet Dry Vacuum",
      "https://third.example/products/ridgid-hd1600-wet-dry-vacuum",
      cardEligibleIdentity("RIDGID"),
    );

    assert.equal(areSameExactModelProduct(original, duplicate), true);
    assert.equal(areSameExactModelProduct(original, differentModel), false);
  });

  it("does not borrow URL models from evidence-only collection pages", () => {
    const specific = product(
      "Acme AC100 5.1 SCFM Air Compressor",
      "https://retailer.example/products/acme-ac100",
      {
        category: "air compressor",
        metadata: { brand: { value: "Acme" }, modelNumber: { value: "AC100" } },
      },
    );
    const collection = product(
      "Acme Air Compressor Collection",
      "https://acme.example/collections/ac100-air-compressors",
      {
        category: "air compressor",
        metadata: { brand: { value: "Acme" } },
        productEligibility: {
          status: "evidence_only",
          confidence: "high",
          canRenderAsProductCard: false,
          canUseAsEvidence: true,
          reasons: ["Collection page."],
        },
      },
    );

    assert.equal(areSameExactModelProduct(specific, collection), false);
  });

  it("generalizes trusted URL-model collapse to an unrelated category", () => {
    const detailed = product(
      "Acme AC100 5.1 SCFM Air Compressor",
      "https://retailer.example/products/acme-ac100",
      {
        category: "air compressor",
        metadata: { brand: { value: "Acme" }, modelNumber: { value: "AC100" } },
        productEligibility: {
          status: "buyable_product",
          confidence: "high",
          canRenderAsProductCard: true,
          canUseAsEvidence: true,
          reasons: ["Product detail page."],
        },
      },
    );
    const sparse = product(
      "Acme Portable Air Compressor",
      "https://acme.example/store/portable-air-compressor-ac100",
      {
        category: "air compressor",
        metadata: { brand: { value: "Acme" } },
        productEligibility: {
          status: "buyable_product",
          confidence: "high",
          canRenderAsProductCard: true,
          canUseAsEvidence: true,
          reasons: ["Product detail page."],
        },
      },
    );

    assert.equal(areSameExactModelProduct(detailed, sparse), true);
  });

  it("preserves collapse of true retailer duplicates with matching specs", () => {
    const amazon = product(
      "DEWALT DXV09P 9 Gallon 5.0 Peak HP Wet/Dry Vacuum",
      "https://www.amazon.com/dp/B07EXAMPLE1",
    );
    const homeDepot = product(
      "DEWALT DXV09P 9 Gallon 5.0 Peak HP Wet/Dry Vac",
      "https://www.homedepot.com/p/DEWALT-9-Gal-Wet-Dry-Vac-DXV09P/301234567",
    );

    assert.equal(areSameExactModelProduct(amazon, homeDepot), true);
  });

  it("preserves collapse when only one side states the spec", () => {
    const detailed = product(
      "RIDGID 12 Gallon 5.0 Peak HP NXT Wet/Dry Vac HD1200",
      "https://www.homedepot.com/p/301111111",
    );
    const sparse = product(
      "RIDGID NXT Wet/Dry Vac HD1200",
      "https://www.ridgid.com/us/en/12-gallon-nxt-vac",
    );

    assert.equal(areSameExactModelProduct(detailed, sparse), true);
  });

  it("keeps explicitly different models separate", () => {
    const hd1200 = product(
      "RIDGID 12 Gallon 5.0 Peak HP NXT Wet/Dry Vac HD1200",
      "https://www.homedepot.com/p/301111111",
    );
    const hd1400 = product(
      "RIDGID 14 Gallon 6.0 Peak HP NXT Wet/Dry Vac HD1400",
      "https://www.homedepot.com/p/302222222",
    );

    assert.equal(areSameExactModelProduct(hd1200, hd1400), false);
  });

  it("does not merge different listing ids on the same host", () => {
    const first = product(
      "Shark Matrix Self-Empty Robot Vacuum",
      "https://www.homedepot.com/p/318765432",
      { category: "robot vacuum" },
    );
    const second = product(
      "eufy Clean X8 Pro Self-Empty Robot Vacuum",
      "https://www.homedepot.com/p/329876543",
      { category: "robot vacuum" },
    );

    assert.equal(areSameExactModelProduct(first, second), false);
    assert.equal(areSameCanonicalProduct(first, second), false);
  });

  it("keeps listing-id identity out of short numeric path segments", () => {
    const identity = getCanonicalIdentity(
      product("Example Widget 3000", "https://example.com/products/3000"),
    );

    assert.ok(!identity.canonicalId.includes("listing"));
  });

  // Cross-category proof that the spec-conflict guard generalizes beyond
  // vacuums: same brand + shared size-shaped token, differing PSI.
  it("blocks collapse on conflicting PSI in an unrelated category", () => {
    const psi175 = product(
      "CRAFTSMAN 20-Gallon 175 PSI Air Compressor",
      "https://www.lowes.com/pd/craftsman-20-gallon-175psi/5001111111",
      { category: "air compressor" },
    );
    const psi150 = product(
      "CRAFTSMAN 20-Gallon 150 PSI Air Compressor",
      "https://www.lowes.com/pd/craftsman-20-gallon-150psi/5002222222",
      { category: "air compressor" },
    );

    assert.equal(areSameExactModelProduct(psi175, psi150), false);
  });

  it("preserves collapse on matching PSI in the same category", () => {
    const detailed = product(
      "CRAFTSMAN 20-Gallon 175 PSI Air Compressor",
      "https://www.lowes.com/pd/craftsman-20-gallon-175psi/5001111111",
      { category: "air compressor" },
    );
    const retailerVariant = product(
      "CRAFTSMAN 20-Gallon Air Compressor, 175 PSI Max, Oil-Free",
      "https://www.amazon.com/dp/B0EXAMPLE99",
      { category: "air compressor" },
    );

    assert.equal(areSameExactModelProduct(detailed, retailerVariant), true);
  });

  it("does not treat date-shaped URL segments as listing ids", () => {
    const first = product(
      "Shark Matrix Robot Vacuum",
      "https://blog.example.com/reviews/20260712",
      { category: "robot vacuum" },
    );
    const second = product(
      "Roborock Q5 Max+ Robot Vacuum",
      "https://blog.example.com/reviews/product/20260712",
      { category: "robot vacuum" },
    );

    assert.equal(areSameExactModelProduct(first, second), false);
    assert.equal(areSameCanonicalProduct(first, second), false);
    assert.ok(!getCanonicalIdentity(first).canonicalId.includes("listing"));
    assert.ok(!getCanonicalIdentity(second).canonicalId.includes("listing"));
  });

  it("preserves date-like numeric ids on explicit product-detail routes", () => {
    const truncated = product(
      "Example Robot Vacuum ...",
      "https://retailer.example/p/20260712",
      { category: "robot vacuum" },
    );
    const slugged = product(
      "Example Robot Vacuum with Auto-Empty Dock",
      "https://retailer.example/p/example-robot-vacuum/20260712",
      { category: "robot vacuum" },
    );

    assert.equal(areSameCanonicalProduct(truncated, slugged), true);
    assert.equal(areSameExactModelProduct(truncated, slugged), true);
    assert.ok(getCanonicalIdentity(truncated).canonicalId.includes("listing"));
  });

  it("blocks collapse on conflicting SCFM values", () => {
    const higherFlow = product(
      "Acme AC100 5.1 SCFM Air Compressor",
      "https://acme.example/products/ac100-high-flow",
      { category: "air compressor" },
    );
    const lowerFlow = product(
      "Acme AC100 4.0 SCFM Air Compressor",
      "https://acme.example/products/ac100-standard",
      { category: "air compressor" },
    );

    assert.equal(areSameExactModelProduct(higherFlow, lowerFlow), false);
  });

  it("preserves collapse on equivalent CFM and SCFM values", () => {
    const scfm = product(
      "Acme AC100 5.1 SCFM Air Compressor",
      "https://acme.example/products/ac100",
      { category: "air compressor" },
    );
    const cfm = product(
      "Acme AC100 Air Compressor 5.1 CFM",
      "https://retailer.example/acme-ac100",
      { category: "air compressor" },
    );

    assert.equal(areSameExactModelProduct(scfm, cfm), true);
  });

  // RR-072 pin: the captured HD0900 rejection no longer reproduces on current
  // code; this test keeps it that way (M2 reassessment of the captured title).
  it("RR-072: a title asserting the requested type survives the prefilter", () => {
    const name = "9 Gallon 4.25 Peak HP NXT Wet Dry Vac HD0900 | RIDGID Tools";
    const input = { query: "shop vac" };
    input.extractedRequirements = extractStructuredRequirements(input);
    const out = cheapPreFilterRawCandidates(
      [
        {
          id: "rr072",
          name,
          brand: null,
          category: "shop vac",
          productUrl: "https://www.ridgid.com/us/en/9-gallon-nxt-wet-dry-vac",
          imageUrl: "https://example.com/i.jpg",
          retailer: "ridgid.com",
          price: 99,
          rating: 4.5,
          reviewCount: 900,
          availableColors: [],
          dimensions: { width: null, depth: null, height: null, unit: null },
          keySpecs: [],
          evidenceSources: [
            {
              title: name,
              url: "https://www.ridgid.com/us/en/9-gallon-nxt-wet-dry-vac",
              snippet:
                "RIDGID 9 Gallon 4.25 Peak HP NXT Wet Dry Vac with fine dust filter and locking accessories",
            },
          ],
          requirementCheck: { exactMatch: false, passed: [], failed: [], unknown: [] },
        },
      ],
      input,
      50,
    );

    assert.deepEqual(out.rejected, []);
    assert.equal(out.candidates.length, 1);
  });

  it("RR-083: rejects truncated wrong-type names when the source path is explicit", () => {
    const name = "Example PowerPro Bagless Cordless Portable Stick ...";
    const productUrl =
      "https://retailer.example/p/example-powerpro-portable-stick-vacuum-x100/333915143";
    const input = { query: "robot vacuum" };
    input.extractedRequirements = extractStructuredRequirements(input);
    const out = cheapPreFilterRawCandidates(
      [
        {
          id: "rr083",
          name,
          brand: "Example",
          category: "robot vacuum",
          productUrl,
          imageUrl: "https://cdn.example.com/example-stick-vacuums-x100.jpg",
          retailer: "retailer.example",
          price: null,
          rating: null,
          reviewCount: null,
          availableColors: [],
          dimensions: { width: null, depth: null, height: null, unit: null },
          keySpecs: [],
          evidenceSources: [
            {
              title: name,
              url: productUrl,
              snippet: "Lightweight cordless cleaning with a HEPA filter.",
              snippetProvenance: "source-derived",
            },
          ],
          requirementCheck: { exactMatch: false, passed: [], failed: [], unknown: [] },
        },
      ],
      input,
      50,
    );

    assert.deepEqual(out.candidates, []);
    assert.deepEqual(out.rejected, [{ name, reason: "wrong_category" }]);
  });
});

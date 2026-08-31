import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productSelectionTestExports } from "../lib/productSelection.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const {
  dedupeSelectionCandidates,
  selectionBrand,
  selectionRequirementResult,
  selectDistinctProducts,
  trustedPrice,
} = productSelectionTestExports;

function candidate(name, overrides = {}) {
  return {
    availableColors: [],
    brand: null,
    category: "product",
    dimensions: {
      depth: null,
      height: null,
      unit: null,
      width: null,
    },
    evidenceSources: [
      {
        snippet: name,
        snippetProvenance: "source-derived",
        title: name,
        url: "https://shop.example/products/item",
      },
    ],
    id: name,
    imageUrl: null,
    keySpecs: [name],
    name,
    price: 199,
    productUrl: "https://shop.example/products/item",
    ...overrides,
  };
}

function field(value) {
  return {
    confidence: "Medium",
    sourceType: "serper",
    sourceUrl: "https://shop.example/products/item",
    value,
    verifiedAt: "2026-08-31T00:00:00.000Z",
  };
}

function asset(name, overrides = {}) {
  const raw = candidate(name, overrides.candidate);
  return {
    candidate: raw,
    category: raw.category,
    imageUrl: "",
    metadata: {
      offers: [],
      title: field(name),
      ...(overrides.metadata || {}),
    },
    name,
    pageUrl: raw.productUrl,
    ...(overrides.priceTrust ? { priceTrust: overrides.priceTrust } : {}),
  };
}

describe("selection correctness", () => {
  it("does not infer Hewlett-Packard from horsepower", () => {
    assert.equal(
      selectionBrand(
        candidate("CRAFTSMAN 12 Gallon 6 Peak HP Wet Dry Shop Vacuum"),
      )?.toLowerCase(),
      "craftsman",
    );
    assert.equal(selectionBrand(candidate("HP OmniBook X 14 Laptop")), "HP");
  });

  it("deduplicates the same product identity across retailer URLs", () => {
    const result = dedupeSelectionCandidates([
      candidate("Shark IQ AV1002AE Robot Vacuum", {
        id: "one",
        productUrl: "https://shop-a.example/products/shark-iq-av1002ae",
      }),
      candidate("Shark IQ AV1002AE Robot Vacuum", {
        id: "two",
        productUrl: "https://shop-b.example/products/shark-iq-av1002ae",
      }),
      candidate("iHome Nova S1 Pro Robot Vacuum", {
        id: "three",
        productUrl: "https://shop.example/products/ihome-nova-s1-pro",
      }),
    ]);

    assert.equal(result.candidates.length, 2);
    assert.equal(result.duplicateCount, 1);
  });

  it("fails closed on explicit hard feature and spec requirements", () => {
    const robotInput = {
      query: "robot vacuum",
      priorities: "must be self-emptying",
    };
    robotInput.extractedRequirements =
      extractStructuredRequirements(robotInput);
    assert.equal(
      selectionRequirementResult(
        asset("iHome Nova S1 Pro Self-Emptying Robot Vacuum"),
        robotInput,
      ).isMatch,
      true,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Eufy Robot Vacuum with Charging Dock"),
        robotInput,
      ).isMatch,
      false,
    );

    const monitorInput = {
      query: "gaming monitor",
      priorities:
        "must be exactly 27-inch, must be 1440p, and at least 144Hz",
    };
    monitorInput.extractedRequirements =
      extractStructuredRequirements(monitorInput);
    assert.equal(
      selectionRequirementResult(
        asset("Acer 27-inch 2560x1440 QHD 180Hz Gaming Monitor"),
        monitorInput,
      ).isMatch,
      true,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Acer 32-inch 4K 144Hz Gaming Monitor"),
        monitorInput,
      ).isMatch,
      false,
    );
  });

  it("requires a trustworthy in-budget price when a budget exists", () => {
    assert.deepEqual(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 179, status: "verified" },
        }),
        200,
      ),
      { accepted: true, price: 179 },
    );
    assert.equal(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 250, status: "verified" },
        }),
        200,
      ).accepted,
      false,
    );
    assert.equal(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 50, status: "suspicious" },
        }),
        200,
      ).accepted,
      false,
    );
  });

  it("returns distinct products with at most two from one brand initially", () => {
    const products = [
      ["Acer XV272U", "Acer"],
      ["Acer VG271U", "Acer"],
      ["Acer XZ270U", "Acer"],
      ["Dell G2724D", "Dell"],
    ].map(([name, brand]) => {
      const value = asset(name, { candidate: { brand } });
      return {
        asset: value,
        recommendation: {
          category: "gaming monitor",
          imageUrl: null,
          name,
          price: null,
          productPageUrl: value.pageUrl,
        },
      };
    });
    const selected = selectDistinctProducts(products);

    assert.equal(selected.length, 4);
    assert.equal(new Set(selected.map((item) => item.name)).size, 4);
  });
});

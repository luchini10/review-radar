import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  commerceVerificationQuery,
  stableCommerceIdentifiers,
  verifyCommerceShoppingResults,
} from "../lib/autonomousCommerceVerifier.ts";

const az4002 = {
  key: "rank-1-AZ4002",
  brand: "Shark",
  productName: "PowerDetect Upright Vacuum with DuoClean Detect Technology",
  model: "AZ4002",
  category: "vacuum cleaner",
};

const shoppingResult = (overrides = {}) => ({
  title: "Shark PowerDetect AZ4002 Upright Vacuum",
  productLink: "https://merchant.example/products/shark-az4002",
  source: "Merchant",
  price: "$599.99",
  imageUrl: "https://merchant.example/images/az4002.jpg",
  rating: 4.7,
  ratingCount: 411,
  position: 1,
  ...overrides,
});

describe("autonomous verification-only commerce boundary", () => {
  it("builds one deterministic, deduplicated exact-identity query", () => {
    assert.equal(
      commerceVerificationQuery(az4002),
      "Shark AZ4002 vacuum cleaner",
    );
  });

  it("recognizes mixed and long numeric stable identifiers but not measurements", () => {
    assert.deepEqual(stableCommerceIdentifiers("12704570 / SUZE0"), [
      "12704570",
      "suze0",
    ]);
    assert.deepEqual(stableCommerceIdentifiers("V16 Piston Animal"), ["v16"]);
    assert.deepEqual(stableCommerceIdentifiers("120V 1500W"), []);
  });

  it("accepts an exact branded model with a merchant destination and price", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [shoppingResult()],
    });
    assert.equal(result.disposition, "verified");
    assert.equal(result.offer?.priceAmount, 599.99);
    assert.equal(result.offer?.productUrl, shoppingResult().productLink);
    assert.deepEqual(result.offer?.matchedIdentifiers, ["az4002"]);
  });

  it("does not accept a neighboring model or borrow its lower price", () => {
    const result = verifyCommerceShoppingResults({
      target: { ...az4002, key: "rank-3-HZ4002", model: "HZ4002" },
      results: [
        shoppingResult({
          title: "Shark PowerDetect cordless vacuum IP3251",
          productLink: "https://merchant.example/products/ip3251",
          price: "$319.99",
        }),
        shoppingResult({
          title: "Shark PowerDetect HZ4002 Corded Stick Vacuum",
          productLink: "https://merchant.example/products/hz4002",
          price: "$329.99",
          position: 2,
        }),
      ],
    });
    assert.equal(result.offer?.priceAmount, 329.99);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
  });

  it("requires the brand and stable model in the result title, not only the URL", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [
        shoppingResult({ title: "PowerDetect upright vacuum" }),
        shoppingResult({
          title: "Shark PowerDetect upright vacuum",
          productLink: "https://merchant.example/products/az4002",
        }),
      ],
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      ["brand_not_in_title", "stable_identifier_not_in_title"],
    );
  });

  it("rejects Google wrappers and listing/search URLs as destinations", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [
        shoppingResult({
          productLink: "https://www.google.com/search?ibp=oshop&q=AZ4002",
        }),
        shoppingResult({
          productLink: "https://merchant.example/search?q=AZ4002",
        }),
      ],
    });
    assert.equal(result.offer, null);
    assert.equal(result.decisions[0].reason, "missing_merchant_product_url");
    assert.equal(result.decisions[1].reason, "product_ineligible");
  });

  it("rejects compatible accessories even when brand and model appear", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [
        shoppingResult({
          title: "Replacement Filter Compatible with Shark AZ4002 Vacuum",
          productLink: "https://merchant.example/products/filter-for-az4002",
          price: "$19.99",
        }),
      ],
    });
    assert.equal(result.offer, null);
    assert.equal(result.decisions[0].reason, "explicit_accessory_offer");
  });

  it("rejects used/refurbished offers and offers without a named seller", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [
        shoppingResult({ title: "Refurbished Shark AZ4002 Upright Vacuum" }),
        shoppingResult({ source: "" }),
      ],
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      ["non_new_offer", "missing_seller"],
    );
  });

  it("preserves a complete product that includes an accessory", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [
        shoppingResult({
          title: "Shark AZ4002 Vacuum with Replacement Filter Included",
          productLink: "https://merchant.example/products/shark-az4002-bundle",
        }),
      ],
    });
    assert.equal(result.disposition, "verified");
  });

  it("accepts a long numeric manufacturer SKU only when present in the title", () => {
    const miele = {
      key: "rank-2-12704570-SUZE0",
      brand: "Miele",
      productName: "Guard L1 Cat & Dog",
      model: "12704570 / SUZE0",
      category: "vacuum cleaner",
    };
    const verified = verifyCommerceShoppingResults({
      target: miele,
      results: [
        shoppingResult({
          title: "Miele Guard L1 Cat & Dog 12704570 Canister Vacuum",
          productLink: "https://merchant.example/products/miele-12704570",
          price: "$899.00",
        }),
      ],
    });
    assert.equal(verified.offer?.priceAmount, 899);

    const inconclusive = verifyCommerceShoppingResults({
      target: miele,
      results: [
        shoppingResult({
          title: "Miele Guard L1 Cat & Dog Canister Vacuum",
          productLink: "https://merchant.example/products/miele-12704570",
        }),
      ],
    });
    assert.equal(inconclusive.offer, null);
  });

  it("never falls back to provisional model-authored transactional values", () => {
    const result = verifyCommerceShoppingResults({
      target: az4002,
      results: [],
    });
    assert.equal(result.disposition, "inconclusive");
    assert.equal(result.offer, null);
    assert.deepEqual(result.decisions, []);
  });
});

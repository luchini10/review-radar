import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  searchApiOffersRequestParams,
  searchApiShoppingRequestParams,
  selectSearchApiProductToken,
  verifySearchApiProductOffers,
} from "../lib/autonomousCommerceVerifier.ts";

const az4002 = {
  key: "rank-1-AZ4002",
  brand: "Shark",
  productName: "PowerDetect Upright Vacuum with DuoClean Detect Technology",
  model: "AZ4002",
  category: "vacuum cleaner",
};

const exactToken = "token_exact_az4002_abcdefghijklmnop";

const shoppingRow = (overrides = {}) => ({
  position: 1,
  title: "Shark PowerDetect AZ4002 Upright Vacuum",
  product_token: exactToken,
  product_link: "https://www.google.com/search?ibp=oshop&q=AZ4002",
  seller: "Best Buy",
  price: "$449.99",
  ...overrides,
});

const offer = (overrides = {}) => ({
  position: 1,
  title: "Shark PowerDetect AZ4002 Upright Vacuum",
  link: "https://merchant.example/products/shark-az4002",
  price: "$449.99",
  extracted_price: 449.99,
  details: ["In stock online", "Free delivery"],
  merchant: { name: "Merchant" },
  ...overrides,
});

const offersPayload = (overrides = {}) => ({
  product: {
    title: "Shark PowerDetect AZ4002 Upright Vacuum",
    brand: "Shark",
    reviews: 999999,
  },
  offers: [offer()],
  top_insights: [{ title: "Ignore me", items: [{ snippet: "Unverified prose" }] }],
  ...overrides,
});

describe("autonomous token-bound product-offers boundary", () => {
  it("freezes the exact Shopping and token-bound Offers request parameters", () => {
    assert.deepEqual(searchApiShoppingRequestParams(az4002), {
      engine: "google_shopping",
      gl: "us",
      hl: "en",
      q: "Shark AZ4002 vacuum cleaner",
    });
    assert.deepEqual(searchApiOffersRequestParams(exactToken), {
      engine: "google_product_offers",
      gl: "us",
      hl: "en",
      page: 1,
      product_token: exactToken,
    });
  });

  it("selects only the first exact branded Shopping entity with a token", () => {
    const result = selectSearchApiProductToken({
      target: az4002,
      payload: {
        shopping_results: [
          shoppingRow({
            title: "Shark PowerDetect AZ4000 Upright Vacuum",
            product_token: "wrong_model_token_abcdefghijklmnop",
          }),
          shoppingRow({ position: 2 }),
          shoppingRow({
            position: 3,
            product_token: "later_exact_token_abcdefghijklmnop",
          }),
        ],
      },
    });
    assert.equal(result.disposition, "selected");
    assert.equal(result.selected?.productToken, exactToken);
    assert.equal(result.selected?.providerPosition, 2);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      [
        "model_conflict_in_title",
        "accepted_exact_product_token",
        "accepted_exact_product_token",
      ],
    );
  });

  it("rejects Shopping entities and offers that carry a conflicting strong model", () => {
    const tokenSelection = selectSearchApiProductToken({
      target: az4002,
      payload: {
        shopping_results: [
          shoppingRow({ title: "Shark AZ4002 AZ405KT1 Upright Vacuum" }),
        ],
      },
    });
    assert.equal(tokenSelection.selected, null);
    assert.equal(tokenSelection.decisions[0].reason, "model_conflict_in_title");

    const verification = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        offers: [offer({ title: "Shark AZ4002 AZ405KT1 Upright Vacuum" })],
      }),
    });
    assert.equal(verification.offer, null);
    assert.equal(verification.decisions[0].reason, "offer_model_conflict");
  });

  it("does not use Shopping ads, wrong models, missing tokens, or malformed payloads", () => {
    const ignoredAd = selectSearchApiProductToken({
      target: az4002,
      payload: {
        shopping_ads: [shoppingRow()],
        shopping_results: [
          shoppingRow({
            title: "Shark PowerDetect AZ4000 Upright Vacuum",
            product_token: "wrong_model_token_abcdefghijklmnop",
          }),
          shoppingRow({ product_token: "" }),
        ],
      },
    });
    assert.equal(ignoredAd.selected, null);
    assert.deepEqual(
      ignoredAd.decisions.map((decision) => decision.reason),
      ["model_conflict_in_title", "missing_product_token"],
    );

    const malformed = selectSearchApiProductToken({
      target: az4002,
      payload: { shopping_results: { title: "not-an-array" } },
    });
    assert.equal(malformed.disposition, "invalid_schema");
    assert.equal(malformed.reason, "invalid_shopping_results_schema");
  });

  it("requires descriptive model terms when a family code alone is ambiguous", () => {
    const dyson = {
      ...az4002,
      key: "rank-4-V16 Piston Animal",
      brand: "Dyson",
      productName: "V16 Piston Animal cordless vacuum",
      model: "V16 Piston Animal",
    };
    const tokenSelection = selectSearchApiProductToken({
      target: dyson,
      payload: {
        shopping_results: [
          shoppingRow({
            title: "Dyson V16 Detect Absolute Cordless Vacuum",
            product_token: "wrong_v16_variant_token_abcdefghijklmnop",
          }),
          shoppingRow({
            position: 2,
            title: "Dyson V16 Piston Animal Cordless Vacuum",
            product_token: "exact_v16_piston_token_abcdefghijklmnop",
          }),
        ],
      },
    });
    assert.equal(tokenSelection.selected?.providerPosition, 2);
    assert.equal(
      tokenSelection.decisions[0].reason,
      "descriptive_model_terms_not_in_title",
    );

    const verification = verifySearchApiProductOffers({
      target: dyson,
      selectedShoppingTitle: "Dyson V16 Piston Animal Cordless Vacuum",
      payload: {
        product: { title: "Dyson V16 Piston Animal", brand: "Dyson" },
        offers: [
          offer({ title: "Dyson V16 Detect Absolute Cordless Vacuum" }),
          offer({
            position: 2,
            title: "Dyson V16 Piston Animal Cordless Vacuum",
          }),
        ],
      },
    });
    assert.equal(
      verification.decisions[0].reason,
      "descriptive_model_terms_not_in_offer_title",
    );
    assert.equal(verification.offer?.providerPosition, 2);
  });

  it("accepts one exact, in-stock, new offer with a direct merchant URL", () => {
    const result = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload(),
    });
    assert.equal(result.disposition, "verified");
    assert.equal(result.offer?.priceAmount, 449.99);
    assert.equal(result.offer?.seller, "Merchant");
    assert.equal(result.offer?.productUrl, offer().link);
    assert.deepEqual(result.offer?.matchedIdentifiers, ["az4002"]);
    assert.equal(JSON.stringify(result).includes("Unverified prose"), false);
    assert.equal(JSON.stringify(result).includes("999999"), false);
  });

  it("rejects a canonical product whose brand or model conflicts", () => {
    const wrongModel = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        product: { title: "Shark PowerDetect AZ405KT1 Upright Vacuum", brand: "Shark" },
      }),
    });
    assert.equal(wrongModel.offer, null);
    assert.equal(wrongModel.reason, "canonical_model_conflict");

    const wrongBrand = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        product: { title: "Dyson AZ4002 Upright Vacuum", brand: "Dyson" },
      }),
    });
    assert.equal(wrongBrand.offer, null);
    assert.equal(wrongBrand.reason, "canonical_brand_conflict");

    const contradictoryCanonicalTitle = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        product: { title: "Dyson AZ4002 Upright Vacuum", brand: "Shark" },
      }),
    });
    assert.equal(contradictoryCanonicalTitle.offer, null);
    assert.equal(contradictoryCanonicalTitle.reason, "canonical_brand_conflict");
  });

  it("rejects an offer title with a missing or conflicting target brand", () => {
    const result = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        offers: [
          offer({ title: "Dyson AZ4002 Upright Vacuum" }),
          offer({ title: "Shark Dyson AZ4002 Upright Vacuum" }),
        ],
      }),
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      ["brand_not_in_offer_title", "offer_brand_conflict"],
    );
  });

  it("does not bind a neighboring offer price and uses the first exact offer", () => {
    const result = verifySearchApiProductOffers({
      target: { ...az4002, key: "rank-3-HZ4002", model: "HZ4002" },
      selectedShoppingTitle: "Shark PowerDetect HZ4002 Corded Stick Vacuum",
      payload: {
        product: { title: "Shark PowerDetect Corded Stick Vacuum", brand: "Shark" },
        offers: [
          offer({
            title: "Shark PowerDetect IP3251 Cordless Vacuum",
            link: "https://merchant.example/products/ip3251",
            price: "$319.99",
            extracted_price: 319.99,
          }),
          offer({
            position: 2,
            title: "Shark PowerDetect HZ4002 Corded Stick Vacuum",
            link: "https://merchant.example/products/hz4002",
            price: "$329.99",
            extracted_price: 329.99,
          }),
          offer({
            position: 3,
            title: "Shark PowerDetect HZ4002 Corded Stick Vacuum",
            link: "https://other.example/products/hz4002",
            price: "$299.99",
            extracted_price: 299.99,
          }),
        ],
      },
    });
    assert.equal(result.offer?.priceAmount, 329.99);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "offer_model_conflict");
  });

  it("rejects wrappers, listing URLs, accessories, and non-new offers", () => {
    const result = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        offers: [
          offer({ link: "https://www.google.com/search?ibp=oshop&q=AZ4002" }),
          offer({ link: "https://merchant.example/search?q=AZ4002" }),
          offer({
            title: "Replacement Filter Compatible with Shark AZ4002 Vacuum",
            link: "https://merchant.example/products/filter-az4002",
          }),
          offer({ title: "Refurbished Shark AZ4002 Upright Vacuum" }),
        ],
      }),
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      [
        "missing_merchant_product_url",
        "product_ineligible",
        "explicit_accessory_offer",
        "non_new_offer",
      ],
    );
  });

  it("requires explicit in-stock evidence and rejects unavailable offers", () => {
    const result = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        offers: [
          offer({ details: [] }),
          offer({ details: ["Out of stock"] }),
          offer({ details: ["Sold out"] }),
        ],
      }),
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      ["in_stock_not_confirmed", "offer_unavailable", "offer_unavailable"],
    );
  });

  it("rejects missing seller, price, destination, and offer identifiers", () => {
    const result = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: offersPayload({
        offers: [
          offer({ merchant: {} }),
          offer({ price: "", extracted_price: null }),
          offer({ link: "" }),
          offer({ title: "Shark PowerDetect Upright Vacuum" }),
        ],
      }),
    });
    assert.equal(result.offer, null);
    assert.deepEqual(
      result.decisions.map((decision) => decision.reason),
      [
        "missing_seller",
        "missing_price",
        "missing_merchant_product_url",
        "stable_identifier_not_in_offer_title",
      ],
    );
  });

  it("fails closed on Offers schema drift and never uses model-authored fallbacks", () => {
    const malformed = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: { product: {}, offers: { title: "not-an-array" } },
    });
    assert.equal(malformed.disposition, "invalid_schema");
    assert.equal(malformed.reason, "invalid_product_offers_schema");
    assert.equal(malformed.offer, null);

    const empty = verifySearchApiProductOffers({
      target: az4002,
      selectedShoppingTitle: shoppingRow().title,
      payload: { product: { title: "Shark AZ4002", brand: "Shark" }, offers: [] },
    });
    assert.equal(empty.disposition, "inconclusive");
    assert.equal(empty.offer, null);
  });
});

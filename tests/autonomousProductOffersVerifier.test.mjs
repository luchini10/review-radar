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

  it("rejects compound sibling Shopping entities and token-bound offers", () => {
    const target = {
      ...az4002,
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };
    const tokenSelection = selectSearchApiProductToken({
      target,
      payload: {
        shopping_results: [
          shoppingRow({
            title: "Example X100 B2 cordless vacuum",
            product_token: "sibling_x100_b2_token_abcdefghijklmnop",
          }),
          shoppingRow({
            position: 2,
            title: "Example X100 A1 cordless vacuum",
            product_token: "exact_x100_a1_token_abcdefghijklmnop",
          }),
        ],
      },
    });
    assert.equal(tokenSelection.selected?.providerPosition, 2);
    assert.equal(tokenSelection.decisions[0].reason, "model_conflict_in_title");

    const verification = verifySearchApiProductOffers({
      target,
      selectedShoppingTitle: "Example X100 A1 cordless vacuum",
      payload: {
        product: { title: "Example X100 A1 cordless vacuum", brand: "Example" },
        offers: [
          offer({
            title: "Example X100 B2 cordless vacuum",
            link: "https://merchant.example/products/x100-b2",
            price: "$99.00",
            extracted_price: 99,
          }),
          offer({
            position: 2,
            title: "Example X100 A1 cordless vacuum",
            link: "https://merchant.example/products/x100-a1",
            price: "$199.00",
            extracted_price: 199,
          }),
        ],
      },
    });
    assert.equal(verification.decisions[0].reason, "offer_model_conflict");
    assert.equal(verification.offer?.providerPosition, 2);
    assert.equal(verification.offer?.priceAmount, 199);
  });

  it("rejects mixed exact-and-sibling identities across token, canonical, and offer boundaries", () => {
    const target = {
      ...az4002,
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };
    const mixedTitle = "Example X100 A1 and X100 B2 cordless vacuum";
    const exactTitle = "Example X100 A1 cordless vacuum";
    const exactProductToken = "exact_x100_a1_token_abcdefghijklmnop";
    const tokenSelection = selectSearchApiProductToken({
      target,
      payload: {
        shopping_results: [
          shoppingRow({
            title: mixedTitle,
            product_token: "mixed_x100_token_abcdefghijklmnop",
          }),
          shoppingRow({
            position: 2,
            title: exactTitle,
            product_token: exactProductToken,
          }),
        ],
      },
    });

    assert.equal(tokenSelection.verifierVersion, "oai-hybrid-searchapi-product-offers-v2");
    assert.equal(tokenSelection.selected?.providerPosition, 2);
    assert.equal(tokenSelection.decisions[0].reason, "model_conflict_in_title");

    const canonicalConflict = verifySearchApiProductOffers({
      target,
      selectedShoppingTitle: exactTitle,
      payload: {
        product: { title: mixedTitle, brand: "Example" },
        offers: [offer({ title: exactTitle })],
      },
    });
    assert.equal(canonicalConflict.reason, "canonical_model_conflict");
    assert.equal(canonicalConflict.offer, null);

    const offerConflict = verifySearchApiProductOffers({
      target,
      selectedShoppingTitle: exactTitle,
      payload: {
        product: { title: exactTitle, brand: "Example" },
        offers: [
          offer({
            title: mixedTitle,
            link: "https://merchant.example/products/mixed-x100",
            price: "$99.00",
            extracted_price: 99,
          }),
          offer({
            position: 2,
            title: exactTitle,
            link: "https://merchant.example/products/x100-a1",
            price: "$199.00",
            extracted_price: 199,
          }),
        ],
      },
    });
    assert.equal(offerConflict.verifierVersion, "oai-hybrid-searchapi-product-offers-v2");
    assert.equal(offerConflict.decisions[0].reason, "offer_model_conflict");
    assert.equal(offerConflict.offer?.providerPosition, 2);
    assert.equal(offerConflict.offer?.priceAmount, 199);
  });

  it("rejects punctuation-obscured siblings and incomplete families at every token-bound identity surface", () => {
    const target = {
      ...az4002,
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };
    const exactTitle = "Example X100 A1 cordless vacuum";

    for (const invalidTitle of [
      "Example X100 (A1) and X100 (B2) cordless vacuum",
      "Example X100 A1 plus B2 cordless vacuum",
      "Example X100 A1 alongside B2 cordless vacuum",
      "Example X100 A1 featuring B2 cordless vacuum",
      "Example X100 A1 model B2 cordless vacuum",
      "Example X100 A1 variant B2 cordless vacuum",
      "Example X100 A1 trim B2 cordless vacuum",
      "Example X100 A1 version B2 cordless vacuum",
      "Example X100 A1 aka B2 cordless vacuum",
      "Example X100 A1 includes B2 cordless vacuum",
      "Example X100 cordless vacuum",
    ]) {
      const tokenSelection = selectSearchApiProductToken({
        target,
        payload: {
          shopping_results: [
            shoppingRow({
              title: invalidTitle,
              product_token: "invalid_x100_identity_abcdefghijklmnop",
            }),
            shoppingRow({
              position: 2,
              title: exactTitle,
              product_token: "exact_x100_identity_abcdefghijklmnop",
            }),
          ],
        },
      });
      assert.equal(tokenSelection.selected?.providerPosition, 2, invalidTitle);
      assert.equal(tokenSelection.decisions[0].accepted, false, invalidTitle);

      const canonicalConflict = verifySearchApiProductOffers({
        target,
        selectedShoppingTitle: exactTitle,
        payload: {
          product: { title: invalidTitle, brand: "Example" },
          offers: [offer({ title: exactTitle })],
        },
      });
      assert.equal(
        canonicalConflict.reason,
        "canonical_model_conflict",
        invalidTitle,
      );
      assert.equal(canonicalConflict.offer, null, invalidTitle);

      const offerConflict = verifySearchApiProductOffers({
        target,
        selectedShoppingTitle: exactTitle,
        payload: {
          product: { title: exactTitle, brand: "Example" },
          offers: [
            offer({
              title: invalidTitle,
              link: "https://merchant.example/products/invalid-x100",
              price: "$99.00",
              extracted_price: 99,
            }),
            offer({
              position: 2,
              title: exactTitle,
              link: "https://merchant.example/products/x100-a1",
              price: "$199.00",
              extracted_price: 199,
            }),
          ],
        },
      });
      assert.equal(offerConflict.decisions[0].accepted, false, invalidTitle);
      assert.equal(offerConflict.offer?.providerPosition, 2, invalidTitle);
      assert.equal(offerConflict.offer?.priceAmount, 199, invalidTitle);
    }
  });

  it("accepts equivalent compound punctuation and joined or split measurements at every token-bound surface", () => {
    const target = {
      ...az4002,
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 appliance",
      model: "X100 A1",
      category: "appliance",
    };

    for (const title of [
      "Example X100 (A1) appliance",
      "Example X100-A1 appliance",
      "Example X100/A1 appliance",
      "Example X100 A1 4-Burner appliance",
      "Example X100 A1 4 Burner appliance",
      "Example X100 A1 5Ah appliance",
      "Example X100 A1 5 Ah appliance",
      "Example X100 A1 12-Cup appliance",
      "Example X100 A1 12 Cup appliance",
      "Example X100 A1 3000RPM appliance",
      "Example X100 A1 3000 RPM appliance",
    ]) {
      const tokenSelection = selectSearchApiProductToken({
        target,
        payload: {
          shopping_results: [
            shoppingRow({
              title,
              product_token: "equivalent_x100_identity_abcdefghijklmnop",
            }),
          ],
        },
      });
      assert.equal(tokenSelection.disposition, "selected", title);

      const verification = verifySearchApiProductOffers({
        target,
        selectedShoppingTitle: title,
        payload: {
          product: { title, brand: "Example" },
          offers: [
            offer({
              title,
              link: "https://merchant.example/products/x100-a1",
              price: "$199.00",
              extracted_price: 199,
            }),
          ],
        },
      });
      assert.equal(verification.disposition, "verified", title);
      assert.equal(verification.offer?.priceAmount, 199, title);
    }

    const numericTarget = {
      ...target,
      key: "rank-1-X100-20-technology-version",
      productName: "Example X100 20 appliance",
      model: "X100 20",
    };
    for (const title of [
      "Example X100 20 with Bluetooth LE version 5.0 appliance",
      "Example X100 20 with Bluetooth Low Energy version 5.0 appliance",
      "Example X100 20 with USB Type-C version 3.2 appliance",
      "Example X100 20 with HDMI eARC version 2.1 appliance",
      "Example X100 20 with Wi-Fi 6E version 2.0 appliance",
      "Example X100 20 with DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 with Wi-Fi 6E appliance",
      "Example X100 20 with Wi-Fi 7 appliance",
    ]) {
      const tokenSelection = selectSearchApiProductToken({
        target: numericTarget,
        payload: {
          shopping_results: [
            shoppingRow({
              title,
              product_token: "technology_x100_identity_abcdefghijklmnop",
            }),
          ],
        },
      });
      assert.equal(tokenSelection.disposition, "selected", title);

      const verification = verifySearchApiProductOffers({
        target: numericTarget,
        selectedShoppingTitle: title,
        payload: {
          product: { title, brand: "Example" },
          offers: [
            offer({
              title,
              link: "https://merchant.example/products/x100-20",
              price: "$199.00",
              extracted_price: 199,
            }),
          ],
        },
      });
      assert.equal(verification.disposition, "verified", title);
      assert.equal(verification.offer?.priceAmount, 199, title);
    }
  });

  it("rejects short numeric and descriptive exact-plus-sibling Shopping identities", () => {
    const cases = [
      {
        target: {
          ...az4002,
          key: "rank-1-X100-20",
          brand: "Example",
          productName: "Example X100 20 cordless vacuum",
          model: "X100 20",
          category: "cordless vacuum",
        },
        mixedTitle: "Example X100 30 cordless vacuum",
        exactTitle: "Example X100 20 cordless vacuum",
      },
      ...[
        "Example X100 20 plus 30 cordless vacuum",
        "Example X100 20 alongside 30 cordless vacuum",
        "Example X100 20 variant 30 cordless vacuum",
        "Example X100 20 and 30 cordless vacuum",
        "Example X100 20, 30 cordless vacuum",
        "Example 30 alongside X100 20 cordless vacuum",
        "Example X100 20 plus X100 model 2024 cordless vacuum",
        "Example X100 20 plus X100 30.0 cordless vacuum",
        "Example X100 20 plus model number 2024 cordless vacuum",
        "Example X100 20 plus model no. 2024 cordless vacuum",
        "Example X100 20 plus model code 2024 cordless vacuum",
        "Example X100 20 plus version number 30.0 cordless vacuum",
        "Example X100 20 plus variant number 30.0 cordless vacuum",
        "Example X100 20 plus variant code 2024 cordless vacuum",
        "Example X100 20 plus trim level 30.0 cordless vacuum",
        "Example X100 20 plus trim code 2024 cordless vacuum",
        "Example X100 20 plus 2024 model X100 cordless vacuum",
        "Example X100 20 plus B2 with Bluetooth Low Energy version 5.0 cordless vacuum",
        "Example X100 20 plus model Bluetooth LE version 5.0 cordless vacuum",
        "Example X100 20 plus variant USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus trim HDMI eARC version 2.1 cordless vacuum",
        "Example X100 20 plus model Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E model cordless vacuum",
        "Example X100 20 plus model ID: Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model identifier Bluetooth LE version 5.0 cordless vacuum",
        "Example X100 20 plus model-name USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus variant ID HDMI eARC version 2.1 cordless vacuum",
        "Example X100 20 plus trim name DisplayPort Alt Mode version 2.0 cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E model identifier cordless vacuum",
        "Example X100 20 plus Bluetooth LE version 5.0 model name cordless vacuum",
        "Example X100 20 plus ModelID Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus modelIdentifier Bluetooth LE version 5.0 cordless vacuum",
        "Example X100 20 plus modelName USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus variantID HDMI eARC version 2.1 cordless vacuum",
        "Example X100 20 plus variantIdentifier DisplayPort Alt Mode version 2.0 cordless vacuum",
        "Example X100 20 plus variantName Wi-Fi 7 cordless vacuum",
        "Example X100 20 plus trimID Bluetooth Low Energy version 5.0 cordless vacuum",
        "Example X100 20 plus trimIdentifier Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus trimName USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E ModelID cordless vacuum",
        "Example X100 20 plus Bluetooth LE version 5.0 trimName cordless vacuum",
        "Example X100 20 plus Model ID is Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus ModelID equals Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model called Bluetooth LE version 5.0 cordless vacuum",
        "Example X100 20 plus model named USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus variant is Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E is the Model ID cordless vacuum",
        "Example X100 20 plus Bluetooth LE version 5.0 is the modelName cordless vacuum",
        "Example X100 20 plus model designation is DisplayPort Alt Mode version 2.0 cordless vacuum",
        "Example X100 20 plus model is called Bluetooth LE version 5.0 cordless vacuum",
        "Example X100 20 plus model is named USB Type-C version 3.2 cordless vacuum",
        "Example X100 20 plus model is designated Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model is designated as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus variant is called HDMI eARC version 2.1 cordless vacuum",
        "Example X100 20 plus trim is named DisplayPort Alt Mode version 2.0 cordless vacuum",
        "Example X100 20 plus model is known as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model also known as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model is also known as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model is the Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E is known as the model cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E is designated as the model cordless vacuum",
        "Example X100 20 plus Bluetooth LE version 5.0 is called the modelName cordless vacuum",
        "Example X100 20 plus USB Type-C version 3.2 is named the variantID cordless vacuum",
        "Example X100 20; the model, also known as Wi-Fi 6E, cordless vacuum",
        "Example X100 20 plus model, is designated as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus model is, also known as Wi-Fi 6E cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E, also known as the model cordless vacuum",
        "Example X100 20 plus Wi-Fi 6E is, also known as the model cordless vacuum",
      ].map((mixedTitle, index) => ({
        target: {
          ...az4002,
          key: `rank-1-X100-20-hidden-sibling-${index}`,
          brand: "Example",
          productName: "Example X100 20 cordless vacuum",
          model: "X100 20",
          category: "cordless vacuum",
        },
        mixedTitle,
        exactTitle:
          "Example X100 20 with Bluetooth version number 5.0 cordless vacuum",
      })),
      ...[
        {
          model: "X100 2024",
          exactTitle: "Example X100 2024 cordless vacuum",
          mixedTitle: "Example X100 2030 cordless vacuum",
        },
        {
          model: "X100 30.0",
          exactTitle: "Example X100 30.0 cordless vacuum",
          mixedTitle: "Example X100 31.0 cordless vacuum",
        },
      ].map((testCase, index) => ({
        target: {
          ...az4002,
          key: `rank-1-numeric-context-${index}`,
          brand: "Example",
          productName: testCase.exactTitle,
          model: testCase.model,
          category: "cordless vacuum",
        },
        mixedTitle: testCase.mixedTitle,
        exactTitle: testCase.exactTitle,
      })),
      {
        target: {
          ...az4002,
          key: "rank-1-Q50-Max",
          brand: "Example",
          productName: "Example Q50 Max robot vacuum",
          model: "Q50 Max",
          category: "robot vacuum",
        },
        mixedTitle: "Example Q50 Max and Q50 Pro robot vacuum",
        exactTitle: "Example Q50 Max robot vacuum",
      },
    ];

    for (const testCase of cases) {
      const tokenSelection = selectSearchApiProductToken({
        target: testCase.target,
        payload: {
          shopping_results: [
            shoppingRow({
              title: testCase.mixedTitle,
              product_token: "mixed_identity_token_abcdefghijklmnop",
            }),
            shoppingRow({
              position: 2,
              title: testCase.exactTitle,
              product_token: "exact_identity_token_abcdefghijklmnop",
            }),
          ],
        },
      });

      assert.equal(tokenSelection.selected?.providerPosition, 2);
      assert.equal(tokenSelection.decisions[0].reason, "model_conflict_in_title");

      const canonicalConflict = verifySearchApiProductOffers({
        target: testCase.target,
        selectedShoppingTitle: testCase.exactTitle,
        payload: {
          product: { title: testCase.mixedTitle, brand: "Example" },
          offers: [offer({ title: testCase.exactTitle })],
        },
      });
      assert.equal(canonicalConflict.reason, "canonical_model_conflict");
      assert.equal(canonicalConflict.offer, null);

      const offerConflict = verifySearchApiProductOffers({
        target: testCase.target,
        selectedShoppingTitle: testCase.exactTitle,
        payload: {
          product: { title: testCase.exactTitle, brand: "Example" },
          offers: [
            offer({
              title: testCase.mixedTitle,
              link: "https://merchant.example/products/mixed-identity",
              price: "$99.00",
              extracted_price: 99,
            }),
            offer({
              position: 2,
              title: testCase.exactTitle,
              link: "https://merchant.example/products/exact-identity",
              price: "$199.00",
              extracted_price: 199,
            }),
          ],
        },
      });
      assert.equal(offerConflict.decisions[0].reason, "offer_model_conflict");
      assert.equal(offerConflict.offer?.providerPosition, 2);
      assert.equal(offerConflict.offer?.priceAmount, 199);
    }
  });

  it("accepts one exact compound alias across token selection and offers", () => {
    const target = {
      ...az4002,
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1 / Y200 B2",
      category: "cordless vacuum",
    };
    const exactAliasToken = "exact_compound_alias_token_abcdefghijklmnop";
    const tokenSelection = selectSearchApiProductToken({
      target,
      payload: {
        shopping_results: [
          shoppingRow({
            title: "Example X100 A1 cordless vacuum",
            product_token: exactAliasToken,
          }),
        ],
      },
    });
    assert.equal(tokenSelection.selected?.productToken, exactAliasToken);

    const verification = verifySearchApiProductOffers({
      target,
      selectedShoppingTitle: "Example X100 A1 cordless vacuum",
      payload: {
        product: { title: "Example X100 A1 cordless vacuum", brand: "Example" },
        offers: [
          offer({
            title: "Example X100 A1 cordless vacuum",
            link: "https://merchant.example/products/x100-a1",
            price: "$199.00",
            extracted_price: 199,
          }),
        ],
      },
    });
    assert.equal(verification.disposition, "verified");
    assert.equal(verification.offer?.priceAmount, 199);
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
      "model_conflict_in_title",
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
      "offer_model_conflict",
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

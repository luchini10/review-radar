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

  it("does not accept a compound sibling through one shared family token", () => {
    const target = {
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };
    const result = verifyCommerceShoppingResults({
      target,
      results: [
        shoppingResult({
          title: "Example X100 B2 cordless vacuum",
          productLink: "https://merchant.example/products/x100-b2",
          price: "$99.00",
        }),
        shoppingResult({
          title: "Example X100 A1 cordless vacuum",
          productLink: "https://merchant.example/products/x100-a1",
          price: "$199.00",
          position: 2,
        }),
      ],
    });

    assert.equal(result.offer?.priceAmount, 199);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
    assert.equal(result.decisions[1].reason, "accepted_exact_offer");
  });

  it("rejects mixed exact-and-sibling compound titles before a later exact row", () => {
    const target = {
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };

    for (const title of [
      "Example X100 A1 and X100 B2 cordless vacuum",
      "Example X100 A1, X100 B2 cordless vacuum",
      "Example X100 (A1) and X100 (B2) cordless vacuum",
      "Example X100 A1 and B2 cordless vacuum",
      "Example X100 A1 / B2 cordless vacuum",
      "Example X100 A1 plus B2 cordless vacuum",
      "Example X100 A1 alongside B2 cordless vacuum",
      "Example X100 A1 featuring B2 cordless vacuum",
      "Example X100 A1 model B2 cordless vacuum",
      "Example X100 A1 variant B2 cordless vacuum",
      "Example X100 A1 trim B2 cordless vacuum",
      "Example X100 A1 version B2 cordless vacuum",
      "Example X100 A1 aka B2 cordless vacuum",
      "Example X100 A1 includes B2 cordless vacuum",
    ]) {
      const result = verifyCommerceShoppingResults({
        target,
        results: [
          shoppingResult({
            title,
            productLink: "https://merchant.example/products/mixed-x100",
            price: "$99.00",
          }),
          shoppingResult({
            title: "Example X100 A1 cordless vacuum",
            productLink: "https://merchant.example/products/x100-a1",
            price: "$199.00",
            position: 2,
          }),
        ],
      });

      assert.equal(result.offer?.priceAmount, 199);
      assert.equal(result.offer?.providerPosition, 2);
      assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
    }
  });

  it("requires a complete compound alias instead of accepting only its family token", () => {
    const target = {
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1",
      category: "cordless vacuum",
    };
    const result = verifyCommerceShoppingResults({
      target,
      results: [
        shoppingResult({
          title: "Example X100 cordless vacuum",
          productLink: "https://merchant.example/products/x100-family",
          price: "$99.00",
        }),
        shoppingResult({
          title: "Example X100 A1 cordless vacuum",
          productLink: "https://merchant.example/products/x100-a1",
          price: "$199.00",
          position: 2,
        }),
      ],
    });

    assert.equal(result.offer?.priceAmount, 199);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
  });

  it("normalizes safe compound formatting and joined or split measurements", () => {
    const target = {
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
      const result = verifyCommerceShoppingResults({
        target,
        results: [
          shoppingResult({
            title,
            productLink: "https://merchant.example/products/x100-a1",
            price: "$199.00",
          }),
        ],
      });

      assert.equal(result.disposition, "verified", title);
      assert.equal(result.offer?.priceAmount, 199, title);
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
      const result = verifyCommerceShoppingResults({
        target: numericTarget,
        results: [
          shoppingResult({
            title,
            productLink: "https://merchant.example/products/x100-20",
            price: "$199.00",
          }),
        ],
      });

      assert.equal(result.disposition, "verified", title);
      assert.equal(result.offer?.priceAmount, 199, title);
    }
  });

  it("rejects short numeric model siblings before a later exact row", () => {
    const target = {
      key: "rank-1-X100-20",
      brand: "Example",
      productName: "Example X100 20 cordless vacuum",
      model: "X100 20",
      category: "cordless vacuum",
    };
    for (const invalidTitle of [
      "Example X100 30 cordless vacuum",
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
    ]) {
      const result = verifyCommerceShoppingResults({
        target,
        results: [
          shoppingResult({
            title: invalidTitle,
            productLink: "https://merchant.example/products/x100-30",
            price: "$99.00",
          }),
          shoppingResult({
            title:
              "Example X100 20 with Bluetooth version number 5.0 cordless vacuum",
            productLink: "https://merchant.example/products/x100-20",
            price: "$199.00",
            position: 2,
          }),
        ],
      });

      assert.equal(result.offer?.priceAmount, 199, invalidTitle);
      assert.equal(result.offer?.providerPosition, 2, invalidTitle);
      assert.equal(
        result.decisions[0].reason,
        "stable_identifier_not_in_title",
        invalidTitle,
      );
    }

    for (const testCase of [
      {
        exactTitle: "Example X100 2024 cordless vacuum",
        model: "X100 2024",
        siblingTitle: "Example X100 2030 cordless vacuum",
      },
      {
        exactTitle: "Example X100 30.0 cordless vacuum",
        model: "X100 30.0",
        siblingTitle: "Example X100 31.0 cordless vacuum",
      },
    ]) {
      const result = verifyCommerceShoppingResults({
        target: {
          ...target,
          key: `rank-1-${testCase.model.replace(/\W+/g, "-")}`,
          model: testCase.model,
          productName: testCase.exactTitle,
        },
        results: [
          shoppingResult({
            title: testCase.siblingTitle,
            productLink: "https://merchant.example/products/sibling",
            price: "$99.00",
          }),
          shoppingResult({
            title: testCase.exactTitle,
            productLink: "https://merchant.example/products/exact",
            price: "$199.00",
            position: 2,
          }),
        ],
      });

      assert.equal(result.offer?.priceAmount, 199, testCase.siblingTitle);
      assert.equal(result.offer?.providerPosition, 2, testCase.siblingTitle);
    }
  });

  it("does not accept a descriptive trim sibling through one shared model code", () => {
    const target = {
      key: "rank-1-Q50-Max",
      brand: "Example",
      productName: "Example Q50 Max robot vacuum",
      model: "Q50 Max",
      category: "robot vacuum",
    };
    const result = verifyCommerceShoppingResults({
      target,
      results: [
        shoppingResult({
          title: "Example Q50 Pro robot vacuum",
          productLink: "https://merchant.example/products/q50-pro",
          price: "$99.00",
        }),
        shoppingResult({
          title: "Example Q50 Max robot vacuum",
          productLink: "https://merchant.example/products/q50-max",
          price: "$199.00",
          position: 2,
        }),
      ],
    });

    assert.equal(result.offer?.priceAmount, 199);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
    assert.equal(result.decisions[1].reason, "accepted_exact_offer");
  });

  it("rejects a title that names both the exact and a descriptive sibling trim", () => {
    const target = {
      key: "rank-1-Q50-Max",
      brand: "Example",
      productName: "Example Q50 Max robot vacuum",
      model: "Q50 Max",
      category: "robot vacuum",
    };
    for (const title of [
      "Example Q50 Max and Q50 Pro robot vacuum",
      "Example Q50 Max and HZ4002 robot vacuum",
      "Example Q50 Max and Y7 B2 robot vacuum",
    ]) {
      const result = verifyCommerceShoppingResults({
        target,
        results: [
          shoppingResult({
            title,
            productLink: "https://merchant.example/products/mixed-q50",
            price: "$99.00",
          }),
          shoppingResult({
            title: "Example Q50 Max robot vacuum",
            productLink: "https://merchant.example/products/q50-max",
            price: "$199.00",
            position: 2,
          }),
        ],
      });

      assert.equal(result.offer?.priceAmount, 199);
      assert.equal(result.offer?.providerPosition, 2);
      assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
    }
  });

  it("accepts one exact compound alias without requiring every alias in the title", () => {
    const target = {
      key: "rank-1-X100-A1",
      brand: "Example",
      productName: "Example X100 A1 cordless vacuum",
      model: "X100 A1 / Y200 B2",
      category: "cordless vacuum",
    };
    const result = verifyCommerceShoppingResults({
      target,
      results: [
        shoppingResult({
          title: "Example X100 A1 cordless vacuum",
          productLink: "https://merchant.example/products/x100-a1",
          price: "$199.00",
        }),
      ],
    });

    assert.equal(result.disposition, "verified");
    assert.equal(result.offer?.priceAmount, 199);
  });

  it("requires the descriptive trim belonging to the matched alias", () => {
    const target = {
      key: "rank-1-Q50-Max",
      brand: "Example",
      productName: "Example Q50 Max robot vacuum",
      model: "Q50 Max / Q60 Pro",
      category: "robot vacuum",
    };
    const result = verifyCommerceShoppingResults({
      target,
      results: [
        shoppingResult({
          title: "Example Q50 Base robot vacuum",
          productLink: "https://merchant.example/products/q50-base",
          price: "$99.00",
        }),
        shoppingResult({
          title: "Example Q50 Max robot vacuum",
          productLink: "https://merchant.example/products/q50-max",
          price: "$199.00",
          position: 2,
        }),
      ],
    });

    assert.equal(result.offer?.priceAmount, 199);
    assert.equal(result.offer?.providerPosition, 2);
    assert.equal(result.decisions[0].reason, "stable_identifier_not_in_title");
    assert.equal(result.decisions[1].reason, "accepted_exact_offer");
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTwoLayerProductCards,
  hashTwoLayerResearchText,
  TWO_LAYER_COMMERCE_RECEIPT_VERSION,
  TWO_LAYER_RESEARCH_VERSION,
  twoLayerIdentityFingerprint,
  validateTwoLayerResearchExtraction,
} from "../lib/twoLayerRecommendation.ts";

const rawResearchText = `
1. Shark AZ4002 Upright Vacuum
The Shark AZ4002 is the strongest overall match for homes with pets.
Best for: mixed floors and pet hair.
Main tradeoff: it is heavier than a cordless model.
Currently available for purchase in the United States
Strong pickup on embedded hair.
Good edge cleaning.
The powered brush roll performed well on carpet in professional testing.

2. Dyson Gen5detect Absolute Prussian Blue/Copper
The Dyson Gen5detect Absolute is a strong premium cordless option.
Best for: shoppers prioritizing filtration and cordless convenience.
Main tradeoff: the bin is smaller than a full-size upright.
Excellent filtration.
Convenient cordless design.
Owners praise its maneuverability but report that the trigger takes adjustment.
`.trim();

const responseSourceUrls = [
  "https://www.sharkclean.com/products/az4002",
  "https://www.example.com/tests/shark-az4002",
  "https://www.dyson.com/vacuum-cleaners/cordless/gen5detect/prussian-blue-copper",
  "https://www.example.com/owners/dyson-gen5detect",
];

function researchFixture() {
  return {
    version: TWO_LAYER_RESEARCH_VERSION,
    research_text_sha256: hashTwoLayerResearchText(rawResearchText),
    sources: [
      {
        id: "s1",
        title: "Shark AZ4002 product page",
        url: responseSourceUrls[0],
        role: "official_product",
      },
      {
        id: "s2",
        title: "Shark AZ4002 performance test",
        url: responseSourceUrls[1],
        role: "professional_test",
      },
      {
        id: "s3",
        title: "Dyson Gen5detect product page",
        url: responseSourceUrls[2],
        role: "official_product",
      },
      {
        id: "s4",
        title: "Dyson Gen5detect owner feedback",
        url: responseSourceUrls[3],
        role: "owner_feedback",
      },
    ],
    recommendations: [
      {
        key: "shark-az4002",
        rank: 1,
        recommendation_status: "Best Match",
        identity: {
          brand: "Shark",
          product_name: "Shark AZ4002 Upright Vacuum",
          model: "AZ4002",
          variant: null,
          source_ids: ["s1"],
        },
        assessment: {
          why: "The Shark AZ4002 is the strongest overall match for homes with pets.",
          best_for: "Best for: mixed floors and pet hair.",
          main_tradeoff: "Main tradeoff: it is heavier than a cordless model.",
          source_ids: ["s1", "s2"],
        },
        pros: [
          { text: "Strong pickup on embedded hair.", source_ids: ["s2"] },
          { text: "Good edge cleaning.", source_ids: ["s2"] },
        ],
        cons: [
          {
            text: "Main tradeoff: it is heavier than a cordless model.",
            source_ids: ["s1"],
          },
        ],
        requirement_checks: [
          {
            requirement: "Currently available for purchase in the United States",
            status: "Pass",
            explanation: "The Shark AZ4002 is the strongest overall match for homes with pets.",
            source_ids: ["s1"],
          },
        ],
        claims: [
          {
            claim_type: "professional_performance",
            text: "The powered brush roll performed well on carpet in professional testing.",
            source_ids: ["s2"],
            evidence_scope: "exact_model",
          },
        ],
      },
      {
        key: "dyson-gen5detect-absolute",
        rank: 2,
        recommendation_status: "Close Match",
        identity: {
          brand: "Dyson",
          product_name: "Dyson Gen5detect Absolute",
          model: "Gen5detect Absolute",
          variant: "Prussian Blue/Copper",
          source_ids: ["s3"],
        },
        assessment: {
          why: "The Dyson Gen5detect Absolute is a strong premium cordless option.",
          best_for:
            "Best for: shoppers prioritizing filtration and cordless convenience.",
          main_tradeoff:
            "Main tradeoff: the bin is smaller than a full-size upright.",
          source_ids: ["s3", "s4"],
        },
        pros: [
          { text: "Excellent filtration.", source_ids: ["s3"] },
          { text: "Convenient cordless design.", source_ids: ["s3"] },
        ],
        cons: [
          {
            text: "Main tradeoff: the bin is smaller than a full-size upright.",
            source_ids: ["s4"],
          },
        ],
        requirement_checks: [
          {
            requirement: "Currently available for purchase in the United States",
            status: "Pass",
            explanation: "The Dyson Gen5detect Absolute is a strong premium cordless option.",
            source_ids: ["s3"],
          },
        ],
        claims: [
          {
            claim_type: "owner_feedback",
            text: "Owners praise its maneuverability but report that the trigger takes adjustment.",
            source_ids: ["s4"],
            evidence_scope: "family_or_variant",
          },
        ],
      },
    ],
  };
}

function acceptedResearch() {
  return validateTwoLayerResearchExtraction({
    rawResearchText,
    responseSourceUrls,
    formattedOutput: researchFixture(),
  });
}

function buildCards(receiptInputs, formattedOutput = researchFixture()) {
  return buildTwoLayerProductCards({
    rawResearchText,
    responseSourceUrls,
    formattedOutput,
    receiptInputs,
  });
}

function receiptFor(recommendation, overrides = {}) {
  const identity = {
    brand: recommendation.identity.brand,
    product_name: recommendation.identity.product_name,
    model: recommendation.identity.model,
    variant: recommendation.identity.variant,
  };
  return {
    version: TWO_LAYER_COMMERCE_RECEIPT_VERSION,
    product_key: recommendation.key,
    target_identity_fingerprint: twoLayerIdentityFingerprint(identity),
    verified_identity: identity,
    source_url:
      "https://www.bestbuy.com/site/shark-az4002-upright-vacuum/6582724.p",
    source_title: "Shark AZ4002 Upright Vacuum",
    seller: "Best Buy",
    price_amount: 449.99,
    currency: "USD",
    availability: "in_stock",
    image_url: "https://images.example.com/shark-az4002.jpg",
    observed_at: "2026-07-17T12:00:00.000Z",
    ...overrides,
  };
}

describe("OAI-T1 two-layer recommendation boundary", () => {
  it("accepts only a source-registered, verbatim extraction of the natural answer", () => {
    const accepted = acceptedResearch();
    assert.equal(accepted.recommendations.length, 2);
    assert.deepEqual(
      accepted.recommendations.map((recommendation) => recommendation.rank),
      [1, 2],
    );
  });

  it("rejects formatter-authored product text and citations absent from the API source registry", () => {
    const inventedProduct = researchFixture();
    inventedProduct.recommendations[0].identity.product_name =
      "Shark AZ4002 Pro Upright Vacuum";
    assert.throws(
      () =>
        validateTwoLayerResearchExtraction({
          rawResearchText,
          responseSourceUrls,
          formattedOutput: inventedProduct,
        }),
      /formatter_added_text/,
    );

    const inventedCitation = researchFixture();
    inventedCitation.sources[0].url =
      "https://unregistered.example.com/shark-az4002";
    assert.throws(
      () =>
        validateTwoLayerResearchExtraction({
          rawResearchText,
          responseSourceUrls,
          formattedOutput: inventedCitation,
        }),
      /source_url_not_in_response_registry:s1/,
    );
  });

  it("rejects a formatter that changes Terra's recommendation order", () => {
    const reordered = researchFixture();
    reordered.recommendations.reverse();
    reordered.recommendations[0].rank = 1;
    reordered.recommendations[1].rank = 2;
    assert.throws(
      () =>
        validateTwoLayerResearchExtraction({
          rawResearchText,
          responseSourceUrls,
          formattedOutput: reordered,
        }),
      /recommendation_order_not_preserved/,
    );
  });

  it("keeps price, seller, product URL, availability, and image out of model-owned research", () => {
    const unsafe = researchFixture();
    unsafe.recommendations[0].purchase_offer = {
      price_amount: 399.99,
      seller: "Best Buy",
    };
    assert.throws(
      () =>
        validateTwoLayerResearchExtraction({
          rawResearchText,
          responseSourceUrls,
          formattedOutput: unsafe,
        }),
      /Unrecognized key|unrecognized_keys/i,
    );
  });

  it("preserves every recommendation and its order when no commerce verification exists", () => {
    const result = buildCards([]);
    assert.deepEqual(
      result.cards.map((card) => card.key),
      ["shark-az4002", "dyson-gen5detect-absolute"],
    );
    assert.ok(result.cards.every((card) => card.commerce.state === "not_verified"));
    assert.ok(result.cards.every((card) => card.commerce.label === "Check current price"));
    assert.ok(result.cards.every((card) => card.image.url === null));
    assert.ok(
      result.cards.every(
        (card) => card.identityVerification.state === "not_verified",
      ),
    );
  });

  it("rejects a review-page price without deleting the recommendation", () => {
    const research = acceptedResearch();
    const reviewPageReceipt = receiptFor(research.recommendations[0], {
      source_url:
        "https://www.bestbuy.com/site/reviews/shark-az4002-upright-vacuum/6582724",
      source_title: "Customer Reviews: Shark AZ4002 Upright Vacuum",
      price_amount: 399.99,
    });
    const result = buildCards([reviewPageReceipt]);

    assert.equal(result.cards.length, 2);
    assert.equal(result.cards[0].commerce.state, "not_verified");
    assert.deepEqual(result.receiptDecisions, [
      {
        productKey: "shark-az4002",
        status: "rejected",
        reason: "not_direct_product_page",
      },
    ]);
  });

  it("attaches a price, retailer URL, and image only for an exact direct-product receipt", () => {
    const research = acceptedResearch();
    const result = buildCards([receiptFor(research.recommendations[0])]);

    assert.equal(result.cards[0].commerce.state, "verified");
    assert.equal(result.cards[0].commerce.priceAmount, 449.99);
    assert.equal(
      result.cards[0].commerce.productUrl,
      "https://www.bestbuy.com/site/shark-az4002-upright-vacuum/6582724.p",
    );
    assert.equal(result.cards[0].image.state, "verified");
    assert.equal(result.cards[0].identityVerification.state, "verified");
    assert.equal(result.cards[1].commerce.state, "not_verified");
  });

  it("rejects cross-variant evidence while preserving the recommended Dyson", () => {
    const research = acceptedResearch();
    const dyson = research.recommendations[1];
    const mismatchedIdentity = {
      brand: "Dyson",
      product_name: "Dyson Gen5detect Absolute",
      model: "Gen5detect Absolute",
      variant: "Purple",
    };
    const result = buildCards([
      receiptFor(dyson, {
        verified_identity: mismatchedIdentity,
        source_url:
          "https://www.bestbuy.com/site/dyson-gen5detect-absolute-purple/447930-01.p",
        source_title: "Dyson Gen5detect Absolute Purple 447930-01",
      }),
    ]);

    assert.equal(result.cards.length, 2);
    assert.equal(result.cards[1].identity.variant, "Prussian Blue/Copper");
    assert.equal(result.cards[1].commerce.state, "not_verified");
    assert.equal(
      result.receiptDecisions[0].reason,
      "verified_identity_mismatch",
    );
  });

  it("cannot add or reorder cards through receipt order or unknown products", () => {
    const research = acceptedResearch();
    const result = buildCards([
      receiptFor(research.recommendations[1], {
        source_url:
          "https://www.bestbuy.com/site/dyson-gen5detect-absolute-prussian-blue-copper/6550001.p",
        source_title:
          "Dyson Gen5detect Absolute Prussian Blue Copper Vacuum",
        seller: "Best Buy",
        price_amount: 949.99,
      }),
      receiptFor(research.recommendations[0]),
      receiptFor(research.recommendations[0], {
        product_key: "invented-product",
      }),
    ]);

    assert.deepEqual(
      result.cards.map((card) => card.key),
      ["shark-az4002", "dyson-gen5detect-absolute"],
    );
    assert.equal(result.cards.length, 2);
    assert.ok(
      result.receiptDecisions.some(
        (decision) =>
          decision.productKey === "invented-product" &&
          decision.reason === "unknown_product",
      ),
    );
  });

  it("fails closed on competing receipts instead of choosing by receipt order", () => {
    const research = acceptedResearch();
    const shark = research.recommendations[0];
    const result = buildCards([
      receiptFor(shark),
      receiptFor(shark, {
        source_url:
          "https://www.walmart.com/ip/shark-az4002-upright-vacuum/123456789",
        source_title: "Shark AZ4002 Upright Vacuum",
        seller: "Walmart",
        price_amount: 439.99,
      }),
    ]);

    assert.equal(result.cards[0].commerce.state, "not_verified");
    assert.equal(
      result.receiptDecisions.filter(
        (decision) => decision.reason === "multiple_receipts",
      ).length,
      2,
    );
  });

  it("labels editorial and owner claims as source-reported, never verified", () => {
    const result = buildCards([]);
    assert.equal(result.cards[0].assessment.why.trust, "research_synthesis");
    assert.ok(
      result.cards.every((card) =>
        card.claims.every(
          (claim) =>
            claim.trust === "source_reported" &&
            claim.label === "Source-reported",
        ),
      ),
    );
  });
});

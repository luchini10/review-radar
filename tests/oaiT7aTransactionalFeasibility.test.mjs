import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  sanitizedOfferVerification,
  sanitizedOffersPayload,
  sanitizedShoppingPayload,
  T7A_APPROVAL_ID,
  T7A_MAX_PHYSICAL_ATTEMPTS,
  T7A_REQUIRED_VERIFIED_OFFERS,
  T7A_TARGETS,
  t7aPreflightPlan,
  validateT7aExecution,
} from "../scripts/run-oai-t7a-transactional-feasibility.mjs";

describe("OAI-T7A saved-slate transactional feasibility preflight", () => {
  it("freezes the five Terra-selected products and exact deterministic queries", () => {
    const plan = t7aPreflightPlan("a".repeat(40));
    assert.deepEqual(
      plan.targets.map((item) => [item.rank, item.brand, item.model, item.shoppingRequest.q]),
      [
        [1, "DEWALT", "DXV12P-QT", "DEWALT DXV12P-QT shop vac"],
        [2, "CRAFTSMAN", "CMXEVBE17595", "CRAFTSMAN CMXEVBE17595 shop vac"],
        [3, "Vacmaster", "VFB511B 0202", "Vacmaster VFB511B 0202 shop vac"],
        [4, "RIDGID", "HD1600", "RIDGID HD1600 shop vac"],
        [5, "Milwaukee", "0910-20", "Milwaukee 0910-20 shop vac"],
      ],
    );
    assert.equal(T7A_TARGETS.length, 5);
  });

  it("caps the probe at ten attempts with no discovery, retry, or fallback path", () => {
    const plan = t7aPreflightPlan();
    assert.equal(plan.approvalId, T7A_APPROVAL_ID);
    assert.equal(plan.bounds.shoppingRequests, 5);
    assert.equal(plan.bounds.offersRequests, "up to 5; only after an exact token selection");
    assert.equal(plan.bounds.physicalAttempts, T7A_MAX_PHYSICAL_ATTEMPTS);
    assert.equal(plan.bounds.retries, 0);
    assert.equal(plan.bounds.fallbacks, 0);
    assert.equal(plan.bounds.replacements, 0);
    assert.equal(plan.bounds.additionalQueries, 0);
    assert.equal(plan.bounds.directPageFetches, 0);
    assert.equal(plan.bounds.openAiCalls, 0);
    assert.equal(plan.bounds.serperCalls, 0);
    assert.equal(plan.passRule.requiredVerifiedOffers, T7A_REQUIRED_VERIFIED_OFFERS);
    assert.equal(plan.passRule.unsafeVerifiedOffersAllowed, 0);
  });

  it("requires exact approval, attempt ceiling, commit, clean tree, and unused evidence path", () => {
    const valid = {
      approvalId: T7A_APPROVAL_ID,
      approvedAttempts: T7A_MAX_PHYSICAL_ATTEMPTS,
      approvedCommit: "abcdef1",
      currentCommit: "abcdef1234567890",
      trackedStatus: "",
      outputExists: false,
    };
    assert.doesNotThrow(() => validateT7aExecution(valid));
    assert.throws(
      () => validateT7aExecution({ ...valid, approvalId: "wrong" }),
      /requires --approval-id/,
    );
    assert.throws(
      () => validateT7aExecution({ ...valid, approvedAttempts: 9 }),
      /requires --approved-attempts=10/,
    );
    assert.throws(
      () => validateT7aExecution({ ...valid, approvedCommit: "1234567" }),
      /does not match/,
    );
    assert.throws(
      () => validateT7aExecution({ ...valid, trackedStatus: " M tracked.ts" }),
      /must be clean/,
    );
    assert.throws(
      () => validateT7aExecution({ ...valid, outputExists: true }),
      /refusing to repeat/,
    );
  });

  it("redacts product tokens while retaining only bounded offer evidence", () => {
    const shopping = sanitizedShoppingPayload({
      shopping_results: [
        {
          position: 1,
          title: "DEWALT DXV12P-QT Wet/Dry Vacuum",
          product_token: "secret-provider-token",
          ignored: "must not persist",
        },
      ],
    });
    const offers = sanitizedOffersPayload({
      product: { title: "DEWALT DXV12P-QT", brand: "DEWALT", ignored: "no" },
      offers: [
        {
          title: "DEWALT DXV12P-QT Wet/Dry Vacuum",
          link:
            "https://merchant.example/dewalt-dxv12p-qt?variant=12-gallon&utm_source=shopping&gclid=opaque",
          price: "$149.00",
          extracted_price: 149,
          availability: "In stock",
          condition: "New",
          merchant: { name: "Merchant", secret: "no" },
          product_token: "another-secret-token",
        },
      ],
    });
    const serialized = JSON.stringify({ shopping, offers });
    assert.doesNotMatch(serialized, /secret-provider-token|another-secret-token|must not persist/);
    assert.match(serialized, /productTokenSha256/);
    assert.match(serialized, /DEWALT DXV12P-QT/);
    assert.match(serialized, /149/);
    assert.match(serialized, /variant=12-gallon/);
    assert.doesNotMatch(serialized, /utm_source|gclid|opaque/);
  });

  it("canonicalizes tracking from verifier URLs without removing product identity", () => {
    const verification = sanitizedOfferVerification({
      disposition: "verified",
      decisions: [
        {
          accepted: true,
          productUrl:
            "https://merchant.example/product?sku=DXV12P-QT&utm_campaign=test&srsltid=opaque",
        },
      ],
      offer: {
        productUrl:
          "https://merchant.example/product?sku=DXV12P-QT&utm_campaign=test&srsltid=opaque",
      },
    });
    const serialized = JSON.stringify(verification);
    assert.match(serialized, /sku=DXV12P-QT/);
    assert.doesNotMatch(serialized, /utm_campaign|srsltid|opaque/);
  });
});

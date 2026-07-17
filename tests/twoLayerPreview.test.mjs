import assert from "node:assert/strict";
import test from "node:test";

import {
  isTwoLayerPreviewAvailable,
  summarizeTwoLayerPreview,
  twoLayerPreviewCards,
  twoLayerPreviewSources,
} from "../lib/twoLayerPreviewData.ts";

test("preview is available only in development", () => {
  assert.equal(isTwoLayerPreviewAvailable("development"), true);
  assert.equal(isTwoLayerPreviewAvailable("production"), false);
  assert.equal(isTwoLayerPreviewAvailable("test"), false);
  assert.equal(isTwoLayerPreviewAvailable(undefined), false);
});

test("controlled cards cover each intended presentation state", () => {
  assert.deepEqual(
    twoLayerPreviewCards.map((card) => card.rank),
    [1, 2, 3],
  );
  assert.deepEqual(
    twoLayerPreviewCards.map((card) => card.recommendationStatus),
    ["Best Match", "Best Match", "Close Match"],
  );

  const summary = summarizeTwoLayerPreview(twoLayerPreviewCards);
  assert.deepEqual(summary, {
    cardCount: 3,
    verifiedCommerceCount: 1,
    unverifiedCommerceCount: 2,
    verifiedIdentityCount: 1,
    closeMatchCount: 1,
  });
});

test("unverified fields fail closed instead of carrying placeholder facts", () => {
  for (const card of twoLayerPreviewCards) {
    assert.match(card.identity.product_name, /^Example /);
    assert.equal(card.image.state, "not_verified");
    assert.equal(card.image.url, null);

    if (card.commerce.state === "not_verified") {
      assert.equal(card.commerce.label, "Check current price");
      assert.equal(card.commerce.priceAmount, null);
      assert.equal(card.commerce.productUrl, null);
      assert.equal(card.commerce.seller, null);
    }
  }
});

test("every displayed source reference resolves to the controlled registry", () => {
  const sourceIds = new Set(twoLayerPreviewSources.map((source) => source.id));
  const referencedSourceIds = twoLayerPreviewCards.flatMap((card) => [
    ...card.assessment.why.sourceIds,
    ...card.assessment.bestFor.sourceIds,
    ...card.assessment.mainTradeoff.sourceIds,
    ...card.pros.flatMap((item) => item.sourceIds),
    ...card.cons.flatMap((item) => item.sourceIds),
    ...card.claims.flatMap((claim) => claim.sourceIds),
  ]);

  assert.ok(referencedSourceIds.length > 0);
  for (const sourceId of referencedSourceIds) {
    assert.equal(sourceIds.has(sourceId), true, `missing source ${sourceId}`);
  }
});

test("reported claims retain their trust class and evidence scope", () => {
  const allowedScopes = new Set([
    "exact_model",
    "family_or_variant",
    "category_or_general",
    "unresolved",
  ]);

  for (const claim of twoLayerPreviewCards.flatMap((card) => card.claims)) {
    assert.equal(claim.trust, "source_reported");
    assert.equal(claim.label, "Source-reported");
    assert.equal(allowedScopes.has(claim.evidenceScope), true);
  }
});

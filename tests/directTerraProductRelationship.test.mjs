import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  verifyDirectTerraAssetCandidates,
} from "../lib/directTerraAssetVerifier.ts";

const corpus = JSON.parse(
  fs.readFileSync(
    new URL(
      "./fixtures/direct-terra-product-relationship-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

describe("Direct-Terra complete-product relationship corpus", () => {
  it("accounts for every tracked adversarial case with the frozen relationship verdict", () => {
    assert.equal(
      corpus.schemaVersion,
      "direct-terra-product-relationship-corpus-v1",
    );
    assert.equal(corpus.sanitized, true);
    assert.ok(corpus.cases.length >= 20);

    for (const testCase of corpus.cases) {
      const verification = verifyDirectTerraAssetCandidates({
        target: testCase.target,
        candidates: [testCase.candidate],
      });
      const decision = verification.decisions[0];
      assert.ok(decision, testCase.id);
      assert.equal(
        decision.relationship,
        testCase.expectedRelationship,
        testCase.id,
      );
      assert.equal(
        decision.productUrlAccepted,
        testCase.productUrlAccepted,
        testCase.id,
      );
      assert.equal(
        decision.imageUrlAccepted,
        testCase.imageUrlAccepted,
        testCase.id,
      );
    }
  });

  it("allows assets only from complete products or bundles", () => {
    for (const testCase of corpus.cases) {
      const decision = verifyDirectTerraAssetCandidates({
        target: testCase.target,
        candidates: [testCase.candidate],
      }).decisions[0];
      if (decision.productUrlAccepted || decision.imageUrlAccepted) {
        assert.ok(
          decision.relationship === "complete_product" ||
            decision.relationship === "bundle_including_product",
          testCase.id,
        );
      }
    }
  });
});

describe("generated complete-product safety mutations", () => {
  const seeds = [
    {
      target: {
        key: "drill-dcd800",
        rank: 1,
        productName: "DEWALT DCD800 Cordless Drill",
        brand: "DEWALT",
        model: "DCD800",
        category: "cordless drill",
      },
      title: "DEWALT DCD800 Cordless Drill",
      siblingTitle: "DEWALT DCD801 Cordless Drill",
      slug: "dewalt-dcd800-cordless-drill",
    },
    {
      target: {
        key: "vac-hd1600",
        rank: 1,
        productName: "RIDGID HD1600 Wet/Dry Shop Vacuum",
        brand: "RIDGID",
        model: "HD1600",
        category: "shop vacuum",
      },
      title: "RIDGID HD1600 Wet/Dry Shop Vacuum",
      siblingTitle: "RIDGID HD1601 Wet/Dry Shop Vacuum",
      slug: "ridgid-hd1600-wet-dry-shop-vacuum",
    },
    {
      target: {
        key: "robot-q7",
        rank: 1,
        productName: "Roborock Q7 Robot Vacuum",
        brand: "Roborock",
        model: "Q7",
        category: "robot vacuum",
      },
      title: "Roborock Q7 Robot Vacuum",
      siblingTitle: "Roborock Q70 Robot Vacuum",
      slug: "roborock-q7-robot-vacuum",
    },
  ];

  for (const seed of seeds) {
    it(`rejects compatibility, sibling, and editorial mutations of ${seed.target.key}`, () => {
      const valid = verifyDirectTerraAssetCandidates({
        target: seed.target,
        candidates: [
          {
            title: seed.title,
            productUrl: `https://www.lowes.com/pd/${seed.slug}/5015000000`,
          },
        ],
      }).decisions[0];
      const compatibility = verifyDirectTerraAssetCandidates({
        target: seed.target,
        candidates: [
          {
            title: `Replacement battery compatible with ${seed.title}`,
            productUrl: `https://www.lowes.com/pd/replacement-battery-for-${seed.slug}/5015000001`,
          },
        ],
      }).decisions[0];
      const complementBeforeFor = verifyDirectTerraAssetCandidates({
        target: seed.target,
        candidates: [
          {
            title: `Battery for ${seed.title}`,
            productUrl: `https://www.lowes.com/pd/battery-for-${seed.slug}/5015000004`,
          },
        ],
      }).decisions[0];
      const sibling = verifyDirectTerraAssetCandidates({
        target: seed.target,
        candidates: [
          {
            title: seed.siblingTitle,
            productUrl: `https://www.lowes.com/pd/${seed.siblingTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}/5015000002`,
          },
        ],
      }).decisions[0];
      const editorial = verifyDirectTerraAssetCandidates({
        target: seed.target,
        candidates: [
          {
            title: `Review: ${seed.title}`,
            productUrl: `https://reviews.example.com/${seed.slug}`,
          },
        ],
      }).decisions[0];

      assert.equal(valid.relationship, "complete_product");
      assert.equal(valid.productUrlAccepted, true);
      assert.equal(compatibility.relationship, "accessory_or_replacement");
      assert.equal(compatibility.productUrlAccepted, false);
      assert.equal(
        complementBeforeFor.relationship,
        "accessory_or_replacement",
      );
      assert.equal(complementBeforeFor.productUrlAccepted, false);
      assert.equal(sibling.relationship, "different_product");
      assert.equal(sibling.productUrlAccepted, false);
      assert.equal(editorial.relationship, "non_product_page");
      assert.equal(editorial.productUrlAccepted, false);
    });
  }
});

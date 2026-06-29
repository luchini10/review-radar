import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyProductEvidenceIdentity,
  productEvidenceIdentityTestExports,
} from "../lib/productEvidenceIdentity.ts";

describe("product evidence identity", () => {
  it("classifies family pages as generic secondary evidence", () => {
    assert.equal(
      classifyProductEvidenceIdentity({
        category: "dog food",
        productName:
          "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
        sourceTitle: "Purina Pro Plan Dog Food: Wet & Dry Dog Food | Chewy",
        url: "https://www.chewy.com/brands/purina-pro-plan-dog-food-7437",
      }),
      "generic_evidence",
    );
  });

  it("detects food recipe, supplement flavor, cosmetic shade, and model conflicts", () => {
    const cases = [
      {
        category: "dog food",
        productName: "Example Chicken & Rice Dry Dog Food",
        sourceTitle: "Example Salmon & Rice Dry Dog Food",
        url: "https://store.example.com/example-salmon/dp/1",
      },
      {
        category: "dog food",
        productName: "Example Adult Chicken & Brown Rice Dry Dog Food",
        sourceTitle: "Example Small Breed Puppy Chicken & Oatmeal Dry Dog Food",
        url: "https://store.example.com/example-puppy-oatmeal/dp/6",
      },
      {
        category: "protein powder",
        productName: "Example Whey Protein Vanilla",
        sourceTitle: "Example Whey Protein Chocolate",
        url: "https://store.example.com/example-chocolate/dp/2",
      },
      {
        category: "lipstick",
        productName: "Example Satin Lipstick Ruby Red",
        sourceTitle: "Example Satin Lipstick Rose Pink",
        url: "https://store.example.com/example-rose-pink/dp/3",
      },
      {
        category: "television",
        productName: "Samsung QN90D 65-inch Neo QLED TV",
        sourceTitle: "Samsung QN85D 65-inch Neo QLED TV",
        url: "https://store.example.com/samsung-qn85d/dp/4",
      },
    ];

    for (const input of cases) {
      assert.equal(
        classifyProductEvidenceIdentity(input),
        "conflicting_product",
      );
    }
  });

  it("keeps exact products and safe package-size variants", () => {
    assert.equal(
      classifyProductEvidenceIdentity({
        category: "dog food",
        productName: "Example Chicken & Rice Dry Dog Food",
        sourceTitle: "Example Chicken & Rice Dry Dog Food, 12-lb bag",
        url: "https://store.example.com/example-chicken-rice/dp/5",
      }),
      "same_product",
    );
  });

  it("does not invent a conflict when variant evidence is absent", () => {
    assert.equal(
      productEvidenceIdentityTestExports.hasExplicitVariantConflict(
        "Example Broad Daily Supplement",
        "Example Broad Daily Supplement official information",
        "supplement",
      ),
      false,
    );
  });
});

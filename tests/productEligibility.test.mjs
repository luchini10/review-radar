import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductEligibility } from "../lib/productEligibility.ts";

function classify(overrides = {}) {
  return classifyProductEligibility({
    imageUrl: "https://example.com/image.jpg",
    name: "Example Product 123",
    price: 199,
    productName: "Example Product 123",
    sourceTitle: "Example Product 123",
    url: "https://www.example.com/products/example-product-123",
    ...overrides,
  });
}

describe("shared product eligibility classifier", () => {
  it("allows known product-detail URL patterns", () => {
    const nike = classify({
      name: "Nike G.T. Cut Academy Basketball Shoes",
      sourceTitle: "Nike G.T. Cut Academy Basketball Shoes",
      url: "https://www.nike.com/t/gt-cut-academy-basketball-shoes-HWCFvAob",
    });

    assert.equal(nike.canRenderAsProductCard, true);
    assert.equal(nike.status, "buyable_product");
  });

  it("rejects category and search pages even from trusted stores", () => {
    const nikeCategory = classify({
      name: "Basketball Shoes - Nike",
      sourceTitle: "Basketball Shoes - Nike",
      url: "https://www.nike.com/w/mens-basketball-shoes-3glsmznik1zy7ok",
    });
    const homeDepotCategory = classify({
      name: "Garden Hoses - The Home Depot",
      sourceTitle: "Garden Hoses - The Home Depot",
      url: "https://www.homedepot.com/b/Outdoors-Garden-Center-Watering-Irrigation-Garden-Hoses/N-5yc1vZbx4e",
    });

    assert.equal(nikeCategory.canRenderAsProductCard, false);
    assert.equal(nikeCategory.status, "listing_or_search");
    assert.equal(homeDepotCategory.canRenderAsProductCard, false);
    assert.equal(homeDepotCategory.status, "listing_or_search");
  });

  it("keeps evidence pages useful as evidence but not product cards", () => {
    const reddit = classify({
      name: "Best running shoes discussion",
      sourceTitle: "Best running shoes discussion - Reddit",
      url: "https://www.reddit.com/r/RunningShoeGeeks/comments/example/",
    });
    const review = classify({
      name: "Best basketball shoes",
      sourceTitle: "The 8 Best Basketball Shoes of 2026",
      url: "https://www.runnersworld.com/gear/a123/best-basketball-shoes/",
    });

    assert.equal(reddit.canRenderAsProductCard, false);
    assert.equal(reddit.canUseAsEvidence, true);
    assert.equal(review.canRenderAsProductCard, false);
    assert.equal(review.canUseAsEvidence, true);
  });

  it("rejects app errors, support pages, and complaint-style pages", () => {
    const appError = classify({
      name: "Application error: a client-side exception has occurred",
      sourceTitle: "Application error: a client-side exception has occurred",
      url: "https://www.example.com/product/error",
    });
    const complaint = classify({
      name: "Complaints about Example Product 123",
      sourceTitle: "Customer complaints about Example Product 123",
      url: "https://www.example.com/product/example-product-123",
    });

    assert.equal(appError.canRenderAsProductCard, false);
    assert.equal(appError.status, "non_product");
    assert.equal(complaint.canRenderAsProductCard, false);
    assert.equal(complaint.status, "non_product");
  });

  it("rejects manual and quick-start guide pages as product cards", () => {
    const quickStart = classify({
      name: "Quick Start Guide: KCO211 Countertop Oven - KitchenAid",
      sourceTitle: "Quick Start Guide: KCO211 Countertop Oven - KitchenAid",
      url: "https://www.kitchenaid.com/service-and-support/manuals/kco211-countertop-oven.html",
    });
    const manual = classify({
      name: "User Manual for Example Blender 5000",
      sourceTitle: "User Manual for Example Blender 5000",
      url: "https://www.example.com/products/example-blender-5000",
    });

    assert.equal(quickStart.canRenderAsProductCard, false);
    assert.equal(quickStart.canUseAsEvidence, true);
    assert.equal(manual.canRenderAsProductCard, false);
    assert.equal(manual.status, "non_product");
  });

  it("does not reject Article furniture product pages because of the brand domain", () => {
    const articleProduct = classify({
      name: "Article Sven Sofa",
      sourceTitle: "Article Sven Sofa",
      url: "https://www.article.com/product/12345/sven-sofa",
    });

    assert.equal(articleProduct.canRenderAsProductCard, true);
    assert.notEqual(articleProduct.status, "evidence_only");
  });
});

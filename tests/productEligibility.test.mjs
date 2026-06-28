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

  it("rejects generic manufacturer product-family collections across hosts", () => {
    const mhp = classify({
      category: "gas grill",
      imageUrl: null,
      name: "Gas Outdoor BBQ Grills Made in the USA - MHP Grills",
      price: null,
      sourceTitle: "Gas Outdoor BBQ Grills Made in the USA - MHP Grills",
      url: "https://mhpgrills.com/products/grills",
    });
    const daikin = classify({
      category: "air purifier",
      imageUrl: null,
      name: "Air Purifiers, Ventilators & Monitors for Clean Air - Daikin Comfort",
      price: null,
      sourceTitle:
        "Air Purifiers, Ventilators & Monitors for Clean Air - Daikin Comfort",
      url: "https://daikincomfort.com/products/indoor-air-quality",
    });
    const champion = classify({
      category: "portable generator",
      imageUrl: null,
      name: "Portable Generators for RV, Home, and Projects",
      price: null,
      sourceTitle: "Portable Generators for RV, Home, and Projects",
      url:
        "https://www.championpowerequipment.com/products/generators/portable-generators/",
    });
    const briggs = classify({
      category: "portable generator",
      imageUrl: null,
      name: "Portable Generators - Briggs & Stratton",
      price: null,
      sourceTitle: "Portable Power for Home, Work & Play | Briggs & Stratton",
      url:
        "https://www.briggsandstratton.com/en-us/products/portable-generators",
    });

    for (const result of [mhp, daikin, champion, briggs]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.status, "listing_or_search");
    }
  });

  it("rejects support, learning-center, and retailer advice pages as product cards", () => {
    const bissell = classify({
      category: "shop vac",
      name: "Garage Pro Wet/Dry Vac | No / Low Suction - BISSELL Support",
      sourceTitle:
        "Garage Pro Wet/Dry Vac | No / Low Suction - BISSELL Support",
      snippet: "Supports this product candidate's listing metadata from search results.",
      url: "https://support.bissell.com/app/answers/detail/a_id/1234/no-low-suction",
    });
    const bestBuy = classify({
      category: "pressure washer",
      name: "Are Power Washers and Pressure Washers Different? - Best Buy",
      sourceTitle:
        "Are Power Washers and Pressure Washers Different? - Best Buy",
      snippet: "Supports this product candidate's listing metadata from search results.",
      url:
        "https://www.bestbuy.com/discover-learn/are-power-washers-and-pressure-washers-different/pcmcat1687983764520",
    });
    const petsmart = classify({
      category: "dog food",
      name: "Limited Ingredient Dog Food Diets | PetSmart",
      sourceTitle: "Limited Ingredient Dog Food Diets | PetSmart",
      snippet: "Supports this product candidate's listing metadata from search results.",
      url:
        "https://www.petsmart.com/learning-center/dog-care/put-a-lid-on-it/A0289.html",
    });
    const shopVac = classify({
      category: "shop vac",
      name: "New Customer Service | Shop-Vac Store",
      sourceTitle: "New Customer Service | Shop-Vac Store",
      snippet: "Contact and support information for Shop-Vac customers.",
      url: "https://www.shopvac.com/pages/customer-service",
    });

    for (const result of [bissell, bestBuy, petsmart, shopVac]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.canUseAsEvidence, true);
    }
  });

  it("rejects documentation mirrors even when the title contains a model", () => {
    const deviceReport = classify({
      category: "air purifier",
      name: "H7123 - Smart Pet Air Purifier - device.report",
      sourceTitle: "H7123 - Smart Pet Air Purifier - device.report",
      snippet: "Supports this product candidate's listing metadata from search results.",
      url: "https://device.report/govee/h7123",
    });
    const manualsLibrary = classify({
      category: "toaster oven",
      name: "Breville BOV845BSS Smart Oven User Guide",
      sourceTitle: "Breville BOV845BSS Smart Oven User Guide",
      snippet: "Documentation and device information for model BOV845BSS.",
      url: "https://manualslib.example/breville/bov845bss",
    });

    for (const result of [deviceReport, manualsLibrary]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.canUseAsEvidence, true);
    }
  });

  it("preserves specific manufacturer and retailer product-detail pages", () => {
    const manufacturer = classify({
      category: "coffee maker",
      name: "AeroPress Coffee Maker - Original",
      sourceTitle: "AeroPress Coffee Maker - Original",
      url: "https://aeropress.com/products/aeropress-coffee-maker",
    });
    const bestBuyLegacy = classify({
      category: "robot vacuum",
      name: "Shark Matrix Self-Emptying Robot Vacuum RV2310AE",
      sourceTitle: "Shark Matrix Self-Emptying Robot Vacuum RV2310AE",
      url:
        "https://www.bestbuy.com/site/shark-matrix-self-emptying-robot-vacuum/6542043.p",
    });
    const bestBuyModern = classify({
      category: "gaming monitor",
      name: "Gigabyte M27Q 27-inch Gaming Monitor",
      sourceTitle: "Gigabyte M27Q 27-inch Gaming Monitor",
      url:
        "https://www.bestbuy.com/product/gigabyte-m27q-27-inch-gaming-monitor/J3ZW92F97X/sku/10467600",
    });

    for (const result of [manufacturer, bestBuyLegacy, bestBuyModern]) {
      assert.equal(result.canRenderAsProductCard, true);
    }
  });

  it("keeps Google search and Shopping offer URLs out of product cards", () => {
    const ordinarySearch = classify({
      name: "DEWALT DXV10SB Wet/Dry Vacuum",
      sourceTitle: "DEWALT DXV10SB Wet/Dry Vacuum",
      url: "https://www.google.com/search?q=DEWALT+DXV10SB",
    });
    const shoppingOffer = classify({
      name: "DEWALT DXV10SB Wet/Dry Vacuum",
      sourceTitle: "DEWALT DXV10SB Wet/Dry Vacuum",
      url:
        "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
    });

    assert.equal(ordinarySearch.canRenderAsProductCard, false);
    assert.equal(shoppingOffer.canRenderAsProductCard, false);
  });

  it("rejects marketplace browse pages that look like best-product collections", () => {
    const ebayBrowsePage = classify({
      name: "Best Craftsman Wet & Dry Vacuum Cleaners - eBay",
      sourceTitle: "Best Craftsman Wet & Dry Vacuum Cleaners - eBay",
      url: "https://www.ebay.com/t/Craftsman-Wet-Dry-Vacuum-Cleaners/184337/bn_91238194",
    });

    assert.equal(ebayBrowsePage.canRenderAsProductCard, false);
    assert.equal(ebayBrowsePage.status, "listing_or_search");
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

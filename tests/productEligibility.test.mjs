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

  it("rejects nested catalog, department, browse, and faceted listing pages", () => {
    const bestBuyCatalog = classify({
      category: "pressure washer",
      name: "Pressure Washers - Best Buy",
      sourceTitle: "Pressure Washers - Best Buy",
      url:
        "https://www.bestbuy.com/site/outdoor-power-equipment/pressure-washers/pcmcat1597940389709.c?id=pcmcat1597940389709",
    });
    const retailerDepartment = classify({
      category: "pressure washer",
      name: "Pressure Washers - Example Retailer",
      sourceTitle: "Pressure Washers - Example Retailer",
      url:
        "https://retailer.example.com/departments/outdoor-power/pressure-washers",
    });
    const retailerBrowse = classify({
      category: "pressure washer",
      name: "Browse Pressure Washers",
      sourceTitle: "Browse Pressure Washers",
      url: "https://shop.example.com/browse/outdoor/pressure-washers",
    });
    const facetedListing = classify({
      category: "pressure washer",
      name: "Pressure Washers - Example Store",
      sourceTitle: "Pressure Washers - Example Store",
      url:
        "https://store.example.com/outdoor/pressure-washers?facet=brand&filter=electric",
    });

    for (const result of [
      bestBuyCatalog,
      retailerDepartment,
      retailerBrowse,
      facetedListing,
    ]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.status, "listing_or_search");
    }
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

  it("rejects opaque manufacturer collection routes before product-looking shortcuts", () => {
    const boschCollection = classify({
      category: "shop vac",
      imageUrl:
        "https://www.bosch-pt.com.au/binary/ocsmedia/optimized/full/wet-dry-extractors.png",
      name: "Wet/dry extractors Dust extraction systems - Bosch Professional",
      price: 499,
      sourceTitle:
        "Wet/dry extractors Dust extraction systems - Bosch Professional",
      sourceType: "primary",
      url:
        "https://www.bosch-pt.com.au/au/en/wet-dry-extractors-2549705-ocs-c/",
    });
    const unrelatedProductRange = classify({
      category: "air purifier",
      imageUrl: "https://manufacturer.example.com/images/air-purifier-range.jpg",
      name: "Air purifiers Indoor air quality systems - Example Professional",
      price: 299,
      sourceTitle:
        "Air purifiers Indoor air quality systems - Example Professional",
      sourceType: "primary",
      url:
        "https://manufacturer.example.com/en/air-purifiers-834712-product-range/",
    });

    for (const result of [boschCollection, unrelatedProductRange]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.status, "listing_or_search");
    }
  });

  it("rejects retailer brand and family routes even when their slugs contain numeric IDs", () => {
    const chewyBrand = classify({
      category: "dog food",
      name: "Purina Pro Plan Adult Sensitive Skin & Stomach Salmon Dog Food",
      sourceTitle: "Purina Pro Plan Dog Food: Wet & Dry Dog Food | Chewy",
      url: "https://www.chewy.com/brands/purina-pro-plan-dog-food-7437",
    });
    const unrelatedRetailerBrand = classify({
      category: "protein powder",
      name: "Example Nutrition Vanilla Whey Protein",
      sourceTitle: "Example Nutrition Protein Products",
      url: "https://www.petco.example/brand/example-nutrition-protein-8421",
    });

    for (const result of [chewyBrand, unrelatedRetailerBrand]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.status, "listing_or_search");
    }
  });

  it("preserves specific retailer product-detail routes across stores", () => {
    const chewyProduct = classify({
      category: "dog food",
      name: "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
      sourceTitle:
        "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
      url: "https://www.chewy.com/purina-pro-plan-sensitive-skin/dp/123456",
    });
    const walmartProduct = classify({
      category: "dog food",
      name: "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
      sourceTitle:
        "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
      url: "https://www.walmart.com/ip/Purina-Pro-Plan-Sensitive-Skin-Salmon/987654321",
    });

    assert.equal(chewyProduct.canRenderAsProductCard, true);
    assert.equal(walmartProduct.canRenderAsProductCard, true);
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

  it("rejects RR-078 embedded customer-service and dated editorial routes", () => {
    const customerService = classify({
      category: "shop vac",
      name: "New Customer Service | Shop-Vac Store",
      sourceTitle: "New Customer Service | Shop-Vac Store",
      snippet: "Contact and support information for customers.",
      url: "https://www.shopvac.com/pages/new-customer-service-2",
    });
    const datedArticle = classify({
      category: "robot vacuum",
      name: "Roborock Q7 Max Vacuum with Auto Empty Dock Day 5",
      sourceTitle: "Roborock Q7 Max Vacuum with Auto Empty Dock Day 5",
      snippet: "Long-term observations about setup and daily use.",
      url:
        "https://pocketables.com/2022/05/roborock-q7-max-vacuum-with-auto-empty-dock-day-5.html",
    });

    for (const result of [customerService, datedArticle]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.canUseAsEvidence, true);
      assert.equal(result.status, "evidence_only");
    }
  });

  it("rejects RR-078 editorial index titles on product-looking routes", () => {
    const editorialIndex = classify({
      category: "robot vacuum",
      name: "Tapo RV30 Max Information, Specification, News & More",
      sourceTitle: "Tapo RV30 Max Information, Specification, News & More",
      snippet: "Product news, specifications, and related coverage.",
      url: "https://www.matteralpha.com/tapo/rv30-max-p2371",
    });
    const legitimateProductInformation = classify({
      category: "robot vacuum",
      name: "Tapo RV30 Max Robot Vacuum and Mop",
      sourceTitle: "Tapo RV30 Max Product Information and Specifications",
      snippet: "Manufacturer product page with current price and availability.",
      url: "https://manufacturer.example.com/products/tapo-rv30-max",
    });

    assert.equal(editorialIndex.canRenderAsProductCard, false);
    assert.equal(editorialIndex.canUseAsEvidence, true);
    assert.equal(legitimateProductInformation.canRenderAsProductCard, true);
  });

  it("preserves model-specific product pages that use a /pages/ route", () => {
    const product = classify({
      category: "cordless drill",
      name: "Example X100 Cordless Drill Kit",
      sourceTitle: "Example X100 Cordless Drill Kit",
      url: "https://manufacturer.example.com/pages/example-x100-cordless-drill-kit",
    });

    assert.equal(product.canRenderAsProductCard, true);
    assert.notEqual(product.status, "evidence_only");

    const datedCommerceRoute = classify({
      category: "cordless drill",
      name: "Example X100 Cordless Drill Kit",
      sourceTitle: "Example X100 Cordless Drill Kit",
      url:
        "https://manufacturer.example.com/2025/06/products/example-x100-cordless-drill-kit",
    });

    assert.equal(datedCommerceRoute.canRenderAsProductCard, true);
    assert.notEqual(datedCommerceRoute.status, "evidence_only");
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

  it("preserves a model-specific Bosch manufacturer product page", () => {
    const boschProduct = classify({
      category: "shop vac",
      imageUrl: "https://www.boschtools.com/images/gas18v-3n.jpg",
      name: "Bosch GAS18V-3N 18V Cordless Wet/Dry Vacuum",
      price: 179,
      sourceTitle: "GAS18V-3N 18V Vacuum Cleaners - Bosch Power Tools",
      url:
        "https://www.boschtools.com/us/en/products/gas18v-3n-06019c62d1",
    });

    assert.equal(boschProduct.canRenderAsProductCard, true);
    assert.equal(boschProduct.status, "buyable_product");
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

  it("rejects question-style articles and hosted publishing pages with product-like paths", () => {
    const dogFoodArticle = classify({
      category: "dog food",
      name: "Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets",
      sourceTitle: "Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets",
      url: "https://thebkpets.substack.com/p/is-costco-kirkland-dog-food-actually",
    });
    const unrelatedQuestionArticle = classify({
      category: "robot vacuum",
      name: "Should You Buy This Robot Vacuum? - Home Tech Journal",
      sourceTitle: "Should You Buy This Robot Vacuum? - Home Tech Journal",
      url: "https://home-tech.example.com/p/should-you-buy-this-robot-vacuum",
    });
    const hostedPublishingPage = classify({
      category: "coffee maker",
      name: "Our Long-Term Verdict on the Example Espresso Pro",
      sourceTitle: "Our Long-Term Verdict on the Example Espresso Pro",
      url: "https://examplewriter.medium.com/p/example-espresso-pro-verdict",
    });

    for (const result of [
      dogFoodArticle,
      unrelatedQuestionArticle,
      hostedPublishingPage,
    ]) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.canUseAsEvidence, true);
    }
  });

  it("rejects the reopened electric-toothbrush category and editorial page shapes", () => {
    const cases = [
      classify({
        category: "electric toothbrush",
        name: "Electric Toothbrushes - Twin Packs and Bundles - Page 1 - Oral-B",
        sourceTitle:
          "Electric Toothbrushes - Twin Packs and Bundles - Page 1 - Oral-B",
        url:
          "https://oralb.com/en-us/products/electric-toothbrushes/twin-packs-and-bundles/",
      }),
      classify({
        category: "electric toothbrush",
        name: "ISO 20127:2020—Powered Toothbrushes - The ANSI Blog",
        sourceTitle: "ISO 20127:2020—Powered Toothbrushes - The ANSI Blog",
        url:
          "https://blog.ansi.org/iso-20127-2020-powered-toothbrushes/",
      }),
      classify({
        category: "electric toothbrush",
        name: "Oral-B iO Series comparison (chart included) - Electric Teeth",
        sourceTitle:
          "Oral-B iO Series comparison (chart included) - Electric Teeth",
        url:
          "https://www.electricteeth.com/oral-b-io-series-comparison/",
      }),
      classify({
        category: "electric toothbrush",
        name:
          "Colgate-Palmolive Launches hum by Colgate: The New Smart Electric Toothbrush",
        sourceTitle:
          "Colgate-Palmolive Launches hum by Colgate: The New Smart Electric Toothbrush",
        url:
          "https://www.multivu.com/players/English/8761151-colgate-hum-smart-electric-toothbrush",
      }),
    ];

    for (const result of cases) {
      assert.equal(result.canRenderAsProductCard, false);
      assert.equal(result.canUseAsEvidence, true);
    }
  });

  it("keeps specific electric-toothbrush product pages card-eligible", () => {
    const oralB = classify({
      category: "electric toothbrush",
      name: "Oral-B iO Series 7 Electric Toothbrush",
      sourceTitle: "Oral-B iO Series 7 Electric Toothbrush",
      url:
        "https://oralb.com/en-us/products/electric-toothbrushes/oral-b-io-series-7-electric-toothbrush-white-alabaster/",
    });
    const sonicare = classify({
      category: "electric toothbrush",
      name: "Philips Sonicare DiamondClean 9000 Rechargeable Toothbrush HX9912/95",
      sourceTitle:
        "Philips Sonicare DiamondClean 9000 Rechargeable Toothbrush HX9912/95",
      url:
        "https://www.usa.philips.com/p-p/HX9912_95/diamondclean-9000-rechargeable-sonic-toothbrush",
    });

    assert.equal(oralB.canRenderAsProductCard, true);
    assert.equal(sonicare.canRenderAsProductCard, true);
  });

  it("preserves genuine commerce and manufacturer product routes that use /p/", () => {
    const targetProduct = classify({
      category: "coffee maker",
      name: "Ninja Luxe Cafe Premier Espresso Machine ES601",
      sourceTitle: "Ninja Luxe Cafe Premier Espresso Machine ES601",
      url: "https://www.target.com/p/ninja-luxe-cafe-premier-espresso-machine-es601/-/A-91730000",
    });
    const manufacturerProduct = classify({
      category: "cordless drill",
      name: "Example X100 Cordless Drill",
      sourceTitle: "Example X100 Cordless Drill",
      url: "https://manufacturer.example.com/p/example-x100-cordless-drill",
    });

    assert.equal(targetProduct.canRenderAsProductCard, true);
    assert.equal(manufacturerProduct.canRenderAsProductCard, true);
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

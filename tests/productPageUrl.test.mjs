import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getProductPageLink,
  prioritizeProductPageUrlsInResult,
} from "../lib/productPageUrl.ts";

const verifiedAt = "2026-06-11T00:00:00.000Z";

function field(value, sourceUrl, sourceType = "retailer_page", confidence = "High") {
  return {
    confidence,
    sourceType,
    sourceUrl,
    value,
    verifiedAt,
  };
}

function offer(url, retailer = "Best Buy") {
  return {
    availability: field("In stock", url),
    price: field(499, url),
    priceCurrency: field("USD", url),
    retailer,
    url,
  };
}

function buildProduct(overrides = {}) {
  return {
    best_for: "People comparing mocked product links.",
    category: "Tablet",
    citations: [
      {
        title: "Retailer product page",
        url: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
        what_it_supports: "Retailer listing.",
      },
    ],
    common_complaints: [],
    confidence_score: 82,
    cons: ["Mocked tradeoff."],
    estimated_price_range: "$499 to $799",
    metadata: {
      brand: field("Apple", "https://www.bestbuy.com/site/apple-ipad-pro/123.p"),
      offers: [offer("https://www.bestbuy.com/site/apple-ipad-pro/123.p")],
    },
    name: "Apple iPad Pro",
    not_for: ["People who need a laptop."],
    price_value_verdict: "Mocked value verdict.",
    product_image_url: "",
    product_page_url: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
    pros: ["Mocked strength."],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended: "Mocked recommendation.",
    ...overrides,
  };
}

function buildResult(product) {
  return {
    assumptions: [],
    exactMatches: [product],
    final_buying_advice: "Mocked advice.",
    nearMatches: [],
    premiumAboveBudget: [],
    recommendations: [product],
    search_summary: "Mocked result.",
    what_to_avoid: [],
  };
}

describe("product page URL selection", () => {
  it("uses an official brand URL before a retailer URL", () => {
    const officialUrl = "https://www.apple.com/ipad-pro/";
    const product = buildProduct({
      metadata: {
        brand: field("Apple", officialUrl, "manufacturer_page"),
        canonicalUrl: field(officialUrl, officialUrl, "manufacturer_page"),
        offers: [offer("https://www.bestbuy.com/site/apple-ipad-pro/123.p")],
        title: field("Apple iPad Pro", officialUrl, "manufacturer_page"),
      },
    });
    const link = getProductPageLink(product);
    const result = prioritizeProductPageUrlsInResult(buildResult(product));

    assert.equal(link?.url, officialUrl);
    assert.equal(link?.type, "official");
    assert.equal(link?.label, "View Official Product Page");
    assert.equal(result.recommendations[0].product_page_url, officialUrl);
    assert.equal(result.exactMatches[0].product_page_url, officialUrl);
  });

  it("uses a reputable retailer URL when no official URL is available", () => {
    const retailerUrl = "https://www.bestbuy.com/site/apple-ipad-pro/123.p";
    const link = getProductPageLink(buildProduct());

    assert.equal(link?.url, retailerUrl);
    assert.equal(link?.type, "retailer");
    assert.equal(link?.label, "View Retailer Page");
  });

  it("RR-086 rejects a wrong-brand retailer page that overlaps only on category and capacity", () => {
    const wrongUrl =
      "https://www.homedepot.com/p/Karcher-12-Gallon-Wet-Dry-Shop-Vacuum/111111";
    const link = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "Karcher 12 Gallon Wet Dry Shop Vacuum",
            url: wrongUrl,
            what_it_supports: "Captured retailer result.",
          },
        ],
        metadata: {
          brand: field("RIDGID", wrongUrl),
          offers: [],
        },
        name: "RIDGID 12 Gallon Wet/Dry Shop Vacuum",
        product_page_url: "",
      }),
    );
    const noMetadataBrand = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "Karcher 12 Gallon Wet Dry Shop Vacuum",
            url: wrongUrl,
            what_it_supports: "Captured retailer result.",
          },
        ],
        metadata: { offers: [] },
        name: "RIDGID 12 Gallon Wet/Dry Shop Vacuum",
        product_page_url: "",
      }),
    );
    const wrongSpec = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "5 Gallon 5.5 PHP HangUp Wet Dry Vac",
            url: "https://shopvac.com/products/5-gallon-5-5-php-wall-mount-wet-dry-vac",
            what_it_supports: "A different capacity product.",
          },
        ],
        metadata: { offers: [] },
        name: "Shop Vac 10 Gallon 6.0 PHP Wet Dry Vac",
        product_page_url: "",
      }),
    );
    const splitModelConflict = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "Karcher WD 3 Corded Wet/Dry Vacuum",
            url: "https://target.com/p/k-rcher-wet-and-dry-vacuum-cleaner-wd-3/-/A-93812988",
            what_it_supports: "A different split-token model.",
          },
        ],
        metadata: { offers: [] },
        name: "CRAFTSMAN 12 Gallon Wet/Dry Corded Vacuum",
        product_page_url: "",
      }),
    );

    assert.equal(link, null);
    assert.equal(noMetadataBrand, null);
    assert.equal(wrongSpec, null);
    assert.equal(splitModelConflict, null);
  });

  it("preserves same-brand cross-retailer pages and source titles that safely omit the brand", () => {
    const ridgidUrl =
      "https://www.homedepot.com/p/RIDGID-12-Gallon-Wet-Dry-Shop-Vacuum/222222";
    const ridgid = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "RIDGID 12 Gallon Wet Dry Shop Vacuum",
            url: ridgidUrl,
            what_it_supports: "Captured retailer result.",
          },
        ],
        metadata: {
          brand: field("RIDGID", ridgidUrl),
          offers: [],
        },
        name: "RIDGID 12 Gallon Wet/Dry Shop Vacuum",
        product_page_url: "",
      }),
    );
    const ipadUrl = "https://www.bestbuy.com/site/ipad-pro-13-inch-m4/999.p";
    const ipad = getProductPageLink(
      buildProduct({
        citations: [
          {
            title: "iPad Pro 13-inch M4",
            url: ipadUrl,
            what_it_supports: "Captured retailer result.",
          },
        ],
        metadata: {
          brand: field("Apple", ipadUrl),
          offers: [],
        },
        name: "Apple iPad Pro 13-inch M4",
        product_page_url: "",
      }),
    );
    const armorAllUrl =
      "https://vacmaster.com/armor-all/2-5-gallon-2-peak-hp-wet-dry-vac/";
    const armorAll = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "2.5-Gallon 2 Peak HP Wet/Dry Vac - Vacmaster",
            url: armorAllUrl,
            what_it_supports: "Manufacturer product page with a sparse title.",
          },
        ],
        metadata: { offers: [] },
        name: "Armor All 2.5 Gallon 2 Peak HP Wet Dry Vacuum VOM205P 0901",
        product_page_url: "",
      }),
    );
    const shopVacUrl =
      "https://shopvac.com/products/5-gallon-5-5-php-wall-mount-wet-dry-vac";
    const shopVac = getProductPageLink(
      buildProduct({
        category: "shop vac",
        citations: [
          {
            title: "5 Gallon 5.5 PHP HangUp Wet Dry Vac",
            url: shopVacUrl,
            what_it_supports: "Official product page with a sparse title.",
          },
        ],
        metadata: { offers: [] },
        name: "Shop Vac 5 Gallon 5.5 PHP HangUp Wet/Dry Vacuum",
        product_page_url: "",
      }),
    );

    assert.equal(ridgid?.url, ridgidUrl);
    assert.equal(ipad?.url, ipadUrl);
    assert.equal(armorAll?.url, armorAllUrl);
    assert.equal(shopVac?.url, shopVacUrl);
  });

  it("does not choose trusted retailer category pages as product pages", () => {
    const productUrl = "https://www.silonn.com/products/countertop-nugget-ice-maker";
    const categoryUrl =
      "https://www.walmart.com/browse/home/nugget-ice-makers/4044_90548_6828819_4192417_9849118";
    const link = getProductPageLink(
      buildProduct({
        category: "Countertop nugget ice maker",
        citations: [
          {
            title: "Nugget Ice Makers - Walmart.com",
            url: categoryUrl,
            what_it_supports: "Category page for many nugget ice makers.",
          },
          {
            title: "Countertop Nugget Ice Maker (33 Lbs) - Silonn",
            url: productUrl,
            what_it_supports: "Specific product page.",
          },
        ],
        metadata: {
          brand: field("Silonn", productUrl, "manufacturer_page"),
          canonicalUrl: field(productUrl, productUrl, "manufacturer_page"),
          offers: [],
          title: field("Countertop Nugget Ice Maker", productUrl, "manufacturer_page"),
        },
        name: "Silonn Nugget Ice Maker Countertop",
        product_page_url: categoryUrl,
      }),
    );

    assert.equal(link?.url, productUrl);
    assert.notEqual(link?.url, categoryUrl);
    assert.equal(link?.label, "View Official Product Page");
  });

  it("replaces a retailer family URL with a matching specific product citation", () => {
    const familyUrl =
      "https://www.chewy.com/brands/purina-pro-plan-dog-food-7437";
    const productUrl =
      "https://www.chewy.com/purina-pro-plan-sensitive-skin/dp/123456";
    const product = buildProduct({
      category: "Dog food",
      citations: [
        {
          title: "Purina Pro Plan Dog Food: Wet & Dry Dog Food | Chewy",
          url: familyUrl,
          what_it_supports: "Brand-family information.",
        },
        {
          title:
            "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
          url: productUrl,
          what_it_supports: "Specific product page.",
        },
      ],
      metadata: {
        brand: field("Purina", productUrl),
        offers: [],
      },
      name: "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
      product_page_url: familyUrl,
    });
    const link = getProductPageLink(product);
    const result = prioritizeProductPageUrlsInResult(buildResult(product));

    assert.equal(link?.url, productUrl);
    assert.equal(link?.isProductPage, true);
    assert.equal(result.recommendations[0].product_page_url, productUrl);
  });

  it("clears a generic family URL when no specific product page is available", () => {
    const familyUrl =
      "https://www.chewy.com/brands/royal-canin-dog-food-150798";
    const product = buildProduct({
      category: "Dog food",
      citations: [
        {
          title: "Royal Canin Dog Food - Free Shipping | Chewy",
          url: familyUrl,
          what_it_supports: "Brand-family information.",
        },
      ],
      metadata: {
        brand: field("Royal Canin", familyUrl),
        offers: [],
      },
      name: "Royal Canin Small Adult Dry Dog Food",
      product_page_url: familyUrl,
    });
    const result = prioritizeProductPageUrlsInResult(buildResult(product));

    assert.equal(getProductPageLink(product), null);
    assert.equal(result.recommendations[0].product_page_url, "");
    assert.equal(result.exactMatches[0].product_page_url, "");
  });

  it("does not choose sports listing, review, or newsroom pages over a real product page", () => {
    const productUrl =
      "https://www.nike.com/t/gt-cut-academy-basketball-shoes-HWCFvAob";
    const link = getProductPageLink(
      buildProduct({
        category: "Basketball shoes",
        citations: [
          {
            title: "Nike G.T. Cut 4 listing",
            url: "https://www.nike.com/w/gt-series-basketball-low-top-200vmz3glsmz4h1cpz7hf8e",
            what_it_supports: "Nike category page for multiple shoes.",
          },
          {
            title: "Nike newsroom release",
            url: "https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info",
            what_it_supports: "Brand newsroom article.",
          },
          {
            title: "DICK'S shoe advice page",
            url: "https://www.dickssportinggoods.com/a/nike-mens-stability-shoes-0zdz01a.html",
            what_it_supports: "Retailer advice/listing page.",
          },
          {
            title: "Foot Locker product-family page",
            url: "https://www.footlocker.com/buy/nike-kd-17-shoes-0bcz00a",
            what_it_supports: "Retailer product-family listing page.",
          },
          {
            title: "Nike G.T. Cut Academy product page",
            url: productUrl,
            what_it_supports: "Specific Nike product page.",
          },
        ],
        metadata: {
          brand: field("Nike", productUrl, "manufacturer_page"),
          canonicalUrl: field(productUrl, productUrl, "manufacturer_page"),
          offers: [],
          title: field("Nike G.T. Cut Academy", productUrl, "manufacturer_page"),
        },
        name: "Nike G.T. Cut Academy",
        product_page_url:
          "https://www.dickssportinggoods.com/a/nike-mens-stability-shoes-0zdz01a.html",
      }),
    );

    assert.equal(link?.url, productUrl);
    assert.equal(link?.label, "View Official Product Page");
  });

  it("does not choose an opaque official model URL when it does not match the product", () => {
    const wrongOfficialUrl = "https://www.breville.com/en-us/product/bes870";
    const reviewUrl =
      "https://www.tomsguide.com/home/coffee-makers/beginner-friendly-espresso-machines";
    const link = getProductPageLink(
      buildProduct({
        category: "Espresso machine",
        citations: [
          {
            title: "Beginner-friendly espresso machines",
            url: reviewUrl,
            what_it_supports: "Review context for the Bambino Plus.",
          },
        ],
        metadata: {
          brand: field("Breville", wrongOfficialUrl, "manufacturer_page"),
          offers: [],
        },
        name: "Breville Bambino Plus",
        product_page_url: wrongOfficialUrl,
      }),
    );

    assert.equal(link, null);
    assert.notEqual(link?.url, wrongOfficialUrl);
    assert.notEqual(link?.label, "View Official Product Page");
  });

  it("does not label uncertain official-looking URLs as official", () => {
    const uncertainUrl = "https://apple-products.example.com/ipad-pro";
    const link = getProductPageLink(
      buildProduct({
        citations: [],
        metadata: {
          brand: field("Apple", uncertainUrl),
          offers: [],
        },
        product_page_url: uncertainUrl,
      }),
    );

    assert.equal(link?.url, uncertainUrl);
    assert.notEqual(link?.type, "official");
    assert.notEqual(link?.label, "View Official Product Page");
  });

  it("does not promote evidence-only citations into product CTA links", () => {
    const sourceUrl = "https://www.nytimes.com/wirecutter/reviews/best-tablet/";
    const link = getProductPageLink(
      buildProduct({
        citations: [
          {
            title: "Independent tablet review",
            url: sourceUrl,
            what_it_supports: "Review evidence.",
          },
        ],
        metadata: {
          brand: field("Apple", sourceUrl),
          offers: [],
        },
        product_page_url: "",
      }),
    );

    assert.equal(link, null);
  });

  it("does not use official lineup pages as product CTA links", () => {
    const lineupUrl = "https://cowaymega.com/pages/airmega";
    const link = getProductPageLink(
      buildProduct({
        category: "Air purifier",
        citations: [
          {
            title: "Coway Airmega lineup",
            url: lineupUrl,
            what_it_supports: "Brand lineup page.",
          },
        ],
        metadata: {
          brand: field("Coway", lineupUrl, "manufacturer_page"),
          canonicalUrl: field(lineupUrl, lineupUrl, "manufacturer_page"),
          offers: [],
          title: field("Coway Airmega lineup", lineupUrl, "manufacturer_page"),
        },
        name: "Coway Airmega 50",
        product_page_url: lineupUrl,
      }),
    );

    assert.equal(link, null);
  });

  it("recognizes Honeywell Plugged In as an official product domain", () => {
    const productUrl =
      "https://www.honeywellpluggedin.com/air_purifiers/allergen-plus-hepa-tower-for-large-rooms";
    const link = getProductPageLink(
      buildProduct({
        category: "Air purifier",
        citations: [
          {
            title: "Allergen Plus HEPA Tower for Large Rooms",
            url: productUrl,
            what_it_supports: "HEPA filtration and room coverage.",
          },
        ],
        name: "Honeywell Allergen Plus HEPA Tower for Large Rooms, HPA175",
        product_page_url: productUrl,
      }),
    );

    assert.equal(link?.url, productUrl);
    assert.equal(link?.type, "official");
    assert.equal(link?.label, "View Official Product Page");
  });
});

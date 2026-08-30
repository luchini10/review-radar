import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getProductPageLink,
  prioritizeProductPageUrlsInResult,
  productPageMatchesIdentity,
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

  it("RR-090 rejects a different compound short-model URL and keeps the matching page", () => {
    const wrongUrl =
      "https://us.roborock.com/products/roborock-q10-x5-plus";
    const correctUrl =
      "https://us.roborock.com/products/roborock-q7-m5-plus";
    const product = buildProduct({
      category: "robot vacuum",
      citations: [
        {
          title:
            "Roborock Q7 M5+ Robot Vacuum and Mop with Auto-Empty Dock (Upgraded from Q5 Max+)",
          url: correctUrl,
          what_it_supports: "Official page for the displayed product.",
        },
      ],
      metadata: {
        brand: field("Roborock", wrongUrl, "manufacturer_page"),
        canonicalUrl: field(wrongUrl, wrongUrl, "manufacturer_page"),
        offers: [offer(wrongUrl)],
        title: field(
          "Roborock Q10 X5+ Robot Vacuum and Mop with Auto-Empty Dock",
          wrongUrl,
          "manufacturer_page",
        ),
      },
      name: "Roborock Q7 M5+ Robot Vacuum and Mop with Auto-Empty Dock",
      product_page_url: wrongUrl,
    });
    const link = getProductPageLink(product);
    const result = prioritizeProductPageUrlsInResult(buildResult(product));

    assert.equal(link?.url, correctUrl);
    assert.equal(result.recommendations[0].product_page_url, correctUrl);

    const wrongOnly = {
      ...product,
      citations: [],
    };
    const cleared = prioritizeProductPageUrlsInResult(buildResult(wrongOnly));

    assert.equal(getProductPageLink(wrongOnly), null);
    assert.equal(cleared.recommendations[0].product_page_url, "");
  });

  it("rejects contradictory model evidence before the product-page fast path", () => {
    const base = {
      brand: "Example",
      model: "Q50 Max",
      productName: "Example Q50 Max robot vacuum",
    };

    assert.equal(
      productPageMatchesIdentity({
        ...base,
        pageTitle: "Example Q50 Max and Q50 Pro robot vacuum",
        pageUrl: "https://merchant.example/products/q50-max",
      }),
      false,
    );
    assert.equal(
      productPageMatchesIdentity({
        ...base,
        pageTitle: "Example Q50 Max robot vacuum",
        pageUrl: "https://merchant.example/products/q50-pro",
      }),
      false,
    );
    assert.equal(
      productPageMatchesIdentity({
        ...base,
        pageTitle: "Example Q50 Max robot vacuum",
        pageUrl: "https://merchant.example/products/q50-max/123456789",
      }),
      true,
    );

    const compound = {
      brand: "Example",
      model: "X100 A1",
      productName: "Example X100 A1 appliance",
    };
    for (const pageTitle of [
      "Example X100 (A1) and X100 (B2) appliance",
      "Example X100 A1 plus B2 appliance",
      "Example X100 A1 alongside B2 appliance",
      "Example X100 A1 featuring B2 appliance",
      "Example X100 A1 model B2 appliance",
      "Example X100 A1 variant B2 appliance",
      "Example X100 A1 trim B2 appliance",
      "Example X100 A1 version B2 appliance",
      "Example X100 A1 aka B2 appliance",
      "Example X100 A1 includes B2 appliance",
      "Example X100 appliance",
    ]) {
      assert.equal(
        productPageMatchesIdentity({
          ...compound,
          pageTitle,
          pageUrl: "https://merchant.example/products/x100-a1/123456",
        }),
        false,
        pageTitle,
      );
      const pageUrl =
        "https://www.bestbuy.com/site/example-x100-a1/123456.p";
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: pageTitle,
                url: pageUrl,
                what_it_supports: "Captured retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", pageUrl),
              offers: [],
            },
            name: compound.productName,
            product_page_url: "",
          }),
        ),
        null,
        `general selection: ${pageTitle}`,
      );
    }

    for (const pageTitle of [
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
      assert.equal(
        productPageMatchesIdentity({
          ...compound,
          pageTitle,
          pageUrl: "https://merchant.example/products/x100-a1/123456",
        }),
        true,
        pageTitle,
      );
      const pageUrl =
        "https://www.bestbuy.com/site/example-x100-a1/123456.p";
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: pageTitle,
                url: pageUrl,
                what_it_supports: "Captured retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", pageUrl),
              offers: [],
            },
            name: compound.productName,
            product_page_url: "",
          }),
        )?.url,
        pageUrl,
        `general selection: ${pageTitle}`,
      );
    }

    const numeric = {
      brand: "Example",
      model: "X100 20",
      productName: "Example X100 20 appliance",
    };
    for (const pageTitle of [
      "Example X100 20 plus 30 appliance",
      "Example X100 20 alongside 30 appliance",
      "Example X100 20 variant 30 appliance",
      "Example X100 20 and 30 appliance",
      "Example X100 20, 30 appliance",
      "Example 30 alongside X100 20 appliance",
      "Example X100 20 plus X100 model 2024 appliance",
      "Example X100 20 plus X100 30.0 appliance",
      "Example X100 20 plus model number 2024 appliance",
      "Example X100 20 plus model no. 2024 appliance",
      "Example X100 20 plus model code 2024 appliance",
      "Example X100 20 plus version number 30.0 appliance",
      "Example X100 20 plus variant number 30.0 appliance",
      "Example X100 20 plus variant code 2024 appliance",
      "Example X100 20 plus trim level 30.0 appliance",
      "Example X100 20 plus trim code 2024 appliance",
      "Example X100 20 plus 2024 model X100 appliance",
      "Example X100 20 plus B2 with Bluetooth Low Energy version 5.0 appliance",
      "Example X100 20 plus model Bluetooth LE version 5.0 appliance",
      "Example X100 20 plus variant USB Type-C version 3.2 appliance",
      "Example X100 20 plus trim HDMI eARC version 2.1 appliance",
      "Example X100 20 plus model Wi-Fi 6E appliance",
      "Example X100 20 plus Wi-Fi 6E model appliance",
      "Example X100 20 plus model ID: Wi-Fi 6E appliance",
      "Example X100 20 plus model identifier Bluetooth LE version 5.0 appliance",
      "Example X100 20 plus model-name USB Type-C version 3.2 appliance",
      "Example X100 20 plus variant ID HDMI eARC version 2.1 appliance",
      "Example X100 20 plus trim name DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 plus Wi-Fi 6E model identifier appliance",
      "Example X100 20 plus Bluetooth LE version 5.0 model name appliance",
      "Example X100 20 plus ModelID Wi-Fi 6E appliance",
      "Example X100 20 plus modelIdentifier Bluetooth LE version 5.0 appliance",
      "Example X100 20 plus modelName USB Type-C version 3.2 appliance",
      "Example X100 20 plus variantID HDMI eARC version 2.1 appliance",
      "Example X100 20 plus variantIdentifier DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 plus variantName Wi-Fi 7 appliance",
      "Example X100 20 plus trimID Bluetooth Low Energy version 5.0 appliance",
      "Example X100 20 plus trimIdentifier Wi-Fi 6E appliance",
      "Example X100 20 plus trimName USB Type-C version 3.2 appliance",
      "Example X100 20 plus Wi-Fi 6E ModelID appliance",
      "Example X100 20 plus Bluetooth LE version 5.0 trimName appliance",
      "Example X100 20 plus Model ID is Wi-Fi 6E appliance",
      "Example X100 20 plus ModelID equals Wi-Fi 6E appliance",
      "Example X100 20 plus model called Bluetooth LE version 5.0 appliance",
      "Example X100 20 plus model named USB Type-C version 3.2 appliance",
      "Example X100 20 plus variant is Wi-Fi 6E appliance",
      "Example X100 20 plus Wi-Fi 6E is the Model ID appliance",
      "Example X100 20 plus Bluetooth LE version 5.0 is the modelName appliance",
      "Example X100 20 plus model designation is DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 plus model is called Bluetooth LE version 5.0 appliance",
      "Example X100 20 plus model is named USB Type-C version 3.2 appliance",
      "Example X100 20 plus model is designated Wi-Fi 6E appliance",
      "Example X100 20 plus model is designated as Wi-Fi 6E appliance",
      "Example X100 20 plus variant is called HDMI eARC version 2.1 appliance",
      "Example X100 20 plus trim is named DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 plus model is known as Wi-Fi 6E appliance",
      "Example X100 20 plus model also known as Wi-Fi 6E appliance",
      "Example X100 20 plus model is also known as Wi-Fi 6E appliance",
      "Example X100 20 plus model is the Wi-Fi 6E appliance",
      "Example X100 20 plus Wi-Fi 6E is known as the model appliance",
      "Example X100 20 plus Wi-Fi 6E is designated as the model appliance",
      "Example X100 20 plus Bluetooth LE version 5.0 is called the modelName appliance",
      "Example X100 20 plus USB Type-C version 3.2 is named the variantID appliance",
      "Example X100 20; the model, also known as Wi-Fi 6E, appliance",
      "Example X100 20 plus model, is designated as Wi-Fi 6E appliance",
      "Example X100 20 plus model is, also known as Wi-Fi 6E appliance",
      "Example X100 20 plus Wi-Fi 6E, also known as the model appliance",
      "Example X100 20 plus Wi-Fi 6E is, also known as the model appliance",
    ]) {
      assert.equal(
        productPageMatchesIdentity({
          ...numeric,
          pageTitle,
          pageUrl: "https://merchant.example/products/x100-20/123456",
        }),
        false,
        pageTitle,
      );
      const pageUrl =
        "https://www.bestbuy.com/site/example-x100-20/123456.p";
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: pageTitle,
                url: pageUrl,
                what_it_supports: "Captured retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", pageUrl),
              modelNumber: field("X100 20", pageUrl),
              offers: [],
            },
            name: numeric.productName,
            product_page_url: "",
          }),
        ),
        null,
        `general numeric selection: ${pageTitle}`,
      );
    }

    for (const testCase of [
      {
        exactTitle: "Example X100 2024 appliance",
        model: "X100 2024",
        productName: "Example X100 2024 appliance",
        siblingTitle: "Example X100 2030 appliance",
      },
      {
        exactTitle: "Example X100 30.0 appliance",
        model: "X100 30.0",
        productName: "Example X100 30.0 appliance",
        siblingTitle: "Example X100 31.0 appliance",
      },
    ]) {
      assert.equal(
        productPageMatchesIdentity({
          brand: "Example",
          model: testCase.model,
          productName: testCase.productName,
          pageTitle: testCase.siblingTitle,
          pageUrl: "https://merchant.example/products/numeric-sibling/123456",
        }),
        false,
        testCase.siblingTitle,
      );
      const pageUrl =
        "https://www.bestbuy.com/site/numeric-sibling/123456.p";
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: testCase.siblingTitle,
                url: pageUrl,
                what_it_supports: "Captured retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", pageUrl),
              modelNumber: field(testCase.model, pageUrl),
              offers: [],
            },
            name: testCase.productName,
            product_page_url: "",
          }),
        ),
        null,
        `general numeric context: ${testCase.siblingTitle}`,
      );

      const exactSlug = testCase.model.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const exactPageUrl =
        `https://www.bestbuy.com/site/example-${exactSlug}/123456.p`;
      assert.equal(
        productPageMatchesIdentity({
          brand: "Example",
          model: testCase.model,
          productName: testCase.productName,
          pageTitle: testCase.exactTitle,
          pageUrl: exactPageUrl,
        }),
        true,
        `exact numeric context: ${testCase.model}`,
      );
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: testCase.exactTitle,
                url: exactPageUrl,
                what_it_supports: "Captured exact retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", exactPageUrl),
              modelNumber: field(testCase.model, exactPageUrl),
              offers: [],
            },
            name: testCase.productName,
            product_page_url: "",
          }),
        )?.url,
        exactPageUrl,
        `general exact numeric context: ${testCase.model}`,
      );
    }

    for (const pageTitle of [
      "Example X100 20 4-Burner appliance",
      "Example X100 20 4 Burner appliance",
      "Example X100 20 5Ah appliance",
      "Example X100 20 5 Ah appliance",
      "Example X100 20 5.5 HP appliance",
      "Example X100 20 appliance - $199.99",
      "Example X100 20 2024 edition appliance",
      "Example X100 20 with Bluetooth version number 5.0 appliance",
      "Example X100 20 with WiFi version 6.0 appliance",
      "Example X100 20 with Bluetooth LE version 5.0 appliance",
      "Example X100 20 with Bluetooth Low Energy version 5.0 appliance",
      "Example X100 20 with USB Type-C version 3.2 appliance",
      "Example X100 20 with HDMI eARC version 2.1 appliance",
      "Example X100 20 with Wi-Fi 6E version 2.0 appliance",
      "Example X100 20 with DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 with Wi-Fi 6E appliance",
      "Example X100 20 with Wi-Fi 7 appliance",
      "Example X100 20 appliance (Upgraded from X100 10)",
    ]) {
      assert.equal(
        productPageMatchesIdentity({
          ...numeric,
          pageTitle,
          pageUrl: "https://merchant.example/products/x100-20/123456",
        }),
        true,
        pageTitle,
      );
      const pageUrl =
        "https://www.bestbuy.com/site/example-x100-20/123456.p";
      assert.equal(
        getProductPageLink(
          buildProduct({
            category: "appliance",
            citations: [
              {
                title: pageTitle,
                url: pageUrl,
                what_it_supports: "Captured retailer result.",
              },
            ],
            metadata: {
              brand: field("Example", pageUrl),
              modelNumber: field("X100 20", pageUrl),
              offers: [],
            },
            name: numeric.productName,
            product_page_url: "",
          }),
        )?.url,
        pageUrl,
        `general numeric selection: ${pageTitle}`,
      );
    }
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

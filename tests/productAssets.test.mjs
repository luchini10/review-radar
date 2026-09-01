import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  PRODUCT_ASSET_CACHE_TTL_MS,
  enrichProductAssets,
  productAssetsTestExports,
} from "../lib/productAssets.ts";

const { buildMetadata, mergeMetadata } = productAssetsTestExports;

beforeEach(() => {
  clearCacheForTests();
});

function field(value, sourceUrl = "https://shop.example/products/item") {
  return {
    confidence: "Medium",
    sourceType: "serper",
    sourceUrl,
    value,
    verifiedAt: "2026-08-31T00:00:00.000Z",
  };
}

function candidate(overrides = {}) {
  return {
    category: "tablet",
    imageUrl: "",
    metadata: { offers: [] },
    name: "Apple iPad Pro M4",
    pageUrl: "https://shop.example/products/apple-ipad-pro-m4",
    ...overrides,
  };
}

function publicDependencies(html, onTransport = () => {}) {
  return {
    resolveHost: async () => ["8.8.8.8"],
    transport: async () => {
      onTransport();
      return {
        body: Buffer.from(html),
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 200,
      };
    },
  };
}

describe("selection product asset enrichment", () => {
  it("expires current price and availability evidence after two minutes", () => {
    assert.equal(PRODUCT_ASSET_CACHE_TTL_MS, 2 * 60 * 1_000);
  });

  it("does not treat a search offer as verified when the page has no current offer", () => {
    const existing = {
      offers: [
        {
          price: field(799),
          priceCurrency: field("USD"),
        },
      ],
    };
    const page = buildMetadata({
      html: '<html><head><title>Apple iPad Pro M4</title></head></html>',
      pageUrl: "https://shop.example/products/apple-ipad-pro-m4",
      product: candidate({ metadata: existing }),
      productImageUrl: "",
    });

    const merged = mergeMetadata(existing, page);
    assert.equal(merged.offers[0].price.value, 799);
    assert.equal(
      productAssetsTestExports.assessProductPageAvailability({
        html: '<html><head><title>Apple iPad Pro M4</title></head></html>',
        productName: "Apple iPad Pro M4",
      }).status,
      "unknown",
    );
  });

  it("extracts a matching product page image and current offer", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Apple iPad Pro M4">
      <meta property="og:image" content="https://cdn.example/apple-ipad-pro-m4.jpg">
      <script type="application/ld+json">
        {"@type":"Product","name":"Apple iPad Pro M4","brand":{"name":"Apple"},
         "image":"https://cdn.example/apple-ipad-pro-m4.jpg",
         "offers":{"@type":"Offer","price":"799.00","priceCurrency":"USD",
                   "availability":"https://schema.org/InStock",
                   "url":"https://shop.example/products/apple-ipad-pro-m4"}}
      </script>
    </head><body><h1>Apple iPad Pro M4</h1></body></html>`;
    const result = await enrichProductAssets(
      { recommendations: [candidate()] },
      { fetchDependencies: publicDependencies(html) },
    );
    const product = result.recommendations[0];

    assert.equal(product.pageUrl, "https://shop.example/products/apple-ipad-pro-m4");
    assert.equal(product.imageUrl, "https://cdn.example/apple-ipad-pro-m4.jpg");
    assert.equal(product.priceTrust.status, "verified");
    assert.equal(product.priceTrust.price, 799);
    assert.equal(product.availabilityTrust.status, "available");
  });

  it("rejects an explicitly unavailable product-page offer", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Apple iPad Pro M4">
      <script type="application/ld+json">
        {"@type":"Product","name":"Apple iPad Pro M4","brand":{"name":"Apple"},
         "offers":{"@type":"Offer","price":"799.00","priceCurrency":"USD",
                   "availability":"https://schema.org/OutOfStock",
                   "url":"https://shop.example/products/apple-ipad-pro-m4"}}
      </script>
    </head><body><h1>Apple iPad Pro M4</h1></body></html>`;
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            metadata: {
              offers: [
                {
                  price: field(749),
                  priceCurrency: field("USD"),
                },
              ],
            },
          }),
        ],
      },
      { fetchDependencies: publicDependencies(html) },
    );
    const product = result.recommendations[0];

    assert.equal(product.availabilityTrust.status, "unavailable");
  });

  it("does not let a priced offer with unknown availability override visible out-of-stock state", () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Cuisinart 14 Cup Coffee Maker",
         "offers":{"@type":"Offer","price":"105.78","priceCurrency":"USD"}}
      </script>
    </head><body>
      <h1>Cuisinart 14 Cup Coffee Maker</h1>
      <p>Selected option out of stock</p>
    </body></html>`;

    assert.equal(
      productAssetsTestExports.assessProductPageAvailability({
        html,
        productName: "Cuisinart 14 Cup Coffee Maker",
      }).status,
      "unavailable",
    );
  });

  it("prefers a current product-page offer over a stale search price", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Apple iPad Pro M4">
      <script type="application/ld+json">
        {"@type":"Product","name":"Apple iPad Pro M4","brand":{"name":"Apple"},
         "offers":{"@type":"Offer","price":"799.00","priceCurrency":"USD",
                   "availability":"https://schema.org/InStock",
                   "url":"https://shop.example/products/apple-ipad-pro-m4"}}
      </script>
    </head><body><h1>Apple iPad Pro M4</h1></body></html>`;
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            metadata: {
              offers: [
                {
                  price: field(749),
                  priceCurrency: field("USD"),
                },
              ],
            },
          }),
        ],
      },
      { fetchDependencies: publicDependencies(html) },
    );

    assert.equal(result.recommendations[0].priceTrust.status, "verified");
    assert.equal(result.recommendations[0].priceTrust.price, 799);
  });

  it("keeps availability unknown when the product page cannot be fetched", async () => {
    const result = await enrichProductAssets(
      { recommendations: [candidate()] },
      {
        fetchDependencies: {
          resolveHost: async () => ["8.8.8.8"],
          transport: async () => {
            throw new Error("network unavailable");
          },
        },
      },
    );

    assert.equal(result.recommendations[0].availabilityTrust.status, "unknown");
  });

  it("uses a same-merchant current Shopping offer when an exact product page cannot be fetched", async () => {
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            availabilityTrust: {
              source: "shopping_offer",
              status: "available",
            },
          }),
        ],
      },
      {
        fetchDependencies: {
          resolveHost: async () => ["8.8.8.8"],
          transport: async () => {
            throw new Error("merchant blocks server-side fetches");
          },
        },
      },
    );

    assert.deepEqual(result.recommendations[0].availabilityTrust, {
      source: "shopping_offer",
      status: "available",
    });
  });

  it("lets explicit page unavailability override a current Shopping offer", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Apple iPad Pro M4">
      <script type="application/ld+json">
        {"@type":"Product","name":"Apple iPad Pro M4",
         "offers":{"@type":"Offer","price":"799.00","priceCurrency":"USD",
                   "availability":"https://schema.org/OutOfStock"}}
      </script>
    </head><body><h1>Apple iPad Pro M4</h1></body></html>`;
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            availabilityTrust: {
              source: "shopping_offer",
              status: "available",
            },
          }),
        ],
      },
      { fetchDependencies: publicDependencies(html) },
    );

    assert.equal(result.recommendations[0].availabilityTrust.status, "unavailable");
    assert.equal(
      result.recommendations[0].availabilityTrust.source,
      "structured_availability",
    );
  });

  it("uses product-scoped fulfillment text without accepting related-item CTAs", () => {
    const unavailable = `<html><body>
      <h1>Shark IQ Robot Self-Emptying Robot Vacuum</h1>
      <p>Shipping Not available</p><p>Pickup Not available</p>
      <p>Delivery Not available</p>
      <h2>We also recommend</h2><button>Add to cart</button>
    </body></html>`;
    const available = `<html><body>
      <h1>bObsweep Dustin Self-Emptying Robot Vacuum</h1>
      <p>Shipping Arrives Sep 4</p><p>Pickup Not available</p>
      <h2>We also recommend</h2>
    </body></html>`;

    assert.equal(
      productAssetsTestExports.assessProductPageAvailability({
        html: unavailable,
        productName: "Shark IQ Robot Self-Emptying Robot Vacuum",
      }).status,
      "unavailable",
    );
    assert.equal(
      productAssetsTestExports.assessProductPageAvailability({
        html: available,
        productName: "bObsweep Dustin Self-Emptying Robot Vacuum",
      }).status,
      "available",
    );
  });

  it("extracts an explicitly USD-labeled current page price", () => {
    const metadata = buildMetadata({
      html: `<html><body>
        <h1>bObsweep Dustin Self-Emptying Robot Vacuum</h1>
        <p>Current price is USD$599.00</p><p>Shipping Arrives Sep 4</p>
      </body></html>`,
      pageUrl: "https://shop.example/products/bobsweep-dustin",
      product: candidate({ name: "bObsweep Dustin Self-Emptying Robot Vacuum" }),
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 599);
    assert.equal(metadata.offers[0].priceCurrency.value, "USD");
  });

  it("clears a page before transport when DNS resolves to a private address", async () => {
    let transports = 0;
    const result = await enrichProductAssets(
      { recommendations: [candidate()] },
      {
        fetchDependencies: {
          resolveHost: async () => ["127.0.0.1"],
          transport: async () => {
            transports += 1;
            throw new Error("transport must not run");
          },
        },
      },
    );

    assert.equal(transports, 0);
    assert.equal(result.recommendations[0].pageUrl, "");
  });

  it("rejects generic retailer artwork when no verified page is available", async () => {
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            imageUrl:
              "https://images-na.ssl-images-amazon.com/images/G/01/nav/flyout.png",
            pageUrl: "",
          }),
        ],
      },
      { fetchDependencies: publicDependencies("") },
    );

    assert.equal(result.recommendations[0].imageUrl, "");
  });

  it("refuses an explicit conflicting model URL without fetching it", async () => {
    let transports = 0;
    const result = await enrichProductAssets(
      {
        recommendations: [
          candidate({
            name: "Roborock Q10 S5 Plus",
            pageUrl: "https://us.roborock.com/products/roborock-q10-x5-plus",
          }),
        ],
      },
      {
        fetchDependencies: publicDependencies("", () => {
          transports += 1;
        }),
      },
    );

    assert.equal(transports, 0);
    assert.equal(result.recommendations[0].pageUrl, "");
  });

  it("preserves a decimal screen size encoded with URL separators", async () => {
    let transports = 0;
    const product = candidate({
      name:
        "ACEMAGIC AX18Pro 18.5 Laptop AMD Ryzen 3 4300U 16GB RAM 512GB SSD",
      pageUrl:
        "https://www.bestbuy.com/product/acemagic-ax18pro-18-5-laptop-amd-ryzen-3-4300u-16gb-ram-512gb-ssd/ABC123",
    });
    const result = await enrichProductAssets(
      { recommendations: [product] },
      {
        fetchDependencies: publicDependencies(
          `<html><body><h1>${product.name}</h1><button>Add to cart</button></body></html>`,
          () => {
            transports += 1;
          },
        ),
      },
    );

    assert.equal(transports, 1);
    assert.equal(result.recommendations[0].pageUrl, product.pageUrl);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
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
  it("keeps a search offer when the product page has no current price", () => {
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

    assert.equal(mergeMetadata(existing, page).offers[0].price.value, 799);
  });

  it("extracts a matching product page image and current offer", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Apple iPad Pro M4">
      <meta property="og:image" content="https://cdn.example/apple-ipad-pro-m4.jpg">
      <script type="application/ld+json">
        {"@type":"Product","name":"Apple iPad Pro M4","brand":{"name":"Apple"},
         "image":"https://cdn.example/apple-ipad-pro-m4.jpg",
         "offers":{"@type":"Offer","price":"799.00","priceCurrency":"USD",
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
});

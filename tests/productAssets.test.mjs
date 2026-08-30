import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enrichProductAssets,
  productAssetsTestExports,
} from "../lib/productAssets.ts";
import { clearCacheForTests } from "../lib/cache.ts";

const {
  buildMetadata,
  extractDimensionFromText,
  extractSpecTableText,
  mergeMetadata,
  productPageCacheKey,
  withVerifiedOfferPriceFields,
} = productAssetsTestExports;

function field(value, sourceType = "serper") {
  return {
    confidence: "Medium",
    sourceType,
    sourceUrl: "https://example.com/product",
    value,
    verifiedAt: "2026-06-04T00:00:00.000Z",
  };
}

describe("product asset metadata extraction", () => {
  it("extracts visible spec table text for metadata fallbacks", () => {
    const specText = extractSpecTableText(`
      <table>
        <tr><th>Width</th><td>35.75 inches</td></tr>
        <tr><th>Depth</th><td>29 inches</td></tr>
        <tr><th>Height</th><td>70 inches</td></tr>
      </table>
    `);

    assert.match(specText, /Width: 35.75 inches/);
    assert.match(specText, /Depth: 29 inches/);
    assert.match(specText, /Height: 70 inches/);
  });

  it("extracts depth and height from visible product specs", () => {
    const text = "Width: 36 inches | Depth: 29 inches | Height: 70 inches";

    assert.equal(extractDimensionFromText(text, "width"), 36);
    assert.equal(extractDimensionFromText(text, "depth"), 29);
    assert.equal(extractDimensionFromText(text, "height"), 70);
  });

  it("keeps search-derived offers when page metadata has no price", () => {
    const existing = {
      colors: field(["red"]),
      offers: [
        {
          availability: field(null),
          price: field(34.99),
          priceCurrency: field("USD"),
          retailer: "Target",
          url: "https://example.com/product",
        },
      ],
      title: field("Red Vacuum"),
    };
    const incoming = {
      offers: [],
      title: field("Red Vacuum Product Page", "open_graph"),
    };
    const merged = mergeMetadata(existing, incoming);

    assert.equal(merged.offers[0].price.value, 34.99);
    assert.deepEqual(merged.colors?.value, ["red"]);
    assert.equal(merged.title?.value, "Red Vacuum Product Page");
  });

  it("extracts sale/current prices from richer product-page metadata", () => {
    const metadata = buildMetadata({
      html: `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Example Air Purifier",
            "offers": {
              "@type": "Offer",
              "price": "Was $299.99, now $179.99",
              "priceCurrency": "USD"
            }
          }
        </script>
      `,
      pageUrl: "https://example.com/air-purifier",
      product: {
        name: "Example Air Purifier",
        product_page_url: "https://example.com/air-purifier",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 179.99);
  });

  it("extracts priceSpecification and meta price fallbacks", () => {
    const structuredMetadata = buildMetadata({
      html: `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Example Chair",
            "offers": {
              "@type": "Offer",
              "priceSpecification": {
                "@type": "PriceSpecification",
                "price": "$249.99",
                "priceCurrency": "USD"
              }
            }
          }
        </script>
      `,
      pageUrl: "https://example.com/chair",
      product: {
        name: "Example Chair",
        product_page_url: "https://example.com/chair",
        product_image_url: "",
      },
      productImageUrl: "",
    });
    const metaMetadata = buildMetadata({
      html: `
        <meta property="og:title" content="Example Vacuum">
        <meta property="product:price:amount" content="129.99">
        <meta property="product:price:currency" content="USD">
      `,
      pageUrl: "https://example.com/vacuum",
      product: {
        name: "Example Vacuum",
        product_page_url: "https://example.com/vacuum",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(structuredMetadata.offers[0].price.value, 249.99);
    assert.equal(metaMetadata.offers[0].price.value, 129.99);
  });

  it("extracts named hidden input prices from product pages", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>Example Air Purifier</h1>
            <input type="hidden" name="price" value="109.99">
            <input type="hidden" name="quantity" value="42">
          </body>
        </html>
      `,
      pageUrl: "https://example.com/air-purifier",
      product: {
        name: "Example Air Purifier",
        product_page_url: "https://example.com/air-purifier",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 109.99);
  });

  it("does not attach an unrelated same-page widget price to the target product", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <head>
            <meta property="og:title" content="VIOFO A229 Pro">
          </head>
          <body>
            <h1>VIOFO A229 Pro</h1>
            <div
              data-title="A139 2CH Dual Channel Dash Cam Front 2K"
              data-price="19999"
              data-id=""
            ></div>
          </body>
        </html>
      `,
      pageUrl:
        "https://www.viofo.com/pages/a229-pro-1ch-2ch-3ch-landing-page",
      product: {
        name: "VIOFO A229 Pro",
        product_page_url:
          "https://www.viofo.com/pages/a229-pro-1ch-2ch-3ch-landing-page",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers.length, 0);
  });

  it("does not attach unscoped data-price values, including bare integers", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>VIOFO A229 Pro</h1>
            <div data-price="19999"></div>
            <div data-price="349.99"></div>
          </body>
        </html>
      `,
      pageUrl: "https://example.com/viofo-a229-pro",
      product: {
        name: "VIOFO A229 Pro",
        product_page_url: "https://example.com/viofo-a229-pro",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers.length, 0);
  });

  it("keeps explicit product-scoped structured prices without a global ceiling", () => {
    const normalMetadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>VIOFO A229 Pro</h1>
            <div data-title="VIOFO A229 Pro" data-price="349.99"></div>
          </body>
        </html>
      `,
      pageUrl: "https://example.com/viofo-a229-pro",
      product: {
        name: "VIOFO A229 Pro",
        product_page_url: "https://example.com/viofo-a229-pro",
        product_image_url: "",
      },
      productImageUrl: "",
    });
    const expensiveMetadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>Reference Cinema Projector X9000</h1>
            <div
              data-title="Reference Cinema Projector X9000"
              data-price="$19,999.00"
            ></div>
          </body>
        </html>
      `,
      pageUrl: "https://example.com/projector-x9000",
      product: {
        name: "Reference Cinema Projector X9000",
        product_page_url: "https://example.com/projector-x9000",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(normalMetadata.offers[0].price.value, 349.99);
    assert.equal(expensiveMetadata.offers[0].price.value, 19999);
  });

  it("converts bare minor units only with matching product binding and an explicit unit marker", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>VIOFO A229 Pro</h1>
            <div
              data-title="VIOFO A229 Pro"
              data-price="34999"
              data-price-unit="cents"
            ></div>
            <div
              data-title="VIOFO A139"
              data-price="9999"
              data-price-unit="cents"
            ></div>
          </body>
        </html>
      `,
      pageUrl: "https://example.com/viofo-a229-pro",
      product: {
        name: "VIOFO A229 Pro",
        product_page_url: "https://example.com/viofo-a229-pro",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 349.99);
  });

  it("keeps schema.org product offers when the title matches the target", () => {
    const metadata = buildMetadata({
      html: `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Reference Cinema Projector X9000",
            "offers": {
              "@type": "Offer",
              "price": "19999",
              "priceCurrency": "USD"
            }
          }
        </script>
      `,
      pageUrl: "https://example.com/projector-x9000",
      product: {
        name: "Reference Cinema Projector X9000",
        product_page_url: "https://example.com/projector-x9000",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 19999);
    assert.equal(metadata.offers[0].price.sourceType, "json_ld");
  });

  it("keeps an exact one-word schema.org product identity", () => {
    const metadata = buildMetadata({
      html: `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "AirPods",
            "offers": {
              "@type": "Offer",
              "price": "129.99",
              "priceCurrency": "USD"
            }
          }
        </script>
      `,
      pageUrl: "https://example.com/airpods",
      product: {
        name: "AirPods",
        product_page_url: "https://example.com/airpods",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 129.99);
  });

  it("selects the matching schema.org product instead of an unrelated same-page product", () => {
    const metadata = buildMetadata({
      html: `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                "name": "VIOFO A139 Dash Cam",
                "offers": {
                  "@type": "Offer",
                  "price": "199.99",
                  "priceCurrency": "USD"
                }
              },
              {
                "@type": "Product",
                "name": "VIOFO A229 Pro",
                "offers": {
                  "@type": "Offer",
                  "price": "349.99",
                  "priceCurrency": "USD"
                }
              }
            ]
          }
        </script>
      `,
      pageUrl: "https://example.com/viofo-a229-pro",
      product: {
        name: "VIOFO A229 Pro",
        product_page_url: "https://example.com/viofo-a229-pro",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 349.99);
    assert.equal(metadata.title?.value, "VIOFO A229 Pro");
  });

  it("extracts visible product-page prices and replaces vague price ceilings", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>White High Back Gaming Chair Racing Computer Chair</h1>
            <div class="price">
              <span>$</span><span>144</span><sup>68</sup>
            </div>
            <p>
              Pay $119.68 after $25 OFF your total qualifying purchase upon
              opening a new card.
            </p>
          </body>
        </html>
      `,
      pageUrl: "https://www.homedepot.com/p/example/319089053",
      product: {
        name: "Vinsetto White High Back Gaming Chair",
        product_page_url: "https://www.homedepot.com/p/example/319089053",
        product_image_url: "",
      },
      productImageUrl: "",
    });
    const product = withVerifiedOfferPriceFields({
      estimated_price_range: "Under $300",
      name: "Vinsetto White High Back Gaming Chair",
      price_value_verdict: "Price should be verified from the product page.",
      product_image_url: "",
      product_page_url: "https://www.homedepot.com/p/example/319089053",
      metadata,
    });

    assert.equal(metadata.offers[0].price.value, 144.68);
    assert.equal(product.estimated_price_range, "$144.68");
  });

  it("ignores unrelated embedded app-state prices when the visible product page states a higher price", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <head>
            <script>
              window.__RETAILER_STATE__ = {
                freeShippingThreshold: { price: 35 },
                financingPromo: { currentPrice: 35 },
                relatedTile: { salePrice: 35 }
              };
            </script>
          </head>
          <body>
            <h1>Silverback B5401W In-Ground 54" Glass Basketball Hoop System with Anchor Kit</h1>
            <section aria-label="Product price">
              <span>$</span><span>799</span><sup>99</sup>
            </section>
          </body>
        </html>
      `,
      pageUrl: "https://www.target.com/p/silverback-b5401w/-/A-51420386",
      product: {
        name: "Silverback B5401W In-Ground 54 Glass Basketball Hoop",
        product_page_url: "https://www.target.com/p/silverback-b5401w/-/A-51420386",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 799.99);
  });

  it("ignores visible financing payments before the full product price", () => {
    const metadata = buildMetadata({
      html: `
        <html>
          <body>
            <h1>Nectar Classic Memory Foam Mattress</h1>
            <section>
              <span>As low as $35/mo with financing</span>
              <span>Sale price $899</span>
            </section>
          </body>
        </html>
      `,
      pageUrl: "https://www.example.com/nectar-classic",
      product: {
        name: "Nectar Classic Memory Foam Mattress",
        product_page_url: "https://www.example.com/nectar-classic",
        product_image_url: "",
      },
      productImageUrl: "",
    });

    assert.equal(metadata.offers[0].price.value, 899);
  });

  it("does not display an implausibly tiny travel-system price as verified", () => {
    const product = withVerifiedOfferPriceFields({
      category: "car seat stroller combo",
      estimated_price_range: "$35",
      name: "Graco Modes Nest Travel System",
      price_value_verdict: "At $35, this looks like an exceptional value.",
      product_image_url: "",
      product_page_url: "https://example.com/graco-modes-nest",
      metadata: {
        offers: [
          {
            availability: field("InStock"),
            price: field(35, "retailer_page"),
            priceCurrency: field("USD", "retailer_page"),
            retailer: "example.com",
            url: "https://example.com/graco-modes-nest",
          },
        ],
      },
    });

    assert.equal(product.estimated_price_range, "Price not verified");
    assert.match(product.price_value_verdict, /unusually low/i);
  });

  it("does not display a reproduced $10 shop-vac offer as verified", () => {
    const product = withVerifiedOfferPriceFields({
      category: "shop vac",
      estimated_price_range: "$10",
      name: "Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet ...",
      price_value_verdict: "At $10, this looks like an exceptional value.",
      product_image_url: "",
      product_page_url: "https://example.com/ridgid-vac1200",
      metadata: {
        offers: [
          {
            availability: field("InStock"),
            price: field(10, "retailer_page"),
            priceCurrency: field("USD", "retailer_page"),
            retailer: "example.com",
            url: "https://example.com/ridgid-vac1200",
          },
        ],
      },
    });

    assert.equal(product.estimated_price_range, "Price not verified");
    assert.equal(product.priceTrust.status, "suspicious");
    assert.equal(product.priceTrust.canUseForBudget, false);
  });

  it("refreshes stale displayed price text from verified offers", () => {
    const product = withVerifiedOfferPriceFields({
      estimated_price_range: "Price not verified",
      name: "Example Vacuum",
      price_value_verdict: "Price was not verified.",
      product_image_url: "",
      product_page_url: "https://example.com/vacuum",
      metadata: {
        offers: [
          {
            availability: field(null),
            price: field(89.99),
            priceCurrency: field("USD"),
            retailer: "Example Store",
            url: "https://example.com/vacuum",
          },
        ],
      },
    });

    assert.equal(product.estimated_price_range, "$89.99");
    assert.match(product.price_value_verdict, /Price was found/i);
  });

  it("keeps a valid existing product image when no product page is available", async () => {
    const result = await enrichProductAssets({
      recommendations: [
        {
          category: "Tablet",
          citations: [],
          name: "Apple iPad Pro M4",
          product_image_url:
            "https://store.storeimages.cdn-apple.com/apple-ipad-pro-m4-product.jpg",
          product_page_url: "",
        },
      ],
    });

    assert.equal(
      result.recommendations[0].product_image_url,
      "https://store.storeimages.cdn-apple.com/apple-ipad-pro-m4-product.jpg",
    );
    assert.equal(result.recommendations[0].metadata?.image?.confidence, "High");
  });

  it("drops a generic retailer flyout image instead of rendering it", async () => {
    const result = await enrichProductAssets({
      recommendations: [
        {
          category: "shop vac",
          citations: [],
          name:
            "Amazon.com: RIDGID Wet Dry Vacuums VAC4000 Powerful and ...",
          product_image_url:
            "https://images-na.ssl-images-amazon.com/images/G/01/omaha/images/yoda/flyout_72dpi._V270255989_.png",
          product_page_url: "",
        },
      ],
    });

    assert.equal(result.recommendations[0].product_image_url, "");
    assert.equal(result.recommendations[0].metadata?.image, undefined);
  });

  it("RR-090 refuses to enrich a card from a different compound short-model page", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;

    global.fetch = async () => {
      fetchCalls += 1;
      return new Response(
        `
          <html>
            <head>
              <link rel="canonical" href="https://us.roborock.com/products/roborock-q10-x5-plus">
              <meta property="og:title" content="Roborock Q10 X5+ Robot Vacuum and Mop with Auto-Empty Dock">
            </head>
            <body>Roborock robot vacuum and mop with auto-empty dock.</body>
          </html>
        `,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    };

    try {
      const result = await enrichProductAssets({
        recommendations: [
          {
            category: "robot vacuum",
            citations: [],
            metadata: { offers: [] },
            name: "Roborock Q7 M5+ Robot Vacuum and Mop with Auto-Empty Dock",
            product_image_url:
              "https://cdn.example.com/roborock-q7-m5-plus-product.jpg",
            product_page_url:
              "https://us.roborock.com/products/roborock-q10-x5-plus",
          },
        ],
      });
      const product = result.recommendations[0];

      assert.equal(fetchCalls, 0);
      assert.equal(product.product_page_url, "");
      assert.equal(product.metadata?.canonicalUrl, undefined);
      assert.equal(product.metadata?.title, undefined);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

function networkBoundaryProduct(productPageUrl) {
  return {
    category: "Tablet",
    citations: [],
    metadata: { offers: [] },
    name: "Apple iPad Pro M4",
    product_image_url:
      "https://store.storeimages.cdn-apple.com/apple-ipad-pro-m4-product.jpg",
    product_page_url: productPageUrl,
  };
}

async function withFetchMock(mock, run) {
  const originalFetch = global.fetch;
  global.fetch = mock;
  clearCacheForTests();
  try {
    return await run();
  } finally {
    clearCacheForTests();
    global.fetch = originalFetch;
  }
}

describe("legacy product asset public-network boundary", () => {
  it("does not retain URL credentials in the page-cache key", () => {
    const cacheKey = productPageCacheKey(
      "https://user:private-password@public.example.test/products/apple-ipad-pro-m4",
    );

    assert.match(cacheKey, /^product-page\|[a-f0-9]{64}$/);
    assert.doesNotMatch(cacheKey, /user|private-password|public\.example/i);
  });

  it("blocks literal link-local and private-DNS pages before transport", async () => {
    const directFetches = [];
    let transportCalls = 0;
    const dependencies = {
      resolveHost: async (hostname) =>
        hostname === "metadata.example.test"
          ? ["127.0.0.1"]
          : hostname === "mapped.example.test"
            ? ["::ffff:7f00:1"]
          : [hostname],
      transport: async () => {
        transportCalls += 1;
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: Buffer.from("<html><title>Apple iPad Pro M4</title></html>"),
        };
      },
    };

    const result = await withFetchMock(
      async (input) => {
        directFetches.push(String(input));
        return new Response(
          "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
      () =>
        enrichProductAssets(
          {
            recommendations: [
              networkBoundaryProduct(
                "http://169.254.169.254/products/apple-ipad-pro-m4",
              ),
              networkBoundaryProduct(
                "http://[::1]/products/apple-ipad-pro-m4",
              ),
              networkBoundaryProduct(
                "https://metadata.example.test/products/apple-ipad-pro-m4",
              ),
              networkBoundaryProduct(
                "https://mapped.example.test/products/apple-ipad-pro-m4",
              ),
            ],
          },
          { fetchDependencies: dependencies },
        ),
    );

    assert.deepEqual(
      result.recommendations.map((product) => product.product_page_url),
      ["", "", "", ""],
    );
    assert.deepEqual(directFetches, []);
    assert.equal(transportCalls, 0);
  });

  it("revalidates redirects and clears a page that redirects to private DNS", async () => {
    const directFetches = [];
    const transportedHosts = [];
    const dependencies = {
      resolveHost: async (hostname) =>
        hostname === "store.example.test"
          ? ["93.184.216.34"]
          : ["169.254.169.254"],
      transport: async ({ url }) => {
        transportedHosts.push(url.hostname);
        return {
          status: 302,
          headers: { location: "http://metadata.example.test/latest" },
          body: new Uint8Array(),
        };
      },
    };

    const result = await withFetchMock(
      async (input) => {
        directFetches.push(String(input));
        return new Response(
          "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
      () =>
        enrichProductAssets(
          {
            recommendations: [
              networkBoundaryProduct(
                "https://store.example.test/products/apple-ipad-pro-m4",
              ),
            ],
          },
          { fetchDependencies: dependencies },
        ),
    );

    assert.equal(result.recommendations[0].product_page_url, "");
    assert.deepEqual(directFetches, []);
    assert.deepEqual(transportedHosts, ["store.example.test"]);
  });

  it("rejects oversized HTML before page metadata can be attached", async () => {
    const oversizedHtml = `<html><title>Apple iPad Pro M4</title><body>${"x".repeat(
      1_600_000,
    )}</body></html>`;
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => ({
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from(oversizedHtml),
      }),
    };

    const result = await withFetchMock(
      async () =>
        new Response(oversizedHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      () =>
        enrichProductAssets(
          {
            recommendations: [
              networkBoundaryProduct(
                "https://store.example.test/products/apple-ipad-pro-m4",
              ),
            ],
          },
          { fetchDependencies: dependencies },
        ),
    );

    assert.equal(result.recommendations[0].metadata?.title, undefined);
  });

  it("rejects unsafe URL forms before transport", async () => {
    const directFetches = [];
    let transportCalls = 0;
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => {
        transportCalls += 1;
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: Buffer.from("<html><title>Apple iPad Pro M4</title></html>"),
        };
      },
    };

    const result = await withFetchMock(
      async (input) => {
        directFetches.push(String(input));
        return new Response("ok", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      },
      () =>
        enrichProductAssets(
          {
            recommendations: [
              networkBoundaryProduct("file:///etc/passwd"),
              networkBoundaryProduct("ftp://public.example.test/product"),
              networkBoundaryProduct(
                "https://user:password@public.example.test/products/apple-ipad-pro-m4",
              ),
              networkBoundaryProduct(
                "https://public.example.test:8443/products/apple-ipad-pro-m4",
              ),
            ],
          },
          { fetchDependencies: dependencies },
        ),
    );

    assert.deepEqual(
      result.recommendations.map((product) => product.product_page_url),
      ["", "", "", ""],
    );
    assert.deepEqual(directFetches, []);
    assert.equal(transportCalls, 0);
  });

  it("bounds redirect depth and non-HTML or declared-oversized responses", async () => {
    const directFetches = [];
    const transportCounts = {
      declared: 0,
      redirect: 0,
      timeout: 0,
      unsupported: 0,
    };
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async ({ url }) => {
        if (url.hostname.startsWith("redirect-")) {
          transportCounts.redirect += 1;
          const current = Number.parseInt(url.hostname.split("-")[1], 10);
          return {
            status: 302,
            headers: {
              location: `https://redirect-${current + 1}.example.test/products/apple-ipad-pro-m4`,
            },
            body: new Uint8Array(),
          };
        }
        if (url.hostname === "timeout.example.test") {
          transportCounts.timeout += 1;
          const error = new Error("timeout");
          error.name = "AbortError";
          throw error;
        }
        if (url.hostname === "unsupported.example.test") {
          transportCounts.unsupported += 1;
          return {
            status: 200,
            headers: { "content-type": "application/pdf" },
            body: Buffer.from("%PDF"),
          };
        }
        transportCounts.declared += 1;
        return {
          status: 200,
          headers: {
            "content-length": "1600000",
            "content-type": "text/html",
          },
          body: Buffer.from("<html><title>Apple iPad Pro M4</title></html>"),
        };
      },
    };
    const urls = [
      "https://redirect-0.example.test/products/apple-ipad-pro-m4",
      "https://timeout.example.test/products/apple-ipad-pro-m4",
      "https://unsupported.example.test/products/apple-ipad-pro-m4",
      "https://declared.example.test/products/apple-ipad-pro-m4",
    ];

    const result = await withFetchMock(
      async (input) => {
        directFetches.push(String(input));
        return new Response(
          "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
      () =>
        enrichProductAssets(
          { recommendations: urls.map(networkBoundaryProduct) },
          { fetchDependencies: dependencies },
        ),
    );

    assert.deepEqual(
      result.recommendations.map((product) => product.product_page_url),
      urls,
    );
    assert.deepEqual(
      result.recommendations.map((product) => product.metadata?.title),
      [undefined, undefined, undefined, undefined],
    );
    assert.deepEqual(transportCounts, {
      declared: 1,
      redirect: 3,
      timeout: 1,
      unsupported: 1,
    });
    assert.deepEqual(directFetches, []);
  });

  it("accepts bounded HTML from an exact public page", async () => {
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => ({
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from(
          "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
        ),
      }),
    };
    const url = "https://store.example.test/products/apple-ipad-pro-m4";

    const result = await withFetchMock(
      async () => {
        throw new Error("direct fetch must not be used");
      },
      () =>
        enrichProductAssets(
          { recommendations: [networkBoundaryProduct(url)] },
          { fetchDependencies: dependencies },
        ),
    );

    assert.equal(result.recommendations[0].product_page_url, url);
    assert.equal(result.recommendations[0].metadata?.title?.value, "Apple iPad Pro M4");
  });

  it("caps concurrent product-page enrichment without changing order", async () => {
    const urls = Array.from(
      { length: 9 },
      (_, index) => `https://store-${index}.example.test/products/apple-ipad-pro-m4`,
    );
    let active = 0;
    let maximumActive = 0;
    const hold = async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    };
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => {
        await hold();
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: Buffer.from(
            "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
          ),
        };
      },
    };

    const result = await withFetchMock(
      async () => {
        await hold();
        return new Response(
          "<html><title>Apple iPad Pro M4</title><body>Apple iPad Pro M4</body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
      () =>
        enrichProductAssets(
          { recommendations: urls.map(networkBoundaryProduct) },
          { fetchDependencies: dependencies, concurrency: 4 },
        ),
    );

    assert.deepEqual(
      result.recommendations.map((product) => product.product_page_url),
      urls,
    );
    assert.ok(
      maximumActive <= 4,
      `expected <=4 concurrent page fetches, saw ${maximumActive}`,
    );
  });
});

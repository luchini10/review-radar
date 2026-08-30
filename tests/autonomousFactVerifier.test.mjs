import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTONOMOUS_FACT_VERIFIER_VERSION,
  fetchHybridSource,
  isPublicHybridFetchAddress,
  observeHybridSourceHtml,
  verifyHybridProductSource,
} from "../lib/autonomousFactVerifier.ts";

const observedAt = "2026-07-16T18:00:00.000Z";

function product(overrides = {}) {
  return {
    identity: {
      brand: "Example",
      productName: "Example Model X100",
      model: "X100",
    },
    priceAmount: 199.99,
    currency: "USD",
    seller: "Example Store",
    productUrl: "https://shop.example.com/products/x100",
    imageUrl: null,
    rating: null,
    reviewCount: null,
    ...overrides,
  };
}

function observe(html, url = "https://shop.example.com/products/x100") {
  return observeHybridSourceHtml({
    html,
    requestedUrl: url,
    observedAt,
  });
}

function productJsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

describe("autonomous exact-product fact verifier", () => {
  it("binds price to the exact product entity instead of a cheaper related product", () => {
    const url = "https://www.example.com/products/hz4002";
    const observation = observeHybridSourceHtml({
      html: `
        <html><head><title>Shark HZ4002</title></head><body>
        ${productJsonLd({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: "Shark POWERDETECT Ultra-Light Corded Stick Vacuum HZ4002",
              brand: { "@type": "Brand", name: "Shark" },
              model: "HZ4002",
              sku: "6599393",
              offers: {
                "@type": "Offer",
                price: "329.99",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                seller: { name: "Best Buy" },
                url,
              },
            },
            {
              "@type": "Product",
              name: "Shark Cordless Detect Pro IW3511",
              brand: { "@type": "Brand", name: "Shark" },
              model: "IW3511",
              offers: {
                "@type": "Offer",
                price: "319.99",
                priceCurrency: "USD",
                url: "https://www.example.com/products/iw3511",
              },
            },
          ],
        })}
        <button>Add to cart</button></body></html>`,
      requestedUrl: url,
      observedAt,
    });
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Shark",
          productName: "POWERDETECT Ultra-Light Corded Stick Vacuum",
          model: "HZ4002",
        },
        priceAmount: 319.99,
        productUrl: url,
        rating: 4.8,
        reviewCount: 102,
      }),
      sourceRole: "purchase_page",
      observation,
    });

    assert.equal(AUTONOMOUS_FACT_VERIFIER_VERSION, "oai-hybrid-verifier-v2");
    assert.equal(result.identity.status, "verified");
    assert.equal(result.exactEntityIndex, 0);
    assert.equal(result.price.status, "verified");
    assert.equal(result.price.reason, "provisional_value_replaced");
    assert.equal(result.price.observedValue, 329.99);
    assert.notEqual(result.price.observedValue, 319.99);
    assert.equal(result.currency.observedValue, "USD");
    assert.equal(result.seller.observedValue, "Best Buy");
  });

  it("contradicts editorial evidence when the page exposes a different tested model", () => {
    const observation = observe(`
      <html><head><title>Shark PowerDetect AZ4002 review</title></head><body>
        <h1>Shark PowerDetect AZ4002 Review</h1>
        ${productJsonLd({
          "@type": "Product",
          name: "Shark PowerDetect AZ4002",
          brand: { name: "Shark" },
          model: "AZ4002",
          image: "https://reviews.example/images/az4002.jpg",
        })}
        <table><tr><th>Model Tested</th><td>AZ405KT1</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Shark",
          productName: "PowerDetect Upright Vacuum",
          model: "AZ4002",
        },
      }),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.identity.status, "contradicted");
    assert.equal(result.identity.reason, "different_tested_model_observed");
    assert.equal(result.exactEntityIndex, null);
    assert.equal(result.imageUrl.status, "inconclusive");
    assert.equal(result.imageUrl.reason, "different_tested_model_observed");
    assert.equal(result.editorialModel.status, "contradicted");
    assert.equal(result.editorialModel.reason, "different_tested_model_observed");
    assert.equal(result.editorialModel.observedValue, "AZ405KT1");
    assert.equal(result.purchaseUrl.status, "cleared");
    assert.equal(result.purchaseUrl.reason, "source_role_cannot_establish_offer");
    assert.equal(result.rating.reason, "source_role_cannot_establish_owner_rating");
  });

  it("does not let page-topic Product markup establish professional-test identity or imagery without a tested-model match", () => {
    const cases = [
      {
        identity: {
          brand: "Example",
          productName: "Example C100 office chair",
          model: "C100",
        },
        name: "Example C100 office chair",
        testedModel: null,
        expectedReason: "tested_model_not_exposed",
      },
      {
        identity: {
          brand: "Example",
          productName: "Example B200 blender",
          model: "B200",
        },
        name: "Example B200 blender",
        testedModel: "B201",
        expectedReason: "different_tested_model_observed",
      },
    ];

    for (const testCase of cases) {
      const modelRow = testCase.testedModel
        ? `<table><tr><th>Model Tested</th><td>${testCase.testedModel}</td></tr></table>`
        : "";
      const observation = observe(`
        <html><head><title>${testCase.name} review</title></head><body>
          <h1>${testCase.name} Review</h1>
          ${productJsonLd({
            "@type": "Product",
            name: testCase.name,
            brand: { name: testCase.identity.brand },
            model: testCase.identity.model,
            image: `https://reviews.example/images/${testCase.identity.model.toLowerCase()}.jpg`,
          })}
          ${modelRow}
        </body></html>
      `);
      const result = verifyHybridProductSource({
        product: product({ identity: testCase.identity }),
        sourceRole: "professional_test",
        observation,
      });

      assert.notEqual(result.identity.status, "verified");
      assert.equal(result.identity.reason, testCase.expectedReason);
      assert.equal(result.exactEntityIndex, null);
      assert.notEqual(result.imageUrl.status, "verified");
      assert.equal(result.imageUrl.reason, testCase.expectedReason);
    }
  });

  it("rejects shared-family tested models and clears provisional images without exact tested-model authority", () => {
    const provisionalImage = "https://proposal.example/images/x100-a1.jpg";
    const cases = [
      {
        testedModel: null,
        expectedReason: "tested_model_not_exposed",
      },
      {
        testedModel: "X100 B2",
        expectedReason: "different_tested_model_observed",
      },
    ];

    for (const testCase of cases) {
      const modelRow = testCase.testedModel
        ? `<table><tr><th>Model Tested</th><td>${testCase.testedModel}</td></tr></table>`
        : "";
      const observation = observe(`
        <html><head><title>Example X100 A1 review</title></head><body>
          <h1>Example X100 A1 Review</h1>
          ${productJsonLd({
            "@type": "Product",
            name: "Example X100 A1",
            brand: { name: "Example" },
            model: "X100 A1",
            image: "https://reviews.example/images/x100-a1.jpg",
          })}
          ${modelRow}
        </body></html>
      `);
      const result = verifyHybridProductSource({
        product: product({
          identity: {
            brand: "Example",
            productName: "Example X100 A1",
            model: "X100 A1",
          },
          imageUrl: provisionalImage,
        }),
        sourceRole: "professional_test",
        observation,
      });

      assert.notEqual(result.editorialModel.status, "verified");
      assert.equal(result.editorialModel.reason, testCase.expectedReason);
      assert.notEqual(result.identity.status, "verified");
      assert.equal(result.identity.reason, testCase.expectedReason);
      assert.equal(result.exactEntityIndex, null);
      assert.equal(result.imageUrl.status, "cleared");
      assert.equal(result.imageUrl.reason, testCase.expectedReason);
      assert.equal(result.imageUrl.provisionalValue, provisionalImage);
      assert.equal(result.imageUrl.observedValue, null);
    }
  });

  it("does not let an exact tested-model row authorize sibling Product markup", () => {
    const observation = observe(`
      <html><head><title>Example X100 comparison</title></head><body>
        <h1>Example X100 comparison</h1>
        ${productJsonLd({
          "@type": "Product",
          name: "Example X100 B2",
          brand: { name: "Example" },
          model: "X100 B2",
          image: "https://reviews.example/images/x100-b2.jpg",
        })}
        <table><tr><th>Model Tested</th><td>X100 A1</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Example",
          productName: "Example X100 A1",
          model: "X100 A1",
        },
      }),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.editorialModel.status, "verified");
    assert.equal(result.identity.status, "contradicted");
    assert.equal(result.identity.reason, "exact_product_not_found");
    assert.equal(result.exactEntityIndex, null);
    assert.notEqual(result.imageUrl.status, "verified");
    assert.equal(result.imageUrl.observedValue, null);
  });

  it("does not let a target-looking Product name override an unrelated explicit model", () => {
    const observation = observe(`
      <html><head><title>Example X100 A1 review</title></head><body>
        <h1>Example X100 A1 review</h1>
        ${productJsonLd({
          "@type": "Product",
          name: "Example X100 A1",
          brand: { name: "Example" },
          model: "B900",
          image: "https://reviews.example/images/b900.jpg",
        })}
        <table><tr><th>Model Tested</th><td>X100 A1</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Example",
          productName: "Example X100 A1",
          model: "X100 A1",
        },
      }),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.editorialModel.status, "verified");
    assert.equal(result.identity.status, "contradicted");
    assert.equal(result.identity.reason, "exact_product_not_found");
    assert.equal(result.exactEntityIndex, null);
    assert.notEqual(result.imageUrl.status, "verified");
    assert.equal(result.imageUrl.observedValue, null);
  });

  it("does not let another exact entity identifier override an unrelated explicit model", () => {
    const observation = observe(`
      <html><head><title>Example X100 A1 review</title></head><body>
        ${productJsonLd({
          "@type": "Product",
          name: "Example X100 A1",
          brand: { name: "Example" },
          model: "B900",
          sku: "X100 A1",
          image: "https://reviews.example/images/b900.jpg",
        })}
        <table><tr><th>Model Tested</th><td>X100 A1</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Example",
          productName: "Example X100 A1",
          model: "X100 A1",
        },
      }),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.editorialModel.status, "verified");
    assert.equal(result.identity.status, "contradicted");
    assert.equal(result.exactEntityIndex, null);
    assert.notEqual(result.imageUrl.status, "verified");
  });

  it("falls back from an unavailable Product model to an exact SKU or exact name", () => {
    const cases = [
      {
        name: "Example review topic",
        sku: "X100 A1",
      },
      {
        name: "Example X100 A1",
        sku: "",
      },
    ];

    for (const testCase of cases) {
      const observation = observe(`
        <html><head><title>Example X100 A1 review</title></head><body>
          ${productJsonLd({
            "@type": "Product",
            name: testCase.name,
            brand: { name: "Example" },
            model: "",
            sku: testCase.sku,
            image: "https://reviews.example/images/x100-a1.jpg",
          })}
          <table><tr><th>Model Tested</th><td>X100 A1</td></tr></table>
        </body></html>
      `);
      const result = verifyHybridProductSource({
        product: product({
          identity: {
            brand: "Example",
            productName: "Example X100 A1",
            model: "X100 A1",
          },
        }),
        sourceRole: "professional_test",
        observation,
      });

      assert.equal(result.editorialModel.status, "verified");
      assert.equal(result.identity.status, "verified");
      assert.equal(result.exactEntityIndex, 0);
      assert.equal(result.imageUrl.status, "verified");
    }
  });

  it("accepts an exact tested-model member of an explicit proposed alias set", () => {
    const observation = observe(`
      <html><head><title>Miele Guard L1 Cat & Dog review</title></head><body>
        <h1>Miele Guard L1 Cat & Dog Review</h1>
        ${productJsonLd({
          "@type": "Product",
          name: "Miele Guard L1 Cat & Dog",
          brand: { name: "Miele" },
          model: "SUZE0",
          sku: "12704570",
          image: "https://reviews.example/images/guard-l1.jpg",
        })}
        <table><tr><th>Model Tested</th><td>SUZE0</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Miele",
          productName: "Guard L1 Cat & Dog",
          model: "12704570 / SUZE0",
        },
      }),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.editorialModel.status, "verified");
    assert.equal(result.editorialModel.observedValue, "SUZE0");
    assert.equal(result.identity.status, "verified");
    assert.equal(result.exactEntityIndex, 0);
    assert.equal(result.imageUrl.status, "verified");
  });

  it("keeps professional-test exact identity and imagery when tested-model evidence matches", () => {
    const observation = observe(`
      <html><head><title>Example X100 review</title></head><body>
        <h1>Example X100 Review</h1>
        ${productJsonLd({
          "@type": "Product",
          name: "Example Model X100",
          brand: { name: "Example" },
          model: "X100",
          image: "https://reviews.example/images/x100.jpg",
        })}
        <table><tr><th>Model Tested</th><td>X100</td></tr></table>
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product(),
      sourceRole: "professional_test",
      observation,
    });

    assert.equal(result.editorialModel.status, "verified");
    assert.equal(result.identity.status, "verified");
    assert.equal(result.exactEntityIndex, 0);
    assert.equal(result.imageUrl.status, "verified");
    assert.equal(
      result.imageUrl.observedValue,
      "https://reviews.example/images/x100.jpg",
    );
  });

  it("keeps exact Miele identity and price but does not claim dealer-only availability", () => {
    const url = "https://www.example.com/product/12704570/guard-l1";
    const observation = observeHybridSourceHtml({
      html: `
        <html><body>${productJsonLd({
          "@type": "Product",
          name: "Miele Guard L1 Cat & Dog",
          brand: { name: "Miele" },
          model: "SUZE0",
          sku: "12704570",
          offers: {
            "@type": "Offer",
            price: 899,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url,
          },
        })}<h1>Guard L1 Cat & Dog</h1><a>Find a dealer</a></body></html>`,
      requestedUrl: url,
      observedAt,
    });
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Miele",
          productName: "Guard L1 Cat & Dog",
          model: "12704570 / SUZE0",
        },
        priceAmount: 899,
        productUrl: url,
      }),
      sourceRole: "official_product",
      observation,
    });

    assert.equal(result.identity.status, "verified");
    assert.equal(result.price.status, "verified");
    assert.equal(result.price.observedValue, 899);
    assert.equal(result.purchaseUrl.status, "verified");
    assert.equal(result.availability.status, "unavailable");
    assert.equal(result.availability.reason, "dealer_only_no_direct_purchase");
  });

  it("keeps exact Dyson offer facts while clearing an unavailable review breakdown", () => {
    const url = "https://www.example.com/vacuum-cleaners/cordless/v16";
    const observation = observeHybridSourceHtml({
      html: `
        <html><body>${productJsonLd({
          "@type": "Product",
          name: "Dyson V16 Piston Animal cordless vacuum",
          brand: { name: "Dyson" },
          model: "V16 Piston Animal",
          offers: {
            "@type": "Offer",
            price: 979.99,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url,
          },
        })}<button>Add to basket</button><p>Reviews are temporarily unavailable</p></body></html>`,
      requestedUrl: url,
      observedAt,
    });
    const result = verifyHybridProductSource({
      product: product({
        identity: {
          brand: "Dyson",
          productName: "V16 Piston Animal cordless vacuum",
          model: "V16 Piston Animal",
        },
        priceAmount: 979.99,
        productUrl: url,
        rating: 4,
        reviewCount: 1944,
      }),
      sourceRole: "official_product",
      observation,
    });

    assert.equal(result.identity.status, "verified");
    assert.equal(result.price.observedValue, 979.99);
    assert.equal(result.rating.status, "unavailable");
    assert.equal(result.rating.reason, "reviews_currently_unavailable");
    assert.equal(result.reviewCount.status, "unavailable");
    assert.equal(result.reviewCount.observedValue, null);
  });

  it("does not use page titles or a single related entity as exact-product proof", () => {
    const observation = observe(`
      <html><head><title>Example X100</title></head><body>
      ${productJsonLd({
        "@type": "Product",
        name: "Example X200",
        brand: { name: "Example" },
        model: "X200",
        offers: { price: 199.99, priceCurrency: "USD" },
      })}
      </body></html>
    `);
    const result = verifyHybridProductSource({
      product: product(),
      sourceRole: "purchase_page",
      observation,
    });
    assert.equal(result.identity.status, "contradicted");
    assert.equal(result.identity.reason, "exact_product_not_found");
    assert.equal(result.price.status, "cleared");
  });
});

describe("bounded hybrid fetch seam", () => {
  const publicResolver = async () => ["93.184.216.34"];
  const htmlTransport = async () => ({
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: Buffer.from("<html><body>ok</body></html>"),
  });

  it("blocks non-public and mapped private addresses", () => {
    assert.equal(isPublicHybridFetchAddress("127.0.0.1"), false);
    assert.equal(isPublicHybridFetchAddress("10.0.0.1"), false);
    assert.equal(isPublicHybridFetchAddress("169.254.169.254"), false);
    assert.equal(isPublicHybridFetchAddress("::1"), false);
    assert.equal(isPublicHybridFetchAddress("::ffff:127.0.0.1"), false);
    assert.equal(isPublicHybridFetchAddress("93.184.216.34"), true);
    assert.equal(isPublicHybridFetchAddress("2606:2800:220:1:248:1893:25c8:1946"), true);
  });

  it("rejects credentials, non-default ports, and private DNS results before transport", async () => {
    let transports = 0;
    const transport = async () => {
      transports += 1;
      return htmlTransport();
    };
    const credentials = await fetchHybridSource(
      "https://user:secret@example.com/product",
      { resolveHost: publicResolver, transport },
    );
    const port = await fetchHybridSource("https://example.com:8443/product", {
      resolveHost: publicResolver,
      transport,
    });
    const privateHost = await fetchHybridSource("http://metadata.test/latest", {
      resolveHost: async () => ["169.254.169.254"],
      transport,
    });
    assert.equal(credentials.ok, false);
    assert.equal(credentials.reason, "credentials_forbidden");
    assert.equal(port.ok, false);
    assert.equal(port.reason, "non_default_port");
    assert.equal(privateHost.ok, false);
    assert.equal(privateHost.reason, "non_public_address");
    assert.equal(transports, 0);
  });

  it("revalidates DNS after redirects and blocks a private redirect target", async () => {
    let attempts = 0;
    const result = await fetchHybridSource("https://example.com/product", {
      resolveHost: async (host) =>
        host === "example.com" ? ["93.184.216.34"] : ["127.0.0.1"],
      transport: async () => {
        attempts += 1;
        return {
          status: 302,
          headers: { location: "http://internal.test/admin" },
          body: new Uint8Array(),
        };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "non_public_address");
    assert.equal(result.attempts, 1);
    assert.equal(attempts, 1);
  });

  it("returns a bounded HTML envelope without exposing request headers", async () => {
    const result = await fetchHybridSource("https://example.com/product", {
      resolveHost: publicResolver,
      transport: htmlTransport,
    });
    assert.equal(result.ok, true);
    assert.equal(result.attempts, 1);
    assert.equal(result.redirectCount, 0);
    assert.equal(result.contentType, "text/html");
    assert.equal(result.body, "<html><body>ok</body></html>");
    assert.equal(typeof result.contentHash, "string");
    assert.equal(Object.hasOwn(result, "headers"), false);
  });

  it("fails closed on unsupported content and oversized bodies", async () => {
    const pdf = await fetchHybridSource("https://example.com/guide.pdf", {
      resolveHost: publicResolver,
      transport: async () => ({
        status: 200,
        headers: { "content-type": "application/pdf" },
        body: Buffer.from("%PDF"),
      }),
    });
    const oversized = await fetchHybridSource(
      "https://example.com/large",
      {
        resolveHost: publicResolver,
        transport: async () => ({
          status: 200,
          headers: { "content-type": "text/html" },
          body: Buffer.alloc(32),
        }),
      },
      {
        maxRedirects: 2,
        maxBytes: 16,
        timeoutMs: 1000,
        allowedContentTypes: ["text/html"],
      },
    );
    assert.equal(pdf.ok, false);
    assert.equal(pdf.reason, "unsupported_content_type");
    assert.equal(oversized.ok, false);
    assert.equal(oversized.reason, "response_too_large");
  });

  it("does not parse final bot-wall or missing-page HTML", async () => {
    const result = await fetchHybridSource("https://example.com/product", {
      resolveHost: publicResolver,
      transport: async () => ({
        status: 403,
        headers: { "content-type": "text/html" },
        body: Buffer.from("<html><body>Access denied</body></html>"),
      }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "http_status_not_usable");
    assert.equal(result.status, 403);
  });
});

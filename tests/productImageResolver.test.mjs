import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractProductImageCandidatesFromHtml,
  resolveBestProductImage,
  validateProductImageCandidate,
} from "../lib/productImageResolver.ts";

const context = {
  brand: "Apple",
  category: "Tablet",
  modelNumber: "M4",
  pageUrl: "https://www.apple.com/ipad-pro/",
  productName: "Apple iPad Pro M4",
};

describe("product image resolver", () => {
  it("accepts a relevant HTTPS product image URL", () => {
    const result = validateProductImageCandidate(
      {
        evidenceText: "Apple iPad Pro M4 product image",
        source: "serp",
        url: "https://store.storeimages.cdn-apple.com/ipad-pro-m4-product-image.jpg",
      },
      context,
    );

    assert.equal(result.accepted, true);

    if (result.accepted) {
      assert.equal(result.confidence, "high");
    }
  });

  it("rejects logos, icons, placeholders, sprites, and tiny images", () => {
    const urls = [
      "https://example.com/logo.png",
      "https://example.com/favicon.ico",
      "https://example.com/no-image.jpg",
      "https://example.com/sprite.png",
      "https://example.com/products/apple-ipad-pro-80x80.jpg",
      "https://m.media-amazon.com/images/G/01/digital/video/merch/Other/countdown-product-banner.gif",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          evidenceText: "Apple iPad Pro M4",
          source: "metadata",
          url,
        },
        context,
      );

      assert.equal(result.accepted, false, url);
    }
  });

  it("extracts og:image, twitter:image, JSON-LD, and matching page images", () => {
    const candidates = extractProductImageCandidatesFromHtml(
      `
        <html>
          <head>
            <meta property="og:image" content="/images/apple-ipad-pro-og.jpg">
            <meta name="twitter:image" content="https://cdn.example.com/apple-ipad-pro-twitter.webp">
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Apple iPad Pro M4",
                "image": ["https://cdn.example.com/apple-ipad-pro-jsonld.jpg"]
              }
            </script>
          </head>
          <body>
            <h1>Apple iPad Pro M4</h1>
            <img src="/media/apple-ipad-pro-main.jpg" alt="Apple iPad Pro M4 front view" width="900" height="700">
          </body>
        </html>
      `,
      context.pageUrl,
      context,
    );
    const urls = candidates.map((candidate) => candidate.url);

    assert.ok(urls.includes("/images/apple-ipad-pro-og.jpg"));
    assert.ok(urls.includes("https://cdn.example.com/apple-ipad-pro-twitter.webp"));
    assert.ok(urls.includes("https://cdn.example.com/apple-ipad-pro-jsonld.jpg"));
    assert.ok(urls.includes("/media/apple-ipad-pro-main.jpg"));
  });

  it("prefers trusted existing images before product-page metadata", () => {
    const resolution = resolveBestProductImage(
      [
        {
          evidenceText: "Apple iPad Pro M4 listing",
          source: "existing",
          url: "https://retailer.example.com/images/apple-ipad-pro-listing.jpg",
        },
        {
          evidenceText: "Apple iPad Pro M4",
          source: "metadata",
          url: "https://www.apple.com/images/apple-ipad-pro-metadata.jpg",
        },
      ],
      context,
    );

    assert.equal(
      resolution.url,
      "https://retailer.example.com/images/apple-ipad-pro-listing.jpg",
    );
    assert.equal(resolution.confidence, "high");
  });

  it("returns no safe image after all candidates are rejected", () => {
    const resolution = resolveBestProductImage(
      [
        {
          evidenceText: "Apple iPad Pro M4",
          source: "metadata",
          url: "https://example.com/placeholder.svg",
        },
        {
          evidenceText: "Unrelated sofa",
          source: "page_image",
          url: "https://example.com/images/blue-sofa-product.jpg",
        },
      ],
      context,
    );

    assert.equal(resolution.url, "");
    assert.equal(resolution.confidence, "none");
    assert.equal(resolution.rejected.length, 2);
  });
});

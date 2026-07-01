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
  it("does not throw on a malformed image URL (bad % escape)", () => {
    // Regression: a literal "%" (e.g. "50% off") made decodeURIComponent throw
    // URIError and crashed the whole search (HTTP 502).
    assert.doesNotThrow(() => {
      validateProductImageCandidate(
        {
          evidenceText: "Apple iPad Pro M4",
          source: "serp",
          url: "https://img.example.com/sale-50%off-ipad.jpg",
        },
        context,
      );
    });
  });

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

  it("rejects RR-061 page URLs and truncated image directories", () => {
    const urls = [
      "https://images.thdstatic.com/productImages/",
      "https://www.greenworksofficial.com/products/40v-cordless-axial-leaf-blower-2416102az",
      "https://www.blackanddecker.com/products/bcbl700d1",
      "https://www.lg.com/us/images/360/he/monitors/39GX90SA-W.html",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          evidenceText: "Apple iPad Pro M4",
          source: "existing",
          url,
        },
        context,
      );

      assert.equal(result.accepted, false, url);
    }
  });

  it("rejects generic navigation, category, editorial, and brand artwork", () => {
    const urls = [
      "https://cdn.example.com/images/top-nav-image-home-and-rec.webp",
      "https://cdn.example.com/images/dog-food-category-hero.jpg",
      "https://cdn.example.com/images/review-best-tablets-thumbnail.jpg",
      "https://cdn.example.com/images/brand-beyond-belief-banner.png",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          evidenceText: "Apple iPad Pro M4",
          source: "existing",
          url,
        },
        context,
      );

      assert.equal(result.accepted, false, url);
    }
  });

  it("accepts a hashed CDN asset when same-product source context is verified", () => {
    const result = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Apple iPad Pro M4 retailer product offer",
        source: "trusted_metadata",
        url: "https://cdn.example.com/assets/8f93a2b717c4",
      },
      context,
    );

    assert.equal(result.accepted, true);
  });

  it("does not bind unrelated JSON-LD or generic social metadata to the target", () => {
    const candidates = extractProductImageCandidatesFromHtml(
      `
        <html>
          <head>
            <title>Shop All Tablets</title>
            <meta property="og:title" content="Best tablets and accessories">
            <meta property="og:image" content="/images/tablet-category-hero.jpg">
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Product",
                    "name": "Unrelated Android Tablet Z10",
                    "image": "https://cdn.example.com/images/android-z10.jpg"
                  },
                  {
                    "@type": "Product",
                    "name": "Apple iPad Pro M4",
                    "image": "https://cdn.example.com/assets/ipad-m4-hash.webp"
                  }
                ]
              }
            </script>
          </head>
        </html>
      `,
      "https://retailer.example.com/tablets",
      context,
    );
    const resolution = resolveBestProductImage(candidates, context);

    assert.equal(
      resolution.url,
      "https://cdn.example.com/assets/ipad-m4-hash.webp",
    );
    assert.ok(
      resolution.rejected.some((item) =>
        item.url.includes("tablet-category-hero"),
      ),
    );
    assert.ok(
      !candidates.some((candidate) => candidate.url.includes("android-z10")),
    );
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

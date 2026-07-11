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

  it("rejects retailer flyout, menu, department, and layout artwork", () => {
    const urls = [
      "https://images.example.com/site/flyout_72dpi.png",
      "https://images.example.com/assets/mega-menu-tablets.webp",
      "https://images.example.com/departments/electronics.jpg",
      "https://images.example.com/layout/header-tablet.png",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          contextVerified: true,
          evidenceText: "Apple iPad Pro M4 product page",
          source: "trusted_metadata",
          url,
        },
        context,
      );

      assert.equal(result.accepted, false, url);
    }
  });

  it("rejects the reopened RR-061 Amazon flyout asset for unrelated products", () => {
    const url =
      "https://images-na.ssl-images-amazon.com/images/G/01/omaha/images/yoda/flyout_72dpi._V270255989_.png";
    const products = [
      "Amazon.com: RIDGID Wet Dry Vacuums VAC4000 Powerful and ...",
      "Fein Turbo I Wet/Dry Dust Extractor, Ultra-Quiet Vacuum - Amazon.com",
    ];

    for (const productName of products) {
      const result = validateProductImageCandidate(
        {
          evidenceText: "",
          source: "existing",
          url,
        },
        {
          category: "shop vac",
          productName,
        },
      );

      assert.equal(result.accepted, false, productName);
    }
  });

  it("does not use retailer/domain words alone as product-image identity", () => {
    const result = validateProductImageCandidate(
      {
        evidenceText: "",
        source: "existing",
        url: "https://images-na.ssl-images-amazon.com/assets/site-shell-83a91.png",
      },
      {
        category: "shop vac",
        productName:
          "Amazon.com: RIDGID Wet Dry Vacuums VAC4000 Powerful and ...",
      },
    );

    assert.equal(result.accepted, false);
  });

  it("keeps a real Amazon product image with same-product context", () => {
    const result = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Apple iPad Pro M4 retailer product offer",
        source: "trusted_metadata",
        url: "https://m.media-amazon.com/images/I/71A1b2C3d4L.jpg",
      },
      context,
    );

    assert.equal(result.accepted, true);
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

describe("RR-061 wrong-model image identity (Phase R1)", () => {
  const roborockContext = {
    brand: "Roborock",
    category: "Robot vacuum",
    modelNumber: null,
    pageUrl: "https://global.roborock.com/pages/roborock-q5-max-plus",
    productName: "Roborock Q5 Max+",
  };
  const roombaContext = {
    brand: "iRobot",
    category: "Robot vacuum",
    pageUrl: "https://www.example.com/roomba-j7-plus",
    productName: "iRobot Roomba j7+",
  };

  it("rejects a verified-page image whose filename names a different model", () => {
    // Live reproduction (fresh Phase 6D restart, B1): Saros Z70 artwork rendered
    // on the Roborock Q5 Max+ card because verified page context outweighed the
    // explicit conflicting model identity in the image path.
    const result = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Roborock Q5 Max+ robot vacuum product page",
        source: "page_image",
        url: "https://global.roborock.com/cdn/shop/files/Saros_Z70_Silver_ID.png?v=1758784729",
      },
      roborockContext,
    );

    assert.equal(result.accepted, false);

    if (!result.accepted) {
      assert.match(result.rejection.reason, /different model/);
    }
  });

  it("rejects cross-product model filenames from any candidate source", () => {
    const result = validateProductImageCandidate(
      {
        evidenceText: "iRobot Roomba j7+ robot vacuum",
        source: "serp",
        url: "https://cdn.example.com/images/eufy_l60_self_empty_station.jpg",
      },
      roombaContext,
    );

    assert.equal(result.accepted, false);
  });

  it("keeps a same-model filename on the verified page", () => {
    const result = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Roborock Q5 Max+ robot vacuum product page",
        source: "page_image",
        url: "https://global.roborock.com/cdn/shop/files/roborock_q5_max_plus_black.png",
      },
      roborockContext,
    );

    assert.equal(result.accepted, true);
  });

  it("keeps hashed CDN, Amazon-modifier, retina, and dimension tokens", () => {
    const urls = [
      "https://m.media-amazon.com/images/I/81ZoWDnHkkL._AC_SL1500_.jpg",
      "https://cdn.example.com/images/roomba-j7-plus-lifestyle-800x600-v2.jpg",
      "https://cdn.example.com/images/roomba-front@2x.jpg",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          contextVerified: true,
          evidenceText: "iRobot Roomba j7+ retailer product offer",
          source: "trusted_metadata",
          url,
        },
        roombaContext,
      );

      assert.equal(result.accepted, true, url);
    }
  });

  it("stays inert when the product itself carries no model identity", () => {
    const result = validateProductImageCandidate(
      {
        evidenceText: "Lodge Cast Iron Skillet 10 inch",
        source: "serp",
        url: "https://cdn.example.com/images/lodge-skillet-l8sk3-10in.jpg",
      },
      {
        brand: "Lodge",
        category: "Skillet",
        pageUrl: "https://www.example.com/lodge-skillet",
        productName: "Lodge Cast Iron Skillet",
      },
    );

    assert.equal(result.accepted, true);
  });
});

describe("RR-061 page-image provenance and split family identity", () => {
  const contexts = [
    {
      brand: "Roborock",
      category: "Robot vacuum",
      pageUrl: "https://us.roborock.com/products/roborock-q10-x5-plus",
      productName: "Roborock Q10 X5+ Robot Vacuum and Mop with Auto-Empty Dock",
      url: "https://us.roborock.com/cdn/shop/files/2_QRevo_Curv_QRevo_Edge_140x.jpg?v=1757937105",
    },
    {
      brand: "Roborock",
      category: "Robot vacuum",
      pageUrl: "https://us.roborock.com/products/roborock-q10-s5-plus",
      productName: "Roborock Q10 S5+ Robot Vacuum and Mop Combo",
      url: "https://us.roborock.com/cdn/shop/files/2_QRevo_Curv_QRevo_Edge_140x.jpg?v=1757937105",
    },
    {
      brand: "Roborock",
      category: "Robot vacuum",
      pageUrl: "https://us.roborock.com/products/roborock-q7-max-plus",
      productName: "Roborock Q7 Max+ Robot Vacuum with Auto-Empty Dock Pure",
      url: "https://us.roborock.com/cdn/shop/files/Saros_20_Black_ID.png?v=1765951179",
    },
  ];

  it("rejects all three R2 foreign-family filenames despite verified page context", () => {
    for (const item of contexts) {
      const result = validateProductImageCandidate(
        {
          contextVerified: true,
          evidenceText: `${item.productName} product image`,
          source: "page_image",
          url: item.url,
        },
        item,
      );

      assert.equal(result.accepted, false, item.productName);

      if (!result.accepted) {
        assert.match(result.rejection.reason, /different model/);
      }
    }
  });

  it("does not let verified page identity authenticate an unrelated page image", () => {
    const target = contexts[0];
    const candidates = extractProductImageCandidatesFromHtml(
      `
        <html>
          <head><title>${target.productName}</title></head>
          <body>
            <h1>${target.productName}</h1>
            <img src="/cdn/shop/files/unrelated-floor-cleaner.jpg" alt="Recommended product">
          </body>
        </html>
      `,
      target.pageUrl,
      target,
      { pageIdentityVerified: true },
    );
    const pageImage = candidates.find((candidate) => candidate.source === "page_image");

    assert.equal(pageImage?.contextVerified, false);
    assert.equal(resolveBestProductImage(candidates, target).url, "");
  });

  it("keeps image-level matches and prefers matching Product JSON-LD over foreign page art", () => {
    const target = contexts[0];
    const candidates = extractProductImageCandidatesFromHtml(
      `
        <html>
          <head>
            <title>${target.productName}</title>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "${target.productName}",
                "image": "https://cdn.example.com/q10-x5-plus-main.jpg"
              }
            </script>
          </head>
          <body>
            <img src="${target.url}" alt="${target.productName}">
            <img src="/cdn/shop/files/q10-x5-plus-side.jpg" alt="${target.productName} side view">
          </body>
        </html>
      `,
      target.pageUrl,
      target,
      { pageIdentityVerified: true },
    );
    const resolution = resolveBestProductImage(candidates, target);

    assert.equal(resolution.source, "json_ld");
    assert.equal(resolution.url, "https://cdn.example.com/q10-x5-plus-main.jpg");
    assert.ok(
      resolution.rejected.some((item) => item.url.includes("QRevo_Curv")),
    );
    assert.ok(
      candidates.some(
        (candidate) =>
          candidate.source === "page_image" &&
          candidate.url.includes("q10-x5-plus-side"),
      ),
    );
  });

  it("preserves neutral and same-model filenames", () => {
    const target = contexts[0];
    const urls = [
      "https://cdn.example.com/8f93a2b717c4.jpg",
      "https://cdn.example.com/q10_x5_front_black_140x.jpg",
      "https://cdn.example.com/product_front_2_black_20.jpg",
      "https://m.media-amazon.com/images/I/81ZoWDnHkkL._AC_SL1500_.jpg",
    ];

    for (const url of urls) {
      const result = validateProductImageCandidate(
        {
          contextVerified: true,
          evidenceText: `${target.productName} product image`,
          source: "page_image",
          url,
        },
        target,
      );

      assert.equal(result.accepted, true, url);
    }
  });

  it("distinguishes split family models from a family-adjacent size", () => {
    const wrongGeneration = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Roborock Saros 10 robot vacuum product image",
        source: "page_image",
        url: "https://cdn.example.com/Saros_20_Black_ID.png",
      },
      {
        brand: "Roborock",
        category: "Robot vacuum",
        productName: "Roborock Saros 10 Robot Vacuum",
      },
    );
    const neutralSize = validateProductImageCandidate(
      {
        contextVerified: true,
        evidenceText: "Apple iPad Pro M4 product image",
        source: "page_image",
        url: "https://cdn.example.com/ipad_11_front_black.jpg",
      },
      context,
    );

    assert.equal(wrongGeneration.accepted, false);
    assert.equal(neutralSize.accepted, true);
  });
});

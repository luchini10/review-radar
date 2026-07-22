import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_ASSET_VERIFIER_VERSION,
  verifyDirectTerraAssetCandidates,
} from "../lib/directTerraAssetVerifier.ts";

const q7 = {
  key: "rank-1-q7-m5-plus",
  rank: 1,
  productName: "Roborock Q7 M5+ Robot Vacuum",
  brand: "Roborock",
  model: "Q7 M5+",
  category: "robot vacuum",
};

const ridgid = {
  key: "rank-2-hd1600",
  rank: 2,
  productName: "RIDGID HD1600 Wet/Dry Shop Vacuum",
  brand: "RIDGID",
  model: "HD1600",
  category: "shop vacuum",
};

const shoppingResult = (overrides = {}) => ({
  title: "Roborock Q7 M5+ Robot Vacuum and Mop with Auto-Empty Dock",
  productUrl: "https://merchant.example/products/roborock-q7-m5-plus?utm_source=shopping&variant=q7m5",
  imageUrl: "https://images.example.com/products/roborock-q7-m5-plus.jpg",
  snippet: "Robot vacuum and mop with an auto-empty dock.",
  ...overrides,
});

describe("Direct-Terra asset safety boundary", () => {
  it("accepts only identity-safe product-page and image assets without changing Terra rank or name", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [shoppingResult()],
    });

    assert.equal(result.verifierVersion, DIRECT_TERRA_ASSET_VERIFIER_VERSION);
    assert.equal(result.targetKey, q7.key);
    assert.equal(result.rank, q7.rank);
    assert.equal(result.productName, q7.productName);
    assert.equal(
      result.productUrl,
      "https://merchant.example/products/roborock-q7-m5-plus?variant=q7m5",
    );
    assert.equal(
      result.imageUrl,
      "https://images.example.com/products/roborock-q7-m5-plus.jpg",
    );
    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
  });

  it("removes only conservative tracking and preserves identity parameters and fragments", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          productUrl:
            "https://merchant.example/products/roborock-q7-m5-plus?utm_source=shopping&ref=identity-token&variant=q7m5#configuration/black",
        }),
      ],
    });

    assert.equal(
      result.productUrl,
      "https://merchant.example/products/roborock-q7-m5-plus?ref=identity-token&variant=q7m5#configuration/black",
    );
  });

  it("rejects the RR-090 cross-model URL and does not trust an image from the conflicted row", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          productUrl: "https://us.roborock.com/products/roborock-q10-x5-plus",
        }),
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.productUrlStatus, "unavailable");
    assert.equal(result.imageUrlStatus, "unavailable");
    assert.equal(result.decisions[0].productUrlReason, "product_url_identity_mismatch");
    assert.equal(result.decisions[0].imageUrlReason, "candidate_product_url_not_safe");
  });

  it("rejects RR-061 wrong-model image filenames while preserving a safe product page", () => {
    const q10 = {
      ...q7,
      key: "rank-1-q10-x5-plus",
      productName: "Roborock Q10 X5+ Robot Vacuum",
      model: "Q10 X5+",
    };
    const result = verifyDirectTerraAssetCandidates({
      target: q10,
      candidates: [
        shoppingResult({
          title: "Roborock Q10 X5+ Robot Vacuum",
          productUrl: "https://us.roborock.com/products/roborock-q10-x5-plus",
          imageUrl: "https://images.example.com/products/roborock-q10-s5.jpg",
        }),
      ],
    });

    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrl, null);
    assert.equal(result.imageUrlStatus, "unavailable");
    assert.match(result.decisions[0].imageUrlReason, /different model/i);
  });

  it("rejects RR-061 family-name sibling images even when filenames use split model tokens", () => {
    const candidates = [
      shoppingResult({
        imageUrl: "https://cdn.example.com/2_QRevo_Curv_QRevo_Edge_140x.jpg",
      }),
      shoppingResult({
        imageUrl: "https://cdn.example.com/Saros_20_Black_ID.png",
      }),
    ];
    const result = verifyDirectTerraAssetCandidates({ target: q7, candidates });

    assert.equal(result.imageUrl, null);
    assert.equal(result.imageUrlStatus, "unavailable");
    assert.ok(result.decisions.every((decision) => decision.imageUrlAccepted === false));
  });

  it("rejects RR-078 support, editorial, review, and article destinations", () => {
    const urls = [
      "https://www.shopvac.com/pages/customer-service",
      "https://pocketables.com/2026/07/ridgid-hd1600-review.html",
      "https://matteralpha.com/news/ridgid-hd1600-shop-vacuum",
      "https://example.com/articles/best-ridgid-hd1600-vacuums",
    ];

    for (const productUrl of urls) {
      const result = verifyDirectTerraAssetCandidates({
        target: ridgid,
        candidates: [
          {
            title: "RIDGID HD1600 Wet/Dry Shop Vacuum",
            productUrl,
            imageUrl: null,
          },
        ],
      });
      assert.equal(result.productUrl, null, productUrl);
    }
  });

  it("rejects filters and hoses whose titles and URLs repeat the target model", () => {
    const candidates = [
      {
        title: "Replacement Filter Compatible with RIDGID HD1600 Vacuum",
        productUrl: "https://merchant.example/products/ridgid-hd1600-filter",
        imageUrl: "https://merchant.example/images/ridgid-hd1600-filter.jpg",
      },
      {
        title: "Replacement Hose Fits RIDGID HD1600 Vacuum",
        productUrl: "https://merchant.example/products/ridgid-hd1600-hose",
        imageUrl: "https://merchant.example/images/ridgid-hd1600-hose.jpg",
      },
    ];
    const result = verifyDirectTerraAssetCandidates({ target: ridgid, candidates });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.ok(
      result.decisions.every(
        (decision) => decision.identityReason === "wrong_product_type",
      ),
    );
  });

  it("rejects Google wrappers and search/listing URLs as product destinations", () => {
    const candidates = [
      shoppingResult({
        productUrl: "https://www.google.com/search?tbm=shop&q=Roborock+Q7+M5%2B",
      }),
      shoppingResult({
        productUrl: "https://merchant.example/search?q=roborock-q7-m5-plus",
      }),
      shoppingResult({
        productUrl: "https://merchant.example/category/robot-vacuums/q7-m5-plus",
      }),
    ];
    const result = verifyDirectTerraAssetCandidates({ target: q7, candidates });

    assert.equal(result.productUrl, null);
    assert.ok(result.decisions.every((decision) => decision.productUrlAccepted === false));
  });

  it("rejects affiliate, deeplink, click, tracking, and redirect wrappers", () => {
    const urls = [
      "https://click.linksynergy.com/deeplink?id=123&mid=456&murl=https%3A%2F%2Fmerchant.example%2Fproducts%2Froborock-q7-m5-plus",
      "https://redirect.example/products/roborock-q7-m5-plus/redirect?destination=merchant",
      "https://tracking.example/click/products/roborock-q7-m5-plus",
      "https://affiliate.example/deeplink/products/roborock-q7-m5-plus",
    ];

    for (const productUrl of urls) {
      const result = verifyDirectTerraAssetCandidates({
        target: q7,
        candidates: [shoppingResult({ productUrl })],
      });
      assert.equal(result.productUrl, null, productUrl);
      assert.equal(
        result.decisions[0].productUrlReason,
        "product_url_redirect_wrapper",
      );
    }
  });

  it("rejects loopback, private-network, local-name, and literal-IP destinations", () => {
    const urls = [
      "http://localhost/products/roborock-q7-m5-plus",
      "http://192.168.1.25/products/roborock-q7-m5-plus",
      "https://10.0.0.8/products/roborock-q7-m5-plus",
      "http://[::1]/products/roborock-q7-m5-plus",
      "https://inventory.local/products/roborock-q7-m5-plus",
    ];

    for (const productUrl of urls) {
      const result = verifyDirectTerraAssetCandidates({
        target: q7,
        candidates: [shoppingResult({ productUrl })],
      });
      assert.equal(result.productUrl, null, productUrl);
      assert.equal(result.decisions[0].productUrlReason, "unsafe_product_url_host");
    }
  });

  it("rejects neighboring models even when the brand and product type match", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: {
        ...ridgid,
        key: "rank-2-dxv12p-qt",
        productName: "DEWALT DXV12P-QT Wet/Dry Shop Vacuum",
        brand: "DEWALT",
        model: "DXV12P-QT",
      },
      candidates: [
        {
          title: "DEWALT DXV12P-QTA Wet/Dry Shop Vacuum",
          productUrl: "https://merchant.example/products/dewalt-dxv12p-qta",
          imageUrl: "https://merchant.example/images/dewalt-dxv12p-qta.jpg",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.decisions[0].identityReason, "model_not_in_title");
  });

  it("rejects an ambiguous title that names the target and a sibling model", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          title: "Roborock Q7 M5+ Q10 X5+ Robot Vacuum",
        }),
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.decisions[0].identityReason, "model_conflict_in_title");
  });

  it("accepts a descriptive name-only model with exact title evidence", () => {
    const target = {
      key: "rank-3-aeron",
      rank: 3,
      productName: "Herman Miller Aeron Chair",
      brand: "Herman Miller",
      model: "Aeron",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Herman Miller Aeron Ergonomic Office Chair",
          productUrl: "https://store.hermanmiller.com/office-chairs-aeron/aeron-chair/2195348.html",
          imageUrl: "https://images.hermanmiller.group/aeron-chair-product.jpg",
        },
      ],
    });

    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
  });

  it("accepts an exact numeric-dash model page without accepting its sibling", () => {
    const target = {
      key: "rank-5-milwaukee-0910-20",
      rank: 5,
      productName: "Milwaukee 0910-20 M18 FUEL Wet/Dry Shop Vacuum",
      brand: "Milwaukee",
      model: "0910-20",
      category: "shop vacuum",
    };
    const exact = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl: "https://merchant.example/products/milwaukee-0910-20",
          imageUrl: "https://images.example.com/products/milwaukee-0910-20.jpg",
        },
      ],
    });
    const sibling = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Milwaukee 0910-21 M18 FUEL Wet/Dry Shop Vacuum",
          productUrl: "https://merchant.example/products/milwaukee-0910-21",
          imageUrl: "https://images.example.com/products/milwaukee-0910-21.jpg",
        },
      ],
    });
    const siblingUrl = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl: "https://merchant.example/products/milwaukee-0910-21",
          imageUrl: "https://images.example.com/products/milwaukee-0910-21.jpg",
        },
      ],
    });

    assert.equal(exact.productUrlStatus, "accepted_identity_safe");
    assert.equal(exact.imageUrlStatus, "accepted_identity_safe");
    assert.equal(sibling.productUrl, null);
    assert.equal(sibling.imageUrl, null);
    assert.equal(siblingUrl.productUrl, null);
    assert.equal(siblingUrl.imageUrl, null);
  });

  it("accepts an opaque shopping thumbnail only when its result title proves exact identity", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: ridgid,
      candidates: [
        {
          title: "RIDGID HD1600 16 Gallon Wet Dry Shop Vacuum",
          productUrl: "https://www.homedepot.com/p/RIDGID-HD1600/304795082",
          imageUrl: "https://encrypted-tbn0.gstatic.com/images/hd1600-safe-receipt.jpg?q=tbn",
        },
      ],
    });

    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
  });

  it("does not let the query, target echo, or URL alone establish candidate identity", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: ridgid,
      candidates: [
        {
          title: "16 Gallon Wet Dry Vacuum",
          productUrl: "https://merchant.example/products/ridgid-hd1600",
          imageUrl: "https://merchant.example/images/ridgid-hd1600.jpg",
          snippet: "Result for RIDGID HD1600",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.decisions[0].identityReason, "brand_not_in_title");
  });

  it("fails closed when the locked target name, brand, model, and category disagree", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: {
        ...q7,
        productName: "Roborock Q10 X5+ Robot Vacuum",
      },
      candidates: [shoppingResult()],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.decisions[0].identityReason, "invalid_target_identity");
  });

  it("rejects placeholders and page URLs as images and exposes no provider identifiers", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({ imageUrl: "https://images.example.com/no-image.jpg" }),
        shoppingResult({ imageUrl: "https://merchant.example/products/q7-m5-plus.html" }),
      ],
    });

    assert.equal(result.imageUrl, null);
    assert.ok(result.decisions.every((decision) => decision.imageUrlAccepted === false));
    assert.equal(JSON.stringify(result).includes("provider"), false);
    assert.equal(JSON.stringify(result).includes("serper"), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_ASSET_VERIFIER_VERSION,
  directTerraAssetTargetIsCoherent,
  extractDirectTerraHeadingIdentity,
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

  it("accepts an exact-identity Shopping image without inventing a product website", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          productUrl: undefined,
          imageSource: "serper_shopping",
          imageUrl: "https://encrypted-tbn0.gstatic.com/images/q7-m5-plus.jpg?q=tbn",
        }),
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.productUrlStatus, "unavailable");
    assert.equal(
      result.imageUrl,
      "https://encrypted-tbn0.gstatic.com/images/q7-m5-plus.jpg?q=tbn",
    );
    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
    assert.equal(result.decisions[0].productUrlAccepted, false);
    assert.equal(result.decisions[0].imageUrlAccepted, true);
  });

  it("rejects a URL-less image when its Shopping provenance is not established", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          productUrl: undefined,
          imageUrl: "https://images.example.com/products/roborock-q7-m5-plus.jpg",
        }),
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.imageUrlStatus, "unavailable");
    assert.equal(result.decisions[0].imageUrlReason, "image_source_not_trusted");
  });

  it("selects a website and image independently from two exact-identity candidates", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: q7,
      candidates: [
        shoppingResult({
          imageUrl: undefined,
        }),
        shoppingResult({
          productUrl: undefined,
          imageSource: "serper_shopping",
          imageUrl: "https://images.example.com/products/roborock-q7-m5-plus-angle.jpg",
        }),
      ],
    });

    assert.equal(
      result.productUrl,
      "https://merchant.example/products/roborock-q7-m5-plus?variant=q7m5",
    );
    assert.equal(
      result.imageUrl,
      "https://images.example.com/products/roborock-q7-m5-plus-angle.jpg",
    );
    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
  });

  it("rejects image-only sibling and accessory rows despite target-model text", () => {
    const result = verifyDirectTerraAssetCandidates({
      target: ridgid,
      candidates: [
        {
          title: "RIDGID HD1200 Wet/Dry Shop Vacuum",
          imageUrl: "https://images.example.com/products/ridgid-hd1200.jpg",
        },
        {
          title: "Replacement Filter Compatible with RIDGID HD1600 Vacuum",
          imageUrl: "https://images.example.com/products/ridgid-hd1600-filter.jpg",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(result.decisions[0].identityReason, "model_not_in_title");
    assert.equal(result.decisions[1].identityReason, "wrong_product_type");
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
    assert.equal(result.imageUrl, null);
    assert.ok(result.decisions.every((decision) => decision.imageUrlAccepted === false));
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

  it("does not let an exact Shopping row make the browser request a local-network image", () => {
    const imageUrls = [
      "http://localhost/q7-m5-plus.jpg",
      "http://192.168.1.25/q7-m5-plus.jpg",
      "http://[::1]/q7-m5-plus.jpg",
      "https://images.internal/q7-m5-plus.jpg",
    ];

    for (const imageUrl of imageUrls) {
      const result = verifyDirectTerraAssetCandidates({
        target: q7,
        candidates: [
          shoppingResult({
            productUrl: undefined,
            imageSource: "serper_shopping",
            imageUrl,
          }),
        ],
      });
      assert.equal(result.imageUrl, null, imageUrl);
      assert.equal(result.decisions[0].imageUrlReason, "unsafe_image_url_host");
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
    // DXV12P-QTA extends the target's model with its own suffix: a different
    // sibling SKU, rejected as a model conflict (not a base-model match).
    assert.equal(result.decisions[0].identityReason, "model_conflict_in_title");
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

  it("RR-098 accepts descriptive product paths with taxonomy or title-corroborated detail", () => {
    const cases = [
      {
        target: {
          key: "rank-1-steelcase-leap",
          rank: 1,
          productName: "Steelcase Leap",
          brand: "Steelcase",
          model: "Leap",
          category: "office chair",
        },
        candidate: {
          title: "Steelcase Leap Adjustable Task Chair",
          productUrl:
            "https://www.steelcase.com/products/seating/ergonomic/chairs/leap",
        },
      },
      {
        target: {
          key: "rank-2-herman-miller-aeron-chair",
          rank: 2,
          productName: "Herman Miller Aeron Chair",
          brand: "Herman Miller",
          model: "Aeron Chair",
          category: "office chair",
        },
        candidate: {
          title: "Aeron Chair - Office Chairs",
          productUrl:
            "https://www.hermanmiller.com/products/seating/office-chairs/aeron-chair",
        },
      },
      {
        target: {
          key: "rank-3-haworth-fern-office-chair",
          rank: 3,
          productName: "Haworth Fern Office Chair",
          brand: "Haworth",
          model: "Fern Office Chair",
          category: "office chair",
        },
        candidate: {
          title: "Fern Office Chair",
          productUrl:
            "https://www.haworth.com/na/en/products/seating/office/chairs/fern/office/chair.html",
        },
      },
      {
        target: {
          key: "rank-4-branch-verve-chair",
          rank: 4,
          productName: "Branch Verve Chair",
          brand: "Branch",
          model: "Verve Chair",
          category: "office chair",
        },
        candidate: {
          title: "Branch Verve Chair High Performance Executive Office",
          productUrl:
            "https://www.amazon.com/Branch-Verve-Chair-Performance-Adjustable/dp/B0C15BD9XV",
        },
      },
      {
        target: {
          key: "rank-5-acme-horizon-refrigerator",
          rank: 5,
          productName: "Acme Horizon Refrigerator",
          brand: "Acme",
          model: "Horizon Refrigerator",
          category: "refrigerator",
        },
        candidate: {
          title: "Acme Horizon Refrigerator Energy Efficient",
          productUrl:
            "https://www.bestbuy.com/site/acme-horizon-refrigerator-energy-efficient/1234567.p",
        },
      },
    ];

    for (const { target, candidate } of cases) {
      const result = verifyDirectTerraAssetCandidates({
        target,
        candidates: [candidate],
      });
      assert.equal(
        result.productUrlStatus,
        "accepted_identity_safe",
        target.key,
      );
    }
  });

  it("RR-098 accepts an exact manufacturer slug after it proves a sparse descriptive title", () => {
    const target = {
      key: "rank-5-branch-verve-chair",
      rank: 5,
      productName: "Branch Verve Chair",
      brand: "Branch",
      model: "Verve Chair",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Verve Chair",
          productUrl:
            "https://www.branchfurniture.com/products/verve-chair",
        },
      ],
    });

    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(
      result.decisions[0].identityReason,
      "accepted_manufacturer_slug_identity",
    );
  });

  it("RR-093 rejects a candidate-only descriptive variant in the product path", () => {
    const target = {
      key: "rank-5-herman-miller-embody-chair",
      rank: 5,
      productName: "Herman Miller Embody Chair",
      brand: "Herman Miller",
      model: "Embody Chair",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Herman Miller Embody Chair",
          productUrl:
            "https://eustore.hermanmiller.com/products/embody-gaming-chair",
          imageUrl:
            "https://eustore.hermanmiller.com/cdn/shop/files/embody-gaming-chair.png",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(
      result.decisions[0].productUrlReason,
      "product_url_type_conflict",
    );
  });

  it("RR-093 rejects reordered and suffixed descriptive path variants", () => {
    const target = {
      key: "rank-5-herman-miller-embody-chair",
      rank: 5,
      productName: "Herman Miller Embody Chair",
      brand: "Herman Miller",
      model: "Embody Chair",
      category: "office chair",
    };
    const unsafePaths = [
      "embody-gaming-office-chair",
      "embody-chair-gaming-edition",
      "embody-chair-xl",
    ];

    for (const path of unsafePaths) {
      const result = verifyDirectTerraAssetCandidates({
        target,
        candidates: [
          {
            title: target.productName,
            productUrl: `https://eustore.hermanmiller.com/products/${path}`,
            imageUrl: `https://eustore.hermanmiller.com/cdn/shop/files/${path}.png`,
          },
        ],
      });

      assert.equal(result.productUrl, null, path);
      assert.equal(result.imageUrl, null, path);
      assert.equal(
        result.decisions[0].productUrlReason,
        "product_url_descriptive_identity_conflict",
        path,
      );
    }
  });

  it("RR-098 does not let one corroborated path detail hide an undisclosed suffix", () => {
    const target = {
      key: "rank-5-herman-miller-embody-chair",
      rank: 5,
      productName: "Herman Miller Embody Chair",
      brand: "Herman Miller",
      model: "Embody Chair",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Herman Miller Embody Chair Performance",
          productUrl:
            "https://eustore.hermanmiller.com/products/embody-chair-performance-xl-edition",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(
      result.decisions[0].productUrlReason,
      "product_url_descriptive_identity_conflict",
    );
  });

  it("RR-093 preserves harmless retailer words, color, and opaque IDs", () => {
    const target = {
      key: "rank-5-herman-miller-embody-chair",
      rank: 5,
      productName: "Herman Miller Embody Chair",
      brand: "Herman Miller",
      model: "Embody Chair",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl:
            "https://store.hermanmiller.com/products/herman-miller-embody-office-chair-black/100147386.html?configuration=standard",
          imageUrl:
            "https://images.hermanmiller.group/products/embody-chair-black.png",
        },
      ],
    });

    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrlStatus, "accepted_identity_safe");
  });

  it("RR-093 rejects a descriptive sibling image without discarding a safe product page", () => {
    const target = {
      key: "rank-5-herman-miller-embody-chair",
      rank: 5,
      productName: "Herman Miller Embody Chair",
      brand: "Herman Miller",
      model: "Embody Chair",
      category: "office chair",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl:
            "https://eustore.hermanmiller.com/products/embody-chair",
          imageUrl:
            "https://eustore.hermanmiller.com/cdn/shop/files/embody-chair-xl.png",
        },
      ],
    });

    assert.equal(result.productUrlStatus, "accepted_identity_safe");
    assert.equal(result.imageUrl, null);
    assert.equal(
      result.decisions[0].imageUrlReason,
      "image_url_descriptive_identity_conflict",
    );
  });

  it("applies descriptive title-path coherence outside chairs", () => {
    const target = {
      key: "rank-2-acme-horizon-refrigerator",
      rank: 2,
      productName: "Acme Horizon Refrigerator",
      brand: "Acme",
      model: "Horizon Refrigerator",
      category: "refrigerator",
    };
    const rejected = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl:
            "https://acme.example/products/horizon-refrigerator-outdoor-edition",
          imageUrl:
            "https://acme.example/images/horizon-refrigerator-outdoor-edition.jpg",
        },
      ],
    });
    const accepted = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: target.productName,
          productUrl:
            "https://acme.example/products/acme-horizon-refrigerator-black/847201.html?configuration=standard",
          imageUrl:
            "https://acme.example/images/horizon-refrigerator-black.jpg",
        },
      ],
    });

    assert.equal(rejected.productUrl, null);
    assert.equal(rejected.imageUrl, null);
    assert.equal(
      rejected.decisions[0].productUrlReason,
      "product_url_descriptive_identity_conflict",
    );
    assert.equal(accepted.productUrlStatus, "accepted_identity_safe");
    assert.equal(accepted.imageUrlStatus, "accepted_identity_safe");
  });

  it("applies the same path-type veto outside chairs", () => {
    const target = {
      key: "rank-1-acme-cleanforce",
      rank: 1,
      productName: "Acme CleanForce Pressure Washer",
      brand: "Acme",
      model: "CleanForce",
      category: "pressure washer",
    };
    const result = verifyDirectTerraAssetCandidates({
      target,
      candidates: [
        {
          title: "Acme CleanForce Pressure Washer",
          productUrl:
            "https://acme.example/products/cleanforce-laundry-washing-machine",
          imageUrl:
            "https://acme.example/images/cleanforce-laundry-washing-machine.jpg",
        },
      ],
    });

    assert.equal(result.productUrl, null);
    assert.equal(result.imageUrl, null);
    assert.equal(
      result.decisions[0].productUrlReason,
      "product_url_type_conflict",
    );
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

  describe("url slug identity (T8B iteration 3)", () => {
    const dewalt = {
      key: "rank-4-dxv12p-qt",
      rank: 4,
      productName:
        "DEWALT DXV12P-QT Stealthsonic Quiet 12-Gallon 5.5 PHP Wet/Dry Vacuum",
      brand: "DEWALT",
      model: "DXV12P-QT",
      category:
        "DEWALT DXV12P-QT Stealthsonic Quiet 12-Gallon 5.5 PHP Wet/Dry Vacuum",
    };

    it("accepts the manufacturer's own page even when the scraped title omits the brand and SKU", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "12-Gallon 5.5 PHP Stealthsonic Quiet Wet/Dry Vacuum",
            productUrl:
              "https://www.dewalt.com/en-us/product/dxv12p-qt/12-gallon-55-php-stealthsonic-quiet-vacuum",
          },
        ],
      });
      assert.equal(
        result.decisions[0].identityReason,
        "accepted_manufacturer_slug_identity",
      );
      assert.equal(
        result.productUrl,
        "https://www.dewalt.com/en-us/product/dxv12p-qt/12-gallon-55-php-stealthsonic-quiet-vacuum",
      );
    });

    it("accepts a popular-retailer page whose slug carries the base model the title dropped", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            // Retailer title has the brand + type but not the SKU; the model
            // (base "DXV12P", trim "-QT" dropped) lives in the URL slug.
            title: "DEWALT 12 Gal. 5.5 HP Poly Wet/Dry Vacuum - The Home Depot",
            productUrl:
              "https://www.homedepot.com/p/DEWALT-12-Gal-5-5-HP-Poly-Wet-Dry-Vacuum-with-Hose-and-Accessories-DXV12P/305323712",
          },
        ],
      });
      assert.equal(
        result.productUrl,
        "https://www.homedepot.com/p/DEWALT-12-Gal-5-5-HP-Poly-Wet-Dry-Vacuum-with-Hose-and-Accessories-DXV12P/305323712",
      );
    });

    it("rejects a retailer page whose slug carries a different (sibling) model", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT 10 Gal. Wet/Dry Vacuum - The Home Depot",
            productUrl: "https://www.homedepot.com/p/DEWALT-10-Gal-Vacuum-DXV10P/305300000",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("rejects a bare-id retailer URL with no model in the path", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT 12 Gal. Wet/Dry Vacuum - The Home Depot",
            productUrl: "https://www.homedepot.com/p/305323712",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("rejects an accessory even when the brand host slug names the parent model", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "Wet/Dry Vacuum HEPA Replacement Filter",
            productUrl: "https://www.dewalt.com/en-us/product/dxv12p-qt-filter/filter",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("does not extend slug identity to unknown non-retailer hosts", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT 12 Gallon Wet/Dry Vacuum",
            productUrl: "https://random-store.example/item/dxv12p",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });
  });

  describe("core-model / trim-variant matching (T8B iteration 3)", () => {
    const dewalt = {
      key: "rank-4-dxv12p-qt",
      rank: 4,
      productName: "DEWALT DXV12P-QT 12-Gallon Wet/Dry Vacuum",
      brand: "DEWALT",
      model: "DXV12P-QT",
      category: "DEWALT DXV12P-QT 12-Gallon Wet/Dry Vacuum",
    };

    it("accepts a title carrying the base model without the trim suffix", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT DXV12P 12 Gallon Wet/Dry Vacuum",
            productUrl: "https://store.example/p/dewalt-dxv12p-vacuum",
          },
        ],
      });
      assert.equal(result.decisions[0].identityAccepted, true);
    });

    it("still rejects a different core model number as a conflict", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT DXV10P 10 Gallon Wet/Dry Vacuum",
            productUrl: "https://store.example/p/dewalt-dxv10p-vacuum",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("keeps digit-ending models strict so Q7 never matches Q70", () => {
      const q7 = {
        key: "q7",
        rank: 1,
        productName: "Roborock Q7 Robot Vacuum",
        brand: "Roborock",
        model: "Q7",
        category: "robot vacuum",
      };
      const result = verifyDirectTerraAssetCandidates({
        target: q7,
        candidates: [
          {
            title: "Roborock Q70 Robot Vacuum and Mop",
            productUrl: "https://store.example/p/roborock-q70",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("treats a leading alpha series/line code as the same product (T8C)", () => {
      // "Monument Grills Mesa II 415BZ (M2-415BZ)": the fuller "M2-415BZ" is a
      // series code (M2 = Mesa II) plus the same 415BZ base — one product, not a
      // conflict, so the heading stays a coherent target.
      const monument = {
        key: "monument",
        rank: 1,
        productName: "Monument Grills Mesa II 415BZ (M2-415BZ)",
        brand: "Monument",
        model: "415BZ",
        category: "gas grill",
      };
      assert.equal(directTerraAssetTargetIsCoherent(monument), true);
    });

    it("still rejects a trailing alpha trim as a distinct sibling SKU (T8C)", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: dewalt,
        candidates: [
          {
            title: "DEWALT DXV12P-QTA 12 Gallon Wet/Dry Vacuum",
            productUrl: "https://store.example/p/dewalt-dxv12p-qta",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });

    it("does not let a leading digit masquerade as a series prefix (T8C)", () => {
      // "415bz" must not match a shorter "15bz" target: the extra "4" is a
      // number, not an alphabetic series code.
      const shortModel = {
        key: "short",
        rank: 1,
        productName: "Acme 15BZ Widget",
        brand: "Acme",
        model: "15BZ",
        category: "widget",
      };
      const result = verifyDirectTerraAssetCandidates({
        target: shortModel,
        candidates: [
          {
            title: "Acme 415BZ Widget",
            productUrl: "https://store.example/p/acme-415bz",
          },
        ],
      });
      assert.equal(result.productUrl, null);
    });
  });

  describe("compound heading models (T8B iteration 2)", () => {
    it("captures a trailing bare digit block as part of one model identity", () => {
      const identity = extractDirectTerraHeadingIdentity(
        "Vacmaster Professional Beast Series VFB511B 0202, 5-Gallon 6 Peak HP Wet/Dry Vacuum",
      );
      assert.ok(identity);
      assert.equal(identity.model, "VFB511B 0202");
    });

    it("never absorbs measurements or years into the model", () => {
      assert.equal(
        extractDirectTerraHeadingIdentity(
          "RIDGID HD1640, 16-Gallon 5.0 Peak HP NXT Wet/Dry Vac",
        )?.model,
        "HD1640",
      );
      assert.equal(
        extractDirectTerraHeadingIdentity("Sony WH1000XM5 2024 Headphones")?.model,
        "WH1000XM5",
      );
    });
  });
});

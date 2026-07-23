import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_ASSET_VERIFIER_VERSION,
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

  describe("manufacturer slug identity (T8B iteration 2)", () => {
    const milwaukee = {
      key: "rank-5-0910-20",
      rank: 5,
      productName: "Milwaukee 0910-20 M18 FUEL NEXUS 6-Gallon Wet/Dry Vacuum",
      brand: "Milwaukee",
      model: "0910-20",
      category: "wet/dry shop vacuum",
    };

    it("accepts the brand's own product page whose title omits the SKU but whose slug carries it", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: milwaukee,
        candidates: [
          {
            title: "M18 FUEL NEXUS 6 Gallon Wet/Dry Vacuum | Milwaukee Tool",
            productUrl: "https://www.milwaukeetool.com/products/0910-20",
          },
        ],
      });
      assert.equal(
        result.decisions[0].identityReason,
        "accepted_manufacturer_slug_identity",
      );
      assert.equal(
        result.productUrl,
        "https://www.milwaukeetool.com/products/0910-20",
      );
    });

    it("never extends slug identity to retailers, whose catalogs hold every sibling", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: milwaukee,
        candidates: [
          {
            title: "M18 FUEL NEXUS 6 Gallon Wet/Dry Vacuum",
            productUrl: "https://www.homedepot.com/p/milwaukee-0910-20/328491023",
          },
        ],
      });
      assert.equal(result.productUrl, null);
      assert.equal(result.decisions[0].identityReason, "model_not_in_title");
    });

    it("rejects accessory titles and conflicting sibling models on the brand host", () => {
      const accessory = verifyDirectTerraAssetCandidates({
        target: milwaukee,
        candidates: [
          {
            title: "Wet/Dry Vacuum HEPA Filter | Milwaukee Tool",
            productUrl: "https://www.milwaukeetool.com/accessories/0910-20-filter",
          },
        ],
      });
      assert.equal(accessory.productUrl, null);

      const sibling = verifyDirectTerraAssetCandidates({
        target: milwaukee,
        candidates: [
          {
            title: "M18 FUEL NEXUS 6 Gallon Wet/Dry Vacuum | Milwaukee Tool",
            productUrl:
              "https://www.milwaukeetool.com/products/0910-20-vs-0920-22",
          },
        ],
      });
      assert.equal(sibling.productUrl, null);
    });

    it("requires the title to still prove the brand", () => {
      const result = verifyDirectTerraAssetCandidates({
        target: milwaukee,
        candidates: [
          {
            title: "6 Gallon Wet/Dry Vacuum - Best Price",
            productUrl: "https://www.milwaukeetool.com/products/0910-20",
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

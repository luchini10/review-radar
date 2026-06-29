import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";

function field(value) {
  return {
    confidence: "High",
    sourceType: "json_ld",
    sourceUrl: "https://merchant.example/product",
    value,
    verifiedAt: "2026-06-29T00:00:00.000Z",
  };
}

function offer(price, url) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer: new URL(url).hostname,
    url,
  };
}

function citation(title, url, citationType) {
  return {
    citation_type: citationType,
    title,
    url,
    what_it_supports: "Product-specific evidence.",
  };
}

function product({
  category,
  citationList,
  name,
  price,
  productUrl,
  rating,
  reviews,
}) {
  return {
    recommendation_type: "Best Match",
    name,
    category,
    product_page_url: productUrl,
    product_image_url: "https://merchant.example/product.jpg",
    why_recommended: `${name} is a verified ${category}.`,
    pros: ["Verified product details."],
    cons: [],
    common_complaints: [],
    estimated_price_range: `$${price}`,
    confidence_score: 82,
    source_consensus: "Mixed",
    price_value_verdict: "Comparable value.",
    best_for: "Buyers comparing otherwise similar products.",
    not_for: [],
    citations: citationList,
    requirementCheck: {
      exactMatch: true,
      failed: [],
      passed: [`Category: ${category}`],
      unknown: [],
    },
    metadata: {
      brand: field(name.split(" ")[0]),
      canonicalUrl: field(productUrl),
      image: field("https://merchant.example/product.jpg"),
      modelNumber: field(name.replace(/[^a-z0-9]+/gi, "").toUpperCase()),
      offers: [offer(price, productUrl)],
      rating: field(rating),
      reviewCount: field(reviews),
      title: field(name),
    },
  };
}

function result(products) {
  return {
    search_summary: "Test candidates.",
    assumptions: [],
    exactMatches: products,
    nearMatches: [],
    recommendations: [],
    what_to_avoid: [],
    final_buying_advice: "Compare the displayed products.",
  };
}

describe("RR-013 product-specific citation strength", () => {
  it("ranks a product-specific independent source above a slightly stronger retailer-only offer", () => {
    const retailerOnly = {
      ...product({
        category: "gas grill",
        citationList: [
          citation(
            "Nexgrill Edge 4-Burner Gas Grill",
            "https://www.homedepot.com/p/nexgrill-edge-4-burner/100001",
            "retailer-marketplace",
          ),
        ],
        name: "Nexgrill Edge 4-Burner Gas Grill",
        price: 399,
        productUrl:
          "https://www.homedepot.com/p/nexgrill-edge-4-burner/100001",
        rating: 4.7,
        reviews: 1400,
      }),
      source_consensus: "Strong",
    };
    const independentlySupported = product({
      category: "gas grill",
      citationList: [
        citation(
          "Weber Spirit E-210 Gas Grill",
          "https://evidencelab.example/weber-spirit-e-210",
          "independent-editorial",
        ),
      ],
      name: "Weber Spirit E-210 Gas Grill",
      price: 449,
      productUrl: "https://www.weber.com/spirit-e-210/200002",
      rating: 4.6,
      reviews: 1100,
    });
    const ranked = scoreAndSelectRecommendations(
      result([retailerOnly, independentlySupported]),
      { query: "gas grill" },
    );

    assert.equal(
      ranked.exactMatches[0]?.name,
      independentlySupported.name,
      JSON.stringify(ranked.exactMatches.map((item) => ({
        name: item.name,
        rankedMatchScore:
          recommendationScoringTestExports.rankedMatchScore(item),
        sourceQualityScore: item.scoreBreakdown?.sourceQualityScore,
        totalScore: item.scoreBreakdown?.totalScore,
      }))),
    );
  });

  it("applies the same preference in an unrelated electronics category", () => {
    const retailerOnly = {
      ...product({
        category: "headphones",
        citationList: [
          citation(
            "StoreSound H500 Wireless Headphones",
            "https://www.bestbuy.com/site/storesound-h500/100002.p",
            "retailer-marketplace",
          ),
        ],
        name: "StoreSound H500 Wireless Headphones",
        price: 179,
        productUrl:
          "https://www.bestbuy.com/site/storesound-h500/100002.p",
        rating: 4.7,
        reviews: 1700,
      }),
      source_consensus: "Strong",
    };
    const independentlySupported = product({
      category: "headphones",
      citationList: [
        citation(
          "AudioPro M50 Wireless Headphones",
          "https://evidencelab.example/audiopro-m50",
          "independent-editorial",
        ),
      ],
      name: "AudioPro M50 Wireless Headphones",
      price: 199,
      productUrl: "https://audiopro.example/products/m50",
      rating: 4.6,
      reviews: 1400,
    });
    const ranked = scoreAndSelectRecommendations(
      result([retailerOnly, independentlySupported]),
      { query: "headphones" },
    );

    assert.equal(
      ranked.exactMatches[0]?.name,
      independentlySupported.name,
      JSON.stringify(ranked.exactMatches.map((item) => ({
        name: item.name,
        rankedMatchScore:
          recommendationScoringTestExports.rankedMatchScore(item),
        sourceQualityScore: item.scoreBreakdown?.sourceQualityScore,
        totalScore: item.scoreBreakdown?.totalScore,
      }))),
    );
  });

  it("does not credit generic or conflicting citations as product-specific support", () => {
    const exactIndependent = product({
      category: "dog food",
      citationList: [
        citation(
          "Purina Pro Plan Adult Salmon & Rice Dry Dog Food",
          "https://reviews.example/purina-pro-plan-salmon-rice",
          "independent-editorial",
        ),
      ],
      name: "Purina Pro Plan Adult Salmon & Rice Dry Dog Food",
      price: 59,
      productUrl: "https://shop.purina.com/pro-plan-adult-salmon-rice",
      rating: 4.6,
      reviews: 900,
    });
    const genericFamily = {
      ...exactIndependent,
      citations: [
        citation(
          "Purina Pro Plan Dog Food",
          "https://www.chewy.com/brands/purina-pro-plan-dog-food-7437",
          "independent-editorial",
        ),
      ],
    };
    const wrongRecipe = {
      ...exactIndependent,
      citations: [
        citation(
          "Purina Pro Plan Adult Beef & Rice Dry Dog Food",
          "https://reviews.example/purina-pro-plan-beef-rice",
          "independent-editorial",
        ),
      ],
    };
    const genericEditorial = {
      ...exactIndependent,
      citations: [
        citation(
          "Best Dog Foods for Adult Dogs",
          "https://reviews.example/best-dog-food",
          "independent-editorial",
        ),
      ],
    };
    const score =
      recommendationScoringTestExports.productSpecificCitationStrengthScore;

    assert.equal(score(exactIndependent), 6);
    assert.equal(score(genericFamily), 0);
    assert.equal(score(genericEditorial), 0);
    assert.equal(score(wrongRecipe), 0);
  });

  it("keeps a retailer-only product competitive when it has no stronger competitor", () => {
    const retailerOnly = product({
      category: "cordless drill",
      citationList: [
        citation(
          "Makita XFD131 Cordless Drill Kit",
          "https://www.homedepot.com/p/makita-xfd131/100003",
          "retailer-marketplace",
        ),
      ],
      name: "Makita XFD131 Cordless Drill Kit",
      price: 129,
      productUrl: "https://www.homedepot.com/p/makita-xfd131/100003",
      rating: 4.8,
      reviews: 1800,
    });
    const ranked = scoreAndSelectRecommendations(
      result([retailerOnly]),
      { query: "cordless drill" },
    );

    assert.equal(ranked.exactMatches[0]?.name, retailerOnly.name);
    assert.equal(
      recommendationScoringTestExports.productSpecificCitationStrengthScore(
        retailerOnly,
      ),
      2,
    );
  });

  it("applies only a bounded penalty to a true self-only product", () => {
    const selfOnly = product({
      category: "air purifier",
      citationList: [
        citation(
          "CleanAir A100 Air Purifier",
          "https://cleanair.example/products/a100",
          "product-page-self",
        ),
      ],
      name: "CleanAir A100 Air Purifier",
      price: 149,
      productUrl: "https://cleanair.example/products/a100",
      rating: 4.7,
      reviews: 2000,
    });

    assert.equal(
      recommendationScoringTestExports.productSpecificCitationStrengthScore(
        selfOnly,
      ),
      -2,
    );
  });

  it("can disable only the Phase 5G adjustment for deterministic A/B comparison", () => {
    const previous = process.env.REVIEW_RADAR_CITATION_STRENGTH;
    const independentlySupported = product({
      category: "coffee maker",
      citationList: [
        citation(
          "BrewPro C10 Coffee Maker",
          "https://evidencelab.example/brewpro-c10",
          "independent-editorial",
        ),
      ],
      name: "BrewPro C10 Coffee Maker",
      price: 129,
      productUrl: "https://brewpro.example/products/c10",
      rating: 4.6,
      reviews: 800,
    });

    try {
      process.env.REVIEW_RADAR_CITATION_STRENGTH = "off";
      assert.equal(
        recommendationScoringTestExports.productSpecificCitationStrengthScore(
          independentlySupported,
        ),
        0,
      );
      process.env.REVIEW_RADAR_CITATION_STRENGTH = "on";
      assert.equal(
        recommendationScoringTestExports.productSpecificCitationStrengthScore(
          independentlySupported,
        ),
        6,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_CITATION_STRENGTH;
      } else {
        process.env.REVIEW_RADAR_CITATION_STRENGTH = previous;
      }
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterResultByRequirements,
  revalidateResultCandidates,
  validateProductAgainstRequirements,
} from "../lib/requirementValidation.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const verifiedAt = "2026-01-01T00:00:00.000Z";

function metadataField(value, sourceType = "json_ld") {
  return {
    confidence: "High",
    sourceType,
    sourceUrl: "https://example.com/product",
    value,
    verifiedAt,
  };
}

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example Compact Beige Couch",
    category: "Couch",
    product_page_url: "https://example.com/couch",
    product_image_url: "https://example.com/couch.jpg",
    why_recommended:
      "A compact couch that is available in beige and measures 60 inches wide.",
    pros: ["Available in beige.", "Measures 60 inches wide."],
    cons: ["Limited stock at some retailers."],
    common_complaints: ["Delivery windows can vary."],
    estimated_price_range: "$399-$449",
    confidence_score: 90,
    source_consensus: "Strong",
    price_value_verdict: "Stays under a $500 budget.",
    best_for: "Small rooms that need a beige couch.",
    not_for: ["Buyers who need a large sectional."],
    citations: [
      {
        title: "Example source",
        url: "https://example.com/review",
        what_it_supports: "Supports the fake test product.",
      },
    ],
    ...overrides,
  };
}

describe("requirement validation", () => {
  it("matches a beige color requirement only when beige is supported", () => {
    const match = validateProductAgainstRequirements(buildProduct(), {
      category: "couch",
      selectedFeatures: ["Color: Beige"],
    });
    const miss = validateProductAgainstRequirements(
      buildProduct({
        why_recommended: "A compact couch that measures 60 inches wide.",
        pros: ["Measures 60 inches wide."],
        cons: ["Not available in beige."],
      }),
      {
        category: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(match.isMatch, true);
    assert.equal(miss.isMatch, false);
    assert.match(miss.disqualifiedReason || "", /Color: Beige/);
  });

  it("treats multiple selected colors as acceptable alternatives", () => {
    const beigeMatch = validateProductAgainstRequirements(buildProduct(), {
      category: "couch",
      selectedFeatures: ["Color: Black", "Color: Beige"],
    });
    const blackMatch = validateProductAgainstRequirements(
      buildProduct({
        name: "Example Compact Black Couch",
        why_recommended:
          "A compact couch that is available in black and measures 60 inches wide.",
        pros: ["Available in black.", "Measures 60 inches wide."],
        best_for: "Small rooms that need a black couch.",
      }),
      {
        category: "couch",
        selectedFeatures: ["Color: Black", "Color: Beige"],
      },
    );
    const miss = validateProductAgainstRequirements(
      buildProduct({
        name: "Example Compact Gray Couch",
        why_recommended:
          "A compact couch that is available in gray and measures 60 inches wide.",
        pros: ["Available in gray.", "Measures 60 inches wide."],
        best_for: "Small rooms that need a gray couch.",
      }),
      {
        category: "couch",
        selectedFeatures: ["Color: Black", "Color: Beige"],
      },
    );

    assert.equal(beigeMatch.isMatch, true);
    assert.equal(blackMatch.isMatch, true);
    assert.equal(miss.isMatch, false);
    assert.deepEqual(miss.requirementComparisons, [
      {
        required: "Color: Black or Beige",
        productHas: "Color: gray",
        status: "failed",
      },
    ]);
  });

  it("validates brand-only requirements using aliases before generic feature checks", () => {
    const request = {
      budget: "$300",
      priorities: "Must be Nike only",
      query: "basketball shoes",
    };
    const input = {
      ...request,
      extractedRequirements: extractStructuredRequirements(request),
    };
    const nike = validateProductAgainstRequirements(
      buildProduct({
        category: "basketball shoes",
        estimated_price_range: "$95",
        name: "Nike G.T. Cut Academy Basketball Shoes",
        pros: ["Nike basketball shoe with Zoom cushioning."],
        why_recommended:
          "Nike G.T. Cut Academy basketball shoes are under the budget.",
        metadata: {
          brand: metadataField("Nike"),
          offers: [
            {
              availability: metadataField("InStock"),
              price: metadataField(95),
              priceCurrency: metadataField("USD"),
              retailer: "nike.com",
              url: "https://www.nike.com/t/gt-cut-academy",
            },
          ],
          title: metadataField("Nike G.T. Cut Academy Basketball Shoes"),
        },
      }),
      input,
    );
    const jordan = validateProductAgainstRequirements(
      buildProduct({
        category: "basketball shoes",
        estimated_price_range: "$125",
        name: "Jordan Luka 3 Basketball Shoes",
        pros: ["Jordan Brand basketball shoes from Nike."],
        why_recommended:
          "Jordan Luka 3 basketball shoes are under the Nike budget.",
        metadata: {
          brand: metadataField("Jordan"),
          offers: [
            {
              availability: metadataField("InStock"),
              price: metadataField(125),
              priceCurrency: metadataField("USD"),
              retailer: "nike.com",
              url: "https://www.nike.com/t/luka-3",
            },
          ],
          title: metadataField("Jordan Luka 3 Basketball Shoes"),
        },
      }),
      input,
    );
    const adidas = validateProductAgainstRequirements(
      buildProduct({
        category: "basketball shoes",
        estimated_price_range: "$120",
        name: "Adidas Dame 9 Basketball Shoes",
        pros: ["Adidas basketball shoes under budget."],
        why_recommended:
          "Adidas Dame 9 basketball shoes are under the budget.",
        metadata: {
          brand: metadataField("Adidas"),
          offers: [
            {
              availability: metadataField("InStock"),
              price: metadataField(120),
              priceCurrency: metadataField("USD"),
              retailer: "adidas.com",
              url: "https://www.adidas.com/us/dame-9",
            },
          ],
          title: metadataField("Adidas Dame 9 Basketball Shoes"),
        },
      }),
      input,
    );

    assert.equal(nike.isMatch, true);
    assert.equal(jordan.isMatch, true);
    assert.equal(adidas.isMatch, false);
    assert.ok(
      adidas.requirementComparisons.some(
        (comparison) =>
          comparison.required === "Brand: Nike" &&
          comparison.status === "failed",
      ),
    );
  });

  it("explains near-match color requirements with the product value", () => {
    const miss = validateProductAgainstRequirements(
      buildProduct({
        name: "Example Compact Black Couch",
        why_recommended:
          "A compact couch that is available in black and measures 60 inches wide.",
        pros: ["Available in black.", "Measures 60 inches wide."],
        best_for: "Small rooms that need a black couch.",
      }),
      {
        category: "couch",
        selectedFeatures: ["Color: gray"],
      },
    );

    assert.equal(miss.isMatch, false);
    assert.deepEqual(miss.requirementComparisons, [
      {
        required: "Color: gray",
        productHas: "Color: black",
        status: "failed",
      },
    ]);
  });

  it("uses not verified when the product value cannot be proven", () => {
    const miss = validateProductAgainstRequirements(
      buildProduct({
        name: "Example Compact Couch",
        why_recommended: "A compact couch that measures 60 inches wide.",
        pros: ["Measures 60 inches wide."],
        best_for: "Small rooms.",
      }),
      {
        category: "couch",
        selectedFeatures: ["Color: gray"],
      },
    );

    assert.equal(miss.isMatch, false);
    assert.deepEqual(miss.requirementComparisons, [
      {
        required: "Color: gray",
        productHas: "Color: not verified",
        status: "unknown",
      },
    ]);
  });

  it("rejects products over an under-64-inch hard size requirement", () => {
    const match = validateProductAgainstRequirements(buildProduct(), {
      category: "couch",
      priorities: "has to be under 64 inches",
    });
    const miss = validateProductAgainstRequirements(
      buildProduct({
        why_recommended:
          "A full-size couch that is available in beige and measures 72 inches wide.",
        pros: ["Available in beige.", "Measures 72 inches wide."],
      }),
      {
        category: "couch",
        priorities: "has to be under 64 inches",
      },
    );

    assert.equal(match.isMatch, true);
    assert.equal(miss.isMatch, false);
    assert.match(miss.disqualifiedReason || "", /Width: under 64 inches/);
    assert.deepEqual(miss.requirementComparisons, [
      {
        required: "Width: under 64 inches",
        productHas: "Width: 72 inches",
        status: "failed",
      },
    ]);
  });

  it("checks explicit depth requirements against product metadata", () => {
    const product = buildProduct({
      metadata: {
        dimensions: {
          depth: {
            confidence: "High",
            sourceType: "json_ld",
            sourceUrl: "https://example.com/product",
            value: 33,
            verifiedAt: "2026-01-01T00:00:00.000Z",
          },
          unit: "in",
        },
        offers: [],
      },
    });
    const result = validateProductAgainstRequirements(product, {
      category: "refrigerator",
      extractedRequirements: {
        requiredConstraints: [],
        avoidConstraints: [],
        preferredConstraints: [],
        sizeConstraints: [
          {
            dimension: "depth",
            id: "size-1",
            label: "Depth: under 30 inches",
            operator: "max",
            unit: "in",
            value: 30,
          },
        ],
        colorConstraints: [],
        materialConstraints: [],
        brandConstraints: [],
        budgetRules: [],
        ambiguousConstraints: [],
        summary: [],
      },
    });

    assert.equal(result.isMatch, false);
    assert.ok(
      result.requirementComparisons.some(
        (comparison) =>
          comparison.required === "Depth: under 30 inches" &&
          comparison.productHas === "Depth: 33 inches",
      ),
    );
  });

  it("treats gas ranges and stoves as oven-category products", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        category: "Gas range",
        name: "Example 30 in. Freestanding Gas Range in Stainless Steel",
        pros: ["Gas fuel type.", "Stainless steel finish."],
        estimated_price_range: "$899",
      }),
      {
        budget: "under $2000",
        category: "oven",
        selectedFeatures: [
          {
            id: "fuel-type-equals-gas",
            name: "Fuel type",
            operator: "equals",
            required: true,
            source: "smart_features",
            type: "enum",
            value: "Gas",
          },
          {
            id: "finish-equals-stainless-steel",
            name: "Finish",
            operator: "equals",
            required: true,
            source: "smart_features",
            type: "enum",
            value: "Stainless steel",
          },
        ],
      },
    );

    assert.equal(result.isMatch, true);
    assert.deepEqual(result.missingRequirements, []);
  });

  it("rejects products over an under-$500 budget requirement", () => {
    const match = validateProductAgainstRequirements(buildProduct(), {
      budget: "under $500",
      category: "couch",
    });
    const miss = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range: "$549-$599",
        price_value_verdict: "Costs more than a $500 budget.",
      }),
      {
        budget: "under $500",
        category: "couch",
      },
    );

    assert.equal(match.isMatch, true);
    assert.equal(miss.isMatch, false);
    assert.match(miss.disqualifiedReason || "", /Budget/);
  });

  it("keeps the stated budget firm for every Best Match candidate", () => {
    const regular = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range: "$1,200",
        price_value_verdict: "A higher-end option.",
      }),
      {
        budget: "under $500",
        category: "couch",
      },
    );
    const overBudgetPremium = validateProductAgainstRequirements(
      buildProduct({
        recommendation_type: "Best Match",
        estimated_price_range: "$800",
        price_value_verdict: "A higher-quality premium option.",
      }),
      {
        budget: "under $500",
        category: "couch",
      },
    );
    const inBudgetPremium = validateProductAgainstRequirements(
      buildProduct({
        recommendation_type: "Best Match",
        estimated_price_range: "$450",
        price_value_verdict: "A higher-quality option inside the stated budget.",
      }),
      {
        budget: "under $500",
        category: "couch",
      },
    );

    assert.equal(regular.isMatch, false);
    assert.equal(overBudgetPremium.isMatch, false);
    assert.match(overBudgetPremium.disqualifiedReason || "", /Budget/);
    assert.equal(inBudgetPremium.isMatch, true);
    assert.ok(inBudgetPremium.matchedRequirements.includes("Budget: $500 or less"));
  });

  it("treats unverified price wording as unknown for firm budgets", () => {
    const uncertainPrice = validateProductAgainstRequirements(
      buildProduct({
        estimated_price_range: "Likely under $200, exact current price not surfaced",
        price_value_verdict: "Price was not verified in the search result.",
      }),
      {
        budget: "under $200",
        category: "couch",
      },
    );

    assert.equal(uncertainPrice.isMatch, false);
    assert.ok(uncertainPrice.unknownRequirements.includes("Budget: $200 or less"));
  });

  it("rejects products that mention avoid terms as problems", () => {
    const match = validateProductAgainstRequirements(buildProduct(), {
      avoid: "noisy, bad reviews, hard to assemble",
      category: "couch",
    });
    const miss = validateProductAgainstRequirements(
      buildProduct({
        cons: ["Noisy frame movement after assembly."],
        common_complaints: ["Bad reviews mention it is hard to assemble."],
      }),
      {
        avoid: "noisy, bad reviews, hard to assemble",
        category: "couch",
      },
    );

    assert.equal(match.isMatch, true);
    assert.equal(miss.isMatch, false);
    assert.match(miss.disqualifiedReason || "", /Avoid/);
  });

  it("filters disqualified products before rendering", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({ name: "Matching Beige Couch" }),
          buildProduct({
            name: "Wrong Color Couch",
            pros: ["Measures 60 inches wide."],
            cons: ["Not available in beige."],
            why_recommended: "A compact couch that measures 60 inches wide.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.recommendations.length, 1);
    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(result.recommendations[0].name, "Matching Beige Couch");
  });

  it("ranks independently supported products ahead of broad big-box product pages", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Target Marketplace Compact Beige Couch",
            product_page_url:
              "https://www.target.com/p/compact-beige-couch/-/A-123456",
            confidence_score: 95,
            citations: [
              {
                title: "Target product page",
                url: "https://www.target.com/p/compact-beige-couch/-/A-123456",
                what_it_supports: "Supports price and availability.",
              },
            ],
          }),
          buildProduct({
            name: "Specialist Store Compact Beige Couch",
            product_page_url: "https://www.wayfair.com/furniture/pdp/compact-beige-couch.html",
            confidence_score: 88,
            citations: [
              {
                title: "Independent review",
                url: "https://example-reviews.com/compact-beige-couch-review",
                what_it_supports: "Supports owner feedback and quality.",
              },
              {
                title: "Specialist product page",
                url: "https://www.wayfair.com/furniture/pdp/compact-beige-couch.html",
                what_it_supports: "Supports product specs.",
              },
            ],
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.exactMatches.length, 2);
    assert.equal(
      result.recommendations[0].name,
      "Specialist Store Compact Beige Couch",
    );
  });

  it("removes broad search pages before rendering exact or near matches", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Baseball Gloves For Sale",
            category: "baseball glove",
            product_page_url:
              "https://www.amazon.com/baseball-gloves-sale/s?k=baseball+gloves+for+sale",
            why_recommended: "A broad Amazon search page.",
            pros: ["Listing found from Amazon search."],
          }),
          buildProduct({
            name: "Countertop Microwave Ovens - Best Buy",
            category: "microwave",
            product_page_url:
              "https://www.bestbuy.com/site/microwaves/countertop-microwaves/abcat0904001.c",
            why_recommended: "A broad Best Buy category page.",
            pros: ["Listing found from Best Buy category results."],
          }),
          buildProduct({
            name: "How to Measure for a Sectional Sofa - Wayfair",
            category: "sectional",
            product_page_url:
              "https://www.wayfair.com/sca/ideas-and-advice/guides/how-to-measure-for-a-sectional-sofa-T1234",
            why_recommended: "An editorial guide page, not a product page.",
            pros: ["Measurement guide for sectional shoppers."],
          }),
          buildProduct({
            name: "Baseball gloves... so many models, what to consider?",
            category: "baseball glove",
            product_page_url:
              "https://www.reddit.com/r/baseball/comments/example/baseball_gloves_so_many_models/",
            why_recommended: "A discussion thread, not a product page.",
            pros: ["Mentions several baseball gloves under $500."],
            estimated_price_range: "$199",
            price_value_verdict: "Appears to fit under the $500 budget.",
          }),
          buildProduct({
            name: "Customer Reviews for Wilson A360 Adult Slowpitch Softball Glove",
            category: "baseball glove",
            product_page_url:
              "https://www.homedepot.com/p/reviews/Wilson-A360-Adult-Slowpitch-Softball-Glove/123456",
            why_recommended: "A reviews page, not the product page.",
            pros: ["Review page mentions the Wilson A360 glove."],
            estimated_price_range: "$49.95",
            price_value_verdict: "Fits under the $500 budget.",
          }),
          buildProduct({
            name: "Top Rated Baseball Gloves | RC Willey",
            category: "baseball glove",
            product_page_url:
              "https://www.rcwilley.com/sports/baseball-gloves",
            why_recommended: "A top-rated collection page, not a product page.",
            pros: ["Lists multiple baseball gloves."],
            estimated_price_range: "$129",
            price_value_verdict: "Appears under the $500 budget.",
          }),
          buildProduct({
            name: "Wilson 2021 A360 Adult Slowpitch Softball Glove",
            category: "baseball glove",
            product_page_url:
              "https://www.amazon.com/Wilson-2021-A360-Slowpitch-Softball/dp/B08EXAMPLE",
            why_recommended:
              "A specific baseball glove product with a verified product page.",
            pros: ["Specific Wilson A360 product page.", "Price is under $500."],
            estimated_price_range: "$49.95",
            price_value_verdict: "Fits under the $500 budget.",
            best_for: "Baseball players who need a specific glove.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        budget: "under $500",
        query: "baseball glove",
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 0);
    assert.equal(
      result.recommendations[0].name,
      "Wilson 2021 A360 Adult Slowpitch Softball Glove",
    );
  });

  it("removes complaint, deal roundup, and buying-advice pages before exact matching", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Complaint about new Example Laptop quality | Example Support",
            category: "gaming laptop",
            product_page_url:
              "https://support.example.com/community/conversations/example-laptop-complaint",
            why_recommended:
              "A complaint thread that mentions specs but is not a product page.",
            pros: ["Mentions RTX 4060 and 16GB RAM."],
            estimated_price_range: "$800",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Example Espresso Machine Deals 2026 - Best Example Sales",
            category: "espresso machine",
            product_page_url:
              "https://magazine.example.com/kitchen/best-example-espresso-machine-deals-2026",
            why_recommended:
              "A seasonal deals article, not a product detail page.",
            pros: ["Mentions espresso machines with built-in grinders."],
            estimated_price_range: "$500",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Long Term Espresso Machine - Buying Advice - Page 2",
            category: "espresso machine",
            product_page_url:
              "https://community.example.com/advice/long-term-espresso-machine-buying-advice-page-2",
            why_recommended:
              "A discussion page that should not be displayed as a product.",
            pros: ["Discusses beginner espresso machines."],
            estimated_price_range: "$350",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "The HP Victus 16 is one of the best-value gaming laptops I've ever tested",
            category: "gaming laptop",
            product_page_url:
              "https://www.laptopmag.com/reviews/hp-victus-16-best-value-gaming-laptop",
            why_recommended:
              "A publisher article headline that should be citation evidence, not the product page.",
            pros: ["Mentions RTX 4060 and 16GB RAM."],
            estimated_price_range: "$600",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Turn your kitchen into a cafe with the Example Magnifica Evo",
            category: "espresso machine",
            product_page_url:
              "https://www.mashable.com/article/example-magnifica-evo-espresso-machine-sale",
            why_recommended:
              "A publisher article with a product-like headline, not a product detail page.",
            pros: ["Mentions a beginner-friendly espresso machine."],
            estimated_price_range: "$350",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Up your game with the Example Legion gaming laptop, yours for $850",
            category: "gaming laptop",
            product_page_url:
              "https://www.windowscentral.com/gaming/up-your-game-with-example-legion-laptop",
            why_recommended:
              "A publisher sale article headline, not a product detail page.",
            pros: ["Mentions RTX 4060 and 16GB RAM."],
            estimated_price_range: "$850",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Delonghi Specialista Arte EC 9155 Review",
            category: "espresso machine",
            product_page_url:
              "https://coffee.example.com/delonghi-specialista-arte-ec-9155-review",
            why_recommended:
              "A review article should be citation evidence, not the product page.",
            pros: ["Mentions an espresso machine with grinder."],
            estimated_price_range: "$500",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Gaggia Brera RI9305/11 Review & Guide (2025)",
            category: "espresso machine",
            product_page_url:
              "https://coffee.example.com/gaggia-brera-ri9305-review-guide-2025",
            why_recommended:
              "A review guide should be citation evidence, not the product page.",
            pros: ["Mentions an espresso machine with grinder."],
            estimated_price_range: "$550",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Compare at 16+ Stores: Example La Specialista Coffee Machine",
            category: "espresso machine",
            product_page_url:
              "https://www.price.com/compare/example-la-specialista-coffee-machine",
            why_recommended:
              "A price-comparison page should not be treated as the product page.",
            pros: ["Mentions the espresso machine price at multiple stores."],
            estimated_price_range: "$699.99",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Ranking the top 74 sneakers in NBA history - ESPN",
            category: "basketball shoes",
            product_page_url:
              "https://www.espn.com/nba/story/_/id/123456/ranking-top-74-sneakers-nba-history",
            why_recommended:
              "An editorial ranking that should support research, not display as a product.",
            pros: ["Mentions several Nike basketball shoes."],
            estimated_price_range: "$150",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Cut in half: Nike G.T. Jump 2 Review | RunRepeat",
            category: "basketball shoes",
            product_page_url: "https://runrepeat.com/nike-gt-jump-2",
            why_recommended:
              "A review page that should support evidence, not display as the product.",
            pros: ["Mentions traction and cushioning."],
            estimated_price_range: "$180",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Basketball Shoes For Speed | DICK'S Sporting Goods",
            category: "basketball shoes",
            product_page_url:
              "https://www.dickssportinggoods.com/f/basketball-shoes-for-speed",
            why_recommended:
              "A retailer category page that lists many shoes.",
            pros: ["Lists many basketball shoes."],
            estimated_price_range: "$120",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Nike Basketball Releases the Book 2, the Next Chapter in Devin ...",
            category: "basketball shoes",
            product_page_url:
              "https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info",
            why_recommended:
              "A Nike newsroom release that should be evidence, not the product.",
            pros: ["Mentions a Nike basketball shoe."],
            estimated_price_range: "$140",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Nike Men's Stability Shoes | DICK'S Sporting Goods",
            category: "running shoes",
            product_page_url:
              "https://www.dickssportinggoods.com/a/nike-mens-stability-shoes-0zdz01a.html",
            why_recommended:
              "A retailer advice/listing page that should not display as one product.",
            pros: ["Mentions Nike running shoes."],
            estimated_price_range: "$130",
            price_value_verdict: "Appears under budget.",
          }),
          buildProduct({
            name: "Example Barista Express Espresso Machine",
            category: "espresso machine",
            product_page_url:
              "https://shop.example.com/products/example-barista-express-espresso-machine",
            why_recommended:
              "A specific espresso machine product page with grinder evidence.",
            pros: ["Built-in grinder.", "Beginner-friendly controls."],
            estimated_price_range: "$649",
            price_value_verdict: "Current price is under the $700 budget.",
          }),
          buildProduct({
            name: "Example Barista Compact Espresso Machine - Sale Price",
            category: "espresso machine",
            product_page_url:
              "https://shop.example.com/products/example-barista-compact-espresso-machine",
            why_recommended:
              "A specific espresso machine product page with current sale pricing.",
            pros: ["Built-in grinder.", "Beginner-friendly setup."],
            estimated_price_range: "$599",
            price_value_verdict: "Sale price is under the $700 budget.",
          }),
          buildProduct({
            name: "The Barista Express Espresso Machine",
            category: "espresso machine",
            product_page_url:
              "https://shop.example.com/products/the-barista-express-espresso-machine",
            why_recommended:
              "A specific product page whose name starts with The but is not an article headline.",
            pros: ["Built-in grinder.", "Beginner-friendly setup."],
            estimated_price_range: "$699",
            price_value_verdict: "Current price is under the $700 budget.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        budget: "under $700",
        priorities: "built-in grinder, beginner friendly",
        query: "espresso machine",
      },
    );

    assert.deepEqual(
      result.recommendations.map((recommendation) => recommendation.name),
      [
        "Example Barista Express Espresso Machine",
        "Example Barista Compact Espresso Machine - Sale Price",
        "The Barista Express Espresso Machine",
      ],
    );
    assert.equal(result.exactMatches.length, 3);
    assert.equal(result.nearMatches.length, 0);
  });

  it("keeps bed frames out of mattress search results", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "King size mattress",
            estimated_price_range: "$899",
            name: "Nectar Classic 12 King Mattress",
            price_value_verdict: "Fits under the $1500 budget.",
            pros: ["King mattress with medium-firm foam support."],
            why_recommended: "A king-size mattress with verified mattress evidence.",
          }),
          buildProduct({
            category: "King size mattress",
            estimated_price_range: "$499",
            name: "Basi King Bed Frame - Oak",
            price_value_verdict: "Fits under the $1500 budget.",
            pros: ["Oak king bed frame with slats."],
            why_recommended: "A king bed frame, not a mattress.",
          }),
          buildProduct({
            category: "King size mattress",
            estimated_price_range: "$999",
            name: "Tessu King Low Profile Upholstered Bed",
            price_value_verdict: "Fits under the $1500 budget.",
            pros: ["Low-profile upholstered platform bed frame."],
            why_recommended: "An upholstered platform bed, not a mattress.",
          }),
          buildProduct({
            category: "King size mattress",
            estimated_price_range: "$399",
            name: "Adjustable Mattress Foundation",
            price_value_verdict: "Fits under the $1500 budget.",
            pros: ["Adjustable mattress foundation and support base."],
            why_recommended: "A mattress foundation, not the mattress itself.",
          }),
          buildProduct({
            category: "King size mattress",
            estimated_price_range: "$750",
            name: "Hudson Bed | Pottery Barn",
            price_value_verdict: "Fits under the $1500 budget.",
            pros: ["King bed furniture from a home retailer."],
            why_recommended: "A bed frame/furniture listing, not a mattress.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        budget: "under $1500",
        query: "king size mattress",
        extractedRequirements: extractStructuredRequirements({
          budget: "under $1500",
          query: "king size mattress",
        }),
      },
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Nectar Classic 12 King Mattress"],
    );
    assert.equal(result.nearMatches.length, 0);
  });

  it("keeps lounge chairs and pillows out of office chair searches", () => {
    const request = {
      priorities: "black, lumbar support, under $300",
      query: "office chair",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Office chair",
            estimated_price_range: "$199",
            name: "HBADA P2 Ergonomic Office Chair",
            price_value_verdict: "Fits under $300.",
            pros: ["Black ergonomic office chair.", "Adjustable lumbar support."],
            why_recommended: "A black office chair with lumbar support.",
          }),
          buildProduct({
            category: "Office chair",
            estimated_price_range: "$699",
            name: "Sunny 32 Lounge Chair - Sandstone Wool Boucle",
            price_value_verdict: "Above the requested budget.",
            pros: ["Lounge chair for living rooms."],
            why_recommended: "A lounge chair, not an office task chair.",
          }),
          buildProduct({
            category: "Office chair",
            estimated_price_range: "$29",
            name: "Lucca Velvet Small Pillow",
            price_value_verdict: "Fits under $300.",
            pros: ["Small pillow accessory."],
            why_recommended: "A pillow accessory, not an office chair.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["HBADA P2 Ergonomic Office Chair"],
    );
    assert.equal(result.nearMatches.length, 0);
  });

  it("does not label overflow exact products as near matches", () => {
    const exactProducts = Array.from({ length: 6 }, (_, index) =>
      buildProduct({
        name: `Exact Beige Couch ${index + 1}`,
        product_page_url: `https://example.com/exact-beige-couch-${index + 1}`,
      }),
    );
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          ...exactProducts,
          buildProduct({
            name: "Gray Couch Near Match",
            product_page_url: "https://example.com/gray-couch",
            why_recommended: "A compact couch that measures 60 inches wide.",
            pros: ["Measures 60 inches wide."],
            cons: ["Only available in gray."],
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        query: "couch",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.exactMatches.length, 6);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(result.nearMatches[0].name, "Gray Couch Near Match");
    assert.equal(result.nearMatches[0].requirementCheck?.exactMatch, false);
  });

  it("keeps off-category products out of near matches", () => {
    const request = {
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Sectional",
            estimated_price_range: "Price not verified",
            name: 'Timber 31" Leather Ottoman - Charme Tan',
            price_value_verdict: "Price was not verified in the search result.",
            pros: ["Leather ottoman with wood frame."],
            why_recommended:
              "Search found this furniture product while looking for sectionals.",
          }),
          buildProduct({
            category: "Sectional",
            estimated_price_range: "Price not verified",
            name: "Left Facing Apartment Sectional",
            price_value_verdict: "Price was not verified in the search result.",
            pros: ["Left facing chaise sectional."],
            why_recommended:
              "A possible left-facing sectional, but several details need verification.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(result.nearMatches[0].name, "Left Facing Apartment Sectional");
  });

  it("does not treat plain sofa beds as sectional near matches", () => {
    const request = {
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Sectional",
            estimated_price_range: "Price not verified",
            name: 'Braam 75" Sofa Bed - Vintage White',
            price_value_verdict: "Price was not verified in the search result.",
            product_page_url: "https://example.com/braam-sofa-bed",
            pros: ["75 inch sofa bed."],
            why_recommended:
              "Search found this sofa bed while looking for compact sectionals.",
          }),
          buildProduct({
            category: "Sectional",
            estimated_price_range: "Price not verified",
            name: "112 Pet-Friendly Sectional Sofa With Reversible Chaise & Ottoman",
            price_value_verdict: "Price was not verified in the search result.",
            product_page_url: "https://example.com/pet-friendly-sectional",
            pros: [
              "Pet-friendly sectional sofa.",
              "Includes reversible chaise and ottoman.",
            ],
            why_recommended:
              "A sectional sofa with chaise and ottoman, but some required details need verification.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(
      result.nearMatches[0].name,
      "112 Pet-Friendly Sectional Sofa With Reversible Chaise & Ottoman",
    );
  });

  it("keeps hard avoid violations out of near matches", () => {
    const request = {
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Sectional",
            estimated_price_range: "$899",
            name: "Gray Velvet 3-Seater Left-Facing Sectional Sofa",
            price_value_verdict: "Current price is under $1,500.",
            pros: [
              "Gray velvet upholstery.",
              "Left-facing sectional sofa.",
              "84 inch width.",
            ],
            why_recommended:
              "A gray left-facing sectional sofa under 90 inches wide.",
          }),
          buildProduct({
            category: "Sectional",
            estimated_price_range: "Price not verified",
            name: "Left Facing Performance Fabric Sectional",
            price_value_verdict: "Price was not verified in the search result.",
            pros: ["Left-facing sectional sofa.", "Performance fabric upholstery."],
            why_recommended:
              "A possible pet-friendly left-facing sectional, but price and width need verification.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.nearMatches.length, 1);
    assert.equal(
      result.nearMatches[0].name,
      "Left Facing Performance Fabric Sectional",
    );
  });

  it("treats opposite sectional orientation as a clear feature miss", () => {
    const request = {
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = validateProductAgainstRequirements(
      buildProduct({
        category: "Sectional",
        estimated_price_range: "$899",
        name: "Spady Upholstered L-Shaped Sectional Right Hand Facing",
        price_value_verdict: "Current price is under $1,500.",
        pros: [
          "Right hand facing chaise.",
          "L-shaped sectional format.",
          "84 inch width.",
        ],
        why_recommended:
          "A right hand facing sectional found for a left-facing search.",
      }),
      {
        ...request,
        category: "sectional",
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.isMatch, false);
    assert.ok(
      result.missingRequirements.some((requirement) =>
        /left-facing/i.test(requirement),
      ),
    );
    assert.ok(
      result.requirementComparisons.some(
        (comparison) =>
          /left-facing/i.test(comparison.required) &&
          /right/i.test(comparison.productHas),
      ),
    );
  });

  it("treats unknown required feature evidence as a near match, not exact", () => {
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({ name: "Verified Black Full Sleeper" }),
          buildProduct({
            name: "Unknown Color Sleeper",
            best_for: "People who need a compact sleeper.",
            pros: ["Measures 60 inches wide."],
            price_value_verdict: "Fits the stated budget.",
            why_recommended: "A compact full sleeper that measures 60 inches wide.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        query: "pull out couch",
        budget: "$1500",
        priorities: "Less than 64 inches",
        selectedFeatures: ["Color: Beige"],
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 1);
    assert.deepEqual(result.nearMatches[0].requirementCheck.unknown, [
      "Color: Beige",
    ]);
    assert.deepEqual(result.nearMatches[0].requirementComparisons, [
      // Budget matched: the app now records a "matched" comparison so the UI
      // can show what price evidence was used (not just the label string).
      {
        required: "Budget: $1,500 or less",
        productHas: "Price: $399",
        status: "matched",
      },
      {
        required: "Color: Beige",
        productHas: "Color: not verified",
        status: "unknown",
      },
    ]);
  });

  it("does not treat not-verified wording as a hard feature violation", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        name: "Samsung NX60A6511SS",
        category: "Range",
        cons: ["Gas fuel type was not verified from the checked sources."],
        estimated_price_range: "$899",
      }),
      {
        budget: "under $2000",
        category: "oven",
        selectedFeatures: [
          {
            id: "fuel-type-equals-gas",
            name: "Fuel type",
            operator: "equals",
            required: true,
            source: "smart_features",
            type: "enum",
            value: "Gas",
          },
        ],
      },
    );

    assert.equal(result.isMatch, false);
    assert.deepEqual(result.missingRequirements, []);
    assert.deepEqual(result.unknownRequirements, ["Fuel type: Gas"]);
  });

  it("recognizes common appliance shorthand for required ice-maker features", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        category: "Refrigerator",
        estimated_price_range: "$999",
        name:
          "Conserv 30 inch 18 cu. ft. Top Freezer Apartment Refrigerator w Ice Maker Energy Star Counter Depth - Stainless Steel",
        pros: [
          "Stainless steel finish.",
          "30 inch width.",
          "Counter-depth refrigerator with ice included.",
        ],
        why_recommended:
          "A counter-depth stainless steel refrigerator with ice maker under 33 inches wide.",
      }),
      {
        budget: "under $1200",
        category: "refrigerator",
        extractedRequirements: extractStructuredRequirements({
          budget: "under $1200",
          priorities: "must have an ice maker and width under 33 inches",
          query: "counter-depth stainless steel refrigerator",
        }),
        priorities: "must have an ice maker and width under 33 inches",
      },
    );

    assert.equal(result.isMatch, true);
    assert.deepEqual(result.missingRequirements, []);
    assert.deepEqual(result.unknownRequirements, []);
    assert.ok(
      result.matchedRequirements.some((requirement) =>
        /ice maker/i.test(requirement),
      ),
    );
  });

  it("does not treat standalone ice makers as refrigerator near matches", () => {
    const result = validateProductAgainstRequirements(
      buildProduct({
        category: "Refrigerator",
        estimated_price_range: "$1,099",
        name: "Summit BIM26H34 15 Inch Built-In Ice Maker with 22 lbs. Storage",
        pros: ["Built-in ice maker with stainless steel door."],
        why_recommended:
          "A standalone built-in ice maker found during refrigerator search.",
      }),
      {
        budget: "under $1200",
        category: "refrigerator",
        extractedRequirements: extractStructuredRequirements({
          budget: "under $1200",
          priorities: "must have an ice maker and width under 33 inches",
          query: "counter-depth stainless steel refrigerator",
        }),
        priorities: "must have an ice maker and width under 33 inches",
      },
    );

    assert.equal(result.isMatch, false);
    assert.match(result.disqualifiedReason || "", /Category: refrigerator/);
  });

  it("validates difficult concrete feature requirements when product evidence supports them", () => {
    const cases = [
      {
        label: "left-facing sectional",
        request: {
          budget: "under $1500",
          priorities: "under 90 inches wide, pet-friendly, and not gray",
          query: "left-facing sectional",
        },
        product: buildProduct({
          best_for: "Homes that need a compact left-facing sectional.",
          category: "Sectional sofa",
          estimated_price_range: "$1,299",
          name: "84 in. LAF Pet Friendly Performance Fabric Sectional",
          price_value_verdict: "Current price is under $1,500.",
          pros: [
            "84 inch width.",
            "Left hand facing chaise configuration.",
            "Performance fabric upholstery.",
          ],
          why_recommended:
            "A left-facing pet-friendly sectional under 90 inches wide.",
        }),
      },
      {
        label: "queen storage bed frame",
        request: {
          budget: "under $400",
          priorities:
            "with storage drawers, no box spring required, modern style",
          query: "queen bed frame",
        },
        product: buildProduct({
          best_for: "Bedrooms that need built-in storage.",
          category: "Queen bed frame",
          estimated_price_range: "$329",
          name: "Modern Queen Platform Bed Frame with Storage Drawers",
          price_value_verdict: "Current price is under $400.",
          pros: [
            "Includes storage drawers.",
            "No box spring needed.",
            "Queen platform frame format.",
          ],
          why_recommended:
            "A queen platform bed frame with storage drawers and no box spring requirement.",
        }),
      },
      {
        label: "gaming TV",
        request: {
          budget: "under $700",
          priorities:
            "120Hz refresh rate, HDMI 2.1, good gaming performance",
          query: "65 inch TV",
        },
        product: buildProduct({
          best_for: "Console gaming and movies.",
          category: "65 inch TV",
          estimated_price_range: "$649",
          name: "65-Inch 4K QLED TV with Native 120Hz and HDMI 2.1",
          price_value_verdict: "Current price is under $700.",
          pros: [
            "65 inch screen size.",
            "Native 120Hz refresh rate.",
            "HDMI 2.1 ports for gaming consoles.",
          ],
          why_recommended:
            "A 65 inch TV with 120Hz refresh and HDMI 2.1 gaming support.",
        }),
      },
      {
        label: "third-rack dishwasher",
        request: {
          budget: "under $700",
          priorities: "stainless steel, quiet, third rack",
          query: "dishwasher",
        },
        product: buildProduct({
          best_for: "Kitchens that need extra rack space.",
          category: "Dishwasher",
          estimated_price_range: "$599",
          name: "Stainless Steel Dishwasher with Third Rack",
          price_value_verdict: "Current price is under $700.",
          pros: [
            "Stainless steel finish.",
            "Third rack for utensils.",
            "Quiet wash cycle.",
          ],
          why_recommended:
            "A stainless steel dishwasher with a third rack and quiet operation.",
        }),
      },
    ];

    for (const item of cases) {
      const result = validateProductAgainstRequirements(item.product, {
        ...item.request,
        extractedRequirements: extractStructuredRequirements(item.request),
      });

      assert.equal(result.isMatch, true, item.label);
      assert.deepEqual(result.missingRequirements, [], item.label);
      assert.deepEqual(result.unknownRequirements, [], item.label);
    }
  });

  it("rejects difficult feature candidates when they clearly violate required details", () => {
    const request = {
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = validateProductAgainstRequirements(
      buildProduct({
        category: "Sectional sofa",
        estimated_price_range: "$1,199",
        name: "Gray 84 in. Left Facing Performance Fabric Sectional",
        price_value_verdict: "Current price is under $1,500.",
        pros: [
          "84 inch width.",
          "Left facing chaise configuration.",
          "Performance fabric upholstery.",
          "Gray upholstery.",
        ],
        why_recommended:
          "A gray left-facing pet-friendly sectional under 90 inches wide.",
      }),
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.isMatch, false);
    assert.match(result.disqualifiedReason || "", /Avoid: gray/);
  });

  it("promotes enriched products after metadata verifies missing hard requirements", () => {
    const requirements = {
      query: "red refrigerator under $1000",
      extractedRequirements: extractStructuredRequirements({
        query: "red refrigerator under $1000",
      }),
    };
    const thinCandidate = buildProduct({
      category: "Refrigerator",
      common_complaints: [],
      cons: ["Review depth is limited."],
      estimated_price_range: "Price not verified",
      name: "Galanz GLR10TRDEFR Retro Refrigerator",
      price_value_verdict: "Price was not verified in the search result.",
      product_page_url: "https://www.appliancesconnection.com/galanz-glr10trdefr.html",
      pros: ["Limited review evidence available for real product advantages."],
      why_recommended: "Search found a possible refrigerator product page.",
    });
    const firstPass = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [thinCandidate],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      requirements,
    );

    assert.equal(firstPass.exactMatches.length, 0);
    assert.equal(firstPass.nearMatches.length, 1);

    const enrichedNearMatch = {
      ...firstPass.nearMatches[0],
      metadata: {
        colors: metadataField(["red"]),
        offers: [
          {
            availability: metadataField("InStock"),
            price: metadataField(799),
            priceCurrency: metadataField("USD"),
            retailer: "Appliances Connection",
            url: "https://www.appliancesconnection.com/galanz-glr10trdefr.html",
          },
        ],
        title: metadataField("Galanz GLR10TRDEFR Retro Red Refrigerator"),
      },
    };
    const revalidated = revalidateResultCandidates(
      {
        ...firstPass,
        nearMatches: [enrichedNearMatch],
      },
      requirements,
    );

    assert.equal(revalidated.exactMatches.length, 1);
    assert.equal(revalidated.nearMatches.length, 0);
    assert.equal(
      revalidated.exactMatches[0].name,
      "Galanz GLR10TRDEFR Retro Refrigerator",
    );
  });

  it("keeps five exact red refrigerator matches under $1000 when evidence supports color and price", () => {
    const request = {
      budget: "under $1000",
      query: "red refrigerator under $1000",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: Array.from({ length: 5 }, (_, index) =>
          buildProduct({
            name: `Red Refrigerator Model ${index + 1}`,
            category: "Refrigerator",
            product_page_url: `https://appliances.example.com/red-fridge-${index + 1}`,
            why_recommended:
              "A red refrigerator product page with current price evidence.",
            pros: ["Available in red.", "Product page confirms refrigerator category."],
            estimated_price_range: `$${799 + index * 20}`,
            price_value_verdict: "Current price is under the stated $1000 budget.",
            best_for: "Shoppers who need a red refrigerator under $1000.",
          }),
        ),
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 5);
    assert.equal(result.nearMatches.length, 0);
  });

  it("keeps black microwave, white desk with drawers, and cordless stick vacuum exact matches when supported", () => {
    const cases = [
      {
        query: "black microwave under $200",
        budget: "under $200",
        product: buildProduct({
          name: "Black Countertop Microwave 1.1 cu ft",
          category: "Microwave",
          product_page_url: "https://appliances.example.com/black-microwave",
          why_recommended: "A black microwave product page with verified price.",
          pros: ["Black finish.", "Countertop microwave format."],
          estimated_price_range: "$149",
          price_value_verdict: "Current price is under $200.",
        }),
      },
      {
        query: "white desk with drawers under $300",
        budget: "under $300",
        product: buildProduct({
          name: "White Writing Desk with Drawers",
          category: "Desk",
          product_page_url: "https://furniture.example.com/white-desk-drawers",
          why_recommended: "A white desk with drawers and verified price.",
          pros: ["White finish.", "Includes drawers for storage."],
          estimated_price_range: "$229",
          price_value_verdict: "Current price is under $300.",
        }),
      },
      {
        query: "cordless stick vacuum under $250",
        budget: "under $250",
        product: buildProduct({
          name: "Cordless Stick Vacuum Cleaner",
          category: "Stick vacuum",
          product_page_url: "https://appliances.example.com/cordless-stick-vacuum",
          why_recommended:
            "A cordless stick vacuum product page with verified price.",
          pros: ["Cordless operation.", "Stick vacuum form factor."],
          estimated_price_range: "$179",
          price_value_verdict: "Current price is under $250.",
        }),
      },
    ];

    for (const item of cases) {
      const request = {
        budget: item.budget,
        query: item.query,
      };
      const result = filterResultByRequirements(
        {
          search_summary: "Test result.",
          assumptions: [],
          recommendations: [item.product],
          what_to_avoid: [],
          final_buying_advice: "Test advice.",
        },
        {
          ...request,
          extractedRequirements: extractStructuredRequirements(request),
        },
      );

      assert.equal(result.exactMatches.length, 1, item.query);
      assert.equal(result.nearMatches.length, 0, item.query);
    }
  });

  it("uses close matches only when realistic products miss a hard requirement or have missing evidence", () => {
    const request = {
      budget: "under $800",
      priorities: "must be under 64 inches",
      query: "beige couch under 64 inches",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Beige Compact Couch 60 in",
            category: "Couch",
            product_page_url: "https://furniture.example.com/beige-compact-couch",
            why_recommended: "A beige couch that measures 60 inches wide.",
            pros: ["Available in beige.", "Measures 60 inches wide."],
            estimated_price_range: "$599",
            price_value_verdict: "Current price is under $800.",
          }),
          buildProduct({
            name: "Beige Standard Couch 72 in",
            category: "Couch",
            product_page_url: "https://furniture.example.com/beige-standard-couch",
            why_recommended: "A beige couch that measures 72 inches wide.",
            pros: ["Available in beige.", "Measures 72 inches wide."],
            estimated_price_range: "$699",
            price_value_verdict: "Current price is under $800.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 1);
    assert.match(result.nearMatches[0].disqualifiedReason || "", /Width/);
  });

  it("keeps material requirements firm for storage bed-frame searches", () => {
    const request = {
      budget: "under $400",
      priorities:
        "storage drawers, no box spring required, solid wood or metal, avoid upholstered headboard",
      query: "queen bed frame",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Metal Queen Bed Frame With Storage Drawers",
            category: "Queen bed frame",
            product_page_url: "https://furniture.example.com/metal-storage-bed",
            why_recommended:
              "A queen bed frame with storage drawers, no box spring required, and a heavy duty metal platform.",
            pros: [
              "Storage drawers.",
              "No box spring required.",
              "Heavy duty metal platform.",
            ],
            cons: [],
            estimated_price_range: "$249",
            price_value_verdict: "Current price is under $400.",
          }),
          buildProduct({
            name: "Particleboard Queen Bed Frame With Storage Drawers",
            category: "Queen bed frame",
            product_page_url: "https://furniture.example.com/particleboard-storage-bed",
            why_recommended:
              "A queen bed frame with storage drawers and no box spring required.",
            pros: ["Storage drawers.", "No box spring required."],
            cons: ["Particleboard-heavy construction."],
            estimated_price_range: "$349",
            price_value_verdict: "Current price is under $400.",
          }),
          buildProduct({
            name: "Upholstered Metal Queen Bed Frame With Storage Drawers",
            category: "Queen bed frame",
            product_page_url: "https://furniture.example.com/upholstered-storage-bed",
            why_recommended:
              "A queen bed frame with storage drawers, no box spring required, and a heavy duty metal platform.",
            pros: [
              "Upholstered metal queen bed frame.",
              "Storage drawers.",
              "No box spring required.",
            ],
            cons: [],
            estimated_price_range: "$299",
            price_value_verdict: "Current price is under $400.",
          }),
          buildProduct({
            name: "Queen Bed Frame with Adjustable Headboard and Upholstered Platform",
            category: "Queen bed frame",
            product_page_url: "https://furniture.example.com/upholstered-platform-bed",
            why_recommended:
              "A queen bed frame with adjustable headboard, storage drawers, no box spring required, and a metal platform.",
            pros: [
              "Storage drawers.",
              "No box spring required.",
              "Metal platform support.",
              "Upholstered platform detail.",
            ],
            cons: [],
            estimated_price_range: "$329",
            price_value_verdict: "Current price is under $400.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(result.exactMatches.length, 1);
    assert.equal(
      result.exactMatches[0].name,
      "Metal Queen Bed Frame With Storage Drawers",
    );
    assert.equal(result.nearMatches.length, 1);
    assert.match(
      result.nearMatches[0].disqualifiedReason || "",
      /Material: Solid Wood or Metal/i,
    );
    const displayedNames = [
      ...result.exactMatches,
      ...result.nearMatches,
    ].map((product) => product.name);
    assert.equal(
      displayedNames.includes(
        "Upholstered Metal Queen Bed Frame With Storage Drawers",
      ),
      false,
    );
    assert.equal(
      displayedNames.includes(
        "Queen Bed Frame with Adjustable Headboard and Upholstered Platform",
      ),
      false,
    );
  });

  it("keeps pressure-washer searches from showing laundry appliances", () => {
    const request = {
      budget: "under $250",
      priorities:
        "foam cannon long hose for cars patios reliable avoid gas",
      query: "electric pressure washer",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Electric Pressure Washer with Foam Cannon and 25 FT Hose",
            category: "Electric pressure washer",
            product_page_url: "https://tools.example.com/foam-cannon-pressure-washer",
            why_recommended:
              "An electric pressure washer for cars and patios with an included foam cannon and 25 ft high pressure hose.",
            pros: [
              "Foam cannon included for car washing.",
              "25 ft high pressure hose.",
              "Electric motor, no gas required.",
            ],
            cons: [],
            estimated_price_range: "$199",
            price_value_verdict: "Current price is under $250.",
          }),
          buildProduct({
            name: "Stacked Front Load Washer and Electric Dryer Set in White",
            category: "Electric pressure washer",
            product_page_url: "https://appliances.example.com/laundry-set",
            why_recommended:
              "Found as a broader product candidate from Google search results.",
            pros: [
              "Available color option: white.",
              "Listing details: Stacked Front Load Washer and Electric Dryer Set in White.",
            ],
            cons: [],
            estimated_price_range: "$48",
            price_value_verdict: "Current price is under $250.",
          }),
          buildProduct({
            name: "RYOBI 1800 PSI Electric Pressure Washer",
            category: "Electric pressure washer",
            product_page_url: "https://tools.example.com/ryobi-pressure-washer",
            why_recommended:
              "A compact electric pressure washer with a soap applicator and 20' ultra flex hose.",
            pros: [
              "20' ultra flex hose.",
              "Includes a soap applicator.",
              "Electric motor, no gas required.",
            ],
            cons: ["Does not include a foam cannon."],
            estimated_price_range: "$89",
            price_value_verdict: "Current price is under $250.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );
    const displayedNames = [
      ...result.exactMatches,
      ...result.nearMatches,
    ].map((product) => product.name);

    assert.equal(result.exactMatches.length, 1);
    assert.equal(
      result.exactMatches[0].name,
      "Electric Pressure Washer with Foam Cannon and 25 FT Hose",
    );
    assert.equal(
      displayedNames.includes(
        "Stacked Front Load Washer and Electric Dryer Set in White",
      ),
      false,
    );
    assert.equal(result.nearMatches.length, 1);
    assert.equal(
      result.nearMatches[0].name,
      "RYOBI 1800 PSI Electric Pressure Washer",
    );
    assert.match(
      result.nearMatches[0].disqualifiedReason || "",
      /Foam Cannon/i,
    );
  });

  it("matches equivalent feature wording and unit evidence across categories", () => {
    const cases = [
      {
        label: "pet hair from dog hair evidence",
        request: {
          priorities: "pet hair",
          query: "cordless vacuum",
        },
        product: buildProduct({
          category: "Cordless vacuum",
          name: "Cordless Stick Vacuum for Homes With Pets",
          pros: ["Removes dog hair and cat fur from carpets."],
          why_recommended: "A cordless vacuum for pet owners.",
        }),
      },
      {
        label: "quiet from dB evidence",
        request: {
          priorities: "quiet",
          query: "air purifier",
        },
        product: buildProduct({
          category: "Air purifier",
          name: "Bedroom HEPA Air Purifier",
          pros: ["Runs at 42 dB on sleep mode."],
          why_recommended: "A low-noise bedroom purifier.",
        }),
      },
      {
        label: "adjustable lumbar from lumbar support evidence",
        request: {
          priorities: "adjustable lumbar",
          query: "office chair",
        },
        product: buildProduct({
          category: "Office chair",
          name: "Ergonomic Mesh Office Chair",
          pros: ["Adjustable back support and lumbar support."],
          why_recommended: "An ergonomic chair for desk work.",
        }),
      },
      {
        label: "lightweight from portable low-weight evidence",
        request: {
          priorities: "lightweight",
          query: "cordless stick vacuum",
        },
        product: buildProduct({
          category: "Cordless stick vacuum",
          name: "Portable Cordless Stick Vacuum",
          pros: ["Lightweight 7.3-pound design for quick cleanups."],
          why_recommended: "A compact stick vacuum.",
        }),
      },
      {
        label: "under-width from hyphenated dimension evidence",
        request: {
          priorities: "under 64 inches wide",
          query: "tv stand",
        },
        product: buildProduct({
          category: "TV stand",
          name: "Modern 63-Inch TV Stand",
          pros: ["63-inch wide console with storage."],
          why_recommended: "A compact TV stand.",
        }),
      },
      {
        label: "citation evidence satisfies missing product copy",
        request: {
          priorities: "foam cannon",
          query: "electric pressure washer",
        },
        product: buildProduct({
          category: "Electric pressure washer",
          name: "Electric Pressure Washer Kit",
          pros: ["Includes pressure washer accessories."],
          why_recommended: "A car-washing pressure washer kit.",
          citations: [
            {
              title: "Retailer product page",
              url: "https://tools.example.com/washer-kit",
              what_it_supports: "Includes a foam sprayer for car washing.",
            },
          ],
        }),
      },
    ];

    for (const item of cases) {
      const validation = validateProductAgainstRequirements(item.product, {
        ...item.request,
        extractedRequirements: extractStructuredRequirements(item.request),
      });

      assert.equal(validation.isMatch, true, item.label);
      assert.deepEqual(validation.missingRequirements, [], item.label);
      assert.deepEqual(validation.unknownRequirements, [], item.label);
    }
  });

  it("keeps a verified 50-foot in-budget hose as an exact match", () => {
    const selectedLength = {
      id: "length-equals-50-ft",
      name: "Length",
      type: "number",
      operator: "equals",
      value: "50 ft",
      unit: "ft",
      required: true,
      source: "smart_features",
    };
    const request = {
      budget: "$100",
      query: "garden hose",
      selectedFeatures: [selectedLength],
    };
    const extractedRequirements = extractStructuredRequirements(request);
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Garden Hose",
            estimated_price_range: "About $39.97 to $44.98",
            name: "Flexzilla 5/8 in. x 50-foot ZillaGreen Garden Hose with 3/4 in. GHT Fittings",
            price_value_verdict: "Strong value for a popular garden hose.",
            pros: ["Flexible hose with reduced kink issues."],
            why_recommended:
              "A well-known 50 ft garden hose with broad retail availability.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements,
      },
    );
    const product = result.exactMatches[0];
    const allRequirementText = [
      ...(product?.matchedRequirements || []),
      ...(product?.missingRequirements || []),
      ...(product?.requirementComparisons || []).flatMap((item) => [
        item.required,
        item.productHas,
      ]),
    ].join("\n");

    assert.equal(result.exactMatches.length, 1);
    assert.equal(result.nearMatches.length, 0);
    assert.doesNotMatch(allRequirementText, /ft ft/i);
    assert.ok(
      product.requirementComparisons?.some(
        (comparison) =>
          comparison.required === "Budget: $100 or less" &&
          comparison.status === "matched",
      ),
    );
  });

  it("keeps conflicting product subtypes out of exact matches", () => {
    const request = {
      budget: "under $180",
      priorities: "nugget ice, self cleaning, quiet, compact, avoid water line",
      query: "countertop ice maker",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Countertop ice maker",
            cons: ["Bullet ice rather than nugget ice."],
            estimated_price_range: "$99",
            name: "Budget Bullet Ice Countertop Maker",
            price_value_verdict: "Under $180.",
            pros: [
              "Self-cleaning countertop ice maker.",
              "Quiet operation.",
              "Compact footprint.",
            ],
            why_recommended:
              "A compact countertop ice maker that makes bullet ice and has self-cleaning.",
          }),
          buildProduct({
            category: "Countertop nugget ice maker",
            estimated_price_range: "$149",
            name: "Compact Nugget Ice Countertop Maker",
            price_value_verdict: "Under $180.",
            pros: [
              "Makes soft chewable nugget ice.",
              "Automatic cleaning cycle.",
              "Quiet operation.",
              "Compact footprint.",
            ],
            why_recommended:
              "A compact countertop nugget ice maker with self-cleaning and quiet operation.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Compact Nugget Ice Countertop Maker"],
    );
    assert.deepEqual(
      result.nearMatches.map((product) => product.name),
      ["Budget Bullet Ice Countertop Maker"],
    );
    assert.match(result.nearMatches[0].disqualifiedReason || "", /Nugget Ice/i);
  });

  it("keeps products missing concrete accessories out of exact matches", () => {
    const request = {
      budget: "under $250",
      priorities:
        "steam wand, compact, easy cleaning, beginner friendly, avoid capsule only",
      query: "espresso machine",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Espresso machine",
            estimated_price_range: "$129.90",
            name: "Portable Manual Espresso Maker",
            price_value_verdict: "Under $250.",
            pros: ["Compact portable espresso maker."],
            why_recommended:
              "A compact manual espresso maker; use a separate milk frother for lattes.",
          }),
          buildProduct({
            category: "Espresso machine",
            estimated_price_range: "$149.99",
            name: "Compact Espresso Machine With Steam Wand",
            price_value_verdict: "Under $250.",
            pros: [
              "Compact countertop design.",
              "Manual steam wand for milk drinks.",
              "Dishwasher-safe parts and removable water tank.",
            ],
            why_recommended:
              "A compact beginner espresso machine with a steam wand and easy-clean removable parts.",
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.deepEqual(
      result.exactMatches.map((product) => product.name),
      ["Compact Espresso Machine With Steam Wand"],
    );
    assert.deepEqual(
      result.nearMatches.map((product) => product.name),
      ["Portable Manual Espresso Maker"],
    );
    assert.match(result.nearMatches[0].disqualifiedReason || "", /Steam Wand/i);
  });

  it("keeps dealbreakers hard across product families", () => {
    const podOnly = validateProductAgainstRequirements(
      buildProduct({
        category: "Coffee maker",
        name: "Single Serve K-Cup Only Coffee Maker",
        pros: ["Only works with pods and K-Cup capsules."],
        why_recommended: "A compact pod coffee maker.",
      }),
      {
        priorities: "avoid pod only",
        query: "coffee maker",
        extractedRequirements: extractStructuredRequirements({
          priorities: "avoid pod only",
          query: "coffee maker",
        }),
      },
    );
    const glassShelves = validateProductAgainstRequirements(
      buildProduct({
        category: "Refrigerator",
        name: "French Door Refrigerator",
        pros: ["Tempered glass shelves and humidity-controlled drawers."],
        why_recommended: "A refrigerator with flexible storage.",
      }),
      {
        priorities: "avoid glass shelves",
        query: "refrigerator",
        extractedRequirements: extractStructuredRequirements({
          priorities: "avoid glass shelves",
          query: "refrigerator",
        }),
      },
    );
    const noGas = validateProductAgainstRequirements(
      buildProduct({
        category: "Electric pressure washer",
        name: "Electric Pressure Washer",
        pros: ["Electric motor with no gas required."],
        why_recommended: "A corded electric pressure washer.",
      }),
      {
        priorities: "avoid gas",
        query: "electric pressure washer",
        extractedRequirements: extractStructuredRequirements({
          priorities: "avoid gas",
          query: "electric pressure washer",
        }),
      },
    );

    assert.equal(podOnly.isMatch, false);
    assert.match(podOnly.disqualifiedReason || "", /Avoid: pod only/i);
    assert.equal(glassShelves.isMatch, false);
    assert.match(glassShelves.disqualifiedReason || "", /Avoid: glass shelves/i);
    assert.equal(noGas.isMatch, true);
  });

  it("does not fail products for soft ambiguous preferences", () => {
    const request = {
      priorities: "modern style",
      query: "office chair",
    };
    const validation = validateProductAgainstRequirements(
      buildProduct({
        category: "Office chair",
        name: "Task Chair",
        pros: ["Breathable mesh back."],
        why_recommended: "A practical chair for desk work.",
      }),
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );

    assert.equal(validation.isMatch, true);
    assert.deepEqual(validation.missingRequirements, []);
    assert.deepEqual(validation.unknownRequirements, []);
  });

  it("removes stale over-budget copy when verified offer price is in budget", () => {
    const request = {
      budget: "under $160",
      query: "air purifier",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            name: "Example HEPA Air Purifier",
            category: "Air purifier",
            estimated_price_range: "Official price $199, sale price $99.99",
            why_recommended:
              "A solid fallback for buyers, although current official price is above budget.",
            pros: ["HEPA filtration.", "Quiet bedroom mode."],
            cons: ["Good if found on sale under budget."],
            common_complaints: [
              "Current official pricing is above the stated budget.",
            ],
            not_for: ["Buyers who need an in-budget option without waiting for a sale."],
            price_value_verdict:
              "Current official price is above budget. Reasonable if found on sale under budget.",
            metadata: {
              offers: [
                {
                  availability: metadataField("InStock"),
                  price: metadataField(99.99),
                  priceCurrency: metadataField("USD"),
                  retailer: "Example Store",
                  url: "https://example.com/air-purifier",
                },
              ],
            },
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );
    const product = result.exactMatches[0];
    const combinedCopy = [
      product.why_recommended,
      product.price_value_verdict,
      ...product.cons,
      ...product.common_complaints,
      ...product.not_for,
    ].join("\n");

    assert.equal(result.exactMatches.length, 1);
    assert.doesNotMatch(combinedCopy, /above budget|found on sale|fallback/i);
    assert.match(product.why_recommended, /solid option/i);
    assert.ok(
      product.requirementComparisons?.some(
        (comparison) =>
          comparison.required === "Budget: $160 or less" &&
          /^Price: \$/.test(comparison.productHas) &&
          comparison.status === "matched",
      ),
    );
  });

  it("removes stale in-budget copy when verified offer price is over budget", () => {
    const request = {
      budget: "under $180",
      query: "countertop ice maker",
    };
    const result = filterResultByRequirements(
      {
        search_summary: "Test result.",
        assumptions: [],
        recommendations: [
          buildProduct({
            category: "Countertop nugget ice maker",
            estimated_price_range: "$229.99",
            name: "Example Nugget Ice Maker",
            why_recommended:
              "This is the strongest in-budget all-around pick and stays under the budget.",
            price_value_verdict:
              "Good value without leaving the budget. Current price is under the stated budget.",
            pros: ["Nugget ice.", "Self-cleaning."],
            cons: ["Quiet rating needs more owner evidence."],
            metadata: {
              offers: [
                {
                  availability: metadataField("InStock"),
                  price: metadataField(229.99),
                  priceCurrency: metadataField("USD"),
                  retailer: "Example Store",
                  url: "https://example.com/ice-maker",
                },
              ],
            },
          }),
        ],
        what_to_avoid: [],
        final_buying_advice: "Test advice.",
      },
      {
        ...request,
        extractedRequirements: extractStructuredRequirements(request),
      },
    );
    const product = result.nearMatches[0];
    const combinedCopy = [
      product.why_recommended,
      product.price_value_verdict,
      ...product.cons,
    ].join("\n");

    assert.equal(result.exactMatches.length, 0);
    assert.equal(result.nearMatches.length, 1);
    assert.doesNotMatch(
      combinedCopy,
      /in-budget|under the budget|without leaving the budget/i,
    );
    assert.match(product.why_recommended, /above the stated budget/i);
    assert.ok(
      product.requirementComparisons?.some(
        (comparison) =>
          comparison.required === "Budget: $180 or less" &&
          /^Price: \$(?:229\.99|230)\b/.test(comparison.productHas) &&
          comparison.status === "failed",
      ),
    );
  });
});

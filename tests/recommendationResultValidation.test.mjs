import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterResultToVerifiedCitations,
  getProductPageCitationVerificationResult,
  getRecommendationResultIssue,
  classifyCitationType,
} from "../lib/recommendationResultValidation.ts";

function buildRecommendation(overrides = {}) {
  return {
    category: "example product",
    citations: [{ url: "https://example.com/product/example-product-a-123" }],
    confidence_score: 92,
    name: "Example Product Model A123",
    recommendation_type: "Best Match",
    source_consensus: "Strong",
    ...overrides,
  };
}

function buildResult(recommendations = [buildRecommendation()]) {
  return { recommendations };
}

describe("recommendation result trust validation", () => {
  it("allows a supported recommendation with a verified citation URL", () => {
    const issue = getRecommendationResultIssue(
      buildResult(),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, null);
  });

  it("treats OpenAI tracking parameters as equivalent for citation checks", () => {
    const issue = getRecommendationResultIssue(
      buildResult(),
      new Set(["https://example.com/product/example-product-a-123?utm_source=openai"]),
    );

    assert.equal(issue, null);
  });

  it("allows same-domain verified sources when exact citation paths differ", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          citations: [
            {
              title: "Original model citation",
              url: "https://www.example.com/product/example-product-model-a123",
              what_it_supports: "A product-specific claim.",
            },
          ],
        }),
      ]),
      new Set([
        "https://example.com/product/example-product-model-a123-details?utm_source=openai",
      ]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(
      filtered.recommendations[0].citations[0].url,
      "https://example.com/product/example-product-model-a123-details",
    );
    assert.equal(
      filtered.recommendations[0].citations[0].what_it_supports,
      "Verified source from the web research used for this recommendation.",
    );
  });

  it("downgrades overstated source consensus before rendering", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          confidence_score: 80,
          source_consensus: "Strong",
        }),
      ]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(filtered.recommendations[0].source_consensus, "Mixed");
  });

  it("flags no strong results found when there are no recommendations", () => {
    const issue = getRecommendationResultIssue(
      buildResult([]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, "no_reliable_evidence");
  });

  it("flags no strong sources found when web search returns no verified URLs", () => {
    const issue = getRecommendationResultIssue(buildResult(), new Set());

    assert.equal(issue, "no_reliable_evidence");
  });

  it("rejects recommendations without citations", () => {
    const issue = getRecommendationResultIssue(
      buildResult([buildRecommendation({ citations: [] })]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, "no_reliable_evidence");
  });

  it("rejects citations that were not found in verified web search sources", () => {
    const issue = getRecommendationResultIssue(
      buildResult(),
      new Set(["https://different-example.com/review"]),
    );

    assert.equal(issue, "no_reliable_evidence");
  });

  it("rejects a strong consensus score below the strong-confidence range", () => {
    const issue = getRecommendationResultIssue(
      buildResult([buildRecommendation({ confidence_score: 80 })]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, "bad_structured_output");
  });

  it("rejects weak consensus with an overstated confidence score", () => {
    const issue = getRecommendationResultIssue(
      buildResult([
        buildRecommendation({
          confidence_score: 82,
          source_consensus: "Weak",
        }),
      ]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, "bad_structured_output");
  });

  it("rejects niche consensus with near-certain confidence", () => {
    const issue = getRecommendationResultIssue(
      buildResult([
        buildRecommendation({
          confidence_score: 95,
          source_consensus: "Niche",
        }),
      ]),
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(issue, "bad_structured_output");
  });

  it("keeps only verified citations before rendering results", () => {
    const result = buildResult([
      buildRecommendation({
        citations: [
          { url: "https://example.com/product/example-product-a-123" },
          { url: "https://unverified.example.org/review" },
        ],
      }),
      buildRecommendation({
        citations: [{ url: "https://not-found.example.org/review" }],
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set(["https://example.com/product/example-product-a-123"]),
    );

    assert.equal(filtered.recommendations.length, 1);
    const cits = filtered.recommendations[0].citations;
    assert.equal(cits.length, 1);
    assert.equal(cits[0].url, "https://example.com/product/example-product-a-123");
  });

  it("drops generic category and collection pages cited as products", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          citations: [
            {
              title: "Cordless vacuums for pet homes",
              url: "https://www.sharkclean.com/sharkus_hidden.pet_cordless_vacuums",
              what_it_supports: "Category page for multiple cordless vacuums.",
            },
          ],
          name: "Shark Stratos Cordless Vacuum",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Running shoes search",
              url: "https://www.example.com/search/running-shoes",
              what_it_supports: "Search page for many running shoes.",
            },
          ],
          name: "Example Running Shoe",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Specific product page",
              url: "https://www.example.com/product/example-running-shoe-123",
              what_it_supports: "Specific shoe product page.",
            },
          ],
          name: "Example Running Shoe 123",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Ice Maker - Countertop Ice Makers - The Home Depot",
              url: "https://www.homedepot.com/b/Appliances-Ice-Makers-Countertop-Ice-Makers/Ice-Maker/N-5yc1vZ2fkour4Z1z0v5al?Nao=48",
              what_it_supports: "Category page for many ice makers.",
            },
          ],
          name: "EUHOMY Countertop Ice Maker Machine",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Countertop Ice Makers - Walmart.com",
              url: "https://www.walmart.com/cp/countertop-ice-makers/9372690",
              what_it_supports: "Category page for many ice makers.",
            },
          ],
          name: "KISSAIR Nugget Ice Maker Countertop",
        }),
      ]),
      new Set([
        "https://www.sharkclean.com/sharkus_hidden.pet_cordless_vacuums",
        "https://www.example.com/search/running-shoes",
        "https://www.example.com/product/example-running-shoe-123",
        "https://www.homedepot.com/b/Appliances-Ice-Makers-Countertop-Ice-Makers/Ice-Maker/N-5yc1vZ2fkour4Z1z0v5al?Nao=48",
        "https://www.walmart.com/cp/countertop-ice-makers/9372690",
      ]),
    );

    assert.deepEqual(
      filtered.recommendations.map((recommendation) => recommendation.name),
      ["Example Running Shoe 123"],
    );
  });

  it("drops Phase 5D collection, support, and documentation cards at final citation filtering", () => {
    const badRecommendations = [
      {
        category: "gas grill",
        name: "Gas Outdoor BBQ Grills Made in the USA - MHP Grills",
        url: "https://mhpgrills.com/products/grills",
      },
      {
        category: "shop vac",
        name: "Garage Pro Wet/Dry Vac | No / Low Suction - BISSELL Support",
        url:
          "https://support.bissell.com/app/answers/detail/a_id/1234/no-low-suction",
      },
      {
        category: "air purifier",
        name: "H7123 - Smart Pet Air Purifier - device.report",
        url: "https://device.report/govee/h7123",
      },
      {
        category: "shop vac",
        name: "New Customer Service | Shop-Vac Store",
        url: "https://www.shopvac.com/pages/customer-service",
      },
    ].map((input) =>
      buildRecommendation({
        category: input.category,
        citations: [
          {
            title: input.name,
            url: input.url,
            what_it_supports:
              "Supports this product candidate's listing metadata from search results.",
          },
        ],
        name: input.name,
      }),
    );
    const valid = buildRecommendation({
      category: "air purifier",
      citations: [
        {
          title: "Levoit Core 300S-P Smart Air Purifier",
          url: "https://levoit.com/products/core-300s-p-smart-air-purifier",
          what_it_supports: "Specific manufacturer product page.",
        },
      ],
      name: "Levoit Core 300S-P Smart Air Purifier",
    });
    const allUrls = new Set([
      ...badRecommendations.flatMap((item) =>
        item.citations.map((citation) => citation.url),
      ),
      valid.citations[0].url,
    ]);
    const filtered = filterResultToVerifiedCitations(
      buildResult([...badRecommendations, valid]),
      allUrls,
    );

    assert.deepEqual(
      filtered.recommendations.map((item) => item.name),
      ["Levoit Core 300S-P Smart Air Purifier"],
    );
  });

  it("drops nested retailer catalog pages during final citation filtering", () => {
    const categoryUrl =
      "https://www.bestbuy.com/site/outdoor-power-equipment/pressure-washers/pcmcat1597940389709.c?id=pcmcat1597940389709";
    const productUrl =
      "https://www.bestbuy.com/site/greenworks-2000-psi-electric-pressure-washer/6543210.p";
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "pressure washer",
          citations: [
            {
              title: "Pressure Washers - Best Buy",
              url: categoryUrl,
              what_it_supports: "Category page for multiple pressure washers.",
            },
          ],
          name: "Pressure Washers - Best Buy",
        }),
        buildRecommendation({
          category: "pressure washer",
          citations: [
            {
              title: "Greenworks 2000 PSI Electric Pressure Washer",
              url: productUrl,
              what_it_supports: "Specific retailer product page.",
            },
          ],
          name: "Greenworks 2000 PSI Electric Pressure Washer",
        }),
      ]),
      new Set([categoryUrl, productUrl]),
    );

    assert.deepEqual(
      filtered.recommendations.map((item) => item.name),
      ["Greenworks 2000 PSI Electric Pressure Washer"],
    );
  });

  it("drops editorial rankings and broad retailer shoe listing pages cited as products", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          citations: [
            {
              title: "ESPN sneaker ranking",
              url: "https://www.espn.com/nba/story/_/id/123456/ranking-top-74-sneakers-nba-history",
              what_it_supports: "Editorial ranking, not a buyable product page.",
            },
          ],
          name: "Ranking the top 74 sneakers in NBA history - ESPN",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Nike category page",
              url: "https://www.nike.com/w/basketball-shoes-3glsmzy7ok",
              what_it_supports: "Category page for many Nike basketball shoes.",
            },
          ],
          name: "Basketball Shoes. Nike.com",
        }),
        buildRecommendation({
          citations: [
            {
              title: "DICK'S category page",
              url: "https://www.dickssportinggoods.com/f/basketball-shoes-for-speed",
              what_it_supports: "Listing page for many basketball shoes.",
            },
          ],
          name: "Basketball Shoes For Speed | DICK'S Sporting Goods",
        }),
        buildRecommendation({
          citations: [
            {
              title: "RunRepeat review page",
              url: "https://runrepeat.com/nike-gt-jump-2",
              what_it_supports: "Review page, not a buyable product page.",
            },
          ],
          name: "Cut in half: Nike G.T. Jump 2 Review | RunRepeat",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Nike newsroom page",
              url: "https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info",
              what_it_supports: "Brand newsroom article, not a buyable product page.",
            },
          ],
          name: "Nike Basketball Releases the Book 2, the Next Chapter in Devin ...",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Nike brand page",
              url: "https://www.nike.com/air-force-1",
              what_it_supports: "Brand landing page, not a buyable product page.",
            },
          ],
          name: "Nike Air Force 1",
        }),
        buildRecommendation({
          citations: [
            {
              title: "DICK'S advice listing",
              url: "https://www.dickssportinggoods.com/a/nike-mens-stability-shoes-0zdz01a.html",
              what_it_supports: "Retailer advice/listing page, not one product.",
            },
          ],
          name: "Nike Men's Stability Shoes | DICK'S Sporting Goods",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Sneaker Files guide",
              url: "https://www.sneakerfiles.com/nike-giannis-freak-6-colorways-release-dates/",
              what_it_supports: "Sneaker news guide, not a buyable product page.",
            },
          ],
          name: "Nike Giannis Freak 6 Colorways + Release Dates (Complete Guide)",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Runner's World review",
              url: "https://www.runnersworld.com/uk/gear/shoes/a60703694/nike-alphafly-3-review/",
              what_it_supports: "Review article, not a product page.",
            },
          ],
          name: "Nike Alphafly 3: Tried and tested - Runner's World",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Running review",
              url: "https://running.example.com/reviews/nike-winflo-11",
              what_it_supports: "Review article, not a product page.",
            },
          ],
          name: "Review: Nike Winflo 11",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Air purifier buying advice",
              url: "https://www.iqair.com/us/newsroom/things-to-avoid-when-purchasing-air-purifier",
              what_it_supports: "Buying advice article, not a product page.",
            },
          ],
          name: "7 Things to Avoid When Purchasing an Air Purifier | IQAir USA",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Klarna shopping comparison",
              url: "https://www.klarna.com/us/shopping/sp/nike-kd-trey-5-x",
              what_it_supports: "Price-comparison page, not a product page.",
            },
          ],
          name: "Nike kd trey 5 x - Klarna",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Shoe news article",
              url: "https://shoe-news.example.com/new-balance-lineup-update",
              what_it_supports: "Article about a product lineup.",
            },
          ],
          name: "New Balance Shuffles Its Lineup: 847 Out, FuelCell Walker Elite In?",
        }),
        buildRecommendation({
          citations: [
            {
              title: "NBA rule page",
              url: "https://official.nba.com/rule-no-1-court-dimensions-equipment/",
              what_it_supports: "Court rule page, not a product page.",
            },
          ],
          name: "RULE NO. 1: Court Dimensions – Equipment - NBA Official",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Pinterest dimensions page",
              url: "https://www.pinterest.com/pin/basketball-hoop-backboard-dimensions-drawings/",
              what_it_supports: "Dimensions image collection, not a product page.",
            },
          ],
          name: "Basketball Hoop & Backboard Dimensions & Drawings - Pinterest",
        }),
        buildRecommendation({
          citations: [
            {
              title: "Specific Nike product page",
              url: "https://www.nike.com/t/book-1-solar-red-basketball-shoes-HtV54G",
              what_it_supports: "Specific product page.",
            },
          ],
          name: 'Book 1 "Solar Red" Basketball Shoes - Nike',
        }),
      ]),
      new Set([
        "https://www.espn.com/nba/story/_/id/123456/ranking-top-74-sneakers-nba-history",
        "https://www.nike.com/w/basketball-shoes-3glsmzy7ok",
        "https://www.dickssportinggoods.com/f/basketball-shoes-for-speed",
        "https://runrepeat.com/nike-gt-jump-2",
        "https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info",
        "https://www.nike.com/air-force-1",
        "https://www.dickssportinggoods.com/a/nike-mens-stability-shoes-0zdz01a.html",
        "https://www.sneakerfiles.com/nike-giannis-freak-6-colorways-release-dates/",
        "https://www.runnersworld.com/uk/gear/shoes/a60703694/nike-alphafly-3-review/",
        "https://running.example.com/reviews/nike-winflo-11",
        "https://www.klarna.com/us/shopping/sp/nike-kd-trey-5-x",
        "https://shoe-news.example.com/new-balance-lineup-update",
        "https://official.nba.com/rule-no-1-court-dimensions-equipment/",
        "https://www.pinterest.com/pin/basketball-hoop-backboard-dimensions-drawings/",
        "https://www.nike.com/t/book-1-solar-red-basketball-shoes-HtV54G",
      ]),
    );

    assert.deepEqual(
      filtered.recommendations.map((recommendation) => recommendation.name),
      ['Book 1 "Solar Red" Basketball Shoes - Nike'],
    );
  });

  it("drops a verified question-style article even when its /p/ path looks product-like", () => {
    const articleUrl =
      "https://thebkpets.substack.com/p/is-costco-kirkland-dog-food-actually";
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "dog food",
          citations: [
            {
              title: "Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets",
              url: articleUrl,
              what_it_supports: "Editorial discussion of Kirkland dog food.",
            },
          ],
          name: "Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets",
        }),
      ]),
      new Set([articleUrl]),
    );

    assert.equal(filtered.recommendations.length, 0);
  });

  it("retains a valid product page instead of replacing it with a generic same-domain listing", () => {
    const productUrl =
      "https://www.homedepot.com/p/EGO-POWER-650-CFM-Cordless-Leaf-Blower-LB6504/123456789";
    const categoryUrl =
      "https://www.homedepot.com/b/Outdoors-Outdoor-Power-Equipment-Leaf-Blowers/N-5yc1vZbxav";
    const result = buildResult([
        buildRecommendation({
          category: "leaf blower",
          citations: [
            {
              title: "EGO POWER+ 650 CFM Cordless Leaf Blower",
              url: productUrl,
              what_it_supports: "Specific retailer product page.",
            },
          ],
          name: "EGO POWER+ 650 CFM Cordless Leaf Blower",
        }),
      ]);
    const verificationResult = getProductPageCitationVerificationResult(
      result,
      new Set([categoryUrl]),
    );
    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([categoryUrl, productUrl]),
    );

    assert.deepEqual(
      verificationResult.recommendations[0].citations.map(
        (citation) => citation.url,
      ),
      [productUrl],
    );
    assert.equal(filtered.recommendations.length, 1);
    assert.equal(filtered.recommendations[0].citations[0].url, productUrl);
    assert.notEqual(filtered.recommendations[0].citations[0].url, categoryUrl);
  });

  it("keeps a valid manufacturer product page primary when editorial evidence is verified", () => {
    const productUrl =
      "https://oralb.com/en-us/products/electric-toothbrushes/io-series-6";
    const editorialUrl =
      "https://www.techradar.com/health-fitness/best-electric-toothbrush";
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "electric toothbrush",
          citations: [
            {
              title: "Best electric toothbrushes",
              url: editorialUrl,
              what_it_supports: "Independent comparison evidence.",
            },
            {
              title: "Oral-B iO Series 6 Electric Toothbrush",
              url: productUrl,
              what_it_supports: "Specific manufacturer product page.",
            },
          ],
          name: "Oral-B iO Series 6 Electric Toothbrush",
        }),
      ]),
      new Set([editorialUrl, productUrl]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(filtered.recommendations[0].citations[0].url, productUrl);
    assert.equal(
      filtered.recommendations[0].citations[0].citation_type,
      "weak-uncorroborated",
    );
    assert.equal(filtered.recommendations[0].citations[1].url, editorialUrl);
    assert.equal(
      filtered.recommendations[0].citations[1].citation_type,
      "independent-editorial",
    );
  });

  it("keeps generic family evidence secondary and removes wrong-recipe product citations", () => {
    const familyUrl =
      "https://www.chewy.com/brands/purina-pro-plan-dog-food-7437";
    const wrongRecipeUrl =
      "https://www.chewy.com/purina-pro-plan-beef-rice/dp/222222";
    const exactProductUrl =
      "https://www.chewy.com/purina-pro-plan-sensitive-skin-salmon/dp/111111";
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "dog food",
          citations: [
            {
              title: "Purina Pro Plan Dog Food: Wet & Dry Dog Food | Chewy",
              url: familyUrl,
              what_it_supports: "Brand-family evidence.",
            },
            {
              title:
                "Purina Pro Plan Complete Essentials Beef & Rice Dry Dog Food",
              url: wrongRecipeUrl,
              what_it_supports: "A different Purina recipe.",
            },
            {
              title:
                "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
              url: exactProductUrl,
              what_it_supports: "The exact product page.",
            },
          ],
          name:
            "Purina Pro Plan Sensitive Skin & Stomach Salmon & Rice Dry Dog Food",
        }),
      ]),
      new Set([familyUrl, wrongRecipeUrl, exactProductUrl]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(filtered.recommendations[0].citations[0].url, exactProductUrl);
    assert.equal(
      filtered.recommendations[0].citations.some(
        (citation) => citation.url === wrongRecipeUrl,
      ),
      false,
    );
    assert.equal(
      filtered.recommendations[0].citations.some(
        (citation) => citation.url === familyUrl,
      ),
      true,
    );
  });

  it("rejects explicit recipe conflicts across unrelated food products", () => {
    const cases = [
      {
        name: "Hill's Perfect Digestion Chicken & Brown Rice Dry Dog Food",
        citationTitle:
          "Hill's Perfect Digestion Salmon & Brown Rice Dry Dog Food",
        url: "https://www.chewy.com/hills-perfect-digestion-salmon/dp/333333",
      },
      {
        name: "JustFoodForDogs Chicken & Rice Fresh Dog Food",
        citationTitle: "JustFoodForDogs Fish & Sweet Potato Fresh Dog Food",
        url: "https://www.chewy.com/justfoodfordogs-fish-sweet-potato/dp/444444",
      },
      {
        name:
          "Blue Buffalo Life Protection Adult Chicken & Brown Rice Dry Dog Food",
        citationTitle:
          "Blue Buffalo Life Protection Small Breed Puppy Chicken & Oatmeal Dry Dog Food",
        url: "https://www.chewy.com/blue-buffalo-puppy-oatmeal/dp/555556",
      },
    ];

    for (const item of cases) {
      const filtered = filterResultToVerifiedCitations(
        buildResult([
          buildRecommendation({
            category: "dog food",
            citations: [
              {
                title: item.citationTitle,
                url: item.url,
                what_it_supports: "A different recipe.",
              },
            ],
            name: item.name,
          }),
        ]),
        new Set([item.url]),
      );

      assert.equal(filtered.recommendations.length, 0);
    }
  });

  it("drops a specific product-page citation when same-product identity is unknown", () => {
    const exactUrl = "https://www.walmart.com/ip/iams-adult-lamb-rice/14651646";
    const unrelatedUrl =
      "https://www.walmart.com/ip/iams-adult-small-toy-breeds/11027222";
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "dog food",
          citations: [
            {
              title: "Iams Proactive Health Adult Lamb Meal & Rice",
              url: exactUrl,
              what_it_supports: "The exact product.",
            },
            {
              title:
                "Iams Proactive Health Adult Small & Toy Breeds Dry Dog Food",
              url: unrelatedUrl,
              what_it_supports: "A different Iams formula.",
            },
          ],
          name: "Iams Proactive Health Adult Lamb Meal & Rice",
        }),
      ]),
      new Set([exactUrl, unrelatedUrl]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.deepEqual(
      filtered.recommendations[0].citations.map((citation) => citation.url),
      [exactUrl],
    );
  });

  it("keeps exact same-product citations and rejects explicit model conflicts", () => {
    const exactUrl =
      "https://www.chewy.com/hills-perfect-digestion-chicken/dp/555555";
    const exact = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "dog food",
          citations: [
            {
              title:
                "Hill's Perfect Digestion Chicken & Brown Rice Dry Dog Food, 12-lb bag",
              url: exactUrl,
              what_it_supports: "The exact product in another package size.",
            },
          ],
          name: "Hill's Perfect Digestion Chicken & Brown Rice Dry Dog Food",
        }),
      ]),
      new Set([exactUrl]),
    );
    const wrongModelUrl =
      "https://www.bestbuy.com/site/samsung-qn85d-tv/123456.p";
    const wrongModel = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          category: "television",
          citations: [
            {
              title: "Samsung QN85D 65-inch Neo QLED TV",
              url: wrongModelUrl,
              what_it_supports: "A different Samsung TV model.",
            },
          ],
          name: "Samsung QN90D 65-inch Neo QLED TV",
        }),
      ]),
      new Set([wrongModelUrl]),
    );

    assert.equal(exact.recommendations.length, 1);
    assert.equal(wrongModel.recommendations.length, 0);
  });

  it("targets specific manufacturer pages but not generic product-family pages", () => {
    const purinaProductUrl =
      "https://shop.purina.com/pro-plan-reg-savor-adult-shredded-blend-beef-rice-formula";
    const hillsProductUrl =
      "https://www.hillspet.com/dog-food/science-diet-puppy-large-breed-dry";
    const purinaFamilyUrl =
      "https://www.purina.com/pro-plan/products/dog-food";
    const result = buildResult([
      buildRecommendation({
        category: "dog food",
        citations: [
          {
            title: "Complete Essentials Shredded Blend Beef & Rice Dry Dog Food",
            url: purinaProductUrl,
          },
        ],
        name:
          "Purina Pro Plan Complete Essentials Shredded Blend Beef and Rice Formula",
      }),
      buildRecommendation({
        category: "dog food",
        citations: [
          {
            title: "Puppy Large Breed Chicken & Brown Rice Recipe",
            url: hillsProductUrl,
          },
        ],
        name: "Hill's Science Diet Puppy Large Breed Chicken & Brown Rice Recipe",
      }),
      buildRecommendation({
        category: "dog food",
        citations: [
          {
            title: "Pro Plan Wet & Dry Dog Food | Purina US",
            url: purinaFamilyUrl,
          },
        ],
        name: "Pro Plan Wet & Dry Dog Food | Purina US",
      }),
    ]);
    const verificationResult = getProductPageCitationVerificationResult(
      result,
      new Set(),
    );
    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([purinaProductUrl, hillsProductUrl, purinaFamilyUrl]),
    );

    assert.deepEqual(
      verificationResult.recommendations.map((recommendation) => ({
        name: recommendation.name,
        url: recommendation.citations[0].url,
      })),
      [
        {
          name:
            "Purina Pro Plan Complete Essentials Shredded Blend Beef and Rice Formula",
          url: purinaProductUrl,
        },
        {
          name:
            "Hill's Science Diet Puppy Large Breed Chicken & Brown Rice Recipe",
          url: hillsProductUrl,
        },
      ],
    );
    assert.deepEqual(
      filtered.recommendations.map((recommendation) => recommendation.name),
      [
        "Purina Pro Plan Complete Essentials Shredded Blend Beef and Rice Formula",
        "Hill's Science Diet Puppy Large Breed Chicken & Brown Rice Recipe",
      ],
    );
  });

  it("does not render the same product multiple times in the candidate pool", () => {
    const result = buildResult([
      buildRecommendation({
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Match",
      }),
      buildRecommendation({
        citations: [{ url: "https://example.com/product/bissell-little-green-value-123" }],
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Match",
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([
        "https://example.com/product/example-product-a-123",
        "https://example.com/product/bissell-little-green-value-123",
      ]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(filtered.recommendations[0].recommendation_type, "Best Match");
  });

  it("treats minor product-name formatting differences as duplicates", () => {
    const result = buildResult([
      buildRecommendation({
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Match",
      }),
      buildRecommendation({
        citations: [{ url: "https://example.com/product/bissell-little-green-value-123" }],
        name: "Bissell Little Green portable cleaner",
        recommendation_type: "Best Match",
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([
        "https://example.com/product/example-product-a-123",
        "https://example.com/product/bissell-little-green-value-123",
      ]),
    );

    assert.equal(filtered.recommendations.length, 1);
  });
});

describe("product-page citation rescue (citation verification)", () => {
  const prod = (url, name = "RIDGID 12 Gallon NXT Wet/Dry Vac HD1200") =>
    buildResult([
      buildRecommendation({ name, citations: [{ title: name, url }] }),
    ]);

  it("keeps a real product-page candidate whose URL is not in the verified set", () => {
    const filtered = filterResultToVerifiedCitations(
      prod("https://www.homedepot.com/p/RIDGID-12-Gallon-NXT-Wet-Dry-Vac-HD1200/204825270"),
      new Set(), // web research verified nothing
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(filtered.recommendations[0].citations.length, 1);
  });

  it("matches a verified URL despite tracking params and a trailing slash", () => {
    const filtered = filterResultToVerifiedCitations(
      prod("https://www.homedepot.com/p/RIDGID-NXT/204825270/?gclid=abc&ref=nav&utm_source=x"),
      new Set(["https://www.homedepot.com/p/RIDGID-NXT/204825270"]),
    );

    assert.equal(filtered.recommendations.length, 1);
  });

  it("still drops article/review pages cited as products", () => {
    const filtered = filterResultToVerifiedCitations(
      prod("https://www.tomsguide.com/best-picks/best-robot-vacuums", "Best Robot Vacuums 2026"),
      new Set(),
    );

    assert.equal(filtered.recommendations.length, 0);
  });

  it("still drops category/listing and search pages", () => {
    const listing = filterResultToVerifiedCitations(
      prod("https://www.homedepot.com/b/Tools-Wet-Dry-Vacuums/N-5yc1vZc29k"),
      new Set(),
    );
    const search = filterResultToVerifiedCitations(
      prod("https://www.amazon.com/s?k=shop+vac"),
      new Set(),
    );

    assert.equal(listing.recommendations.length, 0);
    assert.equal(search.recommendations.length, 0);
  });

  it("never rescues an uncited recommendation (no product URL)", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([buildRecommendation({ citations: [] })]),
      new Set(),
    );

    assert.equal(filtered.recommendations.length, 0);
  });
});

describe("citation type classification", () => {
  it("classifies Tier-1 editorial URLs as independent-editorial", () => {
    assert.equal(classifyCitationType("https://www.wirecutter.com/reviews/best-robot-vacuums/"), "independent-editorial");
    assert.equal(classifyCitationType("https://rtings.com/robot-vacuums"), "independent-editorial");
    assert.equal(classifyCitationType("https://www.cnet.com/home/kitchen-and-household/best-blenders/"), "independent-editorial");
  });

  it("classifies Tier-2 marketplace URLs as retailer-marketplace", () => {
    assert.equal(classifyCitationType("https://www.amazon.com/dp/B0ABCDEF12"), "retailer-marketplace");
    assert.equal(classifyCitationType("https://www.homedepot.com/p/RIDGID-12-Gallon-6-0/12345"), "retailer-marketplace");
    assert.equal(classifyCitationType("https://www.bestbuy.com/site/product/12345.p"), "retailer-marketplace");
  });

  it("classifies manufacturer/unknown URLs as weak-uncorroborated", () => {
    assert.equal(classifyCitationType("https://www.irobot.com/en_US/roomba-960.html"), "weak-uncorroborated");
    assert.equal(classifyCitationType("https://somebrand.com/product/model-x"), "weak-uncorroborated");
    assert.equal(classifyCitationType("https://reddit.com/r/Roborock/comments/abc123"), "weak-uncorroborated");
  });

  it("tags rescued citations as product-page-self in the full filter pipeline", () => {
    // Candidate has a product-page URL not in verifiedUrls → gets rescued.
    const rec = buildRecommendation({
      name: "Example Vacuum Model X100",
      citations: [{ url: "https://www.homedepot.com/p/Example-Vacuum-Model-X100/12345678" }],
    });
    const filtered = filterResultToVerifiedCitations(
      buildResult([rec]),
      new Set(), // no verifiedUrls → triggers rescue path
    );
    assert.equal(filtered.recommendations.length, 1);
    const cit = filtered.recommendations[0].citations[0];
    assert.equal(cit.citation_type, "product-page-self");
  });

  it("does not let a strict product-page self-cite borrow unrelated verification", () => {
    const productUrl =
      "https://oralb.com/en-us/products/electric-toothbrushes/io-series-6";
    const editorialUrl =
      "https://www.techradar.com/health-fitness/best-electric-toothbrush";
    const selfCited = buildResult([
        buildRecommendation({
          category: "electric toothbrush",
          citations: [
            {
              title: "Oral-B iO Series 6 Electric Toothbrush",
              url: productUrl,
              citation_type: "product-page-self",
            },
            {
              title: "Best electric toothbrushes",
              url: editorialUrl,
            },
          ],
          name: "Oral-B iO Series 6 Electric Toothbrush",
        }),
      ]);

    assert.equal(
      getRecommendationResultIssue(selfCited, new Set([editorialUrl])),
      "no_reliable_evidence",
    );
  });

  it("tags verified editorial citations with their type when paired with a product-page citation", () => {
    // Real scenario: product page (Amazon) as primary, editorial (Wirecutter) as secondary.
    // The primary URL passes product eligibility; both citations get type-tagged.
    const rec = buildRecommendation({
      citations: [
        {
          title: "Example Product Model A123",
          url: "https://www.amazon.com/dp/B0A1B2C3D4",
        },
        { url: "https://www.wirecutter.com/reviews/best-robot-vacuums/" },
      ],
    });
    const filtered = filterResultToVerifiedCitations(
      buildResult([rec]),
      new Set([
        "https://www.amazon.com/dp/B0A1B2C3D4",
        "https://www.wirecutter.com/reviews/best-robot-vacuums/",
      ]),
    );
    assert.equal(filtered.recommendations.length, 1);
    const cits = filtered.recommendations[0].citations;
    const byType = Object.fromEntries(cits.map(c => [c.citation_type, c.url]));
    assert.equal(byType["independent-editorial"], "https://www.wirecutter.com/reviews/best-robot-vacuums"); // trailing slash stripped by normalizeUrl
    assert.equal(byType["retailer-marketplace"], "https://www.amazon.com/dp/B0A1B2C3D4");
  });
});

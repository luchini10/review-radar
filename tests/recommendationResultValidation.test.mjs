import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterResultToVerifiedCitations,
  getRecommendationResultIssue,
} from "../lib/recommendationResultValidation.ts";

function buildRecommendation(overrides = {}) {
  return {
    citations: [{ url: "https://example.com/review" }],
    confidence_score: 92,
    name: "Example Product A",
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
      new Set(["https://example.com/review"]),
    );

    assert.equal(issue, null);
  });

  it("treats OpenAI tracking parameters as equivalent for citation checks", () => {
    const issue = getRecommendationResultIssue(
      buildResult(),
      new Set(["https://example.com/review?utm_source=openai"]),
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
              url: "https://www.example.com/specific-review",
              what_it_supports: "A product-specific claim.",
            },
          ],
        }),
      ]),
      new Set(["https://example.com/best-list?utm_source=openai"]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.equal(
      filtered.recommendations[0].citations[0].url,
      "https://example.com/best-list",
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
      new Set(["https://example.com/review"]),
    );

    assert.equal(filtered.recommendations[0].source_consensus, "Mixed");
  });

  it("flags no strong results found when there are no recommendations", () => {
    const issue = getRecommendationResultIssue(
      buildResult([]),
      new Set(["https://example.com/review"]),
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
      new Set(["https://example.com/review"]),
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
      new Set(["https://example.com/review"]),
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
      new Set(["https://example.com/review"]),
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
      new Set(["https://example.com/review"]),
    );

    assert.equal(issue, "bad_structured_output");
  });

  it("keeps only verified citations before rendering results", () => {
    const result = buildResult([
      buildRecommendation({
        citations: [
          { url: "https://example.com/review" },
          { url: "https://unverified.example.org/review" },
        ],
      }),
      buildRecommendation({
        citations: [{ url: "https://not-found.example.org/review" }],
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set(["https://example.com/review"]),
    );

    assert.equal(filtered.recommendations.length, 1);
    assert.deepEqual(filtered.recommendations[0].citations, [
      { url: "https://example.com/review" },
    ]);
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

  it("does not verify a product citation by replacing it with a generic same-domain listing", () => {
    const filtered = filterResultToVerifiedCitations(
      buildResult([
        buildRecommendation({
          citations: [
            {
              title: "Specific product page",
              url: "https://www.example.com/product/example-vacuum-123",
              what_it_supports: "Specific vacuum product page.",
            },
          ],
          name: "Example Vacuum 123",
        }),
      ]),
      new Set(["https://www.example.com/collections/vacuums"]),
    );

    assert.equal(filtered.recommendations.length, 0);
  });

  it("does not render the same product multiple times in the candidate pool", () => {
    const result = buildResult([
      buildRecommendation({
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Match",
      }),
      buildRecommendation({
        citations: [{ url: "https://example.com/value-review" }],
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Match",
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([
        "https://example.com/review",
        "https://example.com/value-review",
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
        citations: [{ url: "https://example.com/value-review" }],
        name: "Bissell Little Green portable cleaner",
        recommendation_type: "Best Match",
      }),
    ]);

    const filtered = filterResultToVerifiedCitations(
      result,
      new Set([
        "https://example.com/review",
        "https://example.com/value-review",
      ]),
    );

    assert.equal(filtered.recommendations.length, 1);
  });
});

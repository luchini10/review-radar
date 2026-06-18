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

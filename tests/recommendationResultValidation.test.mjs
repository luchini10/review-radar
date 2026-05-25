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
    recommendation_type: "Best Overall",
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

  it("does not render the same product in multiple recommendation slots", () => {
    const result = buildResult([
      buildRecommendation({
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Budget",
      }),
      buildRecommendation({
        citations: [{ url: "https://example.com/value-review" }],
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Value",
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
    assert.equal(filtered.recommendations[0].recommendation_type, "Best Budget");
  });

  it("treats minor product-name formatting differences as duplicates", () => {
    const result = buildResult([
      buildRecommendation({
        name: "Bissell Little Green Portable Carpet Cleaner",
        recommendation_type: "Best Budget",
      }),
      buildRecommendation({
        citations: [{ url: "https://example.com/value-review" }],
        name: "Bissell Little Green portable cleaner",
        recommendation_type: "Best Value",
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

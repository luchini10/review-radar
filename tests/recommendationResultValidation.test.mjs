import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getRecommendationResultIssue } from "../lib/recommendationResultValidation.ts";

function buildRecommendation(overrides = {}) {
  return {
    citations: [{ url: "https://example.com/review" }],
    confidence_score: 92,
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
      new Set(["https://example.com/different-review"]),
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
});

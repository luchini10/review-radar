import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { recommendationResultSchema } from "../lib/recommendationSchema.ts";

function buildValidResult(overrides = {}) {
  return {
    search_summary:
      "UI-only test result for schema validation. This is not real research.",
    assumptions: ["The user wants a product suitable for everyday use."],
    recommendations: [
      {
        recommendation_type: "Best Overall",
        name: "Example Product A",
        category: "Example category",
        product_page_url: "https://example.com/product-a",
        product_image_url: "https://example.com/product-a.jpg",
        why_recommended:
          "This fake fixture exists only to prove the UI contract is strict.",
        pros: ["Clear strengths are present."],
        cons: ["Clear tradeoffs are present."],
        common_complaints: ["Common complaint pattern is present."],
        estimated_price_range: "$100-$150",
        confidence_score: 92,
        source_consensus: "Strong",
        price_value_verdict: "Strong value in this fake fixture.",
        best_for: "People testing the schema.",
        not_for: ["People looking for real product advice."],
        citations: [
          {
            title: "Example Verified Source",
            url: "https://example.com/review",
            what_it_supports: "Supports this fake test recommendation.",
          },
        ],
      },
    ],
    what_to_avoid: ["Avoid treating this fixture as real research."],
    final_buying_advice:
      "This fixture only checks structured output validation.",
    ...overrides,
  };
}

describe("recommendation result schema", () => {
  it("accepts the exact structured JSON shape", () => {
    const result = recommendationResultSchema.safeParse(buildValidResult());

    assert.equal(result.success, true);
  });

  it("rejects bad structured output with missing required fields", () => {
    const badResult = buildValidResult();

    delete badResult.final_buying_advice;

    const result = recommendationResultSchema.safeParse(badResult);

    assert.equal(result.success, false);
  });

  it("rejects broken citation URLs", () => {
    const badResult = buildValidResult({
      recommendations: [
        {
          ...buildValidResult().recommendations[0],
          citations: [
            {
              title: "Broken source",
              url: "not-a-real-url",
              what_it_supports: "Nothing useful.",
            },
          ],
        },
      ],
    });

    const result = recommendationResultSchema.safeParse(badResult);

    assert.equal(result.success, false);
  });

  it("accepts empty product links and images when they cannot be verified", () => {
    const result = recommendationResultSchema.safeParse(
      buildValidResult({
        recommendations: [
          {
            ...buildValidResult().recommendations[0],
            product_page_url: "",
            product_image_url: "",
          },
        ],
      }),
    );

    assert.equal(result.success, true);
  });

  it("rejects invalid product links and images", () => {
    const result = recommendationResultSchema.safeParse(
      buildValidResult({
        recommendations: [
          {
            ...buildValidResult().recommendations[0],
            product_page_url: "not a product url",
            product_image_url: "not an image url",
          },
        ],
      }),
    );

    assert.equal(result.success, false);
  });

  it("rejects extra fields that do not belong to the contract", () => {
    const badResult = buildValidResult({
      affiliate_pitch: "Buy this now.",
    });

    const result = recommendationResultSchema.safeParse(badResult);

    assert.equal(result.success, false);
  });
});

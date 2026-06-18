import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeResearchResult } from "../lib/normalizeResearchResult.ts";

describe("research result normalization", () => {
  it("extracts URLs from markdown-style citation fields", () => {
    const result = normalizeResearchResult({
      recommendations: [
        {
          product_page_url: "[Product](https://example.com/product)",
          product_image_url: "Image: https://example.com/product.jpg",
          citations: [
            {
              url: "[Review](https://example.com/review)",
            },
          ],
        },
      ],
    });

    assert.equal(
      result.recommendations[0].product_page_url,
      "https://example.com/product",
    );
    assert.equal(
      result.recommendations[0].product_image_url,
      "https://example.com/product.jpg",
    );
    assert.equal(
      result.recommendations[0].citations[0].url,
      "https://example.com/review",
    );
  });

  it("keeps unverified or missing URL fields empty", () => {
    const result = normalizeResearchResult({
      recommendations: [
        {
          product_page_url: "not a url",
          product_image_url: null,
          citations: [
            {
              url: "not a url",
            },
          ],
        },
      ],
    });

    assert.equal(result.recommendations[0].product_page_url, "");
    assert.equal(result.recommendations[0].product_image_url, "");
    assert.equal(result.recommendations[0].citations[0].url, "");
  });

  it("does not add legacy recommendation keys to candidate-only results", () => {
    const result = normalizeResearchResult({
      candidate_products: [],
    });

    assert.equal("recommendations" in result, false);
  });

  it("removes budget-compliance bullets from normalized pros and cons", () => {
    const result = normalizeResearchResult({
      candidate_products: [
        {
          citations: [],
          cons: [
            "Under budget at the official retailer.",
            "Some owners mention weak battery life.",
          ],
          product_image_url: "",
          product_page_url: "",
          pros: [
            "Review snippets mention good suction performance.",
            "Official price shown as $899.99, staying within the main budget.",
          ],
        },
      ],
    });

    assert.deepEqual(result.candidate_products[0].pros, [
      "Good suction performance.",
    ]);
    assert.deepEqual(result.candidate_products[0].cons, [
      "Some owners mention weak battery life.",
    ]);
  });
});

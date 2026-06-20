import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { qaWorkerTestExports } from "../scripts/qa-worker.mjs";

const {
  analyzeLiveResult,
  isRetryableLiveFailure,
  liveFailureNote,
  liveFailureRootCause,
  pickRotatedSearches,
} = qaWorkerTestExports;

describe("live QA worker failure handling", () => {
  it("retries temporary localhost, rate-limit, and server failures", () => {
    assert.equal(isRetryableLiveFailure({ status: 0 }), true);
    assert.equal(isRetryableLiveFailure({ status: 408 }), true);
    assert.equal(isRetryableLiveFailure({ status: 429 }), true);
    assert.equal(isRetryableLiveFailure({ status: 502 }), true);
  });

  it("does not retry ordinary request failures", () => {
    assert.equal(isRetryableLiveFailure({ status: 400 }), false);
    assert.equal(isRetryableLiveFailure({ status: 404 }), false);
  });

  it("labels network failures separately from transient research failures", () => {
    assert.equal(
      liveFailureRootCause({ status: 0 }),
      "localhost_or_api_unavailable",
    );
    assert.equal(
      liveFailureRootCause({ status: 502 }),
      "transient_research_api_failure",
    );
    assert.equal(
      liveFailureRootCause({ status: 400 }),
      "live_qa_request_failed",
    );
  });

  it("records retry attempts in the worker note", () => {
    assert.equal(
      liveFailureNote({
        attempts: 2,
        body: { error: "Something went wrong while researching. Try again." },
        status: 502,
      }),
      "Something went wrong while researching. Try again. Retried 2 times.",
    );
  });
});

describe("QA worker search rotation", () => {
  it("uses the next slice of a larger search pool each run", () => {
    const batch = {
      searches: [{ category: "fallback one" }, { category: "fallback two" }],
      searchesPerRun: 2,
      searchPool: [
        { category: "basketball shoes" },
        { category: "running shoes" },
        { category: "walking shoes" },
        { category: "trail shoes" },
      ],
    };

    const first = pickRotatedSearches(batch, {}, "live:broad-mainstream");
    assert.deepEqual(
      first.batch.searches.map((search) => search.category),
      ["basketball shoes", "running shoes"],
    );

    const second = pickRotatedSearches(
      batch,
      first.state,
      "live:broad-mainstream",
    );
    assert.deepEqual(
      second.batch.searches.map((search) => search.category),
      ["walking shoes", "trail shoes"],
    );
  });

  it("wraps around so later runs keep testing different searches", () => {
    const batch = {
      searches: [{ category: "fallback" }],
      searchesPerRun: 2,
      searchPool: [
        { category: "garden hose" },
        { category: "leaf blower" },
        { category: "pressure washer" },
      ],
    };
    const state = {
      "live:requirement-units": {
        nextIndex: 2,
      },
    };

    const rotated = pickRotatedSearches(batch, state, "live:requirement-units");

    assert.deepEqual(
      rotated.batch.searches.map((search) => search.category),
      ["pressure washer", "garden hose"],
    );
    assert.equal(rotated.state["live:requirement-units"].nextIndex, 1);
  });

  it("falls back to the original searches when no larger pool exists", () => {
    const batch = {
      searches: [{ category: "office chair" }, { category: "refrigerator" }],
    };

    const rotated = pickRotatedSearches(batch, {}, "live:wrong-category");

    assert.deepEqual(rotated.batch.searches, batch.searches);
    assert.equal(rotated.batch.rotation.enabled, false);
  });
});

describe("live QA worker shared trust checks", () => {
  it("flags exact matches that use non-product pages", () => {
    const analyzed = analyzeLiveResult(
      {
        budget: "$200",
        category: "basketball shoes",
        priorities: "Nike only",
      },
      {
        result: {
          exactMatches: [
            {
              category: "basketball shoes",
              citations: [
                {
                  title: "Basketball Shoes - Nike",
                  url: "https://www.nike.com/w/mens-basketball-shoes-3glsmznik1zy7ok",
                  what_it_supports: "Nike category page for many shoes.",
                },
              ],
              estimated_price_range: "$120",
              metadata: { offers: [] },
              name: "Basketball Shoes - Nike",
              product_page_url:
                "https://www.nike.com/w/mens-basketball-shoes-3glsmznik1zy7ok",
            },
          ],
          nearMatches: [],
        },
      },
    );

    assert.equal(
      analyzed.suspiciousFlags.some(
        (flag) =>
          flag.failureType === "non_product_page" &&
          flag.rootCause === "non_product_page_leakage" &&
          flag.exactMatchAffected === true,
      ),
      true,
    );
  });

  it("flags exact matches with weak or missing budget price evidence", () => {
    const analyzed = analyzeLiveResult(
      {
        budget: "$300",
        category: "office chair",
        priorities: "white swivel with back support",
      },
      {
        result: {
          exactMatches: [
            {
              category: "office chair",
              citations: [
                {
                  title: "Example chair product page",
                  url: "https://www.example.com/products/example-office-chair-123",
                  what_it_supports: "Specific chair product page.",
                },
              ],
              estimated_price_range: "Under $300",
              metadata: { offers: [] },
              name: "Example White Swivel Office Chair",
              product_page_url:
                "https://www.example.com/products/example-office-chair-123",
            },
          ],
          nearMatches: [],
        },
      },
    );

    assert.equal(
      analyzed.suspiciousFlags.some(
        (flag) =>
          flag.failureType === "untrusted_exact_price" &&
          flag.rootCause === "price_evidence_or_variant_price_gap",
      ),
      true,
    );
  });
});

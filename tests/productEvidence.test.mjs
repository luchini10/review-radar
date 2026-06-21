import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyEvidenceBucketToProduct,
  productEvidenceTestExports,
} from "../lib/productEvidence.ts";

const {
  buildBucketFromSources,
  buildNegativeEvidenceRetryQueries,
  buildProductEvidenceQueries,
  buildRedditOwnerOpinionQueries,
  buildRubricEvidenceQueries,
  buildReviewEvidenceLadderQueries,
  reviewEvidenceIsThin,
} =
  productEvidenceTestExports;

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example Compact Sleeper Sofa",
    category: "Sleeper sofa",
    product_page_url: "https://example.com/product",
    product_image_url: "",
    why_recommended:
      "A compact sleeper sofa with USB ports, cup holders, and a 53.9-inch width.",
    pros: ["Features can add complexity and potential failure points."],
    cons: ["May not be best for everyone."],
    common_complaints: ["Potential durability concerns."],
    estimated_price_range: "$699",
    confidence_score: 78,
    source_consensus: "Mixed",
    price_value_verdict: "Fits the stated budget.",
    best_for: "Small rooms.",
    not_for: ["Large spaces."],
    citations: [
      {
        title: "Official product page",
        url: "https://example.com/product",
        what_it_supports:
          "Confirms gray fabric, USB ports, cup holders, 53.9-inch width, and price.",
      },
    ],
    matchedRequirements: [
      "Budget: $1,000 or less",
      "Width: under 64 inches",
      "Feature: USB ports",
      "Feature: cup holders",
    ],
    ...overrides,
  };
}

function buildRubricProduct(overrides = {}) {
  return buildProduct({
    category: "Refrigerator",
    name: "Example 25 cu ft Stainless French Door Refrigerator",
    buyingRubric: {
      category: "Refrigerator",
      commonTradeoffs: ["More capacity can mean a larger footprint."],
      mustVerifyFacts: [
        "Product page explicitly states stainless steel finish",
        "Exact dimensions and installation fit",
      ],
      qualitySignals: [
        "Fingerprint-resistant stainless steel",
        "Consistent temperature controls",
      ],
      redFlags: [
        "Review complaints about loud operation",
        "Specs conflict across retailer and manufacturer pages",
      ],
      reviewSignals: [
        "Repeated comments on temperature stability",
        "Door seal quality and longevity over time",
      ],
      searchQueries: [],
    },
    ...overrides,
  });
}

describe("product evidence enrichment", () => {
  it("generates review evidence queries for product-specific topics", () => {
    const queries = buildProductEvidenceQueries(buildProduct());
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /example compact sleeper sofa reviews/);
    assert.match(joined, /complaints/);
    assert.match(joined, /customer reviews/);
    assert.match(joined, /mattress comfort/);
    assert.match(joined, /assembly reviews/);
  });

  it("generates a review evidence ladder with owner, expert, video, and negative searches", () => {
    const queries = buildReviewEvidenceLadderQueries(buildProduct());
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /exact product review/);
    assert.match(joined, /customer reviews owner reviews/);
    assert.match(joined, /hands on review tested/);
    assert.match(joined, /reddit forum owners/);
    assert.match(joined, /youtube review long term/);
    assert.match(joined, /complaints problems/);
    assert.match(joined, /broken stopped working warranty issues/);
  });

  it("adds buying-rubric facts and review themes to evidence searches", () => {
    const product = buildRubricProduct();
    const rubricQueries = buildRubricEvidenceQueries(product).join("\n").toLowerCase();
    const ladderQueries = buildReviewEvidenceLadderQueries(product).join("\n").toLowerCase();
    const negativeQueries = buildNegativeEvidenceRetryQueries(product).join("\n").toLowerCase();
    const redditQueries = buildRedditOwnerOpinionQueries(product).join("\n").toLowerCase();

    assert.match(rubricQueries, /stainless steel finish specifications/);
    assert.match(rubricQueries, /fingerprint-resistant stainless steel reviews/);
    assert.match(rubricQueries, /temperature stability owner reviews/);
    assert.match(rubricQueries, /loud operation complaints/);
    assert.match(ladderQueries, /fingerprint-resistant stainless steel reviews/);
    assert.match(negativeQueries, /loud operation complaints/);
    assert.match(redditQueries, /site:reddit\.com/);
    assert.match(redditQueries, /temperature stability/);
  });

  it("generates negative evidence retry queries for thin finalist evidence", () => {
    const queries = buildNegativeEvidenceRetryQueries(buildProduct());
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /complaints problems/);
    assert.match(joined, /broken stopped working/);
    assert.match(joined, /warranty customer service issues/);
    assert.match(joined, /negative reviews/);
  });

  it("generates targeted Reddit owner-opinion searches", () => {
    const queries = buildRedditOwnerOpinionQueries(buildProduct());
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /site:reddit\.com/);
    assert.match(joined, /review owners/);
    assert.match(joined, /problems worth it/);
    assert.match(joined, /long term owner opinion/);
  });

  it("summarizes Reddit owner praise and concerns separately from hard facts", () => {
    const bucket = buildBucketFromSources(buildProduct(), [
      {
        title: "Reddit owner review thread",
        url: "https://www.reddit.com/r/furniture/comments/example_owner_review/",
        snippet:
          "Owners recommend it and say it is worth it, but some mention difficult assembly.",
      },
      {
        title: "Reddit long term owner discussion",
        url: "https://old.reddit.com/r/BuyItForLife/comments/example_long_term/",
        snippet:
          "Long term owners say it held up well, though customer service can be frustrating.",
      },
    ]);

    assert.equal(bucket.ownerOpinion?.sentiment, "mixed");
    assert.equal(bucket.ownerOpinion?.redditThreadCount, 2);
    assert.ok(
      bucket.ownerOpinion?.praises.some((item) => /recommend|reliability/i.test(item)),
    );
    assert.ok(
      bucket.ownerOpinion?.concerns.some((item) => /support|warranty|buying/i.test(item)),
    );
  });

  it("turns rubric-supported source text into product evidence", () => {
    const product = buildRubricProduct();
    const bucket = buildBucketFromSources(product, [
      {
        title: "Expert refrigerator review",
        url: "https://reviews.example.com/fridge",
        snippet:
          "Testing found consistent temperature controls and repeated comments on temperature stability.",
      },
      {
        title: "Owner complaints",
        url: "https://reviews.example.com/noise",
        snippet:
          "Several owners report loud operation during compressor cycles.",
      },
    ]);

    assert.ok(
      bucket.positiveEvidence.some((item) =>
        /temperature|controls/i.test(item.claim),
      ),
    );
    assert.ok(
      bucket.negativeEvidence.some((item) =>
        /loud operation/i.test(item.claim),
      ),
    );
  });

  it("does not turn positive evidence into a negated rubric red flag", () => {
    const product = buildRubricProduct({
      buyingRubric: {
        ...buildRubricProduct().buyingRubric,
        redFlags: ["Finish not explicitly verified as stainless steel"],
      },
    });
    const bucket = buildBucketFromSources(product, [
      {
        title: "Official refrigerator product page",
        url: "https://example.com/refrigerator",
        snippet:
          "This product page explicitly states a fingerprint-resistant stainless steel finish.",
      },
    ]);

    assert.ok(
      bucket.positiveEvidence.some((item) => /stainless steel/i.test(item.claim)),
    );
    assert.equal(bucket.negativeEvidence.length, 0);
  });

  it("treats sparse review coverage or missing downside checks as thin evidence", () => {
    const product = buildProduct();
    const thinBucket = buildBucketFromSources(product, [
      {
        title: "Retailer product page",
        url: "https://example.com/product",
        snippet: "Official product specs.",
      },
    ]);
    const strongerSources = [
      {
        title: "Customer reviews",
        url: "https://reviews.example.com/customers",
        snippet: "Many owners mention difficult assembly.",
      },
      {
        title: "Hands-on review",
        url: "https://reviews.example.com/hands-on",
        snippet: "Tested with notes about assembly and comfort.",
      },
      {
        title: "Forum owner thread",
        url: "https://forum.example.com/owners",
        snippet: "Owners discuss difficult assembly and firm cushions.",
      },
    ];
    const strongerBucket = buildBucketFromSources(product, strongerSources);

    assert.equal(reviewEvidenceIsThin(thinBucket, []), true);
    assert.equal(reviewEvidenceIsThin(strongerBucket, strongerSources), false);
  });

  it("uses confirmed specs as pros and keeps weak review depth in evidence unknowns", () => {
    const product = buildProduct();
    const bucket = buildBucketFromSources(product, []);
    const enriched = applyEvidenceBucketToProduct(product, bucket);

    assert.deepEqual(enriched.common_complaints, []);
    assert.ok(enriched.pros.some((item) => item.includes("Compact 53.9-inch width")));
    assert.ok(enriched.pros.some((item) => item.includes("USB ports")));
    assert.ok(enriched.pros.some((item) => item.includes("cup holders")));
    assert.doesNotMatch(enriched.pros.join("\n"), /matches|required filter|budget/i);
    assert.ok(
      enriched.evidenceBucket.unknowns.some((item) =>
        item.topic.includes("Independent review depth"),
      ),
    );
    assert.doesNotMatch(enriched.cons.join("\n"), /Independent review depth/);
    assert.doesNotMatch(enriched.pros.join("\n"), /Features can add complexity/);
  });

  it("requires repeated evidence before listing common complaints", () => {
    const product = buildProduct();
    const bucket = buildBucketFromSources(product, [
      {
        title: "Customer review summary",
        url: "https://reviews.example.com/one",
        snippet:
          "Many reviewers report firm cushions and difficult assembly for this sleeper sofa.",
      },
      {
        title: "Retailer reviews",
        url: "https://retailer.example.com/reviews",
        snippet:
          "Common complaints include firm mattress feel and hard to assemble parts.",
      },
    ]);
    const enriched = applyEvidenceBucketToProduct(product, bucket);

    assert.ok(
      enriched.common_complaints.some((item) =>
        item.includes("Firm cushions"),
      ),
    );
    assert.ok(
      enriched.common_complaints.some((item) =>
        item.includes("Difficult assembly"),
      ),
    );
  });

  it("allows one USB failure as a con but not a common complaint", () => {
    const product = buildProduct({
      name: "Example Sofa With USB",
      category: "Sleeper sofa with USB",
    });
    const bucket = buildBucketFromSources(product, [
      {
        title: "Single owner review",
        url: "https://reviews.example.com/usb",
        snippet: "One buyer says the USB port stopped working after a month.",
      },
    ]);
    const enriched = applyEvidenceBucketToProduct(product, bucket);

    assert.ok(enriched.cons.some((item) => item.includes("USB")));
    assert.deepEqual(enriched.common_complaints, []);
  });

  it("confirms a gray requirement only from supported product evidence", () => {
    const product = buildProduct({
      matchedRequirements: ["Color: gray"],
    });
    const bucket = buildBucketFromSources(product, [
      {
        title: "Official product page",
        url: "https://example.com/product",
        snippet: "The product page lists this sleeper sofa as available in gray.",
      },
    ]);
    const enriched = applyEvidenceBucketToProduct(product, bucket);

    assert.doesNotMatch(enriched.pros.join("\n"), /Available color: gray/i);
    assert.doesNotMatch(enriched.pros.join("\n"), /matches|required filter/i);
    assert.ok(enriched.evidenceBucket.positiveEvidence[0].sourceUrl);
  });

  it("does not leak sleeper or mattress evidence into appliance results", () => {
    const product = buildProduct({
      name: "GE Profile PB965 stainless steel double oven range",
      category: "Double oven range",
      why_recommended:
        "A double-oven range with air-fry and independent upper and lower ovens.",
      pros: ["Independent review notes air-fry and Wi-Fi features."],
      cons: [
        "Sleeper comfort: Sources mention sleeper functionality but do not clearly verify overnight mattress comfort.",
      ],
      best_for: "Shoppers comparing double oven ranges.",
      price_value_verdict: "A premium appliance with a strong feature set.",
    });
    const bucket = buildBucketFromSources(product, [
      {
        title: "Unrelated sleeper sofa review",
        url: "https://reviews.example.com/sleeper",
        snippet:
          "Sources mention sleeper functionality but do not clearly verify overnight mattress comfort.",
      },
      {
        title: "Another mattress comfort review",
        url: "https://reviews.example.com/mattress",
        snippet: "Common complaints include firm mattress feel and cushions.",
      },
    ]);
    const enriched = applyEvidenceBucketToProduct(product, bucket);
    const combined = [
      ...enriched.pros,
      ...enriched.cons,
      ...enriched.common_complaints,
    ].join("\n");

    assert.doesNotMatch(combined, /sleeper|mattress|cushion/i);
    assert.ok(enriched.pros.some((item) => item.includes("air-fry")));
  });

  it("does not leak vacuum suction evidence into air purifier results", () => {
    const product = buildProduct({
      name: "Example Bedroom Air Purifier",
      category: "Air purifier",
      why_recommended:
        "A bedroom air purifier with HEPA filtration and quiet operation.",
      pros: ["HEPA filtration.", "Quiet operation."],
      cons: [],
      common_complaints: [],
      price_value_verdict: "Fits the stated budget.",
    });
    const bucket = buildBucketFromSources(product, [
      {
        title: "Customer review summary",
        url: "https://reviews.example.com/air-purifier",
        snippet:
          "Owners mention powerful suction and quiet operation in bedrooms.",
      },
    ]);
    const enriched = applyEvidenceBucketToProduct(product, bucket);
    const combined = [
      ...enriched.pros,
      ...enriched.cons,
      ...enriched.common_complaints,
    ].join("\n");

    assert.doesNotMatch(combined, /suction/i);
    assert.ok(enriched.pros.some((item) => /quiet/i.test(item)));
  });
});

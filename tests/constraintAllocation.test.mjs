import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { augmentSearchPlanWithDiscoveryStrategy } from "../lib/discoveryStrategy.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { validateProductAgainstRequirements } from "../lib/requirementValidation.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";

const FLAG = "REVIEW_RADAR_CONSTRAINT_ALLOCATION";

function withFlag(value, callback) {
  const original = process.env[FLAG];

  if (value === undefined) {
    delete process.env[FLAG];
  } else {
    process.env[FLAG] = value;
  }

  try {
    return callback();
  } finally {
    if (original === undefined) {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = original;
    }
  }
}

// The audit benchmark shape (RR-073/RR-074/RR-075): a subtype category, a
// budget, and a standalone Important Detail with no "must/needs" wording.
function benchmarkInput() {
  const input = {
    query: "robot vacuum",
    budget: "under $300",
    priorities: "self-emptying",
  };

  input.extractedRequirements = extractStructuredRequirements(input);
  return input;
}

function emptyStrategy(overrides = {}) {
  return {
    searchIntent: "",
    discoveryQueries: [],
    expectedProducts: [],
    avoidCandidatePatterns: [],
    buyingRubric: null,
    verificationFacts: [],
    ...overrides,
  };
}

function field(value) {
  return {
    confidence: "High",
    sourceType: "json_ld",
    sourceUrl: "https://example.com/p",
    value,
    verifiedAt: "2026-07-11T00:00:00.000Z",
  };
}

function robotVacuumProduct(pros) {
  return {
    recommendation_type: "Best Match",
    name: "Acme R10 Robot Vacuum",
    category: "robot vacuum",
    product_page_url: "https://example.com/acme-r10",
    product_image_url: "https://example.com/acme-r10.jpg",
    why_recommended: "A robot vacuum with verified retailer evidence.",
    pros,
    cons: [],
    common_complaints: [],
    estimated_price_range: "$249",
    confidence_score: 80,
    source_consensus: "Strong",
    price_value_verdict: "Good value.",
    best_for: "Homes.",
    not_for: [],
    citations: [
      {
        title: "Acme R10 Robot Vacuum review",
        url: "https://example.com/review",
        what_it_supports: "Specs and price.",
      },
    ],
    metadata: {
      brand: field("Acme"),
      canonicalUrl: field("https://example.com/acme-r10"),
      image: field("https://example.com/acme-r10.jpg"),
      modelNumber: field("R10"),
      offers: [
        {
          availability: field("InStock"),
          price: field(249),
          priceCurrency: field("USD"),
          retailer: "example.com",
          url: "https://example.com/acme-r10",
        },
      ],
      rating: field(4.6),
      reviewCount: field(1200),
      title: field("Acme R10 Robot Vacuum"),
    },
  };
}

const SHOPPING_FAMILIES = new Set([
  "canonical_shopping",
  "hard_filter",
  "synonym",
]);

function shoppingQueries(plan) {
  return plan.stagedQueries.pass1
    .filter((query) => SHOPPING_FAMILIES.has(query.family))
    .map((query) => query.query);
}

describe("Phase R4 constraint allocation — flag OFF (default unchanged)", () => {
  it("keeps the exact pre-R4 pass-1 plan for the benchmark shape", () => {
    withFlag(undefined, () => {
      const plan = generateSearchPlan(benchmarkInput());

      assert.deepEqual(
        plan.stagedQueries.pass1.map((query) => `${query.family}|${query.query}`),
        [
          "canonical_shopping|robot vacuum under $300",
          "canonical_shopping|vacuum under $300",
          "synonym|cordless vacuum under $300",
          "canonical_shopping|stick vacuum sale under $300",
          "retailer_domain|site:ajmadison.com vacuum under $300",
          "retailer_domain|site:bestbuy.com vacuum under $300",
          "retailer_domain|site:homedepot.com vacuum under $300",
          "canonical_shopping|robot vacuum product page",
        ],
      );
    });
  });

  it("keeps standalone Important Details classified as Needs review", () => {
    withFlag(undefined, () => {
      const requirements = extractStructuredRequirements({
        query: "robot vacuum",
        budget: "under $300",
        priorities: "self-emptying",
      });

      assert.deepEqual(
        requirements.ambiguousConstraints.map((item) => item.value),
        ["self-emptying"],
      );
      assert.deepEqual(requirements.preferredConstraints, []);
      assert.ok(requirements.summary.includes("Needs review: self-emptying"));
    });
  });

  it("keeps the RR-074 duplicate budget wording (documented default)", () => {
    withFlag(undefined, () => {
      const input = benchmarkInput();
      const augmented = augmentSearchPlanWithDiscoveryStrategy(
        generateSearchPlan(input),
        emptyStrategy({
          discoveryQueries: ["robot vacuum self emptying under 300"],
        }),
        input,
      );
      const bound = augmented.stagedQueries.pass1.find((query) =>
        query.query.includes("self emptying"),
      );

      assert.equal(
        bound?.query,
        "robot vacuum self emptying under 300 under $300",
      );
    });
  });

  it("does not add preferred entries to the requirement check", () => {
    withFlag(undefined, () => {
      const input = benchmarkInput();
      const validation = validateProductAgainstRequirements(
        robotVacuumProduct(["Strong suction.", "LiDAR navigation."]),
        input,
      );

      assert.ok(
        !validation.softUnknownRequirements.some((label) =>
          label.startsWith("Preferred:"),
        ),
      );
      assert.ok(
        !validation.matchedRequirements.some((label) =>
          label.startsWith("Preferred:"),
        ),
      );
    });
  });
});

describe("Phase R4 constraint allocation — flag ON", () => {
  it("RR-073: reclassifies standalone Important Details as explicit preferred strength", () => {
    withFlag("on", () => {
      const requirements = extractStructuredRequirements({
        query: "robot vacuum",
        budget: "under $300",
        priorities: "self-emptying",
      });

      assert.deepEqual(
        requirements.preferredConstraints.map((item) => item.value),
        ["self-emptying"],
      );
      assert.equal(requirements.preferredConstraints[0]?.strictness, "soft");
      assert.deepEqual(requirements.ambiguousConstraints, []);
      assert.ok(requirements.summary.includes("Preferred: self-emptying"));
      assert.ok(
        !requirements.summary.some((line) => line.startsWith("Needs review:")),
      );
    });
  });

  it("RR-073/RR-075: at least 3 of the first 5 Shopping queries carry the constraint", () => {
    withFlag("on", () => {
      const plan = generateSearchPlan(benchmarkInput());
      const firstFive = shoppingQueries(plan).slice(0, 5);
      const bearing = firstFive.filter((query) =>
        query.includes("self-emptying"),
      );

      assert.ok(
        bearing.length >= 3,
        `expected >=3 constraint-bearing of ${JSON.stringify(firstFive)}`,
      );
    });
  });

  it("RR-075: parent-category synonyms no longer dilute a subtype category", () => {
    withFlag("on", () => {
      const plan = generateSearchPlan(benchmarkInput());

      for (const query of plan.queries) {
        if (/vacuum/i.test(query.query)) {
          assert.ok(
            /robot vacuum/i.test(query.query),
            `diluted query survived: ${query.query}`,
          );
        }
      }
    });
  });

  it("RR-075: exact-key synonym groups keep their breadth", () => {
    withFlag("on", () => {
      const plan = generateSearchPlan({
        query: "stick vacuum",
        budget: "under $200",
        priorities: "",
      });
      const text = plan.queries.map((query) => query.query).join(" | ");

      assert.ok(/cordless stick vacuum|cordless vacuum|lightweight vacuum/i.test(text));
    });
  });

  it("RR-075: leaves categories outside every synonym group unchanged", () => {
    const input = {
      query: "air purifier",
      budget: "under $200",
      priorities: "",
    };
    const flagOff = withFlag(undefined, () => {
      input.extractedRequirements = extractStructuredRequirements(input);
      return generateSearchPlan(input).stagedQueries.pass1;
    });
    const flagOn = withFlag("on", () => {
      input.extractedRequirements = extractStructuredRequirements(input);
      return generateSearchPlan(input).stagedQueries.pass1;
    });

    assert.deepEqual(flagOn, flagOff);
  });

  it("RR-073: a category-colliding preference cannot mask another preference", () => {
    withFlag("on", () => {
      const input = {
        query: "robot vacuum",
        budget: "under $300",
        priorities: "robot vacuum; self-emptying",
      };
      input.extractedRequirements = extractStructuredRequirements(input);
      const plan = generateSearchPlan(input);
      const firstFive = shoppingQueries(plan).slice(0, 5);

      assert.ok(
        firstFive.filter((query) => query.includes("self-emptying")).length >= 3,
        JSON.stringify(firstFive),
      );
      assert.ok(
        plan.queries.every((query) => !/robot vacuum robot vacuum/i.test(query.query)),
      );
    });
  });

  it("RR-074: budget binding normalizes an unbounded dollar amount instead of duplicating it", () => {
    withFlag("on", () => {
      const input = benchmarkInput();
      // "best ..." keeps the AI query distinct from the deterministic plan's
      // own constraint-bearing query, which the normalized form now matches
      // (an equivalent query correctly merges instead of running twice).
      const augmented = augmentSearchPlanWithDiscoveryStrategy(
        generateSearchPlan(input),
        emptyStrategy({
          discoveryQueries: ["best robot vacuum self emptying under 300"],
        }),
        input,
      );
      const bound = augmented.stagedQueries.pass1.find((query) =>
        query.query.includes("best robot vacuum self emptying"),
      );

      assert.equal(bound?.query, "best robot vacuum self emptying under $300");
    });
  });

  it("RR-074: an already-bounded query stays unchanged", () => {
    withFlag("on", () => {
      const input = benchmarkInput();
      const augmented = augmentSearchPlanWithDiscoveryStrategy(
        generateSearchPlan(input),
        emptyStrategy({
          discoveryQueries: ["best self emptying robot vacuum under $300"],
        }),
        input,
      );
      const bound = augmented.stagedQueries.pass1.find((query) =>
        query.query.includes("best self emptying"),
      );

      assert.equal(bound?.query, "best self emptying robot vacuum under $300");
    });
  });

  it("RR-074: normalizes equivalent words and comma-formatted bounds", () => {
    const cases = [
      ["under $300", "best robot vacuum less than 300", "under $300"],
      ["under $300", "top robot vacuum max 300", "under $300"],
      ["under $1,300", "best robot vacuum under 1,300", "under $1300"],
    ];

    withFlag("on", () => {
      for (const [budget, query, expectedBound] of cases) {
        const input = {
          query: "robot vacuum",
          budget,
          priorities: "self-emptying",
        };
        input.extractedRequirements = extractStructuredRequirements(input);
        const augmented = augmentSearchPlanWithDiscoveryStrategy(
          generateSearchPlan(input),
          emptyStrategy({ discoveryQueries: [query] }),
          input,
        );
        const normalized = augmented.stagedQueries.pass1.find((candidate) =>
          candidate.query.startsWith(query.split(/\b(?:less|max|under)\b/i)[0].trim()),
        );

        assert.ok(normalized, query);
        assert.ok(normalized.query.endsWith(expectedBound), normalized.query);
        assert.equal((normalized.query.match(/\bunder\b/gi) || []).length, 1);
      }
    });
  });

  it("RR-073/RR-075: hard and preferred constraints coexist in leading queries", () => {
    withFlag("on", () => {
      const input = {
        query: "robot vacuum",
        budget: "under $300",
        priorities: "must have LiDAR; self-emptying",
      };
      input.extractedRequirements = extractStructuredRequirements(input);
      const [required] = input.extractedRequirements.requiredConstraints;
      const [preferred] = input.extractedRequirements.preferredConstraints;
      const plan = generateSearchPlan(input);

      assert.equal(required?.strictness, "hard");
      assert.equal(preferred?.strictness, "soft");
      assert.match(plan.stagedQueries.pass1[0]?.query || "", /lidar/i);
      assert.match(plan.stagedQueries.pass1[0]?.query || "", /self-emptying/i);
    });
  });

  it("RR-073: an unverified preferred detail lowers confidence without gating", () => {
    withFlag("on", () => {
      const input = benchmarkInput();
      const validation = validateProductAgainstRequirements(
        robotVacuumProduct(["Strong suction.", "LiDAR navigation."]),
        input,
      );

      assert.ok(
        validation.softUnknownRequirements.includes("Preferred: self-emptying"),
      );
      assert.ok(
        !validation.missingRequirements.some((label) =>
          label.includes("self-emptying"),
        ),
      );
      assert.ok(
        !validation.unknownRequirements.some((label) =>
          label.includes("self-emptying"),
        ),
      );
    });
  });

  it("RR-073: a verified preferred detail is recorded as matched", () => {
    withFlag("on", () => {
      const input = benchmarkInput();
      const validation = validateProductAgainstRequirements(
        robotVacuumProduct([
          "Self-emptying dock included.",
          "Strong suction.",
        ]),
        input,
      );

      assert.ok(
        validation.matchedRequirements.includes("Preferred: self-emptying"),
      );
      assert.ok(
        !validation.softUnknownRequirements.includes("Preferred: self-emptying"),
      );
    });
  });
});

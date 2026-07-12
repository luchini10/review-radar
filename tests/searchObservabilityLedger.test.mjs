import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  augmentSearchPlanWithDiscoveryStrategy,
  buildOpenAIDiscoveryGapCheck,
  buildOpenAIDiscoveryStrategy,
} from "../lib/discoveryStrategy.ts";
import {
  buildSearchObservabilitySnapshot,
  createSearchObservabilityLedger,
  finalizeCandidateLineage,
  reviewRadarFlagSnapshot,
  runWithSearchObservabilityLedger,
  searchPlanObservabilityObserver,
} from "../lib/searchObservabilityLedger.ts";
import { generateSearchPlan } from "../lib/searchQueryExpansion.ts";
import {
  dedupeRawCandidates,
  sanitizeSerperQuery,
  searchSerperForProducts,
  searchSerperImageEvidence,
  searchSerperOrganicEvidence,
  searchSerperShopping,
  searchSerperShoppingWithDiagnostics,
  serperCandidateToRecommendation,
} from "../lib/search/serper.ts";

describe("R6 outbound Serper query hygiene", () => {
  it("removes wildcard site domains and repeated generated phrases", () => {
    assert.equal(
      sanitizeSerperQuery('site:*.com robot vacuum robot vacuum "self empty"'),
      'robot vacuum "self empty"',
    );
    assert.equal(sanitizeSerperQuery("eufy eufy RoboVac C10"), "eufy RoboVac C10");
  });

  it("preserves valid site operators, quoted phrases, and repeated model words", () => {
    assert.equal(
      sanitizeSerperQuery('site:bestbuy.com "very very quiet" Bora Bora fan'),
      'site:bestbuy.com "very very quiet" Bora Bora fan',
    );
    assert.equal(
      sanitizeSerperQuery("New York New York air purifier"),
      "New York New York air purifier",
    );
    assert.equal(sanitizeSerperQuery("very very quiet fan"), "very very quiet fan");
  });

  it("uses the sanitized query in the exact Serper body and cache key", async () => {
    const bodies = [];
    await withMockedSerper(async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return response({ shopping: [] });
    }, async () => {
      await searchSerperShopping("site:*.com robot vacuum robot vacuum", "robot vacuum");
      await searchSerperShopping("robot vacuum", "robot vacuum");
    });

    assert.equal(bodies.length, 1);
    assert.deepEqual(bodies[0], { gl: "us", hl: "en", num: 10, q: "robot vacuum" });
  });
});

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function ledger(overrides = {}) {
  return createSearchObservabilityLedger({
    requestId: "request-observability-test",
    commitHash: "abcdef123456",
    flags: {
      REVIEW_RADAR_SPEC_SEARCH: "off",
    },
    helperModel: "helper-test-model",
    finalModel: "final-test-model",
    serperCacheEmptyAtStart: true,
    ...overrides,
  });
}

async function withMockedSerper(fetchImplementation, callback) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.SERPER_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDepth = process.env.SEARCH_DEPTH;
  const canaryKey = "CANARY_SERPER_KEY_MUST_NOT_APPEAR";

  clearCacheForTests();
  globalThis.fetch = fetchImplementation;
  process.env.SERPER_API_KEY = canaryKey;
  process.env.NODE_ENV = "test";

  try {
    return await callback(canaryKey);
  } finally {
    clearCacheForTests();
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = originalKey;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDepth === undefined) delete process.env.SEARCH_DEPTH;
    else process.env.SEARCH_DEPTH = originalDepth;
  }
}

function finalizationInput(products, overrides = {}) {
  return {
    candidatePool: products,
    citationValid: products,
    requirementExact: products,
    requirementNear: [],
    revalidatedExact: products,
    revalidatedNear: [],
    finalExact: products,
    finalNear: [],
    finalSelectionTrace: [],
    ...overrides,
  };
}

function recommendation(name, requirementCheck) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "robot vacuum",
    product_page_url: `https://shop.example.com/products/${name.toLowerCase().replace(/\s+/g, "-")}`,
    product_image_url: "",
    why_recommended: "Representative candidate",
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "$249",
    confidence_score: 80,
    source_consensus: "Mixed",
    price_value_verdict: "Representative value",
    best_for: "Testing",
    not_for: [],
    citations: [],
    requirementCheck,
  };
}

const rawStrategy = {
  avoidCandidatePatterns: ["accessory only"],
  buyingRubric: {
    category: "robot vacuum",
    commonTradeoffs: ["navigation versus price"],
    mustVerifyFacts: ["self-empty dock included"],
    qualitySignals: ["reliable dock emptying"],
    redFlags: ["dock sold separately"],
    reviewSignals: ["owner dock reliability"],
    searchQueries: ["self emptying robot vacuum reviews"],
  },
  discoveryQueries: ["robot vacuum self emptying under $300"],
  expectedProducts: [
    {
      aliases: ["Example RV1+"],
      brand: "Example",
      priority: "high",
      productLine: "RV1 Plus",
      whyExpected: "Mainstream value model",
    },
  ],
  searchIntent: "Budget self-emptying robot vacuum",
  verificationFacts: ["price", "included dock"],
};

const rawGapCheck = {
  followUpQueries: ["Example RV1+ robot vacuum under $300"],
  missingExpectedProducts: ["Example RV1 Plus"],
  notes: ["Expected model missing"],
  suspiciousCandidateNames: [],
};

describe("request-scoped search observability ledger", () => {
  it("records retries and vertical fallback as physical attempts on one logical query", async () => {
    let callCount = 0;

    await withMockedSerper(async () => {
      callCount += 1;
      if (callCount <= 2) return response({ error: "temporary" }, 503);

      return response({
        organic: [
          {
            position: 1,
            title: "Example RV1 Plus Robot Vacuum",
            link: "https://shop.example.com/products/rv1-plus",
            snippet: "Self-emptying robot vacuum product page.",
          },
        ],
      });
    }, async (canaryKey) => {
      const state = ledger();
      const snapshot = await runWithSearchObservabilityLedger(state, async () => {
        const result = await searchSerperShoppingWithDiagnostics(
          "example rv1 plus",
          "robot vacuum",
          {},
          {
            origin: "ai_gap_check",
            phase: "follow_up_discovery",
            purpose: "product_discovery",
            originalQuery: "example rv1 plus",
          },
        );
        assert.equal(result.candidates.length, 1);
        return buildSearchObservabilitySnapshot();
      });

      assert.equal(callCount, 3);
      assert.equal(snapshot.dispatch.attempts.length, 3);
      assert.deepEqual(
        snapshot.dispatch.attempts.map((attempt) => attempt.retryStatus),
        ["initial", "retry", "initial"],
      );
      assert.deepEqual(
        snapshot.dispatch.attempts.map(
          (attempt) => attempt.verticalFallbackStatus,
        ),
        ["none", "none", "fallback_initial"],
      );
      assert.ok(
        snapshot.dispatch.attempts.every(
          (attempt) =>
            attempt.origin === "ai_gap_check" &&
            attempt.phase === "follow_up_discovery",
        ),
      );
      assert.deepEqual(snapshot.dispatch.reconciliation, {
        logicalSearches: 1,
        cacheHits: 0,
        cacheMisses: 1,
        physicalAttempts: 3,
        retries: 1,
        fallbacks: 1,
        balanced: true,
      });
      assert.equal(JSON.stringify(snapshot).includes(canaryKey), false);
      assert.equal(
        Object.hasOwn(snapshot.dispatch.attempts[0], "headers"),
        false,
      );
    });
  });

  it("records a cache hit without another physical attempt and unions provenance", async () => {
    let callCount = 0;
    const shopping = Array.from({ length: 12 }, (_, index) => ({
      position: index + 1,
      title: `Example Robot Vacuum Model RV${index + 1}`,
      link: `https://shop.example.com/products/rv-${index + 1}`,
      source: "Example Store",
      price: `$${199 + index}`,
      snippet: "Robot vacuum product listing.",
    }));

    await withMockedSerper(async () => {
      callCount += 1;
      return response({ shopping });
    }, async () => {
      const state = ledger();
      const snapshot = await runWithSearchObservabilityLedger(state, async () => {
        const first = await searchSerperShopping(
          "example robot vacuum",
          "robot vacuum",
          {
            origin: "deterministic_plan",
            phase: "initial_discovery",
            purpose: "product_discovery",
            originalQuery: "example robot vacuum",
          },
        );
        const second = await searchSerperShopping(
          "example robot vacuum",
          "robot vacuum",
          {
            origin: "market_rescue",
            phase: "follow_up_discovery",
            purpose: "product_discovery",
            originalQuery: "example robot vacuum",
          },
        );
        assert.equal(first.length, 12);
        assert.equal(second.length, 12);
        const recommendations = first.map(serperCandidateToRecommendation);
        finalizeCandidateLineage(finalizationInput(recommendations));
        return buildSearchObservabilitySnapshot();
      });

      assert.equal(callCount, 1);
      assert.deepEqual(
        snapshot.dispatch.cacheLookups.map((lookup) => lookup.outcome),
        ["miss", "hit"],
      );
      assert.equal(snapshot.dispatch.attempts.length, 1);
      assert.equal(snapshot.dispatch.attempts[0].results.length, 10);
      assert.equal(snapshot.dispatch.reconciliation.balanced, true);
      const serperCandidates = snapshot.candidateLineage.candidates.filter(
        (candidate) => candidate.source === "serper",
      );
      assert.equal(serperCandidates.length, 12);
      assert.ok(serperCandidates.every((candidate) => candidate.queryIds.length === 2));
      assert.ok(serperCandidates.every((candidate) => candidate.finalOutcome === "exact"));
    });
  });

  it("records distinct candidate IDs and provenance union when raw candidates merge", async () => {
    let callCount = 0;
    const titles = [
      "Example RV200 Robot Vacuum",
      "Example RV200 Robot Vacuum with Dock",
    ];

    await withMockedSerper(async () => {
      const title = titles[callCount];
      callCount += 1;
      return response({
        shopping: [
          {
            title,
            link: "https://shop.example.com/products/rv200",
            source: "Example Store",
            price: "$249",
            snippet: "Example RV200 product listing.",
          },
        ],
      });
    }, async () => {
      const state = ledger();
      const snapshot = await runWithSearchObservabilityLedger(state, async () => {
        const first = await searchSerperShopping("RV200", "robot vacuum", {
          origin: "deterministic_plan",
          phase: "initial_discovery",
          purpose: "product_discovery",
          originalQuery: "RV200",
        });
        const second = await searchSerperShopping("RV200 dock", "robot vacuum", {
          origin: "ai_discovery_strategy",
          phase: "initial_discovery",
          purpose: "product_discovery",
          originalQuery: "RV200 dock",
        });
        const merged = dedupeRawCandidates([...first, ...second]);
        assert.equal(merged.candidates.length, 1);
        const recommendations = merged.candidates.map(serperCandidateToRecommendation);
        finalizeCandidateLineage(finalizationInput(recommendations));
        return buildSearchObservabilitySnapshot();
      });

      const mergedAway = snapshot.candidateLineage.candidates.find(
        (candidate) => candidate.mergedIntoCandidateId,
      );
      assert.ok(mergedAway);
      assert.equal(mergedAway.firstLoss.stage, "raw_dedupe");
      const survivor = snapshot.candidateLineage.candidates.find(
        (candidate) => candidate.candidateId === mergedAway.mergedIntoCandidateId,
      );
      assert.deepEqual(survivor.queryIds.length, 2);
    });
  });

  it("assigns one precise first loss to normalization and citation discards", async () => {
    await withMockedSerper(async () =>
      response({
        shopping: [
          {
            title: "Example RV300 Robot Vacuum",
            link: "https://shop.example.com/products/rv300",
            source: "Example Store",
            price: "$279",
            snippet: "Specific robot vacuum product.",
          },
          {
            title: "Best Robot Vacuums Buying Guide",
            link: "https://editorial.example.com/articles/best-robot-vacuums",
            snippet: "A roundup article.",
          },
        ],
      }), async () => {
      const state = ledger();
      const snapshot = await runWithSearchObservabilityLedger(state, async () => {
        const result = await searchSerperShoppingWithDiagnostics(
          "robot vacuum",
          "robot vacuum",
          {},
          {
            origin: "deterministic_plan",
            phase: "initial_discovery",
            purpose: "product_discovery",
            originalQuery: "robot vacuum",
          },
        );
        assert.equal(result.candidates.length, 1);
        const recommendations = result.candidates.map(serperCandidateToRecommendation);
        finalizeCandidateLineage(
          finalizationInput(recommendations, {
            citationValid: [],
            requirementExact: [],
            revalidatedExact: [],
            finalExact: [],
          }),
        );
        return buildSearchObservabilitySnapshot();
      });

      const losses = snapshot.candidateLineage.candidates.map(
        (candidate) => candidate.firstLoss,
      );
      assert.ok(
        losses.some(
          (loss) =>
            loss?.stage === "lost_in_normalization" &&
            loss.subreason === "evidence_or_support_path",
        ),
      );
      assert.ok(
        losses.some(
          (loss) =>
            loss?.stage === "citation_verification" &&
            loss.subreason === "no_verified_citation",
        ),
      );
      assert.equal(snapshot.candidateLineage.discardedCandidateCount, 2);
      assert.equal(
        snapshot.candidateLineage.discardedWithExactlyOneFirstLoss,
        2,
      );
      assert.equal(snapshot.candidateLineage.unknownFirstLossCount, 0);
    });
  });

  it("records requirement, revalidation, and final-selection lineage including identity collapse", () => {
    const requirementFailed = recommendation("Requirement Failed", {
      exactMatch: false,
      passed: ["budget"],
      failed: ["self-empty dock included"],
      unknown: [],
    });
    const revalidationFailed = recommendation("Revalidation Failed", {
      exactMatch: false,
      passed: ["budget"],
      failed: [],
      unknown: ["self-empty dock included"],
    });
    const identityCollapsed = recommendation("Identity Collapsed", {
      exactMatch: true,
      passed: ["budget", "self-empty dock included"],
      failed: [],
      unknown: [],
    });
    const finalNear = recommendation("Final Near", {
      exactMatch: false,
      passed: ["budget"],
      failed: [],
      unknown: ["dock reliability"],
    });
    const products = [
      requirementFailed,
      revalidationFailed,
      identityCollapsed,
      finalNear,
    ];
    const state = ledger({ requestId: "candidate-stage-lineage-test" });
    const snapshot = runWithSearchObservabilityLedger(state, () => {
      finalizeCandidateLineage({
        candidatePool: products,
        citationValid: products,
        requirementExact: [identityCollapsed],
        requirementNear: [revalidationFailed, finalNear],
        revalidatedExact: [identityCollapsed],
        revalidatedNear: [finalNear],
        finalExact: [],
        finalNear: [finalNear],
        finalSelectionTrace: [
          {
            name: identityCollapsed.name,
            productUrl: identityCollapsed.product_page_url,
            selected: false,
            totalScore: 77,
            decisionReason: "duplicate_identity_collapsed",
            collapsedBy: "Surviving Exact Model",
          },
          {
            name: finalNear.name,
            productUrl: finalNear.product_page_url,
            selected: true,
            totalScore: 68,
            decisionReason: "selected",
            collapsedBy: null,
          },
        ],
      });
      return buildSearchObservabilitySnapshot();
    });

    const byName = Object.fromEntries(
      snapshot.candidateLineage.candidates.map((candidate) => [
        candidate.name,
        candidate,
      ]),
    );
    assert.deepEqual(byName["Requirement Failed"].firstLoss, {
      stage: "requirement_validation",
      subreason: "self-empty dock included",
    });
    assert.deepEqual(byName["Revalidation Failed"].firstLoss, {
      stage: "revalidation",
      subreason: "self-empty dock included",
    });
    assert.deepEqual(byName["Identity Collapsed"].firstLoss, {
      stage: "final_selection",
      subreason: "duplicate_identity_collapsed",
    });
    assert.equal(
      byName["Identity Collapsed"].identityCollapsedInto,
      "Surviving Exact Model",
    );
    assert.equal(byName["Identity Collapsed"].finalScore, 77);
    assert.equal(byName["Final Near"].finalOutcome, "near");
    assert.equal(byName["Final Near"].selected, true);
    assert.equal(snapshot.candidateLineage.discardedCandidateCount, 3);
    assert.equal(
      snapshot.candidateLineage.discardedWithExactlyOneFirstLoss,
      3,
    );
    assert.equal(snapshot.candidateLineage.unknownFirstLossCount, 0);
  });

  it("records plan dedupe, pass/protected truncation, Shopping crowd-out, and organic recategorization", async () => {
    const request = {
      query: "robot vacuum",
      budget: "under $300",
      priorities: "self-emptying",
    };
    const strategy = {
      ...rawStrategy,
      discoveryQueries: [
        "robot vacuum under $300",
        ...Array.from(
          { length: 11 },
          (_, index) => `self emptying robot vacuum option ${index + 1}`,
        ),
      ],
      expectedProducts: Array.from({ length: 8 }, (_, index) => ({
        aliases: [`RV${index + 1}+`],
        brand: `Brand${index + 1}`,
        priority: "high",
        productLine: `RV${index + 1} Plus`,
        whyExpected: "Expected mainstream model",
      })),
    };
    const normalPlanJson = JSON.stringify(generateSearchPlan(request));
    const state = ledger();
    const assemblySnapshot = await runWithSearchObservabilityLedger(
      state,
      async () => {
        const plan = generateSearchPlan(request, searchPlanObservabilityObserver);
        assert.equal(JSON.stringify(plan), normalPlanJson);
        augmentSearchPlanWithDiscoveryStrategy(
          plan,
          strategy,
          request,
          searchPlanObservabilityObserver,
        );
        return buildSearchObservabilitySnapshot();
      },
    );

    assert.ok(
      assemblySnapshot.planAssembly.some(
        (query) => query.cullReason === "deduplicated",
      ),
    );
    assert.ok(
      assemblySnapshot.planAssembly.some(
        (query) => query.cullReason === "protected_slot_allocation",
      ),
    );
    assert.ok(
      assemblySnapshot.planAssembly.some(
        (query) => query.cullReason === "pass_stage_truncation",
      ),
    );
    await withMockedSerper(async () => response({ organic: [], shopping: [] }), async () => {
      process.env.SEARCH_DEPTH = "dev";
      const followUpLedger = ledger({ requestId: "follow-up-cull-test" });
      const snapshot = await runWithSearchObservabilityLedger(
        followUpLedger,
        async () => {
          await searchSerperForProducts(
            Array.from({ length: 8 }, (_, index) => `follow up model ${index + 1}`),
            { query: "robot vacuum", budget: "under $300" },
          );
          return buildSearchObservabilitySnapshot();
        },
      );

      assert.ok(
        snapshot.planAssembly.some(
          (query) => query.cullReason === "shopping_cap_crowd_out",
        ),
      );
      assert.ok(
        snapshot.planAssembly.some((query) =>
          query.events.some(
            (event) =>
              event.action === "recategorized" &&
              event.detail.includes("organic fallback"),
          ),
        ),
      );
      assert.equal(snapshot.dispatch.reconciliation.balanced, true);
    });
  });

  it("retains strict-schema raw AI strategy and gap-check JSON without prompts", async () => {
    const client = {
      responses: {
        create: async (input) => ({
          output_text: JSON.stringify(
            input.text.format.name === "review_radar_discovery_strategy"
              ? rawStrategy
              : rawGapCheck,
          ),
        }),
      },
    };
    const request = { query: "robot vacuum", budget: "under $300" };
    const state = ledger({ requestId: "raw-ai-json-test" });
    const snapshot = await runWithSearchObservabilityLedger(state, async () => {
      const strategyResult = await buildOpenAIDiscoveryStrategy({
        client,
        input: request,
        model: "helper-test-model",
        observer: searchPlanObservabilityObserver,
      });
      await buildOpenAIDiscoveryGapCheck({
        candidates: [],
        client,
        input: request,
        model: "helper-test-model",
        observer: searchPlanObservabilityObserver,
        strategy: strategyResult,
      });
      return buildSearchObservabilitySnapshot();
    });

    assert.deepEqual(snapshot.rawAi.strategy, rawStrategy);
    assert.deepEqual(snapshot.rawAi.gapCheck, rawGapCheck);
    assert.equal("prompt" in snapshot.rawAi, false);
  });

  it("includes evidence, image, requirement, rubric, and source-upgrade searches without zero-contribution labels", async () => {
    await withMockedSerper(async () => response({}), async () => {
      const state = ledger({ requestId: "post-discovery-origin-test" });
      const snapshot = await runWithSearchObservabilityLedger(state, async () => {
        await searchSerperOrganicEvidence("Example RV review", 6, {
          origin: "review_evidence",
          phase: "review_evidence_enrichment",
          purpose: "evidence",
          originalQuery: "Example RV review",
        });
        await searchSerperImageEvidence("Example RV product image", 3, {
          origin: "image",
          phase: "product_asset_enrichment",
          purpose: "image",
          originalQuery: "Example RV product image",
        });
        await searchSerperShopping("Example RV price", "robot vacuum", {
          origin: "requirement_fact_rescue",
          phase: "missing_requirement_evidence_rescue",
          purpose: "requirement_rescue",
          originalQuery: "Example RV price",
        });
        await searchSerperShopping("Example RV dock", "robot vacuum", {
          origin: "rubric_fact_rescue",
          phase: "missing_requirement_evidence_rescue",
          purpose: "requirement_rescue",
          originalQuery: "Example RV dock",
        });
        await searchSerperShoppingWithDiagnostics(
          "Example RV1+",
          "robot vacuum",
          { allowGoogleShoppingOfferEvidence: true },
          {
            origin: "source_quality_upgrade",
            phase: "source_quality_upgrade",
            purpose: "source_upgrade",
            originalQuery: "Example RV1+",
          },
        );
        return buildSearchObservabilitySnapshot();
      });

      const origins = new Set(
        snapshot.planAssembly.map((query) => query.origin),
      );
      assert.ok(origins.has("review_evidence"));
      assert.ok(origins.has("image"));
      assert.ok(origins.has("requirement_fact_rescue"));
      assert.ok(origins.has("rubric_fact_rescue"));
      assert.ok(origins.has("source_quality_upgrade"));
      assert.ok(
        snapshot.contributions.byQuery
          .filter((entry) => entry.purpose !== "product_discovery")
          .every((entry) => entry.zeroContribution === null),
      );
      assert.equal(snapshot.dispatch.reconciliation.balanced, true);
    });
  });

  it("does not build a ledger when the debug context is absent", () => {
    const request = { query: "microwave", budget: "under $200" };
    const outside = JSON.stringify(generateSearchPlan(request));
    const insideDisabled = runWithSearchObservabilityLedger(null, () => ({
      plan: JSON.stringify(generateSearchPlan(request)),
      snapshot: buildSearchObservabilitySnapshot(),
    }));

    assert.equal(insideDisabled.plan, outside);
    assert.equal(insideDisabled.snapshot, undefined);
  });

  it("records the ledger header without secrets or prompt bodies", () => {
    const state = ledger({
      commitHash: "commit-header-test",
      flags: { REVIEW_RADAR_SPEC_VALIDATION: "shadow" },
      serperCacheEmptyAtStart: false,
    });
    const snapshot = runWithSearchObservabilityLedger(state, () =>
      buildSearchObservabilitySnapshot(),
    );

    assert.equal(snapshot.header.commitHash, "commit-header-test");
    assert.equal(snapshot.header.helperModel, "helper-test-model");
    assert.equal(snapshot.header.finalModel, "final-test-model");
    assert.equal(snapshot.header.serperCacheEmptyAtStart, false);
    assert.deepEqual(snapshot.header.flags, {
      REVIEW_RADAR_SPEC_VALIDATION: "shadow",
    });
    assert.equal("prompt" in snapshot, false);
  });

  it("includes the pinned-planning flag in the environment snapshot", () => {
    const previous = process.env.REVIEW_RADAR_PINNED_PLANNING;

    try {
      process.env.REVIEW_RADAR_PINNED_PLANNING = "on";
      assert.equal(
        reviewRadarFlagSnapshot().REVIEW_RADAR_PINNED_PLANNING,
        "on",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_PINNED_PLANNING;
      } else {
        process.env.REVIEW_RADAR_PINNED_PLANNING = previous;
      }
    }
  });

  it("includes the constraint-allocation flag in the environment snapshot", () => {
    const previous = process.env.REVIEW_RADAR_CONSTRAINT_ALLOCATION;

    try {
      process.env.REVIEW_RADAR_CONSTRAINT_ALLOCATION = "on";
      assert.equal(
        reviewRadarFlagSnapshot().REVIEW_RADAR_CONSTRAINT_ALLOCATION,
        "on",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_CONSTRAINT_ALLOCATION;
      } else {
        process.env.REVIEW_RADAR_CONSTRAINT_ALLOCATION = previous;
      }
    }
  });
});

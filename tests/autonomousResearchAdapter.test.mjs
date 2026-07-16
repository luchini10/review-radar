import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTONOMOUS_PROMPT_VERSION,
  AUTONOMOUS_MARKET_REQUIREMENT_ID,
  AUTONOMOUS_SLATE_SCHEMA_VERSION,
  buildNormalizedShopperRequest,
} from "../lib/autonomousResearchContract.ts";
import {
  buildAutonomousResearchRequest,
  buildRequirementInterpreterRequest,
  estimateAutonomousResearchCost,
  OAI_2A_PROPOSED_CONFIG,
  runAutonomousResearch,
  runRequirementInterpreter,
  sanitizeAutonomousResponseForEvidence,
  summarizeAutonomousResearchResult,
  validateAutonomousSlateContract,
  validateAutonomousSlateForRequest,
} from "../lib/autonomousResearchAdapter.ts";

const config = {
  model: "configured-web-search-model",
  reasoning: "high",
  maxOutputTokens: 12_000,
  maxToolCalls: 20,
  requestTimeoutMs: 120_000,
  overallTimeoutMs: 600_000,
  pollIntervalMs: 500,
  maxPolls: 4,
};

function card(overrides = {}) {
  return {
    rank: 1,
    recommendation_status: "Best Match",
    identity: {
      brand: "Example",
      product_name: "Example Model One",
      model: "M1",
      source_ids: ["s1"],
    },
    purchase_offer: {
      verification_status: "Claimed current",
      price_amount: 199,
      currency: "USD",
      price_text: "$199",
      seller: "Example Store",
      product_url: "https://example.com/products/m1",
      source_ids: ["s1"],
    },
    image: { url: null, source_ids: [] },
    assessment: {
      why: "Fits the stated requirements.",
      best_for: "The stated use case.",
      main_tradeoff: "Limited independent testing.",
      source_ids: ["s1"],
    },
    specifications: [{ name: "Weight", value: "5 lb", source_ids: ["s1"] }],
    requirement_checks: [
      {
        requirement_id: AUTONOMOUS_MARKET_REQUIREMENT_ID,
        status: "Pass",
        explanation: "The product is currently available in the United States.",
        source_ids: ["s1"],
      },
    ],
    quality_signals: [{ claim: "Documented build", source_ids: ["s1"] }],
    owner_review: {
      sentiment: "Limited owner evidence",
      praise: [],
      complaints: [],
      reliability_notes: [],
      rating: null,
      review_count: null,
      source_ids: ["s1"],
    },
    pros: [{ claim: "Meets the requirement", source_ids: ["s1"] }],
    cons: [{ claim: "Evidence is limited", source_ids: ["s1"] }],
    evidence: {
      strength: "Moderate",
      useful_source_ids: ["s1"],
      missing_or_conflicting: ["No independent durability test found"],
    },
    ...overrides,
  };
}

function slate(overrides = {}) {
  return {
    prompt_version: AUTONOMOUS_PROMPT_VERSION,
    schema_version: AUTONOMOUS_SLATE_SCHEMA_VERSION,
    research_summary: { text: "One supported option found.", source_ids: ["s1"] },
    category_factors: [{ claim: "Weight matters", source_ids: ["s1"] }],
    products: [card()],
    close_matches: [],
    comparison: [
      {
        product_name: "Example Model One",
        highlights: ["Meets the requirement"],
        tradeoffs: ["Limited test evidence"],
        source_ids: ["s1"],
      },
    ],
    what_to_avoid: [
      {
        description: "Accessory-only listings",
        reason: "They are not complete products.",
        source_ids: ["s1"],
      },
    ],
    final_advice: { text: "Verify the offer before purchase.", source_ids: ["s1"] },
    sources: [
      {
        id: "s1",
        role: "purchase_page",
        title: "Example Model One",
        publisher: "Example Store",
        url: "https://example.com/products/m1",
      },
    ],
    ...overrides,
  };
}

function completedResponse(output = slate(), sourceUrl = "https://example.com/products/m1") {
  return {
    id: "resp_123",
    status: "completed",
    model: "returned-model-snapshot",
    output_text: JSON.stringify(output),
    output: [
      {
        type: "web_search_call",
        action: { sources: [{ url: sourceUrl }] },
      },
    ],
    usage: {
      input_tokens: 1_000,
      input_tokens_details: { cached_tokens: 100 },
      output_tokens: 2_000,
      total_tokens: 3_000,
    },
  };
}

describe("OAI-1 isolated Responses adapter", () => {
  it("freezes required web search, full sources, background mode, and strict output", () => {
    const normalized = buildNormalizedShopperRequest({ query: "vacuum" });
    const request = buildAutonomousResearchRequest(normalized, config);

    assert.equal(request.background, true);
    assert.deepEqual(request.tools, [{ type: "web_search" }]);
    assert.equal(request.tool_choice, "required");
    assert.deepEqual(request.include, ["web_search_call.action.sources"]);
    assert.equal(request.reasoning.effort, "high");
    assert.equal(request.text.format.strict, true);
    assert.equal(request.max_output_tokens, 12_000);
    assert.equal(request.max_tool_calls, 20);
    const requirementChecks =
      request.text.format.schema.properties.products.items.properties
        .requirement_checks;
    assert.deepEqual(
      requirementChecks.items.properties.requirement_id.enum,
      normalized.evaluation_requirements.map((item) => item.id),
    );
    assert.equal(
      requirementChecks.minItems,
      normalized.evaluation_requirements.length,
    );
    assert.equal(
      requirementChecks.maxItems,
      normalized.evaluation_requirements.length,
    );
  });

  it("retains a completed rejected slate and response for sanitized evidence", async () => {
    const rejectedSlate = slate({
      products: [
        card({
          requirement_checks: [
            {
              requirement_id: "market_US",
              status: "Pass",
              explanation: "Available in the requested market.",
              source_ids: ["s1"],
            },
          ],
        }),
      ],
    });
    const response = completedResponse(rejectedSlate);
    const result = await runAutonomousResearch({
      client: {
        responses: {
          create: async () => response,
          retrieve: async () => {
            throw new Error("retrieve must not be called");
          },
        },
      },
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "contract_invalid");
    assert.deepEqual(result.slate, rejectedSlate);
    assert.equal(result.response.id, "resp_123");
    assert.equal(result.ledger.usage.totalTokens, 3_000);
    assert.equal(result.ledger.usage.webSearchCalls, 1);
    const summary = summarizeAutonomousResearchResult(result, {
      inputPerMillionUsd: 1,
      cachedInputPerMillionUsd: 1,
      outputPerMillionUsd: 1,
      webSearchCallUsd: 0.01,
    });
    assert.equal(summary.status, "rejected");
    assert.equal(summary.failure_reason, "contract_invalid");
    assert.equal(summary.web_search_calls, 1);
    assert.equal(summary.usage.totalTokens, 3_000);
    assert.equal(summary.card_count, 1);
    assert.ok(summary.estimated_cost_usd > 0);

    const sanitized = sanitizeAutonomousResponseForEvidence({
      ...response,
      error: {
        code: "invalid_test",
        message: "Do not retain sk-test-secret-value in evidence",
      },
      output: [
        ...response.output,
        { type: "reasoning", summary: "private reasoning" },
        {
          id: "message_1",
          type: "message",
          status: "completed",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "full raw model output",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com/products/m1",
                },
              ],
            },
          ],
        },
      ],
    });
    const serialized = JSON.stringify(sanitized);
    assert.equal(serialized.includes("private reasoning"), false);
    assert.equal(serialized.includes("full raw model output"), false);
    assert.equal(serialized.includes("sk-test-secret-value"), false);
    assert.match(serialized, /url_citation/);
  });

  it("keeps the conditional interpreter non-researching and meaning-preserving", async () => {
    const original = {
      query: "vacuum",
      priorities: "Must handle dog hair",
      avoid: "corded models",
    };
    const deterministic = buildNormalizedShopperRequest(original);
    const interpreterConfig = {
      model: "configured-web-search-model",
      reasoning: "high",
      maxOutputTokens: 4_000,
      maxInputCharacters: 50_000,
      requestTimeoutMs: 120_000,
    };
    const request = buildRequirementInterpreterRequest(
      original,
      deterministic,
      interpreterConfig,
    );
    assert.equal("tools" in request, false);
    assert.equal(request.text.format.strict, true);

    const response = {
      id: "interpreter_1",
      status: "completed",
      model: "returned-model-snapshot",
      output_text: JSON.stringify({
        version: "oai-interpreter-v1",
        product_category: "vacuum",
        budget_text: null,
        hard_requirements: ["Feature: Dog Hair"],
        preferences: [],
        avoid: ["Avoid corded models"],
        assumptions: [],
        unresolved_questions: [],
      }),
      output: [],
      usage: {},
    };
    const result = await runRequirementInterpreter({
      client: {
        responses: {
          create: async () => response,
          retrieve: async () => response,
        },
      },
      originalRequest: original,
      deterministicRequest: deterministic,
      config: interpreterConfig,
    });
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  it("polls one background response and accepts only same-response sources", async () => {
    const calls = [];
    let clock = 0;
    const client = {
      responses: {
        create: async (body, options) => {
          calls.push({ method: "create", body, options });
          return { id: "resp_123", status: "in_progress" };
        },
        retrieve: async (id, query, options) => {
          calls.push({ method: "retrieve", id, query, options });
          return completedResponse();
        },
      },
    };
    const result = await runAutonomousResearch({
      client,
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
      now: () => clock,
      sleep: async (milliseconds) => {
        clock += milliseconds;
      },
    });

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(calls.map((call) => call.method), ["create", "retrieve"]);
    assert.deepEqual(calls[1].query, {
      include: ["web_search_call.action.sources"],
    });
    assert.equal(calls[1].options.timeout, 120_000);
    assert.equal(result.ledger.polls, 1);
    assert.equal(result.ledger.durationMs, 500);
    assert.equal(result.ledger.usage.webSearchCalls, 1);
    assert.deepEqual(result.ledger.sourceHosts, ["example.com"]);
    assert.equal(result.ledger.modelReturned, "returned-model-snapshot");
    assert.ok(result.ledger.requestHash.length === 64);
    assert.ok(result.ledger.normalizedRequestHash.length === 64);
    assert.equal("prompt" in result.ledger, false);
    assert.equal("output" in result.ledger, false);
  });

  it("fails closed on a source the web-search response did not return", async () => {
    const client = {
      responses: {
        create: async () => completedResponse(slate(), "https://other.example/source"),
        retrieve: async () => {
          throw new Error("retrieve must not be called");
        },
      },
    };
    const result = await runAutonomousResearch({
      client,
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "source_not_in_response");
  });

  it("fails closed on incomplete, refusal, malformed, and non-search responses", async () => {
    const cases = [
      [{ id: "r1", status: "incomplete" }, "incomplete_response"],
      [
        {
          ...completedResponse(),
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        },
        "refusal",
      ],
      [{ ...completedResponse(), output_text: "{" }, "invalid_json"],
      [{ ...completedResponse(), output: [] }, "missing_web_search"],
    ];

    for (const [response, expected] of cases) {
      const result = await runAutonomousResearch({
        client: {
          responses: {
            create: async () => response,
            retrieve: async () => response,
          },
        },
        normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
        config,
      });
      assert.equal(result.ok, false);
      assert.equal(result.reason, expected);
    }
  });

  it("retains safe API diagnostics without leaking an API key", async () => {
    const error = Object.assign(
      new Error("400 Invalid schema format uri for sk-test-secret-value"),
      {
        status: 400,
        code: "invalid_json_schema",
        param: "text.format.schema",
        type: "invalid_request_error",
      },
    );
    const result = await runAutonomousResearch({
      client: {
        responses: {
          create: async () => {
            throw error;
          },
          retrieve: async () => {
            throw new Error("unexpected retrieve");
          },
        },
      },
      normalizedRequest: buildNormalizedShopperRequest({ query: "vacuum" }),
      config,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "request_error");
    assert.ok(result.details.includes("status:400"));
    assert.ok(result.details.includes("code:invalid_json_schema"));
    assert.equal(result.details.join(" ").includes("sk-test-secret-value"), false);
  });

  it("rejects duplicate cards, rank gaps, and dangling source references", () => {
    const invalid = slate({
      products: [card(), card({ rank: 3 })],
      final_advice: { text: "Advice", source_ids: ["s99"] },
    });
    const result = validateAutonomousSlateContract(invalid);
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("ranks_not_contiguous_in_output_order"));
    assert.ok(result.errors.includes("duplicate_product_identity"));
    assert.ok(
      result.errors.some((error) => error.includes("unknown_source_reference")),
    );
  });

  it("requires every Best Match to pass every hard request and bind offer facts", () => {
    const request = buildNormalizedShopperRequest({
      query: "vacuum",
      priorities: "Must handle dog hair",
    });
    const requiredId = request.hard_requirements[0].id;
    const validCard = card({
      requirement_checks: [
        {
          requirement_id: AUTONOMOUS_MARKET_REQUIREMENT_ID,
          status: "Pass",
          explanation: "The cited purchase page is in the requested market.",
          source_ids: ["s1"],
        },
        {
          requirement_id: requiredId,
          status: "Pass",
          explanation: "The cited product page states this feature.",
          source_ids: ["s1"],
        },
      ],
    });
    assert.equal(
      validateAutonomousSlateForRequest(slate({ products: [validCard] }), request)
        .valid,
      true,
    );

    validCard.requirement_checks[0].status = "Needs verification";
    validCard.purchase_offer.product_url = "https://invented.example/product";
    const invalid = validateAutonomousSlateForRequest(
      slate({ products: [validCard] }),
      request,
    );
    assert.equal(invalid.valid, false);
    assert.ok(
      invalid.errors.some((error) =>
        error.startsWith("best_match_has_unmet_hard_requirement:"),
      ),
    );
    assert.ok(
      invalid.errors.some((error) =>
        error.startsWith("purchase_url_not_bound_to_purchase_source:"),
      ),
    );
  });

  it("requires the deterministic market and active-budget checks and rejects invented IDs", () => {
    const broad = buildNormalizedShopperRequest({ query: "vacuum" });
    assert.equal(validateAutonomousSlateForRequest(slate(), broad).valid, true);

    const missingMarket = card({ requirement_checks: [] });
    const missing = validateAutonomousSlateForRequest(
      slate({ products: [missingMarket] }),
      broad,
    );
    assert.equal(missing.valid, false);
    assert.ok(
      missing.errors.some((error) =>
        error.includes(`missing_hard_requirement_check:Example Model One:${AUTONOMOUS_MARKET_REQUIREMENT_ID}`),
      ),
    );

    const invented = card({
      requirement_checks: [
        {
          requirement_id: "market_US",
          status: "Pass",
          explanation: "Invented alias",
          source_ids: ["s1"],
        },
      ],
    });
    const inventedResult = validateAutonomousSlateForRequest(
      slate({ products: [invented] }),
      broad,
    );
    assert.equal(inventedResult.valid, false);
    assert.ok(
      inventedResult.errors.some((error) =>
        error.includes("unknown_requirement_id:Example Model One:market_US"),
      ),
    );

    const constrained = buildNormalizedShopperRequest({
      query: "vacuum",
      budget: "under $500",
    });
    const budgetNeedsVerification = card({
      requirement_checks: constrained.evaluation_requirements.map((item) => ({
        requirement_id: item.id,
        status: item.kind === "budget" ? "Needs verification" : "Pass",
        explanation: "Bounded test evidence",
        source_ids: ["s1"],
      })),
    });
    const constrainedResult = validateAutonomousSlateForRequest(
      slate({ products: [budgetNeedsVerification] }),
      constrained,
    );
    assert.equal(constrainedResult.valid, false);
    assert.ok(
      constrainedResult.errors.some((error) =>
        error.startsWith("best_match_has_unmet_hard_requirement:"),
      ),
    );
  });

  it("uses explicit current rates and has no hidden cost defaults", () => {
    const cost = estimateAutonomousResearchCost(
      {
        inputTokens: 1_000_000,
        cachedInputTokens: 500_000,
        outputTokens: 250_000,
        totalTokens: 1_750_000,
        webSearchCalls: 4,
      },
      {
        inputPerMillionUsd: 2,
        cachedInputPerMillionUsd: 0.2,
        outputPerMillionUsd: 8,
        webSearchCallUsd: 0.01,
      },
    );
    assert.equal(cost, 3.14);
  });

  it("pins the approved OAI-2A window to Terra with no replacement budget", () => {
    assert.equal(OAI_2A_PROPOSED_CONFIG.research.model, "gpt-5.6-terra");
    assert.equal(OAI_2A_PROPOSED_CONFIG.interpreter.model, "gpt-5.6-terra");
    assert.equal(OAI_2A_PROPOSED_CONFIG.approvalUnits.apiCalls, 4);
    assert.equal(OAI_2A_PROPOSED_CONFIG.approvalUnits.webSearchToolCalls, 60);
    assert.equal(OAI_2A_PROPOSED_CONFIG.approvalUnits.retries, 0);
    assert.equal(OAI_2A_PROPOSED_CONFIG.approvalUnits.replacements, 0);
    assert.equal(OAI_2A_PROPOSED_CONFIG.planningHardCeilingUsd, 20);
    assert.equal(OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens, 272_000);
    assert.equal(
      OAI_2A_PROPOSED_CONFIG.longContextRatesAsOf2026_07_15.outputPerMillionUsd,
      22.5,
    );
  });
});

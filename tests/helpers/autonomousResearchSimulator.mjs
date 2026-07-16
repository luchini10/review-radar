import {
  AUTONOMOUS_MARKET_REQUIREMENT_ID,
  AUTONOMOUS_PROMPT_VERSION,
  AUTONOMOUS_SLATE_SCHEMA_VERSION,
} from "../../lib/autonomousResearchContract.ts";

export function simulatedCard(overrides = {}) {
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

export function simulatedSlate(overrides = {}) {
  return {
    prompt_version: AUTONOMOUS_PROMPT_VERSION,
    schema_version: AUTONOMOUS_SLATE_SCHEMA_VERSION,
    research_summary: { text: "One supported option found.", source_ids: ["s1"] },
    category_factors: [{ claim: "Weight matters", source_ids: ["s1"] }],
    products: [simulatedCard()],
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

export function completedSimulatedResponse({
  slate = simulatedSlate(),
  sourceUrl = "https://example.com/products/m1",
  sourceShape = "sources",
  model = "returned-model-snapshot",
} = {}) {
  const action =
    sourceShape === "open_page"
      ? { type: "open_page", url: sourceUrl }
      : sourceShape === "find_in_page"
        ? { type: "find_in_page", pattern: "price", url: sourceUrl }
        : { type: "search", query: "example product", sources: [{ url: sourceUrl }] };
  return {
    id: "resp_123",
    status: "completed",
    model,
    output_text: JSON.stringify(slate),
    output: [{ type: "web_search_call", status: "completed", action }],
    usage: {
      input_tokens: 1_000,
      input_tokens_details: { cached_tokens: 100 },
      output_tokens: 2_000,
      total_tokens: 3_000,
    },
  };
}

export function createScriptedResponsesClient({
  createResponse,
  retrieveResponses = [],
  createError,
  retrieveErrorAt,
}) {
  const calls = [];
  let retrieveIndex = 0;
  const client = {
    responses: {
      create: async (body, options) => {
        calls.push({ method: "create", body, options });
        if (createError) throw createError;
        return typeof createResponse === "function"
          ? createResponse({ body, options })
          : structuredClone(createResponse);
      },
      retrieve: async (id, query, options) => {
        calls.push({ method: "retrieve", id, query, options });
        if (retrieveIndex === retrieveErrorAt) {
          retrieveIndex += 1;
          throw new Error("simulated retrieve failure");
        }
        if (retrieveIndex >= retrieveResponses.length) {
          throw new Error("unexpected retrieve call");
        }
        const response = retrieveResponses[retrieveIndex];
        retrieveIndex += 1;
        return typeof response === "function"
          ? response({ id, query, options })
          : structuredClone(response);
      },
    },
  };
  return { client, calls };
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  featureEvidenceSupports,
  validateProductAgainstRequirements,
} from "../lib/requirementValidation.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { verifyMissingRequirementEvidence } from "../lib/requirementEvidenceRescue.ts";
import { collectReachableCitationUrls } from "../lib/citationUrlVerification.ts";
import { createRecommendationPostHandler } from "../app/api/recommendations/route.ts";

const verifiedAt = "2026-01-01T00:00:00.000Z";

function field(value) {
  return {
    confidence: "High",
    sourceType: "json_ld",
    sourceUrl: "https://shop.example.com/p/xdr2000-drill-kit",
    value,
    verifiedAt,
  };
}

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example PowerPro 20V Brushless Cordless Drill Driver Kit XDR2000",
    category: "power drill",
    product_page_url: "https://shop.example.com/p/xdr2000-drill-kit",
    product_image_url: "https://shop.example.com/xdr2000.jpg",
    why_recommended: "Strong cordless drill with kit accessories.",
    pros: ["Compact and light.", "Strong reviews for reliability."],
    cons: ["Chuck wobble reported rarely."],
    common_complaints: [],
    estimated_price_range: "$199",
    confidence_score: 80,
    source_consensus: "Mixed",
    price_value_verdict: "Fair price for a kit.",
    best_for: "DIY users.",
    not_for: ["Heavy industrial use."],
    citations: [
      {
        title: "Example listing",
        url: "https://shop.example.com/p/xdr2000-drill-kit",
        what_it_supports: "Listing data.",
      },
    ],
    metadata: {
      offers: [
        {
          availability: field("In stock"),
          price: field(199),
          priceCurrency: field("USD"),
          retailer: "shop.example.com",
          url: "https://shop.example.com/p/xdr2000-drill-kit",
        },
      ],
    },
    ...overrides,
  };
}

function drillRequest(overrides = {}) {
  const request = {
    query: "Power drill",
    budget: "$1500",
    selectedFeatures: [
      { id: "f1", name: "Power source", operator: "equals", value: "Cordless" },
      { id: "f2", name: "Brushless motor", operator: "required", value: true },
      { id: "f3", name: "Battery included", operator: "required", value: true },
    ],
    ...overrides,
  };

  return {
    ...request,
    extractedRequirements: extractStructuredRequirements(request),
  };
}

describe("feature requirement matching on real listing language", () => {
  it("verifies smart features phrased differently in listings", () => {
    const product = buildProduct({
      pros: [
        "Compact and light.",
        "Listing details: Brushless cordless drill kit with two 2.0Ah batteries and charger.",
      ],
    });
    const result = validateProductAgainstRequirements(product, drillRequest());

    assert.equal(result.isMatch, true, JSON.stringify(result, null, 2));
    assert.deepEqual(result.missingRequirements, []);
    assert.deepEqual(result.unknownRequirements, []);
  });

  it("does not verify battery included for tool-only listings", () => {
    const product = buildProduct({
      name: "Example PowerPro 20V Brushless Cordless Drill XDR2000 (Tool Only)",
      pros: [
        "Compact and light.",
        "Listing details: Brushless cordless drill, battery sold separately.",
      ],
    });
    const result = validateProductAgainstRequirements(product, drillRequest());

    assert.equal(result.isMatch, false);
    assert.equal(
      result.matchedRequirements.some((label) => /battery included/i.test(label)),
      false,
    );
  });

  it("exposes shared evidence matching with positive and negative phrasing", () => {
    assert.equal(
      featureEvidenceSupports(
        "drill driver kit with 2 batteries and charger included",
        "Battery included",
      ),
      true,
    );
    assert.equal(
      featureEvidenceSupports(
        "bare tool only, battery sold separately",
        "Battery included",
      ),
      false,
    );
    assert.equal(
      featureEvidenceSupports("brushless cordless hammer drill", "Brushless motor"),
      true,
    );
  });

  it("still accepts requirements that contain their own negation words", () => {
    const request = {
      query: "queen bed frame",
      priorities: "with storage drawers, no box spring required",
    };
    const product = buildProduct({
      name: "Modern Queen Platform Bed Frame with Storage Drawers",
      category: "Queen bed frame",
      pros: ["Includes storage drawers.", "No box spring needed."],
    });
    const result = validateProductAgainstRequirements(product, {
      ...request,
      extractedRequirements: extractStructuredRequirements(request),
    });

    assert.equal(result.isMatch, true, JSON.stringify(result, null, 2));
  });
});

describe("feature evidence rescue", () => {
  it("rescues unknown features from shopping evidence and passes revalidation", async () => {
    const originalKey = process.env.SERPER_API_KEY;
    const originalFetch = global.fetch;

    process.env.SERPER_API_KEY = "test-serper-key";
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          shopping: [
            {
              title:
                "Example PowerPro 20V Brushless Cordless Drill Driver Kit XDR2000",
              link: "https://shop.example.com/p/xdr2000-drill-kit",
              source: "Example Store",
              price: "$199",
              snippet:
                "Brushless cordless drill driver kit includes two batteries and charger.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    try {
      const request = drillRequest();
      const product = buildProduct();
      const before = validateProductAgainstRequirements(product, request);

      assert.equal(before.isMatch, false);
      assert.ok(before.unknownRequirements.length > 0);

      const rescued = await verifyMissingRequirementEvidence(
        {
          search_summary: "test",
          assumptions: [],
          exactMatches: [],
          nearMatches: [product],
          recommendations: [],
          what_to_avoid: [],
          final_buying_advice: "test",
        },
        request,
        { maxProducts: 2 },
      );
      const rescuedProduct = rescued.nearMatches[0];
      const after = validateProductAgainstRequirements(rescuedProduct, request);

      assert.equal(after.isMatch, true, JSON.stringify(after, null, 2));
    } finally {
      global.fetch = originalFetch;
      if (originalKey === undefined) {
        delete process.env.SERPER_API_KEY;
      } else {
        process.env.SERPER_API_KEY = originalKey;
      }
    }
  });
});

describe("citation reachability leniency", () => {
  function resultWithCitation(url) {
    return {
      recommendations: [
        {
          citations: [{ url }],
        },
      ],
    };
  }

  it("treats bot-walled and slow responses as reachable", async () => {
    const originalFetch = global.fetch;

    try {
      global.fetch = async () => new Response("", { status: 503 });
      let verified = await collectReachableCitationUrls(
        resultWithCitation("https://www.example.com/p/botwalled"),
      );
      assert.equal(verified.size, 1);

      global.fetch = async () => {
        const error = new Error("timeout");
        error.name = "AbortError";
        throw error;
      };
      verified = await collectReachableCitationUrls(
        resultWithCitation("https://www.example.com/p/slow"),
      );
      assert.equal(verified.size, 1);

      global.fetch = async () => new Response("", { status: 404 });
      verified = await collectReachableCitationUrls(
        resultWithCitation("https://www.example.com/p/missing"),
      );
      assert.equal(verified.size, 0);

      global.fetch = async () => {
        throw new Error("getaddrinfo ENOTFOUND");
      };
      verified = await collectReachableCitationUrls(
        resultWithCitation("https://no-such-host.example/p/fake"),
      );
      assert.equal(verified.size, 0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("serper candidates survive citation verification", () => {
  it("keeps serper-discovered products without network re-checks", async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY;

    process.env.OPENAI_API_KEY = "test-openai-key";

    let reachabilityCalls = 0;
    const serperCandidate = {
      id: "serper-microwave",
      name: "Example Countertop Microwave EM720",
      brand: null,
      category: "microwave",
      productUrl: "https://shop.example.com/p/example-microwave-em720",
      imageUrl: "https://shop.example.com/images/em720.jpg",
      retailer: "Example Store",
      price: 89,
      rating: 4.5,
      reviewCount: 220,
      availableColors: [],
      dimensions: { width: null, depth: null, height: null, unit: null },
      keySpecs: [],
      evidenceSources: [
        {
          title: "Example Countertop Microwave EM720",
          url: "https://shop.example.com/p/example-microwave-em720",
          snippet: "Compact countertop microwave.",
        },
      ],
      requirementCheck: { exactMatch: false, passed: [], failed: [], unknown: [] },
    };
    const handler = createRecommendationPostHandler({
      collectReachableCitationUrls: async () => {
        reachabilityCalls += 1;
        return new Set();
      },
      createOpenAIClient: async () => ({
        responses: {
          create: async () => ({
            output: [],
            output_text: JSON.stringify({
              search_summary: "Mocked research.",
              assumptions: [],
              generated_queries: Array.from(
                { length: 8 },
                (_, index) => `microwave query ${index + 1}`,
              ),
              raw_candidate_count: 0,
              candidate_products: [],
              what_to_avoid: [],
              final_buying_advice: "Mocked advice.",
            }),
          }),
        },
      }),
      enrichProductAssets: async (result) => result,
      enrichResultWithReviewEvidence: async (result) => result,
      searchSerperForProducts: async () => ({
        candidates: [serperCandidate],
        stats: {
          categoryGroup: "appliances",
          generatedQueries: [],
          selectedSourcePack: [],
          searchedShoppingQueries: [],
          searchedOrganicQueries: [],
          searchedRetailerDomainQueries: [],
          searchedDirectRetailerQueries: [],
          shoppingCalls: 1,
          organicCalls: 0,
          retailerDomainCalls: 0,
          directRetailerCalls: 0,
          collectedCandidates: 1,
          duplicateCandidatesRemoved: 0,
          maxEnrichedProducts: 6,
          preFilteredCandidates: 1,
          rejectedCandidates: 0,
          searchDepth: "dev",
          sourceTimeouts: 0,
        },
      }),
      verifyMissingRequirementEvidence: async (result) => result,
    });
    try {
      const response = await handler(
        new Request("http://localhost/api/recommendations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "microwave" }),
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);

      const shownProducts = [
        ...body.result.exactMatches,
        ...body.result.nearMatches,
      ];

      assert.ok(
        shownProducts.some((product) =>
          product.name.includes("Example Countertop Microwave"),
        ),
        JSON.stringify(body, null, 2),
      );
      assert.equal(reachabilityCalls, 0);
    } finally {
      if (originalOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
    }
  });
});

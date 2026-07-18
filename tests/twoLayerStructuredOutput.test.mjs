import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTwoLayerStructuredOutputJsonSchema,
  parseTwoLayerStructuredOutput,
  TWO_LAYER_STRUCTURED_OUTPUT_VERSION,
} from "../lib/twoLayerRecommendation.ts";

const productUrl = "https://shop.example.com/products/example-vacuum";
const testUrl = "https://tests.example.org/example-vacuum";
const unregisteredUrl = "https://tracking.example.net/redirect/example-vacuum";

function recommendation(overrides = {}) {
  return {
    key: "example-vacuum",
    rank: 1,
    recommendation_status: "Best Match",
    identity: {
      brand: "Example",
      product_name: "Example Vacuum",
      model: "EV100",
      variant: null,
      source_ids: ["s1"],
    },
    assessment: {
      why: "A balanced exact-model option.",
      best_for: "Mixed floors",
      main_tradeoff: "Heavier than compact models",
      source_ids: ["s1", "s2"],
    },
    pros: [{ text: "Strong pickup", source_ids: ["s2"] }],
    cons: [{ text: "Heavy for stairs", source_ids: ["s2"] }],
    requirement_checks: [
      {
        requirement: "Currently available for purchase in the United States",
        status: "Pass",
        explanation: "The exact product page is current.",
        source_ids: ["s1"],
      },
    ],
    claims: [
      {
        claim_type: "professional_performance",
        text: "Independent testing reports strong pickup.",
        source_ids: ["s2"],
        evidence_scope: "exact_model",
      },
    ],
    ...overrides,
  };
}

function modelOutput(overrides = {}) {
  return {
    version: TWO_LAYER_STRUCTURED_OUTPUT_VERSION,
    sources: [
      { id: "s1", url: `${productUrl}?utm_source=openai` },
      { id: "s2", url: testUrl },
    ],
    recommendations: [recommendation()],
    ...overrides,
  };
}

const responseSources = [
  { url: productUrl, title: "Example Vacuum - $399.99", type: null },
  { url: testUrl, title: "Example Vacuum independent test", type: null },
];

describe("OAI-T5C one-call structured research contract", () => {
  it("freezes a strict schema without commerce or model-authored source labels", () => {
    const schema = buildTwoLayerStructuredOutputJsonSchema(3);
    const serialized = JSON.stringify(schema);

    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.version.const, TWO_LAYER_STRUCTURED_OUTPUT_VERSION);
    assert.equal(
      schema.properties.recommendations.items.properties.requirement_checks.minItems,
      3,
    );
    assert.equal(
      schema.properties.recommendations.items.properties.requirement_checks.maxItems,
      3,
    );
    for (const forbidden of [
      "price_amount",
      "price_text",
      "seller",
      "product_url",
      "image_url",
      "availability",
      "publisher",
      "role",
      "title",
    ]) {
      assert.equal(serialized.includes(`\"${forbidden}\"`), false, forbidden);
    }
  });

  it("accepts one schema-bound slate and uses only response-owned source metadata", () => {
    const result = parseTwoLayerStructuredOutput({
      rawOutputText: JSON.stringify(modelOutput()),
      responseSources,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.research.sources, [
      {
        id: "s1",
        title: "Example Vacuum - $399.99",
        url: productUrl,
        role: "other",
      },
      {
        id: "s2",
        title: "Example Vacuum independent test",
        url: testUrl,
        role: "other",
      },
    ]);
    assert.equal(result.research.recommendations[0].identity.product_name, "Example Vacuum");
    assert.deepEqual(result.diagnostic, {
      contractVersion: TWO_LAYER_STRUCTURED_OUTPUT_VERSION,
      jsonParsed: true,
      recommendationCount: 1,
      declaredSourceCount: 2,
      registeredSourceCount: 2,
      ignoredUnregisteredSourceCount: 0,
      ignoredUnusedRegisteredSourceCount: 0,
    });
  });

  it("drops an unregistered claim citation without exposing its URL or changing the claim", () => {
    const output = modelOutput({
      sources: [
        ...modelOutput().sources,
        { id: "s3", url: unregisteredUrl },
      ],
      recommendations: [
        recommendation({
          claims: [
            {
              claim_type: "other",
              text: "A claim supported only by an unregistered source.",
              source_ids: ["s3"],
              evidence_scope: "unresolved",
            },
          ],
        }),
      ],
    });
    const result = parseTwoLayerStructuredOutput({
      rawOutputText: JSON.stringify(output),
      responseSources,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.research.recommendations[0].claims[0].source_ids, []);
    assert.equal(JSON.stringify(result.research).includes(unregisteredUrl), false);
    assert.equal(result.diagnostic.ignoredUnregisteredSourceCount, 1);
  });

  it("fails closed when required product identity evidence is unregistered", () => {
    const output = modelOutput({
      sources: [{ id: "s1", url: unregisteredUrl }],
      recommendations: [
        recommendation({
          identity: {
            ...recommendation().identity,
            source_ids: ["s1"],
          },
          assessment: {
            ...recommendation().assessment,
            source_ids: ["s1"],
          },
          pros: [],
          cons: [],
          requirement_checks: [
            {
              ...recommendation().requirement_checks[0],
              source_ids: [],
            },
          ],
          claims: [],
        }),
      ],
    });
    const result = parseTwoLayerStructuredOutput({
      rawOutputText: JSON.stringify(output),
      responseSources,
    });

    assert.deepEqual(result, {
      ok: false,
      reason: "contract_invalid",
      cause: "required_registered_source_missing",
      diagnostic: {
        contractVersion: TWO_LAYER_STRUCTURED_OUTPUT_VERSION,
        jsonParsed: true,
        recommendationCount: 1,
        declaredSourceCount: 1,
        registeredSourceCount: 0,
        ignoredUnregisteredSourceCount: 1,
        ignoredUnusedRegisteredSourceCount: 0,
      },
    });
  });

  it("returns bounded causes for invalid JSON, schema drift, and rank drift", () => {
    const invalidJson = parseTwoLayerStructuredOutput({
      rawOutputText: "not-json and private shopper prose",
      responseSources,
    });
    assert.equal(invalidJson.ok, false);
    assert.equal(invalidJson.reason, "invalid_json");
    assert.equal(invalidJson.cause, "invalid_json");
    assert.equal(JSON.stringify(invalidJson).includes("private shopper prose"), false);

    const schemaDrift = parseTwoLayerStructuredOutput({
      rawOutputText: JSON.stringify({ ...modelOutput(), recommendations: undefined }),
      responseSources,
    });
    assert.equal(schemaDrift.ok, false);
    assert.equal(schemaDrift.reason, "schema_invalid");
    assert.equal(schemaDrift.cause, "schema_invalid");

    const rankDrift = parseTwoLayerStructuredOutput({
      rawOutputText: JSON.stringify(
        modelOutput({ recommendations: [recommendation({ rank: 2 })] }),
      ),
      responseSources,
    });
    assert.equal(rankDrift.ok, false);
    assert.equal(rankDrift.reason, "contract_invalid");
    assert.equal(rankDrift.cause, "rank_order_mismatch");
  });
});

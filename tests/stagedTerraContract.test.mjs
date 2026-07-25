import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  buildStagedTerraRequestFingerprint,
  STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
  STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
  STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
  validateStagedTerraEvidencePackage,
  validateStagedTerraPresentationOutput,
  validateStagedTerraResearchOutput,
} from "../lib/stagedTerraContract.ts";
import {
  buildStagedTerraPresentationRequest,
  buildStagedTerraResearchRequest,
  STAGED_TERRA_MODEL,
  STAGED_TERRA_SCHEMA_VERSIONS,
} from "../lib/stagedTerraPrompt.ts";
import {
  stagedTerraClientEnabled,
  stagedTerraServerEnabled,
} from "../lib/stagedTerraConfig.ts";

const shopper = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "Good for dog hair and relatively lightweight",
  avoid: "corded models",
  selectedFeatures: [
    {
      id: "battery-powered",
      name: "Battery powered",
      type: "boolean",
      operator: "required",
      value: true,
      required: true,
      source: "smart_features",
    },
  ],
};

const requirementIds = [
  "market_us",
  "budget",
  "important_details",
  "smart_feature:battery-powered",
  "dealbreakers",
];

function researchFixture() {
  const responseSourceUrls = [];
  const candidates = Array.from({ length: 8 }, (_, candidateIndex) => {
    const candidateId = `candidate_${candidateIndex + 1}`;
    const sourceUrls = [
      `https://manufacturer${candidateIndex + 1}.example/products/model-${candidateIndex + 1}`,
      `https://testing.example/reviews/model-${candidateIndex + 1}`,
    ];
    responseSourceUrls.push(...sourceUrls);
    return {
      candidate_id: candidateId,
      product_name: `Brand ${candidateIndex + 1} Model ${candidateIndex + 1}`,
      brand: `Brand ${candidateIndex + 1}`,
      model: `M${candidateIndex + 1}00`,
      product_type: "cordless vacuum",
      source_urls: sourceUrls,
      requirement_leads: requirementIds.map((requirementId) => ({
        requirement_id: requirementId,
        status: "supporting_evidence",
        summary: `Source evidence for ${requirementId}`,
        source_urls: [sourceUrls[0]],
      })),
      fact_leads: [
        {
          fact_id: `${candidateId}_fact_1`,
          kind: "identity",
          statement: "The manufacturer identifies the exact model.",
          source_urls: [sourceUrls[0]],
        },
        {
          fact_id: `${candidateId}_fact_2`,
          kind: "performance",
          statement: "The testing source reported strong pickup.",
          source_urls: [sourceUrls[1]],
        },
      ],
    };
  });
  return {
    value: {
      schema_version: STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
      candidates,
    },
    responseSourceUrls,
  };
}

function parsedResearch() {
  const fixture = researchFixture();
  const parsed = validateStagedTerraResearchOutput({
    value: fixture.value,
    shopperRequest: shopper,
    responseSourceUrls: fixture.responseSourceUrls,
  });
  assert.equal(parsed.ok, true);
  return parsed.value;
}

function evidencePackageFixture() {
  const researchOutput = parsedResearch();
  const requirements = [
    { id: "market_us", kind: "us_availability", hard: true },
    { id: "budget", kind: "budget", hard: true },
    {
      id: "important_details",
      kind: "important_details",
      hard: true,
    },
    {
      id: "smart_feature:battery-powered",
      kind: "smart_feature",
      hard: true,
    },
    { id: "dealbreakers", kind: "dealbreakers", hard: true },
  ];
  return {
    researchOutput,
    value: {
      schema_version: STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
      request_fingerprint: buildStagedTerraRequestFingerprint(shopper),
      requirements,
      evidence: [
        {
          evidence_id: "e1",
          candidate_id: "candidate_1",
          kind: "claim",
          url: "https://manufacturer1.example/products/model-1",
          host: "manufacturer1.example",
          title: "Brand 1 Model 1",
          source_type: "manufacturer",
        },
        {
          evidence_id: "e2",
          candidate_id: "candidate_1",
          kind: "claim",
          url: "https://testing.example/reviews/model-1",
          host: "testing.example",
          title: "Independent test of Model 1",
          source_type: "independent_testing",
        },
        {
          evidence_id: "e3",
          candidate_id: "candidate_1",
          kind: "product_page",
          url: "https://retailer.example/products/brand-1-model-1",
          host: "retailer.example",
          title: "Brand 1 Model 1 cordless vacuum",
          source_type: "retailer",
        },
        {
          evidence_id: "e4",
          candidate_id: "candidate_1",
          kind: "image",
          url: "https://images.retailer.example/brand-1-model-1.webp",
          host: "images.retailer.example",
          title: "Brand 1 Model 1 product image",
          source_type: "retailer",
        },
        {
          evidence_id: "e5",
          candidate_id: "candidate_2",
          kind: "claim",
          url: "https://manufacturer2.example/products/model-2",
          host: "manufacturer2.example",
          title: "Brand 2 Model 2",
          source_type: "manufacturer",
        },
      ],
      candidates: [
        {
          candidate_id: "candidate_1",
          product_name: "Brand 1 Model 1",
          brand: "Brand 1",
          model: "M100",
          product_type: "cordless vacuum",
          eligibility: "eligible",
          exclusion_reason: null,
          requirement_verdicts: requirementIds.map((requirementId) => ({
            requirement_id: requirementId,
            verdict: "pass",
            evidence_ids: ["e1"],
          })),
          facts: [
            {
              fact_id: "vf1",
              kind: "identity",
              statement: "The exact model identity is verified.",
              verification: "verified",
              evidence_ids: ["e1"],
            },
            {
              fact_id: "vf2",
              kind: "performance",
              statement: "Independent testing reported strong pickup.",
              verification: "source_reported",
              evidence_ids: ["e2"],
            },
            {
              fact_id: "vf3",
              kind: "price",
              statement: "A current standalone-product price was observed.",
              verification: "verified",
              evidence_ids: ["e3"],
            },
          ],
          assets: {
            product_url:
              "https://retailer.example/products/brand-1-model-1",
            product_url_evidence_id: "e3",
            image_url:
              "https://images.retailer.example/brand-1-model-1.webp",
            image_url_evidence_id: "e4",
          },
        },
        {
          candidate_id: "candidate_2",
          product_name: "Brand 2 Model 2",
          brand: "Brand 2",
          model: "M200",
          product_type: "cordless vacuum",
          eligibility: "close_match",
          exclusion_reason: "Budget could not be verified.",
          requirement_verdicts: requirementIds.map(
            (requirementId, index) => ({
              requirement_id: requirementId,
              verdict: index === 1 ? "not_verified" : "pass",
              evidence_ids: index === 1 ? [] : ["e5"],
            }),
          ),
          facts: [
            {
              fact_id: "vf4",
              kind: "identity",
              statement: "The exact model identity is verified.",
              verification: "verified",
              evidence_ids: ["e5"],
            },
          ],
          assets: {
            product_url: null,
            product_url_evidence_id: null,
            image_url: null,
            image_url_evidence_id: null,
          },
        },
        ...Array.from({ length: 6 }, (_, index) => {
          const candidateNumber = index + 3;
          return {
            candidate_id: `candidate_${candidateNumber}`,
            product_name: `Brand ${candidateNumber} Model ${candidateNumber}`,
            brand: `Brand ${candidateNumber}`,
            model: `M${candidateNumber}00`,
            product_type: "cordless vacuum",
            eligibility: "excluded",
            exclusion_reason: "No requirement evidence was verified.",
            requirement_verdicts: requirementIds.map((requirementId) => ({
              requirement_id: requirementId,
              verdict: "not_verified",
              evidence_ids: [],
            })),
            facts: [],
            assets: {
              product_url: null,
              product_url_evidence_id: null,
              image_url: null,
              image_url_evidence_id: null,
            },
          };
        }),
      ],
    },
  };
}

function parsedEvidencePackage() {
  const fixture = evidencePackageFixture();
  const parsed = validateStagedTerraEvidencePackage({
    value: fixture.value,
    shopperRequest: shopper,
    researchOutput: fixture.researchOutput,
  });
  assert.equal(parsed.ok, true);
  return parsed.value;
}

function presentationFixture() {
  return {
    schema_version: STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
    ranked_products: [
      {
        rank: 1,
        candidate_id: "candidate_1",
        product_name: "Brand 1 Model 1",
        why_ranked: {
          text: "The exact product fits the verified requirements.",
          fact_ids: ["vf1"],
        },
        best_for: {
          text: "Best for shoppers prioritizing independently tested pickup.",
          fact_ids: ["vf2"],
        },
        main_tradeoff: {
          text: "The observed standalone price is the main tradeoff.",
          fact_ids: ["vf3"],
        },
        requirement_explanations: requirementIds.map((requirementId) => ({
          requirement_id: requirementId,
          verdict: "pass",
          text: `Verified evidence supports ${requirementId}.`,
          evidence_ids: ["e1"],
        })),
        pros: [
          {
            text: "Independent testing reported strong pickup.",
            fact_ids: ["vf2"],
          },
        ],
        cons: [
          {
            text: "The observed price may be a tradeoff.",
            fact_ids: ["vf3"],
          },
        ],
      },
    ],
    close_match_candidate_ids: ["candidate_2"],
    final_advice: [
      {
        text: "Choose the first candidate when verified fit matters most.",
        candidate_ids: ["candidate_1"],
        fact_ids: ["vf1"],
      },
    ],
  };
}

describe("staged Terra request boundaries", () => {
  it("uses Terra for two smaller, independent Responses requests", () => {
    const research = buildStagedTerraResearchRequest(shopper);
    const presentation = buildStagedTerraPresentationRequest(
      parsedEvidencePackage(),
    );

    assert.equal(STAGED_TERRA_MODEL, "gpt-5.6-terra");
    assert.equal(research.model, "gpt-5.6-terra");
    assert.deepEqual(research.reasoning, { effort: "high" });
    assert.equal(research.background, true);
    assert.deepEqual(research.tools, [{ type: "web_search" }]);
    assert.equal(research.tool_choice, "required");
    assert.equal(research.max_tool_calls, 10);
    assert.equal(research.max_output_tokens, 8_000);
    assert.deepEqual(research.include, [
      "web_search_call.action.sources",
    ]);
    assert.deepEqual(
      Object.keys(research.text.format.schema.properties),
      ["schema_version", "candidates"],
    );

    assert.equal(presentation.model, "gpt-5.6-terra");
    assert.deepEqual(presentation.reasoning, { effort: "medium" });
    assert.equal(presentation.background, false);
    assert.equal("tools" in presentation, false);
    assert.equal("tool_choice" in presentation, false);
    assert.equal("include" in presentation, false);
    assert.equal(presentation.max_output_tokens, 8_000);
    assert.match(presentation.instructions, /Do not browse/);
    assert.doesNotMatch(presentation.input, /product_url/i);
    assert.doesNotMatch(presentation.input, /image_url/i);
    assert.doesNotMatch(presentation.input, /https:\/\//i);
    assert.deepEqual(STAGED_TERRA_SCHEMA_VERSIONS, {
      research: "staged-terra-research-v1",
      evidence: "staged-terra-evidence-v1",
      presentation: "staged-terra-presentation-v1",
    });
  });

  it("keeps the integrated path default-off and isolated from Direct Terra", () => {
    assert.equal(stagedTerraServerEnabled({}), false);
    assert.equal(
      stagedTerraServerEnabled({ REVIEW_RADAR_STAGED_TERRA: "off" }),
      false,
    );
    assert.equal(
      stagedTerraServerEnabled({ REVIEW_RADAR_STAGED_TERRA: "on" }),
      true,
    );
    assert.equal(stagedTerraClientEnabled({}), false);
    assert.equal(
      stagedTerraClientEnabled({
        NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA: "true",
      }),
      true,
    );

    const environment = fs.readFileSync(".env.example", "utf8");
    assert.match(environment, /^REVIEW_RADAR_STAGED_TERRA=off$/m);
    assert.match(
      environment,
      /^NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false$/m,
    );
    const route = fs.readFileSync(
      "lib/directTerraRecommendationRoute.ts",
      "utf8",
    );
    assert.doesNotMatch(route, /stagedTerra/);
  });

  it("contains no Sol model or previous-response coupling", () => {
    const research = buildStagedTerraResearchRequest(shopper);
    const presentation = buildStagedTerraPresentationRequest(
      parsedEvidencePackage(),
    );
    assert.doesNotMatch(JSON.stringify(research), /sol/i);
    assert.doesNotMatch(JSON.stringify(presentation), /sol/i);
    assert.equal("previous_response_id" in presentation, false);
  });
});

describe("staged Terra research contract", () => {
  it("accepts an exact, source-owned, requirement-complete lead set", () => {
    const fixture = researchFixture();
    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.candidates.length, 8);
    assert.deepEqual(
      result.value.candidates[0].requirementLeads.map(
        (lead) => lead.requirementId,
      ),
      requirementIds,
    );
  });

  it("rejects invented URLs, reordered requirements, and malformed not-found leads", () => {
    for (const mutate of [
      (fixture) => {
        fixture.value.candidates[0].source_urls[0] =
          "https://invented.example/product";
      },
      (fixture) => {
        fixture.responseSourceUrls[0] = "https://manufacturer1.example";
        fixture.value.candidates[0].source_urls[0] =
          "https://manufacturer1.example/";
      },
      (fixture) => {
        fixture.value.candidates[0].requirement_leads.reverse();
      },
      (fixture) => {
        fixture.value.candidates[0].requirement_leads[0].status =
          "not_found";
      },
    ]) {
      const fixture = researchFixture();
      mutate(fixture);
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        { ok: false, reason: "research_candidate_invalid" },
      );
    }
  });

  it("rejects duplicate identities and candidate-id/order drift", () => {
    const duplicate = researchFixture();
    duplicate.value.candidates[1].brand =
      duplicate.value.candidates[0].brand;
    duplicate.value.candidates[1].model = "M 100";
    assert.deepEqual(
      validateStagedTerraResearchOutput({
        value: duplicate.value,
        shopperRequest: shopper,
        responseSourceUrls: duplicate.responseSourceUrls,
      }),
      { ok: false, reason: "research_candidate_duplicate" },
    );

    const reordered = researchFixture();
    [
      reordered.value.candidates[0],
      reordered.value.candidates[1],
    ] = [
      reordered.value.candidates[1],
      reordered.value.candidates[0],
    ];
    assert.deepEqual(
      validateStagedTerraResearchOutput({
        value: reordered.value,
        shopperRequest: shopper,
        responseSourceUrls: reordered.responseSourceUrls,
      }),
      { ok: false, reason: "research_candidate_invalid" },
    );
  });
});

describe("staged Terra verified-evidence boundary", () => {
  it("accepts exact research identities and server-owned evidence", () => {
    const fixture = evidencePackageFixture();
    const result = validateStagedTerraEvidencePackage({
      value: fixture.value,
      shopperRequest: shopper,
      researchOutput: fixture.researchOutput,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.candidates[0].eligibility, "eligible");
    assert.equal(result.value.candidates[1].eligibility, "close_match");
    assert.equal(result.value.candidates[0].assets.productUrlEvidenceId, "e3");
  });

  it("rejects an eligible candidate with an unverified hard requirement", () => {
    const fixture = evidencePackageFixture();
    fixture.value.candidates[0].requirement_verdicts[1] = {
      requirement_id: "budget",
      verdict: "not_verified",
      evidence_ids: [],
    };
    assert.deepEqual(
      validateStagedTerraEvidencePackage({
        value: fixture.value,
        shopperRequest: shopper,
        researchOutput: fixture.researchOutput,
      }),
      { ok: false, reason: "verified_candidate_invalid" },
    );
  });

  it("does not mislabel subjective performance or owner feedback as verified", () => {
    const fixture = evidencePackageFixture();
    fixture.value.candidates[0].facts[1].verification = "verified";
    assert.deepEqual(
      validateStagedTerraEvidencePackage({
        value: fixture.value,
        shopperRequest: shopper,
        researchOutput: fixture.researchOutput,
      }),
      { ok: false, reason: "verified_candidate_invalid" },
    );
  });

  it("rejects identity drift and unbound product assets", () => {
    for (const mutate of [
      (fixture) => {
        fixture.value.candidates[0].model = "M101";
      },
      (fixture) => {
        fixture.value.candidates[0].assets.product_url =
          "https://retailer.example/products/sibling";
      },
      (fixture) => {
        fixture.value.candidates[0].assets.image_url_evidence_id = "e3";
      },
    ]) {
      const fixture = evidencePackageFixture();
      mutate(fixture);
      assert.deepEqual(
        validateStagedTerraEvidencePackage({
          value: fixture.value,
          shopperRequest: shopper,
          researchOutput: fixture.researchOutput,
        }),
        { ok: false, reason: "verified_candidate_invalid" },
      );
    }

    const unsafeEvidence = evidencePackageFixture();
    unsafeEvidence.value.evidence[0].url =
      "https://user:password@manufacturer1.example/products/model-1";
    assert.deepEqual(
      validateStagedTerraEvidencePackage({
        value: unsafeEvidence.value,
        shopperRequest: shopper,
        researchOutput: unsafeEvidence.researchOutput,
      }),
      { ok: false, reason: "evidence_entry_invalid" },
    );
  });

  it("requires every research candidate in order and forbids borrowed evidence", () => {
    for (const mutate of [
      (fixture) => {
        fixture.value.candidates.pop();
      },
      (fixture) => {
        [fixture.value.candidates[0], fixture.value.candidates[1]] = [
          fixture.value.candidates[1],
          fixture.value.candidates[0],
        ];
      },
      (fixture) => {
        fixture.value.candidates[0].facts[0].evidence_ids = ["e5"];
      },
      (fixture) => {
        fixture.value.candidates[0].assets.product_url =
          fixture.value.evidence[2].url;
        fixture.value.candidates[0].assets.product_url_evidence_id = "e3";
        fixture.value.evidence[2].candidate_id = "candidate_2";
      },
    ]) {
      const fixture = evidencePackageFixture();
      mutate(fixture);
      assert.equal(
        validateStagedTerraEvidencePackage({
          value: fixture.value,
          shopperRequest: shopper,
          researchOutput: fixture.researchOutput,
        }).ok,
        false,
      );
    }
  });
});

describe("staged Terra evidence-bounded presentation", () => {
  it("accepts contiguous ranking whose claims bind to eligible-candidate facts", () => {
    const result = validateStagedTerraPresentationOutput({
      value: presentationFixture(),
      evidencePackage: parsedEvidencePackage(),
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.rankedProducts[0].candidateId, "candidate_1");
    assert.deepEqual(result.value.closeMatchCandidateIds, ["candidate_2"]);
  });

  it("rejects ranking a close match, invented facts, URLs, and product renaming", () => {
    for (const mutate of [
      (value) => {
        value.ranked_products[0].candidate_id = "candidate_2";
        value.ranked_products[0].product_name = "Brand 2 Model 2";
      },
      (value) => {
        value.ranked_products[0].why_ranked.fact_ids = ["invented"];
      },
      (value) => {
        value.ranked_products[0].why_ranked.text =
          "See https://invented.example for proof.";
      },
      (value) => {
        value.ranked_products[0].product_name = "Renamed winner";
      },
    ]) {
      const value = presentationFixture();
      mutate(value);
      assert.equal(
        validateStagedTerraPresentationOutput({
          value,
          evidencePackage: parsedEvidencePackage(),
        }).ok,
        false,
      );
    }
  });

  it("rejects requirement evidence borrowed from another candidate", () => {
    const value = presentationFixture();
    value.ranked_products[0].requirement_explanations[0].evidence_ids = [
      "e5",
    ];
    assert.deepEqual(
      validateStagedTerraPresentationOutput({
        value,
        evidencePackage: parsedEvidencePackage(),
      }),
      { ok: false, reason: "presentation_requirement_invalid" },
    );
  });
});

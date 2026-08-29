import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  buildStagedTerraRequestFingerprint,
  isStagedTerraResearchCandidateSourceValidationReason,
  isStagedTerraResearchCandidateValidationReason,
  isStagedTerraResearchValidationReason,
  STAGED_TERRA_CONTRACT_VERSION,
  STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
  STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
  STAGED_TERRA_RESEARCH_CANDIDATE_VALIDATION_REASONS,
  STAGED_TERRA_RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS,
  STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
  STAGED_TERRA_RESEARCH_VALIDATION_REASONS,
  validateStagedTerraEvidencePackage,
  validateStagedTerraPresentationOutput,
  validateStagedTerraResearchIdentitySources,
  validateStagedTerraResearchOutput,
} from "../lib/stagedTerraContract.ts";
import {
  buildStagedTerraPresentationRequest,
  buildStagedTerraResearchRequest,
  STAGED_TERRA_MODEL,
  STAGED_TERRA_RESEARCH_PROMPT_VERSION,
  STAGED_TERRA_SCHEMA_VERSIONS,
} from "../lib/stagedTerraPrompt.ts";
import {
  STAGED_TERRA_RUNTIME_LIMITS,
  STAGED_TERRA_RUNTIME_VERSION,
} from "../lib/stagedTerraRuntime.ts";
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
  const responseSources = [];
  const candidates = Array.from({ length: 8 }, (_, candidateIndex) => {
    const number = candidateIndex + 1;
    const sourceUrls = [
      `https://manufacturer${number}.example/products/model-${number}`,
      `https://testing.example/reviews/model-${number}`,
    ];
    responseSourceUrls.push(...sourceUrls);
    responseSources.push(
      {
        url: sourceUrls[0],
        title: `Brand ${number} M${number}00 Cordless Vacuum`,
      },
      {
        url: sourceUrls[1],
        title: `Brand ${number} M${number}00 Cordless Vacuum independent test`,
      },
    );
    return {
      brand: `Brand ${number}`,
      model: `M${number}00`,
      product_type: "cordless vacuum",
      source_urls: sourceUrls,
      requirement_leads: requirementIds.map((requirementId) => ({
        requirement_id: requirementId,
        status: "supporting_evidence",
        summary: `Source evidence for ${requirementId}`,
        source_indexes: [0],
      })),
      fact_leads: [
        {
          kind: "identity",
          statement: "The manufacturer identifies the exact model.",
          source_indexes: [0],
        },
        {
          kind: "performance",
          statement: "The testing source reported strong pickup.",
          source_indexes: [1],
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
    responseSources,
  };
}

function localReferenceResearchFixture() {
  return researchFixture();
}

function legacyLeadUrlResearchFixture(group) {
  const fixture = localReferenceResearchFixture();
  for (const candidate of fixture.value.candidates) {
    const leads =
      group === "requirements"
        ? candidate.requirement_leads
        : candidate.fact_leads;
    for (const lead of leads) {
      lead.source_urls = lead.source_indexes.map(
        (index) => candidate.source_urls[index],
      );
      delete lead.source_indexes;
    }
  }
  return fixture;
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
          title: "Brand 1 M100 cordless vacuum",
          source_type: "manufacturer",
        },
        {
          evidence_id: "e2",
          candidate_id: "candidate_1",
          kind: "claim",
          url: "https://testing.example/reviews/model-1",
          host: "testing.example",
          title: "Independent test of M100 cordless vacuum",
          source_type: "independent_testing",
        },
        {
          evidence_id: "e3",
          candidate_id: "candidate_1",
          kind: "product_page",
          url: "https://retailer.example/products/brand-1-model-1",
          host: "retailer.example",
          title: "Brand 1 M100 cordless vacuum",
          source_type: "retailer",
        },
        {
          evidence_id: "e4",
          candidate_id: "candidate_1",
          kind: "image",
          url: "https://images.retailer.example/brand-1-model-1.webp",
          host: "images.retailer.example",
          title: "Brand 1 M100 cordless vacuum product image",
          source_type: "retailer",
        },
        {
          evidence_id: "e5",
          candidate_id: "candidate_2",
          kind: "claim",
          url: "https://manufacturer2.example/products/model-2",
          host: "manufacturer2.example",
          title: "Brand 2 M200 cordless vacuum",
          source_type: "manufacturer",
        },
      ],
      candidates: [
        {
          candidate_id: "candidate_1",
          product_name: "Brand 1 M100 cordless vacuum",
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
          product_name: "Brand 2 M200 cordless vacuum",
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
            product_name: `Brand ${candidateNumber} M${candidateNumber}00 cordless vacuum`,
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
        product_name: "Brand 1 M100 cordless vacuum",
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
    const researchCandidateSchema =
      research.text.format.schema.properties.candidates.items;
    const maximumCandidates =
      research.text.format.schema.properties.candidates.maxItems;
    assert.equal(maximumCandidates, 15);
    assert.equal(researchCandidateSchema.properties.source_urls.minItems, 2);
    assert.equal(researchCandidateSchema.properties.source_urls.maxItems, 2);
    assert.equal(
      researchCandidateSchema.properties.source_urls.maxItems,
      STAGED_TERRA_RUNTIME_LIMITS.maximumSourcesPerCandidate,
    );
    assert.equal(STAGED_TERRA_RUNTIME_LIMITS.maximumSourceFetches, 30);
    assert.equal(
      maximumCandidates *
        researchCandidateSchema.properties.source_urls.maxItems,
      STAGED_TERRA_RUNTIME_LIMITS.maximumSourceFetches,
    );
    assert.equal(
      "candidate_id" in researchCandidateSchema.properties,
      false,
    );
    assert.equal(
      researchCandidateSchema.required.includes("candidate_id"),
      false,
    );
    assert.equal("product_name" in researchCandidateSchema.properties, false);
    assert.equal(
      researchCandidateSchema.required.includes("product_name"),
      false,
    );
    for (const property of ["brand", "model", "product_type"]) {
      assert.equal(researchCandidateSchema.properties[property].pattern, "\\S");
    }
    assert.deepEqual(
      ["brand", "model", "product_type"].map(
        (property) => researchCandidateSchema.properties[property].maxLength,
      ),
      [100, 120, 78],
    );
    assert.equal(
      ["brand", "model", "product_type"].reduce(
        (length, property) =>
          length + researchCandidateSchema.properties[property].maxLength,
        2,
      ),
      300,
    );
    const requirementLeadVariants =
      researchCandidateSchema.properties.requirement_leads.items.anyOf;
    assert.equal(requirementLeadVariants.length, 3);
    assert.deepEqual(
      requirementLeadVariants.map((variant) => ({
        status: variant.properties.status.const,
        minItems: variant.properties.source_indexes.minItems,
        maxItems: variant.properties.source_indexes.maxItems,
      })),
      [
        { status: "supporting_evidence", minItems: 1, maxItems: 2 },
        { status: "conflicting_evidence", minItems: 1, maxItems: 2 },
        { status: "not_found", minItems: 0, maxItems: 0 },
      ],
    );
    for (const variant of requirementLeadVariants) {
      assert.equal(variant.type, "object");
      assert.equal(variant.additionalProperties, false);
      assert.equal(variant.properties.summary.pattern, "\\S");
      assert.equal("source_urls" in variant.properties, false);
      assert.deepEqual(variant.properties.source_indexes.items, {
        type: "integer",
        minimum: 0,
        maximum: 1,
      });
      assert.deepEqual(variant.required, [
        "requirement_id",
        "status",
        "summary",
        "source_indexes",
      ]);
    }
    assert.equal(
      "fact_id" in
        researchCandidateSchema.properties.fact_leads.items.properties,
      false,
    );
    assert.equal(
      researchCandidateSchema.properties.fact_leads.items.required.includes(
        "fact_id",
      ),
      false,
    );
    assert.equal(
      researchCandidateSchema.properties.fact_leads.items.properties.statement
        .pattern,
      "\\S",
    );
    const factSourceIndexes =
      researchCandidateSchema.properties.fact_leads.items.properties
        .source_indexes;
    assert.equal(
      "source_urls" in
        researchCandidateSchema.properties.fact_leads.items.properties,
      false,
    );
    assert.equal(factSourceIndexes.minItems, 1);
    assert.equal(factSourceIndexes.maxItems, 2);
    assert.equal(factSourceIndexes.items.maximum, 1);
    assert.match(research.instructions, /assigns internal candidate and fact IDs/i);
    assert.match(research.instructions, /do not emit synthetic identifiers/i);
    assert.match(
      research.instructions,
      /do not emit product_name.{0,240}(?:constructs|derives).{0,240}brand.{0,120}model.{0,160}product[_ -]?type/is,
    );
    assert.match(
      research.instructions,
      /zero-based.{0,160}source_indexes.{0,200}enclosing candidate/is,
    );
    assert.match(research.instructions, /do not repeat.{0,120}(?:index|reference)/is);
    assert.match(
      research.instructions,
      /supporting.{0,160}conflicting.{0,160}at least one.{0,160}not_found.{0,160}(?:empty|no source)/is,
    );
    assert.match(
      research.instructions,
      /exactly two.{0,80}source_urls/is,
    );
    assert.match(
      research.instructions,
      /tracking-only or fragment-only variants.{0,100}do not count as distinct/is,
    );
    assert.match(
      research.instructions,
      /exact title.{0,80}exact URL.{0,160}(?:together|considered)/is,
    );
    assert.match(
      research.instructions,
      /manufacturer.{0,120}retailer.{0,180}(?:URL|url) slug/is,
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
      research: "staged-terra-research-v5",
      evidence: "staged-terra-evidence-v1",
      presentation: "staged-terra-presentation-v1",
    });
  });

  it("rolls the research acceptance contract identity", () => {
    assert.equal(STAGED_TERRA_CONTRACT_VERSION, "staged-terra-contract-v8");
  });

  it("rolls the research prompt identity", () => {
    assert.equal(
      STAGED_TERRA_RESEARCH_PROMPT_VERSION,
      "staged-terra-research-prompt-v6",
    );
  });

  it("rolls the staged runtime identity", () => {
    assert.equal(STAGED_TERRA_RUNTIME_VERSION, "staged-terra-runtime-v7");
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
  it("accepts candidate-local source references and maps them to exact owned URLs", () => {
    const fixture = localReferenceResearchFixture();
    fixture.responseSourceUrls.reverse();
    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(
      result.ok && result.value.candidates[0].requirementLeads[0].sourceUrls,
      [fixture.value.candidates[0].source_urls[0]],
    );
    assert.deepEqual(
      result.ok && result.value.candidates[0].factLeads[1].sourceUrls,
      [fixture.value.candidates[0].source_urls[1]],
    );
    assert.deepEqual(
      result.ok && result.value.candidates[3].requirementLeads[0].sourceUrls,
      [fixture.value.candidates[3].source_urls[0]],
    );
    assert.deepEqual(
      result.ok && result.value.candidates[3].factLeads[1].sourceUrls,
      [fixture.value.candidates[3].source_urls[1]],
    );
  });

  it("requires candidate-owned response metadata to prove the exact asset identity", () => {
    const fixture = researchFixture();
    const parsed = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });
    assert.equal(parsed.ok, true);
    const accepted = validateStagedTerraResearchIdentitySources({
      researchOutput: parsed.value,
      responseSources: fixture.responseSources,
    });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.ok && accepted.value.candidates.length, 8);
    assert.deepEqual(accepted.identitySourceFilter, {
      submittedCandidates: 8,
      acceptedCandidates: 8,
      rejectedCandidates: 0,
      rejectionCandidateCounts: {
        missingTitle: 0,
        brandNotInTitle: 0,
        modelNotInTitle: 0,
        modelConflictInTitle: 0,
        wrongProductType: 0,
      },
    });

    const ungrounded = structuredClone(fixture.responseSources);
    const rejectedUrls = [...parsed.value.candidates[0].sourceUrls];
    for (const source of ungrounded.slice(0, 2)) {
      source.title = "Brand 1 cordless vacuum buying guide";
    }
    const rejected = validateStagedTerraResearchIdentitySources({
      researchOutput: parsed.value,
      responseSources: ungrounded,
    });
    assert.equal(rejected.ok, true);
    assert.equal(rejected.ok && rejected.value.candidates.length, 7);
    assert.deepEqual(rejected.identitySourceFilter, {
      submittedCandidates: 8,
      acceptedCandidates: 7,
      rejectedCandidates: 1,
      rejectionCandidateCounts: {
        missingTitle: 0,
        brandNotInTitle: 0,
        modelNotInTitle: 1,
        modelConflictInTitle: 0,
        wrongProductType: 0,
      },
    });
    for (const rejectedUrl of rejectedUrls) {
      assert.equal(JSON.stringify(rejected).includes(rejectedUrl), false);
    }
  });

  it("attributes every reachable identity-source rejection without exposing source material", () => {
    const cases = [
      {
        key: "missingTitle",
        mutate(source) {
          delete source.title;
        },
      },
      {
        key: "brandNotInTitle",
        title: "M100 Cordless Vacuum",
      },
      {
        key: "modelNotInTitle",
        title: "Brand 1 Cordless Vacuum",
      },
      {
        key: "modelConflictInTitle",
        title: "Brand 1 M100 M900 Cordless Vacuum",
      },
      {
        key: "wrongProductType",
        candidate: {
          brand: "DEWALT",
          model: "DXV12P-QT",
          product_type: "wet/dry vacuum",
        },
        title: "DEWALT DXV12P-QT wet/dry vacuum filter replacement",
      },
    ];

    for (const testCase of cases) {
      const fixture = researchFixture();
      if (testCase.candidate) {
        Object.assign(fixture.value.candidates[0], testCase.candidate);
      }
      const parsed = validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      });
      assert.equal(parsed.ok, true);
      const rejectedUrls = [...parsed.value.candidates[0].sourceUrls];
      const responseSources = structuredClone(fixture.responseSources);
      for (const source of responseSources.slice(0, 2)) {
        if (testCase.mutate) testCase.mutate(source);
        else source.title = testCase.title;
      }

      const filtered = validateStagedTerraResearchIdentitySources({
        researchOutput: parsed.value,
        responseSources,
      });

      assert.equal(filtered.ok, true, testCase.key);
      assert.equal(
        filtered.ok && filtered.value.candidates.length,
        7,
        testCase.key,
      );
      assert.deepEqual(filtered.identitySourceFilter, {
        submittedCandidates: 8,
        acceptedCandidates: 7,
        rejectedCandidates: 1,
        rejectionCandidateCounts: {
          missingTitle: testCase.key === "missingTitle" ? 1 : 0,
          brandNotInTitle: testCase.key === "brandNotInTitle" ? 1 : 0,
          modelNotInTitle: testCase.key === "modelNotInTitle" ? 1 : 0,
          modelConflictInTitle:
            testCase.key === "modelConflictInTitle" ? 1 : 0,
          wrongProductType: testCase.key === "wrongProductType" ? 1 : 0,
        },
      }, testCase.key);
      for (const rejectedUrl of rejectedUrls) {
        assert.equal(JSON.stringify(filtered).includes(rejectedUrl), false);
      }
      if (testCase.title) {
        assert.equal(JSON.stringify(filtered).includes(testCase.title), false);
      }
    }
  });

  it("fails closed if a typed caller violates the validated target invariant", () => {
    const fixture = researchFixture();
    const parsed = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });
    assert.equal(parsed.ok, true);
    parsed.value.candidates[0].productName =
      "Brand 1 M900 Cordless Vacuum";

    assert.throws(
      () =>
        validateStagedTerraResearchIdentitySources({
          researchOutput: parsed.value,
          responseSources: fixture.responseSources,
        }),
      /staged_terra_identity_source_filter_inconsistent/,
    );
  });

  it("intentionally accepts the shared safe retailer-slug identity path", () => {
    const fixture = researchFixture();
    const productUrl =
      "https://www.homedepot.com/p/DEWALT-12-Gal-5-5-HP-Poly-Wet-Dry-Vacuum-with-Hose-and-Accessories-DXV12P/305323712";
    const evidenceUrl = "https://testing.example/reviews/wet-dry-vacuums";
    Object.assign(fixture.value.candidates[0], {
      brand: "DEWALT",
      model: "DXV12P-QT",
      product_type: "wet/dry vacuum",
      source_urls: [productUrl, evidenceUrl],
    });
    fixture.responseSourceUrls.splice(0, 2, productUrl, evidenceUrl);
    fixture.responseSources.splice(
      0,
      2,
      {
        url: productUrl,
        title: "DEWALT 12 Gal. 5.5 HP Poly Wet/Dry Vacuum - The Home Depot",
      },
      {
        url: evidenceUrl,
        title: "Independent wet/dry vacuum comparison",
      },
    );

    const parsed = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });
    assert.equal(parsed.ok, true);
    const accepted = validateStagedTerraResearchIdentitySources({
      researchOutput: parsed.value,
      responseSources: fixture.responseSources,
    });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.identitySourceFilter.rejectedCandidates, 0);
  });

  it("does not extend source identity to sibling slugs or unknown retailers", () => {
    for (const source of [
      {
        url: "https://www.homedepot.com/p/DEWALT-10-Gal-Vacuum-DXV10P/305300000",
        title: "DEWALT 10 Gal. Wet/Dry Vacuum - The Home Depot",
      },
      {
        url: "https://random-store.example/item/dxv12p",
        title: "DEWALT 12 Gallon Wet/Dry Vacuum",
      },
    ]) {
      const fixture = researchFixture();
      const evidenceUrl = "https://testing.example/reviews/wet-dry-vacuums";
      Object.assign(fixture.value.candidates[0], {
        brand: "DEWALT",
        model: "DXV12P-QT",
        product_type: "wet/dry vacuum",
        source_urls: [source.url, evidenceUrl],
      });
      fixture.responseSourceUrls.splice(0, 2, source.url, evidenceUrl);
      fixture.responseSources.splice(
        0,
        2,
        source,
        {
          url: evidenceUrl,
          title: "Independent wet/dry vacuum comparison",
        },
      );

      const parsed = validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      });
      assert.equal(parsed.ok, true);
      const filtered = validateStagedTerraResearchIdentitySources({
        researchOutput: parsed.value,
        responseSources: fixture.responseSources,
      });
      assert.equal(filtered.ok, true, source.url);
      assert.equal(filtered.ok && filtered.value.candidates.length, 7, source.url);
      assert.equal(filtered.identitySourceFilter.rejectedCandidates, 1, source.url);
      assert.equal(JSON.stringify(filtered).includes(source.url), false, source.url);
    }
  });

  it("accepts an empty candidate-local reference list only for not-found requirements", () => {
    const fixture = localReferenceResearchFixture();
    const lead = fixture.value.candidates[0].requirement_leads[0];
    lead.status = "not_found";
    lead.summary = "No candidate-local source established this requirement.";
    lead.source_indexes = [];

    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(
      result.ok && result.value.candidates[0].requirementLeads[0].sourceUrls,
      [],
    );
  });

  it("rejects both legacy repeated lead-URL wire shapes", () => {
    for (const [group, candidateValidationReason] of [
      ["requirements", "candidate_requirements"],
      ["facts", "candidate_facts"],
    ]) {
      const fixture = legacyLeadUrlResearchFixture(group);
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason,
        },
        group,
      );
    }
  });

  it("rejects invalid candidate-local requirement references", () => {
    const cases = [
      {
        name: "out of range",
        mutate: (candidate) => {
          candidate.requirement_leads[0].source_indexes = [2];
        },
      },
      {
        name: "duplicate",
        mutate: (candidate) => {
          candidate.requirement_leads[0].source_indexes = [0, 0];
        },
      },
      {
        name: "non-integer",
        mutate: (candidate) => {
          candidate.requirement_leads[0].source_indexes = [0.5];
        },
      },
      {
        name: "empty supporting",
        mutate: (candidate) => {
          candidate.requirement_leads[0].source_indexes = [];
        },
      },
      {
        name: "empty conflicting",
        mutate: (candidate) => {
          candidate.requirement_leads[0].status = "conflicting_evidence";
          candidate.requirement_leads[0].source_indexes = [];
        },
      },
      {
        name: "nonempty not-found",
        mutate: (candidate) => {
          candidate.requirement_leads[0].status = "not_found";
        },
      },
    ];

    for (const testCase of cases) {
      const fixture = localReferenceResearchFixture();
      testCase.mutate(fixture.value.candidates[0]);
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason: "candidate_requirements",
        },
        testCase.name,
      );
    }
  });

  it("rejects invalid candidate-local fact references", () => {
    const cases = [
      {
        name: "out of range",
        sourceIndexes: [2],
      },
      {
        name: "duplicate",
        sourceIndexes: [0, 0],
      },
      {
        name: "non-integer",
        sourceIndexes: [0.5],
      },
      {
        name: "empty",
        sourceIndexes: [],
      },
    ];

    for (const testCase of cases) {
      const fixture = localReferenceResearchFixture();
      fixture.value.candidates[0].fact_leads[0].source_indexes =
        testCase.sourceIndexes;
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason: "candidate_facts",
        },
        testCase.name,
      );
    }
  });

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

  it("constructs a bounded canonical product name from normalized atomic identity fields", () => {
    const fixture = researchFixture();
    Object.assign(fixture.value.candidates[0], {
      brand: "  DEWALT  ",
      model: "  DXV12P-QT ",
      product_type: " shop   vac ",
    });

    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(
      {
        productName: result.value.candidates[0].productName,
        brand: result.value.candidates[0].brand,
        model: result.value.candidates[0].model,
        productType: result.value.candidates[0].productType,
      },
      {
        productName: "DEWALT DXV12P-QT shop vac",
        brand: "DEWALT",
        model: "DXV12P-QT",
        productType: "shop vac",
      },
    );
  });

  it("accepts the exact 300-character canonical identity allocation", () => {
    const fixture = researchFixture();
    Object.assign(fixture.value.candidates[0], {
      brand: "B".repeat(100),
      model: `M1${"x".repeat(118)}`,
      product_type: `shop vacuum ${"t".repeat(66)}`,
    });

    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });

    assert.equal(result.ok, true);
    assert.equal(result.value.candidates[0].productName.length, 300);
  });

  it("assigns synthetic IDs server-side and canonicalizes requirement order", () => {
    const fixture = researchFixture();
    for (const candidate of fixture.value.candidates) {
      candidate.requirement_leads.reverse();
    }

    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.candidates[0].candidateId, "candidate_1");
    assert.equal(result.value.candidates[0].factLeads[0].factId, "candidate_1_fact_1");
    assert.deepEqual(
      result.value.candidates[0].requirementLeads.map(
        (lead) => lead.requirementId,
      ),
      requirementIds,
    );
  });

  it("rejects an unexpected model-authored composite product name", () => {
    const fixture = researchFixture();
    fixture.value.candidates[0].product_name = "Brand 1 M999 robot vacuum";

    assert.deepEqual(
      validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      }),
      {
        ok: false,
        reason: "research_candidate_invalid",
        candidateValidationReason: "candidate_identity",
      },
    );
  });

  for (const testCase of [
    { field: "brand", value: "B".repeat(101) },
    { field: "model", value: "M".repeat(121) },
    { field: "product_type", value: "T".repeat(79) },
  ]) {
    it(`rejects an overlong atomic ${testCase.field} before downstream verification`, () => {
      const fixture = researchFixture();
      fixture.value.candidates[0][testCase.field] = testCase.value;

      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason: "candidate_identity",
        },
      );
    });
  }

  it("constructs a canonical identity without losing a numeric model trim", () => {
    const fixture = researchFixture();
    Object.assign(fixture.value.candidates[0], {
      brand: "DEWALT",
      model: "DXV12P-QT",
      product_type: "shop vac",
    });

    assert.equal(
      validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      }).ok,
      true,
    );
  });

  it("attributes invalid candidates to one bounded field group", () => {
    const cases = [
      {
        candidateValidationReason: "candidate_identity",
        mutate: (fixture) => {
          fixture.value.candidates[0].brand = " ";
        },
      },
      {
        candidateValidationReason: "candidate_sources",
        candidateSourceValidationReason: "candidate_source_unregistered",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls[0] =
            "https://invented.example/product";
        },
      },
      {
        candidateValidationReason: "candidate_requirements",
        mutate: (fixture) => {
          fixture.value.candidates[0].requirement_leads[1].requirement_id =
            fixture.value.candidates[0].requirement_leads[0].requirement_id;
        },
      },
      {
        candidateValidationReason: "candidate_facts",
        mutate: (fixture) => {
          fixture.value.candidates[0].fact_leads[0].statement = " ";
        },
      },
    ];
    for (const testCase of cases) {
      const fixture = researchFixture();
      testCase.mutate(fixture);
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason: testCase.candidateValidationReason,
          ...(testCase.candidateSourceValidationReason
            ? {
                candidateSourceValidationReason:
                  testCase.candidateSourceValidationReason,
              }
            : {}),
        },
      );
    }
  });

  it("rejects invented URLs and malformed not-found leads", () => {
    for (const testCase of [
      {
        candidateValidationReason: "candidate_sources",
        candidateSourceValidationReason: "candidate_source_unregistered",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls[0] =
            "https://invented.example/product";
        },
      },
      {
        candidateValidationReason: "candidate_sources",
        candidateSourceValidationReason: "candidate_source_unregistered",
        mutate: (fixture) => {
          fixture.responseSourceUrls[0] = "https://manufacturer1.example";
          fixture.value.candidates[0].source_urls[0] =
            "https://manufacturer1.example/";
        },
      },
      {
        candidateValidationReason: "candidate_requirements",
        mutate: (fixture) => {
          fixture.value.candidates[0].requirement_leads[0].status =
            "not_found";
        },
      },
    ]) {
      const fixture = researchFixture();
      testCase.mutate(fixture);
      assert.deepEqual(
        validateStagedTerraResearchOutput({
          value: fixture.value,
          shopperRequest: shopper,
          responseSourceUrls: fixture.responseSourceUrls,
        }),
        {
          ok: false,
          reason: "research_candidate_invalid",
          candidateValidationReason: testCase.candidateValidationReason,
          ...(testCase.candidateSourceValidationReason
            ? {
                candidateSourceValidationReason:
                  testCase.candidateSourceValidationReason,
              }
            : {}),
        },
      );
    }
  });

  it("attributes candidate source failures without retaining a URL", () => {
    const cases = [
      {
        expected: "candidate_source_shape",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls = [];
        },
      },
      {
        expected: "candidate_source_shape",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls.pop();
        },
      },
      {
        expected: "candidate_source_shape",
        mutate: (fixture) => {
          const third = "https://third.example/products/model-1";
          fixture.responseSourceUrls.push(third);
          fixture.value.candidates[0].source_urls.push(third);
        },
      },
      {
        expected: "candidate_source_duplicate",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls[1] =
            fixture.value.candidates[0].source_urls[0];
        },
      },
      {
        expected: "candidate_source_duplicate",
        mutate: (fixture) => {
          const base = fixture.value.candidates[0].source_urls[0];
          const tracked = `${base}?utm_source=hosted`;
          fixture.responseSourceUrls.push(tracked);
          fixture.value.candidates[0].source_urls = [tracked, base];
        },
      },
      {
        expected: "candidate_source_duplicate",
        mutate: (fixture) => {
          const base = fixture.value.candidates[0].source_urls[0];
          const overview = `${base}#overview`;
          const specifications = `${base}#specifications`;
          fixture.responseSourceUrls.push(overview, specifications);
          fixture.value.candidates[0].source_urls = [
            overview,
            specifications,
          ];
        },
      },
      {
        expected: "candidate_source_unsafe",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls[0] =
            "http://manufacturer1.example/product";
        },
      },
      {
        expected: "candidate_source_unregistered",
        mutate: (fixture) => {
          fixture.value.candidates[0].source_urls[0] =
            "https://invented.example/product";
        },
      },
    ];

    for (const testCase of cases) {
      const fixture = researchFixture();
      testCase.mutate(fixture);
      const result = validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      });
      assert.deepEqual(result, {
        ok: false,
        reason: "research_candidate_invalid",
        candidateValidationReason: "candidate_sources",
        candidateSourceValidationReason: testCase.expected,
      });
      assert.equal(JSON.stringify(result).includes("https://"), false);
    }
  });

  it("preserves identity-bearing query variants as distinct exact sources", () => {
    const fixture = researchFixture();
    const base = fixture.value.candidates[0].source_urls[0];
    const urls = [`${base}?sku=M100`, `${base}?sku=M100-US`];
    fixture.responseSourceUrls.push(...urls);
    fixture.value.candidates[0].source_urls = urls;

    const result = validateStagedTerraResearchOutput({
      value: fixture.value,
      shopperRequest: shopper,
      responseSourceUrls: fixture.responseSourceUrls,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.value.candidates[0].sourceUrls, urls);
  });

  it("rejects duplicate identities", () => {
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
  });

  it("distinguishes every bounded research validation class", () => {
    const cases = [
      {
        reason: "research_shape",
        mutate: (fixture) => fixture.value.candidates.pop(),
      },
      {
        reason: "research_source_registry",
        mutate: (fixture) => fixture.responseSourceUrls.push("not-an-https-url"),
      },
      {
        reason: "research_candidate_invalid",
        mutate: (fixture) => {
          fixture.value.candidates[0].brand = " ";
        },
      },
      {
        reason: "research_candidate_duplicate",
        mutate: (fixture) => {
          fixture.value.candidates[1].brand = fixture.value.candidates[0].brand;
          fixture.value.candidates[1].model = fixture.value.candidates[0].model;
        },
      },
    ];
    const observed = [];
    for (const testCase of cases) {
      const fixture = researchFixture();
      testCase.mutate(fixture);
      const result = validateStagedTerraResearchOutput({
        value: fixture.value,
        shopperRequest: shopper,
        responseSourceUrls: fixture.responseSourceUrls,
      });
      assert.equal(result.ok, false);
      assert.equal(result.reason, testCase.reason);
      assert.equal(isStagedTerraResearchValidationReason(result.reason), true);
      observed.push(result.reason);
    }
    assert.deepEqual(observed, [...STAGED_TERRA_RESEARCH_VALIDATION_REASONS]);
    assert.equal(isStagedTerraResearchValidationReason("raw_model_output"), false);
    assert.equal(isStagedTerraResearchValidationReason({}), false);
    assert.deepEqual(STAGED_TERRA_RESEARCH_CANDIDATE_VALIDATION_REASONS, [
      "candidate_identity",
      "candidate_sources",
      "candidate_requirements",
      "candidate_facts",
    ]);
    assert.deepEqual(
      STAGED_TERRA_RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS,
      [
        "candidate_source_shape",
        "candidate_source_duplicate",
        "candidate_source_unsafe",
        "candidate_source_unregistered",
        "candidate_source_identity_unproven",
      ],
    );
    assert.equal(
      isStagedTerraResearchCandidateValidationReason("candidate_sources"),
      true,
    );
    assert.equal(
      isStagedTerraResearchCandidateSourceValidationReason(
        "candidate_source_unregistered",
      ),
      true,
    );
    assert.equal(
      isStagedTerraResearchCandidateSourceValidationReason(
        "private_source_reason",
      ),
      false,
    );
    assert.equal(
      isStagedTerraResearchCandidateValidationReason("private_candidate_field"),
      false,
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
        value.ranked_products[0].product_name =
          "Brand 2 M200 cordless vacuum";
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

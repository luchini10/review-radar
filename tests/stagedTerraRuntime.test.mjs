import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectStagedTerraVerificationInputs,
  pollStagedTerraResearch,
  runStagedTerraPresentation,
  startStagedTerraResearch,
} from "../lib/stagedTerraRuntime.ts";
import {
  buildStagedTerraRequestFingerprint,
  STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
  STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
} from "../lib/stagedTerraContract.ts";

const shopper = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "battery powered",
};

function researchValue() {
  return {
    schema_version: STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
    candidates: Array.from({ length: 8 }, (_, index) => {
      const number = index + 1;
      const sourceUrls = [
        `https://store${number}.example/products/v${number}00`,
        `https://testing.example/reviews/v${number}00`,
      ];
      return {
        brand: "Example Brand",
        model: `V${number}00`,
        product_type: "cordless vacuum",
        source_urls: sourceUrls,
        requirement_leads: [
          {
            requirement_id: "market_us",
            status: "supporting_evidence",
            summary: "In stock",
            source_indexes: [0],
          },
          {
            requirement_id: "budget",
            status: "supporting_evidence",
            summary: "Price is $399",
            source_indexes: [0],
          },
          {
            requirement_id: "important_details",
            status: "supporting_evidence",
            summary: "Battery powered",
            source_indexes: [0],
          },
        ],
        fact_leads: [
          {
            kind: "specification",
            statement: "Battery powered",
            source_indexes: [0],
          },
        ],
      };
    }),
  };
}

function completedResearchResponse(
  id = "resp_research123",
  value = researchValue(),
) {
  return {
    id,
    model: "gpt-5.6-terra",
    status: "completed",
    output_text: JSON.stringify(value),
    output: [
      {
        type: "web_search_call",
        action: {
          sources: value.candidates.flatMap((candidate) =>
            candidate.source_urls.map((url) => ({
              type: "url",
              url,
              title: `${candidate.brand} ${candidate.model} ${candidate.product_type}`,
            })),
          ),
        },
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 200,
      total_tokens: 300,
    },
  };
}

function presentationValue() {
  return {
    schema_version: STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
    ranked_products: [
      {
        rank: 1,
        candidate_id: "candidate_1",
        product_name: "Example Brand V100 cordless vacuum",
        why_ranked: { text: "Verified fit.", fact_ids: ["candidate_1_fact_1"] },
        best_for: { text: "Battery use.", fact_ids: ["candidate_1_fact_1"] },
        main_tradeoff: {
          text: "Limited evidence.",
          fact_ids: ["candidate_1_fact_1"],
        },
        requirement_explanations: [],
        pros: [{ text: "Battery powered.", fact_ids: ["candidate_1_fact_1"] }],
        cons: [{ text: "Evidence is limited.", fact_ids: ["candidate_1_fact_1"] }],
      },
    ],
    close_match_candidate_ids: [],
    final_advice: [
      {
        text: "Choose the verified fit.",
        candidate_ids: ["candidate_1"],
        fact_ids: ["candidate_1_fact_1"],
      },
    ],
  };
}

describe("OAI-T10 staged Terra runtime", () => {
  it("starts and polls bounded research without exposing a provider id in diagnostics", async () => {
    const createBodies = [];
    const client = {
      responses: {
        create: async (body) => {
          createBodies.push(body);
          return { id: "resp_research123", status: "queued", model: body.model };
        },
        retrieve: async () => completedResearchResponse(),
        cancel: async () => ({ id: "resp_research123", status: "cancelled" }),
      },
    };

    const started = await startStagedTerraResearch({ client, shopperRequest: shopper });
    assert.equal(started.ok, true);
    assert.equal(createBodies[0].background, true);
    assert.equal(createBodies[0].max_tool_calls, 10);
    assert.equal(JSON.stringify(started.ledger).includes("resp_research123"), false);

    const polled = await pollStagedTerraResearch({
      client,
      responseId: started.responseId,
      requestFingerprint: started.requestFingerprint,
      shopperRequest: shopper,
    });
    assert.equal(polled.ok, true);
    assert.equal(polled.state, "completed");
    assert.equal(polled.researchOutput.candidates.length, 8);
    assert.equal(JSON.stringify(polled.ledger).includes("resp_research123"), false);
  });

  it("exposes an immutable evaluation-only identity snapshot after source filtering", async () => {
    let snapshot = null;
    const polled = await pollStagedTerraResearch({
      client: {
        responses: { retrieve: async () => completedResearchResponse() },
      },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
      onEvaluationSnapshot: (value) => {
        snapshot = value;
      },
    });

    assert.equal(polled.ok, true);
    assert.equal(snapshot.validatedCandidates.length, 8);
    assert.equal(snapshot.acceptedCandidates.length, 8);
    assert.deepEqual(Object.keys(snapshot.acceptedCandidates[0]).toSorted(), [
      "brand",
      "model",
      "productName",
      "productType",
    ]);
    assert.doesNotMatch(
      JSON.stringify(snapshot),
      /candidate_1|source_urls|https:/i,
    );
    assert.throws(
      () => {
        snapshot.acceptedCandidates[0].model = "MUTATED";
      },
      TypeError,
    );
    assert.equal(polled.researchOutput.candidates[0].model, "V100");
  });

  it("continues URL-only consulted sources to the bounded fetch stage", async () => {
    const response = completedResearchResponse();
    for (const source of response.output[0].action.sources) delete source.title;

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, true);
    assert.equal(polled.ok && polled.state, "completed");
    assert.equal(polled.ok && polled.researchOutput.candidates.length, 8);
    assert.equal(
      polled.identitySourceFilter.deferredMissingTitleCandidates,
      8,
    );
    assert.equal(polled.identitySourceFilter.rejectedCandidates, 0);

    const fetchedUrls = [];
    const collected = await collectStagedTerraVerificationInputs({
      researchOutput: polled.researchOutput,
      fetchSource: async (url) => {
        fetchedUrls.push(url);
        return { ok: false, reason: "offline_test_failure" };
      },
    });
    assert.equal(collected.diagnostics.candidateCount, 8);
    assert.equal(collected.diagnostics.sourceFetchAttempts, 16);
    const expectedUrls = polled.researchOutput.candidates.flatMap(
      (candidate) => candidate.sourceUrls,
    );
    assert.equal(new Set(fetchedUrls).size, 16);
    assert.deepEqual(fetchedUrls.toSorted(), expectedUrls.toSorted());
  });

  it("accepts a later exact response-owned URL variant without canonical matching", async () => {
    const value = researchValue();
    const exactCandidateUrl = value.candidates[0].source_urls[0];
    const earlierResponseVariant = `${exactCandidateUrl}?utm_source=hosted-search`;
    const response = completedResearchResponse("resp_research123", value);
    response.output[0].action.sources.unshift({
      type: "url",
      url: earlierResponseVariant,
    });

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, true);
    assert.equal(polled.state, "completed");
    assert.equal(
      polled.researchOutput.candidates[0].sourceUrls[0],
      exactCandidateUrl,
    );
  });

  it("rejects a canonical lookalike that is not itself response-owned", async () => {
    const value = researchValue();
    const exactCandidateUrl = value.candidates[0].source_urls[0];
    const response = completedResearchResponse("resp_research123", value);
    response.output[0].action.sources[0].url =
      `${exactCandidateUrl}?utm_source=hosted-search`;

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, false);
    assert.equal(polled.validationReason, "research_candidate_invalid");
    assert.equal(polled.candidateValidationReason, "candidate_sources");
    assert.equal(
      polled.candidateSourceValidationReason,
      "candidate_source_unregistered",
    );
    assert.equal(JSON.stringify(polled).includes(exactCandidateUrl), false);
  });

  it("retains only the closed candidate identity relation when research identity fails", async () => {
    const value = researchValue();
    value.candidates[0].model = "X";
    const response = completedResearchResponse("resp_research123", value);

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, false);
    assert.equal(polled.validationReason, "research_candidate_invalid");
    assert.equal(polled.candidateValidationReason, "candidate_identity");
    assert.equal(
      polled.candidateIdentityValidationReason,
      "candidate_identity_model_relation",
    );
    assert.equal(JSON.stringify(polled).includes("Example Brand"), false);
  });

  it("quarantines a candidate whose response titles do not prove identity", async () => {
    const response = completedResearchResponse();
    response.output[0].action.sources[0].title =
      "Example Brand cordless vacuum buying guide";
    response.output[0].action.sources[1].title =
      "Example Brand cordless vacuum independent test";

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, true);
    assert.equal(polled.ok && polled.researchOutput.candidates.length, 7);
    assert.deepEqual(polled.identitySourceFilter, {
      submittedCandidates: 8,
      acceptedCandidates: 7,
      deferredMissingTitleCandidates: 0,
      rejectedCandidates: 1,
      rejectionCandidateCounts: {
        brandNotInTitle: 0,
        modelNotInTitle: 1,
        modelConflictInTitle: 0,
        wrongProductType: 0,
      },
    });
    assert.equal(JSON.stringify(polled).includes("buying guide"), false);
  });

  it("quarantines multiple identity-unproven candidates, preserves order, and reindexes server ids", async () => {
    const response = completedResearchResponse();
    const rejectedUrls = [
      ...response.output[0].action.sources.slice(0, 2).map((source) => source.url),
      ...response.output[0].action.sources.slice(6, 8).map((source) => source.url),
    ];
    for (const source of [
      ...response.output[0].action.sources.slice(0, 2),
      ...response.output[0].action.sources.slice(6, 8),
    ]) {
      source.title = "Example Brand cordless vacuum buying guide";
    }

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, true);
    assert.deepEqual(
      polled.ok && polled.researchOutput.candidates.map((candidate) => candidate.model),
      ["V200", "V300", "V500", "V600", "V700", "V800"],
    );
    assert.deepEqual(
      polled.ok && polled.researchOutput.candidates.map((candidate) => candidate.candidateId),
      Array.from({ length: 6 }, (_, index) => `candidate_${index + 1}`),
    );
    assert.deepEqual(
      polled.ok && polled.researchOutput.candidates.map((candidate) => candidate.factLeads[0].factId),
      Array.from({ length: 6 }, (_, index) => `candidate_${index + 1}_fact_1`),
    );
    assert.equal(polled.identitySourceFilter.rejectedCandidates, 2);
    assert.equal(polled.identitySourceFilter.rejectionCandidateCounts.modelNotInTitle, 2);
    for (const rejectedUrl of rejectedUrls) {
      assert.equal(JSON.stringify(polled).includes(rejectedUrl), false);
    }
    const fetchedUrls = [];
    const collected = await collectStagedTerraVerificationInputs({
      researchOutput: polled.researchOutput,
      fetchSource: async (url) => {
        fetchedUrls.push(url);
        return { ok: false, reason: "offline_test_failure" };
      },
    });
    assert.equal(collected.diagnostics.candidateCount, 6);
    assert.equal(collected.diagnostics.sourceFetchAttempts, 12);
    assert.equal(fetchedUrls.length, 12);
    for (const rejectedUrl of rejectedUrls) {
      assert.equal(fetchedUrls.includes(rejectedUrl), false);
    }
  });

  it("fails closed with bounded counts when no candidate proves source identity", async () => {
    const response = completedResearchResponse();
    for (const source of response.output[0].action.sources) {
      source.title = "Generic cordless vacuum buying guide";
    }

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, false);
    assert.equal(polled.validationReason, "research_candidate_invalid");
    assert.equal(polled.candidateValidationReason, "candidate_sources");
    assert.equal(
      polled.candidateSourceValidationReason,
      "candidate_source_identity_unproven",
    );
    assert.equal(polled.identitySourceFilter.submittedCandidates, 8);
    assert.equal(polled.identitySourceFilter.acceptedCandidates, 0);
    assert.equal(polled.identitySourceFilter.deferredMissingTitleCandidates, 0);
    assert.equal(polled.identitySourceFilter.rejectedCandidates, 8);
    assert.equal(
      polled.identitySourceFilter.rejectionCandidateCounts.brandNotInTitle,
      8,
    );
  });

  it("does not borrow identity titles from canonical-equivalent URL variants", async () => {
    const value = researchValue();
    const response = completedResearchResponse("resp_research123", value);
    const sources = response.output[0].action.sources;
    for (const exactUrl of value.candidates[0].source_urls) {
      const exactSource = sources.find((source) => source.url === exactUrl);
      sources.unshift({
        type: "url",
        url: `${exactUrl}?utm_source=hosted-search`,
        title: exactSource.title,
      });
      delete exactSource.title;
    }

    const polled = await pollStagedTerraResearch({
      client: { responses: { retrieve: async () => response } },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });

    assert.equal(polled.ok, true);
    assert.equal(polled.ok && polled.researchOutput.candidates.length, 8);
    assert.equal(polled.identitySourceFilter.acceptedCandidates, 8);
    assert.equal(polled.identitySourceFilter.deferredMissingTitleCandidates, 1);
    assert.equal(polled.identitySourceFilter.rejectedCandidates, 0);
  });

  it("propagates only the bounded candidate field group for invalid research", async () => {
    const value = researchValue();
    value.candidates[0].fact_leads[0].statement = " ";
    const polled = await pollStagedTerraResearch({
      client: {
        responses: {
          retrieve: async () => completedResearchResponse("resp_research123", value),
        },
      },
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });
    assert.equal(polled.ok, false);
    assert.equal(polled.validationReason, "research_candidate_invalid");
    assert.equal(polled.candidateValidationReason, "candidate_facts");
    assert.equal("rawOutput" in polled, false);
  });

  it("cancels a non-terminal research job whose provider id cannot fit the app token", async () => {
    const cancelled = [];
    const result = await startStagedTerraResearch({
      client: {
        responses: {
          create: async () => ({
            id: `resp_${"x".repeat(300)}`,
            status: "queued",
            model: "gpt-5.6-terra",
          }),
          cancel: async (id) => {
            cancelled.push(id);
            return { id, status: "cancelled" };
          },
        },
      },
      shopperRequest: shopper,
    });
    assert.equal(result.ok, false);
    assert.equal(cancelled.length, 1);
  });

  it("runs presentation with no tools or response chaining and validates only the evidence package", async () => {
    const evidencePackage = {
      schemaVersion: "staged-terra-evidence-v1",
      requestFingerprint: "a".repeat(64),
      requirements: [],
      evidence: [],
      candidates: [
        {
          candidateId: "candidate_1",
          productName: "Example Brand V100 cordless vacuum",
          brand: "Example Brand",
          model: "V100",
          productType: "cordless vacuum",
          eligibility: "eligible",
          exclusionReason: null,
          requirementVerdicts: [],
          facts: [
            {
              factId: "candidate_1_fact_1",
              kind: "specification",
              statement: "Battery powered.",
              verification: "source_reported",
              evidenceIds: ["e1"],
            },
          ],
          assets: {
            productUrl: null,
            productUrlEvidenceId: null,
            imageUrl: null,
            imageUrlEvidenceId: null,
          },
        },
      ],
    };
    const createBodies = [];
    const client = {
      responses: {
        create: async (body) => {
          createBodies.push(body);
          return {
            id: "resp_present123",
            model: body.model,
            status: "completed",
            output_text: JSON.stringify(presentationValue()),
            output: [{ type: "message", content: [] }],
            usage: { input_tokens: 50, output_tokens: 50, total_tokens: 100 },
          };
        },
        retrieve: async () => {
          throw new Error("not used");
        },
        cancel: async () => {
          throw new Error("not used");
        },
      },
    };

    const result = await runStagedTerraPresentation({ client, evidencePackage });
    assert.equal(result.ok, true);
    assert.equal(createBodies[0].background, false);
    assert.equal("tools" in createBodies[0], false);
    assert.equal("previous_response_id" in createBodies[0], false);
  });

  it("collects only bounded, response-owned source receipts and exact commerce rows", async () => {
    const parsed = await pollStagedTerraResearch({
      client: {
        responses: {
          create: async () => {
            throw new Error("not used");
          },
          retrieve: async () => completedResearchResponse(),
          cancel: async () => {
            throw new Error("not used");
          },
        },
      },
      responseId: "resp_research123",
      requestFingerprint:
        (await startStagedTerraResearch({
          client: {
            responses: {
              create: async () => ({
                id: "resp_research123",
                status: "queued",
              }),
              retrieve: async () => {
                throw new Error("not used");
              },
              cancel: async () => {
                throw new Error("not used");
              },
            },
          },
          shopperRequest: shopper,
        })).requestFingerprint,
      shopperRequest: shopper,
    });
    assert.equal(parsed.ok, true);

    let fetchCalls = 0;
    let shoppingCalls = 0;
    const collected = await collectStagedTerraVerificationInputs({
      researchOutput: parsed.researchOutput,
      fetchSource: async (url) => {
        fetchCalls += 1;
        const model = url.match(/v(\d+)00/)?.[1] ?? "1";
        const html = `<html><body><p>Battery powered</p><script type="application/ld+json">${JSON.stringify({
          "@type": "Product",
          name: `Example Brand V${model}00 cordless vacuum`,
          brand: { name: "Example Brand" },
          model: `V${model}00`,
          offers: {
            price: 399,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url,
          },
        })}</script></body></html>`;
        return {
          ok: true,
          requestedUrl: url,
          finalUrl: url,
          status: 200,
          contentType: "text/html",
          byteLength: Buffer.byteLength(html),
          redirectCount: 0,
          attempts: 1,
          body: html,
          contentHash: (await import("node:crypto"))
            .createHash("sha256")
            .update(html)
            .digest("hex"),
        };
      },
      shoppingTransport: async () => {
        shoppingCalls += 1;
        return { shopping: [] };
      },
      now: () => Date.parse("2026-07-25T12:00:00.000Z"),
    });

    assert.equal(fetchCalls, 16);
    assert.equal(shoppingCalls, 8);
    assert.equal(collected.candidates.length, 8);
    assert.equal(collected.diagnostics.sourceFetchAttempts, 16);
    assert.equal("sourceUrls" in collected.diagnostics, false);
  });

  it("does not classify structured product identity without an offer as a purchase page", async () => {
    const parsed = await pollStagedTerraResearch({
      client: {
        responses: {
          retrieve: async () => completedResearchResponse(),
        },
      },
      responseId: "resp_research123",
      requestFingerprint: (
        await import("../lib/stagedTerraContract.ts")
      ).buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state, "completed");
    const collected = await collectStagedTerraVerificationInputs({
      researchOutput: parsed.researchOutput,
      fetchSource: async (url) => {
        const html = `<script type="application/ld+json">${JSON.stringify({
          "@type": "Product",
          name: "Example Brand V100 cordless vacuum",
          brand: { name: "Example Brand" },
          model: "V100",
        })}</script>`;
        return {
          ok: true,
          requestedUrl: url,
          finalUrl: url,
          status: 200,
          contentType: "text/html",
          byteLength: Buffer.byteLength(html),
          redirectCount: 0,
          attempts: 1,
          body: html,
          contentHash: "a".repeat(64),
        };
      },
      shoppingTransport: undefined,
    });

    assert.ok(
      collected.candidates.every(
        (candidate) => candidate.sources[0].sourceRole === "other",
      ),
    );
  });
});

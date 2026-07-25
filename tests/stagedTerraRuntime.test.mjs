import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectStagedTerraVerificationInputs,
  pollStagedTerraResearch,
  runStagedTerraPresentation,
  startStagedTerraResearch,
} from "../lib/stagedTerraRuntime.ts";
import {
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
      const url = `https://store${number}.example/products/v${number}00`;
      return {
        candidate_id: `candidate_${number}`,
        product_name: `Example Brand V${number}00 cordless vacuum`,
        brand: "Example Brand",
        model: `V${number}00`,
        product_type: "cordless vacuum",
        source_urls: [url],
        requirement_leads: [
          {
            requirement_id: "market_us",
            status: "supporting_evidence",
            summary: "In stock",
            source_urls: [url],
          },
          {
            requirement_id: "budget",
            status: "supporting_evidence",
            summary: "Price is $399",
            source_urls: [url],
          },
          {
            requirement_id: "important_details",
            status: "supporting_evidence",
            summary: "Battery powered",
            source_urls: [url],
          },
        ],
        fact_leads: [
          {
            fact_id: `candidate_${number}_fact_1`,
            kind: "specification",
            statement: "Battery powered",
            source_urls: [url],
          },
        ],
      };
    }),
  };
}

function completedResearchResponse(id = "resp_research123") {
  return {
    id,
    model: "gpt-5.6-terra",
    status: "completed",
    output_text: JSON.stringify(researchValue()),
    output: [
      {
        type: "web_search_call",
        action: {
          sources: researchValue().candidates.map((candidate) => ({
            type: "url",
            url: candidate.source_urls[0],
          })),
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

    assert.equal(fetchCalls, 8);
    assert.equal(shoppingCalls, 8);
    assert.equal(collected.candidates.length, 8);
    assert.equal(collected.diagnostics.sourceFetchAttempts, 8);
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

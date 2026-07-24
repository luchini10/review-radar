import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDirectTerraRequirementContract,
  directTerraCandidateSlateSchema,
  directTerraRequirementContractFromIds,
  validateDirectTerraCandidateSlate,
} from "../lib/directTerraCandidateSlate.ts";

const request = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "good for dog hair and under 7 pounds",
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
    {
      id: "pet-hair",
      name: "Pet hair",
      type: "boolean",
      operator: "required",
      value: true,
      required: true,
      source: "smart_features",
    },
  ],
};
const requirementContract = buildDirectTerraRequirementContract(request);
const requirementIds = requirementContract.map((entry) => entry.id);
const sourceUrls = Array.from(
  { length: 8 },
  (_, index) => `https://sources.example/product-${index + 1}`,
);

function requirementVerdicts(sourceUrl, overrides = {}) {
  return requirementIds.map((requirementId) => ({
    requirement_id: requirementId,
    verdict: overrides[requirementId] ?? "pass",
    source_urls: [sourceUrl],
  }));
}

function candidate(index, overrides = {}) {
  const ranked = index <= 3;
  const sourceUrl = sourceUrls[index - 1];
  return {
    product_name: `Example Brand X${index} Cordless Vacuum`,
    brand: "Example Brand",
    model: `X${index}`,
    disposition: ranked ? "ranked" : index <= 5 ? "close_match" : "rejected",
    final_rank: ranked ? index : null,
    evidence_quality: ranked ? "high" : "medium",
    decision_reason: ranked
      ? `Rank ${index} satisfies the shopper contract.`
      : `Candidate ${index} was not selected.`,
    source_urls: [sourceUrl],
    requirement_verdicts: requirementVerdicts(sourceUrl),
    ...overrides,
  };
}

function fixture() {
  const candidateSlate = Array.from({ length: 8 }, (_, index) =>
    candidate(index + 1),
  );
  const reportMarkdown = [
    "# Cordless vacuum recommendations",
    "",
    "## #1 Best Match — Example Brand X1 Cordless Vacuum",
    "",
    "All requirements pass. [Source](https://sources.example/product-1)",
    "",
    "## #2 Best Match — Example Brand X2 Cordless Vacuum",
    "",
    "All requirements pass. [Source](https://sources.example/product-2)",
    "",
    "## #3 Best Match — Example Brand X3 Cordless Vacuum",
    "",
    "All requirements pass. [Source](https://sources.example/product-3)",
    "",
    "## Comparison table",
  ].join("\n");
  const priceObservations = [1, 2, 3].map((rank) => ({
    rank,
    brand: "Example Brand",
    model: `X${rank}`,
    observations: [],
  }));
  return { candidateSlate, reportMarkdown, priceObservations };
}

function validate(input = {}) {
  return validateDirectTerraCandidateSlate({
    ...fixture(),
    requirementContract,
    responseSourceUrls: sourceUrls,
    ...input,
  });
}

describe("Direct-Terra v3 normalized requirement contract", () => {
  it("derives stable IDs in deterministic shopper order", () => {
    assert.deepEqual(requirementIds, [
      "market_us",
      "budget",
      "important_details",
      "smart_feature:battery-powered",
      "smart_feature:pet-hair",
      "dealbreakers",
    ]);
    assert.deepEqual(
      directTerraRequirementContractFromIds(requirementIds),
      requirementContract,
    );
  });

  it("rejects duplicate Smart Feature IDs and invalid token order", () => {
    assert.throws(
      () =>
        buildDirectTerraRequirementContract({
          selectedFeatures: [
            request.selectedFeatures[0],
            request.selectedFeatures[0],
          ],
        }),
      /unique stable Smart Feature IDs/,
    );
    assert.equal(
      directTerraRequirementContractFromIds([
        "market_us",
        "dealbreakers",
        "budget",
      ]),
      null,
    );
  });

  it("builds a schema whose verdict IDs and exact length come from the request", () => {
    const schema = directTerraCandidateSlateSchema(requirementContract);
    const verdicts = schema.items.properties.requirement_verdicts;
    assert.equal(schema.minItems, 8);
    assert.equal(schema.maxItems, 15);
    assert.equal(verdicts.minItems, requirementIds.length);
    assert.equal(verdicts.maxItems, requirementIds.length);
    assert.deepEqual(
      verdicts.items.properties.requirement_id.enum,
      requirementIds,
    );
  });
});

describe("Direct-Terra v3 candidate-slate validation", () => {
  it("accepts a complete source-owned slate and returns sanitized diagnostics", () => {
    const result = validate();
    assert.equal(result.ok, true);
    assert.equal(result.candidates.length, 8);
    assert.equal(result.diagnostic.candidateCount, 8);
    assert.deepEqual(result.diagnostic.entries[0], {
      identityKey: "example brand x1",
      disposition: "ranked",
      finalRank: 1,
      evidenceQuality: "high",
      requirementVerdicts: requirementIds.map((requirementId) => ({
        requirementId,
        verdict: "pass",
      })),
    });
    const serialized = JSON.stringify(result.diagnostic);
    assert.equal(serialized.includes("https://"), false);
    assert.equal(serialized.includes("decision_reason"), false);
    assert.equal(serialized.includes("provider"), false);
  });

  it("rejects missing, duplicate, or out-of-order requirement verdicts", () => {
    for (const mutate of [
      (verdicts) => verdicts.slice(0, -1),
      (verdicts) => [verdicts[0], verdicts[0], ...verdicts.slice(2)],
      (verdicts) => [verdicts[1], verdicts[0], ...verdicts.slice(2)],
    ]) {
      const current = fixture();
      current.candidateSlate[0].requirement_verdicts = mutate(
        current.candidateSlate[0].requirement_verdicts,
      );
      assert.deepEqual(validate(current), {
        ok: false,
        reason: "candidate_entry_invalid",
      });
    }
  });

  it("rejects unregistered, invented, or cross-candidate evidence URLs", () => {
    for (const source_urls of [
      ["https://invented.example/product"],
      [sourceUrls[1]],
    ]) {
      const current = fixture();
      current.candidateSlate[0].requirement_verdicts[0].source_urls =
        source_urls;
      assert.deepEqual(validate(current), {
        ok: false,
        reason: "candidate_entry_invalid",
      });
    }
  });

  it("rejects candidate-count and distinct-identity violations", () => {
    const short = fixture();
    short.candidateSlate.pop();
    assert.deepEqual(validate(short), {
      ok: false,
      reason: "candidate_slate_shape",
    });

    const duplicate = fixture();
    duplicate.candidateSlate[6].model = "0910-20";
    duplicate.candidateSlate[6].product_name =
      "Example Brand 0910-20 Cordless Vacuum";
    duplicate.candidateSlate[7].brand = duplicate.candidateSlate[6].brand;
    duplicate.candidateSlate[7].model = "0910 20";
    duplicate.candidateSlate[7].product_name =
      "Example Brand 0910 20 Cordless Vacuum";
    assert.deepEqual(validate(duplicate), {
      ok: false,
      reason: "candidate_identity_duplicate",
    });
  });

  it("requires every ranked heading to map exactly to its slate rank and name", () => {
    const current = fixture();
    current.candidateSlate[1].product_name =
      "Example Brand X2 Renamed Cordless Vacuum";
    assert.deepEqual(validate(current), {
      ok: false,
      reason: "ranked_identity_mismatch",
    });
  });

  it("fails ranked hard requirements and an unverified Best Match", () => {
    const failed = fixture();
    failed.candidateSlate[1].requirement_verdicts[0].verdict = "fail";
    assert.deepEqual(validate(failed), {
      ok: false,
      reason: "ranked_hard_requirement_failed",
    });

    const unverified = fixture();
    unverified.candidateSlate[0].requirement_verdicts[0].verdict =
      "needs_verification";
    assert.deepEqual(validate(unverified), {
      ok: false,
      reason: "best_match_hard_requirement_unverified",
    });
  });

  it("allows a lower-ranked unknown only when the report visibly says so", () => {
    const hidden = fixture();
    hidden.candidateSlate[1].requirement_verdicts[0].verdict =
      "needs_verification";
    assert.deepEqual(validate(hidden), {
      ok: false,
      reason: "ranked_unverified_requirement_not_visible",
    });

    const visible = fixture();
    visible.candidateSlate[1].requirement_verdicts[0].verdict =
      "needs_verification";
    visible.reportMarkdown = visible.reportMarkdown.replace(
      "## #2 Best Match — Example Brand X2 Cordless Vacuum\n\nAll requirements pass.",
      "## #2 Best Match — Example Brand X2 Cordless Vacuum\n\nBudget: Needs verification.",
    );
    assert.equal(validate(visible).ok, true);
  });

  it("binds every price-observation identity to the same ranked slate entry", () => {
    const mismatch = fixture();
    mismatch.priceObservations[1].model = "X20";
    assert.deepEqual(validate(mismatch), {
      ok: false,
      reason: "price_identity_mismatch",
    });

    const missing = fixture();
    missing.priceObservations.pop();
    assert.deepEqual(validate(missing), {
      ok: false,
      reason: "price_identity_count_mismatch",
    });
  });
});

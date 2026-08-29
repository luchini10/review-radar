import assert from "node:assert/strict";
import { createCipheriv, createHash, hkdfSync } from "node:crypto";
import { describe, it } from "node:test";

import { buildDirectTerraRequirementContract } from "../lib/directTerraCandidateSlate.ts";
import {
  buildStagedTerraRequestFingerprint,
} from "../lib/stagedTerraContract.ts";
import {
  issueStagedTerraJobToken,
  verifyStagedTerraJobToken,
} from "../lib/stagedTerraJobToken.ts";
import {
  STAGED_TERRA_CLIENT_REQUEST_HEADER,
  STAGED_TERRA_JOB_TOKEN_HEADER,
  isStagedTerraCompletedResponse,
  isStagedTerraPendingResponse,
} from "../lib/stagedTerraApiContract.ts";
import { renderStagedTerraPresentation } from "../lib/stagedTerraRenderer.ts";
import { STAGED_TERRA_RESEARCH_PROMPT_VERSION } from "../lib/stagedTerraPrompt.ts";

const secret = "s".repeat(32);
const shopper = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "battery powered",
};

function requestFingerprintForContractVersion(contractVersion) {
  const requirements = buildDirectTerraRequirementContract(shopper).map(
    ({ id, kind, hard }) => ({ id, kind, hard }),
  );
  return createHash("sha256")
    .update(contractVersion)
    .update("\0")
    .update(
      JSON.stringify({
        query: shopper.query,
        budget: shopper.budget ?? null,
        priorities: shopper.priorities ?? null,
        avoid: shopper.avoid ?? null,
        selectedFeatures: shopper.selectedFeatures ?? [],
        requirements,
      }),
    )
    .digest("hex");
}

function issueCryptographicallyValidTestToken({
  promptVersion,
  requestFingerprint,
}) {
  const tokenVersion = "staged-terra-job-v1";
  const key = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from("ReviewRadar staged Terra token salt v1", "utf8"),
      Buffer.from("ReviewRadar staged Terra token key v1", "utf8"),
      32,
    ),
  );
  const nonce = Buffer.alloc(12, 7);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(tokenVersion, "utf8"));
  const payload = {
    version: tokenVersion,
    responseId: "resp_research123",
    promptVersion,
    requestFingerprint,
    shopperRequest: shopper,
    issuedAtMs: 1_000,
    expiresAtMs: 61_000,
  };
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [
    tokenVersion,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

describe("OAI-T10 staged Terra integration contracts", () => {
  it("keeps provider ids encrypted inside a bounded, tamper-evident job token", () => {
    const token = issueStagedTerraJobToken({
      responseId: "resp_research123",
      requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      shopperRequest: shopper,
      secret,
      nowMs: 1_000,
      ttlMs: 60_000,
    });
    assert.equal(token.includes("resp_research123"), false);
    assert.ok(token.length < 12_000);
    const verified = verifyStagedTerraJobToken({
      token,
      secret,
      nowMs: 2_000,
    });
    assert.equal(verified.ok, true);
    assert.equal(
      verified.ok && verified.payload.promptVersion,
      STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    );
    assert.equal(
      verified.ok && verified.payload.requestFingerprint,
      buildStagedTerraRequestFingerprint(shopper),
    );
    const tamperIndex = Math.floor(token.length / 2);
    const tamperCharacter = token[tamperIndex] === "x" ? "y" : "x";
    const tamperedToken = `${token.slice(0, tamperIndex)}${tamperCharacter}${token.slice(tamperIndex + 1)}`;
    assert.equal(
      verifyStagedTerraJobToken({
        token: tamperedToken,
        secret,
        nowMs: 2_000,
      }).ok,
      false,
    );
  });

  it("rejects cryptographically valid jobs from an old prompt or contract", () => {
    assert.equal(
      verifyStagedTerraJobToken({
        token: issueCryptographicallyValidTestToken({
          promptVersion: STAGED_TERRA_RESEARCH_PROMPT_VERSION,
          requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
        }),
        secret,
        nowMs: 2_000,
      }).ok,
      true,
    );

    const cases = [
      {
        promptVersion: "staged-terra-research-prompt-v5",
        requestFingerprint: buildStagedTerraRequestFingerprint(shopper),
      },
      {
        promptVersion: STAGED_TERRA_RESEARCH_PROMPT_VERSION,
        requestFingerprint: requestFingerprintForContractVersion(
          "staged-terra-contract-v6",
        ),
      },
    ];

    for (const legacy of cases) {
      assert.deepEqual(
        verifyStagedTerraJobToken({
          token: issueCryptographicallyValidTestToken(legacy),
          secret,
          nowMs: 2_000,
        }),
        { ok: false, reason: "invalid_token" },
      );
    }
  });

  it("renders identity, assets, and evidence from the verified package rather than model prose", () => {
    const evidencePackage = {
      schemaVersion: "staged-terra-evidence-v1",
      requestFingerprint: "a".repeat(64),
      requirements: [
        { id: "market_us", kind: "us_availability", hard: true },
      ],
      evidence: [
        {
          evidenceId: "e1",
          candidateId: "candidate_1",
          kind: "claim",
          url: "https://store.example/products/v100",
          host: "store.example",
          title: "Example Brand V100",
          sourceType: "retailer",
        },
        {
          evidenceId: "e2",
          candidateId: "candidate_1",
          kind: "product_page",
          url: "https://store.example/products/v100",
          host: "store.example",
          title: "Example Brand V100",
          sourceType: "retailer",
        },
        {
          evidenceId: "e3",
          candidateId: "candidate_1",
          kind: "image",
          url: "https://store.example/images/v100.jpg",
          host: "store.example",
          title: "Example Brand V100 product image",
          sourceType: "retailer",
        },
      ],
      candidates: [
        {
          candidateId: "candidate_1",
          productName: "Example Brand V100 cordless vacuum",
          brand: "Example Brand",
          model: "V100",
          productType: "cordless vacuum",
          eligibility: "eligible",
          exclusionReason: null,
          requirementVerdicts: [
            {
              requirementId: "market_us",
              verdict: "pass",
              evidenceIds: ["e1"],
            },
          ],
          facts: [
            {
              factId: "vf1",
              kind: "identity",
              statement: "Exact product identity was verified.",
              verification: "verified",
              evidenceIds: ["e1"],
            },
            {
              factId: "vf2",
              kind: "price",
              statement: "A current exact-product price of $399.00 was verified.",
              verification: "verified",
              evidenceIds: ["e1"],
            },
          ],
          assets: {
            productUrl: "https://store.example/products/v100",
            productUrlEvidenceId: "e2",
            imageUrl: "https://store.example/images/v100.jpg",
            imageUrlEvidenceId: "e3",
          },
        },
      ],
    };
    const presentation = {
      schemaVersion: "staged-terra-presentation-v1",
      rankedProducts: [
        {
          rank: 1,
          candidateId: "candidate_1",
          productName: "Example Brand V100 cordless vacuum",
          whyRanked: { text: "Best verified fit.", factIds: ["vf1"] },
          bestFor: { text: "Verified shoppers.", factIds: ["vf1"] },
          mainTradeoff: { text: "Limited facts.", factIds: ["vf1"] },
          requirementExplanations: [
            {
              requirementId: "market_us",
              verdict: "pass",
              text: "Available in the U.S.",
              evidenceIds: ["e1"],
            },
          ],
          pros: [{ text: "Identity verified.", factIds: ["vf1"] }],
          cons: [{ text: "Limited facts.", factIds: ["vf1"] }],
        },
      ],
      closeMatchCandidateIds: [],
      finalAdvice: [
        {
          text: "Choose the verified model.",
          candidateIds: ["candidate_1"],
          factIds: ["vf1"],
        },
      ],
    };

    const rendered = renderStagedTerraPresentation({
      evidencePackage,
      presentation,
      observedAt: "2026-07-25T12:00:00.000Z",
    });
    assert.equal(rendered.cards[0].identity.product_name, evidencePackage.candidates[0].productName);
    assert.equal(rendered.cards[0].commerce.productUrl, evidencePackage.candidates[0].assets.productUrl);
    assert.equal(rendered.cards[0].image.url, evidencePackage.candidates[0].assets.imageUrl);
    assert.deepEqual(rendered.finalAdvice, ["Choose the verified model."]);

    const mismatchedPriceReceipt = structuredClone(evidencePackage);
    mismatchedPriceReceipt.evidence.find((item) => item.evidenceId === "e1").url =
      "https://price.example/products/v100";
    const withheld = renderStagedTerraPresentation({
      evidencePackage: mismatchedPriceReceipt,
      presentation,
      observedAt: "2026-07-25T12:00:00.000Z",
    });
    assert.equal(withheld.cards[0].commerce.state, "not_verified");
    assert.equal(withheld.cards[0].commerce.productUrl, null);
  });

  it("uses distinct staged headers and strict public envelopes", () => {
    assert.notEqual(STAGED_TERRA_CLIENT_REQUEST_HEADER, STAGED_TERRA_JOB_TOKEN_HEADER);
    assert.equal(
      isStagedTerraPendingResponse({
        pipeline: "staged_terra",
        version: "staged-terra-api-v1",
        state: "pending",
        status: "queued",
        jobToken: "opaque",
        pollAfterMs: 2_000,
        expiresAtMs: 10_000,
      }),
      true,
    );
    assert.equal(
      isStagedTerraCompletedResponse({
        pipeline: "staged_terra",
        version: "staged-terra-api-v1",
        state: "completed",
        presentationVersion: "staged-terra-presentation-v1",
        cards: [],
        sources: [],
        finalAdvice: [],
      }),
      true,
    );
  });
});

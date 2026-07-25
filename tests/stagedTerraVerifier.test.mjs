import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { observeHybridSourceHtml } from "../lib/autonomousFactVerifier.ts";
import {
  materializeStagedTerraEvidencePackage,
  STAGED_TERRA_VERIFIER_VERSION,
} from "../lib/stagedTerraVerifier.ts";
import {
  buildStagedTerraRequestFingerprint,
  STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
} from "../lib/stagedTerraContract.ts";

const batteryFeature = {
  id: "battery-powered",
  name: "Battery powered",
  type: "boolean",
  operator: "required",
  value: true,
  required: true,
  source: "smart_features",
};

const shopper = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "battery powered",
  selectedFeatures: [batteryFeature],
};

function researchOutput({
  category = "cordless vacuum",
  candidateOverrides = {},
} = {}) {
  return {
    schemaVersion: "staged-terra-research-v1",
    candidates: Array.from({ length: 8 }, (_, index) => {
      const number = index + 1;
      return {
        candidateId: `candidate_${number}`,
        productName: `Example Brand V${number}00 ${category}`,
        brand: "Example Brand",
        model: `V${number}00`,
        productType: category,
        sourceUrls: [
          `https://manufacturer${number}.example/products/v${number}00`,
        ],
        requirementLeads: [],
        factLeads: [],
        ...(candidateOverrides[`candidate_${number}`] ?? {}),
      };
    }),
  };
}

function productPageSource({
  brand = "Example Brand",
  model = "V100",
  name = `Example Brand ${model} cordless vacuum`,
  price = 399,
  availability = "https://schema.org/InStock",
  image = `https://manufacturer1.example/images/${model.toLowerCase()}.jpg`,
  url = "https://manufacturer1.example/products/v100",
  visibleClaim = "This is a battery powered cordless vacuum.",
} = {}) {
  const html = `<html><head><title>${name}</title></head><body>
    <h1>${name}</h1>
    <p>${visibleClaim}</p>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      brand: { name: brand },
      model,
      image,
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "USD",
        availability,
        seller: { name: "Example Store" },
        url,
      },
    })}</script>
  </body></html>`;
  const observedAt = "2026-07-24T12:00:00.000Z";
  const observation = observeHybridSourceHtml({
    html,
    requestedUrl: url,
    observedAt,
  });
  return {
    observedAt,
    fetch: {
      ok: true,
      requestedUrl: url,
      finalUrl: url,
      status: 200,
      contentType: "text/html",
      byteLength: Buffer.byteLength(html),
      redirectCount: 0,
      attempts: 1,
      body: html,
      contentHash: observation.contentHash,
    },
  };
}

function exactCandidateInput(overrides = {}) {
  return {
    candidateId: "candidate_1",
    sources: [
      {
        sourceUrl: "https://manufacturer1.example/products/v100",
        sourceRole: "official_product",
        ...productPageSource(),
        claims: [
          {
            kind: "specification",
            statement: "This is a battery powered cordless vacuum.",
            requirementSignals: [
              {
                requirementId: "important_details",
                verdict: "supports",
              },
              {
                requirementId: "smart_feature:battery-powered",
                verdict: "supports",
              },
            ],
          },
        ],
      },
    ],
    shoppingResults: [],
    ...overrides,
  };
}

describe("OAI-T10 deterministic evidence materializer", () => {
  it("builds one valid, candidate-owned package without ranking or backfill", () => {
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: shopper,
      researchOutput: researchOutput(),
      market: "US",
      candidates: [exactCandidateInput()],
    });

    assert.equal(result.verifierVersion, STAGED_TERRA_VERIFIER_VERSION);
    assert.equal(
      result.evidencePackage.schemaVersion,
      STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
    );
    assert.equal(
      result.evidencePackage.requestFingerprint,
      buildStagedTerraRequestFingerprint(shopper),
    );
    assert.equal(result.evidencePackage.candidates.length, 8);
    assert.deepEqual(
      result.evidencePackage.candidates.map((candidate) => candidate.candidateId),
      researchOutput().candidates.map((candidate) => candidate.candidateId),
    );

    const verified = result.evidencePackage.candidates[0];
    assert.deepEqual(
      verified.requirementVerdicts.map((verdict) => verdict.verdict),
      ["pass", "pass", "pass", "pass"],
    );
    assert.equal(verified.eligibility, "eligible");
    assert.equal(verified.assets.productUrl?.includes("/products/v100"), true);
    assert.equal(verified.assets.imageUrl?.includes("/images/v100.jpg"), true);
    assert.equal(
      verified.facts.some(
        (fact) => fact.kind === "price" && fact.verification === "verified",
      ),
      true,
    );
    assert.equal(
      verified.facts.some(
        (fact) =>
          fact.kind === "specification" &&
          fact.verification === "source_reported",
      ),
      true,
    );

    for (const evidence of result.evidencePackage.evidence) {
      const owner = result.evidencePackage.candidates.find(
        (candidate) => candidate.candidateId === evidence.candidateId,
      );
      assert.ok(owner);
    }
    assert.deepEqual(
      result.diagnostics.candidates.map((candidate) => candidate.candidateId),
      researchOutput().candidates.map((candidate) => candidate.candidateId),
    );
  });

  it("excludes an over-budget product and withholds its otherwise safe assets", () => {
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: { ...shopper, budget: "under $300" },
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...exactCandidateInput().sources[0],
              ...productPageSource({ price: 399 }),
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(candidate.eligibility, "excluded");
    assert.equal(
      candidate.requirementVerdicts.find(
        (verdict) => verdict.requirementId === "budget",
      )?.verdict,
      "fail",
    );
    assert.deepEqual(candidate.assets, {
      productUrl: null,
      productUrlEvidenceId: null,
      imageUrl: null,
      imageUrlEvidenceId: null,
    });
  });

  it("rejects siblings, accessories, and wrong product types across categories", () => {
    const cases = [
      {
        category: "robot vacuum",
        requestedModel: "Q7",
        observedModel: "Q70",
        observedName: "Example Brand Q70 robot vacuum",
      },
      {
        category: "shop vacuum",
        requestedModel: "HD1400",
        observedModel: "HD1400",
        observedName: "Replacement filter compatible with HD1400 shop vacuum",
      },
      {
        category: "office chair",
        requestedModel: "C100",
        observedModel: "C100",
        observedName: "Example Brand C100 racing gaming chair",
      },
    ];

    for (const testCase of cases) {
      const sourceUrl = "https://manufacturer1.example/products/test";
      const research = researchOutput({
        category: testCase.category,
        candidateOverrides: {
          candidate_1: {
            productName: `Example Brand ${testCase.requestedModel} ${testCase.category}`,
            model: testCase.requestedModel,
            productType: testCase.category,
            sourceUrls: [sourceUrl],
          },
        },
      });
      const result = materializeStagedTerraEvidencePackage({
        shopperRequest: { query: testCase.category },
        researchOutput: research,
        market: "US",
        candidates: [
          {
            candidateId: "candidate_1",
            sources: [
              {
                sourceUrl,
                sourceRole: "official_product",
                ...productPageSource({
                  model: testCase.observedModel,
                  name: testCase.observedName,
                  url: sourceUrl,
                  visibleClaim: "",
                }),
                claims: [],
              },
            ],
            shoppingResults: [],
          },
        ],
      });
      assert.equal(
        result.evidencePackage.candidates[0].eligibility,
        "excluded",
        testCase.observedName,
      );
      assert.equal(result.evidencePackage.candidates[0].assets.productUrl, null);
      assert.equal(result.evidencePackage.candidates[0].assets.imageUrl, null);
    }
  });

  it("keeps unknown hard requirements visible as a close match", () => {
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: shopper,
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...exactCandidateInput().sources[0],
              claims: [],
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(candidate.eligibility, "close_match");
    assert.equal(
      candidate.requirementVerdicts.some(
        (verdict) => verdict.verdict === "not_verified",
      ),
      true,
    );
  });

  it("does not promote cross-candidate, unregistered, or subjective evidence", () => {
    const research = researchOutput();
    const source = exactCandidateInput().sources[0];
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: shopper,
      researchOutput: research,
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            source,
            {
              ...source,
              sourceUrl: research.candidates[1].sourceUrls[0],
              claims: [
                {
                  kind: "performance",
                  statement: "Testing found excellent performance.",
                  requirementSignals: [],
                },
              ],
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(
      candidate.facts.some(
        (fact) =>
          fact.kind === "performance" && fact.verification === "verified",
      ),
      false,
    );
    assert.equal(
      result.diagnostics.candidates[0].rejectionReasons.includes(
        "source_not_owned_by_candidate",
      ),
      true,
    );
  });

  it("requires every source-reported claim to appear in the observed page", () => {
    const source = exactCandidateInput().sources[0];
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: shopper,
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...source,
              ...productPageSource({
                visibleClaim: "This model includes a washable filter.",
              }),
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(candidate.eligibility, "close_match");
    assert.equal(
      candidate.facts.some((fact) =>
        fact.statement.includes("battery powered"),
      ),
      false,
    );
    assert.equal(
      result.diagnostics.candidates[0].rejectionReasons.includes(
        "observed_claim_invalid",
      ),
      true,
    );
  });

  it("rejects source HTML that does not match its immutable observation hash", () => {
    const source = exactCandidateInput().sources[0];
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: { query: shopper.query },
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...source,
              fetch: {
                ...source.fetch,
                body: `${source.fetch.body}<p>tampered after observation</p>`,
              },
              claims: [],
            },
          ],
        }),
      ],
    });
    assert.equal(
      result.evidencePackage.candidates[0].eligibility,
      "excluded",
    );
    assert.equal(
      result.diagnostics.candidates[0].rejectionReasons.includes(
        "source_input_invalid",
      ),
      true,
    );
  });

  it("does not let a misleading support label bypass semantic validation", () => {
    const source = exactCandidateInput().sources[0];
    const unrelatedStatement = "This model includes a washable filter.";
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: {
        query: shopper.query,
        priorities: shopper.priorities,
      },
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...source,
              ...productPageSource({ visibleClaim: unrelatedStatement }),
              claims: [
                {
                  kind: "specification",
                  statement: unrelatedStatement,
                  requirementSignals: [
                    {
                      requirementId: "important_details",
                      verdict: "supports",
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ],
    });
    const verdict = result.evidencePackage.candidates[0].requirementVerdicts.find(
      (item) => item.requirementId === "important_details",
    );
    assert.equal(verdict?.verdict, "not_verified");
    assert.equal(result.evidencePackage.candidates[0].eligibility, "close_match");
  });

  it("excludes an exact product when observed evidence proves a dealbreaker", () => {
    const statement = "This is a racing gaming chair.";
    const source = exactCandidateInput().sources[0];
    const research = researchOutput({ category: "office chair" });
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: {
        query: "office chair",
        avoid: "gaming chair",
      },
      researchOutput: research,
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...source,
              ...productPageSource({
                name: "Example Brand V100 office chair",
                visibleClaim: statement,
              }),
              claims: [
                {
                  kind: "specification",
                  statement,
                  requirementSignals: [
                    {
                      requirementId: "dealbreakers",
                      verdict: "conflicts",
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(
      candidate.requirementVerdicts.find(
        (item) => item.requirementId === "dealbreakers",
      )?.verdict,
      "fail",
    );
    assert.equal(candidate.eligibility, "excluded");
    assert.equal(candidate.assets.productUrl, null);
  });

  it("does not accept an accessory page as manufacturer specification evidence", () => {
    const sourceUrl = "https://manufacturer1.example/products/v100-filter";
    const statement = "The V100 filter is battery powered.";
    const research = researchOutput({
      candidateOverrides: {
        candidate_1: {
          sourceUrls: [sourceUrl],
        },
      },
    });
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: shopper,
      researchOutput: research,
      market: "US",
      candidates: [
        {
          candidateId: "candidate_1",
          sources: [
            {
              sourceUrl,
              sourceRole: "manufacturer_spec",
              ...productPageSource({
                name: "Replacement filter compatible with V100 cordless vacuum",
                url: sourceUrl,
                visibleClaim: statement,
              }),
              claims: [
                {
                  kind: "specification",
                  statement,
                  requirementSignals: [
                    {
                      requirementId: "important_details",
                      verdict: "supports",
                    },
                  ],
                },
              ],
            },
          ],
          shoppingResults: [],
        },
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(candidate.eligibility, "excluded");
    assert.equal(
      candidate.facts.some((fact) => fact.statement === statement),
      false,
    );
  });

  it("treats explicit out-of-stock evidence as a hard U.S. availability failure", () => {
    const result = materializeStagedTerraEvidencePackage({
      shopperRequest: { query: shopper.query },
      researchOutput: researchOutput(),
      market: "US",
      candidates: [
        exactCandidateInput({
          sources: [
            {
              ...exactCandidateInput().sources[0],
              ...productPageSource({
                availability: "https://schema.org/OutOfStock",
              }),
              claims: [],
            },
          ],
        }),
      ],
    });
    const candidate = result.evidencePackage.candidates[0];
    assert.equal(candidate.requirementVerdicts[0].verdict, "fail");
    assert.equal(candidate.eligibility, "excluded");
  });

  it("contains no provider client, fetch, ranking, or route integration", () => {
    const source = fs.readFileSync("lib/stagedTerraVerifier.ts", "utf8");
    assert.doesNotMatch(source, /new OpenAI|responses\.(?:create|retrieve)|fetch\(/);
    assert.doesNotMatch(source, /rankedProducts|finalAdvice|scoreCandidate/);
    const route = fs.readFileSync(
      "lib/directTerraRecommendationRoute.ts",
      "utf8",
    );
    assert.doesNotMatch(route, /stagedTerraVerifier/);
  });
});

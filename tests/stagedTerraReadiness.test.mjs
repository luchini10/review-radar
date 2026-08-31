import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  analyzeStagedTerraReadiness,
  analyzeStagedTerraReadinessPrefix,
  buildStagedTerraReadinessArtifact,
  parseStagedTerraReadinessArtifact,
  STAGED_TERRA_READINESS_CAPTURE_VERSION,
  STAGED_TERRA_READINESS_MATRIX_VERSION,
  STAGED_TERRA_READINESS_REVIEW_VERSION,
  stagedTerraReadinessMatrixSha256,
  stagedTerraReadinessRequestSha256,
  validateStagedTerraReadinessMatrix,
} from "../scripts/staged-terra-readiness.mjs";
import {
  STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
  STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
  stagedTerraRegisteredProductMatchesIdentity,
  stagedTerraRegisteredProducts,
} from "../scripts/staged-terra-readiness-trace.mjs";
import { buildStagedTerraReadinessRunPlan } from "../scripts/staged-terra-readiness-runner.mjs";
import {
  buildStagedTerraReadinessReviewPacket,
  STAGED_TERRA_READINESS_REVIEW_PACKET_VERSION,
} from "../scripts/staged-terra-readiness-artifact.mjs";

const fixturePath = new URL(
  "./fixtures/staged-terra-readiness-matrix-v7.json",
  import.meta.url,
);
const retiredFixturePaths = [
  "./fixtures/staged-terra-readiness-matrix-v1.json",
  "./fixtures/staged-terra-readiness-matrix-v2.json",
  "./fixtures/staged-terra-readiness-matrix-v3.json",
  "./fixtures/staged-terra-readiness-matrix-v4.json",
  "./fixtures/staged-terra-readiness-matrix-v5.json",
  "./fixtures/staged-terra-readiness-matrix-v6.json",
].map((relativePath) => new URL(relativePath, import.meta.url));
const commitSha = "a".repeat(40);

function matrix() {
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

function caseById(value, caseId) {
  return value.cases.find((item) => item.id === caseId);
}

function identityFor(caseId, index = 0) {
  const identities = {
    "broad-shop-vac": [
      ["RIDGID", "RIDGID NXT 12 Gallon Wet Dry Vacuum", "HD1200"],
      ["CRAFTSMAN", "CRAFTSMAN 16 Gallon Wet Dry Vacuum", "CMXEVBE17595"],
      ["DEWALT", "DEWALT Stealthsonic 12 Gallon Wet Dry Vacuum", "DXV12P-QT"],
    ],
    "con-gas-grill-600-4-main-burner": [
      ["Nexgrill", "Nexgrill 4-Burner Propane Gas Grill", "720-0925P"],
      ["Royal Gourmet", "Royal Gourmet Propane Gas Grill", "GA5401T"],
    ],
    "adv-office-chair-350-mesh-lumbar": [
      ["Boulies", "Boulies EP200 Ergonomic Office Chair", "EP200"],
    ],
    "over-robot-vac-300-selfempty-pet-cords": [
      ["TP-Link", "Tapo Robot Vacuum and Auto-Empty Dock", "RV30 Max Plus"],
    ],
  };
  return identities[caseId][index];
}

function card(testCase, rank, identity) {
  const [brand, productName, model] = identity;
  const hasBudget = testCase.maximumVerifiedPriceUsd !== null;
  const sourceIds = [`s${rank}a`, `s${rank}b`];
  return {
    rank,
    key: `${testCase.id}-card-${rank}`,
    recommendationStatus: "Best Match",
    identity: {
      brand,
      productName,
      model,
      variant: null,
    },
    identityVerification: "verified",
    requirementChecks: testCase.requirementIds.map((id) => ({
      id,
      status: "Pass",
      sourceIds,
    })),
    commerce: hasBudget
      ? {
          state: "verified",
          priceAmount: Math.min(299, testCase.maximumVerifiedPriceUsd),
          currency: "USD",
          productUrl: `https://merchant.example.com/${testCase.id}/${rank}`,
        }
      : {
          state: "not_verified",
          priceAmount: null,
          currency: null,
          productUrl: null,
        },
    sourceIds,
  };
}

function completedRun(value, caseId, run) {
  const testCase = caseById(value, caseId);
  const attempt = value.attemptPlan.find(
    (item) => item.key === `${caseId}:${run}`,
  );
  const cardCount = Math.max(testCase.minimumCards, 1);
  const cards = Array.from({ length: cardCount }, (_, index) =>
    card(testCase, index + 1, identityFor(caseId, index)),
  );
  const accepted = 10;
  return {
    schemaVersion: STAGED_TERRA_READINESS_CAPTURE_VERSION,
    matrixVersion: value.schemaVersion,
    matrixSha256: stagedTerraReadinessMatrixSha256(value),
    caseId,
    run,
    runId: attempt.runId,
    commitSha,
    requestSha256: stagedTerraReadinessRequestSha256(testCase.shopperRequest),
    artifactSha256: createHash("sha256")
      .update(`${caseId}:${run}`, "utf8")
      .digest("hex"),
    terminal: {
      state: "completed",
      statusCode: 200,
      code: null,
      wallClockMs: 120_000,
    },
    cards,
    sources: cards.flatMap((itemCard) => [
      {
        id: itemCard.sourceIds[0],
        url: `https://source.example.com/${caseId}/${run}/${itemCard.rank}`,
      },
      {
        id: itemCard.sourceIds[1],
        url:
          itemCard.commerce.productUrl ??
          `https://manufacturer.example.com/${caseId}/${run}/${itemCard.rank}`,
      },
    ]),
    diagnostics: {
      research: {
        submitted: accepted,
        accepted,
        deferredMissingTitle: 0,
        rejected: 0,
      },
      verification: {
        eligible: cards.length,
        closeMatch: 0,
        excluded: accepted - cards.length,
        firstLoss: {
          assetIdentity: accepted - cards.length,
          relationship: 0,
          productUrl: 0,
          hardRequirementFailed: 0,
          hardRequirementNotVerified: 0,
          noLossEligible: cards.length,
        },
      },
    },
    accounting: {
      openAiCreates: 2,
      openAiRetrieves: 40,
      hostedSearches: 8,
      safetyCancels: 0,
      serperShoppingAttempts: 10,
      sourcePageFetches: 20,
      sourcePageHttpAttempts: 25,
      retries: 0,
      replacements: 0,
      fallbacks: 0,
      serperOrganicAttempts: 0,
      searchApiAttempts: 0,
      additionalCases: 0,
      inputTokens: 77_273,
      cachedInputTokens: 0,
      outputTokens: 9_064,
      webSearchCalls: 8,
      conservativeUsd: 0.457438,
    },
  };
}

function runs(value = matrix()) {
  return value.runOrder.map((key) => {
    const [caseId, run] = key.split(":");
    return completedRun(value, caseId, Number(run));
  });
}

const routeCountKeys = {
  asset: [
    "noAssetCandidates",
    "invalidTargetIdentity",
    "missingTitle",
    "brandNotInTitle",
    "modelNotInTitle",
    "modelConflictInTitle",
    "wrongProductType",
  ],
  commerce: [
    "noShoppingRows",
    "targetStableIdentifierUnavailable",
    "acceptedExactOffer",
    "missingTitle",
    "brandNotInTitle",
    "stableIdentifierNotInTitle",
    "missingMerchantProductUrl",
    "missingPrice",
    "missingSeller",
    "nonNewOffer",
    "explicitAccessoryOffer",
    "productIneligible",
  ],
  relationship: [
    "nonProductPage",
    "complementPrimaryItem",
    "productTypeConflict",
    "complementRelationshipWording",
    "insufficientCompleteProductEvidence",
  ],
  productUrl: [
    "missingOrInvalidProductUrl",
    "unsafeProductUrlHost",
    "productUrlRedirectWrapper",
    "productUrlIneligible",
    "productUrlTypeConflict",
    "productUrlDescriptiveIdentityConflict",
    "productUrlIdentityMismatch",
  ],
};

function counts(keys, first = 0) {
  return Object.fromEntries(keys.map((key, index) => [key, index === 0 ? first : 0]));
}

function ledger(operation, outcome, usage, durationMs = 1_000) {
  const presentation = operation === "presentation";
  return {
    runtimeVersion: "staged-terra-runtime-v10",
    operation,
    promptVersion: presentation
      ? "staged-terra-presentation-prompt-v1"
      : "staged-terra-research-prompt-v7",
    modelRequested: "gpt-5.6-terra",
    modelReturned: "gpt-5.6-terra",
    status:
      outcome === "pending"
        ? "in_progress"
        : outcome === "completed"
          ? "completed"
          : "not_started",
    responseIdHash: createHash("sha256")
      .update(presentation ? "presentation-response" : "research-response")
      .digest("hex"),
    durationMs,
    usage: {
      ...usage,
      totalTokens: usage.inputTokens + usage.outputTokens,
    },
    sourceCount:
      operation === "research_poll" && outcome === "completed" ? 2 : 0,
    failureReason: outcome === "failed" ? "request_error" : null,
  };
}

function publicTrustValue(text, sourceIds) {
  return {
    value: text,
    trust: "research_synthesis",
    label: "AI research synthesis",
    sourceIds,
  };
}

function publicCard(itemCard, caseId, run) {
  const sourceIds = [...itemCard.sourceIds];
  const commerce =
    itemCard.commerce.state === "verified"
      ? {
          state: "verified",
          label: "Independently verified",
          priceAmount: itemCard.commerce.priceAmount,
          currency: itemCard.commerce.currency,
          seller: "Synthetic Merchant",
          productUrl: itemCard.commerce.productUrl,
          availability: "in_stock",
          observedAt: "2026-08-29T12:00:00.000Z",
        }
      : {
          state: "not_verified",
          label: "Check current price",
          priceAmount: null,
          currency: null,
          seller: null,
          productUrl: null,
          availability: null,
          observedAt: null,
        };
  return {
    key: itemCard.key,
    rank: itemCard.rank,
    recommendationStatus: itemCard.recommendationStatus,
    identity: {
      brand: itemCard.identity.brand,
      product_name: itemCard.identity.productName,
      model: itemCard.identity.model,
      variant: itemCard.identity.variant,
    },
    identityVerification: {
      state: itemCard.identityVerification,
      label: "Independently verified",
      observedAt: "2026-08-29T12:00:00.000Z",
    },
    assessment: {
      why: publicTrustValue("The exact product fits the request.", sourceIds),
      bestFor: publicTrustValue("Best for the stated priorities.", sourceIds),
      mainTradeoff: publicTrustValue("Review the verified tradeoffs.", sourceIds),
    },
    pros: [publicTrustValue("Evidence-backed strength.", sourceIds)],
    cons: [publicTrustValue("Evidence-backed tradeoff.", sourceIds)],
    requirementChecks: itemCard.requirementChecks.map((check) => ({
      requirement: check.id,
      status: check.status,
      explanation: "The cited evidence supports this requirement.",
      trust: "research_synthesis",
      label: "AI research synthesis",
      sourceIds: [...check.sourceIds],
    })),
    claims: [
      {
        claimType: "specification",
        value: `Exact reviewed evidence for ${caseId} run ${run}.`,
        sourceIds,
        evidenceScope: "exact_model",
        trust: "source_reported",
        label: "Source-reported",
      },
    ],
    commerce,
    image: {
      state: "verified",
      label: "Independently verified",
      url: `https://images.example.com/${caseId}/${run}/${itemCard.rank}.webp`,
    },
  };
}

function verificationAttribution(verification) {
  const loss = verification.firstLoss;
  return {
    candidateFirstLossCounts: {
      assetIdentityUnproven: loss.assetIdentity,
      completeProductRelationshipUnproven: loss.relationship,
      identitySafeProductUrlUnavailable: loss.productUrl,
      hardRequirementFailed: loss.hardRequirementFailed,
      hardRequirementNotVerified: loss.hardRequirementNotVerified,
      noLossEligible: loss.noLossEligible,
    },
    assetIdentityFailureCandidateCounts: counts(
      routeCountKeys.asset,
      loss.assetIdentity,
    ),
    commerceOutcomeCandidateCounts: counts(
      routeCountKeys.commerce,
      loss.assetIdentity,
    ),
    completeProductRelationshipFailureCandidateCounts: counts(
      routeCountKeys.relationship,
      loss.relationship,
    ),
    identitySafeProductUrlFailureCandidateCounts: counts(
      routeCountKeys.productUrl,
      loss.productUrl,
    ),
    sourceRejectionCandidateCounts: {
      sourceNotOwnedByCandidate: 0,
      sourceInputInvalid: 0,
    },
    claimRejectionCandidateCounts: { observedClaimInvalid: 0 },
  };
}

function failureMessage(code) {
  return {
    invalid_config: "ReviewRadar's staged Terra mode is not configured.",
    invalid_json: "The request body must be valid JSON.",
    invalid_request: "The shopper request is too large.",
    invalid_job: "This research job is invalid. Please start a new search.",
    expired_job: "This research job expired. Please start a new search.",
    research_failed: "Research could not be completed safely. Please try again.",
    verification_failed:
      "Research finished, but enough evidence could not be verified safely.",
    presentation_failed:
      "Evidence was verified, but the final briefing could not be completed safely.",
  }[code];
}

function registeredProductTrace(value, item, hasVerification) {
  if (!hasVerification) return null;
  const testCase = caseById(value, item.caseId);
  return {
    schemaVersion: STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
    products: stagedTerraRegisteredProducts(testCase).map(
      ({ product, registry }) => {
        const matched = item.cards.filter((itemCard) =>
          stagedTerraRegisteredProductMatchesIdentity(
            itemCard.identity,
            product,
          ),
        ).length;
        const firstLoss = Object.fromEntries(
          STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.map((key) => [
            key,
            key === "noLossEligible" ? matched : 0,
          ]),
        );
        return {
          id: product.id,
          registry,
          validatedResearchCandidates: matched,
          acceptedResearchCandidates: matched,
          verification: {
            eligible: matched,
            closeMatch: 0,
            excluded: 0,
            firstLoss,
          },
        };
      },
    ),
  };
}

function artifactForRun(
  value,
  item,
  previousArtifactSha256 = null,
  overrides = {},
) {
  const completed = item.terminal.state === "completed";
  const safeNoExact = item.terminal.code === "verification_failed";
  const hasVerification = completed || safeNoExact;
  const presentationInput = Math.max(1, item.accounting.inputTokens - 60_000);
  const researchInput = item.accounting.inputTokens - presentationInput;
  const presentationOutput = Math.max(1, item.accounting.outputTokens - 7_000);
  const researchOutput = item.accounting.outputTokens - presentationOutput;
  const routeDiagnostics = [
    {
      stage: "research_start",
      outcome: "pending",
      ledger: ledger(
        "research_start",
        "pending",
        {
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          webSearchCalls: 0,
        },
        100,
      ),
    },
    ...Array.from(
      { length: Math.max(0, item.accounting.openAiRetrieves - 1) },
      (_, index) => ({
        stage: "research_poll",
        outcome: "pending",
        ledger: ledger(
          "research_poll",
          "pending",
          {
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            webSearchCalls: 0,
          },
          index + 1,
        ),
      }),
    ),
    {
      stage: "research_poll",
      outcome: hasVerification ? "completed" : "failed",
      ledger: ledger(
        "research_poll",
        hasVerification ? "completed" : "failed",
        {
          inputTokens: researchInput,
          cachedInputTokens: item.accounting.cachedInputTokens,
          outputTokens: researchOutput,
          webSearchCalls: item.accounting.hostedSearches,
        },
        80_000,
      ),
      ...(hasVerification
        ? {
            identitySourceFilter: {
              submittedCandidates: item.diagnostics.research.submitted,
              acceptedCandidates: item.diagnostics.research.accepted,
              deferredMissingTitleCandidates:
                item.diagnostics.research.deferredMissingTitle,
              rejectedCandidates: item.diagnostics.research.rejected,
              rejectionCandidateCounts: {
                missingTitle: 0,
                brandNotInTitle: 0,
                modelNotInTitle: 0,
                modelConflictInTitle: 0,
                wrongProductType: 0,
                completeProductPageUnavailable: 0,
              },
            },
          }
        : {}),
    },
    ...(hasVerification
      ? [
          {
            stage: "verification",
            outcome: completed ? "completed" : "failed",
            counts: {
              candidates: item.diagnostics.research.accepted,
              sourceFetchAttempts: item.accounting.sourcePageFetches,
              successfulSourceFetches: Math.min(
                item.accounting.sourcePageFetches,
                item.accounting.sourcePageHttpAttempts,
              ),
              commerceRequests: item.accounting.serperShoppingAttempts,
              commerceRows: 20,
              eligibleCandidates: item.diagnostics.verification.eligible,
              closeMatchCandidates: item.diagnostics.verification.closeMatch,
              excludedCandidates: item.diagnostics.verification.excluded,
            },
            verificationAttribution: verificationAttribution(
              item.diagnostics.verification,
            ),
          },
        ]
      : []),
    ...(completed
      ? [
          {
            stage: "presentation",
            outcome: "completed",
            ledger: ledger(
              "presentation",
              "completed",
              {
                inputTokens: presentationInput,
                cachedInputTokens: 0,
                outputTokens: presentationOutput,
                webSearchCalls: 0,
              },
              15_000,
            ),
          },
        ]
      : []),
  ];
  if (!hasVerification && item.researchFailureAttribution) {
    const terminalResearch = routeDiagnostics.at(-1);
    terminalResearch.ledger.status = "completed";
    terminalResearch.ledger.failureReason = "invalid_research_contract";
    Object.assign(terminalResearch, item.researchFailureAttribution);
  }
  const publicSources = completed
    ? item.sources.map((source) => ({
        id: source.id,
        label: "Research source",
        title: `Reviewed source ${source.id}`,
        url: source.url,
      }))
    : [];
  const body = completed
    ? {
        pipeline: "staged_terra",
        version: "staged-terra-api-v1",
        state: "completed",
        presentationVersion:
          overrides.presentationVersion ?? "staged-terra-presentation-v1",
        cards: item.cards.map((itemCard) =>
          publicCard(itemCard, item.caseId, item.run),
        ),
        sources: publicSources,
        finalAdvice:
          overrides.finalAdvice ?? [
            "Choose only the independently reviewed exact product.",
          ],
      }
    : {
        pipeline: "staged_terra",
        version: "staged-terra-api-v1",
        state: "failed",
        code: item.terminal.code,
        error:
          overrides.failureError ?? failureMessage(item.terminal.code),
      };
  const counters = Object.fromEntries(
    [
      "openAiCreates",
      "openAiRetrieves",
      "hostedSearches",
      "safetyCancels",
      "serperShoppingAttempts",
      "sourcePageFetches",
      "sourcePageHttpAttempts",
      "retries",
      "replacements",
      "fallbacks",
      "serperOrganicAttempts",
      "searchApiAttempts",
      "additionalCases",
    ].map((key) => [key, item.accounting[key]]),
  );
  counters.openAiCreates = completed ? 2 : 1;
  if (!hasVerification) {
    counters.serperShoppingAttempts = 0;
    counters.sourcePageFetches = 0;
    counters.sourcePageHttpAttempts = 0;
  }
  const attempt = value.attemptPlan.find(
    (entry) => entry.key === `${item.caseId}:${item.run}`,
  );
  return buildStagedTerraReadinessArtifact({
    matrix: value,
    caseId: item.caseId,
    run: item.run,
    runId: item.runId,
    attemptNonce: attempt.nonce,
    previousArtifactSha256,
    commitSha: item.commitSha,
    capturedAt: "2026-08-29T12:00:00.000Z",
    terminalResponse: {
      statusCode: item.terminal.statusCode,
      body,
      wallClockMs: item.terminal.wallClockMs,
    },
    routeDiagnostics,
    counters,
    registeredProductTrace:
      overrides.registeredProductTrace ??
      registeredProductTrace(value, item, hasVerification),
  });
}

function artifacts(value, sample = runs(value)) {
  const result = [];
  let previousArtifactSha256 = null;
  for (const item of sample) {
    const artifact = artifactForRun(value, item, previousArtifactSha256);
    result.push(artifact);
    previousArtifactSha256 = createHash("sha256").update(artifact).digest("hex");
  }
  return result;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function resealArtifact(raw, mutate) {
  const envelope = JSON.parse(raw.toString("utf8"));
  mutate(envelope);
  envelope.payloadSha256 = createHash("sha256")
    .update(JSON.stringify(canonicalize(envelope.payload)), "utf8")
    .digest("hex");
  return Buffer.from(`${JSON.stringify(canonicalize(envelope), null, 2)}\n`, "utf8");
}

function resealArtifactChain(rawArtifacts, index, mutate) {
  const result = [...rawArtifacts];
  result[index] = resealArtifact(result[index], mutate);
  for (let next = index + 1; next < result.length; next += 1) {
    const previousHash = createHash("sha256")
      .update(result[next - 1])
      .digest("hex");
    result[next] = resealArtifact(result[next], (envelope) => {
      envelope.payload.previousArtifactSha256 = previousHash;
    });
  }
  return result;
}

function manualReview(value, sample) {
  const artifactHashes = artifacts(value, sample).map((artifact) =>
    createHash("sha256").update(artifact).digest("hex"),
  );
  const productAudits = sample.flatMap((item) =>
    item.cards.map((itemCard) => ({
      caseId: item.caseId,
      run: item.run,
      rank: itemCard.rank,
      exactIdentity: "pass",
      requestedType: "pass",
      hardRequirements: "pass",
      evidenceSupport: "pass",
      requirementExplanations: "pass",
      variantIdentity: "pass",
      specificationClaims: "pass",
      priceOfferBinding:
        itemCard.commerce.state === "verified" ? "pass" : "not_applicable",
      imageIdentity: "pass",
    })),
  );
  const sourceAudits = sample.flatMap((item) =>
    item.cards.map((itemCard) => ({
      caseId: item.caseId,
      run: item.run,
      rank: itemCard.rank,
      sourceIds: [...itemCard.sourceIds],
      status: "pass",
    })),
  );
  const adviceAudits = sample
    .filter((item) => item.terminal.state === "completed")
    .map((item) => ({
      caseId: item.caseId,
      run: item.run,
      status: "pass",
    }));
  const rankingAudits = sample
    .filter((item) => item.terminal.state === "completed")
    .map((item) => ({
      caseId: item.caseId,
      run: item.run,
      topPickSupported: "pass",
      relativeOrderSupported:
        item.cards.length >= 2 ? "pass" : "not_applicable",
      evidenceAndTradeoffsReflected: "pass",
    }));
  return {
    schemaVersion: STAGED_TERRA_READINESS_REVIEW_VERSION,
    matrixVersion: value.schemaVersion,
    matrixSha256: stagedTerraReadinessMatrixSha256(value),
    approvedCommitSha: commitSha,
    artifactSetSha256: createHash("sha256")
      .update(JSON.stringify(artifactHashes), "utf8")
      .digest("hex"),
    reviewer: "Independent Reviewer",
    reviewedAt: "2026-08-29",
    productAudits,
    sourceAudits,
    noExactAudits: [],
    adviceAudits,
    rankingAudits,
  };
}

describe("PR-9B staged Terra readiness boundary", () => {
  it("freezes four distinct shapes, six serial runs, current truth, and absolute bars", () => {
    const value = matrix();
    const retiredMatrices = retiredFixturePaths.map((path) =>
      JSON.parse(readFileSync(path, "utf8")),
    );
    const retired = retiredMatrices.at(-1);
    const result = validateStagedTerraReadinessMatrix(value, {
      now: "2026-08-29",
    });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(value.schemaVersion, STAGED_TERRA_READINESS_MATRIX_VERSION);
    assert.deepEqual(
      value.cases.map((item) => [item.id, item.shape, item.runs]),
      [
        ["broad-shop-vac", "broad", 2],
        ["con-gas-grill-600-4-main-burner", "constrained", 2],
        ["adv-office-chair-350-mesh-lumbar", "adversarial", 1],
        ["over-robot-vac-300-selfempty-pet-cords", "over_constrained", 1],
      ],
    );
    assert.equal(value.runOrder.length, 6);
    assert.equal(value.attemptPlan.length, 6);
    assert.deepEqual(
      value.attemptPlan.map((attempt) => attempt.key),
      value.runOrder,
    );
    assert.equal(new Set(value.attemptPlan.map((attempt) => attempt.runId)).size, 6);
    assert.equal(new Set(value.attemptPlan.map((attempt) => attempt.nonce)).size, 6);
    assert.deepEqual(
      [
        "reviewedAt",
        "expiresAt",
        "truthPolicy",
        "sources",
        "cases",
        "runOrder",
      ].map((key) => value[key]),
      [
        "reviewedAt",
        "expiresAt",
        "truthPolicy",
        "sources",
        "cases",
        "runOrder",
      ].map((key) => retired[key]),
    );
    assert.equal(
      value.attemptPlan.some((attempt) =>
        retiredMatrices.some((retiredMatrix) =>
          retiredMatrix.attemptPlan.some(
            (retiredAttempt) =>
              retiredAttempt.runId === attempt.runId ||
              retiredAttempt.nonce === attempt.nonce,
          ),
        ),
      ),
      false,
    );
    assert.ok(
      value.attemptPlan.every((attempt) => attempt.runId.startsWith("pr9g-")),
    );
    assert.equal(value.qualityBars.minimumPairwiseFinalJaccard, 0.6);
    assert.equal(value.qualityBars.minimumPairwiseSharedOrderKendallTau, 0);
    assert.equal(value.qualityBars.maximumCompletedWallClockMs, 720_000);
    assert.equal(value.qualityBars.maximumEvidenceAgeMs, 86_400_000);
    assert.equal(value.qualityBars.perRunCeilings.conservativeUsd, 1);
    assert.equal(value.qualityBars.aggregateCeilings.conservativeUsd, 6);
    assert.equal(value.qualityBars.aggregateCeilings.openAiCreates, 12);
    assert.equal(value.qualityBars.aggregateCeilings.openAiRetrieves, 360);
    assert.equal(value.qualityBars.aggregateCeilings.hostedSearches, 60);
    assert.equal(value.qualityBars.aggregateCeilings.safetyCancels, 6);
    assert.equal(
      value.qualityBars.aggregateCeilings.serperShoppingAttempts,
      90,
    );
    assert.equal(value.qualityBars.aggregateCeilings.sourcePageFetches, 180);
    assert.equal(
      value.qualityBars.aggregateCeilings.sourcePageHttpAttempts,
      540,
    );
    assert.equal(value.truthPolicy.candidateIdentityJaccard, "not_scored_privacy_boundary");
    const broad = caseById(value, "broad-shop-vac");
    assert.deepEqual(
      broad.mustConsiderProducts.map((product) => product.id),
      ["ridgid-hd1200", "craftsman-cmxevbe17595"],
    );
    assert.ok(
      broad.illustrativeProducts.some(
        (product) =>
          product.id === "dewalt-stealthsonic-12-gallon-family" &&
          product.uncertainty.includes("No cross-model inference is allowed"),
      ),
    );
    assert.deepEqual(broad.mustConsiderProducts[0].sourceIds, [
      "shop-popular-mechanics-ridgid-2026",
      "shop-pro-tool-ridgid-2026",
    ]);
    assert.match(
      value.sources.find(
        (source) => source.id === "shop-popular-mechanics-ridgid-2026",
      ).claim,
      /HD1200.*RT1200/i,
    );
    assert.match(
      value.sources.find((source) => source.id === "shop-pro-tool-ridgid-2026")
        .claim,
      /DX12P-QT/,
    );
  });

  it("freezes the complete truth, source, quality, and attempt registries", () => {
    const value = matrix();
    value.cases[0].mustConsiderProducts[0].modelAliases = ["VACUUM"];
    value.sources[0].claim = "Generic unreviewed claim";
    value.attemptPlan[0].runId = "alternate-precommitted-run";
    const result = validateStagedTerraReadinessMatrix(value, {
      now: "2026-08-29",
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("matrix_registry_hash_mismatch"));
  });

  it("rejects overlapping normalized registered-product aliases", () => {
    const value = matrix();
    const broad = caseById(value, "broad-shop-vac");
    broad.illustrativeProducts[0].brandAliases = [" ridgid "];
    broad.illustrativeProducts[0].modelAliases = [" HD1200 "];

    const result = validateStagedTerraReadinessMatrix(value, {
      now: "2026-08-29",
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.includes(
        "registered_product_registry_invalid:broad-shop-vac",
      ),
    );
  });

  it("requires two independent current sources for every must-consider product", () => {
    const value = matrix();
    const broad = caseById(value, "broad-shop-vac");
    broad.mustConsiderProducts[0].sourceIds = ["grill-nexgrill-720-0925pg"];
    const result = validateStagedTerraReadinessMatrix(value, {
      now: "2026-08-29",
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.includes(
        "must_consider_independent_sources:broad-shop-vac:ridgid-hd1200",
      ),
    );
  });

  it("fails closed when the reviewed truth window expires", () => {
    const result = validateStagedTerraReadinessMatrix(matrix(), {
      now: "2026-09-13",
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("matrix_truth_expired:2026-09-12"));
  });

  it("does not let the versioned matrix weaken its own scope or absolute bars", () => {
    const weakened = matrix();
    weakened.qualityBars.minimumPairwiseFinalJaccard = 0.59;
    weakened.qualityBars.minimumPairwiseSharedOrderKendallTau = -0.01;
    weakened.qualityBars.allowedRetries = 1;
    weakened.qualityBars.perRunCeilings.conservativeUsd = 1.01;
    weakened.cases[0].shopperRequest.query = "easy shop vacuum";
    [weakened.runOrder[0], weakened.runOrder[1]] = [
      weakened.runOrder[1],
      weakened.runOrder[0],
    ];
    const result = validateStagedTerraReadinessMatrix(weakened, {
      now: "2026-08-29",
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("minimum_pairwise_final_jaccard_weakened"));
    assert.ok(
      result.errors.includes(
        "minimum_pairwise_shared_order_kendall_tau_weakened",
      ),
    );
    assert.ok(result.errors.includes("quality_bar_weakened:allowedRetries"));
    assert.ok(result.errors.includes("per_run_ceiling_weakened:conservativeUsd"));
    assert.ok(result.errors.includes("matrix_case_design_drift:broad-shop-vac"));
    assert.ok(result.errors.includes("matrix_run_order_frozen_mismatch"));
  });

  it("needs independent card and source review after every mechanical gate passes", () => {
    const value = matrix();
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(
      result.decision,
      "needs_manual_review",
      result.structuralFailures.join("\n"),
    );
    assert.deepEqual(result.structuralFailures, []);
    assert.deepEqual(result.haltFailures, []);
    assert.deepEqual(result.qualityFailures, []);
    assert.ok(result.pendingManualReview.length > 0);
    assert.equal(result.metrics.candidateIdentityJaccard, "not_scored_privacy_boundary");
    assert.deepEqual(result.metrics.broadMustConsider.perRun, [2, 2]);
    assert.equal(result.metrics.broadMustConsider.union, 2);
    assert.deepEqual(result.metrics.stability.map((item) => item.minimum), [1, 1]);
    assert.deepEqual(
      result.metrics.stability.map((item) => item.sharedOrderKendallTau),
      [[1], [1]],
    );
    assert.equal(result.metrics.latencyMs.mean, 120_000);
    assert.equal(result.metrics.cardReconciliation.totalCards, 12);
    assert.equal(result.metrics.firstLoss.noLossEligible, 12);
    assert.ok(
      result.pendingManualReview.includes("ranking_audit:broad-shop-vac:1"),
    );
    assert.deepEqual(
      result.metrics.registeredProductLineage.find(
        (item) =>
          item.caseId === "broad-shop-vac" &&
          item.run === 1 &&
          item.productId === "ridgid-hd1200",
      ),
      {
        caseId: "broad-shop-vac",
        run: 1,
        productId: "ridgid-hd1200",
        registry: "must_consider",
        validatedResearchCandidates: 1,
        acceptedResearchCandidates: 1,
        verification: {
          eligible: 1,
          closeMatch: 0,
          excluded: 0,
          firstLoss: {
            assetIdentity: 0,
            relationship: 0,
            productUrl: 0,
            hardRequirementFailed: 0,
            hardRequirementNotVerified: 0,
            noLossEligible: 1,
          },
        },
        finalRanks: [1],
        firstLossStage: "displayed",
      },
    );
  });

  it("emits a bounded public review packet without private runtime material", () => {
    const value = matrix();
    const raw = artifacts(value)[0];
    const parsed = parseStagedTerraReadinessArtifact(raw);
    assert.equal(parsed.ok, true);
    const packet = buildStagedTerraReadinessReviewPacket(raw);
    assert.deepEqual(Object.keys(packet), [
      "schemaVersion",
      "artifactSha256",
      "matrixVersion",
      "matrixSha256",
      "commitSha",
      "caseId",
      "run",
      "runId",
      "capturedAt",
      "terminal",
      "finalAdvice",
      "cards",
      "sources",
      "registeredProductTrace",
    ]);
    assert.equal(
      packet.schemaVersion,
      STAGED_TERRA_READINESS_REVIEW_PACKET_VERSION,
    );
    assert.equal(packet.artifactSha256, parsed.artifactSha256);
    assert.deepEqual(packet.cards, parsed.payload.cards);
    assert.deepEqual(packet.sources, parsed.payload.sources);
    assert.deepEqual(packet.finalAdvice, parsed.payload.finalAdvice);
    assert.equal("routeTrace" in packet, false);
    assert.equal("diagnostics" in packet, false);
    assert.equal("verificationAttribution" in packet, false);
    assert.equal("counters" in packet, false);
    assert.equal("usageLedgers" in packet, false);
    assert.equal("attemptNonce" in packet, false);
  });

  it("never machine-authorizes even after a complete exact manual review", () => {
    const value = matrix();
    const sample = runs(value);
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: manualReview(value, sample),
      now: "2026-08-29",
    });
    assert.equal(result.decision, "independent_review_required");
    assert.equal(result.originAuthenticated, false);
    assert.equal(result.machineAuthorization, false);
    assert.equal(result.releaseAuthorized, false);
    assert.equal(result.stopRequired, true);
    assert.deepEqual(result.pendingManualReview, []);
    assert.deepEqual(result.manualReviewFailures, []);
    assert.equal(result.metrics.totalAccounting.openAiCreates, 12);
    assert.equal(result.metrics.totalAccounting.conservativeUsd, 2.744628);
  });

  it("preserves displayed variants while requiring manual variant/trim review", () => {
    const value = matrix();
    const sample = runs(value);
    sample[0].cards[0].identity.variant = "2026 Edition";
    const firstArtifact = artifactForRun(value, sample[0]);
    const parsed = parseStagedTerraReadinessArtifact(firstArtifact);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload.cards[0].identity.variant, "2026 Edition");

    sample[4].cards[0].identity.variant = "Different Variant";
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "needs_manual_review");
    assert.equal(
      result.metrics.variantIdentityMeasurement,
      "manual_variant_trim_evidence_required",
    );
    assert.deepEqual(result.metrics.stability[0].pairwise, [1]);

    const duplicate = completedRun(value, "broad-shop-vac", 1);
    duplicate.cards[0].identity.variant = "Red";
    duplicate.cards[1].identity = {
      ...duplicate.cards[0].identity,
      variant: "Blue",
    };
    const duplicateResult = analyzeStagedTerraReadinessPrefix({
      matrix: value,
      artifacts: [artifactForRun(value, duplicate)],
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.ok(
      duplicateResult.haltFailures.some((item) =>
        item.startsWith("duplicate_card_identity:"),
      ),
    );
  });

  it("measures exact-product rank reversals, partial overlap, sparse overlap, and wording drift", () => {
    const analyzeBroadPair = (secondRunCards) => {
      const value = matrix();
      const sample = runs(value);
      const secondRun = sample.find(
        (item) => item.caseId === "broad-shop-vac" && item.run === 2,
      );
      secondRun.cards = secondRunCards(secondRun.cards).map(
        (itemCard, index) => ({ ...itemCard, rank: index + 1 }),
      );
      const result = analyzeStagedTerraReadiness({
        matrix: value,
        artifacts: artifacts(value, sample),
        approvedCommitSha: commitSha,
        now: "2026-08-29",
      });
      return {
        qualityFailures: result.qualityFailures,
        stability: result.metrics.stability.find(
          (item) => item.caseId === "broad-shop-vac",
        ),
      };
    };

    const reversed = analyzeBroadPair((cards) => [...cards].reverse());
    assert.deepEqual(reversed.stability.pairwise, [1]);
    assert.deepEqual(reversed.stability.sharedOrderKendallTau, [-1]);
    assert.ok(
      reversed.qualityFailures.some((failure) =>
        failure.startsWith("rank_stability:"),
      ),
    );

    const partial = analyzeBroadPair((cards) => {
      const replacement = {
        ...cards[2],
        identity: {
          ...cards[2].identity,
          brand: "Acme",
          productName: "Acme Wet Dry Vacuum",
          model: "A100",
        },
      };
      return [cards[1], cards[0], replacement];
    });
    assert.deepEqual(partial.stability.pairwise, [0.5]);
    assert.deepEqual(partial.stability.sharedOrderKendallTau, [-1]);

    const sparse = analyzeBroadPair((cards) =>
      cards.map((itemCard, index) =>
        index === 0
          ? itemCard
          : {
              ...itemCard,
              identity: {
                ...itemCard.identity,
                brand: "Acme",
                productName: `Acme Wet Dry Vacuum ${index}`,
                model: `A10${index}`,
              },
            },
      ),
    );
    assert.deepEqual(sparse.stability.sharedOrderKendallTau, [null]);
    assert.ok(
      sparse.qualityFailures.some((failure) =>
        failure.startsWith("rank_stability_unscorable:"),
      ),
    );

    const wordingDrift = analyzeBroadPair((cards) =>
      cards.map((itemCard) => ({
        ...itemCard,
        identity: {
          ...itemCard.identity,
          productName: `${itemCard.identity.productName} with accessories`,
        },
      })),
    );
    assert.deepEqual(wordingDrift.stability.pairwise, [1]);
    assert.deepEqual(wordingDrift.stability.sharedOrderKendallTau, [1]);
    assert.equal(
      wordingDrift.qualityFailures.some((failure) =>
        failure.startsWith("rank_stability"),
      ),
      false,
    );
  });

  it("attributes a registered eligible product omitted by presentation", () => {
    const value = matrix();
    const item = completedRun(value, "broad-shop-vac", 1);
    item.cards[0].identity = {
      brand: "Stanley",
      productName: "Stanley Wet Dry Vacuum",
      model: "SL18116P",
      variant: null,
    };
    item.diagnostics.verification.eligible = 4;
    item.diagnostics.verification.excluded = 6;
    item.diagnostics.verification.firstLoss.assetIdentity = 6;
    item.diagnostics.verification.firstLoss.noLossEligible = 4;
    const trace = registeredProductTrace(value, item, true);
    trace.products[0] = {
      ...trace.products[0],
      validatedResearchCandidates: 1,
      acceptedResearchCandidates: 1,
      verification: {
        eligible: 1,
        closeMatch: 0,
        excluded: 0,
        firstLoss: {
          assetIdentity: 0,
          relationship: 0,
          productUrl: 0,
          hardRequirementFailed: 0,
          hardRequirementNotVerified: 0,
          noLossEligible: 1,
        },
      },
    };
    const result = analyzeStagedTerraReadinessPrefix({
      matrix: value,
      artifacts: [
        artifactForRun(value, item, null, {
          registeredProductTrace: trace,
        }),
      ],
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(
      result.metrics.registeredProductLineage.find(
        (product) => product.productId === "ridgid-hd1200",
      ).firstLossStage,
      "presentation_omission",
    );
  });

  it("rejects missing, duplicate, unknown, and matrix-mismatched runs", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      envelope.payload.matrixSha256 = "b".repeat(64);
    });
    sample[4] = Buffer.from(sample[0]);
    sample[5] = resealArtifact(sample[1], (envelope) => {
      envelope.payload.caseId = "unknown-case";
      envelope.payload.run = 9;
      envelope.payload.runId = "unknown-case-run-9";
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(result.structuralFailures.some((item) => item.startsWith("duplicate_run:")));
    assert.ok(result.structuralFailures.some((item) => item.startsWith("missing_run:")));
    assert.ok(result.structuralFailures.some((item) => item.startsWith("unknown_run:")));
    assert.ok(result.structuralFailures.some((item) => item.startsWith("matrix_hash_mismatch:")));
  });

  it("rejects unknown capture fields instead of silently retaining private material", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      envelope.payload.rawProviderResponse = { secret: "must-not-pass" };
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:0:artifact_payload_keys_invalid",
      ),
    );
  });

  it("rejects raw candidate material added to a resealed registered-product trace", () => {
    const value = matrix();
    const canary = "provider-private-candidate-title-canary";
    const mutated = resealArtifact(artifacts(value)[0], (envelope) => {
      envelope.payload.registeredProductTrace.products[0].rawCandidateName =
        canary;
    });
    const parsed = parseStagedTerraReadinessArtifact(mutated);
    assert.equal(parsed.ok, false);
    assert.match(parsed.errors.join("\n"), /registeredProductTrace/);
    assert.doesNotMatch(parsed.errors.join("\n"), new RegExp(canary, "i"));
  });

  it("rejects resealed registered-product totals that exceed aggregate diagnostics", () => {
    const value = matrix();
    const mutated = resealArtifact(artifacts(value)[0], (envelope) => {
      for (const product of envelope.payload.registeredProductTrace.products) {
        product.validatedResearchCandidates = 1;
        product.acceptedResearchCandidates = 1;
        product.verification = {
          eligible: 1,
          closeMatch: 0,
          excluded: 0,
          firstLoss: {
            assetIdentity: 0,
            relationship: 0,
            productUrl: 0,
            hardRequirementFailed: 0,
            hardRequirementNotVerified: 0,
            noLossEligible: 1,
          },
        };
        product.finalRanks = [];
      }
    });

    const parsed = parseStagedTerraReadinessArtifact(mutated);
    assert.equal(parsed.ok, false);
    assert.match(
      parsed.errors.join("\n"),
      /registeredProductTrace\.aggregate\.verification/,
    );

    const researchOvercount = resealArtifact(artifacts(value)[0], (envelope) => {
      for (const product of envelope.payload.registeredProductTrace.products) {
        product.validatedResearchCandidates = 3;
        product.acceptedResearchCandidates = 0;
        product.verification = {
          eligible: 0,
          closeMatch: 0,
          excluded: 0,
          firstLoss: {
            assetIdentity: 0,
            relationship: 0,
            productUrl: 0,
            hardRequirementFailed: 0,
            hardRequirementNotVerified: 0,
            noLossEligible: 0,
          },
        };
        product.finalRanks = [];
      }
    });
    const researchParsed = parseStagedTerraReadinessArtifact(researchOvercount);
    assert.equal(researchParsed.ok, false);
    assert.match(
      researchParsed.errors.join("\n"),
      /registeredProductTrace\.aggregate\.research/,
    );

    const item = completedRun(value, "broad-shop-vac", 1);
    const overcountedTrace = registeredProductTrace(value, item, true);
    for (const product of overcountedTrace.products) {
      product.validatedResearchCandidates = 1;
      product.acceptedResearchCandidates = 1;
      product.verification = {
        eligible: 1,
        closeMatch: 0,
        excluded: 0,
        firstLoss: {
          assetIdentity: 0,
          relationship: 0,
          productUrl: 0,
          hardRequirementFailed: 0,
          hardRequirementNotVerified: 0,
          noLossEligible: 1,
        },
      };
    }
    assert.throws(
      () =>
        artifactForRun(value, item, null, {
          registeredProductTrace: overcountedTrace,
        }),
      /registeredProductTrace\.aggregate\.verification/,
    );
  });

  it("rejects nested private fields, incomparable commits, request drift, and reused artifacts", () => {
    const value = matrix();
    const sample = artifacts(value);
    sample[0] = resealArtifact(sample[0], (envelope) => {
      envelope.payload.cards[0].identity.rawModelResponse = "private";
    });
    sample[1] = resealArtifact(sample[1], (envelope) => {
      envelope.payload.commitSha = "b".repeat(40);
    });
    sample[2] = resealArtifact(sample[2], (envelope) => {
      envelope.payload.requestSha256 = "c".repeat(64);
    });
    sample[3] = Buffer.from(sample[4]);
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(
      result.structuralFailures.some((item) =>
        item.includes("cards.0.identity.keys"),
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "approved_commit_mismatch:con-gas-grill-600-4-main-burner:1",
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "request_hash_mismatch:adv-office-chair-350-mesh-lumbar:1",
      ),
    );
    assert.ok(
      result.structuralFailures.some((item) =>
        item.startsWith("duplicate_artifact_hash:"),
      ),
    );
  });

  it("authenticates canonical artifact bytes, the payload seal, and the approved commit", () => {
    const value = matrix();
    const sample = artifacts(value);
    sample[0] = Buffer.concat([sample[0], Buffer.from(" ", "utf8")]);
    const unsealed = JSON.parse(sample[1].toString("utf8"));
    unsealed.payload.commitSha = "b".repeat(40);
    sample[1] = Buffer.from(
      `${JSON.stringify(canonicalize(unsealed), null, 2)}\n`,
      "utf8",
    );
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:0:artifact_bytes_not_canonical",
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:1:artifact_payload_hash_mismatch",
      ),
    );

    const wrongApproval = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value),
      approvedCommitSha: "b".repeat(40),
      now: "2026-08-29",
    });
    assert.equal(wrongApproval.decision, "invalid");
    assert.ok(
      wrongApproval.structuralFailures.some((item) =>
        item.startsWith("approved_commit_mismatch:"),
      ),
    );
  });

  it("binds precommitted attempt identities and every artifact to the prior artifact", () => {
    const value = matrix();
    const original = artifacts(value);
    const substituted = resealArtifactChain(original, 0, (envelope) => {
      envelope.payload.runId = "unplanned-but-safe-run";
    });
    const substitutedResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: substituted,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(substitutedResult.decision, "invalid");
    assert.ok(
      substitutedResult.structuralFailures.includes("attempt_plan_mismatch:0"),
    );

    const forked = [...original];
    forked[0] = resealArtifact(forked[0], (envelope) => {
      envelope.payload.finalAdvice = ["A different, structurally valid result."];
    });
    const forkedResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: forked,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(forkedResult.decision, "invalid");
    assert.ok(
      forkedResult.structuralFailures.includes("attempt_chain_mismatch:1"),
    );
  });

  it("authenticates the complete prior prefix before planning another paid attempt", () => {
    const value = matrix();
    const matrixBytes = readFileSync(fixturePath);
    const firstArtifact = artifacts(value, runs(value).slice(0, 1));
    const previousArtifactSha256 = createHash("sha256")
      .update(firstArtifact[0])
      .digest("hex");
    const input = {
      matrix: value,
      matrixBytes,
      trustSurface: {
        ok: true,
        manifestSha256: "b".repeat(64),
        entries: [{ path: "scripts/run-staged-terra-readiness.mjs" }],
        failures: [],
      },
      commitSha,
      attemptIndex: 2,
      previousArtifactSha256,
      priorArtifacts: firstArtifact,
      currentDate: "2026-08-29",
      repoRoot: process.cwd(),
    };

    const planned = buildStagedTerraReadinessRunPlan(input);
    assert.deepEqual(planned.priorPrefix, {
      status: "authenticated",
      artifactCount: 1,
      previousArtifactSha256,
      nextRun: "con-gas-grill-600-4-main-burner:1",
    });
    assert.throws(() =>
      buildStagedTerraReadinessRunPlan({
        ...input,
        previousArtifactSha256: "c".repeat(64),
      }),
    );
    assert.throws(() =>
      buildStagedTerraReadinessRunPlan({
        ...input,
        priorArtifacts: [Buffer.from("{}", "utf8")],
      }),
    );
    assert.throws(() =>
      buildStagedTerraReadinessRunPlan({
        ...input,
        attemptIndex: 3,
      }),
    );
  });

  it("retains authenticated aggregate verification subreasons without candidate data", () => {
    const value = matrix();
    const sample = runs(value);
    const parsed = parseStagedTerraReadinessArtifact(
      artifactForRun(value, sample[0]),
    );
    assert.equal(parsed.ok, true);
    assert.deepEqual(
      parsed.ok && parsed.payload.verificationAttribution,
      verificationAttribution(sample[0].diagnostics.verification),
    );

    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.metrics.verificationFailures.length, 6);
    assert.deepEqual(result.metrics.verificationFailures[0], {
      caseId: "broad-shop-vac",
      run: 1,
      ...verificationAttribution(sample[0].diagnostics.verification),
    });
    assert.equal(
      JSON.stringify(result.metrics.verificationFailures).includes("https://"),
      false,
    );
  });

  it("rejects malformed or privacy-expanded verification attribution", () => {
    const value = matrix();
    const original = artifacts(value)[0];
    const mutations = [
      (envelope) => {
        envelope.payload.verificationAttribution.rawCandidate = {
          title: "private-candidate-canary",
        };
      },
      (envelope) => {
        envelope.payload.verificationAttribution.candidateFirstLossCounts
          .assetIdentityUnproven += 1;
      },
      (envelope) => {
        envelope.payload.verificationAttribution.assetIdentityFailureCandidateCounts =
          counts(routeCountKeys.asset, 0);
      },
      (envelope) => {
        envelope.payload.verificationAttribution.assetIdentityFailureCandidateCounts
          .noAssetCandidates =
          envelope.payload.diagnostics.verification.candidates + 1;
      },
      (envelope) => {
        envelope.payload.verificationAttribution = null;
      },
    ];
    for (const mutate of mutations) {
      const parsed = parseStagedTerraReadinessArtifact(
        resealArtifact(original, mutate),
      );
      assert.equal(parsed.ok, false);
      assert.match(parsed.errors.join("\n"), /verificationAttribution/);
      assert.doesNotMatch(
        parsed.errors.join("\n"),
        /private-candidate-canary/,
      );
    }

    const failed = runs(value)[0];
    failed.terminal = {
      state: "failed",
      statusCode: 502,
      code: "research_failed",
      wallClockMs: 10_000,
    };
    failed.cards = [];
    failed.sources = [];
    failed.diagnostics = { research: null, verification: null };
    const researchFailure = resealArtifact(
      artifactForRun(value, failed),
      (envelope) => {
        envelope.payload.verificationAttribution = verificationAttribution(
          runs(value)[0].diagnostics.verification,
        );
      },
    );
    const parsedResearchFailure = parseStagedTerraReadinessArtifact(
      researchFailure,
    );
    assert.equal(parsedResearchFailure.ok, false);
    assert.match(
      parsedResearchFailure.errors.join("\n"),
      /verificationAttribution/,
    );
  });

  it("returns invalid for resealed wrong types, trace, model, or response drift", () => {
    const value = matrix();
    const sample = artifacts(value);
    sample[0] = resealArtifact(sample[0], (envelope) => {
      envelope.payload.cards = {};
    });
    sample[1] = resealArtifact(sample[1], (envelope) => {
      [envelope.payload.routeTrace[0], envelope.payload.routeTrace[1]] = [
        envelope.payload.routeTrace[1],
        envelope.payload.routeTrace[0],
      ];
    });
    sample[2] = resealArtifact(sample[2], (envelope) => {
      envelope.payload.routeTrace[0].ledger.modelRequested = "gpt-5.6-sol";
    });
    sample[3] = resealArtifact(sample[3], (envelope) => {
      envelope.payload.routeTrace[1].ledger.responseIdHash = "d".repeat(64);
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:0:artifact_payload_invalid:cards",
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:1:artifact_payload_invalid:routeTrace.research_start",
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:2:artifact_payload_invalid:routeTrace.0.ledger.modelRequested",
      ),
    );
    assert.ok(
      result.structuralFailures.includes(
        "artifact_invalid:3:artifact_payload_invalid:routeTrace.researchResponseIdHash",
      ),
    );
  });

  it("closes public failures, presentation versions, trace statuses, and failure reasons", () => {
    const value = matrix();
    const firstRun = runs(value)[0];
    assert.throws(
      () =>
        artifactForRun(value, firstRun, null, {
          presentationVersion: "staged-terra-presentation-v999",
        }),
      /terminalResponse\.presentationVersion/,
    );

    const failedRun = structuredClone(firstRun);
    failedRun.terminal = {
      state: "failed",
      statusCode: 502,
      code: "research_failed",
      wallClockMs: 10_000,
    };
    failedRun.cards = [];
    failedRun.sources = [];
    failedRun.diagnostics = { research: null, verification: null };
    assert.throws(
      () =>
        artifactForRun(value, failedRun, null, {
          failureError: "provider-secret-canary",
        }),
      /terminalResponse\.body\.failed\.error/,
    );

    failedRun.researchFailureAttribution = {
      validationReason: "research_candidate_invalid",
      candidateValidationReason: "candidate_sources",
      candidateIdentityValidationReason: null,
      candidateSourceValidationReason: "candidate_source_unregistered",
    };
    const attributed = parseStagedTerraReadinessArtifact(
      artifactForRun(value, failedRun),
    );
    assert.equal(attributed.ok, true);
    assert.deepEqual(
      attributed.ok && attributed.payload.routeTrace.at(-1).failureAttribution,
      failedRun.researchFailureAttribution,
    );
    const invalidAttribution = structuredClone(failedRun);
    invalidAttribution.researchFailureAttribution.validationReason =
      "private-model-output-canary";
    assert.throws(
      () => artifactForRun(value, invalidAttribution),
      /failureAttribution/,
    );
    const invalidInactiveCandidate = structuredClone(failedRun);
    Object.assign(invalidInactiveCandidate.researchFailureAttribution, {
      validationReason: "research_shape",
      candidateValidationReason: "private-model-output-canary",
      candidateIdentityValidationReason: null,
      candidateSourceValidationReason: null,
    });
    assert.throws(
      () => artifactForRun(value, invalidInactiveCandidate),
      /failureAttribution/,
    );
    const invalidInactiveSource = structuredClone(failedRun);
    Object.assign(invalidInactiveSource.researchFailureAttribution, {
      candidateValidationReason: "candidate_identity",
      candidateIdentityValidationReason: "candidate_identity_model_relation",
      candidateSourceValidationReason: "private-model-output-canary",
    });
    assert.throws(
      () => artifactForRun(value, invalidInactiveSource),
      /failureAttribution/,
    );
    const invalidInactiveIdentity = structuredClone(failedRun);
    invalidInactiveIdentity.researchFailureAttribution.candidateIdentityValidationReason =
      "private-model-output-canary";
    assert.throws(
      () => artifactForRun(value, invalidInactiveIdentity),
      /failureAttribution/,
    );
    const invalidActiveIdentity = structuredClone(failedRun);
    Object.assign(invalidActiveIdentity.researchFailureAttribution, {
      candidateValidationReason: "candidate_identity",
      candidateIdentityValidationReason: "private-model-output-canary",
      candidateSourceValidationReason: null,
    });
    assert.throws(
      () => artifactForRun(value, invalidActiveIdentity),
      /failureAttribution/,
    );

    const canary = "provider-secret-canary";
    let statusArtifacts = artifacts(value);
    statusArtifacts = resealArtifactChain(statusArtifacts, 0, (envelope) => {
      envelope.payload.routeTrace[0].ledger.status = canary;
    });
    const statusResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: statusArtifacts,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(statusResult.decision, "invalid");
    assert.match(
      statusResult.structuralFailures.join("\n"),
      /routeTrace\.0\.ledger\.status/,
    );
    assert.equal(JSON.stringify(statusResult).includes(canary), false);

    let reasonArtifacts = artifacts(value);
    reasonArtifacts = resealArtifactChain(reasonArtifacts, 0, (envelope) => {
      const completedResearch = envelope.payload.routeTrace.find(
        (trace) =>
          trace.stage === "research_poll" && trace.outcome === "completed",
      );
      completedResearch.ledger.failureReason = "request_error";
    });
    const reasonResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: reasonArtifacts,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(reasonResult.decision, "invalid");
    assert.match(
      reasonResult.structuralFailures.join("\n"),
      /completed_union/,
    );

    const presentationFailureArtifacts = (failureReason, status, failTrace) => {
      const sample = artifacts(value);
      return resealArtifactChain(sample, 0, (envelope) => {
        envelope.payload.terminal = {
          state: "failed",
          statusCode: 502,
          code: "presentation_failed",
          wallClockMs: envelope.payload.terminal.wallClockMs,
        };
        envelope.payload.presentationVersion = null;
        envelope.payload.finalAdvice = [];
        envelope.payload.cards = [];
        envelope.payload.sources = [];
        const presentation = envelope.payload.routeTrace.find(
          (trace) => trace.stage === "presentation",
        );
        if (failTrace) {
          presentation.outcome = "failed";
          presentation.ledger.outcome = "failed";
          presentation.ledger.status = status;
          presentation.ledger.failureReason = failureReason;
          envelope.payload.usageLedgers[1].outcome = "failed";
        }
      });
    };

    const impossibleUnionResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: presentationFailureArtifacts(
        "request_error",
        "completed",
        true,
      ),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(impossibleUnionResult.decision, "invalid");
    assert.match(
      impossibleUnionResult.structuralFailures.join("\n"),
      /failed_union/,
    );

    const completedPresentationTraceResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: presentationFailureArtifacts(null, null, false),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(completedPresentationTraceResult.decision, "invalid");
    assert.match(
      completedPresentationTraceResult.structuralFailures.join("\n"),
      /presentation_failed_terminal/,
    );

    const validContractFailureResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: presentationFailureArtifacts(
        "invalid_presentation_contract",
        "completed",
        true,
      ),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(validContractFailureResult.decision, "halt");
    assert.deepEqual(validContractFailureResult.structuralFailures, []);
    assert.ok(
      validContractFailureResult.haltFailures.includes(
        "terminal_failure:broad-shop-vac:1:presentation_failed",
      ),
    );
  });

  it("rejects malformed accounting and halts on diagnostic conservation drift", () => {
    const value = matrix();
    const retiredDeferral = runs(value)[0];
    retiredDeferral.diagnostics.research.deferredMissingTitle = 1;
    assert.throws(
      () => artifactForRun(value, retiredDeferral),
      /identitySourceFilter\.missing_title_deferral_retired/,
    );

    const malformed = artifacts(value);
    malformed[0] = resealArtifact(malformed[0], (envelope) => {
      envelope.payload.usageLedgers[0].inputTokens = 1.5;
    });
    const malformedResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: malformed,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(malformedResult.decision, "invalid");
    assert.ok(
      malformedResult.structuralFailures.some(
        (item) => item.includes("usageLedgers.0.inputTokens"),
      ),
    );

    const inconsistentResearch = resealArtifactChain(
      artifacts(value),
      0,
      (envelope) => {
        envelope.payload.diagnostics.research.rejected = 1;
      },
    );
    const inconsistentResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: inconsistentResearch,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(inconsistentResult.decision, "halt");
    assert.ok(
      inconsistentResult.haltFailures.includes(
        "research_conservation:broad-shop-vac:1",
      ),
    );

    const inconsistentVerification = artifacts(value);
    inconsistentVerification[1] = resealArtifact(
      inconsistentVerification[1],
      (envelope) => {
        envelope.payload.diagnostics.verification.firstLoss.assetIdentity += 1;
      },
    );
    const invalidVerificationResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: inconsistentVerification,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(invalidVerificationResult.decision, "invalid");
    assert.ok(
      invalidVerificationResult.structuralFailures.some((item) =>
        item.includes("verificationAttribution"),
      ),
    );
  });

  it("halts on wrong type, hard-requirement, budget, or source-binding failure", () => {
    const value = matrix();
    const sample = runs(value);
    sample[0].cards[0].identity.productName = "RIDGID Replacement Hose";
    sample[1].cards[0].requirementChecks[1].status = "Needs verification";
    sample[2].cards[0].commerce.priceAmount = 351;
    sample[3].cards[0].sourceIds.push("missing-source");
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(result.haltFailures.some((item) => item.startsWith("wrong_type_card:")));
    assert.ok(result.haltFailures.some((item) => item.startsWith("hard_requirement_not_pass:")));
    assert.ok(result.haltFailures.some((item) => item.startsWith("budget_violation:")));
    assert.ok(result.haltFailures.some((item) => item.startsWith("unregistered_source_reference:")));
  });

  it("cannot inflate broad-case commerce coverage with an unbound offer", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      const card = envelope.payload.cards[0];
      card.commerce = {
        state: "verified",
        priceAmount: 199,
        currency: "USD",
        seller: "Unbound Seller",
        productUrl: "https://unbound.example.com/product/ridgid-hd1200",
        availability: "in_stock",
        observedAt: "2026-08-29T12:00:00.000Z",
        sourceIds: [card.sourceIds[0]],
      };
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.haltFailures.includes("commerce_union_invalid:broad-shop-vac:1:1"),
    );
  });

  it("halts when a completed artifact claims zero provider usage or cost", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      envelope.payload.counters.hostedSearches = 0;
      for (const usage of envelope.payload.usageLedgers) {
        usage.inputTokens = 0;
        usage.cachedInputTokens = 0;
        usage.outputTokens = 0;
        usage.webSearchCalls = 0;
      }
      for (const trace of envelope.payload.routeTrace) {
        if (!trace.ledger) continue;
        trace.ledger.inputTokens = 0;
        trace.ledger.cachedInputTokens = 0;
        trace.ledger.outputTokens = 0;
        trace.ledger.webSearchCalls = 0;
      }
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.haltFailures.includes("accounting_reconciliation:broad-shop-vac:1"),
    );
  });

  it("requires positive usage from each completed research and presentation call", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      const presentationUsage = envelope.payload.usageLedgers[1];
      presentationUsage.inputTokens = 0;
      presentationUsage.cachedInputTokens = 0;
      presentationUsage.outputTokens = 0;
      const presentationTrace = envelope.payload.routeTrace.find(
        (trace) => trace.stage === "presentation",
      );
      presentationTrace.ledger.inputTokens = 0;
      presentationTrace.ledger.cachedInputTokens = 0;
      presentationTrace.ledger.outputTokens = 0;
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.haltFailures.includes(
        "terminal_usage_reconciliation:broad-shop-vac:1",
      ),
    );
  });

  it("binds cards and verified offers to positive evidence and shopping activity", () => {
    const value = matrix();
    let sample = artifacts(value);
    sample = resealArtifactChain(sample, 0, (envelope) => {
      envelope.payload.diagnostics.verification.sourceFetchAttempts = 0;
      envelope.payload.diagnostics.verification.successfulSourceFetches = 0;
      envelope.payload.counters.sourcePageFetches = 0;
      envelope.payload.counters.sourcePageHttpAttempts = 0;
    });
    sample = resealArtifactChain(sample, 1, (envelope) => {
      envelope.payload.diagnostics.verification.commerceRequests = 0;
      envelope.payload.diagnostics.verification.commerceRows = 0;
      envelope.payload.counters.serperShoppingAttempts = 0;
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: sample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.haltFailures.includes("card_evidence_activity_missing:broad-shop-vac:1"),
    );
    assert.ok(
      result.haltFailures.includes(
        "commerce_activity_missing:con-gas-grill-600-4-main-burner:1",
      ),
    );
  });

  it("halts on any retry, forbidden fallback, or per-run safety ceiling breach", () => {
    const value = matrix();
    const sample = runs(value);
    sample[0].accounting.retries = 1;
    sample[1].accounting.serperOrganicAttempts = 1;
    sample[2].accounting.openAiRetrieves = 61;
    sample[3].accounting.sourcePageHttpAttempts = 91;
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(result.haltFailures.some((item) => item.startsWith("retries_exceeded:")));
    assert.ok(result.haltFailures.some((item) => item.startsWith("serper_organic_exceeded:")));
    assert.ok(result.haltFailures.some((item) => item.startsWith("run_ceiling_exceeded:")));
  });

  it("reconciles stage time, enforces a latency bar, and rejects stale or future evidence", () => {
    const value = matrix();
    const latencyRuns = runs(value);
    latencyRuns[0].terminal.wallClockMs = 0;
    latencyRuns[1].terminal.wallClockMs = 100;
    latencyRuns[2].terminal.wallClockMs = 720_001;
    const latencyResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, latencyRuns),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(latencyResult.decision, "halt");
    assert.ok(
      latencyResult.haltFailures.includes("wall_clock_not_positive:broad-shop-vac:1"),
    );
    assert.ok(
      latencyResult.haltFailures.some((failure) =>
        failure.startsWith(
          "stage_time_exceeds_wall_clock:con-gas-grill-600-4-main-burner:1:",
        ),
      ),
    );
    assert.ok(
      latencyResult.qualityFailures.includes(
        "latency_exceeded:adv-office-chair-350-mesh-lumbar:1:720001:720000",
      ),
    );

    let futureEvidence = artifacts(value);
    futureEvidence = resealArtifactChain(futureEvidence, 0, (envelope) => {
      envelope.payload.cards[0].identityVerification.observedAt =
        "2026-08-29T12:00:00.001Z";
    });
    const futureResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: futureEvidence,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(futureResult.decision, "invalid");
    assert.match(
      futureResult.structuralFailures.join("\n"),
      /identityVerification\.observedAt/,
    );

    let staleEvidence = artifacts(value);
    staleEvidence = resealArtifactChain(staleEvidence, 1, (envelope) => {
      envelope.payload.cards[0].commerce.observedAt =
        "2026-08-28T11:59:59.999Z";
    });
    const staleResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: staleEvidence,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(staleResult.decision, "invalid");
    assert.match(
      staleResult.structuralFailures.join("\n"),
      /commerce\.observedAt/,
    );
  });

  it("fails quality without weakening safety when recall, card count, or stability misses", () => {
    const value = matrix();
    const sample = runs(value);
    sample[0].cards = sample[0].cards.slice(0, 1);
    sample[0].diagnostics.verification.eligible = 1;
    sample[0].diagnostics.verification.excluded = 9;
    sample[0].diagnostics.verification.firstLoss.assetIdentity = 9;
    sample[0].diagnostics.verification.firstLoss.noLossEligible = 1;
    sample[4].cards[0].identity = {
      brand: "Stanley",
      productName: "Stanley Wet Dry Vacuum",
      model: "SL18116P",
      variant: null,
    };
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: manualReview(value, sample),
      now: "2026-08-29",
    });
    assert.equal(result.decision, "fail");
    assert.ok(result.qualityFailures.some((item) => item.startsWith("minimum_cards:")));
    assert.ok(result.qualityFailures.some((item) => item.startsWith("broad_recall_run:")));
    assert.ok(result.qualityFailures.some((item) => item.startsWith("final_jaccard:")));
  });

  it("does not count attached, spaced, or hyphenated sibling suffixes as exact recall", () => {
    for (const siblingModel of ["HD1200B", "HD1200 B", "HD1200-B"]) {
      const value = matrix();
      const sample = runs(value);
      sample[0].cards[0].identity.model = siblingModel;
      sample[0].cards[0].identity.productName =
        `RIDGID NXT 12 Gallon Wet Dry Vacuum ${siblingModel}`;
      const result = analyzeStagedTerraReadiness({
        matrix: value,
        artifacts: artifacts(value, sample),
        approvedCommitSha: commitSha,
        now: "2026-08-29",
      });
      assert.equal(result.decision, "fail", siblingModel);
      assert.equal(result.metrics.broadMustConsider.perRun[0], 1, siblingModel);
      assert.ok(
        result.qualityFailures.includes(
          "broad_recall_run:broad-shop-vac:1:1:2",
        ),
        siblingModel,
      );
    }
  });

  it("validates each exact serial prefix and stops before a later paid run", () => {
    const value = matrix();
    const sample = runs(value);
    const first = analyzeStagedTerraReadinessPrefix({
      matrix: value,
      artifacts: artifacts(value, sample.slice(0, 1)),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(first.decision, "next_attempt_review_required");
    assert.equal(first.stopRequired, true);
    assert.equal(first.machineAuthorization, false);
    assert.equal(first.nextRun, "con-gas-grill-600-4-main-burner:1");

    sample[0].cards[0].identity.productName = "RIDGID Replacement Hose";
    const unsafe = analyzeStagedTerraReadinessPrefix({
      matrix: value,
      artifacts: artifacts(value, sample.slice(0, 1)),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(unsafe.decision, "halt");
    assert.equal(unsafe.stopRequired, true);
    assert.equal(unsafe.nextRun, null);
  });

  it("rejects non-public and credential-shaped URLs before artifact creation", () => {
    const value = matrix();
    for (const url of [
      "https://127.0.0.1/private",
      "https://192.0.2.1/documentation-only",
      "https://localhost./private",
      "https://source.example/product",
      "https://source.example.com/product?session_token=secret",
      "https://source.example.com/product?accessToken=secret",
      "https://source.example.com/product#access_token=provider-private-canary",
      "https://source.example.com/product#sessionToken=provider-private-canary",
    ]) {
      const sample = runs(value);
      sample[0].sources[0].url = url;
      assert.throws(
        () => artifactForRun(value, sample[0]),
        /public\.sources\.0\.url/,
        url,
      );
    }
  });

  it("treats an expected over-constrained no-exact stop as safe evidence but a quality failure", () => {
    const value = matrix();
    const sample = runs(value);
    const target = sample.find(
      (item) => item.caseId === "over-robot-vac-300-selfempty-pet-cords",
    );
    target.terminal = {
      state: "failed",
      statusCode: 502,
      code: "verification_failed",
      wallClockMs: 95_000,
    };
    target.cards = [];
    target.sources = [];
    target.diagnostics.verification.eligible = 0;
    target.diagnostics.verification.closeMatch = 1;
    target.diagnostics.verification.excluded = 9;
    target.diagnostics.verification.firstLoss.assetIdentity = 9;
    target.diagnostics.verification.firstLoss.hardRequirementNotVerified = 1;
    target.diagnostics.verification.firstLoss.noLossEligible = 0;
    const review = manualReview(value, sample);
    review.noExactAudits.push({
      caseId: target.caseId,
      run: target.run,
      status: "safe_but_unusable",
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: review,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "fail");
    assert.deepEqual(result.haltFailures, []);
    assert.ok(
      result.qualityFailures.includes(
        "safe_no_exact_not_user_usable:over-robot-vac-300-selfempty-pet-cords:1",
      ),
    );
  });

  it("halts on a terminal failure outside the one reviewed no-exact policy", () => {
    const value = matrix();
    const sample = runs(value);
    sample[0].terminal = {
      state: "failed",
      statusCode: 502,
      code: "research_failed",
      wallClockMs: 10_000,
    };
    sample[0].cards = [];
    sample[0].sources = [];
    sample[0].diagnostics = { research: null, verification: null };
    sample[0].researchFailureAttribution = {
      validationReason: "research_candidate_invalid",
      candidateValidationReason: "candidate_identity",
      candidateIdentityValidationReason: "candidate_identity_model_relation",
      candidateSourceValidationReason: null,
    };
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.haltFailures.includes("terminal_failure:broad-shop-vac:1:research_failed"),
    );
    assert.deepEqual(result.metrics.routeFailures, [
      {
        caseId: "broad-shop-vac",
        run: 1,
        stage: "research_poll",
        status: "completed",
        failureReason: "invalid_research_contract",
        validationReason: "research_candidate_invalid",
        candidateValidationReason: "candidate_identity",
        candidateIdentityValidationReason: "candidate_identity_model_relation",
        candidateSourceValidationReason: null,
      },
    ]);
  });

  it("does not misclassify an un-attributed verification exception as safe no-exact", () => {
    const value = matrix();
    const sample = runs(value);
    const target = sample.find(
      (item) => item.caseId === "over-robot-vac-300-selfempty-pet-cords",
    );
    target.terminal = {
      state: "failed",
      statusCode: 502,
      code: "verification_failed",
      wallClockMs: 95_000,
    };
    target.cards = [];
    target.sources = [];
    target.diagnostics.verification.eligible = 0;
    target.diagnostics.verification.excluded = 10;
    target.diagnostics.verification.firstLoss.assetIdentity = 10;
    target.diagnostics.verification.firstLoss.noLossEligible = 0;
    let artifactSample = artifacts(value, sample);
    artifactSample = resealArtifactChain(artifactSample, 3, (envelope) => {
      envelope.payload.diagnostics.verification = null;
      envelope.payload.routeTrace = envelope.payload.routeTrace.filter(
        (trace) => trace.stage !== "verification",
      );
    });
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifactSample,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "invalid");
    assert.ok(
      result.structuralFailures.some((failure) =>
        failure.includes("registeredProductTrace.aggregate.verification"),
      ),
    );
    assert.equal(result.metrics.safeNoExactRuns, 0);
  });

  it("does not accept incomplete, duplicate, or extra manual authority", () => {
    const value = matrix();
    const sample = runs(value);
    const review = manualReview(value, sample);
    review.productAudits.pop();
    review.productAudits.push(structuredClone(review.productAudits[0]));
    review.productAudits.push({
      ...structuredClone(review.productAudits[0]),
      caseId: "unknown-case",
    });
    review.adviceAudits.pop();
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: review,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "fail");
    assert.ok(result.manualReviewFailures.some((item) => item.startsWith("duplicate_product_audit:")));
    assert.ok(result.manualReviewFailures.some((item) => item.startsWith("unknown_product_audit:")));
    assert.ok(result.manualReviewFailures.some((item) => item.startsWith("missing_product_audit:")));
    assert.ok(result.manualReviewFailures.some((item) => item.startsWith("missing_advice_audit:")));
  });

  it("retains requirement, specification, ranking, and advice checks for bound human review", () => {
    const value = matrix();
    let missingExplanation = artifacts(value);
    missingExplanation = resealArtifactChain(
      missingExplanation,
      0,
      (envelope) => {
        delete envelope.payload.cards[0].requirementChecks[0].explanation;
      },
    );
    const explanationResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: missingExplanation,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(explanationResult.decision, "invalid");
    assert.match(
      explanationResult.structuralFailures.join("\n"),
      /requirementChecks\.0\.keys/,
    );

    let missingAdvice = artifacts(value);
    missingAdvice = resealArtifactChain(missingAdvice, 0, (envelope) => {
      delete envelope.payload.finalAdvice;
    });
    const adviceProjectionResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: missingAdvice,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(adviceProjectionResult.decision, "invalid");
    assert.ok(
      adviceProjectionResult.structuralFailures.includes(
        "artifact_invalid:0:artifact_payload_keys_invalid",
      ),
    );

    const sample = runs(value);
    const failedReview = manualReview(value, sample);
    failedReview.productAudits[0].requirementExplanations = "fail";
    failedReview.productAudits[0].variantIdentity = "fail";
    failedReview.productAudits[0].specificationClaims = "fail";
    failedReview.adviceAudits[0].status = "fail";
    failedReview.rankingAudits[0].topPickSupported = "fail";
    const failedReviewResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: failedReview,
      now: "2026-08-29",
    });
    assert.equal(failedReviewResult.decision, "halt");
    assert.ok(
      failedReviewResult.haltFailures.includes(
        "product_audit_failed:broad-shop-vac:1:1:requirementExplanations",
      ),
    );
    assert.ok(
      failedReviewResult.haltFailures.includes(
        "advice_audit_failed:broad-shop-vac:1",
      ),
    );
    assert.ok(
      failedReviewResult.haltFailures.includes(
        "product_audit_failed:broad-shop-vac:1:1:specificationClaims",
      ),
    );
    assert.ok(
      failedReviewResult.haltFailures.includes(
        "product_audit_failed:broad-shop-vac:1:1:variantIdentity",
      ),
    );
    assert.ok(
      failedReviewResult.haltFailures.includes(
        "ranking_audit_failed:broad-shop-vac:1:topPickSupported",
      ),
    );

    const optionalVariantReview = manualReview(value, sample);
    optionalVariantReview.productAudits[0].variantIdentity = "not_applicable";
    const optionalVariantResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: optionalVariantReview,
      now: "2026-08-29",
    });
    assert.ok(
      optionalVariantResult.manualReviewFailures.includes(
        "product_audit_value_invalid:broad-shop-vac:1:1:variantIdentity",
      ),
    );
  });

  it("rejects unsafe identifiers and arbitrary audit values without echoing canaries", () => {
    const value = matrix();
    const canary = "secret/token=provider-private-canary";
    let unsafeRun = artifacts(value);
    unsafeRun = resealArtifactChain(unsafeRun, 0, (envelope) => {
      envelope.payload.runId = canary;
    });
    const unsafeRunResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: unsafeRun,
      approvedCommitSha: commitSha,
      now: "2026-08-29",
    });
    assert.equal(unsafeRunResult.decision, "invalid");
    assert.equal(JSON.stringify(unsafeRunResult).includes(canary), false);

    const sample = runs(value);
    const unsafeReview = manualReview(value, sample);
    unsafeReview.productAudits[0].exactIdentity = canary;
    const unsafeReviewResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: unsafeReview,
      now: "2026-08-29",
    });
    assert.equal(unsafeReviewResult.decision, "fail");
    assert.ok(
      unsafeReviewResult.manualReviewFailures.includes(
        "product_audit_value_invalid:broad-shop-vac:1:1:exactIdentity",
      ),
    );
    assert.equal(JSON.stringify(unsafeReviewResult).includes(canary), false);
  });

  it("binds manual authority to the exact commit and artifact set and halts failed trust audits", () => {
    const value = matrix();
    const sample = runs(value);
    const mismatched = manualReview(value, sample);
    mismatched.artifactSetSha256 = "c".repeat(64);
    const mismatchResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: mismatched,
      now: "2026-08-29",
    });
    assert.equal(mismatchResult.decision, "fail");
    assert.ok(
      mismatchResult.manualReviewFailures.includes(
        "manual_review_artifact_set_mismatch",
      ),
    );

    const failedAudit = manualReview(value, sample);
    failedAudit.productAudits[0].exactIdentity = "fail";
    const failedResult = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: failedAudit,
      now: "2026-08-29",
    });
    assert.equal(failedResult.decision, "halt");
    assert.ok(
      failedResult.haltFailures.includes(
        "product_audit_failed:broad-shop-vac:1:1:exactIdentity",
      ),
    );
  });

  it("does not accept future-dated review or a source audit outside the card binding", () => {
    const value = matrix();
    const sample = runs(value);
    const review = manualReview(value, sample);
    review.reviewedAt = "2026-08-30";
    review.sourceAudits[0].sourceIds = ["not-on-card"];
    const result = analyzeStagedTerraReadiness({
      matrix: value,
      artifacts: artifacts(value, sample),
      approvedCommitSha: commitSha,
      manualReview: review,
      now: "2026-08-29",
    });
    assert.equal(result.decision, "halt");
    assert.ok(
      result.manualReviewFailures.includes("manual_review_in_future:2026-08-30"),
    );
    assert.ok(
      result.haltFailures.includes(
        "source_audit_binding_invalid:broad-shop-vac:1:1",
      ),
    );
  });
});

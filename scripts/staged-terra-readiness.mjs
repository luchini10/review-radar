import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  isConservativePublicHttpsUrl,
  parseStagedTerraReadinessArtifact,
  stagedTerraReadinessAccounting,
  STAGED_TERRA_READINESS_COUNTER_KEYS,
  STAGED_TERRA_READINESS_FIRST_LOSS_KEYS,
  STAGED_TERRA_READINESS_VERIFICATION_KEYS,
} from "./staged-terra-readiness-artifact.mjs";
import {
  STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
  STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
  stagedTerraRegisteredProductMatchesIdentity,
  stagedTerraRegisteredProducts,
} from "./staged-terra-readiness-trace.mjs";

export {
  buildStagedTerraReadinessArtifact,
  parseStagedTerraReadinessArtifact,
} from "./staged-terra-readiness-artifact.mjs";

export const STAGED_TERRA_READINESS_MATRIX_VERSION =
  "staged-terra-readiness-matrix-v2";
export const STAGED_TERRA_READINESS_CAPTURE_VERSION =
  "staged-terra-readiness-capture-v2";
export const STAGED_TERRA_READINESS_REVIEW_VERSION =
  "staged-terra-readiness-review-v3";
const FROZEN_MATRIX_SHA256 =
  "4959f977d56fb43c58714a5caaeb63c8c16fb290a0d74d04551eefe2e2f3d5e1";

const MATRIX_KEYS = [
  "schemaVersion",
  "reviewedAt",
  "expiresAt",
  "truthPolicy",
  "qualityBars",
  "runOrder",
  "attemptPlan",
  "sources",
  "cases",
];
const TRUTH_POLICY_KEYS = [
  "mustConsiderMinimumIndependentSources",
  "priceClaimsAreIllustrativeOnly",
  "retailerRankIsTruth",
  "singleEditorialListIsTruth",
  "candidateIdentityJaccard",
  "candidateIdentityJaccardReason",
];
const QUALITY_BAR_KEYS = [
  "minimumPairwiseFinalJaccard",
  "minimumPairwiseSharedOrderKendallTau",
  "maximumWrongTypeCards",
  "maximumHardRequirementFailures",
  "maximumBudgetViolations",
  "maximumUnregisteredSourceReferences",
  "minimumBroadMustConsiderPerRun",
  "minimumBroadMustConsiderUnion",
  "maximumCompletedWallClockMs",
  "maximumEvidenceAgeMs",
  "perRunCeilings",
  "aggregateCeilings",
  "allowedRetries",
  "allowedReplacements",
  "allowedFallbacks",
  "allowedSerperOrganicAttempts",
  "allowedSearchApiAttempts",
  "allowedAdditionalCases",
];
const CEILING_KEYS = [
  "openAiCreates",
  "openAiRetrieves",
  "hostedSearches",
  "safetyCancels",
  "serperShoppingAttempts",
  "sourcePageFetches",
  "sourcePageHttpAttempts",
  "conservativeUsd",
];
const SOURCE_KEYS = [
  "id",
  "publisher",
  "url",
  "sourceClass",
  "independent",
  "retrievedAt",
  "claim",
];
const CASE_KEYS = [
  "id",
  "shape",
  "runs",
  "shopperRequest",
  "requirementIds",
  "completionPolicy",
  "minimumCards",
  "maximumCards",
  "maximumVerifiedPriceUsd",
  "forbiddenIdentityTerms",
  "mustConsiderProducts",
  "illustrativeProducts",
  "sourceIds",
];
const REQUEST_KEYS = ["query", "budget", "priorities", "avoid", "selectedFeatures"];
const TRUTH_PRODUCT_KEYS = [
  "id",
  "brandAliases",
  "modelAliases",
  "sourceIds",
  "rationale",
  "uncertainty",
];
const ATTEMPT_PLAN_KEYS = ["index", "key", "runId", "nonce"];
const RUN_KEYS = [
  "schemaVersion",
  "matrixVersion",
  "matrixSha256",
  "caseId",
  "run",
  "runId",
  "attemptIndex",
  "attemptNonce",
  "previousArtifactSha256",
  "commitSha",
  "requestSha256",
  "artifactSha256",
  "capturedAt",
  "terminal",
  "presentationVersion",
  "finalAdvice",
  "cards",
  "sources",
  "registeredProductTrace",
  "diagnostics",
  "accounting",
  "stageTimings",
  "terminalUsage",
];
const TERMINAL_KEYS = ["state", "statusCode", "code", "wallClockMs"];
const CAPTURE_SOURCE_KEYS = ["id", "label", "title", "url"];
const DIAGNOSTIC_KEYS = ["research", "verification"];
const RESEARCH_DIAGNOSTIC_KEYS = [
  "submitted",
  "accepted",
  "deferredMissingTitle",
  "rejected",
];
const VERIFICATION_DIAGNOSTIC_KEYS = [
  ...STAGED_TERRA_READINESS_VERIFICATION_KEYS,
];
const FIRST_LOSS_KEYS = [
  "assetIdentity",
  "relationship",
  "productUrl",
  "hardRequirementFailed",
  "hardRequirementNotVerified",
  "noLossEligible",
];
const REGISTERED_PRODUCT_TRACE_KEYS = ["schemaVersion", "products"];
const REGISTERED_PRODUCT_TRACE_PRODUCT_KEYS = [
  "id",
  "registry",
  "validatedResearchCandidates",
  "acceptedResearchCandidates",
  "verification",
  "finalRanks",
];
const REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS = [
  "eligible",
  "closeMatch",
  "excluded",
  "firstLoss",
];
if (
  JSON.stringify(FIRST_LOSS_KEYS) !==
  JSON.stringify(STAGED_TERRA_READINESS_FIRST_LOSS_KEYS)
) {
  throw new Error("staged_readiness_first_loss_contract_drift");
}
const CARD_KEYS = [
  "rank",
  "key",
  "recommendationStatus",
  "identity",
  "identityVerification",
  "requirementChecks",
  "commerce",
  "sourceIds",
  "reviewEvidence",
];
const IDENTITY_KEYS = ["brand", "productName", "model", "variant"];
const IDENTITY_VERIFICATION_KEYS = ["state", "observedAt"];
const REQUIREMENT_CHECK_KEYS = ["id", "status", "explanation", "sourceIds"];
const COMMERCE_KEYS = [
  "state",
  "priceAmount",
  "currency",
  "seller",
  "productUrl",
  "availability",
  "observedAt",
  "sourceIds",
];
const REVIEW_EVIDENCE_KEYS = ["assessment", "pros", "cons", "claims", "image"];
const REVIEW_ASSESSMENT_KEYS = ["why", "bestFor", "mainTradeoff"];
const REVIEW_POINT_KEYS = ["text", "sourceIds"];
const REVIEW_CLAIM_KEYS = ["claimType", "text", "sourceIds", "evidenceScope"];
const REVIEW_IMAGE_KEYS = ["state", "url"];
const ACCOUNTING_KEYS = [
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
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "webSearchCalls",
  "conservativeUsd",
];
const STAGE_TIMING_KEYS = ["operation", "outcome", "durationMs"];
const TERMINAL_USAGE_KEYS = [
  "operation",
  "outcome",
  "durationMs",
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "webSearchCalls",
];
if (
  JSON.stringify(ACCOUNTING_KEYS.slice(0, STAGED_TERRA_READINESS_COUNTER_KEYS.length)) !==
  JSON.stringify(STAGED_TERRA_READINESS_COUNTER_KEYS)
) {
  throw new Error("staged_readiness_accounting_contract_drift");
}
const REVIEW_KEYS = [
  "schemaVersion",
  "matrixVersion",
  "matrixSha256",
  "approvedCommitSha",
  "artifactSetSha256",
  "reviewer",
  "reviewedAt",
  "productAudits",
  "sourceAudits",
  "noExactAudits",
  "adviceAudits",
  "rankingAudits",
];
const PRODUCT_AUDIT_KEYS = [
  "caseId",
  "run",
  "rank",
  "exactIdentity",
  "requestedType",
  "hardRequirements",
  "evidenceSupport",
  "requirementExplanations",
  "variantIdentity",
  "specificationClaims",
  "priceOfferBinding",
  "imageIdentity",
];
const SOURCE_AUDIT_KEYS = [
  "caseId",
  "run",
  "rank",
  "sourceIds",
  "status",
];
const NO_EXACT_AUDIT_KEYS = ["caseId", "run", "status"];
const ADVICE_AUDIT_KEYS = ["caseId", "run", "status"];
const RANKING_AUDIT_KEYS = [
  "caseId",
  "run",
  "topPickSupported",
  "relativeOrderSupported",
  "evidenceAndTradeoffsReflected",
];
const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_40 = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const ATTEMPT_NONCE = /^nonce-[0-9a-f]{64}$/;
const DATE_STAMP = /^\d{4}-\d{2}-\d{2}$/;
const FROZEN_RUN_ORDER = [
  "broad-shop-vac:1",
  "con-gas-grill-600-4-main-burner:1",
  "adv-office-chair-350-mesh-lumbar:1",
  "over-robot-vac-300-selfempty-pet-cords:1",
  "broad-shop-vac:2",
  "con-gas-grill-600-4-main-burner:2",
];
const FROZEN_CASE_DESIGNS = {
  "broad-shop-vac": {
    shape: "broad",
    runs: 2,
    shopperRequest: { query: "shop vac" },
    requirementIds: ["market_us"],
    completionPolicy: "required",
    minimumCards: 3,
    maximumCards: 5,
    maximumVerifiedPriceUsd: null,
    forbiddenIdentityTerms: [
      "air purifier",
      "canister vacuum",
      "replacement filter",
      "vacuum filter",
      "handheld vacuum",
      "replacement hose",
      "vacuum hose",
      "robot vacuum",
      "stick vacuum",
      "upright vacuum",
    ],
  },
  "con-gas-grill-600-4-main-burner": {
    shape: "constrained",
    runs: 2,
    shopperRequest: {
      query: "gas grill",
      budget: "under $600",
      priorities: "at least 4 main burners, propane",
    },
    requirementIds: ["market_us", "budget", "important_details"],
    completionPolicy: "required",
    minimumCards: 2,
    maximumCards: 5,
    maximumVerifiedPriceUsd: 600,
    forbiddenIdentityTerms: [
      "charcoal grill",
      "electric grill",
      "griddle",
      "natural gas",
      "pellet grill",
      "smoker",
    ],
  },
  "adv-office-chair-350-mesh-lumbar": {
    shape: "adversarial",
    runs: 1,
    shopperRequest: {
      query: "office chair",
      budget: "under $350",
      priorities: "lumbar support, breathable mesh back",
      avoid: "gaming chair, drafting stool",
    },
    requirementIds: [
      "market_us",
      "budget",
      "important_details",
      "dealbreakers",
    ],
    completionPolicy: "required",
    minimumCards: 1,
    maximumCards: 5,
    maximumVerifiedPriceUsd: 350,
    forbiddenIdentityTerms: [
      "bar stool",
      "drafting chair",
      "drafting stool",
      "gaming chair",
      "kneeling chair",
      "saddle stool",
    ],
  },
  "over-robot-vac-300-selfempty-pet-cords": {
    shape: "over_constrained",
    runs: 1,
    shopperRequest: {
      query: "robot vacuum",
      budget: "under $300",
      priorities: "self-emptying, good for pet hair, avoids power cords",
    },
    requirementIds: ["market_us", "budget", "important_details"],
    completionPolicy: "safe_no_exact_allowed",
    minimumCards: 0,
    maximumCards: 5,
    maximumVerifiedPriceUsd: 300,
    forbiddenIdentityTerms: [
      "canister vacuum",
      "handheld vacuum",
      "shop vac",
      "stick vacuum",
      "upright vacuum",
      "wet dry vacuum",
    ],
  },
};
const MAXIMUM_APPROVED_CEILINGS = {
  perRun: {
    openAiCreates: 2,
    openAiRetrieves: 60,
    hostedSearches: 10,
    safetyCancels: 1,
    serperShoppingAttempts: 15,
    sourcePageFetches: 30,
    sourcePageHttpAttempts: 90,
    conservativeUsd: 1,
  },
  aggregate: {
    openAiCreates: 12,
    openAiRetrieves: 360,
    hostedSearches: 60,
    safetyCancels: 6,
    serperShoppingAttempts: 90,
    sourcePageFetches: 180,
    sourcePageHttpAttempts: 540,
    conservativeUsd: 6,
  },
};
const MAXIMUM_APPROVED_COMPLETED_WALL_CLOCK_MS = 720_000;
const MAXIMUM_APPROVED_EVIDENCE_AGE_MS = 86_400_000;
const EXPECTED_PRESENTATION_VERSION = "staged-terra-presentation-v1";
const AUDIT_PASS_FAIL = new Set(["pass", "fail"]);
const AUDIT_OPTIONAL_BINDING = new Set(["pass", "fail", "not_applicable"]);
const NO_EXACT_AUDIT_VALUES = new Set([
  "safe_but_unusable",
  "unsafe_or_uncertain",
]);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isNonNegativeFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDateStamp(value) {
  if (!isNonEmptyString(value) || !DATE_STAMP.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateStamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return isDateStamp(value) ? value : null;
}

function isIsoDateTime(value) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function evidenceFreshAtCapture(observedAt, capturedAt, maximumAgeMs) {
  if (!isIsoDateTime(observedAt) || !isIsoDateTime(capturedAt)) return false;
  const observedMs = Date.parse(observedAt);
  const capturedMs = Date.parse(capturedAt);
  return observedMs <= capturedMs && capturedMs - observedMs <= maximumAgeMs;
}

function daysBetween(left, right) {
  const leftMs = new Date(`${left}T00:00:00.000Z`).getTime();
  const rightMs = new Date(`${right}T00:00:00.000Z`).getTime();
  return Math.round((rightMs - leftMs) / 86_400_000);
}

function isHttpsUrl(value) {
  return isConservativePublicHttpsUrl(value);
}

function hasUniqueNonEmptyStrings(values) {
  return (
    Array.isArray(values) &&
    values.every(isNonEmptyString) &&
    new Set(values).size === values.length
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalSha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

function sameCanonicalValue(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export function stagedTerraReadinessMatrixSha256(matrix) {
  return canonicalSha256(matrix);
}

export function stagedTerraReadinessRequestSha256(request) {
  return canonicalSha256(request);
}

function validateStringArray(value, label, errors, { allowEmpty = false } = {}) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    !value.every(isNonEmptyString) ||
    new Set(value).size !== value.length
  ) {
    errors.push(`${label}_invalid`);
  }
}

function validateTruthProduct(product, label, errors) {
  if (!hasExactKeys(product, TRUTH_PRODUCT_KEYS)) {
    errors.push(`truth_product_keys_invalid:${label}`);
    return;
  }
  if (!isNonEmptyString(product.id)) errors.push(`truth_product_id_invalid:${label}`);
  validateStringArray(product.brandAliases, `truth_product_brand_aliases:${label}`, errors);
  validateStringArray(product.modelAliases, `truth_product_model_aliases:${label}`, errors);
  validateStringArray(product.sourceIds, `truth_product_sources:${label}`, errors);
  if (!isNonEmptyString(product.rationale)) {
    errors.push(`truth_product_rationale_invalid:${label}`);
  }
  if (product.uncertainty !== null && !isNonEmptyString(product.uncertainty)) {
    errors.push(`truth_product_uncertainty_invalid:${label}`);
  }
}

export function validateStagedTerraReadinessMatrix(
  matrix,
  { now = new Date() } = {},
) {
  const errors = [];
  const currentDate = dateStamp(now);
  if (!currentDate) errors.push("matrix_now_invalid");
  if (!hasExactKeys(matrix, MATRIX_KEYS)) {
    errors.push("matrix_keys_invalid");
    return { ok: false, errors };
  }
  if (stagedTerraReadinessMatrixSha256(matrix) !== FROZEN_MATRIX_SHA256) {
    errors.push("matrix_registry_hash_mismatch");
  }
  if (matrix.schemaVersion !== STAGED_TERRA_READINESS_MATRIX_VERSION) {
    errors.push(`matrix_version_invalid:${String(matrix.schemaVersion)}`);
  }
  if (!isDateStamp(matrix.reviewedAt)) errors.push("matrix_reviewed_at_invalid");
  if (!isDateStamp(matrix.expiresAt)) errors.push("matrix_expires_at_invalid");
  if (isDateStamp(matrix.reviewedAt) && isDateStamp(matrix.expiresAt)) {
    const windowDays = daysBetween(matrix.reviewedAt, matrix.expiresAt);
    if (windowDays < 0 || windowDays > 14) {
      errors.push(`matrix_truth_window_invalid:${windowDays}`);
    }
    if (currentDate && currentDate < matrix.reviewedAt) {
      errors.push(`matrix_truth_not_yet_reviewed:${matrix.reviewedAt}`);
    }
    if (currentDate && currentDate > matrix.expiresAt) {
      errors.push(`matrix_truth_expired:${matrix.expiresAt}`);
    }
  }

  if (!hasExactKeys(matrix.truthPolicy, TRUTH_POLICY_KEYS)) {
    errors.push("truth_policy_keys_invalid");
  } else {
    if (
      !Number.isSafeInteger(matrix.truthPolicy.mustConsiderMinimumIndependentSources) ||
      matrix.truthPolicy.mustConsiderMinimumIndependentSources < 2
    ) {
      errors.push("truth_policy_independent_minimum_invalid");
    }
    if (matrix.truthPolicy.priceClaimsAreIllustrativeOnly !== true) {
      errors.push("truth_policy_price_claims_must_be_illustrative");
    }
    if (matrix.truthPolicy.retailerRankIsTruth !== false) {
      errors.push("truth_policy_retailer_rank_must_not_be_truth");
    }
    if (matrix.truthPolicy.singleEditorialListIsTruth !== false) {
      errors.push("truth_policy_single_editorial_must_not_be_truth");
    }
    if (
      matrix.truthPolicy.candidateIdentityJaccard !==
      "not_scored_privacy_boundary"
    ) {
      errors.push("truth_policy_candidate_jaccard_invalid");
    }
    if (!isNonEmptyString(matrix.truthPolicy.candidateIdentityJaccardReason)) {
      errors.push("truth_policy_candidate_jaccard_reason_invalid");
    }
  }

  if (!hasExactKeys(matrix.qualityBars, QUALITY_BAR_KEYS)) {
    errors.push("quality_bars_keys_invalid");
  } else {
    const bars = matrix.qualityBars;
    if (
      !isNonNegativeFinite(bars.minimumPairwiseFinalJaccard) ||
      bars.minimumPairwiseFinalJaccard > 1
    ) {
      errors.push("minimum_pairwise_final_jaccard_invalid");
    }
    if (bars.minimumPairwiseFinalJaccard < 0.6) {
      errors.push("minimum_pairwise_final_jaccard_weakened");
    }
    if (
      !Number.isFinite(bars.minimumPairwiseSharedOrderKendallTau) ||
      bars.minimumPairwiseSharedOrderKendallTau < -1 ||
      bars.minimumPairwiseSharedOrderKendallTau > 1
    ) {
      errors.push("minimum_pairwise_shared_order_kendall_tau_invalid");
    } else if (bars.minimumPairwiseSharedOrderKendallTau < 0) {
      errors.push("minimum_pairwise_shared_order_kendall_tau_weakened");
    }
    for (const key of [
      "maximumWrongTypeCards",
      "maximumHardRequirementFailures",
      "maximumBudgetViolations",
      "maximumUnregisteredSourceReferences",
      "minimumBroadMustConsiderPerRun",
      "minimumBroadMustConsiderUnion",
      "allowedRetries",
      "allowedReplacements",
      "allowedFallbacks",
      "allowedSerperOrganicAttempts",
      "allowedSearchApiAttempts",
      "allowedAdditionalCases",
    ]) {
      if (!isNonNegativeInteger(bars[key])) errors.push(`quality_bar_invalid:${key}`);
    }
    for (const key of [
      "maximumWrongTypeCards",
      "maximumHardRequirementFailures",
      "maximumBudgetViolations",
      "maximumUnregisteredSourceReferences",
      "allowedRetries",
      "allowedReplacements",
      "allowedFallbacks",
      "allowedSerperOrganicAttempts",
      "allowedSearchApiAttempts",
      "allowedAdditionalCases",
    ]) {
      if (bars[key] !== 0) errors.push(`quality_bar_weakened:${key}`);
    }
    if (bars.minimumBroadMustConsiderPerRun < 2) {
      errors.push("quality_bar_weakened:minimumBroadMustConsiderPerRun");
    }
    if (bars.minimumBroadMustConsiderUnion < 2) {
      errors.push("quality_bar_weakened:minimumBroadMustConsiderUnion");
    }
    if (
      !Number.isSafeInteger(bars.maximumCompletedWallClockMs) ||
      bars.maximumCompletedWallClockMs <= 0 ||
      bars.maximumCompletedWallClockMs >
        MAXIMUM_APPROVED_COMPLETED_WALL_CLOCK_MS
    ) {
      errors.push("quality_bar_invalid:maximumCompletedWallClockMs");
    }
    if (
      !Number.isSafeInteger(bars.maximumEvidenceAgeMs) ||
      bars.maximumEvidenceAgeMs <= 0 ||
      bars.maximumEvidenceAgeMs > MAXIMUM_APPROVED_EVIDENCE_AGE_MS
    ) {
      errors.push("quality_bar_invalid:maximumEvidenceAgeMs");
    }
    for (const [label, ceilings] of [
      ["per_run", bars.perRunCeilings],
      ["aggregate", bars.aggregateCeilings],
    ]) {
      if (!hasExactKeys(ceilings, CEILING_KEYS)) {
        errors.push(`${label}_ceilings_keys_invalid`);
        continue;
      }
      for (const key of CEILING_KEYS) {
        if (!isNonNegativeFinite(ceilings[key])) {
          errors.push(`${label}_ceiling_invalid:${key}`);
        } else {
          const approved =
            MAXIMUM_APPROVED_CEILINGS[
              label === "per_run" ? "perRun" : "aggregate"
            ][key];
          if (ceilings[key] > approved) {
            errors.push(`${label}_ceiling_weakened:${key}`);
          }
        }
      }
    }
  }

  const sourceById = new Map();
  const publisherKeyBySourceId = new Map();
  const sourceUrls = new Set();
  if (!Array.isArray(matrix.sources) || matrix.sources.length === 0) {
    errors.push("matrix_sources_invalid");
  } else {
    for (const [index, source] of matrix.sources.entries()) {
      const label = isPlainObject(source) && isNonEmptyString(source.id)
        ? source.id
        : String(index);
      if (!hasExactKeys(source, SOURCE_KEYS)) {
        errors.push(`matrix_source_keys_invalid:${label}`);
        continue;
      }
      if (!isNonEmptyString(source.id)) errors.push(`matrix_source_id_invalid:${label}`);
      if (sourceById.has(source.id)) errors.push(`duplicate_matrix_source:${source.id}`);
      sourceById.set(source.id, source);
      if (!isNonEmptyString(source.publisher)) {
        errors.push(`matrix_source_publisher_invalid:${source.id}`);
      } else {
        publisherKeyBySourceId.set(source.id, source.publisher.trim().toLowerCase());
      }
      if (!isHttpsUrl(source.url)) errors.push(`matrix_source_url_invalid:${source.id}`);
      if (sourceUrls.has(source.url)) errors.push(`duplicate_matrix_source_url:${source.id}`);
      sourceUrls.add(source.url);
      if (!isNonEmptyString(source.sourceClass)) {
        errors.push(`matrix_source_class_invalid:${source.id}`);
      }
      if (typeof source.independent !== "boolean") {
        errors.push(`matrix_source_independence_invalid:${source.id}`);
      }
      if (
        !["independent_test", "manufacturer"].includes(source.sourceClass) ||
        (source.sourceClass === "independent_test") !== source.independent
      ) {
        errors.push(`matrix_source_class_independence_mismatch:${source.id}`);
      }
      if (!isDateStamp(source.retrievedAt)) {
        errors.push(`matrix_source_retrieved_at_invalid:${source.id}`);
      } else if (isDateStamp(matrix.reviewedAt) && source.retrievedAt > matrix.reviewedAt) {
        errors.push(`matrix_source_after_review:${source.id}`);
      }
      if (!isNonEmptyString(source.claim)) errors.push(`matrix_source_claim_invalid:${source.id}`);
    }
  }

  const caseById = new Map();
  const productIds = new Set();
  if (!Array.isArray(matrix.cases) || matrix.cases.length === 0) {
    errors.push("matrix_cases_invalid");
  } else {
    for (const [index, testCase] of matrix.cases.entries()) {
      const label = isPlainObject(testCase) && isNonEmptyString(testCase.id)
        ? testCase.id
        : String(index);
      if (!hasExactKeys(testCase, CASE_KEYS)) {
        errors.push(`matrix_case_keys_invalid:${label}`);
        continue;
      }
      if (!isNonEmptyString(testCase.id)) errors.push(`matrix_case_id_invalid:${label}`);
      if (caseById.has(testCase.id)) errors.push(`duplicate_matrix_case:${testCase.id}`);
      caseById.set(testCase.id, testCase);
      const frozenDesign = FROZEN_CASE_DESIGNS[testCase.id];
      if (!frozenDesign) {
        errors.push(`matrix_case_not_frozen:${testCase.id}`);
      } else {
        const observedDesign = Object.fromEntries(
          Object.keys(frozenDesign).map((key) => [key, testCase[key]]),
        );
        if (!sameCanonicalValue(observedDesign, frozenDesign)) {
          errors.push(`matrix_case_design_drift:${testCase.id}`);
        }
      }
      if (!["broad", "constrained", "adversarial", "over_constrained"].includes(testCase.shape)) {
        errors.push(`matrix_case_shape_invalid:${testCase.id}`);
      }
      if (!Number.isSafeInteger(testCase.runs) || testCase.runs < 1) {
        errors.push(`matrix_case_runs_invalid:${testCase.id}`);
      }
      if (!isPlainObject(testCase.shopperRequest)) {
        errors.push(`matrix_case_request_invalid:${testCase.id}`);
      } else {
        const requestKeys = Object.keys(testCase.shopperRequest);
        if (
          requestKeys.some((key) => !REQUEST_KEYS.includes(key)) ||
          !isNonEmptyString(testCase.shopperRequest.query) ||
          requestKeys.some((key) => !isNonEmptyString(testCase.shopperRequest[key]))
        ) {
          errors.push(`matrix_case_request_invalid:${testCase.id}`);
        }
      }
      validateStringArray(
        testCase.requirementIds,
        `matrix_case_requirements:${testCase.id}`,
        errors,
      );
      if (!["required", "safe_no_exact_allowed"].includes(testCase.completionPolicy)) {
        errors.push(`matrix_case_completion_policy_invalid:${testCase.id}`);
      }
      if (!isNonNegativeInteger(testCase.minimumCards)) {
        errors.push(`matrix_case_minimum_cards_invalid:${testCase.id}`);
      }
      if (
        !isNonNegativeInteger(testCase.maximumCards) ||
        testCase.maximumCards < testCase.minimumCards
      ) {
        errors.push(`matrix_case_maximum_cards_invalid:${testCase.id}`);
      }
      if (
        testCase.maximumVerifiedPriceUsd !== null &&
        (!isNonNegativeFinite(testCase.maximumVerifiedPriceUsd) ||
          testCase.maximumVerifiedPriceUsd === 0)
      ) {
        errors.push(`matrix_case_maximum_price_invalid:${testCase.id}`);
      }
      validateStringArray(
        testCase.forbiddenIdentityTerms,
        `matrix_case_forbidden_terms:${testCase.id}`,
        errors,
      );
      validateStringArray(
        testCase.sourceIds,
        `matrix_case_sources:${testCase.id}`,
        errors,
      );
      for (const sourceId of Array.isArray(testCase.sourceIds) ? testCase.sourceIds : []) {
        if (!sourceById.has(sourceId)) {
          errors.push(`matrix_case_source_unknown:${testCase.id}:${sourceId}`);
        }
      }

      for (const [kind, products] of [
        ["must_consider", testCase.mustConsiderProducts],
        ["illustrative", testCase.illustrativeProducts],
      ]) {
        if (!Array.isArray(products)) {
          errors.push(`${kind}_products_invalid:${testCase.id}`);
          continue;
        }
        for (const [productIndex, product] of products.entries()) {
          const productLabel =
            isPlainObject(product) && isNonEmptyString(product.id)
              ? product.id
              : String(productIndex);
          validateTruthProduct(product, `${testCase.id}:${productLabel}`, errors);
          if (!isPlainObject(product)) continue;
          if (productIds.has(product.id)) errors.push(`duplicate_truth_product:${product.id}`);
          productIds.add(product.id);
          for (const sourceId of Array.isArray(product.sourceIds) ? product.sourceIds : []) {
            if (!sourceById.has(sourceId)) {
              errors.push(`truth_product_source_unknown:${testCase.id}:${product.id}:${sourceId}`);
            }
            if (Array.isArray(testCase.sourceIds) && !testCase.sourceIds.includes(sourceId)) {
              errors.push(`truth_product_source_outside_case:${testCase.id}:${product.id}:${sourceId}`);
            }
          }
          if (kind === "must_consider" && isPlainObject(matrix.truthPolicy)) {
            const publishers = new Set(
              (Array.isArray(product.sourceIds) ? product.sourceIds : [])
                .filter((sourceId) => sourceById.get(sourceId)?.independent === true)
                .map((sourceId) => publisherKeyBySourceId.get(sourceId))
                .filter(Boolean),
            );
            if (
              publishers.size <
              matrix.truthPolicy.mustConsiderMinimumIndependentSources
            ) {
              errors.push(`must_consider_independent_sources:${testCase.id}:${product.id}`);
            }
          }
        }
      }
      try {
        stagedTerraRegisteredProducts(testCase);
      } catch {
        errors.push(`registered_product_registry_invalid:${testCase.id}`);
      }
    }
  }

  if (!hasUniqueNonEmptyStrings(matrix.runOrder)) {
    errors.push("matrix_run_order_invalid");
  } else {
    const expected = [];
    for (const testCase of matrix.cases || []) {
      if (!isPlainObject(testCase) || !Number.isSafeInteger(testCase.runs)) continue;
      for (let run = 1; run <= testCase.runs; run += 1) {
        expected.push(`${testCase.id}:${run}`);
      }
    }
    for (const key of matrix.runOrder) {
      const separator = key.lastIndexOf(":");
      const caseId = separator > 0 ? key.slice(0, separator) : "";
      const run = separator > 0 ? Number(key.slice(separator + 1)) : Number.NaN;
      const testCase = caseById.get(caseId);
      if (!testCase || !Number.isSafeInteger(run) || run < 1 || run > testCase.runs) {
        errors.push(`matrix_run_order_unknown:${key}`);
      }
    }
    for (const key of expected) {
      if (!matrix.runOrder.includes(key)) errors.push(`matrix_run_order_missing:${key}`);
    }
    if (matrix.runOrder.length !== expected.length) {
      errors.push(`matrix_run_order_count:${matrix.runOrder.length}:${expected.length}`);
    }
    if (!sameCanonicalValue(matrix.runOrder, FROZEN_RUN_ORDER)) {
      errors.push("matrix_run_order_frozen_mismatch");
    }
  }
  if (
    !Array.isArray(matrix.attemptPlan) ||
    matrix.attemptPlan.length !== FROZEN_RUN_ORDER.length
  ) {
    errors.push("matrix_attempt_plan_invalid");
  } else {
    const runIds = new Set();
    const nonces = new Set();
    for (const [index, attempt] of matrix.attemptPlan.entries()) {
      if (!hasExactKeys(attempt, ATTEMPT_PLAN_KEYS)) {
        errors.push(`matrix_attempt_plan_keys_invalid:${index}`);
        continue;
      }
      if (attempt.index !== index + 1) {
        errors.push(`matrix_attempt_plan_index_invalid:${index}`);
      }
      if (attempt.key !== matrix.runOrder?.[index]) {
        errors.push(`matrix_attempt_plan_order_invalid:${index}`);
      }
      if (!SAFE_ID.test(attempt.runId) || runIds.has(attempt.runId)) {
        errors.push(`matrix_attempt_plan_run_id_invalid:${index}`);
      }
      runIds.add(attempt.runId);
      if (!ATTEMPT_NONCE.test(attempt.nonce) || nonces.has(attempt.nonce)) {
        errors.push(`matrix_attempt_plan_nonce_invalid:${index}`);
      }
      nonces.add(attempt.nonce);
    }
  }
  for (const caseId of Object.keys(FROZEN_CASE_DESIGNS)) {
    if (!caseById.has(caseId)) errors.push(`matrix_frozen_case_missing:${caseId}`);
  }

  const uniqueErrors = Array.from(new Set(errors));
  return { ok: uniqueErrors.length === 0, errors: uniqueErrors };
}

function captureKey(run) {
  return `${String(run?.caseId)}:${String(run?.run)}`;
}

function validateRegisteredProductTraceSchema(trace, fail) {
  if (trace === null) return;
  if (
    !hasExactKeys(trace, REGISTERED_PRODUCT_TRACE_KEYS) ||
    trace.schemaVersion !== STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION ||
    !Array.isArray(trace.products) ||
    trace.products.length > 32
  ) {
    fail("registeredProductTrace");
    return;
  }
  const ids = new Set();
  for (const [index, product] of trace.products.entries()) {
    const path = `registeredProductTrace.${index}`;
    if (!hasExactKeys(product, REGISTERED_PRODUCT_TRACE_PRODUCT_KEYS)) {
      fail(`${path}.keys`);
      continue;
    }
    if (!SAFE_ID.test(product.id) || ids.has(product.id)) fail(`${path}.id`);
    ids.add(product.id);
    if (!["must_consider", "illustrative"].includes(product.registry)) {
      fail(`${path}.registry`);
    }
    if (
      !isNonNegativeInteger(product.validatedResearchCandidates) ||
      product.validatedResearchCandidates > 15 ||
      !isNonNegativeInteger(product.acceptedResearchCandidates) ||
      product.acceptedResearchCandidates >
        product.validatedResearchCandidates
    ) {
      fail(`${path}.researchCounts`);
    }
    if (product.verification !== null) {
      if (
        !hasExactKeys(
          product.verification,
          REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS,
        )
      ) {
        fail(`${path}.verification.keys`);
      } else {
        const verification = product.verification;
        if (
          ![
            verification.eligible,
            verification.closeMatch,
            verification.excluded,
          ].every(isNonNegativeInteger) ||
          verification.eligible +
            verification.closeMatch +
            verification.excluded !==
            product.acceptedResearchCandidates ||
          !hasExactKeys(
            verification.firstLoss,
            STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
          ) ||
          !STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every((key) =>
            isNonNegativeInteger(verification.firstLoss[key]),
          )
        ) {
          fail(`${path}.verification`);
        }
      }
    }
    if (
      !Array.isArray(product.finalRanks) ||
      product.finalRanks.length !== new Set(product.finalRanks).size ||
      !product.finalRanks.every(
        (rank) => Number.isSafeInteger(rank) && rank >= 1 && rank <= 5,
      )
    ) {
      fail(`${path}.finalRanks`);
    }
  }
}

function validateCaptureSchema(run, key, failures) {
  if (!hasExactKeys(run, RUN_KEYS)) {
    failures.push(`run_keys_invalid:${key}`);
    return false;
  }
  let valid = true;
  const fail = (field) => {
    failures.push(`run_contract_invalid:${key}:${field}`);
    valid = false;
  };
  if (run.schemaVersion !== STAGED_TERRA_READINESS_CAPTURE_VERSION) fail("schemaVersion");
  if (run.matrixVersion !== STAGED_TERRA_READINESS_MATRIX_VERSION) fail("matrixVersion");
  if (!HEX_64.test(run.matrixSha256)) fail("matrixSha256");
  if (!SAFE_ID.test(run.caseId)) fail("caseId");
  if (!Number.isSafeInteger(run.run) || run.run < 1) fail("run");
  if (!SAFE_ID.test(run.runId)) fail("runId");
  if (!Number.isSafeInteger(run.attemptIndex) || run.attemptIndex < 1) {
    fail("attemptIndex");
  }
  if (!ATTEMPT_NONCE.test(run.attemptNonce)) fail("attemptNonce");
  if (
    run.previousArtifactSha256 !== null &&
    !HEX_64.test(run.previousArtifactSha256)
  ) {
    fail("previousArtifactSha256");
  }
  if (!HEX_40.test(run.commitSha)) fail("commitSha");
  if (!HEX_64.test(run.requestSha256)) fail("requestSha256");
  if (!HEX_64.test(run.artifactSha256)) fail("artifactSha256");
  if (!isIsoDateTime(run.capturedAt)) fail("capturedAt");

  if (!hasExactKeys(run.terminal, TERMINAL_KEYS)) {
    fail("terminal_keys");
  } else {
    if (!isNonEmptyString(run.terminal.state)) fail("terminal.state");
    if (!Number.isSafeInteger(run.terminal.statusCode)) fail("terminal.statusCode");
    if (run.terminal.code !== null && !isNonEmptyString(run.terminal.code)) {
      fail("terminal.code");
    }
    if (!isNonNegativeInteger(run.terminal.wallClockMs)) fail("terminal.wallClockMs");
  }

  if (run.terminal?.state === "completed") {
    if (run.presentationVersion !== EXPECTED_PRESENTATION_VERSION) {
      fail("presentationVersion");
    }
    if (
      !Array.isArray(run.finalAdvice) ||
      run.finalAdvice.length > 5 ||
      !run.finalAdvice.every(isNonEmptyString)
    ) {
      fail("finalAdvice");
    }
  } else if (run.presentationVersion !== null || !Array.isArray(run.finalAdvice) || run.finalAdvice.length !== 0) {
    fail("failedPresentationProjection");
  }

  if (!Array.isArray(run.cards)) {
    fail("cards");
  } else {
    for (const [index, card] of run.cards.entries()) {
      const rank = isPlainObject(card) ? card.rank : index + 1;
      if (!hasExactKeys(card, CARD_KEYS)) {
        fail(`card.${rank}.keys`);
        continue;
      }
      if (!Number.isSafeInteger(card.rank) || card.rank < 1) fail(`card.${rank}.rank`);
      if (!isNonEmptyString(card.key)) fail(`card.${rank}.key`);
      if (!isNonEmptyString(card.recommendationStatus)) {
        fail(`card.${rank}.recommendationStatus`);
      }
      if (!hasExactKeys(card.identity, IDENTITY_KEYS)) {
        fail(`card.${rank}.identity_keys`);
      } else {
        for (const field of ["brand", "productName", "model"]) {
          if (!isNonEmptyString(card.identity[field])) fail(`card.${rank}.identity.${field}`);
        }
        if (
          card.identity.variant !== null &&
          !isNonEmptyString(card.identity.variant)
        ) {
          fail(`card.${rank}.identity.variant`);
        }
      }
      if (!hasExactKeys(card.identityVerification, IDENTITY_VERIFICATION_KEYS)) {
        fail(`card.${rank}.identityVerification_keys`);
      } else {
        if (card.identityVerification.state !== "verified") {
          fail(`card.${rank}.identityVerification.state`);
        }
        if (!isIsoDateTime(card.identityVerification.observedAt)) {
          fail(`card.${rank}.identityVerification.observedAt`);
        }
      }
      if (!Array.isArray(card.requirementChecks)) {
        fail(`card.${rank}.requirementChecks`);
      } else {
        for (const [checkIndex, check] of card.requirementChecks.entries()) {
          if (!hasExactKeys(check, REQUIREMENT_CHECK_KEYS)) {
            fail(`card.${rank}.requirementCheck.${checkIndex}.keys`);
            continue;
          }
          if (!isNonEmptyString(check.id)) fail(`card.${rank}.requirementCheck.${checkIndex}.id`);
          if (!isNonEmptyString(check.status)) {
            fail(`card.${rank}.requirementCheck.${checkIndex}.status`);
          }
          if (!isNonEmptyString(check.explanation)) {
            fail(`card.${rank}.requirementCheck.${checkIndex}.explanation`);
          }
          if (!hasUniqueNonEmptyStrings(check.sourceIds)) {
            fail(`card.${rank}.requirementCheck.${checkIndex}.sourceIds`);
          }
        }
      }
      if (!hasExactKeys(card.commerce, COMMERCE_KEYS)) {
        fail(`card.${rank}.commerce_keys`);
      } else {
        if (card.commerce.state === "verified") {
          if (!isNonNegativeFinite(card.commerce.priceAmount) || card.commerce.priceAmount === 0) {
            fail(`card.${rank}.commerce.priceAmount`);
          }
          if (card.commerce.currency !== "USD") fail(`card.${rank}.commerce.currency`);
          if (!isNonEmptyString(card.commerce.seller)) fail(`card.${rank}.commerce.seller`);
          if (!isHttpsUrl(card.commerce.productUrl)) fail(`card.${rank}.commerce.productUrl`);
          if (card.commerce.availability !== "in_stock") {
            fail(`card.${rank}.commerce.availability`);
          }
          if (
            !isNonEmptyString(card.commerce.observedAt) ||
            Number.isNaN(Date.parse(card.commerce.observedAt))
          ) {
            fail(`card.${rank}.commerce.observedAt`);
          }
          if (!hasUniqueNonEmptyStrings(card.commerce.sourceIds)) {
            fail(`card.${rank}.commerce.sourceIds`);
          }
        } else if (card.commerce.state === "not_verified") {
          for (const field of [
            "priceAmount",
            "currency",
            "seller",
            "productUrl",
            "availability",
            "observedAt",
          ]) {
            if (card.commerce[field] !== null) fail(`card.${rank}.commerce.${field}`);
          }
          if (!Array.isArray(card.commerce.sourceIds) || card.commerce.sourceIds.length !== 0) {
            fail(`card.${rank}.commerce.sourceIds`);
          }
        } else {
          fail(`card.${rank}.commerce.state`);
        }
      }
      if (!hasUniqueNonEmptyStrings(card.sourceIds)) fail(`card.${rank}.sourceIds`);
      if (!hasExactKeys(card.reviewEvidence, REVIEW_EVIDENCE_KEYS)) {
        fail(`card.${rank}.reviewEvidence_keys`);
      } else {
        if (!hasExactKeys(card.reviewEvidence.assessment, REVIEW_ASSESSMENT_KEYS)) {
          fail(`card.${rank}.reviewEvidence.assessment_keys`);
        }
        const points = [
          ...REVIEW_ASSESSMENT_KEYS.map(
            (field) => card.reviewEvidence.assessment?.[field],
          ),
          ...(Array.isArray(card.reviewEvidence.pros) ? card.reviewEvidence.pros : []),
          ...(Array.isArray(card.reviewEvidence.cons) ? card.reviewEvidence.cons : []),
        ];
        if (!Array.isArray(card.reviewEvidence.pros)) fail(`card.${rank}.reviewEvidence.pros`);
        if (!Array.isArray(card.reviewEvidence.cons)) fail(`card.${rank}.reviewEvidence.cons`);
        for (const [pointIndex, point] of points.entries()) {
          if (
            !hasExactKeys(point, REVIEW_POINT_KEYS) ||
            !isNonEmptyString(point.text) ||
            !hasUniqueNonEmptyStrings(point.sourceIds)
          ) {
            fail(`card.${rank}.reviewEvidence.point.${pointIndex}`);
          }
        }
        if (!Array.isArray(card.reviewEvidence.claims)) {
          fail(`card.${rank}.reviewEvidence.claims`);
        } else {
          for (const [claimIndex, claim] of card.reviewEvidence.claims.entries()) {
            if (
              !hasExactKeys(claim, REVIEW_CLAIM_KEYS) ||
              !isNonEmptyString(claim.claimType) ||
              !isNonEmptyString(claim.text) ||
              !hasUniqueNonEmptyStrings(claim.sourceIds) ||
              !isNonEmptyString(claim.evidenceScope)
            ) {
              fail(`card.${rank}.reviewEvidence.claim.${claimIndex}`);
            }
          }
        }
        const image = card.reviewEvidence.image;
        if (
          !hasExactKeys(image, REVIEW_IMAGE_KEYS) ||
          !(
            (image.state === "verified" && isHttpsUrl(image.url)) ||
            (image.state === "not_verified" && image.url === null)
          )
        ) {
          fail(`card.${rank}.reviewEvidence.image`);
        }
      }
    }
  }

  validateRegisteredProductTraceSchema(run.registeredProductTrace, fail);

  if (!Array.isArray(run.sources)) {
    fail("sources");
  } else {
    for (const [index, source] of run.sources.entries()) {
      if (!hasExactKeys(source, CAPTURE_SOURCE_KEYS)) {
        fail(`source.${index}.keys`);
        continue;
      }
      if (!isNonEmptyString(source.id)) fail(`source.${index}.id`);
      if (!isNonEmptyString(source.label)) fail(`source.${index}.label`);
      if (!isNonEmptyString(source.title)) fail(`source.${index}.title`);
      if (source.url !== null && !isHttpsUrl(source.url)) fail(`source.${index}.url`);
    }
  }

  if (!hasExactKeys(run.diagnostics, DIAGNOSTIC_KEYS)) {
    fail("diagnostics_keys");
  } else {
    if (run.diagnostics.research !== null) {
      if (!hasExactKeys(run.diagnostics.research, RESEARCH_DIAGNOSTIC_KEYS)) {
        fail("diagnostics.research.keys");
      } else {
        for (const field of RESEARCH_DIAGNOSTIC_KEYS) {
          if (!isNonNegativeInteger(run.diagnostics.research[field])) {
            fail(`diagnostics.research.${field}`);
          }
        }
      }
    }
    if (run.diagnostics.verification !== null) {
      if (!hasExactKeys(run.diagnostics.verification, VERIFICATION_DIAGNOSTIC_KEYS)) {
        fail("diagnostics.verification.keys");
      } else {
        for (const field of VERIFICATION_DIAGNOSTIC_KEYS.slice(0, -1)) {
          if (!isNonNegativeInteger(run.diagnostics.verification[field])) {
            fail(`diagnostics.verification.${field}`);
          }
        }
        if (!hasExactKeys(run.diagnostics.verification.firstLoss, FIRST_LOSS_KEYS)) {
          fail("diagnostics.verification.firstLoss.keys");
        } else {
          for (const field of FIRST_LOSS_KEYS) {
            if (!isNonNegativeInteger(run.diagnostics.verification.firstLoss[field])) {
              fail(`diagnostics.verification.firstLoss.${field}`);
            }
          }
        }
      }
    }
  }

  if (!hasExactKeys(run.accounting, ACCOUNTING_KEYS)) {
    fail("accounting_keys");
  } else {
    for (const field of ACCOUNTING_KEYS) {
      if (
        field === "conservativeUsd"
          ? !isNonNegativeFinite(run.accounting[field])
          : !isNonNegativeInteger(run.accounting[field])
      ) {
        fail(`accounting.${field}`);
      }
    }
    if (
      isNonNegativeInteger(run.accounting.cachedInputTokens) &&
      isNonNegativeInteger(run.accounting.inputTokens) &&
      run.accounting.cachedInputTokens > run.accounting.inputTokens
    ) {
      fail("accounting.cachedInputTokens");
    }
  }
  if (!Array.isArray(run.stageTimings) || run.stageTimings.length < 1) {
    fail("stageTimings");
  } else {
    for (const [index, timing] of run.stageTimings.entries()) {
      if (
        !hasExactKeys(timing, STAGE_TIMING_KEYS) ||
        !["research_start", "research_poll", "presentation"].includes(
          timing.operation,
        ) ||
        !["pending", "completed", "failed"].includes(timing.outcome) ||
        !isNonNegativeInteger(timing.durationMs)
      ) {
        fail(`stageTimings.${index}`);
      }
    }
  }
  if (
    !Array.isArray(run.terminalUsage) ||
    run.terminalUsage.length < 1 ||
    run.terminalUsage.length > 2
  ) {
    fail("terminalUsage");
  } else {
    for (const [index, ledger] of run.terminalUsage.entries()) {
      if (!hasExactKeys(ledger, TERMINAL_USAGE_KEYS)) {
        fail(`terminalUsage.${index}.keys`);
        continue;
      }
      if (
        !["research_start", "research_poll", "presentation"].includes(
          ledger.operation,
        ) ||
        !["completed", "failed"].includes(ledger.outcome)
      ) {
        fail(`terminalUsage.${index}.union`);
      }
      for (const field of TERMINAL_USAGE_KEYS.slice(2)) {
        if (!isNonNegativeInteger(ledger[field])) {
          fail(`terminalUsage.${index}.${field}`);
        }
      }
      if (ledger.cachedInputTokens > ledger.inputTokens) {
        fail(`terminalUsage.${index}.cachedInputTokens`);
      }
    }
  }
  return valid;
}

function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityKey(card) {
  return [
    normalized(card.identity.brand),
    normalized(card.identity.model),
  ].join("|");
}

function cardMatchesTruthProduct(card, product) {
  return stagedTerraRegisteredProductMatchesIdentity(card.identity, product);
}

function pairwiseJaccard(sets) {
  const values = [];
  for (let left = 0; left < sets.length; left += 1) {
    for (let right = left + 1; right < sets.length; right += 1) {
      const union = new Set([...sets[left], ...sets[right]]);
      let intersection = 0;
      for (const value of sets[left]) {
        if (sets[right].has(value)) intersection += 1;
      }
      values.push(union.size === 0 ? 1 : intersection / union.size);
    }
  }
  return values;
}

function pairwiseSharedOrderKendallTau(lists) {
  const values = [];
  for (let left = 0; left < lists.length; left += 1) {
    for (let right = left + 1; right < lists.length; right += 1) {
      const rightRanks = new Map(
        lists[right].map((identity, index) => [identity, index]),
      );
      const shared = lists[left].filter((identity) => rightRanks.has(identity));
      if (shared.length < 2) {
        values.push(null);
        continue;
      }
      let concordant = 0;
      let discordant = 0;
      for (let first = 0; first < shared.length; first += 1) {
        for (let second = first + 1; second < shared.length; second += 1) {
          if (rightRanks.get(shared[first]) < rightRanks.get(shared[second])) {
            concordant += 1;
          } else {
            discordant += 1;
          }
        }
      }
      values.push(
        rounded(
          (concordant - discordant) / (concordant + discordant),
        ),
      );
    }
  }
  return values;
}

function rounded(value) {
  return Number(value.toFixed(12));
}

function registeredProductFirstLossStage(productTrace) {
  if (productTrace.validatedResearchCandidates === 0) {
    return "research_discovery_absent";
  }
  if (productTrace.acceptedResearchCandidates === 0) {
    return "identity_source_preflight";
  }
  if (productTrace.verification === null) return "verification_not_observed";
  if (productTrace.finalRanks.length > 0) return "displayed";
  if (productTrace.verification.eligible > 0) return "presentation_omission";
  const observed = STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.filter(
    (key) => productTrace.verification.firstLoss[key] > 0,
  );
  return observed.length === 1
    ? `verification_${observed[0]}`
    : "verification_mixed";
}

function unique(values) {
  return Array.from(new Set(values));
}

function validateRegisteredProductTraceBinding(run, testCase, haltFailures) {
  const trace = run.registeredProductTrace;
  const expected = stagedTerraRegisteredProducts(testCase);
  const key = captureKey(run);
  if (trace === null) {
    if (
      run.terminal.state === "completed" ||
      run.diagnostics.research !== null ||
      run.diagnostics.verification !== null
    ) {
      haltFailures.push(`registered_product_trace_missing:${key}`);
    }
    return;
  }
  if (trace.products.length !== expected.length) {
    haltFailures.push(
      `registered_product_trace_length:${key}:${trace.products.length}:${expected.length}`,
    );
    return;
  }
  const registeredTotals = {
    validatedResearchCandidates: 0,
    acceptedResearchCandidates: 0,
    eligible: 0,
    closeMatch: 0,
    excluded: 0,
    firstLoss: Object.fromEntries(
      STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.map((field) => [field, 0]),
    ),
  };
  for (const [index, productTrace] of trace.products.entries()) {
    const registered = expected[index];
    const label = `${key}:${registered.product.id}`;
    if (
      productTrace.id !== registered.product.id ||
      productTrace.registry !== registered.registry
    ) {
      haltFailures.push(`registered_product_trace_identity:${label}`);
      continue;
    }
    const expectedFinalRanks = run.cards
      .filter((card) =>
        stagedTerraRegisteredProductMatchesIdentity(
          card.identity,
          registered.product,
        ),
      )
      .map((card) => card.rank);
    if (
      JSON.stringify(productTrace.finalRanks) !==
      JSON.stringify(expectedFinalRanks)
    ) {
      haltFailures.push(`registered_product_trace_final_ranks:${label}`);
    }
    if (
      run.diagnostics.research !== null &&
      (productTrace.validatedResearchCandidates >
        run.diagnostics.research.submitted ||
        productTrace.acceptedResearchCandidates >
          run.diagnostics.research.accepted)
    ) {
      haltFailures.push(`registered_product_trace_research_counts:${label}`);
    }
    registeredTotals.validatedResearchCandidates +=
      productTrace.validatedResearchCandidates;
    registeredTotals.acceptedResearchCandidates +=
      productTrace.acceptedResearchCandidates;
    if (productTrace.verification === null) {
      if (run.diagnostics.verification !== null) {
        haltFailures.push(`registered_product_trace_verification_missing:${label}`);
      }
      continue;
    }
    if (run.diagnostics.verification === null) {
      haltFailures.push(`registered_product_trace_verification_unexpected:${label}`);
      continue;
    }
    const observed = productTrace.verification;
    registeredTotals.eligible += observed.eligible;
    registeredTotals.closeMatch += observed.closeMatch;
    registeredTotals.excluded += observed.excluded;
    for (const field of STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS) {
      registeredTotals.firstLoss[field] += observed.firstLoss[field];
    }
    if (
      observed.eligible > run.diagnostics.verification.eligible ||
      observed.closeMatch > run.diagnostics.verification.closeMatch ||
      observed.excluded > run.diagnostics.verification.excluded ||
      STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.some(
        (field) =>
          observed.firstLoss[field] >
          run.diagnostics.verification.firstLoss[field],
      )
    ) {
      haltFailures.push(`registered_product_trace_verification_counts:${label}`);
    }
  }
  if (
    run.diagnostics.research !== null &&
    (registeredTotals.validatedResearchCandidates >
      run.diagnostics.research.submitted ||
      registeredTotals.acceptedResearchCandidates >
        run.diagnostics.research.accepted)
  ) {
    haltFailures.push(`registered_product_trace_aggregate_research:${key}`);
  }
  if (
    run.diagnostics.verification !== null &&
    (registeredTotals.eligible > run.diagnostics.verification.eligible ||
      registeredTotals.closeMatch >
        run.diagnostics.verification.closeMatch ||
      registeredTotals.excluded > run.diagnostics.verification.excluded ||
      STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.some(
        (field) =>
          registeredTotals.firstLoss[field] >
          run.diagnostics.verification.firstLoss[field],
      ))
  ) {
    haltFailures.push(`registered_product_trace_aggregate_verification:${key}`);
  }
}

function validateRunMechanics(run, testCase, matrix, haltFailures, qualityFailures) {
  const key = captureKey(run);
  validateRegisteredProductTraceBinding(run, testCase, haltFailures);
  const sourceById = new Map(run.sources.map((source) => [source.id, source]));
  const registeredSources = new Set(sourceById.keys());
  if (registeredSources.size !== run.sources.length) {
    haltFailures.push(`duplicate_run_source:${key}`);
  }
  if (run.cards.length > testCase.maximumCards) {
    qualityFailures.push(`maximum_cards:${key}:${run.cards.length}:${testCase.maximumCards}`);
  }

  const completed =
    run.terminal.state === "completed" &&
    run.terminal.statusCode === 200 &&
    run.terminal.code === null;
  const safeNoExact =
    testCase.completionPolicy === "safe_no_exact_allowed" &&
    run.terminal.state === "failed" &&
    run.terminal.statusCode === 502 &&
    run.terminal.code === "verification_failed" &&
    run.cards.length === 0 &&
    run.diagnostics.research !== null &&
    run.diagnostics.verification !== null &&
    run.diagnostics.verification.eligible === 0 &&
    run.diagnostics.verification.firstLoss.noLossEligible === 0;

  if (!completed && !safeNoExact) {
    haltFailures.push(
      `terminal_failure:${key}:${run.terminal.code || run.terminal.state}`,
    );
  }
  if (completed && run.cards.length === 0) {
    haltFailures.push(`completed_without_cards:${key}`);
  }
  if (safeNoExact) {
    qualityFailures.push(`safe_no_exact_not_user_usable:${key}`);
  }
  if (completed && run.cards.length < testCase.minimumCards) {
    qualityFailures.push(
      `minimum_cards:${key}:${run.cards.length}:${testCase.minimumCards}`,
    );
  }
  if (!completed && run.cards.length > 0) {
    haltFailures.push(`failed_run_retained_cards:${key}`);
  }
  if (completed || safeNoExact) {
    if (run.terminal.wallClockMs <= 0) {
      haltFailures.push(`wall_clock_not_positive:${key}`);
    }
    const stageTotal = run.stageTimings.reduce(
      (total, timing) => total + timing.durationMs,
      0,
    );
    if (stageTotal > run.terminal.wallClockMs) {
      haltFailures.push(
        `stage_time_exceeds_wall_clock:${key}:${stageTotal}:${run.terminal.wallClockMs}`,
      );
    }
    if (
      run.terminal.wallClockMs > matrix.qualityBars.maximumCompletedWallClockMs
    ) {
      qualityFailures.push(
        `latency_exceeded:${key}:${run.terminal.wallClockMs}:${matrix.qualityBars.maximumCompletedWallClockMs}`,
      );
    }
  }

  const terminalUsageValid = completed
    ? run.terminalUsage.length === 2 &&
      run.terminalUsage[0].operation === "research_poll" &&
      run.terminalUsage[0].outcome === "completed" &&
      run.terminalUsage[0].inputTokens > 0 &&
      run.terminalUsage[0].outputTokens > 0 &&
      run.terminalUsage[0].webSearchCalls > 0 &&
      run.terminalUsage[1].operation === "presentation" &&
      run.terminalUsage[1].outcome === "completed" &&
      run.terminalUsage[1].inputTokens > 0 &&
      run.terminalUsage[1].outputTokens > 0 &&
      run.terminalUsage[1].webSearchCalls === 0
    : safeNoExact
      ? run.terminalUsage.length === 1 &&
        run.terminalUsage[0].operation === "research_poll" &&
        run.terminalUsage[0].outcome === "completed" &&
        run.terminalUsage[0].inputTokens > 0 &&
        run.terminalUsage[0].outputTokens > 0 &&
        run.terminalUsage[0].webSearchCalls > 0
      : true;
  if (!terminalUsageValid) {
    haltFailures.push(`terminal_usage_reconciliation:${key}`);
  }

  const cardKeys = new Set();
  const cardIdentities = new Set();
  let wrongTypeCount = 0;
  let hardRequirementFailureCount = 0;
  let budgetViolationCount = 0;
  let unregisteredReferenceCount = 0;
  for (const [index, card] of run.cards.entries()) {
    const cardLabel = `${key}:${card.rank}`;
    if (card.rank !== index + 1) haltFailures.push(`card_rank_sequence:${cardLabel}`);
    if (cardKeys.has(card.key)) haltFailures.push(`duplicate_card_key:${cardLabel}`);
    cardKeys.add(card.key);
    const cardIdentity = identityKey(card);
    if (cardIdentities.has(cardIdentity)) {
      haltFailures.push(`duplicate_card_identity:${cardLabel}`);
    }
    cardIdentities.add(cardIdentity);
    if (card.recommendationStatus !== "Best Match") {
      haltFailures.push(`non_exact_recommendation_status:${cardLabel}`);
    }
    if (card.identityVerification.state !== "verified") {
      haltFailures.push(`identity_not_verified:${cardLabel}`);
    }
    if (
      !evidenceFreshAtCapture(
        card.identityVerification.observedAt,
        run.capturedAt,
        matrix.qualityBars.maximumEvidenceAgeMs,
      )
    ) {
      haltFailures.push(`identity_evidence_not_current:${cardLabel}`);
    }
    const identityText = normalized(
      `${card.identity.brand} ${card.identity.productName} ${card.identity.model}`,
    );
    if (
      testCase.forbiddenIdentityTerms.some((term) =>
        identityText.includes(normalized(term)),
      )
    ) {
      wrongTypeCount += 1;
      haltFailures.push(`wrong_type_card:${cardLabel}`);
    }

    const expectedRequirements = new Set(testCase.requirementIds);
    const observedRequirements = new Set(
      card.requirementChecks.map((check) => check.id),
    );
    const requirementsComplete =
      observedRequirements.size === card.requirementChecks.length &&
      observedRequirements.size === expectedRequirements.size &&
      [...expectedRequirements].every((id) => observedRequirements.has(id));
    if (!requirementsComplete) {
      hardRequirementFailureCount += 1;
      haltFailures.push(`hard_requirement_set_mismatch:${cardLabel}`);
    }
    for (const check of card.requirementChecks) {
      if (check.status !== "Pass") {
        hardRequirementFailureCount += 1;
        haltFailures.push(`hard_requirement_not_pass:${cardLabel}:${check.id}`);
      }
      for (const sourceId of check.sourceIds) {
        if (
          !registeredSources.has(sourceId) ||
          sourceById.get(sourceId)?.url === null ||
          !card.sourceIds.includes(sourceId)
        ) {
          unregisteredReferenceCount += 1;
          haltFailures.push(
            `unregistered_source_reference:${cardLabel}:requirement:${sourceId}`,
          );
        }
      }
    }
    for (const sourceId of card.sourceIds) {
      if (!registeredSources.has(sourceId) || sourceById.get(sourceId)?.url === null) {
        unregisteredReferenceCount += 1;
        haltFailures.push(`unregistered_source_reference:${cardLabel}:card:${sourceId}`);
      }
    }

    const commerceSourceBound =
      card.commerce.state === "verified" &&
      card.commerce.sourceIds.length >= 1 &&
      card.commerce.sourceIds.every(
        (sourceId) =>
          card.sourceIds.includes(sourceId) &&
          sourceById.get(sourceId)?.url === card.commerce.productUrl,
      );
    const validVerifiedCommerce =
      card.commerce.state === "verified" &&
      isNonNegativeFinite(card.commerce.priceAmount) &&
      card.commerce.priceAmount > 0 &&
      card.commerce.currency === "USD" &&
      isNonEmptyString(card.commerce.seller) &&
      isHttpsUrl(card.commerce.productUrl) &&
      card.commerce.availability === "in_stock" &&
      isNonEmptyString(card.commerce.observedAt) &&
      evidenceFreshAtCapture(
        card.commerce.observedAt,
        run.capturedAt,
        matrix.qualityBars.maximumEvidenceAgeMs,
      ) &&
      commerceSourceBound;
    const validUnverifiedCommerce =
      card.commerce.state === "not_verified" &&
      [
        "priceAmount",
        "currency",
        "seller",
        "productUrl",
        "availability",
        "observedAt",
      ].every((field) => card.commerce[field] === null) &&
      card.commerce.sourceIds.length === 0;
    if (!validVerifiedCommerce && !validUnverifiedCommerce) {
      haltFailures.push(`commerce_union_invalid:${cardLabel}`);
    }
    if (
      testCase.maximumVerifiedPriceUsd !== null &&
      (!validVerifiedCommerce ||
        card.commerce.priceAmount > testCase.maximumVerifiedPriceUsd)
    ) {
      budgetViolationCount += 1;
      haltFailures.push(`budget_violation:${cardLabel}`);
    }
  }

  const bars = matrix.qualityBars;
  if (wrongTypeCount > bars.maximumWrongTypeCards) {
    haltFailures.push(`wrong_type_limit:${key}:${wrongTypeCount}`);
  }
  if (hardRequirementFailureCount > bars.maximumHardRequirementFailures) {
    haltFailures.push(`hard_requirement_limit:${key}:${hardRequirementFailureCount}`);
  }
  if (budgetViolationCount > bars.maximumBudgetViolations) {
    haltFailures.push(`budget_violation_limit:${key}:${budgetViolationCount}`);
  }
  if (unregisteredReferenceCount > bars.maximumUnregisteredSourceReferences) {
    haltFailures.push(`unregistered_source_limit:${key}:${unregisteredReferenceCount}`);
  }

  const research = run.diagnostics.research;
  const verification = run.diagnostics.verification;
  if (completed || safeNoExact) {
    if (!research || !verification) {
      haltFailures.push(`diagnostics_missing:${key}`);
    } else {
      if (research.submitted !== research.accepted + research.rejected) {
        haltFailures.push(`research_conservation:${key}`);
      }
      if (research.deferredMissingTitle > research.accepted) {
        haltFailures.push(`research_deferred_exceeds_accepted:${key}`);
      }
      if (
        verification.eligible + verification.closeMatch + verification.excluded !==
        research.accepted
      ) {
        haltFailures.push(`verification_conservation:${key}`);
      }
      const firstLossTotal = FIRST_LOSS_KEYS.reduce(
        (total, field) => total + verification.firstLoss[field],
        0,
      );
      if (firstLossTotal !== research.accepted) {
        haltFailures.push(`first_loss_conservation:${key}`);
      }
      if (verification.firstLoss.noLossEligible !== verification.eligible) {
        haltFailures.push(`eligible_first_loss_mismatch:${key}`);
      }
      if (run.cards.length > verification.eligible) {
        haltFailures.push(`cards_exceed_eligible:${key}`);
      }
      if (verification.candidates !== research.accepted) {
        haltFailures.push(`candidate_count_mismatch:${key}`);
      }
      if (run.accounting.sourcePageFetches !== verification.sourceFetchAttempts) {
        haltFailures.push(`source_fetch_reconciliation:${key}`);
      }
      if (run.accounting.serperShoppingAttempts !== verification.commerceRequests) {
        haltFailures.push(`shopping_reconciliation:${key}`);
      }
      if (
        verification.successfulSourceFetches > verification.sourceFetchAttempts ||
        run.accounting.sourcePageHttpAttempts < verification.successfulSourceFetches
      ) {
        haltFailures.push(`source_http_reconciliation:${key}`);
      }
      if (
        completed &&
        run.cards.length > 0 &&
        (verification.successfulSourceFetches < run.cards.length ||
          run.accounting.sourcePageHttpAttempts < run.cards.length)
      ) {
        haltFailures.push(`card_evidence_activity_missing:${key}`);
      }
      const verifiedCommerceCards = run.cards.filter(
        (card) => card.commerce.state === "verified",
      ).length;
      if (
        verifiedCommerceCards > 0 &&
        (verification.commerceRequests < verifiedCommerceCards ||
          verification.commerceRows < verifiedCommerceCards ||
          run.accounting.serperShoppingAttempts < verifiedCommerceCards)
      ) {
        haltFailures.push(`commerce_activity_missing:${key}`);
      }
    }
  }

  const expectedCreates = completed ? 2 : safeNoExact ? 1 : null;
  if (
    expectedCreates !== null &&
    (run.accounting.openAiCreates !== expectedCreates ||
      run.accounting.openAiRetrieves < 1 ||
      run.accounting.hostedSearches < 1 ||
      run.accounting.webSearchCalls !== run.accounting.hostedSearches ||
      run.accounting.inputTokens < 1 ||
      run.accounting.outputTokens < 1 ||
      run.accounting.conservativeUsd <= 0)
  ) {
    haltFailures.push(`accounting_reconciliation:${key}`);
  }

  for (const field of CEILING_KEYS) {
    const observed = run.accounting[field];
    const ceiling = matrix.qualityBars.perRunCeilings[field];
    if (observed > ceiling) {
      haltFailures.push(`run_ceiling_exceeded:${key}:${field}:${observed}:${ceiling}`);
    }
  }
  for (const [field, allowance, code] of [
    ["retries", bars.allowedRetries, "retries_exceeded"],
    ["replacements", bars.allowedReplacements, "replacements_exceeded"],
    ["fallbacks", bars.allowedFallbacks, "fallbacks_exceeded"],
    ["serperOrganicAttempts", bars.allowedSerperOrganicAttempts, "serper_organic_exceeded"],
    ["searchApiAttempts", bars.allowedSearchApiAttempts, "search_api_exceeded"],
    ["additionalCases", bars.allowedAdditionalCases, "additional_cases_exceeded"],
  ]) {
    if (run.accounting[field] > allowance) {
      haltFailures.push(`${code}:${key}:${run.accounting[field]}:${allowance}`);
    }
  }
}

function buildMetrics(matrix, runs, qualityFailures, haltFailures) {
  const byCase = new Map();
  for (const run of runs) {
    if (!byCase.has(run.caseId)) byCase.set(run.caseId, []);
    byCase.get(run.caseId).push(run);
  }
  for (const caseRuns of byCase.values()) {
    caseRuns.sort((left, right) => left.run - right.run);
  }

  const broadPerRun = [];
  const broadUnion = new Set();
  for (const testCase of matrix.cases.filter((item) => item.shape === "broad")) {
    for (const run of byCase.get(testCase.id) || []) {
      const matched = testCase.mustConsiderProducts.filter((product) =>
        run.cards.some((card) => cardMatchesTruthProduct(card, product)),
      );
      broadPerRun.push(matched.length);
      for (const product of matched) broadUnion.add(`${testCase.id}:${product.id}`);
      if (matched.length < matrix.qualityBars.minimumBroadMustConsiderPerRun) {
        qualityFailures.push(
          `broad_recall_run:${captureKey(run)}:${matched.length}:${matrix.qualityBars.minimumBroadMustConsiderPerRun}`,
        );
      }
    }
  }
  if (broadUnion.size < matrix.qualityBars.minimumBroadMustConsiderUnion) {
    qualityFailures.push(
      `broad_recall_union:${broadUnion.size}:${matrix.qualityBars.minimumBroadMustConsiderUnion}`,
    );
  }

  const stability = [];
  for (const testCase of matrix.cases) {
    const caseRuns = byCase.get(testCase.id) || [];
    if (caseRuns.length < 2) continue;
    const rankedIdentities = caseRuns.map((run) =>
      run.cards.map((card) => identityKey(card)),
    );
    const values = pairwiseJaccard(
      rankedIdentities.map((identities) => new Set(identities)),
    );
    const sharedOrderKendallTau = pairwiseSharedOrderKendallTau(
      rankedIdentities,
    );
    const minimum = values.length ? Math.min(...values) : 1;
    const mean = values.length
      ? values.reduce((total, value) => total + value, 0) / values.length
      : 1;
    stability.push({
      caseId: testCase.id,
      pairwise: values.map(rounded),
      minimum: rounded(minimum),
      mean: rounded(mean),
      sharedOrderKendallTau,
      minimumSharedOrderKendallTau:
        sharedOrderKendallTau.some((value) => value === null)
          ? null
          : Math.min(...sharedOrderKendallTau),
      minimumSharedOrderKendallTauBar:
        matrix.qualityBars.minimumPairwiseSharedOrderKendallTau,
    });
    if (minimum < matrix.qualityBars.minimumPairwiseFinalJaccard) {
      qualityFailures.push(
        `final_jaccard:${testCase.id}:${rounded(minimum)}:${matrix.qualityBars.minimumPairwiseFinalJaccard}`,
      );
    }
    for (const [pairIndex, tau] of sharedOrderKendallTau.entries()) {
      if (tau === null) {
        qualityFailures.push(
          `rank_stability_unscorable:${testCase.id}:${pairIndex + 1}`,
        );
      } else if (
        tau < matrix.qualityBars.minimumPairwiseSharedOrderKendallTau
      ) {
        qualityFailures.push(
          `rank_stability:${testCase.id}:${pairIndex + 1}:${tau}:${matrix.qualityBars.minimumPairwiseSharedOrderKendallTau}`,
        );
      }
    }
  }

  const totalAccounting = Object.fromEntries(
    ACCOUNTING_KEYS.map((field) => [
      field,
      rounded(runs.reduce((total, run) => total + run.accounting[field], 0)),
    ]),
  );
  for (const field of CEILING_KEYS) {
    const observed = totalAccounting[field];
    const ceiling = matrix.qualityBars.aggregateCeilings[field];
    if (observed > ceiling) {
      haltFailures.push(`aggregate_ceiling_exceeded:${field}:${observed}:${ceiling}`);
    }
  }

  const wallClockValues = runs.map((run) => run.terminal.wallClockMs);
  const firstLoss = Object.fromEntries(FIRST_LOSS_KEYS.map((field) => [field, 0]));
  for (const run of runs) {
    const observed = run.diagnostics.verification?.firstLoss;
    if (!observed) continue;
    for (const field of FIRST_LOSS_KEYS) firstLoss[field] += observed[field];
  }
  const allCards = runs.flatMap((run) => run.cards);
  const allSources = runs.flatMap((run) => run.sources);
  const verifiedCommerceCards = allCards.filter(
    (card) => card.commerce.state === "verified",
  ).length;
  const registeredProductLineage = runs.flatMap((run) =>
    (run.registeredProductTrace?.products || []).map((product) => ({
      caseId: run.caseId,
      run: run.run,
      productId: product.id,
      registry: product.registry,
      validatedResearchCandidates: product.validatedResearchCandidates,
      acceptedResearchCandidates: product.acceptedResearchCandidates,
      verification:
        product.verification === null
          ? null
          : structuredClone(product.verification),
      finalRanks: [...product.finalRanks],
      firstLossStage: registeredProductFirstLossStage(product),
    })),
  );

  return {
    candidateIdentityJaccard: matrix.truthPolicy.candidateIdentityJaccard,
    candidateIdentityJaccardReason:
      matrix.truthPolicy.candidateIdentityJaccardReason,
    variantIdentityMeasurement: "manual_variant_trim_evidence_required",
    broadMustConsider: {
      perRun: broadPerRun,
      union: broadUnion.size,
    },
    stability,
    registeredProductLineage,
    totalAccounting,
    latencyMs: {
      perRun: runs.map((run) => ({
        caseId: run.caseId,
        run: run.run,
        wallClockMs: run.terminal.wallClockMs,
        stages: run.stageTimings,
      })),
      minimum: Math.min(...wallClockValues),
      maximum: Math.max(...wallClockValues),
      mean: rounded(
        wallClockValues.reduce((total, value) => total + value, 0) /
          wallClockValues.length,
      ),
      total: wallClockValues.reduce((total, value) => total + value, 0),
      stageTotals: Object.fromEntries(
        ["research_start", "research_poll", "presentation"].map((operation) => [
          operation,
          runs.reduce(
            (total, run) =>
              total +
              run.stageTimings
                .filter((timing) => timing.operation === operation)
                .reduce((sum, timing) => sum + timing.durationMs, 0),
            0,
          ),
        ]),
      ),
    },
    cardReconciliation: {
      totalCards: allCards.length,
      verifiedIdentityCards: allCards.filter(
        (card) => card.identityVerification.state === "verified",
      ).length,
      verifiedCommerceCards,
      verifiedCommerceCoverage:
        allCards.length === 0 ? 0 : rounded(verifiedCommerceCards / allCards.length),
      sourceEntries: allSources.length,
      uniqueHttpsUrls: new Set(
        allSources.map((source) => source.url).filter(Boolean),
      ).size,
    },
    firstLoss,
    runCount: runs.length,
    completedRuns: runs.filter((run) => run.terminal.state === "completed").length,
    safeNoExactRuns: runs.filter(
      (run) =>
        run.terminal.state === "failed" &&
        run.terminal.code === "verification_failed" &&
        run.cards.length === 0 &&
        run.diagnostics.research !== null &&
        run.diagnostics.verification !== null &&
        run.diagnostics.verification.eligible === 0 &&
        run.diagnostics.verification.firstLoss.noLossEligible === 0,
    ).length,
  };
}

function auditKey(value, includeRank = true) {
  return includeRank
    ? `${value.caseId}:${value.run}:${value.rank}`
    : `${value.caseId}:${value.run}`;
}

function manualExpectations(runs) {
  const products = new Map();
  const sources = new Map();
  const noExact = new Set();
  const advice = new Set();
  const rankings = new Map();
  for (const run of runs) {
    for (const card of run.cards) {
      products.set(auditKey({ ...run, rank: card.rank }), { run, card });
    }
    for (const card of run.cards) {
      sources.set(auditKey({ ...run, rank: card.rank }), { run, card });
    }
    if (
      run.terminal.state === "failed" &&
      run.terminal.code === "verification_failed" &&
      run.cards.length === 0 &&
      run.diagnostics.research !== null &&
      run.diagnostics.verification !== null &&
      run.diagnostics.verification.eligible === 0 &&
      run.diagnostics.verification.firstLoss.noLossEligible === 0
    ) {
      noExact.add(auditKey(run, false));
    }
    if (run.terminal.state === "completed") {
      advice.add(auditKey(run, false));
      rankings.set(auditKey(run, false), run);
    }
  }
  return { products, sources, noExact, advice, rankings };
}

function pendingManualExpectations(expectations) {
  return [
    ...[...expectations.products.keys()].map((key) => `product_audit:${key}`),
    ...[...expectations.sources.keys()].map((key) => `source_audit:${key}`),
    ...[...expectations.noExact].map((key) => `no_exact_audit:${key}`),
    ...[...expectations.advice].map((key) => `advice_audit:${key}`),
    ...[...expectations.rankings.keys()].map((key) => `ranking_audit:${key}`),
  ];
}

function artifactSetSha256(runs) {
  return canonicalSha256(runs.map((run) => run.artifactSha256));
}

function validateManualReview(
  manualReview,
  matrix,
  runs,
  approvedCommitSha,
  now,
) {
  const failures = [];
  const haltFailures = [];
  const pending = [];
  const expectations = manualExpectations(runs);
  if (!hasExactKeys(manualReview, REVIEW_KEYS)) {
    return {
      failures: ["manual_review_keys_invalid"],
      haltFailures: [],
      pending: pendingManualExpectations(expectations),
    };
  }
  if (manualReview.schemaVersion !== STAGED_TERRA_READINESS_REVIEW_VERSION) {
    failures.push("manual_review_version_invalid");
  }
  if (manualReview.matrixVersion !== matrix.schemaVersion) {
    failures.push("manual_review_matrix_version_mismatch");
  }
  if (manualReview.matrixSha256 !== stagedTerraReadinessMatrixSha256(matrix)) {
    failures.push("manual_review_matrix_hash_mismatch");
  }
  if (manualReview.approvedCommitSha !== approvedCommitSha) {
    failures.push("manual_review_commit_mismatch");
  }
  if (manualReview.artifactSetSha256 !== artifactSetSha256(runs)) {
    failures.push("manual_review_artifact_set_mismatch");
  }
  if (!isNonEmptyString(manualReview.reviewer)) failures.push("manual_reviewer_invalid");
  if (!isDateStamp(manualReview.reviewedAt)) {
    failures.push("manual_reviewed_at_invalid");
  } else if (
    manualReview.reviewedAt < matrix.reviewedAt ||
    manualReview.reviewedAt > matrix.expiresAt
  ) {
    failures.push(`manual_review_outside_truth_window:${manualReview.reviewedAt}`);
  }
  const currentDate = dateStamp(now);
  if (currentDate && isDateStamp(manualReview.reviewedAt) && manualReview.reviewedAt > currentDate) {
    failures.push(`manual_review_in_future:${manualReview.reviewedAt}`);
  }

  const validateAuditCollection = ({
    values,
    expected,
    keys,
    kind,
    includeRank,
    validate,
  }) => {
    const counts = new Map();
    if (!Array.isArray(values)) {
      failures.push(`${kind}_audits_invalid`);
      for (const key of expected.keys ? expected.keys() : expected) {
        failures.push(`missing_${kind}_audit:${key}`);
        pending.push(`${kind}_audit:${key}`);
      }
      return;
    }
    for (const [index, audit] of values.entries()) {
      if (!hasExactKeys(audit, keys)) {
        failures.push(`${kind}_audit_keys_invalid:${index}`);
        continue;
      }
      if (
        !SAFE_ID.test(audit.caseId) ||
        !Number.isSafeInteger(audit.run) ||
        audit.run < 1 ||
        (includeRank &&
          (!Number.isSafeInteger(audit.rank) || audit.rank < 1))
      ) {
        failures.push(`${kind}_audit_identity_invalid:${index}`);
        continue;
      }
      const key = auditKey(audit, includeRank);
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!expected.has(key)) {
        failures.push(`unknown_${kind}_audit:${index}`);
        continue;
      }
      if (counts.get(key) > 1) failures.push(`duplicate_${kind}_audit:${key}`);
      validate(audit, expected.get ? expected.get(key) : key, key);
    }
    for (const key of expected.keys ? expected.keys() : expected) {
      if (!counts.has(key)) {
        failures.push(`missing_${kind}_audit:${key}`);
        pending.push(`${kind}_audit:${key}`);
      }
    }
  };

  validateAuditCollection({
    values: manualReview.productAudits,
    expected: expectations.products,
    keys: PRODUCT_AUDIT_KEYS,
    kind: "product",
    includeRank: true,
    validate: (audit, { card }, key) => {
      for (const field of [
        "exactIdentity",
        "requestedType",
        "hardRequirements",
        "evidenceSupport",
        "requirementExplanations",
      ]) {
        if (!AUDIT_PASS_FAIL.has(audit[field])) {
          failures.push(`product_audit_value_invalid:${key}:${field}`);
          continue;
        }
        if (audit[field] !== "pass") {
          haltFailures.push(`product_audit_failed:${key}:${field}`);
        }
      }
      if (!AUDIT_PASS_FAIL.has(audit.variantIdentity)) {
        failures.push(`product_audit_value_invalid:${key}:variantIdentity`);
      } else if (audit.variantIdentity !== "pass") {
        haltFailures.push(`product_audit_failed:${key}:variantIdentity`);
      }
      const expectedSpecificationStatus = card.reviewEvidence.claims.some(
        (claim) => claim.claimType === "specification",
      )
        ? "pass"
        : "not_applicable";
      if (!AUDIT_OPTIONAL_BINDING.has(audit.specificationClaims)) {
        failures.push(
          `product_audit_value_invalid:${key}:specificationClaims`,
        );
      }
      if (audit.specificationClaims !== expectedSpecificationStatus) {
        haltFailures.push(
          `product_audit_failed:${key}:specificationClaims`,
        );
      }
      const expectedPriceStatus =
        card.commerce.state === "verified" ? "pass" : "not_applicable";
      if (!AUDIT_OPTIONAL_BINDING.has(audit.priceOfferBinding)) {
        failures.push(`product_audit_value_invalid:${key}:priceOfferBinding`);
      }
      if (audit.priceOfferBinding !== expectedPriceStatus) {
        haltFailures.push(`product_audit_failed:${key}:priceOfferBinding`);
      }
      const expectedImageStatus =
        card.reviewEvidence.image.state === "verified" ? "pass" : "not_applicable";
      if (!AUDIT_OPTIONAL_BINDING.has(audit.imageIdentity)) {
        failures.push(`product_audit_value_invalid:${key}:imageIdentity`);
      }
      if (audit.imageIdentity !== expectedImageStatus) {
        haltFailures.push(`product_audit_failed:${key}:imageIdentity`);
      }
    },
  });

  validateAuditCollection({
    values: manualReview.sourceAudits,
    expected: expectations.sources,
    keys: SOURCE_AUDIT_KEYS,
    kind: "source",
    includeRank: true,
    validate: (audit, { run, card }, key) => {
      if (!AUDIT_PASS_FAIL.has(audit.status)) {
        failures.push(`source_audit_value_invalid:${key}:status`);
      }
      if (audit.status !== "pass") {
        haltFailures.push(`source_audit_failed:${key}`);
      }
      if (
        !hasUniqueNonEmptyStrings(audit.sourceIds) ||
        !audit.sourceIds.every((sourceId) => SAFE_ID.test(sourceId))
      ) {
        haltFailures.push(`source_audit_source_ids_invalid:${key}`);
        return;
      }
      const sourceById = new Map(run.sources.map((source) => [source.id, source]));
      if (
        audit.sourceIds.some(
          (sourceId) =>
            !sourceById.has(sourceId) ||
            sourceById.get(sourceId)?.url === null ||
            !card.sourceIds.includes(sourceId),
        )
      ) {
        haltFailures.push(`source_audit_binding_invalid:${key}`);
        return;
      }
      const availableUrls = new Set(
        card.sourceIds
          .map((sourceId) => sourceById.get(sourceId)?.url)
          .filter(Boolean),
      );
      const auditedUrls = new Set(
        audit.sourceIds.map((sourceId) => sourceById.get(sourceId)?.url),
      );
      const minimum = Math.min(2, availableUrls.size);
      if (auditedUrls.size < minimum) {
        haltFailures.push(`source_audit_diversity_invalid:${key}:${auditedUrls.size}:${minimum}`);
      }
    },
  });

  validateAuditCollection({
    values: manualReview.noExactAudits,
    expected: expectations.noExact,
    keys: NO_EXACT_AUDIT_KEYS,
    kind: "no_exact",
    includeRank: false,
    validate: (audit, _expected, key) => {
      if (!NO_EXACT_AUDIT_VALUES.has(audit.status)) {
        failures.push(`no_exact_audit_value_invalid:${key}:status`);
      }
      if (audit.status !== "safe_but_unusable") {
        haltFailures.push(`no_exact_audit_failed:${key}`);
      }
    },
  });

  validateAuditCollection({
    values: manualReview.adviceAudits,
    expected: expectations.advice,
    keys: ADVICE_AUDIT_KEYS,
    kind: "advice",
    includeRank: false,
    validate: (audit, _expected, key) => {
      if (!AUDIT_PASS_FAIL.has(audit.status)) {
        failures.push(`advice_audit_value_invalid:${key}:status`);
      }
      if (audit.status !== "pass") {
        haltFailures.push(`advice_audit_failed:${key}`);
      }
    },
  });

  validateAuditCollection({
    values: manualReview.rankingAudits,
    expected: expectations.rankings,
    keys: RANKING_AUDIT_KEYS,
    kind: "ranking",
    includeRank: false,
    validate: (audit, run, key) => {
      for (const field of [
        "topPickSupported",
        "evidenceAndTradeoffsReflected",
      ]) {
        if (!AUDIT_PASS_FAIL.has(audit[field])) {
          failures.push(`ranking_audit_value_invalid:${key}:${field}`);
        } else if (audit[field] !== "pass") {
          haltFailures.push(`ranking_audit_failed:${key}:${field}`);
        }
      }
      const expectedRelativeOrder =
        run.cards.length >= 2 ? "pass" : "not_applicable";
      if (!AUDIT_OPTIONAL_BINDING.has(audit.relativeOrderSupported)) {
        failures.push(
          `ranking_audit_value_invalid:${key}:relativeOrderSupported`,
        );
      } else if (audit.relativeOrderSupported !== expectedRelativeOrder) {
        haltFailures.push(
          `ranking_audit_failed:${key}:relativeOrderSupported`,
        );
      }
    },
  });

  return {
    failures: unique(failures),
    haltFailures: unique(haltFailures),
    pending: unique(pending),
  };
}

function emptyMetrics(matrix) {
  return {
    candidateIdentityJaccard:
      matrix?.truthPolicy?.candidateIdentityJaccard ||
      "not_scored_privacy_boundary",
    candidateIdentityJaccardReason:
      matrix?.truthPolicy?.candidateIdentityJaccardReason || null,
    variantIdentityMeasurement: "manual_variant_trim_evidence_required",
    broadMustConsider: { perRun: [], union: 0 },
    stability: [],
    registeredProductLineage: [],
    totalAccounting: Object.fromEntries(ACCOUNTING_KEYS.map((key) => [key, 0])),
    latencyMs: {
      perRun: [],
      minimum: null,
      maximum: null,
      mean: null,
      total: 0,
      stageTotals: { research_start: 0, research_poll: 0, presentation: 0 },
    },
    cardReconciliation: {
      totalCards: 0,
      verifiedIdentityCards: 0,
      verifiedCommerceCards: 0,
      verifiedCommerceCoverage: 0,
      sourceEntries: 0,
      uniqueHttpsUrls: 0,
    },
    firstLoss: Object.fromEntries(FIRST_LOSS_KEYS.map((key) => [key, 0])),
    runCount: 0,
    completedRuns: 0,
    safeNoExactRuns: 0,
  };
}

function withAuthorityBoundary(result) {
  return {
    ...result,
    originAuthenticated: false,
    machineAuthorization: false,
    releaseAuthorized: false,
    authorityReason:
      "independent_execution_origin_and_review_are_not_machine_verifiable",
  };
}

function invalidAnalysis(matrix, failures) {
  return withAuthorityBoundary({
    decision: "invalid",
    structuralFailures: unique(failures),
    haltFailures: [],
    qualityFailures: [],
    manualReviewFailures: [],
    pendingManualReview: [],
    stopRequired: true,
    metrics: emptyMetrics(matrix),
  });
}

function authenticateArtifactRuns({
  matrix,
  artifacts,
  approvedCommitSha,
  now,
  requireComplete,
}) {
  const structuralFailures = [];
  const matrixResult = validateStagedTerraReadinessMatrix(matrix, { now });
  for (const error of matrixResult.errors) {
    structuralFailures.push(`matrix_invalid:${error}`);
  }
  if (!HEX_40.test(approvedCommitSha)) {
    structuralFailures.push("approved_commit_invalid");
  }
  if (
    !Array.isArray(artifacts) ||
    artifacts.length === 0 ||
    artifacts.length > (Array.isArray(matrix?.runOrder) ? matrix.runOrder.length : 0)
  ) {
    structuralFailures.push("artifacts_invalid");
  }
  if (structuralFailures.length > 0) {
    return { structuralFailures: unique(structuralFailures), validRuns: [] };
  }

  const expectedKeys = new Set(matrix.runOrder);
  const seenKeys = new Map();
  const validRuns = [];
  const commitShas = new Set();
  const runIds = new Set();
  const artifactHashes = new Set();
  const matrixHash = stagedTerraReadinessMatrixSha256(matrix);
  const caseById = new Map(matrix.cases.map((testCase) => [testCase.id, testCase]));
  const currentDate = dateStamp(now);

  for (const [index, artifact] of artifacts.entries()) {
    const parsed = parseStagedTerraReadinessArtifact(artifact);
    if (!parsed.ok) {
      for (const error of parsed.errors) {
        structuralFailures.push(`artifact_invalid:${index}:${error}`);
      }
      continue;
    }
    const payload = parsed.payload;
    const run = {
      schemaVersion: STAGED_TERRA_READINESS_CAPTURE_VERSION,
      matrixVersion: payload.matrixVersion,
      matrixSha256: payload.matrixSha256,
      caseId: payload.caseId,
      run: payload.run,
      runId: payload.runId,
      attemptIndex: payload.attemptIndex,
      attemptNonce: payload.attemptNonce,
      previousArtifactSha256: payload.previousArtifactSha256,
      commitSha: payload.commitSha,
      requestSha256: payload.requestSha256,
      artifactSha256: parsed.artifactSha256,
      capturedAt: payload.capturedAt,
      terminal: payload.terminal,
      presentationVersion: payload.presentationVersion,
      finalAdvice: payload.finalAdvice,
      cards: payload.cards,
      sources: payload.sources,
      registeredProductTrace: payload.registeredProductTrace,
      diagnostics: payload.diagnostics,
      accounting: stagedTerraReadinessAccounting(payload),
      stageTimings: payload.routeTrace
        .filter((trace) => trace.ledger !== null)
        .map((trace) => ({
          operation: trace.stage,
          outcome: trace.outcome,
          durationMs: trace.ledger.durationMs,
        })),
      terminalUsage: payload.usageLedgers,
    };
    const key = captureKey(run);
    seenKeys.set(key, (seenKeys.get(key) || 0) + 1);
    if (seenKeys.get(key) > 1) structuralFailures.push(`duplicate_run:${key}`);
    if (!expectedKeys.has(key)) structuralFailures.push(`unknown_run:${key}`);
    const schemaValid = validateCaptureSchema(run, key, structuralFailures);
    if (!schemaValid) continue;
    if (run.matrixSha256 !== matrixHash) {
      structuralFailures.push(`matrix_hash_mismatch:${key}`);
    }
    if (run.commitSha !== approvedCommitSha) {
      structuralFailures.push(`approved_commit_mismatch:${key}`);
    }
    const capturedDate = run.capturedAt.slice(0, 10);
    if (
      capturedDate < matrix.reviewedAt ||
      capturedDate > matrix.expiresAt ||
      (currentDate && capturedDate > currentDate)
    ) {
      structuralFailures.push(`capture_outside_truth_window:${key}:${capturedDate}`);
    }
    const testCase = caseById.get(run.caseId);
    if (testCase) {
      const requestHash = stagedTerraReadinessRequestSha256(testCase.shopperRequest);
      if (run.requestSha256 !== requestHash) {
        structuralFailures.push(`request_hash_mismatch:${key}`);
      }
    }
    const expectedAtIndex = matrix.runOrder[index];
    if (expectedAtIndex !== key) {
      structuralFailures.push(`run_order_mismatch:${index}:${key}:${String(expectedAtIndex)}`);
    }
    const expectedAttempt = matrix.attemptPlan[index];
    if (
      run.attemptIndex !== expectedAttempt.index ||
      run.runId !== expectedAttempt.runId ||
      run.attemptNonce !== expectedAttempt.nonce
    ) {
      structuralFailures.push(`attempt_plan_mismatch:${index}`);
    }
    const expectedPreviousArtifactSha256 =
      index === 0
        ? null
        : createHash("sha256").update(artifacts[index - 1]).digest("hex");
    if (run.previousArtifactSha256 !== expectedPreviousArtifactSha256) {
      structuralFailures.push(`attempt_chain_mismatch:${index}`);
    }
    if (runIds.has(run.runId)) structuralFailures.push(`duplicate_run_id:${run.runId}`);
    runIds.add(run.runId);
    if (artifactHashes.has(run.artifactSha256)) {
      structuralFailures.push(`duplicate_artifact_hash:${run.artifactSha256}`);
    }
    artifactHashes.add(run.artifactSha256);
    commitShas.add(run.commitSha);
    validRuns.push(run);
  }
  if (requireComplete) {
    for (const key of expectedKeys) {
      if (!seenKeys.has(key)) structuralFailures.push(`missing_run:${key}`);
    }
  } else {
    for (const key of matrix.runOrder.slice(0, artifacts.length)) {
      if (!seenKeys.has(key)) structuralFailures.push(`missing_prefix_run:${key}`);
    }
  }
  if (commitShas.size > 1) structuralFailures.push("multiple_commit_shas");
  return {
    structuralFailures: unique(structuralFailures),
    validRuns,
    caseById,
  };
}

function mechanicallyAnalyze(matrix, validRuns, caseById) {
  const haltFailures = [];
  const qualityFailures = [];

  for (const run of validRuns) {
    validateRunMechanics(
      run,
      caseById.get(run.caseId),
      matrix,
      haltFailures,
      qualityFailures,
    );
  }
  const metrics = buildMetrics(matrix, validRuns, qualityFailures, haltFailures);
  return {
    haltFailures: unique(haltFailures),
    qualityFailures: unique(qualityFailures),
    metrics,
  };
}

export function analyzeStagedTerraReadinessPrefix({
  matrix,
  artifacts,
  approvedCommitSha,
  now = new Date(),
}) {
  const authenticated = authenticateArtifactRuns({
    matrix,
    artifacts,
    approvedCommitSha,
    now,
    requireComplete: false,
  });
  if (authenticated.structuralFailures.length > 0) {
    return invalidAnalysis(matrix, authenticated.structuralFailures);
  }
  const mechanical = mechanicallyAnalyze(
    matrix,
    authenticated.validRuns,
    authenticated.caseById,
  );
  let decision;
  if (mechanical.haltFailures.length > 0) decision = "halt";
  else if (mechanical.qualityFailures.length > 0) decision = "fail";
  else if (artifacts.length === matrix.runOrder.length) {
    decision = "ready_for_manual_review";
  } else decision = "next_attempt_review_required";
  return withAuthorityBoundary({
    decision,
    structuralFailures: [],
    haltFailures: mechanical.haltFailures,
    qualityFailures: mechanical.qualityFailures,
    manualReviewFailures: [],
    pendingManualReview:
      decision === "ready_for_manual_review"
        ? pendingManualExpectations(
            manualExpectations(authenticated.validRuns),
          )
        : [],
    stopRequired: true,
    nextRun:
      decision === "next_attempt_review_required"
        ? matrix.runOrder[artifacts.length]
        : null,
    metrics: mechanical.metrics,
  });
}

export function analyzeStagedTerraReadiness({
  matrix,
  artifacts,
  approvedCommitSha,
  manualReview,
  now = new Date(),
}) {
  const authenticated = authenticateArtifactRuns({
    matrix,
    artifacts,
    approvedCommitSha,
    now,
    requireComplete: true,
  });
  if (authenticated.structuralFailures.length > 0) {
    return invalidAnalysis(matrix, authenticated.structuralFailures);
  }
  const haltFailures = [];
  let manualReviewFailures = [];
  let pendingManualReview = [];
  const mechanical = mechanicallyAnalyze(
    matrix,
    authenticated.validRuns,
    authenticated.caseById,
  );
  haltFailures.push(...mechanical.haltFailures);

  if (manualReview === undefined || manualReview === null) {
    pendingManualReview = pendingManualExpectations(
      manualExpectations(authenticated.validRuns),
    );
  } else {
    const manualResult = validateManualReview(
      manualReview,
      matrix,
      authenticated.validRuns,
      approvedCommitSha,
      now,
    );
    manualReviewFailures = manualResult.failures;
    haltFailures.push(...manualResult.haltFailures);
    pendingManualReview = manualResult.pending;
  }

  const uniqueHalts = unique(haltFailures);
  const uniqueQuality = mechanical.qualityFailures;
  let decision;
  if (uniqueHalts.length > 0) decision = "halt";
  else if (uniqueQuality.length > 0 || manualReviewFailures.length > 0) {
    decision = "fail";
  } else if (pendingManualReview.length > 0) decision = "needs_manual_review";
  else decision = "independent_review_required";

  return withAuthorityBoundary({
    decision,
    structuralFailures: [],
    haltFailures: uniqueHalts,
    qualityFailures: uniqueQuality,
    manualReviewFailures,
    pendingManualReview,
    stopRequired: true,
    metrics: mechanical.metrics,
  });
}

function cliArguments(argumentsList) {
  const parsed = {
    matrix: null,
    artifacts: null,
    approvedCommitSha: null,
    review: null,
    now: new Date(),
    prefix: false,
  };
  for (const argument of argumentsList) {
    if (argument.startsWith("--matrix=")) parsed.matrix = argument.slice(9);
    else if (argument.startsWith("--artifacts=")) {
      parsed.artifacts = argument.slice(12);
    } else if (argument.startsWith("--approved-commit=")) {
      parsed.approvedCommitSha = argument.slice(18);
    }
    else if (argument.startsWith("--review=")) parsed.review = argument.slice(9);
    else if (argument.startsWith("--now=")) parsed.now = argument.slice(6);
    else if (argument === "--prefix") parsed.prefix = true;
    else throw new Error(`unknown_argument:${argument}`);
  }
  if (!parsed.matrix || !parsed.artifacts || !parsed.approvedCommitSha) {
    throw new Error(
      "usage: node scripts/staged-terra-readiness.mjs --matrix=<path> --artifacts=<path,path,...> --approved-commit=<40-hex> [--prefix] [--review=<path>] [--now=YYYY-MM-DD]",
    );
  }
  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function runCli(argumentsList) {
  try {
    const args = cliArguments(argumentsList);
    const analyze = args.prefix
      ? analyzeStagedTerraReadinessPrefix
      : analyzeStagedTerraReadiness;
    const result = analyze({
      matrix: readJson(args.matrix),
      artifacts: args.artifacts.split(",").map((path) => readFileSync(path)),
      approvedCommitSha: args.approvedCommitSha,
      manualReview: args.review ? readJson(args.review) : undefined,
      now: args.now,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = [
      "next_attempt_review_required",
      "ready_for_manual_review",
      "needs_manual_review",
      "independent_review_required",
    ].includes(result.decision)
      ? 2
      : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2));
}

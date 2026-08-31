import { createHash } from "node:crypto";

import {
  STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
  STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
  stagedTerraRegisteredProductMatchesIdentity,
  stagedTerraRegisteredProducts,
} from "./staged-terra-readiness-trace.mjs";

export const STAGED_TERRA_READINESS_ARTIFACT_VERSION =
  "staged-terra-readiness-artifact-v7";
export const STAGED_TERRA_READINESS_PRODUCER_VERSION =
  "staged-terra-readiness-producer-v7";
export const STAGED_TERRA_READINESS_REVIEW_PACKET_VERSION =
  "staged-terra-readiness-review-packet-v1";

const ENVELOPE_KEYS = ["schemaVersion", "payload", "payloadSha256"];
const PAYLOAD_KEYS = [
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
  "capturedAt",
  "terminal",
  "presentationVersion",
  "finalAdvice",
  "cards",
  "sources",
  "registeredProductTrace",
  "routeTrace",
  "diagnostics",
  "verificationAttribution",
  "counters",
  "usageLedgers",
];
const TERMINAL_KEYS = ["state", "statusCode", "code", "wallClockMs"];
const PROJECTED_SOURCE_KEYS = ["id", "label", "title", "url"];
const PROJECTED_CARD_KEYS = [
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
const PROJECTED_IDENTITY_KEYS = ["brand", "productName", "model", "variant"];
const PROJECTED_IDENTITY_VERIFICATION_KEYS = ["state", "observedAt"];
const PROJECTED_REQUIREMENT_KEYS = [
  "id",
  "status",
  "explanation",
  "sourceIds",
];
const PROJECTED_COMMERCE_KEYS = [
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
const ASSESSMENT_KEYS = ["why", "bestFor", "mainTradeoff"];
const REVIEW_POINT_KEYS = ["text", "sourceIds"];
const REVIEW_CLAIM_KEYS = ["claimType", "text", "sourceIds", "evidenceScope"];
const REVIEW_IMAGE_KEYS = ["state", "url"];
const REGISTERED_PRODUCT_TRACE_KEYS = ["schemaVersion", "products"];
const REGISTERED_PRODUCT_TRACE_INPUT_KEYS = [
  "id",
  "registry",
  "validatedResearchCandidates",
  "acceptedResearchCandidates",
  "verification",
];
const REGISTERED_PRODUCT_TRACE_PRODUCT_KEYS = [
  ...REGISTERED_PRODUCT_TRACE_INPUT_KEYS,
  "finalRanks",
];
const REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS = [
  "eligible",
  "closeMatch",
  "excluded",
  "firstLoss",
];
const DIAGNOSTIC_KEYS = ["research", "verification"];
const RESEARCH_KEYS = [
  "submitted",
  "accepted",
  "deferredMissingTitle",
  "rejected",
];
export const STAGED_TERRA_READINESS_VERIFICATION_KEYS = [
  "candidates",
  "sourceFetchAttempts",
  "successfulSourceFetches",
  "commerceRequests",
  "commerceRows",
  "eligible",
  "closeMatch",
  "excluded",
  "firstLoss",
];
export const STAGED_TERRA_READINESS_FIRST_LOSS_KEYS = [
  "assetIdentity",
  "relationship",
  "productUrl",
  "hardRequirementFailed",
  "hardRequirementNotVerified",
  "noLossEligible",
];
export const STAGED_TERRA_READINESS_COUNTER_KEYS = [
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
];
const USAGE_LEDGER_KEYS = [
  "operation",
  "outcome",
  "durationMs",
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "webSearchCalls",
];
const ROUTE_TRACE_KEYS = ["stage", "outcome", "ledger", "failureAttribution"];
const FAILURE_ATTRIBUTION_KEYS = [
  "validationReason",
  "candidateValidationReason",
  "candidateIdentityValidationReason",
  "candidateSourceValidationReason",
];
const ROUTE_TRACE_LEDGER_KEYS = [
  "runtimeVersion",
  "operation",
  "outcome",
  "promptVersion",
  "modelRequested",
  "modelReturned",
  "status",
  "responseIdHash",
  "durationMs",
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "webSearchCalls",
  "sourceCount",
  "failureReason",
];
const EXPECTED_RUNTIME_VERSION = "staged-terra-runtime-v10";
const EXPECTED_MODEL = "gpt-5.6-terra";
const EXPECTED_RESEARCH_PROMPT_VERSION = "staged-terra-research-prompt-v7";
const EXPECTED_PRESENTATION_PROMPT_VERSION =
  "staged-terra-presentation-prompt-v1";
const EXPECTED_PRESENTATION_VERSION = "staged-terra-presentation-v1";
const PUBLIC_FAILURE_BY_CODE = {
  invalid_config: {
    statusCode: 500,
    error: "ReviewRadar's staged Terra mode is not configured.",
  },
  invalid_json: {
    statusCode: 400,
    error: "The request body must be valid JSON.",
  },
  invalid_request: {
    statusCode: 400,
    error: "The shopper request is too large.",
  },
  invalid_job: {
    statusCode: 400,
    error: "This research job is invalid. Please start a new search.",
  },
  expired_job: {
    statusCode: 410,
    error: "This research job expired. Please start a new search.",
  },
  research_failed: {
    statusCode: 502,
    error: "Research could not be completed safely. Please try again.",
  },
  verification_failed: {
    statusCode: 502,
    error: "Research finished, but enough evidence could not be verified safely.",
  },
  presentation_failed: {
    statusCode: 502,
    error: "Evidence was verified, but the final briefing could not be completed safely.",
  },
};
const MAXIMUM_EVIDENCE_AGE_MS = 86_400_000;
const RUNTIME_STATUS_VALUES = new Set([
  "not_started",
  "unknown",
  "queued",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "incomplete",
]);
const RUNTIME_FAILURE_REASONS = new Set([
  "request_error",
  "missing_response_id",
  "terminal_failure",
  "invalid_tracking_state",
  "response_id_mismatch",
  "invalid_completed_response",
  "invalid_json",
  "invalid_research_contract",
  "invalid_presentation_contract",
]);
const RESEARCH_VALIDATION_REASONS = new Set([
  "research_shape",
  "research_source_registry",
  "research_candidate_invalid",
  "research_candidate_duplicate",
]);
const RESEARCH_CANDIDATE_VALIDATION_REASONS = new Set([
  "candidate_identity",
  "candidate_sources",
  "candidate_requirements",
  "candidate_facts",
]);
const RESEARCH_CANDIDATE_IDENTITY_VALIDATION_REASONS = new Set([
  "candidate_identity_shape",
  "candidate_identity_brand_relation",
  "candidate_identity_model_relation",
  "candidate_identity_model_conflict",
  "candidate_identity_product_type_relation",
]);
const RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS = new Set([
  "candidate_source_shape",
  "candidate_source_duplicate",
  "candidate_source_unsafe",
  "candidate_source_unregistered",
  "candidate_source_identity_unproven",
  "candidate_source_product_page_unproven",
]);
const FAILURE_LEDGER_UNIONS = {
  research_start: {
    request_error: new Set(["not_started"]),
    missing_response_id: new Set([
      "unknown",
      "queued",
      "in_progress",
      "completed",
      "failed",
      "cancelled",
      "incomplete",
    ]),
    terminal_failure: new Set([
      "unknown",
      "failed",
      "cancelled",
      "incomplete",
    ]),
  },
  research_poll: {
    invalid_tracking_state: new Set(["not_started"]),
    request_error: new Set(["not_started"]),
    response_id_mismatch: new Set(["not_started"]),
    invalid_completed_response: new Set([
      "unknown",
      "completed",
      "failed",
      "cancelled",
      "incomplete",
    ]),
    invalid_json: new Set(["completed"]),
    invalid_research_contract: new Set(["completed"]),
  },
  presentation: {
    request_error: new Set(["not_started"]),
    invalid_completed_response: new Set([
      "unknown",
      "queued",
      "in_progress",
      "completed",
      "failed",
      "cancelled",
      "incomplete",
    ]),
    invalid_json: new Set(["completed"]),
    invalid_presentation_contract: new Set(["completed"]),
  },
};
const RESEARCH_REJECTION_COUNT_KEYS = [
  "missingTitle",
  "brandNotInTitle",
  "modelNotInTitle",
  "modelConflictInTitle",
  "wrongProductType",
  "completeProductPageUnavailable",
];
const PRODUCER_INPUT_KEYS = [
  "matrix",
  "caseId",
  "run",
  "runId",
  "attemptNonce",
  "previousArtifactSha256",
  "commitSha",
  "capturedAt",
  "terminalResponse",
  "routeDiagnostics",
  "counters",
  "registeredProductTrace",
];
const TERMINAL_RESPONSE_KEYS = ["statusCode", "body", "wallClockMs"];
const PUBLIC_COMPLETED_KEYS = [
  "pipeline",
  "version",
  "state",
  "presentationVersion",
  "cards",
  "sources",
  "finalAdvice",
];
const PUBLIC_FAILURE_KEYS = ["pipeline", "version", "state", "code", "error"];
const PUBLIC_SOURCE_KEYS = ["id", "label", "title", "url"];
const PUBLIC_CARD_KEYS = [
  "key",
  "rank",
  "recommendationStatus",
  "identity",
  "identityVerification",
  "assessment",
  "pros",
  "cons",
  "requirementChecks",
  "claims",
  "commerce",
  "image",
];
const PUBLIC_IDENTITY_KEYS = ["brand", "product_name", "model", "variant"];
const PUBLIC_IDENTITY_VERIFICATION_KEYS = ["state", "label", "observedAt"];
const PUBLIC_TRUST_VALUE_KEYS = ["value", "trust", "label", "sourceIds"];
const PUBLIC_REQUIREMENT_KEYS = [
  "requirement",
  "status",
  "explanation",
  "trust",
  "label",
  "sourceIds",
];
const PUBLIC_CLAIM_KEYS = [
  "claimType",
  "value",
  "sourceIds",
  "evidenceScope",
  "trust",
  "label",
];
const PUBLIC_COMMERCE_KEYS = [
  "state",
  "label",
  "priceAmount",
  "currency",
  "seller",
  "productUrl",
  "availability",
  "observedAt",
];
const PUBLIC_IMAGE_KEYS = ["state", "label", "url"];
const ROUTE_DIAGNOSTIC_ALLOWED_KEYS = new Set([
  "stage",
  "outcome",
  "ledger",
  "validationReason",
  "candidateValidationReason",
  "candidateIdentityValidationReason",
  "candidateSourceValidationReason",
  "identitySourceFilter",
  "counts",
  "verificationAttribution",
]);
const RUNTIME_LEDGER_KEYS = [
  "runtimeVersion",
  "operation",
  "promptVersion",
  "modelRequested",
  "modelReturned",
  "status",
  "responseIdHash",
  "durationMs",
  "usage",
  "sourceCount",
  "failureReason",
];
const RUNTIME_USAGE_KEYS = [
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "totalTokens",
  "webSearchCalls",
];
const IDENTITY_SOURCE_FILTER_KEYS = [
  "submittedCandidates",
  "acceptedCandidates",
  "deferredMissingTitleCandidates",
  "rejectedCandidates",
  "rejectionCandidateCounts",
];
const VERIFICATION_COUNT_KEYS = [
  "candidates",
  "sourceFetchAttempts",
  "successfulSourceFetches",
  "commerceRequests",
  "commerceRows",
  "eligibleCandidates",
  "closeMatchCandidates",
  "excludedCandidates",
];
const VERIFICATION_ATTRIBUTION_KEYS = [
  "candidateFirstLossCounts",
  "assetIdentityFailureCandidateCounts",
  "commerceOutcomeCandidateCounts",
  "completeProductRelationshipFailureCandidateCounts",
  "identitySafeProductUrlFailureCandidateCounts",
  "sourceRejectionCandidateCounts",
  "claimRejectionCandidateCounts",
];
const ROUTE_FIRST_LOSS_KEYS = [
  "assetIdentityUnproven",
  "completeProductRelationshipUnproven",
  "identitySafeProductUrlUnavailable",
  "hardRequirementFailed",
  "hardRequirementNotVerified",
  "noLossEligible",
];
const ASSET_IDENTITY_FAILURE_KEYS = [
  "noAssetCandidates",
  "invalidTargetIdentity",
  "missingTitle",
  "brandNotInTitle",
  "modelNotInTitle",
  "modelConflictInTitle",
  "wrongProductType",
];
const COMMERCE_OUTCOME_KEYS = [
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
];
const RELATIONSHIP_FAILURE_KEYS = [
  "nonProductPage",
  "complementPrimaryItem",
  "productTypeConflict",
  "complementRelationshipWording",
  "insufficientCompleteProductEvidence",
];
const PRODUCT_URL_FAILURE_KEYS = [
  "missingOrInvalidProductUrl",
  "unsafeProductUrlHost",
  "productUrlRedirectWrapper",
  "productUrlIneligible",
  "productUrlTypeConflict",
  "productUrlDescriptiveIdentityConflict",
  "productUrlIdentityMismatch",
];
const SOURCE_REJECTION_KEYS = ["sourceNotOwnedByCandidate", "sourceInputInvalid"];
const CLAIM_REJECTION_KEYS = ["observedClaimInvalid"];

function validBoundedCountRecord(value, keys, maximum) {
  return (
    exactKeys(value, keys) &&
    keys.every(
      (key) => nonNegativeInteger(value[key]) && value[key] <= maximum,
    )
  );
}

function countRecordTotal(value, keys) {
  return keys.reduce((total, key) => total + value[key], 0);
}

export function validateStagedTerraReadinessVerificationAttribution(
  value,
  verification,
) {
  if (verification === null) return value === null;
  if (
    !verification ||
    !nonNegativeInteger(verification.candidates) ||
    !exactKeys(verification.firstLoss, STAGED_TERRA_READINESS_FIRST_LOSS_KEYS) ||
    !exactKeys(value, VERIFICATION_ATTRIBUTION_KEYS)
  ) {
    return false;
  }
  const candidates = verification.candidates;
  const firstLoss = value.candidateFirstLossCounts;
  if (
    !validBoundedCountRecord(firstLoss, ROUTE_FIRST_LOSS_KEYS, candidates) ||
    firstLoss.assetIdentityUnproven !== verification.firstLoss.assetIdentity ||
    firstLoss.completeProductRelationshipUnproven !==
      verification.firstLoss.relationship ||
    firstLoss.identitySafeProductUrlUnavailable !==
      verification.firstLoss.productUrl ||
    firstLoss.hardRequirementFailed !==
      verification.firstLoss.hardRequirementFailed ||
    firstLoss.hardRequirementNotVerified !==
      verification.firstLoss.hardRequirementNotVerified ||
    firstLoss.noLossEligible !== verification.firstLoss.noLossEligible ||
    firstLoss.noLossEligible !== verification.eligible ||
    firstLoss.hardRequirementNotVerified !== verification.closeMatch ||
    firstLoss.assetIdentityUnproven +
        firstLoss.completeProductRelationshipUnproven +
        firstLoss.identitySafeProductUrlUnavailable +
        firstLoss.hardRequirementFailed !==
      verification.excluded ||
    countRecordTotal(firstLoss, ROUTE_FIRST_LOSS_KEYS) !== candidates
  ) {
    return false;
  }
  const branches = [
    [
      value.assetIdentityFailureCandidateCounts,
      ASSET_IDENTITY_FAILURE_KEYS,
      firstLoss.assetIdentityUnproven,
      true,
    ],
    [
      value.commerceOutcomeCandidateCounts,
      COMMERCE_OUTCOME_KEYS,
      firstLoss.assetIdentityUnproven,
      true,
    ],
    [
      value.completeProductRelationshipFailureCandidateCounts,
      RELATIONSHIP_FAILURE_KEYS,
      firstLoss.completeProductRelationshipUnproven,
      true,
    ],
    [
      value.identitySafeProductUrlFailureCandidateCounts,
      PRODUCT_URL_FAILURE_KEYS,
      firstLoss.identitySafeProductUrlUnavailable,
      true,
    ],
    [value.sourceRejectionCandidateCounts, SOURCE_REJECTION_KEYS, candidates, false],
    [value.claimRejectionCandidateCounts, CLAIM_REJECTION_KEYS, candidates, false],
  ];
  return branches.every(([record, keys, maximum, requiresCoverage]) =>
    validBoundedCountRecord(record, keys, maximum) &&
    (!requiresCoverage || countRecordTotal(record, keys) >= maximum),
  );
}

function projectVerificationAttribution(value) {
  return Object.fromEntries(
    [
      ["candidateFirstLossCounts", ROUTE_FIRST_LOSS_KEYS],
      ["assetIdentityFailureCandidateCounts", ASSET_IDENTITY_FAILURE_KEYS],
      ["commerceOutcomeCandidateCounts", COMMERCE_OUTCOME_KEYS],
      [
        "completeProductRelationshipFailureCandidateCounts",
        RELATIONSHIP_FAILURE_KEYS,
      ],
      ["identitySafeProductUrlFailureCandidateCounts", PRODUCT_URL_FAILURE_KEYS],
      ["sourceRejectionCandidateCounts", SOURCE_REJECTION_KEYS],
      ["claimRejectionCandidateCounts", CLAIM_REJECTION_KEYS],
    ].map(([field, keys]) => [
      field,
      Object.fromEntries(keys.map((key) => [key, value[field][key]])),
    ]),
  );
}
const HASH_64 = /^[0-9a-f]{64}$/;
const HASH_40 = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const ATTEMPT_NONCE = /^nonce-[0-9a-f]{64}$/;
const MAX_ARTIFACT_BYTES = 1_000_000;
const SENSITIVE_QUERY_KEY =
  /(?:^|[_-])(auth|authorization|credential|key|password|secret|session|signature|sig|token)(?:$|[_-])/i;
const SENSITIVE_QUERY_COMPACT = /^(?:x)?(?:apikey|accesstoken|authtoken|authorization|clientsecret|credential|idtoken|password|privatekey|refreshtoken|secret|session|sessionid|sessiontoken|signature|token|xamzcredential|xamzsignature)$/i;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function onlyAllowedKeys(value, allowed) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowed.has(key));
}

function boundedString(value, maximum = 2_000) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function positiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isoDateTime(value) {
  if (!boundedString(value, 64)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function freshAtCapture(observedAt, capturedAt) {
  if (!isoDateTime(observedAt) || !isoDateTime(capturedAt)) return false;
  const observedMs = Date.parse(observedAt);
  const capturedMs = Date.parse(capturedAt);
  return (
    observedMs <= capturedMs &&
    capturedMs - observedMs <= MAXIMUM_EVIDENCE_AGE_MS
  );
}

function uniqueStrings(value, { allowEmpty = false, maximum = 32 } = {}) {
  return (
    Array.isArray(value) &&
    value.length <= maximum &&
    (allowEmpty || value.length > 0) &&
    value.every((item) => boundedString(item, 128)) &&
    new Set(value).size === value.length
  );
}

function uniqueSafeIds(value, options) {
  return uniqueStrings(value, options) && value.every((item) => SAFE_ID.test(item));
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

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stagedTerraReadinessCanonicalSha256(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function ipv4IsPublic(hostname) {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) ||
    (a === 192 && b === 88 && parts[2] === 99) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

export function isConservativePublicHttpsUrl(value) {
  if (!boundedString(value, 2_048)) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash !== "" ||
    (parsed.port && parsed.port !== "443")
  ) {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname.length > 253 ||
    hostname === "localhost" ||
    hostname.endsWith(".") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example") ||
    hostname.includes(":")
  ) {
    return false;
  }
  const publicIpv4 = ipv4IsPublic(hostname);
  if (publicIpv4 === false) return false;
  if (publicIpv4 === null && !hostname.includes(".")) return false;
  for (const key of parsed.searchParams.keys()) {
    const compactKey = key.replace(/[^A-Za-z0-9]/g, "");
    if (
      SENSITIVE_QUERY_KEY.test(key) ||
      SENSITIVE_QUERY_COMPACT.test(compactKey)
    ) {
      return false;
    }
  }
  return true;
}

function inputError(path) {
  throw new Error(`staged_readiness_artifact_input_invalid:${path}`);
}

function requireCondition(condition, path) {
  if (!condition) inputError(path);
}

function requireCountRecord(value, keys, path) {
  requireCondition(exactKeys(value, keys), `${path}.keys`);
  for (const key of keys) {
    requireCondition(nonNegativeInteger(value[key]), `${path}.${key}`);
  }
}

function projectPublicSources(value) {
  requireCondition(Array.isArray(value) && value.length <= 128, "public.sources");
  const ids = new Set();
  return value.map((source, index) => {
    requireCondition(exactKeys(source, PUBLIC_SOURCE_KEYS), `public.sources.${index}.keys`);
    requireCondition(SAFE_ID.test(source.id), `public.sources.${index}.id`);
    requireCondition(!ids.has(source.id), `public.sources.${index}.duplicate_id`);
    ids.add(source.id);
    requireCondition(boundedString(source.label, 128), `public.sources.${index}.label`);
    requireCondition(boundedString(source.title, 500), `public.sources.${index}.title`);
    requireCondition(
      source.url === null || isConservativePublicHttpsUrl(source.url),
      `public.sources.${index}.url`,
    );
    return {
      id: source.id,
      label: source.label,
      title: source.title,
      url: source.url,
    };
  });
}

function publicTrustValue(value, path) {
  requireCondition(exactKeys(value, PUBLIC_TRUST_VALUE_KEYS), `${path}.keys`);
  requireCondition(boundedString(value.value), `${path}.value`);
  requireCondition(value.trust === "research_synthesis", `${path}.trust`);
  requireCondition(boundedString(value.label, 128), `${path}.label`);
  requireCondition(uniqueSafeIds(value.sourceIds), `${path}.sourceIds`);
  return { text: value.value, sourceIds: [...value.sourceIds] };
}

function projectPublicCards(value, sources) {
  requireCondition(Array.isArray(value) && value.length >= 1 && value.length <= 5, "public.cards");
  const keys = new Set();
  return value.map((card, index) => {
    const path = `public.cards.${index}`;
    requireCondition(exactKeys(card, PUBLIC_CARD_KEYS), `${path}.keys`);
    requireCondition(nonNegativeInteger(card.rank) && card.rank === index + 1, `${path}.rank`);
    requireCondition(boundedString(card.key, 128), `${path}.key`);
    requireCondition(!keys.has(card.key), `${path}.duplicate_key`);
    keys.add(card.key);
    requireCondition(card.recommendationStatus === "Best Match", `${path}.recommendationStatus`);
    requireCondition(exactKeys(card.identity, PUBLIC_IDENTITY_KEYS), `${path}.identity.keys`);
    requireCondition(boundedString(card.identity.brand, 200), `${path}.identity.brand`);
    requireCondition(boundedString(card.identity.product_name, 500), `${path}.identity.product_name`);
    requireCondition(boundedString(card.identity.model, 200), `${path}.identity.model`);
    requireCondition(
      card.identity.variant === null || boundedString(card.identity.variant, 200),
      `${path}.identity.variant`,
    );
    requireCondition(
      exactKeys(card.identityVerification, PUBLIC_IDENTITY_VERIFICATION_KEYS),
      `${path}.identityVerification.keys`,
    );
    requireCondition(card.identityVerification.state === "verified", `${path}.identityVerification.state`);
    requireCondition(boundedString(card.identityVerification.label, 128), `${path}.identityVerification.label`);
    requireCondition(isoDateTime(card.identityVerification.observedAt), `${path}.identityVerification.observedAt`);

    requireCondition(exactKeys(card.assessment, ASSESSMENT_KEYS), `${path}.assessment.keys`);
    const assessment = Object.fromEntries(
      ASSESSMENT_KEYS.map((key) => [
        key,
        publicTrustValue(card.assessment[key], `${path}.assessment.${key}`),
      ]),
    );
    const projectPoints = (points, field) => {
      requireCondition(Array.isArray(points) && points.length <= 10, `${path}.${field}`);
      return points.map((point, pointIndex) =>
        publicTrustValue(point, `${path}.${field}.${pointIndex}`),
      );
    };
    const pros = projectPoints(card.pros, "pros");
    const cons = projectPoints(card.cons, "cons");

    requireCondition(
      Array.isArray(card.requirementChecks) &&
        card.requirementChecks.length >= 1 &&
        card.requirementChecks.length <= 12,
      `${path}.requirementChecks`,
    );
    const requirementIds = new Set();
    const requirementChecks = card.requirementChecks.map((check, checkIndex) => {
      const checkPath = `${path}.requirementChecks.${checkIndex}`;
      requireCondition(exactKeys(check, PUBLIC_REQUIREMENT_KEYS), `${checkPath}.keys`);
      requireCondition(boundedString(check.requirement, 128), `${checkPath}.requirement`);
      requireCondition(!requirementIds.has(check.requirement), `${checkPath}.duplicate`);
      requirementIds.add(check.requirement);
      requireCondition(["Pass", "Fail", "Needs verification"].includes(check.status), `${checkPath}.status`);
      requireCondition(boundedString(check.explanation), `${checkPath}.explanation`);
      requireCondition(check.trust === "research_synthesis", `${checkPath}.trust`);
      requireCondition(boundedString(check.label, 128), `${checkPath}.label`);
      requireCondition(uniqueSafeIds(check.sourceIds), `${checkPath}.sourceIds`);
      return {
        id: check.requirement,
        status: check.status,
        explanation: check.explanation,
        sourceIds: [...check.sourceIds],
      };
    });

    requireCondition(Array.isArray(card.claims) && card.claims.length <= 24, `${path}.claims`);
    const claims = card.claims.map((claim, claimIndex) => {
      const claimPath = `${path}.claims.${claimIndex}`;
      requireCondition(exactKeys(claim, PUBLIC_CLAIM_KEYS), `${claimPath}.keys`);
      requireCondition(boundedString(claim.claimType, 128), `${claimPath}.claimType`);
      requireCondition(boundedString(claim.value), `${claimPath}.value`);
      requireCondition(uniqueSafeIds(claim.sourceIds), `${claimPath}.sourceIds`);
      requireCondition(boundedString(claim.evidenceScope, 128), `${claimPath}.evidenceScope`);
      requireCondition(claim.trust === "source_reported", `${claimPath}.trust`);
      requireCondition(boundedString(claim.label, 128), `${claimPath}.label`);
      return {
        claimType: claim.claimType,
        text: claim.value,
        sourceIds: [...claim.sourceIds],
        evidenceScope: claim.evidenceScope,
      };
    });

    requireCondition(exactKeys(card.commerce, PUBLIC_COMMERCE_KEYS), `${path}.commerce.keys`);
    let commerce;
    if (card.commerce.state === "verified") {
      requireCondition(positiveFinite(card.commerce.priceAmount), `${path}.commerce.priceAmount`);
      requireCondition(card.commerce.currency === "USD", `${path}.commerce.currency`);
      requireCondition(boundedString(card.commerce.seller, 200), `${path}.commerce.seller`);
      requireCondition(isConservativePublicHttpsUrl(card.commerce.productUrl), `${path}.commerce.productUrl`);
      requireCondition(card.commerce.availability === "in_stock", `${path}.commerce.availability`);
      requireCondition(isoDateTime(card.commerce.observedAt), `${path}.commerce.observedAt`);
      requireCondition(boundedString(card.commerce.label, 128), `${path}.commerce.label`);
      const commerceSourceIds = sources
        .filter((source) => source.url === card.commerce.productUrl)
        .map((source) => source.id);
      commerce = {
        state: "verified",
        priceAmount: card.commerce.priceAmount,
        currency: "USD",
        seller: card.commerce.seller,
        productUrl: card.commerce.productUrl,
        availability: "in_stock",
        observedAt: card.commerce.observedAt,
        sourceIds: commerceSourceIds,
      };
    } else {
      requireCondition(card.commerce.state === "not_verified", `${path}.commerce.state`);
      for (const field of [
        "priceAmount",
        "currency",
        "seller",
        "productUrl",
        "availability",
        "observedAt",
      ]) {
        requireCondition(card.commerce[field] === null, `${path}.commerce.${field}`);
      }
      requireCondition(boundedString(card.commerce.label, 128), `${path}.commerce.label`);
      commerce = {
        state: "not_verified",
        priceAmount: null,
        currency: null,
        seller: null,
        productUrl: null,
        availability: null,
        observedAt: null,
        sourceIds: [],
      };
    }

    requireCondition(exactKeys(card.image, PUBLIC_IMAGE_KEYS), `${path}.image.keys`);
    let image;
    if (card.image.state === "verified") {
      requireCondition(isConservativePublicHttpsUrl(card.image.url), `${path}.image.url`);
      requireCondition(boundedString(card.image.label, 128), `${path}.image.label`);
      image = { state: "verified", url: card.image.url };
    } else {
      requireCondition(card.image.state === "not_verified", `${path}.image.state`);
      requireCondition(card.image.url === null, `${path}.image.url`);
      requireCondition(boundedString(card.image.label, 128), `${path}.image.label`);
      image = { state: "not_verified", url: null };
    }

    const reviewPoints = [
      ...Object.values(assessment),
      ...pros,
      ...cons,
      ...claims,
    ];
    const sourceIds = [
      ...new Set([
        ...reviewPoints.flatMap((point) => point.sourceIds),
        ...requirementChecks.flatMap((check) => check.sourceIds),
        ...commerce.sourceIds,
      ]),
    ];
    requireCondition(sourceIds.length >= 1, `${path}.sourceIds.empty`);

    return {
      rank: card.rank,
      key: card.key,
      recommendationStatus: card.recommendationStatus,
      identity: {
        brand: card.identity.brand,
        productName: card.identity.product_name,
        model: card.identity.model,
        variant: card.identity.variant,
      },
      identityVerification: {
        state: "verified",
        observedAt: card.identityVerification.observedAt,
      },
      requirementChecks,
      commerce,
      sourceIds,
      reviewEvidence: { assessment, pros, cons, claims, image },
    };
  });
}

function validFailureLedgerUnion(operation, status, failureReason) {
  return Boolean(
    typeof failureReason === "string" &&
      FAILURE_LEDGER_UNIONS[operation]?.[failureReason]?.has(status),
  );
}

function runtimeLedger(value, path) {
  requireCondition(exactKeys(value, RUNTIME_LEDGER_KEYS), `${path}.keys`);
  requireCondition(boundedString(value.runtimeVersion, 128), `${path}.runtimeVersion`);
  requireCondition(
    ["research_start", "research_poll", "research_cancel", "presentation"].includes(
      value.operation,
    ),
    `${path}.operation`,
  );
  requireCondition(boundedString(value.promptVersion, 128), `${path}.promptVersion`);
  requireCondition(boundedString(value.modelRequested, 128), `${path}.modelRequested`);
  requireCondition(
    value.modelReturned === null || boundedString(value.modelReturned, 128),
    `${path}.modelReturned`,
  );
  requireCondition(RUNTIME_STATUS_VALUES.has(value.status), `${path}.status`);
  requireCondition(
    value.responseIdHash === null || HASH_64.test(value.responseIdHash),
    `${path}.responseIdHash`,
  );
  requireCondition(nonNegativeInteger(value.durationMs), `${path}.durationMs`);
  requireCondition(exactKeys(value.usage, RUNTIME_USAGE_KEYS), `${path}.usage.keys`);
  for (const key of RUNTIME_USAGE_KEYS) {
    requireCondition(nonNegativeInteger(value.usage[key]), `${path}.usage.${key}`);
  }
  requireCondition(
    value.usage.cachedInputTokens <= value.usage.inputTokens,
    `${path}.usage.cachedInputTokens`,
  );
  requireCondition(
    value.usage.totalTokens === value.usage.inputTokens + value.usage.outputTokens,
    `${path}.usage.totalTokens`,
  );
  requireCondition(nonNegativeInteger(value.sourceCount), `${path}.sourceCount`);
  requireCondition(
    value.failureReason === null || RUNTIME_FAILURE_REASONS.has(value.failureReason),
    `${path}.failureReason`,
  );
  return value;
}

function projectUsageLedger(value, outcome, path) {
  const ledger = runtimeLedger(value, path);
  return {
    operation: ledger.operation,
    outcome,
    durationMs: ledger.durationMs,
    inputTokens: ledger.usage.inputTokens,
    cachedInputTokens: ledger.usage.cachedInputTokens,
    outputTokens: ledger.usage.outputTokens,
    webSearchCalls: ledger.usage.webSearchCalls,
  };
}

function projectRouteTraceLedger(value, outcome, path) {
  const ledger = runtimeLedger(value, path);
  if (outcome === "pending") {
    requireCondition(
      ["queued", "in_progress"].includes(ledger.status) &&
        ledger.failureReason === null,
      `${path}.pending_union`,
    );
  } else if (outcome === "completed") {
    requireCondition(
      ledger.status === "completed" && ledger.failureReason === null,
      `${path}.completed_union`,
    );
  } else {
    requireCondition(
      outcome === "failed" &&
        validFailureLedgerUnion(
          ledger.operation,
          ledger.status,
          ledger.failureReason,
        ),
      `${path}.failed_union`,
    );
  }
  return {
    runtimeVersion: ledger.runtimeVersion,
    operation: ledger.operation,
    promptVersion: ledger.promptVersion,
    modelRequested: ledger.modelRequested,
    modelReturned: ledger.modelReturned,
    status: ledger.status,
    responseIdHash: ledger.responseIdHash,
    durationMs: ledger.durationMs,
    inputTokens: ledger.usage.inputTokens,
    cachedInputTokens: ledger.usage.cachedInputTokens,
    outputTokens: ledger.usage.outputTokens,
    webSearchCalls: ledger.usage.webSearchCalls,
    sourceCount: ledger.sourceCount,
    failureReason: ledger.failureReason,
    outcome,
  };
}

function usageLedgerFromTraceLedger(ledger) {
  return {
    operation: ledger.operation,
    outcome: ledger.outcome,
    durationMs: ledger.durationMs,
    inputTokens: ledger.inputTokens,
    cachedInputTokens: ledger.cachedInputTokens,
    outputTokens: ledger.outputTokens,
    webSearchCalls: ledger.webSearchCalls,
  };
}

function validResearchFailureAttribution(value) {
  if (!exactKeys(value, FAILURE_ATTRIBUTION_KEYS)) return false;
  if (!RESEARCH_VALIDATION_REASONS.has(value.validationReason)) return false;
  const candidateFailure = value.validationReason === "research_candidate_invalid";
  if (candidateFailure) {
    if (
      !RESEARCH_CANDIDATE_VALIDATION_REASONS.has(
        value.candidateValidationReason,
      )
    ) {
      return false;
    }
  } else if (value.candidateValidationReason !== null) {
    return false;
  }
  const identityFailure =
    value.candidateValidationReason === "candidate_identity";
  if (identityFailure) {
    if (
      !RESEARCH_CANDIDATE_IDENTITY_VALIDATION_REASONS.has(
        value.candidateIdentityValidationReason,
      )
    ) {
      return false;
    }
  } else if (value.candidateIdentityValidationReason !== null) {
    return false;
  }
  const sourceFailure = value.candidateValidationReason === "candidate_sources";
  if (sourceFailure) {
    return RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS.has(
      value.candidateSourceValidationReason,
    );
  }
  return value.candidateSourceValidationReason === null;
}

function projectResearchFailureAttribution(diagnostic) {
  if (
    diagnostic.stage !== "research_poll" ||
    diagnostic.outcome !== "failed" ||
    diagnostic.ledger?.failureReason !== "invalid_research_contract"
  ) {
    return null;
  }
  const attribution = {
    validationReason: diagnostic.validationReason ?? null,
    candidateValidationReason: diagnostic.candidateValidationReason ?? null,
    candidateIdentityValidationReason:
      diagnostic.candidateIdentityValidationReason ?? null,
    candidateSourceValidationReason:
      diagnostic.candidateSourceValidationReason ?? null,
  };
  requireCondition(
    validResearchFailureAttribution(attribution),
    "routeDiagnostics.research_failure_attribution",
  );
  return attribution;
}

function validateRouteDiagnostic(value, index) {
  const path = `routeDiagnostics.${index}`;
  requireCondition(onlyAllowedKeys(value, ROUTE_DIAGNOSTIC_ALLOWED_KEYS), `${path}.keys`);
  requireCondition(
    ["research_start", "research_poll", "verification", "presentation"].includes(
      value.stage,
    ),
    `${path}.stage`,
  );
  requireCondition(["pending", "completed", "failed"].includes(value.outcome), `${path}.outcome`);
  if ("ledger" in value) {
    const ledger = runtimeLedger(value.ledger, `${path}.ledger`);
    requireCondition(ledger.operation === value.stage, `${path}.ledger.operation`);
  }
  const attribution = {
    validationReason: value.validationReason ?? null,
    candidateValidationReason: value.candidateValidationReason ?? null,
    candidateIdentityValidationReason:
      value.candidateIdentityValidationReason ?? null,
    candidateSourceValidationReason:
      value.candidateSourceValidationReason ?? null,
  };
  const attributedFailure =
    value.stage === "research_poll" &&
    value.outcome === "failed" &&
    value.ledger?.failureReason === "invalid_research_contract";
  requireCondition(
    attributedFailure
      ? validResearchFailureAttribution(attribution)
      : FAILURE_ATTRIBUTION_KEYS.every((field) => attribution[field] === null),
    `${path}.failureAttribution`,
  );
  if ("identitySourceFilter" in value) {
    requireCondition(
      (value.stage === "research_poll" && value.outcome === "completed") ||
        (attributedFailure &&
          attribution.candidateValidationReason === "candidate_sources"),
      `${path}.identitySourceFilter.failure_context`,
    );
    requireCondition(
      exactKeys(value.identitySourceFilter, IDENTITY_SOURCE_FILTER_KEYS),
      `${path}.identitySourceFilter.keys`,
    );
    for (const key of IDENTITY_SOURCE_FILTER_KEYS.slice(0, 4)) {
      requireCondition(
        nonNegativeInteger(value.identitySourceFilter[key]),
        `${path}.identitySourceFilter.${key}`,
      );
    }
    requireCountRecord(
      value.identitySourceFilter.rejectionCandidateCounts,
      RESEARCH_REJECTION_COUNT_KEYS,
      `${path}.identitySourceFilter.rejectionCandidateCounts`,
    );
    const sourceFilter = value.identitySourceFilter;
    const rejectionCountTotal = Object.values(
      sourceFilter.rejectionCandidateCounts,
    ).reduce((sum, count) => sum + count, 0);
    requireCondition(
      sourceFilter.acceptedCandidates + sourceFilter.rejectedCandidates ===
        sourceFilter.submittedCandidates,
      `${path}.identitySourceFilter.conservation`,
    );
    requireCondition(
      sourceFilter.deferredMissingTitleCandidates === 0,
      `${path}.identitySourceFilter.missing_title_deferral_retired`,
    );
    requireCondition(
      sourceFilter.rejectedCandidates === 0
        ? rejectionCountTotal === 0
        : rejectionCountTotal >= sourceFilter.rejectedCandidates &&
            rejectionCountTotal <= 2 * sourceFilter.rejectedCandidates,
      `${path}.identitySourceFilter.rejection_counts`,
    );
    if (attributedFailure) {
      const productPageUnavailable =
        sourceFilter.rejectionCandidateCounts.completeProductPageUnavailable;
      requireCondition(
        attribution.candidateSourceValidationReason ===
        "candidate_source_product_page_unproven"
          ? productPageUnavailable > 0
          : attribution.candidateSourceValidationReason ===
                "candidate_source_identity_unproven" &&
              productPageUnavailable === 0,
        `${path}.identitySourceFilter.failure_reason`,
      );
    }
  }
  if ("counts" in value) {
    requireCountRecord(value.counts, VERIFICATION_COUNT_KEYS, `${path}.counts`);
  }
  if ("verificationAttribution" in value) {
    const attribution = value.verificationAttribution;
    requireCondition(
      exactKeys(attribution, VERIFICATION_ATTRIBUTION_KEYS),
      `${path}.verificationAttribution.keys`,
    );
    for (const [field, keys] of [
      ["candidateFirstLossCounts", ROUTE_FIRST_LOSS_KEYS],
      ["assetIdentityFailureCandidateCounts", ASSET_IDENTITY_FAILURE_KEYS],
      ["commerceOutcomeCandidateCounts", COMMERCE_OUTCOME_KEYS],
      ["completeProductRelationshipFailureCandidateCounts", RELATIONSHIP_FAILURE_KEYS],
      ["identitySafeProductUrlFailureCandidateCounts", PRODUCT_URL_FAILURE_KEYS],
      ["sourceRejectionCandidateCounts", SOURCE_REJECTION_KEYS],
      ["claimRejectionCandidateCounts", CLAIM_REJECTION_KEYS],
    ]) {
      requireCountRecord(
        attribution[field],
        keys,
        `${path}.verificationAttribution.${field}`,
      );
    }
  }
  if (value.stage === "research_start") {
    requireCondition(
      exactKeys(value, ["stage", "outcome", "ledger"]),
      `${path}.stage_keys`,
    );
  } else if (value.stage === "research_poll") {
    requireCondition("ledger" in value, `${path}.ledger`);
    if (value.outcome === "pending") {
      requireCondition(
        exactKeys(value, ["stage", "outcome", "ledger"]),
        `${path}.stage_keys`,
      );
    } else if (value.outcome === "completed") {
      requireCondition(
        exactKeys(value, ["stage", "outcome", "ledger", "identitySourceFilter"]),
        `${path}.stage_keys`,
      );
      requireCondition(
        value.identitySourceFilter.acceptedCandidates >= 1,
        `${path}.identitySourceFilter.acceptedCandidates`,
      );
    }
  } else if (value.stage === "verification") {
    requireCondition(
      ["completed", "failed"].includes(value.outcome) &&
        exactKeys(value, ["stage", "outcome", "counts", "verificationAttribution"]),
      `${path}.stage_keys`,
    );
  } else if (value.stage === "presentation") {
    requireCondition(
      ["completed", "failed"].includes(value.outcome) &&
        exactKeys(value, ["stage", "outcome", "ledger"]),
      `${path}.stage_keys`,
    );
  }
}

function projectDiagnostics(routeDiagnostics, counters, terminal) {
  requireCondition(
    Array.isArray(routeDiagnostics) && routeDiagnostics.length >= 1 && routeDiagnostics.length <= 128,
    "routeDiagnostics",
  );
  routeDiagnostics.forEach(validateRouteDiagnostic);
  const startDiagnostics = routeDiagnostics.filter(
    (item) => item.stage === "research_start",
  );
  requireCondition(
    startDiagnostics.length === 1 && routeDiagnostics[0] === startDiagnostics[0],
    "routeDiagnostics.research_start",
  );
  const pollDiagnostics = routeDiagnostics.filter(
    (item) => item.stage === "research_poll",
  );
  requireCondition(
    counters.openAiRetrieves === pollDiagnostics.length,
    "counters.openAiRetrieves_reconciliation",
  );
  const terminalPolls = pollDiagnostics.filter((item) =>
    ["completed", "failed"].includes(item.outcome),
  );
  requireCondition(terminalPolls.length <= 1, "routeDiagnostics.research_terminal");
  if (terminalPolls.length === 1) {
    requireCondition(
      pollDiagnostics[pollDiagnostics.length - 1] === terminalPolls[0] &&
        pollDiagnostics.slice(0, -1).every((item) => item.outcome === "pending"),
      "routeDiagnostics.research_poll_sequence",
    );
  } else {
    requireCondition(
      pollDiagnostics.every((item) => item.outcome === "pending"),
      "routeDiagnostics.research_poll_sequence",
    );
  }
  const researchTerminal =
    terminalPolls[0] ||
    (startDiagnostics[0].outcome === "failed" || pollDiagnostics.length === 0
      ? startDiagnostics[0]
      : null);
  requireCondition(Boolean(researchTerminal), "routeDiagnostics.research_terminal");
  const presentationTerminal = routeDiagnostics.filter(
    (item) =>
      item.stage === "presentation" &&
      ["completed", "failed"].includes(item.outcome),
  );
  requireCondition(presentationTerminal.length <= 1, "routeDiagnostics.presentation_terminal");
  const verificationTerminal = routeDiagnostics.filter(
    (item) => item.stage === "verification",
  );
  requireCondition(verificationTerminal.length <= 1, "routeDiagnostics.verification_terminal");

  const expectedSequence = ["research_start"];
  expectedSequence.push(...pollDiagnostics.map(() => "research_poll"));
  if (verificationTerminal.length === 1) expectedSequence.push("verification");
  if (presentationTerminal.length === 1) expectedSequence.push("presentation");
  requireCondition(
    expectedSequence.length === routeDiagnostics.length &&
      routeDiagnostics.every((item, index) => item.stage === expectedSequence[index]),
    "routeDiagnostics.stage_sequence",
  );
  if (researchTerminal.outcome !== "completed") {
    requireCondition(
      verificationTerminal.length === 0 && presentationTerminal.length === 0,
      "routeDiagnostics.after_research_failure",
    );
  } else if (terminal.state === "completed") {
    requireCondition(
      verificationTerminal.length === 1 &&
        verificationTerminal[0].outcome === "completed",
      "routeDiagnostics.verification_terminal",
    );
    requireCondition(
      presentationTerminal.length === 1 &&
        presentationTerminal[0].outcome === "completed",
      "routeDiagnostics.presentation_terminal",
    );
  } else if (verificationTerminal.length === 0) {
    requireCondition(
      presentationTerminal.length === 0,
      "routeDiagnostics.presentation_without_verification",
    );
  } else if (verificationTerminal[0].outcome === "failed") {
    requireCondition(
      presentationTerminal.length === 0,
      "routeDiagnostics.after_verification_failure",
    );
  } else if (presentationTerminal.length > 0) {
    requireCondition(
      verificationTerminal[0].outcome === "completed",
      "routeDiagnostics.presentation_without_completed_verification",
    );
  }
  const expectedCreates = 1 + presentationTerminal.length;
  requireCondition(counters.openAiCreates === expectedCreates, "counters.openAiCreates_reconciliation");

  const usageLedgers = [researchTerminal, ...presentationTerminal].map(
    (diagnostic, index) => {
      return projectUsageLedger(
        diagnostic.ledger,
        diagnostic.outcome,
        `terminalUsage.${index}`,
      );
    },
  );
  const researchUsage = usageLedgers[0];
  requireCondition(
    ["research_start", "research_poll"].includes(researchUsage.operation) &&
      (researchTerminal.outcome !== "completed" || researchUsage.webSearchCalls >= 1),
    "usageLedgers.research",
  );
  requireCondition(
    counters.hostedSearches === researchUsage.webSearchCalls,
    "counters.hostedSearches_reconciliation",
  );
  if (presentationTerminal.length === 1) {
    requireCondition(
      usageLedgers[1].operation === "presentation" &&
        usageLedgers[1].webSearchCalls === 0,
      "usageLedgers.presentation",
    );
  }

  const researchCompleted = researchTerminal;
  let research = null;
  const sourceFilter = researchCompleted.identitySourceFilter;
  if (researchCompleted.outcome === "completed") {
    requireCondition(Boolean(sourceFilter), "routeDiagnostics.identitySourceFilter");
  }
  if (sourceFilter) {
    research = {
      submitted: sourceFilter.submittedCandidates,
      accepted: sourceFilter.acceptedCandidates,
      deferredMissingTitle: sourceFilter.deferredMissingTitleCandidates,
      rejected: sourceFilter.rejectedCandidates,
    };
  }

  let verification = null;
  let verificationAttribution = null;
  if (verificationTerminal.length === 1) {
    const diagnostic = verificationTerminal[0];
    requireCondition(Boolean(diagnostic.counts), "routeDiagnostics.verification.counts");
    requireCondition(
      Boolean(diagnostic.verificationAttribution),
      "routeDiagnostics.verification.attribution",
    );
    const counts = diagnostic.counts;
    const loss = diagnostic.verificationAttribution.candidateFirstLossCounts;
    verification = {
      candidates: counts.candidates,
      sourceFetchAttempts: counts.sourceFetchAttempts,
      successfulSourceFetches: counts.successfulSourceFetches,
      commerceRequests: counts.commerceRequests,
      commerceRows: counts.commerceRows,
      eligible: counts.eligibleCandidates,
      closeMatch: counts.closeMatchCandidates,
      excluded: counts.excludedCandidates,
      firstLoss: {
        assetIdentity: loss.assetIdentityUnproven,
        relationship: loss.completeProductRelationshipUnproven,
        productUrl: loss.identitySafeProductUrlUnavailable,
        hardRequirementFailed: loss.hardRequirementFailed,
        hardRequirementNotVerified: loss.hardRequirementNotVerified,
        noLossEligible: loss.noLossEligible,
      },
    };
    verificationAttribution = projectVerificationAttribution(
      diagnostic.verificationAttribution,
    );
    requireCondition(
      counters.sourcePageFetches === counts.sourceFetchAttempts,
      "counters.sourcePageFetches_reconciliation",
    );
    requireCondition(
      counters.serperShoppingAttempts === counts.commerceRequests,
      "counters.serperShoppingAttempts_reconciliation",
    );
    requireCondition(
      counts.successfulSourceFetches <= counts.sourceFetchAttempts,
      "routeDiagnostics.successfulSourceFetches",
    );
  }

  if (terminal.state === "completed") {
    requireCondition(researchCompleted.outcome === "completed", "terminal.research_completed");
    requireCondition(
      verificationTerminal.length === 1 && verificationTerminal[0].outcome === "completed",
      "terminal.verification_completed",
    );
    requireCondition(
      presentationTerminal.length === 1 && presentationTerminal[0].outcome === "completed",
      "terminal.presentation_completed",
    );
  } else if (terminal.code === "verification_failed") {
    requireCondition(researchCompleted.outcome === "completed", "terminal.research_completed");
    requireCondition(
      verificationTerminal.length === 0 ||
        verificationTerminal[0].outcome === "failed" ||
        (verificationTerminal[0].outcome === "completed" &&
          presentationTerminal.length === 0),
      "terminal.verification_failed",
    );
    requireCondition(presentationTerminal.length === 0, "terminal.presentation_absent");
  } else if (terminal.code === "research_failed") {
    requireCondition(researchCompleted.outcome !== "completed", "terminal.research_failed");
  } else if (terminal.code === "presentation_failed") {
    requireCondition(
      researchCompleted.outcome === "completed" &&
        verificationTerminal.length === 1 &&
        verificationTerminal[0].outcome === "completed" &&
        presentationTerminal.length === 1 &&
        presentationTerminal[0].outcome === "failed",
      "terminal.presentation_failed",
    );
  }
  const routeTrace = routeDiagnostics.map((diagnostic, index) => ({
    stage: diagnostic.stage,
    outcome: diagnostic.outcome,
    ledger:
      "ledger" in diagnostic
        ? projectRouteTraceLedger(
            diagnostic.ledger,
            diagnostic.outcome,
            `routeTrace.${index}.ledger`,
          )
        : null,
    failureAttribution: projectResearchFailureAttribution(diagnostic),
  }));
  return {
    routeTrace,
    diagnostics: { research, verification },
    verificationAttribution,
    usageLedgers,
  };
}

function projectTerminal(terminalResponse) {
  requireCondition(exactKeys(terminalResponse, TERMINAL_RESPONSE_KEYS), "terminalResponse.keys");
  requireCondition(nonNegativeInteger(terminalResponse.statusCode), "terminalResponse.statusCode");
  requireCondition(nonNegativeInteger(terminalResponse.wallClockMs), "terminalResponse.wallClockMs");
  const body = terminalResponse.body;
  requireCondition(isPlainObject(body), "terminalResponse.body");
  requireCondition(body.pipeline === "staged_terra", "terminalResponse.body.pipeline");
  requireCondition(body.version === "staged-terra-api-v1", "terminalResponse.body.version");
  if (body.state === "completed") {
    requireCondition(exactKeys(body, PUBLIC_COMPLETED_KEYS), "terminalResponse.body.completed.keys");
    requireCondition(terminalResponse.statusCode === 200, "terminalResponse.completed.statusCode");
    requireCondition(
      body.presentationVersion === EXPECTED_PRESENTATION_VERSION,
      "terminalResponse.presentationVersion",
    );
    requireCondition(
      Array.isArray(body.finalAdvice) &&
        body.finalAdvice.length <= 5 &&
        body.finalAdvice.every((item) => boundedString(item)),
      "terminalResponse.finalAdvice",
    );
    const sources = projectPublicSources(body.sources);
    const cards = projectPublicCards(body.cards, sources);
    return {
      terminal: {
        state: "completed",
        statusCode: 200,
        code: null,
        wallClockMs: terminalResponse.wallClockMs,
      },
      presentationVersion: body.presentationVersion,
      finalAdvice: [...body.finalAdvice],
      cards,
      sources,
    };
  }
  requireCondition(exactKeys(body, PUBLIC_FAILURE_KEYS), "terminalResponse.body.failed.keys");
  requireCondition(body.state === "failed", "terminalResponse.body.failed.state");
  const publicFailure = PUBLIC_FAILURE_BY_CODE[body.code];
  requireCondition(Boolean(publicFailure), "terminalResponse.body.failed.code");
  requireCondition(
    terminalResponse.statusCode === publicFailure?.statusCode,
    "terminalResponse.failed.statusCode",
  );
  requireCondition(
    body.error === publicFailure?.error,
    "terminalResponse.body.failed.error",
  );
  return {
    terminal: {
      state: "failed",
      statusCode: terminalResponse.statusCode,
      code: body.code,
      wallClockMs: terminalResponse.wallClockMs,
    },
    presentationVersion: null,
    finalAdvice: [],
    cards: [],
    sources: [],
  };
}

function registeredProductTraceAggregateStatus(products, diagnostics) {
  const research = diagnostics?.research;
  const verification = diagnostics?.verification;
  if (!Array.isArray(products)) {
    return { research: false, verification: false };
  }
  const totals = {
    validatedResearchCandidates: 0,
    acceptedResearchCandidates: 0,
    eligible: 0,
    closeMatch: 0,
    excluded: 0,
    firstLoss: Object.fromEntries(
      STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.map((key) => [key, 0]),
    ),
  };
  for (const product of products) {
    if (
      !nonNegativeInteger(product?.validatedResearchCandidates) ||
      !nonNegativeInteger(product?.acceptedResearchCandidates)
    ) {
      return { research: false, verification: false };
    }
    totals.validatedResearchCandidates +=
      product.validatedResearchCandidates;
    totals.acceptedResearchCandidates += product.acceptedResearchCandidates;
    if (product.verification === null) continue;
    if (
      !product.verification ||
      !["eligible", "closeMatch", "excluded"].every((key) =>
        nonNegativeInteger(product.verification[key]),
      ) ||
      !product.verification.firstLoss ||
      !STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every((key) =>
        nonNegativeInteger(product.verification.firstLoss[key]),
      )
    ) {
      return { research: false, verification: false };
    }
    totals.eligible += product.verification.eligible;
    totals.closeMatch += product.verification.closeMatch;
    totals.excluded += product.verification.excluded;
    for (const key of STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS) {
      totals.firstLoss[key] += product.verification.firstLoss[key];
    }
  }
  return {
    research:
      research !== null &&
      nonNegativeInteger(research?.submitted) &&
      nonNegativeInteger(research?.accepted) &&
      totals.validatedResearchCandidates <= research.submitted &&
      totals.acceptedResearchCandidates <= research.accepted,
    verification:
      verification === null
        ? products.every((product) => product.verification === null)
        : ["eligible", "closeMatch", "excluded"].every((key) =>
              nonNegativeInteger(verification?.[key]),
            ) &&
            verification.firstLoss &&
            STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every((key) =>
              nonNegativeInteger(verification.firstLoss[key]),
            ) &&
            totals.eligible <= verification.eligible &&
            totals.closeMatch <= verification.closeMatch &&
            totals.excluded <= verification.excluded &&
            STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every(
              (key) => totals.firstLoss[key] <= verification.firstLoss[key],
            ),
  };
}

function projectRegisteredProductTrace({
  value,
  testCase,
  cards,
  terminal,
  diagnostics,
}) {
  const verificationObserved = diagnostics.verification !== null;
  if (value === null) {
    requireCondition(
      terminal.state === "failed" && !verificationObserved,
      "registeredProductTrace.missing",
    );
    return null;
  }
  requireCondition(
    exactKeys(value, REGISTERED_PRODUCT_TRACE_KEYS) &&
      value.schemaVersion === STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION &&
      Array.isArray(value.products),
    "registeredProductTrace.keys",
  );
  const registeredProducts = stagedTerraRegisteredProducts(testCase);
  requireCondition(
    value.products.length === registeredProducts.length,
    "registeredProductTrace.products.length",
  );
  const projected = value.products.map((trace, index) => {
    const expected = registeredProducts[index];
    const path = `registeredProductTrace.products.${index}`;
    requireCondition(
      exactKeys(trace, REGISTERED_PRODUCT_TRACE_INPUT_KEYS),
      `${path}.keys`,
    );
    requireCondition(
      trace.id === expected.product.id && trace.registry === expected.registry,
      `${path}.identity`,
    );
    requireCondition(
      nonNegativeInteger(trace.validatedResearchCandidates) &&
        trace.validatedResearchCandidates <= 15 &&
        nonNegativeInteger(trace.acceptedResearchCandidates) &&
        trace.acceptedResearchCandidates <= trace.validatedResearchCandidates,
      `${path}.researchCounts`,
    );
    let verification = null;
    if (trace.verification !== null) {
      requireCondition(
        verificationObserved &&
          exactKeys(
            trace.verification,
            REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS,
          ),
        `${path}.verification.keys`,
      );
      const counts = trace.verification;
      requireCondition(
        [counts.eligible, counts.closeMatch, counts.excluded].every(
          (count) => nonNegativeInteger(count) && count <= 15,
        ) &&
          counts.eligible + counts.closeMatch + counts.excluded ===
            trace.acceptedResearchCandidates,
        `${path}.verification.outcomes`,
      );
      requireCondition(
        exactKeys(
          counts.firstLoss,
          STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
        ) &&
          STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every(
            (key) =>
              nonNegativeInteger(counts.firstLoss[key]) &&
              counts.firstLoss[key] <= 15,
          ),
        `${path}.verification.firstLoss`,
      );
      requireCondition(
        counts.firstLoss.noLossEligible === counts.eligible &&
          counts.firstLoss.hardRequirementNotVerified === counts.closeMatch &&
          counts.firstLoss.assetIdentity +
            counts.firstLoss.relationship +
            counts.firstLoss.productUrl +
            counts.firstLoss.hardRequirementFailed ===
            counts.excluded,
        `${path}.verification.reconciliation`,
      );
      verification = structuredClone(counts);
    } else {
      requireCondition(!verificationObserved, `${path}.verification.missing`);
    }
    const finalRanks = cards
      .filter((card) =>
        stagedTerraRegisteredProductMatchesIdentity(
          card.identity,
          expected.product,
        ),
      )
      .map((card) => card.rank);
    requireCondition(
      finalRanks.length === new Set(finalRanks).size &&
        finalRanks.every(
          (rank) => Number.isSafeInteger(rank) && rank >= 1 && rank <= 5,
        ) &&
        (verification === null || finalRanks.length <= verification.eligible),
      `${path}.finalRanks`,
    );
    return {
      id: trace.id,
      registry: trace.registry,
      validatedResearchCandidates: trace.validatedResearchCandidates,
      acceptedResearchCandidates: trace.acceptedResearchCandidates,
      verification,
      finalRanks,
    };
  });
  if (terminal.state === "completed") {
    requireCondition(verificationObserved, "registeredProductTrace.completed");
  }
  const aggregate = registeredProductTraceAggregateStatus(projected, diagnostics);
  requireCondition(
    aggregate.research,
    "registeredProductTrace.aggregate.research",
  );
  requireCondition(
    aggregate.verification,
    "registeredProductTrace.aggregate.verification",
  );
  return {
    schemaVersion: STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
    products: projected,
  };
}

function validateProjectedUsageLedger(
  ledger,
  path,
  check,
  { allowPending = false } = {},
) {
  check(exactKeys(ledger, USAGE_LEDGER_KEYS), `${path}.keys`);
  if (!exactKeys(ledger, USAGE_LEDGER_KEYS)) return;
  check(
    ["research_start", "research_poll", "presentation"].includes(
      ledger.operation,
    ),
    `${path}.operation`,
  );
  check(
    ["completed", "failed", ...(allowPending ? ["pending"] : [])].includes(
      ledger.outcome,
    ),
    `${path}.outcome`,
  );
  for (const key of USAGE_LEDGER_KEYS.slice(2)) {
    check(nonNegativeInteger(ledger[key]), `${path}.${key}`);
  }
  check(
    ledger.cachedInputTokens <= ledger.inputTokens,
    `${path}.cachedInputTokens`,
  );
}

function validateProjectedRouteTraceLedger(ledger, path, check) {
  check(exactKeys(ledger, ROUTE_TRACE_LEDGER_KEYS), `${path}.keys`);
  if (!exactKeys(ledger, ROUTE_TRACE_LEDGER_KEYS)) return;
  check(ledger.runtimeVersion === EXPECTED_RUNTIME_VERSION, `${path}.runtimeVersion`);
  check(
    ["research_start", "research_poll", "presentation"].includes(
      ledger.operation,
    ),
    `${path}.operation`,
  );
  check(["pending", "completed", "failed"].includes(ledger.outcome), `${path}.outcome`);
  const expectedPrompt =
    ledger.operation === "presentation"
      ? EXPECTED_PRESENTATION_PROMPT_VERSION
      : EXPECTED_RESEARCH_PROMPT_VERSION;
  check(ledger.promptVersion === expectedPrompt, `${path}.promptVersion`);
  check(ledger.modelRequested === EXPECTED_MODEL, `${path}.modelRequested`);
  check(
    ledger.modelReturned === null || ledger.modelReturned === EXPECTED_MODEL,
    `${path}.modelReturned`,
  );
  if (ledger.outcome === "completed") {
    check(ledger.modelReturned === EXPECTED_MODEL, `${path}.completedModelReturned`);
    check(HASH_64.test(ledger.responseIdHash), `${path}.completedResponseIdHash`);
  }
  check(RUNTIME_STATUS_VALUES.has(ledger.status), `${path}.status`);
  check(
    ledger.responseIdHash === null || HASH_64.test(ledger.responseIdHash),
    `${path}.responseIdHash`,
  );
  for (const key of [
    "durationMs",
    "inputTokens",
    "cachedInputTokens",
    "outputTokens",
    "webSearchCalls",
    "sourceCount",
  ]) {
    check(nonNegativeInteger(ledger[key]), `${path}.${key}`);
  }
  check(
    ledger.cachedInputTokens <= ledger.inputTokens,
    `${path}.cachedInputTokens`,
  );
  check(
    ledger.failureReason === null || RUNTIME_FAILURE_REASONS.has(ledger.failureReason),
    `${path}.failureReason`,
  );
  if (ledger.outcome === "pending") {
    check(
      ["queued", "in_progress"].includes(ledger.status) &&
        ledger.failureReason === null,
      `${path}.pending_union`,
    );
  } else if (ledger.outcome === "completed") {
    check(
      ledger.status === "completed" && ledger.failureReason === null,
      `${path}.completed_union`,
    );
  } else if (ledger.outcome === "failed") {
    check(
      validFailureLedgerUnion(
        ledger.operation,
        ledger.status,
        ledger.failureReason,
      ),
      `${path}.failed_union`,
    );
  }
  if (ledger.operation === "presentation") {
    check(ledger.webSearchCalls === 0, `${path}.presentationWebSearchCalls`);
    check(ledger.sourceCount === 0, `${path}.presentationSourceCount`);
  } else if (ledger.outcome === "completed") {
    check(ledger.sourceCount >= 1, `${path}.researchSourceCount`);
  }
}

function validateProjectedReviewPoint(point, path, check) {
  check(exactKeys(point, REVIEW_POINT_KEYS), `${path}.keys`);
  if (!exactKeys(point, REVIEW_POINT_KEYS)) return;
  check(boundedString(point.text), `${path}.text`);
  check(uniqueSafeIds(point.sourceIds), `${path}.sourceIds`);
}

function validateProjectedPayload(payload) {
  const errors = [];
  const check = (condition, path) => {
    if (!condition) errors.push(`artifact_payload_invalid:${path}`);
  };
  if (!exactKeys(payload, PAYLOAD_KEYS)) {
    return ["artifact_payload_keys_invalid"];
  }
  check(payload.schemaVersion === STAGED_TERRA_READINESS_PRODUCER_VERSION, "schemaVersion");
  check(boundedString(payload.matrixVersion, 128), "matrixVersion");
  check(HASH_64.test(payload.matrixSha256), "matrixSha256");
  check(boundedString(payload.caseId, 128), "caseId");
  check(Number.isSafeInteger(payload.run) && payload.run >= 1, "run");
  check(SAFE_ID.test(payload.runId), "runId");
  check(Number.isSafeInteger(payload.attemptIndex) && payload.attemptIndex >= 1, "attemptIndex");
  check(ATTEMPT_NONCE.test(payload.attemptNonce), "attemptNonce");
  check(
    payload.previousArtifactSha256 === null ||
      HASH_64.test(payload.previousArtifactSha256),
    "previousArtifactSha256",
  );
  if (Number.isSafeInteger(payload.attemptIndex)) {
    check(
      payload.attemptIndex === 1
        ? payload.previousArtifactSha256 === null
        : HASH_64.test(payload.previousArtifactSha256),
      "attemptChain.union",
    );
  }
  check(HASH_40.test(payload.commitSha), "commitSha");
  check(HASH_64.test(payload.requestSha256), "requestSha256");
  check(isoDateTime(payload.capturedAt), "capturedAt");

  check(exactKeys(payload.terminal, TERMINAL_KEYS), "terminal.keys");
  if (exactKeys(payload.terminal, TERMINAL_KEYS)) {
    check(["completed", "failed"].includes(payload.terminal.state), "terminal.state");
    check(nonNegativeInteger(payload.terminal.statusCode), "terminal.statusCode");
    check(nonNegativeInteger(payload.terminal.wallClockMs), "terminal.wallClockMs");
    if (payload.terminal.state === "completed") {
      check(payload.terminal.statusCode === 200, "terminal.statusCode");
      check(payload.terminal.code === null, "terminal.code");
      check(
        payload.presentationVersion === EXPECTED_PRESENTATION_VERSION,
        "presentationVersion",
      );
      check(
        Array.isArray(payload.finalAdvice) &&
          payload.finalAdvice.length <= 5 &&
          payload.finalAdvice.every((item) => boundedString(item)),
        "finalAdvice",
      );
    } else {
      const publicFailure = PUBLIC_FAILURE_BY_CODE[payload.terminal.code];
      check(Boolean(publicFailure), "terminal.code");
      check(
        payload.terminal.statusCode === publicFailure?.statusCode,
        "terminal.statusCode",
      );
      check(payload.presentationVersion === null, "presentationVersion");
      check(
        Array.isArray(payload.finalAdvice) && payload.finalAdvice.length === 0,
        "finalAdvice",
      );
    }
  }

  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  check(Array.isArray(payload.sources) && sources.length <= 128, "sources");
  const sourceIds = new Set();
  for (const [index, source] of sources.entries()) {
    check(exactKeys(source, PROJECTED_SOURCE_KEYS), `sources.${index}.keys`);
    if (!exactKeys(source, PROJECTED_SOURCE_KEYS)) continue;
    check(SAFE_ID.test(source.id), `sources.${index}.id`);
    check(!sourceIds.has(source.id), `sources.${index}.duplicate_id`);
    sourceIds.add(source.id);
    check(boundedString(source.label, 128), `sources.${index}.label`);
    check(boundedString(source.title, 500), `sources.${index}.title`);
    check(
      source.url === null || isConservativePublicHttpsUrl(source.url),
      `sources.${index}.url`,
    );
  }

  const cards = Array.isArray(payload.cards) ? payload.cards : [];
  check(Array.isArray(payload.cards) && cards.length <= 5, "cards");
  if (payload.terminal?.state === "completed") {
    check(cards.length >= 1, "cards.completed_empty");
  } else if (payload.terminal?.state === "failed") {
    check(cards.length === 0 && sources.length === 0, "failed_public_projection");
  }
  const cardKeys = new Set();
  for (const [index, card] of cards.entries()) {
    const path = `cards.${index}`;
    check(exactKeys(card, PROJECTED_CARD_KEYS), `${path}.keys`);
    if (!exactKeys(card, PROJECTED_CARD_KEYS)) continue;
    check(card.rank === index + 1, `${path}.rank`);
    check(boundedString(card.key, 128), `${path}.key`);
    check(!cardKeys.has(card.key), `${path}.duplicate_key`);
    cardKeys.add(card.key);
    check(card.recommendationStatus === "Best Match", `${path}.recommendationStatus`);
    check(exactKeys(card.identity, PROJECTED_IDENTITY_KEYS), `${path}.identity.keys`);
    if (exactKeys(card.identity, PROJECTED_IDENTITY_KEYS)) {
      for (const key of ["brand", "productName", "model"]) {
        check(boundedString(card.identity[key], 500), `${path}.identity.${key}`);
      }
      check(
        card.identity.variant === null ||
          boundedString(card.identity.variant, 200),
        `${path}.identity.variant`,
      );
    }
    check(
      exactKeys(card.identityVerification, PROJECTED_IDENTITY_VERIFICATION_KEYS),
      `${path}.identityVerification.keys`,
    );
    if (
      exactKeys(card.identityVerification, PROJECTED_IDENTITY_VERIFICATION_KEYS)
    ) {
      check(
        card.identityVerification.state === "verified",
        `${path}.identityVerification.state`,
      );
      check(
        freshAtCapture(
          card.identityVerification.observedAt,
          payload.capturedAt,
        ),
        `${path}.identityVerification.observedAt`,
      );
    }

    const requirements = Array.isArray(card.requirementChecks)
      ? card.requirementChecks
      : [];
    check(
      Array.isArray(card.requirementChecks) &&
        requirements.length >= 1 &&
        requirements.length <= 12,
      `${path}.requirementChecks`,
    );
    const requirementIds = new Set();
    for (const [checkIndex, requirement] of requirements.entries()) {
      const requirementPath = `${path}.requirementChecks.${checkIndex}`;
      check(exactKeys(requirement, PROJECTED_REQUIREMENT_KEYS), `${requirementPath}.keys`);
      if (!exactKeys(requirement, PROJECTED_REQUIREMENT_KEYS)) continue;
      check(boundedString(requirement.id, 128), `${requirementPath}.id`);
      check(!requirementIds.has(requirement.id), `${requirementPath}.duplicate`);
      requirementIds.add(requirement.id);
      check(
        ["Pass", "Fail", "Needs verification"].includes(requirement.status),
        `${requirementPath}.status`,
      );
      check(
        boundedString(requirement.explanation),
        `${requirementPath}.explanation`,
      );
      check(uniqueSafeIds(requirement.sourceIds), `${requirementPath}.sourceIds`);
    }

    check(exactKeys(card.commerce, PROJECTED_COMMERCE_KEYS), `${path}.commerce.keys`);
    if (exactKeys(card.commerce, PROJECTED_COMMERCE_KEYS)) {
      if (card.commerce.state === "verified") {
        check(positiveFinite(card.commerce.priceAmount), `${path}.commerce.priceAmount`);
        check(card.commerce.currency === "USD", `${path}.commerce.currency`);
        check(boundedString(card.commerce.seller, 200), `${path}.commerce.seller`);
        check(
          isConservativePublicHttpsUrl(card.commerce.productUrl),
          `${path}.commerce.productUrl`,
        );
        check(card.commerce.availability === "in_stock", `${path}.commerce.availability`);
        check(
          freshAtCapture(card.commerce.observedAt, payload.capturedAt),
          `${path}.commerce.observedAt`,
        );
        check(uniqueSafeIds(card.commerce.sourceIds), `${path}.commerce.sourceIds`);
      } else {
        check(card.commerce.state === "not_verified", `${path}.commerce.state`);
        for (const field of [
          "priceAmount",
          "currency",
          "seller",
          "productUrl",
          "availability",
          "observedAt",
        ]) {
          check(card.commerce[field] === null, `${path}.commerce.${field}`);
        }
        check(
          Array.isArray(card.commerce.sourceIds) &&
            card.commerce.sourceIds.length === 0,
          `${path}.commerce.sourceIds`,
        );
      }
    }
    check(uniqueSafeIds(card.sourceIds), `${path}.sourceIds`);

    check(exactKeys(card.reviewEvidence, REVIEW_EVIDENCE_KEYS), `${path}.reviewEvidence.keys`);
    if (exactKeys(card.reviewEvidence, REVIEW_EVIDENCE_KEYS)) {
      check(exactKeys(card.reviewEvidence.assessment, ASSESSMENT_KEYS), `${path}.assessment.keys`);
      if (exactKeys(card.reviewEvidence.assessment, ASSESSMENT_KEYS)) {
        for (const field of ASSESSMENT_KEYS) {
          validateProjectedReviewPoint(
            card.reviewEvidence.assessment[field],
            `${path}.assessment.${field}`,
            check,
          );
        }
      }
      for (const field of ["pros", "cons"]) {
        const points = Array.isArray(card.reviewEvidence[field])
          ? card.reviewEvidence[field]
          : [];
        check(
          Array.isArray(card.reviewEvidence[field]) && points.length <= 10,
          `${path}.${field}`,
        );
        for (const [pointIndex, point] of points.entries()) {
          validateProjectedReviewPoint(
            point,
            `${path}.${field}.${pointIndex}`,
            check,
          );
        }
      }
      const claims = Array.isArray(card.reviewEvidence.claims)
        ? card.reviewEvidence.claims
        : [];
      check(
        Array.isArray(card.reviewEvidence.claims) && claims.length <= 24,
        `${path}.claims`,
      );
      for (const [claimIndex, claim] of claims.entries()) {
        const claimPath = `${path}.claims.${claimIndex}`;
        check(exactKeys(claim, REVIEW_CLAIM_KEYS), `${claimPath}.keys`);
        if (!exactKeys(claim, REVIEW_CLAIM_KEYS)) continue;
        check(boundedString(claim.claimType, 128), `${claimPath}.claimType`);
        check(boundedString(claim.text), `${claimPath}.text`);
        check(uniqueSafeIds(claim.sourceIds), `${claimPath}.sourceIds`);
        check(boundedString(claim.evidenceScope, 128), `${claimPath}.evidenceScope`);
      }
      check(exactKeys(card.reviewEvidence.image, REVIEW_IMAGE_KEYS), `${path}.image.keys`);
      if (exactKeys(card.reviewEvidence.image, REVIEW_IMAGE_KEYS)) {
        check(
          card.reviewEvidence.image.state === "verified"
            ? isConservativePublicHttpsUrl(card.reviewEvidence.image.url)
            : card.reviewEvidence.image.state === "not_verified" &&
                card.reviewEvidence.image.url === null,
          `${path}.image.union`,
        );
      }
    }
  }

  const registeredTrace = payload.registeredProductTrace;
  if (registeredTrace === null) {
    check(
      payload.terminal?.state === "failed",
      "registeredProductTrace.missing",
    );
  } else {
    check(
      exactKeys(registeredTrace, REGISTERED_PRODUCT_TRACE_KEYS),
      "registeredProductTrace.keys",
    );
    if (exactKeys(registeredTrace, REGISTERED_PRODUCT_TRACE_KEYS)) {
      check(
        registeredTrace.schemaVersion ===
          STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
        "registeredProductTrace.schemaVersion",
      );
      const products = Array.isArray(registeredTrace.products)
        ? registeredTrace.products
        : [];
      check(
        Array.isArray(registeredTrace.products) && products.length <= 32,
        "registeredProductTrace.products",
      );
      const productIds = new Set();
      for (const [index, product] of products.entries()) {
        const path = `registeredProductTrace.products.${index}`;
        check(
          exactKeys(product, REGISTERED_PRODUCT_TRACE_PRODUCT_KEYS),
          `${path}.keys`,
        );
        if (!exactKeys(product, REGISTERED_PRODUCT_TRACE_PRODUCT_KEYS)) {
          continue;
        }
        check(SAFE_ID.test(product.id), `${path}.id`);
        check(!productIds.has(product.id), `${path}.duplicate_id`);
        productIds.add(product.id);
        check(
          ["must_consider", "illustrative"].includes(product.registry),
          `${path}.registry`,
        );
        check(
          nonNegativeInteger(product.validatedResearchCandidates) &&
            product.validatedResearchCandidates <= 15 &&
            nonNegativeInteger(product.acceptedResearchCandidates) &&
            product.acceptedResearchCandidates <=
              product.validatedResearchCandidates,
          `${path}.researchCounts`,
        );
        if (product.verification === null) {
          check(
            payload.terminal?.state === "failed",
            `${path}.verification.missing`,
          );
        } else {
          check(
            exactKeys(
              product.verification,
              REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS,
            ),
            `${path}.verification.keys`,
          );
          if (
            exactKeys(
              product.verification,
              REGISTERED_PRODUCT_TRACE_VERIFICATION_KEYS,
            )
          ) {
            const verification = product.verification;
            check(
              [
                verification.eligible,
                verification.closeMatch,
                verification.excluded,
              ].every(
                (count) => nonNegativeInteger(count) && count <= 15,
              ) &&
                verification.eligible +
                  verification.closeMatch +
                  verification.excluded ===
                  product.acceptedResearchCandidates,
              `${path}.verification.outcomes`,
            );
            check(
              exactKeys(
                verification.firstLoss,
                STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
              ) &&
                STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.every(
                  (key) =>
                    nonNegativeInteger(verification.firstLoss[key]) &&
                    verification.firstLoss[key] <= 15,
                ),
              `${path}.verification.firstLoss`,
            );
            if (
              exactKeys(
                verification.firstLoss,
                STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS,
              )
            ) {
              check(
                verification.firstLoss.noLossEligible ===
                  verification.eligible &&
                  verification.firstLoss.hardRequirementNotVerified ===
                    verification.closeMatch &&
                  verification.firstLoss.assetIdentity +
                    verification.firstLoss.relationship +
                    verification.firstLoss.productUrl +
                    verification.firstLoss.hardRequirementFailed ===
                    verification.excluded,
                `${path}.verification.reconciliation`,
              );
            }
          }
        }
        check(
          Array.isArray(product.finalRanks) &&
            product.finalRanks.length === new Set(product.finalRanks).size &&
            product.finalRanks.every(
              (rank) =>
                Number.isSafeInteger(rank) && rank >= 1 && rank <= 5,
            ) &&
            (product.verification === null ||
              product.finalRanks.length <= product.verification.eligible),
          `${path}.finalRanks`,
        );
      }
    }
  }

  const routeTrace = Array.isArray(payload.routeTrace)
    ? payload.routeTrace
    : [];
  check(
    Array.isArray(payload.routeTrace) &&
      routeTrace.length >= 1 &&
      routeTrace.length <= 128,
    "routeTrace",
  );
  for (const [index, trace] of routeTrace.entries()) {
    const path = `routeTrace.${index}`;
    check(exactKeys(trace, ROUTE_TRACE_KEYS), `${path}.keys`);
    if (!exactKeys(trace, ROUTE_TRACE_KEYS)) continue;
    check(
      ["research_start", "research_poll", "verification", "presentation"].includes(
        trace.stage,
      ),
      `${path}.stage`,
    );
    check(["pending", "completed", "failed"].includes(trace.outcome), `${path}.outcome`);
    if (trace.stage === "verification") {
      check(trace.ledger === null, `${path}.ledger`);
    } else {
      validateProjectedRouteTraceLedger(trace.ledger, `${path}.ledger`, check);
      if (exactKeys(trace.ledger, ROUTE_TRACE_LEDGER_KEYS)) {
        check(trace.ledger.operation === trace.stage, `${path}.ledger.operation`);
        check(trace.ledger.outcome === trace.outcome, `${path}.ledger.outcome`);
      }
    }
    const attributedResearchFailure =
      trace.stage === "research_poll" &&
      trace.outcome === "failed" &&
      trace.ledger?.failureReason === "invalid_research_contract";
    check(
      attributedResearchFailure
        ? validResearchFailureAttribution(trace.failureAttribution)
        : trace.failureAttribution === null,
      `${path}.failureAttribution`,
    );
  }
  const traceStages = routeTrace.map((trace) => trace?.stage);
  const tracePolls = routeTrace.filter((trace) => trace?.stage === "research_poll");
  const tracePresentations = routeTrace.filter(
    (trace) => trace?.stage === "presentation",
  );
  const traceVerifications = routeTrace.filter(
    (trace) => trace?.stage === "verification",
  );
  check(
    traceStages[0] === "research_start" &&
      traceStages.filter((stage) => stage === "research_start").length === 1,
    "routeTrace.research_start",
  );
  check(
    tracePolls.length === payload.counters?.openAiRetrieves,
    "routeTrace.openAiRetrieves",
  );
  check(
    1 + tracePresentations.length === payload.counters?.openAiCreates,
    "routeTrace.openAiCreates",
  );
  const expectedTraceStages = [
    "research_start",
    ...tracePolls.map(() => "research_poll"),
    ...traceVerifications.map(() => "verification"),
    ...tracePresentations.map(() => "presentation"),
  ];
  check(
    JSON.stringify(traceStages) === JSON.stringify(expectedTraceStages),
    "routeTrace.stage_sequence",
  );
  check(traceVerifications.length <= 1, "routeTrace.verification_count");
  check(tracePresentations.length <= 1, "routeTrace.presentation_count");
  const terminalTracePolls = tracePolls.filter((trace) =>
    ["completed", "failed"].includes(trace?.outcome),
  );
  check(terminalTracePolls.length <= 1, "routeTrace.research_terminal_count");
  if (terminalTracePolls.length === 1) {
    check(
      tracePolls[tracePolls.length - 1] === terminalTracePolls[0] &&
        tracePolls.slice(0, -1).every((trace) => trace.outcome === "pending"),
      "routeTrace.research_poll_sequence",
    );
  }
  check(
    traceVerifications.every((trace) =>
      ["completed", "failed"].includes(trace.outcome),
    ),
    "routeTrace.verification_outcome",
  );
  check(
    tracePresentations.every((trace) =>
      ["completed", "failed"].includes(trace.outcome),
    ),
    "routeTrace.presentation_outcome",
  );
  if (payload.terminal?.state === "completed") {
    check(
      terminalTracePolls.length === 1 &&
        terminalTracePolls[0].outcome === "completed" &&
        traceVerifications.length === 1 &&
        traceVerifications[0].outcome === "completed" &&
        tracePresentations.length === 1 &&
        tracePresentations[0].outcome === "completed",
      "routeTrace.completed_terminal",
    );
  }
  const researchResponseHashes = new Set(
    routeTrace
      .filter((trace) =>
        ["research_start", "research_poll"].includes(trace?.stage),
      )
      .map((trace) => trace?.ledger?.responseIdHash)
      .filter(Boolean),
  );
  check(researchResponseHashes.size <= 1, "routeTrace.researchResponseIdHash");

  check(exactKeys(payload.diagnostics, DIAGNOSTIC_KEYS), "diagnostics.keys");
  if (exactKeys(payload.diagnostics, DIAGNOSTIC_KEYS)) {
    if (payload.diagnostics.research !== null) {
      check(exactKeys(payload.diagnostics.research, RESEARCH_KEYS), "diagnostics.research.keys");
      if (exactKeys(payload.diagnostics.research, RESEARCH_KEYS)) {
        for (const key of RESEARCH_KEYS) {
          check(nonNegativeInteger(payload.diagnostics.research[key]), `diagnostics.research.${key}`);
        }
      }
    }
    if (payload.diagnostics.verification !== null) {
      const verification = payload.diagnostics.verification;
      check(
        exactKeys(verification, STAGED_TERRA_READINESS_VERIFICATION_KEYS),
        "diagnostics.verification.keys",
      );
      if (exactKeys(verification, STAGED_TERRA_READINESS_VERIFICATION_KEYS)) {
        for (const key of STAGED_TERRA_READINESS_VERIFICATION_KEYS.slice(0, -1)) {
          check(nonNegativeInteger(verification[key]), `diagnostics.verification.${key}`);
        }
        check(
          exactKeys(verification.firstLoss, STAGED_TERRA_READINESS_FIRST_LOSS_KEYS),
          "diagnostics.verification.firstLoss.keys",
        );
        if (exactKeys(verification.firstLoss, STAGED_TERRA_READINESS_FIRST_LOSS_KEYS)) {
          for (const key of STAGED_TERRA_READINESS_FIRST_LOSS_KEYS) {
            check(
              nonNegativeInteger(verification.firstLoss[key]),
              `diagnostics.verification.firstLoss.${key}`,
            );
          }
        }
      }
    }
  }

  if (
    registeredTrace !== null &&
    exactKeys(registeredTrace, REGISTERED_PRODUCT_TRACE_KEYS) &&
    Array.isArray(registeredTrace.products) &&
    exactKeys(payload.diagnostics, DIAGNOSTIC_KEYS)
  ) {
    const aggregate = registeredProductTraceAggregateStatus(
      registeredTrace.products,
      payload.diagnostics,
    );
    check(aggregate.research, "registeredProductTrace.aggregate.research");
    check(
      aggregate.verification,
      "registeredProductTrace.aggregate.verification",
    );
  }
  check(
    validateStagedTerraReadinessVerificationAttribution(
      payload.verificationAttribution,
      payload.diagnostics.verification,
    ),
    "verificationAttribution",
  );

  check(exactKeys(payload.counters, STAGED_TERRA_READINESS_COUNTER_KEYS), "counters.keys");
  if (exactKeys(payload.counters, STAGED_TERRA_READINESS_COUNTER_KEYS)) {
    for (const key of STAGED_TERRA_READINESS_COUNTER_KEYS) {
      check(nonNegativeInteger(payload.counters[key]), `counters.${key}`);
    }
  }

  const usageLedgers = Array.isArray(payload.usageLedgers)
    ? payload.usageLedgers
    : [];
  check(
    Array.isArray(payload.usageLedgers) &&
      usageLedgers.length >= 1 &&
      usageLedgers.length <= 2,
    "usageLedgers",
  );
  for (const [index, ledger] of usageLedgers.entries()) {
    validateProjectedUsageLedger(ledger, `usageLedgers.${index}`, check, {
      allowPending: true,
    });
  }
  if (usageLedgers.length >= 1 && exactKeys(usageLedgers[0], USAGE_LEDGER_KEYS)) {
    check(
      ["research_start", "research_poll"].includes(usageLedgers[0].operation),
      "usageLedgers.0.operation",
    );
    check(
      payload.counters?.hostedSearches === usageLedgers[0].webSearchCalls,
      "usageLedgers.0.webSearchCalls",
    );
  }
  if (usageLedgers.length === 2 && exactKeys(usageLedgers[1], USAGE_LEDGER_KEYS)) {
    check(usageLedgers[1].operation === "presentation", "usageLedgers.1.operation");
    check(usageLedgers[1].webSearchCalls === 0, "usageLedgers.1.webSearchCalls");
  }
  const terminalTraceLedgers = [];
  const researchTrace = routeTrace.filter((trace) =>
    ["research_start", "research_poll"].includes(trace?.stage),
  );
  const terminalResearchTrace =
    [...researchTrace].reverse().find((trace) => trace.outcome !== "pending") ||
    (tracePolls.length === 0 ? researchTrace[0] : null);
  if (terminalResearchTrace?.ledger) {
    terminalTraceLedgers.push(
      usageLedgerFromTraceLedger(terminalResearchTrace.ledger),
    );
  }
  if (tracePresentations[0]?.ledger) {
    terminalTraceLedgers.push(
      usageLedgerFromTraceLedger(tracePresentations[0].ledger),
    );
  }
  if (payload.terminal?.state === "failed") {
    if (payload.terminal.code === "research_failed") {
      check(
        terminalResearchTrace?.outcome === "failed" &&
          traceVerifications.length === 0 &&
          tracePresentations.length === 0,
        "routeTrace.research_failed_terminal",
      );
    } else if (payload.terminal.code === "verification_failed") {
      check(
        terminalResearchTrace?.outcome === "completed" &&
          tracePresentations.length === 0 &&
          (traceVerifications.length === 0 ||
            ["completed", "failed"].includes(
              traceVerifications[0]?.outcome,
            )),
        "routeTrace.verification_failed_terminal",
      );
    } else if (payload.terminal.code === "presentation_failed") {
      check(
        terminalResearchTrace?.outcome === "completed" &&
          traceVerifications.length === 1 &&
          traceVerifications[0].outcome === "completed" &&
          tracePresentations.length === 1 &&
          tracePresentations[0].outcome === "failed",
        "routeTrace.presentation_failed_terminal",
      );
    }
  }
  check(
    canonicalJson(terminalTraceLedgers) === canonicalJson(usageLedgers),
    "usageLedgers.routeTrace_mismatch",
  );
  return [...new Set(errors)];
}

function validateCounters(counters) {
  requireCondition(
    exactKeys(counters, STAGED_TERRA_READINESS_COUNTER_KEYS),
    "counters.keys",
  );
  for (const key of STAGED_TERRA_READINESS_COUNTER_KEYS) {
    requireCondition(nonNegativeInteger(counters[key]), `counters.${key}`);
  }
}

export function buildStagedTerraReadinessArtifact(input) {
  requireCondition(exactKeys(input, PRODUCER_INPUT_KEYS), "producer.keys");
  requireCondition(isPlainObject(input.matrix), "matrix");
  requireCondition(boundedString(input.caseId, 128), "caseId");
  requireCondition(Number.isSafeInteger(input.run) && input.run >= 1, "run");
  requireCondition(SAFE_ID.test(input.runId), "runId");
  requireCondition(ATTEMPT_NONCE.test(input.attemptNonce), "attemptNonce");
  requireCondition(
    input.previousArtifactSha256 === null ||
      HASH_64.test(input.previousArtifactSha256),
    "previousArtifactSha256",
  );
  requireCondition(HASH_40.test(input.commitSha), "commitSha");
  requireCondition(isoDateTime(input.capturedAt), "capturedAt");
  validateCounters(input.counters);
  const testCase = Array.isArray(input.matrix.cases)
    ? input.matrix.cases.find((item) => item?.id === input.caseId)
    : null;
  requireCondition(Boolean(testCase), "caseId.unknown");
  requireCondition(input.run <= testCase.runs, "run.out_of_range");
  const attemptKey = `${input.caseId}:${input.run}`;
  const attemptIndex = Array.isArray(input.matrix.attemptPlan)
    ? input.matrix.attemptPlan.findIndex((item) => item?.key === attemptKey)
    : -1;
  const attempt = attemptIndex >= 0 ? input.matrix.attemptPlan[attemptIndex] : null;
  requireCondition(Boolean(attempt), "attemptPlan.missing");
  requireCondition(attempt.index === attemptIndex + 1, "attemptPlan.index");
  requireCondition(attempt.runId === input.runId, "attemptPlan.runId");
  requireCondition(attempt.nonce === input.attemptNonce, "attemptPlan.nonce");
  requireCondition(
    attemptIndex === 0
      ? input.previousArtifactSha256 === null
      : HASH_64.test(input.previousArtifactSha256),
    "attemptPlan.previousArtifactSha256",
  );
  const publicProjection = projectTerminal(input.terminalResponse);
  const diagnosticProjection = projectDiagnostics(
    input.routeDiagnostics,
    input.counters,
    publicProjection.terminal,
  );
  const registeredProductTrace = projectRegisteredProductTrace({
    value: input.registeredProductTrace,
    testCase,
    cards: publicProjection.cards,
    terminal: publicProjection.terminal,
    diagnostics: diagnosticProjection.diagnostics,
  });
  const payload = {
    schemaVersion: STAGED_TERRA_READINESS_PRODUCER_VERSION,
    matrixVersion: input.matrix.schemaVersion,
    matrixSha256: stagedTerraReadinessCanonicalSha256(input.matrix),
    caseId: input.caseId,
    run: input.run,
    runId: input.runId,
    attemptIndex: attemptIndex + 1,
    attemptNonce: input.attemptNonce,
    previousArtifactSha256: input.previousArtifactSha256,
    commitSha: input.commitSha,
    requestSha256: stagedTerraReadinessCanonicalSha256(testCase.shopperRequest),
    capturedAt: input.capturedAt,
    terminal: publicProjection.terminal,
    presentationVersion: publicProjection.presentationVersion,
    finalAdvice: publicProjection.finalAdvice,
    cards: publicProjection.cards,
    sources: publicProjection.sources,
    registeredProductTrace,
    routeTrace: diagnosticProjection.routeTrace,
    diagnostics: diagnosticProjection.diagnostics,
    verificationAttribution: diagnosticProjection.verificationAttribution,
    counters: structuredClone(input.counters),
    usageLedgers: diagnosticProjection.usageLedgers,
  };
  const errors = validateProjectedPayload(payload);
  if (errors.length > 0) inputError(errors[0]);
  const envelope = {
    schemaVersion: STAGED_TERRA_READINESS_ARTIFACT_VERSION,
    payload,
    payloadSha256: stagedTerraReadinessCanonicalSha256(payload),
  };
  return Buffer.from(canonicalJson(envelope), "utf8");
}

export function parseStagedTerraReadinessArtifact(raw) {
  const bytes = Buffer.isBuffer(raw)
    ? raw
    : raw instanceof Uint8Array
      ? Buffer.from(raw)
      : typeof raw === "string"
        ? Buffer.from(raw, "utf8")
        : null;
  if (!bytes || bytes.length === 0 || bytes.length > MAX_ARTIFACT_BYTES) {
    return { ok: false, errors: ["artifact_bytes_invalid"] };
  }
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.charCodeAt(0) === 0xfeff) {
    return { ok: false, errors: ["artifact_utf8_invalid"] };
  }
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["artifact_json_invalid"] };
  }
  if (!exactKeys(envelope, ENVELOPE_KEYS)) {
    return { ok: false, errors: ["artifact_envelope_keys_invalid"] };
  }
  const errors = [];
  if (envelope.schemaVersion !== STAGED_TERRA_READINESS_ARTIFACT_VERSION) {
    errors.push("artifact_version_invalid");
  }
  if (!HASH_64.test(envelope.payloadSha256)) errors.push("artifact_payload_hash_invalid");
  if (
    HASH_64.test(envelope.payloadSha256) &&
    envelope.payloadSha256 !== stagedTerraReadinessCanonicalSha256(envelope.payload)
  ) {
    errors.push("artifact_payload_hash_mismatch");
  }
  errors.push(...validateProjectedPayload(envelope.payload));
  if (canonicalJson(envelope) !== text) errors.push("artifact_bytes_not_canonical");
  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };
  return {
    ok: true,
    artifactSha256: sha256(bytes),
    payload: envelope.payload,
  };
}

export function buildStagedTerraReadinessReviewPacket(raw) {
  const parsed = parseStagedTerraReadinessArtifact(raw);
  requireCondition(parsed.ok === true, "reviewPacket.artifact");
  const payload = parsed.payload;
  return {
    schemaVersion: STAGED_TERRA_READINESS_REVIEW_PACKET_VERSION,
    artifactSha256: parsed.artifactSha256,
    matrixVersion: payload.matrixVersion,
    matrixSha256: payload.matrixSha256,
    commitSha: payload.commitSha,
    caseId: payload.caseId,
    run: payload.run,
    runId: payload.runId,
    capturedAt: payload.capturedAt,
    terminal: structuredClone(payload.terminal),
    finalAdvice: structuredClone(payload.finalAdvice),
    cards: structuredClone(payload.cards),
    sources: structuredClone(payload.sources),
    registeredProductTrace: structuredClone(payload.registeredProductTrace),
  };
}

const APPROVAL_PRICING = {
  longContextThresholdInputTokens: 272_000,
  shortContext: { inputPerMillionUsd: 2.5, outputPerMillionUsd: 15 },
  longContext: { inputPerMillionUsd: 5, outputPerMillionUsd: 22.5 },
  cacheWriteMultiplier: 1.25,
  webSearchCallUsd: 0.01,
};

export function stagedTerraReadinessAccounting(payload) {
  const totals = {
    ...Object.fromEntries(
      STAGED_TERRA_READINESS_COUNTER_KEYS.map((key) => [key, payload.counters[key]]),
    ),
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    webSearchCalls: 0,
    conservativeUsd: 0,
  };
  for (const ledger of payload.usageLedgers) {
    totals.inputTokens += ledger.inputTokens;
    totals.cachedInputTokens += ledger.cachedInputTokens;
    totals.outputTokens += ledger.outputTokens;
    totals.webSearchCalls += ledger.webSearchCalls;
    const rates =
      ledger.inputTokens > APPROVAL_PRICING.longContextThresholdInputTokens
        ? APPROVAL_PRICING.longContext
        : APPROVAL_PRICING.shortContext;
    totals.conservativeUsd +=
      (ledger.inputTokens / 1_000_000) *
        rates.inputPerMillionUsd *
        APPROVAL_PRICING.cacheWriteMultiplier +
      (ledger.outputTokens / 1_000_000) * rates.outputPerMillionUsd +
      ledger.webSearchCalls * APPROVAL_PRICING.webSearchCallUsd;
  }
  totals.conservativeUsd = Number(totals.conservativeUsd.toFixed(6));
  return totals;
}

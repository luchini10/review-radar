export const READINESS_REQUESTS = {
  broad: { query: "shop vac" },
  constrained: {
    query: "robot vacuum",
    budget: "under $300",
    priorities: "self-emptying",
  },
};

export function readinessRequestForShape(shape) {
  return Object.hasOwn(READINESS_REQUESTS, shape)
    ? structuredClone(READINESS_REQUESTS[shape])
    : null;
}

export function readinessRequestContract(request, shape) {
  const knownShape = shape && Object.hasOwn(READINESS_REQUESTS, shape);
  const expected = knownShape
    ? READINESS_REQUESTS[shape]
    : request?.budget
      ? READINESS_REQUESTS.constrained
      : READINESS_REQUESTS.broad;
  const keys = Object.keys(request || {}).sort();
  const expectedKeys = Object.keys(expected).sort();
  const valid =
    (!shape || knownShape) &&
    JSON.stringify(keys) === JSON.stringify(expectedKeys) &&
    expectedKeys.every((key) => request?.[key] === expected[key]);

  return { valid, expected, actual: request };
}

export function readinessValidationPhase(fixture) {
  if (fixture?._validationPhase) return fixture._validationPhase;
  return fixture?._c4Shape ? "c4" : null;
}

export function readinessSampleExclusionReasons({
  ledger,
  phase,
  request,
  shape,
  storedExclusionReasons = [],
  sampleStatus,
  validateStoredStatus = false,
}) {
  if (!phase) return [];

  const reasons = [...storedExclusionReasons];
  const contract = readinessRequestContract(request, shape);
  const flags = ledger?.header?.flags || {};
  const reconciliation = ledger?.dispatch?.reconciliation;
  const attemptGuard = ledger?.dispatch?.attemptGuard;
  const physicalAttempts = reconciliation?.physicalAttempts || 0;

  if (!ledger) reasons.push("missing_debug_ledger");
  if (!["c4", "c5"].includes(phase)) reasons.push("unsupported_validation_phase");
  if (validateStoredStatus && sampleStatus !== "usable") {
    reasons.push("fixture_not_marked_usable");
  }
  if (!contract.valid) reasons.push("request_contract_mismatch");
  if (ledger?.header?.serperCacheEmptyAtStart !== true) {
    reasons.push("warm_serper_cache");
  }
  if (!ledger?.header?.commitHash) reasons.push("missing_commit_hash");

  if (phase === "c4" && flags.REVIEW_RADAR_NORMALIZATION_RECOVERY !== "on") {
    reasons.push("normalization_recovery_not_on");
  }
  if (phase === "c5") {
    if (flags.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION !== "on") {
      reasons.push("organic_identity_resolution_not_on");
    }
    if (!["unset", "off"].includes(flags.REVIEW_RADAR_NORMALIZATION_RECOVERY)) {
      reasons.push("normalization_recovery_not_off");
    }
  }
  if (flags.REVIEW_RADAR_CONSTRAINT_ALLOCATION !== "on") {
    reasons.push("constraint_allocation_not_on");
  }
  if (!["unset", "off"].includes(flags.REVIEW_RADAR_PINNED_PLANNING)) {
    reasons.push("pinned_planning_not_off");
  }
  if (flags.REVIEW_RADAR_MAX_SERPER_ATTEMPTS !== "120") {
    reasons.push("attempt_ceiling_not_120");
  }
  if (!reconciliation?.balanced) reasons.push("ledger_unbalanced");
  if (!attemptGuard) reasons.push("missing_attempt_guard");
  if (attemptGuard?.maxAttempts !== 120) reasons.push("attempt_guard_not_120");
  if (attemptGuard?.reservedAttempts !== physicalAttempts) {
    reasons.push("attempt_guard_reconciliation_mismatch");
  }
  if (attemptGuard?.tripped) reasons.push("attempt_ceiling_tripped");
  if (physicalAttempts > 120) reasons.push("physical_attempts_over_120");

  return Array.from(new Set(reasons));
}

import { createHash } from "node:crypto";
import path from "node:path";

import {
  isStagedTerraCompletedResponse,
  isStagedTerraFailureResponse,
  isStagedTerraPendingResponse,
  STAGED_TERRA_JOB_TOKEN_HEADER,
  STAGED_TERRA_POLL_AFTER_MS,
} from "../lib/stagedTerraApiContract.ts";
import { stagedTerraPresentationJsonSchema } from "../lib/stagedTerraContract.ts";
import {
  buildStagedTerraResearchRequest,
  STAGED_TERRA_PRESENTATION_INSTRUCTIONS,
} from "../lib/stagedTerraPrompt.ts";
import { validatePhaseDCreateRequest } from "./oai-t10-phase-d.mjs";
import {
  analyzeStagedTerraReadinessPrefix,
  stagedTerraReadinessMatrixSha256,
  stagedTerraReadinessRequestSha256,
  validateStagedTerraReadinessMatrix,
} from "./staged-terra-readiness.mjs";

export const STAGED_TERRA_READINESS_LIVE_PLAN_VERSION =
  "staged-terra-readiness-live-plan-v4";
export const STAGED_TERRA_READINESS_CHECKPOINT_VERSION =
  "staged-terra-readiness-runner-checkpoint-v1";
export const STAGED_TERRA_READINESS_MATRIX_FILE_SHA256 =
  "23fd7b495ec261a1508624aca17a212206241e27a4d8f93a283a5f19ddbeb960";
export const STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL =
  "https://api.openai.com/v1";

const HASH_40 = /^[a-f0-9]{40}$/;
const HASH_64 = /^[a-f0-9]{64}$/;
const ATTEMPT_NONCE = /^nonce-[a-f0-9]{64}$/;
const RUN_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const RUNNER_STATUSES = new Set([
  "running",
  "artifact_captured_review_required",
  "attempt_stopped_without_artifact",
]);
const RUNNER_FAILURE_CODES = new Set([
  "route_start_invalid",
  "job_token_changed",
  "route_terminal_invalid",
  "retrieve_ceiling_reached",
  "wall_clock_ceiling_reached",
  "artifact_build_failed",
  "unexpected_execution_failure",
]);
export const STAGED_TERRA_READINESS_APPROVAL_FIELDS = Object.freeze([
  "approved-commit",
  "approved-matrix-file-sha256",
  "approved-matrix-canonical-sha256",
  "approved-trust-surface-sha256",
  "approved-attempt-index",
  "approved-case-id",
  "approved-run",
  "approved-run-id",
  "approved-attempt-nonce",
  "approved-previous-artifact-sha256",
  "approved-openai-creates",
  "approved-openai-retrieves",
  "approved-hosted-searches",
  "approved-safety-cancels",
  "approved-serper-shopping-attempts",
  "approved-source-page-fetches",
  "approved-source-page-http-attempts",
  "approved-dollar-ceiling",
  "approved-wall-clock-ms",
  "approved-retries",
  "approved-replacements",
  "approved-fallbacks",
  "approved-serper-organic-attempts",
  "approved-search-api-attempts",
  "approved-additional-cases",
  "approved-output-relative-path",
]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalPreviousArtifact(value) {
  return value === null ? "none" : value;
}

function exactKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

function sameClosedValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameClosedValue(value, right[index]))
    );
  }
  const leftObject =
    left !== null && typeof left === "object" && !Array.isArray(left);
  const rightObject =
    right !== null && typeof right === "object" && !Array.isArray(right);
  if (leftObject || rightObject) {
    if (!leftObject || !rightObject) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] && sameClosedValue(left[key], right[key]),
      )
    );
  }
  return Object.is(left, right);
}

function presentationRequestIsClosed(body) {
  if (
    !exactKeys(body, [
      "model",
      "reasoning",
      "instructions",
      "input",
      "background",
      "max_output_tokens",
      "text",
    ]) ||
    body.model !== "gpt-5.6-terra" ||
    !sameClosedValue(body.reasoning, { effort: "medium" }) ||
    body.instructions !== STAGED_TERRA_PRESENTATION_INSTRUCTIONS ||
    body.background !== false ||
    body.max_output_tokens !== 8_000 ||
    !exactKeys(body.text, ["verbosity", "format"]) ||
    body.text.verbosity !== "medium" ||
    !exactKeys(body.text.format, ["type", "name", "strict", "schema"]) ||
    body.text.format.type !== "json_schema" ||
    body.text.format.name !== "review_radar_staged_terra_presentation" ||
    body.text.format.strict !== true ||
    typeof body.input !== "string"
  ) {
    return false;
  }
  const prefix = "VERIFIED_EVIDENCE_PACKAGE_JSON_START\n";
  const suffix = "\nVERIFIED_EVIDENCE_PACKAGE_JSON_END";
  if (!body.input.startsWith(prefix) || !body.input.endsWith(suffix)) {
    return false;
  }
  try {
    const input = JSON.parse(body.input.slice(prefix.length, -suffix.length));
    return (
      exactKeys(input, [
        "schema_version",
        "request_fingerprint",
        "requirements",
        "evidence",
        "candidates",
      ]) &&
      Array.isArray(input.requirements) &&
      sameClosedValue(
        body.text.format.schema,
        stagedTerraPresentationJsonSchema(input.requirements),
      )
    );
  } catch {
    return false;
  }
}

export function parseStagedTerraReadinessApprovalArguments(args) {
  const allowed = new Set([
    "execute",
    ...STAGED_TERRA_READINESS_APPROVAL_FIELDS,
  ]);
  const values = new Map();
  for (const argument of args) {
    requireCondition(
      typeof argument === "string" && argument.startsWith("--"),
      "Live approval contains a malformed argument.",
    );
    const body = argument.slice(2);
    const separator = body.indexOf("=");
    const name = separator === -1 ? body : body.slice(0, separator);
    const value = separator === -1 ? null : body.slice(separator + 1);
    requireCondition(allowed.has(name), `Live approval contains unknown field ${name}.`);
    requireCondition(!values.has(name), `Live approval repeats field ${name}.`);
    if (name === "execute") {
      requireCondition(value === null, "The execute flag must not have a value.");
      values.set(name, "true");
    } else {
      requireCondition(value !== null && value.length > 0, `Live approval field ${name} is empty.`);
      values.set(name, value);
    }
  }
  requireCondition(values.get("execute") === "true", "Live execution was not explicitly selected.");
  for (const field of STAGED_TERRA_READINESS_APPROVAL_FIELDS) {
    requireCondition(values.has(field), `Live approval is missing ${field}.`);
  }
  requireCondition(
    values.size === STAGED_TERRA_READINESS_APPROVAL_FIELDS.length + 1,
    "Live approval field count is invalid.",
  );
  return values;
}

function attemptFromMatrix(matrix, attemptIndex) {
  requireCondition(
    matrix !== null &&
      typeof matrix === "object" &&
      !Array.isArray(matrix) &&
      Array.isArray(matrix.attemptPlan),
    "The readiness attempt registry is invalid.",
  );
  requireCondition(
    Number.isSafeInteger(attemptIndex) &&
      attemptIndex >= 1 &&
      attemptIndex <= matrix.attemptPlan.length,
    "The readiness attempt index is invalid.",
  );
  const attempt = matrix.attemptPlan[attemptIndex - 1];
  requireCondition(attempt?.index === attemptIndex, "The readiness attempt registry is not sequential.");
  const separator = attempt.key.lastIndexOf(":");
  requireCondition(separator > 0, "The readiness attempt key is invalid.");
  const caseId = attempt.key.slice(0, separator);
  const run = Number(attempt.key.slice(separator + 1));
  const testCase = matrix.cases.find((item) => item.id === caseId);
  requireCondition(Boolean(testCase), "The readiness attempt case is unknown.");
  requireCondition(Number.isSafeInteger(run) && run >= 1 && run <= testCase.runs, "The readiness run is invalid.");
  return { attempt, caseId, run, testCase };
}

export function parseStagedTerraReadinessAttemptIndex({ matrix, value }) {
  requireCondition(
    typeof value === "string" && /^[1-9][0-9]*$/.test(value),
    "The readiness attempt index is invalid.",
  );
  const attemptIndex = Number(value);
  attemptFromMatrix(matrix, attemptIndex);
  return attemptIndex;
}

function exactArtifactBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  throw new Error("The prior readiness artifact bytes are invalid.");
}

export function authenticateStagedTerraReadinessPriorPrefix({
  matrix,
  attemptIndex,
  previousArtifactSha256,
  priorArtifacts,
  approvedCommitSha,
  now = new Date(),
}) {
  requireCondition(
    Array.isArray(priorArtifacts),
    "The readiness plan requires an exact prior artifact prefix.",
  );
  if (attemptIndex === 1) {
    requireCondition(
      previousArtifactSha256 === null && priorArtifacts.length === 0,
      "The first readiness attempt cannot have a prior artifact prefix.",
    );
    return {
      status: "not_required",
      artifactCount: 0,
      previousArtifactSha256: null,
      nextRun: matrix.runOrder[0] ?? null,
    };
  }
  requireCondition(
    priorArtifacts.length === attemptIndex - 1,
    "A later readiness attempt requires the complete prior artifact prefix.",
  );
  const artifacts = priorArtifacts.map(exactArtifactBytes);
  const actualPreviousArtifactSha256 = createHash("sha256")
    .update(artifacts.at(-1))
    .digest("hex");
  requireCondition(
    actualPreviousArtifactSha256 === previousArtifactSha256,
    "The reviewed previous artifact hash does not match the authenticated prefix.",
  );
  const analysis = analyzeStagedTerraReadinessPrefix({
    matrix,
    artifacts,
    approvedCommitSha,
    now,
  });
  const expectedNextRun = matrix.runOrder[attemptIndex - 1] ?? null;
  requireCondition(
    analysis.decision === "next_attempt_review_required" &&
      analysis.nextRun === expectedNextRun &&
      analysis.structuralFailures.length === 0 &&
      analysis.haltFailures.length === 0 &&
      analysis.qualityFailures.length === 0,
    "The prior readiness artifact prefix is not safe to continue.",
  );
  return {
    status: "authenticated",
    artifactCount: artifacts.length,
    previousArtifactSha256: actualPreviousArtifactSha256,
    nextRun: analysis.nextRun,
  };
}

export function stagedTerraReadinessOutputDirectory({
  repoRoot,
  runId,
  commitSha,
}) {
  requireCondition(
    RUN_ID.test(runId),
    "The readiness output requires a run ID.",
  );
  requireCondition(
    HASH_40.test(commitSha),
    "The readiness output requires a full lowercase commit SHA.",
  );
  return path.resolve(
    repoRoot,
    "tests",
    "fixtures",
    "review-radar-live",
    `${runId}-${commitSha.slice(0, 7)}`,
  );
}

export async function readStagedTerraReadinessPriorArtifactPrefix({
  matrix,
  attemptIndex,
  commitSha,
  repoRoot,
  readArtifactFile,
}) {
  const { attempt } = attemptFromMatrix(matrix, attemptIndex);
  requireCondition(
    typeof readArtifactFile === "function",
    "The readiness prior artifact reader is unavailable.",
  );
  const priorArtifacts = [];
  for (const priorAttempt of matrix.attemptPlan.slice(0, attempt.index - 1)) {
    const outputDirectory = stagedTerraReadinessOutputDirectory({
      repoRoot,
      runId: priorAttempt.runId,
      commitSha,
    });
    const record = await readArtifactFile({ repoRoot, outputDirectory });
    if (!record?.ok) {
      throw new Error(
        "The complete prior readiness artifact prefix is unavailable or indirect.",
      );
    }
    priorArtifacts.push(record.bytes);
  }
  return priorArtifacts;
}

export function buildStagedTerraReadinessRunPlan({
  matrix,
  matrixBytes,
  trustSurface,
  commitSha,
  attemptIndex = 1,
  previousArtifactSha256 = null,
  priorArtifacts = [],
  currentDate = new Date(),
  repoRoot = process.cwd(),
}) {
  requireCondition(HASH_40.test(commitSha), "The readiness plan requires a full lowercase commit SHA.");
  requireCondition(
    Buffer.isBuffer(matrixBytes) || matrixBytes instanceof Uint8Array,
    "The readiness plan requires the exact matrix file bytes.",
  );
  const exactMatrixBytes = Buffer.from(matrixBytes);
  const matrixFileSha256 = createHash("sha256")
    .update(exactMatrixBytes)
    .digest("hex");
  requireCondition(
    matrixFileSha256 === STAGED_TERRA_READINESS_MATRIX_FILE_SHA256,
    "The readiness matrix file bytes differ from the reviewed snapshot.",
  );
  let fileMatrix;
  try {
    fileMatrix = JSON.parse(exactMatrixBytes.toString("utf8"));
  } catch {
    throw new Error("The readiness matrix file is not valid JSON.");
  }
  requireCondition(
    stagedTerraReadinessMatrixSha256(fileMatrix) ===
      stagedTerraReadinessMatrixSha256(matrix),
    "The readiness matrix object differs from the reviewed file bytes.",
  );
  const matrixResult = validateStagedTerraReadinessMatrix(matrix, {
    now: currentDate,
  });
  requireCondition(
    matrixResult.ok,
    `The readiness matrix is invalid: ${matrixResult.errors[0] ?? "unknown"}.`,
  );
  const { attempt, caseId, run, testCase } = attemptFromMatrix(
    matrix,
    attemptIndex,
  );
  requireCondition(ATTEMPT_NONCE.test(attempt.nonce), "The readiness attempt nonce is invalid.");
  requireCondition(
    attemptIndex === 1
      ? previousArtifactSha256 === null
      : HASH_64.test(previousArtifactSha256),
    attemptIndex === 1
      ? "The first readiness attempt cannot have a previous artifact."
      : "A later readiness attempt requires the reviewed previous artifact hash.",
  );
  const priorPrefix = authenticateStagedTerraReadinessPriorPrefix({
    matrix,
    attemptIndex,
    previousArtifactSha256,
    priorArtifacts,
    approvedCommitSha: commitSha,
    now: currentDate,
  });
  const outputDirectory = stagedTerraReadinessOutputDirectory({
    repoRoot,
    runId: attempt.runId,
    commitSha,
  });
  const trustSurfaceAuthenticated =
    trustSurface?.ok === true &&
    HASH_64.test(trustSurface.manifestSha256) &&
    Array.isArray(trustSurface.entries) &&
    trustSurface.entries.length > 0 &&
    Array.isArray(trustSurface.failures) &&
    trustSurface.failures.length === 0;
  return {
    schemaVersion: STAGED_TERRA_READINESS_LIVE_PLAN_VERSION,
    mode: "dry-run",
    commitSha,
    matrixVersion: matrix.schemaVersion,
    matrixFileSha256,
    matrixCanonicalSha256: stagedTerraReadinessMatrixSha256(matrix),
    trustSurface: {
      status: trustSurfaceAuthenticated
        ? "authenticated"
        : "unauthenticated",
      manifestSha256: trustSurfaceAuthenticated
        ? trustSurface.manifestSha256
        : null,
      entryCount: trustSurfaceAuthenticated ? trustSurface.entries.length : 0,
      failures: trustSurfaceAuthenticated
        ? []
        : Array.isArray(trustSurface?.failures)
          ? [...trustSurface.failures]
          : ["trust_surface_unavailable"],
    },
    truthWindow: {
      reviewedAt: matrix.reviewedAt,
      expiresAt: matrix.expiresAt,
      evaluatedAt:
        currentDate instanceof Date
          ? currentDate.toISOString().slice(0, 10)
          : String(currentDate).slice(0, 10),
    },
    priorPrefix,
    model: "gpt-5.6-terra",
    researchReasoning: "high",
    presentationReasoning: "medium",
    attempt: {
      index: attempt.index,
      key: attempt.key,
      caseId,
      run,
      runId: attempt.runId,
      nonce: attempt.nonce,
      previousArtifactSha256,
      shopperRequest: structuredClone(testCase.shopperRequest),
      requestSha256: stagedTerraReadinessRequestSha256(testCase.shopperRequest),
    },
    ceilings: structuredClone(matrix.qualityBars.perRunCeilings),
    maximumCompletedWallClockMs: matrix.qualityBars.maximumCompletedWallClockMs,
    networkPolicy: {
      retries: matrix.qualityBars.allowedRetries,
      replacements: matrix.qualityBars.allowedReplacements,
      fallbacks: matrix.qualityBars.allowedFallbacks,
      serperOrganicAttempts: matrix.qualityBars.allowedSerperOrganicAttempts,
      searchApiAttempts: matrix.qualityBars.allowedSearchApiAttempts,
      additionalCases: matrix.qualityBars.allowedAdditionalCases,
      nextAttemptAutomatic: false,
      flagPromotion: false,
      deployment: false,
    },
    outputDirectory,
    outputRelativePath: path
      .relative(repoRoot, outputDirectory)
      .replaceAll("\\", "/"),
  };
}

export function validateStagedTerraReadinessRunApproval({
  args,
  plan,
  branch,
  trackedChanges,
  trustSurface,
  outputBoundary,
  credentials,
}) {
  const values = parseStagedTerraReadinessApprovalArguments(args);
  requireCondition(
    plan.trustSurface.status === "authenticated" &&
      HASH_64.test(plan.trustSurface.manifestSha256),
    "The readiness plan is not bound to an authenticated Git trust surface.",
  );
  const expected = {
    "approved-commit": plan.commitSha,
    "approved-matrix-file-sha256": plan.matrixFileSha256,
    "approved-matrix-canonical-sha256": plan.matrixCanonicalSha256,
    "approved-trust-surface-sha256": plan.trustSurface.manifestSha256,
    "approved-attempt-index": String(plan.attempt.index),
    "approved-case-id": plan.attempt.caseId,
    "approved-run": String(plan.attempt.run),
    "approved-run-id": plan.attempt.runId,
    "approved-attempt-nonce": plan.attempt.nonce,
    "approved-previous-artifact-sha256": canonicalPreviousArtifact(
      plan.attempt.previousArtifactSha256,
    ),
    "approved-openai-creates": String(plan.ceilings.openAiCreates),
    "approved-openai-retrieves": String(plan.ceilings.openAiRetrieves),
    "approved-hosted-searches": String(plan.ceilings.hostedSearches),
    "approved-safety-cancels": String(plan.ceilings.safetyCancels),
    "approved-serper-shopping-attempts": String(
      plan.ceilings.serperShoppingAttempts,
    ),
    "approved-source-page-fetches": String(plan.ceilings.sourcePageFetches),
    "approved-source-page-http-attempts": String(
      plan.ceilings.sourcePageHttpAttempts,
    ),
    "approved-dollar-ceiling": String(plan.ceilings.conservativeUsd),
    "approved-wall-clock-ms": String(plan.maximumCompletedWallClockMs),
    "approved-retries": String(plan.networkPolicy.retries),
    "approved-replacements": String(plan.networkPolicy.replacements),
    "approved-fallbacks": String(plan.networkPolicy.fallbacks),
    "approved-serper-organic-attempts": String(
      plan.networkPolicy.serperOrganicAttempts,
    ),
    "approved-search-api-attempts": String(
      plan.networkPolicy.searchApiAttempts,
    ),
    "approved-additional-cases": String(plan.networkPolicy.additionalCases),
    "approved-output-relative-path": plan.outputRelativePath,
  };
  for (const [field, value] of Object.entries(expected)) {
    requireCondition(
      values.get(field) === value,
      `Live approval does not match ${field}.`,
    );
  }
  requireCondition(branch === "main", "Readiness live execution requires branch main.");
  requireCondition(
    Array.isArray(trackedChanges) && trackedChanges.length === 0,
    "Tracked or staged changes exist; refusing an unpinned readiness run.",
  );
  requireCondition(
    trustSurface?.ok === true &&
      trustSurface.manifestSha256 === plan.trustSurface.manifestSha256 &&
      Array.isArray(trustSurface.failures) &&
      trustSurface.failures.length === 0,
    "The live trust surface differs from the authenticated readiness plan.",
  );
  requireCondition(
    outputBoundary?.ok === true &&
      outputBoundary.expectedLeafState === "absent" &&
      Array.isArray(outputBoundary.failures) &&
      outputBoundary.failures.length === 0,
    "The prospective readiness output path or parent chain is unsafe; refusing a retry.",
  );
  requireCondition(
    credentials?.openAiPresent === true,
    "OpenAI is not configured for this process.",
  );
  requireCondition(
    credentials?.serperSafe === true,
    "Serper is not configured safely for this process.",
  );
  return plan;
}

export function validateStagedTerraReadinessCreateRequest(
  body,
  createNumber,
  plan,
) {
  requireCondition(plan.model === "gpt-5.6-terra", "The readiness model drifted.");
  requireCondition(
    plan.ceilings.hostedSearches === 10,
    "The readiness hosted-search ceiling drifted.",
  );
  validatePhaseDCreateRequest(body, createNumber);
  if (createNumber === 1) {
    requireCondition(
      sameClosedValue(
        body,
        buildStagedTerraResearchRequest(plan.attempt.shopperRequest),
      ),
      "The readiness research request differs from the canonical builder.",
    );
  } else {
    requireCondition(
      presentationRequestIsClosed(body),
      "The readiness presentation request differs from the closed no-web contract.",
    );
  }
}

export function stagedTerraReadinessCeilingFailures({
  plan,
  accounting,
  wallClockMs,
}) {
  const failures = [];
  for (const [key, ceiling] of Object.entries(plan.ceilings)) {
    if (key === "conservativeUsd") continue;
    if (!Number.isFinite(accounting[key]) || accounting[key] > ceiling) {
      failures.push(key);
    }
  }
  if (
    !Number.isFinite(accounting.conservativeUsd) ||
    accounting.conservativeUsd > plan.ceilings.conservativeUsd
  ) {
    failures.push("conservativeUsd");
  }
  if (
    !Number.isFinite(accounting.webSearchCalls) ||
    accounting.webSearchCalls > plan.ceilings.hostedSearches
  ) {
    failures.push("webSearchCalls");
  }
  for (const key of [
    "retries",
    "replacements",
    "fallbacks",
    "serperOrganicAttempts",
    "searchApiAttempts",
    "additionalCases",
  ]) {
    if (
      !Number.isFinite(accounting[key]) ||
      accounting[key] > plan.networkPolicy[key]
    ) {
      failures.push(key);
    }
  }
  if (
    !Number.isFinite(wallClockMs) ||
    wallClockMs > plan.maximumCompletedWallClockMs
  ) {
    failures.push("maximumCompletedWallClockMs");
  }
  return [...new Set(failures)];
}

export function buildStagedTerraReadinessRunnerCheckpoint({
  plan,
  status,
  counters,
  routeDiagnostics,
  terminal,
  failureCode,
  startedAt,
  updatedAt,
}) {
  requireCondition(RUNNER_STATUSES.has(status), "The readiness checkpoint status is invalid.");
  requireCondition(
    failureCode === null || RUNNER_FAILURE_CODES.has(failureCode),
    "The readiness checkpoint failure code is invalid.",
  );
  requireCondition(
    failureCode === null || status === "attempt_stopped_without_artifact",
    "A readiness failure code requires a stopped attempt.",
  );
  return {
    schemaVersion: STAGED_TERRA_READINESS_CHECKPOINT_VERSION,
    plan: structuredClone({ ...plan, mode: "execute" }),
    status,
    startedAt,
    updatedAt,
    counters: structuredClone(counters),
    routeDiagnostics: structuredClone(routeDiagnostics),
    terminal: terminal === null ? null : structuredClone(terminal),
    failureCode,
  };
}

function request(method, body, jobToken) {
  return new Request("http://localhost/api/recommendations", {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(jobToken ? { [STAGED_TERRA_JOB_TOKEN_HEADER]: jobToken } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function executeStagedTerraReadinessAttempt({
  matrix,
  plan,
  counters,
  routeDiagnostics,
  handlers,
  sleep,
  now = Date.now,
  persistCheckpoint,
  buildArtifact,
}) {
  requireCondition(
    stagedTerraReadinessMatrixSha256(matrix) === plan.matrixCanonicalSha256,
    "The execution matrix differs from the approved readiness plan.",
  );
  const startedAtMs = now();
  const startedAt = new Date(startedAtMs).toISOString();
  let jobToken = null;
  let terminal = null;
  let failureCode = null;
  let artifact = null;
  let cancelAttempted = false;

  const persist = async (status) =>
    persistCheckpoint(
      buildStagedTerraReadinessRunnerCheckpoint({
        plan,
        status,
        counters,
        routeDiagnostics,
        terminal:
          status === "attempt_stopped_without_artifact" ? null : terminal,
        failureCode,
        startedAt,
        updatedAt: new Date(now()).toISOString(),
      }),
    );

  await persist("running");
  try {
    const started = await handlers.POST(
      request("POST", plan.attempt.shopperRequest),
    );
    const startBody = await parseJson(started);
    if (started.status === 202 && isStagedTerraPendingResponse(startBody)) {
      jobToken = startBody.jobToken;
      for (
        let pollNumber = 0;
        pollNumber < plan.ceilings.openAiRetrieves;
        pollNumber += 1
      ) {
        if (now() - startedAtMs >= plan.maximumCompletedWallClockMs) {
          failureCode = "wall_clock_ceiling_reached";
          break;
        }
        await sleep(STAGED_TERRA_POLL_AFTER_MS);
        const response = await handlers.GET(
          request("GET", undefined, jobToken),
        );
        const body = await parseJson(response);
        if (response.status === 202 && isStagedTerraPendingResponse(body)) {
          if (body.jobToken !== jobToken) {
            failureCode = "job_token_changed";
            break;
          }
          await persist("running");
          continue;
        }
        if (
          (response.status === 200 && isStagedTerraCompletedResponse(body)) ||
          isStagedTerraFailureResponse(body)
        ) {
          terminal = {
            statusCode: response.status,
            body,
            wallClockMs: Math.max(0, now() - startedAtMs),
          };
          break;
        }
        failureCode = "route_terminal_invalid";
        break;
      }
      if (terminal === null && failureCode === null) {
        failureCode = "retrieve_ceiling_reached";
      }
    } else if (isStagedTerraFailureResponse(startBody)) {
      terminal = {
        statusCode: started.status,
        body: startBody,
        wallClockMs: Math.max(0, now() - startedAtMs),
      };
    } else {
      failureCode = "route_start_invalid";
    }

    if (terminal !== null) {
      try {
        const capturedAt = new Date(now()).toISOString();
        artifact = buildArtifact({
          matrix,
          caseId: plan.attempt.caseId,
          run: plan.attempt.run,
          runId: plan.attempt.runId,
          attemptNonce: plan.attempt.nonce,
          previousArtifactSha256: plan.attempt.previousArtifactSha256,
          commitSha: plan.commitSha,
          capturedAt,
          terminalResponse: terminal,
          routeDiagnostics,
          counters,
        });
        await persist("artifact_captured_review_required");
        return {
          status: "artifact_captured_review_required",
          failureCode: null,
          terminalCode:
            terminal.body.state === "failed" ? terminal.body.code : null,
          wallClockMs: terminal.wallClockMs,
          capturedAt,
          artifact,
        };
      } catch {
        failureCode = "artifact_build_failed";
      }
    }
  } catch {
    failureCode = "unexpected_execution_failure";
  }

  if (jobToken && terminal === null && !cancelAttempted) {
    cancelAttempted = true;
    try {
      await handlers.DELETE(request("DELETE", undefined, jobToken));
    } catch {
      // One best-effort safety cancel is the complete failure path.
    }
  }
  failureCode ??= "unexpected_execution_failure";
  await persist("attempt_stopped_without_artifact");
  return {
    status: "attempt_stopped_without_artifact",
    failureCode,
    terminalCode: null,
    wallClockMs: null,
    capturedAt: null,
    artifact: null,
  };
}

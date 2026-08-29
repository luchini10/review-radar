import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

import { scoreAndSelectRecommendations } from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const batchDirectory = join(repoRoot, "docs", "agent-batches");

export const QA_BENCHMARK_MANIFEST_PATH = join(
  repoRoot,
  "tests",
  "fixtures",
  "qa-benchmark-matrix-v1.json",
);
export const QA_BENCHMARK_SCHEMA_VERSION = "review-radar-offline-benchmark-v1";
export const QA_BENCHMARK_RESULT_VERSION =
  "review-radar-offline-benchmark-result-v1";
export const QA_BENCHMARK_PROFILE = "committed-defaults-with-case-flags-v1";
export const QA_BATCH_SCHEMA_VERSION = "review-radar-agent-batch-v2";

const REQUIRED_COVERAGE = new Set([
  "accessory",
  "broad",
  "compatibility",
  "constrained",
  "duplicate_family",
  "fake_price",
  "missing_evidence",
  "non_product_page",
  "overconstrained",
  "wrong_type",
]);
const BENCHMARK_FLAG_DEFAULTS = Object.freeze({
  REVIEW_RADAR_CATEGORY_SCORING: "on",
  REVIEW_RADAR_CONSTRAINT_ALLOCATION: "off",
  REVIEW_RADAR_CREDIBILITY_PENALTY: "off",
  REVIEW_RADAR_LLM_NARRATION: "off",
  REVIEW_RADAR_SPEC_SEARCH: "off",
  REVIEW_RADAR_SPEC_VALIDATION: "off",
});
const INVARIANT_TYPES = new Set([
  "all_exact_price_trusted",
  "all_exact_product_eligible",
  "candidate_status",
  "exact_count",
  "max_exact_from_candidates",
]);
const CANDIDATE_STATUSES = new Set(["absent", "exact", "near", "not_exact"]);

function benchmarkError(message) {
  throw new Error(`QA benchmark contract violation: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values) {
  return (
    Array.isArray(values) &&
    values.every(nonemptyString) &&
    new Set(values).size === values.length
  );
}

function arraysEqual(first, second) {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateInvariant(invariant, candidateIds, caseId) {
  if (!isObject(invariant) || !nonemptyString(invariant.id)) {
    benchmarkError(`case ${caseId} has an invariant without a nonempty id`);
  }

  if (!INVARIANT_TYPES.has(invariant.type)) {
    benchmarkError(`case ${caseId} invariant ${invariant.id} has an unknown type`);
  }

  if (invariant.type === "candidate_status") {
    if (!candidateIds.has(invariant.candidateId)) {
      benchmarkError(
        `case ${caseId} invariant ${invariant.id} references an unknown candidate`,
      );
    }

    if (!CANDIDATE_STATUSES.has(invariant.status)) {
      benchmarkError(`case ${caseId} invariant ${invariant.id} has an invalid status`);
    }
  }

  if (invariant.type === "exact_count") {
    if (
      invariant.min === undefined &&
      invariant.max === undefined
    ) {
      benchmarkError(`case ${caseId} invariant ${invariant.id} has no bound`);
    }

    for (const value of [invariant.min, invariant.max]) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        benchmarkError(`case ${caseId} invariant ${invariant.id} has an invalid bound`);
      }
    }
  }

  if (invariant.type === "max_exact_from_candidates") {
    if (!uniqueStrings(invariant.candidateIds)) {
      benchmarkError(
        `case ${caseId} invariant ${invariant.id} needs unique candidate ids`,
      );
    }

    if (invariant.candidateIds.some((id) => !candidateIds.has(id))) {
      benchmarkError(
        `case ${caseId} invariant ${invariant.id} references an unknown candidate`,
      );
    }

    if (!Number.isInteger(invariant.max) || invariant.max < 0) {
      benchmarkError(`case ${caseId} invariant ${invariant.id} has an invalid max`);
    }
  }
}

export function validateBenchmarkManifest(manifest) {
  if (!isObject(manifest)) {
    benchmarkError("manifest must be an object");
  }

  if (manifest.schemaVersion !== QA_BENCHMARK_SCHEMA_VERSION) {
    benchmarkError("manifest schemaVersion is not current");
  }

  if (manifest.profile !== QA_BENCHMARK_PROFILE) {
    benchmarkError("manifest profile is not current");
  }

  if (
    !Array.isArray(manifest.cases) ||
    manifest.cases.length === 0 ||
    manifest.cases.length > 50
  ) {
    benchmarkError("manifest cases must contain between 1 and 50 entries");
  }

  if (!isObject(manifest.candidateOracles)) {
    benchmarkError("manifest candidateOracles must be an object");
  }

  const caseIds = new Set();
  const allCandidateIds = new Set();
  const coverage = new Set();

  for (const benchmarkCase of manifest.cases) {
    if (!isObject(benchmarkCase) || !nonemptyString(benchmarkCase.id)) {
      benchmarkError("every case needs a nonempty id");
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(benchmarkCase.id)) {
      benchmarkError(`case ${benchmarkCase.id} has a noncanonical id`);
    }

    if (caseIds.has(benchmarkCase.id)) {
      benchmarkError(`case id ${benchmarkCase.id} is duplicated`);
    }
    caseIds.add(benchmarkCase.id);

    if (!nonemptyString(benchmarkCase.partition)) {
      benchmarkError(`case ${benchmarkCase.id} has no partition`);
    }

    if (!uniqueStrings(benchmarkCase.coverage)) {
      benchmarkError(`case ${benchmarkCase.id} has invalid coverage tags`);
    }
    benchmarkCase.coverage.forEach((item) => coverage.add(item));

    if (
      !isObject(benchmarkCase.input) ||
      !nonemptyString(benchmarkCase.input.query)
    ) {
      benchmarkError(`case ${benchmarkCase.id} has no input query`);
    }

    if (benchmarkCase.flags !== undefined) {
      if (!isObject(benchmarkCase.flags)) {
        benchmarkError(`case ${benchmarkCase.id} flags must be an object`);
      }

      for (const [name, value] of Object.entries(benchmarkCase.flags)) {
        if (!(name in BENCHMARK_FLAG_DEFAULTS) || !["off", "on"].includes(value)) {
          benchmarkError(`case ${benchmarkCase.id} has an unsupported flag override`);
        }
      }
    }

    if (
      !Array.isArray(benchmarkCase.candidates) ||
      benchmarkCase.candidates.length === 0 ||
      benchmarkCase.candidates.length > 25
    ) {
      benchmarkError(`case ${benchmarkCase.id} needs between 1 and 25 candidates`);
    }

    const candidateIds = new Set();
    const candidateNames = new Set();

    for (const candidate of benchmarkCase.candidates) {
      if (
        !isObject(candidate) ||
        !nonemptyString(candidate.id) ||
        !nonemptyString(candidate.name) ||
        !nonemptyString(candidate.category) ||
        !nonemptyString(candidate.host) ||
        !nonemptyString(candidate.brand) ||
        !nonemptyString(candidate.model) ||
        !["editorial", "retailer", "strong"].includes(candidate.evidence)
      ) {
        benchmarkError(`case ${benchmarkCase.id} has an invalid candidate fixture`);
      }

      if (candidateIds.has(candidate.id) || candidateNames.has(candidate.name)) {
        benchmarkError(`case ${benchmarkCase.id} has duplicate candidate identity`);
      }
      if (allCandidateIds.has(candidate.id)) {
        benchmarkError(`candidate id ${candidate.id} is duplicated across cases`);
      }
      candidateIds.add(candidate.id);
      allCandidateIds.add(candidate.id);
      candidateNames.add(candidate.name);

      if (
        candidate.offer !== undefined &&
        (!Number.isFinite(candidate.offer) || candidate.offer < 0)
      ) {
        benchmarkError(`case ${benchmarkCase.id} candidate ${candidate.id} has an invalid offer`);
      }

      if (!Array.isArray(candidate.pros) || !candidate.pros.every(nonemptyString)) {
        benchmarkError(`case ${benchmarkCase.id} candidate ${candidate.id} has invalid pros`);
      }
    }

    if (
      !Array.isArray(benchmarkCase.invariants) ||
      benchmarkCase.invariants.length === 0 ||
      benchmarkCase.invariants.length > 25
    ) {
      benchmarkError(`case ${benchmarkCase.id} needs between 1 and 25 invariants`);
    }

    const invariantIds = benchmarkCase.invariants.map((invariant) => invariant?.id);
    if (!uniqueStrings(invariantIds)) {
      benchmarkError(`case ${benchmarkCase.id} has duplicate or invalid invariant ids`);
    }

    for (const invariant of benchmarkCase.invariants) {
      validateInvariant(invariant, candidateIds, benchmarkCase.id);
    }
  }

  for (const required of REQUIRED_COVERAGE) {
    if (!coverage.has(required)) {
      benchmarkError(`manifest is missing required coverage tag ${required}`);
    }
  }

  for (const tag of coverage) {
    if (!REQUIRED_COVERAGE.has(tag)) {
      benchmarkError(`manifest has unknown coverage tag ${tag}`);
    }
  }

  const oracleIds = Object.keys(manifest.candidateOracles);
  if (
    oracleIds.length !== allCandidateIds.size ||
    oracleIds.some((candidateId) => !allCandidateIds.has(candidateId)) ||
    [...allCandidateIds].some(
      (candidateId) => !Object.hasOwn(manifest.candidateOracles, candidateId),
    )
  ) {
    benchmarkError(
      "manifest candidateOracles must exactly cover every candidate id",
    );
  }

  for (const [candidateId, oracle] of Object.entries(
    manifest.candidateOracles,
  )) {
    if (
      !isObject(oracle) ||
      Object.keys(oracle).sort().join("|") !==
        "priceTrusted|productEligible" ||
      typeof oracle.priceTrusted !== "boolean" ||
      typeof oracle.productEligible !== "boolean"
    ) {
      benchmarkError(`candidate ${candidateId} has an invalid ground-truth oracle`);
    }
  }

  return manifest;
}

export async function loadBenchmarkManifest(path = QA_BENCHMARK_MANIFEST_PATH) {
  return validateBenchmarkManifest(JSON.parse(await readFile(path, "utf8")));
}

export function validateBatchDefinition(batch, manifest) {
  if (!isObject(batch) || batch.schemaVersion !== QA_BATCH_SCHEMA_VERSION) {
    benchmarkError("batch schemaVersion is not current");
  }

  if (!nonemptyString(batch.name)) {
    benchmarkError("batch name must be nonempty");
  }

  if (!Array.isArray(batch.searches) || !Array.isArray(batch.searchPool)) {
    benchmarkError(`batch ${batch.name} needs live search arrays`);
  }

  if (
    !uniqueStrings(batch.benchmarkCaseIds) ||
    batch.benchmarkCaseIds.length === 0 ||
    batch.benchmarkCaseIds.length > 50
  ) {
    benchmarkError(`batch ${batch.name} needs unique benchmarkCaseIds`);
  }

  const casesById = new Map(manifest.cases.map((item) => [item.id, item]));

  for (const caseId of batch.benchmarkCaseIds) {
    const benchmarkCase = casesById.get(caseId);

    if (!benchmarkCase) {
      benchmarkError(`batch ${batch.name} references unknown case ${caseId}`);
    }

    if (benchmarkCase.partition !== batch.name) {
      benchmarkError(
        `batch ${batch.name} borrows case ${caseId} from ${benchmarkCase.partition}`,
      );
    }
  }

  return batch;
}

export async function loadTrackedBatchDefinitions() {
  const names = (await readdir(batchDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const batches = [];

  for (const name of names) {
    batches.push(JSON.parse(await readFile(join(batchDirectory, name), "utf8")));
  }

  return batches;
}

export function validateBatchMatrix(batches, manifest) {
  validateBenchmarkManifest(manifest);

  if (!Array.isArray(batches) || batches.length === 0) {
    benchmarkError("tracked batch matrix is empty");
  }

  const batchNames = batches.map((batch) => batch?.name);
  if (!uniqueStrings(batchNames)) {
    benchmarkError("tracked batch names are duplicated or invalid");
  }

  const assigned = new Map();
  const signatures = new Set();

  for (const batch of batches) {
    validateBatchDefinition(batch, manifest);
    const signature = [...batch.benchmarkCaseIds].sort().join("|");

    if (signatures.has(signature)) {
      benchmarkError(`batch ${batch.name} duplicates another batch case set`);
    }
    signatures.add(signature);

    for (const caseId of batch.benchmarkCaseIds) {
      if (assigned.has(caseId)) {
        benchmarkError(`case ${caseId} is assigned to more than one batch`);
      }
      assigned.set(caseId, batch.name);
    }
  }

  for (const benchmarkCase of manifest.cases) {
    if (assigned.get(benchmarkCase.id) !== benchmarkCase.partition) {
      benchmarkError(`case ${benchmarkCase.id} is not assigned to its partition`);
    }
  }

  if (assigned.size !== manifest.cases.length) {
    benchmarkError("tracked batch matrix does not cover every manifest case exactly once");
  }

  return {
    batchCount: batches.length,
    caseCount: manifest.cases.length,
    coverage: [...REQUIRED_COVERAGE].sort(),
  };
}

function field(value, sourceUrl) {
  return {
    confidence: "High",
    sourceType: "json_ld",
    sourceUrl,
    value,
    verifiedAt: "2026-08-29T00:00:00.000Z",
  };
}

function offer(value, url) {
  return {
    availability: field("InStock", url),
    price: field(value, url),
    priceCurrency: field("USD", url),
    retailer: new URL(url).hostname,
    url,
  };
}

function citations(candidate, url) {
  if (candidate.evidence === "editorial") {
    return [
      {
        title: candidate.name,
        url,
        what_it_supports: "Synthetic editorial comparison evidence.",
      },
    ];
  }

  const productCitation = {
    title: `${candidate.name} product page`,
    url,
    what_it_supports: "Synthetic exact-product specifications and price.",
  };

  if (candidate.evidence === "strong") {
    return [
      productCitation,
      {
        title: `${candidate.name} independent test`,
        url: `https://independent-${slug(candidate.id)}.example/review`,
        what_it_supports: "Synthetic independent performance evidence.",
      },
    ];
  }

  return [productCitation];
}

function materializeCandidate(candidate) {
  const url =
    candidate.url ||
    `https://${candidate.host}/products/${slug(candidate.name)}`;
  const imageUrl = `https://${candidate.host}/images/${slug(candidate.id)}.jpg`;
  const metadata = {
    brand: field(candidate.brand, url),
    canonicalUrl: field(url, url),
    image: field(imageUrl, url),
    modelNumber: field(candidate.model, url),
    offers:
      candidate.offer === undefined ? [] : [offer(candidate.offer, url)],
    title: field(candidate.name, url),
  };

  if (Number.isFinite(candidate.rating)) {
    metadata.rating = field(candidate.rating, url);
  }
  if (Number.isFinite(candidate.reviews)) {
    metadata.reviewCount = field(candidate.reviews, url);
  }

  return {
    recommendation_type: "Best Match",
    name: candidate.name,
    category: candidate.category,
    product_page_url: url,
    product_image_url: imageUrl,
    why_recommended: `${candidate.name}. ${candidate.pros.join(" ")}`,
    pros: candidate.pros,
    cons: [],
    common_complaints: [],
    estimated_price_range:
      candidate.priceText ??
      (candidate.offer === undefined ? "Check current price" : `$${candidate.offer}`),
    confidence_score: 75,
    source_consensus: candidate.consensus || "Mixed",
    price_value_verdict:
      candidate.offer === undefined
        ? "Current price is not verified."
        : `Verified synthetic offer: $${candidate.offer}.`,
    best_for: "Offline benchmark fixture only.",
    not_for: [],
    citations: citations(candidate, url),
    metadata,
  };
}

function withBenchmarkFlags(overrides, operation) {
  const values = { ...BENCHMARK_FLAG_DEFAULTS, ...(overrides || {}) };
  const prior = new Map();

  for (const [name, value] of Object.entries(values)) {
    prior.set(name, {
      existed: Object.hasOwn(process.env, name),
      value: process.env[name],
    });
    process.env[name] = value;
  }

  try {
    return operation(values);
  } finally {
    for (const [name, state] of prior) {
      if (state.existed) {
        process.env[name] = state.value;
      } else {
        delete process.env[name];
      }
    }
  }
}

function candidateStatus(candidateId, exactIds, nearIds) {
  if (exactIds.includes(candidateId)) {
    return "exact";
  }

  if (nearIds.includes(candidateId)) {
    return "near";
  }

  return "absent";
}

function evaluateInvariant(invariant, context) {
  if (invariant.type === "candidate_status") {
    const actualStatus = candidateStatus(
      invariant.candidateId,
      context.exactCandidateIds,
      context.nearCandidateIds,
    );
    const passed =
      invariant.status === "not_exact"
        ? actualStatus !== "exact"
        : actualStatus === invariant.status;

    return {
      id: invariant.id,
      type: invariant.type,
      passed,
      actualStatus,
      expectedStatus: invariant.status,
    };
  }

  if (invariant.type === "exact_count") {
    const actual = context.exactCandidateIds.length;
    const passed =
      (invariant.min === undefined || actual >= invariant.min) &&
      (invariant.max === undefined || actual <= invariant.max);

    return {
      id: invariant.id,
      type: invariant.type,
      passed,
      actual,
      ...(invariant.min === undefined ? {} : { min: invariant.min }),
      ...(invariant.max === undefined ? {} : { max: invariant.max }),
    };
  }

  if (invariant.type === "max_exact_from_candidates") {
    const actualCandidateIds = invariant.candidateIds.filter((candidateId) =>
      context.exactCandidateIds.includes(candidateId),
    );

    return {
      id: invariant.id,
      type: invariant.type,
      passed: actualCandidateIds.length <= invariant.max,
      actualCandidateIds,
      max: invariant.max,
    };
  }

  if (invariant.type === "all_exact_product_eligible") {
    const failedCandidateIds = context.exactCandidateIds.filter(
      (candidateId) =>
        context.candidateOracles[candidateId].productEligible !== true,
    );

    return {
      id: invariant.id,
      type: invariant.type,
      passed: failedCandidateIds.length === 0,
      failedCandidateIds,
    };
  }

  const failedCandidateIds = context.exactCandidateIds.filter(
    (candidateId) => context.candidateOracles[candidateId].priceTrusted !== true,
  );

  return {
    id: invariant.id,
    type: invariant.type,
    passed: failedCandidateIds.length === 0,
    failedCandidateIds,
  };
}

function runBenchmarkCase(benchmarkCase, candidateOracles) {
  return withBenchmarkFlags(benchmarkCase.flags, (effectiveFlags) => {
    const candidates = benchmarkCase.candidates.map(materializeCandidate);
    const candidateIdByName = new Map(
      benchmarkCase.candidates.map((candidate) => [candidate.name, candidate.id]),
    );
    const input = {
      ...benchmarkCase.input,
      extractedRequirements: extractStructuredRequirements(benchmarkCase.input),
    };
    const result = scoreAndSelectRecommendations(
      {
        search_summary: "",
        assumptions: [],
        exactMatches: structuredClone(candidates),
        nearMatches: [],
        recommendations: [],
        what_to_avoid: [],
        final_buying_advice: "",
      },
      input,
    );
    const exactCandidateIds = result.exactMatches.map((product) =>
      candidateIdByName.get(product.name),
    );
    const nearCandidateIds = result.nearMatches.map((product) =>
      candidateIdByName.get(product.name),
    );
    const invariantResults = benchmarkCase.invariants.map((invariant) =>
      evaluateInvariant(invariant, {
        candidateOracles,
        exactCandidateIds,
        nearCandidateIds,
      }),
    );

    return {
      caseId: benchmarkCase.id,
      partition: benchmarkCase.partition,
      coverage: benchmarkCase.coverage,
      label: benchmarkCase.label,
      input: benchmarkCase.input,
      effectiveFlags,
      exactCandidateIds,
      nearCandidateIds,
      invariantResults,
      passed: invariantResults.every((invariant) => invariant.passed),
    };
  });
}

export function runBenchmarkCases(manifest, declaredCaseIds) {
  validateBenchmarkManifest(manifest);

  if (!uniqueStrings(declaredCaseIds) || declaredCaseIds.length === 0) {
    benchmarkError("declared case ids must be a nonempty unique array");
  }

  const casesById = new Map(manifest.cases.map((item) => [item.id, item]));
  const selected = declaredCaseIds.map((caseId) => {
    const benchmarkCase = casesById.get(caseId);

    if (!benchmarkCase) {
      benchmarkError(`requested case ${caseId} is unknown`);
    }

    return benchmarkCase;
  });
  const caseResults = selected.map((benchmarkCase) =>
    runBenchmarkCase(benchmarkCase, manifest.candidateOracles),
  );
  const totalInvariants = caseResults.reduce(
    (total, item) => total + item.invariantResults.length,
    0,
  );
  const passedInvariants = caseResults.reduce(
    (total, item) =>
      total + item.invariantResults.filter((invariant) => invariant.passed).length,
    0,
  );

  return {
    schemaVersion: QA_BENCHMARK_RESULT_VERSION,
    manifestVersion: manifest.schemaVersion,
    profile: manifest.profile,
    declaredCaseIds: [...declaredCaseIds],
    executedCaseIds: caseResults.map((item) => item.caseId),
    caseResults,
    totals: {
      cases: caseResults.length,
      casesPassed: caseResults.filter((item) => item.passed).length,
      invariants: totalInvariants,
      invariantsPassed: passedInvariants,
    },
    passed: caseResults.every((item) => item.passed),
  };
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

export function reconcileBenchmarkWorkerResult({ batch, manifest, workerResult }) {
  const errors = [];
  const expectedCaseIds = [...batch.benchmarkCaseIds];
  const benchmark = workerResult?.benchmark;

  if (workerResult?.batchName !== batch.name) {
    errors.push("worker batchName does not match the requested batch");
  }

  if (workerResult?.mode !== "deterministic-benchmark") {
    errors.push("worker mode is not deterministic-benchmark");
  }

  if (!isObject(benchmark)) {
    errors.push("worker result is missing benchmark evidence");
    return {
      batchName: batch.name,
      errors,
      executedCaseIds: [],
      expectedCaseIds,
      passed: false,
    };
  }

  if (benchmark.schemaVersion !== QA_BENCHMARK_RESULT_VERSION) {
    errors.push("worker benchmark result version is not current");
  }
  if (benchmark.manifestVersion !== manifest.schemaVersion) {
    errors.push("worker benchmark manifest version does not match");
  }
  if (benchmark.profile !== manifest.profile) {
    errors.push("worker benchmark profile does not match");
  }

  for (const duplicate of duplicateValues(benchmark.executedCaseIds)) {
    errors.push(`worker executed duplicate case ${duplicate}`);
  }
  for (const caseId of Array.isArray(benchmark.executedCaseIds)
    ? benchmark.executedCaseIds
    : []) {
    if (!manifest.cases.some((item) => item.id === caseId)) {
      errors.push(`worker executed unknown case ${caseId}`);
    }
  }

  if (!arraysEqual(benchmark.declaredCaseIds, expectedCaseIds)) {
    errors.push("worker declared case ids do not exactly match the batch manifest");
  }
  if (!arraysEqual(benchmark.executedCaseIds, expectedCaseIds)) {
    errors.push("worker executed case ids do not exactly match the batch manifest");
  }

  const caseResultIds = Array.isArray(benchmark.caseResults)
    ? benchmark.caseResults.map((item) => item?.caseId)
    : [];
  for (const duplicate of duplicateValues(caseResultIds)) {
    errors.push(`worker persisted duplicate case result ${duplicate}`);
  }
  if (!arraysEqual(caseResultIds, expectedCaseIds)) {
    errors.push("worker case results do not exactly match executed case ids");
  }

  const casesById = new Map(manifest.cases.map((item) => [item.id, item]));
  for (const caseResult of Array.isArray(benchmark.caseResults)
    ? benchmark.caseResults
    : []) {
    const expectedCase = casesById.get(caseResult?.caseId);

    if (!expectedCase) {
      continue;
    }

    if (caseResult.partition !== expectedCase.partition) {
      errors.push(`case ${expectedCase.id} partition does not match the manifest`);
    }
    if (caseResult.label !== expectedCase.label) {
      errors.push(`case ${expectedCase.id} label does not match the manifest`);
    }
    if (!arraysEqual(caseResult.coverage, expectedCase.coverage)) {
      errors.push(`case ${expectedCase.id} coverage does not match the manifest`);
    }
    if (JSON.stringify(caseResult.input) !== JSON.stringify(expectedCase.input)) {
      errors.push(`case ${expectedCase.id} input does not match the manifest`);
    }
    const expectedFlags = {
      ...BENCHMARK_FLAG_DEFAULTS,
      ...(expectedCase.flags || {}),
    };
    if (JSON.stringify(caseResult.effectiveFlags) !== JSON.stringify(expectedFlags)) {
      errors.push(`case ${expectedCase.id} effective flags do not match the manifest`);
    }

    const candidateIds = new Set(
      expectedCase.candidates.map((candidate) => candidate.id),
    );
    const exactCandidateIds = Array.isArray(caseResult.exactCandidateIds)
      ? caseResult.exactCandidateIds
      : [];
    const nearCandidateIds = Array.isArray(caseResult.nearCandidateIds)
      ? caseResult.nearCandidateIds
      : [];

    if (
      !uniqueStrings(exactCandidateIds) ||
      exactCandidateIds.some((candidateId) => !candidateIds.has(candidateId))
    ) {
      errors.push(`case ${expectedCase.id} has invalid exact candidate ids`);
    }
    if (
      !uniqueStrings(nearCandidateIds) ||
      nearCandidateIds.some((candidateId) => !candidateIds.has(candidateId))
    ) {
      errors.push(`case ${expectedCase.id} has invalid near candidate ids`);
    }
    if (nearCandidateIds.some((candidateId) => exactCandidateIds.includes(candidateId))) {
      errors.push(`case ${expectedCase.id} repeats a candidate across result streams`);
    }

    const expectedInvariantIds = expectedCase.invariants.map((item) => item.id);
    const actualInvariantIds = Array.isArray(caseResult.invariantResults)
      ? caseResult.invariantResults.map((item) => item?.id)
      : [];

    if (!arraysEqual(actualInvariantIds, expectedInvariantIds)) {
      errors.push(`case ${expectedCase.id} invariant results do not match the manifest`);
    }

    if (
      !Array.isArray(caseResult.invariantResults) ||
      caseResult.invariantResults.some((item) => typeof item?.passed !== "boolean")
    ) {
      errors.push(`case ${expectedCase.id} has malformed invariant outcomes`);
      continue;
    }

    for (let index = 0; index < expectedCase.invariants.length; index += 1) {
      const expectedInvariant = expectedCase.invariants[index];
      const actualInvariant = caseResult.invariantResults[index];

      if (!actualInvariant || actualInvariant.type !== expectedInvariant.type) {
        errors.push(`case ${expectedCase.id} invariant ${expectedInvariant.id} type is inconsistent`);
        continue;
      }

      if (expectedInvariant.type === "candidate_status") {
        const actualStatus = candidateStatus(
          expectedInvariant.candidateId,
          exactCandidateIds,
          nearCandidateIds,
        );
        const expectedPassed =
          expectedInvariant.status === "not_exact"
            ? actualStatus !== "exact"
            : actualStatus === expectedInvariant.status;

        if (
          actualInvariant.actualStatus !== actualStatus ||
          actualInvariant.expectedStatus !== expectedInvariant.status ||
          actualInvariant.passed !== expectedPassed
        ) {
          errors.push(`case ${expectedCase.id} invariant ${expectedInvariant.id} outcome is inconsistent`);
        }
      } else if (expectedInvariant.type === "exact_count") {
        const expectedPassed =
          (expectedInvariant.min === undefined ||
            exactCandidateIds.length >= expectedInvariant.min) &&
          (expectedInvariant.max === undefined ||
            exactCandidateIds.length <= expectedInvariant.max);

        if (
          actualInvariant.actual !== exactCandidateIds.length ||
          actualInvariant.min !== expectedInvariant.min ||
          actualInvariant.max !== expectedInvariant.max ||
          actualInvariant.passed !== expectedPassed
        ) {
          errors.push(`case ${expectedCase.id} invariant ${expectedInvariant.id} outcome is inconsistent`);
        }
      } else if (expectedInvariant.type === "max_exact_from_candidates") {
        const actualCandidateIds = expectedInvariant.candidateIds.filter((candidateId) =>
          exactCandidateIds.includes(candidateId),
        );
        if (
          !arraysEqual(actualInvariant.actualCandidateIds, actualCandidateIds) ||
          actualInvariant.max !== expectedInvariant.max ||
          actualInvariant.passed !==
            (actualCandidateIds.length <= expectedInvariant.max)
        ) {
          errors.push(`case ${expectedCase.id} invariant ${expectedInvariant.id} outcome is inconsistent`);
        }
      } else {
        const oracleField =
          expectedInvariant.type === "all_exact_product_eligible"
            ? "productEligible"
            : "priceTrusted";
        const failedCandidateIds = exactCandidateIds.filter(
          (candidateId) =>
            manifest.candidateOracles[candidateId][oracleField] !== true,
        );
        if (
          !arraysEqual(actualInvariant.failedCandidateIds, failedCandidateIds) ||
          actualInvariant.passed !== (failedCandidateIds.length === 0)
        ) {
          errors.push(`case ${expectedCase.id} invariant ${expectedInvariant.id} outcome is inconsistent`);
        }
      }
    }

    const expectedPassed = caseResult.invariantResults.every((item) => item.passed);
    if (caseResult.passed !== expectedPassed) {
      errors.push(`case ${expectedCase.id} passed value is inconsistent`);
    }
  }

  const expectedBenchmarkPassed =
    Array.isArray(benchmark.caseResults) &&
    benchmark.caseResults.length > 0 &&
    benchmark.caseResults.every((item) => item?.passed === true);
  if (benchmark.passed !== expectedBenchmarkPassed) {
    errors.push("worker benchmark passed value is inconsistent");
  }
  if (Array.isArray(benchmark.caseResults)) {
    const expectedTotals = {
      cases: benchmark.caseResults.length,
      casesPassed: benchmark.caseResults.filter((item) => item?.passed === true).length,
      invariants: benchmark.caseResults.reduce(
        (total, item) =>
          total +
          (Array.isArray(item?.invariantResults)
            ? item.invariantResults.length
            : 0),
        0,
      ),
      invariantsPassed: benchmark.caseResults.reduce(
        (total, item) =>
          total +
          (Array.isArray(item?.invariantResults)
            ? item.invariantResults.filter((invariant) => invariant?.passed === true)
                .length
            : 0),
        0,
      ),
    };
    if (JSON.stringify(benchmark.totals) !== JSON.stringify(expectedTotals)) {
      errors.push("worker benchmark totals are inconsistent");
    }
  }

  return {
    batchName: batch.name,
    errors,
    executedCaseIds: Array.isArray(benchmark.executedCaseIds)
      ? benchmark.executedCaseIds
      : [],
    expectedCaseIds,
    passed: errors.length === 0,
  };
}

export function reconcileBenchmarkWorkerResults({
  batches,
  manifest,
  requestedBatchNames,
  workerResults,
}) {
  validateBatchMatrix(batches, manifest);
  const errors = [];
  const requested = Array.isArray(requestedBatchNames)
    ? requestedBatchNames
    : [];
  const results = Array.isArray(workerResults) ? workerResults : [];

  if (!uniqueStrings(requested) || requested.length === 0) {
    errors.push("requested batch names must be nonempty and unique");
  }

  const batchesByName = new Map(batches.map((batch) => [batch.name, batch]));
  const resultCounts = new Map();

  for (const result of results) {
    resultCounts.set(result.batchName, (resultCounts.get(result.batchName) || 0) + 1);
  }

  const perBatch = [];
  for (const batchName of requested) {
    const batch = batchesByName.get(batchName);
    const matching = results.filter((result) => result.batchName === batchName);

    if (!batch) {
      errors.push(`requested batch ${batchName} is unknown`);
      continue;
    }

    if (matching.length !== 1) {
      errors.push(`requested batch ${batchName} produced ${matching.length} worker results`);
      continue;
    }

    const reconciliation = reconcileBenchmarkWorkerResult({
      batch,
      manifest,
      workerResult: matching[0],
    });
    perBatch.push(reconciliation);
    errors.push(...reconciliation.errors.map((error) => `${batchName}: ${error}`));
  }

  for (const [batchName, count] of resultCounts) {
    if (!requested.includes(batchName)) {
      errors.push(`unexpected worker result for batch ${batchName}`);
    }
    if (count > 1) {
      errors.push(`batch ${batchName} produced duplicate worker results`);
    }
  }

  return {
    errors,
    passed: errors.length === 0,
    perBatch,
  };
}

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function requestedCaseIds(manifest) {
  const raw = argValue("case-ids");
  if (!raw) {
    return manifest.cases.map((item) => item.id);
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function printBenchmarkSummary(result) {
  console.log(
    `Tracked offline benchmark: ${result.totals.casesPassed}/${result.totals.cases} cases and ${result.totals.invariantsPassed}/${result.totals.invariants} invariants passed.`,
  );
  for (const caseResult of result.caseResults) {
    console.log(
      `${caseResult.passed ? "PASS" : "FAIL"} ${caseResult.caseId}: ${caseResult.invariantResults.filter((item) => item.passed).length}/${caseResult.invariantResults.length} invariants`,
    );
    for (const invariant of caseResult.invariantResults.filter(
      (item) => !item.passed,
    )) {
      console.log(`  - ${invariant.id}`);
    }
  }
}

async function main() {
  const manifest = await loadBenchmarkManifest();
  const batches = await loadTrackedBatchDefinitions();
  validateBatchMatrix(batches, manifest);
  const result = runBenchmarkCases(manifest, requestedCaseIds(manifest));

  if (hasFlag("json")) {
    console.log(JSON.stringify(result));
  } else {
    printBenchmarkSummary(result);
  }

  if (!result.passed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

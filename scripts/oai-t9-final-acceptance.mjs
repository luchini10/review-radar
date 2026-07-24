import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  DIRECT_TERRA_EVAL_CASES,
  DIRECT_TERRA_EVAL_VERSION,
  parseRankedProducts,
  scoreDirectTerraCaseStability,
  scoreDirectTerraRunProspective,
} from "../lib/directTerraEvaluation.ts";
import {
  buildDirectTerraResearchRequest,
  DIRECT_TERRA_COMPARISON_MODEL,
  DIRECT_TERRA_PROMPT_VERSION,
} from "../lib/directTerraPrompt.ts";
import {
  DIRECT_TERRA_ASSET_VERIFIER_VERSION,
} from "../lib/directTerraAssetVerifier.ts";
import {
  DIRECT_TERRA_FIRST_LOSS_VERSION,
} from "../lib/directTerraFirstLoss.ts";
import {
  DIRECT_TERRA_PRODUCT_RELATIONSHIP_VERSION,
} from "../lib/directTerraProductRelationship.ts";
import {
  GOLD,
  coversLeaderProspective07d,
} from "./goldBenchmark.mjs";

export const OAI_T9_ACCEPTANCE_VERSION = "oai-t9-sol-acceptance-v1";
export const OAI_T9_LEADER_LIST_VERSION = "leaders-v2026-07c";
export const OAI_T9_LEADER_MATCHER_VERSION = "leaders-v2026-07d-matcher";
export const OAI_T9_BASELINE_DIRECTORY =
  "tests/fixtures/review-radar-live/oai-t8c-multi-category-validation-d7a2ec2";

export const OAI_T9_ACCEPTANCE_CASES = DIRECT_TERRA_EVAL_CASES.map(
  (testCase) => ({
    ...structuredClone(testCase),
    runs: 3,
  }),
);

export const OAI_T9_ACCEPTANCE_BARS = Object.freeze({
  minimumRankedProductsPerRun: 3,
  maximumRankedProductsPerRun: 5,
  broadLeaderMeanMinimum: 4,
  broadLeaderRunMinimum: 3,
  minimumEveryPairwiseProductJaccard: 0.6,
  allowedWrongTypeCount: 0,
  allowedBudgetViolationCount: 0,
  allowedWrongAssetCount: 0,
  requiredClearBlindWins: 2,
});

export const OAI_T9_ACCEPTANCE_ENVELOPE = Object.freeze({
  responsesCreates: 12,
  hostedSearches: 240,
  retrieves: 720,
  safetyCancels: 12,
  serperShoppingRequests: 60,
  serperOrganicRequests: 96,
  candidatePageFetches: 60,
  retries: 0,
  replacements: 0,
  fallbacks: 0,
  extraCases: 0,
  searchApiRequests: 0,
});

// The written plan requires visual identity review and claim/source review but
// omitted the network allowance needed to perform them. These requests are
// review-only: they cannot discover, rank, replace, or decorate products.
export const OAI_T9_AUDIT_ALLOWANCE = Object.freeze({
  selectedImageRetrievals: 60,
  destinationPageAuditOpens: 60,
  sourcePageAuditOpens: 48,
  selectedImagesPerRun: 5,
  destinationPagesPerRun: 5,
  sourcePagesPerRun: 4,
});

// Current official standard pricing on 2026-07-24:
// https://developers.openai.com/api/docs/pricing
// Sol short context: $5 input / $0.50 cached input / $6.25 cache write /
// $30 output per million tokens. Web search is $0.01 per call.
//
// The hard ceiling applies a conservative cache-write rate to every uncached
// input token. Twelve times the largest saved T8D token/search observation is
// $19.61 under that bound; $22 allows a 12.2% buffer for V3 slate overhead
// without approaching the long-context threshold.
export const OAI_T9_SOL_PRICING = Object.freeze({
  priceDate: "2026-07-24",
  sourceUrl: "https://developers.openai.com/api/docs/pricing",
  longContextThresholdTokens: 272_000,
  shortContext: Object.freeze({
    inputPerMillionUsd: 5,
    cachedInputPerMillionUsd: 0.5,
    cacheWritePerMillionUsd: 6.25,
    outputPerMillionUsd: 30,
  }),
  longContext: Object.freeze({
    inputPerMillionUsd: 10,
    cachedInputPerMillionUsd: 1,
    cacheWritePerMillionUsd: 12.5,
    outputPerMillionUsd: 45,
  }),
  webSearchCallUsd: 0.01,
  hardCeilingUsd: 22,
  observedT8dRunCount: 14,
  observedT8dMaximum: Object.freeze({
    inputTokens: 109_585,
    outputTokens: 27_297,
    webSearchCalls: 13,
  }),
  twelveRunObservedMaximumUpperBoundUsd: 19.605795,
});

const BASELINE_REPORT_HASHES = Object.freeze({
  "eval-broad-office-chair.run1.json":
    "5bb456b5c48e3816312e24525783fd5fc9120d41619dc37b9e7759fd50b99480",
  "eval-broad-office-chair.run2.json":
    "f8931499ccad3d2afc9ca57c31b96c8d811a8805875ec50316c03ff9bfd423e4",
  "eval-broad-office-chair.run3.json":
    "0cda18485e5ead5b21c0f3bad360500701d288a88f93213271e9e02e6fff97d8",
  "eval-con-cordless-drill-150-brushless.run1.json":
    "2be3d47816b039004b57a42f548d70f2941bfe906bcde8e65a98831cad440729",
  "eval-con-cordless-drill-150-brushless.run2.json":
    "bdf29d12a1825f96b96c7a224ed6e8b0c013609c697eadde84b35fe3bf62b319",
  "eval-con-cordless-drill-150-brushless.run3.json":
    "c4c1711c3f3428aac191be7cd4a76854bb7b765355099d50c96a9cdae38e4545",
  "eval-con-gas-grill-600-4burner.run1.json":
    "7245509158d9f3ee977371869b7cfadf1d9a86da275feaae19c71d013e6a0918",
  "eval-con-gas-grill-600-4burner.run2.json":
    "7fd0e51451f434a6ec46617fba9d9183140cb9f1ac39b1bcab68401738654c9b",
  "eval-con-gas-grill-600-4burner.run3.json":
    "0de67df2963e2de51c875a5948722afc59d9dc857f8766d9749f28c13f350f6a",
  "eval-con-robot-vac-300-selfempty.run1.json":
    "a4eac005166de02e00e320c7555205bd2f9b937e232e664a539e5c90bd436162",
  "eval-con-robot-vac-300-selfempty.run2.json":
    "446b835f37bea80ee92fcd179dc8d1800e742dcb7fcdf956da3c6bab68a98749",
  "eval-con-robot-vac-300-selfempty.run3.json":
    "cd2ab2663377a9b290d84029fb6e9965a5955f1ea6ca44733be6ccae5f9ad91b",
});

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(String(value)).protocol);
  } catch {
    return false;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function reportUrls(markdown) {
  const urls = [];
  const markdownLink = /\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi;
  const bareUrl = /https?:\/\/[^\s<>"')\]]+/gi;
  for (const match of String(markdown ?? "").matchAll(markdownLink)) {
    urls.push(match[1]);
  }
  for (const match of String(markdown ?? "").matchAll(bareUrl)) {
    urls.push(match[0]);
  }
  return unique(urls);
}

function caseById(id) {
  return OAI_T9_ACCEPTANCE_CASES.find((item) => item.id === id) ?? null;
}

function benchmarkById(id) {
  return GOLD.find((item) => item.id === id) ?? null;
}

function runKey(value) {
  return `${value?.caseId ?? value?.case?.id ?? ""}:${value?.run ?? ""}`;
}

function productKey(caseId, run, rank) {
  return `${caseId}:${run}:rank-${rank}`;
}

function mapUniqueRows(rows, keyFn, failures, failurePrefix) {
  const result = new Map();
  for (const row of array(rows)) {
    const key = keyFn(row);
    if (!key || result.has(key)) {
      failures.push(`${failurePrefix}:${key || "missing"}`);
      continue;
    }
    result.set(key, row);
  }
  return result;
}

function pairwiseJaccard(sets) {
  const values = [];
  for (let first = 0; first < sets.length; first += 1) {
    for (let second = first + 1; second < sets.length; second += 1) {
      const left = new Set(sets[first]);
      const right = new Set(sets[second]);
      const union = new Set([...left, ...right]);
      const intersection = [...left].filter((value) => right.has(value));
      values.push(union.size === 0 ? 0 : intersection.length / union.size);
    }
  }
  return values;
}

export function estimateOaiT9SolCost(usage, { conservative = false } = {}) {
  const inputTokens = Math.max(0, Number(usage?.inputTokens) || 0);
  const cachedInputTokens = Math.min(
    inputTokens,
    Math.max(0, Number(usage?.cachedInputTokens) || 0),
  );
  const outputTokens = Math.max(0, Number(usage?.outputTokens) || 0);
  const webSearchCalls = Math.max(0, Number(usage?.webSearchCalls) || 0);
  const rates =
    inputTokens > OAI_T9_SOL_PRICING.longContextThresholdTokens
      ? OAI_T9_SOL_PRICING.longContext
      : OAI_T9_SOL_PRICING.shortContext;
  const uncachedRate = conservative
    ? rates.cacheWritePerMillionUsd
    : rates.inputPerMillionUsd;
  return (
    ((inputTokens - cachedInputTokens) / 1_000_000) * uncachedRate +
    (cachedInputTokens / 1_000_000) * rates.cachedInputPerMillionUsd +
    (outputTokens / 1_000_000) * rates.outputPerMillionUsd +
    webSearchCalls * OAI_T9_SOL_PRICING.webSearchCallUsd
  );
}

export function buildOaiT9AcceptancePlan(commit = "<commit-after-preflight>") {
  const cases = OAI_T9_ACCEPTANCE_CASES.map((testCase) => {
    const request = buildDirectTerraResearchRequest(testCase.request, {
      model: DIRECT_TERRA_COMPARISON_MODEL,
    });
    return {
      id: testCase.id,
      kind: testCase.kind,
      benchmarkId: testCase.goldId,
      request: structuredClone(testCase.request),
      runs: testCase.runs,
      promptHash: createHash("sha256")
        .update(
          JSON.stringify({
            instructions: request.instructions,
            input: request.input,
          }),
          "utf8",
        )
        .digest("hex"),
      schemaHash: sha256(JSON.stringify(request.text?.format?.schema ?? null)),
    };
  });
  return {
    status: "awaiting_exact_live_approval_no_provider_calls",
    acceptanceVersion: OAI_T9_ACCEPTANCE_VERSION,
    commit,
    model: DIRECT_TERRA_COMPARISON_MODEL,
    reasoning: "high",
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    evaluatorVersion: DIRECT_TERRA_EVAL_VERSION,
    leaderListVersion: OAI_T9_LEADER_LIST_VERSION,
    leaderMatcherVersion: OAI_T9_LEADER_MATCHER_VERSION,
    assetVerifierVersion: DIRECT_TERRA_ASSET_VERIFIER_VERSION,
    relationshipVersion: DIRECT_TERRA_PRODUCT_RELATIONSHIP_VERSION,
    firstLossVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    cases,
    envelope: OAI_T9_ACCEPTANCE_ENVELOPE,
    auditAllowanceRequiredToSatisfyPlan: OAI_T9_AUDIT_ALLOWANCE,
    pricing: OAI_T9_SOL_PRICING,
    baselineDirectory: OAI_T9_BASELINE_DIRECTORY,
    baselineReportHashes: structuredClone(BASELINE_REPORT_HASHES),
    rules: [
      "Exactly the four frozen cases run three times each.",
      "No retry, replacement, fallback, additional case, SearchAPI request, flag change, deployment, or production change.",
      "A failed route remains part of the twelve-run denominator.",
      "Asset coverage is informational; unsafe assets fail.",
      "Manual audit requests cannot discover, rank, replace, or decorate products.",
      "The sample is terminal: no category-specific correction follows.",
    ],
  };
}

export function loadAndVerifyOaiT9Baseline(
  repositoryRoot,
  baselineDirectory = OAI_T9_BASELINE_DIRECTORY,
) {
  const directory = path.resolve(repositoryRoot, baselineDirectory);
  const reports = [];
  for (const [file, expectedHash] of Object.entries(BASELINE_REPORT_HASHES)) {
    const fullPath = path.join(directory, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing frozen baseline fixture: ${file}`);
    }
    const fixture = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const reportMarkdown = String(fixture.reportMarkdown ?? "");
    const actualHash = sha256(reportMarkdown);
    if (actualHash !== expectedHash) {
      throw new Error(`Frozen baseline report hash mismatch: ${file}`);
    }
    const matched = file.match(/^(.*)\.run(\d+)\.json$/);
    if (!matched) throw new Error(`Invalid baseline fixture name: ${file}`);
    reports.push({
      caseId: matched[1],
      run: Number(matched[2]),
      reportMarkdown,
      reportHash: actualHash,
    });
  }
  return reports.sort(
    (left, right) =>
      left.caseId.localeCompare(right.caseId) || left.run - right.run,
  );
}

export function buildOaiT9BlindPacket({
  fixtures,
  baselineReports,
  commit,
}) {
  const packet = {
    schemaVersion: "oai-t9-blind-comparison-packet-v1",
    cases: [],
  };
  const key = {
    schemaVersion: "oai-t9-blind-comparison-key-v1",
    commit,
    cases: [],
  };
  for (const testCase of OAI_T9_ACCEPTANCE_CASES) {
    const current = array(fixtures)
      .filter((fixture) => fixture.caseId === testCase.id)
      .sort((left, right) => left.run - right.run)
      .map((fixture) => ({
        run: fixture.run,
        reportMarkdown: fixture.reportMarkdown,
      }));
    const baseline = array(baselineReports)
      .filter((fixture) => fixture.caseId === testCase.id)
      .sort((left, right) => left.run - right.run)
      .map((fixture) => ({
        run: fixture.run,
        reportMarkdown: fixture.reportMarkdown,
      }));
    if (current.length !== 3 || baseline.length !== 3) {
      throw new Error(`Incomplete blind comparison set: ${testCase.id}`);
    }
    const currentSide =
      Number.parseInt(sha256(`${commit}:${testCase.id}`).slice(0, 2), 16) % 2 ===
      0
        ? "A"
        : "B";
    packet.cases.push({
      caseId: testCase.id,
      sideA: currentSide === "A" ? current : baseline,
      sideB: currentSide === "B" ? current : baseline,
      reviewQuestion:
        "Which three-run set gives the more useful, accurate, well-supported product research answer: A, B, or tie?",
    });
    key.cases.push({
      caseId: testCase.id,
      currentSide,
      baselineSide: currentSide === "A" ? "B" : "A",
    });
  }
  return { packet, key };
}

function activeSectionUrls(fixture, product) {
  const active = new Set(array(fixture.citationUrls).filter(isHttpUrl));
  return reportUrls(product.section).filter((url) => active.has(url));
}

export function buildOaiT9ManualReviewTemplate(fixtures) {
  const recommendationAudits = [];
  const assetAudits = [];
  const sourceAudits = [];
  for (const fixture of array(fixtures)) {
    const testCase = caseById(fixture.caseId);
    if (!testCase) continue;
    const ranked = parseRankedProducts(fixture.reportMarkdown);
    const assets = new Map(
      array(fixture.productAssets).map((asset) => [asset.rank, asset]),
    );
    for (const product of ranked) {
      const key = productKey(testCase.id, fixture.run, product.rank);
      recommendationAudits.push({
        key,
        caseId: testCase.id,
        run: fixture.run,
        rank: product.rank,
        productName: product.name,
        identityAndType: "pending",
        hardRequirements:
          testCase.kind === "constrained" ? "pending" : "not_applicable",
        notes: "",
      });
      const asset = assets.get(product.rank);
      if (asset?.productUrl || asset?.imageUrl) {
        const imageCheck = array(fixture.selectedImageChecks).find(
          (item) => item.rank === product.rank,
        );
        assetAudits.push({
          key,
          caseId: testCase.id,
          run: fixture.run,
          rank: product.rank,
          productName: product.name,
          productUrl: asset?.productUrl ?? null,
          imageFile: imageCheck?.fileName ?? null,
          destinationInspected: false,
          destinationIdentity: asset?.productUrl ? "pending" : "not_applicable",
          imageIdentity: asset?.imageUrl ? "pending" : "not_applicable",
          notes: "",
        });
      }
    }
    for (const product of ranked.slice(0, 2)) {
      sourceAudits.push({
        key: productKey(testCase.id, fixture.run, product.rank),
        caseId: testCase.id,
        run: fixture.run,
        rank: product.rank,
        productName: product.name,
        eligibleSourceUrls: activeSectionUrls(fixture, product),
        inspectedSourceUrls: [],
        claimSupport: "pending",
        notes: "",
      });
    }
  }
  return {
    schemaVersion: "oai-t9-manual-review-v1",
    measurementDefect: {
      status: "pending",
      reason: "",
    },
    recommendationAudits,
    assetAudits,
    sourceAudits,
    blindComparisons: OAI_T9_ACCEPTANCE_CASES.map((testCase) => ({
      caseId: testCase.id,
      preferredSide: "pending",
      notes: "",
    })),
  };
}

function expectedSampleKeys() {
  return OAI_T9_ACCEPTANCE_CASES.flatMap((testCase) =>
    [1, 2, 3].map((run) => `${testCase.id}:${run}`),
  );
}

function classifyTerminalDecision({
  measurementFailures,
  routeFailures,
  recommendationFailures,
  evidenceFailures,
  assetSafetyFailures,
  pendingManualReview,
}) {
  if (measurementFailures.length > 0) {
    return "invalid_sample_stop_for_architecture_decision";
  }
  if (pendingManualReview.length > 0) return "needs_manual_review";
  const nonAssetFailures = [
    ...routeFailures,
    ...recommendationFailures,
    ...evidenceFailures,
  ];
  if (nonAssetFailures.length === 0 && assetSafetyFailures.length > 0) {
    return "asset_safety_only_disable_assets_keep_recommendations";
  }
  if (nonAssetFailures.length > 0) {
    return "single_call_architecture_no_go";
  }
  return "all_gates_pass_promotion_eligible_separate_approval";
}

export function analyzeOaiT9Acceptance({
  fixtures,
  manualReview,
  blindKey,
} = {}) {
  const sample = array(fixtures);
  const measurementFailures = [];
  const routeFailures = [];
  const recommendationFailures = [];
  const evidenceFailures = [];
  const assetSafetyFailures = [];
  const pendingManualReview = [];
  const fixtureByKey = new Map();
  const scoresByCase = new Map();
  let totalStandardEstimatedCostUsd = 0;
  let totalConservativeCostUpperBoundUsd = 0;
  let totalWallClockMs = 0;
  const totals = {
    creates: 0,
    hostedSearches: 0,
    retrieves: 0,
    safetyCancels: 0,
    serperShoppingRequests: 0,
    serperOrganicRequests: 0,
    candidatePageFetches: 0,
    selectedImageRetrievals: 0,
  };

  for (const fixture of sample) {
    const key = runKey(fixture);
    if (!expectedSampleKeys().includes(key)) {
      measurementFailures.push(`unknown_run:${key || "missing"}`);
      continue;
    }
    if (fixtureByKey.has(key)) {
      measurementFailures.push(`duplicate_run:${key}`);
      continue;
    }
    fixtureByKey.set(key, fixture);
  }
  for (const key of expectedSampleKeys()) {
    if (!fixtureByKey.has(key)) measurementFailures.push(`missing_run:${key}`);
  }
  if (sample.length !== 12) {
    measurementFailures.push(`sample_size_mismatch:${sample.length}`);
  }

  const commits = unique(
    sample.map((fixture) => fixture.commit).filter((value) =>
      /^[a-f0-9]{40}$/i.test(String(value)),
    ),
  );
  if (commits.length !== 1) {
    measurementFailures.push("sample_commit_not_pinned");
  }

  for (const [key, fixture] of fixtureByKey) {
    const testCase = caseById(fixture.caseId);
    const benchmark = benchmarkById(testCase?.goldId);
    if (!testCase || !benchmark) {
      measurementFailures.push(`missing_contract:${key}`);
      continue;
    }
    if (fixture.acceptanceVersion !== OAI_T9_ACCEPTANCE_VERSION) {
      measurementFailures.push(`acceptance_version_mismatch:${key}`);
    }
    if (fixture.promptVersion !== DIRECT_TERRA_PROMPT_VERSION) {
      measurementFailures.push(`prompt_version_mismatch:${key}`);
    }
    if (
      fixture.modelRequested !== DIRECT_TERRA_COMPARISON_MODEL ||
      fixture.modelReturned !== DIRECT_TERRA_COMPARISON_MODEL
    ) {
      routeFailures.push(`model_mismatch:${key}`);
    }
    if (fixture.route?.status !== 200 || fixture.route?.state !== "completed") {
      routeFailures.push(`route_not_completed:${key}`);
    }
    if (!Number.isFinite(fixture.wallClockMs) || fixture.wallClockMs <= 0) {
      measurementFailures.push(`wall_clock_missing:${key}`);
    } else {
      totalWallClockMs += fixture.wallClockMs;
    }
    for (const counter of Object.keys(totals)) {
      const value = Number(fixture.counters?.[counter]);
      if (!Number.isInteger(value) || value < 0) {
        measurementFailures.push(`counter_missing:${key}:${counter}`);
      } else {
        totals[counter] += value;
      }
    }
    if (fixture.counters?.creates !== 1) {
      routeFailures.push(`create_count_mismatch:${key}`);
    }
    if (fixture.counters?.hostedSearches > 20) {
      routeFailures.push(`hosted_search_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.retrieves > 60) {
      routeFailures.push(`retrieve_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.safetyCancels > 1) {
      routeFailures.push(`cancel_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.serperShoppingRequests > 5) {
      routeFailures.push(`shopping_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.serperOrganicRequests > 8) {
      routeFailures.push(`organic_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.candidatePageFetches > 5) {
      routeFailures.push(`page_fetch_ceiling_exceeded:${key}`);
    }
    if (fixture.counters?.selectedImageRetrievals > 5) {
      routeFailures.push(`image_retrieval_ceiling_exceeded:${key}`);
    }

    totalStandardEstimatedCostUsd += estimateOaiT9SolCost(fixture.usage);
    totalConservativeCostUpperBoundUsd += estimateOaiT9SolCost(fixture.usage, {
      conservative: true,
    });

    const score = scoreDirectTerraRunProspective({
      reportMarkdown: fixture.reportMarkdown,
      priceEstimates: array(fixture.priceEstimates),
      goldEntry: benchmark,
      coversLeader: coversLeaderProspective07d,
    });
    const caseScores = scoresByCase.get(testCase.id) ?? [];
    caseScores.push(score);
    scoresByCase.set(testCase.id, caseScores);

    if (
      score.rankedCount < OAI_T9_ACCEPTANCE_BARS.minimumRankedProductsPerRun ||
      score.rankedCount > OAI_T9_ACCEPTANCE_BARS.maximumRankedProductsPerRun
    ) {
      routeFailures.push(`ranked_count_out_of_bounds:${key}`);
    }
    if (score.wrongTypeHits.length > 0) {
      recommendationFailures.push(`wrong_type:${key}`);
    }
    if ((score.constraint?.budgetViolations.length ?? 0) > 0) {
      recommendationFailures.push(`budget_violation:${key}`);
    }

    const candidateSlate = fixture.firstLoss?.recommendation?.candidateSlate;
    const rankedCandidates =
      candidateSlate?.status === "structured_v1"
        ? array(candidateSlate.entries)
            .filter((entry) => entry.disposition === "ranked")
            .sort((left, right) => left.finalRank - right.finalRank)
        : [];
    if (
      !candidateSlate ||
      candidateSlate.status !== "structured_v1" ||
      array(candidateSlate.entries).length < 8 ||
      array(candidateSlate.entries).length > 15 ||
      rankedCandidates.length !== score.rankedCount ||
      rankedCandidates.some(
        (entry, index) => entry.finalRank !== index + 1,
      )
    ) {
      routeFailures.push(`candidate_slate_inconsistent:${key}`);
    }
    for (const candidate of rankedCandidates) {
      if (
        array(candidate.requirementVerdicts).some(
          (verdict) => verdict.verdict === "fail",
        )
      ) {
        recommendationFailures.push(
          `ranked_requirement_failed:${key}:rank-${candidate.finalRank}`,
        );
      }
      if (
        testCase.kind === "constrained" &&
        candidate.finalRank === 1 &&
        array(candidate.requirementVerdicts).some(
          (verdict) => verdict.verdict !== "pass",
        )
      ) {
        recommendationFailures.push(
          `constrained_best_match_not_pass:${key}:rank-${candidate.finalRank}`,
        );
      }
    }

    if (fixture.firstLoss?.rankedProducts?.accountingComplete !== true) {
      evidenceFailures.push(`ranked_product_accounting_incomplete:${key}`);
    }
    if (
      fixture.firstLoss?.rankedProducts?.rankedProductCount !==
      score.rankedCount
    ) {
      evidenceFailures.push(`ranked_product_accounting_count_mismatch:${key}`);
    }
    if (
      array(fixture.productAssets).length !== score.rankedCount ||
      array(fixture.productAssets).some(
        (asset, index) =>
          asset.rank !== index + 1 ||
          asset.productName !== score.rankedProducts[index]?.name,
      )
    ) {
      evidenceFailures.push(`asset_output_identity_mismatch:${key}`);
    }
  }

  for (const [counter, maximum] of Object.entries({
    creates: OAI_T9_ACCEPTANCE_ENVELOPE.responsesCreates,
    hostedSearches: OAI_T9_ACCEPTANCE_ENVELOPE.hostedSearches,
    retrieves: OAI_T9_ACCEPTANCE_ENVELOPE.retrieves,
    safetyCancels: OAI_T9_ACCEPTANCE_ENVELOPE.safetyCancels,
    serperShoppingRequests:
      OAI_T9_ACCEPTANCE_ENVELOPE.serperShoppingRequests,
    serperOrganicRequests: OAI_T9_ACCEPTANCE_ENVELOPE.serperOrganicRequests,
    candidatePageFetches: OAI_T9_ACCEPTANCE_ENVELOPE.candidatePageFetches,
    selectedImageRetrievals:
      OAI_T9_AUDIT_ALLOWANCE.selectedImageRetrievals,
  })) {
    if (totals[counter] > maximum) {
      routeFailures.push(`global_ceiling_exceeded:${counter}`);
    }
  }
  if (
    totalConservativeCostUpperBoundUsd >
    OAI_T9_SOL_PRICING.hardCeilingUsd
  ) {
    routeFailures.push("cost_ceiling_exceeded");
  }

  const stability = [];
  for (const testCase of OAI_T9_ACCEPTANCE_CASES) {
    const scores = scoresByCase.get(testCase.id) ?? [];
    if (scores.length !== 3) continue;
    const caseStability = scoreDirectTerraCaseStability(scores);
    const productPairwiseJaccard = pairwiseJaccard(
      scores.map((score) => score.identityKeys),
    );
    stability.push({
      caseId: testCase.id,
      recallCounts: caseStability.recallCounts,
      recallMean: caseStability.recallMean,
      productPairwiseJaccard,
    });
    if (
      productPairwiseJaccard.some(
        (value) =>
          value <
          OAI_T9_ACCEPTANCE_BARS.minimumEveryPairwiseProductJaccard,
      )
    ) {
      recommendationFailures.push(`stability_failed:${testCase.id}`);
    }
    if (testCase.kind === "broad") {
      if (
        caseStability.recallCounts.some(
          (value) =>
            value < OAI_T9_ACCEPTANCE_BARS.broadLeaderRunMinimum,
        )
      ) {
        recommendationFailures.push("broad_recall_run_minimum_failed");
      }
      if (
        caseStability.recallMean <
        OAI_T9_ACCEPTANCE_BARS.broadLeaderMeanMinimum
      ) {
        recommendationFailures.push("broad_recall_mean_failed");
      }
    }
  }

  const recommendationRows = mapUniqueRows(
    manualReview?.recommendationAudits,
    (row) => row?.key,
    measurementFailures,
    "duplicate_recommendation_audit",
  );
  const assetRows = mapUniqueRows(
    manualReview?.assetAudits,
    (row) => row?.key,
    measurementFailures,
    "duplicate_asset_audit",
  );
  const sourceRows = mapUniqueRows(
    manualReview?.sourceAudits,
    (row) => row?.key,
    measurementFailures,
    "duplicate_source_audit",
  );
  if (
    manualReview &&
    manualReview.schemaVersion !== "oai-t9-manual-review-v1"
  ) {
    measurementFailures.push("manual_review_version_mismatch");
  }

  const expectedRecommendationRows = new Map();
  const expectedAssetRows = new Map();
  const expectedSourceRows = new Map();
  for (const fixture of fixtureByKey.values()) {
    const ranked = parseRankedProducts(fixture.reportMarkdown);
    const assets = new Map(
      array(fixture.productAssets).map((asset) => [asset.rank, asset]),
    );
    for (const product of ranked) {
      const keyForProduct = productKey(
        fixture.caseId,
        fixture.run,
        product.rank,
      );
      expectedRecommendationRows.set(keyForProduct, product.name);
      const asset = assets.get(product.rank);
      if (asset?.productUrl || asset?.imageUrl) {
        expectedAssetRows.set(keyForProduct, product.name);
      }
    }
    for (const product of ranked.slice(0, 2)) {
      expectedSourceRows.set(
        productKey(fixture.caseId, fixture.run, product.rank),
        product.name,
      );
    }
  }
  for (const [label, rows, expected] of [
    ["recommendation", recommendationRows, expectedRecommendationRows],
    ["asset", assetRows, expectedAssetRows],
    ["source", sourceRows, expectedSourceRows],
  ]) {
    for (const [key, row] of rows) {
      if (!expected.has(key) || row.productName !== expected.get(key)) {
        measurementFailures.push(`unexpected_${label}_audit:${key}`);
      }
    }
  }

  for (const fixture of fixtureByKey.values()) {
    const testCase = caseById(fixture.caseId);
    if (!testCase) continue;
    const ranked = parseRankedProducts(fixture.reportMarkdown);
    const assetByRank = new Map(
      array(fixture.productAssets).map((asset) => [asset.rank, asset]),
    );
    for (const product of ranked) {
      const keyForProduct = productKey(
        testCase.id,
        fixture.run,
        product.rank,
      );
      const recommendationAudit = recommendationRows.get(keyForProduct);
      if (!recommendationAudit) {
        pendingManualReview.push(`recommendation_audit:${keyForProduct}`);
      } else {
        if (recommendationAudit.identityAndType === "pending") {
          pendingManualReview.push(`recommendation_audit:${keyForProduct}`);
        } else if (recommendationAudit.identityAndType !== "pass") {
          recommendationFailures.push(
            `manual_identity_or_type_failed:${keyForProduct}`,
          );
        }
        if (testCase.kind === "constrained") {
          if (recommendationAudit.hardRequirements === "pending") {
            pendingManualReview.push(
              `hard_requirement_audit:${keyForProduct}`,
            );
          } else if (
            recommendationAudit.hardRequirements === "fail" ||
            (product.rank === 1 &&
              recommendationAudit.hardRequirements !== "pass") ||
            !["pass", "needs_verification"].includes(
              recommendationAudit.hardRequirements,
            )
          ) {
            recommendationFailures.push(
              `manual_hard_requirement_failed:${keyForProduct}`,
            );
          }
        }
      }

      const asset = assetByRank.get(product.rank);
      if (asset?.productUrl || asset?.imageUrl) {
        const assetAudit = assetRows.get(keyForProduct);
        if (!assetAudit) {
          pendingManualReview.push(`asset_audit:${keyForProduct}`);
        } else {
          if (asset?.productUrl) {
            if (
              assetAudit.destinationIdentity === "pending" ||
              assetAudit.destinationInspected !== true
            ) {
              pendingManualReview.push(
                `destination_audit:${keyForProduct}`,
              );
            } else if (assetAudit.destinationIdentity !== "pass") {
              assetSafetyFailures.push(
                `wrong_destination:${keyForProduct}`,
              );
            }
          }
          if (asset?.imageUrl) {
            const retrievedImage = array(
              fixture.selectedImageChecks,
            ).some(
              (check) =>
                check.rank === product.rank &&
                check.status === "retrieved" &&
                typeof check.fileName === "string",
            );
            if (!retrievedImage) {
              assetSafetyFailures.push(
                `image_not_auditable:${keyForProduct}`,
              );
            } else if (assetAudit.imageIdentity === "pending") {
              pendingManualReview.push(`image_audit:${keyForProduct}`);
            } else if (assetAudit.imageIdentity !== "pass") {
              assetSafetyFailures.push(`wrong_image:${keyForProduct}`);
            }
          }
        }
      }
    }

    for (const product of ranked.slice(0, 2)) {
      const keyForProduct = productKey(
        testCase.id,
        fixture.run,
        product.rank,
      );
      const sourceAudit = sourceRows.get(keyForProduct);
      const eligible = activeSectionUrls(fixture, product);
      if (eligible.length < 2) {
        evidenceFailures.push(
          `top_product_has_fewer_than_two_active_sources:${keyForProduct}`,
        );
        continue;
      }
      if (!sourceAudit || sourceAudit.claimSupport === "pending") {
        pendingManualReview.push(`source_audit:${keyForProduct}`);
        continue;
      }
      const inspected = unique(
        array(sourceAudit.inspectedSourceUrls).filter(isHttpUrl),
      );
      if (
        sourceAudit.claimSupport !== "pass" ||
        inspected.length !== 2 ||
        inspected.some((url) => !eligible.includes(url))
      ) {
        evidenceFailures.push(`manual_claim_support_failed:${keyForProduct}`);
      }
    }
  }
  const measurementStatus = manualReview?.measurementDefect?.status;
  if (!manualReview || measurementStatus === "pending" || !measurementStatus) {
    pendingManualReview.push("measurement_defect_review");
  } else if (measurementStatus === "invalid") {
    measurementFailures.push("human_declared_measurement_defect");
  } else if (measurementStatus !== "none") {
    measurementFailures.push("invalid_measurement_defect_status");
  }

  const blindKeyByCase = mapUniqueRows(
    blindKey?.cases,
    (row) => row?.caseId,
    measurementFailures,
    "duplicate_blind_key",
  );
  if (
    blindKey &&
    (blindKey.schemaVersion !== "oai-t9-blind-comparison-key-v1" ||
      blindKey.commit !== (commits.length === 1 ? commits[0] : null))
  ) {
    measurementFailures.push("blind_key_not_bound_to_sample");
  }
  const blindRows = mapUniqueRows(
    manualReview?.blindComparisons,
    (row) => row?.caseId,
    measurementFailures,
    "duplicate_blind_comparison",
  );
  for (const [caseId] of blindKeyByCase) {
    if (!caseById(caseId)) {
      measurementFailures.push(`unexpected_blind_key:${caseId}`);
    }
  }
  for (const [caseId] of blindRows) {
    if (!caseById(caseId)) {
      measurementFailures.push(`unexpected_blind_comparison:${caseId}`);
    }
  }
  let clearBlindWins = 0;
  for (const testCase of OAI_T9_ACCEPTANCE_CASES) {
    const row = blindRows.get(testCase.id);
    const key = blindKeyByCase.get(testCase.id);
    if (!row || row.preferredSide === "pending") {
      pendingManualReview.push(`blind_comparison:${testCase.id}`);
      continue;
    }
    if (
      !key ||
      !["A", "B"].includes(key.currentSide) ||
      !["A", "B", "tie"].includes(row.preferredSide)
    ) {
      measurementFailures.push(`invalid_blind_comparison:${testCase.id}`);
      continue;
    }
    if (row.preferredSide === key.currentSide) clearBlindWins += 1;
    else if (row.preferredSide !== "tie") {
      recommendationFailures.push(`blind_comparison_loss:${testCase.id}`);
    }
  }
  if (
    pendingManualReview.every(
      (item) => !item.startsWith("blind_comparison:"),
    ) &&
    clearBlindWins < OAI_T9_ACCEPTANCE_BARS.requiredClearBlindWins
  ) {
    recommendationFailures.push("fewer_than_two_clear_blind_wins");
  }

  const destinationPageAuditOpens = array(manualReview?.assetAudits).filter(
    (row) => row?.productUrl && row.destinationInspected === true,
  ).length;
  const sourcePageAuditOpens = array(manualReview?.sourceAudits).reduce(
    (sum, row) =>
      sum + unique(array(row?.inspectedSourceUrls).filter(isHttpUrl)).length,
    0,
  );
  if (
    destinationPageAuditOpens >
    OAI_T9_AUDIT_ALLOWANCE.destinationPageAuditOpens
  ) {
    measurementFailures.push("destination_audit_ceiling_exceeded");
  }
  if (
    sourcePageAuditOpens > OAI_T9_AUDIT_ALLOWANCE.sourcePageAuditOpens
  ) {
    measurementFailures.push("source_audit_ceiling_exceeded");
  }

  const terminalDecision = classifyTerminalDecision({
    measurementFailures: unique(measurementFailures),
    routeFailures: unique(routeFailures),
    recommendationFailures: unique(recommendationFailures),
    evidenceFailures: unique(evidenceFailures),
    assetSafetyFailures: unique(assetSafetyFailures),
    pendingManualReview: unique(pendingManualReview),
  });
  return {
    schemaVersion: "oai-t9-final-acceptance-result-v1",
    terminalDecision,
    failures: {
      measurement: unique(measurementFailures),
      route: unique(routeFailures),
      recommendation: unique(recommendationFailures),
      evidence: unique(evidenceFailures),
      assetSafety: unique(assetSafetyFailures),
    },
    pendingManualReview: unique(pendingManualReview),
    metrics: {
      sampleRuns: sample.length,
      commit: commits.length === 1 ? commits[0] : null,
      totals,
      totalStandardEstimatedCostUsd: Number(
        totalStandardEstimatedCostUsd.toFixed(6),
      ),
      totalConservativeCostUpperBoundUsd: Number(
        totalConservativeCostUpperBoundUsd.toFixed(6),
      ),
      totalWallClockMs,
      stability,
      clearBlindWins,
      manualAuditOpens: {
        destinationPages: destinationPageAuditOpens,
        sourcePages: sourcePageAuditOpens,
      },
      assetCoverage: {
        displayedLinks: sample.reduce(
          (sum, fixture) =>
            sum +
            array(fixture.productAssets).filter((asset) => asset.productUrl)
              .length,
          0,
        ),
        displayedImages: sample.reduce(
          (sum, fixture) =>
            sum +
            array(fixture.productAssets).filter((asset) => asset.imageUrl)
              .length,
          0,
        ),
      },
    },
  };
}

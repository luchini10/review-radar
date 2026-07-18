import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { GOLD, coversLeader } from "./goldBenchmark.mjs";
import { READINESS_REQUESTS } from "./readiness-sample-contract.mjs";

export const TWO_LAYER_QUALITY_GATE_VERSION = "oai-t5-quality-gate-v1";

export const TWO_LAYER_QUALITY_GATE_CASES = [
  {
    id: "broad-shop-vac",
    benchmarkId: "broad-shop-vac",
    shape: "broad",
    runs: 3,
    request: structuredClone(READINESS_REQUESTS.broad),
    expectedRequirementTexts: [
      "Currently available for purchase in the United States",
    ],
    requiredBestMatchRequirementTexts: [
      "Currently available for purchase in the United States",
    ],
  },
  {
    id: "con-robot-vac-300-selfempty",
    benchmarkId: "con-robot-vac-300-selfempty",
    shape: "constrained",
    runs: 3,
    request: structuredClone(READINESS_REQUESTS.constrained),
    expectedRequirementTexts: [
      "Currently available for purchase in the United States",
      "Budget: under $300",
      "self-emptying",
    ],
    requiredBestMatchRequirementTexts: [
      "Currently available for purchase in the United States",
      "Budget: under $300",
      "self-emptying",
    ],
  },
];

export const TWO_LAYER_QUALITY_GATE_BARS = {
  minimumCardsPerRun: 3,
  maximumCardsPerRun: 5,
  broadLeaderMeanMinimum: 4,
  broadLeaderRunMinimum: 3,
  minimumPairwiseJaccard: 0.6,
  maximumHostedSearchCallsPerRun: 20,
  requiredRouteCompletionRate: 1,
  requiredSourceBindingRate: 1,
  allowedUnsafeProductCount: 0,
  allowedUnsafeTransactionalFieldCount: 0,
};

export const TWO_LAYER_QUALITY_GATE_PLANNING = {
  model: "gpt-5.6-terra",
  reasoning: "high",
  responsesCreates: 6,
  maximumHostedSearchCalls: 120,
  retries: 0,
  replacements: 0,
  expectedCostUsdFromT4E: 4.194345,
  proposedHardCeilingUsd: 7,
  expectedSerialMinutesFromT4E: 27.26,
  sourcePageAuditOpens: 24,
  priceDate: "2026-07-15",
};

export const TWO_LAYER_QUALITY_GATE_STOP_RULES = [
  "Stop after the first route, formatter, or presentation failure because 6/6 completion is then impossible.",
  "Stop immediately if a card exposes an unverified transactional field or is an editorial, accessory, wrong-type, or cross-model product.",
  "Do not retry or replace any response inside the window.",
  "If the completed sample fails an absolute quality bar, do not start another correction/retest loop; return to an owner architecture decision.",
];

const STANDARD_RATES = {
  input: 2.5,
  cachedInput: 0.25,
  output: 15,
  webSearch: 0.01,
};
const LONG_CONTEXT_RATES = {
  input: 5,
  cachedInput: 0.5,
  output: 22.5,
  webSearch: 0.01,
};
const LONG_CONTEXT_THRESHOLD = 272_000;

function array(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(String(value)).protocol);
  } catch {
    return false;
  }
}

function normalizedIdentityText(card) {
  const identity = card?.identity || {};
  return [
    identity.brand,
    identity.product_name,
    identity.model,
    identity.variant,
  ]
    .filter(Boolean)
    .join(" ");
}

function identityKey(card) {
  const identity = card?.identity || {};
  return [identity.brand, identity.product_name, identity.model]
    .map((value) =>
      compactText(value)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9+]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .join("|");
}

function normalizedSearchText(value) {
  return ` ${compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function hasWrongType(card, terms) {
  const text = normalizedSearchText(normalizedIdentityText(card));
  return array(terms).some((term) =>
    text.includes(normalizedSearchText(term).trim()),
  );
}

export function twoLayerCardSourceIds(card) {
  return [
    ...array(card?.assessment?.why?.sourceIds),
    ...array(card?.assessment?.bestFor?.sourceIds),
    ...array(card?.assessment?.mainTradeoff?.sourceIds),
    ...array(card?.pros).flatMap((item) => array(item?.sourceIds)),
    ...array(card?.cons).flatMap((item) => array(item?.sourceIds)),
    ...array(card?.requirementChecks).flatMap((item) => array(item?.sourceIds)),
    ...array(card?.claims).flatMap((item) => array(item?.sourceIds)),
  ];
}

function pairwiseJaccard(cardsByRun) {
  const sets = cardsByRun.map(
    (cards) => new Set(cards.map(identityKey).filter(Boolean)),
  );
  const values = [];
  for (let first = 0; first < sets.length; first += 1) {
    for (let second = first + 1; second < sets.length; second += 1) {
      const union = new Set([...sets[first], ...sets[second]]);
      const intersection = [...sets[first]].filter((key) =>
        sets[second].has(key),
      );
      values.push(union.size === 0 ? 0 : intersection.length / union.size);
    }
  }
  return values;
}

function estimateCost(usage) {
  const inputTokens = Number(usage?.inputTokens) || 0;
  const cachedInputTokens = Math.min(
    inputTokens,
    Math.max(0, Number(usage?.cachedInputTokens) || 0),
  );
  const rates =
    inputTokens > LONG_CONTEXT_THRESHOLD
      ? LONG_CONTEXT_RATES
      : STANDARD_RATES;
  return (
    ((inputTokens - cachedInputTokens) / 1_000_000) * rates.input +
    (cachedInputTokens / 1_000_000) * rates.cachedInput +
    ((Number(usage?.outputTokens) || 0) / 1_000_000) * rates.output +
    (Number(usage?.webSearchCalls) || 0) * rates.webSearch
  );
}

function auditKey(value) {
  return `${value?.caseId || ""}:${value?.run || ""}:${value?.productKey || ""}`;
}

function uniquePush(target, value) {
  if (!target.includes(value)) target.push(value);
}

const displayedCurrencyAmountPattern =
  /(?:\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY)\s*(?:[$€£¥]\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|[$€£¥]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY)\b)/i;

function containsDisplayedCurrencyAmount(values) {
  return array(values).some((value) =>
    displayedCurrencyAmountPattern.test(String(value || "")),
  );
}

function researchDisplayValues(card) {
  return [
    card?.identity?.brand,
    card?.identity?.product_name,
    card?.identity?.model,
    card?.identity?.variant,
    card?.assessment?.why?.value,
    card?.assessment?.bestFor?.value,
    card?.assessment?.mainTradeoff?.value,
    ...array(card?.pros).map((item) => item?.value),
    ...array(card?.cons).map((item) => item?.value),
    ...array(card?.requirementChecks).map((item) => item?.explanation),
    ...array(card?.claims).map((item) => item?.value),
  ];
}

export function analyzeTwoLayerQualityGate({ fixtures, manualReview } = {}) {
  const sample = array(fixtures);
  const failures = [];
  const pendingManualReview = [];
  const fixtureByCaseRun = new Map();
  const knownCases = new Map(
    TWO_LAYER_QUALITY_GATE_CASES.map((testCase) => [testCase.id, testCase]),
  );

  for (const fixture of sample) {
    const testCase = knownCases.get(fixture?.caseId);
    if (!testCase) {
      uniquePush(failures, `unknown_case:${fixture?.caseId || "missing"}`);
      continue;
    }
    const key = `${fixture.caseId}:${fixture.run}`;
    if (fixtureByCaseRun.has(key)) {
      uniquePush(failures, `duplicate_run:${key}`);
    } else {
      fixtureByCaseRun.set(key, fixture);
    }
    if (fixture.gateVersion !== TWO_LAYER_QUALITY_GATE_VERSION) {
      uniquePush(failures, `gate_version_mismatch:${key}`);
    }
  }

  for (const testCase of TWO_LAYER_QUALITY_GATE_CASES) {
    for (let run = 1; run <= testCase.runs; run += 1) {
      if (!fixtureByCaseRun.has(`${testCase.id}:${run}`)) {
        uniquePush(failures, `missing_run:${testCase.id}:${run}`);
      }
    }
  }
  if (sample.length !== 6) {
    uniquePush(failures, `sample_size_mismatch:${sample.length}`);
  }

  const commits = new Set(
    sample.map((fixture) => fixture?.commit).filter((value) => typeof value === "string"),
  );
  if (
    commits.size !== 1 ||
    ![...commits].every((value) => /^[a-f0-9]{7,40}$/i.test(value))
  ) {
    uniquePush(failures, "sample_commit_not_pinned");
  }

  let totalWebSearchCalls = 0;
  let estimatedCostUsd = 0;
  let totalWallClockMs = 0;
  let ignoredUnregisteredCitationUrlCount = 0;
  let completedRouteCount = 0;
  let totalCardCount = 0;
  let sourceBoundCardCount = 0;
  let unsafeProductCount = 0;
  let unsafeTransactionalFieldCount = 0;
  const productRows = [];

  for (const fixture of sample) {
    const testCase = knownCases.get(fixture?.caseId);
    if (!testCase) continue;
    const runKey = `${fixture.caseId}:${fixture.run}`;
    const cards = array(fixture.cards);
    const sources = array(fixture.sources);
    const sourceIds = sources.map((source) => source?.id).filter(Boolean);
    const sourceIdSet = new Set(sourceIds);

    if (fixture?.route?.status !== 200 || fixture?.route?.state !== "completed") {
      uniquePush(failures, `route_not_completed:${runKey}`);
    } else {
      completedRouteCount += 1;
    }
    if (fixture?.completion?.modelRequested !== "gpt-5.6-terra") {
      uniquePush(failures, `requested_model_mismatch:${runKey}`);
    }
    if (fixture?.completion?.modelReturned !== "gpt-5.6-terra") {
      uniquePush(failures, `returned_model_mismatch:${runKey}`);
    }
    const webSearchCalls = Number(
      fixture?.completion?.usage?.webSearchCalls,
    );
    if (
      !Number.isInteger(webSearchCalls) ||
      webSearchCalls < 1 ||
      webSearchCalls >
        TWO_LAYER_QUALITY_GATE_BARS.maximumHostedSearchCallsPerRun
    ) {
      uniquePush(failures, `hosted_search_count_out_of_bounds:${runKey}`);
    } else {
      totalWebSearchCalls += webSearchCalls;
    }
    estimatedCostUsd += estimateCost(fixture?.completion?.usage);
    if (!Number.isFinite(fixture?.wallClockMs) || fixture.wallClockMs <= 0) {
      uniquePush(failures, `wall_clock_missing:${runKey}`);
    } else {
      totalWallClockMs += fixture.wallClockMs;
    }

    if (
      fixture?.formatter?.formatterVersion !==
      "oai-two-layer-deterministic-formatter-v2"
    ) {
      uniquePush(failures, `formatter_version_mismatch:${runKey}`);
    }
    if (fixture?.formatter?.recommendationCount !== cards.length) {
      uniquePush(failures, `formatter_card_count_mismatch:${runKey}`);
    }
    if (fixture?.formatter?.ignoredTransactionalSectionCount !== cards.length) {
      uniquePush(
        failures,
        `ignored_transactional_section_count_mismatch:${runKey}`,
      );
    }
    if (
      fixture?.formatter?.registeredSourceCount !== sources.length ||
      fixture?.completion?.sourceCount < sources.length
    ) {
      uniquePush(failures, `source_count_mismatch:${runKey}`);
    }
    const ignoredCount = Number(
      fixture?.formatter?.ignoredUnregisteredCitationUrlCount,
    );
    if (!Number.isInteger(ignoredCount) || ignoredCount < 0) {
      uniquePush(failures, `ignored_citation_count_missing:${runKey}`);
    } else {
      ignoredUnregisteredCitationUrlCount += ignoredCount;
    }
    if (
      new Set(sourceIds).size !== sourceIds.length ||
      sourceIds.length === 0 ||
      sources.some(
        (source) =>
          !compactText(source?.id) ||
          !compactText(source?.label) ||
          !compactText(source?.title) ||
          !isHttpUrl(source?.url),
      )
    ) {
      uniquePush(failures, `source_catalog_invalid:${runKey}`);
    }
    if (
      sources.some((source) =>
        containsDisplayedCurrencyAmount([source?.title]),
      )
    ) {
      uniquePush(failures, `unsafe_transactional_source_title:${runKey}`);
    }
    if (
      cards.length < TWO_LAYER_QUALITY_GATE_BARS.minimumCardsPerRun ||
      cards.length > TWO_LAYER_QUALITY_GATE_BARS.maximumCardsPerRun
    ) {
      uniquePush(failures, `run_card_count_out_of_bounds:${runKey}`);
    }

    cards.forEach((card, index) => {
      totalCardCount += 1;
      const cardKey = `${runKey}:${card?.key || `rank-${index + 1}`}`;
      productRows.push({ fixture, card, cardKey, testCase });
      if (card?.rank !== index + 1) {
        uniquePush(failures, `rank_order_mismatch:${cardKey}`);
      }
      if (!normalizedIdentityText(card).trim()) {
        uniquePush(failures, `product_identity_missing:${cardKey}`);
      }
      if (hasWrongType(card, GOLD.find((item) => item.id === testCase.benchmarkId)?.wrongTypeTerms)) {
        unsafeProductCount += 1;
        uniquePush(failures, `wrong_product_type:${cardKey}`);
      }
      const hasUnsafeTransactionalField =
        card?.commerce?.state !== "not_verified" ||
        card?.commerce?.priceAmount !== null ||
        card?.commerce?.currency !== null ||
        card?.commerce?.seller !== null ||
        card?.commerce?.productUrl !== null ||
        card?.commerce?.availability !== null ||
        card?.image?.state !== "not_verified" ||
        card?.image?.url !== null ||
        /https?:\/\//i.test(JSON.stringify(card)) ||
        containsDisplayedCurrencyAmount(researchDisplayValues(card));
      if (hasUnsafeTransactionalField) {
        unsafeTransactionalFieldCount += 1;
        uniquePush(failures, `unsafe_transactional_field:${cardKey}`);
      }

      const references = twoLayerCardSourceIds(card);
      if (references.length === 0) {
        uniquePush(failures, `product_source_binding_missing:${cardKey}`);
      }
      for (const sourceId of references) {
        if (!sourceIdSet.has(sourceId)) {
          uniquePush(failures, `unknown_source_reference:${cardKey}:${sourceId}`);
        }
      }
      if (
        references.length > 0 &&
        references.every((sourceId) => sourceIdSet.has(sourceId))
      ) {
        sourceBoundCardCount += 1;
      }

      const checks = array(card?.requirementChecks);
      const actualRequirements = checks.map((check) =>
        compactText(check?.requirement),
      );
      if (
        JSON.stringify(actualRequirements) !==
        JSON.stringify(testCase.expectedRequirementTexts)
      ) {
        uniquePush(failures, `requirement_contract_mismatch:${cardKey}`);
      }
      for (const check of checks) {
        if (
          !["Pass", "Fail", "Needs verification"].includes(check?.status) ||
          check?.trust !== "research_synthesis" ||
          check?.label !== "AI research synthesis"
        ) {
          uniquePush(failures, `requirement_trust_state_invalid:${cardKey}`);
        }
      }
      if (card?.recommendationStatus === "Best Match") {
        const requiredBestMatchRequirements = new Set(
          testCase.requiredBestMatchRequirementTexts,
        );
        for (const check of checks) {
          if (
            requiredBestMatchRequirements.has(
              compactText(check?.requirement),
            ) &&
            check?.status !== "Pass"
          ) {
            uniquePush(
              failures,
              `best_match_requirement_not_pass:${cardKey}:${compactText(check?.requirement)}`,
            );
          }
        }
      }
    });
  }

  const routeCompletionRate = sample.length
    ? completedRouteCount / sample.length
    : 0;
  const sourceBindingRate = totalCardCount
    ? sourceBoundCardCount / totalCardCount
    : 0;
  if (
    routeCompletionRate <
    TWO_LAYER_QUALITY_GATE_BARS.requiredRouteCompletionRate
  ) {
    uniquePush(failures, "route_completion_rate_failed");
  }
  if (
    sourceBindingRate < TWO_LAYER_QUALITY_GATE_BARS.requiredSourceBindingRate
  ) {
    uniquePush(failures, "source_binding_rate_failed");
  }
  if (
    unsafeProductCount > TWO_LAYER_QUALITY_GATE_BARS.allowedUnsafeProductCount
  ) {
    uniquePush(failures, "unsafe_product_count_exceeded");
  }
  if (
    unsafeTransactionalFieldCount >
    TWO_LAYER_QUALITY_GATE_BARS.allowedUnsafeTransactionalFieldCount
  ) {
    uniquePush(failures, "unsafe_transactional_field_count_exceeded");
  }
  if (
    estimatedCostUsd >
    TWO_LAYER_QUALITY_GATE_PLANNING.proposedHardCeilingUsd
  ) {
    uniquePush(failures, "estimated_cost_ceiling_exceeded");
  }

  const broadCase = TWO_LAYER_QUALITY_GATE_CASES.find(
    (item) => item.shape === "broad",
  );
  const broadBenchmark = GOLD.find(
    (item) => item.id === broadCase?.benchmarkId,
  );
  const broadRuns = [1, 2, 3].map(
    (run) => array(fixtureByCaseRun.get(`${broadCase.id}:${run}`)?.cards),
  );
  const broadRecallPerRun = broadRuns.map((cards) =>
    array(broadBenchmark?.coreLeaders).filter((leader) =>
      cards.some((card) => coversLeader(normalizedIdentityText(card), leader)),
    ).length,
  );
  const broadRecallMean = broadRecallPerRun.length
    ? broadRecallPerRun.reduce((sum, value) => sum + value, 0) /
      broadRecallPerRun.length
    : 0;
  if (
    broadRecallPerRun.some(
      (value) => value < TWO_LAYER_QUALITY_GATE_BARS.broadLeaderRunMinimum,
    )
  ) {
    uniquePush(failures, "broad_leader_run_minimum_failed");
  }
  if (broadRecallMean < TWO_LAYER_QUALITY_GATE_BARS.broadLeaderMeanMinimum) {
    uniquePush(failures, "broad_leader_mean_failed");
  }

  const stability = TWO_LAYER_QUALITY_GATE_CASES.map((testCase) => {
    const cardsByRun = [1, 2, 3].map((run) =>
      array(fixtureByCaseRun.get(`${testCase.id}:${run}`)?.cards),
    );
    const values = pairwiseJaccard(cardsByRun);
    if (
      values.some(
        (value) =>
          value < TWO_LAYER_QUALITY_GATE_BARS.minimumPairwiseJaccard,
      )
    ) {
      uniquePush(failures, `stability_failed:${testCase.id}`);
    }
    return {
      caseId: testCase.id,
      pairwiseJaccard: values.map((value) => Number(value.toFixed(4))),
    };
  });

  const productAudits = new Map(
    array(manualReview?.productAudits).map((audit) => [auditKey(audit), audit]),
  );
  const sourceAudits = new Map(
    array(manualReview?.sourceAudits).map((audit) => [auditKey(audit), audit]),
  );
  for (const { fixture, card, cardKey, testCase } of productRows) {
    const key = auditKey({
      caseId: fixture.caseId,
      run: fixture.run,
      productKey: card.key,
    });
    const audit = productAudits.get(key);
    if (!audit) {
      uniquePush(pendingManualReview, `product_audit:${key}`);
    } else {
      if (audit.eligibility !== "pass") {
        uniquePush(failures, `manual_product_eligibility_failed:${cardKey}`);
      }
      if (
        testCase.shape === "constrained" &&
        card.recommendationStatus === "Best Match" &&
        audit.requirementAccuracy !== "pass"
      ) {
        uniquePush(failures, `manual_requirement_accuracy_failed:${cardKey}`);
      }
    }
  }

  for (const fixture of sample) {
    for (const card of array(fixture?.cards).slice(0, 2)) {
      const key = auditKey({
        caseId: fixture.caseId,
        run: fixture.run,
        productKey: card.key,
      });
      const audit = sourceAudits.get(key);
      const registeredSourceIds = new Set(
        array(fixture?.sources).map((source) => source?.id).filter(Boolean),
      );
      const auditableSourceIds = [
        ...new Set(
          twoLayerCardSourceIds(card).filter((sourceId) =>
            registeredSourceIds.has(sourceId),
          ),
        ),
      ];
      if (auditableSourceIds.length < 2) {
        uniquePush(failures, `source_audit_evidence_insufficient:${key}`);
      }
      if (!audit) {
        uniquePush(pendingManualReview, `source_audit:${key}`);
      } else {
        const inspectedSourceIds = array(audit.sourceIds);
        if (
          inspectedSourceIds.length !== 2 ||
          new Set(inspectedSourceIds).size !== 2 ||
          inspectedSourceIds.some(
            (sourceId) => !auditableSourceIds.includes(sourceId),
          )
        ) {
          uniquePush(failures, `manual_source_selection_invalid:${key}`);
        } else if (audit.status !== "pass") {
          uniquePush(failures, `manual_source_support_failed:${key}`);
        }
      }
    }
  }

  const comparisonRows = array(manualReview?.blindComparisons);
  const comparisonCounts = new Map();
  for (const comparison of comparisonRows) {
    const caseId = comparison?.caseId;
    if (!knownCases.has(caseId)) {
      uniquePush(failures, `unknown_blind_comparison:${caseId || "missing"}`);
      continue;
    }
    comparisonCounts.set(caseId, (comparisonCounts.get(caseId) || 0) + 1);
    if (comparisonCounts.get(caseId) > 1) {
      uniquePush(failures, `duplicate_blind_comparison:${caseId}`);
    }
  }
  const comparisons = new Map(
    comparisonRows
      .filter((comparison) => knownCases.has(comparison?.caseId))
      .map((comparison) => [comparison.caseId, comparison]),
  );
  let comparisonWins = 0;
  let comparisonPending = false;
  for (const testCase of TWO_LAYER_QUALITY_GATE_CASES) {
    const comparison = comparisons.get(testCase.id);
    if (!comparison) {
      uniquePush(pendingManualReview, `blind_comparison:${testCase.id}`);
      comparisonPending = true;
      continue;
    }
    if (comparison.result === "loss") {
      uniquePush(failures, `blind_comparison_loss:${testCase.id}`);
    } else if (comparison.result === "win") {
      comparisonWins += 1;
    } else if (comparison.result !== "tie") {
      uniquePush(pendingManualReview, `blind_comparison:${testCase.id}`);
      comparisonPending = true;
    }
  }
  if (!comparisonPending && comparisonWins === 0) {
    uniquePush(failures, "no_material_quality_win");
  }

  return {
    version: TWO_LAYER_QUALITY_GATE_VERSION,
    decision:
      failures.length > 0
        ? "fail"
        : pendingManualReview.length > 0
          ? "needs_manual_review"
          : "pass",
    failures,
    pendingManualReview,
    metrics: {
      totalCreates: sample.length,
      totalWebSearchCalls,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
      meanWallClockMs:
        sample.length > 0 ? Math.round(totalWallClockMs / sample.length) : 0,
      ignoredUnregisteredCitationUrlCount,
      routeCompletionRate: Number(routeCompletionRate.toFixed(4)),
      sourceBindingRate: Number(sourceBindingRate.toFixed(4)),
      unsafeProductCount,
      unsafeTransactionalFieldCount,
      broadLeaderRecall: {
        perRun: broadRecallPerRun,
        mean: Number(broadRecallMean.toFixed(4)),
      },
      stability,
    },
  };
}

function isMainModule() {
  return Boolean(
    process.argv[1] &&
      pathToFileURL(resolve(process.argv[1])).href === import.meta.url,
  );
}

if (isMainModule()) {
  const inputIndex = process.argv.indexOf("--input");
  if (inputIndex < 0 || !process.argv[inputIndex + 1]) {
    console.log(
      JSON.stringify(
        {
          version: TWO_LAYER_QUALITY_GATE_VERSION,
          cases: TWO_LAYER_QUALITY_GATE_CASES,
          bars: TWO_LAYER_QUALITY_GATE_BARS,
          planning: TWO_LAYER_QUALITY_GATE_PLANNING,
          stopRules: TWO_LAYER_QUALITY_GATE_STOP_RULES,
        },
        null,
        2,
      ),
    );
  } else {
    const input = JSON.parse(
      readFileSync(resolve(process.argv[inputIndex + 1]), "utf8"),
    );
    console.log(JSON.stringify(analyzeTwoLayerQualityGate(input), null, 2));
  }
}

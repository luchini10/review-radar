export const OAI_T10_PHASE_D_CASE = Object.freeze({
  id: "broad-shop-vac",
  shopperRequest: Object.freeze({ query: "shop vac" }),
});

export const OAI_T10_PHASE_D_CEILINGS = Object.freeze({
  openAiCreates: 2,
  hostedSearches: 10,
  openAiRetrieves: 60,
  safetyCancels: 1,
  serperShoppingAttempts: 15,
  sourcePageFetches: 30,
  sourcePageHttpAttempts: 90,
  hardCeilingUsd: 3,
});

export const OAI_T10_TERRA_APPROVAL_PRICING_AS_OF_2026_07_25 = Object.freeze({
  asOf: "2026-07-25",
  purpose: "frozen_approval_envelope",
  source: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  longContextThresholdInputTokens: 272_000,
  shortContext: Object.freeze({
    inputPerMillionUsd: 2.5,
    cachedInputPerMillionUsd: 0.25,
    outputPerMillionUsd: 15,
  }),
  longContext: Object.freeze({
    inputPerMillionUsd: 5,
    cachedInputPerMillionUsd: 0.5,
    outputPerMillionUsd: 22.5,
  }),
  cacheWriteMultiplier: 1.25,
  webSearchCallUsd: 0.01,
});

export const OAI_T10_TERRA_CURRENT_PRICING_AS_OF_2026_08_29 = Object.freeze({
  asOf: "2026-08-29",
  purpose: "dated_current_estimate",
  billingMode: "standard_non_regional",
  sources: Object.freeze([
    "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
    "https://developers.openai.com/api/docs/pricing",
  ]),
  longContextThresholdInputTokens: 272_000,
  shortContext: Object.freeze({
    inputPerMillionUsd: 2,
    cachedInputPerMillionUsd: 0.2,
    outputPerMillionUsd: 12,
  }),
  longContext: Object.freeze({
    inputPerMillionUsd: 4,
    cachedInputPerMillionUsd: 0.4,
    outputPerMillionUsd: 18,
  }),
  cacheWriteMultiplier: 1.25,
  webSearchCallUsd: 0.01,
});

function argument(args, name) {
  return (
    args
      .find((value) => value.startsWith(`--${name}=`))
      ?.slice(name.length + 3) ?? ""
  );
}

function numericArgument(args, name) {
  const value = Number(argument(args, name));
  return Number.isFinite(value) ? value : Number.NaN;
}

export function phaseDPlan(commit) {
  return {
    schemaVersion: "oai-t10-phase-d-plan-v2",
    phase: "OAI-T10 Phase D",
    mode: "dry-run",
    commit,
    case: OAI_T10_PHASE_D_CASE,
    model: "gpt-5.6-terra",
    researchReasoning: "high",
    presentationReasoning: "medium",
    ceilings: OAI_T10_PHASE_D_CEILINGS,
    pricing: {
      approvalEnvelope: OAI_T10_TERRA_APPROVAL_PRICING_AS_OF_2026_07_25,
      currentEstimate: OAI_T10_TERRA_CURRENT_PRICING_AS_OF_2026_08_29,
    },
    networkPolicy: {
      openAiResponses: true,
      openAiHostedWebSearch: true,
      serperShopping: true,
      dnsPinnedResponseOwnedSourcePages: true,
      retries: false,
      replacements: false,
      fallbacks: false,
      serperOrganic: false,
      searchApi: false,
      additionalCases: false,
      flagPromotion: false,
      deployment: false,
    },
  };
}

export function validatePhaseDLiveApproval({
  args,
  commit,
  trackedChanges,
  outputExists,
  environment,
}) {
  const approved = {
    commit: argument(args, "approved-commit"),
    openAiCreates: numericArgument(args, "approved-openai-creates"),
    hostedSearches: numericArgument(args, "approved-hosted-searches"),
    openAiRetrieves: numericArgument(args, "approved-openai-retrieves"),
    safetyCancels: numericArgument(args, "approved-safety-cancels"),
    serperShoppingAttempts: numericArgument(
      args,
      "approved-serper-shopping-attempts",
    ),
    sourcePageFetches: numericArgument(args, "approved-source-page-fetches"),
    sourcePageHttpAttempts: numericArgument(
      args,
      "approved-source-page-http-attempts",
    ),
    hardCeilingUsd: numericArgument(args, "approved-dollar-ceiling"),
  };
  if (approved.commit !== commit) {
    throw new Error("Live approval is not pinned to the current full commit.");
  }
  for (const [key, expected] of Object.entries(OAI_T10_PHASE_D_CEILINGS)) {
    if (approved[key] !== expected) {
      throw new Error(`Live approval does not match the frozen ${key} ceiling.`);
    }
  }
  if (trackedChanges.length > 0) {
    throw new Error("Tracked worktree changes exist; refusing an unpinned run.");
  }
  if (outputExists) {
    throw new Error("Phase D evidence already exists; refusing a retry.");
  }
  if (!environment.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured in this process.");
  }
  if (!environment.SERPER_API_KEY?.trim()) {
    throw new Error("SERPER_API_KEY is not configured in this process.");
  }
  return approved;
}

export function validatePhaseDCreateRequest(body, createNumber) {
  if (
    createNumber === 1 &&
    (body?.model !== "gpt-5.6-terra" ||
      body.background !== true ||
      body.reasoning?.effort !== "high" ||
      body.max_tool_calls !== OAI_T10_PHASE_D_CEILINGS.hostedSearches)
  ) {
    throw new Error("Research request drifted from the frozen contract.");
  }
  if (
    createNumber === 2 &&
    (body?.model !== "gpt-5.6-terra" ||
      body.background !== false ||
      body.reasoning?.effort !== "medium" ||
      "tools" in body ||
      "previous_response_id" in body)
  ) {
    throw new Error(
      "Presentation request drifted from the frozen no-web contract.",
    );
  }
  if (createNumber !== 1 && createNumber !== 2) {
    throw new Error("Unexpected OpenAI create number.");
  }
}

function usageFromLedger(ledger) {
  const usage = ledger?.usage ?? {};
  return {
    inputTokens: Math.max(0, Number(usage.inputTokens) || 0),
    cachedInputTokens: Math.max(0, Number(usage.cachedInputTokens) || 0),
    outputTokens: Math.max(0, Number(usage.outputTokens) || 0),
    webSearchCalls: Math.max(0, Number(usage.webSearchCalls) || 0),
  };
}

function mergeUsage(left, right) {
  return {
    inputTokens: Math.max(left.inputTokens, right.inputTokens),
    cachedInputTokens: Math.max(
      left.cachedInputTokens,
      right.cachedInputTokens,
    ),
    outputTokens: Math.max(left.outputTokens, right.outputTokens),
    webSearchCalls: Math.max(left.webSearchCalls, right.webSearchCalls),
  };
}

function publishedUsageCost(usage, pricing) {
  const rates =
    usage.inputTokens > pricing.longContextThresholdInputTokens
      ? pricing.longContext
      : pricing.shortContext;
  const cached = Math.min(usage.inputTokens, usage.cachedInputTokens);
  const uncached = usage.inputTokens - cached;
  return (
    (uncached / 1_000_000) * rates.inputPerMillionUsd +
    (cached / 1_000_000) * rates.cachedInputPerMillionUsd +
    (usage.outputTokens / 1_000_000) * rates.outputPerMillionUsd +
    usage.webSearchCalls * pricing.webSearchCallUsd
  );
}

function conservativeCacheWriteCost(usage, pricing) {
  const rates =
    usage.inputTokens > pricing.longContextThresholdInputTokens
      ? pricing.longContext
      : pricing.shortContext;
  return (
    (usage.inputTokens / 1_000_000) *
      rates.inputPerMillionUsd *
      pricing.cacheWriteMultiplier +
    (usage.outputTokens / 1_000_000) * rates.outputPerMillionUsd +
    usage.webSearchCalls * pricing.webSearchCallUsd
  );
}

export function estimatePhaseDCost(diagnostics) {
  const terminalByOperation = new Map();
  let duplicateTerminalLedgerCount = 0;
  for (const diagnostic of diagnostics) {
    if (
      !["completed", "failed"].includes(diagnostic?.outcome) ||
      !["research_poll", "presentation"].includes(diagnostic?.stage) ||
      !diagnostic?.ledger
    ) {
      continue;
    }
    const operation = ["research_poll", "presentation"].includes(
      diagnostic.ledger.operation,
    )
      ? diagnostic.ledger.operation
      : diagnostic.stage;
    const next = {
      outcome: diagnostic.outcome,
      responseIdHash:
        typeof diagnostic.ledger.responseIdHash === "string" &&
        diagnostic.ledger.responseIdHash.length > 0
          ? diagnostic.ledger.responseIdHash
          : null,
      usage: usageFromLedger(diagnostic.ledger),
    };
    const existing = terminalByOperation.get(operation) ?? [];
    if (existing.length === 0) {
      terminalByOperation.set(operation, [next]);
      continue;
    }
    duplicateTerminalLedgerCount += 1;
    const sameResponseIndex = next.responseIdHash
      ? existing.findIndex(
          (entry) => entry.responseIdHash === next.responseIdHash,
        )
      : -1;
    if (sameResponseIndex < 0) {
      existing.push(next);
      terminalByOperation.set(operation, existing);
      continue;
    }
    const sameResponse = existing[sameResponseIndex];
    existing[sameResponseIndex] = {
      outcome:
        sameResponse.outcome === "completed" && next.outcome === "completed"
          ? "completed"
          : "failed",
      responseIdHash: sameResponse.responseIdHash,
      usage: mergeUsage(sameResponse.usage, next.usage),
    };
    terminalByOperation.set(operation, existing);
  }
  const accountedLedgers = [...terminalByOperation.values()].flat();
  let approvalEnvelopeUsd = 0;
  let approvalEnvelopeConservativeUsd = 0;
  let currentEstimateUsd = 0;
  const totals = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    webSearchCalls: 0,
  };
  for (const { usage } of accountedLedgers) {
    approvalEnvelopeUsd += publishedUsageCost(
      usage,
      OAI_T10_TERRA_APPROVAL_PRICING_AS_OF_2026_07_25,
    );
    approvalEnvelopeConservativeUsd += conservativeCacheWriteCost(
      usage,
      OAI_T10_TERRA_APPROVAL_PRICING_AS_OF_2026_07_25,
    );
    currentEstimateUsd += publishedUsageCost(
      usage,
      OAI_T10_TERRA_CURRENT_PRICING_AS_OF_2026_08_29,
    );
    for (const key of Object.keys(totals)) totals[key] += usage[key];
  }
  return {
    accountedLedgerCount: accountedLedgers.length,
    completedLedgerCount: accountedLedgers.filter(
      (ledger) => ledger.outcome === "completed",
    ).length,
    duplicateTerminalLedgerCount,
    usage: totals,
    pricingBasis: {
      approvalEnvelopeAsOf:
        OAI_T10_TERRA_APPROVAL_PRICING_AS_OF_2026_07_25.asOf,
      currentEstimateAsOf:
        OAI_T10_TERRA_CURRENT_PRICING_AS_OF_2026_08_29.asOf,
    },
    approvalEnvelopeUsd: Number(approvalEnvelopeUsd.toFixed(6)),
    approvalEnvelopeConservativeUsd: Number(
      approvalEnvelopeConservativeUsd.toFixed(6),
    ),
    currentEstimateUsd: Number(currentEstimateUsd.toFixed(6)),
  };
}

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

export const OAI_T10_TERRA_PRICING_AS_OF_2026_07_25 = Object.freeze({
  source: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  longContextThresholdInputTokens: 272_000,
  standard: Object.freeze({
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
    schemaVersion: "oai-t10-phase-d-plan-v1",
    phase: "OAI-T10 Phase D",
    mode: "dry-run",
    commit,
    case: OAI_T10_PHASE_D_CASE,
    model: "gpt-5.6-terra",
    researchReasoning: "high",
    presentationReasoning: "medium",
    ceilings: OAI_T10_PHASE_D_CEILINGS,
    pricing: OAI_T10_TERRA_PRICING_AS_OF_2026_07_25,
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

export function estimatePhaseDCost(diagnostics) {
  const completedLedgers = diagnostics
    .filter(
      (diagnostic) =>
        diagnostic?.outcome === "completed" &&
        ["research_poll", "presentation"].includes(diagnostic.stage) &&
        diagnostic.ledger,
    )
    .map((diagnostic) => usageFromLedger(diagnostic.ledger));
  let standardUsd = 0;
  let conservativeUsd = 0;
  const totals = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    webSearchCalls: 0,
  };
  for (const usage of completedLedgers) {
    const rates =
      usage.inputTokens >
      OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.longContextThresholdInputTokens
        ? OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.longContext
        : OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.standard;
    const cached = Math.min(usage.inputTokens, usage.cachedInputTokens);
    const uncached = usage.inputTokens - cached;
    standardUsd +=
      (uncached / 1_000_000) * rates.inputPerMillionUsd +
      (cached / 1_000_000) * rates.cachedInputPerMillionUsd +
      (usage.outputTokens / 1_000_000) * rates.outputPerMillionUsd +
      usage.webSearchCalls *
        OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.webSearchCallUsd;
    conservativeUsd +=
      (usage.inputTokens / 1_000_000) *
        rates.inputPerMillionUsd *
        OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.cacheWriteMultiplier +
      (usage.outputTokens / 1_000_000) * rates.outputPerMillionUsd +
      usage.webSearchCalls *
        OAI_T10_TERRA_PRICING_AS_OF_2026_07_25.webSearchCallUsd;
    for (const key of Object.keys(totals)) totals[key] += usage[key];
  }
  return {
    completedLedgerCount: completedLedgers.length,
    usage: totals,
    standardUsd: Number(standardUsd.toFixed(6)),
    conservativeUsd: Number(conservativeUsd.toFixed(6)),
  };
}

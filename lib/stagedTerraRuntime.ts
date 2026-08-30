import { createHash } from "node:crypto";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseRetrieveParamsNonStreaming,
} from "openai/resources/responses/responses";

import {
  commerceVerificationQuery,
  type CommerceShoppingResult,
} from "./autonomousCommerceVerifier.ts";
import {
  fetchHybridSource,
  LIVE_HYBRID_FETCH_DEPENDENCIES,
  observeHybridSourceHtml,
  type HybridFetchResult,
  type HybridSourceRole,
} from "./autonomousFactVerifier.ts";
import {
  DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
  MAX_DIRECT_TERRA_SHOPPING_RESULTS,
  type DirectTerraSerperShoppingTransport,
} from "./directTerraSerperAssetAdapter.ts";
import {
  extractDirectTerraExactResponseSources,
  extractDirectTerraResponseSources,
} from "./directTerraResponse.ts";
import {
  buildStagedTerraRequestFingerprint,
  type StagedTerraEvidencePackage,
  type StagedTerraResearchCandidate,
  type StagedTerraResearchOutput,
  validateStagedTerraResearchIdentitySources,
  validateStagedTerraPresentationOutput,
  validateStagedTerraResearchOutput,
} from "./stagedTerraContract.ts";
import {
  buildStagedTerraPresentationRequest,
  buildStagedTerraResearchRequest,
  STAGED_TERRA_MODEL,
  STAGED_TERRA_PRESENTATION_PROMPT_VERSION,
  STAGED_TERRA_RESEARCH_PROMPT_VERSION,
} from "./stagedTerraPrompt.ts";
import type {
  StagedTerraCandidateVerificationInput,
  StagedTerraObservedClaim,
} from "./stagedTerraVerifier.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";

export const STAGED_TERRA_RUNTIME_VERSION = "staged-terra-runtime-v8";
export const STAGED_TERRA_RUNTIME_LIMITS = Object.freeze({
  researchTimeoutMs: 120_000,
  presentationTimeoutMs: 120_000,
  maximumSourceFetches: 30,
  maximumSourcesPerCandidate: 2,
  maximumCommerceRequests: 15,
  maximumShoppingRowsPerCandidate: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
});

export type StagedTerraResponsesClient = {
  responses: {
    create: (
      body: ResponseCreateParamsNonStreaming,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
    retrieve: (
      responseId: string,
      query?: ResponseRetrieveParamsNonStreaming,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
    cancel: (
      responseId: string,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

type RuntimeOperation = "research_start" | "research_poll" | "research_cancel" | "presentation";

export type StagedTerraRuntimeLedger = {
  runtimeVersion: typeof STAGED_TERRA_RUNTIME_VERSION;
  operation: RuntimeOperation;
  promptVersion: string;
  modelRequested: string;
  modelReturned: string | null;
  status: string;
  responseIdHash: string | null;
  durationMs: number;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    webSearchCalls: number;
  };
  sourceCount: number;
  failureReason: string | null;
};

export type StagedTerraResearchEvaluationCandidate = Readonly<{
  brand: string;
  productName: string;
  model: string;
  productType: string;
}>;

export type StagedTerraResearchEvaluationSnapshot = Readonly<{
  validatedCandidates: readonly StagedTerraResearchEvaluationCandidate[];
  acceptedCandidates: readonly StagedTerraResearchEvaluationCandidate[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function number(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function responseId(response: unknown) {
  return isRecord(response) && typeof response.id === "string"
    ? response.id
    : null;
}

function researchEvaluationCandidate(
  candidate: StagedTerraResearchCandidate,
): StagedTerraResearchEvaluationCandidate {
  return Object.freeze({
    brand: candidate.brand,
    productName: candidate.productName,
    model: candidate.model,
    productType: candidate.productType,
  });
}

function researchEvaluationSnapshot({
  validatedCandidates,
  acceptedCandidates,
}: {
  validatedCandidates: readonly StagedTerraResearchCandidate[];
  acceptedCandidates: readonly StagedTerraResearchCandidate[];
}): StagedTerraResearchEvaluationSnapshot {
  return Object.freeze({
    validatedCandidates: Object.freeze(
      validatedCandidates.map(researchEvaluationCandidate),
    ),
    acceptedCandidates: Object.freeze(
      acceptedCandidates.map(researchEvaluationCandidate),
    ),
  });
}

function responseStatus(response: unknown) {
  return isRecord(response) && typeof response.status === "string"
    ? response.status
    : "unknown";
}

function outputText(response: unknown) {
  if (!isRecord(response)) return "";
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of array(response.output)) {
    if (!isRecord(item) || item.type !== "message") continue;
    for (const content of array(item.content)) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }
  return "";
}

function containsRefusal(response: unknown) {
  return (
    isRecord(response) &&
    array(response.output).some(
      (item) =>
        isRecord(item) &&
        item.type === "message" &&
        array(item.content).some(
          (content) => isRecord(content) && content.type === "refusal",
        ),
    )
  );
}

function webSearchCalls(response: unknown) {
  return isRecord(response)
    ? array(response.output).filter(
        (item) => isRecord(item) && item.type === "web_search_call",
      ).length
    : 0;
}

function blankLedger(
  operation: RuntimeOperation,
  promptVersion: string,
  trackedResponseId?: string,
): StagedTerraRuntimeLedger {
  return {
    runtimeVersion: STAGED_TERRA_RUNTIME_VERSION,
    operation,
    promptVersion,
    modelRequested: STAGED_TERRA_MODEL,
    modelReturned: null,
    status: "not_started",
    responseIdHash: trackedResponseId
      ? createHash("sha256").update(trackedResponseId).digest("hex")
      : null,
    durationMs: 0,
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      webSearchCalls: 0,
    },
    sourceCount: 0,
    failureReason: null,
  };
}

function recordResponse(ledger: StagedTerraRuntimeLedger, response: unknown) {
  ledger.status = responseStatus(response);
  ledger.modelReturned =
    isRecord(response) && typeof response.model === "string"
      ? response.model
      : null;
  const usage =
    isRecord(response) && isRecord(response.usage) ? response.usage : {};
  const inputDetails = isRecord(usage.input_tokens_details)
    ? usage.input_tokens_details
    : {};
  ledger.usage = {
    inputTokens: number(usage, "input_tokens"),
    cachedInputTokens: number(inputDetails, "cached_tokens"),
    outputTokens: number(usage, "output_tokens"),
    totalTokens: number(usage, "total_tokens"),
    webSearchCalls: webSearchCalls(response),
  };
  ledger.sourceCount = extractDirectTerraResponseSources(response).length;
  const id = responseId(response);
  if (id) ledger.responseIdHash = createHash("sha256").update(id).digest("hex");
}

function failed(
  ledger: StagedTerraRuntimeLedger,
  reason: string,
  startedAt: number,
  now: () => number,
) {
  ledger.failureReason = reason;
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: false as const, reason, ledger };
}

export async function startStagedTerraResearch({
  client,
  shopperRequest,
  now = Date.now,
}: {
  client: StagedTerraResponsesClient;
  shopperRequest: DirectTerraShopperRequest;
  now?: () => number;
}) {
  const ledger = blankLedger(
    "research_start",
    STAGED_TERRA_RESEARCH_PROMPT_VERSION,
  );
  const startedAt = now();
  let response: unknown;
  try {
    response = await client.responses.create(
      buildStagedTerraResearchRequest(shopperRequest),
      { timeout: STAGED_TERRA_RUNTIME_LIMITS.researchTimeoutMs },
    );
  } catch {
    return failed(ledger, "request_error", startedAt, now);
  }
  recordResponse(ledger, response);
  const id = responseId(response);
  if (!id || !/^resp_[A-Za-z0-9_-]{8,}$/.test(id) || id.length > 256) {
    if (
      id &&
      ["queued", "in_progress"].includes(ledger.status)
    ) {
      try {
        await client.responses.cancel(id, {
          timeout: STAGED_TERRA_RUNTIME_LIMITS.researchTimeoutMs,
        });
      } catch {
        // A known but unusable non-terminal job received one safety cancel.
      }
    }
    return failed(ledger, "missing_response_id", startedAt, now);
  }
  if (!["queued", "in_progress", "completed"].includes(ledger.status)) {
    return failed(ledger, "terminal_failure", startedAt, now);
  }
  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    responseId: id,
    status: ledger.status as "queued" | "in_progress" | "completed",
    requestFingerprint: buildStagedTerraRequestFingerprint(shopperRequest),
    promptVersion: STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    ledger,
  };
}

export async function pollStagedTerraResearch({
  client,
  responseId: trackedResponseId,
  requestFingerprint,
  shopperRequest,
  now = Date.now,
  onEvaluationSnapshot,
}: {
  client: StagedTerraResponsesClient;
  responseId: string;
  requestFingerprint: string;
  shopperRequest: DirectTerraShopperRequest;
  now?: () => number;
  onEvaluationSnapshot?: (
    snapshot: StagedTerraResearchEvaluationSnapshot,
  ) => void;
}) {
  const ledger = blankLedger(
    "research_poll",
    STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    trackedResponseId,
  );
  const startedAt = now();
  if (
    !/^resp_[A-Za-z0-9_-]{8,}$/.test(trackedResponseId) ||
    requestFingerprint !== buildStagedTerraRequestFingerprint(shopperRequest)
  ) {
    return failed(ledger, "invalid_tracking_state", startedAt, now);
  }
  let response: unknown;
  try {
    response = await client.responses.retrieve(
      trackedResponseId,
      { include: ["web_search_call.action.sources"] },
      { timeout: STAGED_TERRA_RUNTIME_LIMITS.researchTimeoutMs },
    );
  } catch {
    return failed(ledger, "request_error", startedAt, now);
  }
  if (responseId(response) !== trackedResponseId) {
    return failed(ledger, "response_id_mismatch", startedAt, now);
  }
  recordResponse(ledger, response);
  if (["queued", "in_progress"].includes(ledger.status)) {
    ledger.durationMs = Math.max(0, now() - startedAt);
    return {
      ok: true as const,
      state: "pending" as const,
      status: ledger.status as "queued" | "in_progress",
      ledger,
    };
  }
  if (
    ledger.status !== "completed" ||
    containsRefusal(response) ||
    ledger.usage.webSearchCalls < 1 ||
    ledger.usage.webSearchCalls > 10
  ) {
    return failed(ledger, "invalid_completed_response", startedAt, now);
  }
  let value: unknown;
  try {
    value = JSON.parse(outputText(response));
  } catch {
    return failed(ledger, "invalid_json", startedAt, now);
  }
  const responseSources = extractDirectTerraExactResponseSources(response);
  const responseSourceUrls = responseSources.map((source) => source.url);
  const parsed = validateStagedTerraResearchOutput({
    value,
    shopperRequest,
    responseSourceUrls,
  });
  if (!parsed.ok) {
    return {
      ...failed(ledger, "invalid_research_contract", startedAt, now),
      validationReason: parsed.reason,
      ...("candidateValidationReason" in parsed
        ? { candidateValidationReason: parsed.candidateValidationReason }
        : {}),
      ...("candidateSourceValidationReason" in parsed
        ? {
            candidateSourceValidationReason:
              parsed.candidateSourceValidationReason,
          }
        : {}),
    };
  }
  const identitySources = validateStagedTerraResearchIdentitySources({
    researchOutput: parsed.value,
    responseSources,
  });
  if (!identitySources.ok) {
    onEvaluationSnapshot?.(
      researchEvaluationSnapshot({
        validatedCandidates: parsed.value.candidates,
        acceptedCandidates: [],
      }),
    );
    return {
      ...failed(ledger, "invalid_research_contract", startedAt, now),
      validationReason: "research_candidate_invalid" as const,
      candidateValidationReason: "candidate_sources" as const,
      candidateSourceValidationReason: identitySources.reason,
      identitySourceFilter: identitySources.identitySourceFilter,
    };
  }
  onEvaluationSnapshot?.(
    researchEvaluationSnapshot({
      validatedCandidates: parsed.value.candidates,
      acceptedCandidates: identitySources.value.candidates,
    }),
  );
  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    state: "completed" as const,
    researchOutput: identitySources.value,
    identitySourceFilter: identitySources.identitySourceFilter,
    ledger,
  };
}

export async function cancelStagedTerraResearch({
  client,
  responseId: trackedResponseId,
  now = Date.now,
}: {
  client: StagedTerraResponsesClient;
  responseId: string;
  now?: () => number;
}) {
  const ledger = blankLedger(
    "research_cancel",
    STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    trackedResponseId,
  );
  const startedAt = now();
  if (!/^resp_[A-Za-z0-9_-]{8,}$/.test(trackedResponseId)) {
    return failed(ledger, "invalid_tracking_state", startedAt, now);
  }
  let response: unknown;
  try {
    response = await client.responses.cancel(trackedResponseId, {
      timeout: STAGED_TERRA_RUNTIME_LIMITS.researchTimeoutMs,
    });
  } catch {
    return failed(ledger, "request_error", startedAt, now);
  }
  if (responseId(response) !== trackedResponseId) {
    return failed(ledger, "response_id_mismatch", startedAt, now);
  }
  recordResponse(ledger, response);
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: true as const, status: ledger.status, ledger };
}

export async function runStagedTerraPresentation({
  client,
  evidencePackage,
  now = Date.now,
}: {
  client: StagedTerraResponsesClient;
  evidencePackage: StagedTerraEvidencePackage;
  now?: () => number;
}) {
  const ledger = blankLedger(
    "presentation",
    STAGED_TERRA_PRESENTATION_PROMPT_VERSION,
  );
  const startedAt = now();
  let response: unknown;
  try {
    response = await client.responses.create(
      buildStagedTerraPresentationRequest(evidencePackage),
      { timeout: STAGED_TERRA_RUNTIME_LIMITS.presentationTimeoutMs },
    );
  } catch {
    return failed(ledger, "request_error", startedAt, now);
  }
  recordResponse(ledger, response);
  if (
    ledger.status !== "completed" ||
    containsRefusal(response) ||
    ledger.usage.webSearchCalls !== 0 ||
    ledger.sourceCount !== 0
  ) {
    const id = responseId(response);
    if (id && ["queued", "in_progress"].includes(ledger.status)) {
      try {
        await client.responses.cancel(id, {
          timeout: STAGED_TERRA_RUNTIME_LIMITS.presentationTimeoutMs,
        });
      } catch {
        // The known non-terminal job received one best-effort safety cancel.
      }
    }
    return failed(ledger, "invalid_completed_response", startedAt, now);
  }
  let value: unknown;
  try {
    value = JSON.parse(outputText(response));
  } catch {
    return failed(ledger, "invalid_json", startedAt, now);
  }
  const parsed = validateStagedTerraPresentationOutput({
    value,
    evidencePackage,
  });
  if (!parsed.ok) {
    return {
      ...failed(ledger, "invalid_presentation_contract", startedAt, now),
      validationReason: parsed.reason,
    };
  }
  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    presentation: parsed.value,
    ledger,
  };
}

function sourceRoleForFetch(fetch: Extract<HybridFetchResult, { ok: true }>) {
  const observation = observeHybridSourceHtml({
    html: fetch.body,
    requestedUrl: fetch.requestedUrl,
    finalUrl: fetch.finalUrl,
    observedAt: "server-observed",
    status: fetch.status,
    contentType: fetch.contentType,
    redirectCount: fetch.redirectCount,
  });
  if (observation.entities.length > 0) {
    return observation.entities.some((entity) => entity.offers.length > 0)
      ? ("purchase_page" as const)
      : ("other" as const);
  }
  return observation.testedModels.length > 0
    ? ("professional_test" as const)
    : ("other" as const);
}

function claimsForSource(
  candidate: StagedTerraResearchCandidate,
  sourceUrl: string,
) {
  const signals = candidate.requirementLeads
    .filter(
      (lead) =>
        lead.status !== "not_found" && lead.sourceUrls.includes(sourceUrl),
    )
    .map((lead) => ({
      requirementId: lead.requirementId,
      verdict:
        lead.status === "supporting_evidence"
          ? ("supports" as const)
          : ("conflicts" as const),
    }));
  const claims: StagedTerraObservedClaim[] = [];
  for (const fact of candidate.factLeads) {
    if (!fact.sourceUrls.includes(sourceUrl)) continue;
    const kind =
      fact.kind === "performance"
        ? "performance"
        : fact.kind === "owner_feedback"
          ? "owner_feedback"
          : fact.kind === "specification"
            ? "specification"
            : null;
    if (kind) {
      claims.push({
        kind,
        statement: fact.statement,
        requirementSignals: signals,
      });
    }
  }
  for (const lead of candidate.requirementLeads) {
    if (
      lead.status === "not_found" ||
      !lead.sourceUrls.includes(sourceUrl) ||
      claims.some((claim) => claim.statement === lead.summary)
    ) {
      continue;
    }
    claims.push({
      kind: "specification",
      statement: lead.summary,
      requirementSignals: [
        {
          requirementId: lead.requirementId,
          verdict:
            lead.status === "supporting_evidence" ? "supports" : "conflicts",
        },
      ],
    });
  }
  return claims.slice(0, 24);
}

function shoppingRows(value: unknown): CommerceShoppingResult[] {
  if (!isRecord(value) || !Array.isArray(value.shopping)) return [];
  return value.shopping
    .slice(0, STAGED_TERRA_RUNTIME_LIMITS.maximumShoppingRowsPerCandidate)
    .filter(isRecord);
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      async () => {
        while (nextIndex < values.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await worker(values[index], index);
        }
      },
    ),
  );
  return results;
}

export async function collectStagedTerraVerificationInputs({
  researchOutput,
  fetchSource = (url) =>
    fetchHybridSource(url, LIVE_HYBRID_FETCH_DEPENDENCIES),
  shoppingTransport,
  now = Date.now,
}: {
  researchOutput: StagedTerraResearchOutput;
  fetchSource?: (url: string) => Promise<HybridFetchResult>;
  shoppingTransport?: DirectTerraSerperShoppingTransport;
  now?: () => number;
}) {
  const collected = await mapWithConcurrency(
    researchOutput.candidates,
    4,
    async (candidate) => {
      const sources: StagedTerraCandidateVerificationInput["sources"] = [];
      let sourceFetchAttempts = 0;
      let successfulSourceFetches = 0;
      const localSourceRoles: Partial<Record<HybridSourceRole, number>> = {};
      for (const sourceUrl of candidate.sourceUrls.slice(
        0,
        STAGED_TERRA_RUNTIME_LIMITS.maximumSourcesPerCandidate,
      )) {
        sourceFetchAttempts += 1;
        let fetch: HybridFetchResult;
        try {
          fetch = await fetchSource(sourceUrl);
        } catch {
          continue;
        }
        if (!fetch.ok || fetch.requestedUrl !== sourceUrl) continue;
        successfulSourceFetches += 1;
        const sourceRole = sourceRoleForFetch(fetch);
        localSourceRoles[sourceRole] =
          (localSourceRoles[sourceRole] ?? 0) + 1;
        sources.push({
          sourceUrl,
          sourceRole,
          fetch,
          observedAt: new Date(now()).toISOString(),
          claims: claimsForSource(candidate, sourceUrl),
        });
      }

      let shoppingResults: CommerceShoppingResult[] = [];
      let commerceRequests = 0;
      if (shoppingTransport) {
        commerceRequests = 1;
        try {
          const payload = await shoppingTransport({
            endpoint: DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
            body: {
              q: commerceVerificationQuery({
                key: candidate.candidateId,
                brand: candidate.brand,
                productName: candidate.productName,
                model: candidate.model,
                category: candidate.productType,
              }),
              gl: "us",
              hl: "en",
              num: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
            },
          });
          shoppingResults = shoppingRows(payload);
        } catch {
          shoppingResults = [];
        }
      }
      return {
        candidate: {
          candidateId: candidate.candidateId,
          sources,
          shoppingResults,
        } satisfies StagedTerraCandidateVerificationInput,
        sourceFetchAttempts,
        successfulSourceFetches,
        commerceRequests,
        commerceRows: shoppingResults.length,
        sourceRoles: localSourceRoles,
      };
    },
  );
  const candidates = collected.map((item) => item.candidate);
  const sourceRoles: Record<HybridSourceRole, number> = {
    official_product: 0,
    purchase_page: 0,
    manufacturer_spec: 0,
    professional_test: 0,
    owner_feedback: 0,
    warranty_support: 0,
    other: 0,
  };
  for (const item of collected) {
    for (const [role, count] of Object.entries(item.sourceRoles)) {
      sourceRoles[role as HybridSourceRole] += count ?? 0;
    }
  }
  const sourceFetchAttempts = collected.reduce(
    (sum, item) => sum + item.sourceFetchAttempts,
    0,
  );
  const successfulSourceFetches = collected.reduce(
    (sum, item) => sum + item.successfulSourceFetches,
    0,
  );
  const commerceRequests = collected.reduce(
    (sum, item) => sum + item.commerceRequests,
    0,
  );
  const commerceRows = collected.reduce(
    (sum, item) => sum + item.commerceRows,
    0,
  );
  if (
    sourceFetchAttempts >
      STAGED_TERRA_RUNTIME_LIMITS.maximumSourceFetches ||
    commerceRequests > STAGED_TERRA_RUNTIME_LIMITS.maximumCommerceRequests
  ) {
    throw new Error("staged_terra_runtime_limit_exceeded");
  }
  return {
    candidates,
    diagnostics: {
      runtimeVersion: STAGED_TERRA_RUNTIME_VERSION,
      candidateCount: candidates.length,
      sourceFetchAttempts,
      successfulSourceFetches,
      commerceRequests,
      commerceRows,
      sourceRoles,
    },
  };
}

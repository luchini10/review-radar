import { createHash } from "node:crypto";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseRetrieveParamsNonStreaming,
} from "openai/resources/responses/responses";

import {
  buildDirectTerraPrompt,
  buildDirectTerraResearchRequest,
  DIRECT_TERRA_PROMPT_VERSION,
  type DirectTerraShopperRequest,
} from "./directTerraPrompt.ts";
import {
  extractDirectTerraResponseSources,
  parseDirectTerraCompletedResponse,
} from "./directTerraResponse.ts";
import { isDirectTerraPromptHash } from "./directTerraJobToken.ts";

export type DirectTerraResponsesClient = {
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

export const DIRECT_TERRA_RESEARCH_CONFIG = Object.freeze({
  model: "gpt-5.6-terra",
  reasoning: "high" as const,
  maxOutputTokens: 24_000,
  maxToolCalls: 20,
  requestTimeoutMs: 120_000,
});

const RESPONSE_INCLUDE = ["web_search_call.action.sources"] as const;
const responseIdPattern = /^resp_[A-Za-z0-9_-]{8,}$/;

type FailureReason =
  | "invalid_config"
  | "request_error"
  | "missing_response_id"
  | "response_id_mismatch"
  | "terminal_failure"
  | "cancelled"
  | "incomplete_response"
  | "refusal"
  | "missing_web_search"
  | "invalid_report";

type DirectTerraUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  webSearchCalls: number;
};

export type DirectTerraResearchLedger = {
  operation: "start" | "poll" | "cancel";
  promptVersion: string;
  promptHash: string;
  modelRequested: string;
  modelReturned: string | null;
  status: string;
  responseIdHash: string | null;
  durationMs: number;
  usage: DirectTerraUsage;
  sourceCount: number;
  sourceHosts: string[];
  failureReason: FailureReason | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function numberAt(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "number" && Number.isFinite(record[key])
    ? (record[key] as number)
    : 0;
}

function responseStatus(response: unknown) {
  return isRecord(response) && typeof response.status === "string"
    ? response.status
    : "unknown";
}

function responseId(response: unknown) {
  return isRecord(response) && typeof response.id === "string"
    ? response.id
    : null;
}

function responseModel(response: unknown) {
  return isRecord(response) && typeof response.model === "string"
    ? response.model
    : null;
}

function responseContainsRefusal(response: unknown) {
  if (!isRecord(response)) return false;
  return asArray(response.output).some(
    (item) =>
      isRecord(item) &&
      item.type === "message" &&
      asArray(item.content).some(
        (content) => isRecord(content) && content.type === "refusal",
      ),
  );
}

function webSearchCalls(response: unknown) {
  if (!isRecord(response)) return 0;
  return asArray(response.output).filter(
    (item) => isRecord(item) && item.type === "web_search_call",
  ).length;
}

function responseUsage(response: unknown): DirectTerraUsage {
  const usage = isRecord(response) && isRecord(response.usage) ? response.usage : {};
  const inputDetails = isRecord(usage.input_tokens_details)
    ? usage.input_tokens_details
    : {};
  return {
    inputTokens: numberAt(usage, "input_tokens"),
    cachedInputTokens: numberAt(inputDetails, "cached_tokens"),
    outputTokens: numberAt(usage, "output_tokens"),
    totalTokens: numberAt(usage, "total_tokens"),
    webSearchCalls: webSearchCalls(response),
  };
}

function sourceHosts(response: unknown) {
  return [
    ...new Set(
      extractDirectTerraResponseSources(response).flatMap((source) => {
        try {
          return [new URL(source.url).hostname.toLowerCase().replace(/^www\./, "")];
        } catch {
          return [];
        }
      }),
    ),
  ].sort();
}

function hashResponseId(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function blankLedger({
  operation,
  promptVersion,
  promptHash,
  responseId: trackedResponseId,
}: {
  operation: DirectTerraResearchLedger["operation"];
  promptVersion: string;
  promptHash: string;
  responseId?: string;
}): DirectTerraResearchLedger {
  return {
    operation,
    promptVersion,
    promptHash,
    modelRequested: DIRECT_TERRA_RESEARCH_CONFIG.model,
    modelReturned: null,
    status: "not_started",
    responseIdHash: trackedResponseId
      ? hashResponseId(trackedResponseId)
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
    sourceHosts: [],
    failureReason: null,
  };
}

function recordResponse(ledger: DirectTerraResearchLedger, response: unknown) {
  ledger.status = responseStatus(response);
  ledger.modelReturned = responseModel(response);
  ledger.usage = responseUsage(response);
  ledger.sourceCount = extractDirectTerraResponseSources(response).length;
  ledger.sourceHosts = sourceHosts(response);
  const id = responseId(response);
  if (id) ledger.responseIdHash = hashResponseId(id);
}

function safeErrorDetails(error: unknown) {
  const record = isRecord(error) ? error : {};
  const details = [`name:${error instanceof Error ? error.name : "unknown_error"}`];
  for (const key of ["status", "code", "param", "type"] as const) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      details.push(`${key}:${String(value).slice(0, 200)}`);
    }
  }
  return details;
}

function finishFailure(
  ledger: DirectTerraResearchLedger,
  reason: FailureReason,
  startedAt: number,
  now: () => number,
  details: string[] = [],
) {
  ledger.failureReason = reason;
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: false as const, reason, details, ledger };
}

function validTrackingInput(
  trackedResponseId: string,
  promptVersion: string,
  promptHash: string,
) {
  return (
    responseIdPattern.test(trackedResponseId) &&
    promptVersion === DIRECT_TERRA_PROMPT_VERSION &&
    isDirectTerraPromptHash(promptHash)
  );
}

export async function startDirectTerraResearch({
  client,
  shopperRequest,
  now = Date.now,
}: {
  client: DirectTerraResponsesClient;
  shopperRequest: DirectTerraShopperRequest;
  now?: () => number;
}) {
  const prompt = buildDirectTerraPrompt(shopperRequest);
  const ledger = blankLedger({
    operation: "start",
    promptVersion: prompt.version,
    promptHash: prompt.promptHash,
  });
  const startedAt = now();
  let response: unknown;
  try {
    response = await client.responses.create(
      buildDirectTerraResearchRequest(shopperRequest),
      { timeout: DIRECT_TERRA_RESEARCH_CONFIG.requestTimeoutMs },
    );
  } catch (error) {
    return finishFailure(
      ledger,
      "request_error",
      startedAt,
      now,
      safeErrorDetails(error),
    );
  }

  recordResponse(ledger, response);
  const id = responseId(response);
  if (!id || !responseIdPattern.test(id)) {
    return finishFailure(ledger, "missing_response_id", startedAt, now);
  }
  if (ledger.status === "cancelled") {
    return finishFailure(ledger, "cancelled", startedAt, now);
  }
  if (ledger.status === "incomplete") {
    return finishFailure(ledger, "incomplete_response", startedAt, now);
  }
  if (!["queued", "in_progress", "completed"].includes(ledger.status)) {
    return finishFailure(ledger, "terminal_failure", startedAt, now);
  }

  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    responseId: id,
    status: ledger.status,
    promptVersion: prompt.version,
    promptHash: prompt.promptHash,
    ledger,
  };
}

export async function pollDirectTerraResearch({
  client,
  responseId: trackedResponseId,
  promptVersion,
  promptHash,
  now = Date.now,
}: {
  client: DirectTerraResponsesClient;
  responseId: string;
  promptVersion: string;
  promptHash: string;
  now?: () => number;
}) {
  const ledger = blankLedger({
    operation: "poll",
    promptVersion,
    promptHash,
    responseId: trackedResponseId,
  });
  const startedAt = now();
  if (!validTrackingInput(trackedResponseId, promptVersion, promptHash)) {
    return finishFailure(ledger, "invalid_config", startedAt, now);
  }

  let response: unknown;
  try {
    response = await client.responses.retrieve(
      trackedResponseId,
      { include: [...RESPONSE_INCLUDE] },
      { timeout: DIRECT_TERRA_RESEARCH_CONFIG.requestTimeoutMs },
    );
  } catch (error) {
    return finishFailure(
      ledger,
      "request_error",
      startedAt,
      now,
      safeErrorDetails(error),
    );
  }

  const returnedId = responseId(response);
  if (!returnedId) {
    return finishFailure(ledger, "missing_response_id", startedAt, now);
  }
  if (returnedId !== trackedResponseId) {
    return finishFailure(ledger, "response_id_mismatch", startedAt, now);
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
  if (ledger.status === "cancelled") {
    return finishFailure(ledger, "cancelled", startedAt, now);
  }
  if (ledger.status === "incomplete") {
    return finishFailure(ledger, "incomplete_response", startedAt, now);
  }
  if (ledger.status !== "completed") {
    return finishFailure(ledger, "terminal_failure", startedAt, now);
  }
  if (responseContainsRefusal(response)) {
    return finishFailure(ledger, "refusal", startedAt, now);
  }
  if (ledger.usage.webSearchCalls < 1) {
    return finishFailure(ledger, "missing_web_search", startedAt, now);
  }
  const parsed = parseDirectTerraCompletedResponse(response);
  if (!parsed.ok) {
    return {
      ...finishFailure(ledger, "invalid_report", startedAt, now),
      verification: parsed,
    };
  }

  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    state: "completed" as const,
    status: "completed" as const,
    reportMarkdown: parsed.reportMarkdown,
    citationUrls: parsed.citationUrls,
    sourceHosts: parsed.sourceHosts,
    disabledCitationCount: parsed.disabledCitationCount,
    priceEstimates: parsed.priceEstimates,
    assetTargets: parsed.assetTargets,
    responseSources: parsed.responseSources,
    rejectedPriceObservationCount: parsed.rejectedPriceObservationCount,
    ledger,
  };
}

export async function cancelDirectTerraResearch({
  client,
  responseId: trackedResponseId,
  promptVersion,
  promptHash,
  now = Date.now,
}: {
  client: DirectTerraResponsesClient;
  responseId: string;
  promptVersion: string;
  promptHash: string;
  now?: () => number;
}) {
  const ledger = blankLedger({
    operation: "cancel",
    promptVersion,
    promptHash,
    responseId: trackedResponseId,
  });
  const startedAt = now();
  if (!validTrackingInput(trackedResponseId, promptVersion, promptHash)) {
    return finishFailure(ledger, "invalid_config", startedAt, now);
  }

  let response: unknown;
  try {
    response = await client.responses.cancel(trackedResponseId, {
      timeout: DIRECT_TERRA_RESEARCH_CONFIG.requestTimeoutMs,
    });
  } catch (error) {
    return finishFailure(
      ledger,
      "request_error",
      startedAt,
      now,
      safeErrorDetails(error),
    );
  }
  const returnedId = responseId(response);
  if (!returnedId) {
    return finishFailure(ledger, "missing_response_id", startedAt, now);
  }
  if (returnedId !== trackedResponseId) {
    return finishFailure(ledger, "response_id_mismatch", startedAt, now);
  }
  recordResponse(ledger, response);
  if (ledger.status === "unknown") {
    return finishFailure(ledger, "terminal_failure", startedAt, now);
  }
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: true as const, status: ledger.status, ledger };
}

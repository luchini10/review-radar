import { createHash } from "node:crypto";

import type { NormalizedShopperRequest } from "./autonomousResearchContract.ts";
import { isTwoLayerPromptHash } from "./twoLayerJobToken.ts";
import {
  buildTwoLayerMasterPrompt,
  TWO_LAYER_MASTER_PROMPT_VERSION,
} from "./twoLayerMasterPrompt.ts";
import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";
import type { TwoLayerResponseSource } from "./twoLayerFormatter.ts";

type ResponsesClient = {
  responses: {
    create: (
      body: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
    retrieve: (
      responseId: string,
      query?: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
    cancel: (
      responseId: string,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

export const TWO_LAYER_RESEARCH_CONFIG = Object.freeze({
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
  | "missing_output_text";

type ResearchUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  webSearchCalls: number;
};

export type TwoLayerResearchLedger = {
  operation: "start" | "poll" | "cancel";
  promptVersion: string;
  promptHash: string;
  modelRequested: string;
  modelReturned: string | null;
  status: string;
  responseIdHash: string | null;
  durationMs: number;
  usage: ResearchUsage;
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

function responseOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text.trim();
  }
  if (!isRecord(response)) return "";
  return asArray(response.output)
    .flatMap((item) =>
      isRecord(item) && item.type === "message" ? asArray(item.content) : [],
    )
    .flatMap((content) =>
      isRecord(content) &&
      content.type === "output_text" &&
      typeof content.text === "string"
        ? [content.text]
        : [],
    )
    .join("\n")
    .trim();
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

function responseUsage(response: unknown): ResearchUsage {
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

function hashResponseId(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function responseSourceUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return normalizeTwoLayerSourceUrl(value);
  } catch {
    return null;
  }
}

function sourceHosts(sources: readonly TwoLayerResponseSource[]) {
  return Array.from(
    new Set(
      sources.flatMap((source) => {
        try {
          return [new URL(source.url).hostname.toLowerCase().replace(/^www\./, "")];
        } catch {
          return [];
        }
      }),
    ),
  ).sort();
}

export function extractTwoLayerResponseSources(
  response: unknown,
): TwoLayerResponseSource[] {
  if (!isRecord(response)) return [];
  const registry = new Map<string, TwoLayerResponseSource>();
  const add = (value: unknown, fallbackType: string | null) => {
    if (!isRecord(value)) return;
    const url = responseSourceUrl(value.url);
    if (!url) return;
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const type = typeof value.type === "string" ? value.type : fallbackType;
    const existing = registry.get(url);
    if (!existing) {
      registry.set(url, { url, title: title || null, type: type || null });
      return;
    }
    if (!existing.title && title) existing.title = title;
  };

  for (const item of asArray(response.output)) {
    if (!isRecord(item)) continue;
    if (item.type === "web_search_call" && isRecord(item.action)) {
      for (const source of asArray(item.action.sources)) add(source, null);
    }
    if (item.type === "message") {
      for (const content of asArray(item.content)) {
        if (!isRecord(content)) continue;
        for (const annotation of asArray(content.annotations)) {
          add(annotation, "url_citation");
        }
      }
    }
  }

  return Array.from(registry.values()).filter((source) => Boolean(source.title));
}

function blankLedger({
  operation,
  promptVersion,
  promptHash,
  responseId,
}: {
  operation: TwoLayerResearchLedger["operation"];
  promptVersion: string;
  promptHash: string;
  responseId?: string;
}): TwoLayerResearchLedger {
  return {
    operation,
    promptVersion,
    promptHash,
    modelRequested: TWO_LAYER_RESEARCH_CONFIG.model,
    modelReturned: null,
    status: "not_started",
    responseIdHash: responseId ? hashResponseId(responseId) : null,
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

function recordResponse(
  ledger: TwoLayerResearchLedger,
  response: unknown,
  sources: readonly TwoLayerResponseSource[] = [],
) {
  ledger.status = responseStatus(response);
  ledger.modelReturned = responseModel(response);
  ledger.usage = responseUsage(response);
  ledger.sourceCount = sources.length;
  ledger.sourceHosts = sourceHosts(sources);
  const id = responseId(response);
  if (id) ledger.responseIdHash = hashResponseId(id);
}

function validTrackingInput(
  responseIdValue: string,
  promptVersion: string,
  promptHash: string,
) {
  return (
    responseIdPattern.test(responseIdValue) &&
    promptVersion === TWO_LAYER_MASTER_PROMPT_VERSION &&
    isTwoLayerPromptHash(promptHash)
  );
}

function finishFailure(
  ledger: TwoLayerResearchLedger,
  reason: FailureReason,
  startedAt: number,
  now: () => number,
  details: string[] = [],
) {
  ledger.failureReason = reason;
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: false as const, reason, details, ledger };
}

export function buildTwoLayerResearchRequest(
  normalizedRequest: NormalizedShopperRequest,
) {
  const prompt = buildTwoLayerMasterPrompt(normalizedRequest);
  return {
    model: TWO_LAYER_RESEARCH_CONFIG.model,
    reasoning: { effort: TWO_LAYER_RESEARCH_CONFIG.reasoning },
    background: true,
    store: false,
    max_output_tokens: TWO_LAYER_RESEARCH_CONFIG.maxOutputTokens,
    max_tool_calls: TWO_LAYER_RESEARCH_CONFIG.maxToolCalls,
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    include: [...RESPONSE_INCLUDE],
    instructions: prompt.instructions,
    input: prompt.input,
  };
}

export async function startTwoLayerResearch({
  client,
  normalizedRequest,
  now = Date.now,
}: {
  client: ResponsesClient;
  normalizedRequest: NormalizedShopperRequest;
  now?: () => number;
}) {
  const prompt = buildTwoLayerMasterPrompt(normalizedRequest);
  const request = buildTwoLayerResearchRequest(normalizedRequest);
  const ledger = blankLedger({
    operation: "start",
    promptVersion: prompt.version,
    promptHash: prompt.promptHash,
  });
  const startedAt = now();
  let response: unknown;
  try {
    response = await client.responses.create(request, {
      timeout: TWO_LAYER_RESEARCH_CONFIG.requestTimeoutMs,
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

export async function pollTwoLayerResearch({
  client,
  responseId: responseIdValue,
  promptVersion,
  promptHash,
  now = Date.now,
}: {
  client: ResponsesClient;
  responseId: string;
  promptVersion: string;
  promptHash: string;
  now?: () => number;
}) {
  const ledger = blankLedger({
    operation: "poll",
    promptVersion,
    promptHash,
    responseId: responseIdValue,
  });
  const startedAt = now();
  if (!validTrackingInput(responseIdValue, promptVersion, promptHash)) {
    return finishFailure(ledger, "invalid_config", startedAt, now);
  }

  let response: unknown;
  try {
    response = await client.responses.retrieve(
      responseIdValue,
      { include: [...RESPONSE_INCLUDE] },
      { timeout: TWO_LAYER_RESEARCH_CONFIG.requestTimeoutMs },
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

  const sources = extractTwoLayerResponseSources(response);
  const returnedId = responseId(response);
  if (!returnedId) {
    return finishFailure(ledger, "missing_response_id", startedAt, now);
  }
  if (returnedId !== responseIdValue) {
    return finishFailure(ledger, "response_id_mismatch", startedAt, now);
  }
  recordResponse(ledger, response, sources);
  if (["queued", "in_progress"].includes(ledger.status)) {
    ledger.durationMs = Math.max(0, now() - startedAt);
    return {
      ok: true as const,
      state: "pending" as const,
      status: ledger.status,
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
  const rawResearchText = responseOutputText(response);
  if (!rawResearchText) {
    return finishFailure(ledger, "missing_output_text", startedAt, now);
  }

  ledger.durationMs = Math.max(0, now() - startedAt);
  return {
    ok: true as const,
    state: "completed" as const,
    status: ledger.status,
    rawResearchText,
    responseSources: sources,
    ledger,
  };
}

export async function cancelTwoLayerResearch({
  client,
  responseId: responseIdValue,
  promptVersion,
  promptHash,
  now = Date.now,
}: {
  client: ResponsesClient;
  responseId: string;
  promptVersion: string;
  promptHash: string;
  now?: () => number;
}) {
  const ledger = blankLedger({
    operation: "cancel",
    promptVersion,
    promptHash,
    responseId: responseIdValue,
  });
  const startedAt = now();
  if (!validTrackingInput(responseIdValue, promptVersion, promptHash)) {
    return finishFailure(ledger, "invalid_config", startedAt, now);
  }

  let response: unknown;
  try {
    response = await client.responses.cancel(responseIdValue, {
      timeout: TWO_LAYER_RESEARCH_CONFIG.requestTimeoutMs,
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
  if (returnedId !== responseIdValue) {
    return finishFailure(ledger, "response_id_mismatch", startedAt, now);
  }
  recordResponse(ledger, response);
  if (ledger.status === "unknown") {
    return finishFailure(ledger, "terminal_failure", startedAt, now);
  }
  ledger.durationMs = Math.max(0, now() - startedAt);
  return { ok: true as const, status: ledger.status, ledger };
}

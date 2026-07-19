export const DIRECT_TERRA_API_VERSION = "direct-terra-api-v1";
export const DIRECT_TERRA_POLL_AFTER_MS = 2_000;
export const DIRECT_TERRA_JOB_TTL_MS = 10 * 60_000;
export const DIRECT_TERRA_CANCEL_BEFORE_EXPIRY_MS = 30_000;
export const DIRECT_TERRA_JOB_TOKEN_HEADER =
  "x-reviewradar-v2-job-token";

export type DirectTerraPendingResponse = {
  pipeline: "direct_terra";
  version: typeof DIRECT_TERRA_API_VERSION;
  state: "pending";
  status: "queued" | "in_progress";
  jobToken: string;
  pollAfterMs: number;
  expiresAtMs: number;
};

export type DirectTerraCompletedResponse = {
  pipeline: "direct_terra";
  version: typeof DIRECT_TERRA_API_VERSION;
  state: "completed";
  reportMarkdown: string;
  citationUrls: string[];
  sourceHosts: string[];
  transactionalStatus: "unverified";
};

export type DirectTerraCancelledResponse = {
  pipeline: "direct_terra";
  version: typeof DIRECT_TERRA_API_VERSION;
  state: "cancelled";
  status: "cancelled";
};

export type DirectTerraFailureResponse = {
  pipeline: "direct_terra";
  version: typeof DIRECT_TERRA_API_VERSION;
  state: "failed";
  code: string;
  error: string;
};

export type DirectTerraApiResponse =
  | DirectTerraPendingResponse
  | DirectTerraCompletedResponse
  | DirectTerraCancelledResponse
  | DirectTerraFailureResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.pipeline === "direct_terra" &&
    value.version === DIRECT_TERRA_API_VERSION
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isDirectTerraPendingResponse(
  value: unknown,
): value is DirectTerraPendingResponse {
  return (
    hasEnvelope(value) &&
    value.state === "pending" &&
    (value.status === "queued" || value.status === "in_progress") &&
    typeof value.jobToken === "string" &&
    value.jobToken.length > 0 &&
    typeof value.pollAfterMs === "number" &&
    Number.isFinite(value.pollAfterMs) &&
    value.pollAfterMs >= 1_000 &&
    value.pollAfterMs <= 10_000 &&
    typeof value.expiresAtMs === "number" &&
    Number.isSafeInteger(value.expiresAtMs)
  );
}

export function isDirectTerraCompletedResponse(
  value: unknown,
): value is DirectTerraCompletedResponse {
  return (
    hasEnvelope(value) &&
    value.state === "completed" &&
    typeof value.reportMarkdown === "string" &&
    value.reportMarkdown.length > 0 &&
    isStringArray(value.citationUrls) &&
    isStringArray(value.sourceHosts) &&
    value.transactionalStatus === "unverified"
  );
}

export function isDirectTerraCancelledResponse(
  value: unknown,
): value is DirectTerraCancelledResponse {
  return (
    hasEnvelope(value) &&
    value.state === "cancelled" &&
    value.status === "cancelled"
  );
}

export function isDirectTerraFailureResponse(
  value: unknown,
): value is DirectTerraFailureResponse {
  return (
    hasEnvelope(value) &&
    value.state === "failed" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

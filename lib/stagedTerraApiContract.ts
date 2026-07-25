import type { TwoLayerDisplaySource } from "./twoLayerApiContract.ts";
import type { TwoLayerProductCard } from "./twoLayerRecommendation.ts";

export const STAGED_TERRA_API_VERSION = "staged-terra-api-v1";
export const STAGED_TERRA_POLL_AFTER_MS = 2_000;
export const STAGED_TERRA_JOB_TTL_MS = 10 * 60_000;
export const STAGED_TERRA_CANCEL_BEFORE_EXPIRY_MS = 30_000;
export const STAGED_TERRA_CLIENT_REQUEST_HEADER =
  "x-reviewradar-staged-terra";
export const STAGED_TERRA_JOB_TOKEN_HEADER =
  "x-reviewradar-staged-job-token";

export type StagedTerraPendingResponse = {
  pipeline: "staged_terra";
  version: typeof STAGED_TERRA_API_VERSION;
  state: "pending";
  status: "queued" | "in_progress";
  jobToken: string;
  pollAfterMs: number;
  expiresAtMs: number;
};

export type StagedTerraCompletedResponse = {
  pipeline: "staged_terra";
  version: typeof STAGED_TERRA_API_VERSION;
  state: "completed";
  presentationVersion: string;
  cards: TwoLayerProductCard[];
  sources: TwoLayerDisplaySource[];
  finalAdvice: string[];
};

export type StagedTerraCancelledResponse = {
  pipeline: "staged_terra";
  version: typeof STAGED_TERRA_API_VERSION;
  state: "cancelled";
  status: "cancelled";
};

export type StagedTerraFailureResponse = {
  pipeline: "staged_terra";
  version: typeof STAGED_TERRA_API_VERSION;
  state: "failed";
  code: string;
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.pipeline === "staged_terra" &&
    value.version === STAGED_TERRA_API_VERSION
  );
}

export function isStagedTerraPendingResponse(
  value: unknown,
): value is StagedTerraPendingResponse {
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

export function isStagedTerraCompletedResponse(
  value: unknown,
): value is StagedTerraCompletedResponse {
  return (
    hasEnvelope(value) &&
    value.state === "completed" &&
    typeof value.presentationVersion === "string" &&
    Array.isArray(value.cards) &&
    value.cards.length <= 5 &&
    Array.isArray(value.sources) &&
    Array.isArray(value.finalAdvice) &&
    value.finalAdvice.length <= 5 &&
    value.finalAdvice.every((item) => typeof item === "string")
  );
}

export function isStagedTerraCancelledResponse(
  value: unknown,
): value is StagedTerraCancelledResponse {
  return (
    hasEnvelope(value) &&
    value.state === "cancelled" &&
    value.status === "cancelled"
  );
}

export function isStagedTerraFailureResponse(
  value: unknown,
): value is StagedTerraFailureResponse {
  return (
    hasEnvelope(value) &&
    value.state === "failed" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

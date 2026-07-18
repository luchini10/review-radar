import type { TwoLayerProductCard } from "./twoLayerRecommendation.ts";

export const TWO_LAYER_API_VERSION = "oai-two-layer-api-v1";
export const TWO_LAYER_POLL_AFTER_MS = 2_000;
export const TWO_LAYER_JOB_TTL_MS = 10 * 60_000;

export type TwoLayerDisplaySource = {
  id: string;
  label: string;
  title: string;
  url: string | null;
};

export type TwoLayerPendingResponse = {
  pipeline: "two_layer";
  version: typeof TWO_LAYER_API_VERSION;
  state: "pending";
  status: "queued" | "in_progress";
  jobToken: string;
  pollAfterMs: number;
  expiresAtMs: number;
};

export type TwoLayerCompletedResponse = {
  pipeline: "two_layer";
  version: typeof TWO_LAYER_API_VERSION;
  state: "completed";
  presentationVersion: string;
  cards: TwoLayerProductCard[];
  sources: TwoLayerDisplaySource[];
};

export type TwoLayerCancelledResponse = {
  pipeline: "two_layer";
  version: typeof TWO_LAYER_API_VERSION;
  state: "cancelled";
  status: "cancelled";
};

export type TwoLayerFailureResponse = {
  pipeline: "two_layer";
  version: typeof TWO_LAYER_API_VERSION;
  state: "failed";
  code: string;
  error: string;
};

export type TwoLayerApiResponse =
  | TwoLayerPendingResponse
  | TwoLayerCompletedResponse
  | TwoLayerCancelledResponse
  | TwoLayerFailureResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasTwoLayerEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.pipeline === "two_layer" &&
    value.version === TWO_LAYER_API_VERSION
  );
}

export function isTwoLayerPendingResponse(
  value: unknown,
): value is TwoLayerPendingResponse {
  return (
    hasTwoLayerEnvelope(value) &&
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

export function isTwoLayerCompletedResponse(
  value: unknown,
): value is TwoLayerCompletedResponse {
  return (
    hasTwoLayerEnvelope(value) &&
    value.state === "completed" &&
    typeof value.presentationVersion === "string" &&
    Array.isArray(value.cards) &&
    Array.isArray(value.sources)
  );
}

export function isTwoLayerCancelledResponse(
  value: unknown,
): value is TwoLayerCancelledResponse {
  return (
    hasTwoLayerEnvelope(value) &&
    value.state === "cancelled" &&
    value.status === "cancelled"
  );
}

export function isTwoLayerFailureResponse(
  value: unknown,
): value is TwoLayerFailureResponse {
  return (
    hasTwoLayerEnvelope(value) &&
    value.state === "failed" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

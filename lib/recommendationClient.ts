import {
  isTwoLayerCancelledResponse,
  isTwoLayerCompletedResponse,
  isTwoLayerFailureResponse,
  isTwoLayerPendingResponse,
  TWO_LAYER_CANCEL_BEFORE_EXPIRY_MS,
  TWO_LAYER_JOB_TOKEN_HEADER,
  type TwoLayerCompletedResponse,
  type TwoLayerPendingResponse,
} from "./twoLayerApiContract.ts";
import { SEARCH_PROGRESS_ID_HEADER } from "./searchProgress.ts";
import type {
  RecommendationApiRequest,
  RecommendationResult,
} from "../types/review-radar.ts";

type FetchImplementation = typeof fetch;

type LegacyRecommendationOutcome = {
  pipeline: "legacy";
  result: RecommendationResult;
};

export type RecommendationRequestOutcome =
  | LegacyRecommendationOutcome
  | TwoLayerCompletedResponse;

type RunRecommendationRequestOptions = {
  payload: RecommendationApiRequest;
  signal: AbortSignal;
  fetchImpl?: FetchImplementation;
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  onTwoLayerPending?: (response: TwoLayerPendingResponse) => void;
  // Opaque client-generated id for live progress narration. The legacy
  // pipeline reports its stages under this id; other pipelines ignore it.
  progressId?: string | null;
};

type CancelRecommendationJobOptions = {
  jobToken: string;
  fetchImpl?: FetchImplementation;
};

export class RecommendationClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function legacyResult(value: unknown): RecommendationResult | null {
  if (!isRecord(value) || !isRecord(value.result)) return null;
  return value.result as RecommendationResult;
}

function responseError(value: unknown) {
  if (isTwoLayerFailureResponse(value)) return value.error;
  if (isRecord(value) && typeof value.error === "string") return value.error;
  return null;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new RecommendationClientError(
      "ReviewRadar received an unexpected response.",
    );
  }
}

function abortableSleep(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const onAbort = () => {
      globalThis.clearTimeout(timeout);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    const timeout = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function assertSuccessfulResponse(response: Response, body: unknown) {
  const error = responseError(body);
  if (!response.ok || error) {
    throw new RecommendationClientError(
      error || "Something went wrong while researching recommendations.",
    );
  }
}

export async function runRecommendationRequest({
  payload,
  signal,
  fetchImpl = fetch,
  now = Date.now,
  sleep = abortableSleep,
  onTwoLayerPending,
  progressId = null,
}: RunRecommendationRequestOptions): Promise<RecommendationRequestOutcome> {
  const initialResponse = await fetchImpl("/api/recommendations", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      ...(progressId ? { [SEARCH_PROGRESS_ID_HEADER]: progressId } : {}),
    },
    method: "POST",
    signal,
  });
  let body = await parseJson(initialResponse);
  assertSuccessfulResponse(initialResponse, body);

  const legacy = legacyResult(body);
  if (legacy) return { pipeline: "legacy", result: legacy };
  if (isTwoLayerCompletedResponse(body)) return body;
  if (!isTwoLayerPendingResponse(body)) {
    throw new RecommendationClientError(
      "ReviewRadar received an unexpected response.",
    );
  }

  const jobToken = body.jobToken;
  onTwoLayerPending?.(body);

  while (true) {
    const cancelAtMs = body.expiresAtMs - TWO_LAYER_CANCEL_BEFORE_EXPIRY_MS;
    const millisecondsUntilCancellation = cancelAtMs - now();
    if (millisecondsUntilCancellation <= 0) {
      await cancelTwoLayerRecommendationJob({ jobToken, fetchImpl });
      throw new RecommendationClientError(
        "This research job expired. Please start a new search.",
      );
    }
    await sleep(Math.min(body.pollAfterMs, millisecondsUntilCancellation), signal);
    if (now() >= cancelAtMs) {
      await cancelTwoLayerRecommendationJob({ jobToken, fetchImpl });
      throw new RecommendationClientError(
        "This research job expired. Please start a new search.",
      );
    }
    const pollResponse = await fetchImpl("/api/recommendations", {
      cache: "no-store",
      headers: { [TWO_LAYER_JOB_TOKEN_HEADER]: jobToken },
      method: "GET",
      signal,
    });
    body = await parseJson(pollResponse);
    assertSuccessfulResponse(pollResponse, body);

    if (isTwoLayerCompletedResponse(body)) return body;
    if (!isTwoLayerPendingResponse(body) || body.jobToken !== jobToken) {
      throw new RecommendationClientError(
        "ReviewRadar received an unexpected response.",
      );
    }
    onTwoLayerPending?.(body);
  }
}

export async function cancelTwoLayerRecommendationJob({
  jobToken,
  fetchImpl = fetch,
}: CancelRecommendationJobOptions) {
  try {
    const response = await fetchImpl("/api/recommendations", {
      cache: "no-store",
      headers: { [TWO_LAYER_JOB_TOKEN_HEADER]: jobToken },
      keepalive: true,
      method: "DELETE",
    });
    const body = await parseJson(response);
    return response.ok && isTwoLayerCancelledResponse(body);
  } catch {
    return false;
  }
}

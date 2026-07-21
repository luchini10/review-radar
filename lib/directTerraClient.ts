import {
  DIRECT_TERRA_CANCEL_BEFORE_EXPIRY_MS,
  DIRECT_TERRA_JOB_TOKEN_HEADER,
  isDirectTerraCancelledResponse,
  isDirectTerraCompletedResponse,
  isDirectTerraFailureResponse,
  isDirectTerraPendingResponse,
  type DirectTerraCompletedResponse,
  type DirectTerraPendingResponse,
} from "./directTerraApiContract.ts";
import { SEARCH_PROGRESS_ID_HEADER } from "./searchProgress.ts";
import type { RecommendationApiRequest } from "../types/review-radar.ts";

type FetchImplementation = typeof fetch;

type RunOptions = {
  payload: RecommendationApiRequest;
  signal: AbortSignal;
  fetchImpl?: FetchImplementation;
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  onPending?: (response: DirectTerraPendingResponse) => void;
  // Opaque client-generated id for live progress narration. The direct-Terra
  // route reports its milestones under this id across start and poll requests.
  progressId?: string | null;
};

type CancelOptions = {
  jobToken: string;
  fetchImpl?: FetchImplementation;
};

export class DirectTerraClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectTerraClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new DirectTerraClientError(
      "ReviewRadar received an unexpected response.",
    );
  }
}

function responseError(value: unknown) {
  if (isDirectTerraFailureResponse(value)) return value.error;
  if (isRecord(value) && typeof value.error === "string") return value.error;
  return null;
}

function assertSuccessful(response: Response, body: unknown) {
  const error = responseError(body);
  if (!response.ok || error) {
    throw new DirectTerraClientError(
      error || "Something went wrong while researching recommendations.",
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

export async function runDirectTerraRecommendationRequest({
  payload,
  signal,
  fetchImpl = fetch,
  now = Date.now,
  sleep = abortableSleep,
  onPending,
  progressId = null,
}: RunOptions): Promise<DirectTerraCompletedResponse> {
  const progressHeader: Record<string, string> = progressId
    ? { [SEARCH_PROGRESS_ID_HEADER]: progressId }
    : {};
  const initialResponse = await fetchImpl("/api/recommendations-v2", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json", ...progressHeader },
    method: "POST",
    signal,
  });
  let body = await parseJson(initialResponse);
  assertSuccessful(initialResponse, body);
  if (isDirectTerraCompletedResponse(body)) return body;
  if (!isDirectTerraPendingResponse(body)) {
    throw new DirectTerraClientError(
      "ReviewRadar received an unexpected response.",
    );
  }

  const jobToken = body.jobToken;
  const initialTimeRemaining = Math.max(0, body.expiresAtMs - now());
  const cancellationLeadMs = Math.min(
    DIRECT_TERRA_CANCEL_BEFORE_EXPIRY_MS,
    Math.max(1_000, Math.floor(initialTimeRemaining / 10)),
  );
  const cancelAtMs = body.expiresAtMs - cancellationLeadMs;

  let completed = false;
  let cancellationAttempted = false;
  const cancelKnownJob = async () => {
    cancellationAttempted = true;
    return cancelDirectTerraRecommendationJob({ jobToken, fetchImpl });
  };

  try {
    onPending?.(body);
    while (true) {
      const millisecondsUntilCancellation = cancelAtMs - now();
      if (millisecondsUntilCancellation <= 0) {
        await cancelKnownJob();
        throw new DirectTerraClientError(
          "This research job expired. Please start a new search.",
        );
      }
      await sleep(
        Math.min(body.pollAfterMs, millisecondsUntilCancellation),
        signal,
      );
      if (now() >= cancelAtMs) {
        await cancelKnownJob();
        throw new DirectTerraClientError(
          "This research job expired. Please start a new search.",
        );
      }
      const pollResponse = await fetchImpl("/api/recommendations-v2", {
        cache: "no-store",
        headers: { [DIRECT_TERRA_JOB_TOKEN_HEADER]: jobToken, ...progressHeader },
        method: "GET",
        signal,
      });
      body = await parseJson(pollResponse);
      assertSuccessful(pollResponse, body);

      if (isDirectTerraCompletedResponse(body)) {
        completed = true;
        return body;
      }
      if (!isDirectTerraPendingResponse(body) || body.jobToken !== jobToken) {
        throw new DirectTerraClientError(
          "ReviewRadar received an unexpected response.",
        );
      }
      onPending?.(body);
    }
  } finally {
    if (!completed && !cancellationAttempted) {
      await cancelKnownJob();
    }
  }
}

export async function cancelDirectTerraRecommendationJob({
  jobToken,
  fetchImpl = fetch,
}: CancelOptions) {
  try {
    const response = await fetchImpl("/api/recommendations-v2", {
      cache: "no-store",
      headers: { [DIRECT_TERRA_JOB_TOKEN_HEADER]: jobToken },
      keepalive: true,
      method: "DELETE",
    });
    const body = await parseJson(response);
    return response.ok && isDirectTerraCancelledResponse(body);
  } catch {
    return false;
  }
}

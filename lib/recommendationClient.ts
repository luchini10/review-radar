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
import {
  isStagedTerraCancelledResponse,
  isStagedTerraCompletedResponse,
  isStagedTerraFailureResponse,
  isStagedTerraPendingResponse,
  STAGED_TERRA_CANCEL_BEFORE_EXPIRY_MS,
  STAGED_TERRA_CLIENT_REQUEST_HEADER,
  STAGED_TERRA_JOB_TOKEN_HEADER,
  type StagedTerraCompletedResponse,
  type StagedTerraPendingResponse,
} from "./stagedTerraApiContract.ts";
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
  | TwoLayerCompletedResponse
  | StagedTerraCompletedResponse;

type RunRecommendationRequestOptions = {
  payload: RecommendationApiRequest;
  signal: AbortSignal;
  fetchImpl?: FetchImplementation;
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  onTwoLayerPending?: (response: TwoLayerPendingResponse) => void;
  onStagedTerraPending?: (response: StagedTerraPendingResponse) => void;
  stagedTerra?: boolean;
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
  if (isStagedTerraFailureResponse(value)) return value.error;
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
  onStagedTerraPending,
  stagedTerra = false,
  progressId = null,
}: RunRecommendationRequestOptions): Promise<RecommendationRequestOutcome> {
  const initialResponse = await fetchImpl("/api/recommendations", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      ...(progressId ? { [SEARCH_PROGRESS_ID_HEADER]: progressId } : {}),
      ...(stagedTerra ? { [STAGED_TERRA_CLIENT_REQUEST_HEADER]: "1" } : {}),
    },
    method: "POST",
    signal,
  });
  let body = await parseJson(initialResponse);
  assertSuccessfulResponse(initialResponse, body);

  const legacy = legacyResult(body);
  if (legacy) return { pipeline: "legacy", result: legacy };
  if (isStagedTerraCompletedResponse(body)) return body;
  if (isTwoLayerCompletedResponse(body)) return body;
  const stagedPending = isStagedTerraPendingResponse(body);
  const twoLayerPending = isTwoLayerPendingResponse(body);
  if (!stagedPending && !twoLayerPending) {
    throw new RecommendationClientError(
      "ReviewRadar received an unexpected response.",
    );
  }

  const jobToken = body.jobToken;
  if (stagedPending) onStagedTerraPending?.(body);
  else onTwoLayerPending?.(body);

  let completed = false;
  let cancellationAttempted = false;
  const cancelKnownStagedJob = async () => {
    cancellationAttempted = true;
    return cancelRecommendationJob({
      jobToken,
      fetchImpl,
      stagedTerra: true,
    });
  };

  try {
    while (true) {
      const cancelBeforeExpiryMs = stagedPending
        ? STAGED_TERRA_CANCEL_BEFORE_EXPIRY_MS
        : TWO_LAYER_CANCEL_BEFORE_EXPIRY_MS;
      const cancelAtMs = body.expiresAtMs - cancelBeforeExpiryMs;
      const millisecondsUntilCancellation = cancelAtMs - now();
      if (millisecondsUntilCancellation <= 0) {
        if (stagedPending) {
          await cancelKnownStagedJob();
        } else {
          await cancelRecommendationJob({ jobToken, fetchImpl });
        }
        throw new RecommendationClientError(
          "This research job expired. Please start a new search.",
        );
      }
      await sleep(
        Math.min(body.pollAfterMs, millisecondsUntilCancellation),
        signal,
      );
      if (now() >= cancelAtMs) {
        if (stagedPending) {
          await cancelKnownStagedJob();
        } else {
          await cancelRecommendationJob({ jobToken, fetchImpl });
        }
        throw new RecommendationClientError(
          "This research job expired. Please start a new search.",
        );
      }
      const pollResponse = await fetchImpl("/api/recommendations", {
        cache: "no-store",
        headers: {
          [stagedPending
            ? STAGED_TERRA_JOB_TOKEN_HEADER
            : TWO_LAYER_JOB_TOKEN_HEADER]: jobToken,
        },
        method: "GET",
        signal,
      });
      body = await parseJson(pollResponse);
      assertSuccessfulResponse(pollResponse, body);

      if (isStagedTerraCompletedResponse(body)) {
        completed = true;
        return body;
      }
      if (isTwoLayerCompletedResponse(body)) return body;
      const nextPending = stagedPending
        ? isStagedTerraPendingResponse(body)
        : isTwoLayerPendingResponse(body);
      if (!nextPending || body.jobToken !== jobToken) {
        throw new RecommendationClientError(
          "ReviewRadar received an unexpected response.",
        );
      }
      if (stagedPending) {
        onStagedTerraPending?.(body as StagedTerraPendingResponse);
      } else {
        onTwoLayerPending?.(body as TwoLayerPendingResponse);
      }
    }
  } finally {
    if (stagedPending && !completed && !cancellationAttempted) {
      await cancelKnownStagedJob();
    }
  }
}

export async function cancelRecommendationJob({
  jobToken,
  fetchImpl = fetch,
  stagedTerra = false,
}: CancelRecommendationJobOptions & { stagedTerra?: boolean }) {
  try {
    const response = await fetchImpl("/api/recommendations", {
      cache: "no-store",
      headers: {
        [stagedTerra
          ? STAGED_TERRA_JOB_TOKEN_HEADER
          : TWO_LAYER_JOB_TOKEN_HEADER]: jobToken,
      },
      keepalive: true,
      method: "DELETE",
    });
    const body = await parseJson(response);
    return (
      response.ok &&
      (stagedTerra
        ? isStagedTerraCancelledResponse(body)
        : isTwoLayerCancelledResponse(body))
    );
  } catch {
    return false;
  }
}

export function cancelTwoLayerRecommendationJob(
  options: CancelRecommendationJobOptions,
) {
  return cancelRecommendationJob(options);
}

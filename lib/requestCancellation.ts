export class RequestCancelledError extends Error {
  constructor(cause?: unknown) {
    super("The request was cancelled.");
    this.name = "RequestCancelledError";

    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isRequestCancelledError(
  error: unknown,
): error is RequestCancelledError {
  return (
    error instanceof RequestCancelledError ||
    (error instanceof Error && error.name === "RequestCancelledError")
  );
}

export function throwIfRequestCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new RequestCancelledError(signal.reason);
  }
}

export function rethrowIfRequestCancelled(
  error: unknown,
  signal?: AbortSignal,
) {
  if (isRequestCancelledError(error)) {
    throw error;
  }

  if (signal?.aborted) {
    throw new RequestCancelledError(error);
  }
}

export function forwardAbortSignal(
  source: AbortSignal | undefined,
  target: AbortController,
) {
  if (!source) {
    return () => {};
  }

  const abortTarget = () => target.abort(source.reason);
  source.addEventListener("abort", abortTarget, { once: true });
  if (source.aborted) {
    abortTarget();
  }

  return () => source.removeEventListener("abort", abortTarget);
}

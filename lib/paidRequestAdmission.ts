export const PAID_REQUEST_MAX_CONCURRENT = 4;
export const PAID_REQUEST_MAX_STARTS_PER_WINDOW = 12;
export const PAID_REQUEST_WINDOW_MS = 60_000;

type PaidRequestAdmissionConfig = {
  maxConcurrent?: number;
  maxStartsPerWindow?: number;
  windowMs?: number;
  now?: () => number;
};

export type PaidRequestPermit = {
  ok: true;
  release: () => void;
};

type PaidRequestRejection = {
  ok: false;
  reason: "concurrency_limit" | "rate_limit";
  retryAfterSeconds: number;
};

function positiveSafeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
  return value;
}

export function createPaidRequestAdmission({
  maxConcurrent = PAID_REQUEST_MAX_CONCURRENT,
  maxStartsPerWindow = PAID_REQUEST_MAX_STARTS_PER_WINDOW,
  windowMs = PAID_REQUEST_WINDOW_MS,
  now = Date.now,
}: PaidRequestAdmissionConfig = {}) {
  positiveSafeInteger(maxConcurrent, "Paid concurrency ceiling");
  positiveSafeInteger(maxStartsPerWindow, "Paid start ceiling");
  positiveSafeInteger(windowMs, "Paid admission window");

  let active = 0;
  const starts: number[] = [];
  const currentTime = () => {
    const value = now();
    if (!Number.isFinite(value)) {
      throw new Error("Paid request admission clock must be finite.");
    }
    return value;
  };
  const prune = (currentTime: number) => {
    const earliestRetained = currentTime - windowMs;
    while (starts.length > 0 && starts[0] <= earliestRetained) {
      starts.shift();
    }
  };
  return {
    tryAcquire(): PaidRequestPermit | PaidRequestRejection {
      const time = currentTime();
      prune(time);
      if (active >= maxConcurrent) {
        return {
          ok: false,
          reason: "concurrency_limit",
          retryAfterSeconds: 1,
        };
      }
      if (starts.length >= maxStartsPerWindow) {
        const retryAfterMs = starts[0] + windowMs - time;
        return {
          ok: false,
          reason: "rate_limit",
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1_000)),
        };
      }

      active += 1;
      starts.push(time);
      let released = false;
      return {
        ok: true,
        release() {
          if (released) return;
          released = true;
          active = Math.max(0, active - 1);
        },
      };
    },
    stats() {
      const time = currentTime();
      prune(time);
      return {
        active,
        maxConcurrent,
        maxStartsPerWindow,
        startsInWindow: starts.length,
        windowMs,
      };
    },
    resetForTests() {
      active = 0;
      starts.length = 0;
    },
  };
}

export type PaidRequestAdmission = ReturnType<
  typeof createPaidRequestAdmission
>;

const sharedAdmissionGlobal = globalThis as typeof globalThis & {
  __reviewRadarPaidRequestAdmissionV1?: PaidRequestAdmission;
};

export const DEFAULT_PAID_REQUEST_ADMISSION =
  sharedAdmissionGlobal.__reviewRadarPaidRequestAdmissionV1 ??
  createPaidRequestAdmission();

sharedAdmissionGlobal.__reviewRadarPaidRequestAdmissionV1 =
  DEFAULT_PAID_REQUEST_ADMISSION;

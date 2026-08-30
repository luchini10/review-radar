export const PAID_REQUEST_MAX_CONCURRENT = 4;
export const PAID_REQUEST_MAX_STARTS_PER_WINDOW = 12;
export const PAID_REQUEST_WINDOW_MS = 60_000;

const TERMINAL_PROVIDER_JOB_STATUSES = new Set([
  "cancelled",
  "completed",
  "failed",
  "incomplete",
]);

export function paidProviderJobStatusIsTerminal(status: unknown) {
  return (
    typeof status === "string" && TERMINAL_PROVIDER_JOB_STATUSES.has(status)
  );
}

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
  const leases = new Map<
    string,
    { expiresAtMs: number; permit: PaidRequestPermit }
  >();
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
  const sweepLeasesAt = (time: number) => {
    for (const [key, lease] of leases) {
      if (lease.expiresAtMs <= time) {
        leases.delete(key);
        lease.permit.release();
      }
    }
  };

  return {
    tryAcquire(): PaidRequestPermit | PaidRequestRejection {
      const time = currentTime();
      sweepLeasesAt(time);
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
    countLeases(prefix = "") {
      sweepLeasesAt(currentTime());
      let count = 0;
      for (const key of leases.keys()) {
        if (key.startsWith(prefix)) count += 1;
      }
      return count;
    },
    releaseLease(key: string) {
      sweepLeasesAt(currentTime());
      const lease = leases.get(key);
      if (!lease) return false;
      leases.delete(key);
      lease.permit.release();
      return true;
    },
    sweepLeases() {
      sweepLeasesAt(currentTime());
    },
    trackLease(key: string, ttlMs: number, permit: PaidRequestPermit) {
      const time = currentTime();
      sweepLeasesAt(time);
      const expiresAtMs = time + ttlMs;
      if (
        !key.trim() ||
        !Number.isFinite(ttlMs) ||
        ttlMs <= 0 ||
        !Number.isFinite(expiresAtMs)
      ) {
        permit.release();
        return false;
      }
      if (leases.has(key)) {
        permit.release();
        return false;
      }
      leases.set(key, { expiresAtMs, permit });
      return true;
    },
    stats() {
      const time = currentTime();
      sweepLeasesAt(time);
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
      for (const lease of leases.values()) lease.permit.release();
      leases.clear();
      active = 0;
      starts.length = 0;
    },
  };
}

export type PaidRequestAdmission = ReturnType<
  typeof createPaidRequestAdmission
>;

export function createPaidRequestLeaseRegistry({
  admission,
  namespace,
  now = Date.now,
}: {
  admission: PaidRequestAdmission;
  namespace: string;
  now?: () => number;
}) {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(namespace)) {
    throw new Error("Paid request lease namespace is invalid.");
  }
  const keyPrefix = `${namespace}:`;

  const currentTime = () => {
    const value = now();
    if (!Number.isFinite(value)) {
      throw new Error("Paid request lease clock must be finite.");
    }
    return value;
  };
  const scopedKey = (key: string) => `${keyPrefix}${key}`;

  return {
    release(key: string) {
      return admission.releaseLease(scopedKey(key));
    },
    stats() {
      return { activeLeases: admission.countLeases(keyPrefix) };
    },
    sweep() {
      admission.sweepLeases();
    },
    track(
      key: string,
      expiresAtMs: number,
      permit: PaidRequestPermit,
    ) {
      const time = currentTime();
      if (!key.trim() || !Number.isFinite(expiresAtMs) || expiresAtMs <= time) {
        permit.release();
        return false;
      }
      return admission.trackLease(scopedKey(key), expiresAtMs - time, permit);
    },
  };
}

export type PaidRequestLeaseRegistry = ReturnType<
  typeof createPaidRequestLeaseRegistry
>;

const sharedAdmissionGlobal = globalThis as typeof globalThis & {
  __reviewRadarPaidRequestAdmissionV1?: PaidRequestAdmission;
};

export const DEFAULT_PAID_REQUEST_ADMISSION =
  sharedAdmissionGlobal.__reviewRadarPaidRequestAdmissionV1 ??
  createPaidRequestAdmission();

sharedAdmissionGlobal.__reviewRadarPaidRequestAdmissionV1 =
  DEFAULT_PAID_REQUEST_ADMISSION;

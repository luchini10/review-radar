import { createHash } from "node:crypto";
import {
  RequestCancelledError,
  throwIfRequestCancelled,
} from "./requestCancellation.ts";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheLookupObserver = (outcome: "hit" | "miss") => void;

type CacheLoadOptions = {
  signal?: AbortSignal;
};

type InFlightEntry<T> = {
  controller: AbortController;
  promise: Promise<T>;
  settled: boolean;
  waiters: number;
};

export const SHARED_CACHE_MAX_ENTRIES = 256;

type BoundedAsyncCacheOptions = {
  maxEntries?: number;
  now?: () => number;
};

export function normalizeCacheKey(parts: Array<number | string | undefined>) {
  const normalized = parts.map((part) =>
    String(part ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  );
  const namespace = normalized.shift() ?? "cache";
  const digest = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
  return `${namespace}|${digest}`;
}

export function createBoundedAsyncCache({
  maxEntries = SHARED_CACHE_MAX_ENTRIES,
  now = Date.now,
}: BoundedAsyncCacheOptions = {}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
    throw new Error("Cache entry ceiling must be a positive safe integer.");
  }
  const values = new Map<string, CacheEntry<unknown>>();
  const inFlight = new Map<string, InFlightEntry<unknown>>();

  const sweepExpired = (currentTime: number) => {
    for (const [key, entry] of values) {
      if (entry.expiresAt <= currentTime) values.delete(key);
    }
  };

  const getCachedOrLoad = async <T>(
    key: string,
    ttlMs: number,
    loader: (signal: AbortSignal) => Promise<T>,
    onLookup?: CacheLookupObserver,
    options: CacheLoadOptions = {},
  ): Promise<T> => {
    throwIfRequestCancelled(options.signal);
    const currentTime = now();
    sweepExpired(currentTime);
    const existing = values.get(key) as CacheEntry<T> | undefined;
    if (existing) {
      values.delete(key);
      values.set(key, existing);
      onLookup?.("hit");
      return existing.value;
    }

    let pending = inFlight.get(key) as InFlightEntry<T> | undefined;
    if (pending) {
      onLookup?.("hit");
    } else {
      onLookup?.("miss");
      const controller = new AbortController();
      const entry: InFlightEntry<T> = {
        controller,
        promise: null as unknown as Promise<T>,
        settled: false,
        waiters: 0,
      };
      entry.promise = (Promise.resolve()
        .then(() => loader(controller.signal))
        .then((value) => {
          const storedAt = now();
          if (
            inFlight.get(key) === entry &&
            !controller.signal.aborted &&
            Number.isFinite(ttlMs) &&
            ttlMs > 0
          ) {
            sweepExpired(storedAt);
            while (values.size >= maxEntries) {
              const oldestKey = values.keys().next().value;
              if (oldestKey === undefined) break;
              values.delete(oldestKey);
            }
            values.set(key, {
              expiresAt: storedAt + ttlMs,
              value,
            });
          }
          return value;
        })
        .finally(() => {
          entry.settled = true;
          if (inFlight.get(key) === entry) inFlight.delete(key);
        })) as Promise<T>;
      // A cancelled final waiter stops awaiting this promise. Keep a rejection
      // handler attached so a cooperative loader abort cannot become unhandled.
      void entry.promise.catch(() => {});
      inFlight.set(key, entry);
      pending = entry;
    }

    const entry = pending;
    entry.waiters += 1;

    return new Promise<T>((resolve, reject) => {
      let finished = false;
      const finish = (callback: () => void) => {
        if (finished) return;
        finished = true;
        options.signal?.removeEventListener("abort", onAbort);
        entry.waiters = Math.max(0, entry.waiters - 1);

        if (entry.waiters === 0 && !entry.settled) {
          if (inFlight.get(key) === entry) inFlight.delete(key);
          entry.controller.abort();
        }

        callback();
      };
      const onAbort = () =>
        finish(() => reject(new RequestCancelledError(options.signal?.reason)));

      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
        return;
      }

      entry.promise.then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
    });
  };

  return {
    clear() {
      values.clear();
      for (const entry of inFlight.values()) {
        entry.controller.abort();
      }
      inFlight.clear();
    },
    getCachedOrLoad,
    stats() {
      sweepExpired(now());
      return {
        entries: values.size,
        inFlight: inFlight.size,
        maxEntries,
      };
    },
  };
}

export type BoundedAsyncCache = ReturnType<typeof createBoundedAsyncCache>;

const cache = createBoundedAsyncCache();

export function getCachedOrLoad<T>(
  key: string,
  ttlMs: number,
  loader: (signal: AbortSignal) => Promise<T>,
  onLookup?: CacheLookupObserver,
  options: CacheLoadOptions = {},
) {
  return cache.getCachedOrLoad(key, ttlMs, loader, onLookup, options);
}

export function cacheStats() {
  return cache.stats();
}

export function clearCacheForTests() {
  cache.clear();
}

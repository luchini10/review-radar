import { createHash } from "node:crypto";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheLookupObserver = (outcome: "hit" | "miss") => void;

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
  const inFlight = new Map<string, Promise<unknown>>();

  const sweepExpired = (currentTime: number) => {
    for (const [key, entry] of values) {
      if (entry.expiresAt <= currentTime) values.delete(key);
    }
  };

  const getCachedOrLoad = async <T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    onLookup?: CacheLookupObserver,
  ): Promise<T> => {
    const currentTime = now();
    sweepExpired(currentTime);
    const existing = values.get(key) as CacheEntry<T> | undefined;
    if (existing) {
      values.delete(key);
      values.set(key, existing);
      onLookup?.("hit");
      return existing.value;
    }

    const pending = inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      onLookup?.("hit");
      return pending;
    }

    onLookup?.("miss");
    const loadPromise = Promise.resolve().then(loader);
    inFlight.set(key, loadPromise);
    try {
      const value = await loadPromise;
      const storedAt = now();
      if (Number.isFinite(ttlMs) && ttlMs > 0) {
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
    } finally {
      if (inFlight.get(key) === loadPromise) inFlight.delete(key);
    }
  };

  return {
    clear() {
      values.clear();
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
  loader: () => Promise<T>,
  onLookup?: CacheLookupObserver,
) {
  return cache.getCachedOrLoad(key, ttlMs, loader, onLookup);
}

export function cacheStats() {
  return cache.stats();
}

export function clearCacheForTests() {
  cache.clear();
}

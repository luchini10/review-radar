type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

function now() {
  return Date.now();
}

export function normalizeCacheKey(parts: Array<number | string | undefined>) {
  return parts
    .map((part) =>
      String(part ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim(),
    )
    .join("|");
}

export async function getCachedOrLoad<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now()) {
    return existing.value;
  }

  const value = await loader();
  cache.set(key, {
    expiresAt: now() + ttlMs,
    value,
  });

  return value;
}

export function cacheStats() {
  return {
    entries: cache.size,
  };
}

export function clearCacheForTests() {
  cache.clear();
}

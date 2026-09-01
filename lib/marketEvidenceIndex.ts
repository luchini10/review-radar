import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { RecommendationApiRequest } from "@/types/review-radar";
import {
  buildMarketScoutPlan,
  canonicalSourceUrl,
  MARKET_SCOUT_MODEL,
  MARKET_SCOUT_PROMPT_VERSION,
  neutralShoppingQueries,
  scoutCacheKey,
  tierForSources,
  type MarketEvidenceTier,
  type MarketScoutPlan,
  type MarketScoutTarget,
  type MarketScoutTelemetry,
} from "./marketScout.ts";

type OpenAIResponsesClient = Parameters<typeof buildMarketScoutPlan>[0]["client"];

export const MARKET_EVIDENCE_INDEX_VERSION = 2;
export const MARKET_EVIDENCE_FRESH_MS = 24 * 60 * 60 * 1_000;
export const MARKET_EVIDENCE_REFRESH_AFTER_MS = 20 * 60 * 60 * 1_000;
export const MARKET_EVIDENCE_REFRESH_COOLDOWN_MS = 15 * 60 * 1_000;
export const MARKET_EVIDENCE_INDEX_MAX_ENTRIES = 256;
export const MARKET_EVIDENCE_INDEX_MAX_BYTES = 2 * 1_024 * 1_024;

const targetSchema = z
  .object({
    aliases: z.array(z.string().min(1).max(120)).max(4),
    brand: z.string().min(1).max(80),
    consensusOrder: z.number().int().min(0).max(4),
    evidenceTier: z.enum(["strong", "supported"]),
    model: z.string().min(1).max(120),
    sourceUrls: z.array(z.string().min(1).max(500)).min(1).max(6),
  })
  .strict();

const researchSchema = z
  .object({
    acceptedSourceUrls: z.number().int().nonnegative(),
    evidenceTiers: z
      .object({
        none: z.number().int().nonnegative(),
        strong: z.number().int().nonnegative(),
        supported: z.number().int().nonnegative(),
      })
      .strict(),
    hostedSearchCalls: z.number().int().nonnegative().max(10),
    inputTokens: z.number().int().nonnegative(),
    openAiCalls: z.number().int().nonnegative().max(1),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  })
  .strict();

const refreshAttemptSchema = z
  .object({
    completedAtMs: z.number().int().nonnegative(),
    fallbackReason: z
      .enum([
        "insufficient_evidence",
        "invalid_output",
        "no_client",
        "provider_error",
        "timeout",
        "tool_call_ceiling",
      ])
      .optional(),
    research: researchSchema,
    status: z.enum(["failed", "updated"]),
    targetCount: z.number().int().nonnegative().max(5),
  })
  .strict();

const entrySchema = z
  .object({
    createdAtMs: z.number().int().nonnegative(),
    model: z.string().min(1).max(100),
    promptVersion: z.string().min(1).max(100),
    research: researchSchema,
    targets: z.array(targetSchema).min(1).max(5),
  })
  .strict();

const indexSchema = z
  .object({
    attempts: z.record(z.string().min(1).max(200), refreshAttemptSchema),
    entries: z.record(z.string().min(1).max(200), entrySchema),
    version: z.literal(MARKET_EVIDENCE_INDEX_VERSION),
  })
  .strict();

type MarketEvidenceIndex = z.infer<typeof indexSchema>;
type MarketEvidenceIndexEntry = z.infer<typeof entrySchema>;
type MarketEvidenceRefreshAttempt = z.infer<typeof refreshAttemptSchema>;

export type MarketEvidenceIndexStatus =
  | "fresh"
  | "invalid"
  | "miss"
  | "stale";

export type MarketEvidenceLookupTelemetry = MarketScoutTelemetry & {
  indexAgeMs: number | null;
  indexedResearch: MarketEvidenceIndexEntry["research"] | null;
  indexStatus: MarketEvidenceIndexStatus;
  lastRefreshAttempt: MarketEvidenceRefreshAttempt | null;
  refreshRecommended: boolean;
};

export type MarketEvidenceLookup = {
  needsRefresh: boolean;
  plan: MarketScoutPlan;
  telemetry: MarketEvidenceLookupTelemetry;
};

export type MarketEvidenceRefreshResult = {
  scouted: Awaited<ReturnType<typeof buildMarketScoutPlan>> | null;
  status: "busy" | "failed" | "throttled" | "updated";
};

const refreshAttempts = new Map<string, number>();
const inFlightRefreshes = new Map<string, Promise<MarketEvidenceRefreshResult>>();
let writeQueue: Promise<void> = Promise.resolve();
let activeRefreshes = 0;

function configuredIndexPath(override?: string) {
  const configured = override || process.env.REVIEWRADAR_MARKET_INDEX_PATH;
  return path.resolve(/* turbopackIgnore: true */
    configured || path.join(process.cwd(), ".reviewradar-cache", "market-evidence-index.json"),
  );
}

function emptyIndex(): MarketEvidenceIndex {
  return { attempts: {}, entries: {}, version: MARKET_EVIDENCE_INDEX_VERSION };
}

function emptyTierCounts(): Record<MarketEvidenceTier, number> {
  return { none: 0, strong: 0, supported: 0 };
}

function marketEvidenceKey(input: RecommendationApiRequest) {
  return scoutCacheKey(input, MARKET_SCOUT_MODEL, MARKET_SCOUT_PROMPT_VERSION);
}

function normalizedStoredTargets(targets: MarketScoutTarget[]) {
  const seen = new Set<string>();
  return targets.flatMap((target, consensusOrder) => {
    const brand = target.brand.trim();
    const model = target.model.trim();
    const identity = `${brand.toLowerCase()}|${model.toLowerCase()}`;
    if (!brand || !model || seen.has(identity)) return [];
    seen.add(identity);

    const sourceUrls = [...new Set(target.sourceUrls.flatMap((sourceUrl) => {
      const canonical = canonicalSourceUrl(sourceUrl);
      return canonical ? [canonical] : [];
    }))];
    const evidenceTier = tierForSources(sourceUrls);
    if (evidenceTier === "none") return [];

    return [
      {
        aliases: [...new Set(target.aliases.map((alias) => alias.trim()).filter(Boolean))]
          .slice(0, 4),
        brand,
        consensusOrder,
        evidenceTier,
        model,
        sourceUrls,
      } satisfies MarketScoutTarget,
    ];
  });
}

async function readIndex(indexPath: string) {
  try {
    const metadata = await stat(indexPath);
    if (!metadata.isFile() || metadata.size > MARKET_EVIDENCE_INDEX_MAX_BYTES) {
      return { index: null, status: "invalid" as const };
    }
    const parsed = indexSchema.safeParse(JSON.parse(await readFile(indexPath, "utf8")));
    return parsed.success
      ? { index: parsed.data, status: "valid" as const }
      : { index: null, status: "invalid" as const };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { index: emptyIndex(), status: "missing" as const };
    }
    return { index: null, status: "invalid" as const };
  }
}

function fallbackTelemetry(
  status: Exclude<MarketEvidenceIndexStatus, "fresh">,
  ageMs: number | null,
  lastRefreshAttempt: MarketEvidenceRefreshAttempt | null = null,
): MarketEvidenceLookupTelemetry {
  return {
    acceptedSourceUrls: 0,
    cacheHit: false,
    evidenceTiers: emptyTierCounts(),
    fallbackReason:
      status === "invalid"
        ? "index_invalid"
        : status === "stale"
          ? "index_stale"
          : "index_miss",
    hostedSearchCalls: 0,
    indexAgeMs: ageMs,
    indexedResearch: null,
    indexStatus: status,
    inputTokens: 0,
    openAiCalls: 0,
    outputTokens: 0,
    promptChars: 0,
    promptVersion: MARKET_SCOUT_PROMPT_VERSION,
    lastRefreshAttempt,
    refreshRecommended: true,
    rejectedSourceUrls: 0,
    systemPromptChars: 0,
    totalTokens: 0,
    usedFallback: true,
  };
}

function freshTelemetry(
  entry: MarketEvidenceIndexEntry,
  targets: MarketScoutTarget[],
  ageMs: number,
  lastRefreshAttempt: MarketEvidenceRefreshAttempt | null,
): MarketEvidenceLookupTelemetry {
  const evidenceTiers = emptyTierCounts();
  for (const target of targets) evidenceTiers[target.evidenceTier] += 1;
  return {
    acceptedSourceUrls: targets.reduce(
      (total, target) => total + target.sourceUrls.length,
      0,
    ),
    cacheHit: true,
    evidenceTiers,
    hostedSearchCalls: 0,
    indexAgeMs: ageMs,
    indexedResearch: entry.research,
    indexStatus: "fresh",
    inputTokens: 0,
    openAiCalls: 0,
    outputTokens: 0,
    promptChars: 0,
    promptVersion: MARKET_SCOUT_PROMPT_VERSION,
    lastRefreshAttempt,
    refreshRecommended: ageMs >= MARKET_EVIDENCE_REFRESH_AFTER_MS,
    rejectedSourceUrls: 0,
    systemPromptChars: 0,
    totalTokens: 0,
    usedFallback: false,
  };
}

export async function lookupMarketEvidence(options: {
  indexPath?: string;
  input: RecommendationApiRequest;
  now?: () => number;
}): Promise<MarketEvidenceLookup> {
  const now = options.now || Date.now;
  const fallbackPlan = {
    queries: neutralShoppingQueries(options.input),
    targets: [],
  };
  const stored = await readIndex(configuredIndexPath(options.indexPath));
  if (!stored.index) {
    return {
      needsRefresh: true,
      plan: fallbackPlan,
      telemetry: fallbackTelemetry("invalid", null),
    };
  }

  const key = marketEvidenceKey(options.input);
  const entry = stored.index.entries[key];
  const lastRefreshAttempt = stored.index.attempts[key] || null;
  if (!entry) {
    return {
      needsRefresh: true,
      plan: fallbackPlan,
      telemetry: fallbackTelemetry("miss", null, lastRefreshAttempt),
    };
  }
  const ageMs = Math.max(0, now() - entry.createdAtMs);
  if (
    entry.model !== MARKET_SCOUT_MODEL ||
    entry.promptVersion !== MARKET_SCOUT_PROMPT_VERSION ||
    ageMs >= MARKET_EVIDENCE_FRESH_MS
  ) {
    return {
      needsRefresh: true,
      plan: fallbackPlan,
      telemetry: fallbackTelemetry("stale", ageMs, lastRefreshAttempt),
    };
  }

  const targets = normalizedStoredTargets(entry.targets);
  if (targets.length === 0) {
    return {
      needsRefresh: true,
      plan: fallbackPlan,
      telemetry: fallbackTelemetry("invalid", ageMs, lastRefreshAttempt),
    };
  }

  const telemetry = freshTelemetry(entry, targets, ageMs, lastRefreshAttempt);
  return {
    needsRefresh: telemetry.refreshRecommended,
    plan: { queries: neutralShoppingQueries(options.input), targets },
    telemetry,
  };
}

function refreshResearch(
  telemetry: Awaited<ReturnType<typeof buildMarketScoutPlan>>["telemetry"],
): MarketEvidenceIndexEntry["research"] {
  return {
    acceptedSourceUrls: telemetry.acceptedSourceUrls,
    evidenceTiers: telemetry.evidenceTiers,
    hostedSearchCalls: telemetry.hostedSearchCalls,
    inputTokens: telemetry.inputTokens,
    openAiCalls: telemetry.openAiCalls,
    outputTokens: telemetry.outputTokens,
    totalTokens: telemetry.totalTokens,
  };
}

function persistedFallbackReason(
  reason: Awaited<ReturnType<typeof buildMarketScoutPlan>>["telemetry"]["fallbackReason"],
): MarketEvidenceRefreshAttempt["fallbackReason"] {
  return reason === "insufficient_evidence" ||
    reason === "invalid_output" ||
    reason === "no_client" ||
    reason === "provider_error" ||
    reason === "timeout" ||
    reason === "tool_call_ceiling"
    ? reason
    : undefined;
}

async function writeRefreshOutcome(options: {
  createdAtMs: number;
  fallbackReason?: MarketEvidenceRefreshAttempt["fallbackReason"];
  indexPath: string;
  input: RecommendationApiRequest;
  research: MarketEvidenceIndexEntry["research"];
  status: "failed" | "updated";
  targets: MarketScoutTarget[];
}) {
  const queued = writeQueue.then(async () => {
    const stored = await readIndex(options.indexPath);
    const index = stored.index || emptyIndex();
    const minimumCreatedAt = options.createdAtMs - MARKET_EVIDENCE_FRESH_MS;
    const key = marketEvidenceKey(options.input);
    const retainedEntries = Object.entries(index.entries)
      .filter(([, entry]) => entry.createdAtMs >= minimumCreatedAt)
      .sort((first, second) => second[1].createdAtMs - first[1].createdAtMs)
      .filter(([entryKey]) => entryKey !== key)
      .slice(
        0,
        options.status === "updated"
          ? MARKET_EVIDENCE_INDEX_MAX_ENTRIES - 1
          : MARKET_EVIDENCE_INDEX_MAX_ENTRIES,
      );
    const retainedAttempts = Object.entries(index.attempts)
      .filter(([, attempt]) => attempt.completedAtMs >= minimumCreatedAt)
      .sort((first, second) => second[1].completedAtMs - first[1].completedAtMs)
      .filter(([attemptKey]) => attemptKey !== key)
      .slice(0, MARKET_EVIDENCE_INDEX_MAX_ENTRIES - 1);
    const targets = normalizedStoredTargets(options.targets);
    if (options.status === "updated" && targets.length === 0) {
      throw new Error("No valid market targets to index.");
    }
    const attempt: MarketEvidenceRefreshAttempt = {
      completedAtMs: options.createdAtMs,
      ...(options.fallbackReason ? { fallbackReason: options.fallbackReason } : {}),
      research: options.research,
      status: options.status,
      targetCount: targets.length,
    };
    const next: MarketEvidenceIndex = {
      attempts: Object.fromEntries([[key, attempt], ...retainedAttempts]),
      entries:
        options.status === "updated"
          ? Object.fromEntries([
              [
                key,
                {
                  createdAtMs: options.createdAtMs,
                  model: MARKET_SCOUT_MODEL,
                  promptVersion: MARKET_SCOUT_PROMPT_VERSION,
                  research: options.research,
                  targets,
                } satisfies MarketEvidenceIndexEntry,
              ],
              ...retainedEntries,
            ])
          : Object.fromEntries(
              index.entries[key]
                ? [[key, index.entries[key]], ...retainedEntries]
                : retainedEntries,
            ),
      version: MARKET_EVIDENCE_INDEX_VERSION,
    };
    const serialized = `${JSON.stringify(next)}\n`;
    if (Buffer.byteLength(serialized) > MARKET_EVIDENCE_INDEX_MAX_BYTES) {
      throw new Error("Market evidence index exceeded its size ceiling.");
    }

    await mkdir(path.dirname(options.indexPath), { recursive: true });
    const temporaryPath = `${options.indexPath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporaryPath, options.indexPath);
    } finally {
      await unlink(temporaryPath).catch(() => {});
    }
  });
  writeQueue = queued.then(
    () => {},
    () => {},
  );
  await queued;
}

export function refreshMarketEvidenceIndex(options: {
  client?: OpenAIResponsesClient | null;
  force?: boolean;
  indexPath?: string;
  input: RecommendationApiRequest;
  now?: () => number;
}): Promise<MarketEvidenceRefreshResult> {
  const now = options.now || Date.now;
  const key = marketEvidenceKey(options.input);
  const existing = inFlightRefreshes.get(key);
  if (existing) return existing;
  if (activeRefreshes >= 1) {
    return Promise.resolve({ scouted: null, status: "busy" });
  }

  const lastAttempt = refreshAttempts.get(key) || 0;
  if (!options.force && now() - lastAttempt < MARKET_EVIDENCE_REFRESH_COOLDOWN_MS) {
    return Promise.resolve({ scouted: null, status: "throttled" });
  }
  refreshAttempts.set(key, now());
  activeRefreshes += 1;

  const refresh = (async (): Promise<MarketEvidenceRefreshResult> => {
    const scouted = await buildMarketScoutPlan({
      client: options.client,
      input: options.input,
      promptVersion: MARKET_SCOUT_PROMPT_VERSION,
    });
    const createdAtMs = now();
    const indexPath = configuredIndexPath(options.indexPath);
    const research = refreshResearch(scouted.telemetry);
    if (scouted.telemetry.usedFallback || scouted.plan.targets.length === 0) {
      await writeRefreshOutcome({
        createdAtMs,
        fallbackReason: persistedFallbackReason(scouted.telemetry.fallbackReason),
        indexPath,
        input: options.input,
        research,
        status: "failed",
        targets: [],
      });
      return { scouted, status: "failed" };
    }
    await writeRefreshOutcome({
      createdAtMs,
      indexPath,
      input: options.input,
      research,
      status: "updated",
      targets: scouted.plan.targets,
    });
    return { scouted, status: "updated" };
  })().finally(() => {
    activeRefreshes = Math.max(0, activeRefreshes - 1);
    if (inFlightRefreshes.get(key) === refresh) inFlightRefreshes.delete(key);
  });
  inFlightRefreshes.set(key, refresh);
  return refresh;
}

export function clearMarketEvidenceIndexStateForTests() {
  refreshAttempts.clear();
  inFlightRefreshes.clear();
  writeQueue = Promise.resolve();
  activeRefreshes = 0;
}

export const marketEvidenceIndexTestExports = {
  configuredIndexPath,
  indexSchema,
  marketEvidenceKey,
  normalizedStoredTargets,
};

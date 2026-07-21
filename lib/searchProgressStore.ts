// In-memory store for live search-progress narration. Mirrors the
// two-layer job store's process-local pattern: entries are TTL-bounded,
// capacity-capped, and swept opportunistically, so an abandoned or crashed
// request can never grow memory without bound. Every exported function is
// deliberately never-throw — progress reporting must not be able to break
// the recommendation pipeline it narrates.
//
// Process-local by design: the dev/self-hosted `next start` deployment this
// repo targets serves the POST pipeline and the progress poll from one
// process. A multi-instance deployment would need a shared backend (for
// example Redis) behind these same functions.

import {
  isValidSearchProgressId,
  milestoneForStage,
  SEARCH_PROGRESS_ID_HEADER,
  SEARCH_PROGRESS_MILESTONES,
  type SearchProgressEvent,
  type SearchProgressMilestoneKey,
  type SearchProgressPollResponse,
  type SearchProgressSnapshot,
  type SearchProgressStatus,
} from "./searchProgress.ts";

const VALID_MILESTONE_KEYS = new Set<SearchProgressMilestoneKey>(
  SEARCH_PROGRESS_MILESTONES.map((milestone) => milestone.key),
);

type SearchProgressRecord = {
  events: SearchProgressEvent[];
  sequence: number;
  startedAtMs: number;
  status: SearchProgressStatus;
  updatedAtMs: number;
};

const SEARCH_PROGRESS_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKED_SEARCHES = 64;
const MAX_EVENTS_PER_SEARCH = 60;

const records = new Map<string, SearchProgressRecord>();
let clock: () => number = Date.now;

function evictExpired(nowMs: number) {
  for (const [id, record] of records) {
    if (nowMs - record.updatedAtMs > SEARCH_PROGRESS_TTL_MS) {
      records.delete(id);
    }
  }
}

function evictOldestIfFull() {
  if (records.size < MAX_TRACKED_SEARCHES) {
    return;
  }
  let oldestId: string | null = null;
  let oldestUpdatedAtMs = Number.POSITIVE_INFINITY;
  for (const [id, record] of records) {
    if (record.updatedAtMs < oldestUpdatedAtMs) {
      oldestUpdatedAtMs = record.updatedAtMs;
      oldestId = id;
    }
  }
  if (oldestId !== null) {
    records.delete(oldestId);
  }
}

export function beginSearchProgress(id: string) {
  try {
    if (!isValidSearchProgressId(id)) {
      return;
    }
    const nowMs = clock();
    evictExpired(nowMs);
    if (!records.has(id)) {
      evictOldestIfFull();
    }
    records.set(id, {
      events: [],
      sequence: 0,
      startedAtMs: nowMs,
      status: "running",
      updatedAtMs: nowMs,
    });
  } catch {
    // Progress narration is best-effort only.
  }
}

export function reportSearchProgressStage(id: string, stageLabel: string) {
  try {
    const record = records.get(id);
    if (!record || record.status !== "running") {
      return;
    }
    const milestone = milestoneForStage(stageLabel);
    if (!milestone) {
      return;
    }
    const nowMs = clock();
    record.updatedAtMs = nowMs;
    const lastEvent = record.events[record.events.length - 1];
    if (lastEvent && lastEvent.milestone === milestone) {
      lastEvent.atMs = nowMs;
      return;
    }
    if (record.events.length >= MAX_EVENTS_PER_SEARCH) {
      return;
    }
    record.sequence += 1;
    record.events.push({ atMs: nowMs, milestone, sequence: record.sequence });
  } catch {
    // Progress narration is best-effort only.
  }
}

// Report a milestone by key directly (as opposed to via a timing stage label).
// Used by pipelines that do not run through `createRequestTiming` — e.g. the
// background direct-Terra job, which reports across multiple poll requests.
// The roadmap is monotonic, so a milestone appears at most once; re-reporting a
// milestone (or a whole prefix) is idempotent and keeps the roadmap contiguous.
export function reportSearchProgressMilestone(
  id: string,
  milestone: SearchProgressMilestoneKey,
) {
  try {
    const record = records.get(id);
    if (!record || record.status !== "running") {
      return;
    }
    if (!VALID_MILESTONE_KEYS.has(milestone)) {
      return;
    }
    const nowMs = clock();
    record.updatedAtMs = nowMs;
    if (record.events.some((event) => event.milestone === milestone)) {
      return;
    }
    if (record.events.length >= MAX_EVENTS_PER_SEARCH) {
      return;
    }
    record.sequence += 1;
    record.events.push({ atMs: nowMs, milestone, sequence: record.sequence });
  } catch {
    // Progress narration is best-effort only.
  }
}

export function completeSearchProgress(
  id: string,
  status: Exclude<SearchProgressStatus, "running">,
) {
  try {
    const record = records.get(id);
    if (!record || record.status !== "running") {
      return;
    }
    record.status = status;
    record.updatedAtMs = clock();
  } catch {
    // Progress narration is best-effort only.
  }
}

export function getSearchProgress(id: string): SearchProgressSnapshot | null {
  try {
    if (!isValidSearchProgressId(id)) {
      return null;
    }
    evictExpired(clock());
    const record = records.get(id);
    if (!record) {
      return null;
    }
    return {
      events: [...record.events],
      startedAtMs: record.startedAtMs,
      status: record.status,
      updatedAtMs: record.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export function searchProgressIdFromRequest(request: Request): string | null {
  try {
    const raw = request.headers.get(SEARCH_PROGRESS_ID_HEADER) || "";
    return isValidSearchProgressId(raw) ? raw : null;
  } catch {
    return null;
  }
}

const UNKNOWN_PROGRESS_RESPONSE: SearchProgressPollResponse = {
  events: [],
  startedAtMs: 0,
  status: "unknown",
  updatedAtMs: 0,
};

export function createSearchProgressGetHandler() {
  return (request: Request) => {
    let id = "";
    try {
      id = new URL(request.url).searchParams.get("id") || "";
    } catch {
      // Fall through to the unknown response.
    }
    const snapshot = getSearchProgress(id);
    const body: SearchProgressPollResponse = snapshot ?? UNKNOWN_PROGRESS_RESPONSE;
    return Response.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  };
}

export const searchProgressTestExports = {
  limits: {
    maxEventsPerSearch: MAX_EVENTS_PER_SEARCH,
    maxTrackedSearches: MAX_TRACKED_SEARCHES,
    ttlMs: SEARCH_PROGRESS_TTL_MS,
  },
  resetSearchProgressStore() {
    records.clear();
    clock = Date.now;
  },
  setSearchProgressClock(nextClock: (() => number) | null) {
    clock = nextClock || Date.now;
  },
  trackedSearchCount() {
    return records.size;
  },
};

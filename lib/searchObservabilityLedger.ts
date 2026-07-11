import { AsyncLocalStorage } from "node:async_hooks";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import type {
  ProductDiscoveryGapCheck,
  ProductDiscoveryStrategy,
  ProductRecommendation,
  RawProductCandidate,
  SearchQueryCandidate,
} from "@/types/review-radar";
import type { FinalSelectionTraceEntry } from "./recommendationFunnel.ts";
import type {
  SearchPlanObservabilityObserver,
  SearchQueryCullReason,
  SearchQueryOrigin,
  SearchQueryPurpose,
} from "./searchObservabilityTypes.ts";

export type {
  SearchQueryCullReason,
  SearchQueryOrigin,
  SearchQueryPurpose,
} from "./searchObservabilityTypes.ts";

const MAX_QUERIES = 240;
const MAX_QUERY_EVENTS = 12;
const MAX_ATTEMPTS = 240;
const MAX_RESULTS_PER_ATTEMPT = 10;
const MAX_CANDIDATES = 480;
const MAX_PROVENANCE_LINKS = 20;
const MAX_TEXT = 300;

export type CandidateFirstLossStage =
  | "lost_in_normalization"
  | "raw_dedupe"
  | "cheap_prefilter"
  | "candidate_merge"
  | "citation_verification"
  | "requirement_validation"
  | "revalidation"
  | "final_selection"
  | "never_dispatched"
  | "unknown";

export type SearchQueryContext = {
  queryId?: string;
  origin: SearchQueryOrigin;
  phase: string;
  purpose: SearchQueryPurpose;
  originalQuery?: string;
  parentQueryId?: string;
  sourceDetail?: string;
};

type QueryAssemblyEvent = {
  action:
    | "born"
    | "merged"
    | "culled"
    | "recategorized"
    | "dispatched";
  detail: string;
  targetQueryId?: string;
};

type SearchQueryRecord = {
  id: string;
  origin: SearchQueryOrigin;
  phase: string;
  purpose: SearchQueryPurpose;
  sourceDetail: string | null;
  parentQueryId: string | null;
  originalQuery: string;
  normalizedQuery: string;
  finalOutboundQuery: string | null;
  family: string | null;
  stage: number | null;
  searchType: string | null;
  endpoint: string | null;
  status: "planned" | "culled" | "dispatched";
  cullReason: SearchQueryCullReason | null;
  cap: string | null;
  mergedIntoQueryId: string | null;
  events: QueryAssemblyEvent[];
};

export type SearchResultDigest = {
  position: number;
  title: string;
  host: string;
  price: number | null;
};

type SearchCacheLookup = {
  queryId: string;
  cacheKey: string;
  outcome: "hit" | "miss";
};

type SearchAttemptRecord = {
  requestId: string;
  queryId: string;
  origin: SearchQueryOrigin | "untracked";
  phase: string;
  attemptNumber: number;
  retryStatus: "initial" | "retry";
  verticalFallbackStatus: "none" | "fallback_initial" | "fallback_retry";
  endpoint: string;
  searchType: string;
  originalQuery: string;
  normalizedQuery: string;
  finalOutboundQuery: string;
  requestBody: {
    gl: string;
    hl: string;
    num: number;
    q: string;
  };
  responseStatus: number | null;
  durationMs: number;
  rawResultCount: number;
  results: SearchResultDigest[];
  error: string | null;
};

type CandidateFirstLoss = {
  stage: CandidateFirstLossStage;
  subreason: string;
};

type CandidateLineageRecord = {
  candidateId: string;
  name: string;
  productUrl: string;
  source: "serper" | "final_openai_research" | "raw_serper_result";
  queryIds: string[];
  normalized: boolean;
  prefilterAccepted: boolean | null;
  mergedIntoCandidateId: string | null;
  identityCollapsedInto: string | null;
  citationVerification: "passed" | "failed" | "not_reached";
  requirementValidation: {
    result: "passed" | "near" | "failed" | "not_reached";
    passed: string[];
    failed: string[];
    unknown: string[];
  };
  revalidation: "exact" | "near" | "failed" | "not_reached";
  finalOutcome: "exact" | "near" | "neither";
  finalScore: number | null;
  selected: boolean;
  finalSelectionReason: string | null;
  firstLoss: CandidateFirstLoss | null;
};

export type SearchLedgerHeader = {
  requestId: string;
  commitHash: string;
  flags: Record<string, string>;
  helperModel: string;
  finalModel: string;
  serperCacheEmptyAtStart: boolean;
};

type SearchLedgerState = {
  header: SearchLedgerHeader;
  queryCounter: number;
  candidateCounter: number;
  queries: SearchQueryRecord[];
  queryById: Map<string, SearchQueryRecord>;
  cacheLookups: SearchCacheLookup[];
  attempts: SearchAttemptRecord[];
  rawResultsByQuery: Map<string, SearchResultDigest[]>;
  candidates: Map<string, CandidateLineageRecord>;
  rawAi: {
    strategy: ProductDiscoveryStrategy | null;
    gapCheck: ProductDiscoveryGapCheck | null;
  };
};

export type SearchLedgerStageInput = {
  candidatePool: ProductRecommendation[];
  citationValid: ProductRecommendation[];
  requirementExact: ProductRecommendation[];
  requirementNear: ProductRecommendation[];
  revalidatedExact: ProductRecommendation[];
  revalidatedNear: ProductRecommendation[];
  finalExact: ProductRecommendation[];
  finalNear: ProductRecommendation[];
  finalSelectionTrace: FinalSelectionTraceEntry[];
};

const storage = new AsyncLocalStorage<SearchLedgerState>();
const queryIdSymbol = Symbol("reviewRadarSearchQueryId");

function boundedText(value: unknown, max = MAX_TEXT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeObservedQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productKey(name: string, url: string) {
  return `${normalizeObservedQuery(name)}|${normalizeObservedQuery(url)}`;
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function currentLedger() {
  return storage.getStore();
}

function nextQueryId(ledger: SearchLedgerState) {
  ledger.queryCounter += 1;
  return `q-${String(ledger.queryCounter).padStart(4, "0")}`;
}

function nextCandidateId(ledger: SearchLedgerState, prefix = "candidate") {
  ledger.candidateCounter += 1;
  return `${prefix}-${String(ledger.candidateCounter).padStart(4, "0")}`;
}

function queryForId(ledger: SearchLedgerState, queryId: string | undefined) {
  return queryId ? ledger.queryById.get(queryId) : undefined;
}

function addQueryEvent(query: SearchQueryRecord, event: QueryAssemblyEvent) {
  if (query.events.length < MAX_QUERY_EVENTS) {
    query.events.push(event);
  }
}

export function createSearchObservabilityLedger(
  header: Omit<SearchLedgerHeader, "requestId"> & { requestId?: string },
): SearchLedgerState {
  const requestId = header.requestId || randomUUID();

  return {
    header: {
      ...header,
      requestId,
    },
    queryCounter: 0,
    candidateCounter: 0,
    queries: [],
    queryById: new Map(),
    cacheLookups: [],
    attempts: [],
    rawResultsByQuery: new Map(),
    candidates: new Map(),
    rawAi: {
      strategy: null,
      gapCheck: null,
    },
  };
}

export function runWithSearchObservabilityLedger<T>(
  ledger: SearchLedgerState | null,
  callback: () => T,
) {
  return ledger ? storage.run(ledger, callback) : callback();
}

export function isSearchObservabilityEnabled() {
  return Boolean(currentLedger());
}

export function registerSearchQuery(input: {
  origin: SearchQueryOrigin;
  phase: string;
  purpose?: SearchQueryPurpose;
  query: string;
  family?: string;
  stage?: number;
  parentQueryId?: string;
  sourceDetail?: string;
}) {
  const ledger = currentLedger();

  if (!ledger || ledger.queries.length >= MAX_QUERIES) {
    return undefined;
  }

  const id = nextQueryId(ledger);
  const record: SearchQueryRecord = {
    id,
    origin: input.origin,
    phase: boundedText(input.phase, 80),
    purpose: input.purpose || "product_discovery",
    sourceDetail: input.sourceDetail ? boundedText(input.sourceDetail, 100) : null,
    parentQueryId: input.parentQueryId || null,
    originalQuery: boundedText(input.query),
    normalizedQuery: normalizeObservedQuery(input.query),
    finalOutboundQuery: null,
    family: input.family || null,
    stage: input.stage ?? null,
    searchType: null,
    endpoint: null,
    status: "planned",
    cullReason: null,
    cap: null,
    mergedIntoQueryId: null,
    events: [
      {
        action: "born",
        detail: boundedText(input.sourceDetail || input.origin, 120),
      },
    ],
  };

  ledger.queries.push(record);
  ledger.queryById.set(id, record);
  return id;
}

export function attachSearchQueryId<T extends SearchQueryCandidate>(
  candidate: T,
  queryId: string | undefined,
): T {
  if (!queryId) {
    return candidate;
  }

  Object.defineProperty(candidate, queryIdSymbol, {
    configurable: true,
    enumerable: false,
    value: queryId,
  });
  return candidate;
}

export function searchQueryId(candidate: SearchQueryCandidate) {
  return (candidate as SearchQueryCandidate & { [queryIdSymbol]?: string })[
    queryIdSymbol
  ];
}

export function queryOrigin(queryId: string | undefined) {
  const ledger = currentLedger();
  return ledger && queryId ? ledger.queryById.get(queryId)?.origin : undefined;
}

export function recordQueryMerge(
  queryId: string | undefined,
  survivingQueryId: string | undefined,
) {
  const ledger = currentLedger();
  const query = ledger ? queryForId(ledger, queryId) : undefined;

  if (!query) {
    return;
  }

  query.status = "culled";
  query.cullReason = "deduplicated";
  query.mergedIntoQueryId = survivingQueryId || null;
  addQueryEvent(query, {
    action: "merged",
    detail: "normalized query duplicate",
    ...(survivingQueryId ? { targetQueryId: survivingQueryId } : {}),
  });
}

export function recordQueryCull(
  queryId: string | undefined,
  reason: SearchQueryCullReason,
  cap: string,
) {
  const ledger = currentLedger();
  const query = ledger ? queryForId(ledger, queryId) : undefined;

  if (!query || query.status === "dispatched") {
    return;
  }

  query.status = "culled";
  query.cullReason = reason;
  query.cap = boundedText(cap, 120);
  addQueryEvent(query, {
    action: reason === "recategorized_to_organic" ? "recategorized" : "culled",
    detail: `${reason}: ${query.cap}`,
  });
}

export function recordQueryRecategorized(
  queryId: string | undefined,
  detail: string,
) {
  const ledger = currentLedger();
  const query = ledger ? queryForId(ledger, queryId) : undefined;

  if (!query) {
    return;
  }

  addQueryEvent(query, {
    action: "recategorized",
    detail: boundedText(detail, 120),
  });
}

export function ensureDispatchedQuery(
  context: SearchQueryContext,
  finalOutboundQuery: string,
  searchType: string,
  endpoint: string,
) {
  const ledger = currentLedger();

  if (!ledger) {
    return undefined;
  }

  let query = queryForId(ledger, context.queryId);

  if (!query) {
    const queryId = registerSearchQuery({
      origin: context.origin,
      phase: context.phase,
      purpose: context.purpose,
      query: context.originalQuery || finalOutboundQuery,
      parentQueryId: context.parentQueryId,
      sourceDetail: context.sourceDetail,
    });
    query = queryForId(ledger, queryId);
  }

  if (!query) {
    return undefined;
  }

  query.status = "dispatched";
  query.cullReason = null;
  query.cap = null;
  query.finalOutboundQuery = boundedText(finalOutboundQuery);
  query.searchType = boundedText(searchType, 60);
  query.endpoint = boundedText(endpoint);
  addQueryEvent(query, {
    action: "dispatched",
    detail: `${searchType} ${endpoint}`,
  });
  return query.id;
}

export function recordSearchCacheLookup(input: {
  queryId: string | undefined;
  cacheKey: string;
  outcome: "hit" | "miss";
}) {
  const ledger = currentLedger();

  if (!ledger || !input.queryId || ledger.cacheLookups.length >= MAX_QUERIES) {
    return;
  }

  ledger.cacheLookups.push({
    queryId: input.queryId,
    cacheKey: boundedText(input.cacheKey, 200),
    outcome: input.outcome,
  });
}

export function recordSearchAttempt(
  input: Omit<SearchAttemptRecord, "requestId" | "origin" | "phase">,
) {
  const ledger = currentLedger();

  if (!ledger || ledger.attempts.length >= MAX_ATTEMPTS) {
    return;
  }

  const query = queryForId(ledger, input.queryId);

  ledger.attempts.push({
    ...input,
    requestId: ledger.header.requestId,
    origin: query?.origin || "untracked",
    phase: query?.phase || "untracked",
    endpoint: boundedText(input.endpoint),
    originalQuery: boundedText(input.originalQuery),
    normalizedQuery: boundedText(input.normalizedQuery),
    finalOutboundQuery: boundedText(input.finalOutboundQuery),
    error: input.error ? boundedText(input.error, 160) : null,
    results: input.results.slice(0, MAX_RESULTS_PER_ATTEMPT),
  });
}

export function recordLogicalSearchResults(
  queryId: string | undefined,
  results: SearchResultDigest[],
) {
  const ledger = currentLedger();

  if (!ledger || !queryId) {
    return;
  }

  ledger.rawResultsByQuery.set(
    queryId,
    results.slice(0, MAX_RESULTS_PER_ATTEMPT),
  );
}

function addProvenance(candidate: CandidateLineageRecord, queryId: string) {
  if (
    !candidate.queryIds.includes(queryId) &&
    candidate.queryIds.length < MAX_PROVENANCE_LINKS
  ) {
    candidate.queryIds.push(queryId);
  }
}

function serperCandidateRecord(
  ledger: SearchLedgerState,
  candidate: RawProductCandidate,
) {
  const existing = ledger.candidates.get(candidate.id);

  if (existing) {
    existing.name = existing.name || boundedText(candidate.name, 180);
    existing.productUrl = existing.productUrl || boundedText(candidate.productUrl);
    existing.normalized = true;
    return existing;
  }

  const record: CandidateLineageRecord = {
    candidateId: candidate.id,
    name: boundedText(candidate.name, 180),
    productUrl: boundedText(candidate.productUrl),
    source: "serper",
    queryIds: [],
    normalized: true,
    prefilterAccepted: null,
    mergedIntoCandidateId: null,
    identityCollapsedInto: null,
    citationVerification: "not_reached",
    requirementValidation: {
      result: "not_reached",
      passed: [],
      failed: [],
      unknown: [],
    },
    revalidation: "not_reached",
    finalOutcome: "neither",
    finalScore: null,
    selected: false,
    finalSelectionReason: null,
    firstLoss: null,
  };

  if (ledger.candidates.size < MAX_CANDIDATES) {
    ledger.candidates.set(candidate.id, record);
  }
  return record;
}

function setFirstLoss(
  candidate: CandidateLineageRecord,
  stage: CandidateFirstLossStage,
  subreason: string,
) {
  if (!candidate.firstLoss) {
    candidate.firstLoss = {
      stage,
      subreason: boundedText(subreason, 180),
    };
  }
}

export function recordNormalizedCandidates(
  queryId: string | undefined,
  candidates: RawProductCandidate[],
  rejectionReasons: Array<{
    title: string;
    host: string;
    rejectionReason: string | null;
  }> = [],
) {
  const ledger = currentLedger();

  if (!ledger || !queryId) {
    return;
  }

  const normalizedTitles = new Set(
    candidates.map((candidate) => normalizeObservedQuery(candidate.name)),
  );

  for (const candidate of candidates) {
    const record = serperCandidateRecord(ledger, candidate);
    addProvenance(record, queryId);
  }

  const rejectionByKey = new Map(
    rejectionReasons.map((item) => [
      `${normalizeObservedQuery(item.title)}|${item.host.toLowerCase()}`,
      item.rejectionReason,
    ]),
  );

  for (const [index, digest] of (ledger.rawResultsByQuery.get(queryId) || []).entries()) {
    const normalizedTitle = normalizeObservedQuery(digest.title);

    if (!normalizedTitle || normalizedTitles.has(normalizedTitle)) {
      continue;
    }

    if (ledger.candidates.size >= MAX_CANDIDATES) {
      break;
    }

    const candidateId = `raw-${queryId}-${String(index + 1).padStart(2, "0")}`;
    const record: CandidateLineageRecord = {
      candidateId,
      name: boundedText(digest.title, 180),
      productUrl: "",
      source: "raw_serper_result",
      queryIds: [queryId],
      normalized: false,
      prefilterAccepted: null,
      mergedIntoCandidateId: null,
      identityCollapsedInto: null,
      citationVerification: "not_reached",
      requirementValidation: {
        result: "not_reached",
        passed: [],
        failed: [],
        unknown: [],
      },
      revalidation: "not_reached",
      finalOutcome: "neither",
      finalScore: null,
      selected: false,
      finalSelectionReason: null,
      firstLoss: null,
    };
    const specificReason = rejectionByKey.get(
      `${normalizedTitle}|${digest.host.toLowerCase()}`,
    );
    setFirstLoss(
      record,
      "lost_in_normalization",
      specificReason || "normalizer_rejected_result",
    );
    ledger.candidates.set(candidateId, record);
  }
}

export function recordCandidateMerge(
  survivingCandidate: RawProductCandidate,
  mergedCandidate: RawProductCandidate,
  reason = "raw_candidate_key_duplicate",
) {
  const ledger = currentLedger();

  if (!ledger) {
    return;
  }

  const survivor = serperCandidateRecord(ledger, survivingCandidate);
  const merged = serperCandidateRecord(ledger, mergedCandidate);

  for (const queryId of merged.queryIds) {
    addProvenance(survivor, queryId);
  }
  if (survivor.candidateId === merged.candidateId) {
    return;
  }
  merged.mergedIntoCandidateId = survivor.candidateId;
  setFirstLoss(merged, "raw_dedupe", reason);
}

export function recordCandidatePrefilter(
  candidate: RawProductCandidate,
  accepted: boolean,
  reason?: string,
) {
  const ledger = currentLedger();

  if (!ledger) {
    return;
  }

  const record = serperCandidateRecord(ledger, candidate);
  record.prefilterAccepted = accepted;

  if (!accepted) {
    setFirstLoss(record, "cheap_prefilter", reason || "prefilter_rejected");
  }
}

export function recordRawCandidateCapLoss(
  candidate: RawProductCandidate,
  reason: string,
) {
  const ledger = currentLedger();

  if (!ledger) {
    return;
  }

  setFirstLoss(serperCandidateRecord(ledger, candidate), "cheap_prefilter", reason);
}

export function recordCandidateDedupeCapLoss(
  candidate: RawProductCandidate,
  reason: string,
) {
  const ledger = currentLedger();

  if (!ledger) {
    return;
  }

  setFirstLoss(serperCandidateRecord(ledger, candidate), "raw_dedupe", reason);
}

function recommendationMatch(
  ledger: SearchLedgerState,
  product: ProductRecommendation,
) {
  const nameKey = normalizeObservedQuery(product.name);
  const urlKey = normalizeObservedQuery(product.product_page_url || "");
  const candidates = [...ledger.candidates.values()];

  return (
    candidates.find(
      (candidate) =>
        urlKey && normalizeObservedQuery(candidate.productUrl) === urlKey,
    ) ||
    candidates.find(
      (candidate) => normalizeObservedQuery(candidate.name) === nameKey,
    )
  );
}

function ensureRecommendationRecord(
  ledger: SearchLedgerState,
  product: ProductRecommendation,
) {
  const existing = recommendationMatch(ledger, product);

  if (existing) {
    return existing;
  }

  const candidateId = nextCandidateId(ledger, "ai");
  const record: CandidateLineageRecord = {
    candidateId,
    name: boundedText(product.name, 180),
    productUrl: boundedText(product.product_page_url),
    source: "final_openai_research",
    queryIds: [],
    normalized: true,
    prefilterAccepted: null,
    mergedIntoCandidateId: null,
    identityCollapsedInto: null,
    citationVerification: "not_reached",
    requirementValidation: {
      result: "not_reached",
      passed: [],
      failed: [],
      unknown: [],
    },
    revalidation: "not_reached",
    finalOutcome: "neither",
    finalScore: null,
    selected: false,
    finalSelectionReason: null,
    firstLoss: null,
  };

  if (ledger.candidates.size < MAX_CANDIDATES) {
    ledger.candidates.set(candidateId, record);
  }
  return record;
}

function recordSet(
  ledger: SearchLedgerState,
  products: ProductRecommendation[],
) {
  return new Set(
    products.map((product) => ensureRecommendationRecord(ledger, product).candidateId),
  );
}

function requirementDetails(product: ProductRecommendation | undefined) {
  return {
    passed: (product?.requirementCheck?.passed || []).slice(0, 16),
    failed: (product?.requirementCheck?.failed || []).slice(0, 16),
    unknown: (product?.requirementCheck?.unknown || []).slice(0, 16),
  };
}

function finalTraceFor(
  trace: FinalSelectionTraceEntry[],
  candidate: CandidateLineageRecord,
) {
  const nameKey = normalizeObservedQuery(candidate.name);
  const urlKey = normalizeObservedQuery(candidate.productUrl);

  return trace.find(
    (entry) =>
      (urlKey && normalizeObservedQuery(entry.productUrl) === urlKey) ||
      normalizeObservedQuery(entry.name) === nameKey,
  );
}

export function finalizeCandidateLineage(input: SearchLedgerStageInput) {
  const ledger = currentLedger();

  if (!ledger) {
    return;
  }

  const pool = recordSet(ledger, input.candidatePool);
  const citation = recordSet(ledger, input.citationValid);
  const requirementExact = recordSet(ledger, input.requirementExact);
  const requirementNear = recordSet(ledger, input.requirementNear);
  const revalidatedExact = recordSet(ledger, input.revalidatedExact);
  const revalidatedNear = recordSet(ledger, input.revalidatedNear);
  const finalExact = recordSet(ledger, input.finalExact);
  const finalNear = recordSet(ledger, input.finalNear);
  const productsByCandidateId = new Map<string, ProductRecommendation>();

  for (const product of [
    ...input.candidatePool,
    ...input.requirementExact,
    ...input.requirementNear,
    ...input.revalidatedExact,
    ...input.revalidatedNear,
    ...input.finalExact,
    ...input.finalNear,
  ]) {
    productsByCandidateId.set(
      ensureRecommendationRecord(ledger, product).candidateId,
      product,
    );
  }

  for (const candidate of ledger.candidates.values()) {
    if (candidate.firstLoss || candidate.source === "raw_serper_result") {
      continue;
    }

    if (!pool.has(candidate.candidateId)) {
      setFirstLoss(
        candidate,
        "candidate_merge",
        "not_present_after_ai_serper_candidate_merge",
      );
      continue;
    }

    if (!citation.has(candidate.candidateId)) {
      candidate.citationVerification = "failed";
      setFirstLoss(candidate, "citation_verification", "no_verified_citation");
      continue;
    }
    candidate.citationVerification = "passed";

    const product = productsByCandidateId.get(candidate.candidateId);
    const details = requirementDetails(product);

    if (requirementExact.has(candidate.candidateId)) {
      candidate.requirementValidation = { result: "passed", ...details };
    } else if (requirementNear.has(candidate.candidateId)) {
      candidate.requirementValidation = { result: "near", ...details };
    } else {
      candidate.requirementValidation = { result: "failed", ...details };
      setFirstLoss(
        candidate,
        "requirement_validation",
        [...details.failed, ...details.unknown].join("; ") ||
          "requirement_filter_excluded",
      );
      continue;
    }

    if (revalidatedExact.has(candidate.candidateId)) {
      candidate.revalidation = "exact";
    } else if (revalidatedNear.has(candidate.candidateId)) {
      candidate.revalidation = "near";
    } else {
      candidate.revalidation = "failed";
      setFirstLoss(
        candidate,
        "revalidation",
        [...details.failed, ...details.unknown].join("; ") ||
          "revalidation_excluded",
      );
      continue;
    }

    const trace = finalTraceFor(input.finalSelectionTrace, candidate);

    if (trace) {
      candidate.finalScore = trace.totalScore;
      candidate.selected = trace.selected;
      candidate.finalSelectionReason = trace.decisionReason;
      candidate.identityCollapsedInto = trace.collapsedBy;
    }

    if (finalExact.has(candidate.candidateId)) {
      candidate.finalOutcome = "exact";
      candidate.selected = true;
    } else if (finalNear.has(candidate.candidateId)) {
      candidate.finalOutcome = "near";
      candidate.selected = true;
    } else {
      candidate.finalOutcome = "neither";
      setFirstLoss(
        candidate,
        "final_selection",
        trace?.decisionReason || "missing_trace_reason",
      );
    }
  }
}

export function recordRawAiStrategy(strategy: ProductDiscoveryStrategy) {
  const ledger = currentLedger();

  if (ledger) {
    ledger.rawAi.strategy = structuredClone(strategy);
  }
}

export function recordRawAiGapCheck(gapCheck: ProductDiscoveryGapCheck) {
  const ledger = currentLedger();

  if (ledger) {
    ledger.rawAi.gapCheck = structuredClone(gapCheck);
  }
}

export const searchPlanObservabilityObserver: SearchPlanObservabilityObserver = {
  attachSearchQueryId,
  queryOrigin,
  recordQueryCull,
  recordQueryMerge,
  recordRawAiGapCheck,
  recordRawAiStrategy,
  registerSearchQuery,
  searchQueryId,
};

function finalizeUndispatchedQueries(ledger: SearchLedgerState) {
  for (const query of ledger.queries) {
    if (query.status !== "planned") {
      continue;
    }

    query.status = "culled";
    query.cullReason = "stage_not_reached";
    query.cap = "planned query was not reached by discovery orchestration";
    addQueryEvent(query, {
      action: "culled",
      detail: "stage_not_reached: planned query was not dispatched",
    });
  }
}

function contributionForQuery(
  ledger: SearchLedgerState,
  query: SearchQueryRecord,
) {
  const linked = [...ledger.candidates.values()].filter((candidate) =>
    candidate.queryIds.includes(query.id),
  );
  const normalized = linked.filter((candidate) => candidate.normalized);
  const unique = normalized.filter((candidate) => candidate.queryIds.length === 1);
  const rawResults = ledger.rawResultsByQuery.get(query.id)?.length || 0;
  const contribution = {
    queryId: query.id,
    origin: query.origin,
    purpose: query.purpose,
    rawResults,
    normalizedCandidates: normalized.length,
    uniqueCandidates: unique.length,
    citationValid: normalized.filter(
      (candidate) => candidate.citationVerification === "passed",
    ).length,
    requirementValid: normalized.filter(
      (candidate) => candidate.requirementValidation.result === "passed",
    ).length,
    revalidated: normalized.filter((candidate) =>
      ["exact", "near"].includes(candidate.revalidation),
    ).length,
    exactSelections: normalized.filter(
      (candidate) => candidate.finalOutcome === "exact",
    ).length,
    nearSelections: normalized.filter(
      (candidate) => candidate.finalOutcome === "near",
    ).length,
    zeroContribution:
      query.purpose === "product_discovery" ? unique.length === 0 : null,
  };

  return contribution;
}

export function buildSearchObservabilitySnapshot() {
  const ledger = currentLedger();

  if (!ledger) {
    return undefined;
  }

  finalizeUndispatchedQueries(ledger);
  const contributions = ledger.queries.map((query) =>
    contributionForQuery(ledger, query),
  );
  const contributionByOrigin = Object.values(
    contributions.reduce<
      Record<
        string,
        {
          origin: string;
          queries: number;
          rawResults: number;
          normalizedCandidates: number;
          uniqueCandidates: number;
          citationValid: number;
          requirementValid: number;
          revalidated: number;
          exactSelections: number;
          nearSelections: number;
        }
      >
    >((groups, item) => {
      groups[item.origin] ||= {
        origin: item.origin,
        queries: 0,
        rawResults: 0,
        normalizedCandidates: 0,
        uniqueCandidates: 0,
        citationValid: 0,
        requirementValid: 0,
        revalidated: 0,
        exactSelections: 0,
        nearSelections: 0,
      };
      const group = groups[item.origin];
      group.queries += 1;
      group.rawResults += item.rawResults;
      group.normalizedCandidates += item.normalizedCandidates;
      group.uniqueCandidates += item.uniqueCandidates;
      group.citationValid += item.citationValid;
      group.requirementValid += item.requirementValid;
      group.revalidated += item.revalidated;
      group.exactSelections += item.exactSelections;
      group.nearSelections += item.nearSelections;
      return groups;
    }, {}),
  );
  const logicalSearches = ledger.cacheLookups.length;
  const cacheHits = ledger.cacheLookups.filter(
    (lookup) => lookup.outcome === "hit",
  ).length;
  const cacheMisses = ledger.cacheLookups.filter(
    (lookup) => lookup.outcome === "miss",
  ).length;
  const retries = ledger.attempts.filter(
    (attempt) => attempt.retryStatus === "retry",
  ).length;
  const fallbacks = ledger.attempts.filter(
    (attempt) => attempt.verticalFallbackStatus === "fallback_initial",
  ).length;
  const physicalAttempts = ledger.attempts.length;
  const reconciliation = {
    logicalSearches,
    cacheHits,
    cacheMisses,
    physicalAttempts,
    retries,
    fallbacks,
    balanced:
      logicalSearches === cacheHits + cacheMisses &&
      physicalAttempts === cacheMisses + retries + fallbacks,
  };
  const candidates = [...ledger.candidates.values()];
  const discarded = candidates.filter(
    (candidate) => candidate.finalOutcome === "neither",
  );

  return {
    header: ledger.header,
    rawAi: ledger.rawAi,
    planAssembly: ledger.queries,
    dispatch: {
      cacheLookups: ledger.cacheLookups,
      attempts: ledger.attempts,
      reconciliation,
    },
    candidateLineage: {
      candidates,
      discardedCandidateCount: discarded.length,
      discardedWithExactlyOneFirstLoss: discarded.filter(
        (candidate) => candidate.firstLoss !== null,
      ).length,
      unknownFirstLossCount: discarded.filter(
        (candidate) => candidate.firstLoss?.stage === "unknown",
      ).length,
    },
    contributions: {
      byQuery: contributions,
      byOrigin: contributionByOrigin,
    },
  };
}

const REVIEW_RADAR_FLAG_NAMES = [
  "REVIEW_RADAR_CATEGORY_SCORING",
  "REVIEW_RADAR_CITATION_STRENGTH",
  "REVIEW_RADAR_CREDIBILITY_PENALTY",
  "REVIEW_RADAR_DEBUG_LOGS",
  "REVIEW_RADAR_FAST_FINAL_CONTEXT",
  "REVIEW_RADAR_LLM_NARRATION",
  "REVIEW_RADAR_MAX_MAIN_VERIFICATION_PRODUCTS",
  "REVIEW_RADAR_PINNED_PLANNING",
  "REVIEW_RADAR_SPEC_SEARCH",
  "REVIEW_RADAR_SPEC_VALIDATION",
  "REVIEW_RADAR_VERIFICATION_CONCURRENCY",
] as const;

export function reviewRadarFlagSnapshot() {
  return Object.fromEntries(
    REVIEW_RADAR_FLAG_NAMES.map((name) => [
      name,
      boundedText(process.env[name] || "unset", 64),
    ]),
  );
}

function detectReviewRadarCommitHash() {
  const environmentHash =
    process.env.REVIEW_RADAR_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;

  if (environmentHash) {
    return boundedText(environmentHash, 40);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 200,
      windowsHide: true,
    }).trim();
  } catch {
    return "unknown";
  }
}

const resolvedReviewRadarCommitHash = detectReviewRadarCommitHash();

export function resolveReviewRadarCommitHash() {
  return resolvedReviewRadarCommitHash;
}

export const searchObservabilityTestExports = {
  MAX_ATTEMPTS,
  MAX_CANDIDATES,
  MAX_QUERIES,
  MAX_RESULTS_PER_ATTEMPT,
  currentLedger,
  hostOf,
  productKey,
};

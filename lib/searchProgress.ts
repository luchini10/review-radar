// Shared contract for live search-progress narration. The recommendations
// route reports internal pipeline stages; the client panel polls and renders
// user-facing milestones. Server-side storage lives in
// lib/searchProgressStore.ts — this module must stay importable from the
// browser bundle, so it holds only types, constants, and pure helpers.

export const SEARCH_PROGRESS_ID_HEADER = "x-reviewradar-progress";

export type SearchProgressStatus = "running" | "done" | "error" | "cancelled";

// The polling endpoint answers "unknown" for ids it has no record of
// (expired, never registered, or a pipeline that does not report progress).
export type SearchProgressWireStatus = SearchProgressStatus | "unknown";

export type SearchProgressMilestoneKey =
  | "understand_request"
  | "plan_strategy"
  | "search_market"
  | "expand_coverage"
  | "deep_research"
  | "verify_sources"
  | "verify_facts"
  | "rank_results";

export type SearchProgressEvent = {
  atMs: number;
  milestone: SearchProgressMilestoneKey;
  sequence: number;
};

export type SearchProgressSnapshot = {
  events: SearchProgressEvent[];
  startedAtMs: number;
  status: SearchProgressStatus;
  updatedAtMs: number;
};

export type SearchProgressPollResponse = {
  events: SearchProgressEvent[];
  startedAtMs: number;
  status: SearchProgressWireStatus;
  updatedAtMs: number;
};

export type SearchProgressMilestone = {
  detail: string;
  key: SearchProgressMilestoneKey;
  label: string;
};

// Ordered to match the pipeline. The panel renders this full roadmap and
// marks each milestone pending / active / done from the reported events, so
// a stage the pipeline skips (flags, fallbacks) never strands the display.
export const SEARCH_PROGRESS_MILESTONES: SearchProgressMilestone[] = [
  {
    detail: "Reading your budget, must-haves, and dealbreakers.",
    key: "understand_request",
    label: "Understanding your requirements",
  },
  {
    detail: "Choosing the searches most likely to find strong candidates.",
    key: "plan_strategy",
    label: "Planning the research",
  },
  {
    detail: "Collecting real products, prices, and review sources.",
    key: "search_market",
    label: "Searching retailers and review sites",
  },
  {
    detail: "Running follow-up searches for products the first pass missed.",
    key: "expand_coverage",
    label: "Double-checking market coverage",
  },
  {
    detail: "Reading expert tests and product pages in depth.",
    key: "deep_research",
    label: "Researching the top candidates",
  },
  {
    detail: "Keeping only claims that link back to a real source.",
    key: "verify_sources",
    label: "Verifying sources and citations",
  },
  {
    detail: "Confirming each product actually fits what you asked for.",
    key: "verify_facts",
    label: "Checking requirements, prices, and images",
  },
  {
    detail: "Scoring the finalists and writing the verdict.",
    key: "rank_results",
    label: "Ranking your Best Matches",
  },
];

// Internal timing-stage labels → user-facing milestones. Stages absent from
// this map are intentionally silent; several adjacent stages share one
// milestone and the store collapses consecutive repeats.
const STAGE_MILESTONES: Record<string, SearchProgressMilestoneKey> = {
  read_request_body: "understand_request",
  create_openai_client: "understand_request",
  extract_requirements: "understand_request",
  detect_requirement_conflicts: "understand_request",

  openai_discovery_strategy: "plan_strategy",
  build_search_plan: "plan_strategy",

  serper_discovery: "search_market",

  openai_discovery_gap_check: "expand_coverage",
  decide_follow_up_discovery: "expand_coverage",
  serper_follow_up_discovery: "expand_coverage",
  merge_follow_up_discovery: "expand_coverage",
  bounded_organic_identity_resolution: "expand_coverage",

  shortlist_final_research_candidates: "deep_research",
  choose_final_search_context: "deep_research",
  openai_final_research: "deep_research",

  parse_final_research_json: "verify_sources",
  validate_final_research_schema: "verify_sources",
  normalize_serper_candidates: "verify_sources",
  merge_ai_and_serper_candidates: "verify_sources",
  collect_verified_openai_sources: "verify_sources",
  collect_reachable_product_page_urls: "verify_sources",
  collect_reachable_citation_urls: "verify_sources",
  filter_to_verified_citations: "verify_sources",
  check_recommendation_result_quality: "verify_sources",
  search_candidate_fallback: "verify_sources",

  filter_requirements: "verify_facts",
  attach_buying_rubric: "verify_facts",
  build_adaptive_verification_budget: "verify_facts",
  review_evidence_enrichment: "verify_facts",
  product_asset_enrichment: "verify_facts",
  missing_requirement_evidence_rescue: "verify_facts",
  revalidate_after_enrichment: "verify_facts",
  no_exact_sanity_fallback: "verify_facts",
  source_quality_upgrade: "verify_facts",

  score_and_select_results: "rank_results",
  openai_narration: "rank_results",
  parse_narration: "rank_results",
  apply_narration: "rank_results",
  fallback_normalize_serper_candidates: "rank_results",
  ai_error_search_fallback: "rank_results",
  prioritize_product_page_urls: "rank_results",
  remove_user_hidden_fields: "rank_results",
};

export function milestoneForStage(
  stageLabel: string,
): SearchProgressMilestoneKey | null {
  return STAGE_MILESTONES[stageLabel] ?? null;
}

// Progress ids are generated client-side per search; the store only accepts
// this shape so the polling endpoint cannot be probed with arbitrary keys.
export function isValidSearchProgressId(value: string) {
  return /^[A-Za-z0-9-]{8,64}$/.test(value);
}

export function createSearchProgressId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

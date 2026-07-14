import type {
  ProductDiscoveryGapCheck,
  ProductDiscoveryStrategy,
  SearchQueryCandidate,
  SearchQueryFamily,
  SearchQueryStage,
} from "@/types/review-radar";

export type SearchQueryOrigin =
  | "deterministic_plan"
  | "ai_discovery_strategy"
  | "ai_gap_check"
  | "editorial_seed"
  | "retailer_domain"
  | "direct_retailer"
  | "market_rescue"
  | "identity_resolution"
  | "review_evidence"
  | "image"
  | "requirement_fact_rescue"
  | "rubric_fact_rescue"
  | "source_quality_upgrade";

export type SearchQueryPurpose =
  | "product_discovery"
  | "evidence"
  | "image"
  | "requirement_rescue"
  | "source_upgrade";

export type SearchQueryCullReason =
  | "deduplicated"
  | "protected_slot_allocation"
  | "pass_stage_truncation"
  | "shopping_cap_crowd_out"
  | "organic_cap_crowd_out"
  | "retailer_cap_crowd_out"
  | "direct_retailer_cap_crowd_out"
  | "recategorized_to_organic"
  | "discussion_query_not_dispatched"
  | "identity_resolution_flag_off"
  | "identity_resolution_cap_crowd_out"
  | "stage_not_reached"
  | "never_dispatched";

// Client-shared plan builders accept this optional interface rather than
// importing the server-only AsyncLocalStorage implementation.
export type SearchPlanObservabilityObserver = {
  registerSearchQuery(input: {
    origin: SearchQueryOrigin;
    phase: string;
    purpose?: SearchQueryPurpose;
    query: string;
    family?: SearchQueryFamily;
    stage?: SearchQueryStage;
    parentQueryId?: string;
    sourceDetail?: string;
  }): string | undefined;
  attachSearchQueryId<T extends SearchQueryCandidate>(
    candidate: T,
    queryId: string | undefined,
  ): T;
  searchQueryId(candidate: SearchQueryCandidate): string | undefined;
  queryOrigin(queryId: string | undefined): SearchQueryOrigin | undefined;
  recordQueryMerge(
    queryId: string | undefined,
    targetQueryId: string | undefined,
  ): void;
  recordQueryCull(
    queryId: string | undefined,
    reason: SearchQueryCullReason,
    cap: string,
  ): void;
  recordRawAiStrategy(strategy: ProductDiscoveryStrategy): void;
  recordRawAiGapCheck(gapCheck: ProductDiscoveryGapCheck): void;
};

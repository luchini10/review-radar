// Measurement-only: per-candidate snapshots for the debug stage funnel. Reads
// existing fields off a ProductRecommendation; never changes discovery, filtering,
// or ranking. Used by the route's `stageFunnel` debug payload so the quality
// scorecard can pinpoint WHERE core leaders are lost (discovery vs dedupe vs filter
// vs ranking).

import type { ProductRecommendation } from "@/types/review-radar";
import { sourceTier } from "./search/sourceTier.ts";

export type FunnelStageCandidate = {
  name: string;
  brand: string | null;
  model: string | null;
  sourceTier: number;
  evidenceCount: number;
  hosts: string[];
  price: string | null;
  priceVerified: boolean;
  requirement: { passed: number; failed: number; unknown: number } | null;
  score: number | null;
  rejectionReason?: string;
};

function hostOf(url: string | undefined | null): string {
  try {
    return new URL(url || "").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function priceIsVerified(value: string | undefined | null): boolean {
  const text = value || "";
  return /\d/.test(text) && !/not verified|not found/i.test(text);
}

export function candidateSnapshot(
  product: ProductRecommendation,
  rejectionReason?: string,
): FunnelStageCandidate {
  const hosts = Array.from(
    new Set(
      [
        hostOf(product.product_page_url),
        ...(product.citations || []).map((citation) => hostOf(citation.url)),
      ].filter(Boolean),
    ),
  );
  const check = product.requirementCheck;

  return {
    name: product.name || "",
    brand: product.metadata?.brand?.value || product.canonicalIdentity?.brand || null,
    model: product.metadata?.modelNumber?.value || null,
    sourceTier: sourceTier(product.product_page_url || ""),
    evidenceCount: (product.citations || []).length,
    hosts,
    price: product.estimated_price_range || null,
    priceVerified: priceIsVerified(product.estimated_price_range),
    requirement: check
      ? {
          passed: check.passed.length,
          failed: check.failed.length,
          unknown: check.unknown.length,
        }
      : null,
    score:
      typeof product.scoreBreakdown?.totalScore === "number"
        ? Math.round(product.scoreBreakdown.totalScore)
        : null,
    ...(rejectionReason ? { rejectionReason } : {}),
  };
}

export const resultNames = (products: ProductRecommendation[]) =>
  (products || []).map((product) => product.name || "");

// ── Final-selection trace types ───────────────────────────────────────────────
// These types describe why every candidate that reaches scoreAndSelectRecommendations
// was selected, dropped, collapsed, or demoted. The trace is debug-only and never
// affects the returned product set or ranking.

export type FinalSelectionDecisionReason =
  | "selected"
  | "ranked_below_cutoff"
  | "duplicate_identity_collapsed"
  | "variant_family_collapsed"
  | "not_reliable_enough_for_exact"
  | "near_only_exact_full"
  | "disqualified_category"
  | "disqualified_avoid"
  | "disqualified_other"
  | "missing_trace_reason";

export type FinalSelectionCandidateStream =
  // Passed the 3-condition exact gate (exactMatch=true, failed=[], unknown=[])
  // AND reliableEnoughForBestMatch=true.
  | "exactScored"
  // Passed the exact gate BUT reliableEnoughForBestMatch=false — demoted to near.
  | "reliabilityNear"
  // Failed the exact gate but not disqualified — eligible as near match only.
  | "nearScored"
  // Has "Category:" or "Avoid:" in failed requirements — excluded from both streams.
  | "disqualified"
  // Should not occur in practice; captured for safety.
  | "unknown";

export type FinalSelectionTraceEntry = {
  // Identity
  name: string;
  canonicalId: string | null;
  variantFamilyKey: string | null;
  brand: string | null;
  model: string | null;
  productUrl: string;
  // Stream and outcome
  stream: FinalSelectionCandidateStream;
  selected: boolean;
  finalRank: number | null;
  decisionReason: FinalSelectionDecisionReason;
  // Which product "won" the slot that caused this one to be collapsed.
  collapsedBy: string | null;
  // Whether the product passed the reliability gate (null = not in exactScored).
  reliableEnoughForExact: boolean | null;
  // Requirement data
  exactMatch: boolean;
  failed: string[];
  unknown: string[];
  passed: string[];
  // Score data (null if product was not scored)
  rankedMatchScore: number | null;
  totalScore: number | null;
  requirementFitScore: number | null;
  sourceQualityScore: number | null;
  citationStrengthScore: number | null;
  priceValueScore: number | null;
  missingDataPenalty: number | null;
  marketConfidenceTier: string | null;
  evidenceStrength: string | null;
  // Citation
  citationCount: number;
  independentCitationCount: number;
  retailerCitationCount: number;
  // Price trust
  price: number | null;
  priceTrustStatus: string | null;
  canUseForBudget: boolean | null;
  // Form-factor visibility (observational only — does not affect ranking yet)
  offFormFactorModifiers: string[];
};

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

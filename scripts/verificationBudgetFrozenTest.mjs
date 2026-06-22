// Frozen-set test for Codex's speed policy (lib/recommendationPerformance.ts).
//
// The live A/B was inconclusive because each web search discovers a DIFFERENT
// candidate set (discovery variance swamped the cap effect). This harness removes
// that variance: it FREEZES the candidate pool and the verification outcome, and
// changes ONLY the verification cap. So any difference in exact-match count is
// attributable to the cap alone.
//
// It reuses the REAL policy (`buildAdaptiveVerificationBudget`) and the REAL
// exact-match gate (copied verbatim from scoreAndSelectRecommendations), so the
// numbers reflect production behavior, not a re-derivation.
//
// Model of the mechanism (confirmed against the code):
//   - A product is "near" (not exact) while it has any `unknown` requirement.
//   - Missing-evidence rescue resolves unknowns, but only for the top `maxProducts`
//     products (requirementEvidenceRescue.ts:977). Products below the cap keep
//     their unknowns and stay near.
//   - The displayed list shows at most MAX_EXACT_MATCHES (7) exacts.

import { buildAdaptiveVerificationBudget } from "../lib/recommendationPerformance.ts";

const DISPLAY_CAP = 7; // MAX_EXACT_MATCHES in recommendationScoring.ts

// The REAL exact-match gate (verbatim from scoreAndSelectRecommendations:1036-1038).
const isExact = (p) =>
  p.requirementCheck?.exactMatch === true &&
  p.requirementCheck.failed.length === 0 &&
  p.requirementCheck.unknown.length === 0;

// A frozen "near" candidate: a genuine match whose single requirement is still
// UNKNOWN, so it only becomes exact if rescue verifies it. `wouldPass` marks
// whether verification would resolve it favorably.
function nearProduct(i, wouldPass) {
  return {
    name: `Near ${i}`,
    product_page_url: `https://retailer${i % 5}.example.com/p/${i}`,
    recommendation_type: "Close Match",
    requirementCheck: { exactMatch: true, failed: [], unknown: ["Feature: air fry"] },
    wouldPass,
  };
}

// Deterministic rescue: the top `cap` near products that would pass get their
// unknown cleared (-> exact). Everything below the cap stays near. This mirrors
// productsNeedingVerification(result).slice(0, maxProducts) + favorable rescue.
function exactsAtCap(pool, preExact, cap) {
  const verified = pool.map((p, idx) =>
    idx < cap && p.wouldPass
      ? { ...p, requirementCheck: { exactMatch: true, failed: [], unknown: [] } }
      : p,
  );
  const total = preExact + verified.filter(isExact).length;
  return Math.min(total, DISPLAY_CAP);
}

// Build the request/result that lands the policy in a given tier, then ask the
// REAL policy what cap it picks.
function policyCap({ poolSize, preExact, broad }) {
  const nearMatches = Array.from({ length: poolSize }, (_, i) => nearProduct(i, true));
  const exactMatches = Array.from({ length: preExact }, (_, i) => ({
    name: `Exact ${i}`,
    requirementCheck: { exactMatch: true, failed: [], unknown: [] },
  }));
  const request = broad
    ? { query: "robot vacuum", priorities: "", selectedFeatures: [], extractedRequirements: { requiredConstraints: [], specConstraints: [], sizeConstraints: [] } }
    : { query: "toaster oven", priorities: "air fry easy to clean compact countertop size convection", selectedFeatures: [{}, {}], extractedRequirements: { requiredConstraints: [{ type: "feature" }, { type: "feature" }, { type: "feature" }], specConstraints: [{}], sizeConstraints: [{}] } };

  return buildAdaptiveVerificationBudget({
    categoryGroup: "appliance",
    maxEnrichedProducts: 12,
    request,
    result: { exactMatches, nearMatches, premiumAboveBudget: [] },
    serperCandidateCount: poolSize,
  });
}

const scenarios = [
  { label: "few-exact tier (toaster-like, 0 pre-exact, 17 found)", poolSize: 17, preExact: 0, broad: false },
  { label: "broad-common tier (robot-like, 1 pre-exact, 23 found)", poolSize: 23, preExact: 1, broad: true },
  { label: "enough-exact tier (7 pre-exact, 9 found)", poolSize: 9, preExact: 7, broad: false },
];

// How many of the frozen pool are genuine matches that WOULD verify successfully.
const wouldPassCounts = [3, 5, 7, 10];

console.log("Frozen-set verification-cap test — exact-match count, cap varied, pool fixed\n");

for (const s of scenarios) {
  const budget = policyCap(s);
  const cap = budget.maxProducts;
  console.log(`### ${s.label}`);
  console.log(`    real policy cap = ${cap} (reason="${budget.reason}"); display cap = ${DISPLAY_CAP}`);
  console.log("    would-pass | exacts@policy-cap | exacts@uncapped | dropped by cap");
  for (const q of wouldPassCounts) {
    const pool = Array.from({ length: s.poolSize }, (_, i) => nearProduct(i, i < q));
    const atPolicy = exactsAtCap(pool, s.preExact, cap);
    const atUncapped = exactsAtCap(pool, s.preExact, s.poolSize);
    const dropped = atUncapped - atPolicy;
    console.log(
      `      ${String(q).padStart(2)}       |        ${atPolicy}          |        ${atUncapped}        |     ${dropped}${dropped > 0 ? "  <-- LOST" : ""}`,
    );
  }
  console.log("");
}

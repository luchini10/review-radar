# Review Radar Test Memory

> **Rule:** Before running any live test, read this file. Summarize what prior results already answer the question, whether a smaller diagnostic suffices, the estimated Serper/runtime cost, and get explicit approval before a full baseline.

---

## Cost Reference

> **Real per-search cost (corrected 2026-06-24):** the last measured baseline was **1325 Serper calls over 28 searches ≈ 47 Serper calls/search**, wall time ≈ **75 s/search**. The old table here said "~280–350 for a full 14×2 baseline" — that was a **~4× underestimate** (it predated editorial seeding + rubric rescue). Use ~47/search going forward. The scorecard now prints a live cost estimate before every run.

| Test type | Searches | Serper calls | Wall time | When to use |
|---|---|---|---|---|
| `npm test` + `npm run typecheck` + `npm run lint` | 0 | 0 | <90 s | Baseline health — **always** before and after every change |
| Frozen-set / unit harness (no live calls) | 0 | 0 | <5 s | Proving pure logic in isolation; always the first step |
| Citation-strength diagnostic (`citationStrengthDiagnostic.mjs`) | 1 live / 0 replay | ~47 / 0 | 1–2 min / <1 s | Per-candidate citation type report; detect thin-winner crowding |
| Stage funnel, 1 query (`--filter <id> --mode diagnostic` + `RR_FUNNEL=1`) | 2 | ~95 | ~3 min | Trace exactly where one leader is lost |
| **`--mode diagnostic`** (5 queries × 2) | 10 | ~470 | ~12 min | Default live smoke for a SPECIFIC suspected issue. Runs without `--confirm`. |
| **`--mode stress --filter <id>`** (1 query × 8) | 8 | ~376 | ~10 min | Why does ONE query swing? Needs `--filter`. Runs without `--confirm`. |
| **`--mode normal`** (14 queries × 2) | 28 | ~1316 | ~35 min | Full before/after smoke. **Cost-guarded — needs `--confirm` + user approval.** |
| **`--mode high`** (14 queries × 5) | 70 | ~3290 | ~90 min | High-confidence: is a change > variance? **Cost-guarded — needs `--confirm` + user approval.** |

The scorecard refuses to run any plan estimated over **600 Serper calls** unless `--confirm` is passed (the **cost guard**). `--dry-run` prints the plan for any mode and exits without spending a call. Preview with `npm run qa:plan -- --mode <mode>`.

---

## Stability Baseline (Established)

- **Run-to-run stability: ~19%** across broad queries (measured via `qualityConsistencyHarness.mjs`).
- This means the same query returns a meaningfully different set of products ~81% of the time between runs.
- **Practical consequence:** variance of ±2–3 core leaders per run exceeds the effect size of most single fixes. A full baseline with 2 runs/query cannot reliably detect improvements smaller than ~1.5 mean core leaders.
- **Measurement wall:** we hit this after the citation rescue fix — the 14×2 baseline showed poolCore 2.6 (down from 3.4) despite the stage funnel proving the fix worked at its target stage. The drop was noise.
- **What actually matters:** stage funnel proof (did the target leader survive the target stage?) is more trustworthy than a noisy full baseline for validating a narrow fix.
- **Known measurement limitation (fix in Phase 4):** `qualityScorecard.mjs` currently reports per-query coverage as the **max across runs** (`best()`), which *hides* variance and flatters results. Until Phase 4 adds mean/min/max/stddev, treat single scorecard numbers as optimistic, not central.

---

## Test Modes (use the cheapest mode that answers the question)

The scorecard (`scripts/qualityScorecard.mjs`) has explicit modes. Each prints a cost plan (queries, runs, est Serper calls, est runtime, the question it answers) **before** any live call, and enforces a cost guard.

| Mode | Command | Cost | Answers |
|---|---|---|---|
| **replay-only** | (Phase 2 — not built yet) | 0 | Deterministic code change on a saved candidate set. No Serper/OpenAI. |
| **citation replay** | `node scripts/citationStrengthDiagnostic.mjs --replay` | 0 | Re-inspect a saved payload's citation strength with zero spend. |
| **diagnostic** | `npm run qa:scorecard -- --mode diagnostic` | ~470 Serper / ~12 min | Did a SPECIFIC suspected issue change at a known drop point? (smoke, not proof) |
| **stress** | `npm run qa:scorecard -- --mode stress --filter <id> --confirm` | ~376 Serper / ~10 min | Why does ONE query swing so much? |
| **normal** | `npm run qa:scorecard -- --mode normal --confirm` | ~1316 Serper / ~35 min | Broad before/after smoke across all 14. Too noisy alone to prove small gains. |
| **high** | `npm run qa:scorecard -- --mode high --confirm` | ~3290 Serper / ~90 min | Is a change LARGER than run-to-run variance? |

**Always preview first:** `npm run qa:plan -- --mode <mode> [--filter <id>]` prints the plan and spends nothing.

**When to use which:**
- **Start with 0-cost** (unit tests, frozen harness, citation replay). Most logic changes are fully provable here.
- **Use `diagnostic`** to confirm a specific hypothesis live (e.g. "does leader X now survive citation-verify?"). Pair with `RR_FUNNEL=1` for the per-stage trace.
- **Use `stress`** only when one query's variance is the question.
- **`normal` / `high` need explicit user approval** — they are the expensive baselines and the cost guard blocks them without `--confirm`. Prefer `high` over `normal` when you actually need to beat the noise floor; a single `normal` run cannot prove a sub-1.5-coverage change (see Stability Baseline).

---

## Phase Plan (measurement-first; ranking/discovery come AFTER measurement is trustworthy)

| Phase | Goal | Status |
|---|---|---|
| **1. Measurement foundation** | Test modes, cost guard, cost estimates, before/after rules, this doc | **DONE (2026-06-24)** |
| **2. Replay fixtures** | Save live debug payloads + candidate pools to `tests/fixtures/review-radar-live/`; replay tests for citation verify, citation strength, requirement filter, price trust, product-type, revalidation, final selection. Replay script `scripts/replay-quality-fixtures.mjs`. | NEXT |
| **3. Lost-leader diagnostics** | Trace each expected leader through every stage (never-found → raw → seed → pool → citation → requirement → price → reval → near → ranked-low → duplicate-collapsed → final 7). Extend the funnel/scorecard. | Planned |
| **4. Variance & confidence** | Scorecard reports mean/best/worst/range/stddev/stability; PASS/FAIL/INCONCLUSIVE classification; confidence warning when noise > effect. Replaces the misleading `best()` metric. | Planned |
| **5. Discovery quality** | Source-tiered discovery finds true leaders (editorial/lab, marketplace, manufacturer, community); better seed extraction; no source spam. | Planned (after measurement) |
| **6. Identity / canonicalization** | Collapse true dupes, preserve distinct products, avoid accessory/bundle/old-SKU confusion. | Planned |
| **7. Requirement & price verification** | Price/availability/feature/dimension/compatibility/type/spec confidence; fix wrongly-rejected valid products & wrongly-promoted weak ones without weakening hard gates. | Planned |
| **8. MarketTrust ranking** | Generalized trust lane (source mentions, review strength, diversity, reputation, sentiment, availability, value, risk). Never overrides hard constraints. | Planned |
| **9. Output quality** | Honest cards: why ranked, supporting evidence, what's uncertain, price/source confidence, missing facts, who-might-prefer-X. | Planned |
| **10. Performance** | Reduce calls / cache / replay safely — only after quality is measurable. | Planned |

---

## Proven Findings (do not re-investigate these)

### 1. Ranking is NOT the bottleneck for core-leader coverage
- **Proven by:** frozen-set harness + stage funnel.
- Leaders that survive filtering reach the final 7. The problem is upstream: discovery (never found) and citation verification (found but dropped).
- **Do not re-run ranking experiments to fix coverage.**

### 2. Citation verification was dropping real leaders (FIXED — committed)
- **Root cause:** `filterResultToVerifiedCitations` (in `lib/recommendationResultValidation.ts`) checks each candidate's citations against a `verifiedUrls` Set built from Serper results. LLM web_search path candidates (RIDGID, Craftsman, Roborock, etc.) have real product-page URLs but those URLs are NOT auto-added to `verifiedUrls` → zero citations → dropped.
- **Fix shipped:** `rescueProductPageCitation` — iterates a zero-citation candidate's own URL(s), runs `classifyProductEligibility` + `isNonProductPageResult` gates (same gates the pipeline uses), self-cites if it passes. Article/listing/category/search pages still drop. Uncited LLM prose still blocked.
- **Stage-funnel confirmed:** RIDGID, Craftsman now survive the citation-verify stage in 5-query diagnostic after fix.
- **Side effect:** rescued products have exactly 1 citation → mechanically triggers the `weak#1` flag (`citations < 2`). This is a known deferred issue.
- **Status:** committed to main. Do not revert without explicit instruction.

### 3. Verification budget cap was too low (FIXED — committed)
- **Root cause:** Codex set `few_exact_candidates` tier to max 6 products verified; display cap is 7 → could silently drop 1 exact match.
- **Fix:** cap changed 6 → 7 in `lib/recommendationPerformance.ts`.
- **Proved by:** `scripts/verificationBudgetFrozenTest.mjs` (frozen-set harness, 0 Serper calls).
- **Status:** committed. Do not re-investigate.

### 4. Size-blind variant collapse attempted and reverted
- **What failed:** `areSameCanonicalProduct` / `sameProductFamilyTitle` collapsed variants sharing any spec token (e.g., HP) regardless of size — "Stanley 5-Gallon 3HP" merged with "Stanley 6-Gallon 3HP". Live test: 7 eligible → 3 displayed.
- **Fix:** replaced with size-aware `variantFamilyKey` (`lib/productVariantFamily.ts`) using only size/capacity units, never HP/power.
- **Status:** committed.

### 5. HTTP 502 crash on malformed image URLs (FIXED — committed)
- **Root cause:** unguarded `decodeURIComponent` in `lib/productImageResolver.ts` on URLs with bad `%` escapes.
- **Fix:** `safeDecodeURIComponent` wrapper.
- **Status:** committed. Regression test in `tests/productImageResolver.test.mjs`.

### 6. Lever 2 (ranking by trust/popularity) was already implemented
- `ownerRatingScore`, `ownerReviewStrengthScore`, `productPopularityScore`, `broadSearchPopularityMultiplier` ×1.25 already present.
- **Do not re-implement or re-investigate Lever 2.**

### 7. `candidatePool` labeling bug (FIXED)
- Previously the stage funnel set `candidatePool` to `serperRecommendations` (Serper-only), causing coverage to appear to *increase* across stages. Fixed to use `candidateResult.recommendations` (merged Serper+LLM pool).

---

## Known Open Issues (proven but not yet fixed)

### A. Discovery gap — 2–4 core leaders never discovered per query  · **PROVEN**
- Leaders like Ecovacs, Narwal, Dreame, Stanley (shop-vac), Milwaukee, Monument, Broil King never appear in `candidatePool`.
- Cause: not returned by Serper shopping queries + not named by LLM.
- **Not the same as the citation-verify bug.** These need a separate discovery fix (Phase 1 source-tiered seeding, editorial mining).
- Theme 3 of the current plan covers this (editorial best-of list seeding).

### B. Rescued products are "thin winners" (measured, guardrails in place)  · **PROVEN (mechanism); SUSPECTED (crowd-out)**
- Rescued products carry exactly one citation tagged `product-page-self` → old `weak#1` check (`citations < 2`) fired for them.
- **Resolved as a measurement issue:** the scorecard now distinguishes `WEAK` (genuinely uncorroborated: no price, zero citations, wrong type, weak consensus) from `THIN` (self-cited-only but verified price + ok consensus). These are separate columns in the broad scorecard.
- A `THIN#1` is still flagged for monitoring — it is real product-page evidence, but lacks independent corroboration. It is not the same as no evidence.
- **Citation type tagging** (`citation_type` field, committed 2026-06-24):
  - `product-page-self`: product's own buyable URL — set explicitly by the rescue path
  - `independent-editorial`: Tier-1 editorial source (Wirecutter, RTINGS, CNET, etc.)
  - `retailer-marketplace`: Tier-2 marketplace (Amazon, Home Depot, etc.)
  - `weak-uncorroborated`: Tier 3/4 (manufacturer, community, unknown)
- **Diagnostic tool:** `scripts/citationStrengthDiagnostic.mjs` — run live (1 API call) then replay from saved payload. Shows per-candidate citation type breakdown and flags thin-winner crowding-out patterns.
- **Next unresolved:** do thin winners actually crowd out better-supported candidates? Use `citationStrengthDiagnostic.mjs --replay` to check before deciding any scoring change.

### C. Secondary filtering drop at `afterReval`  · **SUSPECTED**
- Some leaders pass the requirement filter but are removed at final selection due to the "exact needs verified price" reliability rule.
- Observed in funnel output but not yet isolated to a single mechanism ("murkier"). Needs a Phase 3 lost-leader trace before acting.
- Separate from the citation-verify bug. Deferred.

### D. Seed extraction junk (partially fixed)  · **PROVEN (fixed)**
- "Recommendations RTINGS.com" and year-led mashes ("2026 Shark Eufy WIRED Dyson...") appeared as seed product names.
- Fixed: `containsSourceName` + `isYearLedRun` filters added to `lib/search/serper.ts`.
- **Status:** committed. Monitor for regressions.

---

## Phase History

| Phase | What changed | Outcome |
|---|---|---|
| Phase 0 | Two-scorecard system + gold benchmark (14 queries) | Established baseline: poolCore ~3.4, stability 19%, wrong-type leaks common |
| Phase 1 | Source-tiered discovery: Tier-1 mined first, brand-led seed extraction | Partial pass: directional improvement, do-not-regress held, coverage targets fell short |
| Phase 1.5 | Stage funnel (6-stage per-candidate trace) | Proved ranking is NOT the bottleneck; citation-verify IS a real drop point |
| Filtering STEP 1 | Proved citation-verify is the drop step | No pipeline change; confirmed mechanically via funnel output |
| Filtering STEP 2 | Citation rescue (`rescueProductPageCitation`) | Stage-funnel confirmed. Full baseline inconclusive due to measurement wall |
| Theme 1 (plan) | Full structured requirements at discovery filter | Committed: spec/size/color conflicts rejected at candidatePool stage |
| Citation strength | `citation_type` tagging + weak#1 vs thin#1 split + `citationStrengthDiagnostic.mjs` | Committed 2026-06-24: measurement foundation for thin-winner risk |
| Measurement Phase 1 | Scorecard test modes + cost guard + cost estimates + this doc | Committed 2026-06-24: expensive baselines now require `--confirm` + approval |

---

## Gold Benchmark Summary (14 queries)

- **8 broad queries:** robot vacuum, gas grill, office chair, air purifier, shop vac, toaster oven, blender, mattress  
- **6 constraint queries:** (budget/feature requirements attached)
- Scoring: `poolCore` (found anywhere in pool), `final7Core` (in final 7), `altPool` (acceptable alternates), `wrongLeak`, `weakWinner`, `stability`, `priceOk`
- **Targets:** poolCore ≥ 5/7, final7Core ≥ 3/7, 0 wrong-type, 0 weak#1, 0 EMPTY constraint results
- **Last known mean (Phase 1 baseline):** poolCore ~3.4, final7Core ~2.x, weak#1 ~4/8, stability ~19%
- **Last full baseline (post-citation-rescue):** poolCore 2.6, weak#1 6/8 — inconclusive due to noise

---

## Before/After Comparison Rules (classify every comparison)

When comparing two versions, **never call a change successful because one run improved.** Report:
- before mean vs after mean (and, once Phase 4 lands, before range vs after range)
- whether the improvement is larger than normal run-to-run variance (±2–3 core leaders at 19% stability)
- safety regressions (any of: budget violations, wrong-type winners, EMPTY constraint results, non-product pages, suspicious prices)
- quality improvements (coverage, weak#1↓, thin#1↓, stability↑)
- which metrics are inconclusive

Classify the result as exactly one of:
- **PASS** — improvement is consistent AND larger than noise AND **zero** safety regressions.
- **FAIL** — any important safety or quality metric regresses (a safety regression is an automatic FAIL regardless of coverage gains).
- **INCONCLUSIVE** — variance too high to trust (effect size < noise floor). This is the *expected* outcome of a single `normal` run for a small change — escalate to `high` mode or a deterministic replay, do **not** ship on an INCONCLUSIVE.

**Safety floor (never trade away for a metric):** product eligibility, price trust, wrong-product-type filtering, non-product-page blocking, hard-requirement validation, exact-budget-needs-trusted-price. A change that improves coverage by weakening any of these is a **FAIL**, not a tradeoff.

## Issue Status Legend

Tag every finding in this doc as one of:
- **PROVEN** — reproduced via funnel/replay/unit test with a clear mechanism. Don't re-investigate.
- **SUSPECTED** — observed once or inferred, not yet isolated. Needs a cheap diagnostic before acting.
- **UNKNOWN** — open question, no data yet.

## Decision Protocol for Future Tests

### "Should I run a full baseline?"

Only if ALL of these are true:
1. A structural change was made that affects multiple stages (not just a single filter or rescue)
2. The change is expected to shift mean coverage by ≥1.0 core leader
3. A 5-query stage-funnel diagnostic has already confirmed the change works at the target stage
4. You have explicit approval from the user

**Before running, ALWAYS report to the user:** (1) what prior results already answer the question, (2) whether a smaller diagnostic/replay can answer it, (3) estimated Serper calls + runtime (use `npm run qa:plan`), (4) that you need approval. The cost guard enforces this for `normal`/`high`.

### "Can a stage funnel diagnostic answer this?"

Yes, if you need to know: "does leader X survive stage Y after this fix?" Use `RR_FUNNEL=1` on 3–5 representative queries. ~4–8 min, ~50–70 Serper calls.

### "Can a unit test answer this?"

Yes, for any pure logic: spec matching, form-factor detection, seed extraction, URL normalization, variant collapse. Run `npm test` first. 0 Serper calls, <60s.

### "Is the baseline inconclusive?"

If run-to-run variance in core leaders (±2–3) exceeds the expected effect size of the change, the baseline cannot confirm or deny the change. In this case:
- Trust stage-funnel proof over noisy mean scores
- Do NOT revert a mechanically-proven fix based on a noisy baseline
- Consider raising `RR_RUNS` to 4+ before concluding

---

## Files to Know

| File | Purpose |
|---|---|
| `scripts/qualityScorecard.mjs` | Two-scorecard harness. Modes: `--mode diagnostic\|normal\|high\|stress`, `--filter`, `--dry-run`, `--confirm`, `RR_FUNNEL=1`. Cost-guarded. Shows `weak#1` vs `thin#1`. |
| `npm run qa:scorecard -- --mode <m>` | Run the scorecard in a named mode (cost-guarded). |
| `npm run qa:plan -- --mode <m>` | Print the cost plan for a mode and exit (0 calls). |
| `scripts/citationStrengthDiagnostic.mjs` | Single-query citation type report + replay from saved payload |
| `scripts/goldBenchmark.mjs` | 14 gold queries with coreLeaders / acceptableAlternates / wrongTypeTerms |
| `scripts/qualityConsistencyHarness.mjs` | Stability measurement (N runs × M queries) |
| `scripts/verificationBudgetFrozenTest.mjs` | Frozen-set proof for verification budget cap |
| `lib/recommendationResultValidation.ts` | Citation rescue lives here |
| `lib/recommendationFunnel.ts` | Stage snapshot types for funnel debug |
| `lib/productVariantFamily.ts` | Size-aware variant collapse |
| `lib/search/sourceTier.ts` | Domain → Tier 1/2/3/4 classifier |
| `docs/qa-loop-results.md` | Append-only QA log (Claude: 🟩 green, Codex: 🟧 orange) |
| `ReviewRadar-Overview.md` | Repo-root source of truth — read before major changes |

---

*Last updated: 2026-06-24 (Measurement Phase 1: test modes + cost guard + corrected cost numbers). Maintained append-only — add entries, do not overwrite prior findings.*

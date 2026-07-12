# Review Radar Test Memory

> **Rule:** Before running any live test, read this file. Summarize what prior results already answer the question, whether a smaller diagnostic suffices, the estimated Serper/runtime cost, and get explicit approval before a full baseline.

---

## Phase 6B Regression Wall (2026-07-01)

- Canonical index: `docs/phase-6-regression-wall.md`.
- Range: RR-007 through RR-068 (62 issues).
- Deterministic gaps found and closed: RR-012 schema availability formatting and RR-025 near-match funnel retention.
- Measurement-only: RR-014 leader coverage and RR-015 run-to-run stability.
- Provider-variance-bound: RR-037 candidate-pool recurrence and RR-045 Tapo coverage.
- Do not treat a green deterministic wall as proof of live leader recall, stability, or provider coverage.
- No `test:wall` command exists. A focused wall runner is documented only as proposed automation requiring explicit approval.
- Phase 6B verification: focused additions 22/22; full suite 782/782; typecheck passed; lint 0 errors/3 existing warnings; eval clean; zero live calls.

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
| **replay-only** | `npm run qa:replay -- <fixture>` or `npm run qa:replay -- --all` | 0 | Stage funnel, citation strength, thin/weak winner, lost-leader report from a saved fixture. No Serper/OpenAI. |
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
| **2. Replay fixtures** | Save live debug payloads + candidate pools to `tests/fixtures/review-radar-live/`; replay tests for citation verify, citation strength, requirement filter, price trust, product-type, revalidation, final selection. Replay script `scripts/replay-quality-fixtures.mjs`. | **DONE (2026-06-24)** |
| **3A. Requirement-filter diagnostics** | Investigate "0 afterRequirementFilter" pattern on constrained queries. Build per-candidate diagnostic. Classify root cause. Fix funnel tracking + spec parsing bugs. | **DONE (2026-06-24)** |
| **3B. Wrong-type contamination fix** | Block confirmed wrong-type products from robot vacuum exact matches AND near matches. Add `robot_vacuum` rule to `productTypeIntent.ts`. Three-state `checkCategory` (pass/fail/unverified). `why_recommended` used via `allowedCheckText` to confirm type without poisoning blocked checks. | **DONE (2026-06-24)** |
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

### 8. Stage funnel `afterRequirementFilter` tracking inconsistency (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3A investigation):** The stage funnel's `afterRequirementFilter` stage tracked only EXACT matches (`requirementFilteredResult.recommendations`), but earlier stages tracked ALL surviving candidates. So the "dramatic drop to 0" on constrained queries was a measurement artifact: products were correctly demoted to NEAR-MATCH status (unknown budget → need verification), NOT eliminated. The `afterRevalidation` stage combined both exact+near, making it look like a "rescue from 0" when it was just the funnel's inconsistency.
- **Fix shipped:** Added `near: resultNames(requirementFilteredResult.nearMatches)` to the `afterRequirementFilter` stage in the route. The replay script already reads `s.near` and folds it into stage counts — no change needed there.
- **Verified behavior:** for constrained queries with no verified prices at filter time, ALL candidates correctly go to near-match (0 exact), then rescue+revalidation promotes some to exact once evidence is found. This is the 3-state system working as designed.
- **Do not weaken the hard-requirement or budget gates.** The behavior is correct; the measurement was lying.

### 9. Spec preWindow direction-word poisoning (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3A):** `extractSpecConstraints` checks a 28-character preWindow before each spec match for direction words ("under", "at least", etc.). When a query contains "under $N spec" (e.g. "gas grill under $600 4-burner"), the "under" from the price context bled into the spec's preWindow, making "4-burner" extract as `max 4 burners` (at most 4) instead of the correct `min 4 burners` (at least 4, since `direction: "higher"`).
- **Additional bug:** the label for `operator: "max"` said "under N" but the code evaluated `≤ N` (not `< N`). Label was semantically wrong.
- **Fixes shipped:** (a) Strip `DIRECTION_WORD\s+\$[\d,]+` patterns from preWindow before direction detection, so price-modifying words don't affect the spec direction. (b) Change label from "under N" → "at most N" to match the `<=` evaluation. Both fixes are in `lib/specExtraction.ts`.
- **Spec validation is still disabled** (`REVIEW_RADAR_SPEC_VALIDATION !== "on"`), so this bug had no live impact — but it would have caused wrong-direction spec filtering if validation were enabled.
- **3 new tests added** to `tests/specExtraction.test.mjs`. All 557 tests pass.

### 10. Wrong-type vacuums passing robot vacuum category check (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3B investigation):** `PRODUCT_TYPE_RULES` in `productTypeIntent.ts` had no `robot_vacuum` rule → `classifyProductTypeIntent` returned `{requestedType: null, status: "unknown"}` for all robot vacuum queries → `checkCategory` fell through to `categoryTerms` text matching → LLM-mislabeled `product.category = "robot vacuum"` on stick/wet-dry/canister vacuums caused them to pass the category check.
- **Wrong-type products found in fixtures:** Milwaukee M18 Wet/Dry Vac, ONE+ Hand Vacuum in EXACT MATCHES (best-robot-vacuum); Shark Rocket Stick, RYOBI Stick, Kenmore Canister in NEAR MATCHES (robot-vacuum-under-300-self-emptying).
- **Fixes shipped (3 changes):**
  - `robot_vacuum` rule added to `PRODUCT_TYPE_RULES`: `blocked = /stick vacuum|canister vacuum|hand vacuum|wet dry|shop vac|upright vacuum/`, `allowed = /robot vac|robot vacuum|robot cleaner|robot mop|robotic vacuum/`
  - `classifyProductTypeIntent` gained an optional `allowedCheckText` parameter (separate from `candidateText`): used for the `isAllowed` check only, so `why_recommended` can confirm robot vacuum type without risk of query-echoing text falsely satisfying the `satisfiedBy` guard in `isComponentSubstitution`
  - `checkCategory` converted from boolean to `CategoryVerdict = "pass"|"fail"|"unverified"`: wrong type → `missingRequirements` (blocked from near); unverified → `unknownRequirements` (allowed as near match); pass → `matchedRequirements`
- **Validated behavior:** Milwaukee, ONE+ Hand Vac, Shark Rocket, RYOBI Stick, Kenmore Canister → `irrelevant` → excluded. Roborock S8 MaxV Ultra (name sparse, but why_recommended says "robot vacuum and mop") → `exact` via `allowedCheckText`. Roborock S7 MaxV Ultra (neither name nor why_recommended confirm type) → `needs_verification` → near match.
- **7 new tests added** (4 in `productTypeIntent.test.mjs`, 3 in `requirementValidation.test.mjs`). **564 tests pass.**

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

### E. Wrong-type products reaching near matches on robot vacuum  · **FIXED (Phase 3B, committed 2026-06-24)**
- "Shark Rocket Bagless Corded Stick Vacuum", "RYOBI ONE+ Cordless Stick Vacuum", "KENMORE Bagged Canister Vacuum" appeared in robot vacuum under $300 near matches. Milwaukee M18 Wet/Dry Vac and ONE+ Hand Vacuum appeared in EXACT MATCHES for "best robot vacuum."
- Root cause: no `robot_vacuum` rule in `PRODUCT_TYPE_RULES` → `classifyProductTypeIntent` returned `{requestedType: null}` for all robot vacuum queries → fell through to `categoryTerms` which used LLM `product.category` (mislabeled "robot vacuum" by LLM).
- **Fix shipped (Phase 3B):** (1) `robot_vacuum` rule added to `productTypeIntent.ts` — blocks stick/canister/hand/wet-dry/upright/shop-vac vacuums; allows "robot vacuum/vac/cleaner/mop". (2) `checkCategory` made three-state (pass/fail/unverified): wrong-type → hard fail → excluded from exact+near; unverified → near match; confirmed → exact match. (3) `allowedCheckText` parameter added to `classifyProductTypeIntent` — `checkCategory` passes `evidenceText + why_recommended` for the allowed check so sparse names like "Roborock S8 MaxV Ultra" can confirm their type via the recommendation narrative without risking query-echoing text in why_recommended satisfying the substitute guard.
- **Why "wet dry" without requiring "vac":** Serper returns truncated product titles like "Milwaukee M18...Wet/Dry ..." — the word "Vac" is cut off. The `blocked` pattern matches "wet dry" alone, which is specific enough.
- **Sparse-name behavior:** Products whose evidence + why_recommended don't confirm robot vacuum type → "unverified" → near match with "Needs verification: Category: robot vacuum". Not excluded from near matches.
- 7 new tests added. 564 tests pass.

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
| Measurement Phase 2 | Replay fixtures: `tests/fixtures/`, `replay-quality-fixtures.mjs`, `save-debug-fixture.mjs`, 14 deterministic tests on synthetic fixture | Committed 2026-06-24: zero-cost stage-funnel + citation-strength replay proven on synthetic fixture |
| Phase 3A | Requirement-filter diagnostics on constrained queries ("gas grill under $600 4-burner", "robot vacuum under $300 self-emptying"). Root cause: funnel measurement inconsistency (exact-only tracking at filter stage) + latent spec preWindow direction-word poisoning. Fixed funnel + spec extraction + label. 3 new tests. | Committed 2026-06-24: 557 tests pass, typecheck + lint clean. No behavior change to filtering. |
| Phase 3B | Wrong-type contamination fix — wet/dry vacs, stick vacuums, canister vacuums, hand vacuums in robot vacuum exact/near matches. Root causes: no `robot_vacuum` rule in productTypeIntent; `checkCategory` binary (no three-state). Fixed: `robot_vacuum` rule, three-state category verdict, `allowedCheckText` for why_recommended. 7 new tests. | Committed 2026-06-24: 564 tests pass, typecheck + lint clean. Wrong-type products blocked from both exact and near matches. |

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
| `scripts/replay-quality-fixtures.mjs` | Load a saved debug payload; report stage funnel, citation strength, thin/weak winner, lost leaders. Exports `analyzeFixture()` for tests. `npm run qa:replay -- <file>` or `--all`. |
| `scripts/save-debug-fixture.mjs` | Call the API once with debug header; save payload to `tests/fixtures/review-radar-live/<slug>.json`. `npm run qa:save-fixture -- "query" [--gold "Brand Model"]`. |
| `tests/fixtures/robot-vacuum-synthetic.json` | Synthetic "best robot vacuum" fixture (7 pool candidates, citation-verify drop, rescue pattern, thin winner, 1 lost leader). Baseline for replay tests. |
| `tests/fixtures/review-radar-live/` | Live fixtures saved by `save-debug-fixture.mjs`. Not committed (add `_goldLeaders` before saving). |
| `tests/replayFixtures.test.mjs` | 14 deterministic tests on the synthetic fixture — stage funnel, citation strength, thin-winner, lost-leader drop-point. 0 API calls. |
| `docs/qa-loop-results.md` | Append-only QA log (Claude: 🟩 green, Codex: 🟧 orange) |
| `ReviewRadar-Overview.md` | Repo-root source of truth — read before major changes |

---

*Last updated: 2026-06-24 (Measurement Phase 2: replay fixtures — `replay-quality-fixtures.mjs`, `save-debug-fixture.mjs`, synthetic fixture, 14 deterministic tests). Maintained append-only — add entries, do not overwrite prior findings.*

---

## Phase 3C (2026-06-25): categoryTerms alias expansion

**Finding:** `categoryTerms()` did literal word-group matching without consulting `extractedRequirements` aliases. For "gas grill" queries, "propane" is a well-known alias for "gas" in the requirement system, but a product described only as a "propane grill" (no "gas" in any text field) failed the category check → "unverified" → excluded from exactScored → dropped when 7 exact matches exist.

**Fix:** `categoryTerms(category, extractedRequirements?)` now expands each term group with aliases from `requiredConstraints` where the constraint value or aliases include the category term. Generic: works for any query where category terms map to dealbreaker requirement values.

**Tests:** 4 new tests in `requirementValidation.test.mjs` — "categoryTerms alias expansion via extractedRequirements". All pass.

**Unconfirmed for future investigation:** Weber E-325 and Weber Genesis E-435 pass the category check (have "Gas Grill" in name) but score below all 7 winners. Exact scoring reason requires per-candidate enriched data not currently saved in fixtures. Future: add `exactScoredBreakdown` / `nearScoredReason` to debug output.

**Fixture unchanged:** `gas-grill.json` replay still shows same funnel results — this fix affects future LIVE runs, not the already-saved fixture (scoring happened in the live run, not replay).

---

## Final-selection trace instrumentation (2026-06-25): debug-only, behavior-change-free

**What:** Added `debug.stageFunnel.finalSelectionTrace` — a per-candidate array capturing why every candidate that reached `scoreAndSelectRecommendations` was selected, collapsed, disqualified, or ranked below cutoff. Zero behavior change.

**Types** in `lib/recommendationFunnel.ts`:
- `FinalSelectionDecisionReason` — 10-value union (selected, ranked_below_cutoff, duplicate_identity_collapsed, variant_family_collapsed, not_reliable_enough_for_exact, near_only_exact_full, disqualified_category, disqualified_avoid, disqualified_other, missing_trace_reason)
- `FinalSelectionCandidateStream` — 5-value union (exactScored, reliabilityNear, nearScored, disqualified, unknown)
- `FinalSelectionTraceEntry` — full shape with identity, stream, reason, score, citation, price-trust, form-factor modifiers

**Implementation** in `lib/recommendationScoring.ts`:
- Private `scoreAndSelectImpl` (shared body); public `scoreAndSelectRecommendations` unchanged; new public `scoreAndSelectRecommendationsWithTrace` returns `{ result, finalSelectionTrace }`
- `buildFinalSelectionTrace` classifies each afterRevalidation candidate by stream (via set membership) and reason (via `collapseReasonMap` which re-traces the `selectRankedExactMatches` loop)
- `nearCandidatesAll` (pre-slice) captured alongside `nearScored` (post-slice top 8) so ranked-9+ candidates get `ranked_below_cutoff`

**Route:** `app/api/recommendations/route.ts` destructures `scoreAndSelectRecommendationsWithTrace` and attaches `finalSelectionTrace` to `stageFunnel` debug payload.

**Replay script:** `scripts/replay-quality-fixtures.mjs` prints trace grouped by decision reason (selected first by rank, then not-selected grouped by reason with stream/score/collapsedBy). Prints "not present" message for old fixtures.

**Tests:** `tests/finalSelectionTrace.test.mjs` — 11 deterministic tests covering trace existence, shape, stream classification, all 4 disqualification paths, ranked_below_cutoff, identical result parity, score data, citation counts, and off-form-factor modifiers. All 11 pass; full suite 579/579 green.

---

## 2026-06-25 — Phase 3E: Source-quality upgrade (tests/sourceQualityUpgrade.test.mjs)

**What was built:** `upgradeWeakSourceEvidence` in `lib/requirementEvidenceRescue.ts` — a pre-scoring pass that finds retailer evidence for manufacturer-page candidates before final scoring.

**Trigger logic (`needsSourceUpgrade`):**
- Must have a model-number token (regex `\b[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*\b` applied to `product.name`, plus `metadata.modelNumber/sku/gtin`) with length ≥ 4 after normalization
- Must have `requirementCheck.failed.length === 0` (not disqualified)
- Must have ALL THREE weak-evidence signals: no verified price (`offers[].price.confidence !== "Low" && price !== null`), no `metadata.rating.value`, zero citations where `sourceHost(citation.url) !== sourceHost(product_page_url)`

**Key behaviors tested:**
- 3-category coverage: gas grill (E-325 model token), robot vacuum (RV1001AE), TV (QN65Q80C)
- `looksLikeSameProduct` identity gate reused (same function as requirement rescue)
- `mergeOffer` idempotent — never overwrites existing price
- `mergeRatingData` only writes when `!metadata.rating?.value` (null/undefined both excluded)
- `addVerificationCitation` deduplicates by URL (existing URL → no second citation added)
- Cap: `MAX_SOURCE_UPGRADE_CANDIDATES = 3` — 4 qualifying candidates → 3 searches, 3 traces
- Negative: identity mismatch (Char-Broil result for Weber E-325 query) → trace shows `evidenceAttached: false`

**Negative cases confirmed:**
- Has verified price → `needsSourceUpgrade = false` → `searchFn` never called
- Has failed requirement → `needsSourceUpgrade = false` → `searchFn` never called
- No model-number token ("Best Charcoal Grill Ever") → `needsSourceUpgrade = false`
- Has external citation (different host) → `needsSourceUpgrade = false`
- Has `metadata.rating.value` set → `needsSourceUpgrade = false`

**Route integration:** `routeDependencies.upgradeWeakSourceEvidence` called after `revalidatedAssetResult`, before `scoreAndSelectRecommendationsWithTrace`. Contract test identity mock: `async (result) => ({ result, sourceUpgradeTraces: [] })`.

**Debug visibility:** `debug.stageFunnel.sourceUpgradeTraces` → array of `{ name, query, evidenceAttached, attachedFields }`. Replay script prints section.

**Suite count:** 18 new tests; total 597/597 green. TypeScript clean.

---

### Phase 3F — Loosen source-upgrade trigger: replace citation-count check with useful-commerce-evidence check

**File:** `tests/sourceQualityUpgrade.test.mjs` (+5 tests; total 600/600)
**Changed:** `needsSourceUpgrade` trigger condition — replaced `countExternalCitations(product) === 0` with `!hasUsefulCommerceEvidence(product)`.

**`hasUsefulCommerceEvidence` logic (in `lib/requirementEvidenceRescue.ts`):**
Returns `true` when any citation is from a host that is:
- different from the product page host, AND
- `sourceTier === 1` (editorial: Wirecutter, RTINGS, etc.) OR `sourceTier === 2` (marketplace/retailer: Amazon, Home Depot, etc.)

Tier-3 citations (manufacturer/brand sites) and tier-4 citations do NOT count as useful commerce evidence.

**Key new cases now handled correctly:**
- `store.ridgid.com` (tier-3 brand subdomain) when product host is `ridgid.com` → NOT useful → eligible for upgrade
- `makitatools.com` (tier-3 manufacturer) when product URL host is `amazon.com` (self-citation excluded) → NOT useful → eligible for upgrade
- `wirecutter.com` (tier-1 editorial) → useful → NOT eligible (no upgrade wasted)
- `homedepot.com` (tier-2 retailer) → useful → NOT eligible (no upgrade wasted)

**New tests (5 added):**
- `needsSourceUpgrade` returns false for tier-2 retailer citation (renamed from "external citation" to reflect actual semantics)
- `needsSourceUpgrade` returns false for tier-1 editorial citation (new)
- `needsSourceUpgrade` returns true when only citation is same-brand subdomain — RIDGID RT1200 pattern (new)
- `needsSourceUpgrade` returns true when only external citation is manufacturer site on different domain — Makita XFD10Z pattern (new)

**What did not change:**
- Scoring weights, ranking, selection logic unchanged
- `modelTokens` detection unchanged (Napoleon Rogue 525, Samsung Bespoke still excluded)
- All Phase 3E safety gates intact (failed requirements, identity gate, idempotent merges, cap)
- Existing 18 Phase 3E tests all pass unmodified

### Phase 3G — Source-upgrade search-result diagnostics (2026-06-26)

**What changed:** `SourceUpgradeTrace` in `lib/requirementEvidenceRescue.ts` extended with 4 new debug-only fields. No behavior change.

**New type:** `SourceUpgradeCandidateSample { name, host, price, rating, identityMatch, rejectionReason }` (exported).

**New `SourceUpgradeTrace` fields:**

| Field | Type | Meaning |
|---|---|---|
| `candidatesReturned` | `number` | Total shopping results Serper returned (0 = empty results) |
| `candidatesEvaluated` | `number` | Candidates that passed `looksLikeSameProduct` |
| `noMatchReason` | `string?` | Why nothing attached: `shopping_results_empty`, `identity_rejected`, or `no_attachable_fields`. Absent when `evidenceAttached=true` |
| `candidateSample` | `SourceUpgradeCandidateSample[]` | First ≤5 candidates with name, host, price, rating, identityMatch, rejectionReason |

**`rejectionReason` values per candidate:**
- `"identity_mismatch"` — `looksLikeSameProduct` returned false
- `"no_attachable_fields"` — identity passed but no price/rating/citation/image to attach
- `null` — this was the winning match (`evidenceAttached=true`)

**Replay script:** `printSourceUpgradeTraces` in `scripts/replay-quality-fixtures.mjs` now prints results count, identity-match count, `noMatchReason`, and candidate sample per trace entry. Gracefully skips new fields when absent (pre-3G fixtures).

**Tests added (5 new, total 605):**
1. Empty results → `candidatesReturned:0`, `noMatchReason:"shopping_results_empty"`, `candidateSample:[]`
2. All candidates fail identity → `candidatesReturned:1`, `candidatesEvaluated:0`, `noMatchReason:"identity_rejected"`, `candidateSample[0].rejectionReason:"identity_mismatch"`
3. Evidence attached → `evidenceAttached:true`, `candidatesEvaluated:1`, `noMatchReason:undefined`, `candidateSample[0].rejectionReason:null`
4. candidateSample capped at 5 even with 7+ candidates
5. Old-format traces (no new fields) handled gracefully by replay guard

**Safety gates unchanged:** trigger logic, scoring, ranking, identity matching, query construction, price trust, citation trust all unmodified.

---

## 2026-06-27 — Phase 5A: Source-upgrade same-product safety (RR-058)

**Reproduced failure:** `Whynter RPD-411WG ... Dehumidifier` accepted `Whynter 34 Bottle Freestanding Wine Refrigerator` from a specific Google Shopping offer and attached `$479`, rating 4.1, 204 reviews, and a citation.

**Exact root cause:** RR-053 correctly removed the Google `q=Whynter+RPD-411WG` parameter from identity evidence. The remaining token-overlap fallback still counted repeated tokens from the target's `name` and `metadata.title`; repeated `Whynter` occurrences could satisfy the overlap threshold without any product-type agreement. Broad overlap could likewise override a different explicit same-family model.

**Fix:**
- Source-upgrade calls `classifyProductTypeMatch` before exact-model/token-overlap identity acceptance.
- The shared conflict registry treats explicit wine/beverage refrigerator, fridge, or cooler evidence as incompatible with a dehumidifier request unless dehumidifier evidence is also present.
- A source title with a different explicit token in the same model family is rejected (`RPD-411WG` versus `RPD-561EGP`).
- The model check remains supplemental. The product-type rejection works without any target model token.

**Preserved positives:**
- exact source-derived model title;
- merchant URL path carrying the exact model;
- same-brand same-product dehumidifier;
- sparse candidates with no explicit type/model conflict;
- uppercase measurement text such as `765 CFM` when it is not the target model family;
- RR-048/RR-049/RR-051/RR-053 behavior and normal user-facing result shape.

**Deterministic verification:**
- New RR-058/type/model/measurement tests: 4 source-upgrade regressions plus 1 shared product-type regression.
- Focused source/type/identity/Serper/requirement tests: 170/170.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 647/647.
- `node scripts/eval-pipeline.mjs`: no red-flag issues.
- Live calls: 0.

**Status:** RR-058 Fixed. Do not remove or weaken these regressions during Phase 5B model-token expansion.

---

## 2026-06-27 — Phase 5B: Source-upgrade identity coverage

**Issues fixed:** RR-052, RR-057, RR-034, RR-035, RR-044.

**Pre-fix reproductions:**
- RIDGID `4.25 Peak HP ... HD0900` plus ambiguous `metadataBrand: HP` produced `HP HD0900`.
- BLACK+DECKER BEBL7000 selected `AMP 250` before the real compact model.
- Napoleon `Rogue 525`, Samsung `Bespoke Jet Bot AI+`, FEIN `9-20-36`, and Milwaukee `M18` were not source-upgrade eligible.
- Nine fail-first assertions failed before implementation.

**Brand behavior:**
- `HP` is removed from brand evidence only in explicit horsepower contexts: number + optional `Peak` + HP, `Peak/maximum/rated HP`, or `horsepower (HP)`.
- Genuine HP computer-brand titles remain positive.
- Ambiguous metadata HP is ignored only when the product title proves it is a measurement occurrence.
- When trusted metadata/shared brand inference is absent, a guarded non-generic leading title token can supply compact query identity.

**Model extraction:**
- Candidates are ranked as `strong` or `family`; selection no longer uses the first regex match.
- Strong coverage: compact alphanumeric models, uppercase word-number models, mixed word-number series, and brand-qualified numeric-dash models.
- Family coverage: brand-qualified descriptive families and short tokens such as M18.
- Separated unit-number/descriptor-number phrases are suppressed (AMP, MPH, CFM, HP, PSI, GPM, BTU, voltage, capacity, size, pack, series, and related forms).
- Meaningful adjacent series/suffix context is preserved (`Spirit E-325`, `Rogue XT 425 SIB`, `FMM 350 QSL`, `M18 FUEL`) without restoring long product-title filler.

**Attachment safety:**
- Only strong tokens can take the exact-model fast path.
- Family-only identity requires the requested category/product noun in source-derived candidate evidence.
- Different explicit same-family tokens reject.
- Different brand-qualified numeric-dash models reject.
- Product token overlap is deduplicated, so repeated metadata/title brand tokens cannot inflate identity.

**Key regressions:**
- M18 circular saw -> M18 cordless drill: rejected.
- M18 hammer drill -> M18 cordless drill: accepted.
- FEIN 9-20-37 -> FEIN 9-20-36: rejected.
- Measurement-only and unbranded M18 titles: ineligible.
- Exact Phase 5A Whynter wrong-type, no-token type mismatch, valid same-product, and different-model cases: green.
- RR-048/RR-049/RR-051/RR-053: green.

**Verification:**
- Focused source/brand/type/identity/Serper/requirement tests: 183/183.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 660/660.
- `node scripts/eval-pipeline.mjs`: no red-flag issues.
- Live calls: 0.

**Status:** Phase 5B complete. Keep these identity coverage and safety cases green during later source-upgrade reliability work.

---

## 2026-06-28 — Phase 5C: Cross-category tiny-price trust

**Issue fixed:** RR-002.

**Pre-fix deterministic reproduction:**
- Saved shop-vac, dash-cam, and wireless-earbud products each carried a `$10` retailer offer and `$10` recommendation text.
- `minimumLikelyFullProductPrice` returned `null` for all three contexts.
- Because the global absolute floor is exactly `$10`, `plausibleProductPrice` returned `10`.
- `assessProductPriceTrust` then returned `verified`, `canUseForBudget: true`, and `canBeExactWithBudget: true`.
- The exact saved shop-vac title uses plural `Wet Dry Vacuums`; singular test titles would not reproduce the gap because singular `vacuum` was already covered.

**Fix boundary:**
- Existing vacuum floor now recognizes plural `vacuums`, `shop vac`, and wet/dry-vac forms.
- Dash-camera full products use a `$20` minimum.
- Wireless/true-wireless/Bluetooth earbuds use a `$12` minimum.
- Global `PRICE_ABS_FLOOR = 10` remains unchanged.
- No source-host, retailer, brand, or model exception was added.

**Required outcomes:**
- Below class floor: `status: suspicious`, `price: null`, `canUseForBudget: false`, `canBeExactWithBudget: false`.
- Asset display: `Price not verified`.
- Final selection: suspicious candidate moves out of exact Best Matches.
- Positive boundary: `$12.99` wireless earbuds remain `verified`; fresh `$20` Soundcore earbuds remained exact.

**Regression coverage:**
- Exact plural RIDGID fixture title.
- Shop-vac, dash-camera, and wireless-earbud `$10` negatives.
- Asset display rewrite.
- Exact Best Match demotion.
- Real cheap wireless-earbud positive.
- Existing installment, refrigerator, conflicting-price, ordinary cheap product, and text-price budget tests.

**Verification:**
- Focused price/assets/scoring/requirements tests: 116/116.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 665/665.
- Eval red-flag checks: clean.

**Fixture semantics:** `qa:replay` analyzes frozen result JSON and does not re-run current trust code. Preserve the old replay as historical proof, then separately reassess saved product objects when validating a trust-code change.

**Live calls:** Three approved calls: `shop vac`, `dash cam`, `wireless earbuds`. No `$10` exact result. Do not commit the generated live fixtures.

**New issue:** RR-062. Fresh dash-cam output verified VIOFO A229 Pro at `$19,999`. The `$322.99` source-upgrade sample was later confirmed to belong to BlackVue DR770X, not VIOFO.

**Status:** Phase 5C complete. Keep RR-002 regressions green; RR-062 remains isolated and unresolved.

---

## 2026-06-28 — RR-062 malformed-high-price diagnostic

**Issue diagnosed:** RR-062; no behavior fix.

**Saved-fixture stage proof:**
- VIOFO A229 Pro has no verified price in `candidatePool`, `postVerifyCandidates`, or `postFilterCandidates`.
- Asset enrichment adds a single Medium-confidence `retailer_page` offer of `19999` from the VIOFO A229 landing page.
- VIOFO has no source-upgrade trace. The fixture's `$322.99` source-upgrade sample belongs to BlackVue DR770X, so there is no VIOFO price merge conflict.

**Exact extraction proof:**
- The current cited page contains an unrelated A139 widget with `data-price="19999"`.
- Passing that page through current `buildMetadata` reproduces the exact 19,999 offer.
- `priceFromPageMetadata` scans structured price attributes across the full page.
- `priceFromValue` permits bare numerics, so a Shopify-style minor-unit integer is treated as dollars.
- The price is not checked for surrounding product identity before enrichment.

**Trust path:**
- One Medium-confidence retailer-page signal is sufficient for `verified`.
- Existing `plausibleProductPrice` and class floors protect against malformed low prices.
- They do not protect against a lone malformed high integer, missing minor-unit context, or unrelated same-page product metadata.

**Classification:** This is not RR-002, Serper, source upgrade, model-number parsing, stale evidence, or merge selection. It is unscoped structured-page extraction plus minor-unit misinterpretation, with a secondary high-outlier/product-affinity containment gap.

**Future regression requirements:**
- Reject or correctly normalize bare minor-unit `data-price` values that are not product-scoped.
- Reject unrelated product-widget prices on a target landing page.
- Preserve valid product-scoped structured metadata.
- Preserve legitimate high-end product prices; do not implement a blunt global maximum.
- Keep all RR-002 low-price, installment, text-price, and exact-budget tests green.

**Verification:** Focused price/assets/scoring/requirements/Serper tests 153/153; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 665/665; eval red-flag checks clean.

**Live calls:** No ReviewRadar search. One read-only retrieval of the cited VIOFO page was used to identify the raw field.

**Status:** RR-062 is Open with a confirmed root cause. Fix it in a separate narrow phase before Phase 5D.

---

## 2026-06-28 — RR-062 product-scoped price extraction

**Issue fixed:** RR-062.

**Fail-first reproduction:**
- Target `VIOFO A229 Pro` plus unrelated same-page `data-title="A139 ..."` / `data-price="19999"` produced a 19,999 retailer-page offer.
- A completely unscoped `data-price="19999"` did the same.

**Binding rules:**
- Select the schema.org `Product` whose identity agrees with the requested product instead of taking the first node.
- Page-level metadata, named price fields, and visible-price fallback require matching page identity.
- Element-level `data-price` fields require matching product identity in the same tag.
- Bare integer element prices are ignored unless a matching product element explicitly declares `cents`, `minor`, or an equivalent supported minor-unit marker.
- Do not assume every bare integer is cents.
- Standard schema.org `Offer.price` retains schema semantics.

**Required positives:**
- Matching page-level meta price.
- Matching element-level decimal/currency price.
- Explicitly marked minor-unit conversion with matching product identity.
- Matching product among multiple same-page JSON-LD products.
- Legitimate `$19,999` structured product price. There is no global upper-price cap.

**RR-002 regression boundary:** Suspicious-low shop-vac, dash-camera, wireless-earbud, installment, conflicting-price, text-price, and exact-selection tests remain green.

**Verification:** Product-assets 20/20; focused price/assets/scoring/requirements 123/123; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 672/672; eval red-flag checks clean.

**Saved fixture:** Immutable replay remains historical. Reassessing the saved pre-asset VIOFO candidate against current page extraction removes `19999`; a stray `$1` visible value is classified suspicious and exact-ineligible by RR-002.

**Live call:** One `dash cam` save/replay. VIOFO A229 Pro 2CH ranked exact #2 at `$349.99`, verified from matching JSON-LD. No malformed high verified price appeared.

**Status:** RR-062 Fixed. Keep these product-binding and explicit-minor-unit regressions green during later asset work.

---

## 2026-06-28 — Phase 5D product-card eligibility

**Issues fixed:** RR-007, RR-008, RR-009.

**Regression contract:**
- Generic category/family collections must not render as cards, including manufacturer `/products/...` paths whose title repeats the requested category.
- Support, advice, learning-center, customer-service, manual, and documentation pages may remain evidence, but never primary product cards.
- Documentation mirrors with model-looking titles, prices, or images remain evidence-only.
- Valid manufacturer and merchant product-detail pages must continue to pass.
- Requested category must be supplied to eligibility at Serper discovery and final citation filtering.

**Required examples:** Keep MHP, Daikin, Champion, Briggs, Best Buy collections, Bissell support, Best Buy advice, PetSmart learning, Shop-Vac customer service, `device.report`, and manual-library negatives green. Keep AeroPress and both supported Best Buy product URL shapes positive.

**Verification:** Fail-first 5 assertions; focused 78/78; broad focused 192/192; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 678/678; eval clean.

**Live calls:** Exactly three: `portable generator`, `shop vac`, `air purifier`. No full baseline. Generated fixtures remain untracked.

**Status:** RR-007/RR-008/RR-009 Fixed. Preserve RR-062 tests and do not use Phase 5D eligibility to alter ranking or citation-strength policy.

---

## 2026-06-28 — Phase 5E product-type and literal requirement truthfulness

**Issues fixed:** RR-017, RR-043, RR-055. **Issue reopened:** RR-007.

**Product-type regression contract:**
- Reject pressure-washer consumables/dishwashers, portable power stations, basketball wall art/accessories, backup cameras, and washer/dryer appliances for the corresponding product requests.
- Keep explicit valid hardware exact-capable and thin unknown products unverified rather than rejected.
- Evaluate exclusive complement shape from candidate identity/name, not incidental source snippets.
- Apply the same shared type verdict during Serper prefiltering and requirement revalidation.

**Literal requirement contract:**
- Literal provider/merchant identity can satisfy a generic feature even when comparative review prose is negative.
- Query-assigned category and generated explanation text cannot satisfy the feature.
- Identity text that explicitly negates the feature still fails.

**Required tests:** Keep the ZEP, Goal Zero/BioLite, basketball wall-art, YADA, GE washer/dryer, Generac comparative-portability, explicitly non-portable generator, sparse valid hoop, source-upgrade RR-058, RR-062 asset, RR-002 price, and Phase 5D eligibility regressions green.

**Verification:** Focused 83/83; broad safety matrix 314/314; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 684/684; eval clean.

**Live calls:** Four total: `shop vac`, `pressure washer` twice, and `portable generator`. ZEP disappeared after the final refinement; no power stations survived; multiple unrelated generators passed `Portable`. No broad baseline.

**Known boundary:** `Pressure Washers - Best Buy` still rendered exact #7, reopening RR-007. The Shop-Vac customer-service candidate remained absent from final cards but survived citation verification before requirement filtering.

---

## 2026-06-28 — RR-007 nested catalog-page regression cleanup

**Issue fixed:** RR-007.

**Regression contract:**
- Reject nested retailer catalog identifiers such as `abcat...c`, `cat...c`, and `pcmcat...c` regardless of category-path depth.
- Reject generic department/browse routes and strong faceted-listing parameters unless the URL is a known product-detail shape.
- Do not treat every retailer `/site/` path as product detail; preserve only explicit supported SKU/detail patterns.
- Keep valid retailer SKU pages and specific manufacturer product pages eligible.
- Category, collection, support, manual, and documentation pages may remain secondary evidence when safe but cannot become the primary product card.

**Required tests:** Keep the exact `Pressure Washers - Best Buy` URL negative at shared eligibility, Serper normalization, and final citation filtering. Keep unrelated department/browse/faceted negatives, Phase 5D collection/support/documentation negatives, Best Buy legacy/modern SKU positives, and Phase 5E type/requirement regressions green.

**Verification:** Fail-first 3 failures; focused card-path tests 89/89; broader Phase 5E safety matrix 177/177; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 686/686; eval clean.

**Live call:** Exactly one `pressure washer` save/replay. Six exact and one near product used specific product-detail primary URLs; the Best Buy catalog page was absent. A Craftsman family page remained secondary evidence only.

**Status:** RR-007 Fixed. Phase 5F remains unstarted and must stay limited to RR-022.

---

## 2026-06-28 — Phase 5F citation retention

**Issue fixed:** RR-022.

**Regression contract:**
- Verify unverified LLM product-page URLs per candidate even when unrelated provider URLs already exist.
- Do not re-fetch already verified Serper product URLs.
- Put an exactly verified, product-specific page first; editorial/category evidence may remain secondary only.
- Require explicit retailer detail shape, model path, or distinctive final-slug/name agreement.
- Unknown manufacturer pages need exact reachability verification before they can be primary.
- Never let unrelated global verification, a forged self-cite, generic family slug, category, support, manual, documentation, or unreachable URL rescue a card.

**Required examples:** Keep Oral-B plus editorial evidence, EGO versus same-host category substitution, specific Purina/Hill's paths, and normal retailer/manufacturer pages positive. Keep `/pro-plan/products/dog-food`, Home Depot categories, Phase 5D support/docs/collections, RR-007 nested catalogs, and unrelated verification negative.

**Verification:** Fail-first 3 failures; focused 69/69; broad safety matrix 282/282; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.

**Fixture semantics:** Frozen Phase 4 electric-toothbrush, dog-food, and wireless-earbud fixtures preserve historical drops but omit full pre-verification citation objects, so current retention cannot be replayed directly against them.

**Live calls:** Two total. `electric toothbrush` had 28 pool and 28 post-citation candidates with seven specific product-page exact cards. The initial `dog food` call still dropped 11 and exposed a generic Purina family card; the final path-binding guard covers specific Purina/Hill's positives and the family negative deterministically. The final refinement was not live-retested because the call cap was exhausted.

**Status:** RR-022 Fixed with a bounded live-proof caveat. RR-013 unchanged. Preserve this separation in Phase 5G.

---

## 2026-06-28 — Phase 5F dog-food live confirmation

**Purpose:** Confirm the final product-path binding code after the original Phase 5F live-call cap.

**Live call:** Exactly one `dog food` save/replay. The funnel was 23 pool, 16 after citation verification, 10 after requirements, and 7 exact.

**What was proved:** Six specific Purina/Hill's candidates survived citation verification. The generic Purina `/pro-plan/products/dog-food` family card did not recur. RR-022 is live-confirmed for dog food; the later requirement-stage removals are outside citation retention.

**New regression shape:** A Substack article titled `Is Costco (Kirkland) Dog Food Actually Good?` became exact #5. Generic cross-host `/p/` handling can classify an editorial post route as product detail when the title does not match existing review/article phrases. Track this under reopened RR-008, not RR-022.

**Verification:** Focused eligibility/citation/API tests 60/60; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.

**Status:** RR-022 remains Fixed; RR-008 Needs Investigation. Before Phase 5G, prefer a narrow generalized regression test and eligibility fix that blocks article-question pages without invalidating genuine retailer/manufacturer `/p/` product routes.

---

## 2026-06-28 — RR-008 article-card cleanup

**Issue fixed:** RR-008.

**Regression contract:**
- Interrogative product-opinion titles such as `Is ... actually good?`, `Should you buy ...?`, `worth it`, and `our verdict` are evidence-only.
- Hosted publishing platforms remain evidence-only even when they use product-looking `/p/` paths.
- Genuine retailer and manufacturer `/p/` product pages remain eligible.
- The same decision must hold in shared eligibility, Serper normalization, and final citation filtering.
- Preserve RR-022 product-page retention and all RR-007/RR-009 support, listing, manual, and documentation negatives.

**Verification:** Fail-first 3 failures; focused 87/87; broad price/type/requirement/citation/source-upgrade matrix 192/192; typecheck passed; lint 0 errors with 3 existing warnings; full suite 694/694; eval clean.

**Live call:** Exactly one `dog food` save/replay. BK Pets and all Substack/editorial cards were absent. Purina/Hill's products survived citation verification. Seven exact products and zero near products remained.

**Adjacent findings:** Chewy `/brands/` family slugs with numeric IDs still pass the generic product-detail fallback (reopened RR-007). Same-brand citations can refer to different recipes (RR-063). Preserve the RR-008 fix while addressing those separately.

**Status:** RR-008 Fixed. Stop before Phase 5G pending explicit direction on RR-007/RR-063.

---

## 2026-06-29 - RR-007/RR-063 product-evidence identity safety

**Issues fixed:** RR-007 and RR-063.

**Regression contract:**
- Generic `/brand`, `/brands`, `/family`, `/category`, and `/collection` routes cannot become primary product-card URLs, including final slugs with numeric catalog IDs.
- Do not use the generated recommendation name as source evidence for an existing primary URL.
- Primary links need source-derived same-product identity; unsafe stale links must be cleared before page enrichment.
- Specific product-page citations with conflicting models, food recipes/proteins, flavors, life stages, recipe bases, supplement flavors, or cosmetic shades must be removed.
- A product-page citation with unknown same-product identity cannot support the card.
- Exact same-product pages and safe package-size variants remain valid.
- Generic family/editorial pages may remain secondary evidence but cannot become the card URL.
- Preserve RR-022 retention, RR-008 editorial blocking, RR-007/RR-009 page negatives, RR-002/RR-062 price trust, Phase 5E type/requirements, and source-upgrade identity safety.

**Required examples:** Keep Chewy and unrelated retailer family routes negative; specific Chewy `/dp/`, Walmart `/ip/`, retailer `/product/`, and manufacturer detail pages positive. Keep Purina Salmon versus Beef/Rice, Hill's Chicken versus Salmon, JustFoodForDogs Chicken/Rice versus Fish/Sweet Potato, Blue Buffalo Adult Chicken/Rice versus Puppy Chicken/Oatmeal, Iams Lamb/Rice versus Small/Toy, and Samsung QN90D versus QN85D negative. Keep exact products and package-size variants positive.

**Verification:** Fail-first 8 failures plus missing module; focused 84/84; broad safety 295/295; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 706/706; eval clean.

**Live call:** Exactly one `dog food` save/replay. Six exact and five near products used only specific primary product URLs. No family/category/editorial/support/manual/documentation card survived. The final post-live refinement was checked by passing the saved fixture through current citation filtering; the Blue Buffalo puppy/oatmeal and unrelated Iams citations were removed.

**Status:** RR-007 and RR-063 Fixed. RR-013 unchanged. Phase 5G remains unstarted.

---

## 2026-06-29 - Phase 5G product-specific citation-strength ranking

**Issue fixed:** RR-013.

**Regression contract:**
- Rank only already-eligible products; citation strength must never rescue a failed price, type, requirement, page, or identity gate.
- Use verified `citation_type` only when the citation is `same_product` under the shared evidence-identity classifier.
- One independent source scores `+6`; multiple independent sources and retailer corroboration cap at `+8`.
- Retailer-only support scores `+2` to `+4`; safe retailer-only products remain eligible and competitive.
- A true self-only citation set scores `-2`, not a hard rejection.
- Generic family/category/editorial evidence, wrong recipes/models, unknown specific-product pages, and untyped citations receive no Phase 5G credit.
- Typed citation-derived source-quality, expert-mention, and evidence-strength counts use the same product-specific subset.
- Preserve RR-022 retention, RR-007/RR-008/RR-063 page and identity safety, RR-002/RR-062 price trust, Phase 5E type/requirements, and source-upgrade identity.

**Required examples:** Keep the gas-grill and headphones retailer-versus-independent comparisons, generic dog-food editorial/family negatives, wrong Purina recipe negative, retailer-only positive, self-only bounded penalty, and Phase 5G OFF/ON switch green.

**A/B command:** `node scripts/ab-ranking.mjs --citation-strength`.

**A/B result:** Nexgrill `#1 -> #2`; Weber `#2 -> #1`; suspicious `$1` Weber stayed near-only. Only `REVIEW_RADAR_CITATION_STRENGTH` changed between runs.

**Verification:** Fail-first 3 failures; focused 57/57; broad safety 348/348; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 712/712; eval clean.

**Fixture result:** Gas-grill and cordless-drill snapshots have no independently supported challenger. Running-shoes reassessment credits exact product-specific Saucony/Kayano editorial evidence and withholds credit from generic or wrong-model citations.

**Live calls:** None. No broad baseline.

**Status:** RR-013 Fixed. Phase 5H remains unstarted.

---

## 2026-06-29 - Phase 5H final-selection diversity/form-factor quality

**Issues fixed:** RR-056, RR-059, RR-060. RR-014 was measurement-only and remains Needs Investigation.

**Regression contract:**
- Hard-collapse only strict exact-model duplicates: same canonical identity, exact normalized title, or same-brand shared strong model token.
- Preserve explicit different models (`M27Q`, `M27Q2`, `M27Q-P`), different sizes, distinct same-brand products, and distinct same-retailer products.
- Keep broad canonical/evidence-family matching separate from strict final-slot duplicate identity.
- Family concentration is a soft selection adjustment (`12` per prior member, cap `24`), never a hard brand/retailer cap or an eligibility rule.
- Unrequested niche form factors receive a bounded selection-only prior (`50` cap); explicitly requested or compatible niche forms receive no prior.
- Do not modify Phase 5G `citationStrengthScore` or any hard price, citation, page, product-type, requirement, or source-upgrade gate.
- Keep new trace fields present: `modelFamilyKey`, `familyRepeatCount`, `familyConcentrationPenalty`, `formFactorPenalty`, `adjustedSelectionScore`.

**Required examples:** Keep cross-retailer M27Q duplicate collapse, M27Q2/M27Q-P negatives, same-retailer distinct positives, Sonicare third-variant replacement, broad under-desk treadmill demotion, explicit under-desk positive, and Phase 5G citation scoring green.

**Fixture proof:** Gaming monitor collapses the second M27Q card; coffee maker moves the 14-cup mainstream product above AeroPress; treadmill moves Horizon 7.0 AT above the under-desk winner; cordless drill keeps distinct Milwaukee M18 kits. Five RR-014 benchmark fixtures stayed neutral at mean `3.0/7`.

**Verification:** Fail-first 3 failures with 2 controls green; focused/broad safety 303/303; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 724/724; eval clean; Phase 5G A/B unchanged.

**Live call:** Exactly one `electric toothbrush` save/replay. A fourth Sonicare received the capped family penalty and fell below the final seven; a distinct Oral-B product filled the slot.

**New safety issue:** RR-064. The same live run attached DiamondClean Smart 9300 price/rating/review/citation evidence to a DiamondClean 9000 target. Treat this as a Critical source-upgrade identity stop condition. Reproduce deterministically before editing; preserve RR-051/RR-053/RR-058 and valid exact-model attachment.

**Eligibility recurrence:** RR-007 and RR-008 reopened. An Oral-B twin-pack/category page, an ANSI blog, and two Electric Teeth comparisons remained `reliableEnoughForExact` below cutoff. They did not render, but future eligibility tests must assert these shapes never enter the exact-scored product-card pool.

**Status:** Phase 5H complete. Stop before Phase 5I pending explicit RR-064 direction, then address RR-007/RR-008 separately.

---

## 2026-06-30 - RR-064 source-upgrade conflicting-model safety

**Issue fixed:** RR-064.

**Regression contract:**
- Source-derived explicit model/series conflicts must reject before exact-model or family-overlap positives.
- `DiamondClean 9000` must reject `DiamondClean Smart 9300`, even when a Google Shopping `q=` parameter repeats the target query.
- Different alphabetic prefixes do not make conflicting series values safe when meaningful family identity is shared.
- Years, prices, measurement values, and package/count differences are not model-series conflicts.
- Query-derived snippets, search parameters, and generated fallback text remain unusable as identity evidence.
- Exact same-product offers across retailers and safe color/count variants remain attachable.
- Preserve RR-051, RR-053, RR-058, RR-063, RR-022, Phase 5G scoring, and Phase 5H selection regressions.

**Required examples:** Keep the DiamondClean 9000/9300 negative, Smart 1500/3000 negative, exact DiamondClean 9000 positive, same-model color/count positives, Whynter wine-refrigerator negative, HP-query-parameter negative, and valid source-title/merchant-path positives green.

**Verification:** Fail-first 1 RR-064 failure with 71 controls passing; focused broad safety 157/157; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 729/729; eval clean.

**Live call:** Exactly one `electric toothbrush` save/replay. Smart 9300 was rejected for DiamondClean 9000, then an explicit 9000 offer attached. The 2100 attempt rejected a 4100 candidate before attaching a 2100 offer. No broad baseline ran.

**Status:** RR-064 Fixed. RR-007/RR-008 remain Needs Investigation; address them separately before Phase 5I.

---

## 2026-06-30 - RR-007/RR-008 pre-final eligibility cleanup

**Issues fixed:** RR-007 and RR-008.

**Regression contract:**
- Paginated category/bundle titles cannot become products, including deep `/products/...` routes.
- Standards identifiers/documents, comparison/vs titles, and press-release announcement titles are evidence-only.
- Blog/news/press/journal/stories subdomains and comparison/standards/press-release paths are evidence-only before product-detail shortcuts.
- Product-looking digits, images, prices, and deep paths cannot override an evidence-page signal.
- Specific retailer/manufacturer product pages remain card-eligible.
- Safe editorial/category/comparison sources may remain secondary citations but cannot become a primary link, exact candidate, or product-specific ranking proof.
- Preserve RR-022 retention, RR-063/RR-064 identity, RR-013 ranking, RR-002/RR-062 price, Phase 5E type/requirements, and Phase 5H selection.

**Required examples:** Keep Oral-B twin-pack/category, ANSI standards, Electric Teeth comparison, and MultiVu announcement negatives; specific Oral-B/Sonicare positives; secondary comparison evidence; unrelated retailer categories and hosted editorial pages; and all named safety controls green.

**Verification:** Fail-first 4 failures with 152 controls passing; focused 157/157; broad named-regression safety 330/330; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 735/735; eval clean.

**Fixture/live proof:** Current code removes the pre-fix MultiVu final #7 card. Exactly one post-fix `electric toothbrush` run returned five specific product cards and no unsafe page in the exact-scored trace. An Oral-B lineup page remained secondary with `unknown` product identity. RR-064 source-upgrade attachment stayed model-safe. No broad baseline ran.

**Status:** RR-007/RR-008 Fixed. Phase 5I remains unstarted pending explicit instruction.

---

## 2026-06-30 - Phase 5I reliability attempt stopped by RR-065

**Fail-first contract:**
- A model-qualified product with only one evidence pillar must not be considered source-complete when two of verified price, rating, and product-specific commerce citation are missing.
- A nonempty primary candidate set with zero safe attachments is distinct from success; any future fallback retry must remain bounded to one call.

**Safety finding:**
- A bounded retry after `primary_no_safe_attachment` exposed an unsafe identity pass for target `Amazon.com: RIDGID ... VAC1200`.
- Retailer/source prefixes must not become product brands.
- Same category plus a shared retailer token cannot replace source-derived target brand/model identity.
- A model-qualified target must reject candidates that lack its source-derived brand/model, even when product type agrees.
- Keep RR-051 query-text isolation, RR-053 URL-query isolation, RR-058 type agreement, RR-063 variant identity, and RR-064 explicit model-series conflict regressions green.

**Verification evidence:** Candidate implementation: focused source-upgrade/replay 92/92, typecheck pass, lint 0 errors with 3 existing warnings, full suite 738/738, eval clean. One live `shop vac` call then exposed RR-065; all candidate app/test changes were rolled back. The restored repository then passed typecheck, lint with the same 3 warnings, 735/735 tests, and eval.

**Live-call rule:** Do not spend another Phase 5I proof call until RR-065 is fixed deterministically. The untracked `shop-vac.json` records the stop-condition run but is not a committed fixture.

**Status:** RR-065 Open. RR-041/RR-042 remain Needs Investigation. Phase 5I behavior is not implemented; Phase 5J must not start.

---

## 2026-06-30 - RR-065 retailer/source identity safety

**Regression contract:**
- Strip only explicit leading source/retailer labels before target and source-title identity checks.
- Seller/retailer fields, URL hostnames, URL query parameters, and query-derived snippets cannot satisfy brand or model identity.
- Safe merchant product URL paths remain identity evidence.
- When a reliable target brand exists, source-derived candidate evidence must contain it before source upgrade attaches.
- `Amazon.com: RIDGID ... VAC1200` must reject Amazon Basics, SKIL, and other wrong-brand vacuums.
- A real Amazon-hosted RIDGID VAC1200 page remains valid when title/path carries RIDGID/model identity.
- Amazon Basics remains valid when it is the actual target brand.
- Preserve RR-051, RR-053, RR-058, RR-063, RR-064, RR-007/RR-008 deterministic coverage, RR-013, RR-022, RR-002/RR-062, Phase 5E, and Phase 5H.

**Brand-matching caveat:** Compact alias matching remains behavior-compatible for ranking stability, but an alias cannot be inferred from inside a longer token (`ASICS` inside `Basics`). Multiword brands must not duplicate one of their own words in compact source-upgrade queries.

**Verification:** Fail-first 74/75; focused identity 90/90; broad named safety 340/340; ranking baseline stable; typecheck passed; lint 0 errors with 3 existing warnings; full suite 744/744; eval clean.

**Live call:** Exactly one `shop vac` save/replay. RIDGID HD1400 safely attached exact evidence; no wrong-brand upgrade attached. The prior retailer-prefixed VAC1200 target did not recur. A Bosch `/ocs-c/` category collection became exact #3 and reopened RR-007.

**Status:** RR-065 Fixed. RR-007 Needs Investigation. RR-041/RR-042 unchanged. Do not retry Phase 5I until RR-007 is contained.

---

## 2026-06-30 - RR-007 opaque collection-page eligibility

**Regression contract:**
- Opaque manufacturer collection suffixes such as `ocs-c` are collection evidence, not product model identity.
- Product-range/family/lineup routes cannot become cards merely because they contain images, prices, product words, or catalog-like digits.
- Contextual family/series routes need concrete model identity in both title and trailing path before they can avoid the collection verdict.
- Collection/listing negatives run before product-detail, price/image, internal-record, and model-like shortcuts.
- Known retailer detail routes and specific manufacturer product pages remain card-eligible.
- Safe generic evidence may remain secondary through existing evidence paths, but cannot become a primary link or exact product proof.
- Preserve RR-008, RR-013, RR-022, RR-063, RR-064, RR-065, RR-002, RR-062, Phase 5E, and Phase 5H regressions.

**Required examples:** Keep the exact Bosch `/wet-dry-extractors-2549705-ocs-c/` negative, an unrelated opaque product-range negative, a model-specific Bosch positive, known retailer positives, and final citation-filter rejection green.

**Verification:** Fail-first 59/61; focused final 61/61; broad named safety 308/308; typecheck passed; lint 0 errors with 3 existing warnings; full suite 747/747; eval clean.

**Fixture/live proof:** Frozen fixture replay remains historical. Current-code reassessment changes the Bosch record to `listing_or_search`. One fresh `shop vac` call returned only specific product-page final URLs and no collection/listing/family card.

**Status:** RR-007 Fixed. RR-041/RR-042 remain Needs Investigation. Phase 5I/5J were not started.

---

## 2026-06-30 - Phase 5I retry safety memory / RR-066

**Fail-first contract:**
- A reliable model-qualified product missing verified price and same-product commerce evidence must not be suppressed solely because it has one owner rating.
- A nonempty primary result set whose candidates all fail safe identity must not permanently suppress the existing single bounded fallback.

**New safety contract:**
- A target with a reliable strong model such as `WD4522` cannot accept source-upgrade evidence that proves only the brand and product type.
- Source-derived candidate title, safe URL path, or product metadata must carry the target model or an equally strong exact product identifier.
- An exact model-bearing candidate whose provider title omits the brand should remain eligible when no conflicting brand or product evidence exists.
- RR-065 and RR-066 are separate: RR-065 excludes retailer/source provenance; RR-066 closes the same-brand/model-omission path.

**Verification evidence:** The candidate Phase 5I implementation passed focused tests 113/113, a broad named safety matrix 346/346, typecheck, lint with 0 errors and 3 existing warnings, 751/751 full tests, and eval. The live run exposed a deterministic coverage gap. After rollback, the restored repository passed typecheck, lint with the same warnings, 747/747 tests, and eval.

**Live-call rule:** The only approved `shop vac` call was used. It safely upgraded Stanley SL18115 and Armor All VOM205P, but unsafely attached a different 10-gallon RIDGID vacuum to the 4.5-gallon WD4522 target. Do not spend another Phase 5I live call until RR-066 is fixed deterministically.

**Status:** RR-066 Open/Critical. RR-041/RR-042 remain Needs Investigation. The final repository contains no Phase 5I retry behavior; Phase 5J must not start.

---

## 2026-06-30 - RR-066 model-qualified identity safety

**Regression contract:**
- When the target has a strong model, source-upgrade evidence must contain the exact normalized target model in source-derived title, safe path, snippet, or metadata.
- Same brand, product type, size, capacity, and broad family wording cannot replace missing model proof.
- Exact model evidence may omit the provider brand only when no explicit conflicting brand/product signal exists.
- Explicit conflicting brands and models remain hard rejections.
- Normalize punctuation for model equivalence (`E-325`/`E325`, `RPD-411WG`/`RPD411WG`).
- Query-derived snippets, retailer prefixes, seller fields, URL hosts, and URL query parameters remain excluded.
- Non-model-qualified family behavior remains unchanged.

**Required examples:** Keep the live-shaped WD4522 versus different 10-gallon RIDGID negative, same-capacity/no-model negative, exact brandless WD4522 positive, conflicting-brand WD4522 negative, Makita XFD131 same-brand/no-model negative, safe color/count variant positives, merchant-path identity, measurement controls, and RR-063/RR-064/RR-065 regressions green.

**Verification:** Fail-first 80/84; focused final 84/84; broad named safety 304/304; typecheck passed; lint 0 errors with 3 existing warnings; full suite 752/752; eval clean.

**Live call:** Exactly one `shop vac` save/replay. RIDGID HD0900 rejected nearby HD09001, HD0919, and HD1900 offers. Exact Armor All VOM205P evidence attached price, rating, review count, and citation. No unsafe evidence or non-product page attached. WD4522 did not recur.

**Status:** RR-066 Fixed. RR-041/RR-042 remain Needs Investigation. Do not retry Phase 5I until explicitly instructed; preserve this model-proof contract.

---

## 2026-06-30 - Phase 5I trigger/fallback reliability

**Issues fixed:** RR-041 and RR-042.

**Trigger regression contract:**
- Evaluate verified price, owner rating, and identity-safe product-specific commerce evidence as separate evidence pillars.
- A model-qualified, requirement-passing candidate triggers only when at least two pillars are missing.
- A lone price, rating, or generic/weak citation cannot suppress upgrade when two important pillars are absent.
- A candidate with at least two safe pillars skips unnecessary upgrade.
- Commerce evidence counts only when it is independent, source tier 1/2, and classified `same_product`.
- Failed requirements and weak model identity remain hard skips.
- Keep the maximum selected candidates at three and prioritize the most missing pillars without changing candidate membership.

**Fallback regression contract:**
- Preserve the one fallback after an empty primary search.
- Permit the same one fallback after a nonempty primary set has zero identity matches.
- Do not fall back after an identity match, including `no_attachable_fields`.
- Never perform more than one fallback or reuse the primary query.
- Apply the identical RR-063/RR-064/RR-065/RR-066 identity gate to primary and fallback evidence.
- Query text, URL query parameters, source/retailer prefixes, seller/host metadata, generic pages, wrong brands, nearby models, and same-brand wrong models cannot donate identity or commerce fields.

**Trace contract:** Keep debug-only `sourceUpgradeDecisions`, `missingEvidence`, `triggerReason`, stage-tagged candidate samples, `primaryOutcome`, `fallbackReason`, and `fallbackOutcome`. Old fixtures without these fields must replay, and normal API results must not expose them.

**Verification:** Fail-first 110/121 with only 11 intended failures; focused final 121/121; focused source-quality 90/90; broad named safety 342/342; typecheck passed; lint 0 errors with 3 existing warnings; full suite 760/760; eval clean.

**Live call:** Exactly one `shop vac` save/replay. Exact RIDGID WD1060 and DEWALT DXV09P evidence attached safely. HART VOC1212PW used the zero-primary fallback and attached nothing. The new post-identity-rejection fallback is proven deterministically but did not occur in the one live run.

**New issue:** RR-067. Candidate metadata can label horsepower `HP` as a conflicting brand and reject an exact HART/model offer. Preserve this safe rejection until a narrow measurement-aware candidate-brand fix is tested against genuine HP and explicit-brand conflicts.

**Status:** RR-041/RR-042 Fixed. RR-067 Open/Medium. Phase 5J not started.

---

## 2026-07-01 - RR-067 candidate horsepower/HP brand identity

**Issue fixed:** RR-067.

**Regression contract:**
- Provider `brand: "HP"` is ambiguous when safe source evidence uses HP as horsepower or explicitly supports a different product brand.
- Resolve candidate brand from source title, safe URL path, source-derived snippets, colors, and key specs without using seller, retailer, host, URL query, query-derived text, generated card text, or the provider brand field itself.
- Numeric, peak/max/rated, motor, engine, pump, compressor, suction, and HP-motor syntax cannot establish Hewlett-Packard brand identity.
- Exact HART VOC1212PW and unrelated RIDGID, DEWALT, Milwaukee, Makita, Stanley, Armor All, and Amazon Basics model evidence must not be rejected by polluted HP metadata.
- Genuine HP/Hewlett-Packard laptop, desktop, PC, monitor, LaserJet, OfficeJet, DeskJet, Pavilion, Envy, Omen, and Spectre evidence remains valid.
- Source-derived conflicting brands remain hard rejections even when provider metadata says HP.
- Preserve RR-041/RR-042 trigger/fallback behavior and RR-063/RR-064/RR-065/RR-066 identity safety.

**Verification:** Fail-first 95/97 with only two intended RR-067 failures; focused final 98/98; broad named safety 346/346; typecheck passed; lint 0 errors with 3 existing warnings; full suite 764/764; eval clean.

**Live call:** Exactly one `shop vac` save/replay. HART did not recur. RIDGID WD3050 source evidence containing `3.5-Peak HP` attached exact price/rating/review/citation data; WD3050A, another-size RIDGID vacuum, and an unrelated blower remained rejected. No second live call ran.

**Status:** RR-067 Fixed. Phase 5J not started.

---

## 2026-07-01 - Phase 5J image and fallback-debug contracts

**Issues fixed:** RR-061 and RR-054.

**Product-image regression contract:**
- Reject non-image/page URLs, image-directory endpoints, SVG/UI/logo/icon/favicon/placeholder/tracking assets, and generic category/navigation/editorial artwork.
- Do not bind JSON-LD, social metadata, existing image fields, generated names, query text, seller labels, hosts, or URL query parameters to a product without source-derived same-product context.
- Product-page metadata requires matching page identity; JSON-LD images require a matching Product name.
- Source-upgrade images use the shared resolver only after the existing same-product evidence gate.
- Preserve same-product retailer/manufacturer images, Google Shopping thumbnails, JPEG/PNG/WebP assets, and opaque hashed CDN product images when source context is verified.

**Fallback-debug regression contract:**
- Every recommendation-producing Serper fallback exposes the stages it actually ran when debug mode is enabled.
- Preserve search-plan context, candidate funnel/snapshots, final-selection trace, empty source-upgrade traces, and explicit reasons for citation/source-upgrade stages bypassed by fallback.
- Do not fabricate diagnostics for stages that did not run.
- Never expose these fields in normal non-debug responses or change recommendation content.
- Old fixtures without `fallbackTrace` remain replay-compatible.

**Verification:** Fail-first focused 35/41 with six intended failures; focused final 174/174; broad named safety 417/417; typecheck passed; lint 0 errors with 3 existing warnings; full suite 772/772; eval clean.

**Live call:** Exactly one `shop vac` save/replay. Seven final image URLs returned image bodies; no page, logo, placeholder, category, article, support, or HTML page was used as an image. The request used the normal path, so RR-054 remains live-unconfirmed and deterministically proven.

**New issue:** RR-068 (High/Open). Four Bissell CrossWave household wet/dry floor cleaners reached exact shop-vac results. This is a product-type coverage regression outside Phase 5J; no fix was attempted.

**Status:** RR-054/RR-061 Fixed. RR-068 Open. Phase 6 not started.

---

## 2026-07-01 - RR-068 shop-vac product-type contract

**Issue fixed:** RR-068.

**Regression contract:**
- For shop-vac, wet-dry-vac, utility-vac, garage-vac, workshop-vac, contractor-vac, and jobsite-vac intent, household floor washers are wrong product type.
- Strong household signals include floor washer/cleaner, hard-floor cleaner, vacuum or wet/dry mop, carpet cleaner, spot cleaner, upholstery cleaner, multi-surface household cleaner, and representative cross-brand floor-cleaner families.
- Household subtype identity overrides incidental `wet dry vacuum` wording.
- Preserve real wet/dry utility vacuums across RIDGID, Shop-Vac, Vacmaster, Craftsman, DEWALT, Stanley, Armor All, Milwaukee, HART, and unrelated brands.
- Explicit household floor-cleaner searches must continue accepting those products.
- Discovery type evidence must exclude assigned category, retailer/seller labels, hosts, URL query parameters, and query-derived fallback snippets.
- The shared verdict must reject at discovery and revalidation; do not use ranking or final-selection changes.

**Verification:** Fail-first 118/124 with six intended failures; focused final 125/125; broad named safety 455/455; typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781; eval clean.

**Fixture reassessment:** The saved Phase 5J `shop vac` fixture loses all four CrossWave exact cards and retains RIDGID HD0900 plus two Vacmaster utility vacuums as exact. CrossWave does not move to near.

**Live call:** Exactly one `shop vac` save/replay. Two exact and one near Armor All utility wet/dry vacuum remained. No household floor cleaner survived. Exact AA255W evidence attached rating, review count, and citation safely. The normal path ran, so RR-054 fallback traces remain deterministic-only. Two product images were visually verified; one context-matched image host returned HTTP 403 to the diagnostic fetch and was not visually inspectable.

**Status:** RR-068 Fixed. Phase 6 not started. Phase 5 closeout remains next only after explicit instruction.

---

## 2026-07-01 - Phase 5 closeout regression baseline

**Closeout baseline:**
- Focused high-risk matrix: 448/448 across 39 suites.
- Full suite: 781/781 across 117 suites.
- Typecheck: pass.
- Lint: 0 errors, 3 pre-existing warnings.
- Eval pipeline: no red-flag issues.

**Covered protections:** RR-007/RR-008, RR-041/RR-042, RR-054, RR-061, RR-063 through RR-068, RR-002/RR-062, RR-013, RR-022, Phase 5E product-type/requirement behavior, and Phase 5H final-selection behavior.

**Fixture guidance:**
- Saved live fixtures are historical provider snapshots, not automatic current-code executions.
- Use replay to verify trace compatibility and inspect saved funnel evidence.
- When a fixture predates a later identity or filtering fix, run the saved result through the relevant current-code validator before drawing a current-status conclusion.
- The current `shop vac` fixture is post-RR-068 and contains no household floor cleaner.
- The `dog food`, `electric toothbrush`, `air purifier`, and `dash cam` fixtures include useful historical traces but predate some later fields or guards.
- RR-054 fresh fallback diagnostics remain deterministic-only until an approved live request actually enters fallback.

**Cost rule:** No live search ran for closeout. Do not refresh fixtures or run a broad baseline merely to replace historical snapshots; require an approved measurement question and budget.

**Status:** Phase 5 closed. RR-014, RR-015, RR-037, and RR-045 remain intentional measurement/provider-variance investigations for later planning. Phase 6 has not started.

---

## 2026-07-01 - Phase 6A reconciled measurement contract

**Phase 6 authority:** `docs/phase-6-reliability-gauntlet-plan.md` is the sole source of truth for Phase 6 scope, sequence, budgets, gates, evidence rules, and exit criteria. This test-memory section records operational lessons and cannot override the master plan.

**Evidence labels:**
- M1: deterministic tests and fixed-candidate controls.
- M2: a named current-code validator/classifier applied to frozen fixture input.
- M3: historical fixture/replay output.
- M4: approved fresh live behavior.

**Rubric contract:**
- Product-safety tolerance is absolute at zero failures and is never calibrated from baseline performance.
- Quality uses the v0.1-draft deduction model: High −15, Medium −8, ranking anchor 3 −4, one deduction per metric, floor 0.
- `NotApplicable` means the metric does not apply to the query shape; no deduction or completeness penalty.
- `NotScored` means applicable evidence is missing, stale, or insufficient; no deduction, but completeness is reduced.
- Applicable unscored High-impact metrics cap the non-safety grade at B.
- Quality deductions, floors, and significance rules remain provisional until the post-6D/pre-6E v1.0 freeze.
- Leader-quality targets must be approved at that freeze before baseline results are inspected.

**Cost boundary:** Phase 6A and its reconciliation used zero live calls. Phase 6B and 6C are also zero-live phases. Do not run the six-call Phase 6D pilot without explicit approval.

**Status:** Phase 6A complete and reconciled. Phase 6B regression wall is next only after explicit instruction.

---

## 2026-07-02 - Phase 6D stopped-pilot measurement guidance

**Budget and safety:** Four of six approved M4 searches ran, using 150 observed
Serper calls. The remaining two calls were not spent after Critical RR-069
triggered the absolute safety stop. A live measurement budget is a ceiling,
not a target to finish after unsafe evidence appears.

**Fixture handling:** Repeated calls overwrite query-slug fixtures. Copy the
historical anchor first, move every fresh result to a unique untracked Tier A
path immediately, inspect it, update the ledger, and restore the historical
anchor path when the run ends.

**Offline analyzer:** `scripts/qualityConsistencyHarness.mjs --fixtures ...`
computes pairwise raw-provider, query-plan, candidate-pool, and final-set
Jaccard; three-run intersection/union when available; shared-product Spearman
rank correlation; exact/near and funnel-stage ranges; latency; observed Serper
calls; and RIDGID stage presence. The mode reads fixtures only and makes no
live calls. The script's default mode remains its historical live harness and
still requires separate approval.

**Interpretation:** Stable exact counts do not imply stable products. In the
partial pilot, both query pairs kept the same exact count while final-set
Jaccard was zero. Raw-provider and query-plan overlap should be reported
separately; current traces do not support a causal percentage split.

**Model configuration:** Relevant OpenAI Responses API calls do not explicitly
set temperature or seed. Record this as unpinned model-side configuration,
without claiming it alone caused the observed variance.

**Freeze rule:** A stopped two-run sample cannot freeze a variance threshold,
rubric v1.0, leader method, or snapshots. Fix RR-069 deterministically and
obtain explicit approval before resuming Phase 6D.

---

## 2026-07-02 - RR-069 distinguishing-submodel identity guard

**Fail-first:** `tests/sourceQualityUpgrade.test.mjs` passed 97/100. The only
failures were generic base-series evidence attaching to specific robot-vacuum,
monitor, and power-tool-kit models.

**Rule:** When a source-upgrade target carries a base model plus distinguishing
submodel, source-derived evidence must carry the distinguishing identity before
donating product-specific commerce fields. Normalize punctuation, spacing, and
Plus forms. For multiple explicit identifiers, prefer established compact or
digit-dash model shapes over descriptive number phrases.

**Required controls:**
- reject generic series/plain/family/lineup evidence;
- reject nearby suffixes such as S5+ or X50+ for X5+;
- preserve exact `Q10 X5+`, `Q10 X5 Plus`, and `Q10X5+`;
- preserve brandless exact WD4522 evidence with no conflicting brand;
- preserve exact hyphenated models such as RPD-411WG;
- keep query, host, seller, URL query, and generated text excluded from identity.

**Verification:** Focused source-quality 100/100; broad identity/trust matrix
439/439 across 32 suites; full suite 786/786 across 117 suites; typecheck and
eval pass; lint 0 errors with 3 existing warnings.

**Evidence boundary:** Replaying the untracked Phase 6D B2 fixture remains M4
historical evidence and still prints the original unsafe attachment. The
distilled deterministic reproduction is M1 current-code proof. No live call
ran, and Phase 6D remains paused.

---

## 2026-07-02 - Phase 6D clean-restart image-safety stop

**Restart boundary:** The original four Phase 6D calls are aborted pre-fix
RR-069 evidence. Never pool them with a post-fix sample. Taylor approved six
new calls; the restart stopped after A1 and its remaining five calls are
blocked.

**Live finding:** A fresh `shop vac` response assigned the same Amazon
`yoda/flyout_72dpi` navigation PNG to two different final products. Both image
records had High confidence and `retailer_page` provenance. A direct-image
extension and a matching product-page source are therefore not sufficient to
establish product-image relevance.

**Safety rule:** Repeated cross-product image identity and known generic
site/navigation asset shapes must be treated as product-image warning signals.
Any later fix must preserve opaque hashed product CDNs and should be proven
across unrelated hosts/products rather than adding an Amazon-only filename
exception.

**Measurement consequence:** One clean run cannot estimate pairwise Jaccard,
shared rank correlation, stage-loss variance, significance, sample size, or
provider/model attribution. Keep RR-015 and RR-037 Needs Investigation.
Rubric v1.0 remains unfrozen.

**Cost:** 1/6 clean-restart searches and 37 observed Serper calls. The Tier A
fixture is untracked and must not be committed. No additional live call is
permitted after this safety stop without a new approval.

---

## 2026-07-02 - Reopened RR-061 retailer navigation-image guard

**Fail-first:** Image/asset tests passed 31/35. The four intended failures
covered the exact Amazon flyout URL, generalized flyout/menu/layout assets,
retailer/domain identity pollution, and enrichment fallback to no image.

**Rule:** Trusted retailer-page provenance does not make an image product
specific. Reject structural site-artwork terms before confidence scoring.
Product-image identity must exclude source/retailer/domain words and must not
use the image hostname. URL reuse across products is a diagnostic signal, not
an automatic rejection, because legitimate variants may share imagery.

**Positive controls:** Preserve verified same-product Amazon imagery, opaque
hashed CDN images, Google Shopping thumbnails, and source-upgrade images that
pass existing same-product identity.

**Verification:** Focused image/asset/source-upgrade tests 135/135; broad trust
matrix 376/376; full suite 791/791; typecheck/eval pass; lint 0 errors with 3
existing warnings.

**Live boundary:** No live call ran. The fixture remains historical M4 evidence
and the distilled tests are current M1 proof. Phase 6D remains stopped and
requires a fresh six-call approval for any later restart.

---

## 2026-07-02 - Fresh Phase 6D restart stopped on wrong-model imagery

**Sample boundary:** Commit `baeb6a0`, A1/B1 only. Both earlier partial pilots
remain excluded. Never pool any of the three samples.

**Safety finding:** A correct product page/title does not prove every image on
that page belongs to the target. B1 rendered a Saros Z70 image on a Q5 Max+
card because page-context confidence outweighed explicit conflicting image-path
model identity. Reopen RR-061; do not weaken valid hashed-image support.

**Secondary finding:** Source-upgrade query construction trusted unrelated
`Bose` Serper brand metadata for ILIFE A12 Pro. No evidence attached. Track as
RR-070 and reproduce deterministically before changing behavior.

**Variance boundary:** One observation per query yields no pairwise metrics.
Harness three-run intersection/union values for one-run groups are tautologies,
not stability evidence. Report empty pair arrays and unavailable inference.

**Cost and checks:** 2/6 live searches, 75 observed Serper queries; four calls
blocked. Typecheck/eval pass, lint 0 errors/3 warnings, full suite 791/791.

---

## 2026-07-10 - Phase A request-scoped search-observability ledger

**Scope:** Debug-only instrumentation inside `debug.stageFunnel.searchLedger`.
No live provider calls and no search/ranking/trust behavior changes.

**Stable test entry points:**

- `tests/searchObservabilityLedger.test.mjs` mocks Serper `fetch` and covers retry/fallback attempt linkage, cache hit/miss dual hooks, query dedupe/cull/truncation/recategorization, bounded result digests, candidate provenance unions and merge IDs, exact first-loss assignment, post-discovery search origins, reconciliation, raw AI planning JSON, privacy canaries, disabled-debug behavior, flags, and commit header fields.
- `tests/recommendationApiContract.test.mjs` proves the ledger is emitted inside the existing stage funnel only for debug requests.
- `tests/replayFixtures.test.mjs` proves saved ledgers are preserved and summarized without Serper/OpenAI calls and that older fixtures remain compatible.
- `scripts/benchmark-search-ledger.mjs` compares representative plan assembly/serialization with the ledger disabled and enabled using alternating order and trimmed means. Default result: 0.757 ms/request overhead, 0.0009% projected against 84 seconds, within the under-200-ms/under-2% budget.

**Trace fields to preserve:**

- `header`: request/commit, `REVIEW_RADAR_*` flags, models, initial cache-empty state.
- `rawAi.strategy` and `rawAi.gapCheck`: strict-schema JSON only; never prompts.
- `planAssembly`: stable query ID/origin, original/normalized/outbound query, status, cap/cull/merge target, events.
- `dispatch.cacheLookups`, `.attempts`, and `.reconciliation`: sanitized bodies and at most 10 result digests per attempt; never keys or headers.
- `candidateLineage`: multi-query provenance, merge/collapse target, stage results, final outcome/score/selection, one first loss.
- `contributions.byQuery` and `.byOrigin`: zero-contribution applies only to product discovery.

**Regression rule:** Client-shared plan modules accept an optional observer and must not import the server-only `AsyncLocalStorage` implementation. `npm run build` protects this boundary.

**Verification:** 802/802 tests across 118 suites; typecheck/build/eval pass; lint 0 errors/3 existing warnings. Live calls: 0.

---

## 2026-07-10 - Phase R1 RR-061 wrong-model image guard

**Scope:** `lib/productImageResolver.ts` only. Deterministic; zero live calls.

**Guard:** `conflictingModelIdentityReason(url, context)` runs inside `validateProductImageCandidate` after the generic-asset checks. It tokenizes the final image filename (extension stripped) into model-shaped tokens — 2–8 chars containing both letters and digits — and rejects with `image filename identifies a different model (...)` when the product identity (name+brand+modelNumber) has at least one model-shaped token and none of the filename tokens appear in the normalized concatenated product identity.

**Exclusion list (`MODEL_TOKEN_EXCLUSIONS`):** version markers (`v2`), dimension pairs (`800x600`), retina (`2x`/`x2`), `w`/`h` size markers, Amazon/CDN image modifiers (`sl1500`, `sx300`, ...), file/frame counters (`img2`, `thumb1`, ...), and digit+unit measurements (`72dpi`, `1080p`, `16gallon`, ...). Tokens longer than 8 chars are treated as opaque hashes (ASINs, CDN ids) and never veto.

**Known fail-safe misses (accepted):** hyphen-split product models ("E-330" tokenizes to `e`+`330`, neither qualifies, guard inert) and `v`-series models (Dyson V15: `v15` excluded as a version marker on both sides, guard inert). Both directions fail safe — the image is kept, never wrongly rejected.

**Stable test entry points:** `tests/productImageResolver.test.mjs` describe block "RR-061 wrong-model image identity (Phase R1)": two fail-first vetoes (verified-page Saros Z70 on Q5 Max+; cross-product eufy L60 on Roomba j7+) and three preservation cases (same-model filename, Amazon modifier/retina/dimension tokens, model-less product). 19/19 focused; 807/807 full suite across 119 suites.

**Canary note:** the ledger privacy canary requested by roadmap R1 already existed in `tests/searchObservabilityLedger.test.mjs` (snapshot JSON asserted free of `CANARY_SERPER_KEY_MUST_NOT_APPEAR`); it was verified, not duplicated.

---

## 2026-07-10 - Phase R2 live-ledger safety stop

**Sample boundary:** Commit `0f44ae7`; A1-A3 `shop vac` and constrained B1 only. B2/B3 were not run. The four new fixtures are untracked Tier A evidence and must never be pooled with earlier stopped Phase 6D windows.

**Reconciliation invariant:** Across the four runs, 386 logical cache lookups = 69 hits + 317 misses, and the 317 misses = 317 physical attempts because retries/fallbacks were both zero. Each per-run ledger balanced and recorded an empty initial cache. Treat this equation as the primary completeness check for later ledger samples.

**RR-061 regression shape:** The R1 model-conflict guard only extracts 2-8 character tokens containing both letters and digits. Filenames containing alphabetic foreign families (`QRevo`, `Curv`, `Edge`, `Saros`) can therefore survive on Q10 X5+/Q10 S5+/Q7 Max+ products. Verified page context must not outweigh those explicit foreign-family names.

**Eligibility/type failures:** A Shop-Vac customer-service page and a Pocketables day-five article survived as `buyable_product` cards (RR-078). A Walmart self-empty base-station accessory survived as a robot-vacuum near match (RR-079). These candidates were not merely ranking misses; they passed eligibility/type boundaries.

**Planner evidence:** No temperature or seed is configured for either discovery-strategy OpenAI call. All A strategy and gap raw JSON outputs varied. A mean Jaccards were strategy query 0, expected product 0.1434, planned discovery 0.3909, dispatched 0.3896, provider common results 0.5820, pool 0.1051, final 0.0333. Provider variation matters, but model/planner variation is greater and downstream stages amplify it.

**Cull/contribution evidence:** Editorial seed queries returned 588 raw results and zero unique/final candidates. AI-gap queries were the only consistent final contributor (30 unique; 8 exact; 8 near). Constrained B allocated four broad/diluted deterministic shopping queries and only one self-emptying query before later AI-gap recovery. Preserve these facts for R3/R4/R6 fail-first tests.

**Carryovers:** RR-037 stays Needs Investigation because RIDGID was present in all A runs but product identities and counts varied. RR-045 stays Needs Investigation because two broad Tapo editorial queries returned raw results that normalization discarded; an exact RV30C Plus query was never sent.

**Freeze boundary:** The R2/Phase 6D exit gate failed. Rubric remains `v0.1-draft`; no leader snapshot, significance rule, or baseline North-Star value is approved. Phase 6E remains unauthorized.

---

## 2026-07-11 - Phase R3 pinned discovery planning

**Contract:** OpenAI Responses supports `temperature` in `[0,2]`; lower values are described as more focused/deterministic. The documented GPT-5.4 mini snapshot is `gpt-5.4-mini-2026-03-17`. Responses exposes no `seed` parameter.

**Flag behavior:** `REVIEW_RADAR_PINNED_PLANNING=on` affects only the two calls in `lib/discoveryStrategy.ts`. For the default `gpt-5.4-mini` helper alias, requests use the dated snapshot and `temperature: 0`. The resolver is idempotent for the dated snapshot. Custom helper models receive neither rewriting nor temperature injection. Flag-off requests retain the prior shape. Final synthesis is outside the flag.

**Stable tests:** `tests/discoveryStrategy.test.mjs` captures both request objects and proves on/off behavior plus custom-model preservation. `tests/recommendationApiContract.test.mjs` proves the resolved helper snapshot reaches the ledger while final synthesis stays unchanged. `tests/searchObservabilityLedger.test.mjs` proves the new flag appears in the debug environment snapshot. Fail-first 8/9; focused final 38/38; full 810/810.

**Measurement boundary:** Snapshot pinning prevents alias drift and temperature zero reduces sampling variance, but neither guarantees identical output. R3 ran zero live calls, so RR-015 remains Needs Investigation. Do not claim a Jaccard improvement until a later approved ledger sample separates plan, provider, pool, and final overlap.

**Safety boundary:** `.env.local` remains unchanged and the flag defaults off. No search allocation, prompt, schema, final synthesis, candidate, rank, requirement, eligibility, image, identity, citation, price, or product-type behavior changed.

---

## 2026-07-11 - RR-061 page-image provenance and split-family identity

**Runtime attribution rule:** `ProductFieldEvidence.sourceType: retailer_page` does not distinguish `existing` from `page_image`. Establish the winning internal source from the candidate construction and confidence path, or capture `ProductImageResolution.source`; do not infer candidate-level OG/JSON-LD presence from the serialized field.

**Root cause:** `extractProductImageCandidatesFromHtml()` copied page-wide verification to every `<img>`, allowing unrelated artwork to pass at Medium without image identity or High when template attributes echoed the target. R1's filename guard only recognized one token containing both letters and digits, missing split `Saros_20` and repeated pure-word `QRevo` family claims.

**Stable rule:** Metadata may inherit verified page identity because it is page-bound. Page `<img>` candidates may not; their own attributes/path must strongly match the target. Filename identity also includes adjacent alphabetic-family/numeric pairs and repeated non-generic alphabetic family tokens. Exclude generic image/color/view/package words plus source, brand/category, modifier, dimension, unit, version, file-counter, and hash tokens.

**False-positive boundary:** If a filename pairs a target family word with a number but the target does not assert a numbered version of that family, treat the number as potentially a size (`ipad_11`). If the target asserts a different numbered family (`Saros 10` vs `Saros_20`), reject it.

**Stable tests:** `tests/productImageResolver.test.mjs`, blocks `RR-061 wrong-model image identity (Phase R1)` and `RR-061 page-image provenance and split family identity`. Focused 24/24; full 815/815 across 120 suites. Matching Product JSON-LD, image-level matches, same-model/neutral filenames, opaque assets, Google thumbnails, Amazon modifiers, and navigation guards are positive controls.

**Measurement boundary:** Zero live calls. The repair closes the deterministic captured paths but does not prove retailer markup is unchanged or improve a measured R2 North-Star value. RR-078/RR-079 remain blockers before a later approved live window.

---

## 2026-07-11 - RR-061 round 4 / RR-080 adversarial image filenames

**Do not equate captured-case closure with generalized closure.** After the first post-R3 repair passed all captured controls, adversarial filenames found both directions of error: neutral counters were rejected and a sibling model was accepted.

**RR-080 neutral-counter rule:** Neutral shot/scene/studio/room/floor/carpet/swatch/style/grid/tile/display words are explicit non-model vocabulary. Do not globally discard one-digit split claims: real families such as Nintendo Switch 2 need to reject sibling imagery. `swatch-red-2-swatch-blue.jpg` also proves numeric handling alone is insufficient.

**RR-061 mixed-family rule:** For target identity `family + mixedModel` (for example, Saros Z70), direct adjacency asserts the family. An image `family + differentNumber` is foreign. Preserve the early compatible-token escape so an image naming the target mixed model remains valid.

**Stable tests:** `tests/productImageResolver.test.mjs`, RR-061 page-image/split-family block. Fail-first 24/26; final 27/27. Full suite 818/818 across 120 suites. Do not add a blanket year exclusion without both a neutral campaign-year reproduction and a conflicting model-year preservation control.

**Boundary:** This micro-phase changes only image filename identity. Eligibility/type RR-078/RR-079 remains separate. Zero live calls; latest North Stars remain R2.

## 2026-07-11 - RR-078/RR-079 product-card and accessory safety

**RR-078 stable rule:** Route checks run before product-detail shortcuts. Embedded `customer-service`/`customer-care` path segments and dated `YYYY/MM/*.html` article routes are evidence-only, not buyable cards. Do not reject `/pages/` or all dated paths generically; model-specific and dated commerce product routes remain valid.

**RR-079 stable rule:** A standalone dock, docking/charging station, clean or dust-disposal base, base station, or self/auto-empty base/dock/station is a robot-vacuum complement. An explicit robot vacuum bundled with one remains the primary product. Keep exclusive complement checks on identity text.

**Rich-evidence boundary:** `why_recommended` can confirm the requested type for a sparse legitimate name, but cannot erase a lean-evidence wrong-type verdict. When rich evidence is supplied, `classifyProductTypeMatch` first preserves any evidence-only `irrelevant` verdict, then permits rich allowed evidence to distinguish a bundle from a standalone complement.

**Stable tests:** `tests/productEligibility.test.mjs`, `tests/productTypeMatch.test.mjs`, and the robot/toaster preservation cases in `tests/requirementValidation.test.mjs`. Fail-first 33/35; a later brand-prefixed dock control failed 12/13 before dynamic-regex escaping was corrected; final focused 97/97; full 822/822 across 120 suites. Typecheck/build/offline eval pass; lint 0 errors/3 existing warnings. Zero live calls.

---

## 2026-07-11 - Phase R4 deterministic constraint allocation

**Scope:** `lib/requirementExtraction.ts`, `lib/searchQueryExpansion.ts`, `lib/discoveryStrategy.ts`, `lib/requirementValidation.ts`, all behind `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on` (default off, byte-identical off).

**Mechanics to preserve:**

- Extraction: non-negative ambiguous Important Details route to `preferredConstraints` when the flag is on (`requirementExtraction.ts`, the `preferAmbiguousDetails` branch). Negative phrases still route to avoid. Hard wording is untouched.
- Plan: `getCategorySynonyms()` returns only the category for inclusion-matched groups when on; exact-key groups keep breadth. `preferredFallbacks` fills primary/second feature slots. `constraintBearingPhrases` + `carriesConstraint()` order pass-1 bearing-first BEFORE the pass-1 cap, so culls hit generic tails and `augmentSearchPlanWithDiscoveryStrategy`'s protected `pass1.slice(0, 4)` picks up constraint-bearing queries by construction.
- Budget: `budgetBoundQuery()` flag branch normalizes dollar-less bounds in place (function-form replace to avoid `$`-group hazards); flag-off path preserved verbatim.
- Validation: preferred constraints (non-budget/brand) verify via `containsRequiredFeature`/`hasNegativeContextForRequiredFeature`; verified pushes `Preferred: <label>` into matched, unverified into `softUnknownRequirements` (existing x4 confidence penalty) — never missing/unknown, never gating.

**Stable test entry points:** `tests/constraintAllocation.test.mjs` — flag-off pins the exact pre-R4 plan/classification/duplicate-budget/validation defaults. Flag-on covers soft preferred versus hard required strictness, >=3-of-5 Shopping coverage, dilution removal, exact-key breadth plus outside-group inert controls, category-collision handling, word/comma budget normalization and idempotence, mixed hard/preferred ordering, and both validation outcomes. Initial 12/12; Codex adversarial fail-first 12/16; final 16/16; full suite 838/838.

**Known trade-off (accepted):** an AI query whose normalized form equals a deterministic constraint-bearing query now merges into it (one Serper call instead of two); the RR-074 test uses a `best`-prefixed query for that reason.

---

## 2026-07-11 - Phase R4 live after-sample

**Protocol:** Six usable cache-cold runs at `cd95deb6`, both flags enabled on
server processes only. One accidental warm-cache request was spent/excluded;
Taylor approved one replacement. Authority is seven dispatched, six usable.

**Ledger proof:** 604 logical searches = 118 hits + 486 misses; 486 physical
attempts, zero retries/fallbacks, all balanced and cache-cold. Never reuse the
old 225–280 estimate for this shape; the six usable runs alone cost 486
physical attempts.

**Stable interpretation:** Pinned planning was accepted by the live API but
did not materially stabilize strategy output: strategy Jaccard 0.0000→0.0196,
planned/dispatched product queries 0.3830/0.3722→0.3714/0.3587. Do not equate
`temperature: 0` with deterministic output. Pool/final overlap did improve to
0.2694/0.1429 from 0.1051/0.0333, but attribution is mixed.

**R4 boundary:** Judge protected allocation from the leading outbound query
set, not by counting every later constraint-bearing ledger record marked
culled. Later AI/rescue duplicates and caps legitimately create culled records.
The leading B forms all carried robot-vacuum + self-emptying + budget and had
zero duplicate budgets. Total wrong-category first losses nevertheless rose
from 5 to 6/7/6 because AJ Madison organic results and a direct-retailer stick
vacuum tail remained noisy.

**Quality/safety:** 0/27 wrong-type/non-product final cards after versus 3/23
before; exact B compliance 1/1; no RR-061 image regression. RR-060 reopened
for the same Home Depot product ID under short/titled URLs. RR-081 tracks
wildcard-domain and repeated-token AI/rescue queries. Fixtures remain untracked.

**Decision boundary:** `.env.local` is unchanged. R3 promotion is not supported
by plan-stability evidence. R4 promotion is a separate user decision and the
shared two-flag sample limits causal attribution. No rubric/leader freeze or
Phase 6E authorization follows from this sample.

---

## 2026-07-12 - Phase R5 identity collapse + listing-id dedupe (and leader-contract test)

**Scope:** `lib/productIdentity.ts` (always-on trust-boundary fixes, no flag);
`scripts/goldBenchmark.mjs` gained the exported `coversLeader()` contract that
`scripts/qualityScorecard.mjs` now imports.

**Mechanics to preserve:**

- `retailerListingKey()`: a URL whose FINAL path segment is a pure-numeric ID
  of 6+ digits yields `host listing <id>` as the medium-confidence canonical
  key (ahead of the full-path `urlKey`). Never fires on shorter numerics
  (sizes/models) or lettered segments. A DATE-SHAPED segment
  (`^(19|20)\d{6}$`) requires a generic product-detail path marker and no
  editorial/archive marker; article/archive paths retain full-path identity.
- `conflictingNumericSpecs()` + `numericSpecValues()`: unit-aliased extraction
  (gallon/gal, hp with optional "peak", qt/quart, psi, cfm/scfm, btu, watt(s),
  volt(s), amp(s), ah, lb(s)/pound(s)); inches deliberately EXCLUDED
  (truncated retailer titles emit "13. 2 in" noise).
- **Trust boundary (deliberate):** canonical-ID equality outranks conflicting
  title specs — one listing ID means one page, and retailer titles contain
  typos; the spec-conflict guard governs the INFERENCE paths only
  (brand+shared-model, title-equal). Order inside `areSameExactModelProduct`:
  disjoint-strong-models early false -> canonicalId equality true ->
  spec-conflict false -> brand+sharedStrongModel true -> identical
  normalizedTitle.
- Generalization proof beyond vacuums: CRAFTSMAN 20-Gallon air compressors
  with 175 vs 150 PSI stay distinct; matching-PSI retailer variants still
  collapse.

**Stable test entry points:** `tests/identityCollapse.test.mjs` (live-captured
fail-first pairs, preservation matrix, cross-category PSI cases, date-segment
boundary, RR-072 prefilter pin); `tests/leaderSnapshot.test.mjs` pins the
`coversLeader` brand-AND-line contract (broad tokens like self/ai never count
without their brand; line phrases retain both token boundaries; unbranded
line-token titles are a recorded undercount).

**Corrective fail-first:** Combined leader/identity focused matrix passed
17/20 before the closure with exactly the whole-token, date-like product ID,
and SCFM cases failing; final passed 20/20. RR-082 records the measurement bug.

**Known limits (accepted):** spec conflict only reads names/metadata titles,
not attached spec objects; the listing key requires the ID as the final path
segment (query-string IDs unhandled — no captured evidence yet).

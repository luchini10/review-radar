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

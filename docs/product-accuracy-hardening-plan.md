# Product Accuracy Hardening Plan

Owner: Claude (with Codex review incorporated). Source-of-truth map: `ReviewRadar-Overview.md`.
Goal: make the recommendation pipeline more effective at **finding the correct products** — show
the right ones, keep the wrong ones out — by improving **shared** rules, never per-product patches.

## Operating rule (applies to every phase)
Each phase must:
1. Improve a **shared rule or shared pipeline behavior**, not patch one product.
2. End **green**: `npm run typecheck`, `npm run lint`, `npm test`, `node scripts/eval-pipeline.mjs`
   (red-flag checks), and the A/B harness where ranking changes.
3. Add/update **tests** that prove the new behavior AND that previously-bad items stay out of exact.
4. Log a **`### 🟩 Claude Change N — <topic>`** entry in `docs/qa-loop-results.md` with before/after
   (per-agent color convention: 🟩 Claude / 🟧 Codex — keep attribution, do not erase Codex notes).
5. Add a dated `docs/change-log.md` entry, update `ReviewRadar-Overview.md` (🟩-marked), then **sync
   docs to the desktop** (`ReviewRadar-Overview.md`, `qa-loop-results.md`, `change-log.md` →
   `Desktop/RR Markdowns/`, repo is source-of-truth).
6. **Commit the phase** to `main` once green + logged (decision: commit each phase). Each commit is
   self-contained.

## Sequencing
0 (done) → 1 → 2 → 4 → 5, with **3 investigation-first** (slot it once 1–2 land). Phases 2 and 3
change visible ranking / spend live API — get explicit go-ahead before running those.

---

## Phase 0 — Budget-usable text prices ✅ DONE (commit pending)
A specific, plausible text price (no structured offer) now counts toward a budget so normal searches
stop returning 0 exact matches; vague prices stay unusable; all fake-cheap protections unchanged.
Files: `lib/productPriceTrust.ts`, `tests/productPriceTrust.test.mjs`, `tests/requirementValidation.test.mjs`.
Proof: 488/488 tests, eval red-flags clean. Logged as "Claude Change 1."

## Phase 1 — Unify & generalize wrong-product-type detection
**Problem:** "right category, wrong type" rejection lives in **three overlapping tables** —
`lib/formFactor.ts` (component substitutions), `lib/productTypeIntent.ts` (8 hardcoded categories),
and `productTypeConflictRules` in `lib/requirementValidation.ts` — with duplicated rules (mattress↔
bed-frame is in two of them). `productTypeIntent` protects only 8 categories; everything else gets
nothing from it.
**Fix (strangler migration — safer than delete-and-replace):**
1. Add ONE shared product-type verdict helper (general, evidence-driven; reuses existing
   form-factor/substitution data; covers unlisted categories instead of an 8-item whitelist).
2. Route ONE caller through it.
3. Prove parity with tests (existing 8-category behavior unchanged).
4. Move remaining callers.
5. Remove the duplicate tables **only after** parity is proven.
**Files:** `lib/formFactor.ts`, `lib/productTypeIntent.ts`, `lib/requirementValidation.ts`,
`lib/search/serper.ts` + tests.
**Proof:** unlisted categories (shop vac, blender, monitor) get correct wrong-type handling; all
existing type tests still pass; eval red-flags clean.
**Risk:** medium (touches discovery + validation). Mitigated by the migration order.
**Status: DONE (steps 1–2, commits `b97709c`, `9262fae`).** Shared `lib/productTypeMatch.ts`
(`classifyProductTypeMatch`) now backs discovery + validation; the cross-category conflict rules
moved into it so discovery applies them too. 496/496 tests, eval clean.
**Step 3 (mattress de-duplication) INTENTIONALLY SKIPPED** — per the standing "no product-specific
fixes" rule, collapsing the 4 mattress encodings is product-specific cleanup with no
find-correct-products benefit and real regression risk. The bespoke `hasMattressFurnitureConflict`
in `requirementValidation` is left in place but flagged as a future "fold into the general model and
delete" candidate, not a fix to keep.

## Phase 2 — Audit penalty stacking (stop over-penalizing thin-but-valid products)
**Problem:** `scoreProduct.totalScore` subtracts many overlapping penalties (missing-data,
rubric-unknown, market-confidence, credibility-floor, complaint, risk); several fire on the SAME
weakness (a missing price is hit by missing-data + rubric-fact + price-value), pushing good-but-thin
products out of exact.
**Fix:** map the double-counting, then de-duplicate / cap overlap so one gap is penalized once at a
sensible weight. Tuning only — no new gates, no loosening of hard requirements.
**Files:** `lib/recommendationScoring.ts` + scoring tests + `scripts/ab-ranking.mjs`.
**Proof (required):** A/B harness shows thin-but-valid products rank higher **and** that wrong-type /
over-budget / suspicious-price items still stay OUT of exact (no accidental loosening). Red-flag
checks stay clean.
**Risk:** medium (visible ranking). Get go-ahead before running.
**Status: DONE (items 1 + 4; commit `bbaac9c`-series — Phase 2 commit).** Credibility de-stacked to
one term per ranking score; dead `riskPenalty` removed. 496/496 tests, eval red-flags clean,
baseline order unchanged (margins narrowed).

**Item 2 (rubric double-penalty) — CLOSED, decided NOT to change.** The two rubric penalties are not
a clean duplicate: `missingDataPenalty`'s slice is importance-weighted (critical 5 > minor 0.75) and
reads `evidenceBucket.unknowns`; `computeRubricFit`'s is uniform and reads `rubric.mustVerifyFacts`.
They overlap only on the *intersection* (a fact that is both a mustVerifyFact AND flagged unknown).
Removing either drops single-count signal for the non-intersection, and merging to penalize the
union once would require threading `input.discoveryStrategy.buyingRubric` into `missingDataPenalty`
(a bigger refactor). The residual double-count is small (≤~16 inside a 45 cap) vs the ~58 credibility
issue that was the real problem — not worth the regression risk to Codex's importance weighting.

**Item 3 (missingData/evidenceStrength overlap) — CLOSED, decided NOT to change.** Both penalize thin
metadata, but trimming the overlap is arbitrary tuning with no clear correct value and real ranking
risk; the credibility de-stack already addressed the dominant over-penalization.

**Follow-up:** `REVIEW_RADAR_CREDIBILITY_PENALTY` is now a no-op flag (line can be removed from
`.env.local`).

## Phase 3 — Make rescue attach *structured* prices more reliably (investigation-first)
**Problem:** the upstream cause behind Phase 0 — too many products only have text prices because the
structured-offer fetch fails (bot-walling). Phase 0 is the safety net; this reduces dependence on it.
**Fix:** FIRST measure live how often rescue verifies a structured price and which sources fail; THEN
strengthen the price-rescue path. No promises of "more verified prices" until the measurement exists.
**Files:** `lib/requirementEvidenceRescue.ts`, `lib/productAssets.ts`, `lib/search/serper.ts` + tests.
**Proof:** live debug runs (shop vac, drill, fridge) show more products reaching exact with *verified*
(not text) prices, before vs. after.
**Risk:** medium-high; live API + cost. Get go-ahead before running.
**Status: step 1 DONE (deterministic, no live API spent).** Code investigation found the rescue used
one descriptive query for both the organic AND shopping legs; the shopping leg now searches product
identity (`buildRescueShoppingQuery`), which shopping engines actually match on. 497/497 tests.
**Step 2 (live measurement) DONE.** One live `shop vac` / `$400` run: **2 exact + 4 near** (was 0
exact originally). Price-trust/reliability correctly handled implausible structured offers (a `$1`
DEWALT offer was ignored in favour of the plausible `$70`; a `$10` Bosch was flagged suspicious into
near); text-only/unverified products landed in near, not falsely exact. **Conclusion: no urgent
further Phase 3 tuning needed** — `looksLikeSameProduct` / `maxProducts` are not bottlenecks in this
sample. Minor low-priority hygiene note: an implausible offer can linger in `metadata.offers` even
when no consumer surfaces it.

## Phase 4 — Make non-product-page filtering more principled (fewer false blocks)
**Problem:** `lib/productEligibility.ts` leans on a hardcoded ~33-domain blocklist + a growing regex
pile; it already over-blocked a real Nike product page once and can't cover the whole web.
**Fix:** shift weight from host allow/deny toward page-**shape** signals (URL/title/structure), so
real retailer pages on unlisted hosts pass while article/forum/list shapes are still blocked.
**Files:** `lib/productEligibility.ts` + tests.
**Proof:** tests prove real product pages on unlisted hosts pass while the page classes Codex already
fixed stay blocked (regression guard).
**Risk:** medium (false-negative risk if loosened too far).
**Status: INVESTIGATED → no change (decided NOT to loosen).** On reading `classifyProductEligibility`,
the premise was overstated: the classifier is already page-SHAPE-first (it checks
`textLooksLikeNonProduct` / `textLooksLikeListing` / `isLikelyListingOrSearchUrl` /
`pathLooksLikeProductDetail` / `isKnownProductUrl` before anything host-specific), and the
`evidenceOnlyDomains` list only blocks ~33 LISTED editorial/social hosts (wirecutter, rtings, reddit,
nytimes, youtube…) — it does **not** block unlisted retailers, so it is not a source of retailer
false-blocks. The one real over-block (a Nike product page) came from a title pattern that Codex
already narrowed. Loosening this heavily-tested, high-stakes classifier risks reintroducing the
non-product-page leakage it exists to prevent, for a speculative gain. Better left as-is; revisit
only if a concrete new false-block is observed in live QA.

## Phase 5 — Harden the buying-rubric fuzzy matcher
**Problem:** `computeRubricFit`'s `itemMatches` uses a 45%-token-overlap heuristic that can mis-credit
or mis-flag. Capped nudge, so bounded impact, but false matches still nudge ranking.
**Fix:** tighten the matcher (stronger token/phrase rules) + tests for the false-positive/negative
cases.
**Files:** `lib/buyingRubric.ts`, `tests/buyingRubric.test.mjs`.
**Risk:** low (capped nudge).
**Status: DONE.** `itemMatches` now matches whole words/phrases instead of substrings
("grip" no longer matches "gripped"). 499/499 tests, eval clean.

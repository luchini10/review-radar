# ReviewRadar Full Phased Plan / Codex Handoff

Source: user-provided Codex attachment, saved for future sessions.

You are taking over ReviewRadar after several Claude phases. Continue from the current repo state, not from memory. Before coding, run `git status` and read the current markdown docs.

Repo path: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`

Important rule: do not make product-shaped fixes. Do not fix only Weber, Napoleon, RIDGID, Makita, robot vacuums, gas grills, or any one product/category. Every change should improve a shared mechanism and be proven across unrelated categories when practical.

Core loop: measure -> diagnose -> make one small shared fix -> test deterministically -> test live if needed -> document -> commit.

End goal: ReviewRadar should reliably return the 7 best / most popular / most trusted products for broad product searches, while still respecting hard constraints like budget, size, compatibility, product type, and dealbreakers.

---

## Current Status

Current phase: **Fresh Phase 6D restart stopped at 2/6; RR-061 reopened and RR-070 opened.**

The original four-call Phase 6D attempt remains aborted pre-fix RR-069
evidence. A separately approved six-call clean restart stopped after A1 when
the same generic Amazon `yoda/flyout_72dpi` navigation asset appeared as the
High-confidence product image for two different product cards. Five restart
calls remain unspent and blocked.

The navigation-image RR-061 fix remains effective, but constrained B1 exposed
a different image gap: verified Q5 Max+ page context allowed an image whose
path explicitly identified Saros Z70. B1 also assigned unrelated `Bose` Serper
brand metadata to ILIFE A12 Pro and constructed `Bose ILIFE A12 Pro`; no
evidence attached.

`docs/phase-6-reliability-gauntlet-plan.md` is the sole source of truth for all Phase 6 scope, sequencing, budgets, gates, evidence rules, and completion criteria. Every supporting Phase 6 artifact implements that master and must not override it.

The register contains 70 issues: 63 Fixed, 6 Needs Investigation, 1 Won't Fix,
and 0 Open. RR-061 and RR-070 are Needs Investigation; RR-069 remains Fixed.

Recommended next phase:

- Await explicit instruction for a narrow RR-061 wrong-model image diagnosis/fix.
- Keep RR-070 separate unless explicitly combined.
- Do not resume Phase 6D with the four unspent calls; any later clean restart requires fresh approval.
- Preserve RR-068/RR-054, RR-041/RR-042, RR-067, and all RR-063 through RR-066 protections.
- Do not start Phase 6E, freeze rubric v1.0, compile leader snapshots, or change production behavior during the stopped pilot.

Note: historical sections in this document that use "Phase 6" for earlier product-type work retain their original labels. They do not mean the future reliability Phase 6 has started.

---

## Completed Phases

### Phase 0 - Measurement foundation / QA guardrails - DONE

Purpose: create enough test infrastructure to stop guessing.

Completed work:

- Added/used QA scorecards and evaluation scripts.
- Added cost/Serper call awareness.
- Added fixed QA sets.
- Added replay fixture system.
- Added debug fixture save/replay workflow.
- Established that discovery, ranking, citation verification, requirement filters, and final selection each needed separate diagnosis.

Main lesson: do not rely only on one live run. Save fixtures and replay them.

### Phase 1 - Source-tiered discovery and seed improvements - DONE / PARTIAL

Purpose: improve discovery quality by preferring better evidence sources and stronger product pools.

Completed work:

- Source-tier logic added/used.
- Seed extraction improved.
- Editorial/source diversity concepts added.
- Discovery weaknesses became measurable.

Remaining: discovery coverage is still one of the biggest root problems. Products that never enter the candidate pool cannot be fixed by scoring or source upgrade.

### Phase 2 - Replay fixtures / deterministic testing - DONE

Purpose: freeze live runs so later pipeline fixes can be tested without repeating expensive live calls.

Completed work:

- Fixture save/replay scripts added.
- Synthetic fixture tests added.
- Real live fixtures saved for several product searches.
- Replay made it easier to inspect pipeline stages.

Main lesson: fixtures are critical, but old fixtures may not contain new debug fields. Refresh only when needed.

### Phase 3A - Requirement-filter diagnosis / constrained search confusion - DONE

Purpose: investigate whether constrained searches were dropping all results.

Completed work:

- Found that some "zero exact" cases were actually near-match demotions, not total deletion.
- Improved stage-funnel visibility around exact vs near.
- Fixed numeric parsing issue where phrases like "under $600 4-burner" could confuse direction/quantity logic.
- Improved numeric labels like "under N" -> "at most N."

Main lesson: some apparent failures were measurement/labeling problems, not true product deletion.

### Phase 3B - Wrong-type contamination / near-match safety - DONE / PARTIAL

Purpose: stop wrong product types from leaking into exact or near matches.

Completed work:

- Added/used stricter product-type validation path.
- Added three-state category validation: pass / unverified / fail.
- Wrong-type fail now blocks exact and near where appropriate.
- Robot-vacuum style wrong-type cases improved.

Remaining: product-type taxonomy coverage remains incomplete. Need broader product-type taxonomy expansion later across many categories, not just robot vacuum.

### Phase 3C - Final-selection diagnosis / vocabulary alias issue - DONE / PARTIAL

Purpose: understand why strong gas-grill products survived earlier stages but lost final selection.

Completed work:

- Found that Weber/Napoleon were not requirement-filter failures.
- Found some candidates were exact/high-fit but ranked below the final 7.
- Fixed one shared semantic issue where `gas` and `propane` equivalence could be missed when the user searched gas grill.
- Confirmed final selection needed more trace visibility.

Remaining: final selection, form-factor ranking, source quality, and discovery still need separate work.

### Phase 3D - Final-selection trace instrumentation - DONE

Purpose: make ReviewRadar explain why candidates win or lose final selection.

Completed work:

- Added debug-only final-selection trace.
- Added `scoreAndSelectRecommendationsWithTrace`.
- Kept public `scoreAndSelectRecommendations` behavior unchanged.
- Trace is built after selection completes and does not mutate selection order.
- Tests proved traced and non-traced ordered exact-match names are identical.
- Replay can show final-selection trace when fixtures contain it.

Commits:

- Implementation: `6f7075c`
- Docs: `63f5cd3`

Main lesson: the app can now explain whether products were selected, ranked below cutoff, collapsed, demoted, or rejected.

### Phase 3E - Source-quality upgrade mechanism - DONE

Purpose: fix the root-cause class where a strong product is found but only through weak evidence, causing it to rank below weaker products with better retailer metadata.

Completed work:

- Added `upgradeWeakSourceEvidence` in `lib/requirementEvidenceRescue.ts`.
- Runs before final scoring, after revalidation.
- Gives high-fit weakly sourced candidates a limited chance to find better same-product shopping/retailer evidence.
- Does not create new recommendations.
- Only enriches the same candidate if identity is clear.
- No brand boosts.
- No scoring weight changes.
- No trust gates loosened.
- Max upgrade attempts limited.
- Same-product identity required.
- Tests covered 3 categories plus negative safety cases.

Main lesson: the mechanism was safe, but live diagnostics showed it did not fire.

### Phase 3E Live Diagnostic - DONE

Purpose: test whether source-quality upgrade actually fired in live searches.

Live searches:

- `gas grill`
- `shop vac`
- `robot vacuum`
- `cordless drill`

Result: partial / effectively not useful yet.

Findings:

- `sourceUpgradeTraces: []` on all 4 categories.
- Mechanism was safe but too strict.
- `countExternalCitations === 0` blocked products that still lacked useful commerce evidence.
- Same-brand or manufacturer citations were incorrectly treated as enough outside evidence.
- Model-token gaps also observed, but intentionally deferred.

Main lesson: the trigger needed to ask "does this product have useful commerce evidence?" not "does it have any outside citation?"

### Phase 3F - Safely loosen source-upgrade trigger - DONE

Purpose: make the source-quality upgrade trigger fire when a product still lacks useful commerce evidence.

Completed work:

- Replaced `countExternalCitations === 0` with a better `hasUsefulCommerceEvidence` concept.
- New logic allows upgrade if a product lacks verified price, owner rating, and useful tier-1/tier-2 commerce evidence.
- Tier-3 manufacturer/brand citations and weak tier-4 citations no longer block upgrade.
- Tier-1 editorial/review sources and tier-2 retailer/marketplace sources can still block unnecessary upgrades.
- Did not change scoring, ranking, model-token detection, discovery, price trust, or product eligibility.
- Added tests for RIDGID-style same-brand subdomain and Makita-style manufacturer citation cases.
- Full suite passed.
- Eval pipeline passed.

Commit: `49d4b7b`

Main lesson: the trigger is now better aligned with the real problem: lack of useful commerce evidence.

### Phase 3F Live Diagnostic Re-Test - DONE

Purpose: confirm whether Phase 3F made source upgrade fire live.

Live searches:

- `gas grill`
- `shop vac`
- `robot vacuum`
- `cordless drill`

Result: partial, improved from fail.

Findings:

- Source upgrade fired in 3/4 categories.
- 4 upgrade attempts total.
- Evidence attached: 0/4.
- No unsafe merges.
- No false positives.
- Example attempts: Napoleon Rogue XT 425 SIB, Tapo RV30C Plus, Makita XFD131, WORX WX177L.
- Shop vac had no attempt because RIDGID was not in the pool that run and DEWALT already had tier-2 Home Depot evidence.

Main lesson: the bottleneck moved from trigger logic to unknown cause: maybe query construction, maybe Serper shopping coverage, maybe identity matching, maybe no attachable data fields.

### Phase 3G - Source-upgrade search-result diagnostics - DONE

Purpose: explain why source-upgrade attempts attach no evidence.

Completed work:

- Added debug fields to `SourceUpgradeTrace`: `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, `candidateSample`.
- Candidate sample includes name, host, price, rating, identityMatch, rejectionReason.
- Possible no-match reasons include `shopping_results_empty`, `identity_rejected`, and `no_attachable_fields`.
- Replay now prints returned/evaluated candidates and candidate samples.
- Old fixtures degrade gracefully.
- No behavior changed.
- Added tests for empty results, identity rejection, sample cap, and attached evidence.
- Full suite passed.
- Eval pipeline passed.

Commit: `a33d80d`

Main lesson: the next live diagnostic can now prove whether the bottleneck is query construction, identity matching, or attachable-field extraction.

---

## Current Phase

### Phase 3H - Live diagnostic using Phase 3G fields - DONE

Purpose: use the new diagnostics to identify the real source-upgrade bottleneck.

Diagnostic searches run:

1. `cordless drill`
2. `gas grill`

Findings:

- `cordless drill`: no source-upgrade target qualified in the fresh live run; `sourceUpgradeTraces: []`.
- `gas grill`: 1 source-upgrade attempt ran for `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid`.
- Gas-grill query used: `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill`.
- Gas-grill trace: `candidatesReturned: 0`, `candidatesEvaluated: 0`, `noMatchReason: shopping_results_empty`, `candidateSample: []`, `evidenceAttached: false`.
- No unsafe candidate was close to merging because no shopping candidates were returned.
- The attempted gas-grill product was already selected at final rank #4; no source-upgrade score/rank impact was possible.

Verdict:

- Phase 3H proves the observed bottleneck is shopping search coverage / query construction. It does not prove an identity-matching or attachable-field problem.

Saved fixtures:

- `tests/fixtures/review-radar-live/cordless-drill.json`
- `tests/fixtures/review-radar-live/gas-grill.json`

QA log:

- See `docs/qa-loop-results.md` entry "Claude/Codex QA Update - 2026-06-26 (Phase 3H: Phase 3G trace live diagnostic)".

---

## Remaining Planned Phases

### Phase 3I - Fix proven source-upgrade bottleneck - DONE / NOT LIVE-PROVEN

Phase 3H proved Path A for the observed source-upgrade attempt.

Implemented path:

- Path A, query construction fix. Added a source-upgrade-specific shopping query builder that prefers concise product identity over long display titles and removes redundant category suffixes.
- General missing-evidence rescue still uses `buildRescueShoppingQuery`; only source-quality upgrade uses the new builder.
- Example deterministic outputs: `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` -> `4-Burner Propane Gas Grill`; `Napoleon Rogue XT 425 SIB Gas Grill` -> `Napoleon Rogue XT 425 SIB`; `Makita XFD131 18V LXT Cordless Drill` -> `Makita XFD131`; `Tapo RV30C Plus Robot Vacuum` -> `Tapo RV30C Plus`.
- No scoring, ranking, trigger, identity, model-token, price-trust, citation-trust, product-eligibility, or merge-safety changes.

Status:

- Deterministic tests added and focused source-quality-upgrade tests pass.
- Not live-proven. Do not mark source-upgrade mini-track complete until Phase 3J proves candidates return and evidence attaches safely.

### Phase 3J - Live proof after source-upgrade bottleneck fix - DONE / INCONCLUSIVE

Purpose: after Phase 3I behavior fix, rerun live searches to prove source upgrade attaches safe evidence.

Run completed:

- `cordless drill`
- `gas grill`

Findings:

- Fresh `gas grill` fixture saved at `2026-06-26T16:34:59.605Z`.
- Fresh `cordless drill` fixture saved at `2026-06-26T16:36:22.976Z`.
- Both replays had `sourceUpgradeTraces: []`.
- No source-upgrade query was issued, so the Phase 3I shortened query builder was not live-exercised.
- No candidates returned/evaluated, no evidence attached, no final-selection impact, and no unsafe merge risk appeared.

Verdict:

- Phase 3J completed the requested two-search scope but did not prove whether Phase 3I improves `candidatesReturned`.
- The immediate blocker is source-upgrade eligibility / live fixture coverage, not a proven query, identity, or attachable-field bottleneck.

QA log:

- See `docs/qa-loop-results.md` entry "Codex QA Update - 2026-06-26 (Phase 3J: focused live proof after source-upgrade query fix)".

### Phase 3J extension - Live proof on previously trigger-producing categories - DONE / PARTIAL

Purpose: observe at least one live source-upgrade attempt using the Phase 3I query builder before making another behavior change.

Run completed:

- `robot vacuum`
- `shop vac`

Findings:

- Fresh `robot vacuum` fixture saved at `2026-06-26T16:43:45.998Z`; it had `sourceUpgradeTraces: []`.
- Fresh `shop vac` fixture saved at `2026-06-26T16:45:23.359Z`; it had 2 source-upgrade attempts.
- `shop vac` attempt 1: `Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum`; query `Makita XCV11Z`; `candidatesReturned: 0`; `noMatchReason: shopping_results_empty`; no evidence attached.
- `shop vac` attempt 2: `RIDGID WD1450 14 Gallon Wet/Dry Vac`; query `RIDGID WD1450`; `candidatesReturned: 0`; `noMatchReason: shopping_results_empty`; no evidence attached.
- The Phase 3I shortened query builder is live-wired and used by real source-upgrade attempts.
- Candidate return/evidence attachment is still not proven.

Verdict:

- Partial proof. The shortened query path is live, but compact model-only source-upgrade queries can still return zero shopping candidates.
- The observed bottleneck is query construction / shopping search coverage for model-only queries, not identity matching, attachable-field extraction, model-token detection, or trigger logic.

QA log:

- See `docs/qa-loop-results.md` entry "Codex QA Update - 2026-06-26 (Phase 3J extension: source-upgrade live proof retry)".

### Phase 3K - Source-upgrade search-coverage fallback - DONE / NOT LIVE-PROVEN

Purpose: keep compact model identity as the safest first query, but add a narrowly tested fallback when that compact query returns zero shopping candidates.

Implemented behavior:

- First attempt remains the Phase 3I compact source-upgrade query.
- If and only if the first source-upgrade shopping search returns zero candidates, retry with a minimally broader query that includes the base category/product noun.
- Preserve identity matching, attachable-field extraction, trigger logic, scoring, ranking, discovery, model-token detection, and all trust gates.
- Do not hardcode brands, product names, or categories.

Trace additions:

- `primaryQuery`
- `fallbackQuery`
- `fallbackUsed`
- `primaryCandidatesReturned`
- `fallbackCandidatesReturned`
- existing `candidatesReturned` remains the total returned count for the attempted query path.

Deterministic examples:

- `Makita XCV11Z` -> `Makita XCV11Z shop vac`
- `RIDGID WD1450` -> `RIDGID WD1450 shop vac`
- `Tapo RV30C Plus` -> `Tapo RV30C Plus robot vacuum`
- `Napoleon Rogue XT 425 SIB` -> `Napoleon Rogue XT 425 SIB gas grill`
- `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` stays `4-Burner Propane Gas Grill`; no fallback because the cleaned primary already contains category words.

Tests completed:

- Deterministic tests prove fallback only runs after zero candidates.
- Tests prove fallback does not run when primary candidates return.
- Tests cover multiple unrelated categories.
- Negative/safety tests prove identity matching still blocks wrong fallback candidates.
- Existing trigger, model-token, duplicate citation, no-attachable-fields, candidate sample, and successful attachment tests still pass.

Exit criteria:

- Focused tests pass: `node --no-warnings --test tests/sourceQualityUpgrade.test.mjs` is 39/39 green.
- Full suite passes: `npm test` is 618/618 green.
- Eval red-flag checks are clean.
- No behavior outside source-upgrade search coverage changed.

Status:

- Implemented but not live-proven. Do not mark source-upgrade mini-track complete until Phase 3L proves fallback returns candidates and attaches safe evidence, or clearly exposes the next bottleneck.

QA log:

- See `docs/qa-loop-results.md` entry "Codex QA Update - 2026-06-26 (Phase 3K: source-upgrade query fallback ladder)".

### Phase 3L - Live proof after source-upgrade fallback ladder - DONE / PARTIAL

Purpose: prove whether Phase 3K improves live `candidatesReturned` and whether any returned candidates attach safe evidence.

Run completed:

- `shop vac`
- `robot vacuum`

Findings:

- `shop vac` produced one source-upgrade attempt for `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`.
- Primary query `Wet/Dry Vacuum DXV10SB` returned 0 candidates.
- Fallback query `Wet/Dry Vacuum DXV10SB shop vac` ran and returned 0 candidates.
- Trace: `fallbackUsed: true`, `candidatesReturned: 0`, `candidatesEvaluated: 0`, `noMatchReason: shopping_results_empty`, `candidateSample: []`, `evidenceAttached: false`.
- The attempted product remained selected at rank #4 with score 124.8; no evidence or score/rank change occurred.
- `robot vacuum` produced `sourceUpgradeTraces: []`, so it did not exercise the fallback.
- No unsafe candidate or merge risk appeared because no shopping candidates were returned.
- The conditional `gas grill` search was not run because `shop vac` produced a source-upgrade trace.

Verdict:

- Phase 3K is partially live-proven: the fallback is correctly wired, gated, and traced.
- Phase 3K did not improve `candidatesReturned` in this sample.
- The next observed bottleneck remains source-upgrade shopping-search coverage before identity matching or attachable-field extraction.

QA log:

- See `docs/qa-loop-results.md` entry "Codex QA Update - 2026-06-26 (Phase 3L: live proof after source-upgrade fallback ladder)".

### Phase 3M - Source-upgrade raw Serper and query-identity diagnostic - DONE

Purpose: identify which layer produces zero candidates for both compact and category-context source-upgrade queries.

Instrumentation added:

- Query trace fields: original and cleaned product name, metadata/detected brand, model tokens, selected model identity phrase, category context, primary/fallback queries.
- Serper fields: raw shopping count, considered/structurally usable count, eligible shopping count, organic fallback count, returned count, result source, rejection-reason counts, and capped raw-result samples.
- Source-upgrade field: attachable candidate count.
- Replay prints the new fields and remains compatible with older fixtures.

Live findings:

- Fresh `shop vac` and conditionally allowed `gas grill` fixtures produced no source-upgrade attempts, so direct focused Serper probes were used.
- `Wet/Dry Vacuum DXV10SB`: 40 raw, 20 structural, 0 eligible; final sample split was 10 `search_or_listing_url` and 10 `generic_or_non_product_title`.
- `Wet/Dry Vacuum DXV10SB shop vac`: 40 raw, 20 structural, 0 eligible; 3 `search_or_listing_url`, 17 `generic_or_non_product_title`.
- `DEWALT DXV10SB shop vac`: 40 raw, 20 structural, 0 eligible; 13 `search_or_listing_url`, 7 `generic_or_non_product_title`.
- A correct `DEWALT DXV10SB` result was present in raw output but used a Google Shopping result URL shaped as `https://www.google.com/search?ibp=oshop...`; the listing-URL gate rejected it.
- `Shop-Vac` titles can hit the broad generic-title `shop` pattern even when they are specific products.
- The product object retained `DEWALT` in its name. Metadata brand was absent, but shared brand detection returned `DeWalt`. `buildModelIdentityQuery` dropped it by selecting only `Wet/Dry Vacuum` immediately before `DXV10SB`; fallback inherited the brandless phrase.

Verdict:

- Serper raw coverage is not the observed bottleneck.
- The immediate bottleneck is Serper Shopping product eligibility/normalization before source-upgrade identity matching.
- Brand-dropping query identity is a real general defect, but the brand-preserving control still returned zero eligible candidates, so it is secondary.
- No scoring, ranking, discovery, trigger, query, fallback, identity, extraction, or trust-gate behavior changed.

### Phase 3N - Serper Shopping product-link/title eligibility fix - DONE

Purpose: safely retain specific product offers returned by Serper Shopping when their result URL is a Google Shopping offer link, without allowing ordinary search/category pages to become product evidence.

Completed work:

- Added a narrowly gated source-upgrade evidence mode for specific Google Shopping offers with offer indicators, product identifiers, specific titles, positive prices, and merchant metadata.
- Kept ordinary Google searches and category/listing pages blocked as product cards.
- Preferred merchant product URLs where present.
- Allowed specific `Shop-Vac` product titles while retaining generic `shop` category/listing rejection.
- Fixed RR-048 and RR-049 deterministically.

### RR-051 - Query-derived identity provenance safety - DONE

Completed work:

- Marked Serper snippets as source-derived or query-derived.
- Excluded synthetic query fallback snippets and request-derived category text from same-product identity.
- Preserved source titles, real provider snippets, merchant data, specs, and safe URL evidence.

### Phase 3O - Brand-preserving source-upgrade identity query - DONE

Completed work:

- Resolved trusted metadata brand first, then the existing shared detected brand.
- Combined reliable brand with compact model identity without restoring retailer-title filler.
- Changed `Wet/Dry Vacuum DXV10SB` to `DeWalt DXV10SB`, with fallback `DeWalt DXV10SB shop vac`.
- Fixed RR-047 deterministically.

### RR-053 - URL-query identity safety - DONE

Completed work:

- Limited candidate URL identity to host plus path.
- Excluded the complete query string and fragment, preventing Google Shopping `q=HP+HD0900` from supplying target identity to an HP laptop.
- Retained merchant product-path identity and valid source-title identity for Google Shopping offers.
- Exact negative and positive regressions pass; no live search was run.

### Phase 3P - Model-token detection broadening - TODO

Only do after source-upgrade query/search-coverage behavior is proven, or after a focused eligibility diagnostic proves that model-token detection is now the source-upgrade blocker.

Purpose: some good products do not trigger source upgrade because their model names do not fit the current model-token regex.

Known skipped examples:

- Napoleon Rogue 525
- FEIN Turbo II
- Samsung Bespoke style names
- digit-dash-digit patterns
- descriptive model names

Goal: broaden identity/model detection without making unsafe merges more likely.

Important: do not combine this with query construction or identity matching changes. Keep it separate.

Tests:

- Positive tests across 3+ categories.
- Negative tests for generic product names, accessories, parts, and bundles.
- Prove max attempts still limit cost.

### Phase 3Q - Source-quality upgrade final validation - TODO

Purpose: run a focused live validation after 3I/3J/3K.

Searches:

- `gas grill`
- `cordless drill`
- `shop vac`
- `robot vacuum`
- one new category, such as `toaster oven` or `office chair`

Measure whether source upgrade fires only when useful, attaches safe evidence, improves scores naturally, avoids unsafe merges, and helps more than one category.

Exit criteria: decide whether the source-quality mini-track is complete or needs one more focused fix.

---

## Phase 4A-4F Diagnostic Issue-Harvest Track

This diagnostic track supersedes entering fix mode immediately. Run each phase in order, update the canonical issue report, and commit docs-only findings after each phase. Do not fix discovered defects during this track.

Required documentation after every Phase 4 step:

- `docs/RR-Issues-Report.md`
- `docs/qa-loop-results.md`
- `docs/agent-next-task.md`
- `docs/change-log.md`
- `docs/Agent Run Summary.md`
- `docs/codex-handoff-phased-plan.md`

Do not continue to the next Phase 4 step until all six files are updated as appropriate and the docs-only commit is complete when docs changed. Each completed-step record below must state the completed step, next step, diagnostic-only status, stop-condition result, new and updated issue IDs, docs commit status, and commit hash.

- Phase 4A - Diagnostic issue-harvest setup - **DONE**
- Phase 4B - Source-upgrade safety and reliability diagnostics - **DONE**
- Phase 4C - Price trust and fake-low price diagnostics - **DONE**
- Phase 4D - Product-type leakage and requirement diagnostics - **DONE**
- Phase 4E - Market-leader discovery and citation diagnostics - **DONE**
- Phase 4F - Broad rotating product quality sweep - **DONE**

### Phase 4A completion record

- Completed step: Phase 4A - Diagnostic issue-harvest setup.
- Next step: Phase 4B - Source-upgrade safety and reliability diagnostics.
- Diagnostic-only: Yes; docs audit only, with no live search or behavior change.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: None; relationships and next diagnostic needs were documented without changing status or severity.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `dd8c0c4` (`docs: prepare phase 4 issue harvest`).
- Result: all 53 issue IDs are contiguous and unique, all records contain the required schema, summary counts reconcile, and overlapping records describe distinct failure layers.

### Phase 4B completion record

- Completed step: Phase 4B - Source-upgrade safety and reliability diagnostics.
- Next step: Phase 4C - Price trust and fake-low price diagnostics.
- Diagnostic-only: Yes; three live save/replay pairs, with no behavior change.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007, RR-008, RR-013, RR-017, RR-041, RR-042, RR-048, RR-051, RR-053.
- Status changes: RR-007, RR-008, and RR-017 reopened as Needs Investigation.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `01d4fcb` (`docs: record phase 4B diagnostics`).
- Result: source upgrade fired in 1/3 searches; URL/query identity safety held, but the only attachment enriched a wrong-type range/PDF target.

### Phase 4C completion record

- Completed step: Phase 4C - Price trust and fake-low price diagnostics.
- Next step: Phase 4D - Product-type leakage and requirement diagnostics.
- Diagnostic-only: Yes; three live save/replay pairs, with no behavior change.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-002, RR-007, RR-008, RR-013, RR-017, RR-052.
- Status changes: None; RR-002 remains Needs Investigation and RR-052 remains Open.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `99b2ca8` (`docs: record phase 4C price diagnostics`).
- Result: RR-002 reproduced on a second product at `$10` verified/budget-usable/exact; no other fake-low or installment price was observed.

### Phase 4D completion record

- Completed step: Phase 4D - Product-type leakage and requirement diagnostics.
- Next step: Phase 4E - Market-leader discovery and citation diagnostics.
- Diagnostic-only: Yes; four live save/replay pairs, with no behavior change.
- Stop condition hit: No.
- New issue IDs opened: RR-054, RR-055.
- Existing issue IDs updated: RR-007, RR-009, RR-013, RR-017, RR-043.
- Status changes: RR-009 reopened as Needs Investigation.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `df52791` (`docs: record phase 4D type diagnostics`).
- Result: cross-category containment failed; a current fallback omitted diagnostics; a valid generator falsely failed `Portable`.

### Phase 4E completion record

- Completed step: Phase 4E - Market-leader discovery and citation diagnostics.
- Next step: Phase 4F - Broad rotating product quality sweep.
- Diagnostic-only: Yes; five live save/replay pairs plus offline benchmark comparison, with no behavior change.
- Stop condition hit: No.
- New issue IDs opened: RR-056.
- Existing issue IDs updated: RR-013, RR-014, RR-017, RR-022.
- Status changes: RR-014 and RR-022 reopened as Needs Investigation.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `eea3955` (`docs: record phase 4E leader diagnostics`).
- Result: benchmark final leader coverage averaged 3.0/7; citation loss and family concentration remain systemic, while running shoes showed a strong positive-control slate.

### Phase 4F completion record

- Completed step: Phase 4F - Broad rotating product quality sweep.
- Next step: None automatically; stop before Phase 5.
- Diagnostic-only: Yes; ten live save/replay pairs and offline fixture inspection, with no behavior change.
- Stop condition hit: No. The critical RR-058 finding was documented as instructed; no fix was attempted.
- New issue IDs opened: RR-057, RR-058, RR-059, RR-060, RR-061.
- Existing issue IDs updated: RR-002, RR-007, RR-008, RR-013, RR-015, RR-017, RR-022, RR-043, RR-056.
- Status changes: None during 4F.
- Required docs updated: All six Phase 4 documentation files.
- Docs committed: Yes.
- Commit: `844754e` (`docs: complete phase 4 issue harvest`).
- Result: 61 total issues; broad quality remains inconsistent, with RR-058 the highest-priority Phase 5 safety fix.

## Phase 5 Implementation Program

Phase 5 is executed one approved step at a time. Each step must preserve existing trust gates, add deterministic regressions for every fix, run focused and full verification, update all required docs, commit the completed step, and stop before the next step.

### Phase 5A completion record

- Completed step: Phase 5A - Source-upgrade safety hardening (RR-058 only).
- Next step: Phase 5B - Source-upgrade identity coverage (RR-052, RR-057, RR-034, RR-035, RR-044), only after explicit instruction.
- Diagnostic-only: No. This was a narrow behavior fix preceded by a deterministic reproduction.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-058 changed from Open to Fixed.
- Behavior: source-upgrade identity rejects explicit candidate product-type conflicts before model/token overlap acceptance and rejects explicit different models within the same model family.
- Preserved: RR-048, RR-049, RR-051, RR-053, exact model matches, merchant model paths, valid sparse same-product evidence, trigger/fallback/query behavior, scoring/ranking, price/citation trust, and user-facing shape.
- Verification: focused tests 170/170; typecheck passed; lint 0 errors with 3 pre-existing warnings; full tests 647/647; eval red-flag checks clean.
- Live proof: Not run.
- Required docs updated: issue register, QA log, next task, change log, run summary, phased handoff, test memory, and technical overview.
- Docs committed: Yes.
- Commit: `a4ff1c0` (`fix: harden source-upgrade identity safety`).
- Result: the exact Whynter RPD-411WG dehumidifier / wine-refrigerator offer is deterministically rejected with no commerce evidence attached.

### Phase 5B completion record

- Completed step: Phase 5B - Source-upgrade identity coverage (RR-052, RR-057, RR-034, RR-035, RR-044).
- Next step: Phase 5C - Price trust restoration (RR-002 only), only after explicit instruction.
- Diagnostic-only: No. This was a focused behavior fix preceded by fail-first deterministic reproduction.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-052, RR-057, RR-034, RR-035, and RR-044 changed from Open to Fixed; RR-058 remains Fixed.
- Behavior: context-sensitive HP brand evidence; ranked model extraction with measurement suppression; mixed word-number, descriptive, numeric-dash, uppercase suffix, and short brand-qualified family coverage.
- Safety: family-only identities require source-derived category evidence before attachment; same-family and numeric-dash model conflicts reject; all Phase 5A/RR-051/RR-053 regressions remain green.
- Verification: focused tests 183/183; typecheck passed; lint 0 errors with 3 pre-existing warnings; full tests 660/660; eval red-flag checks clean.
- Live proof: Not run.
- Required docs updated: issue register, QA log, next task, change log, run summary, phased handoff, test memory, and technical overview.
- Docs committed: Yes.
- Commit: `872ee5d` (`fix: expand source-upgrade identity coverage`).
- Result: assigned false-brand/false-model query cases are corrected, legitimate model-family targets become eligible, and expanded coverage does not loosen attachment identity.

### Phase 5C completion record

- Completed step: Phase 5C - Price-trust restoration (RR-002 only).
- Next step: Decision required. Recommended RR-062 diagnostic-only reproduction before Phase 5D; otherwise Phase 5D owns RR-007/RR-008/RR-009 only.
- Diagnostic-only: No. This was a focused behavior fix preceded by deterministic reproduction.
- Stop condition hit: No for RR-002. A separate out-of-scope malformed-high-price issue was found and logged as RR-062 without a fix.
- New issue IDs opened: RR-062 (High, Needs Investigation).
- Existing issue IDs updated: RR-002 changed from Needs Investigation to Fixed; RR-001 and RR-003 remain Fixed.
- Behavior: shared class-sensitive full-product floors now cover plural/wet-dry/shop-vac wording, dash cameras, and wireless earbuds; below-floor prices become suspicious and budget/exact-ineligible.
- Safety: global absolute floor unchanged; `$12.99` low-end wireless earbuds remain verified; full-size appliance, installment, conflicting-price, and specific text-price behavior remain green.
- Verification: focused tests 116/116; typecheck passed; lint 0 errors with 3 pre-existing warnings; full tests 665/665; eval red-flag checks clean.
- Fixture proof: frozen replays retain the historical defect; current-code reassessment changes all three saved `$10` products to suspicious and exact-ineligible.
- Live proof: three approved searches (`shop vac`, `dash cam`, `wireless earbuds`); no `$10` exact result, and a real `$20` earbud remained verified.
- Required docs updated: issue register, QA log, next task, change log, run summary, phased handoff, test memory, and technical overview.
- Docs committed: Yes.
- Commit: `9a8a293` (`fix: restore cross-category tiny-price trust`).
- Result: RR-002 is fixed with deterministic and live proof. RR-062 is isolated and remains unmodified.

### RR-062 diagnostic mini-phase completion record

- Completed step: RR-062 malformed-high-price diagnostic before Phase 5D.
- Next step: Narrow RR-062 behavior fix, only after explicit instruction; Phase 5D remains deferred.
- Diagnostic-only: Yes. No app behavior, tests, fixtures, scoring, ranking, trust, eligibility, source-upgrade, or UI changes.
- Stop condition hit: No. The root cause was confirmed; implementation was intentionally excluded.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-062 changed from Needs Investigation to Open after root-cause confirmation.
- Evidence: the saved Phase 5C fixture shows VIOFO gains `19999` only during asset enrichment; the current cited page has an unrelated A139 widget with `data-price="19999"`, and current metadata extraction reproduces the exact offer.
- Correction: the `$322.99` source-upgrade sample belongs to BlackVue DR770X, not VIOFO; VIOFO was not source-upgraded.
- Root cause: unscoped structured-page price extraction treats a Shopify-style minor-unit integer as dollars, and price trust has no product-affinity or malformed-high-price containment for that lone retailer-page signal.
- Verification: focused tests 153/153; typecheck passed; lint 0 errors with 3 pre-existing warnings; full tests 665/665; eval red-flag checks clean.
- Live proof: No ReviewRadar search. One read-only retrieval of the already cited VIOFO source page was used to identify the raw field.
- Required docs updated: issue register, QA log, next task, change log, run summary, phased handoff, and test memory.
- Docs committed: Yes.
- Commit: `be9d9df` (`docs: diagnose RR-062 price extraction`).
- Result: RR-062 is diagnosed and remains unfixed. A separate narrow fix is recommended before Phase 5D.

### RR-062 behavior-fix mini-phase completion record

- Completed step: RR-062 product-scoped structured-price behavior fix.
- Next step: Phase 5D - Product-card eligibility cleanup (RR-007, RR-008, RR-009 only), after explicit instruction.
- Diagnostic-only: No. This was a narrow asset-extraction behavior fix preceded by fail-first reproduction.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-062 changed from Open to Fixed; RR-013 and RR-007/RR-017 received adjacent live evidence without status changes.
- Behavior: matching schema.org products are selected by identity; page-level and visible prices require matching page identity; element-level prices require matching product context; bare integer minor units require an explicit unit marker.
- Safety: no global price maximum; legitimate `$19,999` product-bound evidence remains valid; RR-002 and all existing price/scoring/exact-budget protections remain green.
- Verification: product-assets 20/20; focused tests 123/123; typecheck passed; lint 0 errors with 3 pre-existing warnings; full tests 672/672; eval red-flag checks clean.
- Saved-fixture proof: current-code reassessment no longer extracts `$19,999`; a stray `$1` visible value is contained as suspicious and exact-ineligible.
- Live proof: one `dash cam` search; VIOFO A229 Pro 2CH exact #2 at `$349.99` from matching JSON-LD; no malformed high verified price.
- Required docs updated: issue register, QA log, next task, change log, run summary, phased handoff, test memory, and technical overview.
- Docs committed: Yes.
- Commit: `685a840` (`fix: scope product-page price metadata`).
- Result: RR-062 is fixed. Phase 5D has not started.

---

## Larger Product-Quality Phases After Diagnostic Harvest

### Legacy Product-Quality Phase 4 - Discovery coverage / market-leader recall - DEFERRED

Purpose: fix products that never enter the candidate pool. Source upgrade can only help products already found.

Goals:

- Improve broad-search discovery.
- Better market-leader seeding.
- Better editorial/review source coverage.
- Better top-products query planning.
- Avoid single-source catalog flooding.

Tests:

- Broad searches with known market leaders.
- Measure pool coverage before ranking.
- Do not hardcode one category.

Exit criteria: more expected leaders appear in candidate pool across unrelated categories.

### Phase 5 - Candidate pool diversity and duplicate flooding - TODO

Purpose: stop one product or one variant family from flooding the candidate pool.

Goals:

- Better product identity normalization.
- Better variant-family keys.
- Keep distinct products.
- Collapse true duplicates.
- Do not collapse genuinely different models.

Tests:

- Robot vacuum duplicates.
- Grill variants.
- Laptop/TV model variants.
- Same product across retailers.

Exit criteria: final 7 contains 7 distinct useful products, not duplicate listings.

### Phase 6 - Product-type taxonomy expansion - TODO

Purpose: improve wrong-type blocking across many categories.

Goals:

- Expand shared taxonomy.
- Add wrong-type terms and allowed form factors across unrelated categories.
- Keep three-state logic: pass / unverified / fail.

Do not add one-off category hacks without a shared structure.

Tests:

- robot vacuum vs stick/shop vac
- shop vac vs household vacuum
- gas grill vs griddle/tabletop stove
- laptop vs tablet/accessory
- refrigerator vs freezer/ice maker
- TV vs monitor/projector

Exit criteria: wrong-type candidates are blocked or demoted correctly across categories.

### Phase 7 - Form-factor / niche product ranking - TODO

Purpose: stop niche/portable/tabletop/travel products from outranking standard products on broad searches.

Goals:

- Detect niche form-factor signals.
- Penalize off-form-factor products for broad searches.
- Do not penalize them when the user asks for that niche.

Tests:

- gas grill vs tabletop/travel grill
- vacuum vs handheld vacuum
- washing machine vs portable washer
- treadmill vs under-desk treadmill
- refrigerator vs mini fridge

Exit criteria:

- Broad searches favor standard market-leading form factors.
- Niche searches still return niche products.

### Phase 8 - Semantic feature alias expansion - TODO

Purpose: make the app understand equivalent wording across categories.

Examples:

- gas <-> propane / natural gas
- cordless <-> battery powered
- electric <-> plug-in
- induction <-> electric cooktop type
- waterproof <-> water resistant, where appropriate
- self-emptying <-> auto-empty dock
- HEPA <-> high-efficiency filter, where supported

Goal: shared alias mechanism, not one-off patches.

Tests:

- At least 5 unrelated categories.
- Positive and negative cases.
- Avoid false equivalence.

Exit criteria: requirements match real product vocabulary more reliably.

### Phase 9 - Popularity / trust weighting calibration - TODO

Purpose: improve broad no-criteria searches so the final 7 are genuinely trusted, popular, and high-performing.

Goals:

- Strengthen market confidence signals.
- Better use owner review volume, editorial consensus, trusted retailer presence, and known product prominence.
- Avoid boosting unknown products with thin evidence.
- Avoid over-rewarding one retailer listing.

Important: do this only after discovery/source-quality/duplicates/form-factor are improved enough that scoring has good candidates to rank.

Exit criteria: broad searches produce recognizable, trusted, top-performing products more consistently.

### Phase 10 - Price trust and budget placement validation - TODO

Purpose: make exact/near/budget labels reliable.

Goals:

- Keep budget exact-match strict.
- Improve price confidence trace.
- Prevent suspicious prices from making exact matches.
- Ensure budget label makes sense.

Tests:

- under $300 robot vacuum
- under $600 grill
- under $100 headphones
- products with marketplace/suspicious prices

Exit criteria: products only appear as in-budget exact when price evidence is trustworthy.

### Phase 11 - Image recovery / product assets - TODO

Purpose: reduce "image not available" when a product image likely exists.

Goals:

- Improve image source fallback.
- Prefer product-page/shopping images.
- Avoid wrong product images.
- Avoid logos or article thumbnails.
- Preserve trust.

Tests:

- Products with known retailer images.
- Manufacturer-only products.
- Marketplace products.
- Wrong-image negative cases.

Exit criteria: higher image coverage without wrong-image pollution.

### Phase 12 - Final scoring calibration with trace - TODO

Purpose: use `finalSelectionTrace` to calibrate scoring only after upstream issues are fixed.

Use only if trace proves good candidates are found, evidence is strong, type/form-factor is correct, duplicates are handled, but ranking is still wrong.

Goals:

- Adjust scoring based on evidence.
- Do not create brand boosts.
- Keep trust penalties meaningful.
- Avoid overfitting to one fixture.

Tests:

- Broad category benchmark.
- Constrained benchmark.
- Negative trust cases.

Exit criteria: final 7 ranking looks better across multiple categories without trust regressions.

### Phase 13 - Broad live benchmark / regression scorecard - TODO

Purpose: measure real app quality after major fixes.

Run a broad benchmark across many product categories, such as:

- gas grill
- robot vacuum
- shop vac
- cordless drill
- toaster oven
- office chair
- refrigerator
- TV
- air purifier
- running shoes
- headphones
- pressure washer
- mattress
- coffee maker
- dog food
- laptop
- dishwasher
- soundbar
- electric toothbrush
- luggage

Measure expected leader coverage, wrong-type leaks, duplicate flooding, weak #1s, source/citation quality, image coverage, price confidence, exact vs near correctness, and finalSelectionTrace reasons.

Exit criteria: identify remaining root failures and rank them by impact.

### Phase 14 - QA automation / loop hardening - TODO

Purpose: make the improvement loop easier to run repeatedly.

Goals:

- Better saved fixture organization.
- Clear "current next task" file.
- Better agent run summary.
- Better regression scripts.
- Better cost guardrails.
- Easy Codex/Claude handoff.

Exit criteria: future agents can continue without rereading long chats.

### Phase 15 - Final polish / user-facing result quality - TODO

Purpose: improve what the user sees after the backend pipeline is stronger.

Possible areas:

- Better explanation of why each product won.
- Better "missing evidence" labels.
- Better near-match explanations.
- Better confidence wording.
- Better comparison table.
- Cleaner UI around exact vs close matches.

Do this only after backend trust and ranking are stronger.

---

## Rules for All Future Phases

1. No product-specific patches.
2. No brand boosts unless part of a general market-leader system.
3. No scoring changes without trace proof.
4. No discovery changes without pool-coverage measurement.
5. No loosening trust gates to make results look better.
6. Every behavior change needs deterministic tests.
7. Every risky change needs negative tests.
8. Every live run should be saved as a fixture when useful.
9. Update docs after each phase.
10. Keep phases small so cause/effect is clear.

---

## Immediate Next Task for Codex

### Phase 5D completion record

- Completed step: Phase 5D product-card eligibility cleanup.
- Next step: Phase 5E product-type and requirement truthfulness, only after explicit instruction.
- Diagnostic-only: No. This phase reproduced and fixed RR-007, RR-008, and RR-009.
- Stop condition hit: No. Issue definitions were clear, untracked generated files were separable, no trust gate needed weakening, RR-013 remained out of scope, and RR-062 code was untouched.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007, RR-008, and RR-009 changed from Needs Investigation to Fixed. RR-013, RR-017/RR-043, and RR-055 received adjacent live evidence without status changes.
- Docs committed: Yes.
- Implementation commit: `f9d6419`.
- Documentation commit: `a6afb1e`.
- Verification: fail-first 5 assertions; focused 78/78; broad focused 192/192; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 678/678; eval clean.
- Live validation: exactly `portable generator`, `shop vac`, and `air purifier`; no full baseline. Generated fixtures remain untracked.

### Phase 5E completion record

- Completed step: Phase 5E product-type and requirement truthfulness.
- Next step: Decision required. Recommended narrow RR-007 eligibility follow-up; if deferred explicitly, Phase 5F citation retention for RR-022 only.
- Diagnostic-only: No. This phase reproduced and fixed RR-017, RR-043, and RR-055.
- Stop condition hit: Adjacent issue only. `Pressure Washers - Best Buy` reached exact #7 twice, reopening RR-007; no out-of-scope eligibility fix was attempted.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-017, RR-043, and RR-055 Fixed; RR-007 changed from Fixed to Needs Investigation.
- Docs committed: Yes.
- Implementation commit: `3fa7b27`.
- Documentation commit: `ed22630`.
- Verification: fail-first 4 suites; focused 83/83; broad safety 314/314; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 684/684; eval clean.
- Live validation: exactly four calls - `shop vac`, `pressure washer` twice, and `portable generator`; no full baseline. Generated fixtures remain untracked.

Stop. Phase 5E is complete.

Task:

Recommended next step, only after explicit instruction:

1. Decide whether to address reopened RR-007 before Phase 5F.
2. If RR-007 is deferred, keep Phase 5F limited to RR-022.
3. Do not combine page eligibility and citation-retention behavior.
4. Preserve Phase 5E type/requirement rules and all existing trust protections.

Do not:

- start Phase 5F or an RR-007 fix automatically;
- combine RR-007 and RR-022;
- weaken existing price, citation, product, requirement, or identity safety;
- run another live search or full baseline without approval.

Exit criteria met: RR-017, RR-043, and RR-055 are fixed with deterministic and bounded live proof; RR-007 is explicitly reopened; Phase 5F has not begun.

### RR-007 regression cleanup completion record

- Completed step: Narrow RR-007 nested catalog/listing-page regression cleanup.
- Next step: Phase 5F citation retention for RR-022 only, after explicit instruction.
- Diagnostic-only: No. The mini-phase reproduced and fixed the shared eligibility gap.
- Stop condition hit: No. The root cause was isolated without weakening a trust gate or overlapping RR-022/RR-013.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007 changed from Needs Investigation to Fixed.
- Docs committed: Yes.
- Implementation commit: `06ccd36`.
- Documentation commit: `2800a52`.
- Verification: fail-first 3 failures; focused 89/89; broader Phase 5E safety 177/177; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 686/686; eval clean.
- Live validation: exactly one `pressure washer` call. Six exact and one near product remained, all with specific product-detail primary URLs; no Best Buy catalog card. No full baseline.

Stop. The RR-007 cleanup is complete. Do not start Phase 5F without explicit instruction.

### Phase 5F completion record

- Completed step: Phase 5F citation retention.
- Next step: Phase 5G evidence-strength ranking for RR-013 only, after explicit instruction.
- Diagnostic-only: No. This phase reproduced and fixed RR-022.
- Stop condition hit: Bounded live-proof caveat only. The second live call exposed a generic Purina family card; the final deterministic path-binding guard fixed that exact shape, but the two-call cap prevented a post-refinement live recheck.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-022 changed from Needs Investigation to Fixed. RR-007 remains Fixed with an added family-page regression. RR-013 remains Needs Investigation and unchanged.
- Docs committed: Yes.
- Implementation commit: `dc0f403`.
- Documentation commit: `b3e78fe`.
- Verification: fail-first 3 failures; focused 69/69; broad safety 282/282; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.
- Live validation: exactly two calls - `electric toothbrush` and `dog food`. The first had 28/28 citation retention. The second exposed the final safety refinement; no third call or full baseline ran.

Stop. Phase 5F is complete. Do not start Phase 5G without explicit instruction.

### Phase 5F dog-food live-confirmation record

- Completed step: Focused post-refinement `dog food` live confirmation.
- Next step: Narrow RR-008 article-card eligibility cleanup, after explicit instruction. Phase 5G remains queued behind it.
- Diagnostic-only: Yes. Exactly one live search and replay ran; no app behavior changed.
- Stop condition hit: Yes. A BK Pets Substack editorial article became exact card #5, so the run stopped without a code fix or Phase 5G work.
- New issue IDs opened: None. The finding is a recurrence of RR-008.
- Existing issue IDs updated: RR-022 remains Fixed and is now live-confirmed for dog-food citation retention; RR-007 remains Fixed; RR-008 changed from Fixed to Needs Investigation; RR-013 remains unchanged.
- Docs committed: Yes.
- Documentation commit: `826b9c9`.
- Verification: focused eligibility/citation/API tests 60/60; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.
- Live validation: one `dog food` call. Six specific Purina/Hill's candidates survived citation verification; the generic Purina family card did not recur. The final slate contained seven exact and zero near products, including one unsafe editorial article card.

Stop. Do not start Phase 5G until RR-008 is explicitly addressed or deferred.

### RR-008 cleanup mini-phase completion record

- Completed step: RR-008 article/question-page product-card cleanup.
- Next step: Explicit decision on RR-007/RR-063 safety work. Phase 5G remains queued.
- Diagnostic-only: No. RR-008 behavior and deterministic tests changed.
- Stop condition hit: Yes, adjacent live safety findings. Generic Chewy family pages became primary card URLs and wrong-recipe same-brand citations survived; no out-of-scope fix was attempted.
- New issue IDs opened: RR-063.
- Existing issue IDs updated: RR-008 changed from Needs Investigation to Fixed; RR-007 changed from Fixed to Needs Investigation; RR-022 remains Fixed; RR-013 remains unchanged.
- Docs committed: Yes.
- Implementation commit: `98b695a`.
- Documentation commit: `418275b`.
- Verification: fail-first 3 failures; focused 87/87; broad safety 192/192; typecheck passed; lint 0 errors with 3 existing warnings; full suite 694/694; eval clean.
- Live validation: exactly one `dog food` call. BK Pets/Substack/editorial cards were absent. Seven exact products and zero near products remained. RR-007/RR-063 findings prevented a fully clean live verdict.

Stop. Do not start Phase 5G or fix RR-007/RR-063 without explicit instruction.

### RR-007/RR-063 product-evidence safety completion record

- Completed step: Narrow primary product-link and citation-identity safety mini-phase.
- Next step: Phase 5G evidence-strength ranking for RR-013 only, after explicit instruction.
- Diagnostic-only: No. This phase reproduced and fixed RR-007 and RR-063.
- Stop condition hit: Bounded live-proof caveat only. The one live call exposed two additional RR-063 variants; the final deterministic refinement was reassessed against the saved fixture without a second live call.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007 and RR-063 changed from Needs Investigation to Fixed. RR-008 and RR-022 remain Fixed. RR-013 remains unchanged.
- Docs committed: Yes.
- Implementation commit: `01414c1`.
- Documentation commit: `d97b2ab`.
- Verification: fail-first 8 failures plus missing module; focused 84/84; broad safety 295/295; typecheck passed; lint 0 errors with 3 existing warnings; full suite 706/706; eval clean.
- Live validation: exactly one `dog food` call. Six exact and five near products remained; every primary URL was a specific product-detail route. No generic family, editorial, support, manual, or documentation page became a card. Final saved-fixture reassessment removes the Blue Buffalo and Iams mismatched citations.

Stop. Do not start Phase 5G without explicit instruction.

### Phase 5G completion record

- Completed step: Phase 5G evidence-strength ranking.
- Next step: Phase 5H broad-slate diversity and form-factor quality, only after explicit instruction.
- Diagnostic-only: No. This phase reproduced and fixed RR-013.
- Stop condition hit: No. The ranking change remained bounded and did not require weakening any trust or eligibility gate.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-013 changed from Needs Investigation to Fixed. No other status changed.
- Docs committed: Yes.
- Implementation commit: `94c2e06`.
- Documentation commit: `c8905e5`.
- Verification: fail-first 3 failures; focused ranking/trace 57/57; broad safety 348/348; typecheck passed; lint 0 errors with 3 existing warnings; full suite 712/712; eval clean.
- A/B: Nexgrill `#1 -> #2`; Weber `#2 -> #1`; suspicious `$1` Weber remained near-only.
- Live validation: None. Saved weak-winner fixtures lacked an independent challenger, so no provider-variance call was spent. No broad baseline ran.

Stop. Do not start Phase 5H without explicit instruction.

### Phase 5H completion record

- Completed step: Phase 5H broad-slate diversity and form-factor quality.
- Next step: Narrow RR-064 source-upgrade same-family different-model identity diagnosis/fix, followed by reopened RR-007/RR-008 pre-final eligibility containment. Do not start Phase 5I first.
- Diagnostic-only: No. This phase reproduced and fixed RR-056, RR-059, and RR-060.
- Stop condition hit: Yes. The single focused live run exposed Critical RR-064 and showed category/editorial pages remaining exact-eligible below cutoff. No out-of-scope source-upgrade or eligibility fix was attempted.
- New issue IDs opened: RR-064.
- Existing issue IDs updated: RR-056, RR-059, and RR-060 changed from Open to Fixed. RR-007 and RR-008 reopened as Needs Investigation. RR-014 remains Needs Investigation and was used only as an outcome metric.
- Docs committed: Yes.
- Documentation commit: `d78a9f5`.
- Implementation commit: `230d7bc`.
- Verification: fail-first 3 failures with 2 controls already green; focused safety/selection matrix 303/303; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 724/724; eval clean.
- Fixture/A-B proof: M27Q duplicate collapsed; coffee-maker and treadmill mainstream winners rose; five RR-014 broad fixtures remained neutral at mean `3.0/7`; the Phase 5G citation-strength A/B was unchanged.
- Live validation: exactly one `electric toothbrush` call. A fourth Sonicare candidate received the capped family penalty and was replaced by a distinct Oral-B product. The same run exposed RR-064 plus below-cutoff exact eligibility for an Oral-B category page, an ANSI blog, and two comparison articles. No second live call or full baseline ran.

Stop. Do not start Phase 5I. Address RR-064 first after explicit instruction, then the reopened RR-007/RR-008 eligibility gap.

### RR-064 source-upgrade identity mini-phase completion record

- Completed step: RR-064 same-family conflicting-model source-upgrade safety fix.
- Next step: Narrow reopened RR-007/RR-008 pre-final eligibility cleanup. Do not start Phase 5I first.
- Diagnostic-only: No. The phase reproduced and fixed RR-064.
- Stop condition hit: No. The fix strengthened shared identity safety without changing ranking, discovery, query construction, trigger behavior, normalization, or trust gates.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-064 changed from Needs Investigation to Fixed. RR-007 and RR-008 remain Needs Investigation.
- Docs committed: Yes.
- Implementation commit: `938b839`.
- Documentation commit: `ce20707`.
- Verification: fail-first 1 RR-064 failure with 71 controls passing; focused identity/source-upgrade and broad safety 157/157; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 729/729; eval clean.
- Live validation: exactly one `electric toothbrush` call. Smart 9300 was rejected as `identity_mismatch` for the DiamondClean 9000 target; an explicit 9000 result attached. A 2100 attempt also rejected a 4100 before attaching a 2100 result. No broad baseline ran.

Stop. Do not start Phase 5I. Address reopened RR-007/RR-008 eligibility only after explicit instruction.

### RR-007/RR-008 pre-final eligibility cleanup completion record

- Completed step: Reopened RR-007/RR-008 pre-final product-card eligibility cleanup.
- Next step: Phase 5I source-upgrade trigger and fallback reliability, only after explicit instruction.
- Diagnostic-only: No. The phase reproduced and fixed RR-007/RR-008.
- Stop condition hit: No. The shared eligibility fix did not require weakening citation retention, identity, price, product-type, requirement, or ranking gates.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007 and RR-008 changed from Needs Investigation to Fixed. RR-063 and RR-064 remain Fixed.
- Docs committed: Yes.
- Implementation commit: `50b0713`.
- Documentation commit: `0762ff3`.
- Verification: fail-first 4 failures with 152 controls passing; focused boundary 157/157; broad named-regression safety 330/330; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 735/735; eval clean.
- Fixture proof: current-code reassessment removes the pre-fix final MultiVu press-release card.
- Live validation: exactly one `electric toothbrush` call. Five specific product cards remained; no category, standards, blog, comparison, or press page entered the exact-scored trace. A broad Oral-B comparison page remained secondary only, and RR-064 source-upgrade identity stayed safe. No broad baseline ran.

Stop. Do not start Phase 5I without explicit instruction.

### Phase 5I safety-stop record

- Completed step: Phase 5I diagnosis, fail-first proof, candidate implementation, and one focused live safety check.
- Next step: Narrow Critical RR-065 source-upgrade identity-safety fix. Do not start Phase 5J or retry Phase 5I fallback broadening first.
- Diagnostic-only: Final repository outcome is diagnostic/docs-only. A candidate behavior change was tested locally, then fully rolled back after the live stop condition.
- Stop condition hit: Yes. Fallback attached an Amazon Basics citation to `Amazon.com: RIDGID ... VAC1200` after treating the retailer prefix as target brand identity.
- New issue IDs opened: RR-065.
- Existing issue IDs updated: RR-041 and RR-042 remain Needs Investigation with new fail-first/live evidence. RR-007, RR-008, RR-063, and RR-064 remain Fixed and were not changed.
- Docs committed: Yes.
- Documentation commit: `23cee7f`.
- Verification: fail-first 734/736 with only the two intended failures; focused 92/92 after the candidate fix; candidate full suite 738/738 and eval clean. After rollback, the restored repository passed typecheck, lint with 0 errors and 3 pre-existing warnings, 735/735 tests, and eval.
- Live validation: exactly one `shop vac` call. HD0900 attached safe exact evidence. The VAC1200 target rejected a SKIL primary candidate, retried fallback, then unsafely attached an Amazon Basics citation. The second planned live search was skipped.
- Rollback: all Phase 5I app, replay, and test edits were removed. No behavior change is present or committed.

Stop. Fix RR-065 only after explicit instruction, then resume Phase 5I. Do not start Phase 5J.

### RR-065 identity-safety completion record

- Completed step: Narrow RR-065 retailer/source identity-safety mini-phase.
- Next step: Narrow reopened RR-007 Bosch `/ocs-c/` collection-page cleanup. Do not retry Phase 5I or start Phase 5J first.
- Diagnostic-only: No. RR-065 was reproduced and fixed.
- Stop condition hit: Yes, adjacent only. The single live proof exposed an out-of-scope RR-007 category-page recurrence; no eligibility fix was attempted.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-065 changed from Open to Fixed. RR-007 changed from Fixed to Needs Investigation. RR-041/RR-042 remain Needs Investigation. RR-063/RR-064 remain Fixed.
- Docs committed: Yes.
- Implementation commit: `04f2933`.
- Documentation commit: `9aeef02`.
- Verification: fail-first 74/75; focused identity 90/90; broad named safety 340/340; ranking baseline stable; typecheck passed; lint 0 errors with 3 existing warnings; full suite 744/744; eval clean.
- Live validation: exactly one `shop vac` call. RIDGID HD1400 safely attached exact source-derived price/rating/review/citation evidence. No wrong-brand source-upgrade merge appeared. Bosch `/ocs-c/` collection exact #3 reopened RR-007.
- Scope: No trigger/fallback, ranking, discovery, eligibility, price, product-type, requirement, final-selection, or UI behavior changed. Phase 5I and Phase 5J were not started.

Stop. Address RR-007 only after explicit instruction; preserve RR-065 provenance-aware identity.

### RR-007 opaque collection-page cleanup completion record

- Completed step: Narrow RR-007 root-cause eligibility cleanup for opaque manufacturer collection routes.
- Next step: Phase 5I RR-041/RR-042 trigger/fallback reliability retry, only after explicit instruction. Phase 5J remains unstarted.
- Diagnostic-only: No. The exact Bosch failure was reproduced, and shared product-page classification behavior changed.
- Stop condition hit: No. The fix strengthened a shared negative eligibility gate without weakening trust or entering another phase.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-007 changed from Needs Investigation to Fixed. RR-008, RR-063, RR-064, and RR-065 remain Fixed. RR-041/RR-042 remain Needs Investigation.
- Docs committed: Yes.
- Implementation commit: `6346087`.
- Documentation commit: `f002533`.
- Verification: fail-first 59/61 with only two intended failures; focused final 61/61; broad named safety 308/308; typecheck passed; lint 0 errors with 3 existing warnings; full suite 747/747; eval clean.
- Fixture proof: current-code reassessment changes the frozen Bosch `/ocs-c/` record from `buyable_product` to `listing_or_search`.
- Live validation: exactly one `shop vac` call. Three exact and four near products remained, all with specific product-detail primary URLs; no collection/category/brand/family/listing route appeared. Source upgrade did not fire.
- Scope: RR-041/RR-042 were not retried or fixed. Phase 5I and Phase 5J were not started. No ranking, discovery, source-upgrade, identity, price, product-type, requirement, final-selection, or UI behavior changed.

Stop. Do not retry Phase 5I or start Phase 5J without explicit instruction.

### Phase 5I retry safety-stop record

- Completed step: Phase 5I retry diagnosis, fail-first proof, candidate implementation, deterministic verification, and one focused live safety check.
- Next step: Narrow Critical RR-066 source-upgrade same-brand/model-omission identity fix. Do not retry RR-041/RR-042 or start Phase 5J first.
- Diagnostic-only: Final repository outcome is diagnostic/docs-only. The candidate trigger, fallback, trace, replay, API, and test changes were fully rolled back.
- Stop condition hit: Yes. A RIDGID WD4522 target rejected an exact-model candidate whose provider title omitted RIDGID, then accepted a different 10-gallon RIDGID vacuum carrying the brand/type but no WD4522 model and attached price, rating, review count, and citation.
- New issue IDs opened: RR-066, Critical/Open.
- Existing issue IDs updated: RR-041 and RR-042 remain Needs Investigation with new deterministic/live evidence. RR-007, RR-008, RR-063, RR-064, and RR-065 remain Fixed.
- Docs committed: Yes.
- Documentation commit: `e2894cf`.
- Candidate verification: fail-first 78/80; focused final 113/113; broad named safety 346/346; typecheck passed; lint 0 errors with 3 existing warnings; full candidate suite 751/751; eval clean.
- Restored-repository verification: typecheck passed; lint 0 errors with the same 3 warnings; full suite 747/747; eval clean.
- Live validation: exactly one `shop vac` call. Stanley SL18115 attached safely; Armor All VOM205P used the bounded fallback safely; RIDGID WD4522 exposed RR-066. No second live search or full baseline ran.
- Uncommitted artifacts: generated baselines and live fixtures, including the refreshed `shop-vac.json`, remain untracked and excluded from commits.

Stop. Fix RR-066 only after explicit instruction. Preserve the fail-first RR-041/RR-042 cases for a later Phase 5I retry; do not start Phase 5J.

### RR-066 model-qualified identity-safety completion record

- Completed step: Narrow RR-066 source-upgrade model-qualified identity-safety mini-phase.
- Next step: Phase 5I RR-041/RR-042 trigger/fallback reliability retry, only after explicit instruction. Phase 5J remains unstarted.
- Diagnostic-only: No. The exact live failure was reproduced deterministically and shared source-upgrade identity behavior was strengthened.
- Stop condition hit: No. The fix tightened model evidence requirements without weakening any trust gate or entering another phase.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-066 changed from Open to Fixed. RR-041/RR-042 remain Needs Investigation. RR-007, RR-008, RR-063, RR-064, and RR-065 remain Fixed.
- Docs committed: Yes.
- Implementation commit: `b3cfab7`.
- Documentation commit: `d00c0ba`.
- Verification: fail-first 80/84 with only four intended RR-066 failures; focused final 84/84; broad named safety 304/304; typecheck passed; lint 0 errors with 3 existing warnings; full suite 752/752; eval clean.
- Live validation: exactly one `shop vac` call. Nearby RIDGID HD09001/HD0919/HD1900 offers were rejected for HD0900; exact Armor All VOM205P evidence attached safely. WD4522 did not recur.
- Scope: No RR-041/RR-042 trigger/fallback change, Phase 5I retry, Phase 5J work, ranking, discovery, price, page eligibility, product type, requirements, final selection, citation retention, or UI change.
- Uncommitted artifacts: `.claude/`, generated baselines, and live fixtures including refreshed `shop-vac.json` remain untracked and excluded from commits.

Stop. Do not retry Phase 5I or start Phase 5J without explicit instruction.

### Phase 5I trigger/fallback reliability completion record

- Completed step: Phase 5I RR-041/RR-042 source-upgrade trigger and fallback reliability retry.
- Next step: Narrow RR-067 candidate-side horsepower-brand normalization, only after explicit instruction. Phase 5J remains unstarted.
- Diagnostic-only: No. The phase reproduced and fixed RR-041 and RR-042.
- Stop condition hit: No. The live run exposed a safe false-negative, not unsafe evidence, wrong-product attachment, page leakage, suspicious price, or ranking regression.
- New issue IDs opened: RR-067, Medium/Open.
- Existing issue IDs updated: RR-041 and RR-042 changed from Needs Investigation to Fixed. RR-007, RR-008, RR-063, RR-064, RR-065, and RR-066 remain Fixed.
- Docs committed: Yes.
- Implementation commit: `57f1a69`.
- Documentation commit: `2667824`.
- Verification: fail-first 110/121 with only 11 intended failures; focused final 121/121; focused source-quality 90/90; broad named safety 342/342; typecheck passed; lint 0 errors with 3 existing warnings; full suite 760/760; eval clean.
- Live validation: exactly one `shop vac` call. RIDGID WD1060 and DEWALT DXV09P attached exact evidence safely. HART VOC1212PW used the zero-primary fallback, attached nothing, and exposed RR-067 because provider metadata labeled horsepower `HP` as brand identity.
- Scope: No discovery, ranking, final-selection, price, page eligibility, product-type, requirement, product-evidence identity, source-upgrade model identity, citation-retention, or UI behavior changed. Phase 5J did not start.
- Uncommitted artifacts: `.claude/`, generated baselines, and live fixtures including refreshed `shop-vac.json` remain untracked and excluded from commits.

Stop. Fix RR-067 only after explicit instruction; do not start Phase 5J automatically.

### RR-067 brand/unit identity cleanup completion record

- Completed step: Narrow RR-067 candidate-side horsepower/HP brand disambiguation.
- Next step: Phase 5J asset quality and diagnostics for RR-061/RR-054 only, after explicit instruction.
- Diagnostic-only: No. The phase reproduced and fixed RR-067.
- Stop condition hit: No. Deterministic and live checks found no unsafe attachment, page leakage, suspicious price, or ranking regression.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-067 changed from Open to Fixed. RR-041, RR-042, RR-007, RR-008, RR-063, RR-064, RR-065, and RR-066 remain Fixed.
- Docs committed: Yes.
- Implementation commit: `025afcb`.
- Documentation commit: `44144c7`.
- Verification: fail-first 95/97 with only two intended failures; focused final 98/98; broad named safety 346/346; typecheck passed; lint 0 errors with 3 existing warnings; full suite 764/764; eval clean.
- Live validation: exactly one `shop vac` call. HART did not recur. Exact RIDGID WD3050 evidence with `3.5-Peak HP` attached safely; nearby WD3050A and unrelated products remained rejected. No second call or broad baseline ran.
- Scope: No Phase 5I trigger/fallback, discovery, ranking, final selection, price, eligibility, product type, requirements, source-upgrade model gate, citation retention, or UI behavior changed. Phase 5J did not start.
- Uncommitted artifacts: `.claude/`, generated baselines, and live fixtures including refreshed `shop-vac.json` remain untracked and excluded from commits.

Stop. Do not start Phase 5J without explicit instruction.

### Phase 5J asset quality and fallback diagnostics completion record

- Completed step: Phase 5J for RR-061 and RR-054 only.
- Next step: Narrow RR-068 product-type diagnosis/fix before Phase 6, only after explicit instruction.
- Diagnostic-only: No. RR-061 and RR-054 behavior was fixed after fail-first proof.
- Stop condition: Yes, during the one approved `shop vac` live check. Four Bissell CrossWave household floor cleaners appeared as exact shop-vac results. Taylor approved documenting this as separate RR-068 and completing Phase 5J without fixing it.
- New issue IDs opened: RR-068, High/Open.
- Existing issue IDs updated: RR-054 and RR-061 changed from Open to Fixed. RR-041/RR-042 and RR-007/RR-008/RR-063 through RR-067 remain Fixed.
- Implementation: image candidates require safe asset shape plus source-derived same-product context; fallback responses expose the stages they actually ran only in debug mode. Normal recommendation content is unchanged.
- Verification: fail-first 35/41 with six intended failures; focused final 174/174; broad safety 417/417; typecheck passed; lint 0 errors and 3 existing warnings; full suite 772/772; eval clean.
- Live validation: exactly one `shop vac` call. Seven final image URLs returned image bodies with no page/logo/category/support asset. The normal path ran, so RR-054 live fallback behavior remains deterministic-only.
- Scope: No discovery, product-type, requirement, ranking, final-selection, price, citation, source-upgrade trigger/fallback, source-upgrade identity, general page eligibility, or UI behavior changed. RR-068 was not fixed. Phase 6 was not started.
- Docs updated: Yes; all required Phase 5 documents were updated.
- Implementation commit: `708ee98`.
- Documentation commit: `49c9711`.

Stop. Do not start Phase 6. Address RR-068 only after explicit instruction, then complete Phase 5 closeout.

### RR-068 product-type safety completion record

- Completed step: Narrow RR-068 shop-vac versus household floor-cleaner product-type fix.
- Next step: Phase 5 closeout/remeasurement only after explicit instruction. Do not start Phase 6.
- Diagnostic-only: No. The phase reproduced and fixed RR-068.
- Stop condition: No confirmed stop condition. The live result was thin, but direct current-code checks classify every dropped valid utility-vac title as exact; the new rule did not overblock them.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-068 changed from Open to Fixed. RR-054/RR-061 and RR-007/RR-008/RR-041/RR-042/RR-063 through RR-067 remain Fixed.
- Implementation: shared household-floor-cleaner and shop-vac intent classes; strong household subtype identity vetoes shop-vac exact eligibility; source-derived discovery evidence excludes retailer labels and query-derived snippets.
- Verification: fail-first 118/124 with six intended failures; focused final 125/125; broad safety 455/455; typecheck passed; lint 0 errors and 3 existing warnings; full suite 781/781; eval clean.
- Fixture proof: all four saved CrossWave cards are removed from exact/near; RIDGID HD0900 and two Vacmaster utility vacs remain exact.
- Live validation: exactly one `shop vac` call. Two exact and one near conventional Armor All utility wet/dry vac remained; no household floor cleaner appeared. Exact AA255W evidence attached safely.
- Scope: No ranking, final selection, source-upgrade trigger/fallback or identity, price, image, general page eligibility, citation policy, or UI behavior changed. Phase 6 was not started.
- Docs updated: Yes; all required tracking documents were updated.
- Implementation commit: `cc2da0a`.
- Documentation commit: `12402b3`.

Stop. Do not start Phase 6. Run Phase 5 closeout only after explicit instruction.

### Phase 5 closeout and remeasurement completion record

- Completed step: Phase 5 closeout, deterministic remeasurement, saved-fixture reassessment, issue-register audit, and readiness documentation.
- Next step: Phase 6A planning/readiness only after explicit instruction. Do not execute the reliability gauntlet yet.
- Diagnostic-only: Yes. No production code or app behavior changed.
- Stop condition hit: No. All deterministic checks passed, no fixed issue regressed, and no new blocker was found.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes. RR-014, RR-015, RR-037, and RR-045 intentionally remain Needs Investigation; all other Phase 5 protections remain Fixed.
- Issue totals: 68 total; 9 Critical, 29 High, 25 Medium, 5 Low; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.
- Verification: focused high-risk matrix 448/448 across 39 suites; typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781 across 117 suites; eval reported no red flags.
- Fixture proof: current `shop vac` replay has no household floor cleaner; historical dog-food identity conflict is removed by current-code reassessment; older fixture traces remain archival where later fields are absent.
- Live validation: None. No API calls or broad baseline ran.
- Scope: Documentation and verification only. No ranking, discovery, source-upgrade, identity, price, eligibility, image, product-type, final-selection, UI, or API behavior changed.
- Uncommitted artifacts: `.claude/`, two generated baseline files, and 22 live fixtures remain untracked and excluded from the closeout commit.
- Docs committed: Yes.
- Documentation commit: `50cc047`.

Stop. Phase 5 is closed. Do not start Phase 6 without explicit instruction.

### Phase 6A reliability instrument completion record

- Completed step: Phase 6A documentation/template instrument only.
- Next step: Phase 6B regression wall only, after explicit instruction. Do not start Phase 6C, 6D, rubric freeze, baseline, dossier analysis, or fixes.
- Diagnostic-only: Yes. No production behavior, app code, app test, pipeline, or executable script changed.
- Stop condition hit: No. No live search ran, no code diff appeared, and no later phase started.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes. RR-014, RR-015, RR-037, and RR-045 remain Needs Investigation.
- Issue totals: 68 total; 9 Critical, 29 High, 25 Medium, 5 Low; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.
- Instrument: `phase-6-scorecard-template.md` contains rubric v0.1-draft, binary safety, separate process gates, quality deductions, evidence modes, ranking anchors, report templates, JSON Schema, worked examples, and approval-only trace/automation proposals. `phase-6-live-search-batches.md` contains B1–B7, fixed core-10, rotation, 2×3 variance pilot, fixture policy, and a zeroed budget ledger.
- Inventory: 64 `tests/*.test.mjs` files, 22 saved live fixtures, and all eight plan-named measurement scripts verified.
- Fixture validation: `shop-vac.json` scored 65/C from M3 replay output with incomplete evidence. Historical `gas-grill.json` scored 69 quality/F final because an exact card was a camping stove. Neither example is an M2 current-code claim.
- Verification: typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781 across 117 suites; eval reported no red flags.
- Live validation: None. Budget used 0.
- Scope: Documentation/templates only. No fixes and no Phase 6B work.

Stop. Do not start Phase 6B without explicit instruction.

### Phase 6 master-plan source-of-truth promotion record

- Completed step: Promoted the reconciled desktop Phase 6 master into `docs/phase-6-reliability-gauntlet-plan.md`, replacing the shorter predecessor at the same canonical path.
- Next step: Phase 6B regression wall only after explicit instruction.
- Diagnostic-only: Yes. Documentation governance only.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes.
- Authority: The canonical plan is the sole Phase 6 program source of truth. Scorecard, batch, wall, audit, benchmark, report, QA, and handoff docs cannot override it.
- Verification: Repo and desktop master copies were byte-identical at promotion; all tracked changes are markdown only.
- Live validation: None. Budget used 0.
- Docs committed: Yes.
- Documentation commit: `4d0c3c9`.

Stop. Do not start Phase 6B without explicit instruction.

### Phase 6A master-plan reconciliation completion record

- Completed step: Docs-only reconciliation of committed Phase 6A with the merged Phase 6 master plan.
- Next step: Phase 6B regression wall only after explicit instruction.
- Diagnostic-only: Yes. No app code, tests, scripts, fixtures, behavior, or live calls changed.
- Stop condition hit: No.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes.
- Policies reconciled: absolute zero-tolerance safety; distinct `NotApplicable` and missing `NotScored`; canonical v0.1 deduction formula; leader target frozen after 6D and before 6E.
- Preserved: both historical scorecards, all batches/budgets, fixture policy, proposed automation, and Phase 6A verification.
- Verification: typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781 across 117 suites; eval reported no red flags.
- Live validation: None. Budget used 0.
- Docs committed: Yes.
- Documentation commit: `d1ff4c1`.

Stop. Do not start Phase 6B without explicit instruction.

### Phase 6B regression wall completion record

- Completed step: Indexed RR-007 through RR-068 and closed only direct deterministic test gaps.
- Next step: Phase 6C patch audit only after explicit instruction.
- Diagnostic-only: Yes. Tests and documentation only; no production behavior changed.
- Stop condition hit: No. No production behavior gap, trust-gate regression, or later fix-phase blocker was found.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes. RR-014/RR-015 remain measurement-only; RR-037/RR-045 remain provider-variance-bound.
- Issue totals: 68 total; 9 Critical, 29 High, 25 Medium, 5 Low; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.
- Regression wall: 62 issues; 57 Fixed, 4 Needs Investigation, 1 Won't Fix.
- Gaps closed: RR-012 availability-label regression and RR-025 near-match funnel regression.
- Verification: focused additions 22/22; typecheck passed; lint 0 errors with 3 existing warnings; full suite 782/782 across 117 suites; eval reported no red flags.
- Live validation: None. Budget used 0.
- Scope: No app/API/UI behavior, production code, script, fixture, generated baseline, ranking, discovery, identity, price, citation, eligibility, source-upgrade, requirement, or final-selection change.
- Docs committed: Yes.
- Phase 6B commit: `e2f3cf3`.

Stop. Do not start Phase 6C without explicit instruction.

### Phase 6C product-specific patch audit completion record

- Completed step: Static audit of all tracked production TypeScript/JavaScript files for product-shaped production logic.
- Next step: Phase 6D variance pilot only after explicit approval of six live searches and the estimated ~280 Serper-call budget.
- Classification: Diagnostic/static audit; documentation only.
- Measurement rung: M1 deterministic source audit.
- Stop condition hit: No. No must-generalize blocker or Critical safety issue was found.
- New issue IDs opened: None.
- Existing issue IDs updated: No status changes.
- Issue totals: 68 total; 9 Critical, 29 High, 25 Medium, 5 Low; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.
- Audit result: 5 acceptable generalized-data groups, 4 acceptable source/category-rule groups, 1 suspicious but non-behavioral group, 0 must-generalize blockers.
- Live budget spent: 0 searches / 0 Serper calls.
- Fixtures created or reassessed: None.
- Verification: typecheck passed; lint 0 errors with 3 existing warnings; full suite 782/782 across 117 suites; eval reported no red flags.
- Scope: No production code, tests, scripts, fixtures, baselines, app/API/UI behavior, ranking, discovery, identity, price, citation, eligibility, source-upgrade, product-type, requirement, or final-selection change.
- Docs committed: Yes.
- Phase 6C commit: `388f955`.

Stop. Do not start Phase 6D without explicit instruction and live-budget approval.

### Phase 6D variance pilot safety-stop record

- Completed step: Partial Phase 6D variance pilot; four of six approved searches executed.
- Next step: Narrow fail-first RR-069 identity-safety fix only, after explicit instruction. Do not resume Phase 6D or start Phase 6E automatically.
- Classification: M4 diagnostic/measurement only, plus one approved measurement-harness extension.
- Stop condition hit: Yes. Constrained run B2 attached generic Q10-series evidence to a specific Roborock Q10 X5+ target.
- New issue IDs opened: RR-069 (Critical, Open).
- Existing issue IDs updated: RR-015 and RR-037 received partial pilot evidence and remain Needs Investigation.
- Issue totals: 69 total; 10 Critical, 29 High, 25 Medium, 5 Low; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 1 Open.
- Live budget spent: 4 of 6 approved searches; 150 observed Serper calls. A3/B3 were not spent after the stop.
- Partial variance: shop-vac pool/final Jaccard `0.1429/0.0000`; constrained pool/final Jaccard `0.0000/0.0000`.
- RR-037: RIDGID appeared in both completed shop-vac pools, but varied from one pool candidate removed at requirements to five pool candidates with three reaching final exact/near.
- Attribution: mixed provider and model/plan variance; current traces cannot allocate causal percentages. Relevant OpenAI calls do not explicitly pin temperature or seed.
- Fixtures: four new Tier A pilot fixtures preserved untracked; historical anchor paths restored.
- Freeze state: No market-leader method/snapshots were compiled, no freeze proposal was approved, rubric remains `v0.1-draft`, and Phase 6E is blocked.
- Production behavior: Unchanged. Only `scripts/qualityConsistencyHarness.mjs` gained the approved offline fixture-analysis mode.
- Docs committed: Yes.
- Phase 6D stop commit: `80461e8`.

Stop. Fix RR-069 deterministically before any further live measurement.

### RR-069 source-upgrade identity safety completion record

- Completed step: Narrow RR-069 behavior fix only.
- Next step: Phase 6D remains paused. Await explicit approval to spend A3/B3 or restart the pilot; do not start Phase 6E.
- Classification: Behavior/safety fix with M1 deterministic proof; zero live calls.
- Stop condition hit: No new stop condition. The existing Phase 6D stop remains in force administratively until explicit resumption approval.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-069 moved from Open to Fixed. RR-014, RR-015, RR-037, and RR-045 remain Needs Investigation.
- Issue totals: 69 total; 10 Critical, 29 High, 25 Medium, 5 Low; 64 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.
- Root cause: Generic Q10 evidence satisfied a brand-qualified family path because the target's X5+ distinguishing suffix was not required and RR-066's strong-model branch did not apply.
- Fix: Attachment identity now requires a distinguishing submodel across normalized base/suffix, compact, kit-number, and multiple-model shapes before strong or family acceptance.
- Verification: fail-first 97/100; focused final 100/100; broad safety 439/439; full suite 786/786; typecheck/eval pass; lint 0 errors with 3 existing warnings.
- Fixture/live proof: Phase 6D B2 fixture replay remains historical M4 evidence; current behavior is proven by M1 tests. Live calls: 0.
- Phase state: Phase 6D remains at 4/6 searches; rubric v1.0 is not frozen; Phase 6E did not start.
- Implementation committed: Yes, `1411901`.
- Docs committed: Yes, `fd1484d`.

Stop. Do not resume Phase 6D without explicit instruction and live-budget approval.

### Phase 6D clean post-RR-069 restart safety-stop record

- Completed step: Restart initialization plus one of six approved live searches.
- Next step: Narrow RR-061 image-safety regression phase only after explicit instruction. Do not resume Phase 6D or start Phase 6E.
- Diagnostic-only: Yes. One M4 fixture was captured and inspected; no app behavior changed.
- Stop condition hit: Yes. Two different Amazon product cards used the same generic `yoda/flyout_72dpi` navigation asset as High-confidence product imagery.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-061 moved from Fixed to Needs Investigation. RR-015, RR-037, RR-045, and RR-014 remain Needs Investigation; RR-069 remains Fixed.
- Live budget: Clean restart used 1/6 searches and 37 observed Serper calls. Five calls remain unspent and blocked. The earlier four-call sample remains aborted pre-fix evidence and is excluded.
- Fixture: `tests/fixtures/review-radar-live/phase-6d-restart-shop-vac.run1.json` is untracked Tier A evidence and must not be committed.
- Measurement result: No clean pairwise variance, rank correlation, significance threshold, or provider/model attribution can be computed from one run.
- Verification: typecheck passed; lint 0 errors/3 existing warnings; full suite 786/786; offline eval no red flags. The variance harness requires at least two fixtures and declined the one-run sample.
- Phase state: Rubric v1.0 is not frozen; leader snapshots were not compiled; Phase 6E did not start.
- Docs committed: Yes.
- Phase 6D restart stop commit: `29e02f2`.

Stop. Do not fix RR-061, resume Phase 6D, or start Phase 6E without explicit instruction.

### Reopened RR-061 image-safety completion record

- Completed step: Narrow reopened RR-061 behavior fix only.
- Next step: Human-review the deterministic fix, then require fresh explicit approval for a new clean six-call Phase 6D restart. Do not reuse the five calls from the stopped window.
- Diagnostic-only: No. One shared image-validation behavior fix followed fail-first proof.
- Stop condition hit: No new stop condition. The prior Phase 6D stop remains in force.
- New issue IDs opened: None.
- Existing issue IDs updated: RR-061 moved from Needs Investigation to Fixed. RR-014, RR-015, RR-037, and RR-045 remain Needs Investigation; RR-069 remains Fixed.
- Root cause: The shared resolver omitted flyout/menu/layout asset terms and allowed retailer/domain words plus the image hostname to satisfy image relevance.
- Fix: Reject generalized retailer site-artwork paths, remove source/domain words from product-image identity, and ignore image hosts during relevance matching.
- Positive controls: Same-product Amazon images, opaque hashed CDN images, Google Shopping thumbnails, and identity-safe source-upgrade images remain valid.
- Verification: fail-first 31/35 with four intended failures; focused 135/135; broad trust 376/376; full suite 791/791; typecheck/eval pass; lint 0 errors/3 existing warnings.
- Live proof: None. The saved A1 fixture is historical evidence; current behavior is proven by fixture-derived M1 tests.
- Phase state: Phase 6D was not resumed; rubric v1.0 is not frozen; Phase 6E did not start.
- Docs committed: Yes.
- RR-061 implementation commit: `a174551`.

Stop. Do not resume Phase 6D or start Phase 6E without explicit instruction.

### Fresh post-RR-061 Phase 6D restart safety-stop record

- Completed step: Two of six approved live searches, A1 then B1.
- Next step: Narrow RR-061 wrong-model image safety phase after explicit instruction. Keep RR-070 separately scoped unless explicitly combined.
- Diagnostic-only: Yes. No production code, tests, scripts, or behavior changed.
- Stop condition hit: Yes. B1 rendered Saros Z70 imagery on a Roborock Q5 Max+ card.
- New issue IDs opened: RR-070 (Medium, Needs Investigation) for unrelated `Bose` metadata contaminating an ILIFE A12 Pro source-upgrade query.
- Existing issue IDs updated: RR-061 moved from Fixed to Needs Investigation. RR-069 remains Fixed. RR-014/RR-015/RR-037/RR-045 remain Needs Investigation.
- Live budget: 2/6 searches and 75 observed Serper queries. Four calls remain unspent and blocked.
- Fixtures: two new untracked Tier A post-RR-061 fixtures. Never pool them with either earlier stopped sample.
- Measurement result: One run per query; all pairwise overlaps, rank correlation, stage-loss variation, significance, sample-size inference, and provider/model attribution are unavailable.
- Verification: typecheck passed; lint 0 errors/3 existing warnings; full suite 791/791; offline eval no red flags; offline harness produced empty pair arrays.
- Phase state: Rubric v1.0 is not frozen; leader snapshots were not compiled; Phase 6E did not start.
- Docs committed: Yes.
- Phase 6D safety-stop commit: `566a7bf`.

Stop. Do not fix RR-061/RR-070, resume Phase 6D, or start Phase 6E without explicit instruction.

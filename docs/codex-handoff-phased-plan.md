# ReviewRadar Full Phased Plan / Codex Handoff

Source: user-provided Codex attachment, saved for future sessions.

You are taking over ReviewRadar after several Claude phases. Continue from the current repo state, not from memory. Before coding, run `git status` and read the current markdown docs.

Repo path: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`

Important rule: do not make product-shaped fixes. Do not fix only Weber, Napoleon, RIDGID, Makita, robot vacuums, gas grills, or any one product/category. Every change should improve a shared mechanism and be proven across unrelated categories when practical.

Core loop: measure -> diagnose -> make one small shared fix -> test deterministically -> test live if needed -> document -> commit.

End goal: ReviewRadar should reliably return the 7 best / most popular / most trusted products for broad product searches, while still respecting hard constraints like budget, size, compatibility, product type, and dealbreakers.

---

## Current Status

Current phase: **Phase 4D - product-type leakage and requirement diagnostics**.

Phase 3N safely admitted specific Google Shopping offers for source-upgrade evidence and fixed the `Shop-Vac` title false positive. RR-051 removed synthetic query-derived snippets from same-product identity. Phase 3O preserved reliable brand identity in compact model queries.

The Phase 3O live proof then exposed two separate safety defects. RR-053 is now fixed deterministically: URL query strings and fragments cannot provide product identity, while merchant product paths and source-derived Shopping titles remain usable. RR-052 remains open because `Peak HP` horsepower wording is still detected as the Hewlett-Packard brand. Reopened RR-002 remains a separate price-trust investigation.

Recommended next phase:

- Phase 4D: run at most four focused live diagnostics (`robot vacuum`, `basketball hoop`, `air purifier`, `portable generator`) and document wrong types, accessories, variants, and requirement leakage without fixing anything.

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
- Phase 4D - Product-type leakage and requirement diagnostics - **NEXT**
- Phase 4E - Market-leader discovery and citation diagnostics - **TODO**
- Phase 4F - Broad rotating product quality sweep - **TODO**

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
- Docs committed: Pending this phase checkpoint.
- Commit: Pending.
- Result: RR-002 reproduced on a second product at `$10` verified/budget-usable/exact; no other fake-low or installment price was observed.

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

Run Phase 4D product-type leakage and requirement diagnostics.

Use at most four live searches: `robot vacuum`, `basketball hoop`, `air purifier`, and `portable generator`. Do not fix anything found.

Task:

1. Capture wrong product categories, accessories/parts, and variants.
2. Record exact/near status and any violated requirement.
3. Decide whether each item should have been rejected or downgraded.
4. Clarify RR-017/RR-043 and update RR-007/RR-008 if non-product pages recur.
5. Update and commit all six required documentation files, then continue automatically to Phase 4E.

Do not:

- change app code, tests, scoring, ranking, discovery, source-upgrade, identity, brand, price, citation, eligibility, requirement, or UI behavior;
- exceed four fresh live searches;
- close an issue because it is absent from a limited sample;
- commit generated live fixtures or baseline artifacts;
- run a full baseline.

Exit criteria: all four searches are documented, wrong-type/requirement outcomes are captured, issue evidence/status is updated conservatively, and the docs-only Phase 4D commit is complete.

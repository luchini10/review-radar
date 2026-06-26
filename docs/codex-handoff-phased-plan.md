# ReviewRadar Full Phased Plan / Codex Handoff

Source: user-provided Codex attachment, saved for future sessions.

You are taking over ReviewRadar after several Claude phases. Continue from the current repo state, not from memory. Before coding, run `git status` and read the current markdown docs.

Repo path: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`

Important rule: do not make product-shaped fixes. Do not fix only Weber, Napoleon, RIDGID, Makita, robot vacuums, gas grills, or any one product/category. Every change should improve a shared mechanism and be proven across unrelated categories when practical.

Core loop: measure -> diagnose -> make one small shared fix -> test deterministically -> test live if needed -> document -> commit.

End goal: ReviewRadar should reliably return the 7 best / most popular / most trusted products for broad product searches, while still respecting hard constraints like budget, size, compatibility, product type, and dealbreakers.

---

## Current Status

Current phase: **Phase 3J extension - live proof on previously trigger-producing categories**.

Phase 3I Path A is implemented and deterministic-testable, but still not live-proven. Phase 3J ran the requested `gas grill` and `cordless drill` live proof and saved fresh fixtures, but both searches produced `sourceUpgradeTraces: []`, so the new source-upgrade query builder was not exercised live.

Do not broaden model-token detection yet. Do not tune scoring. Do not loosen identity, price, citation, product, or requirement gates. The next phase should be another focused live proof on categories that previously produced source-upgrade attempts, not a behavior change.

Recommended next phase:

- Phase 3J extension: save and replay fresh debug fixtures for `robot vacuum` and `shop vac`; inspect source-upgrade traces to see whether candidates now return and whether evidence attaches safely. Stop after those fixtures. Do not run a full baseline.

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

### Phase 3J extension - Live proof on previously trigger-producing categories - TODO / NEXT

Purpose: observe at least one live source-upgrade attempt using the Phase 3I query builder before making another behavior change.

Run:

- `robot vacuum`
- `shop vac`

Measure attempts, candidates returned, identity matches, evidence attached, score movement in finalSelectionTrace, final 7 movement, and unsafe merge count.

Exit criteria:

- At least one source-upgrade attempt fires and records the Phase 3I shortened query, or the run proves that current live fixtures no longer produce eligible targets.
- If candidates return, identity/attachment/safety are inspected.
- No unsafe merges.
- Debug traces clearly explain what happened.

### Phase 3K - Model-token detection broadening - TODO

Only do after source-upgrade query/identity behavior is proven, or after a focused eligibility diagnostic proves that model-token detection is now the source-upgrade blocker.

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

### Phase 3L - Source-quality upgrade final validation - TODO

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

## Larger Product-Quality Phases After Source-Upgrade Track

### Phase 4 - Discovery coverage / market-leader recall - TODO

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

Run the Phase 3J extension.

Phase 3I Path A is implemented but not live-proven. Phase 3J ran `gas grill` and `cordless drill`, but both fresh fixtures had `sourceUpgradeTraces: []`. Do not make another behavior change before trying previously trigger-producing categories.

Task:

1. Save fresh debug fixtures for `robot vacuum` and `shop vac`.
2. Replay both fixtures.
3. Inspect `sourceUpgradeTraces`, `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, `candidateSample`, `evidenceAttached`, `attachedFields`, and `finalSelectionTrace`.
4. Determine whether the shorter source-upgrade queries now return candidates.
5. If candidates return, verify identity, attachable fields, safety, and natural score/rank impact.

Do not:

- hardcode Nexgrill, Napoleon, Weber, Makita, drills, or grills;
- broaden model-token detection in this phase;
- loosen trust gates to improve attachment rate;
- change source-upgrade query construction again before observing live Phase 3J traces;
- run a full baseline.

Exit criteria: focused live traces show whether Phase 3I improved candidate return/attachment, or prove no eligible source-upgrade targets appear in these previously trigger-producing categories. Record the result in the QA log.

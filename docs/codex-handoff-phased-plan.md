# ReviewRadar Full Phased Plan / Codex Handoff

Source: user-provided Codex attachment, saved for future sessions.

You are taking over ReviewRadar after several Claude phases. Continue from the current repo state, not from memory. Before coding, run `git status` and read the current markdown docs.

Repo path: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`

Important rule: do not make product-shaped fixes. Do not fix only Weber, Napoleon, RIDGID, Makita, robot vacuums, gas grills, or any one product/category. Every change should improve a shared mechanism and be proven across unrelated categories when practical.

Core loop: measure -> diagnose -> make one small shared fix -> test deterministically -> test live if needed -> document -> commit.

End goal: ReviewRadar should reliably return the 7 best / most popular / most trusted products for broad product searches, while still respecting hard constraints like budget, size, compatibility, product type, and dealbreakers.

---

## Current Status

Current phase: **Phase 3H - live diagnostic with new Phase 3G trace fields**.

Do not code first. The next step is to run a tiny live diagnostic using the new `SourceUpgradeTrace` fields added in Phase 3G.

Key question: when source-quality upgrade attempts fail, is it because:

1. Serper returned zero shopping results,
2. Serper returned candidates but identity matching rejected them,
3. candidates matched but had no attachable fields,
4. or unsafe candidates were correctly rejected?

Run focused live diagnostics first on:

1. `cordless drill`
2. `gas grill`

Inspect:

- `sourceUpgradeTraces`
- `candidatesReturned`
- `candidatesEvaluated`
- `noMatchReason`
- `candidateSample`
- `finalSelectionTrace`

Do not change code until this diagnostic proves the bottleneck.

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

### Phase 3H - Live diagnostic using Phase 3G fields - CURRENT / NEXT

Purpose: use the new diagnostics to identify the real source-upgrade bottleneck.

Do not change code yet.

Run:

1. `cordless drill`
2. `gas grill`

Why:

- Cordless drill had 2 source-upgrade attempts in Phase 3F.
- Gas grill had the Napoleon Rogue XT attempt.
- These should quickly reveal whether search returns no candidates or identity matching rejects them.

Inspect:

- `sourceUpgradeTraces`
- `candidatesReturned`
- `candidatesEvaluated`
- `noMatchReason`
- `candidateSample`
- `finalSelectionTrace`

Decision rules:

- If `candidatesReturned = 0`, next behavior phase is likely query construction.
- If `candidatesReturned > 0` and `candidatesEvaluated = 0`, next behavior phase is likely same-product identity matching.
- If `candidatesEvaluated > 0` but `evidenceAttached = false`, next behavior phase is likely attachable-field extraction.
- If unsafe candidates appear, fix safety before increasing attachment rate.
- If evidence attaches safely, measure score/final-selection impact.

Exit criteria:

- A clear bottleneck is identified.
- No code changes made.
- QA log updated with diagnostic result.
- Codex recommends the next smallest behavior phase based on trace data.

---

## Remaining Planned Phases

### Phase 3I - Fix proven source-upgrade bottleneck - TODO

Only do after Phase 3H proves the bottleneck.

Possible paths:

- Path A, query construction fix: use if Phase 3H shows `candidatesReturned = 0`. Shorten source-upgrade rescue query, remove redundant category suffix, prefer brand + model or brand + model + product noun. Avoid overlong queries like `"Napoleon Rogue XT 425 SIB Gas Grill gas grill"`. Do not hardcode brands or categories.
- Path B, identity matching fix: use if Phase 3H shows `candidatesReturned > 0` but `identityMatch = false`. Improve same-product matching, safer partial model-token matching, and brand/model normalization without merging accessories, bundles, parts, or wrong variants.
- Path C, attachable fields fix: use if identity matches but no evidence attaches. Improve extraction/merging of price/rating/review/citation fields from shopping result while keeping price trust strict.

Exit criteria:

- Deterministic tests prove the specific bottleneck is fixed.
- Negative safety tests still pass.
- No scoring/ranking weight changes.
- Live re-test proves improvement.

### Phase 3J - Live proof after source-upgrade bottleneck fix - TODO

Purpose: after Phase 3I behavior fix, rerun live searches to prove source upgrade attaches safe evidence.

Run:

- `cordless drill`
- `gas grill`
- optionally `robot vacuum`
- optionally `shop vac`

Measure attempts, candidates returned, identity matches, evidence attached, score movement in finalSelectionTrace, final 7 movement, and unsafe merge count.

Exit criteria:

- Evidence attaches safely in at least one real category.
- No unsafe merges.
- Debug traces clearly explain what happened.

### Phase 3K - Model-token detection broadening - TODO

Only do after source-upgrade query/identity behavior is proven.

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

Run Phase 3H.

Do not code first.

Task: run focused live diagnostics for:

1. `cordless drill`
2. `gas grill`

Inspect:

- `sourceUpgradeTraces`
- `candidatesReturned`
- `candidatesEvaluated`
- `noMatchReason`
- `candidateSample`
- `finalSelectionTrace`

Then report:

1. Did source upgrade attempt?
2. Did Serper return candidates?
3. Did identity matching reject them?
4. Did any candidates match but lack attachable fields?
5. Was any unsafe candidate close to being merged?
6. What is the next smallest behavior fix?

Only after that should Codex propose Phase 3I.

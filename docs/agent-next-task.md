# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3L - live proof after source-upgrade fallback ladder**

Phase 3K is implemented and deterministic-testable, but not live-proven. It kept the compact Phase 3I query as the primary source-upgrade search and added one fallback search with category/product-noun context only when the primary returns zero candidates.

The deterministic source-upgrade query builder now produces cleaner queries:

- `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` -> `4-Burner Propane Gas Grill`
- `Napoleon Rogue XT 425 SIB Gas Grill` -> `Napoleon Rogue XT 425 SIB`
- `Makita XFD131 18V LXT Cordless Drill` -> `Makita XFD131`
- `Tapo RV30C Plus Robot Vacuum` -> `Tapo RV30C Plus`

## Required next phase

Run a focused live proof. Do not run a full baseline.

Live searches:

1. `shop vac`
2. one unrelated previously attempted category, preferably `robot vacuum` or `gas grill`

Inspect:

- `sourceUpgradeTraces`
- `primaryQuery`
- `fallbackQuery`
- `fallbackUsed`
- `primaryCandidatesReturned`
- `fallbackCandidatesReturned`
- total `candidatesReturned`
- `candidatesEvaluated`
- `noMatchReason`
- `candidateSample`
- `evidenceAttached`
- `attachedFields`
- `finalSelectionTrace`

Answer:

1. Did fallback run in a fresh live source-upgrade attempt?
2. Did fallback increase `candidatesReturned` above zero?
3. If candidates returned, did identity matching accept or reject them?
4. Did evidence attach safely?
5. Did final-selection trace show natural score/rank impact?
6. Did any unsafe candidate appear close to merging?

Do not:

- change scoring, ranking, discovery breadth, source-upgrade trigger logic, identity matching, model-token detection, price trust, citation trust, product trust, or requirement filtering;
- hardcode brands, products, or categories;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3K entry

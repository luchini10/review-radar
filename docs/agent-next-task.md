# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3J - focused live proof after source-upgrade query construction fix**

Phase 3I Path A is implemented but not live-proven.

The deterministic source-upgrade query builder now produces cleaner queries:

- `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` -> `4-Burner Propane Gas Grill`
- `Napoleon Rogue XT 425 SIB Gas Grill` -> `Napoleon Rogue XT 425 SIB`
- `Makita XFD131 18V LXT Cordless Drill` -> `Makita XFD131`
- `Tapo RV30C Plus Robot Vacuum` -> `Tapo RV30C Plus`

## Required next phase

Run focused live proof only after deterministic checks are green.

Live searches:

1. `gas grill`
2. `cordless drill`

Inspect:

- `sourceUpgradeTraces`
- `candidatesReturned`
- `candidatesEvaluated`
- `noMatchReason`
- `candidateSample`
- `evidenceAttached`
- `attachedFields`
- `finalSelectionTrace`

Answer:

1. Did source-upgrade attempts now return candidates?
2. Did identity matching accept or reject returned candidates?
3. Did evidence attach safely?
4. Did any unsafe candidate appear close to merging?
5. Did final-selection trace show natural score/rank impact?

Do not:

- change scoring, ranking, discovery breadth, source-upgrade trigger logic, identity matching, model-token detection, price trust, citation trust, product trust, or requirement filtering;
- hardcode brands, products, or categories;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3I entry

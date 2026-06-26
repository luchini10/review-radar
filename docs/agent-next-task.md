# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3K - source-upgrade search-coverage fallback**

Phase 3I Path A is implemented and partially live-proven. Phase 3J ran the requested `gas grill` and `cordless drill` live proof, but both fresh fixtures had `sourceUpgradeTraces: []`. The Phase 3J extension then ran `robot vacuum` and `shop vac`; `shop vac` produced two source-upgrade attempts using shortened Phase 3I queries, but both returned zero shopping candidates.

The deterministic source-upgrade query builder now produces cleaner queries:

- `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` -> `4-Burner Propane Gas Grill`
- `Napoleon Rogue XT 425 SIB Gas Grill` -> `Napoleon Rogue XT 425 SIB`
- `Makita XFD131 18V LXT Cordless Drill` -> `Makita XFD131`
- `Tapo RV30C Plus Robot Vacuum` -> `Tapo RV30C Plus`

## Required next phase

Run a focused behavior change with deterministic tests. Do not run live searches before deterministic tests pass.

Behavior scope:

1. Keep the compact Phase 3I source-upgrade query as the first attempt.
2. If that source-upgrade shopping search returns zero candidates, retry with a minimally broader query that appends the base category/product noun.
3. Preserve existing identity matching and merge safety.

Tests should prove:

- fallback runs only after zero candidates;
- no fallback runs when primary candidates return;
- the trace/debug output makes the primary/fallback path visible;
- wrong products, accessories, parts, bundles, and wrong variants remain blocked by identity matching.

Answer:

1. Is compact model identity still the first query?
2. Does the fallback run only after zero shopping candidates?
3. Does the fallback preserve identity safety?
4. Does the trace show enough detail for a later live proof?

Do not:

- change scoring, ranking, discovery breadth, source-upgrade trigger logic, identity matching, model-token detection, price trust, citation trust, product trust, or requirement filtering;
- hardcode brands, products, or categories;
- run live searches before deterministic tests pass;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3J extension entry

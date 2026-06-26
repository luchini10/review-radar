# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3I Path A - source-upgrade query construction fix**

Phase 3H is complete. The fresh Phase 3G-trace diagnostic showed:

- `cordless drill`: no source-upgrade attempt qualified in this live run.
- `gas grill`: one source-upgrade attempt ran for `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid`.
- Gas-grill source-upgrade query: `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill`.
- Gas-grill source-upgrade result: `candidatesReturned: 0`, `candidatesEvaluated: 0`, `noMatchReason: shopping_results_empty`, `candidateSample: []`, `evidenceAttached: false`.

## Required next behavior phase

Make the smallest generalized query-construction fix for source-quality upgrade.

Do:

1. Add or adjust a source-upgrade-specific shopping query builder.
2. Prefer product identity over long display titles.
3. Remove redundant category suffixes when the product name already contains the category/product noun.
4. Keep the existing same-product identity gate unchanged.
5. Add deterministic tests for shorter/non-duplicative source-upgrade queries.
6. Add negative tests so generic names, accessories, parts, bundles, and wrong variants are not made easier to merge.
7. After deterministic checks pass, re-run focused live diagnostics for `gas grill` and `cordless drill`.

Do not:

- change scoring, ranking, discovery breadth, source-upgrade trigger logic, identity matching, model-token detection, price trust, citation trust, product trust, or requirement filtering;
- hardcode Nexgrill, Napoleon, Weber, Makita, drills, or grills;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3H entry

# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3M - source-upgrade shopping-provider coverage diagnostic**

Phase 3L partially proved Phase 3K live. For `shop vac`, source upgrade attempted `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`:

- primary `Wet/Dry Vacuum DXV10SB`: 0 candidates
- fallback `Wet/Dry Vacuum DXV10SB shop vac`: 0 candidates
- `fallbackUsed: true`
- `candidatesEvaluated: 0`
- `noMatchReason: shopping_results_empty`
- `evidenceAttached: false`

This proves the fallback is live-wired and correctly gated, but it did not improve shopping coverage in this sample. Identity matching and evidence attachment were not reached.

## Required next phase

Run a focused diagnostic. Do not change behavior or run a full baseline.

Diagnose the exact Phase 3L query path:

1. Confirm whether the upstream Serper shopping response contains zero results for the primary and fallback queries.
2. Confirm whether shopping results are lost during parsing or candidate normalization.
3. Confirm the category and invocation context passed to the search wrapper.
4. Identify the smallest next fix only after the zero-result layer is proven.

Inspect:

- the raw shopping response count
- parsed shopping result count
- normalized candidate count
- search query and category arguments
- errors or response-shape differences hidden by the current zero-candidate result

Answer:

1. Does the upstream provider return zero results?
2. If not, where are returned shopping results discarded?
3. Is the source-upgrade invocation context different from ordinary shopping discovery?
4. What is the smallest safe next phase?

Do not:

- change query construction, fallback behavior, parsing, identity matching, extraction, scoring, ranking, discovery, source-upgrade trigger logic, model-token detection, or trust gates during this diagnostic;
- hardcode brands, products, or categories;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3L entry

# Agent Next Task

Generated: 2026-06-27

## Current next task

**Phase 4E: market-leader discovery and citation diagnostics**

Phase 4D completed four live diagnostics:

- `robot vacuum`: GE washer/dryer survived in final near results.
- `basketball hoop`: wall art entered exact scoring below cutoff.
- `air purifier`: category/documentation pages selected; current fallback response omitted stage/final/source-upgrade traces.
- `portable generator`: category pages and a battery power station selected; valid Generac product falsely failed literal `Portable`.

Opened RR-054 for missing fallback diagnostics and RR-055 for the false literal requirement failure. Reopened RR-009. RR-007, RR-013, RR-017, and RR-043 received additional evidence.

## Required next phase

Run Phase 4E market-leader discovery and citation diagnostics with at most five fresh searches: `robot vacuum`, `gas grill`, `cordless drill`, `air purifier`, and `running shoes`.

Capture the final seven, obvious missing leaders, duplicates/variants, citation strength/diversity, retailer-only winners, and weak products outranking stronger candidates. Focus on RR-013, RR-014, RR-015, and RR-037 while preserving any product-type/non-product evidence. Do not fix anything.

Do not:

- change app code, tests, scoring, ranking, discovery, source-upgrade, identity, brand, trust, eligibility, or UI behavior;
- exceed five fresh live searches;
- close an issue merely because it is absent from this sample;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 4D entry

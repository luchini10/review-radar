# Agent Next Task

Generated: 2026-06-27

## Current next task

**Phase 4B: source-upgrade safety and reliability diagnostics**

Phase 4A completed the issue-harvest setup. All 53 issue records are unique and structurally complete, summary totals reconcile, and related records were grouped without merging distinct failure layers.

## Required next phase

Run limited live diagnostics for `shop vac`, `robot vacuum`, and `gas grill`. Capture source-upgrade trigger counts, attempted products, primary/fallback queries, raw/structural/eligible/returned counts, rejection reasons, candidate samples, identity outcomes, attachment outcomes, and any unsafe evidence.

Use the results to clarify RR-041, RR-042, RR-045, and RR-052 and regression-check RR-047, RR-048, RR-049, RR-051, and RR-053. Do not fix any issue.

Do not:

- change app code, tests, scoring, ranking, discovery, source-upgrade, identity, brand, trust, eligibility, or UI behavior;
- exceed three fresh live searches;
- close an issue merely because it is absent from this sample;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 4A entry

# Agent Next Task

Generated: 2026-07-01

## Current next task

**Phase 5 closed - Phase 6 readiness planning requires explicit instruction**

Phase 5 closeout passed without behavior changes. The focused high-risk matrix passed 448/448, the full suite passed 781/781, typecheck and eval passed, and lint reported 0 errors with 3 existing warnings.

The canonical register contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

RR-014, RR-015, RR-037, and RR-045 intentionally remain Needs Investigation. They concern leader coverage, stability, or live provider variance and are not Phase 5 blockers.

Saved-fixture replay confirmed the current `shop vac` fixture has no household floor cleaner. Older fixtures remain historical snapshots and may omit later trace fields; current deterministic tests and current-code reassessment are authoritative for the completed safety fixes. No closeout live search ran.

## Required next task

Do not start automatically. Await a separate Phase 6A planning/readiness instruction.

The planning step should define the reliability gauntlet's fixed query set, budget, stop conditions, fixture policy, and success metrics before any live execution. It should reassess RR-014, RR-015, RR-037, and RR-045 from fresh evidence without assuming a status change.

Do not:

- start Phase 6 execution or create reliability-gauntlet artifacts without explicit approval;
- alter the completed RR-068, RR-061, or RR-054 behavior without a proven regression;
- change ranking, discovery breadth, final selection, price, citation, or source-upgrade behavior during closeout without a new scoped instruction;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run a live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5 closeout entry

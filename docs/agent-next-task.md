# Agent Next Task

Generated: 2026-07-01

## Current next task

**RR-068 fixed - Phase 5 closeout is next**

RR-068 is Fixed in implementation commit `cc2da0a`.

The shared product-type registry now separates conventional shop/utility wet-dry vacuums from household floor washers, vacuum mops, hard-floor cleaners, and carpet/spot/upholstery cleaners. Strong household subtype evidence overrides incidental `wet dry vacuum` wording for shop-vac intent.

Conventional utility vacs remain valid, and explicit `hard floor cleaner`, `vacuum mop`, `wet dry mop`, `floor washer`, and product-family searches remain valid. Discovery type evidence excludes retailer labels and query-derived fallback snippets.

The saved Phase 5J fixture reassessment removed all four CrossWave cards while retaining RIDGID and Vacmaster utility vacs. One fresh `shop vac` run returned two exact and one near product, all conventional Armor All utility wet/dry vacuums.

RR-054/RR-061 and RR-007/RR-008/RR-041/RR-042/RR-063 through RR-067 remain green. No ranking, final-selection, price, image, page-eligibility, source-upgrade, or UI behavior changed.

The canonical register now contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

## Required next task

Do not start automatically. The next task is Phase 5 closeout/remeasurement from the master Phase 5 plan.

Reassess RR-014, RR-015, RR-037, and RR-045 from fresh evidence before changing their statuses. Prefer no app-code changes unless closeout reveals a new deterministic bug.

Do not:

- start Phase 6 or create its reliability gauntlet;
- alter the completed RR-068, RR-061, or RR-054 behavior without a proven regression;
- change ranking, discovery breadth, final selection, price, citation, or source-upgrade behavior during closeout without a new scoped instruction;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-068 entry

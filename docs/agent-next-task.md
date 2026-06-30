# Agent Next Task

Generated: 2026-06-30

## Current next task

**RR-064 fixed - address reopened RR-007/RR-008 before Phase 5I**

RR-064 is Fixed. Source upgrade now rejects source-derived explicit series-number conflicts before any positive family overlap, so `DiamondClean 9300` cannot donate commerce evidence to `DiamondClean 9000`. The canonical register contains 64 issues:

- 7 Critical, 28 High, 24 Medium, 5 Low;
- 2 Open, 8 Needs Investigation, 53 Fixed, 1 Won't Fix.

Fail-first reproduced the exact 9000/9300 unsafe attachment. Focused safety tests passed 157/157; the full suite passed 729/729; typecheck and eval passed; lint reported 0 errors and 3 pre-existing warnings.

One focused `electric toothbrush` live run returned the same Smart 9300 candidate and rejected it as `identity_mismatch`; a matching explicit 9000 offer attached instead. A separate 2100 attempt rejected a 4100 candidate before attaching a 2100 offer. No broad baseline ran.

RR-064 implementation commit: `938b839`.

## Required next phase

Do not start the next step automatically. The next master-plan phase is:

**Narrow reopened RR-007/RR-008 pre-final eligibility cleanup**

Contain category and editorial/comparison pages that remain `reliableEnoughForExact` below the final cutoff. Keep these pages available only as secondary evidence where safe; do not let them enter the product-card exact stream. Preserve RR-022 citation retention, RR-063 product-evidence identity, RR-064 source-upgrade identity, and the completed Phase 5H selection behavior.

Do not:

- start Phase 5I before reopened RR-007/RR-008 are explicitly resolved or deferred;
- change Phase 5H final-selection calibration during the eligibility cleanup;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-064 entry

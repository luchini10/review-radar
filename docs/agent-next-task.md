# Agent Next Task

Generated: 2026-06-30

## Current next task

**RR-007/RR-008 cleanup complete - Phase 5I is next only after explicit instruction**

RR-007 and RR-008 are Fixed again. The shared eligibility classifier now blocks paginated bundle/category pages, standards documents, comparison/vs pages, press-release titles, and common editorial subdomains before any product-detail shortcut. The canonical register contains 64 issues:

- 7 Critical, 28 High, 24 Medium, 5 Low;
- 2 Open, 6 Needs Investigation, 55 Fixed, 1 Won't Fix.

Fail-first reproduced all four shapes through shared eligibility, Serper discovery, verified-citation filtering, and requirement filtering. Focused boundary tests passed 157/157; broad safety passed 330/330; the full suite passed 735/735; typecheck and eval passed; lint reported 0 errors and 3 pre-existing warnings.

One focused `electric toothbrush` live run produced five specific retailer/manufacturer product cards. Oral-B category/lineup pages were dropped during citation verification; no category, blog, standards, comparison, or press page entered the exact-scored trace. A broad Oral-B comparison page remained secondary evidence only with `unknown` product identity. RR-064 source-upgrade model safety remained green. No broad baseline ran.

RR-007/RR-008 implementation commit: `50b0713`.

## Required next phase

Do not start the next step automatically. The next master-plan phase is:

**Phase 5I - source-upgrade trigger and fallback reliability**

Resolve RR-041 and RR-042 on the cleaned pipeline. Address RR-037 or RR-045 only if deterministic root causes are confirmed. Establish the post-safety-fix attachment baseline explicitly, and do not improve reliability by loosening RR-053, RR-058, RR-063, or RR-064 identity gates.

Do not:

- start Phase 5I without explicit instruction;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-007/RR-008 cleanup entry

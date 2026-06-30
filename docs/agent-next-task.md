# Agent Next Task

Generated: 2026-06-30

## Current next task

**Phase 5I stopped on Critical RR-065 - fix identity safety before retrying**

Phase 5I reproduced two real reliability gaps: the current trigger requires price, rating, and useful commerce evidence all to be absent, and the fallback runs only when primary search returns zero candidates. A conservative missing-two-of-three trigger plus one bounded fallback after `primary_no_safe_attachment` passed deterministic verification, but the first focused `shop vac` live proof exposed Critical RR-065:

- target: `Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet ...`;
- primary `SKIL ... VA1200D-10` result: safely rejected;
- fallback `Amazon Basics 6-Gallon 3.5 HP Wet/Dry Vacuum`: incorrectly identity-matched;
- attached field: wrong-product citation.

The target card's retailer-prefixed name caused `Amazon.com` to be treated as a brand. Shared Amazon wording plus the same broad product type then allowed a candidate with neither RIDGID nor VAC1200 identity to pass. The Phase 5I app/test changes were rolled back, the second live search was not run, and no behavior change was committed.

The canonical register now contains 65 issues:

- 8 Critical, 28 High, 24 Medium, 5 Low;
- 3 Open, 6 Needs Investigation, 55 Fixed, 1 Won't Fix.

## Required next phase

Do not start Phase 5J or retry the broader Phase 5I change automatically. The next task is:

**Narrow RR-065 source-upgrade identity-safety fix**

Prevent retailer/source prefixes from acting as product brands, and require source-derived brand/model agreement for a model-qualified target before same-category overlap can satisfy source-upgrade identity. Preserve exact same-product cross-retailer offers and all RR-051/RR-053/RR-058/RR-063/RR-064 protections. After RR-065 is fixed deterministically, restore and revalidate the two Phase 5I fail-first cases before another focused live proof.

Do not:

- start Phase 5J;
- retry Phase 5I fallback broadening before RR-065 is fixed;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-007/RR-008 cleanup entry

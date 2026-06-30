# Agent Next Task

Generated: 2026-06-30

## Current next task

**RR-065 fixed - narrow RR-007 Bosch category-page recurrence is next**

RR-065 is Fixed. Shared identity normalization now treats explicit leading source/retailer labels, seller fields, URL hosts, URL query parameters, and query-derived text as provenance rather than product identity. A reliable target brand must appear in source-derived title/brand/path evidence. Product URL paths remain usable.

The exact retailer-prefixed RIDGID VAC1200 versus Amazon Basics regression is blocked. A real Amazon-hosted RIDGID VAC1200 page and a real Amazon Basics target remain valid. RR-063/RR-064 and all named safety regressions remain green.

One focused `shop vac` live run safely attached exact RIDGID HD1400 evidence. It also reopened RR-007: `Wet/dry extractors Dust extraction systems - Bosch Professional` became exact #3 using Bosch collection URL `/au/en/wet-dry-extractors-2549705-ocs-c/`, while a specific Home Depot VAC090AH page remained secondary.

The canonical register now contains 65 issues:

- 8 Critical, 28 High, 24 Medium, 5 Low;
- 2 Open, 7 Needs Investigation, 55 Fixed, 1 Won't Fix.

## Required next phase

Do not retry Phase 5I or start Phase 5J automatically. The next task is:

**Narrow RR-007 Bosch `/ocs-c/` category-page cleanup**

Diagnose why the Bosch product-family collection survived shared eligibility and became a primary card while a specific retailer product page was available. Fix only the generalized collection-page shape, preserve valid Bosch/manufacturer product pages, and do not alter RR-065 identity behavior.

Do not:

- start Phase 5J;
- retry Phase 5I trigger/fallback broadening before RR-007 is contained;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-007/RR-008 cleanup entry

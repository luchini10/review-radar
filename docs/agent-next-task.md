# Agent Next Task

Generated: 2026-06-30

## Current next task

**RR-007 opaque collection-page recurrence fixed - Phase 5I retry awaits explicit approval**

RR-007 is Fixed again. The shared product-page classifier now treats opaque manufacturer collection suffixes and contextual product-range/family/lineup/series routes as strong negative page-shape evidence before product-detail, image, price, or model-like shortcuts.

The exact Bosch `/ocs-c/` record reassesses from `buyable_product` to `listing_or_search`. A fresh `shop vac` run returned only specific product-detail primary URLs. Valid Bosch/manufacturer and major-retailer detail pages remain eligible. RR-008, RR-063, RR-064, RR-065, and all named safety regressions remain green.

RR-041 and RR-042 remain Needs Investigation. Their Phase 5I fail-first cases are documented, but the candidate trigger/fallback change was rolled back after RR-065. This RR-007 cleanup did not retry or change that logic.

The canonical register now contains 65 issues:

- 8 Critical, 28 High, 24 Medium, 5 Low;
- 2 Open, 6 Needs Investigation, 56 Fixed, 1 Won't Fix.

## Required next phase

Do not start automatically. The next task, only after explicit instruction, is:

**Retry Phase 5I for RR-041/RR-042 trigger/fallback reliability**

Restore the documented fail-first cases and re-evaluate the smallest bounded trigger/fallback change against the now-fixed RR-065 identity and RR-007 eligibility protections. Do not treat lower safe attachment rates as a reason to weaken identity.

Do not:

- start Phase 5J;
- weaken RR-063/RR-064/RR-065 source-derived identity rules;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-007 opaque collection-page cleanup entry

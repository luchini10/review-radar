# Agent Next Task

Generated: 2026-06-30

## Current next task

**RR-066 source-upgrade model-identity safety must be fixed before another Phase 5I retry**

The Phase 5I retry stopped and was rolled back after its single approved `shop vac` live proof exposed Critical RR-066.

Target `RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac (WD4522)` rejected an exact-model candidate whose title omitted RIDGID, then accepted `Ridgid 10 Gallon 6.0 Peak HP Stainless Steel Wet/Dry Shop Vacuum`, which carried the brand and product type but no WD4522 model. The wrong product donated price, rating, review count, and citation evidence.

The stop condition was honored. All Phase 5I trigger, fallback, trace, replay, and test edits were removed. The restored repository passes 747/747 tests. RR-041 and RR-042 remain Needs Investigation; Phase 5J has not started.

The canonical register now contains 66 issues:

- 9 Critical, 28 High, 24 Medium, 5 Low;
- 3 Open, 6 Needs Investigation, 56 Fixed, 1 Won't Fix.

## Required next phase

Do not start automatically. The next task, only after explicit instruction, is:

**Fix RR-066 source-upgrade same-brand/model-omission identity safety**

Add a narrow, fail-first identity guard for model-qualified targets. When a target has a reliable strong model token, brand plus product type alone must not prove same-product identity; source-derived candidate title, safe path, or metadata must carry the target model or an equally strong exact product identifier. Preserve valid exact-model offers whose provider title omits the brand when there is no conflicting brand/product evidence.

Do not:

- retry RR-041/RR-042 trigger or fallback behavior in the RR-066 fix;
- start Phase 5J;
- weaken RR-063/RR-064/RR-065 source-derived identity rules;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5I retry / RR-066 safety-stop entry

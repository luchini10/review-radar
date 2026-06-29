# Agent Next Task

Generated: 2026-06-29

## Current next task

**RR-007/RR-063 safety cleanup complete - Phase 5G requires explicit instruction**

RR-007 and RR-063 are fixed. Generic brand/family/category routes cannot become primary product links, and specific product citations must agree with the displayed product identity. The canonical register contains 63 issues:

- 6 Critical, 28 High, 24 Medium, 5 Low;
- 5 Open, 7 Needs Investigation, 50 Fixed, 1 Won't Fix.

Citation verification now separates primary product proof from secondary evidence. Primary links need source-derived same-product identity. Explicit wrong recipe, flavor, life stage, formula, shade, or model citations are removed, as are specific product pages whose identity cannot be tied to the card. Generic family/editorial evidence may remain secondary but cannot become the primary URL.

The single `dog food` run returned 6 exact and 5 near products with only specific product-detail primary URLs. No family, editorial, support, manual, or documentation page became a card. Two additional citation mismatches found in that run were covered by a final deterministic refinement and confirmed by saved-fixture reassessment without another live call.

RR-008 and RR-022 remain Fixed. RR-013 scoring/ranking behavior was not changed.

## Required next phase

Do not start the next step automatically. The next master-plan phase is:

**Phase 5G - evidence-strength ranking (RR-013 only)**

Phase 5G may begin only after explicit instruction. Keep it isolated to the bounded RR-013 citation-strength ranking change in the master plan. Preserve the new product-evidence identity gate and all earlier page, price, type, requirement, citation-retention, and source-upgrade protections.

Do not:

- start Phase 5G without a new explicit instruction;
- combine RR-013 ranking policy with citation retention or product eligibility;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5F entry

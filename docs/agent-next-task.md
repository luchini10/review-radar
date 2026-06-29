# Agent Next Task

Generated: 2026-06-28

## Current next task

**Phase 5F dog-food confirmation complete - RR-008 cleanup requires explicit instruction**

Phase 5F fixed RR-022, and the focused post-refinement `dog food` run live-confirmed that specific Purina/Hill's candidates survive citation verification. The canonical register contains 62 issues:

- 6 Critical, 27 High, 24 Medium, 5 Low;
- 5 Open, 8 Needs Investigation, 48 Fixed, 1 Won't Fix.

Citation verification now checks product-specific LLM product pages for reachability even when other provider URLs are already verified. Exactly verified product pages become primary citations, while editorial, category, and other evidence remains secondary. Product-specific path/title binding prevents generic family pages, support, manuals, documentation, and unrelated self-cites from using this retention path.

The final `dog food` confirmation moved six specific Purina/Hill's candidates through citation verification and did not return the generic `/pro-plan/products/dog-food` family card. Those products were later removed by requirement filtering, so RR-022 remains Fixed and is now live-confirmed for this path.

The same run exposed a separate recurrence of RR-008: `Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets` became exact card #5 because a generic Substack `/p/` article route was treated as product detail and the question-style editorial title was not blocked. RR-008 is Needs Investigation.

## Required next phase

Do not start the next step automatically. The next master-plan phase is:

**Narrow RR-008 article-card eligibility cleanup**

Diagnose and fix the generalized article-question and cross-host generic `/p/` page-shape gap without a Substack-specific patch. Preserve valid retailer/manufacturer `/p/` product routes and all Phase 5F citation-retention behavior. Phase 5G remains the next master-plan phase after this safety regression is contained and explicitly approved.

Do not:

- start the RR-008 cleanup or Phase 5G without a new explicit instruction;
- combine RR-013 ranking policy with citation retention or product eligibility;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5F entry

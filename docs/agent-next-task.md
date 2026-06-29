# Agent Next Task

Generated: 2026-06-28

## Current next task

**Phase 5F complete - Phase 5G requires explicit instruction**

Phase 5F fixed RR-022. The canonical register contains 62 issues:

- 6 Critical, 27 High, 24 Medium, 5 Low;
- 5 Open, 7 Needs Investigation, 49 Fixed, 1 Won't Fix.

Citation verification now checks product-specific LLM product pages for reachability even when other provider URLs are already verified. Exactly verified product pages become primary citations, while editorial, category, and other evidence remains secondary. Product-specific path/title binding prevents generic family pages, support, manuals, documentation, and unrelated self-cites from using this retention path.

One focused `electric toothbrush` run retained all 28 candidates through citation verification. The first `dog food` run exposed both remaining leader drops and a generic Purina family card; the final deterministic refinement retains specific Purina/Hill's paths and blocks `/pro-plan/products/dog-food`. That final dog-food refinement was not live-retested because the approved two-call cap was exhausted.

## Required next phase

Do not start the next step automatically. The next master-plan phase is:

**Phase 5G - Evidence-strength ranking (RR-013 only)**

Phase 5G must remain an isolated, separately measured ranking change. An optional one-call `dog food` confirmation of the final Phase 5F guard should be separately approved before or within the next measurement step; do not treat it as permission to alter Phase 5F behavior.

Do not:

- start Phase 5G without a new explicit instruction;
- combine RR-013 ranking policy with citation retention or product eligibility;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5F entry

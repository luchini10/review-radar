# Agent Next Task

Generated: 2026-06-27

## Current next task

**Phase 4D: product-type leakage and requirement diagnostics**

Phase 4C completed three live diagnostics:

- `shop vac`: RR-002 reproduced on a Vacmaster 1.5-gallon vacuum at `$10`, marked `verified`, budget-usable, exact rank #7.
- `cordless drill`: no fake-low or installment price observed.
- `pressure washer`: full-product prices were plausible, but detergent reached exact rank #2, an article exact rank #6, and six dishwashers survived into near.

RR-002 and RR-052 are now freshly reproducible. RR-007, RR-008, RR-013, and RR-017 received additional evidence. No new issue ID was needed.

## Required next phase

Run Phase 4D product-type leakage and requirement diagnostics with at most four fresh searches: `robot vacuum`, `basketball hoop`, `air purifier`, and `portable generator`.

Capture wrong categories, accessories/parts, variants, exact/near status, violated requirements, and whether each product should have been rejected or downgraded. Focus on RR-017 and RR-043 while preserving evidence for RR-007/RR-008 where non-product pages appear. Do not fix anything.

Do not:

- change app code, tests, scoring, ranking, discovery, source-upgrade, identity, brand, trust, eligibility, or UI behavior;
- exceed four fresh live searches;
- close an issue merely because it is absent from this sample;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 4C entry

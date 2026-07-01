# Agent Next Task

Generated: 2026-07-01

## Current next task

**Phase 5J complete - RR-068 must be handled before Phase 6**

Phase 5J fixed RR-061 and RR-054 in implementation commit `708ee98`.

Product images now require an image-like asset plus source-derived same-product context. Page URLs, image directories, UI/logo/placeholder assets, generic navigation/category/editorial artwork, and unrelated page metadata are rejected. Verified same-product product-page, retailer, manufacturer, Google Shopping, and opaque CDN image assets remain supported.

Fresh Serper-candidate fallback responses now preserve their actual debug funnel, final-selection trace, search plan, empty source-upgrade traces, and explicit bypass reasons. Normal non-debug response content is unchanged and old fixtures remain compatible.

The single live `shop vac` proof showed seven real image responses with no page, logo, placeholder, category, article, or support asset used as a card image. It did not enter a fallback path, so RR-054 remains live-unconfirmed but deterministically fixed.

The same run opened RR-068: four Bissell CrossWave household floor cleaners reached the seven exact `shop vac` cards. Phase 5J did not touch product-type, requirement, ranking, discovery, final-selection, or page-eligibility behavior, and RR-068 was not fixed.

The canonical register now contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 1 Open, 4 Needs Investigation, 62 Fixed, 1 Won't Fix.

## Required next task

Do not start automatically. Before Phase 6, run a narrow fail-first RR-068 product-type phase.

The generalized target is the distinction between conventional wet/dry utility/shop vacuums and household wet/dry floor washers or mopping appliances. Preserve valid utility wet/dry vacuums across brands and avoid a Bissell-specific rule.

Do not:

- start Phase 6 or create its reliability gauntlet;
- alter the completed RR-061 image or RR-054 fallback-debug behavior without a proven regression;
- change ranking, discovery breadth, final selection, price, citation, or source-upgrade behavior to fix RR-068;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5J entry

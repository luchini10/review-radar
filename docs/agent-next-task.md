# Agent Next Task

Generated: 2026-06-28

## Current next task

**RR-062 diagnostic complete — stop before any behavior fix or Phase 5D**

Phase 5C fixed RR-002. The follow-up diagnostic has now confirmed RR-062's extraction path without changing app behavior. The canonical register contains 62 issues:

- 6 Critical, 27 High, 24 Medium, 5 Low;
- 8 Open, 12 Needs Investigation, 41 Fixed, 1 Won't Fix.

The saved Phase 5C fixture proves VIOFO entered asset enrichment with no verified price, then gained a lone `19999` retailer-page offer from its landing page. The current page contains an unrelated A139 widget with `data-price="19999"`; the broad page-metadata extractor treats that Shopify-style minor-unit value as 19,999 dollars and does not bind it to the target product. The separate `$322.99` source-upgrade sample belonged to BlackVue, not VIOFO.

## Required next phase

Do not start the next step automatically. RR-062 is now confirmed and should be fixed in its own narrow behavior phase before Phase 5D:

**RR-062 — unscoped structured-page price and minor-unit misinterpretation**

Recommended immediate direction: add product-scoped structured-price extraction and safe bare-integer/minor-unit handling, with regression coverage for unrelated page widgets, valid product-scoped metadata, and legitimate high-end prices. Avoid a blunt global maximum. Phase 5D remains limited to RR-007/RR-008/RR-009 and must not be combined with RR-062.

Do not:

- start the RR-062 behavior fix or Phase 5D without a new explicit instruction;
- combine RR-062 price extraction with Phase 5D product-card eligibility;
- weaken low-price, exact-budget, installment, citation, product, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5C entry

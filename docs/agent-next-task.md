# Agent Next Task

Generated: 2026-06-27

## Current next task

**Phase 3O - brand-preserving source-upgrade query identity**

Phase 3N fixed RR-048 and RR-049 deterministically:

- Source-upgrade Serper normalization can now retain a specific Google Shopping offer only when evidence mode is explicitly enabled and the URL/result carry offer identifiers, a specific title, price, and merchant metadata.
- Ordinary Google searches and Google Shopping/category pages remain blocked as product cards.
- Merchant product URLs are preferred over Google offer URLs in evidence mode.
- Specific `Shop-Vac` product titles survive, while generic shop/category titles remain blocked.

Phase 3N is implemented but not live-proven. One approved `shop vac` proof produced `sourceUpgradeTraces: 0`, so no normalization, identity, or attachment path ran. RR-042 remains open until a trigger-producing focused live proof confirms normalized candidates return and source upgrade behaves safely.

RR-047 remains open: the query builder detects `DeWalt` but drops it when selecting only the words immediately before model `DXV10SB`.

RR-051 is fixed deterministically. Serper snippets now carry explicit source/query provenance, and source-upgrade identity ignores query-derived fallback snippets plus the request-derived category while retaining source titles, merchant data, URLs, provider specs, and real provider snippets.

## Required next phase

Implement one focused source-upgrade query-identity fix. Do not run a full baseline.

Required behavior:

1. Preserve a reliably detected brand when building a compact model-based source-upgrade query.
2. Keep the model token and compact category context.
3. Avoid duplicate brand/category words and long retailer-display-title noise.
4. Keep the Phase 3I primary and Phase 3K single-fallback bounds.

Tests must cover:

- brand-led long titles where the model appears late
- already compact brand/model titles
- titles without a reliably detected brand
- duplicate brand/category prevention
- unchanged trigger, fallback count, identity matching, and non-debug result shape

After deterministic tests pass, request approval for one focused `shop vac` live proof covering Phase 3N plus Phase 3O.

Do not:

- change scoring, ranking, discovery, source-upgrade trigger logic, fallback count, identity matching, model-token detection, eligibility, extraction, or trust gates;
- add product-, brand-, or category-specific branches;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3N entry

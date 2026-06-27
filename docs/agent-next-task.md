# Agent Next Task

Generated: 2026-06-27

## Current next task

**Focused live proof after Phase 3N, RR-051, and Phase 3O - approval required**

Phase 3N fixed RR-048 and RR-049 deterministically:

- Source-upgrade Serper normalization can now retain a specific Google Shopping offer only when evidence mode is explicitly enabled and the URL/result carry offer identifiers, a specific title, price, and merchant metadata.
- Ordinary Google searches and Google Shopping/category pages remain blocked as product cards.
- Merchant product URLs are preferred over Google offer URLs in evidence mode.
- Specific `Shop-Vac` product titles survive, while generic shop/category titles remain blocked.

Phase 3N is implemented but not live-proven. One approved `shop vac` proof produced `sourceUpgradeTraces: 0`, so no normalization, identity, or attachment path ran. RR-042 remains open until a trigger-producing focused live proof confirms normalized candidates return and source upgrade behaves safely.

RR-047 is fixed deterministically. The query builder now prefers trusted metadata brand, then existing shared brand detection, and preserves that brand with compact model identity. The confirmed primary/fallback pair is now `DeWalt DXV10SB` and `DeWalt DXV10SB shop vac`.

RR-051 is fixed deterministically. Serper snippets now carry explicit source/query provenance, and source-upgrade identity ignores query-derived fallback snippets plus the request-derived category while retaining source titles, merchant data, URLs, provider specs, and real provider snippets.

## Required next phase

Request explicit approval for one focused `shop vac` live proof covering the combined RR-048, RR-049, RR-051, and RR-047 fixes. Do not run a full baseline.

The proof should confirm:

1. A source-upgrade attempt fires.
2. The trace uses the brand-preserving primary/fallback identity.
3. Normalized candidates reach identity evaluation.
4. Query-derived fallback text does not influence identity.
5. Evidence attaches only for a safe same-product candidate.

Do not:

- change app behavior before the proof;
- run any category beyond the explicitly approved focused query;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3N entry

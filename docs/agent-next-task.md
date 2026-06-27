# Agent Next Task

Generated: 2026-06-27

## Current next task

**Safety fixes required after failed Phase 3O live proof**

Phase 3N fixed RR-048 and RR-049 deterministically:

- Source-upgrade Serper normalization can now retain a specific Google Shopping offer only when evidence mode is explicitly enabled and the URL/result carry offer identifiers, a specific title, price, and merchant metadata.
- Ordinary Google searches and Google Shopping/category pages remain blocked as product cards.
- Merchant product URLs are preferred over Google offer URLs in evidence mode.
- Specific `Shop-Vac` product titles survive, while generic shop/category titles remain blocked.

Phase 3N is implemented but not live-proven. One approved `shop vac` proof produced `sourceUpgradeTraces: 0`, so no normalization, identity, or attachment path ran. RR-042 remains open until a trigger-producing focused live proof confirms normalized candidates return and source upgrade behaves safely.

RR-047 remains fixed deterministically, but the live proof exposed unsafe upstream identity inputs and a URL-provenance bypass.

RR-051 is fixed deterministically. Serper snippets now carry explicit source/query provenance, and source-upgrade identity ignores query-derived fallback snippets plus the request-derived category while retaining source titles, merchant data, URLs, provider specs, and real provider snippets.

## Required next phase

Fix safety before any further live source-upgrade proof:

1. RR-053 first: Google Shopping offer query parameters must not satisfy same-product identity.
2. RR-052 next: `Peak HP` must not become Hewlett-Packard brand identity.
3. Reassess reopened RR-002 separately: a `$10` full shop-vac offer was treated as verified.

Do not:

- combine these safety defects into scoring or ranking work;
- change source-upgrade query/fallback behavior beyond the proven safety causes;
- run another live search before deterministic safety tests pass and approval is granted;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3N entry

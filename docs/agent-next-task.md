# Agent Next Task

Generated: 2026-06-27

## Current next task

**RR-052: prevent horsepower `HP` from becoming Hewlett-Packard brand identity**

Phase 3N fixed RR-048 and RR-049 deterministically:

- Source-upgrade Serper normalization can now retain a specific Google Shopping offer only when evidence mode is explicitly enabled and the URL/result carry offer identifiers, a specific title, price, and merchant metadata.
- Ordinary Google searches and Google Shopping/category pages remain blocked as product cards.
- Merchant product URLs are preferred over Google offer URLs in evidence mode.
- Specific `Shop-Vac` product titles survive, while generic shop/category titles remain blocked.

Phase 3N is implemented but not live-proven. One approved `shop vac` proof produced `sourceUpgradeTraces: 0`, so no normalization, identity, or attachment path ran. RR-042 remains open until a trigger-producing focused live proof confirms normalized candidates return and source upgrade behaves safely.

RR-047 remains fixed deterministically.

RR-051 is fixed deterministically. Serper snippets now carry explicit source/query provenance, and source-upgrade identity ignores query-derived fallback snippets plus the request-derived category while retaining source titles, merchant data, URLs, provider specs, and real provider snippets.

RR-053 is fixed deterministically. Source-upgrade identity now ignores all URL query parameters and fragments while retaining safe host/path identity. The HP laptop whose Google Shopping URL contained `q=HP+HD0900` is rejected, valid source-title identity still passes, and merchant model paths remain usable.

## Required next phase

Fix RR-052 only: `Peak HP` and horsepower measurements must not become Hewlett-Packard brand identity. Preserve genuine HP computer-brand detection. Reassess reopened RR-002 separately after RR-052; a `$10` full shop-vac offer was treated as verified.

Do not:

- combine these safety defects into scoring or ranking work;
- change source-upgrade query/fallback behavior;
- change URL-query identity handling fixed by RR-053;
- run another live search before deterministic safety tests pass and approval is granted;
- run a full baseline.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-053 entry

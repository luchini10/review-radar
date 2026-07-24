# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after OAI-T9 Phases 1–2.
Use `git log -1` for the current scoped safety commit.

## Current state

OAI-T9 Phases 1–2 are complete. Direct-Terra verifier v5 now requires one
server-only complete-product relationship for every citation, organic,
Shopping, and fetched-page asset candidate. Only `complete_product` and
`bundle_including_product` may provide a website or image.

RR-099 is Fixed. The captured Tapo replacement-water-tank link and unrelated
complement forms are blocked without a product, brand, category, retailer,
ASIN, or observed-path production exception. Valid complete-product bundles
remain eligible. Ambiguous pages require bounded title/JSON-LD Product proof;
failure or unresolved evidence leaves the asset unavailable.

Direct-Terra remains default-off and undeployed. Terra remains the application
default. No live request, flag change, `.env.local` edit, deployment,
production change, or push occurred.

## Verification and evidence

- focused complete-product/asset/page wall: 78/78 before final adversarial
  expansion; final relationship/verifier wall: 57/57;
- complete suite: 1,354/1,354 across 195 suites;
- typecheck and production build: pass;
- lint: zero errors and three pre-existing warnings;
- `git diff --check`: pass;
- eight-run T8D replay: 31/31 ranked products accounted, 24 retained links
  revalidated, one definitive older wrong-variant block, six honestly
  indeterminate historical warnings;
- later T8D and T8E replays: RR-099 ASIN `B0DLH5B3SN` definitively blocked as
  `accessory_or_replacement`; and
- tracked sanitized relationship corpus plus generated cross-category
  mutations: pass.

No provider request was used for this evidence. Historical final-only fixtures
that omitted original provider titles cannot reconstruct live candidate
coverage and must remain labeled indeterminate.

## Current approved goal: OAI-T9 Phase 3

Continue without pausing through a zero-live upgrade to
`direct-terra-master-prompt-v3`.

The same OpenAI response must contain a server-only `candidate_slate` of 8–15
distinct products. Each candidate carries identity, disposition, nullable
rank, evidence quality, concise reason, exact hosted-search URLs, and one
`pass` / `fail` / `needs_verification` verdict for every applicable
request-derived requirement ID.

Required server invariants:

1. Requirement IDs are generated from the submitted request, with stable
   feature IDs, deterministic order, uniqueness, and complete coverage.
2. Every ranked heading maps to exactly one slate entry with the same rank and
   identity; ReviewRadar never adds, substitutes, or reorders products.
3. Ranked products cannot fail a hard requirement; Best Match must pass all
   hard requirements. Other ranked products may use `needs_verification` only
   when the visible report says so.
4. Price observations bind to the same ranked identity.
5. All slate and requirement evidence URLs belong to the same response-owned
   hosted-search source registry.
6. Invalid slate/rank/requirement consistency fails closed. Citation failures
   remain granular, except losing all evidence for a Best Match hard
   requirement fails the response.
7. Candidate-slate diagnostics are sanitized and server-only. Client-facing
   completed response shape, report, recommendations, and asset behavior stay
   unchanged.

Finish with adversarial prompt/schema tests, full offline validation, diff
review, documentation, and an automatic scoped commit. Keep all flags off.

**Expected North-Star effect:** improve recommendation recall and hard-
requirement truth by forcing same-call broad consideration before ranking.
No live improvement is claimed until the separately approved Phase 4 window.

**Recommended reasoning level:** High. Dynamic requirement completeness,
identity/rank binding, and source ownership are fail-closed trust contracts;
maximum reasoning is unnecessary once the schema is frozen.

## Approval and flag state

Taylor explicitly resumed the OAI-T9 goal and requested uninterrupted work
through Phase 3. Scoped Phase 3 files may be committed automatically.

No OpenAI, Serper, SearchAPI, page, image, or other external request is
authorized. Phase 4's 12-run Sol/high window still requires a separately
approved exact numeric envelope and current-price dollar ceiling.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- Direct-Terra research model: `gpt-5.6-terra`

## Hard boundaries

- No external request, deployment, publication, push, flag promotion,
  `.env.local` edit, or production change.
- Preserve Terra-authored product names, order, report prose, citations, and
  price caveats.
- No benchmark leaders, category queries, or product/category-specific rules
  in the prompt or code.
- Do not weaken product identity, relationship, price, citation, requirement,
  product-type, wrong-image, redirect, or private-network gates.
- Never send raw model responses, provider IDs, secrets, or server diagnostics
  to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[113]` asks Claude to challenge the complete-product grammar
and bounded ambiguity handoff. That advisory review is not required before
Phase 3 implementation, but Phase 3 must receive its own adversarial review
before closeout.

| Need | Retrieve |
|---|---|
| Current state and Phase 3 contract | this file |
| Standing gates and OAI-T9 record | `docs/forward-roadmap.md`, OAI-T9 |
| Closed safety defect | RR-099 in `docs/RR-Issues-Report.md` |
| Canonical zero-live evidence | latest OAI-T9 entry in `docs/qa-loop-results.md` |
| Durable asset contract | OAI-T9 section in `docs/review-radar-test-memory.md` |
| Peer challenge | dialogue entry `[113]` |
| Historical live evidence | untracked T8D/T8E fixture directories |

# ReviewRadar Agent Handoff

Updated: 2026-07-22 by Codex for the reviewed OAI-T8A Phase 5
registered-citation website resolver and its approved seven-file commit. The
scope lands in the revision containing this record.

## Current phase and commit boundary

The pre-phase base is full commit
`c8185d32e5572c68769027e3c0bc33786cec968a` (`Split Direct-Terra asset
verification`). Taylor approved the zero-live Phase 5 implementation, then
separately approved adversarial review and commit of exactly these seven files:

- `docs/agent-dialogue.md`
- `docs/agent-next-task.md`
- `docs/forward-roadmap.md`
- `docs/qa-loop-results.md`
- `lib/directTerraCitationWebsiteResolver.ts`
- `lib/directTerraResponse.ts`
- `tests/directTerraCitationWebsiteResolver.test.mjs`

Historical fixtures and every unrelated untracked artifact remain excluded.
Never use `git add -A`.

## Reviewed Phase 5 resolver contract

`lib/directTerraCitationWebsiteResolver.ts` is
`direct-terra-citation-website-resolver-v1`. It is a deterministic,
provider-free module that:

1. parses Terra's report with GFM;
2. isolates each `#N Best Match` section;
3. requires that section heading to match the locked Terra target;
4. considers only links rendered inside that product's section;
5. requires each link to be both an active citation and a titled source in the
   same response-owned source registry; and
6. reuses `verifyDirectTerraAssetCandidates` before returning a product URL.

The existing verifier therefore still decides exact brand/model/type identity,
page eligibility, unsafe host, redirect wrapper, Google wrapper, listing,
editorial/accessory, and product-page identity. A miss is `unavailable`; there
is no fallback, search, guess, or cross-product borrowing.

The resolver output contains only `targetKey`, `rank`, `productName`,
`productUrl`, and `productUrlStatus`. Terra's identity and order are immutable.
Source titles, citations, diagnostics, provider metadata, and private inputs do
not survive.

`lib/directTerraResponse.ts` exports its source type and established citation
URL canonicalizer. The response parser and resolver therefore use one ownership
definition. Only established tracking parameters may be ignored for the join;
identity-bearing parameters, order, and fragments remain significant.

## Pre-commit adversarial findings

Review reproduced and corrected two defects fail-first:

1. Duplicate Markdown reference labels selected their last definition in the
   response parser and resolver, while CommonMark renders the first. Both now
   preserve the first definition, keeping visible citation, response ownership,
   and website resolution aligned.
2. Source deduplication kept a titleless first occurrence and discarded a later
   response-owned title for the same URL. It now upgrades only a missing title;
   an established title cannot be replaced by conflicting later metadata.

The complete regression wall also covers exact registered pages, stable rank
order, cross-section borrowing, mismatched/duplicate ranked headings,
inactive/unregistered/titleless evidence, editorial/documents, listing/search,
Google wrappers, accessories, sibling models, code blocks, links after a
section, incoherent targets, and output leakage.

## Verification

- focused resolver/verifier/response wall: 48/48 pass;
- complete wall: 1249/1249 across 177 suites;
- `npm run typecheck`: pass;
- `npm run lint`: zero errors and three pre-existing warnings;
- `npm run build`: pass; and
- `git diff --check`: pass.

No OpenAI, Serper, SearchAPI, direct-page, or other provider request occurred.
No route/UI/API integration, flag change, `.env.local` edit, deployment, push,
or production change occurred.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior classified local `.env.local` state remains:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

Phase 5 did not read or modify `.env.local`. The resolver is not imported by a
route or UI and cannot change user-visible behavior.

## Next approval-gated decision

No further phase is approved. The strongest next phase is a zero-live,
default-off integration contract that combines:

- website evidence from the registered-citation resolver; and
- image evidence from the independent Shopping verifier/adapter v3.

That phase must define a minimal server-to-client asset shape, keep legacy and
flag-off behavior byte-identical, preserve Terra's identity/order, and use only
mocked transports. It requires Taylor's separate approval.

**Recommended reasoning level:** High. Integration crosses the server/client
trust boundary and must prove that private source metadata and diagnostics
cannot leak while missing assets remain harmless.

## Outstanding limitations

- Registered-citation website coverage has not been measured on a live Terra
  response under this resolver.
- The resolver and split Shopping asset adapter are both unwired.
- Live image coverage under adapter v3 remains unmeasured.
- The old Phase 3 probe is frozen and cannot be reused live.
- Zero-live classification of T7C robot-vac denominator misses remains open.
- Missing safe prices in constrained evaluation remain budget-unverified, not
  silently compliant.

## Hard boundaries

- No provider request without a new exact numeric approval pinned to a reviewed
  commit.
- No later commit, push, route/UI/API integration, feature-flag promotion,
  `.env.local` edit, deployment, publication, or production change without
  separate approval.
- Assets may decorate only Terra's immutable recommendations.
- Never display Google wrappers as product websites.
- Never alias model suffixes without independent exact evidence.
- Missing or rejected assets remain unavailable.
- Never expose or persist keys, headers, queries, provider IDs, raw responses,
  source metadata, or private provenance/diagnostics in client data.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and boundaries | this file |
| Phase 5 architecture | `docs/forward-roadmap.md` OAI-T8A Phase 5 subsection |
| Canonical verification | latest `docs/qa-loop-results.md` entry |
| Review/commit boundary | `docs/agent-dialogue.md` entry [99] |
| Citation ownership | `lib/directTerraResponse.ts` |
| Website resolver | `lib/directTerraCitationWebsiteResolver.ts` |
| Existing trust gate | `lib/directTerraAssetVerifier.ts` |
| Regression wall | `tests/directTerraCitationWebsiteResolver.test.mjs` |

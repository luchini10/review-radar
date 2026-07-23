# ReviewRadar Agent Handoff

Updated: 2026-07-22 by Codex after the zero-live Direct-Terra website/image
source correction and complete local validation.

## Current phase and commit boundary

The committed base remains full commit
`5136346ca44df932086017ee22cca759f6b665ac` (`Integrate Direct-Terra product
assets`). Taylor asked Codex to combine Claude's organic-link diagnosis with
the prior adversarial findings and solve the asset path offline. The resulting
correction is complete and reviewed locally but remains uncommitted.

The scoped working set is:

- `lib/directTerraResponse.ts`
- `lib/directTerraAssetVerifier.ts`
- `lib/directTerraSerperAssetAdapter.ts`
- `lib/directTerraSerperOrganicAdapter.ts`
- `lib/directTerraSerperTransport.ts`
- `lib/directTerraProductAssets.ts`
- `lib/directTerraRecommendationRoute.ts`
- `scripts/run-oai-t8a-integrated-asset-smoke.mjs`
- `tests/directTerraResponse.test.mjs`
- `tests/directTerraCitationWebsiteResolver.test.mjs`
- `tests/directTerraSerperAssetAdapter.test.mjs`
- `tests/directTerraSerperOrganicAdapter.test.mjs`
- `tests/directTerraSerperTransport.test.mjs`
- `tests/directTerraProductAssets.test.mjs`
- `tests/directTerraRoute.test.mjs`
- `tests/directTerraArchitecture.test.mjs`
- `ReviewRadar-Overview.md`
- `docs/forward-roadmap.md`
- `docs/change-log.md`
- `docs/qa-loop-results.md`
- `docs/agent-dialogue.md`
- `docs/agent-next-task.md`

The sanitized integrated-smoke fixture remains untracked at
`tests/fixtures/review-radar-live/oai-t8a-integrated-asset-smoke-5136346/` and
must not be staged. Unrelated `.claude/`, baseline files, historical fixtures,
and `fable-transfer-kit/` also remain untracked. Never use `git add -A`.

## Decisive evidence

The first integrated smoke at `5136346` returned five ranked shop vacs but
created one asset target, accepted one image, and produced zero product
websites. Static replay proved the first loss: optional price observations,
rather than Terra's ranked headings, controlled asset targeting.

Claude correctly connected the zero-website result to C5: Serper Shopping
returns useful thumbnails but commonly exposes Google wrapper destinations,
whereas bounded organic `"<exact identity> product page"` searches can return
direct merchant/manufacturer pages. The implementation adopts that source
split without importing the legacy C5 pipeline.

## Corrected architecture

1. Terra's ranked heading is the primary immutable product identity. A heading
   can produce a target only when it has a coherent brand, strong model, and
   product type. Price-observation identity is a fallback and a conflict veto,
   never a prerequisite.
2. A strict same-response citation in that product's own ranked section is the
   first website source. Its response-owned title must itself prove exact
   brand/model/type identity; URL or manufacturer-host guessing cannot replace
   missing title identity.
3. Only citation-missing targets receive one bounded Serper organic
   `"<brand> <model> <product> product page"` request, at most five. Organic
   rows pass the shared title, type, eligibility, wrapper, URL, and
   `productPageMatchesIdentity` gates before a direct website is exposed.
4. Serper Shopping remains image-only in orchestration. Exact Shopping rows
   may supply a provenance-gated image, but their wrapper or merchant link is
   never used as the card website.
5. Organic websites and Shopping images run as two independent sequential
   lanes, concurrently with one another. Failure in either lane returns a
   nullable asset and cannot alter, remove, add, rename, or reorder Terra's
   recommendations.

The new organic adapter and shared transport are standalone, one-attempt,
no-cache, no-retry, no-fallback boundaries. Requests are fixed to the Serper
organic or Shopping endpoint, use process-supplied server secrets, cap queries
at 180 characters, cap results, and reject malformed/error-bearing responses.
No query, provider row, title, ID, secret, header, raw payload, or diagnostic
enters the public product-asset result.

## Adversarial findings closed

- Headings containing real models plus `4-Burner`, `12-Cup`, `3-Stage`, and
  similar specifications no longer lose their targets; spec-only and
  date-shaped headings still produce no target.
- A price-observation identity that conflicts with the heading suppresses the
  target instead of silently rewriting the ranked product.
- The earlier abbreviated-title manufacturer-URL exception was removed. It
  admitted fake brand-looking hosts, accessory paths, and compound sibling
  model URLs under plausible abbreviated titles.
- Organic results reject accessories, editorial/listing/search pages, Google
  and affiliate wrappers, local/private destinations, sibling models, and
  title/URL identity disagreement.
- Any non-null provider `error`, including an object-shaped error, fails both
  Shopping and organic payloads closed.
- Organic query generation now shares the transport's exact 180-character
  ceiling; the two independent provider lanes start concurrently to avoid
  unnecessary serial latency.

## Verification

- focused Direct-Terra wall: 92/92 across 10 suites;
- complete unit wall: 1270/1270 across 180 suites;
- `npm run typecheck`: pass;
- `npm run lint`: zero errors and three pre-existing warnings;
- `npm run build`: pass;
- integrated smoke dry-run v2: pass, zero network; and
- saved C5 organic replay: 3/3 previously proven exact product pages recovered
  by the new standalone adapter, zero network; and
- `git diff --check`: pass before the final documentation refresh.

## Flag state

Committed defaults in `.env.example` remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior classified local `.env.local` state remains:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

This phase neither read nor changed `.env.local`. No provider call, push,
deployment, publication, flag promotion, or production change occurred.

## Next approval-gated decision

The next step is one scoped local commit of the reviewed files above, only if
Taylor explicitly approves it. Do not stage the untracked smoke fixture or any
unrelated artifact.

Only after that commit exists should a replacement integrated smoke be
proposed with exact numeric approval pinned to the new full hash. Its planning
ceiling is one Terra/high OpenAI Responses create, at most 20 hosted searches,
at most 60 retrieves, one safety cancel, at most five Serper Shopping requests,
at most five Serper organic requests, and a $7 hard ceiling. That proposal is
not approved by this handoff. A pass would be evidence for a later deployment
decision, not authority to promote flags or deploy.

**Recommended reasoning level:** Medium for the mechanical scoped commit
because the high-reasoning adversarial review and full wall are complete. High
for the later live smoke because it requires identity-by-identity coverage and
ledger auditing.

## Hard boundaries

- No provider request without new exact numeric approval pinned to the new
  reviewed full commit.
- No commit, push, deployment, publication, feature-flag promotion,
  `.env.local` edit, or production change without separate approval.
- Preserve Terra's immutable recommendation identity, name, rank, report, and
  order.
- Preserve citation ownership, disabled-source behavior, purchase caveats,
  market-price-estimate language, and every existing asset trust gate.
- Never expose or persist keys, headers, private queries, provider IDs, raw
  provider rows/responses, source titles, or server-only diagnostics.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase, boundaries, and next decision | this file |
| Current asset architecture | `ReviewRadar-Overview.md` |
| Canonical verification evidence | latest `docs/qa-loop-results.md` entry |
| Plain-English behavior change | latest `docs/change-log.md` entry |
| Phase rationale and source split | T8A section in `docs/forward-roadmap.md` |
| Peer-agent conclusion | latest `docs/agent-dialogue.md` entry |
| Saved first-smoke evidence | untracked `oai-t8a-integrated-asset-smoke-5136346/` |

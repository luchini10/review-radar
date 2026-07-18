# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T4D precision correction.
OAI-T1 is committed at `3b85e4c`, OAI-T2 at `2238f28`, OAI-T3 at `6a96690`,
OAI-T4A at `304d7ee`, the original T4B at `d943c67`, the reviewed T4B
correction at `c22de3d`, and the T4C closeout plus initial T4D attribution at
`61200da`. The T4D precision correction is committed at current `main` HEAD.
No provider call, replacement, quality gate, verifier work, promotion,
deployment, or push is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T4 section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [65] onward.
5. Retrieve the latest OAI-T4C/T4D entries in `docs/qa-loop-results.md`.
6. Do not run another provider call without Taylor's separate explicit
   approval.

## Current architecture and flag state

- Missing, empty, or exact `legacy` mode delegates to the unchanged legacy
  handler. Exact `two_layer` selects the background branch; other non-empty
  modes fail before provider creation. Legacy remains the default.
- The two-layer branch performs one Terra/high background Responses create with
  hosted search, no SDK retry, Serper, SearchAPI, helper model, second response,
  legacy fallback, or transactional receipt.
- GET and DELETE carry an encrypted, authenticated job capability only in
  `x-reviewradar-job-token`. Provider IDs and prompt hashes are not
  client-decodable or placed in URLs.
- Completed research must pass deterministic T2 formatting and T1 trust-card
  validation. Without an independent receipt, exact identity and commerce stay
  unverified and price, seller, availability, purchase URL, and image stay
  absent.
- T4C used process-only `REVIEW_RADAR_PIPELINE_MODE=two_layer` and an ephemeral
  random job-token secret. The server is stopped. `.env.local` was not edited.
- Last recorded persistent local state remains constraint allocation on,
  narration off, with no pipeline-mode or job-token-secret entry.

## OAI-T4C live result

Taylor approved and spent one Terra/high create, at most 20 hosted searches,
and a `$7` ceiling for broad U.S. `vacuum cleaner` with no budget/preferences.
The real UI received POST 202 in 4.3 seconds, polled only the same signed job,
and received terminal HTTP 502 `verification_failed` after about 202.1 seconds.
The UI showed the safe error, no cards or transactional fields, and zero browser
warnings/errors. No retry, replacement, fallback, Serper, SearchAPI, direct
fetch, second response, additional case, promotion, or deployment occurred.

The response passed provider completion, refusal, hosted-search-presence, and
non-empty-text gates. Exact search count, token usage, cost, and deterministic
failure cause could not be reconstructed because the route retained no raw
provider response and did not emit its sanitized completion ledger. The
approval is spent.

## OAI-T4D zero-live result

- The saved natural Terra fixture contains 380 captured source rows, of which
  25 have titles. A route-equivalent replay uses those 25 title-present sources
  and passes the formatter with five recommendations and 20 cited/registered
  sources. The same saved response then passes the T1 card builder with five
  safely sparse cards: all exact-identity and commerce states remain
  `not_verified`. Supplying all 380 fixture rows directly is not
  route-equivalent and correctly fails `source_title`.
- This full saved T2-to-T1 pass disproves universal incompatibility in the
  deterministic boundary. It cannot reconstruct T4C's exact response or prove
  which runtime variation triggered the live rejection.
- `lib/twoLayerFormatter.ts` preserves four broad formatter reasons and adds a
  bounded cause for each owned rejection, including missing heading/section,
  rank, identity, source-registry/title, and final extraction-integrity causes.
  Unknown non-formatter exceptions remain `unknown` until reproduced.
- `lib/twoLayerRecommendationRoute.ts` reports only bounded
  `stage/reason/cause` server-side. It also reports one safe completion record
  after provider completion: requested/returned model, duration, aggregate
  token fields, hosted-search count, and source count.
- Neither diagnostic contains exception text, shopper prose, prompt, answer,
  URL, host, token, provider response ID, header, credential, or raw provider
  content. Observer failure cannot alter the completed or fail-closed route.
- The browser still receives the exact same generic HTTP 502
  `verification_failed` response on rejection. No prompt, parser, trust,
  citation, source, card, commerce, or public-response rule was relaxed.
- No provider or direct-page call occurred.

## Next decision

Offline evidence is now exhausted. The smallest useful next phase is one
separately approved **OAI-T4E diagnostic lifecycle smoke** using the unchanged
Terra/high route. It asks three questions in one response:

1. Can the real two-layer route complete and render safe T1 cards?
2. If not, which exact bounded `stage/reason/cause` rejects the response?
3. What model, duration, token, hosted-search, and source-count totals should
   set the later quality-gate budget?

Use the same broad U.S. `vacuum cleaner` request, one OpenAI Responses create,
at most 20 hosted searches, and a `$7` planning basis and hard ceiling. Use
process-only `REVIEW_RADAR_PIPELINE_MODE=two_layer` plus an ephemeral random job
secret; leave `.env.local` unchanged. Retain only HTTP lifecycle/status/timing,
the bounded completion record, bounded failure classification if any, and the
UI card count/trust states or generic error.

No retry, replacement, fallback, Serper, SearchAPI, direct fetch, second
response, cache reuse, extra case, helper model, source-page open, flag
promotion, deployment, or push. Success stops for a report before a quality
gate is designed. An attributed failure also stops without retry; implement a
later zero-live repair only if its cause is generalized and evidence-supported.
Any second create/fallback, raw or secret leak, unsafe transactional field, or
mode ambiguity is an immediate kill condition.

**Recommended reasoning level:** **High**, not Highest. The architecture is
frozen; the work is a bounded live lifecycle run whose risk lies in enforcing
request, privacy, and trust boundaries accurately.

## Hard boundaries

- No live OpenAI, Serper, SearchAPI, direct-fetch, or source-page call is
  approved. T4C's approval is spent; every later call needs new approval.
- Do not edit `.env.local`, create or persist a real job secret, promote a mode,
  deploy, start a quality/repeatability gate, or build transactional
  verification without separate approval.
- Do not expose or persist shopper prose, full prompts/answers, source paths,
  job tokens, provider IDs, request headers, API keys, or raw provider responses.
- Do not weaken exact identity, product eligibility, citation binding, source
  labels, or no-receipt transactional omissions to make a response pass.
- No product-, brand-, retailer-, category-, publisher-, benchmark-, or
  fixture-specific production rule.
- Preserve all pre-existing untracked artifacts and live fixtures. Stage only
  explicit phase files; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of older OAI lifecycle and
  unguarded-diagnostic conclusions.
- Entries [58]-[67] contain the T1-T4 peer challenges and T4D precision review
  request. Dialogue remains advisory and authorizes no work.

## Verification state

- T4B correction at `c22de3d`: full wall 1081/1081 across 148 suites, plus
  typecheck, lint, build, offline eval, and browser walls green.
- T4C: one POST 202, same-job pending GETs 202, terminal GET 502
  `verification_failed`, safe UI error, zero browser warnings/errors, no cards.
- Initial T4D is committed at `61200da`.
- T4D precision fail-first: eight expected failures across precise cause and
  completion-ledger assertions.
- Corrected focused wall: 25/25 across formatter and route suites.
- Complete current wall: 1087/1087 across 148 suites; typecheck, build, offline
  eval, and diff checks pass; lint has zero errors/three pre-existing warnings.
- The tracked worktree is clean after the current `main` commit.

## Retrieval map

| Need | Retrieve |
|---|---|
| T4 architecture/results | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical T4C/T4D evidence | latest OAI-T4 entries in `docs/qa-loop-results.md` |
| Failure reason/cause contract | `lib/twoLayerFormatter.ts` |
| Route diagnostics/public failure | `lib/twoLayerRecommendationRoute.ts` |
| Diagnostic tests | `tests/twoLayerFormatter.test.mjs`, `tests/twoLayerRoute.test.mjs` |
| Provider terminal gates/ledger | `lib/twoLayerResearchAdapter.ts` |
| T1 card boundary | `lib/twoLayerRecommendation.ts` |
| Peer channel | `docs/agent-dialogue.md` entries [65]-[67] |

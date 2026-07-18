# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after committing the zero-live OAI-T4D attribution phase.
OAI-T1 is committed at `3b85e4c`, OAI-T2 at `2238f28`, OAI-T3 at `6a96690`,
OAI-T4A at `304d7ee`, the original T4B at `d943c67`, and the reviewed T4B
correction at `c22de3d`. T4C safe-failed, and its closeout plus T4D attribution
are committed together at current `main` HEAD. No provider call, replacement,
quality gate, verifier work, promotion, deployment, or push is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T4 section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [65] onward.
5. Retrieve the latest OAI-T4C and OAI-T4D entries in
   `docs/qa-loop-results.md` for canonical evidence.
6. Do not run another provider call without Taylor's separate explicit
   approval.

## Current architecture and flag state

- Missing, empty, or exact `legacy` mode still delegates to the unchanged
  legacy handler. Exact `two_layer` selects the background branch; other
  non-empty modes fail before provider creation. Legacy remains the default.
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
failure stage could not be reconstructed because the route retained no raw
provider response and collapsed downstream exceptions. The approval is spent.

## OAI-T4D zero-live attribution result

- The saved natural Terra fixture contains 380 captured source rows, of which
  25 have titles. A read-only replay using that 25-source title-present subset
  (the same filtering contract as `extractTwoLayerResponseSources`) passes the
  current formatter with five recommendations and 20 cited/registered sources.
  Feeding all 380 fixture rows directly is not route-equivalent and correctly
  fails `source_title`. The route-equivalent pass disproves universal formatter
  incompatibility but does not identify T4C's exact failure.
- `lib/twoLayerFormatter.ts` now types every formatter-owned rejection as
  `product_shape`, `source_registry`, `source_title`, or
  `extraction_validation`. Unknown non-formatter exceptions remain bounded as
  `unknown` until reproduced.
- `lib/twoLayerRecommendationRoute.ts` separates formatter reasons from
  `presentation_validation` and reports only the stage/reason through a
  server-only observer/default warning.
- The browser still receives the exact same generic HTTP 502
  `verification_failed` response. Diagnostics contain no exception text,
  prompt, answer, shopper prose, URL, token, provider ID, header, credential, or
  raw provider content. A throwing diagnostic sink cannot alter the response.
- No parser, prompt, trust, citation, source, card, commerce, or public-response
  rule was relaxed. No provider or direct-page call occurred.

## Next decision

The strongest evidence-producing next phase is one separately approved
**OAI-T4E diagnostic lifecycle smoke** with the same frozen Terra/high
configuration. Its purpose is not quality measurement: it is to capture the
bounded server stage/reason from one real completed response while verifying
that the browser still receives only the generic safe result. Use one OpenAI
create, at most 20 hosted searches, and a stated dollar ceiling derived from
T4C's prior `$7` ceiling. No retry, replacement, fallback, Serper, SearchAPI,
direct fetch, second response, extra case, flag promotion, deployment, or
transactional verifier.

If T4E completes successfully, stop and report before defining a quality gate.
If it fails, the new reason determines whether a zero-live generalized repair
is justified. Do not weaken a rule merely to turn the smoke green.

**Recommended reasoning level:** use **High** for any approved T4E smoke because
it handles live lifecycle evidence,
strict spend boundaries, and trust-safe failure attribution.

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
- Entries [58]-[66] contain the T1-T4 peer challenges and the new T4D review
  request. Dialogue remains advisory and authorizes no work.

## Verification state

- T4B correction at `c22de3d`: full wall 1081/1081 across 148 suites, plus
  typecheck, lint, build, offline eval, and browser walls green.
- T4C: one POST 202, same-job pending GETs 202, terminal GET 502
  `verification_failed`, safe UI error, zero browser warnings/errors, no cards.
- T4D fail-first: three expected failures.
- T4D corrected focused wall: 24/24 across formatter and route suites.
- Complete current wall: 1086/1086 across 148 suites; typecheck, build, offline
  eval, and diff checks pass; lint has zero errors/three pre-existing warnings.
- Generated `next-env.d.ts` drift was restored. T4C closeout and T4D are
  committed together at current `main` HEAD; the tracked worktree is clean.

## Retrieval map

| Need | Retrieve |
|---|---|
| T4 architecture/results | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical T4C/T4D evidence | latest two entries in `docs/qa-loop-results.md` |
| Failure reasons | `lib/twoLayerFormatter.ts` |
| Route observer/public failure | `lib/twoLayerRecommendationRoute.ts` |
| Attribution tests | `tests/twoLayerFormatter.test.mjs`, `tests/twoLayerRoute.test.mjs` |
| Provider terminal gates | `lib/twoLayerResearchAdapter.ts` |
| T1 card boundary | `lib/twoLayerRecommendation.ts` |
| Peer channel | `docs/agent-dialogue.md` entries [65]-[66] |

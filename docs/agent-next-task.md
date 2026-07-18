# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T4F citation-granular
safety correction. OAI-T1 through T4E are committed through `f89ac8a`; T4F is
the current `main` HEAD, `Handle unregistered citations safely`. No
live quality gate, retry, replacement, verifier work, flag promotion,
deployment, push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T4 section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [68] onward.
5. Retrieve the latest OAI-T4E/T4F entries in `docs/qa-loop-results.md`.
6. Do not run a provider call without Taylor's separate explicit approval.

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
- Completed research passes deterministic T2 formatting and T1 trust-card
  validation. Without an independent receipt, exact identity and commerce stay
  unverified and price, seller, availability, purchase URL, and image stay
  absent.
- `.env.local` has no pipeline-mode or job-token-secret entry. Last recorded
  persistent local state remains constraint allocation on and narration off.

## OAI-T4E evidence that selected T4F

Taylor approved one Terra/high response for broad U.S. `vacuum cleaner`. The
real UI submitted once, POST returned 202, every later request retrieved the
same signed job, and the first terminal result was the generic HTTP 502
`verification_failed`. The exact server-only cause was
`formatter/source_registry/cited_source_unregistered`.

The completed response used the requested/returned `gpt-5.6-terra`, 109,661
input tokens, zero cached input, 20,327 output tokens, 129,988 total tokens, 12
hosted searches, and 20 titled sources. Observed click-to-terminal time was
approximately 272.6 seconds. Frozen July 15 rates estimate `$0.6990575`, not an
asserted invoice. The approval is spent; no retry or replacement occurred.

## OAI-T4F completed behavior

- The formatter registers only title-present sources owned by the same provider
  response and exposes only cited URLs in that registry.
- An extra unregistered or titleless citation is ignored, never exposed or
  bound, and counted only as `ignoredUnregisteredCitationUrlCount` in bounded
  server diagnostics.
- Text containing only an ignored citation receives no substituted fallback
  source. A claim supported only by it remains `AI research synthesis`.
- A recommendation whose required Sources section has no registered source
  still fails the complete result with `product_registered_source_missing`.
- Deterministic extraction stays verbatim. Presentation separately converts
  standard Markdown links to visible labels in identity, assessment, pros,
  cons, claims, and source titles. Registered hrefs remain only in the source
  catalog.
- Product count/order, registered citation binding, trust states, no-receipt
  commerce omissions, the generic public failure, and legacy-default mode are
  unchanged. No card dropping, parser repair, discovery, source substitution,
  backfill, rerank, or commerce attachment was added.

## Next decision

There is no approved-pending implementation or live phase. The strongest next
step is a separately approved **zero-live OAI-T5A quality-gate design**, not
another one-off lifecycle smoke.

T5A should use T4E's actual cost, search count, and latency to freeze one small
decision-useful sample and its absolute bars before any spend. The later live
window should do two jobs at once: confirm that T4F completes through the real
route and decide whether the two-layer output is useful and stable enough to
continue. At minimum the design must predeclare:

1. frozen broad and constrained shopper requests;
2. recommendation usefulness and hard-requirement scoring;
3. per-product registered-source presence and ignored-citation reporting;
4. formatter/card completion, unsafe transactional leakage, and public-failure
   bars;
5. repeatability treatment, latency/cost reporting, and a total provider/tool
   budget; and
6. a stop rule that prevents another open-ended test/fix/retest loop.

Do not start T5A or a live window without Taylor's next explicit approval.

**Recommended reasoning level:** Highest for T5A. The task is not difficult
coding; it is choosing a small experiment that can honestly decide whether the
architecture advances product quality without creating another measurement
loop.

## Hard boundaries

- No live OpenAI, Serper, SearchAPI, direct-fetch, source-page, retry, or
  replacement call is approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, push,
  publish, or alter production.
- Do not expose or persist shopper prose, full prompts/answers, source paths,
  job tokens, provider IDs, request headers, API keys, or raw provider responses.
- Do not weaken exact identity, product eligibility, citation ownership, source
  labels, or no-receipt transactional omissions to make a response pass.
- No product-, brand-, retailer-, category-, publisher-, benchmark-, or
  fixture-specific production rule.
- Preserve all pre-existing untracked artifacts and live fixtures. Stage only
  explicit phase files; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of older OAI lifecycle and
  unguarded-diagnostic conclusions.
- Entries [58]-[69] contain the T1-T4 challenges and T4F review request.
  Dialogue remains advisory and authorizes no work.

## Verification and repository state

- T4F fail-first: six expected failures.
- Focused formatter/route wall: 28/28.
- Complete suite: 1090/1090 across 148 suites.
- Typecheck, production build, offline evaluation, and diff checks pass.
- Lint: zero errors and the same three pre-existing warnings.
- Zero live calls in T4F. `.env.local`, flags, secrets, tracked fixtures,
  deployment, and production state are unchanged.
- Preserve the pre-existing untracked transfer kits, baseline files, and live
  fixtures; they are outside T4F.

## Retrieval map

| Need | Retrieve |
|---|---|
| T4 architecture/results | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical T4E/T4F evidence | latest entries in `docs/qa-loop-results.md` |
| Citation partition and product floor | `lib/twoLayerFormatter.ts` |
| Display-text URL removal | `lib/twoLayerDisplayText.ts` |
| Card trust/presentation boundary | `lib/twoLayerRecommendation.ts` |
| Route source catalog/public behavior | `lib/twoLayerRecommendationRoute.ts` |
| T4F regression wall | `tests/twoLayerFormatter.test.mjs`, `tests/twoLayerRoute.test.mjs` |
| Adapter titleless-source control | `tests/twoLayerResearchAdapter.test.mjs` |
| Peer channel | `docs/agent-dialogue.md` entries [68]-[69] |

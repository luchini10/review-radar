# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the approved OAI-T4E diagnostic lifecycle
smoke. OAI-T1 through the T4D precision correction are committed through
`7bd3686`. T4E canonical evidence is recorded locally but remains uncommitted
pending Taylor's review/commit instruction. No retry, replacement, T4F
correction, quality gate, verifier work, promotion, deployment, or push is
approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T4 section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [67] onward.
5. Retrieve the latest OAI-T4D/T4E entries in `docs/qa-loop-results.md`.
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
- T4E used process-only `REVIEW_RADAR_PIPELINE_MODE=two_layer` and an ephemeral
  random job-token secret. The server is stopped. `.env.local` was not edited.
- Last recorded persistent local state remains constraint allocation on,
  narration off, with no pipeline-mode or job-token-secret entry.

## OAI-T4E live result

Taylor approved exactly one Terra/high Responses create, at most 20 hosted
searches, and a `$7` ceiling for broad U.S. `vacuum cleaner` with no budget or
preferences. The real UI submitted one request. POST returned HTTP 202 in 4.4
seconds, and every later request retrieved only that same signed background
job. The first terminal result was HTTP 502 `verification_failed`; there was no
retry, replacement, fallback, Serper, SearchAPI, direct fetch, second response,
cache reuse, additional case, helper model, source-page open, promotion,
deployment, or push.

The response completed on the requested and returned `gpt-5.6-terra` model. Its
sanitized ledger recorded 109,661 input tokens, zero cached input tokens,
20,327 output tokens, 129,988 total tokens, 12 hosted web searches, and 20
titled response sources. The terminal retrieve took 802 ms; observed UI
click-to-terminal capture was approximately 272.6 seconds. Using the frozen
July 15 Terra rates already recorded in the repository—`$2.50` per million
input tokens, `$15` per million output tokens, and `$0.01` per hosted
search—the estimated cost is `$0.6990575`, not an asserted provider invoice.

The exact bounded rejection was:

```text
formatter / source_registry / cited_source_unregistered
```

The browser received only the generic safe error, displayed zero cards and no
transactional fields, and recorded zero warning/error console messages. No raw
prompt, answer, source path, provider response ID, token, header, secret, or
provider response was retained.

## What T4E proves and does not prove

- The background/UI lifecycle works consistently: one create, same-job polling,
  safe terminal handling, and no fallback or partial-card leak.
- Terra performed substantial research; this was not a no-search, no-source,
  refusal, empty-text, or model-mismatch failure.
- At least one Markdown citation URL in the model-authored product blocks did
  not match the title-present response-source registry after conservative URL
  canonicalization. The current formatter rejects the complete slate when any
  such URL exists.
- The retained bounded evidence cannot distinguish whether that URL was never
  response-owned, existed only in a titleless provider source that the adapter
  filtered out, or differed by an identity-bearing URL component that the
  conservative canonicalizer correctly preserved. Claiming one of those as the
  root cause would be speculation.
- The product objective did not move in T4E: the live customer-visible result
  remains zero cards. What moved is attribution—the next decision can now
  target the actual blast-radius policy rather than the provider lifecycle.

## Next decision

The strongest next step is a separately approved **zero-live OAI-T4F
citation-granular safety correction**, not another provider response.

Current whole-slate rejection is safe but unnecessarily coarse. T4F should
prove a narrower generalized contract with fail-first tests before changing
behavior:

1. Convert Markdown links in every displayable text field to their visible
   label, so no raw model-authored URL is rendered as prose.
2. Register and expose only title-present URLs owned by the same provider
   response.
3. Ignore an unregistered citation URL rather than expose or bind it, and count
   that omission only in bounded server diagnostics.
4. Downgrade a claim supported only by an ignored citation to `AI research
   synthesis`; never substitute another URL or source.
5. Continue to fail closed when a recommendation's required Sources section
   has no registered source at all. Do not add card dropping, backfilling,
   reranking, source discovery, or parser repair in this correction.
6. Preserve registered citations, product count/order, T1 trust states,
   no-receipt commerce omissions, and the generic public failure contract.

Required controls include mixed registered/unregistered citations, an
unregistered-only product, URL non-disclosure in every card text field,
claim-local downgrade, unchanged registered-source binding, bounded omission
counts, observer failure, and the complete offline wall. T4F gets zero live
calls and does not authorize another smoke.

This is a material trust/public-behavior decision: a response previously
rejected in full could safely render when every product still has registered
evidence. Do not implement it without Taylor's approval.

**Recommended reasoning level:** **Highest** for T4F. Although zero-live, it
changes the boundary between whole-result rejection and claim-level downgrade,
so the main risk is a subtle citation-trust regression rather than mechanical
implementation.

## Hard boundaries

- T4E's one-response approval is spent. No live OpenAI, Serper, SearchAPI,
  direct-fetch, source-page, retry, or replacement call is approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, start
  a quality/repeatability gate, or build transactional verification without
  separate approval.
- Do not expose or persist shopper prose, full prompts/answers, source paths,
  job tokens, provider IDs, request headers, API keys, or raw provider responses.
- Do not weaken exact identity, product eligibility, citation ownership,
  source labels, or no-receipt transactional omissions merely to make a
  response pass.
- No product-, brand-, retailer-, category-, publisher-, benchmark-, or
  fixture-specific production rule.
- Preserve all pre-existing untracked artifacts and live fixtures. Stage only
  explicit phase files; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of older OAI lifecycle and
  unguarded-diagnostic conclusions.
- Entries [58]-[68] contain the T1-T4 peer challenges and the T4F policy review
  request. Dialogue remains advisory and authorizes no work.

## Verification and repository state

- Pre-T4E committed wall at `7bd3686`: focused 25/25, complete 1087/1087 across
  148 suites, typecheck, build, offline eval, and diff checks green; lint zero
  errors/three pre-existing warnings.
- T4E: one POST 202, same-job GETs only, terminal 502
  `verification_failed`; exact server cause recorded above.
- Browser: zero cards, no transactional fields, safe error, zero warning/error
  console messages.
- Server stopped; port 3000 has no listener. `.env.local` contains no pipeline
  mode or job-token secret. Generated `next-env.d.ts` drift was restored.
- Only the four authoritative T4E documentation surfaces are modified and
  uncommitted; tracked production/test code is unchanged.

## Retrieval map

| Need | Retrieve |
|---|---|
| T4 architecture/results | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical T4E evidence | latest entry in `docs/qa-loop-results.md` |
| Failure reason/cause contract | `lib/twoLayerFormatter.ts` |
| Source extraction/ledger | `lib/twoLayerResearchAdapter.ts` |
| Route diagnostics/public failure | `lib/twoLayerRecommendationRoute.ts` |
| Proposed T4F test seams | `tests/twoLayerFormatter.test.mjs`, `tests/twoLayerRoute.test.mjs` |
| T1 card boundary | `lib/twoLayerRecommendation.ts` |
| Peer channel | `docs/agent-dialogue.md` entries [67]-[68] |

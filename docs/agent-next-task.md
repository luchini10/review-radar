# ReviewRadar Agent Handoff

Updated: 2026-07-17 by Codex after the zero-live OAI-T4B default-off route and
UI integration. OAI-T1 is committed at `3b85e4c`, OAI-T2 at `2238f28`, OAI-T3
at `6a96690`, and OAI-T4A at `304d7ee`. OAI-T4B is complete and committed at
the current `main` HEAD; no later phase is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T1 through OAI-T4 sections of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [61] onward, especially [63].
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.
6. Do not start T4C without Taylor's separate approval.

## Current state

- The production recommendation route now has a server-only mode dispatcher.
  Missing, empty, or exact `legacy` delegates to the unchanged legacy POST
  handler. Exact `two_layer` selects the new branch. Any other non-empty value
  fails closed before provider creation.
- The default user-visible path remains legacy. T4B did not edit `.env.local`,
  promote a mode, deploy, or call a provider.
- The two-layer branch validates the existing shopper request, deterministically
  builds the versioned natural master prompt, starts one Terra/high background
  response with hosted search, and returns HTTP 202 with a signed app job token.
- GET verifies the token and retrieves only that response. Pending remains 202;
  completion runs the deterministic OAI-T2 formatter and OAI-T1 card builder
  with `receiptInputs: []`. DELETE verifies the same token and cancels only that
  response.
- Every OpenAI SDK instance in the branch uses `maxRetries: 0`. There is no
  Serper, SearchAPI, helper-model, second-response, retry, replacement, legacy
  helper, or legacy fallback path.
- The browser accepts the unchanged `{ result: RecommendationResult }` legacy
  body or the versioned two-layer state union. It polls only the returned token,
  adopts the signed job expiry only after a valid pending state, and sends one
  independent DELETE when cancelling a known job.
- The real results page reuses `TwoLayerResults`; it does not coerce two-layer
  cards into the legacy schema. Model research is visibly synthesis or source-
  reported. With no receipts, price, seller, availability, purchase URL, image,
  and exact-identity verification remain absent while the recommendation stays.
- The public two-layer response contains state, cards, and the display-source
  catalog only. It does not contain the complete prompt, raw answer, raw source
  envelope, provider response ID, credentials, headers, or cookies.
- RR-091 and RR-092 remain Needs Investigation. The issue register was not
  changed by T4B.

## Signed job and failure contract

- `oai-two-layer-job-v2` HMAC-signs the response ID, prompt version,
  request-specific prompt hash, issue time, and expiry. It contains no shopper
  prose, prompt text, answer text, source URL, or credential.
- The secret must be at least 32 bytes; lifetime cannot exceed 30 minutes. T4B
  currently issues a 10-minute token. Tampered, malformed, future-issued, and
  expired tokens fail closed before provider creation.
- Invalid shopper input, invalid mode/configuration, create/retrieve/cancel
  failure, terminal or incomplete provider states, missing web search/text/title,
  malformed headings, unregistered sources, T2 failure, and T1 failure expose
  safe bounded errors. No raw provider exception is returned or logged.
- Stateless cancellation has one explicit residual race: if the user cancels
  before POST returns a signed token, the browser cannot name and cancel a
  provider response the server may already have created. Do not hide this in
  T4C evidence.

## Current local secret and flag state

- T4B did not read or modify ignored `.env.local`.
- The last recorded local state is
  `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on` and
  `REVIEW_RADAR_LLM_NARRATION=off`.
- The last recorded state has no `REVIEW_RADAR_PIPELINE_MODE` or
  `REVIEW_RADAR_JOB_TOKEN_SECRET`; therefore legacy remains the only visible
  path unless Taylor independently changes local configuration.
- `.env.example` now documents `REVIEW_RADAR_PIPELINE_MODE=legacy` and the blank
  server-only job-token secret. Never reuse an API key as that secret and never
  prefix it with `NEXT_PUBLIC_`.
- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-only
  ignored secrets. Never print, log, copy into evidence, or commit them.

## OAI-T4B implementation result

The phase added these production seams without changing the default path:

1. `app/api/recommendations/route.ts` — exact legacy/two-layer dispatcher plus
   POST/GET/DELETE exports; the original legacy factory remains intact.
2. `lib/twoLayerRecommendationRoute.ts` — safe start/poll/cancel route handlers,
   T2 formatting, and T1 card construction.
3. `lib/twoLayerApiContract.ts` — versioned pending/completed/cancelled/failed
   public states and browser guards.
4. `lib/recommendationClient.ts` — one-POST legacy/two-layer client, same-token
   polling, bounded expiry, and one-DELETE cancellation.
5. `app/page.tsx` and `components/TwoLayerResultPreview.tsx` — production state
   handling and reuse of the T3 trust renderer.
6. `.env.example` — server-only mode and secret documentation.

Fail-first evidence was three expected failures: the route and browser modules
did not exist, and the old token did not authenticate the prompt hash needed by
a stateless GET. The new tests prove exact mode selection, legacy delegation,
configuration-before-provider failure, one create, same-response polls,
same-response cancel, no SDK retry, safe public bodies, malformed/expired token
failure, browser polling, and one-DELETE cancellation.

## Next decision — peer review before OAI-T4C

Taylor authorized the T4B commit. The immediate next step is the roadmap's
required adversarial peer review of T4A/T4B before any live work. Dialogue
entry [63] asks Claude to challenge the
signed prompt-hash token, background terminal-state union, and pre-token cancel
race, while the older T1-T3 trust-label/source-title questions also remain open.

Only after that review passes should Taylor consider **OAI-T4C**, one separately
budgeted Terra background lifecycle smoke through the real route and UI. T4C is
not a quality, repeatability, promotion, or transactional-verifier phase.

**Recommended reasoning level:** use **Highest** for the T4B adversarial peer
review because authentication-like tokens, lifecycle states, privacy, and
legacy equivalence are load-bearing. Once that review is closed, **High** is
sufficient for the bounded mechanical T4C smoke.

## Hard boundaries

- No live OpenAI, Serper, SearchAPI, or direct-fetch call is approved. Every
  earlier live approval is spent.
- Do not start T4C, edit `.env.local`, create a real job secret,
  promote the mode, deploy, run a quality window, or build transactional
  verification without separate explicit approval.
- Do not rerun/retune the old unguarded diagnostic, H2, H2B, H2C, or rejected
  strict-slate pipeline; do not weaken exact identity or trust labels.
- Never persist or log keys, credentials, headers, cookies, shopper prose,
  complete prompts, complete answers, source-path URLs, raw provider response
  IDs, provider exception messages, or complete raw provider responses.
- No product-, brand-, retailer-, category-, publisher-, benchmark-, or
  fixture-specific production rule.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of the older OAI lifecycle and
  unguarded diagnostic conclusions.
- Entries [58]-[60] ask Claude to challenge the T1 boundary, T2 parser, and T3
  trust presentation.
- Entries [61]-[62] ask Claude to challenge the T4 architecture and T4A
  foundation. Entry [63] adds the concrete T4B route, token-v2, browser, and
  cancellation questions.
- Peer dialogue is advisory and authorizes no commit, phase, live call, flag, or
  deployment. Taylor remains the sole approver.

## Verification

- Fail-first: three expected failures before implementation.
- Focused T1-T4 wall: 56/56 across eight suites.
- Route/client/token lifecycle: 16/16.
- Complete `npm test`: 1073/1073 across 147 suites.
- `npm run typecheck`, targeted ESLint, `npm run build`,
  `node scripts/eval-pipeline.mjs`, and `git diff --check`: pass.
- Full `npm run lint`: zero errors and three pre-existing warnings.
- `npm run test:e2e -- --project=chromium --workers=1`: 15/15, including
  desktop and 390px mobile polling, no horizontal overflow, one-DELETE
  cancellation, and the legacy UI.
- The default parallel Playwright run was locally unstable because the Next
  development server reset under six workers; the complete sequential run is
  the canonical T4B browser evidence.
- Targeted privacy scanning found no secret, raw answer, raw response body,
  provider response ID, debug logging, `.env.local` edit, or tracked live
  fixture in the intended T4B files.

## Retrieval map

| Need | Retrieve |
|---|---|
| Detailed T4 architecture and gates | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical T4B evidence | latest entry in `docs/qa-loop-results.md` |
| Mode dispatcher and unchanged legacy factory | `app/api/recommendations/route.ts` |
| Two-layer route lifecycle | `lib/twoLayerRecommendationRoute.ts` |
| Versioned public union | `lib/twoLayerApiContract.ts` |
| Browser polling/cancel | `lib/recommendationClient.ts`, `app/page.tsx` |
| Signed stateless token | `lib/twoLayerJobToken.ts` |
| Prompt and provider adapter | `lib/twoLayerMasterPrompt.ts`, `lib/twoLayerResearchAdapter.ts` |
| Formatter and trust boundary | `lib/twoLayerFormatter.ts`, `lib/twoLayerRecommendation.ts` |
| Shared trust renderer | `components/TwoLayerResultPreview.tsx` |
| Mocked route/browser proof | `tests/twoLayerRoute.test.mjs`, `tests/twoLayerClient.test.mjs`, `e2e/home.spec.ts` |
| Peer challenge | `docs/agent-dialogue.md` entries [61]-[63] |

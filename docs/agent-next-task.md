# ReviewRadar Agent Handoff

Updated: 2026-07-17 by Codex after the zero-live OAI-T4A isolated
implementation. OAI-T1 is committed at `3b85e4c`, OAI-T2 at `2238f28`, and
OAI-T3 at `6a96690`. OAI-T4 planning plus T4A implementation are complete in
the current history. OAI-T4B is not approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-T1 through OAI-T4.
4. Read `docs/agent-dialogue.md` from entry [61] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.
6. Do not start T4B from this handoff; Taylor must authorize it separately.

## Current state

- Production and `/api/recommendations` remain unchanged. Legacy is the only
  user-visible path. No two-layer dispatcher, job route, mode flag, job secret,
  or frontend integration exists.
- OAI-T1 freezes the recommendation-versus-transactional trust boundary. OAI-T2
  deterministically formats the natural Terra answer. OAI-T3 presents the
  resulting trust states on an unlinked development-only page.
- OAI-T4A adds only isolated server-side foundations:
  `lib/twoLayerMasterPrompt.ts`, `lib/twoLayerJobToken.ts`, and
  `lib/twoLayerResearchAdapter.ts`. Nothing imports them from the production
  route or browser bundle.
- `oai-two-layer-master-prompt-v1` is now reviewed source code, not a fixture
  dependency. It contains stable natural Markdown instructions and one
  canonical delimited `NormalizedShopperRequest` data block, including all
  original shopper fields. It contains no benchmark answer, candidate slate,
  hidden product seed, or fake example URL.
- The adapter freezes one `gpt-5.6-terra`/high background create with
  `store: false`, required hosted web search, 20 tool calls maximum, 24,000
  output tokens maximum, and full web-search source inclusion. Start, retrieve,
  and cancel are each single-shot; there is no sleep loop, retry, replacement,
  Serper, SearchAPI, second model call, or legacy fallback.
- Poll completion returns natural research text plus response-owned titled
  source metadata to the authorized server caller. Its ledger contains only
  prompt/version hashes, model/status, duration, bounded usage, source
  count/hosts, hashed response ID, and failure code—not shopper prose, prompt,
  answer, source path, credentials, raw response, or provider exception text.
- `oai-two-layer-job-v1` is an HMAC-SHA-256 token with response ID, prompt
  version, issue time, and expiry only. It requires a secret of at least 32
  bytes, has a 30-minute maximum lifetime, verifies signatures in constant time,
  and fails closed on tampering, expiry, or malformed content.
- Missing receipts still keep a recommendation while exposing no price, seller,
  availability, purchase URL, or image. Exact model/variant identity remains
  visibly unverified until independent receipts exist.
- RR-091 and RR-092 remain Needs Investigation. The register remains 92 total /
  85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-side
  in ignored `.env.local`. Never print, log, copy into evidence, or commit them.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- `REVIEW_RADAR_PIPELINE_MODE` and `REVIEW_RADAR_JOB_TOKEN_SECRET` do not exist.
- Legacy remains the only user-visible path.

## Completed OAI-T4A decision and implementation

T4A deliberately implements the smallest testable foundation before route
work:

1. Deterministic code—not another OpenAI call—inserts category, budget,
   Important Details, Smart Features, hard constraints/dealbreakers, normalized
   requirements, and original fields into the versioned prompt.
2. The provider contract is natural text, not the rejected strict final-slate
   schema. It starts exactly one background research response.
3. Caller-owned polling retrieves only the same response. Mismatched provider
   response IDs, failed/cancelled/incomplete/refused states, no search, and no
   text fail closed.
4. The source registry uses only response-owned source URLs and titles. Missing
   metadata is not inferred; the T2 formatter rejects a cited unregistered or
   untitled source.
5. Signed tokens are stateless and contain no user or research content. T4B may
   later use this contract without adding a database.
6. No operational diagnostic can serialize the shopper request, complete
   prompt, complete answer, source paths, response ID, or exception message.

## Next decision - OAI-T4B remains unapproved

After adversarial review, the strongest next implementation candidate is
**OAI-T4B**, a separately approved zero-live phase. It would add an exact
default-off route dispatcher, signed POST/GET/DELETE job states, a versioned
two-layer response union, and the real T3 renderer while proving the legacy path
byte- and call-order-equivalent. T4C remains a still-later, separately budgeted
one-response live lifecycle smoke, not a quality or promotion gate.

**Recommended reasoning level:** Use Highest for T4B because it touches the real
route, authentication-like token handling, legacy compatibility, browser
polling/cancellation, and public failure states.

## Hard boundaries

- No live provider call is approved. All earlier OpenAI, Serper, SearchAPI, and
  direct-fetch approvals are spent.
- Do not rerun or retune the unguarded diagnostic, H2, H2B, or H2C; do not try a
  replacement provider or weaken exact identity.
- Do not start T4B, add a route or UI integration, create a mode flag/job secret,
  edit `.env.local`, deploy, run a quality window/holdout, promote, or clean up
  without separate explicit approval.
- Never persist or log API keys, credentials, request headers, cookies, shopper
  prose, complete prompts, complete answers, source-path URLs, raw response IDs,
  provider exception messages, or complete raw provider responses.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters prompts, queries, verification, ranking, or app
  behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked. Stage
  explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of the OAI lifecycle and
  unguarded diagnostic conclusions.
- Entries [58]-[60] ask Claude to challenge the T1 boundary, T2 parser, and T3
  trust presentation.
- Entry [61] asks Claude to challenge the T4 job/token architecture and
  no-receipt state. Entry [62] adds the concrete T4A prompt, token, lifecycle,
  source-normalization, and failure contracts for adversarial review.
- Peer dialogue is advisory and authorizes no commit, phase, live call, or
  behavior change. Taylor remains the sole approver.

## Verification

- Fail-first: all three new suites failed with `ERR_MODULE_NOT_FOUND` before
  implementation.
- OAI-T4A focused wall: 20/20 across three suites.
- Combined T1-T4 compatibility wall: 45/45 across five suites.
- Complete `npm test`: 1062/1062 across 144 suites.
- `npm run typecheck`, targeted ESLint, `npm run build`,
  `node scripts/eval-pipeline.mjs`, and `git diff --check`: pass.
- Full `npm run lint`: zero errors and three pre-existing unused-variable
  warnings.
- Browser QA was not applicable because T4A touched no route, page, component,
  or public response. T4B must perform the mocked desktop/mobile lifecycle QA.
- The intended phase diff contains no secret, raw live response, tracked live
  fixture, route/UI change, flag, or `.env.local` edit.

## Retrieval map

| Need | Retrieve |
|---|---|
| Detailed T4 architecture and gates | OAI-T4 section in `docs/forward-roadmap.md` |
| Canonical T4A result | latest entry in `docs/qa-loop-results.md` |
| Versioned natural master prompt | `lib/twoLayerMasterPrompt.ts` |
| Signed stateless job token | `lib/twoLayerJobToken.ts` |
| Background create/retrieve/cancel adapter | `lib/twoLayerResearchAdapter.ts` |
| Deterministic shopper normalization | `lib/autonomousResearchContract.ts` |
| OAI-T2 formatter | `lib/twoLayerFormatter.ts` |
| OAI-T1 trust boundary | `lib/twoLayerRecommendation.ts` |
| OAI-T3 trust renderer | `components/TwoLayerResultPreview.tsx` |
| Current production route | `app/api/recommendations/route.ts` |
| Peer challenge | `docs/agent-dialogue.md` entries [61]-[62] |

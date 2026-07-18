# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T4B corrective phase.
OAI-T1 is committed at `3b85e4c`, OAI-T2 at `2238f28`, OAI-T3 at `6a96690`,
OAI-T4A at `304d7ee`, and the original T4B at `d943c67`. The reviewed T4B
correction was first committed at `f45d11a` and is included in the current
amended `main` HEAD. T4C is not approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the OAI-T1 through OAI-T4 sections of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [58] onward, especially [64].
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.
6. Do not start T4C without Taylor's separate approval.

## Current state

- Missing, empty, or exact `legacy` mode still delegates to the unchanged legacy
  POST handler. Exact `two_layer` selects the new branch; any other non-empty
  mode fails closed before provider creation. Legacy remains the default.
- The two-layer branch performs one Terra/high background Responses create with
  hosted search, no SDK retry, no Serper/SearchAPI/helper model/second response,
  and no legacy fallback. GET retrieves only that response; DELETE cancels only
  that response.
- The browser accepts the unchanged legacy `{ result }` body or the versioned
  two-layer state union. Two-layer completion runs the deterministic T2
  formatter and T1 card builder with `receiptInputs: []`, then renders the T3
  trust cards directly.
- Without independent receipts, price, seller, availability, purchase URL,
  image, and exact identity remain unverified or absent. RR-091 and RR-092
  remain Needs Investigation; this correction did not change the register.
- The July 18 correction changed only the default-off two-layer boundary. It
  made no live call, did not read or edit `.env.local`, did not promote a flag,
  did not create a real secret, and did not deploy.

## Corrected job and trust contract

- `oai-two-layer-job-v3` uses AES-256-GCM authenticated encryption. A 32-byte
  key is derived from the server-only secret with HKDF; each token gets a fresh
  96-bit nonce and 128-bit authentication tag. The provider response ID, prompt
  version/hash, and timestamps are not client-decodable.
- GET and DELETE carry the app token only in `x-reviewradar-job-token`.
  Query-string tokens are rejected. Tampered, malformed, wrong-secret,
  future-issued, and expired tokens fail before provider creation.
- The client shortens its final poll sleep and attempts one DELETE 30 seconds
  before token expiry. This is best-effort: browser suspension can delay it, and
  cancellation before POST returns a token still cannot identify a response
  the server may already have created.
- A specification, performance, owner, or support claim is `Source-reported`
  only when that exact claim bullet contains a registered citation. An uncited
  claim remains visible as `AI research synthesis` with no source IDs.
- Current response metadata does not establish source semantics, so headings
  cannot label a source as official, professional, owner, or purchase evidence.
  Such sources display the neutral `Research source` label.
- Shared source-URL canonicalization removes only a narrow explicit set of
  analytics/click parameters. It preserves all other query parameter order and
  values, plus fragments, including `sku`, `variant`, `pid`, `id`, and
  ambiguous `ref`.

## Current local secret and flag state

- The correction did not read or modify ignored `.env.local`.
- Last recorded local state:
  `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on` and
  `REVIEW_RADAR_LLM_NARRATION=off`.
- Last recorded state has no `REVIEW_RADAR_PIPELINE_MODE` or
  `REVIEW_RADAR_JOB_TOKEN_SECRET`, so the visible path remains legacy unless
  Taylor independently changes local configuration.
- Never reuse an API key as the job-token secret or prefix a secret with
  `NEXT_PUBLIC_`. Never print/log/copy API keys, tokens, request headers,
  shopper prose, full prompts/answers, source paths, or raw provider responses.

## Next decision — OAI-T4C approval

The T4B correction is committed and its independent review is complete. The
review found no runtime or security defect in the AEAD format, header-only
transport, pre-expiry behavior, claim-local citation handling, neutral source
labels, or conservative URL rules. A focused nine-suite review rerun passed
64/64. OpenAI's documented temporary background-response retention supports
the current polling design; no provider call was made during the review.

Taylor may separately consider OAI-T4C: one explicitly budgeted Terra
background lifecycle smoke through the real route/UI. T4C remains unapproved,
and the older Claude peer-review requests remain advisory outstanding debt.

**Recommended reasoning level:** use **High** for the bounded T4C smoke because
it crosses the real provider lifecycle and must distinguish integration failure
from expected background timing without reopening the reviewed architecture.

## Hard boundaries

- No live OpenAI, Serper, SearchAPI, direct-fetch, or source-page call is
  approved. Every earlier live approval is spent.
- Do not start T4C, edit `.env.local`, create a real job secret, promote a mode,
  deploy, run a quality window, or build transactional verification without
  separate explicit approval.
- Do not rerun/retune old diagnostics or rejected architectures; do not weaken
  exact identity, product eligibility, evidence validation, or trust labels.
- No product-, brand-, retailer-, category-, publisher-, benchmark-, or
  fixture-specific production rule.
- Preserve all pre-existing untracked artifacts and live fixtures. Stage only
  explicit phase files; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of older OAI lifecycle and
  unguarded-diagnostic conclusions.
- Entries [58]-[60] ask Claude to challenge the T1 boundary, T2 parser, and T3
  presentation. Entries [61]-[63] cover T4 architecture and the original T4B.
- Entry [64] is the load-bearing current review request. Peer dialogue is
  advisory and authorizes no commit, phase, live call, flag, or deployment.

## Verification

- Fail-first: 28/40 passed; 12 expected failures reproduced the five defects.
- Corrected focused wall: 59/59 across eight suites.
- Complete `npm test`: 1081/1081 across 148 suites.
- `npm run typecheck`, `npm run build`, `node scripts/eval-pipeline.mjs`, and
  `git diff --check`: pass.
- `npm run lint`: zero errors and three pre-existing warnings.
- `npm run test:e2e -- --project=chromium --workers=1`: 15/15.
- Focused two-layer Playwright: 3/3.
- Post-commit independent review: no runtime/security blocker; focused nine-
  suite rerun 64/64.
- Zero live/provider calls; `.env.local`, flags, deployment, and live fixtures
  were untouched.

## Retrieval map

| Need | Retrieve |
|---|---|
| Detailed architecture and gates | OAI-T4 in `docs/forward-roadmap.md` |
| Canonical corrective evidence | latest entry in `docs/qa-loop-results.md` |
| AEAD token | `lib/twoLayerJobToken.ts` |
| Header and expiry contract | `lib/twoLayerApiContract.ts`, `lib/recommendationClient.ts` |
| Route lifecycle | `lib/twoLayerRecommendationRoute.ts` |
| Claim/source trust | `lib/twoLayerFormatter.ts`, `lib/twoLayerRecommendation.ts` |
| Source URL identity rules | `lib/twoLayerSourceUrl.ts`, `lib/twoLayerResearchAdapter.ts` |
| Mocked proof | `tests/twoLayer*.test.mjs`, `e2e/home.spec.ts` |
| Peer challenge | `docs/agent-dialogue.md` entry [64] |

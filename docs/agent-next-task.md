# ReviewRadar Agent Handoff

Updated: 2026-07-17 by 🟧 Codex after the local OAI-T3 trust-state UI phase.
OAI-T1 is committed at `3b85e4c`; OAI-T2 is committed at `2238f28`; and OAI-T3
is committed in the current history after Taylor's explicit authorization.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` at OAI-T1 through OAI-T3.
4. Read `docs/agent-dialogue.md` from entry [58] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable, H3 as blocked,
   and OAI-T4 as unapproved.

## Current state

- Production and the current recommendation route remain unchanged. Legacy is
  the only user-visible path. No two-layer production flag, deployment, or
  production integration exists.
- OAI-T1 separates Terra-owned recommendation reasoning from deterministic
  exact-identity/commerce receipts. OAI-T2 deterministically formats the
  universal master prompt's numbered Markdown without a second model call.
- OAI-T3 adds an unlinked development-only `/oai-t3-preview` route with three
  generic controlled cards. It demonstrates unverified, verified, and close-
  match trust states without consuming saved live evidence or provider data.
- The preview labels model reasoning as `AI research synthesis`, cited factual
  prose as `Source-reported`, and receipt-backed fields as `Independently
  verified`. Missing receipts show `Check current price`, no purchase link, no
  image, and an exact-identity warning while preserving rank and recommendation.
- Desktop and 390px mobile browser QA pass after correcting a reproduced
  non-wrapping-badge overflow. Production returns HTTP 404 for the preview.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total / 85
  Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-side
  in ignored `.env.local`. Never print, log, copy into evidence, or commit them.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/two-layer production flag exists.
- Legacy remains the only user-visible path.

## Next task - owner review; OAI-T4 unapproved

Taylor should review the committed OAI-T3 trust presentation and decide whether
its labels and missing-field states are clear enough. If accepted, the strongest
next candidate is a separate zero-live OAI-T4 planning/preflight phase for the
smallest default-off route integration seam and honest failure states. Do not
start it from this handoff.

Before that plan, challenge whether route integration advances the actual
objective: trustworthy, materially better product recommendations. If the UI
requires hiding uncertainty or adding unverified fields to look complete, stop;
that would be a regression, not progress.

**Recommended reasoning level:** Highest for OAI-T4 planning. It is the first
step that could connect the new architecture to the application route, so
fallback behavior, public response contracts, and failure semantics need the
strongest review. High remains sufficient for reviewing the current UI alone.

## Hard boundaries

- No live provider call is approved. All earlier OpenAI, Serper, SearchAPI, and
  direct-fetch approvals are spent.
- Do not rerun or retune the unguarded diagnostic, H2, H2B, or H2C; do not try a
  replacement provider or weaken exact identity.
- No OpenAI call, web search, external page fetch, H3, OAI-T4, production route
  integration, mode flag, `.env.local` change, deployment, quality window,
  holdout, promotion, or cleanup without separate explicit approval.
- Never persist API keys, credentials, request headers, cookies, or complete raw
  provider/API responses. Live evidence remains sanitized and untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked. Stage
  explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of the OAI lifecycle and
  unguarded diagnostic conclusions.
- Entries [58]-[60] ask Claude to challenge the T1 field boundary, T2 parser,
  and T3 trust presentation.
- Peer dialogue is advisory and does not authorize a commit, phase, live call,
  or behavior change. Taylor remains the sole approver.

## Verification

- Focused OAI-T3 wall: 5/5.
- Complete wall: 1042/1042 across 141 suites.
- `npm run typecheck`: pass.
- Targeted lint over the T3 module, component, page, and tests: pass.
- `npm run build`: pass.
- `node scripts/eval-pipeline.mjs`: pass, no red flags.
- `git diff --check`: pass.
- Browser QA: desktop 1265px and mobile 390px; zero mobile overflow offenders,
  document width equals viewport width, three desktop cards, no console errors.
- Production server request to `/oai-t3-preview`: HTTP 404.
- Zero OpenAI, Serper, SearchAPI, external-page, or other provider calls occurred
  in OAI-T3. Only local development/production Next requests were made.

## Retrieval map

| Need | Retrieve |
|---|---|
| OAI-T3 contract and result | latest OAI-T3 section in `docs/forward-roadmap.md` |
| OAI-T3 component | `components/TwoLayerResultPreview.tsx` |
| Controlled preview data | `lib/twoLayerPreviewData.ts` |
| Development-only route | `app/oai-t3-preview/page.tsx` |
| OAI-T3 tests | `tests/twoLayerPreview.test.mjs` |
| OAI-T2 formatter | `lib/twoLayerFormatter.ts` |
| OAI-T1 trust boundary | `lib/twoLayerRecommendation.ts` |
| Canonical phase result | latest entry in `docs/qa-loop-results.md` |
| Durable UI trust rules | latest entry in `docs/review-radar-test-memory.md` |
| Peer challenge | `docs/agent-dialogue.md` entry [60] |

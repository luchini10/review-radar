# ReviewRadar Agent Handoff

Updated: 2026-07-17 by 🟧 Codex after the OAI-T2 deterministic formatter phase.
OAI-T1 is committed at `3b85e4c`. OAI-T2 is committed in the current history.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` at OAI-H0 through OAI-T2.
4. Read `docs/agent-dialogue.md` from entry [58] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable, H3 as blocked,
   and OAI-T3 as unapproved.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/two-layer route, flag, deployment, or visible
  behavior changed.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`; H2B Serper Shopping failed safely at `0/4`; and H2C SearchAPI
  Shopping-to-Offers failed safely at `2/4`, below its frozen `3/4` gate.
- The unguarded Terra/high diagnostic produced strong recommendation UX but
  bound an AZ4002 price to a Best Buy review page and mixed Dyson evidence
  across variants. It established that recommendation quality and transactional
  truth need separate trust layers.
- OAI-T1 commit `3b85e4c` freezes those layers. Terra owns product selection,
  order, and research synthesis. Exact identity and commerce fields require a
  deterministic receipt. Failed receipts retain the recommendation with
  explicit unverified labels.
- Taylor approved OAI-T2 directly. `lib/twoLayerFormatter.ts` deterministically
  extracts the universal master
  prompt's numbered Markdown blocks. It does not use a second model call.
- OAI-T2 requires contiguous rank headings plus `Why it ranks`, `Overall
  assessment`, `Pros`, `Cons`, and `Sources`. It preserves explicit status,
  copies all display text verbatim, accepts only response-registry URLs/titles,
  drops `Current price`, and validates the result through OAI-T1.
- The real saved Terra evidence formatted into the same five products/order,
  retained Dyson as `Close Match`, registered 21 recommendation sources,
  ignored five transactional sections, and produced five cards with unverified
  commerce and exact identity. All source-reported claims have `unresolved`
  evidence scope.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total / 85
  Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-side
  in ignored `.env.local`. Never print, log, copy into evidence, or commit them.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/two-layer production flag exists.
- Legacy remains the only user-visible path.

## Next task — OAI-T3 approved; zero live

Taylor approved OAI-T3 after authorizing the OAI-T2 commit. OAI-T3 is a zero-live
UI/presentation prototype using controlled sanitized card data. It should prove
that shoppers can understand `AI research synthesis`, `Source-reported`, exact-
identity-unverified, missing image, and `Check current price` states without
calling Terra or connecting the production recommendation route. Route
integration is premature until that presentation is judged useful and honest.

**Recommended reasoning level:** High. OAI-T3 contains meaningful product and
trust-communication judgment, but no new provider architecture or live spend.

## Hard boundaries

- No live provider call is approved. All earlier OpenAI, Serper, SearchAPI, and
  direct-fetch approvals are spent.
- Do not rerun or retune the unguarded diagnostic, H2, H2B, or H2C; do not try a
  replacement provider or weaken exact identity.
- No second formatter-model call is planned or needed under OAI-T2.
- No OpenAI call, web search, external page fetch, H3,
  production route/mode flag, `.env.local` change, deployment, quality window,
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
- Entry [58] asks Claude to challenge OAI-T1's formatter-meaning, exact-identity,
  and RR-092 display boundaries.
- Entry [59] asks Claude to challenge OAI-T2's Markdown stability, default
  `unresolved` claim scope, and UI-before-route sequence.
- Peer dialogue is advisory and does not authorize a commit, phase, live call,
  or behavior change. Taylor remains the sole approver.

## Verification

- Focused OAI-T2 wall: 9/9.
- Combined OAI-T1 + OAI-T2 wall: 20/20.
- Complete wall: 1037/1037 across 141 suites.
- `npm run typecheck`: pass.
- Targeted lint over T1/T2 modules and tests: pass.
- `npm run build`: pass.
- `node scripts/eval-pipeline.mjs`: pass, no red flags.
- Saved evidence: five recommendations, 21 registered sources, five ignored
  transactional sections, five unverified-commerce cards, and five unverified-
  identity cards.
- Zero OpenAI, Serper, SearchAPI, external page, or other network calls occurred
  in OAI-T2.

## Retrieval map

| Need | Retrieve |
|---|---|
| OAI-T2 contract and result | latest OAI-T2 section in `docs/forward-roadmap.md` |
| OAI-T2 formatter | `lib/twoLayerFormatter.ts` |
| OAI-T2 adversarial wall | `tests/twoLayerFormatter.test.mjs` |
| OAI-T1 field boundary | `lib/twoLayerRecommendation.ts` |
| Canonical phase result | latest entry in `docs/qa-loop-results.md` |
| Durable formatter rules | latest entry in `docs/review-radar-test-memory.md` |
| Peer challenge | `docs/agent-dialogue.md` entry [59] |
| Sanitized diagnostic evidence | untracked `tests/fixtures/review-radar-live/oai-terra-unguarded-2026-07-17-primary-01/result.json` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |

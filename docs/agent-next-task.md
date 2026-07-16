# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after H2B zero-spend preflight.
Architecture: `5edfb3d`. H1: `a9a46c6`. H2: `858ad9a`.
H2B preflight: `deac842`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-H0 through active H2B.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/hybrid route, flag, `.env.local`, or deployment
  change exists.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4` independently verified identities/destinations and exposed RR-092.
- Taylor directed Codex to proceed with the tiny H2B experiment. The zero-spend
  preflight is complete at `deac842`; no Serper/OpenAI/provider request ran.
- H2B is an isolated Serper Shopping verification oracle, not discovery. It
  receives only the four frozen OpenAI-proposed identities and may verify or
  leave them inconclusive. It cannot add, replace, rescue, merge, score, or
  reorder products.
- The exact four queries and JSON bodies are frozen in the roadmap and runner.
  The proposed live budget is four logical searches/four physical attempts,
  zero retry/fallback/replacement/cache/additional query.
- The pure verifier requires brand + stable model/SKU in the result title, a
  named seller, positive price, and usable non-Google merchant product URL.
  Wrong/missing models, wrappers, listings, accessories, used/refurbished/open-
  box offers, missing facts, and ineligible pages fail closed.
- RR-091 and RR-092 remain Needs Investigation. H2B does not verify editorial
  prose; claims remain hidden without positive exact-tested-model evidence.
- Register remains 92 total / 85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current flag state

- `.env.local` remains unmodified.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/hybrid production flag exists.
- Legacy remains the only user-visible path.

## Next task — explicit four-search approval required

The H2B runner is ready but must not execute until Taylor explicitly approves:

- four logical Serper Shopping searches;
- four physical attempts as both planning basis and hard ceiling;
- zero retries, fallbacks, replacements, cache reuse, additional queries,
  direct source-page fetches, OpenAI calls, or Serper discovery calls.

After approval, run the commit-pinned runner once, compare every accepted row
with the frozen human audit, record actuals, and stop. H3 remains unapproved
regardless of outcome.

**Recommended reasoning level: High for collection; Highest for the verdict.**
Collection is mechanically bounded, but one unsafe verification must fail the
architecture and requires adversarial review.

## Hard boundaries

- No live provider call is currently approved because the owner direction did
  not state a numeric search/attempt budget.
- Never run H2B without `--approved-searches=4`; the runner enforces it.
- Never rerun or replace a spent H2B request without new explicit approval.
- No OpenAI call, direct page fetch, endpoint fallback, retry, cache, additional
  query, product substitution, discovery, rescue, scoring, or reordering.
- H3, integration, route/mode flag, `.env.local`, deployment, quality window,
  holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, or raw provider
  responses. Persist sanitized shopping rows and verification decisions only.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[52] ask Claude to challenge H0/H1/H2 and H2B's narrow oracle.
  Evidence-backed objections must be resolved before any H3 decision.

## Verification

- H2B focused verifier tests pass 11/11.
- Full suite passes 1004/1004 across 138 suites.
- Typecheck, production build, offline evaluation, and diff checks pass.
- Lint reports zero errors and the same three pre-existing warnings.
- Runner syntax and targeted lint pass; dry-run emits exactly four frozen
  `/shopping` bodies and writes no evidence or network request.
- Input fixture SHA-256 remains
  `9d29d3dc991f09c696e32d813c8be8224af21ae0eb7fcdae29d8b87d4feb1867`.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active H2B contract, queries, and gates | `docs/forward-roadmap.md` H2B section |
| Current phase result | latest `docs/qa-loop-results.md` H2B entry |
| Commerce verifier | `lib/autonomousCommerceVerifier.ts` |
| No-retry runner | `scripts/run-oai-h2b-commerce-oracle.mjs` |
| Adversarial tests | `tests/autonomousCommerceVerifier.test.mjs` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

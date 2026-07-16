# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the OAI-2A v2 `primary-01` Terra smoke.
No live work is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [44] onward.
5. Before any future live approval, re-check current OpenAI model/tool prices
   and account availability.

## Current state

- OAI-0 is `3dc1131`; OAI-1 is `883cfac`; the initial OAI-2A harness and
  offline API-schema correction are `9fc4eda`; the v1 smoke harness is
  `8502df8`; the v2 requirement/evidence repair is `191c2a3`; the isolated v2
  smoke harness is `ca33e32`.
- Production behavior remains unchanged. The OAI modules and runner are
  isolated; the production route, UI, flags, `.env.local`, deployment, and
  user-visible output did not change.
- Taylor approved exactly one v2 `primary-01` Terra/high research create, at
  most 20 hosted searches, a $7 planning ceiling, no Serper/retry/replacement/
  fallback/substitution/additional case, and bounded source-page inspection
  only after a locally contract-valid response.
- Official OpenAI documentation was rechecked immediately before spend. Terra
  still supports Responses, Structured Outputs, hosted web search, and `high`
  reasoning. Standard rates remained $2.50/M input, $0.25/M cached input,
  $15/M output, and $0.01 per hosted web-search call. The >272K-token
  multipliers and $7 one-call ceiling remained conservative.
- Pre-spend verification passed: v2 preflight, 970/970 tests across 132 suites,
  typecheck, lint with zero errors and three pre-existing warnings, production
  build, and `git diff --check`. A lint-only `prefer-const` finding was corrected
  before client creation; zero requests had been dispatched.
- One `gpt-5.6-terra` response completed at `high` after 108,458 ms and 20
  background polls. It used 80,616 input tokens, 19,688 output tokens, 100,304
  total tokens, and eight hosted web-search calls. Estimated cost from returned
  usage is $0.57686. Returned model matched requested model.
- The v2 requirement and purchase contracts passed. The four-card slate used
  only reserved `rr-system-market-us`, marked it Pass on every Best Match, and
  invented no requirement IDs. Each non-null price/product URL was bound to a
  registered `purchase_page`. The cards were Shark AZ3002, Miele Guard L1
  Electro/12704580, Dyson V15 Detect, and Kenmore BC4026.
- The response then failed `source_not_in_response`. The slate registered nine
  source URLs. The final retrieved response exposed only three distinct URLs;
  only two matched registered sources, leaving seven registered URLs absent
  from the same-response evidence set. No card was accepted or displayed.
- Root cause is a background-poll retrieval bug, not yet a model-quality or
  architecture failure. The create request correctly asks for
  `include: ["web_search_call.action.sources"]`
  (`lib/autonomousResearchAdapter.ts:649-659`), but every
  `responses.retrieve` poll passes an empty query object
  (`lib/autonomousResearchAdapter.ts:804-815`). The existing mocked poll test
  explicitly expects that incorrect `{}` query
  (`tests/autonomousResearchAdapter.test.mjs:315-345`).
- Official Retrieve Response documentation confirms that `include` is a query
  parameter and supports `web_search_call.action.sources`. The final poll must
  repeat that include request to retain the complete consulted-source list.
- Because local validation failed, no manual external source/product page was
  opened. The model's hosted `open_page` actions were part of the single
  approved response and are counted in its eight tool calls. No Serper request,
  retry, replacement, Call 1, additional case, or OAI-2B work occurred.
- The spent response is retained but excluded from autonomous quality scoring.
  It is valid evidence of the adapter retrieval failure. Exact untracked files:
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v2-smoke-191c2a3/primary-01.json`
  and `summary.json`. Both earlier evidence directories remain unchanged.
- OAI-2A remains **blocked by the retrieval adapter**. A replacement live
  request is not approved and must not be inferred from this failure.
- Issue register remains unchanged at 90 total / 85 Fixed / 4 Needs
  Investigation / 1 Won't Fix.

## Next task — explicit approval required

Execute one **offline OAI-2A background-source retrieval repair** with zero
live OpenAI/Serper calls and zero external page fetches:

1. Add a fail-first test proving a background-completed response loses search
   sources when the retrieve query omits `include`.
2. Require every `responses.retrieve` poll to pass
   `include: ["web_search_call.action.sources"]`, matching the create request
   and the official Retrieve Response contract.
3. Update the existing poll assertion that currently freezes `{}` and add a
   regression where a slate URL is accepted only because the final retrieved
   response supplies it through `action.sources`.
4. Keep `source_not_in_response` fail-closed. Do not accept registered URLs
   merely because the model wrote them into the slate, and do not weaken the
   requirement, purchase, identity, or citation contracts.
5. Confirm rejected-response sanitization still retains search actions and
   complete source URLs without raw output text, reasoning, prompts, headers,
   or keys.
6. Run focused tests plus the full validation wall, update only the smallest
   authoritative records, commit, and stop. Do not retrieve the spent response,
   run a replacement smoke, open its sources, begin another case, or start
   OAI-2B.

This is the strongest next move because the official API contract and saved
response explain the loss precisely. Treating this run as an architecture kill
would blame the model for evidence the adapter failed to request; immediately
buying another response before repairing the poll would repeat the same waste.

**Recommended reasoning level: High.** The repair is safety-critical but narrow
and directly specified by the official API: repeat one `include` query on every
poll and prove it with fail-first tests. Highest is unnecessary unless the fix
uncovers a broader dispute about same-response source semantics.

## Hard boundaries

- No live OpenAI/Serper call, response retrieval, source-page opening, external
  product fetch, retry, replacement, or model substitution without new explicit
  approval. The one-create approval is exhausted.
- No OAI-2B, permanent network verifier, production route integration, flag
  promotion, `.env.local` edit, deployment, or user-visible behavior change.
- The selected OAI path sends no Serper request, app-authored search plan, or
  candidate list. The model controls hosted search inside its response.
- Every displayable fact must bind to same-response source metadata; URL
  membership alone does not prove semantic support.
- The verifier may reject, downgrade, normalize, exact-dedupe, or clear unsafe
  optional fields. It may not discover, invent, rescue, score, add, or reorder
  products.
- Preserve generalized price, citation, requirement, product-type, identity,
  image, eligibility, dedupe, URL, source-quality, and hard-constraint gates.
- No benchmark leader may enter prompts, requests, code paths, ranking,
  validation, or behavior tests.
- Live evidence and pre-existing untracked artifacts stay untracked. Stage
  explicit files only; never use `git add -A`.
- One phase per explicit approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [37] asks Claude to verify the post-C5 safety repair.
- Entry [42] asks Claude to review the first OAI-2A failure attribution.
- Entry [44] asks Claude to review the completed v2 contract implementation.
- Entry [45] asks Claude to challenge the background-retrieve diagnosis and
  proposed offline fix before any replacement spend.
- Taylor remains the sole approver for live spend, response/source retrieval,
  source-page opens, model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| V2 request/prompt/schema contract | `lib/autonomousResearchContract.ts` |
| Background polling and source validation | `lib/autonomousResearchAdapter.ts` |
| V2 smoke runner | `scripts/run-oai-2a.mjs` |
| V2 smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v2-smoke-191c2a3/` |
| Corrected v1 smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke/` |
| Earlier API-boundary evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [44] onward |

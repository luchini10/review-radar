# ReviewRadar Agent Handoff

Updated: 2026-07-15 by 🟧 Codex after the corrected OAI-2A Terra
`primary-01` smoke. No live work is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [43] onward.
5. Before any future live approval, re-check current OpenAI model/tool prices
   and account availability.

## Current state

- OAI-0 is `3dc1131`; OAI-1 is `883cfac`; the initial OAI-2A harness and
  offline schema correction are `9fc4eda`; the one-case smoke harness is
  `8502df8`.
- Production behavior is unchanged. The OAI modules and runner remain isolated;
  the production route, UI, flags, `.env.local`, deployment, and user-visible
  output did not change.
- The first OAI-2A attempt failed at the API boundary because the strict schema
  contained unsupported `format: "uri"`. That API keyword was removed while
  local Zod URL validation remained. Exact historical server diagnostics were
  unavailable; the attribution remains the strongest static explanation, not
  a proven recovered error.
- Taylor separately approved one corrected `primary-01` technical smoke:
  one `gpt-5.6-terra` research create at `high`, at most 20 hosted searches,
  a $7 planning ceiling, no Serper/retry/replacement/fallback/substitution, and
  bounded inspection only if a contract-valid response returned.
- Official 2026-07-15 pricing was rechecked immediately before the smoke:
  Terra standard rates were $2.50/M input, $0.25/M cached input, $15/M output,
  and hosted web search was $0.01/call. The one-call ceiling remained
  conservative.
- The smoke harness added a distinct evidence directory and mechanically
  enforced one create and 20 searches. Before spend, preflight, 966/966 tests
  across 132 suites, typecheck, lint (0 errors / 3 pre-existing warnings), and
  `git diff --check` passed.
- The corrected request passed the API/schema boundary. Terra returned a
  completed response using the requested model after 139,171 ms and 26
  background retrieval polls. It used 77,521 input tokens, 21,644 output
  tokens, 99,165 total tokens, and eight hosted searches. Estimated cost from
  returned usage is $0.5984625.
- The response registered three source hosts: `bestbuy.com`, `dyson.com`,
  and `vacuumwars.com`. It then failed the local request/evidence contract,
  so no source page was opened and no card was accepted or displayed.
- Four returned cards used an invented requirement ID, `market_US`, although
  the normalized request authorized no requirement IDs. One SEBO FELIX card
  also returned a price and product URL that were not bound to a
  `purchase_page` source. The validator correctly rejected all six errors.
- Root cause is a v1 contract gap, not evidence that the validator is too
  strict. The prompt requires United States availability but neither market nor
  budget has a deterministic requirement ID, while the validator accepts only
  IDs from the request's hard/preference/avoid/ambiguity arrays
  (`lib/autonomousResearchAdapter.ts:328-357`). The model filled that ambiguity
  by inventing `market_US`.
- The failed-result summary incorrectly reports zero usage/searches/cost because
  it only aggregates contract-valid results. The per-case ledger contains the
  authoritative actuals. The harness also omitted the parsed failed slate and
  sanitized response evidence, preventing card-level/source-level inspection.
  These observability gaps must be repaired before more spend.
- Exact untracked smoke evidence is
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke/primary-01.json`
  and `summary.json`. The earlier failed attempt remains separately preserved
  under `oai-2a-terra-2026-07-15/`.
- One create, eight hosted searches, and zero Serper calls were dispatched. No
  retry, replacement, model substitution, source-page open, `primary-04`,
  Call 1, `primary-12`, or OAI-2B work occurred.
- OAI-2A remains **blocked**. The technical transport/schema question passed,
  but the v1 request/evidence contract did not. This is not yet an autonomous
  quality pass or an architecture kill because no complete slate was retained
  for evidence review.
- Issue register remains unchanged at 90 total / 85 Fixed / 4 Needs
  Investigation / 1 Won't Fix.

## Next task — explicit approval required

Execute one **offline OAI-2A v2 contract and observability repair** with zero
live OpenAI/Serper calls and zero external page fetches:

1. Add fail-first tests reproducing `market_US` rejection, active-budget
   ambiguity, unbound purchase price/URL, and lost failed-response usage.
2. Generate an explicit deterministic evaluation-requirement list for every
   request. It must include a reserved market-availability check, an active
   budget check when applicable, and the existing user requirement IDs. The
   model may use only those exact IDs; it may not invent checks.
3. Make the request-specific output schema and prompt constrain
   `requirement_id` to that exact list. A broad request still receives the
   system market check; an inactive budget creates no budget check.
4. Keep the purchase safety boundary fail-closed. Clarify that a non-null price
   or product URL must bind to the exact same registered `purchase_page`;
   otherwise the model must return null/unavailable.
5. Preserve sanitized response evidence, parsed slate, returned usage, searches,
   sources, latency, and estimated cost even when local contract validation
   rejects the slate. Do not log secrets, headers, prompts, or raw reasoning.
6. Version the prompt/schema/fixture contract, run focused tests plus the full
   validation wall, update the smallest authoritative records, commit, and
   stop. Do not run another smoke or begin OAI-2B.

Do not solve this by allowing arbitrary requirement IDs or by deleting the
purchase-source checks. Those shortcuts would convert an observable model error
into unsafe displayable output.

**Recommended reasoning level: Highest.** This is an offline but
safety-critical prompt/schema/validator redesign. The difficult part is making
market, budget, and user constraints line up exactly without weakening the
evidence boundary; no live spend is involved.

## Hard boundaries

- No live OpenAI/Serper call, source-page opening, external product fetch,
  retry, replacement, or model substitution without new explicit approval.
- The corrected smoke approval is exhausted. No undispatched work carries
  forward.
- No OAI-2B, permanent network verifier, production route integration, flag
  promotion, `.env.local` edit, deployment, or user-visible behavior change.
- The selected OAI path sends no Serper request or app-authored search plan or
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

- Dialogue entry [37] still asks Claude to verify the post-C5 safety repair.
- Entry [42] asks Claude to review the first OAI-2A failure attribution.
- Entry [43] asks Claude to challenge the v2 requirement-ID and failed-evidence
  repair before any additional spend.
- Taylor remains the sole approver for live spend, source-page opens,
  model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| Corrected smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke/` |
| Earlier API-boundary evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/` |
| Runner | `scripts/run-oai-2a.mjs` |
| Prompt/schema/request contract | `lib/autonomousResearchContract.ts` |
| Adapter/validator/evidence handling | `lib/autonomousResearchAdapter.ts` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [43] onward |

# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the offline OAI-2A v2 contract and
rejected-evidence repair. No live work is currently approved.

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
  offline API-schema correction are `9fc4eda`; the one-case smoke harness is
  `8502df8`; the v2 requirement/evidence repair is `191c2a3`.
- Production behavior is unchanged. The OAI modules and runner remain isolated;
  the production route, UI, flags, `.env.local`, deployment, and user-visible
  output did not change.
- The corrected v1 `primary-01` Terra smoke passed the OpenAI transport/schema
  boundary, but local validation rejected four invented `market_US` IDs and
  one price/URL not bound to a `purchase_page`. It used one create, eight hosted
  searches, 77,521 input tokens, 21,644 output tokens, 99,165 total tokens,
  139,171 ms, 26 polls, and an estimated $0.5984625. No Serper request, retry,
  source-page open, replacement, model substitution, or additional case ran.
- The v1 root cause was a contract mismatch: the prompt required United States
  availability without assigning market or active budget deterministic IDs.
  The model invented an ID that the validator correctly rejected. The purchase
  rejection was correct and remains fail-closed.
- The v2 request now deterministically emits one ordered
  `evaluation_requirements` list. It always includes reserved U.S.-market
  availability, includes budget only when an amount is active, and then carries
  every hard, avoid, preference, and unresolved-ambiguity ID
  (`lib/autonomousResearchContract.ts:342-476`). Call 1 output rebuilds the same
  list after adding its uncertainty (`lib/autonomousResearchContract.ts:651-674`).
- The v2 strict Structured Outputs schema constrains every card to the exact
  request-specific ID enum and exact check count
  (`lib/autonomousResearchContract.ts:189-337`). The prompt separately requires
  the same IDs in the same order and states Best Match and purchase-page binding
  semantics (`lib/autonomousResearchContract.ts:710-719`).
- Deterministic validation still rejects unknown, duplicate, missing, or unmet
  required checks. A Best Match must Pass market, firm maximum budget, hard,
  and avoid requirements (`lib/autonomousResearchAdapter.ts:417-456`). Arbitrary
  IDs were not permitted and no safety gate was weakened.
- Completed responses rejected locally now retain the parsed slate and completed
  response in memory (`lib/autonomousResearchAdapter.ts:763-876`). Evidence
  sanitization removes raw model text and reasoning while preserving search
  actions, citation annotations, status, model, and usage
  (`lib/autonomousResearchAdapter.ts:251-306`). Rejected results now contribute
  actual usage, hosted searches, source hosts, latency, card count, and estimated
  cost to the summary (`lib/autonomousResearchAdapter.ts:140-164`;
  `scripts/run-oai-2a.mjs:192-231`).
- Fail-first focused tests produced exactly five failures: missing deterministic
  evaluation requirements, the v1 prompt, absent request-specific ID enum, and
  missing failed-response slate/response evidence. After implementation, focused
  tests passed 24/24 and the full wall passed 970/970 across 132 suites.
- Typecheck passed. Lint passed with zero errors and three pre-existing warnings.
  Production build, preflight-only runner validation, and `git diff --check`
  passed. No live OpenAI/Serper call or external source/product fetch occurred.
- Exact historical evidence remains untracked and unchanged under
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke/`
  and `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/`.
- OAI-2A remains **blocked pending evidence**, not failed. The cheapest valid
  next experiment is one corrected v2 `primary-01` smoke. Running the remaining
  cases or beginning OAI-2B before that one response passes would be wasteful.
- Issue register remains unchanged at 90 total / 85 Fixed / 4 Needs
  Investigation / 1 Won't Fix.

## Next task — explicit approval required

Run exactly one **OAI-2A v2 corrected `primary-01` technical/evidence smoke**:

1. Re-check the current official Terra and hosted-web-search rates before spend.
2. Use the committed v2 contract at `191c2a3`, model `gpt-5.6-terra`, `high`
   reasoning, one research create, 24,000 maximum output tokens, and at most 20
   hosted web-search calls.
3. Use a $7 planning ceiling. Dispatch zero Serper calls and no retry,
   replacement, fallback, model substitution, Call 1, `primary-04`,
   `primary-12`, or OAI-2B work.
4. Preserve the two historical evidence directories. Write the new response to
   a distinct commit-pinned v2 evidence directory and retain both accepted and
   locally rejected actuals through the repaired summary/evidence path.
5. If and only if the completed response is locally contract-valid, perform the
   already-planned bounded manual inspection of returned sources. Stop on the
   first unsafe/unverifiable display claim; do not repair product data by hand.
6. Report transport/schema status, exact requirement-check status, purchase
   binding, source semantics, cards, searches, tokens, cost, latency, and every
   failure reason. Stop after this one case.

This one rerun is justified because the prior response reached the local gate
and exposed two specific contract defects that are now reproduced and repaired.
Expanding immediately to the remaining OAI-2A sample would spend more before
proving the repair.

**Recommended reasoning level: High.** The request and limits are now frozen
and fully tested; High is sufficient to execute the bounded smoke and inspect
its evidence carefully. Use Highest only if the returned sources create a
disputed semantic-support or architecture go/no-go decision.

## Hard boundaries

- No live OpenAI/Serper call, source-page opening, external product fetch,
  retry, replacement, or model substitution without new explicit approval.
- The previous corrected-smoke approval is exhausted. No undispatched work
  carries forward.
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
- Entry [43] asks Claude to challenge the v2 requirement-ID and failed-evidence
  direction.
- Entry [44] asks Claude to review the completed v2 implementation before or
  alongside any future live approval.
- Taylor remains the sole approver for live spend, source-page opens,
  model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| V2 requirement/prompt/schema contract | `lib/autonomousResearchContract.ts` |
| V2 adapter/validator/evidence handling | `lib/autonomousResearchAdapter.ts` |
| Bounded runner | `scripts/run-oai-2a.mjs` |
| Corrected v1 smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke/` |
| Earlier API-boundary evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [43] onward |

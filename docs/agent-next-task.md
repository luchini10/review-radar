# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the offline OAI-2A Responses boundary
flight-simulator phase. No live work is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [44] onward.
5. Before any future live approval, re-check current OpenAI model/tool prices,
   capability documentation, account availability, and the exact approved
   request/tool-call ceilings.

## Current state

- Active OAI milestones are OAI-0 `3dc1131`, OAI-1 `883cfac`, initial OAI-2A
  harness/correction `9fc4eda`, v1 smoke harness `8502df8`, v2 contract repair
  `191c2a3`, isolated v2 smoke harness `ca33e32`, and offline lifecycle repair
  `1d7a300`.
- Production behavior remains unchanged. The OAI modules and runner are
  isolated; the production route, UI, flags, `.env.local`, deployment, and
  user-visible output did not change.
- The last approved live unit was exactly one v2 `primary-01` Terra/high create.
  It is exhausted. No retry, replacement, response retrieval, source open, or
  additional case is approved.
- That response completed in 108,458 ms after 20 polls, using 80,616 input,
  19,688 output, and 100,304 total tokens plus eight hosted searches. Estimated
  cost from returned usage was $0.57686. It is preserved but excluded from
  quality scoring because the adapter did not retrieve complete source
  metadata.
- The v2 requirement and purchase contracts passed: all four Best Matches used
  only reserved `rr-system-market-us`, passed it, invented no IDs, and bound
  each non-null price/URL to a registered `purchase_page`.
- The response then failed `source_not_in_response`. Static code, saved
  evidence, the installed SDK types, and the official Retrieve Response
  reference agreed on the root cause: create requested
  `web_search_call.action.sources`, but background retrieval passed `{}`.
- Commit `1d7a300` closes that adapter defect offline. One shared inclusion
  constant now drives create and every retrieve poll
  (`lib/autonomousResearchAdapter.ts:57-59,667,837-841`). The fail-closed
  `source_not_in_response` contract was not weakened.
- The same phase found and fixed a second lifecycle defect: a request could
  sleep through its overall deadline and still poll. Deadline checks now run
  after sleep and after retrieval (`lib/autonomousResearchAdapter.ts:826-848`).
- Response snapshots now capture the latest status, returned model, usage, and
  source counts before terminal rejection, including a completion that arrives
  too late (`lib/autonomousResearchAdapter.ts:758-773,821-851`). Diagnostic
  evidence also redacts bearer tokens and delimited JSON request payloads.
- The offline simulator exercises Call 1 and Call 2, all documented response
  statuses, multi-poll completion, create/retrieve errors, refusal, malformed/
  schema/contract/source failures, deadlines, poll ceilings, no retry, source
  shapes from the saved Terra response, sanitizer exclusions, and real-runner
  v2 preflight.
- Fail-first focused result was 18/21 with exactly the missing-include assertions
  and post-sleep timeout failing. Final focused verification is 24/24. The full
  suite is 982/982 across 135 suites; typecheck, lint (zero errors / three
  pre-existing warnings), production build, offline evaluation, v2 preflight,
  and diff checks pass.
- No live OpenAI/Serper call, response retrieval, direct source fetch, or source
  page open occurred during the offline phase. Existing untracked live fixtures
  remain unchanged.
- OAI-2A is no longer blocked by a reproduced local adapter defect, but it has
  not passed the technical/source-support gate. One final corrected smoke is
  the smallest next evidence; OAI-2B remains forbidden.
- Issue register remains 90 total / 85 Fixed / 4 Needs Investigation / 1 Won't
  Fix. This isolated harness repair did not open, close, or reclassify an RR
  issue.

## Next task — explicit approval required

The smallest useful next step is exactly one final corrected v2 `primary-01`
Terra/high smoke. Before dispatch, re-check the official Terra capability,
Retrieve Response contract, prices, account availability, clean tracked tree,
commit pin, preflight, focused simulator, full tests, typecheck, lint, build,
offline evaluation, and diff checks.

Proposed live boundary, subject to Taylor's exact approval after the recheck:

1. One OpenAI research create for frozen case `primary-01`; Call 1 is skipped.
2. Terra at `high`, strict v2 schema, background polling, and
   `include: ["web_search_call.action.sources"]` on create and every retrieve.
3. At most 20 hosted web-search calls; use the newly rechecked pricing to state
   a conservative dollar ceiling before client creation.
4. Zero Serper calls, retries, replacements, fallbacks, model substitutions,
   additional cases, or OAI-2B work.
5. Preserve sanitized request/response evidence and report every token, tool
   call, poll, source, latency, cost, and local rejection. Do not hide or replace
   a spent failure.
6. Open external source pages only if the response first passes all local v2
   schema, requirement, purchase, identity, and same-response source-binding
   contracts and the approval explicitly permits those bounded human checks.
7. Stop after this one response and report. A pass allows a separate decision
   about the remaining OAI-2A cases; a new local integration failure receives
   first-loss attribution and no automatic rerun.

This is better than starting the remaining cases because the final live smoke
tests the exact boundary that failed twice while limiting time and evidence
ambiguity to one response. It is also better than more offline scaffolding: the
complete lifecycle wall is now green, and the remaining unknown is provider
behavior and source completeness, which local simulation cannot prove.

**Recommended reasoning level: High.** Execution is tightly bounded and fully
preflighted. Use Highest only if the returned evidence creates a disputed
source-support or architecture go/no-go judgment.

## Hard boundaries

- No live OpenAI/Serper call, response retrieval, source-page opening, external
  product fetch, retry, replacement, or model substitution without new explicit
  approval. The prior one-create approval is exhausted.
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
- Entry [44] asks Claude to review the v2 requirement/evidence contract.
- Entry [45] asks Claude to challenge the retrieve-include diagnosis.
- Entry [46] asks Claude to challenge the completed offline lifecycle repair
  and the recommendation for one final corrected smoke.
- Taylor remains the sole approver for live spend, response/source retrieval,
  source-page opens, model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| V2 request/prompt/schema contract | `lib/autonomousResearchContract.ts` |
| Background polling and source validation | `lib/autonomousResearchAdapter.ts` |
| Lifecycle simulator | `tests/autonomousResearchLifecycle.test.mjs` and `tests/helpers/autonomousResearchSimulator.mjs` |
| Source-shape boundary | `tests/responseSources.test.mjs` |
| V2 runner/preflight | `scripts/run-oai-2a.mjs` and `tests/oai2aRunner.test.mjs` |
| Latest smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v2-smoke-191c2a3/` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [44] onward |

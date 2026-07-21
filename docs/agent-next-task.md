# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Claude after the OAI-T7C direct-Terra evaluation ran
(12 live Terra/high calls pinned to `0cd1257`, `$7.61` of `$15`). Result:
direct-Terra is SAFE (0 wrong-type, 0 confirmed over-budget, 100% feature
evidence in all 12 runs) and beats the legacy pipeline's recall and stability
on 3 of 4 categories; the constrained robot-vacuum case is the weak spot (low
recall, high run-to-run churn). Full write-up in the QA log; per-case numbers
below. No flag promoted; both direct-Terra flags remain default-off. No further
live call, flag change, `.env.local` change, deployment, push, or production
change is approved.

Also landed 2026-07-21 (Taylor-approved UX, zero live): the direct-Terra path
now narrates live progress during the wait (route reports milestones into the
shared store via `reportSearchProgressMilestone`) and its report leads with a
"Your picks at a glance" band (`lib/directTerraReportOutline.ts`) that surfaces
Terra's own ranked headings first with jump links — no rerank. Default-off path;
full wall 1192/1192. See the QA log and change-log entries.

## OAI-T7C result (2026-07-21)

Evidence: untracked `tests/fixtures/review-radar-live/oai-t7c-terra-eval-v1/`
(per-run + summary.json). Recall vs frozen `leaders-v2026-07c`; stability =
mean pairwise covered-leader Jaccard across 3 runs.

| Case | Recall mean | Stability | WrongType | BudgetViol |
|---|---|---|---|---|
| office chair (broad /7) | 3.33/7 | 0.83 | 0 | 0 |
| gas grill (con /4) | 2.67/4 | 0.78 | 0 | 0 |
| cordless drill (con /4) | 2.67/4 | 0.47 | 0 | 0 |
| robot vacuum (con /4) | 1.33/4 | 0.17 | 0 | 0 |

Key caveat carried forward: "0 budget violations" is PARTIAL verification —
price coverage was 0.07-0.58, so most picks were unpriced and their budget
compliance is unverified, not confirmed (Codex challenge [84]-(1)). Robot-vac
weakness is partly the stricter model-line denominator (Terra picked adjacent
legitimate budget robots off the Q5/Q10 list) and partly genuine churn.

## Strongest next decision (Taylor's)

Direct-Terra is now the leading candidate direction on evidence. Options, each
needing separate approval:
1. **Wider zero-then-live generalization eval** — extend T7C to the sealed
   holdout categories + a couple more broad cases to confirm the 3/4 pattern
   holds and diagnose the robot-vac weakness (is it the matcher denominator or
   real instability? inspect the saved run reports first, zero-live).
2. **Flag-on canary** of the direct-Terra path (bounded, reversible) to gather
   real-usage signal, only after (1) and an explicit promotion approval.
3. **Hold and harden** — if robot-vac-class instability is judged
   disqualifying, keep default-off and diagnose first.
Recommended: start with the zero-live inspection of the saved robot-vac reports
to separate measurement strictness from real churn before spending again.

## Efficient session start

1. Read repository `AGENTS.md` and this handoff in full.
2. Preserve every untracked fixture and unrelated user artifact.
3. Retrieve the latest OAI-T7B QA entry and dialogue entry [81] only when
   detailed implementation evidence or peer review is needed.
4. Do not reuse the spent OAI-T7A SearchAPI approval.

## Product objective and current architecture

Keep Terra's selected products, ranking, explanations, and citations intact.
Give shoppers a useful multi-source market-price estimate without claiming a
verified seller, checkout price, stock state, purchase destination, shipping,
tax, or discount.

The default-off V2 path is now:

```text
shopper fields
  -> one Terra/high hosted-web-search response
  -> strict report_markdown + bounded price_observations
  -> unchanged report with response-owned citations
  -> deterministic two-host low/high/median estimate when safe
  -> checkout and all other transactional details remain unverified
```

There is no SearchAPI, Serper, second OpenAI call, direct-page fetch, retry, or
fallback in this path. SearchAPI's runner and saved T7A evidence remain on disk
for historical audit only and are not imported by V2.

## OAI-T7B implementation result

`lib/directTerraPrompt.ts` bumps the master prompt to v2 and requires exactly
`report_markdown` plus `price_observations`. Terra is asked for up to four USD
observations per ranked product, limited to the exact new standalone product
and exact response-observed source URLs.

`lib/directTerraPriceEstimate.ts` is the deterministic trust boundary. It:

- binds each group to the exact brand/model in the matching ranked report
  heading;
- accepts only positive bounded USD values labeled new and standalone;
- accepts only URLs returned by the same OpenAI response;
- removes only conservative tracking parameters for ownership comparison;
- counts at most one observation per normalized host; and
- returns low/high/median only when at least two distinct hosts survive.

Unsafe or insufficient observations never reject, rewrite, remove, or rerank
the report. The API contract is `direct-terra-api-v2` and exposes only aggregate
estimates plus a rejected-observation count; raw seller strings and observation
URLs remain server-side. `DirectTerraReport` renders a separate estimated-price
panel and retains the prominent unverified-purchase warning.

## Evidence and repository state

- Current HEAD: `3a1e87e` (`Add OpenAI-only estimated market price to direct
  Terra V2`) — the OAI-T7B implementation plus pending T7A live-result docs,
  landed as one phase commit after Claude's review (dialogue [82]).
- Claude independently re-ran the wall at commit time: 1171/1171 across 165
  suites; typecheck; production build; lint 0 errors/3 pre-existing warnings.
- The sanitized T7A fixture remains untracked at
  `tests/fixtures/review-radar-live/oai-t7a-transactional-feasibility/result.json`.
- Direct-Terra flags remain default-off in `.env.example` and absent from
  `.env.local`.
- Fail-first: the old one-field prompt contract failed 1/2 focused tests.
- Focused Direct Terra tests: 30/30 pass across six suites.
- Full wall: 1171/1171 pass across 165 suites.
- Typecheck and production build pass.
- Lint: zero errors and three pre-existing warnings.
- Offline scorecard invocation produced only its cost-plan preview and made no
  live request.

## Prior context

The T7B price smoke PASSED (2026-07-19): 1 create / 25 retrieves, `$0.4699` of
`$7`, schema v2 accepted live, 3/5 ranked products priced, 2/5 suppressed
fail-closed. The T7C decision rule was: materially better recall than legacy's
1-2/7 with zero wrong-type/hard-constraint violations and non-trivial stability
would favor direct-Terra as the direction. T7C met that on 3 of 4 categories
(see result above); the robot-vac case did not, and price coverage remained
sparse.

**Recommended reasoning level:** High. Commit review is a bounded identity and
data-contract audit; the later one-response smoke needs careful range/source
inspection. Highest is unnecessary unless the API rejects the schema or a
range binds to the wrong product.

## Hard boundaries

- No OpenAI, SearchAPI, Serper, direct-page, or other live call without a new
  exact numeric approval pinned to a commit.
- No commit, push, flag promotion, `.env.local` edit, deployment, publication,
  or production change without separate approval.
- Never let missing or rejected price evidence alter Terra's report.
- Never label an estimate as a seller quote, verified current price, stock,
  purchase destination, discount, shipping, tax, or checkout receipt.
- Never expose raw response output, price-observation URLs, seller strings,
  provider IDs, keys, headers, or job-token contents to the browser.
- Do not delete legacy, prior two-layer, SearchAPI-history, or Serper code
  without rollback evidence and explicit retirement approval.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current result and next decision | this file |
| Detailed offline evidence | latest `docs/qa-loop-results.md` entry |
| Peer challenge | `docs/agent-dialogue.md` entry [81] |
| Prompt and strict schema | `lib/directTerraPrompt.ts` |
| Deterministic estimator | `lib/directTerraPriceEstimate.ts` |
| Response ownership and aggregation | `lib/directTerraResponse.ts` |
| Public API boundary | `lib/directTerraApiContract.ts` |
| UI disclosure | `components/DirectTerraReport.tsx` |

# ReviewRadar Agent Handoff

Updated: 2026-07-19 by Claude after freezing the OAI-T7C direct-Terra V2
holistic evaluation (zero live). The T7B price feature (committed `3a1e87e`)
and its passed live smoke are complete; the open question is whether the
direct-Terra REPORT the price feature rides on is good enough at its core job
(leader recall, wrong-type safety, constraint compliance, run-to-run
stability) to become ReviewRadar's direction. T7C is the frozen instrument to
answer that. The frozen scorer + cases + harness are committed and validated
zero-live; **the live T7C window is awaiting Taylor's explicit numeric
approval** (exact budget below). No live call, flag change, `.env.local`
change, deployment, push, or production change is otherwise approved.

## Pending live decision — OAI-T7C direct-Terra evaluation

Frozen contract: `lib/directTerraEvaluation.ts` (4 cases + scorer),
`scripts/run-oai-t7c-terra-eval.mjs` (bounded harness),
`tests/directTerraEvaluation.test.mjs` (scorer validated against the
hand-audited T7B shop-vac fixture). Cases (plain shopper requests; no leader
name reaches Terra): broad `office chair`; constrained `gas grill`/$600/4
burner+propane; constrained `cordless drill`/$150/brushless; constrained
`robot vacuum`/$300/self-emptying (overlaps the legacy North-Star for a direct
comparison). Deliberately no shop-vac (overfit anchor; T7B/T6D already cover
it). Each case runs 3x for stability.

Exact live budget to approve: **12 Terra/high `create` calls** (4 cases x 3
runs), per-run hosted-search ceiling 20 and retrieve ceiling 60, at most 1
safety cancel per run, **hard global cost ceiling $15** (planning basis ~$5.6
at the T7B actual of ~$0.47/run; ~30 min wall time sequential). Scored against
frozen `leaders-v2026-07c`. Pins to the freeze commit (resolved from HEAD at
run time and recorded in evidence). Preflight passes zero-live; evidence writes
to untracked `tests/fixtures/review-radar-live/oai-t7c-terra-eval-v1/`.

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

## Strongest next decision

Run the frozen OAI-T7C evaluation once Taylor approves the 12-call budget
above, then read the four North-Stars per case (recall mean, wrong-type =
target 0, budget violations = target 0, leader-set stability Jaccard) plus
secondary price coverage. Decision rule after results:
- If direct-Terra shows materially better recall than the legacy pipeline's
  historical 1-2/7 with zero wrong-type and zero hard-constraint violations
  and non-trivial stability, that is the evidence to consider direct-Terra the
  product direction (and to sequence a flag-on canary).
- If recall is thin, wrong-type/constraint violations appear, or stability is
  near-zero (the historical disease), hold direct-Terra default-off and
  redirect to the specific first-loss cause.

Prior context: the T7B price smoke PASSED (2026-07-19): 1 create / 25
retrieves, `$0.4699` of `$7`, schema v2 accepted live, 3/5 ranked products
priced, 2/5 suppressed fail-closed. Watch items carried into T7C: long-tail
hosts entering ranges (`web.mdstetson.com`) and price coverage breadth.

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

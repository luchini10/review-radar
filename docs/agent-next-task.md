# ReviewRadar Agent Handoff

Updated: 2026-07-19 by Codex after the zero-live OAI-T7B OpenAI
estimated-market-price implementation. No live call, commit, flag change,
`.env.local` change, deployment, push, or production change is approved.

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

- Current HEAD: `9c51f22` (`Prepare transactional offer feasibility probe`).
- OAI-T7B code, tests, architecture docs, QA, change log, handoff, and dialogue
  updates are uncommitted.
- Earlier OAI-T7A live-result docs are also part of the tracked working diff;
  preserve them when reviewing/staging.
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

Review and commit the zero-live OAI-T7B implementation and the already-pending
T7A live-result documentation as one intentional phase commit. After the commit
exists, request a separate exact approval for one bounded Terra/high V2 smoke
pinned to that commit. That smoke should prove the real API accepts prompt/API
v2 and should manually audit every displayed price range against sanitized
response-owned evidence. It must not enable the flags, call SearchAPI/Serper,
or make a second response.

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

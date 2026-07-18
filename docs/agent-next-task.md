# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the live OAI-T5B first-run safe stop.
The current focused phase record is `Record T5B safe stop`; the provider-tested
application commit is `04dd3a0d087afe4ccfd8a538b7524cc104309cd7` (`Freeze
two-layer quality gate`). No replacement, new live run, verifier phase, mode
promotion, deployment, push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read OAI-T5A and OAI-T5B in `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` entries [70]-[71].
5. Retrieve the latest OAI-T5A/T5B entries in `docs/qa-loop-results.md`.
6. Do not run the T5B harness again: its first attempt is spent and failed, and
   the frozen protocol authorizes no retry or replacement.

## Current architecture and persistent state

- Missing, empty, or exact `legacy` mode remains the unchanged default. Exact
  `two_layer` selects the background branch; every other non-empty value fails
  before provider creation.
- Two-layer mode makes one Terra/high background Responses create with hosted
  search and no SDK retry, Serper, SearchAPI, helper model, second response,
  legacy fallback, or transactional receipt.
- GET/DELETE use an encrypted authenticated capability only in the
  `x-reviewradar-job-token` header. Provider/prompt tracking and the expected-
  requirement hash are not client-decodable or placed in request URLs.
- Formatter/research/presentation v2 preserves the model's product slate and
  order, requires exact normalized requirement rows, visibly labels verdicts
  as AI synthesis, and withholds unverified identity and commerce.
- Model-authored currency amounts in public research/source titles are redacted;
  exact price, seller, availability, purchase URL, and image require an
  independently accepted receipt.
- `.env.local` still has no two-layer mode or job-token-secret entry. Last
  recorded persistent state remains constraint allocation on and narration off.

## T5B result

Taylor approved the frozen six-response gate:

1. three independent broad `shop vac` runs; and
2. three independent `robot vacuum`, `under $300`, `self-emptying` runs.

Only broad run 1 was dispatched. The provider response completed, but the route
safe-failed HTTP 502 at:

```text
formatter / product_shape / numbered_product_headings_missing
```

The untracked sanitized record is:

`tests/fixtures/review-radar-live/oai-t5b-two-layer-04dd3a0/
broad-shop-vac.run1.attempt.json`

It records one Terra/high create, 13 retrieves, zero cancels, and failed status.
There were zero retries, replacements, fallbacks, Serper/SearchAPI calls, or
direct source-page opens. The other five creates were not sent. No completed
card fixture exists, and zero cards, sources, or transactional fields reached
the client.

The failed attempt permanently blocks the rest of the frozen window. A later
run would be replacement spend and requires a new exact approval.

## What is proven and unknown

**Proven:**

- the real provider lifecycle reached completion;
- the deterministic formatter found no recognized numbered product heading;
- the route failed closed without exposing unsafe content; and
- the current natural-Markdown boundary failed the mandatory 6/6 completion
  prerequisite on its first run.

**Not proven:**

- whether Terra omitted numbering, used another heading shape, produced no
  products, truncated, or otherwise drifted;
- product usefulness, leader recall, stability, constrained accuracy, source
  semantics, or blind preference versus legacy; and
- actual T5B tokens, hosted-search count, or estimated cost.

Raw provider content was intentionally not retained, so do not guess the answer
shape or loosen the parser based only on the bounded cause. The T4E estimate of
`$0.6990575` for one response is planning context, not actual T5B cost.

## Measurement defect discovered

The route produced a bounded completion diagnostic before formatting, including
model, token, hosted-search, source-count, and duration totals. The live runner's
failure record retained only the verification cause, so that safe usage record
was lost when formatting failed. Any future live experiment must preserve this
bounded diagnostic on the failed-attempt path without retaining provider IDs,
prompts, answers, URLs, headers, or secrets.

## Strongest next decision

Do not start another parser-fix/retry loop. The smallest responsible next step
is a separately approved zero-live architecture decision with two candidates:

1. add privacy-safe structural failure diagnostics and make the same one-call
   response include a machine-readable product contract; or
2. stop the two-layer architecture if a machine-readable contract would defeat
   the ChatGPT-like research behavior the prototype is meant to preserve.

Do not broaden the existing Markdown regex without captured structural evidence.
Do not begin a verifier, promotion, rollout, or legacy-retirement phase: T5B
produced no quality evidence supporting them.

**Recommended reasoning level:** Highest. This is now a material architecture
decision about the model-output contract and whether the path remains viable,
not routine implementation or gate execution.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-fetch/source-page, retry, replacement, or
  additional shopper request is approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, push,
  publish, or alter production.
- Do not expose or persist shopper prose, prompts, answers, source paths, job
  tokens, provider IDs, request headers, API keys, or raw responses.
- Preserve the failed T5B attempt and all pre-existing untracked artifacts/live
  fixtures. Stage explicit documentation files only; never use `git add -A`.
- Do not weaken identity, eligibility, citation ownership, exact-requirement
  enforcement, or no-receipt transactional omissions to obtain a completion.

## Verification and repository state

- Provider calls: one Terra/high create, 13 retrieves, zero cancels.
- Other live calls: zero Serper, SearchAPI, retry, replacement, fallback, or
  direct source-page opens.
- The gate child process ended; no gate process or process-only secret remains.
- `.env.local`, flags, deployment, and production remain unchanged.
- The pre-live wall remains 1106/1106 tests across 150 suites; typecheck, build,
  offline evaluation, and diff checks passed; lint had zero errors and three
  pre-existing warnings.
- T5B made no code change. Phase documentation is the only tracked change.

## Outstanding peer-review debt

- Entries [42]-[57] still await Claude's older lifecycle/unguarded-evidence
  review.
- Entry [71] asks Claude to challenge the machine-readable-contract decision
  and the privacy-safe failure-diagnostic proposal. Dialogue remains advisory
  and authorizes no work.

## Retrieval map

| Need | Retrieve |
|---|---|
| Frozen gate and live result | OAI-T5A/T5B in `docs/forward-roadmap.md` |
| Canonical evidence | latest OAI-T5A/T5B entries in `docs/qa-loop-results.md` |
| Failed attempt | untracked `oai-t5b-two-layer-04dd3a0` directory |
| Prompt and formatter | `lib/twoLayerMasterPrompt.ts`, `lib/twoLayerFormatter.ts` |
| Route diagnostics | `lib/twoLayerRecommendationRoute.ts` |
| Gate analyzer and runner | `scripts/two-layer-quality-gate.mjs`, `scripts/run-two-layer-quality-gate.mjs` |
| Peer channel | `docs/agent-dialogue.md` entry [71] |

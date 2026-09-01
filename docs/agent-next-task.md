# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-13 Steps 1 through 3 are complete. The exact quality-ranking implementation
commit is `1b4ca46a4e13cde6a9e81eb3744fda68b4671562`. It follows the
source-bound scout commit `a9a2036bd25dd3ff3af6e255dd864ffe323bdbeb`
and its checkpoint documentation commit `4b25dfc`.

The runtime is one synchronous `POST /api/recommendations`: deterministic
request/requirement validation; one optional bounded GPT-5.4 Mini market scout;
three neutral Shopping searches started concurrently with that scout; up to
three exact searches for undiscovered `strong` targets; deterministic filtering
and verification; post-gate quality ordering; and the unchanged minimal JSON
card. There is no background job, alternate recommender, legacy planner, model-
generated Shopping query, report, citation, or review-summary path.

Taylor explicitly removed further approval pauses for this goal. Step 4 is
authorized and should continue without asking. No push, deployment, release,
production-data action, dependency change, public API change, or card change is
included.

## Implemented quality path

`lib/marketScout.ts` makes at most one GPT-5.4 Mini Responses call with strict
Structured Outputs, at most three hosted web-search calls, and included source
metadata. It returns up to five ordered brand/model/aliases/sourceUrls targets.
Only exact canonical URLs in completed response-owned search calls bind.
`strong` requires two independent recognized editorial/test domains including
a comparative source; `supported` requires one comparative source or two
independent recognized editorial domains. All other targets are removed.

Validated plans cache for 24 hours by normalized request, model, and prompt
version. Invalid, insufficient, missing-client, timed-out, provider-failed, or
over-ceiling results are not cached and fall back to neutral discovery with no
quality target. Cancellation propagates through shared provider work.

`lib/productSelection.ts` launches the neutral Shopping work before the scout
finishes. It searches at most the three highest `strong` exact models not
already present after early product, condition, market, and extreme-budget
filters. The total logical Serper ceiling is fifteen: no more than six discovery
searches and nine candidate-local page-resolution opportunities.

Market evidence attaches only when canonical brand and exact stable model code,
label, or alias match. Named, numeric, generation, year, and model-code siblings
do not inherit evidence. Shopping rating, rating count, offer count, product ID,
and position remain internal commerce signals. Bayesian rating uses
`(rating * count + 4.0 * 50) / (count + 50)`.

Before bounded verification and again after every existing gate passes, order
by: `strong`, `supported`, unscored; directly supported preferences; scout
consensus; Bayesian rating; review count; offer count; page resolvability;
merchant trust; stable discovery order. Price is an eligibility ceiling only.
Brand diversity runs afterward while retaining the strongest passing leader in
the first card.

## Frozen baseline and benchmark

The last live result remains the Step 1 cache-cold baseline; Steps 2 and 3 made
no live provider calls:

| Category | Non-empty runs |
| --- | ---: |
| 14-cup programmable coffee maker under $150 | 3/3 |
| Self-emptying robot vacuum under $300 | 3/3 |
| 27-inch 1440p 144Hz gaming monitor under $300 | 3/3 |
| Wet/dry shop vacuum under $200 | 2/3 |
| Pressure washer at least 2,000 PSI under $300 | 3/3 |
| Brushless cordless drill with battery under $200 | 3/3 |
| Laptop with 16 GB RAM and 512 GB SSD under $900 | 3/3 |
| Cordless leaf blower at least 400 CFM with battery under $250 | 3/3 |

Overall non-empty recall was 23/24, shop vacuum 2/3, mean 12,507 ms,
nearest-rank p95 18,806 ms, minimum 7,093 ms, and maximum 20,419 ms under one
OpenAI response and no more than twelve then-current logical Serper operations.

The QA-only registry is
`tests/benchmarks/pr13-market-leaders-v2026-09a.json`. It cannot enter runtime
discovery, evidence, eligibility, price, availability, or ordering. Tests only
prove that its eight exact identities can bind under the generalized matcher.

## Step 3 verification

- Full unit tests: 317/317 across 43 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; routes are only `/`,
  `/_not-found`, and `/api/recommendations`.
- Playwright: 7/7 pass across Chromium desktop/mobile.
- `git diff --check`: pass at the staged implementation snapshot.
- Public request/response shape: unchanged.

Focused tests prove scout/neutral concurrency, at most three exact strong-
target searches, six discovery plus nine resolution operations, exact model and
sibling isolation, all eight frozen identities, tier order before commerce,
preference and consensus precedence, final post-gate sorting, and that 5.0/1
cannot outrank 4.6/1,000 solely through ratings.

## Hard boundaries

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`; suppress untracked enumeration and use
explicit path-scoped searches.

Several earlier sessions and Step 2 recorded path-only protected-fixture
enumerations, most recently from `git status --short --branch`. No protected
fixture was opened, statted individually, hashed, parsed, copied, edited,
deleted, or used as evidence. Do not repeat the process violation.

Do not weaken product type/accessory/condition, hard requirements, exact model
and sibling identity, merchant binding, availability, USD budget, price
authority, page eligibility, duplicate URL, image, or SSRF gates. Market or
commerce signals cannot create eligibility or reach the public payload. Do not
retry until desired output appears.

## Next authorized work

Execute PR-13 Step 4 using the precommitted three-by-eight cache-cold matrix,
one single attempt per case per round, no retries:

- zero safety, identity, hard-requirement, availability, or budget failures;
- at least one independently registered in-budget leader in the top three in
  at least 80% of eligible runs;
- every passing `strong` leader ahead of unscored alternatives;
- non-empty recall at least 21/24, including shop vacuum at least 2/3;
- cache-cold nearest-rank p95 at most 25 seconds and maximum at most 30 seconds;
- one OpenAI response, at most three hosted searches, and at most fifteen
  logical Serper operations per request;
- unchanged public payload shape and no material size increase.

Record per-run latency, result names/URLs/prices, market tiers, neutral/target/
resolution calls, physical attempts, hosted calls, OpenAI calls, input/output/
total tokens, approximate cost, response bytes, constraint verdicts, eligible
leader/top-three verdicts, and baseline-versus-new quality. If a gate fails,
attribute the earliest safe cause before changing code and rerun only with a
new explicitly recorded matrix, never by replacing failed attempts.

Use high reasoning for live failure attribution and identity/quality judgment;
routine command execution and document maintenance can use medium reasoning.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Active PR-13 decision | `docs/forward-roadmap.md`, PR-13 |
| Canonical Step 3 result | latest PR-13 entry in `docs/qa-loop-results.md` |
| Durable quality contracts | `docs/review-radar-test-memory.md`, PR-13 |
| Frozen QA benchmark | `tests/benchmarks/pr13-market-leaders-v2026-09a.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Exact Step 3 implementation | `1b4ca46a4e13cde6a9e81eb3744fda68b4671562` |

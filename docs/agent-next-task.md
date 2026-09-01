# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-13 Steps 1 and 2 are complete. The exact Step 2 implementation commit is
`a9a2036bd25dd3ff3af6e255dd864ffe323bdbeb`; it follows the prerequisite
implementation commit `5404142a5442260bdeb67bb4528a87e1cdafbfba` and its
handoff commit `ca42139`.

The legacy selection planner has been deleted. The runtime now uses one
optional source-bound GPT-5.4 Mini market scout, three neutral Shopping
queries, the existing deterministic safety/verification pipeline, one
synchronous `POST /api/recommendations`, and no background or alternate
recommender. Step 3 quality-search and ranking work has not started.

Taylor approved Step 2 and explicitly removed further approval pauses for this
goal. Continue through Steps 3 and 4 without asking for phase approval. No push,
deployment, release, production-data action, dependency change, public API
change, or product-card change is included.

## Objective and verified bottleneck

**Objective:** place the strongest independently supportable current products
within the shopper's budget ahead of ordinary alternatives, while preserving
the minimal card and every product, requirement, identity, condition, price,
availability, page, image, and SSRF gate.

**Verified bottleneck:** the prerequisite selector can repeatedly find safe
purchasable products, but its removed planner named products from model memory
without current market-quality evidence. Shopping position, price, and model
memory could not prove that a product was a market leader.

**Step 2 correction:** `lib/marketScout.ts` makes one fixed GPT-5.4 Mini
Responses call with strict Structured Outputs, at most three hosted web-search
calls, and included response-owned source metadata. It returns only up to five
ordered exact-model targets containing brand, model, aliases, and source URLs.
It cannot produce Shopping queries, prices, scores, prose, review summaries,
or card content.

A source URL binds only after canonical membership in a completed web-search
call's actual source set. `strong` requires two independent recognized
editorial/test domains and at least one comparative test source; `supported`
requires one comparative source or two independent recognized editorial
domains. Manufacturer, commerce, marketplace, community, unrecognized,
incomplete-call, malformed, non-HTTPS, and unbound sources cannot support a
target. Unsupported targets never enter production selection.

Validated plans cache for 24 hours by normalized request, model, and prompt
version. Invalid output, insufficient evidence, missing credentials, provider
errors, timeouts, and tool-ceiling violations are not cached and fall back to
neutral deterministic Shopping discovery with no quality target. Cancellation
propagates through shared cache work.

## Last measured baseline

No new live provider matrix ran in Step 2. The accepted Step 1 cache-cold
baseline remains:

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

Overall recall is 23/24 and shop vacuum is 2/3. Mean latency is 12,507 ms,
nearest-rank p95 is 18,806 ms, minimum is 7,093 ms, and maximum is 20,419 ms.
Every request used one OpenAI response and no more than twelve logical Serper
operations. This proves the prerequisite recall gate, not leader recall.

The QA-only frozen leader registry remains
`tests/benchmarks/pr13-market-leaders-v2026-09a.json`. It cannot enter
production discovery, eligibility, price, availability, or ranking.

## Step 2 verification

- Focused market-scout tests: 13/13 pass.
- Full unit tests: 303/303 across 42 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; routes are only `/`,
  `/_not-found`, and `/api/recommendations`.
- Playwright: 7/7 pass across Chromium desktop/mobile.
- Final staged `git diff --check`: pass.
- Public request/response shape: unchanged.

## Hard boundaries

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
delete `tests/fixtures/review-radar-live/**`; exclude it from searches and
suppress untracked enumeration in Git status commands.

Earlier work recorded protected-fixture path-only traversals. At Step 2
resumption, one `git status --short --branch` command again enumerated those
paths. No protected fixture was opened, statted individually, hashed, parsed,
copied, edited, deleted, or used as evidence. This remains a process-boundary
violation; do not repeat it.

Do not weaken or bypass the deterministic product/type/accessory/condition,
hard-requirement, exact-model/sibling, merchant, availability, USD budget,
price-authority, page-eligibility, duplicate URL, image, or SSRF gates. Do not
let quality evidence create eligibility, attach by brand alone, move across
sibling variants, or reach the public payload. Do not reintroduce reports,
citations, review summaries, background work, or alternate recommenders.

## Next authorized work

Implement PR-13 Step 3:

1. Start the market scout and three neutral Shopping queries concurrently.
2. Search at most the three highest `strong` exact-model targets not already
   discovered. Preserve six discovery searches plus nine candidate-local
   resolution opportunities under fifteen logical Serper operations.
3. Capture Shopping rating, rating count, offer count, product ID, and position
   as internal commerce signals only.
4. Attach market evidence only after exact stable model identity match and
   preserve sibling isolation.
5. After every existing safety/eligibility gate passes, rank by evidence tier,
   directly supported preferences, scout consensus order, Bayesian rating
   shrinkage, review/offer volume, page resolvability, merchant trust, and
   stable discovery order. Price is eligibility only.
6. Preserve brand diversity while putting the strongest passing leader first.

Then execute Step 4 without another approval pause: full static/unit/E2E
validation and the precommitted cache-cold three-by-eight matrix with no
retries. Report leader recall, constraint precision, latency, OpenAI/hosted/
Serper calls, tokens, cost, payload size, and baseline-versus-new quality.

Use high reasoning for exact-model evidence attachment and ranking invariants;
routine test and documentation execution can use medium reasoning.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Active PR-13 decision and next work | `docs/forward-roadmap.md`, PR-13 |
| Canonical Step 2 result | latest PR-13 entry in `docs/qa-loop-results.md` |
| Durable scout contracts | `docs/review-radar-test-memory.md`, PR-13 |
| Frozen QA benchmark | `tests/benchmarks/pr13-market-leaders-v2026-09a.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Exact Step 2 implementation | `a9a2036bd25dd3ff3af6e255dd864ffe323bdbeb` |

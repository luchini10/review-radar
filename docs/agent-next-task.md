# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through local runtime commit
`7077c37` (`Improve request-time market scout handoff`). Every recommendation
request still performs fresh current commerce discovery, source research,
validation, ranking, and page resolution. No market plan, Shopping result,
product-page result, recommendation, or research artifact survives the request
that created it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

The implementation is deterministic-green but **not release-qualified**. The
latest no-retry matrix passed request success, non-empty recall, both shop-vac
cells, safety, exact evidence binding, public shape, and operation ceilings. It
failed the 80% frozen-leader gate and the 25-second p95 / 30-second maximum
latency gates. Do not describe ReviewRadar as reliably returning the best
product in budget.

Taylor authorized all in-scope local work and commits for this goal, including
departing from the earlier synchronous/no-background planning boundary. No
further phase-approval pause is required. The current implementation remains
request-time-only because the goal separately prohibits retained or
precomputed recommendations and no alternate path has measured better.

## Current request-time architecture

`lib/productSelection.ts` first runs up to three current, brand-neutral Shopping
queries. It applies the existing early type, accessory, condition, voltage, and
identity filters, deduplicates the results, and passes at most fifteen bounded
candidate summaries to one fresh scout. A summary contains only candidate name,
brand, model tokens, retailer, current observed price, rating/count, offer
count, and Shopping position. It contains no URL or snippet, is explicitly
untrusted, and cannot establish identity, eligibility, evidence, price
authority, availability, or any public field.

`lib/marketScout.ts` then makes one GPT-5.4 Mini Responses call with strict
Structured Outputs, `store: false`, no SDK retries, a 60-second deadline, three
requested and maximum hosted searches, low reasoning, and a 6,000-token output
ceiling. It researches the current roster first while retaining authority to
nominate stronger omitted leaders. It returns at most five ordered exact-model
targets. A source URL binds only when it appears in that response's completed
web-search source set. `strong` requires two independent recognized domains
including a comparative source; `supported` requires one comparative source or
two recognized editorial domains. Invalid or unavailable scouting falls back
to neutral discovery with no quality boost.

Broad requests now retain three distinct neutral discovery queries: the base
category, `top rated`, and `popular models`. Previously, empty budget and
priority fields collapsed the first three candidates to one unique query and
left broad searches with only two Shopping calls. These variants improve
discovery breadth only; their wording is not market evidence.

After scouting, the selector may run up to three exact Shopping target searches,
three organic exact-target page searches, and candidate-local resolution while
preserving the hard fifteen-logical-Serper-operation ceiling. Final ordering
occurs only after product type, accessory, condition, exact identity, hard
requirements, availability, trusted USD price, budget, direct page, image, and
SSRF gates pass: `strong`, `supported`, unscored; supported preferences; scout
order; Bayesian commerce rating with a 4.0/50 prior; review/offer volume; page
and merchant quality; stable discovery order. Price is an eligibility ceiling
and never a quality bonus.

The only coalescing maps are created inside `selectProducts` and die with that
request. Responses use `Cache-Control: no-store`. There is no production index,
prewarm, polling, background refresh, persistent market-plan cache,
cross-request Shopping/page cache, or alternate recommender.

## Latest live result

The frozen benchmark remains five broad and five constrained searches, one
cache-cold attempt per cell and no retries or replacements. The authoritative
report is `docs/pr14-live-accuracy-report-v14-commerce-informed.json`.

| Metric | Committed V10 baseline | Commerce-informed V14 |
| --- | ---: | ---: |
| HTTP success | 10/10 | 10/10 |
| Non-empty | 7/10 | 10/10 |
| Frozen leader top three | 1/7 eligible (14.29%) | 2/9 eligible (22.22%) |
| Runtime evidence | 2/10 | 5/10 |
| Runtime `strong` | 2/10 | 3/10 |
| Scout fallback | 1/10 | 0/10 |
| Mean / p95 / max latency | 31,884 / 43,430 / 43,430 ms | 31,456 / 40,163 / 40,163 ms |
| Logical/physical Serper operations | 133 / 133 | 137 / 137 |
| Model tokens | 190,266 | 200,336 |
| Mean / max public payload | 754 / 1,552 bytes | 803 / 1,304 bytes |

V14 used ten OpenAI Responses, thirty hosted searches, 137 logical and physical
Serper operations, 187,726 input and 12,610 output model tokens, and
approximately $0.197539 model-token cost at the benchmark's published rates.
Every request supplied the scout with the maximum fifteen current commerce
summaries. All product-safety, exact-binding, fresh-research, public-shape,
one-response, hosted-search, operation-ceiling, and strong-ahead-of-unscored
gates passed.

This is a measured incremental improvement over V10, especially in non-empty
and evidence-bearing results. It is not proof of dependable best-in-budget
quality: leader recall remains 57.78 percentage points below the 80% gate, and
tail latency remains 15,163 ms above p95 and 10,163 ms above maximum limits.

## Verification

- Unit tests: 350/350 across 44 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 across Chromium desktop/mobile. It emitted environment-level
  `NO_COLOR` / `FORCE_COLOR` notices, not application warnings.
- `git diff --check`: pass.

These checks prove deterministic invariants, not the failed live market-quality
SLO.

## Assessment and next decision

The proven bottleneck remains canonical current commerce coverage and exact page
resolution, not the deterministic ranker or source-tier rules. The current
handoff helps the scout reason about products actually visible to Shopping, but
source-backed exact leaders still frequently fail to bind to an eligible US
offer and direct page within the latency budget. More prompt tuning or more
operations through the same provider is not supported by V11-V14.

The strongest next architecture is a request-scoped provider or retailer
integration that returns canonical product identity, current offers, seller
pages, and stable product identifiers. SerpApi's documented Shopping plus
Immersive Product APIs are a technically plausible candidate, but no credential
is configured and no ReviewRadar live qualification has run. Do not integrate
or claim it until credentials and a frozen provider comparison are available.
A progressive/asynchronous response remains an authorized comparison, but it
changes the public contract and does not itself improve commerce coverage.

Recommended reasoning level: **high** for provider/contract selection; medium
for deterministic integration after a provider and credential are available.

## Hard boundaries and process incidents

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js reported loading it during ordinary build startup; its contents were
never manually opened or used as evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`. Suppress untracked enumeration and use
explicit path-scoped searches.

Three process incidents occurred during this goal:

1. A broad `rg --files docs tests` command unintentionally enumerated protected
   fixture path names without opening contents.
2. A later broad `rg` content search matched and printed a few protected-
   fixture brand lines. They were not used as evidence.
3. `git status --short --branch` unintentionally enumerated untracked protected-
   fixture path names. It did not open, read, stat, hash, parse, copy, edit, or
   delete fixture contents. Subsequent status checks use
   `--untracked-files=no`.

Do not repeat those command patterns. Do not weaken product type/accessory/
condition, hard requirements, exact identity, merchant binding, availability,
USD budget, price authority, page eligibility, duplicate URL, image, or SSRF
gates. Market and commerce signals never create eligibility or reach the public
payload. Do not retry until a preferred card appears. No push or deployment is
authorized or performed.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current runtime snapshot | `7077c37` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Prior authoritative baseline | `docs/pr14-live-accuracy-report-v10-authoritative.json` |
| Current authoritative report | `docs/pr14-live-accuracy-report-v14-commerce-informed.json` |
| Direct-page feasibility reports | V11, V12, and V13 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented at runtime commit `61a914d`.
The current branch adds only preserved feasibility evidence and a QA-harness
correction; the unsuccessful direct-product-page runtime experiment was removed.
Every recommendation request still performs fresh source research and current
commerce discovery. No market plan, Shopping result, product-page result,
recommendation, or research artifact survives the request that created it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

The implementation is deterministic-green but **not release-qualified**. The
latest no-retry matrix passed request success, non-empty recall, safety, exact
evidence binding, public shape, and operation ceilings, but failed the 80%
frozen-leader gate and the 25-second p95 / 30-second maximum latency gates. Do
not describe ReviewRadar as reliably returning the best product in budget.

Taylor authorized all in-scope local work and commits for this goal, including
departing from the earlier synchronous/no-background planning boundary. No
further phase-approval pause is required. The current implementation remains
request-time-only because the goal separately prohibits retained or precomputed
recommendations and no alternate path has measured better.

## Current request-time architecture

`lib/marketScout.ts` makes one fresh GPT-5.4 Mini Responses call per request
with strict Structured Outputs, `store: false`, no SDK retries, a 60-second
deadline, three requested and maximum hosted searches, low reasoning, and a
6,000-token output ceiling. It returns at most five ordered exact-model targets.
A source URL binds only when it appears in that response's completed web-search
source set. `strong` requires two independent recognized domains including a
comparative source; `supported` requires one comparative source or two
recognized editorial domains. Invalid or unavailable scouting falls back to
neutral discovery with no quality boost.

The route starts the scout and three neutral Shopping searches concurrently. It
may then run up to three exact Shopping target searches, three organic exact-
target page searches, and candidate-local resolution while preserving the hard
fifteen-logical-Serper-operation ceiling. Shopping rating, review count, offer
count, product ID, and position remain internal tie-breakers only.

Final ordering occurs only after product type, accessory, condition, exact
identity, hard requirements, availability, trusted USD price, budget, direct
page, image, and SSRF gates pass: `strong`, `supported`, unscored; supported
preferences; scout order; Bayesian commerce rating with a 4.0/50 prior;
review/offer volume; page and merchant quality; stable discovery order. Price is
an eligibility ceiling and never a quality bonus.

The only coalescing maps are created inside `selectProducts` and die with that
request. Responses use `Cache-Control: no-store`. There is no production
index, prewarm, polling, background refresh, persistent market-plan cache,
cross-request Shopping/page cache, or alternate recommender.

## Latest feasibility result

The frozen benchmark remains five broad and five constrained searches, one
cache-cold attempt per cell and no retries. Preserve every report; never replace
a miss or rerun after inspecting the desired result.

The scout was experimentally allowed to return a source-bound direct US
retailer/brand product-page lead. Such URLs never contributed to evidence tier
and remained subject to every current gate. Responses web-search source
metadata provides URLs but no trusted page title, so opaque retailer SKUs stayed
provisional until the independently fetched live page named the exact target.
Sibling or inaccessible pages failed closed.

| Report | Non-empty | Frozen leader top three | Mean / p95 / max ms | Direct-page outcome |
| --- | ---: | ---: | ---: | --- |
| V11 direct pages | 10/10 | 4/9 eligible (44.44%) | 32,764 / 40,017 / 40,017 | instrumentation absent |
| V12 two alternatives | 9/10 | 1/10 (10%) | 31,617 / 44,344 / 44,344 | two returned runs |
| V13 fetched identity | 10/10 | 2/10 (20%) | 29,405 / 41,268 / 41,268 | zero returned runs |

All three passed safety, exact evidence binding, unchanged public shape, one
OpenAI response/request, no more than three hosted searches/request, and no
more than fifteen logical Serper operations/request. All failed the leader and
latency gates.

V13 accepted four provisional direct-page URLs, rejected six, and returned zero
source-bound direct-page cards after all gates. It used ten OpenAI Responses,
thirty hosted searches, 125 logical/physical Serper operations, 179,500 input
and 15,089 output model tokens (194,589 total), and approximately $0.202525
model-token cost. Its five-field payload averaged 753 bytes and peaked at 1,577
bytes.

The direct-page runtime experiment and its tests were removed because it did not
demonstrate a product-quality or latency gain. The preserved production runtime
is again `61a914d`. The retained QA correction makes the benchmark's existing
25,000 ms p95 and 30,000 ms maximum gates explicit fields and executable
acceptance checks.

## Verification

- Unit tests: 347/347 across 44 suites.
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

The bottleneck is current canonical commerce coverage and page resolution, not
the deterministic ranker. Source-backed exact leaders frequently cannot be
bound to a current exact purchasable US offer before the latency budget is
exhausted. More scout prompt tuning is not supported by V11-V13, and a larger
search envelope already saturates the same provider while worsening latency.

Do not restore the direct-page experiment, retained/background evidence index,
unsafe URL inference, or a second recommendation path. The strongest next
architecture is a request-scoped provider or retailer integration that returns
canonical product identity, current offers, and direct pages. It must be
measured against the current runtime and against an explicit larger latency/
operation envelope. A progressive/asynchronous response remains an authorized
comparison, but it changes the public contract and does not itself improve
commerce coverage.

Recommended reasoning level: **high** for provider/contract selection; medium
for deterministic integration once a provider and credential are available.

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
3. During this continuation, `git status --short --branch` unintentionally
   enumerated untracked protected-fixture path names. It did not open, read,
   stat, hash, parse, copy, edit, or delete fixture contents. Subsequent status
   checks used `--untracked-files=no`.

Do not repeat those command patterns. Do not weaken product type/accessory/
condition, hard requirements, exact identity, merchant binding, availability,
USD budget, price authority, page eligibility, duplicate URL, image, or SSRF
gates. Market and commerce signals never create eligibility or reach the public
payload. Do not retry until a preferred card appears. No push or deployment is
authorized or performed.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Runtime snapshot | `61a914d` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Prior authoritative report | `docs/pr14-live-accuracy-report-v10-authoritative.json` |
| Direct-page reports | V11, V12, and V13 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

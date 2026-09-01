# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through runtime commit
`61a914d`. It performs fresh source research and current commerce discovery for
every recommendation request. No market plan, Shopping result, product-page
result, recommendation, or research artifact survives the request that created
it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy price when available, and product-page URL.
No push, deployment, release, production-data action, dependency change,
public-API change, or card expansion occurred.

The implementation is deterministic-green but **not release-qualified**. The
latest no-retry live matrix passed product safety, exact evidence binding,
public shape, and operation ceilings, but failed non-empty recall, the 80%
frozen-leader gate, and the 25-second p95 / 30-second maximum latency gates. Do
not describe the current path as reliably returning the best product in budget.

Taylor authorized all in-scope local work and commits for this goal, including
departing from the earlier synchronous/no-background planning boundary when it
would materially improve the objective. The current implementation remains
request-time-only because the goal separately prohibits precomputed or retained
recommendations and because no measured asynchronous or alternate-provider path
has yet proved better. No further phase-approval pause is required.

## Current request-time architecture

`lib/marketScout.ts` makes one fresh GPT-5.4 Mini Responses call per request
with strict Structured Outputs, `store: false`, no SDK retries, a 60-second
deadline, three requested and three maximum hosted searches, low reasoning,
and a 6,000-token output ceiling. It returns at most five ordered exact-model
targets. Every target must contain a distinctive model/catalog identifier, and
a source URL binds only when it appears in that response's completed web-search
source set. `strong` requires two independent recognized domains including a
comparative source; `supported` requires one comparative source or two
recognized editorial domains. Invalid or unavailable scouting falls back to
neutral discovery with no quality boost.

The route starts the scout and three neutral Shopping searches concurrently.
It may then run up to three exact Shopping target searches, three organic exact-
target page searches, and candidate-local resolution while preserving the hard
fifteen-logical-Serper-operation ceiling. Product-page searches also consume
same-response direct Shopping offers before organic results, without another
operation. Shopping rating, review count, offer count, product ID, and position
remain internal tie-breakers only.

Final ordering is applied only after product type, accessory, condition, exact
identity, hard requirements, availability, trusted USD price, budget, product-
page, image, and SSRF gates pass: `strong`, `supported`, unscored; supported
preferences; scout order; Bayesian commerce rating with a 4.0/50 prior;
review/offer volume; page and merchant quality; stable discovery order. Price
is an eligibility ceiling and never a quality bonus.

The only coalescing maps are created inside `selectProducts` and die with that
request. Response headers are `Cache-Control: no-store`. There is no production
index, prewarm, polling, background refresh, persistent market-plan cache,
cross-request Shopping/page cache, or alternate recommender.

## Final generalized corrections

- Scout aliases must preserve the target's exact model identifiers and named
  variants. Arbitrary trailing-letter siblings and aliases that drop variants
  such as `Complete` are rejected; the bounded bare-tool `B` suffix remains
  compatible.
- Exact-model binding supports short genuine catalog identities such as `X9`,
  retailer-split codes, exact model identity in direct-page URLs, and bounded
  source-derived Shopping identity only when the final page names no sibling.
- Evidence is never transferred by brand alone. Known brand conflicts fail
  closed, official brand hosts may supply a missing brand, and Moccamaster is
  canonicalized to Technivorm.
- Non-US locale paths such as `/eu-en/` and `/my/` are rejected in addition to
  foreign hosts. Named sibling and package conflicts remain isolated.
- A resolved page may preserve only its own exact, direct, same-merchant inline
  Shopping offer. Price, availability, image, retailer, and commerce signals
  never move across merchants.
- Resolved page titles and paths become bounded requirement evidence, allowing
  facts such as `cordless` or battery-powered identity without letting a corded
  conflict pass. Navigation-bar artwork is rejected as a product image.
- The QA runner independently rechecks every evidence-bearing returned card
  against the exact target brand/model/aliases and bounded identity sources.

## Executed live evidence

The frozen benchmark remains five broad and five constrained searches, one
cache-cold attempt per cell and no retries. The prior exact-scout report
`docs/pr14-live-accuracy-report-v4-exact-scout.json` is the behavior baseline.

The first new run, `docs/pr14-live-accuracy-report-v9-authoritative.json`,
completed 10/10 requests and 10/10 non-empty with 3/9 eligible frozen leaders,
but its new exact-binding assertion failed one source-derived binding because
the debug envelope had discarded the earlier exact identity text. The report
is preserved as a failed QA-harness run; it is not treated as proof of a product
mismatch.

After correcting only debug telemetry and the assertion input, the replacement
no-retry report `docs/pr14-live-accuracy-report-v10-authoritative.json` is the
authoritative result:

| Metric | Prior exact scout | Current authoritative | Gate |
| --- | ---: | ---: | ---: |
| Successful HTTP responses | 10/10 | 10/10 | zero failures - pass |
| Exact evidence bindings | not independently reported | 10/10 runs | pass |
| Non-empty | 10/10 | 7/10 | at least 8/10 - **fail** |
| Frozen leader in top three | 1/9 eligible (11.11%) | 1/7 eligible (14.29%) | at least 80% - **fail** |
| Runtime evidence / `strong` | 4/10 / 3/10 | 2/10 / 2/10 | report |
| Scout fallback | 0/10 | 1/10 | report |
| Mean latency | 26,454 ms | 31,884 ms | report |
| Nearest-rank p95 / maximum | 36,077 ms | 43,430 ms | 25,000 / 30,000 ms - **fail** |
| OpenAI Responses | 10 | 10 | one/request - pass |
| Hosted searches | 30 | 30 | at most three/request - pass |
| Logical Serper work | 137 | 133 | at most fifteen/request - pass |
| Mean / maximum payload | 710 / 1,378 B | 754 / 1,552 B | public shape unchanged - pass |

The current run used 177,246 input and 13,020 output model tokens, 190,266
total, with an estimated $0.191525 model-token cost at the public rates used by
the harness. Five of ten runs planned at least one `strong` target; two returned
evidence-tiered cards and both returned `strong` cards. Every passing strong
card ranked ahead of unscored alternatives. Three searches returned honest
empty shortlists after their candidates failed current commerce/safety gates.

The absolute frozen-leader hit count did not improve over the prior exact-scout
baseline, non-empty recall regressed, and latency worsened. The new code closes
observed identity and market-locale defects, but the live sample does not prove
better aggregate product quality.

## Verification

- Unit tests: 347/347 across 44 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 pass across Chromium desktop/mobile; only environment-level
  `NO_COLOR` / `FORCE_COLOR` notices were emitted.
- Live in-app browser: one under-$400 drip-coffee-maker request returned HTTP
  200 in 28.6 seconds and rendered five minimal cards; 1440px and 390px layouts
  had no horizontal overflow, every card stayed inside the viewport, and the
  browser console had no warnings or errors.
- `git diff --check`: pass before the implementation commit.

These checks prove the implemented invariants, not live market coverage or the
failed quality SLO.

## Assessment and next decision

The exact source-binding and ranking mechanics are safer, but the stronger
product objective is still unmet. The proven bottleneck is current commerce
coverage and page resolution: source-backed exact leaders frequently cannot be
bound to a current, exact, purchasable US retailer page before the request
budget is exhausted. The ranker cannot promote evidence that does not survive
identity, availability, condition, price, budget, and product-page gates.

Do not restore a retained/background evidence index or claim dependable best-
in-budget selection. The strongest next architecture comparison is request-
scoped direct commerce resolution from a provider or retailer integration that
supplies canonical product identities, current offers, and direct pages,
versus an explicitly larger latency/operation envelope. A progressive response
is also authorized for evaluation, but changes the public request contract and
must be measured against the direct-resolution option rather than assumed.

Recommended reasoning level: **high** for that provider/contract comparison;
medium for deterministic follow-up.

## Hard boundaries and process incidents

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js reported loading it during ordinary dev/build startup; its contents
were never manually opened or used as evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`; suppress untracked enumeration and use
explicit path-scoped searches.

Two process incidents occurred during this goal:

1. A broad `rg --files docs tests` command unintentionally enumerated protected
   fixture path names. It did not open fixture contents.
2. A later broad `rg` content search scoped to several implementation files and
   `tests` unintentionally matched and printed a few protected-fixture lines
   containing brand references. Those lines were not used as implementation or
   QA evidence. No fixture was modified, copied, deleted, or hashed, and no
   further fixture-tree access occurred.

Both incidents were disclosed. Do not repeat either command pattern.

Do not weaken product type/accessory/condition, hard requirements, exact-model
identity, merchant binding, availability, USD budget, price authority, page
eligibility, duplicate URL, image, or SSRF gates. Market and commerce signals
never create eligibility or reach the public payload. Do not retry until a
preferred card appears. No push or deployment is authorized or performed.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Runtime snapshot | `61a914d` |
| Current decision and failed release verdict | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA record | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable current contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen live benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Prior/current reports | `docs/pr14-live-accuracy-report-v4-exact-scout.json`, `docs/pr14-live-accuracy-report-v9-authoritative.json`, `docs/pr14-live-accuracy-report-v10-authoritative.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |

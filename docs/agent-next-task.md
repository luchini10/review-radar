# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

The request-time market-quality reset is implemented locally through
`a80b38d`. It reverses the proposed persistent/background evidence-index path:
every recommendation request performs fresh source research and current
commerce discovery, and no market plan, Shopping result, product-page result,
recommendation, or research artifact survives the request that created it.

The public contract remains one `POST /api/recommendations` that returns only
image, name, category, trustworthy price when available, and product-page URL.
No push, deployment, release, production-data action, dependency change, public
API change, or card change occurred.

The code is deterministic-green but **not release-qualified**. The final
no-retry live audit failed the 80% leader-recall, p95, and 30-second maximum
gates. Do not describe the current path as reliably returning the best product
in budget.

Taylor authorized the full local goal, including local commits, and removed
phase-approval pauses. That authority does not permit weakening evidence,
identity, availability, budget, SSRF, or other product-safety gates; retrying
failed matrix cells; pushing; or deploying.

## Current request-time architecture

`lib/marketScout.ts` makes one fresh GPT-5.4 Mini Responses call per request
with strict Structured Outputs, `store: false`, no SDK retries, a 45-second
deadline, two requested hosted searches, and a hard validator ceiling of three
completed hosted searches. It returns at most five ordered exact-model targets.
A source URL binds only when it occurs in that response's completed web-search
source set. `strong` still requires two independent recognized domains and a
comparative source; `supported` requires one comparative source or two
recognized editorial domains. Invalid or unavailable scouting falls back to
neutral discovery with no quality boost.

The route starts the scout and three neutral Shopping searches concurrently.
It may then run up to three exact Shopping target searches, up to three organic
exact-target page searches, and candidate-local resolution while preserving
the hard fifteen-logical-Serper-operation ceiling. Shopping rating, review
count, offer count, product ID, and position are internal tie-breakers only.
Evidence attaches to exact stable brand/model identity, never a brand or sibling
variant.

Final ordering is applied only after product type, condition, exact identity,
hard requirements, availability, trusted USD price, budget, product-page, and
SSRF gates pass: `strong`, `supported`, unscored; supported preferences; scout
consensus; Bayesian commerce rating with a 4.0/50 prior; review/offer volume;
page and merchant quality; stable discovery order. Price is an eligibility
ceiling and never a quality bonus.

The only coalescing maps are created inside `selectProducts` and die with that
request. Response headers are `Cache-Control: no-store`. There is no production
index, prewarm, polling, background refresh, persistent market-plan cache,
cross-request Shopping cache, cross-request product-page cache, or alternate
recommender.

## Executed live evidence

The dated ten-case PR-14 audit covers five broad and five constrained searches,
one cache-cold attempt per cell and no retries. Its raw progression is preserved
in the `docs/pr14-live-accuracy-report-*.json` files. The latest live run,
`docs/pr14-live-accuracy-report-final-exact-resolution.json`, recorded:

| Metric | Result | Gate |
| --- | ---: | ---: |
| Successful HTTP responses | 10/10 | zero request failures - pass |
| Non-empty | 9/10 | at least 8/10 - pass |
| Frozen leader in top three | 2/10 (20%) | at least 80% - **fail** |
| Runtime evidence returned | 6/10 | report |
| Runtime `strong` returned | 4/10 | report |
| Mean latency | 26,714 ms | report |
| Nearest-rank p95 / maximum | 47,732 ms | at most 25,000 / 30,000 ms - **fail** |
| OpenAI Responses | 10, one/request | one/request - pass |
| Hosted searches | 20, maximum two/request | at most three - pass |
| Logical/physical Serper work | 138, maximum 15/request | at most fifteen - pass |
| Public payload | mean 858 B, maximum 1,838 B | unchanged - pass |

The run used 132,684 input and 9,392 output model tokens. At the public model
rates used for the audit, model-token cost was approximately $0.141777. Strong
passing leaders ranked ahead of unscored products, and the broad robot-vacuum
case returned the frozen Dreame X60 leader first. This does not compensate for
the failed aggregate leader and latency gates.

The live report predates the final deterministic `a80b38d` guard. Audit review
found a generic-title pressure-washer result whose Walmart product slug named a
different leading brand. The generalized fix now rejects a product-detail URL
whose leading slug brand conflicts with the candidate brand. It is covered by
unit tests, but the paid ten-case matrix was not retried after that correction.

## Deterministic verification

- Full unit tests: 326/326 across 43 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 pass across Chromium desktop/mobile.
- `git diff --check`: pass at the last implementation snapshot.

These checks prove the implemented invariants, not live market coverage or the
failed quality SLO.

## Assessment and next decision

The current path is safer and more exact than the previous live implementation,
but it did not achieve dependable best-in-budget selection. The proven
bottleneck is the live commerce-resolution supply: source-backed exact leaders
often cannot be bound to a current, exact, purchasable retailer page within the
same request, and added live resolution pushes tail latency beyond the target.
The ranker cannot promote evidence that does not survive identity, availability,
and price verification.

Do not restore the rejected persistent evidence index or add a background
precomputation path. The strongest next architecture comparison consistent with
the product goal is request-scoped direct commerce resolution: evaluate a
provider or retailer integration that supplies canonical product identities,
current offers, and direct product pages, all fetched live and discarded after
the response. Compare that with an explicitly larger latency/operation budget
or a request-scoped progressive/asynchronous response. Any public-contract or
major-provider change needs a new scoped decision and measurement plan.

Recommended reasoning level: **highest** for the provider/architecture decision,
because it changes the quality, latency, cost, and trust envelope; medium for
routine deterministic follow-up.

## Hard boundaries and process incident

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`; suppress untracked enumeration and use
explicit path-scoped searches.

During this goal, a broad `rg --files docs tests` command unintentionally
enumerated protected fixture path names. No fixture content was opened, read,
hashed, statted individually, copied, edited, deleted, or used as evidence. The
incident was disclosed immediately and the fixture tree was not touched again.
This joins the earlier path-only incidents already recorded in the QA log; do
not repeat the process violation.

Do not weaken product type/accessory/condition, hard requirements, exact-model
identity, merchant binding, availability, USD budget, price authority, page
eligibility, duplicate URL, image, or SSRF gates. Market and commerce signals
never create eligibility or reach the public payload. Do not retry until a
preferred card appears.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current decision and failed release verdict | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA record | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable current contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen live benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Raw live reports | `docs/pr14-live-accuracy-report-*.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Final implementation before documentation | `a80b38d` |

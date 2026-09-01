# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-13 Step 1, prerequisite stabilization, is complete at local implementation
commit `5404142a5442260bdeb67bb4528a87e1cdafbfba`. That commit consolidates and
reviews the former uncommitted PR-11/PR-12 work, adds the dated QA-only
market-leader benchmark, corrects the measured resolution/availability losses,
and passes the required prerequisite gates.

PR-13 market-scout and quality-ranking behavior has not started. The current
runtime still uses the lightweight optional planner, three neutral Shopping
queries, and at most nine candidate-local resolution opportunities under the
twelve-logical-operation ceiling. There is one synchronous
`POST /api/recommendations`, zero or one OpenAI call, no background work, and
no alternate recommender.

No development server is running. No push, PR, deployment, release,
production-data action, dependency change, public API change, or product-card
change occurred.

## Objective, bottleneck, and completed result

**Objective:** make the existing selection engine repeatably return safe,
in-budget products before adding market-quality evidence.

**Verified bottleneck:** exact candidate pages were often found, but major
retailers blocked or challenged server-side page fetches. That converted
current same-merchant Shopping offers into unknown availability and caused
avoidable empty shortlists. Additional generalized losses came from retailer-
pinned model queries, one-page-only verification, decimal URL identity loss,
measurement text misclassified as a model, battery-kit wording, sibling model
URLs, and cross-merchant price transfer.

**Correction:** stable-model page queries are retailer-neutral. One
candidate-local search may retain up to two exact product pages on distinct
hosts. Exact merchant product paths are recognized; discontinued, parts,
listing, support, editorial, foreign-market, sibling-model, and unsafe pages
remain ineligible. Decimal URL specifications are preserved, strings such as
`MPH/450` do not become stable model IDs, and bounded battery-kit forms are
recognized.

A priced current Shopping offer may fill an otherwise unknown availability
state only after resolution to an exact product-shaped page on the same
Shopping merchant. Explicit page unavailability overrides it. Missing-price,
cross-merchant, unresolved, unsafe, or non-product destinations do not receive
this authority, and page price alone never creates availability.

## Frozen market-leader benchmark

`tests/benchmarks/pr13-market-leaders-v2026-09a.json` is the QA-only baseline
for the existing eight categories. Each exact registered model has at least
two independent current source domains and at least one comparative test
source. The contract test rejects duplicate cases, non-HTTPS sources,
insufficient domain independence, or a missing comparative source.

The registry cannot enter production discovery, eligibility, price,
availability, or ranking. Dynamic in-budget availability is evaluated during
future QA; a registered model is not automatically a passing leader.

## Live prerequisite result

The failed-first cache-cold round returned 4/8 non-empty and attributed the
dominant losses to exact resolved pages with unknown availability.

After the same-merchant current-offer correction, the frozen matrix ran three
fresh-server, cache-cold single attempts across the eight unchanged cases with
no retries:

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

Overall recall was 23/24. Shop vacuum was 2/3. Mean latency was 12,507 ms,
nearest-rank p95 was 18,806 ms, minimum was 7,093 ms, and maximum was 20,419
ms. Every request used one OpenAI response and no more than twelve logical
Serper operations. The required 21/24 and shop-vac 2/3 gates pass.

The one empty shop-vac attempt remains honest provider variability and was not
retried. This matrix proves prerequisite recall and preserved safety, not
market-leader recall or best-in-budget ranking.

## Verification

- Focused prerequisite suites: 69/69 pass.
- Full unit tests: 295/295 across 42 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; application routes are only `/`,
  `/_not-found`, and `/api/recommendations`.
- Playwright: 7/7 pass, including Chromium desktop and mobile shortlist checks.
- Final staged `git diff --check`: pass.
- Public request/response shape: unchanged.

## Hard boundaries

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
delete `tests/fixtures/review-radar-live/**`; exclude it from searches.

PR-11 recorded two accidental broad-search traversals of the protected fixture
tree. PR-12 recorded one path-only `git status --short` traversal. At PR-13
planning start, one broad `rg --files` again enumerated protected fixture paths.
No protected fixture was opened, statted individually, hashed, parsed, copied,
edited, deleted, or used as evidence. These were still process-boundary
violations; do not use broad repository enumeration again.

Do not infer availability from price alone, transfer Shopping authority across
merchants, accept family/listing/discontinued/parts pages, retry until a desired
product appears, or raise the current twelve-operation ceiling during the
stabilized prerequisite. Do not reintroduce reports, review summaries,
citations, background work, or alternate recommendation paths.

## Remaining risks and review debt

- Search inventory, prices, and merchant pages vary after a request. The five-
  minute Shopping and two-minute product-page caches reduce but cannot remove
  that uncertainty.
- Same-merchant Shopping availability is current provider evidence, not a live
  checkout guarantee. Explicit page unavailability remains authoritative.
- The frozen leader registry is intentionally small and QA-only. It does not
  yet measure leader recall, cross-source consensus order, or quality ranking.
- Hosted and production-runtime behavior remains unverified.
- PR-13 Step 2 still requires implementation and review of response-owned
  web-search source binding, source tiers, exact model attachment, cache keying,
  failure fallback, cancellation, and hosted-search ceilings.

## Next decision

Stop here. The next phase is PR-13 Step 2: replace the lightweight planner with
one bounded GPT-5.4 Mini market scout while preserving one synchronous request,
one OpenAI response, structured output, at most three hosted searches, exact
response-owned source binding, 24-hour validated-plan caching, and deterministic
failure fallback with no quality boost.

Use high reasoning for Step 2 because source ownership, domain independence,
tool-call ceilings, and exact model identity are trust boundaries. Routine test
and documentation execution can use medium reasoning after those contracts are
settled. Wait for Taylor's explicit approval before beginning Step 2.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| PR-13 Step 1 decision and next boundary | `docs/forward-roadmap.md`, PR-13 |
| Canonical failed-first and 24-run outcome | latest PR-13 entry in `docs/qa-loop-results.md` |
| Durable prerequisite contracts | `docs/review-radar-test-memory.md`, PR-13 |
| Market-leader methodology and registry | `docs/phase-6-market-leader-evaluation.md` and `tests/benchmarks/pr13-market-leaders-v2026-09a.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Exact implementation snapshot | `5404142a5442260bdeb67bb4528a87e1cdafbfba` |

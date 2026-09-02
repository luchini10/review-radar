# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is retained at local runtime commit `ff8f3a0`
(`Remove SerpApi canonical commerce adapter`) on branch `main`. Serper is the
sole product-search and commerce transport. The rejected SerpApi adapter,
environment key, provider provenance, parallel product/store branch, separate
provider counters, QA fields, and adapter tests are deleted.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current USD price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, breaking public-API change, or card expansion occurred.

The provider correction passes, but PR-14 is **not release-qualified**. The
current-runtime V23 matrix returned 10/10 non-empty products safely, while
frozen-leader top-three recall was only 1/9 benchmark-eligible runs (11.1%) and
cache-cold p95/maximum was 34,196 ms. Do not describe ReviewRadar as reliably
returning the universal best product in budget.

Taylor authorized all in-scope local work and commits for this goal. No further
phase-approval pause is required. The prohibition on retained, precomputed, or
background recommendation research remains binding.

## Retained request-time architecture

Every request starts one fresh GPT-5.4 Mini Responses scout concurrently with
three neutral Serper Shopping searches. Commerce names, positions, ratings,
prices, retailers, offers, URLs, and snippets never enter the scout prompt and
cannot establish independent market leadership.

The scout uses strict Structured Outputs, `store: false`, no SDK retries, a
60-second deadline, at most three hosted web searches, low reasoning, and a
6,000-token output ceiling. It returns at most five ordered exact-model targets.
A source URL binds only when present in that response's completed web-search
source set. `strong` requires two independent recognized domains including a
comparative source; `supported` requires one comparative source or two
recognized editorial domains. Invalid or insufficient scouting falls back to
neutral discovery with no quality boost.

After neutral discovery, the selector may run up to three exact-model Serper
Shopping searches for the highest evidence targets not already found, up to
three organic strong-target page searches, and candidate-local page resolution.
All work stays inside fifteen logical Serper operations. An evidence-bound exact
model may retain two already-discovered merchant/page alternatives through
verification; final output still deduplicates to one card per product/page
identity and preserves brand diversity.

Editorial, comparison, review, support, and manual URLs are scout evidence only.
Unknown merchant pages are admissible only when an exact current Shopping
candidate binds that merchant. Product type, accessory, condition, exact
identity, hard requirement, availability, trusted USD price, budget, direct
page, image, duplicate, merchant, and SSRF gates remain authoritative. Prices
and facts never transfer across models or merchants.

Final ordering is evidence tier; directly supported shopper preferences; scout
consensus; Bayesian commerce rating with a 4.0/50 prior; review and offer volume;
page and merchant quality; stable discovery order. Price is an eligibility
ceiling, never a quality bonus. Commerce signals never create leader evidence,
eligibility, or public content.

Shopping and page coalescing exists only within the current request. The
response is `Cache-Control: no-store`. There is no production index, prewarm,
polling, background refresh, persistent plan/result cache, cross-request
Shopping/page cache, second commerce provider, or alternate recommender.

## SerpApi removal authority

Commit `c829fa4` introduced a second commerce provider. Taylor clarified that
ReviewRadar must use Serper rather than SerpApi. Commit `ff8f3a0` applies the
exact inverse of that isolated detour: all twelve touched runtime,
configuration, harness, type, and test paths match the parent of `c829fa4`, and
the two SerpApi-only files no longer exist.

Do not restore `SERPAPI_API_KEY`, `lib/canonicalCommerce.ts`, SerpApi provenance,
canonical product/store lookups, separate provider counters, or a second
commerce-provider fallback. Future accuracy work must improve request-time
Serper discovery, exact-target recovery, candidate prioritization, and page
verification within the approved call envelope.

## Authoritative current-runtime live result

After the earlier OpenAI credit failure cleared, one bounded debug smoke on
`ff8f3a0` returned HTTP 200 with four products in 28,346 ms. It used one
successful scout, three hosted searches, and 13 logical/physical Serper
operations. `scoutFallback` was null, architecture remained
`market_quality_live_v4_independent_concurrent`, and no canonical-commerce field
or SerpApi text was present.

The precommitted ten-case cache-cold V23 matrix then ran once per cell with no
retry, restart, or substitution. Its report is
`docs/pr14-live-accuracy-report-v23-serper-only-restored.json`:

- 10/10 HTTP 200 and 10/10 non-empty, including both shop-vac cases;
- accepted-candidate safety, exact evidence binding, fresh research, public
  shape, one-response, three-hosted-search, fifteen-Serper-operation, required-
  recall, and strong-ahead-of-unscored checks all passed;
- frozen leader top-three recall 1/9 benchmark-eligible runs (11.1%) versus the
  80% gate; only constrained coffee maker hit;
- runtime evidence 7/10, runtime `strong` 2/10, and scout fallback 0/10;
- mean/p95/maximum latency 29,930/34,196/34,196 ms, failing the 25-second p95
  and 30-second maximum gates;
- ten Responses calls, thirty hosted searches, and 138 logical/physical Serper
  operations, with every request at or below fifteen;
- 180,540 input plus 15,703 output tokens (196,243 total), approximately
  $0.206068 model-token cost at the benchmark's published rates; and
- unchanged five-field payload averaging 812 bytes and peaking at 1,357 bytes.

V23 is current-runtime authority. V20 on equivalent retained Serper-only
runtime `b4e1890` remains the stronger historical result: 10/10 non-empty,
5/10 leaders, 23,629 ms mean, and 29,646 ms p95/maximum. V21 and V22 remain
rejected same-provider experiments whose code was removed and reports retained
for audit only.

## Deterministic verification

- Focused product-search, selection, discovery, and API tests: 109/109.
- Full unit tests: 352/352 across 44 suites.
- TypeScript typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 across Chromium desktop/mobile; only environment-level
  `NO_COLOR` / `FORCE_COLOR` notices were emitted.
- Exact removal audit: all twelve paths touched by `c829fa4` match its parent;
  runtime/config/test searches find zero SerpApi or canonical-adapter references.

These checks prove the SerpApi removal, Serper-only deterministic invariants,
and unchanged public contract. V23 proves that the quality and latency SLOs are
still failed; green deterministic checks do not supersede that live result.

## Next action and release gate

First attribute the generalized V23 misses through the current Serper pipeline:
scout target qualification, neutral/exact Shopping discovery, exact-model
binding, current offer and page recovery, hard-feature proof, availability,
trusted price, and finalist verification. Use the saved report and new bounded
diagnostics; do not tune to frozen product names or rerun V23 opportunistically.

Only implement a correction after identifying the earliest general loss. Keep
one Responses call, at most three hosted searches, at most fifteen logical
Serper operations, current-request-only research, all safety and eligibility
gates, and the unchanged public response. Do not add SerpApi or any second
commerce provider.

Release still requires zero safety, binding, hard-requirement, availability, or
budget failures; at least 80% eligible leader top-three recall; any passing
`strong` leader ahead of unscored alternatives; required non-empty recall;
cache-cold p95 at most 25 seconds and maximum 30 seconds; one Responses call;
at most three hosted searches and fifteen logical Serper operations; and
unchanged payload shape.

Recommended reasoning level: high for loss attribution because quality misses
cross independent research, Serper discovery, and page verification; medium for
a bounded deterministic correction after root cause is established.

## Hard boundaries and process incidents

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js may auto-load it during ordinary build/dev startup; its contents are not
evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`. Suppress untracked enumeration and use
explicit path-scoped searches.

Four process incidents occurred earlier in this goal:

1. A broad `rg --files docs tests` unintentionally enumerated protected fixture
   path names without opening contents.
2. A later broad `rg` content search matched and printed a few protected-fixture
   brand lines. They were not used as evidence.
3. `git status --short --branch` unintentionally enumerated untracked protected-
   fixture path names. Subsequent status checks use `--untracked-files=no`.
4. During V18 investigation, a broad `rg` over `tests` printed several protected-
   fixture lines before narrowing. They were not used as evidence.

The SerpApi removal, debug smoke, and V23 matrix added no incident. No push,
deployment, release, production-data action, destructive operation, background
work, retained research cache, or benchmark retry occurred.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current runtime snapshot | `ff8f3a0` |
| Removed detour snapshot | `c829fa4` |
| Stronger historical live snapshot | `b4e1890` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | latest PR-14 entry in `docs/review-radar-test-memory.md` |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Current-runtime report | `docs/pr14-live-accuracy-report-v23-serper-only-restored.json` |
| Historical comparison | `docs/pr14-live-accuracy-report-v20-independent-concurrent.json` |
| Rejected reports | V21 and V22 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

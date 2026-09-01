# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is retained at local runtime commit `b4e1890`
(`Run market scout concurrently with discovery`). The current branch is `main`.
Every recommendation request independently starts one fresh market scout beside
three neutral Shopping searches, then validates and ranks current purchasable
products. No market plan, Shopping result, product-page result, recommendation,
or research artifact survives the request that created it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current USD price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

V20 remains the strongest measured safe architecture and the authoritative
retained report. It is **not release-qualified**: frozen-leader top-three recall
was 5/10 (50%) versus the 80% gate, and cache-cold p95 was 29,646 ms versus the
25-second gate. Do not describe ReviewRadar as reliably returning the universal
best product in budget.

Taylor authorized all in-scope local work and commits for this goal. No further
phase-approval pause is required. The prohibition on retained, precomputed, or
background recommendation research remains binding.

## Retained request-time architecture

`app/api/recommendations/route.ts` starts exactly one GPT-5.4 Mini Responses
scout before calling `selectProducts`. `lib/productSelection.ts` immediately
starts three brand-neutral Shopping queries and awaits them together with that
already-running scout. Commerce names, order, ratings, prices, retailers,
offers, URLs, and snippets never enter the scout prompt and cannot establish
independent market leadership.

`lib/marketScout.ts` uses strict Structured Outputs, `store: false`, no SDK
retries, a 60-second deadline, at most three hosted web searches, low reasoning,
and a 6,000-token output ceiling. It returns at most five ordered exact-model
targets. A source URL binds only when present in that response's completed web-
search source set. `strong` requires two independent recognized domains
including a comparative source; `supported` requires one comparative source or
two recognized editorial domains. Invalid, unavailable, or insufficient
scouting falls back to neutral discovery with no quality boost.

After neutral discovery, the selector may run up to three exact Shopping target
searches, three organic strong-target page searches, and candidate-local page
resolution while preserving the fifteen-logical-Serper-operation ceiling. An
evidence-bound exact model may retain up to two merchant/page alternatives
through verification so one unavailable or price-less seller does not erase
another already discovered seller. Final output still deduplicates to one card
per product/page identity and preserves brand diversity.

Editorial, comparison, review, support, and manual URLs are valid only as scout
evidence. Unknown merchant pages are admissible only when an exact current
Shopping candidate binds that merchant. Product type, accessory, condition,
exact identity, hard requirement, availability, trusted USD price, budget,
direct page, image, duplicate, and SSRF gates remain authoritative. Prices and
facts never transfer across models or merchants.

Final ordering is: `strong`, `supported`, unscored; directly supported shopper
preferences; scout consensus order; Bayesian commerce rating with a 4.0/50
prior; review and offer volume; page and merchant quality; stable discovery
order. Price is an eligibility ceiling and never a quality bonus. Commerce
signals never create leader evidence, eligibility, or public content.

Shopping and product-page coalescing maps exist only inside one request. The
response is `Cache-Control: no-store`. There is no production index, prewarm,
polling, background refresh, persistent plan/result cache, cross-request
Shopping/page cache, or alternate recommender.

## Authoritative and rejected live results

All three reports below use the same five broad and five constrained frozen
cases, one cache-cold attempt per cell, and no retry or replacement.

| Metric | Retained V20 | Rejected V21 | Rejected V22 |
| --- | ---: | ---: | ---: |
| HTTP success | 10/10 | 10/10 | 10/10 |
| Non-empty | 10/10 | 9/10 | 10/10 |
| Frozen leader top three | 5/10 | 2/10 | 2/10 |
| Runtime evidence | 6/10 | 4/10 | 6/10 |
| Runtime `strong` | 2/10 | 2/10 | 4/10 |
| Scout fallback | 1/10 | 1/10 | 0/10 |
| Mean latency | 23,629 ms | 23,674 ms | 26,008 ms |
| p95 / maximum | 29,646 / 29,646 ms | 26,274 / 26,274 ms | 32,916 / 32,916 ms |
| Logical / physical Serper | 137 / 137 | 139 / 137 | 144 / 143 |
| Model tokens | 190,585 | 179,651 | 191,130 |
| Estimated model cost | $0.189982 | $0.176157 | $0.199282 |
| Mean / max payload | 797 / 1,542 B | 658 / 1,440 B | 907 / 1,617 B |

V20 passed 10/10 request, non-empty, product-safety, exact-binding, fresh-
research, public-shape, one-response, three-hosted-search, fifteen-Serper-
operation, strong-ahead-of-unscored, both shop-vac, and 30-second maximum gates.
Only the 80% leader and 25-second p95 gates failed.

V21 tested recognized editorial-domain filtering, high search context, US
location, and supported-target page recovery. It lost three leaders and one
non-empty cell versus V20. V22 restored unrestricted medium-context scouting,
then tested a broader editorial prompt, normalized brand/model queries, and
concurrent exact Shopping/strong-target page recovery. It also lost three
leaders and exceeded the 30-second maximum. Both experimental code paths were
fully removed; their JSON reports are audit evidence only.

The reports are:

- authoritative: `docs/pr14-live-accuracy-report-v20-independent-concurrent.json`;
- rejected: `docs/pr14-live-accuracy-report-v21-source-focused.json`;
- rejected: `docs/pr14-live-accuracy-report-v22-concurrent-target-recovery.json`.

## Assessment and next decision

The remaining bottleneck is canonical request-time commerce coverage: an exact
market leader must converge with a trustworthy current US offer, in-budget
price, direct seller page, and hard-requirement proof. V21/V22 show that source
filtering, prompt expansion, target-query wording, more `strong` targets, and
extra same-provider page concurrency do not solve that boundary.

Do not restore either rejected experiment, tune to frozen benchmark identities,
transfer facts across variants or merchants, infer requirements from market
evidence, or weaken price/availability/page authority. The next credible
architecture comparison requires a qualified request-scoped provider or
retailer integration exposing canonical product identity, current offers,
seller pages, and stable identifiers. DataForSEO and Amazon Business were only
identified as possible contract classes; neither is integrated, credentialed,
or qualified in this repository.

A progressive response can change perceived latency but does not fix commerce
coverage and would be a separate public-contract decision. Recommended
reasoning level: **high** for provider/contract qualification; medium for a
deterministic integration after a provider is selected.

## Verification

- Retained V20 source: 352/352 unit tests across 44 suites, typecheck, zero-
  warning lint, and the Next.js 16.3.3 production build.
- Playwright: 7/7 across Chromium desktop/mobile after removing V21/V22. It
  emitted only environment-level `NO_COLOR` / `FORCE_COLOR` notices.
- `git diff --check`: pass; no tracked runtime/test drift remains from the two
  rejected experiments.
- Build route manifest: only `/`, `/_not-found`, and `/api/recommendations`.

These checks prove deterministic invariants, not the failed live market-quality
SLO.

## Hard boundaries and process incidents

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js may auto-load it during ordinary build/dev startup; its contents are not
evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`. Suppress untracked enumeration and use
explicit path-scoped searches.

Four process incidents occurred earlier in this goal:

1. A broad `rg --files docs tests` command unintentionally enumerated protected
   fixture path names without opening contents.
2. A later broad `rg` content search matched and printed a few protected-fixture
   brand lines. They were not used as evidence.
3. `git status --short --branch` unintentionally enumerated untracked protected-
   fixture path names. Subsequent status checks use `--untracked-files=no`.
4. During the V18 investigation, a broad `rg` over `tests` again printed several
   protected-fixture lines before narrowing. They were not used as evidence.

V21/V22 added no incident. Do not repeat those command patterns. No push,
deployment, release, production-data action, destructive operation, background
work, retained research cache, or benchmark retry occurred.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Retained runtime snapshot | `b4e1890` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | latest PR-14 entry in `docs/review-radar-test-memory.md` |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Authoritative report | `docs/pr14-live-accuracy-report-v20-independent-concurrent.json` |
| Rejected reports | V21 and V22 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through local runtime commit
`0b4c817` (`Harden market leader commerce resolution`). Every recommendation
request still performs fresh current commerce discovery, source research,
validation, ranking, and page resolution. No market plan, Shopping result,
product-page result, recommendation, or research artifact survives the request
that created it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

The implementation is deterministic-green but **not release-qualified**. The
latest single-attempt/no-retry V19 matrix passed request success, non-empty
recall, both shop-vac cells, product safety, exact evidence binding, public
shape, and every provider/operation ceiling. It improved frozen-leader recall
to 4/10 (40%) but still failed the 80% leader gate and the 25-second p95 /
30-second maximum latency gates. Do not describe ReviewRadar as reliably
returning the best product in budget.

Taylor authorized all in-scope local work and commits for this goal, including
departing from the earlier synchronous/no-background planning boundary. No
further phase-approval pause is required. The separate goal prohibition on
retained or precomputed recommendations remains binding.

## Current request-time architecture

`lib/productSelection.ts` first runs up to three current, brand-neutral Shopping
queries. It applies early type, accessory, condition, voltage, identity, and
non-product-source filters, deduplicates the results, and passes at most fifteen
bounded candidate summaries to one fresh scout. A summary contains only
candidate name, brand, model tokens, retailer, current observed price,
rating/count, offer count, and Shopping position. It contains no URL or snippet,
is explicitly untrusted, and cannot establish identity, eligibility, evidence,
price authority, availability, or any public field.

`lib/marketScout.ts` makes one GPT-5.4 Mini Responses call with strict Structured
Outputs, `store: false`, no SDK retries, a 60-second deadline, three requested
and maximum hosted searches, low reasoning, and a 6,000-token output ceiling.
It returns at most five ordered exact-model targets. A source URL binds only when
it appears in that response's completed web-search source set. `strong` requires
two independent recognized domains including a comparative source; `supported`
requires one comparative source or two recognized editorial domains. Invalid or
unavailable scouting falls back to neutral discovery with no quality boost.

After scouting, the selector may run up to three exact Shopping target searches,
three organic exact-target page searches, and candidate-local resolution while
preserving the hard fifteen-logical-Serper-operation ceiling. An evidence-bound
exact model may now retain up to two distinct merchant/page alternatives through
verification so one blocked, unavailable, or price-less seller does not erase an
already discovered alternative. Final output still deduplicates to one card per
product/page identity and preserves brand diversity.

Editorial, comparison, review, support, and manual URLs are valid only as scout
evidence. They are rejected when the Shopping vertical emits them as commerce
candidates and when exact-target page search returns them as purchasable pages.
Unknown merchant pages remain admissible only when an exact current Shopping
candidate binds that merchant. The model-variant parser also treats `N max PSI`
as performance evidence rather than a `Max` sibling-model qualifier.

Final ordering occurs only after product type, accessory, condition, exact
identity, hard requirements, availability, trusted USD price, budget, direct
page, image, and SSRF gates pass: `strong`, `supported`, unscored; supported
preferences; scout order; Bayesian commerce rating with a 4.0/50 prior;
review/offer volume; page and merchant quality; stable discovery order. Price is
an eligibility ceiling and never a quality bonus.

The only Shopping/product-page coalescing maps are created inside
`selectProducts` and die with that request. Responses use `Cache-Control:
no-store`. There is no production index, prewarm, polling, background refresh,
persistent market-plan cache, cross-request Shopping/page cache, or alternate
recommender.

## Latest live result

The frozen benchmark remains five broad and five constrained searches, one
cache-cold attempt per cell and no retries or replacements. The authoritative
report is `docs/pr14-live-accuracy-report-v19-final-validated.json`.

| Metric | Committed V14 | Current V19 |
| --- | ---: | ---: |
| HTTP success | 10/10 | 10/10 |
| Non-empty | 10/10 | 10/10 |
| Frozen leader top three | 2/9 eligible (22.22%) | 4/10 (40%) |
| Runtime evidence | 5/10 | 6/10 |
| Runtime `strong` | 3/10 | 5/10 |
| Scout fallback | 0/10 | 0/10 |
| Mean / p95 / max latency | 31,456 / 40,163 / 40,163 ms | 28,715 / 36,550 / 36,550 ms |
| Logical/physical Serper operations | 137 / 137 | 135 / 133 |
| Model tokens | 200,336 | 202,957 |
| Mean / max public payload | 803 / 1,304 bytes | 998 / 1,589 bytes |

V19 used ten OpenAI Responses, thirty hosted searches, 135 logical and 133
physical Serper operations, 190,495 input and 12,462 output model tokens, and
approximately $0.198950 model-token cost at the benchmark's published rates.
Every product-safety, exact-binding, fresh-research, public-shape, one-response,
hosted-search, operation-ceiling, and strong-ahead-of-unscored gate passed.

The preserved V15-V19 sequence must not be treated as retries from which to
select a preferred answer. V15 diagnosed the unchanged V14 path. V16 measured
seller-alternative retention at 4/10 leaders but 9/10 non-empty. V17 measured
early commerce-source rejection at 2/10 leaders and 10/10 non-empty. V18 exposed
a false exact-binding failure caused by `2100 max PSI`; it remains preserved.
After the generalized parser correction, V19 passed exact binding and reached
4/10 leaders with all ten cells non-empty.

This is a measured improvement over V14, not dependable best-in-budget proof.
Leader recall remains 40 percentage points below the 80% gate. Tail latency is
11,550 ms above p95 and 6,550 ms above the maximum limit.

## Verification

- Unit tests: 353/353 across 44 suites.
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

The seller-alternative and source-safety changes attack proven page-resolution
losses and should remain. V19 also proves that the current commerce-informed
orchestration still misses the frozen leader in six cells and serializes neutral
Shopping before the scout, contrary to the approved concurrent-start design.
The scout prompt additionally asks every target for two or three sources even
though the validated `supported` tier intentionally accepts one comparative
source. That prompt/validator mismatch can suppress legitimate supported
leaders.

The next bounded comparison is to start the one independent scout concurrently
with the three neutral Shopping calls, remove the untrusted roster from the scout
prompt, and make its requested evidence thresholds match the validator exactly.
This restores independent market-leader discovery, follows the approved plan,
and removes one serial provider stage without changing the public contract,
provider ceilings, safety gates, or request-time-only boundary. Preserve the
first frozen post-change result even if it regresses; do not tune to benchmark
products.

If that comparison does not materially improve the failed leader and latency
gates, the remaining evidence-supported architecture is a request-scoped
provider or retailer integration that returns canonical product identity,
current offers, seller pages, and stable product identifiers. No such alternate
provider is currently qualified in ReviewRadar.

Recommended reasoning level: **high** for the concurrent independent-scout
comparison and any provider/contract selection; medium for deterministic
integration after an architecture is selected.

## Hard boundaries and process incidents

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js reported loading it during ordinary build startup; its contents were
never manually opened or used as evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`. Suppress untracked enumeration and use
explicit path-scoped searches.

Four process incidents occurred during this goal:

1. A broad `rg --files docs tests` command unintentionally enumerated protected
   fixture path names without opening contents.
2. A later broad `rg` content search matched and printed a few protected-fixture
   brand lines. They were not used as evidence.
3. `git status --short --branch` unintentionally enumerated untracked protected-
   fixture path names. It did not modify fixture contents. Subsequent status
   checks use `--untracked-files=no`.
4. During the V18 binding investigation, a broad `rg` over `tests` again matched
   and printed several protected-fixture lines before the search was narrowed.
   Those lines were not used as evidence and no fixture was copied, edited, or
   deleted.

Do not repeat those command patterns. Do not weaken product type/accessory/
condition, hard requirements, exact identity, merchant binding, availability,
USD budget, price authority, page eligibility, duplicate URL, image, or SSRF
gates. Market and commerce signals never create eligibility or reach the public
payload. Do not retry until a preferred card appears. No push or deployment is
authorized or performed.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current runtime snapshot | `0b4c817` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Prior authoritative baseline | `docs/pr14-live-accuracy-report-v14-commerce-informed.json` |
| Current authoritative report | `docs/pr14-live-accuracy-report-v19-final-validated.json` |
| Diagnostic reports | V15 through V18 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

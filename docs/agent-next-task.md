# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through local runtime commit
`b4e1890` (`Run market scout concurrently with discovery`). Every recommendation
request independently starts one fresh market scout alongside three neutral
Shopping searches, then validates and ranks current purchasable products. No
market plan, Shopping result, product-page result, recommendation, or research
artifact survives the request that created it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

The implementation is deterministic-green and is the strongest measured local
architecture, but it is **not release-qualified**. The first and only cache-cold
V20 matrix for this architecture passed request success, non-empty recall,
both shop-vac cells, product safety, exact evidence binding, public shape, the
30-second maximum, and every provider/operation ceiling. It returned a frozen
leader in 5/10 top threes (50%), below the 80% gate, and its 29,646 ms p95
exceeded the 25-second gate. Do not describe ReviewRadar as reliably returning
the best product in budget.

Taylor authorized all in-scope local work and commits for this goal, including
departing from the earlier synchronous/no-background planning boundary. No
further phase-approval pause is required. The separate prohibition on retained
or precomputed recommendations remains binding.

## Current request-time architecture

`app/api/recommendations/route.ts` starts exactly one GPT-5.4 Mini Responses
scout before calling `selectProducts`. `lib/productSelection.ts` starts three
brand-neutral Shopping queries and awaits those queries together with the
already-running scout. This restores the approved concurrent start and removes
Shopping candidates from the scout prompt; Shopping order, ratings, prices, and
retailers cannot bias or establish independent market leadership.

`lib/marketScout.ts` uses strict Structured Outputs, `store: false`, no SDK
retries, a 60-second deadline, three requested and maximum hosted searches,
low reasoning, and a 6,000-token output ceiling. It returns at most five ordered
exact-model targets. A source URL binds only when present in that response's
completed web-search source set. `strong` requires two independent recognized
domains including a comparative source; `supported` requires one comparative
source or two recognized editorial domains. The prompt now requests those exact
thresholds. Invalid, unavailable, or insufficient scouting falls back to
neutral discovery with no quality boost.

After neutral discovery, the selector may run up to three exact Shopping target
searches, three organic exact-target page searches, and candidate-local
resolution while preserving the fifteen-logical-Serper-operation ceiling. An
evidence-bound exact model may retain up to two distinct merchant/page
alternatives through verification so a blocked, unavailable, or price-less
seller does not erase another already-discovered seller. Final output still
deduplicates to one card per product/page identity and preserves brand diversity.

Editorial, comparison, review, support, and manual URLs are valid only as scout
evidence. They are rejected as commerce candidates. Unknown merchant pages are
admissible only when an exact current Shopping candidate binds that merchant.
`N max PSI` is treated as performance evidence rather than a `Max` sibling-model
qualifier. Product type, accessory, condition, exact identity, hard requirement,
availability, trusted USD price, budget, direct page, image, duplicate, and SSRF
gates remain authoritative.

Final ordering is: `strong`, `supported`, unscored; supported preferences;
scout consensus order; Bayesian commerce rating with a 4.0/50 prior; review and
offer volume; page and merchant quality; stable discovery order. Price is an
eligibility ceiling and never a quality bonus. Commerce signals never establish
leader evidence, product eligibility, or public content.

Shopping and product-page coalescing maps exist only inside one request. The
response uses `Cache-Control: no-store`. There is no production index, prewarm,
polling, background refresh, persistent market-plan cache, cross-request
Shopping/page cache, or alternate recommender.

## Latest live result

The frozen benchmark remains five broad and five constrained searches, one
cache-cold attempt per cell and no retries or replacements. The authoritative
report is
`docs/pr14-live-accuracy-report-v20-independent-concurrent.json`.

| Metric | V19 commerce-informed | Current V20 |
| --- | ---: | ---: |
| HTTP success | 10/10 | 10/10 |
| Non-empty | 10/10 | 10/10 |
| Frozen leader top three | 4/10 (40%) | 5/10 (50%) |
| Runtime evidence | 6/10 | 6/10 |
| Runtime `strong` | 5/10 | 2/10 |
| Scout fallback | 0/10 | 1/10 |
| Mean / p95 / max latency | 28,715 / 36,550 / 36,550 ms | 23,629 / 29,646 / 29,646 ms |
| Logical/physical Serper operations | 135 / 133 | 137 / 137 |
| Model tokens | 202,957 | 190,585 |
| Mean / max public payload | 998 / 1,589 bytes | 797 / 1,542 bytes |

V20 used ten OpenAI Responses, thirty hosted searches, 137 logical/physical
Serper operations, 178,040 input and 12,545 output model tokens, and
approximately $0.189982 model-token cost at the benchmark's published rates.
Every safety, exact-binding, fresh-research, public-shape, one-response,
hosted-search, operation-ceiling, strong-ahead-of-unscored, and maximum-latency
gate passed. The scout received zero commerce candidates by design.

V20 improved absolute leader hits by one, mean latency by 5,086 ms, p95/maximum
by 6,904 ms, tokens by 12,372, estimated model cost by about $0.008968, and
mean payload by 201 bytes versus V19. It is the first retained PR-14 result to
pass the 30-second maximum. It still misses the 80% leader gate by 30 percentage
points and the p95 gate by 4,646 ms.

Saved-report analysis of the five misses found no safe deterministic ranker
defect. Exact leaders were absent from provider discovery, lacked a trustworthy
current price/availability page, could not prove a hard feature on the resolved
page, or the scout returned no qualified target. Do not transfer facts across
models or merchants, infer hard requirements from market evidence, relax price
or availability authority, or tune queries to the frozen product list.

## Verification

- Unit tests: 352/352 across 44 suites. The total decreased by one because the
  superseded commerce-roster orchestration test was deleted; independent-prompt
  and concurrent-start coverage replaced that behavior.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 across Chromium desktop/mobile. It emitted environment-level
  `NO_COLOR` / `FORCE_COLOR` notices, not application warnings.
- `git diff --check`: pass before the runtime commit.

These checks prove deterministic invariants, not the failed live market-quality
SLO.

## Assessment and next decision

The concurrent independent scout is the correct retained architecture. It
restores the approved design, removes one serialized provider stage, prevents
commerce observations from steering leader research, improves frozen-leader
recall, and materially reduces latency without weakening any gate.

The remaining bottleneck is canonical request-time commerce coverage: exact
market leaders must be connected to trustworthy current US offers and resolvable
product pages. Another prompt or same-provider benchmark loop is unsupported by
the V15-V20 evidence. The strongest next architecture comparison requires a
qualified request-scoped provider or retailer integration that returns canonical
product identity, current offers, seller pages, and stable product identifiers.
No such alternate provider is currently qualified in ReviewRadar. A progressive
response can change perceived latency but does not fix coverage and would change
the public contract.

Recommended reasoning level: **high** for provider/contract qualification;
medium for deterministic integration after a provider is selected.

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

Do not repeat those command patterns. Do not weaken safety, identity, hard-
requirement, availability, USD budget, price-authority, page, image, duplicate,
or SSRF gates. Do not retry until a preferred card appears. No push or deployment
is authorized or performed.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current runtime snapshot | `b4e1890` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Prior retained comparison | `docs/pr14-live-accuracy-report-v19-final-validated.json` |
| Current authoritative report | `docs/pr14-live-accuracy-report-v20-independent-concurrent.json` |
| Earlier diagnostic reports | V15 through V18 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

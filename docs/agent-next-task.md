# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through local runtime commit
`c829fa4` (`Add bounded canonical commerce resolution`) on branch `main`.
Documentation commit `c070882` records the initial qualification gate. Every
recommendation request independently starts one fresh market scout beside three
neutral Shopping searches. For at most three unresolved `strong` exact-model
targets, the selector may then perform bounded canonical product and seller-
offer resolution before applying the existing deterministic gates.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy current USD price when available, and direct
product-page URL. No push, deployment, release, production-data action,
dependency change, public-API change, or card expansion occurred.

The new canonical-commerce path is deterministic-test complete but **not live
release-qualified**. Three diverse application diagnostics returned HTTP 200
and non-empty fallback results, but the upstream market scout returned
`provider_error` before producing any strong target. A later sanitized direct
Responses diagnostic established the root cause: HTTP 429
`credit_balance_exhausted` / `insufficient_quota`. A separate adapter diagnostic
after ordinary Next environment loading found no usable `SERPAPI_API_KEY` and
made zero SerpApi calls. The frozen ten-case matrix was therefore not run.

V20 at runtime `b4e1890` remains the strongest authoritative live comparison,
not evidence for `c829fa4`. It reached frozen-leader top-three recall of 5/10
(50%) versus the 80% gate and cache-cold p95 of 29,646 ms versus the 25-second
gate. Do not describe ReviewRadar as reliably returning the universal best
product in budget.

Taylor authorized all in-scope local work and commits for this goal. No further
phase-approval pause is required. The prohibition on retained, precomputed, or
background recommendation research remains binding.

## Current request-time architecture

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

`lib/canonicalCommerce.ts` is an optional server-only SerpApi adapter. For only
the top three `strong` exact-model targets not already represented by a direct
product page, it performs at most one Google Shopping Light lookup, binds the
exact returned product identity, then performs at most one Google Immersive
Product seller-store lookup with `more_stores=true`. This is a separate maximum
of three product searches plus three offer lookups; the existing fifteen-
logical-Serper-operation ceiling is unchanged.

Canonical work starts concurrently with the existing exact-target Serper work
after neutral discovery and scouting. Provider requests are US-bound, no-cache,
timeout-bounded, cancellation-aware, and coalesced only inside the current
request. `SERPAPI_API_KEY` is optional and server-only. A missing key, provider
error, invalid response, absent exact match, or unusable offer returns no
canonical candidate and preserves the existing deterministic fallback.

A provider product token groups the current product and store responses; it
does not establish ReviewRadar identity by itself. Seller titles and pages must
still bind the exact stable model and reject named, numeric, generation, and
catalog siblings. Explicit out-of-stock, sold-out, or unavailable stores are
discarded immediately. Unknown availability remains provisional and must pass
the existing page verification. Price, availability, facts, and market evidence
never transfer across products, variants, or merchants.

After neutral discovery, the selector may also run up to three exact Shopping
target searches, three organic strong-target page searches, and candidate-local
page resolution. Product type, accessory, condition, exact identity, hard
requirement, availability, trusted USD price, budget, direct page, image,
duplicate, merchant, and SSRF gates remain authoritative.

Final ordering is: `strong`, `supported`, unscored; directly supported shopper
preferences; scout consensus order; Bayesian commerce rating with a 4.0/50
prior; review and offer volume; page and merchant quality; stable discovery
order. Price is an eligibility ceiling and never a quality bonus. Commerce
signals never create leader evidence, eligibility, or public content.

Shopping, canonical-commerce, and product-page coalescing maps exist only
inside one request. The response is `Cache-Control: no-store`. There is no
production index, prewarm, polling, background refresh, persistent plan/result
cache, cross-request provider/page cache, or alternate recommender.

## Provider-contract decision

SerpApi was selected for the bounded integration because its synchronous Google
Shopping Light result exposes stable product identifiers and commerce fields,
and its Google Immersive Product stores response exposes direct seller links,
prices, availability text, and multiple offers. The integration uses only those
request-time commerce surfaces; their ratings, order, and offers never prove
market leadership.

DataForSEO exposes useful product/seller data but its documented task-POST then
task-GET workflow adds polling and request coordination that is a poorer match
for the current one-response route. Amazon Business exposes catalog and offer
operations but requires Business Product Catalog onboarding and account-scoped
access. Neither alternative is integrated.

Current official OpenAI documentation still lists Responses, Structured
Outputs, and web search as supported for GPT-5.4 Mini and lists
`web_search_call.action.sources` as a valid Responses include field. Combined
with the explicit 429 diagnostic, there is no current evidence that the scout
request shape or selected model caused the application failures.

## Authoritative and diagnostic live results

The V20 report remains the authoritative measured baseline:

- 10/10 HTTP 200 and 10/10 non-empty, including both shop-vac cases;
- frozen leader top-three recall 5/10 (50%) versus the 80% gate;
- runtime evidence in 6/10, runtime `strong` in 2/10, and one honest scout
  fallback;
- mean 23,629 ms and nearest-rank p95/maximum 29,646 ms;
- 137 logical/physical Serper operations, ten Responses calls, and thirty
  hosted searches; and
- unchanged five-field payload averaging 797 bytes and peaking at 1,542 bytes.

The retained report is
`docs/pr14-live-accuracy-report-v20-independent-concurrent.json`. V21 and V22
remain rejected audit reports; their experimental code was removed.

After `c829fa4`, three cache-cold debug diagnostics—not benchmark cells—were
run without retries:

| Request | HTTP / non-empty | Latency | Scout | Canonical product / offer calls | Serper logical / physical |
| --- | --- | ---: | --- | ---: | ---: |
| robot vacuum | 200 / yes | 19,097 ms | `provider_error` | 0 / 0 | 12 / 12 |
| gaming monitor | 200 / yes | 11,644 ms | `provider_error` | 0 / 0 | 12 / 12 |
| coffee maker | 200 / yes | 11,843 ms | `provider_error` | 0 / 0 | 12 / 12 |

A fourth, isolated Responses request used the same model, sources include,
Structured Output, reasoning, and web-search features with sanitized reporting.
It reached OpenAI and returned `RateLimitError`, HTTP 429, code
`credit_balance_exhausted`, type `insufficient_quota`. No raw response, prompt
output, source content, headers, or credential was printed or retained.

A separate non-benchmark exact-model adapter diagnostic loaded the ordinary
Next environment, then called the production adapter. It returned
`missing_api_key_or_query` with zero product attempts, zero offer attempts, and
no provider result. The query was valid, so this means the adapter sees no
usable SerpApi key. `.env.local` was not opened or inspected.

These diagnostics prove fallback and blocker attribution only. They do not
prove canonical binding, provider call ceilings under live work, leader recall,
quality, latency, tokens, cost, or payload for the new runtime. A separate
production smoke request also returned HTTP 200 and products, but debug
telemetry was disabled and it is not matrix evidence.

## Verification

- Unit tests: 358/358 across 45 suites.
- TypeScript typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 across Chromium desktop/mobile; only environment-level
  `NO_COLOR` / `FORCE_COLOR` notices were emitted.
- `git diff --check`: pass.

Coverage includes canonical source/token/direct-offer binding, exact-model and
sibling isolation, unsafe and unavailable offer rejection, request-only
coalescing, missing-key/provider fallback, cancellation, cache-key secrecy, the
three-product/three-offer ceiling, internal provider provenance, sparse-rating
shrinkage, and the unchanged public API contract. These checks prove
deterministic invariants, not the unexecuted live market-quality SLO.

## Next action and release gate

Two external prerequisites are required: replenish the OpenAI API project's
credit balance and configure a usable server-side `SERPAPI_API_KEY` for the
ordinary Next process. Neither action can be completed from repository code.
Do not expose either credential in chat, logs, commits, client code, or debug
payloads, and do not inspect `.env.local` to verify them.

After configuration, run one bounded debug request that actually produces at
least one `strong` target and non-zero canonical product/offer telemetry.
Inspect exact-model binding, direct seller URLs, availability filtering, and the
three-plus-three provider ceiling from that request.

Only after that smoke proof should the precommitted ten-case cache-cold matrix
run, exactly once per cell with no retries or replacements. It must report
leader recall, constraint precision, latency, OpenAI/hosted-search/Serper/
canonical-provider calls, tokens, cost, payload size, and baseline-versus-new
quality. Release still requires zero safety/binding/requirement/availability/
budget failures, at least 80% eligible leader top-three recall, any passing
`strong` leader ahead of unscored alternatives, required non-empty recall,
cache-cold p95 at most 25 seconds, maximum 30 seconds, one Responses call, at
most three hosted searches, at most fifteen logical Serper operations, at most
three canonical product searches and three offer lookups, and unchanged public
payload.

If the live SerpApi contract cannot satisfy exact identity, direct seller URL,
availability, or bounded-call requirements, remove or replace the adapter; do
not weaken existing gates or add retained/background research. Recommended
reasoning level: medium for the deterministic provider smoke and matrix;
high only if a restored provider exposes a new contract failure.

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

The canonical-commerce and provider-diagnostic steps added no incident. Do not
repeat those command patterns. No push, deployment, release, production-data
action, destructive operation, background work, retained research cache, or
benchmark retry occurred.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Current runtime snapshot | `c829fa4` |
| Initial qualification record | `c070882` |
| Prior authoritative live snapshot | `b4e1890` |
| Current decision | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable trust contracts | latest PR-14 entry in `docs/review-radar-test-memory.md` |
| Frozen benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Authoritative prior report | `docs/pr14-live-accuracy-report-v20-independent-concurrent.json` |
| Rejected reports | V21 and V22 under `docs/` |
| Runtime architecture | `ReviewRadar-Overview.md` |

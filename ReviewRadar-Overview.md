# ReviewRadar technical overview

Updated: 2026-09-01

## Product purpose

ReviewRadar is a focused product-selection tool. A shopper supplies a product
category plus optional budget and must-have or avoid requirements. The
application returns up to five distinct products that satisfy the requirements
it can verify.

Each result card contains only:

- a product image when identity-safe;
- the product name;
- a simple category;
- a current price when the price is trustworthy, otherwise a short product-page
  fallback;
- a direct View product link.

ReviewRadar does not generate a research report, explanations, pros and cons,
review summaries, citations, evidence narratives, buying advice, or confidence
scores. Those former output contracts and their generation pipelines were
deleted in PR-10.

## Runtime architecture

The production recommendation path performs fresh work inside one POST route:

    Search form
      -> POST /api/recommendations
      -> validate and normalize the request
      -> extract deterministic requirements
      -> run up to three current neutral Shopping queries
      -> pass a bounded untrusted commerce roster to one fresh market scout
      -> up to three exact-model Shopping queries for undiscovered strong targets
      -> up to three organic exact-target product-page searches
      -> deterministic type, accessory, used-item, budget, and requirement filters
      -> candidate-local product-page resolution when needed
      -> adaptive three-candidate finalist verification waves
      -> distinct product selection
      -> minimal JSON result

There is no retained evidence index, prewarm, background refresh, cross-request
research or recommendation cache, alternate recommendation route, polling job,
progress store, experimental pipeline mode, rescue stage, review-enrichment
stage, narration stage, or final research stage.

The only application routes are:

- / — the product-search UI;
- /api/recommendations — the selection POST handler.

## Request and response contracts

RecommendationApiRequest accepts:

- query — required product category;
- budget — optional shopper budget;
- priorities — optional important details and must-have constraints;
- avoid — optional exclusions;
- selectedFeatures — optional deterministic feature selections;
- extractedRequirements — server-normalized structured requirements.

The public success response contains only result.recommendations. Each product
has category, imageUrl, name, price, and productPageUrl. Price and imageUrl may
be null. A recommendation without a safe product-detail URL is not returned.

The browser client performs one POST and validates this exact minimal shape.
It has no polling, job-token, progress, mode, or legacy-result compatibility
branch.

## Provider use and bounds

### Request-time market scout

After current neutral Shopping discovery, lib/marketScout.ts makes one fresh
GPT-5.4 Mini Responses call per request with
Structured Outputs, three requested and three maximum hosted web-search calls,
low reasoning, and a 6,000-token output ceiling. It sets `store: false`,
disables SDK retries, and uses a 60-second deadline. It returns at most five
ordered exact-model targets with source URLs and cannot provide prices,
Shopping queries, explanations, review summaries, scores, or card content.
Every target must contain a distinctive exact model number or catalog code;
generic family, platform, and specification-only targets fail validation.
Only URLs present in completed web-search source metadata from that same
response can enter a target.

Deterministic code classifies the bound URLs conservatively. `strong` requires
two independent recognized editorial/test domains including a comparative
test source; `supported` requires one comparative source or two independent
recognized editorial domains. Manufacturer, retailer, marketplace, community,
unknown, incomplete-call, and unbound URLs cannot support a target. No plan or
provider response is retained after the request. Missing credentials, provider
failure, timeout, malformed output, an exceeded tool ceiling, or insufficient
evidence uses the same deterministic neutral Shopping discovery with no
market-quality target.

The scout receives at most fifteen current candidate summaries containing
bounded names, brands, model tokens, retailers, observed prices, commerce
ratings/counts, offer counts, and Shopping positions. The roster contains no
URLs or snippets, is explicitly untrusted, and is not evidence. It helps the
scout research products that the current request can actually see while still
allowing a stronger independently supported omitted model. No roster field can
establish product identity, eligibility, quality tier, price authority,
availability, or a public card field.

### Product search

lib/productSearch.ts is the sole Serper transport. The selector first runs up to
three current neutral Shopping queries, applies early product-safety filters,
deduplicates the candidates, and builds the bounded roster described above. It
then may search the three highest `strong` exact-model targets that did not
already survive discovery. It may run up to three organic exact-target page
searches and use the remaining request budget for candidate-local product-page
lookups. It verifies a ranked queue of at most nine candidates in waves of
three, without repeating discovery. The total logical ceiling remains fifteen.
There are no retries, editorial queries, review queries, rescue queries, image
queries, or alternative search providers. Broad requests preserve three unique
queries by adding brand-neutral `top rated` and `popular models` variants when
empty budget and priority fields would otherwise collapse discovery.

Search calls are timeout-bounded. A map allocated inside the current
`selectProducts` call coalesces identical work for that request only and is
discarded when the request finishes. Local debug telemetry reports logical
calls and physical attempts without exposing credentials or raw provider
responses.

When an organic product-page search response also contains direct Shopping
offers, the selector consumes those offers before the organic candidates. This
does not add a search operation. A resolved page can inherit such an offer only
when the offer is direct, exact, current, and bound to that same page merchant;
price, availability, image, retailer, and commerce signals never move between
merchants.

### Smart Features

Smart Features are deterministic catalog suggestions from
lib/smartFeatureSuggestions.ts. They make no network or AI call. When a
category has no preset catalog, the UI directs the shopper to Important
Details.

## Selection correctness

Selection remains deterministic after candidate discovery:

1. Reject malformed and generic candidates.
2. Reject a positively different product type, including a standalone dock or
   base when the request is for a complete robot vacuum.
3. Reject standalone accessories and replacement parts.
4. Reject used, refurbished, renewed, recertified, preowned, and open-box
   products unless requested.
5. Remove secondary-market, non-US-market, and obvious extreme over-budget
   candidates before enrichment.
6. Interleave query results and deduplicate stable model plus named-variant
   identities across retailer URLs.
7. Attach market evidence only when brand and exact stable model identity
   match; generic aliases and named, numeric, generation, year, or catalog-code
   siblings do not inherit it. Performance measurements, years, and prices do
   not become model identity. Scout aliases must retain the target's exact
   identifiers and named variants; a bounded source-derived exact identity may
   be used only for a direct product page whose primary name/path has no same-
   kind sibling conflict.
8. Prioritize verification and final cards by `strong`, then `supported`, then
   unscored; within a tier use directly supported preferences, scout consensus,
   Bayesian-shrunken commerce rating, review/offer volume, resolvability,
   merchant trust, and stable discovery order. Price never adds rank.
9. Keep a verification slate that is not dominated by one brand.
10. Resolve only candidate-local product pages, preserving and targeting the
   Shopping storefront when an exact merchant page is available, and retain at
   most two exact page alternatives on distinct hosts from one search.
11. Recheck non-new condition after resolution, including title, evidence, and
   product-route disclosures; then require a safe product-detail URL and
   affirmative current availability.
12. Fail closed on explicit hard feature, size, numeric, boolean, brand, and
    avoid requirements.
13. Reject a known numeric contradiction to an ordinary soft preference while
    leaving missing soft evidence unknown.
14. Require a trustworthy in-budget price when the shopper specifies a budget.
15. Backfill rejected finalist slots from the ranked queue without bypassing
    any gate or repeating discovery.
16. Reapply quality ordering only to products that passed every gate, then
    return at most five distinct products, deduplicated by stable identity and
    canonical product-page URL, with basic brand diversity.

Soft preferences influence ordering but do not become invented facts.

## Product links, prices, and images

### Product pages

lib/productPageUrl.ts, lib/productEligibility.ts, and
lib/productEvidenceIdentity.ts enforce positive product identity. Category,
search, editorial, discussion, support, documentation, question, and
secondary-market pages cannot become card destinations. Manufacturer family,
lineup, range, and series landing pages are also ineligible. Model, descriptive
variant, and robust numeric conflicts fail closed. Stable model IDs include
nearby named variants; a tightly bounded official letter-only merchandising
suffix may match its base model, but a different numeric model cannot.

### Page fetching

lib/safeProductPageFetch.ts is the only product-page fetch boundary. It:

- accepts only HTTP and HTTPS with no URL credentials or non-default port;
- resolves the hostname before every request and redirect;
- rejects private, local, link-local, carrier-grade NAT, reserved,
  documentation, multicast, and mapped-private addresses;
- pins transport to the validated public address;
- bounds redirects, response bytes, content type, and timeout;
- forwards cancellation.

### Prices

Shopping or product-page offer metadata is the only price authority.
Model-generated price text is not accepted. Implausibly low and conflicting
offers are not shown as trusted prices. The public contract is USD-only, so
foreign or unknown-currency page offers are not relabeled. A budgeted search
excludes products without a usable price. A current matching page offer takes
precedence over discovery price evidence.

### Availability

A product must have affirmative current availability from matching structured
availability, current product metadata, product-scoped fulfillment text, a
buyable structured offer, or a current priced Shopping offer bound to an exact
product page on the same Shopping merchant. The Shopping fallback exists for
exact retailer pages that block or challenge server-side fetches; it does not
apply across merchants or when price, merchant, identity, or product-page
shape is missing. Explicit out-of-stock, sold-out, discontinued, preorder, or
multi-channel unavailable page state always rejects the product. An
availability-free price cannot create availability or override visible or
metadata-backed unavailability.

### Images

Images are optional. Existing and product-page image candidates pass URL,
placeholder, navigation-artwork, brand, model, family, and page-provenance
checks. ReviewRadar returns null rather than showing a questionable image.

## Cancellation, admission, and request-scoped coalescing

The route acquires the shared paid-request admission permit before provider
work and always releases it. Browser cancellation propagates through the
market scout, search, and page-fetch boundaries. Shopping and product-page maps
exist only inside one `selectProducts` invocation, where they coalesce duplicate
work in that request. They are discarded at return and cannot serve a later
search. The API response uses `Cache-Control: no-store`.

## Main implementation files

- app/api/recommendations/route.ts — single route orchestration.
- app/page.tsx — search state and one-request client flow.
- components/SearchForm.tsx — request form and deterministic feature picker.
- components/ResultsSummary.tsx — loading, empty, and shortlist states.
- components/ProductCard.tsx — minimal result card.
- lib/recommendationRequestValidation.ts — server request validation.
- lib/requirementExtraction.ts — deterministic structured requirements.
- lib/marketScout.ts — fresh bounded source-validated exact-model scout.
- lib/productSearch.ts — bounded Shopping and product-page search.
- lib/productSelection.ts — filtering, page resolution, requirement checks,
  ranking, deduplication, and final selection.
- lib/productAssets.ts — finalist metadata, availability, price, page, and
  image enrichment.
- lib/safeProductPageFetch.ts — DNS-pinned outbound fetch boundary.
- types/review-radar.ts — selection-only public and internal types.

## Performance evidence

The matched three-case live local benchmark is stored in:

- docs/benchmarks/selection-simplification-before.json;
- docs/benchmarks/selection-simplification-after.json;
- docs/benchmarks/selection-simplification-quality.json.

Across shop vac, self-emptying robot vacuum under $300, and 27-inch 1440p
gaming monitor under $500:

- average client-observed latency fell from 101,212 ms to 8,029 ms;
- average normal response size fell from 86,088 bytes to 821 bytes;
- OpenAI calls fell from three to one per search;
- after-searches used exactly eight physical Serper attempts each;
- all returned constrained products met the stated budget and observable
  must-have criteria in the recorded samples.

This is a 92.07% latency reduction and 99.05% normal-response reduction in the
recorded local sample. It is not a hosted-service latency guarantee.

## Validation

The request-time architecture and accuracy gates are protected by:

- unit and contract tests for request validation, scout fallback, source
  binding, evidence tiers, request isolation, cancellation, one-call behavior, bounded
  search, type/accessory filtering, requirement enforcement,
  deduplication, trusted prices, page identity, image identity, and SSRF safety;
- Playwright desktop/mobile coverage for validation, submission, cancellation,
  and the minimal result card;
- TypeScript, ESLint, and the Next production build.

The current source passes 350/350 unit tests across 44 suites, zero-warning
lint, typecheck, production build, and Playwright 7/7. A separate live browser
search passed at desktop and mobile widths with no overflow or console errors.
The latest PR-14 ten-case, single-attempt V14 matrix completed 10/10
requests with one OpenAI response each, three hosted searches each, and at most
fifteen logical Serper operations. Exact evidence binding and product safety
passed in all ten cells and all ten returned a product. Frozen-leader recall was
2/9 currently eligible (22.22%); one benchmark leader was current-ineligible.
Mean latency was 31,456 ms and nearest-rank p95/maximum was 40,163 ms. The public
five-field payload remained unchanged at 803 bytes mean and 1,304 bytes maximum.
Runtime evidence reached five cells, runtime `strong` reached three, and no
scout fell back.

PR-14 is not release-qualified: eligible leader recall was 22.22% versus the
80% gate, and tail latency exceeded both the 25-second p95 and 30-second maximum
gates. A
commerce-informed handoff improved non-empty results from 7/10 to 10/10,
evidence-bearing results from 2/10 to 5/10, and absolute frozen-leader hits from
one to two versus the committed V10 baseline. The source-binding and ranking
mechanics remain safe, but live Shopping/page resolution still does not
reliably supply exact purchasable leaders inside the target envelope. The
earlier direct-page, full GPT-5.4, and medium-reasoning Mini experiments did not
establish a better path; further prompt tuning is not the supported fix for the
remaining commerce-coverage loss.

The build route manifest must contain only /, /_not-found, and
/api/recommendations.

## Known limits

- Live prices and availability can change after a search.
- Search-provider coverage can omit a good product.
- Strict finalist verification can produce an empty shortlist even when a
  qualifying product exists; V14 returned all ten shortlists, but
  earlier preserved runs returned as few as seven in ten attempts.
- The market scout's source tier is not product-fact, price, availability, or
  eligibility authority. V14 passed exact source binding but commerce coverage
  still produced only 22.22% eligible frozen-leader recall with 40,163 ms p95,
  so the architecture did not establish live best-in-budget reliability.
- Missing or ambiguous product images are intentionally omitted.
- The recorded live quality sample is small and local. It does not prove
  hosted operations, accessibility beyond the current browser suite, or
  production readiness.

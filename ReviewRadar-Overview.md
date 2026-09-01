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

The production recommendation path is one synchronous POST route:

    Search form
      -> POST /api/recommendations
      -> validate and normalize the request
      -> extract deterministic requirements
      -> start optional one-call source-bound market scout
         and three neutral Shopping queries concurrently
      -> up to three exact-model Shopping queries for undiscovered strong targets
      -> deterministic type, accessory, used-item, budget, and requirement filters
      -> candidate-local product-page resolution when needed
      -> adaptive three-candidate finalist verification waves
      -> distinct product selection
      -> minimal JSON result

There is no alternate recommendation route, polling job, progress store,
experimental pipeline mode, rescue stage, review-enrichment stage, narration
stage, or final research stage.

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

### Optional market scout

lib/marketScout.ts may make one GPT-5.4 Mini Responses call with Structured
Outputs and at most three hosted web-search calls. It returns at most five
ordered exact-model targets with source URLs and cannot provide prices,
Shopping queries, explanations, review summaries, scores, or card content.
Only URLs present in completed web-search source metadata from that same
response can enter a target.

Deterministic code classifies the bound URLs conservatively. `strong` requires
two independent recognized editorial/test domains including a comparative
test source; `supported` requires one comparative source or two independent
recognized editorial domains. Manufacturer, retailer, marketplace, community,
unknown, incomplete-call, and unbound URLs cannot support a target. Validated
plans are cached for 24 hours by normalized request, fixed model, and prompt
version. Missing credentials, provider failure, timeout, malformed output, an
exceeded tool ceiling, or insufficient evidence uses the same deterministic
neutral Shopping discovery with no market-quality target.

### Product search

lib/productSearch.ts is the sole Serper transport. The selector starts three
neutral Shopping queries while the market scout is still running, then may
search the three highest `strong` exact-model targets that did not already
survive early discovery filters. It may use the remaining request budget for
candidate-local product-page lookups. It verifies a ranked queue of at most
nine candidates in waves of three, without repeating discovery. The total
logical ceiling is fifteen: at most six discovery searches plus nine
candidate-local resolution opportunities.
There are no retries, editorial queries, review queries, rescue queries, image
queries, or alternative search providers.

Search calls are timeout-bounded and use a bounded in-process cache. Local
debug telemetry reports logical calls and physical attempts without exposing
credentials or raw provider responses.

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
   match; named, numeric, generation, and year siblings do not inherit it.
8. Prioritize verification and final cards by `strong`, then `supported`, then
   unscored; within a tier use directly supported preferences, scout consensus,
   Bayesian-shrunken commerce rating, review/offer volume, resolvability,
   merchant trust, and stable discovery order. Price never adds rank.
9. Keep a verification slate that is not dominated by one brand.
10. Resolve only candidate-local product pages, preserving the Shopping
   storefront when an exact merchant page is available, and retain at most two
   exact page alternatives on distinct hosts from one resolution search.
11. Require a safe product-detail URL and affirmative current availability.
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

## Cancellation, admission, and caching

The route acquires the shared paid-request admission permit before provider
work and always releases it. Browser cancellation propagates through the
market scout, search, and page-fetch boundaries. Bounded caches coalesce identical
concurrent work without allowing one cancelled waiter to cancel other active
waiters. Shopping discovery entries expire after five minutes; fetched product
page evidence used for current price and availability expires after two.

## Main implementation files

- app/api/recommendations/route.ts — single route orchestration.
- app/page.tsx — search state and one-request client flow.
- components/SearchForm.tsx — request form and deterministic feature picker.
- components/ResultsSummary.tsx — loading, empty, and shortlist states.
- components/ProductCard.tsx — minimal result card.
- lib/recommendationRequestValidation.ts — server request validation.
- lib/requirementExtraction.ts — deterministic structured requirements.
- lib/marketScout.ts — optional bounded source-validated exact-model scout.
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

The PR-10 architecture and PR-11 accuracy gates are protected by:

- unit and contract tests for request validation, scout fallback, source
  binding, evidence tiers, caching, cancellation, one-call behavior, bounded
  search, type/accessory filtering, requirement enforcement,
  deduplication, trusted prices, page identity, image identity, and SSRF safety;
- Playwright desktop/mobile coverage for validation, submission, cancellation,
  and the minimal result card;
- TypeScript, ESLint, and the Next production build.

The PR-13 Step 3 source passes 317/317 unit tests across 43 suites,
zero-warning lint, typecheck, production build, and Playwright 7/7. Its frozen
three-round cache-cold matrix returned non-empty shortlists in 23/24 requests,
including shop vacuum 2/3, with p95 18,806 ms and a 20,419 ms maximum. Every
request used one OpenAI response and no more than twelve logical operations.
The Step 3 checkpoint validates exact-model attachment, concurrent discovery,
tier-aware final ranking, commerce-signal shrinkage, and the fifteen-operation
ceiling, but has not yet run the new live matrix. The earlier 23/24 selection-
recall result is therefore not proof that the new path meets leader recall or
latency gates.

The build route manifest must contain only /, /_not-found, and
/api/recommendations.

## Known limits

- Live prices and availability can change after a search.
- Search-provider coverage can omit a good product.
- Strict finalist verification can produce an empty shortlist even when a
  qualifying product exists; the latest local frozen matrix observed one empty
  run in 24, but provider variability prevents treating that rate as universal.
- The market scout can improve exact-model recall, but its source tier is not a
  product-fact, price, availability, or eligibility authority. The cache-cold
  Step 4 matrix still needs to prove live leader recall and latency.
- Missing or ambiguous product images are intentionally omitted.
- The recorded live quality sample is small and local. It does not prove
  hosted operations, accessibility beyond the current browser suite, or
  production readiness.

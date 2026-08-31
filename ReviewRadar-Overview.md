# ReviewRadar technical overview

Updated: 2026-08-31

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
      -> optional one-call selection planner
      -> at most three Shopping queries
      -> deterministic type, accessory, used-item, budget, and requirement filters
      -> candidate-local product-page resolution when needed
      -> bounded finalist page and asset verification
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

### Optional selection planner

lib/selectionPlanner.ts may make one OpenAI Responses call. It asks only for
mainstream model targets and concise Shopping queries under a strict JSON
schema. It cannot provide product facts, prices, rankings, explanations, or
evidence.

The planner is optional. A missing client, provider error, timeout, or invalid
output falls back to deterministic queries. The route therefore uses either
zero or one OpenAI call.

### Product search

lib/productSearch.ts is the sole Serper transport. The selector executes at
most three Shopping queries and may use the remaining request budget for
candidate-local product-page lookups. The total logical ceiling is eight.
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
2. Reject a positively different product type.
3. Reject standalone accessories and replacement parts.
4. Reject used or refurbished products unless requested.
5. Remove obvious extreme over-budget candidates before enrichment.
6. Deduplicate product identities across retailer URLs.
7. Prefer mainstream planner targets and direct requirement matches.
8. Resolve only candidate-local product pages.
9. Require a safe product-detail URL.
10. Fail closed on explicit hard feature, size, numeric, boolean, brand, and
    avoid requirements.
11. Require a trustworthy in-budget price when the shopper specifies a budget.
12. Return at most five distinct products, with basic brand diversity.

Soft preferences influence ordering but do not become invented facts.

## Product links, prices, and images

### Product pages

lib/productPageUrl.ts, lib/productEligibility.ts, and
lib/productEvidenceIdentity.ts enforce positive product identity. Category,
search, editorial, discussion, support, documentation, question, and
secondary-market pages cannot become card destinations. Model, descriptive
variant, and robust numeric conflicts fail closed.

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
excludes products without a usable price.

### Images

Images are optional. Existing and product-page image candidates pass URL,
placeholder, navigation-artwork, brand, model, family, and page-provenance
checks. ReviewRadar returns null rather than showing a questionable image.

## Cancellation, admission, and caching

The route acquires the shared paid-request admission permit before provider
work and always releases it. Browser cancellation propagates through the
planner, search, and page-fetch boundaries. Bounded caches coalesce identical
concurrent work without allowing one cancelled waiter to cancel other active
waiters.

## Main implementation files

- app/api/recommendations/route.ts — single route orchestration.
- app/page.tsx — search state and one-request client flow.
- components/SearchForm.tsx — request form and deterministic feature picker.
- components/ResultsSummary.tsx — loading, empty, and shortlist states.
- components/ProductCard.tsx — minimal result card.
- lib/recommendationRequestValidation.ts — server request validation.
- lib/requirementExtraction.ts — deterministic structured requirements.
- lib/selectionPlanner.ts — optional bounded model/query planner.
- lib/productSearch.ts — bounded Shopping and product-page search.
- lib/productSelection.ts — filtering, page resolution, requirement checks,
  ranking, deduplication, and final selection.
- lib/productAssets.ts — finalist metadata, price, page, and image enrichment.
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

The PR-10 architecture is protected by:

- unit and contract tests for request validation, planner fallback, one-call
  behavior, bounded search, type/accessory filtering, requirement enforcement,
  deduplication, trusted prices, page identity, image identity, and SSRF safety;
- Playwright desktop/mobile coverage for validation, submission, cancellation,
  and the minimal result card;
- TypeScript, ESLint, and the Next production build.

The build route manifest must contain only /, /_not-found, and
/api/recommendations.

## Known limits

- Live prices and availability can change after a search.
- Search-provider coverage can omit a good product.
- The optional planner can improve mainstream model recall but is not a product
  fact authority.
- Missing or ambiguous product images are intentionally omitted.
- The recorded live quality sample is small and local. It does not prove
  hosted operations, accessibility beyond the current browser suite, or
  production readiness.

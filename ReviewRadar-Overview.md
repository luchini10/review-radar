# Review Radar — Technical Breakdown

> Audience: a coding agent (Claude Code, Codex, etc.) about to **test, debug, or improve** Review Radar.
> Everything below is derived from the repo at `C:\Users\tluch\Documents\GitHub\review-radar-fixed`.
> Where the code did not let me confirm something, it is marked **Needs verification**.
> Stack: Next.js (App Router) + TypeScript + React, OpenAI Responses API, Serper.dev search, Zod, Node `--test`.

---

## 1. Purpose

**Problem it solves.** Researching a product purchase means wading through reviews, forums,
spec sheets, and retailer listings. Review Radar does that research for the user and returns a
short, ranked, **evidence-cited** set of recommendations instead of another wall of links.

**What the user is trying to accomplish.** Enter a product category plus optional budget,
"important details," and feature filters, and get back products that actually satisfy those
requirements, ranked by fit and credibility, each explained and cited.

**What a successful result looks like.** A `RecommendationResult` (see §7) containing:
- up to **7 ranked exact matches** (`exactMatches`, labeled `#1 Best Match` … `#7 Best Match`) that pass every verified hard requirement;
- up to **5 near/close matches** (`nearMatches`) shown only when fewer than 7 exact matches exist;
- a `search_summary`, `what_to_avoid` list, and `final_buying_advice`;
- per-product: price range, pros/cons, why-recommended prose, requirement check, citations, and an evidence/credibility signal.

> **Note on tier names.** The request to document "Best Overall / Best Budget / Best Value / Best
> Premium / Best Alternative" does **not** match the implementation. The code has exactly two
> `recommendation_type` values — **`"Best Match"`** and **`"Close Match"`** — and ranks Best Matches
> `#1…#7`. There are no Budget/Value/Premium/Alternative slots. (`types/review-radar.ts:29`,
> `lib/recommendationScoring.ts:818-848`.) Treat named-tier requests as a future feature, not current behavior.

---

## 2. Full user flow

**Home/search page:** `app/page.tsx` → renders `components/SearchForm.tsx`.

Form fields (`SearchForm.tsx`):
- **Product category** — *required*. Free text. Becomes the API `query`. (e.g. "cordless vacuum", "65-inch TV").
- **Budget** — *optional*. Free text, live-formatted by `lib/budgetInputFormatting.ts` (`formatBudgetInput`). e.g. `under $500`, `$500 to $700`.
- **Important Details** — *optional* textarea. Free-form requirements ("must be under 64 inches wide… no velvet"). Hard requirements here are treated as **firm filters**; "things you don't want" become avoid/deal-breakers.
- **Smart Features** — *optional* chips from `components/SmartFeatures.tsx`, fetched from `POST /api/features` (category-specific clickable attribute filters). Up to **12** selections.
- There is **no dedicated "avoid" text box** in the UI. The API supports an `avoid` field, but the form does not populate it — avoid/deal-breaker constraints are parsed out of **Important Details** by `extractStructuredRequirements`. **Needs verification** that this is intended.

As the user types, `SearchForm` calls `extractStructuredRequirements(...)` locally to show a
live "What ReviewRadar will match" preview (`requirements.summary`).

**On submit** (`app/page.tsx` `handleSubmit`):
1. `cleanSearchFormInput` + `getSearchValidationError` validate the category.
2. `buildRecommendationApiPayload(form, { includeExtractedRequirements: true })` (`lib/searchRequestPayload.ts`) maps `category→query`, plus `budget`, `priorities`, optional `avoid`, `selectedFeatures`, and attaches `extractedRequirements`.
3. `fetch("/api/recommendations", { method: "POST", … })` with a client-side **180s** `AbortController` timeout; the user can **Cancel**.
4. Response is `{ result }` or `{ error }`. State drives loading skeletons / results / error alert.

**Results display:** `components/ResultsSummary.tsx`:
- A **Search coverage** summary (queries run, candidates evaluated, exact/near counts).
- A **Dealbreaker strength** slider — `strict` / `balanced` / `flexible` (`lib/dealbreakerVisibility.ts`). **Display-only**: it filters what's visible, it does **not** re-run the search.
- Ranked **exact matches** as `ProductCard`s; **near matches** grouped by `classifyNearMatch` (`lib/nearMatchClassification.ts`); a **What to avoid** panel; a **Final buying advice** `VerdictCard`.

---

## 3. Search & recommendation pipeline

Orchestrated in `app/api/recommendations/route.ts` → `handleRecommendationPost`. Stages
(each sets `debugStage` for error reporting):

1. **Validate request** (`validateRequest`): `query` required; `budget`/`priorities`/`avoid` must be strings; `selectedFeatures` ≤ 12.
2. **Extract requirements** (`extractStructuredRequirements`, `lib/requirementExtraction.ts`) → `StructuredRequirements`.
3. **Conflict check** (`detectRequirementConflicts`, `lib/requirementConflicts.ts`) → HTTP 400 if contradictory (e.g. mutually exclusive constraints).
4. **Discovery strategy** (`buildOpenAIDiscoveryStrategy`, helper model) → `expectedProducts` (brand+line targets), `discoveryQueries`, `avoidCandidatePatterns`, `verificationFacts`, and a reusable `buyingRubric` that describes category quality signals, red flags, review themes, facts to verify, tradeoffs, and extra search queries.
5. **Search plan** (`generateSearchPlan`, `lib/searchQueryExpansion.ts`) then `augmentSearchPlanWithDiscoveryStrategy` → a `SearchPlan` with `queries` and staged `pass1/pass2/pass3` (families: `canonical_shopping`, `hard_filter`, `retailer_domain`, `editorial_review`, `owner_experience`, `synonym`, `fallback`). The first app-generated hard-filter searches are protected so AI-added strategy searches cannot crowd out the buyer's brand/category/budget constraints. AI-added budget searches are normalized to firm wording such as `under $200`.
6. **Serper discovery** (`searchSerperForProducts`, `lib/search/serper.ts`) → `{ candidates: RawProductCandidate[], stats }`.
7. **Discovery gap check** (`buildOpenAIDiscoveryGapCheck`, helper model). If it returns `followUpQueries`, a second `searchSerperForProducts` runs and results are merged via `mergeSerperSearchResults`.
8. **Final AI research** (`client.responses.create`, final model, `tools:[{type:"web_search"}]`, `tool_choice:"required"`, **strict JSON schema** `recommendationResultJsonSchema`, 180s timeout). The LLM returns structured candidates + summary prose. `researchSystemPrompt`/`buildResearchPrompt` from `lib/researchPrompt.ts` pass the Serper candidates and market-coverage snapshot into the prompt.
9. **Parse + validate** the model output: `normalizeResearchResult` → `recommendationResultSchema.safeParse` (`lib/recommendationSchema.ts`, `lib/normalizeResearchResult.ts`).
10. **Merge candidate sets**: `serperCandidateToRecommendation` converts Serper candidates; `mergeProductRecommendations` merges them with the LLM's `candidate_products`.
11. **Citation verification**: `collectVerifiedSourceUrls(response)` + Serper URLs (trusted without re-fetch). If none, `collectReachableCitationUrls` does a live reachability check. `filterResultToVerifiedCitations` drops products lacking a verified citation.
12. **Result-issue gate** (`getRecommendationResultIssue`): triggers fallbacks (see §9).
13. **Requirement filtering** (`filterResultByRequirements`, `lib/requirementValidation.ts`).
14. **Enrichment chain**: `enrichResultWithReviewEvidence` (trust-ladder) → `enrichProductAssets` (images/price/metadata) → `verifyMissingRequirementEvidence` (rescue unknown facts) → `revalidateResultCandidates`. The trust ladder now receives the generated `buyingRubric` internally so it can search for category-specific facts, quality signals, owner-review themes, and red flags before ranking.
15. **No-exact sanity fallback** (`shouldRunNoExactSanityFallback`) for common searches.
16. **Score & select** (`scoreAndSelectRecommendations`, `lib/recommendationScoring.ts`).
17. **Optional narration** (`REVIEW_RADAR_LLM_NARRATION=on`): a cheap explainer LLM pass that rewrites only the displayed cards' prose (`lib/finalSynthesis.ts`), guarded so it cannot change the set, prices, specs, or citations.
18. **Finalize**: `prioritizeProductPageUrlsInResult` + `removeUserHiddenResultFields` (strips `scoreBreakdown`; hides `specConstraints` unless debug). Respond `{ result }` (+`debug` when `x-reviewradar-debug: true` and non-prod).

### Shared product trust layer
- `lib/productEligibility.ts` is the central "can this be a product card?" classifier. Serper intake, final result validation, product-page URL selection, ranking/requirement gating, and QA workers should call it instead of keeping separate page-filter lists.
- `lib/productPriceTrust.ts` is the central "can this price be trusted?" validator. It separates verified/usable prices from vague ceilings, financing amounts, missing prices, suspicious tiny prices, and conflicting price evidence.
- `lib/productTypeIntent.ts` is the central "is this the requested kind of product?" classifier. It separates exact product-type matches from substitutes, complements/accessories, irrelevant products, and products that need more verification. This prevents close-but-wrong products, such as wall ovens or ranges for a toaster-oven search, from passing just because they share broad category words.
- Exact Best Matches with a shopper budget now require a renderable product page plus trusted in-budget price evidence. Weak, missing, suspicious, or conflicting prices should become close matches that need verification, not exact matches.
- Evidence pages such as reviews, Reddit/forums, buying guides, support pages, category/search pages, and comparison pages may still help the research, but they should not become product cards or primary CTA links.

### Discovery internals (`lib/search/serper.ts` → `searchSerperForProducts`, ~line 2370)
- **Depth budgets** from `SEARCH_DEPTH` via `SEARCH_DEPTH_CONFIGS` (`lib/search/sourcePacks.ts`): `dev` / `standard` / `deep` set max shopping/organic/retailer/direct queries, `maxEnrichedProducts`, and `maxRawCandidates`.
- **Search types** (each wraps `fetchSerper`): `searchSerperShopping`, `searchSerperOrganic`, `searchSerperDirectRetailer`, `searchSerperOrganicEvidence`, plus image/video evidence. Results normalized into `RawProductCandidate` (`normalizeSerperShoppingResults` etc.).
- **Organic product admission**: Serper organic results are screened before becoming `RawProductCandidate`s. Review/forum/support/community/deals/comparison/article-style pages remain evidence sources, but are not treated as product cards. This now also blocks common shopping lookalikes such as "ranking/top N" articles, review pages, sale-story titles, brand newsroom/release pages, product-family pages, retailer category/advice pages, "things to avoid when buying/purchasing" advice pages, price-comparison pages, broad TV/laptop listing pages, and broad Nike/DICK'S/Foot Locker shoe listing pages.
- **Staged execution**: run `pass1`; **editorial seeding** (see below); run `pass2` if `< 15` useful candidates; `pass3` if below the depth's useful target; **direct-retailer** queries if still short; **market-coverage rescue** (broad "best/top rated" shopping queries) when the pool is `< 10` candidates, `< 3` retailer hosts, or `< 6` priced.
- **Editorial seeding** (`extractSeedProductNames`, exported): mines brand+model product names from editorial "best of" titles/snippets (anchored on a known brand **or** a model-number-bearing TitleCase run), then shopping-searches the top N seeds so curated picks enter as structured, priced candidates. Stats: `seedSearchesRun`, `seedProductNames`.
- **Cheap pre-filter** (`cheapPreFilterRawCandidates`, exported — the unit-test entry point): drops candidates via `cheapCandidateRejectionReason` and ranks survivors via `candidateFitScore` (both internal/non-exported). Rejection reasons include `wrong_category` (incl. component substitution), `wrong_brand`, `accessory_or_part`, `used_or_refurbished`, `over_budget`, `wrong_color`, `avoid_term`, `wrong_dimensions`, `wrong_spec`, `wrong_size`.
- **Dedupe**: `dedupeRawCandidates` collapses the same product across retailers (canonical identity).
- **Price / availability / images / reviews / retailers**: parsed from Serper shopping fields and enrichment; price plausibility enforced by `lib/priceParsing.ts` (`plausibleProductPrice` - absolute floor $10, relative floor 0.25x strongest signal, `null` when implausible). Product reliability can now mark prices as `suspicious` when a tiny accessory/promo/payment/variant-looking amount appears for a full-product category, keeping that product out of exact Best Match results until a trustworthy price is found.
- **Source diversity**: in selection, no single host fills more than `ceil(7/2)=4` displayed slots while other-source options exist (`selectRankedExactMatches`, `lib/recommendationScoring.ts:850`).

### Ranking into the displayed lists (`scoreAndSelectRecommendations`)
- Every candidate is re-validated (`applyCurrentRequirementCheck`) and scored (`scoreProduct` → `ScoreBreakdown`, `withScore`).
- Category-fit scoring is active by default as a small capped nudge. `lib/categoryProfiles.ts` maps categories such as toaster ovens, microwaves, TVs, monitors, laptops, grills, pressure washers, leaf blowers, vacuums, and power tools to important specs. `lib/specDictionary.ts` extracts reusable facts such as wattage, slice capacity, cooking functions, quart capacity, temperature, screen size, refresh rate, memory, storage, BTU, CFM, PSI, GPM, runtime, battery-included status, and weight. This helps better-documented products rank above thin lookalikes without overriding hard requirements.
- Universal buying-rubric scoring (`lib/buyingRubric.ts`) supplements hand-written category profiles. The helper model generates a rubric for the current search, then deterministic scoring gives small boosts for supported quality/review/fact signals and penalties for supported red flags or missing important verification facts. This is a ranking signal only; it does not let products bypass hard requirements, product eligibility, or price trust.
- Rubric-guided evidence gathering (`lib/productEvidence.ts`) uses the same generated rubric earlier in the pipeline. It adds rubric-specific fact, review, and complaint searches to the evidence ladder, converts supported rubric signals into evidence, and guards against negated red-flag false positives.
- Rubric evidence completeness now records important missing rubric facts as `Rubric fact: ...` evidence unknowns. Those gaps add a capped missing-data penalty and confidence cap, but they do not hard-reject a product by themselves. This makes weakly verified products less likely to outrank better-verified products while keeping useful options visible.
- **Exact matches** = `requirementCheck.exactMatch === true` **and** `failed.length === 0` **and** `unknown.length === 0`. Ranked by `sortByRankedMatchStrength` (requirement fit first, then `rankedMatchScore`, then credibility tier), diversity-capped, top **7**, labeled `#N Best Match`.
- **Near/Close matches** = not exact and not disqualified by a `Category:`/`Avoid:` failure; sorted by `totalScore`, capped at **5** for display (`MAX_NEAR_MATCHES`), and only shown when fewer than 7 exact matches exist.
- `scoreProduct` `totalScore` combines requirement fit, owner rating/review strength, owner-opinion, expert mentions, source quality, popularity, price-value, market-confidence (×0.3), availability, and category fit, minus repeated-complaint / missing-data / market-confidence / credibility-floor penalties. Category fit can be disabled for QA with `REVIEW_RADAR_CATEGORY_SCORING=off`.

---

## 4. Constraint handling

`StructuredRequirements` (`types/review-radar.ts:125`) is the contract. Built by
`extractStructuredRequirements` (`lib/requirementExtraction.ts`). Buckets: `requiredConstraints`,
`avoidConstraints`, `preferredConstraints`, `sizeConstraints`, `specConstraints`,
`colorConstraints`, `materialConstraints`, `brandConstraints`, `budgetRules`,
`ambiguousConstraints`, `summary`.

**Strictness** (`StructuredConstraintStrictness`): `hard` | `soft` | `dealbreaker`.

Product-type intent is checked separately from broad category words. Exact matches should satisfy the requested product type using product evidence, not just a self-assigned category label. For example, `toaster oven` can match countertop toaster ovens and air-fryer toaster ovens, but should not match wall ovens, freestanding ranges, stoves, or cooktops. If evidence is too thin, the product should be treated as needing verification rather than being promoted to an exact match.

Brand alternatives in important details, such as `Sony or Bose` or `DeWalt or Milwaukee`, should become hard brand constraints. Safe product-line aliases such as DeWalt `20V MAX` and Milwaukee `M12 FUEL` are handled in `lib/brandMatching.ts` so retailer titles that omit the parent brand can still match when the line name is specific enough.

**3-state validation** (`validateProductAgainstRequirements`, `lib/requirementValidation.ts`):
each requirement resolves to **pass / fail / unknown**:
- **Hard** requirement: a verified `fail` eliminates the product from exact matches; an `unknown` keeps it out of exact (lands in near). Examples: a Twin mattress for a "king" search → fail; a 400-CFM unit for a hard "≥600 CFM" → fail.
- **Soft** preference: never eliminates. A miss routes into a non-gating `softUnknown` bucket that only lowers confidence (`missingDataPenalty`).
- **Unknown specs** lower confidence; they do **not** auto-eliminate unless the user made the spec an explicit hard requirement.

**How violations are avoided across the pipeline:**
- At **discovery** (`cheapCandidateRejectionReason`) — verified conflicts on size/spec/color/category/brand/budget are rejected before ranking (Theme 1).
- At **validation** (`filterResultByRequirements`, `revalidateResultCandidates`).
- At **selection** (exact-match gate requires zero `failed` and zero `unknown`).

**Examples (general, category-agnostic):**
- *Size limit*: "under 64 inches wide" → `sizeConstraint {dimension:width, operator:max, value:64}`; a wider product fails.
- *Color*: "black office chair" → color constraint; a product whose real evidence shows only white fails (the system uses the product's own name/specs, not the echoed query category).
- *Budget*: "under $500" in the Budget field, product-category text, or Important Details → `budgetRule {operator:max, amount:500}`; over-budget candidates are excluded from exact (a `premiumCap`/1.4× cutoff governs how far over is even kept as a near match). Important Details budget parsing ignores measurement units like pounds, inches, feet, CFM, PSI, Hz, GB/TB, and runtime units so "under 6 lbs" is not treated as "$6".
- *Feature requirement*: a Smart Feature like "USB-C" → feature constraint; products without evidence of it are unknown/fail per strictness.
- *Excluded product type / form factor*: a cooktop for an "oven" search, an ice-maker for a "refrigerator" search, bed furniture/foundations for a "mattress" search, or lounge chairs/pillows/mats for an "office chair" search → rejected as wrong product type/component substitution; an unrequested niche form factor (tabletop/travel/mini/handheld/portable/compact) is **deprioritized** (`lib/formFactor.ts`, `lib/requirementValidation.ts`).
- *Non-product pages*: discussion/Q&A/forum/review/guide/list-page, support/community, deals/sales roundup, price-comparison, and article-headline style results are filtered during organic discovery and again before display when they are not specific product recommendations.

---

## 5. Important files & modules

**Entry points / routing**
- `app/api/recommendations/route.ts` — main pipeline orchestrator (the file to read first).
- `app/api/features/route.ts` — Smart-Feature generation (catalog → cache → LLM → fallback).
- `app/page.tsx` — home page, search state, submit/cancel, results rendering.
- `app/layout.tsx`, `app/globals.css` — shell and styling.

**Requirements & constraints**
- `lib/requirementExtraction.ts` — `extractStructuredRequirements`, Zod schemas, `getPremiumCap`.
- `lib/requirementValidation.ts` — `validateProductAgainstRequirements`, `filterResultByRequirements`, `revalidateResultCandidates`, `buildNoExactMatchesResult`, `hasFirmRequirementFilters`, product-type conflict table, `hasConflictingProductType`.
- `lib/requirementConflicts.ts` — contradictory-requirement detection.
- `lib/requirementEvidenceRescue.ts` — `verifyMissingRequirementEvidence` (flip unknown→pass from found evidence).
- `lib/specDictionary.ts` / `lib/specExtraction.ts` — numeric/boolean spec registry + extraction/validation (`extractSpecsFromText`, `evaluateSpecConstraint`, `validateSpecConstraints`).
- `lib/formFactor.ts` — form-factor/subtype model: `detectFormFactors`, `offFormFactorModifiers`, `isComponentSubstitution`.

**Discovery & search**
- `lib/search/serper.ts` — all Serper calls, candidate normalization, pre-filter, editorial seeding, orchestration, dedupe, merge.
- `lib/search/sourcePacks.ts` — category groups, retailer/source packs, `SEARCH_DEPTH_CONFIGS`.
- `lib/searchQueryExpansion.ts` — `generateSearchPlan`, query families/staging.
- `lib/discoveryStrategy.ts` — `buildOpenAIDiscoveryStrategy`, `buildOpenAIDiscoveryGapCheck`, `augmentSearchPlanWithDiscoveryStrategy`.
- `lib/searchCandidateFallback.ts` — builds a result from Serper candidates when AI research is unusable.
- `lib/brandMatching.ts` — `detectKnownBrands`, `brandAliasesFor`, brand evidence matching.
- `lib/productCategory.ts` — `baseProductCategoryFromQuery`, `detectBedSize` (enumerated size attribute).

**Scoring, evidence, identity**
- `lib/recommendationScoring.ts` — `scoreProduct`, `scoreAndSelectRecommendations`, ranking, source diversity, slot labels.
- `lib/categoryProfiles.ts` / `lib/categoryScoring.ts` — category fit registry + `computeCategoryFit` (capped additive boost).
- `lib/productCredibility.ts` — `assessProductCredibility` (tiers strong/moderate/weak).
- `lib/productEvidence.ts`, `lib/productAssets.ts`, `lib/productImageResolver.ts`, `lib/productIdentity.ts`, `lib/semanticMatching.ts`, `lib/priceParsing.ts`.

**Output shaping**
- `lib/recommendationSchema.ts` — Zod + JSON schema for the strict LLM output.
- `lib/normalizeResearchResult.ts`, `lib/recommendationResultValidation.ts`, `lib/citationUrlVerification.ts`, `lib/responseSources.ts`, `lib/productPageUrl.ts`, `lib/productCopySanitizer.ts`.
- `lib/finalSynthesis.ts` — narration prompt, schema, parser, and the guard (`applyNarrationToResult`).

**UI**
- `components/SearchForm.tsx`, `components/SmartFeatures.tsx`, `components/ResultsSummary.tsx`, `components/ProductCard.tsx`, `components/VerdictCard.tsx`, `components/SourceList.tsx`, `components/ui/*` (shadcn primitives).
- `lib/productCardViewModel.ts` — `buildProductRecommendationCardData` (maps a `ProductRecommendation` to everything the card renders).
- `lib/dealbreakerVisibility.ts`, `lib/nearMatchClassification.ts` — client-side result shaping.

**Smart features**
- `lib/smartFeatureSuggestions.ts` (catalog + fallback + schema), `lib/smartFeatureSelection.ts`, `lib/smartFeatureCategory.ts`, `types/smart-features.ts`.

**Shared infra**
- `lib/openaiClient.ts` — `createOpenAIClient` (dynamic `import("openai")`; throws `MissingOpenAISdkError` if absent), `lib/cache.ts`, `lib/errorMessages.ts`, `lib/utils.ts`.

---

## 6. API & external service usage

**Serper.dev** (`lib/search/serper.ts`, via `fetchSerper`): all live product **discovery** —
Google Shopping, Organic, retailer-domain, direct-retailer, and editorial/image/video evidence.
Contributes the structured, priced `RawProductCandidate` pool and the market-coverage snapshot.
Requires `SERPER_API_KEY`. **If missing**, discovery is skipped (`stats.skippedReason = "missing_api_key"`) and the pipeline relies on the LLM's `web_search` only.

**OpenAI (Responses API)** via `createOpenAIClient`:
- **Helper model** (`OPENAI_HELPER_MODEL` || `gpt-5.4-mini`): discovery strategy, discovery gap check, and the optional narration pass.
- **Final model** (`OPENAI_FINAL_MODEL` || `gpt-5.4-mini`): the main research call with the built-in `web_search` tool (`tool_choice:"required"`) and strict JSON-schema output — produces the structured recommendations + prose.
- **Features model** (`OPENAI_MODEL` || `gpt-5.4-mini`): generates Smart-Feature filters in `/api/features`.
- The SDK is loaded dynamically; if `openai` isn't installed the route returns the missing-key user message.

**What each contributes:** Serper = breadth + real prices/retailers; OpenAI = query strategy, web-search synthesis, requirement-aware structuring, and buyer-facing prose. Deterministic TS code does the filtering, validation, scoring, and selection.

**Environment variables** (see `.env.example`, `.env.local.example`; never commit real values):
- `OPENAI_API_KEY` — **required** for the full pipeline; absent → HTTP 500 with a user message.
- `SERPER_API_KEY` — optional; enables Serper discovery.
- `SEARCH_DEPTH` — `dev` | `standard` | `deep` (invalid → `standard`).
- `OPENAI_MODEL`, `OPENAI_HELPER_MODEL`, `OPENAI_FINAL_MODEL` — model overrides.
- Feature flags: `REVIEW_RADAR_SPEC_VALIDATION`, `REVIEW_RADAR_CATEGORY_SCORING`, `REVIEW_RADAR_CREDIBILITY_PENALTY`, `REVIEW_RADAR_SPEC_SEARCH`, `REVIEW_RADAR_LLM_NARRATION` (set to `on`). `REVIEW_RADAR_DEBUG_LOGS=true` enables server-side discovery logs (non-prod).
- `NODE_ENV` — gates debug output and dev-only `scoreDebug`.

> The `REVIEW_RADAR_*` flags are **not** in `.env.example`; they live in the developer's `.env.local`. Intended production defaults are **Needs verification**.

---

## 7. Data flow

```
User input (SearchForm)
   │  category, budget, priorities, selectedFeatures
   ▼
buildRecommendationApiPayload → RecommendationApiRequest (+ extractedRequirements)
   ▼
POST /api/recommendations
   ▼
extractStructuredRequirements → StructuredRequirements ──► detectRequirementConflicts (400 on conflict)
   ▼
buildOpenAIDiscoveryStrategy → ProductDiscoveryStrategy
   ▼
generateSearchPlan + augment → SearchPlan (queries, pass1/2/3)
   ▼
searchSerperForProducts → RawProductCandidate[]  (cheap pre-filter + fit ranking + dedupe)
   ▼
buildOpenAIDiscoveryGapCheck → followUpQueries → (2nd Serper search) → mergeSerperSearchResults
   ▼
client.responses.create (web_search, strict schema) → raw LLM JSON
   ▼
normalizeResearchResult → recommendationResultSchema → RecommendationResult (candidate_products)
   ▼
mergeProductRecommendations(LLM, serperCandidateToRecommendation(serper))
   ▼
citation verification → filterResultToVerifiedCitations
   ▼
filterResultByRequirements → enrichReviewEvidence → enrichProductAssets
        → verifyMissingRequirementEvidence → revalidateResultCandidates
   ▼
scoreAndSelectRecommendations → exactMatches[≤7] + nearMatches[≤5] (+ ScoreBreakdown)
   ▼
(optional) LLM narration (guarded prose rewrite)
   ▼
prioritizeProductPageUrls + removeUserHiddenResultFields → { result } (JSON)
   ▼
ResultsSummary + ProductCard render
```

**Main shapes** (`types/review-radar.ts`): `RecommendationApiRequest`, `StructuredRequirements`
(+ `StructuredConstraint`, `SizeConstraint`, `BudgetRule`, `SpecConstraint`), `SearchPlan` /
`SearchQueryCandidate`, `ProductDiscoveryStrategy` / `ProductDiscoveryGapCheck`,
`RawProductCandidate`, `ProductRecommendation` (+ `ScoreBreakdown`, `RequirementCheck`,
`ProductCredibility`, `Citation`, `ProductEvidenceBucket`), `RecommendationResult`, `SearchCoverage`.

> **Stale comments:** `SpecConstraint`/`ProductSpecValue` in `types/review-radar.ts` say they are
> "shadow mode … not yet consumed by search, validation, or scoring." That is **out of date** —
> specs are consumed at discovery and (flag-gated) in validation/scoring. Trust the code, not those comments.

---

## 8. UI structure

- **`app/page.tsx`** — hero/marketing (hidden once results show), `SearchForm`, `ResultsSummary`. Owns request lifecycle (abort, request-id guarding against stale responses, 180s timeout).
- **`components/SearchForm.tsx`** — the four inputs + live requirement preview + submit/cancel.
- **`components/SmartFeatures.tsx`** — fetches and renders category-specific feature chips from `/api/features`.
- **`components/ResultsSummary.tsx`** — coverage summary, dealbreaker-strength slider (display-only), exact-match list, grouped near matches, what-to-avoid, final advice. Shows skeletons while loading and an "No exact matches" alert (with most-restrictive filters) when empty.
- **`components/ProductCard.tsx`** + **`lib/productCardViewModel.ts`** — each card shows: product **image** (with graceful "image unavailable" fallback), **rank badge** (`#N Best Match`), **title/category**, **summary** + why-recommended reasons, **pros/cons**, **price** + "View best offer" CTA, **citations** (host + what each supports), an **evidence quality** signal (sources checked, warnings), **owner opinion** (praises/concerns/sentiment), **specs** (universal + category-specific), **quick signals**, and **requirement comparisons**. The view model is the single place that decides what's shown and why — a good target when changing card content.
- **`components/VerdictCard.tsx`**, **`components/SourceList.tsx`** — final advice and source listing.

---

## 9. Error handling & fallback behavior

All in `route.ts` unless noted; user-facing strings in `lib/errorMessages.ts` (`USER_ERROR_MESSAGES`).

- **Missing `OPENAI_API_KEY`** → HTTP 500 `missingApiKey`. **Missing OpenAI SDK** → same message.
- **Conflicting requirements** → HTTP 400 with the conflict list.
- **Empty / invalid LLM output** → 502 (`noReliableEvidence` / `badStructuredOutput`).
- **Weak exact matches / no reliable evidence** (`getRecommendationResultIssue === "no_reliable_evidence"`):
  - if Serper candidates exist → **search-candidate fallback** (`buildServerSearchFallbackResult` → enrich → re-validate → score) returns verified shopping results instead of erroring;
  - else if firm requirement filters exist → `buildNoExactMatchesResult` (explains nothing met the filters);
  - else → 422 `noReliableEvidence`.
- **No exact matches on a common search** → `shouldRunNoExactSanityFallback` re-derives results from expanded Serper candidates.
- **AI research throws after discovery succeeded** → `catch` block uses `fallbackContext` to return a Serper-only result ("Live AI research was unavailable…").
- **Serper missing/erroring** → discovery is skipped or that source is logged and skipped (`logSerperWarning`); pipeline continues on LLM `web_search`.
- **Missing images** → `ProductCard` shows an "image unavailable" placeholder; `enrichProductAssets`/`productImageResolver` try to resolve a real image first.
- **Missing/implausible prices** → `plausibleProductPrice` returns `null` ("Price not verified"); such products drop out of in-budget exact matches rather than posing as cheap picks. Price extraction also ignores monthly/installment/financing payment amounts such as "$35/mo" so those do not masquerade as full product prices. High-ticket full-product contexts, such as travel systems, major appliances, large TVs, grills, laptops, mattresses, and in-ground/outdoor basketball hoops, use a reusable plausibility floor. Common full-product categories such as air purifiers, printers, vacuums, office chairs, and cordless drills also have lower sanity floors. Tiny promo/payment/accessory/variant amounts like `$35` or `$10` are marked unverified or `suspicious` instead of exact-match prices.
- **Missing reviews/specs** → treated as `unknown` (3-state), lowering confidence, not eliminating (unless a hard requirement).
- **Rescue/retry logic**: discovery staged passes + market-coverage rescue + editorial seeding (§3); `verifyMissingRequirementEvidence` re-checks unknown facts; citation reachability re-check only when no verified URLs exist.
- **Frontend**: 180s abort → `slowResponse`; fetch failure → `networkError`; cancel is silent. Stale responses are ignored via `requestId` guarding.

---

## 10. Testing & debugging guidance

**Run locally**
```bash
npm install
npm run dev            # Next.js dev server (needs OPENAI_API_KEY; SERPER_API_KEY optional)
```
Create `.env.local` from `.env.local.example` and set keys. Without `OPENAI_API_KEY` the
recommendations route returns 500 by design.

**Checks**
```bash
npm test               # node --test tests/*.test.mjs  (deterministic unit tests; no network)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # next build (production compile)
npm run test:e2e       # Playwright (e2e/), uses mocked route deps where possible
```
There are ~48 `tests/*.test.mjs` files covering extraction, validation, scoring, price plausibility,
the discovery filter, form-factor logic, editorial seeding, schema/contract, and result quality.
`.mjs` tests type-strip the `.ts` modules (Node emits a harmless `MODULE_TYPELESS_PACKAGE_JSON` warning).

**Deterministic eval harnesses** (no API spend; honor `REVIEW_RADAR_*` env flags):
```bash
node scripts/eval-pipeline.mjs                                   # multi-category exact/near split + red-flag checks
REVIEW_RADAR_CREDIBILITY_PENALTY=on node scripts/eval-pipeline.mjs
node scripts/ab-ranking.mjs                                      # one fixed candidate set, flags off vs on
```

**Agent QA loop** (safe local controller/worker/verifier workflow):
```bash
npm run qa:worker -- --batch price-trust
npm run qa:worker -- --batch price-trust --mode live
npm run qa:loop -- --batches price-trust,broad-mainstream,requirement-units
npm run qa:verify -- --before docs/agent-worker-results/before.json --after docs/agent-worker-results/after.json
```
The worker batches live in `docs/agent-batches/`. Deterministic mode is the default. Live mode posts to
localhost with `x-reviewradar-debug: true` and records exact/near counts, product names, suspicious flags,
likely root causes, and debug summaries when available.
Live workers retry temporary localhost/rate-limit/server failures before creating a next task, and label
temporary research failures separately from true localhost availability problems.
Batch files can include a larger `searchPool`; the worker rotates through that pool and records the
current slice in `searchRotation`, so repeated agent runs test different product searches over time.

The controller writes `docs/agent-next-task.md`, appends to `docs/qa-loop-results.md`, and generates
`docs/agent-loop-report.md`. Workers do not edit code. Fix agents should use `docs/agent-fix-template.md`
and make one generalized fix at a time.

**Live debug**: send header `x-reviewradar-debug: true` (non-production only) to `POST /api/recommendations`
to receive a `debug` payload (search plan stages, candidate specs/validation, Serper call counts,
rejected counts, expected/missing products, seed names, model names). Example:
```powershell
$body = @{ query = "cordless leaf blower"; priorities = "at least 600 cfm"; budget = "under $300" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/recommendations" `
  -Headers @{ "x-reviewradar-debug" = "true"; "Content-Type" = "application/json" } -Body $body
```

**How to verify a change improved the app**
1. `npm run typecheck && npm run lint && npm test` must stay green.
2. Run `scripts/eval-pipeline.mjs` before/after; confirm red-flag checks still pass and the intended exact/near shift happened.
3. For discovery/ranking changes, do a **live debug** search and diff `debug` fields (candidate counts, rejected counts, seed names, exact/near split) before vs after.
4. **Good broad QA searches** (exercise different code paths/categories):
   - `cordless leaf blower` + "at least 600 CFM" (hard numeric spec).
   - `king size mattress` + "under $1500" (size enumeration + budget + same-brand dedupe).
   - `gas grill` + "under $600" (form-factor: tabletop should not top the list).
   - `cordless vacuum` + "good for pet hair, under 6 lbs" (soft + size + feature).
   - `65 inch tv` + "for a bright room" (popularity/credibility, weak-spec).
   - `office chair` + "black, lumbar support, under $300" (color + feature + budget).
   - A deliberately over-constrained query to exercise the **no-exact** path and near-match grouping.

---

## 11. Current limitations & known risk areas

- **External-service dependence.** No `OPENAI_API_KEY` → the whole recommendations route 500s. No `SERPER_API_KEY` → discovery is skipped and quality drops to LLM `web_search` only. Network flakiness/timeouts (180s) directly affect results.
- **Cost/latency.** With narration enabled there are now **two** OpenAI calls per search (research + narration) plus helper calls (strategy, gap check) and many Serper calls. Searches take ~1–3 minutes.
- **Tier-label mismatch.** The named tiers in product asks (Budget/Value/Premium/Alternative) are **not implemented**; only `#N Best Match` + `Close Match` exist. Don't assume otherwise.
- **No dedicated "avoid" UI field.** Avoid/deal-breakers are parsed from Important Details. Whether a separate field is intended is **Needs verification**.
- **Stale type comments.** `SpecConstraint`/`ProductSpecValue` doc-comments claim "shadow mode / not consumed"; the code does consume specs. Misleading if read literally.
- **Flag-gated behavior.** Spec validation, category scoring, credibility penalty, spec search, and narration are env-flag gated; behavior differs between a default checkout (flags off) and the developer's `.env.local` (flags on). Tests run flags-off by default. Confirm which set you're exercising.
- **Editorial-seeding precision.** `extractSeedProductNames` is heuristic (known brand OR model-number-bearing TitleCase run). Brands absent from `lib/brandMatching.ts` are only caught when a model number is present; otherwise good picks can be missed. The Serper-wiring around it is integration glue, not unit-tested end to end.
- **Internal discovery functions aren't exported.** `cheapCandidateRejectionReason` and `candidateFitScore` are private; tests must go through `cheapPreFilterRawCandidates`. Keep that entry point stable.
- **Client-only result shaping.** Dealbreaker-strength and near-match grouping happen in the browser and do not re-run the search; they only hide/show already-returned products.
- **Collection/list-page leakage.** The June 18, 2026 QA loop added broader non-product filtering for review/support/community/deals/comparison/article-style pages at Serper normalization and final validation. TV-style collection/list pages may still need category-specific live verification. **Needs verification** after the next TV-focused loop.
- **Uncommitted work.** A large amount of pipeline work is currently **uncommitted on `main`** in this working tree — `git status` before assuming the committed history reflects current behavior.
- **Verification gaps (read the code before trusting):** exact Serper request/quardrails in `fetchSerper`; precise category-group routing in `sourcePacks.ts`; the full requirement-extraction grammar in `requirementExtraction.ts`. These are large and were not exhaustively traced here.

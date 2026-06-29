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
7. **Discovery gap check** (`buildOpenAIDiscoveryGapCheck`, helper model). If it returns `followUpQueries`, `shouldRunFollowUpDiscovery` (`lib/recommendationPerformance.ts`) decides whether the current pool is actually thin enough to justify a second `searchSerperForProducts`; results are merged via `mergeSerperSearchResults`.
8. **Final AI research** (`client.responses.create`, final model, `tools:[{type:"web_search"}]`, `tool_choice:"required"`, **strict JSON schema** `recommendationResultJsonSchema`, 180s timeout). The LLM returns structured candidates + summary prose. `selectFinalResearchCandidates` shortlists the strongest Serper candidates before this call, and `chooseFinalResearchContext` uses lighter web-search context when candidate coverage is already strong. `researchSystemPrompt`/`buildResearchPrompt` from `lib/researchPrompt.ts` pass the shortlisted candidates and market-coverage snapshot into the prompt.
9. **Parse + validate** the model output: `normalizeResearchResult` → `recommendationResultSchema.safeParse` (`lib/recommendationSchema.ts`, `lib/normalizeResearchResult.ts`).
10. **Merge candidate sets**: `serperCandidateToRecommendation` converts Serper candidates; `mergeProductRecommendations` merges them with the LLM's `candidate_products`.
11. **Citation verification**: `collectVerifiedSourceUrls(response)` + Serper URLs (trusted without re-fetch). If none, `collectReachableCitationUrls` does a live reachability check. `filterResultToVerifiedCitations` drops products lacking a verified citation.
12. **Result-issue gate** (`getRecommendationResultIssue`): triggers fallbacks (see §9).
13. **Requirement filtering** (`filterResultByRequirements`, `lib/requirementValidation.ts`).
14. **Enrichment chain**: `enrichResultWithReviewEvidence` (trust-ladder) → `enrichProductAssets` (images/price/metadata) → `verifyMissingRequirementEvidence` (rescue unknown facts) → `revalidateResultCandidates`. `buildAdaptiveVerificationBudget` keeps expensive enrichment/rescue focused on likely visible products, defaults to 3-product concurrency, and checks the most important missing facts first. The trust ladder now receives the generated `buyingRubric` internally so it can search for category-specific facts, quality signals, owner-review themes, and red flags before ranking.
15. **Source-quality upgrade** (`upgradeWeakSourceEvidence`, `lib/requirementEvidenceRescue.ts`): runs AFTER `revalidateResultCandidates` and BEFORE scoring. For each candidate that (a) has a model-number token (strong product identity), (b) passes all hard requirements, and (c) has no verified price, no owner rating, and no tier-1 editorial or tier-2 marketplace citation from a different host (`hasUsefulCommerceEvidence` using `sourceTier.ts`), a single `searchSerperShopping` call looks for the same product on a better-sourced page. Before model/token overlap can accept a candidate, `looksLikeSameProduct` rejects explicit product-type conflicts through `classifyProductTypeMatch`; it also rejects an explicit different token in the same model family. Exact model evidence, safe merchant model paths, and sparse candidates without an explicit conflict retain the existing identity path. After the identity gate passes, price, rating, reviewCount, citation, and image are merged via existing rescue helpers. Cap: `MAX_SOURCE_UPGRADE_CANDIDATES = 3`. Debug visibility: `debug.stageFunnel.sourceUpgradeTraces` — one `SourceUpgradeTrace` per attempt recording `name`, `query`, `candidatesReturned`, `candidatesEvaluated`, `noMatchReason` (`"shopping_results_empty"` / `"identity_rejected"` / `"no_attachable_fields"`), `candidateSample` (≤5 shopping results with identity match result and rejection reason), `evidenceAttached`, and `attachedFields`.
16. **No-exact sanity fallback** (`shouldRunNoExactSanityFallback`) for common searches.
17. **Score & select** (`scoreAndSelectRecommendations`, `lib/recommendationScoring.ts`).
18. **Optional narration** (`REVIEW_RADAR_LLM_NARRATION=on`): a cheap explainer LLM pass that rewrites only the displayed cards' prose (`lib/finalSynthesis.ts`), guarded so it cannot change the set, prices, specs, or citations. It is off by default for normal searches because it improves wording, not product accuracy.
19. **Finalize**: `prioritizeProductPageUrlsInResult` + `removeUserHiddenResultFields` (strips `scoreBreakdown`; hides `specConstraints` unless debug). Respond `{ result }` (+`debug` when `x-reviewradar-debug: true` and non-prod).

### Shared product trust layer
- `lib/productEligibility.ts` is the central "can this be a product card?" classifier. Serper intake, final result validation, product-page URL selection, ranking/requirement gating, and QA workers should call it instead of keeping separate page-filter lists.
- `lib/productPriceTrust.ts` is the central "can this price be trusted?" validator. It separates verified/usable prices from vague ceilings, financing amounts, missing prices, suspicious tiny prices, and conflicting price evidence.
- `lib/productTypeIntent.ts` is the central "is this the requested kind of product?" classifier. It separates exact product-type matches from substitutes, complements/accessories, irrelevant products, and products that need more verification. This prevents close-but-wrong products, such as wall ovens or ranges for a toaster-oven search, from passing just because they share broad category words.
- 🟩 `lib/productTypeMatch.ts` (`classifyProductTypeMatch`) is the shared wrong-product-type **verdict** used by BOTH discovery (`serper.ts` `cheapCandidateRejectionReason`) and validation (`requirementValidation.ts` `hasConflictingProductType`). It composes `productTypeIntent` + the `formFactor` component-substitution model + the cross-category conflict rules (`PRODUCT_TYPE_CONFLICT_RULES`, moved here from `requirementValidation`) so the two layers apply the same check instead of each duplicating it. Discovery now rejects cross-category conflicts (e.g. a washing machine for a pressure-washer search) earlier, not just at validation. (Phase 1 of the product-accuracy hardening plan — see `docs/product-accuracy-hardening-plan.md`. `requiredCategoryEvidenceRules` and the identity-based `hasMattressFurnitureConflict` stay validation-only because they reject on missing/identity evidence, which is unsafe on thin discovery snippets.)
- Exact Best Matches with a shopper budget now require a renderable product page plus trusted in-budget price evidence. Weak, missing, suspicious, or conflicting prices should become close matches that need verification, not exact matches.
- 🟩 **Text-priced products are budget-usable when the price is specific and plausible.** A price that comes only from recommendation text (no structured `metadata.offers`) but has already cleared the implausibly-low and conflicting checks now counts as `canUseForBudget` (so it can be an exact match), while still flagged `needs_verification` on the card. Only *vague* text prices (ranges, or "around/about/approximately $X") stay budget-unusable. This stops budget-only/thin-evidence searches (e.g. `shop vac` / `$400`) from returning 0 exact matches when retailers bot-wall the structured-offer fetch. The suspicious/financing/conflicting/full-size-appliance protections are unchanged — they run before this branch. See QA log "Claude Change 1 — Budget-usable text prices".
- Evidence pages such as reviews, Reddit/forums, buying guides, support pages, category/search pages, and comparison pages may still help the research, but they should not become product cards or primary CTA links.

### Discovery internals (`lib/search/serper.ts` → `searchSerperForProducts`, ~line 2370)
- **Depth budgets** from `SEARCH_DEPTH` via `SEARCH_DEPTH_CONFIGS` (`lib/search/sourcePacks.ts`): `dev` / `standard` / `deep` set max shopping/organic/retailer/direct queries, `maxEnrichedProducts`, and `maxRawCandidates`.
- **Search types** (each wraps `fetchSerper`): `searchSerperShopping`, `searchSerperOrganic`, `searchSerperDirectRetailer`, `searchSerperOrganicEvidence`, plus image/video evidence. Results normalized into `RawProductCandidate` (`normalizeSerperShoppingResults` etc.).
- **Organic product admission**: Serper organic results are screened before becoming `RawProductCandidate`s. Review/forum/support/community/deals/comparison/article-style pages remain evidence sources, but are not treated as product cards. This now also blocks common shopping lookalikes such as "ranking/top N" articles, review pages, sale-story titles, brand newsroom/release pages, product-family pages, retailer category/advice pages, "things to avoid when buying/purchasing" advice pages, price-comparison pages, broad TV/laptop listing pages, and broad Nike/DICK'S/Foot Locker shoe listing pages.
- **Staged execution**: run `pass1`; **editorial seeding** (see below); run `pass2` if `< 15` useful candidates; `pass3` if below the depth's useful target; **direct-retailer** queries if still short; **market-coverage rescue** (broad "best/top rated" shopping queries) when the pool is `< 10` candidates, `< 3` retailer hosts, or `< 6` priced.
- **Editorial seeding** (`extractSeedProductNames`, exported): mines brand+model product names from editorial "best of" titles/snippets (anchored on a known brand **or** a model-number-bearing TitleCase run), then shopping-searches the top N seeds so curated picks enter as structured, priced candidates. Stats: `seedSearchesRun`, `seedProductNames`.
- **Cheap pre-filter** (`cheapPreFilterRawCandidates`, exported — the unit-test entry point): drops candidates via `cheapCandidateRejectionReason` and ranks survivors via `candidateFitScore` (both internal/non-exported). Rejection reasons include `wrong_category` (incl. component substitution), `wrong_brand`, `accessory_or_part`, `used_or_refurbished`, `over_budget`, `wrong_color`, `avoid_term`, `wrong_dimensions`, `wrong_spec`, `wrong_size`.
- **Dedupe**: `dedupeRawCandidates` collapses the same product across retailers (canonical identity). When duplicate products are merged, alternate retailer offers are kept on the product metadata instead of becoming duplicate cards.
- **Price / availability / images / reviews / retailers**: parsed from Serper shopping fields and enrichment; price plausibility enforced by `lib/priceParsing.ts` (`plausibleProductPrice` - absolute floor $10, relative floor 0.25x strongest signal, `null` when implausible). Product reliability can now mark prices as `suspicious` when a tiny accessory/promo/payment/variant-looking amount appears for a full-product category, keeping that product out of exact Best Match results until a trustworthy price is found.
- **Product-page price binding** (`lib/productAssets.ts`): schema.org products are selected by target identity; page-level and visible fallbacks require matching page identity; element-level `data-price` fields require matching product context. Bare integer element prices are ignored unless an explicit minor-unit marker and matching product binding make conversion safe. Standard schema.org offers and legitimate expensive products remain valid; there is no global maximum-price rule.
- **Retailer throttling is discovery-only**: early discovery still uses host/source limits so one retailer cannot flood the raw candidate pool. Final exact-match selection no longer caps by retailer host. If several genuinely distinct, strongly supported products come from the same retailer, they can all appear. Duplicate exact products and near-duplicate model families are still collapsed by product identity, not by retailer.
- 🟩 **Variant-family collapse** (`selectRankedExactMatches`, `lib/productVariantFamily.ts`): same **brand + same size** collapses to the single most popular/trusted product (the list is best-first), so the slots show distinct products instead of model-number variants of one (e.g. three Vacmaster 12-gallon models → one). `detectPrimarySize` reads only true size/capacity units (gallon, inch, cu ft, quart, liter, oz, lb, ml) — never power (HP) — so a horsepower difference can't masquerade as a size difference; different sizes are different families and both stay. `variantFamilyKey` returns `null` (never collapses) when brand or size is unknown. Tradeoff: collapsing variants can reduce the displayed count below 7 when discovery surfaces few distinct families — the complementary fix is broader discovery (editorial seeding), not less collapsing.

### Ranking into the displayed lists (`scoreAndSelectRecommendations`)
- Every candidate is re-validated (`applyCurrentRequirementCheck`) and scored (`scoreProduct` → `ScoreBreakdown`, `withScore`).
- Category-fit scoring is active by default as a small capped nudge. `lib/categoryProfiles.ts` maps categories such as toaster ovens, microwaves, TVs, monitors, laptops, grills, pressure washers, leaf blowers, vacuums, and power tools to important specs. `lib/specDictionary.ts` extracts reusable facts such as wattage, slice capacity, cooking functions, quart capacity, temperature, screen size, refresh rate, memory, storage, BTU, CFM, PSI, GPM, runtime, battery-included status, and weight. This helps better-documented products rank above thin lookalikes without overriding hard requirements.
- Universal buying-rubric scoring (`lib/buyingRubric.ts`) supplements hand-written category profiles. The helper model generates a rubric for the current search, then deterministic scoring gives small boosts for supported quality/review/fact signals and penalties for supported red flags or missing important verification facts. This is a ranking signal only; it does not let products bypass hard requirements, product eligibility, or price trust.
- Rubric-guided evidence gathering (`lib/productEvidence.ts`) uses the same generated rubric earlier in the pipeline. It adds rubric-specific fact, review, and complaint searches to the evidence ladder, converts supported rubric signals into evidence, and guards against negated red-flag false positives.
- Rubric evidence completeness now records important missing rubric facts as `Rubric fact: ...` evidence unknowns. Those gaps add a capped missing-data penalty and confidence cap, but they do not hard-reject a product by themselves. This makes weakly verified products less likely to outrank better-verified products while keeping useful options visible.
- Missing rubric facts are weighted by a shared importance list (`lib/rubricFactImportance.ts`). Critical gaps such as current price, availability, product type, compatibility, dimensions/fit, capacity, and safety reduce confidence/ranking more than minor cosmetic or convenience gaps. Missing facts are sorted by importance before storage so critical gaps stay visible.
- Rubric-fact rescue (`lib/requirementEvidenceRescue.ts`) now reuses the existing evidence-rescue pass for critical and important rubric gaps. Hard requirements are still verified first; any remaining rescue slots can retry high-value missing rubric facts. When a retry verifies the fact for the same product, the specific rubric unknown is cleared and the supporting citation or metadata is kept.
- 🟩 The rescue's **Google Shopping** leg searches product **identity** (`buildRescueShoppingQuery` = name + category), not the descriptive verification phrase ("… current price …") used for the organic-evidence leg — shopping engines match titles, so the descriptive words were noise that lowered the structured-price match rate (Phase 3, step 1). A live measurement of the rescue success rate / bot-walled retailers is a recommended follow-up.
- **Exact matches** = `requirementCheck.exactMatch === true` **and** `failed.length === 0` **and** `unknown.length === 0`. Ranked by `sortByRankedMatchStrength` (requirement fit first, then `rankedMatchScore`, then credibility tier), product-diversity selected, top **7**, labeled `#N Best Match`. Final selection allows repeated retailers when the products are distinct; product identity and variant-family keys prevent duplicate cards.
- **Near/Close matches** = not exact and not disqualified by a `Category:`/`Avoid:` failure; sorted by `totalScore`, capped at **5** for display (`MAX_NEAR_MATCHES`), and only shown when fewer than 7 exact matches exist.
- `scoreProduct` `totalScore` combines requirement fit, owner rating/review strength, owner-opinion, expert mentions, source quality, popularity, price-value, market-confidence (×0.3), availability, and category fit, minus repeated-complaint / missing-data / market-confidence penalties. Category fit can be disabled for QA with `REVIEW_RADAR_CATEGORY_SCORING=off`.
- 🟩 **Credibility is charged once per ranking score (Phase 2 de-stacking).** Weak credibility used to be penalized 3–4× for one signal (`marketConfidenceAdjustment` + `marketConfidencePenalty` + the flag-gated `credibilityFloorPenalty` + reduced raw score, ≈ −58 in `rankedMatchScore`), which over-buried thin-but-valid budget/niche products. Now `rankedMatchScore` charges credibility via `marketConfidenceAdjustment` only and `totalScore` via `marketConfidencePenalty` only. `credibilityFloorPenalty` is still computed for debug but no longer subtracted, so `REVIEW_RADAR_CREDIBILITY_PENALTY` is a **no-op** flag. The dead `riskPenalty` (computed, never consumed) was removed. Order is unchanged in the baseline scenarios; only the excessive penalty margin narrowed.

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
- `lib/requirementEvidenceRescue.ts` — `verifyMissingRequirementEvidence` (flip unknown→pass from found evidence); `upgradeWeakSourceEvidence` (pre-scoring source-quality upgrade — see step 15); `needsSourceUpgrade`, `hasUsefulCommerceEvidence` (trigger conditions); `SourceUpgradeTrace` / `SourceUpgradeCandidateSample` (debug types).
- `lib/specDictionary.ts` / `lib/specExtraction.ts` — numeric/boolean spec registry + extraction/validation (`extractSpecsFromText`, `evaluateSpecConstraint`, `validateSpecConstraints`).
- `lib/formFactor.ts` — form-factor/subtype model: `detectFormFactors`, `offFormFactorModifiers`, `isComponentSubstitution`.

**Discovery & search**
- `lib/search/serper.ts` — all Serper calls, candidate normalization, pre-filter, editorial seeding, orchestration, dedupe, merge.
- `lib/search/sourceTier.ts` — generalized domain→tier classifier: 1 = editorial (Wirecutter, RTINGS, etc.), 2 = marketplace/retailer (Amazon, Home Depot, etc.), 3 = manufacturer/brand, 4 = other. Used by editorial seeding priority, `hasUsefulCommerceEvidence`, and citation-strength classification. `SOURCE_NAME_TOKENS` blocklist prevents source names from being mistaken for product names during seed extraction.
- `lib/search/sourcePacks.ts` — category groups, retailer/source packs, `SEARCH_DEPTH_CONFIGS`.
- `lib/searchQueryExpansion.ts` — `generateSearchPlan`, query families/staging.
- `lib/discoveryStrategy.ts` — `buildOpenAIDiscoveryStrategy`, `buildOpenAIDiscoveryGapCheck`, `augmentSearchPlanWithDiscoveryStrategy`.
- `lib/searchCandidateFallback.ts` — builds a result from Serper candidates when AI research is unusable.
- `lib/brandMatching.ts` — `detectKnownBrands`, `brandAliasesFor`, brand evidence matching.
- `lib/productCategory.ts` — `baseProductCategoryFromQuery`, `detectBedSize` (enumerated size attribute).

**Scoring, evidence, identity**
- `lib/recommendationScoring.ts` — `scoreProduct`, `scoreAndSelectRecommendations`, ranking, product-diversity selection, slot labels.
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
upgradeWeakSourceEvidence (source-quality upgrade, ≤3 shopping calls) → sourceUpgradeTraces
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

**Quality measurement + live replay** (targeted API spend):
```bash
npm run qa:plan -- --mode diagnostic          # print cost plan for a mode, no API calls
npm run qa:scorecard -- --mode diagnostic     # 5-query × 2-run diagnostic (needs --confirm above 600 Serper)
npm run qa:save-fixture -- "gas grill"        # call live API once, save debug payload → tests/fixtures/review-radar-live/gas-grill.json
npm run qa:replay -- tests/fixtures/review-radar-live/gas-grill.json  # replay at zero cost
npm run qa:replay -- --all                    # replay all saved live fixtures
node scripts/citationStrengthDiagnostic.mjs  # citation-type breakdown for one live query
```

Saved fixtures (`tests/fixtures/review-radar-live/*.json`) contain the full debug payload and can be replayed for zero additional API cost to inspect stage funnel, source-upgrade traces, final-selection traces, and citation strength. The replay script prints `Source-Quality Upgrade` including `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, and a candidate sample per attempted upgrade (Phase 3G+).

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
rejected counts, expected/missing products, seed names, model names). Key debug fields:
- `debug.stageFunnel.candidatePool` / `.rejectedCheap` / `.postFilter` / `.final7` — per-stage candidate snapshots (`lib/recommendationFunnel.ts`) showing where each candidate was lost.
- `debug.stageFunnel.sourceUpgradeTraces` — one `SourceUpgradeTrace` per source-upgrade attempt (Phase 3E+): `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, `candidateSample`, `evidenceAttached`, `attachedFields`. Replay with `scripts/replay-quality-fixtures.mjs`.
- `debug.stageFunnel.finalSelectionTrace` — per-candidate record of why every candidate that reached `scoreAndSelectRecommendations` was selected, dropped, collapsed, or excluded (`FinalSelectionDecisionReason` enum, 10 values). Replay with `scripts/replay-quality-fixtures.mjs`.
Example:
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
- **Live-fixture staleness.** `tests/fixtures/review-radar-live/*.json` are not committed (gitignored). Replay after a behavior change may show old source-upgrade or funnel results. Re-save with `npm run qa:save-fixture` after any meaningful pipeline change.
- **Verification gaps (read the code before trusting):** exact Serper request/quardrails in `fetchSerper`; precise category-group routing in `sourcePacks.ts`; the full requirement-extraction grammar in `requirementExtraction.ts`. These are large and were not exhaustively traced here.

---

## 12. Recent Claude work summary (as of 2026-06-26)

This section is the handoff map for agents picking up after the June 2026 Claude work. It is factual state, not a proposal.

**Measurement infrastructure built**
- Phase 0 added `scripts/goldBenchmark.mjs`, `scripts/qualityScorecard.mjs`, and `scripts/qualityConsistencyHarness.mjs`: a 14-query gold benchmark, broad/constraint scorecards, and stability probes. Baseline finding: mean core-leader coverage was about 3.0/7 in final-7 and 4.2/7 in candidate pool; leaders were often present upstream but lost before final selection.
- Measurement Phase 1 made scorecard modes explicit (`diagnostic`, `normal`, `high`, `stress`), added `npm run qa:plan`, corrected the cost model to about 47 Serper calls/search and 75 s/search, and blocks estimated runs above 600 Serper calls without `--confirm`.
- Measurement Phase 2 added replayable debug fixtures: `scripts/save-debug-fixture.mjs`, `scripts/replay-quality-fixtures.mjs`, `tests/fixtures/robot-vacuum-synthetic.json`, and `tests/replayFixtures.test.mjs`. Saved live fixtures in `tests/fixtures/review-radar-live/*.json` can be replayed at zero API cost but are gitignored and can go stale.
- Additional diagnostics now include `scripts/citationStrengthDiagnostic.mjs`, `debug.stageFunnel.*`, `docs/review-radar-test-memory.md`, and append-only QA reports in `docs/qa-loop-results.md`. Use these before spending on live baselines.

**Discovery improvements**
- Phase 0 found a coverage gap: many editorial market leaders were not entering the candidate pool, especially brand-led names without model numbers (`Coway Airmega`, `Herman Miller Aeron`, `Shark Matrix`).
- Phase 1 added `lib/search/sourceTier.ts`, a generic domain tier classifier: tier 1 editorial/lab, tier 2 marketplace/retailer, tier 3 brand/manufacturer, tier 4 other, plus source-name token blocking.
- `lib/search/serper.ts` `extractSeedProductNames` now accepts brand-led proper-noun product names, mines tier-1 editorial sources first, and rejects category-only, source-name, year-led, and multi-brand mash title runs. This was cost-neutral: it uses the existing seed-shopping budget rather than adding Serper calls.
- Discovery Themes 2 and 3 from the earlier plan (form-factor model, and editorial seeding enabled for good sources) are committed, but may warrant re-evaluation as live evidence changes.

**Filtering fix**
- The funnel diagnostic found core leaders such as RIDGID, Craftsman, and Roborock were lost at `afterCitationVerify`, not discovery or ranking.
- `filterResultToVerifiedCitations` was dropping real LLM/web-search product-page candidates because their citation URLs were not in the verified URL set built from Serper/Responses sources.
- Filtering STEP 2 added URL normalization and `rescueProductPageCitation`: a zero-citation candidate can self-cite its own product page only if that URL passes product-card eligibility. Article, review, category, search, listing, forum, and uncited prose still drop.
- Result: the specific citation-verify drop is fixed mechanically; broad before/after baselines were inconclusive because live variance is larger than the expected effect size.

**Product-accuracy hardening**
- Phase 0 (text-price fix): specific, plausible text-only prices can satisfy budget checks while still displaying as needing verification; vague ranges and suspicious/financing/conflicting prices remain unusable for exact budget matches.
- Phase 1 (product-type verdict helper): `lib/productTypeMatch.ts` centralizes wrong-type/accessory/component-substitution verdicts so discovery and validation use the same product-type logic.
- Phase 1 step 2 (conflict rules at discovery): cross-category conflict rules moved into the shared helper so obvious wrong-type candidates can be rejected before the candidate pool; missing-evidence and identity-only rules remain validation-only.
- Phase 2 (credibility de-stacking): duplicated weak-credibility penalties were consolidated so thin-but-valid products are not buried several times for the same sparse-evidence signal; hard gates were not loosened.
- Phase 3 (shopping-leg identity query): price/evidence rescue now uses product identity (`name + category`) for the Google Shopping leg instead of noisy `"current price"` wording; organic evidence search remains descriptive.
- Phase 5 (whole-word rubric matching): rubric quality-signal matching uses whole words/phrases instead of substring matches, preventing false positives such as `trail` in `trailer`.
- Phase 6 hardening pass: full deterministic checks, QA loop, and live smoke testing were run after the rubric/rescue work; future phases should preserve these trust gates.

**Requirement-filtering fixes**
- Phase 3A fixed diagnostics: `afterRequirementFilter` now records near matches as well as exact matches, so normal demotion to near-match is not misread as product loss.
- Phase 3A also fixed spec extraction: price wording such as `under $600` no longer poisons the nearby `4-burner` direction check; `operator: "max"` labels now say `at most N` to match `<=`.
- Phase 3B added a `robot_vacuum` product-type rule, richer `allowedCheckText`, and three-state `checkCategory` (`pass` / `fail` / `unverified`), blocking wet/dry, stick, canister, hand, upright, and shop vacs from both exact and near robot-vacuum results when confirmed wrong.
- Phase 3C expanded `categoryTerms()` with aliases from `extractedRequirements`, so a `gas grill` query can accept `propane grill` / `natural gas grill` evidence while still requiring the grill term. Butane and non-grill products remain blocked.

**Source-quality upgrade system**
- Phase 3E added `upgradeWeakSourceEvidence` in `lib/requirementEvidenceRescue.ts`, wired after requirement rescue/revalidation and before scoring.
- Trigger: `needsSourceUpgrade` requires a model-number token, no failed hard requirements, no verified price, no owner rating, and weak commerce evidence. Phase 3F changed the final condition from `countExternalCitations(product) === 0` to `!hasUsefulCommerceEvidence(product)`.
- `hasUsefulCommerceEvidence` is true only for a distinct-host tier-1 editorial citation or tier-2 marketplace/retailer citation. Tier-3 manufacturer/brand citations, same-brand subdomains, tier-4 mentions, and same-host self-cites do not block upgrade eligibility.
- Mechanism: one `searchSerperShopping` call per qualifying candidate, capped by `MAX_SOURCE_UPGRADE_CANDIDATES = 3`; candidate evidence attaches only after `looksLikeSameProduct` passes. Existing merge helpers add price, rating, review count, citation, and image without overwriting trusted existing fields.
- Phase 3F live diagnostic: trigger improved from 0/4 categories to attempts in 3/4 categories, but 4 live attempts across 4 categories attached 0 evidence. The current open question is why `evidenceAttached: false` occurs: Serper may be returning zero shopping candidates, or candidates may be failing identity.
- Phase 3G added the missing debug fields to answer that: `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, and `candidateSample`. Existing Phase 3F fixtures do not contain these fields; `candidatesReturned` remains unknown until fresh 3G fixtures are re-saved.

**Debug visibility added**
- `debug.stageFunnel.candidatePool`: merged Serper + LLM candidate snapshots, not Serper-only.
- `debug.stageFunnel.rejectedCheap`: cheap pre-filter rejections and reasons.
- `debug.stageFunnel.sourceUpgradeTraces`: source-upgrade attempts, including Phase 3G shopping-result diagnostics.
- `debug.stageFunnel.finalSelectionTrace`: debug-only per-candidate selection outcome from `scoreAndSelectRecommendationsWithTrace`, including selected, ranked-below-cutoff, duplicate/variant collapsed, reliability near-only, and disqualified reasons.

**Not done yet / open questions**
- Source-upgrade `candidatesReturned` is not yet confirmed via a fresh Phase 3G fixture run; do not infer whether search returned zero results or identity rejected them from old fixtures.
- Model-token gaps are not fixed: examples include Napoleon Rogue 525, Samsung Bespoke descriptive names, and FEIN Turbo II 9-20-36.
- Query construction redundancy remains: product names can already contain the category, producing queries such as `"Gas Grill gas grill"`; if Phase 3G shows zero candidates returned, shorter model-focused queries are the likely next target.
- Source upgrade has not yet shown evidence attachments in live runs; unit tests prove safety and merge behavior, not live effectiveness.
- Discovery Themes 2 and 3 are committed but may need another look if source-quality traces show candidate quality or source selection is still the limiting factor.

**Standing rules for future agents**
- No product-specific patches. Generalize by product type, source class, evidence shape, or reusable trust rule.
- No behavior changes without tests. Debug-only changes still need deterministic tests when they affect exported shapes or replay output.
- Do not run a full `normal` or `high` baseline without explicit approval; first report prior findings, cheaper replay/diagnostic alternatives, estimated Serper calls, and runtime.
- Do not weaken price trust, citation trust, product eligibility, product-type, hard-requirement, or exact-budget gates to improve coverage.
- Do not commit `.env.local`, real API keys, or live fixture outputs containing private/debug payloads.
- `docs/qa-loop-results.md` is append-only. Use the existing Claude green-header format for Claude entries and preserve prior findings rather than rewriting them.

---

## 13. Phase 5 implementation state (as of 2026-06-27)

**Phase 5A — source-upgrade safety hardening**
- RR-058 is fixed deterministically. The source-upgrade identity gate now asks the shared product-type layer for an explicit conflict verdict before accepting exact-model or token-overlap identity.
- A dehumidifier target rejects explicit wine/beverage refrigerator evidence even when target model extraction is unavailable. This guard does not turn unknown/sparse type evidence into a rejection.
- Candidate source titles that state a different token in the same model family are rejected (`RPD-411WG` versus `RPD-561EGP`). Uppercase measurement text such as `765 CFM` is not treated as a conflicting model family.
- The exact Phase 4F Whynter case now yields `identity_rejected` and attaches no price, rating, review count, or citation. Valid same-product offers, exact model titles, merchant model paths, RR-051/RR-053 provenance protections, and normal user-facing response shape remain green.
- Verification: focused tests 170/170; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 647/647; eval red-flag checks clean. No live search ran.

**Phase 5B - source-upgrade identity coverage**
- RR-052, RR-057, RR-034, RR-035, and RR-044 are fixed deterministically. Source-upgrade query identity now ranks model candidates instead of accepting the first model-like token, so measurements such as horsepower, amps, MPH, and CFM do not outrank real model identity.
- Brand matching removes explicit horsepower uses before interpreting `HP` as Hewlett-Packard. Genuine HP product names remain detectable, while titles such as `4.25 Peak HP` no longer create an HP brand identity.
- Compact query identity now supports mixed word-number series, descriptive product families, FEIN-style numeric-dash and word-number forms, and short brand-qualified family tokens such as `M18`. Meaningful series qualifiers are retained without restoring long retailer-title noise.
- Strong model tokens may provide exact-model confirmation. Family-only tokens require source-derived product-type/category agreement, and same-family model conflicts remain hard rejections. Query-derived text still cannot satisfy identity matching.
- Phase 5A's product-type conflict guard and all RR-058 regressions remain intact. Broader extraction improves query coverage only; it does not permit same-brand wrong-product evidence to attach.
- Verification: focused tests 183/183; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 660/660; eval red-flag checks clean. No live search ran.

**Phase 5C and RR-062 - price-trust restoration and product-scoped extraction**
- RR-002 is fixed. The price-trust path still uses class-sensitive sanity floors, but it now normalizes plural and wet/dry/shop-vac wording and includes conservative dash-camera and wireless-earbud full-product floors.
- A price below the applicable class floor yields `status: suspicious`, `price: null`, `canUseForBudget: false`, and `canBeExactWithBudget: false`. Asset enrichment rewrites the display to `Price not verified`, and reliability selection keeps the product out of exact Best Matches.
- The rule is deliberately bounded: the global absolute floor remains `$10`, a `$12.99` low-end wireless-earbud offer remains valid, and existing refrigerator, installment, conflicting-price, and specific text-price protections are unchanged.
- Saved pre-fix fixtures are immutable evidence and still replay their frozen bad result. Reassessing their product objects through current code changes all three `$10` examples to suspicious. Fresh `shop vac`, `dash cam`, and `wireless earbuds` runs produced no `$10` exact match.
- RR-062 is fixed. An unrelated same-page A139 `data-price="19999"` can no longer become VIOFO A229 evidence. Bare integers are not assumed to be cents; minor-unit conversion requires both product binding and an explicit unit marker.
- Saved-fixture reassessment removed `$19,999`. One fresh `dash cam` run verified VIOFO A229 Pro 2CH at `$349.99` from matching JSON-LD, with no malformed high verified price.
- Verification after RR-062: product-assets 20/20; focused tests 123/123; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 672/672; eval red-flag checks clean.

**Phase 5D - product-card eligibility cleanup**
- RR-007, RR-008, and RR-009 are fixed through the shared `productEligibility` layer used by Serper discovery and final citation filtering.
- Requested-category context now reaches both boundaries. Category-shaped manufacturer collections are rejected structurally, and Best Buy product-detail recognition is restricted to specific legacy and modern SKU URL shapes.
- Support, advice, learning-center, customer-service, manual, and semantic documentation-mirror pages are evidence-only. They may support a product, but cannot render as recommendation cards or be rescued as primary product citations.
- Valid manufacturer and merchant detail pages remain eligible. RR-062 price extraction, scoring, ranking, citation thresholds, source-upgrade identity, and product-type logic are unchanged.
- Verification: fail-first 5 assertions; focused 78/78; broad focused 192/192; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 678/678; eval clean. Three focused live checks ran; no full baseline.

**Phase 5E - product-type and requirement truthfulness**
- RR-017 and RR-043 are fixed for the confirmed substitution classes. The shared type registry now covers pressure-washer consumables/dishwashers, portable power stations, basketball wall art/accessories, backup cameras, and washer/dryer products in robot-vacuum requests.
- Candidate identity is distinct from broader source evidence for exclusive-complement checks. A wrong product title cannot borrow requested-type words from incidental snippets; sparse unknown products remain unverified rather than rejected.
- RR-055 is fixed. Literal provider/merchant identity satisfies generic feature requirements before comparative review prose, while assigned category, generated explanation text, and explicitly negated identity remain non-supporting.
- Discovery and revalidation use the same type verdict. Scoring, ranking, price trust, citation thresholds, source-upgrade identity, and page eligibility are unchanged.
- Verification: focused 83/83; broad safety matrix 314/314; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 684/684; eval clean.
- Four focused live calls ran. ZEP detergent disappeared after the final refinement, portable-generator results contained no power stations, and multiple products passed `Portable`.
- RR-007 reopened because `Pressure Washers - Best Buy` still rendered exact #7. The shop-vac customer-service candidate remained absent from final cards but survived citation verification before requirement filtering.

**Boundary after Phase 5E**
- Stop after the RR-007 regression cleanup. Do not start another phase without explicit instruction.
- Recommended next: Phase 5F for RR-022 citation retention only.

**RR-007 regression cleanup - nested catalog-page containment**
- Phase 5E exposed a remaining category-page shape: a Best Buy `pcmcat...c` catalog identifier nested beneath department and category path segments. Phase 5D's shallower route check missed it, and Serper's local helper still treated every Best Buy `/site/` route as product detail.
- The shared eligibility layer now recognizes nested catalog identifiers, generic department/browse routes, and faceted-listing parameters. Explicit known product-detail URL shapes remain eligible.
- Serper's Best Buy shortcut is restricted to the supported legacy `.p` and modern `/sku/` detail patterns, so discovery and final citation validation agree on the page shape.
- Fail-first proof covered shared eligibility, Serper normalization, and final citation filtering. Focused tests passed 177/177 across eligibility plus Phase 5E type/requirement behavior; full tests passed 686/686; eval was clean.
- One focused `pressure washer` run returned six exact products and one near product, all with specific product-detail primary URLs. The Best Buy category page was absent. A Craftsman collection remained secondary evidence only.
- RR-007 is Fixed. No scoring, ranking, citation threshold, price, product-type, requirement, source-upgrade identity, or UI behavior changed.

**Phase 5F - citation retention**
- RR-022 is Fixed. Citation verification now performs a targeted reachability pass for product-specific LLM URLs that are not already exactly provider- or Serper-verified.
- The final citation list promotes an exactly verified product page ahead of secondary editorial or same-host category evidence. A surviving weak citation can no longer suppress valid product-page retention.
- The retention path requires an explicit retailer detail route, model-bearing path, or distinctive final-slug/name agreement. Unknown manufacturer pages require exact reachability verification.
- Generic family slugs, categories, listings, support, manuals, documentation, unreachable URLs, and unrelated self-cites remain blocked. `/pro-plan/products/dog-food` is a deterministic negative; specific Purina and Hill's product slugs are positives.
- No RR-013 citation-strength scoring, ranking, price, product-type, source-upgrade identity, requirement, UI, or broad discovery behavior changed.
- Verification: fail-first 3 failures; focused 69/69; broad safety 282/282; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.
- Live proof: `electric toothbrush` retained all 28 pool candidates through citation verification. The initial `dog food` call exposed remaining product drops and a generic family card; the final guard covers those shapes deterministically but was not live-retested because the approved two-call cap was exhausted.

**Phase 5F dog-food live confirmation**
- One approved post-refinement `dog food` run moved six specific Purina/Hill's products through citation verification, confirming RR-022 live for this path. They were removed later by requirement filtering.
- The generic Purina `/pro-plan/products/dog-food` family card did not recur, so RR-007 remains Fixed.
- The run exposed a separate RR-008 recurrence: a BK Pets Substack editorial question page reached exact #5 because generic cross-host `/p/` handling treated the article route as product detail and the title was not recognized as editorial.
- No app behavior changed. Phase 5G did not start.

**RR-008 article-card cleanup**
- Shared eligibility now recognizes interrogative and editorial decision-title shapes before product-path shortcuts. Hosted publishing platforms remain evidence-only even when they use `/p/`.
- The rule is generalized and preserves valid retailer/manufacturer `/p/` products; it does not contain a BK Pets-specific exception.
- Deterministic proof covers shared eligibility, Serper discovery, and final citation validation. The single post-fix `dog food` run contained no BK Pets, Substack, newsletter, blog, or editorial final card.
- RR-008 is Fixed. RR-022 remains Fixed and Purina/Hill's products survived citation verification.
- The same run reopened RR-007 for Chewy `/brands/` family pages used as primary card URLs and opened RR-063 for same-brand wrong-recipe citations. Those issues were not fixed.

**Current boundary**
- Stop after the RR-008 cleanup. Do not start another phase without explicit instruction.
- Recommended next: address RR-007/RR-063 product-card and citation-identity safety. Phase 5G for RR-013 remains queued behind that decision.

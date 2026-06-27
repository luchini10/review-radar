# ReviewRadar Issues Report
## Compiled for AI Agent Consumption — Phase 0 through Phase 4D product-type diagnostics

**Generated:** 2026-06-27  
**Scope:** All phases from initial measurement harness through Phase 4D product-type leakage and requirement diagnostics
**Purpose:** Comprehensive defect register for an AI agent to triage, track, and act on

**Standing maintenance rule:** At the end of every ReviewRadar phase, append newly discovered issues to this file, update existing issue statuses in place when appropriate, and refresh every summary count. This file is the single issue-tracking source of truth.

---

## Summary

| Metric | Count |
|--------|-------|
| Total Issues | 55 |
| Critical | 5 |
| High | 26 |
| Medium | 19 |
| Low | 5 |
| Open | 7 |
| Needs Investigation | 11 |
| Fixed | 36 |
| Won't Fix | 1 |

### Issues by Phase

| Phase | Count |
|-------|-------|
| Pre-Phase 0 / Codex baseline (2026-06-20 – 2026-06-22) | 13 |
| Phase 0 — Measurement harness | 2 |
| Phase 0 / Hardening Plan | 5 |
| Phase 1 — Source-tiered discovery | 3 |
| Phase 2 — Replay fixtures | 1 |
| Phase 3A — Requirement-filter diagnostics | 3 |
| Phase 3B — Wrong-type vacuum contamination | 3 |
| Phase 3C — Fuel-type alias expansion | 1 |
| Phase 3D — Final-selection trace | 0 |
| Phase 3E — Source-quality upgrade mechanism | 4 |
| Phase 3F — Trigger loosening | 2 |
| Phase 3G — Upgrade diagnostics | 1 |
| Phase 3H — Long-query diagnostic | 1 |
| Phase 3I — Concise source-upgrade query | 1 |
| Phase 3J — Focused live proof | 1 |
| Phase 3J extension — Trigger-producing categories | 0 |
| Phase 3K — Fallback ladder implementation | 0 |
| Phase 3L — Fallback live proof | 1 |
| Phase 3M — Raw Serper and query-identity diagnostic | 4 |
| Phase 3N — Shopping-offer/title eligibility fixes | 1 |
| Phase 3O — Brand-preserving query live proof | 2 |
| RR-053 — URL-query identity safety fix | 0 |
| Phase 4A — Diagnostic issue-harvest setup | 0 |
| Phase 4B — Source-upgrade safety/reliability diagnostics | 0 |
| Phase 4C — Price trust and fake-low price diagnostics | 0 |
| Phase 4D — Product-type/requirement diagnostics | 2 |
| Cross-phase / Infrastructure | 4 |

---

## Issues by Phase

---

### PRE-PHASE 0 / CODEX BASELINE (2026-06-20 – 2026-06-22)

---

#### RR-001

| Field | Value |
|-------|-------|
| **ID** | RR-001 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Critical |
| **Title** | Fake-low full-size refrigerator prices treated as verified |
| **Status** | Fixed |

**Description:** A full-size French-door refrigerator showing a promo/add-on price of `$515` was treated as a verified full-product price and ranked as an exact Best Match for a `$2,500` refrigerator search, even though a real French-door unit costs $1,500+.

**Where it occurs:** `lib/productPriceTrust.ts` — price confidence classification; budget eligibility check

**Expected:** A `$515` price for a French-door/side-by-side refrigerator is flagged as `suspicious` and the product cannot reach exact match status.

**Actual:** Price passed as `verified`, product appeared as exact Best Match.

**Fix:** Raised the suspicious-price floor for full-size refrigerator contexts (French-door, side-by-side, top-freezer, bottom-freezer, counter-depth) while keeping compact/mini fridges exempt.

---

#### RR-002

| Field | Value |
|-------|-------|
| **ID** | RR-002 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Critical |
| **Title** | Tiny accessory/promo prices treated as verified full-product prices |
| **Status** | Needs Investigation |

**Description:** Products like air purifiers, cordless drills, vacuums, and office chairs could have `$10` or similarly tiny prices treated as verified full-product prices. An accessory listing price, promotional add-on, or variant price was being accepted without a sanity floor for the product class.

**Where it occurs:** `lib/productPriceTrust.ts`

**Expected:** A `$10` price for a cordless drill is flagged `suspicious`. Product cannot be an exact Best Match.

**Actual:** Tiny prices passed as verified; products ranked as exact matches.

**Fix:** Added a `suspicious` price confidence state and product-class-specific sanity floors. Suspicious-price products are blocked from exact match status.

**Phase 3O live-proof regression:** The focused `shop vac` fixture returned `Amazon.com: RIDGID Wet Dry Vacuums VAC1200...` with a `$10` retailer-page offer. Final-selection trace recorded `priceTrustStatus: verified`, `canUseForBudget: true`, and selected the product as exact rank #5. RR-002 is reopened pending a general price-trust investigation; no fix was attempted during the diagnostic.

**Phase 4C reproducibility confirmation:** A fresh independent `shop vac` run reproduced the same defect on a different product. `Vacmaster 1.5-Gallon Wet/Dry Vac - Amazon.com` received a `$10` `retailer_page` offer from its Amazon product URL, `priceTrustStatus: verified`, and `canUseForBudget: true`, then reached exact rank #7. No budget was supplied, so the run proves unsafe trust and exact eligibility but cannot quantify a budget-specific rank boost. The recurrence across RIDGID and Vacmaster establishes a general full-product price-sanity gap rather than a single listing anomaly.

---

#### RR-003

| Field | Value |
|-------|-------|
| **ID** | RR-003 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Monthly payment/installment amounts parsed as full product prices |
| **Status** | Fixed |

**Description:** For products sold with financing, a monthly installment amount (e.g., `$35/mo`) was being parsed and used as if it were the full product price. A `$35` monthly payment for a $600 travel system would pass budget checks for a $100 budget search.

**Where it occurs:** `lib/productPriceTrust.ts` — price parsing / confidence classification

**Expected:** Payment-plan amounts are not treated as the full purchase price.

**Actual:** Monthly amounts accepted as verified full prices.

**Fix:** Price parsing now detects installment/payment patterns and excludes them from full-product price confidence.

---

#### RR-004

| Field | Value |
|-------|-------|
| **ID** | RR-004 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Gaming/racing chairs appearing as exact matches for office chair searches |
| **Status** | Fixed |

**Description:** Gaming chairs and racing-style chairs were appearing as exact Best Matches for "office chair" searches. The avoid-term handling was insufficient — `not a gaming chair` in important details was not reliably rejecting gaming/racing chair products, especially when the product title also included "office chair."

**Where it occurs:** `lib/productTypeMatch.ts`, `lib/requirementValidation.ts` — product-type conflict rules

**Expected:** Gaming/racing chairs rejected from office chair exact and near matches.

**Actual:** Gaming chairs could appear as exact matches.

**Fix:** Moved cross-category wrong-type conflict rules into shared `lib/productTypeMatch.ts`; discovery now rejects them earlier. Strengthened avoid-term handling for gaming/racing chair patterns.

---

#### RR-005

| Field | Value |
|-------|-------|
| **ID** | RR-005 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Cooktops appearing as exact matches for oven/range searches |
| **Status** | Fixed |

**Description:** A cooktop (countertop/built-in induction or gas surface unit) is a different product class than an oven or range. Cooktops were surviving the product-type filter and appearing as exact matches for "toaster oven" and general "oven" searches.

**Where it occurs:** `lib/productTypeMatch.ts`, discovery filter (`lib/search/serper.ts`)

**Expected:** Cooktops are not returned as exact matches for oven/range searches unless the user explicitly asks for a cooktop.

**Actual:** Cooktops could appear as exact or near matches.

**Fix:** `isCooktopOnlyForOvenSearch` rule added; product-type conflict rules applied at discovery via shared `lib/productTypeMatch.ts`.

---

#### RR-006

| Field | Value |
|-------|-------|
| **ID** | RR-006 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Wrong-length products appearing for explicit length searches |
| **Status** | Fixed |

**Description:** A 50-ft garden hose appeared as an exact Best Match for a "100-ft garden hose" search. Explicit length in the query was not enforced as a hard constraint at discovery; candidates with conflicting length evidence survived to ranking.

**Where it occurs:** Discovery filter (`lib/search/serper.ts`), `lib/specExtraction.ts`

**Expected:** A 50-ft hose is rejected or heavily demoted for a 100-ft search. Exact length is treated as a hard constraint.

**Actual:** 50-ft hose appeared as exact match.

**Fix:** Treated plain length requests as exact constraints; added early discovery filtering for exact length conflicts when evidence is clear.

---

#### RR-007

| Field | Value |
|-------|-------|
| **ID** | RR-007 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | eBay browse/category pages appearing as exact product matches |
| **Status** | Needs Investigation |

**Description:** eBay browse and category pages (URLs matching `/t/`, `/b/`, `/sch/` patterns) were passing the product eligibility check and appearing as exact product recommendations. These are listing pages, not individual product pages.

**Where it occurs:** `lib/productEligibility.ts` — product page eligibility classifier

**Expected:** eBay browse/category/search pages are blocked from rendering as product cards.

**Actual:** eBay "Best … Cleaners" browse page appeared as a wet/dry-vac exact match.

**Fix:** Product eligibility classifier now explicitly blocks eBay browse/category URL shapes.

**Phase 4B regression:** Reopened. The fresh `gas grill` fixture selected `Gas Outdoor BBQ Grills Made in the USA - MHP Grills` at exact rank #6. Its only citation is `https://mhpgrills.com/products/grills`, a product collection rather than a specific product page. The original eBay URL patterns remain fixed, but the general category/listing-page class is not contained across hosts.

**Phase 4C evidence:** `Pressure Washers - Best Buy` survived into the exact-scored stream below the final cutoff. It was not selected, but confirms that generic retailer category pages can still pass far enough to consume ranking slots.

**Phase 4D evidence:** Category/collection pages were selected across two more categories: `Air Purifiers, Ventilators & Monitors for Clean Air - Daikin Comfort` exact rank #5, `Portable Generators for RV, Home, and Projects` exact rank #5, and `Portable Generators - Briggs & Stratton` exact rank #7.

---

#### RR-008

| Field | Value |
|-------|-------|
| **ID** | RR-008 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Review/article titles appearing as product cards |
| **Status** | Needs Investigation |

**Description:** Pages with titles like "Runner's World: Nike Winflo 11 Review" or "7 Things to Avoid When Purchasing…" were passing eligibility and appearing as product cards in results.

**Where it occurs:** `lib/productEligibility.ts`

**Expected:** Review articles, buying-advice articles, and editorial pages are used as evidence only, never as product cards.

**Actual:** These pages appeared as recommendations.

**Fix:** Shared product-eligibility classifier now blocks article/review/buying-advice page shapes. Buying-advice page filter added as a reusable helper.

**Phase 4B regression:** Reopened. The fresh `shop vac` fixture selected `Garage Pro® Wet/Dry Vac | No / Low Suction - bissell support` at exact rank #6. The product URL and only citation point to `support.bissell.com/app/answers/...`, a troubleshooting article rather than a product offer. Review/buying-advice patterns remain covered, but support/troubleshooting pages are still eligible as product cards.

**Phase 4C evidence:** `Are Power Washers and Pressure Washers Different? - Best Buy` reached exact rank #6, and `12 common drilling problems and how to avoid them - Euromarc` survived into the cordless-drill near stream. This confirms the regression across support, retailer-learning, and general advice pages.

---

#### RR-009

| Field | Value |
|-------|-------|
| **ID** | RR-009 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Manual/quick-start guide pages appearing as close-match product cards |
| **Status** | Needs Investigation |

**Description:** Product manual and quick-start guide pages (e.g., "Breville BOV845BSS Quick Guide") were appearing as close-match product cards for toaster oven searches. These are support/documentation pages, not product listings.

**Where it occurs:** `lib/productEligibility.ts`

**Expected:** Manual and quick-start guide pages are blocked from appearing as product cards.

**Actual:** Manual pages appeared as close matches.

**Fix:** Manual and quick-start guide URL/title patterns added to the non-product-page blocklist.

**Phase 4D regression:** Reopened. `H7123 - Smart Pet Air Purifier - device.report` reached exact rank #4 for `air purifier`. `device.report/govee/h7123` is a documentation/device-information page rather than a merchant or manufacturer product offer. The original explicit manual-title patterns remain fixed, but documentation mirrors can still become exact product cards.

---

#### RR-010

| Field | Value |
|-------|-------|
| **ID** | RR-010 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Medium |
| **Title** | Same-model variant de-duplication collapsing different-size products |
| **Status** | Fixed |

**Description:** The duplicate-product detection was merging products of the same model but different sizes (e.g., different storage capacities, mattress sizes) into a single card because the dedup key only included brand/model, not size variant. This caused "only 3 exact matches" scenarios when distinct size variants should have been separate results.

**Where it occurs:** Deduplication / variant-family key logic in recommendation pipeline

**Expected:** Different-size variants of the same model appear as separate product cards when size is relevant to the search.

**Actual:** Different sizes merged into one card, reducing result count.

**Fix:** Dedup key now includes size signal; size-aware variant family key implemented.

---

#### RR-011

| Field | Value |
|-------|-------|
| **ID** | RR-011 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Medium |
| **Title** | Brand alternative phrases ("Sony or Bose") not parsed as brand filters |
| **Status** | Fixed |

**Description:** When a user specified brand alternatives in important details (e.g., "Sony or Bose", "DeWalt or Milwaukee"), the parser treated these as "needs review" free text instead of recognizing them as explicit brand constraints. Products from unlisted brands could then be returned as exact matches.

**Where it occurs:** Important-details parser / requirement extraction

**Expected:** "Sony or Bose" is parsed as a brand-alternatives constraint; only Sony, Bose, or equivalent-line products qualify as exact matches.

**Actual:** Phrase treated as generic text; non-qualifying brands could appear as exact matches.

**Fix:** Important-details parsing improved to detect brand-alternative `X or Y` patterns and register them as brand constraints.

---

#### RR-012

| Field | Value |
|-------|-------|
| **ID** | RR-012 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Low |
| **Title** | Raw schema.org availability labels shown to users |
| **Status** | Fixed |

**Description:** Product cards displayed raw schema.org token values (`InStock`, `OutOfStock`, `LimitedAvailability`) instead of human-readable labels ("In stock", "Out of stock", "Limited availability").

**Where it occurs:** `lib/productCardViewModel.ts` — display rendering

**Expected:** Human-readable availability labels are shown.

**Actual:** Raw schema.org token strings shown directly to users.

**Fix:** Mapping from schema.org token → human label added in `lib/productCardViewModel.ts`.

---

#### RR-013

| Field | Value |
|-------|-------|
| **ID** | RR-013 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | Medium |
| **Title** | Thin winner crowd-out — self-cited-only product ranks #1 above independently-sourced alternatives |
| **Status** | Needs Investigation |

**Description:** After the product-page citation rescue was added (RR-029), a product with only one citation (its own product page, via the rescue path) can pass citation verification and potentially rank #1. If that product has a verified price and non-weak source consensus, it will crowd out independently-supported alternatives with real editorial or retailer citations. This is the "thin winner" scenario.

**Where it occurs:** `lib/recommendationScoring.ts` — scoring; `lib/recommendationResultValidation.ts` — citation-strength classification; `scripts/citationStrengthDiagnostic.mjs` — detects and flags this

**Steps to reproduce:** Run a search that returns a product with only one citation (product-page-self) at #1 while position #2–3 have `independent-editorial` citations. The replay script will flag `thinWinner: true` and `betterSupportedBelowWinner` non-empty.

**Expected:** Citation strength (editorial > retailer > self-only) factors into final ranking so a self-cited-only product does not crowd out independently-supported alternatives.

**Actual:** Citation strength does not yet affect scoring weights; thin winner can rank #1 indefinitely.

**Suggested fix:** Incorporate `citation_type` into the ranking score — e.g., a small bonus for `independent-editorial` citations and a small penalty for `SELF-ONLY` citation strength. Do not change the hard trust gates, only the ranking nudge.

**Phase 4B evidence:** The fresh `robot vacuum` replay flagged a retailer-only winner (`Shark ION ... S87`) and the `gas grill` replay flagged another retailer-only winner (`Go-Anywhere 1-Burner ...`). Neither run supplied independent editorial support for the winner. This broadens the observed weak-winner pattern beyond self-only citations; status remains Needs Investigation pending the dedicated Phase 4E comparison of stronger products below each winner.

**Phase 4C evidence:** All three replays flagged weak or retailer-only winners: STANLEY SL18125P-1 (`shop vac`), DEWALT DCD771C2 (`cordless drill`), and RYOBI RY141803 (`pressure washer`). Phase 4E still needs to establish whether clearly better-supported products were available below each winner.

**Phase 4D evidence:** Fresh `robot vacuum`, `air purifier`, and `portable generator` runs again selected weakly supported winners. `basketball hoop` also had only weak citations at the top, although replay did not identify a better-supported product below it.

---

### PHASE 0 — QUALITY MEASUREMENT HARNESS (2026-06-23)

---

#### RR-014

| Field | Value |
|-------|-------|
| **ID** | RR-014 |
| **Phase** | Phase 0 — Measurement |
| **Severity** | High |
| **Title** | Mean core-leader coverage critically low (3.0 / 7 in final results) |
| **Status** | Fixed |

**Description:** The Phase 0 quality baseline revealed that across 14 gold-benchmark queries, core leaders (the expected top products per category) appeared in the final-7 results only 3.0 out of 7 times on average. Leaders were reaching the candidate pool (4.2/7 average) but being eliminated between pool and final result.

**Where it occurs:** Pipeline-wide; confirmed in discovery (extractSeedProductNames), citation-verify filter, and ranking stages

**Expected:** Mean core-leader coverage ≥ 5/7 in final results across broad queries.

**Actual:** 3.0/7 — less than half of expected leaders appeared.

**Fix:** Addressed in multiple phases: Phase 1 (seed extraction for brand-led names), Filtering STEP 2 (citation rescue for product-page leaders), Phase 3B (3-state category check), Phase 3C (fuel-type aliases).

---

#### RR-015

| Field | Value |
|-------|-------|
| **ID** | RR-015 |
| **Phase** | Phase 0 — Measurement |
| **Severity** | High |
| **Title** | Run-to-run stability ~19% — same query returns different products ~81% of the time |
| **Status** | Needs Investigation |

**Description:** The consistency harness (`qualityConsistencyHarness.mjs`) measured run-to-run stability at approximately 19%. The same query returns different products in roughly 81% of runs. This makes before/after measurement of pipeline changes unreliable for improvements smaller than ~1.5 mean core leaders.

**Where it occurs:** LLM prompt / OpenAI API temperature; Serper result ordering; discovery strategy randomness

**Steps to reproduce:** Run `node scripts/qualityConsistencyHarness.mjs` twice for the same query and compare product names in the final-7.

**Expected:** ≥ 60% run-to-run stability for the same query (the same 4+ of 7 products appear).

**Actual:** ~19% stability — entire product slate changes between runs.

**Suggested fix:** Investigate LLM temperature reduction; deterministic query ordering; pinning the candidate pool via the replay fixture system before introducing scoring changes; seed-name deduplication to stabilize the discovery pool.

---

### PHASE 0 / HARDENING PLAN (2026-06-21)

---

#### RR-016

| Field | Value |
|-------|-------|
| **ID** | RR-016 |
| **Phase** | Phase 0 — Hardening Plan |
| **Severity** | Critical |
| **Title** | Budget searches return 0 exact matches when product prices are text-only |
| **Status** | Fixed |

**Description:** A product priced only via recommendation prose (no structured retailer offer from Serper) could never pass the budget check to become an exact Best Match, even when the text clearly stated a specific, plausible price well under the user's budget. A "shop vac / $400" search returned 0 exact matches despite clearly in-budget products being present.

**Where it occurs:** `lib/productPriceTrust.ts` — budget eligibility gate

**Steps to reproduce:** Search for `shop vac` with a `$400` budget. Products with only a text price like "$79.99" in `estimated_price_range` returned as near matches, not exact matches.

**Expected:** A specific, plausible text price counts toward budget eligibility while flagged "needs verification" on the card.

**Actual:** 0 exact matches returned; all products demoted to near match regardless of text price.

**Fix:** Specific, plausible text prices now contribute to budget eligibility. Vague ranges, suspicious amounts, and financing prices remain excluded.

---

#### RR-017

| Field | Value |
|-------|-------|
| **ID** | RR-017 |
| **Phase** | Phase 0 — Hardening Plan |
| **Severity** | High |
| **Title** | Cross-category wrong-type products carried through to ranking (discovery-only check missing) |
| **Status** | Needs Investigation |

**Description:** The cross-category product-type conflict rules (e.g., washing machine for a pressure-washer search, ottoman for a sofa search, gaming chair for an office-chair search) were only applied at the validation stage, not at discovery. Wrong-type candidates populated the candidate pool and consumed ranking budget.

**Where it occurs:** Discovery filter (`lib/search/serper.ts`), `lib/productTypeMatch.ts`

**Expected:** Obvious wrong-type candidates (e.g., a washing machine for a pressure-washer query) are rejected at discovery, not carried to ranking.

**Actual:** Wrong-type products were filtered only at validation; they took up space in the discovery pool.

**Fix:** Shared `lib/productTypeMatch.ts` wired into discovery; conflict rules applied early.

**Phase 4B regression:** Reopened. A GE Profile washer/dryer entered the `robot vacuum` candidate pool, was demoted to near, then reappeared after revalidation. A Thermador 36-inch gas range/PDF entered the `gas grill` pool, reached source upgrade, received a matching `$7,949` Google Shopping range offer plus citation, and remained in the scored near stream. Neither wrong-type target reached the final seven, but both consumed downstream validation/enrichment work and the range consumed a source-upgrade call.

**Phase 4C evidence:** The `pressure washer` run selected `ZEP 64 oz. All-In-One Pressure Wash` detergent at exact rank #2 and carried six Viking dishwashers into the near stream after revalidation. The detergent is a consumable/accessory, not a pressure washer. This is a direct final-result wrong-type failure; the dishwashers show broader downstream contamination.

**Phase 4D evidence:** Wrong-type leakage generalized. The GE washer/dryer again survived into the final robot-vacuum near stream. Basketball wall art entered the exact-scored hoop pool. BioLite BaseCharge power station reached exact rank #6 for `portable generator`, with Goal Zero and EcoFlow power stations also exact-scored below cutoff.

---

#### RR-018

| Field | Value |
|-------|-------|
| **ID** | RR-018 |
| **Phase** | Phase 0 — Hardening Plan |
| **Severity** | High |
| **Title** | Credibility penalized 3–4× for the same signal (~−58 in ranked-match score) |
| **Status** | Fixed |

**Description:** A product with weak credibility (few reviews, few sources) was charged 3–4 separate score penalties for the same underlying weakness, producing a combined penalty of approximately −58 in `rankedMatchScore`. This was burying legitimate budget/niche picks far below the visible cut even when they met all hard requirements.

**Where it occurs:** `lib/recommendationScoring.ts` — credibility penalty calculation

**Expected:** Credibility weakness charges one penalty once. Multiple signals for the same weakness do not stack.

**Actual:** 3–4× stacking for the same signal; legitimate products invisible.

**Fix:** Credibility charged once per score. Dead `riskPenalty` (computed but never applied) removed.

---

#### RR-019

| Field | Value |
|-------|-------|
| **ID** | RR-019 |
| **Phase** | Phase 0 — Hardening Plan |
| **Severity** | Medium |
| **Title** | Evidence rescue shopping search used descriptive phrase instead of product identity |
| **Status** | Fixed |

**Description:** The evidence-rescue pass that finds a structured price for products with only a text price was searching for `"current price"` on Google Shopping, which is noise for a shopping engine. This produced low shopping-match rates.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `buildRescueShoppingQuery`

**Expected:** Rescue pass searches product identity (name + category) to find the same product on a shopping page.

**Actual:** Searched the generic phrase "current price" — irrelevant to a shopping engine.

**Fix:** `buildRescueShoppingQuery` now constructs a product-identity query from the product name and category.

---

#### RR-020

| Field | Value |
|-------|-------|
| **ID** | RR-020 |
| **Phase** | Phase 0 — Hardening Plan |
| **Severity** | Medium |
| **Title** | Rubric matcher used substring matching, inflating rubric scores |
| **Status** | Fixed |

**Description:** The buying-rubric ranking nudge matched substrings, so "grip" matched "gripped" and "trail" matched "trailer" — false positives that inflated a product's rubric score and could unfairly nudge it upward.

**Where it occurs:** Rubric matching logic in `lib/recommendationScoring.ts` (or rubric evaluation helper)

**Expected:** Rubric matching uses whole-word/phrase matching only.

**Actual:** Substring matching produced false positives.

**Fix:** Rubric matcher now uses whole-word matching.

---

### PHASE 1 — SOURCE-TIERED DISCOVERY (2026-06-23)

---

#### RR-021

| Field | Value |
|-------|-------|
| **ID** | RR-021 |
| **Phase** | Phase 1 — Source-tiered discovery |
| **Severity** | High |
| **Title** | `extractSeedProductNames` discards brand-led names without model numbers |
| **Status** | Fixed |

**Description:** The old seed-name extractor required a model-number-bearing token (e.g., "RT1200", "S8") and discarded brand-led names without explicit model numbers. Products known only by brand + product-line name (Coway Airmega, Herman Miller Aeron, Shark Matrix) were never seeded, reducing discovery coverage for popular editorial leaders.

**Where it occurs:** `lib/search/serper.ts` — `extractSeedProductNames`

**Expected:** Brand-led proper-noun names (≥2 word tokens, dict-free) are accepted as valid seeds even without a model number.

**Actual:** Seeds containing only brand + line name (no model token) were discarded.

**Fix:** `extractSeedProductNames` now also accepts brand-led proper-noun names; mines Tier-1 editorial sources first; rejects category-only/source-name/year-led/multi-brand-mash title runs.

---

#### RR-022

| Field | Value |
|-------|-------|
| **ID** | RR-022 |
| **Phase** | Phase 1 — Source-tiered discovery |
| **Severity** | High |
| **Title** | Real product-page leaders dropped at citation-verify stage (LLM-path products) |
| **Status** | Fixed |

**Description:** Products that arrived via the LLM/web_search path (not the auto-verified Serper path) had their citation URLs absent from the verified-URL set. When `filterResultToVerifiedCitations` ran, it found no verified citations for these products and removed them entirely — even when those products were major market leaders. RIDGID RT1200, Craftsman CMEC6150K, and Roborock S8 MaxV Ultra were all lost at this stage.

**Where it occurs:** `lib/recommendationResultValidation.ts` — `filterResultToVerifiedCitations`

**Steps to reproduce:** Run any search; check `debug.stageFunnel`. Find leaders present in `candidatePool` that disappear at `afterCitationVerify`. These are LLM-path products without verified URLs.

**Expected:** LLM-path products with valid product pages survive citation verify if their own product URL passes eligibility.

**Actual:** LLM-path products with zero pre-verified URLs were completely removed.

**Fix:** Product-page rescue added: when no citations are pre-verified, self-cite the product's own page if it passes `canRenderAsProductCard` eligibility. URL normalization also improved (tracking params stripped, trailing slash dropped) to improve pre-verified URL matching.

---

#### RR-023

| Field | Value |
|-------|-------|
| **ID** | RR-023 |
| **Phase** | Phase 1 — Source-tiered discovery |
| **Severity** | Medium |
| **Title** | URL normalization too strict — tracking params and trailing slashes cause verification mismatches |
| **Status** | Fixed |

**Description:** The same underlying product page URL (e.g., `https://ridgid.com/us/en/vacuums/rt1200` and `https://ridgid.com/us/en/vacuums/rt1200?utm_source=google`) was not recognized as the same URL during citation verification because tracking parameters and trailing slashes were not stripped before comparison.

**Where it occurs:** URL normalization in `lib/recommendationResultValidation.ts`

**Expected:** URLs differing only in tracking params (`utm_*`, affiliate tokens) or trailing slash are treated as identical for verification purposes.

**Actual:** Slight URL variations caused false "not verified" results.

**Fix:** URL normalizer now lowercases host, strips a curated tracking/affiliate param set, sorts remaining params, drops trailing slash.

---

### PHASE 2 — REPLAY FIXTURES / DETERMINISTIC TESTING (2026-06-24)

---

#### RR-024

| Field | Value |
|-------|-------|
| **ID** | RR-024 |
| **Phase** | Phase 2 — Replay fixtures |
| **Severity** | Low |
| **Title** | Live fixture staleness — old fixtures lack new debug fields |
| **Status** | Won't Fix |

**Description:** When new debug fields are added to the pipeline (e.g., Phase 3G's `candidatesReturned`, `noMatchReason`), previously saved `.json` fixtures do not contain those fields. Replaying old fixtures produces incomplete diagnostic output.

**Where it occurs:** `tests/fixtures/review-radar-live/` — all pre-existing fixtures; `scripts/replay-quality-fixtures.mjs` — display layer

**Expected:** Replay either re-fetches stale fixtures automatically or clearly warns the user which fields are missing.

**Actual:** Missing fields silently produce no output for the new diagnostic sections. Graceful degradation exists (Phase 3G added `if (t.candidatesReturned !== undefined)` guards) but the user must know to re-save fixtures.

**Note:** This is intentional by design — fixtures are frozen live snapshots. Graceful degradation guards are the accepted pattern. New fixtures must be manually saved via `node scripts/save-debug-fixture.mjs "<query>"`.

**Suggested fix or next action:** No behavior change planned. Continue adding graceful replay guards for new fields and refresh only the focused fixtures needed by each phase.

---

### PHASE 3A — REQUIREMENT-FILTER DIAGNOSTICS (2026-06-24)

---

#### RR-025

| Field | Value |
|-------|-------|
| **ID** | RR-025 |
| **Phase** | Phase 3A |
| **Severity** | Medium |
| **Title** | `afterRequirementFilter` stage tracked only exact matches, not near matches |
| **Status** | Fixed |

**Description:** The stage funnel's `afterRequirementFilter` stage only counted exact matches, making constrained queries appear to return "0 products" at that stage when all products had been legitimately demoted to near-match status (e.g., unknown budget = unverified price). This masked the distinction between "all products dropped" and "all products are valid near matches."

**Where it occurs:** `lib/recommendationFunnel.ts` — stage-funnel tracking; `afterRequirementFilter` stage definition

**Expected:** `afterRequirementFilter` stage tracks both `names` (exact) and `near` (near-match) arrays.

**Actual:** `near` array was absent; near-match products showed as dropped.

**Fix:** Added `near:` field to the `afterRequirementFilter` stage in the funnel tracker.

---

#### RR-026

| Field | Value |
|-------|-------|
| **ID** | RR-026 |
| **Phase** | Phase 3A |
| **Severity** | High |
| **Title** | Spec direction poisoning — "under $600 4-burner" extracted burner spec as `max` (wrong direction) |
| **Status** | Fixed |

**Description:** The spec extractor's 28-character preWindow before "4-burner" in the phrase "gas grill under $600 4-burner" captured the word "under" from the preceding price constraint. The direction-detection logic interpreted "under" as applying to the burner count, extracting `{operator: "max", value: 4}` instead of `{operator: "min", value: 4}` (the user wants a 4-burner grill, not at most 4 burners).

**Where it occurs:** `lib/specExtraction.ts` — preWindow direction detection

**Steps to reproduce:** Parse the query `"gas grill under $600 4-burner"` with `extractSpecsFromText`. The "burner" spec returns `operator: "max"` instead of `operator: "min"`.

**Expected:** The "under $600" direction word does not bleed into the burner spec's preWindow. Burner count extracted as `{operator: "min", value: 4}` (4-burner or more).

**Actual:** `{operator: "max", value: 4}` — products with 4+ burners rejected.

**Fix:** `DIRECTION_WORD\s+\$price` patterns stripped from preWindow before direction detection.

---

#### RR-027

| Field | Value |
|-------|-------|
| **ID** | RR-027 |
| **Phase** | Phase 3A |
| **Severity** | Low |
| **Title** | Spec label "under N" incorrect for `max` (≤) operator |
| **Status** | Fixed |

**Description:** When a spec was extracted with `operator: "max"` (meaning the value must be ≤ N), the display label was rendered as "under N" which implies strict inequality (`< N`). The actual evaluation is `<= N`.

**Where it occurs:** Spec label generation in the requirement display layer

**Expected:** `operator: "max"` labeled as "at most N."

**Actual:** Labeled "under N" — technically incorrect.

**Fix:** Label changed from "under N" to "at most N" for `operator: "max"`.

---

### PHASE 3B — WRONG-TYPE VACUUM CONTAMINATION (2026-06-24)

---

#### RR-028

| Field | Value |
|-------|-------|
| **ID** | RR-028 |
| **Phase** | Phase 3B |
| **Severity** | Critical |
| **Title** | No `robot_vacuum` product-type rule — wet/dry vacs and stick vacuums appearing as exact robot vacuum matches |
| **Status** | Fixed |

**Description:** `PRODUCT_TYPE_RULES` had no `robot_vacuum` entry. For robot vacuum queries, `classifyProductTypeIntent` returned `{requestedType: null}`, which caused the system to fall through to a loose category-term check that trusted the LLM's potentially mislabeled `product.category` field. Wet/dry vacs, stick vacuums, canister vacuums, and handheld vacuums all appeared as exact matches for "best robot vacuum" searches.

**Where it occurs:** `lib/productTypeIntent.ts` — `PRODUCT_TYPE_RULES`; `lib/requirementValidation.ts` — `classifyProductTypeIntent`

**Steps to reproduce:** Search "best robot vacuum". Products named "Milwaukee M18 Wet/Dry Vac", "ONE+ Hand Vacuum", "Shark Rocket Stick Vacuum" appear as exact Best Matches.

**Expected:** Only products that positively confirm they are self-propelled robot vacuums appear as exact matches.

**Actual:** Multiple non-robot vacuum types appeared as exact Best Matches.

**Fix:** Added `robot_vacuum` rule to `PRODUCT_TYPE_RULES` with `blocked` pattern covering stick/canister/hand/wet-dry/upright/shop-vac vacuums and `allowed` pattern requiring explicit robot-type signals.

---

#### RR-029

| Field | Value |
|-------|-------|
| **ID** | RR-029 |
| **Phase** | Phase 3B |
| **Severity** | Medium |
| **Title** | `allowedCheckText` only used product name — sparse-name robots unverifiable |
| **Status** | Fixed |

**Description:** The `allowed` pattern check in `classifyProductTypeIntent` only searched the product name field. Sparse-named robot vacuums like "Roborock S8 MaxV Ultra" don't contain explicit type signals in the name alone, but the `why_recommended` field clearly states "flagship robot vacuum and mop." Without checking evidence and narrative text, valid robot vacuums were incorrectly marked as unverified type.

**Where it occurs:** `lib/requirementValidation.ts` — `classifyProductTypeIntent`, `allowedCheckText` parameter

**Expected:** `allowed` pattern check uses name + evidence + `why_recommended` to confirm type for sparse-name products.

**Actual:** Only product name was checked; sparse-name robots couldn't confirm type.

**Fix:** New `allowedCheckText` parameter in `classifyProductTypeIntent` allows passing richer text (evidence + `why_recommended`) for the `allowed` check while keeping the `blocked` check on a separate text source.

---

#### RR-030

| Field | Value |
|-------|-------|
| **ID** | RR-030 |
| **Phase** | Phase 3B |
| **Severity** | High |
| **Title** | `checkCategory` boolean, not 3-state — unverified product type excluded entirely |
| **Status** | Fixed |

**Description:** `checkCategory` in `requirementValidation.ts` was boolean (`true`/`false`). When a product's type could not be confirmed from evidence but was also not confirmed wrong (sparse evidence), the function returned `false`, which caused the product to land in `missingRequirements` and be excluded from both exact and near matches. The correct behavior per design spec is that unverified type → near match with "Needs verification" label.

**Where it occurs:** `lib/requirementValidation.ts` — `checkCategory` return type

**Expected:** Returns `"pass" | "fail" | "unverified"`. `"unverified"` → near match with verification label; `"fail"` (confirmed wrong type) → excluded from both.

**Actual:** Boolean `false` for both fail and unverified — unverified products incorrectly excluded.

**Fix:** `checkCategory` changed to 3-state return: `"pass"` | `"fail"` | `"unverified"`. `"unverified"` → `unknownRequirements` → near match.

---

### PHASE 3C — FUEL-TYPE ALIAS EXPANSION (2026-06-25)

---

#### RR-031

| Field | Value |
|-------|-------|
| **ID** | RR-031 |
| **Phase** | Phase 3C |
| **Severity** | High |
| **Title** | Propane/natural-gas grills failing gas-grill category check |
| **Status** | Fixed |

**Description:** `checkCategory` used raw query words ("gas", "grill") to verify product type. A product described only as "propane grill" or "natural gas grill" does not contain the word "gas" as a standalone token in all naming patterns. Such products landed in `unknownRequirements`, were excluded from the exact-match pool, and dropped when 7 exact matches already existed from other products.

**Where it occurs:** `lib/requirementValidation.ts` — `categoryTerms()`, `checkCategory()`

**Steps to reproduce:** Search "gas grill". Products named "Napoleon Rogue XT 425 SIB Propane Grill" or products whose evidence only says "propane" may fail the category check.

**Expected:** "propane grill" and "natural gas grill" products pass the gas grill category check because "propane" and "natural gas" are semantic equivalents of "gas" for this category.

**Actual:** Products described only as "propane" fail the "gas" category term check.

**Fix:** `categoryTerms()` now accepts `extractedRequirements` and expands each term group with aliases from any `requiredConstraint` whose value or aliases match that term. For "gas grill", the "gas" requirement carries aliases including "propane" and "natural gas."

---

### PHASE 3E — SOURCE-QUALITY UPGRADE MECHANISM (2026-06-25)

---

#### RR-032

| Field | Value |
|-------|-------|
| **ID** | RR-032 |
| **Phase** | Phase 3E |
| **Severity** | High |
| **Title** | `upgradeWeakSourceEvidence` never fired in 0/4 live categories |
| **Status** | Fixed |

**Description:** The first live diagnostic run (Phase 3E) showed `sourceUpgradeTraces: []` for all 4 test categories (gas grill, shop vac, robot vacuum, cordless drill). The entire `upgradeWeakSourceEvidence` mechanism was a no-op because its trigger condition (`countExternalCitations === 0`) was too strict.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `needsSourceUpgrade` trigger condition

**Root cause:** `countExternalCitations` counted any citation from a domain other than the product page host as an "external citation," including manufacturer subdomains (`store.ridgid.com`) and manufacturer sites on different domains (`makitatools.com`). These tier-3 sources are not useful commerce evidence but they blocked the upgrade trigger.

**Expected:** Trigger fires when a product lacks useful commerce evidence (tier-1 editorial or tier-2 marketplace/retailer citation from a non-self host).

**Actual:** Trigger never fired because most products had at least one citation from any external domain.

**Fix:** Phase 3F replaced `countExternalCitations === 0` with `!hasUsefulCommerceEvidence(product)`.

---

#### RR-033

| Field | Value |
|-------|-------|
| **ID** | RR-033 |
| **Phase** | Phase 3E |
| **Severity** | High |
| **Title** | Same-brand subdomains blocking source-upgrade eligibility |
| **Status** | Fixed |

**Description:** `store.ridgid.com` is a subdomain of `ridgid.com`. When a RIDGID product's citations included a `store.ridgid.com` link, `countExternalCitations` counted it as an external citation (different host), blocking the upgrade even though this citation is the manufacturer's own store, not an independent retailer or editorial source.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `countExternalCitations` / `needsSourceUpgrade`

**Expected:** Same-brand subdomains (tier-3) do not count as useful commerce evidence.

**Actual:** Counted as external citation, blocking upgrade.

**Fix:** `countExternalCitations` replaced by `hasUsefulCommerceEvidence` using `sourceTier.ts`; tier-3 manufacturer/brand sources no longer block upgrade eligibility.

---

#### RR-034

| Field | Value |
|-------|-------|
| **ID** | RR-034 |
| **Phase** | Phase 3E |
| **Severity** | Medium |
| **Title** | `modelTokens` regex misses mixed-case word-preceded numbers (Napoleon Rogue 525, Rogue XT 425) |
| **Status** | Open |

**Description:** The `modelTokens` regex requires an uppercase letter directly preceding or within a short alphanumeric sequence (e.g., "XFD131", "WD1450"). Products with model numbers preceded by a lowercase word — like "Napoleon Rogue 525" or "Napoleon Rogue XT 425 SIB" — do not have a qualifying uppercase token directly adjacent to the number, so no model token is extracted. Products without a model token are ineligible for `upgradeWeakSourceEvidence`.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `extractModelTokens` (or equivalent model-token regex)

**Steps to reproduce:** Call `extractModelTokens` (or equivalent) on `"Napoleon Rogue XT 425 SIB Gas Grill"`. Result should be `[]` or missing `"425"` / `"XT 425"`.

**Expected:** "XT 425" or "Rogue XT 425" is recognized as a model identity token for Napoleon gas grills.

**Actual:** No model token extracted; product skips source-upgrade eligibility.

**Suggested fix:** Extend the model-token regex to accept `WORD + DIGITS` patterns (not just `UPPERCASE + DIGITS`) when the preceding word is not a category term or stopword. Verify no false positives on generic descriptor phrases ("the 500", "size 12").

---

#### RR-035

| Field | Value |
|-------|-------|
| **ID** | RR-035 |
| **Phase** | Phase 3E |
| **Severity** | Medium |
| **Title** | `modelTokens` regex misses Samsung Bespoke / FEIN descriptive naming conventions |
| **Status** | Open |

**Description:** Samsung Bespoke products (Jet Bot AI+, Bespoke Jet) use descriptive brand-line names without standard model-number formats. FEIN tool models use digit-dash formats (e.g., "FEIN MULTIMASTER FMM 350 QSL") that the current regex does not match. Both product families have no extractable model token and are ineligible for source-upgrade.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — model-token extraction

**Expected:** Products with clear brand+line identity (Samsung Bespoke) or digit-dash model formats (FEIN) receive model tokens.

**Actual:** No model token; products skipped for upgrade.

**Note:** This was acknowledged in Phase 3E and intentionally deferred. Fix should be batched with RR-034 when model-token detection is improved.

**Suggested fix:** For Samsung Bespoke: treat `Bespoke <Line>` as a pseudo-model token. For FEIN: add `\d{3,}[-]\w+` to the regex. Validate against a test fixture set before deploying.

---

### PHASE 3F — TRIGGER LOOSENING (2026-06-25)

---

#### RR-036

| Field | Value |
|-------|-------|
| **ID** | RR-036 |
| **Phase** | Phase 3F — Live diagnostic re-test |
| **Severity** | High |
| **Title** | `evidenceAttached: false` for all 4 upgrade attempts — root cause unknown at Phase 3F |
| **Status** | Fixed |

**Description:** After Phase 3F fixed the trigger condition (upgrade now fires 3/4 categories), the live re-test showed 4 upgrade attempts across gas grill, robot vacuum, and cordless drill categories, but 0 evidence was attached in any attempt. The Phase 3F trace only recorded `evidenceAttached: true/false` with no intermediate diagnostic data.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `upgradeWeakSourceEvidence`

**Root cause (confirmed Phase 3H):** The shopping query used the full display title ("4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill") which Serper shopping does not return results for — `candidatesReturned: 0` for all observed attempts. The bottleneck was query construction, not identity matching.

**Expected:** A failed source-upgrade attempt exposes enough stage information to distinguish query/provider coverage, normalization, identity rejection, and missing attachable fields.

**Actual:** All four attempts reported only `evidenceAttached: false`; the failure layer was unknown at Phase 3F.

**Fix:** Phase 3G added diagnostic fields to the trace. Phase 3H confirmed zero candidates returned. Phase 3I implemented a new `buildSourceUpgradeShoppingQuery` that produces concise product-identity queries.

---

#### RR-037

| Field | Value |
|-------|-------|
| **ID** | RR-037 |
| **Phase** | Phase 3F |
| **Severity** | Low |
| **Title** | RIDGID RT1200 absent from shop-vac pool in Phase 3F live run (LLM variance) |
| **Status** | Needs Investigation |

**Description:** RIDGID RT1200 was present in the Phase 3E live diagnostic pool but absent in the Phase 3F live re-test, so no shop-vac upgrade attempt was generated for RIDGID. The absence is attributed to LLM output variance between runs. This means the specific RIDGID same-brand-subdomain fix (RR-033) cannot be confirmed live on a run-by-run basis.

**Where it occurs:** LLM candidate pool generation (non-deterministic)

**Expected:** RIDGID RT1200 appears consistently in shop-vac candidate pools.

**Actual:** RIDGID present in ~50% of observed live runs.

**Suggested fix:** Improve discovery seed coverage for RIDGID (brand + model explicitly seeded); or add RIDGID to the gold benchmark `coreLeaders` for shop-vac searches and track coverage via the quality scorecard.

---

### PHASE 3G — SOURCE-UPGRADE SEARCH-RESULT DIAGNOSTICS (2026-06-26)

---

#### RR-038

| Field | Value |
|-------|-------|
| **ID** | RR-038 |
| **Phase** | Phase 3G |
| **Severity** | Medium |
| **Title** | No way to distinguish empty Serper results from identity-gate rejection in `SourceUpgradeTrace` |
| **Status** | Fixed |

**Description:** Before Phase 3G, `SourceUpgradeTrace` only recorded `{name, query, evidenceAttached, attachedFields}`. When `evidenceAttached: false`, there was no way to determine whether Serper returned 0 shopping results, Serper returned results but the identity gate (`looksLikeSameProduct`) rejected all candidates, or the identity gate passed but no price/rating/citation was attachable. All three failure modes produced identical trace output.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `SourceUpgradeTrace` type; `upgradeWeakSourceEvidence` function; `scripts/replay-quality-fixtures.mjs` — trace display

**Expected:** Trace distinguishes the three failure modes via `candidatesReturned`, `candidatesEvaluated`, and `noMatchReason` fields.

**Actual:** Only `evidenceAttached: true/false` was recorded; all failures looked identical.

**Fix:** Phase 3G added `candidatesReturned`, `candidatesEvaluated`, `noMatchReason` (`"shopping_results_empty"` | `"identity_rejected"` | `"no_attachable_fields"`), and `candidateSample` (up to 5 candidates with per-candidate `rejectionReason`) to `SourceUpgradeTrace`. Replay script updated with graceful degradation for old fixtures.

---

### PHASE 3H — LONG-QUERY DIAGNOSTIC (2026-06-26)

---

#### RR-039

| Field | Value |
|-------|-------|
| **ID** | RR-039 |
| **Phase** | Phase 3H |
| **Severity** | High |
| **Title** | Source-upgrade shopping query used full display title — Serper returned 0 candidates |
| **Status** | Fixed |

**Description:** Phase 3H live diagnostic (using Phase 3G's new `candidatesReturned` field) confirmed that `candidatesReturned: 0` for the observed gas-grill upgrade attempt. The query used was `"4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill"` — a long retailer display title with redundant category suffix. Serper shopping does not index long descriptor-heavy titles; no candidates were returned.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `buildRescueShoppingQuery` (before Phase 3I), used by `upgradeWeakSourceEvidence`

**Steps to reproduce:** Replay `tests/fixtures/review-radar-live/gas-grill.json` with Phase 3G+ code. Observe `candidatesReturned: 0`, `noMatchReason: "shopping_results_empty"` in the source-upgrade trace.

**Expected:** Source-upgrade query uses a concise product-identity string ("4-Burner Propane Gas Grill") that Serper shopping can match.

**Actual:** Full display title used; Serper returned 0 results; evidence never attached.

**Fix:** Phase 3I added `buildSourceUpgradeShoppingQuery` — strips category suffix if already in product name, removes retailer descriptor filler, keeps brand + model token or first meaningful identity phrase.

---

### PHASE 3I — CONCISE SOURCE-UPGRADE QUERY (2026-06-26)

---

#### RR-040

| Field | Value |
|-------|-------|
| **ID** | RR-040 |
| **Phase** | Phase 3I — Pre-fix analysis |
| **Severity** | Medium |
| **Title** | `buildRescueShoppingQuery` appended redundant category suffix for products whose name already contained the category |
| **Status** | Fixed |

**Description:** The original `buildRescueShoppingQuery` appended the category string to the product name unconditionally. For products whose display name already contained the category (e.g., "Napoleon Rogue XT 425 SIB Gas Grill"), the resulting query was "Napoleon Rogue XT 425 SIB Gas Grill gas grill" — category duplicated. This may degrade Serper shopping result quality.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `buildRescueShoppingQuery` (source-upgrade path)

**Expected:** Category not appended if the product name already contains it.

**Actual:** Category always appended, producing "gas grill gas grill"-style redundancy.

**Fix:** Phase 3I's `buildSourceUpgradeShoppingQuery` strips trailing category duplication. The original `buildRescueShoppingQuery` is unchanged (still used for non-upgrade rescue paths).

---

### PHASE 3J — FOCUSED LIVE PROOF (2026-06-26)

---

#### RR-041

| Field | Value |
|-------|-------|
| **ID** | RR-041 |
| **Phase** | Phase 3J |
| **Severity** | Medium |
| **Title** | Source-upgrade trigger not firing in Phase 3J live runs — eligibility gap after query fix |
| **Status** | Needs Investigation |

**Description:** Phase 3J live runs for `cordless drill` and `gas grill` returned `sourceUpgradeTraces: []` — the trigger never fired. Even after the Phase 3F trigger fix and the Phase 3I query fix, no products qualified for source-upgrade in these specific live runs. The issue is that the product set encountered at runtime may not include weakly-sourced products with model tokens, or the live result variance means the fixture used for Phase 3J captured a run where already-strong candidates appeared.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `needsSourceUpgrade` trigger; live run variance

**Expected:** At least one source-upgrade attempt fires and produces candidates per live run for known-weak categories.

**Actual:** `sourceUpgradeTraces: []` — no eligible candidates in the Phase 3J live snapshots.

**Suggested fix:** Expand live-proof coverage to robot vacuum and shop vac (Phase 3J extension confirmed one attempt on robot vacuum). Investigate whether live fixture LLM variance is causing strong candidates to always appear, bypassing the trigger. Add gold-benchmark tracking for source-upgrade trigger rate.

**Correction / Phase 3J extension update:** The extension did not confirm an attempt for `robot vacuum`; that run also had `sourceUpgradeTraces: []`. The extension produced two attempts for `shop vac` (`Makita XCV11Z` and `RIDGID WD1450`). Both compact model queries returned zero normalized candidates. The original suggested-fix sentence is retained for history, but its category attribution was incorrect.

**Phase 4B evidence:** Trigger inconsistency persists. Fresh `shop vac` and `robot vacuum` fixtures each produced zero traces, while `gas grill` produced one attempt against a wrong-type Thermador range/PDF target. The trigger is operational, but its live coverage is sparse and target quality is not reliable. Status remains Needs Investigation.

---

### PHASE 3J EXTENSION — TRIGGER-PRODUCING CATEGORIES (2026-06-26)

No separate issue ID was opened in this section. The extension evidence and correction are recorded on RR-041; the zero-candidate query result is carried forward into RR-042.

---

### PHASE 3K — FALLBACK LADDER IMPLEMENTATION (2026-06-26)

No new defect was discovered during deterministic implementation. Phase 3K added the bounded fallback used by the Phase 3L live proof.

---

### PHASE 3L — FALLBACK LIVE PROOF (2026-06-26)

---

#### RR-042

| Field | Value |
|-------|-------|
| **ID** | RR-042 |
| **Phase** | Phase 3L |
| **Severity** | Medium |
| **Title** | Source-upgrade fallback query fires but still returns 0 candidates — coverage gap |
| **Status** | Needs Investigation |

**Description:** Phase 3K added a fallback query path (`buildSourceUpgradeFallbackShoppingQuery`) that runs after the primary compact query returns 0 candidates. The Phase 3L live proof showed the fallback fires (e.g., `"Makita XCV11Z"` → fallback: `"Makita XCV11Z shop vac"`), but the fallback query also returned 0 candidates. The bottleneck is upstream of identity matching — Serper shopping returns no results at all for either the compact or the category-appended query.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `upgradeWeakSourceEvidence` fallback path; Serper shopping API coverage

**Steps to reproduce:** Replay any Phase 3L+ fixture for `shop vac`. Observe both `primaryCandidatesReturned: 0` and `fallbackCandidatesReturned: 0`.

**Expected:** At least one of the two queries returns Serper shopping results for a well-known product.

**Actual:** Both primary and fallback queries return 0 candidates. Source upgrade never attaches evidence.

**Suggested fix or next action:** Phase 3M completed the requested provider/search-coverage diagnostic. Implement RR-048/RR-049 in Phase 3N, then rerun the focused fallback proof before closing RR-042.

**Phase 3N update:** The Phase 3L live attempt was `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`, with primary `Wet/Dry Vacuum DXV10SB` and fallback `Wet/Dry Vacuum DXV10SB shop vac`. Phase 3M proved Serper returned 40 raw shopping results for each query; all considered results were lost during normalization/product eligibility. Phase 3N fixed RR-048/RR-049 deterministically. The approved Phase 3N `shop vac` proof produced `sourceUpgradeTraces: 0`, so normalization was not exercised. RR-042 remains `Needs Investigation` until a trigger-producing focused live proof confirms candidates survive normalization and proceed safely through identity and attachment.

**Phase 4B evidence:** Candidate normalization and attachment now work live for one primary-query attempt: `[PDF] PRL364NLG` returned 2 raw, 2 structural, 2 eligible, and 2 normalized Google Shopping offers; one candidate identity-matched and attached price plus citation. The fallback path was not exercised, and the upgraded target was a wrong-type range/PDF in a gas-grill search. RR-042 therefore remains Needs Investigation: provider/normalization emptiness is disproved for this attempt, but fallback reliability and safe useful attachment remain unproven.

---

### PHASE 3M — RAW SERPER AND QUERY-IDENTITY DIAGNOSTIC (2026-06-27)

---

#### RR-047

| Field | Value |
|-------|-------|
| **ID** | RR-047 |
| **Phase** | Phase 3M |
| **Severity** | High |
| **Title** | Source-upgrade model identity drops a detected brand from long product titles |
| **Status** | Fixed |

**Description:** The attempted product still contained `DEWALT` in its full name, and shared brand detection correctly returned `DeWalt`. However, `buildModelIdentityQuery` ignored that detected brand and selected only the two words immediately before model token `DXV10SB`, producing `Wet/Dry Vacuum DXV10SB`. The fallback inherited the same brandless identity phrase. This is a general defect for brand-led product titles where descriptive product nouns appear between the brand and model token.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `buildModelIdentityQuery`, `buildSourceUpgradeShoppingQuery`, and `buildSourceUpgradeFallbackShoppingQuery`

**Steps to reproduce:** Build a source-upgrade query for `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB` in category `shop vac`. Query tracing records detected brand `DeWalt` but primary `Wet/Dry Vacuum DXV10SB` and fallback `Wet/Dry Vacuum DXV10SB shop vac`.

**Expected:** A detected brand is preserved in the compact model identity, such as `DeWalt DXV10SB` plus bounded category context.

**Actual:** The selected identity phrase excludes the brand even though brand detection succeeded.

**Suggested fix or next action:** After the normalization fix in Phase 3N, implement a separate brand-preserving query phase. Prefer metadata brand, then shared detected brand, and combine it with the model token without restoring long retailer-title noise. Add positive tests across unrelated brands and negative tests for false brand inference.

**Phase 3O fix:** Completed deterministically. Source-upgrade query construction now resolves brand from trusted product metadata first, then the existing shared brand detector. When a compact model token is present, the reliable brand is prepended unless that brand is already embedded in the model identity. Products without a reliable brand retain the existing nearby-word identity behavior. The confirmed query changed from `Wet/Dry Vacuum DXV10SB` to `DeWalt DXV10SB`; fallback now uses `DeWalt DXV10SB shop vac`. No model-token, identity-matching, trigger, fallback-count, eligibility, scoring, ranking, or trust behavior changed.

---

#### RR-048

| Field | Value |
|-------|-------|
| **ID** | RR-048 |
| **Phase** | Phase 3M |
| **Severity** | High |
| **Title** | Correct Google Shopping product offers are rejected as generic search/listing URLs |
| **Status** | Fixed |

**Description:** Direct Phase 3M probes showed that Serper returned 40 raw shopping results and 20 structurally usable results for every tested query, but zero candidates survived normalization. A correct `DEWALT DXV10SB` offer was present. Serper represented it with a Google Shopping offer URL shaped as `https://www.google.com/search?ibp=oshop&...&udm=28...`; `isLikelySearchOrListingUrl` rejected it before source-upgrade identity matching or attachment.

**Where it occurs:** `lib/search/serper.ts` — `normalizeSerperShoppingResults`, `looksLikeSpecificProductCandidate`, and `isLikelySearchOrListingUrl`

**Steps to reproduce:** Run the Phase 3M diagnostic for `Wet/Dry Vacuum DXV10SB`. The first 20 shopping entries are structurally usable, but the correct DEWALT result receives rejection reason `search_or_listing_url` and `eligibleShoppingCandidates` remains zero.

**Expected:** A specific Google Shopping offer carrying product identity, offer metadata, and a product/catalog identifier is distinguished safely from an ordinary Google search or category page. A real merchant URL should be preferred when available.

**Actual:** The generic Google search/listing rule rejects the specific offer, so no candidate reaches identity matching.

**Suggested fix or next action:** Completed deterministically in Phase 3N. Source upgrade explicitly enables an evidence-only normalization mode that requires Google host, `/search`, `ibp=oshop`, `udm=28`, a product/catalog identifier, specific title, positive price, and merchant/source metadata. Merchant URLs are preferred when available. General discovery and the shared product-card classifier still reject Google search/offer URLs. Identity matching remains mandatory before attachment. Focused live proof is still pending under RR-042.

**Phase 4B live evidence:** Fixed behavior is now observed live. The `gas grill` source-upgrade attempt retained two specific Google Shopping offers (`raw/structural/eligible/returned = 2/2/2/2`) for identity evaluation. This does not make Google offer URLs valid product-card URLs; it only confirms the evidence-only normalization path is active.

---

#### RR-049

| Field | Value |
|-------|-------|
| **ID** | RR-049 |
| **Phase** | Phase 3M |
| **Severity** | Medium |
| **Title** | `Shop-Vac` brand titles are rejected by the generic `shop` non-product-title rule |
| **Status** | Fixed |

**Description:** Phase 3M rejection samples included specific products such as `Shop-Vac 10-Gallon 5.5 HP Wet/Dry Shop Vacuum with Accessories`. The generic non-product-title pattern treats the word `shop` as evidence that a result is a shopping/category page. Because punctuation normalization turns `Shop-Vac` into separate `shop vac` words, legitimate products from the Shop-Vac brand are rejected before identity matching.

**Where it occurs:** `lib/search/serper.ts` — `titleLooksLikeSpecificProduct` generic title patterns

**Steps to reproduce:** Pass a specific title beginning with `Shop-Vac` and a structurally valid shopping result into `diagnoseSerperShoppingResponse`. The result can receive `generic_or_non_product_title`.

**Expected:** The known `Shop-Vac` brand in a specific product title is allowed, while titles such as `Shop Vacuums`, `Shop Wet/Dry Vacuums`, or category collections remain blocked.

**Actual:** The broad `shop` pattern rejects both generic shopping language and the legitimate brand token.

**Suggested fix or next action:** Completed deterministically in Phase 3N. The broad `shop` pattern was replaced with narrow listing/action title shapes. Specific `Shop-Vac` products now survive normalization, while `Shop Vacuums`, `Shop Wet/Dry Vacuums`, `Shop All Vacuums`, `Shop By Category`, and similar generic titles remain blocked. Focused live proof is still pending under RR-042.

---

#### RR-050

| Field | Value |
|-------|-------|
| **ID** | RR-050 |
| **Phase** | Phase 3M |
| **Severity** | Medium |
| **Title** | Source-upgrade trace conflated raw provider emptiness with normalization loss |
| **Status** | Fixed |

**Description:** Before Phase 3M, `searchSerperShopping` returned only a candidate array. An empty array could mean no API key, an API error, zero raw shopping results, raw results rejected during structural normalization, product eligibility rejection, or an empty organic fallback. Source-upgrade then reported `shopping_results_empty`, making Phase 3L appear to prove raw Serper coverage failure when raw results were actually present.

**Where it occurs:** `lib/search/serper.ts` — `searchSerperShopping`; `lib/requirementEvidenceRescue.ts` — `SourceUpgradeTrace`; `scripts/replay-quality-fixtures.mjs`

**Steps to reproduce:** Before Phase 3M instrumentation, replay the Phase 3L `shop vac` fixture. The trace reports zero candidates but contains no raw/normalized/eligibility counts.

**Expected:** Debug traces distinguish raw result count, structural normalization, eligibility filtering, identity evaluation, and attachable-field evaluation.

**Actual:** All failures before identity matching collapsed to an empty candidate array and the same broad no-match label.

**Suggested fix or next action:** Completed in Phase 3M. Added query-input tracing, raw/structural/eligible/organic/returned counts, rejection reason counts, capped raw samples, and `attachableCandidates`; replay remains compatible with older fixtures. The legacy `noMatchReason` value remains broad, so future agents should consult the nested Serper diagnostics.

---

### PHASE 3N — SHOPPING-OFFER/TITLE ELIGIBILITY FIXES (2026-06-27)

---

#### RR-051

| Field | Value |
|-------|-------|
| **ID** | RR-051 |
| **Phase** | Phase 3N |
| **Severity** | High |
| **Title** | Query-derived fallback snippet can contaminate source-upgrade identity matching |
| **Status** | Fixed |

**Description:** During Phase 3N negative-test construction, a normalized Serper shopping candidate without its own snippet inherited the existing fallback text `Found by Serper for query "<query>"`. Because the source-upgrade query contains the target product identity, that generated text can make a different returned product appear to share the target identity. In the deterministic probe, a wrong-product candidate attached evidence until candidate-specific snippet text was supplied. Phase 3N did not change this behavior because identity matching and snippet construction were explicitly out of scope.

**Where it occurs:** `lib/search/serper.ts` — `buildCandidateFromResult` fallback snippet construction; `lib/requirementEvidenceRescue.ts` — `looksLikeSameProduct` identity evaluation

**Steps to reproduce:** Normalize a Serper shopping result for a wrong product with a specific title/model but no `snippet`, using a source-upgrade query that contains the target product brand/model. Pass the normalized candidate into `upgradeWeakSourceEvidence` and inspect `sourceUpgradeTraces`; confirm whether the query-derived fallback text contributes to an identity pass.

**Expected:** Identity matching uses candidate-originated identity evidence only. Diagnostic/search-query fallback text must not make a wrong product appear to match the target product.

**Actual:** In the Phase 3N test probe, the snippet-less wrong candidate inherited target-query text and evidence attached. Adding a candidate-specific snippet restored the expected identity rejection.

**Suggested fix or next action:** Before relying on snippet-less candidates in live source-upgrade proof, isolate query provenance from candidate identity text. The smallest safe phase should either exclude generated query fallback text from `looksLikeSameProduct` or mark its provenance so it cannot satisfy brand/model identity. Add a regression test with a snippet-less wrong model. Do not weaken identity matching.

**Phase 3N live-proof note:** The approved `shop vac` proof produced no source-upgrade attempt, so no candidate reached identity matching and the risk was not cleared by that live run. RR-051 was subsequently fixed deterministically as recorded below.

**RR-051 fix:** Completed deterministically after Phase 3N. Serper normalization now labels each candidate snippet as `source-derived` or `query-derived`. Source-upgrade identity evaluation ignores query-derived snippets and the request-derived candidate category while continuing to use the provider title, inferred brand, merchant, URL, provider-derived specs, and real provider snippets. The synthetic fallback text remains available for diagnostics and existing non-identity behavior. Regression tests prove the exact snippet-less wrong-product attachment is blocked, generic source titles cannot borrow the target model from the query, and real same-model titles plus RR-048 Google Shopping offers still attach normally.

**Phase 4B live evidence:** The unrelated `The PLR Handbook` Google Shopping result did not borrow identity from the `[PDF] PRL364NLG` source-upgrade query and was rejected as `identity_mismatch`. RR-051 remains Fixed.

---

### PHASE 3O — BRAND-PRESERVING QUERY LIVE PROOF (2026-06-27)

---

#### RR-052

| Field | Value |
|-------|-------|
| **ID** | RR-052 |
| **Phase** | Phase 3O live proof |
| **Severity** | High |
| **Title** | Horsepower abbreviation `HP` is misclassified as the Hewlett-Packard brand |
| **Status** | Open |

**Description:** The focused `shop vac` proof attempted source upgrade for two RIDGID vacuums whose names contain `Peak HP`. Existing shared brand detection interpreted the unit token `HP` as the Hewlett-Packard brand. One candidate already carried `metadataBrand: HP`; the other had no metadata brand but `inferKnownBrand` returned `HP`. Phase 3O correctly preserved that detected brand, producing the unrelated shopping queries `HP HD0900` and `HP HD06001`.

**Where it occurs:** `lib/brandMatching.ts` — short `HP` brand alias handling; upstream product metadata brand inference; `lib/requirementEvidenceRescue.ts` — `sourceUpgradeBrand`

**Steps to reproduce:** Run source-upgrade query construction for `RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900` or `RIDGID 6 Gal. 3.5 Peak HP NXT Wet/Dry Vac HD06001`. Observe detected brand `HP` and primary queries `HP HD0900` / `HP HD06001`.

**Expected:** `HP` used as a horsepower unit in product specifications is not treated as a computer brand. The reliable product identity remains RIDGID plus model where available.

**Actual:** `HP` is trusted as brand identity and redirects source-upgrade shopping search toward Hewlett-Packard products.

**Suggested fix or next action:** Add context-sensitive handling for short ambiguous brand aliases using the existing shared brand system. `HP` adjacent to horsepower quantities or `Peak HP` must not be brand evidence. Preserve genuine HP computer-brand detection in brand-led titles. Also audit why one live product already had `metadataBrand: HP` before source upgrade.

**Phase 4C reproducibility confirmation:** A fresh `shop vac` run produced three source-upgrade attempts. RIDGID `WD4522` and STANLEY `SL18199P` were both assigned detected brand `HP`, producing `HP WD4522` and `HP SL18199P`. The former still found a correct vacuum and attached safely; the latter returned 20 HP-computer candidates and attached nothing. RR-052 is confirmed reproducible and can waste searches or suppress useful evidence even when RR-053 prevents unsafe query-echo identity.

---

#### RR-053

| Field | Value |
|-------|-------|
| **ID** | RR-053 |
| **Phase** | Phase 3O live proof |
| **Severity** | Critical |
| **Title** | Google Shopping offer URL query parameters can satisfy same-product identity |
| **Status** | Fixed |

**Description:** RR-051 excluded query-derived fallback snippets, but source-upgrade identity still consumes the complete candidate URL. Google Shopping offer URLs echo the source-upgrade search in their `q` parameter. For target model `HD0900`, the first returned candidate was `Hp 15.6" HD Windows Laptop`; its URL contained `q=HP+HD0900`. The model-token fast path found `HD0900` in that URL, marked the laptop as the same product, and attached its `$429` price, 4.3 rating, review count, and citation to the RIDGID vacuum.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `evidenceText` / `looksLikeSameProduct`; Google Shopping offer URLs produced by `lib/search/serper.ts`

**Steps to reproduce:** Replay the Phase 3O `shop vac` fixture saved at `2026-06-27T14:13:24.432Z`. Inspect the first source-upgrade trace for RIDGID HD0900. Candidate sample shows `Hp 15.6" HD Windows Laptop`, `identityMatch: true`, and all commerce fields attached.

**Expected:** Identity matching uses source-derived product identity. Search/query parameters embedded in an evidence URL cannot satisfy brand or model identity.

**Actual:** The target model echoed in the Google offer URL bypasses RR-051 snippet provenance and causes an unsafe cross-product evidence merge.

**Suggested fix or next action:** Treat search/query parameters as query-derived identity text. Identity evaluation should use a normalized evidence URL identity that excludes search terms and tracking/query parameters while retaining safe host/path signals where useful. Add a deterministic regression using a wrong product title and a Google offer URL whose `q` parameter contains the target model. Safety must be fixed before another live source-upgrade proof.

**RR-053 fix:** Completed deterministically on 2026-06-27. Source-upgrade identity now reduces candidate URLs to host plus path before normalization, excluding the complete query string and fragment. Google Shopping `q`, `oq`, `query`, `search`, tracking, and advertising parameters therefore cannot provide brand/model identity. Existing merchant product-page path identity remains available. Regression coverage proves the Phase 3O HP-laptop candidate is rejected with no commerce evidence attached, a matching Google Shopping source title still passes, and a real merchant model path still passes. No live search was run.

**Phase 4B live evidence:** RR-053 is now live-proven for a negative query-echo case. The PLR-book offer URL contained the source-upgrade query `[PDF] PRL364NLG`, but the book remained `identityMatch: false`; query parameters did not supply model identity. RR-053 remains Fixed.

---

### CROSS-PHASE / INFRASTRUCTURE

---

#### RR-043

| Field | Value |
|-------|-------|
| **ID** | RR-043 |
| **Phase** | Cross-phase |
| **Severity** | High |
| **Title** | Product-type taxonomy coverage incomplete — many categories have no type rule |
| **Status** | Open |

**Description:** `PRODUCT_TYPE_RULES` (in `lib/productTypeIntent.ts`) currently covers only a subset of product categories. Categories without a rule fall through to the loose LLM-labeled-category check. This means wrong-type contamination (the class of bug fixed in Phase 3B for robot vacuums) is likely present for any category not yet in `PRODUCT_TYPE_RULES`.

**Where it occurs:** `lib/productTypeIntent.ts` — `PRODUCT_TYPE_RULES`

**Expected:** All product categories commonly searched in ReviewRadar have an explicit type rule covering the most likely wrong-type products.

**Actual:** Only categories that have been explicitly investigated (robot vacuum, gas grill fuel types, etc.) have rules.

**Suggested fix:** Audit all categories in the gold benchmark and add a `PRODUCT_TYPE_RULES` entry for each, at minimum covering the most common substitution/confusion class (e.g., for "air purifier": dehumidifiers; for "blender": food processors). Phase 3B noted this as "DONE / PARTIAL — product-type taxonomy coverage remains incomplete."

**Phase 4D confirmation:** The missing-taxonomy concern is live and cross-category. Basketball wall art passed exact scoring for `basketball hoop`; battery power stations passed exact category matching for `portable generator`; pressure-wash detergent had already reached exact rank #2 in Phase 4C. These are distinct substitution classes and support a shared taxonomy-coverage fix rather than product-specific patches.

---

#### RR-044

| Field | Value |
|-------|-------|
| **ID** | RR-044 |
| **Phase** | Cross-phase |
| **Severity** | Medium |
| **Title** | `modelTokens` minimum length too restrictive — short model numbers excluded |
| **Status** | Open |

**Description:** The model-token regex likely enforces a minimum token length (≥4 characters as noted in diagnostic comments). This excludes short but definitive model identifiers like "M18" (3 characters, Milwaukee), "S" suffix (Roborock Qrevo S), and similar. Products with short model numbers are ineligible for source-upgrade even though their identity is unambiguous.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — model-token extraction regex

**Expected:** Short model tokens like "M18" are accepted when they appear with a clear brand prefix (e.g., "Milwaukee M18 FUEL" → token "M18").

**Actual:** Tokens under 4 characters filtered out; products skipped for source-upgrade.

**Note:** Threshold details uncertain — confirm exact minimum length in code before fixing. Related to RR-034 and RR-035; fix should be batched.

**Suggested fix:** Lower minimum length to 2 characters for tokens that are preceded by a recognized brand name, while keeping the 4-character floor for standalone tokens without brand context.

---

#### RR-045

| Field | Value |
|-------|-------|
| **ID** | RR-045 |
| **Phase** | Cross-phase |
| **Severity** | Medium |
| **Title** | Tapo RV30C Plus has limited Serper shopping index coverage |
| **Status** | Needs Investigation |

**Description:** Tapo is a newer brand with limited Serper shopping index coverage. Source-upgrade queries for Tapo RV30C Plus returned 0 candidates in Phase 3F live diagnostic and likely in subsequent runs. This may be a fundamental coverage gap in the Serper shopping data source rather than a query construction issue.

**Where it occurs:** Serper shopping API — index coverage for Tapo brand products

**Expected:** Serper shopping returns at least one listing for "Tapo RV30C Plus" or "Tapo RV30C Plus robot vacuum."

**Actual:** 0 candidates returned.

**Suggested fix:** Investigate whether Serper `gl`/`hl` parameters or search-type flags affect coverage. If it is a genuine Serper index gap, consider supplementing with an organic search fallback for source-upgrade when shopping returns 0 results. Document as a known coverage gap until Phase 3M diagnostic confirms the layer.

**Phase 3M uncertainty note:** Phase 3M disproved raw-provider emptiness for the tested DEWALT queries, but it did not directly re-probe Tapo RV30C Plus. The original claim that Tapo has limited Serper index coverage is therefore still uncertain. Before changing sources or adding an organic fallback, run the raw/structural/eligible diagnostic for the exact Tapo query and confirm which layer is empty.

---

#### RR-046

| Field | Value |
|-------|-------|
| **ID** | RR-046 |
| **Phase** | Cross-phase |
| **Severity** | Low |
| **Title** | Quality scorecard cost underestimated ~4× in original documentation |
| **Status** | Fixed |

**Description:** The original `docs/review-radar-test-memory.md` underestimated the cost of running a full quality scorecard by approximately 4×. This caused developers to underestimate API spend when planning measurement runs.

**Where it occurs:** `docs/review-radar-test-memory.md` — cost estimates; `scripts/qualityScorecard.mjs` — mode selection

**Expected:** Cost estimates are accurate; bare invocation refuses to run and prints a cost estimate.

**Actual:** Documentation underestimated costs; bare `qualityScorecard.mjs` invocation ran ~1316 Serper calls without warning.

**Fix:** Scorecard now requires explicit `--mode` flag. Bare invocation refuses to run. Any run estimated > 600 Serper calls blocks without `--confirm`. `--dry-run` prints the full plan at zero cost. Cost model updated to reflect actual ~47 Serper calls/search.

---

### PHASE 4A — DIAGNOSTIC ISSUE-HARVEST SETUP (2026-06-27)

No new defect was opened during Phase 4A. This phase audited and organized the existing register without changing product behavior or closing issues from absence of fresh evidence.

**Audit result:**

- IDs `RR-001` through `RR-053` are contiguous, unique, and not reused.
- All 53 issue records contain ID, phase, severity, title, status, description/evidence, affected mechanism, expected behavior, actual behavior, and a fix or next-action field.
- Summary totals reconcile with the records: 5 Critical, 25 High, 18 Medium, 5 Low; 5 Open, 7 Needs Investigation, 40 Fixed, 1 Won't Fix.
- No exact duplicate titles or duplicate issue IDs were found.

**Related issue clusters retained as separate records:**

| Cluster | Issues | Why they are not duplicates | Next diagnostic phase |
|---------|--------|-----------------------------|-----------------------|
| Source-upgrade reliability and safety | RR-041, RR-042, RR-052 | Trigger coverage, normalization/attachment behavior, and false brand identity are distinct failure layers | Phase 4B |
| Price trust | RR-002; fixed regressions RR-001 and RR-003 | Tiny full-product price, category-specific fake-low price, and installment parsing are distinct price-evidence failures | Phase 4C |
| Product-type coverage | RR-043 plus fixed wrong-type issues | RR-043 tracks missing taxonomy breadth; earlier records document specific repaired leak classes | Phase 4D |
| Market-leader and evidence quality | RR-013, RR-014, RR-037 | Thin-winner ranking, aggregate leader recall, and category-specific pool variance are distinct | Phase 4E |
| Model-token eligibility | RR-034, RR-035, RR-044 | Different token-shape failures share one likely future implementation batch but retain separate reproduction evidence | Phase 4F or later fix planning |
| Stability and source coverage | RR-015, RR-045 | Run variability and provider-layer coverage are separate uncertainties | Phase 4B/4F |

**Status discipline for Phase 4:** Fixed issues remain fixed unless a fresh regression directly contradicts the fix. Open and Needs Investigation issues remain unresolved until their named diagnostic evidence is collected. A problem not observed in a limited live sample is not considered fixed.

---

### PHASE 4B — SOURCE-UPGRADE SAFETY AND RELIABILITY DIAGNOSTICS (2026-06-27)

Three approved fresh searches were saved and replayed: `shop vac`, `robot vacuum`, and `gas grill`. No app behavior or test code changed.

**Source-upgrade result:**

| Search | Exact / near | Upgrade attempts | Outcome |
|--------|--------------|------------------|---------|
| `shop vac` | 7 / 0 | 0 | Trigger path not exercised |
| `robot vacuum` | 7 / 0 | 0 | Trigger path not exercised |
| `gas grill` | 7 / 0 | 1 | Primary returned 2; one identity match attached price + citation |

The `gas grill` attempt targeted `[PDF] PRL364NLG 36-INCH GAS PRO GRAND® RANGE WITH GRILL (LP)`. Query `[PDF] PRL364NLG` returned 2 raw, 2 structural, 2 eligible, and 2 normalized Google Shopping offers. `The PLR Handbook` was rejected as an identity mismatch even though its URL echoed the query; `Thermador Pro Harmony 36'' ... Gas Range` identity-matched and attached a `$7,949` price plus citation. The URL-query and query-derived identity protections held, but source upgrade enriched a wrong-type range/PDF target.

**Issue result:**

- New issue IDs opened: none.
- Reopened: RR-007 (brand collection page selected), RR-008 (support article selected), RR-017 (wrong-type products carried downstream).
- Evidence updated: RR-013, RR-041, RR-042, RR-048, RR-051, RR-053.
- RR-052 was not exercised because `shop vac` produced no source-upgrade trace.
- RR-045 remains unconfirmed because the `robot vacuum` run produced no Tapo upgrade attempt.
- No unsafe cross-product source-upgrade merge was observed. Safe useful source upgrade is still not proven because the only attachment enriched a wrong-type target.

---

### PHASE 4C — PRICE TRUST AND FAKE-LOW PRICE DIAGNOSTICS (2026-06-27)

Three approved fresh searches were saved and replayed: `shop vac`, `cordless drill`, and `pressure washer`. No app behavior or test code changed.

**Price result:**

| Search | Lowest budget-usable price | Trust | Finding |
|--------|----------------------------|-------|---------|
| `shop vac` | `$10` Vacmaster 1.5-Gallon Wet/Dry Vac | `verified`; `canUseForBudget: true` | Suspicious fake-low full-product price; exact rank #7 |
| `cordless drill` | `$159` RYOBI kit | `verified`; `canUseForBudget: true` | Plausible full-kit price |
| `pressure washer` | `$99` RYOBI RY141803 | `usable`; `canUseForBudget: true` | Plausible full-product price |

Other reviewed low prices were plausible for their product shape: `$36.55` for a 1-gallon STANLEY portable vacuum, `$75.99` for a 2.5-gallon Armor All vacuum, `$100` for a 1.5-gallon Vacmaster, `$189` for AR Blue Clean XM2200, and `$229` for DeWalt DWPW2400. No financing/installment amount was observed.

**Issue result:**

- New issue IDs opened: none.
- RR-002 confirmed reproducible on a second brand/product and remains Needs Investigation.
- RR-052 confirmed reproducible on RIDGID WD4522 and STANLEY SL18199P source-upgrade queries.
- Additional evidence added to reopened RR-007, RR-008, and RR-017.
- RR-013 received three more weak/retailer-winner examples.
- RR-001 and RR-003 remain Fixed; this sample did not directly exercise refrigerator or financing-price behavior.

---

### PHASE 4D — PRODUCT-TYPE LEAKAGE AND REQUIREMENT DIAGNOSTICS (2026-06-27)

Four approved fresh searches were saved and replayed: `robot vacuum`, `basketball hoop`, `air purifier`, and `portable generator`. No app behavior or test code changed.

#### RR-054

| Field | Value |
|-------|-------|
| **ID** | RR-054 |
| **Phase** | Phase 4D |
| **Severity** | Medium |
| **Title** | Fresh fallback responses can omit stage-funnel, source-upgrade, and final-selection traces |
| **Status** | Open |

**Description:** The fresh `air purifier` debug fixture was saved with the current script and debug request header, but the API took the `fallbackReason: no_reliable_evidence` / `fallbackSource: serper_candidates` path. Its debug object contained only fallback metadata, candidate count, timing, and verified URL count. It omitted `stageFunnel`, `sourceUpgradeTraces`, and `finalSelectionTrace`, so replay described the fixture as if it pre-dated current instrumentation.

**Where it occurs:** Recommendations API search-candidate fallback response/debug assembly; `scripts/save-debug-fixture.mjs`; `scripts/replay-quality-fixtures.mjs`

**Steps to reproduce:** Save a fresh debug fixture for `air purifier` when the API enters the `no_reliable_evidence` Serper-candidate fallback. Replay it and observe `No stage funnel data`, `Source-upgrade trace: not present`, and `Final-selection trace: not present` despite a current `_savedAt` timestamp.

**Expected:** Every current debug response, including fallback responses, preserves the stage funnel and final-selection diagnostics or emits an explicit current-path trace explaining which stages were bypassed.

**Actual:** The fallback response silently drops the current trace contract, preventing product-type, source-upgrade, and ranking-layer diagnosis for that search.

**Suggested fix or next action:** In a later fix phase, preserve a minimal common debug envelope across normal and fallback responses, and distinguish “current fallback path omitted this stage” from “old fixture lacks this field.” Add a deterministic fallback-response trace test before changing behavior.

---

#### RR-055

| Field | Value |
|-------|-------|
| **ID** | RR-055 |
| **Phase** | Phase 4D |
| **Severity** | High |
| **Title** | Literal `Portable` requirement fails a product explicitly titled Portable Inverter Generator |
| **Status** | Open |

**Description:** In the fresh `portable generator` run, `Generac GP3300i Portable Inverter Generator` was classified as a near candidate with failed requirement `Portable`. The product title contains the exact word, its manufacturer URL path contains `/portable-generators/`, and the category check passed. The false failure removed a valid product while collection pages and battery power stations filled final slots.

**Where it occurs:** Requirement extraction/validation and post-enrichment revalidation for plain descriptive attributes; final-selection trace `failed` requirement handling

**Steps to reproduce:** Save and replay `portable generator`. Inspect the final-selection trace for `Generac GP3300i Portable Inverter Generator`; observe `stream: nearScored`, `decisionReason: near_only_exact_full`, `failed: ["Portable"]`, and `passed: ["Category: portable generator"]`.

**Expected:** Exact positive evidence in the product title and manufacturer product URL satisfies the `Portable` requirement.

**Actual:** The literal requirement is marked failed, the product receives score `39.6`, and it is excluded from the final seven.

**Suggested fix or next action:** Diagnose which evidence source or negation/polarity path generated the false failure. Add a deterministic requirement test for a literal positive adjective in product title plus URL before changing shared matching behavior. Do not special-case Generac.

**Phase result:**

- New issues: RR-054 and RR-055.
- Reopened: RR-009.
- Evidence updated: RR-007, RR-013, RR-017, RR-043.
- `robot vacuum`: 5 exact + 2 near; GE washer/dryer remained near.
- `basketball hoop`: 7 exact; wall art entered exact scoring but missed final cutoff.
- `air purifier`: 5 exact + 5 near; category/documentation pages selected; current debug traces missing on fallback.
- `portable generator`: 7 exact; category pages and a power station selected; valid Generac product falsely failed `Portable`.

---

## Appendix: Issue Cross-Reference by Status

### Open (7 issues)
- RR-034: `modelTokens` misses mixed-case word-preceded numbers
- RR-035: `modelTokens` misses Samsung Bespoke / FEIN naming
- RR-043: Product-type taxonomy coverage incomplete
- RR-044: `modelTokens` minimum length too restrictive for short model numbers
- RR-052: Horsepower abbreviation `HP` is misclassified as the Hewlett-Packard brand
- RR-054: Fresh fallback responses omit current diagnostic traces
- RR-055: Literal `Portable` requirement fails an explicitly portable generator

### Needs Investigation (11 issues)
- RR-002: Tiny accessory/promo prices treated as verified full-product prices
- RR-007: Category/browse pages appearing as exact product matches
- RR-008: Review/article/support pages appearing as product cards
- RR-009: Documentation/manual pages appearing as product cards
- RR-013: Thin winner crowd-out
- RR-015: Run-to-run stability ~19%
- RR-017: Cross-category wrong-type products carried downstream
- RR-037: RIDGID absent from shop-vac pool (LLM variance)
- RR-041: Source-upgrade trigger not firing in Phase 3J live runs
- RR-042: Source-upgrade fallback returns 0 normalized candidates (Phase 3L)
- RR-045: Tapo raw Serper coverage remains unconfirmed

### Fixed (36 issues)
RR-001, RR-003 through RR-006, RR-010 through RR-012, RR-014, RR-016, RR-018 through RR-023, RR-025 through RR-033, RR-036, RR-038 through RR-040, RR-046 through RR-051, RR-053

### Won't Fix (1 issue)
- RR-024: Live fixture staleness (by design; graceful degradation is the accepted pattern)

---

## Appendix: Suggested Priority Order for Open/Needs-Investigation Issues

1. **RR-052** (High) — Stop horsepower `HP` context from becoming Hewlett-Packard brand identity while preserving genuine HP-brand detection.
2. **RR-002** (Critical) — Re-investigate the verified `$10` full shop-vac offer and restore suspicious-price protection.
3. **RR-007 + RR-008 + RR-009 + RR-017 + RR-043** (High cluster) — Category, support/documentation, and wrong-type targets contaminate final and near streams across categories.
4. **RR-055** (High) — Literal positive requirement evidence can be marked failed and remove a valid product.
5. **RR-042** (Medium) — Normalization and attachment can work, but fallback reliability and safe useful target attachment remain unproven.
6. **RR-041** (Medium) — Source-upgrade attempts remain inconsistent across live runs; add trigger-rate visibility if proof coverage continues to fail.
7. **RR-054** (Medium) — Current fallback responses can omit the diagnostic envelope needed to investigate other defects.
8. **RR-034 + RR-035 + RR-044** (Medium, batch) — Model-token detection gaps; fix together to avoid partial improvements.
9. **RR-013** (Medium) — Thin winner crowd-out; requires citation-strength score integration (scoring change, not diagnostic).
10. **RR-015** (High) — Run-to-run stability; requires deeper investigation into LLM temperature or deterministic candidate pinning.
11. **RR-037 + RR-045** (Low/Medium) — Coverage claims remain variable or uncertain; re-measure with raw/structural/eligible diagnostics before changing sources.

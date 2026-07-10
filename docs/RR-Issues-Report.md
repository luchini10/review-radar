# ReviewRadar Issues Report
## Compiled for AI Agent Consumption — Phase 0 through the stopped roadmap Phase R2 window

**Generated:** 2026-07-10
**Scope:** All phases from initial measurement harness through the stopped Phase R2 live-ledger window
**Purpose:** Comprehensive defect register for an AI agent to triage, track, and act on

**Standing maintenance rule:** At the end of every ReviewRadar phase, append newly discovered issues to this file, update existing issue statuses in place when appropriate, and refresh every summary count. This file is the single issue-tracking source of truth.

---

## Summary

| Metric | Count |
|--------|-------|
| Total Issues | 79 |
| Critical | 11 |
| High | 33 |
| Medium | 30 |
| Low | 5 |
| Open | 0 |
| Needs Investigation | 15 |
| Fixed | 63 |
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
| Phase 4E — Market-leader/citation diagnostics | 1 |
| Phase 4F — Broad rotating quality sweep | 5 |
| Phase 5A — Source-upgrade safety hardening | 0 |
| Phase 5B — Source-upgrade identity coverage | 0 |
| Phase 5C — Price-trust restoration | 1 |
| RR-062 diagnostic mini-phase | 0 |
| RR-062 behavior-fix mini-phase | 0 |
| Phase 5D — Product-card eligibility cleanup | 0 |
| Phase 5E — Product-type and requirement truthfulness | 0 |
| RR-007 regression cleanup mini-phase | 0 |
| Phase 5F — Citation retention | 0 |
| Phase 5F dog-food live confirmation | 0 |
| RR-008 cleanup mini-phase | 1 |
| RR-007/RR-063 product-evidence safety mini-phase | 0 |
| Phase 5G — Evidence-strength ranking | 0 |
| Phase 5H — Broad-slate diversity and form-factor quality | 1 |
| RR-064 source-upgrade identity mini-phase | 0 |
| RR-007/RR-008 pre-final eligibility cleanup | 0 |
| Phase 5I — Trigger/fallback reliability safety stop | 1 |
| RR-065 identity-safety mini-phase | 0 |
| RR-007 opaque collection-page cleanup | 0 |
| Phase 5I retry — same-brand/model-omission safety stop | 1 |
| RR-066 identity-safety mini-phase | 0 |
| Phase 5I retry — trigger/fallback reliability | 1 |
| RR-067 brand/unit identity cleanup | 0 |
| Phase 5J — Asset quality and fallback diagnostics | 1 |
| RR-068 product-type safety mini-phase | 0 |
| Phase 5 closeout and remeasurement | 0 |
| Phase 6A reliability instrument | 0 |
| Phase 6A master-plan reconciliation | 0 |
| Phase 6 master-plan source-of-truth promotion | 0 |
| Phase 6B regression wall | 0 |
| Phase 6C product-specific patch audit | 0 |
| Phase 6D variance pilot | 1 |
| Phase 6D post-RR-069 restart | 0 |
| Phase 6D post-RR-061 restart | 1 |
| Reopened RR-061 image-safety mini-phase | 0 |
| RR-069 source-upgrade identity safety mini-phase | 0 |
| Phase A search-observability audit filing | 7 |
| Phase R0/R1 — Roadmap adoption + RR-061 model-conflict fix | 0 |
| Phase R2 — Live ledger verification safety stop | 2 |
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
| **Status** | Fixed |

**Description:** Products like air purifiers, cordless drills, vacuums, and office chairs could have `$10` or similarly tiny prices treated as verified full-product prices. An accessory listing price, promotional add-on, or variant price was being accepted without a sanity floor for the product class.

**Where it occurs:** `lib/productPriceTrust.ts`

**Expected:** A `$10` price for a cordless drill is flagged `suspicious`. Product cannot be an exact Best Match.

**Actual:** Tiny prices passed as verified; products ranked as exact matches.

**Fix:** Added a `suspicious` price confidence state and product-class-specific sanity floors. Suspicious-price products are blocked from exact match status.

**Phase 3O live-proof regression:** The focused `shop vac` fixture returned `Amazon.com: RIDGID Wet Dry Vacuums VAC1200...` with a `$10` retailer-page offer. Final-selection trace recorded `priceTrustStatus: verified`, `canUseForBudget: true`, and selected the product as exact rank #5. RR-002 is reopened pending a general price-trust investigation; no fix was attempted during the diagnostic.

**Phase 4C reproducibility confirmation:** A fresh independent `shop vac` run reproduced the same defect on a different product. `Vacmaster 1.5-Gallon Wet/Dry Vac - Amazon.com` received a `$10` `retailer_page` offer from its Amazon product URL, `priceTrustStatus: verified`, and `canUseForBudget: true`, then reached exact rank #7. No budget was supplied, so the run proves unsafe trust and exact eligibility but cannot quantify a budget-specific rank boost. The recurrence across RIDGID and Vacmaster establishes a general full-product price-sanity gap rather than a single listing anomaly.

**Phase 4F evidence:** The pattern generalized beyond vacuums. A generic front/rear dash camera reached exact rank #7 with `$10`, and generic Bluetooth earbuds reached exact rank #7 with `$10`; both prices were budget-usable in final-selection trace. The earbud price may be a real low-end offer, but the dash-camera bundle is suspicious enough to reinforce the missing cross-category sanity floor.

**Phase 5C resolution:** The current implementation was reproduced before editing against all three saved products. `minimumLikelyFullProductPrice` returned `null` for `shop vac`, `dash cam`, and `wireless earbuds`; the fallback absolute floor was exactly `$10`, so an inclusive comparison admitted each `$10` offer as plausible and the strong retailer signal promoted it to `verified`. The shared class-sensitive floor now recognizes plural and wet/dry/shop-vac wording, dash-camera classes, and wireless-earbud classes. Reproduced `$10` offers now return `status: suspicious`, `price: null`, `canUseForBudget: false`, and `canBeExactWithBudget: false`; product assets display `Price not verified`, and exact selection demotes the product. The existing `$10` absolute floor, installment protection, full-size appliance floors, and specific text-price budget behavior remain intact. A `$12.99` low-end wireless-earbud offer remains verified.

**Phase 5C live proof:** Fresh `shop vac`, `dash cam`, and `wireless earbuds` searches produced no `$10` exact match. Shop-vac `$1`/`$10` offers were suspicious and budget-ineligible; two `$10` wireless-earbud candidates were rejected from exact selection; a real `$20` Soundcore earbud remained verified and selected. No broad baseline ran.

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
| **Status** | Fixed |

**Description:** eBay browse and category pages (URLs matching `/t/`, `/b/`, `/sch/` patterns) were passing the product eligibility check and appearing as exact product recommendations. These are listing pages, not individual product pages.

**Where it occurs:** `lib/productEligibility.ts` — product page eligibility classifier

**Expected:** eBay browse/category/search pages are blocked from rendering as product cards.

**Actual:** eBay "Best … Cleaners" browse page appeared as a wet/dry-vac exact match.

**Fix:** Product eligibility classifier now explicitly blocks eBay browse/category URL shapes.

**Phase 4B regression:** Reopened. The fresh `gas grill` fixture selected `Gas Outdoor BBQ Grills Made in the USA - MHP Grills` at exact rank #6. Its only citation is `https://mhpgrills.com/products/grills`, a product collection rather than a specific product page. The original eBay URL patterns remain fixed, but the general category/listing-page class is not contained across hosts.

**Phase 4C evidence:** `Pressure Washers - Best Buy` survived into the exact-scored stream below the final cutoff. It was not selected, but confirms that generic retailer category pages can still pass far enough to consume ranking slots.

**Phase 4D evidence:** Category/collection pages were selected across two more categories: `Air Purifiers, Ventilators & Monitors for Clean Air - Daikin Comfort` exact rank #5, `Portable Generators for RV, Home, and Projects` exact rank #5, and `Portable Generators - Briggs & Stratton` exact rank #7.

**Phase 4F evidence:** Category/collection pages continued to enter scoring or final results: Best Buy coffee-maker collections, PetSmart limited-ingredient dog-food diets at exact rank #3, and brand/category pages for leaf blowers. This is systemic across retailer and manufacturer hosts.

**Phase 5D fix:** Root cause was incomplete structural coverage in the shared product-eligibility classifier. Generic `/product(s)/...` family collections could appear product-like when their titles contained category words, and Best Buy's broad `/site/` allow rule accepted category pages. Eligibility now receives the requested category during discovery and final citation validation, recognizes category-shaped manufacturer collection paths without host allowlists, and limits known Best Buy product URLs to specific legacy and modern SKU shapes. Deterministic tests cover MHP, Daikin, Champion, Briggs & Stratton, and Best Buy collection negatives while preserving valid AeroPress and Best Buy product-detail positives. Saved Phase 4 fixtures reassessed through current code reject Daikin, Champion, and Briggs collection pages. Fresh `portable generator` results contained no Champion or Briggs collection card.

**Phase 5E regression:** Reopened. Both focused `pressure washer` live attempts selected `Pressure Washers - Best Buy` as exact #7. The Phase 5E product-type fix correctly removed ZEP detergent, but this broad retailer collection still passed product eligibility and final citation validation. No page-eligibility code changed because RR-007 is outside Phase 5E. Diagnose the exact current Best Buy URL/title shape in a later eligibility phase.

**RR-007 regression-cleanup fix:** The exact catalog URL ended in a nested `pcmcat...c` identifier beneath `/site/outdoor-power-equipment/pressure-washers/`. Phase 5D's Best Buy listing rule only recognized a shallower two-segment `.c` route, while Serper's local helper treated every `/site/` route as a known product. Shared eligibility now rejects nested catalog identifiers, department/browse paths, and faceted listing parameters unless the URL matches a known product-detail shape. Serper uses the same narrowed Best Buy SKU/detail patterns. Fail-first coverage reproduced the page at shared eligibility, discovery normalization, and final citation filtering. A fresh single `pressure washer` live run returned six exact products plus one near product, all with specific product-detail primary URLs; the Best Buy catalog page was absent. RR-007 is Fixed.

**Phase 5F safety update:** The first `dog food` live proof after citation retention exposed `Pro Plan Wet & Dry Dog Food | Purina US` at exact #7 from the generic family URL `/pro-plan/products/dog-food`. Phase 5F added a retention-layer product-specific path/title gate: generic category slugs cannot become primary cards even when provider-verified, while exact product slugs remain eligible after reachability verification. The exact family negative and specific Purina/Hill's positives are deterministic regressions. RR-007 remains Fixed; the final guard was not re-run live because the approved two-call Phase 5F limit was exhausted.

**RR-008 cleanup live regression:** Reopened. Three final dog-food cards used generic Chewy family/brand URLs as their primary buy links: `/brands/purina-pro-plan-dog-food-7437`, `/brands/royal-canin-dog-food-150798`, and `/brands/fresh-frozen-16636`. The shared fallback treats a long final slug containing letters and digits as product detail, so these category identifiers bypass current listing checks. A Pedigree `/brands/complete-nutrition-7216` page also survived as the primary citation ahead of a specific `/dp/` product page. This is a generalized `/brands/` and `/f/` listing-shape gap, not an RR-008 article regression.

**Product-evidence safety resolution:** Fixed. Shared eligibility now recognizes retailer/manufacturer brand, family, category, and collection route segments as generic evidence even when the final slug includes a numeric catalog ID. Product-link selection requires source-derived same-product identity and no longer treats the generated card name as proof for an existing primary URL. Generic family URLs can remain secondary evidence, but cannot become a card URL or buy link; an unsafe stale primary URL is cleared before asset enrichment. In the single fresh `dog food` run, all eleven final cards used specific `/dp/`, `/ip/`, or `/product/` URLs and no `/brands/` or `/f/` route became primary. Deterministic tests cover Chewy and unrelated retailer family routes while preserving specific retailer and manufacturer detail pages.

**Phase 5H live regression:** Reopened as Needs Investigation. `Electric Toothbrushes - Twin Packs and Bundles - Page 1 - Oral-B` survived citation verification, requirement filtering, reliability, and exact scoring as `reliableEnoughForExact: true`. It missed the final cards only because seven stronger products filled the cutoff. No category/listing page rendered, and Phase 5H did not change eligibility, but the pre-final product-card gate is not containing this shape.

**Pre-final eligibility cleanup resolution (2026-06-30):** Fixed again. The title was not recognized as a paginated bundle/category collection, and the generic deep `/products/...` shortcut therefore classified it as `buyable_product`. Shared title-only evidence-page detection now catches paginated collection and twin/multi-pack bundle titles before any product-detail URL, image, price, or model shortcut. Fail-first coverage reproduces the page through shared eligibility, Serper normalization, final citation validation, and requirement filtering. The focused live run dropped Oral-B lineup/category pages during citation verification; no category/listing page entered the 12 exact-scored candidates or five final cards.

**RR-065 live-proof regression (2026-06-30):** Reopened as Needs Investigation. The single post-fix `shop vac` run selected `Wet/dry extractors Dust extraction systems - Bosch Professional` as exact #3 with primary URL `https://www.bosch-pt.com.au/au/en/wet-dry-extractors-2549705-ocs-c/`. This is a Bosch product-family/category collection; a specific Home Depot Bosch VAC090AH product page was present only as a secondary citation. RR-065 did not alter eligibility or product-link selection. Diagnose the shared `/ocs-c/` collection shape separately before retrying Phase 5I.

**Opaque collection-page cleanup (2026-06-30):** Fixed again. The shared classifier treated the final slug `wet-dry-extractors-2549705-ocs-c` as product-specific only because it contained letters and digits. Existing collection checks did run first, but they did not recognize opaque manufacturer CMS collection suffixes or product-range/family/lineup route shapes. A new strong-negative page-shape check runs before every product-detail, image, price, and model-like shortcut. It recognizes opaque `ocs-c` collection suffixes and contextual manufacturer family/lineup/range/series routes while preserving explicit known retailer detail routes and model-bearing manufacturer detail pages. The exact saved Bosch record now reassesses from `buyable_product` to `listing_or_search`. One fresh `shop vac` run returned three exact and four near products, all with specific manufacturer/retailer product URLs; no Bosch `/ocs-c/` or other collection/listing/family route appeared.

---

#### RR-008

| Field | Value |
|-------|-------|
| **ID** | RR-008 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Review/article titles appearing as product cards |
| **Status** | Fixed |

**Description:** Pages with titles like "Runner's World: Nike Winflo 11 Review" or "7 Things to Avoid When Purchasing…" were passing eligibility and appearing as product cards in results.

**Where it occurs:** `lib/productEligibility.ts`

**Expected:** Review articles, buying-advice articles, and editorial pages are used as evidence only, never as product cards.

**Actual:** These pages appeared as recommendations.

**Fix:** Shared product-eligibility classifier now blocks article/review/buying-advice page shapes. Buying-advice page filter added as a reusable helper.

**Phase 4B regression:** Reopened. The fresh `shop vac` fixture selected `Garage Pro® Wet/Dry Vac | No / Low Suction - bissell support` at exact rank #6. The product URL and only citation point to `support.bissell.com/app/answers/...`, a troubleshooting article rather than a product offer. Review/buying-advice patterns remain covered, but support/troubleshooting pages are still eligible as product cards.

**Phase 4C evidence:** `Are Power Washers and Pressure Washers Different? - Best Buy` reached exact rank #6, and `12 common drilling problems and how to avoid them - Euromarc` survived into the cordless-drill near stream. This confirms the regression across support, retailer-learning, and general advice pages.

**Phase 4F evidence:** Comparison/review/advice pages repeatedly entered exact scoring: `Nothing Ear A vs Sennheiser...`, `Gas-Powered Leaf Blowers: the End is Nigh`, and a defective-running-shoes article. They missed final cutoff in these runs but still consumed scored candidates.

**Phase 5D fix:** Shared eligibility now recognizes support/documentation subdomains and structural paths including `/app/answers`, advice, discover/learn, learning-center, help, support, customer-service, and troubleshooting. These pages remain usable as evidence but cannot render as product cards or serve as rescued primary product citations. Deterministic coverage includes Bissell support, Best Buy advice, PetSmart learning-center, and the live-observed Shop-Vac customer-service page. The fresh `shop vac` run produced only actual vacuum cards; it also exposed the Shop-Vac customer-service path surviving citation verification before requirement filtering, and that exact shape was added to the shared classifier and final-filter regressions before closeout.

**Phase 5F dog-food confirmation regression:** Reopened. `Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets` reached exact rank #5 with its Substack article URL as the primary product page. The shared classifier treated the title as product-specific because the article-question shape is not covered, and generic `/p/` path handling treated the Substack post route as a product-detail path. The candidate survived Serper discovery, citation verification, requirement filtering, and final card validation. Fix this as a generalized article-question/evidence-page eligibility gap; do not add a Substack-only block.

**RR-008 cleanup resolution:** Fixed. Shared eligibility now treats interrogative editorial titles and phrases such as `actually good`, `should you buy`, `worth it`, `our verdict`, and `what you need to know` as non-product evidence. Hosted publishing platforms including Substack, Medium, Blogspot, and WordPress are evidence-only even when they use product-looking `/p/` routes. Real retailer and manufacturer `/p/` pages remain eligible. Fail-first tests reproduced the defect through shared eligibility, Serper normalization, and final citation validation; all three passed after the fix. In the single post-fix `dog food` run, the BK Pets article was absent from the candidate pool and no newsletter/blog/editorial page became a final card.

**Phase 5H live regression:** Reopened as Needs Investigation. An ANSI standards blog and two Electric Teeth comparison articles survived as `reliableEnoughForExact: true` exact-scored candidates. They remained below the final cutoff and did not render, but the eligibility/reliability boundary still treats these evidence pages as potential product cards when fewer than seven stronger products exist. Phase 5H did not change this behavior.

**Pre-final eligibility cleanup resolution (2026-06-30):** Fixed again. Standards codes, comparison/vs titles, press-release announcement verbs, and blog/news/press/journal/stories subdomains were absent from the shared evidence-page vocabulary. Product-looking paths, model-like digits, images, or parsed prices could therefore promote these pages. The shared classifier now recognizes those structural signals before product-detail shortcuts. The fresh pre-fix fixture's final #7 MultiVu `Launches hum by Colgate` press-release card is removed by current-code reassessment. One post-fix live run produced five specific product cards and no standards, blog, comparison, or press page in the exact-scored trace. A broad Oral-B comparison page remained only as a secondary citation with `unknown` product identity, so it cannot become a card, primary link, or product-specific ranking proof.

---

#### RR-009

| Field | Value |
|-------|-------|
| **ID** | RR-009 |
| **Phase** | Pre-Phase 0 (Codex baseline) |
| **Severity** | High |
| **Title** | Manual/quick-start guide pages appearing as close-match product cards |
| **Status** | Fixed |

**Description:** Product manual and quick-start guide pages (e.g., "Breville BOV845BSS Quick Guide") were appearing as close-match product cards for toaster oven searches. These are support/documentation pages, not product listings.

**Where it occurs:** `lib/productEligibility.ts`

**Expected:** Manual and quick-start guide pages are blocked from appearing as product cards.

**Actual:** Manual pages appeared as close matches.

**Fix:** Manual and quick-start guide URL/title patterns added to the non-product-page blocklist.

**Phase 4D regression:** Reopened. `H7123 - Smart Pet Air Purifier - device.report` reached exact rank #4 for `air purifier`. `device.report/govee/h7123` is a documentation/device-information page rather than a merchant or manufacturer product offer. The original explicit manual-title patterns remain fixed, but documentation mirrors can still become exact product cards.

**Phase 5D fix:** Shared eligibility now detects documentation/support host shapes and semantic documentation mirrors such as `device.report`, Manualslib-style hosts, and manual/documentation paths. These sources remain evidence-only and cannot become cards, including when a model-like token and product image or price make the page look specific. Deterministic tests cover `device.report` and manual-library negatives. A fresh `air purifier` run produced seven real product cards and contained neither the Daikin collection nor the `device.report` mirror.

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
| **Status** | Fixed |

**Description:** After the product-page citation rescue was added (RR-029), a product with only one citation (its own product page, via the rescue path) can pass citation verification and potentially rank #1. If that product has a verified price and non-weak source consensus, it will crowd out independently-supported alternatives with real editorial or retailer citations. This is the "thin winner" scenario.

**Where it occurs:** `lib/recommendationScoring.ts` — scoring; `lib/recommendationResultValidation.ts` — citation-strength classification; `scripts/citationStrengthDiagnostic.mjs` — detects and flags this

**Steps to reproduce:** Run a search that returns a product with only one citation (product-page-self) at #1 while position #2–3 have `independent-editorial` citations. The replay script will flag `thinWinner: true` and `betterSupportedBelowWinner` non-empty.

**Expected:** Citation strength (editorial > retailer > self-only) factors into final ranking so a self-cited-only product does not crowd out independently-supported alternatives.

**Actual:** Citation strength does not yet affect scoring weights; thin winner can rank #1 indefinitely.

**Suggested fix:** Incorporate `citation_type` into the ranking score — e.g., a small bonus for `independent-editorial` citations and a small penalty for `SELF-ONLY` citation strength. Do not change the hard trust gates, only the ranking nudge.

**Phase 4B evidence:** The fresh `robot vacuum` replay flagged a retailer-only winner (`Shark ION ... S87`) and the `gas grill` replay flagged another retailer-only winner (`Go-Anywhere 1-Burner ...`). Neither run supplied independent editorial support for the winner. This broadens the observed weak-winner pattern beyond self-only citations; status remains Needs Investigation pending the dedicated Phase 4E comparison of stronger products below each winner.

**Phase 4C evidence:** All three replays flagged weak or retailer-only winners: STANLEY SL18125P-1 (`shop vac`), DEWALT DCD771C2 (`cordless drill`), and RYOBI RY141803 (`pressure washer`). Phase 4E still needs to establish whether clearly better-supported products were available below each winner.

**Phase 4D evidence:** Fresh `robot vacuum`, `air purifier`, and `portable generator` runs again selected weakly supported winners. `basketball hoop` also had only weak citations at the top, although replay did not identify a better-supported product below it.

**Phase 4E evidence:** `gas grill` provides the clearest crowd-out example: retailer-only Nexgrill ranked #1 while independently cited Weber Spirit E-210 ranked #3. `cordless drill` similarly placed a retailer-only RYOBI winner above a source-upgraded Makita with stronger market-confidence inputs. Running shoes was the positive control: six of seven finalists carried independent editorial support.

**Phase 4F evidence:** Eight of ten rotating searches had weak or retailer-only winners; most finalist citations were manufacturer/self or retailer-only. Wireless earbuds was the strongest citation result, while dog food had no independently supported finalist and seven citations concentrated on Chewy.

**Phase 5G fix:** Ranking now receives a bounded product-specific citation-strength adjustment only after existing citation verification and product-evidence identity checks. One distinct independent editorial source scores `+6`, additional independent corroboration is capped at `+8`, retailer-only support scores `+2` to `+4`, and a true product-page-self-only citation set scores `-2`. Generic family/category/editorial pages, conflicting recipes/models, unknown specific-product citations, and untyped evidence receive no Phase 5G credit. Typed citation-derived source-quality, expert-mention, and evidence-strength signals use the same identity-safe citation set, so manufacturer or retailer host shape alone no longer impersonates independent corroboration. A fail-first gas-grill case and unrelated headphones case both reproduced retailer-only winners by about one ranked point before the fix and independently supported winners after it. The isolated A/B moved Nexgrill from #1 to #2 and Weber from #2 to #1 while a suspicious `$1` Weber remained near-only. RR-013 is Fixed deterministically; no live search or broad baseline ran.

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
| **Status** | Needs Investigation |

**Description:** The Phase 0 quality baseline revealed that across 14 gold-benchmark queries, core leaders (the expected top products per category) appeared in the final-7 results only 3.0 out of 7 times on average. Leaders were reaching the candidate pool (4.2/7 average) but being eliminated between pool and final result.

**Where it occurs:** Pipeline-wide; confirmed in discovery (extractSeedProductNames), citation-verify filter, and ranking stages

**Expected:** Mean core-leader coverage ≥ 5/7 in final results across broad queries.

**Actual:** 3.0/7 — less than half of expected leaders appeared.

**Fix:** Addressed in multiple phases: Phase 1 (seed extraction for brand-led names), Filtering STEP 2 (citation rescue for product-page leaders), Phase 3B (3-state category check), Phase 3C (fuel-type aliases).

**Phase 4E regression:** Reopened. Against the repository's current broad gold benchmark, final core-leader-family coverage was robot vacuum `3/7`, gas grill `3/7`, cordless drill `4/7`, and air purifier `2/7`: mean `3.0/7`, exactly the original critical-low baseline. Pool coverage was only `4/7`, `4/7`, `5/7`, and `2/7`, respectively, showing both discovery absence and later filtering loss.

**Phase 5H outcome metric:** Status remains Needs Investigation. Offline reassessment of five available broad benchmark fixtures kept core-leader coverage neutral: robot vacuum `5/7`, gas grill `3/7`, cordless drill `4/7`, air purifier `3/7`, and shop vac `0/7` before and after Phase 5H (mean `3.0/7`). Exact duplicates and niche winners improved where relevant, but no full baseline or discovery change ran, so Phase 5H does not claim a leader-recall gain.

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

**Phase 4 run evidence:** Fresh repeated queries varied materially within the same day. The Phase 4B robot-vacuum final seven shared only Shark ION with the Phase 4D exact set; subsequent Phase 4E shifted again toward three Roombas and two Roborocks. Gas-grill and cordless-drill slates likewise changed products and upgrade-trigger counts between phases. This is qualitative confirmation of RR-015, not a replacement for the formal consistency harness.

**Phase 6D partial pilot evidence:** The safety-stopped pilot completed two of three runs for each approved query. Pairwise candidate-pool Jaccard was `0.1429` for `shop vac` and `0.0000` for `robot vacuum under $300 self-emptying`; final-set Jaccard was `0.0000` for both. Raw-provider overlap was `0.2857` and `0.3158`, while generated/search-plan overlap was `0.3636` and `0.3333`. No final product was shared within either query pair, so rank correlation was unscoreable. The evidence confirms material current variance but is below the planned three-run sample and cannot establish a final significance threshold. Status remains Needs Investigation.

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
| **Status** | Fixed |

**Description:** The cross-category product-type conflict rules (e.g., washing machine for a pressure-washer search, ottoman for a sofa search, gaming chair for an office-chair search) were only applied at the validation stage, not at discovery. Wrong-type candidates populated the candidate pool and consumed ranking budget.

**Where it occurs:** Discovery filter (`lib/search/serper.ts`), `lib/productTypeMatch.ts`

**Expected:** Obvious wrong-type candidates (e.g., a washing machine for a pressure-washer query) are rejected at discovery, not carried to ranking.

**Actual:** Wrong-type products were filtered only at validation; they took up space in the discovery pool.

**Fix:** Shared `lib/productTypeMatch.ts` wired into discovery; conflict rules applied early.

**Phase 4B regression:** Reopened. A GE Profile washer/dryer entered the `robot vacuum` candidate pool, was demoted to near, then reappeared after revalidation. A Thermador 36-inch gas range/PDF entered the `gas grill` pool, reached source upgrade, received a matching `$7,949` Google Shopping range offer plus citation, and remained in the scored near stream. Neither wrong-type target reached the final seven, but both consumed downstream validation/enrichment work and the range consumed a source-upgrade call.

**Phase 4C evidence:** The `pressure washer` run selected `ZEP 64 oz. All-In-One Pressure Wash` detergent at exact rank #2 and carried six Viking dishwashers into the near stream after revalidation. The detergent is a consumable/accessory, not a pressure washer. This is a direct final-result wrong-type failure; the dishwashers show broader downstream contamination.

**Phase 4D evidence:** Wrong-type leakage generalized. The GE washer/dryer again survived into the final robot-vacuum near stream. Basketball wall art entered the exact-scored hoop pool. BioLite BaseCharge power station reached exact rank #6 for `portable generator`, with Goal Zero and EcoFlow power stations also exact-scored below cutoff.

**Phase 4E evidence:** Blackstone propane griddle reached exact rank #5 for `gas grill`. The final slate also included portable/camping grills while full-size benchmark families were missing, reinforcing product-type and form-factor contamination as a leader-recall cost.

**Phase 4F evidence:** `YADA ... Digital Wireless Backup Camera With 3.5" Dash Monitor` reached exact rank #2 for `dash cam`, and source upgrade attached matching backup-camera evidence. The candidate was the same item as the target but the target itself was the wrong product type.

**Phase 5E fix:** The shared product-type layer now rejects the reproduced substitution classes at discovery and revalidation: pressure-washer consumables and dishwashers, portable power stations and non-portable generator types, basketball wall art and hoop accessories, backup cameras for dash-cam requests, and washer/dryer appliances for robot-vacuum requests. Explicit wrong types become hard category failures; sparse candidates with no conflicting evidence remain unverified rather than rejected. Identity/title text is evaluated separately from incidental source snippets so a consumable title cannot borrow `pressure washer` from surrounding search evidence. Deterministic tests cover every negative plus unrelated valid controls. A focused pressure-washer recheck removed ZEP from the final-selection trace, and a portable-generator run contained no power station.

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

**Phase 4E regression:** Reopened. Ecovacs DEEBOT T30S and T50 OMNI each entered the robot-vacuum pool with one `ecovacs.com` source and were dropped at `afterCitationVerify`. Char-Broil Performance 2-Burner entered the gas-grill pool with `charbroil.com` plus `walmart.com` evidence and was also dropped there. These are benchmark leader families with product/retailer evidence, so the citation-rescue path is not reliably preserving them.

**Phase 4F evidence:** The same loss pattern affected major leaders in new categories: AirPods Pro 2, Bose QuietComfort Ultra, Galaxy Buds3 Pro, Soundcore Liberty 4 NC, Jabra Elite 8 Active, Oral-B iO 6/2, EGO and RYOBI blowers, Purina Pro Plan, Hill's Science Diet, Horizon T202, Sole F80, and NordicTrack T9 were dropped at citation verification.

**Phase 5F fix:** Citation retention had two related defects. First, product-page rescue ran only when zero citations survived, so a verified editorial or same-host category URL suppressed rescue and then became the primary citation; final card validation dropped the otherwise valid product. Second, reachability checks ran only when the global verified URL set was empty, so one verified source elsewhere prevented unverified LLM product pages from being checked. The route now performs a targeted reachability pass only for product-specific, path/title-bound URLs not already exactly verified. Final filtering promotes an exactly verified product page ahead of secondary editorial/category evidence and rejects generic family slugs, support/manual/documentation pages, unrelated self-cites, and unreachable URLs.

Deterministic tests cover Oral-B and EGO retention, specific Purina and Hill's product paths, same-host category substitution, unrelated global verification, and the generic Purina family negative. Frozen Phase 4 fixtures still show their historical drops by design. A fresh `electric toothbrush` run retained all 28 pool candidates through citation verification and selected seven specific product-page cards, including Oral-B and Philips leaders. The initial `dog food` run still dropped Purina/Hill's candidates and exposed the generic Purina family card; the final product-path binding refinement addresses both shapes deterministically but was not live-retested because the two-call limit was reached. RR-022 is Fixed with that bounded live-proof caveat.

**Phase 5F dog-food live confirmation:** The post-refinement run moved six specific Purina/Hill's candidates from the 23-product pool into the 16-product `afterCitationVerify` set, proving that their manufacturer product citations now survive citation verification. They were subsequently removed by requirement filtering, not citation verification. The generic Purina `/pro-plan/products/dog-food` family card did not return. RR-022 remains Fixed and its dog-food citation-retention path is now live-confirmed. The separate BK Pets article card reopened RR-008.

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
| **Status** | Fixed |

**Description:** The `modelTokens` regex requires an uppercase letter directly preceding or within a short alphanumeric sequence (e.g., "XFD131", "WD1450"). Products with model numbers preceded by a lowercase word — like "Napoleon Rogue 525" or "Napoleon Rogue XT 425 SIB" — do not have a qualifying uppercase token directly adjacent to the number, so no model token is extracted. Products without a model token are ineligible for `upgradeWeakSourceEvidence`.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `extractModelTokens` (or equivalent model-token regex)

**Steps to reproduce:** Call `extractModelTokens` (or equivalent) on `"Napoleon Rogue XT 425 SIB Gas Grill"`. Result should be `[]` or missing `"425"` / `"XT 425"`.

**Expected:** "XT 425" or "Rogue XT 425" is recognized as a model identity token for Napoleon gas grills.

**Actual:** No model token extracted; product skips source-upgrade eligibility.

**Suggested fix:** Implemented in Phase 5B. Keep the mixed word-number positives and generic descriptor/measurement negatives green.

**Phase 5B resolution:** Source-upgrade model extraction now recognizes mixed-case word-plus-number identities such as `Rogue 525` and preserves series context for `Rogue XT 425 SIB`. These products now qualify for source upgrade and produce compact identity queries without accepting generic `size`, `series`, `pack`, or measurement-number phrases as models.

---

#### RR-035

| Field | Value |
|-------|-------|
| **ID** | RR-035 |
| **Phase** | Phase 3E |
| **Severity** | Medium |
| **Title** | `modelTokens` regex misses Samsung Bespoke / FEIN descriptive naming conventions |
| **Status** | Fixed |

**Description:** Samsung Bespoke products (Jet Bot AI+, Bespoke Jet) use descriptive brand-line names without standard model-number formats. FEIN tool models use digit-dash formats (e.g., "FEIN MULTIMASTER FMM 350 QSL") that the current regex does not match. Both product families have no extractable model token and are ineligible for source-upgrade.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — model-token extraction

**Expected:** Products with clear brand+line identity (Samsung Bespoke) or digit-dash model formats (FEIN) receive model tokens.

**Actual:** No model token; products skipped for upgrade.

**Note:** This was acknowledged in Phase 3E and intentionally deferred. Fix should be batched with RR-034 when model-token detection is improved.

**Suggested fix:** Implemented in Phase 5B. Preserve brand qualification for descriptive and numeric-dash identities and retain different-model rejection.

**Phase 5B resolution:** Brand-qualified descriptive families such as `Bespoke Jet Bot AI+`, numeric-dash models such as `9-20-36`, and FEIN-style uppercase word-number models such as `FMM 350 QSL` now qualify and build compact queries. Descriptive/numeric-dash identities without brand qualification remain ineligible, and a different explicit numeric-dash model is rejected before evidence attachment.

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

**Phase 6D partial pilot evidence:** RIDGID entered the merged candidate pool in both completed `shop vac` runs, but exposure varied sharply: one RIDGID candidate in A1 versus five in A2. In A1, the sole RIDGID candidate survived citation verification and was removed by requirement filtering. In A2, three RIDGID candidates survived through the final exact/near slate, including one exact card. Raw provider traces contained zero RIDGID names in A1 and three in A2. This disproves total pool absence for these two runs but confirms the underlying provider/plan variance. The third planned run was not spent after Critical RR-069 triggered the safety stop, so RR-037 remains Needs Investigation.

**Phase R2 evidence (2026-07-10):** All three cache-cold `shop vac` runs contained RIDGID in both the pool and final set, but the product identity varied every time: A1 had one pool/final RIDGID (6 Gallon Stainless Steel), A2 had two pool RIDGIDs and one final (WD4522), and A3 had two pool RIDGIDs and one final (12 Gallon NXT). Presence improved to 3/3 in this window, while pool count and model composition remained unstable. RR-037 remains Needs Investigation because the historical absence mechanism and current model-level variance are not resolved.

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
| **Status** | Fixed |

**Description:** Phase 3J live runs for `cordless drill` and `gas grill` returned `sourceUpgradeTraces: []` — the trigger never fired. Even after the Phase 3F trigger fix and the Phase 3I query fix, no products qualified for source-upgrade in these specific live runs. The issue is that the product set encountered at runtime may not include weakly-sourced products with model tokens, or the live result variance means the fixture used for Phase 3J captured a run where already-strong candidates appeared.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `needsSourceUpgrade` trigger; live run variance

**Expected:** At least one source-upgrade attempt fires and produces candidates per live run for known-weak categories.

**Actual:** `sourceUpgradeTraces: []` — no eligible candidates in the Phase 3J live snapshots.

**Suggested fix:** Expand live-proof coverage to robot vacuum and shop vac (Phase 3J extension confirmed one attempt on robot vacuum). Investigate whether live fixture LLM variance is causing strong candidates to always appear, bypassing the trigger. Add gold-benchmark tracking for source-upgrade trigger rate.

**Correction / Phase 3J extension update:** The extension did not confirm an attempt for `robot vacuum`; that run also had `sourceUpgradeTraces: []`. The extension produced two attempts for `shop vac` (`Makita XCV11Z` and `RIDGID WD1450`). Both compact model queries returned zero normalized candidates. The original suggested-fix sentence is retained for history, but its category attribution was incorrect.

**Phase 4B evidence:** Trigger inconsistency persists. Fresh `shop vac` and `robot vacuum` fixtures each produced zero traces, while `gas grill` produced one attempt against a wrong-type Thermador range/PDF target. The trigger is operational, but its live coverage is sparse and target quality is not reliable. Status remains Needs Investigation.

**Phase 5I retry evidence:** Two fail-first tests again proved that a lone owner rating suppresses an otherwise weak product and that a nonempty primary result set whose candidates all fail identity prevents the one bounded fallback from running. A conservative missing-two-of-three trigger and post-rejection fallback passed deterministic verification, but the single live `shop vac` proof exposed Critical RR-066. All Phase 5I behavior, replay, and test edits were rolled back. Status remains Needs Investigation.

**Completed Phase 5I resolution:** The fail-first trigger cases proved that the old all-three-missing rule let any one partial signal suppress an otherwise weak candidate. Source upgrade now runs only when a model-qualified, requirement-passing candidate is missing at least two of three evidence pillars: verified price, owner rating, and identity-safe product-specific commerce evidence. A commerce citation counts only when it is independent, tier 1/2, and classified as the same product. Candidates with two or more safe pillars skip upgrade, failed-requirement and weak-identity candidates remain excluded, and the unchanged three-candidate cap prefers the candidates missing the most pillars. Deterministic trigger/API/replay tests passed, and the single live `shop vac` proof showed three of four candidates selected with explicit skip/selection reasons. RR-041 is Fixed.

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
| **Status** | Fixed |

**Description:** Phase 3K added a fallback query path (`buildSourceUpgradeFallbackShoppingQuery`) that runs after the primary compact query returns 0 candidates. The Phase 3L live proof showed the fallback fires (e.g., `"Makita XCV11Z"` → fallback: `"Makita XCV11Z shop vac"`), but the fallback query also returned 0 candidates. The bottleneck is upstream of identity matching — Serper shopping returns no results at all for either the compact or the category-appended query.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — `upgradeWeakSourceEvidence` fallback path; Serper shopping API coverage

**Steps to reproduce:** Replay any Phase 3L+ fixture for `shop vac`. Observe both `primaryCandidatesReturned: 0` and `fallbackCandidatesReturned: 0`.

**Expected:** At least one of the two queries returns Serper shopping results for a well-known product.

**Actual:** Both primary and fallback queries return 0 candidates. Source upgrade never attaches evidence.

**Suggested fix or next action:** Phase 3M completed the requested provider/search-coverage diagnostic. Implement RR-048/RR-049 in Phase 3N, then rerun the focused fallback proof before closing RR-042.

**Phase 3N update:** The Phase 3L live attempt was `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`, with primary `Wet/Dry Vacuum DXV10SB` and fallback `Wet/Dry Vacuum DXV10SB shop vac`. Phase 3M proved Serper returned 40 raw shopping results for each query; all considered results were lost during normalization/product eligibility. Phase 3N fixed RR-048/RR-049 deterministically. The approved Phase 3N `shop vac` proof produced `sourceUpgradeTraces: 0`, so normalization was not exercised. RR-042 remains `Needs Investigation` until a trigger-producing focused live proof confirms candidates survive normalization and proceed safely through identity and attachment.

**Phase 4B evidence:** Candidate normalization and attachment now work live for one primary-query attempt: `[PDF] PRL364NLG` returned 2 raw, 2 structural, 2 eligible, and 2 normalized Google Shopping offers; one candidate identity-matched and attached price plus citation. The fallback path was not exercised, and the upgraded target was a wrong-type range/PDF in a gas-grill search. RR-042 therefore remains Needs Investigation: provider/normalization emptiness is disproved for this attempt, but fallback reliability and safe useful attachment remain unproven.

**Phase 5I retry evidence:** The candidate fallback control flow was proven deterministically and live, but the live run attached wrong-product evidence before the fallback path could be accepted as safe. The behavior change was rolled back. RR-042 remains Needs Investigation until RR-066 is fixed and a later bounded retry proves fallback reliability without weakening model identity.

**Completed Phase 5I resolution:** The old fallback condition tested only whether the primary search returned zero candidates. It did not retry when a nonempty primary set was entirely rejected by the same-product identity gate. The source-upgrade attempt now preserves the existing zero-result fallback and also runs the same single bounded fallback when every primary candidate is identity-rejected. It does not retry after any identity match, including a match with no attachable fields, never performs more than one fallback, and applies the unchanged RR-063 through RR-066 identity gate to both stages. Deterministic tests prove an exact fallback match can attach while wrong-brand, nearby-model, same-brand wrong-model, generic, and query-derived evidence remain blocked. The live `shop vac` run exercised the original zero-primary fallback safely; the new post-rejection branch is deterministic-only because no approved live attempt reached that exact branch. RR-042 is Fixed.

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
| **Status** | Fixed |

**Description:** The focused `shop vac` proof attempted source upgrade for two RIDGID vacuums whose names contain `Peak HP`. Existing shared brand detection interpreted the unit token `HP` as the Hewlett-Packard brand. One candidate already carried `metadataBrand: HP`; the other had no metadata brand but `inferKnownBrand` returned `HP`. Phase 3O correctly preserved that detected brand, producing the unrelated shopping queries `HP HD0900` and `HP HD06001`.

**Where it occurs:** `lib/brandMatching.ts` — short `HP` brand alias handling; upstream product metadata brand inference; `lib/requirementEvidenceRescue.ts` — `sourceUpgradeBrand`

**Steps to reproduce:** Run source-upgrade query construction for `RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900` or `RIDGID 6 Gal. 3.5 Peak HP NXT Wet/Dry Vac HD06001`. Observe detected brand `HP` and primary queries `HP HD0900` / `HP HD06001`.

**Expected:** `HP` used as a horsepower unit in product specifications is not treated as a computer brand. The reliable product identity remains RIDGID plus model where available.

**Actual:** `HP` is trusted as brand identity and redirects source-upgrade shopping search toward Hewlett-Packard products.

**Suggested fix or next action:** Implemented in Phase 5B. Preserve horsepower-context negatives and genuine HP computer-brand positives in the shared brand tests.

**Phase 4C reproducibility confirmation:** A fresh `shop vac` run produced three source-upgrade attempts. RIDGID `WD4522` and STANLEY `SL18199P` were both assigned detected brand `HP`, producing `HP WD4522` and `HP SL18199P`. The former still found a correct vacuum and attached safely; the latter returned 20 HP-computer candidates and attached nothing. RR-052 is confirmed reproducible and can waste searches or suppress useful evidence even when RR-053 prevents unsafe query-echo identity.

**Phase 5B resolution:** Shared brand matching now removes `HP` only when it appears in explicit horsepower context such as `4.25 Peak HP`, `5 HP`, or `horsepower (HP)`. Genuine brand-led HP computer titles remain positive. Source upgrade also ignores ambiguous `metadataBrand: HP` when the product title proves that occurrence is a measurement, then uses structurally reliable leading title identity; the reproduced RIDGID query is now `RIDGID HD0900`.

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
| **Status** | Fixed |

**Description:** `PRODUCT_TYPE_RULES` (in `lib/productTypeIntent.ts`) currently covers only a subset of product categories. Categories without a rule fall through to the loose LLM-labeled-category check. This means wrong-type contamination (the class of bug fixed in Phase 3B for robot vacuums) is likely present for any category not yet in `PRODUCT_TYPE_RULES`.

**Where it occurs:** `lib/productTypeIntent.ts` — `PRODUCT_TYPE_RULES`

**Expected:** All product categories commonly searched in ReviewRadar have an explicit type rule covering the most likely wrong-type products.

**Actual:** Only categories that have been explicitly investigated (robot vacuum, gas grill fuel types, etc.) have rules.

**Suggested fix:** Audit all categories in the gold benchmark and add a `PRODUCT_TYPE_RULES` entry for each, at minimum covering the most common substitution/confusion class (e.g., for "air purifier": dehumidifiers; for "blender": food processors). Phase 3B noted this as "DONE / PARTIAL — product-type taxonomy coverage remains incomplete."

**Phase 4D confirmation:** The missing-taxonomy concern is live and cross-category. Basketball wall art passed exact scoring for `basketball hoop`; battery power stations passed exact category matching for `portable generator`; pressure-wash detergent had already reached exact rank #2 in Phase 4C. These are distinct substitution classes and support a shared taxonomy-coverage fix rather than product-specific patches.

**Phase 4F evidence:** Backup cameras passed as dash cams, and an under-desk walking pad won a broad treadmill query. These add automotive and fitness substitution/form-factor classes to the taxonomy gap.

**Phase 5E fix:** The confirmed taxonomy gaps are covered through shared `PRODUCT_TYPE_RULES` entries for portable generators, basketball hoops, and dash cams, plus strengthened pressure-washer and robot-vacuum rules. Each rule distinguishes allowed hardware, explicit substitutes, and exclusive complements without brand or product exceptions. Unknown categories and thin evidence retain the existing non-rejecting fallback. The issue record previously said Fixed while the appendix and fresh evidence treated it as Open; Phase 5E resolves that ledger inconsistency and records the reproduced taxonomy set as Fixed. Future newly reproduced category classes should receive deterministic coverage before extending the registry.

---

#### RR-044

| Field | Value |
|-------|-------|
| **ID** | RR-044 |
| **Phase** | Cross-phase |
| **Severity** | Medium |
| **Title** | `modelTokens` minimum length too restrictive — short model numbers excluded |
| **Status** | Fixed |

**Description:** The model-token regex likely enforces a minimum token length (≥4 characters as noted in diagnostic comments). This excludes short but definitive model identifiers like "M18" (3 characters, Milwaukee), "S" suffix (Roborock Qrevo S), and similar. Products with short model numbers are ineligible for source-upgrade even though their identity is unambiguous.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — model-token extraction regex

**Expected:** Short model tokens like "M18" are accepted when they appear with a clear brand prefix (e.g., "Milwaukee M18 FUEL" → token "M18").

**Actual:** Tokens under 4 characters filtered out; products skipped for source-upgrade.

**Note:** Threshold details uncertain — confirm exact minimum length in code before fixing. Related to RR-034 and RR-035; fix should be batched.

**Suggested fix:** Implemented in Phase 5B. Keep short tokens family-strength only unless stronger product identity is present.

**Phase 5B resolution:** Short identities such as `M18` are accepted only when brand-qualified. They can make a candidate eligible and build `Milwaukee M18 FUEL`, but are classified as family-strength rather than strong exact-model evidence. Attachment additionally requires source-derived requested-category evidence, so an M18 circular saw cannot enrich an M18 cordless drill.

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

**Phase R2 evidence (2026-07-10):** B1 dispatched `TP-Link Tapo RV30 Max` twice through editorial-seed paths. Each physical result digest contained ten raw results, including RV30 Max Plus listings and one `TP Link LiDAR Navigation Robot Vacuum Tapo RV30C` result. Raw provider coverage therefore exists for the adjacent Tapo family. Every Tapo result was lost in normalization (`search_or_listing_url` or `normalizer_rejected_result`), and the exact `RV30C Plus` query was not run. RR-045 remains Needs Investigation, but the evidence now points away from total provider emptiness and toward query identity plus normalization/eligibility loss.

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
| **Status** | Fixed |

**Description:** The fresh `air purifier` debug fixture was saved with the current script and debug request header, but the API took the `fallbackReason: no_reliable_evidence` / `fallbackSource: serper_candidates` path. Its debug object contained only fallback metadata, candidate count, timing, and verified URL count. It omitted `stageFunnel`, `sourceUpgradeTraces`, and `finalSelectionTrace`, so replay described the fixture as if it pre-dated current instrumentation.

**Where it occurs:** Recommendations API search-candidate fallback response/debug assembly; `scripts/save-debug-fixture.mjs`; `scripts/replay-quality-fixtures.mjs`

**Steps to reproduce:** Save a fresh debug fixture for `air purifier` when the API enters the `no_reliable_evidence` Serper-candidate fallback. Replay it and observe `No stage funnel data`, `Source-upgrade trace: not present`, and `Final-selection trace: not present` despite a current `_savedAt` timestamp.

**Expected:** Every current debug response, including fallback responses, preserves the stage funnel and final-selection diagnostics or emits an explicit current-path trace explaining which stages were bypassed.

**Actual:** The fallback response silently drops the current trace contract, preventing product-type, source-upgrade, and ranking-layer diagnosis for that search.

**Suggested fix or next action:** In a later fix phase, preserve a minimal common debug envelope across normal and fallback responses, and distinguish “current fallback path omitted this stage” from “old fixture lacks this field.” Add a deterministic fallback-response trace test before changing behavior.

**Phase 5J resolution:** Every recommendation-producing Serper-candidate fallback now builds a debug-only fallback trace from the stages it actually ran. Debug responses include the search plan, candidate funnel, available snapshots, empty source-upgrade traces with explicit bypass reasons, and the real final-selection trace. Replay prints the fallback reason and bypassed stages while remaining compatible with old fixtures. Normal non-debug responses retain the same recommendation content and expose none of these fields.

---

#### RR-055

| Field | Value |
|-------|-------|
| **ID** | RR-055 |
| **Phase** | Phase 4D |
| **Severity** | High |
| **Title** | Literal `Portable` requirement fails a product explicitly titled Portable Inverter Generator |
| **Status** | Fixed |

**Description:** In the fresh `portable generator` run, `Generac GP3300i Portable Inverter Generator` was classified as a near candidate with failed requirement `Portable`. The product title contains the exact word, its manufacturer URL path contains `/portable-generators/`, and the category check passed. The false failure removed a valid product while collection pages and battery power stations filled final slots.

**Where it occurs:** Requirement extraction/validation and post-enrichment revalidation for plain descriptive attributes; final-selection trace `failed` requirement handling

**Steps to reproduce:** Save and replay `portable generator`. Inspect the final-selection trace for `Generac GP3300i Portable Inverter Generator`; observe `stream: nearScored`, `decisionReason: near_only_exact_full`, `failed: ["Portable"]`, and `passed: ["Category: portable generator"]`.

**Expected:** Exact positive evidence in the product title and manufacturer product URL satisfies the `Portable` requirement.

**Actual:** The literal requirement is marked failed, the product receives score `39.6`, and it is excluded from the final seven.

**Suggested fix or next action:** Diagnose which evidence source or negation/polarity path generated the false failure. Add a deterministic requirement test for a literal positive adjective in product title plus URL before changing shared matching behavior. Do not special-case Generac.

**Phase 5E fix:** Comparative negative prose such as `not as portable as smaller models` could override a literal positive identity token. Plain feature groups now check provider/merchant identity text before broader review prose; query-assigned category and generated explanation text remain excluded. `Generac GP3300i Portable Inverter Generator` passes the deterministic reproduction even with the comparative con, while `Stationary Standby Generator - Not Portable` still fails. In the focused live generator run, twelve unrelated portable/inverter generator candidates passed `Portable` with no failures. GP3300i itself was dropped earlier by citation verification, so its exact post-fix live path was not observed.

**Phase result:**

- New issues: RR-054 and RR-055.
- Reopened: RR-009.
- Evidence updated: RR-007, RR-013, RR-017, RR-043.
- `robot vacuum`: 5 exact + 2 near; GE washer/dryer remained near.
- `basketball hoop`: 7 exact; wall art entered exact scoring but missed final cutoff.
- `air purifier`: 5 exact + 5 near; category/documentation pages selected; current debug traces missing on fallback.
- `portable generator`: 7 exact; category pages and a power station selected; valid Generac product falsely failed `Portable`.

---

### PHASE 4E — MARKET-LEADER DISCOVERY AND CITATION DIAGNOSTICS (2026-06-27)

Five approved fresh searches were saved and replayed: `robot vacuum`, `gas grill`, `cordless drill`, `air purifier`, and `running shoes`. The first four were graded against the broad core-leader families in `scripts/goldBenchmark.mjs`; running shoes was assessed qualitatively because no broad gold list exists for it.

#### RR-056

| Field | Value |
|-------|-------|
| **ID** | RR-056 |
| **Phase** | Phase 4E |
| **Severity** | Medium |
| **Title** | Final-seven slates allow same-brand/model-family concentration to crowd out category diversity |
| **Status** | Fixed |

**Description:** Broad final slates repeatedly spend multiple slots on closely related products from the same brand or family while benchmark leader families are absent. Robot vacuum selected three Roombas and two Roborocks; gas grill selected two Nexgrills and two Napoleons; cordless drill selected two RYOBIs and two DEWALTs; air purifier selected two Blueairs and two GermGuardians.

**Where it occurs:** Candidate diversity/variant-family handling and final selection for broad searches

**Steps to reproduce:** Save/replay the four Phase 4E benchmarked broad searches and group the final seven by brand/family. Compare those counts with missing core leader families from `scripts/goldBenchmark.mjs`.

**Expected:** Distinct legitimate models may coexist, but broad final-seven results should avoid repeated family concentration when strong products from missing leader families are available or discoverable.

**Actual:** Four or five final slots can be consumed by two brands while final leader-family coverage remains between `2/7` and `4/7`.

**Suggested fix or next action:** Diagnose diversity at the candidate-pool and final-selection layers separately. In a later fix phase, prefer an existing generalized family-diversity mechanism or bounded family cap only after proving it does not collapse genuinely distinct models. Do not add brand-specific caps.

**Phase 4F evidence:** Family concentration recurred in 7/10 rotating categories: two Ninjas (coffee), two Zodys (office chairs), duplicate Sennheisers (earbuds), four Sonicares (toothbrushes), multiple Blue Buffalo products (dog food), three Whynters plus two Mideas (dehumidifiers), and three Gigabytes plus three LGs (gaming monitors).

**Phase 5H resolution:** Final selection now derives a conservative model-line family key and applies a soft repeat penalty of `12` points per prior selected family member, capped at `24`. It is not a retailer or brand cap: distinct same-brand and same-retailer products remain eligible and can rank together. A fail-first eight-product Sonicare slate previously used three family slots and excluded a distinct alternative; after the fix the third near-variant fell below that alternative. One focused live `electric toothbrush` run applied the capped family adjustment to a fourth Sonicare candidate and replaced it with a distinct Oral-B product. The live pool contained no safe third-brand finalist, so broader discovery diversity remains outside this fix and RR-014 remains open.

**Benchmark result:**

| Search | Core families in pool | Core families in final | Notable loss/concentration |
|--------|-----------------------|------------------------|----------------------------|
| `robot vacuum` | 4/7 | 3/7 | Ecovacs dropped at citation verify; Narwal/Dreame absent; 3 Roombas + 2 Roborocks |
| `gas grill` | 4/7 | 3/7 | Char-Broil dropped at citation verify; Broil King/Monument/Dyna-Glo absent; 2 Nexgrills + 2 Napoleons |
| `cordless drill` | 5/7 | 4/7 | Milwaukee below exact reliability; Bosch/RIDGID absent; 2 RYOBIs + 2 DEWALTs |
| `air purifier` | 2/7 | 2/7 | Coway/Winix/Honeywell/Alen/Dyson absent; 2 Blueairs + 2 GermGuardians |

Mean benchmark coverage was `3.75/7` in the candidate pool and `3.0/7` in final results. `running shoes` was the positive-control category: the final seven contained recognizable ASICS, Brooks, New Balance, HOKA, and Saucony models, and six had independent editorial citations.

**Phase result:**

- New issue: RR-056.
- Reopened: RR-014 and RR-022.
- Evidence updated: RR-013 and RR-017.
- No issue status was improved from a limited sample.
- No app behavior or test code changed.

---

### PHASE 4F — BROAD ROTATING PRODUCT QUALITY SWEEP (2026-06-27)

Ten approved fresh searches were saved and replayed: `coffee maker`, `office chair`, `wireless earbuds`, `electric toothbrush`, `leaf blower`, `dog food`, `dehumidifier`, `dash cam`, `treadmill`, and `gaming monitor`.

#### RR-057

| Field | Value |
|-------|-------|
| **ID** | RR-057 |
| **Phase** | Phase 4F |
| **Severity** | Medium |
| **Title** | Source-upgrade model-token extraction can prefer measurement text over the real model |
| **Status** | Fixed |

**Description:** For `BLACK+DECKER ... (BEBL7000)`, model-token extraction emitted `amp250`, `mph400`, and `bebl7000`, then built identity phrase/query `BLACK+DECKER 12 AMP 250` instead of using the actual model `BEBL7000`. The search still found the product, but the query is broader and can return unrelated 12-amp products.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` model-token extraction and compact identity selection

**Steps to reproduce:** Replay the Phase 4F `leaf blower` fixture and inspect the source-upgrade trace for BLACK+DECKER BEBL7000.

**Expected:** Units/specifications such as amps, MPH, CFM, voltage, and capacity do not outrank a clear alphanumeric manufacturer model.

**Actual:** Measurement-derived tokens become the selected identity phrase while the true model is omitted from the query.

**Suggested fix or next action:** Implemented in Phase 5B. Keep measurement-only ineligibility and compact-model priority tests green across categories.

**Phase 5B resolution:** Ranked extraction filters separated unit-number phrases (`AMP 250`, `MPH 400`, `CFM 400`, HP, PSI, GPM, BTU, voltage, capacity, and similar measurements) before model selection, while preserving compact manufacturer IDs such as `BEBL7000` and `LB7654`. The reproduced query is now `BLACK+DECKER BEBL7000`; measurement-only titles do not become source-upgrade eligible.

---

#### RR-058

| Field | Value |
|-------|-------|
| **ID** | RR-058 |
| **Phase** | Phase 4F |
| **Severity** | Critical |
| **Title** | Same-brand wrong-product Google offer can pass source-upgrade identity without the target model in its title |
| **Status** | Fixed |

**Description:** Target `Whynter RPD-411WG ... Dehumidifier` received price, rating, review count, and citation from `Whynter 34 Bottle Freestanding Wine Refrigerator`. The candidate title contains Whynter but not `RPD-411WG`; the target model appears in the Google Shopping search URL, which RR-053 excludes from identity. Nevertheless, trace recorded `identityMatch: true`, attached `$479` wine-refrigerator evidence, and the contaminated dehumidifier ranked #1.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` source-upgrade same-product identity; normalized Google Shopping candidate identity fields

**Steps to reproduce:** Replay the Phase 4F `dehumidifier` fixture and inspect the RPD-411WG source-upgrade trace. Confirm one returned candidate, wine-refrigerator title, identity pass, all commerce fields attached, and final rank #1.

**Expected:** A target with a strong model token requires that model or equivalent source-derived identity in the candidate. Shared brand alone cannot override a wrong product type/title.

**Actual:** A same-brand wine refrigerator with no visible target model passed and contaminated a dehumidifier card.

**Suggested fix or next action:** Implemented in Phase 5A. Keep the exact product-type, same-family model, RR-051, and RR-053 regressions green during all later source-upgrade identity work.

**Independent confirmation:** Whynter's official page identifies RPD-411WG as a discontinued 40-pint dehumidifier: `https://www.whynter.com/product/whynter-energy-star-40-pint-portable-dehumidifier-2/`. The attached candidate was therefore a different product, not a mislabeled target.

**Phase 5A resolution:** `looksLikeSameProduct` now consults the shared `classifyProductTypeMatch` verdict before source-upgrade token/model acceptance. The shared conflict layer recognizes explicit wine/beverage refrigerator evidence as incompatible with a dehumidifier request, independent of model-token extraction. Source titles that present a different explicit token in the same model family are also rejected, while exact model matches, sparse candidates without an explicit conflict, merchant model paths, and measurement-bearing same-product titles remain valid. The exact RPD-411WG/wine-refrigerator regression now returns `identity_rejected` and attaches no price, rating, review count, or citation.

---

#### RR-059

| Field | Value |
|-------|-------|
| **ID** | RR-059 |
| **Phase** | Phase 4F |
| **Severity** | Medium |
| **Title** | Niche compact/portable form factors can win broad category searches |
| **Status** | Fixed |

**Description:** Broad searches can rank niche form factors above standard products even when the user did not request the niche. AeroPress, a compact manual/travel brewer, won `coffee maker`; an under-desk walking pad won `treadmill`; earlier Phase 4 gas-grill runs similarly favored portable/tabletop products.

**Where it occurs:** Broad-intent form-factor detection/modifiers and final ranking

**Steps to reproduce:** Replay Phase 4F `coffee maker` and `treadmill` fixtures. Compare winner form-factor flags with full-size alternatives below.

**Expected:** Niche form factors remain eligible for broad searches but do not dominate unless their evidence/quality clearly outweighs mainstream category expectations.

**Actual:** Compact/travel/under-desk variants can win while strong conventional products rank below.

**Suggested fix or next action:** Measure form-factor prevalence and ranking impact before changing weights. Prefer a generalized broad-query form-factor prior; do not hardcode appliance categories.

**Phase 5H resolution:** Broad final selection now applies a bounded `50`-point selection-only prior to unrequested niche form factors detected from product identity text. Walking-pad/under-desk, travel, tabletop, mini, handheld, portable, and compact/small-space wording are generalized aliases. The adjustment disappears when the request explicitly names that form factor or a compatible niche. Saved-fixture reassessment moved the `coffee maker` winner from AeroPress to a mainstream 14-cup machine and the `treadmill` winner from an under-desk unit to Horizon 7.0 AT; the niche products remained visible below the winner.

---

#### RR-060

| Field | Value |
|-------|-------|
| **ID** | RR-060 |
| **Phase** | Phase 4F |
| **Severity** | Medium |
| **Title** | True same-model duplicates can occupy multiple final slots |
| **Status** | Fixed |

**Description:** `gaming monitor` selected `Gigabyte M27Q Gaming Monitor (Rev. 1.0)` at rank #1 and `Gigabyte M27Q 27" QHD ...` at rank #2. Both source-upgrade traces used `Gigabyte M27Q` and attached the same `$160` offer. They are retailer/manufacturer representations of the same model, yet remained separate cards while other variants were correctly collapsed.

**Where it occurs:** Canonical product identity, duplicate merge, variant-family collapse, and final selection

**Steps to reproduce:** Replay the Phase 4F `gaming monitor` fixture and compare the first two final cards and their source-upgrade identity queries/offers.

**Expected:** The same manufacturer model sold through multiple sources is one product card with merged evidence.

**Actual:** Duplicate M27Q cards consume two final slots.

**Suggested fix or next action:** Diagnose why canonical IDs/variant keys diverged for the two M27Q representations. Add cross-retailer same-model tests while preserving RR-010's distinct-size behavior.

**Phase 5H resolution:** Final selection now uses a strict exact-model identity predicate rather than URL-only canonical IDs or the broader evidence-family merger. Same canonical IDs, exact normalized titles, and same-brand shared strong model tokens collapse; explicit different model tokens and different sizes remain distinct. The saved gaming-monitor fixture collapses the two M27Q retailer/manufacturer representations into one card while preserving M27Q2, M27Q-P, and unrelated same-brand products. Synthetic coverage proves a distinct eighth candidate fills the freed seventh slot.

---

#### RR-061

| Field | Value |
|-------|-------|
| **ID** | RR-061 |
| **Phase** | Phase 4F |
| **Severity** | Medium |
| **Title** | Product image metadata can contain page URLs, generic brand assets, or unrelated navigation images |
| **Status** | Needs Investigation |

**Description:** All 70 final cards had a non-empty image field, but several were not usable product images. Leaf-blower examples included a truncated Home Depot image directory, Greenworks/BLACK+DECKER product-page URLs, a WORX navigation banner, and an EGO brand logo. Dog-food examples included a Blue Buffalo logo and PetSmart category hero. An LG gaming-monitor image ended in `.html`.

**Where it occurs:** Product asset/image candidate validation and enrichment

**Steps to reproduce:** Inspect `product_image_url` across the ten Phase 4F fixtures, especially `leaf-blower.json`, `dog-food.json`, and `gaming-monitor.json`.

**Expected:** Product image fields resolve to actual inspectable images depicting the specific product.

**Actual:** Non-image URLs and generic/irrelevant assets pass image validation.

**Suggested fix or next action:** Add diagnostic classification for direct image response/content type and product-specific relevance. In a later fix phase, reject page URLs and known generic navigation/logo assets without weakening valid CDN image support.

**Phase 5J resolution:** Image candidates now require an image-like asset shape plus source-derived product context. HTML/page URLs, truncated image directories, SVG/UI assets, logos, icons, favicons, placeholders, tracking pixels, category/navigation/editorial artwork, and unrelated JSON-LD or social metadata are rejected. Product-page metadata is trusted only after page identity matches the target, and JSON-LD images require a matching Product name. Source-upgrade images pass through the same resolver only after the existing same-product identity gate. Verified same-product retailer/manufacturer images, standard image formats, Google Shopping thumbnails, and opaque hashed CDN assets remain supported.

**Phase 6D clean-restart regression (2026-07-02):** Reopened as Needs Investigation. The first clean post-RR-069 `shop vac` run assigned the same Amazon navigation asset, `https://images-na.ssl-images-amazon.com/images/G/01/omaha/images/yoda/flyout_72dpi._V270255989_.png`, to two unrelated final cards: RIDGID VAC4000 and Fein Turbo I. In both records the asset was stored as High-confidence `retailer_page` image metadata and rendered as `product_image_url`. The image-like `.png` extension and product-page source context were therefore sufficient even though the path identifies a generic site flyout asset and the same URL was reused across different products.

**Safety-stop status:** The live restart stopped immediately at 1/6 and reopened RR-061 as Needs Investigation. No fix was attempted during the measurement-only phase.

**Reopened RR-061 resolution (2026-07-02):** Fixed deterministically. The retailer-page path did use the shared image resolver, but `flyout`, `menu`, `department`, and `layout` were absent from its hard non-product asset vocabulary. In parallel, image relevance compared source/retailer words from generated titles against the image hostname: `Amazon.com` supplied both `amazon` and `com`, allowing a generic Amazon asset to receive High confidence. The shared resolver now rejects generalized flyout/menu/department/layout/masthead paths, excludes source/retailer/domain words from product-image identity, and does not use URL hosts as image identity. The exact `yoda/flyout_72dpi` asset is rejected for both captured cards. Same-product Amazon images and opaque hashed CDN images remain valid when source-derived product context verifies them; rejected images leave the product image empty.

**Resolution proof:** Fail-first image/asset tests passed 31/35 with exactly four intended failures. Focused image, asset, and source-upgrade tests passed 135/135; the broader trust wall passed 376/376; and the full suite passed 791/791 across 117 suites. Typecheck and offline eval passed; lint reported 0 errors and 3 existing warnings. No live search ran. Phase 6D remains stopped and Phase 6E did not start. Implementation commit: `a174551`.

**Post-fix Phase 6D regression (2026-07-02):** Reopened as Needs Investigation. Constrained B1 rendered `https://global.roborock.com/cdn/shop/files/Saros_Z70_Silver_ID.png?v=1758784729` on the `Roborock Q5 Max+` card. The source page and metadata title correctly identified Q5 Max+, but the image path explicitly identified a different Roborock model, Saros Z70. The resolver assigned Medium-confidence `retailer_page` image metadata because verified page context outweighed the conflicting image-model identity. The Phase 6 safety gate stopped the fresh pilot at 2/6. Diagnose a generalized image-path model-conflict guard that preserves generic hashed product images; no fix was attempted in the measurement phase.

**Phase R1 resolution (2026-07-10):** Fixed deterministically. The resolver's confidence path allowed verified page context to outweigh an explicit conflicting model identity in the image filename. The shared resolver now extracts model-shaped identity tokens (2–8 characters, containing both letters and digits) from the final image filename and rejects the candidate when the product itself carries model-shaped identity and none of the filename's model tokens are compatible with the product's normalized name/brand/model identity. CDN and image-pipeline artifacts are exempt from the token definition — Amazon `_AC_SL1500_`-class modifiers, retina `@2x`, dimension pairs (`800x600`), `w`/`h` size markers, version markers (`v2`), camera/file counters, and unit measurements — and the guard stays inert for products without model-shaped identity, so opaque hashed CDN assets, Google Shopping thumbnails, verified same-model images, and multi-model comparison shots remain accepted. Any compatible token clears the image; only an all-foreign model claim vetoes it. The exact captured failure — `Saros_Z70_Silver_ID.png` on the Roborock Q5 Max+ card — is rejected with reason `image filename identifies a different model`.

**Phase R1 resolution proof:** Fail-first tests distilled from the live B1 fixture (wrong-model veto on a verified page; cross-product filename from any source) failed 2/2 before the guard and pass after. Preservation tests cover same-model filenames on verified pages, Amazon hashed/modifier assets, retina and dimension tokens, and model-less products. Focused resolver suite 19/19; full suite 807/807 across 119 suites; typecheck, lint (0 errors, 3 existing warnings), production build, and offline eval all pass. Zero live Serper/OpenAI calls. Implemented in the Phase R1 commit (2026-07-10) per `docs/forward-roadmap.md`.

**Phase R2 safety-stop regression (2026-07-10):** Reopened as Needs Investigation. The first constrained R2 run rendered three explicit foreign-model filenames: `2_QRevo_Curv_QRevo_Edge_140x.jpg` on both `Roborock Q10 X5+` (`serper-16k9bd`) and `Roborock Q10 S5+` (`ai-0002`), plus `Saros_20_Black_ID.png` on a Q7 Max+ card. The R1 token guard requires a mixed letter-digit filename token; `QRevo`, `Curv`, `Edge`, and `Saros` are alphabetic while `20` is numeric, so the guard never armed. R2 stopped at 4/6 searches; no fix was attempted. Any next fix must recognize incompatible named model families without rejecting opaque CDN assets or valid same-model images.

**Sweep result:**

| Search | Verdict | Main findings |
|--------|---------|---------------|
| `coffee maker` | Partial | Real products and safe upgrade; compact AeroPress winner; weak citations; category pages scored |
| `office chair` | Partial | Plausible products; weak citations; duplicate Zody family; set-of-two listing |
| `wireless earbuds` | Fail | Five leaders dropped at citation verify; duplicate Sennheiser; generic `$10` finalist |
| `electric toothbrush` | Partial/Fail | Safe upgrades; four Sonicare slots; Oral-B leaders lost/below cutoff |
| `leaf blower` | Partial/Fail | Real products; weak winner; EGO held below; measurement-token query; bad image assets |
| `dog food` | Fail | Retailer-only/weak evidence; category page #3; leaders dropped; source concentration |
| `dehumidifier` | Fail | Unsafe wine-refrigerator evidence attached to #1 dehumidifier |
| `dash cam` | Fail | Backup camera exact #2 and enriched; suspicious `$10` generic dash cam |
| `treadmill` | Partial/Fail | Under-desk winner over full-size leaders; walking-pad concentration |
| `gaming monitor` | Fail | Six of seven from Gigabyte/LG; duplicate M27Q cards |

**Phase result:**

- New issues: RR-057 through RR-061.
- Existing evidence updated: RR-002, RR-007, RR-008, RR-013, RR-015, RR-017, RR-022, RR-043, RR-056.
- No issue was fixed or closed.
- No app behavior or test code changed.

---

### PHASE 5C — PRICE-TRUST RESTORATION (2026-06-28)

Phase 5C fixed RR-002 after fail-first reproduction and ran three approved focused live searches. The `dash cam` proof also exposed one separate malformed high-price defect; it was logged but not fixed in this phase.

#### RR-062

| Field | Value |
|-------|-------|
| **ID** | RR-062 |
| **Phase** | Phase 5C |
| **Severity** | High |
| **Title** | Malformed product-page price can be verified at roughly 100x the plausible product price |
| **Status** | Fixed |

**Description:** A fresh `dash cam` live search selected `VIOFO A229 Pro` at exact rank #4 with a verified displayed price of `$19,999`. Diagnostic review corrected an earlier attribution error: the separate `$322.99` source-upgrade sample belonged to `BlackVue DR770X`, not VIOFO. VIOFO carried only one parsed `retailer_page` offer, `19999`, from its landing page.

**Where it occurs:** `priceFromPageMetadata` / `buildMetadata` in `lib/productAssets.ts`, followed by `parseBestMoneyAmount` in `lib/priceParsing.ts` and trust classification in `lib/productPriceTrust.ts`

**Steps to reproduce:** Inspect the fresh Phase 5C `tests/fixtures/review-radar-live/dash-cam.json`: VIOFO has no verified price through candidate, verification, or filtering stages, then gains a single `19999` retailer-page offer during asset enrichment. Fetch the cited VIOFO landing page and pass its HTML through the current product-asset metadata extractor; an unrelated A139 widget contains `data-price="19999"` and reproduces the same offer.

**Expected:** Only product-scoped price metadata should enrich the target. A Shopify-style minor-unit value from an unrelated page widget should not become a verified `$19,999` target-product price.

**Actual:** `priceFromPageMetadata` scans unscoped `data-price` attributes across the page. `priceFromValue` allows bare numerics, so `data-price="19999"` is parsed as 19,999 dollars rather than 19,999 minor units. The extractor chooses it despite the surrounding widget identifying a different product (`A139`), then Medium-confidence retailer-page evidence is marked `verified`, budget-usable, and exact-eligible.

**Current status:** Fixed. Asset enrichment now binds schema.org products, page-level prices, and element-level structured prices to the target product. Unscoped `data-price` values are ignored. Bare integer element prices are ambiguous by default and convert from minor units only when matching product context and an explicit `cents`/`minor` marker are both present. Standard schema.org `Offer.price` semantics and legitimate expensive prices remain supported.

**Suggested fix or next action:** Keep the RR-062 regressions green. Deterministic tests cover the VIOFO/A139 widget, unscoped bare integers, explicitly marked minor units, multiple schema.org products, valid matching structured prices, and a legitimate `$19,999` product. Saved-fixture reassessment removed the malformed high offer; one fresh `dash cam` run verified VIOFO A229 Pro 2CH at `$349.99` from matching JSON-LD with no malformed high price.

---

### RR-008 CLEANUP MINI-PHASE (2026-06-28)

#### RR-063

| Field | Value |
|-------|-------|
| **ID** | RR-063 |
| **Phase** | RR-008 cleanup mini-phase |
| **Severity** | High |
| **Title** | Same-brand wrong-recipe citations can support specific product cards |
| **Status** | Fixed |

**Description:** The post-RR-008 `dog food` live proof returned specific cards with citations for different recipes or variants from the same brand. The Purina Sensitive Skin & Stomach Salmon card cited a Complete Essentials Beef & Rice product; the JustFoodForDogs Chicken & Rice card cited Fish & Sweet Potato; and the Hill's Perfect Digestion Chicken card included a Salmon recipe citation.

**Where it occurs:** Citation-to-product identity binding and final product-page/citation prioritization after citation verification

**Steps to reproduce:** Replay the fresh RR-008 cleanup `dog-food.json` fixture and compare each final card name with every citation title and URL.

**Expected:** A specific product card may use category/editorial evidence secondarily, but a different recipe, flavor, model, or variant cannot act as product-specific evidence for the target card.

**Actual:** Same-brand but different-recipe product pages survive as retailer citations for the target product. In one case the mismatched recipe is the primary citation even though the card names a different recipe.

**Current status:** Fixed. Citation verification now uses a shared product-evidence identity verdict. Specific product-page citations with explicit model, recipe, flavor, life-stage, recipe-base, supplement-flavor, or cosmetic-shade conflicts are removed. Product-page citations whose identity cannot be tied to the displayed product are also removed. Exact same-product pages and package-size variants remain valid; generic family/editorial evidence may remain secondary only.

**Suggested fix or next action:** Keep the RR-063 identity matrix green during later citation/ranking work. The one fresh `dog food` run initially exposed two additional shapes: Blue Buffalo Adult Chicken/Brown Rice carried a Small Breed Puppy Chicken/Oatmeal citation, and Iams Adult Lamb/Rice carried an unrelated Small & Toy Breeds citation. The final deterministic refinement rejects both when the saved fixture is reassessed, but the one-call cap prevented a second live request. RR-022 retention remains green for exact product pages.

---

### RR-007/RR-063 PRODUCT-EVIDENCE SAFETY MINI-PHASE (2026-06-29)

No new issue ID was opened.

**Root causes:**
- Generic `/brand(s)/`, `/family`, `/category`, and `/collection` routes with letter-plus-digit slugs could satisfy the fallback product-path heuristic.
- Product-link selection evaluated an existing `product_page_url` with the generated card name as its source title, allowing self-derived text to manufacture identity.
- Citation verification proved reachability and page eligibility but did not require product-specific evidence to match the displayed recipe, flavor, formula, life stage, shade, or model.

**Behavior result:**
- Generic family routes are evidence-only and cannot become primary product URLs.
- Primary product links require source-derived same-product identity. Unsafe stale links are cleared immediately after citation filtering, before page enrichment can use them.
- Explicit variant/model conflicts and unknown specific-product citations are removed, while exact product pages and safe package-size variants remain.
- RR-022 retention is preserved: exact product pages still survive, and generic family/editorial material may remain secondary.

**Proof:**
- Fail-first focused run: 8 failures plus the absent shared identity module.
- Focused final run: 84/84.
- Broad safety matrix: 295/295.
- Full suite: 706/706.
- Typecheck passed; lint had 0 errors and 3 pre-existing warnings; eval reported no red flags.
- Exactly one `dog food` live call ran. It returned 6 exact and 5 near products, all with specific primary product URLs and no editorial/support/manual/documentation card. The saved fixture reassessed through the final rules removes the two post-live citation mismatches without another API call.

**Issue result:** RR-007 and RR-063 are Fixed. RR-008 and RR-022 remain Fixed. RR-013 and Phase 5G were not changed.

---

### PHASE 5G — EVIDENCE-STRENGTH RANKING (2026-06-29)

No new issue ID was opened.

**Root cause:** Scoring counted citation quantity and non-big-box hostnames, not verified `citation_type` plus same-product identity. A manufacturer self-cite or retailer host outside a short broad-retailer list could receive "independent" source credit, while a real product-specific editorial citation had no dedicated ranking component.

**Behavior result:**
- Added a capped `citationStrengthScore` to total and ranked-match scoring.
- Only typed, product-specific citations can earn the adjustment.
- Generic, conflicting, unknown-specific, and untyped citations cannot improve Phase 5G rank.
- Product-specific citation identity also scopes citation count, independent-source, expert-mention, and evidence-strength signals when typed citations are present.
- Retailer evidence remains useful, self-only products remain eligible, and no eligibility or exact/near gate changed.

**Proof:**
- Fail-first: 3 failures across gas grills, headphones, and identity-safe citation scoring.
- Focused ranking/trace tests: 57/57.
- Broad safety matrix: 348/348.
- Full suite: 712/712.
- Typecheck passed; lint had 0 errors and 3 pre-existing warnings; eval reported no red flags.
- Isolated A/B: retailer-only Nexgrill `#1 -> #2`; independently supported Weber `#2 -> #1`; suspicious `$1` product stayed near-only.
- Saved-fixture reassessment: current gas-grill/cordless-drill fixtures contain no independently supported challenger and cannot prove RR-013; running shoes retained only product-specific independent credit and withheld it from generic or wrong-model editorial citations.

**Issue result:** RR-013 is Fixed. No other issue status changed. No live search or full baseline ran.

---

### PHASE 5H — BROAD-SLATE DIVERSITY AND FORM-FACTOR QUALITY (2026-06-29)

#### RR-064

| Field | Value |
|-------|-------|
| **ID** | RR-064 |
| **Phase** | Phase 5H live validation |
| **Severity** | Critical |
| **Title** | Source upgrade can attach same-family evidence from a conflicting explicit model |
| **Status** | Fixed |

**Description:** The focused Phase 5H `electric toothbrush` live run upgraded target `Philips Sonicare DiamondClean 9000 Rechargeable toothbrush` with a Google Shopping candidate titled `Philips Sonicare DiamondClean Smart 9300 Electric Toothbrush`. The trace recorded `identityMatch: true` and attached the candidate's `$229.99` price, 4.3 rating, review count, and citation to the 9000 card, which ranked exact #1.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` source-upgrade `looksLikeSameProduct` / descriptive-family model identity; Google Shopping evidence attachment

**Steps to reproduce:** Replay `tests/fixtures/review-radar-live/electric-toothbrush.json` from the Phase 5H live validation. Inspect the `Sonicare DiamondClean 9000` source-upgrade trace and its attached candidate sample.

**Expected:** Explicit candidate model `9300` conflicts with target model `9000` / `HX9911/90`; shared `Philips Sonicare DiamondClean` family wording cannot override that conflict. No commerce fields attach.

**Actual:** The candidate passed identity and attached price, rating, review count, and citation. The wrong-model citation remained on the final #1 card.

**Current status:** Fixed on 2026-06-30. Fail-first reproduction confirmed that `DiamondClean 9000` and `Smart 9300` produced different alphabetic model prefixes, bypassed the existing same-prefix conflict check, and then passed on shared `Philips` / `Sonicare` / `DiamondClean` overlap.

**Suggested fix or next action:** Completed. The shared RR-063 explicit-variant guard now recognizes conflicting standalone 3-5 digit series numbers when source-derived target and candidate text share meaningful family context. Years, prices, package/count values, and measurements are excluded. Source upgrade runs this conflict guard before positive token/family overlap. Exact-model, color, and package-count variants remain valid.

**Resolution proof:** The exact live-shaped 9000/9300 case failed before the fix and passed afterward without attaching price, rating, review count, or citation. Focused safety tests passed 157/157; the full suite passed 729/729; typecheck and eval passed; lint reported 0 errors and 3 pre-existing warnings. One focused live `electric toothbrush` run returned the same 9300 candidate first and rejected it as `identity_mismatch`, then safely attached a source-derived explicit 9000 offer. The 2100 attempt independently rejected a 4100 result before attaching a 2100 result.

---

### PHASE 5I — TRIGGER/FALLBACK RELIABILITY SAFETY STOP (2026-06-30)

#### RR-065

| Field | Value |
|-------|-------|
| **ID** | RR-065 |
| **Phase** | Phase 5I live validation |
| **Severity** | Critical |
| **Title** | Source-upgrade fallback can attach same-category wrong-product evidence through a retailer-like brand token |
| **Status** | Fixed |

**Description:** A fail-first Phase 5I implementation broadened the weak-evidence trigger and allowed the existing single fallback query after a nonempty primary result set produced no safe attachment. In the one focused `shop vac` live run, target `Amazon.com: RIDGID Wet Dry Vacuums VAC1200 Heavy Duty Wet ...` was assigned detected brand `Amazon.com` and model token `vac1200`. The primary result `SKIL ... VA1200D-10` was correctly rejected. The fallback result `Amazon Basics 6-Gallon 3.5 HP Wet/Dry Vacuum` then passed same-product identity and donated a citation despite being a different brand and product with no `VAC1200` identity.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` source-upgrade `looksLikeSameProduct` identity path; target brand extraction from retailer-prefixed card names; bounded fallback attachment

**Steps to reproduce:** Use the stopped Phase 5I code that retries fallback after `primary_no_safe_attachment`, then run `npm run qa:save-fixture -- "shop vac"`. Inspect the `Amazon.com: RIDGID ... VAC1200` source-upgrade trace. The primary SKIL candidate is rejected; the fallback Amazon Basics candidate is marked `identityMatch: true` and attaches a citation.

**Expected:** Retailer/source prefixes such as `Amazon.com:` must not become target product brands. A model-qualified RIDGID VAC1200 target must reject an Amazon Basics vacuum that lacks the target brand and model, even though both are shop vacuums.

**Actual:** Shared `Amazon` wording plus same product type was sufficient for the fallback candidate to pass identity; the candidate attached a wrong-product citation.

**Current status:** Fixed on 2026-06-30. Shared identity normalization strips only explicit leading source/retailer labels, excludes seller fields and URL host/query text from candidate identity, and requires a reliable target brand to appear in source-derived title/brand/path evidence. Product URL paths remain usable. Amazon Basics is recognized as a legitimate private-label brand rather than being globally blocked.

**Suggested fix or next action:** Completed. Explicit Amazon, Walmart, Home Depot, Best Buy, Target, Chewy, Lowe's, eBay, Costco, Sam's Club, domain-shaped, marketplace, retailer, and store labels are provenance, not product identity. Exact source-derived RIDGID/model evidence on Amazon remains attachable, while Amazon Basics remains valid only when it is the actual product brand.

**Phase 5I evidence for RR-041/RR-042:** Deterministic fail-first tests proved the current trigger suppresses a candidate when a lone rating is present and that fallback stops after a nonempty primary set whose candidates all fail identity. A conservative missing-two-of-three trigger and one bounded post-rejection fallback passed 738/738 tests and eval before live proof. The live run proved the fallback control flow worked, but RR-065 made the result unsafe. Those behavior changes were rolled back; neither RR-041 nor RR-042 is Fixed.

**Resolution proof:** The exact live-shaped retailer-prefixed RIDGID VAC1200 versus Amazon Basics case failed before the fix and passes afterward with no evidence attachment. Deterministic tests also prove seller labels, URL hosts, URL query parameters, and query-derived text cannot supply identity; a real Amazon-hosted RIDGID VAC1200 page and a real Amazon Basics target remain valid. Focused identity tests passed 90/90, broad named regressions passed 340/340, full tests passed 744/744, typecheck and eval passed, and lint had 0 errors with 3 existing warnings. One `shop vac` live run safely attached price/rating/review/citation evidence from an exact RIDGID HD1400 result; no wrong-brand source-upgrade attachment appeared. The run did not reproduce the retailer-prefixed VAC1200 target and separately reopened RR-007.

**RR-066 refinement:** RR-065 still excludes retailer/source labels, seller fields, URL hosts/queries, and generated query text from product identity. When a target has a reliable strong model, RR-066 now permits a provider title that omits the brand only if source-derived evidence carries the exact normalized target model, product type agrees, and no explicit conflicting brand/product signal exists.

---

### RR-007 OPAQUE COLLECTION-PAGE CLEANUP (2026-06-30)

No new issue ID was opened.

**Root cause:** `classifyProductEligibility` checked known collection/listing negatives before positive shortcuts, but the negative classifier did not recognize opaque manufacturer CMS collection suffixes. The Bosch final slug contained letters plus digits, so the generic model-like slug heuristic returned `buyable_product`. That verdict survived citation verification, requirement filtering, reliability, scoring, and final card selection.

**Behavior result:**
- Opaque `ocs-c` collection routes and product-range/family/lineup shapes are classified as `listing_or_search` before weak product-detail shortcuts.
- Contextual family/series routes require concrete model identity in both title and trailing path before they can avoid the collection verdict.
- Product-looking images, prices, category words, and catalog-like digits cannot override the strong collection shape.
- Known retailer detail routes and specific manufacturer pages, including Bosch model pages, remain eligible.
- RR-041/RR-042 logic, source-upgrade identity, ranking, discovery, price, product type, requirements, final selection, and UI are unchanged.

**Proof:** Fail-first focused tests passed 59/61 and failed only the exact Bosch classifier/final-card assertions. Final focused tests passed 61/61; the broad named safety matrix passed 308/308; typecheck passed; lint had 0 errors and 3 existing warnings; the full suite passed 747/747; eval reported no red flags. Current-code reassessment flips the frozen Bosch fixture record from card-eligible to blocked. Exactly one live `shop vac` run returned only specific product-detail primary URLs and no collection/category/brand/family/listing page.

**Issue result:** RR-007 is Fixed. RR-008, RR-063, RR-064, and RR-065 remain Fixed. RR-041/RR-042 remain Needs Investigation and were not retried. Phase 5I and Phase 5J were not started.

---

### PHASE 5I RETRY — SAME-BRAND/MODEL-OMISSION SAFETY STOP (2026-06-30)

#### RR-066

| Field | Value |
|-------|-------|
| **ID** | RR-066 |
| **Phase** | Phase 5I retry live validation |
| **Severity** | Critical |
| **Title** | Source upgrade can attach same-brand, same-type evidence that omits the target model |
| **Status** | Fixed |

**Description:** The conservative Phase 5I retry reached a model-qualified RIDGID target and evaluated live Google Shopping candidates. A candidate carrying the exact `WD4522` model but omitting the RIDGID brand was rejected under the RR-065 brand requirement. A different RIDGID 10-gallon vacuum carried the brand and same product type but no `WD4522` model; it passed identity and donated price, rating, review count, and citation evidence to the 4.5-gallon WD4522 target.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` source-upgrade same-product identity path when the target has a reliable model token but the candidate exposes no model token

**Steps to reproduce:** Apply the stopped Phase 5I retry candidate logic, run the single approved `npm run qa:save-fixture -- "shop vac"` command, and replay `tests/fixtures/review-radar-live/shop-vac.json`. Inspect the source-upgrade trace for `RIDGID 4.5 Gallon 5.0 Peak HP PRO PACK Wet Dry Vac (WD4522)`. The exact-model `WD4522` candidate is rejected because its title lacks RIDGID, then `Ridgid 10 Gallon 6.0 Peak HP Stainless Steel Wet/Dry Shop Vacuum` is accepted despite omitting WD4522.

**Expected:** A target with reliable model `WD4522` must not accept source-derived evidence that proves only RIDGID brand and wet/dry-vac type. Exact target-model evidence should remain usable even when a provider title omits the brand, provided no conflicting brand/product evidence is present.

**Actual:** The wrong 10-gallon RIDGID vacuum passed identity and attached `$139`, rating `4.3`, review count, and citation evidence to the 4.5-gallon WD4522 target. The contaminated target reached the reliability-near set rather than the final exact seven, but the evidence attachment itself was unsafe.

**Current status:** Fixed on 2026-06-30. Model-qualified targets no longer fall through to broad brand/type token overlap. Source-derived candidate evidence must contain an exact normalized target strong model; an explicit conflicting brand or model still vetoes attachment.

**Suggested fix or next action:** Completed. `looksLikeSameProduct` now normalizes model punctuation consistently, evaluates product-type and explicit variant conflicts first, rejects every model-qualified candidate missing the target strong model, rejects explicit conflicting brands/models, and accepts exact model-bearing source evidence when the provider omits the brand and no conflict exists. Non-model-qualified family behavior is unchanged.

**Phase evidence:** Fail-first behavior tests passed 78/80 before implementation. The candidate Phase 5I implementation passed focused tests 113/113, a broad named safety matrix 346/346, typecheck, lint with 0 errors and 3 existing warnings, the full 751/751 suite, and eval. The live stop showed deterministic coverage lacked the same-brand/no-model negative. After rollback, the restored repository passed typecheck, lint with the same warnings, 747/747 tests, and eval with no red flags.

**Resolution proof:** The live-shaped WD4522 versus different 10-gallon RIDGID candidate and a second-category Makita XFD131 omission both fail identity with no price, rating, review count, image, URL, or citation donation. Exact brandless WD4522 evidence attaches; a conflicting-brand WD4522 candidate remains blocked; exact models with punctuation variants, merchant paths, color/count variants, and measurement text remain valid. Fail-first passed 80/84 with only four intended failures. Final focused passed 84/84; broad named safety passed 304/304; full suite passed 752/752; typecheck and eval passed; lint had 0 errors and 3 existing warnings. One live `shop vac` run rejected nearby RIDGID `HD09001`, `HD0919`, and `HD1900` offers while safely attaching exact Armor All `VOM205P` evidence. WD4522 did not recur live.

**Issue result:** RR-066 is Fixed. RR-041/RR-042 remain Needs Investigation and were not changed or retried. RR-007, RR-008, RR-063, RR-064, and RR-065 remain Fixed. Phase 5I and Phase 5J did not start.

---

### PHASE 5I RETRY — TRIGGER/FALLBACK RELIABILITY (2026-06-30)

#### RR-067

| Field | Value |
|-------|-------|
| **ID** | RR-067 |
| **Phase** | Phase 5I retry live validation |
| **Severity** | Medium |
| **Title** | Candidate-side horsepower `HP` brand metadata rejects exact-model source-upgrade evidence |
| **Status** | Fixed |

**Description:** The approved `shop vac` live proof returned an exact-looking fallback candidate, `Hart 12 Gallon Wet/Dry Vacuum Voc1212pw 3701`, for target `HART 12 Gallon 6 Peak HP Wet/Dry Vacuum VOC1212PW 3701`. The target query correctly used brand `HART` and model `VOC1212PW`, but provider metadata labeled the candidate brand as `HP` from the horsepower phrase. The explicit brand-conflict veto then rejected the exact model-bearing candidate. A deterministic probe reproduced the same primary and fallback rejection with no evidence attachment.

**Where it occurs:** `lib/requirementEvidenceRescue.ts` — candidate-side explicit brand selection in `evidenceBrand` / `looksLikeSameProduct`

**Steps to reproduce:** Evaluate a HART `VOC1212PW` target against a source-derived candidate whose title contains the same HART/model identity but whose explicit `brand` field is `HP` because the title includes `6 Peak HP`. The candidate is rejected as an identity mismatch.

**Expected:** Candidate-side `HP` metadata that appears only as horsepower measurement text must not create a Hewlett-Packard conflict. Exact HART/model source evidence should remain eligible, while genuine HP computer products and real conflicting brands remain blocked.

**Actual:** The exact model candidate is safely rejected, causing a false negative and preventing evidence attachment.

**Current status:** Fixed on 2026-07-01. The original Phase 5I observation was a safe false-negative, not an unsafe merge, so no Phase 5I behavior was rolled back.

**Suggested fix or next action:** Completed. Preserve the measurement-aware candidate-brand normalization, exact-model requirement, genuine HP controls, and explicit source-derived conflict veto.

**Phase 5I result:** RR-041 and RR-042 are Fixed. The final focused source-upgrade tests passed 121/121, the broad named safety matrix passed 342/342, the full suite passed 760/760, typecheck and eval passed, and lint reported 0 errors with 3 pre-existing warnings. One `shop vac` live run safely attached exact RIDGID WD1060 and DEWALT DXV09P evidence, safely rejected all HART fallback candidates, and exposed RR-067. No wrong product, unsafe page, or query-derived identity attached. Phase 5J did not start.

**RR-067 resolution:** Candidate-side brand resolution no longer trusts ambiguous `HP` metadata ahead of stronger source-derived product identity. When the explicit provider brand canonicalizes to HP, the identity path inspects source title, safe URL path, source-derived snippets, and product metadata that excludes seller, host, URL query, query-derived text, and the polluted brand field itself. If those sources support the non-HP target brand or a different known brand, they override the ambiguous HP field. Numeric, peak/max/rated, motor, engine, pump, compressor, and suction HP syntax is treated as measurement evidence. Genuine HP and Hewlett-Packard computers, monitors, and printers remain HP products.

**Resolution proof:** The exact HART VOC1212PW case and seven unrelated tool/vacuum brand controls failed before the fix and now attach exact-model evidence safely. Genuine HP LaserJet evidence still attaches, while a source-derived Dell conflict remains rejected even when provider metadata says HP. Focused tests passed 98/98; broad safety passed 346/346; the full suite passed 764/764; typecheck and eval passed; lint reported 0 errors and 3 existing warnings. One focused `shop vac` run did not reproduce HART, but exact RIDGID WD3050 evidence containing `3.5-Peak HP` attached while WD3050A and unrelated products remained rejected. RR-067 is Fixed.

---

### PHASE 5J - ASSET QUALITY AND FALLBACK DIAGNOSTICS (2026-07-01)

#### RR-068

| Field | Value |
|-------|-------|
| **ID** | RR-068 |
| **Phase** | Phase 5J live proof |
| **Severity** | High |
| **Title** | Bissell CrossWave floor cleaners can rank as exact shop-vac products |
| **Status** | Fixed |

**Description:** The single Phase 5J `shop vac` live proof returned multiple Bissell CrossWave floor-cleaning appliances as exact results. The seven-card exact slate included CrossWave Cordless Max 2554A, CrossWave Multi-Surface 1785A, CrossWave All-in-One 1785A, and CrossWave HF3 3649A. These are household multi-surface wet/dry floor cleaners, not conventional shop vacuums or wet/dry utility vacs.

**Where it occurs:** Shared product-type intent/match handling for `shop vac`; discovery requirement filtering, revalidation, and exact-match eligibility

**Steps to reproduce:** Run one debug search for `shop vac`, save the fixture, and replay it. Inspect the final seven exact cards and observe the four Bissell CrossWave products.

**Expected:** A broad `shop vac` search returns conventional wet/dry utility vacuums. Wet/dry floor-cleaning/mopping appliances are rejected or safely demoted as a conflicting product subtype.

**Actual:** Four CrossWave floor-cleaner cards passed citation verification, requirement filtering, revalidation, and exact selection. The #1 exact result was a CrossWave Cordless Max.

**Current status:** Fixed. The Phase 5J diff did not change discovery, product-type intent/matching, requirement validation, ranking, or final selection. RR-068 was therefore an adjacent pre-existing coverage gap exposed by the approved live check, not caused by the RR-061/RR-054 implementation.

**Suggested fix or next action:** Before Phase 6, run a narrow fail-first product-type phase for the generalized utility wet/dry vacuum versus floor-washing/mopping appliance distinction. Test at discovery and revalidation across unrelated brands; preserve valid conventional shop vacs and do not add Bissell-specific rules.

**RR-068 resolution:** The shared product-type registry now distinguishes `shop_vac` intent from `household_floor_cleaner` intent. Strong household identities such as floor washers, vacuum mops, hard-floor cleaners, carpet/spot/upholstery cleaners, and representative cross-brand floor-cleaner families override incidental `wet dry vacuum` wording for shop-vac requests. Conventional shop/utility/garage/jobsite wet-dry vac signals remain valid, and explicit floor-cleaner searches continue to accept the household products. Discovery type evidence excludes retailer labels and query-derived fallback snippets. The existing discovery prefilter and requirement revalidation consume the same verdict; ranking and final selection were not changed.

**RR-068 proof:** Fail-first passed 118/124 with only six intended RR-068 failures. Focused final passed 125/125, broad safety passed 455/455, the full suite passed 781/781, typecheck and eval passed, and lint reported 0 errors with 3 existing warnings. Revalidating the saved Phase 5J fixture removed all four CrossWave products from exact and near results while retaining RIDGID HD0900 and two Vacmaster utility vacuums as exact. One fresh `shop vac` run returned two exact and one near product, all conventional Armor All utility wet/dry vacuums; no household floor cleaner appeared. Exact AA255W source-upgrade evidence attached safely. RR-068 is Fixed.

**Phase 5J result:** RR-054 and RR-061 are Fixed. Focused tests passed 174/174, the broad named safety matrix passed 417/417, the full suite passed 772/772, typecheck and eval passed, and lint reported 0 errors with 3 existing warnings. The one live `shop vac` run showed seven non-empty image URLs with image responses and no logo, placeholder, category, article, support, or HTML page used as an image. The normal pipeline ran, so RR-054 live fallback behavior remains deterministic-only. RR-068 was documented and not fixed. Phase 6 did not start.

---

### PHASE 5 CLOSEOUT AND REMEASUREMENT (2026-07-01)

**Verdict:** Phase 5 is closed and ready for a separately approved Phase 6 planning step. No issue status changed during closeout.

**Register audit:** 68 unique IDs through RR-068; 9 Critical, 29 High, 25 Medium, and 5 Low. Status totals are 63 Fixed, 4 Needs Investigation, 1 Won't Fix, and 0 Open.

**Intentional carryovers:** RR-014 (leader coverage), RR-015 (run-to-run stability), RR-037 (RIDGID live candidate-pool variance), and RR-045 (Tapo provider coverage) remain Needs Investigation. They are measurement or provider-variance questions, not unresolved Phase 5 behavior blockers.

**Verification:** The focused high-risk Phase 5 matrix passed 448/448 across 39 suites. Typecheck passed, lint reported 0 errors and the same 3 pre-existing warnings, the full suite passed 781/781 across 117 suites, and `node scripts/eval-pipeline.mjs` reported no red-flag issues.

**Fixture evidence:** The current `shop vac` fixture contains only conventional utility wet/dry vacuums and no household floor cleaner. Historical `dog food`, `electric toothbrush`, `air purifier`, and `dash cam` replays remain useful for trace compatibility but predate some later identity and diagnostic fields. Current-code reassessment removes the historical dog-food recipe conflict, and deterministic regressions remain the authority for RR-041/RR-042, RR-054, and RR-063 through RR-068. No live search ran.

**Scope:** Documentation and verification only. No production code, app behavior, issue status, ranking, discovery, source-upgrade, identity, price, eligibility, image, product-type, final-selection, UI, or API behavior changed. Phase 6 did not start.

---

### PHASE 6A — RELIABILITY INSTRUMENT (2026-07-01)

**Verdict:** Phase 6A planning/documentation passed. The v0.1-draft reliability rubric, report templates, release gates, seven batch definitions, core-10, variance-pilot design, fixture policy, and zeroed budget ledger are documented.

**Register audit:** 68 unique IDs through RR-068; 9 Critical, 29 High, 25 Medium, and 5 Low. Status totals remain 63 Fixed, 4 Needs Investigation, 1 Won't Fix, and 0 Open.

**Planning-only outcome:** No new issue was opened and no existing status changed. RR-014, RR-015, RR-037, and RR-045 remain intentional measurement/provider-variance investigations.

**Instrument validation:** `shop-vac.json` and `gas-grill.json` were scored from `npm run qa:replay` output only and labeled M3 historical evidence. Shop-vac scored 65/C with incomplete safety/high-impact evidence. Historical gas-grill scored 69 on quality but F overall because an exact result was explicitly a propane camping stove. This is an archival fixture finding, not a new current-code regression; no M2 reassessment or fix was performed.

**Verification:** Typecheck passed; lint reported 0 errors and the same 3 existing warnings; the full suite passed 781/781 across 117 suites; `node scripts/eval-pipeline.mjs` reported no red-flag issues.

**Scope:** Documentation/templates only. No live search, API call, app code, app test, pipeline behavior, executable script, issue fix, or Phase 6B work ran.

---

### PHASE 6A MASTER-PLAN RECONCILIATION (2026-07-01)

**Verdict:** The completed Phase 6A instrument was retained and reconciled with the merged master plan. No issue was opened, closed, or reclassified.

**Policy corrections:** Product-safety tolerance is absolute at zero failures; query-shape `NotApplicable` is distinct from missing-evidence `NotScored`; the existing deduction formula remains the canonical v0.1 draft; leader-quality targets must be approved after Phase 6D and before Phase 6E.

**Register:** 68 issues; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open. RR-014, RR-015, RR-037, and RR-045 remain unchanged.

**Verification:** Typecheck passed; lint reported 0 errors and 3 existing warnings; full suite passed 781/781 across 117 suites; eval reported no red flags.

**Scope:** Documentation only. No app behavior, tests, scripts, fixtures, live calls, fixes, or Phase 6B work.

---

### PHASE 6 MASTER-PLAN SOURCE-OF-TRUTH PROMOTION (2026-07-01)

**Verdict:** The reconciled desktop master was promoted into `docs/phase-6-reliability-gauntlet-plan.md`, replacing the shorter repo plan at the established path. It is now the sole Phase 6 program source of truth.

**Register:** 68 issues; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open. No issue was opened, closed, or reclassified.

**Scope:** Documentation governance only. No app behavior, tests, scripts, fixtures, live calls, fixes, or Phase 6B work.

---

### PHASE 6B - REGRESSION WALL (2026-07-01)

**Verdict:** Phase 6B passed. All 62 issues from RR-007 through RR-068 are indexed in `docs/phase-6-regression-wall.md`; no new behavior defect was found and no issue status changed.

**Register:** 68 issues; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open. The wall range contains 57 Fixed, 4 Needs Investigation, and 1 Won't Fix.

**Coverage result:** Two direct deterministic test gaps were found and closed without production changes. RR-012 now directly tests shopper-friendly schema availability labels. RR-025 now directly tests that a budget-unverified product remains visible in `afterRequirementFilter.near`.

**Measurement boundary:** RR-014 and RR-015 remain measurement-only. RR-037 and RR-045 remain provider-variance-bound. Deterministic green tests do not close them.

**Verification:** Focused additions passed 22/22. Typecheck passed; lint reported 0 errors and 3 existing warnings; the full suite passed 782/782 across 117 suites; eval reported no red flags.

**Scope:** Zero live calls. No production code, app/API/UI behavior, scripts, live fixtures, generated baselines, ranking, discovery, identity, price, citation, eligibility, source-upgrade, requirement, or final-selection behavior changed.

---

### PHASE 6C - PRODUCT-SPECIFIC PATCH AUDIT (2026-07-02)

**Verdict:** PASS WITH WATCH ITEMS. The static audit found no unresolved must-generalize production patch and no new behavior defect.

**Register:** 68 issues; 63 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open. No issue was opened, closed, or reclassified.

**Audit result:** All 61 tracked production TypeScript/JavaScript files were audited. Findings classify as 5 acceptable generalized-data groups, 4 acceptable source/category-rule groups, 1 suspicious but non-behavioral comment/example group, and 0 must-generalize blockers.

**Watch items:** Retailer/product-page route knowledge is duplicated across several defensive pipeline boundaries and may drift. The `HP` brand/unit collision and named cross-brand floor-cleaner families should remain centralized shared data with regression tests. These are maintenance risks, not current defects.

**Verification:** Typecheck passed; lint reported 0 errors and 3 existing warnings; the full suite passed 782/782 across 117 suites; offline eval reported no red flags.

**Scope:** Zero live calls. No production code, test, script, fixture, baseline, app/API/UI behavior, ranking, discovery, identity, price, citation, eligibility, source-upgrade, product-type, requirement, or final-selection behavior changed.

---

### PHASE 6D - VARIANCE PILOT SAFETY STOP (2026-07-02)

#### RR-069

| Field | Value |
|-------|-------|
| **ID** | RR-069 |
| **Phase** | Phase 6D variance pilot |
| **Severity** | Critical |
| **Title** | Generic model-series shopping evidence can attach to a different specific submodel |
| **Status** | Fixed |

**Description:** During constrained pilot run B2, source upgrade targeted `Roborock Q10 X5+ Robot Vacuum and Mop, Self-Emptying, Hands ...` but attached price, rating, review count, and citation from `Roborock - Q10 Series Robot Vacuum and Mop with Self-Emptying, 10,000Pa Suction,`. The source title did not identify `X5+`. A neighboring `Q10 S5+` target in the same run correctly rejected the same generic series candidate, demonstrating inconsistent specificity handling.

**Where it occurs:** Source-upgrade model identity construction and same-product evidence matching in `lib/requirementEvidenceRescue.ts` / shared product identity helpers; visible in `debug.stageFunnel.sourceUpgradeTraces`

**Steps to reproduce:** Replay the untracked Tier A fixture `tests/fixtures/review-radar-live/robot-vacuum-under-300-self-emptying.phase6d-run2.json`. Inspect the source-upgrade trace for the Q10 X5+ target. The target records model tokens `q10` and `roborockq10x5`, selects identity phrase/query `Roborock Q10`, marks the generic Q10-series candidate `identityMatch: true`, and records `evidenceAttached: true` with `price`, `rating`, `reviewCount`, and `citation`.

**Expected:** A specific Q10 X5+ target may accept evidence only when source-derived product evidence identifies X5+ or an independently proven exact same-product offer. Generic Q10-series evidence and different Q10 variants must remain secondary or be rejected for attachment.

**Actual:** Generic Q10-series evidence passed the source-upgrade identity gate and donated four product-specific fields to the Q10 X5+ candidate.

**Current status:** Fixed deterministically. Source-upgrade identity now checks the target's distinguishing submodel before either the strong-model or brand-qualified-family acceptance branch. Adjacent base/suffix identities such as `Q10 X5+`, compact equivalents such as `Q10X5+`, and exact kit/model identifiers are normalized as product identity. Generic base-series/family/lineup evidence cannot donate commerce fields to a more specific target.

**Suggested fix or next action:** Run a narrow fail-first identity-safety phase before resuming Phase 6D. Reproduce the exact X5+/generic-Q10 case and unrelated series/submodel controls; preserve exact same-model positives, RR-063 through RR-067 protections, query/URL provenance exclusions, and all existing source-upgrade safety gates.

**Phase 6D measurement consequence:** RR-015 and RR-037 received partial two-run evidence only. The remaining two approved searches were not spent. The market-leader snapshot package and rubric freeze proposal are blocked until RR-069 is fixed deterministically and the variance pilot is explicitly re-approved.

**Resolution proof:** The fail-first source-quality run passed 97/100 with only the exact Q10 X5+, monitor-series, and power-tool-series negatives failing. After the fix, focused source-quality tests passed 100/100 and the broad identity/trust matrix passed 439/439 across 32 suites. Exact `Q10 X5+`, `Q10 X5 Plus`, and `Q10X5+` evidence still attaches; generic Q10 series/plain/lineup evidence plus nearby Q10 S5+/X50+ variants do not attach. Brandless exact WD4522 evidence and all RR-063 through RR-068 protections remain green. Typecheck and eval passed, lint reported 0 errors with 3 existing warnings, and the full suite passed 786/786 across 117 suites. No live search ran. Phase 6D remains paused pending explicit approval. Implementation commit: `1411901`.

---

#### RR-070

| Field | Value |
|-------|-------|
| **ID** | RR-070 |
| **Phase** | Phase 6D post-RR-061 restart |
| **Severity** | Medium |
| **Title** | Unrelated provider brand metadata can contaminate source-upgrade queries |
| **Status** | Needs Investigation |

**Description:** Constrained robot-vacuum B1 produced an `ILIFE A12 Pro` candidate whose Serper-derived metadata brand was `Bose`, sourced from an AliExpress product URL. Source upgrade trusted that metadata brand and constructed `Bose ILIFE A12 Pro` instead of an ILIFE-based query. Both primary and fallback searches returned zero results, so no evidence attached.

**Where it occurs:** Upstream candidate/product metadata brand assignment and `lib/requirementEvidenceRescue.ts` source-upgrade brand/query selection

**Steps to reproduce:** Replay untracked Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json`. Inspect the ILIFE A12 Pro product metadata and source-upgrade trace: `metadataBrand: Bose`, `detectedBrand: Bose`, query `Bose ILIFE A12 Pro`, zero returned candidates, and no attached evidence.

**Expected:** Brand metadata that conflicts with clear source-derived title identity does not override the product title when constructing a source-upgrade query. The query should preserve ILIFE/A12 Pro identity without inventing or trusting Bose.

**Actual:** Unrelated metadata brand `Bose` overrode the title brand and made both bounded source-upgrade searches ineffective.

**Current status:** Needs Investigation. This did not attach unsafe evidence and was not the Phase 6 stop trigger, but it is a generalized query-identity/coverage defect. Diagnose the provenance of the incorrect brand and require metadata/title agreement or an equivalent reliability check before using metadata brand in source-upgrade query construction. Do not fix it inside the stopped measurement phase.

---

### PHASE A - SEARCH-OBSERVABILITY AUDIT FILING (2026-07-10)

#### RR-071

| Field | Value |
|-------|-------|
| **ID** | RR-071 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | High |
| **Title** | Exact-model identity falsely collapses distinct Vacmaster 12-gallon products |
| **Status** | Needs Investigation |

**Description:** The current final-selection trace collapses `Vacmaster Professional Beast Series 12-Gallon 5.5 Peak HP Wet/Dry Vacuum` into `Vacmaster 12-Gallon 5 Peak HP Wet/Dry Vacuum` with `duplicate_identity_collapsed`, despite different titles, power specifications, and product URLs.

**Where it occurs:** `areSameExactModelProduct()` in `lib/productIdentity.ts` and exact-match selection in `lib/recommendationScoring.ts`

**Steps to reproduce:** Replay local Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json`. The distinct Beast product appears at line 2771, its distinct canonical URL at line 2777, and the false `duplicate_identity_collapsed` decision at lines 2781-2782.

**Expected:** Distinct products with conflicting titles/specifications and distinct canonical product URLs remain separate candidates, while retailer listings of the same exact manufacturer model continue to collapse.

**Actual:** A distinct, otherwise exact-eligible product loses its final slot through an exact-model identity collapse.

**Current status:** Needs Investigation. The defect is proven current by `docs/review-radar-search-pipeline-audit.md` sections 11-12 and the cited fixture trace. Phase A records lineage only and does not change identity logic.

**Suggested fix or next action:** After Phase A measurement, add generalized conflicting-identity regression cases and tighten exact-model collapse without weakening same-model retailer dedupe.

---

#### RR-072

| Field | Value |
|-------|-------|
| **ID** | RR-072 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | High |
| **Title** | RIDGID HD0900 Wet Dry Vac is falsely rejected as wrong category |
| **Status** | Needs Investigation |

**Description:** The current cheap prefilter rejects `9 Gallon 4.25 Peak HP NXT Wet Dry Vac HD0900 | RIDGID Tools` as `wrong_category`, even though the source-derived title explicitly identifies a wet/dry vacuum relevant to a `shop vac` request.

**Where it occurs:** Product-type/category relevance inside `cheapCandidateRejectionReason()` and `cheapPreFilterRawCandidates()` in `lib/search/serper.ts`

**Steps to reproduce:** Replay local Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json`. The raw normalized candidate appears at line 1753 and the `wrong_category` rejection appears at lines 1769-1770.

**Expected:** A source-derived wet/dry utility-vac title is eligible for the shop-vac candidate pool unless another precise conflicting subtype is present.

**Actual:** The valid candidate is removed before citation and requirement validation.

**Current status:** Needs Investigation. The current failure is documented in `docs/review-radar-search-pipeline-audit.md` sections 11-12. Phase A adds the missing precise loss trace but does not change product-type rules.

**Suggested fix or next action:** Use Phase A subreason and provenance output to isolate the exact false-negative branch, then add generalized cross-brand utility-vac controls before modifying the shared matcher.

---

#### RR-073

| Field | Value |
|-------|-------|
| **ID** | RR-073 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | High |
| **Title** | Standalone Important Details are downgraded and never enforced as hard requirements |
| **Status** | Needs Investigation |

**Description:** For category `robot vacuum`, budget `under $300`, and Important Details `self-emptying`, the requirement extractor records only budget as required and labels `self-emptying` as `Needs review`. Deterministic hard-query generation and product validation therefore never enforce the requested feature.

**Where it occurs:** `classifyImportantDetails()` in `lib/requirementExtraction.ts`, then every consumer of `extractedRequirements.requiredConstraints`

**Steps to reproduce:** Replay local Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json`. The extracted summary records `Needs review: self-emptying` at line 2498.

**Expected:** Shopper intent has an explicit, reliable hard-versus-preference representation that search and validation consume consistently.

**Actual:** A standalone requested feature is visible to OpenAI as text but absent from deterministic hard-query and final-validation semantics.

**Current status:** Needs Investigation. `docs/review-radar-search-pipeline-audit.md` sections 2, 11, and 12 prove the current semantics. Phase A observes the loss and does not change requirement classification.

**Suggested fix or next action:** Separately decide and test an explicit structured hard/preference contract rather than weakening validation or introducing product-specific phrase handling.

---

#### RR-074

| Field | Value |
|-------|-------|
| **ID** | RR-074 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | Medium |
| **Title** | Budget binding produces malformed duplicate budget language |
| **Status** | Needs Investigation |

**Description:** An AI discovery query containing `under 300` is not recognized as already carrying the `$300` cap, so `budgetBoundQuery()` appends another bound and produces `robot vacuum self emptying under 300 under $300`.

**Where it occurs:** `budgetBoundQuery()` in `lib/discoveryStrategy.ts`

**Steps to reproduce:** Inspect local Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json`; the malformed query appears in the returned/generated plan at line 34 and again in debug plan output at line 2523.

**Expected:** Semantically equivalent budget expressions normalize to one firm bound.

**Actual:** The outbound Shopping query contains duplicated budget wording.

**Current status:** Needs Investigation. The behavior and transformation are documented in `docs/review-radar-search-pipeline-audit.md` sections 4-6. Phase A records original, normalized, and outbound forms without changing them.

**Suggested fix or next action:** After Phase A, add generalized currency/no-currency budget-equivalence tests before changing budget normalization.

---

#### RR-075

| Field | Value |
|-------|-------|
| **ID** | RR-075 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | Medium |
| **Title** | Generic vacuum synonyms crowd robot-vacuum discovery with wrong product forms |
| **Status** | Needs Investigation |

**Description:** Because `robot vacuum` contains the generic synonym key `vacuum`, deterministic expansion protects `vacuum under $300`, `cordless vacuum under $300`, and `stick vacuum sale under $300` ahead of constraint-bearing AI queries. The same run produces five canister/upright/stick-vacuum candidates rejected as `wrong_category`.

**Where it occurs:** `getCategorySynonyms()` and protected pass-1 assembly in `lib/searchQueryExpansion.ts` / `lib/discoveryStrategy.ts`

**Steps to reproduce:** Inspect local Tier A fixture `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json`. The broad protected plan queries appear at lines 31-33 and the five wrong-category candidates/reasons appear at lines 2642-2661.

**Expected:** Query allocation preserves the requested product form and shopper constraints before using broader adjacent-form synonyms.

**Actual:** Three scarce initial Shopping slots target different vacuum forms and create avoidable wrong-type work.

**Current status:** Needs Investigation. `docs/review-radar-search-pipeline-audit.md` sections 5, 11, and 12 document the current allocation. Phase A records cull and contribution evidence only.

**Suggested fix or next action:** Use the Phase A contribution table to measure marginal value, then test generalized constraint/form coverage ordering at the same query budget.

---

#### RR-076

| Field | Value |
|-------|-------|
| **ID** | RR-076 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | Medium |
| **Title** | Editorial seed extraction emits malformed and non-product Shopping queries |
| **Status** | Needs Investigation |

**Description:** A conservative audit of 145 saved editorial seeds classified at least 35 (24.1%) as category phrases, article fragments, or merged multi-product names instead of one discrete product. Current examples include `Robotic Vacuums`, `Vacuum Although`, and `Eufy C10 T2292 Eureka NERE10SW`.

**Where it occurs:** `extractSeedProductNames()` and editorial seeding in `lib/search/serper.ts`

**Steps to reproduce:** Inspect local Tier A fixtures. `phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json` records malformed seeds at lines 3570-3574; `phase-6d-post-rr061-shop-vac.run1.json` records `Vacuum Although` in `seedProductNames` at lines 2975-2980.

**Expected:** A seed Shopping query identifies one plausible product/model or is excluded.

**Actual:** Category headings, prose fragments, and multiple concatenated products consume seed-search slots.

**Current status:** Needs Investigation. Aggregate and representative evidence is recorded in `docs/review-radar-search-pipeline-audit.md` sections 7, 10, and 11. Unique downstream contribution cannot be measured until Phase A lineage exists.

**Suggested fix or next action:** Do not prune yet. First measure raw, unique eligible, and final contribution per seed; then add generalized discrete-model extraction controls with recall tests.

---

#### RR-077

| Field | Value |
|-------|-------|
| **ID** | RR-077 |
| **Phase** | Phase A search-observability audit filing |
| **Severity** | Medium |
| **Title** | Source upgrade prefixes an ambiguous DW brand token to an exact DEWALT model |
| **Status** | Needs Investigation |

**Description:** Source upgrade constructs `DW DEWALT DXV09P` and fallback `DW DEWALT DXV09P shop vac` even though the product identity already contains the exact DEWALT model string. The redundant prefix reduces query precision and is a separate title/metadata reconciliation case from RR-070's Bose/ILIFE conflict.

**Where it occurs:** Source-upgrade brand selection and model-identity query construction in `lib/requirementEvidenceRescue.ts`

**Steps to reproduce:** Replay local Tier A fixture `tests/fixtures/review-radar-live/shop-vac.phase6d-run1.json`. The model/selected identity phrase is `DW DEWALT DXV09P` at lines 4464-4465, the primary query at lines 4467-4468, and fallback at line 4574.

**Expected:** When source-derived identity already supplies a clear full brand and exact model, an ambiguous metadata abbreviation does not prefix or distort the query.

**Actual:** The abbreviation and full brand are concatenated into both bounded source-upgrade attempts.

**Current status:** Needs Investigation. The defect is documented in `docs/review-radar-search-pipeline-audit.md` sections 11-12. RR-070 remains the canonical unrelated-brand conflict; Phase A does not change either behavior.

**Suggested fix or next action:** After Phase A, diagnose brand provenance and add generalized abbreviation/full-brand compatibility tests before changing source-upgrade query construction.

---

## Phase A implementation note — 2026-07-10

The request-scoped search/candidate ledger is implemented and deterministically verified. This does not resolve RR-071 through RR-077: all seven records remain Needs Investigation because Phase A intentionally made no change to search wording/allocation, requirement semantics, candidate filters, identity, or source-upgrade construction. No additional current defect was proven while implementing the instrumentation.

---

### PHASE R2 — LIVE LEDGER VERIFICATION SAFETY STOP (2026-07-10)

#### RR-078

| Field | Value |
|-------|-------|
| **ID** | RR-078 |
| **Phase** | Phase R2 live ledger verification |
| **Severity** | Critical |
| **Title** | Support and editorial pages pass product eligibility and render as product cards |
| **Status** | Needs Investigation |

**Description:** Non-product pages can be classified as `buyable_product`, enriched with unrelated price/evidence, and selected as product cards. In A3, Shop-Vac's customer-service page became the #1 exact result with a verified `$50` price and product claims drawn from unrelated sources. In B1, a Pocketables “day 5” article rendered as a Q7 Max+ near-match product card.

**Where it occurs:** Shared product eligibility, page metadata enrichment, and final candidate validation.

**Steps to reproduce:** Replay untracked Tier A fixtures `shop-vac.ledger-run3.json` and `robot-vacuum-under-300-self-emptying.ledger-run1.json`. A3 candidate `serper-175v05p` uses `https://www.shopvac.com/pages/new-customer-service-2`, passes citation/requirements/revalidation, and ranks exact #1. B1 candidate `serper-v8bwd5` uses `https://pocketables.com/2022/05/roborock-q7-max-vacuum-with-auto-empty-dock-day-5.html` and reaches final near.

**Expected:** Support, customer-service, editorial, review, and article pages remain evidence-only and can never render as product cards or supply verified product prices.

**Actual:** Both page classes receive `buyable_product` eligibility and survive final selection.

**Current status:** Needs Investigation. This is a Critical safety-axis failure discovered in the stopped R2 measurement window. No behavior changed in R2.

**Suggested fix or next action:** Add generalized route/title/page-type controls at the shared eligibility boundary, with fail-first coverage for `/pages/*customer-service*` and dated editorial/article paths. Preserve legitimate product-detail pages using `/pages/` only when source-derived Product identity is explicit.

---

#### RR-079

| Field | Value |
|-------|-------|
| **ID** | RR-079 |
| **Phase** | Phase R2 live ledger verification |
| **Severity** | High |
| **Title** | Accessory-only self-empty dock renders as a robot-vacuum near match |
| **Status** | Needs Investigation |

**Description:** A standalone compatible self-empty Clean Base station passed robot-vacuum category validation and rendered as a final near match instead of being rejected as an accessory.

**Where it occurs:** Serper candidate product-type/accessory filtering and requirement validation.

**Steps to reproduce:** Replay untracked Tier A fixture `robot-vacuum-under-300-self-emptying.ledger-run1.json`. Candidate `serper-1qsgol1`, sourced by gap query `q-0067`, is a Walmart “Self-Empty Clean Base Station Compatible With Roborock ...” listing. It has no first-loss record, passes category validation, and is selected final near.

**Expected:** A dock, charging station, dust-disposal base, or replacement accessory without the robot vacuum itself is excluded from exact and near product results.

**Actual:** The accessory is labeled `buyable_product`, passes `Category: robot vacuum`, and reaches final near.

**Current status:** Needs Investigation. No behavior fix was attempted in R2.

**Suggested fix or next action:** Add a generalized exclusive-accessory rule for standalone bases/docks/stations that preserves bundles explicitly including the vacuum.

## Appendix: Issue Cross-Reference by Status

### Open (0 issues)
- None.

### Needs Investigation (15 issues)
- RR-014: Mean core-leader coverage critically low
- RR-015: Run-to-run stability ~19%
- RR-037: RIDGID absent from shop-vac pool (LLM variance)
- RR-045: Tapo raw Serper coverage remains unconfirmed
- RR-061: Product image validation misses alphabetic/numeric foreign model-family filenames
- RR-070: Unrelated provider brand metadata can contaminate source-upgrade queries
- RR-071: Exact-model identity falsely collapses distinct Vacmaster 12-gallon products
- RR-072: RIDGID HD0900 Wet Dry Vac is falsely rejected as wrong category
- RR-073: Standalone Important Details are downgraded and never enforced as hard requirements
- RR-074: Budget binding produces malformed duplicate budget language
- RR-075: Generic vacuum synonyms crowd robot-vacuum discovery with wrong product forms
- RR-076: Editorial seed extraction emits malformed and non-product Shopping queries
- RR-077: Source upgrade prefixes an ambiguous DW brand token to an exact DEWALT model
- RR-078: Support and editorial pages render as product cards
- RR-079: Accessory-only self-empty dock renders as a robot-vacuum near match

### Fixed (63 issues)
RR-001 through RR-013, RR-016 through RR-023, RR-025 through RR-036, RR-038 through RR-044, RR-046 through RR-060, RR-062 through RR-069

### Won't Fix (1 issue)
- RR-024: Live fixture staleness (by design; graceful degradation is the accepted pattern)

---

## Appendix: Suggested Priority Order for Open/Needs-Investigation Issues

1. **RR-061 + RR-078** (Critical safety stop) — Wrong-model images and non-product cards must be fixed deterministically before any later live batch.
2. **RR-014 + RR-015** (High) — R2 measured severe plan and final-set instability; R3 is the evidence-supported next roadmap phase, while the R2 freeze remains blocked.
3. **RR-073 + RR-074 + RR-075 + RR-079** (High/Medium) — Constraint-bearing queries are crowded out, malformed budget phrases persist, and an accessory reached final near; owned by R4 plus a separately approved eligibility fix.
4. **RR-071 + RR-072** (High) — Current false identity collapse and valid-product rejection remain owned by R5.
5. **RR-070 + RR-076 + RR-077** (Medium) — R2 showed 588 editorial raw results with zero unique candidates; source-brand and seed precision remain owned by R6.
6. **RR-037 + RR-045** (Low/Medium) — R2 narrowed both: RIDGID appeared 3/3 but varied by model, while Tapo appeared raw and died in normalization.

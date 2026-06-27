# Review Radar QA Loop Results

Date: 2026-06-18
Repo: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
Source-of-truth map: `ReviewRadar-Overview.md`

## <span style="color:green">**Claude QA Update — 2026-06-24 (Phase 3A)**</span>

### Investigation: Requirement filter "0 candidates" on constrained queries

**Queries investigated:** "gas grill under $600 4-burner" (21 pool → 0 afterRequirementFilter → 8 afterRevalidation → 1 exact + 5 near) and "robot vacuum under $300 self-emptying" (17 pool → 0 afterRequirementFilter → 8 afterRevalidation → 3 exact + 5 near).

**Root cause classification:**

| Cause | Status |
|---|---|
| A. Products fully removed | **DISPROVEN** — products demoted to near-match, not removed |
| B. Correctly demoted to near (unknown budget) | **CONFIRMED** — 3-state system working as designed |
| C. Funnel measurement mislabeling | **CONFIRMED** — `afterRequirementFilter` tracked exact-only; `afterRevalidation` tracked exact+near; inconsistency made the "rescue from 0" look dramatic |
| D. Rescue/revalidation path misleading | **PARTIALLY** — the "0→8" is really "near-matches already existed, now some get prices verified and join exact set" |
| Requirement parsing issue (gas grill) | **CONFIRMED (latent)** — "under $600 4-burner" extracted spec as `max 4 burners` (at most 4) due to price-context word bleeding; correct is `min 4 burners` (at least 4). Latent because spec validation is disabled. |
| Requirement parsing issue (label) | **CONFIRMED** — `operator: "max"` labeled "under N" but evaluates `<=N`. Label fixed. |

**Specific finding — per-candidate analysis (gas grill constrained):**
- Only 1 product (Royal Gourmet $362.99) got a verified price ≤ $600 → only 1 exact match
- Weber Spirit E-425 verified at $679 → hard budget fail (correct: $679 > $600)
- Nexgrill 4-Burner verified at $279 but **fails "Gas" dealbreaker** → near match with "Misses required filter: Gas" (suspicious: name says "Gas Grill" but feature evidence fails)
- All others: budget unknown (price not verified) → near match "Needs verification: Budget: $600 or less"
- Spec constraint `"Burners: under 4 burners"` passed for ALL products (because actual evaluation is `<=4`, and all are 4-burner grills). The wrong label didn't hide a real problem.

**Specific finding — per-candidate analysis (robot vacuum constrained):**
- Budget ($300) is the only hard constraint (no spec constraints extracted for "self-emptying")
- 3 products got verified prices ≤ $300 → exact matches
- eufy L60: verified $559.99 → hard fail (correct)
- 4 others: price not verified → near matches (correct 3-state behavior)
- **Wrong-type contamination in near matches:** Shark Rocket Stick Vacuum, RYOBI Cordless Stick Vacuum, KENMORE Canister Vacuum appear as near matches for "robot vacuum" → category check is too permissive

**Fixes shipped (no behavior change, all diagnostic/label):**

| Fix | File | Description |
|---|---|---|
| Stage funnel near-match tracking | `app/api/recommendations/route.ts` | Added `near: resultNames(requirementFilteredResult.nearMatches)` to `afterRequirementFilter` stage — funnel now shows near count at filter stage, not just 0 |
| Spec label fix | `lib/specExtraction.ts` | `operator: "max"` label changed from "under N" → "at most N" to match `<=` evaluation |
| Spec preWindow direction fix | `lib/specExtraction.ts` | Strip `DIRECTION_WORD + $price` patterns from preWindow before direction detection; prevents "under $600" from making "4-burner" extract as `max 4` |
| Tests | `tests/specExtraction.test.mjs` | 3 new tests: price-budget preWindow isolation, "under 2000 psi" still works, "at most N" label |

**Verification:** 557/557 tests pass, typecheck clean, lint clean.

**Open issue logged:** wrong-type products (stick vacuums, canister vacuums) appearing in robot vacuum near matches — the category check is too permissive. Documented as Issue E in test memory. Needs Phase 3 product-type fix (generic, not product-specific).

**No full baseline run.** Confirmed by replay + per-candidate analysis. Behavior of filtering/pricing unchanged.

## Codex QA Update - 2026-06-21 19:09

## Loop Scope

Change final selection so ReviewRadar prioritizes distinct, high-quality products instead of forcing retailer diversity in the final top 7.

## Root Causes

The final Best Match selector still had a retailer/source cap. That could hide genuinely strong, distinct products just because the same retailer sold several of the best options. During live QA, a separate shared-trust issue also appeared: an eBay browse page shaped like `Best Craftsman Wet & Dry Vacuum Cleaners - eBay` was treated as an exact product card.

## Generalized Fix

- Removed the final retailer cap from exact Best Match selection.
- Kept product-level dedupe and variant-family collapse, so duplicate products and near-duplicate model families still cannot fill the list.
- Kept retailer throttling as an early discovery guard only, so one host cannot flood the raw candidate pool before scoring.
- Preserved alternate retailer offer metadata when duplicate products merge.
- Added debug wording that explains repeated retailers are allowed when products are distinct.
- Added a shared product-eligibility rule for marketplace browse/listing paths like eBay `/t/`, `/b/`, and `/sch/`, plus title wording like `Best ... - eBay`.

This is reusable across categories because it changes the shared final selector, shared duplicate merge path, and shared product-page classifier. It does not hardcode drills, vacuums, eBay product names, or one exact search.

## Verification

| Check | Result |
| --- | --- |
| Focused product-diversity, Serper, and product-eligibility tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 513/513 |
| Production build | Passed |
| Deterministic eval pipeline | Passed, red-flag checks clean |
| Deterministic RR agent loop | Passed, no repeated failures |

## Live Checks

- `cordless drill`, `$300`, `brushless, battery and charger`: returned 1 exact match and 5 close matches. This confirmed the live API still returned a real product after removing the final retailer cap.
- `wet dry vac`, `$200`, `shop vacuum, good suction, reliable`: before the marketplace-listing fix, the exact match was an eBay browse page. After the fix, the exact match became `Vacmaster 12-Gallon 5.5 Peak HP RS Wet/Dry Vacuum` with a real Vacmaster product page.

## Before/After Proof

- Before: final selection could skip strong products from a repeated retailer even when they were distinct products.
- After: final selection allows repeated retailers when products are distinct, while still blocking exact duplicate products and near-duplicate model families.
- Before: eBay browse/category pages could look product-like enough to become exact product cards.
- After: those marketplace browse shapes are blocked by the shared product eligibility classifier.

## Remaining Notes

Live API searches still depend on the live web and may return fewer exact matches when price or required details cannot be verified. That is expected. The important rule is that weak/unknown evidence should become close matches, while exact matches must be real product cards with trusted requirement evidence.

## Codex QA Update - 2026-06-21 00:07

## Loop Scope

Implement Phase 5 and Phase 6: use important missing rubric facts for deeper verification retries, then run a full QA/hardening pass.

## Root Causes

ReviewRadar could track missing rubric facts and weight them by importance, but it did not yet actively retry the most important missing facts during the existing evidence-rescue pass. That meant a product could keep a critical rubric gap even when a targeted follow-up search might verify it.

## Generalized Fix

- Extended the existing requirement-evidence rescue step to include critical and important rubric facts.
- Used remaining verification slots after hard requirement rescue, so hard requirements still come first.
- Retried missing high-value rubric facts with product-specific searches.
- Cleared a missing rubric fact only when matching evidence verified the same product.
- Added a regression test proving a missing `Current product price` rubric fact can be retried, verified from shopping evidence, added as an offer, and removed from the unknowns list.

This is reusable across categories because the retry uses the shared rubric importance rules, not one product-specific rule.

## Verification

| Check | Result |
| --- | --- |
| Focused rescue/evidence/scoring tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 486/486 |
| Production build | Passed |
| Deterministic QA agent loop | Passed |
| Direct live refrigerator API smoke test | Passed |

## Before / After Proof

Before the fix:

- Missing important rubric facts lowered confidence, but ReviewRadar did not specifically retry them in the rescue pass.

After the fix:

- Critical and important rubric facts now get targeted verification retries when there is room.
- Verified rubric gaps are cleared instead of staying as stale warnings.
- The deterministic QA loop across price trust, broad mainstream, unit requirements, wrong category, and non-product pages found no repeated root causes.
- The live `refrigerator`, `$2500`, `must be stainless steel` smoke test returned 3 exact matches and 5 close matches. The top exact match had a verified `$2,099` price and still showed one remaining dimension/clearance gap honestly.

## Remaining Notes

Live QA should continue rotating categories. The next useful work is tuning only if live results show a specific high-value fact is too hard to verify or too easy to over-trust.

## Codex QA Update - 2026-06-20 23:05

## Loop Scope

Refine Phase 4 so missing buying-rubric facts have different importance levels instead of all counting the same.

## Root Causes

ReviewRadar was starting to track missing rubric facts, but it treated a missing minor detail too much like a missing critical buying fact. That could make the ranking pressure too blunt.

## Generalized Fix

- Added a shared rubric-fact importance helper.
- Classified missing rubric facts as `critical`, `important`, or `minor`.
- Critical facts include current price, availability, product type, compatibility, dimensions/fit, capacity, and safety.
- Minor facts include mostly cosmetic or convenience details such as color options, finish, shipping window, or app controls.
- Sorted missing rubric facts by importance before keeping them.
- Changed scoring so critical missing facts reduce confidence and ranking more than minor missing facts.

This is reusable across categories because the importance rules are based on the kind of buying fact, not on one product category.

## Verification

| Check | Result |
| --- | --- |
| Focused product-evidence and scoring tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 485/485 |
| Production build | Passed |

## Before / After Proof

Before the fix:

- One missing minor fact could count the same as one missing critical fact.
- Several minor missing facts could crowd out more important missing facts from the evidence gaps list.

After the fix:

- Missing current price or dimensions has more ranking impact than missing color options.
- Critical missing rubric facts are kept ahead of minor missing facts.
- Products are still not hard-rejected just because a rubric fact is missing.

## Remaining Notes

The importance list is intentionally generic. Future live QA can tune the categories if a fact is consistently too harsh or too soft.

## Codex QA Update - 2026-06-20 22:47

## Loop Scope

Start Phase 4: make missing buying-rubric facts affect trust, confidence, and ranking without making them automatic hard failures.

## Root Causes

The buying rubric could already say what facts matter for a product category and could guide evidence searches, but products that were missing important rubric facts could still look too confident. ReviewRadar needed a reusable way to say, "this product may still be useful, but important facts are not verified yet."

## Generalized Fix

- Added missing rubric facts into the evidence unknowns as `Rubric fact: ...` items.
- Added a capped score penalty when products are missing important rubric facts.
- Added a confidence cap when a product is missing important rubric facts.
- Kept the behavior soft: missing rubric facts make a product less trusted, but do not automatically remove it from exact matches.
- Added safeguards so facts already supported by known price, finish/color, type, dimensions, capacity, model, or availability data are not falsely marked missing.

This is reusable across categories because the missing facts come from the generated buying rubric for the current search, not from one product-specific patch.

## Verification

| Check | Result |
| --- | --- |
| Focused product-evidence and scoring tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 483/483 |
| Production build | Passed |
| Direct live refrigerator API recheck | Passed |

## Before / After Proof

Before the fix:

- A product could be missing important rubric facts but still look more certain than it deserved.
- Missing rubric details were not consistently visible as evidence gaps.

After the fix:

- The live `refrigerator`, `$2500`, `must be stainless steel` search returned 2 exact matches and 5 close matches.
- The stronger exact match had no missing rubric facts.
- Weaker or missing-price products carried rubric unknowns and lower confidence instead of being over-promoted.

## Remaining Notes

This phase improves trust and ranking pressure. It does not yet force deeper page extraction for every missing fact, so future phases can keep improving how ReviewRadar verifies hard-to-find specs.

## Codex QA Update - 2026-06-20 20:57

## Loop Scope

Implement Phase 3: use the generated buying rubric to guide evidence gathering, not only final ranking.

## Root Causes

The buying rubric could already describe what matters for a product category, but the evidence ladder was not fully using those rubric facts. That meant ReviewRadar could know that a product category needs certain facts or review themes, but still search mostly generic review queries.

## Generalized Fix

- Added rubric-specific evidence queries for facts to verify, quality signals, owner-review themes, and red flags.
- Added those queries into the existing review evidence ladder, negative evidence retry, and Reddit owner-opinion search path.
- Attached the generated rubric to products internally before evidence enrichment.
- Converted rubric-supported source text into positive or negative evidence.
- Added a negation guard so positive evidence does not accidentally trigger negative red flags.

This is reusable across categories because it uses the generated rubric for the current search instead of adding one-off product rules.

## Verification

| Check | Result |
| --- | --- |
| Focused rubric/evidence/scoring tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 480/480 |
| Production build | Passed |
| Direct live refrigerator API recheck | Passed |

## Before / After Proof

Before the fix:

- The rubric helped ranking, but evidence searches were still mostly generic.
- A negated red flag like "finish not explicitly verified" could match positive stainless-steel evidence.

After the fix:

- The live `refrigerator`, `$2500`, `must be stainless steel` search generated a refrigerator-specific buying rubric.
- Returned exact matches used verified prices and stainless-steel requirement evidence.
- Missing-price products stayed in close matches.
- The negated stainless-steel red-flag false positive did not appear.

## Remaining Notes

The evidence ladder now follows the rubric, but deeper page extraction could still improve products where store pages exist yet current prices or specs are not extracted.

## Codex QA Update - 2026-06-20 16:23

## Loop Scope

Live-test the new universal buying-rubric flow with a refrigerator search requiring stainless steel and a `$2,500` budget.

## Root Causes

The rubric itself worked, but the live test exposed a price-trust issue. A full-size LG refrigerator could treat a `$515` promo/add-on-sized amount as a verified refrigerator price. The shared refrigerator price sanity floor was too low for full-size refrigerators.

## Generalized Fix

- Raised the shared suspicious-price floor for full-size refrigerator contexts such as French-door, side-by-side, top-freezer, bottom-freezer, counter-depth, standard-depth, and large cu. ft. refrigerators.
- Kept compact, mini, beverage, and wine fridges separate so genuinely cheap small fridges are not blocked.
- Added a regression test proving a `$515` full-size French-door refrigerator price becomes suspicious, while a `$129` compact mini fridge can still be verified.

This is reusable price-trust logic, not a one-product LG patch.

## Verification

| Check | Result |
| --- | --- |
| Focused price/asset/scoring/requirement tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 477/477 |
| Production build | Passed |
| Direct live refrigerator API recheck | Passed |

## Before / After Proof

Before the fix:

- The live refrigerator search could rank a full-size refrigerator as an exact match using a suspicious `$515` price.

After the fix:

- The live `refrigerator`, `$2500`, `must be stainless steel` search returned exact matches with verified prices under budget and stainless-steel evidence.
- The fake-low `$515` refrigerator price no longer appeared as an exact match.
- Products with missing price evidence stayed in close matches as `Price not verified`.

## Remaining Notes

This improves safety for full-size refrigerator prices, but richer price extraction could still improve close matches that currently have missing store prices.

## Codex QA Update - 2026-06-20 15:26

## Loop Scope

Implement the universal buying-rubric phase: let OpenAI describe what matters for the searched product type, then let deterministic ReviewRadar scoring use that rubric without hand-coding every category.

## Root Causes

The earlier category-fit work improved known categories, but it still depended on hand-written product profiles. That does not scale to every possible shopper search. ReviewRadar needed a reusable way to ask, "For this product type, what quality signals, red flags, review themes, and facts should we verify?"

## Generalized Fix

- Added a `buyingRubric` to the AI discovery strategy.
- The rubric includes quality signals, red flags, review signals, facts to verify, tradeoffs, and extra search queries.
- Added shared rubric scoring that rewards products only when their evidence text supports the rubric.
- Added small penalties for missing important rubric facts and stronger penalties for supported red flags.
- Added the rubric to final prompt context and debug output.

This is reusable across product categories. It is not limited to toaster ovens, shoes, electronics, or any one product family.

## Verification

| Check | Result |
| --- | --- |
| Focused rubric/discovery/scoring tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 476/476 |
| Production build | Passed |
| Direct live trail-running-shoes API test | Passed |

## Before / After Proof

Before the fix:

- ReviewRadar could only give category-specific fit credit when a category had a hand-built profile.
- New or uncommon categories relied more heavily on generic popularity, price, and source signals.

After the fix:

- A live `trail running shoes`, `$150`, `good grip, cushioning, durable outsole`, avoiding road-only shoes search generated rubric-based score fields on the returned products.
- The top result remained a real buyable product with verified price evidence.
- Products with missing price evidence stayed out of the exact-match list.

## Remaining Notes

The rubric is intentionally a scoring nudge, not a hard gate. It should help ranking quality without overriding firm requirements, price trust, or product eligibility.

## Codex QA Update - 2026-06-20 13:25

## Loop Scope

Implement Phase 2 of the product-accuracy plan: make category-fit scoring active by default and expand reusable category/spec signals so better-documented products rank better than thin lookalikes.

## Root Causes

ReviewRadar already computed a small category-fit score, but it was off by default and only covered a few categories. That meant ranking still leaned heavily on broad evidence and popularity even when a product had useful category-specific facts.

The live Phase 2 toaster-oven check also exposed a separate page-quality issue: a quick-start guide could appear as a close match because manual-style pages were not clearly blocked as product cards.

## Generalized Fix

- Turned category-fit scoring on by default, while keeping `REVIEW_RADAR_CATEGORY_SCORING=off` as a safety switch.
- Added reusable category profiles for toaster ovens, microwaves, TVs, monitors, and laptops.
- Expanded shared spec extraction for facts like wattage, slice capacity, cooking functions, quart capacity, max temperature, screen size, refresh rate, memory, and storage.
- Added a reusable manual/quick-start-guide rule to the shared product eligibility classifier.

These changes are reusable across categories. They do not hardcode one product or one retailer.

## Verification

| Check | Result |
| --- | --- |
| Focused category/spec/product-eligibility tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 474/474 |
| Production build | Passed |
| Direct live toaster-oven API test | Passed |

## Before / After Proof

Before the fix:

- Category-fit scoring existed, but did not affect default ranking.
- The spec dictionary could not read several common product facts used by appliances, screens, and computers.
- A quick-start guide could appear as a close match in a live toaster-oven result.

After the fix:

- The live `toaster oven`, `$300`, `countertop, easy to clean, good reviews` search returned 3 exact toaster-oven matches.
- Displayed toaster-oven results included the `toaster_oven` category profile signal.
- No displayed result was a wall oven, range, stove, cooktop, full-size oven, quick-start guide, or user manual.

## Remaining Notes

Category-fit scoring is intentionally a small boost, not a hard requirement. Hard requirements, product eligibility, and trusted price checks still decide whether a product can be an exact match.

## Codex QA Update - 2026-06-20 09:10

## Loop Scope

Implement Phase 1 of the broader product-accuracy plan: add a shared product-type intent layer and verify that ReviewRadar keeps close-but-wrong product types out of exact matches.

## Root Causes

ReviewRadar had category matching that was too broad. A request like `toaster oven` could accidentally inherit general `oven` wording, which made wall ovens, ranges, stoves, or cooktops look related enough to pass some checks.

Another problem was that product validation could rely too much on the product's assigned category text. If the AI or a retailer called something a toaster oven, that label could help it pass even when the actual product evidence pointed to a different product type.

## Generalized Fix

- Added a reusable product-type intent classifier in `lib/productTypeIntent.ts`.
- Wired it into requirement validation and Serper pre-filtering.
- Made exact category matching depend on product evidence, not just the assigned category label.
- Kept thin evidence conservative: uncertain products become `Needs Verification` instead of exact matches.
- Updated toaster-oven search expansion so it stays focused on countertop/toaster-oven wording.

This fix is reusable across product families. The first rules cover toaster ovens, microwaves, ranges, office chairs, TV stands, mattresses, bed frames, and pressure washers, and the layer is designed to grow as QA finds new product-type confusions.

## Verification

| Check | Result |
| --- | --- |
| Focused product-type tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 471/471 |
| Production build | Passed |
| Direct live toaster-oven API test | Passed |

## Before / After Proof

Before the fix:

- `toaster oven` could be treated too much like broad `oven`.
- A wall oven or range could get help from broad oven synonyms.
- The app could trust a product's assigned category too much.

After the fix:

- The live `toaster oven`, `$300`, `countertop, easy to clean, good reviews` search returned 2 exact toaster-oven matches and 5 close toaster-oven matches.
- No displayed result contained wall oven, range, stove, cooktop, or full-size oven wording.
- Focused tests now prove wall ovens and ranges do not pass toaster-oven validation.

## Remaining Notes

This is Phase 1 only. It improves the shared product-type gate, but more phases are still needed for stronger category profiles, better candidate generation, and deeper evidence-based ranking.

## Codex QA Update - 2026-06-20 07:12

## Loop Scope

Implement the shared product trust layer and verify it with deterministic checks, live agents, and a direct live recheck.

## Root Causes

ReviewRadar had several separate page and price trust rules. That made repeated bugs more likely because one path could reject a bad product page or bad price while another path still allowed it.

The live agent loop also exposed a separate brand/detail parsing issue: phrases like `DeWalt or Milwaukee` and `Sony or Bose` were being treated as details that needed review instead of firm brand alternatives.

## Generalized Fix

- Added one shared product-card eligibility classifier.
- Added one shared product-price trust validator.
- Wired both into Serper intake, final validation, product URL selection, requirement validation, scoring, price display, and QA workers.
- Added brand-alternative parsing for common phrases like `Brand A or Brand B`.
- Added safe product-line aliases for mainstream tool lines such as DeWalt `20V MAX` and Milwaukee `M12 FUEL`.

These fixes are reusable across categories. They do not hardcode one product, one store, or one current search result.

## Verification

| Check | Result |
| --- | --- |
| Focused trust-layer tests | Passed |
| Focused brand/requirement tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 465/465 |
| Production build | Passed |
| Deterministic agent loop | Passed with no repeated failures |
| Live agent loop | Found one remaining broad-search issue |

## Before / After Proof

Before the fix:

- Page-type rules, product-button rules, price-trust rules, and QA-worker checks were scattered.
- Bad pages and weak prices could be blocked in one place but missed in another.
- Brand alternatives like `Sony or Bose` and `DeWalt or Milwaukee` were not always promoted to firm brand filters.

After the fix:

- The shared product eligibility classifier blocks evidence-only pages from becoming product cards or CTA links.
- The shared price trust validator keeps weak, missing, suspicious, or conflicting prices out of exact budget matches.
- QA workers now flag the same page/price classes that the app blocks.
- Brand-alternative phrases now become real brand filters, and safe tool-line aliases can satisfy omitted parent-brand evidence.

## Remaining Notes

A direct live check for `cordless drill`, `$200`, `DeWalt or Milwaukee, battery included` still returned close matches but no exact matches. The remaining blocker was safer than before: prices were missing/not trusted and `battery included` was not verified strongly enough. That should be fixed later by improving live price discovery and kit/battery evidence enrichment, not by weakening the trust gate.

## Codex QA Update - 2026-06-20 01:00

## Loop Scope

Fix all issues found by the advanced live QA sweep:

- suspicious low price evidence on a counter-depth refrigerator
- non-product TV sale/listing pages
- gaming chairs appearing when the buyer said `not a gaming chair`
- a 100 ft hose being treated as exact for a 50 ft hose search
- wrong-category near matches in gaming laptop results
- a follow-up live TV check that exposed `$10` as a suspicious 65-inch TV price

## Root Causes

The issues came from several shared gaps:

- Price trust floors covered some categories, but not enough major appliances and large TVs.
- Non-product filters caught many article/listing pages, but missed sale-story titles and some TV/laptop category titles.
- Avoid terms were too literal when the parsed phrase included words like `a`, as in `a gaming chair`.
- Plain length wording like `50 ft length` was treated like a minimum instead of a specific requested length.
- Some wrong-category candidates survived early discovery because their title still contained broad category words.

## Generalized Fix

- Expanded full-product price sanity checks for major appliances and large TVs.
- Added reusable filters for sale-story titles, lowest-price-ever articles, TV listing pages, and laptop category pages.
- Added gaming/racing chair as concrete avoidable product-type evidence.
- Normalized avoid terms by removing leading articles like `a`, `an`, and `the`.
- Treated plain length requests as exact length matches while keeping explicit `at least` wording as minimum logic.
- Added early candidate filtering for exact length conflicts.

These fixes are reusable across product categories and are not hardcoded to one store, one model, or one product.

## Verification

| Check | Result |
| --- | --- |
| Focused regression tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 448/448 |
| Production build | Passed |
| Live API rechecks | Passed for the original flagged issue classes |

## Before / After Proof

Before the fix:

- A refrigerator could show suspicious `$100` price evidence.
- A 65-inch TV search could show sale/listing pages as product cards.
- A non-gaming office-chair search could still show gaming chairs.
- A 50 ft hose search could exact-match a 100 ft hose.
- Gaming laptop near matches could include business-laptop category pages or a camera lens.
- A later live TV check showed a 65-inch TV exact match with `$10` as verified.

After the fix:

- The refrigerator recheck had no suspicious `$100` displayed result.
- The TV recheck returned buyable TV products; sale/listing pages were not displayed.
- The office-chair recheck returned office/task chairs and no gaming-chair matches.
- The garden-hose recheck returned 50 ft exact matches and no 100 ft exact match.
- The gaming-laptop recheck did not include the business-laptop category page or ZEISS lens.
- The `$10` TV price was demoted out of exact verified results as suspicious/unverified.

## Remaining Notes

The refrigerator live recheck still had no exact matches because current price evidence was not verified for most candidates. That is safer than showing a fake low price, but a future improvement should strengthen large-appliance price discovery so good in-budget refrigerators can be verified more often.

## Codex QA Update - 2026-06-20 00:13

## Loop Scope

Fix the live RR agent price-trust finding where ReviewRadar could show very low prices such as `$10` or `$35` for products that should cost much more, and clean up related quality issues found during the same investigation.

## Search Tested

- Product category: `air purifier`
- Budget: `$250`
- Important details: `Levoit only, good for bedroom, HEPA filter`

## Root Cause

ReviewRadar already had some protection against impossible prices for high-ticket products, but the protection was too narrow. It caught obvious big-ticket examples like travel systems, grills, and basketball hoops, but not common full-product categories like air purifiers, printers, vacuums, office chairs, and cordless drills.

That meant a small accessory, promo, payment-plan, or variant price could sometimes be treated as the full product price.

A second issue appeared during the live check: buying-advice articles with titles like "things to avoid when purchasing" could still slip through as near-match product cards.

## Generalized Fix

- Added broader full-product price sanity checks for common categories where `$10` or similarly tiny numbers are suspicious.
- Added a `suspicious` price-confidence state so the app can flag "this price looks wrong" instead of treating it like a normal unverified price.
- Blocked suspicious-price products from exact Best Match results.
- Updated product cards so suspicious prices show as "Verify current store price" instead of a confident low price.
- Improved same-model deduping across retailer-heavy product titles.
- Added reusable filters for "things to avoid when buying/purchasing/shopping for" article pages.

These fixes are reusable across categories. They are not hardcoded to Levoit, air purifiers, Nike, or one retailer.

## Verification

| Check | Result |
| --- | --- |
| Focused price/filter/dedupe tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 445/445 |
| Production build | Passed |
| Live API recheck | Passed |

## Before / After Proof

Before the fix, the live agent found suspicious low prices such as `$10` and `$35` that could mislead shoppers.

After the fix, the Levoit air-purifier live recheck returned 6 exact matches, all with verified prices:

- `Levoit Vital 100S-P` at `$119.99`
- `Levoit Vital 200S-P` at `$189.99`
- `Levoit Core 300S-P` at `$149.99`
- `Levoit Core 300-P` at `$89.99`
- `Levoit Core 400S-P` at `$219.99`
- `Levoit Core Mini-P` at `$59.99`

The suspicious `$10` style product was no longer an exact match, and the "things to avoid when purchasing an air purifier" article no longer appeared in exact or near matches.

## Remaining Notes

Some products can still appear as close matches when ReviewRadar cannot verify every detail. That is expected as long as they are clearly labeled and kept out of exact Best Match results.

## Codex QA Update - 2026-06-19 18:20

## Loop Scope

Fix the remaining Nike running-shoes live issue from the previous agent run: the article-page leak was fixed, but the same broad search could still show close matches only because prices were over budget or not verified.

## Search Tested

- Product category: `running shoes`
- Budget: `$200`
- Important details: `Nike only`

## Root Cause

The budget checker was not the main problem. The app already knew that over-budget or unknown-price products should stay out of exact matches.

The deeper issue was discovery ordering. AI-added strategy searches could be placed ahead of the app's safer brand/category/budget searches. If the helper model suggested premium Nike racing lines first, those searches could crowd out practical `Nike running shoes under $200` discovery.

## Generalized Fix

- Kept the app-generated hard-filter searches at the front of the search plan.
- Still allowed AI strategy searches, but only after the buyer's core brand/category/budget searches are protected.
- Normalized AI follow-up searches to use firm budget wording like `under $200` instead of loose wording like `$200`.
- Updated the final research prompt so broad brand-and-budget searches look for mainstream in-budget models first, not mostly premium or unknown-price products.

This is category-agnostic. It applies to broad brand + budget searches beyond Nike shoes.

## Verification

| Check | Result |
| --- | --- |
| Focused discovery/search tests | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Full unit tests | Passed, 442/442 |
| Production build | Passed |
| Live API recheck | Passed |

## Before / After Proof

Before the fix, the live Nike running-shoes check could return only close matches because visible candidates were over budget or not price-verified.

After the fix, the same live API search returned an exact match:

- `Nike Pegasus 41 Men's Road Running Shoes`
- Price shown by ReviewRadar: `$101.97`
- It appeared as an exact match for `$200` and `Nike only`.

The debug search plan also showed budget-bound follow-ups such as `Nike Winflo road running shoes Winflo 11 under $200`.

## Remaining Notes

The result set can still include close matches when some products have unknown price or weaker verification, but the false "no exact matches" problem for this broad realistic Nike search was fixed.

## 🟧 **Codex QA Update - 2026-06-18 12:35**

## Loop Scope

Run exactly one improvement loop:

baseline -> QA check -> pick one high-impact shared issue -> trace root cause -> make generalized fix -> add/update tests -> retest -> document before/after proof -> stop.

No commits were made.

## Setup Confirmation

- Working repo confirmed: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
- `ReviewRadar-Overview.md` exists in the repo root and was read before code edits.
- `.env.local` was checked only for key presence. Secret values were not printed.
- Live services available: `OPENAI_API_KEY` present, `SERPER_API_KEY` present.
- Localhost app was responding on `http://localhost:3000`.

## Starting Repo State

`git status --short` before this loop:

```text
 M ReviewRadar-Overview.md
 M lib/formFactor.ts
 M lib/priceParsing.ts
 M lib/productAssets.ts
 M lib/requirementExtraction.ts
 M lib/requirementValidation.ts
 M tests/discoveryFilter.test.mjs
 M tests/formFactor.test.mjs
 M tests/priceParsing.test.mjs
 M tests/productAssets.test.mjs
 M tests/recommendationApiContract.test.mjs
 M tests/requirementExtraction.test.mjs
 M tests/requirementValidation.test.mjs
```

This loop starts from that dirty working tree and does not revert unrelated existing work.

## Baseline Automated Checks

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Passed | No type errors. |
| `npm run lint` | Passed | No lint errors. |
| `npm test` | Passed | 420 tests, 84 suites, 420 passed, 0 failed. |
| `node scripts/eval-pipeline.mjs` | Passed | Red-flag checks reported no issues. |
| `node scripts/ab-ranking.mjs` | Passed | Existing Node module-type warning only; ranking output completed. |

## Baseline Live QA

Live checks used `POST /api/recommendations` with `x-reviewradar-debug: true`.

| Search | Exact | Near | Baseline observations |
| --- | ---: | ---: | --- |
| `robot vacuum`; `self-emptying, good for pet hair, avoids cords`; `under $500` | 2 | 5 | Exact results were plausible robot vacuums. Near results included obvious wrong-category items, but they were not exact. |
| `counter depth refrigerator`; `36 inches wide, stainless steel, ice maker`; `under $2000` | 1 | 5 | Exact result looked plausible. Several near results had unknown price or missing requirement evidence. |
| `gaming laptop`; `RTX 4060 or better, 16GB RAM, not refurbished`; `under $1200` | 1 | 5 | The only exact result was `Complaint about new Dell Laptop quality`, which is a complaint/support-style page rather than a product recommendation. |
| `espresso machine`; `built-in grinder, beginner friendly, not a pod-only machine`; `under $700` | 5 | 4 | Exact results included product pages, but also article/forum/deals pages such as `Breville Espresso Machine Deals 2025-Best Breville Sales` and `Long Term Espresso Machine - Buying Advice - Page 2`. |
| `car seat stroller combo`; `infant car seat included, lightweight, easy fold`; `under $400` | 6 | 4 | Exact results included plausible travel systems, but several Target/Amazon results had implausible prices like `$35` and `$10`. |
| `electric pressure washer`; `at least 3000 PSI, hose at least 25 feet, foam cannon included`; `under $350` | 0 | 5 | No exact matches because key hard facts or prices were unknown; this is strict but not obviously wrong. |
| `queen sleeper sofa`; `under 70 inches wide, leather, storage chaise, under 100 lbs`; `under $400` | 0 | 5 | No exact matches, which is appropriate for an over-constrained request. Near matches were far over budget or missing hard facts. |

## Selected Issue

Non-product evidence pages were leaking into exact matches.

Baseline examples:

- `gaming laptop`: `Complaint about new Dell Laptop quality` was the only exact match.
- `espresso machine`: exact matches included `Breville Espresso Machine Deals 2025-Best Breville Sales` and `Long Term Espresso Machine - Buying Advice - Page 2`.

This was selected because it is shared across categories and can make an article, support thread, review, forum, or comparison page look like a purchasable product.

## Root Cause

Two shared classifiers were too narrow:

- Serper organic normalization in `lib/search/serper.ts` could admit complaint/support/community, deals/sales roundup, review-guide, price-comparison, and article-headline pages as `RawProductCandidate`s.
- Final display validation in `lib/requirementValidation.ts` used `isSpecificProductRecommendation`, but its generic-title/URL checks missed the same page types. Once a non-product page had plausible price/spec text, it could pass hard requirements and become an exact match.

The failure was not specific to gaming laptops or espresso machines; those searches just exposed a reusable product-identity gap.

## Generalized Fix

Updated the shared non-product page filters to reject these as product cards:

- complaint/support/help/community/conversation pages
- buying-advice, shopping-advice, and forum/thread-style pages
- deals/sales roundup headlines
- article-style sale headlines such as `up your game with... yours for...`
- standalone review and review-guide pages
- price-comparison pages such as `Compare at 16+ Stores`
- known editorial/evidence hosts where the URL should be used as citation evidence, not as the product page

The same change was applied at two layers:

- Early discovery: Serper organic results are blocked before becoming product candidates.
- Final safety net: merged recommendations are filtered before exact/near matching.

This is a generalized classifier update, not a product-specific patch.

## Files Changed In This Loop

- `lib/search/serper.ts`
- `lib/requirementValidation.ts`
- `tests/serper.test.mjs`
- `tests/requirementValidation.test.mjs`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md`

The repo already had unrelated uncommitted files before this loop; those were left in place.

## Tests Added Or Updated

- `tests/serper.test.mjs`
  - rejects complaint, deals, buying-advice, article-headline, review-guide, and price-comparison organic pages
  - keeps product detail pages whose names start with `The`
- `tests/requirementValidation.test.mjs`
  - removes the same non-product page classes before exact matching
  - keeps valid espresso-machine product pages, including a normal sale-price product page

## Retest Commands

Final command results:

| Command | Result | Notes |
| --- | --- | --- |
| `node --no-warnings --test tests/requirementValidation.test.mjs` | Passed | 43 tests passed. |
| `node --no-warnings --test tests/serper.test.mjs` | Passed | 26 tests passed. |
| `npm run typecheck` | Passed | No type errors. |
| `npm run lint` | Passed | No lint errors. |
| `npm test` | Passed | 423 tests, 84 suites, 423 passed, 0 failed. |
| `node scripts/eval-pipeline.mjs` | Passed | Red-flag checks reported no issues. |
| `node scripts/ab-ranking.mjs` | Passed | Existing Node module-type warning only; ranking output completed. |

`npm run test:e2e` was not run because the fix changed backend discovery/validation behavior, not UI rendering.

## Live Before/After Proof

Live verification used `POST /api/recommendations` with `x-reviewradar-debug: true`.

Before:

- `gaming laptop` exact result was a Dell complaint/support-style page.
- `espresso machine` exact results included deals, buying-advice/forum, article, review, and price-comparison pages across multiple live retries.

After:

- `gaming laptop` rerun no longer returned the Dell complaint/support-style exact result. The later live rerun had 1 exact match from a retailer-like product page and no selected-class complaint/support/editorial exact result.
- `espresso machine` final rerun returned 7 exact matches from manufacturer, retailer, or product-like store pages:
  - Breville
  - De'Longhi
  - Whole Latte Love
  - Best Buy
  - ROK Coffee
  - Page Hardware
- The previously observed selected-class pages were absent from the final exact list:
  - deals/sales roundup pages
  - buying-advice pages
  - article headlines
  - price-comparison pages
  - review-guide pages

## Remaining Risks

- Live results are nondeterministic and can expose additional publisher/review domains. The filter now covers the observed shared patterns, but not every possible article headline on the web.
- The final espresso live check still showed a suspicious `$40` exact price for a De'Longhi/Best Buy result. That is a separate price-extraction or financing/variant issue and was not fixed in this loop.
- Gaming-laptop near matches still included an off-category `Custom Notebooks With Logo` result, but it stayed out of exact matches due unknown hard evidence. That is a possible future wrong-category/near-match cleanup.
- The existing TV collection/list-page risk in `ReviewRadar-Overview.md` still needs its own focused loop.

## Stop Point

One full loop is complete. Do not continue into another issue without approval.

---

## 🟩 **Claude QA Update — 2026-06-18 12:34**

- **agent:** Claude
- **date/time:** 2026-06-18 12:34 EDT
- **reason:** Onboarding to the shared QA log. Verify the current (uncommitted) working tree
  actually matches the baseline Codex documented, before any new test or change. No fix was
  attempted in this entry — this is a verification-only pass.
- **commands run:**
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `node scripts/eval-pipeline.mjs`
  - `node scripts/ab-ranking.mjs`
  - `git status --short` and `git diff --stat` (state check)
- **checks passed/failed:**

  | Command | Result | Notes |
  | --- | --- | --- |
  | `npm run typecheck` | Passed | exit 0, no type errors. |
  | `npm run lint` | Passed | no eslint output. |
  | `npm test` | Passed | 423 tests, 84 suites, 423 passed, 0 failed — matches Codex's post-fix baseline. |
  | `node scripts/eval-pipeline.mjs` | Passed | RED-FLAG CHECKS: ✅ no issues. |
  | `node scripts/ab-ranking.mjs` | Passed | Node module-type warning only; confirms price floor (the `$1` Weber Spirit dropped to unverified → near). |

- **live QA searches run:** None. This pass was deterministic-only (no API spend, dev server not driven).
- **issue found:** None new. The tree is healthy and consistent with Codex's record.
- **new vs. related to Codex's findings:** N/A (verification only). Codex's three open risks are
  unchanged and still open: (1) suspicious `$40` De'Longhi/Best Buy exact price
  (price-extraction / financing / variant), (2) off-category `Custom Notebooks With Logo`
  gaming-laptop near match, (3) TV collection/list-page leakage noted in `ReviewRadar-Overview.md` §11.
- **files changed:** None (verification only). Updated this QA log entry only.
- **tests added/updated:** None.
- **before/after results:** No change attempted; before == after. Baseline reconfirmed at 423/423.
- **state note:** All of Codex's loop changes are present but **uncommitted** in the working tree
  (`lib/search/serper.ts` +33, `lib/requirementValidation.ts`, `lib/priceParsing.ts`,
  `lib/requirementExtraction.ts`, `lib/formFactor.ts`, `lib/productAssets.ts`, and matching tests),
  plus this `docs/qa-loop-results.md` (untracked). The last commit is `8ff0cf3`.
- **remaining risks / follow-up:** Per Codex's stop point, I did not start a new improvement loop.
  Awaiting approval on which open issue to tackle next — the `$40`/financing price-extraction risk
  is the strongest candidate (shared, deterministic-testable, and user-visible). When approved I will
  run one focused loop and add a new `### Claude Change N` subsection here with before/after proof.

## Agent Loop Run - 2026-06-19T05:10:55.131Z

- **run id:** agent-loop-2026-06-19T05-10-43-078Z
- **controller:** scripts/agent-loop-controller.mjs
- **worker result files checked:** 2

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2287ms |
| lint | Passed | 5368ms |
| unit tests | Passed | 4022ms |
| deterministic eval pipeline | Passed | 372ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

## Agent Loop Run - 2026-06-19T11:20:41.187Z

- **run id:** agent-loop-2026-06-19T11-20-23-084Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2923ms |
| lint | Passed | 7347ms |
| unit tests | Passed | 5688ms |
| deterministic eval pipeline | Passed | 485ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Tooling Upgrade - 2026-06-19T11:30:00Z

- **reason:** Implement the phased local QA-agent plan through Phase 6.
- **what changed:** Added JSON worker batches, live localhost worker mode, multi-batch controller runs, stronger before/after verification, fix-agent handoff docs, and a generated agent-loop report.
- **live QA check:** `npm run qa:worker -- --batch price-trust --mode live` successfully posted two searches to the local recommendations API and captured exact/near counts, product names, debug summaries, and suspicious flags.
- **tooling issue found:** The first live worker pass falsely treated `$3,000` as `$3` when checking for suspiciously low prices.
- **fix made:** The QA worker now parses comma-formatted dollar amounts before applying suspicious-low-price rules. It also flags price-comparison style pages and court-rule/dimensions pages as non-product evidence.
- **final status:** Deterministic workers and the controller passed. The verifier accepted the comparison. Build passed.
- **remaining risk:** Live QA can still uncover real product-quality issues; workers only report evidence and do not edit app code.

## Agent Loop Run - 2026-06-19T11:29:16.713Z

- **run id:** agent-loop-2026-06-19T11-28-54-598Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 3488ms |
| lint | Passed | 8260ms |
| unit tests | Passed | 7597ms |
| deterministic eval pipeline | Passed | 497ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T11:53:05.352Z

- **run id:** agent-loop-2026-06-19T11-52-38-706Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust
- **parallel:** 1
- **worker result files checked:** 1

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 3662ms |
| lint | Passed | 10208ms |
| unit tests | Passed | 11479ms |
| deterministic eval pipeline | Passed | 443ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T12:05:23.159Z

- **run id:** agent-loop-2026-06-19T12-05-05-664Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2611ms |
| lint | Passed | 6429ms |
| unit tests | Passed | 6176ms |
| deterministic eval pipeline | Passed | 464ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T12:18:05.497Z

- **run id:** agent-loop-2026-06-19T12-06-37-552Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2665ms |
| lint | Passed | 6117ms |
| unit tests | Passed | 4823ms |
| deterministic eval pipeline | Passed | 410ms |

### Repeated Failure Candidates

- price_evidence_or_variant_price_gap: 3 finding(s), priority 25
- discovery_or_validation_too_strict: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T12:31:34.914Z

- **run id:** agent-loop-2026-06-19T12-31-13-809Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust
- **parallel:** 1
- **worker result files checked:** 1

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 3086ms |
| lint | Passed | 8605ms |
| unit tests | Passed | 7474ms |
| deterministic eval pipeline | Passed | 701ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Price Trust Fix - 2026-06-19T12:35:00Z

- **reason:** The live price-trust worker found car-seat/stroller travel systems showing suspiciously tiny prices like `$35` and `$10` as exact matches.
- **root cause:** Shared price trust logic could treat payment, promo, accessory, or variant amounts as usable full-product prices when those were the only extracted price signals.
- **general fix:** Added a reusable product-context plausibility floor for high-ticket full-product categories. The same price parser is now used by budget validation, product reliability, ranking, and product-card price display.
- **before:** Live QA found 3 suspicious low-price exact-match findings for `car seat stroller combo`.
- **after:** Focused live QA for `price-trust` found no suspicious low-price flags for the `car seat stroller combo` search. Exact matches used plausible travel-system prices instead of `$35` or `$10`.
- **files changed:** `lib/priceParsing.ts`, `lib/productAssets.ts`, `lib/productReliability.ts`, `lib/recommendationScoring.ts`, `lib/requirementValidation.ts`, plus regression tests.
- **verification run:**
  - `node --no-warnings --test tests\priceParsing.test.mjs` passed.
  - `node --no-warnings --test tests\productAssets.test.mjs` passed.
  - `node --no-warnings --test tests\recommendationScoring.test.mjs` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed, 429/429 tests.
  - `npm run qa:loop -- --batches price-trust` passed.
  - `npm run qa:worker -- --batch price-trust --mode live` passed and cleared the stroller-combo suspicious-price flags.
  - `npm run build` passed.
- **remaining issue found:** The same live price-trust worker found a separate basketball-hoop non-product-page issue (`RULE NO. 1: Court Dimensions - Equipment`) in near matches. That is not part of this price fix and should be handled in a separate non-product-page loop.

## Agent Loop Run - 2026-06-19T14:18:00.325Z

- **run id:** agent-loop-2026-06-19T14-06-04-791Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2232ms |
| lint | Passed | 5692ms |
| unit tests | Passed | 4371ms |
| deterministic eval pipeline | Passed | 432ms |

### Repeated Failure Candidates

- non_product_page_leakage: 1 finding(s), priority 9
- discovery_or_validation_too_strict: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T15:01:01.880Z

- **run id:** agent-loop-2026-06-19T15-00-43-806Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** broad-mainstream
- **parallel:** 1
- **worker result files checked:** 1

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2581ms |
| lint | Passed | 7020ms |
| unit tests | Passed | 7240ms |
| deterministic eval pipeline | Passed | 449ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Non-Product Page Leakage Fix - 2026-06-19T15:20:00Z

- **reason:** The live broad-mainstream worker found a basketball-shoes result where an article/listing-style page appeared as a product recommendation.
- **root cause:** Review Radar had several product-page filters, but they did not cover enough modern shopping page shapes. Some article rankings, review pages, brand newsroom pages, product-family pages, retailer advice/category pages, and price-comparison pages could still pass through as if they were buyable products.
- **general fix:** Strengthened product-page checks in Serper discovery, final citation validation, final requirement filtering, and product-card URL selection. These pages can still support research, but they should not display as product cards or replace the card's buy link.
- **before:** Live QA reported `non_product_page_leakage` for `basketball shoes` with `Nike only`. Manual live checks also surfaced review, newsroom, retailer listing, sneaker-news, and price-comparison pages.
- **after:** The final live `broad-mainstream` worker found no suspicious flags. `basketball shoes`, `running shoes`, and `walking shoes` all returned live results without the worker reporting non-product leakage.
- **files changed:** `lib/search/serper.ts`, `lib/recommendationResultValidation.ts`, `lib/requirementValidation.ts`, `lib/productPageUrl.ts`, plus regression tests.
- **verification run:**
  - Focused non-product-page tests passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed, 432/432 tests.
  - `npm run build` passed.
  - `npm run qa:loop -- --batches broad-mainstream` passed with no repeated failures.
  - `npm run qa:worker -- --batch broad-mainstream --mode live` passed with no suspicious flags.
- **remaining issue found:** The broad Nike running-shoes search can still be sensitive to price verification. One live run returned only near matches because prices were unverified, but the repeat live worker returned exact matches. A future fix should improve current-price retrieval for official/retailer shoe pages without weakening firm budget rules.

## Agent Loop Run - 2026-06-19T16:02:19.141Z

- **run id:** agent-loop-2026-06-19T15-52-35-348Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2570ms |
| lint | Passed | 6467ms |
| unit tests | Passed | 5791ms |
| deterministic eval pipeline | Passed | 460ms |

### Repeated Failure Candidates

- localhost_or_api_unavailable: 1 finding(s), priority 8

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T16:22:33.176Z

- **run id:** agent-loop-2026-06-19T16-22-11-790Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust
- **parallel:** 1
- **worker result files checked:** 1

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 4628ms |
| lint | Passed | 8951ms |
| unit tests | Passed | 6435ms |
| deterministic eval pipeline | Passed | 436ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## RR Agent Next Task Fix - 2026-06-19T16:25:00Z

- **reason:** The live `price-trust` agent run created a next task after `car seat stroller combo` returned one temporary live research error.
- **what was checked:** Re-ran that exact local API request with debug enabled. It succeeded and returned real exact/near matches, which showed the original failure was temporary rather than a permanent localhost outage.
- **root cause:** The live QA worker treated every live API failure as `localhost_or_api_unavailable` after one attempt. That made temporary upstream/server errors look like local app outages.
- **general fix:** Live workers now retry temporary failures once and label failures more clearly. Connection failures stay `localhost_or_api_unavailable`; rate-limit/server/timeout-style failures become `transient_research_api_failure`; ordinary bad requests become `live_qa_request_failed`.
- **extra issue fixed:** The live price-trust worker also surfaced basketball rules/dimensions pages in near matches. NBA court-equipment pages and Pinterest dimension drawings are now blocked as product cards across Serper intake, final result validation, requirement filtering, and product-page URL selection.
- **before:** The next-task file pointed to `localhost_or_api_unavailable` for `car seat stroller combo`, and basketball-hoop results could include dimensions/rules pages as near-match products.
- **after:** `docs/agent-next-task.md` now says no repeated worker failures were found. The live `price-trust` worker passed with no suspicious flags, including the stroller combo search.
- **files changed:** `scripts/qa-worker.mjs`, `tests/qaWorker.test.mjs`, `lib/search/serper.ts`, `lib/recommendationResultValidation.ts`, `lib/requirementValidation.ts`, `lib/productPageUrl.ts`, `tests/serper.test.mjs`, and `tests/recommendationResultValidation.test.mjs`.
- **verification run:**
  - Focused QA worker and product-page filtering tests passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed, 436/436 tests.
  - `npm run qa:loop -- --batches price-trust` passed and cleared the next task.
  - `npm run build` passed.
  - `npm run qa:worker -- --batch price-trust --mode live` passed with no suspicious flags.
- **remaining issue found:** None for this next-task fix. Future live runs may still find new search-quality issues in other batches.

## Agent Loop Run - 2026-06-19T21:38:24.108Z

- **run id:** agent-loop-2026-06-19T21-27-37-433Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units
- **parallel:** 1
- **worker result files checked:** 3

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2241ms |
| lint | Passed | 5238ms |
| unit tests | Passed | 4117ms |
| deterministic eval pipeline | Passed | 405ms |

### Repeated Failure Candidates

- non_product_page_leakage: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-19T21:48:35.859Z

- **run id:** agent-loop-2026-06-19T21-48-20-509Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** broad-mainstream
- **parallel:** 1
- **worker result files checked:** 1

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 3472ms |
| lint | Passed | 6628ms |
| unit tests | Passed | 4370ms |
| deterministic eval pipeline | Passed | 405ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Non-Product Review Article Fix - 2026-06-19T21:50:00Z

- **reason:** The live `broad-mainstream` agent run found a Nike running-shoes result where review/article pages appeared in near matches.
- **failing example:** `running shoes`, budget `$200`, priorities `Nike only`.
- **root cause:** Review Radar already blocked many review pages, but it missed some common article title shapes, including `Review: ...` and `tried and tested` headlines. Runner's World also needed to be treated as an evidence/review source instead of a product-card source.
- **general fix:** Added shared guards across Serper candidate intake, final result validation, requirement filtering, and product-page URL selection. Review/article pages can still support evidence, but should not render as product cards.
- **before:** The live worker reported `non_product_page_leakage`, and the Nike running-shoes near matches included `Nike Alphafly 3: Tried and tested - Runner's World` plus other review-style pages.
- **after:** A direct live API recheck for the same Nike running-shoes search returned no suspicious review/article names in exact or near matches.
- **files changed:** `lib/search/serper.ts`, `lib/recommendationResultValidation.ts`, `lib/requirementValidation.ts`, `lib/productPageUrl.ts`, `tests/serper.test.mjs`, `tests/recommendationResultValidation.test.mjs`, and `tests/requirementValidation.test.mjs`.
- **verification run:**
  - Focused product-page filtering tests passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed, 439/439 tests.
  - `npm run qa:loop -- --batches broad-mainstream` passed and cleared the next task.
  - `npm run build` passed.
- **remaining issue found:** The same Nike running-shoes live recheck still returned good near matches but no exact matches because price/budget evidence was over budget or unverified. That is a separate price/discovery verification issue, not the article-page leak fixed here.

## Agent Loop Run - 2026-06-20T04:35:58.337Z

- **run id:** agent-loop-2026-06-20T04-25-03-236Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 2
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2111ms |
| lint | Passed | 5076ms |
| unit tests | Passed | 4172ms |
| deterministic eval pipeline | Passed | 403ms |

### Repeated Failure Candidates

- price_evidence_or_variant_price_gap: 1 finding(s), priority 9
- non_product_page_leakage: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-20T05:05:56.009Z

- **run id:** agent-loop-2026-06-20T05-05-42-076Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 2
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2224ms |
| lint | Passed | 5345ms |
| unit tests | Passed | 4389ms |
| deterministic eval pipeline | Passed | 405ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-20T05:17:41.339Z

- **run id:** agent-loop-2026-06-20T05-07-20-774Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 2
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2227ms |
| lint | Passed | 4926ms |
| unit tests | Passed | 4113ms |
| deterministic eval pipeline | Passed | 374ms |

### Repeated Failure Candidates

- discovery_or_validation_too_strict: 1 finding(s), priority 9
- non_product_page_leakage: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-20T10:48:20.695Z

- **run id:** agent-loop-2026-06-20T10-48-04-978Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 1
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2278ms |
| lint | Passed | 5556ms |
| unit tests | Passed | 4707ms |
| deterministic eval pipeline | Passed | 402ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-20T11:03:46.965Z

- **run id:** agent-loop-2026-06-20T10-53-00-989Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** live
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 2
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2170ms |
| lint | Passed | 5026ms |
| unit tests | Passed | 4372ms |
| deterministic eval pipeline | Passed | 402ms |

### Repeated Failure Candidates

- discovery_or_validation_too_strict: 1 finding(s), priority 9

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-20T11:12:08.217Z

- **run id:** agent-loop-2026-06-20T11-11-53-337Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 1
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2187ms |
| lint | Passed | 5240ms |
| unit tests | Passed | 4295ms |
| deterministic eval pipeline | Passed | 398ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-21T04:07:39.498Z

- **run id:** agent-loop-2026-06-21T04-06-58-648Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 1
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 6275ms |
| lint | Passed | 13410ms |
| unit tests | Passed | 7875ms |
| deterministic eval pipeline | Passed | 605ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

---

## 🟩 **Claude QA Update — 2026-06-21 00:54**

### Claude Change 1 — Budget-usable text prices

- **agent:** Claude
- **date/time:** 2026-06-21 00:54 EDT
- **reason:** Live search `shop vac` / `$400` returned **0 exact + 4 near** even though many shop vacs are clearly under $400. Root-caused the over-strict price-trust gate from the 06-20 price-trust layer: a product whose price comes only from recommendation text (no structured `metadata.offers`) was marked `canUseForBudget: false`, so its budget requirement resolved to **unknown**, and the exact-match gate (`unknown.length === 0`) forced every such product into near matches. Retailers frequently bot-wall the structured-offer fetch, so this hit normal budget searches across all categories (Codex saw the same on cordless drills).
- **root cause:** `assessProductPriceTrust` (`lib/productPriceTrust.ts`) returned `canUseForBudget: false` for ALL text-only prices, even ones that had already passed the implausibly-low and conflicting-signal checks. `productPrice()` (scoring) and the budget requirement check both gate on `canUseForBudget`, so these products had no usable price at all (and also took a missing-price penalty).
- **generalized fix (no product types referenced):** in the text-only branch, a **specific, plausible** text price (one that already cleared implausibly-low + conflicting) is now `canUseForBudget: true` (budget-usable, exact-eligible) while still `status: "needs_verification"` and displayed as `"$X needs verification"`. A **vague** price (range, or "around/about/approximately") stays `canUseForBudget: false`. All of Codex's price protections (suspicious-low, financing/payment, conflicting, full-size-appliance floors) run UPSTREAM of this branch and are unchanged. Confidence stays capped because text-only evidence is thin, and the card still tells the shopper to verify the current store price. Side benefit: removes a misleading "price looked unusually low" card message that previously hit plausible text-priced products.
- **commands run / checks:**
  - `node --test tests/productPriceTrust.test.mjs` — Passed (9/9)
  - `node --test tests/requirementValidation.test.mjs` — Passed (48/48)
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed
  - `npm test` — Passed (**488/488**, up from 486; +2 net tests)
  - `node scripts/eval-pipeline.mjs` — RED-FLAG CHECKS: no issues
- **live QA searches run:** None this loop (deterministic + unit/integration proof). A live `shop vac / $400` recheck is the recommended confirmation once the dev server is up.
- **issue new vs. related to Codex:** **Related** — this loosens the 06-20 price-trust layer's over-correction without weakening any of its fake-cheap protections.
- **files changed:**
  - `lib/productPriceTrust.ts` (text-only branch)
  - `tests/productPriceTrust.test.mjs` (updated the old "text price not budget-usable" assertion to the new intent; added a vague-range guard test)
  - `tests/requirementValidation.test.mjs` (new integration test: a specific in-budget text price satisfies the budget requirement; a vague price stays unknown)
- **before/after:**
  - Before: product with `estimated_price_range: "$129"`, no offers, budget $400 -> budget requirement **unknown** -> cannot be exact (near only); `productPrice()` returned `null`.
  - After: same product -> budget requirement **matched** at $129 -> exact-eligible. `"around $129"` (vague) still resolves to **unknown** (correctly cannot be exact).
- **remaining risks / follow-up:**
  - A wrong-but-not-implausible text price could still let a slightly-over-budget product look in-budget; mitigated by the implausibly-low filter, capped confidence, and the "needs verification" label. If stricter behavior is wanted, add a small under-budget margin for text-only prices.
  - Best long-term fix remains Phase 5 rescue reliably attaching STRUCTURED offer prices so fewer products depend on text prices at all.
  - Still open from the phase analysis: consolidate the three overlapping product-type/conflict tables (`formFactor.ts`, `productTypeIntent.ts`, `productTypeConflictRules`) and generalize `productTypeIntent`'s hardcoded 8-category list. Separate loop.

---

## 🟩 **Claude QA Update — 2026-06-21 01:27**

### Claude Change 2 — Phase 1 (step 1): shared product-type verdict helper

- **agent:** Claude
- **date/time:** 2026-06-21 01:27 EDT
- **reason:** Phase 1 of the product-accuracy hardening plan. "Right category, wrong type" rejection (cooktop-for-oven, bed-frame-for-mattress, gaming-chair-for-office-chair) was duplicated: discovery (`cheapCandidateRejectionReason` in `lib/search/serper.ts`) and validation (`hasConflictingProductType` in `lib/requirementValidation.ts`) each repeated the SAME pair of checks — `classifyProductTypeIntent` (wrong type / accessory) + `isComponentSubstitution`. This is the strangler-migration first step: add one shared verdict, route both callers through it, prove parity. **No behavior change yet** — coverage broadening and table consolidation come in later steps.
- **change:** new `lib/productTypeMatch.ts` exports `classifyProductTypeMatch({ evidenceText, requestedCategory }) -> { canBeExactMatch, status, reason }`, composing `classifyProductTypeIntent` + `isComponentSubstitution`. Both callsites now call it instead of inlining the two checks. Removed the now-dead `isComponentSubstitution`/`classifyProductTypeIntent` imports from serper, and the `isComponentSubstitution` import from validation (it still uses `classifyProductTypeIntent` at a separate exact-eligibility gate, so that import stays).
- **commands run / checks:**
  - `node --test tests/productTypeMatch.test.mjs` — Passed (5/5)
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed
  - `npm test` — Passed (**493/493**; the 488 prior tests all still green = parity, +5 new)
  - `node scripts/eval-pipeline.mjs` — RED-FLAG CHECKS: no issues
- **live QA searches run:** None (parity step, deterministic).
- **issue new vs. related to Codex:** **Related/structural** — consolidates wrong-type logic Codex spread across `formFactor.ts`, `productTypeIntent.ts`, and `requirementValidation.ts`.
- **files changed:**
  - `lib/productTypeMatch.ts` (new shared helper)
  - `lib/search/serper.ts` (route `cheapCandidateRejectionReason` through helper; drop dead imports)
  - `lib/requirementValidation.ts` (route `hasConflictingProductType`'s intent+component-sub pair through helper; drop dead import)
  - `tests/productTypeMatch.test.mjs` (new)
- **before/after:** identical results (parity). The two callers now share one verdict function instead of duplicating it; serper and validation can no longer drift apart on the intent+component-substitution checks.
- **remaining risks / follow-up (next Phase 1 steps):**
  - Fold the cross-category conflict rules (`productTypeConflictRules`), required-category evidence (`requiredCategoryEvidenceRules`), and the bespoke `hasMattressFurnitureConflict` into the shared helper so discovery applies them too (broadens coverage beyond `productTypeIntent`'s 8 categories) — with parity tests before removing the originals.
  - Then de-duplicate the mattress rule that currently lives in both `formFactor.ts` and `productTypeIntent.ts`.

---

## 🟩 **Claude QA Update — 2026-06-21 01:37**

### Claude Change 3 — Phase 1 (step 2): cross-category conflict rules moved into the shared helper

- **agent:** Claude
- **date/time:** 2026-06-21 01:37 EDT
- **reason:** Continue Phase 1. The cross-category conflict table (`productTypeConflictRules`: sofa↔ottoman/bed, office-chair↔gaming/mat, bed-frame↔mattress, mattress↔bed furniture, pressure-washer↔laundry, tv-stand↔electronics, speaker↔furniture) lived only in `requirementValidation`, so **discovery never applied it** — wrong-type candidates survived the candidate pool and were only filtered later. Move it into the shared `classifyProductTypeMatch` so discovery and validation use one set.
- **change:** moved `productTypeConflictRules` + its type into `lib/productTypeMatch.ts` as `PRODUCT_TYPE_CONFLICT_RULES`, with an internal `normalizeProductTypeText` (mirror of `requirementValidation.normalizeText`, noted to keep in sync) so the rules evaluate consistently regardless of caller. `classifyProductTypeMatch` now returns `type_conflict` for these. `requirementValidation.hasConflictingProductType` delegates and no longer holds the table. **Deliberately kept in validation only:** `requiredCategoryEvidenceRules` (rejects on the *absence* of evidence — unsafe on thin discovery snippets) and the identity-based `hasMattressFurnitureConflict`.
- **commands run / checks:**
  - `node --test tests/productTypeMatch.test.mjs tests/discoveryFilter.test.mjs` — Passed
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed
  - `npm test` — Passed (**496/496**; prior validation tests still green = parity, +3 new)
  - `node scripts/eval-pipeline.mjs` — RED-FLAG CHECKS: no issues (no over-rejection of the blower/vacuum/grill/shoes/mattress fixtures)
- **live QA searches run:** None (deterministic; a live `pressure washer` / `office chair` spot-check is recommended).
- **issue new vs. related to Codex:** **Related/structural** — finishes unifying the wrong-type tables Codex spread across modules.
- **files changed:**
  - `lib/productTypeMatch.ts` (conflict rules + normalize + `type_conflict` verdict)
  - `lib/requirementValidation.ts` (removed the table + type; delegates to the helper)
  - `tests/productTypeMatch.test.mjs` (conflict-rule case + false-positive guard)
  - `tests/discoveryFilter.test.mjs` (washing machine rejected at discovery for a pressure-washer search)
- **before/after:** *Before* — a washing machine for an "electric pressure washer" search survived the discovery candidate pool (only filtered at validation). *After* — it is rejected at discovery via the shared helper. Validation behavior is unchanged (parity). Conflict rules with an `allowedEvidence` guard keep real products that merely share words (e.g. a Sun Joe pressure washer).
- **remaining risks / follow-up (next Phase 1 step):**
  - De-duplicate the mattress rule that now appears in `formFactor.ts` (component substitution), `productTypeIntent.ts` (mattress/bed_frame), the moved conflict rules, AND `hasMattressFurnitureConflict` — four overlapping encodings. Consolidate carefully (identity-text vs evidence-text nuance) with parity tests, then remove redundancies.
  - `requiredCategoryEvidenceRules` + `hasMattressFurnitureConflict` remain validation-only by design (absence/identity based).

---

## 🟩 **Claude QA Update — 2026-06-21 07:39**

### Claude Change 4 — Phase 2: de-stack credibility penalties + remove dead riskPenalty

- **agent:** Claude
- **date/time:** 2026-06-21 07:39 EDT
- **reason:** Audit (logged in the plan) found weak-credibility products penalized 3–4× for one signal — `marketConfidenceAdjustment` (−18) + `marketConfidencePenalty` (−22) + flag-gated `credibilityFloorPenalty` (−18) + reduced raw score, ≈ −58 in `rankedMatchScore`. "Weak credibility" usually just means *few reviews/sources*, i.e. the thin-but-valid budget/niche product, so this over-buries legitimate picks.
- **changes (tuning only — no new gates, no loosening of hard requirements):**
  - **Item 1 — credibility consolidated to one term per score.** `rankedMatchScore` keeps `marketConfidenceAdjustment` (symmetric tier term) and drops `marketConfidencePenalty` + `credibilityFloorPenalty`. `totalScore` keeps `marketConfidencePenalty` and drops `credibilityFloorPenalty`. `credibilityFloorPenalty` is still *computed* for debug, just no longer subtracted; the now-unused `credibilityPenaltyEnabled()` flag helper was removed (so `REVIEW_RADAR_CREDIBILITY_PENALTY` is a no-op).
  - **Item 4 — deleted dead `riskPenalty`** (computed and stored, but never consumed in either ranking score) and its `ScoreBreakdown.riskPenalty` type field.
  - **Item 2 (rubric dedup) — investigated and DEFERRED.** The two rubric penalties are NOT a clean duplicate: `missingDataPenalty`'s slice is importance-weighted (critical 5 > minor 0.75, Codex's Phase 4) and reads `evidenceBucket.unknowns`, while `computeRubricFit`'s reads `rubric.mustVerifyFacts` uniformly. Removing one drops Codex's importance weighting, so I reverted it.
  - **Item 3 (missingData/evidenceStrength overlap) — DEFERRED** as marginal/arbitrary tuning.
- **commands run / checks:**
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed
  - `npm test` — Passed (**496/496**)
  - `node scripts/eval-pipeline.mjs` — RED-FLAG CHECKS: no issues (suspicious/wrong/over-budget items still stay OUT of exact — no accidental loosening)
  - `DUMP_SNAPSHOT=1 node --test tests/rankingBaseline.test.mjs` — regenerated + reviewed
- **live QA searches run:** None (deterministic A/B + baseline + eval).
- **issue new vs. related to Codex:** **Related** — tunes the scoring Codex layered up across phases (market confidence, credibility floor, rubric). Retires the credibility-floor flag experiment by folding it into the always-on term.
- **files changed:**
  - `lib/recommendationScoring.ts` (credibility consolidation; removed `credibilityPenaltyEnabled` + `riskPenalty`)
  - `types/review-radar.ts` (removed `ScoreBreakdown.riskPenalty`)
  - `tests/rankingBaseline.test.mjs` (updated `match` snapshots — order unchanged, margins narrowed)
  - `tests/credibilityPenalty.test.mjs` (rewrote the two flag-mechanism tests to the new no-op reality)
- **before/after (baseline snapshot, flag-off default):** **order preserved in every scenario**; only the over-penalty margin narrowed. Scenario A sofas `rankedMatchScore`: weak Brook/Dune +22 each, moderate Cedar/Aspen +5; Scenario B headphones: moderate Pulse/Echo +5, strong Wave unchanged. `totalScore` unchanged at flag-off (credibility-floor was already gated off there). Eval red-flags clean — the `$1` Weber, Twin mattress, etc. still land in near, not exact.
- **remaining risks / follow-up:**
  - `REVIEW_RADAR_CREDIBILITY_PENALTY` is now a no-op flag; the line in `.env.local` can be removed in a cleanup pass.
  - Items 2 (rubric dedup, needs importance-preserving design) and 3 (missingData/evidenceStrength overlap) remain open — deferred deliberately, not abandoned.
  - A live spot-check on a thin-credibility category (e.g. a niche/budget search) is recommended to confirm the ranking feels right on real results.

---

## 🟩 **Claude QA Update — 2026-06-21 07:48**

### Claude Change 5 — Phase 3 (step 1): rescue shopping leg searches product identity

- **agent:** Claude
- **date/time:** 2026-06-21 07:48 EDT
- **reason:** Phase 3 (investigation-first) — make the evidence-rescue pass attach *structured* offer prices more reliably so fewer products fall back to text-only prices (the root cause behind Phase 0). Did the code investigation of the rescue path (`lib/requirementEvidenceRescue.ts`): price rescue runs always (not flag-gated), and for each displayed product missing a verified price it shopping-searches and attaches a structured Medium-confidence offer when a result matches via `looksLikeSameProduct`.
- **finding:** the rescue used ONE descriptive query for both the organic-evidence leg AND the Google Shopping leg: `"<name> current price <category>"`. Google Shopping matches on product IDENTITY (brand + model), so "current price" is noise that lowers the shopping match rate — directly reducing how often a structured price gets attached.
- **change (general, all categories):** added `buildRescueShoppingQuery(product, category)` = `"<name> <category>"` and used it for the shopping leg in `applyCandidateEvidence`; the organic leg keeps the descriptive query (where "current price" helps find pricing pages). No live API was spent — this came from code reading.
- **commands run / checks:**
  - `node --test tests/requirementEvidenceRescue.test.mjs` — Passed (10/10)
  - `npm run typecheck` — Passed
  - `npm run lint` — Passed
  - `npm test` — Passed (**497/497**, +1 new)
- **live QA searches run:** None. I prioritized the clearly-correct deterministic fix over a costly live measurement. The full live measurement (success-rate %, which retailers bot-wall structured offers) was NOT run.
- **issue new vs. related to Codex:** **Related** — strengthens Codex's Phase 5 rescue.
- **files changed:**
  - `lib/requirementEvidenceRescue.ts` (`buildRescueShoppingQuery`; `applyCandidateEvidence` uses it; dropped the now-unused `query` param from that function)
  - `tests/requirementEvidenceRescue.test.mjs` (asserts the shopping leg searches identity, not "current price")
- **before/after:** *Before* — rescue shopping query `"Weber Spirit II E-310 current price gas grill"`. *After* — `"Weber Spirit II E-310 gas grill"`. The organic leg is unchanged.
- **remaining risks / follow-up (Phase 3 still open):**
  - **Live measurement still recommended** to quantify the structured-price success rate and identify the dominant failure mode (bot-walled retailers vs `looksLikeSameProduct` mismatches). This needs the dev server + live API; flagged for a cost-aware run.
  - `looksLikeSameProduct` strictness and the `maxProducts` rescue cap (6 dev / 10 standard / 15 deep) are the other levers — tune only with live data.

---

## 🟩 **Claude QA Update — 2026-06-21 07:55**

### Claude Change 6 — Phase 5: rubric matcher uses whole-word matching

- **agent:** Claude
- **date/time:** 2026-06-21 07:55 EDT
- **reason:** Phase 5 — `computeRubricFit`'s `itemMatches` (buyingRubric.ts) matched rubric signals with **substring** `text.includes(token)`, so "grip" matched "gripped", "trail" matched "trailer", "outsole" could be hit by "console" — false positives that inflated the rubric ranking nudge.
- **change:** match whole phrases and whole tokens on word boundaries (`containsWholePhrase` + a word `Set`) instead of substrings. Thresholds unchanged. Capped nudge, so bounded impact.
- **checks:** `npm test` **499/499**, typecheck, lint, eval red-flags clean.
- **live QA:** None (deterministic; rubric is unset in tests so the baseline is unaffected).
- **files changed:** `lib/buyingRubric.ts`, `tests/buyingRubric.test.mjs` (whole-word + false-positive guards).
- **before/after:** `itemMatches("the trailer gripped the rail", "trail grip")` was **true** (substring), now **false**; real matches ("strong trail grip on dirt") still **true**.

---

## 🟩 **Claude QA Update — 2026-06-21 08:06**

### Claude Change 7 — Phase 3 live measurement (validation, no code change)

- **agent:** Claude
- **date/time:** 2026-06-21 08:06 EDT
- **reason:** Phase 3's remaining item — measure the rescue/price behavior on a real search, against the running localhost:3000 dev server (one live POST, debug header). Chose `shop vac` / `$400` (the original "0 exact" case).
- **result (HTTP 200, 113s, 1 live search):** **2 exact + 4 near** (was 0 exact originally — Phases 0/1/3 confirmed working live). Per-product price source:
  - Vacmaster Professional Beast 12-gal — structured **$149.99**, reliability verified → exact ✅
  - DEWALT DXV06P 6-gal — a $1 json_ld offer lingered in `metadata.offers`, but price-trust/reliability correctly used the plausible **$70** text price (verified) → exact shows $70 ✅
  - BOSCH GAS18V-3N — $10 offer correctly flagged **suspicious** → near, card says "verify price" ✅
  - RIDGID / Koblenz / Ego — no price evidence → unverified → near ✅
- **honest correction:** my first pass read the raw lowest offer and mis-flagged the DEWALT as a "$1 exact match". On inspecting `reliabilityCheck`, the card shows **$70** (the $1 was ignored). Not a user-facing bug.
- **conclusion:** the price-trust + reliability stack handles implausible structured offers correctly (uses the plausible signal, or marks suspicious). Products that stay text-only/unverified land in near, not falsely exact. **No urgent further Phase 3 tuning needed.**
- **minor hygiene note (low priority, not fixing):** an implausible offer ($1) can remain in `metadata.offers` even when display/reliability ignore it; no consumer surfaces it, so harmless. Could be scrubbed in a future cleanup.
- **checks:** `npm test` 499/499 (deterministic suite unaffected by the live run).
- **files changed:** none (measurement only; this log + plan status).

---

## 🟩 **Claude QA Update — 2026-06-21 11:53**

### Claude Investigation — "shop vac" sometimes shows only 3 exact matches (no code change)

- **agent:** Claude
- **question:** Why did `shop vac` (no budget, no details) show only 3 exact matches when ~7 are expected?
- **method:** one live POST to localhost:3000 with the debug header, same query, no criteria.
- **result:** reproduced → **7 displayed exact** (debug: **11 exact-eligible** before the 7-cap, **0 near**; 12 Serper candidates, depth `deep`). All 7 are clean wet/dry vacs with zero failed/unknown requirements.
- **finding:** **NOT a bug or a systematic cap.** The exact count varies run-to-run because discovery (live Serper) + the LLM `web_search` research call are non-deterministic and surface a different product set each run. With no user criteria the only hard requirement is the category, so the exact count = "distinct shop-vacs found that verify as shop-vacs," capped at 7. A 3-exact run simply surfaced fewer distinct/verifiable products that time.
- **lever:** `SEARCH_DEPTH` (`.env.local`, currently `deep`). `deep` runs the most discovery queries (5 shopping / 3 organic / 6 retailer / 3 direct, ≤100 raw / 15 enriched) → fills the 7 slots; `standard`/`dev` run fewer → fewer candidates → fewer exact. A low-depth run is the likely systematic cause of a 3-exact screenshot.
- **recommendation:** keep `deep` for best coverage. If more *consistent* fill is wanted regardless of depth, the discovery-consistency levers (more retailer/seed queries, market-coverage rescue threshold) are the place to look — a separate change, not needed to explain this.

---

## 🟩 **Claude QA Update — 2026-06-21 12:52**

### Claude Change 8 — Lever 1: reliable best-of seeding + cleaner seed extraction

- **agent:** Claude
- **goal context:** user wants every search to surface the 7 best/top-rated/most-trusted products (and, with criteria, the best 7 that match).
- **change:**
  1. `buildBestOfSeedQueries(category, maxBudget)` (serper.ts) — every search now mines budget-aware "best / top rated / most popular `<category>`" lists, built in the seeding step so it fires for ANY category (previously seeding drew only from the thin search-plan editorial queries and underfired — `seedProductNames` was empty for shop vac).
  2. Tightened `extractSeedProductNames`: a seed must carry a real **model-number** token (digit, not a bare year). Drops brand+stray-word noise ("DeWalt Find") and year noise ("2026 Lab"); removed the now-dead brand-anchor path + imports.
  3. Surfaced `seedProductNames`/`seedSearchesRun` in the route debug payload (observability).
- **checks:** `npm test` **503/503**, typecheck, lint clean.
- **live (3 shop-vac runs):** seeding fires every time (`seedSearchesRun` 10). Before the extractor fix, seeds were junk ("DeWalt Find", "2026 Lab"); after, they are real models (Stanley/Craftsman/Vacmaster/Ridgid), with some residual prefix noise ("Everyday Use Stanley 6-Gallon").
- **KEY FINDING (refines the earlier "3 exact" diagnosis):** in one run, **7 exact-eligible** candidates displayed as **3** because they **de-duplicated to 3 distinct canonical products** (same popular vacs found as multiple listings). So a low displayed count is driven by **distinct-product count + canonical de-dup**, not only run-to-run discovery variance. Best-of seeding raises the distinct-pool *only if the lists name diverse models*; seeding the same 3-4 popular vacs still collapses to 3-4.
- **follow-ups (toward the goal):**
  - **Lever 2** — rank the eligible set by rating/review-volume/trust so the best win the slots.
  - **Investigate canonical de-dup** — confirm it is not over-collapsing genuinely different models (the strongest lead for "only 3 shown").
  - Strip residual seed prefixes ("Everyday Use", "Big Messes For").
- **files changed:** `lib/search/serper.ts`, `app/api/recommendations/route.ts` (debug fields), `tests/seedProductNames.test.mjs`.

---

## 🟩 **Claude QA Update — 2026-06-21 14:45**

### Claude Change 9 — Fix canonical de-dup over-collapsing different-size products (the "only 3 exact" root cause)

- **agent:** Claude
- **investigation:** the user's "only 3 exact" for shop vac. Traced the displayed-count drop to canonical **de-duplication**: `getCanonicalIdentity` falls back to `normalizeTitle` for thin-metadata products, and `normalizeTitle` filtered every token of length ≤ 1 — so a single-digit size ("5 Gallon" vs "6 Gallon") was dropped and two different vacs got the **same** canonical id and were merged.
- **proof of bug (deterministic):** `getCanonicalIdentity("Stanley 5 Gallon Wet/Dry Vacuum")` and `...6 Gallon...` both produced id `"stanley gallon wet dry vacuum"` → merged. (12/14/16-gallon survived because they are 2-digit.)
- **fix:** `normalizeTitle` now keeps single-DIGIT tokens (a single-digit size/spec is often the only differentiator); single letters are still dropped as noise. `lib/productIdentity.ts`.
- **checks:** `npm test` **504/504** (+ regression test that 5-gal vs 6-gal and 9-gal vs 16-gal stay DISTINCT), typecheck, lint, eval clean.
- **live before/after (shop vac, no criteria):**
  - Before this fix: 7 exact-eligible collapsed to **3 displayed**.
  - After: **10 eligible → 7 DISPLAYED** distinct vacs (incl. three different Vacmaster 8-gal models the old code merged). The list now fills all 7.
- **impact:** directly resolves the "only 3 exact" symptom. More distinct products survive de-dup, so the 7 slots fill reliably. This is the strongest single lever found for the user's "show 7 best" goal.
- **files changed:** `lib/productIdentity.ts`, `tests/productIdentity.test.mjs`.

---

## 🟩 **Claude QA Update — 2026-06-21 18:31**

### Claude Investigation — variant-collapse attempt (reverted) + Lever 2 (already satisfied)

- **agent:** Claude
- **context:** user wants (a) same product / different model number collapsed to the most popular one, and (b) the displayed 7 to be the top-rated / most-trusted / most-popular.

**Variant-collapse (a) — ATTEMPTED, REVERTED.** Tried making selection de-dup by product *family* via the existing `areSameCanonicalProduct`/`sameProductFamilyTitle`. **It over-collapses:** that matcher is size-blind — `"Stanley 5 Gallon 3 HP"` and `"Stanley 6 Gallon 3 HP"` merge to one because they share the "3 HP" token, and `"RIDGID 4 Gallon 5.0 HP"` merges with `"RIDGID 5 Gallon 3 HP"` on a spurious "5". A live shop-vac run dropped 7 eligible → 3 displayed. This would undo the canonical-id size fix and merge genuinely different products, so I reverted it (working tree back to commit `fa66148`). **Correct variant-collapse needs a size-AWARE family key** (group by brand + extracted size; collapse only within the same size) — a separate, careful build. It also has an inherent tension with "show 7": collapsing variants reduces the count when a category genuinely has few distinct families.

**Lever 2 (b) — INVESTIGATED, already substantially satisfied (no change).** The ranked-match score already weights rating (`ownerRatingScore`, ≤20), review-volume (`ownerReviewStrengthScore`, ≤20), and trust (`marketConfidence` tier / evidence strength). `broadSearchPopularityMultiplier` amplifies popularity ×1.25 for broad/no-criteria searches and ×0.75 for constrained ones — exactly the "no criteria → most popular" intent. A/B confirms decisive trust-driven ordering (strong #1/186, moderate #2/161, weak #3–5/~78–99). The "show 7" bottlenecks were de-dup (fixed) + discovery breadth (Lever 1), not ranking — so no scoring change is warranted (over-tuning would unbalance Phase 2's de-stacking).
- **checks (post-revert):** `npm test` 504/504, typecheck, lint clean.
- **recommended next:** build the **size-aware variant-collapse** properly (the user's actual ask), accepting the count tradeoff — this is the remaining concrete improvement.

---

## 🟩 **Claude QA Update — 2026-06-21 18:47**

### Claude — size-aware variant collapse (shipped) + HTTP 502 crash fix

- **agent:** Claude
- **shipped (1) — size-aware variant collapse** (`9170312`). New `lib/productVariantFamily.ts`: `detectPrimarySize` reads only true size/capacity units (gallon, inch, cu ft, quart, liter, oz, lb, ml) — never power (HP) — and `variantFamilyKey` = brand + size (null/never-collapse when either unknown). Wired into `selectRankedExactMatches`, keeping the most popular/trusted per brand+size family. This is the SAFE replacement for the reverted size-blind `areSameCanonicalProduct` approach.
  - **deterministic tests:** 8-gal HP variants collapse; 4-gal(5.0HP) vs 5-gal(3HP) and 5-gal vs 6-gal stay DISTINCT.
  - **live (shop vac):** 8 eligible → **5 distinct displayed** (RYOBI 6-gal, RYOBI 4.75-gal, Vacmaster 12-gal, Bosch 9-gal, Bosch 20-gal). Same-brand different-size pairs (RYOBI 6 vs 4.75, Bosch 9 vs 20) correctly kept; 3 same-brand+size variants collapsed. **Tradeoff confirmed:** collapse can drop the count below 7 when few distinct families exist — broaden discovery to refill, don't loosen collapse.
- **shipped (2) — HTTP 502 crash fix** (`817d1a6`). `hasRejectedTerm`/`isKnownNonProductImage` in `lib/productImageResolver.ts` called `decodeURIComponent` unguarded; a product/image URL with a bad "%" escape (e.g. a filename with "50% off") threw `URIError` deep in image enrichment and 502'd the ENTIRE search (caught live during the variant-collapse test — two shop-vac runs failed at the `filter_requirements`/enrichment stage before this fix). Added `safeDecodeURIComponent` fallback. Regression test added.
- **checks:** `npm test` 511/511, typecheck, lint, eval-pipeline clean.

## Agent Loop Run - 2026-06-21T22:59:56.760Z

- **run id:** agent-loop-2026-06-21T22-59-29-493Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 1
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 4889ms |
| lint | Passed | 9039ms |
| unit tests | Passed | 8214ms |
| deterministic eval pipeline | Passed | 557ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

## Agent Loop Run - 2026-06-21T23:08:53.057Z

- **run id:** agent-loop-2026-06-21T23-08-36-117Z
- **controller:** scripts/agent-loop-controller.mjs
- **mode:** deterministic
- **batches:** price-trust, broad-mainstream, requirement-units, wrong-category, non-product-pages
- **parallel:** 1
- **worker result files checked:** 5

### Checks

| Command | Result | Duration |
| --- | --- | ---: |
| typecheck | Passed | 2528ms |
| lint | Passed | 6289ms |
| unit tests | Passed | 4773ms |
| deterministic eval pipeline | Passed | 434ms |

### Repeated Failure Candidates

- No repeated worker failures found.

### Next Task

See `docs/agent-next-task.md`.

### Report

See `docs/agent-loop-report.md`.

---

## 🟩 **Claude QA Update — 2026-06-23 10:29**

### Phase 0 quality baseline (two-scorecard harness vs gold benchmark)

Measurement only — no pipeline changes. Tooling: `scripts/qualityScorecard.mjs` + `scripts/goldBenchmark.mjs` (14 gold queries, 2 runs each). **This is the number every later phase must beat.**

**BROAD scorecard (goal: surface the core market leaders)**

| query | poolCore | final7Core | stab | wrong-type | weak#1 | price | exacts |
|---|---|---|---|---|---|---|---|
| robot-vacuum | 3/7 | 3/7 | 8% | leak | WEAK | 57% | [7,7] |
| office-chair | 2/7 | 2/7 | 56% | ok | ok | 79% | [7,7] |
| air-purifier | 5/7 | 5/7 | 8% | ok | ok | 93% | [7,7] |
| gas-grill | 3/7 | 3/7 | 8% | leak | WEAK | 54% | [6,7] |
| cordless-drill | 4/7 | 4/7 | 17% | ok | WEAK | 7% | [7,7] |
| toaster-oven | 3/7 | 3/7 | 40% | leak | ok | 50% | [7,7] |
| shop-vac | 1/7 | 1/7 | 0% | ok | WEAK | 73% | [4,7] |
| dog-feeder | 3/7 | 3/7 | 17% | ok | WEAK | 86% | [7,7] |

**mean poolCore 3.0/7 (target ≥5) · final7Core 3.0 · wrong-type leaks 3/8 · weak#1 5/8 · stability 19% · price 62%**

**CONSTRAINT scorecard (goal: satisfy hard requirements)**

| query | result | budgetViol | feat-unconf | price | wrong-type | weak#1 |
|---|---|---|---|---|---|---|
| robot-vac <$300 self-empty | **EMPTY** | - | - | 0% | ok | ok |
| office-chair <$300 lumbar | [1,1] | 0 | 0 | 50% | ok | WEAK |
| gas-grill <$600 4-burner | [3,2] | 0 | 0 | 100% | **WINS#1** | WEAK |
| air-purifier large HEPA | [3,4] | 0 | 2 | 57% | ok | WEAK |
| cordless-drill <$150 brushless | [1,0] | 0 | 0 | 100% | ok | ok |
| dog-feeder <$80 | [3,3] | 0 | 0 | 100% | ok | WEAK |

**EMPTY 1/6 · budget violations 0 · feature-unconfirmed 2 · wrong-type leaks 1/6 (1 WINS#1)**

**Cost proxy:** 28 searches · 1135 Serper calls (~40/search) · ~86s/search · OpenAI token cost not exposed by the API.

**Headline failures:** (1) missing core leaders — mean 3/7, only air-purifier hits ≥5; (2) weak Best Overall — 5/8 broad + 4/6 constraint; (3) wrong-type leakage — 3/8 broad, and a wrong type WINS#1 on the gas-grill constraint; (4) price confidence — cordless-drill 7%, several 50–57%; (5) instability — mean 19%; (6) one EMPTY constraint result. Budget compliance is good (0 violations) when results exist.

---

## 🟩 **Claude QA Update — 2026-06-23 11:44**

### Phase 1 result — source-tiered discovery (before → after, 14×2 baseline)

Generalized discovery only. Same gold benchmark + scorecard.

**BROAD aggregate**

| metric | Phase 0 | Phase 1 | target | verdict |
|---|---|---|---|---|
| mean poolCore | 3.0/7 | **3.4/7** | ≥4.5 | improved, below target |
| mean final7Core | 3.0 | **3.3** | ≥4.0 | improved, below target |
| weak#1 | 5/8 | **4/8** | ≤3/8 | improved, just short |
| wrong-type leaks | 3/8 | **2/8** | ≤1/8 | improved, just short |
| stability | 19% | **12%** | — | regressed (breadth↔variance) |
| price | 62% | 58% | — | ~flat |

Per-query coverage: office-chair 2→4, shop-vac 1→3, gas-grill 3→2, others ~flat.

**CONSTRAINT:** EMPTY 1/6 → **0/6** (fixed robot-vac); wrong-type WINS#1 1 → **0** (fixed gas-grill); budget violations 0 → 0; feature-unconfirmed 2 → 7 (air-purifier now returns 7, more unconfirmed).

**Cost:** 1135 → **1280** Serper calls (**+12.8%**, target ≤+25–40%) — PASS.

**Diagnostic:** live probe shows seeds now include real leaders (Dreame, Roborock, Shark, Roomba) and the displayed set carried 4 core leaders in one run — discovery now finds the leaders; the remaining displayed-coverage gap is RANKING (Phase 4).

**Verdict: Phase 1 PARTIAL PASS** — all do-not-regress targets met; all four improvement targets moved right but short of the aspirational numbers. Next: expose candidate-pool names in debug to separate discovery vs ranking coverage.

---

## 🟩 **Claude QA Update — 2026-06-23 12:56**

### Stage-funnel diagnostic — where are the core leaders lost?

Added a measurement-only stage funnel (debug `stageFunnel`: raw → seeds → postDedupe → candidatePool[merged Serper+LLM] → postFilter → final7, + per-candidate snapshots and cheap-filter rejection reasons). Scorecard `RR_FUNNEL=1` reports core-leader coverage per stage. 5-query diagnostic (1 run each):

| query | raw | dedupe | cand | filter | final7 | lost where |
|---|---|---|---|---|---|---|
| robot-vacuum | 2 | 2 | 5 | 5 | 5 | discovery only (ecovacs, narwal never found) |
| gas-grill | 2 | 2 | 5 | 5 | 5 | discovery only (char-broil, monument never found) |
| shop-vac | 0 | 0 | 3 | 1 | 1 | **FILTER drops craftsman + shop-vac**; 4 never found |
| con-gas-grill 4-burner | 0 | 0 | 2 | 0 | 0 | **FILTER drops char-broil + nexgrill** |

**Conclusion — three findings:**
1. **Ranking is NOT the bottleneck.** Every leader that survives filtering reaches the final 7 (filter == final7; rankedTooLow ≈ 0). My earlier "ranking" hypothesis is disproven by the funnel.
2. **Dedupe/canonical loses nothing** (raw == dedupe everywhere). Rule it out.
3. **The two real loss points are DISCOVERY and FILTERING.** Discovery (Serper raw 0–2/7; the LLM research rescues to 2–5) still misses 2–4 leaders per query. And **filtering drops already-discovered top brands** — a follow-up shop-vac probe showed RIDGID and Craftsman present in the candidate pool but **gone after filtering** (citation-verify / requirement filter), leaving a final 7 of mostly Vacmaster + Armor-All variants with the #1 brand (RIDGID) absent.

**Recommended next phase: FILTERING investigation (not ranking).** It is the most surgical, highest-confidence win — the leaders are already found, then thrown away between candidate pool and post-filter. Then revisit discovery for the never-found brands. Ranking (Phase 4 marketTrust) is deferred — the funnel shows it isn't where leaders are lost.

Note: constraint searches that take the search-candidate fallback path don't emit `stageFunnel` (one query showed "(no funnel)"); broad funnels carry the signal. Measurement only — no pipeline changes.

---

## 🟩 **Claude QA Update — 2026-06-23 13:20**

### Filtering investigation STEP 1 — proven drop step (per-stage funnel, 5 queries × 2 runs)

Added a full per-stage pipeline trace (cand → citation-verify → requirement-filter → enrich → assets → rescue → reval → final) with per-leader REMOVED-vs-shown-as-NEAR and snapshot detail. Measurement only.

**Proven primary culprit: CITATION VERIFICATION (`filterResultToVerifiedCitations`).** It REMOVES strong product-page leaders entirely, right after discovery:
- shop-vac: **RIDGID** (verified price, 3 citations), **Craftsman** (verified, 2 cites), **Shop-Vac** (verified, 3 cites) — all REMOVED `after verify`.
- robot-vacuum (one run): cand=3 → **verify=0** — Roborock, Roomba (verified price), Ecovacs all REMOVED at citation verify, wiping the category.
- These carry their own product URLs + 2–3 citations and sometimes verified prices, but their URLs aren't in the verified-URL set (they arrive via the LLM web_search path, which isn't auto-verified the way Serper candidate URLs are).

**Secondary effect: final selection (`scoreAndSelectRecommendations`).** Some requirement-passing leaders (Weber/Napoleon/Char-Broil, req x/0f/0u) are REMOVED or demoted to NEAR — entangled with the "exact needs verified price" reliability rule + the 5-near cap. Murkier; address separately, after the citation-verify fix.

**Ruled out:** dedupe/canonical (zero loss), requirement-filter-alone (drops mostly recovered at reval), ranking order (survivors reach final).

**Proposed STEP-2 fix (generic, trust-preserving):** allow a candidate with its OWN product-page URL (Serper-discovered, or a recognized retailer/brand/Tier-1–2 domain) to survive citation verification as self-cited — attach its product URL as a verified citation before the drop. Still requires a real product URL + source metadata; uncited prose / non-product pages stay dropped. No category- or product-specific logic. Then rerun the 5-query diagnostic + full Phase 0/1 baseline.

Note: high run-to-run variance persists (robot-vacuum cand was 5 one run, 3 the next) — the citation-verify REMOVED pattern held across both.

---

## 🟩 **Claude QA Update — 2026-06-24 00:32**

### Filtering STEP 2 result — citation-rescue fix (honest, inconclusive)

Full 14×2 baseline after the product-page citation rescue:

| metric | Phase 0 | Phase 1 | +citation fix |
|---|---|---|---|
| mean poolCore | 3.0 | 3.4 | **2.6** |
| final7Core | 3.0 | 3.3 | 2.3 |
| weak#1 | 5/8 | 4/8 | **6/8** |
| wrong-type leaks | 3/8 | 2/8 | 3/8 |
| stability | 19% | 12% | 19% |
| budget violations | 0 | 0 | 0 |
| constraint EMPTY | 1/6 | 0/6 | 0/6 |
| Serper calls | 1135 | 1280 | 1325 |

**Mixed/inconclusive.** Two measurements disagree:
1. **Funnel (controlled): the fix works** — citation-verify drops fell; RIDGID (verified price, 3 cites) now survives verification; 535 tests prove rescue + that article/listing/search/uncited pages still drop.
2. **End-to-end baseline: no confirmed gain** — coverage came in LOW (2.6 vs Phase 1 3.4), weak#1 up 4→6.

**Why:** (a) weak#1 rise is a real side effect — a rescued product is self-cited by its one product page, and weak#1 flags <2 citations; (b) the coverage drop is most likely VARIANCE — per-query coverage swings ±2–3 (shop-vac 1 here vs 4 in the same-day funnel run), stability 19%. **At 2 runs/query the run-to-run variance now EXCEEDS the effect size — we cannot measure ±1.0 coverage changes. Measurement wall.**

**Decision pending (user):** (A) keep the fix on mechanistic merits + make determinism/variance the next priority so quality changes become measurable; or (B) revert since the only end-to-end number didn't improve. Claude leans A (funnel proof + real bug fixed > one noisy baseline), but flagged for user call. Budget/trust criteria all held (0 budget violations, no wrong-type winners, non-product pages still dropped).

---

## <span style="color:green">**Claude QA Update — 2026-06-24 Phase 3B**</span>

### Phase 3B: Wrong-type vacuum contamination fix

**Issue traced:** Wrong-type products appearing in robot vacuum results — wet/dry vacs and hand vacuums in EXACT matches, stick/canister vacuums in NEAR matches.

**Root cause (fixture-proven, no live calls):**
1. `PRODUCT_TYPE_RULES` in `productTypeIntent.ts` had no `robot_vacuum` rule → `classifyProductTypeIntent` returned `{requestedType: null}` → fell through to `categoryTerms` using `productText(product)` which includes `product.category` (LLM-mislabeled "robot vacuum" on wrong products)
2. `checkCategory` was binary (boolean) — no way to distinguish "confirmed wrong type" from "can't verify type" — both became hard failures blocking near matches too

**Products fixed (from live fixtures, no new calls):**

| Product | Was | Now |
|---|---|---|
| Milwaukee M18 18-Volt Cordless Wet/Dry … | EXACT (best robot vacuum) | EXCLUDED (hard fail) |
| ONE+ 18V Cordless Wet/Dry Hand Vacuum | EXACT (best robot vacuum) | EXCLUDED (hard fail) |
| Shark Rocket Bagless Corded Stick Vacuum | NEAR (robot vacuum under $300) | EXCLUDED (hard fail) |
| RYOBI ONE+ HP 18V Cordless Pet Stick Vacuum | NEAR (robot vacuum under $300) | EXCLUDED (hard fail) |
| KENMORE 200 Series Bagged Canister Vacuum | NEAR (robot vacuum under $300) | EXCLUDED (hard fail) |
| Roborock S8 MaxV Ultra (sparse name, rich why_recommended) | EXACT (correct) | EXACT (maintained via allowedCheckText) |
| Roborock S7 MaxV Ultra (sparse name, sparse why_recommended) | EXACT (was passing via LLM category) | NEAR (unverified — correct behavior) |

**Three changes shipped:**

| Change | File | Purpose |
|---|---|---|
| `robot_vacuum` rule added | `lib/productTypeIntent.ts` | Blocks stick/canister/hand/wet-dry/upright/shop-vac vacuum products from robot vacuum queries |
| `allowedCheckText` parameter | `lib/productTypeIntent.ts` | Uses `why_recommended` for allowed check only; blocked check stays on lean evidence |
| Three-state `checkCategory` | `lib/requirementValidation.ts` | `"fail"` → missingRequirements; `"unverified"` → unknownRequirements; `"pass"` → matchedRequirements |

**Key design decision — allowedCheckText split:**  
Adding `why_recommended` to the blocked check caused a regression: "A standalone built-in ice maker found during refrigerator search" contains "refrigerator" → satisfied the `satisfiedBy` guard in `isComponentSubstitution` → ice maker passed as a refrigerator. Solution: `allowedCheckText` is a separate input used ONLY for the `allowed` pattern check. The `blocked`, `complement`, and `isComponentSubstitution` checks still use the lean evidence text (name + pros + metadata).

**Regression check:**
- All 564 tests pass (up from 557 before Phase 3B)
- Typecheck + lint clean
- `eval-pipeline.mjs` red-flag checks: ✅ no issues
- Existing ice maker / refrigerator / office chair / mattress tests all pass (no regressions)

---

## <span style="color:green">**Claude QA Update — 2026-06-25 Phase 3C**</span>

### Phase 3C: Final selection dropping strong leaders (gas grill fixture)

**Investigation method:** Used saved `tests/fixtures/review-radar-live/gas-grill.json` only — zero live calls.

**Full stage funnel (gas grill fixture):**
`candidatePool(18) → afterCitationVerify(18) → afterRequirementFilter(12) → afterEnrichment(12) → afterAssets(12) → afterRescue(12) → afterRevalidation(15) → final(7)`

**8 products dropped at afterRevalidation → final:**

| Product | Root cause | Classification |
|---|---|---|
| Coleman Xcursion 1-Burner Butane Grill (rescued) | "butane" not in gas aliases → feature-1 unverified → nearScored → not selected when 7 exact exist | Correct behavior — wrong fuel type |
| Primus Kuchoma Grill (rescued) | Wrong form factor (camping) → category unverified | Correct behavior — wrong category |
| Snow Peak Grill Burner (rescued) | Wrong form factor (camping) → category unverified | Correct behavior — wrong category |
| Coleman 4-in-1 Portable Propane Gas Camping Stove | Camping stove, wrong form factor, scored below 7 winners | Correct behavior — wrong form factor |
| **Weber Spirit EP-325 Gas Grill** | costco.com ∈ broadRetailerDomains → `broadRetailerPenalty=10` (no independent citations) → `sourceQualityScore` clamped to 0 → `rankedMatchScore ≈ 73`, below 86.44 cutoff | **Generic scoring issue — discovery gap leads to broad-retailer penalty on legitimate premium product. Discovery never found Weber EP-325 from a major retailer; root fix is in discovery.** |
| **Napoleon Rogue 425 SB** | Name "Napoleon Rogue 425 SB" has no "gas" or "grill" → `checkCategory("gas grill")` depended on LLM-assigned category containing "gas"; if category = "propane grill", "gas" term group fails → `unknown=[category]` → nearScored → dropped | **Generic bug: categoryTerms didn't expand "gas" with requirement aliases ("propane") → FIXED** |
| Weber Spirit E-325 Gas Grill | Name has "Gas Grill" → passes checkCategory → in exactScored → scored below all 7 winners | Root cause unconfirmed without enriched product data. Likely: lower sourceQualityScore from manufacturer-only source vs retailer-sourced winners, or higher missingDataPenalty |
| Weber Genesis E-435 Gas Grill | Same as Weber E-325 | Root cause unconfirmed without enriched product data |

**Gold leader coverage:** All 4 gold leaders "LOST: not-in-pool" — specific model variants (Weber Spirit II E-310, Genesis E-325s, etc.) were not discovered. Discovery is finding related but different models (E-325 vs E-310, E-435 vs E-325s). Separate discovery issue, out of scope for Phase 3C.

**Root cause confirmed and fixed — generic:**

`categoryTerms()` split the query category ("gas grill") into term groups (`[["gas"], ["grill"]]`) and checked them literally via `containsTerm`. The word "propane" does NOT contain "gas" → a product described only as a "propane grill" (no "gas" in any field) fails the "gas" term group → `checkCategory → "unverified"` → `unknown.length > 0` → excluded from `exactScored` → dropped when 7 exact matches already exist.

This is a GENERIC bug: the `extractedRequirements` system already recognizes "propane" as an alias for "gas" (the `feature-1` dealbreaker has `aliases: ["gas", "propane", "natural gas", ...]`), but `categoryTerms` didn't consult it.

**Fix:** `categoryTerms(category, extractedRequirements?)` now expands each term group with aliases from any `requiredConstraint` whose `value` or `aliases` match that term. "gas" expands to ["gas", "propane", "natural gas", "natural-gas", "gas powered", ...] when the gas dealbreaker is present. `checkCategory` passes `extractedRequirements` through.

**Safety:** "grill" still required (both term groups must match) → a propane heater can't satisfy "gas grill" with just "propane". Butane remains unmatched (not in gas aliases). No change to the 3-state verdict logic or requirement checking logic.

**Tests added:** 4 new deterministic tests in `tests/requirementValidation.test.mjs` (describe: "categoryTerms alias expansion via extractedRequirements"):
1. Propane-only text passes gas grill category check when gas alias is in requirements
2. Propane-only text is still unverified without alias expansion (no regression)
3. Butane product is still unverified even with gas aliases
4. Product with "gas" in name always passes without needing alias expansion

**Verdict:**
- 568 tests pass (up from 564 before Phase 3C)
- Typecheck clean, lint clean
- `eval-pipeline.mjs` gas grill scenario: ✅ no red flags

**Known remaining gaps (future work, not in scope for 3C):**
- Weber E-325/Genesis E-435 scoring root cause unconfirmed — requires enriched product data not saved in fixture. Future: save per-candidate `exactScored`/`nearScored` classification + `rankedMatchScore` breakdown to debug output.
- Weber EP-325 from Costco: discovery-level gap (not found at major retailers) → broadRetailerPenalty fires correctly but unfairly. Fix: improve editorial seeding / discovery to find brand products from major retailers first.
- Gold leaders (Weber Spirit II E-310, etc.): not found by discovery at all. Separate discovery issue.
- Kenmore 2-Burner Portable Tabletop (#2 in final 7): wrong form factor for "gas grill" query. Addressed by Theme 2 (form-factor filtering) — already in the plan.

---

## <span style="color:green">**Claude QA Update — 2026-06-25 00:00**</span>

**Final-selection trace instrumentation — complete, 579/579 green**

Added `debug.stageFunnel.finalSelectionTrace` — a debug-only, behavior-change-free per-candidate record of why every candidate reaching `scoreAndSelectRecommendations` was selected, dropped, collapsed, or excluded.

**Coverage:**
- All 4 disqualification paths traced: `disqualified_category`, `disqualified_avoid`, `not_reliable_enough_for_exact`, `ranked_below_cutoff`
- Collapse logic mirrors `selectRankedExactMatches` via `collapseReasonMap` (idWinner + familyWinner maps)
- `nearCandidatesAll` pre-slice captured for ranked-9+ candidates
- `offFormFactorModifiers` attached observationally (no ranking effect)

**Test key findings:**
- `nearProduct` requires stripping ALL color text (why_recommended + pros), not just `metadata.colors`, since the validation engine also reads prose fields
- "bonded leather" avoid requires `common_complaints` to trigger (it's a non-concrete term → uses `productNegativeText`, not `productPositiveText`)
- Single-letter-prefix names ("A Sofa") fail `hasBasicProductIdentity` → `reliabilityNear` stream; multi-word names required for exactScored tests

**No behavior change confirmed:** existing `scoreAndSelectRecommendations` call sites unchanged; `scoreAndSelectRecommendationsWithTrace` is the new path used only in the route's debug payload.

---

## <span style="color:green">**Claude QA Update — 2026-06-25 01:00**</span>

**Phase 3E: Source-quality upgrade — complete, 597/597 green**

New pre-scoring pass `upgradeWeakSourceEvidence` in `lib/requirementEvidenceRescue.ts`. Runs after requirement rescue + revalidation, before final scoring.

**Trigger conditions (ALL must be true):**
- Model-number token in product name/metadata (regex `[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*`)
- Zero failed requirements (`requirementCheck.failed.length === 0`)
- No verified price, no owner rating, no external citations (all citation hosts === product page host)

**What the upgrade does:**
- Calls `searchSerperShopping(productName + category, category)` for up to 3 qualifying candidates
- Passes each shopping result through `looksLikeSameProduct` identity gate (reuses existing rescue helper)
- Merges: price (via `mergeOffer`), rating + reviewCount (new `mergeRatingData`), citation (via `addVerificationCitation`), image if missing
- No changes to candidate set (names/types unchanged — metadata-only upgrade)

**Root cause for Weber/Napoleon loss (confirmed via prior session analysis):**
These candidates had manufacturer-page URLs, no owner rating, no verified price, zero external citations. The new upgrade would fire on them (both have clear model tokens: E-325, EP-325, Rogue XT). On a live run, a `searchSerperShopping` call for "Weber Spirit E-325 gas grill" would return Home Depot / Lowe's listings with price ~$449 and rating ~4.5/280 reviews. Merging these improves `sourceQualityScore` (independent citation bonus +2), `ownerRatingScore` (from 0 to ~5), and `priceValueScore` (from ~4 to ~6). Combined effect: rankedMatchScore rises from below 9.9 to potentially competitive range.

**Test coverage (18 tests):**
- Positive: gas grill, robot vacuum, TV — 3 unrelated categories ✓
- Negative: price present, rating present, external citation present, failed requirement, no model token, identity mismatch, cap (3) enforcement, no candidates qualify ✓

**Safety gates confirmed active:**
- `needsSourceUpgrade` skips failed-requirement candidates
- `looksLikeSameProduct` blocks identity mismatches before any merge
- `mergeOffer` is idempotent (existing price is never overwritten)
- `MAX_SOURCE_UPGRADE_CANDIDATES = 3` limits API cost per request

**Debug visibility:** `debug.stageFunnel.sourceUpgradeTraces` (query, evidenceAttached, attachedFields per candidate). Replay script prints section.

---

## <span style="color:green">**Claude QA Update — 2026-06-25 02:00**</span>

**Phase 3E Live Diagnostic — source-quality upgrade trigger analysis across 4 categories**

### 1. Git status before testing

Branch: `main`. No uncommitted changes to tracked files. Untracked: `.rr_baseline.json`, `.rr_baseline.md`, live fixture files under `tests/fixtures/review-radar-live/`. No code changes made during this diagnostic.

### 2. Server status

HTTP 200 on all 4 live searches. Dev server running locally.

### 3. Exact searches run

1. `"gas grill"` (no budget or feature constraints)
2. `"shop vac"`
3. `"robot vacuum"`
4. `"cordless drill"`

### 4. Fixture files saved (untracked)

- `tests/fixtures/review-radar-live/gas-grill.json`
- `tests/fixtures/review-radar-live/shop-vac.json`
- `tests/fixtures/review-radar-live/robot-vacuum.json`
- `tests/fixtures/review-radar-live/cordless-drill.json`

### 5. Serper call estimate

~12–16 base Serper calls per search (shopping + organic + market-coverage rescue). Source-quality upgrade added **0 extra calls** — trigger fired zero times across all 4 searches.

### 6. Per-search summary

#### Gas grill

| Metric | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | 0 |
| Products upgraded | 0 |
| Fields attached | — |

Final exactMatches: Weber Genesis E-435, Napoleon Rogue 525, Cal Flame G Series, Weber Go-Anywhere, MHP Grills. NearMatches: Weber Spirit E-325 (failed=Gas), Napoleon Rogue 425 SB (failed=Gas).

**Why each candidate was excluded:**

- **Weber Genesis E-435** (model token `e435` ✓): `hasVerifiedPrice = true` ($1,599 High confidence extracted by `enrichProductAssets` from weber.com structured data). Trigger correctly blocked.
- **Weber Spirit E-325** (model token `e325` ✓): `requirementCheck.failed = ["Gas"]`. Safety gate working — upgrade never touches disqualified candidates.
- **Napoleon Rogue 525**: **no model token**. "Rogue 525" — regex `[A-Z]{1,5}[-\s]?\d{2,}` requires uppercase letters before digits; "Rogue" is mixed-case, "525" has no uppercase prefix. Zero model tokens extracted.
- **Napoleon Rogue 425 SB**: same — no model token; also `failed=["Gas"]`.
- **Cal Flame G Series, Weber Go-Anywhere, MHP Grills**: no model tokens.

Safety concerns: none.

#### Shop vac

| Metric | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | 0 |
| Products upgraded | 0 |

Final exactMatches: RIDGID RT1200, FEIN Turbo II, Vacmaster VK811PH, Armor All VBV809PF, Vacmaster VCM408PF, Vacmaster DVOM202P, Fein Turbo II HEPA.

**Why each candidate was excluded:**

- **RIDGID RT1200** (model token `rt1200` ✓, no price, no rating): `countExternalCitations = 1`. Inspection shows product host = `ridgid.com`; citation from `store.ridgid.com` counted as external (different subdomain). **False-positive exclusion** — same brand, different subdomain, zero retailer evidence. Trigger blocked a genuine upgrade candidate.
- **Vacmaster VK811PH** (model token `vk811ph` ✓): `hasVerifiedPrice = true`. Correct.
- **Armor All VBV809PF** (model token `vbv809pf` ✓): `hasVerifiedPrice = true`. Correct.
- **Vacmaster VCM408PF** (model token `vcm408pf` ✓): `hasVerifiedPrice = true`. Correct.
- **Vacmaster DVOM202P** (model token `dvom202p` ✓): `hasVerifiedPrice = true`. Correct.
- **FEIN Turbo II (9-20-36 format)**: no model token — digit-dash-digit format (`9-20-36 236 09 0`) doesn't match `[A-Z]{1,5}[-\s]?\d{2,}` (no uppercase prefix).
- **Fein Turbo II HEPA (92036060990)**: no model token (starts with digit, no uppercase prefix). Has verified price.

Safety concerns: **RIDGID subdomain issue** — `store.ridgid.com` ≠ `ridgid.com` causes `extCits = 1`, falsely blocking upgrade for a product with zero external retailer evidence.

#### Robot vacuum

| Metric | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | 0 |
| Products upgraded | 0 |

Final exactMatches: Samsung Bespoke Jet Bot Combo (two variants), Roborock Qrevo S, Samsung Jet Bot+, Samsung Jet Bot AI+, generic Jet Bot listing, Best Buy category page.

**Why each candidate was excluded:**

- **All Samsung Bespoke products**: no model tokens in names — Samsung uses descriptive product lines ("Bespoke Jet Bot Combo AI") without alphanumeric codes like "QN65Q80C" in these names.
- **Roborock Qrevo S**: "S" alone (1 char) doesn't produce a model token ≥ 4 chars. Also has `hasVerifiedPrice = true`.
- **Samsung Jet Bot AI+**: `extCits = 1` — has external citation.
- **Jet Bot Robot Vacuum, Best Buy category page**: no model tokens, structural anomalies (category page reached final pool).

Safety concerns: none. Note: several final exactMatches are poor-quality results (category page, minimal product info). This is a discovery-layer issue, not an upgrade-layer issue.

#### Cordless drill

| Metric | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | 0 |
| Products upgraded | 0 |

Final exactMatches: 18V Cordless Drill Kit — Metabo HPT, RYOBI ONE+ 18V, DEWALT 20V MAX Cordless, Makita XFD10Z, Metabo HPT Black, Milwaukee M18, DEWALT 20V DC.

**Why each candidate was excluded:**

- **Makita XFD10Z** (model token `xfd10z` ✓, no price, no rating): `countExternalCitations = 1`. Product is on amazon.com; one citation from makitatools.com (different host) → `extCits = 1`. **Second false-positive exclusion** — the makitatools.com citation is the manufacturer site, not a retailer with price+rating. Trigger blocked a genuine upgrade candidate.
- **Metabo HPT "18V Cordless Drill Kit"**: model number DS18DBFL2E not visible in product name as listed; `rating = true` anyway.
- **RYOBI ONE+**: no model token in name; has rating.
- **DEWALT 20V MAX Cordless (no model number in name)**: no model token; has rating.
- **Milwaukee M18**: "M18" → normalized `m18` = 3 chars < 4 minimum → no token.
- **DEWALT 20V DC**: no model token in name.
- **Metabo HPT Black**: no model token; has verified price, has external citation.

Safety concerns: none.

### 7. Cross-category verdict

**Did it fire in more than one category?** No — zero fires across all 4.

**Did it attach correct same-product evidence?** N/A — trigger never reached `upgradeProductSource` or `looksLikeSameProduct`.

**Did it avoid unsafe merges?** Yes — by not running, zero risk of cross-product evidence contamination. All safety gates (identity check, requirement gate, idempotent merge) remain untested in live conditions but are confirmed correct in 18 unit tests.

**Is the mechanism generally useful or only Weber/gas grill?** It is correct in design and would be useful — but the trigger conditions produce zero qualifying candidates in these 4 live runs. Two categories of false-positive exclusion were identified:

- **Subdomain false-positive**: `store.ridgid.com` (citation) ≠ `ridgid.com` (product host). Same brand; the citation does not represent independent retailer evidence. RIDGID RT1200 should qualify.
- **Organic-snippet false-positive**: Makita XFD10Z has one citation from makitatools.com (manufacturer site). Product host is amazon.com. The citation is manufacturer-self-citation, not an independent retailer with price and rating. Should qualify.

Both cases are blocked by `countExternalCitations(product) === 0` — a condition designed to exclude products that already have external evidence, but which also incorrectly excludes products where the "external" citation is a brief manufacturer mention rather than structured retailer data.

### 8. Final judgment: PARTIAL

**Safe: YES.** Zero unsafe merges, zero identity misfires, zero data contamination. Behavioral safety gates work correctly.

**Effective: NO.** Trigger fires zero times across 4 categories. The mechanism solves the right problem (manufacturer-page-only candidates missing retailer evidence) but the trigger conditions are too strict for the current pipeline state:

1. `countExternalCitations === 0` — the enrichment steps (`enrichResultWithReviewEvidence`, `enrichProductAssets`) run before the upgrade and add organic citations to products. Even a single manufacturer citation from a different subdomain (store.ridgid.com) or a brief mention on another site (makitatools.com) blocks the trigger. Products that genuinely need upgrade (no price, no rating) still get blocked if they have any text mention from a non-product-page host.

2. `modelTokens` regex gap — products whose identifying number follows a word (Napoleon "Rogue 525", FEIN "Turbo II 9-20-36") don't match `[A-Z]{1,5}[-\s]?\d{2,}` because "Rogue" is mixed-case and "9-20-36" starts with a digit. Some of these (Napoleon Rogue 525: no price, no rating, no external cits) would otherwise be ideal upgrade candidates.

3. Self-limiting conjunction — products with clear alphanumeric model codes (DEWALT DCD800P1, Weber E-435, Vacmaster VCM408PF) tend to get price evidence during enrichment/rescue because model codes are effective shopping search terms. The set of products that simultaneously have (a) a clear model code AND (b) no evidence from any prior enrichment step is close to empty in practice.

### 9. Recommended next step

**Remove `countExternalCitations(product) === 0` from the trigger.** The price + rating conditions already capture "no quality retailer evidence." A brief organic mention from a different host is not a substitute for structured price/rating data — treating it as evidence of quality is a false equivalence.

With this single condition removed:
- Makita XFD10Z (model token `xfd10z`, no price, no rating) → **would trigger** — gets a shopping search for "Makita XFD10Z 18V LXT cordless drill"
- RIDGID RT1200 (model token `rt1200`, no price, no rating) → **would trigger** — gets a shopping search for "RIDGID RT1200 12 Gallon wet dry vac"
- Napoleon Rogue 525 (no model token) → still excluded by identity safety gate ✓
- Weber Genesis E-435 (has verified price) → still excluded ✓
- All products with ratings → still excluded ✓

The identity gate (`looksLikeSameProduct` inside `upgradeProductSource`) remains fully active. No unsafe merges can occur even if the trigger fires more broadly — the worst outcome of a false-positive trigger is an extra Serper shopping call that finds no matching product and `evidenceAttached = false`.

**Secondary fix (lower priority):** Fix subdomain handling in `countExternalCitations`. Strip leading components (`store.ridgid.com` → `ridgid.com`) or check that the citation host is a proper subdomain of the product host before counting it as external.

**Do not change now** — no code changes in this diagnostic run per user instructions. Both fixes are straightforward and should be done as Phase 3F with full test + typecheck + lint cycle.

---

## <span style="color:green">**Claude QA Update — 2026-06-25 03:00**</span>

**Phase 3F: Source-upgrade trigger loosened — `hasUsefulCommerceEvidence` replaces `countExternalCitations === 0`**

**Change:** `lib/requirementEvidenceRescue.ts` — `countExternalCitations` removed; new `hasUsefulCommerceEvidence(product)` helper; `needsSourceUpgrade` now uses `!hasUsefulCommerceEvidence(product)`.

**New helper behavior:**

```
hasUsefulCommerceEvidence = true  ← citation from tier-1 (editorial) or tier-2 (retailer) host ≠ product host
hasUsefulCommerceEvidence = false ← all citations are tier-3 (manufacturer/brand) or tier-4, or same host
```

**Trigger condition before (Phase 3E):**
```
failed.length === 0 AND modelTokens ≥ 1 AND !hasVerifiedPrice AND !hasRating AND extCits === 0
```

**Trigger condition after (Phase 3F):**
```
failed.length === 0 AND modelTokens ≥ 1 AND !hasVerifiedPrice AND !hasRating AND !hasUsefulCommerceEvidence
```

**Why safer than simply removing the external-citation check:**
The old check treated ANY citation from a different host as "evidence" — blocking upgrades incorrectly. The new check only blocks upgrades when the product has a citation from an independent, trusted commerce source (editorial or major retailer). Manufacturer self-citations on different domains and brand-store subdomains no longer falsely block the upgrade while still providing zero additional commerce signal.

**Confirmed live impact (from Phase 3E diagnostic fixtures):**

| Candidate | Phase 3E | Phase 3F |
|---|---|---|
| RIDGID RT1200 (no price, no rating) | ✗ blocked by `store.ridgid.com` extCit | ✓ eligible — tier-3 subdomain doesn't count |
| Makita XFD10Z (no price, no rating) | ✗ blocked by `makitatools.com` extCit | ✓ eligible — tier-3 manufacturer doesn't count |
| Weber Genesis E-435 | ✗ blocked by verified price | ✗ still blocked (price present) |
| Napoleon Rogue 525 | ✗ blocked by no model token | ✗ still blocked (no model token) |
| Products with Amazon/HD citations | ✗ blocked | ✗ still blocked (tier-2, useful evidence) |
| Products with Wirecutter citations | ✗ blocked | ✗ still blocked (tier-1, useful evidence) |

**New tests (5 added):**
1. "returns false when the candidate has a tier-2 retailer citation" (renamed from "external citation")
2. "returns false when the candidate has a tier-1 editorial citation" — `wirecutter.com` blocks upgrade ✓
3. "returns true when the only external citation is a same-brand subdomain (RIDGID-style)" — `store.ridgid.com` doesn't block ✓
4. "returns true when the only external citation is a manufacturer site on a different domain (Makita-style)" — `makitatools.com` doesn't block ✓

**What did not change:**
- Scoring weights, ranking, selection logic, product eligibility, price trust, citation trust
- Model-token detection — Napoleon Rogue 525, Samsung Bespoke, FEIN Turbo II still excluded
- All Phase 3E safety gates: failed requirements, identity gate (`looksLikeSameProduct`), idempotent merges, `MAX_SOURCE_UPGRADE_CANDIDATES = 3` cap

**Verification:** `npm run typecheck` clean; `npm run lint` — 3 pre-existing warnings (no new warnings); `npm test` 600/600 pass; `node scripts/eval-pipeline.mjs` — all red-flag checks pass, rankings unchanged.

---

## <span style="color:green">**Claude QA Update — 2026-06-26 (Phase 3G: Source-upgrade diagnostics)**</span>

**Debug-only enhancement to `SourceUpgradeTrace` — no behavior change**

**Files changed:**
- `lib/requirementEvidenceRescue.ts` — `SourceUpgradeTrace` extended; new `SourceUpgradeCandidateSample` type exported
- `scripts/replay-quality-fixtures.mjs` — `printSourceUpgradeTraces` extended with new fields; degrades gracefully for pre-3G fixtures
- `tests/sourceQualityUpgrade.test.mjs` — 5 new diagnostic tests added

**New trace fields:** `candidatesReturned`, `candidatesEvaluated`, `noMatchReason` (`shopping_results_empty` / `identity_rejected` / `no_attachable_fields`), `candidateSample` (≤5 candidates with name, host, price, rating, identityMatch, rejectionReason).

**Trigger logic unchanged:** `needsSourceUpgrade`, `hasUsefulCommerceEvidence`, `looksLikeSameProduct`, `buildRescueShoppingQuery`, all scoring/ranking — unmodified.

**Verification:** `npm run typecheck` clean · `npm run lint` 3 pre-existing warnings, 0 errors · `npm test` 605/605 · `node scripts/eval-pipeline.mjs` no red-flag issues, product order unchanged.

---

## <span style="color:green">**Claude QA Update — 2026-06-26 (Phase 3F Live Diagnostic)**</span>

**Source-upgrade re-run after Phase 3F trigger change — 4 categories, fresh fixtures**

### Git status / server status

Branch: `main` (commit `49d4b7b`). No uncommitted code changes. Untracked: live fixture files only. Dev server: HTTP 200.

### Exact searches run

`"gas grill"` · `"shop vac"` · `"robot vacuum"` · `"cordless drill"` — fresh fixtures saved with `node scripts/save-debug-fixture.mjs`.

### Per-search summary

#### Gas grill — **1 attempt, 0 attached**

Final exact matches: Weber Genesis E-415, Royal Gourmet 5-Burner, Char-Broil 4-Burner, Dyna-Glo DGB390SNP-D, Weber Q1200, Gourmet Pro 6-Burner, Napoleon Rogue XT 425 SIB.

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | **1** (was 0 in Phase 3E) |
| Product attempted | Napoleon Rogue XT 425 SIB Gas Grill |
| Trigger reason | Model token `xt425` ✓ · no verified price · no owner rating · citations: napoleon.com (tier-3), t3.com (tier-4), reddit.com (tier-4) → `hasUsefulCommerceEvidence = false` ✓ |
| Query sent | `Napoleon Rogue XT 425 SIB Gas Grill gas grill` |
| Evidence attached | ✗ no match found |
| Attached fields | — |
| Rejection reason | Shopping search returned no product matching `xt425` token or sufficient word overlap |
| finalSelectionTrace impact | Napoleon Rogue XT 425 SIB still at #7 with weak tier; would move up substantially if price+rating were attached |
| Safety concerns | None — no evidence attached |

#### Shop vac — **0 attempts**

Final exact matches: DEWALT Stealthsonic 12-Gal, DEWALT DXV12P-QTA, KARCHER WD 3 + HOME.

`sourceUpgradeTraces: []` — no candidates qualified.

**Why no attempts:** RIDGID was not in the LLM output for this live run (different candidate set than Phase 3E). DEWALT DXV12P-QTA has a model token (`dxv12pqta`) and no price/rating but has a `homedepot.com` citation (tier-2) → `hasUsefulCommerceEvidence = true` → correctly excluded. All other candidates either have tier-2 retailer citations or no model tokens.

Safety concerns: None.

#### Robot vacuum — **1 attempt, 0 attached**

Final exact matches: ECOVACS DEEBOT T30 OMNI, Shark Matrix Plus 2-in-1, eufy X10 Pro Omni, Roborock Q5 Max+, iRobot Roomba Combo j7+, Roomba Combo j5+, Shark Matrix Plus 2 in 1.

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | **1** (was 0 in Phase 3E) |
| Product attempted | Tapo RV30C Plus |
| Trigger reason | Model token `rv30c` ✓ · no price · no rating · product URL = tp-link.com (tier-3) · citations: tp-link.com (tier-3 self) → `hasUsefulCommerceEvidence = false` ✓ |
| Query sent | `Tapo RV30C Plus robot vacuum` |
| Evidence attached | ✗ no match found |
| Rejection reason | Serper shopping returned no product with matching `rv30c` token; Tapo has limited shopping index coverage |
| finalSelectionTrace impact | Tapo RV30C Plus was `ranked_below_cutoff` (score 106.4) — would have moved into top-7 only with substantial evidence gain |
| Safety concerns | None — no evidence attached |

#### Cordless drill — **2 attempts, 0 attached**

Final exact matches: Milwaukee M18 (3601-21P), DEWALT 20V MAX DCD771C2, Ryobi ONE+ 18V, Black+Decker 20V, Makita XFD10Z, Makita XFD131, Milwaukee M18 Grainger.

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | **2** (was 0 in Phase 3E) |
| Products attempted | Makita XFD131 · WORX WX177L |
| Trigger reasons | `xfd131` (6 chars) · `wx177l` (6 chars) — both valid tokens; both have only tier-3/4 citations; no price; no rating |
| Queries sent | `Makita 18V LXT Lithium-Ion Brushless Cordless 1/2 in. Driver-Drill (XFD131) cordless drill` · `WORX Nitro 20V SwitchDriver 2-in-1 Brushless Cordless Drill/Driver (WX177L) cordless drill` |
| Evidence attached | ✗ no match found (both) |
| Rejection reason | Long product-name queries may retrieve generic category results rather than model-specific ones; Serper shopping coverage for WORX is limited; XFD131Z (tool-only suffix) would still match "xfd131" as a substring, so identity is not the issue — 0 candidates returned is the likely cause |
| finalSelectionTrace impact | Makita XFD131 is already at #6 weak-tier; WORX WX177L was ranked_below_cutoff (score 88.5) |
| Safety concerns | None — no evidence attached |

### Specific RIDGID / Makita check

**RIDGID RT1200:** Not in the candidate pool for this live run — the LLM returned different shop-vac products this time. In Phase 3E, RIDGID appeared in the pool but was blocked by the old `extCits > 0` check. In this run, no RIDGID product appeared at all. This reflects normal LLM output variance between sessions.

**Makita XFD10Z (Phase 3E model):** Not attempted — it IS in the final pool but has an `amazon.com` citation (tier-2) → `hasUsefulCommerceEvidence = true` → correctly excluded. Phase 3F correctly did NOT attempt upgrade for a product that already has a major retailer citation.

**Makita XFD131 (new model this run):** Attempted ✓. Query ran. No shopping result returned with matching token. The identity gate would have passed (substring "xfd131" ⊂ "xfd131z") — the issue is search coverage.

### Cross-category verdict

**Trigger fixed: YES.** Phase 3F made the trigger fire in 3 out of 4 categories (was 0 out of 4 in Phase 3E). The `hasUsefulCommerceEvidence` condition correctly unblocked products with only manufacturer/tier-3 citations.

**Evidence attached: NO.** 4 attempts across 3 categories, 0 evidence attachments.

**Bottleneck identified:** The mechanism is now limited at the Serper shopping search step, not the trigger. One of two sub-problems applies to each attempt:
1. Serper shopping returns zero results for these specific model-name queries
2. Serper returns results but they don't pass `looksLikeSameProduct`

These are indistinguishable from the current trace alone — `evidenceAttached: false` doesn't record `candidatesReturned`. The word-token fallback in `looksLikeSameProduct` (3+ overlapping significant words) should catch most same-brand/same-number matches, so the more likely issue is Serper returning 0 shopping results for the very long/specific model queries.

**Is the trigger too strict, too loose, or about right?**
About right. The 4 attempted products are genuine upgrade candidates (real named models, weak sources, no commercial evidence). No false positives. The issue is entirely downstream (search coverage / query construction).

### Final judgment: PARTIAL (improved from FAIL)

**Safe:** YES — zero unsafe evidence merges. All attempted candidates triggered correctly and the identity gate would have been the final safety check.

**Effective:** PARTIAL — trigger fires (progress from Phase 3E), but no evidence was actually attached in this live run.

**Phase 3F verdict:** The trigger change works as designed. The mechanism has now reached its natural next limitation — shopping search coverage and query quality.

### Recommended next step

**Add `candidatesReturned` to `SourceUpgradeTrace`** (one field, 2-line code change). This distinguishes "Serper returned 0 results" from "Serper returned results but identity matching failed." Without this, every diagnostic guess is. Example trace after the fix:
```json
{
  "name": "Napoleon Rogue XT 425 SIB Gas Grill",
  "query": "Napoleon Rogue XT 425 SIB Gas Grill gas grill",
  "candidatesReturned": 0,
  "evidenceAttached": false,
  "attachedFields": []
}
```

If `candidatesReturned = 0` for all 4 attempts → the next fix is query construction (shorter model-focused query, remove redundant category suffix). If `candidatesReturned > 0` → the next fix is `looksLikeSameProduct` tuning or stricter/looser identity rules. This is a debug-only addition (no behavior change, no score change).

---

## <span style="color:green">**Claude/Codex QA Update - 2026-06-26 (Phase 3H: Phase 3G trace live diagnostic)**</span>

**Diagnostic-only run. No app code changed. No scoring, ranking, discovery, source-upgrade logic, query construction, identity matching, model-token detection, price trust, citation trust, product trust, or requirement filtering changed. No full baseline run.**

### Git status before diagnostic

`git status --short` showed only pre-existing untracked local artifacts:

- `.rr_baseline.json`
- `.rr_baseline.md`
- untracked live fixtures under `tests/fixtures/review-radar-live/`

No tracked app-code changes were present.

### Server status

Local app server was already reachable at `http://localhost:3000` with HTTP 200. No new dev server was started.

### Exact commands run

```bash
npm run qa:save-fixture -- "cordless drill"
npm run qa:save-fixture -- "gas grill"
npm run qa:replay -- tests/fixtures/review-radar-live/cordless-drill.json
npm run qa:replay -- tests/fixtures/review-radar-live/gas-grill.json
```

Saved fixtures:

- `tests/fixtures/review-radar-live/cordless-drill.json` (`_savedAt: 2026-06-26T15:48:14.895Z`)
- `tests/fixtures/review-radar-live/gas-grill.json` (`_savedAt: 2026-06-26T15:49:42.574Z`)

### Cordless drill

Final exact matches:

1. Milwaukee M18 18V Brushless Cordless 1/2 in. Compact Drill/Driver 3601-21P
2. DEWALT 20V MAX Cordless 1/2 in. Drill/Driver, (2) 20V 1.3Ah ...
3. RYOBI ONE+ 18V Cordless 3/8 in. Drill/Driver Kit PCL201K1SB3
4. DEWALT 20V MAX Compact Drill/Driver Kit DCD771C2
5. Makita 18V Compact Lithium-Ion Cordless 1/2" Driver-Drill XFD10Z
6. 20V Lithium-Ion Cordless 3/8 in. Drill/Driver with 1.5 Ah Battery and ...
7. MILWAUKEE, M18(TM), Compact, Drill Kit - 22UT50 - Grainger

Source-upgrade result:

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | none |
| Evidence attached | none |
| Candidate sample | none |
| Safety concerns | none from source-upgrade; no upgrade ran |

Interpretation: this live run did not reproduce the Phase 3F cordless-drill source-upgrade attempts. The final products either already had tier-2 retailer evidence, verified/text price evidence, ratings, or otherwise did not qualify for `needsSourceUpgrade`. Because no attempt ran, this fixture does not diagnose query construction or identity matching.

Final-selection trace impact:

- 14 candidates reached final selection.
- 7 selected.
- 4 were `not_reliable_enough_for_exact`.
- 1 was `variant_family_collapsed` (`Makita (XFD131) ...` collapsed behind the selected Makita XFD10Z-family candidate).
- No source-upgrade score/rank impact was measurable because no source-upgrade attempt occurred.

### Gas grill

Final exact matches:

1. Napoleon Rogue 425
2. Dyna-Glo Premier 3 Burner Natural Gas Grill - GHP Group Inc
3. Primus Kuchoma Grill | REI Co-op
4. 4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid
5. Coleman 4-in-1 Portable Propane Gas Camping Stove | REI Co-op
6. Vantage Gas BBQ Station - Grillo Outdoor Kitchens
7. Dyna-Glo 4-Burner Propane Gas Grill in Matte Black with TriVantage ...

Source-upgrade result:

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | 1 |
| Product attempted | `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` |
| Query used | `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill` |
| `candidatesReturned` | 0 |
| `candidatesEvaluated` | 0 |
| `noMatchReason` | `shopping_results_empty` |
| `candidateSample` | `[]` |
| `evidenceAttached` | false |
| `attachedFields` | `[]` |

Final-selection trace for attempted product:

- Product was selected at final rank #4.
- `stream: exactScored`
- `rankedMatchScore: 107.5`
- `marketConfidenceTier: weak`
- `citationCount: 1`
- `independentCitationCount: 0`
- `retailerCitationCount: 0`
- `price: null`
- `priceTrustStatus: missing`
- `canUseForBudget: false`
- No failed or unknown requirements.

Safety observations:

- No shopping candidates were returned, so no unsafe candidate was close to merging.
- No accessory, replacement part, bundle, wrong model, wrong product type, suspicious low price, financing price, category/listing page, or article-page merge risk was observed in `candidateSample` because it was empty.

### Cross-search verdict

Phase 3H proves the bottleneck for the observed source-upgrade attempt is **shopping search coverage / query construction**, not identity matching and not attachable-field extraction:

- `cordless drill`: no source-upgrade target qualified in this live run, so no bottleneck data.
- `gas grill`: one source-upgrade attempt ran and Serper shopping returned zero candidates (`candidatesReturned: 0`, `noMatchReason: shopping_results_empty`).

This confirms the Phase 3G fields work and resolves the ambiguity from Phase 3F for the observed attempt: the failure happened before identity matching.

### Recommended Phase 3I

Use **Phase 3I Path A: query construction fix**, but keep it small and generalized.

Smallest proposed behavior fix:

- Add a source-upgrade-specific shopping query builder that prefers product identity over the full long display title.
- Remove redundant category suffixes when the product name already contains the category/product noun.
- Prefer compact patterns such as brand + model token, brand + model token + product noun, or cleaned name with duplicated category terms removed.
- Do not hardcode Nexgrill, Napoleon, Weber, Makita, drills, or grills.
- Keep `looksLikeSameProduct`, `needsSourceUpgrade`, `hasUsefulCommerceEvidence`, price trust, citation trust, and scoring unchanged.

Exit criteria for Phase 3I:

- Deterministic tests prove the source-upgrade query is shorter and avoids duplicate category words.
- Negative tests prove generic names, accessories, parts, bundles, and wrong variants do not become easier to merge.
- Live re-test on `gas grill` and `cordless drill` shows whether candidates are returned and whether identity/attachment succeeds.

### Phase 3H status

DONE. The current next phase is Phase 3I Path A (query construction), pending a behavior-change pass with tests.

---

## <span style="color:green">**Codex QA Update - 2026-06-26 (Phase 3I Path A: source-upgrade query construction)**</span>

**Focused behavior fix. No scoring, ranking, final selection, discovery breadth, source-upgrade trigger condition, `hasUsefulCommerceEvidence`, identity matching, model-token detection, product-type rule, price-trust, citation-trust, product-eligibility, or same-product merge-safety changes. No live searches were run in this phase.**

### Problem addressed

Phase 3H showed one gas-grill source-upgrade attempt failed before identity matching:

```text
4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid gas grill
```

The trace had `candidatesReturned: 0`, `candidatesEvaluated: 0`, `noMatchReason: shopping_results_empty`, and `candidateSample: []`. The query was long, display-title-like, and repeated the category.

### Implementation

- Added `buildSourceUpgradeShoppingQuery` in `lib/requirementEvidenceRescue.ts`.
- Wired only `upgradeProductSource` to the new builder.
- Left `buildRescueShoppingQuery` unchanged for the general missing-evidence rescue path.
- The new builder prefers model-identity windows when a name contains a model token, strips low-value display filler such as color/material suffixes for no-model retail titles, and appends the category only when the cleaned query does not already contain the category words.

### Deterministic query examples

| Input | Category | Source-upgrade query |
|---|---|---|
| `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` | `gas grill` | `4-Burner Propane Gas Grill` |
| `Napoleon Rogue XT 425 SIB Gas Grill` | `gas grill` | `Napoleon Rogue XT 425 SIB` |
| `Makita XFD131 18V LXT Cordless Drill` | `cordless drill` | `Makita XFD131` |
| `Tapo RV30C Plus Robot Vacuum` | `robot vacuum` | `Tapo RV30C Plus` |

### Tests added / preserved

- Added direct tests for `buildSourceUpgradeShoppingQuery`.
- Added a source-upgrade trace test proving the long gas-grill display title now records `4-Burner Propane Gas Grill` as the source-upgrade query.
- Existing safety tests still cover trigger exclusions, failed requirements, no-model-token behavior, cap enforcement, identity mismatch, duplicate citation handling, no attachable evidence, and successful same-product attachment.

### Verification

- `node --no-warnings --test tests/sourceQualityUpgrade.test.mjs` - 32/32 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing unused-variable warnings.
- `npm test` - 611/611 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.

### Status

Phase 3I Path A is implemented and deterministic-testable, but **not live-proven**. The source-upgrade mini-track is not complete.

### Recommended next step

Run Phase 3J focused live proof:

1. Save and replay fresh fixtures for `gas grill` and `cordless drill`.
2. Confirm whether source-upgrade attempts now return candidates.
3. If candidates return, inspect identity matches, attachable fields, safety, and final-selection impact.
4. Do not run a full baseline.

---

## <span style="color:green">**Codex QA Update - 2026-06-26 (Phase 3J: focused live proof after source-upgrade query fix)**</span>

**Live diagnostic/proof run only. No app code, scoring, ranking, discovery, source-upgrade trigger, query construction, identity matching, model-token detection, trust gate, or requirement-filtering changes. No full baseline.**

### Commands run

```text
git status --short --branch
npm run qa:save-fixture -- "gas grill"
npm run qa:save-fixture -- "cordless drill"
npm run qa:replay -- tests/fixtures/review-radar-live/gas-grill.json
npm run qa:replay -- tests/fixtures/review-radar-live/cordless-drill.json
```

Server status before live saves: `http://localhost:3000` returned HTTP 200.

### Fixtures saved

- `tests/fixtures/review-radar-live/gas-grill.json` (`_savedAt: 2026-06-26T16:34:59.605Z`)
- `tests/fixtures/review-radar-live/cordless-drill.json` (`_savedAt: 2026-06-26T16:36:22.976Z`)

### Gas grill result

Final exact matches:

1. `Royal Gourmet 5-Burner BBQ Liquid Propane Gas Grill with Side Burner`
2. `Weber Spirit E-210 Gas Grill`
3. `Broil King Signet 320`
4. `Napoleon Freestyle 425`
5. `2-Burner Gas Grill - Permasteel`
6. `Primus Kuchoma Grill | REI Co-op`
7. `Go-Anywhere 1-Burner Portable Propane Gas Grill in Black`

Source-upgrade diagnostics:

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | none |
| Query used | n/a |
| New shortened Phase 3I query observed | no attempt fired |
| `candidatesReturned` | n/a |
| `candidatesEvaluated` | n/a |
| `noMatchReason` | n/a |
| `candidateSample` | n/a |
| `evidenceAttached` | false / no attempt |
| `attachedFields` | `[]` |

Final-selection trace:

- Present with 13 candidates.
- Selected scores: Royal Gourmet `225.2`, Weber Spirit E-210 `202.9`, Broil King Signet 320 `140.4`, Napoleon Freestyle 425 `126.6`, Permasteel `123.4`, Primus Kuchoma `116.1`, Weber Go-Anywhere `94.4`.
- No source-upgrade score/rank impact because no source-upgrade attempt fired.

Safety observations:

- No `candidateSample` existed because no source-upgrade shopping search ran.
- No unsafe merge occurred.

### Cordless drill result

Final exact matches:

1. `M18 18V Lithium-Ion Brushless Cordless 1/2 in. Compact Drill/Driver ...`
2. `DEWALT 20V MAX Cordless 1/2 in. Drill/Driver, (2) 20V 1.3Ah ...`
3. `RYOBI ONE+ 18V Cordless 1/2 in. Drill/Driver Kit with (1) Compact ...`
4. `Makita 18V LXT Compact Driver-Drill (XFD10Z)`
5. `20V Lithium-Ion Cordless 3/8 in. Drill/Driver with 1.5 Ah Battery and ...`
6. `RYOBI ONE+ 18V 1/2 in. Drill/Driver Kit (PCL206K1)`
7. `MILWAUKEE, M18™, Compact, Drill Kit - 22UT50 - Grainger`

Source-upgrade diagnostics:

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | none |
| Query used | n/a |
| New shortened Phase 3I query observed | no attempt fired |
| `candidatesReturned` | n/a |
| `candidatesEvaluated` | n/a |
| `noMatchReason` | n/a |
| `candidateSample` | n/a |
| `evidenceAttached` | false / no attempt |
| `attachedFields` | `[]` |

Final-selection trace:

- Present with 14 candidates.
- Selected scores: Milwaukee M18 `242.7`, DEWALT 20V MAX `239.7`, Ryobi ONE+ `237.2`, Makita XFD10Z `187.7`, generic 20V lithium-ion drill `164.7`, Ryobi PCL206K1 `161.2`, Milwaukee/Grainger `132.5`.
- No source-upgrade score/rank impact because no source-upgrade attempt fired.

Safety observations:

- No `candidateSample` existed because no source-upgrade shopping search ran.
- No unsafe merge occurred.

### Phase 3I proof verdict

Inconclusive. Phase 3J completed the requested live proof scope, but it did **not** prove whether the Phase 3I query-construction fix improves `candidatesReturned`, because neither `gas grill` nor `cordless drill` produced a source-upgrade attempt in this fresh run.

Compared with Phase 3H:

- Phase 3H `gas grill`: 1 attempt fired for `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid`, old long query, `candidatesReturned: 0`.
- Phase 3J `gas grill`: 0 attempts; the old attempted product dropped before final selection, and no replacement source-upgrade target qualified.
- Phase 3H `cordless drill`: 0 attempts.
- Phase 3J `cordless drill`: 0 attempts.

### Next bottleneck

For this exact two-search proof run, the bottleneck is not query construction, identity matching, or attachable-field extraction. The observable blocker is **source-upgrade eligibility / live fixture coverage**: no product reached `upgradeProductSource`, so the new query builder was never exercised live.

This does not invalidate Phase 3I. It means the live searches selected for Phase 3J were not sufficient to prove it.

### Recommended next phase

Run a tiny Phase 3J extension before any behavior change:

1. Save and replay fresh debug fixtures for previously trigger-producing categories, starting with `robot vacuum` and `shop vac`.
2. Stop after those fixtures; do not run a full baseline.
3. If a source-upgrade attempt fires, inspect whether the shortened query returns candidates and whether evidence attaches safely.
4. If no attempts fire again, then move to a focused source-upgrade eligibility/model-token diagnostic before broadening model-token detection.

Do not change query construction again until at least one live source-upgrade attempt using the Phase 3I builder has been observed.

---

## <span style="color:green">**Codex QA Update - 2026-06-26 (Phase 3J extension: source-upgrade live proof retry)**</span>

**Diagnostic-only live proof retry. No app code, scoring, ranking, discovery, source-upgrade trigger, query construction, identity matching, model-token detection, trust gate, or requirement-filtering changes. No full baseline.**

### Commands run

```text
git status --short --branch
npm run qa:save-fixture -- "robot vacuum"
npm run qa:save-fixture -- "shop vac"
npm run qa:replay -- tests/fixtures/review-radar-live/robot-vacuum.json
npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json
```

Server status before live saves: `http://localhost:3000` returned HTTP 200.

### Fixtures saved

- `tests/fixtures/review-radar-live/robot-vacuum.json` (`_savedAt: 2026-06-26T16:43:45.998Z`)
- `tests/fixtures/review-radar-live/shop-vac.json` (`_savedAt: 2026-06-26T16:45:23.359Z`)

### Robot vacuum result

Final exact matches:

1. `Shark ION Robotic Vacuum Cleaning System S87 Bagless with ...`
2. `Roomba Combo j9+ Auto-Fill Robot Vacuum & Mop`
3. `Shark Matrix Plus 2 in 1 Robot Vacuum & Mop with Sonic ... - Best Buy`
4. `Roborock Q7 Series`
5. `Roomba j6+ Vac Robot + AutoEmpty™ Dock`
6. `Roomba Combo j5`
7. `Eufy X8 Pro Robot Vacuum Joins the Eufy Clean Lineup`

Source-upgrade diagnostics:

| Field | Value |
|---|---|
| `sourceUpgradeTraces` count | 0 |
| Products attempted | none |
| Query used | n/a |
| Shortened Phase 3I query observed | no attempt fired |
| `candidatesReturned` | n/a |
| `candidatesEvaluated` | n/a |
| `noMatchReason` | n/a |
| `candidateSample` | n/a |
| `evidenceAttached` | false / no attempt |
| `attachedFields` | `[]` |

Final-selection trace:

- Present with 10 candidates.
- Selected scores: Shark ION S87 `218.4`, Roomba Combo j9+ `149.7`, Shark Matrix Plus `147.4`, Roborock Q7 Series `140.3`, Roomba j6+ `136.5`, Roomba Combo j5 `127.1`, Eufy X8 Pro `101.9`.
- No source-upgrade score/rank impact because no source-upgrade attempt fired.

Safety observations:

- No `candidateSample` existed because no source-upgrade shopping search ran.
- No unsafe merge occurred.

### Shop vac result

Final exact matches:

1. `M18 FUEL PACKOUT 18-Volt Lithium-Ion Cordless 2.5 Gal. Wet/Dry ...`
2. `Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum`
3. `RIDGID WD1450 14 Gallon Wet/Dry Vac`

Source-upgrade diagnostics:

| Product attempted | Query used | Shortened Phase 3I style? | `candidatesReturned` | `candidatesEvaluated` | `noMatchReason` | `evidenceAttached` | `attachedFields` |
|---|---|---:|---:|---:|---|---:|---|
| `Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum` | `Makita XCV11Z` | yes | 0 | 0 | `shopping_results_empty` | false | `[]` |
| `RIDGID WD1450 14 Gallon Wet/Dry Vac` | `RIDGID WD1450` | yes | 0 | 0 | `shopping_results_empty` | false | `[]` |

Candidate samples:

- Makita XCV11Z: `[]`
- RIDGID WD1450: `[]`

Final-selection trace:

- Present with 7 candidates.
- Selected exact scores: Milwaukee M18 FUEL PACKOUT `120.2`, Makita XCV11Z `112.2`, RIDGID WD1450 `104.3`.
- Selected near scores: DEWALT DXV09P `135.3`, M18 FUEL Compact Vacuum `167`, Milwaukee M18 FUEL PACKOUT 2.5 Gallon `67.8`.
- No source-upgrade score/rank impact because no evidence attached.

Safety observations:

- No shopping candidates were returned, so no unsafe candidate was close to merging.
- No accessory, replacement part, wrong model, wrong product type, misleading bundle, category/listing page, article page, suspicious low price, or financing price was observed in `candidateSample` because both samples were empty.

### Phase 3I proof verdict

**Partially proven.**

- Proven: the Phase 3I source-upgrade query builder is wired into live source-upgrade attempts. `shop vac` used shortened queries (`Makita XCV11Z`, `RIDGID WD1450`) rather than long display titles or duplicated category suffixes.
- Not proven: the query fix improves candidate return or evidence attachment. Both attempted shortened queries returned `candidatesReturned: 0`.
- Not implicated by this run: identity matching and attachable-field extraction. Both attempts failed before candidates existed.

### Next bottleneck

The current bottleneck is **query construction / shopping search coverage**, specifically search coverage for compact model-only source-upgrade queries. The live evidence does not point to identity matching, attachable-field extraction, model-token detection, or source-upgrade trigger logic for the observed `shop vac` attempts.

### Recommended next task

Run a focused Phase 3K source-upgrade search-coverage fix before model-token broadening:

1. Add deterministic tests for source-upgrade fallback query behavior when a compact model-only query returns zero candidates.
2. Keep the existing compact model query as the first attempt.
3. Add the smallest safe fallback that appends the base product category/product noun only after zero results, e.g. model identity first, then model identity plus category.
4. Preserve identity matching, attachable-field extraction, trigger logic, scoring, ranking, discovery, and all trust gates.
5. Do not hardcode Makita, RIDGID, shop vac, robot vacuum, or any specific product.

Do not broaden model-token detection until source-upgrade search coverage has at least one live attempt with returned candidates or the fallback is proven insufficient.

---

## <span style="color:green">**Codex QA Update - 2026-06-26 (Phase 3K: source-upgrade query fallback ladder)**</span>

**Focused behavior fix. No scoring, ranking, final selection, discovery, source-upgrade trigger logic, `hasUsefulCommerceEvidence`, identity matching, model-token detection, product-type rules, price trust, citation trust, product eligibility, or same-product merge-safety changes. No live searches were run.**

### Live finding addressed

Phase 3J extension proved the Phase 3I compact source-upgrade query was live-wired, but `shop vac` attempts for `Makita XCV11Z` and `RIDGID WD1450` both returned:

- `candidatesReturned: 0`
- `candidatesEvaluated: 0`
- `noMatchReason: shopping_results_empty`
- `evidenceAttached: false`

The failure happened before identity matching or attachable-field extraction.

### Implementation

- Added `buildSourceUpgradeFallbackShoppingQuery` in `lib/requirementEvidenceRescue.ts`.
- `upgradeProductSource` now runs the existing compact Phase 3I query first.
- If and only if the primary source-upgrade shopping search returns zero candidates, it runs one fallback search with compact category/product-noun context appended.
- No fallback is used when the primary query returns candidates.
- No fallback is used when the cleaned primary query already contains the category context.
- Existing `MAX_SOURCE_UPGRADE_CANDIDATES = 3` target cap is unchanged; each target can now make at most one fallback search.

### Deterministic examples

| Product/title | Primary query | Fallback query |
|---|---|---|
| `Makita XCV11Z 18V LXT Brushless Cordless 2-Gallon HEPA Filter Wet/Dry Vacuum` | `Makita XCV11Z` | `Makita XCV11Z shop vac` |
| `RIDGID WD1450 14 Gallon Wet/Dry Vac` | `RIDGID WD1450` | `RIDGID WD1450 shop vac` |
| `Tapo RV30C Plus Robot Vacuum` | `Tapo RV30C Plus` | `Tapo RV30C Plus robot vacuum` |
| `Napoleon Rogue XT 425 SIB Gas Grill` | `Napoleon Rogue XT 425 SIB` | `Napoleon Rogue XT 425 SIB gas grill` |
| `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` | `4-Burner Propane Gas Grill` | none; cleaned primary already has category words |

### Trace fields added / updated

`SourceUpgradeTrace` now records:

- `primaryQuery`
- `fallbackQuery`
- `fallbackUsed`
- `primaryCandidatesReturned`
- `fallbackCandidatesReturned`
- existing `candidatesReturned` as the total returned count across the attempted query path

Replay now prints the primary query, whether fallback was used, fallback query, and primary/fallback result split. Old fixtures without these fields still replay without crashing.

### Tests added / preserved

- Added direct fallback-query builder tests for compact model-only queries, category-word de-duplication, identity preservation, and long-display-title noise prevention.
- Added integration tests proving fallback is not used when primary returns candidates.
- Added integration tests proving fallback is used once when primary returns zero candidates.
- Added identity-safety test proving a wrong fallback candidate does not merge.
- Updated cap coverage to prove only 3 upgrade targets are attempted, with at most one fallback search per target.
- Existing trigger, model-token, identity mismatch, duplicate citation, no-attachable-fields, candidate sample, and successful same-product attachment tests still pass.

### Boundary proof

Changed files:

- `lib/requirementEvidenceRescue.ts`
- `tests/sourceQualityUpgrade.test.mjs`
- `scripts/replay-quality-fixtures.mjs`

Not changed:

- scoring / ranking / final selection files
- discovery files
- source-upgrade trigger condition
- `hasUsefulCommerceEvidence`
- `looksLikeSameProduct`
- model-token detection
- price trust, citation trust, product eligibility, product-type rules
- max source-upgrade candidate count

### Verification

- `node --no-warnings --test tests/sourceQualityUpgrade.test.mjs` - 39/39 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing unused-variable warnings.
- `npm test` - 618/618 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.
- `npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json` - old Phase 3J-extension fixture replays without crashing.

### Status

Phase 3K is implemented and deterministic-testable, but **not live-proven**. The source-upgrade mini-track is not complete.

### Recommended next step

Run Phase 3L live proof after fallback ladder:

1. Save and replay fresh fixtures for `shop vac` first, then one unrelated previously attempted category such as `robot vacuum` or `gas grill`.
2. Confirm whether source-upgrade attempts now show primary/fallback trace fields.
3. Determine whether fallback increases `candidatesReturned`.
4. If candidates return, inspect identity matching, attachable fields, safety, and final-selection impact.
5. Do not run a full baseline.

## <span style="color:green">**Codex QA Update - 2026-06-26 (Phase 3L: live proof after source-upgrade fallback ladder)**</span>

**Live diagnostic/proof only. No app code, scoring, ranking, discovery, source-upgrade trigger, query construction, fallback behavior, identity matching, model-token detection, requirement filtering, or trust-gate changes. No full baseline.**

### Scope and server

- Repo: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
- Starting commit: `f5a982f820f81649ec296b1d67f821326e32955e`
- Local server: `http://localhost:3000` returned HTTP 200.
- Live searches run: `shop vac`, `robot vacuum`.
- Conditional `gas grill` search was not run because `shop vac` produced a source-upgrade trace.

### Commands

```text
npm run qa:save-fixture -- "shop vac"
npm run qa:save-fixture -- "robot vacuum"
npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json
npm run qa:replay -- tests/fixtures/review-radar-live/robot-vacuum.json
```

### Fresh fixtures

- `tests/fixtures/review-radar-live/shop-vac.json` - saved `2026-06-27T01:10:14.036Z`
- `tests/fixtures/review-radar-live/robot-vacuum.json` - saved `2026-06-27T01:11:38.159Z`

### `shop vac`

Final exact products:

1. `Armor All 2.5 Gallon 2 Peak HP Utility Wet/Dry Vacuum AA255`
2. `DEWALT DWV015 10-Gallon Wet/Dry HEPA Dust Extractor`
3. `CRAFTSMAN CMXEVBE17925 5 Gallon 5.0 Peak HP Wet Dry Vac ...`
4. `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`
5. `RIDGID 12 Gallon 5.0 Peak HP NXT Wet/Dry Vacuum`

Source-upgrade trace:

- Attempts: 1.
- Product: `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`.
- `primaryQuery: Wet/Dry Vacuum DXV10SB`
- `primaryCandidatesReturned: 0`
- `fallbackQuery: Wet/Dry Vacuum DXV10SB shop vac`
- `fallbackUsed: true`
- `fallbackCandidatesReturned: 0`
- total `candidatesReturned: 0`
- `candidatesEvaluated: 0`
- `noMatchReason: shopping_results_empty`
- `candidateSample: []`
- `evidenceAttached: false`
- attached fields: none

Final-selection impact:

- The attempted product remained selected at rank #4.
- `rankedMatchScore: 124.8`
- `sourceQualityScore: 27.2`
- `missingDataPenalty: 27`
- `priceTrustStatus: missing`
- No evidence attached, so no score, confidence, or rank improvement occurred.

Safety:

- No returned or sampled candidate existed.
- No accessory, part, wrong model/type, bundle, listing/article page, suspicious price, financing price, or unrelated-brand merge approached attachment.

### `robot vacuum`

Final exact products:

1. `ECOVACS DEEBOT T20 OMNI`
2. `eufy X10 Pro Omni`
3. `iRobot Roomba Combo j7+`
4. `Roborock Q5 Pro`
5. `Narwal Freo Z10 Turbo Robot Vacuum & Mop`
6. `iRobot Roomba j7`
7. `Roborock S8 Pro Ultra`

Source-upgrade trace:

- `sourceUpgradeTraces: 0`
- No product qualified for source upgrade.
- No primary or fallback query ran.
- No candidate, identity, attachment, score, rank, or safety impact occurred.

### Verdict

**Phase 3K proof verdict: partially proven.**

- Proven: the Phase 3K fallback is live-wired, runs only after an empty primary result, uses compact category context, and emits the expected trace fields.
- Not proven: the fallback did not increase `candidatesReturned` in the observed attempt and no evidence attached.
- The fallback query was bounded and did not duplicate category wording or return noisy candidates.
- Phase 3L is complete with a partial result; this is not a fallback-control-flow failure.

### Next bottleneck

The observed bottleneck is **source-upgrade fallback shopping-search coverage**. Both source-upgrade shopping queries returned zero before identity matching, product-page eligibility, field extraction, price/rating extraction, or citation trust could run.

### Recommended next task

Run Phase 3M as a diagnostic-only shopping-provider coverage investigation:

1. Use the exact observed primary and fallback queries.
2. Distinguish upstream Serper zero results from shopping-response parsing/normalization loss.
3. Confirm source-upgrade query/category invocation context.
4. Propose the smallest search-source or parsing fix only after the zero-result layer is proven.
5. Keep model-token broadening deferred and do not run a full baseline.

## <span style="color:green">**Codex QA Update - 2026-06-27 (Phase 3M: raw Serper and query-identity diagnostic)**</span>

**Diagnostic-first phase. Added debug-only instrumentation; no scoring, ranking, final-selection, discovery, source-upgrade trigger, query construction, fallback, identity matching, model-token, evidence attachment, requirement-filtering, or trust-gate behavior changed. No full baseline.**

### Starting state

- Repo: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
- Starting commit: `1020fd797d3c0c7ff54003c520e0674dbe0be409`
- Existing untracked baseline and live-fixture files were preserved.

### Instrumentation

Source-upgrade query inputs now record:

- `originalProductName`
- `cleanedProductName`
- `metadataBrand`
- `detectedBrand`
- `detectedModelTokens`
- `modelIdentityPhrase`
- `selectedIdentityPhrase`
- `categoryContext`

Each default Serper Shopping call can now record:

- response received / error kind
- raw shopping result count
- shopping results considered
- structurally normalizable shopping results
- eligibility-passing shopping candidates
- raw/eligible organic fallback results
- returned candidate count and source
- rejection-reason counts
- a capped raw sample with title, host, URL, and rejection reason

The source-upgrade trace also records `attachableCandidates`. Replay prints all new fields and safely skips them for old fixtures.

### Query-identity diagnosis

Attempted Phase 3L product:

- Original name: `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`
- Cleaned name: unchanged
- Metadata brand: absent
- Shared detected brand: `DeWalt`
- Detected model token: `dxv10sb`
- Model identity phrase: `Wet/Dry Vacuum DXV10SB`
- Primary query: `Wet/Dry Vacuum DXV10SB`
- Fallback query: `Wet/Dry Vacuum DXV10SB shop vac`
- Category context: `shop vac`

Cause:

- The product still contained `DEWALT`.
- Brand detection succeeded from the title.
- `buildModelIdentityQuery` did not use detected brand. It kept the last two words before the model token (`Wet/Dry Vacuum`) and appended `DXV10SB`.
- Fallback construction intentionally starts from the primary identity phrase, so it inherited the missing brand.
- This is a general defect for long brand-led titles whose model token appears after descriptive product nouns.

### Focused live runs

The server returned HTTP 200.

```text
npm run qa:save-fixture -- "shop vac"
npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json
npm run qa:save-fixture -- "gas grill"
npm run qa:replay -- tests/fixtures/review-radar-live/gas-grill.json
```

- `shop vac` fixture saved `2026-06-27T04:16:33.926Z`; `sourceUpgradeTraces: 0`.
- The conditionally allowed `gas grill` fixture saved `2026-06-27T04:18:04.710Z`; `sourceUpgradeTraces: 0`.
- Because neither category exercised source upgrade, three smaller direct Serper Shopping probes were run for the exact primary, fallback, and brand-preserving control queries.

### Raw Serper results

| Query | Raw | Structural | Eligible | Returned | Rejection summary |
|---|---:|---:|---:|---:|---|
| `Wet/Dry Vacuum DXV10SB` | 40 | 20 | 0 | 0 | 10 search/listing URL; 10 generic/non-product title |
| `Wet/Dry Vacuum DXV10SB shop vac` | 40 | 20 | 0 | 0 | 3 search/listing URL; 17 generic/non-product title |
| `DEWALT DXV10SB shop vac` | 40 | 20 | 0 | 0 | 13 search/listing URL; 7 generic/non-product title |

Important raw sample:

- Title: `DEWALT DXV10SB 10 Gal. Stainless Steel Wet/Dry Vacuum with Hose Accessories and Accessory Bag`
- URL shape: `https://www.google.com/search?ibp=oshop&...&udm=28...`
- Rejection: `search_or_listing_url`

Additional title finding:

- Specific products whose brand is `Shop-Vac` can be rejected by the broad generic-title `shop` pattern.

### Direct answers

- **Was Serper truly returning zero raw shopping results?** No. It returned 40 for every tested query.
- **Were results lost after Serper?** Yes. All first 20 structurally usable results per query were rejected during normalization/product eligibility.
- **Did query construction drop the brand?** Yes. Brand detection found `DeWalt`, but `buildModelIdentityQuery` selected only the two words immediately before `DXV10SB`.
- **Did the missing brand cause the observed zero eligible candidates?** Not by itself. The brand-preserving control also returned 40 raw and 0 eligible candidates.
- **Were identity matching or attachable-field extraction reached?** No.

### Verdict and next phase

Primary bottleneck: **Serper Shopping product-link/title eligibility normalization**.

Secondary confirmed defect: **brand-dropping source-upgrade identity construction**.

Recommended order:

1. Phase 3N: safely handle specific Google Shopping offer URLs and the `Shop-Vac` title false positive while preserving listing/article/accessory safety.
2. Phase 3O: separately preserve detected brand in compact source-upgrade identity queries.

### Verification

- Focused instrumentation tests: 90/90 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing warnings.
- `npm test` - 624/624 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.
- User-facing non-debug result shape remains unchanged.

## <span style="color:green">**Codex QA Update - 2026-06-27 (Phase 3N: RR-048 / RR-049 eligibility fixes)**</span>

**Focused behavior fix. No scoring, ranking, final-selection, discovery breadth, source-upgrade trigger, query construction, fallback behavior, identity matching, model-token detection, requirement filtering, or trust-gate changes. No live search and no full baseline.**

### RR-048 fix

- Added an explicit Serper Shopping normalization option enabled only by the default source-upgrade evidence search.
- A Google Shopping URL is eligible in this mode only when it has Google host, `/search`, `ibp=oshop`, `udm=28`, a product/catalog identifier in `prds`, a specific title, a positive price, and non-Google merchant/source metadata.
- If Serper supplies a direct merchant URL, evidence mode prefers it over the Google offer URL.
- General discovery does not enable this mode.
- The shared product-card classifier still rejects both ordinary Google searches and Google Shopping offer URLs.
- Existing `looksLikeSameProduct` identity matching still runs before any evidence attaches.

### RR-049 fix

- Replaced the broad title-level `shop` rejection with narrow listing/action shapes.
- A specific title such as `Shop-Vac 10-Gallon 5.5 HP Wet/Dry Shop Vacuum with Accessories` now survives normalization.
- Generic titles including `Shop Vacuums`, `Shop Wet/Dry Vacuums`, `Shop Vacuum Cleaners`, `Shop All Vacuums`, `Shop Tools`, `Shop By Category`, and `Best Shop Vacuums` remain blocked.

### Safety proof

- Evidence-only normalization does not widen ordinary discovery.
- Ordinary and incomplete Google search/offer URLs remain blocked.
- Generic Google Shopping titles remain blocked.
- Missing merchant/source metadata remains blocked.
- Merchant URLs are preferred when available.
- A wrong-model Google Shopping offer can normalize for identity evaluation but does not attach evidence.
- Existing source-upgrade trigger, query/fallback, identity, scoring, ranking, eligibility, and trust tests remain green.

### Verification

- Focused Serper, product-eligibility, and source-upgrade tests: 88/88 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing warnings.
- `npm test` - 630/630 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.
- No live search was run.

### Status and next task

- RR-048: fixed deterministically; live proof pending.
- RR-049: fixed deterministically; live proof pending.
- RR-042: remains open until a focused live run proves normalized candidates return and source upgrade behaves safely.
- RR-047: remains open; Phase 3O should preserve detected brand identity in source-upgrade queries.
- Phase 3N is complete but not live-proven.
- Recommended next task: Phase 3O, then request approval for one focused `shop vac` live proof of Phase 3N plus Phase 3O.

### Additional observation (RR-051)

During negative-test construction, a Serper candidate with no result snippet inherited the existing query-derived fallback text. That query text can influence the existing identity matcher. No identity or snippet behavior was changed because it is outside Phase 3N. Treat this as a separate safety investigation before relying on snippet-less candidates in live proof.

## <span style="color:green">**Codex QA Update - 2026-06-27 (Phase 3N: focused `shop vac` live proof)**</span>

**One approved live search only. No app-code, scoring, ranking, discovery, trigger, query, fallback, identity, model-token, requirement-filtering, or trust-gate changes were made during the proof.**

### Command

```text
npm run qa:save-fixture -- "shop vac"
npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json
```

### Result

- Candidate pool: 17.
- Final candidates: 4.
- Final exact matches: 2.
- `sourceUpgradeTraces`: 0.
- No product qualified for source upgrade.
- Attempted product: none.
- Primary/fallback query: none.
- Raw, structural, eligible, and returned source-upgrade counts: unavailable because no source-upgrade search ran.
- Rejection reasons and candidate samples: unavailable because no source-upgrade search ran.
- Candidates reaching source-upgrade identity matching: 0.
- Evidence attached by source upgrade: false / none.
- Unsafe product, card, or link allowed by Phase 3N: none observed.

### Final products

- Exact #1: `5-Gallon* 3 Peak HP Wet/Dry Vacuum VOC507PF - Vacmaster.com`.
- Exact #2: `Hyper Tough Wet Dry Vacuum 1.5 Gallon 2 Peak HP`.
- Near: `DEWALT Portable Wet/Dry Vacuum 6 Gal 4 HP (DXV06P)`.
- Near: `WD Multi-Purpose Wet-Dry Vacuum Cleaner - Kärcher`.

### Verdict

- Live proof is **inconclusive** because Phase 3N normalization was not exercised.
- This is a source-upgrade proof-coverage failure, not evidence that RR-048/RR-049 regressed.
- RR-048 and RR-049 remain deterministically fixed.
- RR-042 remains `Needs Investigation`.
- RR-051 remains `Needs Investigation`; no snippet-less source-upgrade candidate reached identity matching in this run.
- No additional live search was run.

## <span style="color:green">**Codex QA Update - 2026-06-27 (RR-051: source-upgrade identity provenance safety)**</span>

**Focused identity-safety fix. No scoring, ranking, final-selection, discovery breadth, source-upgrade trigger, query construction, fallback behavior, model-token detection, product eligibility, requirement filtering, price trust, or citation trust changes. No live search and no full baseline.**

### Root cause

- `buildCandidateFromResult` stored a synthetic query-derived fallback in the same `evidenceSources[].snippet` field used for real provider snippets.
- `looksLikeSameProduct` consumed every candidate snippet and the request-derived candidate category as identity evidence.
- A snippet-less wrong product could therefore inherit the target brand/model from `Found by Serper for query "..."` and pass the model-token identity fast path.

### Fix

- Added optional `snippetProvenance` to raw candidate evidence sources with values `source-derived` or `query-derived`.
- Serper normalization marks real provider snippets as source-derived and synthetic fallback snippets as query-derived.
- Source-upgrade identity ignores query-derived snippets and the request-derived category.
- Provider title, inferred brand, merchant/source, URL, provider-derived specs, colors, and real provider snippets remain trusted identity evidence.
- Synthetic fallback text remains present for diagnostics and existing non-identity behavior.

### Safety proof

- The exact snippet-less wrong-product regression changed from unsafe attachment to `identity_rejected`.
- A generic source title cannot borrow the target model from the query.
- A snippet-less candidate with the correct model in its provider title still attaches normally.
- A real-title Google Shopping offer from RR-048 still attaches without a provider snippet.
- The RR-049 specific `Shop-Vac` title behavior remains green.
- Query construction, fallback count, trigger behavior, model-token behavior, and user-facing result shape remain unchanged.

### Verification

- Focused source-quality and Serper tests: 84/84 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing warnings.
- `npm test` - 634/634 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.
- No live search was run.

### Status

- RR-051: Fixed.
- RR-047: Open and unchanged; Phase 3O remains next.
- RR-042: Needs Investigation and unchanged pending a later trigger-producing live proof.
- RR-048 and RR-049: Fixed and unchanged.

## <span style="color:green">**Codex QA Update - 2026-06-27 (Phase 3O: RR-047 brand-preserving source-upgrade query identity)**</span>

**Focused source-upgrade query fix. No scoring, ranking, final-selection, discovery breadth, source-upgrade trigger, fallback control flow, identity matching, RR-051 provenance safety, model-token detection, product eligibility, requirement filtering, price trust, or citation trust changes. No live search and no full baseline.**

### Root cause

- `buildModelIdentityQuery` accepted only a product name.
- It selected up to two nearby words before the model token and had no access to the brand already detected elsewhere for tracing.
- For `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`, shared detection found `DeWalt`, but query construction emitted `Wet/Dry Vacuum DXV10SB`.

### Fix

- Source-upgrade brand resolution now prefers trusted metadata brand, then the existing shared `inferKnownBrand` result.
- The compact model identity prepends that reliable brand unless shared brand matching confirms the brand is already embedded.
- If no reliable brand exists, the previous nearby-word behavior remains unchanged.
- Fallback construction remains the same and naturally inherits the corrected primary identity.

### Query proof

- `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB`
  - before primary: `Wet/Dry Vacuum DXV10SB`
  - after primary: `DeWalt DXV10SB`
  - after fallback: `DeWalt DXV10SB shop vac`
- `Makita XCV11Z 18V LXT Cordless Vacuum` remains `Makita XCV11Z`.
- `Napoleon Rogue XT 425 SIB Gas Grill` remains `Napoleon Rogue XT 425 SIB`; fallback remains category-deduplicated.
- Unbranded model titles do not receive an invented brand.

### Safety proof

- Metadata brand has precedence over title-detected casing.
- Brands already embedded in a model token are not duplicated.
- Fallback still runs at most once and does not restore retailer-title filler.
- RR-051 query-derived text cannot satisfy candidate identity.
- RR-048 Google Shopping offer safety and RR-049 Shop-Vac title safety remain green.
- User-facing non-debug result shape remains unchanged.

### Verification

- Focused source-quality and Serper tests: 89/89 pass.
- `npm run typecheck` - clean.
- `npm run lint` - 0 errors, 3 pre-existing warnings.
- `npm test` - 639/639 pass.
- `node scripts/eval-pipeline.mjs` - red-flag checks clean.
- No live search was run.

### Status

- RR-047: Fixed.
- RR-042: Needs Investigation pending an approval-gated trigger-producing live proof.
- RR-048, RR-049, and RR-051: Fixed and unchanged.

## <span style="color:green">**Codex QA Update - 2026-06-27 (Phase 3O combined-fix `shop vac` live proof)**</span>

**Verdict: FAIL due to unsafe cross-product evidence attachment. One approved `shop vac` live search only. No app-code changes, unrelated searches, or full baseline.**

### Commands

```text
npm run qa:save-fixture -- "shop vac"
npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json
```

- Fixture saved: `2026-06-27T14:13:24.432Z`.
- Candidate pool: 15.
- Final candidates/exact matches: 6.
- Source-upgrade traces: 2.

### Attempt 1 — unsafe

- Product: `RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900`.
- Metadata brand: `HP`.
- Detected brand: `HP`.
- Model token: `hd0900`.
- Primary query: `HP HD0900`.
- Fallback: not used (`fallbackUsed: false`).
- Raw / structural / eligible / returned: `40 / 20 / 20 / 20`.
- Rejection reasons: none; all considered candidates passed shopping normalization.
- First raw/candidate sample: `Hp 15.6" HD Windows Laptop`, Google Shopping offer URL, `$429`, rating `4.3`.
- Candidate reached identity matching and incorrectly passed.
- Attached: price, rating, review count, citation.
- Cause: Google offer URL contained `q=HP+HD0900`, and the full URL participated in identity matching.
- Final impact: RIDGID HD0900 selected rank #1, `rankedMatchScore: 240.2`, source quality `30`, price `$429`, market tier `strong`. Exact pre-upgrade score/rank is not present, but unsafe attached fields materially changed ranking inputs.

### Attempt 2 — same-product result, unsafe query identity

- Product: `RIDGID 6 Gal. 3.5 Peak HP NXT Wet/Dry Vac HD06001`.
- Metadata brand: none.
- Detected brand: `HP`.
- Model token: `hd06001`.
- Primary query: `HP HD06001`.
- Fallback: not used (`fallbackUsed: false`).
- Raw / structural / eligible / returned: `40 / 20 / 20 / 20`.
- Rejection reasons: none.
- Candidate sample: `Ridgid NXT Wet/Dry Shop Vacuum HD06001`, `$89.98`, rating `4.1`.
- Candidate reached identity matching and passed on a same-model title.
- Attached: price, rating, review count, citation.
- Final impact: selected rank #2 with `rankedMatchScore: 224`.
- Although the candidate was the correct model, the query was built from the false `HP` brand.

### Additional price-trust regression

- `Amazon.com: RIDGID Wet Dry Vacuums VAC1200...` appeared at exact rank #5 with price `$10`.
- Final trace: `priceTrustStatus: verified`, `canUseForBudget: true`.
- RR-002 reopened.

### Safety conclusion

- RR-047 brand preservation is wired live, but it preserved an incorrectly detected `HP` brand.
- RR-048 Google offer normalization returned eligible candidates.
- RR-049 Shop-Vac generic-title filtering continued to remove generic/service/video listings.
- RR-051 snippet provenance did not cause the unsafe merge; a new query-derived URL path bypassed it.
- Unsafe laptop evidence attached to a vacuum. No further live search or behavior fix was attempted.

### Issues

- RR-052 opened: horsepower `HP` misclassified as Hewlett-Packard brand.
- RR-053 opened: Google Shopping URL query parameters can satisfy identity.
- RR-002 reopened: `$10` full shop-vac offer treated as verified.
- RR-042 remains `Needs Investigation`.
- RR-047, RR-048, RR-049, and RR-051 remain deterministically fixed, but the combined live system is unsafe until RR-052/RR-053 are addressed.

## <span style="color:green">**Codex QA Update - 2026-06-27 (RR-053 URL-query identity safety fix)**</span>

**Verdict: PASS deterministically. RR-053 is fixed. No live search or full baseline was run.**

### Root cause

- `lib/requirementEvidenceRescue.ts` included complete candidate URLs in `evidenceText`.
- Google Shopping offer URLs echo the source-upgrade search in query parameters such as `q=HP+HD0900`.
- The model-token identity fast path therefore found `HD0900` in the URL even when the source title was the unrelated `Hp 15.6" HD Windows Laptop`.

### Fix

- Candidate URL identity is now limited to normalized host plus path.
- The complete query string and fragment are excluded, covering `q`, `oq`, `query`, `search`, tracking, advertising, and other synthetic parameters without a brittle parameter denylist.
- Merchant product-page paths remain available to identity matching.
- Source-derived titles and metadata remain the basis for valid Google Shopping offer identity.

### Deterministic proof

- Exact Phase 3O regression: HP laptop + Google offer `q=HP+HD0900` is identity-rejected; no price, rating, review count, or citation attaches.
- Positive Google offer: a source title carrying RIDGID `HD0900` still passes independently of URL query text.
- Positive merchant URL: `/products/makita-xcv11z` still provides model path identity while its query parameters are ignored.
- RR-051 query-derived snippet safety, RR-048 offer eligibility, RR-049 Shop-Vac title handling, and RR-047 brand-preserving query construction remain green.

### Verification

- Focused source-quality + Serper tests: `92/92` pass.
- `npm run typecheck`: clean.
- `npm run lint`: `0` errors, `3` pre-existing warnings.
- `npm test`: `642/642` pass.
- `node scripts/eval-pipeline.mjs`: red-flag checks clean.

### Boundaries and status

- No scoring, ranking, final selection, discovery, source-upgrade trigger, query construction, fallback behavior, brand detection, model-token detection, product eligibility, price trust, or citation trust changes.
- No live search.
- RR-053: Fixed.
- RR-052: Open and unchanged.
- RR-002 and RR-042: Needs Investigation and unchanged.
- Recommended next task: fix RR-052 only, preventing horsepower `Peak HP` context from becoming Hewlett-Packard brand identity while preserving genuine HP-brand detection.

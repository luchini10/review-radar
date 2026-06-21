# Review Radar QA Loop Results

Date: 2026-06-18
Repo: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
Source-of-truth map: `ReviewRadar-Overview.md`

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

# Review Radar QA Loop Results

Date: 2026-06-18
Repo: `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
Source-of-truth map: `ReviewRadar-Overview.md`

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

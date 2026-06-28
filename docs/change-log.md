# ReviewRadar Change Log

Plain-English record of meaningful ReviewRadar changes.

Update this file after:
- major pipeline changes
- ranking/search/evidence changes
- UI feature changes
- important bug fixes
- live QA fixes worth remembering

Do not update this file for tiny typo fixes, formatting-only edits, or internal cleanup that does not change behavior.

## 2026-06-28

### Codex - Phase 5C cross-category tiny-price trust
- Fixed RR-002 after reproducing current `verified`/budget-usable `$10` behavior from saved `shop vac`, `dash cam`, and `wireless earbuds` products.
- Root cause: those contexts had no class floor, while the shared absolute floor was exactly `$10`; the inclusive plausibility check accepted the offer and strong retailer metadata promoted it to `verified`.
- Expanded the existing shared class-sensitive floor to normalize plural/wet-dry/shop-vac wording and cover dash-camera and wireless-earbud full-product classes. No source-specific or product-specific rule was added.
- Reproduced `$10` offers now return `suspicious`, no trusted price, `canUseForBudget: false`, and cannot remain exact Best Matches. Product assets show `Price not verified`.
- Preserved RR-001 full-size appliance floors, RR-003 installment parsing, the global `$10` absolute floor, plausible `$12.99` wireless earbuds, specific text-price budget behavior, and all non-price pipeline behavior.
- Verification: focused price/assets/scoring/requirements tests 116/116; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 665/665; eval red-flag checks clean.
- Frozen fixture replay retained the historical bad outputs, while current-code reassessment changed all three saved `$10` products to suspicious and exact-ineligible.
- Three approved fresh searches found no `$10` exact match. Opened RR-062 after `dash cam` verified VIOFO A229 Pro at a malformed `$19,999`; no RR-062 fix was attempted.

## 2026-06-27

### Codex - Phase 5B source-upgrade identity coverage
- Fixed RR-052 by making the shared HP alias context-sensitive: explicit horsepower uses no longer become Hewlett-Packard brand evidence, while genuine HP computer titles remain supported.
- Source upgrade now disregards ambiguous `metadataBrand: HP` when the title proves it is a measurement and falls back to structural leading-title brand identity.
- Fixed RR-057 by ranking compact manufacturer IDs above separated unit-number phrases and suppressing AMP, MPH, CFM, HP, PSI, GPM, BTU, voltage, capacity, and similar measurement tokens.
- Fixed RR-034/RR-035/RR-044 by supporting mixed word-number series, brand-qualified descriptive families, numeric-dash models, and short brand-qualified family tokens.
- Family-strength identities such as `M18 FUEL` can trigger an upgrade search but cannot satisfy same-product attachment without source-derived requested-category evidence. Different explicit same-family and numeric-dash models remain blocked.
- Preserved Phase 5A RR-058, RR-048/RR-049/RR-051/RR-053, exact model/path identity, trigger/fallback limits, scoring/ranking, price/citation trust, and normal result shape.
- Verification: focused source/brand/type/identity/Serper/requirement tests 183/183; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 660/660; eval red-flag checks clean.
- No live search or full baseline was run.

### Codex - Phase 5A source-upgrade safety hardening
- Fixed RR-058, where repeated same-brand tokens could let a Whynter wine-refrigerator offer pass source-upgrade identity for an RPD-411WG dehumidifier and attach price, rating, review count, and citation evidence.
- Source-upgrade identity now checks the shared product-type verdict before model/token overlap acceptance. Explicit wine/beverage refrigerator evidence conflicts with a dehumidifier request even when model extraction is absent or incomplete.
- Added a bounded same-family model conflict check so an explicit candidate model such as `RPD-561EGP` cannot satisfy a target such as `RPD-411WG` through broad shared title words.
- Preserved exact model matches, valid same-brand same-product offers, merchant model paths, sparse candidates without an explicit conflict, and titles containing uppercase measurement text such as `765 CFM`.
- Did not change source-upgrade trigger/fallback/query construction, scoring, ranking, discovery queries, product eligibility, price/citation trust, or requirement gates.
- Verification: focused identity/source-quality tests 170/170; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 647/647; eval red-flag checks clean.
- No live search or full baseline was run.

### Codex - Phase 4F broad rotating quality sweep / Phase 4 complete
- Ran ten approved live searches across coffee makers, office chairs, wireless earbuds, electric toothbrushes, leaf blowers, dog food, dehumidifiers, dash cams, treadmills, and gaming monitors.
- Opened RR-057 through RR-061 for measurement-token query identity, unsafe same-brand cross-product source upgrade, broad-query form-factor dominance, true same-model duplicates, and invalid/irrelevant image assets.
- RR-058 is the critical finding: wine-refrigerator evidence attached to Whynter RPD-411WG dehumidifier and helped it rank #1.
- Added broad evidence to price trust, product eligibility/type, citation loss, weak winners, run variance, and final-family concentration.
- Phase 4 ended with 61 issues: 13 Open, 13 Needs Investigation, 34 Fixed, 1 Won't Fix.
- No app code, tests, fixtures, scoring, ranking, discovery, identity, trust, eligibility, or UI behavior changed.

### Codex - Phase 4E market-leader discovery and citation diagnostics
- Ran five approved live searches: `robot vacuum`, `gas grill`, `cordless drill`, `air purifier`, and `running shoes`.
- Reopened RR-014 after the four benchmarked categories averaged only `3.0/7` core leader families in final results.
- Reopened RR-022 after Ecovacs and Char-Broil leader products were again dropped at citation verification.
- Opened RR-056 after repeated same-brand/model-family concentration consumed four or five final slots.
- Confirmed RR-013 with retailer-only winners outranking independently supported alternatives; running shoes was a positive-control category with strong editorial coverage.
- No app code, tests, discovery, citation, diversity, scoring, ranking, or behavior changed.

### Codex - Phase 4D product-type leakage and requirement diagnostics
- Ran four approved live searches: `robot vacuum`, `basketball hoop`, `air purifier`, and `portable generator`.
- Opened RR-054 after a fresh Serper-fallback debug response omitted stage-funnel, source-upgrade, and final-selection traces.
- Opened RR-055 after `Generac GP3300i Portable Inverter Generator` falsely failed the literal `Portable` requirement.
- Reopened RR-009 after a `device.report` documentation page reached exact rank #4 for air purifiers.
- Added cross-category evidence to RR-007/RR-017/RR-043: category pages, wall art, power stations, and a washer/dryer survived into exact or near scoring.
- No app code, tests, product-type rules, requirement logic, ranking, or behavior changed.

### Codex - Phase 4C price trust and fake-low price diagnostics
- Ran three approved live searches: `shop vac`, `cordless drill`, and `pressure washer`.
- Reproduced RR-002 on a different product: a Vacmaster 1.5-gallon wet/dry vacuum received a `$10` Amazon retailer-page offer, `priceTrustStatus: verified`, `canUseForBudget: true`, and exact rank #7.
- Reviewed the other low/verified prices; they were plausible full-product or kit prices, and no installment amount appeared.
- Reconfirmed RR-052 through `HP WD4522` and `HP SL18199P` source-upgrade queries.
- Added product-type/non-product evidence to RR-007, RR-008, and RR-017 after pressure-washer detergent, an advice article, a category page, and dishwashers survived downstream.
- No app code, tests, scoring, ranking, price trust, or behavior changed.

### Codex - Phase 4B source-upgrade safety and reliability diagnostics
- Ran three approved live searches: `shop vac`, `robot vacuum`, and `gas grill`.
- Source upgrade fired only for `gas grill`; its one primary query returned 2 raw/structural/eligible/normalized Google Shopping offers and attached price plus citation to a matching Thermador range target.
- Confirmed RR-051/RR-053 live safety: a PLR-book offer whose URL echoed the target query was rejected as an identity mismatch.
- Reopened RR-007 after an MHP product-collection page reached exact rank #6.
- Reopened RR-008 after a Bissell troubleshooting article reached exact rank #6.
- Reopened RR-017 after a washer/dryer and a gas range/PDF survived downstream, with the range receiving source-upgrade evidence.
- RR-041/RR-042 remain under investigation; no app code, tests, scoring, ranking, or behavior changed.

### Codex - Phase 4A diagnostic issue-harvest setup
- Audited all 53 issue records before starting the Phase 4 live diagnostic track.
- Confirmed IDs are contiguous and unique, every record has the required schema, and severity/status totals reconcile.
- Documented related issue clusters without merging distinct failure layers.
- Added explicit Phase 4 status discipline: limited-sample absence does not close an issue.
- No app code, tests, fixtures, behavior, or live searches changed.

### Codex - RR-053: exclude URL queries from source-upgrade identity
- Fixed the unsafe Phase 3O merge where an HP laptop matched a RIDGID HD0900 vacuum only because a Google Shopping offer URL echoed `HP HD0900` in its `q` parameter.
- Same-product identity now uses only URL host and path; the entire query string and fragment are excluded, including search, tracking, and advertising parameters.
- Merchant product-page model paths remain usable, and valid Google Shopping offers can still pass through source-derived product titles and metadata.
- Added deterministic regressions for the exact HP-laptop rejection, valid Google source-title identity, and retained merchant-path identity.
- No scoring, ranking, discovery, source-upgrade query/fallback, trigger, brand detection, model-token, eligibility, price trust, or citation trust behavior changed.
- Verification: focused tests 92/92; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 642/642; eval red-flag checks clean.
- No live search was run. RR-053 is fixed; RR-052 is the next isolated safety fix, while RR-002 remains separate.

### Codex - Phase 3O focused live proof: unsafe result
- Ran exactly one approved `shop vac` save/replay after the RR-048, RR-049, RR-051, and RR-047 fixes.
- Two source-upgrade attempts fired, each returning 40 raw, 20 structural, 20 eligible, and 20 normalized candidates.
- `Peak HP` was misclassified as Hewlett-Packard brand, producing queries `HP HD0900` and `HP HD06001`.
- The first attempt incorrectly identity-matched an HP laptop because its Google Shopping URL echoed target model `HD0900` in the `q` parameter. Laptop price, rating, review count, and citation attached to a RIDGID vacuum.
- Opened RR-052 for ambiguous `HP` brand detection and RR-053 for query parameters contaminating URL identity evidence.
- Reopened RR-002 after a RIDGID VAC1200 appeared with a verified, budget-usable `$10` price.
- No app changes, additional live searches, or full baseline. The live fixture remains untracked.

### Codex - Phase 3O: brand-preserving source-upgrade query identity
- Fixed RR-047 by passing the existing metadata-first/shared detected brand into compact model query construction.
- Reliable brand is prepended to the model identity unless already present; unbranded products retain the existing nearby-word behavior.
- `DEWALT 10 Gallon Stainless Steel Wet/Dry Vacuum DXV10SB` now produces `DeWalt DXV10SB`, with fallback `DeWalt DXV10SB shop vac`, instead of brandless `Wet/Dry Vacuum DXV10SB`.
- Existing Makita, RIDGID, Napoleon, category-deduplication, long-title cleanup, and one-fallback behavior remain intact.
- No model-token, identity-matching, RR-051 provenance, scoring, ranking, trigger, eligibility, requirement-filtering, or trust behavior changed.
- Verification: focused tests 89/89; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 639/639; eval red-flag checks clean.
- No live search was run. RR-047 is fixed; RR-042 remains open pending an approval-gated focused live proof.

### Codex - RR-051: source-upgrade identity provenance safety
- Marked Serper candidate snippets as `source-derived` or `query-derived`.
- Source-upgrade same-product identity now ignores synthetic query-derived fallback snippets and the request-derived category, preventing the target query from supplying identity evidence to a returned candidate.
- Provider titles, inferred brand, merchant, URL, provider-derived specs, colors, and real provider snippets continue to participate in identity matching.
- Synthetic fallback text remains available for diagnostics and existing non-identity behavior.
- Added exact negative regressions plus positive same-model and Google Shopping offer boundaries.
- No query, fallback, trigger, model-token, eligibility, scoring, ranking, requirement-filtering, or trust-gate behavior changed.
- Verification: focused tests 84/84; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 634/634; eval red-flag checks clean.
- No live search was run. RR-051 is fixed; RR-047 remains the next Phase 3O target.

### Codex - Phase 3N: Google Shopping offer and Shop-Vac title eligibility
- Added an explicit source-upgrade evidence mode for narrowly identified Google Shopping offers. The URL must be a Google `/search` offer carrying `ibp=oshop`, `udm=28`, and a product/catalog identifier, and the result must also have a specific title, positive price, and merchant/source metadata.
- Kept general discovery and shared product-card eligibility unchanged: ordinary Google search pages, incomplete offer URLs, generic titles, and Google offer URLs used as product cards remain blocked.
- Prefer a supplied merchant product URL over the Google Shopping offer URL in source-upgrade evidence mode.
- Narrowed the generic `shop` title rule so specific `Shop-Vac` products survive while `Shop Vacuums`, `Shop All Vacuums`, `Shop By Category`, and similar listing titles remain blocked.
- Existing same-product identity matching still gates attachment. No scoring, ranking, final-selection, trigger, query/fallback, model-token, price-trust, citation-trust, or requirement-filtering behavior changed.
- Verification: focused tests 88/88; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 630/630; eval red-flag checks clean.
- One approved `shop vac` live proof was run. It produced `sourceUpgradeTraces: 0`, so the normalization change was not exercised. No unsafe candidate, card, link, identity evaluation, or evidence attachment appeared.
- RR-048 and RR-049 are deterministically fixed but not live-proven; RR-042 and RR-051 remain `Needs Investigation`, and RR-047 remains open for Phase 3O.

### Codex - Phase 3M: source-upgrade raw Serper and query-identity diagnostics
- Added debug-only source-upgrade query-input tracing for original/cleaned name, metadata/detected brand, model tokens, selected identity phrase, and category context.
- Added Serper Shopping diagnostics that distinguish raw results, structurally usable results, eligibility-passing candidates, organic fallback candidates, and final returned candidates. Rejection counts and capped raw samples explain normalization losses.
- Refactored the existing product-candidate boolean checks into equivalent rejection reasons without changing which candidates pass.
- Live diagnosis proved all three tested query forms returned 40 raw shopping results and 20 structurally usable results, but zero passed eligibility.
- A correct DEWALT result used a `google.com/search?ibp=oshop...` Google Shopping offer URL and was rejected as a search/listing URL. Specific `Shop-Vac` titles can also be rejected by the broad generic `shop` title rule.
- Separately confirmed that brand detection found `DeWalt`, but `buildModelIdentityQuery` dropped it by keeping only the two words before `DXV10SB`. Query behavior was not changed in this phase.
- No scoring, ranking, discovery, source-upgrade trigger, query/fallback, identity, extraction, or trust-gate behavior changed.
- Verification: focused tests 90/90; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 624/624; eval red-flag checks clean.

## 2026-06-26

### Codex - Phase 3K: source-upgrade query fallback ladder
- Added a bounded source-upgrade fallback query path in `lib/requirementEvidenceRescue.ts`: the compact Phase 3I identity query runs first, and a single broader identity-plus-category query runs only if the primary shopping search returns zero candidates.
- New fallback examples covered: `Makita XCV11Z` -> `Makita XCV11Z shop vac`; `RIDGID WD1450` -> `RIDGID WD1450 shop vac`; `Tapo RV30C Plus` -> `Tapo RV30C Plus robot vacuum`; `Napoleon Rogue XT 425 SIB` -> `Napoleon Rogue XT 425 SIB gas grill`.
- Added trace fields for `primaryQuery`, `fallbackQuery`, `fallbackUsed`, `primaryCandidatesReturned`, and `fallbackCandidatesReturned`; replay now prints the query split while remaining compatible with old fixtures.
- No changes to scoring, ranking, discovery, source-upgrade trigger logic, `hasUsefulCommerceEvidence`, identity matching, model-token detection, product-type rules, price trust, citation trust, product eligibility, or max source-upgrade target count.
- Added deterministic tests in `tests/sourceQualityUpgrade.test.mjs`; `npm test` is 618/618 green and eval red-flag checks are clean. Phase 3K is implemented but not live-proven. Next step is Phase 3L live proof.

### Codex - Phase 3I Path A: source-upgrade query construction
- Added a source-upgrade-specific shopping query builder in `lib/requirementEvidenceRescue.ts` so source-quality upgrade searches use concise product identity instead of long display titles plus duplicated category suffixes.
- Existing general missing-evidence rescue still uses `buildRescueShoppingQuery`; only `upgradeWeakSourceEvidence` now uses the new source-upgrade query builder.
- Query examples now covered: `Napoleon Rogue XT 425 SIB Gas Grill` -> `Napoleon Rogue XT 425 SIB`; `4-Burner Propane Gas Grill in Black with Stainless Steel Main Lid` -> `4-Burner Propane Gas Grill`; `Makita XFD131 18V LXT Cordless Drill` -> `Makita XFD131`; `Tapo RV30C Plus Robot Vacuum` -> `Tapo RV30C Plus`.
- No changes to scoring, ranking, final selection, discovery breadth, source-upgrade trigger conditions, `hasUsefulCommerceEvidence`, identity matching, model-token detection, product-type rules, price trust, citation trust, product eligibility, or same-product merge safety.
- Added deterministic tests in `tests/sourceQualityUpgrade.test.mjs`; `npm test` is 611/611 green and eval red-flag checks are clean. Phase 3I is implemented but not live-proven. Next step is Phase 3J focused live proof.


### 🟩 Claude — Phase 3G: Source-upgrade search-result diagnostics (debug-only, no behavior change)
- Extended `SourceUpgradeTrace` in `lib/requirementEvidenceRescue.ts` with 4 new diagnostic fields: `candidatesReturned`, `candidatesEvaluated`, `noMatchReason`, `candidateSample`.
- New exported type `SourceUpgradeCandidateSample` (name, host, price, rating, identityMatch, rejectionReason).
- `noMatchReason` takes one of three values: `"shopping_results_empty"` (Serper returned 0), `"identity_rejected"` (candidates returned but none passed `looksLikeSameProduct`), or `"no_attachable_fields"` (identity passed but no price/rating/citation/image to attach). Absent when `evidenceAttached = true`.
- `candidateSample` records up to 5 candidates with per-candidate rejection reason (`"identity_mismatch"`, `"no_attachable_fields"`, or `null` for the winning match).
- Updated `scripts/replay-quality-fixtures.mjs` `printSourceUpgradeTraces` to display new fields; degrades gracefully for pre-3G fixtures that lack the fields.
- No changes to trigger logic, scoring, ranking, identity matching, query construction, price trust, or citation trust.
- 5 new tests in `tests/sourceQualityUpgrade.test.mjs`; total suite 605/605 green. TypeScript clean.

## 2026-06-25

### 🟩 Claude — Phase 3C: Fuel-type requirement alias expansion for category matching
- `checkCategory` in `lib/requirementValidation.ts` used raw query words ("gas", "grill") to verify product type. Products described only as "propane grills" don't contain the word "gas", so they landed in `unknownRequirements` → excluded from exact-scored pool → dropped when 7 exact matches already existed.
- Fix: `categoryTerms()` now accepts `extractedRequirements` and expands each term group with aliases from any `requiredConstraint` whose value or aliases match that term. For gas grill queries the "gas" requirement carries aliases including "propane" and "natural gas", so a product described only as "propane" now passes the category check.
- Safety: both term groups still required ("grill" unaided by gas aliases), so a propane heater cannot satisfy "gas grill". Butane remains unmatched. 3-state verdict logic and requirement-checking unchanged.
- 4 new deterministic tests (propane-passes, backward-compat, butane-boundary, gas-in-name fast path). 568/568 tests pass. TypeScript clean.

### 🟩 Claude — Phase 3F: Loosen source-quality upgrade trigger (replace external-citation count with useful-commerce-evidence check)
- Replaced `countExternalCitations(product) === 0` in `needsSourceUpgrade` with `!hasUsefulCommerceEvidence(product)`.
- `hasUsefulCommerceEvidence` returns `true` only when a product has at least one citation from a **tier-1 editorial** (`sourceTier === 1`: Wirecutter, RTINGS, etc.) or **tier-2 marketplace/retailer** (`sourceTier === 2`: Amazon, Home Depot, etc.) source that is distinct from the product's own page host.
- Same-brand subdomains (`store.ridgid.com` when product host is `ridgid.com`) and manufacturer sites on different domains (`makitatools.com` when product URL is `amazon.com`) are tier-3 and no longer block upgrade eligibility.
- `countExternalCitations` helper removed (no longer used). `sourceTier` imported from `lib/search/sourceTier.ts`.
- No changes to scoring weights, ranking, selection logic, model-token detection, price trust, citation trust, or product eligibility.
- 5 new deterministic tests in `tests/sourceQualityUpgrade.test.mjs`; total suite 600/600 green. TypeScript clean.

### 🟩 Claude — Phase 3E: Source-quality upgrade for high-fit weakly-sourced candidates
- New pre-scoring pass in `lib/requirementEvidenceRescue.ts`: `upgradeWeakSourceEvidence` runs AFTER requirement rescue and revalidation, BEFORE `scoreAndSelectRecommendationsWithTrace`.
- Targets candidates that (a) have a model-number token (strong product identity), (b) pass all hard requirements, and (c) have weak source evidence — no verified price, no owner rating, and zero external citations (all citations from the same host as the product page).
- For each qualifying candidate (capped at `MAX_SOURCE_UPGRADE_CANDIDATES = 3`) a single `searchSerperShopping` call finds the same product on a better-sourced page; after passing the existing `looksLikeSameProduct` identity gate, price, rating, reviewCount, and citation are merged via existing rescue helpers (`mergeOffer`, `addVerificationCitation`).
- Wired into the route as `routeDependencies.upgradeWeakSourceEvidence`; identity-mocked in the API contract test.
- Debug visibility: `debug.stageFunnel.sourceUpgradeTraces` records every attempted upgrade (query, fields attached, identity result). Replay script prints the traces.
- 18 deterministic tests in `tests/sourceQualityUpgrade.test.mjs` covering 3 categories (gas grill, robot vacuum, TV) and 7 negative cases (price present, rating present, external citation present, failed requirement, no model token, identity mismatch, cap enforcement). Full suite 597/597 green.
- Safety invariants: no product-specific patches, no score weight changes, no budget/eligibility loosening; the upgrade is metadata-only and the candidate set (names/types) is unchanged.

### 🟩 Claude — Final-selection trace instrumentation (debug-only)
- Added `debug.stageFunnel.finalSelectionTrace` — a per-candidate record capturing why every candidate that reached `scoreAndSelectRecommendations` was selected, dropped, collapsed, or excluded. Zero behavior change to ranking, scoring, filtering, or any other pipeline stage.
- New types in `lib/recommendationFunnel.ts`: `FinalSelectionDecisionReason` (10 values), `FinalSelectionCandidateStream` (5 values), `FinalSelectionTraceEntry` (full candidate snapshot).
- New `scoreAndSelectRecommendationsWithTrace` export from `lib/recommendationScoring.ts`; all 30+ existing call sites use the unchanged `scoreAndSelectRecommendations` function.
- Route attaches `finalSelectionTrace` to the `stageFunnel` debug payload. Replay script prints trace grouped by decision reason.
- 11 deterministic tests in `tests/finalSelectionTrace.test.mjs`; full suite 579/579 green.

## 2026-06-24

### 🟩 Claude — Citation-strength classification (tag citations by source independence)
- Added `citation_type` to every verified citation: `"product-page-self"` (own product page via rescue path), `"independent-editorial"` (tier-1 editorial/expert), `"retailer-marketplace"` (tier-2 marketplace), `"weak-uncorroborated"` (tier 3/4). `classifyCitationType()` in `lib/recommendationResultValidation.ts` maps source tier → type via `sourceTier.ts`; rescued citations are explicitly tagged `product-page-self` so a self-cite can let a product survive citation verification without being ranked as strongly supported.
- New `scripts/citationStrengthDiagnostic.mjs`: per-candidate citation-type breakdown for one live query, then replayable from a saved payload at zero cost. Flags thin-winner crowd-out when the #1 slot is held by a `product-page-self`-only candidate with a stronger product ranked below it.
- No pipeline behavior change (no trust-gate changes). 540/540 tests. TypeScript clean.

### 🟩 Claude — Measurement Phase 2: replay fixtures + deterministic stage-funnel tests
- `scripts/replay-quality-fixtures.mjs`: exports `analyzeFixture()`; CLI reports stage funnel (raw → dedupe → cheap-filter → pool → final-7), citation strength classification (INDEPENDENT / RETAILER / SELF-ONLY / WEAK / NONE), thin/weak winner analysis, and gold-leader drop-point tracking. Zero API cost after initial save.
- `scripts/save-debug-fixture.mjs`: call the API once with `x-reviewradar-debug: true`, save payload to `tests/fixtures/review-radar-live/<slug>.json` for free replay. `npm run qa:replay` / `npm run qa:save-fixture`.
- `tests/fixtures/robot-vacuum-synthetic.json`: synthetic fixture with a 7-candidate pool demonstrating citation-verify drop, rescue pattern, thin winner at #1, and 1 lost gold leader (Shark Matrix).
- 14 deterministic tests in `tests/replayFixtures.test.mjs` proving `analyzeFixture()` stage counts, drop/rescue events, citation classification, thinWinner flag, betterSupportedBelowWinner, and lostLeaders. 554/554 tests.

### 🟩 Claude — Measurement Phase 1: scorecard test modes + cost guard
- `qualityScorecard.mjs` now requires explicit mode selection (`--mode diagnostic|normal|high|stress`). Bare invocation (was a silent ~1316-call baseline) now refuses to run. Any run estimated > 600 Serper calls blocks without `--confirm`. `--dry-run` prints the full plan for any mode at zero cost. Every run prints queries / runs / estimated Serper calls / estimated runtime / the question it answers.
- Cost model derived from the last real baseline: ~47 Serper calls/search, ~75 s/search. `npm run qa:plan` prints mode costs without running.
- `docs/review-radar-test-memory.md`: corrected the ~4× underestimated cost numbers, added the test-modes table, the PASS/FAIL/INCONCLUSIVE before/after rules with a safety floor, and PROVEN/SUSPECTED/UNKNOWN tags for diagnostic findings.

### 🟩 Claude — Phase 3B: wrong-type vacuum products blocked from robot vacuum results
- Wet/dry vacs, stick vacuums, canister vacuums, and handheld vacuums were appearing in exact matches and near matches for robot vacuum searches because `PRODUCT_TYPE_RULES` had no `robot_vacuum` entry. The product-type check returned `{requestedType: null}` for all robot vacuum queries, falling through to a loose category-term check that trusted the LLM's mislabeled `product.category` field.
- **Fix 1 — `robot_vacuum` rule in `productTypeIntent.ts`:** New rule with `blocked` pattern covering stick/canister/hand/wet-dry/upright/shop-vac vacuums and `allowed` pattern requiring explicit robot vacuum type signals. Wet/dry is matched on "wet dry" alone (without requiring "vac") to handle truncated Serper product titles like "Milwaukee…Wet/Dry …".
- **Fix 2 — `allowedCheckText` parameter in `classifyProductTypeIntent`:** The `allowed` check can now use a richer text (evidence + `why_recommended`) separate from the `blocked` check. This lets sparse-name products like "Roborock S8 MaxV Ultra" confirm their type via the recommendation narrative ("flagship robot vacuum and mop") without risking that query-echoing text in `why_recommended` (e.g., "ice maker found during refrigerator search") falsely satisfies a component-substitution `satisfiedBy` guard.
- **Fix 3 — three-state `checkCategory` in `requirementValidation.ts`:** Changed from boolean to `"pass"|"fail"|"unverified"`. Wrong type → `missingRequirements` → disqualified from both exact and near matches (as before for hard failures). Unverified type (product can't prove it's the right type from evidence, but not confirmed wrong) → `unknownRequirements` → allowed as near match with "Needs verification: Category:" label. This is the correct behavior per the design spec.
- **Outcome:** Milwaukee M18 Wet/Dry Vac, ONE+ Hand Vacuum, Shark Rocket Stick Vacuum, RYOBI Stick Vacuum, KENMORE Canister Vacuum all classified `irrelevant` → excluded from both exact and near matches. Valid robot vacuums (Roborock S8, Dreame X30, iRobot Roomba 105 Vac Robot) retain exact match status. Sparse-evidence products (Roborock S7 MaxV Ultra, iRobot Combo Robot) correctly become near matches.
- **Scope:** generic fix — applies to all robot vacuum and "robotic vacuum" queries. No product names or brands hardcoded. The same three-state `checkCategory` mechanism also benefits all other product-type categories.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (564/564 tests), `node scripts/eval-pipeline.mjs` (red-flag checks clean).

### 🟩 Claude — Phase 3A: requirement-filter diagnostics + spec preWindow fix
- The stage funnel's `afterRequirementFilter` stage was tracking only EXACT matches, not near matches. This made constrained queries look like "0 products" at that stage when all products were correctly demoted to near-match status (unknown budget = unverified price). Fixed: added `near:` field to the `afterRequirementFilter` stage.
- Fixed a latent spec-extraction bug: "gas grill under $600 4-burner" was extracting "4-burner" as `max 4 burners` (wrong direction) because the "under" from "$600" bled into the 28-char preWindow before the burner spec. Fixed by stripping `DIRECTION_WORD\s+\$price` patterns from the preWindow before direction detection.
- Fixed spec label: `operator: "max"` labeled constraints as "under N" but evaluation is `<= N`. Changed to "at most N".
- 3 new tests added to `tests/specExtraction.test.mjs`. 557 tests pass at this commit.

## 2026-06-23

### 🟩 Claude — Filtering STEP 2: Product-page citation rescue (fix citation-verify over-strictness)
- **Root cause found (STEP 1):** real product-page leaders (RIDGID RT1200, Craftsman CMEC6150K, Roborock S8 MaxV Ultra — own product URLs, 2–3 citations, sometimes verified prices) were REMOVED at `filterResultToVerifiedCitations` because their URLs were not in the verified-URL set. These products arrive via the LLM/web_search path, not the auto-verified Serper path.
- **Fix 1 — URL normalization:** lowercase host, strip a curated tracking/affiliate param set (not just `utm_`), sort remaining params, drop trailing slash → more verified-URL matches on the same underlying pages.
- **Fix 2 — Product-page rescue:** when web research verified none of a candidate's citations, self-cite its own product page IF that URL passes the same `canRenderAsProductCard` eligibility check used to filter the result (not a category/search/listing/article/review/forum page). Uncited prose is never rescued.
- Regression tests: real product page survives without a pre-verified URL; normalizes despite tracking params/trailing slash; article/review/category/listing/search pages still drop; uncited recommendation never rescued. 535/535 tests.

### 🟩 Claude — Stage-by-stage discovery funnel + diagnostic findings (measurement, debug only)
- **`lib/recommendationFunnel.ts`**: per-candidate snapshot (brand/model, source tier, evidence count, hosts, price+confidence, requirement pass/fail/unknown, score). Used for zero-cost stage funnel tracking.
- **Debug funnel** in `route.ts` (`stageFunnel.candidatePool` / `.rejectedCheap` / `.postFilter` / `.final7`): exposes where core leaders are lost without changing discovery/filter/ranking.
- **Funnel improvement:** `candidatePool` is now the true merged Serper+LLM superset (previously only tracked Serper candidates). "REMOVED vs ranked-below-cutoff" distinction added at the final stage so diagnostics show whether a leader was filtered out or merely outranked.
- **Diagnostic finding:** core leaders (RIDGID, Craftsman, Roborock) were lost at `afterCitationVerify` (filtering), not at discovery or ranking. This pointed directly at the citation-rescue fix above.

### 🟩 Claude — Phase 1: Source-tiered discovery — seed brand-led market leaders
- **Problem found by Phase 0:** mean core-leader coverage 3.0/7 across 14 queries. Many best-of leaders are named as "brand + line" without a model number (Coway Airmega, Herman Miller Aeron, Shark Matrix); the old `extractSeedProductNames` required a model-number-bearing token and discarded them.
- **New `lib/search/sourceTier.ts`**: generalized domain→tier classifier (1 = editorial, 2 = marketplace, 3 = brand/manufacturer, 4 = other) + `SOURCE_NAME_TOKENS` blocklist. Cross-category, no per-category logic.
- **`extractSeedProductNames` expanded**: now also accepts brand-led proper-noun names (≥2 word tokens, dict-free), mines Tier-1 editorial sources first, and rejects category-only/source-name/year-led/multi-brand-mash title runs. Expanded stopwords.
- Cost-neutral: fills the existing seed-shopping budget with better names rather than adding Serper calls. 530/530 tests.

### 🟩 Claude — Phase 0: Quality measurement harness + gold benchmark
- **`scripts/goldBenchmark.mjs`**: 14 gold queries (8 broad, 6 constraint). Broad queries define `coreLeaders` (the required-coverage targets), `acceptableAlternates`, and `wrongTypeTerms` (penalized in the final 7). Constraint queries define budget/feature requirements.
- **`scripts/qualityScorecard.mjs`**: grades the pipeline against the gold benchmark in two scorecards — broad (core-leader coverage in pool + final-7, wrong-type leakage, weak-#1 flag, price confidence, stability) and constraint (budget/feature violations + price confidence).
- **`scripts/qualityConsistencyHarness.mjs`**: stability / exact-rate / price probe across a fixed query set.
- **Phase 0 baseline recorded:** mean core-leader coverage 3.0/7 in the final-7, 4.2/7 in the candidate pool — leaders were present but not reaching the final slot (confirmed separately via the funnel).
- Benchmark data is product-specific by design; pipeline logic stays generalized. No behavior changes.

## 2026-06-22

### Codex — Show plain availability label instead of raw schema.org value
- Product cards were showing raw `InStock` / `OutOfStock` schema.org values from Serper metadata. Changed to display human-readable labels ("In stock", "Out of stock", "Limited availability", "Pre-order") by mapping the schema.org token in `lib/productCardViewModel.ts`. No logic change — display only.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (530/530 tests).

### Codex - Faster searches without loosening trust gates
- Added a shared performance policy so ReviewRadar spends expensive proof work on the products most likely to be shown, instead of automatically enriching and rescuing up to the full deep-search product cap every time.
- Review evidence enrichment and missing-evidence rescue now run independent product checks with a small concurrency limit, defaulting to 3 at a time. The same price trust, product eligibility, and hard-requirement checks still apply.
- Missing-evidence rescue now checks the highest-impact facts first and defaults to 2 facts per product: price/budget first, then hard requirements, then critical/important rubric facts. Minor rubric facts are no longer rescued during the main search.
- The final OpenAI research step now receives a stronger shortlist instead of every raw candidate, while preserving hard-match candidates, expected mainstream products, priced products, source-diverse products, and close matches that could become exact.
- Added adaptive final-search context selection so strong candidate coverage can use a lighter OpenAI search context, while weak coverage still gets the deeper context.
- Optional LLM narration is off by default locally because it added time without changing product accuracy.
- Live timing proof: the `toaster oven`, `$200`, `air fry, easy to clean, compact countertop size` search improved from about 124 seconds before the speed work to about 72 seconds after it. The same run still returned near matches rather than exact matches, so that looks like a separate strictness/verification issue rather than a speed issue.
- Verified: `node --no-warnings --test tests\recommendationPerformance.test.mjs tests\productEvidence.test.mjs tests\requirementEvidenceRescue.test.mjs tests\recommendationApiContract.test.mjs`; `npm run typecheck`; `npm run lint`; `npm test` (522/522 tests); `npm run build`; live localhost timed search with debug timing.

## 2026-06-21

### Codex - Recommendation timing logs
- Added per-stage timing logs to the recommendation API so slow searches can be diagnosed by stage instead of guessing. The timing now tracks model calls, Serper discovery, follow-up discovery, final research, citation filtering, requirement filtering, review evidence enrichment, product-page/asset enrichment, missing-evidence rescue, scoring, optional narration, and final cleanup.
- Debug responses now include `debug.timing` when the request uses `x-reviewradar-debug: true`. The dev server also prints a compact `[ReviewRadar timing]` summary with the slowest stages, total time, model, search depth, and result counts.
- Verified: `node --no-warnings --test tests\recommendationApiContract.test.mjs`; `npm run typecheck`; `npm run lint`; `npm test` (514/514 tests); `npm run build`.

### Codex - Product diversity instead of retailer diversity
- Changed final Best Match selection so ReviewRadar no longer blocks strong products just because several come from the same retailer. Retailer limits now stay in early discovery only, where they prevent one site from flooding the candidate pool.
- Final selection now focuses on distinct products: exact duplicate products are still merged, near-duplicate model families are still collapsed, and genuinely different products can all appear even if they share a retailer.
- When duplicate products from different retailers merge, ReviewRadar now keeps alternate retailer offer evidence on the product metadata instead of losing those links.
- Added debug wording so QA can see when repeated retailers were allowed because the products were distinct.
- Live QA also found an eBay "Best ... Cleaners" browse page appearing as an exact wet/dry-vac product. The shared product eligibility classifier now blocks eBay browse/category shapes like `/t/`, `/b/`, and `/sch/` from rendering as product cards.
- Verified: focused product-diversity, Serper, and product-eligibility tests; `npm run typecheck`; `npm run lint`; `npm test` (513/513 tests); `npm run build`; `node scripts/eval-pipeline.mjs`; deterministic RR agent loop; live API checks for `cordless drill` and `wet dry vac`. The wet/dry-vac rerun changed from an eBay browse page exact match to a real Vacmaster product page exact match.

### 🟩 Claude — Rubric matcher uses whole-word matching (Phase 5)
- Tightened how the buying-rubric ranking nudge decides a product "has" a quality/review signal. It was matching substrings, so "grip" counted "gripped" and "trail" counted "trailer" — false matches that inflated a product's rubric score. It now matches whole words/phrases only. This is a small ranking nudge (it never overrides hard requirements, price trust, or product eligibility), so impact is bounded; it just makes the nudge more accurate.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (499/499 tests), `node scripts/eval-pipeline.mjs` (red-flag checks clean).

### 🟩 Claude — Rescue shopping leg searches product identity (Phase 3, step 1)
- Improved how the evidence-rescue pass finds a real, structured price for a product that only had a text price. It now searches the product's identity (name + category) on Google Shopping instead of a descriptive phrase like "current price", which is noise for a shopping engine. This should raise the rate at which a trusted store price gets attached, so fewer products are left needing price verification. Investigation-only (no live API spent); the organic-evidence search is unchanged. A live measurement of the success rate remains a recommended follow-up.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (497/497 tests).

### 🟩 Claude — De-stacked credibility penalties (Phase 2)
- Stopped over-penalizing thin-but-valid products. A weak-credibility product (usually just one with few reviews/sources) was being charged 3–4 separate penalties for the same signal (~−58 in the ranked-match score), which could bury legitimate budget/niche picks below the visible cut. Credibility is now charged once per ranking score. Also removed a dead `riskPenalty` that was computed but never used. Product ordering is unchanged in the baseline scenarios — only the excessive penalty margin narrowed — and no suspicious/wrong/over-budget item moved into exact matches.
- The legacy `REVIEW_RADAR_CREDIBILITY_PENALTY` flag is now a no-op (its effect was folded into the always-on term). The rubric double-penalty cleanup was investigated but deferred to avoid dropping the critical-vs-minor importance weighting.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (496/496 tests), `node scripts/eval-pipeline.mjs` (red-flag checks clean), regenerated ranking-baseline snapshots.

### 🟩 Claude — Conflict rules applied at discovery (Phase 1, step 2)
- Moved the cross-category "wrong product type" conflict rules (e.g. a washing machine for a pressure-washer search, an ottoman for a sofa search, a gaming chair for an office-chair search) out of validation-only code into the shared `lib/productTypeMatch.ts`, so discovery now rejects these earlier instead of carrying them in the candidate pool until validation. Rules that reject on *missing* evidence, and the identity-based mattress-vs-furniture check, were deliberately left at the validation stage where the evidence is richer. Validation behavior is unchanged; discovery is stricter about obvious wrong-type products.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (496/496 tests; validation tests still green = parity), `node scripts/eval-pipeline.mjs` (red-flag checks clean — no over-rejection of the test fixtures).

### 🟩 Claude — Shared product-type verdict helper (Phase 1, step 1)
- Consolidated the "is this the requested kind of product?" check that discovery and validation were each duplicating (wrong-type / accessory / component-substitution, e.g. a cooktop for an oven or a gaming chair for an office chair) into one shared helper `lib/productTypeMatch.ts`. Discovery (`serper.ts`) and validation (`requirementValidation.ts`) now call the same function so they can't drift apart. Parity step — no behavior change yet; broader coverage and removing the duplicate tables come in later Phase 1 steps.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (493/493 tests; all prior tests still green = parity), `node scripts/eval-pipeline.mjs` (red-flag checks clean).

### 🟩 Claude — Budget-usable text prices (Phase 0)
- Fixed an over-strict price-trust gate where a product priced only from recommendation text (no structured retailer offer) could never become an in-budget exact match, so ordinary budget searches like `shop vac` / `$400` returned 0 exact matches even for clearly under-budget products. A specific, plausible text price now counts toward budget while still flagged "needs verification" on the card; vague ranges/approximations stay unusable; all suspicious/financing/conflicting/full-size-appliance price protections are unchanged.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (488/488 tests), `node scripts/eval-pipeline.mjs` (red-flag checks clean).

### Changed
- Completed Phase 5 by extending the existing evidence-rescue pass to retry critical and important missing buying-rubric facts.
- ReviewRadar now uses remaining verification slots to search for missing high-value rubric facts such as current price, dimensions, fit, capacity, or compatibility before final scoring.
- When a retry verifies a missing rubric fact, ReviewRadar clears that specific evidence gap and keeps the supporting citation or metadata.
- Completed the Phase 6 hardening pass with full checks, deterministic QA agents, and a live localhost API smoke test.

### Verified
- `node --no-warnings --test tests\requirementEvidenceRescue.test.mjs tests\resultQuality.test.mjs tests\productEvidence.test.mjs tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (486/486 tests)
- `npm run build`
- `npm run qa:loop -- --mode deterministic --batches price-trust,broad-mainstream,requirement-units,wrong-category,non-product-pages`
- Direct live API smoke test for `refrigerator`, `$2500`, `must be stainless steel`: returned 3 exact matches and 5 close matches. The top exact match had a verified `$2,099` price and one remaining rubric gap clearly tracked as external dimensions/clearance.

## 2026-06-20

### Changed
- Added a shared importance list for missing buying-rubric facts, so missing facts are weighted as `critical`, `important`, or `minor` instead of all counting the same.
- Critical missing facts such as current price, availability, product type, compatibility, dimensions/fit, capacity, and safety now affect ranking and confidence more than minor cosmetic or convenience facts.
- Missing rubric facts are now sorted by importance before they are stored, so a minor missing detail cannot crowd out a more important missing fact.
- Started Phase 4 by making missing buying-rubric facts affect evidence completeness, confidence, and ranking.
- Products now record important unverified rubric facts as `Rubric fact: ...` evidence unknowns, so ReviewRadar can see when a recommendation is missing facts shoppers would reasonably expect.
- Missing rubric facts now add a capped missing-data penalty and cap confidence, but they do not hard-reject the product by themselves.
- Added safeguards so already verified price, finish/color, product type, dimensions, capacity, model, and availability facts are not falsely marked missing.
- Started Phase 3 by making the buying rubric guide evidence gathering, not just ranking.
- Added rubric-specific evidence searches for product facts, quality signals, owner-review themes, and red flags.
- Attached the generated buying rubric to products internally before review-evidence enrichment, then stripped it from normal user-facing API responses.
- Changed review evidence enrichment so rubric-supported facts can become positive evidence and rubric red flags can become negative evidence.
- Added a negation guard so positive evidence like "stainless steel finish" does not accidentally trigger a red flag like "finish not explicitly verified as stainless steel."
- Fixed a live refrigerator QA issue where a full-size refrigerator could treat a promo/add-on-sized `$515` amount as a verified full refrigerator price.
- Raised the shared suspicious-price floor for full-size refrigerator contexts such as French-door, side-by-side, top-freezer, bottom-freezer, counter-depth, standard-depth, and large cu. ft. refrigerators, while keeping compact/mini fridges separate so genuinely cheap small fridges can still pass.
- Added a universal OpenAI-generated buying rubric to the discovery strategy so ReviewRadar can learn what matters for the searched product category without needing a hand-written profile for every product type.
- Used the buying rubric in search expansion, final prompt context, and deterministic ranking. It can now nudge products up for supported quality signals and nudge them down for missing or negative rubric evidence.
- Kept the rubric as a ranking signal only. Hard requirements, product eligibility, and trusted price checks still decide whether a product can be an exact Best Match.
- Added debug visibility and tests for the rubric so live QA can see when it was generated and whether it affected product scoring.
- Turned category-fit scoring on by default as a small capped ranking nudge, with `REVIEW_RADAR_CATEGORY_SCORING=off` kept as a safety switch for before/after QA.
- Expanded the shared category profiles so toaster ovens, microwaves, TVs, monitors, and laptops can get credit for meaningful category facts instead of only generic popularity signals.
- Expanded the shared spec dictionary to read reusable product facts such as wattage, slice capacity, cooking functions, quart capacity, max temperature, screen size, refresh rate, memory, and storage.
- Fixed a live toaster-oven QA issue where manual-style pages such as quick-start guides could appear as close matches. Manuals and quick-start guides are now evidence-only/non-product pages, not product cards.
- Added a shared product-type intent layer so ReviewRadar can tell the difference between closely related product types, such as toaster ovens versus wall ovens, ranges, stoves, and cooktops.
- Changed category validation so a product can no longer pass just because the AI or a retailer labels it with the requested category. The product evidence itself must support the requested product type.
- Changed Serper pre-filtering so obvious substitute products and accessories can be removed before final ranking, while thin evidence is kept as "needs verification" instead of being guessed as exact.
- Tightened toaster-oven search wording so the search plan stays focused on countertop/toaster-oven products instead of broad oven or range searches.
- Added a shared product trust layer so Serper intake, final validation, product-page URL selection, price checks, exact-match gating, and QA workers use the same reusable rules.
- Added `lib/productEligibility.ts` to decide whether a page is a real buyable product, evidence-only page, listing/search page, non-product page, or unknown page.
- Added `lib/productPriceTrust.ts` to decide whether a product price is verified, usable, needs verification, suspicious, conflicting, or missing.
- Changed budget matching so products with weak, missing, suspicious, or conflicting price evidence cannot become exact Best Matches when the shopper gave a budget.
- Changed product URL selection so review articles, Reddit/forums, support pages, category pages, search pages, comparison pages, and other evidence-only pages cannot become the main product-card button.
- Updated the QA worker so it checks full product objects for bad pages and bad prices instead of only scanning product names.
- Updated the agent loop status labels so a run with passing checks but real worker findings is reported as `needs-fix`, not simply passed.
- Fixed an important-details parsing gap where brand alternatives like `Sony or Bose` and `DeWalt or Milwaukee` were treated as "needs review" instead of real brand filters.
- Added safer brand-line aliases for mainstream tool lines such as DeWalt `20V MAX` and Milwaukee `M12 FUEL`, so retailer titles that omit the parent brand can still satisfy brand requirements when the line is specific enough.
- Fixed the issues found by the advanced live QA sweep across price trust, non-product pages, avoid terms, unit matching, and wrong-category cleanup.
- Expanded full-product price sanity checks to cover major appliances and large TVs, so `$100` refrigerator evidence or `$10` 65-inch TV evidence is treated as suspicious/unverified instead of a verified full price.
- Tightened article/listing filters so sale articles, lowest-price-ever stories, TV listing pages, and business/gaming laptop category pages cannot appear as product cards.
- Strengthened avoid-term handling so phrases like `not a gaming chair` reject gaming/racing chair products even when the title also says office chair.
- Treated plain length requests like `50 ft length` as an exact length requirement, while preserving broader `at least` wording for true minimum-length searches.
- Added early discovery filtering for exact length conflicts so wrong-length candidates are removed before final ranking when the evidence is clear.
- Fixed a live QA price-trust issue where ordinary full products such as air purifiers, printers, vacuums, office chairs, and cordless drills could treat tiny accessory/promo/variant prices like `$10` as if they were verified full-product prices.
- Added a new `suspicious` price confidence state so ReviewRadar can clearly separate "no price found" from "a price was found, but it looks too low to trust for this product type."
- Kept suspicious-price products out of exact Best Match results and made the product card tell shoppers to verify the current store price instead of confidently showing a misleading number.
- Improved duplicate detection for same-model products sold by different retailers, including retailer-heavy shoe titles like Champs Sports and Foot Locker.
- Added a reusable buying-advice page filter so articles such as "7 Things to Avoid When Purchasing..." can still inform research but cannot appear as product cards.

### Verified
- `node --no-warnings --test tests\productEvidence.test.mjs tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (485/485 tests)
- `npm run build`
- `node --no-warnings --test tests\productEvidence.test.mjs tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (483/483 tests)
- `npm run build`
- Direct live API recheck for `refrigerator`, `$2500`, `must be stainless steel`: returned 2 exact matches and 5 close matches. The stronger exact match had no missing rubric facts, while weaker or missing-price products carried rubric unknowns and lower confidence instead of being over-promoted.
- `node --no-warnings --test tests\productEvidence.test.mjs tests\buyingRubric.test.mjs tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (480/480 tests)
- `npm run build`
- Direct live API recheck for `refrigerator`, `$2500`, `must be stainless steel`: the run generated a refrigerator buying rubric, returned exact matches, kept missing-price products as close matches, and did not produce the negated stainless-steel red-flag false positive.
- `node --no-warnings --test tests\productPriceTrust.test.mjs tests\priceParsing.test.mjs tests\productAssets.test.mjs tests\recommendationScoring.test.mjs tests\requirementValidation.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (477/477 tests)
- `npm run build`
- Direct live API recheck for `refrigerator`, `$2500`, `must be stainless steel`: exact matches had verified under-budget prices and stainless-steel evidence; the fake-low `$515` full-size refrigerator price no longer appeared as an exact match.
- `node --no-warnings --test tests\buyingRubric.test.mjs tests\discoveryStrategy.test.mjs tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (476/476 tests)
- `npm run build`
- Direct live API recheck for `trail running shoes`, `$150`, `good grip, cushioning, durable outsole`, avoiding road-only shoes: the run returned a real buyable product as `#1 Best Match`, generated rubric-based product score fields, and kept weak/missing price evidence out of exact matches.
- `node --no-warnings --test tests\productEligibility.test.mjs tests\categoryScoring.test.mjs tests\specExtraction.test.mjs tests\recommendationScoring.test.mjs tests\requirementValidation.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (474/474 tests)
- `npm run build`
- Direct live API recheck for `toaster oven`, `$300`, `countertop, easy to clean, good reviews`: returned 3 exact toaster-oven matches, no wall ovens/ranges/stoves/cooktops, no quick-start/manual pages, and category-fit scoring was present on the displayed toaster-oven results.
- `node --no-warnings --test tests\productTypeIntent.test.mjs tests\requirementValidation.test.mjs tests\serper.test.mjs tests\searchQueryExpansion.test.mjs tests\formFactor.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (471/471 tests)
- `npm run build`
- Direct live API recheck for `toaster oven`, `$300`, `countertop, easy to clean, good reviews`: returned 2 exact toaster-oven matches, 5 close matches, and no displayed wall ovens, ranges, stoves, cooktops, or full-size ovens.
- `node --no-warnings --test tests\productEligibility.test.mjs tests\productPriceTrust.test.mjs tests\serper.test.mjs tests\productPageUrl.test.mjs tests\qaWorker.test.mjs tests\recommendationResultValidation.test.mjs`
- `node --no-warnings --test tests\matchingAccuracy.test.mjs tests\finalResultConsistency.test.mjs tests\rankingBaseline.test.mjs tests\rankingQuality.test.mjs tests\resultQuality.test.mjs tests\searchCandidateFallback.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (463/463 tests)
- `npm run build`
- `npm run qa:loop -- --mode deterministic --batches price-trust,broad-mainstream,requirement-units,wrong-category,non-product-pages`
- `node --no-warnings --test tests\requirementExtraction.test.mjs tests\requirementValidation.test.mjs tests\serper.test.mjs tests\searchCandidateFallback.test.mjs`
- `npm test` (465/465 tests)
- Direct live API recheck for `cordless drill`, `$200`, `DeWalt or Milwaukee, battery included`: brand alternatives now parse correctly, but exact matches still need better live price and battery-included evidence before they can safely move out of close matches.
- `npm run qa:loop -- --mode live --batches price-trust,broad-mainstream,requirement-units,wrong-category,non-product-pages --parallel 2`
- `npm run qa:loop -- --mode deterministic --batches price-trust,broad-mainstream,requirement-units,wrong-category,non-product-pages`
- `node --no-warnings --experimental-transform-types --test tests\priceParsing.test.mjs tests\serper.test.mjs tests\requirementValidation.test.mjs tests\recommendationResultValidation.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (448/448 tests)
- `npm run build`
- Direct live API rechecks for counter-depth refrigerator, 65-inch TV, office chair, garden hose, and gaming laptop searches. The original refrigerator `$100`, sale/listing TV cards, gaming-chair exact matches, 100 ft hose exact match, and business-laptop/lens leakage were not present in the relevant final live checks.
- `node --no-warnings --experimental-transform-types --test tests\serper.test.mjs tests\requirementValidation.test.mjs tests\recommendationResultValidation.test.mjs tests\priceParsing.test.mjs tests\recommendationScoring.test.mjs tests\productIdentity.test.mjs tests\productCardViewModel.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (445/445 tests)
- `npm run build`
- Direct live API recheck for `air purifier`, `$250`, `Levoit only, good for bedroom, HEPA filter`: returned 6 exact matches, no suspicious exact prices, and no buying-advice article leak.

## 2026-06-19

### Changed
- Fixed a live Nike running-shoes discovery issue where a broad, realistic `Nike only` search could return only close matches because affordable verified products were crowded out by premium or unknown-price AI expansion searches.
- Protected the app-generated brand/category/budget searches so they stay ahead of AI-added discovery strategy searches.
- Normalized AI-added follow-up searches to budget-bound wording like `under $200` instead of loose wording like `$200`.
- Updated the final research prompt so broad brand-and-budget searches look for mainstream in-budget models before filling the candidate pool with premium, flagship, racing, or unknown-price products.
- Fixed a live QA non-product-page leakage issue where review/article titles like `Nike Alphafly 3: Tried and tested - Runner's World` or `Review: Nike Winflo 11` could appear as product cards.
- Added reusable review-article guards for `Review:` titles, `tried and tested`, `tested and reviewed`, and hands-on review wording.
- Treated Runner's World pages as evidence/review sources rather than product-card pages.
- Added rotating product searches to the RR agent batches so repeated agent runs do not keep testing the same products every time.
- Expanded each QA batch with a larger pool of realistic searches across shoes, appliances, tools, electronics, home goods, grills, fitness equipment, and wrong-product edge cases.
- Added `searchRotation` metadata to worker results so it is clear which slice of a batch was tested and where the next run will continue.
- Documented the rotating batch workflow in the agent loop docs and technical overview.
- Fixed the live QA worker so temporary localhost, rate-limit, or server errors get one retry before they become an agent next task.
- Made live QA failures clearer: true connection problems are labeled as localhost/API unavailable, while temporary research/API failures are labeled separately.
- Fixed another non-product-page leakage class from live price-trust QA so basketball rules/dimensions pages, NBA court-equipment pages, and Pinterest dimension drawings cannot appear as product cards.
- Narrowed a broad shoe-listing title filter so real Nike product pages such as a named Book 1 shoe are still accepted while generic "Basketball Shoes - Nike" listing pages stay blocked.
- Fixed a live QA non-product-page leakage issue where articles, product-family pages, price-comparison pages, retailer category/advice pages, and brand newsroom pages could appear as recommendations.
- Strengthened product-page trust checks in three places: Serper candidate intake, final citation/result validation, and the product-card URL selector.
- Added reusable guards for common non-product page shapes, including "ranking/top N" articles, review pages, release/newsroom pages, product lineup articles, Nike category/brand pages, DICK'S advice/category pages, Foot Locker product-family pages, Klarna comparison pages, and sneaker-news pages.
- Added regression tests so these pages can still be used as research evidence but not shown as buyable product cards.
- Fixed a live QA price-trust issue where high-ticket full products, especially travel systems, could show payment/promo/variant amounts like `$35` or `$10` as if they were full product prices.
- Added reusable product-context price floors so budget validation, ranking, product reliability, and card price display treat implausibly tiny full-product prices as unverified instead of exact-match evidence.
- Added regression tests proving the fix rejects suspicious travel-system prices while still allowing genuinely cheap categories such as garden hoses.
- Added an opt-in controller flag for meaningful change-log updates. Future QA/fix runs can pass `--change-note` and `--change-verified` so the controller appends a plain-English `docs/change-log.md` entry and syncs the desktop markdown copy.
- Added a safe v1 multi-agent QA loop foundation with controller, worker, and verifier scripts.
- Moved reusable QA scenarios into JSON batch files under `docs/agent-batches/`.
- Added deterministic and live localhost worker modes. Live mode posts to the local recommendations API with debug enabled and records exact/near counts, product names, suspicious flags, and debug summaries.
- Added multi-batch controller runs with capped parallel support, current-run-only worker result merging, repeated-root-cause ranking, stronger next-task handoff files, and a generated `docs/agent-loop-report.md`.
- Added a reusable `docs/agent-fix-template.md` so Codex or Claude can follow the same generalized fix-and-verify process.
- Expanded the verifier so it compares before/after worker result sets and rejects new root causes, more exact-match failures, more wrong-price/wrong-product/non-product failures, or product-specific patches.
- Improved the verifier's default file selection so it includes controller-owned worker files and sorts by file time instead of relying on filename prefixes.
- Fixed the QA worker's suspicious-price detector so it reads comma prices like `$3,000` correctly instead of treating them as `$3`.
- Added docs explaining how controller and worker agents should test ReviewRadar, reject product-specific patches, verify generalized fixes, and log results.
- Added npm commands for running the QA loop, worker batches, and verifier summaries.
- Added a reusable product reliability check for Best Match eligibility.
- Products with conflicting or unverified price evidence are kept out of the ranked Best Match list.
- Product cards now avoid confidently showing suspicious cheap prices when sources disagree, and instead tell shoppers to verify the current store price.
- Added safer unit-label handling so selected length features do not create duplicated labels like `50 ft ft`.

### Verified
- `node --no-warnings --experimental-transform-types --test tests\discoveryStrategy.test.mjs tests\searchQueryExpansion.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (442/442 tests)
- Direct live API recheck for `running shoes`, `$200`, `Nike only`: returned an exact match, `Nike Pegasus 41 Men's Road Running Shoes`, at `$101.97`.
- `npm run build`
- `node --no-warnings --test tests\serper.test.mjs tests\recommendationResultValidation.test.mjs tests\requirementValidation.test.mjs tests\productPageUrl.test.mjs`
- `node --check scripts\qa-worker.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (439/439 tests)
- `npm run qa:loop -- --batches broad-mainstream`
- `npm run build`
- Direct live API recheck for `running shoes`, `$200`, `Nike only`: review/article pages no longer appeared in exact or near match names.
- `node --check scripts\qa-worker.mjs`
- `node --no-warnings --test tests\qaWorker.test.mjs`
- Batch JSON parse check for all files in `docs\agent-batches`
- `npm run typecheck`
- `npm run lint`
- `npm test` (439/439 tests)
- `npm run qa:worker -- --batch price-trust` twice to confirm the second run used different product searches
- `npm run build`
- `node --no-warnings --test tests\qaWorker.test.mjs tests\serper.test.mjs tests\recommendationResultValidation.test.mjs tests\requirementValidation.test.mjs tests\productPageUrl.test.mjs`
- `node --check scripts\qa-worker.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test` (436/436 tests)
- `npm run qa:loop -- --batches price-trust`
- `npm run build`
- `npm run qa:worker -- --batch price-trust --mode live`
- `node --no-warnings --test tests\recommendationResultValidation.test.mjs tests\serper.test.mjs tests\requirementValidation.test.mjs tests\productPageUrl.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run qa:loop -- --batches broad-mainstream`
- `npm run qa:worker -- --batch broad-mainstream --mode live`
- `node --no-warnings --test tests\priceParsing.test.mjs`
- `node --no-warnings --test tests\productAssets.test.mjs`
- `node --no-warnings --test tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run qa:loop -- --batches price-trust`
- `npm run qa:worker -- --batch price-trust --mode live`
- `npm run build`
- `node --check scripts\agent-loop-controller.mjs`
- `npm run qa:loop -- --batches price-trust`
- `npm run lint`
- `node --check scripts\qa-worker.mjs`
- `node --check scripts\agent-loop-controller.mjs`
- `node --check scripts\verify-loop-result.mjs`
- `npm run qa:worker -- --batch "price-trust"`
- `npm run qa:worker -- --batch "broad-mainstream"`
- `npm run qa:worker -- --batch price-trust --mode live`
- `npm run qa:loop -- --batches price-trust,broad-mainstream,requirement-units`
- `npm run qa:loop`
- `npm run qa:verify`
- `npm run typecheck` (inside `qa:loop`)
- `npm run lint` (inside `qa:loop`)
- `npm run lint`
- `npm test` (inside `qa:loop`)
- `npm run build`

## 2026-06-18

### Changed
- Documented organic non-product filtering so article, forum, support, deal, review, and list pages can be used as evidence but not shown as product cards.
- Documented editorial seeding, where curated best-of lists can help discover real product candidates without becoming recommendations themselves.
- Added QA notes for live result-quality fixes and remaining follow-up areas.

### Verified
- Markdown documentation committed in `8986f63`.

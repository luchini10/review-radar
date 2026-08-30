# Agent Run Summary

This file is a plain-English history of what Codex did in the Review Radar repo.

Detailed QA results live in `docs/qa-loop-results.md`.

The technical overview lives in `ReviewRadar-Overview.md`.

New entries should keep the same format and stay easy to read.

## Codex Run - 2026-07-02 Phase 6C

**Goal:** Audit the production tree for product-specific patches without changing behavior or starting the live variance pilot.

**What it checked:** Audited all 61 tracked production TypeScript/JavaScript files, 62 production-touching commits since 2026-06-20, issue-specific model/brand/product terms, model-token literals, conditional/scoring uses, 207 unique hard-coded domains across 20 files, and production imports.

**Verdict:** PASS WITH WATCH ITEMS. Five finding groups are acceptable generalized data, four are acceptable source/category rules, one is comments/examples with no behavior, and zero are must-generalize blockers.

**Watch items:** Product-page host/path rules are repeated across defensive boundaries and can drift. HP unit/brand disambiguation and named floor-cleaner families are justified shared mechanisms but should stay centralized and regression-tested.

**What changed:** Added `docs/phase-6-product-specific-patch-audit.md` and updated Phase 6 tracking documents only.

**Tests run:** Typecheck passed; lint reported 0 errors and 3 existing warnings; full suite passed 782/782 across 117 suites; eval reported no red flags.

**Live checks run:** None. Phase 6C used zero live calls.

**Scope:** No production code, test, script, fixture, baseline, app/API/UI behavior, ranking, discovery, identity, price, citation, eligibility, source-upgrade, product-type, requirement, or final-selection behavior changed. Phase 6D did not start.

**Phase 6C commit:** `388f955`.

**Next recommended step:** Phase 6D variance pilot only after explicit approval of all six searches and the estimated ~280 Serper-call budget.

## Codex Run - 2026-07-01 Phase 6B

**Goal:** Build the zero-live Phase 6 regression wall for RR-007 through RR-068 without changing production behavior.

**What it checked:** Audited 68 issue records, 64 top-level test modules, the tracked synthetic fixture, current Phase 6 measurement artifacts, and the existing deterministic protections for all required safety and quality mechanisms.

**What it changed:** Added `docs/phase-6-regression-wall.md`. Added one direct RR-012 availability-formatting test and strengthened the existing fallback test to directly prove RR-025 near-match funnel retention.

**Coverage result:** All 62 wall issues are classified. The range contains 57 Fixed, 4 Needs Investigation, and 1 Won't Fix. RR-014/RR-015 remain measurement-only; RR-037/RR-045 remain provider-variance-bound. No production behavior gap or later fix-phase blocker was found.

**Tests run:** Focused additions passed 22/22; typecheck passed; lint reported 0 errors and 3 existing warnings; full suite passed 782/782 across 117 suites; eval reported no red flags.

**Live checks run:** None. Phase 6B used zero live calls.

**Scope:** No production code, script, live fixture, generated baseline, app/API/UI behavior, ranking, discovery, identity, price, citation, eligibility, source-upgrade, requirement, or final-selection behavior changed. Phase 6C did not start.

**Phase 6B commit:** `e2f3cf3`.

**Next recommended step:** Phase 6C patch audit only after explicit approval.

## Codex Run - 2026-07-01 Phase 6 master-plan promotion

**Goal:** Add the complete reconciled Phase 6 master to the repo and make it authoritative for all Phase 6 work.

**What it changed:** Replaced the shorter repo plan at `docs/phase-6-reliability-gauntlet-plan.md` with the complete desktop master. Updated the scorecard, batches, handoff, next task, Overview, test memory, QA log, change log, and issue register to name the master as the sole Phase 6 program source of truth.

**Authority boundary:** The master governs Phase 6 scope, sequence, budgets, gates, evidence rules, and exit criteria. Supporting Phase 6 artifacts cannot override it. The issue report remains authoritative for issue status, and the Overview remains authoritative for product architecture.

**Verification:** The desktop and repo master copies matched exactly after promotion. All tracked changes were documentation only.

**Live checks run:** None.

**Scope:** No production code, test, script, fixture, app behavior, issue status, or Phase 6B work changed.

**Next recommended step:** Phase 6B regression wall only after explicit instruction.

## Codex Run - 2026-07-01 Phase 6A reconciliation

**Goal:** Reconcile the committed Phase 6A instrument with the merged Phase 6 master plan without deleting completed work.

**What it checked:** Compared the canonical plan, scorecard, live-batch policy, worked historical examples, tracking docs, and commit `d01fda5`.

**What it changed:** Documentation only. Safety remains zero-tolerance and is no longer labeled provisional. `NotApplicable` now differs from missing `NotScored` evidence. The existing deduction formula remains the canonical v0.1 draft. Leader targets must be approved after Phase 6D and before Phase 6E.

**What it preserved:** Both historical worked examples, the seven batches, six-call variance design, 12-15-call baseline ceiling, fixture policy, script inventory, proposed automation, and every Phase 6A verification result.

**Tests run:** Typecheck passed; lint reported 0 errors and 3 existing warnings; full suite passed 781/781 across 117 suites; eval reported no red flags.

**Live checks run:** None.

**Scope:** No production code, test, script, fixture, app behavior, issue status, or Phase 6B work changed.

**Next recommended step:** Phase 6B regression wall only after explicit instruction.

## Codex Run - 2026-07-01 Phase 6A

**Goal:** Build only the Phase 6 reliability instrument: rubric v0.1-draft, report templates, release gates, live batch definitions, and fixture policy.

**What it checked:** Verified the 68-issue register (0 Open, 4 Needs Investigation), Phase 5 completion records, 64 test files, 22 live fixtures, all eight existing measurement tools, and the current debug-envelope field groups.

**What it changed:** Added `docs/phase-6-scorecard-template.md` and `docs/phase-6-live-search-batches.md`. The scorecard documents the plan-defined safety/quality axes, process gates, deduction formula, ranking anchors, evidence modes, missing-data handling, report formats, schema, and proposed approval-only extensions. The batches document defines B1–B7, core-10, rotation, the 2×3 variance pilot, fixture tiers, and a zeroed ledger.

**Worked examples:** Replay-only M3 scoring produced 65/C for the current shop-vac fixture with incomplete evidence. Historical gas-grill produced quality 69 but final F because an exact card was a camping stove. No M2 current-code claim was made.

**Tests run:** Typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781 across 117 suites; eval clean.

**Live checks run:** None. Phase 6A used zero live calls.

**Scope:** Documentation/templates only. No app code, app tests, pipeline behavior, executable scripts, issues, or fixes changed. Phase 6B and later did not start.

**Next recommended step:** Phase 6B regression wall only, after explicit instruction.

## Codex Run - 2026-07-01 Phase 5 closeout

**Goal:** Verify Phase 5 is complete, all high-risk protections remain green, the issue register is accurate, and the repo is ready for a separately approved Phase 6 planning step.

**What it checked:** Audited all 68 issues and the Phase 5 handoff docs, ran a 448-test focused safety matrix and the complete 781-test suite, replayed representative saved fixtures, and inventoried untracked local artifacts.

**What it changed:** Documentation only. Marked Phase 5 closed, documented the four intentional measurement/provider uncertainties, recorded fixture limitations, and changed the next task to Phase 6A planning/readiness after explicit instruction.

**Tests run:** Focused high-risk matrix 448/448; full suite 781/781; typecheck passed; lint 0 errors with 3 existing warnings; eval clean.

**Fixture checks:** Current `shop vac` replay contains only conventional utility wet/dry vacuums. Current-code reassessment removes the archival dog-food recipe conflict. Older electric-toothbrush, air-purifier, and dash-cam traces replay but are treated as historical where later fields are absent.

**Live checks run:** None.

**Scope:** No issue status, production code, app behavior, ranking, discovery, source-upgrade, identity, price, eligibility, image, product-type, final-selection, UI, or API behavior changed. Phase 6 was not started.

**Next recommended step:** Approve Phase 6A planning/readiness only; define its fixed query set, budget, stop conditions, fixture policy, and success metrics before execution.

## Codex Run - 2026-07-01 RR-068

**Goal:** Fix only the household floor-cleaner product-type leak in shop-vac searches before Phase 6.

**What it checked:** Proved that no shop-vac product-type rule existed. Discovery accepted CrossWave/Floor ONE candidates through broad wet/dry vocabulary, and requirement validation fell back to category-term matching that could use the assigned category.

**What it changed:** Added shared `shop_vac` and `household_floor_cleaner` intent classes. Strong floor-washer, vacuum-mop, hard-floor-cleaner, carpet/spot/upholstery-cleaner, and cross-brand floor-cleaner-family identity now vetoes shop-vac exact eligibility even when a title also says `wet dry vacuum`. Discovery type evidence excludes retailer labels and query-derived snippets.

**Why the change matters:** Household floor-washing appliances no longer masquerade as utility wet/dry vacuums. Real shop/garage/jobsite wet-dry vacuums still pass, and explicit floor-cleaner searches still work.

**Tests run:** Fail-first 118/124 with six intended failures; focused final 125/125; broad safety 455/455; full suite 781/781; typecheck passed; lint 0 errors with 3 existing warnings; eval clean.

**Fixture proof:** Revalidating the Phase 5J fixture removed all four CrossWave products from exact and near results while keeping RIDGID HD0900 and two Vacmaster utility vacuums exact.

**Live checks run:** Exactly one `shop vac` save/replay. Two exact and one near result remained, all conventional Armor All utility wet/dry vacuums. Exact AA255W source-upgrade evidence attached safely. No household floor cleaner, unsafe page, suspicious price, or wrong-model evidence appeared.

**Scope:** RR-068 only. RR-054/RR-061 and RR-007/RR-008/RR-041/RR-042/RR-063 through RR-067 remain green. No ranking, final-selection, price, image, general page-eligibility, source-upgrade, or UI behavior changed. Phase 6 was not started.

**Implementation commit:** `cc2da0a`.

**Next recommended step:** Run Phase 5 closeout/remeasurement only after explicit instruction; do not start Phase 6 automatically.

## Codex Run - 2026-07-01 Phase 5J

**Goal:** Fix RR-061 product-image safety and RR-054 fallback debug visibility only, without starting Phase 6.

**What it checked:** Reproduced image candidates that accepted page URLs, image directories, generic artwork, and unrelated page metadata. Reproduced fresh fallback responses that ran filtering, enrichment, revalidation, and final selection but omitted those diagnostics from debug output.

**What it changed:** Product images now require safe asset shape plus source-derived same-product context. Product-page identity scopes metadata and JSON-LD images, and source-upgrade images use the shared resolver after the existing identity gate. Recommendation-producing Serper fallbacks now emit the stages they actually ran, final-selection trace, search plan, source-upgrade empties, and explicit bypass reasons in debug mode only.

**Why the change matters:** Suspicious page/logo/category/navigation assets no longer fill product image fields, while valid product images still attach. Current fallback fixtures remain diagnosable instead of looking like old pre-trace data.

**Tests run:** Fail-first focused 35/41 with six intended failures; focused final 174/174; broad safety 417/417; full suite 772/772; typecheck passed; lint 0 errors with 3 existing warnings; eval clean.

**Live checks run:** Exactly one `shop vac` save/replay. Seven final cards had real image responses; no page, logo, placeholder, category, article, support, or HTML asset was used as an image. The normal path ran, so RR-054 live fallback output remains deterministic-only.

**Adjacent issue:** Opened High RR-068. Four Bissell CrossWave household floor cleaners appeared among seven exact shop-vac cards. Phase 5J did not alter product-type, requirement, ranking, discovery, final-selection, or page-eligibility behavior, and no RR-068 fix was attempted.

**Scope:** RR-061 and RR-054 only. RR-041/RR-042 and RR-007/RR-008/RR-063 through RR-067 remain deterministically green. Phase 6 was not started.

**Implementation commit:** `708ee98`.

**Next recommended step:** Diagnose and fix RR-068 narrowly before Phase 6, using a generalized shop-vac utility-product versus floor-washer subtype rule.

## Codex Run - 2026-07-01 RR-067

**Goal:** Fix only the candidate-side horsepower `HP` brand false-negative before Phase 5J.

**What it checked:** Traced target and candidate brand resolution separately. Confirmed RR-052 already protected target metadata, while candidate `evidenceBrand` trusted provider brand fields before checking safe source-derived identity.

**What it changed:** Ambiguous HP metadata now yields to a different source-derived known brand or to the non-HP target brand when safe title/path/snippet evidence supports it. Horsepower measurement syntax is removed before HP brand matching. Genuine HP and Hewlett-Packard products remain supported.

**Why the change matters:** Exact HART/tool evidence is no longer rejected because a provider confused horsepower with Hewlett-Packard, while wrong-brand and wrong-model evidence remains blocked.

**Tests run:** Fail-first 95/97; focused final 98/98; broad safety 346/346; full suite 764/764; typecheck passed; lint 0 errors with 3 existing warnings; eval clean.

**Live checks run:** One `shop vac` save/replay. HART did not recur. Exact RIDGID WD3050 evidence containing `3.5-Peak HP` attached price, rating, review count, and citation; nearby WD3050A and unrelated products remained rejected.

**Next recommended step:** Phase 5J for RR-061 and RR-054 only, after explicit instruction.

## Codex Run - 2026-06-30 Phase 5I retry

**Goal:** Fix RR-041 and RR-042 only by making source-upgrade eligibility and its single fallback more reliable without weakening product identity.

**What it checked:** Reproduced the current all-or-nothing trigger and empty-results-only fallback before editing. Audited the RR-063 through RR-066 identity boundary, API debug contract, fixture replay, eligibility, price, citation, product-type, requirements, ranking, and final selection.

**What it changed:** A model-qualified, requirement-passing candidate now upgrades when it is missing at least two of verified price, owner rating, and identity-safe product-specific commerce evidence. The existing zero-result fallback remains, and the same one fallback may run after all nonempty primary candidates are identity-rejected. Debug traces now record selection reasons and primary/fallback outcomes.

**Why the change matters:** One weak signal can no longer hide an otherwise unsupported candidate, while unsafe primary results no longer consume the only safe retry opportunity. Both stages still require the same source-derived same-product identity before any commerce field attaches.

**Tests run:** Focused source-upgrade/API/replay 121/121; focused source-quality 90/90; broad named safety 342/342; typecheck passed; lint 0 errors with 3 existing warnings; full suite 760/760; eval reported no red flags.

**Live checks run:** One approved `shop vac` save/replay. Exact RIDGID WD1060 and DEWALT DXV09P evidence attached safely. HART VOC1212PW used the zero-primary fallback and safely rejected all returned candidates.

**Remaining issue:** RR-067 is open. Provider metadata can misread horsepower `HP` as candidate brand and reject exact HART/model evidence. This is a safe false-negative, not an unsafe attachment.

**Next recommended step:** Fix RR-067 narrowly before Phase 5J, preserving genuine HP and explicit conflicting-brand controls.

## Codex Run - 2026-06-26 Phase 3I

**Goal:** Implement Phase 3I Path A by improving only the source-quality-upgrade shopping query construction.

**What it checked:** Read the Phase 3I handoff docs, Phase 3H QA result, `lib/requirementEvidenceRescue.ts`, and `tests/sourceQualityUpgrade.test.mjs`. Confirmed the Phase 3H bottleneck was a source-upgrade query that returned zero shopping candidates before identity matching or evidence attachment.

**What it changed:** Added a source-upgrade-specific query builder that prefers concise product identity over long display titles and avoids duplicated category suffixes. The general missing-evidence rescue query path was left unchanged.

**Why the change matters:** Source-quality upgrade now searches cleaner identity phrases such as `4-Burner Propane Gas Grill`, `Napoleon Rogue XT 425 SIB`, `Makita XFD131`, and `Tapo RV30C Plus` instead of overlong queries like `... Gas Grill gas grill`.

**Tests run:** Focused source-quality-upgrade tests passed. Full verification commands are recorded in the Phase 3I QA log entry.

**Live checks run:** None in this phase. Phase 3I is deterministic only; Phase 3J is the focused live proof.

**Next recommended step:** Run Phase 3J focused live proof for `gas grill` and `cordless drill` after all deterministic checks are green.

## Codex Run - 2026-06-26

**Goal:** Save the user-provided Codex phased handoff plan and make the next task clear for future agents.

**What it changed:** Created `docs/codex-handoff-phased-plan.md` with the full phased plan and updated `docs/agent-next-task.md` so the current next task is Phase 3H: live diagnostic using Phase 3G fields.

**Why the change matters:** Future Codex and Claude sessions now have a durable repo-local handoff file that names the current phase, the diagnostic fields to inspect, and the rule to avoid coding before the Phase 3H bottleneck is proven.

**Tests run:** None. Documentation-only cleanup; no app code or live searches.

**Next recommended step:** Run the Phase 3H live diagnostic for `cordless drill` and `gas grill`, then update the handoff plan and QA log with the result.

## Codex Run - 2026-06-22 08:10

**Goal:** Reduce ReviewRadar search time without weakening product trust, price trust, or hard requirement checks.

**What it checked:** Reviewed the new timing output, the recommendation API route, final OpenAI research call, review evidence enrichment, missing-evidence rescue, local environment settings, and the related tests.

**What it found:** The slow timed search was not slow because of GPT-5.5. It used GPT-5.4 Mini. The biggest delays were final OpenAI research, review evidence enrichment, missing-evidence rescue, Serper discovery, and optional narration.

**What it changed:** Added a shared speed policy that limits expensive verification to the products most likely to be shown. Review evidence and missing-detail rescue now check a few products at the same time instead of one-by-one. Rescue now focuses on the most important facts first. The final OpenAI step now gets a stronger shortlist instead of every raw candidate. Optional narration is off by default locally.

**Why the change matters:** ReviewRadar keeps the strict trust rules, but it stops spending full proof effort on lower-priority products that probably will not appear in the visible results. This makes normal deep searches faster without intentionally lowering result quality.

**Tests run:** Focused performance, evidence, rescue, and API contract tests passed. Typecheck passed. Lint passed. Full unit tests passed with 522/522 tests. Production build passed.

**Live checks run:** Ran the same timed localhost search: `toaster oven`, `$200`, `air fry, easy to clean, compact countertop size`.

**Before/after proof:** Before this work, that search took about 124 seconds. After the speed changes, it took about 72 seconds. The slowest stages after the fix were final OpenAI research, Serper discovery, AI discovery strategy, review evidence enrichment, and missing-evidence rescue.

**Remaining issues:** The timed toaster-oven search still returned near matches instead of exact matches. That appears to be a separate requirement strictness or evidence-verification issue, not the speed issue fixed in this run.

**Next recommended step:** Run a QA pass focused on why `compact countertop size` keeps products in near matches, then decide whether that phrase should be treated as a softer preference or verified in a more reliable way.

## Codex Run - 2026-06-22 07:37

**Goal:** Add timing logs so slow ReviewRadar searches can be diagnosed by stage.

**What it checked:** Reviewed the recommendation API route, model defaults, request payload wiring, debug response behavior, and API contract tests.

**What it found:** ReviewRadar was still defaulting to GPT-5.4 Mini, so the slowdown was likely from the heavier search and verification pipeline rather than GPT-5.5.

**What it changed:** Added timing checkpoints around model calls, Serper discovery, follow-up discovery, final research, citation filtering, requirement filtering, review evidence enrichment, product-page/asset enrichment, missing-evidence rescue, scoring, optional narration, and final cleanup. Debug responses now include timing data, and the dev server prints a compact timing summary.

**Why the change matters:** After a slow test search, we can see whether the time went to OpenAI, Serper, product-page fetching, evidence rescue, narration, or another stage instead of guessing.

**Tests run:** API contract timing test passed. Typecheck passed. Lint passed. Full unit tests passed with 514/514 tests. Production build passed.

**Live checks run:** None. This change prepares the next live checks by making their timing visible.

**Before/after proof:** Before, a slow search only showed a generic timeout or long wait. After, debug output includes total time and the slowest stages, such as `openai_final_research`, `serper_discovery`, `product_asset_enrichment`, or `missing_requirement_evidence_rescue`.

**Remaining issues:** We still need one or two live searches from the app to identify the actual slowest stage in real use.

**Next recommended step:** Start the dev server, run a slow search, then inspect the `[ReviewRadar timing]` output from the terminal.

## Codex Run - 2026-06-21 19:09

**Goal:** Change ReviewRadar so the final top results prefer distinct strong products instead of forcing different retailers.

**What it checked:** Reviewed the current markdown notes, final ranking code, duplicate product merging, product-page eligibility rules, focused tests, full project checks, deterministic QA agents, and live localhost API searches.

**What it found:** The final selector could still hide strong products from the same retailer. Live QA also found a separate trust issue where an eBay browse page could appear as an exact wet/dry-vac product.

**What it changed:** Removed the final retailer cap from Best Match selection. Kept duplicate-product and near-duplicate-family limits. Preserved alternate retailer offers when the same product is merged. Added a shared rule so eBay browse/category pages cannot become product cards.

**Why the change matters:** ReviewRadar should pick the best distinct products, not artificially spread picks across retailers. It should also keep browse pages out of exact product cards.

**Tests run:** Focused tests passed. Typecheck passed. Lint passed. Full unit tests passed with 513/513 tests. Production build passed. Deterministic eval passed. Deterministic RR agents passed.

**Live checks run:** Ran `cordless drill`, `$300`, `brushless, battery and charger`; and `wet dry vac`, `$200`, `shop vacuum, good suction, reliable`.

**Before/after proof:** The wet/dry-vac search first showed an eBay browse page as an exact match. After the classifier fix, the exact match became a real Vacmaster product page. The new product-diversity test also proves seven distinct products from the same retailer can all stay visible.

**Remaining issues:** Live searches can still return fewer exact matches when price or required details cannot be verified. That is expected behavior, but it should keep showing as close matches rather than fake exact matches.

**Next recommended step:** Run live RR agents on more retailer-heavy categories like grills, refrigerators, TVs, air purifiers, and office chairs to confirm the top 7 improves across more product types.

## Codex Run - 2026-06-21 00:07

**Goal:** Implement Phase 5 and Phase 6 by making ReviewRadar retry important missing rubric facts, then run a full hardening pass.

**What it checked:** Reviewed the requirement-evidence rescue flow, rubric missing facts, scoring/evidence tests, full project checks, deterministic QA agents, and a live localhost API search.

**What it found:** ReviewRadar could track and weight missing rubric facts, but it was not yet using those high-value gaps to drive targeted rescue searches.

**What it changed:** Extended the existing rescue step so it retries critical and important rubric facts after hard requirements. If a retry verifies the fact for the same product, the specific missing rubric gap is cleared and the supporting evidence is kept.

**Why the change matters:** ReviewRadar now gets one more chance to prove important facts like price, dimensions, fit, capacity, or compatibility before final ranking. That should reduce stale "missing fact" warnings and improve trust.

**Tests run:** Focused rescue/evidence/scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 486/486 tests. Production build passed. Deterministic QA agents passed.

**Live checks run:** Ran `refrigerator`, `$2500`, `must be stainless steel` against the local API.

**Before/after proof:** The new regression test proves a missing `Current product price` rubric fact can be retried, verified, added as offer metadata, and removed from the missing-facts list. The live refrigerator smoke test returned 3 exact matches and 5 close matches, with the top product showing a verified `$2,099` price and one remaining dimension/clearance gap honestly.

**Remaining issues:** No repeated root causes were found in the deterministic QA loop. Live QA should keep rotating product categories.

**Next recommended step:** Run live RR agents later with different product categories to see whether rubric-fact retries help beyond appliances.

## Codex Run - 2026-06-20 23:05

**Goal:** Make missing buying-rubric facts smarter by giving them importance levels.

**What it checked:** Reviewed missing rubric facts, evidence unknowns, ranking penalties, confidence caps, focused tests, and full project checks.

**What it found:** Missing rubric facts were being counted too evenly. A missing minor detail could count too much like a missing critical fact.

**What it changed:** Added a shared importance helper that labels missing rubric facts as critical, important, or minor. Critical facts now lower ranking and confidence more than minor facts. Missing facts are sorted by importance before they are stored.

**Why the change matters:** ReviewRadar should care more about missing price, availability, product type, fit, capacity, compatibility, or safety than missing a smaller cosmetic or convenience detail.

**Tests run:** Focused product-evidence and scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 485/485 tests. Production build passed.

**Live checks run:** No live API search was needed for this small ranking refinement.

**Before/after proof:** Before, one missing minor fact could count like one missing critical fact. After, missing current price or dimensions carries more ranking pressure than missing color options.

**Remaining issues:** Live QA should keep watching whether the importance levels are too harsh or too soft for certain product types.

**Next recommended step:** Run live RR agents on varied products to see whether the new importance weighting improves ranking quality.

## Codex Run - 2026-06-20 22:47

**Goal:** Start Phase 4 by making missing buying-rubric facts lower confidence and ranking strength without automatically rejecting useful products.

**What it checked:** Reviewed product evidence enrichment, missing-data scoring, confidence caps, focused tests, full project checks, and a live refrigerator search.

**What it found:** ReviewRadar could use the buying rubric for searches and scoring, but products missing important rubric facts could still look too confident. Those missing facts needed to be tracked in one reusable way.

**What it changed:** Added missing rubric facts as evidence unknowns. Added a capped ranking penalty and confidence cap when important rubric facts are missing. Added safeguards so already verified price, finish, type, dimensions, capacity, model, and availability facts are not falsely marked missing.

**Why the change matters:** Shoppers should see the strongest, best-verified products first. A product can still be shown when some facts are missing, but ReviewRadar should be more cautious about ranking and trust.

**Tests run:** Focused product-evidence and scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 483/483 tests. Production build passed.

**Live checks run:** Ran `refrigerator`, `$2500`, `must be stainless steel` against the local API.

**Before/after proof:** The live run returned 2 exact matches and 5 close matches. The stronger exact match had no missing rubric facts, while weaker or missing-price products carried rubric unknowns and lower confidence.

**Remaining issues:** This does not yet force deeper extraction for every missing fact. Future phases can improve how ReviewRadar verifies specs that are hard to find.

**Next recommended step:** Move to the next phase only after another live QA run confirms the confidence/ranking pressure is helping across more than appliances.

## Codex Run - 2026-06-20 20:57

**Goal:** Start Phase 3 by making the buying rubric guide product evidence searches and evidence classification.

**What it checked:** Reviewed the evidence ladder, product evidence queries, Reddit owner-opinion searches, negative-evidence retries, rubric scoring, and a live refrigerator search.

**What it found:** The rubric could describe what matters, but evidence gathering was still mostly generic. A live refrigerator run also showed that positive stainless-steel evidence could accidentally match a negated red flag about stainless steel not being verified.

**What it changed:** Added rubric-guided evidence queries for product facts, quality signals, owner-review themes, and red flags. Attached the rubric internally to products before evidence enrichment. Let rubric-supported source text become positive or negative evidence. Added a guard so negated red flags require negative or uncertain source context.

**Why the change matters:** ReviewRadar can now actively look for the facts and review themes that matter for each product category instead of only using the rubric at the end for ranking.

**Tests run:** Focused rubric/evidence/scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 480/480 tests. Production build passed.

**Live checks run:** Ran `refrigerator`, `$2500`, `must be stainless steel` against the local API.

**Before/after proof:** The live run generated a refrigerator-specific rubric, returned exact matches, kept missing-price products as close matches, and did not show the negated stainless-steel red-flag false positive.

**Remaining issues:** Better page extraction could still help close matches where product pages exist but current prices or specs are not extracted.

**Next recommended step:** Run live RR agents with varied categories to see whether rubric-guided evidence improves non-appliance searches too.

## Codex Run - 2026-06-20 16:23

**Goal:** Test the new recommendation logic with a stainless-steel refrigerator search under `$2,500`, then fix any serious issue found.

**What it checked:** Ran a live local API search, inspected exact and close matches, reviewed price-trust behavior, and ran focused and full project checks.

**What it found:** The rubric worked, but price trust had a problem. A full-size LG refrigerator could treat a `$515` promo/add-on-sized amount as if it were the verified refrigerator price.

**What it changed:** Tightened the shared price sanity rules for full-size refrigerators while keeping compact and mini fridges separate. Added a regression test so a fake-low full-size refrigerator price is suspicious, but a real compact fridge price can still pass.

**Why the change matters:** ReviewRadar should not tell shoppers a full-size refrigerator costs a few hundred dollars when that number is likely a promo, add-on, accessory, or bad extracted price.

**Tests run:** Focused price, asset, scoring, and requirement tests passed. Typecheck passed. Lint passed. Full unit tests passed with 477/477 tests. Production build passed.

**Live checks run:** Ran `refrigerator`, `$2500`, `must be stainless steel` against the local API before and after the fix.

**Before/after proof:** Before the fix, a suspicious `$515` full-size refrigerator could be exact. After the fix, exact matches had verified under-budget prices and stainless-steel evidence, while missing-price products stayed as close matches.

**Remaining issues:** Price extraction can still be improved for close matches where the app finds a product page but cannot verify the current store price.

**Next recommended step:** Run live RR agents again with appliance-heavy searches to see whether this catches other fake-low full-product prices.

## Codex Run - 2026-06-20 15:26

**Goal:** Add a universal product-quality rubric so ReviewRadar can understand what matters for a search without needing a hand-written profile for every product type.

**What it checked:** Reviewed discovery strategy generation, search expansion, final prompt context, ranking/scoring, debug output, and a live local API search.

**What it found:** Category-fit scoring helped known categories, but it still depended on hand-written profiles. That meant new categories could fall back too much on generic popularity, price, and citation signals instead of product-specific quality signals.

**What it changed:** Added a buying rubric to the OpenAI discovery strategy. Added shared rubric scoring that rewards products when their evidence supports generated quality signals and penalizes supported red flags or missing important facts. Added rubric search queries, prompt context, debug output, and tests.

**Why the change matters:** ReviewRadar can now ask what matters for almost any product category, then use that answer as a controlled ranking signal. This should make recommendations more accurate without creating a custom category profile for every product.

**Tests run:** Focused rubric/discovery/scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 476/476 tests. Production build passed.

**Live checks run:** Ran a live local API search for `trail running shoes`, `$150`, `good grip, cushioning, durable outsole`, avoiding road-only shoes.

**Before/after proof:** The live search returned a real buyable product as `#1 Best Match`, generated rubric-based score fields, and kept missing-price products out of exact matches.

**Remaining issues:** The rubric is still a scoring nudge, not a full evidence extractor. Future work can improve how product pages surface deeper rubric facts before scoring.

**Next recommended step:** Run live RR agents with rotated categories to see whether the rubric improves ranking quality across products that do not have hand-written profiles.

## Codex Run - 2026-06-20 13:25

**Goal:** Complete Phase 2 by making ReviewRadar rank better-documented products higher using small category-specific quality signals.

**What it checked:** Reviewed category profiles, spec extraction, category-fit scoring, product eligibility, ranking tests, and a live toaster-oven search against the local API.

**What it found:** Category-fit scoring already existed, but it was off by default and only covered a few categories. The live toaster-oven test also found that a quick-start guide could appear as a close match.

**What it changed:** Turned category-fit scoring on by default with a safety switch. Added category profiles for toaster ovens, microwaves, TVs, monitors, and laptops. Added spec extraction for wattage, slice capacity, cooking functions, quart capacity, max temperature, screen size, refresh rate, memory, and storage. Blocked manual and quick-start guide pages from product cards.

**Why the change matters:** ReviewRadar can now give a small ranking boost to products with useful category facts, so stronger and better-documented products are more likely to rise above thin listings. Manual pages can still help as evidence, but they should not appear as products.

**Tests run:** Focused category/spec/product-eligibility tests passed. Typecheck passed. Lint passed. Full unit tests passed with 474/474 tests. Production build passed.

**Live checks run:** Ran a live local API search for `toaster oven`, `$300`, `countertop, easy to clean, good reviews`.

**Before/after proof:** The live search returned 3 exact toaster-oven matches with toaster-oven category-fit signals. No displayed result was a full-size oven, range, stove, cooktop, quick-start guide, or user manual.

**Remaining issues:** Category-fit scoring is still intentionally small. More phases are needed to improve discovery breadth and deeper evidence ranking.

**Next recommended step:** Move to the next phase: improve candidate discovery so the app finds more strong mainstream products before final ranking.

## Codex Run - 2026-06-20 09:10

**Goal:** Complete Phase 1 of the broader product-accuracy plan by making ReviewRadar better at telling close product types apart.

**What it checked:** Reviewed category matching, form-factor checks, Serper candidate filtering, search-query expansion, source-pack retailer queries, requirement validation, and the live local API behavior for a toaster-oven search.

**What it found:** The app could treat `toaster oven` too much like broad `oven`. That meant full-size wall ovens, ranges, stoves, or cooktops could look close enough to pass some checks. It also trusted assigned category text too much instead of requiring product evidence to prove the product type.

**What it changed:** Added a shared product-type intent classifier. Connected it to requirement validation and Serper pre-filtering. Updated toaster-oven search wording so searches stay focused on countertop/toaster-oven products. Added tests proving wall ovens and ranges do not pass toaster-oven validation.

**Why the change matters:** ReviewRadar should recommend the actual kind of product the shopper asked for, not a larger sibling product, accessory, or substitute that happens to share a word.

**Tests run:** Focused product-type tests passed. Typecheck passed. Lint passed. Full unit tests passed with 471/471 tests. Production build passed.

**Live checks run:** Ran a live local API search for `toaster oven`, `$300`, `countertop, easy to clean, good reviews`.

**Before/after proof:** The live toaster-oven search returned 2 exact toaster-oven matches and 5 close toaster-oven matches. No displayed result was a wall oven, range, stove, cooktop, or full-size oven.

**Remaining issues:** This is only Phase 1. More phases are still needed for stronger category profiles, better candidate generation, and deeper evidence-based ranking.

**Next recommended step:** Move to Phase 2 after confirming this product-type gate holds up in more live searches.

## Codex Run - 2026-06-20 06:49

**Goal:** Build one shared product trust layer so ReviewRadar stops fixing bad product pages and bad prices in scattered places.

**What it checked:** Reviewed Serper product intake, final result validation, product-page button selection, price reliability, budget matching, ranking, requirement validation, and QA worker checks.

**What it found:** Several parts of the app had their own page and price safety rules. That made it possible to fix one area while another area still allowed a review article, category page, fake-low price, financing amount, or weak price into results. Live QA also showed that brand alternatives like `DeWalt or Milwaukee` and `Sony or Bose` were too weakly parsed.

**What it changed:** Added a shared buyable-product classifier and a shared price-trust validator. Connected them to search intake, final validation, product URL selection, exact/near match gating, scoring, card price handling, and QA workers. Also improved brand-alternative parsing and added safe brand-line aliases for major tool lines like DeWalt `20V MAX` and Milwaukee `M12 FUEL`.

**Why the change matters:** ReviewRadar now has one central place to decide whether a page is a real product and whether a price can be trusted. Improving those rules once should improve the whole pipeline. Broad brand searches should also be less likely to miss obvious mainstream brands because of retailer title wording.

**Tests run:** Typecheck passed. Lint passed. Full unit tests passed with 465/465 tests. Production build passed. Focused trust-layer, ranking, brand parsing, and requirement tests passed.

**Live checks run:** Ran the live agent loop across price-trust, broad-mainstream, requirement-units, wrong-category, and non-product-pages batches. Also ran a direct live check for `cordless drill`, `$200`, `DeWalt or Milwaukee, battery included`.

**Before/after proof:** Before this change, page and price trust rules were scattered and brand-alternative phrases could stay vague. After this change, tests confirm non-product pages cannot become product cards, suspicious prices cannot pass budget checks, evidence-only URLs cannot become product buttons, and brand alternatives become firm brand filters.

**Remaining issues:** The live drill check still showed close matches but no exact matches because price evidence was missing/not trusted and `battery included` evidence was not strong enough. This should be improved through better live price discovery and kit/battery evidence enrichment, not by weakening price trust.

**Next recommended step:** Improve price discovery and battery-included evidence enrichment for broad tool searches, then rerun live agents.

## Codex Run - 2026-06-20 01:00

**Goal:** Fix all issues found by the advanced live QA sweep.

**What it checked:** Reviewed price parsing, product reliability, Serper product filtering, final result validation, requirement validation, exact/near match filtering, and the live worker findings. Rechecked refrigerator, TV, office chair, garden hose, and gaming laptop searches against localhost.

**What it found:** Price floors missed major appliances and large TVs. Sale articles and listing pages could still look like products. `Not a gaming chair` was parsed correctly but matched too literally. Plain `50 ft length` was treated like a minimum instead of a specific length. Some wrong-category pages could survive as close matches.

**What it changed:** Added stronger price sanity checks for refrigerators, dishwashers, large TVs, and related full products. Blocked more sale/listing page titles. Made gaming/racing chairs concrete avoid-term evidence. Treated plain length requests as exact length matches. Added early filtering for wrong-length candidates.

**Why the change matters:** ReviewRadar should be less likely to show fake low prices, non-product pages, ignored dealbreakers, wrong lengths, or off-category filler results.

**Tests run:** Focused regression tests passed. Typecheck passed. Lint passed. Full unit tests passed with 448/448 tests. Build passed.

**Live checks run:** Rechecked counter-depth refrigerator, 65-inch TV, office chair with `not a gaming chair`, 50 ft garden hose, and gaming laptop searches.

**Before/after proof:** The original flagged result classes were removed from the live rechecks. A follow-up TV check also showed the `$10` 65-inch TV price was no longer allowed as an exact verified product price.

**Remaining issues:** Large-appliance price discovery is now safer but still conservative. Some refrigerator products may show as close matches when current price cannot be verified.

**Next recommended step:** Run the live RR agents again later with rotated searches to see whether these broader fixes hold across new products.

## Codex Run - 2026-06-20 00:36

**Goal:** Run a deeper live QA sweep to find as many ReviewRadar issues as possible without fixing code in this turn.

**What it checked:** Ran all five live agent batches against localhost: price trust, broad mainstream searches, unit/spec requirements, wrong-category leakage, and non-product page leakage. Also reviewed the worker result files manually for issues the agents did not flag strongly enough.

**What it found:** The automated agents found two high-priority issues: one refrigerator result had suspiciously low `$100` price evidence, and one TV search showed non-product pages as product cards. Manual review found extra risks: gaming chairs appeared as exact office-chair matches even though the search said not gaming chair, a 100 ft hose appeared as an exact match for a 50 ft hose search, category/listing pages leaked into laptop and TV results, and a camera lens appeared as a near match for a gaming laptop search.

**What it changed:** No app code was changed. The agent controller updated the QA report, QA results log, and next-task file for this test run.

**Why the change matters:** This gives the next fix pass a better target list. The biggest broad themes are price trust, non-product page filtering, avoid-term enforcement, unit matching, and wrong-category cleanup.

**Tests run:** Typecheck passed. Lint passed. Unit tests passed with 445/445 tests. The deterministic eval pipeline passed. Production build passed.

**Live checks run:** Live localhost QA ran across all five agent batches with low parallelism.

**Before/after proof:** This was a finding-only run, so there is no before/after fix proof yet. The proof is in the worker outputs and the updated QA report.

**Remaining issues:** Fix the suspicious refrigerator price first, then fix broader non-product page leakage, avoid-term/category leakage, and unit-length exact-match mistakes.

**Next recommended step:** Run a generalized fix pass starting with `docs/agent-next-task.md`, then rerun the wrong-category and non-product-pages live batches.

## Codex Run - 2026-06-20 00:13

**Goal:** Fix the live agent price-trust problem where ReviewRadar could show suspiciously tiny product prices, and clean up related product-card leaks found during the same test.

**What it checked:** Reviewed the price parser, product reliability checks, product card price display, duplicate detection, Serper product filtering, final result validation, and requirement validation. Also ran a live localhost search for `air purifier`, `$250`, `Levoit only, good for bedroom, HEPA filter`.

**What it found:** The app had price safety checks, but they were too narrow. A tiny price could still look valid for common full-product categories like air purifiers, printers, vacuums, office chairs, and cordless drills. The live check also showed that buying-advice articles could still appear as product-like near matches.

**What it changed:** Added broader price sanity checks, a new suspicious-price label, safer product-card price display, better duplicate detection for the same product across retailers, and a reusable filter for "things to avoid when buying/purchasing" advice pages.

**Why the change matters:** Shoppers are less likely to be misled by accessory, promo, payment-plan, or variant prices pretending to be the full product price. Product results should also stay focused on buyable products instead of advice articles.

**Tests run:** Focused price/filter/dedupe tests passed. Typecheck passed. Lint passed. Full unit tests passed with 445/445 tests. Build passed.

**Live checks run:** Re-ran the Levoit air-purifier search against the local ReviewRadar API.

**Before/after proof:** Before the fix, live agents found suspicious low prices like `$10` and `$35`. After the fix, the Levoit search returned 6 exact matches with verified prices, no suspicious exact prices, and no "things to avoid when purchasing" article leak.

**Remaining issues:** Close matches can still appear when some details are unverified. That is acceptable when exact matches are clean and close matches are labeled separately.

**Next recommended step:** Run the live RR agents again with rotated searches to see whether the broader price-trust fixes hold across more categories.

## Codex Run - 2026-06-19 18:20

**Goal:** Fix the remaining Nike running-shoes live issue where the app could show close matches only because prices were over budget or not verified.

**What it checked:** Reviewed search-query generation, AI discovery strategy ordering, the final research prompt, the previous live-agent result, and a fresh localhost API search for `running shoes`, `$200`, `Nike only`.

**What it found:** The budget checker was mostly doing its job. The deeper issue was that AI-added expansion searches could run ahead of the app's safer brand/category/budget searches, which let premium or unknown-price Nike lines crowd out affordable mainstream options.

**What it changed:** Protected the app-generated hard-filter searches so brand/category/budget searches stay first. Normalized AI-added follow-up searches to firm budget wording like `under $200`. Updated the final research instructions to look for mainstream in-budget models before filling broad brand searches with premium or unknown-price products.

**Why the change matters:** Broad realistic searches should not falsely look impossible when common in-budget products exist. This helps ReviewRadar find affordable mainstream products before it decides there are no exact matches.

**Tests run:** Focused discovery and search-query tests passed. Typecheck passed. Lint passed. Full unit tests passed with 442/442 tests. Build passed.

**Live checks run:** Re-ran `running shoes`, `$200`, `Nike only` against the local ReviewRadar API.

**Before/after proof:** Before the fix, that live check could return only close matches. After the fix, it returned `Nike Pegasus 41 Men's Road Running Shoes` as an exact match at `$101.97`.

**Remaining issues:** Some close matches can still appear when products have unknown prices or weaker verification. That is expected as long as exact matches are available and close matches are labeled separately.

**Next recommended step:** Run the live RR agents again later with rotated searches to see whether other broad brand-and-budget categories expose similar discovery gaps.

## Codex Run - 2026-06-19 17:50

**Goal:** Fix the live RR agent issue where review/article pages appeared as product cards.

**What it checked:** Reviewed the live broad-mainstream worker result, the search rotation state, Serper product discovery, final result validation, requirement filtering, and product-page URL selection.

**What it found:** The rotating live agents did work, but this was the first live run after rotation was added, so the live broad-mainstream batch started at the beginning of its pool. It found one real issue: Nike running-shoe near matches included review/article pages such as Runner's World `tried and tested` pages and `Review:` style pages.

**What it changed:** Added shared filters so `Review:` headlines, `tried and tested`, `tested and reviewed`, hands-on review wording, and Runner's World review pages can be used as evidence but not shown as product cards.

**Why the change matters:** Shoppers should see buyable products in the results, not review articles pretending to be products.

**Tests run:** Focused product-page filtering tests passed. Typecheck passed. Lint passed. Full unit tests passed with 439/439 tests. The broad-mainstream agent loop passed. Build passed.

**Live checks run:** Re-ran the Nike running-shoes API search against localhost. Review/article pages no longer appeared in exact or near match names.

**Before/after proof:** Before the fix, live QA flagged `non_product_page_leakage` for Nike running shoes. After the fix, the same search returned no suspicious review/article product names.

**Remaining issues:** The live Nike running-shoes search still had no exact matches because price/budget evidence was over budget or unverified. That is a separate issue from review pages leaking into product cards.

**Next recommended step:** Run the live agents again later; rotation state now shows the next broad-mainstream run will start from the next product-search slice.

## Codex Run - 2026-06-19 13:08

**Goal:** Make RR agent runs use different product searches over time.

**What it checked:** Reviewed the QA worker, the agent batch files, the package scripts, and the agent loop docs.

**What it found:** The agent batches were fixed lists. That meant repeated runs could keep testing the same products, which made the QA loop less useful over time.

**What it changed:** Added rotating search pools to the worker and expanded every batch with more realistic searches. Each run now uses the next slice of that batch's pool and records the rotation details in the worker result.

**Why the change matters:** The agents will cover more product categories and edge cases over time instead of getting comfortable with the same few searches.

**Tests run:** Checked the QA worker syntax. Ran the focused QA worker tests. Parsed every agent batch JSON file. Typecheck passed. Lint passed. Full unit tests passed with 439/439 tests. Build passed.

**Live checks run:** None. This was a worker/batch behavior change, not a live product-quality run.

**Before/after proof:** Before the change, running the price-trust worker repeatedly used the same basketball-hoop and stroller-combo searches. After the change, the first run used those searches and the second run moved on to laptop and propane-grill searches.

**Remaining issues:** Live agent runs may take longer over time because the rotated searches are broader and less rehearsed.

**Next recommended step:** Use `Run RR live agents` again when ready and watch `searchRotation` in the worker result/report to see which searches were tested.

## Codex Run - 2026-06-19 12:25

**Goal:** Fix the RR agent next task from the live price-trust run.

**What it checked:** Re-ran the stroller/car-seat combo API search with debug enabled, reviewed the live worker, checked product-page filters, and ran the price-trust worker again.

**What it found:** The stroller/car-seat combo failure did not repeat, so it was most likely a temporary research/API failure. The worker was labeling that kind of temporary failure too broadly as a localhost problem. A separate live price-trust check also showed basketball rules/dimensions pages could appear as product-like near matches.

**What it changed:** Live workers now retry temporary failures once and use clearer labels for connection problems versus temporary research/API problems. Review Radar also blocks NBA rules/dimensions pages and Pinterest dimension drawings from showing as product cards, while still allowing real product pages such as named Nike shoe pages.

**Why the change matters:** The agent next-task file should now point to real repeated product-quality problems instead of one-off temporary API errors. Shoppers are also less likely to see rules, drawings, or reference pages where product recommendations belong.

**Tests run:** Focused QA worker and filtering tests passed. Typecheck passed. Lint passed. Full unit tests passed with 436/436 tests. The deterministic price-trust agent loop passed. Build passed.

**Live checks run:** Ran the live `price-trust` worker against localhost. It passed with no suspicious flags.

**Before/after proof:** Before the fix, the next-task file pointed to `localhost_or_api_unavailable` for `car seat stroller combo`. After the fix, the next-task file says no repeated worker failures were found, and the live price-trust worker passed.

**Remaining issues:** No remaining issue for this next-task fix. Future live agent runs may still find new problems in other areas.

**Next recommended step:** Run the broader live agents again when ready, then fix the next repeated root cause they find.

## Codex Run - 2026-06-19 12:02

**Goal:** Run the live Review Radar QA agents against the real local app API.

**What it checked:** Ran the price-trust, broad-mainstream, and requirement-units live worker batches against localhost. The controller also ran typecheck, lint, unit tests, and the deterministic eval pipeline.

**What it found:** The code checks passed, and the broad-mainstream and requirement-units workers completed. The price-trust worker had one live API failure for `car seat stroller combo`, where the app returned the user-facing error “Something went wrong while researching. Try again.”

**What it changed:** No app code was changed. The agent controller updated the latest QA report, next-task file, and QA results log.

**Why the change matters:** The next task is now focused on whether the live recommendations API has a reliability/timeout problem for one price-trust search, rather than a product-ranking issue.

**Tests run:** Typecheck passed. Lint passed. Unit tests passed with 432/432 tests. The deterministic eval pipeline passed.

**Live checks run:** Live localhost QA ran for `price-trust`, `broad-mainstream`, and `requirement-units`.

**Before/after proof:** Before this run, the previous next task had been cleared. After this run, the current next task is `localhost_or_api_unavailable` for the `car seat stroller combo` live search.

**Remaining issues:** Investigate why the `car seat stroller combo` live price-trust search returned a 502 research error. Also note that the basketball-hoop price-trust search still showed a Pinterest dimensions page as a near match, although the worker did not flag it.

**Next recommended step:** Fix the RR agent next task by diagnosing the 502 research failure without hardcoding that product category.

## Codex Run - 2026-06-19 11:20

**Goal:** Fix the RR agent next task: non-product pages showing up as product recommendations.

**What it checked:** Reviewed the live agent report, the broad-mainstream worker output, Serper product discovery, citation/result validation, final requirement filtering, product-card URL selection, and live searches for Nike basketball shoes, Nike running shoes, and New Balance walking shoes.

**What it found:** Review Radar already blocked many bad pages, but it missed several shopping lookalikes: ranking articles, review pages, Nike newsroom pages, Nike category/brand pages, DICK'S advice/category pages, Foot Locker product-family pages, Klarna comparison pages, sneaker-news pages, and product-lineup articles.

**What it changed:** Strengthened the shared product-page filters so those pages can still be used as research evidence, but should not appear as product cards or replace a product card's buy link.

**Why the change matters:** Shoppers should see real buyable products, not articles, category pages, comparison pages, or brand news posts pretending to be products.

**Tests run:** Focused product-page filtering tests passed. Typecheck passed. Lint passed. Full unit tests passed with 432/432 tests. Build passed.

**Live checks run:** Ran the live broad-mainstream worker against localhost. The final run returned no suspicious flags.

**Before/after proof:** Before the fix, live QA reported `non_product_page_leakage` for basketball shoes. After the fix, the live broad-mainstream worker reported no suspicious flags across basketball shoes, running shoes, and walking shoes.

**Remaining issues:** Price verification for broad shoe searches can still be uneven. One live Nike running-shoes run had only near matches because prices were not verified, but the repeat live worker returned exact matches.

**Next recommended step:** Improve current-price retrieval for official and retailer shoe pages without weakening firm budget rules.

## Codex Run - 2026-06-19 10:18

**Goal:** Run the live Review Radar QA agents against the real local app API.

**What it checked:** Ran the price-trust, broad-mainstream, and requirement-units live worker batches against localhost. The controller also ran typecheck, lint, unit tests, and the deterministic eval pipeline.

**What it found:** The earlier stroller/car-seat suspicious low-price problem did not come back as the top issue. The live agents found two current issues worth fixing next: a non-product page leaking into a basketball-shoes result, and a broad running-shoes search returning no exact matches.

**What it changed:** No app code was changed. The agent controller updated its normal QA/report markdown files.

**Why the change matters:** This confirms the latest live QA status and gives the next fix agent a clear target instead of guessing from screenshots.

**Tests run:** Typecheck passed. Lint passed. Unit tests passed with 429/429 tests. The deterministic eval pipeline passed.

**Live checks run:** Live localhost QA ran successfully for `price-trust`, `broad-mainstream`, and `requirement-units`.

**Before/after proof:** Compared with the previous live QA screenshot, price trust is no longer listed as the top repeated root cause. The new top root cause is non-product-page leakage.

**Remaining issues:** Fix the non-product-page leakage first. The broad-search false no-exact issue should be handled after that.

**Next recommended step:** Investigate the shared non-product-page filtering logic so article, support, forum, deal, or roundup pages cannot appear as product recommendations.

## Codex Run - 2026-06-19 08:35

**Goal:** Fix the live QA price-trust problem where stroller/car-seat travel systems showed tiny prices like `$35` or `$10` as if they were full product prices.

**What it checked:** Reviewed the live agent report, the next-task file, the live worker output, price parsing, product asset enrichment, product reliability, recommendation scoring, budget validation, and related tests.

**What it found:** The app could treat payment, promo, accessory, or variant prices as usable full-product prices when those were the only prices found. That could make expensive products look cheap and let them appear as exact matches.

**What it changed:** Added shared price plausibility checks for high-ticket full-product categories. The price parser, card display, reliability check, scoring, and budget validation now agree that obviously tiny full-product prices should be treated as unverified.

**Why the change matters:** Review Radar is less likely to mislead shoppers with fake-cheap prices or rank a product as an exact match because of a payment-plan amount.

**Tests run:** Focused price, product asset, and recommendation scoring tests passed. Typecheck passed. Lint passed. Full unit tests passed with 429/429 tests. Build passed.

**Live checks run:** Ran the live `price-trust` worker against localhost. The previous stroller-combo `$35` and `$10` suspicious-price flags did not come back.

**Before/after proof:** Before the fix, live QA found 3 suspicious low-price findings for `car seat stroller combo`. After the fix, the focused live price-trust run found no suspicious low-price flags for that search.

**Remaining issues:** The same live worker found a separate basketball-hoop non-product-page issue in near matches. That should be handled in its own loop.

**Next recommended step:** Run a non-product-page live QA loop or fix the remaining broad-search false no-exact issue for Nike basketball shoes.

## Codex Run - 2026-06-19 08:20

**Goal:** Create a simple shared markdown file that summarizes Codex runs, plus a desktop shortcut so it is easy to open.

**What it checked:** Checked whether `docs/Agent Run Summary.md` already existed, checked whether the desktop shortcut already existed, and checked the current repo status before making changes.

**What it found:** The summary file did not exist yet. The desktop shortcut did not exist yet. The repo already had unrelated uncommitted work from earlier Review Radar changes.

**What it changed:** Created `docs/Agent Run Summary.md` with a clear format for future Codex run summaries. Created a desktop shortcut named `Agent Run Summary`.

**Why the change matters:** This gives you one easy place to see what Codex did in plain English without reading raw logs or technical QA files.

**Tests run:** Verified that the markdown file exists. Verified that the desktop shortcut exists. Verified that the shortcut points to the markdown file.

**Live checks run:** None. This was a documentation and shortcut setup task only.

**Before/after proof:** Before this run, there was no shared agent-run summary file and no desktop shortcut. After this run, the repo has `docs/Agent Run Summary.md`, and the Desktop has `Agent Run Summary.lnk` pointing to that file.

**Remaining issues:** No remaining setup issue for this file or shortcut. No app behavior was changed.

**Next recommended step:** Use this file after future Codex sessions to record a short, readable summary of what happened.

## Codex Run - 2026-06-26 Phase 3J

**Goal:** Run the focused live proof after the Phase 3I source-upgrade query cleanup.

**What it checked:** Saved and replayed fresh live fixtures for `gas grill` and `cordless drill`, then inspected the new source-upgrade trace fields and final-selection trace.

**What it found:** Both fresh fixtures had `sourceUpgradeTraces: []`, so no source-upgrade attempt fired and the shorter Phase 3I query was not exercised live. This makes Phase 3J complete but inconclusive, not a proof that the query fix worked or failed.

**What changed:** Docs only. The QA log, phased handoff, next-task file, and this summary were updated.

**Live checks run:** `gas grill` and `cordless drill` only. No full baseline.

**Next recommended step:** Run a tiny Phase 3J extension on previously trigger-producing categories, starting with `robot vacuum` and `shop vac`, before making another behavior change.

## Codex Run - 2026-06-26 Phase 3J Extension

**Goal:** Retry the source-upgrade live proof on categories more likely to produce source-upgrade attempts.

**What it checked:** Saved and replayed fresh live fixtures for `robot vacuum` and `shop vac`, then inspected source-upgrade traces, candidate counts, candidate samples, evidence attachment, and final-selection trace.

**What it found:** `robot vacuum` produced no source-upgrade attempts. `shop vac` produced two attempts using the shortened Phase 3I queries `Makita XCV11Z` and `RIDGID WD1450`, but both returned zero shopping candidates and attached no evidence.

**What changed:** Docs only. The QA log, phased handoff, next-task file, and this summary were updated.

**Live checks run:** `robot vacuum` and `shop vac` only. No full baseline.

**Next recommended step:** Run a focused Phase 3K source-upgrade search-coverage fallback with deterministic tests before another live proof.

## Codex Run - 2026-06-26 Phase 3K

**Goal:** Add a small source-upgrade fallback query when compact model-only shopping searches return zero candidates.

**What it changed:** Source upgrade now tries the compact identity query first, then one identity-plus-category fallback only after zero shopping candidates. The debug trace records primary/fallback queries and candidate counts.

**What stayed the same:** Scoring, ranking, discovery, source-upgrade trigger logic, useful-commerce evidence logic, identity matching, model-token detection, trust gates, product eligibility, and the max source-upgrade target count were not changed.

**Tests run:** Focused source-quality tests passed 39/39. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 618/618. Eval red-flag checks were clean.

**Live checks run:** None. This phase is implemented but not live-proven.

**Next recommended step:** Run Phase 3L live proof on `shop vac` plus one unrelated previously attempted category to see whether the fallback returns candidates and attaches evidence safely.

## Codex Run - 2026-06-26 Phase 3L

**Goal:** Live-prove the Phase 3K source-upgrade fallback ladder.

**What it checked:** Saved and replayed fresh `shop vac` and `robot vacuum` fixtures, then inspected primary/fallback counts, identity evaluation, evidence attachment, final selection, and safety.

**What it found:** `shop vac` produced one source-upgrade attempt. Primary `Wet/Dry Vacuum DXV10SB` returned zero candidates, so fallback `Wet/Dry Vacuum DXV10SB shop vac` correctly ran; it also returned zero. `robot vacuum` produced no source-upgrade attempt.

**What changed:** Docs only. No app behavior changed.

**Live checks run:** `shop vac` and `robot vacuum` only. The conditional `gas grill` search was not needed. No full baseline.

**Verdict:** Phase 3K is partially live-proven: fallback control flow and trace fields work, but fallback shopping coverage did not improve in this sample. No unsafe candidate or merge appeared.

**Next recommended step:** Run Phase 3M as a diagnostic-only check to locate whether the zero candidates originate in the upstream Serper response, shopping-result parsing/normalization, or source-upgrade invocation context.

## Codex Run - 2026-06-27 Phase 3M

**Goal:** Determine whether source-upgrade zero results came from Serper, query identity, normalization, or later filtering.

**What it changed:** Added debug-only query and Serper Shopping trace fields plus replay output. No product-selection behavior changed.

**What it found:** Serper returned 40 raw results for the primary, fallback, and brand-preserving control queries. The first 20 results in each response were structurally usable, but all were rejected during product eligibility normalization. Correct product offers used Google Shopping search URLs that the listing-page gate blocks, and some `Shop-Vac` titles hit the generic `shop` title rule.

**Query finding:** The product title still contained DEWALT and brand detection found `DeWalt`, but the model-identity helper selected only `Wet/Dry Vacuum DXV10SB`. This is real but secondary because the brand-preserving control was also reduced to zero eligible candidates.

**Tests run:** Focused tests passed 90/90. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 624/624. Eval red-flag checks were clean.

**Live checks run:** Fresh `shop vac` and conditionally allowed `gas grill` fixtures, followed by three direct focused Serper Shopping probes. No full baseline.

**Next recommended step:** Phase 3N should safely normalize specific Google Shopping offer links and fix the `Shop-Vac` title false positive, while preserving all category/listing/article/accessory safety gates. Brand-preserving query construction remains a separate Phase 3O.

## Codex Run - 2026-06-27 Phase 3N

**Goal:** Fix RR-048 and RR-049 without widening general discovery or product-card eligibility.

**What it changed:** Source upgrade can now explicitly normalize a narrowly identified Google Shopping offer as evidence, preferring a merchant URL when available. Specific `Shop-Vac` product titles no longer collide with the generic `shop` page rule.

**What stayed the same:** Ordinary Google searches and Google offer URLs remain blocked as product cards. Scoring, ranking, final selection, source-upgrade trigger and query/fallback behavior, identity matching, model-token detection, and trust gates were not changed.

**Tests run:** Focused tests passed 88/88. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 630/630. Eval red-flag checks were clean.

**Live checks run:** One approved `shop vac` save/replay. It produced no source-upgrade attempt, so Phase 3N remains not live-proven. No unsafe candidate or evidence attachment appeared.

**Issue status:** RR-048 and RR-049 are deterministically fixed. RR-042 remains open pending live proof. RR-047 remains open for Phase 3O.

**Next recommended step:** Phase 3O should preserve detected brand identity in compact source-upgrade model queries, followed by an approved focused `shop vac` live proof.

## Codex Run - 2026-06-27 RR-051

**Goal:** Prevent synthetic query fallback text from helping a source-upgrade candidate pass same-product identity.

**What it changed:** Serper candidate snippets now record whether they came from the provider or from ReviewRadar's query fallback. Source-upgrade identity ignores query-derived snippets and the request-derived category while retaining real source identity evidence.

**What it proved:** The exact snippet-less wrong-product attachment is blocked; generic source titles cannot borrow target models from the query; real same-model titles and valid Google Shopping offers still attach.

**What stayed the same:** Query construction, fallback behavior, trigger logic, model-token detection, product eligibility, scoring, ranking, final selection, requirement filtering, and trust gates.

**Tests run:** Focused tests passed 84/84. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 634/634. Eval red-flag checks were clean.

**Live checks run:** None.

**Issue status:** RR-051 fixed. RR-047 remains open for Phase 3O. RR-042 remains under investigation pending a trigger-producing live proof.

**Next recommended step:** Phase 3O should preserve detected brand identity in compact source-upgrade queries.

## Codex Run - 2026-06-27 Phase 3O

**Goal:** Fix RR-047 by preserving reliable brand identity in compact source-upgrade model queries.

**What it changed:** Source-upgrade query construction now resolves trusted metadata brand first, then the existing shared detected brand, and combines it with the model token unless already present. Unbranded products retain the prior nearby-word behavior.

**Before/after:** `Wet/Dry Vacuum DXV10SB` became `DeWalt DXV10SB`; fallback became `DeWalt DXV10SB shop vac`. Long retailer-title filler is not restored.

**What stayed the same:** Scoring, ranking, discovery, trigger logic, fallback control flow and count, identity matching, RR-051 provenance safety, model-token detection, product eligibility, requirement filtering, and trust gates.

**Tests run:** Focused tests passed 89/89. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 639/639. Eval red-flag checks were clean.

**Live checks run:** None.

**Issue status:** RR-047 fixed. RR-042 remains under investigation pending an approved focused live proof. RR-048, RR-049, and RR-051 remain fixed.

**Next recommended step:** Request approval for one focused `shop vac` live proof of the combined source-upgrade fixes.

## Codex Run - 2026-06-27 Phase 3O Live Proof

**Goal:** Live-test the combined RR-048, RR-049, RR-051, and RR-047 source-upgrade fixes with one `shop vac` search.

**Verdict:** Failed due to unsafe evidence attachment.

**What it found:** Source upgrade fired twice and returned normalized Google Shopping candidates. Both RIDGID vacuum names were misread as HP-brand products because `Peak HP` was treated as Hewlett-Packard. The first `HP HD0900` result was an HP laptop; its offer URL echoed `HD0900` in the query parameter, identity matching passed, and laptop price/rating/review/citation data attached to the vacuum.

**Additional finding:** A RIDGID VAC1200 appeared with a verified, budget-usable `$10` price.

**What changed:** Docs only. No app behavior changed and no second live search ran.

**Issues:** Opened RR-052 and RR-053. Reopened RR-002. RR-042 remains under investigation.

**Next recommended step:** Fix RR-053 identity provenance first, then RR-052 ambiguous HP brand detection. Handle RR-002 price trust separately before another approved live proof.

## Codex Run - 2026-06-27 RR-053

**Goal:** Prevent Google Shopping/search URL query parameters from satisfying source-upgrade same-product identity.

**Root cause:** Identity evidence included complete candidate URLs. An HP laptop offer URL echoed `HP HD0900` in `q=`, allowing the target vacuum model to satisfy the model-token fast path despite a mismatching laptop title.

**What changed:** Candidate URL identity is now host plus path only. Query strings and fragments are ignored. Safe merchant product paths remain usable.

**What it proved:** The exact HP-laptop regression is rejected with no commerce evidence attached. A matching RIDGID source title still passes on a Google Shopping offer, and a real Makita model path still passes.

**What stayed the same:** Scoring, ranking, final selection, discovery, source-upgrade trigger, query/fallback construction, brand detection, model-token detection, product eligibility, requirement filtering, and price/citation trust.

**Tests run:** Focused tests passed 92/92. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 642/642. Eval red-flag checks were clean.

**Live checks run:** None.

**Issue status:** RR-053 fixed. RR-052 remains open. RR-002 and RR-042 remain under investigation.

**Next recommended step:** Fix RR-052 only by separating horsepower `HP` context from genuine Hewlett-Packard brand identity.

## Codex Run - 2026-06-27 Phase 4A

**Goal:** Prepare the canonical issue register for a diagnostic-first Phase 4 issue harvest.

**What it checked:** All 53 issue sections, ID continuity/uniqueness, required schema fields, severity/status totals, duplicate titles, overlap clusters, and unresolved diagnostic needs.

**What it found:** The register is internally consistent. IDs RR-001 through RR-053 are contiguous and unique; totals reconcile at 5 Critical, 25 High, 18 Medium, 5 Low, with 5 Open, 7 Needs Investigation, 40 Fixed, and 1 Won't Fix. Related records describe distinct layers rather than duplicates.

**What changed:** Documentation now groups related issues and maps unresolved evidence needs to Phase 4B through 4F. No issue status or severity changed.

**Live checks run:** None.

**App/test changes:** None.

**Next recommended step:** Phase 4B source-upgrade safety and reliability diagnostics with at most three approved live searches.

## Codex Run - 2026-06-27 Phase 4B

**Goal:** Diagnose source-upgrade trigger coverage, candidate normalization, identity safety, and attachment behavior after RR-047/RR-048/RR-049/RR-051/RR-053.

**Searches:** Fresh `shop vac`, `robot vacuum`, and `gas grill` fixtures, each replayed once.

**Result:** `shop vac` and `robot vacuum` produced no source-upgrade traces. `gas grill` produced one attempt: `[PDF] PRL364NLG` returned 2 raw, 2 structural, 2 eligible, and 2 normalized offers. A PLR book was identity-rejected despite the query in its URL; a matching Thermador range attached price and citation.

**Safety verdict:** No cross-product evidence merge occurred, and RR-051/RR-053 held live. Safe useful attachment is not proven because the only upgraded target was itself a wrong-type gas range/PDF in a gas-grill search.

**Other findings:** A Bissell troubleshooting article and an MHP product collection reached exact final results. A GE washer/dryer survived into the robot-vacuum near stream.

**Issues:** Reopened RR-007, RR-008, and RR-017. Updated evidence for RR-013, RR-041, RR-042, RR-048, RR-051, and RR-053. No new issue ID.

**App/test changes:** None.

**Next recommended step:** Phase 4C price-trust diagnostics with at most three fresh searches.

## Codex Run - 2026-06-27 Phase 4C

**Goal:** Diagnose fake-low, suspicious, accessory, and installment prices without changing trust behavior.

**Searches:** Fresh `shop vac`, `cordless drill`, and `pressure washer` fixtures, each replayed once.

**Primary result:** RR-002 reproduced on a second product. A Vacmaster 1.5-gallon vacuum received a `$10` Amazon offer, `verified` trust, `canUseForBudget: true`, and exact rank #7.

**Other price evidence:** Reviewed drill prices ($159/$219), pressure-washer prices ($99/$189/$229), and compact-vacuum prices ($36.55/$75.99/$100/$100.33) were plausible full-product or kit amounts. No installment price appeared.

**Other findings:** RR-052 reproduced twice. Pressure-washer detergent ranked exact #2, an advice article exact #6, a category page entered scoring, and six dishwashers survived into near.

**Issues:** Updated RR-002, RR-007, RR-008, RR-013, RR-017, and RR-052. No new issue ID and no status-count change.

**App/test changes:** None.

**Next recommended step:** Phase 4D product-type leakage and requirement diagnostics with at most four fresh searches.

## Codex Run - 2026-06-27 Phase 4D

**Goal:** Diagnose wrong product types, accessories/parts, variants, and requirement leakage across four categories.

**Searches:** Fresh `robot vacuum`, `basketball hoop`, `air purifier`, and `portable generator` fixtures, each replayed once.

**Result:** Wrong-type containment failed across categories. A washer/dryer remained near for robot vacuums; basketball wall art entered exact scoring; air-purifier documentation/category pages were selected; generator category pages and a battery power station reached final exact slots.

**New issues:** RR-054 for missing debug traces on current fallback responses; RR-055 for a valid `Generac ... Portable Inverter Generator` falsely failing `Portable`.

**Other issues:** Reopened RR-009 and updated RR-007, RR-013, RR-017, and RR-043.

**App/test changes:** None.

**Next recommended step:** Phase 4E market-leader discovery and citation diagnostics with at most five fresh searches.

## Codex Run - 2026-06-27 Phase 4E

**Goal:** Measure broad leader recall, citation quality, source diversity, and final-slate concentration.

**Searches:** Fresh `robot vacuum`, `gas grill`, `cordless drill`, `air purifier`, and `running shoes` fixtures.

**Benchmark result:** The four categories covered by `scripts/goldBenchmark.mjs` averaged `3.75/7` core leader families in the pool and `3.0/7` in final results.

**Main failures:** Ecovacs and Char-Broil leaders were lost at citation verify; repeated Roomba/Roborock, Nexgrill/Napoleon, RYOBI/DEWALT, and Blueair/GermGuardian families consumed large portions of final slates; retailer-only winners often outranked stronger evidence.

**Positive control:** Running shoes returned recognizable mainstream models across five brands, with independent editorial support on six of seven finalists.

**Issues:** Opened RR-056. Reopened RR-014 and RR-022. Updated RR-013 and RR-017.

**App/test changes:** None.

**Next recommended step:** Phase 4F broad rotating sweep with at most ten searches, followed by the final Phase 4 report.

## Codex Run - 2026-06-27 Phase 4F / Phase 4 Complete

**Goal:** Finish the diagnostic issue harvest with a ten-category rotating quality sweep and produce the Phase 5 fix-order recommendation.

**Searches:** Coffee maker, office chair, wireless earbuds, electric toothbrush, leaf blower, dog food, dehumidifier, dash cam, treadmill, and gaming monitor.

**Overall verdict:** ReviewRadar can produce strong category slates, as shown by running shoes and portions of earbuds/office chairs, but broad reliability is not ready for unsupervised trust.

**Critical finding:** RR-058. A Whynter wine-refrigerator Google offer passed source-upgrade identity for RPD-411WG dehumidifier, attached all commerce evidence, and helped the contaminated target rank #1.

**New issues:** RR-057 through RR-061. Phase 4 overall opened RR-054 through RR-061 and reopened RR-007, RR-008, RR-009, RR-014, RR-017, and RR-022.

**Final counts:** 61 total; 6 Critical, 26 High, 24 Medium, 5 Low; 13 Open, 13 Needs Investigation, 34 Fixed, 1 Won't Fix.

**App/test changes:** None. Twenty-five approved live searches ran across Phase 4B through 4F; no full baseline.

**Next recommended step:** Stop before Phase 5. With explicit approval, start with RR-058 only.

## Codex Run - 2026-06-27 Phase 5A

**Goal:** Fix RR-058 only by preventing unsafe same-brand wrong-product evidence from passing source-upgrade identity.

**Root cause:** RR-053 already removed Google Shopping query parameters from identity evidence, but the fallback overlap matcher counted repeated target tokens from the product name and metadata title. Repeated `Whynter` tokens could satisfy the threshold without a product-type check, and broad shared title words could also override an explicitly different same-family model.

**What changed:** Source-upgrade identity now consults the shared product-type verdict first. Wine/beverage refrigerator evidence explicitly conflicts with a dehumidifier request. A candidate source title that names a different model in the same model family is also rejected.

**What it proved:** The exact RPD-411WG dehumidifier / Whynter wine-refrigerator case now attaches nothing and reports `identity_rejected`. Valid same-product Whynter offers still attach; explicit RPD-561EGP evidence does not attach to RPD-411WG; uppercase measurement text does not create a false model conflict.

**What stayed the same:** Scoring, ranking, final selection, source-upgrade trigger, primary/fallback query construction, retry count, brand detection, target model-token extraction, product eligibility, price/citation trust, and user-facing result shape.

**Tests run:** Focused safety coverage passed 170/170. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 647/647. Eval red-flag checks were clean.

**Live checks run:** None.

**Issues:** RR-058 fixed. No issue opened. Register totals are 61 total, 12 Open, 13 Needs Investigation, 35 Fixed, and 1 Won't Fix.

**Next recommended step:** Stop. Begin Phase 5B only after explicit instruction, preserving Phase 5A while fixing the RR-052/RR-057/RR-034/RR-035/RR-044 identity-coverage cluster.

## Codex Run - 2026-06-27 Phase 5B

**Goal:** Fix only RR-052, RR-057, RR-034, RR-035, and RR-044 while preserving all Phase 5A source-upgrade safety.

**Root causes:** Shared brand matching treated horsepower `HP` as Hewlett-Packard and source upgrade trusted that ambiguous metadata. Model selection chose the first matching regex, allowing measurement phrases to outrank real models. The extractor omitted mixed word-number, descriptive, numeric-dash, and short brand-qualified family identities.

**What changed:** HP brand evidence is now context-sensitive. Source-upgrade model extraction ranks strong and family candidates, removes separated measurement/descriptor-number false positives, preserves meaningful series context, and supports the assigned model shapes. Structural leading-title identity supplies a brand when shared metadata/brand detection is absent.

**Safety:** Family-only identities can make a target eligible but cannot attach evidence without source-derived requested-category evidence. Different explicit same-family and numeric-dash models reject. Phase 5A RR-058 and RR-051/RR-053 provenance tests remain green.

**Tests run:** Nine fail-first assertions reproduced the gaps. Focused tests passed 183/183. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 660/660. Eval red-flag checks were clean.

**Live checks run:** None.

**Issues:** RR-052, RR-057, RR-034, RR-035, and RR-044 fixed. No new issue opened. Register totals are 61 total, 7 Open, 13 Needs Investigation, 40 Fixed, and 1 Won't Fix.

**Next recommended step:** Stop. Begin Phase 5C only after explicit instruction; reproduce RR-002 before changing price trust.

## Codex Run - 2026-06-28 Phase 5C

**Goal:** Fix RR-002 only by restoring cross-category trust handling for `$10` full-product offers while preserving legitimate cheap products.

**Root cause:** Shop-vac/plural wet-dry-vac, dash-camera, and wireless-earbud contexts had no class floor. The fallback absolute floor was exactly `$10`, so the inclusive plausibility check accepted `$10`; strong retailer metadata then marked it verified and budget-usable.

**What changed:** The existing class-sensitive floor now normalizes plural/wet-dry/shop-vac wording and includes conservative dash-camera and wireless-earbud floors. Below-floor evidence becomes suspicious, loses its trusted price and budget eligibility, displays as unverified, and cannot remain an exact Best Match. A `$12.99` wireless-earbud offer remains valid.

**Deterministic proof:** Four fail-first integration points reproduced the issue. Focused tests passed 116/116; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 665/665; eval red-flag checks were clean.

**Fixture proof:** Frozen replay retained the old `$10` exact results as historical evidence. Reassessing the same saved products through current code changed shop vac, dash cam, and wireless earbuds to suspicious, null-price, budget-ineligible, and exact-ineligible.

**Live proof:** Exactly three approved searches ran. No `$10` item reached exact results. Shop-vac `$1`/`$10` offers were suspicious and budget-ineligible; two `$10` earbuds were rejected from exact selection; a real `$20` Soundcore earbud remained verified at exact #3.

**New finding:** RR-062 opened after VIOFO A229 Pro received a verified `$19,999` product-page price in the fresh dash-cam run. It is separate from tiny-price RR-002, remains Needs Investigation, and was not fixed.

**Scope:** Only `lib/priceParsing.ts` behavior changed. No scoring, ranking, eligibility, taxonomy, citation, discovery, source-upgrade identity, UI, or full-baseline change.

**Issues:** RR-002 Fixed; RR-062 High / Needs Investigation. Register totals: 62 total, 7 Open, 13 Needs Investigation, 41 Fixed, 1 Won't Fix.

**Next recommended step:** Stop. Decide whether to diagnose RR-062 separately before Phase 5D; do not combine the two.

## Codex Run - 2026-06-28 RR-062 Diagnostic

**Goal:** Diagnose the malformed VIOFO A229 Pro `$19,999` price before Phase 5D without changing app behavior.

**Verdict:** Root cause confirmed from the saved Phase 5C fixture and a read-only reproduction against the cited VIOFO page. No ReviewRadar live search ran.

**Evidence path:** VIOFO carried no verified price through candidate verification and requirement filtering. Asset enrichment then added a lone Medium-confidence `retailer_page` offer of `19999`. The page contains an unrelated A139 widget with `data-price="19999"`, and current `buildMetadata` reproduced the same offer.

**Root cause:** Broad page-metadata extraction scans unscoped structured price attributes. Bare `19999` is parsed as dollars instead of Shopify-style minor units, without checking that the surrounding product is A139 rather than A229 Pro. Price trust verifies the lone retailer-page signal because it has low-price protections but no corresponding product-affinity or malformed-high-price guard.

**Correction:** The `$322.99` source-upgrade sample in the Phase 5C fixture belongs to BlackVue DR770X, not VIOFO. VIOFO was not source-upgraded, so RR-062 is not a merge conflict.

**Classification:** Separate from RR-002. This is structured-page extraction/minor-unit handling with a secondary high-outlier containment gap; it is not Serper, source-upgrade identity, model parsing, or stale evidence.

**Tests run:** Focused price/assets/scoring/requirements/Serper tests passed 153/153. Typecheck passed. Lint had 0 errors and 3 pre-existing warnings. Full tests passed 665/665. Eval red-flag checks were clean.

**Changes:** Documentation only. App code, tests, fixtures, scoring, ranking, trust, eligibility, and UI behavior are unchanged.

**Issues:** RR-062 changed from Needs Investigation to Open. Register totals remain 62: 8 Open, 12 Needs Investigation, 41 Fixed, and 1 Won't Fix.

**Next recommended step:** Stop. With explicit instruction, fix RR-062 narrowly before Phase 5D by product-scoping structured metadata and safely handling bare minor-unit values without imposing a global high-price cap.

## Codex Run - 2026-06-28 RR-062 Behavior Fix

**Goal:** Fix only RR-062 before Phase 5D by binding structured prices to the target product without blocking legitimate expensive products.

**Root cause:** Asset enrichment treated page-wide and element-level price metadata as equivalent. It accepted an unrelated A139 `data-price="19999"` widget on the VIOFO A229 page, parsed the ambiguous bare integer as dollars, and promoted the resulting lone retailer-page offer to verified.

**What changed:** Matching schema.org products are selected by identity. Page-level and visible price fallbacks require matching page identity. Element-level structured prices require matching product context in the same tag. Bare integers convert from minor units only when the matching element explicitly declares `cents` or `minor`; otherwise they are ignored.

**Generalization and safety:** The rule applies to every product and host. There is no brand exception and no global price ceiling. Matching decimal/currency prices, explicit minor-unit values, standard schema.org offers, and a legitimate `$19,999` product remain valid. RR-002 and all existing price, scoring, and exact-budget protections remain green.

**Tests run:** Two RR-062 assertions failed before the fix. Product-assets passed 20/20; focused price/assets/scoring/requirements passed 123/123; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 672/672; eval red-flag checks were clean.

**Quality proof:** Saved-fixture reassessment no longer extracts `$19,999`; a stray `$1` visible value is contained as suspicious by RR-002. Exactly one fresh `dash cam` search ran. VIOFO A229 Pro 2CH ranked exact #2 at `$349.99`, verified from matching JSON-LD. No malformed high verified price appeared.

**Adjacent observations:** The live run added evidence to existing RR-013 (weak 70MAI winner) and RR-007/RR-017 (listing-style YADA backup-camera evidence below cutoff). No new issue ID opened and no adjacent behavior changed.

**Issues:** RR-062 changed from Open to Fixed. Register totals remain 62: 7 Open, 12 Needs Investigation, 42 Fixed, and 1 Won't Fix.

**Next recommended step:** Stop. Start Phase 5D only after explicit instruction, limited to RR-007, RR-008, and RR-009.

## Codex Run - 2026-06-28 Phase 5D

**Goal:** Fix RR-007, RR-008, and RR-009 without changing ranking, scoring, citation thresholds, product-type logic, price trust, or RR-062 behavior.

**Root cause:** Shared eligibility had structural blind spots: category-shaped `/product(s)/...` collections, support/advice/customer-service routes, and semantic documentation mirrors could look like specific products. Category context was not consistently supplied at discovery and final citation filtering.

**What changed:** Category context now reaches the shared classifier at both boundaries. Generic manufacturer collections are identified structurally, Best Buy product URL recognition is SKU-specific, and support/advice/learning/customer-service/documentation shapes are evidence-only. Valid product-detail pages remain eligible.

**Proof:** Five assertions failed before implementation. Focused tests passed 78/78; broad focused tests passed 192/192; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 678/678; eval red-flag checks were clean. Saved Phase 4 candidates reassess correctly.

**Live validation:** Exactly three searches ran. Generator collection pages, the Daikin collection, and `device.report` did not reach final/scored results. `shop vac` exposed a Shop-Vac customer-service path that survived citation verification but not requirement filtering; that exact path is now covered deterministically. No full baseline ran.

**Issues:** RR-007, RR-008, and RR-009 changed from Needs Investigation to Fixed. RR-013, RR-017/RR-043, and RR-055 received adjacent evidence only. No new issue ID. Totals: 62 issues; 7 Open, 9 Needs Investigation, 45 Fixed, 1 Won't Fix.

**Scope:** `lib/productAssets.ts` and RR-062 were untouched. Generated baselines and live fixtures remain untracked and uncommitted.

**Next recommended step:** Stop. Phase 5E is next only after explicit instruction and should remain limited to RR-017, RR-043, and RR-055.

## Codex Run - 2026-06-28 Phase 5E

**Goal:** Fix RR-017, RR-043, and RR-055 without changing ranking, scoring, price trust, citation thresholds, source-upgrade identity, or Phase 5D eligibility behavior.

**Root causes:** The shared product-type registry lacked the reproduced substitution families, and broad source snippets could lend requested-type words to wrong product titles. Separately, comparative negative prose could override a literal positive feature in product identity.

**What changed:** Added bounded type rules for portable generators, basketball hoops, and dash cams; strengthened pressure-washer and robot-vacuum rules; separated title/name identity from broader evidence for exclusive complements; and made literal identity authoritative for generic feature requirements before comparative prose.

**Proof:** Fail-first had four failing suites. Focused tests passed 83/83; broad safety tests 314/314; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 684/684; eval was clean.

**Live validation:** Four searches total. Shop-vac support content did not become a card. The first pressure-washer attempt exposed snippet borrowing; after refinement, ZEP disappeared from the trace. Portable-generator results contained no power stations, and twelve generator candidates passed `Portable`.

**Remaining proof gap:** GP3300i was removed at citation verification in the final generator run, so its post-fix live requirement path was not observed. Dash cam, basketball hoop, and robot vacuum were proved deterministically and against saved historical shapes, not with new live calls.

**Adjacent finding:** `Pressure Washers - Best Buy` reached exact #7 twice. RR-007 reopened; page eligibility was not changed.

**Issues:** RR-017/RR-043/RR-055 Fixed; RR-007 Needs Investigation. Totals: 62 issues; 5 Open, 9 Needs Investigation, 47 Fixed, 1 Won't Fix. No new issue ID.

**Scope:** Eight implementation/test files plus required docs. Generated baselines and live fixtures remain untracked.

**Next recommended step:** Stop. Prefer a narrow RR-007 eligibility diagnostic before Phase 5F; otherwise require an explicit decision to defer it and proceed to RR-022.

## Codex Run - 2026-06-28 RR-007 regression cleanup

**Goal:** Fix only the reopened RR-007 category/listing-page regression before Phase 5F.

**Root cause:** The Phase 5D Best Buy listing rule assumed a shallower `.c` catalog path, while the live page nested `pcmcat1597940389709.c` below department and category segments. Serper separately treated every Best Buy `/site/` path as product detail. The candidate therefore passed discovery and final shared eligibility.

**What changed:** Shared eligibility now recognizes nested catalog identifiers, generic department/browse paths, and faceted-listing parameters while exempting known product-detail URL shapes. Serper's Best Buy shortcut is limited to supported legacy `.p` and modern `/sku/` URLs and its listing diagnostics use the same catalog signal.

**Proof:** Three tests failed before implementation. Focused tests passed 89/89; broader Phase 5E safety tests passed 177/177; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 686/686; eval reported no red flags.

**Live validation:** Exactly one `pressure washer` search ran. It returned six exact products and one near product, all with specific product-detail primary URLs. The Best Buy catalog page was absent. A Craftsman collection URL remained only as secondary evidence behind a valid product-detail card.

**Issues:** RR-007 changed from Needs Investigation to Fixed. No new issue ID. Totals: 62 issues; 5 Open, 8 Needs Investigation, 48 Fixed, 1 Won't Fix.

**Scope:** No scoring, ranking, price, citation, product-type, requirement, source-upgrade identity, or UI behavior changed. Generated baselines and live fixtures remain untracked.

**Next recommended step:** Stop. Phase 5F may begin only after explicit instruction and should address RR-022 citation retention only.

## Codex Run - 2026-06-28 Phase 5F

**Goal:** Fix RR-022 citation retention without changing RR-013 scoring/ranking policy or weakening product-card trust.

**Root cause:** Product-page rescue ran only when zero citations survived. A verified editorial or same-host category URL could therefore suppress rescue, become primary, and make final eligibility drop a valid leader. Candidate-specific reachability also never ran when any URL anywhere in the response was already verified.

**What changed:** Added targeted reachability verification for unverified, product-specific LLM URLs; prioritized exactly verified product pages before secondary evidence; and added product path/title binding for manufacturer URL shapes. Generic family slugs, unrelated self-cites, and evidence-only pages remain blocked.

**Proof:** Three fail-first tests reproduced the current failure. Focused tests passed 69/69 and the broad safety matrix passed 282/282. Typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 690/690; eval reported no red flags.

**Fixture proof:** Frozen electric-toothbrush, dog-food, and wireless-earbud fixtures still show historical drops and cannot be reprocessed because they omit complete pre-verification citation objects. Current deterministic tests cover the reproduced URL/evidence shapes.

**Live validation:** Two searches ran. `electric toothbrush` retained all 28 candidates through citation verification and selected seven specific product-page cards. The first `dog food` run still dropped Purina/Hill's leaders and exposed a generic Purina family card; the final code deterministically retains the specific product slugs and blocks the family slug. No third call ran after the final refinement because the two-call cap was exhausted.

**Issues:** RR-022 Fixed; RR-007 remains Fixed; RR-013 unchanged. No new issue ID. Totals: 62 issues; 5 Open, 7 Needs Investigation, 49 Fixed, 1 Won't Fix.

**Scope:** Four implementation/test files plus required docs. No scoring, ranking, price, type, requirement, source-upgrade identity, UI, or broad discovery change. Generated baselines and live fixtures remain untracked.

**Next recommended step:** Stop. Optionally approve one dog-food confirmation of the final guard; Phase 5G otherwise requires explicit instruction and must address RR-013 only.

## Codex Run - 2026-06-28 Phase 5F dog-food live confirmation

**Goal:** Live-confirm the final Phase 5F citation-retention and path-binding behavior with exactly one `dog food` search.

**Verdict:** Partial. RR-022 is live-confirmed for dog food, but the run reopened RR-008.

**Live result:** The funnel went from 23 candidates to 16 after citation verification, 10 after requirement filtering, and 7 exact cards. Six specific Purina/Hill's products survived citation verification and were removed only at the requirement stage. The generic Purina `/pro-plan/products/dog-food` family card did not recur.

**Safety finding:** `Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets` became exact #5. Its Substack `/p/` route passed generic product-detail-path handling, and the question-style editorial title was not recognized as non-product content. No code fix was attempted.

**Proof:** Focused eligibility/citation/API tests passed 60/60; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 690/690; eval reported no red flags.

**Issues:** RR-022 remains Fixed and is live-confirmed for this path. RR-007 remains Fixed. RR-008 changed to Needs Investigation. RR-013 remains unchanged. Totals: 62 issues; 5 Open, 8 Needs Investigation, 48 Fixed, 1 Won't Fix.

**Scope:** Documentation only. The fresh dog-food fixture and all existing generated fixtures/baselines remain untracked and uncommitted.

**Next recommended step:** Stop before Phase 5G. Address RR-008 with a narrow generalized article-question and cross-host generic `/p/` eligibility cleanup after explicit instruction.

## Codex Run - 2026-06-28 RR-008 article-card cleanup

**Goal:** Fix only the reopened RR-008 editorial/question-page product-card regression before Phase 5G.

**Root cause:** Existing title rules missed interrogative/opinion titles, while generic `/p/` handling made the BK Pets Substack article look like product detail in shared eligibility, Serper, and final validation.

**What changed:** Shared eligibility now blocks interrogative and buying-decision editorial title shapes. Hosted publishing platforms are evidence-only. Genuine retailer and manufacturer `/p/` products remain valid; no host-specific BK Pets rule was added.

**Proof:** Three focused assertions failed before implementation. Focused eligibility/result/Serper tests passed 87/87; broad price/type/requirement/citation/source-upgrade regressions passed 192/192; typecheck passed; lint had 0 errors and 3 existing warnings; full tests passed 694/694; eval was clean.

**Live result:** Exactly one `dog food` search ran. The BK Pets article and all Substack/editorial cards were absent. Seven exact products and no near products remained; Purina and Hill's survived citation verification and final selection.

**Adjacent findings:** RR-007 reopened because Chewy `/brands/` family pages became primary product links. RR-063 opened because several cards carried same-brand citations for different recipes. No out-of-scope behavior changed.

**Issues:** RR-008 Fixed; RR-007 Needs Investigation; RR-063 High / Needs Investigation; RR-022 remains Fixed; RR-013 unchanged. Totals: 63 issues; 5 Open, 9 Needs Investigation, 48 Fixed, 1 Won't Fix.

**Scope:** Two implementation files, three test files, and required docs. Generated baselines and live fixtures remain untracked.

**Implementation commit:** `98b695a`.

**Next recommended step:** Stop before Phase 5G. Address the RR-007/RR-063 safety cluster only after explicit instruction.

## Codex Run - 2026-06-29 RR-007/RR-063 product-evidence safety

**Goal:** Fix generic family pages becoming primary product links and wrong-variant citations supporting specific product cards, without touching RR-013 or Phase 5G.

**Root causes:** Generic brand/family routes with numeric slugs passed the fallback product-path heuristic. Product-link selection let the generated card name act as source evidence for an existing URL. Citation verification checked reachability/page shape but not product-specific recipe/model identity.

**What changed:** Added a shared product-evidence identity verdict. Generic family/category routes are secondary-only; primary links require source-derived same-product identity; explicit recipe, flavor, life-stage, recipe-base, supplement-flavor, cosmetic-shade, and model conflicts are removed; unknown specific-product citations are rejected. Unsafe stale primary URLs are cleared before enrichment.

**Proof:** Fail-first produced 8 failures plus the missing identity module. Focused tests passed 84/84, broad safety tests 295/295, typecheck passed, lint had 0 errors and 3 pre-existing warnings, full tests passed 706/706, and eval had no red flags.

**Live result:** Exactly one `dog food` search ran. It returned 6 exact and 5 near products, all with specific `/dp/`, `/ip/`, or `/product/` primary URLs. No family, category, editorial, support, manual, or documentation page became a card. A generic Purina family page remained secondary only.

**Post-live refinement:** The run exposed a Blue Buffalo adult-versus-puppy/oatmeal citation and an unrelated Iams formula. Final deterministic rules remove both when the saved fixture is reassessed. No second live call ran.

**Issues:** RR-007 and RR-063 Fixed; RR-008 and RR-022 remain Fixed; RR-013 unchanged. Totals: 63 issues; 5 Open, 7 Needs Investigation, 50 Fixed, 1 Won't Fix.

**Scope:** Nine implementation/test files plus required docs. Generated baselines and live fixtures remain untracked. Implementation commit: `01414c1`.

**Next recommended step:** Stop. Phase 5G may start only after explicit instruction and must remain limited to RR-013 evidence-strength ranking.

## Codex Run - 2026-06-29 Phase 5G

**Goal:** Fix only RR-013 by ranking product-specific independent evidence above otherwise comparable retailer-only or self-only evidence without changing eligibility.

**Root cause:** Scoring used citation count and hostname heuristics but ignored verified `citation_type`. Manufacturer self-cites and retailers outside a short broad-retailer list could receive false independence credit, while genuine product-specific editorial support had no dedicated ranking term.

**What changed:** Added a capped `citationStrengthScore`: independent `+6` to `+8`, retailer-only `+2` to `+4`, self-only `-2`. Generic, conflicting, unknown-specific, and untyped citations receive no Phase 5G credit. Typed citation-derived source-quality and evidence signals use the same identity-safe citation set.

**Fail-first and proof:** Gas-grill and headphones cases both selected retailer-only winners before the fix. Focused ranking/trace tests passed 57/57; broad safety passed 348/348; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 712/712; eval had no red flags.

**A/B result:** With only Phase 5G toggled, Nexgrill moved #1 to #2 and Weber moved #2 to #1. The suspicious `$1` Weber stayed near-only. Retailer-only products remained eligible and rankable.

**Fixture proof:** Current gas-grill and cordless-drill fixtures lack an independent challenger. Running-shoes reassessment credited exact Saucony/Kayano editorial evidence while withholding credit from generic articles and wrong-model citations.

**Live proof:** None. No live search or broad baseline ran because the deterministic A/B gave cleaner causal proof than a variable provider response.

**Issues:** RR-013 Fixed; no other status changed. Totals: 63 issues; 5 Open, 6 Needs Investigation, 51 Fixed, 1 Won't Fix.

**Scope:** Seven implementation/test/harness files plus required docs. No discovery, citation retention, product identity, page eligibility, price, type, requirement, source-upgrade, or UI behavior changed. Implementation commit: `94c2e06`.

**Next recommended step:** Stop. Phase 5H may begin only after explicit instruction and must remain limited to RR-056, RR-060, and RR-059.

## Codex Run - 2026-06-29 Phase 5H

**Goal:** Fix RR-056 family concentration, RR-060 exact-model duplicates, and RR-059 broad-query niche-form-factor dominance, using RR-014 only as an outcome metric.

**Root causes:** Final selection compared URL-derived canonical IDs instead of strict shared model identity; its old family key was brand plus size and hard-collapsed rather than softly calibrating model-line repetition; form-factor flags were observational and did not include walking-pad/under-desk identity.

**What changed:** Added strict exact-model final-slot collapse, a conservative model-line key with a `12`/`24` soft repeat adjustment, and a `50`-point selection-only prior for unrequested niche form factors. Explicit niche requests remove the prior. Repeated retailers and genuinely distinct same-brand products remain allowed. Phase 5G score components and every hard trust/eligibility gate are unchanged.

**Fail-first and proof:** Three Phase 5H assertions failed before implementation. Focused selection/identity/form-factor and broad safety tests passed 303/303; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 724/724; eval had no red flags. The Phase 5G A/B remained Nexgrill `#1 -> #2`, Weber `#2 -> #1`, with the suspicious `$1` item near-only.

**Fixture proof:** The duplicate M27Q collapsed while M27Q2 remained. A mainstream 14-cup coffee maker moved above AeroPress, and Horizon 7.0 AT moved above the under-desk treadmill. Distinct Milwaukee M18 kits remained separate. Five RR-014 benchmark fixtures stayed neutral at mean `3.0/7`; no leader-recall gain is claimed.

**Live result:** Exactly one `electric toothbrush` search ran. A fourth Sonicare candidate received the capped family adjustment and fell below the final seven; Oral-B Pro 1000 filled the distinct slot. No non-product page became a final card, but one category page and three editorial/comparison pages remained exact-eligible below cutoff.

**Adjacent findings:** Opened RR-064 after DiamondClean Smart 9300 commerce evidence attached to a DiamondClean 9000 card and the contaminated card ranked #1. Reopened RR-007/RR-008 because an Oral-B bundles/category page, an ANSI blog, and two comparison articles remained `reliableEnoughForExact` below cutoff. No source-upgrade or eligibility code changed in response.

**Issues:** RR-056, RR-059, and RR-060 Fixed; RR-007/RR-008 reopened; RR-014 remains Needs Investigation; RR-064 Critical / Needs Investigation. Totals: 64 issues; 2 Open, 9 Needs Investigation, 52 Fixed, 1 Won't Fix.

**Scope:** Eleven implementation/test/debug files plus required docs. Generated baselines and live fixtures remain untracked. Implementation commit: `230d7bc`; documentation commit: `d78a9f5`.

**Next recommended step:** Stop before Phase 5I. Run a narrow fail-first RR-064 source-upgrade identity phase first, then address RR-007/RR-008 eligibility separately.

## Codex Run - 2026-06-30 RR-064 source-upgrade identity safety

**Goal:** Fix only RR-064 by preventing same-family conflicting models from donating source-upgrade price, rating, review-count, or citation evidence.

**Root cause:** The existing conflict detector compared alphabetic model prefixes. `diamondclean9000` and `smart9300` therefore did not conflict, and shared Philips/Sonicare/DiamondClean words later passed the fallback overlap.

**What changed:** The shared RR-063 variant guard now recognizes conflicting standalone 3-5 digit series values under meaningful shared family context, excluding years, prices, package counts, and measurements. Source upgrade applies this guard before any positive family/model overlap.

**Proof:** The exact 9000/9300 case failed before the fix. Focused tests passed 157/157; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 729/729; eval had no red flags.

**Live result:** One `electric toothbrush` run returned Smart 9300 first and rejected it as `identity_mismatch`, then safely attached an explicit 9000 offer. A 2100 attempt independently rejected a 4100 before attaching a 2100 result. No broad baseline ran.

**Issues:** RR-064 Fixed; RR-007/RR-008 remain Needs Investigation. Totals: 64 issues; 2 Open, 8 Needs Investigation, 53 Fixed, 1 Won't Fix.

**Scope:** Four implementation/test files plus required docs. No ranking, scoring, discovery, query, trigger, normalization, price, requirement, product-type, page-eligibility, or UI behavior changed. Implementation commit: `938b839`; documentation commit: `ce20707`.

**Next recommended step:** Stop. Address reopened RR-007/RR-008 pre-final eligibility separately before Phase 5I.

## Codex Run - 2026-06-30 RR-007/RR-008 pre-final eligibility cleanup

**Goal:** Fix only the reopened category/listing and editorial/comparison page leaks before Phase 5I.

**Root causes:** The shared classifier did not recognize paginated bundle collections, standards identifiers, comparison/vs titles, press-release announcement verbs, or common editorial subdomains. Product-detail path, image, price, or model shortcuts could then promote those pages.

**What changed:** Added generalized title, path, and subdomain evidence-page signals before every product shortcut. Specific product pages remain eligible; safe comparison/category evidence may remain secondary but cannot become a card, primary link, or product-specific proof.

**Proof:** Four boundary assertions failed before implementation. Focused tests passed 157/157; broad safety passed 330/330; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 735/735; eval had no red flags.

**Fixture/live result:** Current code removes the pre-fix MultiVu final #7 card. One fresh `electric toothbrush` run returned five specific product cards and no category, standards, blog, comparison, or press page in the exact-scored trace. An Oral-B lineup page remained secondary evidence only. RR-064 model safety remained green.

**Issues:** RR-007 and RR-008 Fixed; no new issue opened. Totals: 64 issues; 2 Open, 6 Needs Investigation, 55 Fixed, 1 Won't Fix.

**Scope:** One implementation file, four test files, and required docs. No ranking, discovery breadth, source-upgrade, price, type, requirement, final-selection, or UI behavior changed. Implementation commit: `50b0713`; documentation commit: `0762ff3`.

**Next recommended step:** Stop. Phase 5I may start only after explicit instruction.

## Codex Run - 2026-06-30 Phase 5I safety stop

**Goal:** Fix only RR-041/RR-042 source-upgrade trigger and fallback reliability without weakening evidence trust.

**Diagnosis:** Current trigger logic requires verified price, owner rating, and useful commerce evidence all to be absent. Current fallback runs only after zero primary candidates, not after a nonempty primary set produces no safe attachment. Two fail-first tests reproduced those paths.

**Candidate change:** A conservative missing-two-of-three trigger and one bounded fallback after `primary_no_safe_attachment`, plus debug-only decision/outcome fields. Focused tests passed 92/92; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 738/738; eval had no red flags.

**Live stop:** One `shop vac` run triggered two upgrades. RIDGID HD0900 safely attached exact evidence. Target `Amazon.com: RIDGID ... VAC1200` rejected a SKIL primary result, then incorrectly accepted `Amazon Basics 6-Gallon 3.5 HP Wet/Dry Vacuum` from fallback and attached its citation. The retailer-prefixed target name supplied false `Amazon.com` brand identity; the candidate had neither RIDGID nor VAC1200 identity.

**Outcome:** Opened Critical RR-065. Rolled back every app, replay, and test edit; no behavior was committed. The restored repository passed 735/735 tests, typecheck, lint with 0 errors, and eval. RR-041/RR-042 remain Needs Investigation. The second live search and Phase 5J were not run.

**Issues:** 65 total; 8 Critical, 28 High, 24 Medium, 5 Low; 3 Open, 6 Needs Investigation, 55 Fixed, 1 Won't Fix.

**Next recommended step:** Fix RR-065 narrowly, then restore the two Phase 5I fail-first cases and retry the bounded reliability work.

## Codex Run - 2026-06-30 RR-065 identity safety

**Goal:** Fix only RR-065 so retailer/source provenance cannot satisfy source-upgrade product identity.

**Root cause:** `sourceUpgradeBrand` consumed the unsanitized card title, while candidate identity included seller and URL-host text. `Amazon.com: RIDGID ... VAC1200` therefore used `Amazon.com` as brand, and an Amazon Basics vacuum passed on retailer plus broad wet/dry overlap because it exposed no explicit conflicting model for RR-063/RR-064 to reject.

**What changed:** Shared normalization removes only explicit leading source labels; seller and URL-host/query provenance are excluded; safe product paths remain. Reliable target brands must appear in source-derived candidate evidence. Amazon Basics remains a valid product brand. No Phase 5I trigger/fallback behavior changed.

**Proof:** Exact fail-first RR-065 reproduction failed with 74/75 source tests passing. Afterward, focused identity passed 90/90, broad named safety passed 340/340, typecheck passed, lint had 0 errors and 3 existing warnings, full tests passed 744/744, ranking baseline stayed stable, and eval had no red flags.

**Live result:** One `shop vac` run safely attached an exact RIDGID HD1400 offer from 20 eligible candidates. No wrong-brand identity attached. The prior VAC1200 target did not recur. The same run reopened RR-007 because a Bosch `/ocs-c/` family collection became exact #3 with a specific Home Depot VAC090AH page only secondary.

**Issues:** RR-065 Fixed; RR-007 Needs Investigation; RR-041/RR-042 unchanged; RR-063/RR-064 remain Fixed. Totals: 65 issues; 2 Open, 7 Needs Investigation, 55 Fixed, 1 Won't Fix.

**Commit:** Implementation `04f2933`.

**Next recommended step:** Fix the narrow RR-007 Bosch collection route before retrying Phase 5I. Do not start Phase 5J.

## Codex Run - 2026-06-30 RR-007 opaque collection-page cleanup

**Goal:** Fix only the reopened RR-007 manufacturer collection-page shape before any Phase 5I retry.

**Root cause:** Negative eligibility checks ran before positive shortcuts, but they did not recognize Bosch's opaque `ocs-c` CMS collection suffix. The final slug contained letters and digits, so the generic detail heuristic classified it as `buyable_product`; that verdict survived every later product-card boundary.

**What changed:** Added a shared strong-negative classifier for opaque collection suffixes and contextual manufacturer family/lineup/range/series routes. Collection shape wins over weak image, price, category-word, and catalog-digit signals. Known retailer detail routes and model-specific manufacturer pages remain eligible.

**Proof:** Fail-first passed 59/61 with only the exact classifier and final-card assertions failing. Focused final passed 61/61; broad named safety passed 308/308; typecheck passed; lint had 0 errors and 3 existing warnings; full suite passed 747/747; eval had no red flags.

**Fixture/live result:** The frozen fixture still records its historical output, but current-code reassessment flips the Bosch page to `listing_or_search`. Exactly one fresh `shop vac` run returned BISSELL Garage Pro and two specific RIDGID NXT models as exact, plus four specific product-page near matches. No collection/category/brand/family/listing route appeared.

**Issues:** RR-007 Fixed; RR-008/RR-063/RR-064/RR-065 remain Fixed; RR-041/RR-042 remain Needs Investigation. Totals: 65 issues; 2 Open, 6 Needs Investigation, 56 Fixed, 1 Won't Fix.

**Scope:** Implementation commit `6346087`; documentation commit `f002533`. No Phase 5I trigger/fallback retry, Phase 5J work, ranking, discovery, source-upgrade, identity, price, product-type, requirement, final-selection, or UI change.

**Next recommended step:** Stop. Retry Phase 5I for RR-041/RR-042 only after explicit instruction.

## Codex Run - 2026-06-30 Phase 5I retry safety stop

**Goal:** Retry only RR-041/RR-042 with a conservative trigger and bounded fallback while preserving all source-upgrade identity and product-card safety gates.

**Fail-first diagnosis:** A lone owner rating blocks upgrade even when verified price and same-product commerce evidence are missing. A nonempty primary result set also prevents fallback when every candidate fails identity. The two intended assertions failed with 78/80 source-quality tests passing.

**Candidate change:** Locally required two of three missing evidence pillars, retained strong identity and the cap of three, and allowed one distinct fallback after zero primary candidates or no safe primary attachment. Debug-only trace fields explained trigger, retry, and outcome decisions.

**Deterministic proof:** Focused tests passed 113/113; the broad named safety matrix passed 346/346; typecheck passed; lint had 0 errors and 3 existing warnings; the candidate full suite passed 751/751; eval had no red flags.

**Live stop:** The one approved `shop vac` run safely upgraded Stanley SL18115 and Armor All VOM205P, but target RIDGID WD4522 rejected an exact-model candidate whose title omitted RIDGID and then accepted a different 10-gallon RIDGID vacuum with no WD4522 model. It attached `$139`, rating `4.3`, review count, and citation. The contaminated product stayed near-only, but the attachment was unsafe.

**Outcome:** Opened Critical RR-066. Restored all six Phase 5I implementation/test files; no behavior remains changed or committed. The restored repository passes 747/747 tests, typecheck, lint with the same 3 warnings, and eval.

**Issues:** RR-041/RR-042 remain Needs Investigation. RR-066 is Open. RR-007, RR-008, RR-063, RR-064, and RR-065 remain Fixed. Totals: 66 issues; 9 Critical, 28 High, 24 Medium, 5 Low; 3 Open, 6 Needs Investigation, 56 Fixed, 1 Won't Fix.

**Scope:** Documentation only after rollback. The generated baselines and live fixtures remain untracked. Documentation commit: `e2894cf`.

**Next recommended step:** Fix RR-066 narrowly before retrying Phase 5I. A model-qualified target must not accept brand-plus-type evidence that omits the target model.

## Codex Run - 2026-06-30 RR-066 model-qualified identity safety

**Goal:** Fix only RR-066 so a strong-model target cannot accept commerce evidence based on brand plus product type when the candidate omits the target model.

**Root cause:** `looksLikeSameProduct` required target-brand evidence before exact model acceptance, then allowed strong-model targets with no candidate model conflict to fall through to broad token overlap. This rejected the brandless exact WD4522 offer while accepting a different branded RIDGID vacuum with no WD4522 model.

**What changed:** Product-type and variant conflicts remain first. Strong-model targets now require an exact punctuation-normalized target model in source-derived candidate evidence. An omitted provider brand is allowed only for an exact model with no explicit conflicting brand. Non-model family behavior is unchanged.

**Proof:** Fail-first passed 80/84 with only four intended failures. Focused final passed 84/84; broad named safety passed 304/304; typecheck passed; lint had 0 errors and 3 existing warnings; full suite passed 752/752; eval had no red flags.

**Live result:** One `shop vac` run rejected nearby RIDGID HD09001, HD0919, and HD1900 offers for HD0900 and attached nothing. Exact Armor All VOM205P evidence attached price, rating, review count, and citation. No unsafe page or wrong-product evidence attached. WD4522 did not recur.

**Issues:** RR-066 Fixed. RR-041/RR-042 remain Needs Investigation. RR-007, RR-008, RR-063, RR-064, and RR-065 remain Fixed. Totals: 66 issues; 9 Critical, 28 High, 24 Medium, 5 Low; 2 Open, 6 Needs Investigation, 57 Fixed, 1 Won't Fix.

**Scope:** Two implementation/test files plus required docs. No Phase 5I trigger/fallback behavior, Phase 5J work, ranking, discovery, price, eligibility, product-type, requirement, final-selection, citation-retention, or UI change. Implementation commit: `b3cfab7`; documentation commit: `d00c0ba`.

**Next recommended step:** Stop. Retry Phase 5I for RR-041/RR-042 only after explicit instruction and preserve the RR-066 model-level identity requirement.

## Codex Run - 2026-07-02 Phase 6D variance pilot safety stop

**Goal:** Run the approved 2x3 repeated live variance pilot, update RR-015 and RR-037, and prepare the rubric freeze proposal only if the pilot remained safe.

**Execution:** Alternated `shop vac` and `robot vacuum under $300 self-emptying`. Four of six searches completed, using 150 observed Serper calls. Each fixture was preserved under a unique untracked Phase 6D path and inspected before the next call.

**Stop finding:** Constrained run B2 targeted Roborock Q10 X5+ but accepted generic Q10-series shopping evidence that omitted X5+. Source upgrade attached price, rating, review count, and citation. This opened Critical RR-069 and stopped A3/B3.

**Partial measurement:** Shop-vac candidate/final Jaccard was `0.1429/0.0000`; constrained candidate/final Jaccard was `0.0000/0.0000`. Raw-provider overlap was `0.2857-0.3158`, query-plan overlap was `0.3333-0.3636`, and no final product was shared in either pair. RIDGID entered both shop-vac pools but varied from one candidate removed at requirement filtering to five candidates with three reaching final exact/near.

**Attribution:** Both provider output and model/search planning varied. Current traces do not support a causal percentage split. Relevant OpenAI calls do not explicitly pin temperature or seed.

**Scope:** No production behavior changed. The approved `qualityConsistencyHarness.mjs` extension adds offline fixture analysis only. Rubric v1.0 was not frozen, leader snapshots were not compiled, and Phase 6E did not start.

**Issues:** RR-069 Open; RR-015 and RR-037 remain Needs Investigation. Totals: 69 issues; 10 Critical, 29 High, 25 Medium, 5 Low; 1 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

**Commit:** Phase 6D stop report and approved measurement tooling `80461e8`.

**Next recommended step:** Fix RR-069 deterministically before requesting approval to resume Phase 6D.

## Codex Run - 2026-07-02 RR-069 source-upgrade identity safety

**Goal:** Fix only RR-069 so generic family/series commerce evidence cannot attach to a more specific model-qualified target.

**Root cause:** The source-upgrade identity gate accepted any matching strong target model. For Q10 X5+, Q10 was classified as a brand-qualified family token and X5+ was not independently required, so the RR-066 strong-model guard did not run and generic Q10-series evidence passed the family path.

**What changed:** A shared attachment-time guard now requires the distinguishing submodel for adjacent base/suffix identities, compact equivalents, digit-dash kit identifiers, and multiple strong model identifiers. It runs before both strong and family acceptance. Query construction, trigger, fallback, and evidence extraction were not changed.

**Proof:** Fail-first passed 97/100 with only the Q10, monitor, and power-tool series/submodel negatives failing. Focused final passed 100/100; broad identity/trust coverage passed 439/439; full tests passed 786/786; typecheck and eval passed; lint reported 0 errors and 3 existing warnings.

**Positive controls:** `Q10 X5+`, `Q10 X5 Plus`, and `Q10X5+` attach safely. Brandless exact WD4522 and exact dehumidifier evidence remain valid. Generic Q10 series/plain/lineup and nearby S5+/X50+ evidence attach nothing.

**Fixture/live boundary:** The saved Phase 6D B2 fixture remains historical proof of the original failure. No live search ran. Phase 6D stayed paused at 4/6 searches, rubric v1.0 remained unfrozen, and Phase 6E did not start.

**Issues:** RR-069 Fixed. Totals: 69 issues; 10 Critical, 29 High, 25 Medium, 5 Low; 0 Open, 4 Needs Investigation, 64 Fixed, 1 Won't Fix.

**Commits:** Implementation and deterministic tests `1411901`; documentation closeout `fd1484d`.

**Next recommended step:** Await explicit approval for how to resume Phase 6D; do not start Phase 6E.

## Codex Run - 2026-07-02 Phase 6D clean restart safety stop

**Goal:** Run a clean six-call post-RR-069 variance pilot while excluding the earlier four pre-fix fixtures.

**Execution:** Confirmed RR-069 Fixed, clean tracked state, exact request fields, debug mode, healthy local server, and six unused fixture names. Marked the earlier 4/6 attempt as aborted pre-fix evidence. Restart A1 ran `shop vac` with blank budget/details and no selected features, saving a distinct untracked Tier A fixture.

**Stop finding:** A1 assigned the same Amazon `yoda/flyout_72dpi` navigation asset to RIDGID VAC4000 and Fein Turbo I. Both records classified it as High-confidence retailer-page image metadata and exposed it as the card image. RR-061 was reopened as Needs Investigation.

**Budget:** 1/6 clean-restart searches used; 37 observed Serper calls; five calls unspent and blocked. The original four-call sample remains excluded.

**Measurement:** A1 had 20 pool candidates, 4 exact, 2 near, 6 final, 83.219-second pipeline latency, and no request error. One observation cannot produce pairwise Jaccard, shared rank correlation, stage-loss variance, significance guidance, or provider/model attribution. RR-015 and RR-037 remain Needs Investigation.

**Verification:** Typecheck passed; lint reported 0 errors and 3 existing warnings; the full suite passed 786/786 across 117 suites; offline eval reported no red flags. The offline variance harness requires at least two fixtures and correctly declined the one-run sample.

**Scope:** Measurement and documentation only. No production code, tests, scripts, ranking, discovery, trust, identity, eligibility, source-upgrade, product-type, final-selection, UI, or API behavior changed.

**Issues:** 69 total; 10 Critical, 29 High, 25 Medium, 5 Low; 0 Open, 5 Needs Investigation, 63 Fixed, 1 Won't Fix. RR-061 is Needs Investigation; RR-069 remains Fixed.

**Phase state:** Rubric v1.0 was not frozen; leader snapshots were not compiled; Phase 6E did not start.

**Commit:** Phase 6D restart stop report `29e02f2`.

**Next recommended step:** Run a narrow generalized RR-061 image-safety phase only after explicit instruction, then request a fresh Phase 6D restart approval.

## Codex Run - 2026-07-02 Reopened RR-061 image safety

**Goal:** Fix only the retailer navigation-image regression that stopped the clean Phase 6D restart.

**Root cause:** The shared image resolver was active, but it did not classify flyout/menu/department/layout paths as non-product assets. Its relevance text also included the image hostname and retailer/domain words from generated product names, allowing `Amazon.com` to contribute the two matches needed for High confidence.

**What changed:** The resolver now rejects generalized flyout/menu/department/layout/masthead paths, excludes source/retailer/domain words from product-image identity, and ignores URL hosts for relevance. Cross-product image reuse remains diagnostic rather than an unconditional block.

**Safety proof:** The exact live URL is rejected for both affected cards and enrichment leaves a rejected image empty. Verified same-product Amazon images, opaque hashed CDN images, Google Shopping thumbnails, and identity-safe source-upgrade images remain valid.

**Verification:** Fail-first 31/35 with four intended failures; focused 135/135; broad trust matrix 376/376; full suite 791/791; typecheck and eval passed; lint 0 errors/3 existing warnings.

**Scope:** RR-061 only. No live search, ranking, discovery, final-selection, price, identity, source-upgrade behavior, product type, page eligibility, UI, API shape, or Phase 6 policy change.

**Issues:** RR-061 Fixed. Totals: 69 issues; 10 Critical, 29 High, 25 Medium, 5 Low; 0 Open, 4 Needs Investigation, 64 Fixed, 1 Won't Fix.

**Phase state:** Phase 6D remains stopped; the five-call balance is not reusable. Rubric v1.0 remains unfrozen and Phase 6E did not start.

**Commit:** RR-061 implementation and deterministic proof `a174551`.

**Next recommended step:** Human-review the fix, then explicitly approve a fresh clean six-call Phase 6D restart.

## Codex Run - 2026-07-02 Fresh Phase 6D restart safety stop

**Goal:** Run a new post-RR-069/post-RR-061 2x3 variance sample without pooling either earlier stopped attempt.

**Execution:** Readiness passed 114/114 focused tests. A1 used broad `shop vac`; B1 used query `robot vacuum`, budget `under $300`, priorities `self-emptying`, and no selected features. Both used debug mode and distinct untracked fixtures at commit `baeb6a0`.

**A1:** Safe. Pool 19, citation 11, requirement 5, final 3, exact/near 1/2, latency 92.592s, 37 Serper queries. RIDGID reached a final near slot; no household floor cleaner, unsafe price, page, image, or evidence attachment appeared.

**B1 stop:** Pool 9, citation 7, requirement 6, final 6, exact/near 1/5, latency 88.463s, 38 Serper queries. Roborock Q5 Max+ rendered `Saros_Z70_Silver_ID.png` from its matching product page. RR-061 reopened.

**Additional finding:** ILIFE A12 Pro carried unrelated `Bose` Serper brand metadata into query `Bose ILIFE A12 Pro`. No result or evidence attached. Opened RR-070 Medium/Needs Investigation.

**Measurement:** One run per query means all pairwise overlaps, rank correlation, stage-loss variation, significance, sample-size inference, and provider/model attribution are unavailable. RR-014/RR-015/RR-037/RR-045 remain Needs Investigation.

**Budget:** 2/6 searches, 75 observed Serper queries; four calls unspent and blocked.

**Verification:** Typecheck passed; lint 0 errors/3 existing warnings; full suite 791/791; eval no red flags; offline harness pair arrays empty.

**Scope:** Measurement/docs only. No production code, tests, scripts, ranking, discovery, trust, identity, image, source-upgrade, product-type, final-selection, UI, or API behavior changed.

**Issues:** 70 total; 10 Critical, 29 High, 26 Medium, 5 Low; 0 Open, 6 Needs Investigation, 63 Fixed, 1 Won't Fix.

**Phase state:** Rubric v1.0 not frozen; leader snapshots not compiled; Phase 6E not started.

**Commit:** Phase 6D safety-stop report `566a7bf`.

**Next recommended step:** Diagnose/fix RR-061 wrong-model image safety separately; keep RR-070 independently scoped.

## Codex Run - 2026-08-29 Production readiness PR-0/PR-1

**Goal:** make the baseline gate trustworthy and repair the staged-Terra
diagnostic/cost defects that blocked an evidence-based feasibility retry.

**Baseline:** Typecheck, lint, 1,430 tests, production build, synthetic eval,
and fixed ranking comparison were green. Required E2E was only 5/17 because it
inherited local Direct-Terra flags; five named deterministic QA workers all ran
the same shared synthetic cases. The old `.rr_baseline` was rejected because it
contained two harness errors, zero provider calls, and no usable quality data.

**Changes:** Playwright now owns a credential-neutral dedicated default-off
server, and its stale preview selector now asserts both current safe links.
Staged research failure diagnostics retain only the four closed validation
classes. Terminal usage is billed after local failure, same-response snapshots
deduplicate by safe hash, and distinct/unknown responses sum conservatively.

**Adversarial review:** the first independent read-only review returned
`CHANGES REQUIRED` because provider credentials remained inherited and
operation-only cost merging could undercount distinct responses. Both were
fixed; prompt/secret and unbounded-reason negatives were added; the final
independent verdict was `APPROVED` with no findings.

**Proof:** fail-first produced exactly two intended failures; focused final
passed 33/33; full tests passed 1,435/1,435; E2E passed 17/17; typecheck, build,
eval, ranking comparison, and zero-network Phase D dry run passed; lint had zero
errors and three existing warnings. Historical replay recomputed the failed
request at `$0.154600` standard / `$0.168307` conservative instead of `$0`.

**Scope:** no live or other external request, `.env.local` edit, flag promotion,
deployment, production change, push, issue-status mutation, product selection,
ranking, discovery, verification, rendering, or public API behavior change.
Staged Terra remains default-off and live-feasibility-unproven.

**Next recommended step:** one commit-pinned Phase D `shop vac` feasibility
attempt inside the frozen request/network/$3 envelope, stopping at its first
terminal outcome. Reasoning level: High for outcome adjudication; execution is
routine.

## Codex Run - 2026-08-29 Production readiness PR-2 live stop

**Goal:** exercise the complete staged route once at the verified PR-0/PR-1
commit, using only the frozen broad `shop vac` case and existing ceilings.

**Preflight:** tracked state was clean, the commit-specific output directory was
unused, process-only OpenAI/Serper keys were present, the dry run passed, and
official OpenAI documentation confirmed Terra still supports Responses/web
search. Current rates are lower than the frozen July approval rates, so the
`$3` hard gate remained conservative.

**Outcome:** Terra completed one research response after sixteen retrieves,
with 21,478 input tokens, 5,450 output tokens, two hosted searches, and 36
response-owned sources. ReviewRadar returned HTTP 502 `research_failed` with
the closed class `research_candidate_invalid`. Verification, presentation,
Shopping, page fetches, and rendering did not run.

**Budget and safety:** one create and one safety cancel; no retry, replacement,
fallback, SearchAPI, Serper organic/Shopping, or page request. Frozen cost was
`$0.155445` standard / `$0.168869` conservative; current documented standard
rates imply about `$0.128356`. The untracked sanitized fixture contains no raw
output, provider ID, prompt, source URL, header, secret, API key, or body.

**Scope:** measurement and documentation only. No `.env.local` edit, flag
promotion, deployment, production change, push, issue-status mutation, or
tracked product behavior change. The first terminal outcome ended PR-2 and the
evidence directory is spent.

**Next recommended step:** zero-live candidate-contract alignment across the
prompt, strict schema, provider adapter, and validator, followed by fail-first
candidate-field mutations and the smallest generalized correction. Reasoning
level: High.

## Codex Run - 2026-08-29 Production readiness PR-2A contract v2

**Goal:** fix only a proven generalized schema/runtime mismatch inside the
staged research candidate-validation first loss, with zero live spend and no raw
response access.

**Root cause:** research v1 made Terra author internal candidate/fact IDs while
runtime demanded exact array-relative numbering not fully specified by the
strict schema or prompt. Runtime also rejected requirement order that the schema
could not constrain, despite the response containing the exact ID set.

**Changes:** contract/schema/prompt v2 make candidate/fact IDs server-owned,
canonicalize the exact unique requirement set, align non-whitespace schema and
runtime rules, and change the request fingerprint for fail-closed version
rollover. A new closed server-only candidate subreason identifies identity,
sources, requirements, or facts; the route guards it and the browser still sees
only the generic failure.

**Proof:** fail-first was 18 pass / 4 intended fail; focused final 28/28; staged
wall 54/54; full tests 1,438/1,438 across 209 suites; E2E 17/17; typecheck,
build, eval, ranking comparison, zero-network Phase D dry run, and diff checks
passed; lint had zero errors and three existing warnings. Independent read-only
review returned `APPROVED` after personally running 40/40 scoped tests,
non-incremental typecheck, and diff checks.

**Scope and limitation:** no provider, search, Shopping, or page request; no
`.env.local` edit, flag promotion, deployment, production change, push, issue
status change, or user-artifact cleanup. The exact private field in the spent
live response remains unknowable, so live feasibility is not claimed.

**Next recommended step:** correct PR-010's stale frozen/current cost labeling
as a separate zero-live phase before deciding whether one new-commit,
new-directory feasibility attempt is justified. Reasoning level: Medium.

## Codex Run - 2026-08-29 Production readiness PR-2B pricing evidence v2

**Goal:** remove ambiguity between Phase D's frozen approval-rate calculation
and a dated current-cost estimate without weakening spend controls or touching
the provider.

**Root cause:** the intentionally frozen 2026-07-25 rate card was emitted as
`standardUsd`, which looked current, while neither plan nor evidence contained a
separately sourced and dated current estimate.

**Changes:** plan/evidence schema v2 nests a frozen `approvalEnvelope` and a
2026-08-29 `standard_non_regional` `currentEstimate`. Cost fields are now
`approvalEnvelopeUsd`, `approvalEnvelopeConservativeUsd`, and
`currentEstimateUsd`. Both cards model the 272K threshold, cached input,
1.25x cache writes, and hosted searches. Only the frozen conservative value
controls the unchanged `$3` gate.

**Proof:** fail-first was 5 pass / 5 intended fail; focused final 10/10; staged
wall 56/56; full tests 1,440/1,440 across 209 suites; E2E 17/17; typecheck,
build, eval, ranking comparison, zero-network dry run, and diff checks passed;
lint had zero errors and three existing warnings. Independent read-only review
returned `APPROVED` after personally rerunning 10/10 focused tests and
inspecting the full scoped runner/accounting path.

**Scope:** no provider, search, Shopping, or page request; no `.env.local` edit,
flag promotion, deployment, production change, push, issue-status change,
historical-fixture rewrite, or user-artifact cleanup. PR-010 is closed, but
staged feasibility and recommendation quality remain unproven.

**Next recommended step:** one new-commit, new-directory, frozen `shop vac`
contract-v2 feasibility attempt, with no retry/replacement/fallback and a stop
at the first terminal outcome. Reasoning level: High for adjudicating trust,
usage, and feasibility evidence.

## Codex Run - 2026-08-29 Production readiness PR-2C candidate-source stop

**Goal:** test contract-v2 lifecycle feasibility once at the clean PR-2B commit,
without broadening into a benchmark or retrying either spent attempt.

**Outcome:** Terra completed research, but ReviewRadar stopped at
`research_candidate_invalid / candidate_sources` before verification,
presentation, Shopping, page fetching, cards, sources, or rendering. The single
attempt at `140d465a0ac835efb73713e988c140b7e35be6e9` ended after 64.959
seconds.

**Envelope:** one create, 29 retrieves, six hosted searches, one safety cancel;
zero retries, replacements, fallbacks, second cases, SearchAPI, Serper
organic/Shopping, or page calls. Usage was 57,041 input and 6,744 output tokens.
Cost was `$0.303762` frozen nominal, `$0.339413` frozen conservative, and
`$0.255010` at the dated current card, below the frozen `$3` ceiling.

**Privacy:** sanitized evidence v2 contains no prohibited raw/provider/prompt/
product-source/header/key/secret/body/candidate field. Its only URL values are
approved pricing sources, both local key values are absent, and the tracked tree
remained clean. The untracked evidence directory is spent.

**Assessment:** the closed source group cannot reveal whether the live cause was
a duplicate, unsafe/malformed, or unregistered URL. Static inspection did prove
a separate generalized mismatch: canonical response-source dedupe drops later
exact URL variants before staged exact-membership validation. That risk is
real, but it is not proven to be the live cause.

**Next recommended step:** zero-live source-branch attribution and exact-registry
alignment, preserving exact ownership, HTTPS, uniqueness, privacy, and shared
display dedupe. Reasoning level: High for source-ownership semantics, then
Medium for localized implementation.

## Codex Run - 2026-08-29 Production readiness PR-2D source ownership

**Goal:** fix the proven exact-source registry self-mismatch and make the next
candidate-source failure independently attributable without weakening citation
ownership or crossing the private-response boundary.

**What was checked:** the shared action/citation extractor, canonical display
dedupe, staged runtime registry, candidate URL parser, contract fingerprint,
route diagnostics, public response, Phase D evidence path, and every relevant
positive/negative source mutation.

**What was found:** canonical display dedupe correctly served its existing UI
purpose but retained only the first exact string for canonically equivalent
response-owned URLs. Staged validation reused that lossy view while requiring
exact membership, so a later exact response-owned variant could be rejected as
unregistered. The sanitized PR-2C evidence cannot prove this was its private
branch.

**What changed:** a staged-only exact registry keeps every parseable exact
response-owned action/citation URL once; canonical display and counts remain
unchanged. Source failures now have four closed URL-free subreasons. Contract v3
invalidates older fingerprints and runtime v2 records the new semantics. Exact
ownership, duplicate, HTTPS, credential, port, private-host, count, and public-
response gates remain fail closed.

**Why it matters:** ReviewRadar no longer rejects a URL merely because its exact
response-owned variant was hidden by presentation dedupe, while invented or
canonical-lookalike URLs gain no authority. Future failures identify the safe
branch without exposing the URL or raw candidate.

**Tests and before/after proof:** fail-first was 27 pass / 3 intended fail;
corrected focused 55/55; staged 59/59; full 1,444/1,444; E2E 17/17; typecheck,
build, eval, ranking, Phase D dry run, lint, and diff checks passed. Independent
read-only review returned `APPROVED` after rerunning focused/full tests,
typecheck, and diff checks.

**Live checks:** none. PR-2D was intentionally zero-live and made no provider,
search, Shopping, or page request.

**Remaining issues:** the exact spent PR-2C source branch is unknowable; staged
lifecycle feasibility and shopper quality remain unproven; PR-005 through
PR-008 and the broader readiness debts remain open.

**Next recommended step:** one commit-pinned, new-directory `shop vac` staged
feasibility attempt under the unchanged Phase D envelope, with no retry or
replacement and a stop at the first terminal outcome. Reasoning level: High for
evidence adjudication; execution is routine.

## Codex Run - 2026-08-29 Production readiness PR-2E verification stop

**Goal:** test the corrected staged route exactly once through research,
verification, presentation, and rendering without broadening into a benchmark.

**What was checked:** exact commit/clean-state/output-directory binding, boolean
key presence, zero-network plan/rate/ceiling preflight, the single live route,
sanitized counters/usage/cost/privacy, first-terminal stop, and post-run state.

**What was found:** research passed contract v3 with 12 candidates and 73
canonical sources. Deterministic verification made 12 Shopping requests (212
rows) and 13 bounded page attempts (three successes), but excluded every
candidate. It produced no eligible/close match or presentation call, and no
public response, card, source list, render, or result file.

**What changed:** no product code changed. The new fixture is untracked, spent,
and excluded from staging. Authoritative records now identify verification as
the active first loss and preserve the attribution limit.

**Why it matters:** PR-2D cleared research validation in a real response, but the
active architecture still cannot produce a recommendation. The route currently
discards the verifier's detailed structured diagnostics, so another paid attempt
could produce another unattributable verification failure and cannot explain
PR-2E.

**Tests/live proof:** dry run passed; the one 59.154-second live attempt used one
create, 23 retrieves, four searches, one cancel, 12 Shopping requests, and 13
page/HTTP attempts, all inside ceilings. Usage/cost was independently
recomputed. Fixture/privacy/clean-state audit returned `VERIFIED`.

**Before/after:** PR-2C stopped at candidate sources before verification. PR-2E
crossed research and reached deterministic verification, which then excluded
12/12. This is progress in first-loss depth, not feasibility or quality proof.

**Remaining issues:** the all-excluded cause is unknown; staged presentation and
rendering remain untested live; all broader PR-005 through PR-008 and readiness
debts remain open.

**Next recommended step:** zero-live closed aggregate verifier first-loss
diagnostics, with no eligibility change and no candidate/request/private fields.
Reasoning level: High for privacy semantics, then Medium for aggregate plumbing.

## Codex Run - 2026-08-29 Production readiness PR-2F verification attribution

**Goal:** make a future staged verification outcome attributable with closed
aggregate counts, without changing eligibility, exposing candidate evidence, or
making a live request.

**What was checked:** the verifier's real materialized asset decisions,
requirement verdicts, source/claim rejection enums, route diagnostic boundary,
Phase D evidence contract, generic browser response, and conservation/privacy
mutations.

**Initial review blocker:** the first implementation proposed a complete-product-
type bucket that could never be reached because its derived predicate was
identical to identity acceptance. Independent review correctly rejected it.

**What changed:** verifier v2 now assigns exactly one real first-loss bucket per
candidate: asset identity unproven, complete-product relationship unproven,
identity-safe product URL unavailable, hard requirement failed, hard requirement
not verified, or no-loss eligible. Three separate counters record only candidate
counts affected by unowned sources, invalid source input, or invalid observed
claims. The route accepts only fixed bounded integers whose first-loss total
conserves and whose outcome counts reconcile, dropping every malformed,
unknown, or private value. Evidence schema v3 may retain this aggregate only for
its own verification outcome; the public error is unchanged.

**Why it matters:** another verification stop can now show the dominant
aggregate loss for that attempt without retaining candidate identities, URLs,
requirements, claims, pages, provider material, prompts, credentials, or
secrets. PR-2E is not retroactively explained.

**Proof:** fail-first was 23 pass / 6 intended fail. After correcting the review
blocker, focused tests passed 30/30, staged tests 62/62, full tests 1,447/1,447,
and E2E 17/17. Typecheck, build, eval, ranking, zero-network dry run, lint (zero
errors, three existing warnings), and diff checks passed. Independent re-review
returned `APPROVED` with no actionable findings after personally rerunning the
focused/full walls, typecheck, and diff checks.

**Live checks:** none. No OpenAI, search, Shopping, source-page, or other
product-data request ran.

**Remaining issues:** staged lifecycle feasibility, presentation/rendering, and
shopper-result quality remain unproven; PR-005 through PR-008 and PR-013 remain
open.

**Next recommended step:** exactly one clean, commit-pinned, new-directory
`shop vac` attempt under the unchanged Phase D envelope, with no retry,
replacement, fallback, second case, or gate change. Reasoning level: routine for
execution and High for evidence adjudication.

## Codex Run - 2026-08-29 Production readiness PR-2G asset-identity stop

**Goal:** execute the one independently authorized evidence-v3 lifecycle attempt
and stop at its first terminal outcome.

**Preflight:** PR-2F was clean and committed at
`b01c335908e78101501bf0b40cd833f0e8f3b5d1`; the commit directory was absent;
required keys were confirmed only by boolean presence; the focused Phase D test
passed 10/10; and the zero-network dry run reproduced plan v2, exact commit,
frozen case/rates, and unchanged ceilings.

**Outcome:** research passed with 12 candidates and 58 canonical sources.
Verification used 12 Shopping requests/194 rows and 12 source fetches/seven
successes, then excluded every candidate. The route stopped at HTTP 502
`verification_failed` after 51.618 seconds, before presentation or rendering.

**Attribution:** evidence v3 conserved all 12 first losses as asset identity
unproven. Every later first-loss bucket and retained source/claim rejection
counter was zero. This proves only that attempt's earliest aggregate loss; it
does not reveal why identity failed, which candidates/evidence were affected,
what shadowed gates would do, or a generalized/category-wide cause.

**Envelope and cost:** one create, 20 retrieves, three hosted searches, one
cancel, 12 Shopping requests, 12 fetches, and 19 physical HTTP attempts. There
was no retry, replacement, fallback, second case, organic/SearchAPI,
presentation, public response, card, source list, or result file. Usage was
28,335 input and 6,029 output; cost was `$0.191272` frozen nominal,
`$0.208982` frozen conservative, and `$0.159018` current.

**Privacy and audit:** the 19,053-byte fixture retains only fixed aggregate/
schema fields, approved pricing URLs, and a response hash; both local key values
and raw/private candidate/provider material are absent. Independent read-only
audit returned `VERIFIED` after recomputing counters, costs, conservation,
privacy, first-stop behavior, and clean tracked state. The fixture is spent.

**Separate offline finding:** a zero-network reproduction showed eight bounded,
unique, schema-valid research identity tuples pass contract validation while
all fail `directTerraAssetTargetIsCoherent()`; even an otherwise exact asset is
then rejected as `invalid_target_identity`. This is a real generalized
contract/verifier mismatch that can produce the live class, but the saved live
aggregate cannot prove it caused PR-2G.

**Next recommended step:** zero-live fail-first alignment of staged research
identity acceptance and prompt wording with the unchanged asset-coherence
predicate, including fail-closed contract/prompt rollover. Do not loosen the
asset verifier or make another request. Reasoning level: High for identity and
rollover semantics, Medium for localized implementation.

## Codex Run - 2026-08-29 Production readiness PR-2H identity alignment

**Goal:** prevent staged research from accepting an identity tuple that the
unchanged downstream asset verifier can never accept, before spending on
another lifecycle attempt.

**What was checked:** staged research field/schema validation, prompt wording,
request fingerprinting, runtime/job-token identity, the shared asset target-
coherence predicate, duplicate classification, numeric model trimming, source-
validation order, public/diagnostic boundaries, default flags, and the complete
static/browser walls.

**What was found:** research validated nonempty product-name/brand/model/type
strings independently, while the asset verifier required those same fields to
agree relationally. Four schema-valid mutations passed research despite missing
the brand, missing the model core, naming a conflicting model, or mismatching the
complete-product type. This can produce PR-2G's aggregate class but is not its
proven private cause.

**What changed:** research candidate parsing now calls the unchanged
`directTerraAssetTargetIsCoherent()` immediately after bounded identity parsing
and returns only `candidate_identity` on failure. Prompt v3 states the same
relation; contract v4 rolls the request fingerprint; runtime v3 records the new
semantics. Existing token verification checks both current prompt version and
recomputed current fingerprint. Research schema v2 and every downstream trust
gate remain unchanged.

**Why it matters:** an impossible target now stops before candidate-source,
Shopping, page, or verification work instead of consuming those resources and
then being guaranteed to fail. Valid numeric model trimming and coherent
duplicate rejection are preserved; no product identity is synthesized and no
private diagnostic surface is added.

**Tests and before/after proof:** fail-first was 18 pass / 8 intended fail;
corrected contract 26/26; focused 57/57; staged 70/70 across ten suites; full
1,455/1,455 across 209 suites; credential-neutral E2E 17/17. Typecheck, build,
eval, ranking, zero-network dry run, lint (zero errors and three existing
warnings), and diff checks passed. The generated `next-env.d.ts` returned to its
tracked production form. Independent read-only review returned `APPROVED` after
a personal 57/57 rerun and found no import, trust, privacy, or rollover issue.

**Live checks:** none. No provider, search, Shopping, source-page, or other
product-data request ran.

**Remaining issues:** no post-correction staged result exists; PR-2G's exact
identity reason remains private; presentation/rendering and shopper quality are
still unproven; PR-005 through PR-008 and PR-013 remain open. This phase proves
deterministic prevention, not a live accuracy, latency, or cost improvement.

**Next recommended step:** one clean, commit-pinned, new-directory `shop vac`
post-correction lifecycle attempt under the unchanged Phase D ceilings, with no
retry/replacement/fallback and a first-terminal stop. Reasoning level: routine
for execution and High for evidence/privacy adjudication.

## Codex Run - 2026-08-29 Production readiness PR-2I research-fact stop

**Goal:** run exactly one clean post-PR-2H staged `shop vac` lifecycle attempt
to its first terminal result, then determine only what its sanitized evidence
supports.

**What was checked:** exact commit/directory and clean-state binding; Phase D
plan/case/ceilings; boolean-only provider configuration; focused runner and
zero-network dry-run preflight; terminal diagnostics, counters, usage, cost,
privacy allowlist, secret absence, result absence, and first-stop behavior; plus
the research producer/parser contract offline.

**Live outcome:** the one attempt at
`06fa55fb38f6675a897053eb21328ac8845d4e14` completed Terra research with 47
canonical sources, then failed local validation as
`research_candidate_invalid / candidate_facts`. It stopped at HTTP 502 after
54.485 seconds, before Shopping, page fetching, verification, presentation, or
rendering. There was no retry, replacement, fallback, second case, organic/
SearchAPI call, public response, or result file.

**Envelope and cost:** one create, 24 retrieves, three hosted searches, and one
safety cancel. Usage was 30,215 input and 7,537 output tokens. Exact frozen
nominal arithmetic is `$0.2185925`; JavaScript's binary six-decimal conversion
stored `$0.218592`. Frozen conservative/current estimates were `$0.237477` and
`$0.180874`, below the `$3` gate.

**Privacy and audit:** the only file is a 21,149-byte untracked sanitized
`attempt.json` with SHA-256
`4741a595633335708c2446b1682e05631ab1ed8fb2ef9e0044b41725ce1f9513`.
It contains only approved fixed fields and OpenAI documentation URLs; both
configured key values and all prohibited raw/private material are absent.
Independent read-only audit returned `VERIFIED`.

**Finding and limit:** `candidate_facts` identifies only the first reported
invalid candidate's field group. It cannot reveal the candidate, exact private
defect, or whether later candidates passed identity. Separately, zero-network
schema-conforming probes proved that response-level lead URL ownership,
reference uniqueness, and status/cardinality in the producer contract are
weaker than the parser's correct candidate-local trust rules. That generalized
mismatch can produce the bounded class but is not proven to be the live cause.

**Next recommended step:** PR-2J, zero-live. Replace repeated lead URLs with
candidate-local integer source references, retain exact ownership/range/
uniqueness/cardinality validation, and roll schema/contract/prompt/runtime job
identity. Do not retry PR-2I or loosen evidence ownership. Reasoning level:
High for contract design and Medium for localized implementation.

## Codex Run - 2026-08-29 Production readiness PR-2J candidate-local source references

**Goal:** close the independently reproduced PR-015 research producer/parser
mismatch without another paid request or any relaxation of evidence ownership.

**What was checked:** the research JSON schema, provider instructions, candidate
source validation, requirement/fact parsing, response-source registry order,
runtime diagnostics, request fingerprint, encrypted job-token verification,
route fixtures, downstream evidence materialization, default flags, public
responses, generated-file drift, and every required deterministic/browser wall.
Official OpenAI Structured Outputs documentation was checked for integer/array
bounds, nested `anyOf`, and unsupported cross-field keywords.

**What was found:** the old wire shape repeated exact URLs in every lead while
the parser required each URL to be unique and present in its enclosing
candidate. The producer schema could therefore accept response-owned but
cross-candidate URLs, duplicates, and status/cardinality combinations that the
runtime correctly rejected after paid generation. A separate existing token
tamper test could randomly replace a character with itself and fail without a
real integrity defect.

**What changed:** candidate `source_urls` remains unchanged as the exact
response-owned registry. Requirement and fact leads now carry zero-based
candidate-local indexes. Research schema v3 uses three closed requirement
variants: supporting/conflicting require one to six indexes and `not_found`
requires none; every fact requires one to six. Runtime independently requires
integer, unique, actual candidate-range references and maps them only to the
already validated exact candidate URLs. Contract v5, prompt v4, and runtime v4
roll the job identity; the unchanged token verifier requires both current prompt
and recomputed current fingerprint. The tamper test now makes a guaranteed-
different mutation.

**Why it matters:** the model no longer has to reproduce long exact URLs inside
each lead, and a lead cannot directly name a response URL outside its candidate
array. Schema-level status cardinality prevents another known post-generation
rejection class, while runtime remains authoritative for dynamic range and
uniqueness. No downstream trust gate, ranking, product acceptance, price, asset,
diagnostic privacy, public response, network ceiling, or default flag changed.

**Tests and before/after proof:** fail-first ran 30 contract tests: 23 passed
and exactly seven new contract/rollover checks failed. The corrected contract
passed 31/31; all staged tests passed 75/75; the complete suite passed
1,460/1,460 across 209 suites; and credential-neutral E2E passed 17/17.
Typecheck, production build, deterministic eval, fixed ranking comparison,
zero-network Phase D dry run, and diff checks passed. Lint reported zero errors
and the same three pre-existing warnings. The corrected randomized token test
passed 50/50 repeated executions, and `next-env.d.ts` was restored.

**Independent review:** the initial review identified blocking findings because
requirement status/cardinality remained runtime-only and the mapping positive
could not distinguish candidate-local from response-global index lookup. After
adding nested schema variants and a reversed-registry non-first-candidate
control, review exposed and prompted correction of the token-test flake. The
only terminal verdict was final `APPROVED`, with no findings after personally
passing 72/72 focused tests, typecheck, Phase D preflight, and diff checks.

**Live checks:** none. No OpenAI, hosted search, Serper, SearchAPI, Shopping,
source-page, or other product-data request ran.

**Before/after limit:** before, strict-schema-conforming synthetic payloads
could cross the producer boundary and fail as `candidate_requirements` or
`candidate_facts`; after, the reproduced raw-lead and status-cardinality shapes
are structurally unavailable and all remaining dynamic rules fail closed. This
does not identify PR-2I's private fact defect or prove any live accuracy,
reliability, latency, cost, presentation, or shopper-result improvement.

**Remaining issues:** PR-013 still blocks lifecycle feasibility; no staged live
attempt has reached presentation/rendering. PR-005 through PR-008 remain open,
and the required benchmark, active-path measurement, UX/operations work, and
final readiness report are incomplete.

**Next recommended step:** PR-3, zero-live. Make named deterministic QA batches
execute distinct tracked benchmark cases and invariants rather than sharing one
synthetic evaluator while reporting different metadata. Reasoning level: High
for benchmark validity and mutation design; Medium for harness plumbing.

## Codex Run - 2026-08-29 Production readiness PR-3 offline benchmark integrity

**Goal:** make deterministic QA batch names prove distinct executed coverage so
later product-quality decisions cannot rely on metadata-only green results.

**What was checked:** the five batch definitions, deterministic worker and live
rotation boundary, legacy evaluator, controller result loading/status/reporting,
before/after verifier, authoritative handoff ownership, Desktop-copy behavior,
tracked fixture design, production scoring entry point, and every required
static/browser/zero-network wall.

**What was found:** all five named deterministic batches delegated to the same
five legacy evaluator cases while recording different live search metadata.
The controller also overwrote `docs/agent-next-task.md` and copied Markdown
outside the repo. During independent review, reconciliation was shown to accept
fabricated price/product failures; the direct worker accepted misspelled modes;
the verifier silently skipped missing input paths; and an initial whole-result
replay correction made genuine historical before evidence unverifiable after a
fix.

**What changed:** one tracked manifest now supplies ten synthetic cases and 29
invariants, uniquely partitioned across all five batches. It covers broad,
constrained, over-constrained, wrong-type/accessory, fake-price, non-product-
page, duplicate-family, compatibility, and missing-evidence shapes. Every
candidate has explicit price/product ground truth. Workers persist exact case
IDs and invariant outcomes; reconciliation rederives them from persisted
exact/near streams and the tracked manifest. Unknown modes and every missing
verifier path fail closed. Historical failing streams remain comparable to a
passing post-fix result.

The controller now runs both the byte-unchanged legacy evaluator and the new
full benchmark. It writes only ignored advisory next-task output and does not
copy Markdown to Desktop. The operator template states the same authority and
exact before/after requirements.

**Why it matters:** a green price, non-product, or requirement batch now proves
that its declared trap cases actually ran. The verifier cannot hide missing
work or turn a fabricated trust failure into apparent improvement. This raises
confidence in future diagnosis without changing production recommendations.

**Tests and before/after proof:** the fail-first worker suite passed nine checks
and failed exactly one new assertion because broad and price batches executed
the same five cases. Corrected focused harness/mutation tests passed 26/26. The
final low-parallelism controller reconciled all five exact partitions; the
benchmark passed 10/10 cases and 29/29 invariants; and the complete suite passed
1,477/1,477 across 214 suites. Typecheck, production build, credential-neutral
E2E 17/17, legacy eval, fixed ranking comparison, zero-network Phase D dry run,
and diff checks passed. Lint had zero errors and the same three pre-existing
warnings; `next-env.d.ts` was restored.

**Independent review:** the reviewer produced four blocking findings described
above. After each correction, the final exact-snapshot verdict was `APPROVED`
with no findings; the reviewer personally passed 26/26 focused tests, the full
benchmark, legacy eval, typecheck, and diff/authentication checks.

**Live checks:** none. No OpenAI, hosted search, Serper, SearchAPI, Shopping,
source-page, or other product-data request ran.

**Remaining issues:** the matrix is synthetic, its candidate oracles are
manually maintained, and ignored worker artifacts are structurally reconciled
rather than cryptographically immutable. PR-013 still blocks staged lifecycle
feasibility, while active-path market coverage, stability, latency, and cost
remain unmeasured. RR-091 and RR-092 remain release blockers for promotion.

**Next recommended step:** after the PR-3 commit leaves a clean tracked tree,
run one frozen commit-pinned `shop vac` Phase D lifecycle revalidation with the
existing ceilings and first-terminal/no-retry policy. This is stronger than a
broad live matrix now because PR-4 depends on proving one complete staged
lifecycle first. Reasoning level: High for boundary/evidence adjudication and
Medium for the bounded mechanical run.

## Codex Run - 2026-08-29 PR-3A live stop and PR-3B verification attribution

**Goal:** test one complete staged lifecycle after PR-3, preserve the terminal
result as bounded evidence, and make its earliest verification failure
actionable without exposing products or weakening trust gates.

**Live outcome:** one frozen `shop vac` Phase D invocation ran at clean commit
`43857e072da54ee8f988887d3813722ed6fd005b`. Research completed with ten
candidates and 79 canonical sources. Seven of 15 selected source pages fetched
successfully and ten Shopping requests returned 192 rows. Verification excluded
all ten candidates before presentation: nine at asset identity and one at the
identity-safe product URL gate. There was no retry, replacement, fallback,
second case, organic/SearchAPI request, presentation, rendering, promotion, or
deployment.

The attempt used one create, 19 retrieves, three hosted searches, one safety
cancel, ten Shopping attempts, 15 source selections, and 17 physical page
attempts. Frozen-conservative cost was `$0.193777`, below `$3`. Its only file is
untracked 18,328-byte `attempt.json`, SHA-256
`39dd07087313339bf0b8b0cad1abd6c3ab1890a2daed73800989b63d6bad4894`.
Independent strict read-only audit returned `VERIFIED` for snapshot binding,
counters, usage, cost, conservation, schema, and privacy. The artifact is spent
and was not retried, edited, staged, or reused.

**Why another behavior change was rejected:** the aggregate showed only nine
identity and one URL first loss. It could not identify a candidate, distinguish
direct-asset/Shopping reasons, or explain the URL rejection. Loosening gates,
guessing from deterministic alpha-model examples, or retaining private product
detail would not be evidence-supported. A fixed bounded aggregate from existing
server-owned decisions was the smallest complete next step.

**What changed:** verifier v3 retains affected-candidate subreason counts scoped
to each first-loss branch: direct-asset identity plus Shopping outcomes,
complete-product relationship, and identity-safe product URL. The route accepts
only exact aggregate/nested keys, safe nonnegative integers, first-loss and
outcome conservation, branch-local bounds, and subreason coverage. Invalid or
private aggregates are omitted in full. Unreachable decision states throw as
invariants. Future sanitized Phase D evidence is v4; historical v3 evidence is
unchanged. Public API and all verification/ranking/network behavior remain the
same.

**Tests and proof:** verifier/route fail-first passed 15 checks and failed seven
intended new expectations; the separate Phase D evidence-version expectation
also failed until v4. Corrected focused verifier/route/Phase D tests passed
32/32; full tests passed 1,479/1,479 across 214 suites; E2E passed 17/17;
typecheck, production build, legacy eval, fixed ranking baseline, zero-network
dry run, and diff checks passed. Lint had zero errors and the same three pre-
existing warnings; `next-env.d.ts` stayed clean.

**Independent review:** the reviewer found two classes of unreachable proposed
buckets (`weak_target_identity` and two URL reasons) and a missing direct test
for all four subreason-coverage checks. After removal/invariant conversion and
new undercoverage/overbound mutations, the terminal verdict was `APPROVED` with
no findings. The reviewer personally passed 32/32 focused tests and typecheck.

**Limits:** PR-3B is zero-live observability only. It does not explain PR-3A,
improve recommendation quality, prove lifecycle feasibility, or authorize PR-4.
RR-091/RR-092 and the wider security, accessibility, operations, latency, cost,
and active-path accuracy debts remain open.

**Next recommended step:** after this phase is self-contained in a clean commit,
run one separately documented PR-3C `shop vac` measurement in a new commit-
derived directory under the unchanged first-terminal/no-retry envelope. Use the
evidence-v4 subreason distribution to select an offline reproduction; do not
change behavior from aggregate inference alone. Reasoning level: High for
evidence adjudication and Medium for the bounded mechanical run.

## Codex Run - 2026-08-29 PR-3E live stop and PR-3F source grounding

**Goal:** revalidate the structural staged research contract once, preserve the
terminal result as immutable privacy-bounded evidence, then fix only the
highest-impact generalized producer/consumer mismatch it established.

**Live outcome:** one approved frozen `shop vac` lifecycle ran at clean commit
`bf7e37b43edbd6896b97a98cc1996bfa69b3aeb7`. An earlier command missing the
runner's explicit approval arguments was rejected before network, directory
creation, counters, artifact, or spend. The actual lifecycle invocation then
ran once and was not retried.

Research completed with 12 candidates and 53 response sources. Each candidate
supplied one local source. Twelve source-page requests produced four receipts;
12 Shopping requests produced 201 rows. Verification excluded all 12 at asset
identity before presentation. Asset subreasons were eight no-asset-candidate
and four model-not-in-title; overlapping commerce counts were diagnostic only.
The 42.273-second run used one create, 14 retrieves, three hosted searches, one
cancel, and `$0.184904` frozen-conservative estimated cost. There was no retry,
replacement, fallback, second case, public result, flag change, or deployment.

The only artifact is untracked 16,119-byte `attempt.json`, SHA-256
`fb6fe1ad6324a9bb6b85a2a2634ab6eef25378ee1d696220fc5ef54510214a30`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99 for commit/case/schema binding, counters, usage, cost, conservation,
branch bounds, and privacy. It contains no raw/provider/candidate/product/source
identity, prompt, body, header, credential, key, secret, or token. The artifact
is spent and was not read or staged by the implementing agent.

**Why downstream relaxation was rejected:** all 12 first losses showed upstream
identity misalignment, not permission to display ambiguous products. Another
unchanged call, blind extra fetches, or two URLs without identity grounding
would repeat the producer/consumer gap. Canonical ownership or cross-variant
title borrowing would weaken provenance.

**What changed:** research schema v5 requires exactly two fetch-distinct exact
response-owned sources per candidate and local lead indexes only 0/1. A
rejection-only key removes established tracking parameters and fragments so
same-physical-page variants fail; identity-bearing queries remain distinct.
Exact membership still establishes ownership, and title backfill is allowed
only for the identical URL.

At least one candidate-owned exact title/URL record must pass the unchanged
shared asset-identity verifier before collection. Title-visible identity is
preferred; the existing bounded direct-manufacturer/established-retailer slug
path remains supported, while sibling and unknown-retailer slugs fail. Source
metadata is preflight only and cannot become final evidence or shopper output.
The maximum 15 candidates times two sources equals the unchanged 30-fetch
ceiling. Contract v7, prompt v6, and runtime v6 invalidate old jobs.

**Tests and proof:** fail-first passed 32 checks and failed exactly five new
expectations. The complete suite passed 1,489/1,489 across 214 suites; E2E
passed 17/17; five deterministic partitions reconciled; the benchmark passed
10/10 cases and 29/29 invariants. Typecheck, production build, lint (zero errors,
three existing warnings), legacy eval, fixed ranking comparison, and diff checks
passed; `next-env.d.ts` was restored.

**Independent review:** review found fetch-equivalent tracking and fragment
variants, prompt/runtime disagreement about safe slug identity, missing same-
exact title-backfill coverage, and an unlocked 15x2 ceiling. After correction,
terminal verdict was `APPROVED`, no findings, confidence 0.98. The reviewer
personally passed 150/150 plus non-incremental typecheck, the fragment mutation,
and diff checks.

**Limits:** this is a generalized zero-live correction after the PR-3E
measurement. It does not prove PR-3E candidate-level causation, live adherence,
recommendation quality, latency, cost, or lifecycle feasibility. RR-091/RR-092
and the wider security, accessibility, operations, and active-path measurement
debts remain open.

**Next recommended step:** after the PR-3F closeout commit leaves a clean tracked
tree, run one PR-3G commit-pinned `shop vac` measurement in a new directory under
the unchanged ceilings and first-terminal/no-retry policy. This is stronger
than broad live QA because feasibility remains the proven blocker. Reasoning
level: High for trust/evidence adjudication and Medium for mechanical execution.

## Codex Run - 2026-08-29 PR-3G live stop and PR-3H candidate quarantine

**Goal:** measure the source-grounded staged contract once, preserve the first
terminal result as privacy-bounded evidence, then fix only the generalized
all-or-nothing rejection behavior established by the executable path.

**Live outcome:** one frozen `shop vac` lifecycle ran at clean commit
`ac53c10e707b67945f7df4f4cbda129c7c6ef69d`. A preliminary CLI form used
separated approval tokens; the local parser rejected it before counters,
directory creation, network, artifact, or spend. The one actual lifecycle used
the required `--name=value` form and was not retried.

The provider reached terminal `completed`, but strict local validation stopped
at `research_candidate_invalid / candidate_sources /
candidate_source_identity_unproven`. Page collection, Shopping, deterministic
verification, presentation, rendering, and a public result did not run. The
75.501-second attempt used one create, 31 retrieves, six hosted searches, one
safety cancel, 56,876 input tokens, zero cached input, and 7,759 output tokens.
Frozen-conservative estimated cost was `$0.354123`; no retry, replacement,
fallback, organic/SearchAPI request, second case, flag change, or deployment
occurred.

The only artifact is untracked 26,300-byte evidence-v4 `attempt.json`, SHA-256
`2E3296650224BF28EEE56166860A9B82C22EC7ED6B93C374594F2869FDE0C1CE`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99 for commit/case/schema binding, terminal sequence, counters, usage, cost,
and privacy. It retains no raw/provider/candidate/product/source identity,
prompt, body, header, credential, key, secret, or token. The exact rejection
distribution is therefore unknown, and the artifact is spent.

**Why prompt or gate relaxation was rejected:** the response completed below
the output cap, refuting the token-cap hypothesis. A prompt-only revision would
leave schema-valid all-or-nothing behavior intact, while weaker identity would
permit ambiguous products. Candidate-level fail-closed quarantine preserves
the trust predicate and useful schema-valid survivors.

**What changed:** after the strict 8–15-candidate parse, each candidate's two
exact response-owned title/URL records run through the unchanged shared asset
verifier. Candidates with no accepted record are removed before any fetch or
Shopping request; survivors retain discovery order and receive contiguous
server-owned candidate and fact IDs. Zero survivors fail with the same bounded
validation triple.

The server-only diagnostic reports submitted, accepted, and rejected candidate
counts plus five reachable reason families. The verifier contributes one or
two distinct families for each rejected candidate. The route requires exact
keys, safe integers, conservation, each family no greater than the rejected
count, an aggregate reason total from the rejected count through twice that
count, completed-count equality with the actual survivor slate, and the exact
zero-survivor failure context. Malformed/private counts are omitted.
Contract v8/runtime v7 and authentic stale-token coverage roll old jobs closed;
future sanitized Phase D evidence is v5. Schema v5, prompt v6, public bodies,
flags, ceilings, and downstream trust gates remain unchanged.

**Tests and proof:** the corrected focused contract/integration/runtime/route/
runner/shared-verifier wall passed 126/126. The complete suite passed
1,495/1,495 across 214 suites; E2E passed 17/17. Typecheck, production build,
legacy eval, fixed ranking comparison, zero-network dry run, five-partition
reconciliation, tracked benchmark 10/10 cases and 29/29 invariants, and diff
checks passed. Lint had zero errors and the same three pre-existing warnings;
`next-env.d.ts` was restored.

**Independent review:** review found context-unbound evidence counts, no upper
bound for two sources per rejected candidate, and two unreachable proposed
reason buckets. After context binding, two-times conservation, five-branch
materializer coverage, and impossible-state fail-closed handling, terminal
verdict was `APPROVED`, no findings, confidence 0.97. The reviewer personally
passed 89/89, non-incremental typecheck, and final tracked-state authentication.

**Process caveat:** two overbroad repository searches traversed the live-fixture
tree. The PR-3G match exposed only already-known terminal outcome keys; a later
legacy-fixture match exposed only fixed rejection-reason tokens. No raw/private
field, credential, product/source identity, prompt, or body was displayed. All
subsequent searches excluded the live-fixture tree. No artifact was edited,
staged, retried, or reused.

**Limits:** candidate quarantine can reduce recall and the next live survivor
count is unknown. PR-3H does not prove quality, latency, cost, stability, or a
complete shopper lifecycle. RR-091/RR-092 and broader security, accessibility,
operations, and active-path measurement debts remain open.

**Next recommended step:** after a clean self-contained PR-3H closeout commit,
run one PR-3I commit-pinned `shop vac` measurement in a new directory under the
unchanged ceilings and first-terminal/no-retry policy. Only a safe public result
unlocks PR-4. Reasoning level: High for trust/evidence adjudication and Medium
for the bounded mechanical execution.

## Codex Run - 2026-08-29 PR-3I title-metadata stop and PR-3J tri-state deferral

**Goal:** measure the candidate-quarantine contract once, preserve the first
terminal result, and correct only the earliest generalized API-metadata mismatch
proven by that evidence.

**Live outcome:** one frozen `shop vac` lifecycle ran at clean commit
`bd54de9076cf6752ee2beefd686689852f6f9994`. Provider research completed, then
local validation stopped at `research_candidate_invalid / candidate_sources /
candidate_source_identity_unproven`. Page fetching, Shopping, deterministic
verification, presentation, rendering, and public output remained zero. There
was no retry, replacement, fallback, second case, organic/SearchAPI work, flag
change, or deployment.

The 56.020-second envelope used one create, 24 retrieves, one safety cancel,
five hosted searches, 47,475 input tokens, zero cached input, and 5,516 output
tokens. Approval-envelope, frozen-conservative, and informational current costs
were `$0.251428`, `$0.281099`, and `$0.211142`.

The only artifact is untracked 21,584-byte evidence-v5 `attempt.json`, SHA-256
`03D442FFE14D819D6C23A2E76C2458E37AF6A2EBE7691A6DC4F6EA0ED2827B3F`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99 for exact commit/case/schema, terminal sequence, counters, usage, cost,
and privacy. The directory is immutable and spent.

**Root cause and decision:** the aggregate reports 10 submitted, zero accepted,
10 rejected, and at least one missing-title decision per candidate; all
affirmative mismatch families are zero. It cannot reveal a source mapping or
whether both sources lacked titles. Official Responses source actions provide
the complete consulted URL list as URL-only records, so treating missing title
as affirmative failure was a generalized consumer/API mismatch. Trusting model-
authored titles, URL-slug inference, undocumented result shapes, or weakening
downstream identity would be materially less safe.

**What changed:** contract v9/runtime v8 use three states. A title-proven exact
source retains the candidate. With none accepted but any titleless exact source,
the candidate is deferred to the existing bounded DNS-pinned page fetch and
unchanged entity verifier. Only all-affirmative title mismatches quarantine it.
The aggregate now reports a deferred-missing-title subset of accepted/continued
candidates plus four affirmative mismatch families; exact-key sanitization
binds conservation, context, and slate counts. Future sanitized evidence is v6.
Schema v5, prompt v6, public responses, flags, ceilings, ownership, and every
downstream trust gate remain unchanged.

**Tests and proof:** fail-first passed 58 checks and failed exactly five new
expectations. The corrected trust wall passed 169/169; the complete suite passed
1,498/1,498 across 214 suites; E2E passed 17/17. Nonincremental typecheck,
production build, lint (zero errors/three old warnings), eval, fixed ranking,
five-partition reconciliation, 10-case/29-invariant benchmark, and diff checks
passed; `next-env.d.ts` was restored.

Independent source-only review returned `APPROVED`, no findings, confidence
0.96. The reviewer's attempted filtered 92-test command unexpectedly read the
tracked public `.env.example`; that run is non-authorizing and excluded from
proof. It did not access `.env.local`, credentials, secrets, live fixtures, or
network, and the source verdict rests only on the permitted eight-file diff.

**Limits and next step:** this default-off zero-live correction can consume up
to the existing 30 page-fetch attempts and does not prove post-fetch survivor
quality, latency, cost, stability, or shopper success. After a clean PR-3J
commit, run one PR-3K commit-pinned measurement in a new directory under the
unchanged first-terminal/no-retry envelope. Reasoning level: High for evidence
and trust adjudication; Medium for the mechanical invocation.

## Codex Run - 2026-08-29 PR-3K first complete staged lifecycle

**Goal:** measure the reviewed tri-state contract once and require a complete,
safe, privacy-bounded shopper result—not merely research completion, deferral,
page-fetch activity, or a smaller slate.

**Preflight and invocation:** focused runner tests passed 10/10. A zero-network
dry run bound the exact frozen `shop vac` case, model/reasoning levels, `$3`
gate, and all counters to clean PR-3J commit
`8c57cd594a7f060aa358afedb0e1baab429a5d89`. Branch, tracked/index state,
`next-env.d.ts`, and committed defaults were clean. The prospective directory
was absent; required credentials were checked only for boolean presence/safe
shape. Exactly one `--name=value` invocation ran.

**Terminal result:** the route completed research, deterministic verification,
no-web presentation, and public output in 116.495 seconds. Research returned a
queued start, 39 in-progress retrieves, and completed on retrieve 40. Public
output contained four sequential unique cards and eight registered source
entries; every card reference and commerce URL resolved.

The envelope used two OpenAI creates, eight hosted searches, 10 Shopping
requests, 20 source fetches, and 25 physical HTTP attempts. Safety cancels,
retries, replacements, fallbacks, organic, SearchAPI, second cases, flag
changes, and deployment were zero.

Tri-state preflight reported 10 submitted, 10 accepted/continued, 10 deferred-
missing-title, zero rejected, and zero in all four affirmative mismatch
families. Product-data collection succeeded for 14 of 20 exact sources and
Shopping returned 156 rows. Verification produced four eligible, zero close,
and six excluded. First loss conserves as five asset identity, one product URL,
and four no-loss eligible; relationship and hard-requirement losses were zero.

Two distinct completed ledgers account 77,273 input tokens, zero cached input,
9,064 output tokens, and eight searches. Estimated cost was `$0.409142` frozen
nominal, `$0.457438` frozen conservative, and `$0.343314` current, below `$3`.

**Independent evidence:** the exact spent directory contains only 51,640-byte
evidence-v6 `result.json`, SHA-256
`9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99. It authenticated commit/case/ceilings, lifecycle order, counts,
conservation, cost arithmetic, four-card/eight-source public reconciliation,
closed privacy fields, response hashes in place of IDs, and clean default-off
state. The implementing agent never opened or enumerated artifact contents.

**Assessment and next step:** PR-3K closes the PR-013 one-lifecycle feasibility
blocker. It does not prove repeatability, current market-leader recall,
hard-requirement truth across categories, final-set stability, latency/cost
distribution, or production readiness. The legacy scorecard targets the legacy
route and its July leader set may be stale. PR-4A should therefore refresh a
small current-market truth set and build an exact staged-path aggregate harness
with independent review before any matrix spend. Reasoning level: High for
truth/trust design; Medium for routine harness execution.

## Codex Run - 2026-08-29 PR-4A staged readiness measurement boundary

**Goal:** replace the legacy-route/stale-truth measurement gap with a dated,
privacy-safe staged-path contract before spending on repeated live evidence.

**Assessment:** this was the proven prerequisite. PR-3K established one safe
lifecycle but not current accuracy or repeatability; immediately widening live
spend would have produced results that the legacy harness could not score
honestly. The stronger alternative was to freeze truth, attempt identity,
absolute bars, and manual authority first.

**What changed:** added a reviewed four-case/six-attempt matrix, a canonical
artifact producer, a strict aggregate/prefix analyzer, and 34 mutation-heavy
tests. Exact serial order, run IDs, nonces, request hashes, prior-artifact hash
chain, current-source window, per-run/aggregate cost and network ceilings,
latency/currentness rules, public/private reconciliation, manual card/source
audits, and final-card stability are bound before any result exists.

Candidate-pool Jaccard is explicitly not scored because the sanitized contract
contains no non-public candidate identities and stable hashes would weaken
privacy. Every output stops: clean prefixes require review of the next attempt,
and a clean complete set requires independent review. Origin, machine, and
release authorization remain false, so the harness cannot dispatch spend,
promote a flag, deploy, or release.

**Independent evidence:** after corrections for impossible terminal tuples,
failed-presentation trace binding, and nonempty URL fragments, replacement
review returned exact `VERIFIED`, no actionable finding, confidence 0.97 on
the authenticated four-file snapshot.

**Verification:** focused 34/34; complete 1,532/1,532 across 215 suites; all
five worker partitions reconciled; benchmark 10/10 cases and 29/29 invariants;
typecheck, build, E2E 17/17, lint with zero errors/three old warnings, eval,
ranking, both zero-network dry runs, syntax, and diff checks passed. No PR-4A
provider, product-data, route, replay, or live-fixture call ran.

**Residuals:** source truth expires 2026-09-12 and was not independently
refreshed by the offline reviewer. Provider behavior and all six results remain
unknown. Two main-agent command outputs accidentally enumerated live-fixture
filenames, without reading content or values; the independent reviewer did not
touch the tree. The process deviation is documented and future work must use
only explicit/tracked paths.

**Next decision:** authenticate the self-contained PR-4A commit and obtain an
independent, origin-bound review of the first exact PR-4B attempt and capture
path. Execute at most one precommitted run, analyze its canonical artifact and
manual audits, then stop. Recommended reasoning: High for each live/evidence
gate; Medium for mechanical capture and deterministic checks.

## Codex Run - 2026-08-29 PR-4B zero-live serial runner source gate

**Goal:** create the smallest commit-authenticating capture seam needed for one
exact PR-4A attempt, without reading a spent fixture or making a provider call.

**Assessment:** this was the proven next prerequisite. PR-4A already froze the
truth and score contract; another analyzer would not create origin evidence,
while immediate live execution lacked a reviewed commit/capture boundary. The
strongest in-scope alternative was therefore one dry-run-first serial runner
with independent source adjudication before any spend.

**What changed:** added a runner, IO/authentication layer, executable, and 15
regression tests. The runner binds commit, raw and canonical matrix hashes,
attempt/request/run/nonce, prior artifact, output, all ceilings, clean state,
default-off flags, and safe credential shape. It authenticates a recursive
local import closure to Git `100644` blobs plus raw bytes, fails closed on
nonliteral loading, rejects indirect output paths, uses append-only fsynced
checkpoints and no-replace publication, and passes only the current closed
public route result plus allowlisted diagnostics to the PR-4A producer.

**Fail-first and independent evidence:** the first focused run failed with the
expected missing-runner `ERR_MODULE_NOT_FOUND`. Three successive independent
reviews then required correction of untracked-source trust, indirect output
parents, replace-in-place checkpoint loss, incomplete transitive closure, and
dynamic imports with options. The fourth frozen-snapshot review returned exact
`VERIFIED`, no actionable finding, confidence 0.99.

**Verification:** focused 15/15; combined PR-4A/PR-4B 49/49; local closure 57
paths with zero failures; complete tests 1,547/1,547 across 216 suites;
typecheck, production build, E2E 17/17, syntax, and lint with zero errors/three
old warnings passed. Deterministic controller
`agent-loop-2026-08-29T23-03-39-286Z` reconciled all five worker partitions,
10/10 benchmark cases, 29/29 invariants, deterministic eval, typecheck, lint,
and the complete unit wall. The build automatically loaded ignored
`.env.local`, but no value was inspected or exposed. Playwright's generated
`next-env.d.ts` change was restored and the file is clean. No provider,
product-data, replay, credential, or live-fixture call ran.

**Residuals and next decision:** external installed package bytes remain
lockfile-bound rather than locally byte-authenticated, and path-based Node APIs
cannot eliminate every adversarial concurrent swap. More importantly, no live
behavior, recommendation quality, latency, or cost was measured. Authenticate
the self-contained commit, clean state, trust-manifest digest, exact
`broad-shop-vac:1` dry plan, prospective absent output, and complete approval
arguments in a separate independent review. Only then may exactly one bounded
invocation be considered. Recommended reasoning: High for commit/live/artifact
authority; Medium for deterministic execution.

## Codex Run - 2026-08-29 PR-4B sanitized credential-launch correction

**Goal:** load the two user-owned live credentials without allowing the local
environment file or inherited shell to alter endpoint, loader, proxy, TLS,
debug, retry, argument, or trust behavior.

**Assessment and root cause:** the exact committed runner dry plan was already
independently verified, but the inherited shell did not contain the required
credentials. A value-blind broad `--env-file` probe returned only `ready`.
Independent review showed that using it for execution would import unrelated
process controls, so the proposed invocation was rejected before spend. The
strongest correction was a source-authenticated allowlist launcher, not a
broader shell or manual secret handling.

**What changed:** added a launcher that authenticates the exact commit,
arguments, and full trust surface before credential access and immediately
before spawn; rejects inherited debug/loader/TLS controls; and reads the fixed
ignored file through one identity-checked handle with stable realpath and
device/inode/size/mtime/ctime metadata. It retains only the two required
credentials, rebuilds a minimal child environment, fixes locale/timezone and
the official OpenAI endpoint, and spawns the exact runner with `shell:false`.
The runner's SDK client also fixes that endpoint and disables retries.

**Fail-first and independent evidence:** fail-first produced the expected
missing-launcher error. The first review returned `CHANGES REQUIRED`,
confidence 0.995, after reproducing a debug-mode canary leak and identifying a
path-read swap race. Corrections reject controls before reading and before
spawn, with no asynchronous gap, and read only from one authenticated handle.
Replacement review returned exact `VERIFIED`, no finding, confidence 0.98. The
reviewer accessed no environment file, credential, provider, network, or live
fixture.

**Verification:** launcher 5/5; launcher/runner 20/20; combined PR-4A/launcher/
runner 53/53; complete suite 1,552/1,552 across 217 suites; typecheck,
production build, E2E 17/17, syntax, and lint with zero errors/three old
warnings passed. A sanitized dummy child dry run exited zero with only the five
expected precommit trust failures. No actual credential value was inspected,
printed, copied, hashed, or staged, and no live call ran. Deterministic
controller `agent-loop-2026-08-29T23-47-19-401Z` passed typecheck, lint, all
1,552 tests, deterministic eval, all five serial partitions, and the tracked
10-case/29-invariant benchmark with no repeated failure candidate.

**Limits and next step:** host Node, Windows process launching, NTFS, Git, PATH,
and installed dependency bytes remain trusted. At source review time, the
correction was not commit-authenticated. Bind it in this self-contained local
commit, generate a new zero-network plan, and obtain a fresh independent exact-
commit verdict before at most attempt 1. Recommended reasoning: High for
commit/live authority; Medium for deterministic plan generation.

## Codex Run - 2026-08-29 PR-4B attempt 1 consumed pre-provider

**Goal:** execute the first independently approved readiness attempt exactly
once, preserve its evidence, and stop on any nonterminal or trust failure.

**Exact authorization:** independent read-only review authenticated clean
`main` commit `6e0446bfc19e435a584ebf3eab18522d47207164`, parent
`d2df488431c4da4176c8de56baf6d9f44efa1dc8`, the six reviewed source hashes,
61 trust entries with digest
`f82e18a3ec21de995130128832d8dca03698309262a942e39fe2dae2ad6a5b1c`,
the unexpired matrix, exact attempt/request/run/nonce, all 27 arguments and
ceilings, and an absent direct prospective leaf. Terminal verdict was
`VERIFIED`, no findings, confidence 0.99, for one invocation only.

**Result:** the exact launcher command ran once, exited 1 after about 9.55
seconds, and emitted only its generic pre-runner stop sentence. The authorization
is consumed. No retry, replacement, direct-runner fallback, attempt 2, flag
change, deployment, release, or push occurred or is authorized.

**Independent post-stop proof:** branch, commit/parent, clean tree/index, six
hashes, and the 61-entry trust digest remained exact. The prospective leaf was
still absent, with direct fixed parents and zero failures. Because the trusted
runner creates that leaf before provider work, no provider request occurred and
no artifact exists; confidence 0.99. The main agent did not inspect or enumerate
live-fixture content.

**Root-cause limit:** the generic launcher catch combines every pre-spawn gate,
spawn error, and signaled/noninteger child exit. The missing runner output and
one-trust-pass duration make the credential gate the leading inference,
confidence 0.75, but not a proven cause. No credential file, metadata, presence,
value, length, hash, or prefix was manually accessed.

**Verdict and next step:** `CONSUMED — PRE-PROVIDER STOP, FAILURE STAGE
UNATTRIBUTED; NO RETRY AUTHORIZED`. PR-021 is the proven generalized defect.
Add closed, versioned, nonsecret terminal stages with exhaustive fail-first and
leak-negative tests, then obtain independent source review. That correction
cannot revive the consumed authorization or permit new live work. Recommended
reasoning: High for taxonomy/privacy/authority; Medium for localized execution.

## Codex Run - 2026-08-29 PR-021 typed nonsecret launcher terminal

**Goal:** make future one-shot readiness-launcher failures attributable without
inspecting credentials, exposing raw diagnostics, or weakening the consumed-
attempt and no-retry boundaries.

**Assessment and root cause:** the generic terminal—not provider behavior—was
the proven blocker. It merged every pre-spawn, spawn-error, and
signal/noninteger-child failure into one sentence. Inspecting `.env.local`,
logging raw errors, or repeating the invocation would have crossed the trust or
authorization boundary. The strongest correction was a closed typed taxonomy
covering complete executable control flow.

**What changed:** the launcher emits one canonical
`staged-terra-readiness-launcher-terminal-v1` JSON line with six exact keys,
nine fixed stages, and false retry/replacement/next-attempt authority. A test-
only operation seam covers every synchronous and asynchronous boundary while
the CLI retains real operations. Unknown values map to internal failure; raw
errors, paths, arbitrary properties, and credential canaries never serialize.
Integer child exits and all existing trust, credential, environment, endpoint,
retry, spawn, and one-shot controls remain unchanged.

**Fail-first and independent evidence:** fail-first stopped on the missing
terminal export. The first frozen source review returned `CHANGES REQUIRED`,
confidence 0.995, because the public stage could be mutated and a prototype
spoof could inject arbitrary text. The replacement uses a module-private
`WeakMap` brand plus a nonwritable/nonconfigurable public stage. Replacement
review returned `VERIFIED`, no actionable findings, confidence 0.995, for
launcher SHA-256
`eaa98872a4fe8829438985b0e5c05cce3a7ca2117ac7863c72d245c26e386c72`
and test SHA-256
`4f6bdfe19af947e451b28fd63c26b43261c2ded9ae152b442993521fb7545c50`.

**Verification:** terminal 7/7; launcher/terminal/runner 27/27; complete suite
1,559/1,559 across 218 suites; typecheck, production build, Playwright 17/17,
syntax, diff, and lint with zero errors/three old warnings passed. Controller
`agent-loop-2026-08-30T00-30-38-163Z` reconciled the full unit wall,
deterministic eval, all five serial partitions, and 10/10 benchmark cases with
29/29 invariants. The build automatically noted ignored user-owned `.env.local`
without exposing a value; generated `next-env.d.ts` was restored. No credential
file, provider, product-data service, network, or live fixture was accessed.

**Limits and next step:** the consumed attempt's historical stage remains
unknown. PR-021 cannot revive it or authorize any live continuation. With the
measurement protocol blocked, the strongest next zero-live release gate is
PR-008/RR-092: the shared fact verifier is reachable from the staged path, and
its professional-test Product markup can still supply an image candidate even
when tested-model attribution is inconclusive. RR-091's original isolated-path
price defect already has an exact-entity regression and is not imported by the
application route, so it should be audited after the active staged asset gate.
Recommended reasoning: High for tested-model/image authority; Medium for
localized fixture and regression work.

## Codex Run - 2026-08-29 PR-008 professional-test exact-model authority

**Goal and assessment:** close RR-092 without adding publisher/product special
cases or weakening image recall beyond the proven trust boundary. The complete
staged fail-first did not reproduce image borrowing because existing asset
safety already rejected it. The shared verifier did reproduce exact
identity/image authority from Product JSON-LD without exact tested-model proof,
so the correction belongs in `lib/autonomousFactVerifier.ts`.

**Change:** verifier v2 requires a complete stable tested identifier or explicit
proposed alias, rejects shared-family/sibling tokens, and gates professional-test
identity, entity selection, and imagery on a verified tested model. A stable
explicit Product model is authoritative: unrelated/conflicting values reject
before name or SKU fallback. Missing or contradictory authority clears a
provisional image. Official, purchase-page, commerce, owner, and manufacturer
behavior remains unchanged.

**Fail-first and review:** initial shared tests produced two intended failures;
review mutations reproduced sibling-token/entity bypasses, then an unrelated
`B900` explicit-model bypass. Two frozen reviews returned `CHANGES REQUIRED`.
After generalized corrections and direct negative/positive controls, the final
review returned `VERIFIED`, no findings, confidence 0.995. Final hashes are
verifier `efe5a0c2…cc2ebf6`, verifier tests `4764e6b1…be0a2d`, and staged tests
`d4bc7248…7816961d`.

**Verification:** focused 57/57; complete 1,568/1,568 across 218 suites;
typecheck; production build; Playwright 17/17; syntax/diff; full lint with zero
errors and three old warnings. Controller
`agent-loop-2026-08-30T01-03-39-664Z` passed all five serial partitions,
deterministic eval, 10/10 cases, and 29/29 invariants with no repeated failure.
The first default controller run covered only `price-trust` and was not
misrepresented as the full matrix.

**Live calls and limits:** zero. No environment file was manually accessed and
no credential, provider, product-data service, network, or live fixture was
used. RR-092 is Fixed, but ReviewRadar remains NOT READY: PR-006 live quality
measurement is blocked, RR-091 is unresolved, and UX/security/operations remain
open. The next phase is a zero-live RR-091 reachability/exact-price audit; only a
current reproduction may justify code changes. Recommended reasoning: High for
reachability and price-authority judgment; Medium for deterministic audit work.

## Codex Run - 2026-08-30 PR-007 reachable exact-model price authority

**Goal and assessment:** determine whether RR-091's historical related-product
price defect reaches the current product before assuming a fix. Static import
and route analysis found `lib/autonomousResearchAdapter.ts` in scripts/tests
only; a tracked characterization confirms its URL/source-role contract remains
unsafe. The staged and Direct-Terra routes remain default-off, Direct-Terra
transactional output remains unverified, and the legacy route imports neither
the historical adapter nor the shared experimental paths. Current shared
experimental consumers nevertheless reproduced a generalized partial-model
identity weakness capable of authorizing sibling transactional evidence.

**Change:** introduced one shared `modelIdentityRelation()` for stable aliases,
compound and descriptive models, contextual years/decimals, measurements,
technology phrases, conflicts, bounded split/compact model/variant/trim labels,
and symmetric assertion connectors. Commas work only inside a complete
recognized assertion; feature-list and hard punctuation remain boundaries.
Commerce verifier v2, SearchAPI offers v2, fact verifier v3, Direct-Terra asset
verifier v6, product-page URL/title/path selection, and staged materialization
reuse the relation. Accessory/replacement classification remains separate.

**Fail-first and independent review:** successive review challenges found
concrete gaps in sibling concatenation, years/decimals, multiword and compact
labels, technology versions, labeled technology spans, forward/reverse single-
and multiword copulas, and appositive commas. Each was locked fail-first before
the generalized correction. Final frozen replacement review returned
`VERIFIED`, no material correction, confidence 0.995, and independently rejected
60/60 generated comma-punctuated connector assertions without feature-control
false positives. Shared identity SHA-256 is `f6221405…23f13bc`; identity-test
SHA-256 is `ca5a97f9…303cc07`; the complete 17-file manifest is in the canonical
QA entry.

**Verification:** focused 205/205 across 14 suites; complete 1,604/1,604 across
218 suites; typecheck; production build; Playwright 17/17; diff; full lint with
zero errors and three old warnings. Controller
`agent-loop-2026-08-30T05-25-58-006Z` passed all five partitions, deterministic
eval, 10/10 cases, and 29/29 invariants. The scorecard stopped at its cost guard
before provider work. The ledger benchmark made zero provider calls and measured
0.253 ms/request overhead. Build-generated `next-env.d.ts` was restored.

**Live calls, limits, and next step:** zero. No credential, manual environment-
file, provider, product-data service, network, or live fixture was accessed.
RR-091 remains `Needs Investigation — contained/narrowed`: shared reachable
boundaries are corrected, but the isolated historical adapter may not be
promoted. ReviewRadar remains NOT READY because PR-006 live quality measurement
is blocked and UX/security/operations gates remain open. The strongest available
next step is PR-6A: a read-only production-boundary audit to identify the first
evidence-proven security, resilience, accessibility, or operations blocker
before implementation. Recommended reasoning: High for security/reliability
selection; Medium for bounded deterministic execution.

## Codex Run - 2026-08-30 PR-6A production-boundary baseline

**Goal and assessment:** establish which reachable production boundary is the
first release blocker while live quality measurement remains blocked. The
audit found a stronger issue than generic headers or UX polish: the default
legacy recommendation route sends untrusted provider/Serper URLs through two
direct server fetchers outside the newer DNS-pinned bounded transport.

**Confirmed findings:** a zero-network mock intercepted direct calls from
`citationUrlVerification.ts` and `productAssets.ts` to two link-local metadata
paths. The first fetcher accepts any parseable URL and launches all unique
checks concurrently; the second follows redirects, reads full HTML, and
enriches products concurrently. PR-022/RR-103 is therefore the highest blocker.
PR-023/RR-104 separately records missing paid-request admission, input/body
bounds, cache capacity/eviction, and miss coalescing. A 50,010-character query
reached fake client creation and a zero-network cache probe retained 512 unique
zero-TTL keys. PR-024/RR-105 records missing legacy request-signal propagation.

**Covered and unknown:** bounded hybrid fetching, TTL/capacity-capped progress
and experimental job stores, signed-job cancellation, production-gated debug
logging, and existing keyboard/mobile/error E2E flows are covered but limited.
Tracked evidence does not establish CDN/WAF limits, production headers,
multi-instance ownership, health/rollback operations, fresh dependency
advisories, assistive technology, or real-device mobile behavior.

**Verification and review:** focused offline boundary tests passed 97/97. The
independent reviewer passed 72/72 consumer/route/progress tests, 29/29 hybrid-
fetch tests, and typecheck; repeated the no-network mock; and returned
`VERIFIED`, no material correction, confidence 0.98. No application/test code
changed, so the complete PR-007 wall remains the last full baseline rather than
being presented as rerun evidence.

**Limits and next step:** no provider, credential, environment-file, real
network, deployment, or live-fixture content was accessed. One slash-only
exclusion mistakenly printed five spent-fixture filenames when PowerShell used
backslashes; no contents or metadata were read, and later discovery used only
explicit root-level test files. PR-6B is the next isolated fail-first unit:
reuse one DNS-pinned bounded fetch primitive at both legacy consumers and bound
fan-out. Paid admission/cache and cancellation remain later separate units.
Recommended reasoning: High for SSRF/DNS/redirect correctness; Medium for
localized wrapper integration and deterministic tests.

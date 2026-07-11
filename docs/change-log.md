# ReviewRadar Change Log

Plain-English record of meaningful ReviewRadar changes.

Update this file after:
- major pipeline changes
- ranking/search/evidence changes
- UI feature changes
- important bug fixes
- live QA fixes worth remembering

Do not update this file for tiny typo fixes, formatting-only edits, or internal cleanup that does not change behavior.

## 2026-07-11

### Claude - Phase R4 deterministic constraint-preserving query allocation

#### Changed

- Implemented Phase R4 behind default-off `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`; flag-off behavior is byte-identical (pinned by an exact plan snapshot test) and the full regression wall stayed green.
- RR-073: standalone non-negative Important Details are reclassified from "Needs review" to explicit preferred strength — they now shape search queries via the existing preference lane, fill requirement query slots when no hard requirement exists, and are verified non-gatingly in validation (verified → matched; unverified → the existing softUnknown confidence bucket; never eliminating).
- RR-075: a subtype category matched to a parent synonym group by inclusion keeps only the shopper's own category (exact-key groups keep full breadth), and pass-1 assembly orders constraint-bearing queries ahead of generic ones, so the protected Shopping slots carry the constraint by construction. Same Serper budget — reallocation only.
- RR-074: budget binding recognizes bounds written without a dollar sign ("under 300") and normalizes them in place instead of appending a duplicate "under $300"; equivalent queries now merge instead of running twice.
- Benchmark (robot vacuum / under $300 / self-emptying) flag-on: all leading Shopping queries carry "self-emptying", the three diluted vacuum-form queries are gone, retailer queries name the full category, and the one broad query survives at the back of pass 1 for recall.

#### Verified

- Fail-first: 6 flag-on tests failed before implementation, 12/12 after; flag-off snapshot, classification, duplicate-budget, and validation defaults pinned unchanged.
- `npm run typecheck`: pass. `npm run lint`: 0 errors, 3 existing warnings.
- `npm test`: 834/834 across 122 suites. `npm run build`: pass.
- `node scripts/eval-pipeline.mjs`: no red flags with the flag off AND on.
- Live Serper/OpenAI calls: 0. `.env.local` unchanged; flag not promoted.

### Codex - Phase R4 adversarial closure

#### Changed

- Corrected preferred constraints to carry `strictness: "soft"` while explicit hard wording remains `strictness: "hard"`.
- Removed category-colliding preferences from query allocation so they cannot duplicate category text or mask another real preference.
- Extended budget equivalence to comma-formatted bounds such as `under 1,300`, alongside `less than 300` and `max 300`.
- Preserved flag-on/off plans for categories outside every synonym group and combined hard/preferred evidence in the leading query.
- Repaired an accidental mojibake rewrite so the QA-log diff contains only the intended R4 entries.

#### Verified

- Adversarial fail-first: 12/16 with exactly four intended failures; final R4 matrix: 16/16.
- Focused requirement/search matrix: 111/111. Full suite: 838/838 across 122 suites.
- Typecheck/build pass; lint 0 errors/3 existing warnings; offline eval has no red flags with the flag off and on.
- Live Serper/OpenAI calls: 0. `.env.local` unchanged.

### Codex - RR-078/RR-079 eligibility and product-type safety

#### Changed

- Fixed RR-078 at the shared eligibility boundary: embedded customer-service routes and dated `YYYY/MM/*.html` editorial routes are evidence-only and cannot render as product cards; dated commerce routes remain eligible.
- Fixed RR-079 at the shared type boundary: standalone robot-vacuum docks, docking/charging stations, clean or dust-disposal bases, and self/auto-empty bases or stations are exclusive complements, while explicit vacuum-plus-dock bundles remain eligible.
- Preserved model-specific product pages using `/pages/`, editorial evidence use, sparse legitimate product names confirmed by recommendation evidence, and lean-evidence wrong-type vetoes.
- Left search planning/allocation, ranking, requirements, price, citations, images, R3 flags, and `.env.local` unchanged. Zero live calls.

#### Verified

- Fail-first focused run: 33/35 with exactly the RR-078 and RR-079 cases failing.
- Final adversarial review added a brand-prefixed dock title; it failed 12/13 before correcting dynamic-regex escaping, then passed.
- Final focused eligibility/type/validation run: 97/97.
- Full suite: 822/822 across 120 suites. Typecheck/build/offline eval pass; lint: 0 errors, 3 existing warnings.
- `npm run qa:plan` was dry-run only; it made no live provider calls.

### Codex - RR-061 round 4 and RR-080 image filename repair

#### Changed

- Reopened RR-061 after adversarial testing proved a Saros 10 filename could pass for a Saros Z70 target, then returned it to Fixed after adding direct family-to-mixed-model sibling detection.
- Filed and fixed RR-080: explicit neutral image vocabulary prevents shot counters and repeated neutral words from becoming foreign model claims, while one-digit product-family protection remains intact.
- Preserved the compatible target-model escape and all earlier image provenance, navigation, same-model, opaque CDN, JSON-LD, Google, Amazon-modifier, retina, dimension, and model-less controls.
- Left RR-078/RR-079, search, ranking, requirements, price, citations, R3 flags, and `.env.local` unchanged. Zero live calls.

#### Verified

- Fail-first focused resolver: 24/26 with exactly two intended failures; final focused: 27/27.
- Full suite: 818/818 across 120 suites. Typecheck/build/eval pass; lint: 0 errors, 3 existing warnings.

### Codex - RR-061 image-provenance safety repair

#### Changed

- Stopped product-page identity from automatically authenticating every `<img>` on the page; page images now need image-level target evidence.
- Extended the dictionary-free filename guard to split word-number model identities and repeated non-generic family names, closing the R2 QRevo/Saros bypasses.
- Preserved matching Product JSON-LD, neutral and same-model filenames, opaque CDN assets, Google Shopping thumbnails, Amazon modifiers, and existing navigation safeguards. Metadata/JSON-LD priority was not changed because the saved runtime evidence did not prove that ordering caused the captures.
- Marked RR-061 Fixed. Search, ranking, product eligibility, requirements, price, citations, `.env.local`, and provider request behavior are unchanged; zero live calls.

#### Verified

- Fail-first: 811/814 passed with exactly three intended RR-061 failures.
- Focused resolver: 24/24. Full suite: 815/815 across 120 suites.
- Typecheck and production build: pass. Lint: 0 errors, 3 existing warnings. Offline eval: no red flags.

### Claude - Standing agent-dialogue channel

#### Changed

- Added `docs/agent-dialogue.md`: an append-only, signed, citation-required communication channel between Claude and Codex, seeded with the consolidated RR-061 provenance evidence from the R2/R3 review exchange.
- Amended the roadmap standing guardrails: every phase now reads the dialogue at start (answering items addressed to the agent, verifying claims against the repo before agreeing) and appends questions/objections at phase end. The dialogue is advisory only — it never authorizes phases, live spend, or commits.
- Clarified anti-measurement rule 4: the dialogue file is a communication log, not a plan document.
- Docs only; no code, test, fixture, or behavior change; zero live calls.

### Codex - Phase R3 pinned discovery planning

#### Changed

- Added default-off `REVIEW_RADAR_PINNED_PLANNING`. When enabled with the default helper model, both discovery-strategy and gap-check calls use `gpt-5.4-mini-2026-03-17` with `temperature: 0`.
- Preserved flag-off request parameters, custom helper models, final synthesis, prompts, schemas, query allocation, ranking, and all trust gates.
- Added the flag to debug-ledger environment snapshots and documented it in `.env.example`; `.env.local` was not changed.
- Kept RR-015 at Needs Investigation because zero-live R3 cannot establish a stability improvement. The next approved live sample must measure it.

#### Verified

- Fail-first focused test: 8/9 passed before implementation; the new pinned-planning assertion failed as intended.
- Focused planner/API/ledger tests: 38/38 passed.
- `npm run typecheck`: pass. `npm run lint`: 0 errors, 3 existing warnings.
- `npm test`: 810/810 across 119 suites. `npm run build`: pass. Offline eval: no red flags.
- Live Serper/OpenAI calls: 0.

## 2026-07-10

### Codex - Phase R2 live-ledger restart safety stop

#### Changed

- Ran four of six approved cache-cold searches at commit `0f44ae7`; A1-A3 `shop vac` completed and constrained B1 triggered the mandatory stop. B2/B3 were not spent.
- Reopened RR-061 after Q10 X5+, Q10 S5+, and Q7 Max+ cards rendered QRevo/Saros foreign-model filenames that bypass the R1 mixed letter-digit token guard.
- Opened Critical RR-078 for customer-service/editorial pages rendered as product cards and High RR-079 for an accessory-only self-empty dock rendered as a robot-vacuum near match.
- Added complete ledger reconciliation, cull/contribution, first-loss, variance-attribution, RR-037/RR-045, and provisional North-Star evidence to the Phase 6D record.
- Kept rubric `v0.1-draft`, leader snapshots, and the baseline unfrozen because the safety-stopped 4/6 window did not satisfy the R2/6D exit gate.
- No production code, tests, prompts, flags, ranking, search, eligibility, image, or trust behavior changed. Four fixtures remain untracked.

#### Verified

- Precondition `npm test`: 807/807 across 119 suites at pinned commit `0f44ae7`.
- Final docs-only verification: typecheck passed; lint reported 0 errors and 3 existing warnings; full suite passed 807/807 across 119 suites.
- All four ledger reconciliation blocks are balanced and all four caches were empty at request start.
- Live spend: 4/6 searches, 317 physical Serper attempts, 0 retries, 0 fallbacks; the earlier estimate materially understated full-ledger traffic.
- Deterministic ledger overhead remains 0.757 ms/request (0.0009% of an 84-second run), within budget.

### Codex - Request-scoped search and candidate-lineage ledger (Phase A)

#### Changed

- Added a debug-only, request-scoped `AsyncLocalStorage` ledger inside `debug.stageFunnel`; normal responses do not create or emit it.
- Recorded query birth/origin, dedupe/cull/recategorization/dispatch, cache lookup outcomes, every sanitized Serper attempt, bounded result digests, candidate provenance and first-loss lineage, per-query/origin contribution, and exact dispatch reconciliation.
- Retained strict-schema raw discovery-strategy and gap-check JSON while excluding API keys, headers, and prompt bodies.
- Extended zero-cost fixture replay to preserve and summarize the ledger; added a deterministic ledger overhead benchmark.
- Filed RR-071 through RR-077 as Needs Investigation without changing search, prompts, ranking, identity, validation, filtering, or trust behavior.

#### Verified

- `npm run typecheck`: pass.
- `npm run lint`: 0 errors, 3 existing warnings.
- `npm test`: 802/802 across 118 suites.
- `npm run build`: pass.
- `node scripts/eval-pipeline.mjs`: no red-flag issues.
- `npm run qa:ledger-benchmark`: 0.757 ms measured overhead per representative request, projected 0.0009% of an 84-second request; zero provider calls.
- Live Serper/OpenAI calls: 0.

### Claude - Forward roadmap adoption (Phase R0)

#### Changed

- Adopted `docs/forward-roadmap.md` as the single forward-sequencing document: R1 (RR-061 image fix) → R2 (live ledger verification + frozen baseline, completes Phase 6D) → R3 (planner determinism) → R4 (constraint-preserving query allocation + requirement strength) → R5 (downstream false negatives) → R6 (source-brand trust + seed precision) → R7 (single-candidate-source consolidation).
- Encoded the North-Star metrics (core-leader recall, zero wrong-type, constraint compliance, stability) and anti-measurement rules, including the two-phases-without-improvement escalation stop.
- Repointed `docs/agent-next-task.md` to Phase R1 and cross-referenced the roadmap from `docs/codex-handoff-phased-plan.md` and the Phase 6 master plan's execution-state header.
- Docs only; no code, test, fixture, or behavior change; zero live calls.

### Claude - RR-061 wrong-model image guard (Phase R1)

#### Changed

- Fixed the reopened RR-061 failure where verified page context outweighed an explicit conflicting model in the image path (live evidence: `Saros_Z70_Silver_ID.png` rendered on the Roborock Q5 Max+ card).
- The shared image resolver now extracts model-shaped identity tokens (2–8 chars, letters+digits) from the image filename and rejects the candidate when the product carries model identity and no filename token is compatible with the product's normalized name/brand/model.
- Exempted CDN/pipeline artifacts from the token definition (Amazon `_AC_SL1500_`-class modifiers, retina `@2x`, dimension pairs, `w`/`h` size markers, version markers, file counters, unit measurements); the guard stays inert for products without model identity, preserving hashed CDN assets, Google Shopping thumbnails, same-model images, and comparison shots.
- Rejected images leave `product_image_url` empty; the product remains eligible. No search, ranking, requirement, identity, price, or trust behavior changed.
- Confirmed the Phase A privacy canary (`CANARY_SERPER_KEY_MUST_NOT_APPEAR` asserted absent from the serialized ledger snapshot) already exists in `tests/searchObservabilityLedger.test.mjs`; no duplicate test added.

#### Verified

- Fail-first: the two wrong-model tests failed before the guard (17 pass / 2 fail) and pass after; focused resolver suite 19/19.
- `npm run typecheck`: pass. `npm run lint`: 0 errors, 3 existing warnings.
- `npm test`: 807/807 across 119 suites. `npm run build`: pass. `node scripts/eval-pipeline.mjs`: no red-flag issues.
- Live Serper/OpenAI calls: 0.

## 2026-07-02

### Codex - Fresh Phase 6D restart safety stop
- Began a fresh post-RR-069/post-RR-061 six-call variance window and kept both earlier stopped samples excluded.
- A1 `shop vac` was safe; B1 constrained `robot vacuum` rendered a Saros Z70 image on a Roborock Q5 Max+ card, reopening RR-061 and stopping the pilot.
- Opened Medium RR-070 after unrelated `Bose` Serper brand metadata produced source-upgrade query `Bose ILIFE A12 Pro`; no evidence attached.
- Spent 2/6 searches and 75 observed Serper queries. Four calls were not run.
- One run per query cannot support pairwise overlap, rank correlation, significance, sample-size, or provider/model attribution conclusions. RR-014/RR-015/RR-037/RR-045 remain Needs Investigation.
- Typecheck and eval passed; lint reported 0 errors and 3 existing warnings; the full suite passed 791/791. No production behavior changed, rubric v1.0 was not frozen, and Phase 6E did not start.

### Codex - Reopened RR-061 retailer navigation image safety
- Fixed the live image-safety regression where the same Amazon `yoda/flyout_72dpi` navigation asset rendered on RIDGID VAC4000 and Fein Turbo I cards.
- Confirmed the shared resolver was used, but its hard non-product vocabulary omitted flyout/menu/department/layout shapes and its relevance check could match retailer/domain words from generated titles against image hosts.
- Added generalized flyout/menu/department/layout/masthead rejection, excluded retailer/source/domain words from image identity, and removed image-host text from relevance matching.
- Preserved verified same-product Amazon images, opaque hashed CDN images, Google Shopping thumbnails, and source-upgrade image validation.
- Fail-first passed 31/35 with four intended failures; focused coverage passed 135/135; the broader trust wall passed 376/376; full tests passed 791/791. Typecheck and eval passed; lint reported 0 errors and 3 existing warnings.
- No live search ran. Phase 6D remains stopped, the remaining five-call balance is not reusable, rubric v1.0 remains unfrozen, and Phase 6E did not start.

### Codex - Phase 6D clean restart safety stop
- Excluded the earlier four pre-fix pilot fixtures from the clean post-RR-069 variance sample and initialized a separate six-search restart ledger.
- Ran only restart A1 (`shop vac`) before the absolute safety gate stopped the phase.
- Reopened RR-061 as Needs Investigation after two different Amazon product cards received the same generic `yoda/flyout_72dpi` navigation asset as High-confidence product imagery.
- Preserved the new untracked Tier A fixture, spent 1/6 restart searches and 37 observed Serper calls, and left five calls unspent.
- No production code, test, script, ranking, discovery, trust, eligibility, source-upgrade, final-selection, UI, or API behavior changed.
- RR-015 and RR-037 remain Needs Investigation because one clean run cannot support variance inference. Rubric v1.0 remains unfrozen and Phase 6E did not start.

### Codex - RR-069 specific-submodel source-upgrade identity safety
- Fixed the source-upgrade path that allowed generic Q10-series evidence to donate price, rating, review count, and citation to a specific Q10 X5+ target.
- Added a generalized distinguishing-submodel guard for adjacent base/suffix identities, compact equivalents, explicit kit numbers, and multiple model identifiers.
- Generic series/plain/lineup evidence and nearby Q10 S5+/X50+ models are rejected; exact `Q10 X5+`, `Q10 X5 Plus`, and `Q10X5+` evidence remains valid.
- Added unrelated monitor and power-tool series/submodel regressions while preserving brandless exact WD4522 evidence and RR-063 through RR-068 protections.
- Fail-first passed 97/100 with only three intended failures. Focused final passed 100/100, the broad safety matrix passed 439/439, and the full suite passed 786/786. Typecheck and eval passed; lint reported 0 errors and 3 existing warnings.
- No live search ran. Phase 6D remains paused at 4/6 searches; Phase 6E did not start.
- Implementation commit: `1411901`.

### Codex - Phase 6D variance pilot safety stop
- Ran four of six approved repeated live searches before the safety gate stopped the pilot.
- Added an offline fixture-analysis mode to `scripts/qualityConsistencyHarness.mjs` for pairwise provider, plan, pool, and final overlap; rank correlation; stage ranges; latency/cost; and RIDGID stage presence.
- Opened Critical RR-069 after generic Roborock Q10-series shopping evidence attached price, rating, review count, and citation to a specific Q10 X5+ target.
- Recorded partial RR-015/RR-037 evidence in `docs/phase-6-variance-pilot.md`; both remain Needs Investigation.
- Spent 4/6 live searches and 150 observed Serper calls. The remaining two searches were not run.
- No production behavior changed. Rubric v1.0 was not frozen, the leader package was not compiled, and Phase 6E did not start.

### Codex - Phase 6C product-specific patch audit
- Added `docs/phase-6-product-specific-patch-audit.md` after auditing all 61 tracked production TypeScript/JavaScript files.
- Classified 5 generalized-data groups, 4 source/category-rule groups, 1 non-behavioral comment/example group, and 0 must-generalize blockers.
- Recorded watch items for duplicated retailer route knowledge, centralized HP brand/unit disambiguation, and cross-brand floor-cleaner taxonomy maintenance.
- Typecheck and offline eval passed; lint reported 0 errors and 3 existing warnings; the full suite passed 782/782 across 117 suites.
- No issue status, production code, test, script, fixture, baseline, live budget, or app behavior changed. Phase 6D did not start.

## 2026-07-01

### Codex - Phase 6B regression wall
- Added `docs/phase-6-regression-wall.md`, mapping all 62 issues from RR-007 through RR-068 to deterministic protection, measurement/provider status, historical guards, or accepted fixture compatibility.
- Closed two direct regression-test gaps without changing production behavior: schema availability labels for RR-012 and near-match funnel retention for RR-025.
- Kept RR-014/RR-015 measurement-only and RR-037/RR-045 provider-variance-bound; no issue status changed and no behavior blocker was found.
- Verification passed 22/22 focused tests, 782/782 full tests, typecheck, lint with 0 errors and 3 existing warnings, and offline eval with no red flags. No live calls ran.

### Codex - Phase 6 master-plan source-of-truth promotion
- Promoted the complete reconciled desktop Phase 6 master into `docs/phase-6-reliability-gauntlet-plan.md`, replacing the shorter predecessor at the established canonical path.
- Declared that file the sole authority for Phase 6 scope, sequencing, budgets, gates, evidence rules, and completion criteria.
- Updated supporting Phase 6 and tracking docs to implement the master without overriding it.
- Documentation only: no app behavior, tests, scripts, fixtures, issue status, or live budget changed.

### Codex - Phase 6A master-plan reconciliation
- Retained the completed Phase 6A scorecard, historical examples, and live-batch definitions; no work was discarded.
- Made product-safety zero tolerance absolute rather than provisional, separated query-shape `NotApplicable` from missing-evidence `NotScored`, and retained the auditable deduction formula as the canonical v0.1 draft.
- Moved leader-quality target approval to the post-6D/pre-6E rubric freeze so baseline performance cannot set its own success target.
- Documentation only: no app behavior, scripts, tests, fixtures, issue status, or live budget changed.

### Codex - Phase 6A reliability instrument
- Added the v0.1-draft two-axis reliability rubric with per-search binary safety, separate process gates, the plan-defined 0–100 deduction formula, written ranking anchors, evidence-mode labeling, missing-data rules, report templates, and a documented JSON Schema.
- Inventoried the 64 test files, 22 saved live fixtures, eight existing measurement tools, and current debug-envelope fields so future automation extends the existing system rather than duplicating it.
- Defined all seven live-search batches, a fixed core-10 backed by existing fixture categories, rotation and three-tier fixture policy, a 2-query × 3-run Phase 6D variance pilot, and a budget ledger initialized at zero.
- Hand-scored `shop-vac.json` and `gas-grill.json` from replay output only as M3 historical evidence. Missing replay evidence is `NotScored`; proposed trace/printer/automation additions require approval.
- No live search, behavior change, executable script change, issue fix, or Phase 6B work ran. Typecheck, 781/781 tests, and eval passed; lint reported 0 errors and 3 existing warnings.

### Codex - Phase 5 closeout and remeasurement
- Closed Phase 5 after auditing all 68 issues and confirming 63 Fixed, 4 intentional Needs Investigation, 1 Won't Fix, and 0 Open.
- Reverified the high-risk Phase 5 protections with 448/448 focused tests and 781/781 full tests. Typecheck and eval passed; lint reported 0 errors and 3 existing warnings.
- Replayed representative saved fixtures without live API spend. The current shop-vac fixture contains only conventional utility vacuums; older fixtures are explicitly treated as historical snapshots where they predate later trace or identity fields.
- No issue status, production code, app behavior, or ranking/discovery/trust behavior changed. Phase 6 did not start.

### Codex - RR-068 shop-vac versus household floor-cleaner safety
- Added shared `shop_vac` and `household_floor_cleaner` product-type intents so wet/dry household floor washers, vacuum mops, hard-floor cleaners, and carpet/spot/upholstery cleaners cannot become exact shop-vac products merely because they use `wet dry vacuum` wording.
- Strong household subtype identity overrides generic wet/dry wording for shop-vac requests. Conventional shop/utility/garage/jobsite wet-dry vac signals remain valid, and explicit household floor-cleaner searches remain supported.
- Discovery type checks now exclude retailer labels and query-derived snippets; the same shared verdict runs at discovery and requirement revalidation. Ranking, final selection, price, source-upgrade, image, page eligibility, and UI behavior were unchanged.
- Fail-first passed 118/124 with six intended failures; focused final passed 125/125; broad safety passed 455/455; full tests passed 781/781; typecheck and eval passed; lint had 0 errors and 3 existing warnings.
- Saved Phase 5J reassessment removed all four CrossWave cards and retained RIDGID/Vacmaster utility vacs. One fresh `shop vac` run returned only conventional Armor All utility wet/dry vacs. RR-068 is Fixed; Phase 6 did not start.

### Codex - Phase 5J image safety and fallback diagnostics
- Fixed RR-061 by requiring image-like assets to have source-derived product context. Page URLs, truncated image directories, SVG/UI/logo/placeholder assets, generic category/navigation/editorial artwork, and unrelated JSON-LD/social metadata no longer become product images.
- Same-product retailer/manufacturer images, standard JPEG/PNG/WebP assets, Google Shopping thumbnails, and opaque hashed CDN product images remain supported. Source-upgrade images now use the same resolver after the existing identity gate.
- Fixed RR-054 by preserving actual fallback-path stage funnels, final-selection traces, search-plan context, empty source-upgrade traces, and explicit bypass reasons in debug responses. Normal non-debug recommendation content is unchanged, and old fixtures still replay.
- Verification passed 174/174 focused tests, 417/417 broad safety tests, 772/772 full tests, typecheck, lint with 0 errors and 3 existing warnings, and eval with no red flags.
- One `shop vac` live proof returned real image responses with no page/logo/category/support image. It did not use a fallback path. The run separately opened High RR-068 because four Bissell CrossWave household floor cleaners reached exact shop-vac results; RR-068 was documented but not fixed. Phase 6 did not start.

### Codex - RR-067 horsepower/HP brand disambiguation
- Fixed candidate-side identity handling that trusted provider `brand: "HP"` before checking whether source-derived evidence used HP as horsepower or supported a different product brand.
- Ambiguous HP metadata now yields only to stronger source-derived title/path/snippet identity; seller, host, URL query, and query-derived text remain excluded.
- Expanded measurement handling for numeric, peak/max/rated, motor, engine, pump, compressor, suction, and HP-motor syntax while preserving genuine HP and Hewlett-Packard computers, monitors, and printers.
- Fail-first passed 95/97 with only two intended failures. Focused final passed 98/98; broad safety passed 346/346; typecheck and eval passed; lint had 0 errors and 3 existing warnings; full suite passed 764/764.
- One `shop vac` run did not reproduce HART, but exact RIDGID WD3050 `3.5-Peak HP` evidence attached safely while nearby/wrong products remained rejected. No second live call or Phase 5J work occurred.

## 2026-06-30

### Codex - Phase 5I source-upgrade trigger/fallback reliability
- Fixed RR-041 by replacing the all-three-missing trigger with a conservative missing-two-of-three evidence rule covering verified price, owner rating, and identity-safe product-specific commerce evidence.
- Fixed RR-042 by preserving the zero-result fallback and allowing the same single bounded fallback after a nonempty primary result set has zero identity matches. No retry occurs after an identity match or more than once.
- Product-specific commerce evidence now counts only when the shared identity classifier confirms the same product. The unchanged RR-063 through RR-066 identity gate protects both primary and fallback candidates.
- Added debug-only selection decisions and primary/fallback outcomes to API traces and fixture replay; user-facing result shape is unchanged and old fixtures remain compatible.
- Fail-first produced 11 intended failures. Focused verification passed 121/121, broad safety passed 342/342, typecheck and eval passed, lint had 0 errors and 3 existing warnings, and the full suite passed 760/760.
- One `shop vac` run safely attached exact RIDGID WD1060 and DEWALT DXV09P evidence. A HART fallback attached nothing and exposed Medium RR-067, a candidate-side horsepower `HP` brand false-negative. No unsafe evidence attached. Phase 5J did not start.

### Codex - RR-066 model-qualified source-upgrade identity safety
- Fixed the identity ordering that rejected exact model-bearing evidence when a provider omitted the brand, then allowed model-qualified targets to fall through to broad same-brand/product-type token overlap.
- Source upgrade now requires an exact normalized target strong model in source-derived candidate evidence. Brand, product type, size, and capacity cannot replace missing model proof.
- Exact model evidence may omit the provider brand only when product type agrees and no explicit conflicting brand/product signal exists. Punctuation variants, merchant paths, safe count/color variants, and non-model family behavior remain supported.
- Fail-first passed 80/84 with only four intended RR-066 failures. Focused final passed 84/84; broad safety passed 304/304; typecheck and eval passed; lint had 0 errors and 3 existing warnings; full suite passed 752/752.
- One focused `shop vac` run rejected nearby RIDGID HD09001/HD0919/HD1900 evidence and safely attached exact Armor All VOM205P evidence. WD4522 did not recur live.
- RR-066 is Fixed. RR-041/RR-042 were not changed or retried, and Phase 5I/5J did not start.

### Codex - Phase 5I retry safety stop / RR-066
- Reproduced RR-041/RR-042 again: a lone rating suppresses an otherwise weak model-qualified candidate, and a nonempty primary result set whose candidates all fail identity prevents the bounded fallback.
- A conservative candidate trigger/fallback change passed 751/751 tests and eval, but the single `shop vac` live proof exposed Critical RR-066.
- A RIDGID WD4522 target rejected exact-model evidence whose title omitted the brand, then accepted a different 10-gallon RIDGID vacuum carrying the brand and type but no WD4522 model. The wrong product attached price, rating, review count, and citation evidence.
- The stop condition fired. Every Phase 5I app, replay, and test edit was rolled back; no behavior change was committed. The restored repository passed 747/747 tests, typecheck, lint with 0 errors, and eval.
- RR-041/RR-042 remain Needs Investigation. RR-066 is Critical/Open and must be fixed narrowly before another Phase 5I retry. Phase 5J did not start.

### Codex - RR-007 opaque manufacturer collection-page cleanup
- Fixed the Bosch `/ocs-c/` recurrence by recognizing opaque manufacturer collection suffixes and contextual product-range/family/lineup/series routes before product-detail, image, price, or model-like shortcuts.
- The fix is page-shape based, not Bosch-specific. Product-looking collection pages stay blocked even with images, prices, and catalog-like digits; specific Bosch/manufacturer and known retailer detail pages remain eligible.
- Fail-first passed 59/61 and failed only the two intended Bosch assertions. Focused final passed 61/61; broad safety passed 308/308; typecheck and eval passed; lint had 0 errors and 3 existing warnings; full suite passed 747/747.
- Current-code reassessment flips the frozen Bosch card from `buyable_product` to `listing_or_search`. One fresh `shop vac` run returned three exact and four near products, all with specific product URLs and no collection/listing/family page.
- RR-007 is Fixed. RR-041/RR-042 were not retried, Phase 5I/5J did not start, and no ranking, discovery, source-upgrade, identity, price, product-type, requirement, final-selection, or UI logic changed.

### Codex - RR-065 retailer/source identity safety
- Fixed RR-065 by treating explicit leading source/retailer labels, seller fields, URL hosts, URL query strings, and query-derived snippets as provenance rather than product identity.
- Source upgrade now requires a reliable target brand in source-derived candidate title/brand/path evidence. Merchant product paths remain useful, exact cross-retailer matches still attach, and Amazon Basics remains valid when it is the actual product brand.
- The exact retailer-prefixed RIDGID VAC1200 versus Amazon Basics case failed before the fix. Focused identity passed 90/90; broad safety passed 340/340; typecheck and eval passed; lint had 0 errors and 3 existing warnings; full suite passed 744/744; ranking baseline stayed stable.
- One focused `shop vac` run safely attached exact RIDGID HD1400 evidence. It separately reopened RR-007 because a Bosch `/ocs-c/` wet/dry-extractor collection became exact #3. No eligibility fix, Phase 5I retry, or Phase 5J work occurred.

### Codex - Phase 5I trigger/fallback reliability safety stop
- Reproduced RR-041/RR-042 deterministically: a lone rating suppresses an otherwise weak candidate, and a nonempty all-rejected primary result set prevents the bounded fallback from running.
- A conservative missing-two-of-three trigger and one post-rejection fallback passed 738/738 tests and eval locally, but the first focused `shop vac` live proof exposed Critical RR-065.
- Target `Amazon.com: RIDGID ... VAC1200` rejected a SKIL primary result, then incorrectly accepted an Amazon Basics fallback result and attached its citation. A retailer/source prefix had been treated as the target brand, and same-category overlap overrode the missing RIDGID/VAC1200 identity.
- Stopped immediately, skipped the second live search, rolled back every app/script/test change, and committed no behavior change. The restored repository passed 735/735 tests, typecheck, lint with 0 errors, and eval. RR-041/RR-042 remain Needs Investigation; RR-065 is Open and must be fixed before Phase 5I is retried. Phase 5J did not start.

### Codex - RR-007/RR-008 pre-final eligibility cleanup
- Fixed the Phase 5H recurrence by recognizing paginated bundle/category titles, standards documents, comparison/vs pages, press-release announcement titles, and common editorial subdomains before product-detail URL, image, price, or model shortcuts.
- The fix is shared across discovery, verified-citation filtering, requirement filtering, product-link validation, and final reliability because those boundaries consume `classifyProductEligibility`.
- Specific retailer/manufacturer product pages remain card-eligible. Comparison/category pages may remain secondary evidence, but cannot become a card, primary buy link, or product-specific citation-strength proof.
- Fail-first reproduced four unsafe shapes at four boundaries. Focused boundary tests passed 157/157; broad safety passed 330/330; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 735/735; eval clean.
- Current-code fixture reassessment removes the pre-fix final MultiVu press-release card. One post-fix `electric toothbrush` live run returned five specific product cards and no unsafe page in the exact-scored trace; RR-064 remained safe. No broad baseline ran.
- RR-007 and RR-008 are Fixed. Phase 5I did not start.

### Codex - RR-064 source-upgrade conflicting-model safety
- Fixed RR-064 by applying the shared explicit product-variant conflict guard before source-upgrade positive model/family overlap.
- Added conservative standalone series-number conflict detection for values such as DiamondClean `9000` versus Smart `9300` when source-derived evidence shares meaningful product-family context.
- Excluded years, dollar prices, package/count variants, and measurements from series-number identity; exact-model, color, and package-count offers remain valid.
- Fail-first reproduced the exact live-shaped 9000/9300 unsafe attachment. Focused safety passed 157/157; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 729/729; eval clean.
- One focused `electric toothbrush` live run rejected Smart 9300 as `identity_mismatch`, safely attached an explicit 9000 offer, and independently rejected 4100 evidence for a 2100 target. No broad baseline ran.
- RR-007/RR-008 remain Needs Investigation and were not changed. Phase 5I did not start.

## 2026-06-29

### Codex - Phase 5H broad-slate diversity and form-factor quality
- Fixed RR-060 with a strict exact-model final-slot identity check. Cross-retailer representations of the same strong model collapse, while explicit different models and sizes remain distinct.
- Fixed RR-056 with a conservative model-line key and soft repeat adjustment (`12`, capped at `24`) instead of a hard brand or retailer cap.
- Fixed RR-059 with a bounded selection-only prior for unrequested walking-pad/under-desk, travel, tabletop, mini, handheld, portable, and compact/small-space form factors. Explicit niche requests remain eligible to win.
- Added final-selection trace fields for model family, repeat count, family/form-factor adjustments, and adjusted selection score; replay reports the fields.
- Saved fixtures collapse the duplicate M27Q, move a mainstream 14-cup coffee maker above AeroPress, and move Horizon 7.0 AT above an under-desk treadmill. Five RR-014 benchmark fixtures stayed neutral at mean `3.0/7`.
- Verification: fail-first 3 failures; focused/broad safety 303/303; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 724/724; eval clean; Phase 5G A/B unchanged.
- One `electric toothbrush` live call confirmed the family adjustment, then opened Critical RR-064 because DiamondClean Smart 9300 evidence attached to a DiamondClean 9000 card. It also reopened RR-007/RR-008 because a category page and three editorial/comparison pages remained exact-eligible below cutoff. No out-of-scope fix or Phase 5I work occurred.

### Codex - Phase 5G product-specific citation-strength ranking
- Fixed RR-013 with a bounded `citationStrengthScore` that uses verified citation types only when the citation matches the displayed product under the shared evidence-identity guard.
- Product-specific independent support receives `+6` to `+8`, retailer-only support `+2` to `+4`, and true self-only support `-2`. Generic, conflicting, unknown-specific, and untyped citations receive no Phase 5G credit.
- Typed citation-derived source quality, expert mentions, and evidence-strength counts now use the same identity-safe citation set; manufacturer or retailer host shape alone no longer impersonates independent corroboration.
- Added `citationStrengthScore` to score breakdowns and final-selection traces, plus an isolated `REVIEW_RADAR_CITATION_STRENGTH=off` A/B switch.
- The deterministic gas-grill A/B moved retailer-only Nexgrill from #1 to #2 and independently supported Weber from #2 to #1. A suspicious `$1` product remained near-only.
- Verification: fail-first 3 failures; focused ranking/trace 57/57; broad safety 348/348; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 712/712; eval red-flag checks clean.
- No live search or broad baseline ran. RR-013 is Fixed; no other issue status changed and Phase 5H did not start.

### Codex - RR-007/RR-063 product-evidence identity safety
- Fixed RR-007 by treating generic brand/family/category/collection routes as evidence-only, including numeric-ID slugs such as Chewy `/brands/...-7437`.
- Product-link selection now requires source-derived same-product identity and no longer lets the generated recommendation name prove an existing primary URL.
- Unsafe stale primary URLs are cleared immediately after citation filtering, before page enrichment or asset extraction can consume them.
- Fixed RR-063 with a shared product-evidence identity verdict. Explicit recipe, flavor, life-stage, recipe-base, supplement-flavor, cosmetic-shade, and model conflicts are removed; unknown specific-product citations are also rejected.
- Exact product pages, safe package-size variants, and secondary generic/editorial evidence remain supported. RR-022 citation retention remains green.
- Verification: fail-first 8 failures plus missing module; focused 84/84; broad safety 295/295; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 706/706; eval red-flag checks clean.
- Exactly one `dog food` live call returned 6 exact and 5 near products, all with specific primary URLs and no family/editorial/support/documentation cards. Two additional citation mismatches from that run were removed by the final code when the saved fixture was reassessed; no second live call ran.
- RR-007 and RR-063 are Fixed. RR-013 and Phase 5G were not changed.

## 2026-06-28

### Codex - RR-008 article-card eligibility cleanup
- Fixed the live BK Pets regression by classifying interrogative/editorial decision titles as non-product evidence before product-path shortcuts.
- Hosted publishing platforms including Substack, Medium, Blogspot, and WordPress remain usable as evidence but cannot render as product cards.
- Preserved real Target and generic manufacturer `/p/` product routes; the fix is title/page-shape based rather than a Substack-only block.
- Fail-first tests reproduced the issue through shared eligibility, Serper discovery, and final citation validation. Focused tests passed 87/87, broad safety tests 192/192, full tests 694/694, and eval reported no red flags.
- One `dog food` live run contained no BK Pets or editorial card and preserved Purina/Hill's citation retention.
- Reopened RR-007 for Chewy `/brands/` family pages used as primary card links. Opened RR-063 for same-brand wrong-recipe citations. No out-of-scope fix or Phase 5G work occurred.

### Codex - Phase 5F dog-food live confirmation
- Ran exactly one post-refinement `dog food` live check; no app behavior changed and no broad baseline ran.
- Six specific Purina/Hill's candidates survived citation verification, live-confirming RR-022 for the dog-food path. They were removed later by requirement filtering.
- The generic Purina `/pro-plan/products/dog-food` family card did not recur.
- Reopened RR-008 after a BK Pets Substack article reached exact rank #5. The shared classifier treated its generic `/p/` article route as product detail and did not recognize the question-style title as editorial.
- Verification remained green: focused 60/60, typecheck clean, lint 0 errors with 3 pre-existing warnings, full suite 690/690, and eval with no red flags.
- Stop before Phase 5G. The next recommended work is a narrow generalized RR-008 eligibility cleanup.

### Codex - Phase 5F citation retention
- Fixed RR-022 by separating global source verification from candidate-specific product-page verification.
- LLM product pages that are not already exactly provider-verified now receive a targeted reachability check; already verified Serper URLs are not fetched again.
- Final citation filtering promotes an exactly verified, product-specific URL ahead of editorial or same-host category evidence instead of dropping the candidate because weaker evidence happened to be first.
- Added product path/title binding for unknown manufacturer URL shapes. Specific Purina, Hill's, Oral-B, EGO, and generic manufacturer product pages are retainable; generic family paths such as `/products/dog-food` remain blocked.
- Unrelated global verification, unreachable self-cites, categories, collections, support, customer-service, manuals, documentation, and unsafe primary links remain rejected.
- RR-013 scoring and ranking policy did not change. No price, product-type, source-upgrade identity, requirement, UI, or shared discovery change was made.
- Verification: fail-first 3 failures; focused safety matrix 282/282; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval red-flag checks clean.
- Two bounded live calls ran. `electric toothbrush` retained all 28 candidates through citation verification. The initial `dog food` proof exposed remaining drops and a generic Purina family card; the final deterministic refinement covers those exact product/family shapes but was not live-retested because the two-call cap was exhausted.
- RR-022 is Fixed with the bounded live-proof caveat. RR-007 remains Fixed. No full baseline ran.

### Codex - RR-007 nested catalog-page regression cleanup
- Fixed the Phase 5E regression where `Pressure Washers - Best Buy` could render as an exact product card.
- The shared eligibility layer now rejects nested catalog identifiers such as `pcmcat...c`, generic department/browse routes, and faceted listing parameters unless the URL is a known product-detail shape.
- Serper no longer treats every Best Buy `/site/` URL as a product; only the supported legacy `.p` and modern `/sku/` detail shapes receive that shortcut.
- Preserved valid retailer SKU pages, manufacturer product pages, evidence-only citations, Phase 5E product-type behavior, all price/citation/identity trust gates, scoring, and ranking.
- Fail-first proof reproduced the page in shared eligibility, Serper discovery, and final citation validation. Focused tests passed 177/177; typecheck passed; lint had 0 errors and 3 pre-existing warnings; full tests passed 686/686; eval had no red flags.
- One focused `pressure washer` live proof returned six exact products plus one near product, all with specific product-page primary URLs. No Best Buy catalog card appeared. RR-007 is Fixed.

### Codex - Phase 5E product-type and requirement truthfulness
- Fixed RR-017/RR-043 by extending the shared product-type registry for reproduced pressure-washer consumables/dishwashers, portable power stations, basketball wall art/accessories, backup cameras, and washer/dryer substitutions.
- Added an identity-versus-broader-evidence distinction so incidental source snippets cannot make a wrong product title pass type matching.
- Fixed RR-055 by allowing literal provider/merchant identity evidence to satisfy a plain feature before comparative review prose, while preserving explicit negation failures and excluding assigned category/explanation text.
- Preserved unknown-product verification behavior, valid sparse products, all source-upgrade safety, price/RR-062, Phase 5D deterministic eligibility, citation, scoring, and ranking protections.
- Verification: focused 83/83; broad safety matrix 314/314; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 684/684; eval clean.
- Four bounded live calls ran. The pressure-washer recheck removed ZEP from the trace; portable-generator results contained no power stations and twelve candidates passed `Portable`; the shop-vac customer-service page remained absent from final cards.
- Reopened RR-007 after `Pressure Washers - Best Buy` reached exact #7 twice. No eligibility fix was made in Phase 5E.

### Codex - Phase 5D product-card eligibility cleanup
- Fixed RR-007, RR-008, and RR-009 at the shared product-eligibility boundary used by Serper discovery and final citation filtering.
- Added category-aware structural detection for generic manufacturer/retailer collections, narrowed Best Buy product-detail URL recognition, and classified support/advice/learning/customer-service/documentation shapes as evidence-only.
- Added generalized documentation-host recognition for support subdomains, `device.report`, and manual-library shapes. These sources remain available as evidence but cannot render as recommendation cards.
- Preserved valid manufacturer and merchant product pages, RR-062 product-scoped price extraction, citation verification, product-type and price trust, scoring, ranking, source-upgrade identity, and final-selection policy.
- Verification: fail-first 5 assertions; focused 78/78; broad focused 192/192; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 678/678; eval red-flag checks clean.
- Three limited live searches found no Champion/Briggs collection cards, Daikin collection, or `device.report` card in final results. A Shop-Vac customer-service path discovered during live validation was added to deterministic shared/final-filter coverage before closeout.
- RR-007, RR-008, and RR-009 are Fixed. No new issue was opened and no full baseline ran.

### Codex - RR-062 product-scoped price extraction
- Fixed RR-062 by separating page/product-bound structured prices from arbitrary same-page widget values.
- Schema.org products are selected by target identity; page-level and visible fallbacks require matching page identity; element-level `data-price` fields require matching identity in the same tag.
- Bare integer element prices are ignored unless the matching product element explicitly declares a minor-unit format such as `cents`. Standard schema.org offers keep their documented semantics.
- No global maximum was added. Deterministic positives preserve matching decimal prices, explicit minor-unit conversion, and a legitimate `$19,999` schema.org/product-scoped price.
- RR-002 suspicious-low handling, installment protection, exact-budget behavior, scoring, ranking, citation trust, source-upgrade identity, product-type logic, and UI behavior are unchanged.
- Verification: product-assets 20/20; focused price/assets/scoring/requirements 123/123; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 672/672; eval red-flag checks clean.
- Saved-fixture reassessment removed the malformed high price. One focused `dash cam` live run verified VIOFO A229 Pro 2CH at `$349.99` from matching JSON-LD; no malformed high verified price appeared.
- RR-062 is Fixed. No new issue was opened, no full baseline ran, and Phase 5D did not start.

### Codex - RR-062 malformed-high-price diagnostic
- Confirmed RR-062 from the saved Phase 5C `dash cam` fixture without changing behavior or running another ReviewRadar search.
- Corrected the earlier evidence attribution: `$322.99` belonged to BlackVue DR770X source-upgrade output, not VIOFO A229 Pro. VIOFO had only one `19999` retailer-page offer.
- Traced the offer to asset enrichment. The VIOFO landing page contains an unrelated A139 widget with `data-price="19999"`; broad page-metadata extraction accepts the bare value as 19,999 dollars instead of Shopify-style minor units and does not bind it to the target product.
- Price trust then marks the lone Medium-confidence retailer-page signal verified because current plausibility logic contains low-price floors but no product-affinity or malformed-high-price containment.
- Classified RR-062 as a new structured-page extraction/minor-unit defect, not RR-002, Serper, source upgrade, model parsing, stale evidence, or a merge conflict. RR-062 moved from Needs Investigation to Open.
- Verification: focused price/assets/scoring/requirements/Serper tests 153/153; typecheck clean; lint 0 errors with 3 pre-existing warnings; full suite 665/665; eval red-flag checks clean.
- Recommended a separate narrow RR-062 fix before Phase 5D; no app code, tests, fixtures, scoring, ranking, trust, eligibility, or UI behavior changed.

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

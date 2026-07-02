# ReviewRadar Phase 6 Reliability Gauntlet - Master Plan

**Status:** Canonical merged plan; Phase 6A completed and reconciled
**Prepared:** 2026-07-01
**Execution state:** Phase 6A planning instrument complete; Phase 6B requires explicit instruction
**Repository:** `C:\Users\tluch\Documents\GitHub\review-radar-fixed`
**Canonical repository path:** `docs/phase-6-reliability-gauntlet-plan.md`

The repository file at the canonical path above is the sole source of truth for
Phase 6 scope, sequencing, budgets, gates, evidence rules, and completion
criteria. Supporting Phase 6 documents implement this plan and must not
contradict it.

This plan merges the strongest parts of the original ChatGPT Phase 6 proposal
and Claude's measurement-first reliability proposal. It also corrects their
known factual and methodological gaps.

## 1. Current Repository State

Phase 5 is closed.

Verified closeout state:

- 68 issues total.
- 63 Fixed.
- 4 Needs Investigation.
- 1 Won't Fix.
- 0 Open.
- 9 Critical, 29 High, 25 Medium, and 5 Low.
- 64 `tests/*.test.mjs` files.
- 22 saved JSON fixtures under `tests/fixtures/review-radar-live/`.
- Focused Phase 5 closeout matrix: 448/448 passed.
- Full suite: 781/781 passed.
- Typecheck passed.
- Lint had 0 errors and 3 pre-existing warnings.
- Eval pipeline reported no red flags.

Intentional Needs Investigation carryovers:

- RR-014: mean market-leader/core coverage remains weak.
- RR-015: run-to-run stability remains weak and insufficiently quantified.
- RR-037: RIDGID shop-vac candidate-pool coverage remains provider-variable.
- RR-045: Tapo raw provider coverage remains unconfirmed.

These are measurement and provider-variance questions. They are not unresolved
Phase 5 behavior blockers.

Relevant existing measurement tools include:

- `scripts/qualityScorecard.mjs`
- `scripts/goldBenchmark.mjs`
- `scripts/qualityConsistencyHarness.mjs`
- `scripts/ab-ranking.mjs`
- `scripts/replay-quality-fixtures.mjs`
- `scripts/save-debug-fixture.mjs`
- `scripts/eval-pipeline.mjs`
- `scripts/citationStrengthDiagnostic.mjs`

Phase 6 must extend this system. It must not build a competing measurement
system without proving that the existing tools cannot support the requirement.

## 2. Executive Summary

Phase 5 fixed known trust and product-quality defects. Phase 6 is a reliability
engineering program that measures real-world quality, quantifies variance,
discovers unknown shared failures, and proves improvements without weakening
the trust gates built during Phase 5.

Phase 6 is not:

- a random live-search sweep;
- a standing invitation to fix every odd result;
- a ranking rewrite;
- a way to increase exact-result count by weakening safety;
- a product-by-product patch campaign;
- a replacement for deterministic tests.

Its organizing spine is a measurement ladder:

1. Deterministic tests and current-code validators.
2. Historical fixture replay and current-code fixture reassessment.
3. Same-candidate-set deterministic comparisons.
4. Repeated live sampling to quantify variance.
5. Fresh live searches for real-world exposure.

Every material claim must identify its evidence rung. A single fresh live result
is an observation, not proof of a general defect, unless it exposes a Critical
safety failure.

The Phase 6 sequence is:

`6A Instrument -> 6B Regression Wall -> 6C Patch Audit -> 6D Variance Pilot ->
freeze rubric v1.0 -> 6E Baseline -> 6F Dossiers -> 6G Fix Loop -> 6H Review`

## 3. Readiness Gate

Phase 6 execution may begin only when all of the following are true:

- Phase 5 is closed.
- Phase 5J is complete.
- RR-068 and all Phase 5 blockers are Fixed or explicitly deferred.
- The issue register is current and internally consistent.
- Typecheck, lint, full tests, and eval are green.
- Untracked baselines, live fixtures, and local-only folders are identified.
- Existing fixtures will be used before buying new live evidence.
- RR-007 through RR-068 regressions are treated as release blockers according
  to their applicable safety contract.
- A Phase 6 live budget is approved before any live phase.
- The current sub-phase has an explicit scope, exit criterion, and stop rule.

The Phase 5 closeout proves these prerequisites are currently satisfied. This
document does not itself authorize Phase 6 execution or live API spending.

## 4. Core Operating Rules

1. Product names are test cases, never production patches.
2. One shared root cause per fix phase.
3. Diagnose and reproduce before editing behavior.
4. Add fail-first deterministic tests for every behavior fix.
5. Deterministic evidence comes before live evidence.
6. Live calls require a written purpose, query list, budget, and approval.
7. Never weaken citation, price, identity, product-type, requirement,
   eligibility, or source-upgrade trust to improve result count.
8. Exact matches must be safer than near matches.
9. Every claim names its measurement rung.
10. Saved fixtures are historical provider snapshots, not automatic executions
    of the complete current pipeline.
11. Rubrics and thresholds are versioned. Unversioned score changes invalidate
    comparisons.
12. Extend existing scripts before proposing new ones.
13. Every phase updates the issue register and handoff state before continuing.
14. A Phase 6 behavior fix requires a root-cause dossier.
15. A dossier normally needs the same mechanism in two unrelated categories.
    One reproduced failure plus generalized cross-category deterministic
    controls is also sufficient. One Critical safety instance is sufficient.
16. Fewer honest recommendations are preferable to unsafe or fake exacts.
17. Phase 6 stops after each sub-phase and waits for the next instruction.

## 5. Measurement Ladder

### Rung 1 - Deterministic tests and validators

Use pure functions, unit tests, API-contract tests, distilled fixtures, and
current-code validators.

Proves:

- specific logic behavior;
- safety invariants;
- regression prevention;
- exact before/after behavior for controlled inputs.

Does not prove:

- current provider coverage;
- live candidate availability;
- real-world stability.

### Rung 2 - Historical fixture replay and reassessment

Replay inspects saved output, funnels, traces, and captured provider evidence.
Where supported, pass captured candidates/results through current validators.

Proves:

- trace compatibility;
- historical failure paths;
- current validator decisions over frozen evidence;
- zero-cost before/after comparisons for supported stages.

Does not prove:

- that the same provider results would return today;
- that the full current pipeline produced the saved response;
- current market-leader coverage.

Fixtures must be labeled:

- schema-current or schema-stale;
- market-current or market-stale;
- replay-only or current-code reassessable.

### Rung 3 - Same-candidate-set deterministic comparison

Hold candidate evidence constant and compare one isolated rule or feature.

The current `ab-ranking.mjs` is a narrow synthetic ranking comparison, not a
general baseline-wide A/B engine. Phase 6A must describe that limitation.
Expanding it requires later approval.

Proves:

- isolated scoring or selection effects;
- whether movement is caused by the changed rule rather than discovery noise.

### Rung 4 - Repeated live sampling

Repeat fixed queries under fixed inputs to estimate provider and model variance.

Proves:

- observed stability range for those query shapes;
- candidate-pool and final-result overlap;
- whether a one-run delta is smaller than normal variance.

A three-run sample is a pilot, not a universal stability estimate.

### Rung 5 - Fresh live searches

Run approved searches against the full current system and save debug fixtures.

Proves:

- current end-to-end behavior for those runs;
- current provider exposure;
- current UI/API recommendation output.

A one-run anomaly is an observation unless it is Critical or reproduced at a
lower rung.

## 6. Phase 6 Goals

Phase 6 should establish that:

- broad searches return strong, popular, trusted products;
- hard constraints are followed;
- exact matches are truly exact;
- near matches remain honest;
- citations support the displayed product and variant;
- prices are trustworthy and budget-safe;
- primary URLs are specific product pages;
- product images are real and relevant;
- duplicates and model-family crowding are controlled;
- expected market leaders enter the pool or have an attributed loss stage;
- broad searches return a healthy slate when trustworthy candidates exist;
- low-count slates explain whether scarcity came from discovery or safety gates;
- Phase 5 protections do not regress;
- repeated failures become generalized root-cause dossiers;
- provider-bound uncertainty is measured rather than mistaken for code failure.

## 7. Scorecard Lifecycle

### Phase 6A status: completed, `v0.1-draft`

Phase 6A created and committed the draft rubric. It correctly does not call
provisional quality thresholds `v1.0`.

The draft is tested against at least two historical fixtures. Any metric that
cannot be measured must be marked:

- measurable now;
- measurable only through current-code reassessment;
- manual;
- unavailable because a trace is missing;
- inapplicable to the query.

### Freeze point

After Phase 6D variance calibration, but before Phase 6E baseline:

- approve metric definitions;
- approve deduction sizes and quality thresholds;
- approve minimum quality floors;
- approve the leader-quality target independently of baseline performance;
- define the variance significance rule;
- freeze rubric `v1.0`;
- record the exact version in every baseline report.

The first baseline may inform whether a target is realistic, but current poor
performance must not be used to redefine "reliable" downward. Thresholds need
an explicit user-approved quality floor.

## 8. Two-Axis Reliability Scorecard

Safety and quality are separate. Quality cannot offset a safety failure.

### 8.1 Safety axis

Any confirmed safety failure makes the search grade F and fires the applicable
stop condition.

The permitted safety-failure count is permanently zero. Phase 6D calibrates
quality and variance decisions, not the safety tolerance.

Product safety failures:

- wrong product or wrong model shown as exact;
- wrong-model, wrong-variant, wrong-recipe, or wrong-formula evidence attached;
- hard constraint violated by an exact match;
- suspicious or untrusted price used for exact/budget eligibility;
- category, listing, collection, search, article, support, manual, or
  documentation page used as a product card;
- query, host, seller, retailer prefix, or URL query parameters used as product
  identity;
- unsafe citation used as product-specific proof;
- clearly irrelevant, non-image, logo, tracking, placeholder, or page asset used
  as a product image;
- source-upgrade evidence crossing a product/model identity boundary.

Process release blockers are tracked separately:

- a regression-wall failure;
- a product-specific production patch;
- a rubric changed without a version bump;
- a live budget exceeded;
- required documentation or ledger entries missing.

Process blockers stop approval, but they are not counted as a per-search product
safety defect.

### 8.2 Quality axis

Only safety-passing searches receive a quality grade.

Canonical `v0.1-draft` formula:

- Start at 100.
- Deduct 15 once for each failed High-impact metric.
- Deduct 8 once for each failed Medium-impact metric.
- Ranking sensibility anchor 3 deducts 4; anchors 1-2 deduct 8.
- Never deduct more than once for the same metric in one search.
- Floor the quality score at 0.

This deduction model is retained because it is explicit, auditable, and already
hand-applied to the two Phase 6A historical fixtures. A component-weight model
was considered but rejected for the draft because proportional redistribution
would make partially scored historical fixtures harder to compare. Replacing
the formula requires an explicit rubric-version decision.

Missing-data policy:

- `NotApplicable`: the metric does not apply to the query shape; no deduction
  and no completeness penalty.
- `NotScored`: required evidence is missing or stale; no deduction, but the
  applicable score surface is incomplete.
- An applicable unscored High-impact metric caps the non-safety grade at B.
- An applicable unscored safety metric prevents a complete safety/release claim.
- Manual component not reviewed: mark `Pending manual review`; do not publish a
  final release verdict.
- Historical fixture missing newer fields: score only the available historical
  evidence and label the result `Historical partial`.

Draft grade bands:

- F: any safety failure.
- A: 90-100 and no unresolved manual safety flag.
- B: 75-89.
- C: 60-74.
- D: below 60.
- U: unscorable because required evidence is unavailable.

These grade bands are draft until the v1.0 freeze.

### 8.3 Metric definitions

Every metric entry in the Phase 6 scorecard must define:

- exact calculation;
- source field or script;
- automated, semi-automated, or manual status;
- applicability;
- severity;
- provisional threshold;
- handling when unavailable.

Required metrics:

- exact count;
- near count;
- total final count;
- wrong-product count;
- wrong-type count;
- unsafe citation count;
- unsafe primary URL count;
- unsafe image count;
- suspicious-price count;
- duplicate and near-duplicate count;
- model-conflict count;
- market-leader pool coverage;
- market-leader final coverage;
- leader loss-stage attribution;
- weak-citation count;
- weak-evidence winner count;
- image coverage;
- hard-constraint false-exact count;
- dealbreaker false-near count;
- conservative false-negative observations;
- ranking sensibility score;
- product diversity score;
- trust summary;
- overall safety verdict;
- quality score and grade.

### 8.4 Result adequacy must not reward unsafe volume

A broad search with fewer than six final products requires review, but low count
is not automatically a safety failure.

The report must distinguish:

- candidate pool too small;
- citation verification removed candidates;
- product eligibility removed candidates;
- product-type/requirement gates removed candidates;
- final selection reduced duplicates;
- trustworthy products were available but omitted;
- the system correctly returned fewer products because evidence was unsafe.

An honestly thin slate may lose quality points, but it must never be "improved"
by weakening trust gates.

## 9. Release Gates

### Stop the run

- Any new Critical product safety failure.
- Any wrong product/model/evidence attachment.
- Any suspicious exact/budget price.
- Any non-product page used as a card.
- Any regression caused by the current Phase 6 behavior change.

If caused by the current uncommitted change:

1. Stop live calls.
2. Preserve diagnostic evidence.
3. Roll back only the candidate behavior change.
4. Re-run deterministic verification on the restored tree.
5. Open or update the issue.
6. Ask before continuing.

### Block approval

- Regression wall is red.
- Product-specific production conditional or score adjustment is found.
- Rubric version changed mid-comparison.
- Live budget exceeded.
- Required trace/ledger/report data is missing.

### Manual review required

- Broad final count below six.
- Constrained final count below three.
- Leader coverage below approved floor.
- Ranking sensibility below 3/5.
- A quality metric is unscorable.
- A supposed improvement is within normal RR-015 variance.

### Log only

- Conservative false negative without unsafe output.
- Missing image.
- Weak citation that does not create unsafe proof.
- One-run provider anomaly.
- Minor metadata weakness.

## 10. Market-Leader Evaluation

Leader lists are QA-only measurement data. Production code must never import
them.

For objective product categories, a leader should normally:

- appear in at least two independent, dated editorial sources;
- be represented by a specific model or clearly defined model family;
- have source links and retrieval dates recorded;
- be approved before it is used as baseline truth.

Do not grant leader credit for brand presence alone when the returned SKU is an
unrelated or weak model.

For subjective categories such as dog food, running shoes, and mattresses:

- use consensus-coverage mode;
- measure whether finalists have multiple independent product-specific sources;
- do not force a universal named-product list where buyer needs legitimately
  vary.

Leader survival funnel:

1. Discovery/candidate pool.
2. Product eligibility.
3. Citation verification.
4. Requirement and product-type validation.
5. Enrichment/rescue.
6. Scoring cutoff.
7. Final selection.

Every missing leader must have a loss stage or be labeled `never discovered`.

Useful aggregate reports:

- pool coverage percentage;
- final coverage percentage;
- loss-stage histogram;
- categories affected per mechanism;
- obscure-over-trusted inversion:
  final #1 has no independent product-specific support while a comparable pool
  candidate with at least two independent sources was cut.

Leader snapshots should be dated and reviewed at least quarterly. External
editorial research is separate from ReviewRadar live-search API spending and
must still be scoped, cited, and approved.

## 11. Constraint Torture Method

Constraint dimensions:

- budget;
- installment/financing traps;
- exact size;
- maximum dimensions or weight;
- compatibility;
- color or material;
- included battery/charger/accessories;
- corded versus cordless;
- pet safety;
- negative/dealbreaker terms;
- brand alternatives;
- exact model;
- unit conversions;
- compound constraints;
- intentionally impossible combinations.

Outcome taxonomy:

| Outcome | Meaning | Treatment |
|---|---|---|
| False exact | Exact card violates a hard requirement | Safety failure |
| False near | Near card violates a dealbreaker | High |
| False negative | Valid candidate excluded by conservative logic | Medium/dossier evidence |
| Acceptable unknown | Evidence absent and honestly labeled | Pass |
| Honest empty | No safe exacts and truthful near/empty response | Pass |

Offline mutation of a saved candidate pool proves validator behavior only. It
does not prove end-to-end discovery for a differently constrained query.
End-to-end constraint claims require an approved fresh or repeated live run.

## 12. Seven Active QA Batches

Passive safety metrics are evaluated on every search. Dedicated batches exist
only when query shape creates a distinct exposure.

| Batch | Purpose | Example shapes | Primary mode |
|---|---|---|---|
| B1 Broad mainstream and leader | Recall, diversity, form factor | air fryer, stick vacuum, monitor | Historical + live |
| B2 Budget and hard constraint | False exacts, price trust | under-budget plus required feature | Deterministic first, then live |
| B3 Product-type confusion | Wrong subtype/category | shop vac, dash cam, pressure washer | Historical + live |
| B4 Model and brand identity | Model/series/brand safety | exact model and brand-only | Deterministic + focused live |
| B5 Low information and over-constrained | Honest near/empty behavior | vague query, impossible combination | Live |
| B6 Subjective category | Consensus evidence | dog food, running shoes | Historical re-score + limited live |
| B7 Variance probe | RR-015 stability | fixed broad and constrained queries | Repeated live |

The eventual category rotation should cover:

- tools;
- appliances;
- electronics;
- pet products;
- kitchen products;
- beauty and grooming;
- fitness;
- baby products;
- auto accessories;
- furniture;
- lawn and garden;
- shoes and apparel;
- home improvement;
- office products.

The first baseline is not a 30-50 search sweep. It consists of:

- a labeled audit of all 22 historical fixtures;
- current-code reassessment where supported;
- 12-15 explicitly approved fresh searches;
- a fixed core set plus a small rotating set.

Historical and fresh results must be reported separately. They must not be
averaged as if they came from the same current system distribution.

## 13. Live Budget Policy

| Run type | Maximum live calls | Approval |
|---|---:|---|
| Planning and templates | 0 | No live work allowed |
| Regression wall | 0 | Deterministic only |
| Patch audit | 0 | Static audit only |
| Variance pilot | 6 | Explicit approval |
| First fresh baseline | 12-15 | Exact query list and cost plan approved |
| One fix proof | 1 | Phase-specific approval |
| Second fix-proof call | 1 additional | Ask first |
| Affected-slice rerun | Up to 3 | Ask first |
| Full re-baseline | 12-15 | Ask; only when justified |

Phase 6D variance pilot:

- one broad query repeated three times;
- one constrained query repeated three times;
- six total calls;
- fixed inputs and debug mode;
- overlap measured at candidate pool, exact, near, and final levels;
- no claim that six calls fully close RR-015.

The existing quality scorecard estimates roughly 47 Serper calls per search.
Before Phase 6E, run the existing dry-run/cost plan and report the estimated
Serper and runtime budget. Any run over the script guard requires explicit
confirmation.

Live ledger fields:

- date/time;
- sub-phase;
- query and constraints;
- purpose;
- measurement rung;
- fixture path;
- estimated and observed cost if available;
- result status;
- whether the call was within approval.

## 14. Fixture Policy

### Tier A - Full live fixtures

- Raw saved debug responses.
- Untracked under current repo convention unless explicitly approved.
- Refreshable provider snapshots.
- Never committed accidentally with docs or code.

### Tier B - Distilled regression fixtures

- Minimal data shape needed to reproduce a shared mechanism.
- Product examples allowed as tests.
- Committed with deterministic tests.
- Must not contain secrets or unnecessary provider payloads.

### Tier C - Scorecards and baseline reports

- Committed measurement record.
- Includes rubric version, fixture age, evidence rung, and manual-review state.

Fixture staleness:

- Schema-stale: missing current trace fields.
- Market-stale: too old for a current market/leader claim.
- Logic-reassessable: frozen evidence can be passed through a current validator.
- Replay-only: useful for historical trace inspection, not current behavior.

RR-024 remains Won't Fix by design. Old fixtures must degrade gracefully.

## 15. Regression Wall

The regression wall is an index and gap-closure phase, not a rewrite of all
tests.

For every RR ID from RR-007 through RR-068, classify it as:

- covered by deterministic test;
- covered by current-code fixture reassessment;
- measurement-only issue;
- historical/documentation issue;
- Needs Investigation;
- Won't Fix;
- true deterministic gap.

Only true gaps require a new distilled fixture/test.

Required wall mechanisms include:

- category/listing/collection/search pages as cards;
- editorial/article/comparison/blog/press/support/manual pages as product proof;
- wrong model or nearby series evidence;
- wrong variant/recipe/flavor/formula citations;
- retailer/source prefixes supplying identity;
- query text or URL query parameters supplying identity;
- seller/host metadata supplying identity;
- same brand plus product type replacing model proof;
- false HP/Hewlett-Packard identity;
- suspicious tiny prices;
- unrelated or unscoped same-page prices;
- duplicate models and family flooding;
- niche form-factor domination;
- weak citation ranking regression;
- source-upgrade trigger/fallback safety;
- product image safety;
- fallback debug trace preservation;
- shop-vac versus household floor-cleaner type safety.

Recommended future command:

`npm run test:wall`

Do not add that command in Phase 6A. Phase 6B may propose or implement it after
the wall mapping proves which existing tests belong in the slice.

## 16. Product-Specific Patch Audit

Audit production files under `lib/` and applicable app/API modules.

Look for:

- product/model/brand/retailer strings inside conditionals;
- product-specific scoring adjustments;
- URL or host special cases;
- one-off search failure workarounds;
- named model tokens in identity, eligibility, price, source-upgrade, or final
  selection logic.

Acceptable:

- generalized brand aliases;
- product-type or category vocabularies;
- source-quality/domain data;
- broad model-family dictionaries consumed by a shared mechanism;
- examples in tests, fixtures, comments, and docs.

Classify every finding:

- acceptable generalized data;
- acceptable source/category rule;
- suspicious but non-behavioral;
- must-generalize blocker.

Do not initially create a brittle product-token denylist. A future automated
tripwire should inspect branching and scoring use, preferably through an
AST-aware rule, while allowing legitimate generalized data tables.

## 17. Root-Cause Dossiers

A dossier authorizes one fix phase.

Required contents:

- mechanism statement;
- affected pipeline stage;
- evidence rung for each instance;
- instances from two unrelated categories, or one reproduced instance plus
  generalized deterministic controls;
- one Critical instance if safety requires immediate action;
- affected metrics;
- suspected shared code path;
- fail-first test design;
- trust gates that must remain unchanged;
- expected before/after measurement;
- approved live proof budget;
- rollback condition.

Rank dossiers by:

`severity x category spread x user impact x measurement confidence`

Do not create a dossier named after one product. Name it after the shared
mechanism.

## 18. Issue Triage

### Critical

- wrong product/model/evidence attachment;
- fake or unsafe price used as exact;
- unsafe primary product page;
- unsafe product-specific citation;
- identity pollution;
- product-specific production behavior patch;
- regression of a Critical wall invariant.

### High

- repeated missing leaders with an attributed shared cause;
- supported ranking inversion;
- duplicate flooding;
- repeated unexplained thin slates;
- repeated false no-exact;
- shared false-negative mechanism.

### Medium

- weak citations;
- missing images;
- conservative false negatives;
- weak metadata;
- measurement-integrity gaps;
- missing trace needed for diagnosis.

### Low

- wording;
- display;
- minor UX;
- report formatting;
- documentation organization.

## 19. Phase 6 Roadmap

### Phase 6A - Instrument draft

**Status:** Completed and reconciled in documentation. No live calls, scripts,
tests, fixtures, production behavior, or issue statuses changed.

Goal:

Create the draft reliability rubric, templates, gates, batch definitions, and
fixture policy without code or live calls.

Deliverables:

- master reliability plan in the repo;
- scorecard `v0.1-draft`;
- live-search batch and budget document;
- inventory of existing scripts and actual debug fields;
- two historical worked examples;
- proposed trace/automation gaps requiring later approval.

Worked examples:

- `shop-vac.json`;
- `gas-grill.json`.

These examples validate scorecard usability and schema coverage. They do not
claim current live quality.

Exit:

- rubric can be applied consistently;
- missing fields are explicit;
- no production/test/script changes;
- no live searches;
- docs-only commit;
- stop for Phase 6B approval.

### Phase 6B - Regression wall

Goal:

Map Phase 5 issues to deterministic protection and close real test gaps.

Deliverables:

- RR-ID to mechanism/test/fixture/status table;
- distilled fixtures for genuine gaps;
- optional `test:wall` command after approval;
- wall verification report.

Exit:

- every applicable issue mapped;
- every true behavior gap covered;
- full suite green;
- no production behavior changes;
- stop for Phase 6C approval.

### Phase 6C - Product-specific patch audit

Goal:

Prove Phase 5 did not leave unsafe product-shaped production logic.

Deliverables:

- audit method;
- findings table;
- classification of every suspect;
- blockers entered in issue register;
- automation proposal if useful.

Exit:

- zero unresolved must-generalize blockers, or explicit stop;
- no behavior changes;
- no live searches;
- stop for Phase 6D approval.

### Phase 6D - Variance pilot

Goal:

Measure enough current variance to stop interpreting single-run movement as
proof.

Live budget:

- six approved calls;
- one broad query x3;
- one constrained query x3.

Metrics:

- candidate-pool pairwise Jaccard overlap;
- final-set pairwise Jaccard overlap;
- exact/near count range;
- rank correlation for shared products;
- stage-loss variation;
- latency and error variation.

Deliverables:

- RR-015 pilot report;
- provisional significance rule;
- recommendation for sample size;
- explicit statement of what remains unproven.

Exit:

- rubric weights and thresholds reviewed;
- rubric v1.0 frozen before Phase 6E;
- RR-015 updated from evidence but not necessarily closed;
- stop for Phase 6E approval.

### Phase 6E - Baseline

Goal:

Create the first versioned reliability baseline.

Inputs:

- all 22 historical fixtures, separately labeled;
- current-code reassessment where supported;
- 12-15 approved fresh searches;
- fixed core categories plus rotating categories;
- approved leader snapshots.

Deliverables:

- Baseline Report v1;
- search-by-search scorecards;
- safety gate results;
- leader funnel and loss-stage report;
- constraint audit;
- live budget ledger;
- list of observations versus reproduced results.

Exit:

- every fresh search graded under frozen v1.0;
- historical and current results not conflated;
- safety failure stops the batch;
- findings only, no fixes;
- stop for Phase 6F approval.

### Phase 6F - Dossier analysis

Goal:

Turn baseline findings into a ranked shared-root-cause queue.

Deliverables:

- loss-stage histogram;
- repeated failure clusters;
- dossier queue;
- parked provider-bound observations;
- proposed first fix scope.

Exit:

- every Critical/High finding is in one dossier or explicitly parked with
  evidence;
- no behavior changes;
- stop for fix approval.

### Phase 6G - One-dossier fix loop

Goal:

Fix exactly one approved shared mechanism.

Workflow:

1. Reproduce.
2. Add fail-first tests.
3. Implement one generalized fix.
4. Run focused tests.
5. Run regression wall.
6. Run full deterministic suite.
7. Run same-candidate-set comparison where applicable.
8. Run one approved live proof.
9. Compare against variance threshold.
10. Update issues/docs.
11. Commit.
12. Stop.

Exit:

- dossier metric improved;
- no safety or wall regression;
- no unrelated fix;
- no unapproved live calls.

### Phase 6H - Progress review

Goal:

Determine whether Phase 6 should continue, re-baseline, or move to standing
reliability cadence.

Deliverables:

- paired baseline comparison;
- improved/worsened/unchanged metrics;
- safety summary;
- remaining dossiers;
- RR-014/RR-015/RR-037/RR-045 status review;
- continue/stop recommendation.

## 20. Definition of Reliable

Phase 6 may close only when:

- two approved measurement cycles using the same frozen rubric have zero
  product safety failures;
- the regression wall is green;
- the production patch audit has no unresolved blocker;
- market-leader final coverage meets the user-approved floor established after
  variance calibration and before the first baseline;
- every missing leader in the evaluated core has an attributed loss stage;
- hard-constraint false-exact count is zero;
- duplicate/model-family protections remain green;
- any quality movement claimed as real exceeds the approved variance rule;
- RR-014, RR-015, RR-037, and RR-045 are closed, reclassified, or explicitly
  documented as provider-bound with evidence;
- no open Critical/High Phase 6 blocker remains;
- live budget and fixture ledger are complete.

If achieved, Phase 6 becomes standing cadence:

- regression wall on every behavior fix;
- focused live proof per approved fix;
- periodic variance check;
- quarterly leader snapshot review;
- scheduled baseline only with approval.

## 21. Standard Workflows

### Planning run

- Docs/templates only.
- No code, tests, scripts, or live calls.
- Record proposed automation separately.
- Stop if implementation becomes necessary.

### Finding-only run

- Use fixtures, current validators, or an approved live list.
- Score and document.
- Do not fix.
- Critical finding stops the run.

### Regression-wall run

- Tests and distilled fixtures only.
- No production behavior.
- If a gap requires behavior change, stop and open/update an issue.

### Patch-audit run

- Static analysis and documentation.
- No behavior edits.
- A must-generalize finding blocks approval.

### Single-dossier fix

- One mechanism.
- Fail-first proof.
- No second root cause.
- One approved live proof.
- Roll back if safety worsens.

### Live proof

- One approved query.
- Save debug fixture.
- Diagnose only.
- Do not fix a newly exposed issue in the same run.

### Release-gate run

- Read reports and test results.
- Produce pass/block verdict.
- Do not fix anything.

### Documentation-only run

- Update tracking docs.
- Abort if a production-code diff appears.

## 22. Required Verification

After every Phase 6 coding or test phase:

```text
npm run typecheck
npm run lint
npm test
node scripts/eval-pipeline.mjs
```

Additional checks:

- focused tests for the affected mechanism;
- regression wall once defined;
- `node scripts/ab-ranking.mjs` only when ranking behavior is involved;
- replay only for relevant fixtures;
- live calls only within the approved phase budget.

Planning-only phases do not need behavior tests to prove a code change, because
there is no code change. Repo convention may still require the standard
deterministic suite as a clean-state gate; record that it verifies repository
state rather than planning content.

## 23. Required Documentation After Every Sub-Phase

Always update:

- `docs/RR-Issues-Report.md`
- `docs/qa-loop-results.md`
- `docs/agent-next-task.md`
- `docs/change-log.md`
- `docs/Agent Run Summary.md`
- `docs/codex-handoff-phased-plan.md`

Update when measurement guidance or results change:

- `docs/review-radar-test-memory.md`

Update when source-of-truth architecture, pipeline behavior, or the Phase 6
operating model changes:

- `ReviewRadar-Overview.md`

Every phase record must include:

- completed Phase 6 step;
- next step;
- diagnostic/planning/behavior classification;
- measurement rung;
- stop condition status;
- new issue IDs;
- updated issue IDs;
- live budget spent;
- fixture files created or reassessed;
- docs changed;
- commit hash;
- uncommitted local artifacts.

No Phase 6 step may continue automatically before required docs are complete.

## 24. Planned Phase 6 Artifacts

| Phase | Artifact |
|---|---|
| 6A | `docs/phase-6-reliability-gauntlet-plan.md` |
| 6A | `docs/phase-6-scorecard-template.md` |
| 6A | `docs/phase-6-live-search-batches.md` |
| 6B | `docs/phase-6-regression-wall.md` |
| 6C | `docs/phase-6-product-specific-patch-audit.md` |
| 6E | `docs/phase-6-market-leader-evaluation.md` |
| 6E | approved QA-only leader snapshot data |
| 6E+ | versioned baseline and comparison reports |

No executable script or benchmark data file is created in Phase 6A. Missing
automation is listed as a proposal requiring approval.

## 25. Stop Conditions

Stop immediately if:

- unsafe evidence attaches;
- wrong product/model/variant attaches;
- suspicious price becomes exact or budget-usable;
- a non-product page becomes a product card;
- an unsafe image attaches;
- a fix requires product-specific behavior;
- a new Critical issue appears;
- more than one root cause must be changed;
- live budget would be exceeded;
- exact count improves only by weakening safety;
- a rubric or benchmark changes mid-comparison;
- current evidence cannot distinguish code failure from provider variance;
- app behavior changes during a planning-only phase;
- Phase 6 scope expands without approval.

## 26. Standard Final Report

Every Phase 6 report includes:

1. Phase and overall verdict.
2. Scope performed.
3. Measurement rung for each material conclusion.
4. Root cause or finding.
5. What changed, if anything.
6. Safety boundaries preserved.
7. Deterministic tests and results.
8. Fixture replay/reassessment.
9. Live searches and budget spent.
10. What was proven.
11. What remains unproven.
12. Issue IDs opened or updated.
13. Files changed.
14. Docs updated.
15. Worktree state and excluded local artifacts.
16. Commit hash.
17. Brief Recommended Direction.

Do not draft the next long prompt unless Taylor explicitly asks for it.

## 27. Executed Phase 6A Prompt (Historical Reference)

```text
Run Phase 6A only: build the draft Phase 6 reliability instrument.

Use the approved merged Phase 6 Reliability Gauntlet master plan as the source
of truth.

This is a planning and documentation phase.

Do not run live searches.
Do not change app code, app tests, scripts, pipeline behavior, ranking,
discovery, identity, price trust, page eligibility, source upgrade, product
type, requirements, final selection, UI, or API behavior.
Do not fix issues.
Do not start Phase 6B.
Do not create executable automation or benchmark data. Record useful automation
under "Proposed automation - requires approval."

Before editing:

1. Confirm the repository and run git status.
2. Read:
   - docs/RR-Issues-Report.md
   - docs/codex-handoff-phased-plan.md
   - docs/agent-next-task.md
   - docs/review-radar-test-memory.md
   - ReviewRadar-Overview.md
   - recent Phase 5 closeout entries in docs/qa-loop-results.md
3. Inventory the existing measurement system:
   - scripts/qualityScorecard.mjs
   - scripts/goldBenchmark.mjs
   - scripts/qualityConsistencyHarness.mjs
   - scripts/ab-ranking.mjs
   - scripts/replay-quality-fixtures.mjs
   - scripts/save-debug-fixture.mjs
   - scripts/eval-pipeline.mjs
   - scripts/citationStrengthDiagnostic.mjs
   - tests/fixtures/review-radar-live/
4. Verify the current counts rather than copying old estimates. The closeout
   observed 64 test files and 22 saved live fixtures.

Create:

1. docs/phase-6-reliability-gauntlet-plan.md
   - canonical Phase 6 objectives, rules, measurement ladder, roadmap,
     workflows, budgets, stop conditions, dossier policy, and Definition of
     Reliable;
   - state that saved fixtures are historical snapshots;
   - state that Phase 6 execution has not started.

2. docs/phase-6-scorecard-template.md
   - label it v0.1-draft;
   - separate binary product safety from quality scoring and process blockers;
   - define every metric, formula, field source, deduction, applicability,
     automation status, severity, threshold, and missing-data behavior;
   - include the auditable 100-point deduction formula;
   - distinguish `NotApplicable` from missing `NotScored`;
   - treat safety zero tolerance as absolute, not provisional;
   - include per-search, before/after, variance, and release-gate templates;
   - do not call the rubric v1.0 or freeze thresholds.

3. docs/phase-6-live-search-batches.md
   - define the seven active batches;
   - distinguish passive safety metrics from query-shaped batches;
   - define the six-call Phase 6D variance pilot;
   - define the 12-15-call Phase 6E approval ceiling;
   - initialize the live budget ledger at zero;
   - do not authorize or run any calls.

Validate the draft instrument by applying it to exactly two saved fixtures:

- tests/fixtures/review-radar-live/shop-vac.json
- tests/fixtures/review-radar-live/gas-grill.json

Use replay output only. Label both worked examples "Historical partial." Their
purpose is to verify that the rubric can consume real saved output, not to claim
current live quality. If a required field is unavailable, mark the metric
unscorable and add it to "Proposed trace additions - requires approval." Do not
implement the trace.

Run the repository clean-state checks:

- npm run typecheck
- npm run lint
- npm test
- node scripts/eval-pipeline.mjs

These checks verify that the existing repository remains green; they do not
validate the planning rubric itself.

Update the required tracking docs:

- docs/RR-Issues-Report.md
- docs/qa-loop-results.md
- docs/agent-next-task.md
- docs/change-log.md
- docs/Agent Run Summary.md
- docs/codex-handoff-phased-plan.md
- docs/review-radar-test-memory.md
- ReviewRadar-Overview.md

Mark Phase 6A complete and Phase 6B next, but do not start Phase 6B.
No issue status should change unless the documents are factually inconsistent.

Commit docs only when green. Do not commit .claude/, generated baselines, raw
live fixtures, or unrelated files.

Final report:

- Phase 6A verdict;
- files created and updated;
- existing harness inventory;
- scorecard summary;
- both historical worked examples;
- unscorable metrics and proposed traces;
- tests run/results;
- confirmation of zero live calls;
- confirmation no behavior, tests, scripts, or issues changed;
- worktree state and excluded artifacts;
- commit hash;
- brief Recommended Direction.

Stop after Phase 6A.
```

## 28. Principal Risks and Assumptions

- Provider variance may be inherent and managed rather than fixed.
- Some desired metrics may lack debug fields.
- Historical fixtures may be schema- or market-stale.
- Editorial leader lists contain judgment and decay over time.
- Manual ranking review is the limiting human resource.
- A composite score can hide important dimensions if component results are not
  shown beside it.
- Diversity thresholds can be category-dependent and must not become blunt
  brand caps.
- A low final count can be correct safety behavior.
- Existing A/B support is narrow and must not be described as general.
- Live costs vary by query because discovery and rescue depth vary.
- Documentation can become bureaucracy; each artifact must have one owner and
  a clear use in the next phase.

## 29. Final Recommendation

Use this reconciled document as the canonical Phase 6 strategy.

Phase 6A is complete. Start only Phase 6B after explicit approval. Do not run
the variance pilot or spend live API calls until the preceding zero-cost phases
are complete, documented, and approved.

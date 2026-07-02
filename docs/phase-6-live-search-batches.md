# Phase 6 Live Search Batches

**Status:** RR-069 fixed deterministically; Phase 6D remains paused after 4/6 pilot searches
**Rubric:** `v0.1-draft`; quality thresholds remain provisional until the v1.0 freeze after Phase 6D; safety tolerance is absolute at zero failures
**Governing source of truth:** `docs/phase-6-reliability-gauntlet-plan.md`. This batch document implements the master plan and must not override it.

## 1. Runtime inventory

- Test files: **64** top-level `tests/*.test.mjs`
- Saved live fixtures: **22** JSON files in `tests/fixtures/review-radar-live/`
- Phase 6D pilot budget: **6 approved searches**
- Phase 6D searches used: **4**; **2 blocked by the RR-069 safety stop**

The fixture corpus is the free foundation. Batch definitions describe future approved work; they are not authorization to run it.

## 2. Batch allocation and approval contract

Trap metrics—page eligibility, price trust, citation safety, image safety, and duplicates—are passive checks on every search. Dedicated batches exist only where the query shape creates a distinct exposure.

| Batch | Purpose | Failure exposed | Examples | Key metrics | Evidence modes | Planned live calls requiring phase approval |
|---|---|---|---|---|---|---:|
| **B1 Broad mainstream + leader** | Measure leader recall, diversity, and broad-form-factor priors | RR-014 leader absence, obscure-over-trusted winners, narrow brand/family slates | `air fryer`; `cordless stick vacuum`; `27 inch monitor` | S1–S7 passive; QH1–QH5; QM1–QM4; QM6 | M3/M2 fixture work first; M4 approved live | **5** |
| **B2 Budget + hard constraint** | Stress exact honesty under budget/feature pressure | False exacts, fake/unknown price use, constraint leakage, false-empty pressure | `robot vacuum under $300 self-emptying`; `cordless drill with 2 batteries under $150` | S1–S8; QH4–QH5; QM3; QM5 | M2 validator-layer first, explicitly not end-to-end; then M4 | **3** |
| **B3 Product-type confusion** | Exercise close substitute and category-boundary failures | RR-068/RR-017 class wrong products reaching exact/near | `shop vac`; `dash cam`; `pressure washer` | S1; S4; S8; QH4–QH5; QM3; QM5 | M2 current type/eligibility reassessment plus M4 | **2** |
| **B4 Model/brand identity** | Exercise product/evidence identity boundaries | Wrong-model attachment, retailer/query identity pollution, brand-only ambiguity | One exact-model query; one brand-only query | S1–S2; S5–S6; QH2–QH3; QM2 | M1/M2 controls first; then M4 | **2** |
| **B5 Low-info / over-constrained** | Verify honest empty/near behavior | Fabricated exactness, volume pressure, unknown presented as pass | One vague query; one impossible compound constraint | S1; S3–S4; S8; QH4–QH5; QM3 | M4; M1/M2 can support validators but not discovery | **2** |
| **B6 Subjective category** | Use consensus coverage where named leader lists are inappropriate | Thin consensus, editorial under-support, overconfident ordering | `dog food`; `running shoes` | S1–S7 passive; QH1 consensus form; QH3; QM2–QM4; QM6 | M3/M2 fixture work first; M4 | **1** |
| **B7 Variance pilot** | Quantify RR-015 before scorecard freeze | Pool/final instability that can hide or mimic deltas | `shop vac`; `robot vacuum under $300 self-emptying` | Set overlap, exact counts, leader/constraint metrics, score spread, all safety metrics | Repeated M4, anchored by M3 fixtures | **6 in Phase 6D only** |

The B1–B6 allocation totals **15** possible baseline calls. Phase 6E must explicitly approve a listed set of **12–15**; unused allocation is not permission to substitute an unlisted query. B7 is a separate Phase 6D budget and must not be mixed into the baseline.

## 3. Batch definitions

### B1 — Broad mainstream + leader

- Purpose: determine whether recognized market leaders enter the pool, survive each stage, and reach the final seven without weak or niche products crowding them out.
- Fixture-first examples: `best-robot-vacuum.json`, `gas-grill.json`, `cordless-drill.json`, `office-chair.json`, `air-purifier.json`, `gaming-monitor.json`.
- Exposed failure: missing leaders, unexplained loss stage, weak-evidence #1, low diversity, form-factor inversion.
- Approval count: 5 M4 searches, only from an explicitly approved list.

### B2 — Budget + hard constraint

- Purpose: measure truthful exact/near behavior when budget and feature evidence are incomplete.
- Fixture-first examples: `robot-vacuum-under-300-self-emptying.json`, `gas-grill-under-600-4-burner.json`.
- Exposed failure: suspicious or unknown price used for budget, violated feature in exact, false empty, or valid candidates rejected by a repeated conservative mechanism.
- Approval count: 3 M4 searches. Offline mutations are M2 validator-layer evidence only and never count as an end-to-end query.

### B3 — Product-type confusion

- Purpose: target categories with plausible but wrong substitutes.
- Fixture-first examples: `shop-vac.json`, `dash-cam.json`, `pressure-washer.json`, `portable-generator.json`.
- Exposed failure: household cleaner versus shop vac, accessory versus product, camera subtype confusion, pressure-washer consumable/substitute, or power station versus generator.
- Approval count: 2 M4 searches.

### B4 — Model/brand identity

- Purpose: prove that exact model and brand evidence remains source-derived across product cards and evidence attachments.
- Fixture-first examples: model-rich records in `shop-vac.json`, `electric-toothbrush.json`, `dehumidifier.json`, and `cordless-drill.json`.
- Exposed failure: nearby model attachment, brand-only substitution, retailer/private-label confusion, query/URL/seller identity pollution.
- Approval count: 2 M4 searches: one exact-model and one brand-only query, named before execution.

### B5 — Low-info / over-constrained

- Purpose: reward honesty rather than card volume when the request is vague or impossible.
- Fixture-first work: deterministic requirement controls and relevant constrained fixture pools. No existing fixture is relabeled as proof of a different live query.
- Exposed failure: invented assumptions presented as exact, fake exacts under impossible constraints, or unverified requirements silently treated as pass.
- Approval count: 2 M4 searches: one vague and one impossible compound request.

### B6 — Subjective category

- Purpose: use consensus coverage rather than a brittle named-leader list.
- Fixture-first examples: `dog-food.json`, `running-shoes.json`.
- Exposed failure: finalists without adequate independent editorial consensus, unsupported winner, or confidence that exceeds the evidence.
- Approval count: 1 M4 search. Rotate the subjective category between approved baseline cycles.

### B7 — Variance pilot

- Purpose: derive the provisional delta-significance rule for later before/after live claims.
- Design: 2 queries × 3 runs = 6 M4 calls.
- Approval count: 6 calls in Phase 6D only, as one explicitly instructed pilot.
- Exit artifact: pool/final overlap report and a written decision rule. The pilot updates RR-015 but cannot close it alone.

## 4. Fixed core-10

The core set is fixed for longitudinal comparison. Every category already has at least one saved fixture.

| # | Query label | Existing fixture | Primary batch role |
|---:|---|---|---|
| 1 | `best robot vacuum` | `best-robot-vacuum.json` | B1 leader/mainstream |
| 2 | `shop vac` | `shop-vac.json` | B3 product type; B7 broad pilot |
| 3 | `gas grill` | `gas-grill.json` | B1 leader/ranking |
| 4 | `cordless drill` | `cordless-drill.json` | B1 mainstream; B4 identity |
| 5 | `office chair` | `office-chair.json` | B1 mainstream/diversity |
| 6 | `air purifier` | `air-purifier.json` | B1 mainstream/evidence |
| 7 | `gaming monitor` | `gaming-monitor.json` | B1 form factor/model identity |
| 8 | `dash cam` | `dash-cam.json` | B3 product type |
| 9 | `dog food` | `dog-food.json` | B6 subjective consensus |
| 10 | `running shoes` | `running-shoes.json` | B6 subjective consensus |

Rules:

1. Do not silently replace a core query. A change requires rationale, rubric version review, and an explicit comparability note.
2. Preserve the exact query text and request shape used by the approved cycle.
3. Score all available M3 fixture evidence before buying M4 evidence.
4. A core fixture may be schema-stale and still useful; it must be labeled, not refreshed merely for neatness.

## 5. Rotation policy

- Each baseline cycle uses the fixed core-10 plus approximately 5 novel queries, subject to the approved 12–15-call budget.
- Novel queries cover batch exposures missing from the core, prioritizing unused fixture categories before entirely new categories.
- Do not repeat the same novel query in consecutive cycles unless it is part of an approved fix proof or drift investigation.
- At least one constrained query and one low-info/over-constrained query should appear in every full baseline list.
- Rotate B6 between `dog food`, `running shoes`, and another explicitly approved subjective category; keep the core fixture records for longitudinal context.
- Record additions, removals, substitutions, and request-shape changes before calls run.
- A novel query never becomes core by repetition alone; promotion requires a documented versioned decision.

Remaining fixture categories available for zero-cost rotation or future approved lists include basketball hoop, coffee maker, dehumidifier, electric toothbrush, gas grill under $600/4-burner, leaf blower, portable generator, pressure washer, robot vacuum, constrained robot vacuum, treadmill, and wireless earbuds.

## 6. Phase 6D variance-pilot design

### Fixed pilot queries

| Role | Query | Existing fixture | Why selected |
|---|---|---|---|
| Broad | `shop vac` | `shop-vac.json` | Existing RR-037/RR-015 coverage history, current post-RR-068 fixture, and strong type/identity exposure |
| Constrained | `robot vacuum under $300 self-emptying` | `robot-vacuum-under-300-self-emptying.json` | Existing hard-budget/feature fixture and exact/near pressure |

### Execution design

1. Run each exact request shape 3 times in one approved window: `A1, B1, A2, B2, A3, B3`.
2. Hold code commit, rubric version, environment, request fields, and benchmark snapshot constant.
3. Save six distinct fixtures; never overwrite the historical anchor fixture.
4. Label every new observation M4 and the old anchor comparison M3.
5. Stop the pilot on any safety failure; preserve the finding and do not spend remaining calls until directed.

### Measurements

- Candidate-pool normalized identity sets: all three pairwise intersections/unions and three-run intersection/union.
- Final exact normalized identity sets: the same overlap measures.
- Exact and near counts per run.
- Leader pool/final coverage for the broad query when the dated benchmark exists.
- Budget/feature exact violations and confidence honesty for the constrained query.
- Per-run quality score and each metric result under the same rubric version.
- Safety failures, errors, Serper calls, and latency.

The 6D report will derive the delta-significance decision rule from these observations. Phase 6A sets no significance cutoff and makes no repeatability claim.

## 7. Fixture policy

### Tier A — full live fixtures

- Full debug payloads captured by the existing save path.
- Untracked by current repository convention; refreshable raw material.
- Preserve `_query`, `_savedAt`, exact request shape, optional `_goldLeaders`, code commit, rubric version, and approval/ledger reference in the associated committed report.
- Never edit a fixture to remove an observed failure. Save a new dated artifact.

### Tier B — distilled regression fixtures

- Minimal committed records that back deterministic regression-wall tests.
- Created only during an approved regression-wall/fix phase, never in Phase 6A.
- Contain the smallest cross-category product/evidence shape that proves the shared mechanism.

### Tier C — scorecards and baseline reports

- Committed measurement records using the machine-readable scorecard contract.
- Keep evidence modes, source fixture/run IDs, threshold/rubric version, incomplete fields, and ledger reference.

### Staleness

- `schema-stale`: missing current debug fields. Score available metrics and mark the rest `NotScored`.
- `market-stale`: older than approximately 60 days for leader-coverage/trend claims. Label and exclude from trend claims; do not discard it as historical M3 evidence.
- M2 current-code reassessment must name the validator/classifier layer. Replay alone remains M3.
- Fixture refresh requires a measurement question, approved live list, and ledger entry. Staleness alone is not authorization to spend.

## 8. Approval ledger

| Batch | Draft allocation | Approved now | Used | Remaining approved |
|---|---:|---:|---:|---:|
| B1 | 5 | 0 | 0 | 0 |
| B2 | 3 | 0 | 0 | 0 |
| B3 | 2 | 0 | 0 | 0 |
| B4 | 2 | 0 | 0 | 0 |
| B5 | 2 | 0 | 0 | 0 |
| B6 | 1 | 0 | 0 | 0 |
| B7 (6D only) | 6 | 6 | 4 | 2 (unspent; reapproval required) |
| **Total** | **21 across separate phases** | **6** | **4** | **2 (unspent)** |

The 21-call draft total is not one run budget: B1–B6 are the 15-call maximum baseline allocation, while B7 is a separate six-call pilot.

## 9. Live-call budget ledger

| Date | Sub-phase | Batch | Query/run | Purpose | Approval reference | Fixture path | Serper calls | Status |
|---|---|---|---|---|---|---|---:|---|
| 2026-07-01 | Phase 6A | — | None | Documentation, fixture replay, and instrument validation only | Phase 6A budget = 0 | — | 0 | No live calls |
| 2026-07-02 04:34 ET | Phase 6D | B7 | `shop vac` A1 | Broad variance and RR-037 pool presence | Taylor's explicit Phase 6D six-search approval | `tests/fixtures/review-radar-live/shop-vac.phase6d-run1.json` | 37 | Safe; 2 exact/5 near; RIDGID left after citation verification |
| 2026-07-02 04:37 ET | Phase 6D | B7 | `robot vacuum under $300 self-emptying` B1 | Constrained variance and exact-honesty measurement | Taylor's explicit Phase 6D six-search approval | `tests/fixtures/review-radar-live/robot-vacuum-under-300-self-emptying.phase6d-run1.json` | 38 | Safe; 1 exact/5 near; verified $299.99 exact |
| 2026-07-02 04:39 ET | Phase 6D | B7 | `shop vac` A2 | Broad variance and RR-037 pool presence | Taylor's explicit Phase 6D six-search approval | `tests/fixtures/review-radar-live/shop-vac.phase6d-run2.json` | 37 | Safe; 2 exact/4 near; RIDGID reached exact and near |
| 2026-07-02 04:41 ET | Phase 6D | B7 | `robot vacuum under $300 self-emptying` B2 | Constrained variance and exact-honesty measurement | Taylor's explicit Phase 6D six-search approval | `tests/fixtures/review-radar-live/robot-vacuum-under-300-self-emptying.phase6d-run2.json` | 38 | **STOP:** generic Q10-series evidence attached to Q10 X5+ target; opened RR-069 |

**Phase 6D approval:** exactly 6 live searches: `shop vac` x3 and
`robot vacuum under $300 self-emptying` x3. Estimated cost is approximately
280 Serper calls at the previously observed approximately 47 calls/search.

**Ledger total used: 4 of 6 approved Phase 6D live searches; 150 observed Serper calls.**
The remaining two approved searches were not spent because the Phase 6 safety
stop fired on B2. RR-069 was later fixed deterministically, but the pilot was
not resumed and the remaining searches require explicit reapproval.

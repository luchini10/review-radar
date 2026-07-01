# Phase 6 Reliability Gauntlet Plan

**Status:** Adopted plan. Drafted by Claude (2026-07-01), revised per Codex review same day.
**Prerequisite state (verified):** Phase 5 closed. Issue register: 68 issues — 63 Fixed, 4 Needs Investigation (RR-014, RR-015, RR-037, RR-045), 1 Won't Fix (RR-024), 0 Open.
**Revision note:** This version applies all 12 corrections from the Codex review: accurate inventory counts (64 test files, 22 live fixtures); rubric versioning (v0.1-draft → v1.0 freeze before paid baseline); a defined 0–100 scoring formula; explicit fixture-evidence semantics; a stronger variance pilot (2 queries × 3 runs); a relaxed dossier rule (deterministic cross-category controls can substitute for a second live sighting); final-count demoted from auto-deduction to funnel-review trigger; per-search safety metrics separated from program-level process gates; the product-token denylist demoted to an advisory aid; the full tracking-doc set restored to the Phase 6A prompt; validator-layer labeling for offline constraint mutation; and calibration rules that set floors from baseline but targets independently of current performance.

---

## 1. Executive summary and objective

Phase 5 hardened the known trust gates: identity, model-level evidence, page eligibility, price trust, citation safety, source-upgrade behavior, diversity, image safety, and trace preservation. Phase 6 answers a different question: **is ReviewRadar reliable in the real world, is it improving, and what is still broken that we have not seen?**

**Objective in one sentence:** Prove, with budgeted live evidence and deterministic replay, that broad searches return trusted market-leading products under honest constraints — and convert every discovered failure into one shared-mechanism fix at a time, without ever weakening a trust gate to improve a number.

Phase 6 is a reliability engineering program, not a bug-fix queue. Its outputs are a measurement instrument (scorecard + gates), a permanent regression wall, a variance-calibrated baseline, a ranked root-cause dossier queue, and a defined exit condition.

## 2. Current inventory (verified 2026-07-01)

- **Tests:** 64 `tests/*.test.mjs` files (full suite green at Phase 5 close).
- **Live fixtures:** 22 JSON fixtures in `tests/fixtures/review-radar-live/` (untracked by convention).
- **Measurement scripts (existing — extend, never duplicate):** `scripts/qualityScorecard.mjs`, `scripts/goldBenchmark.mjs`, `scripts/qualityConsistencyHarness.mjs`, `scripts/ab-ranking.mjs`, `scripts/replay-quality-fixtures.mjs`, `scripts/save-debug-fixture.mjs`, `scripts/eval-pipeline.mjs`, `scripts/citationStrengthDiagnostic.mjs`.
- **Carryover measurement questions:** RR-014 (leader coverage), RR-015 (run-to-run stability ~19%), RR-037 (pool variance), RR-045 (provider coverage).

Any Phase 6 run must re-verify these counts at run time rather than trusting this snapshot.

## 3. Operating rules

1. No product-specific production patches. Product examples are test cases only.
2. One root cause per fix run.
3. Fail-first tests before any behavior edit.
4. Deterministic evidence before live spending.
5. Live API calls are budgeted, listed, and logged in the ledger before they run.
6. Any Critical safety finding stops the run (rollback protocol, section 14).
7. Exact matches must be safer than near matches; false exacts are worse than conservative nears.
8. Never improve exact or final counts by weakening a trust gate.
9. **Measurement-rung labeling:** every claim states which evidence mode proved it (section 4). Fresh-live-only claims are observations, not results.
10. **Dossier rule (amended):** a fix run is authorized by any of: (a) one Critical safety instance; (b) one reproduced production instance **plus deterministic cross-category controls proving the mechanism is shared**; (c) the same mechanism observed in two or more unrelated production categories. In all cases the fix itself must target a shared mechanism and ship with cross-category positive and negative tests.
11. **Rubric versioning:** the scorecard starts as v0.1-draft. It freezes as v1.0 only after hand-scoring validation, trace-gap review, and the variance pilot — and always **before** the paid baseline. Any change after freeze bumps the version and forces an explicit re-baseline decision.
12. **Fixture-first:** the 22 saved fixtures are the free foundation; live calls only buy what fixtures cannot show.
13. **Extend, never duplicate:** the eight existing scripts are the measurement system.

## 4. Measurement ladder and evidence modes

Four evidence modes, from cheapest/most conclusive-per-dollar to most expensive/noisiest. Every scorecard entry and every finding is labeled with its mode.

| Mode | What it is | What it proves | What it cannot prove |
|---|---|---|---|
| **M1 Deterministic tests** | Unit/integration tests, synthetic fixtures | Pure-logic behavior, regressions | Live provider behavior |
| **M2 Current-code reassessment** | Frozen fixture inputs re-run through today's validators/classifiers (the established 5C/5I pattern) | Whether current logic would still make a past mistake | Stages upstream of the frozen data (discovery, LLM planning) |
| **M3 Historical fixture scoring** | Scoring the fixture's recorded outputs as they happened | What the pipeline actually did on that date | Anything about current code |
| **M4 Fresh live search** | New end-to-end run | Real-world behavior now, full pipeline | Repeatability — single runs carry ~19% instability (RR-015) until the variance pilot says otherwise |

Rules: replaying a fixture does **not** re-run the full current pipeline — replay analysis is M2/M3 and must be labeled as such. Offline constraint mutation (re-filtering a saved pool with altered requirements) is **M2 validator-layer evidence only**; it never proves end-to-end discovery for a differently constrained query. Before/after claims require M1/M2 (or `ab-ranking.mjs` same-candidate-set comparison), or repeated M4 runs consistent with the variance decision rule.

## 5. Reliability scorecard

Two axes. **Safety** is per-search, binary, zero-tolerance. **Quality** is a 0–100 composite. Grade F on any per-search safety failure regardless of quality; otherwise A ≥90, B 75–89, C 60–74, D <60.

### 5.1 Safety axis (per-search evidence failures; any one ⇒ grade F + stop condition)

| Metric | Measured by | Debug source | Mode |
|---|---|---|---|
| Wrong product or wrong model as exact | Exact card identity vs its own evidence | `finalSelectionTrace`, citation identity fields | Auto-flag + manual confirm |
| Wrong-model evidence attached | Identity conflict in any attachment path | `sourceUpgradeTraces[].identityMatch` / `rejectionReason` / `candidateSample` | Auto |
| Suspicious price in exact | `priceTrustStatus=suspicious` on exact tier | price trust fields, `canUseForBudget` | Auto |
| Non-product page as product card | Final primary URL classification | eligibility classifier verdict | Auto |
| Identity pollution | Query/host/seller/retailer-prefix-derived identity used in attachment | RR-051/053/065 provenance traces | Auto |
| Unsafe citation | Citation fails product-specificity | citation validation fields (RR-063 path) | Auto |
| Unsafe image | Logo/banner/placeholder/non-image accepted | image resolver verdict (RR-061 classes) | Auto |
| False exact on a hard constraint | Stated dealbreaker violated by an exact card | requirement validation states + manual confirm | Semi |

### 5.2 Process gates (program-level; block release/approval, not per-search grades)

Regression-wall failure (any RR-007→RR-068 test red) · patch-audit must-generalize finding · budget ledger exceeded · rubric changed after freeze without version bump. These are release blockers evaluated per run, kept separate from search scoring so a process problem never masquerades as a product-safety statistic.

### 5.3 Quality axis — deduction formula (v0.1-draft; weights freeze at v1.0)

Start at 100; subtract per-metric deductions (one deduction per metric per search, not per instance); floor at 0.

**High-impact metrics (−15 each):**
- Leader coverage below floor (per section 8)
- Duplicate same-canonical-model cards in final (`productVariantFamily` keys)
- Weak-evidence winner (#1 with zero independent citations)
- **Unjustified** low final count — low count first triggers funnel review; the deduction applies only when the funnel shows avoidable loss (e.g., leaders killed by a bug). Honest scarcity — correct rejection of unsafe/wrong products — takes **no deduction** and is logged. Floors that trigger review: <6 final on broad, <3 on constrained.
- Confidence honesty violation (near/unknown presented as exact; 3-state semantics broken)

**Medium-impact metrics (−8 each; ranking scores −4 at scale point 3):**
- Family crowding above cap (>3/7 same family)
- Citation strength below floor (tier mix per `citationStrengthDiagnostic`)
- Ranking sensibility manual score ≤2 (−8) or =3 (−4), on written 1–5 anchors
- Diversity below floor (<4 distinct brands in broad final)
- Repeated conservative false negatives (pattern-level, not single instance)
- Image coverage below floor

**Missing-data policy:** a metric that cannot be measured (e.g., old fixture lacking fields — RR-024) is marked NotScored: no deduction, scorecard flagged incomplete. A search cannot earn an A unless all High-impact metrics were scored; incomplete-High caps the grade at B.

**Manual aggregation:** manual metrics use written anchors defined in the scorecard template; the anchor bands map to the fixed deductions above. No free-form judgment enters the number.

## 6. Release gates (five tiers)

- **Stop-the-run + rollback (if caused by a Phase 6 change):** any per-search safety-axis failure; any wall regression. Rollback protocol: revert behavior changes, keep finding docs, file/update issue, report, ask Taylor.
- **Block release/approval:** process gates (5.2).
- **Manual review required:** final count below floor (must cite the funnel stage evidence before acceptance); leader coverage below floor; ranking score ≤3.
- **Log-only:** weak citations, missing images, conservative false negatives, single-run M4 anomalies.
- **Deferrable:** wording, display, report formatting.

## 7. Live gauntlet design

Trap metrics (page eligibility, price trust, image safety, citation safety, duplicates) are **passive** — scored from the debug envelope on every search. Dedicated batches exist only where the query shape creates the exposure.

| Batch | Purpose / failure exposed | Examples | Mode | Live count before approval |
|---|---|---|---|---|
| B1 Broad mainstream + leader | Leader recall, diversity, form-factor priors (RR-014) | `air fryer`, `cordless stick vacuum`, `27 inch monitor` | M3/M2 + M4 | 5 |
| B2 Budget + hard constraint | False exacts under pressure | `robot vacuum under $300 self-emptying` (fixture exists), `cordless drill with 2 batteries under $150` | M2 validator-layer first, then M4 | 3 |
| B3 Product-type confusion | RR-068/RR-017 class | `shop vac`, `dash cam`, `pressure washer` (fixtures exist) | M2 + M4 | 2 |
| B4 Model/brand identity | Wrong-model evidence, brand ambiguity | one exact-model query, one brand-only query | M1/M2 + M4 | 2 |
| B5 Low-info / over-constrained | Honest-empty behavior, near honesty | vague query; impossible constraint combo | M4 | 2 |
| B6 Subjective category | Consensus-coverage scoring | `dog food`, `running shoes` (fixtures exist) | M3/M2 + M4 | 1 |
| B7 Variance pilot | RR-015 quantification | see section 15 roadmap (6D) | M4 repeated | 6 (own phase) |

**First baseline: all 22 fixtures scored (M3 historical + M2 current-code where validators allow) + 12–15 approved fresh M4 searches.** Rotation: fixed core-10 overlapping fixture categories + ~5 novel per cycle.

## 8. Market-leader coverage method

- **Leaders by evidence rule, not opinion:** a leader = a product appearing in ≥2 independent editorial best-of sources for the category (the `SOURCE_PACKS` publications). 3–5 per core category, compiled into `tests/benchmarks/market-leaders.json` — dated, source-cited, **QA-only, never imported by `lib/`**.
- **Survival funnel:** pool entry → eligibility → citation verification → requirement filter → scoring cutoff → final 7, using existing funnel counts and `finalSelectionTrace` reasons. Every missing leader gets a loss stage; "missing" without attribution is an incomplete finding. The cross-category **loss-stage histogram** is the root-cause radar.
- **Subjective categories** (dog food, running shoes, mattresses): consensus-coverage mode — score whether finals each carry ≥2 editorial citations, instead of matching a named list.
- **Obscure-over-trusted inversion (automatable):** flag when the final #1 has zero editorial citations while a pool candidate with ≥2 was cut below it.
- **Calibration independence:** the baseline sets the **floor** (regression detection). **Targets** are set from product intent in 6F (what a good result should contain), never from current performance. RR-014/RR-015 may only be closed by demonstrated improvement against the floor plus an explained mechanism — not by redefining the bar to match the status quo.
- Snapshots refresh ~quarterly; stale snapshots are labeled and excluded from trend claims.

## 9. Constraint torture method

Constraint dimensions: budget (incl. installment traps), exact size, max dimensions/weight, compatibility, color/material, included accessories, cordless/corded, pet-safe, avoid/dealbreaker terms, brand alternatives ("X or Y"), exact model, unit conversions, compound constraints, over-constrained.

Most constraint logic is testable at M1/M2 by re-filtering saved pools with mutated requirements — **labeled validator-layer evidence**; it proves validation logic, never end-to-end discovery for that query. A small M4 set confirms end-to-end.

| Outcome | Definition | Handling |
|---|---|---|
| False exact | Exact card violates a stated constraint | Hard constraint → safety axis (F). Soft → High deduction |
| False near | Near card violates a dealbreaker | High |
| False negative | Valid product excluded by over-strict validation (RR-055 class) | Medium, logged, dossier material — never "fixed" by ad-hoc gate loosening |
| Acceptable unknown | Evidence absent, labeled unverified | Pass — correct 3-state behavior |

Over-constrained searches are graded on honesty, not volume: an empty exact set with truthful nears is an A; seven fake exacts is an F.

## 10. Regression wall

The wall is an **index plus gap-closure** over the existing 64 test files, not a rebuild.

1. Mapping table in `docs/phase-6-regression-wall.md`: RR-ID (007→068) → mechanism → test file(s) → fixture → last-verified. Known anchors: HP/horsepower → `brandMatching.test.mjs`; prefix/seller/query-param identity → `productEvidenceIdentity.test.mjs`, `productIdentity.test.mjs`; wrong/nearby-model + fallback safety → `sourceQualityUpgrade.test.mjs`; page eligibility → `productEligibility.test.mjs`, `productPageUrl.test.mjs`; prices → `productPriceTrust.test.mjs`, `priceParsing.test.mjs`; images → `productImageResolver.test.mjs`, `productAssets.test.mjs`; traces → `finalSelectionTrace.test.mjs`; duplicates/crowding → `productVariantFamily.test.mjs`, `finalSelectionDiversity.test.mjs`; niche form factor → `formFactor.test.mjs`; shop-vac/floor-cleaner → RR-068 tests in `productTypeMatch`/`productCategory`.
2. Gaps (any RR-ID with no deterministic test) close via **distilled fixtures**: extract the minimal candidate/evidence shape from the untracked live fixture into a small committed fixture backing a wall test.
3. Future recommendation (needs approval): tag wall tests for a `test:wall` slice command; run the wall in every fix run and release-gate run. The wall is M1 by construction — live re-proof is never required for it.

## 11. Live budget and fixture policy

| Run type | Live budget | Approval |
|---|---|---|
| Planning / docs / templates | 0 | — |
| Regression wall / patch audit | 0 | — |
| Variance pilot (6D) | 6 (2 queries × 3 runs) | Pre-approved once |
| Baseline (6E) | 12–15, listed | Explicit list approved before run |
| Fix proof | 1 | Standing; a 2nd call requires asking |
| Affected-slice rerun | ≤3 | Ask |
| Full re-baseline | 12–15 | Ask; only after ~3 fixes or suspected drift |

**Ledger:** every live call logged (date, query, sub-phase, purpose, fixture path) in `docs/phase-6-live-search-batches.md`. Exceeding budget is a process gate.

**Fixture tiers:** (a) full live fixtures — untracked, refreshable raw material (current convention); (b) distilled regression fixtures — minimal, committed, backing wall tests; (c) scorecards/baseline reports — committed measurement record. **Staleness:** schema-stale when lacking current debug fields (RR-024 — expected, degrade gracefully); market-stale after ~60 days for leader-coverage claims. Current-code-vs-history comparisons use the M2 reassessment pattern.

## 12. Product-specific patch audit

1. Enumerate string literals and regex sources in `lib/` (production only).
2. Allowlist zones where names are data: `brandMatching.ts` dictionary, category/form-factor/spec vocabularies, `SOURCE_PACKS`.
3. **Decisive rule:** a brand/model token inside a **conditional or scoring expression** is suspect; the same token inside a **data table consumed by a general mechanism** is acceptable. Generalized data tables may legitimately contain product-family examples.
4. Classify each finding: acceptable general dictionary/source rule · acceptable test/fixture/doc example · suspicious one-off patch · **must-generalize blocker** (process gate; filed in register).
5. Advisory aid only (not a gate, not a committed test): a grep list of known QA-only tokens (WD4522, RPD-411WG, M27Q, A229, XCV11Z, HD0900, VAC1200) to speed manual classification. A committed tripwire test is deliberately **not** part of this plan; reconsider only if actual leakage is ever observed.

## 13. Issue triage and dossiers

- **Critical:** unsafe evidence/attachment, wrong product/model, fake price, unsafe card/citation/image, identity pollution, product-specific production patch, wall regression.
- **High:** missing leaders (attributed), ranking inversion, duplicate flooding, unjustified low final count, repeated false no-exact, shared false-negative logic.
- **Medium:** weak citations, missing images, conservative false negatives, weak metadata, measurement-integrity issues (rubric ambiguity, missing trace fields).
- **Low:** wording, UI, docs, formatting.

Failures group by **pipeline stage × mechanism**, never by product. A **dossier** contains: mechanism statement, qualifying instances per the dossier rule (operating rule 10), affected metrics, suspected shared code path, fail-first test sketch. Dossiers rank by severity × category spread × metric impact. The dossier queue is the only input to fix runs.

## 14. Stop conditions and rollback

Stop immediately when: unsafe evidence attaches; wrong model attaches; suspicious price reaches exact; a non-product page becomes a card; a bad image attaches; a fix would require product-specific production logic; live proof exposes a new Critical; a run would need a second root cause; the live budget would be exceeded; a result count improves only via a weakened trust gate. On stop: roll back behavior changes if any, keep finding docs, open/update the register issue, report root cause, ask Taylor. (This is the proven 5I protocol.)

## 15. Roadmap

| Phase | Goal | Live | Exit criteria |
|---|---|---|---|
| **6A Instrument (draft)** | Rubric **v0.1-draft**, scorecard/report templates, gates, batch definitions, fixture policy; hand-score 2 fixtures; trace-gap list | 0 | Rubric survives hand-scoring real replay output; docs committed; tracking set updated |
| **6B Regression wall** | RR-007→068 mapped or gap-closed | 0 | Wall green; mapping complete |
| **6C Patch audit** | Classify all `lib/` findings | 0 | 0 unresolved blockers |
| **6D Variance pilot** | Quantify RR-015: **2 queries (1 broad + 1 constrained, both with existing fixtures) × 3 runs each**; measure pool/final overlap; derive the provisional delta-significance decision rule | 6 | Rule written; RR-015 updated with pilot data — explicitly **not** closable from the pilot alone |
| **⟶ Rubric freeze v1.0** | Apply hand-scoring + trace-gap + variance learnings; freeze weights, thresholds, decision rule | 0 | v1.0 committed before any baseline spend |
| **6E Baseline** | 22 fixtures (M3 + M2) + 12–15 fresh M4; Baseline Report v1 | 12–15 | Every search graded; ledger current |
| **6F Dossier analysis** | Loss-stage histogram, constraint audit, ranked dossier queue; set targets (independent of current performance) | 0 | Every High/Critical finding dossiered or parked |
| **6G Fix loop** (repeats) | One dossier per run: fail-first → shared fix → wall + full suite → M1/M2 before/after → 1 live proof | 1/run | Dossier metric improves; no safety regression |
| **6H Progress review** | Paired comparison; re-baseline decision; go/no-go | ≤3 | See Definition of Reliable |

**Definition of Reliable (Phase 6 exit):** two consecutive baselines with 0 per-search safety failures across the full corpus; leader final-coverage meets the 6F-set target (not the baseline floor) on the core-10; each carryover (RR-014/015/037/045) closed with improvement evidence or formally reclassified provider-bound with data; wall green; audit clean. On exit, Phase 6 converts to standing cadence (quarterly baseline, wall in every fix run).

## 16. Codex workflows

**Shared contract:** read register + relevant phase-6 docs → declare scope + live budget → work → `npm run typecheck && npm run lint && npm test && node scripts/eval-pipeline.mjs` → update tracking docs + ledger → standard report (verdict, scope confirmation, evidence with mode labels, tests run, live calls spent, docs updated, worktree state, commit hash, next step) → stop.

| Workflow | Scope | Forbidden | Budget | Stop |
|---|---|---|---|---|
| Planning | Docs/templates | Code, live | 0 | Scope growth → ask |
| Finding-only | Observe/score/file via fixtures | Fixes, live | 0 | Critical → file + stop |
| Live baseline | Approved list, save fixtures, score | Fixes, unlisted queries | Approved N | Safety failure → stop batch |
| Regression-wall | Tests + mapping + distilled fixtures | Behavior changes | 0 | Gap needs behavior change → ask |
| Single-root-cause fix | One dossier, fail-first, shared mechanism | 2nd root cause, patches, extra live | 0 (M1/M2 proof) | Product-specific logic or gate-weakening needed → stop |
| Live proof | Confirm one landed fix | New fixes | 1 | New Critical → rollback protocol |
| Release-gate | Read reports, render verdict | Fixing anything | 0 | Any gate red → block |
| Docs-only | Register/docs upkeep | Any code diff | 0 | Code diff → abort |

## 17. Artifacts

| Artifact | Contents |
|---|---|
| `docs/phase-6-reliability-gauntlet-plan.md` | This document — the master plan a fresh session reads first |
| `docs/phase-6-scorecard-template.md` | Rubric (versioned), both axes, deduction formula, debug-field map, grade bands, release-gate tiers, per-search report template, before/after template, variance decision rule, machine-readable scorecard JSON schema |
| `docs/phase-6-live-search-batches.md` | Batches, core-10 + rotation, approved query lists, budget ledger |
| `docs/phase-6-regression-wall.md` | RR-ID → test → fixture mapping, gaps, verification dates |
| `docs/phase-6-market-leader-evaluation.md` | Evidence rule, funnel method, loss-stage attribution, subjectivity policy, refresh policy |
| `docs/phase-6-product-specific-patch-audit.md` | Method + findings table + advisory token list |
| `tests/benchmarks/market-leaders.json` | Dated leader snapshots with editorial citations (QA-only) |

Release gates and the fix-loop template live inside the scorecard doc and this plan respectively (merged deliberately to prevent drift).

## 18. Phase 6A execution prompt

```text
Run Phase 6A only: build the Phase 6 reliability instrument — scoring rubric (v0.1-draft), report templates, release gates, batch definitions, and fixture policy.

This is a documentation and template phase.
Do not run live searches. Do not change app code, app tests, or pipeline behavior. Do not fix issues. Do not create or modify executable scripts — where a script or trace field would help, write it under "Proposed automation (needs approval)". Do not start Phase 6B or later.

Read first:
1. docs/phase-6-reliability-gauntlet-plan.md (the master plan — this governs)
2. docs/RR-Issues-Report.md (expect 68 issues, 0 Open, 4 Needs Investigation; verify)
3. docs/codex-handoff-phased-plan.md (Phase 5 completion records)
4. docs/review-radar-test-memory.md and ReviewRadar-Overview.md
5. Recent entries only of docs/qa-loop-results.md

Inventory before designing (verify counts at run time; expect ~64 test files, ~22 live fixtures):
scripts/qualityScorecard.mjs, scripts/goldBenchmark.mjs, scripts/qualityConsistencyHarness.mjs, scripts/ab-ranking.mjs, scripts/replay-quality-fixtures.mjs, scripts/save-debug-fixture.mjs, scripts/eval-pipeline.mjs, scripts/citationStrengthDiagnostic.mjs, tests/fixtures/review-radar-live/. Document what each measures and which debug-envelope fields exist. The rubric must be the documented contract these tools implement or will be extended to implement — do not design a parallel system.

Create exactly:
1. docs/phase-6-scorecard-template.md — rubric v0.1-draft implementing plan section 5 exactly: safety axis (per-search, binary), process gates (separate), quality axis with the defined deduction formula (High −15, Medium −8, ranking=3 −4, one deduction per metric, floor 0), missing-data policy (NotScored; incomplete-High caps at B), manual anchors written out for ranking sensibility (1–5), grade bands (F on safety; A ≥90 / B ≥75 / C ≥60 / D <60), evidence-mode labels (M1–M4) on every metric, per-search report template, before/after template, and a machine-readable scorecard JSON schema. Mark every threshold "provisional until v1.0 freeze after 6D".
2. docs/phase-6-live-search-batches.md — the seven batches from plan section 7 with purpose, examples, exposed failure, key metrics, evidence modes, and per-batch approval counts; core-10 fixed set overlapping existing fixture categories; rotation policy; the variance-pilot design (2 queries × 3 runs, one broad + one constrained, both with existing fixtures); budget ledger initialized at 0.

Then validate the instrument: hand-apply the rubric to TWO saved fixtures (tests/fixtures/review-radar-live/shop-vac.json and gas-grill.json) using npm run qa:replay output only. Label every scored metric with its evidence mode (M2 or M3 — state which and why). Include both completed scorecards as worked examples in the scorecard doc. If a metric cannot be measured from real replay output, revise the draft rubric now and record the change. List missing debug fields under "Proposed trace additions (needs approval)".

Verify nothing changed: npm run typecheck, npm run lint, npm test, node scripts/eval-pipeline.mjs — all green.

Update the standard tracking set: docs/RR-Issues-Report.md (planning-only entry; no new issues expected — record that), docs/qa-loop-results.md (QA log entry), docs/agent-next-task.md (next: Phase 6B regression wall, only after explicit instruction), docs/change-log.md, docs/Agent Run Summary.md, docs/codex-handoff-phased-plan.md (Phase 6A completion record). Do not update ReviewRadar-Overview.md or docs/review-radar-test-memory.md unless a convention genuinely requires it — no behavior changed.

Commit docs-only.

Stop conditions: any app-code diff → abort and report; rubric needs nonexistent trace fields → document, do not implement; pressure to start 6B → stop.

Final report: files created; rubric summary; both sample scorecards with mode labels; proposed-automation list; confirmation of no live searches, no behavior change, no fixes; tracking docs updated; worktree state; commit hash; recommended next step.
```

## 19. Risks and assumptions

- **Variance may be provider-inherent.** If the 6D pilot shows instability lives in Serper/LLM nondeterminism, RR-015 gets managed (paired designs, repeat sampling) rather than fixed; the plan survives that outcome. The pilot is explicitly a pilot — system-wide stability claims need more than 2×3 runs.
- **Some safety metrics may need trace fields that do not exist yet** (final-URL re-classification verdicts, image-validator verdicts in the envelope). 6A surfaces them as proposals; implementing them is a behavior-adjacent change needing approval.
- **Leader snapshots decay** (~quarterly) and editorial sources carry bias; the ≥2-source rule and dated snapshots mitigate, not eliminate.
- **Manual bandwidth:** Taylor is the only reviewer. Full manual passes apply only to safety flags and D/F grades; elsewhere, 2-exact spot-checks per search.
- **RR-024 by design:** fixture scoring will hit missing-field gaps; expected, handled by the NotScored policy.
- **Cost creep** is bounded by per-run budgets plus the ledger; the historical failure mode (live variance eating budget while hiding root causes) is countered by the measurement ladder.

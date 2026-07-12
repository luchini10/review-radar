# Market-Leader Evaluation Method and Dated Leader Snapshots

**Snapshot version:** `leaders-v2026-07` (frozen 2026-07-12, Taylor-approved)
**Owner:** Phase 6 freeze-point deliverable per
`docs/phase-6-reliability-gauntlet-plan.md` section 7; QA-only data, never
production logic (core rule 1).
**Review cadence:** quarterly, or when a category's market visibly shifts.
External editorial refresh research is separate from ReviewRadar live-search
API spending and must be scoped, cited, and approved.

## 1. Method

1. **Seed source.** Leader sets are seeded from the static benchmark
   definitions in `scripts/goldBenchmark.mjs` (M1 reference data: brand +
   line tokens per query shape), cross-checked against editorial evidence
   already captured in saved fixtures (best-of titles/snippets in the R2 and
   R4 ledgers). No live calls are required to compile or refresh a snapshot
   from these sources.
2. **Matching rule.** A leader counts as PRESENT in a result set when any
   displayed final card name (exact + near) contains the leader's brand token
   OR any of its line tokens, case-insensitively. Line tokens exist precisely
   because retailer titles sometimes omit the brand (e.g. a RIDGID NXT titled
   only `14 Gallon 6.0 Peak HP NXT Wet Dry Vac HD1400`).
3. **Scoring.** Per run: `final recall = leaders present in displayed cards /
   snapshot size`; `pool recall` uses the candidate pool instead. Sample
   claims use the mean across all usable cache-cold runs of a shape — never
   the best run (the historical `qualityScorecard.mjs` best-run convention is
   not the Phase 6 statistic).
4. **Versioning.** Snapshots are dated and immutable; a revision creates a new
   version and results are never compared across snapshot versions.

## 2. Dated snapshots (leaders-v2026-07)

### Shape A — broad `shop vac` (7 leaders)

| Leader | Line tokens |
|---|---|
| RIDGID | nxt, wd, hd |
| Vacmaster | — |
| CRAFTSMAN | — |
| DeWALT | — |
| Stanley | — |
| Shop-Vac (brand) | — |
| Milwaukee | — |

### Shape B — constrained `robot vacuum / under $300 / self-emptying` (4 leaders)

| Leader | Line tokens |
|---|---|
| Shark | matrix, ai |
| eufy | clean, x8, self |
| Roborock | q5 |
| iRobot Roomba | i3, i4 |

Acceptable alternates and wrong-type terms remain as defined in
`scripts/goldBenchmark.mjs` (`broad-shop-vac`,
`con-robot-vac-300-selfempty`).

## 3. Initial baseline recall (M3, scored 2026-07-12 against the six R4 after-sample fixtures)

| Run | Final cards | Final leader recall |
|---|---|---|
| shop-vac r4-after-run1 | 1 | 1/7 (RIDGID) |
| shop-vac r4-after-run2 | 6 | 2/7 (RIDGID, DeWALT) |
| shop-vac r4-after-run3 | 4 | 1/7 (RIDGID via NXT/HD1400 line tokens; brand absent from title) |
| **Shape A mean** | | **1.33/7 (19%)** |
| robot-vac r4-after-run1 | 5 | 3/4 (Shark, Roborock, Roomba) |
| robot-vac r4-after-run2 | 5 | 2/4 (Roborock, Roomba) |
| robot-vac r4-after-run3 | 6 | 4/4 |
| **Shape B mean** | | **3.0/4 (75%)** |

Observations recorded with the baseline: shop-vac run1 displayed a single
final card; shop-vac runs 2-3 are dominated by near-duplicate Bissell Garage
Pro variants (one of them a brand/collection-style title), which is RR-060/R5
territory; the constrained shape already performs near target after R4.

## 4. v1.0 leader-quality targets (approved independently of baseline)

- Shape A (broad): final recall ≥ 3/7 per-run mean; pool recall ≥ 5/7.
- Shape B (constrained): final recall ≥ 3/4 per-run mean.
- Targets are floors for declaring reliability, not grounds to redefine
  "reliable" downward if missed (master plan section 7).

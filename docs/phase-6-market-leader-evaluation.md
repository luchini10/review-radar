# Market-Leader Evaluation Method and Dated Leader Snapshots

**Mechanics version:** `leaders-v2026-07b` (owner-delegated re-freeze 2026-07-12)
**Evidence status:** matching/scoring mechanics frozen; broad shop-vac list
reviewed against current independent tests and retailer demand signals
**Supersedes:** `leaders-v2026-07a` (same day) — see section 5. Results are
never compared across snapshot versions.
**Owner:** Phase 6 freeze-point deliverable per
`docs/phase-6-reliability-gauntlet-plan.md` section 7; QA-only data, never
production logic (core rule 1).
**Review cadence:** quarterly, or when a category's market visibly shifts.
External editorial refresh research is separate from ReviewRadar live-search
API spending and must be scoped, cited, and approved.

## 1. Matching contract (frozen, single implementation)

A product name covers a leader **iff it contains every brand token AND (the
leader defines no lines, or at least one line/model token)**. This is the
`coversLeader()` export in `scripts/goldBenchmark.mjs` — the one shared
implementation now used by `scripts/qualityScorecard.mjs` and by snapshot
scoring, and pinned by `tests/leaderSnapshot.test.mjs` (broad tokens such as
`self`/`ai` can never count without their brand; a Roborock Q10 does not
cover a `q5`-line leader). Both ends of every normalized phrase are retained,
so `ai` cannot match `Airtok` and `q5` cannot match `Q50`.

**Known undercount (accepted):** retailer titles sometimes omit the brand
(real capture: `14 Gallon 6.0 Peak HP NXT Wet Dry Vac HD1400`, a RIDGID). The
contract requires the brand, so such cards score as misses. This biases
recall DOWN, never up, and is pinned by test.

**Scoring:** per run, `final recall = leaders covered in displayed final
cards / snapshot size`; sample claims use the mean across all usable
cache-cold runs of a shape, never the best run.

## 2. Leader lists

Taylor's authorization is recorded verbatim: **"do whatever you think is best
with the broad shop vac leaders."** Codex used that delegated judgment to
review the broad list against current independent comparative tests and retailer
demand signals. The resulting `leaders-v2026-07b` snapshot replaces Milwaukee
with Workshop in the seven core leaders and retains Milwaukee as an acceptable
alternate. The first live readiness-gate sample under this list is the first
canonical North-Star baseline; observations under `leaders-v2026-07a` remain
historical and are not comparable.

Current review sources (accessed 2026-07-12): [Lowe's best sellers](https://www.lowes.com/best-sellers/tools/shop-vacuums-accessories/shop-vacuums/4294857472),
[Vacuum Wars' 6.5 HP comparison](https://vacuumwars.com/best-shop-vac-6-5-hp/),
and [TechGearLab's tested shop vacs](https://www.techgearlab.com/topics/floor-cleaning/best-shop-vac).
These sources collectively support the first six brands and give Workshop
stronger evidence as a mainstream corded shop-vac competitor than Milwaukee,
whose strongest position is the cordless/niche segment.

### Shape A — broad `shop vac` (7 leaders)

| Leader | Line tokens | Captured mention (fixture :: title) |
|---|---|---|
| RIDGID | nxt, wd, hd | shop-vac.ledger-run1 :: "14 Gallon 6.0 Peak HP NXT Wet Dry Vac HD1400 \| RIDGID Tools" |
| Vacmaster | — | shop-vac.ledger-run1 :: "Armor All 2.5-Gallon* 2 Peak HP† Wet/Dry Vac - Vacmaster.com" — domain mention only; not validated Vacmaster product identity |
| CRAFTSMAN | — | shop-vac.ledger-run1 :: "Watch Craftsman Shop Vac UNBOXING! on Amazon Live" |
| DeWALT | — | shop-vac.ledger-run1 :: "DeWalt Stealthsonic Quiet 6 Gallon Wet/Dry Shop Vacuum DXV06PL-QT" |
| Stanley | — | shop-vac.ledger-run1 :: "Stanley Wet/Dry Vacuum SL18116P" |
| Shop-Vac (brand) | — | shop-vac.ledger-run1 :: "Shop vac not working right : r/Tools - Reddit" — generic category phrase; not validated Shop-Vac brand identity |
| Workshop | — | Current independent 6.5 HP comparative testing; first canonical live presence measurement occurs in the readiness gate |

**Acceptable alternates:** Armor All; Milwaukee.

### Shape B — constrained `robot vacuum / under $300 / self-emptying` (4 leaders)

| Leader | Line tokens | Captured-presence citation |
|---|---|---|
| Shark | matrix, ai | rv-...ledger-run1 :: "Shark Matrix Plus 2in1 Robot Vacuum & Mop RV2610WA" |
| eufy | clean, x8, self | rv-...ledger-run1 :: "eufy RoboVac 11S MAX Self-Charging Robotic Vacuum" |
| Roborock | q5 | rv-...ledger-run1 :: "To buy Q5 pro with or without auto-empty station? : r/Roborock - Reddit" |
| iRobot Roomba | i3, i4 | rv-...ledger-run1 :: "iRobot Roomba i3+ EVO Self-Emptying Robot Vacuum" |

**Staleness note (material):** the constrained line lists predate the models
the July-2026 runs actually surfaced (Roomba 105, Roborock Q10 VFS+, eufy
C10, Shark IQ 2-in-1). Under the frozen contract those cards are correctly
NOT counted as the listed leaders — which is exactly why constrained recall
below is low and why the lists need human review before constrained recall
can carry meaning.

### Prospective `leaders-v2026-07c` proposal — not frozen

C1 tested a prospective matcher without changing current `coversLeader()` or
retro-scoring `07b`: a letters-only line may also match exactly that prefix
followed by digits (`hd` → `HD1400`, `wd` → `WD4070`); a digit-ending line
remains whole-token strict (`q5` does not match `Q50`), and unrelated word
prefixes stay strict (`ai` does not match `Airtok`). The two valid broad gate
runs remain **1/7 and 1/7** under that prospective rule, so it does not explain
or cure the failed normalization gate.

Current July-2026 manufacturer pages and independent testing support this
proposed constrained refresh: Shark `matrix`/`ai`/`iq`; eufy `c10`/`clean`/
`x8`; Roborock `q5`/`q10`; Roomba `105`/`i3`/`i4`/`i5`. Remove eufy's generic
feature token `self`, which is not a stable product family. Evidence reviewed:
[Shark Matrix RV2310AE](https://www.sharkclean.com/products/shark-matrix-self-empty-robot-vacuum-zidRV2310AE),
[eufy C10](https://www.eufy.com/products/t2292111),
[Roborock Q10 series](https://us.roborock.com/pages/roborock-q10-series),
[Roomba 105 series](https://www.irobot.com/en_US/roomba-105-combo-series-robots/Roomba-105-Combo-Series-Robots.html),
[Roomba i5+](https://www.irobot.com/en_US/roomba-i5plus-self-emptying-robot-vacuum/I555020.html),
[Vacuum Wars budget ranking](https://vacuumwars.com/best-budget-robot-vacuum/),
and [RTINGS budget testing](https://www.rtings.com/robot-vacuum/reviews/best/budget).
This is a proposal only. Taylor must accept or revise it before a corrective
`07c` freeze; any revision starts a new incomparable baseline.

## 3. Provisional recall observation (recomputed 2026-07-12 under `coversLeader`, M3, six R4 after-sample fixtures)

| Run | Final recall |
|---|---|
| shop-vac r4-after-run1 | 1/7 (RIDGID) |
| shop-vac r4-after-run2 | 2/7 (RIDGID, DeWALT) |
| shop-vac r4-after-run3 | 0/7 (contains an unbranded RIDGID NXT — recorded undercount) |
| **Shape A mean** | **1.0/7 (14%)** |
| robot-vac r4-after-run1 | 0/4 |
| robot-vac r4-after-run2 | 0/4 |
| robot-vac r4-after-run3 | 1/4 (eufy) |
| **Shape B mean** | **0.33/4 — informational only (see section 4 and staleness note)** |

Context recorded with the baseline: shop-vac run1 displayed a single final
card; runs 2–3 were dominated by near-duplicate Bissell variants (RR-060/R5
territory, fixed 2026-07-12); the constrained shape's low number reflects
stale draft line lists at least as much as pipeline recall.

These values are reproducible under the frozen matcher but are historical,
non-canonical observations under `leaders-v2026-07a`. Taylor delegated the
broad-list judgment for the `leaders-v2026-07b` re-freeze; the later whole-token
correction for RR-082 does not change the historical six values.

## 4. v1.0 targets (amended)

- Shape A (broad): final recall ≥ 3/7 per-run mean; pool recall ≥ 5/7 —
  approved floors, binding against `leaders-v2026-07b`.
- Shape B (constrained): **no leader-recall target.** Per
  `scripts/qualityScorecard.mjs`, constrained shapes are judged primarily on
  constraint satisfaction; constrained leader recall is measured and reported
  as INFORMATIONAL only.
- Targets are floors for declaring reliability, not grounds to redefine
  "reliable" downward (master plan section 7).

## 5. Supersession record — what v2026-07 got wrong (corrected same day)

The initial freeze (commit `6fb1eac`) stated a brand-OR-line matching rule
that contradicted its own seed's contract (`goldBenchmark.mjs`: brand AND
line), scored the baseline with a third, brand-only implementation, published
one hand-adjusted value, set a constrained leader-recall target that silently
changed the scorecard's constrained-shape contract, and presented draft-
seeded lists as dated market truth. Its published baselines (broad 1.33/7,
constrained 3.0/4) are void and must not be compared against. Identified in
adversarial review (agent dialogue; Codex), corrected here as
`leaders-v2026-07a` via corrective commit rather than history rewrite.

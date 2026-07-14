# Market-Leader Evaluation Method and Dated Leader Snapshots

**Mechanics version:** `leaders-v2026-07c` (Taylor ratified 2026-07-14)
**Evidence status:** frozen mechanics/lists; C4 safety-stopped after 4/6 runs
**Supersedes:** `leaders-v2026-07b` — see sections 3 and 5. Results are
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
so `ai` cannot match `Airtok` and `q5` cannot match `Q50`. Under `07c`, a
letters-only model-family token may match the same letters immediately followed
by digits (`hd` → `HD1400`); digit-ending lines remain whole-token strict.

**Known undercount (accepted):** retailer titles sometimes omit the brand
(real capture: `14 Gallon 6.0 Peak HP NXT Wet Dry Vac HD1400`, a RIDGID). The
title-only contract requires the brand, so such cards score as misses. C4 also
reports a separate deterministic count using bounded provider URL paths; it
never uses hostnames/query strings and never silently hand-adjusts title-only
coverage.

**Scoring:** per run, `final recall = leaders covered in displayed final
cards / snapshot size`; sample claims use the mean across all usable
cache-cold runs of a shape, never the best run.

## 2. Leader lists

Taylor's authorization is recorded verbatim: **"do whatever you think is best
with the broad shop vac leaders."** Codex used that delegated judgment to
review the broad list against current independent comparative tests and retailer
demand signals. The resulting broad list replaces Milwaukee
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
| Shark | matrix, ai, iq | rv-...ledger-run1 :: "Shark Matrix Plus 2in1 Robot Vacuum & Mop RV2610WA" |
| eufy | c10, clean, x8 | current manufacturer C10 page plus captured eufy mentions |
| Roborock | q5, q10 | captured Q5 mention plus current Q10 manufacturer series |
| iRobot Roomba | 105, i3, i4, i5 | captured i3+ plus current 105/i5 manufacturer pages |

The generic eufy feature token `self` is removed because it is not a stable
product family. Constrained recall remains informational; these families are
frozen so the C4 safety sample has a stable denominator, not as a claim that
every listed model is currently available below the request budget.

### `leaders-v2026-07c` ratification

C1 first tested the matcher without retro-scoring `07b`: a letters-only line
may also match exactly that prefix
followed by digits (`hd` → `HD1400`, `wd` → `WD4070`); a digit-ending line
remains whole-token strict (`q5` does not match `Q50`), and unrelated word
prefixes stay strict (`ai` does not match `Airtok`). The two valid broad gate
runs remain **1/7 and 1/7** under that rule, so it does not explain
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
Taylor ratified this list and matching contract exactly as documented on
2026-07-14, before any C4 live request. Any later revision requires a new
snapshot and starts a new incomparable baseline.

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

### C4 observation (M2, 2026-07-14, incomplete by safety rule)

For the broad runs, the `Raw presence` column below is preserved as the value
reported at C4 closeout, but C5 found that its path-supplemented matcher was not
product-type safe. The broad values are superseded by the C5 correction
immediately below and must not be used as the canonical provider-identity
baseline. C5 did not re-score the single constrained run's raw identities.

| Run | Raw presence | Normalized pool | Flag-on final |
|---|---:|---:|---:|
| shop-vac c4-07c-run1 | 7/7 | 1/7 | 2/7 |
| shop-vac c4-07c-run2 | 7/7 | 1/7 | 1/7 |
| shop-vac c4-07c-run3 | 7/7 | 2/7 | 1/7 |
| **Shape A mean** | **7.0/7** | **1.33/7** | **1.33/7** |
| robot-vac c4-07c-run1 | 4/4 | 1/4 | 1/4 |
| **Shape B mean** | **4.0/4** | **1.0/4** | **1.0/4 — informational only** |

All four fixtures are exact-contract, cache-cold, commit-pinned, balanced, and
below the 120-attempt ceiling. The first constrained run rendered a foreign-
model image and triggered the mandatory RR-061 stop, so B2/B3 were never
dispatched and constrained stability is NotScored. The complete broad shape
still fails both frozen floors without any rounding or threshold revision.
Same-response flag-off/flag-on normalized coverage was identical and
normalization recovery added no leader coverage. C5 later proved that the
`7/7` raw-presence interpretation overstated what Serper found as type-safe
product identities.

### C5 correction and feasibility bound (M3 over C4 fixtures, 2026-07-14)

C4's path-supplemented raw matcher credited `Workshop` from another product's
Amazon path in A1/A3 and credited `WORKSHOP Wet/Dry Vacs Blower Nozzle Vacuum
Attachment WS25006A` in A2. Neither is a safe WORKSHOP shop-vac identity. The
corrected measure requires a structured Google Shopping product identifier, a
specific source title, and product-type eligibility. It remains an upper bound:
an identity lead is non-renderable until it resolves to a product page with
exact-model/type compatibility and survives the existing cheap prefilter.

| Run | Type-safe identity-lead upper bound | Safe materialization captured anywhere in request |
|---|---:|---:|
| shop-vac c4-07c-run1 | 6/7 | 2/7 |
| shop-vac c4-07c-run2 | 6/7 | 2/7 |
| shop-vac c4-07c-run3 | 6/7 | 4/7 |
| **Shape A mean** | **6.0/7** | **2.67/7** |

The `6/7` ceiling clears the `5/7` discovery prerequisite, so the provider
identity stream remains worth investigating. The `2.67/7` captured result does
not prove a resolver would fail: the saved digests omit full raw provider
fields and did not dispatch targeted resolution lookups for discarded
identities. It instead proves that a new lookup is necessary to answer the
question.

That lookup is not yet safe to run. The current product-page selector accepts
a deterministic wrong-brand page when same-category/spec words overlap, and
the current type gate accepts three standalone complement identities. C5 found
143 qualified lead rows with at least one captured page demonstrating the
selector's potential mismatch; those are diagnostic possible pairings, not
143 observed attachments. RR-085/RR-086/RR-087 must be repaired before a live
resolution-feasibility probe. The frozen `5/7` pool and `3/7` final floors are
unchanged.

### Post-C5 trust-boundary repair (M3 over C4 fixtures, 2026-07-14)

Commit `1131101` repairs the page-identity and complement gates. The analyzer's
canonical provider-discovery field is now
`identityResolution.recall.identityLeadUpperBound`; the old path-supplemented
raw field remains visible only as superseded funnel history. Current-code
replay produces the following decision inputs:

| Measure | Current result |
|---|---:|
| Canonical type-safe identity ceiling | 6/7 mean |
| Captured safe materialization | 2.67/7 mean |
| Product-page selector identity gaps | 0 |
| Shared complement-type gaps | 0 |

The materialization values remain `2/7`, `2/7`, and `4/7`; no targeted lookup
was present in the saved requests, so unresolved identity leads remain
NotScored. The machine verdict is now `needs_live_resolution_probe`. The frozen
`5/7` pool and `3/7` final floors are unchanged, and no probe or implementation
is authorized by this offline replay.

## 4. v1.0 targets (amended)

- Shape A (broad): final recall ≥ 3/7 per-run mean; pool recall ≥ 5/7 —
  approved floors, binding against `leaders-v2026-07c`.
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

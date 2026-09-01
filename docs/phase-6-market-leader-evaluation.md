# Market-Leader Evaluation Method and Dated Leader Snapshots

**Mechanics version:** `leaders-v2026-09a` (PR-13 prerequisite freeze,
2026-09-01)
**Evidence status:** eight-case PR-13 registry frozen before market-scout or
quality-ranking behavior; earlier C4 history remains safety-stopped after 4/6
runs
**Supersedes:** `leaders-v2026-07c` for PR-13 before/after evaluation only.
Historical results are never compared across snapshot versions.
**Owner:** Phase 6 freeze-point deliverable per
`docs/phase-6-reliability-gauntlet-plan.md` section 7; QA-only data, never
production logic (core rule 1).
**Review cadence:** quarterly, or when a category's market visibly shifts.
External editorial refresh research is separate from ReviewRadar live-search
API spending and must be scoped, cited, and approved.

## 0. PR-13 dated exact-leader registry (`leaders-v2026-09a`)

The machine-readable freeze is
`tests/benchmarks/pr13-market-leaders-v2026-09a.json`. It was created on
2026-09-01 before any PR-13 market-scout or quality-ranking behavior. The
registry is QA-only and must never become a production seed list, prompt input,
or deterministic boost.

Each registered leader has two current, independent evidence domains and at
least one comparative test source. For subjective categories, both sources
must support the same exact product line and configuration. A card covers a
leader only when its stable model identity matches the registered model or a
listed exact alias. Brand-only matches, sibling models, and configuration
transfer are misses.

| QA case | Frozen exact leader | Independent evidence |
|---|---|---|
| 14-cup programmable coffee maker under $150 | Cuisinart DCC-3200 | [Consumer Reports lab record](https://www.consumerreports.org/appliances/coffee-makers/cuisinart-perfectemp-14-cup-programmable-dcc-3200/m387328/); [Bean & Burr review](https://beanandburr.com/coffee-makers/cuisinart-coffee-maker-review) |
| self-emptying robot vacuum under $300 | Dreame D10 Plus Gen 2 | [Tom's Guide budget comparison](https://www.tomsguide.com/best-picks/best-cheap-robot-vacuums); [TechGearLab tested review](https://www.techgearlab.com/reviews/smart-home/robot-vacuum/dreame-d10-plus-gen-2) |
| 27-inch 1440p 144Hz+ gaming monitor under $300 | AOC Q27G3XMN | [RTINGS comparison](https://www.rtings.com/monitor/reviews/best/1440p-144hz); [Reviewed test](https://www.reviewed.com/gaming/content/aoc-q27g3xmn-review) |
| wet/dry shop vacuum under $200 | Craftsman CMXEVBE17595 | [TechGearLab comparison](https://www.techgearlab.com/topics/floor-cleaning/best-shop-vac); [Vacuum Wars 6.5 HP comparison](https://vacuumwars.com/best-shop-vac-6-5-hp/) |
| 2,000+ PSI pressure washer under $300 | Westinghouse WPX3200e | [Consumer Reports lab record](https://www.consumerreports.org/home-garden/pressure-washers/westinghouse-wpx3200e/m409196/); [SpruceRank under-$300 comparison](https://sprucerank.com/best-electric-pressure-washer-under-300/) |
| brushless cordless drill kit under $200 | DeWalt DCD800D2 | [Consumer Reports lab record](https://www.consumerreports.org/home-garden/cordless-drills-impact-drivers/dewalt-dcd800d2/m408601/); [Pro Tool Reviews DCD800/DCD805 test](https://www.protoolreviews.com/dewalt-dcd805-20v-hammer-drill-driver-review/) |
| laptop with 16 GB RAM and 512 GB SSD under $900 | Dell XPS 13 (2026), 16 GB/512 GB | [WIRED review](https://www.wired.com/review/dell-xps-13-2026/); [Tom's Hardware comparative testing](https://www.tomshardware.com/laptops/dell-xps-13-2026-review) |
| 400+ CFM cordless leaf blower kit under $250 | Greenworks BL60L512 | [Consumer Reports results reported by Quartz](https://qz.com/leaf-blowers-ranked-by-type-consumer-reports); [OPE Reviews measured test](https://opereviews.com/greenworks-pro-60v-700-cfm-blower-review-bl60l512/) |

The snapshot does not hard-code price or availability. A run is leader-eligible
only when at least one registered exact leader independently has a current,
new-condition US offer at or below that case's budget and satisfies every hard
request constraint at run time. If no leader is eligible, the run is excluded
from leader-recall denominator rather than counted as a pass or failure. The
application's own returned price and availability still have to pass their
normal authority gates; editorial evidence can never make a product buyable.

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

### C5 live resolution-feasibility probe (M2, 2026-07-14)

Taylor approved eight logical searches with an eight-physical-attempt planning
basis and a hard 24-attempt ceiling. Commit `53c193b` ran one cache-cold probe
against the three hash-pinned C4 broad fixtures. The ledger reconciles exactly:
8 logical searches = 0 cache hits + 8 cache misses = 8 physical attempts, with
0 retries/fallbacks and no guard trip.

| Run | Captured baseline | Safely resolved leaders | Projected materialization |
|---|---:|---|---:|
| shop-vac c4-07c-run1 | 2/7 | RIDGID, Craftsman, Stanley | 5/7 |
| shop-vac c4-07c-run2 | 2/7 | RIDGID, Craftsman, Stanley | 5/7 |
| shop-vac c4-07c-run3 | 4/7 | Craftsman | 5/7 |
| **Shape A mean** | **2.67/7** | — | **5.0/7** |

RIDGID HD1200, Craftsman CMXEVBE17584, and Stanley SL18115 each have accepted
exact-model pages. The generic Vacmaster lead did not resolve: the returned
pages asserted more specific variants and the repaired selector rejected them.
Shopping produced 132 raw results but zero normalized candidates. Organic
product-page searches produced 40 raw results, 22 normalized candidates, and
all accepted pages.

**Decision:** the probe passes the frozen `5/7` pool feasibility floor exactly,
with no margin. It supports a later default-off, organic-only bounded resolver
implementation. It does not measure final recall, stability, images, prices,
citations, constraints, or full-request cost/latency and therefore does not by
itself satisfy R7A/R7B acceptance. The live fixture remains untracked at
`tests/fixtures/review-radar-live/shop-vac.c5-resolution-probe.json` (SHA-256
`0089CE6F1F2150D84933AC28C441AAC7EBA421719905433C7F2C047AEE588CBF`).

### C5 flag-on live validation (M2, 2026-07-14)

Taylor approved six requests with 510 physical attempts as the planning basis
and a hard 120-attempt per-request ceiling. Instrument commit `793eb4e` pins
the exact broad/constrained request bytes and C5 flag contract. The first broad
request is spent/excluded because it ran under `npm start`; production mode
intentionally suppresses the local debug ledger, so it cannot enter quality
means and its physical spend is unknown. The remaining five requests are
usable, cache-cold, balanced, and commit-pinned. No replacement was dispatched.

| Run | Pool recall | Final recall | Physical attempts | C5 final selections | Duration |
|---|---:|---:|---:|---:|---:|
| shop-vac c5 run1 | Excluded | Excluded | Unknown | NotScored | 99.0 s |
| shop-vac c5 run2 | 4/7 | 1/7 | 83 (1 retry) | 0 | 107.3 s |
| shop-vac c5 run3 | 5/7 | 3/7 | 71 | 0 | 77.9 s |
| constrained c5 run1 | 3/4 | 3/4 | 76 | 2 | 88.2 s |
| constrained c5 run2 | 2/4 | 3/4 | 81 (1 retry) | 2 | 111.9 s |
| constrained c5 run3 | 3/4 | 3/4 | 87 | 1 | 92.8 s |
| **Usable mean/total** | **broad 4.5/7; constrained 2.67/4** | **broad 2.0/7; constrained 3.0/4** | **398 known** | **5** | **95.6 s mean** |

Broad pool/final pairwise Jaccard is `0.3889`/`0.0000` from only two usable
runs. Constrained pool/final mean pairwise Jaccard is `0.2566`/`0.0513` across
three runs. Historical C4 broad pool/final means were `1.33/7`/`1.33/7`, but
that flag-off sample is context rather than a same-provider causal control.
C5's own ledger lineage is the causal contribution measure: 243 identity plans
became 20 dispatched and 223 cap-culled queries, producing 79 normalized rows,
67 unique candidates, and five displayed selections. All five displayed
selections occurred in constrained runs; merchant recovery contributed zero
candidates.

The exact C5 organic outbound queries were:

| Run | Queries sent |
|---|---|
| shop-vac run2 | `Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200 product page`<br>`DeWalt Stealthsonic Quiet 6 Gallon Wet/Dry Shop Vacuum DXV06PL-QT product page`<br>`Shop-Vac 12-Gallon 5.5 HP Corded Wet/Dry Shop Vacuum SV5430188 product page`<br>`Shop-Vac 4 Gallon 5.5 HP SVX2 Wet Dry Vacuum ESLSQ550 5914411 product page` |
| shop-vac run3 | `Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200 product page`<br>`Craftsman 6 Gallon 3.5 Peak HP Wet/Dry Shop Vacuum CMXEVBE17584 product page`<br>`Ridgid 6 Gallon NXT Wet/Dry Shop Vacuum HD06001 product page`<br>`DeWalt Stealthsonic Quiet 6 Gallon Wet/Dry Shop Vacuum DXV06PL-QT product page` |
| constrained run1 | `Shark Navigator Robot Vacuum RV2100 product page`<br>`Shark Navigator Robot Vacuum RV2100ae product page`<br>`Onson BR151 Robot Vacuum Mop Combo product page`<br>`TP-Link Tapo Robot Vacuum Cleaner RV30 Max product page` |
| constrained run2 | `Shark Matrix Self-Emptying Robot Vacuum RV2310AE product page`<br>`Shark Navigator Robot Vacuum RV2100 product page`<br>`TP-Link Tapo RV30 Max Plus Self-Emptying Robot Vacuum and Mop product page`<br>`Shark Navigator Robot Vacuum RV2100ae product page` |
| constrained run3 | `Shark Navigator Robot Vacuum RV2100 product page`<br>`Shark Navigator Robot Vacuum RV2100ae product page`<br>`TP-Link Tapo RV30 Max Plus Self-Emptying Robot Vacuum and Mop product page`<br>`Onson BR151 Robot Vacuum Mop Combo product page` |

Safety fails independently of recall. Constrained run1 admitted the C5-sourced
Matter Alpha page `Tapo RV30 Max Information, Specification, News & More` as an
exact `buyable_product` with a `$193.42` price and only one weak citation,
reopening RR-078. The same response displayed a `Roborock Q7 M5+` card whose
primary/canonical URL identifies `Q10 X5+`, while its image identifies Q7 M5;
RR-090 records that distinct downstream metadata-attachment defect. Exact hard-
constraint failures, duplicate exact-model final pairs, false accessory
collapses, malformed queries, and RR-061-class image regressions were zero.

Fixture SHA-256 values:

- excluded shop-vac run1: `efc79e27547f2e46f479dcf0ca45d2e41a57d2767e2653a673694b0a37f136db`
- usable shop-vac run2: `200cde6cce47e2bfe9e01318070992b96c363e2dd50fa3ccea917634d9d3e2bd`
- usable shop-vac run3: `abc9b75b99d84a726f51aa94196f09570af36c53338c53882e50682a70dd7a99`
- usable constrained run1: `6774d5f8b7c26ac4e9c160003beb131c826bf2bb460adb9276ef517e56a4e297`
- usable constrained run2: `a53de94963a1ecdd4b1aafbbf5581bac8e42f59ca0a45bc35dede143117d6ce6`
- usable constrained run3: `58b0d846693ec17028d5d9b3d74d1d471c171a790f73e194f17e41dfa569345e`

**Decision:** do not promote. The broad sample misses both frozen floors and is
incomplete, while one C5 resolution page directly violates the product-card
eligibility trust boundary. Both recovery flags remain default-off and R7A
remains blocked. The next useful evidence is zero-live fail-first diagnosis and
generalized repair of RR-078/RR-090; another live window is premature.

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

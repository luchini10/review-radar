# Phase 6D Variance Pilot

**Date:** 2026-07-02 through 2026-07-10
**Mode:** M4 repeated live sampling, measurement-only  
**Rubric:** `v0.1-draft`, not frozen  
**Verdict:** **ROADMAP R2 RESTART STOPPED AT 4/6 ON RR-061 WRONG-MODEL IMAGES**

**Post-stop update:** RR-069 was fixed deterministically in a separate narrow
mini-phase. Taylor approved a new clean six-call post-fix restart on 2026-07-02.
The four observations below remain RR-069 discovery evidence, are excluded
from the clean restart sample, and must not be pooled with its measurements.
Rubric `v1.0` remains unfrozen.

## Roadmap Phase R2 restart — stopped at 4/6 (2026-07-10)

Taylor approved exactly six cache-cold searches. The window is pinned to
commit `0f44ae7f593e699d2bf7bec5ad3735800ca24d65` with the existing
`.env.local` flags unchanged. RR-061 was Fixed and 807/807 tests passed before
the first live request. Earlier partial Phase 6D samples remain excluded.

Three A runs completed. The first B run reproduced RR-061-class wrong-model
imagery, so B2/B3 were not spent:

| Run | Request | Pool | Exact/Near | Latency | Logical | Hit/Miss | Physical | Retry/Fallback | Balanced |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| A1 | `shop vac` | 16 | 3/1 | 84.064s | 88 | 15/73 | 73 | 0/0 | true |
| A2 | `shop vac` | 19 | 4/2 | 90.990s | 103 | 20/83 | 83 | 0/0 | true |
| A3 | `shop vac` | 18 | 3/4 | 87.301s | 100 | 18/82 | 82 | 0/0 | true |
| B1 | `robot vacuum`, `under $300`, `self-emptying` | 11 | 1/5 | 79.386s | 95 | 16/79 | 79 | 0/0 | true |
| **Total** | 4/6 searches | — | 11/12 | 341.741s | 386 | 69/317 | 317 | 0/0 | all true |

Every ledger recorded `serperCacheEmptyAtStart: true`. Logical reconciliation
is exact in all four runs. The ledger's physical-attempt count is materially
higher than the prior 37–47-call estimate: the four completed searches already
made 317 attempts. Search-count authority was not exceeded, and the safety stop
prevented further spend; future budget estimates must use the full ledger.

Untracked Tier A fixtures:

- `tests/fixtures/review-radar-live/shop-vac.ledger-run1.json`
- `tests/fixtures/review-radar-live/shop-vac.ledger-run2.json`
- `tests/fixtures/review-radar-live/shop-vac.ledger-run3.json`
- `tests/fixtures/review-radar-live/robot-vacuum-under-300-self-emptying.ledger-run1.json`

### Safety stop and new defects

B1 rendered `2_QRevo_Curv_QRevo_Edge_140x.jpg` on both Q10 X5+
(`serper-16k9bd`) and Q10 S5+ (`ai-0002`), and
`Saros_20_Black_ID.png` on a Q7 Max+ card. R1 requires a mixed letter-digit
filename token; alphabetic `QRevo`/`Curv`/`Edge`/`Saros` plus numeric `20`
never arm that guard. RR-061 is reopened and R2 stopped.

Two unrelated defects were filed:

- Critical RR-078: A3 candidate `serper-175v05p`, Shop-Vac
  `/pages/new-customer-service-2`, became exact #1 with a verified `$50`
  price; B1 candidate `serper-v8bwd5`, a Pocketables article, rendered near.
- High RR-079: B1 candidate `serper-1qsgol1`, a standalone compatible
  self-empty Clean Base station from gap query `q-0067`, passed robot-vacuum
  category validation and rendered near.

### Plan culls and R4 evidence

All A runs had the same cull distribution: 10 pass-stage truncations, 8
Shopping-cap crowd-outs, 7 protected-slot allocations, 6 stage-not-reached,
4 deduplications, and 1 organic-cap crowd-out. B1 had 15 pass-stage
truncations, 12 stage-not-reached, 10 Shopping-cap crowd-outs, 7 protected-slot
allocations, and 2 deduplications.

B1's five initial Shopping dispatches were four broad/diluted deterministic
queries (`robot vacuum under $300`, `vacuum under $300`, `cordless vacuum under
$300`, `stick vacuum sale under $300`) and only one constraint-bearing AI
query (`robot vacuum self emptying under $300`). Meanwhile 19 useful AI
strategy/gap queries were culled, including:

- `q-0025` `self-emptying robot vacuum budget $299 under $300` — Shopping cap;
- `q-0026` `robot vacuum with auto empty dock under 300 under $300` — Shopping cap and RR-074 duplicate budget;
- `q-0028` `"self-emptying" robot vacuum under $300` — protected-slot allocation;
- `q-0029` `"auto-empty" robot vacuum "under $300"` — protected-slot allocation;
- `q-0030` `robot vacuum with dock included review budget under $300` — protected-slot allocation;
- `q-0033`/`q-0034` Shark self-empty targets — protected-slot allocation;
- `q-0035` through `q-0040` retailer/Eufy/iRobot constraint queries — Shopping cap;
- `q-0041`/`q-0042` Roborock auto-empty targets — pass-stage truncation;
- `q-0065` Roomba j5+ Clean Base follow-up — Shopping cap.

This is direct R4 evidence: protected generic slots displaced the shopper's
constraint, and the resulting broad vacuum queries produced five correctly
rejected stick-vacuum candidates (`wrong_category`).

### Product-discovery contribution

Aggregate contribution across the four runs (evidence/image/rescue-only
origins intentionally excluded from zero-contribution labeling):

| Origin | Logical queries | Raw | Normalized | Unique | Citation-valid | Requirement-valid | Revalidated | Exact | Near |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| retailer domain | 45 | 60 | 11 | 11 | 10 | 0 | 0 | 0 | 0 |
| deterministic plan | 68 | 216 | 6 | 6 | 3 | 1 | 1 | 1 | 0 |
| AI discovery strategy | 76 | 100 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| editorial seed | 64 | 588 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| direct retailer | 2 | 20 | 7 | 5 | 1 | 0 | 0 | 0 | 0 |
| market rescue | 16 | 160 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| AI gap check | 32 | 217 | 32 | 30 | 18 | 9 | 16 | 8 | 8 |

The ledger labels 24/22/27/27 dispatched product-discovery queries in
A1/A2/A3/B1 respectively as raw-positive but zero-unique. Recurring zero-value
queries include generic `shop vac`, `shop vac sale`, `best/top rated`, every
dispatched AI-strategy A query, all editorial seeds, and every market rescue.
In B1, all four generic deterministic Shopping queries, the one dispatched
self-empty strategy query, both Tapo seed dispatches, five gap follow-ups, and
both market rescues had raw results but zero unique candidates. The gap-check
origin was nevertheless the only consistently material final contributor.

Editorial seeding is particularly expensive: 588 raw results across 64
logical queries yielded zero normalized/unique/final candidates. This is the
required contribution evidence for R6; it supports reducing or repairing seed
allocation rather than preserving the current budget unchanged.

### Candidate losses

Across the four ledgers the dominant first losses were 835
`lost_in_normalization:normalizer_rejected_result`, 646
`lost_in_normalization:search_or_listing_url`, 166 `candidate_merge`, 22
requirement-filter losses, and 18 citation failures. B1 also recorded five
correct `wrong_category` stick-vacuum rejections and two raw dedupes.

The `candidate_merge` count is not treated as 166 true product losses. Samples
include Google-offer variants and near-identical names that later survive under
canonical URLs (for example Q10 X5+, Q10 S5+, and Q7 Max+); this matches the
ledger caveat about URL/name mismatch inflation. The actual incorrect
no-loss survivors are the RR-078/RR-079 candidates above.

### Variance and attribution

Only Group A has pairwise evidence:

| Pair | Strategy-query Jaccard | Expected-product Jaccard | Planned-query Jaccard | Dispatched-query Jaccard | Common-provider result Jaccard | Pool Jaccard | Final Jaccard |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1/A2 | 0.0000 | 0.1176 | 0.3846 | 0.3889 | 0.6055 | 0.0938 | 0.0000 |
| A1/A3 | 0.0000 | 0.1250 | 0.4211 | 0.4286 | 0.5938 | 0.1333 | 0.1000 |
| A2/A3 | 0.0000 | 0.1875 | 0.3671 | 0.3514 | 0.5466 | 0.0882 | 0.0000 |
| **Mean** | **0.0000** | **0.1434** | **0.3909** | **0.3896** | **0.5820** | **0.1051** | **0.0333** |

All three raw strategy JSON objects and all three gap-check JSON objects differ.
Among common dispatched provider queries, 10–14 of 15–18 result sets changed
per pair. Attribution is therefore mixed: provider variance is material, but
model/plan variance is worse (zero strategy-query overlap) and downstream
selection amplifies both to near-zero final overlap.

The strategy and gap-check `responses.create` calls set model, token cap,
prompt, strict schema, and timeout only. Neither call sets `temperature`,
`seed`, or an API-supported equivalent. R3 is therefore directly supported
and should precede R4 as the roadmap specifies.

### RR-037 and RR-045

RIDGID appeared in all three A pools and finals, but with 1/2/2 pool products
and a different final model in every run. RR-037 remains Needs Investigation:
family presence improved to 3/3, while model-level stability did not.

B1's two `TP-Link Tapo RV30 Max` seed dispatches each returned ten raw results,
including RV30 Max Plus listings and an RV30C result. All were lost in
normalization (`search_or_listing_url` or `normalizer_rejected_result`). RR-045
therefore shifts from suspected provider emptiness toward normalization/query
identity, but remains Needs Investigation because exact RV30C Plus was not
queried.

### North-Star and freeze status

No baseline is frozen because R2 failed the safety gate and Group B has no
variance sample. Provisional observations only:

- core-leader recall: unavailable; no approved dated leader snapshot exists;
- wrong-type/non-product final cards: 3/23 observed cards (customer-service
  page, editorial article, accessory dock), so safety grade F;
- constraint compliance: B1 exact was 1/1 for encoded category+budget and its
  title states auto-empty, but `self-emptying` was not encoded as a requirement,
  so full stated-constraint compliance is not safely scoreable (RR-073);
- stability: A pool Jaccard mean `0.1051`, final mean `0.0333`; B unavailable.

Rubric remains `v0.1-draft`; no leader method/snapshot was approved, no
significance rule was frozen, and Phase 6E is not authorized. The deterministic
ledger benchmark remains 0.757 ms/request (0.0009% of an 84-second run), within
the 200 ms/2% overhead budget; no extra live no-debug comparison was spent.

### R2 decision

R3 is the single best-supported next roadmap phase: zero strategy-query overlap
and absent pinning make planner determinism the first controlled variable.
R4 is independently well supported by the 4-generic/1-constraint Shopping-slot
allocation, and R6 is supported by zero editorial-seed contribution. No fix is
implemented here. Any later live validation remains blocked by RR-061 and
RR-078 safety repairs and requires new approval.

### Phase R3 deterministic follow-up (2026-07-11)

R3 used zero live calls. The default-off `REVIEW_RADAR_PINNED_PLANNING` flag
now sends `gpt-5.4-mini-2026-03-17` plus `temperature: 0` to both the discovery
strategy and gap-check calls when the configured helper is the default
`gpt-5.4-mini`. The Responses API exposes no `seed`; custom helper models and
flag-off request parameters are unchanged. The final synthesis call is not
part of this flag.

This is an expected stability improvement, not measured proof. The latest
North-Star evidence remains R2: core-leader recall unavailable; 3/23
wrong-type/non-product final cards; full constraint compliance unscoreable;
A pool/final Jaccard 0.1051/0.0333 and B stability unavailable. RR-015 remains
Needs Investigation. R4's later approved sample must separately report plan,
provider, pool, and final overlap with the flag enabled. It must not treat
future B observations as missing pre-change runs.

### RR-061 deterministic safety follow-up (2026-07-11)

The separately approved RR-061 repair used zero live calls. Static control-flow
analysis attributes the accepting R2 path to extracted page images: initial
existing candidates had no evidence/verified context, while page images
inherited page-wide identity. The serialized `retailer_page` field and saved
fixture do not prove whether OG or Product JSON-LD candidates existed at
runtime, so their priority ordering was not changed.

Page images now require image-level target evidence. The filename guard now
recognizes split family/number identities and repeated non-generic family
tokens without a brand dictionary or request-local candidate pool. All three
R2 captures and the earlier RR-061 generations are covered; matching Product
JSON-LD, neutral/same-model files, family-adjacent sizes, opaque assets, Google
thumbnails, Amazon modifiers, and navigation guards remain green.

Fail-first was 811/814 with three intended failures; focused final 24/24; full
suite 815/815 across 120 suites; typecheck/build/eval pass; lint 0 errors and 3
existing warnings. Latest North-Star evidence is unchanged from R2. RR-061 is
Fixed, but no new live window is permitted until RR-078/RR-079 are separately
repaired and Taylor approves the spend.

### RR-061 round-4 / RR-080 adversarial follow-up (2026-07-11)

Claude's zero-live adversarial review found a same-family sibling false pass
(`Saros_10` on Saros Z70) and neutral sequence-counter false vetoes. Taylor
approved one separate micro-phase. RR-061 was reopened and re-fixed; RR-080
was filed and Fixed.

Neutral image vocabulary is intentional, split claims retain 1–4 digit
support for real one-digit product families, and a target family directly
adjacent to a mixed model asserts that family. The compatible target-model
escape remains unchanged, and no unproven year exclusion shipped. Focused
fail-first was 24/26, final 27/27; full suite 818/818 across 120 suites;
typecheck/build/eval pass; lint 0 errors
and 3 warnings. Zero live calls. R2 metrics and freeze state remain unchanged;
RR-078/RR-079 still block any later live window.

## Phase R4 live after-sample (2026-07-11)

Taylor approved six usable cache-cold searches with both default-off flags set
only on the live server processes: `REVIEW_RADAR_PINNED_PLANNING=on` and
`REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`. The sample is pinned to commit
`cd95deb6d5366cf3140a1d6445e4da771a0cffd2`; `.env.local` remained unchanged.
The first-run smoke gate passed: `searchLedger.rawAi.strategy` was non-null and
the API accepted the pinned snapshot plus `temperature: 0`.

One orchestration error dispatched an additional request against the already
warm first server. Root cause: a piped inline Node client had already begun a
request even though its orchestration command appeared complete, after which a
PowerShell client dispatched the intended request against the same process.
The cache-cold fixture survived; the warm request produced no fixture. Work
stopped, Taylor approved one replacement, and every remaining run used a
temporary single-request client that refuses fixture overwrite and has no
retry path. Search-count authority is therefore seven requests dispatched,
six usable cache-cold samples; the warm request is spent but excluded.

| Run | Request | Pool | Exact/Near | Latency | Logical | Hit/Miss | Physical | Retry/Fallback | Balanced |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| A1 | `shop vac` | 15 | 0/1 | 65.155s | 51 | 12/39 | 39 | 0/0 | true |
| A2 | `shop vac` | 17 | 4/2 | 80.284s | 104 | 20/84 | 84 | 0/0 | true |
| A3 | `shop vac` | 20 | 2/2 | 80.101s | 93 | 17/76 | 76 | 0/0 | true |
| B1 | `robot vacuum`, `under $300`, `self-emptying` | 12 | 0/5 | 105.040s | 131 | 26/105 | 105 | 0/0 | true |
| B2 | same constrained request | 14 | 0/5 | 99.852s | 125 | 26/99 | 99 | 0/0 | true |
| B3 | same constrained request | 13 | 1/5 | 93.753s | 100 | 17/83 | 83 | 0/0 | true |
| **Usable total** | 6 searches | — | 7/20 | 524.185s | 604 | 118/486 | 486 | 0/0 | all true |

All six ledgers report `serperCacheEmptyAtStart: true`, both flags `on`, a
non-null strategy, exact reconciliation, and zero retries/fallbacks. The six
usable searches made 486 physical Serper attempts; the invalid warm request's
physical count is unknown and is not folded into the sample totals. The
earlier 225–280 estimate was materially low.

### R3 stability measurement

Only Group A has a valid before/after comparison. Normalized pairwise means:

| Layer | R2 before | R4 after | Change |
|---|---:|---:|---:|
| strategy queries | 0.0000 | 0.0196 | +0.0196 |
| expected products | 0.1434 | 0.2222 | +0.0788 |
| planned product queries | 0.3830 | 0.3714 | -0.0116 |
| dispatched product queries | 0.3722 | 0.3587 | -0.0135 |
| candidate pool | 0.1051 | 0.2694 | +0.1643 |
| final cards | 0.0333 | 0.1429 | +0.1096 |

Pool and final overlap improved, but the intended R3 mechanism did not:
strategy-query overlap remained near zero and planned/dispatched product-query
overlap was slightly lower. Snapshot pinning is API-compatible, but this
sample does not justify claiming planner determinism or promoting the R3 flag.
RR-015 remains Needs Investigation. No product appeared in all three A final
sets, and no approved leader snapshot exists, so core-leader recall remains
unavailable.

Group B has no comparable multi-run before sample. Its after-only pool/final
Jaccard means are 0.3621/0.3704 and are descriptive only, not an R4 delta.

### R4 process and North-Star evidence

The initial constrained plan changed as designed. In every B run the leading
deterministic forms were:

- `robot vacuum self-emptying under $300`
- `self-emptying robot vacuum under $300`
- `robot vacuum self-emptying sale under $300`
- `site:ajmadison.com robot vacuum self-emptying under $300`

The old `vacuum`, `cordless vacuum`, and `stick vacuum sale` initial slots are
gone. Every leading slot carries the category, preference, and budget, and all
three ledgers contain zero duplicate-budget queries. Constraint-bearing
dispatched product queries rose from 7 in R2 B1 to 17/15/17. The broad query
still exists only in the later recall tail. Some constraint-bearing records
are marked culled because duplicate, cap, and later AI/rescue candidates are
also ledgered; that is not evidence that a protected initial slot lost the
constraint. The protected-slot acceptance is satisfied by the outbound
leading queries above.

The full wrong-category first-loss count did not improve: R2 B1 had 5 and the
after runs had 6/7/6. The source changed. R2's five came from diluted direct
retailer searches; after R4, three per run came from the still-dispatched
`site:homedepot.com stick vacuum under 300` direct-retailer tail and three per
run came from AJ Madison returning unrelated appliances despite a fully
constraint-bearing query (B2 added one GE appliance from an official-site
query). Thus initial allocation improved, but total funnel contamination did
not. Do not claim that R4 reduced wrong-category entry.

Final-card safety improved from 3/23 wrong-type/non-product cards in R2 to
0/27 in the six-run after-sample. The B exact slate was 1/1 fully compliant:
the eufy C10 Auto-Empty was under $300 and explicitly included auto-empty.
The two prior R2 repairs, RR-078/RR-079, are the likely direct explanation for
the final-card safety movement; the shared live batch cannot causally assign
that movement to R4 alone.

Roadmap rule 5 does not force a stop-and-rethink because measured pool/final
stability, final wrong-type count, and scoreable constraint compliance all
improved. However, attribution is mixed and flag promotion remains a separate
Taylor decision. This phase does not modify `.env.local`.

### Live defects and safety result

No RR-061-class image regression occurred, so the safety stop did not fire.
Two non-safety findings were recorded while continuing under the approved
rule:

- RR-060 reopened: B3 rendered the same Home Depot Roomba 105 Combo twice;
  the short and titled URLs share product ID `335012888`, while punctuation
  split `13.2` into `13. 2` in one title.
- RR-081 filed: wildcard `site:*.com`, repeated `eufy eufy`, and repeated
  `robot vacuum robot vacuum` forms survived AI/rescue plan construction;
  several were dispatched.

Rubric `v0.1-draft`, leader snapshots, significance rules, and Phase 6E remain
unapproved. The six `r4-after` fixtures remain untracked and must not be
committed.

## Fresh post-RR-061 restart - stopped

Taylor approved a new six-call window under commit `baeb6a0`, with both earlier
partial samples excluded. The exact alternating plan was A1/B1/A2/B2/A3/B3:

- A: `shop vac`, blank budget/details, no selected features;
- B: `robot vacuum`, budget `under $300`, priorities `self-emptying`, no
  selected features;
- debug mode enabled for every call.

Only A1 and B1 ran:

| Run | Pool | Citation | Requirement | Final | Exact/Near | Latency | Serper |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 `shop vac` | 19 | 11 | 5 | 3 | 1/2 | 92.592s | 37 |
| B1 constrained robot vacuum | 9 | 7 | 6 | 6 | 1/5 | 88.463s | 38 |

A1 was safe. Its three final cards were specific wet/dry vacuums with
product-detail URLs and plausible product imagery. Suspicious prices remained
untrusted, RIDGID reached a near slot, no household floor cleaner appeared,
and source upgrade attached only a secondary citation to the generic-model
Vacmaster target while rejecting nearby DEWALT/RIDGID models.

B1 stopped the pilot. `Roborock Q5 Max+` used the correct product page and a
matching Open Graph title, but its rendered image was
`Saros_Z70_Silver_ID.png`, explicitly identifying a different Roborock model.
The image became Medium-confidence retailer-page metadata because verified page
context outweighed the image-path model conflict. RR-061 reopened.

B1 also opened Medium RR-070: the `ILIFE A12 Pro` candidate carried unrelated
Serper metadata brand `Bose`, producing source-upgrade query
`Bose ILIFE A12 Pro`. No candidates returned and no evidence attached, so this
was not the safety stop, but it is a separate query-identity coverage defect.

The fresh ledger stopped at 2/6 searches and 75 observed Serper queries. Four
calls were not spent. Both fixtures remain untracked Tier A evidence:

- `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json`;
- `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json`.

There is only one observation per query. The offline harness reports empty
pair arrays, so candidate/raw-provider/query-plan/citation/requirement/final
overlap, rank correlation, stage-loss variation, significance, and
provider/model attribution are all unavailable. Single-run intersection/union
values of 1 are tautologies and are not variance evidence.

RR-014, RR-015, RR-037, and RR-045 remain Needs Investigation. A1 confirms
RIDGID can enter the raw set, pool, and final near slate, but one observation
cannot resolve RR-037. The constrained query did not target Tapo provider
coverage, and the stopped sample says nothing new about RR-014.

Closeout verification passed: typecheck; lint with 0 errors and 3 existing
warnings; 791/791 tests across 117 suites; and offline eval with no red flags.
No production code, tests, scripts, or behavior changed. Rubric v1.0 remains
unfrozen and Phase 6E did not start.

## Clean post-RR-069 restart - stopped

Taylor approved a separate six-search restart under the fixed RR-069 code:
`shop vac` x3 and a request with query `robot vacuum`, budget `under $300`,
priorities `self-emptying`, and no selected features x3. Calls were to
alternate A1, B1, A2, B2, A3, B3 with debug mode enabled.

Only A1 ran. It returned four exact and two near products from a 20-candidate
pool in 83.219 seconds with 37 executed Serper queries and no request errors.
The safety inspection found the same generic Amazon navigation image on two
different near products:

- RIDGID VAC4000;
- Fein Turbo I.

Both cards used
`https://images-na.ssl-images-amazon.com/images/G/01/omaha/images/yoda/flyout_72dpi._V270255989_.png`.
The pipeline stored the value as High-confidence `retailer_page` image
metadata from each product page and exposed it as `product_image_url`. This is
not product-specific imagery. RR-061 was reopened as Needs Investigation and
the remaining five calls were not spent. No behavior fix was attempted.

Because the clean restart has only one valid observation for one query:

- candidate-pool and final-set pairwise Jaccard are unavailable;
- three-run intersection/union is unavailable;
- shared-product rank correlation is unavailable;
- exact range is observed only as `4-4`;
- near range is observed only as `2-2`;
- total-final range is observed only as `6-6`;
- stage-loss variation and latency/error variation are not estimable;
- no constrained-query observation exists;
- no post-RR-069 RR-015 significance inference is valid;
- RR-037 remains Needs Investigation despite RIDGID reaching the A1 pool and
  final set.

The clean restart fixture is untracked Tier A evidence:
`tests/fixtures/review-radar-live/phase-6d-restart-shop-vac.run1.json`.
It is not pooled with the four pre-fix fixtures below.

Required closeout verification passed: typecheck; lint with 0 errors and the
same 3 warnings; 786/786 tests across 117 suites; and offline eval with no red
flags. The offline variance harness requires at least two fixtures and
correctly declined to calculate statistics from A1 alone.

**Post-stop RR-061 update:** RR-061 was fixed deterministically in a separate
narrow phase. The shared resolver now rejects flyout/menu/department/layout
asset paths and cannot use retailer/source/domain words or image hosts as
product identity. The exact captured URL is rejected for both affected cards;
verified same-product Amazon and opaque CDN images remain valid. Fail-first
was 31/35 with four intended failures; focused image/source-upgrade coverage
passed 135/135, the broader trust wall passed 376/376, and the full suite
passed 791/791. No live search ran. Phase 6D remains stopped, the five-call
balance is not reusable, rubric v1.0 remains unfrozen, and Phase 6E did not
start.

## Aborted pre-fix scope and budget

Taylor approved exactly six live searches in alternating order:

1. `shop vac` A1
2. `robot vacuum under $300 self-emptying` B1
3. `shop vac` A2
4. `robot vacuum under $300 self-emptying` B2
5. `shop vac` A3
6. `robot vacuum under $300 self-emptying` B3

This pre-fix pilot stopped after B2 because RR-069 met the Phase 6 safety-stop rule.
Four searches were spent; A3 and B3 were not run. Observed Serper calls were
`37 + 38 + 37 + 38 = 150`, below the approved estimate of approximately 280.
All four Tier A fixtures remain untracked and excluded from the clean restart.

## Safety stop: RR-069

B2 targeted `Roborock Q10 X5+ Robot Vacuum and Mop, Self-Emptying, Hands ...`.
The trace detected model tokens `q10` and `roborockq10x5` but reduced the
selected identity phrase and search query to `Roborock Q10`. Source upgrade
then accepted the generic candidate `Roborock - Q10 Series Robot Vacuum and
Mop with Self-Emptying, 10,000Pa Suction,` and attached price, rating, review
count, and citation.

The source title did not identify X5+. A Q10 S5+ target in the same run rejected
the same generic Q10-series candidate. This is unsafe nearby-series evidence,
not harmless score variance. No app fix was attempted in Phase 6D.

The later RR-069 mini-phase added a generalized distinguishing-submodel guard.
M1 tests now reject generic Q10 series/plain/lineup evidence and nearby S5+/X50+
models for a Q10 X5+ target while accepting `Q10 X5+`, `Q10 X5 Plus`, and
`Q10X5+`. Cross-category monitor and power-tool controls are green. The saved
fixture remains M4 historical evidence and still replays the original failure.

## Partial RR-015 variance report

Only one pair exists per query, so the values below are observations rather
than stable estimates.

| Metric | `shop vac` A1/A2 | constrained B1/B2 |
|---|---:|---:|
| Raw-provider Jaccard | 0.2857 | 0.3158 |
| Query-plan Jaccard | 0.3636 | 0.3333 |
| Candidate-pool Jaccard | 0.1429 | 0.0000 |
| Final-set Jaccard | 0.0000 | 0.0000 |
| Exact count | 2, 2 | 1, 1 |
| Near count | 5, 4 | 5, 3 |
| Candidate-pool count | 22, 18 | 12, 7 |
| Citation-verified count | 16, 13 | 11, 7 |
| Requirement-filtered count | 8, 6 | 8, 5 |
| Final count | 7, 6 | 6, 4 |
| Latency | 108.439s, 78.188s | 90.287s, 63.174s |
| Observed Serper calls | 37, 37 | 38, 38 |
| Errors | 0, 0 | 0, 0 |

No final product was shared between either pair, so shared-product rank
correlation is not scoreable. Stable exact counts hid complete product-set
turnover; exact-card count alone is therefore not a stability metric.

## Partial RR-037 report

RIDGID entered the merged shop-vac candidate pool in both completed runs:

| Run | Raw-provider RIDGID names | Pool RIDGID names | Outcome |
|---|---:|---:|---|
| A1 | 0 | 1 | Survived citation verification; removed by requirement filtering |
| A2 | 3 | 5 | Three survived to the final exact/near slate; one was exact |

RR-037 is not closed. The two observations disprove consistent total absence,
but the difference from one pool candidate to five and from zero raw names to
three directly demonstrates the variance the issue tracks. A3 was not run.

## Variance-source attribution

The partial evidence supports a mixed attribution:

- Provider-bound variance is material: raw-provider overlap was only
  `0.2857-0.3158`.
- Model/plan-bound variance is also material: generated/search-plan overlap was
  only `0.3333-0.3636`, and merged-pool overlap fell below raw overlap.
- Downstream amplification is substantial: both final-set overlaps were zero.

The current traces cannot assign causal percentages because they do not bind
each candidate to a stable per-query provider response and each later loss to
one upstream plan decision. The result is therefore "mixed and not
quantitatively separable," not a provider-only or model-only diagnosis.

The relevant OpenAI Responses API calls in `lib/discoveryStrategy.ts` and
`app/api/recommendations/route.ts` do not explicitly set `temperature` or
`seed`. The model side is not pinned by current application configuration.

## Provisional significance and sample size

The planned significance rule was not established. The interrupted sample
supports only this conservative interim rule:

> Do not call a one-run live delta real. Require repeated M4 evidence under the
> same commit and rubric, with no safety failures, and require the observed
> change to exceed the completed control distribution for the metric.

For the resumed pilot, finish at least three valid runs per query as originally
designed. For release-grade stability estimates, use at least five valid runs
per query across more than one execution window; report confidence intervals
or the full empirical range rather than one mean. This recommendation is
provisional until a clean pilot is completed.

## Freeze proposal status

No v1.0 freeze proposal is presented for approval:

- metric definitions, deductions, and floors remain `v0.1-draft`;
- the variance significance rule is not frozen;
- `docs/phase-6-market-leader-evaluation.md` was not created;
- leader snapshots were not compiled or approved;
- Phase 6E is blocked.

The freeze package must follow a clean, explicitly re-approved completion of
Phase 6D after RR-069 is fixed deterministically. Current poor or unsafe
performance must not be used to lower the quality target.

## What this evidence proves

- Current repeated output varied sharply at provider, plan, pool, and final
  stages for both query shapes.
- RIDGID pool presence and survival varied materially across two shop-vac runs.
- Stable result counts did not imply stable product identity.
- RR-069 is a current live source-upgrade identity safety failure.
- The budget and stop-condition controls worked.

## What remains unproven

- Three-run pairwise distributions and three-run intersection/union.
- A defensible variance significance threshold.
- Rank stability when products are shared.
- Whether provider or model/plan variance dominates over a larger sample.
- Release-grade sample size.
- Approved leader method and snapshots.
- Rubric v1.0 and Phase 6E readiness.

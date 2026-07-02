# Phase 6D Variance Pilot

**Date:** 2026-07-02  
**Mode:** M4 repeated live sampling, measurement-only  
**Rubric:** `v0.1-draft`, not frozen  
**Verdict:** **FRESH POST-RR-061 RESTART STOPPED AT 2/6 ON WRONG-MODEL IMAGE**

**Post-stop update:** RR-069 was fixed deterministically in a separate narrow
mini-phase. Taylor approved a new clean six-call post-fix restart on 2026-07-02.
The four observations below remain RR-069 discovery evidence, are excluded
from the clean restart sample, and must not be pooled with its measurements.
Rubric `v1.0` remains unfrozen.

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

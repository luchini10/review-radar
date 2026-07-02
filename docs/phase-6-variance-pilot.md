# Phase 6D Variance Pilot

**Date:** 2026-07-02  
**Mode:** M4 repeated live sampling, measurement-only  
**Rubric:** `v0.1-draft`, not frozen  
**Verdict:** **STOPPED ON CRITICAL SAFETY FAILURE**

## Scope and budget

Taylor approved exactly six live searches in alternating order:

1. `shop vac` A1
2. `robot vacuum under $300 self-emptying` B1
3. `shop vac` A2
4. `robot vacuum under $300 self-emptying` B2
5. `shop vac` A3
6. `robot vacuum under $300 self-emptying` B3

The pilot stopped after B2 because RR-069 met the Phase 6 safety-stop rule.
Four searches were spent; A3 and B3 were not run. Observed Serper calls were
`37 + 38 + 37 + 38 = 150`, below the approved estimate of approximately 280.
All four Tier A fixtures remain untracked.

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


# Phase 1 request-time market discovery comparison

Status: **VALID**

Completed: 2026-09-02

Frozen benchmark: `review-radar-accuracy-v1`

Accepted raw SHA-256:
`9EC5744A37C5063B2B663ECCFAE9865B8AF7659EDC73E97A5605D77EF27208A6`

## Assessment

Phase 1 achieved a substantial generalized improvement in request-time market-
leader discovery without weakening the measured hard-requirement, wrong-product,
or duplicate guardrails. It did not solve final shortlist quality. The dominant
leader loss moved downstream to the nine-candidate verification-slate cutoff,
and both empty-result frequency and latency worsened.

## Method integrity

- Same 48 frozen searches and 142 grade-2/3 leader opportunities as Phase 0.
- Same frozen reference registry, evaluator, metrics, and one-attempt/no-retry
  policy.
- The live runner sent request-only fields and did not load benchmark answers.
- All 77 displayed cards were bound to the accepted raw-run hash and
  adjudicated; there were no methodological blockers.
- Production source and representative imports passed benchmark anti-leakage
  checks.

## Before/after results

| Metric | Phase 0 | Phase 1 | Change |
|---|---:|---:|---:|
| Leader discovery recall | 62/142 (43.66%) | 77/142 (54.23%) | +15, +10.57 pp |
| Broad-search discovery | 19/36 (52.78%) | 24/36 (66.67%) | +5, +13.89 pp |
| Final leader recall | 7/142 (4.93%) | 10/142 (7.04%) | +3, +2.11 pp |
| Empty searches | 8/48 | 10/48 | +2 (worse) |
| Top-K quality precision | 50/102 (49.02%) | 24/77 (31.17%) | -17.85 pp |
| NDCG@3 | 0.4082 | 0.3039 | -0.1043 |
| Hard-requirement accuracy | 163/172 (94.77%) | 118/118 (100%) | +5.23 pp |
| Wrong-product leakage | 6/102 (5.88%) | 3/77 (3.90%) | -1.98 pp |
| Model-family duplicate leakage | 4/102 (3.92%) | 1/77 (1.30%) | -2.62 pp |
| Exact duplicate leakage | 0/102 | 0/77 | unchanged |
| Product-page accuracy, checked | 25/31 (80.65%) | 19/23 (82.61%) | +1.96 pp |
| Latency mean | 26,488 ms | 31,805 ms | +5,317 ms |
| Latency p50 | 26,125 ms | 30,654 ms | +4,529 ms |
| Latency p95 | 34,642 ms | 41,481 ms | +6,839 ms |

The hard-requirement denominators differ because only verifiable returned-card
facts are scored; the unchanged evaluator does not invent evidence for empty or
missing cards. Leakage rates use the actual displayed-card denominator.

## Earliest leader loss

| Stage | Phase 0 | Phase 1 |
|---|---:|---:|
| Never discovered | 80 | 65 |
| Candidate truncation or ranking | 26 | 43 |
| Final-selection crowd-out | 10 | 9 |
| Page/commerce verification | 8 | 6 |
| Prefilter | 6 | 5 |
| Candidate deduplication | 3 | 1 |
| Merchant/market filter | 2 | 3 |
| Returned | 7 | 10 |

Fifteen additional leaders entered the discovered universe. The simultaneous
increase from 26 to 43 losses before the verification slate shows that the next
material bottleneck is candidate survival/cutoff, not additional blind query
volume and not a Phase 1 final-ranking retune.

## Work and latency

The accepted run used 48 OpenAI Responses calls, 143 hosted web searches, 672
logical and 667 physical Serper operations, 869,232 input tokens, and 89,107
output tokens. Relative to Phase 0, this is unchanged Responses volume, seven
additional hosted searches, twenty additional logical Serper operations,
fifteen additional physical attempts, and 71,021 additional model tokens.

The architecture remains bounded and adaptive per request: up to nine market-
map targets, two neutral queries, four target queries, three page queries,
fifteen logical operations, and nine verification candidates. Diagnostics bind
candidate identities to discovery paths, report missing expected targets and
stop reasons, expose result/candidate limit effects, and count distinct
plausible contributions per path.

## Decision

Phase 1 is accepted because the primary metric improved materially and every
stated correctness guardrail held. It is not release-qualified. Phase 2 should,
if separately approved, investigate fair candidate-universe-to-slate survival
and false empties using the new attribution before changing final quality-score
weights. The lower precision/NDCG and higher latency/empty frequency remain
explicit risks.

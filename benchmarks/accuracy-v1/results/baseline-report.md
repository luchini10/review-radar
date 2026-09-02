# Review Radar Accuracy Benchmark V1 — Baseline Report

## 1. Benchmark design

V1 froze 48 realistic US-market searches before any Review Radar output was examined. It spans 11 materially different categories: appliances, cleaning, computers, electronics, fitness, furniture, home products, kitchen, outdoor equipment, personal electronics, and tools.

Search-type coverage is 12 broad/no-criteria, 8 broad-plus-budget, 8 hard-specification, 2 required-brand, 2 brand-alternative, 4 size/dimension, 4 exclusion, 5 multiple-constraint, and 3 niche cases. Every case ran once. Automatic and benchmark-level retries were prohibited before the run and no result was substituted.

The independent reference registry contains 99 timestamped products from 71 source families. Forty-four are grade 3 (clear leader), 54 are grade 2 (strong contender), and one is grade 1 (acceptable). Each scored reference has at least two independent source families. References use current comparative/lab testing, category specialists, manufacturer identity/specification evidence, and current commerce presence. Retailer presence alone is not treated as proof of product quality. The frozen reference does not claim that exactly seven answers are objectively correct.

The live runner never loads the product registry and its source never accesses a
reference-ID field. It allowlists only frozen request fields before calling
`POST /api/recommendations`; reference comparison and result adjudication run
later in a separate process. Tests reject benchmark imports across the complete
production source roots and reject reference-field access in the live runner.

The current product returns at most five cards, so V1 replaces the requested “Top-7 Precision” with **Top-K Quality Precision, K = the 1–5 cards actually returned**. Reporting a seven-slot metric would manufacture four nonexistent positions. Ranking quality uses graded NDCG@3.

## 2. Baseline snapshot

- Benchmark: `review-radar-accuracy-v1`
- Branch: `main`
- HEAD: `866c5fc9ab9ea72a135393d84f996189d13647c6`
- Repository: dirty, reproducibly sealed; no commit was made because the tree contained unrelated pre-existing work
- Relevant working-tree diff SHA-256: `84fa120a84d8af999b500349e36fcabe489e509dcc475dc32004cec96ee19e7b`
- Production binding: SHA-256 recorded for every measured `app/`, `components/`, `lib/`, `types/`, Next configuration, and package file
- Start: `2026-09-02T02:47:18.997Z`
- End: `2026-09-02T03:08:33.864Z`
- Market: US
- Market-scout model: `gpt-5.4-mini`, low reasoning effort
- Request limits: 3 hosted web searches, 15 logical Serper operations, 3 neutral shopping queries, 3 target shopping queries, 9 verification candidates, 5 displayed products
- Response cache: `no-store`
- Retry rule: no application or benchmark retries
- Secrets: not inspected; provider use is established from captured request telemetry

The only production edit made by Phase 0 is additive candidate-funnel telemetry in `lib/productSelection.ts`. It records sanitized candidate names, URLs, verification status, and rejection reasons at existing boundaries; it does not change query planning, filtering, ranking, verification, or selection.

## 3. Primary metrics

| Metric | Result | Denominator meaning |
|---|---:|---|
| Market-leader discovery recall | 62/142 (43.66%) | Frozen grade-2/3 references observed anywhere in the raw discovery funnel |
| Final market-leader recall | 7/142 (4.93%) | Frozen grade-2/3 references present in displayed results |
| Top-K quality precision | 50/102 (49.02%) | Displayed cards independently judged strong or matched to a strong frozen reference |
| NDCG@3 | 0.4082 across 48 cases | Graded quality at positions 1–3 relative to the frozen qualifying reference |
| Hard-requirement accuracy | 163/172 (94.77%) | Displayed-card × applicable hard-requirement judgments |
| Hard-requirement violations | 9/172 (5.23%) | Confirmed false passes; 0/172 remained unadjudicated |
| Wrong-product/identity leakage | 6/102 (5.88%) | Wrong type or wrong configuration/page identity |
| Exact duplicate leakage | 0/102 (0.00%) | Exact normalized name-and-URL duplicates |
| Model-family duplicate leakage | 4/102 (3.92%) | Later cards duplicating an already displayed model family |
| Product-page accuracy | 25/31 (80.65%) | Independently adjudicated page-identity subset; 71 cards remain unknown |
| Price accuracy | 6/7 (85.71%) | Independently checked price subset; 95 cards remain unknown |
| Availability accuracy | 4/4 (100.00%) | Independently checked availability subset; 98 cards remain unknown |
| Image accuracy | 8/11 (72.73%) | Independently adjudicated non-null image subset |
| Request success | 48/48 (100.00%) | First attempts returning HTTP 200 |

Empty results do not enter the hard-compliance denominator: returning no card is a completeness/recall failure, not a false-pass violation. Eight of 48 searches returned no products.

The commerce subset denominators are intentionally small. V1 does not treat Review Radar's own verification telemetry as independent proof that its price, page, availability, or image is correct.

## 4. Search-type and category breakdowns

| Search type | Cases | Empty | Discovery recall | Final recall | Strong precision | NDCG@3 |
|---|---:|---:|---:|---:|---:|---:|
| Broad/no criteria | 12 | 0 | 19/36 (52.78%) | 3/36 (8.33%) | 17/35 (48.57%) | 0.5278 |
| Broad + budget | 8 | 0 | 10/24 (41.67%) | 2/24 (8.33%) | 9/20 (45.00%) | 0.4852 |
| Hard specification | 8 | 3 | 6/23 (26.09%) | 1/23 (4.35%) | 4/13 (30.77%) | 0.2853 |
| Required brand | 2 | 0 | 3/5 (60.00%) | 0/5 (0.00%) | 1/2 (50.00%) | 0.2870 |
| Brand alternative | 2 | 0 | 5/6 (83.33%) | 0/6 (0.00%) | 3/5 (60.00%) | 0.7289 |
| Size/dimension | 4 | 3 | 4/12 (33.33%) | 0/12 (0.00%) | 1/1 (100.00%) | 0.0848 |
| Exclusion | 4 | 0 | 7/12 (58.33%) | 0/12 (0.00%) | 6/14 (42.86%) | 0.5262 |
| Multiple constraints | 5 | 1 | 5/15 (33.33%) | 0/15 (0.00%) | 7/8 (87.50%) | 0.3998 |
| Niche | 3 | 1 | 3/9 (33.33%) | 1/9 (11.11%) | 2/4 (50.00%) | 0.2066 |

| Category | Cases | Discovery recall | Final recall | Strong precision | NDCG@3 |
|---|---:|---:|---:|---:|---:|
| Appliances | 4 | 2/12 (16.67%) | 0/12 | 5/7 (71.43%) | 0.3275 |
| Cleaning | 5 | 11/15 (73.33%) | 1/15 (6.67%) | 9/17 (52.94%) | 0.6277 |
| Computers | 3 | 4/8 (50.00%) | 1/8 (12.50%) | 4/8 (50.00%) | 0.5886 |
| Electronics | 4 | 3/12 (25.00%) | 1/12 (8.33%) | 4/6 (66.67%) | 0.4538 |
| Fitness | 3 | 6/9 (66.67%) | 0/9 | 2/4 (50.00%) | 0.2128 |
| Furniture | 2 | 4/6 (66.67%) | 0/6 | 1/2 (50.00%) | 0.2749 |
| Home products | 2 | 3/6 (50.00%) | 2/6 (33.33%) | 2/5 (40.00%) | 0.4263 |
| Kitchen | 6 | 10/18 (55.56%) | 0/18 | 7/15 (46.67%) | 0.3978 |
| Outdoor equipment | 10 | 8/30 (26.67%) | 1/30 (3.33%) | 7/16 (43.75%) | 0.3106 |
| Personal electronics | 3 | 6/9 (66.67%) | 0/9 | 5/7 (71.43%) | 0.6088 |
| Tools | 6 | 5/17 (29.41%) | 1/17 (5.88%) | 4/15 (26.67%) | 0.3671 |

Very high precision cells with one or two returned products are not evidence of broad quality; they often coexist with severe completeness failure.

## 5. Funnel losses

Earliest attributable loss across 142 frozen grade-2/3 reference products:

| Earliest stage | Count | Share |
|---|---:|---:|
| Never discovered | 80 | 56.34% |
| Reached compatible pool, then absent from the 9-candidate ranked/verification set | 26 | 18.31% |
| Verified, then final-selection crowd-out | 10 | 7.04% |
| Ranked for verification, then page/commerce verification loss | 8 | 5.63% |
| Prefilter rejection | 6 | 4.23% |
| Candidate deduplication/identity collapse | 3 | 2.11% |
| Merchant/non-US-market filter | 2 | 1.41% |
| Returned | 7 | 4.93% |

The funnel establishes that ranking is not the first or largest problem. More than half of the important qualifying products never enter discovery, and another 18.31% reach the compatible pool but do not enter the bounded verification set.

## 6. Top repeated generalized causes

1. **Discovery coverage failure — 80/142 leaders.** The dominant loss occurs before ranking or commerce verification. Broad searches alone miss 17/36 leaders at discovery.
2. **Bounded candidate-selection/truncation loss — 26/142 leaders.** These products exist in the compatible candidate pool but are absent from the nine candidates selected for verification. The telemetry cannot defensibly separate ranking score from the truncation boundary, so V1 keeps them combined.
3. **Final selection and verification attrition — 18/142 leaders.** Ten verified leaders are crowded out and eight ranked leaders fail page/commerce verification.
4. **Hard-requirement false passes — 9/172 requirement opportunities.** Failures cluster in explicit features and numeric specifications: brushless drills, tank capacity, built-in pump, handedness, product type, and running watts.
5. **Identity/commerce attachment errors — 6/102 wrong identities, 6/31 checked pages wrong, 3/11 checked images wrong, and 1/7 checked prices wrong.** The card can identify a good product while attaching a different configuration or implausible price.
6. **Model-family crowding — 4/102 cards.** Duplicate families appeared in robot-vacuum and drip-coffee results.

## 7. Broad-search findings

Review Radar always returned at least one product for the 12 unconstrained broad searches, but it is not yet reliable at answering “what are the best products in this category?”

- Leader discovery: 19/36 (52.78%)
- Final leader recall: 3/36 (8.33%)
- Strong-result precision: 17/35 (48.57%)
- NDCG@3: 0.5278
- Frozen mainstream brand/model coverage: 3/30 distinct reference brands (10.00%)
- Empty broad searches: 0/12

The characteristic failure is not total silence; it is returning plausible commerce-visible products while omitting most independently established leaders. Broad air-purifier search also returned a humidifier card, and broad earbuds used a low-evidence generic product for one of three positions.

## 8. Budget-search findings

Budget searches produced 20 cards across eight cases with no empty results, but leader discovery was only 10/24 (41.67%) and final recall was 2/24 (8.33%). Strong precision was 9/20 (45.00%).

Among nine displayed pairs where the independently stronger product was also more expensive while remaining within budget, the cheaper/weaker product ranked above it in 3/9 pairs (33.33%), spanning the coffee-maker and air-purifier cases. This is evidence of a value/price-ordering problem in those cases, not proof of a universal price bias: the denominator is small and several budget cases returned only one product.

## 9. Worst representative failures

- **Broad air purifier:** a Levoit humidifier occupied position 1. The card text, URL identity, and requested type conflict.
- **12-gallon shop vacuum:** three of four results failed the minimum capacity; one was explicitly 1/2 gallon.
- **Brushless drill kit:** two of four results did not establish brushless construction.
- **Left-handed vertical mouse:** position 2 was a right-handed Razer design.
- **Generator with at least 2,000 running watts:** position 1 advertised 2,300 starting watts but the manufacturer specifies only 1,800 running watts.
- **Broad treadmill:** a Sole F65 was shown at an unsupported $10,000.
- **Identity binding:** Milwaukee 2904-22 kit linked to 2904-20 tool-only; Moccamaster KBT linked to the KBG/KBGV family; Stihl BGA 60 linked to a different BGA/BA06 configuration; one MacBook URL was generic; the NIMO card and URL specified different memory/storage variants.
- **Completeness:** eight searches were empty, including three of four dimension cases and three of eight hard-spec cases.
- **Family crowding:** two Eureka J15 variants, two ECOVACS T80S bundle forms, two Ninja CE25x variants, and two Cuisinart 14-cup listings consumed separate slots.

These failures are preserved; Phase 0 made no product/category-specific recommendation fixes.

## 10. Strongest current behavior

- All 48 first attempts completed with HTTP 200; there were no hidden retries or substitutions.
- Exact duplicate leakage was 0/102.
- Confirmed hard-requirement compliance was 163/172 (94.77%), and the system often failed closed with an empty result instead of filling every slot.
- Brand-alternative discovery recall was 5/6 (83.33%), the strongest search-type discovery result.
- Multiple-constraint outputs were usually defensible when present: 7/8 displayed cards were strong, although one of five cases was empty and frozen-leader final recall remained 0/15.
- The pipeline did surface several independently strong products, including Roborock Saros 10R, Dreame X50 Ultra, Eufy X10 Pro Omni, Cuisinart 14-cup, Milwaukee 2904-22, Winix 5530, AOC Q27G3XMN, Bose QuietComfort Ultra, and Generac iQ3500. The live request-bound architecture and strict verification boundary should be preserved while coverage is improved.

## 11. Latency and work baseline

| Measure | Result |
|---|---:|
| Request latency p50 (nearest rank) | 26,125 ms |
| Request latency p95 (nearest rank) | 34,642 ms |
| Mean / maximum | 26,488 ms / 37,807 ms |
| OpenAI responses | 48 |
| Hosted web-search calls | 136 |
| Logical Serper operations | 652 |
| Physical Serper attempts | 652 |
| Market-scout input tokens | 816,955 |
| Market-scout output tokens | 70,363 |
| Total measured market-scout tokens | 887,318 |

Cost in currency is not reported because no authoritative per-request billing record was available. Token and call counts are direct telemetry, not price estimates.

## 12. Limitations

- V1 is one live attempt per case. It measures this exact run, not provider variance or repeatability across days.
- Product markets, prices, and availability drift; references are timestamped and must be versioned when refreshed.
- Reference matching is conservative name/brand/model matching. Renamed regional variants can be counted as misses even when closely related.
- Funnel loss stages are observational. “Candidate truncation or ranking” cannot be split further without behavior-neutral score/cutoff telemetry.
- Quality remains partly judgmental. Forty-two of 102 cards were grade-1/debatable rather than forced into strong/bad labels; all judgments retain source URLs and notes.
- Independent commerce audit coverage is limited: page 31/102, price 7/102, availability 4/102, and image 11 applicable cards. The exact denominators must accompany every reported rate.
- The 48-case suite is broad enough to resist one-category fixes but is not a census of consumer product search.
- A maximum of five production results makes top-7 quality unobservable in this baseline.
- HTTP 200 does not imply adequate results: eight successful requests returned no cards.
- The search cases and their reference-ID bindings share one frozen JSON file.
  The runner necessarily parses that container, but its source has no reference-
  field access and constructs a new request-only object before dispatch. Thus no
  expected identity reaches production; splitting the container would be a
  defense-in-depth improvement for a future version, not a scoring change to V1.

## 13. Recommended next root cause

The next accuracy phase should attack **request-time discovery coverage and the bounded path from compatible candidates into the nine-product verification set**, in that order. The evidence does not support starting with new final ranking weights: 80/142 leaders never appeared in discovery and 26/142 more disappeared before verification, versus only 10/142 lost after verification.

The next phase should preserve request-bound live research, use generalized query/source coverage changes rather than benchmark-answer lookup, and evaluate recall gains against Serper operations, latency, and precision. Recommended reasoning level: high for the experimental design and cutoff attribution, then medium for routine implementation and reruns.

Confidence: 0.94 that discovery coverage is the first generalized bottleneck. The conclusion would change if repeated runs showed most “never discovered” cases are provider volatility or if improved identity aliases reclassified a large share of the 80 misses.

## 14. Artifact map

- Specification and run rules: `benchmarks/accuracy-v1/README.md`
- Frozen requests: `benchmarks/accuracy-v1/searches.json`
- Frozen reference registry: `benchmarks/accuracy-v1/references.json`
- Source adjudication policy: `benchmarks/accuracy-v1/adjudication-decisions.json`
- Raw run and reproducibility seal: `benchmarks/accuracy-v1/results/baseline-raw.json`
- Exact measured production diff: `benchmarks/accuracy-v1/results/baseline-production.diff`
- Materialized adjudications: `benchmarks/accuracy-v1/results/baseline-adjudications.json`
- Machine-readable scored report: `benchmarks/accuracy-v1/results/baseline-report.json`
- Per-search human diagnostics: `benchmarks/accuracy-v1/results/baseline-diagnostics.md`
- Future comparison: `npm run benchmark:accuracy:compare -- --baseline=<baseline-report.json> --candidate=<candidate-report.json> --report-file=<comparison.json>`

PHASE 0 BENCHMARK: VALID

# Review Radar Accuracy Benchmark V1

## Purpose and decision

This benchmark measures the stabilized request-time Review Radar pipeline before
the next product-quality, discovery, or ranking phase. It is designed to decide
which generalized loss mechanism should be attacked first. It does not authorize
or contain a production ranking change.

The benchmark is offline evaluation data. Production code must never import its
search references, product identities, adjudications, or results. The live
runner sends only each frozen shopper request to the unchanged
`POST /api/recommendations` route. Reference data is loaded later by a separate
evaluation process.

## Frozen population

V1 contains 48 US-market searches and one scored attempt per search:

| Search type | Cases |
| --- | ---: |
| Broad / no criteria | 12 |
| Broad + budget | 8 |
| Hard specifications | 8 |
| Brand requirement or alternative | 4 |
| Size / dimension | 4 |
| Exclusion / wrong-type trap | 4 |
| Multiple constraints | 5 |
| Difficult / niche | 3 |

The cases cover appliances, kitchen products, cleaning, electronics,
computers, tools, outdoor equipment, furniture, fitness, home products, and
personal electronics. The suite was frozen before any V1 Review Radar run.

## Independent reference method

`references.json` was researched independently of V1 output and frozen before
execution. Each product is identified by brand, exact model and aliases and is
bound to at least two source families. Evidence favors current comparative or
lab testing, supplemented where needed by manufacturer identity/specification
evidence. A retailer star rating or one publication is not enough by itself.

Grades are deliberately coarse:

- 3: clear leader that should almost certainly be considered when eligible;
- 2: strong contender that belongs in a high-quality shortlist;
- 1: acceptable contender, but not required for leader recall; and
- 0: clearly bad, ineligible, or too weakly supported to deserve a result slot.

Eligibility is case-bound. Budget, required product type, features, sizes,
brands, exclusions, condition, and numeric specifications remain hard
constraints. A generally excellent product does not count when it violates the
shopper request. Market-sensitive research is timestamped. Ambiguity is
retained rather than converted into a false binary judgment.

Finite reference sets cannot prove that every unlisted product is bad.
Therefore every displayed but unlisted product receives a separate source-bound
adjudication after the run. Grade 1 preserves a debatable but reasonable result;
it remains in the precision denominator without being called strong. A run with
an unadjudicated or evidence-unbound displayed product is methodologically
invalid.

## Metrics

- **Market-leader discovery recall:** grade-2/3 eligible references observed in
  the sanitized discovered-candidate trace divided by all grade-2/3 eligible
  references.
- **Final market-leader recall:** grade-2/3 eligible references in displayed
  results divided by all grade-2/3 eligible references.
- **Top-result quality precision:** displayed products judged grade 2/3 divided
  by all non-ambiguous judged displayed products. The current public contract
  returns at most five products, so V1 measures top-k precision for k <= 5 rather
  than pretending seven slots exist.
- **NDCG@3:** coarse grade gain (3/2/1/0) discounted by position and normalized
  against the eligible reference ideal. The coarse scale avoids fake separation
  between excellent peers.
- **Hard-requirement violation rate:** independently adjudicated violations
  divided by displayed-product requirement opportunities, broken down by
  requirement class.
- **Result hygiene:** wrong product/accessory/non-product leakage, exact
  duplicate leakage, and model-family/variant duplicate leakage.
- **Commerce:** independently judged product-page identity, price,
  availability, and image correctness, each with an explicit denominator and
  unknown count.
- **Work and latency:** client latency p50/p95/maximum, Responses calls, hosted
  web searches, logical and physical Serper operations, and model token usage
  when telemetry supplies it.

Broad/no-criteria results are reported separately. Budget cases distinguish
price eligibility from relevance grade so later work can measure whether
quality within budget improves without relaxing the budget.

## Funnel and earliest-loss attribution

V1 adds development-debug-only candidate lineage. It records sanitized names
and URLs at the real current stages without changing searches, filters,
ordering, eligibility, or the public result:

1. discovered;
2. deduplicated;
3. prefiltered (plus prefilter rejection reason);
4. market/merchant compatible;
5. ranked verification slate;
6. page/commerce verified; and
7. returned.

For each grade-2/3 reference, the evaluator assigns the first missing stage.
The taxonomy is: never discovered, candidate deduplication, prefilter rejection,
merchant/market filter, candidate truncation or ranking, page/commerce
verification, final selection crowd-out, or returned. Aggregate production gate
totals retain the finer requirement, availability, price, condition, asset, and
page-resolution diagnostics.

## Run rules

1. Seal the branch, HEAD, production-file hashes, relevant dirty-file status,
   relevant working-tree diff hash, configuration constants, and start time.
2. Start one fresh local Next.js process. Next.js may ordinarily load the
   user-owned local environment; the benchmark never reads or prints it.
3. Execute each frozen case once, sequentially, with a 150-second timeout.
4. Preserve HTTP errors, malformed responses, timeouts, empty results, and
   provider failures. There are no automatic retries and no substitution.
5. Stop the server and atomically write the raw report.
6. In a separate process, bind the raw report to the frozen references and the
   source-bound displayed-product adjudication.
7. A future diagnostic rerun is a separate artifact and never replaces a V1
   score.

The authorized baseline command is:

```powershell
npm run benchmark:accuracy:run -- --approved-runs=48 --report-file=benchmarks/accuracy-v1/results/baseline-raw.json
```

Generate a run-bound adjudication template for a new run with:

```powershell
npm run benchmark:accuracy:evaluate -- --run-file=benchmarks/accuracy-v1/results/baseline-raw.json --write-adjudication-template=benchmarks/accuracy-v1/results/baseline-adjudications.json
```

For the preserved V1 baseline, materialize the reviewed, run-hash-bound policy:

```powershell
npm run benchmark:accuracy:adjudicate
```

Evaluate with:

```powershell
npm run benchmark:accuracy:evaluate -- --run-file=benchmarks/accuracy-v1/results/baseline-raw.json --adjudications=benchmarks/accuracy-v1/results/baseline-adjudications.json --report-file=benchmarks/accuracy-v1/results/baseline-report.json
```

Render per-search diagnostics with:

```powershell
npm run benchmark:accuracy:render-diagnostics -- --report-file=benchmarks/accuracy-v1/results/baseline-report.json --output-file=benchmarks/accuracy-v1/results/baseline-diagnostics.md
```

Compare a future candidate using the same scored-report schema:

```powershell
npm run benchmark:accuracy:compare -- --baseline=benchmarks/accuracy-v1/results/baseline-report.json --candidate=<candidate-report.json> --report-file=<comparison.json>
```

## Anti-leakage controls

- The live runner contains no reference-data path and strips every search case
  to request-only fields before dispatch.
- The evaluator, not the live runner, loads expected products.
- Production source has no import or path reference to V1 data.
- Unit tests fail if production files reference the benchmark or if the live
  runner mentions the reference registry.
- No reference product, brand, model, query, or grade enters a production
  prompt, request planner, candidate list, runtime lookup, or response.
- The benchmark directory is not an application route or startup input.

The request definitions and case-to-reference-ID bindings share one frozen JSON
container. The live runner parses that container but has no source-level access
to the reference field and immediately constructs a new object from an explicit
allowlist of request and diagnostic fields. The production HTTP request therefore
contains no expected identity. A future version may split the container as
additional process-level defense in depth; doing so is not a retroactive V1
scoring change.

## Comparison contract

Future versions should normally reuse V1 searches, references, adjudication
rules, and evaluator unchanged. A before/after comparison must bind both raw
runs, show metric numerators and denominators, compare the same case IDs, and
report external/provider time windows separately. Any search, reference,
grading, or metric change creates a new benchmark version or an explicit,
machine-readable documented delta; it must not rewrite V1.

The durable V1 artifacts are `results/baseline-raw.json`,
`results/baseline-production.diff`,
`results/baseline-adjudications.json`, `results/baseline-report.json`,
`results/baseline-report.md`, and `results/baseline-diagnostics.md`.

## Accepted Phase 1 comparison

Phase 1 reused the frozen searches, references, evaluator, integrity rules, and
one-attempt policy. The accepted exact-source raw artifact is
`results/phase1-accepted-v5-raw.json` with SHA-256
`9EC5744A37C5063B2B663ECCFAE9865B8AF7659EDC73E97A5605D77EF27208A6`.
Its run-bound adjudications, scored report, diagnostics, human report, and
baseline comparison are stored beside it with the `phase1-accepted-v5-` prefix.

The run completed 48/48 first attempts and is methodologically `VALID`.
Leader discovery improved from 62/142 to 77/142 and broad-search discovery from
19/36 to 24/36. Hard-requirement accuracy was 118/118; wrong-product leakage
was 3/77; family-duplicate leakage was 1/77. Empty results rose from 8 to 10,
precision fell from 50/102 to 24/77, NDCG@3 fell from 0.4082 to 0.3039, and
p50/p95 latency rose from 26,125/34,642 ms to 30,654/41,481 ms. These regressions
are part of the accepted evidence, not grounds for a retry or evaluator change.

Several earlier Phase 1 checkpoints were rejected when guardrails or exact-
source binding failed. They are diagnostic history and must not be substituted
for the accepted v5 result. Only v5 was produced after the full deterministic
wall passed on the same production source.

## Limitations

- A 48-case sample supports directional category and loss-stage conclusions,
  not universal product-market accuracy claims.
- Current prices, inventory, models, and expert consensus can change after the
  timestamp. V1 remains frozen for comparisons; a refreshed market standard is
  a new version.
- One attempt per case measures the observed baseline, not provider variance.
  Repeated calls, if later authorized, must be a separately labeled variability
  study.
- Expert testing and owner evidence can conflict, and some excellent products
  are necessarily absent from a finite registry. Ambiguous judgments stay out
  of binary precision denominators.
- Commerce validation is limited to evidence independently obtainable at the
  adjudication time. Blocked or dynamic pages are recorded as unknown, not
  silently treated as correct.

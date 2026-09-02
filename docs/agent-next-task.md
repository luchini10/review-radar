# ReviewRadar agent next task

Updated: 2026-09-02

## Current authority and exact snapshot

Phase 1, Request-Time Market Discovery Coverage, is complete in the local
working tree and has a methodologically `VALID` sealed V1 comparison. The
repository is on branch `main`, based on
`866c5fc9ab9ea72a135393d84f996189d13647c6` (`Record Serper-only restoration
evidence`). The authoritative Phase 1 source is the local commit containing
this handoff (resolve current `HEAD`); the exact live-run source is additionally
bound by per-file hashes inside the accepted raw artifact.

Accepted raw artifact:
`benchmarks/accuracy-v1/results/phase1-accepted-v5-raw.json`

SHA-256:
`9EC5744A37C5063B2B663ECCFAE9865B8AF7659EDC73E97A5605D77EF27208A6`

The run completed 2026-09-02 with one attempt per frozen case, no benchmark
retry or substitution, all displayed cards adjudicated, and no methodological
blockers. Several earlier Phase 1 checkpoints were rejected when guardrails or
exact-source binding failed; none is a substitute for v5.

No Phase 2 implementation or live spend is approved. Stop after Phase 1 and
wait for Taylor's explicit direction.

## Architecture and public contract

All research remains fresh and request-bound:

    shopper request
      -> POST /api/recommendations
      -> validation + deterministic requirement extraction
      -> fresh request-local market map
           - current market leaders
           - request-fit contenders
           - coverage-gap contenders
      -> independent bare-category + neutral request-fit Shopping
      -> targeted Shopping for strongest expected contenders
      -> path-fair candidate admission and nine-candidate slate
      -> adaptive page/commerce verification
      -> safety gates, existing post-gate ordering, distinct selection
      -> no-store minimal JSON

Current request ceilings are nine market-map targets (four market-leader,
three request-fit, two coverage-gap), two neutral Shopping queries, four
expected-target Shopping queries, three page queries, fifteen logical search
operations, forty normalized results per Shopping query, nine verification
candidates, and five displayed cards.

Research/editorial/list sources may establish an internal candidate identity
but can never become a final card. Final cards still require a safe, legitimate,
identity-compatible current product page, source-derived requirement evidence,
acceptable new-product condition, affirmative availability, trustworthy price
when required, and duplicate/family protections.

There is no production market index, prewarm, startup/background research,
saved recommendation, persistent evidence store, cross-request product cache,
benchmark lookup, product-specific answer table, or new commerce provider.
Request-local Maps and candidate state are discarded at return. The public card
remains image when safe, name, category, current USD price when trustworthy, and
View Product URL.

## Phase 1 behavior and observability

The scout prompt and schema are `phase1-request-market-map-v1`. The market map
separates expected contenders by purpose instead of emitting one undifferentiated
target list. Neutral queries stay brand/model neutral unless the shopper asked
for a brand/model. Candidate interleaving prevents one high-volume search family
from consuming the verification slate merely by returning first. Verification
continues in bounded waves only while unresolved candidates and operation budget
can add useful work.

Development diagnostics now establish:

- every serious candidate's discovery path or paths;
- accepted/rejected/missing expected targets and their target class;
- query execution, stop reason, raw results, normalization limit, dropped count,
  admitted count, and rejection reasons;
- candidate counts before and after each gate, path-fair slate selection, and
  limit-driven crowd-out;
- verification waves, cumulative accepted products, remaining operation budget,
  and page-query exhaustion; and
- distinct plausible products contributed by each discovery path.

Safety corrections generalized from rejected live checkpoints include separate
page-source specification evidence, alphanumeric sibling-model isolation,
TB/GB configuration normalization, named suffix/variant identity, rental/hire
exclusion, support/editorial destination exclusion, source-derived-only hard
requirements, primary-identity brand enforcement, and stronger model-family
deduplication. No benchmark product or answer is present in runtime logic.

## Accepted V1 comparison

| Metric | Phase 0 | Phase 1 | Change |
|---|---:|---:|---:|
| Leader discovery recall | 62/142 (43.66%) | 77/142 (54.23%) | +15, +10.57 pp |
| Broad-search discovery | 19/36 (52.78%) | 24/36 (66.67%) | +5, +13.89 pp |
| Final leader recall | 7/142 (4.93%) | 10/142 (7.04%) | +3, +2.11 pp |
| Empty searches | 8/48 | 10/48 | +2, worse |
| Top-K precision | 50/102 (49.02%) | 24/77 (31.17%) | -17.85 pp |
| NDCG@3 | 0.4082 | 0.3039 | -0.1043 |
| Hard-requirement accuracy | 163/172 (94.77%) | 118/118 (100%) | +5.23 pp |
| Wrong-product leakage | 6/102 (5.88%) | 3/77 (3.90%) | -1.98 pp |
| Model-family duplicate leakage | 4/102 (3.92%) | 1/77 (1.30%) | -2.62 pp |
| Product-page accuracy, checked | 25/31 (80.65%) | 19/23 (82.61%) | +1.96 pp |
| Latency p50 / p95 | 26,125 / 34,642 ms | 30,654 / 41,481 ms | slower |

Phase 1 used 48 Responses calls, 143 hosted searches, 672 logical and 667
physical Serper operations, 869,232 input tokens, and 89,107 output tokens.
Compared with Phase 0, this is seven additional hosted searches, twenty
additional logical operations, fifteen additional physical attempts, and
71,021 additional model tokens; Responses volume remained one per request.

## Proven loss attribution and next decision

Earliest loss across 142 frozen grade-2/3 references:

- never discovered: 65 (baseline 80);
- candidate truncation or ranking before the verification slate: 43 (baseline
  26);
- final-selection crowd-out: 9 (baseline 10);
- page/commerce verification: 6 (baseline 8);
- prefilter: 5 (baseline 6);
- merchant/market filter: 3 (baseline 2);
- candidate deduplication: 1 (baseline 3); and
- returned: 10 (baseline 7).

The primary objective improved: fifteen additional leaders entered discovery.
The main bottleneck is now compatible-candidate survival into the verification
slate. Phase 2 should, if approved, determine why path-fair admission still
loses 43 discovered leaders and why empty results rose to ten before changing
final ranking weights. The precision/NDCG decline must remain visible; it may
partly reflect newly admitted weak cards and fewer returned cards, but that is
an inference, not yet a verified cause.

Recommended reasoning level: high for Phase 2 attribution/design because it
crosses candidate diversity, identity, safety, latency, and cutoff behavior;
medium for routine implementation once the causal rule is proven. Do not
default to maximum reasoning for mechanical follow-up.

## Current verification

- `npm test`: 376/376 across 45 suites.
- `npm run typecheck`: pass.
- `npm run lint`: pass with zero warnings/errors.
- `npm run build`: pass, Next.js 16.3.3; routes `/`, `/_not-found`, and
  `/api/recommendations` only.
- `npm run test:e2e`: 7/7 Chromium desktop/mobile.
- Benchmark integrity: pass inside the unit wall.
- Accepted sealed benchmark: 48/48 first attempts, evaluator `VALID`, all 77
  displayed products adjudicated and run-hash bound.

These checks ran against the exact production source used for accepted v5.
Documentation-only closeout changes followed; `git diff --check` and final Git
review must pass before commit.

## Flag and provider state

The tracked `REVIEW_RADAR_CONSTRAINT_ALLOCATION` flag remains default `off` in
checked-in examples. The user-owned local override remains unknown because
`.env.local` was not manually inspected. Next.js ordinarily auto-loaded the
local environment during approved dev/build/benchmark execution; no secret was
printed or copied.

The accepted runtime used `gpt-5.4-mini` at low reasoning, at most three hosted
searches, fifteen logical Serper operations, nine verification candidates, and
five displayed cards. Provider use is established from captured telemetry.
Serper remains the sole commerce transport.

## Hard boundaries and incident record

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Next.js may auto-load it during ordinary build/dev startup; its contents are not
evidence.

Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`. Suppress untracked enumeration and use
explicit path-scoped searches.

During earlier stabilization/Phase 0 work, broad status listings printed
protected fixture path names. During Phase 1, one broad text search over the
tests tree also printed protected path names and a truncated fixture excerpt
before the boundary violation was recognized. That material was not used to
design, tune, adjudicate, or verify the implementation, and no protected file
was directly opened or modified. Future inspection must keep the directory
excluded.

Do not start Phase 2, dispatch live spend, push, deploy, release, change
production data, add a major dependency/provider, change the public API, or
discard unrelated user work without explicit authority. The Phase 1 local
commit was explicitly authorized; no other external write is authorized.

## Evidence pointers

| Evidence | Location |
|---|---|
| Human Phase 1 report | `benchmarks/accuracy-v1/results/phase1-accepted-v5-report.md` |
| Machine scored report | `benchmarks/accuracy-v1/results/phase1-accepted-v5-report.json` |
| Raw run and exact-source seal | `benchmarks/accuracy-v1/results/phase1-accepted-v5-raw.json` |
| Baseline comparison | `benchmarks/accuracy-v1/results/phase1-accepted-v5-comparison.json` |
| Per-search diagnostics | `benchmarks/accuracy-v1/results/phase1-accepted-v5-diagnostics.md` |
| Run-bound adjudications | `benchmarks/accuracy-v1/results/phase1-accepted-v5-adjudications.json` |
| Frozen method and run rules | `benchmarks/accuracy-v1/README.md` |
| Baseline report | `benchmarks/accuracy-v1/results/baseline-report.md` |
| Architecture | `ReviewRadar-Overview.md` |
| QA record | latest Phase 1 entry in `docs/qa-loop-results.md` |
| Roadmap authority | top Phase 1 section in `docs/forward-roadmap.md` |
| Durable test contracts | top Phase 1 entry in `docs/review-radar-test-memory.md` |
| Meaningful changes | top 2026-09-02 entry in `docs/change-log.md` |
| Run summary | latest Phase 1 entry in `docs/Agent Run Summary.md` |

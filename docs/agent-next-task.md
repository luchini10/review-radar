# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently verified PR-3K staged
lifecycle. This file was regenerated from current evidence. The current
approved base is the self-contained PR-3K closeout commit containing this file;
resolve its exact full SHA with `git rev-parse HEAD`. Its expected parent is
`8c57cd594a7f060aa358afedb0e1baab429a5d89`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path remains default-
off and undeployed. It has now produced one safe shopper result, which closes
one-lifecycle feasibility but does not establish accuracy, repeatability,
latency distribution, category coverage, or production authority.

PR-3K spent exactly one frozen `shop vac` lifecycle at clean PR-3J commit
`8c57cd594a7f060aa358afedb0e1baab429a5d89`. Research, deterministic
verification, presentation, and public-response rendering completed in 116.495
seconds. The route returned four eligible cards, zero close matches, six
exclusions, and eight source entries representing four unique HTTPS URLs; every
card reference and commerce URL resolves.

The single first-terminal run used:

- two OpenAI creates and 40 retrieves;
- eight hosted searches;
- 10 Serper Shopping calls returning 156 rows;
- 20 source-page fetches, 14 successful, and 25 physical HTTP attempts;
- 77,273 input tokens, zero cached input, and 9,064 output tokens;
- approval-envelope cost `$0.409142`, frozen-conservative cost `$0.457438`,
  and informational current estimate `$0.343314`.

Retry, replacement, fallback, organic, SearchAPI, second-case, and safety-
cancel counters were zero. All 10 submitted candidates were accepted and
deferred for missing source-title metadata; zero were rejected and every
affirmative mismatch family stayed zero. The first-loss distribution was five
asset-identity exclusions, one missing/invalid-product-URL exclusion, and four
no-loss eligible candidates. Relationship and hard-requirement first losses
were zero. These aggregates do not reveal candidate/source mappings or whether
one or both exact sources were titleless.

The exact untracked artifact is the 51,640-byte evidence-v6 `result.json` in
`tests/fixtures/review-radar-live/oai-t10-phase-d-8c57cd5`, SHA-256
`9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
Independent strict read-only audit returned exact verdict `VERIFIED`, no
findings, confidence 0.99. It authenticated the exact commit, case, schema,
sequence, counters, usage, cost, public reconciliation, privacy, clean tracked
state, and default-off behavior. The directory is immutable and spent. The
main agent must never inspect, enumerate, edit, retry, stage, reuse, or add to
it.

PR-3J remains the deterministic trust base: contract v9, research schema v5,
prompt v6, runtime v8, and evidence v6. Its tri-state source preflight accepts
title-proven exact sources, defers title-unavailable exact sources only to the
existing bounded DNS-pinned page/entity verifier, and quarantines only all-
affirmative mismatches. Deferral grants no evidence or eligibility. Exact URL
ownership, two fetch-distinct sources per candidate, the 30-fetch ceiling, and
all downstream identity/evidence/commerce/requirement/asset/public gates remain
unchanged.

Official Responses documentation defines the complete consulted-source action
as URL-only records; cited annotations can carry titles, but action-source
titles are not guaranteed. No documented stable text-result title schema was
found that should become a trust boundary.

## Current proof and limits

| Check | Result |
| --- | --- |
| PR-3J fail-first | 58 passed / exactly 5 intended failures |
| Corrected staged/shared trust wall | 169/169 across 15 suites |
| Complete deterministic suite | 1,498/1,498 across 214 suites |
| Five named worker partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Playwright E2E | 17/17 |
| Nonincremental typecheck and production build | passed |
| Deterministic eval and fixed ranking comparison | passed |
| Lint | zero errors; same three pre-existing warnings |
| Independent PR-3J source review | `APPROVED`; no findings; confidence 0.96 |
| PR-3K terminal artifact audit | `VERIFIED`; no findings; confidence 0.99 |
| PR-3K public result | 4 cards; 8 source entries; 4 unique HTTPS URLs; all card references resolve |
| PR-3K retry/replacement/fallback/second case | all zero |

The independent PR-3J reviewer disclosed that an attempted filtered command
unexpectedly executed an existing test that reads tracked public
`.env.example`. That entire 92-test run is excluded from proof. No `.env.local`,
credential, secret value, live fixture, or network was accessed; the source
verdict rests on the permitted diff and traced control flow.

Earlier overbroad searches traversed live-fixture paths and exposed only known
terminal keys or fixed rejection tokens. No private identity, body, prompt, or
credential was displayed. Every repository search must exclude
`tests/fixtures/review-radar-live/**`.

## Objective and decision frame for the next phase

The product objective is to return the strongest genuinely suitable products
with truthful constraints and evidence at acceptable latency and cost. PR-3K
proves the staged architecture can complete once. The proven bottleneck is now
measurement integrity for current staged-path accuracy and repeatability, not
lifecycle feasibility.

Verified facts:

- `scripts/qualityScorecard.mjs` and `scripts/qualityConsistencyHarness.mjs`
  call the legacy `/api/recommendations` route, not the staged path.
- `scripts/goldBenchmark.mjs` uses a frozen July 2026 leader set that may have
  drifted.
- one staged `shop vac` result exists, but there is no repeated or cross-
  category staged baseline.

Engineering judgment:

- a broad live matrix now would spend against the wrong or stale scoring
  boundary and could not support a trustworthy before/after claim;
- a small, dated, reviewable current-truth set plus a staged-specific harness is
  the strongest prerequisite to useful live measurement;
- current truth must distinguish must-consider leaders from illustrative
  products and preserve uncertainty rather than manufacture a single ranking.

Uncertainty:

- the categories and current products that best discriminate discovery,
  constraint truth, and no-exact behavior still require current-source review;
- the safe aggregate live budget and repetition count must be derived from the
  frozen case plan and PR-3K accounting, then independently reviewed.

**Recommended reasoning level:** High for market-truth, metric, and trust-
boundary design; Medium for routine harness implementation and deterministic
execution.

## Current approved phase: PR-4A current truth and staged measurement boundary

Taylor's production-readiness mandate authorizes this zero-live design and
implementation phase. It does not authorize a new staged lifecycle, live
matrix, flag promotion, deployment, or publication.

1. Authenticate this repository, branch `main`, exact PR-3K closeout HEAD and
   parent, clean tracked/index state, clean `next-env.d.ts`, committed default-
   off flags, and preserved user-owned untracked files.
2. Inspect only the staged request/public/evidence contracts and the legacy
   quality harnesses needed to establish the routing gap. Exclude the entire
   live-fixture tree from every search and never open a spent artifact.
3. Refresh a deliberately small current-market truth set from dated,
   attributable sources. Record provenance, inclusion rationale, identity,
   constraints, and uncertainty. Do not treat retailer rank, search position,
   or one editorial list as ground truth.
4. Freeze versioned case definitions spanning broad, constrained, adversarial,
   and over-constrained behavior only when each case materially tests a distinct
   failure mode. Keep request inputs within the existing staged contract.
5. Build a zero-network staged-specific scoring and reconciliation harness. It
   must consume only tracked synthetic/frozen schemas, never call an API route,
   provider, product-data service, or live fixture.
6. Define before any live result exists: leader/coverage truth, exact/near
   status truth, hard-requirement and wrong-type failures, source/price/card
   reconciliation, candidate/final Jaccard, first-loss conservation, latency,
   calls, tokens, cost, privacy, and terminal stop rules.
7. Add fail-first and mutation coverage for missing/duplicate/unknown cases,
   fabricated outcomes, identity drift, requirement violations, malformed
   accounting, and incomparable repetitions. Run focused checks, then the
   complete deterministic wall justified by the implementation.
8. Obtain independent read-only source/diff review of the truth and harness.
   Correct findings, regenerate this handoff, update authoritative records, and
   make one self-contained local commit with explicit paths.
9. Do not begin PR-4B until PR-4A is clean, independently approved, and its
   bounded low-parallelism live plan and aggregate ceiling are explicit.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` is user-owned. Never edit, stage, print,
hash, or copy it. PR-4A permits no new provider or product-data request and no
credential check is needed. Web research for current truth must remain read-
only and attributable; it is not authority to change external state.

## Outstanding readiness debts

- PR-006: current staged leader recall, card truth, hard-requirement accuracy,
  final-set stability, price coverage, first-loss distribution, latency, calls,
  tokens, and cost remain unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before the experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- Broader cancellation/fault behavior, cache/concurrency, security,
  accessibility, mobile UX, production configuration, rollback, dependency,
  observability, and operational gates remain planned.

PR-013 is closed only as one-lifecycle feasibility. PR-020 is live-revalidated
as the title-metadata correction. Neither status proves production readiness.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, or add to any spent Phase D
  attempt or directory, including `oai-t10-phase-d-8c57cd5`,
  `oai-t10-phase-d-bd54de9`, `oai-t10-phase-d-ac53c10`,
  `oai-t10-phase-d-bf7e37b`, `oai-t10-phase-d-a743426`,
  `oai-t10-phase-d-43857e0`, `oai-t10-phase-d-ec528d7`,
  `oai-t10-phase-d-a15d935`, `oai-t10-phase-d-140d465`,
  `oai-t10-phase-d-56a5137`, `oai-t10-phase-d-b01c335`, and
  `oai-t10-phase-d-06fa55f`. Exclude the whole live-fixture tree from search.
- PR-4A permits no staged, provider, Serper, product-data, live-route, replay,
  retry, replacement, fallback, or second-case invocation.
- Do not infer candidate/source mappings, product truth, leader coverage, or
  repeatability from PR-3K's closed aggregate or public cardinalities.
- Do not weaken source ownership, title/model/type, page/entity, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries to improve a score.
- Do not let a truth fixture, scoring count, prior recommendation, retailer
  popularity, or model-authored title authorize eligibility.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  ignored worker results, historical live fixtures, or any Phase D artifact.
  Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, sequence, exit criteria, PR-4A scope | `docs/production-readiness-master-plan.md` |
| PR-3K canonical verification | latest PR-3K entry in `docs/qa-loop-results.md` |
| Staged architecture and sequence | OAI-T10 section in `docs/forward-roadmap.md` |
| Staged request/contract | `lib/stagedTerraContract.ts`; `lib/stagedTerraRecommendationRoute.ts` |
| Staged runtime and Phase D evidence capture | `lib/stagedTerraRuntime.ts`; `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Legacy measurement gap | `scripts/qualityScorecard.mjs`; `scripts/qualityConsistencyHarness.mjs`; `scripts/goldBenchmark.mjs` |
| Durable live/trust rules | top entries in `docs/review-radar-test-memory.md` |
| Existing deterministic benchmark integrity | `tests/fixtures/qa-benchmark-matrix-v1.json`; `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |

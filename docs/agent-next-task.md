# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the verified zero-live PR-3 correction.
The current approved base is the self-contained PR-3 closeout commit containing
this file; resolve its exact full SHA with `git rev-parse HEAD`. Its expected
parent is `d6ca1fcb4db60525054e2973dc4ba17488191a1c`.

## Current state

ReviewRadar is **not production-ready**.

PR-3 closes the deterministic evaluation-integrity blocker. Five named batches
now uniquely partition ten tracked cases and 29 invariants across broad,
constrained, over-constrained, wrong-type/accessory, fake-price, non-product-
page, duplicate-family, compatibility, and missing-evidence shapes. Every
candidate has explicit tracked price/product ground truth. Workers persist
declared/executed case IDs and every outcome; reconciliation rederives them
from persisted exact/near streams and the tracked manifest.

Missing, duplicate, unknown, mismatched, malformed, fabricated, or incomparable
work fails closed. Authentic historical failing streams remain valid before
evidence after a production fix. Unknown direct worker modes and missing
verifier paths fail closed. The legacy evaluator remains byte-unchanged and is
a separate compatibility check.

The controller writes next-task suggestions only to ignored worker artifacts.
It cannot overwrite this handoff and does not copy repository Markdown to
Desktop. No production app/library, recommendation, provider, flag, UI, or
external-data behavior changed in PR-3.

The staged Terra path remains default-off, undeployed, and without a
user-visible live result. The latest provider result remains PR-2I: one clean
commit-pinned `shop vac` response completed research with 47 canonical sources
but failed local validation as
`research_candidate_invalid / candidate_facts` before verification,
presentation, or rendering. PR-2J closed a separate reproduced candidate-local
source-reference mismatch offline; it did not prove model adherence or staged
lifecycle feasibility.

## PR-3 proof and limits

| Check | Result |
| --- | --- |
| Fail-first worker suite | 9 pass / exactly 1 intended fail |
| Corrected harness/mutation tests | 26/26 |
| Tracked benchmark | 10/10 cases; 29/29 invariants |
| Five-batch reconciliation | exact unique partitions; pass |
| Complete deterministic suite | 1,477/1,477 across 214 suites |
| Credential-neutral E2E | 17/17 |
| Static/build/eval/ranking/dry-run/diff | pass |
| Lint | 0 errors / 3 pre-existing warnings |
| Independent corrected-snapshot review | `APPROVED`; 26/26 personal focused run |
| Live/provider/product-data calls | none |

Independent review required four material corrections: derive price/product
failures instead of trusting worker fields; reject unknown direct worker modes;
reject every missing verifier path; and preserve historical-before
comparability instead of replaying old evidence under fixed current code. The
final review found no actionable issue.

The matrix is synthetic and its candidate oracles are manually maintained.
Ignored worker artifacts are reconciled but not cryptographically immutable.
PR-3 improves evaluation validity only; it establishes no live accuracy,
market coverage, latency, cost, provider adherence, or lifecycle improvement.

## Objective and decision frame for the next phase

The earliest remaining dependency is PR-013 staged lifecycle feasibility. A
broad active-path benchmark is required, but PR-4 explicitly depends on one
complete staged lifecycle. Another offline producer change would be speculative
without a reproduced failure, and weakening evidence/asset gates to manufacture
a result is prohibited.

The strongest next step is therefore one frozen, commit-pinned Phase D
revalidation of the broad `shop vac` case. It answers the dependency with the
smallest useful live envelope: one case, first terminal result, no retry,
replacement, fallback, second case, organic/SearchAPI request, promotion, or
deployment. If it fails, retain the exact bounded first loss and correct only a
separately reproduced generalized cause. If it succeeds, PR-4 can measure
accuracy/stability across the trusted matrix.

**Recommended reasoning level:** High for live trust, cost, privacy, and
terminal-evidence adjudication; Medium for the bounded mechanical execution.

## Current approved phase: PR-3A one staged lifecycle revalidation

1. Authenticate this intended repository, `main`, exact PR-3 HEAD/parent, clean
   tracked/index state, clean `next-env.d.ts`, committed default-off flags, and
   unchanged user-owned untracked artifacts.
2. Read the Phase D and staged trust contracts in
   `docs/review-radar-test-memory.md`; inspect the current runner dry-run. Check
   only boolean presence/safe shape of required server credentials—never print,
   copy, hash, or stage their values.
3. Confirm the new commit-derived output directory does not exist and no spent
   Phase D directory will be read, edited, retried, staged, or reused.
4. Run exactly one `scripts/run-oai-t10-phase-d.mjs --execute` invocation bound
   to the current full commit and these unchanged ceilings:
   `openAiCreates=2`, `hostedSearches=10`, `openAiRetrieves=60`,
   `safetyCancels=1`, `serperShoppingAttempts=15`, `sourcePageFetches=30`,
   `sourcePageHttpAttempts=90`, and `hardCeilingUsd=3`.
5. Stop at the first terminal route/result state. Do not retry, replace, add a
   case, fall back, or continue downstream after a terminal failure. The single
   invocation spends this phase's live authority whether it succeeds or fails.
6. Validate exact commit/case/schema, counters, usage, cost, hashes,
   privacy/credential exclusions, first-loss/verification conservation, and a
   shopper result when present. Treat the new artifact as immutable spent
   evidence immediately.
7. Obtain independent read-only audit of the exact artifact and clean tracked
   state. A complete result requires the requested terminal `VERIFIED`; a
   failure remains evidence and does not authorize a retry.
8. Update the living plan and authoritative records. If a generalized defect is
   newly reproduced, define a separate zero-live correction with fail-first
   tests. If lifecycle succeeds, authorize PR-4 bounded accuracy measurement.
9. Keep any live artifact untracked. Commit only phase-owned documentation or a
   separately verified deterministic correction; never stage live evidence.

Taylor's 2026-08-29 production-readiness mandate explicitly authorizes bounded
low-parallelism live QA without another prompt. This phase applies that authority
only through the stricter frozen runner envelope above. It does not authorize a
second invocation or any broader live matrix.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` is user-owned and locally enables Direct
Terra. Never edit, stage, or print it. The Phase D frozen conservative ceiling
is `$3`; current pricing is informational and cannot widen that approval wall.

## Outstanding readiness debts

- PR-006: current leader recall, final-set stability, hard-requirement truth,
  latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before the experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; no live attempt has
  reached presentation/rendering and no post-PR-2J provider result exists.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or directory,
  including `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`,
  `oai-t10-phase-d-b01c335`, and `oai-t10-phase-d-06fa55f`.
- PR-3A permits exactly one new frozen Phase D invocation at the clean PR-3
  commit. No retry, replacement, second case, broader live QA, or approval reuse.
- Do not claim PR-2J caused PR-2I or that PR-3 improved product quality.
- Do not restore raw lead URLs, response-global index lookup, prompt-only
  cardinality, or cross-candidate borrowing. Runtime range/uniqueness and exact
  source ownership remain mandatory.
- Do not weaken brand, model, product type, relationship, requirement,
  availability, price, source/page, commerce, asset, redirect, private-network,
  diagnostic, or public-response boundaries.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  ignored worker results, historical live fixtures, or any Phase D fixture.
  Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, sequence, exit criteria, PR-3A scope | `docs/production-readiness-master-plan.md` |
| PR-3 canonical verification | latest 2026-08-29 PR-3 entry in `docs/qa-loop-results.md` |
| Durable benchmark/reconciliation contract | top of `docs/review-radar-test-memory.md` |
| Matrix and batch ownership | `tests/fixtures/qa-benchmark-matrix-v1.json`; `docs/agent-batches/*.json` |
| Worker/controller/verifier | `scripts/qa-worker.mjs`; `scripts/agent-loop-controller.mjs`; `scripts/verify-loop-result.mjs` |
| Current tracked benchmark | `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |
| Legacy compatibility evaluator | `scripts/eval-pipeline.mjs` |
| Phase D runner and ceilings | `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Staged lifecycle/privacy contracts | staged sections in `docs/review-radar-test-memory.md` and `docs/forward-roadmap.md` |

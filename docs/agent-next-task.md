# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the verified zero-live PR-2J correction.
The PR-2J documentation closeout is current HEAD after its self-contained
commit; resolve the exact SHA with `git rev-parse HEAD`. Its parent is
`19e112642cab134e5514453e3723aa5e2a52942b`.

## Current state

ReviewRadar is **not production-ready**.

The staged Terra path remains default-off, undeployed, and without a
user-visible live result. The latest provider evidence is still PR-2I: one
clean commit-pinned `shop vac` response completed research with 47 canonical
sources but failed local validation as
`research_candidate_invalid / candidate_facts` before Shopping, verification,
presentation, or rendering. Its exact private fact defect is unknowable.

PR-2J closes a separate generalized producer/parser mismatch offline.
Candidate `source_urls` remains the exact response-owned registry for each
candidate; requirement and fact leads now use zero-based indexes into their
enclosing candidate list. Closed schema variants enforce requirement status
cardinality, while runtime independently enforces integer values, actual
candidate-range bounds, uniqueness, and exact URL mapping. Contract v5,
research schema v3, prompt v4, and runtime v4 roll the complete job identity.
Existing token verification rejects old prompt versions and recomputes the
current contract fingerprint, so old in-flight work fails closed.

No downstream source, evidence, requirement, relationship, page, commerce,
price, asset, eligibility, ranking, presentation, public-response, diagnostic,
network-ceiling, or default-flag rule changed. PR-2J ran no live request and
does not establish Terra adherence, lifecycle feasibility, recommendation
quality, latency, or cost.

## PR-2J proof and limits

| Check | Result |
| --- | --- |
| Fail-first contract | 23 pass / exactly 7 intended fail |
| Corrected contract | 31/31 |
| Full staged subsystem | 75/75 across 10 suites |
| Complete deterministic suite | 1,460/1,460 across 209 suites |
| Credential-neutral E2E | 17/17 |
| Randomized token mutation | 50/50 repeated runs |
| Static/build/eval/ranking/dry-run/diff | pass |
| Lint | 0 errors / 3 pre-existing warnings |
| Independent corrected-snapshot review | `APPROVED`; 72/72 personal rerun |
| Live/provider/product-data calls | none |

The initial independent review required two real corrections: express
supporting/conflicting/not-found cardinality in the provider schema with nested
closed variants, and prove a non-first candidate maps against its local source
array under reversed response-registry order. The reviewer then reproduced a
randomized test flake where a fixed tamper character could equal the original;
the test now guarantees a different character. Final review reported no
actionable findings.

The correction proves only that the reproduced raw-lead, local-index, and
status-cardinality mismatches are closed. It does not prove that any one was
PR-2I's hidden private defect. Never make that inference.

## Objective and decision frame for the next phase

The next evidence bottleneck is evaluation validity. Five named deterministic
QA batches currently report different category/search pools while executing
the same shared synthetic evaluator. That can make green output overstate
coverage and cannot support the cross-category accuracy claims required by the
production-readiness mandate.

Stronger alternatives considered:

- A new staged live attempt would measure lifecycle feasibility, but it would
  not repair the false deterministic coverage claim and should not become a
  substitute for a trustworthy benchmark.
- Renaming the batches or removing their metadata would make reporting less
  misleading but would not create the missing test coverage.
- Duplicating bespoke scripts per batch is rejected because their invariants
  would drift and become expensive to audit.
- A tracked manifest-driven benchmark matrix with explicit case IDs,
  partitions, fixtures, and invariant results is preferred. Each named batch
  must report the cases it actually executes, while shared evaluation helpers
  remain reusable.

**Recommended reasoning level:** High for benchmark validity, partitions,
invariants, and mutation tests; Medium for localized harness/fixture plumbing.

## Current approved phase: PR-3 real offline benchmark matrix

1. Authenticate the intended repository, exact parent/HEAD, tracked/index
   cleanliness, clean `next-env.d.ts`, default-off flags, and unchanged user
   artifacts.
2. Trace the deterministic controller, worker, batch definitions, shared
   evaluator, fixture loaders, reconciliation, and report output. Record the
   exact executed case IDs for two differently named batches before changing
   code.
3. Add fail-first tests proving that named batches currently execute the same
   cases while reporting different search/category metadata. Do not treat a
   metadata-only difference as coverage.
4. Define the smallest reusable tracked benchmark matrix that covers materially
   distinct broad, constrained, over-constrained, wrong-type/accessory,
   fake-price, non-product-page, duplicate-family, compatibility, and missing-
   evidence shapes. Prefer invariant assertions and reviewed acceptable sets
   over brittle exact winners.
5. Make each named batch select and execute its declared case IDs through
   shared helpers. Persist executed IDs and per-case invariant outcomes so
   controller reconciliation can fail closed on missing, duplicated, unknown,
   or mismatched work.
6. Preserve existing legacy evaluation behavior unless a fail-first defect
   requires a scoped correction. Do not change production discovery, ranking,
   product acceptance, prices, evidence gates, flags, or external providers in
   PR-3.
7. Run focused harness/mutation tests, deterministic batch reconciliation, the
   complete unit suite, typecheck, lint, production build, credential-neutral
   E2E, eval, ranking, zero-network staged dry run, and diff checks. Restore
   generated `next-env.d.ts` with a scoped patch if required.
8. Obtain independent read-only review of the exact diff and the claimed case
   coverage. Correct every finding before closeout.
9. Update authoritative records, fully regenerate this handoff, stage only
   exact phase-owned tracked files, and make one self-contained local commit.

PR-3 is zero-live. No OpenAI, hosted-search, Serper, SearchAPI, Shopping,
source-page, or other product-data request is authorized in this phase.

## Approval and flag state

Taylor's 2026-08-29 production-readiness mandate authorizes scoped local
implementation, bounded low-parallelism live QA, documentation, and
self-contained local commits. It does not authorize deployment, production
mutation, push, publication, secret exposure, destructive cleanup, or unrelated
external spending.

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` remains user-owned and locally enables
Direct Terra. Never edit, stage, or print it.

## Outstanding readiness debts

- PR-005: active next phase; named deterministic QA workers execute the same
  shared synthetic evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
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
- PR-3 is zero-live. Do not make an OpenAI, hosted-search, Serper, SearchAPI,
  Shopping, source-page, or other product-data request.
- Do not claim PR-015 caused PR-2I or that PR-2J improved live accuracy,
  latency, cost, model adherence, or lifecycle feasibility.
- Do not restore raw lead URLs, response-global index lookup, prompt-only
  cardinality, or cross-candidate borrowing. Runtime range/uniqueness and exact
  source ownership remain mandatory even where the schema constrains shape.
- Do not weaken brand, model, product type, relationship, requirement,
  availability, price, source/page, commerce, asset, redirect, private-network,
  diagnostic, or public-response boundaries.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or any Phase D fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phase sequence, exit criteria, PR-3 scope | `docs/production-readiness-master-plan.md` |
| PR-2J canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable source-reference contract | top of `docs/review-radar-test-memory.md` |
| Current batch/controller path | `scripts/agent-loop-controller.mjs`; `scripts/qa-worker.mjs` |
| Tracked named-batch definitions | `docs/agent-batches/*.json` |
| Shared deterministic evaluator | `scripts/eval-pipeline.mjs` |
| Existing harness regression surface | `tests/qaWorker.test.mjs` |
| QA result verification/reporting | `scripts/verify-loop-result.mjs`; `docs/agent-loop-report.md` |
| Existing fix protocol | `docs/agent-fix-template.md` |
| Current staged source contract | `lib/stagedTerraContract.ts`; `lib/stagedTerraPrompt.ts`; `lib/stagedTerraRuntime.ts` |
| Source-contract/token regressions | `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraIntegration.test.mjs` |

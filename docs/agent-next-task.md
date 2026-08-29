# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2B pricing-evidence v2 correction.
Use `git log -1` after phase closeout for the exact self-contained PR-2B commit.

## Current state

ReviewRadar is **not production-ready**.

The production-readiness sequence has completed these local phases:

- PR-0/PR-1 at `a15d935747313f9a87a3b145caa34ad6d2f6c8b6` made
  E2E credential-neutral, retained only closed research validation classes,
  and counted provider-terminal usage after local failure.
- PR-2 at `03367c098601efc1582d58e86e103a72390742f2` recorded one
  commit-pinned `shop vac` live attempt. Terra completed research, but the route
  failed closed as `research_candidate_invalid` before verification,
  presentation, Shopping, page fetching, or rendering.
- PR-2A at `adbac26fb893269555f7d92df0b2b5df222d9a09` corrected a
  generalized v1 schema/runtime mismatch. Contract v2 makes candidate/fact IDs
  server-owned, canonicalizes the exact requirement-ID set, aligns
  non-whitespace rules, and retains only a guarded candidate field-group reason.
- PR-2B is locally verified and independently `APPROVED`. It separates the
  frozen 2026-07-25 approval envelope from a dated 2026-08-29 current estimate
  and leaves the hard spending gate unchanged.

PR-2B plan and sanitized evidence schema v2 use:

- `approvalEnvelopeUsd` for the frozen nominal calculation;
- `approvalEnvelopeConservativeUsd` for the frozen cache-write-conservative
  calculation and the only `$3` gate input; and
- `currentEstimateUsd` for the dated `standard_non_regional` estimate.

The frozen short-context rates remain `$2.50` input, `$0.25` cached input, and
`$15` output per million; the dated current rates are `$2.00`, `$0.20`, and
`$12`. Both cards explicitly model the 272K threshold, 1.25x cache writes, and
`$0.01` hosted searches. A lower current estimate cannot authorize more spend.
Historical v1 fixtures remain immutable.

Final PR-2B verification:

- fail-first: 5 pass / 5 intended fail;
- focused Phase D runner: 10/10;
- staged subsystem: 56/56 across ten suites;
- complete suite: 1,440/1,440 across 209 suites;
- E2E: 17/17 on the credential-neutral dedicated server;
- typecheck, production build, deterministic eval, fixed ranking comparison,
  Phase D zero-network dry run, and diff checks: pass;
- lint: zero errors and three pre-existing warnings; and
- independent read-only review: `APPROVED`; the reviewer personally reran
  10/10 focused tests and inspected the full scoped runner/accounting path.

No provider, search, Shopping, or page request ran during PR-2B. The change
improves evidence integrity only. Staged lifecycle feasibility, active-path
accuracy, market-leader recall, stability, latency, and shopper-result quality
remain unproven.

## Objective and decision frame for the next phase

The next proven bottleneck is staged contract-v2 lifecycle feasibility, not
ranking or legacy discovery. The latest live attempt failed before either could
run. A broad benchmark now would spend more while conflating feasibility with
quality; more prompt/schema changes would be speculative after all deterministic
contract checks passed.

The strongest information-per-risk step is PR-2C: exactly one new-commit,
new-directory attempt of the frozen broad `shop vac` case through the complete
staged route. Stop at the first terminal outcome. Do not retry, replace, fall
back, or add a second case.

Verified facts:

- Both previous Phase D attempts and their evidence directories are spent.
- Contract v2 and cost-evidence v2 are deterministic-green and independently
  approved.
- The staged route and all experimental flags remain committed default-off.

Engineering judgment:

- One attempt is sufficient to decide whether the corrected contract can reach
  deterministic verification and presentation.
- A completion is feasibility evidence only, not production-readiness or
  recommendation-quality proof.

Uncertainty:

- Provider variance may still yield a different terminal result.
- If another candidate failure occurs, only the closed class/subreason—not raw
  output—may guide the next offline correction.
- No current market-quality conclusion is available until feasibility passes
  and the offline benchmark matrix becomes trustworthy.

**Recommended reasoning level:** High for adjudicating the terminal trust,
privacy, usage, and feasibility evidence. The mechanical runner execution is
routine and does not justify a more expensive level by itself.

## Current approved phase: PR-2C

Before live execution:

1. Create the PR-2B self-contained local commit and confirm a clean tracked
   tree; preserve every user-owned untracked artifact.
2. Pin the full commit and require a new commit-specific output directory that
   does not exist.
3. Confirm process-only OpenAI and Serper keys are present without printing
   values. Do not edit or source `.env.local` into evidence.
4. Run the Phase D dry run with the exact full commit and every existing
   create/search/retrieve/cancel/page/HTTP/cost ceiling.
5. Confirm no previous attempt, fixture, response, or evidence path will be
   reused.

During execution:

- one frozen broad `shop vac` request only;
- at most two Terra creates, ten hosted searches, sixty retrieves, one safety
  cancel, fifteen Shopping attempts, thirty source-page fetches, and ninety
  physical page HTTP attempts including redirects;
- no retry, replacement, fallback, SearchAPI, second case, or concurrent run;
- hard stop if frozen `approvalEnvelopeConservativeUsd` exceeds `$3`; and
- stop at the first terminal route outcome even if it fails.

Acceptance requires the actual route to complete research, deterministic
verification, separate no-web presentation, and public rendering; both model
calls must be usage-accounted; at least one verified card and source must reach
the public envelope; counters and frozen cost must stay inside the envelope;
and private job/diagnostic/provider data must remain absent.

After execution, inspect only sanitized evidence, scan its keys/paths for
prohibited material, record exact counters/usage/cost/first loss, audit tracked
and untracked state, update authoritative records, and commit only tracked
phase-owned documentation. Never stage the live fixture.

## Approval and flag state

Taylor's 2026-08-29 production-readiness mandate authorizes ordinary scoped
local implementation, bounded low-parallelism live QA, documentation, and
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
Direct Terra. Never edit or stage it.

## Outstanding readiness debts

- PR-005: five named deterministic QA workers execute the same shared synthetic
  evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  first-loss distribution, latency, calls, and cost are unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-009: the generalized candidate-contract mismatch is corrected locally;
  one new contract-v2 attempt is still required for feasibility.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse either spent Phase D attempt or evidence
  directory.
- Do not weaken the frozen `$3` gate, silently reprice its approval envelope,
  or rewrite immutable historical evidence.
- Do not weaken candidate count, source ownership, identity, requirement,
  duplicate, eligibility, product-type, sibling/accessory, editorial/support,
  redirect, private-network, price, or wrong-image gates.
- Do not retain raw model responses, candidate objects, provider IDs, prompts,
  source URLs, fetched bodies, headers, credentials, or secrets in diagnostics
  or evidence.
- Do not hardcode leaders or add product-, brand-, category-, retailer-, or
  fixture-specific behavior.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or any Phase D fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, sequence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2B canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable pricing and live boundaries | top of `docs/review-radar-test-memory.md` |
| Research schema and validator | `lib/stagedTerraContract.ts` |
| Research prompt/request | `lib/stagedTerraPrompt.ts` |
| Candidate reason propagation | `lib/stagedTerraRuntime.ts` and `lib/stagedTerraRecommendationRoute.ts` |
| Phase D plan/rates/accounting | `scripts/oai-t10-phase-d.mjs` |
| Phase D runner/evidence gate | `scripts/run-oai-t10-phase-d.mjs` |
| Phase D tests | `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent sanitized PR-2 evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-a15d935/attempt.json` |
| Architecture and approved OAI-T10 order | staged Terra section in `ReviewRadar-Overview.md`; OAI-T10 in `docs/forward-roadmap.md` |

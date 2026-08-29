# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after PR-2F safe verification attribution.
PR-2F is the self-contained current HEAD after this closeout; resolve its exact
commit with `git rev-parse HEAD`. Its parent is
`888de1fbece1854a6aab56e6b82c6a6ec520a2c9`.

## Current state

ReviewRadar is **not production-ready**.

PR-2F is complete, zero-live, and independently approved. Verifier v2 derives a
privacy-safe aggregate from existing server-owned decisions. Every candidate
has exactly one first loss in this order:

1. asset identity unproven;
2. complete-product relationship unproven;
3. identity-safe product URL unavailable;
4. hard requirement failed;
5. hard requirement not verified; or
6. no-loss eligible.

Those counts must conserve to candidate total and reconcile with eligible,
close-match, and excluded totals. Separate counters report only how many
candidates had an unowned source, invalid source input, or invalid observed
claim. They are not mutually exclusive first losses.

The route reconstructs only fixed bounded integer keys, drops malformed,
non-conserving, non-reconciling, unknown, or private values, and retains the
aggregate only for server-side verification failed/completed diagnostics.
Sanitized Phase D evidence is now `oai-t10-phase-d-sanitized-v3`. The public 502
body, verifier eligibility, evidence acceptance, prompt/research contract,
network behavior, flags, and all ceilings are unchanged.

Independent review initially blocked the proposed implementation because a
`completeProductTypeUnproven` bucket was unreachable under its own derived
facts. The corrected design uses real `DirectTerraAssetDecision` identity,
complete/bundle relationship, and identity-safe accepted-product evidence.
Materializer-origin tests prove the relationship and safe-product-URL states are
reachable. Independent re-review returned the exact terminal verdict
`APPROVED` with no actionable findings.

## Verification result

- fail-first: 23 pass / 6 intended fail;
- corrected focused verifier/route/Phase D: 30/30;
- staged subsystem: 62/62 across ten suites;
- complete deterministic suite: 1,447/1,447 across 209 suites;
- credential-neutral E2E: 17/17;
- typecheck, production build, deterministic eval, fixed ranking comparison,
  zero-network Phase D dry run, and diff checks: pass;
- lint: zero errors and three pre-existing warnings at
  `tests/finalSelectionTrace.test.mjs:102` and
  `tests/sourceQualityUpgrade.test.mjs:2417`; and
- independent re-review: `APPROVED` after personal focused/full/typecheck/diff
  runs and exact-scope/clean-state reauthentication.

No provider, search, Shopping, source-page, or other product-data request ran in
PR-2F. No local flag/config, deployment, production system, remote, spent
fixture, or user-owned artifact changed.

## Last live evidence and attribution limit

PR-2E ran once at `56a513784e195ee255410e6f49d29763d87af5c7`.
Research passed contract v3 with 12 candidates and 73 canonical sources.
Verification made 12 Shopping requests (212 rows) and 13 bounded page/HTTP
attempts (three successes), then returned zero eligible, zero close match, and
12 excluded. The route stopped at HTTP 502 `verification_failed` after 59.154
seconds; presentation/rendering did not run and no public result was produced.

PR-2E used one create, 23 retrieves, four hosted searches, one cancel, 12
Shopping requests, and 13 page/HTTP attempts, with zero retries, replacements,
fallbacks, second cases, Serper organic, or SearchAPI calls. Usage was 38,274
input and 6,884 output tokens. Cost was `$0.238945` frozen nominal,
`$0.262866` frozen conservative, and `$0.199156` at the dated current card.

Its untracked fixture
`tests/fixtures/review-radar-live/oai-t10-phase-d-56a5137/attempt.json` is spent.
Because it predates evidence v3, its verifier distribution is permanently
unknowable. PR-2F does not and cannot explain it.

## Objective and decision frame for the next phase

The proven bottleneck is staged lifecycle feasibility at deterministic
verification. PR-2F removed the observability prerequisite for a future
attempt; it did not fix or measure the actual verifier distribution.

Stronger alternatives considered:

- Loosening identity, relationship, product-URL, requirement, source, page, or
  commerce gates is rejected because no measured first loss supports it.
- Offline verifier tuning is rejected because it would target an unmeasured
  distribution.
- A broad benchmark is premature because the staged route has not produced one
  result; one new attempt also cannot itself prove accuracy or stability.

The strongest next step is exactly one new-commit, new-directory broad
`shop vac` attempt. It is now information-valuable because a verification
outcome must carry the v3 aggregate or fail the evidence contract. Stop at the
first terminal result and do not infer a generalized fix from a single case
without deterministic reproduction.

Verified facts:

- PR-2F's aggregate contract is green and independently approved.
- PR-2E's distribution is unrecoverable.
- The Phase D runner still enforces the same fixed case, counters, cost gate,
  privacy scan, commit binding, clean tracked state, and single-use directory.

Engineering judgment:

- A single PR-2G attempt has higher information value than speculative tuning.
- Any resulting first loss must be reproduced offline before implementation.

Uncertainty:

- The next route may fail at research, verification, presentation, or another
  lifecycle boundary, or may produce a result.
- One attempt does not measure quality, stability, recall, latency distribution,
  or benchmark readiness.

**Recommended reasoning level:** routine for the frozen execution; High for
privacy, counter, cost, and first-loss adjudication afterward.

## Current approved phase: PR-2G one attributable staged lifecycle attempt

1. Confirm the PR-2F closeout commit is current HEAD, tracked state is clean,
   `next-env.d.ts` is clean, and the new directory
   `tests/fixtures/review-radar-live/oai-t10-phase-d-<HEAD7>` is absent.
2. Re-read the PR-2F test-memory contract. Confirm OpenAI and Serper keys only
   by boolean presence/nonempty in the child process; never print values.
3. Confirm evidence v3 statically in the runner and focused regression test.
   Run the zero-network Phase D dry run and confirm plan v2, exact commit,
   unchanged rates, and every unchanged ceiling.
4. Execute exactly one broad `shop vac` attempt with:
   - OpenAI creates: 2;
   - hosted searches: 10;
   - retrieves: 60;
   - safety cancels: 1;
   - Serper Shopping attempts: 15;
   - source-page fetches: 30;
   - physical page HTTP attempts: 90; and
   - frozen conservative cost: `$3`.
5. Stop at the first terminal route outcome. No retry, replacement, fallback,
   second case, Serper organic, SearchAPI, or manual provider interaction.
6. Treat the output directory as spent immediately. Audit exact counters,
   usage/cost, first-stop behavior, privacy, and tracked state. If verification
   failed or completed, require valid aggregate conservation/reconciliation;
   otherwise stop at evidence invalidity.
7. Obtain independent read-only content audit. Document the result before any
   offline correction, benchmark expansion, or subsequent live request.

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

- PR-005: named deterministic QA workers execute the same shared synthetic
  evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  first-loss distribution, latency, calls, and cost are unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains unproven; presentation and
  rendering have not run live on the current architecture.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse a spent Phase D attempt or directory,
  including `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, and `oai-t10-phase-d-56a5137`.
- PR-2G permits exactly one attempt at the new PR-2F commit. No retry,
  replacement, fallback, second case, or additional live request.
- Do not alter verifier eligibility or weaken identity, complete-product,
  requirement, availability, price, source/page, commerce, asset, redirect, or
  private-network gates.
- Retain aggregate counts only. No candidate/request/evidence-identifying or raw
  provider material may enter diagnostics or evidence.
- The client response and default-off routing must remain unchanged.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or any Phase D fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phase sequence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2F canonical proof | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable attribution/live boundaries | top of `docs/review-radar-test-memory.md` |
| Verifier aggregate and eligibility | `lib/stagedTerraVerifier.ts` |
| Route sanitizer and diagnostic boundary | `lib/stagedTerraRecommendationRoute.ts` |
| Runtime counters | `lib/stagedTerraRuntime.ts` |
| Research/evidence contracts | `lib/stagedTerraContract.ts` |
| Phase D plan/runner | `scripts/oai-t10-phase-d.mjs`; `scripts/run-oai-t10-phase-d.mjs` |
| Focused regression tests | `tests/stagedTerraVerifier.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent PR-2E evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-56a5137/attempt.json` |

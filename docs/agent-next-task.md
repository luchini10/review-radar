# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the zero-live PR-2H research/asset identity
alignment. The PR-2H closeout is current HEAD after its self-contained commit;
resolve the exact SHA with `git rev-parse HEAD`. Its parent is
`90a1c7119438c91f67032781e83c1a7e98fe214f`.

## Current state

ReviewRadar is **not production-ready**.

The newest staged Terra path remains default-off, undeployed, and without a
user-visible live result. PR-2G passed research contract v3 with 12 candidates
and 58 canonical sources, then deterministic verification excluded all 12
before presentation. Sanitized evidence v3 conserved every earliest loss as
`assetIdentityUnproven`; all later first-loss buckets and separate source/claim
counters were zero. That proves only PR-2G's attempt-specific aggregate first
loss, not its private identity reason or a generalized/category-wide cause.

PR-2H closed a separate generalized zero-network self-mismatch. Before the
correction, research accepted bounded nonempty `product_name`, `brand`, `model`,
and `product_type` independently even when the unchanged asset verifier could
never accept the resulting target. Four schema-valid mutations passed research
despite a product name missing its brand, missing its model core, containing a
conflicting model, or mismatching its complete-product type.

Research candidate parsing now calls the unchanged
`directTerraAssetTargetIsCoherent()` immediately after bounded identity parsing,
using the same candidate key, rank, product name, brand, model, and category that
downstream asset verification receives. Incoherence returns only the existing
URL-free `research_candidate_invalid / candidate_identity` class before
candidate-source, Shopping, page-fetch, or verification work. It does not
synthesize or repair identity.

Research prompt v3 states the relational identity rule. Contract v4 changes the
request fingerprint, and runtime v3 records the new acceptance semantics.
Existing job-token verification requires the current prompt version and
recomputes the current fingerprint, so older in-flight work fails closed.
Research schema v2 remains unchanged because the JSON shape did not change.

## PR-2H proof and limits

| Check | Result |
| --- | --- |
| Fail-first contract run | 18 pass / 8 intended fail |
| Corrected contract suite | 26/26 |
| Five focused staged surfaces | 57/57 |
| Full staged subsystem | 70/70 across 10 suites |
| Complete deterministic wall | 1,455/1,455 across 209 suites |
| Credential-neutral E2E | 17/17 |
| Typecheck / production build | pass / pass |
| Lint | 0 errors; 3 pre-existing warnings |
| Deterministic eval / fixed ranking | no red flags / unchanged order |
| Phase D dry run / diff check | pass, zero network / pass |
| Independent code review | `APPROVED`; personal 57/57 rerun |

The generated `next-env.d.ts` was restored to its tracked production form. The
shared asset predicate, asset/relationship/requirement/source/page/commerce/
price/eligibility gates, aggregate diagnostics, generic public response,
network/cost ceilings, and committed default-off flags did not change. Valid
numeric model trimming remains accepted, and coherent duplicates remain
rejected.

PR-2H made no OpenAI API, hosted-search, Serper, SearchAPI, Shopping,
source-page, or other product-data request. It proves deterministic prevention
of one generalized impossible-target class. It does not prove that class caused
PR-2G, that a live recommendation now succeeds, or that accuracy, latency,
stability, or cost improved.

## Objective and decision frame for the next phase

The active product bottleneck remains staged lifecycle feasibility at asset
identity. PR-2H corrected one upstream generalized cause, but no post-correction
measurement exists.

Stronger alternatives considered:

- Loosening identity remains rejected because it could attach sibling models,
  accessories, or wrong product types.
- More offline identity implementation is rejected until new evidence proves a
  different generalized loss; otherwise it would tune an unproven cause.
- Candidate/private diagnostics remain rejected because evidence v3 already
  supplies a privacy-safe conserved aggregate.
- A broad benchmark remains necessary but premature while the staged path has
  never produced a result; it would measure an unproven lifecycle.
- Every earlier live directory is spent and cannot be retried or reused.

The strongest next step is exactly one clean, commit-pinned, new-directory
post-correction `shop vac` lifecycle attempt under the unchanged Phase D
envelope. It directly measures whether coherent research targets can cross the
verified asset-identity first loss. The first terminal outcome ends the phase.
Even success establishes only lifecycle feasibility, not quality or stability.

**Recommended reasoning level:** routine for bounded execution; High for cost,
privacy, conservation, and causal adjudication of the result.

## Current approved phase: PR-2I post-correction lifecycle measurement

1. Start only after PR-2H is committed and independently approved. Authenticate
   the exact HEAD, clean tracked tree/index, clean `next-env.d.ts`, and absence
   of the new commit-specific evidence directory.
2. Read the PR-2H section at the top of `docs/review-radar-test-memory.md` and the
   PR-2I section of `docs/production-readiness-master-plan.md` before any live
   action. Never inspect a spent attempt for private candidate detail.
3. Confirm required OpenAI/Serper child-process configuration only as boolean
   present/nonempty. Never print values, edit `.env.local`, or expose secrets.
4. Rerun the focused Phase D harness test and the zero-network dry run from the
   exact commit. Require plan schema v2, the exact commit/case, both dated rate
   cards, no retry/replacement/fallback, and every unchanged ceiling.
5. Use a new directory named for the PR-2H commit. Execute exactly one broad
   `shop vac` route attempt with these maximums:

   | Resource | Ceiling |
   | --- | ---: |
   | OpenAI creates | 2 |
   | hosted searches | 10 |
   | retrieves | 60 |
   | safety cancels | 1 |
   | Serper Shopping attempts | 15 |
   | source-page fetches | 30 |
   | physical page HTTP attempts | 90 |
   | frozen-conservative cost | `$3` |

6. Stop at the first terminal route result. No retry, replacement, fallback,
   second case, Serper organic, SearchAPI, gate change, flag promotion,
   deployment, production change, or push is authorized.
7. If verification fails or completes, require the existing evidence-v3
   first-loss aggregate to conserve to candidate count and reconcile with
   eligible/close/excluded. If evidence is malformed, stop at evidence
   invalidity; do not infer the missing distribution.
8. Independently audit exact commit/case/schema binding, counters, provider
   usage, costs, first-stop behavior, evidence conservation/reconciliation,
   privacy, and absence of downstream work after the terminal outcome.
9. Treat any created commit-specific directory as spent after the one attempt,
   regardless of outcome. Never edit, retry, stage, or reuse it.
10. Update authoritative records, fully regenerate this handoff, stage only
    phase-owned tracked documentation, and make one self-contained local commit
    after independent `VERIFIED` adjudication.

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
  latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; PR-2G stopped at asset
  identity and no post-PR-2H live result exists.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or directory,
  including `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`, and
  `oai-t10-phase-d-b01c335`.
- PR-2I permits exactly one new commit-specific attempt and no other external
  product-data request.
- Do not claim PR-2H caused or explains PR-2G. Do not infer a private identity
  branch from an aggregate count.
- Do not synthesize/repair identity or loosen brand, model, product type,
  relationship, requirement, availability, price, source/page, commerce, asset,
  redirect, or private-network gates.
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
| Living defects, phase sequence, exit criteria, PR-2I envelope | `docs/production-readiness-master-plan.md` |
| PR-2H canonical deterministic result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable PR-2H and spent-live boundaries | top of `docs/review-radar-test-memory.md` |
| Research parser and fingerprint | `lib/stagedTerraContract.ts` |
| Research instructions/request | `lib/stagedTerraPrompt.ts` |
| Shared target-coherence rule | `lib/directTerraAssetVerifier.ts` |
| Runtime and job-token rollover | `lib/stagedTerraRuntime.ts`; `lib/stagedTerraJobToken.ts` |
| Verifier first-loss aggregate | `lib/stagedTerraVerifier.ts` |
| Phase D plan/evidence/runner | `scripts/oai-t10-phase-d.mjs`; `scripts/run-oai-t10-phase-d.mjs` |
| Focused tests | `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraIntegration.test.mjs`; `tests/stagedTerraRuntime.test.mjs`; `tests/stagedTerraVerifier.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent PR-2G evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-b01c335/attempt.json` |

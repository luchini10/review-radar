# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2A research-contract v2 correction.
Use `git log -1` for the exact self-contained PR-2A closeout commit.

## Current state

ReviewRadar is **not production-ready**.

PR-0/PR-1 is committed at
`a15d935747313f9a87a3b145caa34ad6d2f6c8b6`. It made E2E credential-neutral,
retained only closed research validation classes, and accounted terminal
provider usage after local failure. PR-2's measurement closeout is committed at
`03367c098601efc1582d58e86e103a72390742f2`.

PR-2 used one frozen broad `shop vac` attempt at `a15d935`. Terra completed
research with 21,478 input tokens, 5,450 output tokens, two hosted searches, and
36 response-owned sources. ReviewRadar failed closed as
`research_candidate_invalid` before deterministic verification, presentation,
Shopping, page fetching, or rendering. The attempt and its evidence directory
are spent; never retry, edit, stage, or reuse them.

PR-2A then proved a generalized v1 schema/runtime mismatch without reading raw
output:

- the model authored candidate/fact IDs, while runtime required exact
  array-relative numbering not fully specified by schema/prompt; and
- runtime required exact requirement array order even though the strict schema
  could guarantee only count and ID membership.

Research contract/schema/prompt v2 now remove model-authored IDs. ReviewRadar
assigns deterministic IDs after candidate validation, requires the exact unique
requirement-ID set, and canonicalizes it to shopper-request order. Schema and
runtime share non-whitespace string rules. Contract v2 changes the request
fingerprint, so cross-version jobs fail closed.

Candidate failures may retain only one server-side group:
`candidate_identity`, `candidate_sources`, `candidate_requirements`, or
`candidate_facts`, and only beneath `research_candidate_invalid`. The route
guards both enums; raw output, candidate objects, provider IDs, prompts, source
URLs, headers, keys, secrets, and bodies remain absent from diagnostics and the
public response.

Final PR-2A verification:

- fail-first: 18 pass / 4 intended fail;
- focused contract/runtime/route: 28/28;
- staged subsystem: 54/54;
- complete suite: 1,438/1,438 across 209 suites;
- E2E: 17/17;
- typecheck, production build, deterministic eval, fixed ranking comparison,
  Phase D zero-network dry run, and diff checks: pass;
- lint: zero errors and three pre-existing warnings; and
- independent read-only review: `APPROVED`; the reviewer personally ran 40/40
  scoped tests, non-incremental typecheck, and diff checks.

No provider/search/page request ran during PR-2A. The correction proves a
generalized defect inside the observed live class, but privacy-preserving
evidence cannot identify the exact old field. Staged live feasibility therefore
remains unproven.

## Current approved next phase

Phase PR-2B is **zero-live frozen/current cost-label correction**.

The exact proven issue is evidence integrity, not an unsafe spending ceiling.
The Phase D estimator uses frozen 2026-07-25 approval-envelope rates but names
the result `standardUsd`, which can be mistaken for current billing. Official
rates checked on 2026-08-29 are lower, so the existing `$3` gate remains
conservative.

Inspect the Phase D rate object, estimator, persisted/dry-run evidence fields,
historical fixture replay, tests, and all documentation consumers. Establish a
fail-first test for the ambiguous contract. Preserve immutable historical
totals and the frozen approval-envelope calculation. Prefer explicit dated
field names/metadata over silently replacing rates. Add a separate current-rate
estimate only if its source date and reproducibility are explicit.

Do not combine this with another candidate change or live request. After PR-2B
is independently green and committed, reassess whether exactly one new-commit,
new-directory staged feasibility attempt attacks the remaining bottleneck.

**Recommended reasoning level:** Medium. This is localized accounting/evidence
plumbing; High is reserved for adjudicating a later live trust outcome.

## Verification and phase-closeout requirements

- fail-first exact-label/rate proof;
- historical terminal-failure and successful two-stage controls;
- standard, long-context, cache-write, and web-search price cases;
- focused Phase D tests and complete deterministic suite;
- typecheck, lint, dry run, and build as relevant;
- independent read-only diff review;
- update the smallest authoritative records and regenerate this handoff;
- stage only phase-owned paths and create one self-contained local commit; and
- make no external product/provider request during PR-2B.

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
- PR-009: generalized candidate-contract mismatch is corrected locally; one
  future live revalidation is still required for feasibility.
- PR-010: frozen approval-envelope output is mislabeled as current standard
  cost and is the active phase.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- No retry, edit, staging, or reuse of either spent Phase D attempt or evidence
  directory.
- No OpenAI API, Serper, SearchAPI, Shopping, page, or other external
  product-data request during PR-2B.
- Do not weaken the frozen `$3` gate or rewrite immutable historical evidence.
- Do not weaken candidate count, source ownership, identity, requirement,
  duplicate, eligibility, product-type, sibling/accessory, editorial/support,
  redirect, private-network, price, or wrong-image gates.
- Do not retain raw model responses, candidate objects, provider IDs, prompts,
  source URLs, fetched bodies, headers, credentials, or secrets in diagnostics.
- Do not hardcode leaders or add product-, brand-, category-, retailer-, or
  fixture-specific behavior.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or the PR-2 fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phases, evidence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2A canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable v2 research contract | top of `docs/review-radar-test-memory.md` |
| Research schema and validator | `lib/stagedTerraContract.ts` |
| Research prompt/request | `lib/stagedTerraPrompt.ts` |
| Candidate reason propagation | `lib/stagedTerraRuntime.ts` and `lib/stagedTerraRecommendationRoute.ts` |
| Phase D rate/accounting contract | `scripts/oai-t10-phase-d.mjs` |
| Phase D tests | `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent sanitized PR-2 evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-a15d935/attempt.json` |
| Architecture | staged Terra section in `ReviewRadar-Overview.md`; OAI-T10 in `docs/forward-roadmap.md` |

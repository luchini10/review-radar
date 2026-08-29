# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2D source-ownership closeout.
Use `git log -1` for the exact self-contained PR-2D commit containing this
handoff.

## Current state

ReviewRadar is **not production-ready**.

PR-2D corrects the proven candidate-source registry self-mismatch. The shared
canonical display/count extractor previously retained only the first exact
string for canonically equivalent response-owned URLs. Staged validation reused
that lossy view while requiring exact string membership, so a later exact
response-owned variant could fail as unregistered.

The corrected staged runtime uses a dedicated exact ownership registry that
keeps every parseable exact URL string from response-owned search actions or
citations once. The canonical display/count extractor remains unchanged. A
model-authored candidate URL must still be the exact response-owned string,
unique within its candidate, HTTPS, public-host shaped, credential-free, and
free of a non-default port. Canonical equivalence alone never grants ownership.

Candidate-source diagnostics may retain only one of:

- `candidate_source_shape`
- `candidate_source_duplicate`
- `candidate_source_unsafe`
- `candidate_source_unregistered`

That subreason is accepted only beneath
`research_candidate_invalid / candidate_sources`. Runtime and route validate
the hierarchy independently. No URL, raw output, candidate object, source title,
provider ID, prompt, body, header, key, credential, or secret enters diagnostics
or the client response. The browser still receives only generic
`research_failed`.

Contract v3 changes the request fingerprint so v1/v2 jobs fail closed. Runtime
v2 records the corrected semantics. Research schema and prompt remain v2 because
the provider-facing JSON shape did not change.

PR-2D verification:

- fail-first: 27 pass / 3 intended fail;
- corrected focused response/contract/runtime/route tests: 55/55;
- full staged subsystem: 59/59 across ten suites;
- complete deterministic suite: 1,444/1,444 across 209 suites;
- credential-neutral E2E: 17/17;
- typecheck, production build, synthetic eval, fixed ranking comparison, and
  Phase D zero-network dry run: pass;
- lint: zero errors and three pre-existing warnings;
- `git diff --check`: pass; and
- independent read-only review: `APPROVED` with no actionable findings after
  the reviewer personally ran focused/full tests, typecheck, and diff checks.

PR-2D made no OpenAI, Serper, SearchAPI, Shopping, source-page, or other external
product-data request. It does not prove that the fixed branch caused PR-2C or
that staged verification, presentation, and rendering are feasible.

## Preserved live evidence

PR-2C ran exactly one broad `shop vac` attempt at
`140d465a0ac835efb73713e988c140b7e35be6e9`. It completed Terra research but
failed closed as `research_candidate_invalid / candidate_sources` before
verification, presentation, Shopping, page fetching, cards, sources, or
rendering. The attempt stopped after 64.959 seconds.

| Measure | Actual | Ceiling |
| --- | ---: | ---: |
| OpenAI creates | 1 | 2 |
| retrieves | 29 | 60 |
| safety cancels | 1 | 1 |
| hosted searches | 6 | 10 |
| Serper Shopping | 0 | 15 |
| source-page fetches | 0 | 30 |
| physical page HTTP attempts | 0 | 90 |
| retries / replacements / fallbacks | 0 / 0 / 0 | 0 / 0 / 0 |

Usage was 57,041 input tokens, zero cached input, 6,744 output tokens, six
hosted searches, and 69 response-owned sources. Cost was `$0.303762` frozen
nominal, `$0.339413` frozen conservative, and `$0.255010` under the dated current
card, below the unchanged frozen `$3` ceiling.

The untracked sanitized evidence is
`tests/fixtures/review-radar-live/oai-t10-phase-d-140d465/attempt.json`. It is
spent. Never retry it, edit or stage it, or reuse its directory. Its privacy and
counter audit returned `VERIFIED`; the exact private source branch remains
unknowable.

## Objective and decision frame for the next phase

The next information bottleneck is real staged lifecycle feasibility, not
another offline source-rule change. PR-2D has corrected the only proven source-
registry self-mismatch and made any successor source branch safely attributable.
Ranking, discovery tuning, broad benchmarking, and UI changes still cannot be
evaluated because no staged result has traversed verification and presentation.

Stronger alternatives considered:

- Broad paid benchmarking now is premature. One route-complete result is still
  required before spending across categories or repeated samples.
- More prompt/contract edits are speculative without a fresh closed branch.
- Canonical matching would be weaker than the exact ownership design and is
  prohibited.

Verified facts:

- The deterministic exact-variant loss is fixed and independently approved.
- The spent PR-2C response cannot reveal whether its source failure was source
  shape/malformed data, a duplicate, an unsafe URL, the exact-variant loss, or a
  genuinely unregistered URL.
- The Phase D runner already enforces a one-case, no-retry, commit-pinned,
  sanitized, bounded network and cost envelope.

Engineering judgment:

- One new-commit, new-directory feasibility attempt now has high information
  value. A failure identifies a safe branch for offline work; a success proves
  only lifecycle feasibility and permits the offline benchmark phase.

Uncertainty:

- Provider output may still fail a different trust gate.
- Even a successful attempt would not establish recommendation quality,
  stability, production configuration, or release readiness.

**Recommended reasoning level:** High for preflight and outcome adjudication;
routine for the single bounded execution.

## Current approved phase: PR-2E one post-correction feasibility attempt

1. Confirm the intended repository, branch, exact full PR-2D commit, and clean
   tracked state. Preserve every untracked user artifact.
2. Derive the new output directory only from the exact commit and prove it does
   not exist. Never reuse any earlier Phase D directory.
3. Confirm required process keys by presence/nonempty only. Do not print values
   or read them into evidence.
4. Run the zero-network dry run and verify plan schema v2, both dated rate cards,
   the frozen `$3` gate, and every network/call ceiling.
5. Run exactly one frozen broad `shop vac` staged-route attempt. Use no retry,
   replacement, fallback, second case, SearchAPI, or Serper organic call.
6. Stop at the first terminal route outcome. Use only closed diagnostics. Never
   inspect or retain raw provider output, source URLs, candidate objects, prompts,
   IDs, bodies, headers, credentials, or secrets.
7. On success, require the existing acceptance checks: completed research,
   deterministic verification, no-web presentation, exactly two completed
   usage ledgers, at least one verified renderable card/source, and no private
   state in the public response.
8. Audit counters, usage, frozen/current cost, privacy, and spent-fixture state.
   Obtain independent read-only content verification and final clean tracked-
   state authentication.
9. Update authoritative records, regenerate this handoff, stage only tracked
   phase-owned paths, and create one self-contained local commit.

The first terminal outcome ends PR-2E. Do not continue into a benchmark or an
offline correction inside the same phase.

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
- PR-011: the deterministic exact-registry defect is fixed, but post-correction
  live feasibility has not been measured and the historical branch is unknown.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or evidence
  directory, including `oai-t10-phase-d-140d465`.
- PR-2E authorizes exactly one new frozen attempt and no replacement.
- Do not canonical-match model-authored URLs. Exact ownership requires that the
  exact string occur in response-owned action/citation metadata.
- Do not weaken HTTPS, credential/port/private-host, uniqueness, source count,
  source ownership, candidate count, identity, requirement, duplicate,
  eligibility, product-type, sibling/accessory, editorial/support, redirect,
  private-network, price, or wrong-image gates.
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
| PR-2D canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable source/live boundaries | top of `docs/review-radar-test-memory.md` |
| Exact and canonical response-source extraction | `lib/directTerraResponse.ts` |
| Research contract and candidate validator | `lib/stagedTerraContract.ts` |
| Research prompt/schema | `lib/stagedTerraPrompt.ts`; `lib/stagedTerraContract.ts` |
| Runtime registry and source reason | `lib/stagedTerraRuntime.ts` |
| Route diagnostic privacy boundary | `lib/stagedTerraRecommendationRoute.ts` |
| Phase D plan/rates/accounting | `scripts/oai-t10-phase-d.mjs` |
| Phase D runner/evidence gate | `scripts/run-oai-t10-phase-d.mjs` |
| Relevant focused tests | `tests/directTerraResponse.test.mjs`; `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraRuntime.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent sanitized PR-2C evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-140d465/attempt.json` |

# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2C candidate-source live stop.
Use `git log -1` after phase closeout for the exact documentation commit.

## Current state

ReviewRadar is **not production-ready**.

The latest completed code commit is PR-2B at
`140d465a0ac835efb73713e988c140b7e35be6e9`. Its plan/evidence schema v2
separates the frozen July approval envelope from the dated August current
estimate. Only `approvalEnvelopeConservativeUsd` controls the unchanged `$3`
hard gate. PR-2B passed 1,440/1,440 deterministic tests, 17/17 hermetic E2E,
all static/build gates, and independent review.

PR-2C then ran exactly one new-commit, new-directory broad `shop vac` attempt at
that commit. Terra completed research, but ReviewRadar failed closed as
`research_candidate_invalid / candidate_sources` before deterministic
verification, presentation, Shopping, page fetching, cards, sources, or
rendering. The first terminal route outcome ended the live phase after 64.959
seconds.

PR-2C counters and usage:

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

There was no second case, SearchAPI call, Serper organic call, or second model
create. The completed provider ledger recorded 57,041 input tokens, zero cached
input, 6,744 output tokens, six hosted searches, and 69 response-owned sources.
Cost is `$0.303762` frozen nominal, `$0.339413` frozen conservative, and
`$0.255010` at the dated current card, below the frozen `$3` ceiling.

The untracked sanitized evidence is
`tests/fixtures/review-radar-live/oai-t10-phase-d-140d465/attempt.json`.
It is spent. Never retry it, edit or stage it, or reuse its directory.

Privacy verification found no raw output, provider ID, prompt, product-source
URL, header, key, secret, body, request, or candidate object. Its only URL
values are the three approved OpenAI pricing-source entries; both local key
values are absent; the longest values are 64-character response hashes. The
tracked tree remained clean immediately after execution.

An independent read-only content audit supports the counters, cost, privacy,
first-loss, and no-downstream-call claims. It agrees that `candidate_sources`
cannot distinguish duplicate, unsafe/malformed, unregistered, or exact-variant
failure. Post-closeout tracked-state authentication returned `VERIFIED`; the
spent PR-2C fixture was untracked and no tracked change remained.

## Objective and decision frame for the next phase

The proven bottleneck is now candidate source ownership, not ranking, discovery,
presentation, or live variance. Those downstream stages still did not run.

Do not loosen source ownership by accepting any model-authored URL merely because
it canonicalizes to a response source. That would permit invented tracking,
path, query, or signed-URL variants and weaken citation trust. Do not make
another live request: the current evidence already narrows the boundary enough
for deterministic investigation.

A verified synthetic reproduction shows one generalized self-mismatch:
`extractDirectTerraResponseSources()` canonically deduplicates response-owned URL
variants and retains only the first exact string. The staged validator then
requires exact string membership. Given two response-owned variants with the
same canonical identity, the later exact response-owned string is lost and can
be rejected as unregistered.

Verified facts:

- The live first loss is the bounded `candidate_sources` group.
- The evidence does not reveal the exact private source string or failing branch.
- The shared extractor drops later exact response-owned canonical variants in a
  local two-variant reproduction.
- Shared canonical dedupe has existing display and Direct-Terra consumers, so a
  global semantic change would carry unrelated regression risk.

Engineering judgment:

- The strongest correction is a staged-validation registry that preserves each
  safe exact response-owned URL variant once while leaving canonical display
  dedupe unchanged.
- Closed URL-free source-branch reasons are justified because they distinguish
  source shape/duplicate, unsafe URL, and unregistered exact ownership without
  retaining private source data.

Uncertainty:

- The deterministic registry loss may or may not be the exact PR-2C branch.
- The provider may instead have duplicated a candidate URL, emitted an unsafe or
  malformed URL, or emitted a URL never present in response-owned metadata.
- Even after correction, live feasibility and recommendation quality remain
  unproven; no new spend is authorized in PR-2D.

**Recommended reasoning level:** High for defining source-ownership semantics;
Medium for the localized extractor, diagnostic, and test implementation after
the invariant is fixed.

## Current approved phase: PR-2D zero-live source alignment

1. Add fail-first tests proving that a later exact response-owned URL variant is
   currently lost before staged validation.
2. Add a closed server-only candidate-source subreason that distinguishes
   shape/duplicate, unsafe URL, and unregistered exact ownership without
   retaining a URL or candidate object.
3. Add a dedicated exact response-owned registry extractor that preserves every
   accepted exact variant once. Use it only for staged ownership validation;
   keep existing canonical display/source-count behavior unchanged.
4. Prove that an exact later response-owned variant passes, while duplicate,
   unsafe, invented, and merely canonical-equivalent-but-not-response-owned URLs
   fail closed.
5. Propagate only the closed subreason through runtime and route diagnostics.
   The browser must keep the same generic failure.
6. Run focused source/contract/runtime/route tests, the staged subsystem, full
   deterministic suite, E2E/build/static gates as relevant, privacy mutations,
   diff checks, and independent read-only review.
7. Update authoritative records, regenerate this handoff, stage only tracked
   phase-owned paths, and create one self-contained local commit.

PR-2D makes no OpenAI, Serper, SearchAPI, Shopping, page, or other external
product-data request. It does not authorize another feasibility attempt.

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
- PR-011: contract-v2 research fails at candidate source ownership; the exact
  live branch is unknown and the exact-variant registry mismatch is proven
  offline.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or evidence
  directory, including `oai-t10-phase-d-140d465`.
- Do not make any external product/provider request during PR-2D.
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
| PR-2C canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable source/live boundaries | top of `docs/review-radar-test-memory.md` |
| Shared response-source extraction | `lib/directTerraResponse.ts` |
| Research schema and candidate validator | `lib/stagedTerraContract.ts` |
| Research request and exact-URL instruction | `lib/stagedTerraPrompt.ts` |
| Runtime registry and source reason | `lib/stagedTerraRuntime.ts` |
| Route diagnostic privacy boundary | `lib/stagedTerraRecommendationRoute.ts` |
| Phase D plan/rates/accounting | `scripts/oai-t10-phase-d.mjs` |
| Phase D runner/evidence gate | `scripts/run-oai-t10-phase-d.mjs` |
| Phase D and staged tests | `tests/stagedTerraPhaseDRunner.test.mjs`; `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraRuntime.test.mjs`; `tests/stagedTerraRecommendationRoute.test.mjs` |
| Spent sanitized PR-2C evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-140d465/attempt.json` |

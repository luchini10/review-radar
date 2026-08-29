# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the one-attempt PR-2I research-fact stop.
The PR-2I documentation closeout is current HEAD after its self-contained
commit; resolve the exact SHA with `git rev-parse HEAD`. Its parent is
`06fa55fb38f6675a897053eb21328ac8845d4e14`.

## Current state

ReviewRadar is **not production-ready**.

The staged Terra path remains default-off, undeployed, and without a
user-visible live result. PR-2H closed one generalized research/asset identity
self-mismatch offline. The single post-correction PR-2I attempt then completed
Terra research with 47 canonical sources but failed local contract validation
as `research_candidate_invalid / candidate_facts` before Shopping,
verification, presentation, or rendering.

The bounded class identifies only the fact field group for the first reported
invalid candidate. It does not reveal the candidate, exact fact/subfield, raw
provider output, or whether later candidates passed the PR-2H identity boundary.
Do not infer any of those facts from the sanitized evidence.

PR-2I ran exactly once from clean commit
`06fa55fb38f6675a897053eb21328ac8845d4e14` and stopped after 54.485 seconds.
It used one create, 24 retrieves, three hosted searches, and one safety cancel.
Shopping, source fetching, physical page HTTP, verification, presentation,
retry, replacement, fallback, organic/SearchAPI, public response, and result
file were all absent.

## PR-2I proof and limits

| Check | Result |
| --- | --- |
| Focused Phase D preflight | 10/10 |
| Zero-network dry run | exact commit/case/cards/ceilings; pass |
| Live terminal | HTTP 502 `research_failed`; `candidate_facts` |
| Usage | 30,215 input; 0 cached; 7,537 output; 3 searches |
| Frozen nominal | exact `$0.2185925`; stored `$0.218592` via binary `toFixed(6)` |
| Frozen conservative / current | `$0.237477` / `$0.180874` |
| Downstream calls | all zero |
| Retries/replacements/fallbacks | all zero |
| Independent artifact audit | `VERIFIED` |

The spent directory
`tests/fixtures/review-radar-live/oai-t10-phase-d-06fa55f` contains only
untracked `attempt.json` (21,149 bytes; SHA-256
`4741a595633335708c2446b1682e05631ab1ed8fb2ef9e0044b41725ce1f9513`). Its
only URLs are the approved OpenAI Terra-model and pricing pages. Both configured
key values and every prohibited raw/provider/prompt/body/header, product/source
URL, candidate/evidence identifier, credential, and secret field are absent.
There is no `result.json`. The independent reviewer rebound all of those facts,
the exact commit/case/schema/counters/costs, and first-terminal semantics.

The directory is permanently spent. Never edit, retry, stage, or reuse it.

## Verified generalized defect

A separate zero-network matrix used only synthetic data. It proved that the
producer-facing strict schema and prompt state response-level source ownership,
while the parser correctly requires each requirement/fact lead URL to be an
exact unique member of its enclosing candidate's `source_urls` and applies
status-dependent cardinality.

These producer/parser mismatches reproduce:

- a fact URL that is response-owned but belongs to another candidate returns
  `candidate_facts`;
- the equivalent requirement URL returns `candidate_requirements`;
- duplicate fact/requirement references fail even though schema does not express
  uniqueness; and
- a supporting requirement with no source passes schema shape but fails parser
  cardinality.

This is PR-015, a P1 generalized contract mismatch. It can produce PR-2I's
bounded class but is not proven to be the private live cause.

## Objective and decision frame for the next phase

The active bottleneck is reliable research-contract acceptance, not ranking,
asset loosening, or broader market coverage.

Stronger alternatives considered:

- Retrying PR-2I is rejected because its terminal result answered the one-run
  authorization and the directory is spent.
- Accepting any response-owned URL is rejected because it would permit one
  product to borrow another product's evidence.
- Prompt-only wording is incomplete because it cannot structurally prevent
  cross-candidate raw-URL repetition.
- Candidate-local integer source references are preferred. They preserve the
  exact candidate ownership wall, remove repeated lead URLs, and use Structured
  Outputs features supported by current official OpenAI documentation. Runtime
  range, uniqueness, and status-cardinality checks remain authoritative where
  cross-field schema constraints are unavailable.
- A broad benchmark remains premature until the staged lifecycle can reliably
  cross research, verification, and presentation.

**Recommended reasoning level:** High for source-ownership and wire-contract
design; Medium for localized schema/parser/prompt/test implementation.

## Current approved phase: PR-2J candidate-local source references

1. Authenticate the intended repository, exact parent/HEAD, clean tracked tree
   and index, clean `next-env.d.ts`, default-off flags, and unchanged untracked
   user artifacts. Do not inspect any live fixture beyond the already audited
   fixed PR-2I aggregate.
2. Add fail-first tests proving the existing producer/parser mismatches for
   cross-candidate fact and requirement sources, duplicate references,
   out-of-range local references, supporting/conflicting empty references,
   not-found nonempty references, prompt wording, schema version, contract
   fingerprint, runtime version, and job-token rollover.
3. Replace `source_urls` only inside research requirement/fact leads with
   candidate-local integer source references. Keep candidate `source_urls` as
   the exact response-owned registry boundary.
4. Map each accepted local reference back to the already validated enclosing
   candidate URL. Preserve order, bounds, uniqueness, HTTPS/private-host,
   response ownership, requirement, fact, evidence, and downstream trust rules.
5. Make the prompt state zero-based candidate-local range, no duplicate
   references, at least one reference for supporting/conflicting and every fact,
   and none for `not_found`. Do not ask the model to repeat lead URLs.
6. Roll research schema, contract fingerprint, research prompt, runtime, and
   job-token acceptance as required so old in-flight work fails closed.
7. Run corrected focused tests, all staged suites, complete deterministic tests,
   typecheck, lint, production build, credential-neutral E2E, deterministic
   eval, fixed ranking comparison, zero-network Phase D dry run, and diff checks.
   Restore generated `next-env.d.ts` with a scoped patch if build changes it.
8. Obtain independent read-only review of the exact diff and relevant tests.
   Correct any finding before closeout.
9. Update authoritative records, fully regenerate this handoff, stage only
   exact phase-owned tracked files, and make one self-contained local commit.

No external product-data request is authorized in PR-2J.

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
- PR-013: staged lifecycle feasibility remains blocked; no live attempt has
  reached presentation/rendering.
- PR-015: model-facing lead source references do not yet structurally match the
  parser's candidate-local ownership/cardinality contract.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or directory,
  including `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`,
  `oai-t10-phase-d-b01c335`, and `oai-t10-phase-d-06fa55f`.
- PR-2J is zero-live. Do not make an OpenAI, hosted-search, Serper, SearchAPI,
  Shopping, source-page, or other product-data request.
- Do not claim PR-015 caused PR-2I. Do not infer a private fact/subfield,
  candidate, or later-candidate identity result from `candidate_facts`.
- Do not accept cross-candidate evidence; canonical-match a model-authored URL;
  synthesize/repair identity; or loosen brand, model, product type,
  relationship, requirement, availability, price, source/page, commerce, asset,
  redirect, or private-network gates.
- Retain aggregate/bounded classes only. No candidate/request/evidence-
  identifying or raw provider material may enter diagnostics or evidence.
- The client response and default-off routing must remain unchanged.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or any Phase D fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phase sequence, exit criteria, PR-2J scope | `docs/production-readiness-master-plan.md` |
| PR-2I canonical live result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable spent-live and source-reference boundaries | top of `docs/review-radar-test-memory.md` |
| Research schema/parser/fingerprint | `lib/stagedTerraContract.ts` |
| Research instructions/request | `lib/stagedTerraPrompt.ts` |
| Runtime and job-token rollover | `lib/stagedTerraRuntime.ts`; `lib/stagedTerraJobToken.ts` |
| Phase D plan/evidence/runner | `scripts/oai-t10-phase-d.mjs`; `scripts/run-oai-t10-phase-d.mjs` |
| Focused contract/rollover tests | `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraIntegration.test.mjs`; `tests/stagedTerraRuntime.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent PR-2I evidence (audit only; never stage/edit) | `tests/fixtures/review-radar-live/oai-t10-phase-d-06fa55f/attempt.json` |

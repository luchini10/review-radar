# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently approved zero-live PR-3F
source-grounding correction. The current approved base is the self-contained
PR-3F closeout commit containing this file; resolve its exact full SHA with
`git rev-parse HEAD`. Its expected parent is
`bf7e37b43edbd6896b97a98cc1996bfa69b3aeb7`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path remains
default-off, undeployed, and without a completed live shopper result.

PR-3E spent exactly one frozen `shop vac` lifecycle at clean PR-3D commit
`bf7e37b43edbd6896b97a98cc1996bfa69b3aeb7`. Research completed with 12
candidates and 53 response-owned sources, but every candidate supplied one
local source. Collection attempted 12 source pages/12 physical requests, four
succeeded, and 12 Shopping requests returned 201 rows. Verification returned
0 eligible / 0 close / 12 excluded, all `assetIdentityUnproven`, before
presentation or rendering.

The 42.273-second first-terminal run used one OpenAI create, 14 retrieves, three
hosted searches, one safety cancel, 29,702 input tokens, zero cached input,
4,139 output tokens, and `$0.184904` frozen-conservative estimated cost. There
was no retry, replacement, fallback, organic/SearchAPI request, second case,
public result, flag change, or deployment.

The only PR-3E artifact is untracked 16,119-byte
`tests/fixtures/review-radar-live/oai-t10-phase-d-bf7e37b/attempt.json`, SHA-256
`fb6fe1ad6324a9bb6b85a2a2634ab6eef25378ee1d696220fc5ef54510214a30`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99. The artifact is immutable and spent: never read, edit, retry, stage,
reuse, or add files there.

Closed asset subreasons were eight `noAssetCandidates` and four
`modelNotInTitle`. Overlapping commerce outcomes were five `brandNotInTitle`,
12 `stableIdentifierNotInTitle`, and five `missingMerchantProductUrl`. They are
not candidate/source mappings or causal proof and cannot authorize a weaker
identity gate.

PR-3F closes the reproduced producer/consumer mismatch offline. Research schema
v5 requires exactly two fetch-distinct exact response-owned URLs per candidate;
local requirement/fact references are only 0 or 1. A rejection-only key removes
established tracking parameters and URL fragments so two variants of one
physical page fail as duplicates. Identity-bearing query parameters remain
distinct. Exact string membership still establishes ownership; canonical
equivalence never accepts a URL or lends a title between variants. A titleless
action source may be backfilled only from a later identical-URL record.

Before collection, at least one candidate-owned exact title/URL record must pass
the unchanged shared asset-identity verifier. Title-visible exact identity is
preferred; the existing bounded direct-manufacturer or established-retailer
product-slug path remains intentional. Sibling and unknown-retailer slug
authority fail. Response source metadata is preflight only; it never becomes
verified evidence or shopper-visible content. Fifteen candidates times two
sources equals the unchanged 30-fetch ceiling. Contract v7, prompt v6, and
runtime v6 roll old jobs closed. The only new fixed URL-free reason is
`candidate_source_identity_unproven`.

No downstream source/page, complete-product relationship, commerce, price,
asset, requirement, evidence, eligibility, ranking, public-response, flag, UI,
or deployment rule changed. PR-3F made no provider or product-data request.

## PR-3E and PR-3F proof and limits

| Check | Result |
| --- | --- |
| PR-3E exact artifact audit | `VERIFIED`; no findings; confidence 0.99 |
| PR-3F fail-first | 32 passed / exactly 5 intended failures |
| Independent corrected staged/shared wall | 150/150 |
| Complete deterministic suite | 1,489/1,489 across 214 suites |
| Five deterministic batch partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Credential-neutral E2E | 17/17 |
| Typecheck and production build | pass |
| Legacy eval and fixed ranking comparison | pass; no red flags |
| Lint | 0 errors / 3 pre-existing warnings |
| Diff and generated-file state | pass; `next-env.d.ts` clean |
| Independent PR-3F review | `APPROVED`; no findings; confidence 0.98 |
| PR-3F live/provider/product-data calls | none |

Independent review found and drove correction of tracking-equivalent and
fragment-equivalent source pairs, prompt/runtime disagreement about bounded URL-
slug identity, missing same-exact title-backfill coverage, and an unlocked
15x2=30 ceiling. The final exact-snapshot verdict was `APPROVED`; the reviewer
personally passed 150/150, non-incremental typecheck, the adversarial fragment
probe, and diff checks.

This proves the generalized offline correction only. It does not establish
PR-3E candidate-level causation, live provider adherence, lifecycle feasibility,
recommendation quality, latency, or cost. Nonstandard query parameters remain
conservatively distinct because collapsing them can erase product identity.

## Objective and decision frame for the next phase

The earliest dependency remains PR-013 staged lifecycle feasibility. PR-4
active-path accuracy/stability measurement still requires one complete safe
staged shopper lifecycle.

Stronger alternatives were evaluated:

- Reading, editing, or retrying PR-3E is prohibited; its terminal result and
  hash are immutable.
- Weakening title/model, commerce, or asset gates would manufacture ambiguous
  cards rather than correct the upstream mismatch.
- Another unchanged live call or blind extra fetches would repeat the one-source
  contract and cannot create response-owned identity metadata.
- Exactly two URLs without physical-page distinction or identity grounding can
  spend both slots on tracking/anchor variants or weak pages.
- Canonical ownership or cross-variant title borrowing would weaken provenance.
- A broad live matrix remains premature until one staged lifecycle succeeds.

The strongest next step is therefore one PR-3G measurement of the unchanged
frozen `shop vac` case at the clean PR-3F closeout commit. This is not a PR-3E
retry: it uses a new commit-derived directory and a new schema/prompt/runtime
contract. If it stops, its bounded first loss selects only the next generalized
zero-live reproduction target. If it completes safely, PR-4 can begin.

**Recommended reasoning level:** High for live trust, privacy, cost, and
terminal-evidence adjudication; Medium for the bounded mechanical invocation.

## Current approved phase: PR-3G one post-correction lifecycle measurement

1. Authenticate this repository, `main`, exact PR-3F HEAD/parent, clean tracked
   and index state, clean `next-env.d.ts`, committed default-off flags, and
   unchanged user-owned untracked artifacts.
2. Run the focused Phase D runner tests and inspect the Phase D dry run from the
   exact commit. Check only boolean presence and safe shape of required server
   credentials; never print, copy, hash, or stage their values.
3. Confirm the new commit-derived output directory does not exist. Do not read,
   edit, retry, stage, reuse, or add files to any spent Phase D directory.
4. Run exactly one `scripts/run-oai-t10-phase-d.mjs --execute` invocation bound
   to the current full commit and unchanged ceilings:
   `openAiCreates=2`, `hostedSearches=10`, `openAiRetrieves=60`,
   `safetyCancels=1`, `serperShoppingAttempts=15`, `sourcePageFetches=30`,
   `sourcePageHttpAttempts=90`, and `hardCeilingUsd=3`.
5. Stop at the first terminal route/result state. Do not retry, replace, add a
   case, fall back, continue downstream after a stop, use organic/SearchAPI,
   promote a flag, or deploy. The single invocation spends PR-3G whether it
   succeeds or fails.
6. Validate exact commit/case/evidence-v4 schema, counters, usage, cost, hashes,
   privacy/credential exclusions, first-loss conservation, outcome
   reconciliation, and branch subreason bounds/coverage when verification ran.
   Treat the artifact as immutable spent evidence immediately.
7. Obtain independent read-only audit of the exact artifact and clean tracked
   state. Terminal audit verdict must be `VERIFIED`; a failed lifecycle remains
   evidence and never authorizes a second invocation.
8. If the route stops, select an evidence-supported target for a separate
   zero-live reproduction. Do not infer candidate identity, treat lower counts
   as success, or change behavior from overlapping aggregate evidence alone. If
   it succeeds, begin PR-4 planning against the tracked benchmark and current
   market truth.
9. Update the living plan and authoritative records. Keep every live artifact
   untracked. Commit only phase-owned documentation or a separately verified
   deterministic correction; never stage live evidence.

Taylor's 2026-08-29 production-readiness mandate authorizes this bounded low-
parallelism live QA without another prompt. It authorizes one new PR-3G
invocation after the clean PR-3F commit, not a retry or broader live matrix.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` is user-owned and locally enables Direct
Terra. Never edit, stage, or print it. The frozen conservative ceiling is `$3`;
current pricing is informational and cannot widen that wall.

## Outstanding readiness debts

- PR-006: current leader recall, final-set stability, hard-requirement truth,
  price coverage, latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before an experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; no live attempt has
  reached presentation/rendering.
- PR-018: the generalized source-selection defect is closed offline, but live
  adherence, recall, and lifecycle effect are unmeasured.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, dependency, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never read, retry, edit, stage, or reuse any spent Phase D attempt or
  directory, including `oai-t10-phase-d-bf7e37b`,
  `oai-t10-phase-d-a743426`, `oai-t10-phase-d-43857e0`,
  `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`,
  `oai-t10-phase-d-b01c335`, and `oai-t10-phase-d-06fa55f`.
- PR-3G permits exactly one new frozen Phase D invocation at the clean PR-3F
  commit. No retry, replacement, second case, broader live QA, or approval reuse.
- Do not infer PR-3E candidate/source mappings or cause from overlapping bounded
  counts. Reproduce generalized paths offline before naming causes.
- Do not restore model-authored research `product_name`, one-source candidate
  cardinality, raw lead URLs, response-global indexes, prompt-only identity,
  canonical ownership matching, cross-variant title borrowing, fragment-only
  source multiplicity, or cross-candidate evidence borrowing.
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
| Living defects, sequence, exit criteria, PR-3G scope | `docs/production-readiness-master-plan.md` |
| PR-3E artifact and PR-3F canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Staged architecture and phase sequence | OAI-T10 in `docs/forward-roadmap.md` |
| Exact response source registry | `lib/directTerraResponse.ts`; `tests/directTerraResponse.test.mjs` |
| Research producer and parser | `lib/stagedTerraPrompt.ts`; `lib/stagedTerraContract.ts` |
| Staged runtime and job rollover | `lib/stagedTerraRuntime.ts`; `tests/stagedTerraIntegration.test.mjs` |
| Phase D runner and ceilings | `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Offline benchmark integrity | `tests/fixtures/qa-benchmark-matrix-v1.json`; `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |

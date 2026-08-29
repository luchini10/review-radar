# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently approved zero-live PR-3D
structural identity correction. The current approved base is the self-contained
PR-3D closeout commit containing this file; resolve its exact full SHA with
`git rev-parse HEAD`. Its expected parent is
`a7434262f74d610322adf88c1e3556a11ae4b810`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path remains
default-off, undeployed, and without a completed live shopper result.

PR-3C spent exactly one frozen `shop vac` lifecycle invocation at clean commit
`a7434262f74d610322adf88c1e3556a11ae4b810`. It stopped after provider research
as HTTP 502 `research_failed / research_candidate_invalid / candidate_identity`,
before source collection, Shopping, deterministic verification, presentation,
or rendering. The first-terminal envelope held after 45.940 seconds: one create,
20 retrieves, three hosted searches, one safety cancel, 29,986 input tokens,
zero cached input, and 4,574 output tokens. Frozen-conservative estimated cost
was `$0.192316`, below the unchanged `$3` ceiling. Every retry, replacement,
fallback, product-data, second-case, and downstream counter stayed zero.

The only PR-3C artifact is untracked 18,255-byte
`tests/fixtures/review-radar-live/oai-t10-phase-d-a743426/attempt.json`, SHA-256
`d18471b3a9647ded7142b287dd914b3e2aed5afdfb582f84c624747f58ee917e`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99. It contains no raw output, provider ID, candidate/product/source identity,
prompt, request/response body, header, credential, key, secret, or token. It is
immutable and spent: never read, edit, retry, stage, reuse, or add files there.

PR-3C localizes only its first invalid candidate to the identity field group.
The exact field, invariant, candidate, and value remain private and unknown. It
does not explain PR-3A or establish a live root cause.

PR-3D closes an independently reproduced generalized contract weakness. Strict
JSON Schema could bound `product_name`, brand, model, and product type
independently but could not express their dynamic coherence relation. Four
schema-valid incoherent tuples reproduced whole-response `candidate_identity`
rejection under the unchanged shared verifier, despite prompt prose stating the
relation.

Research schema v4 therefore omits model-authored `product_name`. Brand, model,
and concise complete-product type are bounded to 100, 120, and 78 characters;
server normalization and two separators construct the internal name within the
existing exact 300-character ceiling. Exact keys reject an unexpected composite
field. The unchanged shared coherence and duplicate-identity checks still run
before source work. Contract v6, prompt v5, and runtime v5 invalidate old work.

No source ownership, requirement, fact, exact identity, complete-product
relationship, commerce, asset, evidence, eligibility, ranking, network, public-
response, flag, or UI rule changed. PR-3D made no provider or product-data call.

## PR-3C and PR-3D proof and limits

| Check | Result |
| --- | --- |
| PR-3C exact artifact audit | `VERIFIED`; no findings; confidence 0.99 |
| PR-3D fail-first | exactly 5 intended failures |
| Focused staged wall | 80/80 across 10 suites |
| Complete deterministic suite | 1,482/1,482 across 214 suites |
| Five deterministic batch partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Credential-neutral E2E | 17/17 |
| Typecheck and production build | pass |
| Legacy eval and fixed ranking comparison | pass; no red flags |
| Phase D and scorecard dry runs | pass; zero network |
| Lint | 0 errors / 3 pre-existing warnings |
| Diff and generated-file state | pass; `next-env.d.ts` clean |
| Independent PR-3D review | `APPROVED`; no findings; confidence 0.98 |
| Reviewer personal checks | 67/67 focused; typecheck and diff pass |
| PR-3D live/provider/product-data calls | none |

Independent review found one mutation gap before approval: version assertions
did not present a cryptographically valid old job. The corrected integration
test has a current AES-GCM positive control plus independent old-prompt-v4 and
old-contract-v5 fingerprint negatives. Deleting either stale-version check is
now observable.

This proof establishes the offline structural correction only. Conservative
atomic maxima may reject an unusually long legitimate identity. Live model
adherence, recall, recommendation quality, lifecycle feasibility, and PR-3C
causation remain unproven.

## Objective and decision frame for the next phase

The earliest dependency remains PR-013 staged lifecycle feasibility. PR-4
active-path accuracy/stability measurement still requires one complete safe
staged shopper lifecycle.

Stronger alternatives were evaluated:

- Reading, editing, or retrying PR-3C is prohibited; its terminal result and
  hash are immutable.
- Another unchanged live call or wider private diagnostics would not remove the
  reproduced schema-inexpressible relation.
- Prompt-only reinforcement already existed and is not an executable trust
  boundary.
- Filtering individual invalid candidates may later improve resilience, but it
  can hide systematic drift and first needs a justified minimum-candidate rule.
- Weakening or truncating identity fields would risk unsupported product cards.
- A broad live matrix remains premature until one staged lifecycle succeeds.

The strongest next step is therefore one PR-3E measurement of the unchanged
frozen `shop vac` case at the clean PR-3D commit. This is not a PR-3C retry: it
uses a new commit-derived directory and a new schema/prompt/runtime contract. If
it stops, its bounded first loss selects only the next generalized zero-live
reproduction target. If it completes safely, PR-4 can begin.

**Recommended reasoning level:** High for live trust, privacy, cost, and
terminal-evidence adjudication; Medium for the bounded mechanical invocation.

## Current approved phase: PR-3E one post-correction lifecycle measurement

1. Authenticate this repository, `main`, exact PR-3D HEAD/parent, clean tracked
   and index state, clean `next-env.d.ts`, committed default-off flags, and
   unchanged user-owned untracked artifacts.
2. Inspect the Phase D dry run from the exact commit. Check only boolean
   presence and safe shape of required server credentials; never print, copy,
   hash, or stage their values.
3. Confirm the new commit-derived output directory does not exist. Do not read,
   edit, retry, stage, reuse, or add files to any spent Phase D directory.
4. Run exactly one `scripts/run-oai-t10-phase-d.mjs --execute` invocation bound
   to the current full commit and unchanged ceilings:
   `openAiCreates=2`, `hostedSearches=10`, `openAiRetrieves=60`,
   `safetyCancels=1`, `serperShoppingAttempts=15`, `sourcePageFetches=30`,
   `sourcePageHttpAttempts=90`, and `hardCeilingUsd=3`.
5. Stop at the first terminal route/result state. Do not retry, replace, add a
   case, fall back, continue downstream after a stop, use organic/SearchAPI,
   promote a flag, or deploy. The single invocation spends PR-3E whether it
   succeeds or fails.
6. Validate exact commit/case/evidence-v4 schema, counters, usage, cost, hashes,
   privacy/credential exclusions, first-loss conservation, outcome
   reconciliation, and branch subreason bounds/coverage when verification ran.
   Treat the artifact as immutable spent evidence immediately.
7. Obtain independent read-only audit of the exact artifact and clean tracked
   state. Terminal audit verdict must be `VERIFIED`; a failed lifecycle remains
   evidence and never authorizes a second invocation.
8. If the route stops, select an evidence-supported target for a separate
   zero-live reproduction. Do not infer candidate identity, treat a count as
   causal, or change behavior from aggregate evidence alone. If it succeeds,
   begin PR-4 planning against the tracked benchmark and current market truth.
9. Update the living plan and authoritative records. Keep every live artifact
   untracked. Commit only phase-owned documentation or a separately verified
   deterministic correction; never stage live evidence.

Taylor's 2026-08-29 production-readiness mandate authorizes this bounded low-
parallelism live QA without another prompt. It authorizes one new PR-3E
invocation after the clean PR-3D commit, not a retry or broader live matrix.

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
- PR-017: the generalized composite-identity defect is closed offline, but live
  adherence and recall under the conservative atomic limits are unmeasured.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, dependency, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never read, retry, edit, stage, or reuse any spent Phase D attempt or
  directory, including `oai-t10-phase-d-a743426`,
  `oai-t10-phase-d-43857e0`, `oai-t10-phase-d-ec528d7`,
  `oai-t10-phase-d-a15d935`, `oai-t10-phase-d-140d465`,
  `oai-t10-phase-d-56a5137`, `oai-t10-phase-d-b01c335`, and
  `oai-t10-phase-d-06fa55f`.
- PR-3E permits exactly one new frozen Phase D invocation at the clean PR-3D
  commit. No retry, replacement, second case, broader live QA, or approval reuse.
- Do not infer PR-3C's exact cause or candidate identity from its bounded field
  group. Reproduce generalized paths offline before naming causes.
- Do not restore model-authored research `product_name`, raw lead URLs,
  response-global source indexes, prompt-only cardinality, canonical ownership
  matching, or cross-candidate evidence borrowing.
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
| Living defects, sequence, exit criteria, PR-3E scope | `docs/production-readiness-master-plan.md` |
| PR-3C artifact and PR-3D canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Staged architecture and phase sequence | OAI-T10 in `docs/forward-roadmap.md` |
| Research producer and parser | `lib/stagedTerraPrompt.ts`; `lib/stagedTerraContract.ts` |
| Job rollover boundary | `lib/stagedTerraJobToken.ts`; `tests/stagedTerraIntegration.test.mjs` |
| Phase D runner and ceilings | `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Offline benchmark integrity | `tests/fixtures/qa-benchmark-matrix-v1.json`; `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |

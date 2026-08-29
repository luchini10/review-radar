# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the verified PR-3A live stop and zero-live
PR-3B observability correction. The current approved base is the self-contained
PR-3B closeout commit containing this file; resolve its exact full SHA with
`git rev-parse HEAD`. Its expected parent is
`43857e072da54ee8f988887d3813722ed6fd005b`.

## Current state

ReviewRadar is **not production-ready**.

PR-3A spent exactly one frozen `shop vac` Phase D lifecycle invocation at clean
commit `43857e072da54ee8f988887d3813722ed6fd005b`. Research completed with ten
candidates and 79 canonical sources. Verification selected 15 source pages,
seven fetched successfully, and ten Shopping requests returned 192 rows. All
ten candidates were excluded before presentation: nine first stopped at
`assetIdentityUnproven` and one at
`identitySafeProductUrlUnavailable`. There is still no staged shopper result;
presentation and rendering have never completed live.

The first-terminal envelope held after 54.662 seconds: one OpenAI create, 19
retrieves, three hosted searches, one safety cancel, ten Shopping attempts, 15
source-page selections, and 17 physical page attempts. Retry, replacement,
fallback, organic, SearchAPI, second-case, presentation, promotion, and
deployment counters were zero. Frozen-conservative estimated cost was
`$0.193777`, below the unchanged `$3` ceiling.

The only artifact is untracked 18,328-byte
`tests/fixtures/review-radar-live/oai-t10-phase-d-43857e0/attempt.json`,
SHA-256 `39dd07087313339bf0b8b0cad1abd6c3ab1890a2daed73800989b63d6bad4894`.
Independent strict read-only audit returned `VERIFIED` for commit/case/schema,
counters, ledger, usage, cost, conservation, and privacy. The artifact contains
no raw output, provider ID, candidate/product/source identity, prompt,
header/body, credential, key, secret, or token. It is immutable and spent:
never read, edit, retry, stage, reuse, or add files to that directory.

PR-3B changes observability only. `staged-terra-verifier-v3` derives fixed
candidate-level subreason counts from the existing closed direct-asset,
Shopping, complete-product relationship, and product-URL decisions, scoped to
the matching first-loss branch. The route requires exact aggregate/nested keys,
safe integers, first-loss conservation, eligible/close/excluded reconciliation,
branch-local bounds, and subreason coverage. Missing, unknown, private,
fractional, negative, undercovered, overbound, or malformed attribution is
omitted in full. Unreachable decision states fail as invariants. Future
sanitized Phase D evidence is v4; historical v3 evidence is unchanged.

No eligibility, evidence, identity, relationship, product-URL, commerce, price,
ranking, network, provider request, public-response, flag, or UI behavior
changed in PR-3B. The staged Terra path remains default-off and undeployed.

## PR-3A and PR-3B proof and limits

| Check | Result |
| --- | --- |
| PR-3A exact artifact audit | `VERIFIED`; no findings; confidence 0.99 |
| PR-3B verifier/route fail-first | 15 pass / exactly 7 intended fail; separate Phase D version expectation failed |
| Corrected focused verifier/route/Phase D | 32/32 |
| Complete deterministic suite | 1,479/1,479 across 214 suites |
| Credential-neutral E2E | 17/17 |
| Typecheck and production build | pass |
| Legacy eval and fixed ranking baseline | pass; 2/2 ranking snapshots |
| Phase D dry run | pass; zero network |
| Lint | 0 errors / 3 pre-existing warnings |
| Diff and generated-file state | pass; `next-env.d.ts` clean |
| Independent PR-3B review | `APPROVED`; 32/32 personal focused run |
| PR-3B live/provider/product-data calls | none |

Independent review required three corrections. The proposed aggregate exposed
`weak_target_identity`, `identity_not_safe`, and
`product_relationship_not_safe` buckets that cannot execute after their branch
predicates; those fields were removed and now fail as invariants. The reviewer
also proved that all four subreason-coverage checks could be deleted without a
test failure; conserving-but-undercovered and branch-overbound mutations now
exercise them directly. The terminal corrected-snapshot verdict was
`APPROVED`, with no actionable finding and confidence 0.97.

The PR-3A v3 artifact cannot be reinterpreted with verifier v3/evidence v4. It
does not identify candidates or the exact direct-asset, Shopping, relationship,
or URL reason. Zero source/claim rejection counts do not prove later gates
passed for candidates that stopped earlier. PR-3B therefore does not explain
PR-3A, establish subreason frequency, improve recommendation quality, or prove
lifecycle feasibility.

## Objective and decision frame for the next phase

The earliest dependency remains PR-013 staged lifecycle feasibility. PR-4
active-path accuracy/stability measurement still depends on one complete staged
shopper lifecycle. The newest evidence localizes the stop to identity and URL
verification but lacks the subreason detail needed for an evidence-supported
behavioral fix.

Stronger alternatives were evaluated:

- Retrying or editing PR-3A is prohibited; its first terminal result spent that
  phase and its directory/hash are immutable.
- Weakening identity or URL gates would manufacture unproven product cards and
  is not authorized.
- Inferring a cause from aggregate counts, deterministic alpha-model examples,
  or private candidate guesses is unsupported.
- A broad live matrix is premature while every candidate is still excluded
  before presentation.
- One new commit-pinned evidence-v4 measurement is the smallest action that can
  distinguish the existing closed diagnostic patterns and narrow offline
  hypotheses without widening privacy or behavior.

The strongest next step is therefore one separately authorized PR-3C
measurement of the unchanged frozen `shop vac` case at the clean PR-3B commit.
It is not a retry of PR-3A: it uses a new commit-derived directory and v4
diagnostic contract to record branch-specific evidence v3 could not. If it
fails, inspect the overlapping counts, select an evidence-supported offline
reproduction target, and establish a generalized cause there before changing
behavior. If it succeeds, PR-4 can begin.

**Recommended reasoning level:** High for live trust, privacy, cost, and
evidence adjudication; Medium for the bounded mechanical invocation.

## Current approved phase: PR-3C one subreason-attributable lifecycle measurement

1. Authenticate this intended repository, `main`, exact PR-3B HEAD/parent,
   clean tracked/index state, clean `next-env.d.ts`, committed default-off
   flags, and unchanged user-owned untracked artifacts.
2. Read the PR-3A/PR-3B contract at the top of
   `docs/review-radar-test-memory.md`; inspect the Phase D dry run. Check only
   boolean presence/safe shape of required server credentials—never print,
   copy, hash, or stage their values.
3. Confirm the new commit-derived output directory does not exist. Do not read,
   edit, retry, stage, reuse, or add files to any spent Phase D directory.
4. Run exactly one `scripts/run-oai-t10-phase-d.mjs --execute` invocation bound
   to the current full commit and these unchanged ceilings:
   `openAiCreates=2`, `hostedSearches=10`, `openAiRetrieves=60`,
   `safetyCancels=1`, `serperShoppingAttempts=15`, `sourcePageFetches=30`,
   `sourcePageHttpAttempts=90`, and `hardCeilingUsd=3`.
5. Stop at the first terminal route/result state. Do not retry, replace, add a
   case, fall back, continue downstream, use organic/SearchAPI, promote a flag,
   or deploy. The single invocation spends PR-3C whether it succeeds or fails.
6. Validate exact commit/case/evidence-v4 schema, counters, usage, cost, hashes,
   privacy/credential exclusions, first-loss conservation, outcome
   reconciliation, branch-local subreason bounds, and subreason coverage.
   Treat the new artifact as immutable spent evidence immediately.
7. Obtain independent read-only audit of the exact artifact and clean tracked
   state. A complete audit requires terminal `VERIFIED`; a failed lifecycle is
   still evidence and never authorizes a second invocation.
8. If the route fails, inspect the overlapping branch-specific counts and
   select an evidence-supported target for a separate zero-live reproduction.
   Do not treat the largest count as causal, infer candidate identity, or
   change behavior from aggregate evidence alone. Name a cause only after a
   generalized offline reproduction. If the route succeeds, authorize PR-4.
9. Update the living plan and authoritative records. Keep every live artifact
   untracked. Commit only phase-owned documentation or a separately verified
   deterministic correction; never stage live evidence.

Taylor's 2026-08-29 production-readiness mandate authorizes bounded low-
parallelism live QA without another prompt. PR-3C applies that authority only
through the stricter frozen runner envelope above. It authorizes one new
invocation after the clean PR-3B commit, not a PR-3A retry or broader matrix.

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
current pricing is informational and cannot widen that approval wall.

## Outstanding readiness debts

- PR-006: current leader recall, final-set stability, hard-requirement truth,
  price coverage, latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before the experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; no live attempt has
  reached presentation/rendering.
- PR-016: observability is closed locally, but live branch-specific frequencies
  remain unknown. PR-3A's exact cause is permanently unknowable from its spent
  v3 evidence; PR-3C can localize only its own offline reproduction target and
  cannot by itself establish a cause.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, dependency, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never read, retry, edit, stage, or reuse any spent Phase D attempt or
  directory, including `oai-t10-phase-d-43857e0`,
  `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`,
  `oai-t10-phase-d-b01c335`, and `oai-t10-phase-d-06fa55f`.
- PR-3C permits exactly one new frozen Phase D invocation at the clean PR-3B
  commit. No retry, replacement, second case, broader live QA, or approval
  reuse.
- Do not infer candidate identity or a behavioral root cause from aggregate
  subreason counts. Reproduce and prove a generalized failure path offline
  before naming any cause.
- Do not restore raw lead URLs, response-global source indexes, prompt-only
  cardinality, canonical ownership matching, or cross-candidate borrowing.
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
| Living defects, sequence, exit criteria, PR-3C scope | `docs/production-readiness-master-plan.md` |
| PR-3A artifact and PR-3B canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable v3/v4 attribution contract | top of `docs/review-radar-test-memory.md` |
| Producer and sanitizer | `lib/stagedTerraVerifier.ts`; `lib/stagedTerraRecommendationRoute.ts` |
| Reason authorities | `lib/directTerraAssetVerifier.ts`; `lib/autonomousCommerceVerifier.ts`; `lib/directTerraProductRelationship.ts` |
| Focused regression walls | `tests/stagedTerraVerifier.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Phase D runner and ceilings | `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Offline benchmark integrity | `tests/fixtures/qa-benchmark-matrix-v1.json`; `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |

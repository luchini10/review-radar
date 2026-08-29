# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently verified, zero-live PR-4B
serial-runner source gate. This file was regenerated from current evidence.
The current approved base is the self-contained PR-4B closeout commit containing
this file; resolve its exact full SHA with `git rev-parse HEAD`. Its expected
parent is `047ee75daa8819d94fad2e2e0d57060b1a0ce326`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path remains default-
off and undeployed. PR-3K proved one complete safe `shop vac` lifecycle. PR-4A
froze a dated, privacy-safe staged readiness matrix and canonical analyzer.
PR-4B now has an independently verified serial capture runner, but none of the
six PR-4A readiness artifacts exists. Current-market accuracy, cross-category
constraint truth, repeatability, latency distribution, and live cost therefore
remain unmeasured.

PR-4B adds:

- `scripts/run-staged-terra-readiness.mjs`, the dry-run-first executable;
- `scripts/staged-terra-readiness-io.mjs`, commit/import/output authentication;
- `scripts/staged-terra-readiness-runner.mjs`, the one-attempt route/capture
  boundary; and
- `tests/stagedTerraReadinessRunner.test.mjs`, 15 trust, mutation, lifecycle,
  and no-extra-work regressions.

The runner freezes exactly one PR-4A attempt at a time. Attempt 1 is
`broad-shop-vac:1`, run ID `pr4b-01-broad-shop-vac-r1`, with its matrix-owned
request and nonce. It binds the exact commit, raw and canonical matrix hashes,
attempt index/key/request/run ID/nonce, prior artifact position, prospective
absent output, clean tracked state, default-off flags, safe in-memory credential
shape, all network ceilings, 720,000 ms wall ceiling, and `$1` conservative
cost ceiling. It cannot retry, replace, fall back, add work, or select/start a
later attempt automatically.

The IO layer discovers every local import with the TypeScript AST, including
literal dynamic imports with options. Nonliteral dynamic import/require fails
closed. Every discovered local file plus fixed package/lock/matrix files must
be a direct regular file matching an exact Git `100644` blob, working-file Git
hash, and raw-byte SHA-256 manifest. The complete trust surface is
reauthenticated before provider work.

Output-parent realpaths are fixed and checked before approval and creation;
links/reparse-point indirection is rejected; the created leaf is
reauthenticated. Checkpoints are append-only, exclusive, and fsynced. Final
publication uses a hard link and refuses replacement. Only the current closed
public staged route result and allowlisted diagnostics can enter the canonical
PR-4A producer. Existing/spent fixtures are never replay inputs.

## Authenticated PR-4B source snapshot

The source reviewer authenticated this exact four-file snapshot:

| File | SHA-256 |
| --- | --- |
| `scripts/staged-terra-readiness-io.mjs` | `6272e99e5fdc74c5fb8b97c750f8f3d49f1b2fc80e913dc2c784b8b5d0410ed8` |
| `scripts/staged-terra-readiness-runner.mjs` | `0dcb6e2b6b7cd546484036f53d38fdb1415a88342e4ab4eb30564c4309251b49` |
| `scripts/run-staged-terra-readiness.mjs` | `5c066a6b4f0f504a68d18377e39a2c93397f488fabfdce28f08f8cfb2ec9a3f2` |
| `tests/stagedTerraReadinessRunner.test.mjs` | `85c681e35ed20e4cf070966b47ae196b314c25686577ce0d73bd2e67f0c4ebc1` |

Fail-first execution produced the expected `ERR_MODULE_NOT_FOUND` before the
runner existed. Four independent frozen-snapshot adjudications followed:

1. `CHANGES REQUIRED`: untracked source could appear HEAD-bound, output parents
   could be indirect, and replace-in-place checkpointing could lose evidence.
2. `CHANGES REQUIRED`: the hand-written trust list did not close transitively
   over local imports.
3. `CHANGES REQUIRED`: a valid two-argument dynamic import with options escaped
   closure authentication.
4. `VERIFIED`: no actionable finding, confidence 0.99, after Git/raw manifest
   binding, fixed-parent/post-create checks, append-only publication,
   AST-discovered closure, exact import-options handling, and fail-closed
   nonliteral loading.

The reviewer matched all four hashes before and after review; independently
passed syntax, 49/49 combined PR-4A/PR-4B tests, typecheck, and scoped ESLint;
and confirmed a 57-path local closure with zero failures. It accessed no
provider, network, environment file, credential, or live fixture.

Residual engineering uncertainty: external installed package bytes remain
lockfile-bound rather than locally byte-authenticated; evaluated code strings
or alternative loaders are outside the AST recognizer; and path-based Node APIs
cannot eliminate every adversarial concurrent filesystem swap. These are not
evidence of a current defect, but remain explicit limits.

## Current verification

| Check | Result |
| --- | --- |
| Focused PR-4B runner suite | 15/15 |
| Combined PR-4A/PR-4B suites | 49/49 |
| Complete deterministic suite | 1,547/1,547 across 216 suites |
| Transitive local import closure | 57 paths; zero failures |
| Five named worker partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Playwright E2E | 17/17 |
| Nonincremental typecheck and production build | passed |
| Deterministic eval | no red flags |
| Syntax and diff checks | passed |
| Lint | zero errors; same three pre-existing warnings |
| Independent PR-4B source review | `VERIFIED`; no findings; confidence 0.99 |
| PR-4B provider/product-data/live calls | zero |

Deterministic controller `agent-loop-2026-08-29T23-03-39-286Z` reconciled all
five partitions, the complete unit wall, deterministic eval, and the tracked
benchmark. The production build automatically loaded ignored user-owned
`.env.local`; no value was inspected, printed, copied, hashed, or staged.
Playwright regenerated `next-env.d.ts`; its production-route import was restored
and the file is clean.

Process residual from PR-4A remains on record: one earlier `rg --files` and one
unfiltered `git status` printed live-fixture filenames. No fixture content,
hash, parse, field, or value was read or displayed, and nothing was modified.
All later commands used tracked-only or explicit paths; independent reviewers
remained clean. Do not repeat the deviation.

## Objective and decision frame

The product objective is the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. The proven
bottleneck is now the absence of the first commit-bound PR-4B artifact, not
runner design or another offline analyzer.

Verified facts:

- PR-3K produced one safe result only;
- PR-4A precommits four shapes, six serial attempts, exact truth, bars, ceilings,
  artifact identity, stop rules, and manual audits through 2026-09-12;
- PR-4B source and deterministic behavior received independent `VERIFIED`;
- before commit, the runner correctly refused authentication because its new
  files were not in HEAD; and
- no PR-4B live attempt or artifact exists.

Engineering judgment:

- the strongest next step is an independent review of the exact committed dry
  plan and trust-manifest digest, not immediate execution;
- after approval, exactly one `broad-shop-vac:1` invocation is justified because
  it is the first matrix-owned successor to PR-3K and can stop later spend;
- source review, machine output, and the standing bounded-live mandate are each
  insufficient alone to authenticate the exact committed invocation; and
- the main agent must not inspect the resulting fixture; the independent
  reviewer must authenticate and summarize it.

Uncertainty:

- the post-commit trust-manifest digest and exact generated approval arguments
  are not yet independently adjudicated;
- provider adherence, current leader recall, exact/near behavior, verified
  price coverage, latency, tokens, calls, cost, and final stability are unknown;
- source truth can drift before its 2026-09-12 expiry; and
- the first invocation may complete, fail closed, or expose a stop condition.

**Recommended reasoning level:** High for commit/origin/live/artifact/manual-
review authority; Medium for zero-network dry-plan execution and routine checks.

## Current approved phase: PR-4B committed-plan review, then at most attempt 1

Taylor's production-readiness mandate authorizes bounded low-parallelism live
QA, documentation, and self-contained local commits. It does not bypass the
independent per-attempt gate and does not authorize retry, replacement, attempt
2, flag change, deployment, push, or release.

1. Authenticate branch `main`, exact HEAD and parent, the four hashes above,
   exact Git modes/blobs, the complete trust-manifest digest, unexpired matrix,
   clean index/tracked tree/`next-env.d.ts`, preserved user-owned untracked
   files, and committed default-off flags.
2. Run only the zero-network default dry plan for attempt 1. Confirm exact
   commit, raw/canonical matrix seals, attempt key/index/request/run ID/nonce,
   prior-artifact position, all ceilings, prospective absent output, trust
   manifest, and complete approval arguments. Do not execute.
3. Obtain an independent read-only verdict on that exact committed state and
   dry plan. The source verdict above is necessary but does not authorize live
   work. Correct any finding and repeat the exact review before proceeding.
4. Only after exact `VERIFIED`, execute the generated explicit approval command
   once for `broad-shop-vac:1`. No retry, replacement, fallback, organic,
   SearchAPI, extra case, second invocation, or automatic advance.
5. The main agent must not open, enumerate, parse, copy, hash, or adapt the new
   fixture. Have the independent reviewer authenticate exact files/bytes,
   privacy, commit/route/accounting/currentness, source/card/requirement/price/
   offer/image/manual audits, and prefix analysis.
6. Stop after attempt 1. A clean prefix still returns only
   `next_attempt_review_required`; obtain a new independent decision before any
   attempt 2. A failed result selects no correction until its earliest repeated
   generalized cause is evidence-supported.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored `.env.local` is user-owned. Never edit, stage, print, hash, copy, or
manually inspect it. Live preflight may check only required credential presence
and safe shape in memory, without values, lengths, hashes, prefixes, or
diagnostic output. Per-attempt conservative cost is capped at `$1`; the complete
six-attempt aggregate is capped at `$6`. A ceiling is a maximum, not authority
to replace or add work.

## Outstanding readiness debts

- PR-006: all six staged artifacts are absent; current leader recall, card
  truth, hard-requirement accuracy, final-card stability, verified price
  coverage, first-loss distribution, latency, calls, tokens, and cost remain
  unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before the experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- Candidate-pool stability remains intentionally unscored at the privacy
  boundary; only final-card stability is available without a separate privacy
  design review.
- Broader cancellation/fault behavior, cache/concurrency, security,
  accessibility, mobile UX, production configuration, rollback, dependency,
  observability, and operational gates remain open.

PR-013 is closed only as one-lifecycle feasibility. PR-020 is live-revalidated
as the title-metadata correction. PR-4A closes measurement design. PR-4B source
verification closes neither live evidence nor production authority.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, copy, hash, or add to any
  spent Phase D or readiness attempt/directory. Exclude
  `tests/fixtures/review-radar-live/**` from every repository search and use
  only tracked-only or explicit paths for status and staging.
- Do not infer candidate/source mappings, product truth, leader coverage, or
  repeatability from PR-3K's closed aggregate or public cardinalities.
- Do not weaken source ownership, title/model/type, page/entity, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries to improve a score.
- Do not let a truth fixture, score, prior recommendation, retailer popularity,
  model-authored title, runner, or analyzer output authorize eligibility or
  spend.
- Execute no PR-4B attempt without exact independent committed-plan approval.
  Execute at most one precommitted attempt before stopping for artifact review.
  Never retry or replace a spent attempt.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  ignored worker results, historical live fixtures, or any live artifact. Never
  use `git add -A`.
- No deployment, production change, push, publication, destructive action,
  secret exposure, user-data deletion, or external scope expansion is
  authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, exit criteria, PR-4 evidence | `docs/production-readiness-master-plan.md` |
| Canonical PR-4B verification | latest PR-4B entry in `docs/qa-loop-results.md` |
| Durable runner/attempt contracts | top entry in `docs/review-radar-test-memory.md` |
| Current matrix and truth | `tests/fixtures/staged-terra-readiness-matrix-v1.json` |
| Runner and IO seam | `scripts/run-staged-terra-readiness.mjs`; `scripts/staged-terra-readiness-io.mjs`; `scripts/staged-terra-readiness-runner.mjs` |
| Canonical producer and analyzer | `scripts/staged-terra-readiness-artifact.mjs`; `scripts/staged-terra-readiness.mjs` |
| Staged request/public/route contracts | `lib/stagedTerraApiContract.ts`; `lib/stagedTerraRecommendationRoute.ts` |
| Staged architecture | OAI-T10 section in `docs/forward-roadmap.md` |
| Peer challenge | latest entries in `docs/agent-dialogue.md` |

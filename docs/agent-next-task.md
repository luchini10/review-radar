# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently verified, zero-live PR-4B
credential-launch correction. This file was regenerated from current evidence.
The current approved base is the self-contained correction commit containing
this file; resolve its exact full SHA with `git rev-parse HEAD`. Its expected
parent is `d2df488431c4da4176c8de56baf6d9f44efa1dc8`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path is default-off
and undeployed. PR-3K proved one complete safe `shop vac` lifecycle. PR-4A
froze a dated, privacy-safe readiness matrix and canonical analyzer. The first
PR-4B commit added an independently verified one-attempt serial runner. This
correction adds an independently verified allowlist credential launcher, but
none of the six PR-4A readiness artifacts exists. Current accuracy,
cross-category requirement truth, repeatability, latency distribution, and live
cost therefore remain unmeasured.

The correction adds or changes:

- `scripts/launch-staged-terra-readiness.mjs`, the only approved credential-
  bearing entry point;
- `scripts/run-staged-terra-readiness.mjs`, which now includes the launcher in
  the authenticated trust root;
- `scripts/staged-terra-readiness-io.mjs`, which includes fixed launcher and
  endpoint contracts;
- `scripts/staged-terra-readiness-runner.mjs` and `lib/openaiClient.ts`, which
  pin the SDK to `https://api.openai.com/v1` with `maxRetries:0`; and
- `tests/stagedTerraReadinessLauncher.test.mjs`, five credential-boundary,
  process-control, race, and child-environment regressions.

Do not use Node's broad `--env-file` loader for a live request. It can import
unrelated endpoint, proxy, loader, TLS, or debug controls into the credential-
bearing process. A value-blind broad-loader shape probe returned only `ready`,
but that invocation was rejected before any provider request.

The dedicated launcher authenticates branch `main`, clean tracked state, exact
HEAD, all 27 runner approval arguments, and the complete local trust surface
including itself before credential access and again immediately before spawn.
It rejects inherited process controls case-insensitively at both boundaries. It
reads only fixed ignored `.env.local` through one identity-checked regular-file
handle and requires stable direct realpath plus bigint device/inode/size/mtime/
ctime metadata before, during, and after the read. It parses stable bytes with
Node `util.parseEnv` and retains only `OPENAI_API_KEY` and `SERPER_API_KEY`.

The child environment is rebuilt rather than merged. It contains only required
Windows launch variables, fixed `LANG=C`, `LC_ALL=C`, `TZ=UTC`, the official
OpenAI endpoint, and the two credentials. The launcher spawns exact
`process.execPath`, the exact runner and approval arguments, with `shell:false`.
The serial runner's attempt identity, ceilings, append-only checkpoints,
no-replace publication, and no automatic advance remain unchanged.

## Authenticated correction snapshot

The source reviewer authenticated this exact six-file snapshot:

| File | SHA-256 |
| --- | --- |
| `lib/openaiClient.ts` | `feaa0bceb6c219a3029ded7f5ad97aa4001c1a4200acffc3ee3e4ee75afb9b6f` |
| `scripts/launch-staged-terra-readiness.mjs` | `fb806931187720657ba65a7b96a00d9d83252cabdab17ccc910ee4f4d3818daa` |
| `scripts/run-staged-terra-readiness.mjs` | `78533332220d58c83a03b4818797ea9d416188c9e4cf1cc2fd7cc9aa7504382a` |
| `scripts/staged-terra-readiness-io.mjs` | `c2c82ed986a411532a101f433036e783e8bb3488719276dc769347a7dfeb08a6` |
| `scripts/staged-terra-readiness-runner.mjs` | `684f26000e455ad9760c605c96eb3b8e50ba15f8fa01632027f50a36c2c16549` |
| `tests/stagedTerraReadinessLauncher.test.mjs` | `97ba1e269acfeeb6fe5d21a1b9219248b692de641348292f1cc3d1bcda622539` |

Fail-first produced the expected launcher `ERR_MODULE_NOT_FOUND`. The first
frozen source review returned `CHANGES REQUIRED`, confidence 0.995:

1. inherited `NODE_DEBUG=child_process` could print child credentials; and
2. validation followed by a separate path read admitted a credential-file swap.

A nonsecret canary reproduced the first issue. The correction rejects all
relevant debug/loader/TLS controls before credential access and immediately
before spawn, with no asynchronous gap, and reads only from one authenticated
handle bracketed by path/handle identity checks. Replacement review returned
exact `VERIFIED`, no actionable finding, confidence 0.98. The reviewer accessed
no environment file, credential, provider, network, or live fixture.

Residual engineering uncertainty: host Node, Windows process launching, NTFS,
Git, PATH, and installed dependency bytes remain trusted. The handle protocol
substantially narrows concurrent path substitution but cannot prove the host
itself non-adversarial. These limits are not evidence of a current defect.

## Current verification

| Check | Result |
| --- | --- |
| Focused launcher suite | 5/5 |
| Launcher and runner suites | 20/20 |
| Combined PR-4A/launcher/runner suites | 53/53 |
| Complete deterministic suite | 1,552/1,552 across 217 suites |
| Five named worker partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Playwright E2E | 17/17 |
| Nonincremental typecheck and production build | passed |
| Deterministic eval | no red flags |
| Syntax and diff checks | passed |
| Lint | zero errors; same three pre-existing warnings |
| Independent launcher source review | `VERIFIED`; no findings; confidence 0.98 |
| PR-4B provider/product-data/live calls in correction | zero |

Deterministic controller `agent-loop-2026-08-29T23-47-19-401Z` reran
typecheck, lint, the complete unit wall, deterministic eval, all five serial
partitions, and the tracked benchmark. It passed and found no repeated failure
candidate. A sanitized dummy-credential child dry run exited zero with only the
five expected unauthenticated precommit trust failures. No real credential
value was printed, copied, hashed, staged, or manually inspected.

The production build automatically loaded ignored user-owned `.env.local`; no
value was exposed. Playwright's generated `next-env.d.ts` was restored and is
clean. The broad value-blind credential probe emitted only `ready`; it was not
used for a live request and is not an approved invocation.

Process residual from PR-4A remains on record: one earlier `rg --files` and one
unfiltered `git status` printed live-fixture filenames. No fixture content,
hash, parse, field, or value was read or displayed, and nothing was modified.
All later commands used tracked-only or explicit paths; independent reviewers
remained clean. Do not repeat the deviation.

## Objective and decision frame

The product objective is the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. The proven
bottleneck is now exact commit/origin authorization for the corrected launcher,
not credential availability, runner design, or another offline analyzer.

Verified facts:

- PR-3K produced one safe result only;
- PR-4A precommits four shapes, six serial attempts, exact truth, bars, ceilings,
  artifact identity, stop rules, and manual audits through 2026-09-12;
- the first PR-4B runner commit is
  `d2df488431c4da4176c8de56baf6d9f44efa1dc8`;
- the corrected launcher source received independent exact `VERIFIED`;
- its complete deterministic wall passes; and
- no corrected-launcher PR-4B live attempt or artifact exists.

Engineering judgment:

- the strongest next step is independent review of the exact correction commit,
  its new trust-manifest digest, and its zero-network attempt-1 plan;
- after that approval, exactly one `broad-shop-vac:1` invocation is justified
  because it is the first matrix-owned successor and can stop later spend;
- source review, machine output, and the standing bounded-live mandate are each
  insufficient alone to authenticate the exact committed invocation; and
- the main agent must not inspect the resulting fixture; an independent reviewer
  must authenticate and summarize it.

Uncertainty:

- the post-correction trust-manifest digest and exact generated approval
  arguments are not yet independently adjudicated;
- provider adherence, current leader recall, exact/near behavior, verified
  price coverage, latency, tokens, calls, cost, and final stability are unknown;
- source truth can drift before its 2026-09-12 expiry; and
- the first invocation may complete, fail closed, or expose a stop condition.

**Recommended reasoning level:** High for commit/origin/live/artifact/manual-
review authority; Medium for zero-network dry-plan execution and routine checks.

## Current approved phase: corrected commit review, then at most attempt 1

Taylor's production-readiness mandate authorizes bounded low-parallelism live
QA, documentation, and self-contained local commits. It does not bypass the
independent per-attempt gate and does not authorize retry, replacement, attempt
2, flag change, deployment, push, or release.

1. Authenticate branch `main`, exact correction HEAD and parent
   `d2df488431c4da4176c8de56baf6d9f44efa1dc8`, the six hashes above, exact Git
   modes/blobs, complete trust-manifest digest, unexpired matrix, clean index/
   tracked tree/`next-env.d.ts`, user-owned untracked preservation, and committed
   default-off flags.
2. Run only the runner's zero-network default dry plan for attempt 1. Confirm
   exact commit, raw/canonical matrix seals, attempt key/index/request/run ID/
   nonce, prior-artifact position, all ceilings, prospective absent output,
   trust manifest, and complete 27 approval arguments. Do not execute.
3. Derive the only eligible live command as exact
   `node --no-warnings scripts/launch-staged-terra-readiness.mjs` plus those 27
   arguments. Do not use `--env-file`, a shell wrapper, or inherited secrets.
4. Obtain an independent read-only verdict on that exact committed state, dry
   plan, absent output, and launcher command. The source verdict is necessary
   but does not authorize live work. Correct any finding and repeat review.
5. Only after exact `VERIFIED`, execute that one launcher command once for
   `broad-shop-vac:1`. No retry, replacement, fallback, organic, SearchAPI,
   extra case, second invocation, or automatic advance.
6. The main agent must not open, enumerate, parse, copy, hash, or adapt the new
   fixture. Have the independent reviewer authenticate exact files/bytes,
   privacy, commit/route/accounting/currentness, source/card/requirement/price/
   offer/image/manual audits, and prefix analysis.
7. Stop after attempt 1. A clean prefix still returns only
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
manually inspect it. Only the exact authenticated launcher may read it in
memory. It must retain only the two approved credentials and produce no value,
length, hash, prefix, or diagnostic output. Per-attempt conservative cost is
capped at `$1`; the complete six-attempt aggregate is capped at `$6`. A ceiling
is a maximum, not authority to replace or add work.

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
and launcher verification close neither live evidence nor production authority.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, copy, hash, or add to any
  spent Phase D or readiness attempt/directory. Exclude
  `tests/fixtures/review-radar-live/**` from every repository search and use only
  tracked-only or explicit paths for status and staging.
- Do not infer candidate/source mappings, product truth, leader coverage, or
  repeatability from PR-3K's closed aggregate or public cardinalities.
- Do not weaken source ownership, title/model/type, page/entity, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries to improve a score.
- Do not let a truth fixture, score, prior recommendation, retailer popularity,
  model-authored title, runner, launcher, or analyzer output authorize
  eligibility or spend.
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
| Canonical correction verification | latest PR-4B entry in `docs/qa-loop-results.md` |
| Durable launcher/runner contracts | top entries in `docs/review-radar-test-memory.md` |
| Current matrix and truth | `tests/fixtures/staged-terra-readiness-matrix-v1.json` |
| Launcher and runner seam | `scripts/launch-staged-terra-readiness.mjs`; `scripts/run-staged-terra-readiness.mjs`; `scripts/staged-terra-readiness-io.mjs`; `scripts/staged-terra-readiness-runner.mjs` |
| Canonical producer and analyzer | `scripts/staged-terra-readiness-artifact.mjs`; `scripts/staged-terra-readiness.mjs` |
| Staged request/public/route contracts | `lib/stagedTerraApiContract.ts`; `lib/stagedTerraRecommendationRoute.ts` |
| Staged architecture | OAI-T10 section in `docs/forward-roadmap.md` |
| Peer challenge | latest entries in `docs/agent-dialogue.md` |

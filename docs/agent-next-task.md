# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently verified PR-021
privacy-safe launcher-terminal correction. This file was regenerated from
current evidence. The current approved base is the self-contained PR-021
closeout commit containing this file; resolve its full SHA with
`git rev-parse HEAD`. Its expected parent is
`760fba7f57946175f3ef4951e0708c1e8b040397`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path is default-off
and undeployed. PR-3K proved one complete safe `shop vac` lifecycle. PR-4A
froze a dated four-shape/six-attempt readiness matrix. PR-4B built an
independently verified commit-bound runner and sanitized launcher, but its first
exactly authorized attempt stopped before provider work. That authorization is
consumed, no PR-4B artifact exists, and the serial matrix cannot advance.

PR-021 now closes the proven future-attribution defect. The launcher emits one
closed, versioned, nonsecret terminal with a fixed stage instead of merging
every stop into one sentence. This does not reveal the historical stop stage or
grant any new live authority.

## PR-021 outcome

The launcher terminal version is
`staged-terra-readiness-launcher-terminal-v1`. Its exact six keys are:

- `schemaVersion`;
- `status` = `launcher_stopped`;
- `stage`;
- `retryAuthorized` = false;
- `replacementAuthorized` = false; and
- `nextAttemptAuthorized` = false.

The fixed stage registry covers:

- `process_gate_rejected`;
- `repository_or_trust_rejected`;
- `approval_rejected`;
- `credential_gate_rejected`;
- `post_credential_reauthentication_rejected`;
- `child_invocation_rejected`;
- `child_spawn_failed`;
- `child_signaled`; and
- `launcher_internal_failure`.

Every current synchronous and asynchronous launcher boundary maps to one stage.
Unknown errors map only to internal failure. Raw errors, stacks, paths, nested
values, and credential-shaped canaries never serialize. Integer child exit
codes still pass through without inventing a launcher terminal.

The first frozen independent review returned `CHANGES REQUIRED`, confidence
0.995. The exported error's public stage could be changed or prototype-spoofed
to serialize arbitrary canary text. The replacement stores genuine stage
authority in a module-private `WeakMap`, makes the public property nonwritable
and nonconfigurable, and maps spoofs closed. Replacement review returned exact
`VERIFIED`, no actionable findings, confidence 0.995.

Frozen replacement SHA-256 values:

- launcher:
  `eaa98872a4fe8829438985b0e5c05cce3a7ca2117ac7863c72d245c26e386c72`;
- terminal tests:
  `4f6bdfe19af947e451b28fd63c26b43261c2ded9ae152b442993521fb7545c50`.

The deterministic operation seam accepts only the real operation names and is
used by tests; the CLI passes no override. Existing twice-authenticated
commit/trust checks, exact arguments, one-handle credential read, minimal child
environment, official OpenAI endpoint, SDK `maxRetries:0`, `shell:false`, and
one-shot/no-retry controls remain intact. No `await` occurs between final
process validation and child construction/spawn.

## Current verification

| Check | Result |
| --- | --- |
| Fail-first terminal suite | missing-export failure established |
| Typed terminal suite | 7/7 |
| Launcher, terminal, and runner suites | 27/27 |
| Complete deterministic suite | 1,559/1,559 across 218 suites |
| Five named worker partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Playwright E2E | 17/17 |
| Nonincremental typecheck and production build | passed |
| Deterministic eval | no red flags |
| Syntax and diff checks | passed |
| Lint | zero errors; same three pre-existing warnings |
| First frozen PR-021 source review | `CHANGES REQUIRED`; confidence 0.995 |
| Replacement PR-021 source review | `VERIFIED`; no findings; confidence 0.995 |
| PR-4B attempt-1 provider calls | zero |
| PR-4B attempt-1 artifacts | zero |

Deterministic controller `agent-loop-2026-08-30T00-30-38-163Z` passed
typecheck, lint, all 1,559 tests, deterministic eval, all five serial worker
partitions, and the tracked 10-case/29-invariant benchmark with no repeated
failure candidate. The production build noted ignored user-owned `.env.local`
automatically but exposed no value. Generated `next-env.d.ts` was restored.

The PR-021 source snapshot was independently reviewed before closeout. This
zero-live phase does not require or claim an independent exact-commit/live-plan
authorization. No environment file, credential, provider, product-data service,
network, or live fixture was accessed.

Process residual from PR-4A remains on record: one earlier `rg --files` and one
unfiltered `git status` printed live-fixture filenames. No fixture content,
hash, parse, field, or value was read or displayed, and nothing was modified.
All later commands used tracked-only or explicit paths; independent reviewers
remained clean. Do not repeat the deviation.

## Objective and decision frame

The product objective remains the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. PR-021 is
complete, while PR-006 live measurement is blocked by the consumed serial
attempt. The strongest next zero-live blocker is RR-092/PR-008, not another
launcher diagnostic and not an assumed RR-091 rewrite.

Verified facts:

- `lib/stagedTerraVerifier.ts` imports the shared hybrid fact verifier and is on
  the active staged materialization path;
- a professional-test source becomes claim-eligible only when
  `editorialModel.status === "verified"`;
- the separate asset-candidate path currently accepts a JSON-LD image whenever
  `verification.imageUrl.status === "verified"`, without checking professional-
  test model attribution;
- a commerce result can separately establish the identity-safe product URL and
  candidate eligibility, allowing the professional-test image to remain a
  potential downstream asset source;
- RR-092 records a real historical mismatch between page-topic Product markup
  and the tested model; and
- `lib/autonomousResearchAdapter.ts`, where RR-091 originated, is reached by
  scripts/tests rather than an application route, while the shared fact verifier
  already has an exact-entity multi-product price regression.

Engineering judgment:

- first reproduce RR-092 through the complete staged materializer with tracked
  synthetic inputs; source inspection alone does not prove the unsafe image wins
  final selection;
- if reproduced, gate professional-test assets on positively verified tested-
  model attribution at the earliest shared boundary that preserves official and
  purchase-page behavior;
- do not add publisher, product, model, or fixture special cases; and
- audit RR-091 afterward against current reachability and contracts rather than
  changing isolated historical code by assumption.

Uncertainty:

- downstream identity, relationship, eligibility, or asset-priority logic may
  already suppress the suspected professional-test image in some shapes;
- the correct generalized correction may belong in source asset construction,
  shared fact verification, or asset selection; fail-first evidence should
  decide;
- stricter professional-test asset authority can reduce image recall; exact
  positive controls are required; and
- current leader recall, hard-requirement truth, repeatability, latency, and
  cost remain unmeasured because PR-006 is blocked.

**Recommended reasoning level:** High for tested-model and image authority;
Medium for localized reproduction, implementation, and deterministic checks.

## Current approved phase: PR-008 / RR-092 staged professional-test asset authority

This phase is local, zero-network, and does not authorize live-fixture access or
a live invocation.

1. Add a fail-first staged-materializer regression with an exact page-topic
   Product entity and image, an absent or conflicting tested-model receipt, and
   separate exact commerce evidence sufficient to make the candidate otherwise
   eligible. Prove whether the editorial image reaches the evidence package.
2. Add a cross-category negative and positive controls for a positively matched
   tested model plus unchanged official-product and purchase-page assets.
3. Trace the earliest evidence-supported root cause. If reproduced, implement
   the smallest generalized gate that prevents professional-test identity or
   imagery from receiving exact-model authority unless tested-model attribution
   is positively verified.
4. Preserve purchase-page exact-entity verification, Shopping exact-offer
   binding, source ownership, relationship, requirement, availability, price,
   redirect/private-network, and default-off route boundaries. Do not weaken a
   test or backfill an asset from unverified evidence.
5. Run focused tests, the complete deterministic wall, typecheck, lint, build,
   E2E, controller, syntax, and diff checks. Obtain an independent frozen-source
   review, correct every finding, update only authoritative records, regenerate
   this handoff, and make one self-contained local commit.
6. Stop that phase before RR-091, live work, flag change, deployment, release,
   or push. The overarching production-readiness goal may then select the next
   evidence-supported local blocker.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored `.env.local` is user-owned. Never edit, stage, print, hash, copy,
stat for diagnosis, or manually inspect it. Do not add a diagnostic mode that
reads it. Attempt 1's `$1` conservative ceiling was consumed without a provider
request and grants no future spend authority.

## Outstanding readiness debts

- PR-006: live measurement remains blocked. Current leader recall, card truth,
  hard-requirement accuracy, final-card stability, verified price coverage,
  first-loss distribution, latency, calls, tokens, and cost remain unmeasured.
- PR-007 / RR-091: current target-path applicability and exact same-page offer
  binding need a bounded audit; the original autonomous path is isolated.
- PR-008 / RR-092: professional-test Product markup may overstate tested-model
  image authority on the staged path; deterministic reproduction is selected.
- Candidate-pool stability remains intentionally unscored at the privacy
  boundary; only final-card stability is available without a separate privacy
  design review.
- Broader cancellation/fault behavior, cache/concurrency, security,
  accessibility, mobile UX, production configuration, rollback, dependency,
  observability, and operational gates remain open.

PR-013 is closed only as one-lifecycle feasibility. PR-020 is live-revalidated
as the title-metadata correction. PR-4A closes measurement design. PR-4B
produced no readiness artifact. PR-021 closes future launcher attribution only.
None grants production authority.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, copy, hash, or add to any
  spent Phase D or readiness attempt/directory. Exclude
  `tests/fixtures/review-radar-live/**` from every repository search and use only
  tracked-only or explicit paths for status and staging.
- Do not retry or replace `broad-shop-vac:1`, invoke the direct runner, or
  advance to attempt 2. Do not treat absence of provider spend or the new typed
  terminal as authority to revive the consumed invocation.
- Do not infer the exact historical launcher failure stage or credential state.
- Do not weaken source ownership, identity, tested-model, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries to improve a score.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  ignored worker results, historical live fixtures, or any live artifact. Never
  use `git add -A`.
- No deployment, production change, push, publication, destructive action,
  secret exposure, user-data deletion, or external scope expansion is
  authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, exit criteria, PR-008/PR-021 evidence | `docs/production-readiness-master-plan.md` |
| Canonical PR-021 evidence | latest PR-021 entry in `docs/qa-loop-results.md` |
| Durable terminal and consumed-stop contracts | top entries in `docs/review-radar-test-memory.md` |
| RR-092 historical record | bounded RR-092 section in `docs/RR-Issues-Report.md` |
| Shared fact verification | `lib/autonomousFactVerifier.ts`; `tests/autonomousFactVerifier.test.mjs` |
| Staged asset construction | `lib/stagedTerraVerifier.ts`; `tests/stagedTerraVerifier.test.mjs` |
| Staged architecture | OAI-T10 section in `docs/forward-roadmap.md` |
| Peer challenge | latest entries in `docs/agent-dialogue.md` |

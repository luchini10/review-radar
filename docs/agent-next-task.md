# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6G safe
public Serper configuration correction. This file was regenerated from current
evidence. The current approved base is the self-contained PR-6G closeout commit
containing this file; resolve its full SHA with `git rev-parse HEAD`. Its
expected parent is `83d44aa8f5ea4fb3e1f32995ef69e1c1303506f1`.

## Current state

ReviewRadar is **not production-ready**. Staged Terra and Direct Terra remain
default-off and undeployed. PR-3K proves one safe complete lifecycle, not
current category-wide quality. PR-4B attempt 1 stopped before provider work;
its one-shot authorization is consumed, no artifact exists, and the serial live
protocol cannot advance. Current staged-path recall, hard-requirement truth,
repeatability, latency distribution, and cost remain unmeasured.

PR-6B through PR-6D closed reachable local network, admission/cache, and
cancellation defects. PR-6F closed the production Serper warning privacy sink.
PR-6G now makes tracked optional Serper setup blank by default and rejects the
repository's known placeholder values before request construction. The one
remaining Open tracked defect is the optional-platform lock inconsistency.

The issue register is 108 total: 1 Open, 6 Needs Investigation, 100 Fixed, and
1 Won't Fix. RR-107 is Open. RR-104 remains contained/narrowed because
distributed authority is unproven. Hosted controls, current advisories,
accessibility, and deployment behavior remain unknown where no authenticated
evidence exists.

## PR-6G outcome

- `.env.example` is the canonical 14-key public contract and leaves optional
  `SERPER_API_KEY` blank. `.env.local.example` is a byte-identical,
  test-enforced compatibility copy.
- README copies the canonical template, requires explicit real-key opt-in, and
  contains no copyable fake Serper assignment.
- Direct dispatch and product discovery share `configuredSerperApiKey()`.
  Missing, blank, whitespace-only, case-folded, and four exact known
  placeholders start zero work. Every other configured value is preserved
  byte-for-byte; no provider credential format or substring rule was invented.
- Final fail-first passed 4 controls and failed exactly 10 intended regressions.
  Corrected dedicated tests pass 14/14; the related wall passes 156/156; the
  full suite passes 1,693/1,693 across 229 suites.
- Typecheck, production build, Playwright 17/17, and lint with zero errors/the
  same three old warnings pass. Controller
  `agent-loop-2026-08-30T10-19-03-369Z` passes all five serial partitions,
  10/10 cases, and 29/29 invariants.
- A reviewer rejected an intermediate order-dependent key-list assertion. The
  corrected exact, unique, order-insensitive assertion received replacement
  `VERIFIED`, no findings, confidence 0.999, with all five hashes stable.

RR-108 is Fixed locally. Placeholder rejection does not authenticate whether a
key is real, active, or funded. Hosted configuration, historical traffic, and
billing remain unknown.

## Frozen PR-6G verification

| Check | Result |
| --- | --- |
| Base | Exact PR-6F `83d44aa8f5ea4fb3e1f32995ef69e1c1303506f1` authenticated |
| Final fail-first | 4 pass / 10 intended failures |
| Dedicated corrected tests | 14/14 passed |
| Related configuration/Serper wall | 156/156 across 15 suites |
| Complete unit suite | 1,693/1,693 across 229 suites |
| Static/build/E2E | Typecheck, lint, production build, Playwright 17/17 passed |
| Full controller | Five partitions, 10/10 cases, 29/29 invariants passed |
| Environment-template SHA-256 | `0552e4ffc6873318c4a5eb4870e084e90149e60f54bc38a29fe71731913b482c` for both public examples |
| README SHA-256 | `2b3dbe8ccbdc72c118ef41a52f4c2d2935731166a1bc2ecd54bb6890804174ae` |
| Source SHA-256 | `1491bc7e386fcdaef4cbdce71cccf3e741162768cc20a851bd836c4500368720` |
| Test SHA-256 | `03a5197a3d42d84f7c63111861f8364db200b10add236216ac8ce59f3197666e` |
| Independent verdict | Replacement `VERIFIED`; no findings; confidence 0.999 |

The canonical fail-first evidence, correction history, manifest, review, and
residuals are in the latest PR-6G entry in `docs/qa-loop-results.md`.

## Objective, bottleneck challenge, and next decision

**Objective:** make the tracked optional-platform dependency graph internally
consistent and reproducible without masking a transitive defect with a broad
upgrade or unnecessary root dependency.

**Verified facts:** `@tailwindcss/oxide-wasm32-wasi@4.3.0` declares
`@napi-rs/wasm-runtime ^1.1.4`, while the tracked lock graph contains only
optional `0.2.12` for a different consumer. The complete package-only tree
exits `ELSPROBLEMS`. The current installed tree reports no invalid or missing
node, so the defect is optional-platform dependent. Registry provenance,
tarball integrity, clean-install resolution, and current advisories have not
yet been authenticated.

**Engineering judgment:** PR-026/RR-107 is the strongest next phase because it
is the only remaining Open tracked defect and has a bounded, falsifiable
correction path. Speculative hosted-control changes lack authenticated hosting
authority. Final readiness adjudication would be premature over a known Open
lock inconsistency. Broad dependency upgrades or audit remediation would
expand scope without evidence that they are required.

**Independent challenge:** exact sequencing verdict `VERIFIED`, confidence
0.98. The reviewer required public npm metadata/integrity authentication,
minimal isolated lock correction, clean temporary Windows and authenticated
non-Windows optional resolution, a deterministic regression, and rollback on
unrelated churn or unproven provenance.

**Uncertainty:** the correct nested resolution and its platform behavior require
public registry and clean-install evidence. A non-Windows execution target may
not be available locally. Current vulnerability/advisory state remains outside
this phase unless a direct install failure proves it inseparable.

**Recommended reasoning level:** High for supply-chain, provenance, and cross-
platform judgment; Medium for isolated lock regeneration and deterministic
validation.

## Current approved phase: PR-6H / PR-026 optional-platform lock correction

This phase may change only `package-lock.json`, one directly required root-level
deterministic lock-consistency test, the smallest authoritative records, and one
self-contained local commit. `package.json` may change only if evidence proves
an unavoidable root-contract correction. Bounded reads/downloads from the
public npm registry and clean temporary installation directories are authorized.

1. Authenticate the intended repository and PR-6G closeout commit. Inspect the
   exact root lock contract, Tailwind optional WASM entry, runtime dependency
   entries, package scripts, and directly relevant package tests. Exclude
   prohibited fixtures from every repository search.
2. Add a fail-first deterministic regression proving every locked package's
   required optional runtime range resolves to a compatible reachable lock
   entry with authenticated registry provenance and integrity.
3. Query only exact required public npm package/version metadata. Record
   registry URL, version, dependency range, and integrity evidence without
   credentials or advisory remediation.
4. Reproduce lock generation in an isolated temporary directory. Compare the
   complete result to the tracked lock and apply only the minimal proven graph
   correction with `apply_patch`. Do not install into the working dependency
   tree or upgrade unrelated packages.
5. Prove package-only tree consistency and clean temporary Windows optional
   resolution. Use a non-Windows target only if its identity and package
   behavior can be authenticated; otherwise stop and report that evidence gap
   rather than claiming cross-platform closure.
6. Run the focused lock regression, package-tree check, complete unit suite,
   typecheck, lint, production build, Playwright, deterministic controller,
   exact diff/provenance/hash checks, and restore `next-env.d.ts` if generated.
7. Obtain independent read-only review of the frozen exact snapshot. The
   reviewer must challenge semver/path reachability, provenance, minimality,
   optional-platform behavior, and any root-package change.
8. If exact `VERIFIED`, update the smallest authoritative records, regenerate
   this handoff, create one explicit-path local commit, and authenticate its
   parent, tree, scope, and clean phase-owned state. Stop before advisory
   remediation, broader upgrades, provider/live work, hosted infrastructure,
   deployment, release, push, or final readiness adjudication.

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
reads it. No provider spend, live retry, replacement, or live cancellation is
authorized. PR-6H authorizes only bounded public npm registry reads/downloads
and clean temporary dependency resolution described above.

## Outstanding readiness debts

- PR-026 / RR-107: optional-platform lock graph is inconsistent. PR-6H is the
  only approved implementation.
- PR-027 / RR-108: tracked optional Serper setup is Fixed locally; hosted
  configuration, historical requests, key validity, and billing remain unknown.
- PR-025 / RR-106: production Serper warning exposure is Fixed locally; hosted
  collector behavior, retention, and historical logs remain unknown.
- PR-006: current leader recall, card truth, hard-requirement accuracy, final-
  card stability, verified price coverage, first-loss distribution, latency,
  calls, tokens, and cost remain unmeasured. The live protocol is blocked.
- PR-023 / RR-104: one-realm body/field/admission/cache correction is verified;
  worker, restart, multi-instance, edge, account/IP, poll/cancel metering, load,
  and remote-terminal behavior remain unproven.
- PR-024 / RR-105: local cancellation is Fixed; hosted disconnect delivery,
  upstream acceptance/billing, and native resolver continuation are residuals.
- Production operations: hosted headers/edge controls, health/liveness,
  current advisories, distributed state ownership, deployment/rollback, and
  production observability remain unauthenticated.
- UX/accessibility: deterministic E2E covers core desktop/mobile, skip-link,
  validation, loading/cancel, empty/error, and safe-link flows, but broad
  keyboard, screen-reader, reduced-motion, and real-device proof remains absent.

## Hard boundaries and process residuals

- Do not access providers, credentials, hosting accounts, protected data,
  `.env.local`, live servers, product-data services, or unrelated registries.
  PR-6H permits only exact public npm metadata and clean temporary downloads.
- Do not open, enumerate, stat, hash, parse, copy, edit, delete, or reuse any
  spent live fixture. Every repository search must exclude
  `tests/fixtures/review-radar-live/**`; prefer exact root-level paths.
- Do not install/update the working dependency tree, remediate advisories,
  broadly upgrade packages, change unrelated flags, deploy, push, publish,
  release, merge, or perform destructive cleanup.
- Preserve PR-6B outbound-fetch safety, PR-6C request/admission/cache semantics,
  PR-6D cancellation/timeout/cache-waiter semantics, PR-6F warning privacy,
  PR-6G safe optional-provider configuration, and every identity, evidence,
  source-trust, and public-response boundary.
- During PR-6E, one root-file inventory printed and statted the ignored
  `.env.local` filename. No content, value, hash, copy, or edit occurred. A
  failing npm command wrote its normal debug log outside the repository; that
  log was not inspected or deleted. Neither event is product evidence.
- Earlier filename-only process deviations remain recorded in their canonical
  phase evidence. No spent fixture content has been used as goal evidence.
- E2E may regenerate `next-env.d.ts`; restore it with `apply_patch` and verify
  blob `9edff1c7cacb3bfac9a1eadcf6f51eaa99565e38`.
- Stage only exact phase-owned paths. Never use `git add -A`. A local commit
  does not authorize push, PR creation, CI, merge, deployment, or release.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Living readiness plan and PR-6G/PR-6H record | `docs/production-readiness-master-plan.md` |
| PR-6G fail-first, verification, manifest, and review | latest PR-6G entry in `docs/qa-loop-results.md` |
| RR-107/RR-108 state | `docs/RR-Issues-Report.md` |
| Independent peer conclusions | latest entry in `docs/agent-dialogue.md` |
| Phase run recap | latest entry in `docs/Agent Run Summary.md` |
| Durable configuration contract | `docs/review-radar-test-memory.md` |
| Architecture summary | `ReviewRadar-Overview.md` section 44 |

`docs/production-readiness-report.md` does not yet exist and must not be created
until the master-plan exit criteria can support an honest final verdict.

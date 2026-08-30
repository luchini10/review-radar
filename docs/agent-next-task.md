# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6E
production-operations and dependency baseline. This file was regenerated from
current evidence. The current approved base is the self-contained PR-6E
documentation closeout commit containing this file; resolve its full SHA with
`git rev-parse HEAD`. Its expected parent is
`e22e83db14d62762da706b281585a70cc675a37b`.

## Current state

ReviewRadar is **not production-ready**. Staged Terra and Direct Terra remain
default-off and undeployed. PR-3K proves one safe complete lifecycle, not
current category-wide quality. PR-4B attempt 1 stopped before provider work;
its one-shot authorization is consumed, no artifact exists, and the serial live
protocol cannot advance. Current staged-path recall, hard-requirement truth,
repeatability, latency distribution, and cost remain unmeasured.

PR-6B through PR-6D closed the three concrete reachable local defects found by
PR-6A. PR-6E then proved three separate tracked blockers without changing
product behavior: production Serper warnings can expose shopper queries and
free-form error text; the optional-platform lock graph is inconsistent; and the
documented environment examples can unintentionally enable Serper work.

The issue register is 108 total: 3 Open, 6 Needs Investigation, 98 Fixed, and 1
Won't Fix. The Open issues are RR-106 through RR-108. RR-104 remains contained/
narrowed because distributed authority is unproven. Hosted controls, current
advisories, accessibility, and deployment behavior remain unknown where no
authenticated evidence exists.

## PR-6E outcome

- PR-025/RR-106 is P1/High/Open. `logSerperWarning()` remains active in
  production, and all six public Serper wrappers pass raw shopper query and
  uncontrolled error detail. Retry and vertical-fallback diagnostics also pass
  uncontrolled errors.
- Main-agent and independent zero-network production probes captured query
  canaries. An adversarial synthetic probe also captured an error canary and a
  fake key-shaped token. No real secret or provider was used.
- PR-026/RR-107 is P2/Medium/Open. Tailwind's optional WASM package requires
  `@napi-rs/wasm-runtime ^1.1.4`, while only optional `0.2.12` is locked; the
  complete package-only tree reports `ELSPROBLEMS`.
- PR-027/RR-108 is P2/Medium/Open. README directs copying a public example with
  4 of 14 canonical keys; both public examples give the optional Serper key a
  nonempty placeholder, and a mocked probe proves it passes the truthiness gate.
- Package root specifications agree with the lock root. All 762 remote lock
  entries use npm-registry URLs and have integrity. The installed tree has no
  invalid or missing dependency; five extraneous packages are local workspace
  drift and were not cleaned. Current advisory status is unknown.
- No tracked global header policy, health/readiness route, CI/deployment/
  rollback runbook, runtime-version pin, or current advisory proof was found.
  Repository absence does not prove equivalent hosted controls are absent.

## Frozen PR-6E verification

| Check | Result |
| --- | --- |
| Base | Exact PR-6D `e22e83db14d62762da706b281585a70cc675a37b` authenticated |
| Production log reachability | Mocked transport; zero network; query/error/key-shaped canaries captured |
| Public wrapper coverage | Shopping, organic, direct-retailer, evidence, image, and video confirmed |
| Inner diagnostic coverage | Retry and vertical fallback pass uncontrolled error text |
| Package root/lock root | Exact dependency specifications agree |
| Lock provenance | 762/762 remote entries use npm registry and have integrity |
| Package-only tree | Exit 1; invalid optional `@napi-rs/wasm-runtime@0.2.12` |
| Public examples | 4 versus 14 keys; nonempty optional Serper placeholder |
| Placeholder reachability | One mocked request initiated; zero network |
| Independent verdict | Exact `VERIFIED`; no material correction; confidence 0.99 |

The canonical evidence, classification, residuals, and process disclosures are
in the latest PR-6E entry in `docs/qa-loop-results.md`.

## Objective, bottleneck challenge, and next decision

**Objective:** close the reachable production logging privacy defect without
weakening cancellation, retries, timeouts, fallback behavior, or useful bounded
diagnostics.

**Verified facts:** raw query and uncontrolled error text reach production
Serper warnings through every public vertical wrapper. PR-026 and PR-027 are
different dependency and configuration root causes. Hosted header, health,
observability, and deployment state is not authenticated.

**Engineering judgment:** one allowlisted Serper diagnostic event contract is
the strongest next correction. It attacks a proven P1 privacy sink. Adding
speculative headers, upgrading packages, synchronizing templates, or altering
hosting in the same phase would dilute proof and mix authorization boundaries.

**Uncertainty:** hosted log retention and historical contents are unknown. The
correction can prove future source behavior only; it cannot establish whether
past deployed logs contain shopper text.

**Recommended reasoning level:** High for the privacy/event contract and
adversarial leak review; Medium for localized implementation and deterministic
test execution.

## Current approved phase: PR-6F / PR-025 production-safe Serper diagnostics

This phase may change only the Serper warning implementation, directly required
tests, smallest authoritative records, and one self-contained local commit. It
is zero-provider, zero-live, zero-credential, and zero-network. PR-026/RR-107
and PR-027/RR-108 are explicitly out of scope.

1. Authenticate the intended repository and PR-6E closeout commit, then inspect
   the complete Serper warning execution path. Use exact paths and exclude
   prohibited fixtures from every repository search.
2. Add fail-first production-mode tests for shopping, organic, direct-retailer,
   evidence, image, and video wrapper failures plus transient retry and vertical
   fallback. Use mocked transport and synthetic canaries only.
3. Require every warning event to exclude raw query, `Error.message`, URL,
   request body, headers, credentials, and reversible or dictionary-testable
   query hashes. Assert fixed, bounded diagnostic fields remain.
4. Implement one allowlisted event contract. It may retain an opaque existing
   request/query ID, fixed vertical, bounded attempt/fallback state, bounded
   timeout/status class, and fixed error category. Do not accept arbitrary
   detail objects at the logging boundary.
5. Preserve exact call counts, retry/fallback policy, cancellation rethrow,
   timeout classification, result shapes, search observability, and test-mode
   behavior. Do not alter queries sent to a valid configured provider in this
   phase.
6. Run the fail-first wall before the correction and record exact intended
   failures. After correction, run focused tests, complete unit suite, typecheck,
   lint, production build, Playwright, deterministic controller/benchmark,
   exact diff/hash checks, and restore `next-env.d.ts` if generated.
7. Obtain independent read-only review of the frozen exact source/test snapshot.
   The reviewer must probe all public wrappers and inner retry/fallback paths,
   challenge diagnostic usefulness, and search for query/error/URL/body/header/
   key-shaped leakage without network or secrets.
8. If exact `VERIFIED`, update the smallest authoritative records, regenerate
   this handoff, create one explicit-path local commit, and authenticate its
   parent, tree, scope, and clean state. Stop before PR-026, PR-027, push,
   deployment, or release.

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
reads it. No provider spend, retry, replacement, or live cancellation is
authorized.

## Outstanding readiness debts

- PR-025 / RR-106: production Serper warning exposure is Open and the only
  approved implementation.
- PR-026 / RR-107: optional-platform lock graph is inconsistent; no package,
  registry, or cross-platform install work is authorized yet.
- PR-027 / RR-108: public environment examples are stale and enable an optional
  provider with a placeholder; no template/README change is authorized in PR-6F.
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
  `.env.local`, live servers, product-data services, registries, or the real
  network.
- Do not open, enumerate, stat, hash, parse, copy, edit, delete, or reuse any
  spent live fixture. Every repository search must exclude
  `tests/fixtures/review-radar-live/**`; prefer exact root-level paths.
- Do not install/update packages, regenerate lockfiles, change public templates
  or README, change flags, deploy, push, publish, release, merge, or perform
  destructive cleanup.
- Preserve PR-6B outbound-fetch safety, PR-6C request/admission/cache semantics,
  PR-6D cancellation/timeout/cache-waiter semantics, and every identity,
  evidence, privacy, and source-trust boundary.
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
| Living readiness plan and PR-6E record | `docs/production-readiness-master-plan.md` |
| PR-6E evidence, classification, and review | latest PR-6E entry in `docs/qa-loop-results.md` |
| RR-106 through RR-108 and current counts | `docs/RR-Issues-Report.md` |
| Independent peer conclusion | latest entry in `docs/agent-dialogue.md` |
| Phase run recap | latest entry in `docs/Agent Run Summary.md` |
| PR-6D durable cancellation/cache contracts | `docs/review-radar-test-memory.md` |
| Architecture summary | `ReviewRadar-Overview.md` section 42 |

`docs/production-readiness-report.md` does not yet exist and must not be created
until the master-plan exit criteria can support an honest final verdict.

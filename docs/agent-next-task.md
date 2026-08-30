# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6F
production-safe Serper diagnostics correction. This file was regenerated from
current evidence. The current approved base is the self-contained PR-6F
closeout commit containing this file; resolve its full SHA with
`git rev-parse HEAD`. Its expected parent is
`d4eef54ecdf8506a9b2bfeaa30e566b12ec34b5b`.

## Current state

ReviewRadar is **not production-ready**. Staged Terra and Direct Terra remain
default-off and undeployed. PR-3K proves one safe complete lifecycle, not
current category-wide quality. PR-4B attempt 1 stopped before provider work;
its one-shot authorization is consumed, no artifact exists, and the serial live
protocol cannot advance. Current staged-path recall, hard-requirement truth,
repeatability, latency distribution, and cost remain unmeasured.

PR-6B through PR-6D closed three reachable local network/admission/cancellation
defects. PR-6E then proved three separate blockers. PR-6F now closes the highest-
priority one: production Serper warnings no longer accept shopper query or free-
form error text. The optional-platform lock graph and unsafe documented Serper
placeholder remain separate open issues.

The issue register is 108 total: 2 Open, 6 Needs Investigation, 99 Fixed, and 1
Won't Fix. The Open issues are RR-107 and RR-108. RR-104 remains contained/
narrowed because distributed authority is unproven. Hosted controls, current
advisories, accessibility, and deployment behavior remain unknown where no
authenticated evidence exists.

## PR-6F outcome

- The module-private `logSerperWarning()` no longer accepts a free-form message
  or arbitrary detail. It emits only a fixed event, normalized fixed search
  type, fixed error category, and optional bounded opaque query ID, attempt, and
  primary/fallback stage.
- Shopping, organic, direct-retailer, evidence, image, video, transient retry,
  vertical fallback, attempt ceiling, and missing-key discovery share the same
  contract. Raw query, `Error.message`, URL, body, header, credential, key-shaped
  text, and query hash never enter the helper.
- Request construction, call counts, retry/fallback policy, cancellation,
  timeout classification, results, search observability, and test-mode warning
  suppression are unchanged.
- Fail-first production-mode tests passed 1 and failed exactly 8 intended
  regressions. Corrected dedicated tests pass 11/11; the related wall passes
  101/101; the full suite passes 1,679/1,679 across 228 suites.
- Typecheck, production build, Playwright 17/17, and lint with zero errors/the
  same three old warnings pass. Controller
  `agent-loop-2026-08-30T09-57-50-948Z` passes all five serial partitions,
  10/10 cases, and 29/29 invariants.
- Independent exact review returned `VERIFIED`, no material defect, confidence
  0.99. An in-flight cancellation probe made one mocked fetch, emitted zero
  warnings, and preserved rejection.

RR-106 is Fixed locally. Hosted log collection, retention, historical contents,
and downstream collector behavior remain unknown.

## Frozen PR-6F verification

| Check | Result |
| --- | --- |
| Base | Exact PR-6E `d4eef54ecdf8506a9b2bfeaa30e566b12ec34b5b` authenticated |
| Fail-first | 1 pass / 8 intended failures |
| Dedicated corrected tests | 11/11 passed |
| Related Serper/discovery/ledger wall | 101/101 across 10 suites |
| Complete unit suite | 1,679/1,679 across 228 suites |
| Static/build/E2E | Typecheck, lint, production build, Playwright 17/17 passed |
| Full controller | Five partitions, 10/10 cases, 29/29 invariants passed |
| Source SHA-256 | `e8f8819e87f3527e009f818be2e16155a4f0befe787478d1a07a26bde5696e9c` |
| Test SHA-256 | `6dd06cc9681503dc63a95825fd6b55aaa6c86ad75cb4eec0d85888b979bd7de8` |
| Independent verdict | Exact `VERIFIED`; no material defect; confidence 0.99 |

The canonical fail-first evidence, manifest, review, residuals, and process
boundaries are in the latest PR-6F entry in `docs/qa-loop-results.md`.

## Objective, bottleneck challenge, and next decision

**Objective:** make documented Serper setup safe by default without inspecting
the user's ignored configuration, weakening valid configured-key behavior, or
mixing a package correction into configuration work.

**Verified facts:** README directs copying `.env.local.example`, which has four
keys while `.env.example` has 14. Both assign the optional `SERPER_API_KEY` a
nonempty placeholder although README says the key may be blank. Runtime treats
any nonempty value as configured. An independent zero-network mock observed two
attempted calls with the exact public placeholder and zero with a blank value.
RR-107 is a separate optional-platform lock mismatch; installed dependencies
currently report no invalid/missing package.

**Engineering judgment:** PR-027/RR-108 is the strongest next correction. It is
directly reachable through documented setup, affects privacy/cost expectations,
and is fully testable without network or credentials. PR-026/RR-107 needs
separately authorized registry provenance and clean Windows/non-Windows install
evidence. Speculative hosted-control work would target unauthenticated unknowns
instead of a proven source defect.

**Independent challenge:** exact sequencing verdict `VERIFIED`, confidence 0.99.
The reviewer selected PR-027 as PR-6G, required one canonical public template,
blank optional credentials, a centralized placeholder-rejection gate, valid-key
positive control, zero-network tests, and a clear compatibility/migration rule
for `.env.local.example`.

**Uncertainty:** placeholder rejection cannot prove credential validity and must
not infer provider key formats. No deployed request, historical billing, or
hosted configuration is authenticated. RR-107 remains open after PR-6G.

**Recommended reasoning level:** High for the configuration/privacy authority;
Medium for localized template, README, helper, and deterministic test work.

## Current approved phase: PR-6G / PR-027 safe public Serper configuration

This phase may change only `.env.example`, `.env.local.example`, README, the
Serper configuration gate, directly required root-level tests, smallest
authoritative records, and one self-contained local commit. It is zero-provider,
zero-live, zero-credential, zero-registry, and zero-network. PR-026/RR-107 is
explicitly out of scope.

1. Authenticate the intended repository and PR-6F closeout commit. Inspect only
   the tracked public examples, relevant README setup section, exact Serper key
   gate/call path, and focused tests. Exclude prohibited fixtures from every
   repository search.
2. Add fail-first tests that replay the documented copy path and prove public-
   template drift plus attempted mocked work from the exact legacy placeholder.
   Use synthetic values and mocked transport only.
3. Cover blank, whitespace, exact documented placeholder, bounded common
   placeholder forms, and a synthetic non-placeholder control. Disabled or
   placeholder inputs must start zero requests; the valid control must preserve
   current mocked request behavior.
4. Establish `.env.example` as the canonical public contract. Either retain
   `.env.local.example` as an exact automatically checked compatibility copy or
   remove it with an explicit README migration. Optional provider credentials
   must be blank by default and opt-in must be clear.
5. Centralize the server-only Serper configuration gate before request/retry
   construction. Reject known placeholder values without imposing an invented
   provider credential format. Preserve the existing safe missing-configuration
   result and valid configured-key behavior.
6. Run focused configuration/Serper tests, the complete unit suite, typecheck,
   lint, production build, Playwright, deterministic controller/benchmark,
   exact diff/hash checks, and restore `next-env.d.ts` if generated.
7. Obtain independent read-only review of the frozen exact snapshot. The
   reviewer must replay README/template consistency, challenge placeholder
   bypasses and false positives, verify zero-network call counts, and confirm no
   access to `.env.local` or expansion into package/hosted work.
8. If exact `VERIFIED`, update the smallest authoritative records, regenerate
   this handoff, create one explicit-path local commit, and authenticate its
   parent, tree, scope, and clean phase-owned state. Stop before PR-026, registry
   work, deployment, release, push, or final readiness adjudication.

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

- PR-027 / RR-108: documented public examples are stale and enable optional
  Serper work with a placeholder. PR-6G is the only approved implementation.
- PR-026 / RR-107: optional-platform lock graph is inconsistent; no package,
  registry, clean-install, or cross-platform work is authorized in PR-6G.
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
  `.env.local`, live servers, product-data services, registries, or the real
  network.
- Do not open, enumerate, stat, hash, parse, copy, edit, delete, or reuse any
  spent live fixture. Every repository search must exclude
  `tests/fixtures/review-radar-live/**`; prefer exact root-level paths.
- Do not install/update packages, regenerate lockfiles, change unrelated flags,
  deploy, push, publish, release, merge, or perform destructive cleanup.
- Preserve PR-6B outbound-fetch safety, PR-6C request/admission/cache semantics,
  PR-6D cancellation/timeout/cache-waiter semantics, PR-6F warning privacy, and
  every identity, evidence, source-trust, and public-response boundary.
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
| Living readiness plan and PR-6F record | `docs/production-readiness-master-plan.md` |
| PR-6F fail-first, verification, manifest, and review | latest PR-6F entry in `docs/qa-loop-results.md` |
| RR-106 resolution and RR-107/RR-108 state | `docs/RR-Issues-Report.md` |
| Independent peer conclusions | latest entry in `docs/agent-dialogue.md` |
| Phase run recap | latest entry in `docs/Agent Run Summary.md` |
| Durable Serper warning contract | `docs/review-radar-test-memory.md` |
| Architecture summary | `ReviewRadar-Overview.md` section 43 |

`docs/production-readiness-report.md` does not yet exist and must not be created
until the master-plan exit criteria can support an honest final verdict.

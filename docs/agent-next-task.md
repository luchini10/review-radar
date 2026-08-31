# ReviewRadar agent next task

Updated: 2026-08-31

## Current phase and exact snapshot

PR-9J is implemented and verified in the local working tree on base commit
`d2c5f1488b1d99cc8dfcf80893387d56c2dd1dbf` (tree
`69fc69085e42750a3a0fd0d70b3fa60c0cccf145`, parent
`74c39c4b262edcb19533848d6691ba6a2e47f2a9`). It is not committed; creating a
commit requires separate explicit authority.

The stable development server is currently running at
`http://localhost:3000` through the corrected `npm run dev` command. No paid
search was submitted during correction or runtime verification.

## Objective and root cause

**Objective:** restore reliable ordinary localhost search behavior without
weakening product identity, evidence, requirements, prices, safety, or paid-
work boundaries.

A user `power washer` search with a `$1,500` budget returned the Direct-Terra
`verification_failed` citation banner. Product availability and budget were not
the cause. The exact response proves both Direct-Terra client/server flags were
active in the running process, so the normal homepage used the experimental
`/api/recommendations-v2` route.

Standard `npm run dev` previously ran `next dev` directly and therefore honored
stale experimental flags from process/local configuration. This silently
selected a pipeline already rejected by OAI-T9 as
`single_call_architecture_no_go`: one of 12 final acceptance searches
completed, six returned 502 route failures, and five reached the retrieve
ceiling without completion. Direct Terra was intentionally default-off.

The citation wording was also overbroad: every completed Direct-Terra
`invalid_report` branch maps to the same message, including wrapper,
candidate-slate, rank, requirement, price-ledger, and citation failures. The
exact leaf reason for the spent user search was not retained and must not be
invented.

## Correction

- `npm run dev` now starts `scripts/run-stable-development.mjs`.
- The launcher supplies these child-process values before Next loads env files:
  - `REVIEW_RADAR_DIRECT_TERRA=off`
  - `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
  - `REVIEW_RADAR_STAGED_TERRA=off`
  - `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- Next 16.3.3 documents process environment as higher precedence than
  `.env.local`, so stale experiment flags cannot replace ordinary local search.
- Every unrelated environment value passes through unchanged and unprinted.
  `.env.local` was neither inspected nor edited.
- `npm run dev:experimental` preserves deliberate flag-controlled experiments.
- CLI arguments remain supported, for example `npm run dev -- -p 3100`.

This is selection before submission, not an automatic retry, replacement, or
fallback. Production build/start behavior and all application trust gates are
unchanged.

## Verification

- Fail-first: the launcher test failed because no stable launcher existed.
- Corrected focused launcher tests: 4/4.
- Full unit suite: 1,728/1,728 across 234 suites.
- Typecheck: pass.
- Production build: pass on Next.js 16.3.3.
- Lint: zero errors and three pre-existing warnings.
- `npm run dev -- --help`: pass; Next CLI arguments are forwarded.
- Zero-spend runtime:
  - confirmed the prior PID was this repository's port-3000 Next server;
  - stopped it and restarted through the stable launcher;
  - homepage GET returned HTTP 200;
  - experimental V2 POST returned HTTP 500 `invalid_config` before request
    parsing or provider creation.
- No recommendation search, OpenAI call, hosted search, Shopping call, source
  fetch, retry, replacement, or fallback occurred.

## Files in the PR-9J working tree

- `package.json`
- `scripts/run-stable-development.mjs`
- `tests/stableDevelopmentLauncher.test.mjs`
- `next-env.d.ts` (Next 16 development-mode generated references, retained per
  repository agent instructions)
- `docs/agent-next-task.md`
- `docs/forward-roadmap.md`
- `docs/qa-loop-results.md`
- `docs/review-radar-test-memory.md`
- `ReviewRadar-Overview.md`
- `docs/change-log.md`

Unrelated untracked user files remain untouched.

## Recommended next step

First let the user retry the ordinary search in the already-running stable
localhost server. That search is user-initiated paid work; do not submit it
automatically.

If stable search still fails, diagnose that separate pipeline from its own
response and logs rather than re-enabling Direct Terra. If it succeeds, request
separate authority before creating one local PR-9J commit. Use **medium
reasoning** for the commit-only step because implementation and validation are
already complete; use **High reasoning** only if stable search exposes a new
accuracy or trust failure.

The previously recommended candidate-local acquisition work remains valid for
the default-off staged architecture, but it is not required to restore normal
localhost routing and must not be started in this completed step.

## Flags, secrets, and hard boundaries

Committed/default stable values remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
delete `tests/fixtures/review-radar-live/**`; exclude it from ordinary search
and status commands.

Do not push, deploy, release, promote flags, automatically retry searches, or
run another PR-9I readiness attempt. None occurred in PR-9J.

## Remaining risks

- The user has not yet repeated the search through the corrected stable path,
  so end-to-end recommendation success is not claimed.
- Stable/legacy search has its own known accuracy risks; this correction proves
  route selection, not product-result quality.
- Direct Terra still maps several internal contract failures to one inaccurate
  public citation message. It is no longer selected by normal `npm run dev`,
  but deliberate experimental runs retain that observability limitation.
- Production configuration can still explicitly enable experimental modes;
  this local-development safeguard does not change deployment behavior.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Root cause and correction | `docs/forward-roadmap.md`, PR-9J |
| Canonical verification | latest PR-9J entry in `docs/qa-loop-results.md` |
| Durable launch contract | `docs/review-radar-test-memory.md`, PR-9J |
| Architecture | `ReviewRadar-Overview.md`, section 51 |
| Base snapshot | commit `d2c5f1488b1d99cc8dfcf80893387d56c2dd1dbf` |

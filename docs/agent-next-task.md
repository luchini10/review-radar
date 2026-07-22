# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Codex after OAI-T8A Direct-Terra product-assets Phase 2
was implemented and adversarially reviewed locally (zero live, uncommitted).

## Current state

Taylor approved Phase 2 only: a fully mocked Serper Shopping adapter that may
issue at most one narrow exact-identity request per locked Terra product and
feed normalized asset candidates into the committed Phase 1 verifier. That
work is complete and verified locally. No live transport, API request, route/UI
wiring, flag change, `.env.local` edit, commit, deployment, or production
behavior was authorized or performed.

Phase 1 remains committed as `836deb3` (`Add Direct-Terra product asset safety
boundary`). Phase 2 is uncommitted and consists of:

- `lib/directTerraSerperAssetAdapter.ts` (new)
- `tests/directTerraSerperAssetAdapter.test.mjs` (new)
- a narrow export in `lib/directTerraAssetVerifier.ts`
- Phase 2 updates in `docs/forward-roadmap.md`, `docs/qa-loop-results.md`,
  `docs/agent-dialogue.md`, and this regenerated handoff

`next-env.d.ts` was modified before this phase and must not be staged. All
historical untracked fixtures and user artifacts remain untracked and
untouched.

## OAI-T8A Phase 2 outcome

The adapter deliberately does not reuse the legacy Serper client. Instead it
takes a dependency-injected Shopping transport, so the entire phase is fully
mocked and has no executable network path. It:

- validates every target and all duplicate keys/ranks before dispatching;
- snapshots targets and processes at most five in locked Terra rank order;
- constructs only `brand + model + category` as the deterministic query;
- passes exactly one request per target to the injected transport, naming
  `https://google.serper.dev/shopping` with
  `{ q, gl: "us", hl: "en", num: 20 }`;
- has no retry, cache, organic fallback, environment read, legacy client,
  route, or UI dependency;
- fails only the affected product closed on transport failure while continuing
  the other already-approved targets once each;
- accepts only a bounded Shopping array of at most 20 rows and rejects
  provider-error, missing-array, and oversized responses;
- ignores organic rows and maps only title, direct product URL, image, and
  snippet into the Phase 1 verifier; and
- excludes provider IDs, prices, source/seller labels, positions, raw rows, and
  query strings from its returned asset batch.

A separate server-only diagnostic callback can receive the exact query plus
bounded counts and status for future accounting. It must never be serialized
to the browser.

## Fail-first and adversarial findings

The new suite initially failed because the adapter module did not exist. The
adversarial pass then added two generalized fail-first checks:

1. A response carrying a provider error plus stale-looking Shopping rows was
   initially accepted; it now fails closed.
2. Shuffled input targets were initially processed in caller order; the adapter
   now snapshots and sorts by immutable Terra rank before awaiting transport.

One test expectation was corrected without changing code: a row with a safe
product page but wrong-model image correctly preserves the safe page and
rejects only the image under the Phase 1 field-granular contract.

## Verification

- Focused Phase 1 + Phase 2 wall: 26/26 pass.
- Complete test wall: 1218/1218 across 174 suites.
- Typecheck: pass.
- Full lint: zero errors and three pre-existing warnings.
- `git diff --check`: pass.
- Production build: not run because both asset modules remain unreferenced by
  the app; typecheck, full lint, and the complete Node wall cover the seam.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Current local `.env.local`, classified without exposing secrets:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

This phase did not modify `.env.local`. Both asset modules are unreferenced and
inactive regardless of the local direct-Terra flags.

## Evidence and limitation still in force

Historical H2B live evidence found zero usable merchant URLs across four
Serper Shopping products because exposed destinations were Google wrappers.
Phase 2 proves deterministic request discipline and safety for mocked provider
shapes; it does not prove that live Serper can supply useful website links or
images. Do not wire this path into the app until a separately approved bounded
probe measures website coverage and image coverage independently.

The T7C direct-Terra evaluation also remains in force: three categories beat
legacy quality, robot-vac recall/stability remained weak, and missing safe
prices are budget-unverified rather than compliant.

## Next decision

Nothing further is automatically approved. The smallest next step is Taylor's
explicit approval for a scoped commit of the reviewed Phase 2 code, tests, and
current-state documents. It would make no behavior change.

After that commit, a separately approved zero-live Phase 3 may add a
single-request, no-retry server transport and a bounded live-probe harness.
That preflight should freeze separate website/image coverage metrics before
any spend. A live request, route/UI wiring, or flag promotion remains a later
separate decision.

**Recommended reasoning level:** Medium for the scoped commit because the
trust-sensitive review and full wall are complete. Use High for the later
real-transport preflight because secrets, provider schema, and attempt
accounting become active at that boundary.

## Outstanding review debts

- Dialogue entry [89] asks Claude to challenge the mocked adapter and the
  separate website-versus-image coverage gate; Codex's approved adversarial
  review is complete.
- Zero-live classification of T7C robot-vac denominator misses versus real
  product-set churn before more robot-vac evaluation spend.
- Budget-constrained evaluation must classify a missing safe price as
  budget-unverified, not silently non-violating.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other live call without a new
  exact numeric approval pinned to a commit.
- No commit, push, flag promotion, `.env.local` edit, deployment, publication,
  or production change without separate approval.
- No route or UI wiring during Phase 2 or its commit.
- Serper may supply optional assets only. It must never discover, score, add,
  delete, replace, rerank, rename, or rewrite Terra recommendations.
- Missing/rejected assets stay unavailable and never alter Terra's report.
- Never expose raw provider rows, provider IDs, queries, keys, headers, or
  server-side diagnostics to the browser.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase and boundaries | this file |
| Phase contract | `docs/forward-roadmap.md` OAI-T8A |
| Phase 2 verification | latest `docs/qa-loop-results.md` entry |
| Peer-review request | `docs/agent-dialogue.md` entry [89] |
| Mocked adapter | `lib/directTerraSerperAssetAdapter.ts` |
| Adapter wall | `tests/directTerraSerperAssetAdapter.test.mjs` |
| Phase 1 verifier | `lib/directTerraAssetVerifier.ts` |
| Shared image/page safety | `lib/productImageResolver.ts`, `lib/productPageUrl.ts` |

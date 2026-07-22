# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Codex for the reviewed OAI-T8A Direct-Terra
product-assets Phase 3 scoped commit (zero live). This handoff lands in the
same revision as the implementation.

## Current state

Taylor approved the scoped Phase 3 commit after the zero-live implementation,
adversarial review, and complete verification wall passed. The revision
containing this handoff adds a server-only Serper Shopping transport and a
commit-pinned bounded-probe harness for the five frozen T7B broad shop-vac
products. No live API request, route/UI wiring, flag change, `.env.local` edit,
deployment, push, or production behavior was authorized or performed.

Prior committed foundations remain:

- Phase 1: `836deb3` (`Add Direct-Terra product asset safety boundary`)
- Phase 2: `309857a` (`Add mocked Direct-Terra Serper asset adapter`)
- Phase 2 documentation follow-up: `0393cf7`

The Phase 3 commit consists of:

- `lib/directTerraSerperTransport.ts` (new)
- `lib/directTerraAssetCoverageProbe.ts` (new)
- `scripts/run-oai-t8a-asset-coverage-probe.mjs` (new)
- `tests/directTerraSerperTransport.test.mjs` (new)
- `tests/directTerraAssetCoverageProbe.test.mjs` (new)
- diagnostics and safer direct-field selection in
  `lib/directTerraSerperAssetAdapter.ts`
- a Direct-Terra-only explicit identity fallback in
  `lib/productPageUrl.ts` and `lib/directTerraAssetVerifier.ts`
- regression updates in `tests/directTerraSerperAssetAdapter.test.mjs` and
  `tests/directTerraAssetVerifier.test.mjs`
- current-state updates in `docs/forward-roadmap.md`,
  `docs/qa-loop-results.md`, `docs/agent-dialogue.md`, and this handoff

Historical untracked fixtures and user artifacts remain untracked and
untouched. Do not use `git add -A` in later work.

## OAI-T8A Phase 3 outcome

The new transport is intentionally isolated from the legacy Serper client. It:

- accepts an explicit caller-supplied API key and does not read environment
  variables itself;
- permits only the fixed `https://google.serper.dev/shopping` endpoint;
- sends exactly `{ q, gl: "us", hl: "en", num: 20 }` as JSON;
- makes one `fetch` invocation with `cache: "no-store"` and
  `redirect: "error"`;
- enforces a 12-second timeout and 512,000-byte response-body ceiling;
- requires a JSON response and converts failures to generic reason codes; and
- contains no retry, alternate provider, legacy client, route, or UI path.

The probe freezes exactly five products and deterministic queries:

1. `RIDGID HD1200 shop vacuum`
2. `DEWALT DXV12P-QT shop vacuum`
3. `Vacmaster VFB511B 0202 shop vacuum`
4. `CRAFTSMAN CMXEVBE17595 shop vacuum`
5. `Milwaukee 0910-20 shop vacuum`

Its future live contract is exactly five logical and five physical attempts,
one per target, with no retry or replacement. It scores two independent gates:

- at least 4/5 products receive a safe, identity-matched merchant website;
- at least 4/5 products receive a safe, identity-matched image.

Provider image presence cannot conceal missing safe merchant URLs. Mechanical
gate passage remains `pending_manual_identity_audit`; it is not permission to
wire the adapter into the app.

The sanitized evidence contract retains only target identity, safe selected
assets, reason codes, bounded counts, gate results, and the reconciled attempt
ledger. It excludes raw provider rows, provider IDs, source/seller labels,
prices, headers, queries, and secrets.

The CLI is dry-run by default. Live mode requires all of the following:

- `--execute`
- `--approved-searches=5`
- a full 40-character `--approved-commit` matching `HEAD`
- a process-only valid `SERPER_API_KEY`
- no existing output fixture
- no tracked changes in app, components, docs, lib, scripts, or tests

The attempt ledger is written before each dispatch and must reconcile with all
five adapter results and diagnostics before evidence can be serialized.

## Fail-first and adversarial findings

The initial exact Milwaukee `0910-20` case failed even though both the product
title and merchant path contained the exact brand/model. The shared product-
page matcher previously required an additional non-model path word for brands
outside its official-domain map.

The generalized correction adds optional explicit brand/model evidence to the
shared matcher. Only the dormant Direct-Terra verifier supplies those fields;
all existing callers omit them and preserve current behavior. The fallback
requires:

- explicit brand evidence in the result title;
- every model token in the title;
- every model token in the URL path;
- no compound-model conflict in the title or URL; and
- all existing eligibility, editorial, listing, and host checks to pass.

The regression proves exact `0910-20` is accepted while sibling title and
sibling URL `0910-21` are rejected.

The review also closed four accounting/safety gaps:

1. a provider payload containing an error cannot be rescued by Shopping rows;
2. live API-key approval validation uses the same validator as transport;
3. evidence serialization fails unless physical attempts, batch calls,
   products, and diagnostics reconcile exactly; and
4. the sanitized serializer selects bounded diagnostic fields explicitly, so
   its server-only exact query cannot enter the saved fixture.

## Verification

- Focused Phase 1-3 wall: 40/40 pass.
- Complete test wall: 1232/1232 across 176 suites.
- Typecheck: pass.
- Full lint: zero errors and three pre-existing warnings.
- Production build: pass.
- Dry-run probe: pass; printed only the exact five-query plan and bounds.
- `git diff --check`: pass.
- Live network calls: zero.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Current local `.env.local`, classified without exposing secrets:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

Phase 3 did not modify `.env.local`. The transport/probe remain unreferenced by
the app and inactive regardless of local flags.

## Evidence and limitations still in force

Historical H2B live evidence found zero usable merchant URLs across four
Serper Shopping products because exposed destinations were Google wrappers.
Phase 3 proves bounded transport, accounting, and evidence hygiene; it does
not yet prove that live Serper supplies useful safe merchant pages or images.

The T7C Direct-Terra evaluation remains in force: three categories beat legacy
quality, robot-vac recall/stability remained weak, and missing safe prices are
budget-unverified rather than compliant.

## Next decision

Nothing further is automatically approved. The strongest next step is one
commit-pinned live coverage probe of exactly five Serper Shopping attempts. It
requires a new explicit numeric approval naming the Phase 3 commit. The result
must pass both 4/5 gates and manual identity review before any route/UI
integration is considered.

**Recommended reasoning level:** High for the live probe and manual asset audit
because real provider schema, exact product identity, spend accounting, and
sanitized evidence all become active. Highest is unnecessary unless the live
response contradicts the frozen adapter contract.

## Outstanding review debts

- Dialogue entry [91] asks Claude to challenge the 4/5 + 4/5 gate,
  Direct-Terra-only explicit-identity fallback, and sanitized-fixture boundary.
- Zero-live classification of T7C robot-vac denominator misses versus real
  product-set churn before more robot-vac evaluation spend.
- Budget-constrained evaluation must classify a missing safe price as
  budget-unverified, not silently non-violating.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other live call without a new
  exact numeric approval pinned to the committed Phase 3 revision.
- No further commit, push, flag promotion, `.env.local` edit, deployment,
  publication, or production change without separate approval.
- No route or UI wiring during the coverage probe.
- Serper may supply optional assets only. It must never discover, score, add,
  delete, replace, rerank, rename, or rewrite Terra recommendations.
- Missing or rejected assets remain unavailable and never alter Terra's report.
- Never expose raw provider rows, provider IDs, queries, keys, headers, or
  server-side diagnostics to the browser.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase and boundaries | this file |
| Phase contract | `docs/forward-roadmap.md` OAI-T8A Phase 3 |
| Phase 3 verification | latest `docs/qa-loop-results.md` entry |
| Peer-review request and commit boundary | `docs/agent-dialogue.md` entries [91]-[92] |
| Bounded Shopping transport | `lib/directTerraSerperTransport.ts` |
| Frozen coverage probe | `lib/directTerraAssetCoverageProbe.ts` |
| Commit-pinned CLI | `scripts/run-oai-t8a-asset-coverage-probe.mjs` |
| Mocked adapter | `lib/directTerraSerperAssetAdapter.ts` |
| Phase 1 verifier | `lib/directTerraAssetVerifier.ts` |
| Shared image/page safety | `lib/productImageResolver.ts`, `lib/productPageUrl.ts` |

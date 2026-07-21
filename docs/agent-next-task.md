# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Codex after the reviewed OAI-T8A Direct-Terra
product-assets Phase 1 was committed as `836deb3` (zero live).

## Current state

Taylor approved an adversarial review, any necessary generalized corrections,
and a scoped commit of Phase 1. The review is complete and the corrected phase
is committed. No provider adapter, route/UI wiring, flag change,
live request, deployment, or production behavior was authorized or performed.

The Phase 1 implementation/audit commit is `836deb3` (`Add Direct-Terra
product asset safety boundary`). A docs-only follow-up records that hash and
the next approval boundary. Phase files are:

- `lib/directTerraAssetVerifier.ts`
- `tests/directTerraAssetVerifier.test.mjs`
- `docs/forward-roadmap.md`
- `docs/qa-loop-results.md`
- `docs/agent-dialogue.md`
- this regenerated handoff

`next-env.d.ts` was already modified before this phase and must not be staged.
All historical untracked fixtures and user artifacts remain untracked and
untouched.

## OAI-T8A Phase 1 outcome

The new pure verifier locks optional website/image assets to a Terra-owned
target key, rank, product name, brand, model, and category. It:

- first requires the target fields themselves to be coherent;
- requires candidate-title brand and exact model evidence;
- rejects query/URL/snippet identity borrowing, sibling or dual-model titles,
  accessories, and wrong product types;
- accepts only a direct eligible product page whose title and URL match Terra's
  identity;
- rejects Google/search/listing wrappers, support/editorial/review/article
  pages, affiliate/deeplink/click/track redirects, local names, and literal-IP
  destinations;
- reuses `normalizeTwoLayerSourceUrl`, removing only conservative tracking
  parameters while preserving identity parameters and fragments;
- reuses the RR-061 image validator; and
- accepts an image only from a candidate row whose product URL already passed.

Rejected or missing assets return `unavailable`. They cannot add, remove,
replace, rerank, rename, or rewrite a Terra recommendation. The result exposes
no provider identifier and the module imports no provider client.

## Fail-first and adversarial findings

Phase implementation and review found four real generalized gaps before commit:

1. `DXV12P-QTA` matched target `DXV12P-QT` because a short suffix was dropped.
2. A duplicate URL normalizer removed `ref` and fragments despite the existing
   contract treating them as potentially identity-bearing.
3. Literal-IP/local and affiliate/redirect-wrapper destinations were not
   rejected directly at this seam.
4. Incoherent target fields could bind a safe candidate to the wrong displayed
   Terra product.

All four now have regression coverage. Historical controls also cover RR-061,
RR-078, RR-090, and RR-092-class failures, name-only models, opaque safe
thumbnails, accessories, listings, and target/query echo.

## Verification

- Focused verifier: 17/17 pass.
- Typecheck: pass.
- Complete test wall: 1209/1209 across 173 suites.
- Full lint: zero errors and three pre-existing warnings.
- `git diff --check`: pass.
- Production build: not run; this phase adds an unreferenced pure module and
  tests only, so typecheck, lint, and the full Node wall cover the changed seam.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Current local `.env.local`, classified without exposing secrets:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

This phase did not modify `.env.local`. The asset verifier is not wired and is
inactive regardless of the local direct-Terra flag.

## Prior live evidence still in force

OAI-T7C ran 12 Terra/high calls across four categories. Direct-Terra had zero
wrong-type and zero confirmed over-budget results and beat legacy recall and
stability on office chair, gas grill, and cordless drill. Robot vacuum remained
weak (1.33/4 recall, 0.17 covered-leader Jaccard), and price coverage was sparse
(0.07-0.58). An unpriced constrained pick is budget-unverified, not confirmed
compliant.

The saved robot-vac reports still need zero-live classification of strict
benchmark-denominator misses versus real product-set churn before another
robot-vac live window. OAI-T8A does not supersede that debt.

## Next decision

Nothing beyond the completed commit is automatically approved. The strongest
next step is Phase 2: a separately approved zero-live,
fully mocked Serper Shopping adapter that issues at most one narrow exact-
identity query per Terra product and feeds provider rows into this verifier.
Phase 2 must not call Serper live or wire the route/UI.

**Recommended reasoning level:** High. The adapter is bounded, but query
construction, one-call enforcement, provider-schema normalization, and
server-only diagnostics remain trust-sensitive. Highest is unnecessary unless
the adapter cannot reuse the existing Serper client without reviving legacy
fallback behavior.

## Outstanding review debts

- Claude may still independently challenge dialogue entry [87], but Codex's
  approved adversarial review is complete and no known Phase 1 defect remains.
- Zero-live T7C robot-vac denominator-versus-churn diagnosis before more spend.
- Budget-constrained evaluation must classify missing safe price as
  budget-unverified rather than silently non-violating.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other live call without a new
  exact numeric approval pinned to a commit.
- No push, flag promotion, `.env.local` edit, deployment, publication, or
  production change without separate approval.
- Do not wire Phase 1 into a route or UI during its commit.
- Serper may later supply optional assets only. It must never discover, score,
  add, delete, replace, rerank, rename, or rewrite Terra recommendations.
- Missing/rejected assets stay unavailable and never alter Terra's report.
- Never expose raw provider rows, provider IDs, query strings, keys, headers, or
  server-side rejection diagnostics to the browser.
- Do not delete legacy, prior two-layer, SearchAPI-history, or Serper code
  without rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase and boundaries | this file |
| Phase contract | `docs/forward-roadmap.md` OAI-T8A |
| Verification record | latest `docs/qa-loop-results.md` entry |
| Review closure | `docs/agent-dialogue.md` entry [87] |
| Verifier | `lib/directTerraAssetVerifier.ts` |
| Regression wall | `tests/directTerraAssetVerifier.test.mjs` |
| Shared URL contract | `lib/twoLayerSourceUrl.ts` |
| Shared image safety | `lib/productImageResolver.ts` |
| Shared page safety | `lib/productPageUrl.ts`, `lib/productEligibility.ts` |

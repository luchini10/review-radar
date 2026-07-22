# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Codex for the reviewed OAI-T8A Phase 4 split asset
trust contract and its approved scoped commit. This handoff lands in the same
revision as the Phase 3 result record and Phase 4 code.

## Current phase and commit boundary

The pre-phase base is full commit
`44e0e2d70d968780c889801eaa09953f98988bb7` (`Fix Direct-Terra Shopping
response handling`). Taylor approved the zero-live Phase 4, then separately
approved adversarial review and commit of exactly these eight tracked files:

- `docs/agent-dialogue.md`
- `docs/agent-next-task.md`
- `docs/forward-roadmap.md`
- `docs/qa-loop-results.md`
- `lib/directTerraAssetVerifier.ts`
- `lib/directTerraSerperAssetAdapter.ts`
- `tests/directTerraAssetVerifier.test.mjs`
- `tests/directTerraSerperAssetAdapter.test.mjs`

The sanitized Phase 3 fixtures and every unrelated artifact remain untracked
and excluded. Never use `git add -A`.

## Phase 3 evidence that changed the design

The corrected replacement probe used exactly five Serper Shopping attempts.
All five payloads parsed. Across 100 bounded rows, every row supplied an image,
but every product link was a Google wrapper and none was a direct merchant
page. The original combined same-row policy therefore accepted 0/5 websites
and 0/5 images.

The result proves that repeating the Shopping-only website design would waste
calls. It does not justify accepting Google wrappers.

## Reviewed Phase 4 contract

`lib/directTerraAssetVerifier.ts` is now
`direct-terra-asset-verifier-v2`:

- a website still requires exact title identity, product eligibility, safe
  host/path, no redirect wrapper, and page-identity agreement;
- an image can be verified independently when its title proves exact brand,
  model, and requested product type;
- without a safe direct page, the image must carry private
  `serper_shopping` provenance assigned by the adapter;
- a supplied unsafe, wrapper, or cross-model URL poisons that row's image; and
- wrong-model filenames, family-name conflicts, placeholders, accessories,
  local-network URLs, editorial pages, and output leakage remain rejected.

`lib/directTerraSerperAssetAdapter.ts` is now
`direct-terra-serper-asset-adapter-v3`. It assigns the fixed private Shopping
marker after mapping; provider data cannot choose or override it. Neither the
provider's attempted provenance value nor ReviewRadar's marker appears in the
verification output.

Terra's key, rank, product name, brand, model, and category remain immutable.
Assets cannot add, remove, replace, rename, or rerank recommendations.

## DEWALT classification

Saved T7B response-owned evidence supports retaining Terra's frozen DEWALT
`DXV12P-QT` identity. Shopping returned nearby `DXV12P-QTA`/`QTE` variants but
no exact-title match. This is classified as Shopping coverage uncertainty, not
an alias. No suffix normalization, sibling asset, or card rewrite is allowed.

## Adversarial review and verification

Fail-first tests reproduced the original same-row coupling and then proved the
need for explicit URL-less-image provenance. Final review added a provider-
override/leakage probe. No identity bypass remained.

- focused verifier/adapter wall: 33/33 pass;
- complete wall: 1238/1238 across 176 suites;
- typecheck: pass;
- production build: pass;
- lint: zero errors and three pre-existing warnings; and
- diff check: pass.

No OpenAI, Serper, SearchAPI, direct-page, or other provider request occurred
in Phase 4. No route/UI/API integration, feature flag, `.env.local` edit,
deployment, push, or production change occurred.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Current local `.env.local`, classified without exposing secrets:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

Phase 4 did not read or modify `.env.local`. The asset seam remains unwired and
cannot change user-visible behavior.

## Next approved phase

Taylor explicitly approved a **zero-live website resolver using Terra's
existing response-owned, registered citations before any new search spend**.
Per the one-step protocol, begin it only after reporting the Phase 4 commit.

The resolver should:

1. associate a registered citation with the correct ranked product section;
2. preserve Terra's exact identity and order;
3. reuse existing product-page eligibility, URL safety, and identity gates;
4. reject editorial, PDF, listing/search, wrapper, accessory, sibling-model,
   and unregistered links;
5. leave a website unavailable when exact direct-page proof is absent; and
6. make zero network calls and no route/UI/flag changes in its first phase.

Use response-owned evidence Terra already paid to collect before considering a
new Serper Organic request.

**Recommended reasoning level:** High. Product-section association and exact
page identity are trust-boundary work; Highest is unnecessary unless the saved
response contract cannot preserve source titles or section ownership.

## Outstanding review debts

- The citation resolver does not exist yet.
- The old Phase 3 coverage-probe plan must not be reused live because it
  predates adapter v3 semantics. A future live probe needs a new version,
  review, commit, numeric approval, and commit pin.
- Live image coverage under adapter v3 remains unmeasured.
- Zero-live classification of T7C robot-vac denominator misses remains open.
- Missing safe prices in constrained evaluation remain budget-unverified, not
  silently compliant.

## Hard boundaries

- No provider request without a new exact numeric approval pinned to a
  committed revision.
- No further commit, push, feature-flag promotion, `.env.local` edit,
  deployment, publication, route/UI integration, or production change without
  separate approval.
- Assets may decorate only Terra's immutable recommendations.
- Never display Google wrappers as product websites.
- Never alias model suffixes without independent exact evidence.
- Missing or rejected assets remain unavailable.
- Never expose or persist keys, headers, queries, provider IDs, raw responses,
  or private provenance/diagnostics in client data.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and boundaries | this file |
| Phase 3/4 architecture | `docs/forward-roadmap.md` OAI-T8A section |
| Canonical evidence | latest two `docs/qa-loop-results.md` entries |
| Review/commit boundary | `docs/agent-dialogue.md` entry [97] |
| Split verifier | `lib/directTerraAssetVerifier.ts` |
| Shopping adapter | `lib/directTerraSerperAssetAdapter.ts` |
| Regression walls | `tests/directTerraAssetVerifier.test.mjs`, `tests/directTerraSerperAssetAdapter.test.mjs` |
| Future citation inputs | `lib/directTerraResponse.ts`, `lib/directTerraReportOutline.ts` |

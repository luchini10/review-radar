# ReviewRadar Agent Handoff

Updated: 2026-07-21 by Codex for the reviewed OAI-T8A Phase 3 v2 corrective
commit after the five-attempt v1 probe failed at the parser boundary. This
handoff lands in the same revision as the correction.

## Current state

Committed Phase 3 is `c3096cd` (`Add bounded Direct-Terra asset coverage
probe`). Taylor then approved one live probe pinned to its full hash, exactly
five Serper Shopping requests and five physical attempts. The attempt ledger
reconciled, but all five items were `invalid_response`; website and image
coverage were both 0/5. No retry, replacement, OpenAI, SearchAPI, direct-page
request, app integration, flag change, `.env.local` edit, deployment, push, or
production change occurred.

Taylor subsequently approved the zero-live corrective phase and then separately
approved its review and scoped commit. The revision containing this handoff
includes:

- `lib/directTerraSerperAssetAdapter.ts`
- `lib/directTerraAssetCoverageProbe.ts`
- `scripts/run-oai-t8a-asset-coverage-probe.mjs`
- `tests/directTerraSerperAssetAdapter.test.mjs`
- `tests/directTerraAssetCoverageProbe.test.mjs`
- `docs/forward-roadmap.md`
- `docs/qa-loop-results.md`
- `docs/agent-dialogue.md`
- this regenerated handoff

The sanitized v1 result remains untracked at
`tests/fixtures/review-radar-live/oai-t8a-asset-coverage-probe-c3096cd/result.json`.
It was scrubbed after final inspection found query leakage in the CLI envelope.
It now contains no query fields, exact queries, secret markers, provider IDs,
or raw response. Historical fixtures and unrelated artifacts remain untracked
and untouched. Do not use `git add -A`.

## Phase 3 live outcome

The committed harness dispatched exactly these five requests once each:

1. `RIDGID HD1200 shop vacuum`
2. `DEWALT DXV12P-QT shop vacuum`
3. `Vacmaster VFB511B 0202 shop vacuum`
4. `CRAFTSMAN CMXEVBE17595 shop vacuum`
5. `Milwaukee 0910-20 shop vacuum`

Measured v1 result:

- physical attempts: 5
- diagnostics/items: 5/5
- provider statuses: `invalid_response` for all five
- safe websites: 0/5
- safe images: 0/5
- verdict: `probe_fail_website_coverage`

This is a parser-contract failure, not evidence that Serper lacks suitable
websites or images. V1 did not save safe payload-shape metadata, so the exact
invalid condition for each response cannot be proven from its fixture.

## Earliest evidence-supported root cause

The Phase 3 v1 adapter rejected the entire payload whenever Serper returned
more than 20 Shopping rows. Existing repository evidence shows that assumption
was false:

- `lib/search/serper.ts` already documents that Shopping often returns more
  rows than requested; and
- the saved H2B live fixture records returned counts of 40, 40, 25, and 16.

This proves a generalized incompatibility capable of producing the observed
failure. It does not prove that all five v1 responses exceeded 20, because v1
discarded the schema/count evidence needed for per-request attribution.

## V2 corrective boundary

Adapter and probe contracts are bumped to v2. A valid `shopping` array is now
accepted within the existing transport's 512,000-byte body ceiling, regardless
of its returned row count, but the adapter slices before any mapping or
identity work. At most the first 20 rows can reach the Phase 1 verifier; later
rows are counted and discarded.

Per-target server-only diagnostics now record only bounded safe metadata:

- payload shape: `shopping_array`, `missing_shopping_array`, `provider_error`,
  `non_object`, or `transport_unavailable`;
- returned Shopping row count;
- considered row count, capped at 20; and
- discarded row count.

Missing-array, provider-error, malformed, and transport-failure cases still
fail closed. No raw row, top-level key list, provider value, key, header, query,
price, seller/source label, or provider ID is retained.

The CLI now separates two plans:

- dry-run plan: contains exact queries for preflight transparency;
- persisted execution plan: contains only target identity and bounded approval
  metadata, with no query fields.

Running, complete, and failed fixtures all use only the sanitized plan.

## Fail-first and adversarial evidence

The new tests first failed because:

1. v1 rejected a 40-row Shopping array as `invalid_response`;
2. v1 diagnostics could not distinguish missing arrays, provider errors, or
   transport failure with a safe enum;
3. no query-free execution-plan builder existed; and
4. the CLI spread its query-bearing `plan` into persisted evidence.

V2 now considers exactly 20 of 40 mocked rows, reports 20 discarded, and never
lets rows after 20 reach verification. Malformed/error responses remain closed,
transport failure remains distinct, and serialized execution plans exclude
both query fields and exact query strings.

## Verification

- Focused Phase 1-3 wall: 41/41 pass.
- Complete test wall: 1233/1233 across 176 suites.
- Typecheck: pass.
- Full lint: zero errors and three pre-existing warnings.
- Production build: pass.
- Dry-run probe: pass; exact five-query plan only, zero network.
- `git diff --check`: pass after final documentation regeneration.
- Additional live calls during the corrective phase: zero.

## Flag state

Committed defaults in `.env.example`:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Current local `.env.local`, classified without exposing secrets:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

The live probe and corrective phase did not modify `.env.local`. The asset path
remains unreferenced by the app and inactive regardless of local flags.

## Evidence and limitations still in force

The v2 correction removes one proven parser incompatibility and makes another
failure attributable. It does not prove Serper will pass the 4/5 website and
4/5 image gates. Historical H2B still warns that Shopping merchant destinations
may be Google wrappers. Only a separately approved replacement probe can answer
the coverage question.

The T7C Direct-Terra evaluation also remains in force: three categories beat
legacy quality, robot-vac recall/stability remained weak, and missing safe
prices are budget-unverified rather than compliant.

## Next decision

Nothing further is automatically approved. The strongest next step is a
replacement live probe, but it requires a new explicit approval for exactly
five Serper Shopping attempts pinned to this corrective commit's full hash. The
failed v1 run is spent and excluded; it is not reusable coverage evidence.

**Recommended reasoning level:** High for a replacement live probe and manual
identity audit because real provider coverage and schema evidence become active
again.

## Outstanding review debts

- Dialogue entry [93] asks Claude to challenge the bounded first-20 strategy
  and value-free schema diagnostics before any replacement approval.
- Zero-live classification of T7C robot-vac denominator misses versus real
  product-set churn before more robot-vac evaluation spend.
- Budget-constrained evaluation must classify a missing safe price as
  budget-unverified, not silently non-violating.

## Hard boundaries

- No replacement OpenAI, Serper, SearchAPI, direct-page, or other live request
  without a new exact numeric approval pinned to a committed v2 revision.
- No further commit, push, flag promotion, `.env.local` edit, deployment,
  publication, route/UI integration, or production change without separate
  approval.
- Serper may supply optional assets only. It must never discover, score, add,
  delete, replace, rerank, rename, or rewrite Terra recommendations.
- Missing or rejected assets remain unavailable and never alter Terra's report.
- Never expose or persist raw provider rows, provider IDs, queries, keys,
  headers, or server-only diagnostics outside the sanitized fixture contract.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and boundaries | this file |
| Phase 3 and v2 contract | `docs/forward-roadmap.md` OAI-T8A Phase 3 |
| Live result and corrective verification | latest `docs/qa-loop-results.md` entry |
| Peer-review request | `docs/agent-dialogue.md` entry [93] |
| Saved sanitized v1 result | `tests/fixtures/review-radar-live/oai-t8a-asset-coverage-probe-c3096cd/result.json` |
| V2 adapter | `lib/directTerraSerperAssetAdapter.ts` |
| V2 probe/evidence contract | `lib/directTerraAssetCoverageProbe.ts` |
| Commit-pinned CLI | `scripts/run-oai-t8a-asset-coverage-probe.mjs` |
| Phase 1 asset verifier | `lib/directTerraAssetVerifier.ts` |

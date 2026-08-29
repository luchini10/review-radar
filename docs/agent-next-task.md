# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2G asset-identity live stop.
The PR-2G documentation closeout is current HEAD after its self-contained
commit; resolve the exact SHA with `git rev-parse HEAD`. Its code parent is
`b01c335908e78101501bf0b40cd833f0e8f3b5d1`.

## Current state

ReviewRadar is **not production-ready**.

PR-2G executed the one authorized broad `shop vac` attempt at `b01c335`. Research
passed contract v3 with 12 candidates and 58 canonical sources. Deterministic
verification made 12 Shopping requests returning 194 rows and attempted 12
source fetches with seven successes/19 physical HTTP calls. It produced zero
eligible, zero close match, and 12 excluded candidates. The route stopped at
HTTP 502 `verification_failed` after 51.618 seconds, before presentation or
rendering. No public response, card, source list, or result file exists.

Sanitized evidence v3 conserved every candidate's earliest loss as
`assetIdentityUnproven`:

| First loss | Count |
| --- | ---: |
| asset identity unproven | 12 |
| complete-product relationship unproven | 0 |
| identity-safe product URL unavailable | 0 |
| hard requirement failed | 0 |
| hard requirement not verified | 0 |
| no-loss eligible | 0 |

The separate unowned-source, invalid-source-input, and invalid-observed-claim
candidate counters were all zero. The six first-loss counts conserve to 12 and
reconcile with eligible/close/excluded.

This proves only PR-2G's aggregate earliest loss. It does not reveal whether a
research identity tuple was incoherent or whether available page/Shopping titles
failed brand, model, conflict, or product-type checks. It identifies no candidate
or evidence, says nothing about shadowed later gates, and is not a generalized or
category-wide distribution.

## PR-2G envelope, cost, privacy, and audit

| Measure | Actual | Ceiling |
| --- | ---: | ---: |
| OpenAI creates | 1 | 2 |
| retrieves | 20 | 60 |
| safety cancels | 1 | 1 |
| hosted searches | 3 | 10 |
| Serper Shopping | 12 | 15 |
| source-page fetches | 12 | 30 |
| physical page HTTP attempts | 19 | 90 |
| retries / replacements / fallbacks | 0 / 0 / 0 | 0 / 0 / 0 |

There was no second create/case, Serper organic, SearchAPI, presentation
diagnostic, public response, render, card, source list, or result file.

Usage was 28,335 input, zero cached input, 6,029 output, and three hosted
searches. All 21 ledger snapshots had one nonempty response hash; one completed
ledger was accounted and none duplicated. Cost is `$0.191272` frozen nominal,
`$0.208982` frozen conservative, and `$0.159018` at the dated current card,
below the frozen `$3` gate.

The untracked spent evidence is
`tests/fixtures/review-radar-live/oai-t10-phase-d-b01c335/attempt.json` (19,053
bytes; SHA-256
`a8696d6b12c6da6163d0de278da504bbff579338a9fda4326beb2dcf85c70930`). Its
only URLs are approved OpenAI pricing sources. Both local key values and every
raw provider, prompt/body/header, candidate/request/evidence identifier,
product/source URL, credential, and secret field are absent.

Independent read-only audit returned `VERIFIED` after rebinding the exact
commit/case/schema, recomputing counters/cost/conservation, confirming the first
terminal stop and no downstream work, inspecting privacy, and authenticating a
clean tracked tree/index. The directory is spent: never retry, edit, stage, or
reuse it.

## Objective and decision frame for the next phase

The proven product bottleneck is asset identity, before relationship,
requirements, presentation, ranking, rendering, and UI can matter. The exact
PR-2G identity reason is intentionally unavailable.

Read-only offline inspection separately proved a generalized self-mismatch:

- `validateStagedTerraResearchOutput()` accepts bounded nonempty
  `product_name`, `brand`, `model`, and `product_type` independently.
- An eight-candidate schema-valid response with unique identity tuples passed
  research validation while all eight failed
  `directTerraAssetTargetIsCoherent()`.
- Even an otherwise exact asset title/URL for one such target was rejected as
  `invalid_target_identity` before asset acceptance.
- The research prompt says to keep exact brand/model/type identities separate,
  but does not require `product_name` to contain and agree with all three as the
  unchanged verifier requires.

This defect can produce PR-2G's aggregate class. The private live evidence does
not prove it caused PR-2G.

Stronger alternatives considered:

- Loosening brand/model/type identity is rejected because it risks sibling-
  model or wrong-product assets.
- Running another paid attempt is rejected because the contract can still admit
  impossible targets and waste Shopping/page work.
- Adding candidate/private diagnostics is rejected because the independently
  reproduced mismatch can be corrected without widening the privacy surface.
- Synthesizing or silently repairing a product name is rejected because it
  would create identity content not supplied as one coherent provider claim.

The strongest next step is to reuse the same unchanged target-coherence
predicate during research acceptance, explicitly state the relational identity
contract in the prompt, and roll contract/prompt job identity so old work fails
closed. This changes failure timing for impossible targets, not asset
eligibility; it prevents guaranteed downstream work from running.

**Recommended reasoning level:** High for identity-contract equivalence and
fingerprint rollover; Medium for localized implementation/tests.

## Current approved phase: PR-2H research/asset identity alignment

1. Add fail-first tests proving a schema-valid research candidate can currently
   pass with each incoherent identity class:
   - product name missing/mismatching brand;
   - product name missing the model core;
   - conflicting model in product name; and
   - product name/type mismatch.
2. Preserve coherent positives, including numeric-core/trim behavior already
   accepted by `directTerraAssetTargetIsCoherent()`; do not introduce a second
   identity algorithm.
3. During staged research candidate parsing, construct the same target fields
   the verifier will use and reject a non-coherent tuple as
   `research_candidate_invalid / candidate_identity` before Shopping/page work.
4. Update the research instructions to require `product_name` to agree with the
   separate brand, model, and complete-product type under the same existing
   coherence rule. Keep the strict JSON shape at research schema v2 unless a
   shape change is actually needed.
5. Roll the contract and prompt version/fingerprint; update runtime/token/tests
   so an older in-flight job cannot cross the new acceptance boundary.
6. Do not change `directTerraAssetTargetIsCoherent()`, asset identity/relationship
   rules, eligibility, evidence acceptance, source/page/commerce/requirement
   gates, public responses, aggregate diagnostics, flags, or network/cost
   ceilings.
7. Run focused contract/prompt/token/runtime/verifier/route tests, staged wall,
   complete deterministic wall, typecheck, lint, build, credential-neutral E2E,
   eval, ranking, zero-network dry run, diff review, and independent read-only
   review.
8. Update authoritative records, fully regenerate this handoff, stage only
   phase-owned tracked paths, and make one self-contained local commit.

PR-2H is zero-live. It does not authorize another provider, search, Shopping,
or page request.

## Approval and flag state

Taylor's 2026-08-29 production-readiness mandate authorizes scoped local
implementation, bounded low-parallelism live QA, documentation, and
self-contained local commits. It does not authorize deployment, production
mutation, push, publication, secret exposure, destructive cleanup, or unrelated
external spending.

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` remains user-owned and locally enables
Direct Terra. Never edit, stage, or print it.

## Outstanding readiness debts

- PR-005: named deterministic QA workers execute the same shared synthetic
  evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; presentation and
  rendering have not run live.
- PR-014: research accepts identity tuples that the asset verifier can never
  accept; correction is the current zero-live phase.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or directory,
  including `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`, and
  `oai-t10-phase-d-b01c335`.
- Do not make any external product/provider request in PR-2H.
- Do not claim the reproduced contract mismatch caused PR-2G.
- Do not synthesize/repair identity or loosen brand, model, product type,
  relationship, requirement, availability, price, source/page, commerce, asset,
  redirect, or private-network gates.
- Retain aggregate counts only. No candidate/request/evidence-identifying or raw
  provider material may enter diagnostics or evidence.
- The client response and default-off routing must remain unchanged.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or any Phase D fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phase sequence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2G canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable live/identity boundaries | top of `docs/review-radar-test-memory.md` |
| Research parser and fingerprint | `lib/stagedTerraContract.ts` |
| Research instructions/request | `lib/stagedTerraPrompt.ts` |
| Shared target-coherence rule | `lib/directTerraAssetVerifier.ts` |
| Runtime/job-token rollover | `lib/stagedTerraRuntime.ts`; `lib/stagedTerraJobToken.ts` |
| Verifier first loss | `lib/stagedTerraVerifier.ts` |
| Focused tests | `tests/stagedTerraContract.test.mjs`; `tests/stagedTerraIntegration.test.mjs`; `tests/stagedTerraRuntime.test.mjs`; `tests/stagedTerraVerifier.test.mjs`; `tests/stagedTerraRoute.test.mjs` |
| Spent PR-2G evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-b01c335/attempt.json` |

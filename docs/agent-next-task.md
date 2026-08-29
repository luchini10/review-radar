# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2E verification live stop.
The latest code commit is PR-2D at
`56a513784e195ee255410e6f49d29763d87af5c7`; use `git log -1` after the PR-2E
documentation closeout for its exact commit.

## Current state

ReviewRadar is **not production-ready**.

PR-2E ran exactly one new-commit, new-directory broad `shop vac` attempt at
`56a513784e195ee255410e6f49d29763d87af5c7`. Research passed contract v3 with 12
candidates and 73 canonical response sources. Deterministic verification then
excluded all 12 candidates, so the route stopped at HTTP 502
`verification_failed` after 59.154 seconds. Presentation and rendering did not
run, and no public card, source list, or result was produced.

PR-2E counters:

| Measure | Actual | Ceiling |
| --- | ---: | ---: |
| OpenAI creates | 1 | 2 |
| retrieves | 23 | 60 |
| safety cancels | 1 | 1 |
| hosted searches | 4 | 10 |
| Serper Shopping | 12 | 15 |
| source-page fetches | 13 | 30 |
| physical page HTTP attempts | 13 | 90 |
| retries / replacements / fallbacks | 0 / 0 / 0 | 0 / 0 / 0 |

The 12 Shopping requests returned 212 rows. Thirteen bounded source fetches had
three successes. Verification produced zero eligible, zero close match, and 12
excluded candidates. There was no second create or case, Serper organic,
SearchAPI, presentation diagnostic, public response, or result file.

The completed research ledger recorded 38,274 input tokens, zero cached input,
6,884 output tokens, and four hosted searches. One ledger was accounted with no
duplicate. Cost is `$0.238945` frozen nominal, `$0.262866` frozen conservative,
and `$0.199156` under the dated current card, below the frozen `$3` gate.

The untracked sanitized evidence is
`tests/fixtures/review-radar-live/oai-t10-phase-d-56a5137/attempt.json`. It is
spent. Never retry it, edit or stage it, or reuse its directory. Its only URL
values are the three approved OpenAI pricing sources; both local key values are
absent; the longest retained values are 64-character hashes. It contains no raw
output, provider ID, prompt content, product-source URL, body, header,
credential, secret, or candidate object.

Independent read-only audit returned `VERIFIED` after rebinding the fixture to
the exact commit/case/schema, recomputing every counter and cost, checking the
first-terminal stop, privacy, no downstream work, and clean tracked state.

## Objective and decision frame for the next phase

The proven bottleneck is deterministic verification attribution, not research,
presentation, ranking, or UI. Research and exact source ownership passed on the
new response. Verification rejected all candidates, but the route persisted
only network totals and eligible/close/excluded counts.

`materializeStagedTerraEvidencePackage()` already computes server-owned
structured diagnostics for identity, complete-product type, accepted/rejected
sources, claims, prices, assets, and requirement verdicts. The route discards
those details before emitting its sanitized diagnostic. The spent fixture
therefore cannot identify why all 12 candidates were excluded.

Stronger alternatives considered:

- Another paid attempt now could produce another unattributable verification
  failure and cannot explain PR-2E, so it is rejected.
- Weakening identity, availability, product-type, requirement, page, or commerce
  gates to obtain a card is prohibited.
- Persisting per-candidate records, names, models, URLs, requirement IDs, or
  evidence would create an unnecessary privacy/side-channel surface.

Verified facts:

- Twelve contract-valid candidates entered verification; all were excluded.
- The existing deterministic verifier result contains enough booleans/enums to
  derive a safe aggregate first-loss distribution before returning failure.
- No saved evidence can distinguish identity, product type, requirement fail,
  requirement unknown, source rejection, or claim rejection for PR-2E.

Engineering judgment:

- The smallest high-value correction is a closed aggregate count contract whose
  candidate first-loss buckets conserve exactly to the candidate total and
  whose source/claim rejection buckets are independently bounded.

Uncertainty:

- PR-2E's verifier first-loss distribution is permanently unknowable from its
  saved evidence. Independently approved aggregate diagnostics can attribute
  only a future attempt's own distribution.
- Aggregate attribution alone does not fix verification, prove feasibility, or
  authorize another request.

**Recommended reasoning level:** High for privacy and bucket semantics; Medium
for localized aggregation and route tests.

## Current approved phase: PR-2F safe aggregate verification attribution

1. Add fail-first route/diagnostic tests showing the current verification
   failure lacks aggregate first-loss attribution.
2. Define a closed, server-owned candidate first-loss enum derived only from
   existing verifier booleans and requirement verdict enums. Use deterministic
   precedence so the bucket total equals the candidate total.
3. Aggregate counts only. Do not retain any per-candidate row or candidate ID,
   name, brand, model, type string, URL, host, title, source, requirement ID/text,
   claim, price, page content, provider ID, prompt, key, credential, or secret.
4. If source/claim rejection counts are retained, accept only the verifier's
   closed reason enum and prove unknown/private values are dropped. Keep them
   separate from mutually exclusive candidate first-loss buckets.
5. Propagate the aggregate only under `stage=verification` and
   `outcome=failed|completed`. The public response must remain byte-equivalent
   and generic.
6. Do not change research prompt/schema, candidate/source validation, verifier
   eligibility, evidence acceptance, Shopping/fetch behavior, presentation,
   renderer, feature flags, or cost/network ceilings.
7. Run focused verifier/route/Phase D tests, privacy and conservation mutations,
   full staged/full deterministic suites, typecheck, lint, build, hermetic E2E,
   eval, ranking, dry run, diff review, and independent read-only review.
8. Update authoritative records, regenerate this handoff, stage only tracked
   phase-owned paths, and make one self-contained local commit.

PR-2F is zero-live. It does not authorize a replacement feasibility attempt.

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
Direct Terra. Never edit or stage it.

## Outstanding readiness debts

- PR-005: named deterministic QA workers execute the same shared synthetic
  evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  first-loss distribution, latency, calls, and cost are unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-012: all 12 research-valid candidates were excluded; the aggregate route
  diagnostic cannot identify the verifier first loss.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned in
  `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never retry, edit, stage, or reuse any spent Phase D attempt or evidence
  directory, including `oai-t10-phase-d-56a5137`.
- Do not make any external product/provider request in PR-2F.
- Do not alter verifier eligibility or weaken identity, complete-product,
  requirement, availability, price, source/page, commerce, asset, redirect, or
  private-network gates.
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
| Living defects, sequence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2E canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable live/privacy boundaries | top of `docs/review-radar-test-memory.md` |
| Verifier diagnostics and eligibility | `lib/stagedTerraVerifier.ts` |
| Route diagnostic aggregation | `lib/stagedTerraRecommendationRoute.ts` |
| Runtime collection counters | `lib/stagedTerraRuntime.ts` |
| Evidence package contract | `lib/stagedTerraContract.ts` |
| Phase D plan/runner | `scripts/oai-t10-phase-d.mjs`; `scripts/run-oai-t10-phase-d.mjs` |
| Focused tests | `tests/stagedTerraVerifier.test.mjs`; `tests/stagedTerraRoute.test.mjs`; `tests/stagedTerraPhaseDRunner.test.mjs` |
| Spent sanitized PR-2E evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-56a5137/attempt.json` |

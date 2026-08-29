# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the PR-2 live feasibility stop.
Use `git log -1` for the current documentation closeout commit.

## Current state

ReviewRadar is **not production-ready**.

PR-0/PR-1 is committed at
`a15d935747313f9a87a3b145caa34ad6d2f6c8b6`. It made Playwright
credential-neutral and default-off, retained only the four closed staged
research validation classes, and accounted terminal provider usage after local
failure. Its focused 33/33, complete 1,435/1,435, E2E 17/17, typecheck, build,
eval, ranking comparison, and independent review were green.

PR-2 then used that exact commit for one frozen broad `shop vac` attempt. The
attempt is spent and terminal. Terra completed provider research after sixteen
retrieves with:

- 21,478 input tokens;
- 5,450 output tokens;
- two hosted searches; and
- 36 response-owned sources.

ReviewRadar returned HTTP 502 `research_failed` with the safely retained class
`research_candidate_invalid`. The failure occurred before deterministic
verification, presentation, Serper Shopping, source-page fetching, public
cards, or sources.

One create and one safety cancel ran. There was no retry, replacement, fallback,
SearchAPI call, Serper organic/Shopping call, or page request. The frozen July
rate card reports `$0.155445` standard / `$0.168869` conservative, below the
`$3` ceiling. Official 2026-08-29 rates imply approximately `$0.128356` at
current standard prices; the frozen estimator remains safe but its standard
label is stale.

Sanitized untracked evidence:

`tests/fixtures/review-radar-live/oai-t10-phase-d-a15d935/attempt.json`

A bounded scan found no raw output, provider ID, prompt, source URL, header,
secret, API key, or fetched body. Direct value checks confirmed both process
keys are absent. Never stage, edit, retry, replace, or reuse this fixture.

## Current approved next phase

Phase PR-2A is **zero-live candidate-contract diagnosis and correction**.

The exact proven bottleneck is now one or more invalid candidate fields under
`staged-terra-research-v1`. The closed class rules out top-level research
shape, source-registry, and cross-candidate duplicate-identity failures, but it
does not expose the exact candidate or field. Do not guess and do not add raw
diagnostics.

Inspect and cross-compare:

1. the Responses structured-output JSON schema;
2. the research prompt's candidate instructions;
3. the provider response adapter;
4. every `validateStagedTerraResearchOutput()` candidate branch; and
5. the deterministic fixtures/mutations that claim schema-validator parity.

Establish a fail-first deterministic reproduction for any actual mismatch,
then make the smallest generalized correction. Preserve every product-trust
gate. If the exact invariant still cannot be proven statically, a narrower
field-level enum is permissible only after privacy review; no new live spend is
the fallback.

PR-010 should remain separate unless the fix is purely naming/data plumbing:
preserve the immutable frozen approval-rate estimate and distinguish it from a
dated current-rate estimate. Never weaken the `$3` fail-closed ceiling.

**Recommended reasoning level:** High. The work crosses strict structured
output, provider adaptation, privacy, product-trust, and spend-evidence
boundaries.

## Verification and phase-closeout requirements

- fail-first proof of the exact generalized mismatch;
- complete candidate-field and mutation matrix;
- focused staged wall and complete unit suite;
- typecheck, lint, E2E, deterministic eval, ranking comparison, and production
  build as relevant;
- independent read-only diff review;
- update the smallest authoritative records and regenerate this handoff;
- stage only phase-owned paths and create a self-contained local commit; and
- make no external request during PR-2A.

## Approval and flag state

Taylor's 2026-08-29 production-readiness mandate authorizes ordinary scoped
local implementation, bounded low-parallelism live QA, documentation, and
self-contained local commits. It does not authorize deployment, production
mutation, push, publication, secret exposure, destructive cleanup, or broader
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

- PR-005: five named deterministic QA workers execute the same shared synthetic
  evaluator rather than their listed category batches.
- PR-006: current leader recall, final-set stability, hard-requirement truth,
  first-loss distribution, latency, calls, and cost are unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-009: staged candidate validation is the active P1 feasibility blocker.
- PR-010: frozen approval-rate output is mislabeled as current standard cost.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- No retry or replacement of either spent Phase D attempt.
- No new OpenAI, Serper, SearchAPI, page, or other external request in PR-2A.
- Do not weaken candidate-count, exact-source, identity, requirement,
  duplicate, eligibility, product-type, sibling/accessory, editorial/support,
  redirect, private-network, price, or wrong-image gates.
- Do not retain raw model responses, candidate objects, provider IDs, prompts,
  source URLs, fetched bodies, headers, credentials, or secrets in diagnostics.
- Do not hardcode leaders or add product-, brand-, category-, retailer-, or
  fixture-specific behavior.
- Never stage `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`, historical
  live fixtures, or the new PR-2 fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, phases, evidence, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-2 canonical result | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable live stop and no-retry rule | top of `docs/review-radar-test-memory.md` |
| Sanitized PR-2 evidence | `tests/fixtures/review-radar-live/oai-t10-phase-d-a15d935/attempt.json` |
| Research prompt/schema | staged research request builder and prompt modules found via `rg "STAGED_TERRA_RESEARCH" lib` |
| Candidate validator and closed reasons | `lib/stagedTerraContract.ts` |
| Runtime adapter | `lib/stagedTerraRuntime.ts` |
| Phase D frozen envelope/accounting | `scripts/oai-t10-phase-d.mjs` |
| Architecture | staged Terra section in `ReviewRadar-Overview.md`; OAI-T10 in `docs/forward-roadmap.md` |

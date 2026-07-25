# ReviewRadar Agent Handoff

Updated: 2026-07-25 by Codex after the first OAI-T10 Phase D live outcome.
Use `git log -1` for the current scoped closeout commit.

## Current state

OAI-T9 remains terminally complete with `single_call_architecture_no_go`.
Direct-Terra remains default-off and undeployed.

OAI-T10 Phases A-C built the default-off staged Terra path:

1. one compact Terra/high background response researches 8-15 candidates;
2. deterministic server code owns identity, requirement, fact, eligibility,
   price, product-page, and image trust; and
3. one independent Terra/medium response with no tools receives only the
   verified evidence package and owns presentation.

Phase D's first and only approved feasibility attempt ran at
`ec528d758030388c44912e25ff0c57d464fb46e1`. It stopped after its first
terminal outcome as required.

## Phase D live result

The frozen request was `{ "query": "shop vac" }`.

Terra research completed at the provider with:

- one Responses create;
- thirteen retrieves;
- two hosted web searches;
- 21,932 input tokens;
- 5,318 output tokens;
- 36 response-owned sources; and
- one bounded safety cancel after the application rejected completion.

ReviewRadar returned HTTP 502 `research_failed` because the completed output
failed `staged-terra-research-v1` validation with
`invalid_research_contract`.

The failure occurred before:

- deterministic verification;
- the Terra/medium presentation request;
- Serper Shopping;
- source-page fetches; or
- public cards and sources.

There was no retry, replacement, fallback, extra case, Serper organic,
SearchAPI, flag change, `.env.local` edit, deployment, production change, or
push. The sanitized untracked evidence is:

`tests/fixtures/review-radar-live/oai-t10-phase-d-ec528d7/attempt.json`

## Important accounting correction

The attempt file currently reports `$0` because the Phase D cost estimator
counts only diagnostics whose route outcome is `completed`. It incorrectly
excludes a provider-completed response whose structured output later fails
validation.

Using the recorded usage and the frozen Terra rates:

- standard estimate: `$0.154600`;
- conservative estimate: `$0.168307`; and
- approved ceiling: `$3.00`.

The usage stayed within the approved ceiling, but the estimator must be fixed
before any future live attempt.

## What remains unknown

The runtime produced a safe `validationReason` enum when research validation
failed, but the route's diagnostic reporter retained only the broader
`invalid_research_contract` failure. Raw model output and provider IDs were
correctly not retained.

Therefore static code and the sanitized fixture cannot prove whether this
specific response failed because of:

- the top-level research shape or 8-15 candidate count;
- an unregistered source URL;
- an invalid candidate field or requirement mapping; or
- a duplicate normalized brand/model identity.

Do not guess which one occurred and do not change the research contract yet.

## Next step and approval boundary

The next step should be a **zero-live Phase D diagnostic correction**, not a
retry:

1. retain the bounded `validationReason` enum in server-only diagnostics and
   sanitized Phase D evidence;
2. count terminal provider usage even when later schema validation fails;
3. add tests proving no raw output, provider ID, source URL, prompt, or secret
   is retained;
4. replay deterministic malformed outputs to prove every validation class is
   distinguishable; and
5. adversarially review and commit the correction.

Only after that correction identifies the exact failed invariant should Taylor
decide whether to repair the prompt, schema, or adapter. Any new OpenAI,
Serper, page, or other external request requires a separately approved
commit-pinned envelope. No replacement spend is authorized.

**Recommended reasoning level:** High. The correction is small, but separating
provider success, schema failure, safe attribution, and actual cost requires
careful trust-boundary reasoning. Highest is unnecessary.

## Approval and flag state

Taylor approved and consumed exactly one OAI-T10 Phase D live attempt. Taylor
also requested automatic scoped local commits.

No diagnostic correction, replacement live attempt, flag promotion,
deployment, production change, or push is currently approved.

Committed defaults:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

## Hard boundaries

- Do not retry or replace the consumed Phase D attempt.
- Do not infer the exact schema defect from `invalid_research_contract`.
- Do not retain raw model responses, provider IDs, prompts, source URLs,
  fetched bodies, request headers, or secrets in diagnostics.
- Do not weaken the 8-15 candidate, exact-source, identity, requirement,
  duplicate, eligibility, product-type, sibling/accessory, editorial/support,
  redirect, private-network, price, or wrong-image gates.
- Do not revive OAI-T9's single-call design, substitute Sol, hardcode leaders,
  or add product-, brand-, category-, or retailer-specific rules.
- No external request, `.env.local` edit, flag promotion, deployment,
  production change, publication, or push without its explicit boundary.
- Never stage the live fixture or unrelated `.claude/`, baseline,
  `fable-transfer-kit/`, or historical live artifacts. Never use `git add -A`.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Phase D sanitized result | `tests/fixtures/review-radar-live/oai-t10-phase-d-ec528d7/attempt.json` |
| Phase D harness | `scripts/oai-t10-phase-d.mjs`, `scripts/run-oai-t10-phase-d.mjs` |
| Research validator | `lib/stagedTerraContract.ts`, `validateStagedTerraResearchOutput()` |
| Runtime reason code | `lib/stagedTerraRuntime.ts`, `pollStagedTerraResearch()` |
| Route diagnostic loss | `lib/stagedTerraRecommendationRoute.ts`, failed `research_poll` report |
| Canonical live result | latest OAI-T10 Phase D entry in `docs/qa-loop-results.md` |
| Durable live-test lesson | top of `docs/review-radar-test-memory.md` |
| Peer channel | dialogue entry `[123]` |
| Architecture | `docs/forward-roadmap.md`, OAI-T10 |

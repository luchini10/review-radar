# ReviewRadar Agent Handoff

Updated: 2026-07-15 by 🟧 Codex after completing OAI-1 offline. OAI-2A has
not started and has no approval.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the active `OAI — OpenAI-only autonomous research migration` section
   and standing guardrails in `docs/forward-roadmap.md`. The V2 and earlier
   R/C plans are historical unless this handoff says otherwise.
4. Read `docs/agent-dialogue.md` from entry [39] onward.
5. Before live work, re-check the current OpenAI model/tool prices and account
   availability. No estimate or approval carries forward automatically.

## Current state

- Code baseline is `25bc313`; OAI-0 plan commit is `3dc1131`. OAI-1 is a local,
  uncommitted working-tree change because Taylor approved execution but did not
  separately authorize an OAI-1 commit.
- OAI-1 created an isolated, inactive contract around the Responses API. The
  production recommendation route, UI, flags, `.env.local`, and user-visible
  behavior are unchanged.
- The deterministic normal path now has versioned definitions for the shopper
  request, optional ambiguity-only interpreter, universal research prompt,
  strict final slate, source registry, per-field references, verification
  policy, and UI draft adapter in `lib/autonomousResearchContract.ts`.
- `lib/autonomousResearchAdapter.ts` freezes one autonomous research request:
  required hosted web search, full source inclusion, strict structured output,
  background polling, explicit model/reasoning/limits, no retry, safe hashes
  and aggregate metadata only, and fail-closed source/request contracts.
- `lib/autonomousResearchEvaluation.ts` freezes 36 cases before live results:
  12 prompt-development, 12 primary, and 12 sealed holdout. It contains no
  benchmark leaders or expected products.
- The historical audit extends `scripts/analyze-readiness-fixtures.mjs` rather
  than creating a parallel measurement stack. It examined all 56 saved JSON
  fixtures; 20 had explicit `final_openai_research` lineage and one malformed-
  budget spent fixture was retained but excluded from quality means.
- Historical explicit lineage contained 119 candidate rows / 99 normalized
  names across the inventory, 20 displayed-card contributions, and 10 selected
  cards with an observed saved final price. Across 19 usable historical runs,
  raw AI-row leader coverage averaged `3.6316`, while selected AI-row coverage
  averaged `0.7895`.
- First losses across all 119 rows were 65 no-verified-citation, 28 requirement-
  filter exclusions, 20 selected, and six other recorded outcomes. Static saved
  title/URL signals were 1 missing URL, 0 malformed URLs, 39 non-renderable
  eligibility results, 7 wrong-type results, and 74 page-selector rejections.
  These are signals only, not current page/price/identity verification.
- The audit cannot prove autonomous quality: the historical prompt received an
  app-generated query plan and Serper candidates (`lib/researchPrompt.ts:167-
  171,188`). It is M3 supplemental evidence only.
- OAI-1 verification: 960/960 tests across 132 suites, typecheck, build, and
  offline eval pass; lint has 0 errors and 3 pre-existing warnings. Zero live
  OpenAI/Serper calls and zero external product/source verification fetches.
  Read-only official OpenAI API documentation was consulted for current model,
  Responses API, tool, background, structured-output, and pricing contracts.
- Register is unchanged at 90 total / 85 Fixed / 4 Needs Investigation / 1
  Won't Fix. The legacy C5 quality failure remains historical context.

## Frozen OAI-2A proposal — approval pending

Use three primary catalog cases from three categories:

1. `primary-01` broad vacuum — deterministic request, skips Call 1.
2. `primary-04` constrained gas grill — structured budget/burner requirement,
   skips Call 1.
3. `primary-12` ambiguous/injection leaf blower — one non-web Call 1 followed
   by Call 2.

Proposed exact configuration:

- Call 2: three `gpt-5.6-sol` Responses API requests at `high` reasoning,
  `max_output_tokens=24000`, required `web_search`, `max_tool_calls=20`, full
  `web_search_call.action.sources`, strict `oai-final-slate-v1`, background
  mode, two-minute HTTP timeout, 20-minute overall timeout, five-second
  polling, at most 180 polls.
- Call 1: one `gpt-5.6-sol` request at `high`, no tools, strict interpreter
  schema, 50,000-character input ceiling, `max_output_tokens=4000`, two-minute
  timeout.
- Approval units: four API calls total, at most 60 hosted web-search tool calls,
  zero Serper calls, zero retries, zero replacements.
- Planning basis as of 2026-07-15: GPT-5.6 Sol standard short-context rates
  `$5/M` input, `$0.50/M` cached input, `$30/M` output; long context `$10/M`
  input and `$45/M` output; hosted web search `$0.01/call` plus search-content
  tokens. The usage formula subtracts cached tokens from uncached input before
  applying both rates.
- Conservative planning hard ceiling: `$40` for the proposed four-call window.
  This uses the three research calls at the model's maximum long context,
  maximum output, and all 20 tool calls plus the bounded interpreter. Actual
  spend should be much lower, but the approval must use the conservative cap.
- If the model is unavailable, the request fails, the schema is rejected, or a
  call is accidentally duplicated, stop. No fallback, retry, replacement, or
  model substitution is pre-approved.

The phase approval must also authorize bounded human opening of the returned
source pages for semantic support inspection. Those opens are evidence review,
not application verifier fetches.

## Next task — explicit approval required

Execute **OAI-2A only** per `docs/forward-roadmap.md` using the frozen proposal
above. Capture the exact redacted request hash, returned model ID, usage, tool
actions/queries, complete consulted-source list, field/source bindings,
latency, and cost. Manually inspect every proposed card and a stratified set of
claims against only the response-returned sources. Stop after the three cases
and make the architecture pass/kill decision; do not begin OAI-2B.

**Recommended reasoning level: High for execution, Highest for the final
source-support and architecture go/no-go judgment.** The request machinery is
already frozen and tested; the decisive work is careful evidence inspection,
where the highest setting is worth using if support is disputed.

## Hard boundaries

- No live OpenAI/Serper call, returned-source page opening, or other external
  verification fetch without Taylor's explicit new OAI-2A approval naming the
  four calls, 60-tool-call ceiling, `$40` ceiling, and source-page inspection.
- No OAI-1 commit, flag promotion, `.env.local` edit, production behavior,
  deployment, replacement, retry, model substitution, threshold change, or
  OAI-2B work without separate approval.
- The OAI path sends no Serper request and receives no app-generated query list
  or candidate list. The model controls hosted search within Call 2.
- Every displayable fact must bind to source metadata returned by that same
  response. Mechanical URL membership is necessary but does not prove semantic
  support.
- The future verifier may reject, downgrade, normalize, exact-dedupe, or clear
  unsafe optional fields. It may not discover, invent, rescue, score, add, or
  reorder products.
- Preserve generalized price, citation, requirement, product-type, identity,
  image, eligibility, dedupe, URL, source-quality, and hard-constraint gates.
- No benchmark leader may enter production prompts, requests, code paths,
  ranking, validation, or behavior tests.
- Live fixtures and pre-existing untracked artifacts stay untracked. Stage only
  explicitly authorized files; never use `git add -A`.
- One phase per explicit approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [37] still asks Claude to verify the post-C5 safety repair.
- Entries [38]–[40] are architecture history and independent-review context.
- The new OAI-1 completion entry asks Claude to challenge source-binding,
  interpreter routing, and the `$40` OAI-2A ceiling. Peer review is advisory.
- Taylor remains the sole approver for commits, live spend, source-page opens,
  model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active phases and gates | `docs/forward-roadmap.md` OAI section |
| Versioned request/prompt/schema/UI contract | `lib/autonomousResearchContract.ts` |
| Mocked Responses adapters and OAI-2A config | `lib/autonomousResearchAdapter.ts` |
| Frozen 36-case catalog | `lib/autonomousResearchEvaluation.ts` |
| Historical AI-row audit | `scripts/analyze-readiness-fixtures.mjs` |
| Contract tests | `tests/autonomousResearch*.test.mjs` |
| Historical audit tests | `tests/historicalOpenAiAudit.test.mjs` |
| Existing source collector | `lib/responseSources.ts` |
| Latest QA evidence | latest entry in `docs/qa-loop-results.md` |
| Peer review | `docs/agent-dialogue.md` entry [39] onward |

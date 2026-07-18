# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T5D structured lifecycle-
smoke preflight and its approved local commit. OAI-T5D is the current completed
phase; its parent was `28743e9` (`Adopt structured two-layer research output`).
No live call, retry, replacement, quality gate, verifier, mode promotion,
deployment, push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read OAI-T5C and OAI-T5D in `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` entries [72]-[73] and any later reply.
5. Retrieve the latest OAI-T5C/T5D entries in `docs/qa-loop-results.md`.
6. Confirm the tracked tree is clean and preserve every pre-existing untracked
   artifact and live fixture.
7. Never run the old T5B approval. It remains permanently retired.

## Current architecture and persistent state

- Missing, empty, or exact `legacy` mode remains the unchanged default. Exact
  `two_layer` selects the background branch; every other non-empty value fails
  before provider creation.
- Two-layer mode makes one Terra/high background Responses create with required
  hosted web search and strict JSON Schema output. There is no Serper,
  SearchAPI, helper model, second response, retry, fallback, or receipt.
- Master prompt v3 leaves search selection, source inspection, product
  rejection, slate selection, and ranking to Terra. ReviewRadar validates the
  returned object directly instead of parsing natural Markdown.
- The schema has no price, seller, purchase URL, availability, image, rating,
  source title, publisher, or semantic source-role field. Source titles come
  only from same-response metadata; public roles stay neutral.
- Unregistered optional citations are removed and display as AI synthesis.
  Missing registered evidence for identity, assessment, pros, or cons fails the
  result closed. Exact requirement hash/order remains enforced.
- GET/DELETE use an encrypted authenticated capability only in the
  `x-reviewradar-job-token` header. Provider IDs and prompt tracking are not
  client-decodable or placed in request URLs.
- `lib/twoLayerFormatter.ts` remains historical and is not called by the current
  route. Legacy behavior, commerce verification code, and all trust gates remain
  intact.
- `.env.local` has no two-layer mode or job-token-secret entry. Last recorded
  persistent state remains constraint allocation on and narration off.

## OAI-T5C result

OAI-T5C replaced the failed natural-Markdown boundary with strict structured
output from the same one research response. Offline evidence proves the request,
schema, same-response source ownership, exact requirements, bounded diagnostics,
and no-commerce/client-privacy boundaries. It does not prove that the real API
accepts this exact current schema or that its recommendations are useful.

Commit: `28743e9` (`Adopt structured two-layer research output`). Verification:
1111/1111 tests across 151 suites, typecheck/build/evaluation/diff pass, lint
zero errors and three pre-existing warnings. OAI-T5C made zero provider calls.

## OAI-T5D preflight result

The existing one-request-at-a-time runner now has a separate structured smoke
profile:

- approval ID: `oai-t5d-structured-lifecycle-smoke-v1`;
- frozen request: one broad `{query:"shop vac"}` case;
- one Terra/high create;
- at most 20 hosted web searches, 60 retrieves, and one safety cancel;
- zero retries, replacements, Serper/SearchAPI calls, direct source-page opens,
  second responses, fallbacks, or additional cases; and
- proposed hard ceiling: `$7`.

The spent `oai-t5b-six-run-v1` branch still rejects execution. The new live
branch requires the exact approval argument, a clean tracked tree, a full commit
hash, exact shopper input, no-retry client, and process-only API key/job-token
secret. It does not load or change `.env.local`.

A failed, interrupted, cancelled, incomplete, schema-invalid, or contract-
invalid attempt is spent and blocks replacement. A successful attempt also
stops. The sanitized artifact can contain bounded counters/diagnostics, public
cards, and same-response public source metadata; it cannot contain provider IDs,
raw output, job tokens, prompts, headers, or secrets.

Fail-first was the missing new approval-contract export. Corrected verification:

- focused current route/adapter/contract/runner tests: 36/36;
- complete `npm test`: 1114/1114 across 151 suites;
- `npm run typecheck`: pass;
- `npm run lint`: zero errors and three pre-existing warnings;
- `npm run build`: pass;
- `node scripts/eval-pipeline.mjs`: no red flags; and
- no-argument runner preflight: one case, one create, zero provider calls.

OAI-T5D changed no `.env.local`, persistent flag, live fixture, deployment,
production state, or pre-existing untracked artifact.

## Strongest next decision

After the OAI-T5D commit is clean and peer review is considered, request one
exact live approval pinned to that commit. Do not treat the earlier “go ahead”
message or the commit authorization as an exact live budget.

The later approval should authorize exactly one frozen smoke and stop after its
first outcome. Do not jump to the six-run quality gate, build a verifier,
promote the mode, deploy, delete historical code, or retire legacy behavior.

**Recommended reasoning level:** High. The next provider phase is mechanically
bounded but requires careful safety/evidence review. Highest is unnecessary
unless the provider rejects the strict schema or exposes a new architecture
conflict.

## Exact live approval template (use only after the preflight commit)

```text
Approved: one OAI-T5D structured lifecycle smoke for the frozen broad shop-vac
request at commit <COMMIT>, using one Terra/high OpenAI Responses create, at
most 20 hosted web searches, at most 60 retrieves, one safety cancel, and a $7
hard ceiling. No Serper, SearchAPI, retries, replacements, fallbacks, second
response, direct source-page opens, additional cases, .env.local changes, flag
promotion, deployment, or production changes. Use process-only secrets, retain
only the sanitized attempt/fixture, and stop/report after the first outcome.
```

Replace `<COMMIT>` with the committed OAI-T5D hash. Do not approve a placeholder.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-fetch/source-page, retry, replacement, or
  additional shopper request is currently approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, push,
  publish, or alter production without Taylor's separate authorization.
- Do not expose or persist shopper prose, prompts, answers, source paths, job
  tokens, provider IDs, request headers, API keys, or raw responses.
- Preserve the failed T5B attempt and all pre-existing untracked artifacts/live
  fixtures. Stage exact phase files only; never use `git add -A`.
- Do not weaken identity, eligibility, citation ownership, exact requirements,
  or no-receipt transactional omissions to obtain a completion.

## Current repository state

- Current phase commit: OAI-T5D (`Freeze structured lifecycle smoke`); retrieve
  its exact hash from local `git log` before filling the live approval template.
- OAI-T5D runner/tests, roadmap, QA record, dialogue entry [73], and this fully
  regenerated handoff belong to that phase commit.
- No provider process or process-only secret is running or persisted.
- No secret-bearing or live-fixture file belongs to the OAI-T5D tracked diff.

## Outstanding peer-review debt

- Entries [42]-[57] still await Claude's older lifecycle/unguarded-evidence
  review.
- Entry [72] asks for an adversarial review of the structured-output boundary.
- Entry [73] asks whether the one-shot harness can retain provider state or make
  a second create. Dialogue is advisory and authorizes no work.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current architecture | OAI-T5C in `docs/forward-roadmap.md` |
| Smoke contract | OAI-T5D in `docs/forward-roadmap.md` |
| Canonical verification | latest OAI-T5C/T5D entries in `docs/qa-loop-results.md` |
| Prompt/schema/route | `lib/twoLayerMasterPrompt.ts`, `lib/twoLayerRecommendation.ts`, `lib/twoLayerRecommendationRoute.ts` |
| Adapter/lifecycle | `lib/twoLayerResearchAdapter.ts` |
| Smoke runner | `scripts/run-two-layer-quality-gate.mjs` |
| Runner tests | `tests/twoLayerQualityGateRunner.test.mjs` |
| Peer channel | `docs/agent-dialogue.md` entries [72]-[73] |

# ReviewRadar Agent Handoff

Updated: 2026-07-19 by Codex after the spent OAI-T6B live smoke and the approved
zero-live citation-granular correction. The correction is reviewed, verified,
and authorized for the scoped phase commit now being completed. No live call,
further commit, flag change, `.env.local` change, verifier work, deployment,
push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` and this handoff in full.
2. Preserve all untracked fixtures and unrelated user artifacts.
3. Inspect only the latest OAI-T6B/T6C QA and dialogue entries unless older
   evidence is needed.
4. Never reuse the spent T6B approval or its attempt identity.

## Product objective and current V2 architecture

The immediate objective is to display Terra's selected products, order,
explanations, and citations without the old Serper discovery/reconstruction
pipeline discarding them. Purchase facts remain explicitly unverified until a
later independent verifier accepts them.

```text
shopper fields
  -> /api/recommendations-v2
  -> one Terra/high background response with hosted web search
  -> strict JSON { report_markdown }
  -> response-owned citation allowlist
  -> byte-identical report; unmatched links disabled individually
```

The V2 modules import none of the legacy discovery, normalization, rescue,
dedupe, scoring, fallback, identity, or card-reconstruction modules. Legacy and
two-layer code remains for rollback only.

## OAI-T6B live result (spent)

The exact `d448a5f` contract was run once in an isolated clean worktree because
`main` had advanced to `f72e767`. OpenAI accepted Terra/high, background,
required hosted search, strict one-field JSON, and `max_tool_calls: 20`.

- one create, 28 retrieves, nine hosted searches;
- no retry, replacement, fallback, Serper, SearchAPI, or direct page open;
- 89,742 input, 25,413 output, 115,155 total tokens;
- estimated cost `$0.69555`;
- 125 registered sources across 46 hosts; and
- terminal local failure: `invalid_report / unregistered_citation`.

The one safety-cancel attempt followed local rejection but returned
`request_error` because the response was already completed. The untracked
sanitized attempt contains no provider ID, raw response, key, token, prompt, or
headers. T6B is spent and cannot be retried or replaced without new approval.

## Approved zero-live correction: complete and committed in this phase

- `lib/directTerraResponse.ts` preserves Terra's report byte-for-byte and
  separates report URLs into a response-owned clickable allowlist plus a
  disabled unique-URL count. It no longer rejects an otherwise valid report
  solely because one link is unregistered.
- The adapter, route, and public API propagate `disabledCitationCount`.
- `components/DirectTerraReport.tsx` renders every non-allowlisted link as
  labeled plain text and shows a report-level warning that nearby claims are AI
  synthesis.
- Valid links stay clickable. Malformed wrappers, reports without citations,
  remote images, raw HTML, unsafe schemes, URL-identity distinctions, encrypted
  job state, no-retry lifecycle, and the unverified-commerce warning remain.
- The report is not parsed into products, reranked, rewritten, or rebuilt.

## Verification

- fail-first focused run: seven failures reproduced the old boundary;
- corrected focused boundary: 24/24;
- complete `npm test`: 1162/1162 across 164 suites;
- `npm run typecheck`: pass;
- `npm run lint -- --max-warnings=10`: zero errors, three pre-existing warnings;
- `npm run build`: pass, including `/api/recommendations-v2`;
- `node scripts/eval-pipeline.mjs`: no legacy red flags;
- saved refrigerator replay: byte-identical report, 30 active citations, 16
  hosts, zero disabled citations; and
- zero provider or direct source-page calls during the correction.

## Flags and working tree

- Both direct-Terra flags remain default-off in `.env.example` and absent from
  `.env.local`.
- Pre-phase `main` HEAD was `f72e767` (`Add live search-progress narration
  during the research wait`). The direct-Terra provider modules did not differ
  between `d448a5f` and that commit.
- The current phase commit subject is `Preserve Terra reports with granular
  citation safety`; use `git log -1` for its hash.
- The T6B sanitized attempt and all older fixtures remain untracked.
- Do not stage `.claude/`, baselines, transfer artifacts, or live fixtures. Use
  explicit paths only; never `git add -A`.

## Strongest next decision

After the commit hash is known, a separate exact approval may run one
replacement V2 smoke. That smoke should prove the complete report reaches the
API/UI contract, record how many links remain active versus disabled, and stop
after the first outcome. It is not a product-quality gate and must not start
the transactional verifier.

No live budget is presently approved. A future approval must pin the new commit
and restate one Terra/high create, hosted-search/retrieve/cancel ceilings, dollar
ceiling, forbidden providers/actions, process-only secrets, sanitized retention,
and no retry or replacement.

**Recommended reasoning level:** High for commit review and the next one-case
smoke because the behavior is small but citation trust, privacy, and lifecycle
must be inspected together. Maximum is unnecessary unless the next response
reveals a new provider shape or unsafe display path.

## Hard boundaries

- No provider or direct source-page call without Taylor's exact new approval.
- No further commit, push, flag promotion, `.env.local` change, deployment,
  publication, or production change without separate approval.
- Do not build the transactional verifier until the replacement V2 smoke passes.
- Never make a non-response-owned URL clickable.
- Never label price, seller, purchase URL, availability, inventory, financing,
  warranty, or other purchase details verified before an independent verifier
  accepts them.
- Never retain or expose keys, headers, cookies, provider IDs, raw provider
  responses, or job-token contents.
- Do not delete legacy code without later rollback evidence and explicit
  retirement approval.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current result and next decision | this file |
| T6B/T6C evidence | latest `docs/qa-loop-results.md` entry |
| Peer review request | `docs/agent-dialogue.md` entry [77] |
| Provider request | `lib/directTerraPrompt.ts` |
| Citation boundary | `lib/directTerraResponse.ts`, `components/DirectTerraReport.tsx` |
| Lifecycle/API | `lib/directTerraResearchAdapter.ts`, `lib/directTerraRecommendationRoute.ts` |
| Focused tests | `tests/directTerra*.test.mjs` |

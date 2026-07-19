# ReviewRadar Agent Handoff

Updated: 2026-07-19 by Codex after the zero-live OAI-T6A adversarial review and
authorized commit. The reviewed implementation is the current `main` HEAD with
subject `Add reviewed direct Terra V2 path`. No live call, persistent flag
change, `.env.local` change, verifier work, deployment, push, or production
change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read OAI-T6A/OAI-T6B in `docs/forward-roadmap.md` only for architecture or
   live-gate detail.
4. Read the latest OAI-T6A review entry in `docs/qa-loop-results.md` for proof.
5. Read `docs/agent-dialogue.md` entry [76] and any later peer response only if
   reviewing the boundary.
6. Preserve every untracked fixture and unrelated user artifact.
7. Never reuse a spent live approval.

## Product objective and current architecture

The immediate objective is a useful product-research experience that preserves
Terra's chosen products, order, explanations, and citations instead of feeding
them through ReviewRadar's old reconstruction pipeline. Transactional facts
remain explicitly unverified until a later independent verifier accepts them.

The separate default-off V2 path is:

```text
shopper fields
  -> POST /api/recommendations-v2
  -> one Terra/high background Responses job with hosted web search
  -> strict JSON { report_markdown }
  -> same-response rendered-link ownership check
  -> safe Markdown renderer, unchanged report text/order
```

The V2 route imports none of the old Serper discovery, normalization,
requirement rescue, dedupe, scoring, fallback, or card-reconstruction modules.
Legacy and two-layer code remains intact only for rollback.

## OAI-T6A reviewed implementation

### Provider and lifecycle contract

- `lib/directTerraPrompt.ts` sends all cleaned shopper fields as untrusted JSON
  data and builds one Terra/high, background, required-web-search request with
  strict one-field JSON output.
- `lib/directTerraResearchAdapter.ts` creates once with SDK retries disabled by
  the route, retrieves/cancels the same response ID, requires at least one web
  search, and exposes only bounded ledger data internally.
- `lib/directTerraJobToken.ts` carries provider state in an authenticated,
  encrypted, header-only capability. Provider IDs never enter client-readable
  tokens or request URLs.
- `lib/directTerraClient.ts` uses only `/api/recommendations-v2`, cancels before
  token expiry, and now also cancels a known job whenever polling exits before
  completion.

The installed `openai@6.37.0` REST create type omits `max_tool_calls`, although
the SDK's adjacent Responses client-event type documents it. Every other create
field is now checked against `ResponseCreateParamsNonStreaming`; the one hard
tool-ceiling field is an explicit compatibility extension. A real API smoke is
required to prove that exact request rather than hiding the uncertainty behind
`Record<string, unknown>`.

### Citation and display contract

- `lib/directTerraResponse.ts` accepts response-owned URLs from
  `web_search_call.action.sources` and direct/nested URL-citation annotations;
  provider titles are optional.
- Citation discovery now uses the same `remark-parse` + `remark-gfm` grammar as
  the renderer. Ordinary links, bare GFM autolinks, and reference links are all
  checked; link-shaped text in code is not mistaken for a citation.
- Every rendered HTTP(S) URL must belong to the same completed response.
  Distinct `www` hosts, fragments, identity-bearing parameters, and parameter
  order no longer inherit ownership from each other. Only established tracking
  parameters are ignored.
- Markdown images fail the response closed and are independently disabled in
  `components/DirectTerraReport.tsx`; raw HTML and unsafe URL schemes also do
  not render.
- The report string is not parsed into products, reranked, rewritten, or
  rebuilt. The UI shows a persistent warning that price and purchase details
  are AI-reported and unverified by ReviewRadar.

### Flags

- Server: `REVIEW_RADAR_DIRECT_TERRA=on`.
- Browser: `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=true`.
- Both remain default-off in `.env.example`; `.env.local` is unchanged.
- A server/client mismatch fails closed and never falls back to the legacy API.

## Adversarial review evidence

Fail-first tests reproduced five boundary failures spanning three root causes:

1. the hand-written citation scanner missed clickable GFM URL forms;
2. URL ownership normalization collapsed distinct hosts/fragments/query order,
   and remote report images could load; and
3. an already-known provider job survived an unexpected polling failure.

All are corrected generically. Final verification:

- focused direct-Terra wall: 26/26 across eight suites;
- complete `npm test`: 1140/1140 across 159 suites;
- `npm run typecheck`: pass;
- `npm run lint -- --max-warnings=10`: zero errors, three pre-existing warnings;
- `npm run build`: pass and includes `/api/recommendations-v2`;
- `node scripts/eval-pipeline.mjs`: no red flags on the unchanged legacy path;
- `git diff --check`: pass with Windows line-ending notices only;
- secret-shaped scan of the phase file set: no matches; and
- saved refrigerator replay: byte-identical 40,627-character report, 30
  response-owned citations, 16 hosts.

`npm audit --omit=dev` still reports one low and three moderate findings, with
no high or critical finding. No automatic audit fix was applied because the
forced Next.js action is an unrelated breaking downgrade.

No OpenAI, Serper, SearchAPI, direct source-page, retry, replacement, fallback,
or other live call occurred during OAI-T6A or this review.

## Strongest next step: one OAI-T6B live contract smoke

After this reviewed tree is committed, run exactly one broad shop-vac request
through the V2 contract. Its purpose is narrow: prove the real Responses API
accepts Terra/high + background + required web search + strict one-field JSON +
`max_tool_calls: 20`, and prove the completed response supplies enough
same-response metadata to register every rendered citation. It is not a quality
gate and must not start the transactional verifier.

Suggested approval text (replace `<COMMIT>` with the reviewed commit):

```text
Approved: one OAI-T6B live V2 contract smoke for the frozen broad shop-vac
request at commit <COMMIT>, using one Terra/high OpenAI Responses create, at
most 20 hosted web searches, at most 60 retrieves, one safety cancel, and a $7
hard ceiling. No Serper, SearchAPI, retries, replacements, fallbacks, second
response, direct source-page opens, additional cases, .env.local changes, flag
promotion, deployment, or production changes. Use process-only configuration,
retain only a sanitized attempt/fixture, and stop/report after the first outcome.
```

**Recommended reasoning level:** High. Execution is mechanically bounded, but
the first real response needs careful source-shape, lifecycle, privacy, and
contract inspection. Highest is unnecessary unless the provider rejects the
contract or returns a genuinely new response shape.

## Hard boundaries

- No live provider or direct source-page call exists without Taylor's exact new
  approval.
- Do not build the transactional verifier until OAI-T6B passes.
- Do not enable persistent flags, edit `.env.local`, deploy, push, publish, or
  alter production without separate approval.
- Do not delete legacy code until later live quality and rollback evidence plus
  an explicit retirement approval exist.
- Never label price, seller, availability, purchase URL, inventory, financing,
  or warranty information verified before an independent verifier accepts it.
- Never retain or expose API keys, request headers, cookies, provider IDs, raw
  provider responses, or job-token contents.
- Preserve pre-existing untracked artifacts. Stage explicit files only; never
  use `git add -A`.

## Working-tree state

- Pre-review HEAD: `63bdef9` (`Freeze structured lifecycle smoke`).
- The complete OAI-T6A implementation, review corrections, tests,
  dependencies, and documentation are committed in the current `main` HEAD.
- Live fixtures, `.claude/`, baselines, and transfer artifacts remain
  intentionally untracked and must not be staged.
- No provider process or process-only secret remains.

## Retrieval map

| Need | Retrieve |
|---|---|
| V2 plan and next live gate | OAI-T6A/OAI-T6B in `docs/forward-roadmap.md` |
| Review evidence | latest OAI-T6A entry in `docs/qa-loop-results.md` |
| Master prompt/request | `lib/directTerraPrompt.ts` |
| Provider lifecycle | `lib/directTerraResearchAdapter.ts` |
| Citation/report boundary | `lib/directTerraResponse.ts` |
| Route and token | `lib/directTerraRecommendationRoute.ts`, `lib/directTerraJobToken.ts` |
| Browser/UI | `lib/directTerraClient.ts`, `components/DirectTerraReport.tsx`, `app/page.tsx` |
| Focused proof | `tests/directTerra*.test.mjs` |
| Saved report replay | untracked refrigerator diagnostic fixture |

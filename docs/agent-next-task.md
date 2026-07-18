# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T5C direct structured
research phase and its approved local commit. OAI-T5C is the current completed
phase; its parent was `020250b117a4040ed0cac1a2ab70dc5d94c042b5` (`Record T5B
safe stop`). No live lifecycle smoke, quality gate, verifier phase, mode
promotion, deployment, push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read OAI-T5A through OAI-T5C in `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` entries [70]-[72].
5. Retrieve the latest OAI-T5A through OAI-T5C entries in
   `docs/qa-loop-results.md`.
6. Confirm the tracked tree is clean before modifying it. Preserve every
   pre-existing untracked artifact and live fixture.
7. Never run the spent T5B harness approval. Its live-execution switch is now
   retired, and any later provider call needs a new exact approval.

## Current architecture and persistent state

- Missing, empty, or exact `legacy` mode remains the unchanged default. Exact
  `two_layer` selects the background branch; every other non-empty value fails
  before provider creation.
- Two-layer mode makes one Terra/high background Responses create with hosted
  web search, strict JSON Schema output, and no SDK retry, Serper, SearchAPI,
  helper model, second response, legacy fallback, or transactional receipt.
- Master prompt v3 supplies the exact normalized requirement rows and asks the
  same research call to choose searches, inspect sources, reject products,
  select the slate, and rank it. The final answer must match the strict schema;
  natural Markdown is no longer parsed.
- The structured schema permits one to five research recommendations, exact
  requirement checks, typed claims, and source references. It deliberately has
  no price, seller, product/purchase URL, availability, image, rating, source
  title, publisher, or semantic source-role field.
- Direct server-side parsing validates the schema, rank/order, exact requirement
  keys, source IDs, canonical source URLs, and same-response source ownership.
  Source titles come only from provider response metadata and public roles stay
  neutral. Unregistered optional claim citations are removed and displayed as
  AI synthesis; missing evidence for identity, assessment, pros, or cons fails
  the result closed.
- GET/DELETE continue to use an encrypted authenticated capability only in the
  `x-reviewradar-job-token` header. Provider/prompt tracking and the expected-
  requirement hash are not client-decodable or placed in request URLs.
- Exact requirement hash/order enforcement, no-receipt commerce omissions, and
  raw-response/client privacy boundaries are unchanged.
- `lib/twoLayerFormatter.ts` and its tests remain as historical code but are not
  imported or called by the current two-layer route.
- `.env.local` still has no two-layer mode or job-token-secret entry. Last
  recorded persistent state remains constraint allocation on and narration off.

## T5B result retained as historical evidence

Taylor approved a six-response T5B gate, but only broad `shop vac` run 1 was
dispatched. The provider completed after one Terra/high create and 13 retrieves,
then natural-Markdown parsing safe-failed at
`formatter / product_shape / numbered_product_headings_missing`. No cards or
unsafe fields reached the client; the other five creates were not sent. The
sanitized untracked record remains under
`tests/fixtures/review-radar-live/oai-t5b-two-layer-04dd3a0/`.

The raw answer was intentionally not retained, so the old evidence does not
prove whether Terra changed heading syntax, omitted products, or truncated. It
does prove the natural-Markdown boundary was too brittle for the frozen gate.

## OAI-T5C result

OAI-T5C replaces that brittle boundary with strict machine-readable output from
the same single research call. It does not add a formatter call, helper model,
verifier, provider, second response, or commerce path.

The phase also closes T5B's measurement and governance gaps:

- terminal completion usage is retained when JSON or contract validation fails;
- live-run failure records retain only bounded completion/structure/
  verification diagnostics, not provider IDs, prompts, answers, URLs, headers,
  or secrets; and
- the spent T5B execution switch is retired so the old approval cannot dispatch
  on a later commit.

Fail-first was the missing structured-contract export. New contract coverage
tests no-commerce schema fields, response-owned source metadata, optional claim
downgrade, required-source failure, invalid JSON/schema, unknown/duplicate
source ownership, and rank drift.

## What is proven and unknown

**Proven offline:**

- the application builds one background Terra/high request containing hosted
  web search plus strict `text.format` JSON Schema;
- accepted cards come directly from that validated object rather than Markdown;
- model-authored source titles/roles and commerce values cannot enter through
  the new schema;
- exact requirement hash/order and same-response source ownership still bind
  accepted cards; and
- focused tests pass 39/39, the complete wall passes 1111/1111 across 151
  suites, typecheck/build/offline evaluation/diff checks pass, and lint has zero
  errors plus three pre-existing warnings.

**Not yet proven live:**

- whether the provider accepts this exact current request combination and
  returns a valid completion under the frozen strict schema;
- lifecycle token/tool/duration behavior after the new boundary;
- product usefulness, leader recall, repeatability, constrained accuracy,
  source semantics, cost, or blind preference versus legacy; and
- whether any later independent commerce verifier is necessary or useful.

OAI-T5C used zero OpenAI, Serper, SearchAPI, direct-fetch, retry, replacement, or
other external calls. It changed no `.env.local`, flag, fixture, deployment, or
production state.

## Strongest next decision

After peer review, the next provider boundary should be one newly approved
lifecycle smoke for one predeclared shopper case. It must confirm one create,
valid strict output, safe card construction, bounded usage diagnostics, and
unchanged privacy/no-commerce boundaries, then stop.

Do not jump directly to a six-run quality gate. Do not build an independent
verifier, promote the mode, deploy, delete the historical formatter, or retire
legacy until the one-call contract completes successfully in the real API.

**Recommended reasoning level:** High for the bounded lifecycle smoke. The
architecture is now frozen and the next task is careful protocol execution and
evidence review; Highest would add cost without a proportionate benefit unless
the live provider rejects the schema or exposes a new architectural conflict.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-fetch/source-page, retry, replacement, or
  additional shopper request is approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, push,
  publish, or alter production without Taylor's separate authorization.
- Do not expose or persist shopper prose, prompts, answers, source paths, job
  tokens, provider IDs, request headers, API keys, or raw responses.
- Preserve the failed T5B attempt and all pre-existing untracked artifacts/live
  fixtures. Stage exact phase files only; never use `git add -A`.
- Do not weaken identity, eligibility, same-response citation ownership, exact-
  requirement enforcement, or no-receipt transactional omissions to obtain a
  completion.

## Current repository state

- Current phase commit: OAI-T5C (`Adopt structured two-layer research output`);
  verify its hash from local `git log` rather than copying an older handoff.
- OAI-T5C code, tests, roadmap, QA record, change log, overview, dialogue entry
  [72], and this regenerated handoff belong to that phase commit.
- No provider process or process-only secret is running or persisted.
- No secret-bearing or live-fixture file belongs to the OAI-T5C tracked diff.

## Outstanding peer-review debt

- Entries [42]-[57] still await Claude's older lifecycle/unguarded-evidence
  review.
- Entry [72] asks Claude to challenge schema commerce/source-label exposure,
  claim-local downgrade boundaries, and whether one lifecycle smoke is enough
  before a future quality gate. Dialogue remains advisory and authorizes no
  work.

## Retrieval map

| Need | Retrieve |
|---|---|
| Architecture and gates | OAI-T5A-T5C in `docs/forward-roadmap.md` |
| Canonical evidence | latest OAI-T5A-T5C entries in `docs/qa-loop-results.md` |
| Direct structured contract | `lib/twoLayerRecommendation.ts` |
| Prompt and API request | `lib/twoLayerMasterPrompt.ts`, `lib/twoLayerResearchAdapter.ts` |
| Route and lifecycle diagnostics | `lib/twoLayerRecommendationRoute.ts` |
| Historical formatter | `lib/twoLayerFormatter.ts` and its tests |
| Gate analyzer and retired runner | `scripts/two-layer-quality-gate.mjs`, `scripts/run-two-layer-quality-gate.mjs` |
| Peer channel | `docs/agent-dialogue.md` entry [72] |
| Failed historical attempt | untracked `oai-t5b-two-layer-04dd3a0` directory |

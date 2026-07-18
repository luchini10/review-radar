# ReviewRadar Agent Handoff

Updated: 2026-07-18 by Codex after the zero-live OAI-T5A quality-gate phase.
The current `main` HEAD is the focused T5A commit `Freeze two-layer quality
gate`. No provider call, source-page audit, replacement, verifier phase, mode
promotion, deployment, push, or production change is approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read OAI-T4 and OAI-T5A in `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [68] through [70].
5. Retrieve the latest OAI-T4E/T4F/T5A entries in
   `docs/qa-loop-results.md`.
6. Do not run the T5B harness or open a source page without Taylor's explicit
   approval of the complete envelope below.

## Current architecture and persistent state

- Missing, empty, or exact `legacy` mode delegates to the unchanged legacy
  route. Exact `two_layer` selects the background branch; every other non-empty
  value fails before provider creation. Legacy remains the default.
- Two-layer mode performs one Terra/high background Responses create with
  hosted search and no SDK retry, Serper, SearchAPI, helper model, second
  response, legacy fallback, or transactional receipt.
- GET/DELETE use an encrypted authenticated capability only in
  `x-reviewradar-job-token`. Token v4 contains provider/prompt tracking and a
  non-reversible expected-requirement hash; none is client-decodable or placed
  in request URLs.
- Completed research passes deterministic formatter/research/presentation v2.
  The route rejects a card set if any product renames, adds, omits, or reorders
  the normalized requirement rows.
- Cards show each exact shopper requirement with Terra's `Pass`, `Fail`, or
  `Needs verification` verdict, explanation, available source links, and an
  `AI research synthesis` disclosure.
- Without an independent receipt, exact identity and commerce remain
  unverified. Price, seller, availability, purchase URL, and image stay absent.
  Model-authored currency amounts in research prose/source titles are redacted
  as `current price not independently verified`; the shopper's budget label is
  preserved.
- `.env.local` has no two-layer mode or job-token-secret entry. Last recorded
  persistent local state remains constraint allocation on and narration off.

## Why T5A exists

T4E proved the real background lifecycle but safe-failed on one citation. T4F
fixed that reproduced citation-granularity defect offline. Another single smoke
would prove only lifecycle again. T5A instead freezes one go/no-go experiment
that confirms the route and judges product usefulness, requirements, safety,
sources, repeatability, latency, tool use, and cost together.

The obsolete 12-response OAI-2B design was not adopted. The smallest adequate
sample is:

1. `shop vac`, three independent runs; and
2. `robot vacuum`, budget `under $300`, Important Details `self-emptying`,
   three independent runs.

This reuses Taylor's ratified `leaders-v2026-07c` broad benchmark and the most
comparable legacy evidence.

## Frozen T5B decision contract

Mechanical pass requires all of the following:

- 6/6 completed routes and 3-5 cards per run;
- broad leader recall mean at least 4/7 and no run below 3/7;
- every within-shape pairwise product-set Jaccard at least 0.60;
- 100% source binding and zero unsafe product/transactional leakage;
- exact normalized requirement rows on every card; and
- every Best Match reports `Pass` for every hard row: U.S. availability for
  broad results, plus budget and `self-emptying` for constrained results.

Human pass additionally requires:

- product eligibility review for every displayed card;
- hard-requirement accuracy review for every constrained Best Match;
- claim/source-semantic review for the top two cards in each run; and
- blind comparison with comparable legacy output: neither shape may lose and
  at least one must win.

The analyzer returns `needs_manual_review`, never `pass`, while any human row is
missing. Do not lower a bar after seeing results.

## Bounded harness and evidence policy

- `scripts/two-layer-quality-gate.mjs` is the pure/offline analyzer.
- `scripts/run-two-layer-quality-gate.mjs` is preflight-only unless the exact
  argument `--execute-live=oai-t5b-six-run-v1` is supplied.
- One invocation advances exactly one frozen unspent run. It permits one
  create, at most 60 retrieve polls at 10-second intervals, and one pre-expiry
  safety cancel.
- The runner requires a clean tracked commit and process-only
  `OPENAI_API_KEY` / `REVIEW_RADAR_JOB_TOKEN_SECRET`; it never loads or edits
  `.env.local`. It validates both values and constructs the no-retry SDK client
  before reserving an attempt, so a local configuration failure spends nothing
  and does not falsely consume a run.
- An attempt marker is written immediately before the route can create the
  provider response. A failed/interrupted attempt blocks all later runs; there
  is no automatic retry or replacement. Any final mechanical failure also
  writes a durable halt marker.
- Sanitized fixtures keep commit/case/run, bounded completion/formatter totals,
  public cards, and their public source catalog. They never keep a job token,
  provider ID, raw prompt/answer/response, header, or secret.
- The generated manual-review template names exactly two registered source IDs
  for each audited top product. The analyzer rejects an audit that omits,
  duplicates, or substitutes those traceable IDs.
- Blind-comparison rows are closed-world: unknown or duplicate case rows fail,
  and extra metadata cannot bypass the required material win.

## Exact next approval packet

**Question:** can the current two-layer route produce materially better,
requirement-faithful, source-auditable, repeatable product recommendations than
the comparable legacy path?

**Why live is required:** provider-selected products, current web evidence, and
repeatability cannot be proved by mocks or saved T4 evidence.

**Requested envelope:**

- six shopper requests / six Terra/high Responses creates: the 3+3 frozen
  sample above;
- at most 20 hosted searches per create, 120 total;
- at most 60 retrieve polls and one safety cancel per attempt;
- T4E planning basis: `$0.6990575`, 12 hosted searches, and about 272.6 seconds
  per response; six-response estimate `$4.194345` and 27.26 serial minutes;
- `$7` cumulative estimated-cost ceiling, checked after each completed
  response. This is not represented as a provider invoice and cannot interrupt
  an already-running response mid-completion;
- zero retries, replacements, fallbacks, cache reuse, Serper, SearchAPI, helper
  models, second responses, extra cases, verifier work, promotion, or deploy;
- up to 24 direct source-page opens: top two cards x two sources x six runs;
- retain only the harness's sanitized untracked fixtures and manual-review
  rows; and
- stop after the first route/formatter/presentation failure, unsafe card or
  transaction field, per-run absolute failure, broad run-3 mean/stability
  failure, cumulative cost breach, or interrupted/spent attempt. No replacement
  without new approval.

The result unlocks only an owner decision to continue, redesign, or abandon the
two-layer path. It does not authorize a verifier, promotion, rollout, or legacy
retirement.

**Recommended reasoning level:** High. The architecture and evaluator are
frozen; protocol fidelity, careful product/source inspection, and honest
scoring matter more than another open-ended architecture pass.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-fetch/source-page, retry, or replacement
  call is currently approved.
- Do not edit `.env.local`, persist a job secret, promote a mode, deploy, push,
  publish, or alter production.
- Do not expose/persist shopper prose, full prompts/answers, source paths, job
  tokens, provider IDs, request headers, API keys, or raw responses.
- Do not weaken identity, eligibility, citation ownership, source labels,
  exact-requirement enforcement, or no-receipt transactional omissions to make
  T5B pass.
- Preserve all pre-existing untracked artifacts/live fixtures. Stage explicit
  phase files only; never use `git add -A`.

## Verification and remaining unknowns

- Fail-first covered requirement-section/shape drift, absent analyzer code,
  exact-price leakage in card prose/source titles, and renamed-requirement
  acceptance.
- Complete suite: 1106/1106 across 150 suites.
- Typecheck, production build, offline evaluation, harness preflight, and diff
  checks pass. Lint has zero errors/three pre-existing warnings.
- T5A made zero live calls and opened zero source pages.
- Unknown until T5B: real T4F completion rate, product quality, broad recall,
  constrained accuracy, source semantics, repeatability, latency, tool use,
  actual returned usage/cost estimate, and blind preference versus legacy.

## Outstanding peer-review debt

- Entries [42]-[57] still await Claude's older lifecycle/unguarded-evidence
  review.
- Entry [70] asks Claude to challenge sample sufficiency, citation downgrade
  policy, and the gate's false-pass/wasted-spend risks. Dialogue remains
  advisory and authorizes no work.

## Retrieval map

| Need | Retrieve |
|---|---|
| T4 architecture and T5A gate | OAI-T4/OAI-T5A in `docs/forward-roadmap.md` |
| Canonical evidence | latest T4E/T4F/T5A entries in `docs/qa-loop-results.md` |
| Requirement normalization/prompt | `lib/autonomousResearchContract.ts`, `lib/twoLayerMasterPrompt.ts` |
| Formatter/presentation trust | `lib/twoLayerFormatter.ts`, `lib/twoLayerRecommendation.ts` |
| Protected requirement hash | `lib/twoLayerJobToken.ts`, `lib/twoLayerRecommendationRoute.ts` |
| Currency/URL presentation boundary | `lib/twoLayerDisplayText.ts` |
| Gate analyzer and harness | `scripts/two-layer-quality-gate.mjs`, `scripts/run-two-layer-quality-gate.mjs` |
| Gate regression wall | `tests/twoLayerQualityGate*.test.mjs`, `tests/twoLayerRoute.test.mjs` |
| Peer channel | `docs/agent-dialogue.md` entry [70] |

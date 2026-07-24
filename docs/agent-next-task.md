# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after the OAI-T9 Phase 4 live window and
Phase 5 terminal decision. Use `git log -1` for the current scoped closeout
commit.

## Current state

OAI-T9 Phases 1-5 are complete. The fixed 12-run Sol/high acceptance window
ran once against commit `5b99014e4b2b73d7aac0f89999eceb5d8da2e806`.
The frozen evaluator found no measurement defect and no pending manual review.
Its terminal decision is:

`single_call_architecture_no_go`

Direct-Terra remains default-off and undeployed. Terra remains the application
default. No model default, flag, `.env.local`, deployment, production state,
or push changed.

The OAI-T9 complete-product relationship boundary, candidate-slate contract,
DNS-pinned fetch boundary, and acceptance harness remain committed as
default-off safety and evaluation work. They are not evidence that the
single-call Sol architecture is release-ready.

## Phase 4 live result

The runner dispatched exactly the frozen 12 creates with no retries,
replacements, fallbacks, or additional cases:

- 1/12 routes completed;
- five runs reached the 60-retrieve ceiling while still pending;
- six runs returned route-poll HTTP 502 after 51-60 retrieves;
- 13 hosted searches, 704 retrieves, and 11 safety cancels;
- five Serper Shopping requests, six Serper organic requests, five candidate
  page fetches, and four selected-image retrieval attempts; and
- 3,857,573 ms evaluator wall time (about 64 minutes 18 seconds).

The runner measured `$1.452307` standard and `$1.586910` conservative cost
from usage returned by the one completed response. The 11 incomplete/failed
responses returned no usage, so their actual provider billing is unknown.
The measured value must not be represented as the total actual cost of all
12 creates.

The sole completed run was constrained cordless drill run 2:

- five legitimate ranked drills;
- frozen leader recall `2/4`;
- zero automated wrong-type, budget, or hard-requirement failures;
- two displayed links and four displayed images; and
- complete first-loss accounting for all five cards.

Manual audit still failed one top-product claim-support check, one exact-image
check, one displayed-destination check, and one image-auditability check.
The saved T8C baseline won all four blinded case comparisons; Sol recorded
zero clear wins. All within-case product-set Jaccards were `0` because eleven
runs produced no completed report.

Sanitized live evidence remains untracked at:

`tests/fixtures/review-radar-live/oai-t9-sol-acceptance-5b99014/`

Never stage that directory.

## Phase 5 terminal decision

The frozen rule is binding: route completion, schema, recommendation,
stability, or evidence failure makes the single-call architecture a no-go.
This sample has failures in every one of those non-asset categories, in
addition to asset-safety failures. It is therefore not the asset-only branch
and cannot be rescued by hiding links/images.

Do not start another Sol prompt patch, category-specific repair, replacement
run, or live retest under OAI-T9. Any future work must begin as a separately
approved architecture decision with a new hypothesis and acceptance contract.
RR-014 remains Needs Investigation.

## Verification

- frozen evaluator: `single_call_architecture_no_go`;
- fixed denominator: 12/12 attempt fixtures present;
- pending manual review: 0;
- measurement failures: 0;
- route failures: 39 evaluator findings across 11 non-completed routes;
- recommendation failures: 11;
- evidence failures: 23;
- asset-safety failures: 3;
- pre-live complete suite: 1,384/1,384 across 199 suites;
- pre-live typecheck and production build: pass;
- pre-live lint: zero errors and three pre-existing warnings; and
- tracked diff/closeout checks: see the current closeout commit.

## Next direction and approval boundary

OAI-T9 is finished. No implementation or live request is approved.

Taylor selected the replacement direction after the terminal result: remove
Sol and build a Terra-only staged pipeline with:

1. one compact research/candidate-slate call;
2. deterministic server-side identity, requirement, price, source, link, and
   image verification; and
3. one short evidence-bounded presentation call with no autonomous web search.

This direction attacks the proven bottleneck by replacing the oversized
single response rather than swapping Terra into it. It is not yet implemented,
live-tested, flag-enabled, or approved for deployment. The next step is a
zero-live architecture/contract phase behind a new default-off flag. Live
feasibility, flag promotion, and deployment remain later separate boundaries.

**Recommended reasoning level:** Highest for freezing the staged contracts,
because the boundary between model judgment and deterministic fact
verification determines whether the same failure cycle returns. High is
sufficient for mechanical implementation after those contracts are frozen.

## Approval and flag state

Taylor authorized uninterrupted OAI-T9 work and automatic scoped commits.
That authorization is exhausted by this terminal closeout.

No OpenAI, Serper, SearchAPI, page, destination, image, or other external
request is currently authorized.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- Direct-Terra research model: `gpt-5.6-terra`

## Hard boundaries

- No external request, deployment, publication, push, flag promotion,
  `.env.local` edit, or production change without explicit approval.
- Do not reinterpret the OAI-T9 no-go as permission for another prompt patch,
  replacement run, or category-specific repair.
- Preserve OpenAI-authored product names, order, report prose, citations,
  explanations, and price caveats in any retained Direct-Terra work.
- Do not leak benchmark leaders into requests or add
  product/category-specific rules.
- Do not weaken identity, complete-product relationship, requirement, price,
  citation, product-type, wrong-image, redirect, or private-network gates.
- Never send raw model responses, provider IDs, secrets, or server diagnostics
  to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entries `[113]`-`[117]` contain the pre-live peer-review requests.
Entry `[118]` records the terminal result for Claude to challenge when
available. That review is advisory and cannot reopen OAI-T9 or authorize work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Standing OAI-T9 record | `docs/forward-roadmap.md`, OAI-T9 |
| Canonical live result | latest OAI-T9 entry in `docs/qa-loop-results.md` |
| Durable terminal contract/outcome | top of `docs/review-radar-test-memory.md` |
| Acceptance result | untracked OAI-T9 fixture `acceptance-result.json` |
| Runner counters | untracked OAI-T9 fixture `summary.json` |
| Human/blind review | untracked OAI-T9 fixture `manual-review.json` |
| Recommendation-quality issue | RR-014 in `docs/RR-Issues-Report.md` |
| Peer challenge | dialogue entry `[118]` |

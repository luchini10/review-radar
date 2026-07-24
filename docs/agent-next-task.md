# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after the OAI-T9 Phase 4 final runner audit.
Use `git log -1` for the current scoped acceptance-harness commit.

## Current state

OAI-T9 Phases 1–3 and the Phase 4 zero-live preflight are complete.
Direct-Terra now has:

- one shared complete-product relationship boundary for every link/image
  candidate;
- prompt V3's server-only 8–15-product candidate slate and request-derived
  requirement verdicts; and
- one frozen, commit-pinned Sol/high terminal acceptance harness.

The post-freeze audit also closed RR-100. Server-side product-page and
audit-image requests now resolve and pin a public DNS address before network
I/O; product-page redirects repeat the check and cannot leave the originally
verified registrable domain, while image audits follow no redirect.

The final runner audit closed RR-101 and RR-102. Retrieved audit images must
be one of five supported raster types and match the advertised file
signature. Before every create, the runner also reserves the conservative
observed per-run maximum inside the `$22` operational ceiling, then reconciles
actual conservative usage after the response.

The client completed response is unchanged. OpenAI retains product selection,
order, report prose, citations, and explanations. Assets remain nullable and
can never remove or rewrite recommendations. Direct-Terra remains default-off
and undeployed; Terra remains the application default.

No live request, model-default change, flag change, `.env.local` edit,
deployment, production change, or push occurred during the preflight.

## Frozen Phase 4 contract

The only eligible sample uses the actual Direct-Terra POST/poll route:

- `gpt-5.6-sol`, high reasoning, prompt
  `direct-terra-master-prompt-v3`;
- four existing frozen cases—office chairs, gas grills, cordless drills, and
  robot vacuums—three runs each;
- exactly 12 creates, at most 240 hosted searches, 720 retrieves, 12 safety
  cancels, 60 Serper Shopping requests, 96 Serper organic requests, and 60
  candidate-page fetches;
- no retries, replacements, fallbacks, extra cases, SearchAPI, flag changes,
  deployment, production changes, or push;
- process-only keys, a clean tracked tree, and no `.env.local` change; and
- a `$22` hard ceiling based on current official Sol pricing and the maximum
  saved T8D token/search observation.

Mandatory human review requires a bounded audit-only supplement:

- at most 60 selected-image retrievals;
- at most 60 displayed-destination opens; and
- exactly the needed claim checks within at most 48 source-page opens.

These audit requests cannot discover, rank, replace, reorder, or decorate a
product. Every displayed destination/image is audited. Two active
same-response sources are inspected for each of the top two products per run.

## Frozen decisions

The sample cannot silently exclude or replace a failed run. Every product and
asset needs a first-loss outcome. Every within-case product-set pair must have
Jaccard at least `0.60`; a mean cannot hide one unstable pair. Broad
office-chair recall must average at least `4/7` with no run below `3/7`.
Every constrained #1 Best Match must pass all hard requirements. Lower ranks
may retain visibly disclosed `needs_verification` under the V3 contract but
may never contain a hard failure.

The blind review compares each three-run Sol set with the content-hash-pinned
T8C set. All four cases must win or tie and at least two must clearly win.

Phase 5 is terminal:

- all gates pass → promotion is eligible only through separate approval;
- recommendation/stability/schema/route/evidence failure → single-call
  architecture no-go;
- asset-only safety failure → disable external assets and keep recommendation
  cards;
- low but safe asset coverage → pass with graceful omissions; and
- measurement defect → invalidate the sample and stop for an architecture
  decision.

No category-specific fix or prompt-patch/retest cycle follows this window.

## Verification

- focused OAI-T9 acceptance tests: 12/12;
- complete suite: 1,384/1,384 across 199 suites;
- typecheck and production build: pass;
- lint: zero errors and three pre-existing warnings;
- script syntax and content-hash-pinned T8C dry run: pass; and
- `git diff --check`: pass.

This is offline harness evidence only. It does not prove that Sol/V3 passes the
quality gates. RR-014 remains Needs Investigation.

## Next approval boundary: OAI-T9 Phase 4 live acceptance

Do not start from this handoff without Taylor's exact live approval. The
approval must pin the full current commit and authorize the frozen 12-run
provider envelope, `$22` ceiling, and audit-only image/destination/source
allowance above.

After approval, run the window once, complete the blinded/manual review, score
the frozen evaluator, and execute the corresponding Phase 5 terminal
decision. A pass does not itself authorize a model-default change, flag
promotion, deployment, or production change.

**Recommended reasoning level:** Highest for the acceptance and terminal
architecture decision because the result determines whether the single-call
architecture survives. High is sufficient for mechanical live execution, but
not for interpreting borderline identity, evidence, or blind-quality results.

## Approval and flag state

Taylor authorized uninterrupted zero-live work and automatic scoped commits.
The current zero-live preflight commit is authorized under that standing
instruction.

No OpenAI, Serper, SearchAPI, page, destination, image, or other external
request is currently authorized. Phase 4 requires new explicit approval.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- Direct-Terra research model: `gpt-5.6-terra`

## Hard boundaries

- No external request, deployment, publication, push, flag promotion,
  `.env.local` edit, or production change without explicit approval.
- Preserve OpenAI-authored product names, order, report prose, citations,
  explanations, and price caveats.
- Do not leak benchmark leaders into requests or add product/category-specific
  rules.
- Do not weaken identity, complete-product relationship, requirement, price,
  citation, product-type, wrong-image, redirect, or private-network gates.
- Never send raw model responses, provider IDs, secrets, or server diagnostics
  to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entries `[113]` and `[114]` ask Claude to challenge the complete-
product and V3 candidate-slate contracts. Entry `[115]` asks Claude to
challenge the final acceptance baseline, human source audit, cost cap, and
terminal-decision seams. These are advisory and authorize no work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Standing OAI-T9 record | `docs/forward-roadmap.md`, OAI-T9 |
| Canonical preflight verification | latest OAI-T9 entry in `docs/qa-loop-results.md` |
| Durable acceptance contract | top of `docs/review-radar-test-memory.md` |
| Acceptance logic | `scripts/oai-t9-final-acceptance.mjs` |
| Commit-gated route runner | `scripts/run-oai-t9-final-acceptance.mjs` |
| Recommendation-quality issue | RR-014 in `docs/RR-Issues-Report.md` |
| Closed fetch-safety issue | RR-100 in `docs/RR-Issues-Report.md` |
| Closed runner-audit issues | RR-101 and RR-102 in `docs/RR-Issues-Report.md` |
| Peer challenges | dialogue entries `[113]`–`[117]` |
| Frozen comparison evidence | untracked T8C fixture directory |

# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after OAI-T10 Phase B. Use `git log -1` for the
current scoped closeout commit.

## Current state

OAI-T9 is terminally complete with
`single_call_architecture_no_go`. Direct-Terra remains default-off and
undeployed.

Taylor approved the replacement Terra-only staged pipeline. Its first two
zero-live phases are complete:

1. compact Terra/high research with hosted web search produces 8–15 evidence
   leads but no ranking or shopper-facing prose;
2. deterministic server code converts every research candidate into a
   verified evidence-package outcome; and
3. a later separate Terra/medium presentation request will have no web-search
   tool and may use only the verified package.

The staged modules are:

- `lib/stagedTerraConfig.ts`
- `lib/stagedTerraContract.ts`
- `lib/stagedTerraPrompt.ts`
- `lib/stagedTerraVerifier.ts`
- `tests/stagedTerraContract.test.mjs`
- `tests/stagedTerraVerifier.test.mjs`

They are intentionally not imported by the current recommendation route. No
application response, provider dispatch, or client behavior changed.

## Frozen Phase A contract

`staged-terra-contract-v1` separates model judgment from factual trust:

- Research returns 8–15 candidates in exact `candidate_N` order, exact
  brand/model/product identity, same-response HTTPS source URLs, requirement
  leads in server-issued order, and fact leads. It cannot rank products or
  write cards.
- The server evidence package preserves research identity and binds every
  fact, requirement verdict, product URL, and image URL to candidate-owned
  evidence. Every eligible product passes every hard requirement.
- Performance and owner-feedback evidence may be `source_reported`; it cannot
  be deterministically labeled `verified`.
- Presentation may rank only eligible candidates, preserve exact product
  names, cite only candidate-owned fact IDs, and explain all requirements in
  order. It cannot rank close matches, borrow evidence, emit URLs, or use
  outside knowledge.

Both future model requests use `gpt-5.6-terra`. Research is high reasoning, at
most 10 hosted searches and 8,000 output tokens. Presentation is medium
reasoning, 8,000 output tokens, and has no tools or prior-response coupling.

## Completed Phase B verifier

`staged-terra-verifier-v1` is the single deterministic materializer:

- Every validated research candidate is emitted in original order as exactly
  `eligible`, `close_match`, or `excluded`; missing verifier evidence is never
  a silent drop.
- Candidate source pages must arrive as successful bounded-fetch receipts for
  exact candidate-owned URLs. The materializer derives the page observation
  and rejects byte-count/content-hash drift.
- Research fact and requirement leads remain untrusted hints. A
  source-reported claim must occur in visible observed page text and must pass
  the existing semantic requirement validator before satisfying a hard
  requirement.
- Exact page entities and exact Shopping offers use the existing identity,
  complete-product relationship, product type, price, product-page, image,
  sibling/accessory, redirect/private-network, and wrong-image gates.
- Verified hard failures exclude; missing hard proof produces a close match.
  Only fully eligible candidates retain product or image assets.
- Performance and owner evidence remain `source_reported`. The verifier does
  not browse, rank, backfill, call a provider, or alter the application route.

## Verification

- focused Phase B wall: 12/12;
- complete suite: 1,410/1,410 across 204 suites;
- typecheck: pass;
- production build: pass;
- lint: zero errors and three pre-existing warnings; and
- diff check: pass.

No OpenAI, Serper, SearchAPI, page, destination, image, or other external
request ran. No `.env.local`, flag promotion, deployment, production state,
issue status, or push changed.

## Next step and approval boundary

The next unit is **OAI-T10 Phase C: adapters and route integration**. It is
not authorized by Phase B approval.

If Taylor approves Phase C, add:

- bounded research and no-web presentation Responses adapters;
- lifecycle, polling, cancellation, and sanitized diagnostic handling;
- deterministic source-page/commerce adapters that feed Phase B only through
  the existing DNS-pinned bounded-fetch and exact-commerce seams;
- a presentation renderer that cannot change research identity or bypass
  evidence ownership; and
- a default-off route branch whose flag-off behavior is byte-equivalent to the
  current route.

Phase C remains zero-live unless Taylor separately authorizes a live request.
Stop after its review, verification, documentation, and scoped local commit.
Phase D live feasibility, flag promotion, deployment, and production changes
remain later boundaries.

**Recommended reasoning level:** Highest for Phase C's lifecycle and trust
composition. It joins two provider jobs to the permanent verifier while
preserving cancellation, secret, source-ownership, and legacy byte-equivalence
boundaries.

## Approval and flag state

Taylor approved OAI-T10 Phase B and requested automatic scoped local commits.
No Phase C work, live request, route integration, flag promotion, deployment,
production change, or push is currently approved.

Committed defaults:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

## Hard boundaries

- No external request, route integration, deployment, publication, push, flag
  promotion, `.env.local` edit, or production change without its explicit
  boundary.
- Do not revive OAI-T9's single-call design or substitute Sol.
- Do not leak benchmark leaders into prompts or add product-, brand-,
  category-, or retailer-specific rules.
- Never let research or presentation output directly establish verified
  identity, price, availability, requirement compliance, product URLs, or
  images.
- Preserve complete-product relationship, product type, sibling/accessory,
  editorial/support, redirect, private-network, source, price, and wrong-image
  gates.
- Phase C source pages must use the existing DNS-pinned bounded-fetch seam and
  pass its successful receipt to the Phase B materializer. Ordinary `fetch` or
  caller-authored page observations are forbidden.
- Never send raw model responses, provider IDs, secrets, server diagnostics,
  or fetched page bodies to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[120]` asks Claude to challenge the Phase B claim-binding,
relationship, budget, and fetch-composition seams. That review is advisory and
cannot authorize Phase C or any live work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Staged architecture | `docs/forward-roadmap.md`, OAI-T10 |
| Phase B verification | latest OAI-T10 entry in `docs/qa-loop-results.md` |
| Durable verifier rules | top of `docs/review-radar-test-memory.md` |
| Contract implementation | `lib/stagedTerraContract.ts` |
| Verifier implementation | `lib/stagedTerraVerifier.ts` |
| Request ownership split | `lib/stagedTerraPrompt.ts` |
| Phase A and B tests | `tests/stagedTerraContract.test.mjs`, `tests/stagedTerraVerifier.test.mjs` |
| Terminal predecessor result | `docs/forward-roadmap.md`, OAI-T9 |
| Peer challenge | dialogue entry `[120]` |

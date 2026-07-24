# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after OAI-T10 Phase A. Use `git log -1` for the
current scoped closeout commit.

## Current state

OAI-T9 is terminally complete with
`single_call_architecture_no_go`. Direct-Terra remains default-off and
undeployed.

Taylor approved the replacement Terra-only staged pipeline. Its first
zero-live phase is complete:

1. compact Terra/high research with hosted web search produces evidence leads
   but no ranking or shopper-facing prose;
2. deterministic server code owns the verified evidence package; and
3. separate Terra/medium presentation has no web-search tool and may use only
   the verified package.

The new modules are:

- `lib/stagedTerraConfig.ts`
- `lib/stagedTerraContract.ts`
- `lib/stagedTerraPrompt.ts`
- `tests/stagedTerraContract.test.mjs`

They are intentionally not imported by the current recommendation route. No
application response, provider dispatch, or client behavior changed.

## Frozen Phase A contract

`staged-terra-contract-v1` separates model judgment from factual trust:

- Research returns 8–15 candidates in exact `candidate_N` order, exact
  brand/model/product identity, same-response HTTPS source URLs, requirement
  leads in the server-issued order, and fact leads. It cannot rank products or
  write cards.
- The server evidence package must preserve research identity and bind all
  facts, requirement verdicts, product URLs, and image URLs to candidate-owned
  evidence. Every eligible product passes every hard requirement.
- Performance and owner-feedback evidence may be `source_reported`; it cannot
  be deterministically labeled `verified`.
- Presentation may rank only eligible candidates, preserve exact product
  names, cite only candidate-owned fact IDs, and explain all requirements in
  order. It cannot rank close matches, borrow evidence, emit URLs, or use
  outside knowledge.

Both requests use `gpt-5.6-terra`. Research is high reasoning, at most 10
hosted searches and 8,000 output tokens. Presentation is medium reasoning,
8,000 output tokens, and has no tools or prior-response coupling.

## Verification

- focused staged-contract wall: 14/14 across four suites;
- complete suite: 1,398/1,398 across 203 suites;
- typecheck: pass;
- production build: pass;
- lint: zero errors and three pre-existing warnings; and
- diff check: pass.

No OpenAI, Serper, SearchAPI, page, destination, image, or other external
request ran. No `.env.local`, flag promotion, deployment, production state, or
push changed.

## Next step and approval boundary

The next unit is **OAI-T10 Phase B: deterministic verifier materialization**.
It should convert a validated research slate into the versioned evidence
package using the existing generalized identity, product-type, requirement,
price, citation, product-page, image, redirect, and private-network
primitives.

Phase B is zero-live and must:

- use mocked evidence/network seams only;
- account for every candidate with an explicit eligibility/close-match/reject
  outcome;
- never rank, backfill, browse, or invent facts;
- keep subjective performance and owner evidence source-reported;
- preserve all identity, relationship, wrong-type, accessory, sibling-model,
  redirect, private-network, price, citation, and wrong-image gates; and
- remain disconnected and default-off.

Stop after Phase B review, verification, documentation, and scoped local
commit. Phase C route/adapter integration, Phase D live feasibility, flag
promotion, and deployment remain later boundaries.

**Recommended reasoning level:** Highest for Phase B. This is the permanent
mapping from fallible research leads to server-trusted facts; mistakes here
would recreate the unsafe-link/image and unsupported-claim failures under a
new architecture.

## Approval and flag state

Taylor approved OAI-T10 Phase A and requested automatic scoped local commits.
No live request, route integration, flag promotion, deployment, production
change, or push is currently approved.

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
- Do not revive the OAI-T9 single-call design or substitute Sol.
- Do not leak benchmark leaders into prompts or add product-, brand-,
  category-, or retailer-specific rules.
- Never let research or presentation output directly establish verified
  identity, price, availability, requirement compliance, product URLs, or
  images.
- Preserve complete-product relationship, product type, sibling/accessory,
  editorial/support, redirect, private-network, source, price, and wrong-image
  gates.
- Never send raw model responses, provider IDs, secrets, or server diagnostics
  to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[119]` asks Claude to challenge the Phase A ownership and
lifecycle seams. That review is advisory and cannot authorize Phase B or any
live work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Staged architecture | `docs/forward-roadmap.md`, OAI-T10 |
| Phase A verification | latest OAI-T10 entry in `docs/qa-loop-results.md` |
| Durable contract rules | top of `docs/review-radar-test-memory.md` |
| Contract implementation | `lib/stagedTerraContract.ts` |
| Request ownership split | `lib/stagedTerraPrompt.ts` |
| Phase A tests | `tests/stagedTerraContract.test.mjs` |
| Terminal predecessor result | `docs/forward-roadmap.md`, OAI-T9 |
| Peer challenge | dialogue entry `[119]` |

# ReviewRadar Agent Handoff

Updated: 2026-07-25 by Codex after OAI-T10 Phase C. Use `git log -1` for the
current scoped closeout commit.

## Current state

OAI-T9 is terminally complete with `single_call_architecture_no_go`.
Direct-Terra remains default-off and undeployed.

Taylor approved a replacement Terra-only staged pipeline. Its first three
zero-live phases are complete:

1. compact Terra/high research with hosted web search produces 8–15 evidence
   leads but no ranking or shopper-facing prose;
2. deterministic server code accounts for every candidate and owns identity,
   requirement, fact, eligibility, price, product-page, and image trust;
3. a separate Terra/medium presentation request has no web-search tool or
   prior-response coupling and may use only the verified evidence package; and
4. the application now has a complete default-off start/poll/cancel/render
   path joining those boundaries.

The staged implementation is in:

- `lib/stagedTerraConfig.ts`
- `lib/stagedTerraContract.ts`
- `lib/stagedTerraPrompt.ts`
- `lib/stagedTerraVerifier.ts`
- `lib/stagedTerraApiContract.ts`
- `lib/stagedTerraJobToken.ts`
- `lib/stagedTerraRuntime.ts`
- `lib/stagedTerraRenderer.ts`
- `lib/stagedTerraRecommendationRoute.ts`
- `components/StagedTerraResults.tsx`
- `lib/recommendationClient.ts`
- `app/api/recommendations/route.ts`
- `app/page.tsx`

## Phase C completed boundary

The route starts one bounded background research response and returns only an
AES-GCM-protected app token. The browser polls and cancels with that token;
provider IDs never enter client-readable fields or request URLs.

After research completes, the server:

1. fetches at most two response-owned source pages per candidate and thirty
   total through the DNS-pinned bounded-fetch seam;
2. optionally runs at most one exact-identity Shopping request per candidate
   and fifteen total;
3. passes those receipts to the Phase B materializer;
4. requires at least one fully eligible candidate;
5. sends only the verified evidence package to one independent synchronous
   Terra/medium presentation response with no tools; and
6. deterministically reattaches verified identity, facts, links, images, and
   source labels to the shopper-facing cards.

The renderer shows a purchase link only when the verified price evidence uses
that exact product URL. Product JSON-LD without an offer is not classified as a
purchase page. Unknown pages and arbitrary hosts are not called official or
manufacturer sources.

Known unfinished jobs receive a bounded safety cancel on browser abort,
expiry, unusable provider identifiers, token-issuance failure, or unexpected
non-terminal presentation. Completion work is TTL-bounded and de-duplicated
per research response. Oversized token payloads fail before paid research, and
unexpected completion exceptions become sanitized failures.

## Verification

- focused staged wall: 29/29 across eight suites;
- complete suite: 1,425/1,425 across 208 suites;
- typecheck: pass;
- production build: pass;
- lint: zero errors and three pre-existing warnings; and
- diff check: pass.

No OpenAI, Serper, SearchAPI, page, destination, image, or other external
request ran. No `.env.local`, flag promotion, deployment, production state,
issue status, live fixture, or push changed.

## Next step and approval boundary

The next unit is **OAI-T10 Phase D: live feasibility**. It is not authorized by
Phase C approval.

Before any live call:

1. review Phase C and any reply to dialogue entry `[121]`;
2. freeze one small representative shopper request and the exact commit;
3. price the envelope from zero for one Terra/high research create, bounded
   retrieves and one safety cancel, one Terra/medium presentation create,
   bounded response-owned page fetches, and bounded Serper Shopping requests;
4. define terminal acceptance for both strict schemas, research completion,
   candidate accounting, verified-package materialization, presentation, and
   public-card rendering; and
5. obtain Taylor's explicit approval for the exact live limits and dollar cap.

Phase D is a feasibility smoke, not quality, stability, promotion, or
deployment evidence. Stop after its first outcome. Phase E multi-category
quality/stability, flag promotion, deployment, and retirement of old paths
remain later, separate decisions.

**Recommended reasoning level:** High for Phase D. The architecture and trust
composition have already had Highest-reasoning review; the next task is a
bounded live execution whose main risks are lifecycle accounting, identity
audit, and honest interpretation of one sample.

## Approval and flag state

Taylor approved OAI-T10 Phase C and requested automatic scoped local commits.
No Phase D live request, flag promotion, deployment, production change, or
push is currently approved.

Committed defaults:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

## Hard boundaries

- No external request, deployment, publication, push, flag promotion,
  `.env.local` edit, or production change without its explicit boundary.
- Do not revive OAI-T9's single-call design or substitute Sol.
- Do not leak benchmark leaders into prompts or add product-, brand-,
  category-, or retailer-specific rules.
- Never let research or presentation output directly establish verified
  identity, price, availability, requirement compliance, product URLs, or
  images.
- Preserve complete-product relationship, product type, sibling/accessory,
  editorial/support, redirect, private-network, source, price, and wrong-image
  gates.
- Source pages must use the existing DNS-pinned bounded-fetch seam and pass its
  successful receipt to the Phase B materializer. Ordinary `fetch` or
  caller-authored page observations are forbidden.
- Never send raw model responses, provider IDs, secrets, server diagnostics,
  fetched page bodies, or request headers to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[121]` asks Claude to challenge lifecycle cancellation,
source-role and verifier composition, completion de-duplication, and renderer
ownership before Phase D. That review is advisory and cannot authorize live
work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Staged architecture and phase status | `docs/forward-roadmap.md`, OAI-T10 |
| Phase C verification | latest OAI-T10 entry in `docs/qa-loop-results.md` |
| Durable lifecycle rules | top of `docs/review-radar-test-memory.md` |
| Contracts and verifier | `lib/stagedTerraContract.ts`, `lib/stagedTerraVerifier.ts` |
| Runtime and route | `lib/stagedTerraRuntime.ts`, `lib/stagedTerraRecommendationRoute.ts` |
| Public rendering | `lib/stagedTerraRenderer.ts`, `components/StagedTerraResults.tsx` |
| Phase C tests | `tests/stagedTerraClient.test.mjs`, `tests/stagedTerraIntegration.test.mjs`, `tests/stagedTerraRoute.test.mjs`, `tests/stagedTerraRuntime.test.mjs` |
| Peer challenge | dialogue entry `[121]` |
| Terminal predecessor result | `docs/forward-roadmap.md`, OAI-T9 |

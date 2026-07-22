# ReviewRadar Agent Handoff

Updated: 2026-07-22 by Codex after the zero-live Direct-Terra product-asset
integration and adversarial review. This file describes the reviewed tree that
Taylor authorized for a scoped local commit.

## Current phase and commit boundary

The committed base is full commit
`24c6474d8bc6e236ed8057657de1934f12df63ef` (`Redesign ReviewRadar decision
research experience`). Taylor approved integrating the already reviewed
registered-citation website resolver and Serper Shopping image adapter into the
default-off direct-Terra route/UI, adversarially reviewing the result, running
the complete validation wall, updating authoritative docs, and making a scoped
local commit.

The reviewed integration is complete and lands with the scoped local commit
containing this record. No provider
request, push, deployment, publication, feature-flag promotion, `.env.local`
edit, or production change occurred. Unrelated untracked fixtures, `.claude/`,
baseline files, and `fable-transfer-kit/` predate the phase and remain excluded.
Never use `git add -A`.

## Product outcome

The direct-Terra path still displays Terra's products, names, ranking,
explanations, and report unchanged. Its picks-at-a-glance cards may now add:

- an exact product website, preferring a registered Terra citation from that
  product's own ranked section;
- an exact-model image from one bounded Serper Shopping query for that locked
  product; and
- a direct Shopping product page only when no safe Terra citation exists.

Missing or rejected assets remain unavailable. They cannot add, remove, rename,
reorder, or fail a Terra recommendation. The UI keeps the unverified-purchase
and estimated-price caveats and shows a neutral image fallback.

## Trust and spend boundary

- At most five coherent targets are derived from Terra's own ranked headings
  and schema-owned brand/model price groups.
- Every website/image candidate passes the existing exact brand/model, product-
  type, page eligibility, accessory, sibling-model, redirect, wrapper, and
  wrong-model-image gates.
- Localhost, internal/local names, literal IPv4/IPv6 destinations, and private-
  network-shaped image hosts are rejected before a URL reaches the browser.
- The API v3 asset shape contains only rank, Terra product name, nullable
  product URL, and nullable image URL. Queries, source titles, raw provider
  rows, provider IDs, diagnostics, keys, headers, and raw responses stay server-
  only.
- A process-local TTL- and size-bounded promise store coalesces one asset
  resolution per OpenAI response ID. Repeating the completed GET reuses that
  sanitized result instead of spending another Shopping batch.
- Provider failure degrades only the optional assets; Terra's completed report
  remains available.

## Adversarial review findings

The pre-commit review found and corrected two generalized defects:

1. A repeated completed-job GET would repeat every Serper Shopping request.
   Regression coverage now proves two completed polls invoke the resolver once.
2. An exact Shopping row could previously attach a localhost/private-network
   image URL and make the shopper's browser request it. A fail-first test
   reproduced the defect; the shared Direct-Terra verifier now rejects those
   image hosts while preserving public exact-product images and Google Shopping
   thumbnails.

The review also confirmed that the client renderer requires both rank and exact
Terra product name before joining an asset, remote-image failure becomes the
neutral fallback, external links use safe new-window attributes, and no asset
result can rewrite the report.

## Reviewed phase files

Application and server files:

- `components/DirectTerraReport.tsx`
- `lib/directTerraApiContract.ts`
- `lib/directTerraAssetVerifier.ts`
- `lib/directTerraPreviewData.ts`
- `lib/directTerraProductAssets.ts`
- `lib/directTerraRecommendationRoute.ts`
- `lib/directTerraResearchAdapter.ts`
- `lib/directTerraResponse.ts`

Harness and tests:

- `scripts/run-oai-t8a-integrated-asset-smoke.mjs`
- `tests/directTerraAssetVerifier.test.mjs`
- `tests/directTerraClient.test.mjs`
- `tests/directTerraPreview.test.mjs`
- `tests/directTerraProductAssets.test.mjs`
- `tests/directTerraResearchAdapter.test.mjs`
- `tests/directTerraResponse.test.mjs`
- `tests/directTerraRoute.test.mjs`
- `tests/directTerraUi.test.mjs`
- `e2e/home.spec.ts`

Authoritative documentation:

- `ReviewRadar-Overview.md`
- `docs/agent-next-task.md`
- `docs/change-log.md`
- `docs/qa-loop-results.md`

## Verification

- focused Direct-Terra integration wall: 38/38 before adversarial additions;
- complete unit wall: 1256/1256 across 179 suites;
- `npm run typecheck`: pass;
- `npm run lint`: zero errors and three pre-existing warnings;
- `npm run build`: pass;
- `npm run test:e2e` with both direct-Terra flags forced off for the spawned
  process: 17/17 pass, including the development-only asset-card preview;
- integrated live-smoke runner default dry-run: pass and zero network;
- desktop and 390 x 844 in-app browser inspection: usable card/fallback/link
  layouts and zero captured warning/error console entries; and
- `git diff --check`: pass before final staging.

## Flag state

Committed defaults in `.env.example` remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior classified local `.env.local` state remains:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

This phase did not read or modify `.env.local`. Playwright used process-only
flag overrides.

## Next approval-gated decision

After the reviewed tree is committed, the next gate is one live integrated
smoke pinned to that new full commit. The frozen runner requires exactly these
approval ceilings:

- one Terra/high OpenAI Responses create;
- at most 20 hosted web searches;
- at most 60 retrieves;
- at most one safety cancel;
- at most five Serper Shopping requests / five physical attempts; and
- a $7 OpenAI hard ceiling.

It permits no retries, replacements, fallbacks, second response, direct source-
page requests, additional cases, `.env.local` changes, flag promotion,
deployment, or production change. It retains only the sanitized completed
response, counters, usage, and website/image coverage. Repository policy still
requires Taylor's numeric approval to name the reviewed full commit before
execution.

**Recommended reasoning level:** High. The run itself is mechanical, but the
first live integrated response must be audited for exact product identity,
website/image correctness, contract acceptance, attempt reconciliation, and
whether real coverage justifies a later deployment decision.

## Remaining limitations and honest uncertainty

- Mocked and controlled browser evidence proves safety and rendering behavior,
  not live provider coverage.
- Process-local idempotency prevents normal repeated-poll spend in one running
  app instance; it cannot coordinate two different server instances without a
  durable shared store.
- Serper Shopping may provide an exact image but no direct merchant website.
  Terra citation coverage therefore remains important.
- External image rendering discloses the shopper's network request to the
  public image host; `no-referrer` is set, and unsafe/local hosts are blocked,
  but ReviewRadar does not proxy images in this phase.
- Passing the live smoke is evidence for, not authorization of, later flag
  promotion or deployment.

## Hard boundaries

- No provider request without new exact numeric approval pinned to the reviewed
  full commit.
- No push, deployment, publication, feature-flag promotion, `.env.local` edit,
  or production change without separate approval.
- Preserve Terra's immutable recommendation identity, name, and order.
- Preserve citation ownership, disabled-source behavior, purchase caveats,
  market-price-estimate language, and every existing asset trust gate.
- Never expose or persist keys, headers, private queries, provider IDs, raw
  provider rows/responses, or server-only diagnostics.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase, boundaries, and next decision | this file |
| Product and architecture map | `ReviewRadar-Overview.md` |
| Canonical integration evidence | latest `docs/qa-loop-results.md` entry |
| Plain-English change | latest `docs/change-log.md` entry |
| Public API contract | `lib/directTerraApiContract.ts` |
| Target derivation and citation ownership | `lib/directTerraResponse.ts` |
| Website/image orchestration | `lib/directTerraProductAssets.ts` |
| Route lifecycle and idempotency | `lib/directTerraRecommendationRoute.ts` |
| Card rendering | `components/DirectTerraReport.tsx` |
| Commit-pinned live runner | `scripts/run-oai-t8a-integrated-asset-smoke.mjs` |

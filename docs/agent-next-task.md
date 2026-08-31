# ReviewRadar agent next task

Updated: 2026-08-30

## Current approved phase and snapshot

The active phase is **PR-9G: pre-verification product-page viability and the
fresh v7 measurement chain**.

Current implementation snapshot:

- generalized implementation commit:
  `adef42f9dfe1c1873b43deaf242453eb4fd17817`
- exact-byte matrix correction:
  `41f4f22588c26b98f27cce3e3792f94d99661efa`
- documentation-bound clean source snapshot:
  `f55e912e01baedcbb55c7a1fd9f8d9cf55da8802`
- parent reviewed PR-9F head:
  `9181752ba954ef2bf01260c1a4ef19603dee67b5`

PR-9F exact head received independent High **VERIFIED**, no findings,
confidence 0.997. The first PR-9G exact review of `c5a31c8e` returned
**CHANGES REQUIRED**, confidence 0.995, for two P2 gaps: the retained failure
enum was not bound to `completeProductPageUnavailable`, and no independent
regression isolated the product-URL conjunct. Both are corrected locally; the
new exact final head still requires independent High re-review before a paid
v7 attempt.

## Objective and proven bottleneck

**Objective:** discover and repair the highest-impact real product-search
accuracy failures without weakening identity, evidence, price, requirement,
network, or safety gates.

**Verified facts:** v6 attempt 1 at exact reviewed head `9181752b` produced
nine research candidates and zero eligible products. Seven first failed asset
identity, one complete-product relationship, and one identity-safe product URL.
Aggregate subreasons were six brand-absent page titles, two conflicting title
models, one missing title model, one non-product page, and one missing/invalid
product URL; counts within one family can overlap by candidate. Shopping
accepted zero exact offers. RIDGID HD1200 reached verification then failed the
relationship gate. Craftsman CMXEVBE17595, DeWalt, Stanley, and Vacmaster were
absent at research discovery. Ranking was never reached.

The attempt used one create, 26 retrieves, four hosted searches, nine Shopping
attempts, 18 source fetches, 22 physical HTTP attempts, 39,946 input tokens,
5,507 cached input tokens, 5,640 output tokens, 68.184 seconds, and `$0.249431`.
Artifact SHA-256 is
`fadf8f99ae8e7f31a1621ffbfa8d7ed43a08d98b8a5330dbfad8c34cb1b7380c`.
All retries, replacements, fallbacks, Organic/SearchAPI attempts, extra cases,
automatic continuation, cancels, and human opens were zero.

Across four paid attempts, cumulative usage is four creates, 126 retrieves, 21
hosted searches, 17 Shopping attempts, 34 source fetches, 41 physical HTTP
attempts, and `$1.248403`. Four of six logical searches are conservatively
consumed; two remain.

**Root cause:** the research source filter accepted any exact response-owned
title/URL pair that proved identity and even deferred titleless sources. It did
not require a source that the unchanged downstream verifier could classify as
a complete product with an identity-safe product URL. Editorial/non-product
pages and candidates without usable product destinations therefore consumed
downstream work and failed before ranking.

**Engineering judgment:** moving the existing viability rule earlier is the
strongest generalized correction. Relaxing identity, commerce, or evidence
rules would convert observed failures into unsupported recommendations;
changing ranking cannot help while zero candidates survive.

**Uncertainty:** PR-9G has not run live. Its effect on research survivor count,
must-consider recall, final card quality, rankings, prices/specifications,
source support, latency, cost, and repeatability is unproven.

## PR-9G implementation

- Contract/prompt/runtime v11/v7/v10 require at least one identity-safe
  complete-product page among each candidate's two exact response-owned
  sources. Missing titles are rejected instead of deferred.
- Candidate-local quarantine, discovery order, server ID reindexing, and the
  second logically distinct source for independent evidence remain intact.
- Diagnostics add only `missingTitle`,
  `completeProductPageUnavailable`, and the closed zero-survivor reason
  `candidate_source_product_page_unproven`.
- Route and artifact consumers require exact keys, zero retired deferrals,
  submitted/accepted/rejected conservation, and bounded reason coverage.
- Route and artifact consumers also bind
  `candidate_source_product_page_unproven` to a positive
  `completeProductPageUnavailable` count and
  `candidate_source_identity_unproven` to a zero count. Both contradictory
  pairings fail closed.
- Artifact/producer v6, capture v6, review v7, and live-plan/matrix v7 bind the
  change. Public shopper responses and manual-review packets do not gain
  diagnostics or private candidate data.
- Matrix v7 preserves v6 truth, sources, requests, cases, order, accuracy bars,
  ceilings, and zero-retry policy. Its six `pr9g-*` IDs/nonces are disjoint
  from all spent v1-v6 identities.

Frozen v7 identities:

- matrix file SHA-256:
  `9d1a06c3be8ff959b7fffea37cc3c1f2bbd99687ef20759cb161eab8fc495bcd`
- matrix canonical SHA-256:
  `ab0f5c831d030955c8691990725254cac780631564391316c76b0c1d9ccf3358`

Current verification:

- fail-first: 40/43, with exactly three intended failures;
- corrected focused staged suites: 138/138;
- corrected readiness/runner suites: 61/61;
- full unit suite: 1,721/1,721 across 232 suites;
- typecheck: pass;
- lint: zero errors and three pre-existing warnings;
- matrix byte normalization: `git diff --check` clean after correction.
- zero-network v7 plan at `f55e912e`: 66 trust entries authenticated, no
  failures, manifest SHA-256
  `4542287e3a69deea0ffce5dc088e7d34b43b0235000fb30bf9b46b3fe9df0c98`.

## Authority and next action

Taylor granted standing authority on 2026-08-30 for all in-scope local work,
commits, independent reviews, and paid calls needed to finish the accuracy
goal. No further approval is required inside the existing hard envelope.

Next: commit the two independent-review corrections and obtain one independent
High re-review of that exact resulting head. Reauthenticate the zero-network
v7 plan against the exact head. If verified, execute only v7 attempt 1. Analyze its
immutable artifact through the reviewed analyzer and stop. Use its observed
stage and closed aggregate reasons to decide whether the sixth and final
logical search is justified; do not continue automatically.

The hard envelope remains six serial logical searches, `$1` per run and `$6`
aggregate; 12 creates, 360 retrieves, 60 hosted searches, six cancels, 90
Shopping attempts, 180 source fetches, 540 physical HTTP attempts, and at most
60 human public-source opens. Retries, replacements, fallbacks,
Organic/SearchAPI, extra cases, and automatic continuation remain zero.

Push, pull-request creation, deployment, release, and flag promotion are not
required for this goal and remain out of scope.

## Flags and secrets

Committed defaults remain off:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The ignored `.env.local` is user-owned. Never manually inspect, print, hash,
copy, edit, or diagnose it. Only the reviewed bounded launcher may read its two
required credentials.

## Hard boundaries

- Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
  delete `tests/fixtures/review-radar-live/**`. Every ordinary search/status
  command must exclude it. Only reviewed runtime/analyzer code may read an
  exact required artifact.
- Never reuse a spent run ID or nonce.
- Preserve exact source, identity, variant, price, requirement, evidence,
  network, cancellation, and manual-review gates.
- Machine output never authorizes automatic continuation.

## Outstanding debts and accuracy risks

- **PR-006 live quality:** must-consider recall, exact variant/card truth,
  rankings, prices/specifications, source support, and repeatability are still
  unscored because no current run has produced a card.
- **Discovery:** Craftsman CMXEVBE17595 and other registered products continue
  to disappear before verification. PR-9G improves source viability, not broad
  leader discovery by itself.
- **Host metadata:** the research prefilter uses response-owned source
  title/URL metadata. Fetched pages remain the downstream authority, so stale
  or misleading metadata can still cause conservative quarantine or later
  rejection.
- **Operations:** distributed authority, hosted cancellation, logging,
  configuration, Linux/runtime, CI, deployment, rollback, monitoring, alerts,
  retention, accessibility, multi-browser, and real-device proof remain open.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Protocol decision | `docs/forward-roadmap.md`, PR-9F and PR-9G |
| Canonical execution result | latest PR-9G entry in `docs/qa-loop-results.md` |
| Durable trust contract | `docs/review-radar-test-memory.md`, PR-9G |
| Readiness verdict | `docs/production-readiness-report.md` |
| Issue arithmetic | `docs/RR-Issues-Report.md` |

PR-9G is an evidence-supported accuracy correction; it is not yet live proof
of product accuracy or production readiness.

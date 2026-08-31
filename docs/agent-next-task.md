# ReviewRadar agent next task

Updated: 2026-08-30

## Current approved phase and snapshot

The active phase is **PR-9H: retain source-filter failure evidence and execute
the final v8 measurement**.

Current implementation snapshot:

- PR-9G exact reviewed head:
  `5309bd77c4fd752086ce1045c55994c2ce302ec4`
- PR-9H generalized producer and v8 protocol commit:
  `43db41fa8d6df4f15396081e9b28dd156778588d`
- the normalized v8 matrix byte correction and this regenerated handoff are
  local changes awaiting the final exact-head review.

PR-9G received independent High **VERIFIED**, no findings, confidence 0.999.
Its exact v7 attempt 1 was then consumed and stopped safely as
`artifact_build_failed`; no artifact was published and no automatic
continuation occurred.

## Objective and proven bottleneck

**Objective:** discover and repair the highest-impact real product-search
accuracy failures without weakening identity, evidence, price, requirement,
network, or safety gates.

**Verified live result:** v7 search 5 reached a research terminal after one
OpenAI create, 35 retrieves, and seven hosted searches. It made zero Shopping,
source-fetch, physical HTTP, retry, replacement, fallback, Organic/SearchAPI,
extra-case, or safety-cancel attempts. The canonical artifact builder rejected
the terminal, retained append-only checkpoints, and returned only the closed
failure `artifact_build_failed`.

**Verified root cause:** the source-filter failure path records a bounded
registered-product research trace before returning `research_failed`. The
artifact producer projected `diagnostics.research` only for a completed
research terminal, but required every non-null registered-product trace to
reconcile against non-null research counts. A fail-first regression reproduced
the live failure exactly as
`staged_readiness_artifact_input_invalid:registeredProductTrace.aggregate.research`.

**Engineering judgment:** retaining the already-validated aggregate
source-filter counts is the smallest complete correction. It preserves the
failed search as evidence and avoids a new protected-checkpoint reader, a
retry, invented candidates, or weaker identity/evidence gates.

**Uncertainty:** search 5 produced no authenticated artifact, so its exact
zero-survivor reason, bounded rejection distribution, provider token usage,
and actual cost are unavailable. Search 6 is the only remaining live
measurement in the six-search envelope.

## PR-9H implementation

- Artifact projection now retains bounded submitted, accepted, deferred, and
  rejected research counts whenever the validated route diagnostic contains
  an identity-source filter, including an all-rejected research failure.
- Completed research still requires the filter. Failed terminals without a
  validated filter remain null; no counts are synthesized.
- A regression recreates an all-rejected product-page source failure with a
  non-null registered-product trace and proves canonical build, parse, count
  retention, zero accepted products, and null verification.
- Artifact/producer v7, capture v7, review v8, and live-plan/matrix v8 bind the
  semantic correction. Public shopper output and the bounded manual-review
  packet remain unchanged.
- Matrix v8 preserves v7 truth, sources, requests, cases, order, quality bars,
  ceilings, and zero-retry policy. Its six fresh `pr9h-*` IDs/nonces are
  disjoint from every v1-v7 identity.

Frozen v8 identities:

- normalized matrix file SHA-256:
  `773be3d5ec6cc7b03c8bd9ee077e64a9a838645ae86775c0036c334d6008dac6`
- matrix canonical SHA-256:
  `152a0126de52112f0bcaeefff09040f186a3343c8aed50fb52c4dd9e62b108d1`

Current verification:

- fail-first: the new traced research-failure regression fails at
  `registeredProductTrace.aggregate.research` on the old producer;
- corrected focused staged suites: 138/138;
- full unit suite: 1,721/1,721 across 232 suites;
- typecheck: pass;
- lint: zero errors and three pre-existing warnings;
- `git diff --check`: clean after v8 byte normalization.

## Live usage and authority

Five of six logical searches are consumed. Searches 1-4 used four creates,
126 retrieves, 21 hosted searches, 17 Shopping attempts, 34 source fetches, 41
physical HTTP attempts, and `$1.248403`. Search 5 added one create, 35
retrieves, and seven hosted searches; its token usage and actual cost were not
published because the artifact build failed. Its authorized per-run exposure
was at most `$1`.

Taylor granted standing authority on 2026-08-30 for all in-scope local work,
commits, independent reviews, and paid calls needed to finish the accuracy
goal. No further approval is required inside the existing hard envelope.

The hard aggregate envelope remains six serial logical searches, `$1` per run
and `$6` aggregate; 12 creates, 360 retrieves, 60 hosted searches, six
cancels, 90 Shopping attempts, 180 source fetches, 540 physical HTTP attempts,
and at most 60 human public-source opens. Retries, replacements, fallbacks,
Organic/SearchAPI, extra cases, and automatic continuation remain zero.

Push, pull-request creation, deployment, release, and flag promotion are not
required for this goal and remain out of scope.

## Exact next action

Commit the normalized v8 matrix and documentation, then obtain one independent
High exact-commit review of the complete PR-9H snapshot. Reauthenticate the
zero-network v8 plan. If and only if it is verified, execute v8 attempt 1 as
logical search 6. Analyze its immutable artifact through the reviewed analyzer
and stop; the six-search live envelope is then exhausted.

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
  ranking, prices/specifications, source support, and repeatability remain
  unscored because no current run has produced a card.
- **Discovery:** Craftsman CMXEVBE17595, DeWalt, Stanley, and Vacmaster were
  absent before verification in v6. The product-page viability gate does not
  itself improve leader discovery.
- **Conservative quarantine:** response-owned title/URL metadata can be stale
  or incomplete. The downstream fetched page remains authoritative, but the
  earlier gate can still suppress a real product before that fetch.
- **Evidence loss on capture failure:** v8 fixes the proven source-filter trace
  contradiction, but unexpected future canonical-builder failures still stop
  without an artifact by design.
- **Operations:** distributed authority, hosted cancellation, logging,
  configuration, Linux/runtime, CI, deployment, rollback, monitoring, alerts,
  retention, accessibility, multi-browser, and real-device proof remain open.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Protocol decision | `docs/forward-roadmap.md`, PR-9G and PR-9H |
| Canonical execution result | latest PR-9H entry in `docs/qa-loop-results.md` |
| Durable trust contract | `docs/review-radar-test-memory.md`, PR-9H |
| Readiness verdict | `docs/production-readiness-report.md` |
| Issue arithmetic | `docs/RR-Issues-Report.md` |

PR-9H repairs evidence capture for the new accuracy gate; it does not yet
prove product accuracy or production readiness.

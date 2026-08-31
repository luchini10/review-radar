# ReviewRadar agent next task

Updated: 2026-08-30

## Current phase and exact snapshot

PR-9H is complete at exact independently reviewed commit
`0ae3a11eb8f0601398eeea0e4c9b589685df3b17` (tree
`ba7c6c320950bd99a7394de88e1fc05f9c34f7a4`, parent
`34ac71b5428821b42ae693d69670a8211ac9a2d2`).

Independent High review returned **VERIFIED**, no findings, confidence 0.999.
The exact zero-network v8 plan authenticated 66 trust entries with no failures
under manifest
`922047251366784ccf0a3af0df6540b4438f97d1cb73f415d7c373f4b913035d`.

All six authorized logical searches are consumed. Do not execute another live
search, retry, replacement, fallback, or additional case under this envelope.

## Objective and measured outcome

**Objective:** discover and repair the highest-impact real product-search
accuracy failures without weakening identity, evidence, price, requirement,
network, or safety gates.

**What improved:**

- PR-9G moved identity-safe complete-product-page viability ahead of Shopping
  and page fetching, so candidates already destined to fail no longer consume
  downstream work.
- PR-9H fixed the resulting evidence-capture contradiction. A failed
  source-filter terminal with a bounded registered-product trace now publishes
  an authenticated artifact instead of stopping as `artifact_build_failed`.
- Failed source-filter counts are accepted only for the exact
  `invalid_research_contract` plus `candidate_sources` context. An unrelated
  failed poll cannot inject those counts.
- Every public, privacy, identity, variant, relationship, evidence, price,
  requirement, commerce, network, cancellation, and manual-review gate remains
  intact.

**What the final live search proved:**

- v8 attempt `pr9h-01-broad-shop-vac-r1` at the exact reviewed commit
  published artifact SHA-256
  `33eb5ed7c216a16bd6c6ebe7b929eaeedb941060d07f0b77abb6b2992cec49f7`.
- The reviewed analyzer returned `decision=halt`, zero structural failures,
  terminal `research_failed`, and closed attribution
  `invalid_research_contract → research_candidate_invalid → candidate_sources
  → candidate_source_identity_unproven`.
- Broad must-consider recall was 0/2 for the run and 0/2 for the prefix.
  RIDGID HD1200, Craftsman CMXEVBE17595, DeWalt Stealthsonic, Stanley SL18116P,
  and Vacmaster Beast were all `research_discovery_absent`.
- No candidate reached Shopping, source-page fetching, deterministic
  verification, presentation, ranking, price/specification checking, or
  evidence rendering.

**Conclusion:** PR-9G improved safety and cost containment but did not improve
usable broad-query recall in this sample. The highest remaining accuracy
bottleneck is research discovery/source acquisition: the pipeline did not
produce response-owned source metadata capable of proving any candidate
identity. Lowering the identity gate is not supported by the evidence.

## PR-9H implementation and verification

- Artifact/producer v7 retains validated source-filter submitted, accepted,
  deferred, and rejected counts for the intended failed-research path.
- A fail-first regression reproduced the prior live failure exactly at
  `registeredProductTrace.aggregate.research`.
- An independent-review mutation proved that an unrelated
  `request_error/not_started` failure could inject a valid-shaped filter on
  the old producer; the corrected producer rejects it at
  `identitySourceFilter.failure_context`.
- Capture v7, review v8, live-plan v8, and matrix v8 bind the behavior.
- Matrix v8 preserves v7 truth, sources, requests, cases, order, quality bars,
  ceilings, and zero-retry policy, with fresh v1-v7-disjoint identities.
- Normalized matrix file SHA-256:
  `773be3d5ec6cc7b03c8bd9ee077e64a9a838645ae86775c0036c334d6008dac6`.
- Matrix canonical SHA-256:
  `152a0126de52112f0bcaeefff09040f186a3343c8aed50fb52c4dd9e62b108d1`.
- Focused staged suites: 138/138.
- Full unit suite: 1,721/1,721 across 232 suites.
- Typecheck: pass.
- Lint: zero errors and three pre-existing warnings.
- Exact-head re-review focused readiness/runner proof: 61/61.

## Final live accounting

Search 6 used:

- one OpenAI create;
- 33 retrieves;
- six hosted searches;
- 57,313 input tokens;
- zero cached input tokens;
- 7,350 output tokens;
- 75.900 seconds;
- `$0.349353`;
- zero Shopping, source fetch, physical HTTP, retries, replacements, fallbacks,
  Organic/SearchAPI, extra cases, cancels, or ceiling failures.

Across all six logical searches, known counters are:

- six creates;
- 194 retrieves;
- 34 hosted searches;
- 17 Shopping attempts;
- 34 source fetches;
- 41 physical HTTP attempts;
- zero retries, replacements, fallbacks, Organic/SearchAPI, extra cases, and
  automatic continuations.

Searches 1-4 cost `$1.248403`; search 6 cost `$0.349353`. Search 5's exact
token usage and cost were not published because its pre-fix artifact build
failed; its authorized per-run exposure was at most `$1`. Therefore known
cost is `$1.597756`, and the conservative total including search 5 is at most
`$2.597756`, below the `$6` aggregate ceiling.

No human public-source pages were opened.

## Recommended next accuracy phase

Use **High reasoning** because the next choice changes the acquisition
architecture and must balance recall against the identity/evidence boundary.

Before changing acceptance, design a new zero-live diagnostic protocol that
retains only closed aggregate research-source first-loss counts already
computed by the filter (missing title, brand absent, model absent, model
conflict, wrong type, or complete-product page unavailable). Then compare two
generalized alternatives offline:

1. stricter prompt/source selection that reliably cites direct product pages;
2. deterministic, candidate-local targeted product-page resolution before
   acceptance, without allowing cross-candidate source borrowing.

Do not roll back to model-authored identity, URL-only trust, or unsupported
recommendations. A future live cohort needs a fresh numeric envelope and fresh
IDs/nonces because the six-search v3-v8 envelope is exhausted.

## Flags, secrets, and hard boundaries

Committed defaults remain off:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The ignored `.env.local` is user-owned. Never manually inspect, print, hash,
copy, edit, or diagnose it. Only a reviewed bounded launcher may read its two
required credentials.

Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
delete `tests/fixtures/review-radar-live/**`. Every ordinary search/status
command must exclude it. Only reviewed runtime/analyzer code may read an exact
required artifact.

Push, pull-request creation, deployment, release, and flag promotion were not
performed.

## Remaining risks

- Exact product and variant accuracy, ranking quality, price/specification
  accuracy, evidence support, and repeatability remain unmeasured because no
  current run produced a card.
- The final artifact retains only privacy-safe aggregates; it cannot reveal
  which rejected private candidates or URLs caused the identity failure.
- Response-owned source titles may be stale, generic, or editorial and can
  conservatively suppress real products before fetched-page verification.
- Distributed authority, hosted cancellation, logging, configuration,
  Linux/runtime, CI, deployment, rollback, monitoring, alerts, retention,
  accessibility, multi-browser, and real-device proof remain open.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Protocol and decisions | `docs/forward-roadmap.md`, PR-9G and PR-9H |
| Canonical live result | latest PR-9H entry in `docs/qa-loop-results.md` |
| Durable trust contract | `docs/review-radar-test-memory.md`, PR-9H |
| Product architecture | `ReviewRadar-Overview.md`, sections 48-49 |
| Readiness verdict | `docs/production-readiness-report.md` |

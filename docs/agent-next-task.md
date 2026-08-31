# ReviewRadar agent next task

Updated: 2026-08-31

## Current phase and exact snapshot

PR-10, the selection-only architecture reset, is implemented and fully
validated on the committed PR-9J snapshot
`5117276c3b2909d629d9f19970b3e6f55c10af67`. This regenerated handoff is part
of the final local PR-10 commit. Resolve its exact hash with
`git rev-parse HEAD`; no push, deployment, or release is authorized or
required.

There is no running development server. No experimental recommendation mode,
feature flag, background job, or report route remains in the application.

## Objective, bottleneck, and decision

**Objective:** reduce real shopper latency and complexity without weakening
which products qualify.

Matched baseline searches averaged 101,212 ms. The delay was distributed across
final report generation, review/editorial research, planning, rescue,
discovery, and asset stages. The route made three OpenAI calls, used 37–60+
Serper attempts, built prompts of roughly 17,000–19,000 characters plus a
6,115-character system prompt, and returned 38–129 KB normal responses. This
proved the report pipeline itself was the bottleneck; optimizing one stage or
keeping alternate modes would not solve the objective.

PR-10 therefore replaces the report architecture with one bounded product
selection path. This supersedes Direct Terra, staged Terra, two-layer output,
the earlier stable report path, and all report-era kickoffs.

## Current runtime contract

- `/api/recommendations` is the only application API and exports only `POST`.
- The request is validated before paid work. Conflicting hard requirements fail
  before planning or search.
- Planning uses zero or one compact OpenAI structured-output call. Missing,
  timed-out, or invalid model output falls back to deterministic queries.
- Search performs at most three Shopping queries and at most eight total
  logical search/product-page operations. There are no retries, alternate
  providers, editorial/review crawls, rescue passes, polling, or background
  jobs.
- Hard requirements, wrong product types, accessories/components, used items,
  explicit model conflicts, duplicates, and over-budget products fail closed.
- A budgeted result requires a trustworthy current price.
- Product pages are identity-checked and fetched through bounded DNS-pinned
  SSRF protection. Images require same-product evidence or render as a
  placeholder.
- Result cards contain only image or placeholder, category, exact product name,
  trustworthy price or explicit missing-price state, and `View product`.
- Smart Features are deterministic local catalogs. They make no provider call.

## Measured result

The same three representative searches produced:

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Mean client latency | 101,212 ms | 8,029.33 ms | 92.07% lower; 12.61x faster |
| Mean normal response | 86,087.67 B | 821.33 B | 99.05% lower; 104.81x smaller |
| OpenAI calls per search | 3 | 1 | 66.67% fewer |
| Search/page ceiling | 37–60+ Serper attempts observed | 8 logical operations | hard bounded |

Additional `must be` robot-vacuum and monitor searches returned only matching,
in-budget direct products. The benchmark records are in `docs/benchmarks/`.

## Verification

- Unit tests: 241/241 across 41 suites.
- Typecheck: pass.
- Lint: pass with zero warnings.
- Production build: pass; application routes are only `/`, `/_not-found`, and
  `/api/recommendations`.
- Playwright: pass, 7/7 across Chromium desktop/mobile.
- Live matched before/after: three representative searches completed and are
  recorded without raw provider responses or credentials.
- Live hard-language QA: two additional searches completed successfully.

The required checks were rerun serially against the final source snapshot.

## Files and scope

The phase changes the recommendation route, minimal client/result components,
selection planner/search/ranking primitives, product-page/identity/price/image
safety helpers, local Smart Features, request/result types, tests, E2E coverage,
benchmark tooling/evidence, package surface, and canonical documentation.

Report routes, progress APIs, report UI, report contracts, narrative/citation/
review/evidence generators, Direct Terra, staged Terra, two-layer output,
obsolete evaluation scripts, and report-specific tests/fixtures were deleted.
Unrelated untracked user files remain untouched.

## Secrets and hard boundaries

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Ordinary tools must never open, enumerate, stat, hash, parse, copy, edit, or
delete `tests/fixtures/review-radar-live/**`; exclude it from ordinary search
and status commands.

PR-10 authorizes the local code/documentation work, representative paid
searches, full local verification, and one final local commit. It does not
require or perform a push, PR, deployment, release, production-data change, or
credential disclosure.

## Remaining risks and uncertainty

- The live sample is deliberately small and prices/search inventory are
  time-sensitive; it proves the latency/complexity change and representative
  selection behavior, not universal catalog recall.
- Missing identity-safe product imagery intentionally produces placeholders.
- A hard requirement with insufficient evidence may exclude a real match. This
  is the intentional fail-closed tradeoff.
- Hosted and production-runtime readiness were not tested in this local phase.

## Recommended next step

Review the committed selection-only snapshot and manually exercise the shopper
UI. Use **medium reasoning** for routine UI or catalog follow-up because the
architecture is now small and directly tested. Use **high reasoning** before
changing hard-requirement, identity, price, SSRF, or image safety rules because
those are the remaining correctness boundaries.

There is no approved follow-on implementation. Do not reintroduce report
generation or an alternate recommendation architecture without a new product
decision supported by current evidence.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Phase decision and architecture | `docs/forward-roadmap.md`, PR-10 |
| Canonical verification | latest PR-10 entry in `docs/qa-loop-results.md` |
| Durable selection contract | `docs/review-radar-test-memory.md`, PR-10 |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Before/after benchmark | `docs/benchmarks/selection-simplification-before.json`, `selection-simplification-after.json`, and `selection-simplification-quality.json` |
| Parent snapshot | commit `5117276c3b2909d629d9f19970b3e6f55c10af67` |

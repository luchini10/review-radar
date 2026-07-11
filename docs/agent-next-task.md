# Agent Next Task

Generated: 2026-07-11

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Phase R3 and the
separately approved RR-061 image-provenance safety repair are complete. R3's
`REVIEW_RADAR_PINNED_PLANNING` flag remains default-off and `.env.local` is
unchanged.

RR-061 used zero live calls. Fail-first was 811/814 with exactly three intended
failures; focused final was 24/24; the full suite passed 815/815 across 120
suites. Typecheck, production build, and offline eval pass; lint has 0 errors
and 3 existing warnings.

The issue register remains at 79 issues: 64 Fixed, 14 Needs Investigation,
1 Won't Fix, and 0 Open; 11 Critical, 33 High, 30 Medium, and 5 Low. RR-061 is
Fixed. RR-015 remains Needs Investigation because no live stability improvement
was measured.

R2 remains stopped at 4/6. Latest North-Star evidence is unchanged:

- core-leader recall: unavailable without an approved snapshot;
- wrong-type/non-product final cards: 3/23;
- full stated-constraint compliance: unscoreable because `self-emptying` was
  not encoded as a requirement;
- stability: A pool/final Jaccard 0.1051/0.0333; B unavailable.

Rubric remains `v0.1-draft`; leader snapshots, significance rules, and baseline
values are unfrozen. Phase 6E remains unauthorized.

## Required next task — RR-078/RR-079 eligibility/type safety repair

This is a separate deterministic safety-unblock phase and requires Taylor's
explicit approval. Do not start R4 or another live window first.

R2 proved two related non-primary-entity failures at the shared product-card
boundary: customer-service/editorial pages rendered as buyable products
(RR-078), and a standalone self-empty dock rendered as a robot vacuum near
match (RR-079).

The phase must:

- add separate fail-first tests for `/pages/new-customer-service-2`, the dated
  Pocketables article path, and the accessory-only dock captured in R2;
- generalize customer-service/support/editorial route and page-type rejection
  at the shared eligibility boundary without hardcoding the captured domains;
- add an exclusive-accessory product-type rule for standalone docks/bases/
  stations while preserving bundles that explicitly include the primary
  product;
- preserve evidence-only use of legitimate editorial/review pages and valid
  product-detail pages that use `/pages/`;
- leave RR-061, planner/search allocation, ranking, requirements, price,
  citations, R3 flags, and `.env.local` out of scope;
- use zero live Serper/OpenAI calls;
- update the issue register and standard phase documents, then stop.

## Later sequence

Only after RR-078/RR-079 are cleared should R4 deterministic work and its
separately approved live after-sample proceed. Future B observations are
after-sample evidence; they must not be described as missing R2 before-runs.

## Safety boundary

Do not run B2/B3, enable `REVIEW_RADAR_PINNED_PLANNING` in `.env.local`, run a
new baseline, freeze R2 values, approve leader snapshots, start R4, or start
Phase 6E without separate approval. Do not commit live fixtures or existing
untracked local artifacts.

Reference:

- `docs/forward-roadmap.md`
- `docs/agent-dialogue.md` — standing Claude↔Codex channel; read and answer at
  phase start, append questions at phase end (see roadmap standing guardrails)
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` section 25

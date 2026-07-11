# Agent Next Task

Generated: 2026-07-11

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Phase R3 is complete:
the default-off `REVIEW_RADAR_PINNED_PLANNING=on` flag maps the default helper
alias to `gpt-5.4-mini-2026-03-17` and sends `temperature: 0` on both discovery
planning calls. The Responses API documents no `seed`, so none is sent.
Custom helper models, flag-off request shapes, and final synthesis are unchanged.

R3 used zero live calls. Fail-first was 8/9; focused final was 38/38; the full
suite passed 810/810 across 119 suites. Typecheck, production build, and offline
eval pass; lint has 0 errors and 3 existing warnings. `.env.local` is unchanged,
so the new flag has not been promoted.

The issue register remains at 79 issues: 63 Fixed, 15 Needs Investigation,
1 Won't Fix, and 0 Open; 11 Critical, 33 High, 30 Medium, and 5 Low. RR-015
remains Needs Investigation because no live stability improvement was measured.

R2 remains stopped at 4/6. Latest North-Star evidence is unchanged:

- core-leader recall: unavailable without an approved snapshot;
- wrong-type/non-product final cards: 3/23;
- full stated-constraint compliance: unscoreable because `self-emptying` was
  not encoded as a requirement;
- stability: A pool/final Jaccard 0.1051/0.0333; B unavailable.

Rubric remains `v0.1-draft`; leader snapshots, significance rules, and baseline
values are unfrozen. Phase 6E remains unauthorized.

## Required next task — RR-061 image-provenance safety repair

This is a separate deterministic safety-unblock phase and requires explicit
approval. Do not start R4 or another live window first.

The R1 guard only recognizes single filename tokens containing letters and
digits. R2 therefore rendered `2_QRevo_Curv_QRevo_Edge_140x.jpg` on Q10 X5+
and Q10 S5+ cards, and `Saros_20_Black_ID.png` on a Q7 Max+ card. Pure-word
foreign model families plus a separate number never armed the guard.

The phase must:

- establish which candidate source won for each captured image (existing,
  metadata, matching Product JSON-LD, or page image) before changing logic;
- add fail-first tests for the three R2 cards plus the earlier navigation and
  `Saros_Z70` generations;
- prefer product-bound image provenance over page-global metadata when the
  evidence supports that root cause;
- reject explicit foreign family/model imagery without a brand dictionary or
  request-local candidate-pool dependency;
- preserve neutral filenames, opaque CDN hashes, same-model files, matching
  Product JSON-LD images, Google Shopping thumbnails, and navigation guards;
- leave product eligibility (RR-078), accessory typing (RR-079), planner/search
  allocation, ranking, requirements, price, citations, and `.env.local` out of
  scope;
- use zero live Serper/OpenAI calls;
- update the issue register and standard phase documents, then stop.

## Later sequence

After RR-061, run a separately approved RR-078/RR-079 eligibility/type safety
phase. Only after those blockers are cleared should R4 deterministic work and
its separately approved live after-sample proceed. Future B observations are
after-sample evidence; they must not be described as missing R2 before-runs.

## Safety boundary

Do not run B2/B3, enable `REVIEW_RADAR_PINNED_PLANNING` in `.env.local`, run a
new baseline, freeze R2 values, approve leader snapshots, start R4, or start
Phase 6E without separate approval. Do not commit live fixtures or existing
untracked local artifacts.

Reference:

- `docs/forward-roadmap.md`
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` section 24

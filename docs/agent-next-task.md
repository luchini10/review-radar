# Agent Next Task

Generated: 2026-07-10

## Current state

Phase A search observability is complete. ReviewRadar now records a debug-only,
request-scoped search and candidate-lineage ledger inside
`debug.stageFunnel.searchLedger`. Deterministic verification passed with zero
Serper requests, zero OpenAI requests, and no behavior change.

RR-071 through RR-077 were filed from the static/search-fixture audit and all
remain Needs Investigation. They are evidence for later, separately scoped
behavior work; Phase A did not fix them. RR-070 remains the existing unrelated
provider-brand contamination record and was not duplicated.

The issue register contains 77 unique issues:

- 10 Critical, 32 High, 30 Medium, 5 Low;
- 0 Open, 13 Needs Investigation, 63 Fixed, 1 Won't Fix.

## Required next task — separate approval required

The next behavior task is the narrow RR-061 wrong-model image fix. The known
reproduction is `Roborock Q5 Max+` rendering
`Saros_Z70_Silver_ID.png`: matching product-page context currently outweighs an
explicit conflicting model in the image path.

The RR-061 phase must:

- begin with deterministic fail-first coverage distilled from the saved live
  evidence;
- implement a generalized conflicting-image-model guard in the shared image
  resolver, not a Roborock-specific exception;
- preserve valid same-model images, opaque/hashed CDN assets, Google Shopping
  thumbnails, and the earlier navigation/flyout safeguards;
- leave search breadth, ranking, price, citation, requirement, product-type,
  source-upgrade, and final-selection behavior unchanged;
- run zero live searches unless Taylor separately approves a live budget.

Do not combine RR-070 or RR-071 through RR-077 into the RR-061 phase without
explicit direction.

## After RR-061 — Phase B live verification

Phase B is a later, separately approved live-measurement phase. Its purpose is
to capture fresh debug fixtures with the Phase A ledger and use actual traces
to verify query/candidate attribution, reconcile provider attempts, and measure
the proven audit bottlenecks. Static and mocked tests cannot prove the exact
runtime OpenAI-generated queries or current provider result sets.

Until Phase B receives explicit approval:

- do not run Serper searches, OpenAI searches, `qa:save-fixture`, live QA
  workers, or baseline/variance searches;
- do not spend the four calls left from the stopped Phase 6D window;
- do not pool any of the three stopped Phase 6D samples;
- do not resume Phase 6D, freeze rubric v1.0, approve leader snapshots, or
  start Phase 6E;
- do not implement RR-071 through RR-077 based only on Phase A instrumentation.

## Phase A verification baseline

```text
npm run typecheck: pass
npm run lint: 0 errors, 3 existing warnings
npm test: 802/802 across 118 suites
npm run build: pass
node scripts/eval-pipeline.mjs: no red-flag issues
npm run qa:ledger-benchmark: 0.757 ms/request overhead; 0.0009% projected
live Serper/OpenAI calls: 0
```

Reference:

- `docs/review-radar-search-pipeline-audit.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` sections 10 and 21

Stop. Do not start RR-061 or Phase B without separate explicit approval.

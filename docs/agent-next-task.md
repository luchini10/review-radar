# Agent Next Task

Generated: 2026-07-10

## Current state

`docs/forward-roadmap.md` is adopted (Phase R0). It governs all forward
sequencing: R1 (RR-061 wrong-model image fix) → R2 (live ledger verification +
frozen baseline, completes Phase 6D) → R3 (planner determinism) → R4
(constraint-preserving query allocation + requirement strength) → R5
(downstream false negatives) → R6 (source-brand trust + seed precision) → R7
(single-candidate-source architecture consolidation). Its anti-measurement
rules and standing guardrails are binding on every phase.

Phase A search observability remains complete and verified
(`debug.stageFunnel.searchLedger`; commits ef7bbc1, abf924d). RR-071 through
RR-077 remain Needs Investigation evidence for R4–R6; do not fix them out of
order.

## Current task

**Phase R1 — RR-061 generalized wrong-model image fix.** Approved by Taylor
on 2026-07-10 and being executed by Claude in the same session that adopted
the roadmap. Scope, acceptance, and non-goals per `docs/forward-roadmap.md`.
Deterministic only; zero live calls.

## After R1 — Phase R2 requires separate explicit approval

Until Taylor fires the R2 kickoff prompt with its live budget:

- do not run Serper searches, OpenAI searches, `qa:save-fixture`, live QA
  workers, or baseline/variance searches;
- do not spend the four calls left from the stopped Phase 6D window;
- do not pool any of the three stopped Phase 6D samples;
- do not freeze rubric v1.0, approve leader snapshots, or start Phase 6E
  (R2 owns the freeze);
- do not implement RR-070 through RR-077 based only on Phase A
  instrumentation (they are owned by R4–R6).

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

- `docs/forward-roadmap.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` sections 10 and 21

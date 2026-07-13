# Agent Next Task

Generated: 2026-07-13

## Read this first — progressive retrieval protocol

This file is the complete session-start handoff. Do **not** bulk-load the
historical Markdown archive. Regenerate it at every phase closeout. It must
always state the current phase/commit, flag state, hard boundaries, outstanding
peer-review debts, and current verification.

1. Read all of this file.
2. Retrieve only the applicable guardrails/phase from `docs/forward-roadmap.md`.
3. Read the dialogue protocol plus entries after your last entry.
4. Read the issue summary plus only active/referenced RR IDs.
5. Retrieve other history by exact topic only.

## Current state

- Dev flag: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
  `REVIEW_RADAR_PINNED_PLANNING` remains off. Default-off
  `REVIEW_RADAR_NORMALIZATION_RECOVERY` is not promoted; `.env.local` is
  unchanged.
- The R7 readiness gate remains failed at 1/7 Serper-only normalized-pool
  recall in each of two usable broad runs. R7A remains blocked.
- C1 diagnosed normalization loss; C2 repaired RR-060/RR-083; C3 added
  default-off merchant-URL recovery. Claude's deferred C1/C2 and C2+C3 review
  is complete in dialogue entry [25].
- Its two reproduced safety findings are closed in product-behavior commit
  `14b9e21`: URL-inferred model identity cannot collapse a product with its
  complement, and normalization recovery requires a positive product-detail
  URL shape. The public normalization path covers the recovery regression;
  no private helper was exported. A legitimate robot-plus-stick combination
  remains eligible.
- Verification: focused 134/134; ledger/analyzer 23/23; full suite 896/896
  across 127 suites; typecheck, build, and offline eval pass; lint 0 errors/
  3 pre-existing warnings. Zero live calls.
- Register: 83 total — 78 Fixed, 4 Needs Investigation, 1 Won't Fix.

## Required next decisions — no phase is approved

1. Ratify/revise `leaders-v2026-07c` constrained leaders and matcher.
2. Finalize C4 attribution before spend. Separate flag-off and flag-on live
   responses cannot prove same-provider causality; use same-response shadow
   counterfactual/replay for opportunity and enabled survival, with live runs
   reserved for end-to-end confirmation.
3. Separately approve C4's six-search window. Use 486 physical attempts as the
   conservative planning basis and report actuals.
4. R7A remains separately approval-gated even if C4 passes.

## Hard boundaries

Do not start C4/R7A or another phase; run live searches; promote normalization
recovery; modify `.env.local`; alter frozen benchmarks; or commit live fixtures
and pre-existing untracked artifacts without Taylor's separate approval.

## Retrieval map

| Need | Retrieve |
|---|---|
| Phase acceptance | `docs/forward-roadmap.md` named section |
| Peer review | `docs/agent-dialogue.md` protocol + newest relevant entries |
| Defect | `docs/RR-Issues-Report.md` summary + RR ID |
| Trust rationale | `docs/review-radar-test-memory.md` named section |
| Verification | `docs/qa-loop-results.md` named phase entry |
| Historical handoff | `docs/codex-handoff-phased-plan.md` named record |
| Architecture | `ReviewRadar-Overview.md` named subsystem |
| Change history | `docs/change-log.md` dated entry |

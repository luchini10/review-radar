# Agent Next Task

Generated: 2026-07-13

## Read this first — progressive retrieval protocol

This file is the complete session-start handoff. Do **not** bulk-load the
historical Markdown archive.

1. Read all of this file.
2. Use `rg` to locate the applicable guardrails and phase section in
   `docs/forward-roadmap.md`, then read only that bounded section.
3. In `docs/agent-dialogue.md`, read the protocol plus entries after your last
   entry, or the entry Taylor says is waiting.
4. In `docs/RR-Issues-Report.md`, read the summary plus active/referenced RR
   IDs. Read the full register only when maintaining it.
5. Retrieve QA, handoff, test-memory, overview, and change-log history by exact
   topic/phase only. All history remains on disk and is authoritative when
   retrieved; it is not a session-start payload.

## Current state

- Production dev flag: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
  `REVIEW_RADAR_PINNED_PLANNING` remains default-off after failing its own
  strategy-overlap criterion.
- R7 readiness gate failed conclusively: two usable broad cache-cold runs each
  scored 1/7 Serper-only normalized-pool recall. R7A is blocked.
- Corrective C1 diagnosed normalization as the dominant loss stage. C2 fixed
  RR-060 and RR-083 with trusted path-only identity and veto-only product-type
  evidence. C3 added default-off/shadow-first merchant-URL recovery; it reuses
  only a safe Serper-supplied URL, makes no extra lookup, and is not promoted.
- Current commit: `551532f` (`add shadow normalization recovery`). Verification:
  C3 focused 71/71; identity/type/source-upgrade wall 207/207; full suite
  891/891 across 127 suites; typecheck/build/offline eval pass; lint 0 errors/
  3 pre-existing warnings. Zero C3 live calls; `.env.local` unchanged.
- Register: 83 total — 78 Fixed, 4 Needs Investigation, 1 Won't Fix, 0 Open.

## Required next decisions — no phase is approved

1. Obtain the deferred Claude review of C1+C2 and the C2+C3 checkpoint, or
   explicitly waive that checkpoint.
2. Ratify/revise the proposed `leaders-v2026-07c` constrained list and matcher.
3. Separately approve C4's six-search window and its exact shadow/flag-on
   sampling design. No prior live approval carries forward.
4. R7A remains separately approval-gated even if C4 later passes.

## Hard boundaries

Do not start C4, R7A, or any other phase; run live searches; promote
`REVIEW_RADAR_NORMALIZATION_RECOVERY`; modify `.env.local`; alter frozen
benchmark versions; start Phase 6E; or commit live fixtures/untracked artifacts
without Taylor's separate explicit approval.

## Retrieval map

| Need | Retrieve |
|---|---|
| Governing sequence or phase acceptance | `docs/forward-roadmap.md` — guardrails + named phase section |
| Peer review/message | `docs/agent-dialogue.md` — protocol + newest relevant entries |
| Issue status or a specific defect | `docs/RR-Issues-Report.md` — summary + RR ID |
| Exact test/trust rationale | `docs/review-radar-test-memory.md` — named phase/issue section |
| Executed verification and live reconciliation | `docs/qa-loop-results.md` — named phase entry |
| Historical completion/handoff | `docs/codex-handoff-phased-plan.md` — named phase record |
| Architecture explanation | `ReviewRadar-Overview.md` — named subsystem/section |
| User-facing change history | `docs/change-log.md` — dated entry |

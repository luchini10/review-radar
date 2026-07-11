# Agent Next Task

Generated: 2026-07-11

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Phase R4's deterministic
implementation is complete (Claude implementation, Codex adversarial closure):
RR-073, RR-074, and RR-075 are Fixed
behind default-off `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`, with flag-off
output proven byte-identical by an exact plan snapshot test. R3's
`REVIEW_RADAR_PINNED_PLANNING` also remains default-off. `.env.local` is
unchanged; neither flag is promoted.

R4 deterministic used zero live calls. Claude's fail-first was 6 intended
flag-on failures, then 12/12. Codex adversarial review added 4 intended
failures at 12/16, then closed the matrix to 16/16. The full suite passed
838/838 across 122 suites.
Typecheck, production build, and offline eval pass (eval clean with the flag
off AND on); lint has 0 errors and 3 existing warnings.

Benchmark proof (robot vacuum / under $300 / self-emptying, flag on): all
leading Shopping queries carry the subtype and the constraint; the diluted
`vacuum` / `cordless vacuum` / `stick vacuum sale` slots are gone; retailer
queries name the full category; the broad query survives at the back of
pass 1. See `tests/constraintAllocation.test.mjs` and
`ReviewRadar-Overview.md` section 28.

The issue register contains 80 issues: 70 Fixed, 9 Needs Investigation,
1 Won't Fix, 0 Open. RR-014/RR-015 remain the top open measurement items.

R2 remains stopped at 4/6; rubric v0.1-draft, leader snapshots, and baseline
values remain unfrozen; Phase 6E remains unauthorized.

## Required next task — Phase R4 live after-sample (separate explicit approval)

Six live searches (~225–280 Serper calls), same shapes and cache-cold protocol
as R2 (three broad `shop vac`, three constrained `robot vacuum` / `under $300`
/ `self-emptying`), run with BOTH flags enabled for the runs
(`REVIEW_RADAR_PINNED_PLANNING=on`, `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`).
This one batch serves three purposes: R4 before/after evidence vs the R2
ledgers, R3 pinning measurement (plan Jaccard), and the deferred RR-061-class
live regression watch.

The batch must:

- verify `searchLedger.rawAi.strategy` is non-null on the FIRST run before
  spending the rest (a rejected pinned `temperature` fails silently to an
  empty AI strategy);
- compare per-run process metrics vs R2: constraint-bearing dispatched
  queries up, wrong-type candidates entering the funnel down, culled
  constraint queries zero, duplicate-budget queries zero;
- restrict stability claims to the A group (3 before vs 3 after); B-side
  claims stay per-run process metrics per the dialogue [7]/[8] agreement;
- apply the R2 safety rule: stop only on an RR-061-class image regression;
  file-and-continue for new unrelated defects (next free ID: RR-081);
- record North-Star values; if constraint compliance, wrong-type count, or
  stability fail to improve, roadmap rule 5 requires a written stop-and-rethink
  before any further phase;
- save fixtures with `r4-after` names; fixtures stay untracked;
- decide flag promotion in `.env.local` ONLY from the before/after evidence,
  as its own explicit step.

## Safety boundary

Do not run the after-sample, enable either flag in `.env.local`, run B2/B3,
freeze R2 values, approve leader snapshots, start R5/R6, or start Phase 6E
without Taylor's separate explicit approval. Do not commit live fixtures or
existing untracked local artifacts.

Reference:

- `docs/forward-roadmap.md`
- `docs/agent-dialogue.md` — read and answer at phase start; append at phase end
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` sections 27–28

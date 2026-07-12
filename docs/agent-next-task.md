# Agent Next Task

Generated: 2026-07-12

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Completed on 2026-07-12:

1. **R4 promoted.** `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on` is set in
   `.env.local` (dev config, not committed). `REVIEW_RADAR_PINNED_PLANNING`
   stays default-off: it failed its own strategy-overlap criterion
   (0.0000 → 0.0196). An initial "attribution by elimination" claim was
   retracted after Codex's adversarial review — downstream stability
   attribution is mixed; RR-015 carries the correction (commit `563baf9`).
2. **Rubric v1.0 + `leaders-v2026-07a`.** The single tested matching contract
   is `coversLeader()` in `scripts/goldBenchmark.mjs` (brand AND line),
   imported by `scripts/qualityScorecard.mjs`, pinned by
   `tests/leaderSnapshot.test.mjs`. Corrected baselines: broad final leader
   recall mean **1.0/7**; constrained **0.33/4 — informational only** (no
   constrained recall target; constraint satisfaction is the constrained
   shape's primary metric). Leader LISTS are provisional pending Taylor's
   human review; per-leader captured-presence citations are in
   `docs/phase-6-market-leader-evaluation.md`.
3. **Phase R5 complete.** RR-060, RR-071, RR-072 are Fixed
   (`lib/productIdentity.ts` + `tests/identityCollapse.test.mjs`):
   spec-conflict guard (generalization proven cross-category with PSI),
   retailer listing-ID canonical key (date-shaped segments excluded), RR-072
   pinned as unreproducible. Trust boundary documented in test memory.

Verification at completion: focused 11/11 + 4/4; full suite **854/854 across
124 suites**; typecheck, lint (0 errors, 3 existing warnings), production
build, and offline eval green. Zero live calls. Register: 81 issues —
**72 Fixed, 8 Needs Investigation, 1 Won't Fix, 0 Open**.

## Required next task — Roadmap R6 (separate explicit approval required)

**R6 — source-brand trust + query hygiene (zero live calls):**
RR-070 (metadata brand must be compatible with the product title or a
recognized alias — no `Bose ILIFE`), RR-077 (no ambiguous abbreviation
prefixed to an exact model — no `DW DEWALT`), RR-076 (editorial seeds must
resemble one discrete product/model; request-local logical dedupe before
dispatch — R2 evidence: 588 seed results, zero unique candidates), RR-081
(no wildcard `site:*.com` domains or repeated identity/category tokens in
AI/rescue queries). Fail-first from the saved ledger evidence; preserve all
trust gates; standard checklist; stop after reporting.

Separately queued for Taylor (no agent may start them unprompted):
- Human review of the provisional leader lists (goldBenchmark is explicitly
  DRAFT; the constrained line lists predate 2026 models).
- The consumer-readiness arc plan (persistence/speed/cost/ops) after R6.

## Safety boundary

Do not start R6, run live searches, modify `.env.local` further, alter the
frozen rubric/snapshot versions (new versions require corrective commits),
start Phase 6E, or commit live fixtures / pre-existing untracked artifacts
without Taylor's separate explicit approval.

Reference:

- `docs/forward-roadmap.md`
- `docs/agent-dialogue.md` — read and answer at phase start; append at phase end
- `docs/phase-6-market-leader-evaluation.md`
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` sections 28–30

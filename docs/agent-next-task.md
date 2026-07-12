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
   `tests/leaderSnapshot.test.mjs`; line phrases require complete token
   boundaries. Provisional M3 observations: broad final leader recall mean
   **1.0/7**; constrained **0.33/4 — informational only** (no
   constrained recall target; constraint satisfaction is the constrained
   shape's primary metric). Leader LISTS and recall values are provisional
   pending Taylor's human review; captured mentions and their limitations are in
   `docs/phase-6-market-leader-evaluation.md`.
3. **Phase R5 corrective closure complete.** RR-060, RR-071, RR-072 are Fixed
   (`lib/productIdentity.ts` + `tests/identityCollapse.test.mjs`):
   spec-conflict guard (generalization proven cross-category with PSI),
   SCFM/CFM equivalence, retailer listing-ID canonical key (date-shaped ids
   require product-route context), RR-072 pinned as unreproducible. RR-082 is
   Fixed for leader line-token prefix false positives. Trust boundaries are
   documented in test memory.
4. **Phase R6 complete.** RR-070/RR-077 source-upgrade metadata brands now
   require title/alias compatibility; RR-076 editorial-seed spend is reduced
   to zero after 588 raw results produced zero unique/final candidates, with
   malformed seed extraction still tightened; RR-081 query hygiene runs at
   the shared Serper boundary before dispatch/cache/body serialization.
5. **R7 readiness plan adopted; zero-cost provenance audit complete.** The
   detailed gate/R7A/R7B/R7C plan now lives in the existing R7 roadmap section
   (no new plan file). Six R4-after fixtures show 22/27 displayed cards directly
   linked to normalized Serper candidate IDs, 1/27 directly AI-only, and four
   lineage-indeterminate at the candidate cap. Manual evidence narrows the
   likely AI-dependent total to 2–3/27. No behavior changed and no live call ran.

R6 verification: focused final **148/148**; full suite **868/868 across 125
suites**; typecheck, lint (0 errors, 3 existing warnings), production build,
and offline eval green. Zero live calls. Register: 82 issues — **77 Fixed, 4
Needs Investigation, 1 Won't Fix, 0 Open** (82 total).

## Required next decisions — no phase is currently approved

R7 cannot start until its readiness gate is satisfied. Taylor's decisions are,
in order:

1. **Ratify or revise the seven broad `shop vac` leaders:** RIDGID (NXT/WD/HD),
   Vacmaster, CRAFTSMAN, DeWALT, Stanley, Shop-Vac, and Milwaukee. Armor All is
   the acceptable alternate. The benchmark remains DRAFT until Taylor states
   his judgment; agents may not ratify it for him.
2. **Separately approve the six-search R7 readiness window:** three cache-cold
   current-behavior `shop vac` runs plus three constrained robot-vacuum runs,
   conservatively ~222–282 Serper calls. This is the R5/R6 rule-5 checkpoint,
   the attributive Serper-only pool gate, and R7B's contemporary flag-off
   control. Any safety failure stops the window.
3. Only if the gate passes, separately approve **R7A** (two commits, zero live):
   pure shared-pipeline refactor first; default-off single-candidate-source
   branch second. R7B live validation and R7C promotion/deletion each require
   later separate approvals.

The consumer-readiness arc remains queued. R7B will supply its first current
latency/cost evidence by measuring the removed final-research stage.

## Safety boundary

Do not start R7A or another phase, run the readiness searches, modify `.env.local` further, alter the
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

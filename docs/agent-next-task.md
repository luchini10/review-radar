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
2. **Rubric v1.0 + `leaders-v2026-07b`.** The single tested matching contract
   is `coversLeader()` in `scripts/goldBenchmark.mjs` (brand AND line),
   imported by `scripts/qualityScorecard.mjs`, pinned by
   `tests/leaderSnapshot.test.mjs`; line phrases require complete token
   boundaries. Historical `07a` M3 observations: broad final leader recall mean
   **1.0/7**; constrained **0.33/4 — informational only** (no
   constrained recall target; constraint satisfaction is the constrained
   shape's primary metric). Taylor delegated broad-list judgment verbatim on
   2026-07-12; current market review replaced Milwaukee with Workshop in the
   seven core leaders and retained Milwaukee as an alternate. Historical `07a`
   observations are not comparable to the `07b` readiness sample.
3. **Phase R5 corrective closure landed.** RR-071 and RR-072 remain Fixed;
   RR-060 was initially closed but the R7 readiness sample reopened it
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
5. **R7 readiness gate attempted and conclusively failed.** The
   detailed gate/R7A/R7B/R7C plan now lives in the existing R7 roadmap section
   (no new plan file). Six R4-after fixtures show 22/27 displayed cards directly
   linked to normalized Serper candidate IDs, 1/27 directly AI-only, and four
   lineage-indeterminate at the candidate cap. The cap was hardened before
   live work. Six requests were dispatched: four usable cache-cold ledgers and
   two spent/excluded harness mistakes. The usable broad runs each scored 1/7
   Serper-only normalized pool recall; even a perfect third run could only
   produce a 3/7 mean, below the 5/7 gate. R7A is blocked. RR-060 reopened and
   RR-083 was filed from the usable fixtures.
6. **Corrective C1 rule-5 diagnosis complete.** A tested offline analyzer now
   separates raw presence, normalization, dedupe, prefilter, merge, and final
   display. Both broad runs remain 1/7 under current `07b` and the prospective
   `07c` line matcher, so benchmark matching did not cause the gate failure.
   Fifteen of 22 leader/run outcomes terminate at normalization. The captured
   RR-060 and RR-083 predicate gaps are specified for fail-first C2 tests.
7. **Corrective C2 safety repair complete.** Trusted product-page URL paths may
   now supply model evidence to exact-model inference only for card-eligible
   products, with same-brand/model and numeric-spec protections unchanged.
   Product-page paths are veto-only product-type evidence, so truncated wrong-
   type titles are rejected without letting URLs positively admit products.
   RR-060 and RR-083 are Fixed deterministically. Taylor explicitly authorized
   Codex to proceed while Claude usage was unavailable; peer review is deferred.

Current verification: C2 focused identity/type/source-upgrade tests **184/184**;
full suite **881/881 across 127 suites**; typecheck/build/offline eval pass;
lint 0 errors/3 existing warnings. Register: 83 issues — **78 Fixed, 4 Needs
Investigation, 1 Won't Fix, 0 Open**.

## Required next decisions — no phase is currently approved

R7A cannot start. C1 and C2 are complete; Taylor's decisions are, in order:

1. **Approve C3 only:** default-off/shadow-first normalization recovery, zero
   live calls. C2's safety pressure is closed deterministically first as
   required. C3 must finish and report before any live request.
2. Obtain the deferred Claude review of C1+C2 when usage returns, and the
   planned C2+C3 checkpoint before asking Taylor for C4 spend. If Claude remains
   unavailable, Taylor must explicitly decide whether to waive that checkpoint.
3. Ratify or revise the proposed `leaders-v2026-07c` constrained list and
   matcher, then separately decide whether to fund C4's six-search window.
4. R7A remains approval-gated even after a future readiness pass.

The consumer-readiness arc remains queued. R7B will supply its first current
latency/cost evidence by measuring the removed final-research stage.

## Safety boundary

Do not start R7A or another phase, run replacement/readiness searches, modify `.env.local` further, alter the
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

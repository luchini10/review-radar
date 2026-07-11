# ReviewRadar Forward Roadmap (R-series)

Adopted 2026-07-10. This document governs all forward sequencing. Completed
history stays in `docs/codex-handoff-phased-plan.md`; the Phase 6 measurement
method remains owned by `docs/phase-6-reliability-gauntlet-plan.md`;
`docs/agent-next-task.md` always points at the current R-phase. No other
forward-plan documents may be created.

## Why this roadmap exists

63 issues have been fixed and the product-level numbers are still failing:
identical searches share zero final products (final-set Jaccard 0), and the
broad-query baseline surfaced 0 of 7 core market leaders. The audit
(`docs/review-radar-search-pipeline-audit.md`, commit be1d9b5) proved the
primary bottleneck at 0.98 confidence: constraint-aware query allocation and
requirement semantics. The Phase A ledger (commits ef7bbc1, abf924d) makes
losses attributable. The remaining risk is sequencing: measurement must serve
the fixes, never replace them.

## The endgame (target architecture)

**One candidate source of truth.** Serper + deterministic code discover,
verify, and select every product. The LLM is strategist (query planning) and
explainer (prose) only — it never introduces candidates that deterministic
code did not discover and verify. A large fraction of the issue register
(wrong images, identity collapses, metadata-brand pollution, citation rescue)
is downstream policing of the second, LLM-sourced candidate stream. Every
R-phase should move toward this endgame or at least not away from it; R7
completes it. When a defect can be fixed either by adding a guard or by
removing a reason the untrusted data exists, prefer removal.

## North-Star metrics

Report these at the end of EVERY phase, from the most recent live sample
(deterministic phases restate the last known values and the expected effect):

1. **Core-leader recall**: how many frozen market leaders appear in the final
   displayed set (target from the frozen rubric; currently 0/7 broad).
2. **Wrong-type products in the final set**: must be 0.
3. **Constraint compliance**: fraction of exact matches that verifiably
   satisfy the user's stated constraints.
4. **Stability**: final-set and candidate-pool Jaccard across same-input runs.

Between live batches, use deterministic proxies: full suite green,
`scripts/eval-pipeline.mjs` red-flag checks, and ledger-based process metrics
(constraint coverage of planned Shopping slots) from tests and saved fixtures.

## Anti-measurement rules (standing law)

1. After R2, no standalone observability/diagnostic/documentation phase may
   run unless it names the specific decision it unblocks. New instruments ride
   inside behavior phases.
2. Every live batch must serve at least two purposes (e.g., verification AND
   before/after sample). State both in the approval request.
3. Every proposed phase must state its expected effect on a North-Star metric.
   "None — infrastructure" is acceptable only for R0 and R1.
4. No new roadmap/plan documents. This file and `docs/agent-next-task.md` are
   the only forward-pointing documents. (`docs/agent-dialogue.md` is a
   communication log, not a plan document.)
5. If two consecutive phases complete with no North-Star metric improving,
   stop and escalate to Taylor with a written diagnosis before any further
   phase.

## Standing guardrails (apply to every phase; do not restate per phase)

- Generalized fixes only — no product-, brand-, or category-specific patches.
- Preserve all price, citation, requirement, product-type, identity, image,
  and eligibility trust gates. Behavior changes ship flag-gated or
  shadow-first, default-off, promoted only with before/after evidence.
- One phase per explicit approval from Taylor. Live spend is approved in
  searches, with the derived Serper estimate stated (~37–47 calls per search).
  Never pool samples across windows. Stop and report after each phase.
- Zero live Serper/OpenAI calls in any phase not explicitly approved as live.
- Docs checklist per phase: `docs/change-log.md`, `docs/qa-loop-results.md`
  (attribution header for the executing agent — Claude: green bold HTML;
  Codex: 🟧), `docs/RR-Issues-Report.md` (full maintenance protocol),
  `docs/codex-handoff-phased-plan.md` (completion record),
  `docs/review-radar-test-memory.md`, `ReviewRadar-Overview.md`,
  `docs/agent-next-task.md` (repoint to next phase). Repo files only — never
  copy anything to `Desktop/RR Markdowns`.
- Commits to `main`, staging only files created/modified by the phase. Never
  `git add -A`. Existing untracked fixtures and local artifacts stay untouched.
- **Agent dialogue:** `docs/agent-dialogue.md` is the standing Claude↔Codex
  channel. At phase start, read it and answer items addressed to you —
  verifying the other agent's claims against the repo before agreeing. At
  phase end, append your questions/objections for the other agent. The channel
  is also used on demand, including during brainstorming before any phase is
  approved: when Taylor says a message is waiting, read and reply (a
  dialogue-only append is a docs-only commit and does not trigger the phase
  checklist). Claims cite `file:line`, fixtures, or commits. The dialogue is
  advisory only: it never authorizes phases, live spend, or commits — Taylor
  remains the sole approver.

---

## Phase R1 — RR-061 generalized wrong-model image fix

**Goal:** unblock live measurement. Deterministic only; zero live calls.
**Scope:** the reproduction is `Saros_Z70_Silver_ID.png` rendered on a
Roborock Q5 Max+ card — page/title context outweighed an explicit conflicting
model token in the image path. Fail-first tests distilled from the saved live
fixtures, then a generalized conflicting-image-model guard in the shared image
resolver: when the image path/filename carries a recognizable model identity
that conflicts with the product's model, the image is rejected or downgraded
below High confidence, using normalized model-token detection.
Preserve valid same-model images, opaque/hashed CDN assets, Google Shopping
thumbnails, and the existing navigation/flyout safeguards. Also add the small
missing ledger test: inject a canary API-key value and assert it never appears
in the serialized ledger snapshot.
**Non-goals:** RR-070 through RR-077; any search/ranking behavior.
**Acceptance:** fail-first tests flip green; full suite, typecheck, lint,
build, eval green; RR-061 → Fixed with deterministic regression.
**North-Star effect:** none (infrastructure/safety); removes the live-run
abort risk that killed the last two windows at 1/6 and 2/6.

## Phase R2 — Live ledger verification + frozen baseline (completes Phase 6D)

**Live budget:** six searches (~225–280 Serper calls). This phase IS the
Phase 6D variance-pilot restart AND the "before" baseline for R3/R4. Dual
purpose satisfied.
**Protocol:** three broad `shop vac` runs and three constrained
`robot vacuum` / `under $300` / `self-emptying` runs, identical inputs within
each group, dev server restarted (cache cold) before every run, debug header
on, every payload saved via `npm run qa:save-fixture` with `ledger-run` names
(fixtures stay untracked). Record the commit hash; commit-pinned window.
**Safety rule:** an RR-061-class regression (wrong-model/navigation image at
High confidence) stops the phase — the fix failed. Any NEW unrelated defect:
file it with the next RR ID, save the fixture, continue.
**Report:** reconciliation (logical/cache/physical/retries/fallbacks);
planned-but-culled queries with reasons — especially constraint-bearing
queries crowded out by protected generic slots; per-query and per-origin
contribution; first-loss stages; variance within each group split into
plan-differences vs provider-differences using the retained raw strategy JSON;
whether the strategy/gap-check calls pin temperature or seed anywhere
(RR-015 attribution); RR-037 and RR-045 evidence updates. Caveat for the
reader: `candidate_merge` losses can be inflated by URL/name mismatches in
lineage matching — cross-check against near-identical names in final sets.
**Freeze:** per the 6D exit criteria, freeze rubric v1.0 and compile the
dated market-leader snapshots. Record baseline North-Star values. The full
6E 12–15-search baseline is NOT authorized by this roadmap; Taylor decides at
R2 exit whether R2+R4 samples suffice (default: they do).
**North-Star effect:** establishes the measured baseline for all four metrics.

## Phase R3 — Strategy-call determinism (small)

**Goal:** stop paying variance tax on every future comparison. Zero live.
**Scope:** informed by R2's pinning check — set temperature/seed (or the
API-supported equivalents) on the strategy and gap-check helper calls,
flag-gated `REVIEW_RADAR_PINNED_PLANNING=on`. Deterministic tests assert the
parameters are actually sent when the flag is on and absent when off.
**Validation:** no dedicated live batch. R4's after-sample measures the
effect: plan Jaccard (pinning) is separable in the ledger from slot
composition (allocation), so one shared sample attributes both.
**North-Star effect:** stability (metric 4) expected to rise materially.

## Phase R4 — Constraint-preserving query allocation + requirement strength
(THE proven fix — audit #1 and #2, RR-073/074/075)

**Goal:** the user's constraints shape the search. Flag-gated
`REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`, default off, snapshot-identical when
off.
**Scope:** (a) rank initial Shopping-slot allocation by shopper-constraint
coverage — no generic synonym-expansion query may hold a protected slot ahead
of a constraint-bearing query (RR-075 generalized: subtype-carrying categories
must not be diluted by parent-category synonyms); (b) preserve ambiguous
Important Details (`Needs review`) as search-recall phrases even when they are
not hard filters, and introduce an explicit hard-vs-preferred strength on
Important Details carried consistently from extraction through search,
validation, and final selection (RR-073); (c) fix duplicate budget wording in
query construction (RR-074). Same Serper budget — reallocation, not expansion.
**Deterministic acceptance:** for the benchmark constrained shape, ≥3 of 5
initial Shopping queries carry the constraint; flags-off snapshots unchanged;
fail-first tests for RR-073/074/075.
**Live after-sample:** six searches, same shapes and protocol as R2 (second
purpose: validates R3 pinning). Ledger before/after vs R2: constraint-bearing
dispatched queries up, wrong-type candidates down, culled constraint queries
zero; North-Star metrics 1–3 not worse, expected up.
**Promotion:** flag on in `.env.local` only with the evidence; revert path is
the flag.

## Phase R5 — Downstream false negatives (audit #3, RR-071/RR-072)

Zero live. (a) Identity-collapse guard: two candidates whose numeric specs or
canonical URLs conflict must not exact-collapse (Vacmaster 5.5HP vs 5HP stay
distinct; true retailer duplicates still collapse). (b) Product-type
false-rejection: a candidate whose own title asserts the requested type must
not be rejected `wrong_category` (RIDGID HD0900 "Wet Dry Vac" stays eligible);
log prefilter subreasons before adjusting logic. Fail-first fixtures for both.
Validated live by riding the next approved batch.
**North-Star effect:** core-leader recall (metric 1) up — these losses
currently remove real leaders.

## Phase R6 — Source-brand trust + seed precision (audit #4/#5, RR-070/076/077)

Zero live; gated on R2/R4 contribution data (rule 3). (a) Metadata brand is
used only when compatible with the product title or a recognized alias — no
`Bose ILIFE A12 Pro`, no `DW DEWALT` (RR-070, RR-077). (b) Editorial seeds
must resemble one discrete product/model; request-local logical dedupe before
dispatch (RR-076) — only if contribution data shows seeds' recall value
justifies their cost, otherwise reduce their budget instead.
**North-Star effect:** metrics 2–3 via cleaner rescue/upgrade evidence; frees
wasted Serper spend.

## Phase R7 — Architecture consolidation (the endgame; separate detailed plan)

Retire the second candidate stream: the final research call consumes the
verified candidate set and writes prose/explanations only; discovery gaps are
served by executing the strategist's queries through Serper (which R4 makes
constraint-faithful), not by LLM-introduced products. Then delete or simplify
the policing layers that become unreachable, with regression coverage proving
each removal safe. Requires its own plan and approval; do not start from this
document. Gate: North-Star trend from R2→R6 confirms the deterministic
pipeline finds leaders on its own.
**North-Star effect:** stability and wrong-type structurally; large
maintenance reduction.

## Backlog (enters a phase only with evidence + Taylor's approval)

Phase 3P/3Q source-upgrade items; RR-014/RR-015 aggregate measurement beyond
R2's attribution; full 6E baseline; latency/cost reduction (do not optimize
while results are unstable — revisit after R4); provider alternatives
(blocked until provider-vs-parser losses are separated by R2).

## Kickoff prompts (Taylor fires one at a time)

- R1: `Execute Phase R1 per docs/forward-roadmap.md. Deterministic only; stop after reporting.`
- R2: `Execute Phase R2 per docs/forward-roadmap.md. This message is my explicit approval for six live searches (~225–280 Serper calls). Stop after reporting.`
- R3: `Execute Phase R3 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`
- R4: `Execute Phase R4 per docs/forward-roadmap.md. Deterministic portion first; then this message is my explicit approval for the six-search after-sample (~225–280 Serper calls). Stop after reporting.`
- R5: `Execute Phase R5 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`
- R6: `Execute Phase R6 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`

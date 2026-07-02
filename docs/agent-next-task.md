# Agent Next Task

Generated: 2026-07-01

## Current next task

**Phase 6B complete - Phase 6C patch audit requires explicit instruction**

Phase 6B created `docs/phase-6-regression-wall.md` and mapped every issue from RR-007 through RR-068 to deterministic protection, measurement-only status, provider variance, historical/docs guards, or accepted compatibility behavior.

The sole Phase 6 program source of truth is `docs/phase-6-reliability-gauntlet-plan.md`. Supporting scorecard, batch, wall, audit, benchmark, and report documents implement that master and cannot override its scope, sequencing, budgets, gates, or completion criteria.

The wall contains 62 issues:

- 57 Fixed;
- 4 Needs Investigation;
- 1 Won't Fix.

Two direct deterministic test gaps were closed without production changes:

- RR-012 now directly verifies shopper-friendly schema availability labels.
- RR-025 now directly verifies that `afterRequirementFilter` retains near-match names.

RR-014 and RR-015 remain measurement-only. RR-037 and RR-045 remain provider-variance-bound. No deterministic behavior blocker was found.

The canonical register contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

RR-014, RR-015, RR-037, and RR-045 intentionally remain Needs Investigation. Deterministic green tests do not close those aggregate or provider-bound questions.

Verification passed: focused additions 22/22; typecheck; lint with 0 errors and 3 existing warnings; 782/782 tests across 117 suites; eval with no red flags. Live calls: 0.

## Required next task

Do not start automatically. Await a separate instruction for **Phase 6C patch audit only**.

Phase 6C should audit the accumulated patch set against the canonical plan and regression wall. Do not begin the Phase 6D variance pilot, rubric freeze, live baseline, dossier analysis, or fixes.

Do not:

- start Phase 6C or any later sub-phase without explicit approval;
- change the v0.1-draft rubric or provisional thresholds without recording a versioned rationale;
- implement proposed trace additions or automation from the scorecard document without approval;
- alter the completed RR-068, RR-061, or RR-054 behavior without a proven regression;
- change ranking, discovery breadth, final selection, price, citation, source-upgrade behavior, or any app behavior during regression-wall work;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run a live search or full baseline without approval.

Reference:

- `docs/phase-6-reliability-gauntlet-plan.md`
- `docs/phase-6-scorecard-template.md`
- `docs/phase-6-live-search-batches.md`
- `docs/phase-6-regression-wall.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 6B entry

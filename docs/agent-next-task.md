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

## Master-plan amendment notice - 2026-07-01 (Claude, docs-only)

`docs/phase-6-reliability-gauntlet-plan.md` was amended after Phase 6B closed.
Read the amended master plan before starting Phase 6C. Seven changes, none of
which alter Phase 6C scope, the v0.1-draft rubric content, budgets totals,
gates, or any issue status:

1. **Execution-state header corrected.** The plan header claimed Phase 6B still
   required instruction after 6B was already committed. It now reads "Phases 6A
   and 6B complete; Phase 6C patch audit requires explicit instruction." A
   standing rule was added at the end of the plan: every completed sub-phase
   must update the plan's Status/Execution-state header in the same commit — a
   stale header in the sole source of truth is itself a
   documentation-consistency defect. A Phase 6B status block citing commits
   `e2f3cf3` and `e6c32af` was added to the roadmap.
2. **Leader snapshots moved to the 6D freeze point.** The market-leader
   evaluation method doc and the initial dated leader snapshots were listed as
   Phase 6E artifacts — the same phase that consumes them as baseline truth.
   They are now freeze-point deliverables (after the variance pilot, before any
   baseline search runs), so measurement targets are fixed before the phase
   that measures against them. Section 7 freeze checklist, the section 24
   artifact table, and the 6D exit criteria were updated to match.
3. **Budget units disambiguated.** The section 13 budget table previously
   counted "live calls" while the cost note counted ~47 Serper calls per
   search. The table now counts "live searches" (one unit = one end-to-end
   pipeline run), with derived Serper estimates stated: pilot 6 searches ≈ 280
   Serper calls; first baseline 12-15 searches ≈ 565-705 Serper calls.
   Approvals are given in searches; costs are reported in Serper calls.
4. **Variance-pilot queries pinned, RR-037 now owned by 6D.** The pilot's broad
   query is `shop vac` x3, so the repeat-run candidate-pool overlap directly
   measures RR-037's RIDGID pool variance at no extra cost. The constrained
   query must overlap an existing saved fixture and the planned core set (for
   example the saved robot-vacuum-under-300-self-emptying shape). Pilot
   fixtures are saved and may be retro-scored under frozen rubric v1.0 as
   baseline evidence for those two queries. RR-037 was added to the 6D
   deliverables and exit criteria.
5. **RR-045 now owned by 6E.** One designated fresh baseline search must probe
   Tapo raw provider coverage and record raw provider counts, so RR-045 is
   updated from evidence rather than lingering unowned until 6H.
6. **Variance-source attribution added to 6D metrics.** Where traces allow,
   overlap loss must be split between provider-result differences (different
   raw candidates returned) and plan/selection differences (same candidates,
   different LLM planning or selection outcomes), plus a recorded check on
   whether the pipeline pins LLM temperature/seed anywhere it matters. This
   attribution decides whether RR-015 is fixable (pin/seed the model side) or
   manageable-only (provider-inherent), which determines what the 6G fix loop
   should target.
7. **Metric-mapping ownership stated.** Section 8.3 now records that
   `docs/phase-6-scorecard-template.md` owns the binding High-impact vs
   Medium-impact classification for the deduction formula; the master plan
   intentionally does not duplicate that mapping.

The Desktop copy of the master plan was deleted and replaced with a shortcut to
the repository file; the repo file is the only copy.

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

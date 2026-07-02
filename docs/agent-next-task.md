# Agent Next Task

Generated: 2026-07-02

## Current next task

**Phase 6C complete - Phase 6D variance pilot requires explicit instruction**

Phase 6C created `docs/phase-6-product-specific-patch-audit.md` after auditing all 61 tracked production TypeScript/JavaScript files.

The sole Phase 6 program source of truth is `docs/phase-6-reliability-gauntlet-plan.md`. Supporting scorecard, batch, wall, audit, benchmark, and report documents implement that master and cannot override its scope, sequencing, budgets, gates, or completion criteria.

Phase 6C verdict: **PASS WITH WATCH ITEMS**.

- 5 finding groups are acceptable generalized data.
- 4 finding groups are acceptable source/category rules.
- 1 finding group is suspicious but non-behavioral comments/examples.
- 0 must-generalize blockers were found.

Watch items are maintenance risks, not current defects:

- duplicated retailer/product-page route knowledge can drift across defensive pipeline boundaries;
- the `HP` brand/unit collision should remain centralized;
- named cross-brand floor-cleaner family terms should remain shared taxonomy data, not become a product denylist.

No production code, test, script, fixture, baseline, app/API/UI behavior, ranking, discovery, identity, price, citation, eligibility, source-upgrade, product-type, requirement, or final-selection behavior changed. Live calls: 0.

The canonical register contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

RR-014, RR-015, RR-037, and RR-045 intentionally remain Needs Investigation. RR-037 belongs to the Phase 6D pilot; RR-045 belongs to Phase 6E.

Verification passed: typecheck; lint with 0 errors and 3 existing warnings; 782/782 tests across 117 suites; eval with no red flags.

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

Do not start automatically. Await a separate instruction and approved six-search budget for **Phase 6D variance pilot only**.

Phase 6D is the first live Phase 6 step. Its fixed design is `shop vac` repeated three times plus one approved fixture-overlapping constrained query repeated three times. Report the estimated ~280 Serper calls before execution. Do not begin the Phase 6E baseline, dossier analysis, or fixes.

Do not:

- start Phase 6D or any later sub-phase without explicit approval and the exact constrained query;
- change the v0.1-draft rubric or provisional thresholds without recording a versioned rationale;
- implement proposed trace additions or automation from the scorecard document without approval;
- alter the completed RR-068, RR-061, or RR-054 behavior without a proven regression;
- change ranking, discovery breadth, final selection, price, citation, source-upgrade behavior, or any app behavior during the variance pilot;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run a live search or full baseline without approval.

Reference:

- `docs/phase-6-reliability-gauntlet-plan.md`
- `docs/phase-6-scorecard-template.md`
- `docs/phase-6-live-search-batches.md`
- `docs/phase-6-regression-wall.md`
- `docs/phase-6-product-specific-patch-audit.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 6C entry

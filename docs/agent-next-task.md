# Agent Next Task

Generated: 2026-07-02

## Current next task

**RR-061 fixed deterministically - Phase 6D remains stopped**

Taylor approved six new post-RR-069 variance calls and explicitly excluded the
earlier four pre-fix fixtures from the clean sample. The restart stopped after
its first `shop vac` call because two different Amazon product cards received
the same generic `yoda/flyout_72dpi` navigation asset as High-confidence
product imagery. This is a live RR-061 regression and an absolute Phase 6
image-safety stop.

The narrow RR-061 phase fixed both image-only causes without resuming live
measurement:

- generalized flyout/menu/department/layout/masthead image paths are rejected;
- image relevance no longer treats retailer/source/domain words or the image
  hostname as product identity;
- the exact live URL is rejected for both captured product names;
- verified same-product Amazon and opaque hashed CDN images remain valid;
- rejected suspicious images leave the product image empty.

`docs/phase-6-variance-pilot.md` preserves both attempts:

- the original 4/6 sample is labeled aborted pre-fix RR-069 evidence and is not
  part of clean variance measurement;
- clean restart A1 used the exact broad request shape and debug mode;
- A1 returned 4 exact and 2 near products from 20 candidates in 83.219 seconds
  with 37 executed Serper queries;
- no pairwise overlap, rank correlation, stage-loss variation, significance
  rule, or provider/model attribution can be estimated from one clean run;
- RR-015 and RR-037 remain Needs Investigation.

The clean restart spent 1/6 approved calls; five remain unspent and blocked
because the stopped execution window is not reusable.
Rubric v1.0 was not frozen, leader snapshots were not compiled, and Phase 6E
did not start.

The canonical register now contains 69 issues:

- 10 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 64 Fixed, 1 Won't Fix.

RR-061 and RR-069 are Fixed. RR-014, RR-015, RR-037, and RR-045 remain Needs
Investigation.

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

Do not start automatically. Human-review the deterministic RR-061 fix, then
request a fresh explicit six-search approval before attempting another clean
Phase 6D restart. Do not spend the five calls left from the stopped window.
Do not start Phase 6E until Phase 6D completes safely and the freeze package is
explicitly approved.

Do not:

- resume Phase 6D or start any later sub-phase without a separate explicit approval;
- reopen RR-069 without a deterministic regression;
- change the v0.1-draft rubric or provisional thresholds without recording a versioned rationale;
- implement proposed trace additions or automation from the scorecard document without approval;
- alter completed RR-054/RR-061/RR-068 behavior without a new deterministic regression;
- change ranking, discovery breadth, final selection, price, citation, source-upgrade behavior, or any app behavior during the variance pilot;
- weaken RR-063 through RR-067 source-derived identity rules;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval;
- freeze rubric v1.0 or approve leader snapshots before a clean Phase 6D completion.

Reference:

- `docs/phase-6-reliability-gauntlet-plan.md`
- `docs/phase-6-scorecard-template.md`
- `docs/phase-6-live-search-batches.md`
- `docs/phase-6-regression-wall.md`
- `docs/phase-6-product-specific-patch-audit.md`
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-061 entry

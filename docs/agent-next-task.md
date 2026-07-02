# Agent Next Task

Generated: 2026-07-01

## Current next task

**Phase 6A complete and reconciled - Phase 6B regression wall requires explicit instruction**

Phase 6A created the reliability scorecard v0.1-draft and live-search batch/fixture policy. The instrument is documentation only: no live search, behavior change, executable script change, issue fix, or Phase 6B work ran.

The post-6A reconciliation retained all completed artifacts and made four policies canonical:

- safety tolerance is absolute at zero failures and is not calibrated;
- `NotApplicable` is distinct from missing `NotScored` evidence;
- the auditable High/Medium deduction formula remains the canonical v0.1 draft;
- leader-quality targets must be approved after Phase 6D and before Phase 6E, not after reading baseline results.

The two required historical fixture examples were scored from `qa:replay` output as M3 evidence:

- `shop-vac.json`: quality 65, grade C, incomplete safety/high-impact evidence;
- `gas-grill.json`: quality 69, final grade F because the recorded exact slate included a camping stove.

These are historical instrument examples, not current-code findings. Missing fields are `NotScored` and listed as proposed trace/automation work needing approval.

The canonical register contains 68 issues:

- 9 Critical, 29 High, 25 Medium, 5 Low;
- 0 Open, 4 Needs Investigation, 63 Fixed, 1 Won't Fix.

RR-014, RR-015, RR-037, and RR-045 intentionally remain Needs Investigation. They concern leader coverage, stability, or live provider variance and are not Phase 5 blockers.

Verification passed: typecheck; lint with 0 errors and 3 existing warnings; 781/781 tests across 117 suites; eval with no red flags.

## Required next task

Do not start automatically. Await a separate instruction for **Phase 6B regression wall only**.

Phase 6B is zero-live work: map RR-007 through RR-068 to existing deterministic tests/fixtures and identify or close mapping gaps with distilled regression fixtures and tests under the master plan. Do not begin the Phase 6C patch audit, Phase 6D variance pilot, rubric freeze, or live baseline.

Do not:

- start Phase 6B or any later sub-phase without explicit approval;
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
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5 closeout entry

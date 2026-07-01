# Agent Next Task

Generated: 2026-07-01

## Current next task

**RR-067 fixed - Phase 5J awaits explicit instruction**

RR-067 is Fixed in implementation commit `025afcb`.

Candidate-side ambiguous `HP` metadata no longer overrides stronger source-derived product identity. Horsepower/spec syntax is treated as measurement evidence; genuine HP and Hewlett-Packard products remain supported.

The exact HART VOC1212PW case and seven unrelated brand controls pass deterministically. Genuine HP LaserJet evidence attaches, while source-derived Dell conflict evidence remains rejected despite polluted HP metadata.

One focused `shop vac` run did not reproduce HART. It did safely attach exact RIDGID WD3050 evidence containing `3.5-Peak HP`; nearby WD3050A and unrelated candidates remained rejected. RR-041/RR-042 behavior and RR-063 through RR-066 safety remain green.

The canonical register now contains 67 issues:

- 9 Critical, 28 High, 25 Medium, 5 Low;
- 2 Open, 4 Needs Investigation, 60 Fixed, 1 Won't Fix.

## Required next phase

Do not start automatically. The next task, only after explicit instruction, is:

**Phase 5J asset quality and diagnostics**

Follow the master Phase 5 plan for RR-061 and RR-054 only. Diagnose before editing, preserve all completed product-card, evidence-identity, source-upgrade, price, ranking, type, and requirement protections, and stop after Phase 5J.

Do not:

- start Phase 5J without explicit instruction;
- change the completed RR-041/RR-042 trigger/fallback or RR-067 brand/unit behavior;
- weaken RR-063/RR-064/RR-065/RR-066 source-derived identity rules;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest RR-067 cleanup entry

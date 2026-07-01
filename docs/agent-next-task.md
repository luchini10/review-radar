# Agent Next Task

Generated: 2026-06-30

## Current next task

**Phase 5I complete - address RR-067 before Phase 5J**

Phase 5I is implemented in commit `57f1a69`.

RR-041 is Fixed. A model-qualified, requirement-passing candidate now receives an upgrade opportunity when it is missing at least two of verified price, owner rating, and identity-safe product-specific commerce evidence. One weak or generic evidence signal cannot suppress an otherwise weak candidate.

RR-042 is Fixed. The existing zero-result fallback remains, and one bounded fallback may also run when a nonempty primary candidate set is entirely rejected by same-product identity. No fallback runs after an identity match, and primary/fallback candidates pass the same RR-063 through RR-066 safety gate.

The single `shop vac` proof safely attached exact RIDGID WD1060 and DEWALT DXV09P evidence. A HART VOC1212PW fallback returned an exact-looking model candidate but safely rejected it because provider metadata mislabeled horsepower `HP` as a brand. That false-negative is RR-067; no unsafe evidence attached.

The canonical register now contains 67 issues:

- 9 Critical, 28 High, 25 Medium, 5 Low;
- 3 Open, 4 Needs Investigation, 59 Fixed, 1 Won't Fix.

## Required next phase

Do not start automatically. The next task, only after explicit instruction, is:

**Narrow RR-067 candidate-side horsepower-brand normalization**

Reuse the existing measurement-aware brand logic when considering explicit candidate metadata. Prove that HART `VOC1212PW` evidence is not rejected merely because `Peak HP` was parsed as Hewlett-Packard, while genuine HP computer products and explicit conflicting brands remain protected.

Do not:

- start Phase 5J;
- change the completed RR-041/RR-042 trigger or fallback behavior;
- weaken RR-063/RR-064/RR-065/RR-066 source-derived identity rules;
- change Phase 5H final-selection calibration;
- loosen source-upgrade identity to improve attachment rate;
- weaken price, citation, product, requirement, product-type, or identity trust gates;
- run another live search or full baseline without approval.

Reference:

- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` latest Phase 5I retry entry

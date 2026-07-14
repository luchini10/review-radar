# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the post-C5 safety-boundary repair.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the C5 live result and post-C5 safety closure in
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [37] onward unless an earlier claim
   needs verification.
5. Retrieve older metrics or defects by exact RR ID only.

## Current state

- Code commit `25bc313` closes the post-C5 RR-078/RR-090 safety boundary.
- C5 live validation remains failed: five usable runs missed the frozen broad
  pool/final floors (`4.5/7` and `2.0/7` means), while the constrained runs
  reached `3/4` final recall with zero exact hard-constraint failures.
- RR-078 is Fixed again. The shared eligibility classifier rejects titles that
  combine news with information/specification framing as editorial even on a
  product-shaped URL; the page remains evidence-eligible. Ordinary manufacturer
  product-information/specification pages remain card-eligible.
- RR-090 is Fixed. The fixture proves the independent Q10 candidate was lost at
  `candidate_merge`. Adjacent short model components were discarded (`Q7 M5`
  versus `Q10 X5`), so generic category wording could merge different models
  and graft Q10 evidence onto the Q7 card.
- A shared compound-model identity primitive now blocks that conflict in
  candidate merge, product-asset enrichment, and final product-page selection.
  Same compound models still merge across retailers; a matching Q7 citation is
  retained and a wrong-only Q10 destination is cleared.
- No live Serper/OpenAI call, flag promotion, `.env.local` edit, R7A work,
  threshold change, or fixture write occurred. Register: 90 total / 85 Fixed /
  4 Needs Investigation / 1 Won't Fix.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: unset/default-off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unset/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unset/default-off.
- `.env.local` was not modified in this phase.

## Latest verification and evidence

- Fail-first reproduced four safety paths: the Matter Alpha editorial-card
  admission, Q7/Q10 merge, wrong-page asset enrichment, and wrong final URL.
- Focused final: 77/77 across the eligibility, merge, asset, and URL suites.
- Full wall: 943/943 tests across 129 suites.
- Typecheck and production build pass. Offline evaluation reports no red flags;
  lint is 0 errors / 3 pre-existing warnings.
- Runtime evidence remains the untracked constrained C5 run1 fixture. No saved
  fixture was modified or staged.
- Latest live North Stars are unchanged: broad pool/final means `4.5/7` and
  `2.0/7` from two usable broad runs; constrained final recall `3/4` in all
  three runs; exact hard-constraint failures 0; broad pool/final Jaccard
  `0.3889`/`0.0000`; constrained `0.2566`/`0.0513`.

## Next task — approval pending

Do **not** repeat C5 or start R7A. Closing RR-078/RR-090 removes safety blockers
but does not improve the failed broad recall gate. The recommended next phase
is one **zero-live architecture decision checkpoint**:

1. Compare the current dual AI+Serper pipeline, the roadmap's Serper-only R7
   endgame, and a safer hybrid in which the model may propose candidate-name
   hypotheses but cannot author card facts, URLs, prices, citations, or
   eligibility.
2. Use the existing C4/C5 fixtures and frozen leaders to identify which design
   can recover missed leaders, preserve SERP priority, and keep every displayed
   card independently materialized through Serper plus deterministic trust
   gates.
3. Define the smallest reversible prototype and a kill condition before any
   behavior code or new live spend. If the evidence does not show a stronger
   design than the current roadmap, keep the Serper-only endgame.
4. Amend only this roadmap with the chosen phased path; do not create another
   plan document. Stop for Taylor's approval before implementation.

Expected decision: whether ReviewRadar should continue toward deterministic
Serper-only discovery or adopt verified model-guided candidate hypotheses to
gain ChatGPT-like recall without reopening unsafe product-card authorship.

**Recommended reasoning level: Highest.** This checkpoint may change the target
architecture and must reconcile recall, provenance, identity safety, cost, and
maintainability; shallow implementation planning would lock in the wrong
bottleneck.

## Hard boundaries

- No live Serper/OpenAI calls without Taylor's explicit new per-phase approval.
  No prior search approval remains available.
- No flag promotion, `.env.local` edit, R7A work, deployment, replacement
  request, cap/threshold change, or behavior prototype without separate
  approval.
- Preserve every price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, URL, source-quality, and hard-constraint trust gate.
- Generalized fixes only; no product, brand, host, retailer, model, query, or
  fixture-specific production exception.
- RR-061-class image regression stops any later live window. New unrelated
  defects are filed and handled under that future window's approved rules.
- Live fixtures and pre-existing untracked artifacts remain untracked. Stage
  only approved-phase files; never use `git add -A`.
- One phase per explicit approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [37] asks Claude to verify the RR-090 first-mutation claim,
  the compound-model preservation boundary, the RR-078 editorial semantics,
  and the recommendation to reconsider architecture before R7A.
- No peer review is authorization. Taylor remains the sole approver for the
  architecture checkpoint, implementation, live spend, or flag promotion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current next decision | this file and latest C5 roadmap block |
| Canonical phase evidence | latest entry in `docs/qa-loop-results.md` |
| Full C5 live metrics and queries | `docs/phase-6-market-leader-evaluation.md` C5 section |
| Editorial-card defect | RR-078 |
| Cross-model URL/metadata defect | RR-090 |
| Runtime evidence | untracked constrained C5 run1 fixture |
| Compound-model contract | `lib/productIdentity.ts` and focused tests |
| Peer review | `docs/agent-dialogue.md` entry [37] onward |

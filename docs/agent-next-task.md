# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the post-C4 deterministic safety repair.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read only the relevant section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` only from entry [29] onward unless an exact
   earlier topic is needed.
5. Retrieve other history by exact RR ID or topic only.

## Current state

- Corrective C4 remains a failed, safety-stopped live phase. Four of six
  approved requests completed; B2/B3 were intentionally not dispatched. The
  four usable fixtures spent 227 physical Serper attempts with zero retries,
  fallbacks, or guard trips.
- All seven broad leaders were raw-present in all three broad runs, while
  normalized-pool and final recall both averaged 1.33/7. Flag-off and flag-on
  normalized coverage were identical with zero recovery opportunities.
  Normalization recovery remains default-off and R7A remains blocked.
- The three C4 safety findings are fixed deterministically with zero live calls:
  RR-061 evaluates the complete image filename model-claim set; RR-060
  deduplicates exact and near final streams under the unchanged exact-model
  predicate; RR-084 hard-vetoes a positively recognized different product
  class after enrichment while preserving sparse valid requested types. The
  phase commit is the commit containing this regenerated handoff.
- Offline C4-card replay rejects `Q10-S5` for foreign `s5`, removes the Amazon
  `18P03` near duplicate in favor of the manufacturer card, and hard-fails the
  KitchenAid ice maker's robot-vacuum Category. The Lowes Garage Pro card is not
  claimed duplicate because its captured evidence does not prove `18P03`.
- Issue register: 84 total / 79 Fixed / 4 Needs Investigation / 1 Won't Fix.
  Remaining Needs Investigation: RR-014, RR-015, RR-037, and RR-045.
- Dev flag state is unchanged: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`;
  `REVIEW_RADAR_PINNED_PLANNING` off; `REVIEW_RADAR_NORMALIZATION_RECOVERY`
  unpromoted/default-off. `.env.local` was not modified.

## Next task — approval pending

No implementation or live phase is approved. The recommended next step is a
zero-live C5 diagnosis/design pass focused on the normalization boundary that
C4 actually measured:

1. Use the three saved broad C4 ledgers to classify every raw-present leader's
   normalization loss by exact runtime input shape, provider URL fields, and
   rejection subreason. Separate genuinely unsafe search/listing pages from
   specific product identities stranded behind provider-owned result URLs.
2. Determine whether one conservative generalized normalization rule can
   recover a material share without weakening product-page eligibility,
   identity, product-type, image, citation, or requirement trust gates. Stop
   with a written no-build conclusion if the evidence does not support one.
3. If a rule is justified, specify fail-first fixtures, default-off/shadow
   instrumentation, preservation controls, and a promotion gate before asking
   Taylor for a separate implementation phase. Do not buy another live window
   or revive R7A merely because the three safety defects are fixed.

This is the cheapest evidence-backed path: C4 proved provider discovery is not
the broad-leader bottleneck and proved the existing alternate-merchant recovery
branch has zero opportunity on these losses. The next design must target the
observed normalizer rejection shapes, not add another search source.

## Hard boundaries

- Zero live Serper/OpenAI calls without Taylor's explicit per-phase search
  approval and planning basis.
- No flag promotion, `.env.local` edit, C5 implementation, R7A work, deployment,
  or new live window without separate explicit approval.
- Preserve price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, and hard-constraint trust gates.
- Generalized fail-first fixes only; no product, brand, retailer, model, or
  fixture-specific exception.
- Live C4 fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only files owned by an approved phase; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Latest verification

- Fail-first focused: 102/105, exactly three intended failures.
- Focused final: 132/132 across 11 suites.
- Full unit suite: 911/911 across 127 suites.
- Typecheck: pass.
- Production build: pass.
- Lint: 0 errors / 3 pre-existing warnings.
- Offline evaluation: no red flags.
- Live calls in the safety-repair phase: 0.

## Outstanding peer-review debt

Dialogue entry [29] asks Claude to adversarially verify the three repairs and
the proposed C5 direction when available. That review is advisory and does not
authorize work. No C5 phase or spend should begin from a dialogue reply alone.

## Retrieval map

| Need | Retrieve |
|---|---|
| C4 result / C5 gate | `docs/forward-roadmap.md` corrective C4/C5 section |
| Safety-repair peer review | `docs/agent-dialogue.md` entry [29] onward |
| Active defects | `docs/RR-Issues-Report.md` RR-014, RR-015, RR-037, RR-045 |
| Repaired safety contracts | `docs/RR-Issues-Report.md` RR-060, RR-061, RR-084 |
| Frozen recall evidence | `docs/phase-6-market-leader-evaluation.md` C4 section |
| Trust rationale | `docs/review-radar-test-memory.md` latest entry |
| Verification | `docs/qa-loop-results.md` latest entry |
| Change history | `docs/change-log.md` 2026-07-14 entries |

# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the zero-live C5 bounded organic
identity-resolution implementation.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read only the corrective C5 and R7 sections of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [33] onward unless an earlier
   claim needs verification.
5. Retrieve other history by exact phase, RR ID, or metric only.

## Current state

- Commit `eaeb577` implements the approved C5 resolver behind
  `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION=off`. It adds one bounded stage
  after initial plus gap-check Serper discovery and before final OpenAI
  research. No live call, promotion, `.env.local` edit, deployment, or R7A
  work occurred.
- Only a model-specific, type-exact, product-eligible structured Shopping
  identity can become an internal resolution lead. A lead is removed when the
  pool already contains a safe page or enabled merchant-URL recovery can
  materialize one. Generic and ambiguous identities remain unresolved.
- When enabled, the resolver deduplicates eligible identities, dispatches at
  most four organic `"<identity> product page"` queries request-wide, and does
  not issue Shopping resolution queries. Results pass the existing organic
  normalizer, cheap prefilter, requested-type classifier, product-eligibility
  gate, and shared product-page identity selector before entering the pool.
- Flag-off behavior dispatches no resolution lookup and returns the original
  Serper result object. Debug ledgers can show would-run queries as culled,
  including exact cap and flag-off reasons.
- The full offline wall passes: 934/934 tests across 129 suites. Focused
  resolution/trust tests pass 104/104; typecheck, production build, and offline
  evaluation pass; lint reports 0 errors/3 pre-existing warnings.
- This is implemented behavior, not live proof. The prior C5 probe projected
  `5/7` safe broad-pool materialization in each saved C4 run, exactly at the
  frozen floor. It did not measure final recall, constraints, stability,
  images, price, citations, cost, or latency.
- RR-085/RR-086/RR-087 remain Fixed. Register: 87 total / 82 Fixed / 4 Needs
  Investigation / 1 Won't Fix. This implementation did not change issue
  status or counts.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unpromoted/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unpromoted/default-off.
- `.env.local` was not modified during C5 implementation.

## Latest live evidence

- C4 broad normalized-pool recall: `1/7`, `1/7`, `2/7` (mean `1.33/7`).
- C4 broad final recall: `2/7`, `1/7`, `1/7` (mean `1.33/7`).
- C4 pool/final Jaccard: `0.1778` / `0.0000`.
- The C5 feasibility probe used 8 logical = 8 physical Serper attempts and
  projected `5/7` safe pool materialization in all three broad fixtures.
  Organic found all accepted pages; the four Shopping resolution probes
  normalized zero candidates.
- These numbers are historical control plus feasibility projection. The new
  runtime resolver has not been called live.

## Next task — approval pending

The recommended next phase is a separately approved **live, flag-on C5
end-to-end validation**, not R7A and not automatic promotion. Before proposing
spend, use dialogue entry [33] to resolve any peer-review objection that changes
the test contract. The validation should:

1. Run the new flag on with the current promoted flag state, cache-cold and
   commit-pinned, using an explicitly approved search count, Serper planning
   basis, and per-request hard ceiling.
2. Attribute each resolution lookup and accepted/rejected page within its own
   request. Record provider identity, parent query, first-loss stage, physical
   attempts, retries/fallbacks, and whether merchant recovery would have
   handled a skipped lead.
3. Score broad and constrained normalized-pool recall, final recall, hard-
   constraint compliance, wrong-type/non-product count, identity/image safety,
   duplicate cards, stability, latency, and physical-call cost. Compare with
   the commit-pinned C4 control while labeling cross-window provider variance.
4. Treat the frozen `5/7` broad-pool floor as a real gate with no rounding and
   no weakened denominator. Because the feasibility result had no margin, a
   miss requires first-loss diagnosis rather than automatic promotion.
5. Stop and report after the evidence window. Promotion, `.env.local` changes,
   R7A, deployment, and any replacement search require separate approval.

## Hard boundaries

- Zero live Serper/OpenAI calls without Taylor's explicit per-phase search
  approval plus a physical-attempt planning basis and hard ceiling. The prior
  8/8/24 probe approval is exhausted.
- No flag promotion, `.env.local` edit, R7A work, deployment, or new live
  window without separate explicit approval.
- Preserve price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, and hard-constraint trust gates.
- Generalized fixes only; no product, brand, retailer, model, or fixture-
  specific production exception.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only approved-phase files; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Outstanding peer-review debt

- Dialogue entry [33] asks Claude to challenge the strong-model qualification,
  the dormant merchant-recovery interaction, and cap/dedupe starvation before
  any live spend. The review is advisory and authorizes no change or call.
- The merchant-recovery interaction is the clearest known uncertainty: the
  resolver deliberately skips a lead that the enabled recovery path could
  materialize, even though that separate flag is currently default-off. Live
  validation must expose those skips rather than silently count them.

## Retrieval map

| Need | Retrieve |
|---|---|
| C5 implementation / next gate | `docs/forward-roadmap.md` corrective C5 section |
| Peer review | `docs/agent-dialogue.md` entry [33] onward |
| Canonical verification | `docs/qa-loop-results.md` latest C5 entry |
| Durable resolver contract | `docs/review-radar-test-memory.md` latest entry |
| Architecture | `ReviewRadar-Overview.md` pipeline stage 8 |
| Historical live evidence | untracked `tests/fixtures/review-radar-live/shop-vac.c5-resolution-probe.json` |

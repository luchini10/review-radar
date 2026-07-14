# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the C5 flag-on live-validation window.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the C5 flag-on result in `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [36] onward unless an earlier claim
   needs verification.
5. Retrieve RR-078/RR-090 or older metrics by exact ID only.

## Current state

- Instrument commit `793eb4e` pins the C5 live request/flag/sample contract and
  extends the existing readiness analyzer with C5 contribution attribution.
- Taylor approved six C5 flag-on requests. Six were dispatched; five are usable
  cache-cold, balanced, commit-pinned fixtures. The first broad request is
  spent/excluded because `npm start` suppresses the local debug ledger in
  production mode. No replacement was dispatched.
- Five usable ledgers reconcile 398 known physical attempts, two retries, zero
  fallbacks, and no 120-attempt ceiling trip. The excluded request's physical
  attempt count is unknown. Mean usable request duration was 95.6 seconds.
- The two usable broad runs measured normalized-pool recall `4/7`, `5/7`
  (mean `4.5/7`) and final recall `1/7`, `3/7` (mean `2.0/7`). Both means miss
  the frozen `5/7` pool and `3/7` final floors; the broad sample also lacks its
  intended third usable run.
- The three constrained runs measured pool recall `3/4`, `2/4`, `3/4` and
  final recall `3/4` each. Exact hard-constraint failures were zero.
- C5 formed 243 identity-resolution plans, dispatched 20 under the unchanged
  four-per-request cap, and culled 223. The ledgers record 79 normalized rows,
  67 unique candidates, and five final selections. Every selection occurred in
  constrained runs; merchant recovery contributed zero candidates.
- The safety gate failed. RR-078 reopened after a Matter Alpha information/news
  page rendered as an exact buyable Tapo card. RR-090 is new and Critical: a Q7
  M5+ card carries a Q10 X5+ canonical/product URL while its image identifies
  Q7 M5. No RR-061-class image regression occurred.
- Promotion is rejected. Both recovery flags remain default-off and R7A remains
  blocked. Register: 90 total / 83 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: unset/default-off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unset/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unset/default-off.
- `.env.local` was not modified during C5 validation.

## Latest verification and evidence

- Instrument focused analyzer: 13/13.
- Full wall at instrument commit: 938/938 tests across 129 suites.
- Typecheck and production build pass. Offline evaluation reports no red flags;
  lint is 0 errors / 3 pre-existing warnings.
- Six C5 fixtures remain untracked; hashes and exact outbound C5 queries are in
  `docs/phase-6-market-leader-evaluation.md`.
- Broad pool/final pairwise Jaccard is `0.3889`/`0.0000` from two usable runs.
  Constrained pool/final mean pairwise Jaccard is `0.2566`/`0.0513`.
- No duplicate exact-model final pair, false accessory collapse, malformed
  query, seed search, hard-constraint failure, or RR-061 image regression was
  recorded in the five usable runs.

## Next task — approval pending

The recommended next phase is one **zero-live C5 trust-boundary corrective
phase** for RR-078 and RR-090. It is not another live window, flag promotion,
or R7A:

1. Add fixture-derived fail-first tests for the Matter Alpha page and the Q7
   card carrying Q10 canonical identity. Preserve the saved fixtures untracked;
   extract only the minimal deterministic objects needed by existing tests.
2. Trace RR-090 to the earliest mutation: compare the AI candidate before
   source upgrade, the selected Q7 upgrade evidence, merge/enrichment output,
   canonical identity assignment, and final selection. Do not claim the C5
   resolver caused it unless the trace proves that.
3. Repair RR-078 at the shared product-eligibility boundary using generalized
   editorial/information-page semantics. Keep editorial pages usable as
   evidence and preserve legitimate commerce product-detail pages; add no host,
   brand, model, or fixture-specific production rule.
4. If RR-090 has a narrow shared attachment boundary, require existing exact-
   model compatibility before canonical URL/identity/commerce metadata can
   replace a target's fields. Preserve same-model sparse-title and cross-
   retailer enrichment. If the earliest mutation instead requires an
   architectural merge refactor, stop after diagnosis and present that scope
   before editing it.
5. Replay both captured failures, run focused trust/identity/eligibility tests,
   then the full wall, typecheck, lint, build, and offline evaluation. Keep both
   C5 flags default-off. Report expected effects only; no live claim.

**Recommended reasoning level: Highest.** The phase crosses shared product-card
eligibility and cross-model metadata trust boundaries; a shallow patch could
hide editorial pages or corrupt legitimate same-model enrichment.

## Hard boundaries

- No live Serper/OpenAI calls without Taylor's explicit new per-phase approval.
  No previous search approval remains available.
- No flag promotion, `.env.local` edit, R7A work, deployment, replacement
  request, cap increase, threshold change, or ambiguous short-code expansion
  without separate approval.
- Preserve every price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, URL, source-quality, and hard-constraint trust gate.
- Generalized fixes only; no product, brand, host, retailer, model, query, or
  fixture-specific production exception.
- RR-061-class image regression stops any later live window. New unrelated
  defects are filed and handled under that future window's approved rules.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only approved-phase files; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [36] asks Claude to challenge the C5 attribution, RR-078
  reopening, RR-090 distinction from RR-069, and the proposed zero-live repair.
  That review is advisory and authorizes no behavior change or spend.
- Entry [35]'s earlier hard-spec/recurrence questions remain useful background,
  but the live safety failures now take priority over allocation tuning.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current next decision | this file and latest C5 roadmap block |
| Canonical live result | latest entry in `docs/qa-loop-results.md` |
| Full recall/contribution/query table | `docs/phase-6-market-leader-evaluation.md` C5 flag-on section |
| Editorial-page regression | RR-078 |
| Cross-model canonical metadata defect | RR-090 |
| Runtime evidence | six untracked `*.c5-flag-on-run*.json` fixtures |
| C5 implementation seam | `lib/search/serper.ts:4632-4835` |
| Local-debug production restriction | `app/api/recommendations/route.ts:291-295` |
| Peer review | `docs/agent-dialogue.md` entry [36] onward |

# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the zero-live C5 validation preflight.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read only the corrective C5 section of `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [34] onward unless an earlier
   claim needs verification.
5. Retrieve RR-088/RR-089 and other history by exact ID or metric only.

## Current state

- The C5 live-validation preflight is complete with zero live calls and blocks
  the live window before spend. Commit `eaeb577` remains default-off and
  unpromoted; no source behavior changed during the preflight.
- RR-088 is reproducible: `strongModelTokens()` treats a hyphenated capacity
  such as `12-Gallon` as model token `12gallon`. A structured generic product
  row therefore qualifies as a C5 lead, and the current first-seen four-query
  slice can spend a slot on it ahead of a genuine repeated model.
- Bounded M3 reconstruction of all three saved C4 broad ledgers found this
  ordering shape. The ledgers contain capped result digests, so they cannot
  prove the exact next live slate; the single-row qualification and first-four
  slicing behavior are exact current-code facts.
- RR-089 is reproducible: lead construction suppresses a row when the enabled
  merchant-recovery counterfactual could materialize it, even if that separate
  runtime flag is off. Enabling only the new C5 flag can therefore yield
  neither the safe merchant candidate nor an organic lookup.
- The correct response is not to broaden identity. Model-less/generic lines
  should remain unresolved, and the request cap should stay four. Qualification,
  deterministic allocation, and flag composition need correction first.
- Register: 89 total / 82 Fixed / 6 Needs Investigation / 1 Won't Fix.
  RR-088 and RR-089 are the new C5 blockers.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unpromoted/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unpromoted/default-off.
- `.env.local` was not modified during the preflight.

## Latest verification and live evidence

- Latest full wall for implementation commit `eaeb577`: 934/934 tests across
  129 suites; focused 104/104; typecheck/build/eval pass; lint 0 errors/3
  pre-existing warnings. The preflight did not rerun or relabel that wall.
- Preflight deterministic probes:
  - `Shop-Vac 12-Gallon ...` → model token `12gallon` → one false C5 lead.
  - Safe DXV10SB merchant row with normalization recovery off → 0 candidates,
    0 leads; with recovery on → 1 candidate, 0 leads.
- No Serper/OpenAI call, live fixture, North-Star metric, promotion,
  deployment, or `.env.local` edit occurred.
- Latest live North Stars remain C4: broad normalized-pool/final recall means
  `1.33/7` / `1.33/7`; pool/final Jaccard `0.1778` / `0.0000`.
- The C5 feasibility probe's `5/7` projection remains historical and has no
  safety margin. The current runtime selection does not yet faithfully
  reproduce its four-target lookup premise.

## Next task — approval pending

The recommended next phase is a **zero-live C5 corrective phase** that closes
RR-088 and RR-089 before any flag-on window:

1. Add fail-first tests proving that hyphenated hard specifications—capacity,
   power, voltage, screen size, refresh rate, and similar units—cannot alone
   qualify as a model code, while real mixed model codes remain eligible across
   unrelated categories. Do not weaken `strongModelTokens()` globally unless
   the full identity wall proves that safe; prefer a resolver-local predicate.
2. Build the lead identity brand from source-leading identity evidence. A unit
   token such as horsepower `HP` cannot become the brand of a Craftsman-style
   title, while genuine HP computer titles must remain valid.
3. Aggregate duplicate eligible leads before allocation. Rank by recurrence
   across distinct parent discovery queries, then total recurrence, then stable
   first-seen/key tie-breakers. Suppress already-materialized pages before the
   unchanged request cap of four, and record every cap cull with lineage.
4. Make `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION=on` explicitly compose the
   existing safe merchant recovery as its zero-cost first tier, followed by one
   organic lookup only when no safe merchant page exists. Preserve independent
   normalization-only operation and exact both-flags-off behavior.
5. Replay the captured C4 ledgers as M3 directional evidence, run focused and
   full trust walls, and stop. Do not call live APIs or promote either flag.

Only after that correction passes should Taylor receive a new live C5 budget
proposal. A live approval must name search count, physical-attempt planning
basis, and hard ceiling; it does not authorize promotion.

## Hard boundaries

- Zero live Serper/OpenAI calls without Taylor's explicit per-phase search
  approval plus a physical-attempt planning basis and hard ceiling. No prior
  approval remains available.
- No corrective behavior change until Taylor approves the zero-live phase.
- No flag promotion, `.env.local` edit, R7A work, deployment, or replacement
  search without separate explicit approval.
- Preserve price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, and hard-constraint trust gates.
- Generalized fixes only; no product, brand, retailer, model, or fixture-
  specific production exception.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only approved-phase files; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Outstanding peer-review debt

- Dialogue entry [34] records the reproduced blockers and asks Claude to
  challenge the proposed resolver-local spec filter, recurrence ordering, and
  composed flag semantics. That review is advisory and authorizes no action.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current blockers / next approval | RR-088/RR-089 in `docs/RR-Issues-Report.md` |
| C5 forward state | latest corrective C5 block in `docs/forward-roadmap.md` |
| Peer review | `docs/agent-dialogue.md` entry [34] onward |
| Canonical preflight evidence | latest entry in `docs/qa-loop-results.md` |
| Implementation under review | commit `eaeb577`, especially `lib/search/serper.ts` |
| Historical feasibility evidence | untracked `tests/fixtures/review-radar-live/shop-vac.c5-resolution-probe.json` |

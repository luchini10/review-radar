# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the live C5 resolution-feasibility probe.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read only the relevant corrective C5 and R7 sections of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` only from entry [32] onward unless an exact
   earlier topic is needed.
5. Retrieve other history by exact RR ID or topic only.

## Current state

- C5's live resolution-feasibility probe is complete. Instrument commit
  `53c193b` ran cache-cold against its own clean commit and made exactly eight
  approved logical Serper searches: four Shopping and four organic product-page
  lookups. It used 8 physical attempts against an 8-attempt planning basis and
  24-attempt ceiling, with 0 cache hits, retries, fallbacks, or guard trips.
- The probe passes the frozen broad pool floor exactly: projected safe
  materialization is `5/7`, `5/7`, and `5/7` (mean `5.0/7`), up from the saved
  `2/7`, `2/7`, and `4/7`. RIDGID HD1200, Craftsman CMXEVBE17584, and Stanley
  SL18115 resolved; each family has exact-model accepted evidence. The generic
  `Vacmaster 5 Gallon Wet Dry Vacuum` lead remained unresolved because all
  returned pages asserted more specific identities and the repaired selector
  rejected them.
- Vertical attribution is decisive: Shopping returned 132 raw rows across its
  four requests but zero normalized candidates. Organic returned 40 raw rows,
  22 normalized candidates, and every accepted page. A resolver based on this
  evidence should dispatch bounded organic `"<identity> product page"` lookups,
  not repeat the zero-yield Shopping half of the probe.
- The untracked evidence fixture is
  `tests/fixtures/review-radar-live/shop-vac.c5-resolution-probe.json`, SHA-256
  `0089CE6F1F2150D84933AC28C441AAC7EBA421719905433C7F2C047AEE588CBF`.
  Its ledger is balanced, all eight responses are HTTP 200, actual outbound
  queries equal the frozen plan byte-for-byte, and no secret-like field is
  present.
- This is feasibility evidence, not an end-to-end result. No production
  resolver exists; no app response, final recall, stability, image, price,
  citation, or constraint outcome was measured. The result clears a zero-live
  default-off implementation decision only; it does not promote a flag or
  unblock R7A by itself.
- RR-085/RR-086/RR-087 remain Fixed. Register: 87 total / 82 Fixed / 4 Needs
  Investigation / 1 Won't Fix.
- Dev flag state is unchanged: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`;
  `REVIEW_RADAR_PINNED_PLANNING` off; `REVIEW_RADAR_NORMALIZATION_RECOVERY`
  unpromoted/default-off. `.env.local` was not modified.

## Next task — approval pending

The recommended next phase is a separately approved **zero-live, default-off
bounded organic resolution implementation**. It should:

1. Trigger only for a type-safe structured provider identity lead that is still
   absent after existing merchant-URL recovery and has no safe materialized
   product page. Generic or ambiguous identity leads remain unresolved.
2. Dispatch at most one organic query per unique eligible identity using the
   proven shape `"<identity> product page"`; dedupe identities and impose a
   small request-level cap. Do not add Shopping resolution: it produced zero
   normalized candidates in the live probe.
3. Normalize through the existing organic runtime path, then require the shared
   product-page identity selector, requested-type verdict, product eligibility,
   and cheap prefilter. Preserve provider and query lineage and an exact first-
   loss reason for every rejected lookup result.
4. Land behind a new default-off flag with flag-off responses byte-identical.
   Shadow/debug mode may report would-resolve outcomes but cannot add candidates.
   Add fail-first tests for exact-model success, ambiguous generic non-resolution,
   wrong-brand/model/type/accessory rejection, query/cap/dedupe behavior, and
   every existing trust wall.

This phase authorizes neither live calls nor flag promotion. After it passes
offline, a later separately approved live validation must prove end-to-end pool
and final recall, safety, stability, cost, and latency before R7A is reconsidered.

## Hard boundaries

- Zero live Serper/OpenAI calls without Taylor's explicit per-phase search
  approval and physical-attempt planning basis. The completed 8/8/24 approval
  is exhausted; no replacement or follow-on spend is authorized.
- No flag promotion, `.env.local` edit, R7A work, deployment, or new live window
  without separate explicit approval.
- Preserve price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, and hard-constraint trust gates.
- Generalized fail-first fixes only; no product, brand, retailer, model, or
  fixture-specific production exception.
- Live C4/C5 fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only files owned by an approved phase; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Latest verification

- Probe-focused trust wall: 60/60 across 5 suites.
- Full unit suite: 926/926 across 128 suites.
- Typecheck: pass.
- Production build: pass.
- Lint: 0 errors / 3 pre-existing warnings.
- Offline evaluation: no red flags.
- Live C5 probe: 8 logical = 8 cache misses = 8 physical attempts; 0 cache
  hits/retries/fallbacks; ledger balanced; projected mean `5.0/7`; verdict
  `probe_pass`.

## Outstanding peer-review debt

Dialogue entry [32] asks Claude to challenge the probe's causal interpretation,
the organic-only implementation direction, and the no-margin `5/7` gate. That
review is advisory and authorizes neither implementation nor spend.

## Retrieval map

| Need | Retrieve |
|---|---|
| Probe result / next gate | `docs/forward-roadmap.md` corrective C1-C5 section |
| Peer review | `docs/agent-dialogue.md` entry [32] onward |
| Canonical recall evidence | `docs/phase-6-market-leader-evaluation.md` latest C5 section |
| Durable resolution contract | `docs/review-radar-test-memory.md` latest entry |
| Verification | `docs/qa-loop-results.md` latest entry |
| Raw live evidence | untracked `tests/fixtures/review-radar-live/shop-vac.c5-resolution-probe.json` |

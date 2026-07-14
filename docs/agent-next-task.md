# ReviewRadar Agent Handoff

Updated: 2026-07-14 by 🟧 Codex after the zero-live C5 corrective hardening.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the C5 corrective/live-validation section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [35] onward unless an earlier claim
   needs verification.
5. Retrieve RR-014/RR-015 or other history by exact ID/metric only.

## Current state

- Commit `4bba870` completes the approved zero-live C5 corrective phase and
  closes RR-088/RR-089. The resolver remains default-off and unpromoted.
- Resolver lead qualification now excludes compacted hard specifications,
  preserves real cross-category model codes, and derives brand from
  source-leading identity so horsepower `HP` cannot replace the product brand.
- Duplicate leads retain distinct parent-query and total recurrence. Allocation
  sorts by those signals, then stable first-seen/key order, suppresses already-
  materialized candidates, and applies the unchanged request-wide cap of four.
- The C5 flag now forms a complete merchant-first path: guarded merchant-URL
  recovery is its zero-cost first tier, followed by bounded organic resolution.
  The normalization-only flag remains independently operable; both flags off
  retain the original behavior.
- Ambiguous short model codes such as `Q5` remain unresolved. A deterministic
  probe shows the shared selector can accept a `Q7` page for a `Q5` target, so
  widening that boundary would currently weaken wrong-product safety.
- M3 recurrence ranking over all three capped C4 broad Shopping digests moves
  recurrent real models ahead of spec-only rows. It cannot fully replay
  existing-page suppression, so this is directional evidence rather than an
  exact live slate, recall, or stability result.
- Register: 89 total / 84 Fixed / 4 Needs Investigation / 1 Won't Fix.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unpromoted/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unpromoted/default-off.
- `.env.local` was not modified during C5 corrective hardening.

## Latest verification and evidence

- Fail-first focused run: 7 pass / exactly 3 intended failures.
- Focused final: 131/131 across eight resolver/Serper/ledger/identity/type
  suites.
- Full wall: 937/937 tests across 129 suites.
- Typecheck, production build, and offline evaluation pass. Lint is 0 errors / 3
  pre-existing warnings.
- No live Serper/OpenAI call, fixture write, promotion, deployment, R7A work, or
  `.env.local` edit occurred.
- Latest live North Stars remain C4: broad normalized-pool/final recall means
  `1.33/7` / `1.33/7`; pool/final Jaccard `0.1778` / `0.0000`.
- C5's historical feasibility projection remains `5/7` with no safety margin.
  The corrected runtime has not yet been measured flag-on end to end.

## Next task — approval pending

The recommended next phase is one **C5 flag-on live validation window**, not
promotion and not R7A:

1. Begin with a zero-network preflight at commit `4bba870`: verify the request
   harness dispatches exactly once, cache starts cold per run, the attempt guard
   is active, current promoted flags are unchanged, and only the C5 resolver is
   temporarily enabled for the test process. Do not edit `.env.local`.
2. Run six cache-cold requests under ratified `leaders-v2026-07c`: three broad
   shop-vac requests and three frozen constrained requests. Use the C4 window as
   the historical flag-off control; do not buy a second simultaneous control
   stream unless attribution proves impossible.
3. Attribute every recovered product within each response: ordinary
   normalization, zero-cost merchant recovery, or organic identity resolution.
   Record selected/cap-culled lead priority, exact queries, logical and physical
   attempts, cache state, retries/fallbacks, accepted/rejected pages, cost, and
   latency.
4. Score broad normalized-pool and final leader recall, constrained recall and
   hard-constraint compliance, final-set stability, duplicate exact models,
   wrong product types, unsafe/editorial product pages, and RR-061-class image
   regressions. Name each newly materialized leader and whether it came from the
   merchant or organic tier.
5. Treat broad mean pool recall below `5/7`, any wrong-product/unsafe-page/image
   regression, any hard-constraint violation, or unbalanced ledger accounting
   as a failed promotion gate. Report honestly and stop; do not weaken the
   frozen target or add short-code support during the window.
6. Save untracked, commit-pinned fixtures and produce the full before/after and
   contribution report. Stop without promoting a flag or editing `.env.local`.

Planning basis if Taylor approves: **six logical searches and 510 physical
attempts** (the prior six-run C4 planning basis of 486 plus at most four new
resolver lookups per request), with the existing **120-attempt per-request hard
ceiling**. Exceeding the estimate is a reporting fact; an accidental extra
request is spent/excluded and requires separate approval for replacement.

## Hard boundaries

- No live Serper/OpenAI calls without Taylor's explicit per-phase search
  approval naming search count, physical-attempt planning basis, and hard
  ceiling. No prior approval remains available.
- No flag promotion, `.env.local` edit, R7A work, deployment, replacement
  search, or ambiguous short-code expansion without separate approval.
- Preserve every price, citation, requirement, product-type, identity, image,
  eligibility, dedupe, URL, and hard-constraint trust gate.
- Generalized fixes only; no product, brand, retailer, model, or fixture-
  specific production exceptions.
- RR-061-class image regression stops a live window. File unrelated new defects
  at the next free RR ID and continue only under the approved window rules.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage only approved-phase files; never use `git add -A`.
- One phase per approval. Stop and report after it.

## Outstanding peer-review debt

- Dialogue entry [35] asks Claude to challenge the hard-spec unit family,
  recurrence priority, explicit-option semantics, and the deliberate short-code
  boundary. That review is advisory and authorizes no spend or behavior change.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current next decision | this file and latest C5 roadmap block |
| Corrective implementation | commit `4bba870`, `lib/search/serper.ts` |
| Canonical verification | latest entry in `docs/qa-loop-results.md` |
| Current open quality issues | RR-014/RR-015/RR-037/RR-045 |
| Peer review | `docs/agent-dialogue.md` entry [35] onward |
| Historical live control | C4 section of `docs/phase-6-market-leader-evaluation.md` |
| Historical feasibility evidence | untracked `shop-vac.c5-resolution-probe.json` |

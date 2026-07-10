# Agent Next Task

Generated: 2026-07-10

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Phase R2 started at
pinned commit `0f44ae7` but hit the absolute safety stop after four of six
approved searches. A1-A3 `shop vac` completed; constrained B1 (`robot vacuum`,
`under $300`, `self-emptying`) triggered the stop. B2/B3 were not run.

All four cache-cold ledgers reconcile: 386 logical lookups, 69 cache hits, 317
misses, 317 physical Serper attempts, 0 retries, and 0 fallbacks. The four new
Tier A fixtures are untracked and must not be committed or pooled with earlier
stopped Phase 6D samples.

The register contains 79 issues: 63 Fixed, 15 Needs Investigation, 1 Won't
Fix, and 0 Open; 11 Critical, 33 High, 30 Medium, and 5 Low.

- RR-061 is reopened. Q10 X5+, Q10 S5+, and Q7 Max+ cards rendered QRevo/Saros
  foreign-model filenames that bypass the R1 mixed letter-digit token guard.
- RR-078 is Critical/Needs Investigation: customer-service and editorial pages
  rendered as buyable product cards.
- RR-079 is High/Needs Investigation: an accessory-only self-empty dock rendered
  as a robot-vacuum near match.
- RR-037 and RR-045 remain Needs Investigation.

R2 did not satisfy the Phase 6D exit gate. Rubric remains `v0.1-draft`; no
leader snapshot, significance rule, or North-Star baseline is frozen. Phase 6E
remains unauthorized.

## Required next task — Phase R3

**Phase R3 — planner determinism (zero live calls).** Follow
`docs/forward-roadmap.md` exactly. Use the R2 ledgers as fail-first evidence to
make search-plan generation reproducible enough for controlled comparison.
Focus on the configured OpenAI discovery-strategy and gap-planning calls: they
currently set no temperature or seed, and every A-run raw strategy/gap output
varied.

The R3 phase must:

- run zero live Serper/OpenAI searches unless Taylor separately approves a new
  live budget;
- add deterministic tests before changing behavior;
- preserve request constraints and the strict output schemas;
- define and verify the intended temperature/seed behavior against the actual
  supported model/API contract;
- avoid fixing R4 query allocation, R5 downstream false negatives, R6 seed
  precision, RR-061, RR-078, or RR-079 in the same phase;
- keep all image, identity, price, citation, requirement, product-type, and
  product-page safety gates at least as strict;
- update the issue register and the standard nine-document set, then commit the
  scoped phase separately.

## Evidence to carry into later phases

- A-run Jaccard means: expected products 0.1434, planned queries 0.3909,
  dispatched queries 0.3896, provider common results 0.5820, candidate pool
  0.1051, final cards 0.0333. Attribution is mixed; downstream stages amplify
  planner/model and provider variance.
- AI-gap queries supplied 30 unique candidates and 8 exact/8 near outcomes.
  Editorial seeds produced 588 raw results and zero unique/final candidates.
- Constrained B began with four broad/diluted deterministic shopping queries
  and only one self-emptying query. That evidence belongs to R4.
- RR-037: RIDGID appeared in every A run but with variable product identities.
  RR-045: two broad Tapo queries returned raw results that normalization
  discarded; no exact RV30C Plus query ran.

## Safety boundary

Do not run the unspent B2/B3 calls, freeze R2 values, approve leader snapshots,
start Phase 6E, or begin another live window. Any later live sample requires a
separately approved budget and repairs for RR-061/RR-078 first. Do not commit
live fixtures or modify `.env.local` / `REVIEW_RADAR_*` flags.

Reference:

- `docs/forward-roadmap.md`
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` section 23

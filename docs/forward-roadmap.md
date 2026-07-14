# ReviewRadar Forward Roadmap (R-series)

Adopted 2026-07-10. This document governs all forward sequencing. Completed
history stays in `docs/codex-handoff-phased-plan.md`; the Phase 6 measurement
method remains owned by `docs/phase-6-reliability-gauntlet-plan.md`;
`docs/agent-next-task.md` always points at the current R-phase. No other
forward-plan documents may be created.

## Why this roadmap exists

63 issues have been fixed and the product-level numbers are still failing:
identical searches shared zero final products (final-set Jaccard 0), and the
then-current broad-query baseline surfaced 0 of 7 core market leaders. The audit
(`docs/review-radar-search-pipeline-audit.md`, commit be1d9b5) proved the
primary bottleneck at 0.98 confidence: constraint-aware query allocation and
requirement semantics. The Phase A ledger (commits ef7bbc1, abf924d) makes
losses attributable. The remaining risk is sequencing: measurement must serve
the fixes, never replace them.

## The endgame (target architecture)

**One candidate source of truth.** Serper + deterministic code discover,
verify, and select every product. The LLM is strategist (query planning) and
explainer (prose) only — it never introduces candidates that deterministic
code did not discover and verify. A large fraction of the issue register
(wrong images, identity collapses, metadata-brand pollution, citation rescue)
is downstream policing of the second, LLM-sourced candidate stream. Every
R-phase should move toward this endgame or at least not away from it; R7
completes it. When a defect can be fixed either by adding a guard or by
removing a reason the untrusted data exists, prefer removal.

## North-Star metrics

Report these at the end of EVERY phase, from the most recent live sample
(deterministic phases restate the last known values and the expected effect):

1. **Core-leader recall**: how many approved market leaders appear in the final
   displayed set. The draft-seeded `leaders-v2026-07a` list currently yields a
   provisional M3 broad observation of 1.0/7; it is not canonical until Taylor
   completes human list review.
2. **Wrong-type products in the final set**: must be 0.
3. **Constraint compliance**: fraction of exact matches that verifiably
   satisfy the user's stated constraints.
4. **Stability**: final-set and candidate-pool Jaccard across same-input runs.

Between live batches, use deterministic proxies: full suite green,
`scripts/eval-pipeline.mjs` red-flag checks, and ledger-based process metrics
(constraint coverage of planned Shopping slots) from tests and saved fixtures.

## Anti-measurement rules (standing law)

1. After R2, no standalone observability/diagnostic/documentation phase may
   run unless it names the specific decision it unblocks. New instruments ride
   inside behavior phases.
2. Every live batch must serve at least two purposes (e.g., verification AND
   before/after sample). State both in the approval request.
3. Every proposed phase must state its expected effect on a North-Star metric.
   "None — infrastructure" is acceptable only for R0 and R1.
4. No new roadmap/plan documents. This file and `docs/agent-next-task.md` are
   the only forward-pointing documents. (`docs/agent-dialogue.md` is a
   communication log, not a plan document.)
5. If two consecutive phases complete with no North-Star metric improving,
   stop and escalate to Taylor with a written diagnosis before any further
   phase.

## Standing guardrails (apply to every phase; do not restate per phase)

- Generalized fixes only — no product-, brand-, or category-specific patches.
- Preserve all price, citation, requirement, product-type, identity, image,
  and eligibility trust gates. Behavior changes ship flag-gated or
  shadow-first, default-off, promoted only with before/after evidence.
- One phase per explicit approval from Taylor. Live spend is approved in
  searches, with the derived Serper estimate stated (~37–47 calls per search).
  Never pool samples across windows. Stop and report after each phase.
- Zero live Serper/OpenAI calls in any phase not explicitly approved as live.
- Context and documentation discipline: preserve every historical record, but
  do not make every agent reread or update every record. At session start, read
  all of `docs/agent-next-task.md`; then use `rg` and bounded excerpts for the
  relevant roadmap, dialogue, issue, test-memory, QA, handoff, and overview
  sections. `docs/agent-next-task.md` is the only always-read current-state
  handoff. The issue report summary plus active/referenced IDs is sufficient
  unless maintaining the register itself.
- Handoff invariant: regenerate `docs/agent-next-task.md` at each phase closeout
  with the current phase/commit, flag state, hard boundaries, outstanding
  peer-review debts, and current verification. Never rely on incremental prose
  patches to carry forward these safety-critical fields.
- End-of-phase minimum record: update `docs/agent-next-task.md`; append the
  canonical evidence to `docs/qa-loop-results.md` with the executing-agent
  header (Claude: green bold HTML; Codex: 🟧); update the issue report only for
  issue/status/count changes; and append a dialogue entry when the peer agent
  needs a conclusion or review. Update test memory only for durable contracts,
  the overview only for architecture changes, the change log only for meaningful
  product changes, and the phased handoff only for major milestones/explicit
  handoffs. Repo files only — never copy anything to `Desktop/RR Markdowns`.
- Commits to `main`, staging only files created/modified by the phase. Never
  `git add -A`. Existing untracked fixtures and local artifacts stay untouched.
- **Agent dialogue:** `docs/agent-dialogue.md` is the standing Claude↔Codex
  channel. At phase start, read its protocol and only entries after your last
  entry (or the entry Taylor says is waiting), then answer items addressed to
  you — verifying claims against the repo before agreeing. At phase end, append
  questions/objections only when the peer agent needs a conclusion or review.
  The channel is also used on demand during brainstorming before any phase is
  approved. A dialogue-only append is a docs-only commit and does not trigger
  the end-of-phase minimum record. Claims cite `file:line`, fixtures, or commits.
  The dialogue is advisory only: it never authorizes phases, live spend, or
  commits — Taylor remains the sole approver.

---

## Phase R1 — RR-061 generalized wrong-model image fix

**Goal:** unblock live measurement. Deterministic only; zero live calls.
**Scope:** the reproduction is `Saros_Z70_Silver_ID.png` rendered on a
Roborock Q5 Max+ card — page/title context outweighed an explicit conflicting
model token in the image path. Fail-first tests distilled from the saved live
fixtures, then a generalized conflicting-image-model guard in the shared image
resolver: when the image path/filename carries a recognizable model identity
that conflicts with the product's model, the image is rejected or downgraded
below High confidence, using normalized model-token detection.
Preserve valid same-model images, opaque/hashed CDN assets, Google Shopping
thumbnails, and the existing navigation/flyout safeguards. Also add the small
missing ledger test: inject a canary API-key value and assert it never appears
in the serialized ledger snapshot.
**Non-goals:** RR-070 through RR-077; any search/ranking behavior.
**Acceptance:** fail-first tests flip green; full suite, typecheck, lint,
build, eval green; RR-061 → Fixed with deterministic regression.
**North-Star effect:** none (infrastructure/safety); removes the live-run
abort risk that killed the last two windows at 1/6 and 2/6.

## Phase R2 — Live ledger verification + frozen baseline (completes Phase 6D)

**Live budget:** six searches (~225–280 Serper calls). This phase IS the
Phase 6D variance-pilot restart AND the "before" baseline for R3/R4. Dual
purpose satisfied.
**Protocol:** three broad `shop vac` runs and three constrained
`robot vacuum` / `under $300` / `self-emptying` runs, identical inputs within
each group, dev server restarted (cache cold) before every run, debug header
on, every payload saved via `npm run qa:save-fixture` with `ledger-run` names
(fixtures stay untracked). Record the commit hash; commit-pinned window.
**Safety rule:** an RR-061-class regression (wrong-model/navigation image at
High confidence) stops the phase — the fix failed. Any NEW unrelated defect:
file it with the next RR ID, save the fixture, continue.
**Report:** reconciliation (logical/cache/physical/retries/fallbacks);
planned-but-culled queries with reasons — especially constraint-bearing
queries crowded out by protected generic slots; per-query and per-origin
contribution; first-loss stages; variance within each group split into
plan-differences vs provider-differences using the retained raw strategy JSON;
whether the strategy/gap-check calls pin temperature or seed anywhere
(RR-015 attribution); RR-037 and RR-045 evidence updates. Caveat for the
reader: `candidate_merge` losses can be inflated by URL/name mismatches in
lineage matching — cross-check against near-identical names in final sets.
**Freeze:** per the 6D exit criteria, freeze rubric v1.0 and compile the
dated market-leader snapshots. Record baseline North-Star values. The full
6E 12–15-search baseline is NOT authorized by this roadmap; Taylor decides at
R2 exit whether R2+R4 samples suffice (default: they do).
**North-Star effect:** establishes the measured baseline for all four metrics.

## Phase R3 — Strategy-call determinism (small)

**Goal:** stop paying variance tax on every future comparison. Zero live.
**Scope:** informed by R2's pinning check — set temperature/seed (or the
API-supported equivalents) on the strategy and gap-check helper calls,
flag-gated `REVIEW_RADAR_PINNED_PLANNING=on`. Deterministic tests assert the
parameters are actually sent when the flag is on and absent when off.
**Validation:** no dedicated live batch. R4's after-sample measures the
effect: plan Jaccard (pinning) is separable in the ledger from slot
composition (allocation), so one shared sample attributes both.
**North-Star effect:** stability (metric 4) expected to rise materially.

## Phase R4 — Constraint-preserving query allocation + requirement strength
(THE proven fix — audit #1 and #2, RR-073/074/075)

**Goal:** the user's constraints shape the search. Flag-gated
`REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`, default off, snapshot-identical when
off.
**Scope:** (a) rank initial Shopping-slot allocation by shopper-constraint
coverage — no generic synonym-expansion query may hold a protected slot ahead
of a constraint-bearing query (RR-075 generalized: subtype-carrying categories
must not be diluted by parent-category synonyms); (b) preserve ambiguous
Important Details (`Needs review`) as search-recall phrases even when they are
not hard filters, and introduce an explicit hard-vs-preferred strength on
Important Details carried consistently from extraction through search,
validation, and final selection (RR-073); (c) fix duplicate budget wording in
query construction (RR-074). Same Serper budget — reallocation, not expansion.
**Deterministic acceptance:** for the benchmark constrained shape, ≥3 of 5
initial Shopping queries carry the constraint; flags-off snapshots unchanged;
fail-first tests for RR-073/074/075.
**Live after-sample:** six searches, same shapes and protocol as R2 (second
purpose: validates R3 pinning). Ledger before/after vs R2: constraint-bearing
dispatched queries up, wrong-type candidates down, culled constraint queries
zero; North-Star metrics 1–3 not worse, expected up.
**Promotion:** flag on in `.env.local` only with the evidence; revert path is
the flag.

## Phase R5 — Downstream false negatives (audit #3, RR-071/RR-072)

Zero live. (a) Identity-collapse guard: two candidates whose numeric specs or
canonical URLs conflict must not exact-collapse (Vacmaster 5.5HP vs 5HP stay
distinct; true retailer duplicates still collapse). (b) Product-type
false-rejection: a candidate whose own title asserts the requested type must
not be rejected `wrong_category` (RIDGID HD0900 "Wet Dry Vac" stays eligible);
log prefilter subreasons before adjusting logic. Fail-first fixtures for both.
Validated live by riding the next approved batch.
**North-Star effect:** core-leader recall (metric 1) up — these losses
currently remove real leaders.

## Phase R6 — Source-brand trust + seed precision (audit #4/#5, RR-070/076/077)

Zero live; gated on R2/R4 contribution data (rule 3). (a) Metadata brand is
used only when compatible with the product title or a recognized alias — no
`Bose ILIFE A12 Pro`, no `DW DEWALT` (RR-070, RR-077). (b) Editorial seeds
must resemble one discrete product/model; request-local logical dedupe before
dispatch (RR-076) — only if contribution data shows seeds' recall value
justifies their cost, otherwise reduce their budget instead.
**North-Star effect:** metrics 2–3 via cleaner rescue/upgrade evidence; frees
wasted Serper spend.

## Phase R7 — Architecture consolidation (the endgame; detailed plan)

**Objective:** retire the second candidate stream without trading away leader
recall, constraint truthfulness, or any product trust boundary. OpenAI remains
the query strategist and optional explanation writer; only normalized Serper
candidates may enter deterministic verification, enrichment, and selection.

### R7 readiness gate — before implementation

The gate is **Serper-only normalized pool recall**, not final recall. It asks
whether deterministic discovery can find the leaders before R7 removes the
LLM candidate stream. Final deterministic recall is measured later for
promotion. The gate is attributive:

1. Taylor ratifies the provisional broad `shop vac` leader list and its line
   tokens. `coversLeader()` remains the frozen matcher; the list is the human
   denominator and cannot be silently revised to improve a score.
2. Run three cache-cold current-behavior `shop vac` searches and three
   cache-cold current-behavior constrained robot-vacuum searches. This is one
   separately approved six-search window. The last real six-usable-run window
   cost 486 physical Serper attempts; R6's zero seed budget should reduce that,
   but search count—not the estimate—is the approval unit.
3. The window serves three decisions: (a) R5/R6 North-Star checkpoint and
   roadmap rule-5 audit, (b) R7 Serper-only discovery gate, and (c) the
   contemporary flag-off control for R7B. R4-after remains historical context,
   not the primary control.
4. Broad normalized-pool recall must meet the existing ≥5/7 mean floor. A miss
   is classified by first loss: absent from raw provider results means discovery
   is not ready; present raw but lost in normalization/prefilter means repair
   that generalized boundary before R7A. Because the matcher conservatively
   undercounts unbranded titles, borderline misses receive manual ledger review,
   never an automatic pass.
5. Safety remains absolute: zero wrong-type/non-product final cards, zero hard
   constraint violations among exact matches, no RR-061 image regression, six
   balanced ledgers, and no excluded/warm run. Any safety failure stops the
   window. Constrained leader recall remains informational only.

**Zero-cost pre-gate result (2026-07-12, M3):** across the six saved R4-after
fixtures, 22/27 displayed cards directly map to normalized Serper candidate
IDs and 1/27 maps only to `final_openai_research`. Four cards cannot be directly
attributed because lineage finalization did not retain a matching record at the
candidate cap. Manual inspection finds clear same-model normalized Serper
candidates for two, a nearby-variant-only DEWALT case for one, and raw-only
RIDGID evidence with no normalized candidate for one. The evidence therefore
suggests **2–3 of 27 displayed cards may depend on the LLM candidate stream**;
it does not justify deleting that stream without the gate.

**Readiness execution (2026-07-12): FAILED / R7A BLOCKED.** Six requests were
dispatched; four are usable cache-cold ledgers and two are transparently
spent/excluded harness errors (production mode suppressed the ledger; shell
interpolation removed `$300` from one constrained request). The two valid
broad runs each scored **1/7** Serper-only normalized discovery-pool recall.
Every missed leader was present in raw product-discovery digests but lost
before the normalized pool. Even a perfect third broad run would cap the
three-run mean at **3/7**, below the **5/7** gate, so no replacement spend is
needed to decide readiness. The four usable runs made 306 physical attempts;
the malformed constrained run made 81; the production run is uncounted, so
known spend is at least 387. All usable ledgers were balanced/cache-cold, seed
spend was zero, and no RR-061 image regression occurred. Safety still failed:
RR-060 reopened for same-model duplicates and RR-083 records a stick vacuum
displayed as a robot-vacuum near match. These fixtures are diagnostic evidence,
not a valid R7B control. Repair the generalized normalization/type/dedupe
boundaries and pass a newly approved readiness window before R7A.

### Corrective arc C1-C5 — rule-5 stop-and-rethink

The readiness window is the formal roadmap rule-5 checkpoint. R6's zero-seed
and outbound-query-hygiene claims passed live, but R5's dedupe claim regressed,
the broad North-Star gate remained 1/7, and RR-083 exposed a type-safety hole.
The response is this corrective arc, not immediate R7 implementation:

1. **C1 — offline diagnosis and measurement contract (complete 2026-07-12).**
   Define and test the pre-AI pool analyzer, attribute every leader across raw,
   normalized, raw-dedupe, cheap-prefilter, post-merge, and displayed stages;
   measure loss-reason frequency; specify RR-060/RR-083 predicate gaps; and run
   the prospective `07c` matcher sensitivity. Zero live calls and no product
   behavior change.
2. **C2 — safety repairs (separate approval, zero live calls).** Fail first on
   the captured Bissell/Shark duplicate pairs and IZ372HD wrong-type card, then
   repair shared identity/type predicates. URL-derived model evidence must use
   existing normalized model equivalence, same-brand/type compatibility, and
   the R5 numeric-spec veto. Type evidence may use source-derived title/path/
   structured facts, never query-derived identity. Prove unrelated-category
   preservation and run the full wall before C3.
3. **C3 — normalization recovery (separate approval, default-off/shadow-first,
   zero live calls).** Reuse the existing product-eligibility and product-type
   verdict machinery; do not create a second classifier. First recover a real
   merchant product URL already supplied by Serper. A recovered identity may
   enter discovery only from source-derived title, slug, or structured data;
   generic collection/search/wrapper pages remain evidence-only and can never
   render as cards. Direct-product lookup is last, bounded, and permitted only
   if deterministic merchant-URL recovery still leaves measured misses. Under
   flag-off, ledger-only shadow annotations record would-have-recovered rows;
   responses remain byte-identical.
4. **C4 — renewed readiness evidence (separate six-search approval).** Before
   spend, pin exact broad/constrained request bytes (including literal `$300`)
   and refuse to count any run without a non-null debug ledger. Re-freeze the
   benchmark as `leaders-v2026-07c` only after Taylor accepts/revises the dated
   constrained list and prospective matcher. Then run three cache-cold broad
   and three cache-cold constrained searches with recovery enabled. Every raw
   provider result is normalized through the same runtime function in flag-off
   and flag-on modes, so one response supplies the pool counterfactual while
   the flag-on request supplies end-to-end final evidence. Do not compare
   separate provider responses as causal controls. Report raw-provider presence
   first, safety, pool/final recall, stability, recovery opportunity, and actual
   cost. Spent/excluded requests remain in cost totals but not quality metrics.
   Use 486 physical attempts as the planning basis and a hard 120-attempt
   per-request debug circuit breaker; any replacement remains separately
   approval-gated.
5. **C5 — R7 decision.** Only a passing C4 gate can unblock separately approved
   R7A. Failure produces another written diagnosis; it never lowers the frozen
   thresholds or silently promotes recovery.

**C2 completion (2026-07-12, zero live):** Taylor authorized Codex to continue
without the unavailable Claude checkpoint. Fail-first reproduced exactly three
intended failures: the captured cross-retailer URL-model dedupe gap, discovery-
time truncated wrong-type acceptance, and validation-time truncated wrong-type
acceptance. The shared path-only source identity extractor excludes hostnames,
query strings, and fragments. Exact-model inference may consume a URL model
only when the existing eligibility verdict permits a product card, and still
requires the existing same-brand/shared-model rule after the numeric-spec veto.
Product-type classification receives product-page path text as **veto-only**
evidence; positive requested-type proof remains title/metadata/source-text
based. Thus collection/evidence pages cannot lend models, query text cannot
manufacture a type, and URL paths cannot positively admit a card. The Bissell
`18P03` reproduction and an unrelated AC100 air-compressor control collapse;
an evidence-only collection stays distinct. The truncated generic stick-vacuum
reproduction is rejected at discovery and validation. RR-060 and RR-083 are
Fixed deterministically. Focused tests 184/184; full suite 881/881 across 127
suites; typecheck/build/eval pass; lint 0 errors/3 existing warnings. Latest
live North Stars are not remeasured: broad final recall remains 1/7 mean across
the two usable readiness broad runs, that sample contained one wrong-type final
card, exact hard-constraint failures were 0, and stability is NotScored from
the incomplete window. Expected C2 effect is zero wrong-type cards and more
distinct final slots; only a future approved C4 window can prove it live.

**C3 completion (2026-07-13, zero live):** Taylor approved C3 after supplying
Claude's design review. Fail-first produced five intended failures while all
existing controls stayed green. The existing shopping-result URL selector now
feeds one guarded recovery path shared by shopping, organic fallback, and
direct-retailer normalization. It may reuse only a merchant URL already present
in the Serper response. The source title must already carry model/SKU identity;
the slug is corroborating-only. Google/tracking wrappers, title/path model
conflicts, wrong-type paths, evidence/search/listing pages, and all existing
product-eligibility failures remain blocked. No redirect is followed and no
direct-product lookup was added.

`REVIEW_RADAR_NORMALIZATION_RECOVERY` is default-off. With it unset/off,
normalized candidates and normal API responses remain unchanged; debug ledgers
record exact per-result `would_recover`/`blocked` shadow annotations. The
readiness analyzer counts unique leader/run recovery opportunities instead of
repeated rejected rows. The four old readiness fixtures predate this trace:
their broad pool recall remains 1/7 under `07b` and prospective `07c`, while
recovery opportunity is NotScored. Focused C3 tests 71/71; identity/type/source-
upgrade wall 207/207; full suite 891/891 across 127 suites; typecheck/build/eval
pass; lint 0 errors/3 existing warnings. `.env.local` is unchanged.

**C2/C3 peer-review closure (2026-07-13, zero live):** Claude's deferred review
reproduced two blockers. URL-inferred model evidence could collapse a product
with an accessory whose slug named the parent model; inferred exact-model
identity now also requires the existing product-type verdict on both products.
Recovery's tracking-host denylist could miss affiliate wrappers; a recovered
URL must now positively satisfy the existing product-detail-path predicate.
Public normalization tests cover the recovery boundary, and a legitimate
robot-plus-stick combination remains eligible. Focused 134/134; full 896/896.
The checkpoint debt is paid. Before C4 spend, its design must attribute recovery
opportunity and survival on the same provider response (shadow counterfactual
or replay); separate live responses are only end-to-end confirmation. C4, flag
promotion, and R7A remain separately approval-gated.

**C4 deterministic preflight (2026-07-13, zero live):** Claude's follow-up
adversarial probe found that concise `Vac Hose`, `Utility Nozzle Attachment`,
and `Wet Dry Vac Filter Bag` titles could still borrow a parent vacuum model
from their URL. The shared shop-vac type intent now classifies those standalone
complements without rejecting a complete vacuum listing that mentions included
accessories (`c80543d`). The remaining C4 instrument uses the exact runtime
normalizers twice on each captured result and asserts runtime-mode parity. It
records all bounded URL paths but no query text/hostname as supplemental source
identity evidence, preserving title-only results beside the supplemental count.
Exact C4 request shapes, required flag/cache/commit/ledger state, and the 120-
attempt guard are validated by both capture and analysis. Invalid runs are
excluded from quality means while their spend remains counted (`0f9f0e8`).

Taylor ratified `leaders-v2026-07c` exactly as documented on 2026-07-14 before
any C4 request. It keeps the broad seven and refreshes constrained families to
Shark Matrix/AI/IQ, eufy
C10/Clean/X8, Roborock Q5/Q10, and Roomba 105/i3/i4/i5, with path-only source
evidence reported separately from title-only coverage. Taylor also explicitly
approved six live searches using 486 physical attempts as the planning basis
and a 120-attempt per-request ceiling. Broad acceptance remains ≥5/7
normalized-pool mean and ≥3/7 absolute flag-on final mean; the counterfactual
does not prove a flag-off final outcome. Constrained runs primarily validate
hard constraints and safety; constrained recall stays informational.

**C4 live result (2026-07-14; safety-stopped at 4/6):** Three broad and one
constrained request are usable, cache-cold, balanced, and commit-pinned. They
spent 227 physical attempts with zero retries/fallbacks and no ceiling trip.
The first constrained run rendered `Q10-S5_140x.jpg` on Roborock `Q10 X5+`,
reopening RR-061 and triggering the standing stop before B2/B3. Broad raw
provider presence was 7/7 in every run, but normalized-pool recall was
`1/7`, `1/7`, `2/7` (mean `1.33/7`) and final recall was `2/7`, `1/7`,
`1/7` (mean `1.33/7`). Flag-off and flag-on normalized coverage were equal,
with zero parity violations and zero leader recovery opportunities. Broad
pool/final Jaccard was `0.1778`/`0.0000`. RR-060 also regressed and RR-084 was
filed for an ice maker displayed as a robot-vacuum near match. Therefore C4
fails both recall and safety gates; recovery remains default-off, C5 cannot
unblock R7A, and no threshold is weakened. The next action requires separate
approval for deterministic diagnosis/repair, not another live window.

**Post-C4 deterministic safety repair (2026-07-14; zero live):** Taylor
approved the three-defect repair after the failed gate. Fail-first reproduced
exactly RR-061's shared-token image escape, RR-060's exact/near presentation-
stream dedupe bypass, and RR-084's enriched explicit-class near-card escape.
The image resolver now evaluates every filename model claim; final selection
deduplicates the ordered near pool against selected exact cards and itself
under the unchanged exact-model predicate; and the shared type classifier
hard-vetoes a positively recognized different product class while leaving
sparse requested-type identities unverified rather than wrong. Saved C4 cards
replay with `Q10-S5` rejected for foreign `s5`, the Amazon `18P03` near card
collapsed, and the KitchenAid ice maker hard-failing Category. Focused final
tests 132/132; full suite 911/911 across 127 suites; typecheck/build/eval pass;
lint 0 errors/3 pre-existing warnings. RR-060/RR-061/RR-084 are Fixed. This
does not change C4's failed recall result: normalization recovery remains
default-off, C5 cannot unblock R7A, and another live window is not authorized.

**C1 result (M3, four usable readiness fixtures):** the tested pre-AI pool is a
Serper `product_discovery` candidate that normalized, survived raw dedupe and
cheap prefilter; a later `candidate_merge` loss still counts as pool-present.
The merge bucket can be inflated by URL/name lineage mismatches, which may
overstate presence but cannot create false misses. Both broad runs remain
**1/7** under current `07b` and the prospective letters-plus-digits matcher;
the matcher changes broad pool recall by **0**, so the normalization diagnosis
survives the kill condition. Across all four fixtures, 15 of 22 leader/run
outcomes terminate in normalization, four after merge, and three displayed.
Recorded leader-result loss rows are 205 `normalizer_rejected_result`, 159
`search_or_listing_url`, nine requirement-filter, three merge, four cheap-
prefilter, two rank-cutoff, and one generic-title loss. These are repeated
ledger result rows, not unique products; neither normalization reason reaches
80%, so C3 must address both evidence paths unless later deterministic fixtures
prove one is derivative.

RR-060's exact gap is that strong model tokens come from metadata/title/name,
not the trusted product URL: one card carries `18P03`/`RV2310AE`, the other has
that model only in its source URL, their cross-host canonical IDs differ, and
their titles are not exact. RR-083's exact gap is likewise evidence loss: the
stored Shark name ends at `Portable Stick ...`, while the Home Depot path and
image state `Stick Vacuum`/`IZ372HD`; neither URL/image identity enters the
shared type predicate. Current ledgers intentionally discard rejected-result
URLs, so C1 cannot prove merchant-URL recoverability rates. C3 must begin with
deterministic provider-response fixtures plus flag-off shadow telemetry rather
than claiming that every wrapper rejection already contains a merchant URL.

The prospective matcher is analysis-only: letters-only line `hd`/`wd` may
match exactly letters followed by digits, while digit-ending `q5` remains
strict and `ai` cannot match `Airtok`. Current `coversLeader()` and
`leaders-v2026-07b` scoring remain unchanged pending Taylor's `07c` decision.
Claude review is required after C1 and again after C2+C3 before any C4 budget
request. No phase approval carries forward.

### R7A — default-off single-source implementation (zero live calls)

R7A lands as two commits inside one separately approved zero-live phase:

1. **Pure refactor commit.** Extract one shared downstream candidate pipeline
   from the current main route. It owns citation trust, requirement filtering,
   buying-rubric attachment, review-evidence enrichment, asset enrichment,
   missing-requirement rescue, revalidation, source-quality upgrade, and
   dedupe/scoring/final selection. Route the existing main and error-fallback
   behavior through it without changing outputs. Do not promote the current
   `buildServerSearchFallbackResult()` unchanged: it does not have full main-
   path parity. Prove flag-off route shape and saved-fixture replay parity.
2. **Behavior branch commit.** Add
   `REVIEW_RADAR_SINGLE_CANDIDATE_SOURCE=on`, default-off. Flag-on keeps the
   OpenAI strategy and gap-check calls, executes their queries through Serper,
   skips candidate-generating `openai_final_research`, and sends only normalized
   Serper recommendations into the shared pipeline. Every displayed product
   must retain a Serper candidate ID. The existing guarded narration pass may
   rewrite explanation prose only after final selection; it can never add,
   remove, reorder, or mutate product facts.

R7A fail-first coverage must prove: an LLM-invented product cannot enter the
flag-on pool; flag-on makes no candidate-generating final-research/web-search
call; strategy and gap-check still run; every displayed product has Serper
lineage; hostile narration cannot alter product set/order/prices/citations/
specs/scores/pros/cons; planner/gap/narration failures degrade safely; flag-off
behavior is unchanged; and every existing price, citation, requirement,
product-type, identity, image, eligibility, and dedupe wall remains green.
Delete no policing layer in R7A.

### R7B — live flag-on validation and promotion decision

R7B requires separate approval for the same six-search, three-per-shape
cache-cold window (use 486 physical attempts from the last complete window as
the conservative planning basis until a newer complete sample exists). Compare it primarily
with the readiness window, under the same rubric/snapshot and three-run
significance rule.

Acceptance: AI-introduced displayed products = 0; wrong-type/non-product final
cards = 0; exact hard-constraint violations = 0; broad normalized pool recall
≥5/7 mean; broad final recall ≥3/7 mean; constrained recall informational;
all ledgers balanced. Report pool/final Jaccard against the contemporary
control and the corrected historical 0.2694/0.1429 context. RR-015's ≥60%
target is never weakened: improvement below it is reported, not called Fixed.
Also report total latency, the removed final-research stage duration, OpenAI
calls, Serper calls, and cache behavior as the first consumer-readiness cost/
speed evidence. Any safety or significant recall regression leaves the flag
default-off and triggers rollback/diagnosis.

### R7C — promotion, then deletion (separate approval)

Only Taylor may promote the flag after R7B. In a later separately approved
cleanup, remove the candidate-producing final-research request, AI-plus-Serper
candidate merge, duplicated fallback plumbing, and schemas/prompts that exist
only to accept LLM products. Remove a policing branch only after a fail-first
reachability test proves it is exclusive to the retired stream. General price,
citation, requirement, product-type, identity, image, eligibility, and dedupe
trust gates remain regardless of provenance. Keep OpenAI strategy/gap planning
and the post-selection guarded explainer.

**North-Star effect:** stability and wrong-type structurally; broad/final
recall and constraint compliance are explicit non-regression gates; large
latency/cost and maintenance reduction if promoted.

## Backlog (enters a phase only with evidence + Taylor's approval)

Phase 3P/3Q source-upgrade items; RR-014/RR-015 aggregate measurement beyond
R2's attribution; full 6E baseline; latency/cost reduction (do not optimize
while results are unstable — revisit after R4); provider alternatives
(blocked until provider-vs-parser losses are separated by R2).

## Kickoff prompts (Taylor fires one at a time)

- R1: `Execute Phase R1 per docs/forward-roadmap.md. Deterministic only; stop after reporting.`
- R2: `Execute Phase R2 per docs/forward-roadmap.md. This message is my explicit approval for six live searches (~225–280 Serper calls). Stop after reporting.`
- R3: `Execute Phase R3 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`
- R4: `Execute Phase R4 per docs/forward-roadmap.md. Deterministic portion first; then this message is my explicit approval for the six-search after-sample (~225–280 Serper calls). Stop after reporting.`
- R5: `Execute Phase R5 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`
- R6: `Execute Phase R6 per docs/forward-roadmap.md. Zero live calls; stop after reporting.`
- R7 readiness: `I ratify the broad shop-vac leader list recorded in docs/agent-next-task.md. Execute the R7 readiness gate per docs/forward-roadmap.md. This is my explicit approval for six live searches (486 physical attempts is the current conservative planning basis; report actuals). Stop after reporting.`
- R7A: `Execute R7A per docs/forward-roadmap.md. Zero live calls; land the pure refactor and default-off behavior branch as separate commits; stop after reporting.`
- R7B: `Execute R7B per docs/forward-roadmap.md. This is my explicit approval for six live flag-on searches (486 physical attempts is the current conservative planning basis; report actuals). Stop after reporting; do not promote.`
- R7C promotion/deletion requires a new prompt written only after Taylor reviews R7B; no standing kickoff is pre-authorized.

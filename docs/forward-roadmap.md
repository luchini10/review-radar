# Current authority — 2026-09-06

The user authorized the ranking consolidation on main, commit, push and deployment.
Earlier backend isolation/promotion gates below are historical. Follow
docs/agent-next-task.md for current runtime and release status. No experimental
mode is supported. Existing paid-evaluation limits remain in effect.

# ReviewRadar Forward Roadmap (R/C-series history + OAI migration)

Adopted 2026-07-10. This document governs all forward sequencing. Completed
history stays in `docs/codex-handoff-phased-plan.md`; the Phase 6 measurement
method remains owned by `docs/phase-6-reliability-gauntlet-plan.md`;
`docs/agent-next-task.md` always points at the current active phase. No other
forward-plan documents may be created.

## Current authority: Phase 1 completed locally (2026-09-02)

Taylor explicitly approved Phase 1 request-time market discovery coverage,
including the sealed V1 rerun and a local commit. The accepted exact-source run
is `benchmarks/accuracy-v1/results/phase1-accepted-v5-raw.json`, SHA-256
`9EC5744A37C5063B2B663ECCFAE9865B8AF7659EDC73E97A5605D77EF27208A6`.

Phase 1 added complementary request-time neutral commerce, market-leader,
request-fit, coverage-gap, expected-target, and adaptive page-resolution paths.
It did not add persistent research or change final ranking weights. Discovery
recall improved from 62/142 to 77/142 and broad-search discovery from 19/36 to
24/36. Hard-requirement accuracy reached 118/118, wrong-product leakage fell to
3/77, and family-duplicate leakage fell to 1/77.

The next bottleneck is now explicitly downstream: candidate truncation/ranking
accounts for 43 leader losses, versus 26 at baseline. Empty searches also rose
from 8/48 to 10/48, precision fell to 31.17%, NDCG@3 fell to 0.3039, and p95
latency rose to 41,481 ms. No Phase 2 is authorized. A future proposal should
target fair compatible-candidate survival into the nine-candidate slate and
false-empty attribution before any broad final-score retune.

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

**OpenAI-only autonomous research with a deterministic trust boundary.** One
Responses API call with hosted web search discovers, researches, selects, and
ranks the finished slate. The new path sends no Serper request and receives no
application-generated query or benchmark answer. Every displayed fact must
bind to source metadata returned by that same response.

Deterministic code remains a safety boundary, not a second recommender: it may
normalize, bind sources, reject, exact-dedupe, downgrade, or clear an unsafe
optional field, but may not search, invent, rescue, score, add, or reorder
products. The current pipeline remains behind an explicit rollback mode until
the active OAI arc proves source integrity, product safety, recall, constraint
truth, stability, and human usefulness in primary and sealed-holdout evidence.
The earlier provider-authoritative verified-hypothesis draft is preserved below
as superseded history and must not be executed.

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
  logical searches, with a physical-attempt planning basis derived from the
  latest comparable run or the phase's exact bounded query formula. An estimate
  is a reporting fact, not permission to dispatch extra requests; replacements
  always require new approval. Never pool samples across windows. Stop and
  report after each phase.
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

**C5 feasibility result (2026-07-14; zero live):** The audit rejected an
immediate resolver build. C4's `7/7` path-supplemented raw-presence claim was
not type-safe: runs A1/A3 credited `Workshop` from another product's URL path,
and A2 credited a standalone WORKSHOP blower-nozzle attachment. Under the C5
contract—a structured provider product identity, a specific source title, and
the shared product-type gate—the conservative identity-lead upper bound is
`6/7` in all three broad runs. That still exceeds the `5/7` discovery
prerequisite, so Serper discovery remains viable, but it is not a renderable
pool.

Safe pages already present elsewhere in the saved request data materialize
only `2/7`, `2/7`, and `4/7` leaders (mean `2.67/7`). The ledgers omit full raw
provider fields and contain no targeted resolution lookup for identities lost
at normalization, so the missing materialization rate is NotScored rather than
assumed failure. More importantly, the existing product-page selector accepts
a deterministic wrong-brand page when category/spec words overlap, and the
shared type gate admits three standalone filter/nozzle identities. Across the
three saved fixtures, 143 qualified lead rows have at least one captured page
that demonstrates the selector's potential identity mismatch; this is a
diagnostic pairing count, not 143 observed displayed links. RR-085/RR-086/
RR-087 record the measurement, page-identity, and complement-type gaps.

Therefore C5's verdict is
`repair_product_page_identity_before_resolution_probe`. R7A remains blocked,
normalization recovery remains default-off, and no new live window is
authorized. The next separately approved phase should repair the shared page
identity and product-type trust boundaries and canonicalize the corrected raw
metric with fail-first preservation tests. Only then is a narrowly budgeted
resolution-feasibility probe decision-useful; only a passing probe can justify
a later default-off implementation.

**Post-C5 trust-boundary repair (2026-07-14; zero live):** Commit `1131101`
closes RR-085/RR-086/RR-087 before any lookup spend. The shared page selector
now vetoes corroborated foreign leading identity, foreign strong or split
models, and conflicting hard numeric specs before generic category overlap can
admit a destination. Complete product titles ending in retailer labels are no
longer mistaken for retailer-label-only evidence. The shared shop-vac type rule
now rejects standalone cartridge filters and blower-nozzle attachments while
preserving complete products that include those accessories.

The readiness analyzer now names the type-safe structured identity ceiling as
the canonical provider-discovery metric; C4's path-supplemented `7/7` remains
superseded history. Current-code replay keeps the ceiling at `6/7`, the captured
materialization observation at `2/7`, `2/7`, `4/7`, and reduces both selector-
identity and complement-gate gaps to zero. Its machine verdict advances to
`needs_live_resolution_probe`. This does not authorize that probe, a resolver,
flag promotion, or R7A. The next decision is a separately scoped and approved
bounded live resolution-feasibility probe; only a passing probe can justify a
later default-off resolver implementation.

**C5 live resolution-feasibility result (2026-07-14): PASSED AT THE FLOOR.**
Taylor approved one cache-cold probe containing eight logical Serper searches,
using eight physical attempts as the planning basis and a hard ceiling of 24;
no replacement was authorized. Instrument commit `53c193b` dispatched four
exact-identity Shopping requests and four matching organic `product page`
requests. The balanced ledger records 8 cache misses, 8 physical attempts, 0
cache hits, 0 retries, 0 fallbacks, no guard trip, and eight HTTP 200 responses.

RIDGID HD1200, Craftsman CMXEVBE17584, and Stanley SL18115 resolved through the
repaired page/type/eligibility/prefilter boundary. The generic Vacmaster lead
correctly remained unresolved rather than being attached to a more specific
variant. Projected safe materialization is `5/7`, `5/7`, and `5/7` (mean
`5.0/7`), exactly clearing the frozen pool floor. This is a feasibility
counterfactual over the three saved C4 provider runs, not end-to-end final or
stability evidence.

The vertical result materially narrows the implementation: Shopping returned
132 raw rows and zero normalized candidates; organic returned 40 raw rows, 22
normalized candidates, and every accepted page. A separately approved
zero-live implementation may therefore add only a bounded default-off organic
identity-to-product-page lookup after existing merchant recovery. It must keep
ambiguous leads unresolved and reuse every shared trust gate. This result does
not promote a flag, authorize more calls, or unblock R7A without later
end-to-end validation.

**C5 bounded organic resolution implementation (2026-07-14; zero live):**
Commit `eaeb577` adds the separately approved implementation behind
`REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION=on`, default-off. After initial and
gap-check discovery are merged, the new stage considers only a structured
Google Shopping identity whose source title is model-specific, product-like,
and positively compatible with the requested type. A result already
materialized by ordinary normalization, enabled merchant-URL recovery, or any
other selector-safe page does not trigger a lookup. Remaining identities are
deduplicated and capped at four request-wide organic
`"<identity> product page"` queries; model-less/generic identities stay
unresolved and no Shopping-resolution branch exists.

Returned pages run through the existing organic normalizer, shared cheap
prefilter, and hardened product-page identity selector before entering the
candidate pool. Wrong model/brand/type/accessory pages remain rejected, and
the existing request ledger records the parent query plus exact normalization,
prefilter, or identity-resolution first loss. Flag-off returns the original
Serper result object and dispatches no lookup; debug mode records only culled
shadow plans. The implementation does not promote either recovery flag, edit
`.env.local`, authorize spend, or unblock R7A. Full verification is 934/934
across 129 suites; typecheck/build/eval pass; lint remains 0 errors/3 existing
warnings. The latest live North Stars remain C4's failed observations; expected
pool improvement is the C5 probe's no-margin `5/7` projection and is not yet an
end-to-end result. A separately approved live flag-on validation is required
before any promotion or R7 reconsideration.

**C5 live-validation preflight (2026-07-14; zero live): BLOCKED BEFORE
SPEND.** Adversarial inspection reproduced two defects in the default-off
implementation. RR-088: `strongModelTokens()` treats hyphenated hard specs as
model codes (`12-Gallon` → `12gallon`), and the resolver allocates its four
queries in first-seen order, so spec-only or low-value rows can crowd out
recurrent genuine models. The three saved broad ledgers contain this ordering
shape, although their capped digests remain M3 rather than exact new-runtime
replay. RR-089: lead construction suppresses any row that the enabled merchant-
URL counterfactual could recover even when that separate recovery flag is
actually off, so enabling only the C5 flag can yield neither the free merchant
candidate nor an organic lookup.

The live validation is therefore postponed, not failed. The next proposed
phase is a separately approved zero-live correction: exclude hard-spec-only
tokens from this resolver's model contract; build a stable leading-brand key;
aggregate duplicate leads and prioritize distinct-query recurrence before the
unchanged four-query cap; and make the C5 flag explicitly compose safe merchant
recovery first, organic lookup second. Fail-first tests must cover both flags
off, each flag independently, real model codes across categories, spec-only
negatives, deterministic cap order, and every existing identity/type/page
gate. No live call, flag promotion, `.env.local` edit, or R7A work is authorized.

**C5 corrective hardening (2026-07-14; zero live): COMPLETE, LIVE VALIDATION
STILL GATED.** Commit `4bba870` closes RR-088/RR-089. Resolver-local model
qualification excludes compacted hard specifications without weakening shared
identity evidence; source-leading brand inference keeps horsepower `HP` from
becoming a brand while preserving real HP computers. Duplicate leads now retain
distinct parent-query and total recurrence, and the resolver prioritizes those
signals before stable first-seen order and the unchanged four-query cap.
Enabling the C5 flag also composes the existing guarded merchant-URL recovery
as its zero-cost first tier; normalization-only operation and exact both-off
behavior remain supported.

M3 recurrence ranking over the three capped C4 broad Shopping digests moves
recurrent real models ahead of spec-only rows in every run. It cannot fully
replay existing-page suppression, so this is directional saved-evidence replay,
not an exact live slate or North-Star result. Ambiguous short codes such as `Q5` remain
unresolved because the shared product-page selector cannot yet distinguish a
`Q5` target from a `Q7` page safely. Full verification is 937/937 across 129
suites with typecheck/build/eval passing and lint at 0 errors/3 pre-existing
warnings. No live call, promotion, `.env.local` edit, or R7A work occurred. The
next eligible decision is a separately approved C5 flag-on live validation; it
must measure merchant-first versus organic contribution, safety, recall,
stability, cost, and latency before any promotion decision.

**C5 flag-on live validation (2026-07-14): FAILED; DO NOT PROMOTE.** Taylor
approved six requests using 510 physical attempts as the planning basis and a
120-attempt per-request ceiling. Instrument commit `793eb4e` pins C5-specific
capture/analyzer contracts. Six requests were dispatched; five are usable,
cache-cold, balanced, and commit-pinned. The first broad request is transparently
spent/excluded: it ran with `npm start`, but local debug ledgers are disabled in
production mode, so its quality and physical-attempt data are unavailable. No
replacement was dispatched. The five usable ledgers record 398 known physical
attempts (83 + 71 + 76 + 81 + 87), two retries, zero fallbacks, and no ceiling
trip; mean end-to-end capture time was 95.6 seconds.

The two usable broad runs measured normalized-pool recall `4/7` and `5/7`
(mean `4.5/7`) and final recall `1/7` and `3/7` (mean `2.0/7`). The intended
three-run broad sample is incomplete, but the observed means already miss both
frozen floors (`5/7` pool and `3/7` final). Broad pool/final pairwise Jaccard
was `0.3889`/`0.0000`. Constrained pool recall was `3/4`, `2/4`, `3/4`; final
recall was `3/4` in every run and exact hard-constraint failures were zero.
Constrained pool/final mean pairwise Jaccard was `0.2566`/`0.0513`.

The resolver formed 243 plans, dispatched 20 organic lookups under the unchanged
four-per-request cap, and culled 223. Its ledger contribution is 79 normalized
rows, 67 unique candidates, and five final selections. All five selections
occurred in constrained runs; the two usable broad runs received zero C5 final
cards. The composed merchant-recovery tier contributed zero candidates. Thus
the mechanism does recover useful pages, but broad final utility and allocation
efficiency remain unproven.

Safety independently fails promotion. Constrained run B1 selected a Matter
Alpha `Information, Specification, News & More` page as an exact buyable Tapo
RV30 Max card with a `$193.42` price, reopening RR-078. The same run displayed a
Q7 M5+ card whose canonical/product URL identifies Q10 X5+, filed as RR-090.
No RR-061-class image regression, exact hard-constraint failure, duplicate
exact-model final pair, false accessory collapse, seed search, or malformed
outbound query was recorded. Because both a frozen quality floor and the
unsafe-page gate fail, no further live sample is decision-useful now. Both
recovery flags remain default-off, R7A remains blocked, and the next eligible
phase is a separately approved zero-live shared eligibility/metadata-identity
diagnosis and repair—not another live window or a threshold change.

**Post-C5 safety boundary (2026-07-14; zero live): COMPLETE, QUALITY GATE STILL
FAILED.** Commit `25bc313` fixes RR-078 and RR-090 deterministically. The shared
eligibility classifier now rejects information/specification/news index titles as editorial
while preserving ordinary manufacturer product-information pages. The RR-090
trace locates the first proven Q10 loss at `candidate_merge`: short adjacent
model components (`Q7 M5` versus `Q10 X5`) were discarded before generic title
similarity, allowing cross-model evidence grafting. A shared compound-model
identity primitive now vetoes that conflict in candidate merge, product-asset
enrichment, and final product-page selection while preserving matching-model
cross-retailer merge.

Full verification is 943/943 across 129 suites; typecheck/build/eval pass and
lint remains 0 errors/3 pre-existing warnings. No live call, flag promotion,
`.env.local` edit, R7A work, or threshold change occurred. This closes the two
safety blockers but does not repair C5's missed broad floors (`4.5/7` pool,
`2.0/7` final) or justify another identical live window. Both recovery flags
remain default-off and R7A remains blocked. The next decision should be a
separately approved zero-live architecture checkpoint that compares the current
Serper-only endgame with a safer model-guided-candidate-hypothesis design; it
must choose which architecture best improves verified recall without letting
the model author product facts, URLs, or card eligibility.

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

**Status after the OAI-0 architecture decision (2026-07-14): HELD AND
SUPERSEDED BEFORE IMPLEMENTATION.** R7's pure-refactor, provider-lineage, and
promotion-before-deletion discipline remain valid. Its assumption that the
current broad Serper plan is sufficient without a more specific model-guided
materialization path does not survive C5. Do not execute the old R7A/R7B/R7C
kickoffs; use the active OAI sequence below.

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

## Superseded V2 draft — verified-hypothesis pipeline (historical)

**Superseded 2026-07-14 before implementation.** Taylor selected the
OpenAI-only autonomous-research architecture recorded in the active OAI plan
below. No V2 phase in this historical section is authorized or should be
executed. It is retained only to preserve the architectural decision trail.

### V2-0 architecture decision — complete 2026-07-14 (docs only)

**Decision:** migrate the middle of the existing pipeline; do not rewrite the
app and do not add a second complete pipeline or a fourth model call.
ReviewRadar already asks OpenAI for `expectedProducts`
(`lib/discoveryStrategy.ts:54-85,431-480`) and turns some of them into Serper
queries (`lib/discoveryStrategy.ts:735-824`). The C5 evidence proves why that
primitive is not enough:

- the strategy mostly proposed generic brand-wide families rather than
  materializable products, and even emitted `brand: "M18"`
  (`tests/fixtures/review-radar-live/shop-vac.c5-flag-on-run2.json:5018-5108`);
- the useful `expected_product_target` queries were then removed by protected-
  slot, shopping-cap, or stage-truncation allocation
  (`tests/fixtures/review-radar-live/shop-vac.c5-flag-on-run2.json:5944-6284`);
- a target match currently receives a five-point credibility bonus
  (`lib/productCredibility.ts:283-303,343-348`), so model nomination is not yet
  merely a discovery hypothesis;
- after that planner/Serper path, the final OpenAI web-research call authors a
  second candidate pool and the route merges it with Serper candidates
  (`app/api/recommendations/route.ts:832-970`). C5's broad pool-to-final fall
  (`4.5/7` to `2.0/7`) proves both discovery and final selection require a gate.

The chosen target is therefore **verified model-guided discovery with
provider-authoritative products**:

1. Parse the request and hard constraints with the existing deterministic code.
2. Extend the existing strategy response with a separate, strict list of
   specific product/model hypotheses. Do not overload legacy
   `expectedProducts`, whose broad-target semantics are coupled to current
   ranking and shortlist behavior.
3. Preserve the ordinary deterministic Serper plan and its protected hard-
   constraint slots.
4. Spend a separate bounded lookup budget only on missing, specific
   hypotheses. Serper, not the model, supplies every candidate URL and fact.
5. Admit only candidates that pass the existing normalizer, product-card
   eligibility, requested-type, identity, URL, citation, price, image,
   requirement, dedupe, and revalidation gates.
6. Rank all candidates by source-derived evidence. Hypothesis origin grants no
   score, credibility, retention, or ordering advantage.
7. The model may optionally narrate the already selected slate through the
   existing mutation guard; it may never change products or factual fields.

The frozen benchmark is evaluation-only. No leader name, brand, line, or
expected answer may enter a production prompt, query, filter, score, or test
fixture that exercises app behavior (`scripts/goldBenchmark.mjs:18-23`).

### V2 invariants and rollback contract

These conditions bind every V2 phase:

- A hypothesis is an internal search lead, not a product. It cannot enter a
  candidate pool until a provider result independently materializes it.
- Model output may contain a bounded identity (`brand`, specific
  `modelOrLine`, `canonicalName`, aliases, priority, and internal search
  rationale). It may not contain or control card URLs, prices, ratings,
  reviews, specifications, citations, eligibility, requirement truth, winner
  claims, or scores.
- Final-card lineage is mandatory and fail-closed:
  `hypothesis ID (when applicable) → query ID → Serper attempt → raw result →
  normalized candidate → trust decisions → final outcome`.
- Ordinary Serper candidates keep their own lineage and priority. Hypothesis
  queries are additive and bounded; they cannot displace base or hard-filter
  queries. Model nomination never breaks a ranking tie.
- Provider position and distinct-query recurrence may be retained as
  observability-only fields. They become a small post-safety tiebreaker only if
  V2-3 proves that selection is discarding strong SERP finds and Taylor
  separately approves that behavior change.
- The current route remains the rollback path until V2-8. One default-off V2
  flag disables all new behavior; flag-off remains byte-identical.
- Any wrong-type, editorial/non-product, accessory-only, cross-model, price,
  citation, image, URL, dedupe, or hard-constraint regression stops the phase.
- A failed gate keeps V2 off. It triggers attribution or abandonment, never a
  weaker threshold or automatic replacement window.

### V2-1 — hypothesis contract, neutral scoring, and bounded probe seam

**Approval/cost:** separate approval; zero live Serper/OpenAI calls; no
user-visible behavior change.

Add a versioned `candidateHypotheses` field to the existing discovery-strategy
schema rather than repurposing `expectedProducts`. Deterministic code assigns
hypothesis IDs, validates identity specificity, dedupes aliases, rejects
generic category-only, accessory/complement, wrong-type, and explicitly
constraint-incompatible leads, and builds outbound identity queries from the
validated identity plus the request. Family-only suggestions may remain
ordinary low-priority expansion but receive no protected materialization slot.

Extract the safe inner materialization seam from
`resolveSerperIdentityLeads()`—bounded `product page` lookup, organic
normalization, cheap prefilter, eligibility/type checks, and
`productPageMatchesIdentity()`—without inheriting its Google-Shopping-provider
ID requirement or failed C5 flag coupling (`lib/search/serper.ts:4635-4839`).
The production strategy call remains single; do not add another model request.

Fail-first tests must cover: malformed brand/model identity, generic families,
duplicate aliases, planner injection text, accessories, editorial pages,
cross-category products, cross-model pages, explicit constraint conflicts,
planner failure, empty results, query sanitization, query-cap enforcement, and
flag-off parity. The current five-point target bonus remains unchanged for the
legacy path but must be zero/unreachable for V2 hypotheses. Extend the existing
ledger/analyzer rather than create a parallel measurement system, recording
proposed, invalid, already represented, dispatched, materialized, rejected,
and cap-culled hypotheses.

**Exit gate:** exact hypothesis/query caps and their physical-attempt formula
are frozen; hostile-output tests fail closed; all existing trust walls and the
full suite pass; tracked behavior is unchanged. This phase must also freeze one
broad and one constrained holdout benchmark ID before any V2 result is known.

**Expected North-Star effect:** no immediate output change; it establishes the
bounded mechanism expected to raise broad pool recall without adding a new
candidate trust source.

**Recommended reasoning level:** Highest — the schema, ranking neutrality, and
materialization boundary are load-bearing.

### V2-2 — small live hypothesis/materialization feasibility gate

**Approval/cost:** separate approval after V2-1 reports the exact formula. Run
three logical probe cases: two identical broad `shop vac` cases to expose
planner variance and one constrained robot-vacuum case. This is not a full app
run and is not promotion evidence. It uses the frozen request bytes and saved
C5 base pools, invokes only the existing strategy plus the bounded incremental
materializer, and writes untracked probe fixtures. No replacement is allowed
without new approval.

The benchmark remains absent from prompts. For each case record every sanitized
hypothesis, cull, query, provider result, normalization/safety verdict,
materialized candidate, incremental leader, latency, OpenAI call, physical
Serper attempt, retry, and reconciliation total.

**Pass only if:** both broad probes add at least one safely materialized leader
that was absent from their matched saved base pool; the resulting broad
materialized-pool mean reaches at least `5/7`; the constrained probe
materializes at least one specific requested-type product without any explicit
budget/feature contradiction; every admitted row has a specific product-detail
identity and complete provider lineage; all ledgers balance; and the approved
hard ceiling is not crossed. Constrained leader recall is reported but remains
informational.

**Kill/attribution:** if the model emits generic or stale identities, stop
before refactoring. A later separately approved experiment may repurpose—not
add to—the existing final-research web-search slot as an identity-only scout.
If useful hypotheses do not materialize through Serper, diagnose provider/query
or normalization loss. If materialization succeeds, continue to V2-3. Never
feed benchmark answers to the model or purchase an automatic retry.

**Expected North-Star effect:** broad materialized-pool recall reaches the
existing `5/7` floor in a bounded feasibility sample.

**Recommended reasoning level:** High — the architecture is fixed, but the
result needs careful causal attribution.

### V2-3 — zero-live final-selection feasibility checkpoint

**Approval/cost:** separate approval; zero live calls; no behavior change.

Replay V2-2's safely materialized provider rows through the current exported
requirement, trust, dedupe, scoring, and portfolio-selection functions. Do not
copy those rules into a probe. Use the existing first-loss/final-selection
trace to distinguish missing evidence from ranking cutoff, false collapse,
redundancy, or portfolio allocation. Record provider position and distinct
query recurrence as observations only.

**Pass only if:** the projected broad final mean reaches at least `3/7`, is at
least `+1.0/7` better than the matched control mean, no control-
covered leader is lost in aggregate, and every safety/constraint invariant
holds. If pool recall passes while final recall does not, stop adding discovery
machinery. Propose a separately approved generalized selection fix only for a
reproduced first-loss cause; do not smuggle ranking changes into V2-4.

**Expected North-Star effect:** prove that the new discovery signal can improve
final core-leader recall, not merely inflate the pool.

**Recommended reasoning level:** Highest — this decides whether discovery or
selection is now the real bottleneck.

### V2-4 — shared downstream trust-pipeline extraction

**Approval/cost:** separate approval; zero live calls; one pure-refactor commit
only; no flag or output change.

Extract one shared downstream pipeline from the main route covering citation
verification, requirement filtering, buying-rubric attachment, review evidence,
asset enrichment, missing-fact rescue, revalidation, source-quality upgrade,
dedupe/scoring/final selection, and product-page prioritization. Route current
main behavior through it with byte-identical responses. Do not promote
`buildServerSearchFallbackResult()` as the implementation: it currently
bypasses citation verification and source-quality upgrade
(`app/api/recommendations/route.ts:487-617`).

**Exit gate:** exact route-contract and saved-fixture parity, full suite,
typecheck, lint, build, and offline evaluation pass. The isolated refactor
commit is the rollback unit.

**Expected North-Star effect:** exact non-regression; it prevents the V2 branch
from receiving a weaker safety/selection path than current behavior.

**Recommended reasoning level:** Highest — this is the riskiest structural
change in the arc.

### V2-5 — default-off verified-hypothesis behavior branch

**Approval/cost:** separate approval; zero live calls; separate behavior commit.

Add `REVIEW_RADAR_VERIFIED_HYPOTHESIS_DISCOVERY=on`, default-off. Flag-on runs
the ordinary base Serper plan, materializes only missing validated hypotheses
inside the V2-1 cap, unions only accepted `RawProductCandidate` provider rows,
and sends the unified provider-authoritative pool through the V2-4 pipeline. It
skips candidate-producing `openai_final_research` and the AI-plus-Serper product
merge. Deterministic copy supplies safe result scaffolding; the existing
guarded narration pass may rewrite prose only after selection.

Required tests prove: no model-authored product or field can enter; every final
card has provider lineage; hypotheses cannot affect score/credibility/order;
planner/materializer failure degrades to ordinary deterministic Serper
discovery; hostile narration cannot mutate the slate or facts; flag-off is
unchanged; and every existing trust wall remains green. Delete nothing in this
phase. Turning one flag off is the immediate rollback.

**Expected North-Star effect:** raise broad pool and final recall while making
AI-only displayed products structurally zero; reduce instability and remove the
candidate-authoring final-research latency from the V2 branch.

**Recommended reasoning level:** Highest — this is the first complete behavior
implementation.

### V2-6 — primary paired live validation

**Approval/cost:** separate approval for six cache-cold searches, three broad
and three constrained. Derive the planning basis from V2-2 actuals plus V2-5's
exact full-request cap; do not reuse `486` by habit. Pin request bytes, commit,
flags, cache state, OpenAI-call count, and a per-request physical circuit
breaker. Spent/excluded requests count toward cost but not quality; replacements
require new approval.

Each request produces a same-response counterfactual. The control uses the base
provider pool without hypothesis-only rows; treatment adds safely materialized
hypothesis rows. Both traverse the same shared downstream code. C5 is historical
context, not the causal control.

**Promotion-quality gates:** AI-only displayed products `0`; unsafe/non-product/
wrong-type/accessory/cross-model cards `0`; exact hard-constraint failures `0`;
final provider lineage `100%`; hypothesis-origin score/credibility advantage
`0`; broad pool mean at least `5/7`; broad final mean at least `3/7` and at
least `+1.0/7` above the paired control mean; at least one incremental
hypothesis-materialized leader reaches the final set in two of three broad
runs; no aggregate loss of control-covered leaders; final-set Jaccard meets
RR-015's standing `≥60%` target; all ledgers balance; and no circuit breaker
trips. Constrained leader recall remains informational; exact constraint truth
is the gate. Report cost and latency without trading safety/quality for speed.

A failed gate leaves the flag off and triggers first-loss diagnosis, not an
automatic repeat or threshold change.

**Expected North-Star effect:** broad pool/final recall and stability improve
against a contemporary paired control; wrong-type and hard-constraint metrics
remain perfect.

**Recommended reasoning level:** High — execution is protocol-driven, but the
paired result still needs careful interpretation.

### V2-7 — holdout-category generalization gate

**Approval/cost:** only after V2-6 passes; separate approval for three
cache-cold runs of the broad holdout and three of the constrained holdout frozen
in V2-1. Use V2-6 actuals as the planning basis. No code, prompt, query, or app
test may consume holdout answers.

Use the same paired control/treatment and absolute safety, lineage, constraint,
stability, and ledger gates. Require positive hypothesis contribution with no
baseline recall regression. Constrained leader recall remains informational.
Failure is evidence of benchmark/category overfit; keep the flag off and stop.

**Expected North-Star effect:** demonstrate that gains generalize beyond the
two categories used to design and debug V2.

**Recommended reasoning level:** High.

### V2-8 — explicit promotion and reversible canary

**Approval/cost:** separate explicit approval; no legacy deletion. Enable the
single V2 flag first in local/development or a deliberately bounded canary and
record the exact promoted configuration. Do not implicitly promote pinned
planning or the C3/C5 recovery flags. Keep the legacy route intact behind
immediate flag-off rollback. Define the observation window and rollback events
before starting it; any safety incident disables V2 immediately.

**Expected North-Star effect:** make the verified quality gains available to
users while retaining one-step rollback.

**Recommended reasoning level:** High.

### V2-9 — optional legacy retirement

**Approval/cost:** separate approval only after V2-6, V2-7, promotion, and the
predeclared observation window all pass. Remove candidate-producing
`openai_final_research`, the AI-plus-Serper product merge, schemas/prompts that
exist only for model-authored cards, and duplicated fallback plumbing made
unreachable by the shared pipeline. Preserve request/constraint parsing,
deterministic search planning, the verified hypothesis planner/materializer,
Serper/cache/ledger machinery, all trust gates, and guarded narration.

Remove a policing branch only after a reachability test proves it exclusive to
the retired stream. Cleanup is optional; keeping rollback longer is preferable
to premature deletion.

**Expected North-Star effect:** preserve measured quality while reducing
candidate-source variance, latency, cost, and maintenance surface.

**Recommended reasoning level:** Highest.

### V2 dependency and stop map

```text
V2-0 plan
  → V2-1 offline contract/materializer seam
    → V2-2 small live feasibility kill gate
      → V2-3 offline final-selection gate
        → V2-4 pure shared-pipeline refactor
          → V2-5 default-off end-to-end branch
            → V2-6 six-search paired validation
              → V2-7 holdout generalization
                → V2-8 reversible promotion
                  → V2-9 optional cleanup
```

No phase approval carries forward. Live calls occur only in V2-2, V2-6, and
V2-7. A failed V2-2 ends the architecture experiment before the route refactor;
a V2-3 failure redirects work to the reproduced selection loss instead of more
discovery; any later failure leaves the V2 flag off. The two-no-improvement
rule remains binding.

## OAI — OpenAI-led autonomous research migration (active master plan)

### OAI-0 — architecture decision and amended plan (complete 2026-07-15; docs only)

**Assessment:** the strongest architecture is not “the model owns everything”
and not a return to Serper-owned discovery. One autonomous OpenAI Responses API
research call owns discovery, evidence synthesis, product selection, and
ranking. ReviewRadar then verifies the model-authored facts and destinations
without discovering, adding, rescuing, scoring, or reordering products. The new
path sends no Serper request unless a later, separately approved experiment
proves that safe direct verification is inadequate.

This remains a migration, not a greenfield rewrite. The current route already
has the critical API seam: `app/api/recommendations/route.ts:852-889` makes a
Responses API call with hosted `web_search`, required tool use, complete source
inclusion, and a strict JSON schema. The current prompt asks that call for a
broad candidate pool and then lets a long deterministic pipeline reselect it
(`lib/researchPrompt.ts:85-292`). OAI changes that contract so the same class of
call returns the finished ranked slate, followed by a narrow verification and
presentation boundary.

The active target flow is:

```text
shopper request
  -> if needed, OpenAI Call 1 organizes messy or ambiguous requirements
  -> otherwise, use ReviewRadar's already structured request fields
  -> ReviewRadar validates the requirements and inserts them into the master prompt
  -> OpenAI Call 2: one autonomous Responses API request with hosted web_search
  -> strict structured final-slate response plus returned source metadata
  -> deterministic local checks plus bounded safe verification fetches
  -> UI adapter preserving the surviving model order
```

Call 1 is conditional. It does no web research and makes no product
recommendations; it exists only to translate messy or materially ambiguous
wording into a strict organized contract covering product category, market,
budget, hard requirements, preferences, avoidances, assumptions, and unresolved
ambiguity. When ReviewRadar already has reliable structured fields, it skips
Call 1 and inserts those fields directly into the versioned master prompt. Call
2 is always the one autonomous research request. It alone decides what web
searches to run, how many are useful, which sources and products to investigate,
which products to reject, and how to rank the final slate. A normal structured
request therefore uses one OpenAI call; a request that genuinely needs cleanup
uses at most two. Bounded server-side URL verification may make ordinary HTTP
requests after Call 2, but it is not another model call, search planner, or
candidate source. No post-hoc model judge, citation-repair call, narration call,
or Serper request is hidden behind either path.

### OAI invariants

These are permanent architecture rules, not evaluation conveniences:

- The selected OAI path sends zero Serper requests. The model chooses its own
  web-search queries inside the single research response. ReviewRadar does not
  supply a generated search plan, candidate list, benchmark leader, or expected
  answer. Serper may be reconsidered only as a verification-only contingency
  after measured direct-fetch failure and a separate architecture amendment;
  it never silently returns as the discovery or ranking authority.
- Call 1 is optional, structured, and non-researching. A deterministic routing
  rule may invoke it only when required fields are missing, conflicting, or
  materially ambiguous. It may organize and label only meaning present in the
  shopper's request; it may not silently add, weaken, or remove a hard
  requirement, choose products, or manufacture a preference. Its output is
  untrusted until schema and meaning-preservation checks pass.
- The research request uses hosted `web_search` with tool use required,
  `include: ["web_search_call.action.sources"]`, strict `text.format` JSON
  schema output, explicit model/reasoning configuration, bounded output, and a
  server-owned timeout. Long requests use background execution plus polling
  rather than an unbounded synchronous connection.
- Every product, price, URL, requirement decision, pro, con, complaint, and
  material recommendation claim carries source-reference IDs. Each ID must
  resolve to URL metadata actually returned by the same OpenAI response. A
  consulted-source list alone is not claim proof; unsupported or mechanically
  unbound facts cannot display.
- A displayed Best Match needs both an exact product-detail source for identity
  and buying fields and independent evidence for quality claims. Manufacturer
  pages may establish specifications; editorial/owner sources may establish
  performance; editorial pages can never be the buy link or the product card.
- Verification has two explicitly different meanings. Local checks prove
  schema, source-ID membership, type/identity consistency, and hard-requirement
  logic. Bounded server-side fetches confirm that a referenced destination is a
  reachable exact-product page and, when mechanically checkable, that the
  claimed price/image/identity is present. Neither check is falsely described
  as proof that an arbitrary prose claim is semantically true; field-level
  source binding and sampled human semantic review remain mandatory gates.
- The verifier may parse, normalize, bind sources, fetch only already-returned
  URLs, reject, exact-dedupe, downgrade Best Match to Close Match, clear an
  unsafe optional image/URL, or fail the response. It may not issue a discovery
  search, follow an unbounded redirect chain, invent or fill a fact, merge
  uncertain identities, calculate a new product score, add or rescue a product,
  or reorder surviving products.
- All verification fetches are server-side and hostile-input safe: only HTTP(S)
  destinations, no credentials or user cookies, DNS/IP checks that block local,
  private, link-local, and metadata ranges, bounded redirects/time/bytes/content
  types, and no logging of sensitive response bodies. A blocked or inconclusive
  check fails closed or downgrades the affected field/card; it never triggers an
  automatic search or model retry.
- Model order is authoritative only after validation. If ranks 2 and 5 survive,
  they display in that relative order; deterministic code may renumber them for
  presentation but never substitute its own preference. Fewer trustworthy
  products are preferable to unsafe backfill.
- Product name, model tokens, product URL, image URL, citations, and evidence
  must describe the same identity. Editorial pages, support pages, category
  pages, accessories, incompatible variants, cross-model metadata, financing
  prices, and unknown hard requirements fail closed under the existing shared
  trust primitives wherever applicable.
- User text and web-page content are untrusted data. Prompt instructions must
  delimit user fields and tell the model to ignore instructions found in web
  sources. Production logs store prompt/schema versions, hashes, counts,
  timings, model configuration, tool actions, and source hosts—not full raw
  user prompts, model reasoning, or source text by default.
- The frozen benchmark is evaluation-only. No benchmark answer enters the
  production prompt, model input, verifier, filter, or app-behavior test.
- All repeatability gates use uncached autonomous research results. Caching may
  be evaluated later for cost/freshness, but it may not manufacture a passing
  stability score. Until then, the UI must present a server-owned research time
  and accept that fresh web research can vary.
- `legacy`, `shadow`, and `openai` modes have one explicit owner-controlled
  switch. The default remains `legacy` until promotion. Shadow output never
  reaches users. The OpenAI mode fails honestly on an unusable response; it
  does not silently spend on or fall back to Serper. Switching the global mode
  back to `legacy` is the rollback.
- No phase approval, live budget, model choice, threshold, or promotion carries
  into the next phase. No automatic retry or replacement request is permitted.

### OAI-1 — historical evidence audit, master prompt, and isolated adapter

**Approval/cost:** separate approval; zero live OpenAI/Serper calls and zero
external verification fetches; no route or user-visible behavior change.

Start with the cheapest available evidence. Analyze the 56 saved live JSON
fixtures using the existing measurement stack and score the model-authored
`final_openai_research` rows wherever explicit lineage exists (currently 20
fixtures). Report leader coverage, selected-card contribution, identity/URL/
price safety signals, and first loss. This is supplemental evidence, not a
go/no-go result: the old research prompt received app-generated queries and a
Serper candidate list, so it did not exercise the proposed autonomous
architecture. Do not infer autonomous quality from rows whose lineage is absent
or indeterminate, and do not perform fresh URL or price checks in this step.

Then create versioned contracts for the normalized shopper request, optional
Call 1 requirement-interpreter output, master prompt, strict final-slate JSON
schema, source registry, per-claim source references, verification decisions,
and UI adapter. The final response must separate identity, purchase offer,
requirement checks, quality evidence, owner/expert complaints, tradeoffs, and
presentation copy so evidence can be bound field by field. Server time—not
model text—records when price/availability was observed. An image is optional
and displays only when its exact-product identity can be established; otherwise
use the existing placeholder.

Build an isolated mocked adapter around the existing OpenAI client seam. Freeze
the exact request payload shape, output/token ceilings, timeout/polling policy,
safe logging, refusal/incomplete/error behavior, cost ledger, and the boundary
between source binding, mechanical verification, and semantic review. Begin
with a current web-search-capable production model at `high` reasoning; do not
assume `xhigh` is better. OAI-2A measures the returned model ID and actual
usage. A later one-variable comparison may promote `xhigh` only if quality
evidence justifies its added latency/cost.

Freeze a 30–50-scenario evaluation catalog from existing request shapes and
fixtures without running it live. Partition it before results into prompt-
development, primary, and sealed holdout sets covering broad and constrained
requests, sparse and common categories, ambiguous input, incompatible
requirements, accessories, editorial traps, cross-model pages, financing
prices, duplicate variants, missing sources, and prompt injection. Existing
C4/C5 outputs are historical baseline evidence; do not buy a fresh legacy
baseline or Claude's proposed ~45-call research window before the core bet is
proven.

**Exit:** the historical analysis is reported with its contamination limits;
mocked strict-schema responses parse; every displayable field has a source-
binding and verification disposition; hostile and incomplete examples fail
closed; request hashes and versions are reproducible; the exact OAI-2A call
count and hard ceiling are stated; all current tests stay green; production
behavior is unchanged.

**Recommended reasoning level:** Highest. This phase defines the master prompt,
evidence semantics, and boundary that determine whether every later quality
number is trustworthy.

### OAI-2A — three-case technical and evidence-feasibility kill gate

**Approval/cost:** separate approval only after OAI-1 reports the model
configuration, token budgets, hosted-search expectations, and dollar/tool-call
ceiling. Use three complete shopper cases from three categories: one broad
structured request, one hard-constrained structured request, and one messy
ambiguity/injection request. The first two must skip Call 1; the third uses Call
1 plus Call 2. The planned total is four OpenAI API calls: one non-researching
interpreter and three autonomous research calls. Call 1 has no web tool; each
Call 2 autonomously controls its hosted searches. Zero Serper calls, zero
retries, and no replacement without new approval. Results are untracked
research fixtures and never display.

Record the exact redacted request hash, model and reasoning configuration,
tool actions and queries when returned, complete consulted-source list,
annotations, structured output, field-to-source bindings, refusals/incomplete
status, tokens, hosted-search calls, latency, and cost. Manually inspect every
proposed card and a stratified set of claims against its referenced pages;
mechanical URL membership is necessary but does not establish semantic support.
The phase approval must explicitly include those bounded human source-page
opens; the application itself does not dispatch the OAI-3 verifier yet.

**Pass only if:** all three Call 2 requests invoke web search and return valid
strict output without a repair call; every displayable-field candidate binds to
same-response source metadata; product-detail and independent-evidence roles
are distinguishable; the constrained case has zero requirement contradiction;
the adversarial case follows the application prompt rather than user/source
instructions; and there are zero editorial, accessory-only, cross-model,
invented-URL, financing-price, or unsupported-image cards.

**Kill condition:** if one autonomous call cannot return mechanically bindable
and manually supportable evidence, stop this architecture before permanent
verifier or route work. Do not weaken source requirements or add a hidden
second judge call merely to make the experiment pass.

**Recommended reasoning level:** High for execution; Highest for a disputed
source-support or go/no-go judgment.

**Actual result — FAILED / architecture stop (2026-07-16).** The first locally
accepted and source-audited OAI-2A case, broad `primary-01`, passed the strict
schema and same-response URL-membership validator after the background-
retrieval repair.
The bounded human audit then found a material semantic failure: the accepted
Shark HZ4002 card claimed `$319.99` from its exact Best Buy page, while that
page's exact HZ4002 product block listed `$329.99`; `$319.99` belonged to a
different related Shark product on the same page. The audit also found that
the professional source titled for Shark AZ4002 identifies the tested model
internally as AZ405KT1, leaving exact-model performance attribution unsafe,
and that the Dyson page no longer exposed the claimed 4.0/1,944 owner-rating
data. RR-091 records the generalized price-binding defect.

This meets the predeclared OAI-2A kill condition: a mechanically registered
URL did not make the accepted purchase fact manually supportable. Remaining
`primary-04`/`primary-12` calls, OAI-2B, and OAI-3 must not proceed under this
plan. The gate is not weakened and the spent result is not relabeled as a
pass. Any future OpenAI-led architecture requires a new owner-approved roadmap
amendment that places independent semantic verification before display; it
cannot silently continue as OAI-2A or bring forward OAI-3 without revisiting
the dependency and cost model.

### OAI-H0 — verified-hybrid architecture reset (complete 2026-07-16; docs only)

**Owner decision:** Taylor rejected the unsafe direct-to-display version of
OAI-2A and approved a new hybrid experiment through H2. This is a different
architecture, not a weakened OAI-2A result and not permission to resume
OAI-2B/OAI-3. OAI-2B through OAI-10 below remain historical, unreachable plan
text unless a later amendment explicitly reuses a rule.

**Objective:** preserve the autonomous research call's strongest behavior—web
discovery, evidence synthesis, product selection, ranking, and explanation—
while putting an independent, bounded server-side fact boundary between its
draft and the UI. OpenAI chooses *what to recommend*. The verifier decides
*which identity and transactional facts are safe to display*.

The replacement target flow is:

```text
structured shopper request
  -> ReviewRadar validates and inserts the fields into the master prompt
  -> one Terra/high autonomous Responses API call with hosted web_search
  -> provisional ranked slate, narrative, field-level source IDs, and source URLs
  -> bounded exact-identity / exact-offer verifier over already-returned URLs
  -> verified display facts plus source-bound narrative
  -> UI in the surviving OpenAI relative order
```

Call 1 remains conditional and is absent for ReviewRadar's complete structured
form. It may later organize genuinely messy or ambiguous input, but it is not
part of H1/H2 and cannot research or recommend products.

#### H0 authority and trust contract

- The autonomous response is authoritative for candidate identity proposals,
  product selection, rank, comparison, and narrative only after the existing
  schema, requirement, source-membership, and hostile-input checks pass.
- Model-authored price, currency, seller, purchase URL, availability, image,
  and owner-rating/count are **provisional hints**. They never become trusted
  merely because a registered source URL contains the same value somewhere.
- The verifier is authoritative for displayed identity and transactional facts.
  It may emit an independently observed value from a source entity that proves
  the same exact product—for example, replacing a provisional `$319.99` with an
  exact HZ4002 offer of `$329.99`. This is bounded fact materialization, not
  recommendation repair: it may not introduce a product, change rank, generate
  a query, choose a substitute, or infer a missing identity.
- Exact-model corroboration prefers stable identifiers (`model`, `sku`, `mpn`,
  or `gtin`) and otherwise requires non-conflicting brand plus strong model
  tokens within the same product entity. Page titles, URL membership, related-
  product carousels, and family-name similarity are insufficient alone.
- A price/availability/image/rating is trusted only when it is attached to the
  same verified product entity. Values found elsewhere on a multi-product page
  are contradictions or unrelated evidence, not fallback candidates.
- Editorial evidence may support narrative performance claims only for the
  exact tested model. It can never become a purchase destination or establish
  a current offer. Cross-model test evidence is removed from the affected
  claims without automatically removing an independently verified product.
- Arbitrary prose truth is not claimed to be mechanically solved. Displayable
  narrative retains field-level source binding; primary and holdout gates use
  sampled human semantic review. Exact identity and transactional fields use
  the machine-verification boundary.
- Verification decisions are reason-coded as `verified`, `contradicted`,
  `inconclusive`, `unavailable`, or `cleared`. Every observed value records the
  source URL and server observation time. Blocked or ambiguous evidence fails
  closed; it never causes a model retry or product rescue.
- The verifier may fetch only source URLs returned by the same autonomous
  response. It may not discover, add, rescue, score, merge uncertain identities,
  create narrative, or reorder products. Surviving products keep OpenAI's
  relative order; fewer trustworthy cards are preferable to backfill.
- Fetches are server-side and credential-free with HTTP(S)-only URLs, DNS/IP
  blocking for local/private/link-local/metadata ranges, bounded redirect hops,
  time, bytes, and content types, and no sensitive body logging.
- `legacy` remains the default and rollback. H1/H2 are isolated evidence work;
  they do not wire a route, edit `.env.local`, promote a flag, or affect users.

#### H1 — offline verifier contract and mocked boundary

**Approval/cost:** approved with H0; zero OpenAI, Serper, response retrieval,
external page fetches, route changes, or user-visible behavior.

Implement the smallest generalized verifier seam that can express the H0
contract. Begin with fail-first adversarial evidence for: HZ4002's neighboring
product price, AZ4002/AZ405KT1 cross-model editorial evidence, Miele's
dealer-only action, and Dyson's absent current review breakdown. Separate page
observation from policy so controlled fixtures can exercise both without
network access. Add a mocked fetch seam with the H0 URL/redirect/size/type/
timeout/SSRF contract, but do not dispatch it.

**Pass only if:** the known unsafe fields are contradicted or cleared; safe
identity/offer evidence remains usable; unrelated failures do not erase a whole
card; no branch discovers, ranks, rescues, or narrates; no product/retailer/
category exception is added; and the focused plus full verification wall is
green. If the policy requires page-specific exceptions, stop instead of
encoding them.

**Recommended reasoning level:** Highest. This is the permanent transactional
trust model even though its first execution is isolated.

#### H2 — bounded ten-source direct-verification feasibility gate (complete: FAIL 2026-07-16)

**Approval/cost:** approved after H1; zero OpenAI, Serper, response retrieval,
search, retry, replacement, route, flag, or user-visible change. Inspect only
the ten unique URLs already registered by the accepted `primary-01` response.
Use at most ten top-level fetches, one per URL, no retry, at most two redirects
per fetch, and a hard ceiling of 30 physical HTTP attempts including redirects.

Run the H1 verifier against fresh, server-timestamped observations and compare
its decisions with the frozen human audit. Record URL host, final URL, status,
content type, bytes, redirects, extraction disposition, verification receipts,
and a content hash; never record credentials, headers, cookies, or complete
page bodies. Page drift is reported rather than silently treated as verifier
error.

**Pass only if:** there are zero false `verified` decisions; the HZ4002
same-page price, AZ4002/AZ405KT1 mismatch, Miele dealer-only availability, and
Dyson unavailable rating are caught when the current page still exposes the
relevant evidence; at least three of four products retain independently
verified identity and a usable destination; at least three retain a verified
current offer or an honest unavailable/inconclusive disposition; and no
retailer-specific rule is required.

**Failure attribution:** distinguish hostile/blocked fetch, absent structured
commerce data, page drift, extraction failure, and unsafe ambiguity. If direct
fetching is unsafe or materially inadequate, stop before integration. Taylor
then chooses between fewer verified cards, one separately approved
verification-only exact-model provider experiment, or ending the hybrid. No
provider contingency is authorized by H0-H2.

**Recommended reasoning level:** High for collection; Highest for the
feasibility judgment.

**Actual result:** The commit-pinned runner `858ad9a` dispatched exactly ten
registered top-level URL fetches and ten physical HTTP attempts, with no
redirect, retry, OpenAI call, or Serper call. Six bounded HTML pages were
available. Two responses exceeded the two-megabyte limit and both Best Buy
pages failed at the transport layer. Only Miele and Dyson retained independently
verified identity plus a usable destination (`2/4`, below the `3/4` floor).

The verifier safely retained Miele's and Dyson's exact offers, marked Miele's
dealer-only action unavailable, and cleared Dyson's unavailable owner-rating
data. It did not preserve HZ4002's unsafe provisional price because the exact
Best Buy source was inaccessible. However, the TechGearLab observation marked
AZ4002 page identity and image verified from Product JSON-LD while failing to
extract the frozen AZ405KT1 tested-model conflict. RR-092 therefore prevents a
zero-false-verified finding. H2 fails on both coverage and unresolved editorial
ambiguity. H3 is blocked; the direct-fetch verifier must not be integrated.

#### Post-H2 dependency

```text
OAI-H0 architecture freeze
  -> H1 offline verifier contract and mocked boundary
    -> H2 ten-source direct-verification feasibility
      -> if direct verification passes: H3 default-off hybrid integration
      -> if access/format alone blocks it: optional H2B exact-model verification oracle
      -> if safe bounded verification is not viable: retain legacy and stop
```

H3 and later quality, holdout, rollout, or retirement work require new detailed
gates and separate approval after the H2 evidence. The existing OAI-2B through
OAI-10 sequence below is retained only as historical context and is not an
active dependency map.

#### H2B — four-product verification-only commerce oracle (failed 2026-07-16)

**Owner direction:** Taylor first authorized the zero-spend preflight, then
explicitly approved four Serper Shopping searches with four physical attempts
as both the planning basis and hard ceiling. Retries, fallbacks, replacements,
cache reuse, additional queries, direct page fetches, OpenAI calls, and H3 work
were forbidden.

**Objective:** test whether Serper Shopping can fill only the transactional
verification gap that defeated direct fetch, without restoring Serper as a
discovery/ranking pipeline. The accepted OpenAI `primary-01` slate, four product
identities, and relative order remain frozen. H2B may verify or leave a product
inconclusive; it cannot add, replace, rescue, merge, score, or reorder one.

**Frozen requests:** one uncached `/shopping` request per product, in this order,
with body `{ "gl": "us", "hl": "en", "num": 20, "q": QUERY }`:

1. `Shark AZ4002 vacuum cleaner`
2. `Miele 12704570 SUZE0 vacuum cleaner`
3. `Shark HZ4002 vacuum cleaner`
4. `Dyson V16 Piston Animal vacuum cleaner`

The proposed live budget is exactly four logical searches and four physical
attempts, with zero retry, endpoint fallback, replacement, cache reuse, direct
page fetch, OpenAI call, or additional query. A checkpoint is written before
the first request and after each result; existing evidence makes the runner
refuse accidental repetition.

**Trust boundary:** an offer verifies only when one Shopping row contains the
target brand and at least one stable exact model/SKU token in its title, a named
seller, a positive current price, and a non-Google merchant product URL that
passes the existing eligibility boundary. Google wrappers, search/listing
pages, wrong/missing models, accessories, used/refurbished/open-box products,
missing sellers/prices, and ineligible pages fail closed. Provider order chooses
the first qualifying exact offer; price is never minimized across unrelated
rows. Model-authored provisional facts are never fallback values.

H2B verifies identity, price, seller, destination, and optional image/rating
metadata only. It does not validate editorial prose. RR-092 remains binding:
professional claims and model-specific editorial imagery stay hidden unless a
separate positive exact-tested-model receipt exists.

**Pass only if:** at least three of four frozen products receive an exact new-
product offer with a usable merchant destination; the frozen human audit finds
zero wrong product/model/variant/accessory, price bleed, Google wrapper, used
offer, or unsafe field binding; all four requests reconcile exactly; and no
product-specific or retailer-specific rule is required. One unsafe `verified`
decision fails H2B. Inconclusive products remain absent rather than rescued.

**Preflight actual:** commit `deac842` adds the isolated pure verifier, 11
adversarial tests, and a default-dry runner. Fail-first caught a replacement-
filter offer that the shared eligibility/type checks alone admitted; an
isolated generalized accessory-offer veto now rejects it while preserving a
complete product that includes an accessory. The complete wall passes
1004/1004 across 138 suites; typecheck, build, offline evaluation, and diff
checks pass; lint has zero errors and three pre-existing warnings. No provider
request had been sent at preflight close and production was unchanged.

**Live actual and verdict:** FAIL. The runner made exactly four Shopping
requests and four physical attempts, all HTTP 200, with no retry, fallback,
replacement, cache reuse, additional query, page fetch, or OpenAI call. The
responses contained 121 Shopping rows (40, 40, 25, and 16), but every URL
exposed through `productLink`, `product_link`, or `link` was a `google.com`
Shopping/search wrapper. Twelve rows carried a target stable identifier; all
were rejected for lacking a usable merchant product URL. Miele and HZ4002 had
no stable model/SKU in any returned title. The frozen audit found zero unsafe
accepted bindings because the verifier accepted no offer. Coverage was `0/4`,
below the `3/4` gate, so Serper Shopping in this response shape is not a viable
standalone transactional verifier. Sanitized untracked evidence SHA-256:
`224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.
H3 remains blocked and production remains unchanged.

**Recommended reasoning level:** High for the four mechanical requests;
Highest for the frozen-audit and architecture verdict.

#### H2C — token-bound product-offers capability probe (complete; failed safely)

**Zero-live architecture decision (2026-07-16):** do not patch or rerun H2B,
and do not end the verified-hybrid hypothesis solely because Serper's Shopping
response omitted merchant destinations. Official provider documentation shows
that a materially different two-stage commerce contract exists: SearchAPI's
[Google Shopping API](https://www.searchapi.io/docs/google-shopping) returns a
`product_token` for a Shopping entity, and its
[Google Product Offers API](https://www.searchapi.io/docs/google-product-offers)
accepts that token and documents offer-level merchant names, prices, stock
details, and direct retailer links. This is the missing capability, not a query
rewrite. The docs review made zero provider/API calls and changed no code.

SearchAPI is the first candidate because its Product Offers response is narrower
than a general product-research payload and explicitly exposes the fields H2B
lacked. SerpApi's current Immersive Product API documents a similar token-to-
stores flow, but it returns a broader product/review/insight payload that H2C
does not need. There is no runtime fallback between vendors. SearchAPI's May 15,
2026 token-contract change is a durability warning: any implementation must
version the adapter and fail closed when the token or offer schema changes.

**Proposed scope:** H2C is still a feasibility probe, not integration. It may
receive only the same four frozen OpenAI-proposed identities and preserve their
relative order. For each identity it may:

1. issue one exact `google_shopping` query using frozen `gl=us`, `hl=en`, and
   brand + stable model/SKU + category;
2. select the first provider-ranked `shopping_results` entity whose title has
   the target brand and stable model/SKU and that supplies a `product_token`;
3. issue one `google_product_offers` request with only that token; and
4. verify the first new, in-stock offer whose canonical product and offer title
   do not conflict, whose offer title carries the stable model/SKU, and that
   supplies seller, positive USD price, and a non-Google HTTP(S) merchant URL.

No exact Shopping entity means inconclusive and no offers call. H2C cannot use
shopping ads, choose a substitute, expand a query, rescue a product, minimize
price across offers, fetch a merchant page, add/reorder a card, or use provider
reviews, critic insights, specifications, or prose. Model-authored values never
fill a missing provider field.

**Proposed live bound:** at most four Shopping calls plus four token-bound
Offers calls: eight logical/eight physical attempts as both planning basis and
hard ceiling. No retry, fallback, replacement, cache reuse, second page,
additional query, direct page fetch, OpenAI call, or H3 work. A dry-by-default
runner and mocked adversarial verifier must be completed and committed before
Taylor is asked for numeric live approval. A new server-only SearchAPI key is a
separate owner prerequisite; do not edit `.env.local` or create an account
without instruction. The provider advertises 100 free requests, but neither
free quota nor account creation is assumed.

**Zero-live preflight result (2026-07-16):** commit `9b81369` adds the isolated,
versioned verifier, a default-dry runner, and mocked adversarial tests. The
runner prints exactly the four frozen Shopping queries, follows only an exact
same-row token, redacts the token from evidence, checkpoints attempts, refuses
an existing evidence path, and requires `--execute --approved-attempts=8`
before it can contact SearchAPI. It performs no retry, fallback, replacement,
page fetch, discovery, substitution, score, or reorder. The verifier fails
closed on schema drift, ads, token/field gaps, wrappers/listings, accessories,
non-new/unavailable offers, cross-brand identity, conflicting model codes, and
broad family-only matches such as another V16 that omits the target's
descriptive model terms. Focused tests pass 24/24; the complete wall passes
1017/1017 across 139 suites. Typecheck, build, offline evaluation, targeted
lint, runner syntax/dry-run, and diff checks pass; repository lint remains zero
errors with three pre-existing warnings. No live request or production behavior
occurred. Live H2C still requires both a server-side key supplied by Taylor and
a separate numeric approval.

**Live result (2026-07-17): FAILED SAFELY.** Taylor supplied the server-side
key and approved the frozen one-run ceiling of eight physical attempts. The
commit-pinned runner completed all four Shopping targets in six physical
requests: four `google_shopping` requests and two token-bound
`google_product_offers` requests, all HTTP 200, with no retry, fallback,
replacement, extra query, page fetch, OpenAI call, or Serper call. Shark
AZ4002 and Dyson V16 Piston Animal each produced an exact, new, in-stock offer
with a direct retailer URL. Miele Guard L1 Cat & Dog and Shark HZ4002 did not
advance because SearchAPI's otherwise plausible Shopping titles omitted the
frozen stable identifiers `12704570`/`SUZE0` and `HZ4002`; weakening that
identity boundary was not allowed. The frozen human audit found zero unsafe
accepted bindings, but coverage was only `2/4`, below the required `3/4`.
Sanitized untracked evidence SHA-256:
`fb8b6cc813b3398fca45818d5f80fd90649f12cd9dfda47f8a333816da526ef4`.
This ends the SearchAPI provider experiment under the frozen contract. Do not
retune it, try another provider, or begin H3 without a new owner architecture
decision. Production remains unchanged, and RR-092 remains unresolved.

**Pass only if:** at least three of four products receive an exact new-product
offer and direct merchant destination; all calls reconcile; the frozen audit
finds zero wrong model/variant/accessory, price bleed, wrapper, used offer, or
unsafe binding; and no product/retailer/category exception is required. One
unsafe accepted offer fails H2C. Failure ends this provider experiment and
returns the architecture to an owner decision rather than trying another
vendor or query in the same phase.

An H2C pass would establish transactional feasibility only. It would not fix
RR-092 or authorize H3: professional claims, exact-tested-model imagery, and
arbitrary editorial prose remain hidden until a separately approved trust
decision defines evidence that can safely support them.

**Recommended reasoning level:** Highest for the offline verifier and verdict;
High for the bounded mechanical requests if they are later approved.

### OAI-T1 — two-layer recommendation and field-trust contract (complete locally 2026-07-17; zero live)

**Owner decision:** Taylor approved the first zero-live step of the two-layer
architecture after the unguarded Terra diagnostic. OAI-T1 does not revive H3
or authorize a route, provider call, formatting call, feature flag, UI change,
or deployment. It freezes the boundary those later steps must obey.

**Target flow:** Terra remains authoritative for product selection, relative
order, and recommendation reasoning. A later formatting step may only extract
verbatim identity and prose from Terra's natural answer and bind it to URLs in
the same Responses API source registry. It cannot research, add a product,
rewrite a claim, change order, or introduce transactional fields. A separate
receipt may attach exact identity, current price, seller, availability, direct
product URL, and exact-variant image only after deterministic verification.

**Field trust classes:**

1. `research_synthesis` — rank, rationale, best-for, tradeoffs, pros, and cons.
   Display label: `AI research synthesis`.
2. `source_reported` — specifications, professional-performance statements,
   owner feedback, and warranty/support claims. Each claim retains source IDs
   and an evidence-scope label (`exact_model`, `family_or_variant`,
   `category_or_general`, or `unresolved`). Citation presence does not promote
   these claims to independently verified truth.
3. `verified_transactional` — exact identity/model/variant, current price,
   seller, availability, direct product URL, and exact-variant image. These
   fields require an exact receipt whose target and observed identity
   fingerprints agree and whose URL passes the existing product-detail
   eligibility boundary.
4. `unresolved` — any risky field without a valid receipt. The recommendation
   remains visible, but commerce shows `Check current price`, the image is
   omitted, and exact model/variant is labeled not independently verified.

**Immutable recommendation rule:** the receipt layer cannot introduce, delete,
replace, rescue, score, or reorder a recommendation. Unknown receipts are
ignored. Invalid, review/listing-page, cross-variant, fingerprint-mismatched, or
competing receipts fail closed at the field level and leave the card intact.
Receipt arrival order cannot select among competing offers.

**Offline implementation:** `lib/twoLayerRecommendation.ts` defines strict
Zod schemas, response-source membership checks, raw-answer SHA-256 binding,
verbatim text checks, recommendation-order preservation, identity fingerprints,
trust labels, field-level receipt decisions, and the presentation contract.
`tests/twoLayerRecommendation.test.mjs` provides 11 adversarial controls,
including the captured Best Buy review-page price class and the Dyson
cross-variant evidence class. The module is isolated and has no production
caller.

**Verification:** focused 11/11; full 1028/1028 across 140 suites; typecheck,
targeted lint, build, offline evaluation, and diff checks pass. No OpenAI,
Serper, SearchAPI, external-page fetch, route, flag, secret, or user-visible
change occurred. The implementation is committed as an isolated OAI-T1 phase.

**Next decision:** a later OAI-T2 may prototype an extraction-only formatter
against saved Terra evidence, with no web tool and no authority to add facts.
That phase needs separate approval. It must use this validator before any card
construction and remains isolated from the production route.

**Recommended reasoning level:** High. The trust architecture is now frozen;
the next work is a bounded formatter-provenance implementation and adversarial
review, not a new product-strategy decision.

### OAI-T2 — deterministic master-prompt formatter (complete locally 2026-07-17; zero live)

**Owner decision:** Taylor approved OAI-T2 directly after OAI-T1. This is an
isolated formatter-provenance phase. It authorizes no OpenAI call, web search,
external fetch, route integration, flag, `.env.local` change, deployment, or
user-visible behavior.

**Architecture decision:** the saved Terra answer already follows the universal
master prompt's repeated numbered Markdown sections. OAI-T2 therefore uses a
deterministic parser rather than a second formatting-model call. This preserves
the one-main-OpenAI-call design, removes formatter hallucination and added-cost
risk, and makes every transformation auditable. The tradeoff is fail-closed
format sensitivity: a missing required heading or non-contiguous rank rejects
the formatted result instead of guessing.

**Formatter contract:** `lib/twoLayerFormatter.ts` recognizes only numbered
`Best Match`/`Close Match` blocks and requires `Why it ranks`, `Overall
assessment`, `Pros`, `Cons`, and `Sources` sections. It:

- preserves the numbered order and uses the explicit recommendation-status
  line when it differs from the heading;
- copies identity, assessment sentences, pros, cons, and source-reported claims
  as verbatim substrings of the raw answer;
- accepts only URLs and titles present in the same Responses API source
  registry, assigning stable local source IDs;
- omits every `Current price` section from the structured research layer;
- converts specification, professional-test, and owner prose only to
  `source_reported` claims with `unresolved` evidence scope; and
- passes the result through OAI-T1's hash, source, text, order, and strict-schema
  validator before any card construction.

**Saved-evidence result:** the untracked July 17 Terra diagnostic formatted
offline into the same five recommendations and order: SEBO D4, SEBO E3, Shark
AZ4002, Dyson Gen5detect Absolute, and Kenmore BC4030. It retained Dyson's
explicit `Close Match` status, registered 21 recommendation-section sources,
ignored all five transactional sections, and produced five cards with
unverified commerce and unverified exact identity. Every extracted claim kept
`unresolved` scope. No raw response or derivative live fixture was committed.

**Verification:** OAI-T2 focused 9/9 and combined T1+T2 20/20; complete
1037/1037 across 141 suites; typecheck, targeted lint, build, offline
evaluation, and diff checks pass. The implementation is isolated and remains
committed as an isolated OAI-T2 phase.

**Next decision:** before route work, review the five-card saved-evidence output
as a presentation contract. The strongest next candidate is a zero-live OAI-T3
UI/presentation prototype that renders these trust labels and missing-commerce
states from sanitized controlled data without calling Terra or connecting the
production recommendation route. A live formatter test is unnecessary because
OAI-T2 has no model formatter.

**Recommended reasoning level:** High. The remaining judgment is whether the
unverified-field presentation is useful and honest enough for shoppers; the
mechanical parser itself no longer needs Highest reasoning.

### OAI-T3 - development-only trust-state UI prototype (complete locally 2026-07-17; zero live)

**Owner decision:** Taylor approved OAI-T3 immediately after authorizing the
OAI-T2 commit. This phase is presentation proof only. It authorizes no OpenAI,
Serper, SearchAPI, or direct-page call; no production recommendation-route
connection; no feature flag; no `.env.local` change; and no deployment.

**Presentation decision:** ReviewRadar can keep a useful recommendation visible
without pretending every field has the same evidence strength. The isolated
preview renders three controlled states:

- `AI research synthesis` for Terra-owned selection, order, and explanation;
- `Source-reported` plus evidence scope for factual prose that a cited source
  reports but ReviewRadar has not independently proved; and
- `Independently verified` only for exact identity or commerce fields attached
  by the deterministic OAI-T1 receipt boundary.

When exact identity, price, purchase URL, availability, or image lacks a valid
receipt, the product remains visible while the interface shows an exact-
identity warning, `Check current price`, no purchase link, and a withheld-image
state. A controlled verified-offer card proves the positive state without
asserting a real product fact.

**Isolation:** `/oai-t3-preview` exists only when `NODE_ENV=development`; a
production build returns HTTP 404 for the same route. The page uses three
generic `Example` products and a controlled source registry. It is not linked
from the app and never consumes the saved live response or production route.

**Verification:** five focused tests and the complete 1042/1042 wall pass
across 141 suites; typecheck, targeted lint, production build, offline
evaluation, and diff checks pass. In-app browser inspection covered the normal
desktop viewport and a 390px mobile viewport. The first mobile pass exposed a
long-badge min-content overflow; the generalized `minmax(0,1fr)`/wrapping fix
removed all overflow offenders and horizontal scroll. Desktop showed three
cards and no console errors. The production server returned 404 for the route.

**Next decision:** Taylor should judge whether this trust presentation is clear
enough before any route work. If accepted, a separately approved OAI-T4 should
first define the smallest default-off integration seam and its failure states;
it must not add a live call or transactional fallback merely to make the cards
look complete.

**Recommended reasoning level:** Highest for OAI-T4 planning because it is the
first step that could connect the new trust contract to the application route;
that decision affects architecture, fallback behavior, and customer-visible
failure semantics.

### OAI-T4 - default-off two-layer route architecture (T4A/T4B/T4D/T4F committed; T4C/T4E safe-failed 2026-07-18)

**Assessment:** the two-layer path is still the strongest route to the product
objective, but a direct synchronous splice into the legacy handler would be the
wrong implementation. The July 17 Terra diagnostic took `235.903` seconds,
while `app/page.tsx` aborts the current request after `180000` ms. Keeping one
browser request open would therefore make a known-good research response look
like an application failure and would depend on undeclared hosting timeouts.
OAI-T4 must use the Responses API's background create/retrieve lifecycle and a
short-lived app job contract. Retrieval polls are not additional research
creates and do not change the one-main-OpenAI-call architecture.

Route integration is necessary but not sufficient: it removes the translation
gap between the successful natural Terra answer and the T1-T3 presentation. It
does not prove repeatability, factual support, transactional coverage, or
production readiness. T4 therefore remains default-off and zero-live until its
offline gates pass. The old OAI-2B through OAI-10 sequence remains historical;
it is not silently revived by this plan.

**Alternatives rejected:**

- Do not add a second prototype endpoint that must later be migrated into the
  real route. The real `/api/recommendations` boundary should dispatch by an
  exact server-only mode while leaving the legacy response byte-compatible.
- Do not insert the natural answer into the 1,679-line legacy reconstruction,
  normalization, scoring, enrichment, or Serper pipeline. That recreates the
  stage-loss problem the two-layer design is meant to remove.
- Do not coerce T1 cards into the legacy `RecommendationResult` shape. That
  would erase the explicit trust classes and invite unsafe price/image/URL
  placeholders.
- Do not automatically retry, run Serper, or fall back to legacy after an OAI
  failure. A fallback would hide which architecture answered, could double
  spend, and would make failures and quality measurements uninterpretable.
- Do not add an OpenAI requirement-interpreter call. The existing deterministic
  request normalizer already preserves category, budget, Important Details,
  Smart Features, and hard constraints/dealbreakers. Code will insert both the
  normalized requirements and verbatim original fields as delimited data.

**Frozen target flow:**

```text
POST /api/recommendations
  -> existing request validation
  -> exact server mode dispatch
     -> legacy: unchanged legacy handler and response
     -> two_layer: deterministic request normalization and versioned prompt
        -> one Responses API create, Terra/high, background + hosted web search
        -> return 202 with an encrypted, authenticated, expiring job token

GET /api/recommendations with the app token in x-reviewradar-job-token
  -> verify token, retrieve the same OpenAI response
  -> pending: return 202 and poll guidance
  -> completed: collect response-owned source metadata
     -> deterministic OAI-T2 formatting
     -> OAI-T1 validation and card construction, initially with zero receipts
     -> return the versioned two-layer response

DELETE /api/recommendations with the app token in x-reviewradar-job-token
  -> verify token and request OpenAI cancellation
  -> never start a replacement or legacy fallback
```

The job token is authenticated encryption over the response ID, prompt
version/hash, issue time, and expiry. Those fields are not client-decodable,
and the token is never placed in a request URL. It contains no shopper request,
prompt, answer, source URL, API key, or other credential. Its key is derived
from a new server-only
`REVIEW_RADAR_JOB_TOKEN_SECRET`; two-layer mode fails before provider creation
when that secret or `OPENAI_API_KEY` is absent. Legacy mode does not require the
new secret.

**Mode and public response contract:**

- `REVIEW_RADAR_PIPELINE_MODE` is server-only. Missing or exact `legacy` means
  legacy. Exact `two_layer` enables the new branch. Any other non-empty value is
  a configuration error before any provider call; it does not silently choose
  a path.
- The legacy success body remains exactly `{ result: RecommendationResult }`.
  Do not add a discriminator or new fields to that body.
- A two-layer start returns HTTP `202` with `pipeline: "two_layer"`, a contract
  version, `state: "pending"`, an opaque job token, and bounded poll guidance.
  Pending polls retain that shape. Completion returns `pipeline: "two_layer"`,
  `state: "completed"`, the OAI-T1 presentation version, cards, and only the
  source catalog required by the UI. Raw prompt and raw answer are never sent to
  the browser or written to logs.
- The frontend branches on the new response shape and reuses the T3 trust-card
  presentation after separating its development-only wrapper copy. It does not
  translate the cards into legacy products.
- Initial T4 completion supplies `receiptInputs: []`. Every recommendation can
  remain visible, but exact identity and commerce stay unverified: no price,
  purchase link, retailer, availability, or image is fabricated merely to make
  the card look complete.

**Versioned prompt and provider contract:** the natural-language master prompt
from the successful unguarded diagnostic must become reviewed source code; it
must not be loaded from the untracked fixture. The prompt builder has its own
version and hash, places the deterministic normalized request plus original
fields inside explicit data delimiters, states that shopper and web text are
untrusted data, and requests the numbered headings OAI-T2 already validates.
No benchmark answer, candidate list, app-authored search plan, or hidden product
seed enters the prompt.

The provider adapter is a natural-text adapter, not a reuse of the rejected
strict-slate parser. Freeze `gpt-5.6-terra`, reasoning `high`, `background:
true`, `max_output_tokens: 24000`, hosted `web_search` required, and
`max_tool_calls: 20`. OpenAI documents `max_tool_calls` as the total built-in
tool-call ceiling for the response, not a per-search retry allowance. Every
retrieve includes `web_search_call.action.sources`. The final source registry
merges response-owned web-search sources and URL-citation annotations by
normalized URL, but it never invents a missing title or URL. Missing registered
source metadata fails closed before card construction.

**Failure semantics:**

| Failure | Public behavior | Forbidden behavior |
|---|---|---|
| Invalid shopper request | Existing safe HTTP 400 message | No provider call |
| Missing/invalid two-layer config | Safe HTTP 500 configuration message | No provider call; no legacy fallback |
| Create error | Safe HTTP 502 research-start failure | No retry or replacement |
| Pending response | HTTP 202 with poll guidance | No second create |
| Poll token invalid/expired | Safe HTTP 400/410 message | No response-ID guessing |
| Background timeout | Cancel when possible; safe HTTP 504 | No partial cards or fallback |
| Failed/cancelled/incomplete/refusal/no web search/no text | Safe typed 502/409 result | No partial cards or fallback |
| Prompt-shape, formatter, hash, order, or source-registry failure | Safe HTTP 502 verification message | No guessed fields, parser repair, or legacy conversion |
| Valid cards with no receipts | Show cards with T3 unverified states | No price, link, seller, availability, or image |

Server diagnostics may record contract/prompt hashes, model, status, duration,
poll count, token/tool usage, source count/hosts, and a bounded failure code.
They may not record shopper prose, the complete prompt, raw answer, source-path
URLs, headers, cookies, keys, or complete provider responses.

**Implementation sequence - each item needs separate Taylor approval:**

1. **OAI-T4A - versioned prompt and background adapter, zero live.** Add the
   deterministic prompt builder, natural-text start/retrieve/cancel adapter,
   signed job-token contract, source-metadata extractor, sanitized ledger, and
   mocked lifecycle/adversarial tests. Keep all modules isolated from the route.
2. **OAI-T4B - default-off route and UI seam, zero live.** Add the exact mode
   dispatcher while leaving the legacy branch unchanged; add POST/GET/DELETE
   job states, the versioned response union, and the real T3 card renderer.
   Land the legacy dispatch refactor separately from the two-layer branch within
   the phase so any behavior drift has one attributable commit boundary.
3. **OAI-T4C - one bounded live route smoke, separately budgeted.** Only after
   T4A/T4B and peer review pass, approve one Terra create with a stated hosted-
   search ceiling. Exercise the real start/poll/UI path and stop. This is a
   lifecycle smoke, not a quality or promotion gate.
4. **OAI-T4D - zero-live failure attribution.** If T4C reaches the deterministic
   boundary but fails under a collapsed public code, replay saved natural
   evidence and add bounded server-only failure classifications. Preserve the
   public response and all fail-closed checks; do not retain provider content or
   change parsing without a reproduced generalized defect.
5. **OAI-T4E - one bounded diagnostic lifecycle smoke, separately budgeted.**
   Exercise the unchanged real route once after the precise T4D instrumentation
   wall passes. Retain only HTTP lifecycle/timing, bounded completion metrics,
   bounded `stage/reason/cause`, and UI card/trust-state or generic-error facts.
   Stop after the first terminal result; do not retry or turn it into a quality
   sample.
6. **OAI-T4F - citation-granular safety correction, zero live and separately
   approved.** Replace whole-slate rejection for an extra unregistered citation
   with omission/non-binding plus a claim-level synthesis downgrade, but only
   when every recommendation still has at least one registered source. Strip
   Markdown URLs from display text, preserve registered citations and order,
   and retain fail-closed behavior for a product with no registered source.
7. **Later quality/repeatability gate.** Define a new two-layer gate from T4E
   actual cost, latency, and output. It must measure recommendation usefulness,
   hard-requirement fidelity, source binding, formatter success, and stability
   before any flag promotion or transactional verifier work.

**OAI-T4A implementation result (2026-07-17; zero live; committed in current history):** the
isolated foundation is complete in `lib/twoLayerMasterPrompt.ts`,
`lib/twoLayerJobToken.ts`, and `lib/twoLayerResearchAdapter.ts`. It versions and
hashes the natural Markdown prompt, inserts the existing normalized request as
one canonical delimited data block, freezes one Terra/high background create
with `store: false` and required hosted search, exposes single-shot retrieve and
cancel operations, accepts only response-owned titled source metadata, and
keeps shopper prose, full prompts/answers, source paths, credentials, and raw
responses out of its operational ledger. The HMAC-SHA-256 job token contains
only the response ID, prompt version, prompt hash, issue/expiry times, and
signature; it
requires a 32-byte secret and cannot live longer than 30 minutes. Tampering,
expiry, mismatched provider response IDs, terminal/incomplete/refusal states,
missing web search/text/source title, and provider errors fail closed without
retry or fallback. The new 20-test wall and the combined T1-T4 wall pass;
complete verification is recorded in `docs/qa-loop-results.md`. No route, UI,
flag, secret, `.env.local`, provider, or user-visible behavior changed.

**OAI-T4B implementation result (2026-07-17; zero live; committed):** the real
route now has an exact server-only dispatcher. Missing,
empty, or exact `legacy` delegates to the unchanged legacy POST handler; exact
`two_layer` delegates to versioned POST/GET/DELETE handlers; every other
non-empty mode fails before provider creation. The new branch constructs the
OpenAI SDK with `maxRetries: 0`, starts exactly one background response, returns
only a signed app token and poll guidance, retrieves or cancels only the token's
response, and never enters Serper, SearchAPI, a second model, the legacy helper
stack, or a fallback.

The integration originally advanced the token contract to
`oai-two-layer-job-v2` because stateless retrieval must authenticate the
request-specific prompt hash as well as the response ID and prompt version.
The July 18 corrective pass supersedes that transport with encrypted
`oai-two-layer-job-v3`. Completion deterministically runs OAI-T2
then OAI-T1 with `receiptInputs: []`; the public body contains cards and the UI
source catalog, not the prompt, raw answer, provider response ID, or raw source
envelope. The browser accepts the unchanged legacy body or the versioned
two-layer union, polls one signed job, extends the client deadline only after a
valid pending state, sends one independent DELETE for a known cancelled job,
and renders the shared T3 trust cards directly.

The implementation remains default-off: `.env.local` was not changed and no
provider was called. Focused T1-T4 passes 56/56; the complete wall passes
1073/1073 across 147 suites; typecheck, lint, production build, offline
evaluation, diff/privacy checks, and 15/15 mocked browser tests pass. Desktop
and 390px mobile polling render without horizontal overflow. The stateless
design has one bounded residual race: if a user cancels before POST returns the
signed token, the browser cannot identify and cancel a response the server may
already have created. T4C and all flag promotion remain separately approval-
gated.

**OAI-T4B corrective result (2026-07-18; zero live; committed at current
`main` HEAD):** the pre-T4C adversarial review found five real trust/lifecycle
defects and closed them without changing the default legacy path. The stateless
token now uses AES-256-GCM with an HKDF-derived key, random 96-bit nonce, and
authenticated version context, so the provider response ID and prompt hash are
not client-decodable. GET and DELETE carry the app token only in the
`x-reviewradar-job-token` header; query-string tokens are rejected. The browser
shortens waits and attempts one DELETE 30 seconds before token expiry. This is
best-effort in a browser and does not erase the separate pre-token cancellation
race or guarantee scheduling while a tab is suspended.

Claim trust is now claim-local: a specification, performance, or owner claim
is `Source-reported` only when that individual bullet contains a registered
citation; otherwise it is retained as `AI research synthesis`. Source section
headings no longer invent semantic roles, so current response metadata renders
the neutral `Research source` label. One shared source-URL canonicalizer removes
only a narrow list of tracking parameters. All remaining parameter order and
values, plus fragments, are preserved because they can carry signed or routed
product identity; this includes `sku`, `variant`, `pid`, `id`, and ambiguous
`ref`.

Fail-first produced 12 expected failures. Corrected focused coverage passes
59/59, the complete wall passes 1081/1081 across 148 suites, and typecheck,
lint, build, offline evaluation, diff checks, and focused two-layer browser
3/3 pass. No live call, `.env.local` edit, flag promotion, deployment, or T4C
work occurred.

**OAI-T4C live result (2026-07-18; one approved response, approval spent):**
the real process-only `two_layer` UI path started one Terra/high background
response for broad U.S. `vacuum cleaner`, returned HTTP 202, and polled only
that header-authenticated job. After approximately 202.1 seconds from UI click
to terminal observation, the completed response reached the deterministic
evidence boundary and the route returned HTTP 502 `verification_failed`. The UI
showed the safe bounded error and displayed no cards or transactional fields;
there were no browser console warnings/errors. No retry, replacement, second
response, Serper, SearchAPI, direct fetch, fallback, flag promotion, deployment,
or additional case occurred.

The result passes the fail-closed lifecycle objective but fails the completion
objective. The current route groups prompt-shape, source-registry/title,
formatter, and T1-validation exceptions into the same safe code
(`lib/twoLayerRecommendationRoute.ts:241-259`), while raw provider content is
correctly not retained. The exact rejection stage is therefore not provable
from this run. Before any replacement smoke or quality gate, run a separately
approved zero-live attribution phase using existing saved evidence and a
bounded server-only failure-stage diagnostic. It may expose only an enum and
sanitized counts/hashes, never raw answers, prompts, URLs, tokens, IDs, headers,
or shopper prose. The T4C approval is spent and authorizes no replacement.

**OAI-T4D attribution result (2026-07-18; zero live; committed in current main
history):** the saved natural Terra fixture
`oai-terra-unguarded-2026-07-17-primary-01` contains 380 captured source rows,
25 of them titled. Replaying the answer with that title-present subset—the same
source-filtering contract as `extractTwoLayerResponseSources`—passes the current
formatter with five recommendations and 20 cited/registered sources. Passing
all 380 fixture rows directly is not route-equivalent and correctly fails
`source_title`. The route-equivalent pass disproves universal formatter
incompatibility but cannot identify T4C's exact rejection because T4C correctly
retained no raw response. No parsing, validation, trust, or card behavior was
weakened or otherwise changed.

The formatter now emits one of four stable internal reasons:
`product_shape`, `source_registry`, `source_title`, or
`extraction_validation`. The route distinguishes those formatter reasons from
`presentation_validation`, reports only the stage and bounded reason on the
server, and continues returning the exact same generic HTTP 502
`verification_failed` body to the browser. The observer cannot change the
public response even if the diagnostic sink throws. It records no prompt,
answer, shopper prose, URL, token, provider ID, header, credential, or raw
provider content.

Fail-first produced three expected route failures. Corrected focused coverage
passes 24/24 across the formatter and route suites; the complete wall passes
1086/1086 across 148 suites. Typecheck, lint (zero errors/three pre-existing
warnings), production build, offline evaluation, and diff checks pass. No live
provider or direct-page call, `.env.local` change, mode promotion, deployment,
or fixture mutation occurred. A replacement lifecycle smoke, quality gate, or
transactional verifier remains separately approval-gated.

**OAI-T4D precision correction (2026-07-18; zero live; committed in current
main history):** pre-live adversarial review found that the broad T4D reasons
could still collapse materially different failures into another follow-up
cycle. The formatter now pairs each broad reason with a bounded cause for its
owned heading, section, rank, identity, registry/title, and extraction-integrity
rejections (`lib/twoLayerFormatter.ts:34-84,524-552`). The route reports only
that bounded `stage/reason/cause` server-side and preserves the unchanged
generic public error (`lib/twoLayerRecommendationRoute.ts:46-56,324-354`).

The same review found that a successful provider completion would otherwise
discard the actual planning basis again. The route now emits one privacy-safe
completion record containing only requested/returned model, duration,
aggregate token counts, hosted-search count, and source count
(`lib/twoLayerRecommendationRoute.ts:57-64,167-174,309-320`). It excludes raw
prompt/answer, shopper prose, URLs/hosts, provider response IDs, tokens,
headers, credentials, and source paths; a throwing observer cannot alter the
route. A full route-equivalent replay of the saved Terra response passes T2 and
T1 with five safely sparse cards, all identity and commerce states unverified.
That exhausts saved evidence but still cannot reconstruct T4C's exact runtime
variation.

Fail-first produced eight expected failures across cause precision and the
completion record. Corrected focused coverage passes 25/25; the complete wall
passes 1087/1087 across 148 suites. Typecheck, lint (zero errors/three
pre-existing warnings), production build, offline evaluation, and diff checks
pass. No live provider/direct-page call, `.env.local` change, flag promotion,
deployment, parser relaxation, trust change, or fixture mutation occurred.

**OAI-T4E live result (2026-07-18; one approved response, approval spent):** the
real process-only two-layer UI submitted broad U.S. `vacuum cleaner` with no
budget or preferences. POST returned HTTP 202 in 4.4 seconds and every later
request retrieved only the same signed job. The first terminal result was HTTP
502 `verification_failed`; there was no retry, replacement, fallback, Serper,
SearchAPI, direct fetch, second response, cache reuse, extra case, helper model,
source-page open, promotion, deployment, or push.

The response completed on requested/returned `gpt-5.6-terra` and recorded
109,661 input tokens, zero cached input tokens, 20,327 output tokens, 129,988
total tokens, 12 hosted searches, and 20 titled response sources. The terminal
retrieve took 802 ms; UI click-to-terminal capture was approximately 272.6
seconds. The frozen July 15 rates estimate `$0.6990575` from returned usage;
that is not claimed as the provider invoice. The browser showed the generic
safe error, zero cards, no transactional fields, and zero warning/error console
messages. The server was stopped, `.env.local` remained unchanged, and no raw
provider content or identifier was retained.

The exact bounded rejection was
`formatter/source_registry/cited_source_unregistered`: at least one Markdown
citation URL in the product blocks did not match the title-present
response-source registry after conservative canonicalization. This proves the
current whole-slate rejection trigger. It does not prove whether the provider
never registered that URL, registered it only without a title and the adapter
filtered it, or returned a materially different identity-bearing URL; raw
content was deliberately not retained, so choosing among those explanations
would be speculation.

**OAI-T4F implementation result (2026-07-18; zero live; committed in current
main history):** the citation boundary now changes blast radius without
weakening source ownership. The formatter builds its registry only from
title-present same-response sources and exposes only cited URLs in that
registry. An extra unregistered or titleless citation is ignored and counted in
bounded diagnostics; it is never exposed or bound. A claim containing only an
ignored citation receives no substituted source ID and therefore remains `AI
research synthesis`. If a recommendation's required Sources section has no
registered source, the complete result still fails closed with
`product_registered_source_missing`.

The deterministic extraction remains verbatim for validation. Presentation
separately converts standard Markdown links to their visible labels in every
model-authored card field and in source titles, so hidden destinations cannot
render as prose. Registered source URLs remain available only in the separate
source catalog. The correction does not drop products, repair prose, discover
sources, backfill, rerank, alter product order, attach commerce, or promote the
two-layer mode.

Fail-first produced six expected failures across mixed citations,
unregistered-only products, titleless metadata, claim-local downgrade, card URL
non-disclosure, and source-title sanitization. Corrected focused coverage passes
28/28; the complete wall passes 1090/1090 across 148 suites. Typecheck, lint
(zero errors/three pre-existing warnings), production build, offline
evaluation, and diff checks pass. No OpenAI, Serper, SearchAPI, direct-page, or
other provider call occurred; `.env.local`, flags, secrets, fixtures,
deployment, and production state remain unchanged.

### OAI-T5A - two-layer quality-gate contract (complete locally 2026-07-18; zero live)

**Decision question:** T5B must answer one question, not trigger another repair
loop: can the current OpenAI-led two-layer route produce useful, requirement-
faithful, source-auditable, and repeatable recommendations that are materially
better than comparable legacy output? Offline evidence cannot answer product
selection quality or provider repeatability, but it can freeze the experiment
and remove known measurement blind spots before spend.

**Frozen sample:** three independent broad `shop vac` runs and three independent
constrained `{ query: "robot vacuum", budget: "under $300", priorities:
"self-emptying" }` runs. This reuses the owner-ratified `leaders-v2026-07c`
broad denominator and a contemporary flag-off control without reviving the
obsolete 12-response OAI-2B design.

**Absolute mechanical bars:** all 6 routes must complete with 3-5 cards; broad
leader recall must average at least 4/7 with no run below 3/7; every within-
shape pairwise product-set Jaccard must be at least 0.60; source binding and
route completion must be 100%; and unsafe product, exact-price, seller,
availability, purchase-URL, image, editorial/accessory, wrong-type, and cross-
model leakage must remain zero. Each card must show the exact normalized
requirement rows in order. Every constrained Best Match must report `Pass` on
all three rows, including budget and `self-emptying`; every broad Best Match
must report `Pass` on the mandatory U.S.-availability row.

**Mandatory human bars:** the analyzer cannot return `pass` without a product-
eligibility audit for every card, a hard-requirement audit for every constrained
Best Match, a claim/source-semantic audit of the top two products per run, and
a blind comparison against comparable legacy output. Neither shape may lose
the blind comparison, and at least one shape must win. Missing human rows yield
`needs_manual_review`, never a mechanical pass.

**Pre-live corrections selected by adversarial review:**

- normalized budget evidence now appears once in `evaluation_requirements`
  rather than also being duplicated as a generic hard constraint;
- master-prompt v2 requires every requirement text exactly once and in order;
  formatter/research/presentation v2 retains those verdicts as visibly
  unverified AI synthesis;
- encrypted job-token v4 carries only a non-reversible hash of the expected
  requirement text list, so the stateless poll route rejects renaming,
  reordering, omission, or addition without exposing shopper text;
- presentation redacts model-authored currency amounts from research prose and
  source titles as `current price not independently verified`, while preserving
  the shopper's own budget label and allowing only an independent commerce
  receipt to display an exact price; and
- bounded formatter diagnostics expose only counts/version, never prose, URLs,
  provider IDs, tokens, or secrets.

**Frozen tooling:** `scripts/two-layer-quality-gate.mjs` is the offline analyzer.
It measures route/source rates, recall, stability, unsafe counts, ignored
citations, latency, tool calls, and frozen-rate estimated cost. Its companion
runner is preflight-only unless invoked with the exact approval ID
`oai-t5b-six-run-v1`; it advances one frozen request per invocation, permits one
create, at most 60 retrieve polls, and one pre-expiry safety cancel. It validates
process-only configuration and constructs the no-retry SDK client before it
writes an attempt marker immediately ahead of the provider-capable route. It
persists no job token/provider ID/raw answer and blocks later requests after a
failed or interrupted attempt. A final mechanical failure writes a durable halt
marker. The generated manual-review template pins two registered source IDs for
each audited top product, and the analyzer rejects untraceable source-audit
claims. Blind-comparison rows are closed-world, so unknown/duplicate rows cannot
hide the required material win. These are generalized controls against earlier
double dispatch, silent replacement, and unauditable human sign-off.

**Planning basis:** T4E used 12 hosted searches, approximately 272.6 seconds,
and `$0.6990575` estimated at the frozen 2026-07-15 Terra rates. Six comparable
responses therefore plan at `$4.194345`, 72 expected hosted searches, and about
27.26 serial minutes. The approval ceiling is 6 Terra/high creates, at most 20
hosted searches per response (120 total), at most 60 retrieves and one safety
cancel per attempt, `$7` cumulative estimated cost, zero retries/replacements/
fallbacks, and up to 24 direct source-page audit opens. The dollar bound is
checked after each completed response; provider billing cannot be interrupted
mid-response and must be reported as returned usage rather than an invoice.

**Kill rule:** stop after the first route/formatter/presentation failure,
unsafe card or transaction field, per-run recall/card/requirement failure,
cumulative cost breach, or interrupted/spent attempt. Stop after broad run 3 if
the broad mean or stability bar is already impossible. Do not buy a replacement
or enter a correction/retest cycle. A mechanically complete failure returns to
Taylor for an architecture decision.

**Offline evidence:** fail-first covered requirement loss/format drift, missing
gate machinery, unverified currency leakage, and requirement renaming. The
corrected complete wall passes 1106 tests across 150 suites; typecheck, lint
(zero errors/three pre-existing warnings), production build, offline evaluation,
gate preflight, and diff checks pass. No provider call, source-page open,
`.env.local` edit, mode promotion, deployment, or production change occurred.

**Next decision:** T5A is complete. The next step is the one separately approved
T5B provider-and-human gate defined above. Do not run it without approval of the
complete create/search/retrieve/cancel/direct-page/cost envelope. Do not start
transactional verifier work, flag promotion, rollout, or retirement work before
T5B decides whether the research product itself is worth continuing.

**Recommended reasoning level:** High for T5B. The architecture and evaluator
are frozen; disciplined protocol execution, safety inspection, and evidence
scoring matter more than additional open-ended design reasoning.

### OAI-T5B - provider quality gate (stopped safely 2026-07-18; live)

**Decision:** the six-response gate failed its first and strongest prerequisite:
the real two-layer route did not complete. Taylor approved the complete frozen
T5B envelope. Broad `shop vac` run 1 spent one Terra/high Responses create,
performed 13 retrieves, and used zero cancels, retries, replacements, fallbacks,
Serper calls, SearchAPI calls, or direct source-page opens. The remaining five
creates were not dispatched.

The provider response reached terminal completion, but the deterministic
formatter rejected it at `formatter / product_shape /
numbered_product_headings_missing`. The public route returned HTTP 502, zero
cards, and no product, price, seller, availability, URL, image, source, provider
identifier, token, prompt, or raw answer. The attempt is permanently marked
failed under commit `04dd3a0d087afe4ccfd8a538b7524cc104309cd7`, so the harness
blocks every later frozen run and no replacement is authorized.

This evidence proves only that the current prompt-plus-natural-Markdown
formatter boundary is not provider-robust enough to satisfy 6/6 completion. It
does not prove whether Terra omitted numbering, used a different heading shape,
returned no recommendations, truncated the answer, or otherwise drifted: raw
provider content was intentionally not retained. Do not loosen the parser or
guess at a format based on the bounded cause alone.

The failed-attempt artifact retained the provider-call counters but not the
bounded completion usage diagnostic that existed before formatting. Therefore
actual tokens, hosted-search count, and estimated cost cannot be reconstructed.
The T4E planning basis of `$0.6990575` for one response remains context only,
not an actual T5B charge. This is a measurement defect to correct before any
future live experiment.

**Gate result:** fail/incomplete. Recall, stability, source semantics, human
eligibility, requirement accuracy, blind comparison, and direct-page audits are
not scored because no card fixture exists. T5B does not justify verifier work,
promotion, rollout, or legacy retirement.

**Next decision:** stop and choose the smallest zero-live diagnostic redesign
before considering any new spend. The strongest candidate is to retain a
privacy-safe structural failure envelope (bounded completion usage plus section
and heading-shape counts, never raw answer text) and then decide whether the
one-call contract should become machine-readable rather than expanding a
brittle Markdown parser. Any new provider run or replacement requires a new
exact approval packet.

**Recommended reasoning level:** Highest for the next architecture decision.
The question is no longer routine gate execution; it is whether to change the
model-output contract, improve bounded diagnostics, or stop the two-layer path.

### OAI-T5C - direct structured research boundary (complete locally 2026-07-18; zero live)

**Decision:** continue the one-call OpenAI-led architecture, but remove the
brittle prose-to-card reconstruction boundary. The same one Terra/high
background Responses create still owns search selection, source inspection,
product rejection, slate selection, and ranking. Its final text is now bound by
one strict JSON Schema in the same request that enables hosted web search. No
helper response, formatter response, Serper/SearchAPI call, direct page fetch,
retry, replacement, fallback, or commerce verifier was added.

**Machine contract:** master prompt v3 requests only the schema object. The
schema contains one to five ranked research recommendations, exact identity
parts, assessment, pros/cons, exact ordered requirement rows, typed claims, and
a compact `{id,url}` source catalog. It deliberately has no price, seller,
availability, purchase URL, image, rating, publisher, source title, or source
role field. The deterministic route parses and validates the object directly;
`lib/twoLayerFormatter.ts` remains historical/reference code and is no longer
imported by the live two-layer route.

**Source boundary:** every declared URL is conservatively canonicalized and
matched against title-present source metadata owned by the same retrieved
Responses object. ReviewRadar supplies the public title from that response
metadata and assigns the neutral `other` role. Unregistered source IDs are
removed from claim and requirement citations and therefore display as AI
synthesis; a product fails closed if identity, assessment, a pro, or a con is
left without registered evidence. Duplicate IDs/URLs/keys, unknown IDs, rank
gaps, JSON/schema drift, and exact-requirement drift fail closed without
exposing raw output.

**Observability and stale-spend closure:** terminal completion usage is now
reported even when the structured contract fails. The historical gate runner's
failed-attempt path retains that bounded completion diagnostic plus the safe
contract/failure diagnostic. Its spent `oai-t5b-six-run-v1` execution switch is
retired, so it cannot authorize a new-architecture request from a later commit.
A future live window needs a new runner and an exact new approval.

**Evidence:** fail-first began with a missing structured-contract export. The
new contract wall then covers request composition, no-commerce schema shape,
response-owned source metadata, neutral labels, claim-local downgrade,
required-source failure, malformed JSON, schema drift, rank drift, exact
requirement hashing, no-raw-output responses, and bounded failure usage. The
complete suite passes 1111/1111 across 151 suites; typecheck, production build,
offline evaluation, and diff checks pass. Lint has zero errors and the same
three pre-existing warnings. Zero provider calls occurred; `.env.local`,
persistent mode, deployment, production, and all live fixtures are unchanged.

**What is not proven:** no provider has yet executed prompt v3 plus the new
schema. Offline evidence proves the request/route contract, not that Terra will
return a useful slate or that a live result meets recall, requirement, source-
semantic, stability, latency, or cost bars.

**Next decision:** after commit and independent review, the smallest useful
provider step is one newly approved lifecycle smoke on one frozen broad request.
It should prove create acceptance, terminal structured completion, source
ownership, safe cards, and retained usage diagnostics. Do not revive the six-
run T5B gate until that smoke completes. Do not promote the mode, add commerce,
or retire legacy behavior.

**Recommended reasoning level:** High for the bounded lifecycle smoke. The
architecture is now frozen offline; disciplined execution and safety review
matter more than another open-ended redesign.

**Offline acceptance wall for T4A/T4B:**

- default/explicit legacy requests have the same status, body, provider call
  order, and fallback behavior as today, and never touch the two-layer adapter;
- each original user field appears exactly once in the original-fields data
  block, while derived normalized requirements have no omissions or unsupported
  additions; delimiter/instruction-injection cases cannot change system policy;
- exact two-layer mode performs one create, no Serper/SearchAPI/legacy helper
  call, no second model call, and only retrieves that response while polling;
- queued, in-progress, completed, failed, cancelled, incomplete, refused,
  missing-search, missing-text, missing-source-title, malformed-heading,
  unregistered-source, token-tamper, expiry, and cancellation cases are tested;
- cards preserve Terra count/order and T1/T2 source/text/hash rules;
- no-receipt cards expose none of the transactional fields;
- focused tests, the complete wall, typecheck, lint, build, offline evaluation,
  `git diff --check`, and mocked desktop/mobile browser QA pass; and
- tracked changes contain no secret, raw live response, or live fixture.

**Stop conditions:** stop before implementation if the signed background job
contract cannot be supported without durable user data or a deployment-specific
service not already approved. Stop before live work if legacy equivalence or any
fail-closed case is not proven. Stop after any unsafe field is displayed from
the model layer, any fallback starts a second research path, or any mode is
indistinguishable in evidence.

**Tradeoffs:** background polling adds route states, token signing, client
polling, and cancellation code. That is more machinery than extending the
browser timeout, but it directly removes the observed timeout mismatch and does
not assume a hosting platform can hold a multi-minute request. T4 intentionally
ships initially sparse cards; transactional completeness remains future work.

**Recommended reasoning level:** Highest for OAI-T4A and OAI-T4B because they
define authentication-like job tokens, provider lifecycle, route compatibility,
and failure semantics. High is sufficient for the later bounded mechanical
OAI-T4C smoke after the offline wall is green.

### OAI-T5D - structured lifecycle smoke (failed safely live 2026-07-18)

**Purpose:** freeze the smallest provider experiment that can distinguish
"strict structured output works in the real API" from another application-side
contract failure. This is a lifecycle/safety smoke, not a recommendation-quality
gate and not evidence for mode promotion.

**Frozen case:** one broad `{query:"shop vac"}` request through the committed
OAI-T5C route. The harness accepts only approval ID
`oai-t5d-structured-lifecycle-smoke-v1` and only that request. The spent
`oai-t5b-six-run-v1` approval remains rejected.

**Live envelope awaiting separate approval:** one Terra/high Responses create,
at most 20 hosted web searches, at most 60 retrieves, one safety cancel, zero
retries, zero replacements, zero Serper/SearchAPI calls, zero direct source-page
opens, and a proposed `$7` hard ceiling. Process-only credentials are required;
`.env.local` is neither read for the job secret nor changed.

**Success:** the same response reaches terminal completion; the strict JSON
contract validates; one to five safe cards are built; source IDs bind only to
same-response title-present metadata; exact requirement hashing passes; bounded
token/tool/source/duration and structure diagnostics are retained; and the
client-visible result contains no model-authored commerce, raw response,
provider ID, job token, prompt, or request header.

**Stop:** any failed, interrupted, cancelled, incomplete, schema-invalid, or
contract-invalid attempt is spent and ends the phase. No retry or replacement
without a new exact approval. One successful smoke also stops; it authorizes no
second case, quality gate, verifier, promotion, deployment, or production
change.

**Offline evidence:** fail-first was the missing smoke-contract export. The
runner now freezes one case and one response, preserves the retired T5B block,
enforces the call ceilings, refuses dirty tracked code for live use, and writes
only a sanitized attempt plus bounded completed fixture. Focused tests pass
36/36; the full wall passes 1114/1114 across 151 suites. Typecheck, build,
offline evaluation, preflight, and diff checks pass; lint has zero errors and
the same three pre-existing warnings. Zero provider calls occurred.

**Live result at commit `63bdef9`: FAIL / STOPPED AS DESIGNED.** The one approved
broad `shop vac` attempt made one Terra/high create, 11 retrieves, 11 hosted web
searches, and zero cancels, retries, replacements, Serper/SearchAPI calls,
fallbacks, second responses, or direct source-page opens. Terra completed with
95,392 input tokens, 17,624 output tokens, and 113,016 total tokens. Using the
frozen gate rates, estimated cost is `$0.61284`, below the `$7` ceiling.

The route then failed closed HTTP 502 at `research_contract /
required_registered_source_missing`. The decisive upstream measurement is
`sourceCount: 0`: the retrieved response yielded no title-present provider-owned
source metadata through the current extraction contract. Consequently every
model-declared source was unregistered, required product evidence could not
survive validation, and zero cards or sources reached the client. The sanitized
attempt is untracked under
`tests/fixtures/review-radar-live/oai-t5d-structured-smoke-63bdef9/` and contains
no raw output, provider ID, job token, prompt, header, or secret.

The artifact does not prove whether source metadata was omitted by the provider,
returned under an unhandled response shape, or present without the title/URL
pair required by ReviewRadar. Raw output was intentionally not retained. It also
does not retain full wall-clock duration; the recorded `durationMs: 353` is the
terminal route-processing interval, not end-to-end latency.

**Next decision:** no retry or replacement. Run a zero-live source-metadata
contract diagnosis against official API shape, existing saved non-raw evidence,
and mocked response variants. Preserve the same-response title-present trust
boundary. Any future provider call requires a newly committed generalized fix,
fresh exact approval, and a new attempt identity.

**Recommended reasoning level:** High. The contract is mechanically bounded;
the important work is disciplined execution and inspecting the first outcome,
not open-ended architecture invention.

### OAI-T6A - clean direct Terra report path (reviewed 2026-07-19; zero live)

**Decision:** stop forcing Terra's useful natural research through the legacy
candidate pipeline or the T5C product-object reconstruction boundary. Add a
separate default-off V2 route whose only model-owned display value is the full
Markdown report. Terra owns product selection, order, explanations, and inline
citations. ReviewRadar does not parse products, merge candidates, rerank,
normalize, rescue, dedupe, or rebuild cards on this path.

**Boundary:** one Terra/high background Responses create with required hosted
web search, at most 20 tool calls, and strict JSON containing exactly
`report_markdown`. Every displayed HTTP citation must canonicalize to a URL in
the same completed response's `web_search_call.action.sources` or URL-citation
annotations. Provider source titles are optional. Unregistered citations fail
the response closed; the report string is never rewritten to hide or replace
them. Raw HTML and non-HTTP links do not render.

**Commerce state:** prices, sellers, purchase links, availability, inventory,
financing, and warranty details are retained as Terra-authored research but are
globally and prompt-locally labeled `AI-reported - unverified by ReviewRadar`.
No independent commerce verifier exists in T6A. Transactional verification is
the next architecture layer, not a reason to reintroduce the old pipeline.

**Isolation and rollback:** `/api/recommendations-v2` is a new endpoint. The
server requires `REVIEW_RADAR_DIRECT_TERRA=on`; the browser requires
`NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=true`. Both default off. The old legacy
and two-layer code remains intact for rollback and is never imported by the V2
route modules. `.env.local`, deployment, and production are unchanged.

**Adversarial review:** fail-first review reproduced five boundary failures.
The original hand-written citation scanner missed bare GFM autolinks and
reference links that the UI renders; it also treated image destinations as
citations, collapsed distinct `www` hosts/fragments/query order during source
ownership checks, and left a known provider job alive after unexpected polling
failure. The corrected parser uses the same Markdown grammar as the renderer,
rejects report images, preserves identity-bearing URL details, and cancels any
known unfinished job. Every other request field is now checked against the
installed Responses create type; only `max_tool_calls` is retained as an
explicit compatibility extension because `openai@6.37.0` omits it from the
REST create type while documenting it on the adjacent Responses client event.

**Offline evidence:** focused coverage passes 26/26 across eight suites. The
complete suite passes 1140/1140 across 159 suites; typecheck, production build,
lint (zero errors/three existing warnings), legacy offline evaluation, secret
scan, and diff checks pass. Replaying the saved unguarded refrigerator report
preserves its 40,627 characters exactly and validates all 30 unique citation
URLs across 16 hosts, including titleless provider sources. No provider call
occurred.

**Next gate:** commit the reviewed boundary under Taylor's existing approval,
then require a new exact live budget for OAI-T6B. Do not build the commerce
verifier until the live response proves the strict wrapper, hard tool ceiling,
and citation registry work together.

**Recommended reasoning level:** High for review and the first bounded live
smoke. Highest is unnecessary unless the smoke exposes a new architecture
conflict.

### OAI-T6B - one live V2 provider-contract smoke (approval required)

Run exactly one frozen broad shop-vac request through the committed V2
contract. The approval envelope is one Terra/high Responses create, at most 20
hosted web searches, at most 60 retrieves, one safety cancel, and a `$7` hard
ceiling. No Serper, SearchAPI, retry, replacement, fallback, second response,
direct source-page open, extra case, persistent flag, `.env.local`, deployment,
or production change is part of this gate.

The smoke passes only if the real API accepts background mode, required hosted
web search, strict JSON containing exactly `report_markdown`, and the explicit
`max_tool_calls: 20` compatibility field; the response completes; at least one
web search occurs; every rendered HTTP(S) citation is owned by that same
response; no remote image is present; and the returned report is nonempty and
kept unchanged by the V2 boundary. Retain only a sanitized attempt/fixture and
stop after the first outcome, pass or fail.

This is a technical compatibility gate, not a product-quality gate. Passing it
authorizes planning the transactional verifier, not building or promoting it.
Failure blocks verifier work and triggers one zero-live diagnosis; it does not
authorize a replacement response.

**Recommended reasoning level:** High. The run is mechanically narrow, but the
first real response requires careful lifecycle, response-shape, citation, and
privacy inspection.

### OAI-T7A - saved-slate transactional feasibility probe (live complete 2026-07-19; integration blocked)

**Decision:** test the prospective commerce provider against Terra's actual
five saved shop-vac recommendations before changing the V2 response schema,
route, or UI. This is a provider-feasibility harness, not the transactional
verifier integration.

The frozen targets are DEWALT `DXV12P-QT`, CRAFTSMAN `CMXEVBE17595`, Vacmaster
`VFB511B 0202`, RIDGID `HD1600`, and Milwaukee `0910-20`. Their source fixture
and report hashes are pinned. The runner emits one exact `google_shopping`
request per target and permits a `google_product_offers` request only after the
existing verifier selects an exact brand/model Shopping entity with a bounded
product token.

Any later live execution requires a separately approved commit, approval ID,
and exact ten-attempt ceiling. It permits at most five Shopping plus five Offers
requests, no retries, replacements, fallbacks, additional queries, OpenAI,
Serper, or direct page fetches. Provider tokens are retained only as SHA-256
values; raw responses, secrets, and headers are not persisted. Retained offer
URLs remove only established tracking parameters while preserving product
identity parameters. The evidence path is one-use and checkpointed before each
attempt.

The mechanical usefulness floor is at least three of five exact verified
offers, but a frozen human audit must also find zero wrong identity, variant,
accessory, condition, stock, seller, price, or destination bindings. A miss is
inconclusive and cannot remove, replace, or reorder Terra's recommendation.
Failure stops provider integration; it does not authorize query tuning or a
different provider.

Offline verification: 29/29 focused commerce/preflight tests, 1167/1167 full
tests across 165 suites, typecheck, production build, lint (zero errors and
three pre-existing warnings), offline evaluation, dry-run, and missing-
approval refusal all pass. No provider call, output fixture, key read,
`.env.local` change, route/UI change, flag, deployment, or production change
occurred.

**Next gate:** commit review, then a separately approved one-run SearchAPI
feasibility probe pinned to that commit. Do not add the V2 identity sidecar or
integrate commerce into the route/UI until the provider passes.

**Live outcome at `9c51f22`:** one approved run used seven physical attempts
(five Shopping plus two token-bound Offers), all HTTP 200. RIDGID `HD1600` and
Milwaukee `0910-20` produced exact, in-stock, new-product offer receipts; frozen
human audit found zero unsafe identity, seller, price, stock, or destination
bindings. Mechanical coverage was only `2/5`, below the frozen `3/5` floor, so
integration remains blocked. The misses are attributive: DEWALT returned only
neighboring `QTA`/`QTE` variants and was correctly rejected, while exact-token
CRAFTSMAN and Vacmaster Shopping rows were rejected by the descriptive-title
corroboration gate. The latter two are likely verifier false negatives, not
provider-discovery failures. No retry, replacement, additional query, OpenAI,
Serper, or direct page request occurred.

**Revised next gate:** zero-live adversarial review of the descriptive-title
corroboration rule against the saved evidence. Do not tune queries or buy
another sample until that review proves whether exact brand/model evidence can
safely replace the over-strict descriptive-term requirement.

**Recommended reasoning level:** High. The harness is narrow and reuses the
existing verifier, but exact-model offer binding, redaction, and one-shot spend
controls remain safety-sensitive.

### OAI-T7B - OpenAI multi-source market-price estimate (zero-live implemented 2026-07-19)

**Decision:** do not integrate SearchAPI. Keep the active V2 architecture to
one Terra/high hosted-web-search response and ask that same response for bounded
price observations alongside the unchanged recommendation report. This is an
estimated market-price feature, not transactional verification.

The strict output contains exactly `report_markdown` and
`price_observations`. Each observation declares the ranked brand/model, numeric
USD price, new condition, standalone-product offer type, seller label, and an
exact response-observed source URL. ReviewRadar independently rejects malformed,
unowned, duplicate-host, wrong-rank, wrong-identity, non-new, non-standalone, or
implausible observations. It calculates low/high/median only from at least two
distinct source hosts. Insufficient evidence displays `Price unavailable` and
never rejects, rewrites, removes, or reranks Terra's report.

The public V2 contract exposes only aggregate estimates and a rejected-count;
raw seller strings and price-observation URLs remain server-side. The UI labels
the result an estimate and continues to call all in-report purchase details,
sellers, stock, purchase destinations, discounts, shipping, tax, and checkout
prices unverified. The historical SearchAPI harness and evidence remain on disk
but are not imported by the V2 route.

Offline verification: one fail-first prompt-schema failure; 30/30 focused
direct-Terra tests; 1171/1171 complete tests across 165 suites; typecheck and
production build pass; lint has zero errors and three pre-existing warnings.
No OpenAI, SearchAPI, Serper, direct-page, retry, fallback, `.env.local`, flag,
deployment, or production change occurred.

**Next gate:** commit the reviewed zero-live implementation, then require a
separate exact one-response live approval pinned to that commit. The smoke must
first prove that the real Responses API accepts prompt/schema v2, then report
estimate coverage and manually compare every displayed range with its retained
sanitized source evidence. It must not promote the default-off flags or call a
second provider.

**Recommended reasoning level:** High. Implementation is mechanically bounded;
the first live output needs careful identity, source-ownership, and price-range
inspection. Highest is unnecessary unless the provider rejects the schema or a
range binds to the wrong model.

### OAI-T8A - Direct-Terra product-asset safety contract (Phase 1 `836deb3`; Phase 2 `309857a`; zero live)

**Objective:** add product-page links and product images to Terra's ranked
products without reviving the legacy Serper discovery/ranking pipeline or
allowing a provider row to change Terra's product, rank, explanation, or
citations. Serper Shopping is an optional post-report asset source only. Missing
or rejected assets remain unavailable and never remove or rewrite a Terra pick.

**Phase 1 boundary:** `lib/directTerraAssetVerifier.ts` is a pure, provider-free
verifier. It accepts a frozen Terra identity plus candidate rows and returns
only identity-safe product-page/image URLs and reason-coded server-side
decisions. It requires brand and exact model evidence in the candidate title,
rejects ambiguous sibling-model titles and wrong product types, requires an
eligible direct product page matching Terra's identity, strips only conservative
tracking parameters, and reuses the existing RR-061 image validator. An image
is accepted only from a row whose product destination is independently safe;
an editorial or cross-model row cannot lend imagery to a card.

**Historical regression wall:** fail-first tests cover RR-061 wrong-model and
family-name imagery, RR-078 support/editorial pages, RR-090 cross-model product
URLs, RR-092-style editorial image borrowing, accessories whose URL repeats the
target model, Google/search/listing wrappers, adjacent models, weak/query-echo
identity, descriptive name-only models, and opaque thumbnails tied to an exact
safe product row. Terra's rank and product name remain immutable and no provider
identifier enters the result.

**Adversarial review corrections:** the pre-commit review found three generalized
holes and closed each fail-first: (1) a duplicate URL normalizer removed `ref`
and fragments that the shared conservative contract preserves; the verifier now
reuses `normalizeTwoLayerSourceUrl`; (2) literal-IP/local-network and affiliate/
redirect-wrapper product destinations could reach the product-page check; both
are rejected before identity matching; and (3) internally inconsistent target
name/brand/model/category fields could bind a safe candidate to the wrong Terra
card; target coherence is now mandatory.

**Verification:** 17/17 focused verifier tests, 1209/1209 full tests across 173
suites, typecheck, full lint (0 errors/3 pre-existing warnings), and
`git diff --check` pass. No OpenAI, Serper, SearchAPI, direct-page, retry, flag,
UI, `.env.local`, deployment, or production
change occurred. Current behavior remains byte-identical because the module is
not wired to any route.

**Phase 2 mocked adapter:** `lib/directTerraSerperAssetAdapter.ts` adds an
isolated, dependency-injected Shopping adapter with no live transport. It
preflights the complete locked target batch, processes at most five products in
Terra rank order, and sends exactly one deterministic brand + model + category
request per product to the injected mock. The frozen transport request names
`https://google.serper.dev/shopping` with body
`{ q, gl: "us", hl: "en", num: 20 }`. It has no retry, cache, organic fallback,
legacy Serper-client import, environment read, route, or UI dependency.

Only bounded title, direct product-page, image, and snippet fields enter the
Phase 1 verifier. Provider errors, missing/oversized Shopping arrays, transport
failures, Google wrappers without a direct merchant field, and every rejected
identity fail closed for that product without removing the Terra pick. Organic
rows, provider IDs, seller/source labels, prices, positions, and queries never
enter the returned asset batch. A separate server-only diagnostic hook may
observe the exact query and bounded counts; a future caller must not serialize
that hook to the browser.

Phase 2 verification is 26/26 focused tests, 1218/1218 full tests across 174
suites, typecheck, full lint (0 errors/3 pre-existing warnings), and
`git diff --check`. The module remains unreferenced, made no network request,
and changed no route, UI, flag, `.env.local`, deployment, or production
behavior. Earlier H2B live evidence found Google wrappers instead of usable
merchant URLs, so mocked correctness does not establish live website-link
coverage.

**Commit:** the reviewed Phase 2 adapter and regression wall are committed as
`309857a` (`Add mocked Direct-Terra Serper asset adapter`).

**Next gate:** a later separately approved zero-live Phase 3 may add a single-
request, no-retry server transport and bounded live-probe harness. No live
coverage request or route/UI wiring is authorized by Phase 2.

**Recommended reasoning level:** High for the real-transport preflight because
provider schema, secrets, and attempt accounting become active at that
boundary. Highest is unnecessary unless the live response conflicts with the
frozen adapter contract.

**Phase 3 real-transport preflight (committed in the revision containing this
record on 2026-07-21; zero live):**
`lib/directTerraSerperTransport.ts` adds a fixed-endpoint server transport that
accepts its API key explicitly from a caller and never reads an environment
file or imports the legacy Serper client. Each invocation performs one POST to
the frozen Shopping endpoint with the Phase 2 body, uses no-store and redirect-
error semantics, has a 12-second deadline and 512,000-byte response ceiling,
requires JSON, and emits only bounded reason codes on failure. It has no
automatic second attempt or alternate provider/vertical.

`scripts/run-oai-t8a-asset-coverage-probe.mjs` is dry-run by default and freezes
the five products from the accepted T7B broad shop-vac report. The exact future
queries are:

1. `RIDGID HD1200 shop vacuum`
2. `DEWALT DXV12P-QT shop vacuum`
3. `Vacmaster VFB511B 0202 shop vacuum`
4. `CRAFTSMAN CMXEVBE17595 shop vacuum`
5. `Milwaukee 0910-20 shop vacuum`

Live mode remains unapproved. It will require an exact five-search approval,
the full approved commit hash matching HEAD, a process-only `SERPER_API_KEY`, no
existing output, and no tracked changes in app/code/test/docs surfaces. It
records the attempt count before every dispatch, caps at five physical
attempts, and writes only sanitized, reconciled evidence. Raw responses,
headers, keys, provider IDs, source/seller labels, and prices are excluded.

The probe deliberately scores two independent gates: at least 4/5 safe merchant
websites and at least 4/5 safe images. Provider image presence cannot mask zero
safe merchant URLs. Passing the mechanical bars yields only
`pending_manual_identity_audit`; every accepted URL and image must still be
reviewed before any route/UI work.

The fail-first phase found one real false negative: exact Milwaukee `0910-20`
title and URL evidence was rejected because the shared page selector required
another non-model path word for an unmapped brand. The Direct-Terra caller now
supplies explicit brand/model identity to an optional exact-path fallback in
`productPageMatchesIdentity`; exact `0910-20` passes while sibling title or URL
`0910-21` remains rejected. Existing callers that omit those new optional
fields are behavior-identical.

Phase 3 verification is 40/40 focused tests, 1232/1232 full tests across 176
suites, typecheck, production build, full lint (0 errors/3 pre-existing
warnings), dry-run plan inspection, and `git diff --check`. No OpenAI, Serper,
SearchAPI, direct-page, route, UI, flag, `.env.local`, deployment, or production
change occurred.

**Next gate:** the five-attempt live coverage probe requires a new numeric
approval pinned to the reviewed Phase 3 commit. No live request or integration
is authorized by Phase 3 or its commit.

**Recommended reasoning level:** Medium for the scoped commit because the
adversarial and complete verification walls are green. High is appropriate for
the later mechanical live probe and manual identity audit.

**Phase 3 live outcome and corrective preflight (2026-07-21):** Taylor approved
exactly five Shopping attempts pinned to `c3096cd`. All five attempts completed,
but every adapter item was `invalid_response`, yielding 0/5 safe websites and
0/5 safe images. Because the sanitized v1 fixture did not retain payload-shape
or returned-row-count metadata, it cannot prove the exact rejection reason for
each request.

Offline evidence identifies one concrete contract mismatch: the Phase 3 v1
adapter rejected any Shopping array over 20 rows, while the saved H2B live
fixture records Serper returning 40, 40, 25, and 16 rows and the established
client explicitly documents that Shopping often exceeds the requested count.
The v2 adapter therefore accepts a valid Shopping array of any size within the
transport's existing 512,000-byte response ceiling, but slices before mapping
and identity verification so at most the first 20 rows are considered. It
records only safe enum/count diagnostics: payload shape, returned rows,
considered rows, and discarded rows. Malformed, error-bearing, missing-array,
and transport-failure cases still fail closed.

Final fixture review also found that the CLI copied dry-run target queries into
its running/final evidence envelope even though the diagnostic serializer had
removed them. The v2 CLI now uses a separate sanitized execution plan with no
query fields; dry-run output may still show the exact approved queries, but no
persisted live state can inherit them. The already-saved v1 fixture was scrubbed
in place and remains untracked; it now contains no query, key, provider ID, or
raw response.

The zero-live correction is 41/41 focused, 1233/1233 full across 176 suites,
typecheck/build pass, full lint 0 errors/3 pre-existing warnings, dry-run pass,
and diff-check pass. No additional provider request or app behavior change
occurred.

**Next gate:** the v2 corrective files land in the reviewed revision containing
this record. Any replacement coverage probe requires a new exact five-attempt
approval pinned to that commit. Do not reuse `c3096cd`, and do not count the
failed v1 run as coverage evidence.

**Recommended reasoning level:** Medium for the scoped corrective commit; High
for any separately approved replacement probe and identity audit.

**Phase 3 v2 replacement result (2026-07-21):** the approved replacement was
run once at full commit `44e0e2d70d968780c889801eaa09953f98988bb7`.
The five-attempt ledger reconciled exactly. All five payloads were valid
Shopping arrays, proving the parser correction, and supplied 178 raw rows. The
bounded adapter considered 100 and discarded 78. All 100 considered rows had
an image, but all 100 exposed only Google wrapper links and zero direct merchant
product URLs. The frozen safety contract therefore accepted 0/5 websites and
0/5 images and correctly failed the website gate.

This is now an architectural result rather than a reason to repeat the probe:
Serper Shopping, through the tested response contract, cannot provide the
direct product website required by the combined same-row website-plus-image
policy. Four targets had at least one exact-identity Shopping row, while the
frozen DEWALT `DXV12P-QT` target had none and must be investigated separately
from asset transport. Do not weaken the wrapper rejection or silently treat the
image URLs as verified.

**Next gate:** a separately approved zero-live Phase 4 design correction should
split the website and image evidence contracts, reuse existing verification
gates, and prove through adversarial tests that neither channel can alter Terra
identity or admit a sibling model, accessory, editorial page, or wrapper. It
must also classify the DEWALT identity discrepancy before any further provider
spend. Do not build another Shopping-only coverage probe.

**Recommended reasoning level:** High for Phase 4 because it changes the trust
boundary between Terra identity, product-page links, and product images.

**Phase 4 split asset trust contract (completed uncommitted on 2026-07-21;
zero live):** verifier v2 no longer requires one provider row to supply both
asset classes. A direct product website still needs exact title identity,
product eligibility, a safe non-wrapper host/path, and page-identity agreement.
An image may be selected independently when its row proves exact brand, model,
and product type and either has a verified direct page or carries the private
`serper_shopping` provenance assigned only by adapter v3. A present unsafe or
cross-model direct URL still poisons that row's image. Unknown/editorial
URL-less image provenance remains rejected.

Saved evidence supports retaining Terra's `DXV12P-QT` identity while treating
Shopping's `QTA/QTE` results as non-matching coverage, not aliases. Phase 4
does not normalize suffixes, rewrite the card, or borrow a sibling asset.

Evidence is 33/33 focused, 1238/1238 complete across 176 suites, typecheck,
build, lint at 0 errors/3 pre-existing warnings, and diff-check green. No route,
UI, API contract, flag, or live behavior is wired.

The approved adversarial review proved that a provider-controlled provenance
field cannot override the adapter's fixed Shopping marker and that neither
value reaches verifier output. It also freezes the old Phase 3 probe as spent:
adapter v3 semantics require a newly versioned harness before any future live
coverage request.

**Next gate:** review and commit Phase 4 separately. The strongest subsequent
zero-live step is to resolve product websites from Terra's response-owned,
registered citations before considering a new organic provider query. The
resolver must preserve per-product section association and require existing
product-page identity/eligibility gates; otherwise it must leave the website
unavailable. Live image coverage and UI integration remain later gates.

**Recommended reasoning level:** High for the Phase 4 review and the later
registered-citation website resolver because both protect product identity.

**Phase 5 registered-citation website resolver (completed uncommitted on
2026-07-22; zero live):**
`lib/directTerraCitationWebsiteResolver.ts` resolves a product website only
from a citation that Terra placed inside that product's own ranked Markdown
section and that the Direct-Terra response boundary already registered as
response-owned. It reuses the existing asset verifier for exact title identity,
product type, page eligibility, redirect/host safety, and URL/product identity.
Terra's key, rank, and name remain unchanged; a miss returns `unavailable`.

The resolver parses GFM rather than matching raw Markdown text. Duplicate ranks,
a heading whose product identity conflicts with the locked target, links outside
the section, unregistered links, titleless source metadata, code-block links,
editorial/documents, search/listing pages, Google wrappers, accessories, and
sibling models all fail closed. Only bounded card-safe fields leave the module.
`lib/directTerraResponse.ts` exports its established citation canonicalizer so
the parser and resolver use one ownership definition instead of parallel URL
rules.

The approved pre-commit review found two generalized parser-alignment defects.
Duplicate reference labels previously selected the last definition even though
CommonMark renders the first; the response parser and resolver now both retain
the visible first definition. A titleless first copy of a response-owned source
also discarded a later titled copy of the same canonical URL; deduplication now
fills only a missing title and never overwrites an established one.

Evidence is 48/48 focused and 1249/1249 complete across 177 suites, with
typecheck/build pass, lint at 0 errors/3 pre-existing warnings, and diff-check
green. No provider call, route/UI/API wiring, flag change, or live behavior
occurred. The resolver remains unreferenced outside its tests, so this is safety
proof rather than live website-coverage evidence.

**Commit boundary:** Taylor approved adversarial review and commit of exactly
the seven Phase 5 files listed in the current handoff. The reviewed scope lands
in the revision containing this record. A later zero-live integration phase may
combine this website result with the
independently verified Shopping image result behind the existing default-off
Direct-Terra path, but must first define the exact server-to-client asset
contract and prove flag-off behavior unchanged. No provider request, flag
promotion, or UI behavior is authorized here.

**Recommended reasoning level:** High for later route/UI integration because it
crosses the server/client trust boundary.

**T8A source-split correction (completed uncommitted on 2026-07-22; zero
live):** the first integrated smoke and C5 evidence resolve the provider roles.
Serper Shopping remains the exact-image source; its Google-wrapper or merchant
destination is never a card website. A strict response-owned citation in the
matching ranked section remains the first website source. Only targets without
that strict citation receive one bounded Serper organic
`"<identity> product page"` request, up to five. Organic rows must pass the
existing exact title, requested-type, product eligibility, wrapper, direct-page
and URL/product-identity gates. A miss stays nullable.

This correction also removes the abbreviated-title manufacturer-URL exception.
Static adversarial cases proved that URL/host inference could bless a fake
brand subdomain, accessory route, or compound sibling-model path. A citation
source title must now prove the exact identity just like provider evidence.
Ranked headings independently produce safe asset targets; price observations
are fallback/conflict evidence and cannot hide or rewrite a Terra pick.

The organic adapter is standalone rather than a direct call into legacy
`resolveSerperIdentityLeads()`. It imports no legacy search client, cache,
retries, fallback plan, feature flag, materializer, or ledger. Shopping and
organic share a bounded server transport but fixed endpoint/request contracts;
each lane is sequential, the two lanes run concurrently, and both fail closed
without changing Terra's result. Complete output remains query- and provider-
free.

Evidence is 92/92 focused Direct-Terra tests and 1270/1270 complete tests
across 180 suites, with typecheck/build pass and lint at zero errors/three
pre-existing warnings. A zero-network replay of the saved C5 organic evidence
recovered 3/3 previously proven exact pages through the new adapter: RIDGID
HD1200, CRAFTSMAN CMXEVBE17584, and STANLEY SL18115. This supports the source
choice but does not establish coverage for the five different models in the
next integrated smoke. No provider call, flag, `.env.local`, deployment, push,
or production change occurred.

**Next gate:** a separately approved scoped commit. After that full hash
exists, one replacement integrated smoke may be proposed with ceilings of one
Terra create, 20 hosted searches, 60 retrieves, one safety cancel, five
Shopping attempts, five organic attempts, and $7. No live request, flag
promotion, or deployment is authorized by this plan entry.

**Recommended reasoning level:** Medium for the mechanical reviewed commit;
High for the later identity-by-identity live coverage audit.

### OAI-T8D — cross-category first-loss root diagnosis

**Zero-live observability and saved-evidence audit (completed 2026-07-23):**
ReviewRadar now has an optional server-only trace for recommendation research,
asset-target creation, citation/organic/Shopping normalization and identity
verdicts, page-photo resolution, and final selection. The trace stores bounded
sanitized search actions, counts, host classes, normalized recommendation
identities, and reason codes. Search actions retain bounded query text and
opened-page hosts but never a full opened URL. The trace stores no provider
IDs, raw rows, source titles, secrets, or headers, and a missing or failing
diagnostic sink cannot change a card.

Terra's current response contract does not expose its internal candidate slate.
The diagnostic therefore records that field as explicitly unavailable instead
of conflating final rankings with researched candidates. Adding a structured
candidate slate remains a behavior/schema change and is permitted only if the
diagnostic proves leaders were present in research evidence but omitted from
the final ranking.

The offline analyzer accounted for all 69 ranked products in 17 usable saved
integrated fixtures (12 T8C plus five T8A/T8B). In T8C alone, the historical
path failed to create asset targets for 13/46 ranked products across drills,
gas grills, and robot vacuums. Heading-only replay under the generalized T8C
identity repair recovers all 13. Four more historical links across drills and
gas grills came from non-preferred hosts and are now suppressed by the shared
manufacturer/popular-retailer policy. The remaining nine T8C downstream asset
losses cannot be split between provider absence, normalization, identity,
selection, and page-fetch stages because the old fixtures deliberately omitted
raw candidate verdicts. Likewise, 28 missed-leader observations cannot be
split between absent-from-Terra-research and found-but-not-ranked because old
fixtures retained source hosts but not source-title identity.

**Next gate:** one separately approved diagnostic run for each of the four
frozen T8C cases, using `--first-loss-diagnostic`. Planning ceilings are four
Terra creates total; per run at most 20 hosted searches, 60 retrieves, one
safety cancel, five Shopping requests, eight organic requests, and five bounded
page fetches; the full window has a $5 hard ceiling. The run is attribution
evidence, not promotion evidence. It must stop after four cases, retain only
sanitized traces, and authorize no retry, replacement, flag change, deployment,
or behavior repair. A generalized repair may begin only when the same
first-loss mechanism is demonstrated in two unrelated categories or represents
a category-independent trust invariant.

**Eight-run diagnostic result (completed 2026-07-23, commit `437a682`):**
Taylor doubled the sample to two runs per frozen category. All eight Terra
creates completed with 232 retrieves, 75 hosted search actions, 31 Shopping
requests, 38 organic requests, 20 bounded page fetches, approximately `$4.53`
estimated OpenAI cost, and no runtime/ceiling failure. The window took about
21 minutes 58 seconds. It produced 31 ranked products: 24 clean
manufacturer/popular-retailer links, 19 images, and 18 fully decorated cards.

Recommendation quality remained unstable: office-chair recall was `4/7` and
`3/7`; gas-grill was scored `2/4` and `2/4`; drill was `3/4` and `1/4`; robot
vacuum was `0/4` and `3/4`. Product counts also varied (`5/5`, `4/4`, `5/3`,
and `2/3`). No measured budget violation occurred.

The evidence invalidates a behavior-repair decision from this trace alone.
RR-095 proves the matcher misses `Charbroil` as the punctuation-equivalent
`char-broil` leader. RR-094 proves both reported wrong-type hits are evaluator
false positives caused by a secondary mode/bundled product (`charcoal tray`,
`impact driver combo`), not clearly wrong primary products. RR-096 proves the
first-loss trace is not yet decision-grade: all seven missing links collapse
to `identity_verification_rejected` without bounded candidate identity, and
the recommendation trace calls every missed leader absent even when Terra's
Close Matches section explicitly names it.

One real safety defect is independently visible and does not depend on those
measurement errors: RR-093 records a standard Herman Miller Embody card linked
to the manufacturer's different Embody Gaming Chair variant. The next eligible
work is a zero-live corrective phase: repair the diagnostic/evaluation
contracts and the descriptive-variant veto in separate commits, replay these
eight fixtures, and stop for review. No further live sample is justified until
that replay can produce honest first-loss attribution and zero wrong-variant
links.

**Recommended reasoning level:** High because interpreting equivalent product
identity and separating provider absence from verifier rejection crosses the
accuracy and safety boundaries.

**Zero-live corrective result (completed 2026-07-23, commits `5b3b3cc`,
`192c276`, `71fab76`, and `0ccac73`):** First-loss schema v2 now retains
bounded normalized provider-candidate identity evidence and recognizes products
Terra explicitly named but did not rank. The historical evaluator remains
frozen; a prospective `07d` matcher/scorer corrects punctuation-equivalent
identity and secondary/bundle type context. Asset resolution restores the
shopper's requested category from the encrypted server token and rejects a
candidate link/image when its product URL path positively proves a conflicting
product type.

The eight-run replay accounts for all 31 ranked products. Historical versus
prospective results are 18 versus 19 leader hits and 2 versus 0 wrong-type
hits. Gas-grill run 2 changes from 2/4 to 3/4 because `Charbroil` correctly
covers `char-broil`; seven leaders were explicitly named by Terra but not
ranked. All 24 retained links were revalidated, and the captured standard
Embody-to-Embody-Gaming wrong-variant destination is now blocked.

The replay cannot retroactively reconstruct the provider candidate identities
that schema v1 never saved. Its six indeterminate link warnings therefore do
not prove either provider absence or a verifier defect. A future instrumented
run can make that attribution; no further live work is authorized by this
record. Final verification is 1326/1326 tests across 191 suites, typecheck and
build pass, and lint has zero errors with three pre-existing warnings.

**Adversarial review result (completed 2026-07-23; live window withheld):**
The diagnostic v2, prospective `07d` evaluator, and encrypted request-category
lifecycle passed code inspection and focused probes. The RR-093 safety closure
did not. With the locked standard `Herman Miller Embody Chair` target and an
exact standard candidate title, paths such as
`/products/embody-gaming-office-chair`,
`/products/embody-chair-gaming-edition`, and
`/products/embody-chair-xl` still cross with both link and image. The type veto
detects one ordering of the captured conflict but does not prove descriptive
title/path identity coherence. RR-093 is reopened.

The review reran 84 focused tests and the complete 1326-test wall successfully;
passing tests did not override the new deterministic bypass. Because the
review's pass condition failed, none of Taylor's four approved research
requests or any provider/page request was dispatched. The next eligible step
is a separately approved zero-live generalized descriptive title/path
coherence repair, followed by another adversarial review. No live validation
is justified before that repair passes.

**RR-093 final zero-live closure (completed 2026-07-23, commit `ae5c904`):**
Verifier v4 replaces the incomplete type-only closure with a conservative,
category-independent descriptive title/URL coherence veto. A title-proven
descriptive identity may appear in a product or image path with its brand,
requested-category words, ordinary commerce structure, color/configuration
language, and opaque numeric/hash tokens. Any other path word is unexplained
sibling/edition evidence and rejects that asset. The rule never admits a
candidate, contains no product/category/variant denylist, and does not change
numeric or alphanumeric model behavior.

Fail-first cases cover all three adversarial reordered/suffix bypasses, an
image-only sibling path, and an unrelated refrigerator variant. Safe
retailer/manufacturer paths with brand/category/color/opaque-ID wording remain
accepted. The final adversarial diff review found no material bypass within
the approved path-identity scope. Verification is 43/43 focused and 1330/1330
complete across 191 suites; typecheck/build pass, lint has zero errors and
three pre-existing warnings, and the eight-fixture replay remains fully
accounted with zero live calls.

The next evidence step is not automatic. It requires a new exact approval for
one frozen run in each of the four T8D categories with the v2 trace enabled.
That sample is diagnostic validation of the repaired boundary, not promotion
evidence, and may not change flags, deploy, retry, or reuse the withheld
conditional approval.

**Verifier-v4 live diagnostic stop (2026-07-24, harness commit `9e041e0`):**
The approved one-run-per-category window completed office chairs, gas grills,
and cordless drills, then stopped before dispatching robot vacuum. Actuals were
3 Terra/high creates, 78 retrieves, 24 hosted search actions, 9 Shopping
requests, 10 organic requests, 6 bounded page fetches, 0 safety cancels, and
`$1.594070` estimated OpenAI cost. No retry, replacement, SearchAPI request,
flag change, `.env.local` change, deployment, or production change occurred.

The stop was caused by an upstream report-contract failure, not a verifier-v4
wrong asset. Terra's gas-grill report contained three complete ranked products
under H1 `#N Best Match` headings. ReviewRadar's two separate ranked-product
parsers accept only H2 through H4, so they produced zero cards, zero asset
targets, zero asset-provider calls, and an invalid `0/4` recall score. RR-097
owns the generalized shared-parser/section-boundary/renderer-anchor repair.

The two parsed cases produced nine cards with six clean preferred-host links
and seven images. No retained wrong-model link or image was found. However,
first-loss schema v2 also proved verifier v4 is materially over-conservative:
the office-chair run recorded 23 descriptive URL-conflict verdicts, including
ten exact manufacturer-page rejections across three brands. Later page
extraction recovered four of five safe chair links, but Branch Verve remained
without a website. RR-098 owns this coverage defect; the repair must rely on
positive conflicting identity evidence rather than a growing vocabulary
allowlist, while preserving RR-093 and every existing safety veto.

The sample is incomplete and is not promotion evidence. The next step is
zero-live RR-097 and RR-098 correction plus saved-fixture replay and
adversarial review. The unused robot-vacuum case and any replacement gas run
require a new exact live approval after those repairs pass.

**Recommended reasoning level:** High. The parser repair is mechanical, but
the descriptive-identity correction must recover legitimate pages without
reopening the wrong-sibling trust boundary.

**RR-097/RR-098 zero-live corrective result (completed 2026-07-23, commits
`59ae9bc` and `95fddb5`):** Static inspection corrected the live diagnosis:
Terra's gas labels were bare `#1 Best Match` paragraphs, not Markdown H1.
ReviewRadar now uses one ranked-section contract for bare labels and H1-H4
across shortlist extraction, evaluation, price binding, and rendered anchors.
The current replay restores all three gas products and accounts for every
ranked product in the older eight-run set (31/31) and the three completed
verifier-v4 runs (12/12).

Verifier v4 no longer treats ancestor URL taxonomy as model identity. For
descriptive models, later non-neutral URL detail must be explained by the
locked target/category or corroborated in full by the candidate title; partial
corroboration cannot hide a sibling suffix. Exact manufacturer/popular-retailer
slugs may resolve only an `unknown` generic eligibility result after model,
brand, type, host, path, and conflict checks succeed. Explicit negative
eligibility, accessory, editorial, redirect, private-host, wrong-type,
wrong-model, Q7/Q70, and wrong-image vetoes remain binding.

Verification passes 1337/1337 tests across 192 suites, typecheck, production
build, and the zero-live T8D replay. Lint has zero errors and the same three
pre-existing warnings. The sanitized v2 fixtures do not retain enough raw
provider detail to reconstruct post-fix live link coverage, so no live coverage
improvement is claimed.

The smallest next evidence window is separately approved and diagnostic only:
rerun office chairs to measure the repaired verifier, replace the invalid gas
measurement, and execute the previously unused robot-vacuum case. Cordless
drill need not be repeated because neither correction targets its completed
path. No approval, flag promotion, deployment, or production change is implied
by this record.

**Three-case root-cause revalidation (completed 2026-07-23, pinned commit
`56b6df0`):** The exact approved office-chair, gas-grill, and robot-vacuum
window completed once and stopped. Actuals were 3 Terra/high creates, 89
retrieves, 29 hosted searches, 11 Shopping requests, 14 organic requests, 8
bounded page fetches, 0 safety cancels, `$1.779518` estimated OpenAI cost, and
approximately 8 minutes 18 seconds. All 11 ranked products were accounted;
sanitized evidence remains untracked under
`oai-t8d-root-cause-revalidation-56b6df0/`.

RR-097 and RR-098 passed their targeted live checks. Gas produced four parsed
cards and four asset targets rather than zero. Office produced five clean
manufacturer links and five images without a retained wrong sibling. However,
the overall safety gate failed: a Tapo RV30 MAX Plus card received an Amazon
replacement-water-tank/accessory URL. RR-099 records the generalized missing
product-versus-complement veto. The provider trace proves this was not a
provider-absence problem: the accessory candidate was present, normalized,
and incorrectly accepted.

Recommendation quality also remains inadequate but is a separate root. Recall
was office `3/7`, gas `1/4`, and robot `0/4`. Four leaders across gas and robot
were explicitly named in Terra's report but omitted from the ranked cards,
while 14 leader observations were absent from retained Terra research
evidence. RR-014 therefore contains both research-coverage and ranking-stage
loss. The future recommendation repair should introduce a generalized
structured candidate slate and requirement/rubric verdict inside the same
Terra call before final ranking; it must not hardcode leaders or deterministic
category queries.

The next eligible work is zero-live RR-099 closure and replay. No further live
sample, promotion, deployment, flag change, or production action is justified
until the wrong-destination trust boundary passes.

**One-case Sol comparison (completed 2026-07-24, pinned commit `05c1d20`):**
Taylor approved one frozen constrained robot-vacuum comparison with only the
OpenAI research model changed from Terra/high to Sol/high. The unchanged
prompt, schema, evaluator, Serper asset resolver, and safety rules were used.

The run completed with 1 create, 15 hosted searches, 56 retrieves, 4 Shopping
requests, 5 organic requests, 3 bounded page fetches, 4 selected-image
retrievals, 0 safety cancels, `$1.448205` estimated OpenAI cost, and about
5 minutes 3 seconds wall time. It stayed within every approved ceiling and
performed no retry, replacement, fallback, second response, additional case,
flag change, `.env.local` change, deployment, production change, or push.

Sol improved recommendation recall from the saved Terra run's `0/4` to `2/4`
and ranked four products instead of two. It had zero scored wrong-type or
budget violations and all four cards carried self-emptying evidence. The
improvement did not pass the planned bar: Shark remained absent, eufy was
researched but not ranked, deterministic price coverage was only `1/4`, and
one run cannot score stability.

Asset availability was 4/4 links and 4/4 images mechanically. Manual semantic
review changed the trustworthy result to 3/4 product links: the exact same
Tapo replacement-water-tank Amazon URL from RR-099 was selected again. All
four downloaded images showed a complete robot vacuum with its dock and were
supported by exact-product Shopping or verified-page identity, but two were
Google Shopping thumbnails rather than page-derived assets. Therefore Sol is
a promising recommendation-quality lever, not an asset-safety repair or a
promotion decision. Terra remains the production default and Direct-Terra
remains default-off.

### OAI-T9 — final convergence

**Phases 1–2 complete-product safety result (completed 2026-07-24):**
Direct-Terra verifier v5 now assigns one server-only relationship to every
citation, organic, Shopping, and fetched-page candidate:
`complete_product`, `bundle_including_product`,
`accessory_or_replacement`, `different_product`, `non_product_page`, or
`unknown`. Only the first two may supply a website or image. Exact identity is
therefore necessary but no longer sufficient.

The generalized boundary rejects standalone complements even when their title
and URL repeat the complete product's brand/model. It preserves explicit
complete-product bundles and all existing sibling, wrong-type, editorial,
redirect, private-network, descriptive-variant, numeric-boundary, and
wrong-image vetoes. Ambiguous candidates may receive one bounded product-page
fetch per ranked product, capped at five per request; page title or JSON-LD
Product metadata must then prove the complete product. Failure or continued
ambiguity leaves the asset unavailable.

The tracked sanitized relationship corpus and generated mutations cover
manufacturer/retailer products, bundles, batteries, tanks, filters, hoses,
brushes, docks, chargers, parts, parent-model text embedded in complements,
sibling suffixes, punctuation/spacing, `Q7` versus `Q70`, descriptive models,
brand conflicts, editorial/support/category/search/redirect/private pages,
wrong images, sparse Product metadata, and unresolved evidence. No
product/brand/category/retailer exception was added.

Offline replay accounts for all 31 ranked products in the eight-run T8D set
and revalidates its 24 retained links. The later T8D and T8E fixtures now
definitively reject RR-099's replacement-water-tank ASIN. Historical fixtures
that omitted original provider title evidence remain explicitly
indeterminate rather than being silently counted as failures. The complete
wall passes 1,354/1,354 tests across 195 suites; typecheck/build pass and lint
has zero errors with three pre-existing warnings. RR-099 is Fixed. No external
request, flag, deployment, or production change occurred.

**Phase 3 same-call candidate-slate result (completed 2026-07-24):**
`direct-terra-master-prompt-v3` now requires one server-only 8–15 product
candidate slate before final ranking. Deterministic request-derived IDs cover
U.S. availability, active budget, Important Details, every selected Smart
Feature, and dealbreakers in stable order. Every candidate carries an exact
identity, disposition, nullable rank, evidence quality, concise reason, exact
same-response hosted-search URLs, and one source-backed verdict per applicable
requirement.

The polling boundary fails closed on missing/reordered/duplicate verdicts,
invented or cross-candidate evidence URLs, punctuation/spacing-equivalent
duplicate models, rank/heading/price identity drift, ranked hard failures, an
unverified Best Match, or unreported lower-rank uncertainty. The encrypted
job token preserves only category plus ordered requirement IDs. Validated
diagnostics contain normalized identities, dispositions, ranks,
evidence-quality labels, and verdict statuses only. The client completed
response, Terra report and order, nullable asset behavior, and default-off
flags are unchanged.

Adversarial review also separated exact response-owned URL validation from the
canonically deduplicated public source list, rejected unsafe Smart Feature IDs
before provider work, and bounded the maximum 29-requirement encrypted token.
The complete wall passes 1,370/1,370 tests across 197 suites; typecheck/build
pass and lint has zero errors with three pre-existing warnings. No external
request occurred.

**Phase 4 frozen-acceptance preflight (completed zero-live 2026-07-24):**
The final sample is now executable only through
`scripts/run-oai-t9-final-acceptance.mjs`. Dry-run is the default. Live mode
requires the exact full current commit, the frozen `$22` ceiling, explicit
acknowledgment of the audit-only network allowance, a clean tracked tree, and
process-only secrets. It exercises the actual Direct-Terra POST/poll route,
forces `gpt-5.6-sol` with high reasoning, disables SDK retries, retains failed
routes in the fixed denominator, and cancels any known unfinished job.

The frozen sample is exactly the existing office-chair, gas-grill,
cordless-drill, and robot-vacuum cases, three times each. Prompt/schema hashes,
the V3 prompt, the prospective `leaders-v2026-07d-matcher` against the unchanged
`leaders-v2026-07c` denominator, complete-product verifier v5, first-loss
contract, all provider ceilings, and the 12 comparable T8C report hashes are
pinned before spend.

The evaluator does not average away a bad repeat: every one of the three
within-case product-set pairs must reach `0.60`. It also requires 12/12
completed routes, 3–5 ranked products, consistent 8–15-product slates, no hard
failure, a fully passing constrained Best Match, complete ranked-product/asset
accounting, office-chair recall mean at least `4/7` with no run below `3/7`,
and a blinded win/tie in all four cases with at least two clear wins. A lower
constrained rank may remain `needs_verification` only under the already-frozen
V3 disclosure contract.

Human review remains load-bearing. Every recommendation is checked for exact
identity/type and applicable hard requirements; every displayed destination
and retrieved image is checked for exact identity; and two active
same-response sources are inspected for each of the top two products in every
run. The original live envelope did not include the network operations needed
to perform those checks. The exact approval must therefore also allow, for
audit only, at most 60 selected-image retrievals, 60 displayed-destination
opens, and 48 claim-source opens. These requests cannot discover, rank,
replace, or decorate products.

Current official Sol short-context pricing is `$5/M` input, `$0.50/M` cached
input, `$6.25/M` cache write, `$30/M` output, plus `$0.01` per hosted search.
Using the more conservative cache-write rate for every uncached input token,
12 times the largest of 14 saved T8D observations is `$19.605795`; the frozen
`$22` ceiling provides a 12.2% V3-overhead buffer. The runner also reports
standard and conservative observed cost plus latency.

The post-freeze completion audit found and closed RR-100 before spend.
Textual private-host rejection was not enough for the server-side bounded page
and image-audit requests: a public-looking hostname could resolve to a private
address. Both transports now resolve every host, reject any non-public answer,
and pin the connection to a validated public address. Product-page redirects
repeat that check and remain on the original registrable domain; audit images
follow no redirect. This strengthens the existing generalized private-network
boundary and changes no recommendation, rank, or asset acceptance rule.

The final runner audit also closed RR-101 and RR-102. Visual-audit downloads
now retain only supported raster formats whose bytes match their declared
type; misleading `image/*` labels cannot create an audit file. The runner now
reserves `$1.633816`—the frozen conservative observed per-run maximum—before
each create and checks observed conservative cost afterward. This is an
operational provider-spend boundary, not a claim that an already-dispatched
API response can be stopped at an exact dollar amount.

Terminal analysis is predeclared. A recommendation, stability, schema, route,
or evidence failure makes the single-call architecture a no-go. An asset-only
safety failure disables assets while retaining recommendation cards. Low safe
asset coverage passes. A measurement defect invalidates the sample and stops
for an architecture decision. Passing every gate makes promotion eligible
only through a later separate approval. No category-specific repair follows
this window.

Zero-live verification passes 1,384/1,384 tests across 199 suites; typecheck
and build pass; lint has zero errors and three pre-existing warnings; the
commit-pinned baseline dry run passes; and no provider/page/image request,
flag change, `.env.local` edit, deployment, production change, or push
occurred.

**Phase 4 live acceptance and Phase 5 terminal decision (completed
2026-07-24):** The commit-pinned window ran exactly once against
`5b99014e4b2b73d7aac0f89999eceb5d8da2e806`. All 12 fixed creates were
dispatched without retry, replacement, fallback, or extra case. Only one
route completed. Five remained pending at the 60-retrieve ceiling and six
returned route-poll HTTP 502 after 51-60 retrieves. The full window used 13
hosted searches, 704 retrieves, 11 safety cancels, five Shopping requests,
six organic requests, five candidate-page fetches, and four selected-image
retrieval attempts.

The one completed response was constrained cordless-drill run 2. It returned
five legitimate drills, met the automated hard constraints, and covered
`2/4` frozen leaders. Manual review nevertheless found one unsupported
top-product claim, one wrong image, one displayed destination that could not
be verified as an exact product page, and one selected image that could not
be audited. The saved T8C result won all four blinded case comparisons; Sol
had zero clear wins. Because eleven runs produced no completed report, every
within-case product-set Jaccard was `0`.

The evaluator recorded no measurement defect and no pending human review.
It returned `single_call_architecture_no_go`, with route, recommendation,
evidence, and asset-safety failures. The runner measured `$1.452307` standard
and `$1.586910` conservative cost only from usage returned by the completed
response; provider billing for the 11 incomplete/failed creates is unknown.
The measured number is not a total-cost claim for the window.

Phase 5 therefore applies the predeclared non-asset-failure branch. Direct-
Terra remains off and undeployed, Terra remains the application default, and
no model, flag, `.env.local`, deployment, production, or push state changed.
OAI-T9 is terminally complete. No prompt patch, category-specific repair,
replacement run, or live retest follows. Taylor subsequently selected a
separate Terra-only staged direction: compact research, deterministic
verification, then evidence-bounded presentation. That is a new architecture,
not an OAI-T9 continuation, and it remains default-off until separately proven.

### OAI-T10 — Terra-only staged pipeline

**Architecture decision:** replace the oversized single autonomous response
with three explicit ownership boundaries:

1. a compact Terra/high research call with hosted web search produces an
   8–15-product evidence-lead slate but no ranking, cards, or shopper advice;
2. deterministic server code owns identity, requirement, price, source,
   eligibility, product-page, and image verification; and
3. a separate Terra/medium presentation call receives only the verified
   evidence package, has no web-search tool, and may rank or explain only
   eligible candidates using server-issued fact IDs.

This preserves Terra's comparative judgment while moving safety-critical facts
out of model ownership. It attacks OAI-T9's proven route-size and evidence
failures rather than changing models or adding another category-specific
prompt patch.

**Phase A — architecture and contracts (completed zero-live 2026-07-24):**
The default-off `staged-terra-contract-v1` boundary now freezes the research
schema, the server-owned verified-evidence package, and the presentation
schema. Both model calls are pinned to `gpt-5.6-terra`. Research is bounded to
10 hosted searches and 8,000 output tokens; presentation is bounded to 8,000
output tokens and has no tools, prior-response coupling, or autonomous source
access.

Research candidates must be ordered `candidate_1` through `candidate_15`,
retain exact brand/model/product identity, cite response-owned HTTPS source
URLs, and carry every request requirement in its exact server-issued order.
Duplicate normalized identities, invented sources, and requirement drift fail
closed.

The evidence package is the permanent trust boundary. An eligible product must
pass every hard requirement. Subjective performance and owner-sentiment claims
may be `source_reported`, never deterministically `verified`. Product and image
assets must bind to exact server evidence. Presentation may use only eligible
candidates and candidate-owned fact IDs; it cannot rename products, borrow
evidence, emit URLs, or rank close matches.

The new server/client flags are both default-off, and the current route does not
import or execute this path. No provider, page, image, destination, or other
external request ran. Focused tests pass 14/14; the complete wall passes
1,398/1,398 across 203 suites; typecheck and build pass; lint has zero errors
and three pre-existing warnings.

**Phase B — deterministic verifier materialization (completed zero-live
2026-07-24):** `staged-terra-verifier-v1` converts every validated research
candidate, in unchanged `candidate_N` order, into exactly one `eligible`,
`close_match`, or `excluded` evidence-package result. It composes the existing
hybrid exact-entity verifier, exact-commerce verifier, complete-product
relationship and asset verifier, budget parser, and semantic requirement
validator rather than creating a parallel trust system.

The materializer accepts only candidate-owned source URLs and successful
bounded-fetch receipts. It derives each immutable page observation from the
receipt body and rejects a byte-count or content-hash mismatch. Research
requirement/fact leads never become facts directly. A source-reported claim
must appear in the observed visible page text, come from an identity-safe
source role, and pass the existing semantic requirement validator before it
can satisfy a hard requirement. Performance and owner evidence remain
`source_reported`; they are never mechanically upgraded to `verified`.

Exact structured product pages or exact Shopping offers may establish
identity, complete-product type, U.S. availability, price, product URL, and
image only through the pre-existing sibling, accessory, wrong-type,
non-product, redirect, private-network, and wrong-image gates. A hard failure
excludes the candidate; missing hard evidence produces a close match. Assets
are emitted only for fully eligible candidates. The module cannot browse,
rank, backfill, call a provider, or alter the current route.

Adversarial tests cover candidate/source ownership, immutable body binding,
over-budget and out-of-stock products, missing requirements, misleading model
support labels, explicit dealbreakers, sibling numeric models, accessories,
wrong product types across categories, and unsafe manufacturer-spec evidence.
Focused tests pass 12/12. The complete wall passes 1,410/1,410 across 204
suites; typecheck and build pass; lint has zero errors and three pre-existing
warnings. No external request, route, flag, `.env.local`, deployment,
production, or push state changed.

**Phase C — adapters and route integration (completed zero-live
2026-07-25):** the staged branch now composes the Phase A contracts and Phase B
materializer into an end-to-end, default-off application path. One
Terra/high background research response is polled with an authenticated,
encrypted app token; server code then gathers at most two response-owned pages
per candidate through the DNS-pinned bounded-fetch seam and at most one
exact-identity Shopping batch per candidate. The verified package—not the
research response ID or raw model output—enters one independent synchronous
Terra/medium presentation response with no tools or prior-response coupling.

The renderer preserves evidence-package identity and assets and accepts only
fact/evidence-bound presentation prose. A purchase URL is displayed only when
an exact verified price receipt uses that same URL; otherwise the card says to
check the current price. Subjective source claims remain source-reported.
Provider IDs, raw responses, page bodies, request headers, and server
diagnostics never enter the client envelope.

Lifecycle safeguards cancel known unfinished jobs on browser abort, expiry,
invalid provider identifiers, unusable app-token state, and unexpected
non-terminal presentation responses. Completion work is de-duplicated per
research response, oversized token payloads fail before paid research, and
completion exceptions become sanitized API failures. Source classification is
conservative: structured product identity without an offer is not called a
purchase page, and no arbitrary host is labeled official.

The application selects this path only when the committed-default-off server
flag and client selection header agree. With the server flag off, the legacy
route remains byte-equivalent. Focused Phase C tests pass 29/29; the complete
wall passes 1,425/1,425 across 208 suites; typecheck/build/diff check pass and
lint has zero errors with three pre-existing warnings. No external request,
`.env.local`, flag promotion, deployment, production state, or push changed.

**Phase D — first live feasibility outcome failed, 2026-07-25:** the frozen
broad `shop vac` attempt at `ec528d7` used one Terra create, thirteen retrieves,
and two hosted searches. The provider completed 21,932 input tokens, 5,318
output tokens, and 36 response-owned sources, but the result failed the strict
research boundary as `invalid_research_contract`. Verification, presentation,
Serper, page fetching, and public rendering never ran. The recorded usage
prices to approximately `$0.154600` standard or `$0.168307` conservatively,
although the harness incorrectly reported zero by excluding terminal failed
validation from cost accounting. The sanitized diagnostic also omitted the
runtime's bounded validation-reason enum, so this evidence cannot distinguish
shape, source-registry, candidate, or duplicate-identity failure. Before any
replacement spend, correct those two zero-live observability defects and
identify the exact failed invariant. Do not weaken the contract by guess.

**Phase D continuation — PR-3A/PR-3B, 2026-08-29:** successive bounded,
commit-pinned corrections eventually let one frozen `shop vac` measurement at
`43857e0` cross research and verification-input collection. It still failed
before presentation: deterministic verification excluded all ten candidates,
with nine coarse first losses at asset identity and one at the identity-safe
product URL gate. The first-terminal/no-retry envelope, cost ceiling, privacy
allowlist, and artifact hash independently returned `VERIFIED`; the artifact is
spent and cannot identify the exact candidate or decision reason.

The zero-live PR-3B correction advances the materializer diagnostic to
`staged-terra-verifier-v3` and future sanitized evidence to v4. It derives only
fixed affected-candidate counts from existing direct-asset, Shopping,
relationship, and URL decisions. The route independently enforces exact keys,
integer and branch bounds, first-loss/outcome conservation, and subreason
coverage; invalid/private aggregates are omitted, and the public API is
unchanged. Eligibility and trust rules did not change. After the self-contained
PR-3B commit, one separately bounded PR-3C measurement may use a new commit-
derived directory under the same first-terminal/no-retry/no-fallback ceilings.
If it fails, use the overlapping branch-specific counts only to select an
evidence-supported offline reproduction target; establish a generalized cause
there before changing behavior. Phase E remains blocked until a shopper
lifecycle succeeds.

**Phase D continuation — PR-3C/PR-3D, 2026-08-29:** the one evidence-v4 PR-3C
measurement at clean commit `a7434262` stopped after provider research as
`research_candidate_invalid / candidate_identity`, before source collection,
Shopping, verification, presentation, or rendering. The first-terminal/no-
retry envelope, `$0.192316` frozen-conservative cost, one-file hash, and privacy
allowlist independently returned `VERIFIED`. The sanitized artifact identifies
only the first invalid candidate's field group; the exact field, invariant,
candidate, and value remain unknown, and the result does not explain PR-3A.

Offline inspection selected a stronger generalized target than more diagnostics
or another unchanged call. Strict JSON Schema bounded `product_name`, `brand`,
`model`, and `product_type` independently but could not express their dynamic
coherence relation. Existing deterministic cases reproduced four schema-valid
tuples that the unchanged shared verifier necessarily rejected. PR-3D removes
the redundant composite from the research wire contract: schema v4 emits only
bounded atomic identity fields, and server code normalizes them and constructs
the internal name within the existing 300-character limit before running the
same fail-closed coherence rule. Contract v6, prompt v5, and runtime v5 roll old
work closed. No downstream identity, source, relationship, evidence, commerce,
eligibility, ranking, public API, flag, or deployment rule changes.

After independent approval and a clean self-contained PR-3D commit, PR-3E may
run the unchanged frozen case once in a new commit-derived directory under the
same first-terminal/no-retry/no-fallback ceilings. A stop selects only another
offline reproduction target; a complete shopper result unlocks Phase E's
bounded quality/stability matrix.

**Phase D continuation — PR-3E/PR-3F, 2026-08-29:** the one evidence-v4 PR-3E
measurement at clean commit `bf7e37b4` completed provider research with 12
candidates and 53 response-owned sources. Every candidate supplied one local
source. Collection attempted 12 candidate pages, four succeeded, and 12
Shopping requests returned 201 rows. Deterministic verification then excluded
all 12 candidates at asset identity before presentation: eight had no asset
candidate and four observed asset records lacked the model in their titles.
Overlapping commerce outcomes are diagnostic only and do not prove a private
candidate-level cause.

The 42.273-second first-terminal run used one create, 14 retrieves, three hosted
searches, one cancel, and `$0.184904` frozen-conservative estimated cost. No
retry, replacement, fallback, second case, organic/SearchAPI call, public
result, flag change, or deployment occurred. The 16,119-byte one-file artifact
hash, counters, usage, conservation, branch bounds, and privacy independently
returned `VERIFIED`, confidence 0.99. It is immutable and spent.

PR-3F closes the reproduced upstream mismatch without loosening verification.
Research schema v5 requires exactly two fetch-distinct exact response-owned
URLs per candidate and limits local source indexes to 0/1. Exact membership
still establishes ownership. A separate rejection key removes only established
tracking parameters and URL fragments so two exact anchors or tracking variants
of one physical page cannot spend both fetch slots; identity-bearing query
parameters remain distinct. Exact titles are retained or backfilled only for
the identical URL and never borrowed between canonical variants.

Before collection, at least one candidate-owned exact title/URL record must pass
the unchanged shared asset-identity verifier. Title-visible identity is
preferred, while the existing bounded manufacturer/established-retailer
product-slug path remains intentional; sibling and unknown-retailer slug
authority fail. Response metadata is preflight only and cannot become final
evidence or shopper output. The 15-candidate schema maximum times two sources
equals the unchanged 30-fetch ceiling. Contract v7, prompt v6, and runtime v6
roll old jobs closed. Independent review returned `APPROVED`, no findings,
confidence 0.98 after fetch-equivalence, prompt/runtime alignment, title-
backfill, ceiling, slug-path, and mutation corrections.

After a clean self-contained PR-3F closeout, PR-3G may run the unchanged frozen
case exactly once in a new commit-derived directory under the same ceilings and
first-terminal/no-retry/no-fallback rules. A stop selects only a generalized
offline reproduction; a safe shopper result unlocks Phase E. PR-3F does not
prove PR-3E causation, live adherence, quality, latency, or cost.

**Phase D continuation — PR-3G/PR-3H, 2026-08-29:** the one evidence-v4 PR-3G
measurement at clean commit `ac53c10e` reached provider `completed` but failed
local research validation as `research_candidate_invalid / candidate_sources /
candidate_source_identity_unproven`. It stopped before page collection,
Shopping, deterministic verification, presentation, or rendering. The
75.501-second first-terminal run used one create, 31 retrieves, six hosted
searches, one cancel, 56,876 input tokens, and 7,759 output tokens; frozen-
conservative cost was `$0.354123`. No retry, replacement, fallback, second case,
public result, flag change, or deployment occurred. The 26,300-byte artifact
hash, terminal sequence, counters, usage, cost, and privacy independently
returned `VERIFIED`, confidence 0.99. It is immutable and spent.

The completed provider response below the output cap refutes the token-cap
hypothesis. Its privacy boundary does not reveal whether every candidate failed
or which title/brand/model/conflict/type reasons applied. PR-3H therefore fixes
the generalized all-or-nothing handling rather than guessing a prompt change or
weakening identity: after the unchanged strict 8–15-candidate parse, only
candidates whose two exact response-owned source records both fail the shared
asset verifier are quarantined. Survivors retain order and receive contiguous
server-owned candidate/fact IDs; rejected URLs never enter collection. Zero
survivors retain the same bounded failure triple.

The server-only filter diagnostic reports only submitted/accepted/rejected
counts and five reachable reason families. The verifier contributes one or two
distinct families for each rejected candidate. Route sanitization binds
completion to the actual survivor count, failure to the exact zero-survivor
context, each family to no more than the rejected count, and the aggregate
reason total from the rejected count through twice that count. Contract v8,
runtime v7, and future sanitized evidence v5 roll old work closed; schema v5,
prompt v6, public responses, network ceilings, and downstream trust rules are
unchanged. Independent review returned `APPROVED`, no findings, confidence
0.97 after context-binding, two-source conservation, unreachable-bucket, and
mutation corrections.

After a clean self-contained PR-3H closeout, PR-3I may run the same frozen case
once in a new commit-derived directory under the unchanged first-terminal/no-
retry/no-fallback envelope. A smaller survivor slate is not success. Only a
safe public shopper result unlocks Phase E; another stop selects a generalized
offline reproduction.

**Phase D continuation — PR-3I/PR-3J, 2026-08-29:** PR-3I spent the one
evidence-v5 measurement at clean commit `bd54de90`. Provider research completed,
then local preflight stopped as `research_candidate_invalid / candidate_sources
/ candidate_source_identity_unproven` before every product-data and presentation
stage. The 56.020-second run used one create, 24 retrieves, five hosted searches,
one cancel, 47,475 input tokens, zero cached input, and 5,516 output tokens;
frozen-conservative cost was `$0.281099`. Its 21,584-byte artifact, SHA-256
`03D442FFE14D819D6C23A2E76C2458E37AF6A2EBE7691A6DC4F6EA0ED2827B3F`,
independently returned `VERIFIED`, no findings, confidence 0.99, and is spent.

The bounded filter reported 10 submitted, zero accepted, 10 rejected, and one
or more missing-title decisions for every candidate, with every affirmative
mismatch family at zero. That aggregate does not reveal which source was
titleless or whether both were. It does establish a generalized consumer/API-
contract mismatch: the official complete consulted-source action is URL-only,
while the preflight treated unavailable title metadata as identity rejection.

PR-3J keeps the shared identity predicate intact but makes source preflight
three-state. Any exact titled record that proves identity retains the candidate;
if none does and at least one exact record lacks a title, the candidate is
deferred to the existing bounded DNS-pinned fetch and unchanged page/entity
verifier. Only all-affirmative title mismatches quarantine it. The diagnostic
adds a deferred-missing-title subset of accepted/continued candidates and keeps
only four affirmative mismatch families. Exact-key sanitization enforces
conservation, `deferred <= accepted`, completion-slate binding, and zero
deferred candidates in the all-rejected failure context. Contract v9, runtime
v8, and future evidence v6 roll old work closed; schema v5, prompt v6, URL
ownership, public behavior, default-off flags, ceilings, and downstream trust
rules remain unchanged.

Independent source-only review returned `APPROVED`, no findings, confidence
0.96. Its accidental test run that read tracked public `.env.example` is
non-authorizing and excluded from proof; the source verdict and the implementing
agent's 169/169 focused, 1,498/1,498 full, 17/17 E2E, static, build, benchmark,
and reconciliation walls are separate. After a clean PR-3J closeout, PR-3K may
measure the unchanged frozen case once in a new directory. It is not a retry of
PR-3I: it tests contract v9/runtime v8/evidence v6. Only a safe public shopper
result unlocks Phase E.

**Phase D continuation — PR-3K, 2026-08-29:** the one evidence-v6 measurement
at clean PR-3J commit `8c57cd59` completed the entire frozen `shop vac`
lifecycle. Research started once, returned 39 in-progress retrieves, and
completed on retrieve 40. Deterministic verification and the no-web presentation
then completed in the same route lifecycle. Public output contained four unique
sequential cards and eight resolving source entries.

The 116.495-second run used two creates, eight hosted searches, 10 Shopping
requests, 20 source fetches, and 25 physical HTTP attempts. It used no cancel,
retry, replacement, fallback, organic, SearchAPI, second case, flag change, or
deployment. Usage was 77,273 input, zero cached input, 9,064 output, and eight
search calls; frozen-conservative cost was `$0.457438`, below `$3`.

Tri-state preflight continued and deferred all 10 submitted candidates, with
zero affirmative mismatch rejection. Four became eligible, zero close, and six
excluded after bounded product-data verification. First-loss counts conserve as
five asset identity, one product URL, and four no-loss eligible; relationship and
hard-requirement loss stayed zero. The aggregate cannot identify excluded
products or distinguish one versus two titleless sources.

The exact spent directory contains only 51,640-byte `result.json`, SHA-256
`9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
Independent strict audit returned `VERIFIED`, no findings, confidence 0.99 for
binding, sequence, conservation, cost, public reconciliation, privacy, and
default-off state. This closes one-attempt feasibility only.

Phase E/PR-4 must now measure the staged path itself. The existing quality
scorecard targets `/api/recommendations` and a July leader snapshot, so reusing
it unchanged would measure the wrong route and possibly stale truth. Freeze a
small current-market broad/constrained/adversarial/over-constrained matrix,
review its truth and cost boundary independently, then run at low parallelism.
No production flag or deployment decision follows from PR-3K alone.

**Phase E — quality/stability and promotion decision:** only after feasibility
passes, compare multiple frozen categories against the existing baseline. A
flag promotion, deployment, or retirement of the old path remains a separate
decision.

**Recommended reasoning level:** Highest for Phase B's trust-boundary mapping
and Phase C's lifecycle review; High for mechanical tests and the bounded live
execution.

### OAI-2B — early uncached quality and repeatability gate

**Approval/cost:** separate approval only after OAI-2A passes. Use four frozen
primary shopper shapes across four categories—two broad and two constrained,
with the ambiguity/injection shape included—and obtain three uncached Call 2
responses per shape. If prompt/schema/model/configuration is unchanged after
OAI-2A, its three research responses count as repeat one for their shapes;
OAI-2B then buys two additional repeats for those three shapes plus three runs
of the fourth shape: nine new research calls and 12 total evaluated Call 2
outputs. If any material input changes, no OAI-2A output is pooled and the
OAI-2B budget must be re-approved from zero. Freeze the cleaned request for the
ambiguity case so this gate isolates Call 2 repeatability. Zero Serper calls,
zero automatic retries, and no replacements without new approval.

This is the make-or-break quality experiment before building the permanent
network verifier or route integration. Score the raw model-authored slates,
with only schema/source-binding checks, against the frozen rubric and most
recent comparable legacy evidence. Require all of the following:

- zero hard-requirement contradictions and zero wrong-type, editorial,
  accessory-only, cross-model, invented-URL, financing-price, or unsupported-
  image cards;
- 100% same-response source binding for every displayable field, and all 12
  authorized Call 2 outputs complete successfully under the strict schema; a
  model refusal, incomplete response, or schema failure is a gate failure, not
  an excluded run;
- broad shop-vac top-five leader recall mean at least `4/7`, with no run below
  `3/7`; do not loosen the denominator or insert leaders into the prompt;
- final-set Jaccard at least RR-015's `60%` within each repeated shape;
- no loss of a verified hard-constrained Best Match; and
- a blind quality win or tie against the comparable legacy result on at least
  three of the four request shapes (`75%`).

OAI-2A actual token, hosted-search, cost, and latency data define a predeclared
per-request ceiling before approval; do not invent an arbitrary `<60s` or dollar
bar before the technical probe. Exceeding the ceiling blocks progression but
does not erase otherwise useful quality evidence.

The OAI-2B approval also states the bounded manual source-page inspection
allowance needed to judge semantic support. These are human audit opens, not
application verifier traffic or an additional research provider.

**Failure:** attribute each miss to prompt/evidence, unsupported product facts,
model/configuration, instability, or architecture. One generalized and clearly
fixable cause may justify a separately approved zero-live prompt/schema revision
and a completely fresh OAI-2B sample. An architecture-level failure, safety
failure, or second failed sample kills the migration before scaffolding grows.

**Recommended reasoning level:** High for execution; Highest for the
architecture decision.

### OAI-3 — bounded network verifier and presentation adapter

**Approval/cost:** separate approval only after OAI-2B passes; zero live
OpenAI/Serper calls and no external fetches during implementation tests; no
route behavior.

Implement a narrow verifier and adapter against the proven OAI contract. Reuse
existing generalized requirement, product eligibility, identity, product-page,
image, price, URL, citation, and dedupe primitives, but do not assume their
current names imply the new guarantee. Existing citation reachability treats
some error/time-out states as reachable, and existing price trust can accept
plausible model text; add fail-first coverage before relying on either path.

Add a bounded direct-fetch seam that is fully mocked in this phase. It may
request only source URLs already returned by Call 2 and must apply the SSRF,
redirect, byte, type, credential, timeout, and logging restrictions in the OAI
invariants. Verify exact product-page identity and the displayed purchase
price/URL/image when mechanically possible; source binding—not a claimed
semantic oracle—continues to govern prose evidence. Add fail-first tests for
every historic trust class, source-reference spoofing, consulted-but-uncited
pages, duplicate source IDs, malformed/hostile URLs, redirects to private
networks, mixed variants, unsupported rankings, unknown mandatory features,
missing prices, blocked/inconclusive fetches, and fewer-than-five valid cards.
The adapter preserves surviving order and clearly labels Close Match/unknowns.

**Exit:** zero unsafe mocked cards survive; no verifier branch discovers,
scores, rescues, invents, or reorders; direct-fetch decisions are reason-coded
and observable; all outbound requests are bounded and target only allowlisted
same-response URLs; full test/typecheck/lint/build/offline-eval wall passes.

**Recommended reasoning level:** Highest. This is the permanent safety
boundary, not temporary test scaffolding.

### OAI-4 — default-off legacy/shadow/openai route integration

**Approval/cost:** separate approval; zero live calls or external verification
fetches during implementation; no promotion and no deletion.

Integrate the OAI adapter and verifier behind one default-`legacy` mode.
`shadow` executes and records the new result only during a separately approved
live phase; `openai` displays only the verified OAI result and sends no Serper
request. Use background Responses API execution and bounded polling when
needed, handle terminal error/incomplete/refusal states, and prevent retries
after ambiguous timeouts. Keep the current route byte-identical in legacy
mode. Do not silently fall back per request: an OAI failure is observable,
while owner rollback is a mode change.

**Exit:** flag-off/legacy response parity, shadow non-interference, proven zero
Serper dispatch in OAI mode, exactly one autonomous research Call 2 per
completed shopper request, Call 1 absent for complete structured inputs and
present only for deterministically identified cleanup cases, outbound verifier
requests bounded and attributable, and full verification green.

**Recommended reasoning level:** Highest. The risk is network trust, wiring,
and rollback—not prompt prose.

### OAI-5 — production-path verification gate

**Approval/cost:** separate approval after OAI-4. First replay all 12 OAI-2B
raw responses through the final local verifier using frozen page evidence or
fully controlled mocks; this portion is offline. Then run one cache-cold full
OAI-path request for each of the four frozen primary shapes (four autonomous
research calls total) with live direct verification enabled. No legacy Serper
path runs in parallel; compare blindly against the frozen comparable legacy
evidence so this phase measures the new path instead of buying hundreds of
provider calls. Report all OpenAI tokens/tool calls and every verification
fetch; impose ceilings derived from OAI-2A/2B actuals. Spent/excluded requests
are reported and replacements need approval.

The final displayed slates must preserve all OAI-2B absolute gates after the
verifier. Additionally, every displayed Best Match must have a successfully
verified exact-product destination and mechanically supported purchase price;
blocked or inconclusive checks must produce an honest downgrade/removal, not a
search or guess. Report raw-to-verified product loss and classify every loss as
correct safety rejection, verifier false rejection, transient fetch failure, or
unsupported model claim. The validator may not improve a score by reordering or
backfilling.

**Serper contingency checkpoint:** if direct verification is the only failing
component and retailer blocking makes safe coverage materially inadequate,
stop. Taylor then chooses between fewer verified cards and a separately planned
Serper Shopping verification-only experiment. That experiment is not approved
by this roadmap amendment, cannot discover/rank products, and cannot begin
without an explicit architecture and spend approval.

**Failure:** any safety/source-integrity failure keeps OAI off. A quality miss
receives one first-loss attribution: model/prompt evidence, verifier false
rejection, integration, or architecture. Do not tune against the sealed
holdout or lower a gate.

**Recommended reasoning level:** High for execution; Highest for the final
promotion-quality or Serper-contingency decision.

### OAI-6 — conditional evidence hardening

**Approval/cost:** only if OAI-5 finds one generalized, fixable cause; zero live
calls. Skip this phase when OAI-5 passes without a fix or when the architecture
kill condition is met.

Fix only reproduced generalized causes in the master prompt, schema, adapter,
or verifier. Add fail-first tests and a new prompt/schema version. Do not add
benchmark answers, product/category exceptions, a second research call, model
re-ranking code, automatic retries, or Serper without the contingency decision.
Any material prompt/model change invalidates the OAI-2B/OAI-5 quality evidence
and requires a new explicitly approved primary sample before holdout.

**Recommended reasoning level:** Highest.

### OAI-7 — sealed holdout and human acceptance gate

**Approval/cost:** separate approval only after the final primary path passes.
Run three sealed holdout request shapes from unseen categories three times each
(nine shopper requests) with the exact pinned prompt, schema, model, reasoning,
and verifier. Do not change code or prompt after viewing holdout answers.

Apply all OAI-2B and OAI-5 absolute safety, evidence, constraint, verification,
stability, reliability, and quality gates. Require no primary-quality regression
and a blinded Taylor review of product usefulness, explanations, tradeoffs, and
citation relevance. Holdout failure is generalization evidence: keep OAI off
and stop rather than train on the holdout.

**Recommended reasoning level:** High for the run; Highest for the go/no-go
decision.

### OAI-8 — reversible controlled rollout

**Approval/cost:** separate explicit approval. Start with local/development or
an explicitly addressable opt-in cohort; percentage canary language is used
only if deployment actually supports it. Record the exact mode, prompt/schema
versions, model configuration, start/end time, and rollback owner. Observe
schema success, source binding, verification coverage/rejects, empty/partial
responses, latency, cost, and user-visible quality. Any trust-boundary incident
rolls the global mode back to `legacy` immediately. No legacy code is deleted.

**Recommended reasoning level:** High.

### OAI-9 — legacy and Serper retirement

**Approval/cost:** optional and separately approved only after the early quality
gate, production-path gate, holdout, controlled rollout, and a predeclared
stable observation window all pass. Preserve the dated backup and commit-level
rollback first. Remove Serper, deterministic query planning, AI-plus-Serper
candidate merging, and legacy-only rescue/scoring/orchestration only when
reachability tests prove they are unused by the promoted path. Retain request
parsing, the OAI verifier, identity/eligibility/price/image/URL/dedupe
protections, evaluation fixtures, and safe error handling.

**Recommended reasoning level:** Highest. Deletion is optional; extended
rollback is safer than premature cleanup.

### OAI-10 — post-proof optimization

Only after quality is stable, tune one variable at a time: reasoning effort,
model snapshot, freshness-bounded normalized-request caching, returned search-
token budget, output size, background polling cadence, or UI progress feedback.
Every optimization must hold the frozen safety/evidence/quality gates. Cache
hits must report source age and may not be counted as independent stability
runs. Cost or latency savings cannot justify a weaker answer.

**Recommended reasoning level:** High, with Highest reserved for model,
evidence-contract, or cache-freshness changes.

### OAI dependency and stop map

```text
OAI-0 active amended plan
  -> OAI-1 offline historical audit + prompt/schema/evidence contract
    -> OAI-2A three-case technical/source-binding kill gate
      -> OAI-2B early uncached quality/repeatability kill gate
        -> OAI-3 bounded network verifier
          -> OAI-4 default-off route integration
            -> OAI-5 production-path verification gate
              -> OAI-6 conditional hardening (only if justified)
                -> OAI-7 sealed holdout
                  -> OAI-8 reversible rollout
                    -> OAI-9 optional legacy/Serper retirement
                      -> OAI-10 optimization
```

Live OpenAI calls occur only in OAI-2A, OAI-2B, OAI-5, OAI-7, and the explicitly
bounded rollout. External direct-verification fetches first occur in OAI-5.
The source-binding and core-quality assumptions are both tested before the
permanent verifier and route integration. A failed early gate ends the
experiment; any later failure leaves the current application available through
`legacy` mode.

### PR-9B — fresh attributable staged-accuracy protocol

**Status:** implemented locally with zero live calls; one local history commit
and one High-reasoning independent exact-commit review are authorized. Exact
paid-envelope ratification remains pending.

**Objective and bottleneck challenge:** the North-Star objective is accurate,
evidence-backed product choice. The active staged path still has no current
multi-shape result. A recommendation heuristic or larger sample would therefore
precede the evidence needed to locate failure. PR-9B refreshes only the spent
execution chain and makes rank stability enforceable; it preserves the reviewed
truth, requests, cases, sources, and all trust gates.

**Frozen protocol:** `staged-terra-readiness-matrix-v2` retains the 2026-08-29
truth review and 2026-09-12 expiry, all four request shapes, and the six-run
serial order. Its six `pr9b-*` run IDs and six nonces are disjoint from the
retired PR-4B chain. The old v1 matrix remains historical and cannot execute
through the current runner. Before every attempt the runner must bind an exact
clean commit, matrix file/canonical hashes, trust manifest, request, run ID,
nonce, absent output leaf, flags, credentials, and the remaining ceilings. A
later attempt must read every exact preceding `artifact.json` through a direct,
bounded, non-link file boundary; authenticate the canonical prefix, commit,
chain, mechanics, quality result, expected next run, and approved previous hash;
and repeat that authentication immediately before provider-client construction.
After every artifact, complete the bound manual audits and prefix analysis; any
output still stops with no machine authority for the next attempt.

**Quality bars:** preserve zero wrong type, hard-requirement, budget, or
unregistered-source failures; broad must-consider recall at least two per run
and in union; final-set Jaccard at least `0.60`; evidence no older than 24 hours;
and completed wall time no more than 12 minutes. Shared exact-product order must
have Kendall tau at least `0`: full reversal fails, and fewer than two shared
products is explicitly unscorable/failing rather than silently passing. Exact
product identity is normalized brand plus model. Automated variant scoring is
unavailable; every card requires bound pass/fail manual variant/trim evidence.

**Paid envelope proposed for ratification:** exactly six logical shopper
searches, executed serially. PR-3K's comparable conservative result was
`$0.457438`, so the planning basis is `6 × $0.457438 = $2.744628`; this is not a
spend entitlement. Hard ceilings are 12 OpenAI creates, 360 retrieves, 60
hosted searches, six safety cancels, 90 Serper Shopping attempts, 180 source
fetches, 540 physical source HTTP attempts, `$1` per run, and `$6` aggregate.
Human evidence adjudication may open at most 60 public source pages. Retries,
replacements, fallbacks, Serper Organic, SearchAPI, extra cases, flag changes,
deployment, and release remain zero. A replacement always requires new
approval.

**Kill rule:** stop on expired truth; trust/provenance failure; malformed,
stale, or unreconciled evidence; any unsafe/wrong card, requirement, price,
source, image, or variant decision; any per-run or aggregate ceiling breach;
unexpected terminal failure; final-set Jaccard below `0.60`; Kendall below `0`
or unscorable; missed broad recall; or any incomplete/failed manual audit. Do
not spend a later attempt after a stop and do not reuse a spent identity.

**Expected North-Star effect:** no direct accuracy change. It makes the first
current six-result sample trustworthy enough to locate missing leaders, wrong
products/variants, weak ranks, incorrect facts, unsupported evidence, and
instability at the earliest attributable stage. No live/product accuracy gain
is claimed until that sample exists.

**Offline proof:** the first fail-first showed the v1-only implementation
rejected the fresh matrix and lacked an enforceable rank gate. A later
adversarial audit reproduced a second pre-spend defect: 54/56 passed while the
runner accepted an invented 64-character prior hash and no actual prefix. The
corrected live-plan v3 suites pass 106/106; full tests pass 1,711/1,711 across
232 suites; typecheck passes; lint has zero errors and three pre-existing
warnings; and deterministic controller
`agent-loop-2026-08-30T21-24-13-213Z` passes all five serial partitions, 10/10
cases, and 29/29 invariants. No provider, credential, live route, protected
fixture, or external source page was accessed.

The independent exact-commit review then rejected initial snapshot
`81c54d76ab88488f65790b2b341bdf8f877a5685`: invalid execute indices reached
prefix slicing before the plan's range check. The correction parses the closed
approval set and canonical in-range selector before prefix I/O and repeats the
numeric/registry check inside the loader. Its fail-first was 16/17; corrected
runner 17/17, focused wall 107/107, full suite 1,712/1,712, typecheck pass, and
lint zero errors/three old warnings. Final corrected exact-commit
review returned `VERIFIED`, no material findings, confidence 0.995, on source
snapshot `96424b6e1e22d56f947de041da04ce37fa2380a2`. The same reviewer
reauthenticated the final documentation-only closeout commit; no implementation,
test, matrix, ceiling, or trust-boundary blob changed afterward.

**Recommended reasoning:** High for exact-snapshot protocol review and serial
execution; Highest for source/variant/ranking adjudication or any disputed
go/no-go decision.

### PR-9C — launcher-contract correction and replacement chain

**Status:** implemented locally; exact commit and independent review pending.

The first authorized PR-9B dispatch stopped before credentials or child spawn
with typed stage `repository_or_trust_rejected`. The root cause was a real/mock
contract mismatch: `authenticateStagedTerraReadinessTrustSurface()` returns
`ok`, `manifestSha256`, `entries`, and `failures`, while the launcher additionally
required a nonexistent `status` field. Terminal tests supplied that invented
field, so the mocked success path passed while every real launch failed.

PR-9C removes only the two invalid `status` predicates. It preserves the real
`ok` result, exact manifest digest, empty failure list, clean tracked state,
branch, commit, approval, credential, process, and second reauthentication
checks. The fail-first changed the mock to the real authenticator shape and
reproduced three failures, including the successful integer-child path; the
correction restores the complete launcher/runner wall.

Because the failed dispatch consumed the first v2 identity and the serial chain
cannot skip its missing artifact, matrix v3 preserves byte-equivalent reviewed
truth, sources, requests, cases, order, bars, and ceilings while minting six
fresh `pr9c-*` run IDs and nonces. V1 and v2 remain immutable historical
records. Tests require v3 to be identity-disjoint from both retired matrices.

The runner also emits one bounded `staged-terra-readiness-review-packet-v1`
inside its authenticated terminal line. It is projected only from the already
validated public artifact fields needed for manual adjudication: exact run and
artifact binding, terminal, final advice, cards, public sources, and registered
product lineage. It excludes nonce, route trace, diagnostics, counters, usage,
raw response, private candidates, and credentials. This permits manual review
without ordinary access to the protected artifact tree.

- matrix file SHA-256:
  `d738c4493ababe10c5853f138862d71afeabc5d2502d8e0f2c0f13a1ad8cbd7a`;
- matrix canonical SHA-256:
  `0bc9d3626e266c4ec6592cfc1489d9199cb42e51b537183964637e1ea46a3660`.

The existing six-search envelope and all zero-retry, zero-fallback, safety,
evidence, identity, price, requirement, source, manual-review, and stop gates
remain unchanged. Taylor granted standing authority on 2026-08-30 for all
in-scope work needed to complete the product-accuracy goal; push, deployment,
release, and flag promotion remain unnecessary and are not part of this phase.

### PR-9D — bounded research-failure attribution and v4 chain

**Status:** corrected at `6ef6cb7f9c019cfe1e6908892558a0959fdf412a`;
independent exact-final-head review pending.

Fresh PR-9C attempt 1 reached a completed Terra research response and then
stopped as `research_failed / invalid_research_contract`. It used one create,
30 retrieves, five hosted searches, 46,656 input tokens, 6,716 output tokens,
70.588 seconds, and `$0.296540` conservative cost. Every Shopping, page-fetch,
verification, presentation, card, source, human-open, retry, replacement,
fallback, later-case, and deployment counter remained zero.

The server already produced a privacy-safe validation reason and optional
candidate/source subclasses, but artifact-v2 projected only the ledger's broad
failure reason. That made the immutable evidence insufficient to select a
generalized accuracy repair. PR-9D rolls the artifact, producer, capture, and
review contracts forward and persists only the three conditional closed enums.
Unknown values, impossible parent/child combinations, reasons attached to an
unrelated stage, raw responses, candidate values, URLs, provider IDs, prompts,
and credentials fail closed or remain absent. The shopper response and bounded
manual-review packet are unchanged.

Matrix v4 preserves v3's reviewed truth, sources, requests, cases, order,
quality bars, and ceilings. Only the version and six fresh `pr9d-*` IDs/nonces
differ; tests prove disjointness from v1-v3. Its file SHA-256 is
`23fd7b495ec261a1508624aca17a212206241e27a4d8f93a283a5f19ddbeb960` and
canonical SHA-256 is
`7bc4b8cc578c905b8789456cd4eb017bec7039df9c65575f8056a0fe75d94afc`.
The zero-network trust dry run authenticated 66 entries under manifest
`822b64d846c59d165bcfc507b7694c28cc9ce1f8f8632556c6e5bfda6ac4c43d`.

Fail-first proved the analyzer lost the three expected enums. The corrected
four-suite wall passes 71/71; full tests pass 1,713/1,713 across 232 suites;
typecheck passes; lint has zero errors and three old warnings. No further paid
call may occur until the exact final head is independently verified. A v4
failure stops the chain and selects its closed offline repair target; a safe
result still requires the complete bound manual audit before attempt 2.

Independent review of initial head `c2bebee4` returned `CHANGES REQUIRED`:
set-membership equivalence treated an unknown inactive child string like null.
The correction requires exact null whenever the parent does not activate that
child and closed-set membership whenever it does. Both inactive-child cases
now have fail-first regressions; focused/full/typecheck/lint results remain
unchanged.

### PR-9E — candidate-identity relation attribution and v5 chain

**Status:** implemented locally at
`e4f3a7c1b87075d9aeeba166e3acd86e2a643255`; independent exact-commit review
pending.

Fresh PR-9D attempt 1 at final reviewed head `88169407` stopped after one
completed Terra research response as `research_candidate_invalid /
candidate_identity`. The authenticated v4 artifact used one create, 35
retrieves, five hosted searches, 47,666 input tokens, 7,495 output tokens,
80.285 seconds, and `$0.311381`. Shopping, source fetches, physical HTTP,
verification, presentation, cards, sources, retries, replacements, fallbacks,
later cases, and human page opens remained zero. The immutable artifact SHA-256
is `bf89f4a14ff7c8654a8ec5afbe4d22722eb6b3dd82ed1f06c505cf5c3a22b3b7`.

The result proves the first loss is the candidate identity boundary, but that
closed group still combines independent string-shape, brand, model-presence,
model-conflict, and complete-product-type relations. PR-3D already removed the
model-authored composite name, so another speculative prompt or identity-rule
change would not be evidence-supported. PR-9E instead refactors the unchanged
shared target-coherence boolean into a reason-bearing predicate and maps its
five fixed outcomes to privacy-safe candidate identity enums. Acceptance order
and behavior are unchanged. Contract v10 and runtime v9 roll old jobs closed;
artifact/producer v4, capture v4, and review v5 authenticate the new optional
child only when `candidate_identity` is active. Unknown strings, inactive
children, impossible parent/child combinations, extra keys, and private values
fail closed. Public shopper responses and review packets remain unchanged.

Matrix v5 preserves v4 truth, sources, requests, cases, order, quality bars,
and paid ceilings. Only its version and six fresh `pr9e-*` run IDs/nonces
differ; tests prove disjointness from v1-v4. File SHA-256 is
`1a850f0c34c49590e693d530db05f540be4ffd51c5ea20a0d071b6e7f10e303b` and
canonical SHA-256 is
`d9ad036d67872289626b76ea60264a085ba6f0de640c4260898d6d820d303fd4`.
The clean zero-network plan authenticated 66 trust entries under manifest
`d9b3bcd9cad8ec285c092fa1f8ce4fbfc7ff4e8c753bc98ab181d9fda8c96a03`.

Fail-first produced nine intended failures across contract, runtime, artifact,
and analyzer surfaces. Corrected focused tests pass 184/184, the full suite
passes 1,716/1,716 across 232 suites, typecheck passes, and lint has zero errors
with three pre-existing warnings. After independent High exact-commit review,
one fresh v5 attempt may run. Any terminal failure stops the v5 chain; its
authenticated four-level tuple selects the next generalized offline repair.

### PR-9F — authenticated verification-loss aggregates and v6 chain

**Status:** independently verified at exact final head
`9181752ba954ef2bf01260c1a4ef19603dee67b5`; v6 attempt 1 executed and
halted at verification as designed.

Fresh PR-9E attempt 1 at reviewed head `5ac61293` was the first current run to
pass research validation. It accepted eight candidates, made eight Shopping
attempts and 16 bounded source fetches, then stopped as `verification_failed`
with zero cards. The authenticated first-loss total was seven asset-identity
failures and one complete-product-relationship failure. Both registered broad
leaders were absent at research discovery. The artifact did not retain the
already-computed fixed verifier subreason aggregates, so changing search,
ranking, or identity acceptance would still be speculative.

PR-9F rolls artifact/producer to v5 and capture/review to v5/v6. It retains
only seven fixed aggregate count records, validates exact keys, integer bounds,
candidate/eligibility/first-loss conservation, branch coverage, and nullability,
and exposes them only in authenticated analyzer metrics. It retains no candidate
identity, title, URL, raw response, prompt, provider ID, or credential. The
public shopper response and bounded manual-review packet are unchanged.

Matrix v6 is semantically identical to v5 except for its version and six fresh
`pr9f-*` IDs/nonces disjoint from v1-v5. File SHA-256 is
`e01db2c4b27029c22d6e0481846fb51857e1973c0001be87400b9d939e71d81a`;
canonical SHA-256 is
`4dc91c0656c9e374b7805c0dd5cd87a1fc3fef8a012384a8c718098399f75ba8`.
Fail-first proved artifact-v4 discarded the aggregate. Corrected readiness and
runner tests pass 61/61; full tests pass 1,718/1,718 across 232 suites;
typecheck passes; lint has zero errors and three old warnings. After one High
exact-commit review, execute only v6 attempt 1 and stop. Its authenticated
subreason distribution selects the next generalized offline accuracy repair.
The clean zero-network plan at `ea89ecff` authenticated 66 trust entries with
no failures under manifest
`4e229b8108bd89ecc42c02df4ef1e455a7566e78694b89bddf47ab2e4f4de195`.

Exact-final-head High review returned `VERIFIED`, no findings, confidence
0.997. Fresh v6 attempt 1, `pr9f-01-broad-shop-vac-r1`, halted as
`verification_failed` after nine research candidates. Seven failed asset
identity, one failed complete-product relationship, and one lacked an
identity-safe product URL. The retained subreasons showed six candidates with
brand absent from fetched page titles, two with conflicting title models, one
with its model absent, one non-product page, and one missing/invalid product
URL. Shopping accepted no exact offer. The attempt used one create, 26
retrieves, four hosted searches, nine Shopping attempts, 18 source fetches, 22
physical HTTP attempts, 39,946 input tokens, 5,640 output tokens, 68.184
seconds, and `$0.249431`; every forbidden or alternate counter was zero.

### PR-9G — require a viable product page before verification and v7 chain

**Status:** implemented at `adef42f9dfe1c1873b43deaf242453eb4fd17817`
with exact-byte matrix correction
`41f4f22588c26b98f27cce3e3792f94d99661efa` and clean documentation-bound
source snapshot `f55e912e01baedcbb55c7a1fd9f8d9cf55da8802`; independent
exact-final-head review pending.

PR-9F proved the dominant loss was not ranking: no candidate survived
verification. The earliest generalized cause was the research-source filter,
which accepted any exact title/URL identity pair and even deferred titleless
sources without requiring a page that the unchanged downstream verifier could
classify as a complete product and expose as an identity-safe product URL.
That admitted editorial/non-product pages and candidates with no usable product
destination, then spent Shopping and source-fetch work on candidates already
destined to fail.

PR-9G rolls contract/prompt/runtime to v11/v7/v10. A research candidate now
survives only when at least one of its two exact response-owned source records
passes the existing identity, complete-product relationship, and identity-safe
product-URL decisions. Missing hosted-search titles are rejected instead of
deferred. The second source remains required for independent evidence. No
downstream identity, variant, commerce, price, requirement, evidence, ranking,
or safety gate is relaxed.

The closed diagnostics add `missingTitle` and
`completeProductPageUnavailable`; route and artifact consumers require exact
keys, zero legacy deferrals, submitted/accepted/rejected conservation, and one
or two bounded reasons per rejected candidate. A new
`candidate_source_product_page_unproven` failure distinguishes a zero-survivor
slate whose identities were visible only on non-materializable pages. Public
shopper output and manual-review packets remain unchanged and private.

Artifact/producer v6, capture v6, review v7, and live-plan/matrix v7 bind the
new contract. Matrix v7 preserves all reviewed truth, sources, requests, cases,
order, quality bars, and paid ceilings while minting six fresh `pr9g-*`
IDs/nonces disjoint from v1-v6. Its normalized file SHA-256 is
`9d1a06c3be8ff959b7fffea37cc3c1f2bbd99687ef20759cb161eab8fc495bcd`;
canonical SHA-256 is
`ab0f5c831d030955c8691990725254cac780631564391316c76b0c1d9ccf3358`.
Fail-first reproduced three intended defects. Corrected focused tests pass
137/137; full tests pass 1,720/1,720 across 232 suites; typecheck passes; lint
has zero errors and three old warnings. The first exact-final-head High review
returned `CHANGES REQUIRED`, confidence 0.995: the failure enum was not tied to
the product-page aggregate, and the URL-acceptance conjunct lacked an isolated
regression. The correction binds both enum/count directions in route and
artifact consumers and adds a complete-product/title-valid but
identity-conflicting-URL quarantine test. Corrected focused tests pass 138/138;
full tests pass 1,721/1,721; typecheck passes; lint remains zero errors/three
old warnings. After exact-head re-review, execute only v7 attempt 1 and stop for
immutable analysis.
The zero-network plan at `f55e912e` authenticated all 66 trust entries with no
failures under manifest
`4542287e3a69deea0ffce5dc088e7d34b43b0235000fb30bf9b46b3fe9df0c98`.

### PR-9H — retain failed source-filter evidence and v8 final measurement

**Status:** generalized correction committed at
`43db41fa8d6df4f15396081e9b28dd156778588d`; normalized v8 protocol and exact
final review pending.

PR-9G exact head `5309bd77c4fd752086ce1045c55994c2ce302ec4` received
independent High `VERIFIED`, confidence 0.999. Its v7 attempt 1 consumed logical
search 5 and reached a research terminal after one create, 35 retrieves, and
seven hosted searches, with every Shopping, source-fetch, HTTP, alternate,
retry, replacement, fallback, extra-case, and cancel counter at zero. Canonical
capture stopped as `artifact_build_failed`, published no artifact, retained
append-only checkpoints, and did not continue automatically.

Fail-first reproduced the true producer contradiction. The source-filter
failure path records a bounded registered-product trace, while artifact v6
projected `diagnostics.research` only for completed research and nevertheless
required every non-null trace to reconcile against non-null research counts.
The old producer therefore throws
`registeredProductTrace.aggregate.research` for the exact all-rejected state
created by the earlier PR-9G gate.

PR-9H projects the already-validated source-filter submitted/accepted/deferred/
rejected counts whenever the diagnostic exists, including a failed research
terminal. Completed research still requires the filter; other failures remain
null. No candidate, URL, title, source text, provider ID, price, or weaker trust
decision is synthesized or exposed.

Artifact/producer v7, capture v7, review v8, and live-plan/matrix v8 bind the
correction. Matrix v8 preserves v7 truth, sources, requests, cases, order,
quality bars, and ceilings while minting six fresh `pr9h-*` IDs/nonces disjoint
from v1-v7. Its normalized file SHA-256 is
`773be3d5ec6cc7b03c8bd9ee077e64a9a838645ae86775c0036c334d6008dac6`;
canonical SHA-256 is
`152a0126de52112f0bcaeefff09040f186a3343c8aed50fb52c4dd9e62b108d1`.

Corrected focused staged suites pass 138/138; full tests pass 1,721/1,721
across 232 suites; typecheck passes; lint remains zero errors and three old
warnings. After independent High exact-head verification, execute only v8
attempt 1 as logical search 6 and stop for immutable analysis. The six-search
live envelope is then exhausted.

The first exact PR-9H review returned `CHANGES REQUIRED`, confidence 0.997: a
valid-shaped identity-source filter on an unrelated failed poll such as
`request_error` could be projected even though the failure did not support
those counts. The correction binds a filter-bearing failure to the exact
`invalid_research_contract` plus `candidate_sources` context and adds a
mutation that fails on the old producer and passes only after the binding.

The corrected exact head
`0ae3a11eb8f0601398eeea0e4c9b589685df3b17` received independent High
`VERIFIED`, no findings, confidence 0.999. V8 attempt 1 then consumed logical
search 6 and published authenticated artifact
`33eb5ed7c216a16bd6c6ebe7b929eaeedb941060d07f0b77abb6b2992cec49f7`.
The reviewed analyzer returned `halt`, zero structural failures, broad recall
0/2, and the closed research failure
`candidate_source_identity_unproven`. Every registered product was absent at
research discovery; no Shopping, source fetch, verification, presentation,
ranking, price/specification, or evidence stage ran. The attempt used one
create, 33 retrieves, six hosted searches, 57,313 input tokens, 7,350 output
tokens, 75.900 seconds, and `$0.349353`; every forbidden counter and ceiling
failure was zero.

All six logical searches are consumed. The evidence supports a future
candidate-local source-acquisition investigation, not relaxation of identity.
Before another live window, retain closed aggregate research-source first-loss
counts and compare stricter direct-product source selection with deterministic
targeted product-page resolution offline. A future cohort requires fresh
identities and a fresh numeric envelope.

### PR-9I — source first-loss observability and candidate-local shadow comparison

**Status:** executable snapshot complete and independently verified at
`74c39c4b262edcb19533848d6691ba6a2e47f2a9`; one bounded v9 attempt executed
and halted; no continuation is authorized.

Artifact v8 and the analyzer retain only six exact aggregate rejection counts:
`missingTitle`, `brandNotInTitle`, `modelNotInTitle`,
`modelConflictInTitle`, `wrongProductType`, and
`completeProductPageUnavailable`. Exact keys, non-negative integers,
submitted/accepted/rejected conservation, zero retired deferral, and one or two
closed reasons per rejected candidate are mandatory. Candidate identities,
titles, URLs, response text, and provider IDs remain excluded.

The zero-network shadow harness compares response-owned candidate-local sources
with the existing deterministic exact-product resolver. It is not a production
callsite and grants no authority. It validates coherent unique target keys and
ranks before lookup, rejects unknown/non-array buckets, caps every bucket at
two sources and the slate at five targets, and forbids cross-candidate
borrowing. The first exact review found duplicate-key and unbounded-bucket
gaps; both were corrected with fail-before-transport regressions. Exact-head
High re-review returned `VERIFIED`, no findings, confidence 0.999.

Matrix v9 preserves v8 truth, sources, requests, cases, order, bars, and safety
ceilings with fresh `pr9i-*` IDs/nonces disjoint from v1-v8. Raw SHA-256 is
`daf1cfb2e7762d7a3b5467e1481aeaff3530f81ea24d2e11f54cb80ef3111128`;
canonical SHA-256 is
`5da34085a7438dbfe9e990721e30da2162c922fd0225ee907532b3a71db6e40e`.
The exact dry plan authenticated 66 trust entries under manifest
`b31e52dee56a7c2f26c5a7969b7b98044bf00ad3cc9bf8d9f9cd5df81ddd33f1`.

V9 attempt 1, `pr9i-01-broad-shop-vac-r1`, published artifact SHA-256
`73e13f40b49d5131d13b3a36bf860b1bee607065c4c52cef965484bab9d9584f`
and halted as `research_failed`. The reviewed analyzer returned `halt`, zero
structural failures, and
`invalid_research_contract -> research_candidate_invalid -> candidate_sources
-> candidate_source_identity_unproven`. All nine rejected candidates carried
`missingTitle`; every other retained first-loss count was zero. Craftsman
CMXEVBE17595 was discovered once but failed source-identity preflight; RIDGID
HD1200 and the illustrative products were absent at discovery. Must-consider
recall was 0/2. No downstream product or ranking stage ran.

The attempt used one create, 38 retrieves, six hosted searches, 56,192 input
tokens, 6,108 output tokens, 86.572 seconds, and `$0.327220`. Shopping, source
fetches, physical HTTP, retries, replacements, fallbacks, Organic/SearchAPI,
extra cases, cancels, ceiling failures, automatic continuation, flag changes,
deployment, and human page opens were zero.

**Decision:** source acquisition is the earliest proven accuracy bottleneck.
The next phase should integrate a bounded candidate-local exact-product-page
resolver before acceptance while preserving the two-source requirement and all
identity, relationship, requirement, evidence, commerce, privacy, and safety
gates. Prove recovery and non-borrowing offline first; any later live cohort
requires a fresh protocol, identities, and ceilings.

### PR-9J — keep ordinary localhost testing on the stable pipeline

**Status:** implemented in the local working tree on base
`d2c5f1488b1d99cc8dfcf80893387d56c2dd1dbf`; uncommitted pending separate
commit authority.

A user localhost search for `power washer` with a `$1,500` budget completed
provider research but displayed the Direct-Terra `verification_failed` banner.
The category and budget were not the cause. That exact banner proves the
browser selected `/api/recommendations-v2`, which requires both Direct-Terra
process flags. The standard `npm run dev` command previously invoked `next dev`
directly, so stale local experimental flags silently replaced the stable main
search path.

This matters because OAI-T9 already rejected Direct-Terra V3 as
`single_call_architecture_no_go`: only one of 12 final acceptance searches
completed, six returned 502 route failures, and five remained pending at the
retrieve ceiling. Direct Terra was deliberately default-off. Its public error
also maps every completed-report contract failure to a citation-specific
message, obscuring candidate-slate, rank, requirement, price-ledger, wrapper,
and citation branches.

PR-9J makes `npm run dev` invoke a small cross-platform launcher that passes
the four Direct-Terra and staged-Terra flags as `off`/`false` in the child
process. Next.js documents `process.env` as higher precedence than `.env.local`,
so ordinary development cannot be silently redirected by stale experimental
configuration. Other environment values, including credentials, remain
unchanged and unprinted. `npm run dev:experimental` retains deliberate access
to the original flag-controlled `next dev` behavior.

This is a local-development routing correction, not a fallback. It does not
retry a failed search, start a second paid request, alter production build/start
behavior, remove an experimental API, weaken a trust gate, or change committed
feature defaults. The existing server was stopped and restarted through the
stable launcher. A zero-spend probe returned homepage HTTP 200 and
`invalid_config` from the experimental V2 route before request parsing or
provider creation. No recommendation search was submitted.

### PR-10 — selection-only architecture reset

**Status:** complete and fully validated on committed PR-9J parent snapshot
`5117276c3b2909d629d9f19970b3e6f55c10af67`; included in the final local
PR-10 commit.

**Objective:** make ReviewRadar a fast, reliable product selector. A result
card now contains only a safe image or placeholder, category, exact product
name, trustworthy current price or explicit missing-price state, and a direct
`View product` link.

**Root cause:** matched baseline searches took 91–116 seconds because every
request entered a report-generation architecture: multiple OpenAI stages,
review/editorial research, rescue passes, repeated search transports, large
prompts, and large response objects. The dominant delay was distributed across
the final report, reviews, planning, assets, rescue, and discovery. Optimizing
one stage would leave the proven system-level bottleneck intact.

**Replacement:** `/api/recommendations` is now the only recommendation route
and exports only `POST`. It validates the request and conflicting requirements,
optionally makes one compact structured planner call, performs at most three
Shopping queries plus bounded finalist product-page resolution, and returns a
minimal selection result. Total logical search/page operations are capped at
eight with no retry, editorial research, review crawl, report synthesis, rescue
pass, polling, or alternate recommendation mode. A deterministic planner is
used when OpenAI is unavailable or its output is invalid.

Hard requirements, product type, accessories/components, used/refurbished
items, explicit model conflicts, duplicates, budgets, exact product-page
identity, price plausibility, SSRF boundaries, and image identity remain
enforced. A budgeted result requires a trustworthy current price. The selector
keeps limited brand diversity while ranking stronger exact matches first.

Dynamic paid Smart Features were removed with their route. The form now reads
the existing deterministic local category catalogs directly. Direct Terra,
staged Terra, two-layer output, report/citation/evidence/narrative layers,
progress/job APIs, report UI, evaluation launchers, report fixtures, and their
production-only support code were deleted rather than left as inactive modes.

**Measured result:** the same three representative searches averaged
101,212 ms before and 8,029 ms after, a 92.07% latency reduction and 12.61x
speedup. Normal response size averaged 86,087.67 bytes before and 821.33 bytes
after, a 99.05% reduction and 104.81x smaller response. Each after search used
one OpenAI planner call and no more than eight bounded search/page operations;
the old path used three OpenAI calls and 37–60+ Serper attempts. Two additional
hard-language searches returned only matching, in-budget products.

**Verification:** the final unit suite passes 241/241 across 41 suites. The
required typecheck, zero-warning lint, production build, and Chromium desktop/
mobile E2E checks must remain green in the final committed snapshot. The build
must expose only `/`, `/_not-found`, and `/api/recommendations` application
routes.

**Decision:** this phase supersedes every earlier recommendation/report
experiment and related kickoff. Reintroducing report generation, citations,
reviews, background jobs, or alternate architectures requires a new product
decision and new evidence; none remains dormant in the runtime.

### PR-11 — live selection-accuracy hardening

**Status:** complete and fully validated in the current uncommitted working
tree on committed PR-10 snapshot
`ce634ab3c2fab757601ae6fabd38b0ecab6534b4`. No push, deployment, release, or
production-data action is part of this phase.

**Objective:** test whether the simplified card is populated with the right
current product, variant, price, availability, and product page across several
unrelated shopping categories, then correct generalized false-positive paths.
The card itself remains the PR-10 minimal card; this phase changes selection
authority, not card complexity.

**Observed causes:** fresh live probes exposed a standalone robot-vacuum dock
as a complete product and a 12-cup coffee maker for a 14-cup preference. The
broader trace also showed stale Shopping prices disagreeing with current page
prices, unavailable or unverified pages, support/listing/foreign-market pages,
model-family and named-variant ambiguity, inferred brand/model queries
concentrating the finalist slate, and one query monopolizing the five page-
verification slots. A complete Shopping transport failure could also look
like a legitimate empty result.

**Generalized correction:** availability is now an affirmative page gate;
explicit out-of-stock state outranks an availability-free priced offer.
Current structured page prices outrank discovery prices, and implausible or
conflicting prices still fail closed. Candidate discovery is interleaved
across neutral Shopping queries, prioritizes resolvable brand/model identity
and trustworthy merchants, limits per-brand verification concentration, and
rejects secondary-market, non-US, support/manual/listing/Q&A, accessory, and
unrequested non-new offers. Product resolution preserves stable model IDs and
named variants while allowing a bounded official letter-only merchandising
suffix. The selector now recognizes concrete self-emptying and programmable
features, nominal cup capacity, and known numeric contradictions even when an
ordinary priority remains soft. Standalone self-empty bases are rejected
without rejecting complete vacuum-and-base bundles. If every Shopping call
fails, the API returns a retryable 502 instead of a false empty success.

**Fresh final-source sample:** a 14-cup programmable coffee-maker search under
$150 returned the current Cuisinart DCC-3200 at $119.95 in 6,858 ms; a self-
emptying robot-vacuum search under $300 returned the AIRROBO L50+ at $209.99
in 7,975 ms; and a 27-inch 1440p gaming-monitor search at 144 Hz or higher
under $300 returned the Z-EDGE UG27Q at $179.99 in 9,524 ms. Current official
or retailer pages independently matched each returned identity, specification,
price, and buyable state. The same final-source shop-vac run under $200
returned an empty shortlist in 6,473 ms. Earlier runs found valid current shop
vacuums, so this is an intermittent provider/verification recall limitation,
not evidence that no qualifying product exists. The intended safety tradeoff
is to return nothing rather than fill the card with a wrong, stale, unavailable,
or unverified product.

**Verification:** 276/276 unit tests across 41 suites, TypeScript typecheck,
zero-warning ESLint, Next.js 16.3.3 production build, and Playwright 7/7 across
desktop/mobile Chromium pass. The build exposes only `/`, `/_not-found`, and
`/api/recommendations`. Live debug telemetry remained local and contained no
raw provider response or credential.

**Decision:** the sampled returned cards are accurate, but broad recall is not
yet universal. A future recall phase must measure empty-shortlist frequency
without weakening the current availability, identity, requirement, product-
type, price, or source gates. It must not treat retries until a desired answer
appears as accuracy evidence.

### PR-12 — adaptive recall and freshness hardening

**Status:** implemented and locally validated in the current uncommitted tree
on the PR-11 working state. The planned live recall gate did not pass.

**Objective:** reduce false empty shortlists without weakening PR-11's product
identity, type, condition, availability, requirement, price, source, or SSRF
boundaries.

**Implementation:** the three-query discovery path now ranks a nine-candidate
verification queue and processes it in three-candidate waves. A rejected wave
is backfilled without repeating discovery, up to five distinct cards or the
hard ceiling of twelve logical Shopping/page-resolution searches. Final
selection also deduplicates canonical product-page URLs. Discovery cache life
is five minutes and current product-page price/availability evidence is two
minutes. Local-only telemetry records bounded wave and gate-loss counts.

The live matrix exposed two additional precision defects. Differently titled
candidates could resolve to one product URL, and a manufacturer `...-series`
landing page could represent multiple variants as one exact product. Both now
fail closed. A cordless-drill request also rejects multi-tool combo kits while
preserving a standalone drill kit with battery and charger.

**Frozen live result:** 24 single-attempt, cache-cold requests covered eight
categories over three rounds. Fifteen were non-empty: coffee maker 2/3, robot
vacuum 3/3, gaming monitor 3/3, shop vacuum 1/3, pressure washer 3/3, cordless
drill 3/3, laptop 0/3, and leaf blower 0/3. Every request stayed at twelve
logical and physical attempts. Mean latency was 13,795 ms, nearest-rank p95 was
18,677 ms, and maximum was 21,352 ms. Availability and safe page resolution
were the dominant losses. The required 21/24 non-empty rate and shop-vac 2/3
rate therefore failed; no gate was relaxed and no run was retried.

Two separately identified cache-cold correction probes then returned only
exact purchasable robot-vacuum models and three unique standalone drill kits.
They are precision evidence, not replacements for the failed recall matrix.

**Decision:** retain the adaptive implementation because it demonstrably found
valid products in later waves and preserved bounded fail-closed behavior, but
do not claim the PR-12 recall target passed. Any next recall work must first
attribute safe page-resolution and availability losses; it must not increase
the search ceiling or infer availability from price alone.

### PR-13 — best-in-budget market quality

**Status:** Steps 1 through 4 were executed locally. The implementation is
complete, but Step 4 failed the non-empty and leader-recall release gates.
PR-13 is not release-qualified. Taylor removed approval pauses for this goal,
but no gate was weakened and no failed matrix cell was replaced.

**Objective:** establish a safe, repeatable selection baseline and an
independently sourced market-leader benchmark before adding market-quality
evidence. The public card and `POST /api/recommendations` contract remain
unchanged.

**Frozen QA benchmark:** `tests/benchmarks/pr13-market-leaders-v2026-09a.json`
registers one exact model for each of the eight existing live cases. Every
leader has at least two current independent source domains and at least one
comparative test source. This registry is QA-only; price and availability are
evaluated at run time, and it cannot make a product eligible or enter the
shopper response.

**Prerequisite review and correction:** independent review reproduced page-
resolution and availability losses without accessing the protected fixture
tree. Stable-model page searches no longer pin one retailer. Exact product-
shaped pages from the Shopping merchant are eligible, up to two exact pages
on distinct hosts may be verified from one candidate-local search, and
discontinued/parts pages remain ineligible. Decimal URL identity is preserved,
measurement-only strings such as `MPH/450` do not become model IDs, battery-kit
wording is recognized, sibling URL models fail closed, and one merchant's
Shopping price/availability cannot move to another seller.

The failed-first cache-cold round returned 4/8 non-empty. Debug attribution
showed exact same-merchant product pages that major retailers blocked or
challenged during server-side fetch. A priced current Shopping offer may now
provide fallback availability only after exact product-page resolution to the
same Shopping merchant. Explicit page unavailability overrides it; a missing
price, cross-merchant page, unresolved identity, unsafe/non-product URL, or
mere page price does not provide this authority.

**Acceptance matrix:** the final precommitted matrix ran three cache-cold
single attempts across the eight cases with no retries. Twenty-three of 24
runs were non-empty, including shop vacuum 2/3. Mean latency was 12,507 ms,
nearest-rank p95 was 18,806 ms, and maximum was 20,419 ms. Every request used
one OpenAI response and no more than twelve logical Serper operations. The
21/24 and shop-vac 2/3 prerequisite gates therefore pass while remaining below
the future PR-13 15-operation ceiling.

**Verification:** 295/295 unit tests across 42 suites, typecheck,
zero-warning lint, the Next.js 16.3.3 production build, and Playwright 7/7
across Chromium desktop/mobile pass. The build exposes only `/`,
`/_not-found`, and `/api/recommendations`.

**Step 2 market-scout checkpoint:** the lightweight planner and its model-
generated Shopping queries are deleted. One fixed GPT-5.4 Mini Responses call
uses Structured Outputs, `max_tool_calls: 3`, and included web-search source
metadata. It returns only exact-model targets and source URLs. A URL binds only
after exact canonical membership in a completed search call's response-owned
source set. Conservative recognized-domain rules assign `strong`, `supported`,
or `none`; unsupported targets do not enter the production plan. Validated
plans cache for 24 hours by normalized request, model, and prompt version.
Invalid, insufficient, unavailable, or timed-out scouting is not cached and
falls back to neutral deterministic Shopping queries with no quality target.
Cancellation reaches shared in-flight provider work.

Step 2 is committed at `a9a2036bd25dd3ff3af6e255dd864ffe323bdbeb`.
Validation passes 303/303 unit tests across 42 suites, typecheck, zero-warning
lint, the production build, and Playwright 7/7. No new live matrix ran, so the
last measured north-star values remain the Step 1 result: 23/24 non-empty,
shop vacuum 2/3, p95 18,806 ms, zero observed constraint failures, and no
market-leader-recall claim.

**Step 3 quality-selection checkpoint:** the route starts the market scout and
three neutral Shopping queries concurrently. After neutral results pass early
type, condition, market, and extreme-budget filters, the selector searches at
most the three highest `strong` exact models not already discovered. At most
six discovery searches plus nine candidate-local resolutions stay within
fifteen logical Serper operations.

Shopping rating, rating count, offer count, product ID, and provider position
are retained internally. Evidence attaches only after canonical brand and
exact stable model identity match; named, numeric, generation, year, and code
siblings remain isolated. The final order is reapplied after every existing
gate passes: `strong`, `supported`, unscored; directly supported preferences;
scout consensus; Bayesian rating `(rating * count + 4.0 * 50) / (count + 50)`;
review/offer volume; resolution/merchant quality; stable discovery order.
Price is only an eligibility ceiling and never adds rank. Brand diversity
preserves the strongest qualifying leader first.

Step 3 is committed at `1b4ca46a4e13cde6a9e81eb3744fda68b4671562`.
Validation passes 317/317 unit tests across 43 suites, typecheck, zero-warning
lint, the production build, and Playwright 7/7. Tests prove all eight frozen
leader identities bind in QA without runtime registry access, siblings do not
inherit evidence, a 5.0/1 product loses the commerce tie-break to 4.6/1,000,
the scout/neutral searches overlap, no more than three strong-target searches
run, and final post-gate sorting preserves tier priority. No new live matrix
has run, so the last measured values remain the Step 1 baseline.

**Step 4 actual:** the first no-retry matrix was preserved as a failure at
17/24 non-empty, four request timeouts, p95 30,009 ms, and 2/20 frozen-leader
hits among successful requests. It exposed default OpenAI SDK timeout retries,
frequent four-call scout responses rejected by the three-call validator, a
known 1080p contradiction to the 1440p preference, and one direct laptop URL
whose explicit configuration contradicted its title.

The bounded correction disabled SDK retries, requested one broad hosted
search while retaining the three-call hard validator, used a 10.5-second scout
deadline and prompt version v3, added display-resolution extraction, and made
explicit URL size/RAM/storage conflicts ineligible. A second distinct
three-by-eight matrix then completed all 24 cache-cold requests once:

- 18/24 non-empty, shop vacuum 3/3;
- frozen leader in the top three in 3/24 eligible-registry runs (12.5%);
- four runs produced a `strong` plan, but zero returned that strong target;
- mean 19,235 ms, nearest-rank p95 22,975 ms, maximum 26,174 ms;
- one OpenAI response per request, maximum two hosted searches, maximum
  thirteen logical Serper operations;
- unchanged public shape, mean 725-byte and maximum 1,738-byte normal payload;
- nineteen scout fallbacks: fourteen timeout, two invalid output, three
  insufficient evidence; and
- zero detected post-correction safety, identity, requirement, availability,
  budget, source, public-shape, or SSRF violations.

The latency, call, shape, safety, strong-before-unscored ordering, and shop-vac
gates pass. The 21/24 non-empty and 80% leader-recall gates fail decisively.
Before-quality leader recall is not reconstructible because Step 1 did not
retain per-card identities; the honest comparison is that non-empty recall
fell from 23/24 to 18/24 and the new path returned any evidence-tiered card in
only one run.

**Historical decision:** stop tuning this architecture. The live bottleneck is
the synchronous scout/commerce handoff, not the deterministic ranker. At this
checkpoint the proposed successor was a periodically refreshed source-bound
evidence index, with live scouting plus a relaxed latency SLO as the alternative.
PR-14 below supersedes that proposal: the persistent/background index was
explicitly rejected and removed. Do not use this historical paragraph as
current implementation authority.

### PR-14 - request-time market-quality reset

**Status:** implemented through runtime commit `ff8f3a0`; deterministic
verification passes. Serper is the sole product-search and commerce transport.
The later SerpApi adapter, key, orchestration, telemetry, harness fields, and
tests were explicitly removed. The current Serper-only runtime completed V23:
all ten requests were non-empty and safety/binding/public/call gates passed,
but leader recall was 1/9 eligible runs (11.1%) and p95/maximum was 34,196 ms.
V20 at equivalent retained runtime `b4e1890` remains the stronger historical
comparison at 5/10 leaders and 29,646 ms p95/maximum. PR-14 is not release-
qualified.

**Objective:** research the current market for every shopper search, including
repeated equivalent searches, without a retained market index, precomputation,
background refresh, or cross-request research/recommendation cache. Preserve
the minimal public card and every product-safety gate.

**Architecture:** the indexed/prewarm implementation was reversed. Each request
starts one fresh GPT-5.4 Mini source-bound scout concurrently with three current
brand-neutral Shopping queries. Commerce observations never enter the scout
prompt and cannot steer or establish independent market leadership. The scout
requests and accepts at most three hosted searches, uses low reasoning and a
6,000-token output ceiling, and validates that every target carries a
distinctive exact model/catalog identifier. Its requested `strong` and
`supported` thresholds match deterministic validation. Up to three exact-model
Shopping searches, three organic exact-target page searches, and bounded
candidate-local resolution fit within fifteen logical Serper operations. The
only Shopping and product-page coalescing maps are allocated inside the current
`selectProducts` call and are discarded when it returns. The response is
`Cache-Control: no-store`; there is no production index, prewarm, polling,
background work, persistent plan/result cache, or alternate recommender.

**Generalized accuracy corrections:** exact scout models are carried through
retailer-page discovery; generic aliases cannot bypass an exact target; numeric,
named, generation, and hyphenated catalog siblings remain isolated; standalone
catalog codes are recognized without turning performance measurements into
models; target resolution reuses a known Shopping merchant; and organic pages
bind only to exact Shopping offers on that merchant. Prices and availability
never move across merchants. Condition is rechecked after resolution, including
URL-only `reconditioned` disclosures. Page titles and URL specifications are
checked independently, repeated identical slug models remain idempotent,
placeholder `img-na` images are rejected, and leaf blowers are separated from
compact workshop/jobsite blowers and accessories.

**Authoritative frozen live audit (equivalent Serper-only runtime `b4e1890`):**
`tests/benchmarks/pr14-live-accuracy-v2026-09a.json` precommits five broad and
five constrained cases, one cache-cold attempt each with no retries. The
authoritative report is
`docs/pr14-live-accuracy-report-v20-independent-concurrent.json`:

- 10/10 HTTP 200 and 10/10 non-empty, including both shop-vac cells;
- frozen leader top-three recall 5/10 (50%) versus the 80% gate;
- runtime evidence returned in 6/10, runtime `strong` in 2/10, and one scout
  used honest insufficient-evidence fallback;
- mean 23,629 ms and nearest-rank p95/maximum 29,646 ms, passing the 30-second
  maximum but failing the 25-second p95;
- one OpenAI response/request, three hosted searches/request, and at most
  fifteen logical Serper operations/request;
- public payload unchanged, mean 797 bytes and maximum 1,542 bytes; and
- 178,040 input plus 12,545 output model tokens, approximately $0.189982 in
  model-token cost at the benchmark's published rates.

V20 improved leader hits from four to five, mean latency by 5,086 ms, p95/max
by 6,904 ms, and model tokens by 12,372 versus V19. Every deterministic product
safety, exact-binding, public-contract, call-ceiling, and strong-ahead-of-
unscored gate passed. The aggregate leader and p95 gates remain failed.

**Current-runtime frozen audit (`ff8f3a0`):** after one successful bounded
debug smoke, the same precommitted ten-case matrix ran once per cell with no
retries or substitutions. The authoritative current-runtime report is
`docs/pr14-live-accuracy-report-v23-serper-only-restored.json`:

- 10/10 HTTP 200 and 10/10 non-empty, with every safety, exact-binding, fresh-
  research, public-shape, one-response, three-hosted-search, fifteen-Serper-
  operation, required-recall, and strong-ahead-of-unscored gate passing;
- frozen leader top-three recall 1/9 benchmark-eligible runs (11.1%); runtime
  evidence 7/10, runtime `strong` 2/10, and no scout fallback;
- mean/p95/maximum latency 29,930/34,196/34,196 ms, failing both latency gates;
- ten Responses calls, thirty hosted searches, 138 logical/physical Serper
  operations, 196,243 model tokens, and approximately $0.206068 model-token
  cost; and
- unchanged public payload at 812 bytes mean and 1,357 bytes maximum.

V23 is current-runtime authority. V20 remains the stronger historical result;
the provider correction did not resolve the market-to-current-commerce
convergence bottleneck.

**Verification:** the current `ff8f3a0` source passes 352/352 unit tests across
44 suites, typecheck, zero-warning lint, the Next.js 16.3.3 production build,
and Playwright 7/7 across Chromium desktop/mobile. Focused Serper product-search,
selection, discovery, and API tests pass 109/109. The build exposes only `/`,
`/_not-found`, and `/api/recommendations`.

**Decision:** retain the independent request-time scout and Serper-only
discovery, product-page resolution, and verification architecture locally, but
do not release or claim dependable best-in-budget selection. Do not restore the
rejected evidence index, SerpApi adapter, or another commerce provider. Attribute
the generalized V23 losses inside Serper discovery, exact-target recovery, and
page verification before another implementation experiment. A progressive or
asynchronous response changes delivery but does not fix coverage and remains a
separate public-contract decision.

**Exact-binding follow-up at `61a914d`:** live QA exposed three generalized
identity failures in successive preserved reports: a non-US locale path, an
arbitrary trailing-letter sibling, and an alias that dropped an exact named
variant. The current implementation rejects non-US market path prefixes,
requires scout aliases to preserve exact identifiers and named variants,
accepts only the bounded bare-tool `B` suffix, supports genuine short catalog
models and retailer-split codes, and permits source-derived exact identity only
for a direct product page whose primary identity names no sibling. It also
consumes direct inline Shopping offers already returned by a product-page
search, preserves them only on the same exact page and merchant, adds resolved
page-title/path requirement evidence, canonicalizes Moccamaster to Technivorm,
and rejects navigation-bar artwork. None of these signals creates eligibility
or changes the public card.

The new live runner independently rebinds every evidence-bearing returned card
to the exact target. Its first preserved run,
`docs/pr14-live-accuracy-report-v9-authoritative.json`, completed 10/10 requests
and 10/10 non-empty but failed that assertion because the debug envelope had
discarded earlier exact source identity used by a valid direct-page binding.
After correcting only debug telemetry, the replacement one-attempt/no-retry
run `docs/pr14-live-accuracy-report-v10-authoritative.json` passed exact binding
and safety in all ten cells. It returned 7/10 non-empty, one frozen leader in
seven currently eligible cells (14.29%), runtime evidence in 2/10, runtime
`strong` in 2/10, and one scout fallback. Mean latency was 31,884 ms and p95/
maximum was 43,430 ms. It used ten OpenAI Responses, thirty hosted searches,
133 logical and physical Serper attempts, maximum fifteen logical operations
per request, 190,266 model tokens, approximately $0.191525 model-token cost,
and an unchanged five-field payload averaging 754 bytes and peaking at 1,552
bytes.

Compared with the prior exact-scout baseline, absolute frozen-leader hits did
not improve, non-empty recall fell from 10/10 to 7/10, and tail latency
worsened. The follow-up strengthens safety and attribution but does not prove
better aggregate product quality. The release verdict and next architecture
decision are unchanged. Taylor has authorized evaluating an asynchronous or
progressive contract, but it must be compared against request-scoped canonical
commerce resolution and a larger explicit operation/latency envelope rather
than assumed superior.

**Direct-page feasibility follow-up:** the scout was experimentally extended
to return source-bound retailer/brand product-page leads. URLs had to occur in
the completed Responses web-search source set, never contributed to evidence
tier, and still passed the existing SSRF, fetched-page identity, condition,
availability, USD price, budget, requirement, and product-page gates. Because
Responses web-search source metadata exposes URLs but not a trusted page title,
opaque retailer SKUs remained provisional until the live fetched page named the
exact target; sibling pages failed closed.

Three single-attempt ten-case reports preserve the progression. V11 returned
10/10 non-empty and 4/9 eligible frozen leaders (44.44%) with 40,017 ms p95/
maximum. V12's two-page alternative returned 9/10 non-empty and 1/10 leaders
with 44,344 ms p95/maximum. The final fetched-identity V13 returned 10/10 non-
empty and 2/10 leaders with 41,268 ms p95/maximum. It accepted four provisional
product-page URLs, rejected six, and returned zero source-bound-page cards after
all live gates. V13 used ten OpenAI Responses, thirty hosted searches, 125
logical/physical Serper operations, 194,589 model tokens, and approximately
$0.202525 model-token cost; its unchanged public payload averaged 753 bytes and
peaked at 1,577 bytes.

All three runs passed product safety, exact evidence binding, public shape, one
OpenAI response/request, three hosted searches/request, and fifteen logical
Serper operations/request. All failed the 80% leader and 25,000/30,000 ms
latency gates. The direct-page runtime experiment was therefore removed instead
of retaining an unproved second path. The only retained behavioral change is to
the QA harness: its precommitted 25-second p95 and 30-second maximum thresholds
are now explicit benchmark fields and executable acceptance checks. The runtime
snapshot remains `61a914d`; PR-14 remains not release-qualified.

**Commerce-informed scout follow-up at `7077c37`:** inspection found that a
broad request with empty budget and priorities collapsed the first three
nominal discovery queries to the same category string, leaving only two unique
Shopping calls. Broad requests now preserve three brand-neutral variants: the
category, `top rated`, and `popular models`. Query wording remains discovery
only and never establishes leader evidence.

The request orchestration now lets current commerce discovery inform the same
single scout instead of asking the scout to nominate models before it knows what
the current Shopping provider exposed. After early filters and deduplication,
the scout receives at most fifteen bounded names, brands, exact-model tokens,
retailers, observed prices, ratings/counts, offer counts, and positions. It is
instructed to research this untrusted roster first and may nominate a stronger
omitted model only with independent source support. The existing source
binding, evidence tiers, exact-model isolation, product/requirement/condition/
availability/price/page/image/SSRF gates, ranking order, one-OpenAI-call cap,
three-hosted-search cap, fifteen-Serper-operation cap, request isolation, and
minimal public payload remain unchanged.

The preserved single-attempt/no-retry report
`docs/pr14-live-accuracy-report-v14-commerce-informed.json` completed 10/10 HTTP
requests and 10/10 non-empty, including both shop-vac cases. It passed safety,
exact evidence binding, fresh request research, unchanged public shape, one
OpenAI response/request, three hosted searches/request, at most fifteen logical
Serper operations/request, and strong-ahead-of-unscored ordering. It produced
2/9 currently eligible frozen leaders (22.22%; one leader was current-
ineligible), runtime evidence in 5/10, runtime `strong` in 3/10, strong plans in
8/10, and zero scout fallbacks. Mean latency was 31,456 ms and p95/maximum was
40,163 ms. It used 137 logical/physical Serper operations, 187,726 input plus
12,610 output tokens (200,336 total), approximately $0.197539 model-token cost,
and an unchanged five-field payload averaging 803 bytes and peaking at 1,304
bytes.

Against the committed V10 authoritative baseline, V14 improved non-empty recall
from 7/10 to 10/10, evidence-bearing results from 2/10 to 5/10, `strong` results
from 2/10 to 3/10, frozen-leader hits from one to two, and p95 from 43,430 to
40,163 ms. It added four Serper operations and 10,070 model tokens. This is a
measured incremental improvement, not release proof: leader recall remains far
below 80%, and both latency gates remain failed. The next evidence-supported
comparison remains a request-scoped canonical-commerce provider/retailer
integration; a progressive contract changes delivery but does not itself fix
coverage.

**Seller-alternative and commerce-source follow-up at `0b4c817`:** V14
diagnostics proved that page discovery could find two exact-model seller pages,
but identity deduplication and finalist selection collapsed them before current
page verification. An evidence-bound exact model may now retain up to two
distinct merchant/page alternatives through verification; the final public
shortlist still emits one distinct card. This adds no search operation.

The Shopping normalizer and exact-target page admission now reject editorial,
comparison, review, support, and manual URLs before they can consume commerce
or verification slots. Exact-target pages from unknown merchants remain valid
only when a current Shopping candidate binds that merchant. A separate identity
correction prevents a pressure measurement such as `2100 max PSI` from being
misclassified as a `Max` sibling-model qualifier. Exact sibling isolation and
all downstream gates remain unchanged.

Five single-attempt/no-retry reports preserve the investigation instead of
selecting a preferred run. V15 diagnosed the unchanged path; V16 reached 4/10
leaders and 9/10 non-empty after retaining seller alternatives; V17 reached
2/10 and 10/10 after early source rejection; V18 exposed the false `max PSI`
binding result; and the corrected authoritative V19 report reached 4/10 leaders
and 10/10 non-empty while passing every safety and binding gate.

V19 used ten OpenAI Responses, thirty hosted searches, 135 logical and 133
physical Serper operations, and 202,957 model tokens at approximately $0.198950
model-token cost. Runtime evidence returned in 6/10 and runtime `strong` in
5/10. Mean latency was 28,715 ms and p95/maximum was 36,550 ms. The unchanged
five-field payload averaged 998 bytes and peaked at 1,589 bytes. It remains a
release failure: 40% leader recall is below 80%, and both latency limits fail.

**Concurrent independent-scout follow-up at `b4e1890`:** the route now starts
the one source-bound scout before selection, while `selectProducts` starts and
awaits the three neutral Shopping queries alongside that already-running
promise. Commerce summaries were removed from the scout interface and prompt.
The system prompt now asks for exactly the thresholds enforced by validation:
two independent domains including one comparative source for `strong`, or one
comparative source / two reputable editorials for `supported`.

The first and only cache-cold V20 matrix for this architecture is preserved as
`docs/pr14-live-accuracy-report-v20-independent-concurrent.json`. It completed
10/10 HTTP and non-empty results, returned 5/10 frozen leaders, runtime evidence
in 6/10 and runtime `strong` in 2/10, and used one honest insufficient-evidence
fallback. It passed safety, exact binding, fresh research, both shop-vac cells,
public shape, one-response, three-hosted-search, fifteen-Serper-operation,
strong-ahead-of-unscored, and 30-second maximum gates.

V20 used ten Responses calls, thirty hosted searches, 137 logical/physical
Serper operations, 190,585 model tokens, and approximately $0.189982 model-
token cost. Mean/p95/maximum latency was 23,629/29,646/29,646 ms and the
unchanged payload averaged 797 bytes and peaked at 1,542 bytes. Versus V19 it
improved leaders by one, mean by 5,086 ms, p95/max by 6,904 ms, and tokens by
12,372. It remains a release failure at 50% leader recall and 29,646 ms p95.

Saved-report inspection of the five V20 misses found provider discovery,
trustworthy current price/availability, hard-feature proof, and qualified-scout
coverage gaps—not a safe deterministic ranking correction. Do not tune to
benchmark products or weaken eligibility. The later SerpApi comparison was
rejected and removed; the next correction must first attribute generalized V23
losses within the retained request-time Serper path.

**Current verification:** 352/352 unit tests across 44 suites, typecheck, zero-
warning lint, the Next.js 16.3.3 production build, Playwright 7/7 across
Chromium desktop/mobile, and `git diff --check` pass. No push or deployment
occurred.

**Rejected V21/V22 follow-up:** two further single-attempt, cache-cold matrices
tested generalized same-provider changes and were fully reverted. V21 restricted
the scout to the recognized editorial-domain set with high search context and
US location, and allowed supported targets to consume target-page recovery.
`docs/pr14-live-accuracy-report-v21-source-focused.json` passed product safety,
exact binding, public shape, all call ceilings, and the 30-second maximum, but
fell to 9/10 non-empty and 2/10 frozen leaders. Mean/p95/maximum latency was
23,674/26,274/26,274 ms; it used 139 logical and 137 physical Serper operations,
179,651 model tokens, and approximately $0.176157 model-token cost.

V22 restored unrestricted medium-context search, then tested an editorial-only
scout responsibility, canonicalized brand/model target queries, and started
exact Shopping plus strong-target page recovery concurrently. The preserved
`docs/pr14-live-accuracy-report-v22-concurrent-target-recovery.json` passed
10/10 HTTP/non-empty, product safety, exact binding, public shape, and all call
ceilings, but again reached only 2/10 frozen leaders and exceeded both latency
limits at 26,008/32,916/32,916 ms mean/p95/maximum. It used 144 logical and 143
physical Serper operations, 191,130 model tokens, and approximately $0.199282
model-token cost.

Neither run was retried or selected opportunistically. Both experimental code
paths were removed, leaving no tracked runtime or test diff from `b4e1890`.
Together they strengthen the prior conclusion: source filtering, prompt
expansion, target-query wording, and extra same-provider target-page concurrency
do not solve the canonical current-offer/page bottleneck. V20 remains the
authoritative retained report and PR-14 remains not release-qualified.

**Rejected SerpApi detour removed at `ff8f3a0`:** commit `c829fa4` added a
second commerce provider after the retained V20 architecture. Taylor clarified
that ReviewRadar must use Serper rather than SerpApi. The adapter source and
tests were deleted; its environment key, provenance type, selection branch,
3+3 counters, debug architecture version, and QA-report fields were restored
exactly to their pre-detour state.

The twelve touched runtime/config/test paths exactly match the parent of
`c829fa4`, and source searches find zero remaining SerpApi or canonical-adapter
references. The removal preserves the independent scout, all Serper searches,
fifteen-operation ceiling, exact-model evidence binding, seller alternatives,
Bayesian commerce ranking, every safety/price/availability/requirement gate,
request-only coalescing, cancellation, and the minimal five-field card.

Focused validation passes 109/109 and the full wall passes 352/352 across 44
suites, typecheck, zero-warning lint, production build, Playwright 7/7, and diff
checking. One current-runtime debug smoke and the no-retry V23 matrix then ran.
V23 returned 10/10 non-empty but only 1/9 eligible leaders and regressed to
34,196 ms p95/maximum. Its full call, token, cost, payload, and per-cell evidence
is preserved in `docs/pr14-live-accuracy-report-v23-serper-only-restored.json`.
A SerpApi credential is neither needed nor allowed by the current architecture.

### PR-14 stabilization checkpoint — request-bound baseline (2026-09-01)

The post-reversal architecture audit passed. Production has one request-time,
request-bound recommendation path and no evidence index, prewarm, refresh job,
post-response research, persistent plan/result/Shopping/page cache, or startup
market-research dependency. Request-local Maps coalesce duplicate work only
inside one `selectProducts` call; the sole process-global mutable object is
product-free paid-request admission accounting.

The audit removed dead scout-plan/telemetry/client contracts, obsolete package
and environment examples, and stale current-product documentation. Historical
reports and superseded sections stay on disk as labeled audit evidence and have
no runtime authority. The live runner is now generically named
`scripts/run-live-accuracy-matrix.mjs`.

A five-scenario smoke found one generalized regression: an explicit drip-coffee
request admitted a French press. The shared product-type intent classifier now
rejects explicit alternative brewing methods for drip intent; focused coverage
and corrected/post-restart live searches pass. No score, leader list, ranking
architecture, discovery provider, benchmark-tuned rule, or public field changed.

Final wall: 355/355 unit tests across 44 suites, typecheck, zero-warning lint,
production build, and Playwright 7/7. A complete process restart followed by a
repeat search produced fresh scout and Serper work without startup/prewarm state.
The checkpoint is ready for a separately approved Phase 0 measurement. PR-14
remains not release-qualified because V23's 11.1% eligible-leader recall and
34,196 ms p95/maximum remain the current quality/latency evidence.

Do not treat baseline readiness as permission to implement the next ranking
architecture. Phase 0 must measure this exact request-bound behavior first.

### Phase 0 — Review Radar Accuracy Benchmark V1 (2026-09-01)

Phase 0 is complete as a measurement-only phase. The frozen suite contains 48
one-attempt searches across 11 categories and nine search types. Its independent
registry contains 99 timestamped products, each scored reference bound to at
least two source families. References were frozen before the first production
request and remain offline evaluation data. Production cannot import them, and
the live runner strips reference IDs before calling the existing route.

The baseline is reproducibly sealed to `main` at
`866c5fc9ab9ea72a135393d84f996189d13647c6`, the relevant dirty-diff hash, runtime
configuration constants, and hashes for every measured production file. No
commit was made because the tree contains unrelated pre-existing work. The only
runtime edit is additive debug candidate-funnel telemetry; recommendation
planning, filtering, ranking, verification, selection, and public cards are
unchanged.

Primary evidence: discovery recall 62/142 (43.66%), final leader recall 7/142
(4.93%), top-K quality precision 50/102 (49.02%), NDCG@3 0.4082, and hard-
requirement accuracy 163/172 (94.77%). Eight of 48 HTTP-200 searches returned no
products. Earliest leader losses were 80 never discovered, 26 lost before the
nine-candidate verification slate, 10 final-selection crowd-outs, 8 page/
commerce verification losses, 6 prefilter losses, 3 deduplication losses, and 2
market/merchant losses.

The next evidence-supported target is generalized request-time discovery
coverage, followed by attribution and correction of the compatible-pool-to-
verification cutoff. Do not begin with a Product Quality Score or final-ranking
weight change: 106/142 leader losses occur earlier. Any successor must reuse V1
unchanged for comparison or declare a new version/delta, preserve the request-
bound architecture, and keep benchmark identities out of production.

Authoritative report:
`benchmarks/accuracy-v1/results/baseline-report.md`.

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

The R7 kickoffs and the historical verified-hypothesis V2 draft are superseded;
do not execute them. The active next kickoff is:

- OAI-1: `Execute OAI-1 per docs/forward-roadmap.md. Zero live calls and zero external verification fetches; run the historical AI-row audit, then implement only the versioned master-prompt/schema/evidence/verification contract and isolated mocked adapter; keep production behavior unchanged; stop after reporting. Do not start OAI-2A.`

OAI-2A and later kickoff text must be written only after the prior phase
reports its exact gate and, for live work, its measured OpenAI/Serper/hosted-
search/direct-fetch and token-cost planning basis.

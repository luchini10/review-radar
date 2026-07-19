# ReviewRadar Forward Roadmap (R/C-series history + OAI migration)

Adopted 2026-07-10. This document governs all forward sequencing. Completed
history stays in `docs/codex-handoff-phased-plan.md`; the Phase 6 measurement
method remains owned by `docs/phase-6-reliability-gauntlet-plan.md`;
`docs/agent-next-task.md` always points at the current active phase. No other
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

### OAI-T7A - saved-slate transactional feasibility preflight (complete locally 2026-07-19; zero live)

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

**Recommended reasoning level:** High. The harness is narrow and reuses the
existing verifier, but exact-model offer binding, redaction, and one-shot spend
controls remain safety-sensitive.

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

# Agent Next Task

Generated: 2026-07-11

## Current state

`docs/forward-roadmap.md` governs forward sequencing. Phase R3, all RR-061
image repairs, RR-080, and the RR-078/RR-079 eligibility/type safety phase are
complete. R3's `REVIEW_RADAR_PINNED_PLANNING` flag remains default-off and
`.env.local` is unchanged.

The RR-078/RR-079 phase used zero live calls. Fail-first focused validation
passed 33/35 with exactly the two intended failures; final focused validation
passed 97/97; the full suite passed 822/822 across 120 suites. Typecheck,
production build, and offline eval pass; lint has 0 errors and 3 existing
warnings.

The issue register remains at 80 issues: 67 Fixed, 12 Needs Investigation,
1 Won't Fix, and 0 Open; 11 Critical, 33 High, 31 Medium, and 5 Low. RR-078
and RR-079 are Fixed. RR-015 remains Needs Investigation because no live
stability improvement has been measured.

R2 remains stopped at 4/6. Latest North-Star evidence is unchanged:

- core-leader recall: unavailable without an approved snapshot;
- wrong-type/non-product final cards: 3/23;
- full stated-constraint compliance: unscoreable because `self-emptying` was
  not encoded as a requirement;
- stability: A pool/final Jaccard 0.1051/0.0333; B unavailable.

The deterministic RR-078/RR-079 repair is expected to remove the three
captured non-product/wrong-type cards in a later comparable sample, but no live
improvement is claimed. Rubric remains `v0.1-draft`; leader snapshots,
significance rules, and baseline values are unfrozen. Phase 6E is unauthorized.

## Required next task — Phase R4 deterministic implementation

This phase requires Taylor's explicit approval. Approval of the deterministic
implementation does not authorize R4's six-search live after-sample.

Implement Phase R4 from `docs/forward-roadmap.md` behind default-off
`REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`, snapshot-identical when off:

- rank initial Shopping slots by shopper-constraint coverage so generic
  synonym expansion cannot occupy a protected slot ahead of a
  constraint-bearing query (RR-075);
- preserve ambiguous Important Details as search-recall phrases and carry an
  explicit hard-vs-preferred strength from extraction through search,
  validation, and final selection (RR-073);
- remove duplicate/malformed budget wording in query construction (RR-074);
- keep the Serper budget unchanged: reallocate existing slots, do not expand;
- add fail-first deterministic tests for all three issues and prove at least
  3 of 5 initial Shopping queries carry the benchmark constraint;
- prove flag-off snapshots are unchanged;
- use zero live Serper/OpenAI calls during deterministic implementation;
- update the issue register and standard phase documents, then stop.

## Later sequence

After deterministic R4 review, Taylor may separately approve the six-search
live after-sample. That batch also measures R3 planner pinning. Flag promotion
in `.env.local` requires the before/after evidence and is not implicit in
implementation approval.

## Safety boundary

Do not run B2/B3, execute the R4 live after-sample, enable either R3 or R4 in
`.env.local`, run a new baseline, freeze R2 values, approve leader snapshots,
start R5, or start Phase 6E without separate approval. Do not commit live
fixtures or existing untracked local artifacts.

Reference:

- `docs/forward-roadmap.md`
- `docs/agent-dialogue.md`
- `docs/phase-6-variance-pilot.md`
- `docs/RR-Issues-Report.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` section 27

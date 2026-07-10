# Agent Next Task

Generated: 2026-07-10

## Current state

`docs/forward-roadmap.md` governs all forward sequencing (adopted 2026-07-10,
Phase R0, commit `62cc007`).

**Phase R1 is complete: RR-061 is Fixed.** The shared image resolver now vetoes
images whose filename model identity conflicts with the product's normalized
name/brand/model identity, closing the wrong-model failure
(`Saros_Z70_Silver_ID.png` on a Roborock Q5 Max+ card) that stopped the last
two live windows. Fail-first 2/2 → green; focused resolver 19/19; full suite
807/807 across 119 suites; typecheck/lint/build/eval pass; zero live calls.

The register contains 77 issues: 64 Fixed, 12 Needs Investigation, 1 Won't
Fix, 0 Open. RR-070 through RR-077 remain Needs Investigation evidence for
roadmap Phases R4–R6; do not fix them out of order.

## Required next task — Phase R2 (separate explicit approval required)

**Phase R2 — live ledger verification + frozen baseline.** Six live searches
(~225–280 Serper calls): three broad `shop vac`, three constrained
`robot vacuum` / `under $300` / `self-emptying`, cache-cold per run,
commit-pinned, fixtures saved with `ledger-run` names. R2 completes Phase 6D,
freezes rubric v1.0 and the leader snapshots, records the baseline North-Star
values, and serves as the "before" sample for R3/R4. Full protocol, safety
rule, and report requirements: `docs/forward-roadmap.md`.

R2 starts ONLY when Taylor fires its kickoff prompt with the live budget.
Until then:

- do not run Serper searches, OpenAI searches, `qa:save-fixture`, live QA
  workers, or baseline/variance searches;
- do not spend the four calls left from the stopped Phase 6D window;
- do not pool any of the three stopped Phase 6D samples;
- do not freeze rubric v1.0, approve leader snapshots, or start Phase 6E
  outside R2;
- do not implement RR-070 through RR-077 based only on Phase A
  instrumentation (they are owned by R4–R6);
- do not weaken the RR-061 model-conflict guard or any prior image, identity,
  price, citation, requirement, or product-type safeguard.

## Verification baseline (post-R1)

```text
npm run typecheck: pass
npm run lint: 0 errors, 3 existing warnings
npm test: 807/807 across 119 suites
npm run build: pass
node scripts/eval-pipeline.mjs: no red-flag issues
live Serper/OpenAI calls: 0
```

Reference:

- `docs/forward-roadmap.md`
- `docs/review-radar-search-pipeline-audit.md`
- `docs/RR-Issues-Report.md`
- `docs/codex-handoff-phased-plan.md`
- `docs/review-radar-test-memory.md`
- `docs/qa-loop-results.md`
- `ReviewRadar-Overview.md` sections 10, 21, and 22

# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the zero-live RR-097/RR-098 corrective
phase. Use `git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off and
undeployed. RR-097 and RR-098 are Fixed locally in commits `59ae9bc` and
`95fddb5`.

- RR-097 was a shared report-contract failure. Terra's gas report used bare
  `#1 Best Match` labels (not Markdown H1); separate shortlist, evaluation,
  price, and UI parsers erased all three products. One shared parser now
  supports bare labels and H1-H4 with safe section boundaries.
- RR-098 was a verifier false rejection. Ancestor URL taxonomy and ordinary
  title-corroborated product detail were treated as sibling identity. The
  verifier now inspects the identity-bearing path region and requires every
  non-neutral post-model detail to be target/category-explained or visible in
  the candidate title. Partial corroboration still fails closed.
- Exact manufacturer/popular-retailer model slugs can resolve only generic
  eligibility `unknown`. Explicit negative eligibility and every existing
  sibling, accessory, editorial, redirect, private-host, type, coded-model,
  Q7/Q70, and wrong-image veto remain binding.

Register totals: 98 issues; 14 Critical, 46 High, 33 Medium, 5 Low; 91 Fixed,
6 Needs Investigation, 1 Won't Fix, 0 Open.

## Evidence and verification

The verifier-v4 live window at harness commit `9e041e0` spent three requests
(office chair, gas grill, cordless drill) and stopped before robot vacuum.
Sanitized untracked evidence is under
`tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-9e041e0/`.
Never stage that directory.

Current zero-live evidence:

- focused parser/evaluation/response/price/UI tests: 46/46;
- focused asset/citation tests: 59/59;
- complete wall: 1337/1337 across 192 suites;
- typecheck and production build: pass;
- lint: zero errors, three pre-existing warnings;
- older eight-run T8D replay: 31/31 ranked products accounted; and
- latest three completed runs: 12/12 accounted, including 3/3 gas products.

Evidence limit: the sanitized gas fixture omitted raw price observations, and
the saved provider trace cannot reconstruct every original raw result. Offline
replay proves the parser root correction and complete first-loss accounting,
but it does not prove post-fix live website/image coverage.

## Next approval-gated step

Run a three-case diagnostic revalidation, not another four-case window:

1. **Office chairs** — prove the RR-098 verifier repair improves safe
   manufacturer/retailer website coverage without a wrong link or image.
2. **Gas grills** — replace the invalid parser measurement and prove ranked
   products, price sections, targets, and assets survive the real response.
3. **Robot vacuum** — execute the category that was never dispatched in the
   stopped window.

Do not repeat cordless drill: it completed and neither correction targets its
path. Pin the new window to the current reviewed documentation commit, retain
only sanitized evidence, use the established no-retry/one-run-per-case harness,
and stop after the three outcomes. Exact OpenAI/hosted-search/Serper/page-fetch
and dollar ceilings require Taylor's separate approval before execution.

**Recommended reasoning level:** High. Execution is bounded, but interpreting
product identity and deciding whether the repaired verifier preserved the
wrong-sibling safety boundary requires careful evidence review. Maximum
reasoning is unnecessary unless the new trace contradicts the offline model.

## Approval and flag state

Scoped local phase files may be committed automatically under Taylor's standing
instruction. No live/external call, deployment, production change, flag
promotion, `.env.local` edit, or push is authorized.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other external request without
  a new exact numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's products, names, order, report, citations, and price
  caveats.
- No product-, brand-, category-, retailer-, or observed-path production
  exception.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[109]` asks Claude to challenge full title corroboration and
the bounded exact-slug/unknown-eligibility proof. That review is advisory and
does not authorize work.

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| Canonical defects | RR-097/RR-098 in `docs/RR-Issues-Report.md` |
| Phase result | latest entry in `docs/qa-loop-results.md` |
| Peer-review request | dialogue entry `[109]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Behavior commits | `59ae9bc`, `95fddb5` |

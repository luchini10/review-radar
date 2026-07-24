# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the zero-live RR-093 descriptive identity
closure at `ae5c904`. Use `git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off. First-loss
schema v2, the prospective `07d` evaluator, authenticated request-category
restoration, and Direct-Terra asset verifier v4 have passed the current
zero-live review. RR-093 is Fixed again.

No OpenAI, Serper, SearchAPI, direct-page, deployment, flag, `.env.local`, or
production action occurred in this phase.

## What changed

Commit `ae5c904` replaces RR-093's incomplete type-only closure with one
descriptive title/URL coherence veto:

- after a candidate title proves the locked brand/model/type, product and image
  URL paths may repeat title, brand, requested-category, ordinary commerce,
  color/configuration, and opaque numeric/hash vocabulary;
- any other path word is unexplained sibling/edition evidence, so that asset
  fails closed;
- the rule only vetoes; it never admits a candidate or changes Terra's product
  set, names, order, explanations, citations, or ranking; and
- numeric/alphanumeric models retain their existing exact boundary contract.

There is no product, brand, category, `gaming`, or `XL` production exception.

## Adversarial result

Fail-first coverage now includes:

- `/embody-gaming-office-chair`;
- `/embody-chair-gaming-edition`;
- `/embody-chair-xl`;
- a safe standard product page with `/embody-chair-xl.png`; and
- an unrelated `/horizon-refrigerator-outdoor-edition` product.

All are rejected. A brand/category/color/opaque-ID retailer path remains
accepted, and the image-only sibling case preserves its safe buy link while
omitting only the bad image.

Known scope boundary: candidate-title-visible descriptive variants are still
governed by existing title/type identity checks. Dialogue entry `[107]` asks
Claude to challenge whether that needs a separately evidenced target/title
contract; do not expand this phase without a reproduced cross-category defect.

## Verification

- Fail-first: 40/42 focused before implementation; the two new contract tests
  failed for the expected accepted-unsafe behavior.
- Image-only adversarial fail-first: 0/1 before the image-path correction.
- Final focused verifier: 43/43.
- Complete unit wall: 1330/1330 across 191 suites.
- Typecheck: pass.
- Lint: zero errors; three pre-existing warnings.
- Production build: pass.
- Eight-fixture T8D replay: pass; 31/31 ranked products accounted, with the
  historical schema-v1 evidence limits retained honestly.
- Live/external calls: zero.

The register is 96 total: 14 Critical, 44 High, 33 Medium, 5 Low; 89 Fixed,
6 Needs Investigation, 1 Won't Fix, and 0 Open.

## Next approval-gated step

Run one diagnostic validation request in each frozen T8D category: broad office
chairs, constrained gas grills, constrained cordless drills, and constrained
robot vacuums. Use first-loss schema v2 and verifier v4.

Exact proposed ceilings for the four-request window:

- 4 Terra/high OpenAI Responses creates;
- at most 80 hosted web-search actions;
- at most 240 retrieves;
- at most 4 safety cancels;
- at most 20 Serper Shopping requests/physical attempts;
- at most 32 Serper organic requests/physical attempts;
- at most 20 bounded direct-page fetches; and
- a $5 OpenAI hard ceiling.

No retries, replacements, additional cases, SearchAPI, fallback architecture,
flag promotion, `.env.local` change, deployment, or production change. Retain
only sanitized evidence and stop/report after four outcomes. The sample is
diagnostic validation, not promotion evidence. If it contradicts the offline
diagnosis or exposes a wrong asset, stop the window and report.

**Recommended reasoning level:** High. Execution is bounded, but the result
audit must distinguish provider absence, conservative false rejection, and a
real identity-safety failure across unrelated categories. Maximum reasoning is
unnecessary unless the evidence forces an architecture decision.

## Approval status

The earlier approval for four live tests was conditional on the prior
adversarial review passing. That review failed, so the approval was withheld
and is not reusable. Taylor must approve the exact new ceilings above before
any request is dispatched.

Scoped local phase files may be committed automatically. Live/external calls,
deployment, production changes, flag promotion, `.env.local`, and push still
require Taylor's explicit authorization.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior handoff reported the corresponding local `.env.local` Direct-Terra
flags enabled. This phase did not read, print, or modify secret values and did
not modify `.env.local`.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, or direct-page request without the new exact
  numeric approval above.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product set, names, order, report, citations, and
  price-estimate caveats.
- No product-, brand-, variant-word-, or category-specific production rule.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| RR-093 closure evidence | latest entry in `docs/qa-loop-results.md` |
| Canonical defect record | RR-093 in `docs/RR-Issues-Report.md` |
| Peer-review request | dialogue entry `[107]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Final code repair | commit `ae5c904` |

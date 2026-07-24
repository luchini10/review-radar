# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the three-case T8D root-cause
revalidation. Use `git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off and
undeployed. The exact three-case revalidation pinned to `56b6df0` completed
once and stopped.

- RR-097 is live-confirmed Fixed: the gas response produced four parsed cards,
  four asset targets, three preferred-host links, and two images instead of
  being erased by the ranked-heading parser.
- RR-098 is live-confirmed Fixed for its target outcome: all five office-chair
  cards received a manufacturer link and image, including the exact Leap,
  Gesture, Aeron, Embody, and Fern pages.
- RR-099 is Open: a Tapo RV30 MAX Plus card received an Amazon replacement
  water-storage-tank/accessory link. The candidate was present and normalized;
  the Direct-Terra verifier incorrectly accepted it after model matching.
- RR-014 remains Needs Investigation: recommendation recall was office `3/7`,
  gas `1/4`, and robot `0/4`. Terra explicitly named four leaders across gas
  and robot but omitted them from the ranked cards; 14 other leader
  observations were absent from retained research evidence.

Register totals: 99 issues; 14 Critical, 47 High, 33 Medium, 5 Low; 91 Fixed,
6 Needs Investigation, 1 Open, and 1 Won't Fix.

## Live evidence and verification

Sanitized untracked evidence is under
`tests/fixtures/review-radar-live/oai-t8d-root-cause-revalidation-56b6df0/`.
Never stage that directory.

Actual live usage:

- 3 Terra/high OpenAI Responses creates;
- 29 hosted web-search actions and 89 retrieves;
- 11 Serper Shopping requests and 14 Serper organic requests;
- 8 bounded product-page fetches and 0 safety cancels;
- `$1.779518` estimated OpenAI cost; and
- approximately 8 minutes 18 seconds wall time.

There were no retries, replacements, second runs, additional cases, SearchAPI
calls, flag changes, `.env.local` changes, deployments, production changes, or
pushes. All 11 ranked products are explicitly accounted.

Current code verification inherited from the pinned pre-live state:

- focused parser/evaluation/response/price/UI tests: 46/46;
- focused asset/citation tests: 59/59;
- complete wall: 1337/1337 across 192 suites;
- typecheck and production build: pass;
- lint: zero errors, three pre-existing warnings;
- older eight-run replay: 31/31 products accounted; and
- prior three-run corrective replay: 12/12 products accounted.

The current docs-only closeout must pass `git diff --check`. No post-live
behavior change has been made.

## Next approval-gated step

Run one zero-live RR-099 safety phase before any further live, promotion, or
deployment work:

1. Add fail-first tests reproducing the saved Tapo replacement-tank link and
   unrelated product/accessory pairs such as a power-tool replacement battery
   and an appliance replacement filter or hose.
2. Trace the shared Direct-Terra verifier path from accepted model identity to
   final URL selection.
3. Add one product-versus-complement veto after model matching and before
   asset selection. It must use generalized complement semantics, not product,
   brand, category, retailer, phrase, or ASIN exceptions.
4. Preserve explicit product-plus-accessory bundles and all sibling,
   editorial, redirect, private-host, wrong-type, wrong-image, and numeric
   boundary protections.
5. Replay every accepted link in the three saved fixtures, run focused and
   complete tests, typecheck, lint, build, inspect the full diff, and commit the
   scoped code/docs automatically.

Stop and report after this safety phase. Do not combine it with RR-014
recommendation changes. After RR-099 closes, the next separately approved
zero-live architecture phase should add a structured candidate slate plus
requirement/rubric verdict inside the same Terra call before final ranking.

**Recommended reasoning level:** High. The next change is bounded and
zero-live, but accessory/product equivalence is a trust boundary where an
over-broad rule can either preserve unsafe links or wrongly suppress complete
product bundles. Maximum reasoning is unnecessary.

## Approval and flag state

The three-case live approval is exhausted. No provider request, page request,
deployment, production change, flag promotion, `.env.local` edit, or push is
currently authorized.

Scoped local phase files may be committed automatically under Taylor's
standing instruction, but behavior work still stops at the phase boundary and
is reported before the next phase.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other external request without
  a new exact numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product names, order, report, citations, and price caveats.
- No product-, brand-, category-, retailer-, phrase-, or observed-path
  production exception.
- Missing an uncertain asset is preferable to displaying an accessory or
  wrong product.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[109]` still asks Claude to challenge the RR-098 boundary.
The live result now supplies additional evidence: final office coverage passed,
but a distinct accessory class escaped in robot vacuum. Any later peer review
should treat RR-099 as the immediate safety priority.

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| Canonical defects | RR-014/RR-097/RR-098/RR-099 in `docs/RR-Issues-Report.md` |
| Live phase result | latest entry in `docs/qa-loop-results.md` |
| Peer-review request | dialogue entry `[109]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Live evidence | untracked `oai-t8d-root-cause-revalidation-56b6df0/` |
| Behavior commits | `59ae9bc`, `95fddb5` |
| Live harness and pin | `da26aee`, `56b6df0` |

# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after the one-case Sol versus Terra comparison.
Use `git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off and undeployed.
Terra remains the application default. Comparison commit `05c1d20` adds an
explicit Sol-only harness override without changing normal request behavior.

The frozen constrained robot-vacuum comparison completed once:

- Sol ranked four products and covered `2/4` leader families versus the saved
  Terra run's two products and `0/4`;
- zero wrong-type or scored budget violations were recorded and all four cards
  carried self-emptying evidence;
- deterministic price coverage was only `1/4`, so three under-$300 claims
  remain AI-reported and unverified;
- all four downloaded images showed the corresponding complete robot and dock;
- three links were exact manufacturer product pages; and
- RR-099 repeated unchanged: the Tapo RV30 Max Plus card received an Amazon
  replacement-water-tank/accessory URL.

RR-014 remains Needs Investigation, RR-099 remains Open, and stability is
NotScored. No default, flag, deployment, or production state changed.

## Live evidence and verification

Sanitized untracked evidence is under
`tests/fixtures/review-radar-live/oai-t8e-sol-terra-robot-comparison-05c1d20/`.
Never stage that directory.

Actual live usage:

- 1 Sol/high OpenAI Responses create;
- 15 hosted web-search actions and 56 retrieves;
- 4 Serper Shopping requests and 5 Serper organic requests;
- 3 bounded product-page fetches and 4 selected-image retrievals;
- 0 safety cancels;
- `$1.448205` estimated OpenAI cost; and
- approximately 5 minutes 3 seconds wall time.

There were no retries, replacements, fallbacks, second responses, additional
cases, SearchAPI calls, flag changes, `.env.local` changes, deployments,
production changes, or pushes.

Preparation verification:

- focused prompt/adapter tests: 8/8;
- complete wall: 1340/1340 across 192 suites;
- typecheck and production build: pass;
- lint: zero errors, three pre-existing warnings;
- Sol dry-run preflight and `git diff --check`: pass.

## Next approval-gated step

The next eligible behavior phase remains the zero-live RR-099 safety repair:

1. Reproduce the saved Tapo replacement-tank link and unrelated
   product/complement pairs with fail-first tests.
2. Add one generalized product-versus-complement veto after model matching and
   before link or image selection.
3. Preserve explicit product-plus-accessory bundles and all sibling,
   editorial, redirect, private-host, wrong-type, wrong-image, and numeric
   boundary protections.
4. Replay every accepted link in the saved T8D and T8E fixtures.
5. Run focused and complete tests, typecheck, lint, build, inspect the diff,
   regenerate this handoff, and commit scoped files automatically.

Do not combine the safety repair with a Sol-default decision or RR-014 prompt
change. Any later Sol decision requires repeated multi-category evidence after
RR-099 is closed.

**Recommended reasoning level:** High. The next change is a product-identity
trust boundary where an over-broad complement rule could suppress legitimate
bundles or an under-broad rule could preserve unsafe buy links. Maximum
reasoning is unnecessary for the bounded zero-live repair.

## Approval and flag state

The one-case Sol live approval is exhausted. No provider request, image
request, page request, deployment, production change, flag promotion,
`.env.local` edit, or push is currently authorized.

Scoped local phase files may be committed automatically under Taylor's
standing instruction, but behavior work still stops at the phase boundary and
is reported before the next phase.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- Direct-Terra research model: `gpt-5.6-terra`

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, image, or other external request
  without a new exact numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve model-authored product names, order, report, citations, and price
  caveats.
- No product-, brand-, category-, retailer-, phrase-, or observed-path
  production exception.
- Missing an uncertain asset is preferable to displaying an accessory or
  wrong product.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[112]` asks Claude to challenge whether the one-case Sol gain
is meaningful and confirms that RR-099 is model-independent. The immediate
safety repair does not depend on that reply.

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| Canonical defects | RR-014 and RR-099 in `docs/RR-Issues-Report.md` |
| Live phase result | latest entry in `docs/qa-loop-results.md` |
| Peer-review request | dialogue entry `[112]` |
| Phase history | OAI-T8E note in `docs/forward-roadmap.md` |
| Sol evidence | untracked `oai-t8e-sol-terra-robot-comparison-05c1d20/` |
| Terra comparison evidence | untracked `oai-t8d-root-cause-revalidation-56b6df0/` |
| Comparison implementation | commit `05c1d20` |

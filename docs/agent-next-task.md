# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the zero-live OAI-T8D first-loss
observability and saved-evidence audit. This handoff is part of the scoped T8D
commit whose parent is `70fca4a`; use `git log -1` for the current full hash.

## Current state

The Direct-Terra one-main-call architecture remains default-off in the repo.
T8C previously showed perfect tested type/budget safety but uneven recall,
stability, and asset coverage. The generalized T8C repairs in `beefd34` remain
the newest product-behavior changes. OAI-T8D added observability and audit code
only: no recommendation, asset, route, UI, flag, or production behavior changed.

## OAI-T8D completed — zero live

The optional server-only first-loss trace follows:

`Terra research/ranking → asset target → citation → primary organic → Shopping
→ retailer organic → page fetch → final selection`

It records only sanitized bounded search actions, normalized recommendation
identities, source hosts, bounded counts, and rejection-reason counts. Search
actions retain bounded query text, action type, and an opened-page host—not a
full destination URL. It never records raw provider rows, source titles,
provider IDs, headers, secrets, or full responses. A missing or throwing
diagnostic sink cannot change returned assets. Client/API response shapes
remain unchanged.

The current Terra contract does not expose an internal candidate slate. The
trace records that limitation explicitly as
`candidateSlate.status=not_exposed_by_current_contract` rather than inventing
candidate identities or silently treating the final ranking as the slate.

New offline command:

```text
npm run qa:direct-terra-first-loss -- --write
```

It reads usable saved T8A/T8B/T8C fixtures and writes a sanitized report into
the already-untracked T8C fixture directory. The generated evidence and all
historical live fixtures remain untracked and must not be staged.

## Decisive offline findings

The audit analyzed 17 saved integrated fixtures and accounted for 69/69 ranked
products with zero incomplete runs.

T8C-specific findings:

- 46 total ranked products;
- 13 historical target-extraction misses across three unrelated categories:
  cordless drills 3, gas grills 4, robot vacuums 6;
- heading-only replay under `beefd34` recovers all 13;
- four historical non-preferred-host links across drills/grills are suppressed
  by the generalized manufacturer/popular-retailer policy;
- nine downstream asset losses remain unattributed because old fixtures omit
  raw candidate/verifier and page-fetch decisions; and
- 28 missed-leader observations remain unattributed because old fixtures omit
  response source-title identity.

Therefore the saved evidence confirms the existing T8C repairs are generalized,
but it does not support another behavior repair. The next diagnostic must
distinguish provider absence from normalization/identity/selection/page failure,
and absent-from-Terra-research from found-but-not-ranked.

Sanitized evidence:
`tests/fixtures/review-radar-live/oai-t8c-multi-category-validation-d7a2ec2/first-loss-audit.json`
(untracked).

## Verification

- fail-first observability tests: passed;
- focused resolver/observability wall: 54/54;
- complete suite: 1319/1319 across 189 suites;
- `npm run typecheck`: pass;
- `npm run build`: pass;
- `npm run lint`: zero errors, three pre-existing warnings;
- diagnostic harness dry-run: pass with no keys and no network; and
- `git diff --check`: required again immediately before commit.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior handoff reported the three corresponding local `.env.local` flags
enabled. OAI-T8D did not read or change `.env.local`.

## Next approval-gated decision

The prepared `--first-loss-diagnostic` mode runs each of the four frozen T8C
cases once. It is attribution evidence, not promotion evidence.

Planning ceilings:

- four Terra creates total;
- per run: at most 20 hosted searches, 60 retrieves, one safety cancel, five
  Serper Shopping requests, eight Serper organic requests, and five bounded
  product-page fetches;
- $5 hard ceiling for the complete four-case window;
- no retry, replacement, fallback, second run, or additional case.

The run must be pinned to the reviewed T8D commit and requires Taylor's separate
numeric approval. Stop and report after the fourth case or the first safety/
contract failure. Do not implement a repair unless the diagnostic proves the
same first-loss mechanism in at least two unrelated categories or establishes a
category-independent trust invariant.

**Recommended reasoning level:** High. The result must distinguish identity
equivalence from sibling-model risk and provider absence from deterministic
rejection.

## Hard boundaries

- No live provider or source-page request without a new exact numeric approval
  pinned to the reviewed T8D commit.
- No behavior repair, threshold change, flag promotion, `.env.local` edit,
  deployment, publication, push, or production change in the diagnostic phase.
- Preserve Terra's product set, names, order, report, citations, price-estimate
  caveats, and every identity/type/image/eligibility trust gate.
- No product-, brand-, or category-specific code.
- Never stage untracked live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| Root-cause phase record and ceilings | OAI-T8D in `docs/forward-roadmap.md` |
| Canonical audit evidence | latest entry in `docs/qa-loop-results.md` |
| Peer-review question | dialogue entry `[102]` |
| Architecture contract | Direct-Terra section in `ReviewRadar-Overview.md` |
| Sanitized offline report | untracked `first-loss-audit.json` above |

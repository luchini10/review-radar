# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the OAI-T8D zero-live corrective phase.
Code commits are `5b3b3cc`, `192c276`, `71fab76`, and `0ccac73`; use
`git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off. The T8D
corrective phase changed server-only diagnostics, versioned evaluation, and the
asset identity safety boundary. It made zero live calls and changed no prompt,
UI, default flag, `.env.local`, deployment, or production setting.

## What the corrective phase established

### Decision-grade future diagnostics

First-loss schema v2 retains at most 20 normalized provider candidate identity
samples per lane, including normalized brand/model/type evidence, host class,
verdict flags, and reason codes. It also recognizes products Terra explicitly
names under Close Matches, not-ranked, other-candidate, or rejected-candidate
sections.

Provider IDs, raw provider rows, full URLs, raw titles, headers, and secrets are
not retained. Diagnostics remain server-only, and a missing or throwing sink
cannot change the user response.

### Honest versioned evaluation

The historical matcher and score remain unchanged. The prospective `07d`
contract:

- treats harmless punctuation/spacing forms such as `Charbroil` and
  `char-broil` as equivalent;
- preserves word and numeric boundaries such as `AI` versus `Airtok` and `Q7`
  versus `Q70`; and
- uses the shared primary-product-type classifier so a secondary mode or
  bundled tool is not mislabeled as the requested product's primary type.

### Wrong-variant safety

The captured standard `Herman Miller Embody Chair` card had accepted the
different `/products/embody-gaming-chair` URL. Asset verification now rejects a
candidate link and image when its product URL path positively proves a
conflicting product type. Tests reproduce that case and an unrelated
pressure-washer-versus-laundry-washer conflict while preserving exact
manufacturer and recognized-retailer product pages.

Tracing the real route found the earlier resolver call used a ranked product
name where it needed the shopper's requested category. The encrypted job token
is now version 2 and carries `productCategory` only inside its authenticated
server payload; the polling route restores it before asset resolution. No new
client-readable data was added.

## Corrective replay

Command: `npm run qa:direct-terra-t8d-replay`

Untracked sanitized output:
`tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-437a682/corrective-replay.json`.
Never stage that directory.

- 8 saved runs and 31/31 ranked products were accounted.
- Historical versus prospective leader hits: 18 versus 19.
- Gas-grill run 2 changes from 2/4 to 3/4 because `Charbroil Performance
  Series` now covers `char-broil / performance`.
- Historical versus prospective wrong-type observations: 2 versus 0.
- Seven missed leaders were explicitly named by Terra but not ranked.
- All 24 retained links were revalidated.
- The one definitive wrong-variant link, Embody Gaming for standard Embody, is
  blocked.
- Six replayed link cases are indeterminate because schema-v1 fixtures never
  saved the original provider titles/candidate identities. They are not
  evidence of either provider absence or a verifier defect.

## Verification

- Unit wall: 1326/1326 across 191 suites.
- Typecheck: pass.
- Lint: zero errors; three pre-existing unused-variable warnings.
- Build: pass.
- Live calls: zero.

RR-093 through RR-096 are Fixed. The register is 96 total: 14 Critical,
44 High, 33 Medium, 5 Low; 89 Fixed, 6 Needs Investigation, 1 Won't Fix,
and 0 Open.

## Next approval boundary

First perform an independent adversarial review of the four code commits and
this documentation closeout. That review should specifically challenge:

1. compact-token equivalence against meaningful model boundaries;
2. URL-path type conflict against valid hybrid and bundle product pages; and
3. encrypted request-category restoration across start, poll, completed,
   expired, and cancelled job paths.

If the review accepts the changes, the smallest useful live validation is one
instrumented run in each of the four frozen T8D categories: four Terra creates
total, not another eight-run sample. Its purpose is to prove that schema v2
separates provider absence from verifier rejection and that the wrong-variant
veto holds on new evidence. Exact hosted-search, retrieve, Serper, page-fetch,
and dollar ceilings must be stated in Taylor's separate approval.

Stop after the review or validation report. No live work is currently
authorized.

**Recommended reasoning level:** High. The review/validation crosses product
identity, safety, and measurement integrity, but its scope is bounded; maximum
reasoning is not necessary.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior handoff reported the corresponding local `.env.local` Direct-Terra
flags enabled. This phase did not read, print, or modify secret values and did
not modify `.env.local`.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, or direct-page request without a new exact
  numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product set, names, order, report, citations, and
  price-estimate caveats during asset/evaluator work.
- No product-, brand-, or category-specific production rule.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.
- Scoped phase files may be committed automatically; external writes still
  require Taylor's explicit authorization.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next step | this file |
| Corrective phase evidence | latest T8D entry in `docs/qa-loop-results.md` |
| Issue resolutions | RR-093 through RR-096 in `docs/RR-Issues-Report.md` |
| Peer-review request | dialogue entry `[105]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Saved live fixtures/replay | untracked OAI-T8D directory above |

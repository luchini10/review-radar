# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after the verifier-v4 live diagnostic stopped at
RR-097/RR-098. Use `git log -1` for the current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off and
undeployed. First-loss schema v2 and verifier v4 ran live on three of the four
approved frozen categories. The window stopped before robot vacuum because the
gas-grill response exposed a shared ranked-heading parser defect.

No retained office-chair or drill asset was identified as a wrong model or
wrong product. The live evidence nevertheless found two generalized defects:

- **RR-097:** Terra may use H1 for valid `#N Best Match` headings, while
  ReviewRadar parses only H2-H4. The gas report contained three full ranked
  products but ReviewRadar produced zero cards, targets, or asset requests and
  an invalid `0/4` recall score.
- **RR-098:** verifier v4 safely rejected possible descriptive siblings but
  also rejected legitimate manufacturer/retailer product pages whenever their
  URL contained ordinary descriptive words not echoed literally in the target.
  Branch Verve consequently lost its website.

RR-097 and RR-098 are High / Needs Investigation. The register is 98 total:
14 Critical, 46 High, 33 Medium, 5 Low; 89 Fixed, 8 Needs Investigation,
1 Won't Fix, and 0 Open.

## Live diagnostic actuals

Harness commit `9e041e0` corrected the stale two-runs-per-category diagnostic
configuration before live dispatch. A focused fail-first test and zero-network
dry run proved four total creates and the approved `$5` ceiling.

The closeout also corrected a no-network testability seam: dry-run preflight no
longer fails merely because commit-pinned live evidence already exists. The
existing-evidence refusal remains mandatory in `--execute` mode, so no
replacement protection was weakened.

The live process completed office chairs, gas grills, and cordless drills:

- 3 Terra/high OpenAI Responses creates;
- 78 retrieves;
- 24 hosted web-search actions;
- 9 Serper Shopping requests;
- 10 Serper organic requests;
- 6 bounded page fetches;
- 0 safety cancels; and
- `$1.594070` estimated OpenAI cost.

There were no retries, replacements, additional cases, SearchAPI calls,
fallbacks, flag changes, `.env.local` changes, deployments, or production
changes. Robot vacuum was not dispatched. Sanitized untracked evidence is at
`tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-9e041e0/`;
`manual-stop.json` records the exact stop and actuals. Never stage that
directory.

Completed case results:

- office chairs: `4/7` prospective recall, five ranked products, four clean
  preferred-host links, five images, zero wrong-type/budget failures;
- cordless drills: `2/4` recall, four ranked products, two clean
  preferred-host links, two images, zero wrong-type/budget failures; and
- gas grills: Terra returned three ranked products, but the ReviewRadar
  parser returned zero; its saved `0/4` score is invalid measurement.

## Root evidence

The earliest gas loss is static and exact:

- `lib/directTerraPrompt.ts:98` asks for a list labeled `#1 Best Match` through
  `#5` without requiring a Markdown depth;
- `lib/directTerraReportOutline.ts:7` and
  `lib/directTerraEvaluation.ts:139` accept only `#{2,4}`;
- `lib/directTerraEvaluation.ts:140-169` closes a product section only at H2;
  and
- `components/DirectTerraReport.tsx:330-346` gives anchor IDs to H2 but not H1.

The office first-loss trace records 23
`product_url_descriptive_identity_conflict` verdicts. Ten are direct
manufacturer-page rejections across Steelcase, Herman Miller, and Haworth.
Page extraction later recovered four safe chair links, but Branch Verve
remained without a website. The current rule at
`lib/directTerraAssetVerifier.ts:459-615` treats every non-allowlisted,
non-opaque path word as sibling identity evidence. Do not repair this by
adding observed product/category words to its finite allowlist.

## Next approval-gated step

Run one zero-live corrective phase in two ordered commits:

1. **RR-097 shared parser correction**
   - establish a fail-first H1 case from the saved gas report;
   - replace the duplicated ranked-heading regexes with one shared H1-H4
     parser;
   - end sections on the next heading of equal or higher depth;
   - align shortlist extraction and rendered heading anchors;
   - preserve duplicate-rank handling and prove H1/H2/H3/H4 plus non-ranked
     boundary controls; and
   - replay the saved gas report locally to prove three products and three
     asset targets without provider calls.
2. **RR-098 generalized descriptive-identity correction**
   - use bounded saved candidate evidence to establish fail-first legitimate
     manufacturer/retailer cases across multiple product families;
   - replace novel-word rejection with positive conflicting identity evidence,
     not an expanded word allowlist;
   - preserve every RR-093 wrong-sibling case plus coded-model, accessory,
     editorial, redirect, private-network, type, and wrong-image gates; and
   - replay all saved T8D evidence with complete first-loss accounting.

After both commits, run focused tests, the complete test wall, typecheck, lint,
build, offline T8D replay, and an adversarial full-diff review. Stop and report.
Do not run the unused robot-vacuum request or a replacement gas request until
Taylor separately approves exact new live ceilings.

**Recommended reasoning level:** High. The parser correction is bounded, but
the verifier change must recover legitimate descriptive product pages without
reopening the Critical wrong-sibling safety class. Maximum reasoning is not
necessary unless the saved evidence cannot support a generalized positive-
conflict rule.

## Approval status

Taylor's four-category live approval was consumed by this safety-stopped
window. Three requests were spent and one was never dispatched. It does not
authorize a replacement gas run, robot-vacuum run, behavior repair, flag
promotion, deployment, or production change.

Scoped local phase files may be committed automatically under Taylor's standing
instruction. A new phase, any live/external call, deployment, production
change, flag promotion, `.env.local` change, or push still requires Taylor's
explicit authorization.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

Earlier handoffs reported local Direct-Terra flags enabled in `.env.local`.
This diagnostic read existing secret values only into the live child process
without printing or modifying them. It did not inspect, print, or change the
file's stored values.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, direct-page, or other external request without
  a new exact numeric approval.
- No replacement for the gas case and no use of the undispatched robot case
  without a new approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product set, names, order, report, citations, and
  price-estimate caveats.
- No product-, brand-, category-, or observed-path-word production exception.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Outstanding review debt

Dialogue entry `[108]` asks Claude to challenge the RR-097 repair order and the
strongest positive-evidence contract for RR-098. That review is advisory and
does not itself authorize work.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| Live diagnostic evidence/result | latest entry in `docs/qa-loop-results.md` |
| Canonical defects | RR-097 and RR-098 in `docs/RR-Issues-Report.md` |
| Peer-review request | dialogue entry `[108]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Live harness pin | commit `9e041e0` |

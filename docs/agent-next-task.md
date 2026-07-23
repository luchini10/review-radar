# ReviewRadar Agent Handoff

Updated: 2026-07-22 by Claude after the T8B asset-source work (photos + links
from the brand site or a popular retailer), implemented and live-validated to
the goal over three commits with Taylor's standing approval to iterate.

## T8C multi-category validation (2026-07-22) — promotion gate

Ran the promotion-gating validation (`scripts/run-oai-t8c-multi-category-validation.mjs`,
committed `d7a2ec2`): 4 frozen non-shop-vac cases x3 runs = 12 Terra calls,
`$6.91`/`$15`, scoring report quality + T8B asset coverage. Evidence untracked at
`oai-t8c-multi-category-validation-d7a2ec2/`; full table in the latest QA entry.

- **Safety: perfect** — 0 wrong-type, 0 over-budget in all 12 runs, all 4
  categories (the non-negotiable promotion gate passes everywhere).
- Recall beats legacy on office chair (3.67/7), gas grill (2.33/4), drill
  (2.33/4); robot vacuum weak (1.33/4). Stability good on chair/grill
  (0.78-0.83), shaky on drill/robot-vac (0.28-0.33).
- Assets: 24/28 links on manufacturer/popular-retailer hosts, all clean; 13/24
  images from the product's own page. Excellent for chairs/robot-vacs, poor for
  gas grills (few targets; one obscure-host link).

**Promotion decision is Taylor's and open.** Defensible to promote (safe
everywhere, net-better than legacy); the conservative path is to fix the soft
spots first (robot-vac recall, drill/robot-vac stability, gas-grill asset
targeting + suppress non-preferred-host links). Both direct-Terra flags remain
default-off in the repo (on in Taylor's local `.env.local`).

## T8B result (2026-07-22) — goal met

Committed, on top of the T8B base `c795346`: `9820b02` (source split),
`58b3419` (approval-parse fix), `1753a0b` (coverage iteration 2),
`ac09903` (iteration 3 — HEAD). Three commit-pinned live integrated smokes;
final `ac09903` scored **4/4 links on manufacturer/popular-retailer hosts,
clean URLs, 4/4 images, 4/4 fully decorated** (DEWALT + Milwaukee took both
link and photo from the brand's own site). Full detail + iteration table in the
latest `docs/qa-loop-results.md` entry; behavior summary in `docs/change-log.md`.

New standalone asset modules: `lib/directTerraLinkPreference.ts`,
`lib/directTerraProductPageFetcher.ts` (both covered by the architecture
boundary test). Known open items (not blockers): (1) pure-numeric SKUs (BAUER
`56579`) and some compound models (Vacmaster `VFB511B 0202`) do not always
become asset targets; (2) Amazon/Home Depot bot-wall page fetches, so those
cards use the exact-product Google thumbnail rather than a page-hosted photo;
(3) run-to-run product variability makes single-run coverage noisy.

Full suite 1303/1303 across 183 suites; typecheck/build/lint clean. Flags
remain default-off; `.env.local` untouched by the code.

## Earlier commit boundary (superseded)

The asset source-split correction was COMMITTED as full commit
`c795346a463df7284ab80ca7a7b3af019974050c` (`Correct Direct-Terra product-asset
source split (organic website + Shopping image)`), on top of base
`5136346ca44df932086017ee22cca759f6b665ac` (`Integrate Direct-Terra product
assets`). Claude independently re-verified before committing (1270/1270 across
180 suites, typecheck/build/lint clean, saved C5 organic replay 3/3, secret scan
clean) and staged exactly the 22 reviewed files; the smoke fixture and all
unrelated artifacts remain untracked.

The scoped working set is:

- `lib/directTerraResponse.ts`
- `lib/directTerraAssetVerifier.ts`
- `lib/directTerraSerperAssetAdapter.ts`
- `lib/directTerraSerperOrganicAdapter.ts`
- `lib/directTerraSerperTransport.ts`
- `lib/directTerraProductAssets.ts`
- `lib/directTerraRecommendationRoute.ts`
- `scripts/run-oai-t8a-integrated-asset-smoke.mjs`
- `tests/directTerraResponse.test.mjs`
- `tests/directTerraCitationWebsiteResolver.test.mjs`
- `tests/directTerraSerperAssetAdapter.test.mjs`
- `tests/directTerraSerperOrganicAdapter.test.mjs`
- `tests/directTerraSerperTransport.test.mjs`
- `tests/directTerraProductAssets.test.mjs`
- `tests/directTerraRoute.test.mjs`
- `tests/directTerraArchitecture.test.mjs`
- `ReviewRadar-Overview.md`
- `docs/forward-roadmap.md`
- `docs/change-log.md`
- `docs/qa-loop-results.md`
- `docs/agent-dialogue.md`
- `docs/agent-next-task.md`

The sanitized integrated-smoke fixture remains untracked at
`tests/fixtures/review-radar-live/oai-t8a-integrated-asset-smoke-5136346/` and
must not be staged. Unrelated `.claude/`, baseline files, historical fixtures,
and `fable-transfer-kit/` also remain untracked. Never use `git add -A`.

## Decisive evidence

The first integrated smoke at `5136346` returned five ranked shop vacs but
created one asset target, accepted one image, and produced zero product
websites. Static replay proved the first loss: optional price observations,
rather than Terra's ranked headings, controlled asset targeting.

Claude correctly connected the zero-website result to C5: Serper Shopping
returns useful thumbnails but commonly exposes Google wrapper destinations,
whereas bounded organic `"<exact identity> product page"` searches can return
direct merchant/manufacturer pages. The implementation adopts that source
split without importing the legacy C5 pipeline.

## Corrected architecture

1. Terra's ranked heading is the primary immutable product identity. A heading
   can produce a target only when it has a coherent brand, strong model, and
   product type. Price-observation identity is a fallback and a conflict veto,
   never a prerequisite.
2. A strict same-response citation in that product's own ranked section is the
   first website source. Its response-owned title must itself prove exact
   brand/model/type identity; URL or manufacturer-host guessing cannot replace
   missing title identity.
3. Only citation-missing targets receive one bounded Serper organic
   `"<brand> <model> <product> product page"` request, at most five. Organic
   rows pass the shared title, type, eligibility, wrapper, URL, and
   `productPageMatchesIdentity` gates before a direct website is exposed.
4. Serper Shopping remains image-only in orchestration. Exact Shopping rows
   may supply a provenance-gated image, but their wrapper or merchant link is
   never used as the card website.
5. Organic websites and Shopping images run as two independent sequential
   lanes, concurrently with one another. Failure in either lane returns a
   nullable asset and cannot alter, remove, add, rename, or reorder Terra's
   recommendations.

The new organic adapter and shared transport are standalone, one-attempt,
no-cache, no-retry, no-fallback boundaries. Requests are fixed to the Serper
organic or Shopping endpoint, use process-supplied server secrets, cap queries
at 180 characters, cap results, and reject malformed/error-bearing responses.
No query, provider row, title, ID, secret, header, raw payload, or diagnostic
enters the public product-asset result.

## Adversarial findings closed

- Headings containing real models plus `4-Burner`, `12-Cup`, `3-Stage`, and
  similar specifications no longer lose their targets; spec-only and
  date-shaped headings still produce no target.
- A price-observation identity that conflicts with the heading suppresses the
  target instead of silently rewriting the ranked product.
- The earlier abbreviated-title manufacturer-URL exception was removed. It
  admitted fake brand-looking hosts, accessory paths, and compound sibling
  model URLs under plausible abbreviated titles.
- Organic results reject accessories, editorial/listing/search pages, Google
  and affiliate wrappers, local/private destinations, sibling models, and
  title/URL identity disagreement.
- Any non-null provider `error`, including an object-shaped error, fails both
  Shopping and organic payloads closed.
- Organic query generation now shares the transport's exact 180-character
  ceiling; the two independent provider lanes start concurrently to avoid
  unnecessary serial latency.

## Verification

- focused Direct-Terra wall: 92/92 across 10 suites;
- complete unit wall: 1270/1270 across 180 suites;
- `npm run typecheck`: pass;
- `npm run lint`: zero errors and three pre-existing warnings;
- `npm run build`: pass;
- integrated smoke dry-run v2: pass, zero network; and
- saved C5 organic replay: 3/3 previously proven exact product pages recovered
  by the new standalone adapter, zero network; and
- `git diff --check`: pass before the final documentation refresh.

## Flag state

Committed defaults in `.env.example` remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior classified local `.env.local` state remains:

- direct-Terra server flag: on
- direct-Terra client flag: on
- constraint allocation: on

This phase neither read nor changed `.env.local`. No provider call, push,
deployment, publication, flag promotion, or production change occurred.

## Next approval-gated decision

The scoped commit (`c795346`) and the approved commit-pinned live integrated
smoke are both DONE. The smoke PASSED its lifecycle/contract/ceilings ($0.4209
of $7, 1 create / 16 retrieves / 3 Shopping / 1 organic, 0 fallbacks). Terra
ranked 3 shop vacs; coverage was **buy-links 3/3** (all real merchant product
pages — Amazon/Home Depot/Lowe's, the 0/5 wrapper gap now closed), **images
1/3** (opaque provenance-gated Shopping thumbnail; the other two fail-closed),
fully decorated 1/3. Full audit in the latest `docs/qa-loop-results.md` entry
and dialogue `[101]`. Evidence untracked at
`oai-t8a-integrated-asset-smoke-c795346/`.

Two open items surfaced (both are Codex's next zero-live decision, per
dialogue `[101]`):
1. Strip the tracking query and confirm identity on the RIDGID Home Depot link
   `/p/304795082?MERCH=…pip_alternatives…` — real product page, matched on the
   organic title, but a bare product-id URL from an alternatives widget.
2. Raise image coverage without loosening the Shopping title-identity gate —
   the coherent option is taking the image from the already-resolved organic
   product page (one identity for image+link), which needs a bounded direct-page
   fetch the current image lane forbids; this is a design decision, not a tweak.

This was one category / one run with only 3 ranked products; generality and the
"Terra returns 5" case are unproven. Any further live run (e.g. a small multi-
category coverage sample) remains separately commit-pinned and approval-gated.
A pass is evidence for a later deployment decision, not authority to promote
flags or deploy.

**Recommended reasoning level:** Medium for the mechanical scoped commit
because the high-reasoning adversarial review and full wall are complete. High
for the later live smoke because it requires identity-by-identity coverage and
ledger auditing.

## Hard boundaries

- No provider request without new exact numeric approval pinned to the new
  reviewed full commit.
- No commit, push, deployment, publication, feature-flag promotion,
  `.env.local` edit, or production change without separate approval.
- Preserve Terra's immutable recommendation identity, name, rank, report, and
  order.
- Preserve citation ownership, disabled-source behavior, purchase caveats,
  market-price-estimate language, and every existing asset trust gate.
- Never expose or persist keys, headers, private queries, provider IDs, raw
  provider rows/responses, source titles, or server-only diagnostics.
- Do not delete legacy, two-layer, SearchAPI-history, or Serper code without
  rollback evidence and explicit retirement approval.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current phase, boundaries, and next decision | this file |
| Current asset architecture | `ReviewRadar-Overview.md` |
| Canonical verification evidence | latest `docs/qa-loop-results.md` entry |
| Plain-English behavior change | latest `docs/change-log.md` entry |
| Phase rationale and source split | T8A section in `docs/forward-roadmap.md` |
| Peer-agent conclusion | latest `docs/agent-dialogue.md` entry |
| Saved first-smoke evidence | untracked `oai-t8a-integrated-asset-smoke-5136346/` |

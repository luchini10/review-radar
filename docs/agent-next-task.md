# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the OAI-T8D eight-run live first-loss
diagnostic. The live harness is pinned to `437a682`; use `git log -1` for the
current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off. No production
behavior, prompt, UI, flag, `.env.local`, deployment, or production setting
changed in OAI-T8D. The phase added observability, ran an approved diagnostic,
and stopped because the live evidence exposed both a real wrong-variant link
and gaps in the diagnostic/evaluation instruments.

## OAI-T8D live window — completed

Taylor approved eight research requests: two runs in each frozen category.
Commit `437a682` pins the exact harness and ceilings.

- Terra creates: 8/8 completed;
- retrieves: 232;
- hosted search actions: 75;
- Serper Shopping requests: 31;
- Serper organic requests: 38;
- bounded product-page fetches: 20;
- estimated OpenAI cost: `$4.529444` under the `$10` ceiling;
- wall time: 1,317,802 ms; and
- retries, replacements, fallback runs, and extra cases: zero.

Sanitized untracked evidence:
`tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-437a682/`.
Never stage that directory.

## Results

Recommendation scores as originally frozen:

| Case | Recall runs | Leader stability | Ranked counts |
|---|---:|---:|---:|
| Office chair | `4/7`, `3/7` | `0.75` | `5`, `5` |
| Gas grill | `2/4`, `2/4` | `1.0` | `4`, `4` |
| Cordless drill | `3/4`, `1/4` | `0.3333` | `5`, `3` |
| Robot vacuum | `0/4`, `3/4` | `0.0` | `2`, `3` |

No price-estimate budget violation was recorded. The raw scorer reported two
wrong-type hits, but RR-094 proves both are lexical false positives caused by
secondary/bundled terms rather than clearly wrong primary products.

Across 31 ranked products, the asset path produced:

- 24 clean manufacturer/popular-retailer links;
- 19 images;
- 14 page-derived images; and
- 18 cards with both a link and an image.

Every ranked product was accounted for. Seven missing links were labeled
`identity_verification_rejected`, but RR-096 means that label is not yet
decision-grade: aggregate reason counts do not retain enough candidate identity
to distinguish a correct result rejected by ReviewRadar from a provider result
set containing only wrong products.

## Issues filed

- **RR-093 Critical:** the standard `Herman Miller Embody Chair` card linked to
  the different `/products/embody-gaming-chair` manufacturer variant.
- **RR-094 High:** wrong-type evaluation treats hybrid functionality or bundled
  products as the primary product type.
- **RR-095 High:** `Charbroil` fails to match punctuation-equivalent benchmark
  brand `char-broil`, corrupting recall and first-loss attribution.
- **RR-096 High:** first-loss diagnostics omit bounded candidate identity and
  ignore explicitly named non-ranked/Close Match products.

The register is 96 total: 14 Critical, 44 High, 33 Medium, 5 Low; 85 Fixed,
10 Needs Investigation, 1 Won't Fix, and 0 Open.

## Next approval-gated step

Run one zero-live corrective phase, in separate reviewable commits:

1. **Diagnostic contract:** retain bounded normalized provider-candidate
   identity evidence and parse explicitly named non-ranked products from
   Terra's report. Keep provider IDs, secrets, full URLs, raw rows, and all
   diagnostics out of client responses.
2. **Evaluation contract:** version a generalized punctuation/spacing
   equivalence matcher and contextual wrong-type evaluation. Preserve the
   historical scores and report both old and corrected results.
3. **Safety boundary:** add fail-first cross-category tests for RR-093 and apply
   a generalized candidate-only descriptive variant/type conflict veto without
   weakening coded-model, sibling, accessory, editorial, redirect, or image
   protections.
4. Replay all eight saved T8D fixtures, run the complete verification wall,
   adversarially inspect the diff, and automatically commit the completed
   zero-live phase.

Stop and report after that zero-live phase. No new live validation is justified
until replay gives honest first-loss attribution and zero wrong-variant links.

**Recommended reasoning level:** High. The work crosses evaluation integrity
and the product-identity safety boundary, but it is bounded and does not require
maximum reasoning.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior handoff reported the corresponding local `.env.local` flags enabled.
OAI-T8D loaded only OpenAI and Serper secrets into the live harness process and
did not modify `.env.local`.

## Hard boundaries

- No further OpenAI, Serper, SearchAPI, or direct-page request without a new
  exact numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product set, names, order, report, citations, and
  price-estimate caveats during asset/evaluator repairs.
- No product-, brand-, or category-specific production rule.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next step | this file |
| Canonical live result | latest OAI-T8D entry in `docs/qa-loop-results.md` |
| Issue details | RR-093 through RR-096 in `docs/RR-Issues-Report.md` |
| Peer-review request | dialogue entry `[104]` |
| Phase plan/history | OAI-T8D in `docs/forward-roadmap.md` |
| Live fixtures | untracked OAI-T8D directory above |

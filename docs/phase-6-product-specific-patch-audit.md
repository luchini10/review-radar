# Phase 6 Product-Specific Patch Audit

**Phase:** 6C  
**Date:** 2026-07-02  
**Mode:** Static audit, zero live calls, no production behavior changes  
**Verdict:** **PASS WITH WATCH ITEMS**

## Purpose

Prove that the current ReviewRadar production tree does not branch, score, rank,
search, validate, or attach evidence differently for one named product or model
where a shared mechanism should apply.

Product and source names are not automatically defects. The audit distinguishes
legitimate shared registries and source adapters from product-shaped control
flow.

## Scope

Audited all 61 tracked production TypeScript/JavaScript files:

- 57 files under `lib/`;
- 2 API modules under `app/api/`;
- `app/page.tsx` and `app/layout.tsx`, because they affect recommendation input
  or product-card presentation.

No test, fixture, script, generated baseline, documentation example, or
untracked local artifact was treated as production logic.

## Method

1. Confirmed the tracked worktree was clean and inventoried the known untracked
   `.claude/`, generated baselines, and 22 live fixtures.
2. Verified commit `ccb37a8` changed only the Phase 6 master and next-task
   documentation.
3. Verified the issue register contains 68 unique IDs: 63 Fixed, 4 Needs
   Investigation, 1 Won't Fix, and 0 Open.
4. Enumerated all tracked production modules rather than auditing only recently
   edited files.
5. Reviewed the 62 production-touching commits since 2026-06-20 to identify the
   mechanisms most likely to contain Phase 5 patch residue.
6. Searched for issue-specific brands, products, models, retailers, and model
   token shapes across production code.
7. Searched conditionals and scoring paths for brand, category, host, retailer,
   product, title, and model comparisons.
8. Inventoried hard-coded domains: 618 occurrences, 207 unique domains, across
   20 production files; each behavioral cluster was inspected in context.
9. Verified production code does not import tests, fixtures, gold benchmarks,
   Phase 6 reports, issue IDs, or leader snapshots.
10. Inspected each suspicious hit to determine whether it changes product
    behavior for one named item or implements a shared data/rule mechanism.

## Findings

| # | File / location | Token or rule | Classification | Rationale | Required action |
|---|---|---|---|---|---|
| 1 | `lib/brandMatching.ts` | 34 canonical brand definitions and aliases, including platform-family aliases | Acceptable generalized data | A generic loop consumes one registry for brand extraction, requirement matching, and source identity. No product receives a score or branch because of its model. | Preserve as shared data; keep alias collision tests. |
| 2 | `lib/brandMatching.ts`; `lib/requirementEvidenceRescue.ts` | Explicit `HP` handling | Acceptable generalized data | This resolves the global collision between the Hewlett-Packard brand and the horsepower unit. It applies across product categories and source candidates, not to one HP product. | Keep centralized; do not spread additional one-brand conditionals outside the shared collision helper. |
| 3 | `lib/productTypeIntent.ts` | CrossWave, HydroVac, Floor One, and FloorMate family terms inside `HOUSEHOLD_FLOOR_CLEANER_PATTERN` | Acceptable generalized data | The terms are a cross-brand family dictionary combined with generic floor-washer/vacuum-mop signals and consumed by the shared product-type classifier. There is no product-specific score or result override. | Preserve shared taxonomy and cross-brand positive/negative tests. |
| 4 | `lib/productEvidenceIdentity.ts` | Protein, flavor, recipe-base, life-stage, shade/color, and numeric-series dictionaries | Acceptable generalized data | Shared variant-conflict logic protects food, supplements, cosmetics, and electronics. No named product or recipe receives unique behavior. | Preserve as shared evidence-identity data. |
| 5 | `lib/categoryProfiles.ts`; `lib/specDictionary.ts`; `lib/smartFeatureCategory.ts`; `lib/smartFeatureSuggestions.ts`; `lib/priceParsing.ts`; `lib/productTypeIntent.ts` | Category vocabularies, spec registries, smart-feature options such as Sony E/Canon RF mounts, and category price plausibility floors | Acceptable generalized data | These are category-level registries used through generic selection/evaluation loops. Thresholds and terms apply to classes of products, not named SKUs. | Preserve config-driven structure; require cross-category tests for future additions. |
| 6 | `lib/search/sourcePacks.ts`; `lib/search/sourceTier.ts`; `lib/productCredibility.ts`; `lib/recommendationScoring.ts`; `lib/productCardViewModel.ts`; `lib/researchPrompt.ts` | Editorial, manufacturer, retailer, marketplace, and community domain tables | Acceptable source/category rule | Source identity and category source packs legitimately depend on domains. The rules classify evidence roles and search sources rather than favoring a named product. | Preserve as source data; do not convert source placement into product identity. |
| 7 | `lib/productEligibility.ts`; `lib/productPageUrl.ts`; `lib/recommendationResultValidation.ts`; `lib/requirementValidation.ts`; `lib/search/serper.ts` | Retailer/publisher-specific product-detail, category, search, support, and editorial URL shapes | Acceptable source/category rule | URL structures differ by provider, so narrow host/path adapters are appropriate. They protect a shared product-card boundary and retain product-specific identity checks. | **Watch item:** duplicated route knowledge can drift. Future changes should update all relevant boundaries and their shared regression tests. |
| 8 | `lib/search/serper.ts`; `lib/productImageResolver.ts` | Google Shopping offer shape and provider-specific image/asset patterns | Acceptable source/category rule | These rules recognize provider protocols and asset classes. Google offer eligibility still passes through product identity; image rules reject navigation/marketing assets rather than selecting a named product. | Preserve existing identity and image-safety gates. |
| 9 | `lib/search/sourcePacks.ts`; `lib/search/serper.ts` | Home Depot/Walmart direct retailer adapters | Acceptable source/category rule | These are bounded provider adapters selected by category source packs. They do not contain product/model exceptions or scoring bonuses. | Preserve adapter boundary; new engines require generalized evidence. |
| 10 | `app/api/recommendations/route.ts`; `lib/requirementEvidenceRescue.ts`; `lib/search/serper.ts` | Amazon/Home Depot timeout, RIDGID/Makita host, Weber/Traeger/DeWalt/WD4080, and Amazon Prime examples in comments | Suspicious but non-behavioral | The names occur only in explanatory comments. They do not feed conditionals, searches, scores, identity, or output. | No behavior action. Prefer neutral examples when comments are next rewritten. |

## Classification summary

| Classification | Count |
|---|---:|
| Acceptable generalized data | 5 |
| Acceptable source/category rule | 4 |
| Suspicious but non-behavioral | 1 |
| Must-generalize blocker | 0 |

## Negative findings

- No issue-specific model token from the Phase 3-5 cases appears in executable
  production logic.
- The issue-model sweep found only CrossWave/HydroVac/Floor One/FloorMate, all
  inside the shared cross-brand household-floor-cleaner taxonomy.
- No product/model/brand-specific score adjustment exists in
  `lib/recommendationScoring.ts` or final-selection logic.
- No leader list, gold benchmark, fixture, issue ID, or Phase 6 scorecard is
  imported by production code.
- No production branch mentions DEWALT DXV10SB, Makita XCV11Z, RIDGID WD1450,
  Tapo RV30C, Napoleon Rogue, Samsung Bespoke, FEIN, VIOFO A229 Pro, RIDGID
  HD0900/VAC1200/WD4522, Whynter RPD models, DiamondClean models, M27Q, or the
  source-upgrade safety-test SKUs.
- No product-specific production workaround was added by Phase 6B; its only
  code changes were test assertions.

## Watch items

1. Product-page and non-product-page host/path rules are intentionally repeated
   at discovery, citation verification, primary-link selection, and final
   validation boundaries. This is defense in depth, but additions can drift if
   only one boundary is updated.
2. `HP` is a justified brand/unit collision exception. Future ambiguous aliases
   should be handled through a shared collision-data mechanism rather than a
   growing chain of brand-specific branches.
3. Named floor-cleaner families are justified cross-brand taxonomy data. A
   future entry should include generic type evidence and unrelated controls,
   not become a one-product denylist.

These are maintenance risks, not current behavior defects. No issue was opened
or reclassified.

## Must-generalize blockers

None.

Phase 6C process gate `G2` is green.

## Acceptable rules worth preserving

- Shared brand aliases with measurement/provenance disambiguation.
- Shared product-type taxonomy with cross-brand and generic signals.
- Variant-conflict dictionaries for recipes, flavors, shades, and numeric
  series.
- Category-driven spec, smart-feature, and plausible-price registries.
- Source-tier and category source-pack data.
- Narrow provider URL/offer/image adapters behind common eligibility and
  identity gates.
- Separation of query, host, seller, retailer, and URL-parameter provenance
  from product identity.

## Proposed automation - requires approval

No script, package command, lint rule, or executable tripwire was added.

A future approved AST-aware audit could:

- flag product/model string literals used directly in `if`, ternary, scoring,
  rank, or selection expressions;
- allow literals declared in reviewed registries such as brand aliases,
  product-type vocabularies, source packs, spec dictionaries, and smart-feature
  catalogs;
- flag production imports from tests, fixtures, benchmark snapshots, or Phase 6
  measurement artifacts;
- emit a review list for new host-specific URL branches;
- compare duplicated product-page route rules across discovery, validation, and
  primary-link modules;
- run as a static process gate without adding a brittle product-token denylist.

Implementation requires explicit approval in a later phase.

## Verification

```text
npm run typecheck: pass
npm run lint: 0 errors, 3 existing warnings
npm test: 782/782 pass across 117 suites
node scripts/eval-pipeline.mjs: no red-flag issues
```

These checks prove the repository remained green after a documentation-only
audit. The static source review, not the test run, establishes process gate
`G2`.

## Final verdict

**PASS WITH WATCH ITEMS.**

The current production tree contains no unresolved must-generalize blocker.
Phase 5 and Phase 6B did not leave a product-specific production patch that
blocks Phase 6D. The watch items concern maintainability and future drift, not
current unsafe product-shaped behavior.

Phase 6D may begin only after explicit approval of its six-search variance
pilot. Phase 6C itself used zero live calls.

# Phase 6 Regression Wall

**Phase:** 6B  
**Date:** 2026-07-01  
**Scope:** RR-007 through RR-068  
**Mode:** Zero-live-call, no-production-behavior regression audit

This document is the Phase 6 index from each applicable issue to its current protection. It distinguishes deterministic regressions from measurements that require saved-fixture reassessment, repeated runs, or provider coverage. It does not claim that a deterministic test proves live provider quality.

## Audit summary

- Issue-register total: **68** unique issues (`RR-001` through `RR-068`).
- Phase 6B wall range: **62** issues (`RR-007` through `RR-068`).
- Statuses in wall range: **57 Fixed**, **4 Needs Investigation**, **1 Won't Fix**.
- Severities in wall range: **7 Critical**, **25 High**, **25 Medium**, **5 Low**.
- Deterministic test modules inventoried: **64** top-level `tests/*.test.mjs` files.
- Tracked distilled fixture: `tests/fixtures/robot-vacuum-synthetic.json`.
- Local live fixtures and generated baselines were inventoried but were not read as current truth, modified, or committed.
- True deterministic gaps found: **2** (`RR-012`, `RR-025`).
- True deterministic gaps closed in Phase 6B: **2**.
- Behavior gaps requiring a later fix phase: **0**.
- Measurement/provider-bound items retained: **RR-014, RR-015, RR-037, RR-045**.

## Classification key

| Classification | Meaning |
|---|---|
| Deterministic protection | Current behavior is directly or closely protected by a repeatable test. |
| Current-code fixture reassessment | A saved, distilled fixture is replayed through current diagnostic logic; historical output alone is not treated as current behavior. |
| Measurement-only | The issue is an aggregate quality/stability outcome that cannot be closed by a unit regression. |
| Provider-variance-bound | The unresolved fact depends on live candidate/provider coverage and must not be inferred from unit tests. |
| Historical/docs guard | The issue concerned operating guidance or an explicit command guard rather than recommendation behavior. |
| Won't Fix / compatibility | The accepted behavior is graceful compatibility, not fixture rewriting. |

## RR-ID wall

| ID | Short mechanism | Severity | Status | Wall classification | Existing protection | Confidence | Gap status / notes |
|---|---|---:|---|---|---|---|---|
| RR-007 | Category/listing pages rendered as product cards | High | Fixed | Deterministic protection | `productEligibility.test.mjs`; `productPageUrl.test.mjs`; `recommendationResultValidation.test.mjs`; `serper.test.mjs` | High | Closed existing. Retailer/manufacturer catalog, family, browse, search, and opaque collection shapes are negative cases; specific product pages are positives. |
| RR-008 | Review/article pages rendered as product cards | High | Fixed | Deterministic protection | `productEligibility.test.mjs`; `productPageUrl.test.mjs`; `recommendationResultValidation.test.mjs`; `serper.test.mjs` | High | Closed existing. Editorial evidence remains secondary only. |
| RR-009 | Manual/support/documentation pages rendered as cards | High | Fixed | Deterministic protection | `productEligibility.test.mjs`; `productPageUrl.test.mjs`; `recommendationResultValidation.test.mjs`; `serper.test.mjs` | High | Closed existing. Manual, quick-start, support, and documentation mirrors are blocked as primary cards. |
| RR-010 | Same-model dedupe collapsed distinct sizes | Medium | Fixed | Deterministic protection | `productIdentity.test.mjs`; `productVariantFamily.test.mjs`; `finalSelectionDiversity.test.mjs` | High | Closed existing. Exact models collapse while size variants remain distinct. |
| RR-011 | Alternative required brands were not parsed | Medium | Fixed | Deterministic protection | `requirementExtraction.test.mjs` | High | Closed existing. `"Sony or Bose"` retains both brand constraints. |
| RR-012 | Raw schema availability tokens reached UI | Low | Fixed | Deterministic protection | `productCardViewModel.test.mjs` | High | **Closed in 6B.** Added direct `LimitedAvailability` formatting regression. |
| RR-013 | Thin self/retailer evidence crowded out stronger support | Medium | Fixed | Deterministic protection | `citationStrengthRanking.test.mjs`; `recommendationScoring.test.mjs`; `replayFixtures.test.mjs`; ranking A/B history | High | Closed existing. Bounded citation-strength preference remains separate from trust gates. |
| RR-014 | Low known-leader coverage | High | Needs Investigation | Measurement-only + current-code fixture reassessment | `goldBenchmark.test.mjs`; `replayFixtures.test.mjs`; `scripts/eval-pipeline.mjs`; Phase 6 scorecard | Medium | No deterministic behavior gap. Requires Phase 6 measurements; unit tests cannot establish live leader recall. |
| RR-015 | Poor run-to-run result stability | High | Needs Investigation | Measurement-only | `scripts/qualityConsistencyHarness.mjs`; Phase 6 scorecard/variance design | Medium | No deterministic behavior gap. Requires controlled repeated runs and variance analysis. |
| RR-016 | Text-only prices prevented exact matches | Critical | Fixed | Deterministic protection | `productPriceTrust.test.mjs`; `requirementValidation.test.mjs`; `priceParsing.test.mjs` | High | Closed existing. Specific plausible text prices remain budget-usable with verification labeling. |
| RR-017 | Wrong product types survived into ranking | High | Fixed | Deterministic protection | `productTypeIntent.test.mjs`; `productTypeMatch.test.mjs`; `requirementValidation.test.mjs`; `serper.test.mjs` | High | Closed existing across multiple substitution classes. |
| RR-018 | Credibility weakness was penalized repeatedly | High | Fixed | Deterministic protection | `credibilityPenalty.test.mjs`; `recommendationScoring.test.mjs` | High | Closed existing. Credibility contribution is bounded. |
| RR-019 | Rescue query used descriptive prose instead of identity | Medium | Fixed | Deterministic protection | `requirementEvidenceRescue.test.mjs`; `sourceQualityUpgrade.test.mjs` | High | Closed existing. Rescue searches use compact product identity. |
| RR-020 | Rubric matching used unsafe substrings | Medium | Fixed | Deterministic protection | `buyingRubric.test.mjs` | High | Closed existing. Whole-word matching is protected. |
| RR-021 | Brand-led seed product names were discarded | High | Fixed | Deterministic protection | `seedProductNames.test.mjs` | High | Closed existing, including rejection of bare brands without model identity. |
| RR-022 | Valid product leaders were dropped during citation verification | High | Fixed | Deterministic protection | `recommendationResultValidation.test.mjs`; `productPageUrl.test.mjs`; `productEvidenceIdentity.test.mjs` | High | Closed existing. Specific product pages survive; weak/generic evidence cannot become product proof. |
| RR-023 | Tracking/trailing-slash URL variants evaded normalization | Medium | Fixed | Deterministic protection | `recommendationResultValidation.test.mjs`; `productPageUrl.test.mjs` | High | Closed existing. Equivalent product URLs normalize and dedupe. |
| RR-024 | Old live fixtures lack newer debug fields | Low | Won't Fix | Won't Fix / compatibility | `replayFixtures.test.mjs`; `recommendationApiContract.test.mjs` | High | Accepted design. Old fixtures degrade gracefully; they are not rewritten as current evidence. |
| RR-025 | Funnel omitted near matches after requirement filtering | Medium | Fixed | Deterministic protection | `discoveryImprovements.test.mjs` | High | **Closed in 6B.** Added direct assertion that `afterRequirementFilter.near` retains a budget-unverified near match while `names` stays empty. |
| RR-026 | Price wording poisoned nearby spec direction | High | Fixed | Deterministic protection | `specExtraction.test.mjs` | High | Closed existing for `"under $600 4-burner"` and related windows. |
| RR-027 | Max constraints displayed as ambiguous “under” labels | Low | Fixed | Deterministic protection | `specExtraction.test.mjs` | High | Closed existing. Max labels render as `at most`. |
| RR-028 | Robot-vacuum type rule was missing | Critical | Fixed | Deterministic protection | `productTypeIntent.test.mjs`; `requirementValidation.test.mjs`; `serper.test.mjs` | High | Closed existing. Wrong vacuum types are blocked while valid sparse-name robots can be verified. |
| RR-029 | Sparse-name type checks ignored supporting evidence | Medium | Fixed | Deterministic protection | `productTypeIntent.test.mjs`; `requirementValidation.test.mjs` | High | Closed existing. Allowed checks can use source-derived narrative while blocked checks remain conservative. |
| RR-030 | Product type lacked pass/fail/unverified separation | High | Fixed | Deterministic protection | `requirementValidation.test.mjs`; `productTypeIntent.test.mjs` | High | Closed existing. Unknown type becomes near/needs verification; confirmed mismatch is excluded. |
| RR-031 | Gas-fuel aliases failed valid propane/natural-gas products | High | Fixed | Deterministic protection | `requirementValidation.test.mjs`; `semanticMatching.test.mjs` | High | Closed existing with generalized fuel aliases. |
| RR-032 | Source-upgrade trigger never fired | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing. Weak-evidence eligible candidates trigger; strongly supported candidates skip. |
| RR-033 | Same-brand subdomains prevented external-source upgrade | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `brandMatching.test.mjs` | High | Closed existing. Shared corporate/brand hosts do not incorrectly count as independent product proof. |
| RR-034 | Model extraction missed word-plus-number series | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing, including `Rogue 525`. |
| RR-035 | Model extraction missed descriptive/FEIN families | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing, including Samsung Bespoke and FEIN family forms. |
| RR-036 | Upgrade failures lacked enough information to locate the layer | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `serper.test.mjs`; `replayFixtures.test.mjs` | High | Closed existing by query, provider, normalization, eligibility, identity, and attachment trace fields. |
| RR-037 | RIDGID target absent from a live candidate pool | Low | Needs Investigation | Provider-variance-bound | Historical live fixture/docs; Phase 6 variance measurements | Low | No deterministic behavior gap. Candidate-pool presence requires approved repeated live measurement. |
| RR-038 | Trace could not distinguish empty search from rejection | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `serper.test.mjs`; `replayFixtures.test.mjs` | High | Closed existing. Counts and no-match reasons distinguish stages. |
| RR-039 | Source-upgrade query reused a long display title | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing with compact identity query tests. |
| RR-040 | Query duplicated category wording | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing. Fallback adds category context without duplication. |
| RR-041 | Upgrade eligibility/trigger was unreliable | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `recommendationApiContract.test.mjs` | High | Closed existing. Trigger/skip decisions and reasons are tested. |
| RR-042 | Upgrade fallback did not recover safely | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `replayFixtures.test.mjs` | High | Closed existing. One bounded fallback is traced and preserves identity gates. |
| RR-043 | Product-type taxonomy missed substitution classes | High | Fixed | Deterministic protection | `productTypeIntent.test.mjs`; `productTypeMatch.test.mjs`; `requirementValidation.test.mjs`; `serper.test.mjs` | High | Closed existing across unrelated categories. |
| RR-044 | Model token minimum length rejected short valid families | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing, including brand-qualified `M18`. |
| RR-045 | Tapo shopping-provider coverage is unconfirmed | Medium | Needs Investigation | Provider-variance-bound | Historical fixture/docs; Phase 6 focused provider measurements | Low | No deterministic behavior gap. Requires approved live provider coverage evidence. |
| RR-046 | Scorecard cost was underestimated and unguarded | Low | Fixed | Historical/docs guard | `scripts/qualityScorecard.mjs`; `docs/review-radar-test-memory.md`; `docs/phase-6-live-search-batches.md` | Medium | No recommendation regression gap. Explicit mode, dry-run planning, and high-call confirmation are operating guards. |
| RR-047 | Compact upgrade identity dropped a detected brand | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `brandMatching.test.mjs` | High | Closed existing. Brand plus model is retained without title noise. |
| RR-048 | Specific Google Shopping offers were rejected as search pages | High | Fixed | Deterministic protection | `serper.test.mjs`; `sourceQualityUpgrade.test.mjs` | High | Closed existing. Offer mode is narrow and still requires same-product identity. |
| RR-049 | `Shop-Vac` brand titles hit the generic “shop” rule | Medium | Fixed | Deterministic protection | `serper.test.mjs`; `productEligibility.test.mjs` | High | Closed existing. Specific brand products pass while generic shop/category titles remain blocked. |
| RR-050 | Trace conflated raw provider output with normalization loss | Medium | Fixed | Deterministic protection | `serper.test.mjs`; `sourceQualityUpgrade.test.mjs`; `replayFixtures.test.mjs` | High | Closed existing. Raw, structural, eligible, returned, identity, and attachable counts are distinct. |
| RR-051 | Generated query fallback text polluted identity | High | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `discoveryImprovements.test.mjs` | High | Closed existing. Query-derived text is excluded from identity evidence. |
| RR-052 | Horsepower `HP` was detected as Hewlett-Packard | High | Fixed | Deterministic protection | `brandMatching.test.mjs`; `sourceQualityUpgrade.test.mjs` | High | Closed existing. Measurement context cannot create HP brand identity. |
| RR-053 | URL query parameters supplied target identity | Critical | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `productEvidenceIdentity.test.mjs` | High | Closed existing. Search/query/tracking parameters cannot satisfy product identity. |
| RR-054 | Fresh fallback responses omitted current diagnostics | Medium | Fixed | Deterministic protection | `recommendationApiContract.test.mjs`; `replayFixtures.test.mjs` | High | Closed existing. Debug fallbacks preserve stage, upgrade, selection, rejection, and timing data; non-debug shape stays clean. |
| RR-055 | Literal positive requirements such as Portable failed | High | Fixed | Deterministic protection | `requirementValidation.test.mjs`; `requirementExtraction.test.mjs` | High | Closed existing with source-derived title/URL evidence positives and mismatch negatives. |
| RR-056 | Final seven over-concentrated one product family | Medium | Fixed | Deterministic protection | `finalSelectionDiversity.test.mjs`; `rankingQuality.test.mjs` | High | Closed existing. Bounded family concentration logic preserves legitimate options. |
| RR-057 | Measurement text outranked a real model token | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing. Amp/MPH/CFM/HP measurements do not become model identity. |
| RR-058 | Same-brand wrong-product evidence passed without model proof | Critical | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `productTypeMatch.test.mjs` | High | Closed existing. Type agreement is the primary guard; same brand alone is insufficient. |
| RR-059 | Niche form factors dominated broad-intent results | Medium | Fixed | Deterministic protection | `formFactor.test.mjs`; `finalSelectionDiversity.test.mjs`; `finalSelectionTrace.test.mjs` | High | Closed existing. Broad-intent adjustment is bounded and traceable. |
| RR-060 | Exact duplicates occupied multiple final slots | Medium | Fixed | Deterministic protection | `productIdentity.test.mjs`; `finalSelectionDiversity.test.mjs`; `discoveryImprovements.test.mjs` | High | Closed existing. Cross-source same-model duplicates collapse deterministically. |
| RR-061 | Non-image/irrelevant assets became product images | Medium | Fixed | Deterministic protection | `productImageResolver.test.mjs`; `productAssets.test.mjs`; `discoveryImprovements.test.mjs` | High | Closed existing. Invalid pages, logos, placeholders, trackers, and weak thumbnails are rejected while contextual CDN images survive. |
| RR-062 | Unscoped same-page price metadata attached to target | High | Fixed | Deterministic protection | `productAssets.test.mjs`; `productPriceTrust.test.mjs`; `priceParsing.test.mjs` | High | Closed existing. Product binding and explicit minor-unit semantics are required. |
| RR-063 | Wrong recipe/flavor/formula citations supported a card | High | Fixed | Deterministic protection | `productEvidenceIdentity.test.mjs`; `recommendationResultValidation.test.mjs`; `productPageUrl.test.mjs` | High | Closed existing across food, supplement/cosmetic, and electronics variant shapes. |
| RR-064 | Nearby model/series source-upgrade evidence attached | Critical | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `productIdentity.test.mjs` | High | Closed existing. Explicit model conflicts reject evidence. |
| RR-065 | Retailer-name token enabled wrong-product identity | Critical | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `productEvidenceIdentity.test.mjs`; `brandMatching.test.mjs` | High | Closed existing. Retailer/source labels cannot impersonate product brand/model evidence. |
| RR-066 | Same-brand/same-type evidence passed without model agreement | Critical | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs` | High | Closed existing. Reliable target model requires source-derived model support. |
| RR-067 | Conflicting candidate brand metadata rejected exact evidence | Medium | Fixed | Deterministic protection | `sourceQualityUpgrade.test.mjs`; `brandMatching.test.mjs` | High | Closed existing. Source-derived exact identity wins over polluted metadata without weakening conflict checks. |
| RR-068 | Household wet floor cleaners passed as shop vacs | High | Fixed | Deterministic protection | `productTypeIntent.test.mjs`; `productTypeMatch.test.mjs`; `requirementValidation.test.mjs`; `serper.test.mjs` | High | Closed existing. CrossWave/FloorMate/HydroVac shapes are blocked for shop-vac intent and remain valid for floor-cleaner intent. |

## Required mechanism wall

| Mechanism | Primary deterministic wall |
|---|---|
| Non-product pages as cards | `productEligibility.test.mjs`, `productPageUrl.test.mjs`, `recommendationResultValidation.test.mjs`, `serper.test.mjs` |
| Unsafe product proof from article/support/manual pages | `recommendationResultValidation.test.mjs`, `productEvidenceIdentity.test.mjs`, `productEligibility.test.mjs` |
| Wrong model, series, recipe, flavor, or formula evidence | `sourceQualityUpgrade.test.mjs`, `productEvidenceIdentity.test.mjs`, `productIdentity.test.mjs` |
| Query, URL-parameter, retailer, or generated-text identity pollution | `sourceQualityUpgrade.test.mjs`, `discoveryImprovements.test.mjs`, `brandMatching.test.mjs` |
| Suspicious tiny full-product prices | `productPriceTrust.test.mjs`, `priceParsing.test.mjs`, `requirementValidation.test.mjs` |
| Unscoped same-page prices and unsafe minor-unit parsing | `productAssets.test.mjs`, `productPriceTrust.test.mjs` |
| Exact duplicates and family flooding | `productIdentity.test.mjs`, `productVariantFamily.test.mjs`, `finalSelectionDiversity.test.mjs` |
| Niche form-factor domination | `formFactor.test.mjs`, `finalSelectionDiversity.test.mjs`, `finalSelectionTrace.test.mjs` |
| Weak-citation ranking regression | `citationStrengthRanking.test.mjs`, `recommendationScoring.test.mjs`, `replayFixtures.test.mjs` |
| Source-upgrade trigger, fallback, and identity safety | `sourceQualityUpgrade.test.mjs`, `serper.test.mjs`, `replayFixtures.test.mjs` |
| Product image safety | `productImageResolver.test.mjs`, `productAssets.test.mjs`, `discoveryImprovements.test.mjs` |
| Fresh fallback debug trace preservation | `recommendationApiContract.test.mjs`, `replayFixtures.test.mjs`, `discoveryImprovements.test.mjs` |
| Shop-vac vs household floor-cleaner type safety | `productTypeIntent.test.mjs`, `productTypeMatch.test.mjs`, `requirementValidation.test.mjs`, `serper.test.mjs` |

## True deterministic gaps

Phase 6B found two already-fixed behaviors without direct regression assertions:

1. **RR-012:** the view-model suite did not directly verify schema.org availability token formatting. A deterministic test now proves a `LimitedAvailability` URL/token becomes `Limited Availability` and the raw token is not shown.
2. **RR-025:** the fallback funnel suite verified the `afterRequirementFilter` stage existed but did not prove near-match names were retained. The test now creates a budget-constrained candidate with no trustworthy price and verifies `names: []` plus the candidate in `near`.

No production behavior change was required. No distilled fixture was needed.

## Measurement-only and provider-bound issues

- **RR-014:** leader coverage is an aggregate outcome. Current deterministic tests validate the benchmark/replay machinery, not live recall.
- **RR-015:** stability requires controlled repeated runs. A single fixture or unit test cannot establish it.
- **RR-037:** candidate-pool appearance is provider/LLM variance and needs approved repeated live measurement.
- **RR-045:** category-specific provider coverage remains a live-provider question.

These are not regression-wall blockers. They remain explicit Phase 6 measurement obligations and must not be closed from deterministic green tests.

## Proposed automation — requires approval

No script, package command, or executable wall runner was added in Phase 6B.

A future approved automation could:

- run the focused high-risk files listed in **Required mechanism wall**;
- emit a machine-readable RR-ID-to-test index;
- fail when an indexed test file is removed or renamed;
- run before the full suite as a faster diagnosis layer;
- remain zero-live-call and exclude local live fixtures, provider payloads, and generated baselines.

Possible future command name: `npm run test:wall`. This is a proposal only and requires explicit approval before implementation.

## Phase 6B exit

- Regression wall indexed: **complete**.
- Deterministic gaps: **2 found, 2 closed**.
- Production files changed: **none**.
- Live calls: **zero**.
- Next phase: **Phase 6C patch audit**, only after explicit approval.

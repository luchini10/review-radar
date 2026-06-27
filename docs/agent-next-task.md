# Agent Next Task

Generated: 2026-06-26

## Current next task

**Phase 3N - Serper Shopping product-link/title eligibility fix**

Phase 3M proved that Serper raw coverage is not empty:

- `Wet/Dry Vacuum DXV10SB`: 40 raw, 20 structural, 0 eligible
- `Wet/Dry Vacuum DXV10SB shop vac`: 40 raw, 20 structural, 0 eligible
- `DEWALT DXV10SB shop vac`: 40 raw, 20 structural, 0 eligible

A correct DEWALT result was present but used a `google.com/search?ibp=oshop...` Google Shopping offer URL and was rejected by the search/listing URL gate. Some specific `Shop-Vac` titles were also rejected because the generic title rule treats `shop` as non-product wording.

The query builder separately detected `DeWalt` but dropped it when it selected only the two words immediately before model `DXV10SB`. That query fix is deferred until after normalization is repaired because the brand-preserving control was also reduced to zero eligible candidates.

## Required next phase

Implement one focused normalization/eligibility fix. Do not run a full baseline.

Required behavior:

1. Safely distinguish Google Shopping offer URLs from ordinary Google search/listing URLs.
2. Prefer or extract a real merchant product URL when the response provides one.
3. Avoid rejecting the `Shop-Vac` brand merely because it contains `shop`.
4. Keep generic shop/category titles and unsafe pages blocked.

Tests must cover:

- a specific Google Shopping offer result
- an ordinary Google search URL that must remain blocked
- a specific `Shop-Vac` product title
- a generic shop/category title that must remain blocked
- accessories, parts, wrong models, listing pages, article pages, and unsafe prices
- unchanged non-debug result shape

After deterministic tests pass, run one focused live proof to confirm candidates reach source-upgrade identity sampling.

Do not:

- change query construction, fallback behavior, identity matching, extraction, scoring, ranking, discovery, source-upgrade trigger logic, model-token detection, or trust gates;
- hardcode brands, products, or categories;
- run a full baseline.

Reference:

- `docs/codex-handoff-phased-plan.md`
- `docs/qa-loop-results.md` Phase 3M entry

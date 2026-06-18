# ReviewRadar Pipeline Note

This note records the implementation plan before changing the recommendation pipeline.

## Current Request Flow

1. `app/page.tsx` collects Product category, Budget, Important Details, and Smart Features.
2. The page posts to `app/api/recommendations/route.ts`.
3. The API validates the request, builds search queries, calls Serper and OpenAI, validates structured output, merges candidates, verifies citations, filters requirements, enriches product evidence/assets, and returns a `RecommendationResult`.
4. `components/ResultsSummary.tsx` splits exact matches from near matches and renders `components/ProductCard.tsx`.

## Upgrade Plan

- Extract structured requirements before search so hard requirements are deterministic.
- Generate a staged search plan instead of one flat query list.
- Keep Serper and OpenAI server-side only.
- Enrich product pages with structured metadata before final filtering when possible.
- Add canonical product identity so duplicates and variants do not fill multiple slots.
- Score candidates with an explainable breakdown and select unique recommendation slots.
- Preserve exact-match vs near-match behavior and never weaken hard requirements just to fill cards.
- Add lightweight caching, safe timeouts, and development-only search coverage metrics.

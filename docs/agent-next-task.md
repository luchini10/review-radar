# Agent Next Task

Generated: 2026-06-20T11:13:00Z

## Selected Root Cause

Investigate shared root cause: **price_and_required_kit_evidence_too_thin_for_broad_tool_searches**.

## Failing Example

- Product category: `cordless drill`
- Budget: `$200`
- Important details: `DeWalt or Milwaukee, battery included`
- Live result: returned close matches but no exact matches.
- What improved already: `DeWalt or Milwaukee` now parses as hard brand alternatives, and safe line aliases such as DeWalt `20V MAX` and Milwaukee `M12 FUEL` can satisfy brand evidence.
- What still failed: the close matches had missing or untrusted prices, and several did not verify `battery included` strongly enough.

## Suspected Shared Modules

- `lib/search/serper.ts`
- `lib/searchQueryExpansion.ts`
- `lib/productEvidence.ts`
- `lib/requirementEvidenceRescue.ts`
- `lib/requirementValidation.ts`
- `lib/productPriceTrust.ts`

## Forbidden Fixes

- Do not mark missing prices as exact budget matches.
- Do not assume every drill kit includes a battery unless evidence says so.
- Do not hardcode one DeWalt or Milwaukee product.
- Do not weaken the shared product trust layer to make this search pass.

## Required Tests

- Add regression coverage for broad tool searches where the title or metadata proves a kit includes a battery.
- Add regression coverage showing tool-only or bare-tool drills still fail `battery included`.
- Add coverage that trusted retailer/shopping prices can promote a qualifying in-budget drill to exact, while missing prices stay close matches.
- Include at least one non-drill category if the fix touches generic price or kit/accessory evidence logic.

## Required Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- Direct live API recheck for `cordless drill`, `$200`, `DeWalt or Milwaukee, battery included`
- `npm run build`

## Stop Condition

Stop after one generalized fix that improves trusted price discovery and required kit/battery evidence without weakening exact-match safety.

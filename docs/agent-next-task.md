# Agent Next Task

Generated: 2026-06-20T04:35:58.337Z
Run: agent-loop-2026-06-20T04-25-03-236Z

## Selected Root Cause

Investigate shared root cause: **price_evidence_or_variant_price_gap**.

Priority score: 9
Frequency: 1
Categories affected: 1
Exact-match affected findings: 1

## Failing Examples

- counter depth refrigerator (wrong-category): suspicious_low_price - Suspiciously low price text for LG 23 cu. ft. Side by Side Refrigerator with External Ice and Water Dispenser LRSXC2306S: $100, $100.

## Suspected Shared Modules

- lib/priceParsing.ts
- lib/productAssets.ts
- lib/recommendationScoring.ts

## Forbidden Fixes

- Do not hardcode one product, store, brand, or category.
- Do not weaken hard requirements to make a bad result pass.
- Do not hide failures in the UI instead of fixing shared logic.
- Do not change public API or response shape without explicit approval.

## Required Tests

- Add regression coverage for the root cause using at least two examples when possible.
- Include a category-agnostic test if the failure can happen across categories.
- Keep existing exact/near match behavior intact unless the test proves it was wrong.

## Required Verification

- npm run typecheck
- npm run lint
- npm test
- npm run qa:loop -- --batches wrong-category
- npm run build

## Stop Condition

Stop after one generalized fix and update docs/qa-loop-results.md with before/after proof.

# ReviewRadar Agent Fix Template

Use this template when `docs/agent-next-task.md` selects a repeated QA root cause.

## 1. Confirm Scope

- Read `docs/agent-next-task.md`.
- Read the relevant worker JSON files in `docs/agent-worker-results/`.
- Confirm the failing examples point to a shared issue, not one bad product.
- Do not edit code unless the user has approved implementation.

## 2. State The General Root Cause

Write the root cause in plain English:

- What failed?
- Which shared module or pipeline stage likely caused it?
- Could the same class of failure happen in other categories?
- Is this parsing, synonym handling, units, price evidence, product identity, search discovery, ranking, final validation, or UI wording?

## 3. Forbidden Fixes

Do not:

- hardcode one product, SKU, store, brand, or category
- add one-off synonym patches when a reusable normalization rule is possible
- weaken hard requirements to create more exact matches
- hide a failure in the UI while leaving bad pipeline data unchanged
- remove evidence, citations, validation, or tests without replacing them with safer logic

## 4. Make One Shared Fix

Prefer reusable changes in shared modules such as:

- requirement parsing and normalization
- unit and number comparison
- product identity and category validation
- price parsing and price-evidence trust
- search query planning
- candidate discovery and fallback quality
- evidence enrichment and verification
- ranking/scoring safety
- product card view-model cleanup

Keep the change small enough to verify.

## 5. Add Regression Tests

Add tests that prove the fix works beyond the exact failed example.

When possible, include:

- one test for the original failure shape
- one test from a different product category
- one negative test showing the fix does not let bad products pass

## 6. Verify

Run the smallest focused checks first, then the full checks:

```powershell
npm run qa:worker -- --batch price-trust
npm run qa:worker -- --batch broad-mainstream
npm run qa:loop -- --batches price-trust,broad-mainstream
npm run qa:verify
npm run typecheck
npm run lint
npm test
npm run build
```

Only list commands in the final answer and change log if they were actually run.

## 7. Document

Update plain-English docs when the change is meaningful:

- `docs/qa-loop-results.md`: what failed, what changed, before/after proof, remaining risks.
- `docs/change-log.md`: concise dated entry with `Changed` and `Verified`.
- `ReviewRadar-Overview.md`: only when architecture, pipeline behavior, APIs, modules, or important system rules changed.

After updating those repo markdowns, copy them to:

```text
C:\Users\tluch\Desktop\RR Markdowns
```

## 8. Final Response

Include:

- what general issue was fixed
- whether the fix is reusable across categories
- files changed
- checks run and results
- remaining risks or follow-up
- the dev command and localhost link if code or UI changed

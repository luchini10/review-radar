# ReviewRadar Change Log

Plain-English record of meaningful ReviewRadar changes.

Update this file after:
- major pipeline changes
- ranking/search/evidence changes
- UI feature changes
- important bug fixes
- live QA fixes worth remembering

Do not update this file for tiny typo fixes, formatting-only edits, or internal cleanup that does not change behavior.

## 2026-06-19

### Changed
- Fixed a live QA non-product-page leakage issue where articles, product-family pages, price-comparison pages, retailer category/advice pages, and brand newsroom pages could appear as recommendations.
- Strengthened product-page trust checks in three places: Serper candidate intake, final citation/result validation, and the product-card URL selector.
- Added reusable guards for common non-product page shapes, including "ranking/top N" articles, review pages, release/newsroom pages, product lineup articles, Nike category/brand pages, DICK'S advice/category pages, Foot Locker product-family pages, Klarna comparison pages, and sneaker-news pages.
- Added regression tests so these pages can still be used as research evidence but not shown as buyable product cards.
- Fixed a live QA price-trust issue where high-ticket full products, especially travel systems, could show payment/promo/variant amounts like `$35` or `$10` as if they were full product prices.
- Added reusable product-context price floors so budget validation, ranking, product reliability, and card price display treat implausibly tiny full-product prices as unverified instead of exact-match evidence.
- Added regression tests proving the fix rejects suspicious travel-system prices while still allowing genuinely cheap categories such as garden hoses.
- Added an opt-in controller flag for meaningful change-log updates. Future QA/fix runs can pass `--change-note` and `--change-verified` so the controller appends a plain-English `docs/change-log.md` entry and syncs the desktop markdown copy.
- Added a safe v1 multi-agent QA loop foundation with controller, worker, and verifier scripts.
- Moved reusable QA scenarios into JSON batch files under `docs/agent-batches/`.
- Added deterministic and live localhost worker modes. Live mode posts to the local recommendations API with debug enabled and records exact/near counts, product names, suspicious flags, and debug summaries.
- Added multi-batch controller runs with capped parallel support, current-run-only worker result merging, repeated-root-cause ranking, stronger next-task handoff files, and a generated `docs/agent-loop-report.md`.
- Added a reusable `docs/agent-fix-template.md` so Codex or Claude can follow the same generalized fix-and-verify process.
- Expanded the verifier so it compares before/after worker result sets and rejects new root causes, more exact-match failures, more wrong-price/wrong-product/non-product failures, or product-specific patches.
- Improved the verifier's default file selection so it includes controller-owned worker files and sorts by file time instead of relying on filename prefixes.
- Fixed the QA worker's suspicious-price detector so it reads comma prices like `$3,000` correctly instead of treating them as `$3`.
- Added docs explaining how controller and worker agents should test ReviewRadar, reject product-specific patches, verify generalized fixes, and log results.
- Added npm commands for running the QA loop, worker batches, and verifier summaries.
- Added a reusable product reliability check for Best Match eligibility.
- Products with conflicting or unverified price evidence are kept out of the ranked Best Match list.
- Product cards now avoid confidently showing suspicious cheap prices when sources disagree, and instead tell shoppers to verify the current store price.
- Added safer unit-label handling so selected length features do not create duplicated labels like `50 ft ft`.

### Verified
- `node --no-warnings --test tests\recommendationResultValidation.test.mjs tests\serper.test.mjs tests\requirementValidation.test.mjs tests\productPageUrl.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run qa:loop -- --batches broad-mainstream`
- `npm run qa:worker -- --batch broad-mainstream --mode live`
- `node --no-warnings --test tests\priceParsing.test.mjs`
- `node --no-warnings --test tests\productAssets.test.mjs`
- `node --no-warnings --test tests\recommendationScoring.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run qa:loop -- --batches price-trust`
- `npm run qa:worker -- --batch price-trust --mode live`
- `npm run build`
- `node --check scripts\agent-loop-controller.mjs`
- `npm run qa:loop -- --batches price-trust`
- `npm run lint`
- `node --check scripts\qa-worker.mjs`
- `node --check scripts\agent-loop-controller.mjs`
- `node --check scripts\verify-loop-result.mjs`
- `npm run qa:worker -- --batch "price-trust"`
- `npm run qa:worker -- --batch "broad-mainstream"`
- `npm run qa:worker -- --batch price-trust --mode live`
- `npm run qa:loop -- --batches price-trust,broad-mainstream,requirement-units`
- `npm run qa:loop`
- `npm run qa:verify`
- `npm run typecheck` (inside `qa:loop`)
- `npm run lint` (inside `qa:loop`)
- `npm run lint`
- `npm test` (inside `qa:loop`)
- `npm run build`

## 2026-06-18

### Changed
- Documented organic non-product filtering so article, forum, support, deal, review, and list pages can be used as evidence but not shown as product cards.
- Documented editorial seeding, where curated best-of lists can help discover real product candidates without becoming recommendations themselves.
- Added QA notes for live result-quality fixes and remaining follow-up areas.

### Verified
- Markdown documentation committed in `8986f63`.

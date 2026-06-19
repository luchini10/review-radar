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
- Added a reusable product reliability check for Best Match eligibility.
- Products with conflicting or unverified price evidence are kept out of the ranked Best Match list.
- Product cards now avoid confidently showing suspicious cheap prices when sources disagree, and instead tell shoppers to verify the current store price.
- Added safer unit-label handling so selected length features do not create duplicated labels like `50 ft ft`.

### Verified
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## 2026-06-18

### Changed
- Documented organic non-product filtering so article, forum, support, deal, review, and list pages can be used as evidence but not shown as product cards.
- Documented editorial seeding, where curated best-of lists can help discover real product candidates without becoming recommendations themselves.
- Added QA notes for live result-quality fixes and remaining follow-up areas.

### Verified
- Markdown documentation committed in `8986f63`.

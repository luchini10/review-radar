# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-14 request-time market quality is implemented through runtime commit
`f55096d`. It performs fresh source research and current commerce discovery for
every recommendation request. No market plan, Shopping result, product-page
result, recommendation, or research artifact survives the request that created
it.

The public contract remains one `POST /api/recommendations` returning only
image, name, category, trustworthy price when available, and product-page URL.
No push, deployment, release, production-data action, dependency change,
public-API change, or card expansion occurred.

The implementation is deterministic-green but **not release-qualified**. The
latest no-retry live matrix passed safety, response, operation, and payload
gates, but failed the 80% frozen-leader gate and the historical 25-second p95 /
30-second maximum latency gates. Do not describe the current path as reliably
returning the best product in budget.

Taylor authorized the full local goal, local commits, and removal of phase-
approval pauses. That authority does not permit weakening evidence, identity,
availability, budget, SSRF, or other product-safety gates; retrying failed
matrix cells; pushing; or deploying.

## Current request-time architecture

`lib/marketScout.ts` makes one fresh GPT-5.4 Mini Responses call per request
with strict Structured Outputs, `store: false`, no SDK retries, a 60-second
deadline, three requested and three maximum hosted searches, low reasoning,
and a 6,000-token output ceiling. It returns at most five ordered exact-model
targets. Every target must contain a distinctive model/catalog identifier, and
a source URL binds only when it appears in that response's completed web-search
source set. `strong` requires two independent recognized domains including a
comparative source; `supported` requires one comparative source or two
recognized editorial domains. Invalid or unavailable scouting falls back to
neutral discovery with no quality boost.

The route starts the scout and three neutral Shopping searches concurrently.
It may then run up to three exact Shopping target searches, three organic exact-
target page searches, and candidate-local resolution while preserving the hard
fifteen-logical-Serper-operation ceiling. Shopping rating, review count, offer
count, product ID, and position are internal tie-breakers only. Evidence binds
to exact stable brand/model identity, never a brand, generic alias, product
family, specification label, or sibling variant.

Final ordering is applied only after product type, accessory, condition, exact
identity, hard requirements, availability, trusted USD price, budget, product-
page, image, and SSRF gates pass: `strong`, `supported`, unscored; supported
preferences; scout order; Bayesian commerce rating with a 4.0/50 prior;
review/offer volume; page and merchant quality; stable discovery order. Price
is an eligibility ceiling and never a quality bonus.

The only coalescing maps are created inside `selectProducts` and die with that
request. Response headers are `Cache-Control: no-store`. There is no production
index, prewarm, polling, background refresh, persistent market-plan cache,
cross-request Shopping/page cache, or alternate recommender.

## Final generalized corrections

- The scout rejects generic family/platform/specification targets that lack an
  exact model number or catalog code.
- Exact-model binding recognizes standalone catalog codes such as Milwaukee
  `2904` without treating years, prices, pressure, airflow, or other
  measurements as model identity.
- Generic aliases cannot bypass the exact target model, and sibling catalog
  models such as Milwaukee `2904` and `2903` remain isolated.
- Target page resolution reuses the known current Shopping merchant when
  available, without increasing the operation ceiling or transferring price or
  availability across merchants.
- Used, refurbished, renewed, recertified, open-box, and reconditioned state is
  rechecked after product-page resolution, including URL-only disclosures.
- Page-title and URL hard specifications are checked separately, so an echoed
  `2000 PSI` title cannot hide a `1500-psi-rated` route.
- Repeated identical model components in retailer slugs remain idempotent,
  qualified measurements such as `5.0-Peak HP` do not become models,
  `img-na` assets are placeholders, and full-size leaf blowers are kept
  separate from compact workshop/jobsite blowers and accessories.

## Executed live evidence

The QA-only dated benchmark has five broad and five constrained searches, one
cache-cold attempt per cell and no retries. Two final reports are preserved:

| Metric | Medium scout | Final exact scout | Gate |
| --- | ---: | ---: | ---: |
| Successful HTTP responses | 10/10 | 10/10 | zero failures - pass |
| Non-empty | 10/10 | 10/10 | at least 8/10 - pass |
| Frozen leader in top three | 0/10 | 1/9 eligible (11.11%) | at least 80% - **fail** |
| Runtime evidence / `strong` | 2/10 / 1/10 | 4/10 / 3/10 | report |
| Scout fallback | 4/10 | 0/10 | report |
| Mean latency | 48,046 ms | 26,454 ms | report |
| Nearest-rank p95 / maximum | 59,998 ms | 36,077 ms | 25,000 / 30,000 ms - **fail** |
| OpenAI Responses | 10 | 10 | one/request - pass |
| Hosted searches | 30 | 30 | at most three/request - pass |
| Maximum logical Serper work | 15 | 15 | at most fifteen/request - pass |
| Mean / maximum payload | 868 / 1,480 B | 710 / 1,378 B | unchanged - pass |

The final matrix used 178,485 input and 12,308 output model tokens, 190,793
total, with approximately $0.189250 model-token cost at the public rates used
for the audit. One frozen benchmark leader was currently ineligible. Strong
passing leaders ranked ahead of unscored products. Examples include a strong
Roborock Saros 10R first for broad robot vacuum, eufy C10 first for the
constrained robot-vacuum budget, RIDGID RT1200 first for constrained shop vac,
and Cuisinart DCC-3200 first for constrained coffee maker. The leaf-blower and
pressure-washer safety corrections removed the observed wrong-type and hard-
specification conflicts.

The stronger full GPT-5.4 experiment timed out at 75 seconds without usable
output. GPT-5.4 Mini with medium reasoning produced four near-ceiling invalid
outputs. Low reasoning plus exact-target validation removed those fallbacks and
was the strongest measured request-time configuration; more prompt tuning is
not an evidence-supported remedy for the remaining commerce-coverage loss.

## Deterministic verification

- Unit tests: 333/333 across 43 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 pass across Chromium desktop/mobile; only environment-level
  `NO_COLOR` / `FORCE_COLOR` notices were emitted.
- `git diff --check`: pass at the implementation snapshot.

These checks prove the implemented invariants, not live market coverage or the
failed quality SLO.

## Assessment and next decision

The request-time scout is now reliable at producing exact source-backed plans,
and the selector is safer when binding them. The proven remaining bottleneck is
current commerce coverage: exact leaders often cannot be bound to a current,
exact, purchasable retailer page within the existing provider/operation
envelope. The ranker cannot promote evidence that does not survive identity,
availability, condition, price, and product-page verification.

Do not restore a retained/background evidence index. The strongest next
architecture comparison consistent with the product objective is request-
scoped direct commerce resolution from a provider or retailer integration that
supplies canonical product identities, current offers, and direct pages, versus
an explicitly larger latency/operation envelope. A progressive/asynchronous
response is only an alternative if Taylor chooses to change the public request
contract. Any major provider or public-contract change requires its own scoped
measurement plan.

Recommended reasoning level: **high** for that provider/architecture decision,
because it changes quality, latency, cost, and trust; medium for routine
deterministic follow-up.

## Hard boundaries and process incident

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`; suppress untracked enumeration and use
explicit path-scoped searches.

During this goal, a broad `rg --files docs tests` command unintentionally
enumerated protected fixture path names. No fixture content was opened, read,
hashed, statted individually, copied, edited, deleted, or used as evidence. The
incident was disclosed immediately and the fixture tree was not touched again.
Do not repeat the process violation.

Do not weaken product type/accessory/condition, hard requirements, exact-model
identity, merchant binding, availability, USD budget, price authority, page
eligibility, duplicate URL, image, or SSRF gates. Market and commerce signals
never create eligibility or reach the public payload. Do not retry until a
preferred card appears.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| Runtime snapshot | `f55096d` |
| Current decision and failed release verdict | `docs/forward-roadmap.md`, PR-14 |
| Canonical executed QA record | latest PR-14 entry in `docs/qa-loop-results.md` |
| Durable current contracts | `docs/review-radar-test-memory.md`, PR-14 |
| Frozen live benchmark | `tests/benchmarks/pr14-live-accuracy-v2026-09a.json` |
| Medium/final raw reports | `docs/pr14-live-accuracy-report-v3-merchant-spec-safety.json`, `docs/pr14-live-accuracy-report-v4-exact-scout.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |

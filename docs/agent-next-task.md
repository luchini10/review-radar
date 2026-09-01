# ReviewRadar agent next task

Updated: 2026-09-01

## Current phase and exact snapshot

PR-13 Steps 1 through 4 have been executed locally. The implementation is
complete at `9a61b40`, following the source-bound scout and exact-model ranking
commits, but the Step 4 live release gates failed. PR-13 is therefore **not
release-qualified** and must not be described as reliably returning the best
in-budget products.

The public path remains one synchronous `POST /api/recommendations`, one
optional GPT-5.4 Mini Responses call, bounded Shopping/page verification, and
the unchanged minimal card. No push, deployment, release, production-data
action, dependency change, public API change, or card change occurred.

Taylor explicitly removed approval pauses for the executed PR-13 goal. That
authority did not permit weakening evidence or safety gates, replacing failed
matrix cells, or silently changing the one-scout/no-background architecture.

## Implemented PR-13 path

`lib/marketScout.ts` makes one GPT-5.4 Mini Responses request with strict
Structured Outputs, included `web_search_call.action.sources`, no SDK retries,
a 10.5-second timeout, low search context, and a request for one broad hosted
search. The runtime still validates a hard maximum of three actual hosted
calls. It accepts only response-owned canonical URLs and assigns `strong` only
for two independent recognized editorial/test domains including a comparative
source. Validated plans cache for 24 hours; every failure falls back without a
quality boost.

`lib/productSelection.ts` starts three neutral Shopping searches concurrently,
then may search the three highest undiscovered `strong` exact models. The hard
ceiling is six discovery searches plus nine candidate-local resolution
opportunities, at most fifteen logical Serper operations. Evidence attaches
only to exact brand/model identity. Final post-gate ordering is evidence tier,
supported preferences, scout consensus, Bayesian commerce rating with a
4.0/50 prior, review/offer volume, page/merchant quality, and stable discovery
order. Price remains an eligibility ceiling only.

Step 4 also added generalized guards for two live safety losses: 1440p display
requirements now reject known 1080p contradictions, and direct product URLs
whose explicit size, RAM, or storage configuration conflicts with the offer
title are ineligible.

## Frozen baseline and executed matrices

The Step 1 pre-quality baseline was 23/24 non-empty, shop vacuum 2/3, mean
12,507 ms, nearest-rank p95 18,806 ms, and maximum 20,419 ms. It did not retain
enough per-card identity evidence to compute a trustworthy before leader-
recall value.

The first Step 4 matrix was preserved as a failure: 17/24 non-empty, four
request timeouts, p95 30,009 ms, 2/20 top-three frozen-leader hits among
successful requests, and thirteen scout fallbacks caused by four counted
hosted calls exceeding the three-call validator. It exposed SDK timeout retries
plus the display-resolution and direct-URL configuration defects.

After the bounded corrections, a new three-round, eight-case cache-cold matrix
ran exactly 24 attempts with no retries:

| Metric | Corrected result | Gate |
| --- | ---: | ---: |
| Non-empty | 18/24 | at least 21/24 — **fail** |
| Shop vacuum | 3/3 | at least 2/3 — pass |
| Frozen leader in top three | 3/24 (12.5%) | at least 80% — **fail** |
| Strong plan returned as a strong card | 0/4 | coverage failed |
| Mean latency | 19,235 ms | report |
| Nearest-rank p95 | 22,975 ms | at most 25,000 ms — pass |
| Maximum latency | 26,174 ms | at most 30,000 ms — pass |
| OpenAI Responses | 24 total, one/request | one/request — pass |
| Hosted searches | 20 total, maximum two/request | at most three — pass |
| Logical Serper operations | 287 total, maximum 13/request | at most fifteen — pass |
| Public payload | mean 725 B, max 1,738 B | unchanged/no material growth — pass |

Nineteen of 24 scouts fell back: fourteen timeouts, two invalid outputs, and
three insufficient-evidence results. Only one run returned any evidence-tiered
card, and it was `supported`; no `strong` target survived commerce and safety
verification. The frozen leader appeared only in all three coffee-maker runs.
Laptop was honestly empty 3/3 after the URL-configuration correction.

Measured corrected-matrix model usage was 91,828 input plus 10,742 output
tokens. At current [OpenAI pricing](https://developers.openai.com/api/docs/pricing),
model tokens cost about $0.11721 and twenty hosted searches about $0.20. The
287 operations are about $0.287 at [Serper's public Starter rate](https://serper.dev/),
so the public-rate estimate is about $0.60421 before tax; the account's actual
tier was not inspected.

## Verification

- Full unit tests: 319/319 across 43 suites.
- Typecheck: pass.
- ESLint: pass with zero warnings.
- Next.js 16.3.3 production build: pass; only `/`, `/_not-found`, and
  `/api/recommendations` are exposed.
- Playwright: 7/7 pass across Chromium desktop/mobile.
- `git diff --check`: pass at each committed implementation snapshot.
- Corrected matrix: zero request failures and no detected product-type,
  condition, identity, hard-requirement, availability, USD-budget, duplicate-
  URL, public-shape, or SSRF regression.

## Assessment and next architecture decision

The proposed ranking logic is sound, but it does not attack the proven live
bottleneck. A synchronous source-backed web scout must be cut off quickly to
meet p95, causing frequent no-boost fallback; when it does produce a strong
target, current Shopping/page verification often cannot surface a purchasable
exact offer. More prompt/timeout tuning would trade latency against evidence
yield and is not an evidence-supported next step.

The strongest alternative is to move market-quality research outside the
latency-critical request into a periodically refreshed, source-bound evidence
index, then perform only current commerce/eligibility verification during the
shopper request. That materially changes PR-13's no-background architecture.
The other honest option is to retain live scouting and relax the latency SLO.
Do not implement either by stealth; first write a new architecture decision
with measured freshness, invalidation, operating cost, and trust boundaries.

Recommended reasoning level: **highest** for that architecture decision;
medium for routine verification and documentation.

## Hard boundaries

Never manually inspect, print, hash, copy, edit, or diagnose `.env.local`.
Never open, enumerate, stat, hash, parse, copy, edit, or delete
`tests/fixtures/review-radar-live/**`; suppress untracked enumeration and use
explicit path-scoped searches.

Earlier sessions and Step 2 recorded path-only protected-fixture enumerations,
most recently from `git status --short --branch`. No protected fixture content
was opened or used. Do not repeat the process violation.

Do not weaken product type/accessory/condition, hard requirements, exact-model
identity, merchant binding, availability, USD budget, price authority, page
eligibility, duplicate URL, image, or SSRF gates. Market/commerce signals never
create eligibility or reach the public payload. Do not retry until a preferred
card appears.

## Evidence pointers

| Evidence | Location |
| --- | --- |
| PR-13 decision and failed Step 4 verdict | `docs/forward-roadmap.md`, PR-13 |
| Canonical live record | latest PR-13 entry in `docs/qa-loop-results.md` |
| Durable quality contracts | `docs/review-radar-test-memory.md`, PR-13 |
| Frozen QA benchmark | `tests/benchmarks/pr13-market-leaders-v2026-09a.json` |
| Runtime architecture | `ReviewRadar-Overview.md` |
| Final implementation before docs | `9a61b40` |

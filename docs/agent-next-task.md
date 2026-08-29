# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after the independently approved PR-3J tri-state
source-metadata correction. This file was regenerated from current evidence.
The current approved base is the self-contained PR-3J closeout commit containing
this file; resolve its exact full SHA with `git rev-parse HEAD`. Its expected
parent is `bd54de9076cf6752ee2beefd686689852f6f9994`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra path remains default-
off, undeployed, and without a completed live shopper result.

PR-3I spent exactly one frozen `shop vac` lifecycle at clean PR-3H commit
`bd54de9076cf6752ee2beefd686689852f6f9994`. Provider research reached terminal
`completed`, but local preflight stopped as `research_candidate_invalid /
candidate_sources / candidate_source_identity_unproven` before page collection,
Shopping, deterministic verification, presentation, rendering, or public output.

The 56.020-second first-terminal run used one OpenAI create, 24 retrieves, five
hosted searches, one safety cancel, 47,475 input tokens, zero cached input, and
5,516 output tokens. Approval-envelope cost was `$0.251428`; frozen-conservative
cost was `$0.281099`; the informational current estimate was `$0.211142`. Every
retry, replacement, fallback, organic/SearchAPI, product-data, second-case,
post-stop, flag-change, and deployment counter stayed zero.

The only PR-3I artifact is untracked 21,584-byte
`tests/fixtures/review-radar-live/oai-t10-phase-d-bd54de9/attempt.json`, SHA-256
`03D442FFE14D819D6C23A2E76C2458E37AF6A2EBE7691A6DC4F6EA0ED2827B3F`.
Independent strict read-only audit returned `VERIFIED`, no findings, confidence
0.99 for exact commit/case/evidence-v5 binding, sequence, counters, usage, cost,
and privacy. It retains no raw/provider/candidate/product/source identity,
prompt, page, body, header, credential, key, secret, or token. The directory is
immutable and spent.

The closed filter reports 10 submitted, zero accepted, 10 rejected, and at least
one `missingTitle` source decision for each candidate; all four affirmative
mismatch families are zero. This aggregate cannot identify a source or say
whether one or both sources lacked a title. It establishes no downstream page
or product truth.

Official Responses documentation defines `web_search_call.action.sources` as
the complete consulted URL list with URL-only records. Citation annotations can
carry titles; action-source titles are not guaranteed. No documented stable
text-result title schema was found that should become a trust boundary.

PR-3J therefore preserves exact ownership and final identity authority while
making source preflight tri-state:

1. If any exact response-owned source has an available title that passes the
   unchanged shared verifier, continue the candidate.
2. If none passes and any exact source lacks a title, defer the candidate to the
   existing bounded DNS-pinned page fetch and unchanged page/entity verifier.
3. If every available title affirmatively mismatches, quarantine the candidate
   before network collection.

Deferral grants no evidence, eligibility, rank, source role, or shopper-visible
claim. The provider still must submit 8–15 schema-valid candidates with exactly
two fetch-distinct exact response-owned sources each. The 30-fetch ceiling,
source ownership, canonical non-borrowing, page/entity/relationship/commerce/
requirement/asset gates, public responses, and committed defaults are unchanged.

The server-only aggregate now reports submitted, accepted/continued, deferred-
missing-title, rejected, and four affirmative mismatch families. Deferred is a
subset of accepted. Exact-key route sanitization requires 0–15 integer bounds,
accepted+rejected=submitted, deferred<=accepted, completion equality with the
actual continued slate, mismatch-count conservation for rejected candidates,
and zero deferred candidates in the exact all-rejected failure context.

Current identities are contract v9, research schema v5, prompt v6, runtime v8,
and future sanitized evidence v6. Old signed jobs fail closed. PR-3J made no
external request and changed no public body, flag, deployment rule, model,
timeout, retry, or network ceiling.

## PR-3I and PR-3J proof and limits

| Check | Result |
| --- | --- |
| PR-3I terminal artifact audit | `VERIFIED`; no findings; confidence 0.99 |
| PR-3J fail-first | 58 passed / exactly 5 intended failures |
| Corrected staged/shared trust wall | 169/169 across 15 suites |
| Complete deterministic suite | 1,498/1,498 across 214 suites |
| Five named worker partitions | exact reconciliation passed |
| Tracked offline benchmark | 10/10 cases; 29/29 invariants |
| Playwright E2E | 17/17 |
| Nonincremental typecheck | passed |
| Production build | passed |
| Deterministic eval | no red flags |
| Fixed ranking comparison | passed |
| Lint | zero errors; same three pre-existing warnings |
| Diff/generated-file checks | passed; `next-env.d.ts` restored/clean |
| Independent PR-3J source review | `APPROVED`; no findings; confidence 0.96 |
| PR-3J live/provider/product-data calls | none |

The independent reviewer disclosed that its attempted filtered test command
unexpectedly executed an existing test that reads tracked public
`.env.example`. That entire 92-test run is non-authorizing and excluded from
proof. No `.env.local`, credential, secret value, live fixture, or network was
accessed; the terminal source verdict rests only on the permitted eight-file
diff and traced control flow.

Two earlier overbroad searches traversed live-fixture paths and exposed only
already-known terminal keys or fixed rejection tokens. No private field,
product/source identity, body, prompt, or credential was displayed. Every
subsequent repository search must exclude
`tests/fixtures/review-radar-live/**`. Never inspect, retry, edit, stage, reuse,
or add to any spent live directory.

PR-3J can increase page-fetch work for title-unavailable sources up to the
unchanged 30-attempt ceiling. It does not prove page success, post-fetch survivor
quality, safe shopper output, latency, cost, repeatability, or market coverage.

## Objective and decision frame for the next phase

The earliest dependency remains PR-013 staged lifecycle feasibility. PR-4
accuracy/stability measurement still requires one complete safe staged shopper
lifecycle.

Stronger alternatives were evaluated:

- Reading, editing, or retrying PR-3I is prohibited; its terminal evidence and
  hash are immutable.
- Trusting model-authored titles or broad URL-slug identity would weaken source
  authority and can admit sibling products.
- Consuming undocumented `web_search_call.results` title shapes would make an
  unstable provider detail a security/trust contract.
- Weakening title/model/type, relationship, commerce, or asset identity would
  manufacture ambiguous cards.
- A broad live matrix remains premature until one staged lifecycle succeeds.

The strongest next step is one PR-3K measurement of the unchanged frozen `shop
vac` case at the clean PR-3J closeout commit. This is not a PR-3I retry: it uses
a new commit-derived directory and tests contract v9/runtime v8/evidence v6. A
stop selects only the next generalized zero-live reproduction target. A safe
shopper result unlocks PR-4.

**Recommended reasoning level:** High for live trust, privacy, cost, and
terminal-evidence adjudication; Medium for the bounded mechanical invocation.

## Current approved phase: PR-3K one post-deferral lifecycle measurement

Taylor's 2026-08-29 production-readiness mandate authorizes this one bounded
low-parallelism measurement after a clean PR-3J commit. It does not authorize a
retry, replacement, broader matrix, flag promotion, deployment, or publication.

1. Authenticate this repository, branch `main`, exact PR-3J HEAD/parent, clean
   tracked and index state, clean `next-env.d.ts`, committed default-off flags,
   and unchanged user-owned untracked artifacts.
2. Run the focused Phase D runner tests and inspect the zero-network dry run
   from the exact commit. Check required server credentials only for in-memory
   presence and safe shape; never print, copy, hash, or stage their values.
3. Confirm the new commit-derived output directory does not exist. Do not read,
   edit, retry, stage, reuse, or add files to any spent Phase D directory.
4. Run exactly one lifecycle command using only `--name=value` approval tokens:

   ```powershell
   $pr3jCommit = (git rev-parse HEAD).Trim()
   node scripts/run-oai-t10-phase-d.mjs --execute --approved-commit=$pr3jCommit --approved-openai-creates=2 --approved-hosted-searches=10 --approved-openai-retrieves=60 --approved-safety-cancels=1 --approved-serper-shopping-attempts=15 --approved-source-page-fetches=30 --approved-source-page-http-attempts=90 --approved-dollar-ceiling=3
   ```

5. Stop at the first terminal route/result state. Do not retry, replace, add a
   case, continue downstream after a stop, fall back, use organic/SearchAPI,
   promote a flag, or deploy. The single invocation spends PR-3K regardless of
   outcome.
6. Validate exact commit/case/evidence-v6 schema, counters, usage, cost, hashes,
   privacy/credential exclusions, terminal sequence, tri-state count
   conservation/context binding, downstream first-loss conservation if reached,
   and public-response reconciliation. Treat the artifact as immutable spent
   evidence immediately.
7. Obtain independent read-only audit of the exact artifact and clean tracked
   state. Terminal audit verdict must be `VERIFIED`; a failed lifecycle remains
   evidence and never authorizes a second invocation.
8. Deferral, fetching, or a smaller slate is not success. If the route stops,
   select an evidence-supported target for a separate generalized zero-live
   reproduction. If it returns a safe shopper result, begin PR-4 planning
   against tracked benchmark and reviewed current-market truth.
9. Update the living plan and authoritative records. Keep every live artifact
   untracked. Commit only phase-owned documentation or a separately verified
   deterministic correction; never stage live evidence.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored developer `.env.local` is user-owned and may locally enable Direct
Terra. Never edit, stage, or print it. The frozen hard ceiling is `$3`; current
pricing is informational and cannot widen that wall.

## Outstanding readiness debts

- PR-006: current leader recall, final-set stability, hard-requirement truth,
  price coverage, latency distribution, calls, and cost are not benchmarked.
- PR-007 / RR-091: same-page related-product price binding needs exact-offer
  proof before an experimental path can be promoted.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority.
- PR-013: staged lifecycle feasibility remains blocked; no live attempt has
  reached presentation/rendering.
- PR-020: tri-state title-metadata handling is closed offline, but fetched-page
  yield, survivor quality, and lifecycle effect are unmeasured.
- Broader cache/concurrency, security, accessibility, mobile UX, production
  configuration, rollback, dependency, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Never read, retry, edit, stage, reuse, or add to any spent Phase D attempt or
  directory, including `oai-t10-phase-d-bd54de9`,
  `oai-t10-phase-d-ac53c10`, `oai-t10-phase-d-bf7e37b`,
  `oai-t10-phase-d-a743426`, `oai-t10-phase-d-43857e0`,
  `oai-t10-phase-d-ec528d7`, `oai-t10-phase-d-a15d935`,
  `oai-t10-phase-d-140d465`, `oai-t10-phase-d-56a5137`,
  `oai-t10-phase-d-b01c335`, and `oai-t10-phase-d-06fa55f`. Exclude the
  entire live-fixture tree from broad repository searches.
- PR-3K permits exactly one new frozen invocation at the clean PR-3J commit.
  No retry, replacement, second case, broader live QA, or approval reuse.
- Do not infer candidate/source mappings, source title distribution, or
  downstream truth from the bounded counts. Reproduce generalized paths offline
  before naming causes.
- Do not restore response-wide rejection for one affirmative mismatch, treat
  missing title as final acceptance, trust model-authored titles, canonical-
  match ownership, lend metadata across URL variants, or broaden URL-slug
  authority.
- Do not lower the strict provider candidate count, change two-source
  cardinality, grant deferred candidates evidence/eligibility, accept an
  affirmatively ungrounded candidate, or let diagnostic counts authorize trust.
- Do not weaken brand, model, product type, relationship, requirement,
  availability, price, source/page, commerce, asset, redirect, private-network,
  diagnostic, or public-response boundaries.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  ignored worker results, historical live fixtures, or any Phase D fixture.
  Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living defects, sequence, exit criteria, PR-3K scope | `docs/production-readiness-master-plan.md` |
| PR-3I artifact and PR-3J canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Staged architecture and phase sequence | OAI-T10 section in `docs/forward-roadmap.md` |
| Tri-state filter and aggregate | `lib/stagedTerraContract.ts`; `lib/stagedTerraRecommendationRoute.ts` |
| Staged runtime and job rollover | `lib/stagedTerraRuntime.ts`; `tests/stagedTerraIntegration.test.mjs` |
| Phase D runner and ceilings | `scripts/run-oai-t10-phase-d.mjs`; `scripts/oai-t10-phase-d.mjs` |
| Durable trust/live rules | top entry in `docs/review-radar-test-memory.md` |
| Offline benchmark integrity | `tests/fixtures/qa-benchmark-matrix-v1.json`; `scripts/qa-benchmark.mjs`; `tests/qaBenchmark.test.mjs` |

# ReviewRadar Production-Readiness Master Plan

Updated: 2026-08-29 by Codex
Status: active living control document
Starting branch: `main`
Starting commit: `dc9ab1fa1d85608e39cf29b5603d0c59692beb29`

## Objective and decision frame

The product objective is not to maximize exact-match counts or make the test
suite look green. It is to show the strongest genuinely suitable products,
exclude unsafe or misleading cards, preserve uncertainty, and give shoppers a
reliable decision brief at acceptable latency and cost.

The newest staged Terra path has not yet produced a live result. Its latest
provider-complete response failed at candidate validation before product
verification or ranking. Static fail-first comparison then proved a generalized
strict-schema/runtime mismatch: the model owned candidate and fact identifiers
that the runtime required to equal array-relative values the schema and prompt
did not fully specify, and the runtime rejected requirement order that the
schema could not constrain. The v2 research boundary now assigns identifiers
server-side and canonicalizes the exact requirement set without weakening
source, identity, fact, or requirement trust gates. The exact private field in
the already-spent response remains unknowable, so this is not yet live
feasibility proof. Separately, Phase D cost evidence now names its frozen July
approval envelope and dated August current estimate explicitly; only the
conservative frozen envelope controls the hard spending gate.

Stronger alternatives considered:

- **Edit the research prompt or loosen the contract now:** rejected. The saved
  evidence cannot distinguish top-level shape, source ownership, candidate
  validity, or duplicate identity. A speculative edit could hide a trust
  failure or weaken a gate.
- **Tune legacy discovery or ranking first:** deferred. Historical evidence
  shows serious recall and stability weakness, but the current strategic path
  is the staged architecture and its first loss occurs before those downstream
  stages. Legacy fixes remain appropriate only when fresh first-loss evidence
  shows they materially improve the active user path.
- **Run a broad paid benchmark immediately:** rejected for now. One zero-live
  correction can make the already-consumed failure informative and prevent a
  replacement request from repeating an unattributable outcome.

Recommended reasoning level: **High** for the first trust-boundary correction.
It is a small implementation, but it must separate provider completion,
contract failure, safe diagnostic attribution, and billable usage without
retaining private response material. Routine test isolation and documentation
work require **Medium**, not the most expensive level.

## Evidence labels

- **Verified:** inspected or executed in this checkout during this run.
- **Historical:** recorded by repository evidence but not re-measured live in
  this run.
- **Engineering judgment:** a conclusion drawn from verified evidence.
- **Unknown:** requires deterministic replay, live measurement, user research,
  or operational evidence.

## Authority and repository state

- **Verified:** repository root is
  `C:\Users\tluch\Documents\GitHub\review-radar-fixed`.
- **Verified:** `main` started at `dc9ab1f` and was 344 commits ahead of
  `origin/main`.
- **Verified:** the tracked tree was clean at session start. The 178 untracked
  files total about 45.3 MB and consist of local `.claude` data, two old
  baseline files, the `fable-transfer-kit`, and 155 historical live-fixture
  files. They are user-owned and excluded from staging or cleanup.
- **Verified:** `.env.local` declares the OpenAI, Serper, and SearchAPI keys and
  locally enables Direct Terra. Secret values are not plan evidence and must
  never be logged, copied, or committed.
- **Authority note:** the 2026-08-29 production-readiness mandate explicitly
  requires this master-plan file and authorizes ordinary local implementation,
  bounded low-parallelism live QA, documentation, and self-contained commits.
  This is a direct exception to the older roadmap's prohibition on new plan
  documents and its per-phase approval wording. It does not weaken any product,
  evidence, privacy, credential, spending, deployment, or destructive-action
  boundary.

## Current-state assessment

### Architecture

- **Verified:** the legacy route performs helper-model planning, Serper
  discovery, final hosted-search research, deterministic citation and
  requirement validation, enrichment/rescue, scoring, and optional narration.
- **Verified:** Direct Terra is a separate experimental report path. Its
  committed defaults are off, although the developer's local configuration
  currently enables it.
- **Verified:** OAI-T10 introduces a second default-off experimental path:
  Terra/high research, deterministic server verification, then a separate
  Terra/medium no-web presentation call.
- **Historical and code-verified:** the first OAI-T10 Phase D `shop vac`
  attempt completed provider research with 21,932 input tokens, 5,318 output
  tokens, two hosted searches, and 36 response-owned sources. ReviewRadar then
  rejected it as `invalid_research_contract` before verification,
  presentation, Serper Shopping, page fetching, or rendering.
- **Verified baseline defect:** `pollStagedTerraResearch()` returned the
  bounded `validationReason`, but the route dropped it from failed
  `research_poll` diagnostics.
- **Verified correction:** failed research diagnostics now retain only one of
  the four closed research-validation classes. Unknown values, raw output,
  provider IDs, prompts, source URLs, headers, and secrets remain absent from
  both diagnostics and public responses.
- **Verified baseline defect:** `estimatePhaseDCost()` counted only diagnostics
  whose route outcome was `completed`, excluding billable provider-complete
  research when local contract validation subsequently failed.
- **Verified correction:** the estimator now prices terminal provider usage
  after local failure, merges only repeated snapshots with the same nonempty
  response hash, sums distinct or unidentifiable responses conservatively, and
  fails successful acceptance on any duplicate terminal anomaly.

### Fresh deterministic baseline at `dc9ab1f`

| Check | Result | Interpretation |
| --- | --- | --- |
| `npm run typecheck` | passed | TypeScript baseline is green. |
| `npm run lint` | passed with 0 errors and 3 pre-existing warnings | Warnings are two unused test callback parameters and one unused test variable. |
| `npm test` | 1,430/1,430 passed across 209 suites | Broad deterministic wall is green. |
| `npm run build` | passed | Next.js production compile and six static pages succeeded. |
| `node scripts/eval-pipeline.mjs` | passed; no red flags | Synthetic safety cases pass; this is not market-quality proof. |
| `node scripts/ab-ranking.mjs` | passed; fixed six-product order unchanged | Current flag comparison does not demonstrate a quality gain. |
| Five deterministic QA workers | all exited 0 with no findings | Each worker runs the same shared synthetic evaluator; it does not execute its listed category searches in deterministic mode. |
| `npm run test:e2e` with developer flags | 5/17 passed | Eleven failures were caused by Direct-Terra `.env.local` routing around the mocked legacy endpoint; one preview assertion used a stale accessible name. |
| Focused E2E with process-only default-off flags | 2/3 passed | Confirms routing contamination. The remaining preview rendered the correct two links as `View at example.com`, not the obsolete `Product website` name. |

The old untracked `.rr_baseline` is rejected as an accuracy baseline: it
recorded two errors, zero provider calls, approximately 13 ms per run, zero
leaders, and zero exact matches. It measures a failed harness/environment, not
shopper-facing recommendation quality.

### PR-0/PR-1 verification after correction

| Check | Result | Interpretation |
| --- | --- | --- |
| Fail-first staged route and cost tests | exactly 2 intended failures | Established the missing bounded reason and false-zero terminal spend before implementation. |
| Focused staged wall | 33/33 passed across 7 suites | Covers all four validation classes, unknown-reason rejection, prompt/secret/raw/ID/URL leak negatives, failed terminal usage, same-response deduplication, and conservative distinct/unknown accounting. |
| `npm run typecheck` | passed | The closed diagnostic type and route integration compile. |
| `npm run lint` | 0 errors, 3 pre-existing warnings | No new lint debt. |
| `npm test` | 1,435/1,435 passed across 209 suites | Complete deterministic wall remains green. |
| `npm run test:e2e` | 17/17 passed | Playwright owns a dedicated server, forces committed default-off routing, and neutralizes inherited OpenAI, Serper, SearchAPI, and job-token credentials. |
| `npm run build` | passed | Production compile and six static pages succeeded; `next-env.d.ts` returned to its tracked production form. |
| Synthetic eval and ranking comparison | passed; no red flags; fixed order unchanged | No product-quality gain is claimed from this prerequisite phase. |
| Historical Phase D fixture replay | `$0` stored; `$0.154600` standard / `$0.168307` conservative recomputed | The consumed failed request is now cost-accounted without changing its immutable evidence. Its missing validation class cannot be recovered retroactively. |
| Phase D dry run | passed; zero network | Frozen case, ceilings, and no-retry/no-fallback policy remain intact. |
| Independent read-only diff review | `APPROVED` after one correction round | Initial review caught inherited live credentials and possible distinct-response undercount; both were corrected and re-reviewed. |

### Live baseline

- **Verified:** one commit-pinned PR-2 attempt ran at
  `a15d935747313f9a87a3b145caa34ad6d2f6c8b6` using only the frozen broad
  `shop vac` case. It stopped at the first terminal response after 36.886
  seconds with HTTP 502 `research_failed` and the newly retained class
  `research_candidate_invalid`.
- The provider completed one Terra/high research response with 21,478 input
  tokens, 5,450 output tokens, two hosted searches, and 36 response-owned
  sources. ReviewRadar failed before deterministic verification, presentation,
  Serper Shopping, page fetching, public cards, or sources.
- Counters stayed inside the envelope: one create, sixteen retrieves, one
  safety cancel, zero retries/replacements/fallbacks, and no SearchAPI, Serper
  organic, Shopping, or page requests. The sanitized untracked evidence contains
  no raw output, provider ID, prompt, source URL, header, secret, or API key.
- The immutable July approval envelope estimates `$0.155445` nominal and
  `$0.168869` conservatively. The official OpenAI
  [Terra model page](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
  and [pricing page](https://developers.openai.com/api/docs/pricing), checked on
  2026-08-29, list lower current standard rates of `$2.00` input, `$0.20`
  cached input, and `$12.00` output per million tokens plus `$0.01` per web
  search, which implies approximately `$0.128356` for this usage. Plan and new
  sanitized evidence schema v2 expose `approvalEnvelopeUsd`,
  `approvalEnvelopeConservativeUsd`, and `currentEstimateUsd` with both source
  dates. Only `approvalEnvelopeConservativeUsd` can trip the unchanged `$3`
  ceiling. Immutable v1 fixtures retain their historical field names.
- No retry or replacement of this spent attempt is permitted. PR-2A performed
  the subsequent zero-live contract alignment, and PR-2B corrected the cost
  evidence labels; only a new-commit, new-directory attempt can now answer the
  remaining feasibility question.

### PR-2A candidate-contract correction

- **Verified fail-first defect:** `staged-terra-research-v1` required the model
  to author `candidate_id` and `fact_id`. The validator demanded exact
  array-relative numbering, while the candidate schema guaranteed only a loose
  pattern, the fact schema guaranteed no numbering pattern, and the prompt did
  not define fact-ID syntax. The schema also fixed requirement count and IDs but
  could not guarantee the exact runtime order.
- **Verified correction:** contract, research schema, and research prompt v2
  remove model-authored internal IDs. ReviewRadar assigns `candidate_<n>` and
  `candidate_<n>_fact_<m>` by validated array order, accepts the exact unique
  requirement-ID set in any response order, and emits canonical requirement
  order downstream. Non-whitespace string rules now appear in both schema and
  validator.
- **Privacy and rollover:** candidate failures may add only one server-side
  group—identity, sources, requirements, or facts—under
  `research_candidate_invalid`. The route independently guards both enums and
  never exposes either in the public body. Contract v2 changes the request
  fingerprint so an old in-flight token fails closed across a version rollover.
- **Verification:** fail-first was 18 pass / 4 intended fail. Final staged wall
  passed 54/54, full tests passed 1,438/1,438 across 209 suites, E2E passed
  17/17, and typecheck, lint (0 errors / 3 pre-existing warnings), production
  build, synthetic eval, fixed ranking comparison, Phase D dry run, and diff
  checks passed. Independent read-only review returned `APPROVED`; the reviewer
  personally ran 40/40 scoped staged tests, non-incremental typecheck, and diff
  checks.
- **Limitation:** this proves and corrects a generalized acceptance defect in
  the live failure class; privacy-preserving evidence cannot prove which exact
  field failed in the spent response. No provider, search, Shopping, or page
  request ran during PR-2A.

### PR-2B frozen/current cost-evidence correction

- **Verified defect:** Phase D intentionally retained its 2026-07-25 approval
  rates, but emitted them as `standardUsd` and `conservativeUsd`. The first name
  could be mistaken for current billing, and the evidence carried no separately
  reproducible current estimate.
- **Verified correction:** plan schema v2 nests a frozen `approvalEnvelope` and
  a dated `currentEstimate`. Cost evidence now uses
  `approvalEnvelopeUsd`, `approvalEnvelopeConservativeUsd`, and
  `currentEstimateUsd`, plus explicit source dates. The current card is labeled
  `standard_non_regional`; regional billing remains outside this estimate.
- **Safety boundary:** the runner persists both rate cards but evaluates the
  unchanged `$3` hard ceiling only against the frozen conservative approval
  envelope. Historical v1 fixtures remain immutable. Terminal-failure usage,
  successful two-stage accounting, and same-hash-only deduplication are
  unchanged.
- **Verification:** fail-first was 5 pass / 5 intended fail; focused Phase D
  tests passed 10/10; the staged subsystem passed 56/56; the full suite passed
  1,440/1,440 across 209 suites; E2E passed 17/17; typecheck, lint (0 errors / 3
  pre-existing warnings), production build, synthetic eval, fixed ranking
  comparison, zero-network dry run, and diff checks passed. Independent
  read-only review returned `APPROVED`; the reviewer personally reran 10/10
  focused tests and inspected the full scoped runner path and accounting gates.
- **Limitation:** this repairs reporting integrity, not route feasibility or
  shopper-result quality. No provider, search, Shopping, or page request ran.

## Confirmed defects and weaknesses

| ID | Severity | Status | User impact and evidence | Likely root cause | Generalized solution | Required proof | Risk, rollback, dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR-001 | P1 | verified | A provider-complete staged search failed with no retained contract class, blocking an evidence-based accuracy repair. | The route diagnostic type and failed `research_poll` report omitted the runtime's bounded `validationReason`. | A closed server-only research-validation-reason field now survives the route and sanitized harness; the runtime guard rejects every other value. Raw output, response IDs, URLs, prompts, headers, and secrets remain absent. | Fail-first route test; replay of all four classes; unknown-reason and leak-negative assertions; focused and complete walls; independent approval. | Closed locally. The historical missing class is unrecoverable; the next live result will be attributable. Roll back the field/report/test commit if private data ever crosses the boundary. |
| PR-002 | P1 | verified | The consumed Phase D request was billed but recorded as `$0`, weakening cost control and readiness evidence. | The estimator equated route success with billable provider completion. | Terminal provider usage is now accounted regardless of later local outcome. Only a matching nonempty response hash deduplicates; distinct or unknown responses sum conservatively, and any duplicate terminal anomaly blocks acceptance. | Historical exact-usage replay; successful research+presentation control; pending/start exclusion; same-response and distinct/unknown adversarial tests; exact expected costs. | Closed locally. Roll back if independent billing evidence ever shows over- or under-counting. No network dependency. |
| PR-003 | P1 | verified | Required E2E checks produced 11 false failures whenever a developer enabled Direct Terra locally, hiding real regressions and encouraging ignored checks. | Playwright's dev server inherited `.env.local`; tests intercepted `/api/recommendations` while the browser called `/api/recommendations-v2`. | The E2E server owns a dedicated port, forces committed default-off/legacy routing, disables server reuse, and explicitly neutralizes all provider/job credentials. The developer's `.env.local` is untouched. | Full 17/17 E2E under the existing local config; independent inspection of Playwright's environment merge; no production code change. | Closed locally. Experimental-path E2E must opt into its own isolated fixture and credentials boundary. |
| PR-004 | P2 | verified | One valid Direct-Terra preview failed its test even though the two safe links rendered. | UI copy changed from generic `Product website` to the more informative `View at <host>` accessible name; the test stayed exact-string brittle. | The test now asserts the user-visible role/name pattern and both links' safe target/rel attributes. | Full E2E passes and still requires both safe links. | Closed; test-only rollback. |
| PR-005 | P1 | investigating | Five named deterministic QA batches report different search pools but all execute the same five synthetic eval cases. A green batch can falsely imply that its listed categories, fake-price traps, or non-product pages were exercised. | `runDeterministicBatch()` delegates every batch to `eval-pipeline.mjs` and records the batch searches only as metadata. | Build a reusable offline benchmark matrix whose fixtures/invariants are actually selected by batch. Preserve category diversity without exact-name brittleness. | Fail-first test showing two batches currently execute identical cases; per-batch executed-case IDs; cross-category positive/negative invariants; controller reconciliation. | Medium harness-design risk and fixture work. Do not claim quality improvement from harness changes alone. Depends on trustworthy fixtures. |
| PR-006 | P1 | investigating | Current market-leader recall, final-set stability, exact/near truth, price coverage, and first-loss distribution are not established for today's commit. Historical evidence found zero final overlap and severe leader loss. | Provider variance, planning variance, discovery loss, strict evidence gates, and/or ranking may contribute; attribution remains unmeasured on the active path. | After feasibility, run a bounded benchmark matrix with repeated broad and constrained cases, record candidate and final Jaccard, hard-requirement truth, first-loss stage, latency, calls, and cost. Fix only the earliest repeated generalized loss. | Commit-pinned fixtures, market-coverage sets reviewed for recency, repeated samples, invariant-based scoring, before/after controls across unrelated categories. | High cost/variance risk. Stop on any safety failure. Requires PR-001/002 and a passing staged feasibility result. |
| PR-007 | P1 | investigating | RR-091 says same-page related-product price can satisfy autonomous card binding. A wrong variant price is release-blocking if the affected path is promoted. | Product entity selection may not bind offer identity tightly enough when multiple products share a page. | Reproduce with tracked synthetic multi-entity pages, then require exact entity/offer binding using shared identity rules. | Original and cross-category reproductions; exact-product positive controls; no unsafe price/product URL; full price and identity wall. | High false-negative/false-positive risk. The affected experimental path remains default-off; no promotion before closure. |
| PR-008 | P1 | investigating | RR-092 says editorial Product markup can verify identity/image without proving the tested model. A wrong model image/link is release-blocking if promoted. | Structured markup establishes a product entity without sufficient tested-model attribution or page role. | Require exact tested-model attribution from eligible page evidence; editorial markup remains evidence-only unless the commerce/page boundary independently passes. | Editorial review negatives, manufacturer/retailer positives, sibling-model and accessory mutations, asset-wall regression. | High asset-recall tradeoff. Default-off path must stay off until resolved. |
| PR-009 | P1 | corrected locally; live revalidation pending | The commit-pinned PR-2 request completed provider research but failed before verification as `research_candidate_invalid`. No staged result has reached users. | The v1 schema made the model author internal candidate/fact IDs while runtime required stricter array-relative values not fully specified by schema/prompt; it also rejected requirement ordering the schema could not constrain. The exact old failing field remains private and unknown. | Research contract/schema/prompt v2 make IDs server-owned, validate the exact unique requirement set before canonical ordering, align non-whitespace constraints, and retain only a guarded candidate field-group reason. Trust gates remain unchanged. | Fail-first 18 pass / 4 intended fail; candidate group matrix; staged 54/54; full 1,438/1,438; E2E/build/static/eval/ranking/dry-run walls; independent review. | Local correction is complete and default-off. A future one-attempt, new-commit/new-directory feasibility check is still needed; never reuse either spent attempt. |
| PR-010 | P2 | verified | The Phase D estimator's field named `standardUsd` used its frozen 2026-07-25 rates, while official current Terra prices are lower. Readiness reporting could confuse a conservative approval rate with current estimated spend. | The rate object was intentionally frozen for approval reproducibility but the output label did not distinguish frozen-envelope and current-market estimates. | Plan/evidence schema v2 names the dated frozen approval envelope and dated `standard_non_regional` current estimate separately. Only the frozen conservative value controls the unchanged hard ceiling. | Fail-first 5 pass / 5 intended fail; exact short/long/cache-write/search rates and totals; focused 10/10; staged 56/56; full 1,440/1,440; E2E/build/static/eval/ranking/dry-run walls; independent review. | Closed locally without live spend. Re-check and date the informational card when official prices change; never silently reprice an existing approval envelope. |

## Suspected weaknesses requiring measurement

| ID | Severity | Status | Hypothesis and expected impact | Measurement before implementation | Risk and dependency |
| --- | --- | --- | --- | --- | --- |
| PR-S01 | P1 | investigating | Broad searches may miss mainstream leaders before ranking because of query crowd-out, source imbalance, or candidate budgets. | Compare raw provider rows, admitted candidates, verified candidates, and final cards for a reviewed multi-category leader matrix. | Market lists drift; review them before treating absence as a defect. |
| PR-S02 | P1 | investigating | Exact matches may still contain unverified hard facts or misleading current prices on the legacy path under unusual page/offer shapes. | Mutation corpus for numeric, compatibility, availability, financing, promo, used/refurbished, related-product, and conflicting-price pages plus bounded live traps. | Never increase exact counts by weakening unknown/fail handling. |
| PR-S03 | P1 | investigating | Duplicate variants or over-collapse may waste slots or hide meaningfully distinct products. | Trace canonical identity and variant-family decisions on same-brand/same-size and distinct-size/model families across categories. | Identity fixes can cause both false merges and false splits. |
| PR-S04 | P2 | investigating | Users may confuse Important Details, inferred dealbreakers, and the display-only strength slider. | Accessibility/UX walkthrough, field comprehension review, and E2E proof of what changes the request versus only the display. | A new avoid field changes request UX and should follow observed confusion, not aesthetic preference. |
| PR-S05 | P1 | investigating | Cancellation, provider timeouts, retry ownership, and partial-success behavior may leave work running or surface generic failures in edge states. | Deterministic lifecycle fault injection at every create/retrieve/fetch/presentation boundary; inspect one bounded live cancellation only if offline proof is insufficient. | Do not create extra provider jobs merely to test cleanup. |
| PR-S06 | P1 | investigating | Cache keys, TTLs, and flag/config differences may contaminate requests or make development tests unrepresentative. | Enumerate caches and key inputs; mutation tests for request, flag, model, and evidence differences; restart and concurrency tests. | Avoid clearing user data or relying on global mutable state. |
| PR-S07 | P1 | investigating | Input limits, rate limiting, unsafe URL handling, redirect safety, and log redaction may have untested operational gaps outside the existing trust boundaries. | Threat-model route and external-fetch surfaces, then add bounded payload, SSRF, redirect, injection, and log-leak tests. | Security fixes take priority over performance work. |
| PR-S08 | P2 | investigating | One-to-three-minute latency and provider cost may be dominated by redundant stages, retries, or low-yield enrichment. | Use stage timing, call counts, candidate contribution, cache hit rate, and accuracy-preserving ablations on the same cases. | A faster wrong answer is a regression; require unchanged or better quality gates. |

## Unknown-unknown investigation areas

1. Generate malformed but schema-near provider outputs and mutate source
   registries, identities, candidate order, requirement order, URLs, prices,
   and page roles to find validator blind spots.
2. Trace every displayed field backward to its owning evidence and test that
   cross-candidate, cross-variant, cross-page, and cross-request borrowing is
   impossible.
3. Exercise categories absent from hand-written profiles and common historical
   fixtures, including services-adjacent goods, bundles, configurable products,
   replacement ecosystems, and marketplace-only products.
4. Test repeated and concurrent identical/different requests for state,
   cancellation, completion, and cache races.
5. Review browser behavior at narrow widths, keyboard-only navigation, reduced
   motion, slow networks, broken images, long titles, missing prices, missing
   sources, empty results, and provider errors.
6. Audit production configuration, health diagnostics, deployment/rollback
   documentation, dependency risk, and secret/log boundaries without exposing
   credentials or changing external systems.

## Execution sequence

### Phase PR-0 — Make the baseline gate hermetic

- Status: **verified 2026-08-29**
- Severity addressed: PR-003 P1, PR-004 P2.
- Expected user impact: indirect but necessary; real UI regressions can no
  longer be hidden by developer-specific routing or a stale selector.
- Changes: Playwright-only environment isolation and the smallest resilient
  preview assertion.
- Proof: full 17-test E2E suite under the current `.env.local`, then complete
  deterministic wall and diff review.
- Rollback: revert only the Playwright/test changes.
- Reasoning: **Medium**.

### Phase PR-1 — Recover safe staged failure attribution and honest spend

- Status: **verified 2026-08-29**
- Severity addressed: PR-001 and PR-002 P1.
- Expected user impact: unlocks the first evidence-based correction to the
  active staged architecture and prevents false-zero cost reporting.
- Changes: closed validation-reason diagnostic, terminal usage accounting,
  replay matrix, leak-negative tests.
- Proof: focused fail-first/final tests, all validation classes, historical
  usage total, full deterministic/E2E/build walls, independent diff review.
- Rollback: one self-contained commit; no contract/prompt/flag behavior change.
- Reasoning: **High**.

### Phase PR-2 — One commit-pinned staged feasibility recheck

- Status: **closed — failed safely at first terminal outcome on 2026-08-29**
- Severity addressed: PR-006 prerequisite.
- Dependency: PR-1 green and committed; exact unused evidence directory;
  process-only keys; clean tracked tree.
- Envelope: the existing single broad `shop vac` Phase D case and existing
  ceilings only. No additional case, retry, replacement, fallback, flag
  promotion, deployment, production change, or push.
- Stop condition: the first terminal outcome. If contract validation fails,
  use the retained enum to choose prompt, schema, adapter, or duplicate-identity
  work; do not guess.
- Reasoning: **High** for outcome adjudication; execution itself is routine.

Result: one provider-complete response failed as
`research_candidate_invalid`; all network and cost ceilings held, no private
material was retained, and no retry ran. This proves real Responses lifecycle
reachability but not staged feasibility.

### Phase PR-2A — Diagnose and correct candidate-contract alignment

- Status: **verified locally 2026-08-29; no live revalidation**
- Severity addressed: PR-009 P1. PR-010 was closed separately in PR-2B.
- Scope: zero-live comparison of the research prompt, strict JSON schema,
  provider adapter, and every validator branch; fail-first deterministic proof
  for any actual mismatch; smallest generalized correction only.
- Proof: candidate-field and mutation matrix, full staged wall, complete suite,
  E2E/build, independent review, and a clean committed default-off state.
- Stop condition: if static evidence cannot identify the exact invariant, add a
  safe field-level reason enum only if it can be proven privacy-preserving; do
  not retain raw candidate data and do not spend again.
- Reasoning: **High**.

Result: v1 exposed server-internal IDs to the model without schema/prompt rules
strong enough to satisfy the runtime and required an unexpressed order. V2 owns
IDs server-side, canonicalizes the exact requirement set, and adds a closed
field-group diagnostic. All local gates passed. The exact spent-output field and
live feasibility remain unknown.

### Phase PR-2B — Make frozen and current spend estimates unambiguous

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-010 P2.
- Scope: preserve the immutable July approval-envelope rates and `$3` gate, but
  rename their outputs so they cannot be mistaken for current billing. Add a
  separately dated current-rate estimate only if it can remain reproducible and
  official-source-bound.
- Proof: fail-first exact-label/rate tests, historical fixture totals,
  long-context/cache-write/search cases, staged/full walls, and dry run.
- Stop condition: do not weaken or silently reprice the approved hard ceiling;
  do not make a live request.
- Reasoning: **Medium** for localized evidence/accounting plumbing.

Result: plan/evidence schema v2 now carries dated frozen and current rate cards,
rejects the ambiguous v1 output keys, and gates only on the frozen conservative
value. All deterministic gates passed and no external request ran.

### Phase PR-2C — Re-test staged contract-v2 feasibility once

- Status: **next after the PR-2B closeout commit**
- Dependency: PR-2A and PR-2B are independently approved and committed; the
  exact new commit and a new commit-specific evidence directory pass preflight.
- Scope: run exactly one frozen broad `shop vac` request through the complete
  staged route. Use the existing create/search/retrieve/cancel/page ceilings,
  no retry, replacement, fallback, or second case, and stop at the first
  terminal outcome.
- Decision value: a completion proves only lifecycle feasibility and permits a
  later bounded benchmark. A new candidate failure must be attributed from the
  closed server-only class/subreason and corrected offline before any more
  spend. Any safety, privacy, usage, or ceiling anomaly stops the program.
- Proof: commit-pinned sanitized evidence, exact counters/usage/cost, full
  acceptance gates on success, privacy scan, and post-run clean-state audit.
- Reasoning: **High** for outcome adjudication; execution is routine and
  strictly bounded.

### Phase PR-3 — Build a real offline benchmark matrix

- Status: **planned**
- Severity addressed: PR-005 P1.
- Scope: make each deterministic QA batch execute relevant tracked cases and
  invariant checks, including broad, constrained, over-constrained,
  wrong-type, fake-price, non-product, duplicate, compatibility, and missing
  evidence traps.
- Proof: executed-case IDs, per-batch distinct coverage, mutation tests, and
  controller reconciliation.
- Reasoning: **High** for evaluation validity, **Medium** for fixture plumbing.

### Phase PR-4 — Measure active-path accuracy, stability, latency, and cost

- Status: **planned**
- Dependency: staged feasibility passes and benchmark matrix is trustworthy.
- Run low-parallelism broad/constrained/adversarial/over-constrained cases
  across materially different categories, with repeated samples only for
  high-risk cases.
- Record leader coverage, exact/near truth, wrong-type and page leakage,
  duplicate families, verified price coverage, first-loss stage, final/pool
  Jaccard, stage timing, calls, tokens, and estimated cost.
- Stop immediately on any P0/P1 safety or trust failure.
- Reasoning: **High**.

### Phase PR-5 — Correct the highest-impact repeated first loss

- Status: **planned**
- Select only after PR-4 evidence. Add fail-first regression coverage, make one
  generalized correction, run focused and broad controls, compare against the
  same baseline, reject or revert speculative complexity, document, and commit.
- Repeat this phase while each retained correction improves a North-Star metric
  or closes a release blocker.
- Reasoning: **High** for root-cause selection; **Medium** for routine localized
  implementation.

### Phase PR-6 — UX, resilience, security, and operational closure

- Status: **planned**
- Address proven comprehension, accessibility, cancellation, partial-success,
  cache, rate/payload, URL/redirect, redaction, health, configuration,
  dependency, deployment, and rollback gaps.
- Do not redesign for appearance or perform broad dependency upgrades without
  evidence.
- Reasoning: **High** for security/reliability boundaries; **Medium** for
  localized UX and documentation fixes.

### Phase PR-7 — Final adversarial readiness review

- Status: **planned**
- Run every required check, the real deterministic QA loop, relevant bounded
  live matrix, accessibility/mobile flows, security/config review, and an
  independent final diff/adversarial pass.
- Create `docs/production-readiness-report.md` with an evidence-bound `READY`,
  `CONDITIONALLY READY`, or `NOT READY` verdict and confidence.
- Production readiness requires no known release-blocking defect, not merely a
  long session or a green synthetic suite.
- Reasoning: **Highest** for final adjudication.

## Phase documentation and commit policy

For each meaningful verified phase:

1. Update this plan's evidence and statuses.
2. Append canonical before/after evidence to `docs/qa-loop-results.md` without
   rewriting prior attribution.
3. Append a dated `docs/change-log.md` entry only for meaningful product or
   important reliability changes.
4. Update `ReviewRadar-Overview.md` only for architecture, behavior, API, or
   important system-rule changes.
5. Append `docs/Agent Run Summary.md` with goal, checks, findings, change,
   tests, live calls, proof, remaining issues, and next step.
6. Regenerate `docs/agent-next-task.md` at phase closeout with current commit,
   flags, boundaries, debts, and verification.
7. Stage only phase-owned files with explicit paths and make a self-contained
   local commit after all relevant checks pass. Never stage the existing
   untracked fixtures, local configuration, baselines, `.claude`, or
   `fable-transfer-kit`.

No deployment, push, force operation, production change, secret exposure,
user-data deletion, or unrelated cleanup is authorized by this plan.

## Exit criteria tracking

Current verdict: **NOT READY** (confidence 0.98).

Release blockers today:

- staged research feasibility has not passed; the current failure is narrowed
  to candidate validation, but its exact field/invariant is not yet proven;
- deterministic QA batch names overstate the distinct cases actually run;
- current live accuracy, stability, latency, and cost have not been measured;
- RR-091 and RR-092 remain unresolved for an experimental path that cannot be
  promoted safely.

The verdict can improve only through the required evidence above. Passing
unit tests alone cannot change it.

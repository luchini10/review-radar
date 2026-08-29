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

The newest staged Terra path has not yet produced a user-visible live result.
PR-2H deterministically closed one research/asset identity self-mismatch, but
the single post-correction PR-2I measurement stopped earlier: Terra completed
research with 47 canonical sources, and local contract validation returned
`research_candidate_invalid / candidate_facts` before verification. The fixed
sanitized evidence can establish only that the first reported invalid candidate
reached its fact group; it cannot identify the candidate or field, show raw
output, or prove that later candidates passed identity.

PR-2I was bound to clean commit
`06fa55fb38f6675a897053eb21328ac8845d4e14` and stopped once after 54.485
seconds. It used one create, 24 retrieves, three hosted searches, and one safety
cancel, with zero Shopping/page/presentation/retry/replacement/fallback work.
Usage was 30,215 input and 7,537 output tokens. Frozen-conservative cost was
`$0.237477`, below the unchanged `$3` gate. Independent read-only audit returned
`VERIFIED`; the spent fixture retained no raw/private provider or candidate
material and neither configured key value.

A separate zero-network matrix proved a generalized producer/parser mismatch.
The old strict schema and prompt allowed a fact or requirement URL that was
registered to the response but absent from its enclosing candidate's
`source_urls`; they also did not express lead-reference uniqueness or the
supporting/not-found URL cardinality enforced by the validator. A schema-
conforming cross-candidate fact URL failed exactly as `candidate_facts`. This
could produce PR-2I's bounded class, but the private live response cannot prove
that it did. PR-2J now closes the reproduced mismatch deterministically with
candidate-local indexes, schema-level status cardinality, runtime range/
uniqueness revalidation, and complete job-identity rollover. It made no live
request and therefore proves no provider adherence or lifecycle success.

Stronger alternatives considered:

- **Retry PR-2I:** rejected. The first terminal result answered the authorized
  measurement, and its directory is permanently spent. A retry would spend
  against an already-proven model-facing contract mismatch.
- **Accept any response-owned lead URL:** rejected. That would let one
  candidate borrow another candidate's evidence and weaken product attribution.
- **Add prompt prose only:** rejected as incomplete. It can reduce mistakes but
  cannot structurally prevent cross-candidate URL references or repeated long
  exact strings.
- **Use candidate-local integer source references:** selected and verified in
  PR-2J. It preserves the exact candidate-declared source boundary, makes a
  lead unable to directly cite a response URL absent from its enclosing source
  list, and reduces repeated URL output. Official OpenAI
  [Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs)
  supports integer arrays, nested `anyOf`, and numeric/array bounds. The schema
  now enforces status cardinality; runtime independently rechecks it and retains
  candidate-length-dependent range and uniqueness rules that the schema cannot
  express.
- **Tune legacy discovery or ranking first:** deferred. Historical evidence
  shows serious recall and stability weakness, but the current strategic path
  now stops before verification and presentation.
- **Add candidate/private fact diagnostics:** rejected. The generalized defect
  is reproducible without widening the fixed privacy surface.
- **Expand immediately into a broad benchmark:** deferred. The benchmark is
  necessary, but no staged result exists yet; it would measure an architecture
  whose active lifecycle still has not crossed research validation reliably.

PR-3 now closes that evaluation-integrity defect without changing production
behavior. Five named batches uniquely partition ten tracked cases and 29
invariants across all required request/trap shapes. Results persist exact case
IDs and outcomes; reconciliation rederives every invariant from the persisted
exact/near streams, tracked bounds/statuses, and a complete candidate ground-
truth registry. Missing, duplicate, unknown, mismatched, fabricated, or
incomparable work fails closed while authentic historical failing evidence
remains comparable after a fix.

The strongest next step is one bounded post-PR-2J staged lifecycle feasibility
revalidation. The benchmark is now trustworthy, but PR-4 accuracy measurement
still cannot start because the active staged path has never produced a shopper
result. The existing frozen `shop vac` Phase D runner provides a stricter and
cheaper answer than a broad live matrix: one exact commit, one case, no retry,
replacement, fallback, or second case, and a first-terminal stop. If it fails,
fix only a newly reproduced generalized cause or retain the blocker.

Recommended reasoning level: **High** for the live trust/cost boundary and
terminal-evidence adjudication; **Medium** for the bounded mechanical run.

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

### PR-2C contract-v2 live stop

- **Verified outcome:** the one new-commit, new-directory `shop vac` attempt at
  `140d465a0ac835efb73713e988c140b7e35be6e9` completed Terra research but
  failed closed as `research_candidate_invalid / candidate_sources`. It stopped
  after 64.959 seconds before deterministic verification, presentation,
  Shopping, page fetching, or rendering.
- **Envelope:** one create, 29 retrieves, six hosted searches, and one safety
  cancel; zero retries, replacements, fallbacks, second cases, Shopping, page,
  Serper organic, or SearchAPI calls. Returned usage was 57,041 input and 6,744
  output tokens. Cost was `$0.303762` frozen nominal, `$0.339413` frozen
  conservative, and `$0.255010` at the dated current card.
- **Privacy:** sanitized evidence schema v2 contains only approved fields, three
  official pricing-source URL values, and 64-character response hashes. It
  contains no raw output, provider ID, prompt, product-source URL, header, key,
  secret, body, or candidate object; both local key values are absent.
- **Attribution limit:** `candidate_sources` proves only that at least one
  candidate source array was duplicate, unsafe/malformed, or not an exact member
  of the retained response-owned registry. It does not identify which branch.
- **Verified static risk:** the shared response-source extractor canonically
  deduplicates URL variants and retains only the first exact string, while the
  staged contract requires exact string membership. A synthetic two-variant
  response proves the later response-owned exact variant is lost. This is a
  generalized self-mismatch, but the sanitized live evidence cannot prove it
  caused PR-2C. Independent read-only content and clean-state audit returned
  `VERIFIED` and agreed the exact live source branch is not inferable.

### PR-2D exact source-ownership closeout

- **Verified root cause:** the canonical display extractor merged tracking-
  equivalent response-owned URLs and retained only the first exact string. The
  staged validator then required exact string membership, so a later exact
  response-owned variant could be rejected as unregistered.
- **Correction:** a dedicated exact ownership extractor preserves each
  parseable response-owned action/citation URL string once for staged
  validation only. Canonical display and source-count behavior remains
  unchanged. Exact ownership, uniqueness, HTTPS, credential/port/private-host,
  count, and downstream evidence gates remain fail closed.
- **Attribution:** candidate source failures may retain only shape, duplicate,
  unsafe, or unregistered beneath the existing candidate-source group. The
  route independently guards the hierarchy; no URL or private candidate data
  enters diagnostics or the generic public failure.
- **Versioning:** contract v3 changes the request fingerprint and rejects older
  jobs. Runtime v2 records the new semantics; research schema/prompt remain v2
  because their wire contract did not change.
- **Verification:** fail-first 27 pass / 3 intended fail; focused 55/55; staged
  59/59; full 1,444/1,444; E2E 17/17; typecheck, build, eval, ranking, dry run,
  lint, and diff checks passed. Independent read-only review returned
  `APPROVED` after personally rerunning focused/full tests and typecheck.
- **Limitation:** no external request ran. This closes the deterministic
  registry defect, not the unknown historical branch or live feasibility.

### PR-2E post-correction verification stop

- **Verified outcome:** the one new-commit, new-directory `shop vac` attempt at
  `56a513784e195ee255410e6f49d29763d87af5c7` passed research validation, then
  failed closed as `verification_failed` after 59.154 seconds. Presentation and
  rendering did not run.
- **Envelope:** one create, 23 retrieves, four hosted searches, one safety
  cancel, 12 Shopping requests, 13 source fetch/HTTP attempts, and zero retries,
  replacements, fallbacks, second cases, Serper organic, or SearchAPI calls.
- **Verification evidence:** research returned 12 candidates and recorded 73
  canonical response sources. Verification then made 12 Shopping requests that
  returned 212 rows; 13 bounded page fetches produced three successes. The
  verifier returned zero eligible, zero close match, and 12 excluded candidates.
- **Usage/cost:** 38,274 input, zero cached input, 6,884 output, and four hosted
  searches; `$0.238945` frozen nominal, `$0.262866` frozen conservative, and
  `$0.199156` current. One completed ledger was accounted without duplication.
- **Privacy/stop:** the fixture has only approved pricing URLs and a hashed
  response identity, no prohibited private fields or local key value, no public
  response/result file, and remains untracked/spent. Independent audit returned
  `VERIFIED`.
- **Attribution limit:** the route discards the verifier's safe structured
  per-candidate diagnostics and retains only aggregate outcome/network counts.
  The evidence therefore cannot identify identity, complete-product type,
  requirement failure/unknown, or source/claim rejection. Do not guess.

### PR-2G attributable asset-identity stop

- **Verified outcome:** the one attempt at
  `b01c335908e78101501bf0b40cd833f0e8f3b5d1` passed research with 12
  candidates and 58 canonical sources, then failed closed as
  `verification_failed` after 51.618 seconds. Presentation/rendering did not run.
- **Envelope:** one create, 20 retrieves, three hosted searches, one safety
  cancel, 12 Shopping requests, 12 source fetches, 19 physical page HTTP
  attempts, and zero retries, replacements, fallbacks, second cases, Serper
  organic, or SearchAPI calls.
- **Verification:** seven fetches succeeded and Shopping returned 194 rows.
  Verification classified zero eligible, zero close match, and 12 excluded.
  Evidence v3 conserved all 12 first losses as `assetIdentityUnproven`; every
  later bucket and retained source/claim counter was zero.
- **Usage/cost:** 28,335 input, zero cached input, 6,029 output, and three hosted
  searches; `$0.191272` frozen nominal, `$0.208982` frozen conservative, and
  `$0.159018` current. One completed ledger was accounted without duplication.
- **Privacy/stop:** the spent directory contains only untracked `attempt.json`;
  its only URLs are approved OpenAI pricing sources, both local key values are
  absent, and no raw/private candidate/provider material is retained. Independent
  audit returned `VERIFIED`.
- **Attribution limit:** the aggregate proves only this attempt's earliest loss.
  It cannot distinguish an incoherent target identity from available asset
  titles failing brand/model/conflict/type checks, reveal shadowed later gates,
  or establish a generalized cause.

### PR-2I post-correction research-fact stop

- **Verified outcome:** the one new-directory attempt at
  `06fa55fb38f6675a897053eb21328ac8845d4e14` completed Terra research, then
  failed closed as `research_candidate_invalid / candidate_facts` after 54.485
  seconds. Verification, presentation, Shopping, page fetching, and rendering
  did not run.
- **Envelope:** one create, 24 retrieves, three hosted searches, and one safety
  cancel; zero retries, replacements, fallbacks, second cases, Shopping, page,
  Serper organic, or SearchAPI calls.
- **Usage/cost:** one terminal ledger recorded 30,215 input, zero cached input,
  7,537 output, and three hosted searches. Exact frozen nominal arithmetic is
  `$0.2185925`; JavaScript's binary `toFixed(6)` path stores `$0.218592`.
  Frozen conservative cost was `$0.237477` and the dated current estimate was
  `$0.180874`, below the `$3` gate.
- **Privacy/stop:** the spent directory contains only untracked `attempt.json`
  (21,149 bytes; SHA-256
  `4741a595633335708c2446b1682e05631ab1ed8fb2ef9e0044b41725ce1f9513`).
  Its only URLs are the approved Terra-model and pricing pages. Both configured
  key values and all raw/provider/prompt/body/header, product/source URL,
  candidate/evidence identifier, credential, and secret material are absent.
  There is no public response or `result.json`. Independent audit returned
  `VERIFIED`.
- **Attribution limit:** `candidate_facts` identifies only the field group for
  the first reported invalid candidate. It cannot reveal the exact fact defect,
  candidate, raw output, or whether later candidates passed identity.
- **Separate offline finding:** schema-conforming response-owned URLs can be
  rejected when a fact or requirement lead references a URL outside its own
  candidate source list; source-reference uniqueness and supporting/not-found
  cardinality also differ between producer contract and parser. This is a real
  generalized mismatch that can produce the bounded class, not proof of the
  private PR-2I cause.

## Confirmed defects and weaknesses

| ID | Severity | Status | User impact and evidence | Likely root cause | Generalized solution | Required proof | Risk, rollback, dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR-001 | P1 | verified | A provider-complete staged search failed with no retained contract class, blocking an evidence-based accuracy repair. | The route diagnostic type and failed `research_poll` report omitted the runtime's bounded `validationReason`. | A closed server-only research-validation-reason field now survives the route and sanitized harness; the runtime guard rejects every other value. Raw output, response IDs, URLs, prompts, headers, and secrets remain absent. | Fail-first route test; replay of all four classes; unknown-reason and leak-negative assertions; focused and complete walls; independent approval. | Closed locally. The historical missing class is unrecoverable; the next live result will be attributable. Roll back the field/report/test commit if private data ever crosses the boundary. |
| PR-002 | P1 | verified | The consumed Phase D request was billed but recorded as `$0`, weakening cost control and readiness evidence. | The estimator equated route success with billable provider completion. | Terminal provider usage is now accounted regardless of later local outcome. Only a matching nonempty response hash deduplicates; distinct or unknown responses sum conservatively, and any duplicate terminal anomaly blocks acceptance. | Historical exact-usage replay; successful research+presentation control; pending/start exclusion; same-response and distinct/unknown adversarial tests; exact expected costs. | Closed locally. Roll back if independent billing evidence ever shows over- or under-counting. No network dependency. |
| PR-003 | P1 | verified | Required E2E checks produced 11 false failures whenever a developer enabled Direct Terra locally, hiding real regressions and encouraging ignored checks. | Playwright's dev server inherited `.env.local`; tests intercepted `/api/recommendations` while the browser called `/api/recommendations-v2`. | The E2E server owns a dedicated port, forces committed default-off/legacy routing, disables server reuse, and explicitly neutralizes all provider/job credentials. The developer's `.env.local` is untouched. | Full 17/17 E2E under the existing local config; independent inspection of Playwright's environment merge; no production code change. | Closed locally. Experimental-path E2E must opt into its own isolated fixture and credentials boundary. |
| PR-004 | P2 | verified | One valid Direct-Terra preview failed its test even though the two safe links rendered. | UI copy changed from generic `Product website` to the more informative `View at <host>` accessible name; the test stayed exact-string brittle. | The test now asserts the user-visible role/name pattern and both links' safe target/rel attributes. | Full E2E passes and still requires both safe links. | Closed; test-only rollback. |
| PR-005 | P1 | verified | Five named deterministic QA batches reported different search pools but all executed the same five synthetic eval cases, so green output overstated coverage. | `runDeterministicBatch()` delegated every batch to `eval-pipeline.mjs` and recorded batch searches only as metadata. The controller also overwrote the authoritative handoff and copied Markdown outside the repo. | A tracked 10-case/29-invariant benchmark now gives every batch a unique partition. Results persist executed IDs/outcomes; reconciliation independently rederives them from persisted streams and complete tracked price/product oracles. Controller next-task output is ignored/advisory only, and no Desktop copy occurs. | Fail-first 9 pass / 1 intended fail; corrected focused 26/26; complete 1,477/1,477; exact five-batch reconciliation; benchmark 10/10 and 29/29; E2E/build/static/eval/ranking/dry-run walls; independent `APPROVED`. | Closed without production or live behavior changes. Synthetic fixtures/oracles require deliberate maintenance and do not prove market coverage or provider quality. Ignored artifacts are reconciled, not cryptographically immutable. |
| PR-006 | P1 | investigating | Current market-leader recall, final-set stability, exact/near truth, price coverage, and first-loss distribution are not established for today's commit. Historical evidence found zero final overlap and severe leader loss. | Provider variance, planning variance, discovery loss, strict evidence gates, and/or ranking may contribute; attribution remains unmeasured on the active path. | After feasibility, run a bounded benchmark matrix with repeated broad and constrained cases, record candidate and final Jaccard, hard-requirement truth, first-loss stage, latency, calls, and cost. Fix only the earliest repeated generalized loss. | Commit-pinned fixtures, market-coverage sets reviewed for recency, repeated samples, invariant-based scoring, before/after controls across unrelated categories. | High cost/variance risk. Stop on any safety failure. Requires PR-001/002 and a passing staged feasibility result. |
| PR-007 | P1 | investigating | RR-091 says same-page related-product price can satisfy autonomous card binding. A wrong variant price is release-blocking if the affected path is promoted. | Product entity selection may not bind offer identity tightly enough when multiple products share a page. | Reproduce with tracked synthetic multi-entity pages, then require exact entity/offer binding using shared identity rules. | Original and cross-category reproductions; exact-product positive controls; no unsafe price/product URL; full price and identity wall. | High false-negative/false-positive risk. The affected experimental path remains default-off; no promotion before closure. |
| PR-008 | P1 | investigating | RR-092 says editorial Product markup can verify identity/image without proving the tested model. A wrong model image/link is release-blocking if promoted. | Structured markup establishes a product entity without sufficient tested-model attribution or page role. | Require exact tested-model attribution from eligible page evidence; editorial markup remains evidence-only unless the commerce/page boundary independently passes. | Editorial review negatives, manufacturer/retailer positives, sibling-model and accessory mutations, asset-wall regression. | High asset-recall tradeoff. Default-off path must stay off until resolved. |
| PR-009 | P1 | verified correction; successor blocker isolated | The commit-pinned PR-2 request completed provider research but failed before verification as an unattributed `research_candidate_invalid`. | The v1 schema made the model author internal candidate/fact IDs while runtime required stricter array-relative values not fully specified by schema/prompt; it also rejected requirement ordering the schema could not constrain. The exact old failing field remains private and unknown. | Research contract/schema/prompt v2 make IDs server-owned, validate the exact unique requirement set before canonical ordering, align non-whitespace constraints, and retain only a guarded candidate field-group reason. Trust gates remain unchanged. | Fail-first 18 pass / 4 intended fail; candidate group matrix; staged 54/54; full 1,438/1,438; E2E/build/static/eval/ranking/dry-run walls; independent review. | Contract-v2 revalidation produced the narrower `candidate_sources` first loss. PR-011 now owns that successor blocker. Never reuse any spent attempt. |
| PR-010 | P2 | verified | The Phase D estimator's field named `standardUsd` used its frozen 2026-07-25 rates, while official current Terra prices are lower. Readiness reporting could confuse a conservative approval rate with current estimated spend. | The rate object was intentionally frozen for approval reproducibility but the output label did not distinguish frozen-envelope and current-market estimates. | Plan/evidence schema v2 names the dated frozen approval envelope and dated `standard_non_regional` current estimate separately. Only the frozen conservative value controls the unchanged hard ceiling. | Fail-first 5 pass / 5 intended fail; exact short/long/cache-write/search rates and totals; focused 10/10; staged 56/56; full 1,440/1,440; E2E/build/static/eval/ranking/dry-run walls; independent review. | Closed locally without live spend. Re-check and date the informational card when official prices change; never silently reprice an existing approval envelope. |
| PR-011 | P1 | verified | Contract-v2 research completed with 69 response-owned sources but failed before verification as `research_candidate_invalid / candidate_sources`. | The exact historical cause is privacy-hidden. A generalized deterministic cause was proven: canonical display dedupe discarded later exact response-owned variants before exact-membership validation. | A dedicated staged registry preserves every parseable exact response-owned variant once; canonical display/count behavior is unchanged. Closed source subreasons distinguish shape, duplicate, unsafe, and unregistered without retaining URLs. | Fail-first 27/3; focused 55/55; staged 59/59; full 1,444/1,444; E2E/static/build/dry-run walls; independent approval; a new live response crossed research validation. | Closed. Never canonical-match a model-authored URL or infer the spent response's branch. PR-012 closed the successor observability blocker; PR-013 owns lifecycle feasibility. |
| PR-012 | P1 | verified | The first research-valid staged run verified zero of 12 candidates, while the route retained only totals and made its first-loss distribution unknowable. | `materializeStagedTerraEvidencePackage()` computed real server-owned decisions, but the route discarded them before its sanitized verification diagnostic. | Verifier v2 derives six mutually exclusive candidate first-loss counts plus three separate affected-candidate rejection counts. The route accepts only fixed bounded integers, conservation, and eligible/close/excluded reconciliation; all malformed, unknown, and private values are dropped. Evidence v3 can retain the aggregate only for its own attempt. | Initial fail-first 23/6; corrected focused 30/30; staged 62/62; full 1,447/1,447; E2E 17/17; typecheck/build/static/dry-run/privacy/public-body walls; independent approval after correction of an unreachable proposed bucket. | Closed as observability only. PR-2E remains permanently unattributable. No eligibility/evidence rule changed, and the counts cannot authorize looser verification. |
| PR-013 | P1 | verified blocker; first losses isolated | The staged lifecycle still has no user-visible result. PR-2G stopped at verification asset identity; after PR-014's correction, PR-2I stopped earlier at research `candidate_facts`. Presentation/rendering has never run. | Privacy-safe evidence isolates only bounded field groups or aggregate first losses. It intentionally cannot retain the private candidate detail needed to identify either exact live cause. | Correct only independently reproduced generalized contract defects offline; preserve privacy and never loosen asset/evidence gates to manufacture a result. | Exact commit/case/schema; counters/usage/cost/privacy; first-terminal stop; conserved verification aggregate when reached; no retry/downstream work; independent `VERIFIED`. | Lifecycle feasibility remains unresolved. Neither isolated attempt is category-wide evidence or benchmark authorization. PR-015 is closed deterministically, but no post-PR-2J provider result exists. |
| PR-014 | P1 | verified correction | Research validation accepted bounded nonempty `product_name`, `brand`, `model`, and `product_type` independently, while the asset verifier rejected every candidate when those same fields did not form a coherent target. Exact downstream assets could not overcome `invalid_target_identity`, wasting Shopping/page work and guaranteeing exclusion. | Provider schema/runtime established field shape but not the relational brand/model/type invariant already required by `directTerraAssetTargetIsCoherent()`; the prompt asked for separate identities without requiring `product_name` to agree. | Research now reuses the unchanged shared predicate before source work, prompt v3 states the relation, contract v4 rolls the fingerprint, and runtime v3 records the boundary. No name synthesis or asset-verifier change. | Fail-first 18/8; corrected contract 26/26; focused 57/57; staged 70/70; full 1,455/1,455; E2E 17/17; typecheck/build/eval/ranking/dry-run/lint/diff walls; independent `APPROVED`; zero live. | Closed deterministically. The stricter early wall can reduce accepted candidate count, which is preferable to guaranteed downstream exclusion. It can prevent PR-2G's class but is not proven to explain that attempt. PR-2I crossed the identity group but stopped at facts; that does not prove every candidate passed identity. |
| PR-015 | P1 | verified correction | The only post-PR-2H attempt completed research generation but local validation stopped as `candidate_facts`, so no verification or user result exists. Offline, the old strict schema could accept a response-owned URL absent from its enclosing candidate and status/cardinality combinations later rejected by runtime. | Raw URLs were repeated in every lead while producer instructions stated only response-level ownership. Parser rules were correctly candidate-local but stricter than the paid producer boundary. | Candidate URLs remain exact response-owned registries; leads use zero-based local indexes. Closed schema variants enforce requirement status cardinality, runtime enforces integer/actual-range/uniqueness and maps exact URLs, and contract v5/schema v3/prompt v4/runtime v4 roll old jobs closed. | Fail-first 23/7; corrected contract 31/31; staged 75/75; full 1,460/1,460; E2E 17/17; typecheck/build/eval/ranking/dry-run/lint/diff walls; token mutation 50/50; independent `APPROVED`; zero live. | Closed deterministically. It does not identify PR-2I's private cause or prove provider adherence/lifecycle feasibility. Never accept another candidate's evidence, expose private facts, or remove runtime authority for dynamic range and uniqueness. |

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

- Status: **stopped safely 2026-08-29; spent**
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

Result: research completed but failed at `candidate_sources`; all counters and
costs remained inside the envelope, privacy checks passed, and no downstream or
fallback call ran. The attempt and evidence directory are spent.

### Phase PR-2D — Diagnose and correct candidate-source ownership offline

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-011 P1.
- Scope: split `candidate_sources` into closed, server-only branch reasons;
  prove the exact-variant registry loss and other candidate-source branches with
  synthetic response objects; preserve all safe exact response-owned variants
  for staged validation while keeping shared canonical display dedupe stable.
- Stop condition: do not accept canonical-equivalent model-authored URLs unless
  that exact string is response-owned; do not retain any URL or candidate data
  in diagnostics; do not loosen HTTPS, uniqueness, or ownership checks; do not
  make a live request.
- Proof: fail-first exact-variant test, duplicate/unsafe/invented mutation
  matrix, route privacy negatives, focused/full walls, independent review, and
  a clean default-off commit.
- Reasoning: **High** for source-ownership semantics; **Medium** for the
  localized extractor/diagnostic implementation after the invariant is fixed.

Result: the exact-registry self-mismatch is corrected without changing canonical
display/count sources or weakening URL trust. Closed source-branch attribution,
contract/runtime rollover, focused/full/E2E/static proof, and independent
approval are complete. The historical live branch remains unknowable.

### Phase PR-2E — One post-correction staged feasibility attempt

- Status: **stopped safely 2026-08-29; spent**
- Dependency: PR-2D is committed and independently approved; tracked state is
  clean; the exact commit-specific output directory is new; process-only keys
  and the zero-network dry run pass without exposing values.
- Scope: exactly one frozen broad `shop vac` staged-route attempt under the
  existing two-create, ten-search, sixty-retrieve, one-cancel, Shopping/page,
  and `$3` ceilings. No retry, replacement, fallback, second case, flag
  promotion, deployment, production change, or push.
- Stop condition: the first terminal route outcome. On a source failure, use
  only the closed branch reason and return offline; never inspect/retain raw
  output or add canonical matching. On success, document feasibility before
  any benchmark expansion.
- Proof: commit-pinned sanitized evidence, exact counters/usage/cost, privacy
  scan, acceptance gates on success, independent content audit, and final clean
  tracked-state authentication.
- Reasoning: **High** for evidence adjudication; execution is routine.

Result: research passed, but deterministic verification excluded all 12
candidates. Every ceiling, privacy boundary, and first-terminal stop held. The
aggregate evidence cannot identify the verifier first loss, so the attempt and
directory are spent and no replacement is permitted.

### Phase PR-2F — Recover safe aggregate verification attribution

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-012 P1.
- Scope: derive bounded aggregate first-loss counts from existing deterministic
  verifier decisions. The real precedence is asset identity unproven, complete-
  product relationship unproven, identity-safe product URL unavailable, hard
  requirement failed, hard requirement not verified, then no-loss eligible.
  Separately count candidates affected by unowned sources, invalid source input,
  or invalid observed claims without retaining identifying content.
- Stop condition: do not alter eligibility, evidence acceptance, source/page/
  commerce rules, prompt/schema, or public errors. Do not retain candidate IDs,
  names, models, URLs, hosts, titles, requirement IDs/text, claims, prices,
  fetched content, provider IDs, prompts, credentials, or secrets. No live call.
- Proof: fail-first conservation/privacy mutations, focused verifier/route/Phase
  D tests, full deterministic and hermetic E2E/build/static gates, independent
  review, and a clean default-off commit.
- Reasoning: **High** for the privacy/observability boundary; **Medium** for
  aggregate plumbing.

Result: the initial proposed bucket model was blocked in independent review
because `completeProductTypeUnproven` was unreachable under the implementation's
own derived facts. The corrected implementation uses the existing asset
decisions for identity, complete/bundle relationship, and identity-safe accepted
product evidence. Focused tests passed 30/30, the staged subsystem 62/62, the
complete suite 1,447/1,447, E2E 17/17, and all static/build/dry-run walls.
Independent re-review returned `APPROVED`. No live request or eligibility change
occurred, and PR-2E remains unexplained.

### Phase PR-2G — One attributable staged lifecycle attempt

- Status: **stopped safely 2026-08-29; spent**
- Severity measured: PR-013 P1.
- Dependency: PR-2F is committed and independently approved; tracked state is
  clean; a new commit-specific directory is absent; boolean key-presence and
  the zero-network dry run pass without exposing values.
- Scope: exactly one broad `shop vac` route attempt under the unchanged ceilings
  of two OpenAI creates, ten hosted searches, sixty retrieves, one safety
  cancel, fifteen Shopping requests, thirty source-page fetches, ninety physical
  page HTTP attempts, and `$3` frozen-conservative cost.
- Stop condition: the first terminal route outcome. No retry, replacement,
  fallback, second case, Serper organic, SearchAPI, gate change, flag promotion,
  deployment, production change, or push. If verification fails or completes,
  require a valid evidence-v3 aggregate; otherwise stop at evidence invalidity.
- Proof: exact commit/directory binding, counters, usage/cost, first-stop and
  privacy scan, aggregate conservation/reconciliation when applicable,
  independent content audit, and clean tracked-state authentication.
- Reasoning: execution is routine; **High** for adjudicating what the resulting
  evidence proves and which attempt-specific observed loss, if any, merits
  offline reproduction. Only a generalized reproduced loss can merit correction.

Result: research passed with 12 candidates/58 sources, then all 12 candidates'
earliest loss was asset identity. The 51.618-second run stayed within every
ceiling, evidence-v3 conservation/privacy passed, and independent audit returned
`VERIFIED`. There was no presentation, public result, retry, or replacement.
The directory is spent.

### Phase PR-2H — Align research identity acceptance with asset coherence

- Status: **verified 2026-08-29; zero live**
- Severity addressed: PR-014 P1.
- Scope: fail-first prove that schema-valid staged identity tuples can pass
  research but can never pass the unchanged asset target-coherence predicate;
  reject those tuples as `candidate_identity`, make the prompt state the same
  exact relational rule, and roll contract/prompt/runtime job identity as needed.
- Stop condition: do not synthesize/repair product names, loosen brand/model/type
  identity, alter asset/relationship/requirement/source/page/commerce gates,
  widen diagnostics, make an external request, or claim the defect caused PR-2G.
- Proof: incoherent brand/model/conflict/type negatives; coherent complete-
  product positives; exact fail-closed rollover; focused/full staged/full
  deterministic/typecheck/lint/build/E2E/eval/ranking/dry-run walls; independent
  read-only review and clean default-off commit.
- Reasoning: **High** for shared identity and rollover semantics; **Medium** for
  localized validator/prompt/test implementation.

Result: the fail-first run produced exactly eight intended failures. Research
now reuses the unchanged shared predicate and rejects all four incoherence
classes before downstream work while preserving numeric model trimming and
coherent duplicate detection. Contract v4, prompt v3, and runtime v3 roll the
job boundary. Focused/staged/full/E2E/static walls passed; independent review
returned `APPROVED`. No external product-data request ran.

### Phase PR-2I — One post-correction staged lifecycle attempt

- Status: **stopped safely 2026-08-29; spent**
- Severity measured: PR-013 P1; revalidation dependency: PR-014.
- Dependency: PR-2H is committed and independently approved; tracked state and
  `next-env.d.ts` are clean; a new commit-specific directory is absent; required
  credentials are checked by boolean presence only; focused Phase D tests and
  the zero-network dry run pass from the exact commit.
- Scope: exactly one broad `shop vac` route attempt under the unchanged ceilings
  of two OpenAI creates, ten hosted searches, sixty retrieves, one safety
  cancel, fifteen Shopping requests, thirty source-page fetches, ninety physical
  page HTTP attempts, and `$3` frozen-conservative cost.
- Stop condition: the first terminal route outcome. No retry, replacement,
  fallback, second case, Serper organic, SearchAPI, gate change, flag promotion,
  deployment, production change, or push. A verification failed/completed
  outcome requires the existing conserved/reconciled evidence-v3 aggregate.
- Proof: exact commit/directory/plan binding, counters, usage/cost, first-stop,
  evidence conservation/reconciliation, privacy scan, independent content
  audit, and final clean tracked-state authentication.
- Reasoning: execution is routine; **High** for deciding whether the result
  demonstrates progression, a new generalized first loss, or another safe stop.
  One result cannot establish quality, stability, or benchmark readiness.

Result: the exact clean PR-2H commit ran once and stopped at HTTP 502
`research_failed / research_candidate_invalid / candidate_facts` after 54.485
seconds. It used one create, 24 retrieves, three hosted searches, one cancel,
and `$0.237477` frozen-conservative cost. Shopping, page, verification,
presentation, retry, replacement, fallback, public result, and result file were
all absent. The one-file sanitized artifact passed privacy/accounting audit and
independent `VERIFIED`. Its exact private fact failure is unknowable. The
directory is spent.

### Phase PR-2J — Candidate-local research source references

- Status: **verified zero-live generalized correction**
- Severity addressed: PR-015 P1.
- Outcome: candidate URLs remain exact response-owned lists; requirement/fact
  leads now use zero-based enclosing-candidate indexes. Closed nested schema
  variants enforce requirement status cardinality; runtime rechecks it,
  enforces integer/actual-range/uniqueness, and maps only to exact validated
  candidate URLs. Contract v5, schema v3, prompt v4, and runtime v4 roll the
  entire job boundary, while current token checks reject older work.
- Preserved boundaries: no candidate source, exact ownership, HTTPS/private-
  host, requirement, fact, verification, evidence, price, asset, eligibility,
  public response, diagnostic privacy, network ceiling, or default flag was
  weakened. No live request ran and no spent directory was read or changed.
- Proof: fail-first 23 pass / 7 intended fail; corrected contract 31/31; staged
  75/75; complete 1,460/1,460; E2E 17/17; typecheck/build/eval/ranking/dry-run/
  lint/diff walls; 50/50 randomized token mutation; independent final
  `APPROVED` after schema-cardinality, non-first mapping, and tamper-test
  corrections.
- Limitation: this closes the reproduced mismatch, not PR-2I's unknowable
  private cause. No provider adherence, lifecycle, accuracy, latency, cost, or
  user-result improvement is established.
- Reasoning: **High** for source-ownership/wire-contract design; **Medium** for
  localized parser/schema/prompt/test implementation. Candidate-local indexes
  are preferred over prompt-only prose or accepting cross-candidate evidence.

### Phase PR-3 — Build a real offline benchmark matrix

- Status: **verified; zero-live evaluation-integrity correction**
- Severity addressed: PR-005 P1.
- Outcome: five batches uniquely partition ten tracked cases and 29 invariant
  checks covering broad, constrained, over-constrained, wrong-type/accessory,
  fake-price, non-product, duplicate-family, compatibility, and missing-
  evidence shapes. The legacy evaluator is byte-unchanged and remains a
  separate compatibility check.
- Integrity: the matrix requires a complete candidate price/product oracle;
  workers persist declared/executed IDs and invariant outcomes; reconciliation
  rederives all outcomes and rejects missing, duplicate, unknown, mismatched,
  fabricated, or incomparable evidence. Missing verifier files and unknown
  worker modes fail closed. Historical failing-before evidence remains valid
  after the code is corrected.
- Authority: the controller writes only ignored advisory next-task output. It
  cannot overwrite `docs/agent-next-task.md` or copy Markdown to Desktop.
- Proof: fail-first 9 pass / 1 intended fail; corrected focused 26/26; complete
  1,477/1,477; exact five-batch reconciliation; tracked benchmark 10/10 cases
  and 29/29 invariants; build, E2E 17/17, typecheck, lint, legacy eval, ranking,
  zero-network Phase D dry run, and diff walls; independent `APPROVED` after
  four material fail-closed/semantics corrections.
- Limitation: this repairs evaluation validity, not product quality. The
  synthetic cases and manually reviewed oracles do not establish live market
  coverage, provider adherence, latency, cost, or lifecycle feasibility.
- Reasoning: **High** for evaluation validity, **Medium** for fixture plumbing.

### Phase PR-3A — Revalidate staged lifecycle feasibility once

- Status: **next; bounded live measurement**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Scope: after the PR-3 closeout commit leaves a clean tracked tree, run the
  existing frozen broad `shop vac` Phase D case exactly once at that full
  commit. Keep the existing ceilings: two OpenAI creates, ten hosted searches,
  60 retrieves, one safety cancel, 15 Shopping attempts, 30 source-page
  selections, 90 physical page attempts, and `$3` frozen-conservative maximum.
- Stop policy: first terminal result ends the phase. No retry, replacement,
  fallback, second case, organic/SearchAPI request, promotion, or deployment.
- Proof: commit/case/schema binding; counters, usage, cost, privacy, hashes, and
  clean-state evidence; conserved verification aggregate if reached; exact
  first loss or complete shopper result; independent read-only audit.
- Alternatives: a broad live matrix is premature until one staged lifecycle
  succeeds; another offline contract edit is speculative without a reproduced
  failure; weakening gates to manufacture a result is prohibited.
- Reasoning: **High** for boundary/evidence adjudication; **Medium** for the
  bounded mechanical execution.

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

- staged lifecycle feasibility has not passed. PR-2H and PR-2J close two
  independently reproduced contract mismatches, but the latest live attempt
  remains PR-2I's `candidate_facts` stop and no post-PR-2J provider result has
  reached verification or presentation;
- current live accuracy, stability, latency, and cost have not been measured;
- RR-091 and RR-092 remain unresolved for an experimental path that cannot be
  promoted safely.

The verdict can improve only through the required evidence above. Passing
unit tests alone cannot change it.

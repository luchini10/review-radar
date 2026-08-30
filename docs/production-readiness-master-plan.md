# ReviewRadar Production-Readiness Master Plan

Updated: 2026-08-30 by Codex after PR-6B closeout
Status: active living control document
Starting branch: `main`
Starting commit: `dc9ab1fa1d85608e39cf29b5603d0c59692beb29`

## Objective and decision frame

The product objective is not to maximize exact-match counts or make the test
suite look green. It is to show the strongest genuinely suitable products,
exclude unsafe or misleading cards, preserve uncertainty, and give shoppers a
reliable decision brief at acceptable latency and cost.

The staged Terra path has now produced one independently verified shopper
result. PR-3K spent exactly one frozen `shop vac` lifecycle at clean PR-3J
commit `8c57cd594a7f060aa358afedb0e1baab429a5d89`. Research, deterministic
verification, presentation, and public-response rendering completed in 116.495
seconds with four eligible cards, zero close matches, six exclusions, and eight
source entries representing four unique HTTPS URLs; every card reference and
commerce URL resolves.

The single first-terminal run used two OpenAI creates, 40 retrieves, eight
hosted searches, 10 Serper Shopping calls, 20 source-page fetches, and 25
physical HTTP attempts. Usage was 77,273 input tokens, zero cached input, 9,064
output tokens, and eight web searches. Frozen-conservative estimated cost was
`$0.457438`, below the unchanged `$3` gate. Every retry, replacement, fallback,
organic, SearchAPI, second-case, and safety-cancel counter stayed zero.

The only PR-3K artifact is the untracked 51,640-byte evidence-v6 `result.json`,
SHA-256
`9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
Independent strict read-only audit returned exact verdict `VERIFIED`, no
findings, confidence 0.99. It authenticated commit, case, schema, terminal
ordering, accounting, public reconciliation, default-off state, and privacy.
All 10 submitted candidates were accepted through the missing-title deferral
path; 14 of 20 page fetches succeeded, 10 Shopping calls returned 156 rows,
and the first-loss aggregate recorded five asset-identity exclusions, one
missing/invalid-product-URL exclusion, and four no-loss eligible candidates.

This closes one-lifecycle feasibility, not production readiness. It does not
establish repeatability, current market-leader recall, card truth, hard-
requirement accuracy, latency distribution, or category-wide cost. The earliest
remaining product-quality blocker is PR-006. The existing quality scorecard and
consistency harness call the legacy `/api/recommendations` route, and the July
gold list may have drifted; neither can authorize a staged-path live matrix.

The earlier PR-3E closed aggregate does not prove a private candidate-level
cause. It does prove a generalized producer/consumer mismatch worth correcting
offline. The research response exposed 53 sources, and the runtime could
collect two sources per
candidate and 30 total, yet all 12 candidates supplied only one. Eight
candidates had no asset candidate after source collection; the four candidates
with an observed asset source lacked the model in its title. Separately,
commerce reported stable-identifier absence in all 12 result-title groups.
Those overlapping counts are diagnostic, not causal, and do not authorize a
weaker downstream identity gate.

PR-3F moves the earliest executable identity check to the producer/consumer
boundary. Research schema v5 requires exactly two logically distinct exact
response-owned source URLs per candidate, with zero-based local references 0
or 1. Tracking-only or fragment-only variants of one physical page fail as
duplicates, while identity-
bearing query parameters remain distinct. Exact URL membership remains the
only ownership rule: canonical equivalence never accepts a URL or lends a title
between variants. At least one candidate-owned exact title-and-URL record must
pass the unchanged shared asset-identity predicate before any collection or
Shopping work; a failure retains only the fixed URL-free reason
`candidate_source_identity_unproven`.

The identity preflight deliberately accepts the shared verifier's conservative
manufacturer/established-retailer product-slug path as well as title-visible
identity. It still rejects sibling slugs and unknown-retailer slug authority.
Source metadata is used only to decide whether the candidate is worth
collecting; it does not become shopper-visible evidence or bypass fetched-page,
commerce, relationship, requirement, asset, or presentation gates. The maximum
15 candidates times exactly two sources equals the unchanged 30-fetch ceiling.
Contract v7, prompt v6, and runtime v6 invalidate old work.

PR-3G proves that the provider can complete within the output cap while the
strict identity-source preflight still stops the whole response. It does not
reveal whether every candidate failed or the private reason distribution.
PR-3H therefore corrects the generalized all-or-nothing behavior without
changing the identity predicate: after strict parsing, only candidates whose
two exact response-owned source records both fail the unchanged shared verifier
are quarantined. Survivors preserve discovery order and receive contiguous
server-owned candidate/fact IDs; rejected source URLs never reach collection.
Zero survivors retain the same bounded failure triple.

The new server-only diagnostic reports submitted, accepted, and rejected
candidate counts plus five reachable reason families. Route sanitization
requires exact keys, safe integer bounds, arithmetic conservation, one or two
distinct reasons per rejected candidate, completed-count equality with the
actual survivor slate, and the exact zero-survivor failure context. Impossible
post-parse target states fail closed. Contract v8 and runtime v7 invalidate old
jobs; future sanitized evidence is v5. Schema v5, prompt v6, public responses,
flags, ceilings, and every downstream trust rule remain unchanged.

PR-3I then proved that candidate-local quarantine alone still stopped before
product-data work because source title metadata was unavailable. The official
[OpenAI web-search guide](https://developers.openai.com/api/docs/guides/tools-web-search)
defines the complete consulted-source action as URL-only records; cited
annotations may supply titles, but action-source titles are not guaranteed.
Missing title is therefore an unknown metadata state rather than affirmative
identity mismatch.

PR-3J preserves the identity predicate and makes only the preflight decision
tri-state. Any exact response-owned source whose available title proves identity
retains the candidate. If none proves identity but any exact source lacks a
title, the candidate is deferred to the existing bounded DNS-pinned page fetch
and unchanged entity verifier. Only candidates whose available source titles
all affirmatively mismatch are quarantined. Deferral grants no evidence,
eligibility, or shopper-visible claim.

The current diagnostic reports submitted, accepted/continued, deferred-missing-
title, and rejected counts plus four affirmative mismatch families. The route
requires exact keys, safe bounds, accepted+rejected=submitted,
deferred<=accepted, completion equality with the continued slate, and zero
deferred candidates in an all-rejected failure. Contract v9, runtime v8, and
future sanitized evidence v6 invalidate old jobs; schema v5, prompt v6, public
responses, flags, exact ownership, network ceilings, and downstream trust stay
unchanged.

Stronger alternatives considered:

- **Retry or edit any spent artifact:** rejected. PR-3A, PR-3C, PR-3E, PR-3G,
  and PR-3I each spent one terminal measurement; their exact directories and
  hashes are immutable.
- **Loosen identity or URL gates:** rejected. That would manufacture cards
  without proving exact product identity and attack the safety wall rather than
  the unknown cause.
- **Loosen title/model, commerce, or asset gates:** rejected. PR-3E's 12/12
  identity loss is evidence of upstream misalignment, not evidence that sibling
  or ambiguous products should be displayed.
- **Run another unchanged call or blindly fetch more pages:** rejected. The
  producer supplied one source per candidate despite a two-source runtime cap;
  another call would repeat the uncorrected contract and extra fetching cannot
  create identity-bearing response metadata.
- **Require two URLs without proving identity:** rejected. Cardinality alone can
  spend both slots on weak or fetch-equivalent pages.
- **Canonical-match ownership or borrow titles between URL variants:** rejected.
  A fetch-equivalence key removes only known tracking parameters and fragments
  to reject same-page pairs; it never establishes response ownership or lends
  identity metadata, and identity-bearing query parameters remain intact.
- **Require title-only identity:** rejected as unnecessarily narrower than the
  unchanged shared verifier. A safe direct manufacturer or established-retailer
  product slug can intentionally supply the model when the exact title and URL
  together prove the complete product.
- **Require two exact, logical pages and preflight one with the shared identity
  predicate:** selected for PR-3F. It aligns the producer with current collection
  capacity and fails before downstream spend without weakening trust.
- **Raise the output cap or add another prompt-only patch:** rejected. PR-3G
  reached provider `completed` below the existing cap; neither action fixes the
  schema-valid all-or-nothing consumer behavior.
- **Loosen identity after PR-3G:** rejected. The sanitized artifact contains no
  candidate/source identity and cannot authorize accepting ambiguous products.
- **Quarantine only identity-unproven candidates after strict parsing:** selected
  for PR-3H. It preserves every trust predicate and prevents rejected URLs from
  consuming downstream network work, at the explicit tradeoff of a smaller
  visible research slate.
- **Expand immediately into a broad live benchmark:** rejected. PR-3K closes
  one-lifecycle feasibility, but the existing scorecard and consistency harness
  call the legacy route and the July leader set may be stale. Spending before a
  staged-specific, current-truth boundary would produce incomparable evidence.
- **Trust model-authored source titles or derive identity broadly from URL
  slugs:** rejected after PR-3I. Either would weaken source authority and can
  admit sibling or ambiguous products.
- **Depend on `web_search_call.results` for title metadata:** rejected. Official
  documentation permits including results but does not document a stable text-
  result title schema suitable for a trust boundary.
- **Treat unavailable title metadata as unknown and defer only to the existing
  page/entity verifier:** selected for PR-3J. This aligns the consumer with the
  documented URL-only source-action contract without changing final authority.

PR-3 now closes that evaluation-integrity defect without changing production
behavior. Five named batches uniquely partition ten tracked cases and 29
invariants across all required request/trap shapes. Results persist exact case
IDs and outcomes; reconciliation rederives every invariant from the persisted
exact/near streams, tracked bounds/statuses, and a complete candidate ground-
truth registry. Missing, duplicate, unknown, mismatched, fabricated, or
incomparable work fails closed while authentic historical failing evidence
remains comparable after a fix.

PR-3K supplied the one complete staged lifecycle. PR-4A now closes the next
measurement-integrity prerequisite without making a live call. A dated four-
shape matrix freezes six serial attempts, exact request hashes and nonces,
current-source provenance, absolute safety/quality bars, per-run and aggregate
ceilings, and an artifact chain against the staged public and sanitized server
contracts. A strict analyzer independently rederives source/card/requirement/
price/accounting/latency/stability results and requires exact manual card and
source review.

The harness deliberately cannot authenticate its caller. Every result reports
`originAuthenticated=false`, `machineAuthorization=false`,
`releaseAuthorized=false`, and `stopRequired=true`; a clean prefix selects only
`next_attempt_review_required`, while a mechanically and manually clean full
set selects only `independent_review_required`. Candidate-pool identity Jaccard
is explicitly not scored because the privacy-safe staged evidence contains no
non-public candidate identities; final-card Jaccard remains measured. PR-4B
must therefore proceed, if separately reviewed, one precommitted attempt at a
time. PR-4A proves the integrity of that boundary, not staged recommendation
quality.

Recommended reasoning level: **High** for benchmark truth, scoring, and trust-
boundary design; **Medium** for routine harness implementation and deterministic
execution.

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

### PR-3E verification stop and PR-3F source-grounding correction

- **PR-3E live ground truth:** exact clean commit `bf7e37b43edbd6896b97a98cc1996bfa69b3aeb7`
  ran once. Research completed with 12 candidates and 53 response sources;
  every candidate supplied one local source. Twelve page fetches produced four
  successful receipts, and 12 Shopping calls produced 201 rows. Verification
  returned 0 eligible / 0 close / 12 excluded, all at asset identity. There was
  no presentation, public result, retry, replacement, fallback, organic call,
  SearchAPI call, flag change, or deployment.
- **Attribution:** all 12 identity first losses reported
  `assetIdentityUnproven`. The closed asset subreasons were eight
  `noAssetCandidates` and four `modelNotInTitle`. Overlapping commerce outcomes
  were five `brandNotInTitle`, 12 `stableIdentifierNotInTitle`, and five
  `missingMerchantProductUrl`. These counts are bounded diagnostics, not a
  candidate mapping or causal proof.
- **Accounting and privacy:** one create, 14 retrieves, three hosted searches,
  one cancel, 29,702 input, zero cached input, 4,139 output, and `$0.184904`
  frozen-conservative estimated cost. The 16,119-byte artifact hash is
  `fb6fe1ad6324a9bb6b85a2a2634ab6eef25378ee1d696220fc5ef54510214a30`.
  Independent audit returned `VERIFIED`, confidence 0.99, with exact arithmetic,
  conservation, and privacy allowlists. The directory is spent.
- **Preflight note:** an earlier shell invocation omitted the required explicit
  approval arguments. The runner rejected it at commit binding before network,
  directory creation, counters, artifact, or spend. The exact approved
  lifecycle invocation then ran once and was not retried.
- **PR-3F generalized correction:** schema v5 requires exactly two exact,
  response-owned, fetch-distinct candidate sources; local lead indexes are only
  0 or 1. A fetch-equivalence key removes established tracking parameters and
  fragments only for same-physical-page rejection. It preserves identity-
  bearing query parameters and never establishes ownership or lends metadata.
  At least one exact candidate-owned title/URL record must pass the unchanged
  shared asset-identity rule before collection. The fixed failure reason is
  `candidate_source_identity_unproven`.
- **Shared-rule alignment:** title-visible brand/model/type is preferred, while
  the existing safe manufacturer/established-retailer URL-slug path remains an
  intentional positive. Sibling slugs, unknown-retailer slug authority,
  canonical title borrowing, unsafe/unregistered URLs, zero/one/three sources,
  and fetch-equivalent pairs fail closed.
- **Ceiling and privacy:** 15 candidates times two sources equals the unchanged
  30-fetch maximum. Response source metadata only preflights collection; it is
  not final evidence and cannot reach the shopper. Contract v7, schema v5,
  prompt v6, and runtime v6 roll old work closed.

### PR-3G identity-source stop and PR-3H candidate quarantine

- **PR-3G live ground truth:** exact clean commit
  `ac53c10e707b67945f7df4f4cbda129c7c6ef69d` ran once. Provider research
  reached `completed`, then local validation stopped as
  `research_candidate_invalid / candidate_sources /
  candidate_source_identity_unproven`. Page fetching, Shopping, verification,
  presentation, rendering, and public output remained zero.
- **Accounting and privacy:** one create, 31 retrieves, six hosted searches,
  one cancel, 56,876 input, zero cached input, 7,759 output, and `$0.354123`
  frozen-conservative cost. The 26,300-byte artifact hash is
  `2E3296650224BF28EEE56166860A9B82C22EC7ED6B93C374594F2869FDE0C1CE`.
  Independent audit returned `VERIFIED`, confidence 0.99. It contains no
  candidate/source/private identity or reason distribution and is spent.
- **Invocation note:** separated CLI approval tokens were rejected locally
  before counters, directory, network, artifact, or spend. The one actual
  lifecycle used required `--name=value` tokens and was not retried.
- **PR-3H generalized correction:** after the unchanged strict parse, quarantine
  only candidates whose two exact source records both fail the unchanged shared
  identity verifier. Preserve survivor order, reissue contiguous server IDs,
  and keep rejected URLs out of every downstream network and evidence path.
  Zero survivors retain the bounded identity-source failure.
- **Diagnostic boundary:** submitted/accepted/rejected counts and five reachable
  reasons only. The verifier contributes one or two distinct families for each
  rejected candidate. Exact-key route sanitization requires conservation, each
  family no greater than the rejected count, an aggregate reason total from the
  rejected count through twice that count, actual survivor-count equality on
  completion, and the exact zero-survivor failure context. Impossible target
  states fail closed; malformed/private evidence is omitted.
- **Versions and proof:** contract v8, runtime v7, future evidence v5; schema v5
  and prompt v6 unchanged. Corrected focused wall 126/126, full 1,495/1,495,
  E2E 17/17, exact five-batch/10-case/29-invariant reconciliation, static/build/
  eval/ranking/dry-run walls, and independent `APPROVED` at confidence 0.97.

### PR-3I title-metadata stop and PR-3J tri-state deferral

- **PR-3I live ground truth:** exact clean commit
  `bd54de9076cf6752ee2beefd686689852f6f9994` ran once. Provider research
  reached `completed`, then local preflight stopped at the same bounded failure
  triple before every product-data, presentation, rendering, and public stage.
- **Accounting and privacy:** one create, 24 retrieves, five hosted searches,
  one cancel, 47,475 input, zero cached input, 5,516 output, and `$0.281099`
  frozen-conservative cost. The 21,584-byte artifact hash is
  `03D442FFE14D819D6C23A2E76C2458E37AF6A2EBE7691A6DC4F6EA0ED2827B3F`.
  Independent audit returned `VERIFIED`, confidence 0.99. It retains no source/
  candidate/private mapping and is immutable/spent.
- **Bounded finding:** 10 submitted, zero accepted, 10 rejected, and
  `missingTitle=10`; every affirmative mismatch family is zero. This establishes
  at least one missing-title decision per candidate, not which source or whether
  both. It does not establish downstream page or product truth.
- **API contract:** the complete consulted-source action is documented as URL-
  only. Citation annotations may contain titles, but action-source titles are
  not guaranteed. Missing title is therefore unknown metadata, not affirmative
  identity mismatch.
- **PR-3J generalized correction:** any available exact title that proves
  identity retains the candidate; otherwise any exact missing-title source
  defers it to existing DNS-pinned page/entity verification; only all-
  affirmative title mismatches quarantine it. Deferred candidates gain no trust
  or eligibility.
- **Diagnostic and versions:** submitted/accepted/deferred/rejected counts and
  four affirmative mismatch families only. Deferred is a subset of accepted;
  completion binds to the continued slate, while all-rejected failure requires
  deferred zero. Contract v9, runtime v8, and future evidence v6; schema v5 and
  prompt v6 unchanged.
- **Proof:** fail-first 58 pass / 5 intended fail; corrected focused 169/169;
  full 1,498/1,498; E2E 17/17; static/build/eval/ranking/benchmark/reconciliation
  walls; independent source-only `APPROVED`, confidence 0.96. The reviewer's
  accidental public `.env.example` test run is excluded from proof.

## Confirmed defects and weaknesses

| ID | Severity | Status | User impact and evidence | Likely root cause | Generalized solution | Required proof | Risk, rollback, dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR-001 | P1 | verified | A provider-complete staged search failed with no retained contract class, blocking an evidence-based accuracy repair. | The route diagnostic type and failed `research_poll` report omitted the runtime's bounded `validationReason`. | A closed server-only research-validation-reason field now survives the route and sanitized harness; the runtime guard rejects every other value. Raw output, response IDs, URLs, prompts, headers, and secrets remain absent. | Fail-first route test; replay of all four classes; unknown-reason and leak-negative assertions; focused and complete walls; independent approval. | Closed locally. The historical missing class is unrecoverable; the next live result will be attributable. Roll back the field/report/test commit if private data ever crosses the boundary. |
| PR-002 | P1 | verified | The consumed Phase D request was billed but recorded as `$0`, weakening cost control and readiness evidence. | The estimator equated route success with billable provider completion. | Terminal provider usage is now accounted regardless of later local outcome. Only a matching nonempty response hash deduplicates; distinct or unknown responses sum conservatively, and any duplicate terminal anomaly blocks acceptance. | Historical exact-usage replay; successful research+presentation control; pending/start exclusion; same-response and distinct/unknown adversarial tests; exact expected costs. | Closed locally. Roll back if independent billing evidence ever shows over- or under-counting. No network dependency. |
| PR-003 | P1 | verified | Required E2E checks produced 11 false failures whenever a developer enabled Direct Terra locally, hiding real regressions and encouraging ignored checks. | Playwright's dev server inherited `.env.local`; tests intercepted `/api/recommendations` while the browser called `/api/recommendations-v2`. | The E2E server owns a dedicated port, forces committed default-off/legacy routing, disables server reuse, and explicitly neutralizes all provider/job credentials. The developer's `.env.local` is untouched. | Full 17/17 E2E under the existing local config; independent inspection of Playwright's environment merge; no production code change. | Closed locally. Experimental-path E2E must opt into its own isolated fixture and credentials boundary. |
| PR-004 | P2 | verified | One valid Direct-Terra preview failed its test even though the two safe links rendered. | UI copy changed from generic `Product website` to the more informative `View at <host>` accessible name; the test stayed exact-string brittle. | The test now asserts the user-visible role/name pattern and both links' safe target/rel attributes. | Full E2E passes and still requires both safe links. | Closed; test-only rollback. |
| PR-005 | P1 | verified | Five named deterministic QA batches reported different search pools but all executed the same five synthetic eval cases, so green output overstated coverage. | `runDeterministicBatch()` delegated every batch to `eval-pipeline.mjs` and recorded batch searches only as metadata. The controller also overwrote the authoritative handoff and copied Markdown outside the repo. | A tracked 10-case/29-invariant benchmark now gives every batch a unique partition. Results persist executed IDs/outcomes; reconciliation independently rederives them from persisted streams and complete tracked price/product oracles. Controller next-task output is ignored/advisory only, and no Desktop copy occurs. | Fail-first 9 pass / 1 intended fail; corrected focused 26/26; complete 1,477/1,477; exact five-batch reconciliation; benchmark 10/10 and 29/29; E2E/build/static/eval/ranking/dry-run walls; independent `APPROVED`. | Closed without production or live behavior changes. Synthetic fixtures/oracles require deliberate maintenance and do not prove market coverage or provider quality. Ignored artifacts are reconciled, not cryptographically immutable. |
| PR-006 | P1 | attempt 1 consumed pre-provider; live measurement protocol blocked | Current staged-path market-leader recall, final-set stability, exact/near truth, hard-requirement accuracy, price coverage, first-loss distribution, latency, and cost are not established. PR-3K proves only one safe `shop vac` result; historical legacy-path evidence found zero final overlap and severe leader loss. | Provider variance, planning variance, discovery loss, strict evidence gates, and/or ranking may contribute; attribution remains unmeasured on the active path. Existing quality harnesses call the legacy route and the July leader set may have drifted. | PR-4A freezes a dated four-shape/six-attempt staged matrix, canonical artifact producer, exact analyzer, manual audits, serial hash chain, and fail-closed stop rules. PR-4B's exact committed launcher plan was approved, but attempt 1 stopped before provider work without an artifact. PR-021 now provides independently verified typed attribution for future launcher stops, but governance must separately decide whether any future measurement protocol is permissible. No retry, replacement, or attempt 2 is authorized. | Exact commit/matrix/request/run/nonce/prior-artifact binding; dated provenance; repeated final-card Jaccard; leader and illustrative coverage; exact/near, requirement, wrong-type, source, price, offer, image, first-loss, latency, call, token, and cost reconciliation; complete manual card/source audits. Candidate-pool Jaccard is `not_scored_privacy_boundary`. | High cost/variance risk. Attempt 1 is consumed. Stop on every prefix and any safety failure. Truth expires 2026-09-12. The runner and analyzer cannot authorize another attempt, release, flag, or deployment; independent review remains mandatory. |
| PR-007 | P1 | verified reachable correction; historical adapter contained | The historical adapter accepts same-page related-product prices from URL/source-role membership alone, but current reachability analysis found it only in scripts/tests. Separate shared experimental boundaries could still treat partial families, numeric siblings, technology/version prose, or partial URL/title identity as exact and thereby authorize the wrong transactional row. | Exact-model logic had diverged across token, structured-entity, asset, relationship, and page/URL consumers. Partial token overlap and context-free digit handling were not a safe exact-identity contract. | One shared relation now parses complete aliases, compounds, descriptive trims, contextual year/decimal identities, explicit model/variant/trim assertions, and conflict evidence. Commerce v2, SearchAPI offers v2, fact verifier v3, asset verifier v6, product-page URL selection, and staged materialization reuse it; relationship classification still preserves accessories/replacements. | Tracked historical characterization and route isolation; fail-first sibling/compound/year/decimal/technology/qualifier/copula/comma mutations across every consumer; exact positive and feature controls; final focused 205/205; full 1,604/1,604; static/build/E2E/controller walls; generated connector probes; exact frozen replacement review. | Current reachable experimental exact-price boundaries are corrected, but the historical adapter remains semantically unsafe if promoted and RR-091 stays `Needs Investigation — contained/narrowed`. Conservative false-negative risk remains. No path promotion or live work is authorized. |
| PR-008 | P1 | verified generalized correction | Historical RR-092 evidence showed editorial Product markup verifying identity/image without proving the tested unit. The complete staged regression already rejected the unbound image, but the reachable shared verifier reproduced the unsafe authority. | Professional-test entity selection was independent of tested-model status, and both tested-model and Product-entity matchers accepted any shared digit-bearing token. A target-looking name could also override an unrelated explicit JSON-LD model. | Verifier v2 requires a complete stable tested identifier or explicit proposed alias, rejects shared-token conflicts, treats a stable explicit Product model as authoritative, and withholds identity/entity/image authority when tested-model evidence is missing or contradictory. Stricter entity matching is professional-test-only. | Initial shared fail-first, staged full-path negative, cross-category and alias controls, sibling/missing/conflicting/unrelated mutations, non-null clearing, focused/full/static/build/E2E/controller walls, and final independent `VERIFIED`. | Closed locally with conservative false-negative risk. Source-role semantic classification remains outside this snapshot; default-off and no-live/no-release boundaries remain. |
| PR-009 | P1 | verified correction; successor blocker isolated | The commit-pinned PR-2 request completed provider research but failed before verification as an unattributed `research_candidate_invalid`. | The v1 schema made the model author internal candidate/fact IDs while runtime required stricter array-relative values not fully specified by schema/prompt; it also rejected requirement ordering the schema could not constrain. The exact old failing field remains private and unknown. | Research contract/schema/prompt v2 make IDs server-owned, validate the exact unique requirement set before canonical ordering, align non-whitespace constraints, and retain only a guarded candidate field-group reason. Trust gates remain unchanged. | Fail-first 18 pass / 4 intended fail; candidate group matrix; staged 54/54; full 1,438/1,438; E2E/build/static/eval/ranking/dry-run walls; independent review. | Contract-v2 revalidation produced the narrower `candidate_sources` first loss. PR-011 now owns that successor blocker. Never reuse any spent attempt. |
| PR-010 | P2 | verified | The Phase D estimator's field named `standardUsd` used its frozen 2026-07-25 rates, while official current Terra prices are lower. Readiness reporting could confuse a conservative approval rate with current estimated spend. | The rate object was intentionally frozen for approval reproducibility but the output label did not distinguish frozen-envelope and current-market estimates. | Plan/evidence schema v2 names the dated frozen approval envelope and dated `standard_non_regional` current estimate separately. Only the frozen conservative value controls the unchanged hard ceiling. | Fail-first 5 pass / 5 intended fail; exact short/long/cache-write/search rates and totals; focused 10/10; staged 56/56; full 1,440/1,440; E2E/build/static/eval/ranking/dry-run walls; independent review. | Closed locally without live spend. Re-check and date the informational card when official prices change; never silently reprice an existing approval envelope. |
| PR-011 | P1 | verified | Contract-v2 research completed with 69 response-owned sources but failed before verification as `research_candidate_invalid / candidate_sources`. | The exact historical cause is privacy-hidden. A generalized deterministic cause was proven: canonical display dedupe discarded later exact response-owned variants before exact-membership validation. | A dedicated staged registry preserves every parseable exact response-owned variant once; canonical display/count behavior is unchanged. Closed source subreasons distinguish shape, duplicate, unsafe, and unregistered without retaining URLs. | Fail-first 27/3; focused 55/55; staged 59/59; full 1,444/1,444; E2E/static/build/dry-run walls; independent approval; a new live response crossed research validation. | Closed. Never canonical-match a model-authored URL or infer the spent response's branch. PR-012 closed the successor observability blocker; PR-013 owns lifecycle feasibility. |
| PR-012 | P1 | verified | The first research-valid staged run verified zero of 12 candidates, while the route retained only totals and made its first-loss distribution unknowable. | `materializeStagedTerraEvidencePackage()` computed real server-owned decisions, but the route discarded them before its sanitized verification diagnostic. | Verifier v2 derives six mutually exclusive candidate first-loss counts plus three separate affected-candidate rejection counts. The route accepts only fixed bounded integers, conservation, and eligible/close/excluded reconciliation; all malformed, unknown, and private values are dropped. Evidence v3 can retain the aggregate only for its own attempt. | Initial fail-first 23/6; corrected focused 30/30; staged 62/62; full 1,447/1,447; E2E 17/17; typecheck/build/static/dry-run/privacy/public-body walls; independent approval after correction of an unreachable proposed bucket. | Closed as observability only. PR-2E remains permanently unattributable. No eligibility/evidence rule changed, and the counts cannot authorize looser verification. |
| PR-013 | P1 | verified; one-lifecycle feasibility closed | PR-3I historically stopped before collection because every candidate had a missing-title source decision. PR-3K then completed research, verification, presentation, and rendering with four safe shopper cards and eight source entries; every card reference resolved. | The consumer had treated URL-only source action metadata as though a title were guaranteed. PR-3J changed only this missing-metadata branch to defer final authority to bounded page/entity verification. | Preserve the tri-state preflight and every downstream trust gate. Treat PR-3K as one feasibility result and move accuracy/repeatability measurement to PR-006, not as authority to promote the path. | PR-3K exact commit/case/evidence-v6/hash; 10/10 deferred continuation; bounded page/Shopping work; four-card/eight-source public reconciliation; zero retry/replacement/fallback; exact cost/privacy accounting; independent `VERIFIED`, confidence 0.99. | Closed as a one-lifecycle blocker only. The spent directory is immutable and cannot prove category-wide accuracy, market truth, or repeatability. Default-off and no-deploy boundaries remain. |
| PR-014 | P1 | verified correction | Research validation accepted bounded nonempty `product_name`, `brand`, `model`, and `product_type` independently, while the asset verifier rejected every candidate when those same fields did not form a coherent target. Exact downstream assets could not overcome `invalid_target_identity`, wasting Shopping/page work and guaranteeing exclusion. | Provider schema/runtime established field shape but not the relational brand/model/type invariant already required by `directTerraAssetTargetIsCoherent()`; the prompt asked for separate identities without requiring `product_name` to agree. | Research now reuses the unchanged shared predicate before source work, prompt v3 states the relation, contract v4 rolls the fingerprint, and runtime v3 records the boundary. No name synthesis or asset-verifier change. | Fail-first 18/8; corrected contract 26/26; focused 57/57; staged 70/70; full 1,455/1,455; E2E 17/17; typecheck/build/eval/ranking/dry-run/lint/diff walls; independent `APPROVED`; zero live. | Closed deterministically. The stricter early wall can reduce accepted candidate count, which is preferable to guaranteed downstream exclusion. It can prevent PR-2G's class but is not proven to explain that attempt. PR-2I crossed the identity group but stopped at facts; that does not prove every candidate passed identity. |
| PR-015 | P1 | verified correction | The only post-PR-2H attempt completed research generation but local validation stopped as `candidate_facts`, so no verification or user result exists. Offline, the old strict schema could accept a response-owned URL absent from its enclosing candidate and status/cardinality combinations later rejected by runtime. | Raw URLs were repeated in every lead while producer instructions stated only response-level ownership. Parser rules were correctly candidate-local but stricter than the paid producer boundary. | Candidate URLs remain exact response-owned registries; leads use zero-based local indexes. Closed schema variants enforce requirement status cardinality, runtime enforces integer/actual-range/uniqueness and maps exact URLs, and contract v5/schema v3/prompt v4/runtime v4 roll old jobs closed. | Fail-first 23/7; corrected contract 31/31; staged 75/75; full 1,460/1,460; E2E 17/17; typecheck/build/eval/ranking/dry-run/lint/diff walls; token mutation 50/50; independent `APPROVED`; zero live. | Closed deterministically. It does not identify PR-2I's private cause or prove provider adherence/lifecycle feasibility. Never accept another candidate's evidence, expose private facts, or remove runtime authority for dynamic range and uniqueness. |
| PR-016 | P1 | verified observability correction | PR-3A proved nine asset-identity first losses, one product-URL first loss, 192 Shopping rows, and seven successful page fetches, but evidence v3 could not say why those inputs produced no eligible candidate. | Verifier v2 discarded the closed direct-asset and commerce decisions after computing only coarse first losses; the route had no fixed schema for subreason families. | Verifier v3 adds candidate-level asset-identity and commerce outcome counts for identity first losses plus relationship and URL reason counts for their own branches. The route requires exact allowlists, safe integers, branch bounds, conservation, outcome reconciliation, and subreason coverage; unreachable states throw. Evidence advances to v4. | Verifier/route fail-first 15 pass / 7 intended fail plus a separate intended Phase D evidence-version failure; corrected focused 32/32; full 1,479/1,479; E2E 17/17; typecheck/build/eval/ranking/dry-run/lint/diff walls; independent review removed three unreachable buckets and added direct coverage mutations; final `APPROVED`. | Closed as zero-live observability only. No eligibility, ranking, evidence, price, network, public response, flag, or UI behavior changed. Live frequency remains unknown, and PR-3A's exact cause is permanently unknowable from its v3 evidence. |
| PR-017 | P1 | verified generalized correction; revalidated | PR-3C stopped in `candidate_identity`. Independently, strict schema could accept a composite `product_name` that disagreed with its separately valid brand, model, or product type, causing whole-response rejection before useful work. | JSON Schema cannot express the dynamic composite/atomic relation; prompt prose left the provider responsible for redundant identity data. | Research schema v4 removes model-authored `product_name`; server code normalizes bounded atomic fields and constructs the internal name within 300 characters before the unchanged coherence predicate. Exact keys reject the removed field; contract/prompt/runtime roll v6/v5/v5. | Five-test fail-first; normalized/exact-bound positives; all overbounds; extra-field, duplicate, trim, and authentic stale-job controls; staged 80/80; full 1,482/1,482; static/E2E/benchmark/dry-run walls; independent `APPROVED`; PR-3E crossed research validation. | PR-3E confirms progression past the old identity-contract stop but not PR-3C causation, lifecycle feasibility, or recommendation quality. Atomic maxima may reject an unusually long legitimate identity. Roll back schema/parser/prompt/runtime/test versions together; never truncate or loosen downstream identity gates. |
| PR-018 | P1 | verified generalized correction; live proof measured | PR-3E exposed 53 response sources but every one of 12 candidates supplied only one local source; eight had no asset candidate and the four observed assets lacked model title evidence, producing 12/12 asset-identity exclusions. | Research allowed one to six candidate URLs and required only exact response ownership. It did not align with the runtime's two-page collection capacity or require candidate-local response metadata to prove identity before downstream spend. | Schema v5 requires exactly two fetch-distinct exact response-owned URLs and local indexes 0/1. Runtime rejects tracking/fragment variants of one physical page, preserves identity query distinctions, and requires one exact candidate-owned title/URL record to pass the unchanged shared asset rule. Contract/prompt/runtime roll v7/v6/v6. | Fail-first 32 pass / 5 intended fail; exact ownership, same-exact title backfill, no cross-variant borrowing, zero/one/three/duplicate/unsafe/unregistered/fetch-equivalent negatives, safe slug positive and sibling/unknown-host negatives, 15x2=30 ceiling, stale-token controls, focused/full/static/E2E/benchmark walls, independent `APPROVED`; PR-3G then reached provider completion and the identity-source preflight. | PR-3G proves one-attempt provider adherence and live execution of this boundary, but not repeatable adherence, candidate-level cause, survivor yield, or shopper success. Source metadata is preflight only, never final evidence. Roll back schema/parser/prompt/runtime/test versions together; never weaken downstream identity or canonical-match ownership. |
| PR-019 | P1 | verified generalized correction; live revalidated | PR-3G reached provider completion but rejected the entire schema-valid response at `candidate_source_identity_unproven` before collection. The privacy-safe artifact could not reveal whether every candidate failed. | The preflight validator returned one response-level failure on the first candidate whose exact sources did not prove identity, so mixed-quality candidates could not proceed independently. | After strict parsing, quarantine only candidates with no identity-accepted exact source, preserve survivor order, reissue contiguous server IDs, and fail only when zero survive. Retain closed context-bound counts; rejected URLs never reach network work. Contract/runtime/evidence rolled v8/v7/v5. | Fail-first 58 pass / 12 intended fail; focused 126/126; full 1,495/1,495; E2E/static/build/eval/benchmark walls; independent `APPROVED`; PR-3I executed the candidate-local filter and isolated title metadata as the successor stop. | Closed as the all-or-nothing correction. PR-3I still had zero survivors because missing title was treated as rejection; PR-020 owns that distinct successor. Never lower candidate cardinality, accept affirmative mismatches, leak identity, or let counts authorize trust. |
| PR-020 | P1 | verified generalized correction; live revalidated | PR-3I completed provider research but filtered all 10 candidates before collection; every candidate had at least one missing-title source decision and no affirmative mismatch family fired. | The preflight treated unavailable source title metadata as identity rejection even though the official complete consulted-source action is URL-only. | Use a tri-state preflight: accept a title-proven exact source, defer any title-unavailable exact source to existing bounded page/entity verification when none is accepted, and quarantine only all-affirmative mismatches. Add a closed deferred subset and retain four mismatch families. Contract/runtime/evidence roll v9/v8/v6. | Fail-first 58/5; authentic URL-only and mixed unknown/mismatch cases; affirmative-mismatch quarantine; focused 169/169; full 1,498/1,498; complete deterministic walls; independent source-only `APPROVED`; PR-3K live conservation 10 submitted/accepted/deferred, zero rejected/mismatches, complete safe shopper result, independent artifact `VERIFIED`. | Closed as the missing-title correction. Deferral can increase page-fetch cost up to the unchanged 30 ceiling and never grants evidence or eligibility. One live success does not prove repeatability or recommendation quality; PR-006 now owns that measurement. |
| PR-021 | P1 | verified privacy-safe observability correction | The independently authorized PR-4B attempt-1 launcher exited 1 after about 9.55 seconds with one generic sentence. The prospective output leaf remained absent, proving the trusted runner never reached its pre-provider directory-creation point, but the exact historical failure stage remains unknowable without inspecting credentials or retrying. | The one-shot launcher collapsed every process, repository/trust, approval, credential, post-credential reauthentication, child-construction, spawn-error, and signaled-child failure into one generic catch message. | The launcher now emits one closed `staged-terra-readiness-launcher-terminal-v1` object with exactly six keys, one of nine fixed stages, and three explicit false authority fields. A private `WeakMap` brands genuine typed errors so public-field mutation and prototype spoofing cannot inject arbitrary stage text. Deterministic operation injection is test-only; the CLI retains the real operations and existing one-shot controls. | Fail-first missing-export failure; exhaustive synchronous/asynchronous stage mapping; malformed-result, raw-error, credential-canary, public-field mutation, prototype-spoof, one-line CLI, integer-child-exit, and no-await controls; focused 7/7; combined launcher/runner 27/27; full 1,559/1,559; typecheck, lint, build, E2E 17/17, controller, syntax, and diff checks; independent replacement `VERIFIED`, no findings, confidence 0.995. | Attempt 1 remains consumed and no provider request occurred. The correction cannot authorize a retry, replacement, attempt 2, flag change, deployment, or release. Manual credential inspection remains prohibited; the exact past cause may remain unknowable. |
| PR-022 | P1 | verified generalized correction | The default legacy route sent provider/Serper-owned citation and product-page URLs through direct server fetches. Deterministic mocked transport observed both consumers request the link-local metadata address. | `citationUrlVerification.ts` and `productAssets.ts` predated the shared DNS-pinned fetch boundary and had no complete scheme/address/redirect/body/fan-out contract. | Both consumers now reuse `fetchHybridSource()`: HTTP(S)-only parsing, credential/default-port enforcement, complete public-address resolution, address pinning, per-hop redirect revalidation, one hard DNS-plus-transport wall, declared/actual byte and content-type limits, and ordered concurrency capped at four. Citation bot-wall compatibility and product best-effort identity/asset behavior remain explicit. | Fail-first literal/mapped/IPv6 private addresses, private DNS, mixed DNS, public-to-private redirects, credential/port/scheme, malformed/limit redirects, hard DNS/transport timeout, content-type, declared/actual byte, order/concurrency, bot-wall, cache-key, and public controls; final focused 74/74; full 1,620/1,620; static/build/E2E/controller walls; independent frozen `VERIFIED`, confidence 0.98. | Closed locally by PR-6B. OS `dns.lookup` cannot cancel native resolver work after the caller's hard deadline, although no later transport can start; PR-023's admission/global-concurrency boundary owns sustained-traffic containment. Citation leniency does not prove final page usability or truth. No live exploit occurred. |
| PR-023 | P1 | open; confirmed reachable defect | Public `/api/recommendations` and `/api/features` can buffer oversized bodies and start paid work without a shared request-frequency/concurrency admission gate. Unique feature categories and legacy searches can also grow process caches without a hard capacity; identical misses are not coalesced. | Request parsing, field validation, paid-operation admission, and cache ownership evolved independently. The active legacy validator has no maxima for query/budget/priorities/avoid, both routes call `json()` before a byte ceiling, and both cache maps retain unique keys without a capacity sweep. | In PR-6C, add a server-owned pre-provider admission contract: declared/actual body bounds, exact field limits, bounded global/provider concurrency, deployment-aware rate policy, bounded TTL/LRU caches, and in-flight coalescing. | Oversized declared/actual bodies and fields must stop before client creation; burst/parallel/unique-key mutations must prove rejection, coalescing, eviction, and recovery without provider/network calls; multi-instance limitations must be explicit. | This is the active next unit after PR-6B. A process-local IP-only limiter is not sufficient production authority, and tracked CDN/WAF protection is absent rather than disproven. |
| PR-024 | P2 | open; confirmed source-control gap | The browser can label a legacy search cancelled while the active synchronous server path has not wired request cancellation into its provider work. | The client aborts its fetch, but legacy provider calls receive fixed timeouts rather than the request abort signal. Job-token cancellation exists only for the default-off asynchronous routes. | Propagate one server-owned cancellation signal through every cancel-safe legacy provider/fetch stage, distinguish user cancellation from timeout/failure, and never retry or start later paid stages after cancellation. | Deterministic abort-before-create, abort-in-flight, between-stage, late-abort, timeout, and cleanup tests with exact provider-call counts and stable user errors. | Framework/host disconnect behavior still needs direct deterministic proof. Keep this behind PR-023; do not claim the current UI stops already-dispatched provider billing. |

## Suspected weaknesses requiring measurement

| ID | Severity | Status | Hypothesis and expected impact | Measurement before implementation | Risk and dependency |
| --- | --- | --- | --- | --- | --- |
| PR-S01 | P1 | investigating | Broad searches may miss mainstream leaders before ranking because of query crowd-out, source imbalance, or candidate budgets. | Compare raw provider rows, admitted candidates, verified candidates, and final cards for a reviewed multi-category leader matrix. | Market lists drift; review them before treating absence as a defect. |
| PR-S02 | P1 | investigating | Exact matches may still contain unverified hard facts or misleading current prices on the legacy path under unusual page/offer shapes. | Mutation corpus for numeric, compatibility, availability, financing, promo, used/refurbished, related-product, and conflicting-price pages plus bounded live traps. | Never increase exact counts by weakening unknown/fail handling. |
| PR-S03 | P1 | investigating | Duplicate variants or over-collapse may waste slots or hide meaningfully distinct products. | Trace canonical identity and variant-family decisions on same-brand/same-size and distinct-size/model families across categories. | Identity fixes can cause both false merges and false splits. |
| PR-S04 | P2 | investigating | Users may confuse Important Details, inferred dealbreakers, and the display-only strength slider. | Accessibility/UX walkthrough, field comprehension review, and E2E proof of what changes the request versus only the display. | A new avoid field changes request UX and should follow observed confusion, not aesthetic preference. |
| PR-S05 | P1 | partially confirmed as PR-024 | Cancellation, provider timeouts, retry ownership, and partial-success behavior may leave work running or surface generic failures in edge states. The legacy request signal is not connected to provider calls; remaining stage behavior still needs fault injection. | Deterministic lifecycle fault injection at every create/retrieve/fetch/presentation boundary; inspect one bounded live cancellation only if offline proof is insufficient. | Do not create extra provider jobs merely to test cleanup. |
| PR-S06 | P1 | partially confirmed as PR-023 | Cache keys, TTLs, and flag/config differences may contaminate requests or make development tests unrepresentative. The shared legacy cache and generated-feature cache are now proven capacity-unbounded; contamination semantics remain to be measured. | Enumerate caches and key inputs; mutation tests for request, flag, model, and evidence differences; restart and concurrency tests. | Avoid clearing user data or relying on global mutable state. |
| PR-S07 | P1 | partially confirmed; PR-022 fixed, PR-023 open | Input limits, rate limiting, unsafe URL handling, redirect safety, and log redaction may have untested operational gaps outside the existing trust boundaries. PR-6B closed the confirmed legacy outbound destination gap; missing paid-request admission, hosted edge controls, and remaining log/header behavior stay open or unknown. | Threat-model route and external-fetch surfaces, then add bounded payload, admission, injection, and log-leak tests. | Security fixes take priority over performance work. |
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

- Status: **closed — failed safely at first terminal outcome on 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Scope: the existing frozen broad `shop vac` Phase D case ran exactly once at
  PR-3 commit `43857e072da54ee8f988887d3813722ed6fd005b` under the existing
  ceilings.
- Stop policy: first terminal result ends the phase. No retry, replacement,
  fallback, second case, organic/SearchAPI request, promotion, or deployment.
- Result: research completed; verification excluded all ten candidates before
  presentation, with nine `assetIdentityUnproven` and one
  `identitySafeProductUrlUnavailable`. The exact counters, usage, cost, SHA-256,
  privacy allowlist, conservation, and clean tracked state independently
  returned `VERIFIED`. The artifact is immutable/spent and no retry ran.
- Alternatives: a broad live matrix is premature until one staged lifecycle
  succeeds; another offline contract edit is speculative without a reproduced
  failure; weakening gates to manufacture a result is prohibited.
- Reasoning: **High** for boundary/evidence adjudication; **Medium** for the
  bounded mechanical execution.

### Phase PR-3B — Make the verification first loss actionable

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-016 P1; PR-013 remains blocked.
- Scope: derive only fixed candidate-level subreason counts from existing
  server-owned direct-asset, Shopping, relationship, and product-URL decisions.
  Do not retain candidate identities or change any verification rule.
- Proof: verifier/route fail-first 15/7 plus a separate intended Phase D
  evidence-version failure; corrected focused 32/32; complete 1,479/1,479;
  E2E 17/17; typecheck, build, lint, legacy eval, ranking, dry-run, and diff
  walls; independent reachability and privacy review with final `APPROVED`.
- Review corrections: remove unreachable identity/relationship-safe URL and
  weak-target buckets; make those states invariant failures; directly test all
  four subreason-coverage checks and branch-local overbounds.
- Rollback: revert verifier-v3 aggregate, exact route sanitizer, evidence-v4
  label, and their tests together. The default-off app and public API remain
  unchanged.
- Reasoning: **High** for attribution truth and privacy; **Medium** for fixed-
  schema plumbing.

### Phase PR-3C — Measure once with verification subreason evidence

- Status: **closed — failed safely at first terminal outcome on 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Result: the one clean `a7434262` invocation stopped after provider research as
  `research_candidate_invalid / candidate_identity`, before collection,
  Shopping, verification, presentation, or rendering. No North-Star value
  changed.
- Proof: the 18,255-byte evidence-v4 artifact and SHA-256 independently returned
  `VERIFIED`, confidence 0.99. It reconciles one create, 20 retrieves, three
  hosted searches, one cancel, terminal usage, `$0.192316` frozen-conservative
  cost, every zero downstream counter, and the privacy allowlist.
- Limit: the exact identity field, invariant, candidate, and value remain
  private and unknown. PR-3C neither explains PR-3A nor proves that the
  generalized offline relation below caused this live stop.
- Reasoning: **High** for evidence adjudication; **Medium** for the bounded run.

### Phase PR-3D — Remove redundant model ownership of composite identity

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-017 P1; PR-013 remains blocked pending revalidation.
- Generalized reproduction: strict schema can accept four independently bounded
  but cross-field-incoherent identity tuples that the unchanged shared verifier
  rejects. JSON Schema cannot encode the dynamic relation, and prompt prose is
  not an executable trust boundary.
- Correction: research schema v4 omits `product_name`, requires only atomic
  brand/model/complete-product type, and allocates 100/120/78 characters so the
  server-constructed name plus two separators cannot exceed 300. Runtime
  normalizes whitespace, derives the name, rejects extra keys, and still applies
  shared coherence and duplicate checks. Contract/prompt/runtime roll to v6/v5/
  v5.
- Preserved boundaries: source ownership, requirements, facts, exact product
  identity, complete-product relationship, commerce, assets, evidence,
  eligibility, ranking, public API, flags, and deployment remain unchanged.
- Proof: exact five-test fail-first; positive normalized and exact-300 bounds;
  all three overbounds; unexpected composite; duplicate/model-trim controls;
  staged, full deterministic, typecheck, lint, build, E2E, benchmark, eval,
  ranking, zero-network dry-run, diff, independent, and clean-state walls.
- Result: staged 80/80; full 1,482/1,482; five batch partitions reconciled;
  benchmark 10/10 cases and 29/29 invariants; E2E 17/17; independent
  `APPROVED`, no findings, confidence 0.98 after authentic stale-job mutation
  coverage.
- Limitation: shorter atomic maxima are deliberately conservative and may reject
  an unusually long legitimate identity. This is preferable to truncation or an
  unverifiable composite, but live adherence and recall remain unmeasured.
- Reasoning: **High** for contract/trust design; **Medium** for localized code.

### Phase PR-3E — Revalidate the structural identity contract once

- Status: **closed — failed safely at first terminal outcome on 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Result: the one clean `bf7e37b4` invocation completed research with 12
  candidates/53 response sources, then collected 12 source pages (four
  successful) and 201 Shopping rows from 12 requests. Verification returned
  0 eligible / 0 close / 12 excluded, all at asset identity, before
  presentation. One create, 14 retrieves, three hosted searches, one cancel,
  and `$0.184904` frozen-conservative cost stayed within every ceiling.
- Attribution: every candidate supplied one local source. Asset subreasons were
  eight no-asset-candidate and four model-not-in-title. Commerce subreasons
  overlap and do not prove cause. There was no retry, replacement, fallback,
  second case, public result, flag change, or deployment.
- Proof: the 16,119-byte evidence-v4 artifact and SHA-256 independently returned
  `VERIFIED`, confidence 0.99, for exact commit/case/schema, counters, usage,
  cost, conservation, first stop, and privacy. The directory is spent.
- Reasoning: **High** for evidence adjudication; **Medium** for bounded execution.

### Phase PR-3F — Ground candidate collection in response-owned identity

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-018 P1; PR-013 remains blocked pending revalidation.
- Scope: require exactly two fetch-distinct, exact response-owned source URLs
  for each research candidate and require at least one candidate-owned exact
  title/URL record to pass the unchanged shared asset-identity predicate before
  collection. Keep lead references local and limited to indexes 0 and 1.
- Preserved boundaries: exact string membership still establishes ownership;
  fetch equivalence only rejects known-tracking/fragment variants of one
  physical page. Identity-bearing query parameters remain distinct, titles are
  never borrowed between variants, and response metadata never becomes final
  evidence or shopper output. All downstream verification gates remain intact.
- Contract: research schema v5, contract v7, prompt v6, and runtime v6. The new
  URL-free failure reason is `candidate_source_identity_unproven`. The existing
  safe manufacturer/established-retailer product-slug identity path remains an
  intentional positive; sibling and unknown-retailer slugs fail.
- Ceiling: schema max 15 candidates times exactly two sources equals the
  unchanged runtime maximum of 30 source fetches.
- Proof: fail-first passed 32 and failed exactly five new expectations; focused,
  complete deterministic, typecheck, lint, build, E2E, tracked benchmark,
  legacy eval/ranking, and diff walls passed. Independent review drove
  fetch-distinctness, prompt/runtime alignment, exact-title backfill, explicit
  15x2 ceiling, safe-slug, and mutation coverage before returning `APPROVED`,
  no findings, confidence 0.98. Final full tests passed 1,489/1,489; E2E passed
  17/17; the final controller reconciled all five partitions and the 10-case/
  29-invariant benchmark.
- Reasoning: **High** for source ownership/identity and privacy; **Medium** for
  localized implementation.

### Phase PR-3G — Revalidate source-grounded staged feasibility once

- Status: **completed first-terminal stop 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Result: clean commit `ac53c10e` reached provider completion, then stopped at
  the bounded identity-source validation triple before product-data work. One
  create, 31 retrieves, six hosted searches, one cancel, and `$0.354123`
  frozen-conservative cost stayed within the envelope. Artifact hash/privacy/
  sequence/accounting independently returned `VERIFIED`, confidence 0.99.
- Decision: completed-below-cap evidence rejects token-cap and prompt-only
  guesses. The generalized all-or-nothing candidate handling selected PR-3H.
- Reasoning: **High** for evidence adjudication; **Medium** for bounded execution.

### Phase PR-3H — Quarantine identity-unproven candidates

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-019 P1; PR-013 remains blocked pending revalidation.
- Scope: after the unchanged strict response parse, quarantine only candidates
  with no accepted exact response-owned identity source. Preserve discovery
  order, reissue contiguous server candidate/fact IDs, and prevent rejected
  URLs from reaching fetch or Shopping. Fail when zero survive.
- Diagnostic: submitted/accepted/rejected counts plus five reachable reason
  families. The verifier contributes one or two distinct families for each
  rejected candidate; exact-key route sanitization requires safe bounds,
  conservation, each family no greater than the rejected count, an aggregate
  total from the rejected count through twice that count, success/survivor
  binding, and exact all-rejected failure binding. Malformed/private evidence
  is omitted.
- Preserved boundaries: provider still submits 8–15 schema-valid candidates,
  each with exactly two fetch-distinct exact response-owned sources. Shared
  identity, source ownership, network ceilings, downstream evidence, public
  response, flags, and prompt/schema remain unchanged.
- Proof: fail-first 58 pass / 12 intended fail; corrected focused 126/126; full
  1,495/1,495; E2E 17/17; typecheck/build/lint/eval/ranking/dry-run/diff walls;
  exact five-batch and 10-case/29-invariant reconciliation; independent
  `APPROVED`, no findings, confidence 0.97.
- Reasoning: **High** for trust/evidence design; **Medium** for localized
  implementation.

### Phase PR-3I — Revalidate candidate-quarantine feasibility once

- Status: **completed first-terminal stop 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Result: clean commit `bd54de90` reached provider completion, then stopped at
  the identity-source failure before product-data work. The aggregate reports
  10 submitted, zero accepted, 10 rejected, and at least one missing-title
  decision per candidate; all affirmative mismatch families are zero.
- Accounting/proof: one create, 24 retrieves, five searches, one cancel, and
  `$0.281099` frozen-conservative cost. Exact evidence-v5 hash/privacy/sequence/
  accounting independently returned `VERIFIED`, confidence 0.99.
- Decision: the documented URL-only source-action contract and the aggregate
  select PR-3J's missing-metadata handling, not a weaker identity predicate or a
  prompt/schema guess.
- Reasoning: **High** for evidence adjudication; **Medium** for bounded execution.

### Phase PR-3J — Defer title-unavailable sources to final page authority

- Status: **verified locally 2026-08-29; zero live**
- Severity addressed: PR-020 P1; PR-013 remains blocked pending revalidation.
- Scope: keep exact ownership and title-proven identity acceptance; when none is
  accepted but any exact source lacks a title, continue that candidate only to
  the existing bounded DNS-pinned fetch and unchanged entity verifier. Quarantine
  only all-affirmative mismatches.
- Diagnostic: submitted/accepted/deferred/rejected counts and four affirmative
  mismatch families. Deferred is a subset of accepted; exact-key sanitization
  enforces conservation, completion-slate equality, and zero deferred in an all-
  rejected failure.
- Preserved boundaries: two fetch-distinct exact sources, 8–15 provider
  candidates, 30-fetch ceiling, exact ownership, downstream identity/evidence/
  commerce/requirements, public bodies, prompt/schema, and default-off flags.
- Proof: fail-first 58 pass / 5 intended fail; corrected focused 169/169; full
  1,498/1,498; E2E 17/17; typecheck/build/lint/eval/ranking/benchmark/
  reconciliation/diff walls; independent source-only `APPROVED`, no findings,
  confidence 0.96. The reviewer's accidental `.env.example` test run is excluded.
- Reasoning: **High** for trust/API-contract design; **Medium** for localized
  implementation.

### Phase PR-3K — Revalidate tri-state source handling once

- Status: **completed and independently verified 2026-08-29**
- Severity addressed: PR-013 P1 and dependency for PR-006/PR-4.
- Result: the one unchanged frozen `shop vac` case at clean commit `8c57cd59`
  completed research, verification, presentation, and public rendering in
  116.495 seconds. It returned four eligible cards and eight source entries;
  every card reference resolved. All 10 research candidates continued through
  missing-title deferral, with zero affirmative mismatch or rejected candidate.
- Accounting: two creates, 40 retrieves, eight hosted searches, 10 Shopping
  calls, 20 page fetches, 25 physical HTTP attempts, 77,273 input tokens, 9,064
  output tokens, and `$0.457438` frozen-conservative cost. Retry, replacement,
  fallback, second-case, and safety-cancel counters were zero.
- Proof: the 51,640-byte evidence-v6 artifact hash is
  `9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
  Independent strict read-only audit returned `VERIFIED`, no findings,
  confidence 0.99; tracked state and default-off behavior were authenticated.
- Limit: this closes one-lifecycle feasibility only. It is not repeatability,
  current-market accuracy, or production authority.
- Reasoning: **High** for evidence adjudication; **Medium** for bounded execution.

### Phase PR-4A — Establish current truth and a staged measurement boundary

- Status: **verified locally 2026-08-29; independently `VERIFIED`; zero live**
- Matrix: `staged-terra-readiness-matrix-v1` is reviewed 2026-08-29 and expires
  2026-09-12. It freezes broad `shop vac` twice, constrained four-main-burner
  gas grill twice, adversarial mesh/lumbar office chair once, and over-
  constrained self-emptying/pet-hair/cord robot vacuum once. Exact order, run
  IDs, nonces, requests, sources, product identities, uncertainty, and manual
  audit registries are versioned. Must-consider truth requires at least two
  independent current sources; illustrative products cannot satisfy broad
  recall by implication.
- Bars: zero wrong type, hard-requirement, budget, or unregistered-source
  failures; at least two broad must-consider products per run and union; at
  least 0.60 pairwise final-card Jaccard; completed wall time no more than 12
  minutes; evidence age no more than 24 hours; per-run conservative cost no
  more than `$1` and aggregate no more than `$6`; existing network ceilings;
  zero retries, replacements, fallback, organic, SearchAPI, or extra cases.
- Artifact boundary: canonical UTF-8 JSON plus raw and payload SHA-256 seals,
  exact staged runtime/prompt/model/presentation versions, public-response and
  private-diagnostic reconciliation, closed terminal tuples, per-stage usage,
  counters, evidence activity, commerce rows, timing, source/card/requirement/
  price/offer/image/manual audits, and a precommitted prior-artifact chain.
  Conservative URL handling rejects credentials, ports, non-public hosts,
  sensitive query keys, and every nonempty fragment. Raw provider/private
  content is outside the schema.
- Analyzer: authenticates the full frozen matrix hash and every commit, request,
  run, nonce, attempt index, artifact, prior hash, capture window, version,
  counter, token, cost, timing, audit, and final-card identity. Candidate-pool
  Jaccard is intentionally `not_scored_privacy_boundary`; adding stable private
  candidate hashes would create a dictionary-attackable surface.
- Authority: every prefix and full result stops. Clean prefixes return only
  `next_attempt_review_required`; a clean complete set returns only
  `independent_review_required`. Origin, machine, and release authorization are
  always false. No fixture or analyzer output can dispatch or approve spend,
  flag promotion, deployment, or release.
- Proof: exact implementation hashes are matrix
  `289ada281c3f8185c4b4bdec64cb34dc55a1af3ccb5ed0f25b51b1483bdfae2c`,
  artifact producer
  `0b5f5f95c72fad52461cd50537916bc7084deb3055fd821e73c1f1de482d059c`,
  analyzer
  `8bf1985964734dbce53010d9a8a243b986ea6fea9999b23f7640bf328440c5dd`,
  and tests
  `38e0f585f18965a908b5db35e0c57b418b1108a509a0ffbee01228af8af77411`.
  Focused 34/34; complete 1,532/1,532 across 215 suites; exact five-partition
  reconciliation; benchmark 10/10 cases and 29/29 invariants; typecheck,
  production build, E2E 17/17, lint, eval, ranking, both dry runs, syntax, and
  diff checks passed. Independent replacement review returned exact verdict
  `VERIFIED`, no actionable finding, confidence 0.97.
- Limits: source truth was reviewed, not refreshed by the offline reviewer;
  provider behavior and all six results remain unknown. The source window can
  drift before expiry. A main-agent process deviation enumerated live-fixture
  filenames in two command outputs but read no content, hash, or value; the
  independent reviewer did not access the live-fixture tree. No PR-4A provider,
  product-data, route, replay, or live-fixture call ran.
- Reasoning: **High** for truth and metric design; **Medium** for implementation.

### Phase PR-4B — Measure staged accuracy, stability, latency, and cost

- Status: **attempt 1 consumed before provider work; no artifact; live protocol
  stopped and PR-021 selected**
- Runner boundary: `scripts/run-staged-terra-readiness.mjs`,
  `scripts/staged-terra-readiness-io.mjs`, and
  `scripts/staged-terra-readiness-runner.mjs` freeze one dry-run-first serial
  execution seam. They bind the exact commit, raw and canonical matrix hashes,
  attempt index/key/request/run ID/nonce, prior artifact, prospective absent
  output, current ceilings, default-off flags, clean tracked state, and safe
  in-memory credential shape. The runner never selects or starts a later
  attempt automatically.
- Trust and durability: the runner authenticates every discovered local import
  plus fixed package/matrix files to a Git `100644` blob, working-file Git hash,
  and raw SHA-256 manifest; nonliteral dynamic imports/requires fail closed.
  Fixed output-parent realpaths reject links/indirection before work, the
  created leaf is reauthenticated, checkpoints are append-only and fsynced,
  and hard-link publication refuses replacement. Only the closed public route
  result and allowlisted diagnostics can enter the PR-4A canonical producer.
- Independent correction loop: the first review found that an untracked runner
  could appear commit-bound, output parents could be indirect, and an in-place
  checkpoint could be lost. The second required transitive import-closure
  authentication. The third proved that a literal dynamic import with options
  could escape that closure. After Git/raw manifest binding, fixed-parent and
  append-only publication, AST-discovered closure, exact import-options
  capture, and nonliteral rejection, the fourth review returned exact
  `VERIFIED`, no actionable finding, confidence 0.99.
- Proof: fail-first execution produced the expected missing-runner module
  failure. Corrected focused tests pass 15/15; combined PR-4A/PR-4B tests pass
  49/49; current closure is 57 local paths with zero failure; exact source
  SHA-256 values are IO
  `6272e99e5fdc74c5fb8b97c750f8f3d49f1b2fc80e913dc2c784b8b5d0410ed8`,
  runner
  `0dcb6e2b6b7cd546484036f53d38fdb1415a88342e4ab4eb30564c4309251b49`,
  executable
  `5c066a6b4f0f504a68d18377e39a2c93397f488fabfdce28f08f8cfb2ec9a3f2`,
  and tests
  `85c681e35ed20e4cf070966b47ae196b314c25686577ce0d73bd2e67f0c4ebc1`.
  Complete deterministic tests pass 1,547/1,547 across 216 suites; typecheck,
  production build, E2E 17/17, syntax, and lint with zero errors/three old
  warnings pass. Deterministic controller
  `agent-loop-2026-08-29T23-03-39-286Z` reconciles all five named partitions,
  the 10-case/29-invariant benchmark, deterministic eval, typecheck, lint, and
  the complete unit wall. No provider, product-data, credential, replay, or
  live call ran.
- First committed-plan adjudication: commit
  `d2df488431c4da4176c8de56baf6d9f44efa1dc8` and its 60-entry trust manifest
  received independent `VERIFIED`, no finding, confidence 0.995. Its exact
  27-argument attempt-1 plan was sound, but the bare shell had no credentials.
  A proposed `node --env-file=.env.local` prefix then received
  `CHANGES REQUIRED`: broad loading could import `OPENAI_BASE_URL`,
  `NODE_OPTIONS`, or another unreviewed behavior control.
- Credential-origin correction: a dedicated launcher authenticates itself and
  the complete trust surface before reading credentials and again before
  spawn; requires exact Node arguments and the 27 approved runner arguments;
  reads one direct bounded `.env.local` through a single identity-checked file
  handle; reconstructs the child environment from fixed host essentials, only
  the two credential values, and the official OpenAI endpoint; rejects inherited
  loader, debug, TLS, certificate, and proxy-enable controls; uses the exact
  Node binary with no shell; and pins `https://api.openai.com/v1` explicitly in
  the SDK options. Unknown file variables and parent proxies do not survive.
- Credential review loop: fail-first launcher execution produced the expected
  missing-module failure. The first frozen review returned `CHANGES REQUIRED`
  because inherited `NODE_DEBUG=child_process` could print child credentials
  and the validated credential path could be swapped before a separate path
  read. The corrected launcher rejects both debug variables before credential
  access and immediately before spawn, and brackets one handle read with
  device/inode/size/mtime/ctime plus direct-realpath checks. Replacement review
  returned exact `VERIFIED`, no actionable finding, confidence 0.98.
- Corrected source SHA-256 values are OpenAI client
  `feaa0bceb6c219a3029ded7f5ad97aa4001c1a4200acffc3ee3e4ee75afb9b6f`,
  launcher
  `fb806931187720657ba65a7b96a00d9d83252cabdab17ccc910ee4f4d3818daa`,
  executable
  `78533332220d58c83a03b4818797ea9d416188c9e4cf1cc2fd7cc9aa7504382a`,
  IO
  `c2c82ed986a411532a101f433036e783e8bb3488719276dc769347a7dfeb08a6`,
  runner
  `684f26000e455ad9760c605c96eb3b8e50ba15f8fa01632027f50a36c2c16549`,
  and launcher tests
  `97ba1e269acfeeb6fe5d21a1b9219248b692de641348292f1cc3d1bcda622539`.
  Focused launcher tests pass 5/5; launcher/runner 20/20; PR-4A/runner/launcher
  53/53; complete tests pass 1,552/1,552 across 217 suites; typecheck, build,
  E2E 17/17, syntax, and lint pass. Deterministic controller
  `agent-loop-2026-08-29T23-47-19-401Z` independently reran typecheck, lint,
  all 1,552 tests, deterministic eval, five serial partitions, and the tracked
  10-case/29-invariant benchmark with no repeated failure candidate.
- Exact attempt-1 adjudication: clean `main` commit
  `6e0446bfc19e435a584ebf3eab18522d47207164`, parent
  `d2df488431c4da4176c8de56baf6d9f44efa1dc8`, the six reviewed source hashes,
  61-entry trust manifest
  `f82e18a3ec21de995130128832d8dca03698309262a942e39fe2dae2ad6a5b1c`,
  unexpired matrix, exact 27 arguments, direct absent output, and all ceilings
  received independent `VERIFIED`, no finding, confidence 0.99. It authorized
  one invocation only and was consumed regardless of outcome.
- Attempt-1 result: the exact launcher exited 1 after about 9.55 seconds and
  emitted only `Readiness launcher stopped before invoking the trusted runner.`
  Post-stop reauthentication found the commit, hashes, trust manifest, tracked
  tree, and index unchanged. The exact prospective leaf remained absent with
  direct fixed parents and zero boundary failures. Because the trusted runner
  creates that directory before any provider request, independent audit returned
  `CONSUMED — PRE-PROVIDER STOP, FAILURE STAGE UNATTRIBUTED; NO RETRY
  AUTHORIZED`, with no-provider confidence 0.99.
- Attribution limit: the generic launcher catch covers pre-spawn rejections,
  child-process spawn errors, and signaled/noninteger child exits. No runner
  stdout plus the one-trust-pass duration make the credential gate the leading
  inference (confidence 0.75), not a diagnosed cause. Manual credential access,
  retry, replacement, and attempt 2 are prohibited.
- Current gate: preserve the consumed stop. PR-021 now closes future launcher
  attribution locally, but it cannot recover attempt 1 or authorize another
  invocation. Any future live continuation requires a separate protocol,
  governance decision, and exact independent authorization; this phase grants
  none.
- Run the independently approved, low-parallelism broad/constrained/adversarial/
  over-constrained matrix, with repeated samples only where needed to measure
  variance.
- Record leader coverage, exact/near truth, wrong-type and page leakage,
  duplicate families, verified price coverage, first-loss stage, final-card
  Jaccard, the candidate-pool privacy non-score, stage timing, calls, tokens,
  and estimated cost.
- Execute in the exact six-run serial order. Before each paid invocation,
  authenticate the clean commit, unexpired matrix, exact request/run/nonce,
  absent prospective artifact, previous artifact hash, runner, and aggregate
  remainder. After each result, build and independently inspect the canonical
  artifact and manual audits, run prefix analysis, and stop. Machine output
  never authorizes the next attempt.
- Stop immediately on any P0/P1 safety/trust failure, expired truth, malformed
  or stale evidence, accounting/timing drift, unexpected terminal failure, or
  missed per-run/aggregate ceiling. No retry or replacement.
- Reasoning: **High**.

### Phase PR-4C — Close typed readiness-launcher attribution

- Status: **complete locally; zero live; independently verified**
- Objective and bottleneck: make any future one-shot launcher stop attributable
  without weakening credential privacy or reviving the consumed PR-4B attempt.
  The generic sentence—not provider quality—was the proven defect. Manual
  credential inspection, raw-error logging, or a retry would have crossed the
  trust boundary and remained weaker alternatives.
- Contract: `staged-terra-readiness-launcher-terminal-v1` has exactly six keys:
  `schemaVersion`, `status`, `stage`, `retryAuthorized`,
  `replacementAuthorized`, and `nextAttemptAuthorized`. The three authority
  fields are always false. The fixed stage registry covers process,
  repository/trust, approval, credential, post-credential reauthentication,
  child invocation, child spawn, child signal/noninteger exit, and internal
  failure.
- Control-flow and privacy: each synchronous and asynchronous launcher boundary
  maps to one stage. Unknown errors map only to `launcher_internal_failure`;
  raw exceptions, paths, nested values, and credential-shaped canaries never
  serialize. Genuine typed errors are module-privately branded with a `WeakMap`;
  the public stage property is nonwritable/nonconfigurable, and prototype spoofs
  map closed. The deterministic operation seam is supplied only by tests; CLI
  execution uses the frozen real operations. Integer child exits still pass
  through, and no `await` occurs between final process validation and child
  construction/spawn.
- Independent correction loop: the first frozen review returned `CHANGES
  REQUIRED`, confidence 0.995, because a caller could mutate the public stage or
  spoof the error prototype and serialize arbitrary credential-canary text. The
  private-brand correction received replacement verdict `VERIFIED`, no
  actionable findings, confidence 0.995.
- Frozen source SHA-256 values: launcher
  `eaa98872a4fe8829438985b0e5c05cce3a7ca2117ac7863c72d245c26e386c72`;
  terminal tests
  `4f6bdfe19af947e451b28fd63c26b43261c2ded9ae152b442993521fb7545c50`.
- Proof: fail-first stopped on the missing terminal export. Corrected terminal
  tests pass 7/7; combined launcher/terminal/runner tests pass 27/27; the full
  suite passes 1,559/1,559 across 218 suites; typecheck, production build,
  Playwright 17/17, syntax, diff, and lint with zero errors/three old warnings
  pass. Deterministic controller `agent-loop-2026-08-30T00-30-38-163Z`
  reconciles all five named partitions, 10/10 benchmark cases, 29/29
  invariants, deterministic eval, typecheck, lint, and the complete unit wall.
- Authority limit: no credential file, provider, product-data service, network,
  or live fixture was accessed. Attempt 1 remains consumed, its exact historical
  stage remains unresolved, and this correction grants no retry, replacement,
  attempt 2, flag change, deployment, release, push, or spend.
- Reasoning: **High** for taxonomy, privacy, and authority; **Medium** for the
  localized implementation and deterministic verification.

### Phase PR-5 — Correct the highest-impact repeated first loss

- Status: **in progress; PR-008 and PR-007 complete locally**
- Select only after PR-4 evidence. Add fail-first regression coverage, make one
  generalized correction, run focused and broad controls, compare against the
  same baseline, reject or revert speculative complexity, document, and commit.
- Repeat this phase while each retained correction improves a North-Star metric
  or closes a release blocker.
- Reasoning: **High** for root-cause selection; **Medium** for routine localized
  implementation.

#### PR-5A / PR-008 — Close professional-test exact-model authority

- Status: **complete locally; zero live; independently verified**
- Objective and bottleneck: close RR-092 at the earliest reachable shared
  boundary. A full staged fail-first proved that downstream asset safety already
  refused the URL-less editorial image, so changing staged selection would have
  targeted a symptom. The shared verifier itself reproduced exact identity and
  image authority from page-topic Product markup without a tested-model match.
- Correction: `oai-hybrid-verifier-v2` requires a complete stable tested-model
  identifier or one explicit proposed alias. A shared family token is
  insufficient, unexpected stable identifiers conflict, and a stable explicit
  Product `model` that is unrelated or conflicting rejects the entity before
  name/SKU fallback. Only professional-test entity selection is stricter;
  official and purchase-page rules remain unchanged. Missing or contradictory
  tested-model evidence clears exact entity authority and any provisional image.
- Controls: exact `X100 A1`, sibling `X100 B2`, unrelated `B900`, missing model,
  cross-category C100/B200, exact `12704570 / SUZE0` alias, non-null image
  clearing, exact-entity price, official-product, purchase-page, staged commerce,
  and full materializer coverage.
- Independent correction loop: review one found shared-family and coverage
  defects; review two found explicit-model precedence. Both returned `CHANGES
  REQUIRED`. The third frozen review returned `VERIFIED`, no findings,
  confidence 0.995.
- Frozen SHA-256: verifier
  `efe5a0c2a457780eb815164843e579f8054ba86f6baa2b2dde3afd5e5cc2ebf6`;
  verifier tests
  `4764e6b1a62af273006e12ae59c0eae2efb0631ab669531d109c4d969cbe0a2d`;
  staged tests
  `d4bc7248e64787f29b6f90c6e4dca5f13fb1767c9bdbd0a1f11ffcfe7816961d`.
- Proof: final focused 57/57; full 1,568/1,568 across 218 suites; typecheck,
  production build, Playwright 17/17, syntax, diff, and lint with zero errors/
  three old warnings. Controller `agent-loop-2026-08-30T01-03-39-664Z`
  reconciled all five partitions, 10/10 benchmark cases, 29/29 invariants, and
  deterministic eval with no repeated failure candidate.
- Limits: no provider, network, credential, or live fixture was accessed. This
  closes RR-092 locally but does not establish live quality, source-role
  semantics, production readiness, flag promotion, deployment, release, or
  push authority.

#### PR-5B / PR-007 — Close reachable exact-model price authority

- Status: **complete locally; zero live; independently verified**
- Objective and bottleneck: determine whether RR-091's historical same-page
  related-price defect still reached an application path before changing code.
  `lib/autonomousResearchAdapter.ts` remains scripts/tests-only and still has
  only URL/source-role membership. The staged and Direct-Terra routes remain
  default-off, the Direct-Terra output labels transactional data `unverified`,
  and the legacy route imports neither the historical adapter nor these
  experimental shared paths. Current shared consumers nevertheless reproduced
  a generalized exact-identity weakness that could select a sibling row.
- Correction: `productIdentity.ts` now owns one punctuation-aware identity
  relation for complete aliases, compound and descriptive identities,
  contextual year/decimal models, measurement exclusions, technology phrases,
  strong conflicts, and bounded model/variant/trim label assertions. Forward
  and reverse assertions share one connector grammar. A comma is allowed only
  inside a fully recognized assertion; ordinary feature-list punctuation stays
  a hard boundary. Commerce v2, SearchAPI offers v2, fact verifier v3, Direct-
  Terra assets v6, product-page URL/title/path selection, and staged
  materialization reuse the relation. Accessory/replacement classification is
  preserved.
- Controls: numeric and mixed siblings; compounds and descriptive trims;
  year-like and decimal models; measurements; Bluetooth LE/Low Energy, USB
  Type-C, HDMI eARC, Wi-Fi 6E, and DisplayPort Alt Mode; split and compact
  labels; forward/reverse single- and multiword copulas; appositive commas;
  negative feature prose; structured Product name/model conflicts; canonical,
  token, offer, asset, title, path, CTA, relationship, and staged consumers.
- Independent correction loop: successive reviewer challenges found sibling
  concatenation, year/decimal collapse, incomplete qualifier vocabularies,
  technology-span erasure, compact labels, single/multiword and asymmetric
  copulas, and appositive commas. Every finding received fail-first coverage
  before a shared correction. The final frozen replacement review returned
  exact `VERIFIED`, no material finding, confidence 0.995, and independently
  rejected 60/60 generated comma-punctuated connector assertions while keeping
  feature controls accepted.
- Frozen SHA-256 anchors: shared identity
  `f62214058e938c7dfbc4024833ea91b711e4e11975b01a1ec6fd3c86d23f13bc`;
  identity tests
  `ca5a97f98945524248c6baf7baa677a2b0e6fb98adf12f17803d38944303cc07`;
  the complete 17-file manifest is retained in `docs/qa-loop-results.md`.
- Proof: final focused 205/205 across 14 suites; full 1,604/1,604 across 218
  suites; typecheck; production build; Playwright 17/17; full lint with zero
  errors/three old warnings; diff check; controller
  `agent-loop-2026-08-30T05-25-58-006Z` with all five partitions, 10/10 cases,
  and 29/29 invariants. The scorecard cost guard stopped before provider work;
  the ledger benchmark made zero provider calls and measured 0.253 ms/request.
- Limits: RR-091 remains `Needs Investigation — contained/narrowed` because the
  isolated historical adapter is unsafe if ever promoted. No provider, network,
  credential, manual environment-file, or live-fixture work occurred. This does
  not establish live market quality, flag safety, production readiness,
  deployment, release, or push authority.

#### PR-6A — Production-boundary baseline

- Status: **complete; evidence-only; zero network; independently verified**
- Objective and decision: with PR-006 live quality measurement blocked, audit
  the reachable production boundary before choosing a hardening change. The
  audit classified source evidence rather than treating every missing test as a
  vulnerability. It selected one earliest generalized blocker for a separate
  fail-first phase instead of combining security, admission, cache,
  accessibility, and operations work.
- Confirmed highest blocker, PR-022/RR-103: the default legacy route calls
  `collectReachableCitationUrls()` and `enrichProductAssets()` with untrusted
  provider/Serper URLs. Both consumers perform direct fetches outside the
  stronger shared hybrid transport. A zero-network mock intercepted exact
  attempts to `http://169.254.169.254/latest/meta-data` and
  `http://169.254.169.254/latest/meta-data/instance-id`. Citation checks also
  launch every unique URL with unbounded `Promise.all`; product assets follow
  redirects and read complete HTML bodies.
- Confirmed successors: PR-023/RR-104 records missing inbound paid-request
  admission and capacity-unbounded caches. A 50,010-character legacy query
  reached the injected client-creation seam, and 512 unique zero-TTL cache
  keys remained resident. PR-024/RR-105 records that browser cancellation is
  not propagated into legacy provider calls. These remain separate work units.
- Covered but limited: the Direct-Terra hybrid transport already rejects
  credentials, non-default ports, private/link-local/loopback DNS, unsafe
  redirects, unsupported content, and oversized bodies; progress and
  asynchronous completion stores have TTL/capacity bounds; background paths
  have signed job cancellation; production debug logging is gated/redacted;
  and the current E2E wall covers a skip link, validation, loading/cancel,
  errors/empty state, mobile/desktop rendering, and safe links. None proves a
  broad accessibility audit or hosted-runtime behavior.
- Unknown rather than claimed safe or vulnerable: CDN/WAF/body/rate controls,
  production headers, multi-instance cache/job ownership, health/liveness,
  deployment and rollback procedure, current dependency advisories, assistive-
  technology behavior, and real-device mobile behavior have no authenticated
  tracked evidence in this phase.
- Strongest correction: reuse one DNS-pinned bounded transport for every
  untrusted citation/page fetch and add explicit consumer fan-out limits. A URL
  regex misses DNS and redirect targets; a resolve-then-fetch IP check remains
  vulnerable unless the validated address is pinned and every redirect is
  revalidated. Disabling legacy enrichment is the immediate containment, with
  a product-quality tradeoff.
- Deterministic proof: focused boundary wall 97/97; independent reviewer walls
  72/72 plus 29/29; typecheck passed; exact baseline
  `2db12ab44b690d3ad1e5f8646adffb7f3ab46037` remained unchanged during the
  audit. Independent verdict: `VERIFIED`, no material correction, confidence
  0.98. No provider, product-data, credential, environment-file, or real
  network access occurred.
- Process residual: one main-agent filename listing used a slash-only fixture
  exclusion while PowerShell emitted backslashes and printed five spent live-
  fixture filenames. No fixture content, hash, field, value, metadata, parse,
  or modification occurred. The phase then used explicit root-level test files
  only. This is not acceptable evidence access and must not recur.
- Authority limit: this audit changes no application behavior and does not
  authorize a provider call, live exploit, flag change, deployment, release,
  push, or production-readiness claim.

#### PR-6B — Shared bounded outbound-fetch correction

- Status: **complete locally; zero network; independently verified**
- Objective and decision: close PR-022/RR-103 at the earliest shared network
  boundary without disabling useful fallback enrichment or creating a second
  URL denylist. Both default-route consumers now reuse the established hybrid
  transport and an existing ordered concurrency helper. PR-023 admission/cache
  work and PR-024 cancellation propagation remained untouched.
- Public-network contract: every attempted hop is HTTP(S), credential-free,
  default-port, completely resolved to public addresses, and transported to a
  validated pinned address. Every redirect repeats that contract. Literal,
  mapped, compatible, documentation, 6to4, loopback, link-local, unique-local,
  multicast, private, and mixed public/private DNS results fail closed.
- Resource contract: one per-hop controller spans DNS and transport; redirects,
  declared and actual bytes, and allowed content types are bounded. Citation
  checks use 5 seconds, 4,096 bytes, two redirects, and concurrency four.
  Product-page enrichment uses 5 seconds, 1.5 MB, two redirects, HTML/XHTML,
  and concurrency four. Output order remains stable.
- Compatibility: citations still reject 404/410 and retain the intentional
  403/405/429/503/timeout and safe non-content leniency. Unsafe product URLs are
  cleared; ordinary host/content/size failures retain likely product links but
  cannot supply parsed metadata. Product identity/source rules are unchanged,
  and cache keys retain only a SHA-256 URL digest rather than a credential-
  bearing URL.
- Fail-first and correction history: the initial wrapper wall produced the
  intended failures. Independent review then found that socket inactivity
  timeout did not bound DNS or trickling responses; main review separately
  found that truncated bodies could erase 404/410 status. Replacements added a
  hard DNS-plus-transport deadline and status-preserving `bodyTruncated` result,
  with direct regressions before the final freeze.
- Verification: final focused 74/74 across nine suites; typecheck; full
  1,620/1,620 across 220 suites; lint with zero errors and the same three old
  warnings; production build; Playwright 17/17; deterministic eval, five exact
  partitions, 10/10 benchmark cases, and 29/29 invariants in controller
  `agent-loop-2026-08-30T06-35-39-277Z`. Independent final verdict:
  `VERIFIED`, no material correction, confidence 0.98. The reviewer also
  authenticated all seven hashes and independently exercised pinned-address,
  mixed-DNS, special-IPv6, and global-IPv6 controls.
- Limits: OS `dns.lookup` cannot cancel native resolver work; the caller returns
  at the hard deadline and cannot begin transport afterward. Sustained hostile
  resolver pressure therefore remains for PR-023's admission/global-concurrency
  boundary. The real Node socket path was source-reviewed but not exercised on
  a live server because network access was prohibited. Citation compatibility
  proves safe reachability attempts, not final page truth or usability.
- Process residual: a prohibited broad `git status --short` printed spent live-
  fixture filenames. No fixture content, hash, field, value, parse, or
  modification occurred; subsequent status and discovery used tracked-only or
  exact paths. This repeated a filename-only process deviation and must not
  recur.
- Authority limit: no provider, product-data, credential, manual environment-
  file, real-network, live-fixture-content, flag, deployment, release, push, or
  successor-phase authority was used or granted.

### Phase PR-6 — UX, resilience, security, and operational closure

- Status: **in progress; PR-6A and PR-6B complete, PR-6C/PR-023 next**
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

- current staged-path accuracy, hard-requirement truth, leader recall,
  repeatability, latency distribution, and cost have not been measured against
  the now-reviewed PR-4A current-truth set. PR-3K proves one safe lifecycle
  only; attempt 1 was consumed before provider work, no PR-4B artifact exists,
  and the remaining serial protocol cannot advance;
- the PR-4A truth expires 2026-09-12, candidate-pool Jaccard is intentionally
  not scored for privacy, and every serial attempt still requires independent
  origin/fixture/manual review. PR-021 now closes future launcher attribution,
  but it grants no new live protocol or authority; the legacy scorecard remains
  non-authorizing;
- RR-091 is now contained and narrowed: the unsafe historical adapter is
  scripts/tests-only and may not be promoted, while the reachable shared exact-
  price boundaries have a verified generalized correction. RR-092 is closed
  locally by PR-008. Neither zero-live correction substitutes for blocked live
  accuracy/repeatability evidence or the open UX/security/operations gates;
- PR-022/RR-103 is closed locally: every default-route citation/product-page
  fetch now uses the address-pinned, redirect-revalidated, deadline/byte/
  content-bounded shared transport with consumer concurrency four. PR-023/
  RR-104 is the next release blocker because paid routes still lack body/field/
  admission bounds and capacity-bounded, coalesced caches. PR-024/RR-105 retains
  the later cancellation gap. The native resolver residual is part of PR-023's
  sustained-traffic containment, not a reason to reopen the destination gate.

The verdict can improve only through the required evidence above. Passing
unit tests alone cannot change it.

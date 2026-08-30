# Review Radar Test Memory

> **Rule:** Before running any live test, read this file. Summarize what prior results already answer the question, whether a smaller diagnostic suffices, the estimated Serper/runtime cost, and get explicit approval before a full baseline.

---

## PR-007 shared exact-model identity and price authority (2026-08-30)

- `lib/autonomousResearchAdapter.ts` remains a scripts/tests-only historical
  contract. URL ownership plus `purchase_page` role is not semantic price proof.
  Never route, promote, or reuse that membership-only authority without a new
  directly observed exact-entity/offer boundary and independent review.
- All reachable shared experimental consumers use `modelIdentityRelation()`.
  Exact identity requires one complete alias and no strong, compound, or
  descriptive sibling conflict. Whitespace may compose a model; partial family
  tokens do not prove it. Contextual year-like and decimal identifiers remain
  identities, while measurements and recognized technology versions remain
  feature prose unless explicitly governed by a model/variant/trim assertion.
- Model/variant/trim labels support bounded number/code/id/identifier/name/
  designation forms, including compact spellings. Forward and reverse
  assertions use the same optional `is`/`also` plus called/named/designated,
  known-as, equal/equals, identified, labeled/labelled, and referred-to grammar.
  A comma is permitted only inside a fully recognized identity assertion;
  ordinary comma-separated feature prose, semicolon, ampersand, pipe, and plus
  remain hard boundaries.
- Preserve mutations for numeric and mixed siblings, compounds, descriptive
  trims, years/decimals, measurements, Bluetooth LE/Low Energy, USB Type-C,
  HDMI eARC, Wi-Fi 6E, DisplayPort Alt Mode, split/compact qualifiers, every
  connector direction, appositive commas, negative feature controls, Product
  name/model conflicts, canonical/token/offer surfaces, assets, URL title/path,
  CTA selection, relationships, and staged materialization.
- Final shared identity SHA-256 is
  `f62214058e938c7dfbc4024833ea91b711e4e11975b01a1ec6fd3c86d23f13bc`;
  identity-test SHA-256 is
  `ca5a97f98945524248c6baf7baa677a2b0e6fb98adf12f17803d38944303cc07`.
  The full 17-file manifest is in the PR-007 entry in
  `docs/qa-loop-results.md`.
- Successive independent challenge rounds found real generalized gaps; each
  received fail-first coverage. Final replacement review returned `VERIFIED`,
  no material finding, confidence 0.995, including 60/60 generated connector
  assertions. Focused 205/205, full 1,604/1,604, build, typecheck, E2E 17/17,
  and the five-partition controller passed. The cost guard made no provider
  call. RR-091 remains `Needs Investigation — contained/narrowed`; no live,
  route-promotion, release, deployment, or push authority was granted.

---

## PR-008 professional-test exact-model authority (2026-08-29)

- `professional_test` Product markup is page-topic evidence, not exact-product
  authority by itself. Identity, `exactEntityIndex`, and image may become
  verified only when `editorialModel.status === "verified"`.
- Tested-model matching requires a complete stable identifier. Whitespace alone
  joins a compound identity (`X100 A1`); a spaced `/`, `|`, `;`, or `or`
  explicitly declares aliases (`12704570 / SUZE0`). Every observed stable token
  must belong to the proposed alias set. One shared family token never proves a
  variant.
- For professional-test Product entities, a nonempty stable JSON-LD `model` is
  authoritative: exact alias may support identity, while unrelated or
  conflicting values reject before name/SKU fallback. An unavailable model may
  fall through to an exact alternate identifier or exact name. Conflicting
  MPN/SKU/GTIN tokens still reject; unrelated alternate namespaces may coexist
  with an exact model.
- Missing or contradictory tested-model evidence forces identity closed, clears
  the exact entity, and turns a non-null provisional image into `cleared` with
  `observedValue:null`. Official and purchase-page verification are unchanged.
- Preserve mutations for shared siblings, exact-tested/sibling-entity,
  target-name/`B900`, `B900` plus exact SKU, exact aliases, missing tested model,
  non-null image clearing, and full staged materialization.
- Frozen SHA-256: verifier
  `efe5a0c2a457780eb815164843e579f8054ba86f6baa2b2dde3afd5e5cc2ebf6`;
  verifier tests
  `4764e6b1a62af273006e12ae59c0eae2efb0631ab669531d109c4d969cbe0a2d`;
  staged tests
  `d4bc7248e64787f29b6f90c6e4dca5f13fb1767c9bdbd0a1f11ffcfe7816961d`.
- Two independent snapshots returned `CHANGES REQUIRED`; the final replacement
  returned `VERIFIED`, no findings, confidence 0.995. Final focused 57/57, full
  1,568/1,568, build, typecheck, E2E 17/17, and the five-partition controller
  passed. No live fixture, provider, network, credential, flag, or deployment
  authority was used or granted.

## PR-021 typed nonsecret launcher-terminal contract (2026-08-29)

- Future launcher failures emit one canonical JSON line with schema version
  `staged-terra-readiness-launcher-terminal-v1` and exactly six keys:
  `schemaVersion`, `status`, `stage`, `retryAuthorized`,
  `replacementAuthorized`, and `nextAttemptAuthorized`. All three authority
  fields are always false.
- The fixed stage registry is exhaustive for current launcher flow:
  `process_gate_rejected`, `repository_or_trust_rejected`,
  `approval_rejected`, `credential_gate_rejected`,
  `post_credential_reauthentication_rejected`,
  `child_invocation_rejected`, `child_spawn_failed`, `child_signaled`, and
  `launcher_internal_failure`. Unknown or malformed errors map only to the
  internal stage; never serialize raw errors, paths, arbitrary fields, or
  credential facts.
- Genuine terminal errors are branded in a module-private `WeakMap`. Their
  public `stage` is nonwritable and nonconfigurable. Assignment,
  `defineProperty`, and prototype spoofing cannot inject an arbitrary stage or
  canary into output.
- Tests may inject only an exact allowlist of launcher operations to exercise
  every synchronous and asynchronous boundary. The CLI supplies no override.
  Preserve the real process gates, twice-authenticated trust surface, one-handle
  credential read, minimal child environment, official endpoint, SDK
  `maxRetries:0`, `shell:false`, integer child-exit propagation, and the no-await
  interval between final process validation and child construction/spawn.
- The first frozen review returned `CHANGES REQUIRED`, confidence 0.995, after
  reproducing writable-stage and prototype-spoof canary injection. Replacement
  review of launcher SHA-256
  `eaa98872a4fe8829438985b0e5c05cce3a7ca2117ac7863c72d245c26e386c72`
  and test SHA-256
  `4f6bdfe19af947e451b28fd63c26b43261c2ded9ae152b442993521fb7545c50`
  returned `VERIFIED`, no actionable findings, confidence 0.995.
- Proof: fail-first missing export; terminal 7/7; launcher/terminal/runner
  27/27; full 1,559/1,559 across 218 suites; typecheck, production build,
  Playwright 17/17, syntax, diff, and lint with zero errors/three old warnings;
  deterministic controller `agent-loop-2026-08-30T00-30-38-163Z` reconciled
  five named partitions plus 10/10 benchmark cases and 29/29 invariants.
- This is privacy-safe observability only. It does not reveal the consumed
  attempt's historical stage, authorize credential inspection, revive attempt
  1, or authorize a retry, replacement, attempt 2, flag change, deployment,
  release, push, or spend.

---

## PR-4B attempt-1 consumed pre-provider stop (2026-08-29)

- Exact clean commit `6e0446bfc19e435a584ebf3eab18522d47207164`, parent
  `d2df488431c4da4176c8de56baf6d9f44efa1dc8`, 61-entry trust manifest
  `f82e18a3ec21de995130128832d8dca03698309262a942e39fe2dae2ad6a5b1c`,
  six reviewed source hashes, unexpired matrix, 27 approval arguments, absent
  prospective output, and every ceiling received independent exact `VERIFIED`,
  no finding, confidence 0.99.
- The one authorized command was invoked exactly once for
  `broad-shop-vac:1`. It exited 1 after about 9.55 seconds and emitted only
  `Readiness launcher stopped before invoking the trusted runner.` The
  authorization is consumed regardless of the safe stop. Never retry, replace,
  use the direct runner, or advance to attempt 2.
- Post-stop authentication found the same clean commit/index, unchanged six
  hashes, authenticated 61-entry manifest, and an absent exact prospective leaf
  with direct fixed parents and zero failures. The trusted runner creates the
  leaf before any provider request, so no provider request occurred (independent
  confidence 0.99) and no readiness artifact exists.
- The exact failure stage is unresolved. The generic launcher catch includes
  every pre-spawn rejection, OS spawn error, and signaled/noninteger child exit.
  Absence of runner stdout cannot distinguish them. One-trust-pass duration,
  exact arguments/state, no forbidden control names, and PATH presence make the
  credential gate the leading inference (confidence 0.75), not a diagnosis.
- PR-021 is the earliest proven generalized defect: privacy-safe observability.
  Replace the generic catch with one closed, versioned, nonsecret terminal
  object using typed stages for process, repository/trust, approval, credential,
  post-credential reauthentication, child invocation, spawn, and signal
  failures. Never include raw errors, paths, credential presence, values,
  lengths, hashes, prefixes, or arbitrary text.
- Any future live continuation requires a separate reviewed protocol and
  governance decision. A typed failure report, test, source verdict, or clean
  commit cannot revive the consumed authorization.

---

## PR-4B sanitized credential-launch contract (2026-08-29)

- Do not invoke the readiness runner with Node's broad `--env-file` loader.
  That mechanism can import unrelated process controls such as endpoint,
  loader, proxy, TLS, and debug variables into the credential-bearing process.
  A value-blind shape probe returned only `ready`, but the broad invocation was
  rejected before any provider request and is not an approved launch path.
- Invoke only `node --no-warnings scripts/launch-staged-terra-readiness.mjs`
  plus the runner's exact 27 approval arguments. The launcher authenticates
  branch `main`, clean tracked state, exact HEAD, approval arguments, and the
  complete trust surface including itself before reading credentials and again
  immediately before spawning the runner.
- Launcher tests must use the real trust-authenticator contract exactly:
  `{ok, manifestSha256, entries, failures}`. Do not add derived plan fields such
  as `status` to trust-surface mocks. A nominal child-exit test using that exact
  shape is the regression for the 2026-08-30 pre-credential real-launch stop.
- Reject inherited Node/debug/loader/TLS controls case-insensitively before
  credential access and immediately before spawn: `NODE_DEBUG`,
  `NODE_DEBUG_NATIVE`, `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`,
  `OPENSSL_CONF`, `SSL_CERT_FILE`, `SSL_CERT_DIR`,
  `NODE_TLS_REJECT_UNAUTHORIZED`, and `NODE_USE_ENV_PROXY`.
- Read only the fixed ignored `.env.local` through one open `FileHandle`, never
  a second path read. Require a direct regular file, fixed realpath, a 65,536-
  byte cap, and stable bigint device/inode/size/mtime/ctime metadata across the
  pre-open path, opened handle, post-open path, post-read handle, and post-read
  path. Parse the stable bytes with Node `util.parseEnv`; retain only
  `OPENAI_API_KEY` and `SERPER_API_KEY` in memory.
- Rebuild, never merge, the child environment. Preserve only required Windows
  process-launch variables; fix `LANG=C`, `LC_ALL=C`, `TZ=UTC`, and
  `OPENAI_BASE_URL=https://api.openai.com/v1`; add only the two required
  credentials. Spawn exact `process.execPath`, exact runner and arguments,
  `shell:false`. The OpenAI SDK is also constructed with that official base URL
  and `maxRetries:0`.
- Frozen corrected SHA-256 values are OpenAI client
  `feaa0bceb6c219a3029ded7f5ad97aa4001c1a4200acffc3ee3e4ee75afb9b6f`,
  launcher
  `fb806931187720657ba65a7b96a00d9d83252cabdab17ccc910ee4f4d3818daa`,
  executable
  `78533332220d58c83a03b4818797ea9d416188c9e4cf1cc2fd7cc9aa7504382a`,
  IO `c2c82ed986a411532a101f433036e783e8bb3488719276dc769347a7dfeb08a6`,
  runner
  `684f26000e455ad9760c605c96eb3b8e50ba15f8fa01632027f50a36c2c16549`,
  and launcher tests
  `97ba1e269acfeeb6fe5d21a1b9219248b692de641348292f1cc3d1bcda622539`.
- Fail-first produced the expected launcher `ERR_MODULE_NOT_FOUND`. The first
  source review returned `CHANGES REQUIRED`: a nonsecret canary reproduced
  `NODE_DEBUG=child_process` environment disclosure, and the path-based read
  left a swap race. The corrected exact snapshot received `VERIFIED`, no
  actionable finding, confidence 0.98. The reviewer accessed no credential,
  environment file, provider, network, or live fixture.
- Proof remains zero-live: launcher 5/5; launcher/runner 20/20; combined PR-4A/
  launcher/runner 53/53; full 1,552/1,552 across 217 suites; typecheck, build,
  E2E 17/17, syntax, and lint passed. A sanitized dummy-credential child dry run
  exited cleanly with the expected unauthenticated precommit failures. No
  actual value was printed, copied, hashed, staged, or manually inspected.
  Controller `agent-loop-2026-08-29T23-47-19-401Z` then passed typecheck, lint,
  all 1,552 tests, deterministic eval, five exact serial partitions, and the
  10-case/29-invariant benchmark with no repeated failure candidate.
- This source verdict does not authorize spend. Before attempt 1, bind the exact
  snapshot in a self-contained commit and independently authenticate that clean commit,
  new trust-manifest digest, exact launcher command and dry plan, absent output,
  and complete approval arguments. Never retry, replace, or advance
  automatically.

---

## PR-4B commit-bound serial runner contract (2026-08-29)

- The runner is dry-run-first and may execute only one exact PR-4A attempt. It
  binds commit, raw/canonical matrix hashes, attempt index/key/request/run ID/
  nonce, previous artifact, absent prospective output, all ceilings, clean
  tracked state, default-off flags, and safe in-memory credential shape. It
  cannot select or start a later attempt automatically.
- Trust extends through every local import discovered with the TypeScript AST,
  plus fixed package/lock/matrix files. Every member must be a direct regular
  file matching an exact Git `100644` blob, working-file Git hash, and raw-byte
  SHA-256 manifest. Literal dynamic imports with options are included;
  nonliteral dynamic import/require fails closed. External installed package
  bytes remain lockfile-bound rather than locally byte-authenticated.
- Authenticate output-parent realpaths before approval and creation; reject
  links/reparse-point indirection; reauthenticate the created leaf. Write only
  append-only, exclusive, fsynced checkpoints and publish the final artifact
  with a no-replace hard link. Never overwrite an existing checkpoint or
  artifact.
- The canonical PR-4A producer receives only the current in-memory closed public
  route outcome and allowlisted diagnostics. Never open, enumerate, adapt,
  retry, replace, hash, or reuse a spent live fixture.
- Frozen source SHA-256 values are IO
  `6272e99e5fdc74c5fb8b97c750f8f3d49f1b2fc80e913dc2c784b8b5d0410ed8`,
  runner
  `0dcb6e2b6b7cd546484036f53d38fdb1415a88342e4ab4eb30564c4309251b49`,
  executable
  `5c066a6b4f0f504a68d18377e39a2c93397f488fabfdce28f08f8cfb2ec9a3f2`,
  and test
  `85c681e35ed20e4cf070966b47ae196b314c25686577ce0d73bd2e67f0c4ebc1`.
- Four independent source reviews drove corrections for untracked-source trust,
  indirect output parents, replace-in-place checkpoint loss, incomplete
  transitive closure, and dynamic imports with options. The final exact verdict
  is `VERIFIED`, no actionable finding, confidence 0.99. No provider, network,
  environment, credential, or live-fixture access occurred in that review.
- Proof is zero-live: fail-first missing-module failure; focused 15/15;
  combined PR-4A/PR-4B 49/49; closure 57 paths/zero failures; full 1,547/1,547
  across 216 suites; typecheck, build, E2E 17/17, syntax, and lint passed.
  Controller `agent-loop-2026-08-29T23-03-39-286Z` reconciled all five worker
  partitions plus 10/10 benchmark cases and 29/29 invariants. This proves
  source behavior only.
- Before any paid request, independently authenticate the self-contained commit,
  clean state, complete trust-manifest digest, unexpired matrix, exact
  `broad-shop-vac:1` dry plan, prospective absent output, and complete approval
  arguments. The source verdict does not authorize live execution, retry,
  replacement, later attempts, flags, deployment, or release.

---

## PR-4A staged Terra readiness measurement contract (2026-08-29)

- `tests/fixtures/staged-terra-readiness-matrix-v1.json` freezes four distinct
  request shapes and exactly six serial attempts: broad `shop vac` twice,
  constrained four-main-burner gas grill twice, adversarial mesh/lumbar office
  chair once, and over-constrained self-emptying/pet-hair/cord robot vacuum
  once. The truth was reviewed 2026-08-29 and expires 2026-09-12. Do not run
  against an expired or modified matrix.
- Exact SHA-256 values are matrix
  `289ada281c3f8185c4b4bdec64cb34dc55a1af3ccb5ed0f25b51b1483bdfae2c`,
  artifact producer
  `0b5f5f95c72fad52461cd50537916bc7084deb3055fd821e73c1f1de482d059c`,
  analyzer
  `8bf1985964734dbce53010d9a8a243b986ea6fea9999b23f7640bf328440c5dd`,
  and tests
  `38e0f585f18965a908b5db35e0c57b418b1108a509a0ffbee01228af8af77411`.
  Authenticate them and the self-contained PR-4A commit before PR-4B.
- Every attempt is bound to an exact index, key, request, run ID, nonce, commit,
  matrix hash, capture window, and prior canonical artifact hash. Attempts are
  serial. A missing, duplicate, out-of-order, resealed, reused, stale, future,
  or incomparable artifact fails closed. Never retry or replace a spent run.
- The producer accepts only the closed staged public response plus sanitized
  server diagnostics/counters. Canonical UTF-8 bytes, raw/payload seals, exact
  versions, terminal tuples, counters, per-stage usage, evidence activity,
  commerce activity, timing, and safe manual-audit fields are mandatory. Raw
  provider/private content, credentials, arbitrary audit values, unsafe IDs,
  private URLs, credential-shaped URLs, ports, sensitive query keys, and
  nonempty URL fragments are rejected.
- Safety bars are zero wrong-type cards, hard-requirement failures, budget
  violations, unregistered source references, retries, replacements, fallbacks,
  organic/SearchAPI work, and extra cases. A completed run must finish within
  720,000 ms, use evidence no older than 86,400,000 ms, stay under the existing
  network ceilings and `$1` conservative per-run ceiling, and the complete set
  must stay below `$6` conservative aggregate cost.
- Quality bars include two broad must-consider products per run and union,
  complete product/source/requirement/price/offer/image/manual review, and at
  least 0.60 pairwise final-card Jaccard. Candidate-pool Jaccard is deliberately
  `not_scored_privacy_boundary`: the sanitized contract has no non-public
  candidate identities, and stable hashes would create dictionary-attack risk.
- Analyzer output is never authority. It always returns
  `originAuthenticated=false`, `machineAuthorization=false`,
  `releaseAuthorized=false`, and `stopRequired=true`. A clean prefix returns
  only `next_attempt_review_required`; a clean complete set returns only
  `independent_review_required`. Independent inspection and explicit origin
  authority are required before every paid attempt and after every artifact.
- Proof is zero-live: focused 34/34; complete 1,532/1,532 across 215 suites;
  five partitions and 10-case/29-invariant benchmark reconciled; typecheck,
  build, E2E 17/17, lint, eval, ranking, dry-run, syntax, and diff walls passed.
  Independent replacement review returned exact `VERIFIED`, no finding,
  confidence 0.97. Provider behavior, recommendation quality, stability,
  latency, and real cost remain unmeasured.
- Process note: during PR-4A the main agent accidentally printed live-fixture
  filenames via one overbroad file search and one status command. It did not
  open, hash, parse, or display fixture contents or values. The independent
  reviewer stayed inside the exact four-file offline envelope. Future commands
  must use tracked-only or explicit paths and exclude the whole live-fixture
  tree.

---

## OAI-T10 PR-3K first complete staged lifecycle (2026-08-29)

- PR-3K spent exactly one frozen `shop vac` lifecycle at clean PR-3J commit
  `8c57cd594a7f060aa358afedb0e1baab429a5d89`. The exact output directory is
  `tests/fixtures/review-radar-live/oai-t10-phase-d-8c57cd5/`; it is immutable,
  untracked, and spent. Never inspect, retry, edit, stage, reuse, or add to it.
- The first and only invocation completed the entire research, deterministic
  verification, no-web presentation, and public-response lifecycle. It returned
  four sequential unique cards and eight registered source entries. All card
  source references and commerce URLs reconcile; the eight source IDs represent
  four unique HTTPS URLs.
- The 116.495-second lifecycle used two OpenAI creates, 40 retrieves (39 in-
  progress, then the 40th completed), eight hosted searches, 10 Shopping
  requests, 20 source fetches, and 25 physical HTTP attempts. Cancels, retries,
  replacements, fallbacks, organic, and SearchAPI were zero.
- The exact spent directory contains only 51,640-byte evidence-v6
  `result.json`, SHA-256
  `9DFB2A82691ACAC640F146038DC08510786F53578D768105CF8347A03EABC2E4`.
  Independent strict read-only audit returned `VERIFIED`, no findings,
  confidence 0.99. Successful completion correctly removed `attempt.json`.
- Tri-state preflight reported 10 submitted, 10 accepted/continued, 10 deferred-
  missing-title, zero rejected, and zero in all four affirmative mismatch
  families. Deferral itself granted no trust; all 10 candidates entered bounded
  product-data verification.
- Page collection attempted 20 exact sources and succeeded for 14. Shopping ran
  10 requests and returned 156 rows. Deterministic verification produced four
  eligible, zero close, and six excluded candidates. First loss conserved as
  five asset-identity, one product-URL, and four no-loss eligible candidates.
- Closed subreasons were one no-asset, three asset brand-absent-from-title, one
  asset model-absent-from-title, and one missing/invalid product URL. Relationship
  and hard-requirement losses were zero; source rejection was zero; four claims
  were rejected. These are aggregate counts and cannot map exclusions to private
  candidate identities.
- Two distinct completed ledgers accounted 77,273 input tokens, zero cached
  input, 9,064 output tokens, and eight searches. Exact estimates were
  `$0.409142` frozen nominal, `$0.457438` frozen conservative, and `$0.343314`
  current; the conservative result was below the unchanged `$3` gate.
- The artifact uses exact closed fields and retains only two response-ID hashes.
  No raw/provider ID, job token, prompt, evidence package, headers, bodies,
  credential, key/secret pattern, private-network URL, or non-public candidate/
  source identity was found. Tracked/index/default-off state remained clean.
- PR-3K proves one safe bounded staged lifecycle, not repeatability, current
  market-leader accuracy, stability, or category-wide quality. PR-4 must use a
  staged-path-specific benchmark with independently refreshed current truth;
  the legacy quality harness and July leader set cannot authorize broad spend by
  themselves.

---

## OAI-T10 PR-3I title-metadata stop and PR-3J tri-state deferral (2026-08-29)

- PR-3I spent exactly one frozen `shop vac` lifecycle at clean commit
  `bd54de9076cf6752ee2beefd686689852f6f9994`. The exact output directory is
  `tests/fixtures/review-radar-live/oai-t10-phase-d-bd54de9/`; it is immutable,
  untracked, and spent. Never inspect, retry, edit, stage, reuse, or add to it.
- Provider research reached terminal `completed`, but local validation failed as
  `research_candidate_invalid / candidate_sources /
  candidate_source_identity_unproven`. The route returned the safe 502 before
  page fetching, Shopping, deterministic verification, presentation, rendering,
  or public output. There was no retry, replacement, fallback, organic,
  SearchAPI, product-data call, or second case.
- The 56.020-second envelope used one create that returned the queued start,
  then 24 retrieves (23 in-progress and the 24th/sole completed-provider/local-
  failure terminal retrieve),
  one safety cancel, five hosted searches, 47,475 input tokens, zero cached
  input, and 5,516 output tokens. Approval-envelope, frozen-conservative, and
  informational current estimates were `$0.251428`, `$0.281099`, and
  `$0.211142`, all below `$3`.
- The only file is a 21,584-byte evidence-v5 `attempt.json`, SHA-256
  `03D442FFE14D819D6C23A2E76C2458E37AF6A2EBE7691A6DC4F6EA0ED2827B3F`.
  Independent strict read-only audit returned `VERIFIED`, no findings,
  confidence 0.99. Its privacy allowlist retains no raw/provider/candidate/
  source identity, page, prompt, header, credential, key, secret, or token.
- The filter diagnostic records 10 submitted, zero accepted, 10 rejected, and
  `missingTitle=10`; every other family is zero. This proves only that each
  candidate had at least one source decision without title metadata. It does
  not reveal which source, whether both sources lacked titles, or any downstream
  product truth.
- Official Responses API source actions guarantee the complete consulted URL
  list as URL-only `{type,url}` records. Cited annotations may carry titles, but
  a source-action title is not guaranteed. Therefore absence of title metadata
  is an unknown preflight state, not affirmative identity failure.
- Contract v9/runtime v8 now use a three-state preflight. Any exact response-
  owned source whose title proves identity retains the candidate. With none
  accepted but at least one missing title, the candidate is deferred to the
  existing bounded DNS-pinned fetch and unchanged page/entity verifier. Only
  candidates whose available titles all affirmatively mismatch are quarantined.
- The closed diagnostic now reports submitted, accepted/continued, deferred-
  missing-title (a subset of accepted), rejected, and four affirmative mismatch
  families. Route sanitization requires exact keys, safe bounds, conservation,
  `deferred <= accepted`, success/slate binding, and zero deferred candidates in
  the exact all-rejected failure context. Evidence rolls to v6. Schema v5,
  prompt v6, public bodies, flags, network ceilings, source ownership, and every
  downstream trust gate remain unchanged.
- Fail-first passed 58 checks and failed exactly five new expectations. The
  corrected trust wall passed 169/169; the complete suite passed 1,498/1,498
  across 214 suites; E2E passed 17/17; typecheck, build, lint, eval, ranking,
  five-partition reconciliation, and the 10-case/29-invariant benchmark passed.
  Independent source-only review returned `APPROVED`, no findings, confidence
  0.96. Its accidental 92-test run read the tracked public `.env.example`; that
  run is excluded from proof and no `.env.local`, credential, fixture, or
  network was accessed.
- PR-3J is a default-off, zero-live correction. It can spend up to the unchanged
  30 source-page attempts on deferred candidates and does not prove post-fetch
  survivor quality or a complete lifecycle. After a clean self-contained PR-3J
  commit, PR-3K may run the unchanged case once in a new commit-derived
  directory under the same first-terminal/no-retry/no-fallback ceilings.

---

## OAI-T10 PR-3G identity-source stop and PR-3H candidate quarantine (2026-08-29)

- PR-3G spent exactly one frozen `shop vac` lifecycle at clean commit
  `ac53c10e707b67945f7df4f4cbda129c7c6ef69d`. A first CLI form using separated
  approval tokens was rejected by the local parser before directory creation,
  counters, network, artifact, or spend. The one actual lifecycle invocation
  used the required `--name=value` form and was not retried.
- The provider reached terminal `completed`, but strict local research
  validation failed as `research_candidate_invalid / candidate_sources /
  candidate_source_identity_unproven`. No candidate/source/private identity was
  retained, so the exact missing-title/brand/model/conflict/type distribution
  and survivor count are unknown. Page fetching, Shopping, verification,
  presentation, rendering, public output, fallback, and a second case all
  remained zero.
- The 75.501-second attempt used one create, 31 retrieves (30 in-progress, then
  one completed-provider/failed-contract terminal poll after the queued start), six
  hosted searches, one safety cancel, 56,876 input tokens, zero cached input,
  and 7,759 output tokens. Frozen-conservative estimated cost was `$0.354123`;
  the informational current estimate was `$0.266860`, both below `$3`.
- The only artifact is untracked 26,300-byte evidence-v4 `attempt.json`, SHA-
  256 `2E3296650224BF28EEE56166860A9B82C22EC7ED6B93C374594F2869FDE0C1CE`.
  Independent strict read-only audit returned `VERIFIED`, no findings,
  confidence 0.99. Never inspect, retry, edit, stage, reuse, or add files to its
  spent directory.
- PR-3G refutes the output-token-cap hypothesis: the provider completed with
  output below the unchanged cap and local identity-source validation stopped
  the lifecycle. Do not raise token limits, add a prompt-only patch, or weaken
  identity from this evidence.
- Contract v8/runtime v7 quarantine only candidates for which both exact
  response-owned source records fail the unchanged shared asset-identity
  predicate. Survivors retain discovery order and receive contiguous server-
  owned candidate/fact IDs. Rejected URLs never reach collection; zero
  survivors retain the exact bounded failure triple.
- The server-only diagnostic contains submitted/accepted/rejected counts and
  only five reachable families: missing title, brand absent, model absent,
  model conflict, and wrong product type. Counts must conserve; each rejected
  candidate contributes one or two distinct reasons. Completed evidence must
  match the actual survivor count. Failed evidence is retained only for the
  exact zero-survivor failure triple.
- Contract v8 and runtime v7 invalidate old jobs; research schema v5 and prompt
  v6 stay unchanged. Future sanitized Phase D evidence is v5. Public bodies,
  network ceilings, source ownership, fetched-page trust, commerce, price,
  relationship, requirement, evidence, eligibility, and ranking rules did not
  change.
- Independent review initially found context-unbound diagnostic counts, a
  missing two-reasons-per-candidate upper bound, and two unreachable buckets.
  Corrected terminal verdict was `APPROVED`, no findings, confidence 0.97.
- PR-3H is a generalized zero-live correction and may reduce recall by
  returning a smaller slate. It does not prove live survivor yield or a
  complete shopper result. PR-3I may run the same frozen case once only after a
  clean self-contained PR-3H commit, in a new commit-derived directory, under
  the unchanged first-terminal/no-retry/no-fallback ceilings.

---

## OAI-T10 PR-3E identity stop and PR-3F source-grounding contract (2026-08-29)

- PR-3E spent exactly one frozen `shop vac` Phase D lifecycle at clean commit
  `bf7e37b43edbd6896b97a98cc1996bfa69b3aeb7`. An earlier invocation missing
  explicit approval arguments was rejected before network, directory creation,
  counters, artifact, or spend; it was not a lifecycle attempt. The approved
  invocation ran once and was not retried.
- Research completed with 12 candidates and 53 response-owned sources. Every
  candidate supplied exactly one candidate-local source. Collection attempted
  12 source pages/12 physical requests and four succeeded; 12 Shopping requests
  returned 201 rows. Verification returned 0 eligible, 0 close, 12 excluded,
  all `assetIdentityUnproven`; presentation and rendering never ran.
- Closed asset subreasons were eight `noAssetCandidates` and four
  `modelNotInTitle`. Overlapping commerce outcomes were five `brandNotInTitle`,
  12 `stableIdentifierNotInTitle`, and five `missingMerchantProductUrl`. These
  do not provide candidate/source mapping or causal proof and never authorize a
  weaker downstream gate.
- The attempt used one create, 14 retrieves, three hosted searches, one safety
  cancel, 29,702 input tokens, zero cached input, 4,139 output tokens, and
  `$0.184904` frozen-conservative estimated cost. The only artifact is untracked
  16,119-byte `attempt.json`, SHA-256
  `fb6fe1ad6324a9bb6b85a2a2634ab6eef25378ee1d696220fc5ef54510214a30`.
  Independent audit returned `VERIFIED`, confidence 0.99. Never read, edit,
  retry, stage, reuse, or add files to this spent directory.
- Current research schema v5 requires exactly two source URLs per candidate;
  zero, one, or three fail. Both URLs must be exact response-owned HTTPS/public-
  host strings and must represent distinct physical fetches. A rejection-only
  key removes established tracking parameters and fragments. Identity-bearing
  query parameters stay distinct. Never use canonical equivalence to accept
  ownership or borrow a title between URL variants.
- The exact response registry preserves each URL/title pair separately. It may
  backfill a titleless action record only from a later record with the identical
  URL. A canonically related or fragment-related variant cannot lend metadata.
- Before collection, at least one candidate-owned exact title/URL record must
  pass the unchanged `verifyDirectTerraAssetCandidates()` identity predicate.
  Title-visible identity is preferred. The existing safe direct-manufacturer or
  established-retailer product-slug path is intentional; sibling slugs and
  unknown-retailer slug authority remain negative. Response metadata is
  preflight only, not fetched evidence or shopper-visible source content.
- Candidate-local requirement/fact indexes are only 0 or 1 and at most two per
  lead. Fifteen candidates times two source URLs must remain exactly equal to
  `maximumSourceFetches: 30`.
- Contract v7, research schema v5, prompt v6, and runtime v6 roll old jobs
  closed. The only new bounded source failure is
  `candidate_source_identity_unproven`; it contains no URL or private identity.
- Fail-first passed 32 checks and failed exactly five new expectations.
  Independent review found and drove correction of tracking/fragment fetch
  equivalence, prompt/runtime slug alignment, same-exact title backfill, and the
  explicit 15x2 ceiling. Terminal verdict was `APPROVED`, no findings,
  confidence 0.98; the reviewer personally passed 150/150 plus non-incremental
  typecheck and diff checks.
- PR-3F is a generalized zero-live correction. It does not prove PR-3E's private
  candidate-level cause or live feasibility/quality/latency/cost. PR-3G may run
  the unchanged frozen case exactly once only after a clean self-contained
  PR-3F commit, in a new commit-derived directory, under every existing ceiling
  and first-terminal/no-retry/no-fallback rule.

---

## OAI-T10 PR-3C identity stop and PR-3D structural identity contract (2026-08-29)

- PR-3C spent exactly one frozen `shop vac` Phase D invocation at clean commit
  `a7434262f74d610322adf88c1e3556a11ae4b810`. It stopped after provider research
  as `research_candidate_invalid / candidate_identity`, before source
  collection, Shopping, verification, presentation, or rendering. The first-
  terminal envelope used one create, 20 retrieves, three hosted searches, one
  cancel, 29,986 input tokens, and 4,574 output tokens; frozen-conservative cost
  was `$0.192316`. There was no retry, replacement, fallback, product-data work,
  or second case.
- The spent PR-3C directory contains only untracked 18,255-byte `attempt.json`,
  SHA-256
  `d18471b3a9647ded7142b287dd914b3e2aed5afdfb582f84c624747f58ee917e`.
  Independent audit returned `VERIFIED`, confidence 0.99. Never read, edit,
  retry, stage, reuse, or add files to that directory.
- Evidence v4 reveals only the first invalid candidate's identity field group.
  The exact field, invariant, candidate, and value remain private and unknown.
  It does not explain PR-3A or prove a live cause.
- Current research schema v4 must not expose or require model-authored
  `product_name`. It requires exact brand, model, and concise complete-product
  type with 100/120/78-character maxima. Runtime normalizes those atomic fields,
  joins them with two spaces into the internal name, rechecks the exact 300-
  character bound, and still runs the unchanged
  `directTerraAssetTargetIsCoherent()` and duplicate-identity rules.
- Exact-key parsing must reject an unexpected research `product_name`. Do not
  truncate the atomic fields, restore redundant model ownership, or weaken any
  downstream source, identity, relationship, commerce, evidence, eligibility,
  or public-response gate.
- Contract v6, prompt v5, and runtime v5 roll old work closed. Token tests must
  include a cryptographically valid current positive control, old prompt v4
  with the current fingerprint, and current prompt v5 with an old contract-v5
  fingerprint. Both old jobs must return `invalid_token`.
- Fail-first produced exactly five intended failures. Final staged tests passed
  80/80, full tests 1,482/1,482, five batch partitions reconciled, the benchmark
  passed 10/10 cases and 29/29 invariants, and E2E passed 17/17. Independent
  review returned `APPROVED`, no findings, confidence 0.98.
- PR-3D proves a generalized offline structural correction only. Conservative
  atomic maxima may reduce recall; live adherence, lifecycle feasibility,
  recommendation quality, and PR-3C causation remain unknown. PR-3E may run the
  unchanged frozen case exactly once after the clean PR-3D commit under the
  existing ceilings and first-terminal/no-retry policy.

---

## OAI-T10 PR-3A live stop and PR-3B subreason contract (2026-08-29)

- PR-3A spent exactly one frozen `shop vac` Phase D invocation at clean commit
  `43857e072da54ee8f988887d3813722ed6fd005b`. It completed research, then
  verification classified 0 eligible, 0 close match, and 10 excluded: nine
  `assetIdentityUnproven` and one `identitySafeProductUrlUnavailable`.
  Presentation/rendering did not run and there was no retry, replacement,
  fallback, second case, organic request, SearchAPI request, promotion, or
  deployment.
- The attempt used one create, 19 retrieves, three hosted searches, one safety
  cancel, ten Shopping requests, 15 source-page selections, and 17 physical
  HTTP attempts. Seven source fetches succeeded and Shopping returned 192 rows.
  Usage was 30,372 input, zero cached input, 4,591 output, and three web-search
  calls; frozen-conservative estimated cost was `$0.193777`, below `$3`.
- The spent directory contains only untracked 18,328-byte `attempt.json`,
  SHA-256
  `39dd07087313339bf0b8b0cad1abd6c3ab1890a2daed73800989b63d6bad4894`.
  Strict independent audit returned `VERIFIED`. Never read, edit, retry, stage,
  reuse, or add files to this directory.
- Evidence v3 proves the coarse first-loss distribution only. It cannot reveal
  candidates, distinguish direct-asset identity reasons, explain why 192
  Shopping rows yielded no accepted identity, or identify the product-URL
  reason. Zero source/claim rejection counts do not prove later gates passed for
  candidates that stopped earlier.
- `staged-terra-verifier-v3` keeps the six conserving first-loss counts and adds
  affected-candidate subreason groups scoped to the matching branch:
  `assetIdentityFailureCandidateCounts` and
  `commerceOutcomeCandidateCounts` only for asset-identity first losses;
  `completeProductRelationshipFailureCandidateCounts` only for relationship
  first losses; and `identitySafeProductUrlFailureCandidateCounts` only for URL
  first losses. A candidate can affect more than one subreason, so subreason
  groups do not conserve, but each count is bounded by its first-loss branch and
  each nonzero branch must have at least one subreason per affected candidate.
- The route accepts only the exact fixed aggregate and nested keys, nonnegative
  safe integers, first-loss conservation, eligible/close/excluded
  reconciliation, branch-local bounds, and subreason coverage. Missing,
  unknown, private, fractional, negative, overbound, undercovered, or otherwise
  malformed attribution is omitted in full. Public success/failure bodies are
  unchanged and never contain diagnostics.
- `weak_target_identity`, `identity_not_safe`, and
  `product_relationship_not_safe` are unreachable after the branch predicates
  used by this aggregate. They are invariant errors, not reported buckets.
  Sanitized Phase D artifacts carrying the new subreason groups use
  `oai-t10-phase-d-sanitized-v4`; historical v3 artifacts remain immutable.
- Verifier/route fail-first was 15 pass / 7 intended fail; the separate Phase D
  evidence-version expectation also failed until v4. Final focused verifier/
  route/Phase D tests passed 32/32; the complete suite passed 1,479/1,479 across
  214 suites; E2E passed 17/17; typecheck, build, lint, eval, ranking, dry-run,
  and diff checks passed. Independent review found the three unreachable
  buckets and a missing subreason-coverage mutation wall; after correction the
  terminal verdict was `APPROVED`.
- PR-3B changed observability only. It did not change eligibility, evidence,
  identity, relationship, URL, commerce, price, ranking, network, public API,
  flag, or UI behavior and proved no live cause. Its separately documented
  PR-3C successor is now spent; use the newer PR-3C/PR-3D contract above.

---

## PR-3 tracked offline benchmark contract (2026-08-29)

- `tests/fixtures/qa-benchmark-matrix-v1.json` is the deterministic named-batch
  ground truth. Every candidate ID is unique across the matrix and must have
  exactly one tracked `priceTrusted`/`productEligible` oracle. Every case is
  assigned exactly once to the matching `docs/agent-batches/*.json` partition.
- The current matrix has ten cases and 29 invariants covering broad,
  constrained, over-constrained, wrong-type/accessory, fake-price, non-product-
  page, duplicate-family, compatibility, and missing-evidence shapes. Prefer
  status/count/trust invariants over brittle exact winner order.
- Deterministic workers must call `scripts/qa-benchmark.mjs` with only their
  declared case IDs and persist declared/executed IDs plus every invariant
  result. They must not read or update live search rotation state. Only exact
  `deterministic` and `live` mode names are valid.
- Reconciliation must rederive candidate statuses and counts from persisted
  exact/near streams and rederive price/product failures from exact IDs plus the
  tracked oracles. Reject missing, duplicate, unknown, mismatched, malformed,
  fabricated, or incomparable work. Do not rerun historical before evidence
  under current production code: that makes a real pre-fix failure impossible
  to compare after correction.
- Every explicitly requested verifier path must exist, be a file, and parse;
  never silently drop one member of a before/after set. Both sides must cover
  the same exact batches/cases. A same-set verification checks integrity and
  comparability only; it does not prove an improvement.
- `scripts/eval-pipeline.mjs` remains the legacy flag-comparison evaluator and
  is byte-unchanged by PR-3. The controller runs it and the tracked benchmark as
  separate checks. Its next-task output is ignored/advisory only; only a
  deliberate phase closeout may regenerate `docs/agent-next-task.md`. Never
  copy repository Markdown to Desktop from the controller.
- PR-3 proof: fail-first 9 pass / 1 intended fail; focused 26/26; full
  1,477/1,477; exact five-batch reconciliation; benchmark 10/10 cases and 29/29
  invariants; E2E 17/17; independent final `APPROVED`. This proves harness
  integrity only, not current product/provider quality. Candidate oracles are
  manually maintained and ignored artifacts are not cryptographically sealed.

---

## OAI-T10 PR-2J candidate-local source-reference contract (2026-08-29)

- Candidate `source_urls` is still the exact response-owned registry boundary
  for each candidate. Requirement and fact leads use zero-based
  `source_indexes`; never restore repeated raw lead URLs or interpret an index
  against the response-global source registry.
- Validate candidate URLs first: bounded unique strings, exact response
  membership, HTTPS, public-host shape, no credentials, and no non-default
  port. Then require each lead index to be an integer, unique in its lead, and
  within that enclosing candidate's actual URL array before mapping back to the
  unchanged exact string. Do not canonical-match, normalize, repair, or borrow
  a reference.
- Research schema v3 uses nested closed requirement variants. Supporting and
  conflicting evidence require one to six indexes; `not_found` requires zero;
  every fact requires one to six. Runtime must independently retain these
  checks plus candidate-length-dependent range and uniqueness because the
  provider schema cannot express every relation.
- Contract v5, research prompt v4, and runtime v4 are one job-identity boundary.
  Token verification must continue requiring the current prompt version and
  recomputing the current request fingerprint so older in-flight work fails
  closed.
- Preserve the reversed response-registry/non-first-candidate regression: a
  local index maps through its candidate array, never response source order.
  Preserve separate legacy requirement/fact URL-shape rejections and duplicate,
  fractional, out-of-range, empty, and status-cardinality negatives.
- The randomized encrypted-token tamper test must always choose a replacement
  different from the current character; a fixed replacement can leave a random
  token unchanged and create a false failure.
- PR-2J was zero-live. Fail-first was 23 pass / 7 intended fail; corrected
  contract 31/31, staged 75/75, full 1,460/1,460, E2E 17/17, and independent
  corrected-snapshot review `APPROVED`. This closes PR-015's reproduced
  producer/parser mismatch only. It does not prove PR-2I's private cause, model
  adherence, lifecycle feasibility, recommendation quality, latency, or cost.

---

## OAI-T10 PR-2I research-fact live stop (2026-08-29)

- The one attempt at `06fa55fb38f6675a897053eb21328ac8845d4e14` is spent.
  Never retry it, edit or stage its evidence, or reuse
  `tests/fixtures/review-radar-live/oai-t10-phase-d-06fa55f`.
- Terra completed one research response after 24 retrieves with 30,215 input,
  7,537 output, three hosted searches, and 47 canonical response sources. Local
  validation stopped at HTTP 502 `research_failed` with only the bounded class
  `research_candidate_invalid / candidate_facts` after 54.485 seconds.
- The field group proves only that the first reported invalid candidate reached
  fact validation. It does not reveal the candidate, exact fact/subfield, raw
  response, or whether later candidates passed identity. Never claim PR-2H
  cleared every candidate from this evidence.
- The run used one create and one best-effort safety cancel. Shopping, source
  fetches, physical page HTTP, verification, presentation, retry, replacement,
  fallback, organic/SearchAPI, public response, cards, sources, and
  `result.json` were all absent.
- Exact frozen nominal arithmetic is `$0.2185925`; the estimator's binary
  `Number(toFixed(6))` representation stores `$0.218592`. Frozen conservative
  cost was `$0.237477`, current estimate `$0.180874`, and the `$3` gate held.
- The directory contains only 21,149-byte `attempt.json`, SHA-256
  `4741a595633335708c2446b1682e05631ab1ed8fb2ef9e0044b41725ce1f9513`.
  It retains only approved fixed schema/aggregate fields and the two approved
  OpenAI URLs. Both configured key values and all raw/provider/prompt/body/
  header, product/source URL, candidate/evidence identifier, credential, and
  secret material are absent. Independent audit returned `VERIFIED`.
- A separate zero-network matrix proves that response-owned but
  cross-candidate lead URLs, duplicate lead references, and status/source
  cardinality accepted by the producer schema/prompt can fail the stricter
  parser. This generalized mismatch can produce `candidate_facts` but is not
  the proven private PR-2I cause. Correct it zero-live with candidate-local
  source references; do not accept cross-candidate evidence or make another
  request first.

---

## OAI-T10 PR-2H research/asset identity alignment (2026-08-29)

- Research identity acceptance and downstream asset verification must use the
  same unchanged `directTerraAssetTargetIsCoherent()` predicate. PR-2H's
  historical scope prohibited name synthesis while the model still authored a
  composite. PR-3D supersedes only that producer ownership: server construction
  from exact bounded atomic fields is now required. Do not create a second
  brand/model/type algorithm or loosen asset identity to improve acceptance.
- After bounded nonempty identity strings, construct the exact downstream
  target fields (`candidate_<n>`, rank, product name, brand, model, category)
  and reject incoherence as
  `research_candidate_invalid / candidate_identity` before candidate-source,
  Shopping, page-fetch, or verification work. Retain no identity detail.
- Preserve negatives for product names missing the brand, missing the model
  core, naming a conflicting sibling model, or mismatching the complete-product
  type. Preserve coherent positives, including shared numeric model-trim
  behavior such as `DXV12P-QT` represented by `DXV12P` in the product name.
- Contract v4 changes the request fingerprint; research prompt v3 states the
  relational identity requirement; runtime v3 records the acceptance semantics.
  Job-token parsing still requires the current prompt version and recomputes the
  current fingerprint, so older in-flight work fails closed. Research schema v2
  remains unchanged because the JSON shape did not change.
- Fail-first was 18 pass / 8 intended fail. Corrected contract tests passed
  26/26, focused staged tests 57/57, staged tests 70/70, full tests
  1,455/1,455, and credential-neutral E2E 17/17. Typecheck, build, eval,
  ranking, zero-network dry run, lint, and diff checks passed. Independent
  review returned `APPROVED` after a personal 57/57 rerun.
- PR-2H made no external product-data request and changed no asset, relationship,
  requirement, source, price, eligibility, diagnostic, public-response, flag, or
  network-ceiling rule. It closes a generalized offline self-mismatch but does
  not prove that mismatch caused PR-2G or that staged feasibility now passes.

---

## OAI-T10 PR-2G asset-identity live stop (2026-08-29)

- The one attempt at `b01c335908e78101501bf0b40cd833f0e8f3b5d1` is spent.
  Never retry it, edit/stage its evidence, or reuse
  `tests/fixtures/review-radar-live/oai-t10-phase-d-b01c335`.
- Research passed contract v3 after 20 retrieves with 28,335 input, 6,029
  output, three hosted searches, and 58 canonical sources. Verification made 12
  Shopping requests returning 194 rows and 12 source fetches/seven successes
  using 19 physical HTTP attempts.
- Verification produced zero eligible, zero close match, and 12 excluded.
  Evidence v3 conserved all 12 first losses as `assetIdentityUnproven`; all
  later first-loss buckets and retained source/claim counters were zero. Do not
  interpret that as a candidate list, exact identity reason, shadowed-gate
  result, generalized defect, or category-wide distribution.
- The route stopped at HTTP 502 `verification_failed` after 51.618 seconds.
  There was one create/cancel and no retry, replacement, fallback, second case,
  organic/SearchAPI, presentation, public response, render, or result file.
- Cost was `$0.191272` frozen nominal, `$0.208982` frozen conservative, and
  `$0.159018` at the dated current card. One completed ledger was accounted,
  none duplicated, and the frozen conservative gate remained `$3`.
- The 19,053-byte `attempt.json` SHA-256 is
  `a8696d6b12c6da6163d0de278da504bbff579338a9fda4326beb2dcf85c70930`.
  It contains only approved pricing URLs and a hashed response identity. Both
  local key values and all raw output, provider/prompt/body/header material,
  product/source URL, secret, and candidate/request/evidence identifier are
  absent. Independent read-only audit returned `VERIFIED`.
- A separate zero-network reproduction proves a generalized self-mismatch:
  staged research accepts bounded unique identity tuples that
  `directTerraAssetTargetIsCoherent()` rejects, after which even an otherwise
  exact asset receives `invalid_target_identity`. This may produce the PR-2G
  class but is not its proven cause. Align early acceptance and the prompt with
  the unchanged shared predicate before any new live request; do not loosen the
  asset verifier or synthesize a product name.

---

## OAI-T10 PR-2F safe verification attribution (2026-08-29)

- `staged-terra-verifier-v2` derives one mutually exclusive first loss per
  candidate in this order: `assetIdentityUnproven`,
  `completeProductRelationshipUnproven`,
  `identitySafeProductUrlUnavailable`, `hardRequirementFailed`,
  `hardRequirementNotVerified`, then `noLossEligible`. The six counts must
  conserve exactly to the candidate total and reconcile with eligible, close-
  match, and excluded totals.
- Separate affected-candidate counters are
  `sourceNotOwnedByCandidate`, `sourceInputInvalid`, and
  `observedClaimInvalid`. They are not mutually exclusive first-loss buckets and
  must never be interpreted as candidate identities or exact rejection causes.
- The route accepts only bounded non-negative safe integers at fixed keys. A
  malformed, non-conserving, non-reconciling, unknown, or private aggregate is
  omitted. Attribution is server-side and appears only on verification failed
  or completed diagnostics; the public response is unchanged.
- Sanitized Phase D evidence v3 may retain only this aggregate for the exact
  attempt that produced it. Never retain candidate IDs, names, brands, models,
  types, URLs, hosts, titles, requirement IDs/text, claims, prices, page content,
  provider IDs, prompts, credentials, secrets, or per-candidate records.
- Independent review initially rejected an unreachable proposed
  `completeProductTypeUnproven` bucket. The approved correction derives
  identity, complete/bundle relationship, and identity-safe accepted product
  evidence from real `DirectTerraAssetDecision` facts. Preserve the materializer-
  origin tests that prove the relationship and safe-URL buckets are reachable.
- Corrected focused tests passed 30/30, staged tests 62/62, full tests
  1,447/1,447, E2E 17/17, and all typecheck/build/eval/ranking/dry-run/diff walls.
  Independent re-review returned `APPROVED` with no findings.
- PR-2F made no external request and does not explain PR-2E. A future live run is
  permitted only from the final clean committed PR-2F tree, in a new commit-
  specific directory, under the unchanged Phase D ceilings, exactly once, with
  no retry/replacement/fallback and a stop at the first terminal outcome.

---

## OAI-T10 PR-2E verification live stop (2026-08-29)

- The one attempt at `56a513784e195ee255410e6f49d29763d87af5c7` is
  spent and terminal. Never retry it, edit or stage its evidence, or reuse
  `tests/fixtures/review-radar-live/oai-t10-phase-d-56a5137`.
- Research passed contract v3 after 23 retrieves with 38,274 input tokens, 6,884
  output tokens, four hosted searches, and 73 canonical response sources. This
  is the first staged live attempt to cross research validation.
- Deterministic verification processed 12 candidates, made 12 Shopping requests
  returning 212 rows, and attempted 13 bounded source fetches/HTTP calls with
  three successes. It produced zero eligible, zero close-match, and 12 excluded
  candidates, so the route stopped at HTTP 502 `verification_failed` before
  presentation or rendering. Wall time was 59.154 seconds.
- One safety cancel ran. There was no second create, retry, replacement,
  fallback, second case, Serper organic, SearchAPI, presentation diagnostic,
  public response, render, or result file.
- Cost was `$0.238945` frozen nominal, `$0.262866` frozen conservative, and
  `$0.199156` at the dated current card. One completed terminal ledger was
  accounted; there was no duplicate ledger and the frozen gate remained `$3`.
- Sanitized evidence v2 contains only the three approved pricing URLs and one
  hashed response identity. Both local key values are absent. No raw output,
  provider ID, prompt content, product-source URL, body, header, credential,
  secret, or candidate object is retained.
- The evidence cannot identify why all 12 candidates were excluded. Do not guess
  identity, product-type, hard-requirement, availability, commerce, fetch, or
  claim failure. Before any new spend, retain only closed aggregate verifier
  first-loss counts; never retain candidate identities, URLs, requirement text
  or IDs, page content, or per-candidate private evidence.
- Independent read-only fixture audit returned `VERIFIED` after recomputing every
  counter and cost, checking privacy and clean state, and confirming the
  attribution limit.

---

## OAI-T10 PR-2D exact source-ownership correction (2026-08-29)

- Keep two source views separate. `extractDirectTerraResponseSources()` is the
  canonicalized display/count view and must keep its existing behavior.
  `extractDirectTerraExactResponseSourceUrls()` is the staged-validation
  ownership registry and preserves each parseable exact response-owned action
  or citation URL string once.
- Never canonical-match a model-authored candidate URL. Candidate ownership
  still requires exact string membership. Candidate URLs must also remain
  unique, HTTPS, credential-free, free of non-default ports, and public-host
  shaped. A merely canonical-equivalent lookalike is unregistered.
- Contract v3 changes the request fingerprint so v1/v2 jobs cannot continue
  under the new acceptance semantics. Research schema/prompt stay v2 because
  the wire shape did not change. Runtime v2 records the new semantics.
- Under `research_candidate_invalid / candidate_sources`, diagnostics may retain
  only `candidate_source_shape`, `candidate_source_duplicate`,
  `candidate_source_unsafe`, or `candidate_source_unregistered`. Retain no URL,
  candidate object, source title, prompt, provider ID, raw output, or secret.
  The browser continues to receive only the generic `research_failed` response.
- Fail-first was 27 pass / 3 intended fail. Corrected focused tests passed
  55/55, staged tests 59/59, and the complete suite 1,444/1,444. Hermetic E2E
  passed 17/17; typecheck, build, eval, ranking, dry run, lint, and diff checks
  passed. Independent read-only review returned `APPROVED` after personally
  rerunning the focused and complete suites plus typecheck and diff checks.
- No live request ran in PR-2D. This proves the generalized exact-variant defect
  is corrected; it does not prove that defect caused PR-2C, reveal the spent
  response's private source branch, or establish staged lifecycle feasibility.

---

## OAI-T10 PR-2C candidate-source live stop (2026-08-29)

- The one attempt at `140d465a0ac835efb73713e988c140b7e35be6e9` is
  spent and terminal. Never retry it, edit or stage its evidence, or reuse
  `tests/fixtures/review-radar-live/oai-t10-phase-d-140d465`.
- Terra research completed after 29 retrieves with 57,041 input tokens, 6,744
  output tokens, six hosted searches, and 69 response-owned sources. ReviewRadar
  stopped at `research_candidate_invalid / candidate_sources` before
  deterministic verification, presentation, Shopping, page fetching, or
  rendering.
- One safety cancel ran. There were no retries, replacements, fallbacks, second
  cases, SearchAPI calls, Serper organic/Shopping calls, or source-page requests.
- Cost was `$0.303762` frozen nominal, `$0.339413` frozen conservative, and
  `$0.255010` at the dated current card. The frozen hard ceiling remained `$3`.
- Sanitized evidence v2 has no prohibited key paths, raw output, provider ID,
  prompt, product-source URL, header, key, secret, body, or candidate object.
  Its only URL values are the approved OpenAI pricing sources, and both local
  key values are absent.
- `candidate_sources` does not distinguish a duplicate candidate URL, an unsafe
  or malformed URL, or a URL absent from the retained exact source registry. Do
  not guess the live cause or retain a URL to diagnose it.
- A separate deterministic reproduction proves that the shared canonical
  response-source dedupe drops a later exact response-owned URL variant while
  staged validation requires exact string membership. Treat that as a
  generalized self-mismatch hypothesis, not proof of the private live field.
  Diagnose and correct it offline before considering any more spend.

---

## OAI-T10 PR-2B dated pricing-evidence contract (2026-08-29)

- Phase D plan/evidence schema v2 separates the immutable 2026-07-25
  `approvalEnvelope` from the informational 2026-08-29 `currentEstimate`.
  Evidence fields are `approvalEnvelopeUsd`,
  `approvalEnvelopeConservativeUsd`, and `currentEstimateUsd`; do not revive
  the ambiguous v1 names `standardUsd` or `conservativeUsd` in new evidence.
- The approval envelope remains `$2.50` input, `$0.25` cached input, and `$15`
  output per million below the 272K threshold, doubling input/cache and using
  `$22.50` output above it. Cache writes remain 1.25x and hosted search remains
  `$0.01` per call.
- The dated current `standard_non_regional` card is `$2.00` input, `$0.20`
  cached input, and `$12` output below 272K, doubling input/cache and using
  `$18` output above it. Cache writes are 1.25x and hosted search is `$0.01`.
  Re-check and re-date this informational card before using it as a current
  estimate in a later run.
- The unchanged `$3` hard ceiling is evaluated only against
  `approvalEnvelopeConservativeUsd`. A lower current estimate cannot authorize
  more spend. Immutable v1 fixtures keep their historical names and values.
- Terminal provider usage after local failure remains billable; only snapshots
  with the same nonempty response hash deduplicate. Distinct or unidentifiable
  terminal responses still sum conservatively.
- Fail-first was 5 pass / 5 intended fail; focused Phase D tests passed 10/10,
  the staged wall passed 56/56, and the complete suite passed 1,440/1,440. No
  provider, search, Shopping, or page request ran. Independent read-only review
  returned `APPROVED` after personally rerunning 10/10 focused tests and
  inspecting the scoped runner/accounting path.

---

## OAI-T10 PR-2A research-contract v2 correction (2026-08-29)

- Fail-first comparison proved a generalized v1 acceptance mismatch. The strict
  schema required model-authored candidate/fact IDs, but runtime required exact
  array-relative numbering that the candidate schema only partially expressed,
  the fact schema did not express, and the prompt did not fully specify.
  Requirement count/IDs were schema-bound, but exact response order was not.
- Research contract/schema/prompt v2 remove both model-authored ID fields.
  ReviewRadar assigns `candidate_<n>` and `candidate_<n>_fact_<m>` only after
  validating the ordered candidate array. It accepts each exact unique
  requirement-ID set and canonicalizes it to request order downstream.
- The schema and validator now both reject whitespace-only identity, summary,
  and fact strings. Existing exact-source ownership, URL, duplicate identity,
  requirement status/source, fact source, count, eligibility, and evidence gates
  remain fail-closed.
- A candidate failure may retain only `candidate_identity`,
  `candidate_sources`, `candidate_requirements`, or `candidate_facts`, and only
  beneath `research_candidate_invalid`. The route guards both enums; unknown
  values and all raw/private fields remain absent from diagnostics and clients.
- Contract v2 changes the request fingerprint, so an old token cannot silently
  continue under the new research contract. Fail-first was 18 pass / 4 intended
  fail; final staged tests were 54/54 and the complete suite was 1,438/1,438.
- No live request ran. The correction does not reveal which exact private field
  failed in the spent PR-2 response and does not prove live feasibility. Correct
  PR-010's stale cost label separately before deciding whether one new-commit,
  new-directory feasibility attempt is information-valuable.

---

## OAI-T10 PR-2 candidate-invalid live stop (2026-08-29)

- The one commit-pinned attempt at
  `a15d935747313f9a87a3b145caa34ad6d2f6c8b6` is spent and terminal. Never retry
  it or reuse its evidence directory.
- Terra research completed after sixteen retrieves with 21,478 input tokens,
  5,450 output tokens, two hosted searches, and 36 response-owned sources.
  ReviewRadar stopped with `research_candidate_invalid` before deterministic
  verification, presentation, Shopping, page fetching, or rendering.
- One safety cancel ran. There were no retries, replacements, fallbacks,
  SearchAPI calls, Serper organic/Shopping calls, or source-page requests.
- The sanitized evidence contains no raw output, provider ID, prompt, source
  URL, header, secret, or API key. Do not add any of those to diagnose the next
  layer.
- The frozen July estimator records `$0.155445` standard and `$0.168869`
  conservative. Official current 2026-08-29 rates imply about `$0.128356` for
  the same measured tokens/searches. Preserve the frozen ceiling calculation,
  but distinguish it from current-rate reporting.
- The next useful step is zero-live prompt/schema/adapter/validator alignment
  plus deterministic candidate-field mutations. Do not spend again until an
  exact generalized mismatch is proven and corrected.

---

## OAI-T10 Phase D diagnostic and accounting correction (2026-08-29)

- Failed research diagnostics may retain only `research_shape`,
  `research_source_registry`, `research_candidate_invalid`, or
  `research_candidate_duplicate`. The route runtime-checks the value; unknown
  values, raw output, provider IDs, prompts, source URLs, headers, and secrets
  remain absent from diagnostics and the client response.
- Phase D cost accounting includes terminal provider usage even when local
  contract validation fails. It merges repeated terminal snapshots only when
  they carry the same nonempty response hash. Distinct or unidentifiable
  responses sum conservatively, and any duplicate terminal anomaly blocks
  successful acceptance.
- Replaying the historical `ec528d7` fixture now accounts for 21,932 input
  tokens, 5,318 output tokens, two hosted searches, `$0.154600` standard, and
  `$0.168307` conservative cost. The historical missing validation class cannot
  be recovered; do not guess it.
- Playwright's default E2E server forces legacy/default-off routing on a
  dedicated port and neutralizes OpenAI, Serper, SearchAPI, and job-token
  credentials. A missed mock therefore cannot make a paid provider call.
- The next live question remains only staged lifecycle feasibility for the
  frozen broad `shop vac` case. One commit-pinned attempt inside the existing
  ceilings is sufficient; stop at its first terminal outcome.

---

## OAI-T10 Phase D first live outcome (2026-07-25)

- The one approved attempt at `ec528d7` is spent and terminal. Never retry or
  call it a provider outage: Terra completed with 21,932 input tokens, 5,318
  output tokens, two hosted searches, and 36 response-owned sources.
- ReviewRadar rejected the completed research output as
  `invalid_research_contract` before verification, presentation, Serper, page
  fetching, or rendering. The single safety cancel was used after rejection.
- The runtime computes a bounded research `validationReason`, but the route
  diagnostic currently discards it. The retained evidence therefore cannot
  distinguish top-level shape, source registry, candidate validity, or
  duplicate identity. Do not guess or weaken the contract.
- The attempt's `$0` cost is an observability defect. Failed terminal
  validation still consumed provider usage. The recorded tokens price to
  approximately `$0.154600` standard or `$0.168307` conservatively.
- Before new spend, retain only the safe validation-reason enum and make cost
  accounting include terminal provider usage regardless of later schema
  acceptance. Raw output, response IDs, prompts, source URLs, and secrets must
  remain absent.

---

## OAI-T10 Phase D live-feasibility preflight (2026-07-25)

- The only frozen case is broad `shop vac`; Phase D must not add another case,
  retry, replacement, or fallback.
- Dry run is the default. Live execution requires the exact full commit, a
  clean tracked worktree, process-only OpenAI and Serper keys, no prior
  evidence for that commit, and command-line approval matching every ceiling.
- The envelope is two Terra creates (high/background research and
  medium/synchronous no-web presentation), ten hosted searches, sixty
  retrieves, one safety cancel, fifteen Shopping attempts, thirty DNS-pinned
  response-owned source-page fetches, ninety physical page HTTP attempts
  including redirects, and a $3 OpenAI estimated-cost ceiling.
- Acceptance requires completed research, verification, and presentation,
  exactly two completed usage ledgers, at least one verified renderable card
  and source, bounded hosted-search use, and no private state in the public
  response. Any first terminal outcome ends the phase.
- This is provider and lifecycle feasibility only. It cannot establish
  recommendation quality, stability, flag promotion, deployment readiness, or
  superiority to another pipeline.

---

## OAI-T10 staged route and lifecycle contract (2026-07-25)

- The staged path is application-integrated but remains inaccessible by
  default. The server must have `REVIEW_RADAR_STAGED_TERRA=on`, and the
  browser must explicitly select it with the staged client header. Flag-off
  requests stay on the current route.
- Research and presentation are independent Responses requests. Research is
  background Terra/high with at most ten hosted searches. Presentation is
  synchronous Terra/medium, has no tools or prior-response ID, and receives
  only the server-validated evidence package.
- Response-owned source pages may enter Phase B only through the DNS-pinned
  bounded-fetch receipt. Runtime collection is capped at two pages per
  candidate, thirty total, one Shopping request per candidate, fifteen total,
  and four concurrent candidate workers.
- Do not infer `purchase_page` merely from Product JSON-LD. The observed
  entity must also contain an offer. Unknown pages stay `other`; arbitrary
  hosts must not be labeled official or manufacturer.
- The browser sees only an encrypted app job token and the bounded public
  briefing. Known unfinished jobs receive one safety cancel on abort, expiry,
  unusable tracking state, or unexpected non-terminal presentation.
  Oversized token payloads fail before research starts.
- Presentation cannot rename products or own facts/assets. The renderer takes
  identity, link, image, and evidence from the verified package. A buy link is
  displayed only when its exact URL also owns the verified price receipt;
  otherwise commerce remains `not_verified`.
- Phase C's offline integration wall proves the composition and failure
  boundaries, not real provider feasibility. A Phase D live request needs a
  new explicit cost and request envelope.

---

## OAI-T10 deterministic verifier contract (2026-07-24)

- `staged-terra-verifier-v1` is the only Phase B materializer. It preserves
  the validated research slate's exact candidate identity and order; it never
  ranks, backfills, browses, or calls a provider.
- Every research candidate must receive an explicit `eligible`,
  `close_match`, or `excluded` outcome. Missing input is an accounted
  exclusion, never a silently dropped candidate.
- Source pages enter only as successful bounded-fetch receipts for a
  candidate-owned research URL. The verifier derives the page observation
  itself and rejects byte-count or content-hash drift. Phase C must not
  substitute ordinary `fetch` or a caller-authored observation.
- Research-authored requirement and fact leads are discovery hints only.
  They never become facts. A source-reported claim must be present in the
  observed visible page text, use an identity-safe source role, and pass the
  existing semantic requirement validator before it can satisfy a hard
  requirement.
- Subjective performance and owner feedback always remain
  `source_reported`. Exact identity, complete-product type, price,
  availability, product URL, and image may be `verified` only through the
  existing exact-entity, exact-commerce, relationship, and asset gates.
- A verified hard failure excludes. Missing hard evidence is
  `not_verified` and produces a close match. Product and image assets are
  withheld from every non-eligible candidate.
- Phase B is disconnected and default-off. Its 12 focused tests and the
  1,410-test complete wall are offline proof of the materializer contract,
  not proof that Terra completes either real staged request.

---

## OAI-T10 staged Terra contract (2026-07-24)

- The replacement architecture is not another single-call prompt. It is:
  compact Terra research with web search, deterministic server verification,
  then a separate Terra presentation call with no web search.
- Both calls remain `gpt-5.6-terra`. The research call may discover 8–15
  candidates but cannot rank or write cards. The presentation call may use
  only eligible candidates and server-issued fact/evidence IDs.
- The deterministic evidence package owns identity, hard-requirement, price,
  source, product-page, and image truth. Subjective performance and owner
  sentiment remain `source_reported`; do not mislabel them as mechanically
  verified.
- Research sources must be exact response-owned HTTPS URLs. Presentation may
  not emit URLs, rename products, borrow another product's evidence, rank a
  close match, or use outside knowledge.
- Research is currently bounded to 10 hosted searches and 8,000 output tokens.
  Presentation has no tools, no prior-response coupling, and an 8,000-token
  output ceiling. These are contract values, not live proof that the provider
  accepts or completes both requests.
- `REVIEW_RADAR_STAGED_TERRA` and
  `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA` default off, and the live route is
  deliberately disconnected. Do not infer product behavior from Phase A.
- Phase A made zero external requests. Before any live spend, finish the
  zero-live verifier and route/lifecycle phases, review the complete diff, and
  obtain a new explicit live envelope.

---

## OAI-T9 terminal outcome (2026-07-24)

- The fixed Sol/high window at
  `5b99014e4b2b73d7aac0f89999eceb5d8da2e806` completed only 1/12 actual
  Direct-Terra routes. Five attempts reached the 60-retrieve ceiling while
  pending; six returned route-poll HTTP 502. Failed attempts remain in the
  denominator.
- The evaluator found no measurement defect and no pending manual review.
  Its result is `single_call_architecture_no_go`.
- The sole completed constrained-drill response returned five legitimate
  products and `2/4` frozen leader recall, but manual audit still found an
  unsupported top-product claim, a wrong image, an unverifiable displayed
  destination, and an unauditable selected image.
- The T8C baseline won every blinded case comparison. Sol had zero clear
  wins, and every within-case product-set Jaccard was `0` because eleven runs
  had no completed report.
- Usage-based cost (`$1.452307` standard; `$1.586910` conservative) covers
  only the completed response. Never treat a missing usage record on an
  incomplete provider response as proof of zero billing.
- This result closes the OAI-T9 experiment, not the product-quality problem.
  Direct-Terra remains off. Do not purchase a replacement sample or start a
  prompt/category patch cycle under this plan. Taylor's later Terra-only
  staged direction is a new architecture with a new acceptance contract.

---

## OAI-T9 terminal Sol acceptance contract (2026-07-24)

- The only eligible final sample is four frozen cases × three runs through the
  actual Direct-Terra route at one full commit, prompt V3, Sol/high, verifier
  v5, the unchanged `leaders-v2026-07c` denominator, and the prospective
  `leaders-v2026-07d-matcher`.
- Dry-run is the default. Live mode requires exact full-commit and dollar-cap
  arguments, process-only secrets, a clean tracked tree, no retries, and
  explicit audit-allowance acknowledgment. Failed routes remain in the
  12-run denominator; known unfinished jobs are cancelled.
- Every within-case pairwise product-set Jaccard must be at least `0.60`; do
  not replace that with a mean. Broad office-chair recall must average at
  least `4/7`, with no run below `3/7`.
- Rank 1 in every constrained run must pass all hard requirements. Lower ranks
  may retain visible `needs_verification` under the V3 contract; a hard
  failure is never allowed.
- Human audit covers every recommendation, every displayed destination/image,
  and two active sources for each top-two product. The audit-only supplement
  is at most 60 image retrievals, 60 destination opens, and 48 source opens.
  Those requests cannot change products, order, links, or images.
- All server-side product-page and audit-image retrievals must resolve the
  hostname first, reject the request if any DNS answer is non-public, and pin
  the connection to a validated public address. Product-page redirects repeat
  validation and stay on the original registrable domain; audit images follow
  no redirect. Textual private-host checks alone are insufficient (RR-100).
- Visual-audit downloads retain only JPEG, PNG, GIF, WebP, or AVIF bodies with
  matching file signatures. A response header alone is not image evidence
  (RR-101).
- Before each Sol create, reserve the frozen `$1.633816` conservative
  planning-basis maximum inside the `$22` operational ceiling, then reconcile
  actual conservative usage afterward. Provider billing has request
  granularity; no local runner can interrupt an already-dispatched response at
  an exact dollar boundary (RR-102).
- The 12 comparable T8C reports are content-hash pinned before spend. The
  blinded review requires all four cases to win/tie and at least two to win.
- Current 2026-07-24 official Sol pricing plus the maximum saved T8D usage
  yields a conservative 12-run planning value of `$19.605795`; the hard
  ceiling is `$22`.
- The decision is terminal: non-asset quality failure rejects the single-call
  architecture; asset-only safety failure disables assets; low safe coverage
  passes; measurement defects invalidate the sample; a full pass only makes
  promotion eligible for separate approval.

---

## Direct-Terra candidate-slate contract (OAI-T9 Phase 3, 2026-07-24)

- Prompt `direct-terra-master-prompt-v3` must return exactly
  `report_markdown`, `candidate_slate`, and `price_observations`.
- The server derives ordered requirement IDs from the actual request:
  `market_us`; optional `budget`; optional `important_details`; one
  `smart_feature:<stable-id>` per selected feature; and optional
  `dealbreakers`. Missing, duplicate, reordered, unsafe, or invented IDs fail
  closed.
- Terra must research 8â€“15 distinct products before ranking. Every candidate
  has one disposition, exact identity, evidence quality, concise reason,
  response-owned source URLs, and one verdict for every requirement ID.
- Ranked headings, slate rank/name, and price-observation identity must agree.
  A ranked hard failure is invalid. Rank 1 may not use
  `needs_verification`; a lower rank may use it only when its report section
  says so visibly.
- Evidence URLs must be exact URLs from the same response, including a later
  response-owned tracking variant that the public source list canonically
  deduplicates. One candidate may not borrow another candidate's source.
- Punctuation/spacing-equivalent models are duplicate identities, while exact
  numeric boundaries remain distinct (`Q7` is not `Q70`).
- The encrypted job token carries only category plus ordered requirement IDs,
  not shopper prose. Candidate diagnostics are server-only and retain no URLs,
  decision prose, source titles, provider IDs, or raw response.
- Invalid V3 output rejects the completed research response. Valid output
  leaves Terra's report, product order, public API shape, and asset behavior
  unchanged.

---

## Direct-Terra complete-product asset contract (OAI-T9, 2026-07-24)

- Product identity is necessary but not sufficient for a link or image.
- Every candidate must receive one server-only relationship:
  `complete_product`, `bundle_including_product`,
  `accessory_or_replacement`, `different_product`, `non_product_page`, or
  `unknown`.
- Only complete products and complete-product bundles may supply assets.
  Unknown stays unavailable.
- Parent-model words inside an accessory title/path do not prove the accessory
  is the complete product. Directed forms such as `tank for <product>` are
  complements even without the word `replacement`.
- Ambiguous candidates may use one bounded page fetch per ranked product
  (five per request); title or JSON-LD Product name must then prove the
  complete product. A failed or still-ambiguous fetch leaves the asset `null`.
- Preserve sibling, wrong-type, editorial, redirect, private-host,
  wrong-image, numeric-boundary, and descriptive-variant vetoes. Do not add
  category/product/retailer exceptions to recover coverage.
- Historical final-link replay without original provider titles can prove a
  positive unsafe relationship, but other rejections remain indeterminate.
  Never reinterpret those as reconstructed live provider failures.

---

## Phase 6B Regression Wall (2026-07-01)

- Canonical index: `docs/phase-6-regression-wall.md`.
- Range: RR-007 through RR-068 (62 issues).
- Deterministic gaps found and closed: RR-012 schema availability formatting and RR-025 near-match funnel retention.
- Measurement-only: RR-014 leader coverage and RR-015 run-to-run stability.
- Provider-variance-bound: RR-037 candidate-pool recurrence and RR-045 Tapo coverage.
- Do not treat a green deterministic wall as proof of live leader recall, stability, or provider coverage.
- No `test:wall` command exists. A focused wall runner is documented only as proposed automation requiring explicit approval.
- Phase 6B verification: focused additions 22/22; full suite 782/782; typecheck passed; lint 0 errors/3 existing warnings; eval clean; zero live calls.

---

## Cost Reference

> **Real per-search cost (corrected 2026-06-24):** the last measured baseline was **1325 Serper calls over 28 searches ≈ 47 Serper calls/search**, wall time ≈ **75 s/search**. The old table here said "~280–350 for a full 14×2 baseline" — that was a **~4× underestimate** (it predated editorial seeding + rubric rescue). Use ~47/search going forward. The scorecard now prints a live cost estimate before every run.

| Test type | Searches | Serper calls | Wall time | When to use |
|---|---|---|---|---|
| `npm test` + `npm run typecheck` + `npm run lint` | 0 | 0 | <90 s | Baseline health — **always** before and after every change |
| Frozen-set / unit harness (no live calls) | 0 | 0 | <5 s | Proving pure logic in isolation; always the first step |
| Citation-strength diagnostic (`citationStrengthDiagnostic.mjs`) | 1 live / 0 replay | ~47 / 0 | 1–2 min / <1 s | Per-candidate citation type report; detect thin-winner crowding |
| Stage funnel, 1 query (`--filter <id> --mode diagnostic` + `RR_FUNNEL=1`) | 2 | ~95 | ~3 min | Trace exactly where one leader is lost |
| **`--mode diagnostic`** (5 queries × 2) | 10 | ~470 | ~12 min | Default live smoke for a SPECIFIC suspected issue. Runs without `--confirm`. |
| **`--mode stress --filter <id>`** (1 query × 8) | 8 | ~376 | ~10 min | Why does ONE query swing? Needs `--filter`. Runs without `--confirm`. |
| **`--mode normal`** (14 queries × 2) | 28 | ~1316 | ~35 min | Full before/after smoke. **Cost-guarded — needs `--confirm` + user approval.** |
| **`--mode high`** (14 queries × 5) | 70 | ~3290 | ~90 min | High-confidence: is a change > variance? **Cost-guarded — needs `--confirm` + user approval.** |

The scorecard refuses to run any plan estimated over **600 Serper calls** unless `--confirm` is passed (the **cost guard**). `--dry-run` prints the plan for any mode and exits without spending a call. Preview with `npm run qa:plan -- --mode <mode>`.

---

## Stability Baseline (Established)

- **Run-to-run stability: ~19%** across broad queries (measured via `qualityConsistencyHarness.mjs`).
- This means the same query returns a meaningfully different set of products ~81% of the time between runs.
- **Practical consequence:** variance of ±2–3 core leaders per run exceeds the effect size of most single fixes. A full baseline with 2 runs/query cannot reliably detect improvements smaller than ~1.5 mean core leaders.
- **Measurement wall:** we hit this after the citation rescue fix — the 14×2 baseline showed poolCore 2.6 (down from 3.4) despite the stage funnel proving the fix worked at its target stage. The drop was noise.
- **What actually matters:** stage funnel proof (did the target leader survive the target stage?) is more trustworthy than a noisy full baseline for validating a narrow fix.
- **Known measurement limitation (fix in Phase 4):** `qualityScorecard.mjs` currently reports per-query coverage as the **max across runs** (`best()`), which *hides* variance and flatters results. Until Phase 4 adds mean/min/max/stddev, treat single scorecard numbers as optimistic, not central.

---

## Test Modes (use the cheapest mode that answers the question)

The scorecard (`scripts/qualityScorecard.mjs`) has explicit modes. Each prints a cost plan (queries, runs, est Serper calls, est runtime, the question it answers) **before** any live call, and enforces a cost guard.

| Mode | Command | Cost | Answers |
|---|---|---|---|
| **replay-only** | `npm run qa:replay -- <fixture>` or `npm run qa:replay -- --all` | 0 | Stage funnel, citation strength, thin/weak winner, lost-leader report from a saved fixture. No Serper/OpenAI. |
| **citation replay** | `node scripts/citationStrengthDiagnostic.mjs --replay` | 0 | Re-inspect a saved payload's citation strength with zero spend. |
| **diagnostic** | `npm run qa:scorecard -- --mode diagnostic` | ~470 Serper / ~12 min | Did a SPECIFIC suspected issue change at a known drop point? (smoke, not proof) |
| **stress** | `npm run qa:scorecard -- --mode stress --filter <id> --confirm` | ~376 Serper / ~10 min | Why does ONE query swing so much? |
| **normal** | `npm run qa:scorecard -- --mode normal --confirm` | ~1316 Serper / ~35 min | Broad before/after smoke across all 14. Too noisy alone to prove small gains. |
| **high** | `npm run qa:scorecard -- --mode high --confirm` | ~3290 Serper / ~90 min | Is a change LARGER than run-to-run variance? |

**Always preview first:** `npm run qa:plan -- --mode <mode> [--filter <id>]` prints the plan and spends nothing.

**When to use which:**
- **Start with 0-cost** (unit tests, frozen harness, citation replay). Most logic changes are fully provable here.
- **Use `diagnostic`** to confirm a specific hypothesis live (e.g. "does leader X now survive citation-verify?"). Pair with `RR_FUNNEL=1` for the per-stage trace.
- **Use `stress`** only when one query's variance is the question.
- **`normal` / `high` need explicit user approval** — they are the expensive baselines and the cost guard blocks them without `--confirm`. Prefer `high` over `normal` when you actually need to beat the noise floor; a single `normal` run cannot prove a sub-1.5-coverage change (see Stability Baseline).

---

## Phase Plan (measurement-first; ranking/discovery come AFTER measurement is trustworthy)

| Phase | Goal | Status |
|---|---|---|
| **1. Measurement foundation** | Test modes, cost guard, cost estimates, before/after rules, this doc | **DONE (2026-06-24)** |
| **2. Replay fixtures** | Save live debug payloads + candidate pools to `tests/fixtures/review-radar-live/`; replay tests for citation verify, citation strength, requirement filter, price trust, product-type, revalidation, final selection. Replay script `scripts/replay-quality-fixtures.mjs`. | **DONE (2026-06-24)** |
| **3A. Requirement-filter diagnostics** | Investigate "0 afterRequirementFilter" pattern on constrained queries. Build per-candidate diagnostic. Classify root cause. Fix funnel tracking + spec parsing bugs. | **DONE (2026-06-24)** |
| **3B. Wrong-type contamination fix** | Block confirmed wrong-type products from robot vacuum exact matches AND near matches. Add `robot_vacuum` rule to `productTypeIntent.ts`. Three-state `checkCategory` (pass/fail/unverified). `why_recommended` used via `allowedCheckText` to confirm type without poisoning blocked checks. | **DONE (2026-06-24)** |
| **3. Lost-leader diagnostics** | Trace each expected leader through every stage (never-found → raw → seed → pool → citation → requirement → price → reval → near → ranked-low → duplicate-collapsed → final 7). Extend the funnel/scorecard. | Planned |
| **4. Variance & confidence** | Scorecard reports mean/best/worst/range/stddev/stability; PASS/FAIL/INCONCLUSIVE classification; confidence warning when noise > effect. Replaces the misleading `best()` metric. | Planned |
| **5. Discovery quality** | Source-tiered discovery finds true leaders (editorial/lab, marketplace, manufacturer, community); better seed extraction; no source spam. | Planned (after measurement) |
| **6. Identity / canonicalization** | Collapse true dupes, preserve distinct products, avoid accessory/bundle/old-SKU confusion. | Planned |
| **7. Requirement & price verification** | Price/availability/feature/dimension/compatibility/type/spec confidence; fix wrongly-rejected valid products & wrongly-promoted weak ones without weakening hard gates. | Planned |
| **8. MarketTrust ranking** | Generalized trust lane (source mentions, review strength, diversity, reputation, sentiment, availability, value, risk). Never overrides hard constraints. | Planned |
| **9. Output quality** | Honest cards: why ranked, supporting evidence, what's uncertain, price/source confidence, missing facts, who-might-prefer-X. | Planned |
| **10. Performance** | Reduce calls / cache / replay safely — only after quality is measurable. | Planned |

---

## Proven Findings (do not re-investigate these)

### 1. Ranking is NOT the bottleneck for core-leader coverage
- **Proven by:** frozen-set harness + stage funnel.
- Leaders that survive filtering reach the final 7. The problem is upstream: discovery (never found) and citation verification (found but dropped).
- **Do not re-run ranking experiments to fix coverage.**

### 2. Citation verification was dropping real leaders (FIXED — committed)
- **Root cause:** `filterResultToVerifiedCitations` (in `lib/recommendationResultValidation.ts`) checks each candidate's citations against a `verifiedUrls` Set built from Serper results. LLM web_search path candidates (RIDGID, Craftsman, Roborock, etc.) have real product-page URLs but those URLs are NOT auto-added to `verifiedUrls` → zero citations → dropped.
- **Fix shipped:** `rescueProductPageCitation` — iterates a zero-citation candidate's own URL(s), runs `classifyProductEligibility` + `isNonProductPageResult` gates (same gates the pipeline uses), self-cites if it passes. Article/listing/category/search pages still drop. Uncited LLM prose still blocked.
- **Stage-funnel confirmed:** RIDGID, Craftsman now survive the citation-verify stage in 5-query diagnostic after fix.
- **Side effect:** rescued products have exactly 1 citation → mechanically triggers the `weak#1` flag (`citations < 2`). This is a known deferred issue.
- **Status:** committed to main. Do not revert without explicit instruction.

### 3. Verification budget cap was too low (FIXED — committed)
- **Root cause:** Codex set `few_exact_candidates` tier to max 6 products verified; display cap is 7 → could silently drop 1 exact match.
- **Fix:** cap changed 6 → 7 in `lib/recommendationPerformance.ts`.
- **Proved by:** `scripts/verificationBudgetFrozenTest.mjs` (frozen-set harness, 0 Serper calls).
- **Status:** committed. Do not re-investigate.

### 4. Size-blind variant collapse attempted and reverted
- **What failed:** `areSameCanonicalProduct` / `sameProductFamilyTitle` collapsed variants sharing any spec token (e.g., HP) regardless of size — "Stanley 5-Gallon 3HP" merged with "Stanley 6-Gallon 3HP". Live test: 7 eligible → 3 displayed.
- **Fix:** replaced with size-aware `variantFamilyKey` (`lib/productVariantFamily.ts`) using only size/capacity units, never HP/power.
- **Status:** committed.

### 5. HTTP 502 crash on malformed image URLs (FIXED — committed)
- **Root cause:** unguarded `decodeURIComponent` in `lib/productImageResolver.ts` on URLs with bad `%` escapes.
- **Fix:** `safeDecodeURIComponent` wrapper.
- **Status:** committed. Regression test in `tests/productImageResolver.test.mjs`.

### 6. Lever 2 (ranking by trust/popularity) was already implemented
- `ownerRatingScore`, `ownerReviewStrengthScore`, `productPopularityScore`, `broadSearchPopularityMultiplier` ×1.25 already present.
- **Do not re-implement or re-investigate Lever 2.**

### 7. `candidatePool` labeling bug (FIXED)
- Previously the stage funnel set `candidatePool` to `serperRecommendations` (Serper-only), causing coverage to appear to *increase* across stages. Fixed to use `candidateResult.recommendations` (merged Serper+LLM pool).

### 8. Stage funnel `afterRequirementFilter` tracking inconsistency (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3A investigation):** The stage funnel's `afterRequirementFilter` stage tracked only EXACT matches (`requirementFilteredResult.recommendations`), but earlier stages tracked ALL surviving candidates. So the "dramatic drop to 0" on constrained queries was a measurement artifact: products were correctly demoted to NEAR-MATCH status (unknown budget → need verification), NOT eliminated. The `afterRevalidation` stage combined both exact+near, making it look like a "rescue from 0" when it was just the funnel's inconsistency.
- **Fix shipped:** Added `near: resultNames(requirementFilteredResult.nearMatches)` to the `afterRequirementFilter` stage in the route. The replay script already reads `s.near` and folds it into stage counts — no change needed there.
- **Verified behavior:** for constrained queries with no verified prices at filter time, ALL candidates correctly go to near-match (0 exact), then rescue+revalidation promotes some to exact once evidence is found. This is the 3-state system working as designed.
- **Do not weaken the hard-requirement or budget gates.** The behavior is correct; the measurement was lying.

### 9. Spec preWindow direction-word poisoning (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3A):** `extractSpecConstraints` checks a 28-character preWindow before each spec match for direction words ("under", "at least", etc.). When a query contains "under $N spec" (e.g. "gas grill under $600 4-burner"), the "under" from the price context bled into the spec's preWindow, making "4-burner" extract as `max 4 burners` (at most 4) instead of the correct `min 4 burners` (at least 4, since `direction: "higher"`).
- **Additional bug:** the label for `operator: "max"` said "under N" but the code evaluated `≤ N` (not `< N`). Label was semantically wrong.
- **Fixes shipped:** (a) Strip `DIRECTION_WORD\s+\$[\d,]+` patterns from preWindow before direction detection, so price-modifying words don't affect the spec direction. (b) Change label from "under N" → "at most N" to match the `<=` evaluation. Both fixes are in `lib/specExtraction.ts`.
- **Spec validation is still disabled** (`REVIEW_RADAR_SPEC_VALIDATION !== "on"`), so this bug had no live impact — but it would have caused wrong-direction spec filtering if validation were enabled.
- **3 new tests added** to `tests/specExtraction.test.mjs`. All 557 tests pass.

### 10. Wrong-type vacuums passing robot vacuum category check (FIXED — committed 2026-06-24)
- **Root cause (proven by Phase 3B investigation):** `PRODUCT_TYPE_RULES` in `productTypeIntent.ts` had no `robot_vacuum` rule → `classifyProductTypeIntent` returned `{requestedType: null, status: "unknown"}` for all robot vacuum queries → `checkCategory` fell through to `categoryTerms` text matching → LLM-mislabeled `product.category = "robot vacuum"` on stick/wet-dry/canister vacuums caused them to pass the category check.
- **Wrong-type products found in fixtures:** Milwaukee M18 Wet/Dry Vac, ONE+ Hand Vacuum in EXACT MATCHES (best-robot-vacuum); Shark Rocket Stick, RYOBI Stick, Kenmore Canister in NEAR MATCHES (robot-vacuum-under-300-self-emptying).
- **Fixes shipped (3 changes):**
  - `robot_vacuum` rule added to `PRODUCT_TYPE_RULES`: `blocked = /stick vacuum|canister vacuum|hand vacuum|wet dry|shop vac|upright vacuum/`, `allowed = /robot vac|robot vacuum|robot cleaner|robot mop|robotic vacuum/`
  - `classifyProductTypeIntent` gained an optional `allowedCheckText` parameter (separate from `candidateText`): used for the `isAllowed` check only, so `why_recommended` can confirm robot vacuum type without risk of query-echoing text falsely satisfying the `satisfiedBy` guard in `isComponentSubstitution`
  - `checkCategory` converted from boolean to `CategoryVerdict = "pass"|"fail"|"unverified"`: wrong type → `missingRequirements` (blocked from near); unverified → `unknownRequirements` (allowed as near match); pass → `matchedRequirements`
- **Validated behavior:** Milwaukee, ONE+ Hand Vac, Shark Rocket, RYOBI Stick, Kenmore Canister → `irrelevant` → excluded. Roborock S8 MaxV Ultra (name sparse, but why_recommended says "robot vacuum and mop") → `exact` via `allowedCheckText`. Roborock S7 MaxV Ultra (neither name nor why_recommended confirm type) → `needs_verification` → near match.
- **7 new tests added** (4 in `productTypeIntent.test.mjs`, 3 in `requirementValidation.test.mjs`). **564 tests pass.**

---

## Known Open Issues (proven but not yet fixed)

### A. Discovery gap — 2–4 core leaders never discovered per query  · **PROVEN**
- Leaders like Ecovacs, Narwal, Dreame, Stanley (shop-vac), Milwaukee, Monument, Broil King never appear in `candidatePool`.
- Cause: not returned by Serper shopping queries + not named by LLM.
- **Not the same as the citation-verify bug.** These need a separate discovery fix (Phase 1 source-tiered seeding, editorial mining).
- Theme 3 of the current plan covers this (editorial best-of list seeding).

### B. Rescued products are "thin winners" (measured, guardrails in place)  · **PROVEN (mechanism); SUSPECTED (crowd-out)**
- Rescued products carry exactly one citation tagged `product-page-self` → old `weak#1` check (`citations < 2`) fired for them.
- **Resolved as a measurement issue:** the scorecard now distinguishes `WEAK` (genuinely uncorroborated: no price, zero citations, wrong type, weak consensus) from `THIN` (self-cited-only but verified price + ok consensus). These are separate columns in the broad scorecard.
- A `THIN#1` is still flagged for monitoring — it is real product-page evidence, but lacks independent corroboration. It is not the same as no evidence.
- **Citation type tagging** (`citation_type` field, committed 2026-06-24):
  - `product-page-self`: product's own buyable URL — set explicitly by the rescue path
  - `independent-editorial`: Tier-1 editorial source (Wirecutter, RTINGS, CNET, etc.)
  - `retailer-marketplace`: Tier-2 marketplace (Amazon, Home Depot, etc.)
  - `weak-uncorroborated`: Tier 3/4 (manufacturer, community, unknown)
- **Diagnostic tool:** `scripts/citationStrengthDiagnostic.mjs` — run live (1 API call) then replay from saved payload. Shows per-candidate citation type breakdown and flags thin-winner crowding-out patterns.
- **Next unresolved:** do thin winners actually crowd out better-supported candidates? Use `citationStrengthDiagnostic.mjs --replay` to check before deciding any scoring change.

### C. Secondary filtering drop at `afterReval`  · **SUSPECTED**
- Some leaders pass the requirement filter but are removed at final selection due to the "exact needs verified price" reliability rule.
- Observed in funnel output but not yet isolated to a single mechanism ("murkier"). Needs a Phase 3 lost-leader trace before acting.
- Separate from the citation-verify bug. Deferred.

### E. Wrong-type products reaching near matches on robot vacuum  · **FIXED (Phase 3B, committed 2026-06-24)**
- "Shark Rocket Bagless Corded Stick Vacuum", "RYOBI ONE+ Cordless Stick Vacuum", "KENMORE Bagged Canister Vacuum" appeared in robot vacuum under $300 near matches. Milwaukee M18 Wet/Dry Vac and ONE+ Hand Vacuum appeared in EXACT MATCHES for "best robot vacuum."
- Root cause: no `robot_vacuum` rule in `PRODUCT_TYPE_RULES` → `classifyProductTypeIntent` returned `{requestedType: null}` for all robot vacuum queries → fell through to `categoryTerms` which used LLM `product.category` (mislabeled "robot vacuum" by LLM).
- **Fix shipped (Phase 3B):** (1) `robot_vacuum` rule added to `productTypeIntent.ts` — blocks stick/canister/hand/wet-dry/upright/shop-vac vacuums; allows "robot vacuum/vac/cleaner/mop". (2) `checkCategory` made three-state (pass/fail/unverified): wrong-type → hard fail → excluded from exact+near; unverified → near match; confirmed → exact match. (3) `allowedCheckText` parameter added to `classifyProductTypeIntent` — `checkCategory` passes `evidenceText + why_recommended` for the allowed check so sparse names like "Roborock S8 MaxV Ultra" can confirm their type via the recommendation narrative without risking query-echoing text in why_recommended satisfying the substitute guard.
- **Why "wet dry" without requiring "vac":** Serper returns truncated product titles like "Milwaukee M18...Wet/Dry ..." — the word "Vac" is cut off. The `blocked` pattern matches "wet dry" alone, which is specific enough.
- **Sparse-name behavior:** Products whose evidence + why_recommended don't confirm robot vacuum type → "unverified" → near match with "Needs verification: Category: robot vacuum". Not excluded from near matches.
- 7 new tests added. 564 tests pass.

### D. Seed extraction junk (partially fixed)  · **PROVEN (fixed)**
- "Recommendations RTINGS.com" and year-led mashes ("2026 Shark Eufy WIRED Dyson...") appeared as seed product names.
- Fixed: `containsSourceName` + `isYearLedRun` filters added to `lib/search/serper.ts`.
- **Status:** committed. Monitor for regressions.

---

## Phase History

| Phase | What changed | Outcome |
|---|---|---|
| Phase 0 | Two-scorecard system + gold benchmark (14 queries) | Established baseline: poolCore ~3.4, stability 19%, wrong-type leaks common |
| Phase 1 | Source-tiered discovery: Tier-1 mined first, brand-led seed extraction | Partial pass: directional improvement, do-not-regress held, coverage targets fell short |
| Phase 1.5 | Stage funnel (6-stage per-candidate trace) | Proved ranking is NOT the bottleneck; citation-verify IS a real drop point |
| Filtering STEP 1 | Proved citation-verify is the drop step | No pipeline change; confirmed mechanically via funnel output |
| Filtering STEP 2 | Citation rescue (`rescueProductPageCitation`) | Stage-funnel confirmed. Full baseline inconclusive due to measurement wall |
| Theme 1 (plan) | Full structured requirements at discovery filter | Committed: spec/size/color conflicts rejected at candidatePool stage |
| Citation strength | `citation_type` tagging + weak#1 vs thin#1 split + `citationStrengthDiagnostic.mjs` | Committed 2026-06-24: measurement foundation for thin-winner risk |
| Measurement Phase 1 | Scorecard test modes + cost guard + cost estimates + this doc | Committed 2026-06-24: expensive baselines now require `--confirm` + approval |
| Measurement Phase 2 | Replay fixtures: `tests/fixtures/`, `replay-quality-fixtures.mjs`, `save-debug-fixture.mjs`, 14 deterministic tests on synthetic fixture | Committed 2026-06-24: zero-cost stage-funnel + citation-strength replay proven on synthetic fixture |
| Phase 3A | Requirement-filter diagnostics on constrained queries ("gas grill under $600 4-burner", "robot vacuum under $300 self-emptying"). Root cause: funnel measurement inconsistency (exact-only tracking at filter stage) + latent spec preWindow direction-word poisoning. Fixed funnel + spec extraction + label. 3 new tests. | Committed 2026-06-24: 557 tests pass, typecheck + lint clean. No behavior change to filtering. |
| Phase 3B | Wrong-type contamination fix — wet/dry vacs, stick vacuums, canister vacuums, hand vacuums in robot vacuum exact/near matches. Root causes: no `robot_vacuum` rule in productTypeIntent; `checkCategory` binary (no three-state). Fixed: `robot_vacuum` rule, three-state category verdict, `allowedCheckText` for why_recommended. 7 new tests. | Committed 2026-06-24: 564 tests pass, typecheck + lint clean. Wrong-type products blocked from both exact and near matches. |

---

## Gold Benchmark Summary (14 queries)

- **8 broad queries:** robot vacuum, gas grill, office chair, air purifier, shop vac, toaster oven, blender, mattress  
- **6 constraint queries:** (budget/feature requirements attached)
- Scoring: `poolCore` (found anywhere in pool), `final7Core` (in final 7), `altPool` (acceptable alternates), `wrongLeak`, `weakWinner`, `stability`, `priceOk`
- **Targets:** poolCore ≥ 5/7, final7Core ≥ 3/7, 0 wrong-type, 0 weak#1, 0 EMPTY constraint results
- **Last known mean (Phase 1 baseline):** poolCore ~3.4, final7Core ~2.x, weak#1 ~4/8, stability ~19%
- **Last full baseline (post-citation-rescue):** poolCore 2.6, weak#1 6/8 — inconclusive due to noise

---

## Before/After Comparison Rules (classify every comparison)

When comparing two versions, **never call a change successful because one run improved.** Report:
- before mean vs after mean (and, once Phase 4 lands, before range vs after range)
- whether the improvement is larger than normal run-to-run variance (±2–3 core leaders at 19% stability)
- safety regressions (any of: budget violations, wrong-type winners, EMPTY constraint results, non-product pages, suspicious prices)
- quality improvements (coverage, weak#1↓, thin#1↓, stability↑)
- which metrics are inconclusive

Classify the result as exactly one of:
- **PASS** — improvement is consistent AND larger than noise AND **zero** safety regressions.
- **FAIL** — any important safety or quality metric regresses (a safety regression is an automatic FAIL regardless of coverage gains).
- **INCONCLUSIVE** — variance too high to trust (effect size < noise floor). This is the *expected* outcome of a single `normal` run for a small change — escalate to `high` mode or a deterministic replay, do **not** ship on an INCONCLUSIVE.

**Safety floor (never trade away for a metric):** product eligibility, price trust, wrong-product-type filtering, non-product-page blocking, hard-requirement validation, exact-budget-needs-trusted-price. A change that improves coverage by weakening any of these is a **FAIL**, not a tradeoff.

## Issue Status Legend

Tag every finding in this doc as one of:
- **PROVEN** — reproduced via funnel/replay/unit test with a clear mechanism. Don't re-investigate.
- **SUSPECTED** — observed once or inferred, not yet isolated. Needs a cheap diagnostic before acting.
- **UNKNOWN** — open question, no data yet.

## Decision Protocol for Future Tests

### "Should I run a full baseline?"

Only if ALL of these are true:
1. A structural change was made that affects multiple stages (not just a single filter or rescue)
2. The change is expected to shift mean coverage by ≥1.0 core leader
3. A 5-query stage-funnel diagnostic has already confirmed the change works at the target stage
4. You have explicit approval from the user

**Before running, ALWAYS report to the user:** (1) what prior results already answer the question, (2) whether a smaller diagnostic/replay can answer it, (3) estimated Serper calls + runtime (use `npm run qa:plan`), (4) that you need approval. The cost guard enforces this for `normal`/`high`.

### "Can a stage funnel diagnostic answer this?"

Yes, if you need to know: "does leader X survive stage Y after this fix?" Use `RR_FUNNEL=1` on 3–5 representative queries. ~4–8 min, ~50–70 Serper calls.

### "Can a unit test answer this?"

Yes, for any pure logic: spec matching, form-factor detection, seed extraction, URL normalization, variant collapse. Run `npm test` first. 0 Serper calls, <60s.

### "Is the baseline inconclusive?"

If run-to-run variance in core leaders (±2–3) exceeds the expected effect size of the change, the baseline cannot confirm or deny the change. In this case:
- Trust stage-funnel proof over noisy mean scores
- Do NOT revert a mechanically-proven fix based on a noisy baseline
- Consider raising `RR_RUNS` to 4+ before concluding

---

## Files to Know

| File | Purpose |
|---|---|
| `scripts/qualityScorecard.mjs` | Two-scorecard harness. Modes: `--mode diagnostic\|normal\|high\|stress`, `--filter`, `--dry-run`, `--confirm`, `RR_FUNNEL=1`. Cost-guarded. Shows `weak#1` vs `thin#1`. |
| `npm run qa:scorecard -- --mode <m>` | Run the scorecard in a named mode (cost-guarded). |
| `npm run qa:plan -- --mode <m>` | Print the cost plan for a mode and exit (0 calls). |
| `scripts/citationStrengthDiagnostic.mjs` | Single-query citation type report + replay from saved payload |
| `scripts/goldBenchmark.mjs` | 14 gold queries with coreLeaders / acceptableAlternates / wrongTypeTerms |
| `scripts/qualityConsistencyHarness.mjs` | Stability measurement (N runs × M queries) |
| `scripts/verificationBudgetFrozenTest.mjs` | Frozen-set proof for verification budget cap |
| `lib/recommendationResultValidation.ts` | Citation rescue lives here |
| `lib/recommendationFunnel.ts` | Stage snapshot types for funnel debug |
| `lib/productVariantFamily.ts` | Size-aware variant collapse |
| `lib/search/sourceTier.ts` | Domain → Tier 1/2/3/4 classifier |
| `scripts/replay-quality-fixtures.mjs` | Load a saved debug payload; report stage funnel, citation strength, thin/weak winner, lost leaders. Exports `analyzeFixture()` for tests. `npm run qa:replay -- <file>` or `--all`. |
| `scripts/save-debug-fixture.mjs` | Call the API once with debug header; save payload to `tests/fixtures/review-radar-live/<slug>.json`. `npm run qa:save-fixture -- "query" [--gold "Brand Model"]`. |
| `tests/fixtures/robot-vacuum-synthetic.json` | Synthetic "best robot vacuum" fixture (7 pool candidates, citation-verify drop, rescue pattern, thin winner, 1 lost leader). Baseline for replay tests. |
| `tests/fixtures/review-radar-live/` | Live fixtures saved by `save-debug-fixture.mjs`. Not committed (add `_goldLeaders` before saving). |
| `tests/replayFixtures.test.mjs` | 14 deterministic tests on the synthetic fixture — stage funnel, citation strength, thin-winner, lost-leader drop-point. 0 API calls. |
| `docs/qa-loop-results.md` | Append-only QA log (Claude: 🟩 green, Codex: 🟧 orange) |
| `ReviewRadar-Overview.md` | Repo-root source of truth — read before major changes |

---

*Last updated: 2026-06-24 (Measurement Phase 2: replay fixtures — `replay-quality-fixtures.mjs`, `save-debug-fixture.mjs`, synthetic fixture, 14 deterministic tests). Maintained append-only — add entries, do not overwrite prior findings.*

---

## Phase 3C (2026-06-25): categoryTerms alias expansion

**Finding:** `categoryTerms()` did literal word-group matching without consulting `extractedRequirements` aliases. For "gas grill" queries, "propane" is a well-known alias for "gas" in the requirement system, but a product described only as a "propane grill" (no "gas" in any text field) failed the category check → "unverified" → excluded from exactScored → dropped when 7 exact matches exist.

**Fix:** `categoryTerms(category, extractedRequirements?)` now expands each term group with aliases from `requiredConstraints` where the constraint value or aliases include the category term. Generic: works for any query where category terms map to dealbreaker requirement values.

**Tests:** 4 new tests in `requirementValidation.test.mjs` — "categoryTerms alias expansion via extractedRequirements". All pass.

**Unconfirmed for future investigation:** Weber E-325 and Weber Genesis E-435 pass the category check (have "Gas Grill" in name) but score below all 7 winners. Exact scoring reason requires per-candidate enriched data not currently saved in fixtures. Future: add `exactScoredBreakdown` / `nearScoredReason` to debug output.

**Fixture unchanged:** `gas-grill.json` replay still shows same funnel results — this fix affects future LIVE runs, not the already-saved fixture (scoring happened in the live run, not replay).

---

## Final-selection trace instrumentation (2026-06-25): debug-only, behavior-change-free

**What:** Added `debug.stageFunnel.finalSelectionTrace` — a per-candidate array capturing why every candidate that reached `scoreAndSelectRecommendations` was selected, collapsed, disqualified, or ranked below cutoff. Zero behavior change.

**Types** in `lib/recommendationFunnel.ts`:
- `FinalSelectionDecisionReason` — 10-value union (selected, ranked_below_cutoff, duplicate_identity_collapsed, variant_family_collapsed, not_reliable_enough_for_exact, near_only_exact_full, disqualified_category, disqualified_avoid, disqualified_other, missing_trace_reason)
- `FinalSelectionCandidateStream` — 5-value union (exactScored, reliabilityNear, nearScored, disqualified, unknown)
- `FinalSelectionTraceEntry` — full shape with identity, stream, reason, score, citation, price-trust, form-factor modifiers

**Implementation** in `lib/recommendationScoring.ts`:
- Private `scoreAndSelectImpl` (shared body); public `scoreAndSelectRecommendations` unchanged; new public `scoreAndSelectRecommendationsWithTrace` returns `{ result, finalSelectionTrace }`
- `buildFinalSelectionTrace` classifies each afterRevalidation candidate by stream (via set membership) and reason (via `collapseReasonMap` which re-traces the `selectRankedExactMatches` loop)
- `nearCandidatesAll` (pre-slice) captured alongside `nearScored` (post-slice top 8) so ranked-9+ candidates get `ranked_below_cutoff`

**Route:** `app/api/recommendations/route.ts` destructures `scoreAndSelectRecommendationsWithTrace` and attaches `finalSelectionTrace` to `stageFunnel` debug payload.

**Replay script:** `scripts/replay-quality-fixtures.mjs` prints trace grouped by decision reason (selected first by rank, then not-selected grouped by reason with stream/score/collapsedBy). Prints "not present" message for old fixtures.

**Tests:** `tests/finalSelectionTrace.test.mjs` — 11 deterministic tests covering trace existence, shape, stream classification, all 4 disqualification paths, ranked_below_cutoff, identical result parity, score data, citation counts, and off-form-factor modifiers. All 11 pass; full suite 579/579 green.

---

## 2026-06-25 — Phase 3E: Source-quality upgrade (tests/sourceQualityUpgrade.test.mjs)

**What was built:** `upgradeWeakSourceEvidence` in `lib/requirementEvidenceRescue.ts` — a pre-scoring pass that finds retailer evidence for manufacturer-page candidates before final scoring.

**Trigger logic (`needsSourceUpgrade`):**
- Must have a model-number token (regex `\b[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*\b` applied to `product.name`, plus `metadata.modelNumber/sku/gtin`) with length ≥ 4 after normalization
- Must have `requirementCheck.failed.length === 0` (not disqualified)
- Must have ALL THREE weak-evidence signals: no verified price (`offers[].price.confidence !== "Low" && price !== null`), no `metadata.rating.value`, zero citations where `sourceHost(citation.url) !== sourceHost(product_page_url)`

**Key behaviors tested:**
- 3-category coverage: gas grill (E-325 model token), robot vacuum (RV1001AE), TV (QN65Q80C)
- `looksLikeSameProduct` identity gate reused (same function as requirement rescue)
- `mergeOffer` idempotent — never overwrites existing price
- `mergeRatingData` only writes when `!metadata.rating?.value` (null/undefined both excluded)
- `addVerificationCitation` deduplicates by URL (existing URL → no second citation added)
- Cap: `MAX_SOURCE_UPGRADE_CANDIDATES = 3` — 4 qualifying candidates → 3 searches, 3 traces
- Negative: identity mismatch (Char-Broil result for Weber E-325 query) → trace shows `evidenceAttached: false`

**Negative cases confirmed:**
- Has verified price → `needsSourceUpgrade = false` → `searchFn` never called
- Has failed requirement → `needsSourceUpgrade = false` → `searchFn` never called
- No model-number token ("Best Charcoal Grill Ever") → `needsSourceUpgrade = false`
- Has external citation (different host) → `needsSourceUpgrade = false`
- Has `metadata.rating.value` set → `needsSourceUpgrade = false`

**Route integration:** `routeDependencies.upgradeWeakSourceEvidence` called after `revalidatedAssetResult`, before `scoreAndSelectRecommendationsWithTrace`. Contract test identity mock: `async (result) => ({ result, sourceUpgradeTraces: [] })`.

**Debug visibility:** `debug.stageFunnel.sourceUpgradeTraces` → array of `{ name, query, evidenceAttached, attachedFields }`. Replay script prints section.

**Suite count:** 18 new tests; total 597/597 green. TypeScript clean.

---

### Phase 3F — Loosen source-upgrade trigger: replace citation-count check with useful-commerce-evidence check

**File:** `tests/sourceQualityUpgrade.test.mjs` (+5 tests; total 600/600)
**Changed:** `needsSourceUpgrade` trigger condition — replaced `countExternalCitations(product) === 0` with `!hasUsefulCommerceEvidence(product)`.

**`hasUsefulCommerceEvidence` logic (in `lib/requirementEvidenceRescue.ts`):**
Returns `true` when any citation is from a host that is:
- different from the product page host, AND
- `sourceTier === 1` (editorial: Wirecutter, RTINGS, etc.) OR `sourceTier === 2` (marketplace/retailer: Amazon, Home Depot, etc.)

Tier-3 citations (manufacturer/brand sites) and tier-4 citations do NOT count as useful commerce evidence.

**Key new cases now handled correctly:**
- `store.ridgid.com` (tier-3 brand subdomain) when product host is `ridgid.com` → NOT useful → eligible for upgrade
- `makitatools.com` (tier-3 manufacturer) when product URL host is `amazon.com` (self-citation excluded) → NOT useful → eligible for upgrade
- `wirecutter.com` (tier-1 editorial) → useful → NOT eligible (no upgrade wasted)
- `homedepot.com` (tier-2 retailer) → useful → NOT eligible (no upgrade wasted)

**New tests (5 added):**
- `needsSourceUpgrade` returns false for tier-2 retailer citation (renamed from "external citation" to reflect actual semantics)
- `needsSourceUpgrade` returns false for tier-1 editorial citation (new)
- `needsSourceUpgrade` returns true when only citation is same-brand subdomain — RIDGID RT1200 pattern (new)
- `needsSourceUpgrade` returns true when only external citation is manufacturer site on different domain — Makita XFD10Z pattern (new)

**What did not change:**
- Scoring weights, ranking, selection logic unchanged
- `modelTokens` detection unchanged (Napoleon Rogue 525, Samsung Bespoke still excluded)
- All Phase 3E safety gates intact (failed requirements, identity gate, idempotent merges, cap)
- Existing 18 Phase 3E tests all pass unmodified

### Phase 3G — Source-upgrade search-result diagnostics (2026-06-26)

**What changed:** `SourceUpgradeTrace` in `lib/requirementEvidenceRescue.ts` extended with 4 new debug-only fields. No behavior change.

**New type:** `SourceUpgradeCandidateSample { name, host, price, rating, identityMatch, rejectionReason }` (exported).

**New `SourceUpgradeTrace` fields:**

| Field | Type | Meaning |
|---|---|---|
| `candidatesReturned` | `number` | Total shopping results Serper returned (0 = empty results) |
| `candidatesEvaluated` | `number` | Candidates that passed `looksLikeSameProduct` |
| `noMatchReason` | `string?` | Why nothing attached: `shopping_results_empty`, `identity_rejected`, or `no_attachable_fields`. Absent when `evidenceAttached=true` |
| `candidateSample` | `SourceUpgradeCandidateSample[]` | First ≤5 candidates with name, host, price, rating, identityMatch, rejectionReason |

**`rejectionReason` values per candidate:**
- `"identity_mismatch"` — `looksLikeSameProduct` returned false
- `"no_attachable_fields"` — identity passed but no price/rating/citation/image to attach
- `null` — this was the winning match (`evidenceAttached=true`)

**Replay script:** `printSourceUpgradeTraces` in `scripts/replay-quality-fixtures.mjs` now prints results count, identity-match count, `noMatchReason`, and candidate sample per trace entry. Gracefully skips new fields when absent (pre-3G fixtures).

**Tests added (5 new, total 605):**
1. Empty results → `candidatesReturned:0`, `noMatchReason:"shopping_results_empty"`, `candidateSample:[]`
2. All candidates fail identity → `candidatesReturned:1`, `candidatesEvaluated:0`, `noMatchReason:"identity_rejected"`, `candidateSample[0].rejectionReason:"identity_mismatch"`
3. Evidence attached → `evidenceAttached:true`, `candidatesEvaluated:1`, `noMatchReason:undefined`, `candidateSample[0].rejectionReason:null`
4. candidateSample capped at 5 even with 7+ candidates
5. Old-format traces (no new fields) handled gracefully by replay guard

**Safety gates unchanged:** trigger logic, scoring, ranking, identity matching, query construction, price trust, citation trust all unmodified.

---

## 2026-06-27 — Phase 5A: Source-upgrade same-product safety (RR-058)

**Reproduced failure:** `Whynter RPD-411WG ... Dehumidifier` accepted `Whynter 34 Bottle Freestanding Wine Refrigerator` from a specific Google Shopping offer and attached `$479`, rating 4.1, 204 reviews, and a citation.

**Exact root cause:** RR-053 correctly removed the Google `q=Whynter+RPD-411WG` parameter from identity evidence. The remaining token-overlap fallback still counted repeated tokens from the target's `name` and `metadata.title`; repeated `Whynter` occurrences could satisfy the overlap threshold without any product-type agreement. Broad overlap could likewise override a different explicit same-family model.

**Fix:**
- Source-upgrade calls `classifyProductTypeMatch` before exact-model/token-overlap identity acceptance.
- The shared conflict registry treats explicit wine/beverage refrigerator, fridge, or cooler evidence as incompatible with a dehumidifier request unless dehumidifier evidence is also present.
- A source title with a different explicit token in the same model family is rejected (`RPD-411WG` versus `RPD-561EGP`).
- The model check remains supplemental. The product-type rejection works without any target model token.

**Preserved positives:**
- exact source-derived model title;
- merchant URL path carrying the exact model;
- same-brand same-product dehumidifier;
- sparse candidates with no explicit type/model conflict;
- uppercase measurement text such as `765 CFM` when it is not the target model family;
- RR-048/RR-049/RR-051/RR-053 behavior and normal user-facing result shape.

**Deterministic verification:**
- New RR-058/type/model/measurement tests: 4 source-upgrade regressions plus 1 shared product-type regression.
- Focused source/type/identity/Serper/requirement tests: 170/170.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 647/647.
- `node scripts/eval-pipeline.mjs`: no red-flag issues.
- Live calls: 0.

**Status:** RR-058 Fixed. Do not remove or weaken these regressions during Phase 5B model-token expansion.

---

## 2026-06-27 — Phase 5B: Source-upgrade identity coverage

**Issues fixed:** RR-052, RR-057, RR-034, RR-035, RR-044.

**Pre-fix reproductions:**
- RIDGID `4.25 Peak HP ... HD0900` plus ambiguous `metadataBrand: HP` produced `HP HD0900`.
- BLACK+DECKER BEBL7000 selected `AMP 250` before the real compact model.
- Napoleon `Rogue 525`, Samsung `Bespoke Jet Bot AI+`, FEIN `9-20-36`, and Milwaukee `M18` were not source-upgrade eligible.
- Nine fail-first assertions failed before implementation.

**Brand behavior:**
- `HP` is removed from brand evidence only in explicit horsepower contexts: number + optional `Peak` + HP, `Peak/maximum/rated HP`, or `horsepower (HP)`.
- Genuine HP computer-brand titles remain positive.
- Ambiguous metadata HP is ignored only when the product title proves it is a measurement occurrence.
- When trusted metadata/shared brand inference is absent, a guarded non-generic leading title token can supply compact query identity.

**Model extraction:**
- Candidates are ranked as `strong` or `family`; selection no longer uses the first regex match.
- Strong coverage: compact alphanumeric models, uppercase word-number models, mixed word-number series, and brand-qualified numeric-dash models.
- Family coverage: brand-qualified descriptive families and short tokens such as M18.
- Separated unit-number/descriptor-number phrases are suppressed (AMP, MPH, CFM, HP, PSI, GPM, BTU, voltage, capacity, size, pack, series, and related forms).
- Meaningful adjacent series/suffix context is preserved (`Spirit E-325`, `Rogue XT 425 SIB`, `FMM 350 QSL`, `M18 FUEL`) without restoring long product-title filler.

**Attachment safety:**
- Only strong tokens can take the exact-model fast path.
- Family-only identity requires the requested category/product noun in source-derived candidate evidence.
- Different explicit same-family tokens reject.
- Different brand-qualified numeric-dash models reject.
- Product token overlap is deduplicated, so repeated metadata/title brand tokens cannot inflate identity.

**Key regressions:**
- M18 circular saw -> M18 cordless drill: rejected.
- M18 hammer drill -> M18 cordless drill: accepted.
- FEIN 9-20-37 -> FEIN 9-20-36: rejected.
- Measurement-only and unbranded M18 titles: ineligible.
- Exact Phase 5A Whynter wrong-type, no-token type mismatch, valid same-product, and different-model cases: green.
- RR-048/RR-049/RR-051/RR-053: green.

**Verification:**
- Focused source/brand/type/identity/Serper/requirement tests: 183/183.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 660/660.
- `node scripts/eval-pipeline.mjs`: no red-flag issues.
- Live calls: 0.

**Status:** Phase 5B complete. Keep these identity coverage and safety cases green during later source-upgrade reliability work.

---

## 2026-06-28 — Phase 5C: Cross-category tiny-price trust

**Issue fixed:** RR-002.

**Pre-fix deterministic reproduction:**
- Saved shop-vac, dash-cam, and wireless-earbud products each carried a `$10` retailer offer and `$10` recommendation text.
- `minimumLikelyFullProductPrice` returned `null` for all three contexts.
- Because the global absolute floor is exactly `$10`, `plausibleProductPrice` returned `10`.
- `assessProductPriceTrust` then returned `verified`, `canUseForBudget: true`, and `canBeExactWithBudget: true`.
- The exact saved shop-vac title uses plural `Wet Dry Vacuums`; singular test titles would not reproduce the gap because singular `vacuum` was already covered.

**Fix boundary:**
- Existing vacuum floor now recognizes plural `vacuums`, `shop vac`, and wet/dry-vac forms.
- Dash-camera full products use a `$20` minimum.
- Wireless/true-wireless/Bluetooth earbuds use a `$12` minimum.
- Global `PRICE_ABS_FLOOR = 10` remains unchanged.
- No source-host, retailer, brand, or model exception was added.

**Required outcomes:**
- Below class floor: `status: suspicious`, `price: null`, `canUseForBudget: false`, `canBeExactWithBudget: false`.
- Asset display: `Price not verified`.
- Final selection: suspicious candidate moves out of exact Best Matches.
- Positive boundary: `$12.99` wireless earbuds remain `verified`; fresh `$20` Soundcore earbuds remained exact.

**Regression coverage:**
- Exact plural RIDGID fixture title.
- Shop-vac, dash-camera, and wireless-earbud `$10` negatives.
- Asset display rewrite.
- Exact Best Match demotion.
- Real cheap wireless-earbud positive.
- Existing installment, refrigerator, conflicting-price, ordinary cheap product, and text-price budget tests.

**Verification:**
- Focused price/assets/scoring/requirements tests: 116/116.
- Typecheck: passed.
- Lint: 0 errors, 3 pre-existing warnings.
- Full suite: 665/665.
- Eval red-flag checks: clean.

**Fixture semantics:** `qa:replay` analyzes frozen result JSON and does not re-run current trust code. Preserve the old replay as historical proof, then separately reassess saved product objects when validating a trust-code change.

**Live calls:** Three approved calls: `shop vac`, `dash cam`, `wireless earbuds`. No `$10` exact result. Do not commit the generated live fixtures.

**New issue:** RR-062. Fresh dash-cam output verified VIOFO A229 Pro at `$19,999`. The `$322.99` source-upgrade sample was later confirmed to belong to BlackVue DR770X, not VIOFO.

**Status:** Phase 5C complete. Keep RR-002 regressions green; RR-062 remains isolated and unresolved.

---

## 2026-06-28 — RR-062 malformed-high-price diagnostic

**Issue diagnosed:** RR-062; no behavior fix.

**Saved-fixture stage proof:**
- VIOFO A229 Pro has no verified price in `candidatePool`, `postVerifyCandidates`, or `postFilterCandidates`.
- Asset enrichment adds a single Medium-confidence `retailer_page` offer of `19999` from the VIOFO A229 landing page.
- VIOFO has no source-upgrade trace. The fixture's `$322.99` source-upgrade sample belongs to BlackVue DR770X, so there is no VIOFO price merge conflict.

**Exact extraction proof:**
- The current cited page contains an unrelated A139 widget with `data-price="19999"`.
- Passing that page through current `buildMetadata` reproduces the exact 19,999 offer.
- `priceFromPageMetadata` scans structured price attributes across the full page.
- `priceFromValue` permits bare numerics, so a Shopify-style minor-unit integer is treated as dollars.
- The price is not checked for surrounding product identity before enrichment.

**Trust path:**
- One Medium-confidence retailer-page signal is sufficient for `verified`.
- Existing `plausibleProductPrice` and class floors protect against malformed low prices.
- They do not protect against a lone malformed high integer, missing minor-unit context, or unrelated same-page product metadata.

**Classification:** This is not RR-002, Serper, source upgrade, model-number parsing, stale evidence, or merge selection. It is unscoped structured-page extraction plus minor-unit misinterpretation, with a secondary high-outlier/product-affinity containment gap.

**Future regression requirements:**
- Reject or correctly normalize bare minor-unit `data-price` values that are not product-scoped.
- Reject unrelated product-widget prices on a target landing page.
- Preserve valid product-scoped structured metadata.
- Preserve legitimate high-end product prices; do not implement a blunt global maximum.
- Keep all RR-002 low-price, installment, text-price, and exact-budget tests green.

**Verification:** Focused price/assets/scoring/requirements/Serper tests 153/153; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 665/665; eval red-flag checks clean.

**Live calls:** No ReviewRadar search. One read-only retrieval of the cited VIOFO page was used to identify the raw field.

**Status:** RR-062 is Open with a confirmed root cause. Fix it in a separate narrow phase before Phase 5D.

---

## 2026-06-28 — RR-062 product-scoped price extraction

**Issue fixed:** RR-062.

**Fail-first reproduction:**
- Target `VIOFO A229 Pro` plus unrelated same-page `data-title="A139 ..."` / `data-price="19999"` produced a 19,999 retailer-page offer.
- A completely unscoped `data-price="19999"` did the same.

**Binding rules:**
- Select the schema.org `Product` whose identity agrees with the requested product instead of taking the first node.
- Page-level metadata, named price fields, and visible-price fallback require matching page identity.
- Element-level `data-price` fields require matching product identity in the same tag.
- Bare integer element prices are ignored unless a matching product element explicitly declares `cents`, `minor`, or an equivalent supported minor-unit marker.
- Do not assume every bare integer is cents.
- Standard schema.org `Offer.price` retains schema semantics.

**Required positives:**
- Matching page-level meta price.
- Matching element-level decimal/currency price.
- Explicitly marked minor-unit conversion with matching product identity.
- Matching product among multiple same-page JSON-LD products.
- Legitimate `$19,999` structured product price. There is no global upper-price cap.

**RR-002 regression boundary:** Suspicious-low shop-vac, dash-camera, wireless-earbud, installment, conflicting-price, text-price, and exact-selection tests remain green.

**Verification:** Product-assets 20/20; focused price/assets/scoring/requirements 123/123; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 672/672; eval red-flag checks clean.

**Saved fixture:** Immutable replay remains historical. Reassessing the saved pre-asset VIOFO candidate against current page extraction removes `19999`; a stray `$1` visible value is classified suspicious and exact-ineligible by RR-002.

**Live call:** One `dash cam` save/replay. VIOFO A229 Pro 2CH ranked exact #2 at `$349.99`, verified from matching JSON-LD. No malformed high verified price appeared.

**Status:** RR-062 Fixed. Keep these product-binding and explicit-minor-unit regressions green during later asset work.

---

## 2026-06-28 — Phase 5D product-card eligibility

**Issues fixed:** RR-007, RR-008, RR-009.

**Regression contract:**
- Generic category/family collections must not render as cards, including manufacturer `/products/...` paths whose title repeats the requested category.
- Support, advice, learning-center, customer-service, manual, and documentation pages may remain evidence, but never primary product cards.
- Documentation mirrors with model-looking titles, prices, or images remain evidence-only.
- Valid manufacturer and merchant product-detail pages must continue to pass.
- Requested category must be supplied to eligibility at Serper discovery and final citation filtering.

**Required examples:** Keep MHP, Daikin, Champion, Briggs, Best Buy collections, Bissell support, Best Buy advice, PetSmart learning, Shop-Vac customer service, `device.report`, and manual-library negatives green. Keep AeroPress and both supported Best Buy product URL shapes positive.

**Verification:** Fail-first 5 assertions; focused 78/78; broad focused 192/192; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 678/678; eval clean.

**Live calls:** Exactly three: `portable generator`, `shop vac`, `air purifier`. No full baseline. Generated fixtures remain untracked.

**Status:** RR-007/RR-008/RR-009 Fixed. Preserve RR-062 tests and do not use Phase 5D eligibility to alter ranking or citation-strength policy.

---

## 2026-06-28 — Phase 5E product-type and literal requirement truthfulness

**Issues fixed:** RR-017, RR-043, RR-055. **Issue reopened:** RR-007.

**Product-type regression contract:**
- Reject pressure-washer consumables/dishwashers, portable power stations, basketball wall art/accessories, backup cameras, and washer/dryer appliances for the corresponding product requests.
- Keep explicit valid hardware exact-capable and thin unknown products unverified rather than rejected.
- Evaluate exclusive complement shape from candidate identity/name, not incidental source snippets.
- Apply the same shared type verdict during Serper prefiltering and requirement revalidation.

**Literal requirement contract:**
- Literal provider/merchant identity can satisfy a generic feature even when comparative review prose is negative.
- Query-assigned category and generated explanation text cannot satisfy the feature.
- Identity text that explicitly negates the feature still fails.

**Required tests:** Keep the ZEP, Goal Zero/BioLite, basketball wall-art, YADA, GE washer/dryer, Generac comparative-portability, explicitly non-portable generator, sparse valid hoop, source-upgrade RR-058, RR-062 asset, RR-002 price, and Phase 5D eligibility regressions green.

**Verification:** Focused 83/83; broad safety matrix 314/314; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 684/684; eval clean.

**Live calls:** Four total: `shop vac`, `pressure washer` twice, and `portable generator`. ZEP disappeared after the final refinement; no power stations survived; multiple unrelated generators passed `Portable`. No broad baseline.

**Known boundary:** `Pressure Washers - Best Buy` still rendered exact #7, reopening RR-007. The Shop-Vac customer-service candidate remained absent from final cards but survived citation verification before requirement filtering.

---

## 2026-06-28 — RR-007 nested catalog-page regression cleanup

**Issue fixed:** RR-007.

**Regression contract:**
- Reject nested retailer catalog identifiers such as `abcat...c`, `cat...c`, and `pcmcat...c` regardless of category-path depth.
- Reject generic department/browse routes and strong faceted-listing parameters unless the URL is a known product-detail shape.
- Do not treat every retailer `/site/` path as product detail; preserve only explicit supported SKU/detail patterns.
- Keep valid retailer SKU pages and specific manufacturer product pages eligible.
- Category, collection, support, manual, and documentation pages may remain secondary evidence when safe but cannot become the primary product card.

**Required tests:** Keep the exact `Pressure Washers - Best Buy` URL negative at shared eligibility, Serper normalization, and final citation filtering. Keep unrelated department/browse/faceted negatives, Phase 5D collection/support/documentation negatives, Best Buy legacy/modern SKU positives, and Phase 5E type/requirement regressions green.

**Verification:** Fail-first 3 failures; focused card-path tests 89/89; broader Phase 5E safety matrix 177/177; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 686/686; eval clean.

**Live call:** Exactly one `pressure washer` save/replay. Six exact and one near product used specific product-detail primary URLs; the Best Buy catalog page was absent. A Craftsman family page remained secondary evidence only.

**Status:** RR-007 Fixed. Phase 5F remains unstarted and must stay limited to RR-022.

---

## 2026-06-28 — Phase 5F citation retention

**Issue fixed:** RR-022.

**Regression contract:**
- Verify unverified LLM product-page URLs per candidate even when unrelated provider URLs already exist.
- Do not re-fetch already verified Serper product URLs.
- Put an exactly verified, product-specific page first; editorial/category evidence may remain secondary only.
- Require explicit retailer detail shape, model path, or distinctive final-slug/name agreement.
- Unknown manufacturer pages need exact reachability verification before they can be primary.
- Never let unrelated global verification, a forged self-cite, generic family slug, category, support, manual, documentation, or unreachable URL rescue a card.

**Required examples:** Keep Oral-B plus editorial evidence, EGO versus same-host category substitution, specific Purina/Hill's paths, and normal retailer/manufacturer pages positive. Keep `/pro-plan/products/dog-food`, Home Depot categories, Phase 5D support/docs/collections, RR-007 nested catalogs, and unrelated verification negative.

**Verification:** Fail-first 3 failures; focused 69/69; broad safety matrix 282/282; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.

**Fixture semantics:** Frozen Phase 4 electric-toothbrush, dog-food, and wireless-earbud fixtures preserve historical drops but omit full pre-verification citation objects, so current retention cannot be replayed directly against them.

**Live calls:** Two total. `electric toothbrush` had 28 pool and 28 post-citation candidates with seven specific product-page exact cards. The initial `dog food` call still dropped 11 and exposed a generic Purina family card; the final path-binding guard covers specific Purina/Hill's positives and the family negative deterministically. The final refinement was not live-retested because the call cap was exhausted.

**Status:** RR-022 Fixed with a bounded live-proof caveat. RR-013 unchanged. Preserve this separation in Phase 5G.

---

## 2026-06-28 — Phase 5F dog-food live confirmation

**Purpose:** Confirm the final product-path binding code after the original Phase 5F live-call cap.

**Live call:** Exactly one `dog food` save/replay. The funnel was 23 pool, 16 after citation verification, 10 after requirements, and 7 exact.

**What was proved:** Six specific Purina/Hill's candidates survived citation verification. The generic Purina `/pro-plan/products/dog-food` family card did not recur. RR-022 is live-confirmed for dog food; the later requirement-stage removals are outside citation retention.

**New regression shape:** A Substack article titled `Is Costco (Kirkland) Dog Food Actually Good?` became exact #5. Generic cross-host `/p/` handling can classify an editorial post route as product detail when the title does not match existing review/article phrases. Track this under reopened RR-008, not RR-022.

**Verification:** Focused eligibility/citation/API tests 60/60; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 690/690; eval clean.

**Status:** RR-022 remains Fixed; RR-008 Needs Investigation. Before Phase 5G, prefer a narrow generalized regression test and eligibility fix that blocks article-question pages without invalidating genuine retailer/manufacturer `/p/` product routes.

---

## 2026-06-28 — RR-008 article-card cleanup

**Issue fixed:** RR-008.

**Regression contract:**
- Interrogative product-opinion titles such as `Is ... actually good?`, `Should you buy ...?`, `worth it`, and `our verdict` are evidence-only.
- Hosted publishing platforms remain evidence-only even when they use product-looking `/p/` paths.
- Genuine retailer and manufacturer `/p/` product pages remain eligible.
- The same decision must hold in shared eligibility, Serper normalization, and final citation filtering.
- Preserve RR-022 product-page retention and all RR-007/RR-009 support, listing, manual, and documentation negatives.

**Verification:** Fail-first 3 failures; focused 87/87; broad price/type/requirement/citation/source-upgrade matrix 192/192; typecheck passed; lint 0 errors with 3 existing warnings; full suite 694/694; eval clean.

**Live call:** Exactly one `dog food` save/replay. BK Pets and all Substack/editorial cards were absent. Purina/Hill's products survived citation verification. Seven exact products and zero near products remained.

**Adjacent findings:** Chewy `/brands/` family slugs with numeric IDs still pass the generic product-detail fallback (reopened RR-007). Same-brand citations can refer to different recipes (RR-063). Preserve the RR-008 fix while addressing those separately.

**Status:** RR-008 Fixed. Stop before Phase 5G pending explicit direction on RR-007/RR-063.

---

## 2026-06-29 - RR-007/RR-063 product-evidence identity safety

**Issues fixed:** RR-007 and RR-063.

**Regression contract:**
- Generic `/brand`, `/brands`, `/family`, `/category`, and `/collection` routes cannot become primary product-card URLs, including final slugs with numeric catalog IDs.
- Do not use the generated recommendation name as source evidence for an existing primary URL.
- Primary links need source-derived same-product identity; unsafe stale links must be cleared before page enrichment.
- Specific product-page citations with conflicting models, food recipes/proteins, flavors, life stages, recipe bases, supplement flavors, or cosmetic shades must be removed.
- A product-page citation with unknown same-product identity cannot support the card.
- Exact same-product pages and safe package-size variants remain valid.
- Generic family/editorial pages may remain secondary evidence but cannot become the card URL.
- Preserve RR-022 retention, RR-008 editorial blocking, RR-007/RR-009 page negatives, RR-002/RR-062 price trust, Phase 5E type/requirements, and source-upgrade identity safety.

**Required examples:** Keep Chewy and unrelated retailer family routes negative; specific Chewy `/dp/`, Walmart `/ip/`, retailer `/product/`, and manufacturer detail pages positive. Keep Purina Salmon versus Beef/Rice, Hill's Chicken versus Salmon, JustFoodForDogs Chicken/Rice versus Fish/Sweet Potato, Blue Buffalo Adult Chicken/Rice versus Puppy Chicken/Oatmeal, Iams Lamb/Rice versus Small/Toy, and Samsung QN90D versus QN85D negative. Keep exact products and package-size variants positive.

**Verification:** Fail-first 8 failures plus missing module; focused 84/84; broad safety 295/295; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 706/706; eval clean.

**Live call:** Exactly one `dog food` save/replay. Six exact and five near products used only specific primary product URLs. No family/category/editorial/support/manual/documentation card survived. The final post-live refinement was checked by passing the saved fixture through current citation filtering; the Blue Buffalo puppy/oatmeal and unrelated Iams citations were removed.

**Status:** RR-007 and RR-063 Fixed. RR-013 unchanged. Phase 5G remains unstarted.

---

## 2026-06-29 - Phase 5G product-specific citation-strength ranking

**Issue fixed:** RR-013.

**Regression contract:**
- Rank only already-eligible products; citation strength must never rescue a failed price, type, requirement, page, or identity gate.
- Use verified `citation_type` only when the citation is `same_product` under the shared evidence-identity classifier.
- One independent source scores `+6`; multiple independent sources and retailer corroboration cap at `+8`.
- Retailer-only support scores `+2` to `+4`; safe retailer-only products remain eligible and competitive.
- A true self-only citation set scores `-2`, not a hard rejection.
- Generic family/category/editorial evidence, wrong recipes/models, unknown specific-product pages, and untyped citations receive no Phase 5G credit.
- Typed citation-derived source-quality, expert-mention, and evidence-strength counts use the same product-specific subset.
- Preserve RR-022 retention, RR-007/RR-008/RR-063 page and identity safety, RR-002/RR-062 price trust, Phase 5E type/requirements, and source-upgrade identity.

**Required examples:** Keep the gas-grill and headphones retailer-versus-independent comparisons, generic dog-food editorial/family negatives, wrong Purina recipe negative, retailer-only positive, self-only bounded penalty, and Phase 5G OFF/ON switch green.

**A/B command:** `node scripts/ab-ranking.mjs --citation-strength`.

**A/B result:** Nexgrill `#1 -> #2`; Weber `#2 -> #1`; suspicious `$1` Weber stayed near-only. Only `REVIEW_RADAR_CITATION_STRENGTH` changed between runs.

**Verification:** Fail-first 3 failures; focused 57/57; broad safety 348/348; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 712/712; eval clean.

**Fixture result:** Gas-grill and cordless-drill snapshots have no independently supported challenger. Running-shoes reassessment credits exact product-specific Saucony/Kayano editorial evidence and withholds credit from generic or wrong-model citations.

**Live calls:** None. No broad baseline.

**Status:** RR-013 Fixed. Phase 5H remains unstarted.

---

## 2026-06-29 - Phase 5H final-selection diversity/form-factor quality

**Issues fixed:** RR-056, RR-059, RR-060. RR-014 was measurement-only and remains Needs Investigation.

**Regression contract:**
- Hard-collapse only strict exact-model duplicates: same canonical identity, exact normalized title, or same-brand shared strong model token.
- Preserve explicit different models (`M27Q`, `M27Q2`, `M27Q-P`), different sizes, distinct same-brand products, and distinct same-retailer products.
- Keep broad canonical/evidence-family matching separate from strict final-slot duplicate identity.
- Family concentration is a soft selection adjustment (`12` per prior member, cap `24`), never a hard brand/retailer cap or an eligibility rule.
- Unrequested niche form factors receive a bounded selection-only prior (`50` cap); explicitly requested or compatible niche forms receive no prior.
- Do not modify Phase 5G `citationStrengthScore` or any hard price, citation, page, product-type, requirement, or source-upgrade gate.
- Keep new trace fields present: `modelFamilyKey`, `familyRepeatCount`, `familyConcentrationPenalty`, `formFactorPenalty`, `adjustedSelectionScore`.

**Required examples:** Keep cross-retailer M27Q duplicate collapse, M27Q2/M27Q-P negatives, same-retailer distinct positives, Sonicare third-variant replacement, broad under-desk treadmill demotion, explicit under-desk positive, and Phase 5G citation scoring green.

**Fixture proof:** Gaming monitor collapses the second M27Q card; coffee maker moves the 14-cup mainstream product above AeroPress; treadmill moves Horizon 7.0 AT above the under-desk winner; cordless drill keeps distinct Milwaukee M18 kits. Five RR-014 benchmark fixtures stayed neutral at mean `3.0/7`.

**Verification:** Fail-first 3 failures with 2 controls green; focused/broad safety 303/303; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 724/724; eval clean; Phase 5G A/B unchanged.

**Live call:** Exactly one `electric toothbrush` save/replay. A fourth Sonicare received the capped family penalty and fell below the final seven; a distinct Oral-B product filled the slot.

**New safety issue:** RR-064. The same live run attached DiamondClean Smart 9300 price/rating/review/citation evidence to a DiamondClean 9000 target. Treat this as a Critical source-upgrade identity stop condition. Reproduce deterministically before editing; preserve RR-051/RR-053/RR-058 and valid exact-model attachment.

**Eligibility recurrence:** RR-007 and RR-008 reopened. An Oral-B twin-pack/category page, an ANSI blog, and two Electric Teeth comparisons remained `reliableEnoughForExact` below cutoff. They did not render, but future eligibility tests must assert these shapes never enter the exact-scored product-card pool.

**Status:** Phase 5H complete. Stop before Phase 5I pending explicit RR-064 direction, then address RR-007/RR-008 separately.

---

## 2026-06-30 - RR-064 source-upgrade conflicting-model safety

**Issue fixed:** RR-064.

**Regression contract:**
- Source-derived explicit model/series conflicts must reject before exact-model or family-overlap positives.
- `DiamondClean 9000` must reject `DiamondClean Smart 9300`, even when a Google Shopping `q=` parameter repeats the target query.
- Different alphabetic prefixes do not make conflicting series values safe when meaningful family identity is shared.
- Years, prices, measurement values, and package/count differences are not model-series conflicts.
- Query-derived snippets, search parameters, and generated fallback text remain unusable as identity evidence.
- Exact same-product offers across retailers and safe color/count variants remain attachable.
- Preserve RR-051, RR-053, RR-058, RR-063, RR-022, Phase 5G scoring, and Phase 5H selection regressions.

**Required examples:** Keep the DiamondClean 9000/9300 negative, Smart 1500/3000 negative, exact DiamondClean 9000 positive, same-model color/count positives, Whynter wine-refrigerator negative, HP-query-parameter negative, and valid source-title/merchant-path positives green.

**Verification:** Fail-first 1 RR-064 failure with 71 controls passing; focused broad safety 157/157; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 729/729; eval clean.

**Live call:** Exactly one `electric toothbrush` save/replay. Smart 9300 was rejected for DiamondClean 9000, then an explicit 9000 offer attached. The 2100 attempt rejected a 4100 candidate before attaching a 2100 offer. No broad baseline ran.

**Status:** RR-064 Fixed. RR-007/RR-008 remain Needs Investigation; address them separately before Phase 5I.

---

## 2026-06-30 - RR-007/RR-008 pre-final eligibility cleanup

**Issues fixed:** RR-007 and RR-008.

**Regression contract:**
- Paginated category/bundle titles cannot become products, including deep `/products/...` routes.
- Standards identifiers/documents, comparison/vs titles, and press-release announcement titles are evidence-only.
- Blog/news/press/journal/stories subdomains and comparison/standards/press-release paths are evidence-only before product-detail shortcuts.
- Product-looking digits, images, prices, and deep paths cannot override an evidence-page signal.
- Specific retailer/manufacturer product pages remain card-eligible.
- Safe editorial/category/comparison sources may remain secondary citations but cannot become a primary link, exact candidate, or product-specific ranking proof.
- Preserve RR-022 retention, RR-063/RR-064 identity, RR-013 ranking, RR-002/RR-062 price, Phase 5E type/requirements, and Phase 5H selection.

**Required examples:** Keep Oral-B twin-pack/category, ANSI standards, Electric Teeth comparison, and MultiVu announcement negatives; specific Oral-B/Sonicare positives; secondary comparison evidence; unrelated retailer categories and hosted editorial pages; and all named safety controls green.

**Verification:** Fail-first 4 failures with 152 controls passing; focused 157/157; broad named-regression safety 330/330; typecheck passed; lint 0 errors with 3 pre-existing warnings; full suite 735/735; eval clean.

**Fixture/live proof:** Current code removes the pre-fix MultiVu final #7 card. Exactly one post-fix `electric toothbrush` run returned five specific product cards and no unsafe page in the exact-scored trace. An Oral-B lineup page remained secondary with `unknown` product identity. RR-064 source-upgrade attachment stayed model-safe. No broad baseline ran.

**Status:** RR-007/RR-008 Fixed. Phase 5I remains unstarted pending explicit instruction.

---

## 2026-06-30 - Phase 5I reliability attempt stopped by RR-065

**Fail-first contract:**
- A model-qualified product with only one evidence pillar must not be considered source-complete when two of verified price, rating, and product-specific commerce citation are missing.
- A nonempty primary candidate set with zero safe attachments is distinct from success; any future fallback retry must remain bounded to one call.

**Safety finding:**
- A bounded retry after `primary_no_safe_attachment` exposed an unsafe identity pass for target `Amazon.com: RIDGID ... VAC1200`.
- Retailer/source prefixes must not become product brands.
- Same category plus a shared retailer token cannot replace source-derived target brand/model identity.
- A model-qualified target must reject candidates that lack its source-derived brand/model, even when product type agrees.
- Keep RR-051 query-text isolation, RR-053 URL-query isolation, RR-058 type agreement, RR-063 variant identity, and RR-064 explicit model-series conflict regressions green.

**Verification evidence:** Candidate implementation: focused source-upgrade/replay 92/92, typecheck pass, lint 0 errors with 3 existing warnings, full suite 738/738, eval clean. One live `shop vac` call then exposed RR-065; all candidate app/test changes were rolled back. The restored repository then passed typecheck, lint with the same 3 warnings, 735/735 tests, and eval.

**Live-call rule:** Do not spend another Phase 5I proof call until RR-065 is fixed deterministically. The untracked `shop-vac.json` records the stop-condition run but is not a committed fixture.

**Status:** RR-065 Open. RR-041/RR-042 remain Needs Investigation. Phase 5I behavior is not implemented; Phase 5J must not start.

---

## 2026-06-30 - RR-065 retailer/source identity safety

**Regression contract:**
- Strip only explicit leading source/retailer labels before target and source-title identity checks.
- Seller/retailer fields, URL hostnames, URL query parameters, and query-derived snippets cannot satisfy brand or model identity.
- Safe merchant product URL paths remain identity evidence.
- When a reliable target brand exists, source-derived candidate evidence must contain it before source upgrade attaches.
- `Amazon.com: RIDGID ... VAC1200` must reject Amazon Basics, SKIL, and other wrong-brand vacuums.
- A real Amazon-hosted RIDGID VAC1200 page remains valid when title/path carries RIDGID/model identity.
- Amazon Basics remains valid when it is the actual target brand.
- Preserve RR-051, RR-053, RR-058, RR-063, RR-064, RR-007/RR-008 deterministic coverage, RR-013, RR-022, RR-002/RR-062, Phase 5E, and Phase 5H.

**Brand-matching caveat:** Compact alias matching remains behavior-compatible for ranking stability, but an alias cannot be inferred from inside a longer token (`ASICS` inside `Basics`). Multiword brands must not duplicate one of their own words in compact source-upgrade queries.

**Verification:** Fail-first 74/75; focused identity 90/90; broad named safety 340/340; ranking baseline stable; typecheck passed; lint 0 errors with 3 existing warnings; full suite 744/744; eval clean.

**Live call:** Exactly one `shop vac` save/replay. RIDGID HD1400 safely attached exact evidence; no wrong-brand upgrade attached. The prior retailer-prefixed VAC1200 target did not recur. A Bosch `/ocs-c/` category collection became exact #3 and reopened RR-007.

**Status:** RR-065 Fixed. RR-007 Needs Investigation. RR-041/RR-042 unchanged. Do not retry Phase 5I until RR-007 is contained.

---

## 2026-06-30 - RR-007 opaque collection-page eligibility

**Regression contract:**
- Opaque manufacturer collection suffixes such as `ocs-c` are collection evidence, not product model identity.
- Product-range/family/lineup routes cannot become cards merely because they contain images, prices, product words, or catalog-like digits.
- Contextual family/series routes need concrete model identity in both title and trailing path before they can avoid the collection verdict.
- Collection/listing negatives run before product-detail, price/image, internal-record, and model-like shortcuts.
- Known retailer detail routes and specific manufacturer product pages remain card-eligible.
- Safe generic evidence may remain secondary through existing evidence paths, but cannot become a primary link or exact product proof.
- Preserve RR-008, RR-013, RR-022, RR-063, RR-064, RR-065, RR-002, RR-062, Phase 5E, and Phase 5H regressions.

**Required examples:** Keep the exact Bosch `/wet-dry-extractors-2549705-ocs-c/` negative, an unrelated opaque product-range negative, a model-specific Bosch positive, known retailer positives, and final citation-filter rejection green.

**Verification:** Fail-first 59/61; focused final 61/61; broad named safety 308/308; typecheck passed; lint 0 errors with 3 existing warnings; full suite 747/747; eval clean.

**Fixture/live proof:** Frozen fixture replay remains historical. Current-code reassessment changes the Bosch record to `listing_or_search`. One fresh `shop vac` call returned only specific product-page final URLs and no collection/listing/family card.

**Status:** RR-007 Fixed. RR-041/RR-042 remain Needs Investigation. Phase 5I/5J were not started.

---

## 2026-06-30 - Phase 5I retry safety memory / RR-066

**Fail-first contract:**
- A reliable model-qualified product missing verified price and same-product commerce evidence must not be suppressed solely because it has one owner rating.
- A nonempty primary result set whose candidates all fail safe identity must not permanently suppress the existing single bounded fallback.

**New safety contract:**
- A target with a reliable strong model such as `WD4522` cannot accept source-upgrade evidence that proves only the brand and product type.
- Source-derived candidate title, safe URL path, or product metadata must carry the target model or an equally strong exact product identifier.
- An exact model-bearing candidate whose provider title omits the brand should remain eligible when no conflicting brand or product evidence exists.
- RR-065 and RR-066 are separate: RR-065 excludes retailer/source provenance; RR-066 closes the same-brand/model-omission path.

**Verification evidence:** The candidate Phase 5I implementation passed focused tests 113/113, a broad named safety matrix 346/346, typecheck, lint with 0 errors and 3 existing warnings, 751/751 full tests, and eval. The live run exposed a deterministic coverage gap. After rollback, the restored repository passed typecheck, lint with the same warnings, 747/747 tests, and eval.

**Live-call rule:** The only approved `shop vac` call was used. It safely upgraded Stanley SL18115 and Armor All VOM205P, but unsafely attached a different 10-gallon RIDGID vacuum to the 4.5-gallon WD4522 target. Do not spend another Phase 5I live call until RR-066 is fixed deterministically.

**Status:** RR-066 Open/Critical. RR-041/RR-042 remain Needs Investigation. The final repository contains no Phase 5I retry behavior; Phase 5J must not start.

---

## 2026-06-30 - RR-066 model-qualified identity safety

**Regression contract:**
- When the target has a strong model, source-upgrade evidence must contain the exact normalized target model in source-derived title, safe path, snippet, or metadata.
- Same brand, product type, size, capacity, and broad family wording cannot replace missing model proof.
- Exact model evidence may omit the provider brand only when no explicit conflicting brand/product signal exists.
- Explicit conflicting brands and models remain hard rejections.
- Normalize punctuation for model equivalence (`E-325`/`E325`, `RPD-411WG`/`RPD411WG`).
- Query-derived snippets, retailer prefixes, seller fields, URL hosts, and URL query parameters remain excluded.
- Non-model-qualified family behavior remains unchanged.

**Required examples:** Keep the live-shaped WD4522 versus different 10-gallon RIDGID negative, same-capacity/no-model negative, exact brandless WD4522 positive, conflicting-brand WD4522 negative, Makita XFD131 same-brand/no-model negative, safe color/count variant positives, merchant-path identity, measurement controls, and RR-063/RR-064/RR-065 regressions green.

**Verification:** Fail-first 80/84; focused final 84/84; broad named safety 304/304; typecheck passed; lint 0 errors with 3 existing warnings; full suite 752/752; eval clean.

**Live call:** Exactly one `shop vac` save/replay. RIDGID HD0900 rejected nearby HD09001, HD0919, and HD1900 offers. Exact Armor All VOM205P evidence attached price, rating, review count, and citation. No unsafe evidence or non-product page attached. WD4522 did not recur.

**Status:** RR-066 Fixed. RR-041/RR-042 remain Needs Investigation. Do not retry Phase 5I until explicitly instructed; preserve this model-proof contract.

---

## 2026-06-30 - Phase 5I trigger/fallback reliability

**Issues fixed:** RR-041 and RR-042.

**Trigger regression contract:**
- Evaluate verified price, owner rating, and identity-safe product-specific commerce evidence as separate evidence pillars.
- A model-qualified, requirement-passing candidate triggers only when at least two pillars are missing.
- A lone price, rating, or generic/weak citation cannot suppress upgrade when two important pillars are absent.
- A candidate with at least two safe pillars skips unnecessary upgrade.
- Commerce evidence counts only when it is independent, source tier 1/2, and classified `same_product`.
- Failed requirements and weak model identity remain hard skips.
- Keep the maximum selected candidates at three and prioritize the most missing pillars without changing candidate membership.

**Fallback regression contract:**
- Preserve the one fallback after an empty primary search.
- Permit the same one fallback after a nonempty primary set has zero identity matches.
- Do not fall back after an identity match, including `no_attachable_fields`.
- Never perform more than one fallback or reuse the primary query.
- Apply the identical RR-063/RR-064/RR-065/RR-066 identity gate to primary and fallback evidence.
- Query text, URL query parameters, source/retailer prefixes, seller/host metadata, generic pages, wrong brands, nearby models, and same-brand wrong models cannot donate identity or commerce fields.

**Trace contract:** Keep debug-only `sourceUpgradeDecisions`, `missingEvidence`, `triggerReason`, stage-tagged candidate samples, `primaryOutcome`, `fallbackReason`, and `fallbackOutcome`. Old fixtures without these fields must replay, and normal API results must not expose them.

**Verification:** Fail-first 110/121 with only 11 intended failures; focused final 121/121; focused source-quality 90/90; broad named safety 342/342; typecheck passed; lint 0 errors with 3 existing warnings; full suite 760/760; eval clean.

**Live call:** Exactly one `shop vac` save/replay. Exact RIDGID WD1060 and DEWALT DXV09P evidence attached safely. HART VOC1212PW used the zero-primary fallback and attached nothing. The new post-identity-rejection fallback is proven deterministically but did not occur in the one live run.

**New issue:** RR-067. Candidate metadata can label horsepower `HP` as a conflicting brand and reject an exact HART/model offer. Preserve this safe rejection until a narrow measurement-aware candidate-brand fix is tested against genuine HP and explicit-brand conflicts.

**Status:** RR-041/RR-042 Fixed. RR-067 Open/Medium. Phase 5J not started.

---

## 2026-07-01 - RR-067 candidate horsepower/HP brand identity

**Issue fixed:** RR-067.

**Regression contract:**
- Provider `brand: "HP"` is ambiguous when safe source evidence uses HP as horsepower or explicitly supports a different product brand.
- Resolve candidate brand from source title, safe URL path, source-derived snippets, colors, and key specs without using seller, retailer, host, URL query, query-derived text, generated card text, or the provider brand field itself.
- Numeric, peak/max/rated, motor, engine, pump, compressor, suction, and HP-motor syntax cannot establish Hewlett-Packard brand identity.
- Exact HART VOC1212PW and unrelated RIDGID, DEWALT, Milwaukee, Makita, Stanley, Armor All, and Amazon Basics model evidence must not be rejected by polluted HP metadata.
- Genuine HP/Hewlett-Packard laptop, desktop, PC, monitor, LaserJet, OfficeJet, DeskJet, Pavilion, Envy, Omen, and Spectre evidence remains valid.
- Source-derived conflicting brands remain hard rejections even when provider metadata says HP.
- Preserve RR-041/RR-042 trigger/fallback behavior and RR-063/RR-064/RR-065/RR-066 identity safety.

**Verification:** Fail-first 95/97 with only two intended RR-067 failures; focused final 98/98; broad named safety 346/346; typecheck passed; lint 0 errors with 3 existing warnings; full suite 764/764; eval clean.

**Live call:** Exactly one `shop vac` save/replay. HART did not recur. RIDGID WD3050 source evidence containing `3.5-Peak HP` attached exact price/rating/review/citation data; WD3050A, another-size RIDGID vacuum, and an unrelated blower remained rejected. No second live call ran.

**Status:** RR-067 Fixed. Phase 5J not started.

---

## 2026-07-01 - Phase 5J image and fallback-debug contracts

**Issues fixed:** RR-061 and RR-054.

**Product-image regression contract:**
- Reject non-image/page URLs, image-directory endpoints, SVG/UI/logo/icon/favicon/placeholder/tracking assets, and generic category/navigation/editorial artwork.
- Do not bind JSON-LD, social metadata, existing image fields, generated names, query text, seller labels, hosts, or URL query parameters to a product without source-derived same-product context.
- Product-page metadata requires matching page identity; JSON-LD images require a matching Product name.
- Source-upgrade images use the shared resolver only after the existing same-product evidence gate.
- Preserve same-product retailer/manufacturer images, Google Shopping thumbnails, JPEG/PNG/WebP assets, and opaque hashed CDN product images when source context is verified.

**Fallback-debug regression contract:**
- Every recommendation-producing Serper fallback exposes the stages it actually ran when debug mode is enabled.
- Preserve search-plan context, candidate funnel/snapshots, final-selection trace, empty source-upgrade traces, and explicit reasons for citation/source-upgrade stages bypassed by fallback.
- Do not fabricate diagnostics for stages that did not run.
- Never expose these fields in normal non-debug responses or change recommendation content.
- Old fixtures without `fallbackTrace` remain replay-compatible.

**Verification:** Fail-first focused 35/41 with six intended failures; focused final 174/174; broad named safety 417/417; typecheck passed; lint 0 errors with 3 existing warnings; full suite 772/772; eval clean.

**Live call:** Exactly one `shop vac` save/replay. Seven final image URLs returned image bodies; no page, logo, placeholder, category, article, support, or HTML page was used as an image. The request used the normal path, so RR-054 remains live-unconfirmed and deterministically proven.

**New issue:** RR-068 (High/Open). Four Bissell CrossWave household wet/dry floor cleaners reached exact shop-vac results. This is a product-type coverage regression outside Phase 5J; no fix was attempted.

**Status:** RR-054/RR-061 Fixed. RR-068 Open. Phase 6 not started.

---

## 2026-07-01 - RR-068 shop-vac product-type contract

**Issue fixed:** RR-068.

**Regression contract:**
- For shop-vac, wet-dry-vac, utility-vac, garage-vac, workshop-vac, contractor-vac, and jobsite-vac intent, household floor washers are wrong product type.
- Strong household signals include floor washer/cleaner, hard-floor cleaner, vacuum or wet/dry mop, carpet cleaner, spot cleaner, upholstery cleaner, multi-surface household cleaner, and representative cross-brand floor-cleaner families.
- Household subtype identity overrides incidental `wet dry vacuum` wording.
- Preserve real wet/dry utility vacuums across RIDGID, Shop-Vac, Vacmaster, Craftsman, DEWALT, Stanley, Armor All, Milwaukee, HART, and unrelated brands.
- Explicit household floor-cleaner searches must continue accepting those products.
- Discovery type evidence must exclude assigned category, retailer/seller labels, hosts, URL query parameters, and query-derived fallback snippets.
- The shared verdict must reject at discovery and revalidation; do not use ranking or final-selection changes.

**Verification:** Fail-first 118/124 with six intended failures; focused final 125/125; broad named safety 455/455; typecheck passed; lint 0 errors with 3 existing warnings; full suite 781/781; eval clean.

**Fixture reassessment:** The saved Phase 5J `shop vac` fixture loses all four CrossWave exact cards and retains RIDGID HD0900 plus two Vacmaster utility vacuums as exact. CrossWave does not move to near.

**Live call:** Exactly one `shop vac` save/replay. Two exact and one near Armor All utility wet/dry vacuum remained. No household floor cleaner survived. Exact AA255W evidence attached rating, review count, and citation safely. The normal path ran, so RR-054 fallback traces remain deterministic-only. Two product images were visually verified; one context-matched image host returned HTTP 403 to the diagnostic fetch and was not visually inspectable.

**Status:** RR-068 Fixed. Phase 6 not started. Phase 5 closeout remains next only after explicit instruction.

---

## 2026-07-01 - Phase 5 closeout regression baseline

**Closeout baseline:**
- Focused high-risk matrix: 448/448 across 39 suites.
- Full suite: 781/781 across 117 suites.
- Typecheck: pass.
- Lint: 0 errors, 3 pre-existing warnings.
- Eval pipeline: no red-flag issues.

**Covered protections:** RR-007/RR-008, RR-041/RR-042, RR-054, RR-061, RR-063 through RR-068, RR-002/RR-062, RR-013, RR-022, Phase 5E product-type/requirement behavior, and Phase 5H final-selection behavior.

**Fixture guidance:**
- Saved live fixtures are historical provider snapshots, not automatic current-code executions.
- Use replay to verify trace compatibility and inspect saved funnel evidence.
- When a fixture predates a later identity or filtering fix, run the saved result through the relevant current-code validator before drawing a current-status conclusion.
- The current `shop vac` fixture is post-RR-068 and contains no household floor cleaner.
- The `dog food`, `electric toothbrush`, `air purifier`, and `dash cam` fixtures include useful historical traces but predate some later fields or guards.
- RR-054 fresh fallback diagnostics remain deterministic-only until an approved live request actually enters fallback.

**Cost rule:** No live search ran for closeout. Do not refresh fixtures or run a broad baseline merely to replace historical snapshots; require an approved measurement question and budget.

**Status:** Phase 5 closed. RR-014, RR-015, RR-037, and RR-045 remain intentional measurement/provider-variance investigations for later planning. Phase 6 has not started.

---

## 2026-07-01 - Phase 6A reconciled measurement contract

**Phase 6 authority:** `docs/phase-6-reliability-gauntlet-plan.md` is the sole source of truth for Phase 6 scope, sequence, budgets, gates, evidence rules, and exit criteria. This test-memory section records operational lessons and cannot override the master plan.

**Evidence labels:**
- M1: deterministic tests and fixed-candidate controls.
- M2: a named current-code validator/classifier applied to frozen fixture input.
- M3: historical fixture/replay output.
- M4: approved fresh live behavior.

**Rubric contract:**
- Product-safety tolerance is absolute at zero failures and is never calibrated from baseline performance.
- Quality uses the v0.1-draft deduction model: High −15, Medium −8, ranking anchor 3 −4, one deduction per metric, floor 0.
- `NotApplicable` means the metric does not apply to the query shape; no deduction or completeness penalty.
- `NotScored` means applicable evidence is missing, stale, or insufficient; no deduction, but completeness is reduced.
- Applicable unscored High-impact metrics cap the non-safety grade at B.
- Quality deductions, floors, and significance rules remain provisional until the post-6D/pre-6E v1.0 freeze.
- Leader-quality targets must be approved at that freeze before baseline results are inspected.

**Cost boundary:** Phase 6A and its reconciliation used zero live calls. Phase 6B and 6C are also zero-live phases. Do not run the six-call Phase 6D pilot without explicit approval.

**Status:** Phase 6A complete and reconciled. Phase 6B regression wall is next only after explicit instruction.

---

## 2026-07-02 - Phase 6D stopped-pilot measurement guidance

**Budget and safety:** Four of six approved M4 searches ran, using 150 observed
Serper calls. The remaining two calls were not spent after Critical RR-069
triggered the absolute safety stop. A live measurement budget is a ceiling,
not a target to finish after unsafe evidence appears.

**Fixture handling:** Repeated calls overwrite query-slug fixtures. Copy the
historical anchor first, move every fresh result to a unique untracked Tier A
path immediately, inspect it, update the ledger, and restore the historical
anchor path when the run ends.

**Offline analyzer:** `scripts/qualityConsistencyHarness.mjs --fixtures ...`
computes pairwise raw-provider, query-plan, candidate-pool, and final-set
Jaccard; three-run intersection/union when available; shared-product Spearman
rank correlation; exact/near and funnel-stage ranges; latency; observed Serper
calls; and RIDGID stage presence. The mode reads fixtures only and makes no
live calls. The script's default mode remains its historical live harness and
still requires separate approval.

**Interpretation:** Stable exact counts do not imply stable products. In the
partial pilot, both query pairs kept the same exact count while final-set
Jaccard was zero. Raw-provider and query-plan overlap should be reported
separately; current traces do not support a causal percentage split.

**Model configuration:** Relevant OpenAI Responses API calls do not explicitly
set temperature or seed. Record this as unpinned model-side configuration,
without claiming it alone caused the observed variance.

**Freeze rule:** A stopped two-run sample cannot freeze a variance threshold,
rubric v1.0, leader method, or snapshots. Fix RR-069 deterministically and
obtain explicit approval before resuming Phase 6D.

---

## 2026-07-02 - RR-069 distinguishing-submodel identity guard

**Fail-first:** `tests/sourceQualityUpgrade.test.mjs` passed 97/100. The only
failures were generic base-series evidence attaching to specific robot-vacuum,
monitor, and power-tool-kit models.

**Rule:** When a source-upgrade target carries a base model plus distinguishing
submodel, source-derived evidence must carry the distinguishing identity before
donating product-specific commerce fields. Normalize punctuation, spacing, and
Plus forms. For multiple explicit identifiers, prefer established compact or
digit-dash model shapes over descriptive number phrases.

**Required controls:**
- reject generic series/plain/family/lineup evidence;
- reject nearby suffixes such as S5+ or X50+ for X5+;
- preserve exact `Q10 X5+`, `Q10 X5 Plus`, and `Q10X5+`;
- preserve brandless exact WD4522 evidence with no conflicting brand;
- preserve exact hyphenated models such as RPD-411WG;
- keep query, host, seller, URL query, and generated text excluded from identity.

**Verification:** Focused source-quality 100/100; broad identity/trust matrix
439/439 across 32 suites; full suite 786/786 across 117 suites; typecheck and
eval pass; lint 0 errors with 3 existing warnings.

**Evidence boundary:** Replaying the untracked Phase 6D B2 fixture remains M4
historical evidence and still prints the original unsafe attachment. The
distilled deterministic reproduction is M1 current-code proof. No live call
ran, and Phase 6D remains paused.

---

## 2026-07-02 - Phase 6D clean-restart image-safety stop

**Restart boundary:** The original four Phase 6D calls are aborted pre-fix
RR-069 evidence. Never pool them with a post-fix sample. Taylor approved six
new calls; the restart stopped after A1 and its remaining five calls are
blocked.

**Live finding:** A fresh `shop vac` response assigned the same Amazon
`yoda/flyout_72dpi` navigation PNG to two different final products. Both image
records had High confidence and `retailer_page` provenance. A direct-image
extension and a matching product-page source are therefore not sufficient to
establish product-image relevance.

**Safety rule:** Repeated cross-product image identity and known generic
site/navigation asset shapes must be treated as product-image warning signals.
Any later fix must preserve opaque hashed product CDNs and should be proven
across unrelated hosts/products rather than adding an Amazon-only filename
exception.

**Measurement consequence:** One clean run cannot estimate pairwise Jaccard,
shared rank correlation, stage-loss variance, significance, sample size, or
provider/model attribution. Keep RR-015 and RR-037 Needs Investigation.
Rubric v1.0 remains unfrozen.

**Cost:** 1/6 clean-restart searches and 37 observed Serper calls. The Tier A
fixture is untracked and must not be committed. No additional live call is
permitted after this safety stop without a new approval.

---

## 2026-07-02 - Reopened RR-061 retailer navigation-image guard

**Fail-first:** Image/asset tests passed 31/35. The four intended failures
covered the exact Amazon flyout URL, generalized flyout/menu/layout assets,
retailer/domain identity pollution, and enrichment fallback to no image.

**Rule:** Trusted retailer-page provenance does not make an image product
specific. Reject structural site-artwork terms before confidence scoring.
Product-image identity must exclude source/retailer/domain words and must not
use the image hostname. URL reuse across products is a diagnostic signal, not
an automatic rejection, because legitimate variants may share imagery.

**Positive controls:** Preserve verified same-product Amazon imagery, opaque
hashed CDN images, Google Shopping thumbnails, and source-upgrade images that
pass existing same-product identity.

**Verification:** Focused image/asset/source-upgrade tests 135/135; broad trust
matrix 376/376; full suite 791/791; typecheck/eval pass; lint 0 errors with 3
existing warnings.

**Live boundary:** No live call ran. The fixture remains historical M4 evidence
and the distilled tests are current M1 proof. Phase 6D remains stopped and
requires a fresh six-call approval for any later restart.

---

## 2026-07-02 - Fresh Phase 6D restart stopped on wrong-model imagery

**Sample boundary:** Commit `baeb6a0`, A1/B1 only. Both earlier partial pilots
remain excluded. Never pool any of the three samples.

**Safety finding:** A correct product page/title does not prove every image on
that page belongs to the target. B1 rendered a Saros Z70 image on a Q5 Max+
card because page-context confidence outweighed explicit conflicting image-path
model identity. Reopen RR-061; do not weaken valid hashed-image support.

**Secondary finding:** Source-upgrade query construction trusted unrelated
`Bose` Serper brand metadata for ILIFE A12 Pro. No evidence attached. Track as
RR-070 and reproduce deterministically before changing behavior.

**Variance boundary:** One observation per query yields no pairwise metrics.
Harness three-run intersection/union values for one-run groups are tautologies,
not stability evidence. Report empty pair arrays and unavailable inference.

**Cost and checks:** 2/6 live searches, 75 observed Serper queries; four calls
blocked. Typecheck/eval pass, lint 0 errors/3 warnings, full suite 791/791.

---

## 2026-07-10 - Phase A request-scoped search-observability ledger

**Scope:** Debug-only instrumentation inside `debug.stageFunnel.searchLedger`.
No live provider calls and no search/ranking/trust behavior changes.

**Stable test entry points:**

- `tests/searchObservabilityLedger.test.mjs` mocks Serper `fetch` and covers retry/fallback attempt linkage, cache hit/miss dual hooks, query dedupe/cull/truncation/recategorization, bounded result digests, candidate provenance unions and merge IDs, exact first-loss assignment, post-discovery search origins, reconciliation, raw AI planning JSON, privacy canaries, disabled-debug behavior, flags, and commit header fields.
- `tests/recommendationApiContract.test.mjs` proves the ledger is emitted inside the existing stage funnel only for debug requests.
- `tests/replayFixtures.test.mjs` proves saved ledgers are preserved and summarized without Serper/OpenAI calls and that older fixtures remain compatible.
- `scripts/benchmark-search-ledger.mjs` compares representative plan assembly/serialization with the ledger disabled and enabled using alternating order and trimmed means. Default result: 0.757 ms/request overhead, 0.0009% projected against 84 seconds, within the under-200-ms/under-2% budget.

**Trace fields to preserve:**

- `header`: request/commit, `REVIEW_RADAR_*` flags, models, initial cache-empty state.
- `rawAi.strategy` and `rawAi.gapCheck`: strict-schema JSON only; never prompts.
- `planAssembly`: stable query ID/origin, original/normalized/outbound query, status, cap/cull/merge target, events.
- `dispatch.cacheLookups`, `.attempts`, and `.reconciliation`: sanitized bodies and at most 10 result digests per attempt; never keys or headers.
- `candidateLineage`: multi-query provenance, merge/collapse target, stage results, final outcome/score/selection, one first loss.
- `contributions.byQuery` and `.byOrigin`: zero-contribution applies only to product discovery.

**Regression rule:** Client-shared plan modules accept an optional observer and must not import the server-only `AsyncLocalStorage` implementation. `npm run build` protects this boundary.

**Verification:** 802/802 tests across 118 suites; typecheck/build/eval pass; lint 0 errors/3 existing warnings. Live calls: 0.

---

## 2026-07-10 - Phase R1 RR-061 wrong-model image guard

**Scope:** `lib/productImageResolver.ts` only. Deterministic; zero live calls.

**Guard:** `conflictingModelIdentityReason(url, context)` runs inside `validateProductImageCandidate` after the generic-asset checks. It tokenizes the final image filename (extension stripped) into model-shaped tokens — 2–8 chars containing both letters and digits — and rejects with `image filename identifies a different model (...)` when the product identity (name+brand+modelNumber) has at least one model-shaped token and none of the filename tokens appear in the normalized concatenated product identity.

**Exclusion list (`MODEL_TOKEN_EXCLUSIONS`):** version markers (`v2`), dimension pairs (`800x600`), retina (`2x`/`x2`), `w`/`h` size markers, Amazon/CDN image modifiers (`sl1500`, `sx300`, ...), file/frame counters (`img2`, `thumb1`, ...), and digit+unit measurements (`72dpi`, `1080p`, `16gallon`, ...). Tokens longer than 8 chars are treated as opaque hashes (ASINs, CDN ids) and never veto.

**Known fail-safe misses (accepted):** hyphen-split product models ("E-330" tokenizes to `e`+`330`, neither qualifies, guard inert) and `v`-series models (Dyson V15: `v15` excluded as a version marker on both sides, guard inert). Both directions fail safe — the image is kept, never wrongly rejected.

**Stable test entry points:** `tests/productImageResolver.test.mjs` describe block "RR-061 wrong-model image identity (Phase R1)": two fail-first vetoes (verified-page Saros Z70 on Q5 Max+; cross-product eufy L60 on Roomba j7+) and three preservation cases (same-model filename, Amazon modifier/retina/dimension tokens, model-less product). 19/19 focused; 807/807 full suite across 119 suites.

**Canary note:** the ledger privacy canary requested by roadmap R1 already existed in `tests/searchObservabilityLedger.test.mjs` (snapshot JSON asserted free of `CANARY_SERPER_KEY_MUST_NOT_APPEAR`); it was verified, not duplicated.

---

## 2026-07-10 - Phase R2 live-ledger safety stop

**Sample boundary:** Commit `0f44ae7`; A1-A3 `shop vac` and constrained B1 only. B2/B3 were not run. The four new fixtures are untracked Tier A evidence and must never be pooled with earlier stopped Phase 6D windows.

**Reconciliation invariant:** Across the four runs, 386 logical cache lookups = 69 hits + 317 misses, and the 317 misses = 317 physical attempts because retries/fallbacks were both zero. Each per-run ledger balanced and recorded an empty initial cache. Treat this equation as the primary completeness check for later ledger samples.

**RR-061 regression shape:** The R1 model-conflict guard only extracts 2-8 character tokens containing both letters and digits. Filenames containing alphabetic foreign families (`QRevo`, `Curv`, `Edge`, `Saros`) can therefore survive on Q10 X5+/Q10 S5+/Q7 Max+ products. Verified page context must not outweigh those explicit foreign-family names.

**Eligibility/type failures:** A Shop-Vac customer-service page and a Pocketables day-five article survived as `buyable_product` cards (RR-078). A Walmart self-empty base-station accessory survived as a robot-vacuum near match (RR-079). These candidates were not merely ranking misses; they passed eligibility/type boundaries.

**Planner evidence:** No temperature or seed is configured for either discovery-strategy OpenAI call. All A strategy and gap raw JSON outputs varied. A mean Jaccards were strategy query 0, expected product 0.1434, planned discovery 0.3909, dispatched 0.3896, provider common results 0.5820, pool 0.1051, final 0.0333. Provider variation matters, but model/planner variation is greater and downstream stages amplify it.

**Cull/contribution evidence:** Editorial seed queries returned 588 raw results and zero unique/final candidates. AI-gap queries were the only consistent final contributor (30 unique; 8 exact; 8 near). Constrained B allocated four broad/diluted deterministic shopping queries and only one self-emptying query before later AI-gap recovery. Preserve these facts for R3/R4/R6 fail-first tests.

**Carryovers:** RR-037 stays Needs Investigation because RIDGID was present in all A runs but product identities and counts varied. RR-045 stays Needs Investigation because two broad Tapo editorial queries returned raw results that normalization discarded; an exact RV30C Plus query was never sent.

**Freeze boundary:** The R2/Phase 6D exit gate failed. Rubric remains `v0.1-draft`; no leader snapshot, significance rule, or baseline North-Star value is approved. Phase 6E remains unauthorized.

---

## 2026-07-11 - Phase R3 pinned discovery planning

**Contract:** OpenAI Responses supports `temperature` in `[0,2]`; lower values are described as more focused/deterministic. The documented GPT-5.4 mini snapshot is `gpt-5.4-mini-2026-03-17`. Responses exposes no `seed` parameter.

**Flag behavior:** `REVIEW_RADAR_PINNED_PLANNING=on` affects only the two calls in `lib/discoveryStrategy.ts`. For the default `gpt-5.4-mini` helper alias, requests use the dated snapshot and `temperature: 0`. The resolver is idempotent for the dated snapshot. Custom helper models receive neither rewriting nor temperature injection. Flag-off requests retain the prior shape. Final synthesis is outside the flag.

**Stable tests:** `tests/discoveryStrategy.test.mjs` captures both request objects and proves on/off behavior plus custom-model preservation. `tests/recommendationApiContract.test.mjs` proves the resolved helper snapshot reaches the ledger while final synthesis stays unchanged. `tests/searchObservabilityLedger.test.mjs` proves the new flag appears in the debug environment snapshot. Fail-first 8/9; focused final 38/38; full 810/810.

**Measurement boundary:** Snapshot pinning prevents alias drift and temperature zero reduces sampling variance, but neither guarantees identical output. R3 ran zero live calls, so RR-015 remains Needs Investigation. Do not claim a Jaccard improvement until a later approved ledger sample separates plan, provider, pool, and final overlap.

**Safety boundary:** `.env.local` remains unchanged and the flag defaults off. No search allocation, prompt, schema, final synthesis, candidate, rank, requirement, eligibility, image, identity, citation, price, or product-type behavior changed.

---

## 2026-07-11 - RR-061 page-image provenance and split-family identity

**Runtime attribution rule:** `ProductFieldEvidence.sourceType: retailer_page` does not distinguish `existing` from `page_image`. Establish the winning internal source from the candidate construction and confidence path, or capture `ProductImageResolution.source`; do not infer candidate-level OG/JSON-LD presence from the serialized field.

**Root cause:** `extractProductImageCandidatesFromHtml()` copied page-wide verification to every `<img>`, allowing unrelated artwork to pass at Medium without image identity or High when template attributes echoed the target. R1's filename guard only recognized one token containing both letters and digits, missing split `Saros_20` and repeated pure-word `QRevo` family claims.

**Stable rule:** Metadata may inherit verified page identity because it is page-bound. Page `<img>` candidates may not; their own attributes/path must strongly match the target. Filename identity also includes adjacent alphabetic-family/numeric pairs and repeated non-generic alphabetic family tokens. Exclude generic image/color/view/package words plus source, brand/category, modifier, dimension, unit, version, file-counter, and hash tokens.

**False-positive boundary:** If a filename pairs a target family word with a number but the target does not assert a numbered version of that family, treat the number as potentially a size (`ipad_11`). If the target asserts a different numbered family (`Saros 10` vs `Saros_20`), reject it.

**Stable tests:** `tests/productImageResolver.test.mjs`, blocks `RR-061 wrong-model image identity (Phase R1)` and `RR-061 page-image provenance and split family identity`. Focused 24/24; full 815/815 across 120 suites. Matching Product JSON-LD, image-level matches, same-model/neutral filenames, opaque assets, Google thumbnails, Amazon modifiers, and navigation guards are positive controls.

**Measurement boundary:** Zero live calls. The repair closes the deterministic captured paths but does not prove retailer markup is unchanged or improve a measured R2 North-Star value. RR-078/RR-079 remain blockers before a later approved live window.

---

## 2026-07-11 - RR-061 round 4 / RR-080 adversarial image filenames

**Do not equate captured-case closure with generalized closure.** After the first post-R3 repair passed all captured controls, adversarial filenames found both directions of error: neutral counters were rejected and a sibling model was accepted.

**RR-080 neutral-counter rule:** Neutral shot/scene/studio/room/floor/carpet/swatch/style/grid/tile/display words are explicit non-model vocabulary. Do not globally discard one-digit split claims: real families such as Nintendo Switch 2 need to reject sibling imagery. `swatch-red-2-swatch-blue.jpg` also proves numeric handling alone is insufficient.

**RR-061 mixed-family rule:** For target identity `family + mixedModel` (for example, Saros Z70), direct adjacency asserts the family. An image `family + differentNumber` is foreign. Preserve the early compatible-token escape so an image naming the target mixed model remains valid.

**Stable tests:** `tests/productImageResolver.test.mjs`, RR-061 page-image/split-family block. Fail-first 24/26; final 27/27. Full suite 818/818 across 120 suites. Do not add a blanket year exclusion without both a neutral campaign-year reproduction and a conflicting model-year preservation control.

**Boundary:** This micro-phase changes only image filename identity. Eligibility/type RR-078/RR-079 remains separate. Zero live calls; latest North Stars remain R2.

## 2026-07-11 - RR-078/RR-079 product-card and accessory safety

**RR-078 stable rule:** Route checks run before product-detail shortcuts. Embedded `customer-service`/`customer-care` path segments and dated `YYYY/MM/*.html` article routes are evidence-only, not buyable cards. Do not reject `/pages/` or all dated paths generically; model-specific and dated commerce product routes remain valid.

**RR-079 stable rule:** A standalone dock, docking/charging station, clean or dust-disposal base, base station, or self/auto-empty base/dock/station is a robot-vacuum complement. An explicit robot vacuum bundled with one remains the primary product. Keep exclusive complement checks on identity text.

**Rich-evidence boundary:** `why_recommended` can confirm the requested type for a sparse legitimate name, but cannot erase a lean-evidence wrong-type verdict. When rich evidence is supplied, `classifyProductTypeMatch` first preserves any evidence-only `irrelevant` verdict, then permits rich allowed evidence to distinguish a bundle from a standalone complement.

**Stable tests:** `tests/productEligibility.test.mjs`, `tests/productTypeMatch.test.mjs`, and the robot/toaster preservation cases in `tests/requirementValidation.test.mjs`. Fail-first 33/35; a later brand-prefixed dock control failed 12/13 before dynamic-regex escaping was corrected; final focused 97/97; full 822/822 across 120 suites. Typecheck/build/offline eval pass; lint 0 errors/3 existing warnings. Zero live calls.

---

## 2026-07-11 - Phase R4 deterministic constraint allocation

**Scope:** `lib/requirementExtraction.ts`, `lib/searchQueryExpansion.ts`, `lib/discoveryStrategy.ts`, `lib/requirementValidation.ts`, all behind `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on` (default off, byte-identical off).

**Mechanics to preserve:**

- Extraction: non-negative ambiguous Important Details route to `preferredConstraints` when the flag is on (`requirementExtraction.ts`, the `preferAmbiguousDetails` branch). Negative phrases still route to avoid. Hard wording is untouched.
- Plan: `getCategorySynonyms()` returns only the category for inclusion-matched groups when on; exact-key groups keep breadth. `preferredFallbacks` fills primary/second feature slots. `constraintBearingPhrases` + `carriesConstraint()` order pass-1 bearing-first BEFORE the pass-1 cap, so culls hit generic tails and `augmentSearchPlanWithDiscoveryStrategy`'s protected `pass1.slice(0, 4)` picks up constraint-bearing queries by construction.
- Budget: `budgetBoundQuery()` flag branch normalizes dollar-less bounds in place (function-form replace to avoid `$`-group hazards); flag-off path preserved verbatim.
- Validation: preferred constraints (non-budget/brand) verify via `containsRequiredFeature`/`hasNegativeContextForRequiredFeature`; verified pushes `Preferred: <label>` into matched, unverified into `softUnknownRequirements` (existing x4 confidence penalty) — never missing/unknown, never gating.

**Stable test entry points:** `tests/constraintAllocation.test.mjs` — flag-off pins the exact pre-R4 plan/classification/duplicate-budget/validation defaults. Flag-on covers soft preferred versus hard required strictness, >=3-of-5 Shopping coverage, dilution removal, exact-key breadth plus outside-group inert controls, category-collision handling, word/comma budget normalization and idempotence, mixed hard/preferred ordering, and both validation outcomes. Initial 12/12; Codex adversarial fail-first 12/16; final 16/16; full suite 838/838.

**Known trade-off (accepted):** an AI query whose normalized form equals a deterministic constraint-bearing query now merges into it (one Serper call instead of two); the RR-074 test uses a `best`-prefixed query for that reason.

---

## 2026-07-11 - Phase R4 live after-sample

**Protocol:** Six usable cache-cold runs at `cd95deb6`, both flags enabled on
server processes only. One accidental warm-cache request was spent/excluded;
Taylor approved one replacement. Authority is seven dispatched, six usable.

**Ledger proof:** 604 logical searches = 118 hits + 486 misses; 486 physical
attempts, zero retries/fallbacks, all balanced and cache-cold. Never reuse the
old 225–280 estimate for this shape; the six usable runs alone cost 486
physical attempts.

**Stable interpretation:** Pinned planning was accepted by the live API but
did not materially stabilize strategy output: strategy Jaccard 0.0000→0.0196,
planned/dispatched product queries 0.3830/0.3722→0.3714/0.3587. Do not equate
`temperature: 0` with deterministic output. Pool/final overlap did improve to
0.2694/0.1429 from 0.1051/0.0333, but attribution is mixed.

**R4 boundary:** Judge protected allocation from the leading outbound query
set, not by counting every later constraint-bearing ledger record marked
culled. Later AI/rescue duplicates and caps legitimately create culled records.
The leading B forms all carried robot-vacuum + self-emptying + budget and had
zero duplicate budgets. Total wrong-category first losses nevertheless rose
from 5 to 6/7/6 because AJ Madison organic results and a direct-retailer stick
vacuum tail remained noisy.

**Quality/safety:** 0/27 wrong-type/non-product final cards after versus 3/23
before; exact B compliance 1/1; no RR-061 image regression. RR-060 reopened
for the same Home Depot product ID under short/titled URLs. RR-081 tracks
wildcard-domain and repeated-token AI/rescue queries. Fixtures remain untracked.

**Decision boundary:** `.env.local` is unchanged. R3 promotion is not supported
by plan-stability evidence. R4 promotion is a separate user decision and the
shared two-flag sample limits causal attribution. No rubric/leader freeze or
Phase 6E authorization follows from this sample.

---

## 2026-07-12 - Phase R5 identity collapse + listing-id dedupe (and leader-contract test)

**Scope:** `lib/productIdentity.ts` (always-on trust-boundary fixes, no flag);
`scripts/goldBenchmark.mjs` gained the exported `coversLeader()` contract that
`scripts/qualityScorecard.mjs` now imports.

**Mechanics to preserve:**

- `retailerListingKey()`: a URL whose FINAL path segment is a pure-numeric ID
  of 6+ digits yields `host listing <id>` as the medium-confidence canonical
  key (ahead of the full-path `urlKey`). Never fires on shorter numerics
  (sizes/models) or lettered segments. A DATE-SHAPED segment
  (`^(19|20)\d{6}$`) requires a generic product-detail path marker and no
  editorial/archive marker; article/archive paths retain full-path identity.
- `conflictingNumericSpecs()` + `numericSpecValues()`: unit-aliased extraction
  (gallon/gal, hp with optional "peak", qt/quart, psi, cfm/scfm, btu, watt(s),
  volt(s), amp(s), ah, lb(s)/pound(s)); inches deliberately EXCLUDED
  (truncated retailer titles emit "13. 2 in" noise).
- **Trust boundary (deliberate):** canonical-ID equality outranks conflicting
  title specs — one listing ID means one page, and retailer titles contain
  typos; the spec-conflict guard governs the INFERENCE paths only
  (brand+shared-model, title-equal). Order inside `areSameExactModelProduct`:
  disjoint-strong-models early false -> canonicalId equality true ->
  spec-conflict false -> brand+sharedStrongModel true -> identical
  normalizedTitle.
- Generalization proof beyond vacuums: CRAFTSMAN 20-Gallon air compressors
  with 175 vs 150 PSI stay distinct; matching-PSI retailer variants still
  collapse.

**Stable test entry points:** `tests/identityCollapse.test.mjs` (live-captured
fail-first pairs, preservation matrix, cross-category PSI cases, date-segment
boundary, RR-072 prefilter pin); `tests/leaderSnapshot.test.mjs` pins the
`coversLeader` brand-AND-line contract (broad tokens like self/ai never count
without their brand; line phrases retain both token boundaries; unbranded
line-token titles are a recorded undercount).

**Corrective fail-first:** Combined leader/identity focused matrix passed
17/20 before the closure with exactly the whole-token, date-like product ID,
and SCFM cases failing; final passed 20/20. RR-082 records the measurement bug.

**Known limits (accepted):** spec conflict only reads names/metadata titles,
not attached spec objects; the listing key requires the ID as the final path
segment (query-string IDs unhandled — no captured evidence yet).

## 2026-07-12 - Phase R6 source-brand trust and query hygiene

**Saved-evidence decisions:** RR-070/RR-077 use title compatibility, not provider
metadata confidence alone. Metadata brand is eligible only when the title contains
that brand or a recognized alias; otherwise source upgrade falls back to title
identity. Preserve explicit unknown brands, DeWalt `20V MAX`-style aliases, and
the HP measurement boundary when changing brand logic.

RR-076 contribution is settled for this phase: 588 raw editorial-seed results
produced zero unique/final candidates in R2. The editorial evidence/seed budget is
therefore zero; proposed queries stay registered as culls. Do not restore spend
from parser quality alone — require new contribution evidence and approval.

RR-081 is enforced at `fetchSerper()`, the common provider boundary. Sanitation
must happen before dispatch registration, cache key, and JSON request body so all
search origins and verticals agree. Preserve concrete `site:` operators, quoted
phrases, and legitimate repeated proper/model words. Normalization-equivalent
queries should share the cache and create one physical request.

**Verification:** focused 148/148; full 868/868 across 125 suites; typecheck and
build pass; lint 0 errors/3 existing warnings; deterministic eval no red flags;
zero live calls; `.env.local` unchanged.

## 2026-07-12 - R7 pre-gate provenance audit

**Evidence mode:** M3 historical fixture inspection only. Six R4-after fixtures,
27 displayed cards. Finalized lineage directly attributes 22 cards to normalized
Serper candidate IDs and one to `final_openai_research` only. Four displayed
cards have no direct finalized record because attribution did not retain a
matching record at the candidate cap; never turn that missingness into Serper
or AI credit.

Manual boundary review of the four: eufy C10 and Roomba 105 have clear same-model
normalized Serper candidates; DEWALT DXV12P has normalized nearby QT/QTA variants
but exact identity is ambiguous; RIDGID HD1200 appears in raw provider results
but has no normalized candidate ID. Supported conclusion: 2–3/27 likely rely on
the LLM candidate stream, while the exact count is NotScored.

This audit cannot replace the R7 readiness gate: the broad leader list is still
DRAFT, fixtures predate R5/R6, and no current post-R6 sample exists. For the live
gate, report raw-provider absence separately from normalization/prefilter loss;
manually inspect borderline `coversLeader()` misses because unbranded titles are
a known conservative undercount.

## R7 readiness gate — 2026-07-12

- Use `npm run dev`, not `npm start`, for local debug fixtures: production mode
  intentionally suppresses the ledger even when the debug header is present.
- Quote PowerShell dollar-bearing values with literal single quotes. A command
  containing `--budget "under $300"` became `under ` before Node received it.
- The hardened capture script accepts `--out`, `--budget`, and `--priorities`,
  refuses overwrite before dispatch, and makes exactly one client request.
- Four usable fixtures reconcile to 306 physical attempts; two excluded runs
  make known total spend at least 387. The last complete six-run window's 486
  physical attempts remains the conservative future planning basis.
- Broad Serper-only normalized discovery recall was 1/7 twice. Every missed
  leader existed in raw product-discovery digests but failed before the pool.
  Even a perfect third run caps the mean at 3/7; do not buy replacement runs to
  re-prove this failure. Repair normalization and safety before another window.

## Corrective C1 offline attribution — 2026-07-12

- Analyzer contract: pre-AI pool means Serper `product_discovery`, normalized,
  raw-dedupe survivor, and cheap-prefilter accepted. A later merge loss remains
  pool-present. Candidate-merge lineage can overstate presence; never use it to
  manufacture a miss.
- Current `07b` broad pool results are 1/7 and 1/7. The prospective matcher in
  which letters-only `wd`/`hd` cover letters-plus-digits changes pool coverage
  by zero. Do not attribute the failure to benchmark token boundaries.
- Four-fixture terminal outcomes: 15/22 leader/runs lost in normalization,
  4/22 after merge, 3/22 displayed. Repeated recorded result-row losses: 205
  normalizer rejection, 159 search/listing URL, 9 requirement filter, 3 merge,
  4 cheap prefilter, 2 cutoff, 1 generic-title. These are not unique products.
- Current rejected-row telemetry omits product URLs. Merchant-URL recovery rate
  is NotScored; do not promise zero-call recovery from these fixtures alone.
- RR-060: trusted product URL model evidence is absent from strong-model tokens.
  RR-083: truncated title loses `vacuum`, while URL/image wrong-type evidence is
  absent from shared type text. These are C2 fail-first specifications, not C1
  behavior changes.

## Corrective C2 identity/type safety — 2026-07-12

- URL identity trust is path-only: never use hostname, query, or fragment text.
- Exact-model inference may read URL model tokens only when the existing
  `productEligibility.canRenderAsProductCard` is true. It still requires same
  brand/shared strong model and runs after the R5 numeric-spec conflict veto.
  Evidence-only collections cannot lend identity.
- Product-page path type evidence is veto-only. It may prove `stick vacuum` for a
  truncated candidate, but it cannot positively prove `robot vacuum`; title,
  metadata, and source text retain that responsibility. Image paths remain
  governed by the separate image-identity resolver and cannot hard-veto type.
- Query-string type words are ignored. Generalization/preservation controls:
  cross-retailer Bissell 18P03, unrelated AC100 compressor, evidence-only
  collection, existing PSI/SCFM conflicts, and valid sparse robot vacuums.
- Verification: focused 184/184, full 881/881 across 127 suites, typecheck/
  build/eval pass, lint 0 errors/3 existing warnings. Zero live calls.

## Corrective C3 normalization recovery — 2026-07-13

- Environment gate: `REVIEW_RADAR_NORMALIZATION_RECOVERY=on`. Default/unset is
  behavior-off; `.env.local` was not changed.
- Reuse rule: inspect only the Serper result's existing `productLink`,
  `product_link`, and `link`. Do not follow a redirect, decode a wrapper into an
  arbitrary URL, or dispatch a direct-product lookup.
- Identity rule: title-carried model/SKU is mandatory. URL-path model evidence
  may corroborate and conflicting title/path models veto; the slug cannot create
  an otherwise absent identity.
- Safety order: valid HTTP → title identity → non-Google/non-tracking host → no
  model conflict → shared product-type verdict → existing specific-product and
  product-eligibility verdict. Preserve evidence/listing/support/root rejection.
- Field-order trap: when the provider exposes a tracker, a collection, and a
  clean product URL, select the clean URL only with the flag on. With the flag
  off, output stays identical and the ledger records a shadow opportunity.
- Shopping, organic fallback, and direct-retailer paths must emit exact
  normalization decisions. Never collapse all new losses back to
  `normalizer_rejected_result` when a specific reason is available.
- Analyzer contract: recovery counts are unique leader/run opportunities. Old
  fixtures with no trace are NotScored even when their current/prospective broad
  recall remains 1/7.
- Verification: fail-first 59/64 (five intended failures); focused final 71/71;
  safety wall 207/207; full 891/891 across 127 suites; typecheck/build/eval pass;
  lint 0 errors/3 existing warnings. Zero live calls.

## C2/C3 peer-review safety closure — 2026-07-13

- A URL-lent model token is inference, not identity proof. In inferred
  exact-model collapse, both products must pass the shared product-type verdict;
  an accessory slug may name its parent model without becoming that product.
  Canonical listing-ID equality remains stronger and bypasses this inference
  veto by design.
- Recovery must positively satisfy `pathLooksLikeProductDetail`; merely missing
  the Google/tracking/search denylist is insufficient. Test this through public
  shopping/organic/retailer normalizers rather than exporting private policy.
- Preservation controls must include a true same-model cross-retailer pair, a
  distinct model, and a legitimate multi-function requested-type product.
- Verification: fail-first 131/134 with exactly three intended failures;
  focused 134/134; ledger/analyzer 23/23; full 896/896 across 127 suites;
  typecheck/build/eval pass; lint 0 errors/3 existing warnings. Zero live calls.

## C4 deterministic preflight contract — 2026-07-13

- Residual identity control: `Wet/Dry Vac Hose`, `Utility Nozzle Attachment`,
  and `Wet Dry Vac Filter Bag` are standalone shop-vac complements even when a
  product slug carries the parent model. A complete vacuum title may mention an
  included hose/nozzle and remain exact. Keep both directions pinned at the
  exact-model collapse seam.
- Counterfactual honesty: flag-off and flag-on outcomes must call the same
  shopping/direct-retailer normalization functions used by runtime. The runtime
  mode's selected candidate ID and URL must match its recorded outcome for
  every result. This reconstructs normalized-pool opportunity only; never
  claim a flag-off final set from it.
- Source matching: retain bounded paths from all provider URL fields. Do not
  use URL query strings or hostnames as brand/model evidence. Report title-only
  and path-supplemented raw presence separately; path evidence is deterministic
  instrument input, not a hand adjustment.
- Sample honesty: exact request bytes, non-null debug ledger, commit hash,
  cache-cold start, required flag values, balanced reconciliation, and a
  120-attempt guard are mandatory. Invalid/spent runs never enter quality
  averages, but their physical attempts stay in total cost.
- Budget discipline: 486 physical attempts is the conservative six-search
  planning basis. The approval unit remains six searches, not calls. A request
  that trips the 120-attempt ceiling is spent/excluded and pauses before any
  replacement.
- Verification: focused C4 instrumentation/ledger 77/77; full 905/905 across
  127 suites; typecheck/build/eval pass; lint 0 errors/3 pre-existing warnings.
  Commits `c80543d` and `0f9f0e8`; zero live calls; `.env.local` unchanged.

## Corrective C4 live evidence and stop — 2026-07-14

- Approval was six searches, not an attempt pool. Four usable cache-cold
  requests consumed 227 physical attempts: broad `42/54/66`, constrained `65`.
  All had zero retries/fallbacks, balanced ledgers, exact 120-attempt guards,
  and commit `2d83cab0711e`. RR-061 stopped the window before B2/B3; never use
  those two unspent approvals after phase closeout without a new explicit
  authorization.
- Under ratified `leaders-v2026-07c`, all broad leaders were raw-present 3/3.
  Pool recall `1/7, 1/7, 2/7`; final recall `2/7, 1/7, 1/7`; means `1.33/7`.
  The provider is not the observed leader-presence bottleneck. Most leader
  outcomes terminate at `search_or_listing_url` normalization loss.
- Same-response recovery result: flag-off and flag-on normalized coverage were
  identical, parity violations zero, unique leader/run recovery opportunities
  zero. The enabled recovery only helps when the same provider result supplies
  a safe alternate merchant URL; these misses generally did not. Keep recovery
  default-off.
- RR-061 new fail-first specification: target `Roborock Q10 X5+`, captured
  verified-page image `Q10-S5_140x.jpg`. Current resolver accepts High because
  any compatible token (`Q10`) returns before foreign sibling token (`S5`) is
  evaluated. The repair must evaluate claim-set compatibility while preserving
  same-model, neutral size, opaque CDN, and multi-model controls.
- RR-060 new fail-first specification: displayed Bissell manufacturer
  `Garage Pro® Wet Dry Vac` (`18P03`) and Amazon `Garage Pro ... 18P03` survive
  together even though `areSameExactModelProduct()` returns true after
  enrichment. Find the post-enrichment/final-selection bypass; do not widen
  identity inference without proving the seam.
- RR-084 specification: a truncated AJ Madison result normalized from
  `site:ajmadison.com robot vacuum self-emptying under $300`; enrichment later
  proved KitchenAid `KUIX515SPA` is an ice maker, but Category remained unknown
  and near selection still rendered it. Positive conflicting product identity
  must veto final cards without treating every sparse requested-type title as
  wrong.
- Analyzer invariant from `97f783f`: frozen wrong-type terms are checked
  against structured title/pros/cons/citation titles, not only truncated display
  names. Do not expand a ratified benchmark post hoc to catch an observed class;
  record non-enumerated manual safety findings separately.

## Post-C4 deterministic safety-repair memory — 2026-07-14

- Image identity is claim-set based. Never let one compatible filename token
  return before foreign mixed/split claims are evaluated. Remove compatible
  claims, then veto if any genuine foreign claim remains; keep the artifact,
  neutral, dimension, model-less, and same-model preservation wall.
- Exact and near are presentation streams, not identity domains. Final dedupe
  must compare an ordered near candidate with selected exact winners and prior
  near winners under `areSameExactModelProduct()`. Do not widen identity to fix
  a selection bypass; trace the loser and winning representation.
- `needs_verification` is safe only while source identity is sparse. If enriched
  identity positively matches a different registered product class and does
  not prove the requested class, Category is a hard fail. Use identity/title
  evidence, not assigned category or query echo. Keep identity-only classes out
  of request matching when they can also be requested features.
- C4 fixture replay: Amazon `18P03` duplicate removed; `Q10-S5` rejected for
  foreign `s5`; KitchenAid ice maker hard-fails robot-vacuum Category. The
  unproven Lowes Garage Pro card remains distinct, and sparse `Roborock S7 MaxV
  Ultra Long Range` remains non-rejected.
- Verification: fail-first 102/105 with exactly three intended failures;
  focused final 132/132; full 911/911 across 127 suites; typecheck/build/eval
  pass; lint 0 errors/3 pre-existing warnings. Zero live calls; flags and
  `.env.local` unchanged.

## Corrective C5 identity-resolution feasibility memory — 2026-07-14

- Raw path words are corroboration, not product identity. A leader is not
  provider-present merely because another product's URL contains the leader
  word, and an accessory bearing the brand does not satisfy the requested
  product type. Preserve superseded measurements visibly when correcting them.
- A structured provider product ID plus source title is an **identity lead**,
  never a product card. Materialization requires a safe product page, positive
  exact identity, requested-type compatibility, product eligibility, and
  cheap-prefilter survival. Never render or cite the Google wrapper itself.
- C4 broad correction: type-safe identity-lead upper bound `6/7, 6/7, 6/7`;
  safe pages already captured anywhere in-request materialize `2/7, 2/7,
  4/7`. Missing targeted resolution is NotScored because the saved digests
  omit full raw fields and no lookup ran.
- `getProductPageLink()` is not a safe resolver trust boundary by itself.
  Shared category/spec words can admit a wrong-brand page. Repair positive page
  identity before measuring resolution. Keep diagnostic combinatorial pairings
  distinct from observed attached links.
- Standalone complements must be handled in the existing shared product-type
  machinery, not a second classifier. Preserve complete products mentioning
  included accessories and legitimate bundles.
- C5 verdict: repair page identity and complement type gates, then request a
  small live resolution-feasibility probe; build a default-off resolver only
  if that probe clears the frozen gate. Zero live calls and behavior changes in
  C5. Focused 11/11; full 915/915; typecheck/build/eval pass; lint 0 errors/3
  pre-existing warnings.

## Corrective C5 trust-boundary repair memory — 2026-07-14

- A product-page title that ends with a retailer label is still product
  evidence; do not exempt the whole title merely because it contains `.com`.
  Strip only a true leading source label or an offer whose entire title is a
  retailer label.
- Page identity conflict is veto-first: reject corroborated foreign leading
  identity, foreign strong or split model claims, and conflicting hard numeric
  specs before generic category/title overlap. URL query and hostname text do
  not manufacture product identity.
- Positive page identity does not require byte-identical or brand-complete
  titles. Safely sparse manufacturer titles remain valid when the hardened
  selector finds no foreign identity/model/spec conflict and the existing
  eligibility/type/path gates pass. Keep exact-model equality as a diagnostic,
  not a mandatory condition for every sparse title.
- Complement handling stays in the shared product-type classifier. Cartridge
  filters and blower-nozzle/vacuum attachments are standalone complements;
  explicit `with`/`includes` context preserves complete products that ship with
  those accessories. Do not make `hose` or `nozzle` globally accessory-like;
  that falsely rejects complete pressure washers.
- Canonical provider discovery is
  `identityResolution.recall.identityLeadUpperBound`. Path-supplemented raw
  presence is historical funnel evidence only. Current C4 replay: ceiling
  `6/7`, captured materialization `2/7, 2/7, 4/7`, selector gaps 0, complement
  gaps 0, verdict `needs_live_resolution_probe`.
- Verification: focused 119/119; full 920/920 across 127 suites; typecheck,
  build, and offline eval pass; lint 0 errors/3 existing warnings. Commit
  `1131101`; zero live calls and no flag or `.env.local` change.

## C5 live resolution-feasibility memory — 2026-07-14

- A resolution probe must pin the source fixture hashes, exact identity targets,
  query bodies, cache-cold state, commit, logical/physical budget, and ledger
  reconciliation before spend. Default to dry-run and checkpoint after every
  dispatched query; never replace an inconclusive request without new approval.
- For the frozen shop-vac C4 sample, four recurring targets cover all ten
  unresolved leader/run gaps. Three specific identities resolved safely:
  RIDGID HD1200, Craftsman CMXEVBE17584, and Stanley SL18115. The generic
  Vacmaster 5-gallon lead correctly stayed unresolved instead of borrowing a
  more-specific variant page.
- Projected safe materialization is `5/7` in every run, exactly at the frozen
  floor. Treat this as feasibility only: it does not prove end-to-end pool/final
  recall, stability, image/price/citation/constraint safety, latency, or cost.
- Vertical attribution is load-bearing. Shopping returned 132 raw rows and zero
  normalized candidates; organic `"<identity> product page"` searches returned
  all accepted pages. A future resolver should be organic-only, one query per
  deduped eligible identity, bounded and default-off, after existing merchant
  recovery. Reuse the shared normalizer, page selector, type, eligibility, and
  prefilter gates; generic identity remains unresolved.
- Evidence: commit `53c193b`; fixture SHA-256
  `0089CE6F1F2150D84933AC28C441AAC7EBA421719905433C7F2C047AEE588CBF`;
  8 logical/8 physical, 0 hits/retries/fallbacks/errors, ledger balanced.

## C5 bounded organic identity-resolution contract — 2026-07-14

- Resolution is a post-discovery fallback, never a new source of identity.
  Admit only structured Google Shopping product IDs whose provider title is
  specific, contains a strong model token, is product-eligible without a page,
  and positively satisfies the requested-type classifier. A provider ID by
  itself cannot make a model-less title safe.
- Existing evidence wins before new spend: do not resolve an identity already
  materialized by ordinary normalization, the enabled merchant-URL recovery
  counterfactual, or another page accepted by the shared product-page selector.
- Deduplicate by provider identity and normalized brand/model identity. The
  request-wide maximum is four organic `"<identity> product page"` lookups;
  never add a Shopping-resolution fallback. The default-off branch must return
  the original Serper result object and dispatch zero lookup calls.
- A lookup result enters the pool only after the unchanged organic normalizer,
  requested-type verdict, product eligibility, cheap prefilter, and hardened
  product-page identity selector all accept it. Preserve parent-query lineage
  and a concrete normalization, prefilter, or `identity_resolution` first-loss
  reason for every rejected result.
- Commit `eaeb577`; focused 104/104, full 934/934 across 129 suites,
  typecheck/build/eval pass, lint 0 errors/3 existing warnings. No live calls,
  flag promotion, or `.env.local` edit. End-to-end recall/safety/stability/cost
  remain unproven until a separately approved live validation.

## C5 corrective resolver-hardening contract — 2026-07-14

- Resolver identity is narrower than shared product identity. A compacted hard
  specification such as `12gallon`, `175psi`, `20volt`, or `120hz` cannot by
  itself authorize a paid identity-resolution lookup. Keep that exclusion local
  so numeric-spec conflicts can still protect dedupe and page selection.
- Brand identity must be source-leading. Do not let a unit alias such as
  horsepower `HP` override a leading Craftsman-style brand; preserve genuine HP
  computer titles and punctuation-bearing leading brands such as Shop-Vac.
- Aggregate duplicate leads before allocation. Rank by distinct parent-query
  recurrence, then total occurrences, then stable first-seen/key order; suppress
  already-materialized identities before the unchanged request cap of four.
  Selected and cap-culled ledger rows must retain recurrence and parent lineage.
- The C5 flag composes the existing guarded merchant recovery first, then the
  bounded organic resolver. The normalization-only flag remains valid and both
  flags off remain behaviorally unchanged.
- Do not broaden to ambiguous short model codes yet. A deterministic `Q5`
  target can still accept a `Q7` page under the shared selector, so short-code
  resolution remains unsupported until that boundary has an evidence-backed
  safe discriminator.
- Commit `4bba870`; fail-first produced exactly three intended failures;
  focused 131/131 and full 937/937 across 129 suites pass. Typecheck/build/eval
  pass; lint is 0 errors/3 pre-existing warnings. M3 C4 replay is directional;
  live recall, safety, stability, cost, and latency remain unproven.

## OAI-H1 autonomous fact-verifier boundary — 2026-07-16

- A registered citation URL, page title, heading, product family, or related
  product section is discovery evidence only. It cannot independently verify
  exact product identity or authorize a displayed transactional fact.
- Exact identity requires normalized brand plus a stable model token observed
  on the same structured Product entity through model, SKU, MPN, GTIN, or the
  entity name. Transactional facts bind only to offers on that exact entity.
- The verifier is authoritative for identity, price, currency, seller,
  purchase destination, availability, image, and owner-rating/count. It may
  replace a provisional value with an independently observed exact-entity
  value, but cannot discover, add, rescue, rank, reorder, or narrate products.
- Editorial sources may support source-bound professional claims only after
  exact-model verification. They cannot establish purchase facts or owner
  ratings. A page whose tested-model evidence conflicts with the proposed card
  is contradicted even when its title or URL names the proposed product.
- Dealer-only action is not direct purchase availability. Absent or explicitly
  unavailable review data clears provisional owner rating/count instead of
  preserving model-authored values.
- The fetch boundary is HTTP(S)-only, rejects credentials and non-default
  ports, resolves and pins a public address, revalidates every redirect, blocks
  private/reserved/link-local/metadata destinations, and enforces redirect,
  timeout, byte, content-type, and final-status limits without retries.
- Commit `a9a46c6`; focused 11/11 and full 993/993 across 137 suites pass.
  Typecheck/build/offline evaluation/diff checks pass; lint is 0 errors with
  the same 3 pre-existing warnings. H1 made zero external fetches and zero
  OpenAI/Serper calls; production remains unchanged.

## OAI-H2 direct-verification feasibility memory — 2026-07-16

- A direct verifier must treat access/format coverage as part of feasibility,
  not merely parser quality. Ten registered URLs produced six bounded HTML
  observations, two over-envelope responses, and two transport failures. Only
  2/4 products retained independently verified identity plus destination.
- Purchase-page structured entities worked safely for the accessible Miele and
  Dyson cases: exact prices survived, dealer-only availability was unavailable,
  and explicitly unavailable ratings were cleared.
- Professional-test Product JSON-LD often describes the page topic, not the
  exact tested specimen. It cannot by itself verify model-specific narrative or
  imagery. Require a positive non-conflicting tested-model receipt; inconclusive
  editorial identity must fail closed. RR-092 records the live AZ4002/AZ405KT1
  gap.
- A blocked purchase source must clear provisional price/URL rather than retain
  model output. That is safe but may leave too few useful cards; safety and
  consumer usefulness are independent gates.
- H2 used 10 top-level/10 physical attempts, zero redirects/retries/OpenAI/
  Serper. Runner `858ad9a`; evidence hash
  `643b2e6b4f0028036a081c193554871db0e6974ad45d09bf9fb90a79eb769f46`.
  H3 is blocked; production and flags remain unchanged.

## OAI-H2B verification-only commerce contract — 2026-07-16

- A verification oracle receives only frozen model-proposed identities. It may
  verify or return inconclusive; it never adds, replaces, rescues, merges,
  scores, or reorders products.
- Query minimally with brand + exact model/SKU + requested category. Avoid full
  marketing names and discovery language that dilute exact Shopping results.
- Verify one Shopping row only when its title contains target brand and stable
  model/SKU, and it supplies a named seller, positive price, and non-Google
  merchant product URL that passes product eligibility.
- Reject wrong/missing model, Google wrappers, listings/search pages, explicit
  accessory offers, used/refurbished/open-box offers, and missing seller/price/
  destination. Never use a URL-only model or provisional model-authored value.
- Provider ordering may choose the first qualifying exact row; do not minimize
  price across unrelated rows. A current exact offer is verification, not
  discovery or product ranking.
- Editorial evidence is outside H2B. RR-092 remains fail-closed unless a
  positive exact-tested-model receipt independently supports the claim.
- Preflight `deac842`: focused 11/11, full 1004/1004 across 138 suites;
  typecheck/build/offline evaluation/diff checks pass, lint 0 errors/3 existing
  warnings. No live request or production change occurred.
- Live H2B used exactly four logical/four physical Serper Shopping attempts,
  all HTTP 200, and returned 121 rows. Every URL exposed through
  `productLink`, `product_link`, or `link` was a Google wrapper. Twelve rows
  carried a target stable identifier but none supplied a usable merchant
  destination; Miele and HZ4002 had no stable identifier in returned titles.
  Coverage was `0/4` with zero unsafe accepted bindings. Do not treat a Google
  Shopping wrapper as merchant-destination proof or weaken this boundary to
  make a provider pass. Evidence hash
  `224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.

## OAI-H2C two-stage commerce-provider contract — 2026-07-16

- A one-stage Shopping row with a Google wrapper is not a merchant destination.
  Do not rewrite queries or weaken URL trust to compensate for a provider that
  omits offer-level links.
- A materially different narrow verifier may use one exact Shopping lookup to
  obtain a product-entity token and one token-bound Offers lookup to obtain
  merchant, direct retailer URL, current price, and availability. The token
  chain is evidence binding, not permission to discover or substitute.
- Exact brand and stable model/SKU must survive in the selected Shopping entity
  and the chosen offer without conflict. Missing token, identifier, seller,
  positive price, new/in-stock state, or non-Google merchant URL is
  inconclusive; model-authored values never backfill it.
- Ignore shopping ads, reviews, critic insights, arbitrary specifications, and
  prose. A commerce provider solves transactional verification only; it does
  not solve exact-tested-model editorial truth or RR-092.
- Provider adapters are volatile trust boundaries. SearchAPI documented a May
  15, 2026 breaking change from product IDs to Shopping-minted product tokens.
  Isolate and version the adapter, validate its schema, and fail closed on
  drift. Never silently fall back to another vendor or endpoint.
- H2C preflight commit `9b81369` implements this contract offline. The runner
  is dry by default, requires exact eight-attempt authorization to execute,
  redacts tokens, checkpoints attempts, refuses repeat evidence, and permits no
  retry/fallback/replacement/additional query. The verifier additionally rejects
  cross-brand titles, contradictory canonical brand/title data, second strong
  model codes, and broad family-only matches that omit material descriptive
  model terms. Focused 24/24 and full 1017/1017 across 139 suites pass;
  typecheck/build/eval/diff pass and lint remains 0 errors/3 existing warnings.
  No live provider capability is established until a separately approved run.

## OAI-H2C live result — 2026-07-17

- The frozen SearchAPI Shopping→Offers probe used six of eight approved
  physical attempts: four Shopping and two Offers, all HTTP 200, with exact
  attempt reconciliation and no retry/fallback/replacement/additional query.
- Exact verified coverage was `2/4`, below the frozen `3/4` gate. Shark AZ4002
  and Dyson V16 Piston Animal verified safely. Miele Guard L1 Cat & Dog and
  Shark HZ4002 appeared under plausible product-family titles, but the titles
  omitted their stable identifiers, so the verifier correctly stopped before
  Offers lookup rather than guessing.
- The frozen human audit found zero unsafe accepted bindings. This is a safe
  coverage failure, not evidence that the identity boundary should be weakened.
- Sanitized untracked evidence SHA-256:
  `fb8b6cc813b3398fca45818d5f80fd90649f12cd9dfda47f8a333816da526ef4`.
  The fixture contains no API key, headers, cookies, or raw product tokens.
- SearchAPI's provider experiment ends here under the frozen contract. H3,
  provider retuning/substitution, and production integration need a new owner
  architecture decision. Transactional verification still does not solve
  RR-092's editorial source-truth boundary.

## Unguarded Terra master-prompt diagnostic — 2026-07-17

- One Terra/high response used the exact natural-language master prompt with
  web search and no ReviewRadar schema, verifier, post-processing, Serper,
  SearchAPI, or direct fetch. It used 14 hosted searches, completed in 235.903
  seconds, and cost an estimated `$0.782088`.
- The natural answer was materially better as recommendation UX: five coherent,
  mostly exact products, detailed tradeoffs, 25 cited URLs, and every cited URL
  present in the response source registry.
- Source membership did not equal fact verification. An AZ4002 price was labeled
  verified from a Best Buy review URL rather than a direct offer, and Dyson
  owner evidence crossed from the named Prussian Blue/Copper product to a
  different purple listing without resolving the variant boundary.
- Durable architecture lesson: keep model-authored product selection/rationale,
  then attach deterministic verified commerce and exact-variant facts by field.
  Do not make missing commerce proof erase a supported recommendation, and do
  not let natural-language confidence promote unverified transactional facts.
- Sanitized untracked evidence SHA-256:
  `203ced3a53472d69909f096f9a36b331b3045002324dc8b02affeec2369b56c4`.

## OAI-T1 two-layer field-trust contract — 2026-07-17

- Preserve Terra's product choices and relative order. Formatting is
  extraction only: every displayed identity/prose string must occur verbatim in
  the raw natural answer, its SHA-256 must match, and every cited URL must be in
  the same API response source registry.
- Never place price, seller, availability, retailer URL, or image in the
  model-owned research schema. Exact model/variant remains visibly labeled as
  not independently verified until a deterministic receipt proves it.
- Recommendation rationale, best-for, tradeoffs, pros, and cons are labeled
  `AI research synthesis`. Specifications, professional test claims, owner
  feedback, and warranty/support claims are labeled `Source-reported` with an
  explicit evidence scope; citation presence alone never means verified.
- A transactional receipt attaches fields only when its target and observed
  identity fingerprints match and its URL is a direct buyable product page.
  Review/listing pages, cross-variant identities, malformed/unknown receipts,
  and multiple competing receipts fail closed.
- Verification failure is field-local: retain the product and order, show
  `Check current price`, omit an unverified image, and retain the exact-identity
  warning. The receipt layer never adds, deletes, substitutes, rescues, scores,
  or reorders a recommendation.
- OAI-T1 is isolated. Passing its offline wall does not prove formatter quality,
  commerce coverage, editorial semantic truth, or production readiness, and it
  authorizes no API call or route integration.

## OAI-T2 deterministic formatter contract — 2026-07-17

- Prefer deterministic extraction over a second formatting-model call while
  the universal master prompt supplies stable numbered Markdown sections. This
  preserves the one-main-call architecture and removes a second hallucination,
  latency, and cost surface.
- Require contiguous numbered product headings plus `Why it ranks`, `Overall
  assessment`, `Pros`, `Cons`, and `Sources`. Missing structure fails closed;
  never guess a product boundary, rank, or missing field.
- Copy every identity, assessment, pro, con, and source-reported claim verbatim
  from the raw answer. Preserve the explicit recommendation-status line when it
  differs from the heading.
- Drop `Current price` sections from structured research. A price or retailer
  mention in natural prose never becomes a transactional field without the
  separate OAI-T1 receipt.
- Accept only source URLs and titles in the same API response registry. Missing
  registry membership or source metadata fails closed rather than creating a
  URL, title, or citation.
- Treat extracted specification, professional-test, and owner-review text as
  `source_reported` with `unresolved` scope. Deterministic parsing proves
  provenance and exact copying, not semantic truth or exact-model applicability.
- Saved-evidence proof: five recommendations preserved, 21 sources registered,
  five transactional sections ignored, five commerce-unverified cards, five
  identity-unverified cards, and no tracked derivative fixture.

## OAI-T3 trust-state presentation contract - 2026-07-17

- A recommendation may remain visible when exact identity or commerce is not
  independently verified. Uncertainty must be field-local and explicit: show
  the exact-identity warning and `Check current price`; omit the purchase link
  and image instead of filling them from research prose.
- Keep the three shopper-facing trust labels distinct: `AI research synthesis`
  means model-authored selection/explanation, `Source-reported` means a cited
  source made the claim, and `Independently verified` requires the deterministic
  exact-product receipt. Citation presence never earns the verified label.
- Product cards must remain usable on narrow screens. Long identity, evidence-
  scope, and source labels must wrap inside a zero-minimum card grid; hidden
  horizontal clipping is a trust defect because it can conceal warnings.
- Presentation prototypes use generic controlled data, are unlinked, and are
  development-only. A production request for the preview route must return 404.
  A prototype passing visual QA does not authorize route integration, live
  research, provider verification, feature-flag promotion, or deployment.

## Shared public-network fetch contract - 2026-08-30

- Every server fetch of an untrusted provider, search, citation, or product-page
  URL must use the shared hybrid transport. URL syntax or source-registry
  membership alone never authorizes the later DNS or redirect destination.
- Each hop must be HTTP(S), credential-free, default-port, fully resolved, and
  rejected if any DNS answer is non-public. Transport must connect to the
  validated address while retaining the original host for HTTP/TLS identity;
  every redirect repeats parsing, DNS classification, and pinning.
- Keep literal and encoded IPv4, IPv6, IPv4-mapped/compatible IPv6, loopback,
  link-local, private/unique-local, multicast, documentation, 6to4, mixed-DNS,
  malformed-redirect, redirect-limit, and public controls in deterministic
  injected tests. Never test this boundary by contacting a real private target.
- One per-hop hard deadline spans DNS and transport. Inactivity timeout alone
  is insufficient because DNS and trickling responses can outlive it. Pass the
  abort signal to transport and ensure no transport starts after DNS timeout.
  Native OS resolver work may still finish in the background; global request
  admission/concurrency is the separate containment for resolver pressure.
- Enforce both declared and actual byte ceilings. Preserve status separately
  when a body truncates so status policy still decides oversized 404/410 and
  similar responses. Bound redirect count, allowed content types, and consumer
  concurrency while preserving output order.
- Citation reachability may intentionally remain lenient for authenticated bot-
  wall, timeout, redirect-limit, missing-location, size, or content outcomes;
  that compatibility never bypasses destination checks and never proves page
  truth. Product best-effort failures may retain a likely link but may not parse
  metadata; unsafe destinations clear the proposed link.
- Do not retain raw credential-bearing URLs in cache keys. Hash the URL for
  lookup identity and keep existing source/product identity gates independent
  of network reachability.
- PR-6B proof: focused 74/74, full 1,620/1,620, build, Playwright 17/17,
  five-partition controller with 10/10 cases and 29/29 invariants, and frozen
  independent `VERIFIED` at confidence 0.98. Zero network/provider/live-fixture
  content was used.

## Shared paid-request admission and bounded-cache contract - 2026-08-30

- Read public JSON as a stream before route parsing. Enforce both declared and
  actual 64 KiB ceilings, reject malformed `Content-Length`, invalid UTF-8, and
  malformed JSON, then apply exact route field/container bounds before client
  creation, cache insertion, or provider work. Boundary-equal ordinary requests
  must remain positive controls.
- One JavaScript realm must share one paid-work authority across feature,
  legacy, two-layer, staged, and direct paths. Keep concurrency (four active)
  distinct from rolling frequency (12 starts per 60 seconds), queue nothing,
  return a retry interval, and make release idempotent. A process/realm limiter
  never proves IP, account, worker, restart, multi-instance, edge, or deployment-
  wide enforcement.
- A background provider acknowledgment does not complete paid work. Transfer
  the permit to an admission-owned namespaced lease through terminal poll/
  cancel or signed-token expiry. Any route acquisition/stat read must sweep all
  expired leases, not only its own namespace. If app-token construction fails
  after acknowledgment, attempt one safety cancel while holding the permit;
  release on proven terminal cancel and otherwise lease until expiry.
- Poll/cancel control requests operate under the existing held lease. Any later
  paid stage, including staged commerce/presentation or direct asset lookup,
  must reacquire admission. Identical terminal completion loads may coalesce,
  but rejection or failure must clear the in-flight promise so a later retry is
  possible and must not start outbound setup while saturated.
- Bounded caches must sweep expired values, update LRU on hit, evict before
  exceeding capacity, coalesce identical misses, clear rejected loaders, and
  retain no zero-TTL value. Retain only successful values. Keys must include all
  result-affecting context and keep user detail out of plaintext key material;
  a visible constant namespace plus SHA-256 of normalized JSON is the current
  contract.
- Keep deterministic mutations for declared/actual overflow, malformed length/
  JSON/UTF-8, every field/container bound, parallel and rolling rejection,
  success/failure/double-release recovery, duplicate-module sharing, cross-
  route lease expiry, every post-ack token-failure path, terminal/nonterminal/
  thrown cancel, eviction/TTL, coalescing, failure retry, and no cross-request
  leakage.
- PR-6C proof: focused 89/89, full 1,658/1,658 across 227 suites, typecheck,
  lint/build/Playwright 17/17, five-partition controller with 10/10 cases and
  29/29 invariants, and final independent `VERIFIED` at confidence 0.98 after
  two corrective review rounds. Zero provider, network, credential, or live-
  fixture content was used. RR-104 remains contained/narrowed until distributed
  deployment authority is separately proven.

## Legacy request-cancellation and shared-waiter contract - 2026-08-30

- Represent active request cancellation with `RequestCancelledError`; do not
  infer it from every provider `AbortError`. Check the request signal before and
  after each awaited route stage and rethrow cancellation from every fallback.
  The public legacy response is HTTP 499 with `The request was cancelled.`, and
  progress status is `cancelled`.
- Pass the request signal through planning/final/narration OpenAI calls, Serper
  discovery/identity work, citation and product-page verification, evidence,
  assets, requirement rescue, and source upgrade. A cancelled request must not
  start another paid stage, retry Serper, switch verticals, or build an AI/search
  fallback.
- Preserve independent deadlines. Serper attempts each own a timeout controller
  linked to the shared loader signal; a request cancellation is terminal while
  an ordinary transient timeout retains existing retry behavior. Hybrid DNS and
  transport use one per-hop deadline linked to the request signal; external
  cancellation throws, while the local deadline remains `request_timeout`.
- Model an in-flight cache entry as one shared loader plus explicit waiters.
  One cancelled waiter detaches only itself. Abort the loader after the last
  waiter cancels, remove that entry before aborting, never cache its late value,
  and permit a replacement load immediately. Attach a rejection observer so a
  cooperative loader abort cannot become unhandled.
- Keep regressions for pre-abort before admission/client creation, in-flight
  planning cancellation, between-stage suppression, final-provider fallback
  suppression, enrichment suppression, Serper no-retry/no-fallback, external
  fetch cancellation versus timeout, one-waiter survival, all-waiter abort,
  late non-cooperative completion, clean retry, stable response/progress, and
  permit cleanup.
- PR-6D proof: fail-first 58 pass / 10 intended fail; final focused 68/68; full
  1,668/1,668 across 227 suites; typecheck/lint/build/Playwright 17/17;
  controller `agent-loop-2026-08-30T08-52-05-714Z` with all five partitions,
  10/10 cases, and 29/29 invariants; independent late-loader and DNS probes;
  exact `VERIFIED`, confidence 0.97. Offline proof does not authenticate hosted
  disconnect delivery or reversal of already-accepted provider billing. Native
  DNS may continue internally after cancellation, although no later transport
  can start.

## Production-safe Serper warning contract - 2026-08-30

- A production diagnostic logger must not accept a raw message plus arbitrary
  detail. Use a module-private closed input and reconstruct output from an
  allowlist; type declarations alone do not sanitize runtime objects.
- The current Serper warning allowlist is fixed event, normalized search type,
  fixed error category, optional existing query ID matching `q-` plus four to
  eight digits, optional integer attempt 1 through 999, and optional `primary`
  or `fallback` stage. Do not emit shopper query, `Error.message`, URL, body,
  header, credential, key-shaped text, or any raw/reversible query hash.
- Keep every reachable warning site in the regression matrix: shopping,
  organic, direct-retailer, evidence, image, video, transient retry, vertical
  fallback, request attempt ceiling, and missing-key discovery. Cover 4xx, 5xx,
  other HTTP, provider, timeout, transport, unknown, and configuration classes.
- Negative canaries must exercise query, free-form error, URL, header, fake key,
  and body values under production mode with mocked transport. Assert exact safe
  fields, bounded optional fields, and test-mode suppression; never use a real
  credential or network request for a logging test.
- Preserve cancellation before warning/retry/fallback. An in-flight cancelled
  request must rethrow, emit no warning, and start no retry or vertical fallback.
  Preserve request payloads, return shapes, observability records, and configured
  retry/fallback counts independently of logging.
- PR-6F proof: fail-first 1 pass / 8 intended failures; dedicated 11/11;
  related wall 101/101; full 1,679/1,679; five-partition controller 10/10 cases
  and 29/29 invariants; independent exact `VERIFIED`, confidence 0.99. Hosted
  collector behavior, retention, and historical contents remain outside this
  source-level contract.

## Safe public optional-provider configuration contract - 2026-08-30

- Keep one canonical tracked public environment template. Any retained
  compatibility template must be byte-identical under an automated regression;
  public-template key-set checks must enforce exact membership and uniqueness
  without treating harmless assignment order as product behavior.
- Optional credentials must be blank by default. Documentation must copy the
  canonical template, require explicit real-key opt-in, and avoid copyable fake
  assignments that a truthiness gate could interpret as configured.
- Centralize optional-provider configuration before request construction and
  use it at every reachable dispatch gate. Missing, empty, whitespace-only, and
  exact bounded repository placeholders are unconfigured. Normalize only for
  blank/placeholder comparison; preserve every other configured value exactly.
- Do not invent provider key formats, reject substrings, or treat a near miss as
  a placeholder. Keep positive controls proving an ordinary synthetic value
  dispatches once with its header bytes unchanged, and negative controls proving
  both direct dispatch and higher-level discovery start zero mocked requests.
- Configuration tests must remain zero-network and must never inspect, print,
  copy, hash, stat for diagnosis, or modify the user's ignored `.env.local`.
  Public examples, README, source gates, and synthetic mocked transport are the
  complete authorized surface.
- PR-6G proof: final fail-first 4 pass / 10 intended failures; dedicated 14/14;
  related 156/156; full 1,693/1,693 across 229 suites; typecheck/lint/build/
  Playwright/controller; final independent `VERIFIED`, no findings, confidence
  0.999. This proves safe tracked defaults and bounded placeholder rejection,
  not key validity, funding, hosted configuration, historical traffic, or
  billing.

## Bundled optional-dependency lock contract - 2026-08-30

- When a registry package declares `bundleDependencies`, its nested lock entries
  may correctly omit individual `resolved` and `integrity` fields and instead
  use `inBundle: true`. Authenticate those bytes through the nearest bundle
  owner's exact npm-registry tarball URL and integrity, plus tarball manifest
  inspection; do not invent standalone provenance fields.
- Resolve each consumer through nested-to-ancestor npm paths before checking
  version compatibility. Two optional consumers may legitimately retain
  incompatible major lines when each resolves a compatible entry; do not mask
  a missing nested record by adding a root dependency or upgrading unrelated
  packages.
- A bounded semver helper must preserve prerelease state. A prerelease such as
  `1.1.4-beta.1` does not satisfy stable caret floor `^1.1.4`. Preserve correct
  upper bounds for major, `0.x`, and `0.0.x` ranges, and fail closed on range
  syntax the test does not explicitly support.
- Regenerate lock evidence with empty user/global npm configs, an isolated
  cache/log directory, no auth-token environment, ignored lifecycle scripts,
  and exact public registry scope. Compare the result byte-for-byte before
  applying a minimal patch; never use the working `node_modules` as authority.
- Bind platform evidence precisely. A real Windows install and an explicit
  Linux/WASM32 target install can prove npm resolution and portable WASI load,
  but target flags on a Windows host do not prove native Linux deployment.
  Record platform-pruning leftovers and compare them with the untouched base.
- PR-6H proof: initial 0/1 lock failure, reviewer-driven prerelease fail-first
  1/2, final 2/2, adversarial semver 15/15, package-only tree clean, exact
  isolated lock, full 1,695/1,695, build/E2E/controller, and replacement
  independent `VERIFIED`, confidence 0.99.

## Known-clean dependency advisory floor contract - 2026-08-30

- A clean audit is time-bound network evidence; preserve it with an offline
  lock regression for every affected package name. Check every nested lock
  instance, not only the hoisted copy, and bind each entry to a standard public
  registry tarball URL plus SHA-512 integrity.
- Use proven-clean floors only after exact candidate audit and provenance
  checks. For disjoint vulnerable ranges such as `brace-expansion`, encode the
  actual range shape: 1.x requires at least 1.1.18, 2.x is unaffected, 3.x/4.x
  are rejected, and 5.x requires at least 5.0.9.
- Keep framework runtime and configuration packages aligned when their release
  versions are coupled. PR-8 requires locked `next` and `eslint-config-next`
  versions to match without changing their direct caret specifications.
- Compare bounded root candidates before choosing a correction. In PR-8,
  root-only Next, shadcn, Tailwind, or ESLint updates left 7 to 11 affected
  names or added unnecessary churn. Updating the affected lock resolutions and
  required companions cleared all 12 names while keeping `package.json`
  byte-identical.
- Authenticate every changed registry artifact against exact public metadata,
  and distinguish package-only graph proof from a platform-pruned installed
  tree. A clean Windows install/native load is real Windows evidence; npm
  target flags that prune Linux-native optional artifacts are not Linux proof.
- PR-8 proof: fail-first base regression, final focused 6/6, zero-vulnerability
  isolated audit, 61 changed artifacts authenticated, package-only tree clean,
  clean Windows/native load, full 1,699/1,699, build/E2E/controller, and exact
  corrected lock SHA-256
  `7c142f30e3670020d9b867d90d86f16fc53f7c2a8139120d368b9d4e6ad1501a`.
  Independent exact review repeated the audit, package graph, 61-artifact
  provenance, focused wall, and range semantics and returned `VERIFIED`,
  confidence 0.98.

## Staged accuracy lineage contract - 2026-08-30

- Keep production recommendation behavior separate from evaluation capture.
  The staged runtime may expose an optional immutable callback after research
  schema validation and identity-source filtering, but production handlers must
  not pass it. Never return this snapshot to the browser.
- Match preregistered truth products only by exact normalized brand alias and
  model alias. Do not accept prefix/suffix siblings, product-name similarity,
  URL tokens, or a retailer's grouping as exact identity.
- Persist only preregistered public product IDs, registry role, bounded stage
  counts, verifier-owned first-loss counts, and final ranks. Never persist raw
  candidate IDs, names, URLs, sources, prompts, responses, or credentials in the
  readiness lineage artifact.
- Reconcile validated-to-accepted counts, accepted-to-verifier outcomes,
  outcome-to-first-loss counts, eligible-to-final-card counts, and the
  cross-product sums of research counts, verifier outcomes, and every first-loss
  bucket against aggregate diagnostics. Registered normalized brand/model alias
  pairs must not overlap across products. Unknown keys and resealed private
  fields must fail closed without echoing the rejected value.
- Preserve public `variant` in readiness artifacts, but do not claim automated
  variant stability while the live renderer supplies no trustworthy variant
  field. Use exact normalized brand plus model for duplicate-card identity,
  final-set Jaccard, and shared-order Kendall tau. Product-name wording and
  nullable variant text must not create a different physical product identity.
- Score both final-set overlap and shared-product rank order. A registered
  product not displayed must remain attributable to discovery absence,
  identity-source preflight, a specific verifier first loss, or presentation
  omission. Require bound pass/fail human review for exact variant/trim evidence
  on every card, even when public variant is null, plus specification claims,
  top-pick support, relative ordering, evidence/tradeoff alignment, price offer,
  image identity, requirements, sources, and advice.
- PR-9A corrected proof: focused 77/77, runner/launcher 27/27, full
  1,709/1,709 across 232
  suites, typecheck, lint with zero errors/three old warnings, build, Playwright
  17/17, and controller `agent-loop-2026-08-30T20-30-25-650Z` with 10/10 cases
  and 29/29 invariants. This proves measurement integrity only; no live product
  accuracy or readiness result exists.

## Fresh staged-accuracy protocol contract - 2026-08-30

- Preserve the retired v1 readiness matrix as history. A new live chain must
  use a new matrix version, file/canonical hashes, run IDs, and nonces with no
  overlap with a spent chain; changing only the operator command is not fresh
  evidence.
- The v2 truth content is byte-independent but semantically identical to the
  still-current v1 reviewed truth: review 2026-08-29, expiry 2026-09-12, the
  same sources, cases, requests, registries, and serial run order. This is
  reauthentication within the reviewed window, not a market-truth refresh.
- A later live attempt cannot rely on a supplied hash alone. Read every exact
  preceding artifact from its precommitted same-commit directory through a
  direct, bounded file boundary; authenticate the canonical prefix, chain,
  commit, mechanics, quality result, expected next run, and final hash; and
  repeat the proof after approval but before provider-client construction.
- Require both final-set Jaccard at least `0.60` and shared exact-product Kendall
  tau at least `0`. A pair with fewer than two shared products is unscorable and
  fails quality. Exact product identity is normalized brand plus model; name
  wording or a nullable public variant must not split the identity.
- The proposed live envelope is exactly six serial logical searches with
  12 creates, 360 retrieves, 60 hosted searches, six cancels, 90 Shopping
  attempts, 180 source fetches, 540 HTTP attempts, `$1` per run, `$6`
  aggregate, and at most 60 human public-source opens. Every retry,
  replacement, fallback, organic/SearchAPI attempt, extra case, and automatic
  continuation is zero.
- The `$2.744628` planning basis is six times PR-3K's `$0.457438` conservative
  comparable result. Planning arithmetic is not approval. Do not dispatch
  until independent exact-snapshot review and explicit approval of the six
  logical searches, `$6`, and the human page-open ceiling.
- The pre-spend fail-first passed 54/56 and failed only invented/missing prefix
  authentication. Corrected focused protocol suites pass 106/106; full tests
  pass 1,711/1,711 across 232 suites; typecheck passes; lint has zero errors and
  three pre-existing test warnings; and deterministic controller
  `agent-loop-2026-08-30T21-24-13-213Z` passes all five serial partitions,
  10/10 cases, and 29/29 invariants. The prior PR-9A production build and
  Playwright 17/17 remain the latest browser/build proof because PR-9B changes
  only offline evaluation scripts, tests, its matrix, and documentation.
- PR-9B made zero live/provider/credential/source-page requests. One local
  history commit and one High-reasoning independent exact-commit review are
  authorized; broad paid-call approval is not the exact count, dollar, and
  page-open ratification required to dispatch.
- Parse and range-check the complete live attempt selector before reading any
  prior artifact. The shared prefix loader must independently validate a safe
  integer in `1..attemptPlan.length` before slicing the registry, constructing
  an output path, or invoking its reader. Regressions must prove zero reader
  calls for zero, negative, non-integer, and beyond-plan selectors.
- Initial exact commit `81c54d76ab88488f65790b2b341bdf8f877a5685`
  failed this contract. The corrected fail-first/final proof is runner 16/17 to
  17/17, focused wall 107/107, full 1,712/1,712, typecheck pass, and lint zero
  errors/three old warnings.
- Corrected source snapshot `96424b6e1e22d56f947de041da04ce37fa2380a2`
  received independent `VERIFIED`, no material findings, confidence 0.995. The
  final documentation-only closeout commit was reauthenticated by the same
  reviewer and must retain byte-identical implementation, test, and matrix
  blobs from that verified snapshot.

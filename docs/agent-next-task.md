# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6C paid-
request admission and bounded-cache correction. This file was regenerated from
current evidence. The current approved base is the self-contained PR-6C
closeout commit containing this file; resolve its full SHA with
`git rev-parse HEAD`. Its expected parent is
`78ef542e4ee321d72c5c59b70b92703a0ca91530`.

## Current state

ReviewRadar is **not production-ready**. Staged Terra and Direct Terra remain
default-off and undeployed. PR-3K proves one safe complete `shop vac`
lifecycle, not current category-wide quality. PR-4B attempt 1 stopped before
provider work; its one-shot authorization is consumed, no artifact exists, and
the serial protocol cannot advance. Current staged-path recall, hard-
requirement truth, repeatability, latency distribution, and cost remain
unmeasured.

PR-008 closes RR-092. PR-007 corrects reachable shared exact-model identity
while retaining RR-091 as contained historical debt. PR-6B closes the reachable
outbound-destination boundary locally and RR-103 is Fixed. PR-6C now closes the
reachable body/field, one-realm paid-work, background-lease, and cache-capacity
defects. RR-104 remains `Needs Investigation — contained/narrowed` because no
worker-, restart-, multi-instance-, edge-, IP/account-, or deployment-wide
enforcement is proven.

PR-024/RR-105 is now the earliest actionable local release blocker: the browser
can report a legacy search cancelled while the active synchronous server route
continues already-dispatched provider work under fixed timeouts. Job-token
cancellation exists only for default-off asynchronous modes.

The issue register is 105 total: 1 Open, 6 Needs Investigation, 97 Fixed, and
1 Won't Fix.

## PR-6C outcome

The paid-input and cache boundary is now shared and bounded:

- both public POST routes stream at most 64 KiB and reject malformed or
  oversized declared length, actual overflow, invalid UTF-8, malformed JSON,
  and route-owned field/container violations before client creation;
- one `globalThis` authority within a JavaScript realm permits four active
  paid/provider operations and 12 starts per rolling 60 seconds, queues none,
  returns an explicit retry interval, and releases idempotently;
- background creates retain their permit through terminal poll/cancel or
  signed-token expiry using admission-owned namespaced leases. Any route
  acquisition or statistics read sweeps every expired lease;
- if app-token construction fails after provider acknowledgment, the route
  attempts one safety cancel while holding the permit. Proven terminal cancel
  releases it; failed, thrown, or nonterminal cancel leases it until expiry;
- later staged Shopping/presentation and Direct-Terra asset work must reacquire
  admission, while identical completion work coalesces and failure/rejection
  clears for retry;
- the shared legacy cache retains at most 256 successful values; generated
  features retain at most 100 successful values for six hours; and
- both caches sweep TTLs, evict deterministically by LRU, coalesce identical
  misses, clear failed loads, retain no zero-TTL values, and use a visible
  namespace plus SHA-256 of normalized full context.

The first independent review found that deferred paid stages bypassed admission
and acknowledged jobs released permits. The replacement found owner-route-local
lease expiry and three post-ack token-construction gaps. Every finding received
a direct fail-first regression and generalized correction before the final
freeze.

## Current verification

| Check | Result |
| --- | --- |
| Final PR-6C focused wall | 89/89 |
| Complete unit wall | 1,658/1,658 across 227 suites |
| Typecheck | passed |
| Lint | passed; 0 errors, same 3 old warnings |
| Production build | passed |
| Playwright | 17/17 with one worker |
| Final deterministic controller | `agent-loop-2026-08-30T08-03-27-675Z` |
| Controller partitions/benchmark | 5 exact partitions; 10/10 cases; 29/29 invariants |
| Independent PR-6C verdict | `VERIFIED`; no material correction; confidence 0.98 |
| PR-4B attempt-1 provider calls/artifacts | zero / zero |

The reviewer authenticated baseline
`78ef542e4ee321d72c5c59b70b92703a0ca91530` and all 16 frozen hashes before
and after review:

- `app/api/features/route.ts`:
  `90ca898b422bb53e92dabd35fd5f2c9d160b8565412ae904c34fec896b821549`;
- `app/api/recommendations/route.ts`:
  `3ee9d6f8c14fda3100af7e3395b81963cd5d5183908f73ab0d27a93a4b7ba643`;
- `lib/boundedJsonRequest.ts`:
  `4233c758060906dac37a478900e7fc0c710152d09efba27da0f02884d83c4123`;
- `lib/cache.ts`:
  `5a86f56730e03931e64a7f9360920eccbe6ae77030f10ffc4236db3bf86db4ae`;
- `lib/paidRequestAdmission.ts`:
  `c408f71d46f1349bbf76e6f42b7703da39176b430bbac54f23cbd499170ff73b`;
- `lib/twoLayerRecommendationRoute.ts`:
  `0e41cb816d935164e6e47ce1028d0c94ca8dbe6ba3fdcccab4af08e0c976be6d`;
- `lib/stagedTerraRecommendationRoute.ts`:
  `188cef07d468964406fc948118e1efa42d94c31416ba7602fbe3d0aec33eb71d`;
- `lib/directTerraRecommendationRoute.ts`:
  `e56cb0efd9dac3a5198e9221a4fdbbfe8bd2518e410490692bd033335ede1445`;
- `tests/boundedJsonRequest.test.mjs`:
  `52cd60025a78ff0479a19e41d2ce87f9e194c9d47357efaef0a71b1e344e1b29`;
- `tests/cache.test.mjs`:
  `82e09e9b591f98be4a2ce817d1231c1b434cc152d4d976516c535dbfec379758`;
- `tests/paidRequestAdmission.test.mjs`:
  `6d86236f88d70ae32ed62c5868a70b456c005f80dd5266073602c769c17d9776`;
- `tests/featureRoute.test.mjs`:
  `74bd0e4c1d56c4fe840f4a6d494705281dc3762ccdc54683fd8a80af37188236`;
- `tests/recommendationApiContract.test.mjs`:
  `528eb83827ca31617cbd2a033bf7135fccba01f9469e20307dbe795077bbf39b`;
- `tests/twoLayerRoute.test.mjs`:
  `24a30d59923506003fd00620fc857c99b93af7484e5d520b45513cb0232de22a`;
- `tests/stagedTerraRoute.test.mjs`:
  `8cebc4b738c993204d6370d11bce41651449d9e160b1e0ed666b8b29367d2157`;
- `tests/directTerraRoute.test.mjs`:
  `9c238dd35a51d477638cd0d27380452d0158784e35698b35226ff1ce9b24de7e`.

No provider, product-data service, credential, manual environment file, real
network, or live-fixture content was accessed. Generated `next-env.d.ts` was
restored to Git blob `9edff1c7cacb3bfac9a1eadcf6f51eaa99565e38`.

## Objective and decision frame

The product objective remains the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. PR-006 is
the largest quality uncertainty, but it is blocked and grants no live
authority. PR-024/RR-105 is the earliest actionable local blocker because a
shopper-visible cancel action currently does not reliably stop server-side
legacy paid work.

Verified facts:

- `components/SearchForm.tsx` aborts the browser fetch and renders cancellation;
- the active missing/empty/`legacy` recommendation route remains synchronous;
- its provider and enrichment stages use fixed timeout contracts rather than
  one request-owned abort signal; and
- signed provider-job cancellation exists only for default-off asynchronous
  modes and does not repair the legacy path.

Engineering judgment:

- trace the exact active legacy path and propagate one server-owned cancellation
  signal only through cancel-safe provider/fetch boundaries;
- cancellation must prevent client creation when already aborted and must stop
  every not-yet-started later paid stage without retry or fallback;
- preserve timeout as a distinct failure class, preserve PR-6C admission
  release/lease behavior, and avoid changing asynchronous job-token semantics;
- prefer the narrow signal-propagation correction over converting the legacy
  route to durable background jobs, which would expand architecture, state,
  public API, and deployment dependencies before the direct defect is measured;
  and
- treat browser abort as best-effort unless deterministic framework/host
  disconnect behavior and each provider transport are directly proven.

Uncertainty:

- tracked evidence has not yet identified every provider/SDK call that accepts
  an abort signal without changing retry or timeout behavior;
- browser cancellation does not prove the hosting runtime will always deliver a
  disconnect signal after request dispatch;
- races among abort, timeout, provider completion, cache fill, and response
  serialization need explicit precedence tests; and
- cancellation can reduce wasted future work but cannot retroactively unbill an
  already-accepted provider operation.

**Recommended reasoning level:** High for cancellation ownership, race
precedence, timeout distinction, and admission cleanup; Medium for bounded
signal plumbing, deterministic seams, and documentation.

## Current approved phase: PR-6D / PR-024 legacy cancellation propagation

This phase is local, zero-provider, zero-network, fail-first, and narrowly
scoped to RR-105. It does not authorize external infrastructure, asynchronous
route redesign, deployment, package installation, or live traffic.

1. Authenticate the intended repository, PR-6C closeout commit, tracked clean
   state, frozen hashes, default route/flags, and no unexpected edits. Use only
   tracked-only or exact-path status/discovery.
2. Trace the browser abort through the exact active legacy POST route, OpenAI
   helper/final calls, Serper/search work, URL verification, product assets,
   fallbacks, cache loaders, and PR-6C admission release. Record which stages
   are paid, retried, parallel, cached, and safely abortable before proposing a
   change.
3. Add fail-first deterministic tests for abort-before-client/create,
   abort-in-flight, abort between paid stages, parallel-stage abort, abort while
   a cache load is shared, late abort after terminal success, timeout without
   abort, abort/timeout races, and cleanup. Assert exact client/provider/fetch/
   fallback counts, stable user-safe status/body, no later paid stage, no retry,
   permit recovery, and no poisoned cache entry.
4. Establish the earliest generalized root cause and implement the smallest one
   request-owned cancellation contract through every proven cancel-safe legacy
   boundary. Do not invent SDK support or swallow abort as an ordinary provider
   error. Preserve independent hard timeouts and source/evidence/identity rules.
5. Prove asynchronous two-layer/staged/direct job-token polling/cancellation,
   PR-6C body/field/admission/cache semantics, and default mode selection remain
   unchanged. Do not use a cancellation fix to bypass admission or start a
   replacement/fallback path.
6. Run focused route/provider/search/cache/admission walls first, then
   typecheck, lint, the complete suite, deterministic eval/partitions/benchmark,
   production build, and Playwright. Restore generated `next-env.d.ts` if
   necessary.
7. Freeze the exact source/test manifest and obtain independent adversarial
   review. Challenge every provider/fetch seam, pre-aborted and mid-flight
   races, timeout distinction, later-stage suppression, cache coalescing,
   permit cleanup, public error stability, and framework/host uncertainty.
8. If verified, update only authoritative records, move RR-105/PR-024 to Fixed
   or state the exact residual, regenerate this handoff, and create one self-
   contained local commit before continuing.

## Approval, cost, and flag state

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The ignored `.env.local` is user-owned. Never edit, stage, print, hash, copy,
stat for diagnosis, or manually inspect it. Do not add a diagnostic mode that
reads it. Attempt 1's conservative ceiling was consumed without a provider
request and grants no future spend authority.

## Outstanding readiness debts

- PR-006: live measurement remains blocked. Current leader recall, card truth,
  hard-requirement accuracy, final-card stability, verified price coverage,
  first-loss distribution, latency, calls, tokens, and cost remain unmeasured.
- PR-024 / RR-105: legacy request cancellation is not connected to synchronous
  provider stages and is the active next local blocker.
- PR-023 / RR-104: one-realm body/field/admission/cache correction is verified;
  distributed ownership, restart/multi-instance behavior, poll/cancel request
  metering, load behavior, and remote terminal proof at lease expiry remain.
- PR-022 / RR-103: closed locally. Native OS DNS work can finish after the
  caller deadline, although no later transport can start; PR-6C contains
  sustained traffic only within one realm.
- PR-007 / RR-091: reachable shared exact-price boundaries are corrected; the
  historical membership-only adapter remains contained and unpromotable.
- PR-008 / RR-092: closed locally. Upstream source-role semantic corroboration
  remains residual risk but cannot grant tested-model authority.
- Accessibility, production headers, config validation, health/liveness,
  dependency advisories, observability, deployment, rollback, and multi-
  instance ownership still need evidence-ranked closure.

None of the above grants production authority.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, copy, hash, or add to any
  spent Phase D or readiness attempt/directory. Exclude
  `tests/fixtures/review-radar-live/**` from every repository search. Prefer
  explicit root-level files. Do not use broad status or slash-only Windows
  filtering.
- Process residuals: PR-4A printed two historical spent-fixture filenames;
  PR-6A printed five after a slash-only exclusion failed; PR-6B used prohibited
  broad status and printed spent-fixture filenames; PR-6C had two bounded
  tracked-document reads display historical fixture path text quoted in those
  documents. No fixture content, hash, field, value, metadata, parse, or
  modification occurred. Do not repeat these patterns.
- Do not retry or replace `broad-shop-vac:1`, invoke the direct runner, or
  advance to attempt 2. Absence of provider spend does not revive the consumed
  invocation.
- Do not make a real metadata/private-network request, live cancellation/load
  test, or paid probe. All proof uses injected deterministic seams.
- Preserve the PR-6C 64 KiB/field/admission/lease/cache contract. Cancellation
  cannot bypass admission, release another request's permit, poison a shared
  in-flight load, or start fallback/replacement work.
- Do not route or promote `lib/autonomousResearchAdapter.ts`.
- Do not weaken source ownership, identity, tested-model, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`,
  `fable-transfer-kit/`, ignored worker results, historical live fixtures, or
  any live artifact. Never use `git add -A`.
- No deployment, production change, push, publication, package installation or
  upgrade, destructive action, secret exposure, user-data deletion, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| PR-6C canonical evidence and hashes | latest PR-6C entry in `docs/qa-loop-results.md` |
| PR-023/024 status and exit blockers | `docs/production-readiness-master-plan.md` |
| RR-104/105 records | bounded bottom sections of `docs/RR-Issues-Report.md` |
| Browser cancellation origin | `components/SearchForm.tsx` |
| Active legacy request path | `app/api/recommendations/route.ts` |
| Shared body/admission/cache boundary | `lib/boundedJsonRequest.ts`, `lib/paidRequestAdmission.ts`, `lib/cache.ts` |
| Provider/search/fetch seams | exact imports and calls reached from the legacy handler |
| Asynchronous cancellation controls | `lib/twoLayerRecommendationRoute.ts`, `lib/stagedTerraRecommendationRoute.ts`, `lib/directTerraRecommendationRoute.ts` |
| Standing guardrails and trust invariants | bounded sections of `docs/forward-roadmap.md` |
| Peer conclusion | latest entry in `docs/agent-dialogue.md` |

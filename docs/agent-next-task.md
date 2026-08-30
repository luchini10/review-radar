# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6B shared
bounded outbound-fetch correction. This file was regenerated from current
evidence. The current approved base is the self-contained PR-6B closeout commit
containing this file; resolve its full SHA with `git rev-parse HEAD`. Its
expected parent is `d5c6f8be4c922b7c6279fd9e6412a537a17b87a4`.

## Current state

ReviewRadar is **not production-ready**. Staged Terra and Direct Terra remain
default-off and undeployed. PR-3K proves one safe complete `shop vac` lifecycle,
not current category-wide quality. PR-4B attempt 1 stopped before provider work;
its one-shot authorization is consumed, no artifact exists, and the serial
protocol cannot advance. Current staged-path recall, hard-requirement truth,
repeatability, latency distribution, and cost remain unmeasured.

PR-008 closes RR-092. PR-007 corrects reachable shared experimental exact-model
identity while retaining RR-091 as contained historical debt. PR-6A proved that
the default legacy route used two unsafe outbound fetch consumers. PR-6B closes
that reachable destination boundary locally: both consumers now use one
address-pinned, redirect-revalidated, deadline/byte/content-bounded shared
transport with ordered concurrency four. PR-022/RR-103 is Fixed.

PR-023/RR-104 is now the earliest actionable release blocker: both public paid
routes buffer JSON before an application ceiling; legacy fields have no maxima;
there is no tracked shared paid-work admission/global-concurrency gate; and
feature and shared legacy caches are capacity-unbounded and do not coalesce
identical misses. PR-024/RR-105 cancellation propagation remains a separate
successor.

The issue register is 105 total: 2 Open, 5 Needs Investigation, 97 Fixed, and
1 Won't Fix.

## PR-6B outcome

The default legacy lifecycle still invokes `collectReachableCitationUrls()` and
`enrichProductAssets()`, but their network behavior is now shared and bounded:

- only HTTP(S), no credentials, and default ports are accepted;
- every DNS answer must be public, the validated address is pinned for
  transport, and every redirect repeats parsing, resolution, and validation;
- literal/special IPv4 and IPv6, IPv4-mapped/compatible forms, loopback,
  private, link-local, unique-local, multicast, documentation, 6to4, and mixed
  public/private DNS results fail closed;
- one hard per-hop wall spans DNS and transport, and the live Node transport
  destroys slow or trickling work when aborted;
- redirect count, declared/actual body bytes, and content types are bounded;
- citation checks use 5 seconds, 4,096 bytes, two redirects, and concurrency
  four while preserving 404/410 and established bot-wall/timeout compatibility;
- product pages use 5 seconds, 1.5 MB, two redirects, HTML/XHTML, and concurrency
  four. Unsafe URLs clear; ordinary best-effort failures cannot parse metadata;
  identity/source rules and result order stay intact; and
- product-asset cache keys retain a SHA-256 URL digest instead of a raw
  credential-bearing URL.

The initial fail-first wrappers produced the intended failures. Main review
found truncated-body status loss, and independent review found that inactivity
timeout did not hard-bound DNS or trickling responses. Direct regressions and
generalized corrections landed before the replacement freeze.

## Current verification

| Check | Result |
| --- | --- |
| Final PR-6B focused wall | 74/74 across 9 suites |
| Complete unit wall | 1,620/1,620 across 220 suites |
| Typecheck | passed |
| Lint | passed; 0 errors, same 3 old warnings |
| Production build | passed |
| Playwright | 17/17 with one worker |
| Final deterministic controller | `agent-loop-2026-08-30T06-35-39-277Z` |
| Controller partitions/benchmark | 5 exact partitions; 10/10 cases; 29/29 invariants |
| Independent PR-6B verdict | `VERIFIED`; no material correction; confidence 0.98 |
| PR-4B attempt-1 provider calls/artifacts | zero / zero |

The reviewer authenticated baseline
`d5c6f8be4c922b7c6279fd9e6412a537a17b87a4`, all default-route consumers, and
all seven frozen hashes before and after review:

- `lib/autonomousFactVerifier.ts`:
  `f33f7076ee1e5fd7f505fad67f8502adca7f17f0664ceb0507fa3d2ac21302d4`;
- `lib/citationUrlVerification.ts`:
  `c137696b21ced63df5ec900358fe75396407ce7c4b9dcbb001233cb93ca62d46`;
- `lib/productAssets.ts`:
  `a5135a1221259ac17845e8a4660c70115892e0f813ee2541a983c3d81dc00c5b`;
- `tests/autonomousFactVerifier.test.mjs`:
  `093f5470f17dba0606c25884d1240346045855567953be851c436afa069a12dd`;
- `tests/citationUrlVerification.test.mjs`:
  `7388c9b986c62e8e99810b969c3a105a1e8020f6b84367806bd486db60525a19`;
- `tests/productAssets.test.mjs`:
  `59f304a687c04fccee5fd09774158f1165a20fedf3ba47d334564d7f6a8e74f5`;
- `tests/resultQuality.test.mjs`:
  `4430bafeda47642643e351ffa60dee5d63d75c0325e0696d1af097e6da035f34`.

No provider, product-data service, credential, manual environment-file, real
network, or live-fixture content was accessed. Generated `next-env.d.ts` was
restored.

## Objective and decision frame

The product objective remains the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. PR-006 is
the largest quality uncertainty, but it is blocked and grants no live authority.
The earliest actionable blocker is now PR-023/RR-104 because uncontrolled input,
paid-work admission, and cache residency are reachable before product quality
can matter and can amplify the PR-6B native-resolver residual under load.

Verified facts:

- both public paid routes call `request.json()` before an application byte
  ceiling;
- the active legacy validator has no maximum lengths for query, budget,
  priorities, or avoid;
- a deterministic 50,010-character query reached injected client creation;
- no tracked shared rate/global-provider-concurrency admission gate protects
  both routes;
- feature and shared legacy cache maps have no hard capacity and do not
  coalesce identical concurrent misses; and
- a zero-network probe retained 512 unique zero-TTL legacy cache keys.

Engineering judgment:

- stop oversized bodies and fields before client creation or any paid work;
- define one server-owned admission contract shared by both routes rather than
  unrelated route-specific counters;
- separate bounded provider concurrency from request-frequency policy, state
  exactly what is process-local, and do not imply multi-instance enforcement
  without shared infrastructure evidence;
- use bounded TTL/LRU ownership and in-flight promise coalescing rather than
  periodic cleanup alone; and
- keep request cancellation, headers, dependency upgrades, health checks, and
  deployment work out of PR-6C.

Uncertainty:

- tracked repository evidence does not establish CDN/WAF/request limits or the
  number and lifecycle of production instances;
- appropriate public request quotas and body/field maxima must be derived from
  existing UI/API/provider contracts, not chosen solely to satisfy a test;
- a process-local limiter can bound one instance but cannot alone establish a
  distributed production rate limit; and
- cache hit rate, hostile traffic frequency, and native resolver pressure are
  not measured live and do not require live traffic for the correction.

**Recommended reasoning level:** High for admission semantics, pre-provider
ordering, multi-instance claims, and failure/recovery behavior; Medium for
localized cache structures, deterministic mutations, and routine docs.

## Current approved phase: PR-6C / PR-023 paid-request admission and bounded caches

This phase is local, zero-provider, zero-network, fail-first, and narrowly
scoped to RR-104. It does not authorize PR-024 implementation, external rate-
limit infrastructure, deployment, package installation, or live traffic.

1. Authenticate the intended repository, PR-6B closeout commit, tracked clean
   state, frozen hashes, default route/flags, and no unexpected edits. Use only
   tracked-only or exact-path status/discovery.
2. Trace both public routes from raw request through validation, cache lookup,
   client creation, and every paid/provider stage. Retrieve existing UI,
   provider, schema, and server limits before choosing exact maxima.
3. Add fail-first deterministic tests for declared and actual oversized bodies,
   each oversized field/container, malformed length, boundary-equal values, and
   ordinary controls. Prove rejection occurs before client creation, cache
   insertion, or provider invocation.
4. Add fail-first serial and concurrent mutations for shared admission:
   burst/parallel rejection, exact global/provider ceilings, recovery after
   success/failure/abort, no permit leak, no queued later paid stage after
   rejection, and explicit process-local/multi-instance semantics.
5. Add fail-first cache mutations for unique-key capacity, expiration sweep,
   deterministic LRU/TTL eviction, identical-miss coalescing, failure cleanup,
   retry-after-failure, stable keys, and no cross-request result leakage.
6. Implement the smallest shared pre-provider admission/body boundary and
   bounded cache primitive that closes the reproduced contracts. Preserve API
   response safety, existing provider timeouts, source/evidence/identity rules,
   default flags, and public product behavior. Do not claim distributed rate
   enforcement unless tracked infrastructure proves it.
7. Run focused route/admission/cache walls first, then typecheck, lint, the
   complete suite, deterministic eval/partitions/benchmark, production build,
   and Playwright. Restore generated `next-env.d.ts` if necessary.
8. Freeze the exact source/test manifest and obtain independent adversarial
   review. The reviewer must challenge pre-provider ordering, bypasses through
   cache hits/misses or both routes, permit leaks, stampedes, eviction/TTL,
   failure recovery, multi-instance claims, and PR-024 scope leakage.
9. If verified, update only authoritative records, move RR-104/PR-023 to Fixed
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
- PR-023 / RR-104: body/field/admission and bounded/coalesced cache controls are
  the active next blocker.
- PR-024 / RR-105: legacy request cancellation is not connected to provider
  stages and remains separate after PR-6C.
- PR-022 / RR-103: closed locally. Native OS DNS work can finish after the
  caller deadline, although no later transport can start; sustained traffic
  containment belongs to PR-023.
- PR-007 / RR-091: reachable shared exact-price boundaries are corrected; the
  historical membership-only adapter remains contained and unpromotable.
- PR-008 / RR-092: closed locally. Upstream source-role semantic corroboration
  remains residual risk but cannot grant tested-model authority.
- Accessibility, production headers, config validation, health/liveness,
  dependency advisories, observability, deployment, rollback, and multi-instance
  ownership still need evidence-ranked closure.

None of the above grants production authority.

## Hard boundaries

- Never read, enumerate, retry, edit, stage, reuse, copy, hash, or add to any
  spent Phase D or readiness attempt/directory. Exclude
  `tests/fixtures/review-radar-live/**` from every repository search. Prefer
  explicit root-level files. Do not use broad status or slash-only Windows
  filtering.
- Process residuals: PR-4A printed two historical spent-fixture filenames;
  PR-6A printed five after a slash-only exclusion failed; PR-6B used a
  prohibited broad status that printed spent-fixture filenames. No content,
  hash, field, value, parse, or modification occurred. Do not repeat these
  patterns.
- Do not retry or replace `broad-shop-vac:1`, invoke the direct runner, or
  advance to attempt 2. Absence of provider spend does not revive the consumed
  invocation.
- Do not make a real metadata/private-network request, live load test, or paid
  admission probe. All proof uses injected deterministic seams.
- Do not route or promote `lib/autonomousResearchAdapter.ts`.
- Do not weaken source ownership, identity, tested-model, relationship,
  requirement, availability, price, commerce, asset, redirect, private-network,
  diagnostic, privacy, or public-response boundaries.
- Never stage `.env.local`, `.claude/`, `.rr_baseline*`,
  `fable-transfer-kit/`, ignored worker results, historical live fixtures, or
  any live artifact. Never use `git add -A`.
- No deployment, production change, push, publication, package installation or
  upgrade, destructive action, secret exposure, user-data deletion, or external
  scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| PR-6B canonical evidence and hashes | latest PR-6B entry in `docs/qa-loop-results.md` |
| PR-022/023/024 status and exit blockers | `docs/production-readiness-master-plan.md` |
| RR-103/104/105 records | bounded bottom sections of `docs/RR-Issues-Report.md` |
| Public route request paths | `app/api/recommendations/route.ts`, `app/api/features/route.ts` |
| Legacy input validation and cache | route-local validation plus `lib/cache.ts` |
| Feature cache/client boundary | `app/api/features/route.ts` |
| Shared concurrency patterns | `lib/recommendationPerformance.ts` and existing bounded stores |
| PR-6B network boundary | `lib/autonomousFactVerifier.ts`, `lib/citationUrlVerification.ts`, `lib/productAssets.ts` |
| Standing guardrails and trust invariants | bounded sections of `docs/forward-roadmap.md` |
| Peer conclusion | latest entry in `docs/agent-dialogue.md` |

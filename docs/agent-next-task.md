# ReviewRadar Agent Handoff

Updated: 2026-08-30 by Codex after the independently verified PR-6A
production-boundary baseline. This file was regenerated from current evidence.
The current approved base is the self-contained PR-6A closeout commit containing
this file; resolve its full SHA with `git rev-parse HEAD`. Its expected parent is
`2db12ab44b690d3ad1e5f8646adffb7f3ab46037`.

## Current state

ReviewRadar is **not production-ready**. The staged Terra and Direct-Terra paths
remain default-off and undeployed. PR-3K proves one safe complete `shop vac`
lifecycle, not current category-wide quality. PR-4B attempt 1 stopped before
provider work; its authorization is consumed, no artifact exists, and the
serial protocol cannot advance. Current-market recall, hard-requirement truth,
final-card repeatability, latency distribution, and cost therefore remain
unmeasured on the staged path.

PR-008 closes RR-092 locally. PR-007 corrects reachable shared experimental
exact-model identity while retaining RR-091 as contained historical debt.
PR-6A now proves a separate release blocker on the default legacy route:
untrusted provider/Serper URLs reach direct server fetches outside the bounded
public-network transport. PR-022/RR-103 is Open and owns the next correction.
PR-023/RR-104 (paid-request admission/caches) and PR-024/RR-105 (legacy
cancellation wiring) are Open successor units.

The issue register is 105 total: 3 Open, 5 Needs Investigation, 96 Fixed, and
1 Won't Fix.

## PR-6A outcome

The default route selects `legacy` when `REVIEW_RADAR_PIPELINE_MODE` is absent
or empty. During that reachable lifecycle:

- `collectReachableCitationUrls()` receives provider/Serper citation and
  product-page URLs, accepts any parseable URL, and launches every unique check
  through direct `fetch` with unbounded `Promise.all`;
- `enrichProductAssets()` directly fetches citation/product pages, follows
  redirects, reads complete HTML bodies, and concurrently enriches products;
- neither consumer consistently restricts scheme/credentials/ports, resolves
  and pins public addresses, revalidates redirects, or caps redirects/body/
  fan-out; and
- syntactic URL or response-source membership does not authorize the later
  server-side destination because DNS and redirects can change.

A deterministic fetch mock made no network request and intercepted these exact
attempted destinations from the two exports:

- `http://169.254.169.254/latest/meta-data`;
- `http://169.254.169.254/latest/meta-data/instance-id`.

The stronger zero-live alternative already exists in `fetchHybridSource()`:
HTTP(S)-only parsing, credential/non-default-port rejection, complete public-
address resolution, address pinning, per-hop redirect revalidation, and bounded
time, redirects, bytes, and content types. Direct-Terra page fetching uses it
when running with production dependencies, but Direct-Terra remains default-off
and does not contain the default legacy defect.

PR-6A also proved but did not combine two lower-ranked units:

- PR-023/RR-104: both public paid routes parse JSON before an application byte
  ceiling; legacy request text has no maxima; no tracked shared rate/global-
  concurrency admission gate exists; feature and shared legacy caches are
  capacity-unbounded and do not coalesce identical misses. A 50,010-character
  query reached injected client creation, and 512 unique zero-TTL keys remained
  in the shared cache.
- PR-024/RR-105: the browser aborts the legacy fetch, but server provider calls
  receive fixed timeouts rather than the request abort signal. Signed job-token
  cancellation covers only default-off asynchronous paths.

Covered-but-limited evidence includes TTL/capacity-bounded progress and
experimental completion stores, signed job cancellation, production-gated and
redacted debug logging, and E2E coverage for skip navigation, validation,
loading/cancel, error/empty states, safe links, and mobile/desktop rendering.
Tracked evidence does not establish CDN/WAF controls, production headers,
multi-instance ownership, health/liveness, deployment/rollback operations,
fresh dependency advisories, assistive technology, or real-device behavior.

## Current verification

| Check | Result |
| --- | --- |
| PR-6A main focused boundary wall | 97/97 across 14 suites |
| Independent consumer/route/progress wall | 72/72 |
| Independent hybrid-fetch wall | 29/29 |
| Independent typecheck | passed |
| Link-local fetch probe | both unsafe destinations intercepted; zero network |
| Oversized-query probe | 50,010 characters reached fake client creation |
| Cache-capacity probe | 512 unique zero-TTL keys retained |
| Independent PR-6A verdict | `VERIFIED`; confidence 0.98 |
| Last complete deterministic suite | PR-007: 1,604/1,604 across 218 suites |
| Last build / Playwright wall | PR-007: passed / 17 of 17 |
| PR-4B attempt-1 provider calls/artifacts | zero / zero |

PR-6A made no application or test-code change and did not relabel the PR-007
complete wall as newly executed. Exact audited source files matched baseline
commit `2db12ab44b690d3ad1e5f8646adffb7f3ab46037` throughout the audit.

Frozen PR-6A source anchors:

- `app/api/recommendations/route.ts`:
  `4af21d0a17aeb88bc393f5a1b3028f134e251c6c9c1e6d5f0f4df88108e64d3b`;
- `app/api/features/route.ts`:
  `99aa0689d69f1a0724937309f8cacfa902f91c01177dbd2997fa7c50f7b2aad5`;
- `lib/citationUrlVerification.ts`:
  `1daee436ee3a94a8fd09a7306f91d191817bf9b9437ad9e266ae124795ec6c29`;
- `lib/productAssets.ts`:
  `de3e7327d168c693e4948c04fc9de565680c2d19e4f0a4dc7c75f46e1545f8e9`;
- `lib/cache.ts`:
  `b6d7c13efeabd51d6e4505d13db50c231334912ee44f3286e65f1dd22e88990e`;
- `lib/autonomousFactVerifier.ts`:
  `3c2bd92d9ea3f3084819efc942e790ce3245e4169478f008f10ba7822a298ae6`;
- `lib/directTerraProductPageFetcher.ts`:
  `32657b4bf0c3aa7fcdd68a0effe8d2901425e2c63fe71c2fcafa28a7410c19c2`.

## Objective and decision frame

The product objective remains the strongest genuinely suitable products with
truthful requirements and evidence at acceptable latency and cost. The largest
quality uncertainty is PR-006, but it is blocked and grants no live authority.
The earliest currently actionable release blocker is PR-022/RR-103 because it
is reachable on the default route and can make server requests to destinations
that were never authorized as public.

Verified facts:

- two legacy consumers reproduce direct link-local fetch attempts without any
  provider or real network dependency;
- the default route reaches both consumers;
- the shared hybrid primitive already has private-address, redirect, timeout,
  byte, content, and pinned-address tests;
- a URL regex cannot evaluate DNS or redirect targets; and
- disabling the two legacy enrichment consumers would contain the exposure but
  reduce fallback page/image/citation quality.

Engineering judgment:

- reuse one shared DNS-pinned bounded transport instead of creating a second
  URL denylist or a legacy-only partial parser;
- preserve current source ownership, product identity, bot-wall/reachability,
  and best-effort enrichment semantics wherever they do not conflict with
  network safety;
- add explicit consumer concurrency ceilings so a safe destination check does
  not remain a fan-out exhaustion surface; and
- keep inbound admission/cache work and cancellation work in their own phases.

Uncertainty:

- hosted edge controls are not present in tracked configuration and were not
  inspected externally;
- exact production frequency and exploitability were not measured with a live
  attack and do not need to be;
- converting citation reachability to the shared transport must preserve the
  intentional 403/405/429/503 and timeout policy or explicitly justify a safer
  behavior change; and
- cache capacity remains unsafe after PR-6B unless separately corrected.

**Recommended reasoning level:** High for DNS pinning, redirect semantics,
SSRF containment, and source-level review; Medium for localized wrapper wiring,
focused tests, and routine documentation.

## Current approved phase: PR-6B / PR-022 outbound-fetch correction

This phase is local, zero-provider, zero-network, fail-first, and narrowly
scoped to RR-103. It does not authorize PR-023/PR-024 implementation.

1. Authenticate the intended repository, PR-6A closeout commit, tracked clean
   state, frozen source hashes, default route/flags, and no unexpected edits.
2. Add fail-first wrapper-level coverage for both legacy consumers:
   literal IPv4/IPv6 and mapped private/link-local/loopback values, a public-
   looking hostname resolving private, public-to-private redirects, credentials,
   non-default ports, non-HTTP schemes, redirect count, timeout, content type,
   declared/actual oversized bodies, bounded concurrency, and exact public HTML
   controls. Use injected deterministic transports only; no real network.
3. Reuse `fetchHybridSource()` or extract only the smallest shared transport
   wrapper needed by both consumers. Pin the validated address for each hop and
   revalidate every redirect. Do not use resolve-then-unpinned hostname fetch.
4. Preserve intentional citation semantics with explicit tests: 404/410 remain
   unreachable; established bot-wall statuses and timeout handling change only
   if the safer behavior is justified and documented. Preserve product identity,
   source ownership, HTML-only parsing, and best-effort missing-asset behavior.
5. Bound citation and product-enrichment fan-out with an existing or small
   shared concurrency helper. Do not implement global rate limiting, body
   parsing, cache eviction/coalescing, cancellation propagation, security
   headers, dependency upgrades, health checks, or deployment work here.
6. Run focused wrapper/hybrid/route/product-asset controls first, then typecheck,
   lint, complete unit suite, deterministic eval/partitions/benchmark, production
   build, and Playwright. Restore generated `next-env.d.ts` if build changes it.
7. Freeze the exact source/test manifest and obtain independent adversarial
   review. The reviewer must challenge DNS rebinding/TOCTOU, redirect handling,
   semantic regressions, fan-out limits, and incomplete consumer reachability.
8. If verified, update only authoritative records, move RR-103/PR-022 to Fixed,
   regenerate this handoff, and create one self-contained local commit.

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
- PR-022 / RR-103: default legacy untrusted outbound fetches bypass the bounded
  public-network transport. This is the active next blocker.
- PR-023 / RR-104: paid-route body/field/admission and bounded/coalesced cache
  controls remain Open after PR-6B.
- PR-024 / RR-105: legacy request cancellation is not connected to provider
  stages.
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
  explicit root-level test files; do not rely on slash-only filtering of
  Windows paths.
- Process residual: this PR-6A turn printed five spent-fixture filenames after
  a slash-only exclusion failed against backslashes. No content, hash, field,
  value, metadata, parse, or modification occurred. PR-4A already had two older
  filename-only deviations. Do not repeat either pattern.
- Do not retry or replace `broad-shop-vac:1`, invoke the direct runner, or
  advance to attempt 2. Absence of provider spend does not revive the consumed
  invocation.
- Do not make a real metadata/private-network request or run a live exploit.
  All SSRF proof uses injected deterministic DNS/transport seams.
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
| PR-6A canonical evidence and hashes | latest PR-6A entry in `docs/qa-loop-results.md` |
| PR-022/023/024 status and exit blockers | `docs/production-readiness-master-plan.md` |
| RR-103/104/105 records | bounded bottom sections of `docs/RR-Issues-Report.md` |
| Default route reachability | `app/api/recommendations/route.ts` |
| Unsafe citation consumer | `lib/citationUrlVerification.ts` |
| Unsafe page/asset consumer | `lib/productAssets.ts` |
| Existing safe transport | bounded fetch seam in `lib/autonomousFactVerifier.ts` |
| Existing page-fetch integration | `lib/directTerraProductPageFetcher.ts` |
| Shared concurrency helper | `mapWithConcurrency()` in `lib/recommendationPerformance.ts` |
| Standing guardrails and trust invariants | bounded sections of `docs/forward-roadmap.md` |
| Peer conclusion | latest entry in `docs/agent-dialogue.md` |

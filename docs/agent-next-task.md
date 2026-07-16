# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the failed H2B live oracle gate.
Architecture: `5edfb3d`. H1: `a9a46c6`. H2: `858ad9a`.
H2B preflight: `deac842`. H2B live evidence: untracked, hash below.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-H0 through failed H2B.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/hybrid route, flag, `.env.local`, or deployment
  change exists.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch then
  failed at `2/4` independently verified identities/destinations and exposed
  RR-092.
- Taylor approved H2B as exactly four Serper Shopping searches/four physical
  attempts. The runner executed once and reconciled exactly: four HTTP 200
  attempts, zero retries/fallbacks/replacements/cache/additional queries/direct
  page fetches/OpenAI calls/H3 work.
- The responses contained 121 Shopping rows (40, 40, 25, 16). Every URL exposed
  through `productLink`, `product_link`, or `link` was a Google wrapper. Twelve
  rows carried a target stable identifier, but none supplied a usable merchant
  destination. Miele and HZ4002 had no stable identifier in any returned title.
- The verifier accepted zero offers. Frozen-audit false accepts were therefore
  zero, but coverage was `0/4`, below the required `3/4`. H2B failed safely.
- Do not weaken the verifier to accept Google wrappers. They do not prove a
  merchant destination and would erase the trust boundary H2B was testing.
- RR-091 and RR-092 remain Needs Investigation. H2B cannot verify editorial
  prose and does not resolve the exact-tested-model defect.
- Register remains 92 total / 85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current flag state

- `.env.local` remains unmodified.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/hybrid production flag exists.
- Legacy remains the only user-visible path.

## Next task — owner architecture decision; no phase approved

Do not patch H2B, rerun Serper, or start H3. The same Serper Shopping response
shape cannot pass the merchant-destination gate. The next useful zero-live step,
if Taylor approves it, is a short architecture decision comparing:

1. stop the verified-hybrid branch and retain legacy;
2. evaluate documentation for one commerce provider class that explicitly
   exposes exact model identifiers and merchant product URLs before spending;
3. accept fewer verified cards from direct fetch, acknowledging H2's `2/4`
   usefulness failure.

The recommended direction is option 2 only if a provider can prove those fields
without rebuilding discovery, ranking, rescue, and synthesis. Otherwise end the
branch. Another Serper query variation is not evidence-backed.

**Recommended reasoning level: Highest.** This is no longer mechanical coding;
it is a make-or-break architecture choice about whether independent verification
can remain smaller than the old pipeline.

## Hard boundaries

- No live provider call is currently approved. The four-search H2B approval is
  fully spent and cannot be reused.
- The H2B evidence path now exists; the runner must continue refusing a rerun.
- No OpenAI call, direct page fetch, endpoint fallback, retry, cache, additional
  query, product substitution, discovery, rescue, scoring, or reordering.
- H3, integration, route/mode flag, `.env.local`, deployment, quality window,
  holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, or raw provider
  responses. The H2B artifact is sanitized and remains untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[53] ask Claude to challenge H0/H1/H2/H2B and whether any smaller
  independent verifier remains. Evidence-backed objections must be resolved
  before any H3 or replacement-provider decision.

## Verification

- H2B live actual: 4 logical searches / 4 physical attempts / 4 HTTP 200;
  121 sanitized rows; 0 verified offers; mechanical gate `0/4` versus `3/4`.
- Evidence SHA-256:
  `224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.
- Evidence inspection found no API key, header, cookie, or credential fields.
- Preflight focused verifier tests passed 11/11; full suite passed 1004/1004
  across 138 suites; typecheck, build, offline evaluation, and diff checks
  passed; lint had zero errors and the same three pre-existing warnings.
- Production behavior was not changed by H2B; no post-live behavior wall was
  required for this evidence/docs closeout.

## Retrieval map

| Need | Retrieve |
|---|---|
| H2B contract and failed live actual | `docs/forward-roadmap.md` H2B section |
| Canonical live result | latest `docs/qa-loop-results.md` H2B entry |
| Sanitized evidence | untracked H2B fixture path in the QA entry |
| Commerce verifier | `lib/autonomousCommerceVerifier.ts` |
| No-retry runner | `scripts/run-oai-h2b-commerce-oracle.mjs` |
| Adversarial tests | `tests/autonomousCommerceVerifier.test.mjs` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

# ReviewRadar Agent Handoff

Updated: 2026-08-29 by Codex after production-readiness phases PR-0/PR-1.
The scoped closeout is the commit containing this regenerated handoff; use
`git log -1` after commit creation for its immutable SHA.

## Current state

ReviewRadar is **not production-ready**. The tracked starting point for this
run was `dc9ab1fa1d85608e39cf29b5603d0c59692beb29` on `main`. PR-0 and PR-1 are
verified locally and ready for one self-contained closeout commit:

1. Playwright owns a dedicated non-reused server at `127.0.0.1:3100`, forces
   committed legacy/default-off routing, and neutralizes OpenAI, Serper,
   SearchAPI, and job-token credentials.
2. The preview E2E assertion follows the current `View at <host>` accessible
   name and still requires safe new-tab link attributes.
3. Failed staged research diagnostics retain only the four closed validation
   classes already produced by the validator. Arbitrary values and private
   provider material remain discarded and never enter the client response.
4. Phase D cost accounting includes terminal usage after local validation
   failure. Repeated snapshots merge only when their nonempty response hashes
   match; distinct or unidentifiable responses sum conservatively, and any
   duplicate terminal activity blocks successful acceptance.

The historical Phase D `shop vac` attempt remains failed and immutable. Current
code replays its usage as 21,932 input tokens, 5,318 output tokens, two hosted
searches, `$0.154600` standard, and `$0.168307` conservative cost. Its missing
validation class cannot be recovered retroactively and must not be guessed.

## Verification result

- fail-first staged proof: exactly 2 intended failures;
- focused staged wall: 33/33 across 7 suites;
- complete suite: 1,435/1,435 across 209 suites;
- E2E: 17/17 on the credential-neutral dedicated server;
- typecheck: pass;
- production build: pass;
- lint: 0 errors and 3 pre-existing warnings;
- deterministic eval: no red flags;
- fixed ranking comparison: pass, order unchanged;
- Phase D dry run: pass with zero network; and
- independent read-only review: `APPROVED` after credential-inheritance and
  distinct-response accounting findings were corrected.

No OpenAI, Serper, SearchAPI, source-page, or other external request ran during
PR-0/PR-1. No `.env.local` edit, flag promotion, deployment, production change,
push, issue-status mutation, or user-owned artifact cleanup occurred.

## Current approved next phase

Phase PR-2 is one commit-pinned staged-Terra feasibility recheck using only the
already frozen broad request `{ "query": "shop vac" }` and the existing Phase D
ceilings:

- 2 OpenAI creates;
- 10 hosted searches;
- 60 retrieves;
- 1 safety cancel;
- 15 Serper Shopping attempts;
- 30 DNS-pinned source-page fetches;
- 90 physical page HTTP attempts including redirects; and
- `$3.00` estimated OpenAI cost.

Prerequisites are the exact PR-0/PR-1 closeout commit, clean tracked state,
process-only OpenAI and Serper keys, and an unused commit-specific evidence
directory. Stop at the first terminal outcome. No retry, replacement, fallback,
additional case, SearchAPI call, Serper organic call, flag promotion,
deployment, production change, or push is part of PR-2.

If research fails, use only its retained validation class to choose a prompt,
schema, adapter, or duplicate-identity correction. Do not infer a downstream
accuracy cause from a pre-verification failure. If feasibility succeeds, it
still proves only real provider/lifecycle viability, not quality, stability, or
production readiness.

**Recommended reasoning level:** High for terminal-outcome adjudication because
it crosses provider completion, structured validation, privacy, and spending
boundaries. The single runner execution itself is routine.

## Approval and flag state

Taylor's 2026-08-29 production-readiness mandate authorizes ordinary scoped
local implementation, bounded low-parallelism live QA, documentation, and
self-contained local commits. It does not authorize deployment, production
mutation, push, publication, secret exposure, destructive cleanup, or broader
external spending.

Committed defaults remain:

- `REVIEW_RADAR_STAGED_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA=false`
- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- staged research/presentation model: `gpt-5.6-terra`

The developer's ignored `.env.local` still locally enables Direct Terra. It is
user-owned and must not be edited or staged. E2E now overrides it hermetically.

## Outstanding readiness debts

- PR-005: five named deterministic QA workers still execute the same shared
  synthetic evaluator rather than their listed category batches.
- PR-006: current live leader recall, final-set stability, hard-requirement
  truth, first-loss distribution, latency, calls, and cost are unmeasured.
- PR-007 / RR-091: same-page related-product price binding needs a tracked
  multi-entity reproduction and generalized exact-offer proof.
- PR-008 / RR-092: editorial Product markup can overstate tested-model
  identity/image authority on an experimental path.
- Broader lifecycle, cache/concurrency, security, accessibility, mobile UX,
  production configuration, rollback, and observability gates remain planned
  in `docs/production-readiness-master-plan.md`.

## Hard boundaries

- Do not weaken candidate-count, exact-source, identity, requirement,
  duplicate, eligibility, product-type, sibling/accessory, editorial/support,
  redirect, private-network, price, or wrong-image gates.
- Do not retain raw model responses, provider IDs, prompts, source URLs,
  fetched bodies, request headers, credentials, or secrets in diagnostics.
- Do not retry the historical `ec528d7` attempt or reuse its evidence path.
- Do not hardcode leaders or add product-, brand-, category-, retailer-, or
  fixture-specific behavior.
- Do not claim product-quality improvement from PR-0/PR-1; they repair test and
  evidence integrity only.
- Never stage the existing `.claude/`, `.rr_baseline*`, `fable-transfer-kit/`,
  historical live fixtures, or a new live fixture. Never use `git add -A`.
- No deployment, production change, push, publication, destructive action, or
  external scope expansion is authorized.

## Retrieval map

| Need | Retrieve |
| --- | --- |
| Living objective, defects, phases, proof, and exit criteria | `docs/production-readiness-master-plan.md` |
| PR-0/PR-1 canonical verification | latest 2026-08-29 entry in `docs/qa-loop-results.md` |
| Durable live-test and accounting contract | top of `docs/review-radar-test-memory.md` |
| Staged research validator and reason set | `lib/stagedTerraContract.ts` |
| Safe route propagation | `lib/stagedTerraRecommendationRoute.ts` |
| Phase D accounting and frozen envelope | `scripts/oai-t10-phase-d.mjs` |
| Dry-run/live approval gate | `scripts/run-oai-t10-phase-d.mjs` |
| Historical sanitized result | `tests/fixtures/review-radar-live/oai-t10-phase-d-ec528d7/attempt.json` |
| Architecture | staged Terra section in `ReviewRadar-Overview.md` and OAI-T10 in `docs/forward-roadmap.md` |

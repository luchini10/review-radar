# ReviewRadar Agent Handoff

Updated: 2026-07-19 by Codex after the zero-live T6D report-quality audit and
reviewed OAI-T7A saved-slate transactional-feasibility preflight. The phase is
committed under the subject `Prepare transactional offer feasibility probe`.
No live call, further commit, flag change, `.env.local` change, V2
schema/route/UI integration, deployment, push, or production change is
approved.

## Efficient session start

1. Read repository `AGENTS.md` and this handoff in full.
2. Preserve every untracked fixture and unrelated user artifact.
3. Inspect only the latest T6D/T7A QA and dialogue entries [78]-[79] unless older
   evidence is necessary.
4. Never reuse the spent T6D approval or the earlier H2C approval.

## Product objective and current V2 architecture

The immediate objective is to keep Terra's selected products, order,
explanations, and citations intact while independently verifying only current
checkout facts. The working V2 product path remains unchanged:

```text
shopper fields
  -> /api/recommendations-v2
  -> one Terra/high response with hosted web search
  -> strict JSON { report_markdown }
  -> response-owned citation allowlist
  -> unchanged report with commerce labeled unverified
```

The prospective verifier is not integrated. It may eventually add a separate
exact offer receipt without selecting, replacing, deleting, merging, or
reranking a Terra recommendation.

## T6D live result and zero-live quality audit

The exact `97a2a96` T6D smoke passed with one Terra/high create, 25 retrieves,
seven hosted searches, zero cancel/retry/fallback/other-provider calls, 71,691
tokens, 133,071 ms wall time, and an estimated `$0.4323525`. The saved fixture
contains a 30,916-character report, 15 active citations across 11 hosts, zero
disabled citations, and `transactionalStatus: unverified`.

The report recommends five legitimate exact-model shop vacs. It is useful and
candid, but only two recommendations include price prose and neither is
independently verified. Evidence is strongest for DEWALT `DXV12P-QT`; the other
four disclose exact-model testing or owner-evidence limitations. No static
audit can prove current page contents or price freshness without a later live
provider check.

The frozen 07c matcher mechanically counts `5/7`, but its `shop vac` brand row
matches generic product-type words in the CRAFTSMAN title. Semantic coverage is
four of seven core brands plus the acceptable Milwaukee alternate. The
benchmark was not changed.

## OAI-T7A zero-live preflight complete

`scripts/run-oai-t7a-transactional-feasibility.mjs` freezes the T6D report and
these exact Shopping queries:

1. `DEWALT DXV12P-QT shop vac`
2. `CRAFTSMAN CMXEVBE17595 shop vac`
3. `Vacmaster VFB511B 0202 shop vac`
4. `RIDGID HD1600 shop vac`
5. `Milwaukee 0910-20 shop vac`

The runner is dry by default. Any later live execution requires a separately
approved commit plus the exact approval ID and ten-attempt ceiling. It permits
five SearchAPI Shopping calls and at most five Product Offers calls, only after
an exact token selection. It allows zero retry, replacement, fallback,
additional query, OpenAI, Serper, or direct page fetch. It checkpoints before
each attempt, hashes product tokens, saves no raw response/key/header, and
canonicalizes conservative tracking parameters from retained offer URLs. It
refuses a dirty tracked tree, changed source fixture, commit mismatch, or
existing evidence path before key lookup.

The pass rule is at least three of five exact verified offers and a frozen
human audit finding zero wrong product/model/variant/accessory, condition,
stock, seller, price, or destination bindings. An inconclusive product remains
in Terra's report with unverified commerce.

## Verification

- focused commerce/T7A coverage: 29/29 across three suites;
- complete `npm test`: 1167/1167 across 165 suites;
- `npm run typecheck`: pass;
- `npm run lint -- --max-warnings=10`: zero errors, three pre-existing warnings;
- `npm run build`: pass, including `/api/recommendations-v2`;
- `node scripts/eval-pipeline.mjs`: no red flags;
- T7A dry-run: exact frozen plan, no evidence output; and
- missing-approval execution control: refused before key lookup, no output.

Zero live call or direct page open occurred during the audit/preflight.

## Flags and working tree

- Both direct-Terra flags remain default-off in `.env.example` and absent from
  `.env.local`.
- Pre-phase HEAD was `97a2a96` (`Preserve Terra reports with granular citation
  safety`). Use `git log -1` for the T7A phase commit hash.
- The T7A code/tests/docs were reviewed before the explicit-path phase commit.
- The T6D fixture and older live fixtures remain untracked and must not be
  staged. Never use `git add -A`.

## Strongest next decision

Taylor may separately approve one SearchAPI feasibility run
pinned to that commit: five Shopping requests plus at most five token-bound
Offers requests, ten physical attempts as both planning basis and hard ceiling,
no retry/replacement/fallback/additional query/OpenAI/Serper/direct page open,
and stop after the first completed evidence set.

Do not add the V2 `commerce_targets` sidecar or integrate a verifier into the
route/UI until this feasibility probe passes. If fewer than three exact offers
verify, or one unsafe binding is found, stop and reconsider the provider rather
than tuning queries during the same phase.

**Recommended reasoning level:** High for diff review and the later mechanical
probe. Exact-model, price, stock, and destination binding need careful audit;
maximum reasoning is unnecessary unless live data exposes a new provider shape.

## Hard boundaries

- No SearchAPI, OpenAI, Serper, direct-page, or other live call without a new
  exact numeric approval pinned to a commit.
- No commit, push, sidecar, route/UI integration, flag promotion, `.env.local`
  edit, deployment, publication, or production change without separate
  approval.
- Never let commerce failure delete, replace, reorder, or rewrite Terra's
  recommendation report.
- Never label seller, price, stock, currency, or purchase destination verified
  unless one exact receipt passes the independent boundary.
- Never retain or expose keys, headers, raw provider responses, product tokens,
  provider IDs, or job-token contents.
- Do not delete the legacy or prior two-layer paths without later rollback
  evidence and explicit retirement approval.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current state and next approval | this file |
| T6D audit/T7A verification | latest `docs/qa-loop-results.md` entry |
| Peer review request | `docs/agent-dialogue.md` entries [78]-[79] |
| Frozen runner | `scripts/run-oai-t7a-transactional-feasibility.mjs` |
| New tests | `tests/oaiT7aTransactionalFeasibility.test.mjs` |
| Existing exact-offer verifier | `lib/autonomousCommerceVerifier.ts` |
| Saved T6D report | `tests/fixtures/review-radar-live/oai-t6d-v2-citation-granular-smoke-97a2a96/broad-shop-vac.run1.json` |

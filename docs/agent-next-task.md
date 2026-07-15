# ReviewRadar Agent Handoff

Updated: 2026-07-15 by 🟧 Codex after the blocked OAI-2A Terra feasibility
attempt. No live work is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [42] onward.
5. Before any new live approval, re-check the current OpenAI model/tool prices
   and account availability.

## Current state

- OAI-0 is `3dc1131`; OAI-1 is committed as `883cfac`; the OAI-2A harness and
  offline corrections are committed as `9fc4eda`.
- Production behavior is unchanged. The OAI modules and runner are isolated;
  the production recommendation route, UI, flags, `.env.local`, deployment,
  and user-visible output did not change.
- OAI-1 remains the frozen prompt/schema/evidence foundation. Its historical
  audit is M3 supplemental evidence only and does not prove autonomous quality.
- The approved OAI-2A target changed from Sol to `gpt-5.6-terra` at `high`
  reasoning. Published 2026-07-15 rates used for planning are $2.50/M standard
  input, $0.25/M cached input, $15/M output, and $0.01 hosted-search call; over
  272k input tokens the request uses 2x input and 1.5x output rates. The
  four-create-call planning ceiling was $20.
- Preflight found and closed three experiment-integrity holes before spend:
  SDK retries are explicitly disabled for the runner
  (`scripts/run-oai-2a.mjs:141-145`); legacy constraint-allocation flags no
  longer change Call 1 routing (`lib/autonomousResearchContract.ts:427-433`);
  and meaning-preserving Call 1 output now has a deterministic bridge into Call
  2 (`lib/autonomousResearchContract.ts:536-594`).
- Two preflight invocations stopped before client creation because the original
  runner compared flag-off test routing with flag-on `.env.local` routing.
  They dispatched zero OpenAI or Serper requests and created no evidence files.
- The first real Terra research create was dispatched for `primary-01` broad
  vacuum. It failed at the API boundary after 1,280 ms with no response ID,
  returned model, token usage, hosted-search call, source, output, or retrieval
  poll. The runner stopped; `primary-04`, Call 1, and `primary-12` were never
  sent. No returned-source page was opened.
- Exact untracked evidence is in
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/primary-01.json`
  and `summary.json`. It records one create call, request hash
  `09a446a3daa43f2650f92567253715e49bff0543247ce88bc33141b2ac676d62`,
  normalized-request hash
  `d6bb5bf35e22e16b9bedf821bd4142fe1dabbf3913404cb778c80f60fb3498c8`,
  zero hosted searches, and zero reported usage. Actual provider billing cannot
  be proven from the failed response and is not represented as known zero.
- The original adapter retained only `Error`, so the exact API status/message
  cannot be recovered. Static postmortem found a concrete incompatibility:
  strict schema used unsupported `format: "uri"`. The API schema now omits that
  keyword while local Zod URL validation remains (`lib/autonomousResearchContract.ts:39,75,81,211-215,321`).
  Future request errors retain only sanitized status/code/param/type/message
  diagnostics (`lib/autonomousResearchAdapter.ts:186-208`). This correction is
  offline-verified but has not been confirmed by another live call.
- OAI-2A is **blocked, not passed and not an architecture-quality failure**.
  No autonomous slate or evidence exists to score. OAI-2B must not start.
- Final verification after the offline correction: 966/966 tests across 132
  suites, typecheck, build, and `git diff --check` pass; lint has 0 errors and
  3 pre-existing warnings.
- Issue register remains unchanged at 90 total / 85 Fixed / 4 Needs
  Investigation / 1 Won't Fix.

## Next task — explicit approval required

Run one replacement **technical smoke only** for frozen case `primary-01` using
the corrected strict schema and the same Terra/high configuration. This is the
smallest decision-useful next step: it distinguishes the fixed payload from an
account/model-access problem before spending on the other two cases.

Proposed approval boundary:

- one OpenAI research create call;
- `gpt-5.6-terra`, `high`, 24,000 output-token ceiling;
- at most 20 hosted web-search calls;
- $7 conservative planning ceiling (one maximum long-context Terra response,
  maximum output, and all 20 search calls);
- zero Serper calls, retries, replacements, fallback, or model substitution;
- bounded human opening of only source pages returned by that response;
- stop and report after this one case whether it succeeds or fails;
- do not send `primary-04`, Call 1, `primary-12`, or begin OAI-2B.

If the smoke request succeeds technically, inspect and report its source
binding and card safety, then ask separately whether to complete the remaining
OAI-2A cases. If it fails, use the newly captured sanitized API diagnostics and
stop; do not spend around the failure.

**Recommended reasoning level: High.** The next action is a tightly bounded
technical confirmation with predeclared stopping rules. Use Highest only if a
successful response produces disputed semantic source support.

## Hard boundaries

- No live OpenAI/Serper call, source-page opening, external product fetch,
  replacement, retry, or model substitution without Taylor's new explicit
  approval.
- The prior four-call approval is exhausted by its stop condition; three
  undispatched calls do not carry forward.
- No OAI-2B, permanent verifier, route integration, flag promotion,
  `.env.local` edit, production behavior, deployment, or threshold change.
- The selected OAI path sends no Serper request or app-authored search plan or
  candidate list. The model controls hosted search inside its one response.
- Every displayable fact must bind to same-response source metadata; URL
  membership does not prove semantic support.
- The verifier may reject, downgrade, normalize, exact-dedupe, or clear unsafe
  optional fields. It may not discover, invent, rescue, score, add, or reorder
  products.
- Preserve generalized price, citation, requirement, product-type, identity,
  image, eligibility, dedupe, URL, source-quality, and hard-constraint gates.
- No benchmark leader may enter prompts, requests, code paths, ranking,
  validation, or behavior tests.
- Live evidence and pre-existing untracked artifacts stay untracked. Stage
  explicit files only; never use `git add -A`.
- One phase per explicit approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [37] still asks Claude to verify the post-C5 safety repair.
- Entry [42] asks Claude to challenge the OAI-2A failure attribution, the
  strict-schema correction, and the one-call replacement recommendation.
- Taylor remains the sole approver for commits, live spend, source-page opens,
  model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| OAI-2A failure evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15/` |
| Request/response harness | `scripts/run-oai-2a.mjs` and `lib/autonomousResearchAdapter.ts` |
| Prompt/schema/interpreter contract | `lib/autonomousResearchContract.ts` |
| Frozen cases | `lib/autonomousResearchEvaluation.ts` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [42] onward |

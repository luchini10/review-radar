# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the final corrected OAI-2A v2
`primary-01` Terra/high smoke. No live work is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`.
4. Read `docs/agent-dialogue.md` from entry [44] onward.
5. Before any future OpenAI call or external source-page open, re-check the
   exact approval boundary and current official model/tool prices.

## Current state

- Active OAI milestones are OAI-0 `3dc1131`, OAI-1 `883cfac`, initial
  OAI-2A harness/correction `9fc4eda`, v1 smoke harness `8502df8`, v2
  contract repair `191c2a3`, isolated v2 harness `ca33e32`, lifecycle
  repair `1d7a300`, and final isolated smoke harness `a0c9a35`.
- Production behavior remains unchanged. The autonomous modules and runner
  remain isolated; the production route, UI, flags, `.env.local`, deployment,
  and user-visible output did not change.
- Taylor's final corrected live approval is exhausted. Exactly one
  `gpt-5.6-terra` create ran at `high`; Call 1 was deterministically skipped.
  It completed in 134,580 ms after 25 retrieval polls on the same response.
- Returned usage was 95,901 input tokens, zero cached input tokens, 22,805
  output tokens, and 118,706 total tokens. The response used 10 hosted web
  searches. Estimated cost from returned usage was $0.6818275.
- No Serper request, SDK retry, replacement, fallback, model substitution,
  additional case, external source-page open, or OAI-2B action occurred.
- The returned model matched Terra. The strict local v2 boundary accepted the
  response. All four cards passed the only active requirement,
  `rr-system-market-us`; all identities were distinct and were vacuum
  products; every non-null price and product URL bound to a same-response
  `purchase_page`.
- The slate contained three Best Matches and one Close Match: Shark AZ4002
  ($599.99), Miele Guard L1 Cat & Dog 12704570/SUZE0 ($899), Shark HZ4002
  ($319.99), and Dyson V16 Piston Animal ($979.99).
- The response exposed 187 source occurrences / 173 distinct registered URLs.
  All 10 slate source URLs were present in that same response, all 10 source
  IDs were used, and none was missing from the slate registry. The 10 sources
  span eight hosts. No image URL was returned for any card.
- This is a technical/source-membership pass for one broad case, not a
  migration or quality pass. No external page was opened, so exact prices,
  availability, and semantic claim support remain independently unverified.
  One run cannot establish stability, and no frozen generic-vacuum leader
  denominator exists, so no leader-recall claim is valid.
- Pre-spend verification passed: focused runner test and v3 preflight; 982/982
  tests across 135 suites; typecheck; lint with zero errors and the same three
  unrelated warnings; production build; offline evaluation; and diff checks.
- The sanitized evidence is preserved untracked at
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/`.
  Earlier spent evidence remains untouched.
- Issue register remains 90 total / 85 Fixed / 4 Needs Investigation / 1 Won't
  Fix. This isolated experiment did not prove a generalized production defect
  and did not change issue status.

## Recommended next task — explicit approval required

Run one bounded OAI-2A source-truth and usefulness audit before purchasing more
research responses:

1. Zero OpenAI creates and zero Serper calls.
2. Open at most the 10 source pages already cited by this accepted response;
   do not search for, rescue, or substitute products.
3. Verify exact product identity, current purchase-page shape, displayed
   price/availability, and whether each cited source semantically supports the
   claims bound to it.
4. Separately judge the slate's shopper usefulness and market breadth,
   explicitly accounting for only three Best Matches, two Shark entries, one
   expensive Close Match, and no images. Do not invent a leader-recall score.
5. Classify the result: pass to the remaining OAI-2A cases, repair a
   demonstrated generalized prompt/validator defect offline, or stop the
   migration bet. Record unsupported claims rather than silently correcting
   them.
6. Stop and report. Any later `primary-04` or `primary-12` create needs a
   new explicit approval.

This is stronger than immediately running more cases because the corrected
adapter has already answered the transport and source-completeness question.
The largest remaining uncertainty is whether the accepted citations actually
support the card facts and whether the result is useful enough to justify more
evidence spend.

**Recommended reasoning level: High.** This is a bounded evidence audit with
an architecture go/no-go consequence. Highest is unnecessary unless the
source evidence is contradictory enough to require a disputed policy change.

## Hard boundaries

- No OpenAI or Serper call, response retrieval, external source-page open,
  retry, replacement, fallback, model substitution, or additional case
  without new explicit approval.
- No OAI-2B, permanent network verifier, production integration, flag
  promotion, `.env.local` edit, deployment, or user-visible behavior change.
- The OpenAI path sends no Serper request, app-authored search plan, or
  candidate list. The model controls hosted search inside its response.
- Same-response URL membership is necessary but does not prove semantic
  support. Every displayed fact must bind to evidence that actually supports
  it before promotion.
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

- Dialogue entry [37] asks Claude to verify the post-C5 safety repair.
- Entries [42]–[46] ask Claude to review the OAI-2A failure diagnoses and
  lifecycle repair.
- Entry [47] asks Claude to challenge this accepted smoke and the recommended
  source-truth audit before further spend.
- Taylor remains the sole approver for live spend, response/source retrieval,
  source-page opens, model/config changes, promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active architecture and gates | `docs/forward-roadmap.md` active OAI section |
| V2 request/prompt/schema contract | `lib/autonomousResearchContract.ts` |
| Background polling and source validation | `lib/autonomousResearchAdapter.ts` |
| Final smoke runner/preflight | `scripts/run-oai-2a.mjs` and `tests/oai2aRunner.test.mjs` |
| Latest smoke evidence | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/` |
| Canonical phase evidence | latest `docs/qa-loop-results.md` entry |
| Peer review | `docs/agent-dialogue.md` entry [44] onward |

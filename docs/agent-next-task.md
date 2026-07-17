# ReviewRadar Agent Handoff

Updated: 2026-07-17 by 🟧 Codex after the local OAI-T1 two-layer trust-boundary implementation.
OAI-T1 is committed in the current history. Its prior diagnostic baseline was
`ddab458` (`docs: record unguarded Terra diagnostic`).

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` at OAI-H0 through OAI-T1.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable, H3 as blocked,
   and OAI-T2 as unapproved.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/two-layer route, flag, deployment, or visible
  behavior changed.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`; H2B Serper Shopping failed safely at `0/4`; and H2C SearchAPI
  Shopping-to-Offers failed safely at `2/4`, below its frozen `3/4` gate.
- The unguarded Terra/high diagnostic showed that OpenAI-led ranking and
  explanation can produce much stronger recommendation UX, but it also bound an
  AZ4002 price to a Best Buy review page and mixed Dyson evidence across color/
  listing variants. Source-registry membership did not prove exact field truth.
- Taylor approved the first zero-live two-layer step.
  `lib/twoLayerRecommendation.ts` now defines strict extraction, trust, receipt,
  and card contracts. `tests/twoLayerRecommendation.test.mjs` provides 11
  adversarial controls.
- The formatting boundary checks the natural-answer SHA-256, requires all
  recommendation identity/prose strings to be verbatim substrings, preserves
  the raw recommendation order, resolves every source ID, and requires every
  source URL to exist in the same API response registry. The model-owned schema
  cannot contain price, seller, availability, retailer URL, or image.
- The receipt boundary cannot add, delete, substitute, rescue, score, or reorder
  a recommendation. Exact receipts may attach exact identity, price, seller,
  availability, direct product URL, and image only when target and observed
  identity fingerprints agree and the URL passes the existing direct-product
  eligibility gate.
- A failed receipt leaves the recommendation visible with `Check current price`,
  no unverified image, and an exact-model/variant-not-independently-verified
  label. Editorial and owner claims are only `Source-reported` with evidence
  scope; OAI-T1 does not claim semantic verification for RR-092.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total / 85
  Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-side
  in ignored `.env.local`. Never print, log, copy into evidence, or commit them.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/two-layer production flag exists.
- Legacy remains the only user-visible path.

## Next task — owner decision; no live work approved

The strongest next candidate is OAI-T2: an isolated,
extraction-only formatter prototype over saved Terra evidence. It should use no
web tool, add no facts, and pass its output through the OAI-T1 validator before
card construction. It must not connect to the route or make a live research
call. OAI-T2 requires a separate owner approval after Claude's challenge of
entry [58] or an explicit owner decision to proceed without that peer review.

**Recommended reasoning level:** High. OAI-T1 froze the architectural judgment;
the next work is a bounded provenance-preserving formatter and adversarial test
exercise. Highest is useful only if the RR-092 display policy is reopened.

## Hard boundaries

- No live provider call is approved. All earlier OpenAI, Serper, SearchAPI, and
  direct-fetch approvals are spent.
- Do not rerun or retune the unguarded diagnostic, H2, H2B, or H2C; do not try a
  replacement provider or weaken exact identity.
- No OAI-T2, formatting API call, web search, external page fetch, H3,
  integration, route/mode flag, `.env.local` change, deployment, quality window,
  holdout, promotion, or cleanup without separate explicit approval.
- Never persist API keys, credentials, request headers, cookies, or complete raw
  provider/API responses. Evidence remains sanitized and untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked. Stage
  explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]-[57] still await Claude's review of the OAI lifecycle and
  unguarded diagnostic conclusions.
- Entry [58] asks Claude to challenge OAI-T1's formatter-meaning boundary,
  labeled exact-identity presentation, and RR-092 `source_reported` policy.
- Peer dialogue is advisory and does not authorize a commit, phase, live call,
  or behavior change. Taylor remains the sole approver.

## Verification

- Focused OAI-T1 wall: 11/11.
- Complete wall: 1028/1028 across 140 suites.
- `npm run typecheck`: pass.
- `npm run lint -- lib/twoLayerRecommendation.ts tests/twoLayerRecommendation.test.mjs`:
  pass.
- `npm run build`: pass.
- `node scripts/eval-pipeline.mjs`: pass, no red flags.
- `git diff --check`: pass before documentation completion; rerun at handoff.
- Zero OpenAI, Serper, SearchAPI, external page, or other network calls occurred
  in OAI-T1.

## Retrieval map

| Need | Retrieve |
|---|---|
| OAI-T1 contract and result | latest OAI-T1 section in `docs/forward-roadmap.md` |
| OAI-T1 implementation | `lib/twoLayerRecommendation.ts` |
| OAI-T1 adversarial wall | `tests/twoLayerRecommendation.test.mjs` |
| Canonical phase result | latest entry in `docs/qa-loop-results.md` |
| Durable trust rules | latest entry in `docs/review-radar-test-memory.md` |
| Peer challenge | `docs/agent-dialogue.md` entry [58] |
| Unguarded diagnostic | prior entry in `docs/qa-loop-results.md` |
| Sanitized diagnostic evidence | untracked `tests/fixtures/review-radar-live/oai-terra-unguarded-2026-07-17-primary-01/result.json` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |

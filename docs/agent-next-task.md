# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after OAI-H0 architecture freeze.
Architecture commit: `5edfb3d`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-2A's actual failure through the
   active OAI-H0/H1/H2 replacement plan.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat OAI-2B through OAI-10 as historical/unreachable. Do not resume them.

## Current state

- Production and the current route remain unchanged. OAI-H0 was docs only and
  made no API call, external fetch, flag, `.env.local`, deployment, or
  user-visible change.
- The direct-to-display OAI-2A architecture remains failed. Its HZ4002
  cross-product price, AZ4002/AZ405KT1 cross-model evidence, Miele dealer-only
  action, and unavailable Dyson review data remain the frozen adversarial set.
- Taylor approved a different hybrid experiment through H2. OpenAI owns
  discovery, product selection, ranking, and source-bound narrative. A bounded
  verifier is authoritative for displayed identity, price, seller, purchase
  destination, availability, image, and owner-rating/count facts.
- The verifier may materialize an independently observed transactional value
  only from evidence attached to the same exact product entity. It may not
  discover, add, rescue, rank, reorder, narrate, or infer an uncertain identity.
- H1 is offline. H2 may fetch only the ten already-returned `primary-01` source
  URLs, once each, with at most two redirects and 30 total HTTP attempts. H2
  permits zero OpenAI, Serper, response retrieval, search, retry, or replacement.
- No H2B provider contingency, H3 integration, quality sample, holdout,
  promotion, or cleanup is approved.
- Issue register remains 91 total / 85 Fixed / 5 Needs Investigation / 1 Won't
  Fix. RR-091 remains High / Needs Investigation until evidence proves the new
  boundary prevents same-page cross-product fact binding.

## Current flag state

- `.env.local` remains unmodified.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- The autonomous/hybrid path is isolated and has no production mode flag yet.
- Legacy remains the only user-visible path and rollback baseline.

## Next approved task — H1

Implement the offline verifier contract and mocked boundary exactly as frozen
in OAI-H0:

1. Add generalized observation and reason-coded verification contracts.
2. Separate page extraction from verification policy.
3. Reproduce HZ4002 neighboring-price, AZ4002/AZ405KT1 cross-model,
   Miele dealer-only, and Dyson missing-rating behavior in fail-first fixtures.
4. Add the mocked safe-fetch seam and its HTTP(S), redirect, timeout, byte,
   content-type, DNS/IP, credential, and logging boundaries without dispatching
   any external request.
5. Prove safe facts survive while unsafe fields are contradicted, cleared, or
   honestly marked inconclusive; no branch may discover, rank, rescue, or
   narrate.
6. Run focused tests, the complete test wall, typecheck, lint, build, offline
   evaluation, and diff checks. Commit H1 separately before H2.

After H1 passes, proceed to the separately scoped H2 ten-source fetch gate that
Taylor approved in the same kickoff. Stop before any H2B/H3 decision.

**Recommended reasoning level: Highest for H1.** The implementation defines
the exact-product and exact-offer trust boundary. H2 collection can use High,
but its feasibility judgment returns to Highest.

## Hard boundaries

- H1: zero OpenAI, Serper, response retrieval, external fetch, route, flag,
  `.env.local`, deployment, or user-visible change.
- H2: only the ten registered source URLs; ten top-level fetches, no retry, at
  most two redirects each, and no more than 30 physical HTTP attempts.
- Never log or persist credentials, cookies, headers, full page bodies, model
  reasoning, or raw OpenAI responses.
- No product-, retailer-, brand-, category-, or fixture-specific production
  rule. A need for such a rule is an H1/H2 failure signal.
- Model output cannot establish transactional truth merely by citing a URL.
  Values must bind to the independently verified exact product entity.
- No benchmark answer enters prompts, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.
- H3 and all later behavior work require a new owner decision after H2.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle, accepted
  smoke, failed source audit, and architecture stop.
- Entry [49] asks Claude to challenge the new authoritative-facts boundary and
  H1/H2 gates. This review does not block Taylor's explicit H1/H2 approval, but
  any evidence-backed objection must be resolved before H3.

## Verification at H0

- `git diff --check` passed for the architecture amendment.
- Architecture commit `5edfb3d` modified only `docs/forward-roadmap.md`.
- No test wall was necessary for the behaviorless docs-only amendment; H1 must
  run the complete wall before H2.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active hybrid contract and H1/H2 gates | `docs/forward-roadmap.md` OAI-H0 section |
| Failed direct-display evidence | latest `docs/qa-loop-results.md` OAI-2A audit |
| Same-page price defect | `docs/RR-Issues-Report.md` RR-091 |
| Accepted slate/source URLs | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json` |
| Current mechanical validator | `lib/autonomousResearchAdapter.ts` |
| Current output/trust contract | `lib/autonomousResearchContract.ts` |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

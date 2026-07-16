# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after OAI-H1 verifier implementation.
Architecture commit: `5edfb3d`. H1 code commit: `a9a46c6`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-2A's actual failure through the
   active OAI-H0/H1/H2 replacement plan.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat OAI-2B through OAI-10 as historical/unreachable. Do not resume them.

## Current state

- Production and the current route remain unchanged. OAI-H1 added an isolated
  verifier and mocked fetch boundary only; it made no API call, external fetch,
  flag, `.env.local`, deployment, or user-visible change.
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
- H1 is complete. H2 may fetch only the ten already-returned `primary-01`
  source URLs, once each, with at most two redirects and 30 total HTTP attempts.
  H2 permits zero OpenAI, Serper, response retrieval, search, retry, or
  replacement.
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

## Next approved task — H2

Run the frozen ten-source feasibility gate through the H1 boundary:

1. Read the accepted `primary-01` slate and its ten registered source URLs.
2. Fetch each registered URL once with no retry, at most two redirects per
   source, and no more than 30 total HTTP attempts.
3. Revalidate DNS/IP safety at every redirect and enforce the H1 timeout,
   content-type, byte, credential, and non-default-port limits.
4. Persist only sanitized fetch metadata, observations, reason-coded receipts,
   and verified card projections. Never persist bodies, headers, cookies, or
   credentials.
5. Evaluate the four frozen cases: HZ4002 neighboring price,
   AZ4002/AZ405KT1 cross-model evidence, Miele dealer-only purchase action, and
   unavailable Dyson owner-review data.
6. Apply the frozen feasibility gates: zero false verified results; known
   unsafe fields contradicted, cleared, or honestly inconclusive; at least 3/4
   product identities and usable destinations; at least 3/4 verified offers or
   honest unavailable/inconclusive outcomes.
7. Stop and report. H2B, H3, production integration, flag creation, promotion,
   and another provider remain unapproved.

**Recommended reasoning level: High for bounded H2 collection; Highest for the
final feasibility judgment.** The fetch runner is tightly specified, while the
architecture decision requires adversarial interpretation of incomplete live
evidence.

## Hard boundaries

- H1 is frozen at `a9a46c6`: zero OpenAI, Serper, response retrieval, external
  fetch, route, flag, `.env.local`, deployment, or user-visible change.
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
- Entries [49]–[50] ask Claude to challenge the authoritative-facts boundary,
  H1 implementation, and H2 gates. This review does not block Taylor's explicit
  H2 approval, but any evidence-backed objection must be resolved before H3.

## Verification at H1

- Focused verifier suite passed 11/11.
- Full suite passed 993/993 across 137 suites.
- Typecheck, production build, offline evaluation, and diff checks passed.
- Lint reported zero errors and the same three pre-existing warnings.
- H1 code commit `a9a46c6` contains only
  `lib/autonomousFactVerifier.ts` and
  `tests/autonomousFactVerifier.test.mjs`.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active hybrid contract and H1/H2 gates | `docs/forward-roadmap.md` OAI-H0 section |
| Failed direct-display evidence | latest `docs/qa-loop-results.md` OAI-2A audit |
| Same-page price defect | `docs/RR-Issues-Report.md` RR-091 |
| Accepted slate/source URLs | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json` |
| H1 verifier and safe fetch boundary | `lib/autonomousFactVerifier.ts` |
| H1 regression wall | `tests/autonomousFactVerifier.test.mjs` |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

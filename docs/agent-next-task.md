# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after OAI-H2 feasibility failure.
Architecture commit: `5edfb3d`. H1 code: `a9a46c6`. H2 runner: `858ad9a`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-2A's actual failure through the
   completed OAI-H0/H1/H2 replacement experiment.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. H0 was docs only, H1 is an
  isolated verifier, and H2 was evidence-only. No autonomous/hybrid code is
  wired into the app, no flag exists for it, and legacy remains the only
  user-visible path and rollback baseline.
- The direct-to-display OAI-2A architecture failed semantic source truth.
- The replacement direct-fetch hybrid also failed its predeclared H2 gate.
  Exactly ten registered URL fetches used ten physical HTTP attempts, with zero
  redirects, retries, OpenAI calls, or Serper calls. Six pages returned bounded
  HTML; two exceeded the byte envelope and both Best Buy pages failed transport.
- Miele and Dyson retained independently verified identity plus usable
  destinations. AZ4002 and HZ4002 did not. Coverage was `2/4`, below the frozen
  `3/4` floor.
- Miele's dealer-only action and Dyson's unavailable rating were handled safely.
  HZ4002's unsafe provisional `$319.99` was not preserved, but its inaccessible
  Best Buy page prevented live correction to `$329.99`.
- RR-092 records a second blocker: TechGearLab's Product JSON-LD caused AZ4002
  identity/image verification while the verifier failed to extract the frozen
  AZ405KT1 tested-model conflict. The zero-false-verified gate is therefore not
  certified.
- Register: 92 total / 85 Fixed / 6 Needs Investigation / 1 Won't Fix.
  RR-091 and RR-092 both block hybrid integration.

## Current flag state

- `.env.local` remains unmodified.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- The autonomous/hybrid path is isolated and has no production mode flag.
- Legacy remains the only user-visible path.

## Next task — owner decision required; none approved

Do not patch the direct parser, integrate H1, create H3, call a provider, or
run another source fetch without Taylor's explicit approval.

The strongest next hypothesis is a **small H2B verification-oracle experiment**,
not another general research pipeline and not a retailer-specific scraper:

1. Keep OpenAI's accepted slate and relative ranking frozen.
2. Ask a verification-only structured commerce source for the exact four
   proposed identities, with a strict maximum of one lookup per product.
3. Admit only exact brand/model matches; never substitute, rescue, add, or
   reorder a product.
4. Use the oracle only for identity, current offer, seller, destination,
   availability, and image. Editorial claims remain hidden unless exact tested
   model is positively verified.
5. Compare the four results with the same frozen human audit before deciding
   whether a minimal hybrid is viable.

This is not approved. Taylor may instead choose two verified cards, end the
hybrid and retain legacy, or approve a detailed H2B gate. Given `2/4` coverage,
showing only the two direct-fetch survivors is not recommended as a useful
consumer product.

**Recommended reasoning level: Highest for the H2B architecture decision.** It
decides whether a tiny verification oracle stays meaningfully simpler than the
old pipeline or starts recreating it. If a later bounded runner is approved,
High is sufficient for mechanical collection and Highest for the verdict.

## Hard boundaries

- No OpenAI, Serper, response retrieval, search, provider call, or external page
  fetch is currently approved.
- No H2 rerun or replacement: the evidence file makes the runner refuse repeat
  execution without deliberate code/evidence intervention and new approval.
- H3, route integration, mode flag, `.env.local`, deployment, quality window,
  holdout, promotion, and cleanup remain unapproved.
- Never log or persist credentials, cookies, headers, complete page bodies,
  model reasoning, or raw OpenAI responses.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- Model output and Product page-topic markup cannot establish transactional or
  tested-model truth merely by citing/naming a product.
- No benchmark answer enters prompts, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle, accepted
  smoke, failed source audit, and architecture stop.
- Entries [49]–[51] ask Claude to challenge H0, H1, and the failed H2 judgment.
  Any H2B plan should resolve evidence-backed objections before spend.

## Verification and evidence

- H1 focused suite: 11/11; full suite: 993/993 across 137 suites.
- H1 typecheck, build, offline evaluation, and diff checks passed; lint had zero
  errors and the same three pre-existing warnings.
- H2 runner dry-run, syntax, targeted lint, and diff checks passed before spend.
- H2 input SHA-256:
  `9d29d3dc991f09c696e32d813c8be8224af21ae0eb7fcdae29d8b87d4feb1867`.
- H2 sanitized evidence SHA-256:
  `643b2e6b4f0028036a081c193554871db0e6974ad45d09bf9fb90a79eb769f46`.
- Evidence remains untracked at
  `tests/fixtures/review-radar-live/oai-h2-verifier-2026-07-16/h2-result.json`.
- Inspection confirmed no persisted body, header, cookie, or credential fields.

## Retrieval map

| Need | Retrieve |
|---|---|
| Active hybrid contract and H2 result | `docs/forward-roadmap.md` OAI-H0 section |
| Canonical H2 result | latest `docs/qa-loop-results.md` OAI-H2 entry |
| Transactional binding defect | `docs/RR-Issues-Report.md` RR-091 |
| Editorial exact-model defect | `docs/RR-Issues-Report.md` RR-092 |
| H1 verifier | `lib/autonomousFactVerifier.ts` |
| H2 bounded runner | `scripts/run-oai-h2-verifier.mjs` |
| Sanitized evidence | untracked H2 fixture path above |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

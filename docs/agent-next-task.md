# ReviewRadar Agent Handoff

Updated: 2026-07-17 by 🟧 Codex after the H2C live capability probe.
Architecture: `5edfb3d`. H1: `a9a46c6`. H2: `858ad9a`.
H2B preflight/result: `deac842` / `7e703dc`.
H2C preflight: `9b81369`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-H0 through H2C.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/hybrid route, flag, deployment, or user-visible
  behavior changed in H2C.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`. H2B one-stage Serper Shopping failed safely at `0/4` because all
  121 exposed URLs were Google wrappers.
- H2C tested the materially different SearchAPI chain: exact
  `google_shopping` entity → same-row `product_token` →
  `google_product_offers` merchant offer. The isolated preflight is commit
  `9b81369`.
- Taylor approved one frozen H2C run with eight physical attempts as the hard
  ceiling. The runner used six: four Shopping plus two token-bound Offers, all
  HTTP 200, with exact attempt reconciliation and no retry, fallback,
  replacement, added query, page fetch, OpenAI call, or Serper call.
- Shark AZ4002 and Dyson V16 Piston Animal verified safely. Miele Guard L1 Cat
  & Dog and Shark HZ4002 appeared under plausible Shopping titles, but those
  titles omitted their stable identifiers. The verifier stopped rather than
  guessing and did not make Offers calls for them.
- The frozen human audit found zero unsafe accepted bindings, but exact verified
  coverage was only `2/4`, below the precommitted `3/4` gate. H2C therefore
  failed safely. Sanitized untracked evidence SHA-256:
  `fb8b6cc813b3398fca45818d5f80fd90649f12cd9dfda47f8a333816da526ef4`.
- The fixture contains no API key, headers, cookies, raw provider response, or
  raw product token. Tokens are redacted and represented only by hashes where
  needed.
- H2C tested transactional facts only. RR-092 remains unresolved; neither the
  accepted offers nor this probe authorizes professional claims, exact-tested-
  model editorial imagery/prose, or H3.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total /
  85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `SEARCHAPI_API_KEY` is configured server-side in ignored `.env.local`. It is
  not tracked and must never be printed, logged, copied into evidence, or
  committed.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/hybrid production flag exists.
- Legacy remains the only user-visible path.

## Next task — owner architecture decision; no live work approved

Do not retune H2C, weaken exact identity, try another provider, or begin H3.
The accumulated H2/H2B/H2C evidence shows that one uniform independent verifier
cannot safely attach complete transactional facts to enough OpenAI-selected
products under the current contracts.

The strongest next architecture to evaluate is a two-layer result rather than
another all-or-nothing verifier:

1. preserve an OpenAI-led recommendation layer, with each product and material
   claim carrying explicit source/provenance and uncertainty; and
2. attach a separate deterministic commerce layer only when exact identity,
   current price, availability, and direct retailer destination verify.

Under that design, a missing verified buy offer does not erase an otherwise
well-supported recommendation, but unverified price, retailer, image, or
transactional facts never appear as verified. RR-092 still requires its own
editorial source-truth contract. Before code, Taylor must explicitly choose the
architecture and approve a zero-live specification phase with fail-first gates.

**Recommended reasoning level:** Highest for the architecture decision because
it changes the product's trust model and must reconcile recommendation quality
with transactional safety. High will be sufficient later for mechanical,
commit-pinned implementation once the boundary is frozen.

## Hard boundaries

- No live provider call is currently approved. The H2C approval is fully spent.
- No H2C rerun/query rewrite and no SerpApi, Serper, or other-provider fallback
  or parallel test.
- No retry, replacement, cache reuse, second page, added query, direct page
  fetch, OpenAI call, discovery, substitution, rescue, scoring, reordering, or
  provider prose/review/insight use without new explicit approval.
- H3, integration, route/mode flag, `.env.local` changes, deployment, quality
  window, holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, raw provider
  responses, or raw product tokens. Evidence remains sanitized and untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[56] ask Claude to challenge H0/H1/H2/H2B/H2C and the architecture
  conclusion, including token binding, title-abbreviation false negatives,
  evidence sanitization, and whether the verifier branch should end.
- Evidence-backed objections must be resolved before any new architecture,
  live call, H3 work, or production integration.

## Verification

- Live H2C: six total requests; four Shopping plus two Offers; all HTTP 200;
  attempts 1–6 exact; `2/4` exact verified offers; zero unsafe accepted binding.
- Evidence secret check: API key absent; forbidden header/cookie/key fields
  absent; raw tokens absent; redacted placeholders and hashes only.
- H2C preflight focused tests pass 24/24. The complete wall passes 1017/1017
  across 139 suites. Typecheck, build, offline evaluation, runner syntax/dry-
  run, targeted lint, and diff checks passed before the live run; repository
  lint reported zero errors and three pre-existing warnings.
- H2C evidence remains untracked at SHA-256
  `fb8b6cc813b3398fca45818d5f80fd90649f12cd9dfda47f8a333816da526ef4`.
- H2B evidence remains untracked at SHA-256
  `224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.

## Retrieval map

| Need | Retrieve |
|---|---|
| H2C contract and measured result | `docs/forward-roadmap.md` H2C section |
| Canonical H2C live audit | latest `docs/qa-loop-results.md` entry |
| H2C verifier | `lib/autonomousCommerceVerifier.ts` H2C exports |
| H2C runner | `scripts/run-oai-h2c-product-offers.mjs` |
| H2C adversarial wall | `tests/autonomousProductOffersVerifier.test.mjs` |
| H2B measured failure | preceding H2B QA entry and untracked fixture |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

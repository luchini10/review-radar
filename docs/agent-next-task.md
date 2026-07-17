# ReviewRadar Agent Handoff

Updated: 2026-07-17 by 🟧 Codex after the unguarded Terra master-prompt diagnostic.
Architecture: `5edfb3d`. H1: `a9a46c6`. H2: `858ad9a`.
H2B preflight/result: `deac842` / `7e703dc`.
H2C preflight/result: `9b81369` / `f59f49d`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-H0 through H2C.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/hybrid route, flag, deployment, or user-visible
  behavior changed in H2C or the later diagnostic.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`. H2B one-stage Serper Shopping failed safely at `0/4`. H2C's
  SearchAPI Shopping→Offers chain failed safely at `2/4`, below its `3/4` gate.
- Taylor then approved one diagnostic specifically to isolate the OpenAI API
  from all ReviewRadar post-processing. It used his exact natural-language
  master prompt filled for a broad U.S. vacuum-cleaner request, Terra/high,
  required hosted web search, one response, and no strict JSON schema,
  verifier, Serper, SearchAPI, direct page fetch, retry, replacement, second
  case, or production route.
- The response completed in 235.903 seconds using 14 of 20 allowed hosted
  searches, 114,875 input tokens, and 23,660 output tokens. Estimated cost was
  `$0.782088`, below the `$7` ceiling.
- Terra ranked SEBO D4 `90941AM`, SEBO E3 `91646AM`, Shark AZ4002, Dyson
  Gen5detect Absolute, and Kenmore BC4030. The natural answer was coherent,
  detailed, and materially better as recommendation UX. All 25 cited URLs were
  present in the response's web-search source registry.
- The unguarded answer was not safe as verified direct-to-display data. It
  called AZ4002's `$399.99` price verified while citing a Best Buy customer-
  review page, not a purchase destination; same-day H2C exact offers at other
  retailers were `$449.99`. It also named a Prussian Blue/Copper Dyson while
  using owner evidence from a different purple Best Buy listing (`447930-01`)
  without resolving the variant distinction.
- The diagnostic audit did not open any external page because direct fetches
  were forbidden. It proved source-registry membership, not exact real-world
  support for every claim.
- Sanitized untracked diagnostic evidence SHA-256:
  `203ced3a53472d69909f096f9a36b331b3045002324dc8b02affeec2369b56c4`.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total /
  85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current local secret and flag state

- `OPENAI_API_KEY`, `SERPER_API_KEY`, and `SEARCHAPI_API_KEY` remain server-side
  in ignored `.env.local`. Never print, log, copy into evidence, or commit them.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/hybrid production flag exists.
- Legacy remains the only user-visible path.

## Next task — owner architecture decision; no live work approved

Do not rerun the unguarded diagnostic, retune H2C, weaken exact identity, try
another provider, or begin H3. The evidence now separates two facts:

1. OpenAI-led selection and explanation can produce a strong shopper-facing
   recommendation; and
2. neither natural-language citations nor one uniform independent verifier can
   safely prove every price, retailer destination, variant, image, and factual
   claim while preserving enough recommendations.

The strongest architecture is therefore a two-layer result:

1. preserve an OpenAI-led recommendation/rationale layer, with explicit
   citations and uncertainty; and
2. attach price, availability, retailer URL, exact-variant image, and other
   high-risk facts only when a separate deterministic field verifier binds them.

A missing commerce verification must omit or label that field, not erase an
otherwise supported recommendation. RR-092 still needs a separate decision for
professional-performance and owner-sentiment claims: citation presence alone
is not semantic proof. Before code, Taylor must explicitly approve a zero-live
architecture-specification phase with field-level trust classes, UI labels,
fail-first fixtures, and promotion gates.

**Recommended reasoning level:** Highest. The next decision defines which
model-authored claims can become user-visible facts and how uncertainty is
shown. High will be sufficient for later mechanical implementation after the
trust boundary is frozen.

## Hard boundaries

- No live provider call is currently approved. H2C and the one-response Terra
  diagnostic approvals are fully spent.
- No rerun, query/prompt retune, model substitution, second case, SerpApi,
  Serper, SearchAPI, or other-provider fallback/parallel test.
- No retry, replacement, cache reuse, second page, added query, direct page
  fetch, OpenAI call, discovery, substitution, rescue, scoring, reordering, or
  provider prose/review/insight use without new explicit approval.
- H3, integration, route/mode flag, `.env.local` changes, deployment, quality
  window, holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, or complete raw
  provider/API responses. Evidence remains sanitized and untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[57] ask Claude to challenge H0/H1/H2/H2B/H2C and the two-layer
  conclusion, including whether field separation is sufficient for RR-092.
- Evidence-backed objections must be resolved before any new architecture,
  live call, H3 work, or production integration.

## Verification

- Unguarded diagnostic: one Terra/high response, 14 hosted searches, 235.903
  seconds, 114,875 input tokens, 23,660 output tokens, 25 cited URLs, and zero
  cited URLs absent from the API source registry.
- Estimated diagnostic cost: `$0.642088` model tokens plus `$0.14` hosted search
  calls = `$0.782088`.
- Evidence contains the filled prompt, natural answer, source metadata, and
  ledger—not an API key, headers, cookies, or complete raw API response.
- H2C remains six requests, `2/4` exact verified offers, and zero unsafe accepted
  bindings. Its evidence SHA-256 is
  `fb8b6cc813b3398fca45818d5f80fd90649f12cd9dfda47f8a333816da526ef4`.
- No code changed in the diagnostic. The pre-existing H2C verification wall was
  24/24 focused and 1017/1017 complete before its live run.

## Retrieval map

| Need | Retrieve |
|---|---|
| Unguarded diagnostic audit | latest `docs/qa-loop-results.md` entry |
| Diagnostic evidence | untracked `tests/fixtures/review-radar-live/oai-terra-unguarded-2026-07-17-primary-01/result.json` |
| H2C contract and result | `docs/forward-roadmap.md` H2C section |
| H2C verifier | `lib/autonomousCommerceVerifier.ts` H2C exports |
| H2C adversarial wall | `tests/autonomousProductOffersVerifier.test.mjs` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

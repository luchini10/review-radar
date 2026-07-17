# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the post-H2B provider-capability decision.
Architecture: `5edfb3d`. H1: `a9a46c6`. H2: `858ad9a`.
H2B preflight: `deac842`. H2B result docs: `7e703dc`.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read `docs/forward-roadmap.md` from OAI-H0 through planned H2C.
4. Read `docs/agent-dialogue.md` from entry [48] onward.
5. Treat old OAI-2B through OAI-10 as historical/unreachable and H3 as blocked.

## Current state

- Production and the current route remain unchanged. Legacy is the only user-
  visible path. No autonomous/hybrid route, flag, `.env.local`, or deployment
  change exists.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`. H2B's one-stage Serper Shopping oracle failed safely at `0/4`
  because all 121 exposed URLs were Google wrappers.
- Taylor then approved a zero-live architecture decision. Official provider
  documentation—not live calls—shows that a materially different two-stage
  commerce contract exists: exact Shopping result → product token → offer-level
  merchant, direct retailer URL, price, and stock data.
- SearchAPI is the selected candidate for one proposed capability gate because
  its `google_product_offers` endpoint is narrowly offer-focused. SerpApi
  documents a similar but broader Immersive Product response; it is not a
  fallback or parallel test.
- H2C is planned but unapproved. It keeps the same four frozen identities and
  relative order and permits at most one exact Shopping lookup plus one token-
  bound Offers lookup per identity. It cannot discover, substitute, rescue,
  rank, reorder, fetch merchant pages, or use provider prose/reviews/insights.
- SearchAPI's documented May 15, 2026 token-contract change is a durability
  warning. Any adapter must be isolated, versioned, schema-validated, and fail
  closed on drift.
- H2C can test transactional facts only. RR-092 remains unresolved; even an
  H2C pass cannot authorize professional claims, exact-tested-model editorial
  imagery/prose, or H3.
- RR-091 and RR-092 remain Needs Investigation. Register remains 92 total /
  85 Fixed / 6 Needs Investigation / 1 Won't Fix.

## Current flag state

- `.env.local` remains unmodified.
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_LLM_NARRATION=off`.
- No autonomous/hybrid production flag exists.
- Legacy remains the only user-visible path.

## Next task — H2C zero-live preflight requires explicit approval

If Taylor approves H2C preflight, implement only an isolated, default-dry
SearchAPI adapter/verifier and mocked adversarial tests. Do not call SearchAPI,
create an account, request a key, edit `.env.local`, or start H3.

The preflight must demonstrate offline that:

- only the four frozen brand + stable model/SKU + category queries exist;
- a Shopping result is followed only when its same-row title contains the exact
  brand/model and supplies a `product_token`;
- only that token can form the corresponding Product Offers request;
- the accepted offer is new/in-stock, model-consistent, and supplies seller,
  positive USD price, and direct non-Google HTTP(S) merchant URL;
- wrappers, missing/wrong tokens, cross-model offers, accessories, used/refurb/
  open-box offers, missing fields, schema drift, ads, and provider prose all
  fail closed;
- no branch adds, substitutes, rescues, scores, reorders, minimizes price,
  fetches a page, retries, falls back, or uses model-authored values; and
- the runner is dry by default, refuses an existing evidence path, checkpoints
  attempts, and can later enforce an exact eight-attempt approval ceiling.

Only after focused/full offline verification and a committed preflight may
Taylor be asked to supply a server-side SearchAPI key and separately approve a
live budget of at most four Shopping plus four Offers attempts. The provider's
advertised free quota is not authorization and is not assumed.

**Recommended reasoning level: Highest.** This preflight defines the final
transactional trust boundary and must resist provider schema drift and cross-
model offer binding without recreating the old pipeline.

## Hard boundaries

- No live provider call is currently approved. H2B's four-search approval is
  spent and cannot be reused.
- H2C preflight, account/key creation, environment edits, and live requests are
  not yet approved merely because the architecture decision is documented.
- No H2B rerun/query rewrite and no SearchAPI/SerpApi fallback or parallel test.
- No OpenAI call, direct page fetch, retry, cache, additional query, product
  substitution, discovery, rescue, scoring, reordering, or provider prose.
- H3, integration, route/mode flag, `.env.local`, deployment, quality window,
  holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, or raw provider
  responses. Future evidence must be sanitized and untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[54] ask Claude to challenge H0/H1/H2/H2B and the proposed H2C
  token-bound offer verifier. Evidence-backed objections must be resolved
  before H2C live approval, H3, or a replacement-provider decision.

## Verification

- This architecture decision used official provider documentation only and
  made zero provider/OpenAI calls and zero direct product-page fetches.
- No code, route, flag, `.env.local`, deployment, or user-visible behavior
  changed; no behavior test wall was required.
- H2B evidence remains untracked at SHA-256
  `224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.
- The last code wall remains H2B preflight: focused 11/11 and full 1004/1004
  across 138 suites; typecheck/build/eval/diff passed; lint had zero errors and
  three pre-existing warnings.

## Retrieval map

| Need | Retrieve |
|---|---|
| H2C rationale, contract, and proposed gates | `docs/forward-roadmap.md` H2C section |
| Provider-doc comparison | latest `docs/qa-loop-results.md` architecture-decision entry |
| H2B measured failure | preceding H2B QA entry and untracked fixture |
| Existing commerce verifier | `lib/autonomousCommerceVerifier.ts` |
| H2B no-retry runner | `scripts/run-oai-h2b-commerce-oracle.mjs` |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the H2C zero-live preflight.
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
  visible path. No autonomous/hybrid route, flag, `.env.local`, deployment, or
  user-visible behavior changed in H2C.
- OAI-2A direct-to-display failed semantic source truth. H2 direct fetch failed
  at `2/4`. H2B one-stage Serper Shopping failed safely at `0/4` because all
  121 exposed URLs were Google wrappers.
- H2C's offline preflight is complete in `9b81369`. It tests the materially
  different SearchAPI chain: exact `google_shopping` entity → same-row
  `product_token` → `google_product_offers` merchant offer.
- The H2C verifier is isolated and versioned. It accepts only the first exact,
  provider-ranked, new, explicitly in-stock offer with matching brand/model,
  seller, positive USD price, and direct non-Google product-page URL. It rejects
  schema drift, ads, missing/wrong tokens, wrappers/listings, accessories, non-
  new/unavailable offers, cross-brand/cross-model identity, and broad family-
  only matches that omit material descriptive model terms.
- The H2C runner is dry by default. It prints exactly four frozen Shopping
  requests, creates no evidence, redacts product tokens, refuses existing
  evidence, checkpoints attempts, and cannot execute unless given both
  `--execute` and exactly `--approved-attempts=8`.
- SearchAPI capability remains unproven live. No SearchAPI call, account/key
  action, Serper/OpenAI call, or product-page fetch occurred in the preflight.
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

## Next task — H2C live capability probe requires two owner actions

Do not run H2C yet. Taylor must first:

1. supply a server-side `SEARCHAPI_API_KEY` (or explicitly authorize account/key
   setup); and
2. separately approve at most eight physical attempts: four frozen Shopping
   calls plus up to four token-bound Offers calls.

If both are explicitly supplied, execute the committed runner exactly once:

```powershell
node --no-warnings scripts/run-oai-h2c-product-offers.mjs --execute --approved-attempts=8
```

The frozen Shopping queries are:

1. `Shark AZ4002 vacuum cleaner`
2. `Miele 12704570 SUZE0 vacuum cleaner`
3. `Shark HZ4002 vacuum cleaner`
4. `Dyson V16 Piston Animal vacuum cleaner`

Each target always gets one Shopping attempt. It gets one Offers attempt only
if the first exact same-row entity supplies a valid token. Stop after the one
window and freeze the human audit. Pass only at `>=3/4` exact verified offers,
zero unsafe accepted binding, exact attempt reconciliation, and no exception.
Any unsafe acceptance fails the provider. A coverage failure ends this provider
experiment and returns to owner architecture choice; do not retune queries,
weaken identity, add pages, or try another vendor in the same phase.

**Recommended reasoning level:** High for the mechanical commit-pinned live
collection because the runner fixes the requests and ceiling; Highest for the
frozen audit and architecture verdict because a false exact-product binding is
the decisive risk.

## Hard boundaries

- No live provider call is currently approved. H2B approval is spent, and H2C
  preflight approval does not authorize live SearchAPI use.
- Do not create an account, obtain/store a key, edit `.env.local`, or inspect
  credentials without explicit Taylor authorization.
- No H2B rerun/query rewrite and no SerpApi fallback or parallel test.
- No retry, fallback, replacement, cache reuse, second page, additional query,
  direct page fetch, OpenAI call, discovery, substitution, rescue, scoring,
  reordering, or provider prose/review/insight use.
- H3, integration, route/mode flag, `.env.local`, deployment, quality window,
  holdout, promotion, and cleanup remain unapproved.
- Never persist API keys, credentials, request headers, cookies, raw provider
  responses, or raw product tokens. Future evidence must be sanitized and
  untracked.
- No product-, retailer-, brand-, category-, publisher-, or fixture-specific
  production rule.
- No benchmark answer enters queries, verification, ranking, or app behavior.
- Live fixtures and all pre-existing untracked artifacts remain untracked.
  Stage explicit phase files only; never use `git add -A`.

## Outstanding review debt

- Entries [42]–[48] still await Claude's review of the OAI lifecycle.
- Entries [49]–[55] ask Claude to challenge H0/H1/H2/H2B/H2C, including token
  binding, title abbreviation false negatives, evidence sanitization, and
  whether the verifier remains materially smaller than reconstruction.
- Evidence-backed objections must be resolved before H2C live approval, H3, or
  a replacement-provider decision.

## Verification

- H2C preflight made zero SearchAPI, Serper, OpenAI, or direct-page calls.
- Focused verifier tests pass 24/24. The complete wall passes 1017/1017 across
  139 suites.
- Typecheck, build, offline evaluation, runner syntax/dry-run, targeted lint,
  and diff checks pass. Repository lint reports zero errors and the same three
  pre-existing warnings.
- Dry run created no evidence. A deliberate seven-attempt execute command
  failed before key lookup and before output creation.
- H2B evidence remains untracked at SHA-256
  `224d15f154ffeb3aef5c065ccc0b4f4ac93048d42a18dc471a2c939327d551c`.

## Retrieval map

| Need | Retrieve |
|---|---|
| H2C contract, live bound, and gates | `docs/forward-roadmap.md` H2C section |
| H2C verifier | `lib/autonomousCommerceVerifier.ts` H2C exports |
| H2C runner | `scripts/run-oai-h2c-product-offers.mjs` |
| H2C adversarial wall | `tests/autonomousProductOffersVerifier.test.mjs` |
| H2C preflight result | latest `docs/qa-loop-results.md` entry |
| H2B measured failure | preceding H2B QA entry and untracked fixture |
| Transactional/source defects | `docs/RR-Issues-Report.md` RR-091/RR-092 |
| Peer review | `docs/agent-dialogue.md` entry [48] onward |

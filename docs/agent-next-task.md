# ReviewRadar Agent Handoff

Updated: 2026-07-16 by 🟧 Codex after the bounded OAI-2A source-truth audit.
No live work or external page opening is currently approved.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the standing guardrails and active OAI section of
   `docs/forward-roadmap.md`, including the OAI-2A actual-result stop note.
4. Read `docs/agent-dialogue.md` from entry [47] onward.
5. Before proposing more spend, treat OAI-2A as failed under its frozen gate;
   do not continue to OAI-2B/OAI-3 without an owner-approved architecture
   amendment.

## Current state

- Production remains unchanged. The autonomous adapter, runner, and evidence
  are isolated; the route, UI, flags, `.env.local`, deployment, and current
  user-visible behavior did not change.
- The final corrected `primary-01` Terra/high response used exactly one create,
  10 hosted searches, 25 same-response polls, 118,706 total tokens, 134,580 ms,
  and estimated $0.6818275. No Serper, retry, replacement, fallback, model
  substitution, additional case, or OAI-2B action occurred.
- The strict local v2 contract accepted three Best Matches and one Close Match
  because all requirement IDs, source IDs, URLs, source roles, and
  same-response membership checks passed.
- Taylor then approved the bounded source-truth audit. It opened only the 10
  unique pages already cited by that response, with zero OpenAI/Serper calls,
  searches, replacement products, or code behavior changes.
- The audit failed the architecture gate. Shark HZ4002 was shown at $319.99,
  but the exact Best Buy HZ4002 block listed $329.99; $319.99 belonged to a
  different related Shark product on the same page. Same-page URL membership
  therefore allowed a neighboring product's price to bind to the card.
- RR-091 records the generalized defect as High / Needs Investigation. URL
  registration and `purchase_page` role do not prove that a price belongs to
  the exact product section of a multi-product page.
- A second exact-identity risk remains: the TechGearLab page titled for Shark
  AZ4002 identifies its tested model in the specification table as AZ405KT1.
  Exact-model performance claims are therefore unsafe/unverified for AZ4002.
- Dyson's product page supports identity, $979.99, availability, and core
  specifications, but currently exposes no support for the slate's 4.0/1,944
  owner-rating breakdown because reviews are unavailable.
- Five of the 10 sources fully supported their assigned use, four were partial
  or exact-model unverified, and one directly contradicted the product/price
  association. This conservative disposition is not a claim-support score.
- Per the predeclared OAI-2A kill condition, the one-call direct-to-display
  architecture is stopped. Do not run `primary-04`, `primary-12`, OAI-2B, or
  OAI-3 under the current plan. The gate was not weakened after seeing the
  result.
- Sanitized live evidence remains untracked at
  `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/`.
  Source-audit evidence and the decision are recorded in the latest
  `docs/qa-loop-results.md` entry.
- Issue register is 91 total / 85 Fixed / 5 Needs Investigation / 1 Won't Fix.

## Recommended next task — explicit approval required

Run a zero-live architecture reset before any more implementation or spend.
Amend the active OAI roadmap in place; do not create another plan document.

1. Mark one-call OpenAI research followed by direct UI display as rejected.
2. Compare three honest alternatives against RR-091 and the product objective:
   - OpenAI discovery/ranking plus a bounded server-side verifier for exact
     identity, purchase URL, price, availability, image, and owner-rating
     facts (**recommended starting hypothesis**).
   - OpenAI discovery plus a separate verification-only provider or model call
     when direct page verification is inconclusive.
   - Stop the OAI migration and retain the legacy pipeline.
3. Keep verification non-recommending: it may verify, clear, downgrade, or
   reject; it may not search, rescue, add, score, or reorder products.
4. Define two trust tiers. Purchase/identity facts must be independently
   machine-verifiable before display. Prose performance claims retain explicit
   source binding plus sampled human semantic audit; do not falsely claim a
   deterministic semantic oracle.
5. Use the already-audited HZ4002 related-price page, AZ4002/AZ405KT1 mismatch,
   Miele dealer-only purchase shape, and unavailable Dyson reviews as the
   frozen adversarial examples. Do not buy new evidence for the decision.
6. State the new dependency order, request/fetch/cost ceilings, fail-closed
   behavior, and promotion gate. Taylor chooses whether the stronger hybrid is
   acceptable before any mocked verifier implementation begins.
7. Stop and report the amended recommendation. No code or live activity is
   implied by architecture approval.

This is better than repairing the prompt and rerunning OAI-2A. The failure is
not missing wording: the model cited the correct page but selected a price from
the wrong product section. A model-authored quote can make the mistake easier
to inspect, but only independent verification can enforce purchase-fact truth.

**Recommended reasoning level: Highest.** This decision changes the core
one-call architecture, cost model, and safety boundary. Lower reasoning is
appropriate again after the architecture and acceptance rules are frozen.

## Hard boundaries

- No OpenAI/Serper call, response retrieval, external page open, retry,
  replacement, fallback, model substitution, or additional case without new
  explicit approval.
- OAI-2A is failed. No OAI-2B, OAI-3, production integration, flag promotion,
  `.env.local` edit, deployment, or user-visible change under the current plan.
- Do not weaken the OAI-2A gate, relabel the response as a quality pass, or
  treat same-page URL membership as semantic support.
- Any future verifier may inspect only already-returned source URLs and may not
  become a discovery, rescue, ranking, or narration system.
- Preserve generalized price, citation, requirement, product-type, identity,
  image, eligibility, dedupe, URL, source-quality, and hard-constraint gates.
- No benchmark answer may enter prompts, requests, verification, ranking, or
  app-behavior tests.
- Live fixtures and pre-existing untracked artifacts stay untracked. Stage
  explicit files only; never use `git add -A`.
- Taylor is the sole approver. One phase per explicit approval; stop and report
  after it.

## Outstanding review debt

- Entries [42]–[47] ask Claude to review the OAI lifecycle and accepted-smoke
  reasoning.
- Entry [48] asks Claude to challenge the bounded audit, RR-091 diagnosis, and
  architecture-stop decision.

## Retrieval map

| Need | Retrieve |
|---|---|
| OAI invariants, OAI-2A gate, and actual stop | `docs/forward-roadmap.md` active OAI section |
| Audit result | latest `docs/qa-loop-results.md` entry |
| New defect | `docs/RR-Issues-Report.md` RR-091 |
| Accepted response | untracked `tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json` |
| Local source membership boundary | `lib/autonomousResearchAdapter.ts` |
| Peer review | `docs/agent-dialogue.md` entry [47] onward |

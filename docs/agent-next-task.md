# ReviewRadar Agent Handoff

Updated: 2026-07-23 by Codex after the adversarial review of OAI-T8D commits
`5b3b3cc`, `192c276`, `71fab76`, and `0ccac73`. Use `git log -1` for the
current documentation commit.

## Current state

The Direct-Terra one-main-call architecture remains default-off. The
diagnostic and versioned-evaluator corrections passed adversarial review. The
wrong-variant safety correction did not, so RR-093 is reopened and the
condition for four live category tests was not met.

No OpenAI, Serper, SearchAPI, direct-page, deployment, flag, `.env.local`, or
production action occurred during the review.

## Review outcome

### Accepted seams

- First-loss schema v2 retains bounded normalized provider candidate identity,
  named non-ranked products, host class, and reason codes without exposing
  provider IDs, full URLs, raw titles, headers, secrets, or diagnostics to the
  client.
- Prospective `07d` matching recognizes harmless punctuation/spacing while
  preserving meaningful word and numeric boundaries such as `AI/Airtok` and
  `Q7/Q70`.
- Contextual wrong-type scoring corrects the captured secondary-mode and bundle
  false positives while preserving genuine wrong-primary-product controls.
- The encrypted v2 job token authenticates the shopper's requested category,
  binds it to the provider response capability, rejects tampering and expiry,
  and restores it server-side on completed polling.

### Failed seam — RR-093

The captured `/products/embody-gaming-chair` path is blocked. However, with the
same locked standard `Herman Miller Embody Chair` target and an exact standard
candidate title, the verifier still accepts these paths and their images:

- `/products/embody-gaming-office-chair`;
- `/products/embody-chair-gaming-edition`; and
- `/products/embody-chair-xl`.

Root cause: the new predicate asks whether the path positively conflicts with
the requested product type. It does not prove that a descriptive URL identity
is coherent with the candidate title. Reordering the requested-type words or
adding a candidate-only descriptive variant therefore bypasses the veto.

This is the same generalized wrong-variant trust-boundary class, not a new
chair-specific defect. Do not fix it with a `gaming`, `XL`, brand, or category
denylist.

## Verification

- Adversarial zero-network verifier probe: reproduced the three bypasses above.
- Focused changed-contract suites: 84/84 passed.
- Complete unit wall: 1326/1326 across 191 suites.
- Live calls: zero.

The passing suite proves that the adversarial title/path cases are missing; it
does not close RR-093.

The register is 96 total: 14 Critical, 44 High, 33 Medium, 5 Low; 88 Fixed,
7 Needs Investigation, 1 Won't Fix, and 0 Open.

## Next approval-gated step

Run one zero-live RR-093 corrective phase:

1. Add fail-first cases for reordered and suffixed candidate-only descriptive
   variants, plus an unrelated product category.
2. Define one conservative descriptive title/path coherence contract. It must
   reject unexplained identity-changing path evidence absent from the candidate
   title while preserving harmless retailer slug words, color/configuration
   language, exact base products, and all coded-model behavior.
3. Apply the rule at the shared verifier boundary to both links and images.
4. Re-run the focused and complete walls, adversarially inspect the diff, update
   the phase records, and commit automatically.
5. Stop. A new live window requires a fresh exact approval after this repair
   passes review.

**Recommended reasoning level:** High. The difficult part is distinguishing
identity-changing descriptive variants from harmless commerce wording without
weakening existing exact-model protections. Maximum reasoning is unnecessary
for this bounded seam.

## Prior four-test approval

Taylor approved an adversarial review followed by four live category tests only
if the review passed. It did not pass, so all four tests remain unspent and the
conditional live phase did not start. The approval does not authorize the
intervening behavior repair or a later live window. Any later live approval must
state exact Terra-create, hosted-search, retrieve, Serper, page-fetch, and
dollar ceilings.

## Flag state

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`

The prior handoff reported the corresponding local `.env.local` Direct-Terra
flags enabled. This review did not read, print, or modify secret values and did
not modify `.env.local`.

## Hard boundaries

- No OpenAI, Serper, SearchAPI, or direct-page request without a new exact
  numeric approval.
- No deployment, publication, push, flag promotion, `.env.local` edit, or
  production change.
- Preserve Terra's product set, names, order, report, citations, and
  price-estimate caveats.
- No product-, brand-, variant-word-, or category-specific production rule.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.
- Scoped phase files may be committed automatically; external writes still
  require Taylor's explicit authorization.

## Efficient retrieval map

| Need | Retrieve |
|---|---|
| Current state and next step | this file |
| Failed review evidence | latest T8D entry in `docs/qa-loop-results.md` |
| Reopened defect | RR-093 in `docs/RR-Issues-Report.md` |
| Peer-review request | dialogue entry `[106]` |
| Phase history | OAI-T8D in `docs/forward-roadmap.md` |
| Corrective code commits | `5b3b3cc`, `192c276`, `71fab76`, `0ccac73` |

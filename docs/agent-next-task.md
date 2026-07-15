# ReviewRadar Agent Handoff

Updated: 2026-07-15 by 🟧 Codex after Taylor approved the independent-review
amendments to the OpenAI-led migration plan.

## Efficient session start

1. Read repository `AGENTS.md` in full.
2. Read this handoff in full.
3. Read the active `OAI — OpenAI-only autonomous research migration` section
   and standing guardrails in `docs/forward-roadmap.md`. The earlier
   verified-hypothesis V2 section is historical and must not be executed.
4. Read `docs/agent-dialogue.md` from entry [39] onward unless an earlier claim
   needs verification.
5. Before live work, retrieve the prior phase's actual OpenAI tokens, hosted-
   search/tool calls, latency, and any legacy Serper attempts. Never reuse an
   old estimate by habit.

## Current state

- Tracked code remains at commit `25bc313`; documentation HEAD is `3b5a4f8`.
  The OAI-0 master-plan records are local docs-only working-tree changes and
  are not committed because Taylor requested a plan, not a commit.
- C5 live validation remains failed: five usable runs missed the frozen broad
  normalized-pool/final floors (`4.5/7` and `2.0/7` means), while constrained
  runs reached `3/4` final recall with zero exact hard-constraint failures.
- Post-C5 RR-078/RR-090 safety repairs remain green at 943/943. They close the
  editorial-card and cross-model metadata/URL defects but do not repair broad
  product quality.
- Taylor explicitly chose the attached OpenAI-only pipeline as the direction:
  one autonomous Responses API call with hosted web search returns the finished
  ranked slate; the new path sends no Serper request and application code does
  not generate search queries.
- The supplied plan was strengthened rather than copied. OAI-1 now starts with
  a zero-spend analysis of the 56 saved live fixtures; OAI-2A tests technical
  source binding; OAI-2B tests uncached quality and repeatability before the
  permanent verifier or route is built.
- The permanent boundary is now a narrow verifier, not a schema linter. It
  retains the generalized product-type, editorial/accessory, identity, URL,
  image, price, requirement, citation, and dedupe protections and adds bounded
  hostile-input-safe fetches only for URLs already returned by Call 2.
- This is not a ground-up rewrite. The current route already calls Responses
  API `web_search` with required tool use, complete source inclusion, and a
  strict schema (`app/api/recommendations/route.ts:852-889`). OAI changes that
  call from broad candidate authoring plus deterministic re-ranking to a
  source-bound final-slate contract plus order-preserving validation.
- The normal OAI request uses one OpenAI call. ReviewRadar's existing structured
  fields and deterministic requirement extraction feed the master prompt
  directly. Optional Call 1 is used only when deterministic routing identifies
  missing, conflicting, or materially ambiguous input; it cleans the wording
  without researching products, and the hard maximum is then two calls.
- The selected OAI path still sends zero Serper requests. Serper is not the
  default verifier; it can be reconsidered only after measured direct-fetch
  inadequacy and a separately approved verification-only architecture change.
- No application code, app test, fixture, issue status, `.env.local`, flag,
  deployment, external verification fetch, Serper/OpenAI call, threshold, or
  product behavior changed in OAI-0.

## Active OAI sequence

1. `OAI-1` — zero-live historical AI-row audit, master prompt, strict final-
   slate schema, evidence/verification contracts, isolated mocked adapter, safe
   logging, evaluation split, and exact OAI-2A budget formula.
2. `OAI-2A` — separately approved three-case/four-call technical and source-
   binding gate: two structured cases skip Call 1 and one ambiguity/injection
   case uses Call 1 plus Call 2; zero Serper calls.
3. `OAI-2B` — separately approved early uncached quality/repeatability gate:
   four primary shapes across four categories, three Call 2 outputs per shape;
   nine new research calls if OAI-2A inputs remain byte-identical.
4. `OAI-3` — zero-live bounded direct-network verifier and order-preserving UI
   adapter, tested only with controlled mocks.
5. `OAI-4` — zero-live default-legacy `legacy`/`shadow`/`openai` route
   integration, background polling, no promotion or deletion.
6. `OAI-5` — separately approved production-path gate: offline replay of all
   OAI-2B responses plus four live OAI requests with bounded direct verification.
7. `OAI-6` — conditional zero-live hardening only for one reproduced fixable
   failure; skip on pass or architecture kill.
8. `OAI-7` — separately approved sealed holdout and blinded human acceptance.
9. `OAI-8` — separately approved reversible controlled rollout.
10. `OAI-9` — optional later legacy/Serper retirement after the gates and a
    stable observation window.
11. `OAI-10` — post-proof model/cost/latency/cache optimization.

The full gates, invariants, rollback rules, and reasoning recommendations are
canonical in `docs/forward-roadmap.md` under the active OAI heading.

## Flag state

- Local development: `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`.
- `REVIEW_RADAR_PINNED_PLANNING`: unset/default-off.
- `REVIEW_RADAR_NORMALIZATION_RECOVERY`: unset/default-off.
- `REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION`: unset/default-off.
- `REVIEW_RADAR_VERIFIED_HYPOTHESIS_DISCOVERY`: never implemented; historical
  plan only.
- OAI pipeline mode: planned only; it does not exist. Its eventual default is
  `legacy`.
- `.env.local` was not modified in OAI-0.

## Latest verification and evidence

- Latest code verification remains the post-C5 wall: focused 77/77; full
  943/943 across 129 suites; typecheck/build/eval pass; lint 0 errors / 3
  pre-existing warnings.
- OAI-0 is documentation/architecture only. The independent-review amendment
  adds early historical and quality gates, bounded network verification, fixed
  absolute bars, uncached stability measurement, and a Serper contingency stop.
  Validation is the scoped docs diff and confirmation that tracked non-Markdown
  code did not change; no code test is claimed for this phase.
- Latest live North Stars remain: broad normalized pool/final means `4.5/7`
  and `2.0/7`; constrained final recall `3/4`; exact hard-constraint failures
  0; broad pool/final Jaccard `0.3889`/`0.0000`; constrained `0.2566`/`0.0513`.
- C5 used 398 known physical Serper attempts across five usable requests and
  averaged 95.6 seconds. That is historical legacy context, not an OAI budget.
- Register remains 90 total / 85 Fixed / 4 Needs Investigation / 1 Won't Fix.

## Next task — approval pending

Execute **OAI-1 only** after Taylor's explicit approval:

1. Analyze the 56 saved live fixtures with the existing measurement stack,
   scoring explicit `final_openai_research` lineage where it exists and stating
   that the old model saw Serper candidates/app-generated queries. This is
   supplemental evidence, not an autonomous-pipeline go/no-go result.
2. Define and version the normalized request, conditional Call 1 interpreter,
   master prompt, strict final-slate schema, source registry, per-field source
   refs, verification decisions, and UI adapter contracts.
3. Build an isolated mocked adapter around the current Responses API seam.
   Freeze required hosted web search, complete source inclusion, structured
   output, background/timeout behavior, terminal failures, safe observability,
   token/output ceilings, and the exact OAI-2A cost formula.
4. Keep existing structured fields and `extractStructuredRequirements()` as
   the normal path. Route to Call 1 only for a deterministic missing,
   conflicting, or materially ambiguous case; its output remains untrusted and
   must preserve the user's meaning.
5. Freeze the 30–50-scenario evaluation catalog from existing requests/fixtures
   and split prompt-development, primary, and sealed holdout cases before live
   results. Add hostile mocked contract tests, keep production behavior
   unchanged, run the full wall, and stop before OAI-2A.

**Expected result:** an honest historical read plus a production-reusable but
inactive OpenAI request/evidence/verification contract that can be tested with
three autonomous research calls before permanent verifier or route work. It
does not alter recommendations.

**Recommended reasoning level: Highest.** OAI-1 defines the master prompt,
claim-to-source semantics, model-call boundary, and failure behavior. A mistake
here would make every later quality number untrustworthy.

## Hard boundaries

- No live OpenAI/Serper call or external verification fetch without Taylor's
  explicit new per-phase approval. No prior approval remains available.
- No commit, flag promotion, `.env.local` edit, production route behavior,
  deployment, replacement request, threshold change, or OAI-2A work without
  separate approval.
- The selected OAI path sends no Serper request and receives no app-generated
  query list or benchmark answer. The model controls hosted web search inside
  one research response. Serper verification is only a future contingency
  decision, not standing authorization.
- Every displayable fact must bind to source metadata returned by that same
  response. The verifier may fetch only those returned URLs and may reject/
  downgrade/normalize, but may not discover, invent, rescue, score, add, or
  reorder products.
- Preserve generalized price, citation, requirement, product-type, identity,
  image, eligibility, dedupe, URL, source-quality, and hard-constraint trust
  protections.
- No benchmark leader may enter production prompts, queries, code paths,
  ranking, validation, or app-behavior tests. Generalized logic only.
- RR-061-class image regression or any wrong-type/editorial/accessory/cross-
  model/source-integrity failure stops later live work under that phase's rule.
- Live fixtures and pre-existing untracked artifacts stay untracked. Stage only
  approved files; never use `git add -A`.
- One phase per explicit approval. Stop and report after it.

## Outstanding review debt

- Dialogue entry [37] still asks Claude to verify the post-C5 safety repair.
- Dialogue entry [38] describes the superseded provider-authoritative draft and
  is historical only.
- Dialogue entry [39] asks Claude to challenge the original active OAI plan;
  entry [40] records which independent-review changes were accepted and which
  were rejected. Peer review is advisory, not authorization.
- Taylor remains the sole approver for OAI-1, commits, live spend, model/config
  promotion, rollout, or deletion.

## Retrieval map

| Need | Retrieve |
|---|---|
| Current next action and boundaries | this file |
| Active phases and gates | `docs/forward-roadmap.md` OAI section |
| Existing autonomous research API seam | `app/api/recommendations/route.ts:852-889` |
| Current broad-candidate prompt contract | `lib/researchPrompt.ts:85-292` |
| Existing deterministic request extraction | `lib/requirementExtraction.ts:1292` |
| Existing same-response source collection | `lib/responseSources.ts` |
| Existing result trust boundary | `lib/recommendationResultValidation.ts` |
| C5 current-quality evidence | `docs/phase-6-market-leader-evaluation.md:243-305` |
| Current amended-plan QA record | latest entry in `docs/qa-loop-results.md` |
| Peer review | `docs/agent-dialogue.md` entry [39] onward |

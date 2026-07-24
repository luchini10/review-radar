# ReviewRadar Agent Handoff

Updated: 2026-07-24 by Codex after OAI-T9 Phase 3.
Use `git log -1` for the current scoped candidate-slate commit.

## Current state

OAI-T9 Phases 1–3 are complete. Phases 1–2 closed RR-099 with one shared
complete-product relationship boundary for every Direct-Terra asset candidate.
Only a complete product or a bundle containing it may supply a website or
image.

Phase 3 upgrades the same-call research contract to
`direct-terra-master-prompt-v3`. Terra must research 8–15 distinct products,
return one server-only candidate slate, and evaluate every candidate against
the request-derived requirement IDs before selecting up to five ranked
recommendations.

The client completed response is unchanged. Terra's report, product names,
selection, order, explanations, citations, and nullable asset behavior remain
unchanged after a valid response. Direct-Terra remains default-off and
undeployed. Terra remains the application default. No live request, flag
change, `.env.local` edit, deployment, production change, or push occurred.

## Phase 3 trust contract

The server derives IDs in deterministic order:

1. `market_us`;
2. optional `budget`;
3. optional `important_details`;
4. one `smart_feature:<stable-id>` per selected Smart Feature; and
5. optional `dealbreakers`.

Every slate entry carries product name, brand, model, one disposition, nullable
rank, evidence quality, concise decision reason, exact same-response
hosted-search URLs, and one `pass` / `fail` / `needs_verification` verdict per
applicable ID.

The response fails closed when the slate is incomplete; requirement verdicts
are missing, duplicated, reordered, or invented; evidence URLs are not exact
response-owned URLs or are borrowed across candidates; equivalent
punctuation/spacing model forms duplicate a product; ranked headings, slate
ranks/names, or price identities disagree; a ranked product fails a hard
requirement; Best Match needs verification; or another ranked product's
unknown requirement is not visible in its report section.

The encrypted polling token carries category plus the ordered requirement IDs,
not shopper prose. Validated first-loss diagnostics retain only normalized
identity, disposition, rank, evidence quality, requirement ID, and verdict.
They retain no URL, decision prose, source title, provider ID, secret, or raw
response.

## Verification

- candidate/prompt/token/response/adapter/route/diagnostic focused walls: pass;
- complete suite: 1,370/1,370 across 197 suites;
- typecheck and production build: pass;
- lint: zero errors and three pre-existing warnings;
- both Direct-Terra first-loss harness dry-run modes: pass; and
- `git diff --check`: pass.

Adversarial review additionally proved that:

- unsafe or duplicate Smart Feature IDs are rejected before provider work;
- `0910-20` and `0910 20` are duplicate slate identities while `Q7` and `Q70`
  remain distinct;
- exact response-owned source variants remain valid even when the public
  source list canonically deduplicates them; and
- the maximum 29-requirement encrypted token remains below its 8,192-character
  bound.

This is offline contract evidence only. RR-014 remains Needs Investigation;
no recommendation-recall or hard-requirement improvement is claimed yet.

## Next approval boundary: OAI-T9 Phase 4

Phase 4 is the separately approved live Sol/high acceptance window against the
frozen four-category sample. It must determine whether prompt V3 improves
leader recall and hard-requirement truth while preserving the Phase 1–2 asset
safety wall. The live plan, exact request count, hosted-search/retrieve/Serper/
page ceilings, and current-price dollar cap must be reviewed immediately before
approval.

Do not start Phase 4 from this handoff. A live result may justify keeping,
revising, or rejecting V3; it does not automatically change the model default,
promote a flag, deploy, or close RR-014.

**Recommended reasoning level:** Highest for Phase 4's acceptance decision.
The work is not routine execution: it must separate model-quality improvement
from provider variance and determine whether the architecture is worth
continuing. High is sufficient for a zero-live preflight or harness review.

## Approval and flag state

Taylor explicitly authorized uninterrupted zero-live work through OAI-T9
Phase 3 and automatic scoped commits. That authorization is now consumed.

No OpenAI, Serper, SearchAPI, page, image, or other external request is
authorized. Phase 4 requires new explicit approval.

Committed defaults remain:

- `REVIEW_RADAR_DIRECT_TERRA=off`
- `NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA=false`
- `REVIEW_RADAR_CONSTRAINT_ALLOCATION=off`
- Direct-Terra research model: `gpt-5.6-terra`

## Hard boundaries

- No external request, deployment, publication, push, flag promotion,
  `.env.local` edit, or production change without explicit approval.
- Preserve Terra-authored product names, order, report prose, citations, and
  price caveats.
- No benchmark leaders, category queries, or product/category-specific rules
  in the prompt or code.
- Do not weaken product identity, relationship, price, citation, requirement,
  product-type, wrong-image, redirect, or private-network gates.
- Never send raw model responses, provider IDs, secrets, or server diagnostics
  to the client.
- Never stage live fixtures or unrelated `.claude/`, baseline, or
  `fable-transfer-kit/` artifacts. Never use `git add -A`.

## Review debt and retrieval map

Dialogue entry `[113]` asks Claude to challenge the Phase 1–2 relationship
grammar. Entry `[114]` asks for an adversarial review of the Phase 3 dynamic
requirements, exact-source ownership, duplicate identity, rank/visibility, and
output-budget seams. Both are advisory before live approval; neither authorizes
work.

| Need | Retrieve |
|---|---|
| Current state and next boundary | this file |
| Standing gates and OAI-T9 record | `docs/forward-roadmap.md`, OAI-T9 |
| Canonical Phase 3 verification | latest OAI-T9 entry in `docs/qa-loop-results.md` |
| Durable V3 contract | top OAI-T9 section in `docs/review-radar-test-memory.md` |
| Recommendation-quality issue | RR-014 in `docs/RR-Issues-Report.md` |
| Closed asset-safety issue | RR-099 in `docs/RR-Issues-Report.md` |
| Peer challenges | dialogue entries `[113]` and `[114]` |
| Historical live evidence | untracked T8D/T8E fixture directories |

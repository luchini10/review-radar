# ReviewRadar Search Pipeline Audit

**Audit date:** 2026-07-10

**Code inspected:** `46da816`

**Scope:** Shopper request through OpenAI discovery planning, deterministic query generation, Serper execution, candidate normalization and filtering, final OpenAI research, and deterministic selection.
**Behavior changed:** None.

## Executive finding

The primary proven bottleneck is constraint-aware query allocation, not weak
OpenAI product knowledge.

For the saved request with category `robot vacuum`, budget `under $300`, and
Important Details `self-emptying`:

- `self-emptying` is classified as `Needs review`, so deterministic search and
  validation do not treat it as a hard requirement;
- the first four protected Serper Shopping slots are broad queries such as
  `vacuum under $300`, `cordless vacuum under $300`, and
  `stick vacuum sale under $300`;
- the deep-search cap permits only five plan-derived Shopping queries, leaving
  one constraint-bearing AI query in the first Shopping pass; and
- those broad searches produce five demonstrably wrong product types.

The secondary proven bottleneck is downstream false loss. Current fixtures show
a valid shop vacuum rejected as the wrong category, two distinct Vacmaster
products collapsed as one exact model, and unrelated metadata brands polluting
source-upgrade queries.

OpenAI's observed expected-product list is plausible. The application does not
consistently execute or preserve the useful parts of that strategy.

## 1. End-to-end call path

| Stage | Function and file |
|---|---|
| User submits the form | `handleSubmit()` — `app/page.tsx:146` |
| Request payload is cleaned and built | `buildRecommendationApiPayload()` — `lib/searchRequestPayload.ts:39` |
| Browser sends the request | `fetch("/api/recommendations", ...)` — `app/page.tsx:185` |
| Server parses and validates | `handleRecommendationPost()` — `app/api/recommendations/route.ts:621` |
| Requirements are extracted | `extractStructuredRequirements()` — `lib/requirementExtraction.ts:1292` |
| OpenAI creates the discovery strategy | `buildOpenAIDiscoveryStrategy()` — `lib/discoveryStrategy.ts:390` |
| Deterministic plan is generated | `generateSearchPlan()` — `lib/searchQueryExpansion.ts:369` |
| AI and deterministic plans are merged | `augmentSearchPlanWithDiscoveryStrategy()` — `lib/discoveryStrategy.ts:649` |
| Initial Serper discovery runs | `searchSerperForProducts()` — `lib/search/serper.ts:2915` |
| OpenAI checks discovery gaps | `buildOpenAIDiscoveryGapCheck()` — `lib/discoveryStrategy.ts:543` |
| Follow-up Serper discovery runs | `app/api/recommendations/route.ts:757-774` |
| Final OpenAI web research runs | `app/api/recommendations/route.ts:789-918` |
| OpenAI and Serper candidates merge | `mergeProductRecommendations()` — `lib/search/serper.ts:3853` |
| Citations are verified | `app/api/recommendations/route.ts:929-1087` |
| Requirements are filtered | `filterResultByRequirements()` — `lib/requirementValidation.ts:2571` |
| Review evidence and product assets are enriched | `app/api/recommendations/route.ts:1113-1131` |
| Missing requirement evidence is rescued | `verifyMissingRequirementEvidence()` — `lib/requirementEvidenceRescue.ts:2302` |
| Candidates are revalidated | `revalidateResultCandidates()` — `lib/requirementValidation.ts:2675` |
| Weak source evidence is upgraded | `upgradeWeakSourceEvidence()` — `lib/requirementEvidenceRescue.ts:2191` |
| Final scoring, identity dedupe, and selection run | `scoreAndSelectRecommendationsWithTrace()` — `lib/recommendationScoring.ts:1556` |

## 2. Initial OpenAI discovery prompt

### Exact system prompt

`lib/discoveryStrategy.ts:398-425` sends this system instruction:

```text
You are the search strategist for Review Radar. Your job is to improve product discovery, not to choose final recommendations. Return mainstream products or product lines that a shopper would expect for the request, better live-search queries, product types to avoid, facts that must be verified, and a buying rubric that describes what evidence matters for this category. The rubric must contain evidence targets, common tradeoffs, red flags, review signals, and search queries; it must not choose winners or make product-specific claims. When the buyer gives a brand and budget, include budget-appropriate mainstream/value product lines before premium flagship lines. Do not let premium examples replace obvious affordable candidates. Do not invent prices. Do not include unsafe, unrelated, used/refurbished, accessory-only, or category-page results unless the user asked for them.
```

The user message is built by `requestSummary()` at
`lib/discoveryStrategy.ts:377-387`:

```text
Product category: ${input.query}
Budget: ${input.budget || "Not specified"}
Important details: ${input.priorities || "Not specified"}
Avoid: ${input.avoid || "Not specified"}
Required brand(s): ${selectedBrandText(input) || "Not specified"}
Parsed requirements: ${input.extractedRequirements?.summary.join("; ") || "None"}

Create a discovery plan and a category buying rubric. Expected products and rubric items are only hints; Review Radar will verify them with live product-page evidence before display or ranking.
```

The default helper model is `gpt-5.4-mini`; `OPENAI_HELPER_MODEL` can override
it. The request uses `max_output_tokens: 1800` and strict JSON Schema output.

### Shopper fields included

| Shopper field | Initial strategy prompt | Final research prompt |
|---|---|---|
| Product category | Raw `input.query` | Raw `input.query` |
| Budget | Raw budget and parsed summary | Raw budget, premium discovery cap, and parsed rules |
| Important Details | Raw `input.priorities` | Raw `input.priorities` and parsed rules |
| Avoid/dealbreakers | Raw `input.avoid` and parsed summary | Raw `input.avoid` and parsed rules |
| Smart Features | Not printed as raw objects; extracted labels appear in the parsed summary | Explicit human-readable labels plus parsed rules |
| Required brands | Separate extracted brand line | Parsed structured requirements |
| Other hard constraints | Included when the phrase classifier recognizes them | Included through structured requirements |
| Ambiguous details | Included as `Needs review: ...` | Included in both raw Important Details and structured summary |
| Shadow-mode numeric/spec constraints | Deliberately excluded | Deliberately excluded |

Smart Features are therefore represented in the first prompt, but indirectly.
The original selected-feature objects are not serialized into that prompt.

### Exact representative prompt

Original request:

```json
{
  "query": "robot vacuum",
  "budget": "under $300",
  "priorities": "self-emptying"
}
```

The requirement extractor produces:

```text
Required: Budget: $300 or less
Needs review: self-emptying
```

The complete user message sent to the initial strategy model is therefore:

```text
Product category: robot vacuum
Budget: under $300
Important details: self-emptying
Avoid: Not specified
Required brand(s): Not specified
Parsed requirements: Required: Budget: $300 or less; Needs review: self-emptying

Create a discovery plan and a category buying rubric. Expected products and rubric items are only hints; Review Radar will verify them with live product-page evidence before display or ranking.
```

The classification is caused by `classifyImportantDetails()` at
`lib/requirementExtraction.ts:1125-1250`. Standalone text without markers such
as `must`, `needs`, or `requires` falls into the `ambiguous` bucket at lines
1237-1242.

## 3. Initial OpenAI output structure

The required strict schema is defined at `lib/discoveryStrategy.ts:71-169`:

```json
{
  "searchIntent": "string",
  "discoveryQueries": ["string; maximum 12"],
  "expectedProducts": [
    {
      "brand": "string",
      "productLine": "string",
      "aliases": ["string; maximum 6"],
      "priority": "high | medium | low",
      "whyExpected": "string"
    }
  ],
  "avoidCandidatePatterns": ["string; maximum 12"],
  "buyingRubric": {
    "category": "string",
    "mustVerifyFacts": ["string; maximum 10"],
    "qualitySignals": ["string; maximum 10"],
    "commonTradeoffs": ["string; maximum 8"],
    "redFlags": ["string; maximum 10"],
    "reviewSignals": ["string; maximum 8"],
    "searchQueries": ["string; maximum 8"]
  },
  "verificationFacts": ["string; maximum 10"]
}
```

All properties are required and additional properties are rejected.

The complete raw strategy response is not retained in current debug fixtures.
The fixtures expose expected products, the buying rubric, the post-merge search
plan, and the gap-check output, but not raw `searchIntent`, raw
`discoveryQueries`, `avoidCandidatePatterns`, or `verificationFacts`.

The representative fixture does show this expected-product set:

```text
iRobot Roomba Combo i5+ / i5+
iRobot Roomba j5+
Shark AV2511AE / AI Ultra series
eufy L60 with Self-Empty Station / L60 SES
eufy X8 Pro with Self-Empty Station
Roborock Q5 Max+ / Q5+
Eureka E10s / E20s
ILIFE A12 / A11 family with auto-empty base
```

This list is materially more constraint-aware than the initial deterministic
queries that receive the protected Shopping slots.

## 4. Deterministic modification of the AI plan

The AI plan is not sent to Serper unchanged.

`normalizeStrategy()` and related helpers at
`lib/discoveryStrategy.ts:232-317`:

1. trim leading and trailing whitespace;
2. collapse repeated whitespace;
3. normalize case and punctuation for deduplication;
4. cap every array;
5. remove empty expected-product targets; and
6. trim individual target properties.

`budgetBoundQuery()` at `lib/discoveryStrategy.ts:329-368` then adds or rewrites
firm budget language. This can produce malformed repetition. The representative
run contains:

```text
robot vacuum self emptying under 300 under $300
```

because the AI query contained `under 300` without a dollar sign, so the
existing budget detector did not recognize it as the same bound.

`augmentSearchPlanWithDiscoveryStrategy()` at
`lib/discoveryStrategy.ts:649-722`:

- builds additional queries from expected products and aliases;
- converts AI discovery/rubric/target queries to staged canonical-Shopping
  candidates;
- protects the first four deterministic pass-1 queries ahead of all AI output;
- deduplicates the merged result; and
- caps pass 1 at 8, pass 2 at 6, and pass 3 at 4.

If the OpenAI strategy call fails or its output does not validate, the function
silently returns an empty AI strategy and deterministic discovery continues.

The gap checker is also not used unchanged. At
`lib/discoveryStrategy.ts:602-625`, ReviewRadar budget-binds the AI follow-ups,
adds deterministic missing-target queries, deduplicates the combined result,
and caps it at eight.

## 5. Exact augmented plan for the representative run

The final 18-query plan handed to the Serper orchestrator was:

```text
Pass 1
1. robot vacuum under $300
2. vacuum under $300
3. cordless vacuum under $300
4. stick vacuum sale under $300
5. robot vacuum self emptying under 300 under $300
6. self-emptying robot vacuum under $300
7. robot vacuum auto empty dock budget under $300
8. best budget self emptying robot vacuum under $300

Pass 2
9. robot vacuum with self emptying base under $300
10. value robot vacuum self emptying station under $300
11. affordable robot vacuum self-emptying dock under $300
12. Shark AV2511AE / AI Ultra series robot vacuum under $300
13. Shark Shark AI Ultra self-empty under $300
14. eufy L60 with Self-Empty Station / L60 SES robot vacuum under $300

Pass 3
15. site:appliancesconnection.com vacuum under $300
16. vacuum complaints problems long term
17. site:geappliances.com vacuum official specs
18. cordless vacuum top rated
```

The broad expansion occurs because `robot vacuum` contains the key `vacuum`.
`getCategorySynonyms()` at `lib/searchQueryExpansion.ts:112-129` therefore uses
the generic vacuum group, which includes cordless, stick, pet-hair, and upright
vacuum phrases.

## 6. Conversion to Serper requests

All Serper calls pass through `fetchSerper()` at
`lib/search/serper.ts:1471-1565`. The universal JSON body is:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "<final query string>"
}
```

The endpoint mapping is defined at `lib/search/serper.ts:49-55`:

| Search type | Endpoint |
|---|---|
| Google, organic evidence, retailer, and direct retailer | `https://google.serper.dev/search` |
| Shopping | `https://google.serper.dev/shopping` |
| Images | `https://google.serper.dev/images` |
| Videos | `https://google.serper.dev/videos` |

A transient failure is retried once. If a vertical endpoint still fails, it can
fall back to `/search` with the same JSON body. These additional transport
attempts are not represented in the current logical call counts.

### Google/organic plan query

Plan-derived organic queries have ` product page` appended at
`lib/search/serper.ts:3105-3116`:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "vacuum complaints problems long term product page"
}
```

### Shopping query

Shopping receives the staged query string without a transport-layer rewrite:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "robot vacuum under $300"
}
```

### Retailer-domain query

Retailer queries are organic `/search` requests containing the previously
constructed `site:` expression:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "site:appliancesconnection.com vacuum under $300"
}
```

### Direct-retailer query

`searchSerperDirectRetailer()` at `lib/search/serper.ts:1676-1698` prefixes the
request with a supported site expression:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "site:homedepot.com vacuum under $300"
}
```

### Editorial seed query

ReviewRadar first sends category-level best/top/most-popular queries to
`/search`, extracts text that looks like product names, and sends those strings
to `/shopping`:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "Robotic Vacuums"
}
```

### Market rescue query

If the pool has fewer than 10 candidates, fewer than three retailer hosts, or
fewer than six priced candidates, `lib/search/serper.ts:3242-3290` builds up to
two unbranded rescue queries:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "best robot vacuum under $300"
}
```

and:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "top rated robot vacuum"
}
```

### Gap-check follow-up

The first five follow-ups are run as Shopping queries at deep depth. For
example:

```json
{
  "gl": "us",
  "hl": "en",
  "num": 10,
  "q": "robot vacuum under $300 self-emptying iRobot Roomba j5+"
}
```

The sixth follow-up is crowded out by the five-Shopping-query cap. Follow-ups
seven and eight are classified as organic fallbacks by `legacyPlan()` and have
` product page` appended.

### Missing-fact and source-upgrade rescue

Missing-fact rescue may run one Shopping and one organic search per selected
fact. The default limits are eight products and two facts per product. Review
evidence has a separate trust-ladder cap of 32 calls. Source upgrade can select
three candidates and run a primary plus fallback Shopping query for each.

Source-upgrade queries alone are clamped to 120 characters at
`lib/requirementEvidenceRescue.ts:1433-1442`. General plan, seed, organic,
retailer, and market-rescue queries have no character-length truncation before
transport.

## 7. Exact Shopping strings preserved by the fixture

The representative fixture records these 17 unique Shopping strings:

```text
robot vacuum under $300
vacuum under $300
cordless vacuum under $300
stick vacuum sale under $300
robot vacuum self emptying under 300 under $300
Robotic Vacuums
Roborock Q7 M5
Tapo RV30 Max
Eufy C10 T2292 Eureka NERE10SW
Roomba Max 705
best robot vacuum under $300
top rated robot vacuum
robot vacuum under $300 self-emptying iRobot Roomba Combo i5+ OR i5+
robot vacuum under $300 self-emptying iRobot Roomba j5+
robot vacuum under $300 self-emptying Shark AV2511AE OR Shark AI Ultra
robot vacuum under $300 self-emptying eufy L60 Self-Empty Station OR L60 SES
robot vacuum under $300 self-emptying eufy X8 Pro Self-Empty Station
```

The run reports 24 logical Shopping calls. The five seed queries and two market
rescue queries are recomputed in follow-up discovery, then hidden when primary
and follow-up query lists are merged into a unique debug list.

## 8. What cannot be proven from current runtime artifacts

A complete list of actual outbound Serper requests cannot be reconstructed from
the existing debug output because:

- organic strings are counted but not logged;
- direct-retailer searches log the engine/count, not final `q`;
- review-evidence, image, missing-fact, and source-upgrade calls are outside the
  discovery counters;
- successful cache hits count as logical searches;
- retries and vertical fallbacks are not counted separately;
- `stageFunnel.raw` contains candidates after Serper normalization, not the raw
  provider response; and
- candidates are not linked to the query/response that produced them.

The best location for temporary transport logging is immediately before
`fetch()` at `lib/search/serper.ts:1512`. It should record only request ID,
logical query ID, phase, query origin, search type, final URL, parsed request
body, cache outcome, attempt, retry/fallback status, response status, duration,
and raw result count. It must not record `X-API-KEY`.

Transport logging alone is insufficient for query contribution. The logical
query ID must also be carried into normalized candidates and through every
subsequent funnel stage.

## 9. Final OpenAI research and deterministic selection

`buildResearchPrompt()` at `lib/researchPrompt.ts:85-285` gives the final OpenAI
call:

- raw category, budget, Important Details, avoid text, and selected Smart
  Feature labels;
- structured requirements;
- the augmented 18-query plan;
- up to 40 shortlisted Serper candidates;
- expected products and buying rubric;
- discovery gap-check output; and
- server-side market-coverage counts.

The final call at `app/api/recommendations/route.ts:809-847` requires OpenAI's
own `web_search` tool. That search is not Serper.

The final model returns a strict recommendation structure with search summary,
assumptions, generated queries, raw candidate count, up to 25-50 candidate
products, avoidance guidance, and final buying advice. Each candidate includes
recommendation type, identity, product and image URLs, reasoning, pros, cons,
complaints, price estimate, confidence, source consensus, fit descriptions, and
citations. The exact schema appears at `lib/researchPrompt.ts:190-224` and in
`recommendationResultJsonSchema`.

The final model's returned `generated_queries` are not sent back to Serper.
They are retained in the response, with the earlier augmented plan used as a
fallback at `app/api/recommendations/route.ts:919-927`.

After merging OpenAI and Serper candidates, deterministic code owns citation
verification, hard-requirement filtering, evidence enrichment, revalidation,
source upgrade, scoring, exact-model dedupe, and the final exact/near slate.

## 10. Measurements from saved runs

Twenty-nine saved fixtures contain complete discovery statistics and timing:

| Metric | Observed value |
|---|---:|
| Logical Serper tasks per run | 36-40; mean 37.517 |
| Total duration | 63.174-108.439 seconds; mean 83.703 seconds |
| Search-plan size | 18 in all 29 runs |
| Follow-up discovery | 29/29 runs |
| Candidate-pool size | 7-33; median 21 |
| Final exact + near count | 3-11; median 7 |
| Logical Shopping tasks | 695 |
| Unique Shopping strings after merged debug output | 492 |
| Difference | 203; exactly seven repeated logical Shopping tasks per run |

The repeated Shopping-task rate is 29.2%. The 20-minute in-memory cache at
`lib/cache.ts:23-40` likely prevents most successful same-request repeats from
becoming paid calls, but cache outcomes are not logged. Current call statistics
are therefore neither an accurate cost count nor an accurate total outbound
request count.

Mean stage latency:

| Stage | Mean duration |
|---|---:|
| Final OpenAI research | 27.361s |
| Initial OpenAI strategy | 12.476s |
| Initial Serper discovery | 10.774s |
| Review evidence enrichment | 9.922s |
| Missing-evidence rescue | 8.937s |
| OpenAI gap check | 3.592s |
| Follow-up Serper discovery | 3.524s |

Two repeated-run pairs showed severe instability:

| Metric | `shop vac` pair | constrained robot-vacuum pair |
|---|---:|---:|
| Raw/provider Jaccard | 0.2857 | 0.3158 |
| Query-plan Jaccard | 0.3636 | 0.3333 |
| Candidate-pool Jaccard | 0.1429 | 0.0000 |
| Final-set Jaccard | 0.0000 | 0.0000 |

Stable exact-result counts concealed complete product turnover. These are two
pairs, not release-grade variance estimates.

## 11. Failure-mode audit

| Failure mode | Finding |
|---|---|
| Relevant product never targeted | Partially proven. Historical benchmark leaders lack exact-model queries, but broad-query attribution is absent. |
| Serper did not return it | Not separable with current logs because raw provider responses are not retained. |
| Serper returned it but parsing lost it | Not separable for the same reason. |
| Candidate merged incorrectly | Current and proven. `Vacmaster Professional Beast Series 12-Gallon 5.5 Peak HP` is collapsed into `Vacmaster 12-Gallon 5 Peak HP` as `duplicate_identity_collapsed`. |
| Product-type validation rejected it | Current and proven. `9 Gallon 4.25 Peak HP NXT Wet Dry Vac HD0900 | RIDGID Tools` is rejected as `wrong_category`. |
| Hard-requirement filtering lost it | Current and proven for `self-emptying`, which is not made mandatory. RIDGID also disappears at requirement filtering in one shop-vac run, but the precise subreason is absent. |
| Citation/evidence checks removed it | Proven historically. `iRobot Roomba j7+` appears in a candidate pool and disappears after citation verification. |
| Final revalidation removed it | Proven historically for candidates such as FEIN Turbo II, but the exact rejection reason is not retained. |
| Candidate survived but ranked too low | Occurs historically but is not the primary current bottleneck. The latest constrained run retained all six survivors. |
| Duplicates or weak candidates consumed slots | Proven historically. The active current identity defect has the opposite effect: it over-collapses distinct products. |

Additional current observations:

- broad robot-vacuum queries produced five wrong-category canister, upright, or
  stick vacuums;
- source upgrade trusted unrelated metadata and searched `Bose ILIFE A12 Pro`;
- another saved run searched `DW DEWALT DXV09P`; and
- a conservative review classified at least 35 of 145 saved seed strings
  (24.1%) as category phrases, article fragments, or merged names instead of one
  discrete product. Examples include `Robotic Vacuums`, `Vacuum Although`, and
  `Eufy C10 T2292 Eureka NERE10SW`.

### Local fixture evidence index

The live fixtures were intentionally untracked at audit time. These bounded
line references preserve the evidence locations used to file RR-071 through
RR-077 without adding the fixtures to version control:

| Finding | Local fixture evidence |
|---|---|
| Distinct Vacmaster products falsely collapsed | `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json:2771-2782` |
| RIDGID HD0900 rejected as `wrong_category` | `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json:1753,1769-1770` |
| `self-emptying` downgraded to `Needs review` | `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json:2498` |
| Double-budget query | `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json:34,2523` |
| Generic vacuum queries and five wrong-type candidates | `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json:31-33,2642-2661` |
| Malformed editorial seeds | `tests/fixtures/review-radar-live/phase-6d-post-rr061-robot-vacuum-under-300-self-emptying.run1.json:3570-3574`; `tests/fixtures/review-radar-live/phase-6d-post-rr061-shop-vac.run1.json:2975-2980` |
| `DW DEWALT DXV09P` source-upgrade query | `tests/fixtures/review-radar-live/shop-vac.phase6d-run1.json:4464-4468,4574` |

## 12. Ranked explanations

1. **Constraint-aware query routing and requirement semantics — confidence
   0.98.** Directly demonstrated by the lost `self-emptying` requirement, four
   protected broad queries, the five-query Shopping cap, and five wrong-type
   candidates.
2. **Downstream false-negative filtering and identity handling — confidence
   0.96.** Demonstrated by HD0900 rejection, RIDGID requirement-stage loss, and
   the current Vacmaster false collapse.
3. **Low-precision editorial seed extraction — defect confidence 0.95; net
   quality harm unmeasured.** Many seeds are visibly malformed, but candidates
   lack query provenance.
4. **Provider/model variance — confidence 0.85.** Repeated runs have low
   overlap, but causal percentages cannot be assigned.
5. **Evidence/source-upgrade inefficiency — confidence 0.80.** Latest runs show
   malformed brand queries and poor attachment yield.
6. **Final ranking as the primary cause — confidence 0.25.** Upstream pool and
   filtering failures occur earlier and more often.
7. **Weak OpenAI market knowledge as the primary cause — confidence 0.30.** The
   expected-product set is materially better than the subset receiving useful
   Serper slots.

## 13. Highest-leverage next phase

The next phase should add observability only. It should not yet change prompts,
providers, search depth, filters, or ranking.

### P0: Request-scoped Serper and candidate-lineage ledger

Smallest generalized change:

- assign every logical search a stable ID and origin: deterministic plan, AI
  strategy, AI gap, editorial seed, retailer, direct retailer, market rescue,
  review evidence, image, requirement rescue, or source upgrade;
- record original query, normalized query, final `q`, endpoint, body, cache
  outcome, retry/fallback, duration, status, and raw result count;
- carry query IDs into every normalized candidate;
- record the first loss stage and precise reason for every candidate; and
- produce per-query raw, normalized, unique, citation-valid,
  requirement-valid, revalidated, and final-selected contribution counts.

Benefits:

- separates provider omission from parser loss;
- measures actual paid calls rather than logical tasks;
- exposes zero-contribution and redundant searches;
- quantifies seed, rescue, and follow-up value; and
- adds no OpenAI or Serper calls.

Risks are log volume and query privacy. Runtime overhead should be negligible if
debug-gated.

Acceptance criteria:

1. Every outbound Serper attempt is recorded, including retry and fallback.
2. Every cache lookup records hit or miss.
3. Logical tasks, cache hits, and network attempts reconcile exactly.
4. Every Serper-derived candidate has query/response provenance.
5. Every discarded candidate has a first-loss stage and subreason.
6. Post-discovery evidence, image, fact-rescue, and source-upgrade searches are
   included.
7. Three broad shop-vac and three constrained robot-vacuum runs generate
   automatic marginal-contribution tables.
8. No API key, authorization header, or complete private prompt is logged.
9. No extra external calls or model tokens are consumed.
10. Debug overhead remains below 200 ms or 2% p95, whichever is larger.
11. Existing safety and focused regression suites stay green.

Rollback is disabling or removing the debug-gated ledger. No data migration or
behavior rollback is required. Confidence: 0.99.

### Subsequent fixes after attribution exists

1. **Constraint-preserving query allocation.** Rank initial Shopping queries by
   shopper-constraint coverage and stop protecting generic synonyms ahead of
   constraint-bearing queries. Keep ambiguous positive details in search recall
   even when they are not hard filters. Use the same Serper budget. Acceptance:
   at least three of the first five Shopping queries contain `self-emptying` in
   the benchmark without reducing broad-category recall. Confidence: 0.96.
2. **Explicit hard-versus-preference semantics.** Stop depending only on words
   such as `must` inside free text. Add structured strength or a distinct
   dealbreaker field. Acceptance: identical text can intentionally be mandatory
   or preferred and behaves consistently from prompt through final validation.
   Confidence: 0.91.
3. **Identity and category false-negative fixes.** Do not collapse products
   when numeric specs or canonical URLs conflict; add prefilter subreason
   observability before adjusting category logic. Acceptance: the two Vacmaster
   products remain separate, duplicate retailer listings still collapse, and
   RIDGID HD0900 remains eligible. Confidence: 0.97.
4. **Source-brand trust guard.** Trust metadata brand only when compatible with
   the title or a known alias. Acceptance: no `Bose ILIFE` query, `DW` does not
   override `DEWALT`, and legitimate title-absent brands remain supported.
   Confidence: 0.95.
5. **Seed precision and request-local dedupe.** Require one discrete
   product/model and skip already-run logical queries before dispatch. Apply
   only after contribution measurement establishes recall impact. Confidence:
   0.90.

## 14. Controls that should remain unchanged

- Do not weaken budget, Smart Feature, citation, evidence, or product-type
  safeguards.
- Do not add more searches to compensate for an unmeasured funnel.
- Do not change OpenAI models or token budgets yet.
- Do not tune final ranking while candidate-pool identity is unstable.
- Do not switch providers before separating provider omissions from parser and
  filter losses.
- Preserve exact-model deduplication as a safety invariant; correct its
  false-positive identity test.
- Preserve deterministic final-selection authority over final OpenAI prose.

## 15. Verification and evidence limits

The focused pipeline audit suite passed 322/322 tests. No tracked source file
was modified during the audit.

The live fixtures used for measurement were untracked local evidence at audit
time. Their relevant observations are quoted in this document, but a fully
reproducible committed evidence package would require a separate, intentional
decision about which sanitized fixtures belong in version control.

# Phase 6 Reliability Scorecard Template

**Rubric version:** `v1.0` (frozen 2026-07-12, Taylor-approved)  
**Status:** Frozen measurement contract; not a release claim  
**Threshold marker:** All values previously marked **[P]** are frozen at their stated values as of v1.0. Product-safety tolerance remains absolute at zero failures. Changes now require a new rubric version; results are never compared across rubric versions.

## v1.0 freeze record (2026-07-12)

- **Leader snapshots:** `leaders-v2026-07` in
  `docs/phase-6-market-leader-evaluation.md` (method, dated data, initial M3
  baseline recall, and approved leader-quality targets).
- **Variance significance rule:** an improvement or regression claim for
  stability or recall requires at least three usable cache-cold runs per
  query shape in each compared sample, scored as sample means under the same
  rubric and snapshot versions; a single fresh run is an observation, not
  proof, unless it exposes a Critical safety failure (measurement ladder
  rungs 4-5).
- **Baseline North-Star values (R4 after-sample, commit `91e1cca`):**
  final leader recall mean 1.33/7 broad / 3.0/4 constrained; wrong-type or
  non-product final cards 0/27; scoreable constraint compliance 1/1 (B
  exacts); A-group pool/final run-overlap 0.2694/0.1429; planner-output
  overlap 0.0196 (unpinned by decision — see RR-015).
- **Flag state at freeze:** `REVIEW_RADAR_CONSTRAINT_ALLOCATION=on`
  (promoted 2026-07-12); `REVIEW_RADAR_PINNED_PLANNING` default-off.
**Phase 6 source of truth:** `docs/phase-6-reliability-gauntlet-plan.md`. This scorecard implements the master plan and must not override it.

This document is the contract for the existing ReviewRadar measurement tools and any approved extensions to them. It does not create a second scoring system. Where a current tool cannot produce the required evidence, the metric is `NotScored` and the gap is listed for approval; no missing field is inferred. Where a metric does not apply to the query shape, it is `NotApplicable`, not missing evidence.

## 1. Measurement modes

Every metric result must carry one or more of these labels.

| Mode | Evidence | Proves | Does not prove |
|---|---|---|---|
| **M1 Deterministic tests** | Unit/integration tests, synthetic fixtures, fixed-candidate A/B | Pure-logic behavior and regressions | Live provider behavior |
| **M2 Current-code reassessment** | Frozen fixture inputs explicitly rerun through current validators/classifiers | What current code would decide for the saved input at the reassessed layer | Upstream discovery, planning, or the historical end-to-end run |
| **M3 Historical fixture scoring** | Recorded fixture result and debug envelope, including `npm run qa:replay` output | What the saved run did on its capture date | Current-code behavior |
| **M4 Fresh live search** | New approved end-to-end request | Current real-world behavior for that run | Repeatability from a single run |

`npm run qa:replay` currently parses the saved payload without invoking current validators. Its output is therefore **M3**, not M2. A claim becomes M2 only when the relevant saved object is explicitly passed through current code and the reassessed layer is named.

## 2. Inventory contract

Phase 6A verified **64** `tests/*.test.mjs` files and **22** JSON fixtures in `tests/fixtures/review-radar-live/`.

### Existing measurement tools

| Tool | Current measurement role | Modes | Contract relationship |
|---|---|---|---|
| `scripts/qualityScorecard.mjs` | Live broad/constraint scorecard; core-leader pool/final coverage, alternates, wrong-type leakage, weak/thin winner flags, price-text verification, exact counts, constraint violations, set stability, cost, errors, and optional stage funnel | M4 | Extend to emit this rubric; do not replace. Its current per-query leader values use the best run, so they are not yet the Phase 6 variance statistic. |
| `scripts/goldBenchmark.mjs` | Static 14-query benchmark: 8 broad and 6 constrained definitions with leaders, alternates, wrong-type terms, and hard constraints | M1 reference data; used by M4 harness | Seed for dated Phase 6 leader snapshots. It is test data, never production logic. |
| `scripts/qualityConsistencyHarness.mjs` | Repeated live results for 7 queries; exact counts, 7-card fill, all-runs intersection/union stability, price-text verification, retailer-host spread, latency, and errors | M4 repeated | Existing base for the 6D variance pilot; extend rather than create another variance harness. |
| `scripts/ab-ranking.mjs` | Fixed six-candidate gas-grill ranking comparison with flags off/on; raw/usable price, confidence tier, rank, total score, and citation-strength score | M1 | Same-candidate-set before/after evidence for ranking changes. |
| `scripts/replay-quality-fixtures.mjs` | Zero-cost saved-output analysis: stage counts/drops, final citation tier, price-text presence, weak/thin winner, optional leader loss, source-upgrade decisions/traces, and final-selection decisions | M3 | Primary fixture scorer. It does not currently perform M2 reassessment. |
| `scripts/save-debug-fixture.mjs` | One live debug request saved with `_query`, `_savedAt`, `_goldLeaders`, and full API response | M4 capture | Existing fixture capture path. Any live use requires the phase budget and ledger. |
| `scripts/eval-pipeline.mjs` | Fixed deterministic scenarios for hard/soft specs, budgets, broken prices, bed size, category behavior, exact/near placement, and red-flag checks | M1 | Release verification and regression evidence, not a live quality score. |
| `scripts/citationStrengthDiagnostic.mjs` | Final and pool citation tiers, thin-winner comparison, price-text presence, survival, and near matches; either one live capture or replay | M3 replay / M4 live | Citation-strength source for the rubric; replay mode is the default zero-cost path. |

### Existing debug-envelope fields

The 22 fixtures collectively expose these field groups:

- Top-level debug counts and cost context: `rawCandidateCount`, `serperCandidateCount`, `preFilteredCandidateCount`, `rejectedCandidateCount`, `mergedDuplicateCount`, `finalResearchCandidateCount`, `exactMatchCount`, `nearMatchCount`, Serper call counts, `seedSearchesRun`, `sourceTimeouts`, and `verificationBudget`.
- Search/discovery context: `generatedQueries`, `retailerDomainQueries`, `serperSearchedQueries`, `selectedSourcePack`, `seedProductNames`, `searchPlanStages`, `discoveryBuyingRubric`, expected/missing products, and follow-up queries.
- Timing: `timing.totalMs`, `timing.stages[]`, and `timing.slowestStages[]`.
- Requirements/specs: `specConstraints[]`, `candidateSpecs[].specs`, and `candidateSpecs[].specValidation.{passed,failed,unknown}`.
- Funnel snapshots: `stageFunnel.stages[].{stage,names,near}`, `poolCandidates`, `postVerifyCandidates`, `postFilterCandidates`, rejected-cheap records, and raw/seed lists.
- Source upgrade: `sourceUpgradeDecisions[]`; `sourceUpgradeTraces[]` with trigger/missing-evidence data, target identity inputs, primary/fallback outcomes, search diagnostics, candidate samples, `identityMatch`, `rejectionReason`, attachment result, and attached fields.
- Final selection: `finalSelectionTrace[]` with selected/rank/stream/reason, canonical/model/family keys, exact/reliability state, requirement states, raw and adjusted scores, family/form-factor adjustments, citation counts/strength, price trust, and budget usability.
- Current fallback responses can expose `debug.fallbackTrace` and a fallback stage funnel; none of the 22 inventoried fixtures contains a live fallback trace.
- Final product records expose names, exact/near placement, citations and citation types, displayed price text, product URL/image URL, metadata/offers, requirement checks, and score breakdowns. Availability varies by fixture age.

Field presence is not the same as scoreability. A field omitted by the replay report is unavailable to a report explicitly limited to `qa:replay` output.

## 3. Scoring algorithm

1. Score the **per-search safety axis** independently. Its allowed failure count is **0 (absolute)**.
2. Start quality at **100 [P]**.
3. For each High-impact quality metric that fails, deduct **15 [P]** once.
4. For each Medium-impact quality metric that fails, deduct **8 [P]** once, except ranking sensibility score **3 [P]**, which deducts **4 [P]**.
5. Never deduct more than once for the same metric in one search, regardless of instance count.
6. `qualityScore = max(0 [P], 100 [P] - sum(deductions))`.
7. `NotScored` produces no deduction and marks the applicable report surface incomplete. If any applicable High-impact metric is `NotScored`, the final grade cannot exceed **B [P]**.
8. `NotApplicable` produces no deduction and no completeness penalty. It requires a query-shape reason.
9. Any safety failure forces final grade **F (absolute)**, regardless of the quality score.
10. Otherwise: **A ≥90 [P]**, **B ≥75 [P]**, **C ≥60 [P]**, **D <60 [P]**.

The numerical quality score remains visible when safety forces F. This preserves diagnosis without softening the safety outcome.

**Reconciled scoring choice:** `v0.1-draft` retains this deduction model. It is easier to audit across partially scored historical fixtures than a proportionally redistributed component-weight model, and both completed worked examples already use it. Phase 6D may calibrate deduction sizes and quality thresholds before v1.0; replacing the formula requires an explicit rubric-version decision.

### Metric result states

- `Pass`: evidence proves the metric did not cross its threshold.
- `Fail`: evidence proves the metric crossed its threshold; apply its one allowed deduction or safety failure.
- `NotScored`: required data is missing, stale for the claim, not printed by the authorized report, or insufficient to establish a pattern. Apply no deduction.
- `NotApplicable`: the metric does not apply to this query shape. Apply no deduction and do not mark completeness false.

Safety incompleteness does not itself force F, but a report with an applicable unscored safety metric cannot be presented as complete safety proof or used alone for release approval.

## 4. Safety axis — per search, binary

Any one `Fail` means final grade F and triggers the stop condition. These are search outcomes, not program process gates.

| ID | Safety metric | Fail condition | Evidence modes | Existing evidence source |
|---|---|---|---|---|
| `S1` | Wrong product or wrong model as exact | Any exact card is the wrong product type or model; auto-flag then manual confirmation | M2/M3/M4; M1 supports the classifier only | Final exact list, `finalSelectionTrace`, identity fields |
| `S2` | Wrong-model evidence attached | Any attachment path accepts evidence with an identity conflict | M2/M3/M4; M1 supports the gate only | `sourceUpgradeTraces[].identityMatch`, `rejectionReason`, `candidateSample`, citation identity |
| `S3` | Suspicious price in exact | Any exact card has `priceTrustStatus="suspicious"` | M2/M3/M4; M1 supports price logic only | `finalSelectionTrace[].priceTrustStatus`, `canUseForBudget` |
| `S4` | Non-product page as product card | Any final primary URL classifies as evidence/listing/non-product rather than a product detail page | M2/M3/M4; M1 supports eligibility only | Final URL plus eligibility verdict |
| `S5` | Identity pollution | Query, host, seller, retailer prefix, or other disallowed provenance establishes attachment identity | M2/M3/M4; M1 supports provenance rules only | RR-051/RR-053/RR-065 provenance and attachment traces |
| `S6` | Unsafe citation | Any retained citation fails product-specificity for the claim/path that uses it | M2/M3/M4; M1 supports citation validation only | Per-citation validation and RR-063 identity path |
| `S7` | Unsafe image | Any accepted card image is a page, logo, banner, placeholder, tracker, generic artwork, or other rejected asset class | M2/M3/M4; M1 supports resolver behavior only | Image-resolver verdict and source identity context |
| `S8` | False exact on a hard constraint | Any exact card violates a stated dealbreaker/hard requirement after manual confirmation | M2 validator-layer / M3 / M4; M1 supports validation only | Requirement states, source evidence, manual confirmation |

**Safety threshold: 0 failures. Absolute and effective now; it is not part of Phase 6D calibration.**

## 5. Process gates — separate from search grades

These block release or approval but never masquerade as per-search safety or quality statistics.

| ID | Process gate | Red condition | Evidence mode |
|---|---|---|---|
| `G1` | Regression wall | Any mapped RR-007→RR-068 wall test is red | M1 |
| `G2` | Product-specific patch audit | Any unresolved `must-generalize` finding | M1 deterministic source audit |
| `G3` | Live budget ledger | Used calls exceed the approved count for the run | M4 call records plus M1 ledger audit |
| `G4` | Rubric version control | A post-freeze rubric changes without version bump and explicit re-baseline decision | M1 deterministic document/version audit |

### Release-gate tiers

1. **Stop the run + rollback if caused by a Phase 6 change:** any safety-axis failure or wall regression. Revert behavior changes, retain finding documentation, file/update the issue, report, and ask Taylor.
2. **Block release/approval:** any red process gate.
3. **Manual review required:** final count below **6 broad / 3 constrained [P]**, leader coverage below its floor, or ranking score **≤3 [P]**.
4. **Log only:** weak citations, missing images, conservative false negatives, and single-run M4 anomalies.
5. **Deferrable:** wording, display, and report formatting.

Safety stop thresholds and process-gate red conditions are effective now. Quality review floors and manual-score cutoffs marked [P] remain provisional until the v1.0 freeze after Phase 6D.

## 6. Quality axis

### High-impact metrics — deduct 15 [P] once each

| ID | Metric | Fail threshold | Modes that may score it | Required evidence |
|---|---|---|---|---|
| `QH1` | Leader coverage below floor | Fewer than **3 [P]** dated benchmark leaders in the final **7 [P]** for a core objective category. The benchmark contains **3–5 [P]** leaders appearing in at least **2 [P]** independent editorial best-of sources. Subjective categories substitute consensus coverage: every scored finalist has at least **2 [P]** editorial citations. | M3/M4; M2 only for a named downstream survival layer | Dated leader snapshot, final names, and loss stage for each missing leader |
| `QH2` | Duplicate same-canonical-model cards | At least **2 [P]** final cards share the same canonical model identity | M2/M3/M4 | Canonical identity/model key for every finalist |
| `QH3` | Weak-evidence winner | Final #1 has **0 [P]** independent citations | M2/M3/M4 | Winner and citation-type classification |
| `QH4` | Unjustified low final count | Count is below **6 broad / 3 constrained [P]**, and funnel evidence proves avoidable loss. The count alone triggers review, not deduction. Honest scarcity receives no deduction. | M3/M4; M2 only for the reassessed loss layer | Final count, loss stage, loss reason, and avoidable shared mechanism |
| `QH5` | Confidence honesty violation | Near/unknown is presented as exact or the pass/fail/unknown three-state contract is broken | M2/M3/M4 | Selected tier plus requirement/product-type confidence states |

### Medium-impact metrics — deduct 8 [P] once each

| ID | Metric | Fail threshold | Modes that may score it | Required evidence |
|---|---|---|---|---|
| `QM1` | Family crowding | More than **3 of 7 [P]** final cards share `modelFamilyKey`/the documented family key | M2/M3/M4 | Family key for every finalist |
| `QM2` | Citation strength below floor | Fewer than **4 of 7 [P]** exact finalists are `INDEPENDENT` or `RETAILER`. For fewer than 7 exacts, require `ceil(4 × exactCount / 7) [P]`; `SELF-ONLY`, `WEAK`, and `NONE` do not meet the floor. | M2/M3/M4 | `citationStrengthDiagnostic` tier for each exact finalist |
| `QM3` | Ranking sensibility | Manual score **≤2 [P]** deducts **8 [P]**; score **3 [P]** deducts **4 [P]**; scores **4–5 [P]** deduct 0 | M2/M3/M4; M1 fixed-set A/B for before/after | Written anchor selection and concrete ordering evidence |
| `QM4` | Brand diversity | Broad final has fewer than **4 [P]** distinct product brands | M3/M4; M2 if final set is deterministically rescored | Final exact brands |
| `QM5` | Repeated conservative false negatives | The same conservative mechanism wrongly excludes at least **2 [P]** valid candidates in the search. A single instance is logged, not deducted. | M1/M2/M3/M4, with the affected search named | Validity evidence and repeated shared loss reason |
| `QM6` | Image coverage | Fewer than **6 of 7 [P]** final cards have an accepted safe product image. For fewer than 7 finals, require `ceil(6 × finalCount / 7) [P]`. | M2/M3/M4 | Per-final accepted image verdict |

Quality thresholds and deduction weights in sections 3–6 are provisional until the v1.0 freeze after Phase 6D. Safety zero tolerance is absolute.

### Ranking sensibility anchors

Use the whole visible ordering and cutoff evidence. Do not average sub-opinions or change the deduction outside these anchors.

| Score | Written anchor |
|---|---|
| **5 [P]** | Clearly sensible. Strong category fits with credible support occupy the top positions; no material inversion is visible at the top or cutoff; reasonable shoppers could disagree only on minor preference tradeoffs. |
| **4 [P]** | Mostly sensible. The best-supported, mainstream, and constraint-honest products are generally above weaker or niche alternatives; one minor debatable placement may exist, but no material trust or category-fit inversion changes the slate’s usefulness. |
| **3 [P]** | Mixed but usable. At least one material non-safety inversion, unsupported winner, or niche-over-mainstream placement is visible, while enough of the ordering remains defensible to use with review. Deduct **4 [P]**. |
| **2 [P]** | Poor. Multiple material inversions are visible, or obvious mainstream/better-supported category fits sit below weak or niche products; substantial manual reordering is needed. Deduct **8 [P]**. |
| **1 [P]** | Incoherent. Ordering is dominated by wrong products, broken constraints, or unsupported choices, or the winner is clearly invalid while multiple safer/stronger products rank below. Deduct **8 [P]**; apply safety F separately when applicable. |

## 7. Missing-data and evidence-completeness policy

- Missing or inadequate evidence is `NotScored`, never Pass.
- `NotScored` deducts 0.
- Any applicable `NotScored` High-impact metric sets `qualityCompleteHigh=false` and caps the non-safety grade at B.
- Any applicable `NotScored` safety metric sets `safetyComplete=false`. It does not create a failure, but the report cannot claim complete safety or independently approve release.
- `NotApplicable` requires an explicit query-shape reason, deducts 0, and does not reduce completeness.
- Schema-stale fixtures remain usable for the metrics they actually contain.
- Market-stale fixtures older than **60 days [P]** cannot support leader trend claims.
- A metric may cite multiple modes, but each claim must say what each mode proves. M3 history and M2 reassessment must never be blended into an unlabeled “current replay” claim.

The staleness threshold is provisional until the v1.0 freeze after Phase 6D.

## 8. Per-search report template

```markdown
### Search scorecard: <query>

- Rubric: v0.1-draft
- Search kind: broad | constrained | subjective | low-info
- Evidence artifact: <fixture/report/run id>
- Capture/evaluation date: <date>
- Evidence modes used: M1 | M2 | M3 | M4
- Mode boundary: <what this evidence proves and cannot prove>
- Threshold status: quality provisional until v1.0 freeze after 6D; safety zero tolerance absolute

#### Safety

| ID | Metric | Result (Pass/Fail/NotScored/NotApplicable) | Mode | Evidence | Note |
|---|---|---|---|---|---|
| S1 | Wrong product/model as exact | | | | |
| S2 | Wrong-model evidence attached | | | | |
| S3 | Suspicious price in exact | | | | |
| S4 | Non-product page as card | | | | |
| S5 | Identity pollution | | | | |
| S6 | Unsafe citation | | | | |
| S7 | Unsafe image | | | | |
| S8 | False exact on hard constraint | | | | |

Safety failures: <n>; safetyComplete: true|false

#### Quality

| ID | Metric | Result | Mode | Deduction | Evidence / NotScored or NotApplicable reason |
|---|---|---|---|---:|---|
| QH1 | Leader coverage | | | | |
| QH2 | Duplicate canonical model | | | | |
| QH3 | Weak-evidence winner | | | | |
| QH4 | Unjustified low final count | | | | |
| QH5 | Confidence honesty | | | | |
| QM1 | Family crowding | | | | |
| QM2 | Citation strength | | | | |
| QM3 | Ranking sensibility | | | | anchor=<1–5> |
| QM4 | Brand diversity | | | | |
| QM5 | Repeated conservative false negatives | | | | |
| QM6 | Image coverage | | | | |

- Raw quality score: max(0, 100 - deductions) = <score>
- High-impact complete: true|false
- Grade before incomplete-High cap: <A/B/C/D>
- Grade after incomplete-High cap: <A/B/C/D>
- Final grade: <F if safety failed, otherwise capped quality grade>
- Manual reviews opened: <low count / leader / ranking / none>

#### Process gates for this approval

| Gate | Result | Evidence |
|---|---|---|
| Regression wall | | |
| Patch audit | | |
| Budget ledger | | |
| Rubric version control | | |

#### Findings

- Observed:
- Not established:
- Trace/automation gaps:
```

## 9. Before/after template

Before/after claims require M1/M2, `ab-ranking.mjs` on the same candidate set, or repeated M4 consistent with the 6D variance decision rule. A single M4 pair is observation only.

```markdown
### Before/after: <mechanism or dossier>

- Rubric version: <same version on both sides>
- Candidate/query control: <same frozen set | same fixture layer | repeated live design>
- Before artifact/mode: <id, M1/M2/M3/M4>
- After artifact/mode: <id, M1/M2/M3/M4>
- Comparable fields: <list>
- Non-comparable fields: <list>
- Variance rule (if M4): <6D rule/version>

| Metric | Before result/score | Before mode | After result/score | After mode | Delta | Decision |
|---|---:|---|---:|---|---:|---|
| Safety failures | | | | | | |
| Quality score | | | | | | |
| <metric> | | | | | | |

- Safety verdict: no regression | regression/stop
- Claimed improvement: yes | no | inconclusive
- Shared mechanism evidence:
- Caveats:
```

## 10. Machine-readable scorecard JSON Schema

This schema is the proposed committed report shape. It is documentation, not an executable validator.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://reviewradar.local/schemas/phase-6-scorecard-v0.1-draft.json",
  "title": "ReviewRadar Phase 6 per-search scorecard v0.1-draft",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "rubricVersion",
    "thresholdStatus",
    "query",
    "searchKind",
    "evidence",
    "safety",
    "quality",
    "processGates",
    "finalGrade"
  ],
  "properties": {
    "rubricVersion": { "const": "v0.1-draft" },
    "thresholdStatus": {
      "const": "quality provisional until v1.0 freeze after 6D; safety zero tolerance absolute"
    },
    "query": { "type": "string", "minLength": 1 },
    "searchKind": {
      "enum": ["broad", "constrained", "subjective", "low-info"]
    },
    "evidence": {
      "type": "object",
      "additionalProperties": false,
      "required": ["artifact", "evaluatedAt", "modes", "modeBoundary"],
      "properties": {
        "artifact": { "type": "string", "minLength": 1 },
        "capturedAt": { "type": ["string", "null"], "format": "date-time" },
        "evaluatedAt": { "type": "string", "format": "date-time" },
        "modes": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "enum": ["M1", "M2", "M3", "M4"] }
        },
        "modeBoundary": { "type": "string", "minLength": 1 }
      }
    },
    "safety": {
      "type": "object",
      "additionalProperties": false,
      "required": ["metrics", "failureCount", "complete"],
      "properties": {
        "metrics": {
          "type": "array",
          "minItems": 8,
          "maxItems": 8,
          "items": { "$ref": "#/$defs/safetyMetric" }
        },
        "failureCount": { "type": "integer", "minimum": 0, "maximum": 8 },
        "complete": { "type": "boolean" }
      }
    },
    "quality": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "metrics",
        "deductionTotal",
        "rawScore",
        "highImpactComplete",
        "gradeBeforeCap",
        "gradeAfterCap"
      ],
      "properties": {
        "metrics": {
          "type": "array",
          "minItems": 11,
          "maxItems": 11,
          "items": { "$ref": "#/$defs/qualityMetric" }
        },
        "deductionTotal": { "type": "integer", "minimum": 0 },
        "rawScore": { "type": "integer", "minimum": 0, "maximum": 100 },
        "highImpactComplete": { "type": "boolean" },
        "gradeBeforeCap": { "enum": ["A", "B", "C", "D"] },
        "gradeAfterCap": { "enum": ["A", "B", "C", "D"] }
      }
    },
    "processGates": {
      "type": "array",
      "minItems": 4,
      "maxItems": 4,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "result", "evidence"],
        "properties": {
          "id": { "enum": ["G1", "G2", "G3", "G4"] },
          "result": { "enum": ["Pass", "Fail", "NotScored", "NotApplicable"] },
          "evidence": { "type": "string" }
        }
      }
    },
    "manualReviews": {
      "type": "array",
      "items": {
        "enum": ["low_final_count", "leader_coverage", "ranking", "other"]
      },
      "uniqueItems": true
    },
    "finalGrade": { "enum": ["A", "B", "C", "D", "F"] },
    "notes": { "type": "array", "items": { "type": "string" } }
  },
  "$defs": {
    "modeList": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": { "enum": ["M1", "M2", "M3", "M4"] }
    },
    "metricBase": {
      "type": "object",
      "required": ["id", "result", "modes", "evidence"],
      "properties": {
        "result": { "enum": ["Pass", "Fail", "NotScored", "NotApplicable"] },
        "modes": { "$ref": "#/$defs/modeList" },
        "evidence": { "type": "string" },
        "notScoredReason": { "type": ["string", "null"] },
        "notApplicableReason": { "type": ["string", "null"] }
      }
    },
    "safetyMetric": {
      "allOf": [
        { "$ref": "#/$defs/metricBase" },
        {
          "properties": {
            "id": { "enum": ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] }
          }
        }
      ]
    },
    "qualityMetric": {
      "allOf": [
        { "$ref": "#/$defs/metricBase" },
        {
          "required": ["deduction"],
          "properties": {
            "id": {
              "enum": [
                "QH1", "QH2", "QH3", "QH4", "QH5",
                "QM1", "QM2", "QM3", "QM4", "QM5", "QM6"
              ]
            },
            "deduction": { "enum": [0, 4, 8, 15] },
            "manualAnchor": { "type": ["integer", "null"], "minimum": 1, "maximum": 5 }
          }
        }
      ]
    }
  }
}
```

Consumers must additionally verify the formula, unique metric IDs, and the relationship between results and deductions; the schema intentionally does not pretend JSON Schema arithmetic can prove the score calculation.

## 11. Hand-scoring validation and draft revisions

Both worked examples below use only the console output of:

- `npm run qa:replay -- tests/fixtures/review-radar-live/shop-vac.json`
- `npm run qa:replay -- tests/fixtures/review-radar-live/gas-grill.json`

Therefore every scored metric is **M3**: it describes the recorded run. No metric is labeled M2 because replay did not invoke a current validator.

The hand pass caused these v0.1-draft clarifications:

1. Added explicit metric states and evidence-completeness flags so missing replay fields become `NotScored`, not implicit passes.
2. Made low final count a review trigger first; the High deduction remains `NotScored` until the replay proves avoidable loss, exactly as the master plan requires.
3. Made safety completeness explicit. An incomplete historical fixture may receive a diagnostic grade, but it cannot serve as complete safety proof.
4. Defined the provisional citation-tier floor using the existing replay/citation diagnostic labels and scaled it for slates smaller than seven.
5. Reconciliation retained the auditable deduction formula, made safety zero tolerance absolute, and separated query-shape `NotApplicable` from missing-evidence `NotScored`.
5. Required a current-code execution marker before any replay-derived claim may be called M2.

No rubric weight, plan-defined grade band, or plan-defined safety/process separation changed.

### Worked example A — `shop-vac.json`

- Capture: `2026-07-01T19:49:45.126Z`
- Evidence: `qa:replay` console output only
- Mode: **M3** for every scored result because the report analyzes the saved run
- Replay summary: 17 pool → 12 citation-verified → 3 after requirements → 3 final; 2 exact and 1 near. The two exacts are Armor All utility wet/dry vacuums. The winner is `WEAK`; the other exact is `RETAILER`. One AA255W source upgrade reports one identity match and attaches rating/review/citation evidence.

#### Safety

| ID | Result | Mode | Evidence / reason |
|---|---|---|---|
| S1 | Pass | M3 | Both recorded exact titles are Armor All wet/dry utility vacuums, matching the saved `shop vac` request. |
| S2 | NotScored | M3 | The printed source-upgrade attempt is identity-safe, but replay does not print identity validation for every citation/attachment path. |
| S3 | NotScored | M3 | Replay prints price present/absent, not `priceTrustStatus` for each exact. |
| S4 | NotScored | M3 | Replay does not print final URLs or eligibility verdicts. |
| S5 | NotScored | M3 | The one source-upgrade identity phrase is visible, but complete provenance verdicts are not printed for every attachment. |
| S6 | NotScored | M3 | Citation tiers are printed; product-specificity verdicts are not. |
| S7 | NotScored | M3 | Images and resolver verdicts are not printed. |
| S8 | NotApplicable | M3 | The saved broad query has no separate hard constraint; product type remains covered by S1. |

Safety failures: **0**. `safetyComplete=false`; this is not complete safety proof.

#### Quality

| ID | Result | Mode | Deduction | Evidence / reason |
|---|---|---|---:|---|
| QH1 | NotScored | M3 | 0 | Fixture/replay has no dated leader set or `_goldLeaders`. |
| QH2 | NotScored | M3 | 0 | Canonical model keys are not printed. |
| QH3 | Fail | M3 | 15 | #1 is `WEAK` with 1 weak citation and therefore 0 independent citations. |
| QH4 | NotScored | M3 | 0 | Final count 3 is below the broad review floor, but replay shows only the drop stage, not whether the loss was avoidable or honest. |
| QH5 | NotScored | M3 | 0 | The report preserves exact/near placement but does not print selected-exact requirement states, so complete three-state honesty cannot be established. |
| QM1 | NotScored | M3 | 0 | Family keys are not printed; brand sameness alone is not the family metric. |
| QM2 | Fail | M3 | 8 | 1 of 2 exacts is `RETAILER`/`INDEPENDENT`; scaled floor is `ceil(4×2/7)=2 [P]`. |
| QM3 | Fail, anchor 3 | M3 | 4 | Mixed but usable: the exact ordering favors the price-verified card, but the winner is weakly supported and the slate is unusually narrow. |
| QM4 | Fail | M3 | 8 | 1 distinct brand across the broad exact slate, below 4 [P]. |
| QM5 | NotScored | M3 | 0 | Replay names losses but does not establish two valid candidates lost by the same conservative mechanism. |
| QM6 | NotScored | M3 | 0 | Image acceptance is not printed. |

- Deductions: `15 + 8 + 4 + 8 = 35`
- Quality score: `max(0, 100 - 35) = 65`
- High-impact complete: `false`
- Quality grade before/after cap: `C / C`
- Final grade: **C**, with incomplete safety and quality evidence
- Manual review: low final count; ranking score 3

### Worked example B — `gas-grill.json`

- Capture: `2026-06-27T04:18:04.710Z`
- Evidence: `qa:replay` console output only
- Mode: **M3** for every scored result because the report analyzes the saved run
- Replay summary: 21 pool → 14 after requirements → 14 after revalidation → 7 exact final. The first four are mainstream gas grills; ranks 5–7 include portable/camping products. Two Broil King four-burner grills rank below the cutoff. The #1 Weber has 2 weak citations and no independent citation.

#### Safety

| ID | Result | Mode | Evidence / reason |
|---|---|---|---|
| S1 | Fail | M3 | Manual confirmation from the recorded exact title: `Coleman 4-in-1 Portable Propane Gas Camping Stove` is a camping stove, not the requested gas grill, yet appears exact #7. |
| S2 | NotScored | M3 | No source-upgrade attachment occurred, and replay does not print identity validation for all other evidence paths. |
| S3 | NotScored | M3 | Replay prints price present/absent, not exact-card price trust status. |
| S4 | NotScored | M3 | Final URLs and eligibility verdicts are not printed. |
| S5 | NotScored | M3 | Complete identity provenance is not printed. |
| S6 | NotScored | M3 | Citation strength is printed; product-specificity verdicts are not. |
| S7 | NotScored | M3 | Images and resolver verdicts are not printed. |
| S8 | NotApplicable | M3 | The saved broad request has no separate stated hard constraint. |

Safety failures: **1**. Final grade is F. `safetyComplete=false`.

#### Quality

| ID | Result | Mode | Deduction | Evidence / reason |
|---|---|---|---:|---|
| QH1 | NotScored | M3 | 0 | No dated leader set or replay leader list. |
| QH2 | NotScored | M3 | 0 | Canonical model keys are not printed. |
| QH3 | Fail | M3 | 15 | #1 Weber has 2 `WEAK` citations and 0 independent citations. |
| QH4 | Pass | M3 | 0 | 7 exact products meet the broad count review floor. |
| QH5 | NotScored | M3 | 0 | Recorded near candidates remain near, but selected-exact requirement states are not printed, so complete three-state honesty cannot be established. |
| QM1 | NotScored | M3 | 0 | Family keys are not printed. |
| QM2 | Fail | M3 | 8 | 3 of 7 exacts are `RETAILER`/`INDEPENDENT`, below 4 of 7 [P]. |
| QM3 | Fail, anchor 2 | M3 | 8 | Multiple material inversions: portable/camping products occupy exact ranks 5–7 while two four-burner Broil King gas grills sit below cutoff; substantial reordering is needed. |
| QM4 | Pass | M3 | 0 | At least 5 visible brands: Weber, Nexgrill, Char-Broil, Primus, and Coleman. |
| QM5 | NotScored | M3 | 0 | The Broil King records are ranking losses, not proven conservative validation false negatives. |
| QM6 | NotScored | M3 | 0 | Image acceptance is not printed. |

- Deductions: `15 + 8 + 8 = 31`
- Quality score: `max(0, 100 - 31) = 69`
- High-impact complete: `false`
- Quality grade before/after cap: `C / C`
- Final grade: **F** because S1 failed
- Manual review: ranking score 2; safety stop

These are historical findings, not new issue filings or current regressions. The `gas-grill.json` result predates later safeguards, and this phase did not perform an M2 reassessment or fix.

## 12. Proposed trace additions (needs approval)

These fields are absent or not complete enough in the current debug contract. Do not implement them during Phase 6A.

1. Per-final `primaryUrlEligibilityVerdict`, classifier version, and reason.
2. Per-final accepted-image resolver verdict, source identity context, and rejection class; include an explicit `no_safe_image` state.
3. Per-citation product-specificity/identity verdict, accepted use, and provenance exclusions.
4. Per-attachment identity provenance showing whether query, host, seller, retailer prefix, URL query, or generated text was excluded.
5. Per-selected-final hard/soft requirement classification and source evidence alongside the existing pass/fail/unknown arrays and final exact/near decision.
6. Per-candidate funnel loss reason, not only the first stage at which its name disappears; include an `avoidable` field only when deterministically established.
7. Current-code reassessment metadata: validator name/version, input object identity, timestamp, and explicit M2 layer boundary.
8. Stable leader identity at every funnel stage so renamed/retailer-decorated products do not disappear from loss attribution.

## 13. Proposed automation (needs approval)

No executable script changed in Phase 6A.

1. Extend `replay-quality-fixtures.mjs` to print existing final trace fields currently hidden from console output: canonical/model/family keys, price trust, budget usability, selected requirement states, distinct brands, and final product URLs.
2. Extend replay/citation output to emit this JSON scorecard shape and validate unique metric IDs plus score arithmetic.
3. Extend `qualityScorecard.mjs` to calculate the two-axis rubric while preserving its current cost guard, query modes, and raw measurements.
4. Extend `qualityConsistencyHarness.mjs` for the approved 6D 2×3 pilot, including pairwise pool/final overlap and three-run intersection/union.
5. Extend `goldBenchmark.mjs` or its approved successor data file with dated, source-cited core-10 leader snapshots; keep it QA-only.
6. Add a report-only comparison command that rejects before/after claims with mismatched rubric versions, candidate sets, or unsupported evidence modes.

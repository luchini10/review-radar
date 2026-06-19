# ReviewRadar Agent QA Loop

Safe local workflow for testing ReviewRadar with controller, worker, verifier, and report scripts.

The goal is to find repeated result-quality failures, identify one shared root cause, and hand off a generalized fix. Workers report evidence only. They do not edit code.

## Core Files

- `scripts/agent-loop-controller.mjs`: runs checks, starts worker batches, ranks repeated root causes, writes the next task, and generates the report.
- `scripts/qa-worker.mjs`: runs one QA batch in deterministic or live localhost mode and writes structured JSON.
- `scripts/verify-loop-result.mjs`: compares before/after worker result sets and accepts or rejects the loop.
- `docs/agent-batches/*.json`: small themed QA batches.
- `docs/agent-worker-results/*.json`: structured worker, controller, and verifier outputs.
- `docs/agent-next-task.md`: controller-generated handoff for the next generalized fix.
- `docs/agent-fix-template.md`: reusable instructions for Codex/Claude fix agents.
- `docs/agent-loop-report.md`: latest plain-English controller report.

## Batch Files

Worker batches live in `docs/agent-batches/`.

Current batches:

- `broad-mainstream`: common brand/category searches that should not falsely return no exact matches.
- `price-trust`: wrong-price and price-verification risks.
- `requirement-units`: unit/spec constraints such as length, CFM, size, and capacity.
- `wrong-category`: wrong product type or category leakage.
- `non-product-pages`: articles, roundups, search pages, forums, and support pages leaking as product cards.

Each batch can include a larger `searchPool`. The worker picks the next few searches each run,
then saves its place in `docs/agent-worker-results/agent-search-rotation-state.json`. This keeps
repeat agent runs from testing the exact same products every time.

Add new batch files as simple JSON:

```json
{
  "name": "example-batch",
  "description": "What this batch is trying to catch.",
  "searchesPerRun": 2,
  "searches": [
    {
      "category": "garden hose",
      "budget": "$100",
      "priorities": "50 ft length, lightweight, kink resistant",
      "expectedRisk": "unit requirement should not create false no exact"
    }
  ],
  "searchPool": [
    {
      "category": "garden hose",
      "budget": "$100",
      "priorities": "50 ft length, lightweight, kink resistant",
      "expectedRisk": "unit requirement should not create false no exact"
    },
    {
      "category": "leaf blower",
      "budget": "$300",
      "priorities": "at least 600 CFM",
      "expectedRisk": "numeric spec should be verified"
    }
  ]
}
```

## Worker Commands

Run a deterministic batch:

```powershell
npm run qa:worker -- --batch price-trust
```

Run a live localhost batch:

```powershell
npm run qa:worker -- --batch price-trust --mode live
```

Live mode posts to `http://localhost:3000/api/recommendations` with `x-reviewradar-debug: true`.

Live mode should fail gracefully when localhost is not running or API keys are missing. A live failure is recorded as evidence; it does not change app API behavior.

If the batch has a `searchPool`, two back-to-back live runs may test different products by design.
The worker result JSON includes `searchRotation` so you can see which slice was used.

## Controller Commands

Run the default controller:

```powershell
npm run qa:loop
```

Run multiple batches sequentially:

```powershell
npm run qa:loop -- --batches price-trust,broad-mainstream,requirement-units
```

Run multiple live batches with capped parallelism:

```powershell
npm run qa:loop -- --batches price-trust,broad-mainstream --mode live --parallel 2
```

Keep `--parallel` low. It is capped in code, but API usage can still climb quickly.

The controller only merges worker JSON files from the current run id, so stale historical files do not pollute the next-task decision.

## Change Log Updates

Normal QA runs should not update `docs/change-log.md`. The change log is only for meaningful changes.

After a meaningful fix, feature, pipeline change, ranking/search/evidence change, or live QA fix worth remembering, pass a plain-English note:

```powershell
npm run qa:loop -- --batches price-trust,broad-mainstream --change-note "Improved price trust checks so comma-formatted prices are not misread as tiny prices." --change-verified "npm run qa:loop,npm run build"
```

The controller will append that note to `docs/change-log.md` and sync the desktop markdown copy.

## Root Cause Ranking

The controller ranks repeated failures by:

- frequency
- severity
- whether exact matches were affected
- whether the issue appears across multiple categories

The selected root cause becomes the focus of `docs/agent-next-task.md`.

## Fix Handoff

When repeated failures exist, use `docs/agent-next-task.md` with `docs/agent-fix-template.md`.

Fix agents must:

- ask for or already have explicit user approval before editing code
- fix shared parsing, matching, search, evidence, ranking, validation, or UI trust logic
- avoid product-specific, brand-specific, store-specific, or category-only patches unless no general fix exists
- add regression tests that cover the root cause beyond one example
- update `docs/qa-loop-results.md` and `docs/change-log.md` when the change is meaningful

## Verification

Compare before/after result sets:

```powershell
npm run qa:verify -- --before docs/agent-worker-results/before.json --after docs/agent-worker-results/after.json
```

You can also pass directories or comma-separated file lists.

The verifier rejects a loop when:

- new root causes appear
- exact-match-affecting failures increase
- wrong-price, wrong-product, or non-product-card failures increase
- the result appears to describe a hardcoded product/category/store patch

Verifier output is written to `docs/agent-worker-results/verify-*.json`.

## Phase 6 Report

The controller writes `docs/agent-loop-report.md` after each run.

It includes:

- latest run status
- worker batches run
- top repeated root causes
- verifier status when available
- next recommended QA batch
- current worker result files

This report is for developers and agents only. It is not part of the shopper-facing ReviewRadar UI.

## Markdown Sync Rule

The repo markdown files are the source of truth. Desktop copies are snapshots.

When these files are updated:

- `ReviewRadar-Overview.md`
- `docs/qa-loop-results.md`
- `docs/change-log.md`

copy them to:

```text
C:\Users\tluch\Desktop\RR Markdowns
```

The controller syncs those three files automatically after `npm run qa:loop`.

## Stop Rules

Stop and ask before changing app code unless the user has already approved implementation.

Reject or revise any fix that:

- only patches the exact failed product, store, brand, or category
- weakens hard requirements to make a bad result pass
- hides failures in the UI instead of fixing the pipeline
- improves one QA case while causing broader regressions
- changes public APIs, UI behavior, response shape, or ranking behavior just to support the loop

// OAI-T8C multi-category direct-Terra validation.
//
// The promotion gate for making direct-Terra the default pipeline: run the four
// frozen non-shop-vac cases (lib/directTerraEvaluation.ts) x N runs and measure
// BOTH dimensions on the current commit —
//   report quality: leader recall, wrong-type safety, budget compliance,
//                   run-to-run stability (reused T7C scorer); and
//   asset coverage: photos + links from a manufacturer or popular retailer
//                   (the T8B goal), beyond shop vac.
//
// Dry-run is the default and does zero network. Live requires --execute plus
// OPENAI_API_KEY and a valid SERPER_API_KEY. Ceilings are enforced in code;
// evidence is sanitized and untracked. Flags are not read and not changed.

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  DIRECT_TERRA_RESEARCH_CONFIG,
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import {
  DIRECT_TERRA_COMPARISON_MODEL,
  DIRECT_TERRA_PROMPT_VERSION,
} from "../lib/directTerraPrompt.ts";
import { buildDirectTerraRequirementContract } from "../lib/directTerraCandidateSlate.ts";
import {
  DIRECT_TERRA_EVAL_CASES,
  DIRECT_TERRA_EVAL_VERSION,
  scoreDirectTerraCaseStability,
  scoreDirectTerraRun,
  scoreDirectTerraRunProspective,
} from "../lib/directTerraEvaluation.ts";
import { resolveDirectTerraProductAssets } from "../lib/directTerraProductAssets.ts";
import {
  createDirectTerraSerperOrganicTransport,
  createDirectTerraSerperShoppingTransport,
  directTerraSerperApiKeyIsValid,
} from "../lib/directTerraSerperTransport.ts";
import {
  createDirectTerraProductPageTransport,
  MAX_DIRECT_TERRA_PAGE_FETCHES,
} from "../lib/directTerraProductPageFetcher.ts";
import {
  classifyDirectTerraLinkHost,
  registrableDomain,
} from "../lib/directTerraLinkPreference.ts";
import { extractDirectTerraHeadingIdentity } from "../lib/directTerraAssetVerifier.ts";
import {
  buildDirectTerraRankedProductAccounting,
  buildDirectTerraRecommendationFirstLossDiagnostic,
} from "../lib/directTerraFirstLoss.ts";
import {
  OAI_2A_PROPOSED_CONFIG,
  estimateAutonomousResearchCost,
} from "../lib/autonomousResearchAdapter.ts";
import {
  GOLD,
  coversLeader,
  coversLeaderProspective07d,
} from "./goldBenchmark.mjs";
import { createOpenAIClient } from "../lib/openaiClient.ts";

const EXECUTE = process.argv.includes("--execute");
const SOL_COMPARISON = process.argv.includes("--sol-comparison");
const ROOT_CAUSE_REVALIDATION = process.argv.includes(
  "--root-cause-revalidation",
);
const FIRST_LOSS_DIAGNOSTIC =
  process.argv.includes("--first-loss-diagnostic") ||
  ROOT_CAUSE_REVALIDATION ||
  SOL_COMPARISON;
const SOL_COMPARISON_CASE_ID = "eval-con-robot-vac-300-selfempty";
const ROOT_CAUSE_REVALIDATION_CASE_IDS = new Set([
  "eval-broad-office-chair",
  "eval-con-gas-grill-600-4burner",
  "eval-con-robot-vac-300-selfempty",
]);
const RUN_CASES = SOL_COMPARISON
  ? DIRECT_TERRA_EVAL_CASES.filter(
      (entry) => entry.id === SOL_COMPARISON_CASE_ID,
    )
  : ROOT_CAUSE_REVALIDATION
    ? DIRECT_TERRA_EVAL_CASES.filter((entry) =>
      ROOT_CAUSE_REVALIDATION_CASE_IDS.has(entry.id),
    )
    : DIRECT_TERRA_EVAL_CASES;
const RUNS_PER_CASE = FIRST_LOSS_DIAGNOSTIC ? 1 : 3;
const RESEARCH_MODEL = SOL_COMPARISON
  ? DIRECT_TERRA_COMPARISON_MODEL
  : DIRECT_TERRA_RESEARCH_CONFIG.model;
const CEILINGS = Object.freeze({
  hostedSearchesPerRun: DIRECT_TERRA_RESEARCH_CONFIG.maxToolCalls,
  retrievesPerRun: 60,
  safetyCancelsPerRun: 1,
  serperShoppingPerRun: 5,
  serperOrganicPerRun: 8,
  pageFetchesPerRun: MAX_DIRECT_TERRA_PAGE_FETCHES,
  selectedImageRetrievalsPerRun: SOL_COMPARISON ? 5 : 0,
  hardCeilingUsd: SOL_COMPARISON
    ? 4
    : ROOT_CAUSE_REVALIDATION
    ? 4
    : FIRST_LOSS_DIAGNOSTIC
      ? 5
      : 15,
});
const POLL_INTERVAL_MS = 5_000;

function resolveCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const COMMIT = resolveCommit();
const APPROVAL = {
  id: SOL_COMPARISON
    ? "oai-t8e-sol-terra-robot-comparison-v1"
    : ROOT_CAUSE_REVALIDATION
    ? "oai-t8d-root-cause-revalidation-v1"
    : FIRST_LOSS_DIAGNOSTIC
      ? "oai-t8d-root-cause-diagnostic-v2"
      : "oai-t8c-multi-category-validation-v1",
  commit: COMMIT,
  evalVersion: DIRECT_TERRA_EVAL_VERSION,
  model: RESEARCH_MODEL,
  reasoning: DIRECT_TERRA_RESEARCH_CONFIG.reasoning,
  caseCount: RUN_CASES.length,
  runsPerCase: RUNS_PER_CASE,
  maxCreates: RUN_CASES.length * RUNS_PER_CASE,
  ceilings: CEILINGS,
  expectedPromptVersion: "direct-terra-master-prompt-v3",
};
const OUT_DIR = path.resolve(
  SOL_COMPARISON
    ? `tests/fixtures/review-radar-live/oai-t8e-sol-terra-robot-comparison-${COMMIT}`
    : ROOT_CAUSE_REVALIDATION
    ? `tests/fixtures/review-radar-live/oai-t8d-root-cause-revalidation-${COMMIT}`
    : FIRST_LOSS_DIAGNOSTIC
      ? `tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-${COMMIT}`
      : `tests/fixtures/review-radar-live/oai-t8c-multi-category-validation-${COMMIT}`,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function goldById(id) {
  const entry = GOLD.find((g) => g.id === id);
  if (!entry) throw new Error(`Missing GOLD entry ${id}`);
  return entry;
}
function ratesForUsage(usage) {
  if (SOL_COMPARISON) {
    return usage.inputTokens > OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens
      ? {
          inputPerMillionUsd: 10,
          cachedInputPerMillionUsd: 1,
          outputPerMillionUsd: 45,
          webSearchCallUsd: 0.01,
        }
      : {
          inputPerMillionUsd: 5,
          cachedInputPerMillionUsd: 0.5,
          outputPerMillionUsd: 30,
          webSearchCallUsd: 0.01,
        };
  }
  return usage.inputTokens > OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens
    ? OAI_2A_PROPOSED_CONFIG.longContextRatesAsOf2026_07_15
    : OAI_2A_PROPOSED_CONFIG.standardRatesAsOf2026_07_15;
}
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readBoundedImageBody(response, maximumBytes = 8 * 1024 * 1024) {
  if (!response.body) throw new Error("missing_image_body");
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maximumBytes) {
      throw new Error("image_body_too_large");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function retrieveSelectedImages({
  productAssets,
  runLabel,
  perRun,
}) {
  const checks = [];
  for (const asset of productAssets) {
    if (!asset.imageUrl) continue;
    if (
      perRun.imageRetrievals >= CEILINGS.selectedImageRetrievalsPerRun
    ) {
      throw new Error("Selected-image retrieval ceiling exceeded");
    }
    perRun.imageRetrievals += 1;
    const urlHash = createHash("sha256")
      .update(asset.imageUrl, "utf8")
      .digest("hex");
    try {
      const parsed = new URL(asset.imageUrl);
      if (parsed.protocol !== "https:") throw new Error("non_https_image");
      const response = await fetch(parsed, {
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`image_http_${response.status}`);
      const contentType = response.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim()
        ?.toLowerCase();
      if (!contentType?.startsWith("image/")) {
        throw new Error("non_image_content_type");
      }
      const body = await readBoundedImageBody(response);
      const extension =
        contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : contentType === "image/gif"
              ? "gif"
              : "jpg";
      const fileName = `${runLabel}.rank${asset.rank}.${extension}`;
      await fs.writeFile(path.join(OUT_DIR, fileName), body);
      checks.push({
        rank: asset.rank,
        status: "retrieved",
        contentType,
        byteLength: body.byteLength,
        urlHash,
        fileName,
      });
    } catch (error) {
      checks.push({
        rank: asset.rank,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown_error",
        urlHash,
      });
    }
  }
  return checks;
}

// Goal metric: is each displayed link on a manufacturer/popular-retailer host
// with a clean URL, and is each image from that page (not a Google thumbnail)?
function scoreAssetCoverage(productAssets, assetTargets) {
  const brandByRank = new Map(assetTargets.map((t) => [t.rank, t.brand]));
  const perAsset = productAssets.map((asset) => {
    const brand =
      brandByRank.get(asset.rank) ??
      extractDirectTerraHeadingIdentity(asset.productName)?.brand ??
      "";
    const linkHostClass = asset.productUrl
      ? classifyDirectTerraLinkHost(asset.productUrl, brand)
      : null;
    let imageRegistrable = null;
    try {
      imageRegistrable = asset.imageUrl
        ? registrableDomain(new URL(asset.imageUrl).hostname)
        : null;
    } catch {
      imageRegistrable = null;
    }
    return {
      rank: asset.rank,
      hasLink: Boolean(asset.productUrl),
      linkHostClass,
      linkPreferredHost:
        linkHostClass === "manufacturer" || linkHostClass === "popular_retailer",
      linkClean: asset.productUrl ? !new URL(asset.productUrl).search : null,
      hasImage: Boolean(asset.imageUrl),
      imageFromPage: Boolean(
        asset.imageUrl && imageRegistrable && imageRegistrable !== "gstatic.com",
      ),
    };
  });
  const total = productAssets.length;
  return {
    total,
    links: perAsset.filter((a) => a.hasLink).length,
    preferredHostLinks: perAsset.filter((a) => a.linkPreferredHost).length,
    cleanLinks: perAsset.filter((a) => a.linkClean === true).length,
    images: perAsset.filter((a) => a.hasImage).length,
    pageImages: perAsset.filter((a) => a.imageFromPage).length,
    fullyDecorated: perAsset.filter((a) => a.hasLink && a.hasImage).length,
    perAsset,
  };
}

function plan() {
  return {
    schemaVersion: SOL_COMPARISON
      ? "oai-t8e-sol-terra-robot-comparison-plan-v1"
      : ROOT_CAUSE_REVALIDATION
      ? "oai-t8d-root-cause-revalidation-plan-v1"
      : FIRST_LOSS_DIAGNOSTIC
        ? "oai-t8d-root-cause-diagnostic-plan-v1"
        : "oai-t8c-multi-category-validation-plan-v1",
    mode: EXECUTE ? "execute" : "dry-run",
    commit: COMMIT,
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    model: RESEARCH_MODEL,
    cases: RUN_CASES.map((c) => ({
      id: c.id,
      goldId: c.goldId,
      request: c.request,
    })),
    runsPerCase: RUNS_PER_CASE,
    totalCreates: APPROVAL.maxCreates,
    ceilings: CEILINGS,
    outputDirectory: OUT_DIR,
  };
}

async function main() {
  const selectedModes = [
    SOL_COMPARISON,
    ROOT_CAUSE_REVALIDATION,
    process.argv.includes("--first-loss-diagnostic"),
  ].filter(Boolean).length;
  if (selectedModes > 1) {
    throw new Error("Choose exactly one validation mode.");
  }
  if (
    ROOT_CAUSE_REVALIDATION &&
    process.argv.includes("--first-loss-diagnostic")
  ) {
    throw new Error(
      "Choose either --root-cause-revalidation or --first-loss-diagnostic.",
    );
  }
  if (
    SOL_COMPARISON &&
    (RUN_CASES.length !== 1 || RUN_CASES[0]?.id !== SOL_COMPARISON_CASE_ID)
  ) {
    throw new Error("Sol comparison case contract is incomplete.");
  }
  if (
    ROOT_CAUSE_REVALIDATION &&
    RUN_CASES.length !== ROOT_CAUSE_REVALIDATION_CASE_IDS.size
  ) {
    throw new Error("Root-cause revalidation case contract is incomplete.");
  }
  if (APPROVAL.expectedPromptVersion !== DIRECT_TERRA_PROMPT_VERSION) {
    throw new Error(
      `Prompt version mismatch: pins ${APPROVAL.expectedPromptVersion}, code exports ${DIRECT_TERRA_PROMPT_VERSION}`,
    );
  }
  for (const evalCase of RUN_CASES) goldById(evalCase.goldId);

  if (!EXECUTE) {
    process.stdout.write(`${JSON.stringify({ status: "preflight_passed", plan: plan() }, null, 2)}\n`);
    return;
  }

  let existing = [];
  try {
    existing = await fs.readdir(OUT_DIR);
  } catch {
    // fresh
  }
  if (existing.length > 0) {
    throw new Error(`Evidence already exists at ${OUT_DIR}; refusing replacement.`);
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  if (!directTerraSerperApiKeyIsValid(process.env.SERPER_API_KEY || "")) {
    throw new Error("SERPER_API_KEY is not configured safely");
  }

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, { maxRetries: 0 });
  if (sdkClient.maxRetries !== 0) throw new Error("OpenAI SDK retry suppression is not active");

  let totalCreates = 0;
  let totalRetrieves = 0;
  let totalCostUsd = 0;
  const perRun = {
    creates: 0,
    retrieves: 0,
    cancels: 0,
    shopping: 0,
    organic: 0,
    pageFetches: 0,
    imageRetrievals: 0,
  };
  const client = {
    responses: {
      create: async (...args) => {
        if (totalCreates >= APPROVAL.maxCreates) throw new Error("Global create ceiling exceeded");
        totalCreates += 1;
        perRun.creates += 1;
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        if (perRun.retrieves >= CEILINGS.retrievesPerRun) throw new Error("Per-run retrieve ceiling exceeded");
        totalRetrieves += 1;
        perRun.retrieves += 1;
        return sdkClient.responses.retrieve(...args);
      },
      cancel: async (...args) => {
        if (perRun.cancels >= CEILINGS.safetyCancelsPerRun) throw new Error("Per-run cancel ceiling exceeded");
        perRun.cancels += 1;
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  const baseShopping = createDirectTerraSerperShoppingTransport({ apiKey: process.env.SERPER_API_KEY });
  const baseOrganic = createDirectTerraSerperOrganicTransport({ apiKey: process.env.SERPER_API_KEY });
  const basePage = createDirectTerraProductPageTransport({});
  const shoppingTransport = async (request) => {
    if (perRun.shopping >= CEILINGS.serperShoppingPerRun) throw new Error("Serper Shopping ceiling exceeded");
    perRun.shopping += 1;
    return baseShopping(request);
  };
  const organicTransport = async (request) => {
    if (perRun.organic >= CEILINGS.serperOrganicPerRun) throw new Error("Serper organic ceiling exceeded");
    perRun.organic += 1;
    return baseOrganic(request);
  };
  const pageTransport = async (url) => {
    if (perRun.pageFetches >= CEILINGS.pageFetchesPerRun) throw new Error("Page-fetch ceiling exceeded");
    perRun.pageFetches += 1;
    return basePage(url);
  };

  const startedAtMs = Date.now();
  const summary = {
    schemaVersion: SOL_COMPARISON
      ? "oai-t8e-sol-terra-robot-comparison-summary-v1"
      : ROOT_CAUSE_REVALIDATION
      ? "oai-t8d-root-cause-revalidation-summary-v1"
      : FIRST_LOSS_DIAGNOSTIC
        ? "oai-t8d-root-cause-diagnostic-summary-v1"
        : "oai-t8c-multi-category-validation-summary-v1",
    approval: APPROVAL,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totals: { creates: 0, retrieves: 0, estimatedCostUsd: 0, wallClockMs: 0 },
    cases: [],
    failure: null,
  };
  await writeJson(path.join(OUT_DIR, "summary.json"), summary);

  try {
    for (const evalCase of RUN_CASES) {
      const goldEntry = goldById(evalCase.goldId);
      const runScores = [];
      const prospectiveRunScores = [];
      const assetCoverages = [];
      const caseRecord = { id: evalCase.id, goldId: evalCase.goldId, runs: [] };

      for (let runIndex = 1; runIndex <= RUNS_PER_CASE; runIndex += 1) {
        const requirementContract = buildDirectTerraRequirementContract(
          evalCase.request,
        );
        perRun.creates = 0;
        perRun.retrieves = 0;
        perRun.cancels = 0;
        perRun.shopping = 0;
        perRun.organic = 0;
        perRun.pageFetches = 0;
        perRun.imageRetrievals = 0;
        const runStartMs = Date.now();

        const start = await startDirectTerraResearch({
          client,
          shopperRequest: evalCase.request,
          model: RESEARCH_MODEL,
        });
        if (!start.ok) throw new Error(`start failed ${evalCase.id} run ${runIndex}: ${start.reason}`);

        let completion = null;
        while (true) {
          if (perRun.retrieves >= CEILINGS.retrievesPerRun) {
            try {
              await cancelDirectTerraResearch({
                client,
                responseId: start.responseId,
                promptVersion: start.promptVersion,
                promptHash: start.promptHash,
                model: RESEARCH_MODEL,
              });
            } catch {
              // best-effort
            }
            throw new Error(`retrieve ceiling reached ${evalCase.id} run ${runIndex}`);
          }
          await sleep(POLL_INTERVAL_MS);
          const poll = await pollDirectTerraResearch({
            client,
            responseId: start.responseId,
            promptVersion: start.promptVersion,
            promptHash: start.promptHash,
            model: RESEARCH_MODEL,
            requirementContract,
          });
          if (poll.ok && poll.state === "pending") continue;
          if (!poll.ok) throw new Error(`poll failed ${evalCase.id} run ${runIndex}: ${poll.reason}`);
          completion = poll;
          break;
        }

        const usage = completion.ledger.usage;
        const runCostUsd = Number(estimateAutonomousResearchCost(usage, ratesForUsage(usage)).toFixed(6));
        totalCostUsd += runCostUsd;
        if (totalCostUsd > CEILINGS.hardCeilingUsd) {
          throw new Error(`Hard cost ceiling exceeded: $${totalCostUsd.toFixed(4)}`);
        }

        const runScore = scoreDirectTerraRun({
          reportMarkdown: completion.reportMarkdown,
          priceEstimates: completion.priceEstimates,
          goldEntry,
          coversLeader,
        });
        runScores.push(runScore);
        const prospectiveRunScore = scoreDirectTerraRunProspective({
          reportMarkdown: completion.reportMarkdown,
          priceEstimates: completion.priceEstimates,
          goldEntry,
          coversLeader: coversLeaderProspective07d,
        });
        prospectiveRunScores.push(prospectiveRunScore);

        // Resolve + score the product assets exactly as the app route does.
        const assetFirstLoss = [];
        const productAssets = await resolveDirectTerraProductAssets({
          targets: completion.assetTargets,
          reportMarkdown: completion.reportMarkdown,
          activeCitationUrls: completion.citationUrls,
          responseSources: completion.responseSources,
          serperTransport: shoppingTransport,
          serperOrganicTransport: organicTransport,
          productPageTransport: pageTransport,
          recordFirstLossDiagnostic: FIRST_LOSS_DIAGNOSTIC
            ? (diagnostic) => assetFirstLoss.push(diagnostic)
            : undefined,
        });
        const assetCoverage = scoreAssetCoverage(productAssets, completion.assetTargets);
        assetCoverages.push(assetCoverage);
        const selectedImageChecks = SOL_COMPARISON
          ? await retrieveSelectedImages({
              productAssets,
              runLabel: `${evalCase.id}.run${runIndex}`,
              perRun,
            })
          : [];
        const recommendationFirstLoss = FIRST_LOSS_DIAGNOSTIC
          ? buildDirectTerraRecommendationFirstLossDiagnostic({
              searchCallCount: completion.ledger.usage.webSearchCalls,
              searchActions: completion.searchActions,
              sourceHosts: completion.sourceHosts,
              responseSourceTitles: completion.responseSources
                .map((source) => source.title)
                .filter((title) => typeof title === "string"),
              reportMarkdown: completion.reportMarkdown,
              leaders: goldEntry.coreLeaders,
              rankedProducts: prospectiveRunScore.rankedProducts,
              coversLeader: coversLeaderProspective07d,
              requirementVerdicts: {
                wrongTypeCount: prospectiveRunScore.wrongTypeHits.length,
                budgetViolationCount:
                  prospectiveRunScore.constraint?.budgetViolations.length ?? 0,
                featureCoverage:
                  prospectiveRunScore.constraint?.features.map((feature) => ({
                    label: feature.label,
                    coverageRate: feature.coverageRate,
                  })) ?? [],
              },
              candidateSlateDiagnostic: completion.candidateSlateDiagnostic,
            })
          : null;
        const rankedProductAccounting = FIRST_LOSS_DIAGNOSTIC
          ? buildDirectTerraRankedProductAccounting({
              reportMarkdown: completion.reportMarkdown,
              targets: completion.assetTargets,
              productAssets,
              assetDiagnostics: assetFirstLoss,
            })
          : null;

        await writeJson(path.join(OUT_DIR, `${evalCase.id}.run${runIndex}.json`), {
          approval: APPROVAL,
          case: evalCase,
          run: runIndex,
          wallClockMs: Date.now() - runStartMs,
          estimatedCostUsd: runCostUsd,
          serperCounts: { shopping: perRun.shopping, organic: perRun.organic, pageFetches: perRun.pageFetches },
          ledger: completion.ledger,
          reportMarkdown: completion.reportMarkdown,
          priceEstimates: completion.priceEstimates,
          productAssets,
          selectedImageChecks,
          score: runScore,
          scoreProspective07d: prospectiveRunScore,
          assetCoverage,
          firstLoss:
            FIRST_LOSS_DIAGNOSTIC
              ? {
                  recommendation: recommendationFirstLoss,
                  assets: assetFirstLoss,
                  rankedProducts: rankedProductAccounting,
                  accountingComplete:
                    rankedProductAccounting?.accountingComplete === true,
                }
              : undefined,
        });
        caseRecord.runs.push({
          run: runIndex,
          recall: `${runScore.leaderRecall.count}/${runScore.leaderRecall.total}`,
          recallProspective07d: `${prospectiveRunScore.leaderRecall.count}/${prospectiveRunScore.leaderRecall.total}`,
          wrongType: runScore.wrongTypeHits.length,
          wrongTypeProspective07d: prospectiveRunScore.wrongTypeHits.length,
          budgetViolations: runScore.constraint?.budgetViolations.length ?? 0,
          rankedCount: runScore.rankedCount,
          assets: `${assetCoverage.fullyDecorated}/${assetCoverage.total} decorated, ${assetCoverage.preferredHostLinks} preferred-host links, ${assetCoverage.pageImages} page images`,
          selectedImageRetrievals: perRun.imageRetrievals,
          costUsd: runCostUsd,
        });
      }

      const sum = (list, key) => list.reduce((a, c) => a + c[key], 0);
      caseRecord.stability = scoreDirectTerraCaseStability(runScores);
      caseRecord.stabilityProspective07d =
        scoreDirectTerraCaseStability(prospectiveRunScores);
      caseRecord.assetTotals = {
        totalAssets: sum(assetCoverages, "total"),
        links: sum(assetCoverages, "links"),
        preferredHostLinks: sum(assetCoverages, "preferredHostLinks"),
        cleanLinks: sum(assetCoverages, "cleanLinks"),
        images: sum(assetCoverages, "images"),
        pageImages: sum(assetCoverages, "pageImages"),
        fullyDecorated: sum(assetCoverages, "fullyDecorated"),
      };
      summary.cases.push(caseRecord);
      summary.totals = {
        creates: totalCreates,
        retrieves: totalRetrieves,
        estimatedCostUsd: Number(totalCostUsd.toFixed(6)),
        wallClockMs: Date.now() - startedAtMs,
      };
      await writeJson(path.join(OUT_DIR, "summary.json"), summary);
    }

    summary.completedAt = new Date().toISOString();
    summary.totals.wallClockMs = Date.now() - startedAtMs;
    await writeJson(path.join(OUT_DIR, "summary.json"), summary);
    process.stdout.write(
      `${JSON.stringify({
        status: "completed",
        totals: summary.totals,
        cases: summary.cases.map((c) => ({
          id: c.id,
          recall: c.stability.recallCounts,
          recallMean: Number(c.stability.recallMean.toFixed(2)),
          leaderStability: c.stability.leaderSetJaccard,
          maxWrongType: c.stability.maxWrongTypeInAnyRun,
          maxBudgetViolations: c.stability.maxBudgetViolationsInAnyRun,
          assets: c.assetTotals,
        })),
      })}\n`,
    );
  } catch (error) {
    summary.failure = error instanceof Error ? error.message : "unknown_error";
    summary.completedAt = new Date().toISOString();
    summary.totals = {
      creates: totalCreates,
      retrieves: totalRetrieves,
      estimatedCostUsd: Number(totalCostUsd.toFixed(6)),
      wallClockMs: Date.now() - startedAtMs,
    };
    await writeJson(path.join(OUT_DIR, "summary.json"), summary);
    throw error;
  }
}

await main();

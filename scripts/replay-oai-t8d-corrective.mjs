// Zero-live corrective replay for the eight OAI-T8D diagnostic fixtures.
//
// Recomputes recommendation quality with the prospective 07d matcher/scorer,
// extracts report-named non-ranked products, and revalidates every retained
// final product link through the current asset safety boundary. Historical
// scores remain alongside the corrected scores; provider-candidate identity
// cannot be reconstructed from v1 traces and is reported as unavailable.

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildDirectTerraRecommendationFirstLossDiagnostic,
} from "../lib/directTerraFirstLoss.ts";
import {
  parseRankedProducts,
  scoreDirectTerraRunProspective,
} from "../lib/directTerraEvaluation.ts";
import {
  extractDirectTerraHeadingIdentity,
  verifyDirectTerraAssetCandidates,
} from "../lib/directTerraAssetVerifier.ts";
import { detectKnownBrands } from "../lib/brandMatching.ts";
import {
  extractDirectTerraAssetTargets,
} from "../lib/directTerraResponse.ts";
import {
  GOLD,
  coversLeaderProspective07d,
} from "./goldBenchmark.mjs";

const DEFAULT_DIRECTORY = path.resolve(
  "tests/fixtures/review-radar-live/oai-t8d-root-cause-diagnostic-437a682",
);

function goldById(id) {
  const entry = GOLD.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing GOLD entry ${id}`);
  return entry;
}

function numeric(value) {
  return Number.isFinite(value) ? value : 0;
}

function fallbackTargetFromRankedProduct(product, category) {
  const knownBrands = detectKnownBrands(product.name).sort(
    (left, right) => right.length - left.length,
  );
  const brand = knownBrands[0] ?? product.name.trim().split(/\s+/)[0] ?? "";
  const brandTokens = brand.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const nameTokens = product.name.match(/[A-Za-z0-9]+(?:[-/.+][A-Za-z0-9]+)*/g) ?? [];
  const modelTokens = nameTokens.slice(brandTokens.length);
  const model = modelTokens.join(" ").trim();
  if (!brand || !model) return null;
  return {
    key: `rank-${product.rank}-${product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    rank: product.rank,
    productName: product.name,
    brand,
    model,
    category,
  };
}

export async function buildOaiT8dCorrectiveReplay(
  directory = DEFAULT_DIRECTORY,
) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^eval-.+\.run\d+\.json$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  const runs = [];
  for (const file of files) {
    const saved = JSON.parse(
      await fs.readFile(path.join(directory, file), "utf8"),
    );
    const goldEntry = goldById(saved.case?.goldId);
    const correctedScore = scoreDirectTerraRunProspective({
      reportMarkdown: saved.reportMarkdown,
      priceEstimates: saved.priceEstimates ?? [],
      goldEntry,
      coversLeader: coversLeaderProspective07d,
    });
    const priorRecommendation = saved.firstLoss?.recommendation ?? {};
    const recommendation = buildDirectTerraRecommendationFirstLossDiagnostic({
      searchCallCount: numeric(priorRecommendation.searchCallCount),
      searchActions: Array.isArray(priorRecommendation.searchActions)
        ? priorRecommendation.searchActions
        : [],
      sourceHosts: Array.isArray(priorRecommendation.sourceHosts)
        ? priorRecommendation.sourceHosts
        : [],
      responseSourceTitles: null,
      reportMarkdown: saved.reportMarkdown,
      leaders: goldEntry.coreLeaders,
      rankedProducts: correctedScore.rankedProducts,
      coversLeader: coversLeaderProspective07d,
      requirementVerdicts: {
        wrongTypeCount: correctedScore.wrongTypeHits.length,
        budgetViolationCount:
          correctedScore.constraint?.budgetViolations.length ?? 0,
        featureCoverage:
          correctedScore.constraint?.features.map((feature) => ({
            label: feature.label,
            coverageRate: feature.coverageRate,
          })) ?? [],
      },
    });

    const replayPriceObservations = (saved.priceEstimates ?? [])
      .filter(
        (estimate) =>
          Number.isInteger(estimate?.rank) &&
          typeof estimate?.brand === "string" &&
          typeof estimate?.model === "string",
      )
      .map((estimate) => ({
        rank: estimate.rank,
        brand: estimate.brand,
        model: estimate.model,
        observations: [],
      }));
    const extractedTargets = extractDirectTerraAssetTargets({
      reportMarkdown: saved.reportMarkdown,
      priceObservations: replayPriceObservations,
    });
    const extractedByRank = new Map(
      extractedTargets.map((target) => [target.rank, target]),
    );
    const ranked = parseRankedProducts(saved.reportMarkdown);
    const targets = ranked
      .map((product) => {
        const extracted = extractedByRank.get(product.rank);
        if (extracted) {
          return { ...extracted, category: goldEntry.category };
        }
        const headingIdentity = extractDirectTerraHeadingIdentity(product.name);
        if (headingIdentity) {
          return {
            key: `rank-${product.rank}-${product.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}`,
            rank: product.rank,
            productName: product.name,
            brand: headingIdentity.brand,
            model: headingIdentity.model,
            category: goldEntry.category,
          };
        }
        return fallbackTargetFromRankedProduct(
          product,
          goldEntry.category,
        );
      })
      .filter(Boolean);
    const targetByRank = new Map(
      targets.map((target) => [target.rank, target]),
    );
    const retainedAssets = Array.isArray(saved.productAssets)
      ? saved.productAssets
      : [];
    const linkRevalidation = retainedAssets
      .filter((asset) => asset?.productUrl)
      .map((asset) => {
        const target = targetByRank.get(asset.rank);
        if (!target) {
          return {
            rank: asset.rank,
            identityKey: `rank-${asset.rank}`,
            accepted: false,
            reason: "target_identity_not_extracted",
          };
        }
        const verification = verifyDirectTerraAssetCandidates({
          target,
          candidates: [
            {
              title: asset.productName,
              productUrl: asset.productUrl,
            },
          ],
        });
        return {
          rank: asset.rank,
          identityKey: target.key,
          accepted: verification.productUrl !== null,
          relationship:
            verification.decisions[0]?.relationship ?? "unknown",
          relationshipReason:
            verification.decisions[0]?.relationshipReason ??
            "verification_missing",
          reason:
            verification.decisions[0]?.productUrlReason ??
            "verification_missing",
        };
      });

    runs.push({
      id: file,
      rankedProductCount: ranked.length,
      extractedTargetCount: targets.length,
      historical: {
        recall: saved.score?.leaderRecall ?? null,
        wrongTypeHits: saved.score?.wrongTypeHits ?? [],
      },
      corrected: {
        recall: correctedScore.leaderRecall,
        wrongTypeHits: correctedScore.wrongTypeHits,
      },
      recommendation,
      retainedLinkCount: linkRevalidation.length,
      linkRevalidation,
      providerCandidateIdentityReplay: {
        status: "unavailable_in_historical_v1_trace",
        explanation:
          "The saved run retained aggregate verifier counts but not candidate identity samples.",
      },
    });
  }

  const total = (selector) =>
    runs.reduce((sum, run) => sum + numeric(selector(run)), 0);
  const replayWarnings = runs.flatMap((run) =>
    run.linkRevalidation
      .filter((link) => !link.accepted)
      .map((link) => ({ run: run.id, ...link })),
  );
  const definitiveBlockedLinks = replayWarnings.filter(
    (link) =>
      link.reason === "product_url_type_conflict" ||
      (link.reason === "product_relationship_not_safe" &&
        [
          "accessory_or_replacement",
          "different_product",
          "non_product_page",
        ].includes(link.relationship)),
  );
  const indeterminateLinkReplayWarnings = replayWarnings.filter(
    (link) => !definitiveBlockedLinks.includes(link),
  );
  const namedNotRanked = runs.reduce(
    (sum, run) =>
      sum +
      run.recommendation.leaders.filter(
        (leader) => leader.outcome === "terra_report_named_not_ranked",
      ).length,
    0,
  );

  return {
    schemaVersion: "oai-t8d-corrective-replay-v1",
    generatedAt: new Date().toISOString(),
    zeroLive: true,
    runCount: runs.length,
    allRankedProductsAccounted:
      runs.length === 8 &&
      runs.every(
        (run) => run.rankedProductCount === run.extractedTargetCount,
      ),
    totals: {
      rankedProducts: total((run) => run.rankedProductCount),
      historicalLeaderHits: total(
        (run) => run.historical.recall?.count,
      ),
      correctedLeaderHits: total((run) => run.corrected.recall.count),
      historicalWrongTypeHits: total(
        (run) => run.historical.wrongTypeHits.length,
      ),
      correctedWrongTypeHits: total(
        (run) => run.corrected.wrongTypeHits.length,
      ),
      reportNamedNotRankedLeaders: namedNotRanked,
      retainedLinksRevalidated: total((run) => run.retainedLinkCount),
      definitiveWrongVariantLinksBlocked: definitiveBlockedLinks.length,
      definitiveUnsafeLinksBlocked: definitiveBlockedLinks.length,
      indeterminateLinkReplayWarnings:
        indeterminateLinkReplayWarnings.length,
    },
    definitiveBlockedLinks,
    indeterminateLinkReplayWarnings,
    evidenceLimits: [
      "This replay performs zero provider or source-page requests.",
      "The v1 saved traces cannot distinguish provider absence from a false identity rejection because they did not retain candidate identity samples.",
      "Final-link revalidation uses the ranked product name as title evidence; it is a conservative final safety replay, not a reconstruction of the original provider row.",
      "A positive product_url_type_conflict or complete-product relationship rejection is decision-grade in the final-link replay. Other rejections remain indeterminate because original provider titles were not retained.",
    ],
    runs,
  };
}

async function main() {
  const directoryIndex = process.argv.indexOf("--directory");
  const directory =
    directoryIndex >= 0 && process.argv[directoryIndex + 1]
      ? path.resolve(process.argv[directoryIndex + 1])
      : DEFAULT_DIRECTORY;
  const replay = await buildOaiT8dCorrectiveReplay(directory);
  if (process.argv.includes("--write")) {
    const outputIndex = process.argv.indexOf("--output");
    const output =
      outputIndex >= 0 && process.argv[outputIndex + 1]
        ? path.resolve(process.argv[outputIndex + 1])
        : path.join(directory, "corrective-replay.json");
    await fs.writeFile(output, `${JSON.stringify(replay, null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({
        status: "written",
        output,
        runCount: replay.runCount,
        allRankedProductsAccounted: replay.allRankedProductsAccounted,
        totals: replay.totals,
        definitiveBlockedLinks: replay.definitiveBlockedLinks,
        indeterminateLinkReplayWarningCount:
          replay.indeterminateLinkReplayWarnings.length,
      })}\n`,
    );
    return;
  }
  process.stdout.write(`${JSON.stringify(replay, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}

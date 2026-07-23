// One bounded live proof for the complete Direct-Terra recommendation plus
// exact-product asset path. Dry-run is the default. Live execution requires an
// exact reviewed commit and every numeric ceiling on the command line.

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  DIRECT_TERRA_API_VERSION,
  isDirectTerraCompletedResponse,
} from "../lib/directTerraApiContract.ts";
import { resolveDirectTerraProductAssets } from "../lib/directTerraProductAssets.ts";
import {
  DIRECT_TERRA_RESEARCH_CONFIG,
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";
import {
  OAI_2A_PROPOSED_CONFIG,
  estimateAutonomousResearchCost,
} from "../lib/autonomousResearchAdapter.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";
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

const EXECUTE = process.argv.includes("--execute");
const FROZEN_REQUEST = Object.freeze({ query: "shop vac" });
const EXPECTED = Object.freeze({
  openAiCreates: 1,
  hostedSearches: DIRECT_TERRA_RESEARCH_CONFIG.maxToolCalls,
  retrieves: 60,
  safetyCancels: 1,
  serperShoppingSearches: 5,
  // Two bounded passes: open product-page queries plus retailer-scoped
  // second chances share this total.
  serperOrganicSearches: 8,
  productPageFetches: MAX_DIRECT_TERRA_PAGE_FETCHES,
  costUsd: 7,
});
const POLL_INTERVAL_MS = 5_000;

function argument(name) {
  return (
    process.argv
      .find((value) => value.startsWith(`--${name}=`))
      ?.slice(name.length + 3) || ""
  );
}

function numericArgument(name) {
  const value = Number(argument(name));
  return Number.isFinite(value) ? value : Number.NaN;
}

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function currentCommit() {
  return gitOutput(["rev-parse", "HEAD"]);
}

function trackedChanges() {
  const output = gitOutput(["status", "--porcelain", "--untracked-files=no"]);
  return output ? output.split(/\r?\n/) : [];
}

function ratesForUsage(usage) {
  return usage.inputTokens > OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens
    ? OAI_2A_PROPOSED_CONFIG.longContextRatesAsOf2026_07_15
    : OAI_2A_PROPOSED_CONFIG.standardRatesAsOf2026_07_15;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function evidenceDirectory(commit) {
  return path.resolve(
    `tests/fixtures/review-radar-live/oai-t8a-integrated-asset-smoke-${commit.slice(0, 7)}`,
  );
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

async function directoryHasEvidence(directory) {
  try {
    return (await fs.readdir(directory)).length > 0;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function plan(commit) {
  return {
    schemaVersion: "oai-t8a-integrated-asset-smoke-plan-v3",
    mode: EXECUTE ? "execute" : "dry-run",
    commit,
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    apiVersion: DIRECT_TERRA_API_VERSION,
    request: FROZEN_REQUEST,
    model: DIRECT_TERRA_RESEARCH_CONFIG.model,
    reasoning: DIRECT_TERRA_RESEARCH_CONFIG.reasoning,
    ceilings: EXPECTED,
    networkPolicy: {
      openAiResponses: true,
      openAiHostedWebSearch: true,
      serperShopping: true,
      serperOrganicProductPages: true,
      retries: false,
      replacements: false,
      fallbacks: false,
      // T8B: bounded GETs of already identity-verified product pages only,
      // for same-identity photos and rel=canonical clean URLs.
      verifiedProductPageFetches: true,
      additionalCases: false,
    },
    outputDirectory: evidenceDirectory(commit),
  };
}

function validateApproval(commit, outputExists) {
  const approved = {
    commit: argument("approved-commit"),
    openAiCreates: numericArgument("approved-openai-creates"),
    hostedSearches: numericArgument("approved-hosted-searches"),
    retrieves: numericArgument("approved-retrieves"),
    safetyCancels: numericArgument("approved-safety-cancels"),
    serperShoppingSearches: numericArgument(
      "approved-serper-shopping-searches",
    ),
    serperOrganicSearches: numericArgument(
      "approved-serper-organic-searches",
    ),
    productPageFetches: numericArgument("approved-product-page-fetches"),
    costUsd: numericArgument("approved-cost-usd"),
  };
  if (approved.commit !== commit) {
    throw new Error("Live approval is not pinned to the current full commit.");
  }
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (approved[key] !== expected) {
      throw new Error(`Live approval does not match the frozen ${key} ceiling.`);
    }
  }
  if (trackedChanges().length > 0) {
    throw new Error("Tracked worktree changes exist; refusing an unpinned run.");
  }
  if (outputExists) {
    throw new Error("Smoke evidence already exists; refusing a retry or replacement.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured in this process.");
  }
  if (!directTerraSerperApiKeyIsValid(process.env.SERPER_API_KEY || "")) {
    throw new Error("SERPER_API_KEY is not configured safely in this process.");
  }
}

async function main() {
  const commit = currentCommit();
  const runPlan = plan(commit);
  if (!EXECUTE) {
    process.stdout.write(`${JSON.stringify(runPlan, null, 2)}\n`);
    return;
  }

  const directory = evidenceDirectory(commit);
  validateApproval(commit, await directoryHasEvidence(directory));

  const attemptFile = path.join(directory, "broad-shop-vac.run1.attempt.json");
  const resultFile = path.join(directory, "broad-shop-vac.run1.json");
  const counters = {
    openAiCreates: 0,
    openAiRetrieves: 0,
    safetyCancels: 0,
    serperShoppingAttempts: 0,
    serperOrganicAttempts: 0,
    productPageFetchAttempts: 0,
    retries: 0,
    replacements: 0,
    fallbacks: 0,
    directPageRequests: 0,
  };
  const startedAtMs = Date.now();
  const evidence = {
    schemaVersion: "oai-t8a-integrated-asset-smoke-v3",
    commit,
    capturedAt: new Date().toISOString(),
    request: FROZEN_REQUEST,
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    apiVersion: DIRECT_TERRA_API_VERSION,
    model: DIRECT_TERRA_RESEARCH_CONFIG.model,
    reasoning: DIRECT_TERRA_RESEARCH_CONFIG.reasoning,
    ceilings: EXPECTED,
    counters,
    outcome: { status: "running", wallClockMs: 0, failure: null },
    usage: null,
    coverage: null,
    completedResponse: null,
  };
  await writeJson(attemptFile, evidence);
  let evidenceWrite = Promise.resolve();
  const persistAttempt = () => {
    evidenceWrite = evidenceWrite.then(() => writeJson(attemptFile, evidence));
    return evidenceWrite;
  };

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, {
    maxRetries: 0,
  });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI SDK retry suppression is not active.");
  }
  const client = {
    responses: {
      create: async (...args) => {
        if (counters.openAiCreates >= EXPECTED.openAiCreates) {
          throw new Error("OpenAI create ceiling exceeded.");
        }
        counters.openAiCreates += 1;
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        if (counters.openAiRetrieves >= EXPECTED.retrieves) {
          throw new Error("OpenAI retrieve ceiling exceeded.");
        }
        counters.openAiRetrieves += 1;
        return sdkClient.responses.retrieve(...args);
      },
      cancel: async (...args) => {
        if (counters.safetyCancels >= EXPECTED.safetyCancels) {
          throw new Error("OpenAI safety-cancel ceiling exceeded.");
        }
        counters.safetyCancels += 1;
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  let trackedJob = null;
  let completed = false;
  try {
    const started = await startDirectTerraResearch({
      client,
      shopperRequest: FROZEN_REQUEST,
    });
    if (!started.ok) throw new Error(`OpenAI start failed: ${started.reason}`);
    trackedJob = started;

    let research;
    while (true) {
      if (counters.openAiRetrieves >= EXPECTED.retrieves) {
        throw new Error("OpenAI retrieve ceiling reached before completion.");
      }
      await sleep(POLL_INTERVAL_MS);
      const polled = await pollDirectTerraResearch({
        client,
        responseId: started.responseId,
        promptVersion: started.promptVersion,
        promptHash: started.promptHash,
      });
      if (polled.ok && polled.state === "pending") continue;
      if (!polled.ok) throw new Error(`OpenAI poll failed: ${polled.reason}`);
      research = polled;
      completed = true;
      break;
    }

    const usage = research.ledger.usage;
    const estimatedCostUsd = Number(
      estimateAutonomousResearchCost(usage, ratesForUsage(usage)).toFixed(6),
    );
    if (
      usage.webSearchCalls < 1 ||
      usage.webSearchCalls > EXPECTED.hostedSearches
    ) {
      throw new Error("Hosted web-search count is outside the approved range.");
    }
    if (estimatedCostUsd > EXPECTED.costUsd) {
      throw new Error("Estimated OpenAI cost exceeded the approved ceiling.");
    }

    const baseTransport = createDirectTerraSerperShoppingTransport({
      apiKey: process.env.SERPER_API_KEY,
    });
    const serperTransport = async (request) => {
      if (
        counters.serperShoppingAttempts >= EXPECTED.serperShoppingSearches
      ) {
        throw new Error("Serper Shopping ceiling exceeded.");
      }
      counters.serperShoppingAttempts += 1;
      await persistAttempt();
      return baseTransport(request);
    };
    const baseOrganicTransport = createDirectTerraSerperOrganicTransport({
      apiKey: process.env.SERPER_API_KEY,
    });
    const serperOrganicTransport = async (request) => {
      if (counters.serperOrganicAttempts >= EXPECTED.serperOrganicSearches) {
        throw new Error("Serper organic ceiling exceeded.");
      }
      counters.serperOrganicAttempts += 1;
      await persistAttempt();
      return baseOrganicTransport(request);
    };
    const basePageTransport = createDirectTerraProductPageTransport({});
    const productPageTransport = async (url) => {
      if (counters.productPageFetchAttempts >= EXPECTED.productPageFetches) {
        throw new Error("Product-page fetch ceiling exceeded.");
      }
      counters.productPageFetchAttempts += 1;
      await persistAttempt();
      return basePageTransport(url);
    };
    const productAssets = await resolveDirectTerraProductAssets({
      targets: research.assetTargets,
      reportMarkdown: research.reportMarkdown,
      activeCitationUrls: research.citationUrls,
      responseSources: research.responseSources,
      serperTransport,
      serperOrganicTransport,
      productPageTransport,
    });
    const completedResponse = {
      pipeline: "direct_terra",
      version: DIRECT_TERRA_API_VERSION,
      state: "completed",
      reportMarkdown: research.reportMarkdown,
      citationUrls: research.citationUrls,
      sourceHosts: research.sourceHosts,
      disabledCitationCount: research.disabledCitationCount,
      priceEstimates: research.priceEstimates,
      productAssets,
      rejectedPriceObservationCount: research.rejectedPriceObservationCount,
      transactionalStatus: "unverified",
    };
    if (!isDirectTerraCompletedResponse(completedResponse)) {
      throw new Error("Integrated response failed the client contract.");
    }

    evidence.usage = { ...usage, estimatedCostUsd };
    // T8B goal metrics: every displayed link should sit on a manufacturer or
    // popular-retailer host with a clean query, and images should come from
    // those same pages rather than Google thumbnail CDNs.
    const targetByRank = new Map(
      research.assetTargets.map((target) => [target.rank, target]),
    );
    const assetAudit = productAssets.map((asset) => {
      const target = targetByRank.get(asset.rank);
      const heading = target
        ? { brand: target.brand, model: target.model }
        : extractDirectTerraHeadingIdentity(asset.productName) || {
            brand: "",
            model: "",
          };
      const linkHostClass = asset.productUrl
        ? classifyDirectTerraLinkHost(asset.productUrl, heading.brand)
        : null;
      const imageRegistrable = asset.imageUrl
        ? registrableDomain(new URL(asset.imageUrl).hostname)
        : null;
      return {
        rank: asset.rank,
        linkHostClass,
        linkHasQuery: asset.productUrl
          ? new URL(asset.productUrl).search.length > 0
          : null,
        imageSource: !asset.imageUrl
          ? null
          : imageRegistrable === "gstatic.com"
            ? "shopping_thumbnail"
            : "retailer_or_manufacturer_page",
        imageRegistrable,
      };
    });
    evidence.coverage = {
      rankedTargetCount: research.assetTargets.length,
      productWebsiteCount: productAssets.filter((asset) => asset.productUrl).length,
      productImageCount: productAssets.filter((asset) => asset.imageUrl).length,
      fullyDecoratedCount: productAssets.filter(
        (asset) => asset.productUrl && asset.imageUrl,
      ).length,
      preferredHostLinkCount: assetAudit.filter(
        (audit) =>
          audit.linkHostClass === "manufacturer" ||
          audit.linkHostClass === "popular_retailer",
      ).length,
      cleanLinkCount: assetAudit.filter((audit) => audit.linkHasQuery === false)
        .length,
      pageImageCount: assetAudit.filter(
        (audit) => audit.imageSource === "retailer_or_manufacturer_page",
      ).length,
      thumbnailImageCount: assetAudit.filter(
        (audit) => audit.imageSource === "shopping_thumbnail",
      ).length,
      assetAudit,
    };
    evidence.completedResponse = completedResponse;
    evidence.outcome = {
      status: "passed",
      wallClockMs: Date.now() - startedAtMs,
      failure: null,
    };
    await writeJson(attemptFile, evidence);
    await fs.rename(attemptFile, resultFile);
    process.stdout.write(
      `${JSON.stringify({
        status: evidence.outcome.status,
        wallClockMs: evidence.outcome.wallClockMs,
        counters,
        usage: evidence.usage,
        coverage: evidence.coverage,
        outputFile: resultFile,
      })}\n`,
    );
  } catch (error) {
    if (trackedJob && !completed && counters.safetyCancels < EXPECTED.safetyCancels) {
      try {
        await cancelDirectTerraResearch({
          client,
          responseId: trackedJob.responseId,
          promptVersion: trackedJob.promptVersion,
          promptHash: trackedJob.promptHash,
        });
      } catch {
        // Cancellation is best-effort; the original failure remains canonical.
      }
    }
    evidence.outcome = {
      status: "failed",
      wallClockMs: Date.now() - startedAtMs,
      failure: error instanceof Error ? error.message : "unexpected_error",
    };
    await writeJson(attemptFile, evidence);
    throw error;
  }
}

await main();

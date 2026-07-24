// OAI-T7B live smoke: one Terra/high direct-Terra V2 response proving the
// real Responses endpoint accepts prompt/schema v2 (report_markdown plus
// bounded price_observations) and produces auditable estimated-market-price
// evidence. Protocol mirrors the T6B/T6D smokes: exactly one background
// create, bounded retrieve polling of that same response, at most one safety
// cancel, zero Serper/SearchAPI/direct-page/fallback/replacement calls, and
// sanitized untracked evidence. Flags stay default-off; the app route is not
// involved.

import fs from "node:fs/promises";
import path from "node:path";

import {
  DIRECT_TERRA_RESEARCH_CONFIG,
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";
import { buildDirectTerraRequirementContract } from "../lib/directTerraCandidateSlate.ts";
import { extractDirectTerraResponseSources } from "../lib/directTerraResponse.ts";
import {
  OAI_2A_PROPOSED_CONFIG,
  estimateAutonomousResearchCost,
} from "../lib/autonomousResearchAdapter.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";

const APPROVAL = {
  id: "oai-t7b-v2-price-smoke-v1",
  commit: "3a1e87e",
  caseId: "broad-shop-vac",
  shopperRequest: { query: "shop vac" },
  model: DIRECT_TERRA_RESEARCH_CONFIG.model,
  reasoning: DIRECT_TERRA_RESEARCH_CONFIG.reasoning,
  maximumCreates: 1,
  maximumHostedSearches: DIRECT_TERRA_RESEARCH_CONFIG.maxToolCalls,
  maximumRetrieves: 60,
  maximumSafetyCancels: 1,
  hardCeilingUsd: 7,
  expectedPromptVersion: "direct-terra-master-prompt-v2",
};
const REQUIREMENT_CONTRACT = buildDirectTerraRequirementContract(
  APPROVAL.shopperRequest,
);

const OUT_DIR = path.resolve(
  `tests/fixtures/review-radar-live/oai-t7b-v2-price-smoke-${APPROVAL.commit}`,
);
const ATTEMPT_FILE = path.join(OUT_DIR, `${APPROVAL.caseId}.run1.attempt.json`);
const RESULT_FILE = path.join(OUT_DIR, `${APPROVAL.caseId}.run1.json`);
const POLL_INTERVAL_MS = 5_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Extracts the strict-schema output text from the captured raw response so
// the sanitized evidence can retain the raw price_observations for the
// manual audit without persisting reasoning items or the raw response body.
function rawOutputText(response) {
  if (!isRecord(response)) return null;
  if (typeof response.output_text === "string" && response.output_text) {
    return response.output_text;
  }
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== "message") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return null;
}

function rawPriceObservations(response) {
  const text = rawOutputText(response);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) && Array.isArray(parsed.price_observations)
      ? parsed.price_observations
      : null;
  } catch {
    return null;
  }
}

function ratesForUsage(usage) {
  return usage.inputTokens > OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens
    ? OAI_2A_PROPOSED_CONFIG.longContextRatesAsOf2026_07_15
    : OAI_2A_PROPOSED_CONFIG.standardRatesAsOf2026_07_15;
}

async function writeEvidence(file, value) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  if (APPROVAL.expectedPromptVersion !== DIRECT_TERRA_PROMPT_VERSION) {
    throw new Error(
      `Prompt version mismatch: approval pins ${APPROVAL.expectedPromptVersion}, code exports ${DIRECT_TERRA_PROMPT_VERSION}`,
    );
  }

  if (process.argv.includes("--preflight-only")) {
    let existing = [];
    try {
      existing = await fs.readdir(OUT_DIR);
    } catch {
      // Missing directory means no prior evidence; preflight passes.
    }
    if (existing.length > 0) {
      throw new Error(`Evidence already exists at ${OUT_DIR}; refusing replacement.`);
    }
    process.stdout.write(
      `${JSON.stringify({
        status: "preflight_passed",
        approval: APPROVAL,
        outputDirectory: OUT_DIR,
        promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      })}\n`,
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  try {
    const existingFiles = await fs.readdir(OUT_DIR);
    if (existingFiles.length > 0) {
      throw new Error(
        `T7B smoke evidence already exists; refusing an accidental replacement run: ${OUT_DIR}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
  }

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, {
    maxRetries: 0,
  });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI SDK retry suppression is not active");
  }

  const counters = {
    openaiCreates: 0,
    openaiRetrieves: 0,
    safetyCancels: 0,
    sdkRetries: 0,
    serperCalls: 0,
    searchApiCalls: 0,
    directSourcePageOpens: 0,
    fallbackCalls: 0,
    replacementCalls: 0,
  };
  let lastRawResponse = null;
  const client = {
    responses: {
      create: async (...args) => {
        if (counters.openaiCreates >= APPROVAL.maximumCreates) {
          throw new Error("Approved OpenAI create-call ceiling exceeded");
        }
        counters.openaiCreates += 1;
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        if (counters.openaiRetrieves >= APPROVAL.maximumRetrieves) {
          throw new Error("Approved retrieve ceiling exceeded");
        }
        counters.openaiRetrieves += 1;
        const response = await sdkClient.responses.retrieve(...args);
        lastRawResponse = response;
        return response;
      },
      cancel: async (...args) => {
        if (counters.safetyCancels >= APPROVAL.maximumSafetyCancels) {
          throw new Error("Approved safety-cancel ceiling exceeded");
        }
        counters.safetyCancels += 1;
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  const startedAtMs = Date.now();
  const evidence = {
    schemaVersion: "oai-t7b-sanitized-smoke-v1",
    capturedAt: new Date().toISOString(),
    approval: APPROVAL,
    outcome: { status: "running", wallClockMs: 0, failure: null, contractFailures: [] },
    counters,
    start: null,
    completion: null,
    audit: null,
  };
  await writeEvidence(ATTEMPT_FILE, evidence);

  const finish = async (status, failure) => {
    evidence.outcome.status = status;
    evidence.outcome.failure = failure ?? null;
    evidence.outcome.wallClockMs = Date.now() - startedAtMs;
    await writeEvidence(ATTEMPT_FILE, evidence);
    if (status === "passed") {
      await writeEvidence(RESULT_FILE, evidence);
      await fs.rm(ATTEMPT_FILE);
    }
    process.stdout.write(
      `${JSON.stringify({
        status,
        wallClockMs: evidence.outcome.wallClockMs,
        counters,
        contractFailures: evidence.outcome.contractFailures,
        ...(failure ? { failure } : {}),
      })}\n`,
    );
  };

  const start = await startDirectTerraResearch({
    client,
    shopperRequest: APPROVAL.shopperRequest,
  });
  evidence.start = { ok: start.ok, ledger: start.ledger };
  if (!start.ok) {
    await finish("failed", { stage: "start", reason: start.reason, details: start.details });
    process.exitCode = 1;
    return;
  }

  let completion = null;
  while (true) {
    if (counters.openaiRetrieves >= APPROVAL.maximumRetrieves) {
      try {
        await cancelDirectTerraResearch({
          client,
          responseId: start.responseId,
          promptVersion: start.promptVersion,
          promptHash: start.promptHash,
        });
      } catch {
        // The cancel itself is best-effort; the ceiling failure is recorded.
      }
      await finish("failed", { stage: "poll", reason: "retrieve_ceiling_reached" });
      process.exitCode = 1;
      return;
    }
    await sleep(POLL_INTERVAL_MS);
    const poll = await pollDirectTerraResearch({
      client,
      responseId: start.responseId,
      promptVersion: start.promptVersion,
      promptHash: start.promptHash,
      requirementContract: REQUIREMENT_CONTRACT,
    });
    if (poll.ok && poll.state === "pending") continue;
    if (!poll.ok) {
      evidence.completion = {
        ledger: poll.ledger,
        ...(poll.verification ? { verification: poll.verification } : {}),
      };
      await finish("failed", {
        stage: "poll",
        reason: poll.reason,
        details: poll.details,
        ...(poll.verification
          ? { verification: { reason: poll.verification.reason } }
          : {}),
      });
      process.exitCode = 1;
      return;
    }
    completion = poll;
    break;
  }

  const usage = completion.ledger.usage;
  const estimatedCostUsd = Number(
    estimateAutonomousResearchCost(usage, ratesForUsage(usage)).toFixed(6),
  );
  const contractFailures = evidence.outcome.contractFailures;
  if (completion.ledger.modelReturned !== APPROVAL.model) {
    contractFailures.push("model_mismatch");
  }
  if (usage.webSearchCalls < 1 || usage.webSearchCalls > APPROVAL.maximumHostedSearches) {
    contractFailures.push("hosted_search_count_out_of_bounds");
  }
  if (estimatedCostUsd > APPROVAL.hardCeilingUsd) {
    contractFailures.push("cost_ceiling_exceeded");
  }

  const registeredSourceUrls = extractDirectTerraResponseSources(lastRawResponse).map(
    (source) => source.url,
  );
  evidence.completion = {
    ledger: completion.ledger,
    estimatedCostUsd,
    reportMarkdown: completion.reportMarkdown,
    citationUrls: completion.citationUrls,
    sourceHosts: completion.sourceHosts,
    disabledCitationCount: completion.disabledCitationCount,
    priceEstimates: completion.priceEstimates,
    rejectedPriceObservationCount: completion.rejectedPriceObservationCount,
  };
  // Audit block: the raw bounded observations plus the response-owned source
  // registry, so every displayed range can be manually traced to sanitized
  // response-owned evidence without persisting the raw response body.
  evidence.audit = {
    rawPriceObservations: rawPriceObservations(lastRawResponse),
    registeredSourceUrlCount: registeredSourceUrls.length,
    registeredSourceUrls,
  };

  await finish(contractFailures.length === 0 ? "passed" : "failed_contract");
  if (contractFailures.length > 0) process.exitCode = 1;
}

await main();

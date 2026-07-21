// OAI-T7C direct-Terra V2 holistic evaluation.
//
// Tests whether the OpenAI-only direct-Terra report path is good enough at its
// core job — leader recall, wrong-type safety, constraint compliance, and
// run-to-run stability — to justify becoming ReviewRadar's direction. Four
// frozen cases (lib/directTerraEvaluation.ts) x 3 runs each, scored against the
// frozen leaders-v2026-07c benchmark. Same bounded-spend discipline as the
// T6B/T6D/T7B smokes: one background create per run, bounded retrieve polling,
// at most one safety cancel per run, a hard global cost ceiling, and sanitized
// untracked evidence. Flags stay default-off; the app route is not involved.
//
// Modes:
//   --preflight-only : zero network; validate contract, cases, fresh evidence
//                      dir, and print the exact spend plan.
//   (default)        : LIVE. Requires OPENAI_API_KEY and an explicit approval.

import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  DIRECT_TERRA_RESEARCH_CONFIG,
  cancelDirectTerraResearch,
  pollDirectTerraResearch,
  startDirectTerraResearch,
} from "../lib/directTerraResearchAdapter.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";
import { extractDirectTerraResponseSources } from "../lib/directTerraResponse.ts";
import {
  DIRECT_TERRA_EVAL_CASES,
  DIRECT_TERRA_EVAL_VERSION,
  scoreDirectTerraCaseStability,
  scoreDirectTerraRun,
} from "../lib/directTerraEvaluation.ts";
import {
  OAI_2A_PROPOSED_CONFIG,
  estimateAutonomousResearchCost,
} from "../lib/autonomousResearchAdapter.ts";
import { GOLD, coversLeader } from "./goldBenchmark.mjs";
import { createOpenAIClient } from "../lib/openaiClient.ts";

function resolveCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const RUNS_PER_CASE = 3;
const APPROVAL = {
  id: "oai-t7c-terra-eval-v1",
  // The exact tree the run executed against, resolved from HEAD and recorded in
  // every evidence file so the window is commit-pinned to the frozen contract.
  commit: resolveCommit(),
  evalVersion: DIRECT_TERRA_EVAL_VERSION,
  model: DIRECT_TERRA_RESEARCH_CONFIG.model,
  reasoning: DIRECT_TERRA_RESEARCH_CONFIG.reasoning,
  caseCount: DIRECT_TERRA_EVAL_CASES.length,
  runsPerCase: RUNS_PER_CASE,
  maxCreates: DIRECT_TERRA_EVAL_CASES.length * RUNS_PER_CASE,
  maxRetrievesPerRun: 60,
  maxSafetyCancelsPerRun: 1,
  perRunHostedSearchCeiling: DIRECT_TERRA_RESEARCH_CONFIG.maxToolCalls,
  hardCeilingUsd: 15,
  expectedPromptVersion: "direct-terra-master-prompt-v2",
};

const OUT_DIR = path.resolve(
  "tests/fixtures/review-radar-live/oai-t7c-terra-eval-v1",
);
const POLL_INTERVAL_MS = 5_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function goldById(id) {
  const entry = GOLD.find((g) => g.id === id);
  if (!entry) throw new Error(`Missing GOLD entry ${id}`);
  return entry;
}

function rawOutputText(response) {
  if (!isRecord(response)) return null;
  if (typeof response.output_text === "string" && response.output_text) {
    return response.output_text;
  }
  for (const item of Array.isArray(response.output) ? response.output : []) {
    if (!isRecord(item) || item.type !== "message") continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
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
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function plan() {
  return {
    evalVersion: DIRECT_TERRA_EVAL_VERSION,
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    cases: DIRECT_TERRA_EVAL_CASES.map((c) => ({
      id: c.id,
      kind: c.kind,
      goldId: c.goldId,
      request: c.request,
    })),
    runsPerCase: RUNS_PER_CASE,
    totalCreates: APPROVAL.maxCreates,
    perRunHostedSearchCeiling: APPROVAL.perRunHostedSearchCeiling,
    hardCeilingUsd: APPROVAL.hardCeilingUsd,
    outputDirectory: OUT_DIR,
  };
}

async function main() {
  if (APPROVAL.expectedPromptVersion !== DIRECT_TERRA_PROMPT_VERSION) {
    throw new Error(
      `Prompt version mismatch: approval pins ${APPROVAL.expectedPromptVersion}, code exports ${DIRECT_TERRA_PROMPT_VERSION}`,
    );
  }
  // Fail fast if any frozen case is misconfigured before spending anything.
  for (const evalCase of DIRECT_TERRA_EVAL_CASES) goldById(evalCase.goldId);

  if (process.argv.includes("--preflight-only")) {
    let existing = [];
    try {
      existing = await fs.readdir(OUT_DIR);
    } catch {
      // No directory yet: clean.
    }
    if (existing.length > 0) {
      throw new Error(`Evidence already exists at ${OUT_DIR}; refusing replacement.`);
    }
    process.stdout.write(`${JSON.stringify({ status: "preflight_passed", plan: plan() })}\n`);
    return;
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  try {
    const existing = await fs.readdir(OUT_DIR);
    if (existing.length > 0) {
      throw new Error(`T7C evidence already exists; refusing replacement: ${OUT_DIR}`);
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
  }

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, { maxRetries: 0 });
  if (sdkClient.maxRetries !== 0) throw new Error("OpenAI SDK retry suppression is not active");

  let totalCreates = 0;
  let totalRetrieves = 0;
  let totalCostUsd = 0;
  let lastRawResponse = null;
  const perRunCounters = { creates: 0, retrieves: 0, cancels: 0 };
  const client = {
    responses: {
      create: async (...args) => {
        if (totalCreates >= APPROVAL.maxCreates) throw new Error("Global create ceiling exceeded");
        totalCreates += 1;
        perRunCounters.creates += 1;
        return sdkClient.responses.create(...args);
      },
      retrieve: async (...args) => {
        if (perRunCounters.retrieves >= APPROVAL.maxRetrievesPerRun) {
          throw new Error("Per-run retrieve ceiling exceeded");
        }
        totalRetrieves += 1;
        perRunCounters.retrieves += 1;
        const response = await sdkClient.responses.retrieve(...args);
        lastRawResponse = response;
        return response;
      },
      cancel: async (...args) => {
        if (perRunCounters.cancels >= APPROVAL.maxSafetyCancelsPerRun) {
          throw new Error("Per-run cancel ceiling exceeded");
        }
        perRunCounters.cancels += 1;
        return sdkClient.responses.cancel(...args);
      },
    },
  };

  const startedAtMs = Date.now();
  const summary = {
    schemaVersion: "oai-t7c-eval-summary-v1",
    approval: APPROVAL,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totals: { creates: 0, retrieves: 0, estimatedCostUsd: 0, wallClockMs: 0 },
    cases: [],
    failure: null,
  };
  await writeJson(path.join(OUT_DIR, "summary.json"), summary);

  try {
    for (const evalCase of DIRECT_TERRA_EVAL_CASES) {
      const goldEntry = goldById(evalCase.goldId);
      const runScores = [];
      const caseRecord = { id: evalCase.id, kind: evalCase.kind, goldId: evalCase.goldId, runs: [] };

      for (let runIndex = 1; runIndex <= RUNS_PER_CASE; runIndex += 1) {
        perRunCounters.creates = 0;
        perRunCounters.retrieves = 0;
        perRunCounters.cancels = 0;
        lastRawResponse = null;
        const runStartMs = Date.now();

        const start = await startDirectTerraResearch({
          client,
          shopperRequest: evalCase.request,
        });
        if (!start.ok) {
          throw new Error(`start failed for ${evalCase.id} run ${runIndex}: ${start.reason}`);
        }

        let completion = null;
        while (true) {
          if (perRunCounters.retrieves >= APPROVAL.maxRetrievesPerRun) {
            try {
              await cancelDirectTerraResearch({
                client,
                responseId: start.responseId,
                promptVersion: start.promptVersion,
                promptHash: start.promptHash,
              });
            } catch {
              // Best-effort cancel.
            }
            throw new Error(`retrieve ceiling reached for ${evalCase.id} run ${runIndex}`);
          }
          await sleep(POLL_INTERVAL_MS);
          const poll = await pollDirectTerraResearch({
            client,
            responseId: start.responseId,
            promptVersion: start.promptVersion,
            promptHash: start.promptHash,
          });
          if (poll.ok && poll.state === "pending") continue;
          if (!poll.ok) {
            throw new Error(
              `poll failed for ${evalCase.id} run ${runIndex}: ${poll.reason}` +
                (poll.verification ? ` (${poll.verification.reason})` : ""),
            );
          }
          completion = poll;
          break;
        }

        const usage = completion.ledger.usage;
        const runCostUsd = Number(
          estimateAutonomousResearchCost(usage, ratesForUsage(usage)).toFixed(6),
        );
        totalCostUsd += runCostUsd;
        if (totalCostUsd > APPROVAL.hardCeilingUsd) {
          throw new Error(`Hard cost ceiling exceeded: $${totalCostUsd.toFixed(4)}`);
        }

        const runScore = scoreDirectTerraRun({
          reportMarkdown: completion.reportMarkdown,
          priceEstimates: completion.priceEstimates,
          goldEntry,
          coversLeader,
        });
        runScores.push(runScore);

        const registeredSourceUrls = extractDirectTerraResponseSources(lastRawResponse).map(
          (s) => s.url,
        );
        const runRecord = {
          run: runIndex,
          wallClockMs: Date.now() - runStartMs,
          estimatedCostUsd: runCostUsd,
          ledger: completion.ledger,
          reportMarkdown: completion.reportMarkdown,
          priceEstimates: completion.priceEstimates,
          rejectedPriceObservationCount: completion.rejectedPriceObservationCount,
          citationUrls: completion.citationUrls,
          sourceHosts: completion.sourceHosts,
          disabledCitationCount: completion.disabledCitationCount,
          score: runScore,
          audit: {
            rawPriceObservations: rawPriceObservations(lastRawResponse),
            registeredSourceUrlCount: registeredSourceUrls.length,
            registeredSourceUrls,
          },
        };
        await writeJson(
          path.join(OUT_DIR, `${evalCase.id}.run${runIndex}.json`),
          { approval: APPROVAL, case: evalCase, ...runRecord },
        );
        caseRecord.runs.push({
          run: runIndex,
          recall: `${runScore.leaderRecall.count}/${runScore.leaderRecall.total}`,
          wrongType: runScore.wrongTypeHits.length,
          budgetViolations: runScore.constraint?.budgetViolations.length ?? 0,
          priceCoverage: runScore.priceCoverage,
          rankedCount: runScore.rankedCount,
          costUsd: runCostUsd,
        });
      }

      caseRecord.stability = scoreDirectTerraCaseStability(runScores);
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
          recallMean: Number(c.stability.recallMean.toFixed(3)),
          leaderSetJaccard: c.stability.leaderSetJaccard,
          maxWrongType: c.stability.maxWrongTypeInAnyRun,
          maxBudgetViolations: c.stability.maxBudgetViolationsInAnyRun,
          priceCoverageMean: Number(c.stability.priceCoverageMean.toFixed(3)),
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

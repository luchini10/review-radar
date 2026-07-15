import fs from "node:fs/promises";
import path from "node:path";

import {
  applyRequirementInterpretation,
  assessRequirementInterpreterNeed,
  buildNormalizedShopperRequest,
} from "../lib/autonomousResearchContract.ts";
import {
  OAI_2A_PROPOSED_CONFIG,
  estimateAutonomousResearchCost,
  runAutonomousResearch,
  runRequirementInterpreter,
} from "../lib/autonomousResearchAdapter.ts";
import { AUTONOMOUS_EVALUATION_CATALOG } from "../lib/autonomousResearchEvaluation.ts";
import { createOpenAIClient } from "../lib/openaiClient.ts";

const SMOKE_MODE = process.argv.includes("--primary-01-smoke");
const RUN_MODE = SMOKE_MODE
  ? {
      name: "primary-01-smoke",
      version: "oai-2a-terra-primary-01-smoke-v1",
      outputDirectory: path.resolve(
        "tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15-primary-01-smoke",
      ),
      caseIds: ["primary-01"],
      maxCreateCalls: 1,
      maxWebSearchCalls: 20,
    }
  : {
      name: "full-oai-2a",
      version: "oai-2a-terra-evidence-v1",
      outputDirectory: path.resolve(
        "tests/fixtures/review-radar-live/oai-2a-terra-2026-07-15",
      ),
      caseIds: ["primary-01", "primary-04", "primary-12"],
      maxCreateCalls: OAI_2A_PROPOSED_CONFIG.approvalUnits.apiCalls,
      maxWebSearchCalls:
        OAI_2A_PROPOSED_CONFIG.approvalUnits.webSearchToolCalls,
    };
const EXPECTED_INTERPRETER_ROUTING = new Map([
  ["primary-01", false],
  ["primary-04", false],
  ["primary-12", true],
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeResponseForEvidence(response) {
  if (!isRecord(response)) return null;
  const output = Array.isArray(response.output)
    ? response.output.flatMap((item) => {
        if (!isRecord(item) || item.type === "reasoning") return [];
        if (item.type === "web_search_call") {
          return [
            {
              id: item.id ?? null,
              type: item.type,
              status: item.status ?? null,
              action: item.action ?? null,
            },
          ];
        }
        if (item.type === "message") {
          return [
            {
              id: item.id ?? null,
              type: item.type,
              status: item.status ?? null,
              role: item.role ?? null,
              content: item.content ?? [],
            },
          ];
        }
        return [];
      })
    : [];
  return {
    id: response.id ?? null,
    model: response.model ?? null,
    status: response.status ?? null,
    incomplete_details: response.incomplete_details ?? null,
    error: response.error ?? null,
    usage: response.usage ?? null,
    output,
  };
}

async function writeJson(fileName, value) {
  await fs.writeFile(
    path.join(RUN_MODE.outputDirectory, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function assertReturnedModel(ledger) {
  if (ledger.modelReturned !== OAI_2A_PROPOSED_CONFIG.research.model) {
    throw new Error(
      `Returned model ${ledger.modelReturned || "unknown"} did not match the approved Terra model`,
    );
  }
}

function ratesForUsage(usage) {
  return usage.inputTokens > OAI_2A_PROPOSED_CONFIG.longContextThresholdTokens
    ? OAI_2A_PROPOSED_CONFIG.longContextRatesAsOf2026_07_15
    : OAI_2A_PROPOSED_CONFIG.standardRatesAsOf2026_07_15;
}

async function main() {
  const cases = RUN_MODE.caseIds.map((id) => {
    const evaluationCase = AUTONOMOUS_EVALUATION_CATALOG.find(
      (candidate) => candidate.id === id,
    );
    if (!evaluationCase) throw new Error(`Missing frozen case ${id}`);
    const normalized = buildNormalizedShopperRequest(evaluationCase.request);
    const routing = assessRequirementInterpreterNeed(
      evaluationCase.request,
      normalized,
    );
    if (routing.needed !== EXPECTED_INTERPRETER_ROUTING.get(id)) {
      throw new Error(
        `Interpreter routing changed for ${id}: expected ${EXPECTED_INTERPRETER_ROUTING.get(id)}, received ${routing.needed}`,
      );
    }
    return { evaluationCase, normalized, routing };
  });

  if (process.argv.includes("--preflight-only")) {
    process.stdout.write(
      `${JSON.stringify({
        status: "preflight_passed",
        runMode: RUN_MODE.name,
        outputDirectory: RUN_MODE.outputDirectory,
        ceilings: {
          createCalls: RUN_MODE.maxCreateCalls,
          webSearchCalls: RUN_MODE.maxWebSearchCalls,
        },
        cases: cases.map(({ evaluationCase, routing }) => ({
          id: evaluationCase.id,
          interpreter: routing.needed,
        })),
      })}\n`,
    );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  try {
    const existingFiles = await fs.readdir(RUN_MODE.outputDirectory);
    if (existingFiles.length > 0) {
      throw new Error(
        `OAI-2A evidence already exists; refusing an accidental replacement run: ${RUN_MODE.outputDirectory}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
  }
  await fs.mkdir(RUN_MODE.outputDirectory, { recursive: true });

  const sdkClient = await createOpenAIClient(process.env.OPENAI_API_KEY, {
    maxRetries: 0,
  });
  if (sdkClient.maxRetries !== 0) {
    throw new Error("OpenAI SDK retry suppression is not active");
  }
  let createCalls = 0;
  const client = {
    responses: {
      create: async (...args) => {
        createCalls += 1;
        if (createCalls > RUN_MODE.maxCreateCalls) {
          throw new Error("Approved OpenAI create-call ceiling exceeded");
        }
        return sdkClient.responses.create(...args);
      },
      retrieve: (...args) => sdkClient.responses.retrieve(...args),
    },
  };

  const summary = {
    version: RUN_MODE.version,
    run_mode: RUN_MODE.name,
    started_at: new Date().toISOString(),
    completed_at: null,
    model: OAI_2A_PROPOSED_CONFIG.research.model,
    reasoning: OAI_2A_PROPOSED_CONFIG.research.reasoning,
    create_calls: 0,
    retrieval_polls: 0,
    web_search_calls: 0,
    estimated_cost_usd: 0,
    cases: [],
  };

  try {
    for (const { evaluationCase, normalized, routing } of cases) {
      let researchRequest = normalized;
      let interpreterEvidence = null;
      if (routing.needed) {
        const interpreter = await runRequirementInterpreter({
          client,
          originalRequest: evaluationCase.request,
          deterministicRequest: normalized,
          config: OAI_2A_PROPOSED_CONFIG.interpreter,
        });
        interpreterEvidence = interpreter;
        if (!interpreter.ok) {
          await writeJson(`${evaluationCase.id}.json`, {
            evaluation_case: evaluationCase,
            normalized_request: normalized,
            interpreter,
          });
          throw new Error(
            `Interpreter failed for ${evaluationCase.id}: ${interpreter.reason}`,
          );
        }
        assertReturnedModel(interpreter.ledger);
        researchRequest = applyRequirementInterpretation(
          normalized,
          interpreter.interpreted,
        );
        summary.estimated_cost_usd += estimateAutonomousResearchCost(
          interpreter.ledger.usage,
          ratesForUsage(interpreter.ledger.usage),
        );
      }

      const research = await runAutonomousResearch({
        client,
        normalizedRequest: researchRequest,
        config: OAI_2A_PROPOSED_CONFIG.research,
      });
      const evidence = {
        version: RUN_MODE.version,
        run_mode: RUN_MODE.name,
        captured_at: new Date().toISOString(),
        evaluation_case: evaluationCase,
        deterministic_normalized_request: normalized,
        interpreter_routing: routing,
        interpreter: interpreterEvidence,
        research_request: researchRequest,
        research: research.ok
          ? {
              ok: true,
              ledger: research.ledger,
              slate: research.slate,
              response_evidence: sanitizeResponseForEvidence(research.response),
            }
          : research,
      };
      await writeJson(`${evaluationCase.id}.json`, evidence);
      if (!research.ok) {
        throw new Error(
          `Research failed for ${evaluationCase.id}: ${research.reason}`,
        );
      }
      assertReturnedModel(research.ledger);
      const cost = estimateAutonomousResearchCost(
        research.ledger.usage,
        ratesForUsage(research.ledger.usage),
      );
      summary.retrieval_polls += research.ledger.polls;
      summary.web_search_calls += research.ledger.usage.webSearchCalls;
      summary.estimated_cost_usd += cost;
      summary.cases.push({
        id: evaluationCase.id,
        interpreter_used: routing.needed,
        request_hash: research.ledger.requestHash,
        returned_model: research.ledger.modelReturned,
        duration_ms: research.ledger.durationMs,
        retrieval_polls: research.ledger.polls,
        web_search_calls: research.ledger.usage.webSearchCalls,
        source_count: research.ledger.sourceCount,
        card_count: research.slate.products.length + research.slate.close_matches.length,
        estimated_cost_usd: cost,
      });
      if (
        summary.web_search_calls >
        RUN_MODE.maxWebSearchCalls
      ) {
        throw new Error("Approved hosted web-search ceiling exceeded");
      }
    }
    summary.create_calls = createCalls;
    summary.completed_at = new Date().toISOString();
    await writeJson("summary.json", summary);
    process.stdout.write(
      `${JSON.stringify({
        status: "completed",
        createCalls: summary.create_calls,
        retrievalPolls: summary.retrieval_polls,
        webSearchCalls: summary.web_search_calls,
        estimatedCostUsd: Number(summary.estimated_cost_usd.toFixed(6)),
        caseCount: summary.cases.length,
      })}\n`,
    );
  } catch (error) {
    summary.create_calls = createCalls;
    summary.completed_at = new Date().toISOString();
    summary.failure = error instanceof Error ? error.message : "unknown_error";
    await writeJson("summary.json", summary);
    throw error;
  }
}

await main();

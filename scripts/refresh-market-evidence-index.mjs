import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { createOpenAIClient } from "../lib/openaiClient.ts";
import { detectRequirementConflicts } from "../lib/requirementConflicts.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { refreshMarketEvidenceIndex } from "../lib/marketEvidenceIndex.ts";
import { validateRecommendationRequest } from "../lib/recommendationRequestValidation.ts";

const MAX_REQUEST_FILE_BYTES = 256 * 1_024;
const MAX_REFRESHES = 25;

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function requestsFromDocument(value) {
  if (Array.isArray(value)) {
    return value.map((request, index) => ({ id: `request-${index + 1}`, request }));
  }
  if (value && typeof value === "object" && Array.isArray(value.cases)) {
    return value.cases.map((entry, index) => ({
      id:
        entry && typeof entry === "object" && typeof entry.id === "string"
          ? entry.id.slice(0, 100)
          : `case-${index + 1}`,
      request: entry && typeof entry === "object" ? entry.request : null,
    }));
  }
  throw new Error("The requests file must be an array or an object with a cases array.");
}

function preparedRequest(value) {
  const validation = validateRecommendationRequest(value);
  if ("error" in validation) throw new Error(validation.error);
  const input = {
    ...validation.data,
    extractedRequirements: extractStructuredRequirements(validation.data),
  };
  const conflicts = detectRequirementConflicts(input);
  if (conflicts.length > 0) {
    throw new Error(`Conflicting requirements: ${conflicts.join(" ")}`);
  }
  return input;
}

async function main() {
  const requestsFile = argumentValue("requests-file");
  const approvedRefreshes = Number(argumentValue("approved-refreshes"));
  const indexPath = argumentValue("index-path");
  if (!requestsFile) throw new Error("Pass --requests-file=<path>.");
  const resolvedRequestsFile = path.resolve(requestsFile);
  const metadata = await stat(resolvedRequestsFile);
  if (!metadata.isFile() || metadata.size > MAX_REQUEST_FILE_BYTES) {
    throw new Error("The requests file is missing or exceeds the 256 KiB limit.");
  }
  const document = JSON.parse(await readFile(resolvedRequestsFile, "utf8"));
  const requests = requestsFromDocument(document);
  if (
    requests.length === 0 ||
    requests.length > MAX_REFRESHES ||
    approvedRefreshes !== requests.length
  ) {
    throw new Error(
      `This refresh requires --approved-refreshes=${requests.length}; received ${String(approvedRefreshes)}.`,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for market-index refresh.");
  const client = await createOpenAIClient(apiKey, { maxRetries: 0 });
  const results = [];
  for (const entry of requests) {
    const result = await refreshMarketEvidenceIndex({
      client,
      force: true,
      ...(indexPath ? { indexPath } : {}),
      input: preparedRequest(entry.request),
    });
    const telemetry = result.scouted?.telemetry;
    results.push({
      acceptedSourceUrls: telemetry?.acceptedSourceUrls || 0,
      evidenceTiers: telemetry?.evidenceTiers || { none: 0, strong: 0, supported: 0 },
      hostedSearchCalls: telemetry?.hostedSearchCalls || 0,
      id: entry.id,
      inputTokens: telemetry?.inputTokens || 0,
      openAiCalls: telemetry?.openAiCalls || 0,
      outputTokens: telemetry?.outputTokens || 0,
      status: result.status,
      targetCount: result.scouted?.plan.targets.length || 0,
      totalTokens: telemetry?.totalTokens || 0,
    });
  }

  process.stdout.write(`${JSON.stringify({
    failed: results.filter((result) => result.status !== "updated").length,
    refreshes: results,
    requested: requests.length,
    updated: results.filter((result) => result.status === "updated").length,
  }, null, 2)}\n`);
}

await main();

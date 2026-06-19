#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const docsDir = join(repoRoot, "docs");
const batchDir = join(docsDir, "agent-batches");
const workerDir = join(docsDir, "agent-worker-results");
const DEFAULT_BASE_URL = "http://localhost:3000";

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadBatch(batchName) {
  const path = join(batchDir, `${batchName}.json`);

  if (!existsSync(path)) {
    throw new Error(`QA batch not found: ${path}`);
  }

  const batch = await readJson(path);

  if (!Array.isArray(batch.searches)) {
    throw new Error(`QA batch is missing a searches array: ${path}`);
  }

  return batch;
}

function runCommand(command, args) {
  return new Promise((resolveRun) => {
    const startedAt = Date.now();
    const executable =
      process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
    const child = spawn(executable, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolveRun({
        code,
        durationMs: Date.now() - startedAt,
        stderr: stderr.slice(-6000),
        stdout: stdout.slice(-6000),
      });
    });
  });
}

function finding(severity, failureType, rootCause, note, search) {
  return {
    exactMatchAffected: true,
    failureType,
    note,
    rootCause,
    search,
    severity,
  };
}

function findingsFromEval(output) {
  const normalized = output.replace(/\s+/g, " ").trim();

  if (/RED-FLAG CHECKS.*(?:no issues|passed)/i.test(normalized)) {
    return [];
  }

  if (/\b(?:failed|wrong|over budget|no exact|red[- ]flag issue)\b/i.test(output)) {
    return [
      finding(
        "medium",
        "eval_red_flag",
        "needs_triage_from_eval_output",
        "The deterministic eval output mentioned a possible issue. Inspect command output before editing.",
      ),
    ];
  }

  return [];
}

function suspiciousNameFlags(productNames) {
  const joined = productNames.join("\n");
  const flags = [];

  if (/\b(?:best|top)\s+\d+|\bbuying guide\b|\breview\b|\bdeals?\b|\bforum\b|\bthread\b|\bsupport\b|\bquestion|\bprices?\b|\bcomparison\b|\bklarna\b|\brule\s+no\.?\b|\bcourt dimensions?\b/i.test(joined)) {
    flags.push({
      failureType: "non_product_page",
      rootCause: "non_product_page_leakage",
      severity: "high",
      note: "A product name looks like an article, support page, forum, deal, or roundup.",
    });
  }

  if (/\b(?:custom notebooks? with logo|accessor(?:y|ies)|replacement|parts?|cover only)\b/i.test(joined)) {
    flags.push({
      failureType: "wrong_product_type",
      rootCause: "product_identity_or_category_filter_gap",
      severity: "high",
      note: "A product name looks like a custom item, accessory, replacement part, or wrong product type.",
    });
  }

  return flags;
}

function dollarAmounts(text) {
  const amounts = [];
  const pattern = /\$\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.\d{1,2})?/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    amounts.push(Number(match[1].replace(/,/g, "")));
  }

  return amounts.filter((amount) => Number.isFinite(amount));
}

function minimumPlausiblePriceForProduct(product) {
  const text = `${product.category || ""} ${product.name || ""}`.toLowerCase();

  if (/\b(?:laptop|refrigerator)\b/.test(text)) {
    return 150;
  }

  if (/\b(?:basketball hoop|stroller|car seat|grill)\b/.test(text)) {
    return 100;
  }

  return null;
}

function suspiciousPriceFlags(products) {
  const flags = [];

  for (const product of products) {
    const priceText = [
      product.estimated_price_range,
      product.price_value_verdict,
      product.rankReason,
      product.why_recommended,
    ]
      .filter(Boolean)
      .join(" ");
    const minimumPlausiblePrice = minimumPlausiblePriceForProduct(product);
    const suspiciousAmounts =
      minimumPlausiblePrice === null
        ? []
        : dollarAmounts(priceText).filter((amount) => amount > 0 && amount < minimumPlausiblePrice);

    if (suspiciousAmounts.length > 0) {
      flags.push({
        failureType: "suspicious_low_price",
        rootCause: "price_evidence_or_variant_price_gap",
        severity: "high",
        note: `Suspiciously low price text for ${product.name}: ${suspiciousAmounts
          .map((amount) => `$${amount}`)
          .join(", ")}.`,
      });
    }
  }

  return flags;
}

function summarizeDebug(debug) {
  if (!debug || typeof debug !== "object") {
    return undefined;
  }

  return {
    stage: debug.stage,
    generatedQueryCount: debug.generatedQueryCount,
    rawCandidateCount: debug.rawCandidateCount,
    fallbackReason: debug.fallbackReason,
    fallbackSource: debug.fallbackSource,
  };
}

function analyzeLiveResult(search, body) {
  const result = body?.result || {};
  const exact = Array.isArray(result.exactMatches) ? result.exactMatches : [];
  const near = Array.isArray(result.nearMatches) ? result.nearMatches : [];
  const exactNames = exact.map((product) => product.name).filter(Boolean);
  const nearNames = near.map((product) => product.name).filter(Boolean);
  const flags = [
    ...suspiciousNameFlags([...exactNames, ...nearNames]),
    ...suspiciousPriceFlags(exact),
  ];

  if (exact.length === 0 && /broad|brand|mainstream|false_no_exact/i.test(search.expectedRisk || "")) {
    flags.push({
      failureType: "false_no_exact",
      rootCause: "discovery_or_validation_too_strict",
      severity: "high",
      note: "A broad/common search returned no exact matches.",
    });
  }

  return {
    debugSummary: summarizeDebug(body?.debug),
    exactCount: exact.length,
    exactNames,
    nearCount: near.length,
    nearNames,
    suspiciousFlags: flags,
  };
}

async function postRecommendation(baseUrl, search) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/recommendations`, {
      body: JSON.stringify({
        budget: search.budget,
        priorities: search.priorities,
        query: search.category,
      }),
      headers: {
        "content-type": "application/json",
        "x-reviewradar-debug": "true",
      },
      method: "POST",
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;

    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 1000) };
    }

    return {
      body,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
      ok: false,
      status: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runDeterministicBatch(batch) {
  const evalAvailable = existsSync(join(repoRoot, "scripts", "eval-pipeline.mjs"));
  const command = evalAvailable
    ? await runCommand("node", ["scripts/eval-pipeline.mjs"])
    : {
        code: 0,
        durationMs: 0,
        stdout: "No deterministic eval pipeline found; worker recorded batch only.",
        stderr: "",
      };

  return {
    command,
    findings: findingsFromEval(`${command.stdout}\n${command.stderr}`),
    mode: evalAvailable ? "deterministic-eval" : "simulated-batch",
    searches: batch.searches.map((search) => ({
      search,
      note: "Deterministic mode runs the shared eval pipeline; use live mode for per-search API output.",
    })),
  };
}

async function runLiveBatch(batch, baseUrl) {
  const searches = [];
  const findings = [];

  for (const search of batch.searches) {
    const response = await postRecommendation(baseUrl, search);
    const analyzed = response.ok ? analyzeLiveResult(search, response.body) : {};
    const failedGracefully = !response.ok;
    const searchFindings = response.ok
      ? (analyzed.suspiciousFlags || []).map((flag) => ({
          ...flag,
          exactMatchAffected: flag.failureType !== "wrong_product_type" || (analyzed.exactCount || 0) > 0,
          search,
        }))
      : [
          finding(
            "medium",
            "live_qa_unavailable",
            "localhost_or_api_unavailable",
            response.body?.error || `Live QA request failed with status ${response.status}.`,
            search,
          ),
        ];

    searches.push({
      failedGracefully,
      responseStatus: response.status,
      search,
      ...analyzed,
      error: response.ok ? undefined : response.body?.error || response.body,
    });
    findings.push(...searchFindings);
  }

  return {
    command: {
      code: findings.some((item) => item.failureType === "live_qa_unavailable") ? 1 : 0,
      durationMs: null,
      stderr: "",
      stdout: `Ran ${batch.searches.length} live QA searches against ${baseUrl}.`,
    },
    findings,
    mode: "live-localhost",
    searches,
  };
}

async function main() {
  const batchName = argValue("batch", "broad-mainstream");
  const mode = argValue("mode", "deterministic");
  const baseUrl = argValue("base-url", DEFAULT_BASE_URL);
  const controllerRunId = argValue("run-id", "");
  const batch = await loadBatch(batchName);
  const runId = `${controllerRunId ? `${controllerRunId}.` : ""}worker-${batchName}-${nowStamp()}`;
  await mkdir(workerDir, { recursive: true });

  const run =
    mode === "live"
      ? await runLiveBatch(batch, baseUrl)
      : await runDeterministicBatch(batch);
  const result = {
    runId,
    batchDescription: batch.description,
    batchName,
    createdAt: new Date().toISOString(),
    command: run.command,
    findings: run.findings,
    generalizedFixRequired: run.findings.length > 0,
    mode: run.mode,
    rule: "Workers report findings only. They do not edit code or create product-specific patches.",
    searches: run.searches,
  };
  const outputPath = join(workerDir, `${runId}.json`);

  await writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, ...result }, null, 2));

  if (run.command.code !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

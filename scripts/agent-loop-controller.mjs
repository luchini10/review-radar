#!/usr/bin/env node
import { appendFile, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const docsDir = join(repoRoot, "docs");
const workerDir = join(docsDir, "agent-worker-results");
const qaLogPath = join(docsDir, "qa-loop-results.md");
const changeLogPath = join(docsDir, "change-log.md");
const nextTaskPath = join(docsDir, "agent-next-task.md");
const reportPath = join(docsDir, "agent-loop-report.md");
const desktopMarkdownDir = join(
  process.env.USERPROFILE || "",
  "Desktop",
  "RR Markdowns",
);

const checks = [
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "unit tests", command: "npm", args: ["test"] },
];

if (existsSync(join(repoRoot, "scripts", "eval-pipeline.mjs"))) {
  checks.push({
    name: "deterministic eval pipeline",
    command: "node",
    args: ["scripts/eval-pipeline.mjs"],
  });
}

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function severityWeight(value) {
  if (value === "high") {
    return 3;
  }

  if (value === "medium") {
    return 2;
  }

  return 1;
}

function runCommand({ command, args }) {
  return new Promise((resolveRun) => {
    const startedAt = Date.now();
    const executable = process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
    const spawnArgs =
      process.platform === "win32" && command === "npm"
        ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
        : args;
    const child = spawn(executable, spawnArgs, {
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

async function runWorker(batchName, options) {
  const args = [
    "scripts/qa-worker.mjs",
    "--batch",
    batchName,
    "--mode",
    options.mode,
    "--run-id",
    options.runId,
  ];

  if (options.baseUrl) {
    args.push("--base-url", options.baseUrl);
  }

  const result = await runCommand({ command: "node", args });
  let outputPath = "";

  try {
    const parsed = JSON.parse(result.stdout);
    outputPath = parsed.outputPath || "";
  } catch {
    outputPath = "";
  }

  return {
    batchName,
    outputPath,
    ...result,
  };
}

async function runWorkerBatches(batchNames, options) {
  const parallel = Math.max(1, Math.min(Number(options.parallel) || 1, 4));
  const queue = [...batchNames];
  const results = [];

  async function worker() {
    while (queue.length > 0) {
      const batchName = queue.shift();

      if (!batchName) {
        continue;
      }

      results.push(await runWorker(batchName, options));
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));

  return results.sort(
    (first, second) =>
      batchNames.indexOf(first.batchName) - batchNames.indexOf(second.batchName),
  );
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadCurrentWorkerResults(workerRuns, runId) {
  const results = [];

  for (const run of workerRuns) {
    if (!run.outputPath || !existsSync(run.outputPath)) {
      results.push({
        batchName: run.batchName,
        commandFailure: run.code !== 0,
        file: "",
        findings: [
          {
            exactMatchAffected: false,
            failureType: "worker_command_failed",
            note: run.stderr || "Worker did not produce a readable output file.",
            rootCause: "worker_execution_failure",
            severity: "medium",
          },
        ],
        runId,
      });
      continue;
    }

    const parsed = await readJson(run.outputPath);
    results.push({
      file: basename(run.outputPath),
      ...parsed,
    });
  }

  return results.filter((result) => result.runId?.startsWith(runId));
}

function repeatedFailureSummary(workerResults) {
  const counts = new Map();

  for (const result of workerResults) {
    for (const finding of result.findings || []) {
      const rootCause = finding.rootCause || finding.failureType || "unclassified";
      const current = counts.get(rootCause) || {
        exactMatchAffectedCount: 0,
        examples: [],
        frequency: 0,
        rootCause,
        severityScore: 0,
        sharedCategoryCount: 0,
      };
      const category = finding.search?.category || result.batchName || "unknown";

      current.frequency += 1;
      current.severityScore += severityWeight(finding.severity);
      current.exactMatchAffectedCount += finding.exactMatchAffected ? 1 : 0;
      current.examples.push({
        batchName: result.batchName,
        category,
        failureType: finding.failureType,
        note: finding.note,
        severity: finding.severity,
      });
      current.sharedCategoryCount = new Set(
        current.examples.map((example) => example.category),
      ).size;
      counts.set(rootCause, current);
    }
  }

  return [...counts.values()]
    .map((item) => ({
      ...item,
      priorityScore:
        item.frequency * 3 +
        item.severityScore +
        item.exactMatchAffectedCount * 2 +
        item.sharedCategoryCount,
    }))
    .sort((first, second) => second.priorityScore - first.priorityScore);
}

function suspectedModules(rootCause) {
  if (/price/i.test(rootCause)) {
    return ["lib/priceParsing.ts", "lib/productAssets.ts", "lib/recommendationScoring.ts"];
  }

  if (/category|identity|product/i.test(rootCause)) {
    return ["lib/productIdentity.ts", "lib/requirementValidation.ts", "lib/search/serper.ts"];
  }

  if (/unit|spec|requirement/i.test(rootCause)) {
    return ["lib/requirementExtraction.ts", "lib/specExtraction.ts", "lib/requirementValidation.ts"];
  }

  if (/non_product|page/i.test(rootCause)) {
    return ["lib/search/serper.ts", "lib/recommendationResultValidation.ts", "lib/requirementValidation.ts"];
  }

  return ["ReviewRadar-Overview.md", "app/api/recommendations/route.ts"];
}

function nextTaskMarkdown(runId, repeatedFailures) {
  const top = repeatedFailures[0];

  if (!top) {
    return `# Agent Next Task\n\nGenerated: ${new Date().toISOString()}\nRun: ${runId}\n\nNo repeated worker failures were found in this run.\n\nSuggested next step: run a live worker batch against localhost, then rerun the controller.\n`;
  }

  const examples = top.examples
    .slice(0, 5)
    .map(
      (example) =>
        `- ${example.category} (${example.batchName}): ${example.failureType} - ${example.note}`,
    )
    .join("\n");
  const modules = suspectedModules(top.rootCause)
    .map((module) => `- ${module}`)
    .join("\n");

  return `# Agent Next Task\n\nGenerated: ${new Date().toISOString()}\nRun: ${runId}\n\n## Selected Root Cause\n\nInvestigate shared root cause: **${top.rootCause}**.\n\nPriority score: ${top.priorityScore}\nFrequency: ${top.frequency}\nCategories affected: ${top.sharedCategoryCount}\nExact-match affected findings: ${top.exactMatchAffectedCount}\n\n## Failing Examples\n\n${examples}\n\n## Suspected Shared Modules\n\n${modules}\n\n## Forbidden Fixes\n\n- Do not hardcode one product, store, brand, or category.\n- Do not weaken hard requirements to make a bad result pass.\n- Do not hide failures in the UI instead of fixing shared logic.\n- Do not change public API or response shape without explicit approval.\n\n## Required Tests\n\n- Add regression coverage for the root cause using at least two examples when possible.\n- Include a category-agnostic test if the failure can happen across categories.\n- Keep existing exact/near match behavior intact unless the test proves it was wrong.\n\n## Required Verification\n\n- npm run typecheck\n- npm run lint\n- npm test\n- npm run qa:loop -- --batches ${top.examples.map((example) => example.batchName).filter(Boolean).join(",") || "price-trust"}\n- npm run build\n\n## Stop Condition\n\nStop after one generalized fix and update docs/qa-loop-results.md with before/after proof.\n`;
}

function statusLabel(commandResults, workerRuns, verifierSummary) {
  if (commandResults.some((result) => result.code !== 0)) {
    return "failed-checks";
  }

  if (workerRuns.some((result) => result.code !== 0)) {
    return "worker-findings-or-live-unavailable";
  }

  if (verifierSummary && verifierSummary.accepted === false) {
    return "rejected-by-verifier";
  }

  return "passed";
}

function qaLogMarkdown(runId, commandResults, workerResults, repeatedFailures, runOptions) {
  const commandRows = commandResults
    .map(
      (result) =>
        `| ${result.name} | ${result.code === 0 ? "Passed" : "Failed"} | ${result.durationMs}ms |`,
    )
    .join("\n");
  const repeated = repeatedFailures.length
    ? repeatedFailures
        .map((item) => `- ${item.rootCause}: ${item.frequency} finding(s), priority ${item.priorityScore}`)
        .join("\n")
    : "- No repeated worker failures found.";

  return `\n## Agent Loop Run - ${new Date().toISOString()}\n\n- **run id:** ${runId}\n- **controller:** scripts/agent-loop-controller.mjs\n- **mode:** ${runOptions.mode}\n- **batches:** ${runOptions.batches.join(", ")}\n- **parallel:** ${runOptions.parallel}\n- **worker result files checked:** ${workerResults.length}\n\n### Checks\n\n| Command | Result | Duration |\n| --- | --- | ---: |\n${commandRows}\n\n### Repeated Failure Candidates\n\n${repeated}\n\n### Next Task\n\nSee \`docs/agent-next-task.md\`.\n\n### Report\n\nSee \`docs/agent-loop-report.md\`.\n`;
}

function reportMarkdown(runId, commandResults, workerRuns, workerResults, repeatedFailures, verifierSummary, runOptions) {
  const checkLines = commandResults
    .map((result) => `- ${result.name}: ${result.code === 0 ? "Passed" : "Failed"} (${result.durationMs}ms)`)
    .join("\n");
  const batchLines = workerRuns
    .map((run) => `- ${run.batchName}: ${run.code === 0 ? "Completed" : "Needs review"}${run.outputPath ? ` (${basename(run.outputPath)})` : ""}`)
    .join("\n");
  const rootLines = repeatedFailures.length
    ? repeatedFailures
        .slice(0, 5)
        .map((item) => `- ${item.rootCause}: ${item.frequency} finding(s), ${item.sharedCategoryCount} categor${item.sharedCategoryCount === 1 ? "y" : "ies"}, priority ${item.priorityScore}`)
        .join("\n")
    : "- No repeated root causes found in this run.";
  const nextBatch =
    repeatedFailures[0]?.examples?.[0]?.batchName ||
    (runOptions.mode === "live" ? "price-trust" : "price-trust --mode live");

  return `# Agent Loop Report\n\nGenerated: ${new Date().toISOString()}\nRun: ${runId}\nStatus: ${statusLabel(commandResults, workerRuns, verifierSummary)}\nMode: ${runOptions.mode}\nParallel workers: ${runOptions.parallel}\nChange log: ${runOptions.changeNote ? "updated" : "not updated; no meaningful change note was provided"}\n\n## Batches Run\n\n${batchLines || "- No worker batches ran."}\n\n## Checks\n\n${checkLines}\n\n## Top Repeated Root Causes\n\n${rootLines}\n\n## Verifier Status\n\n${
    verifierSummary
      ? `- ${verifierSummary.accepted ? "Accepted" : "Rejected"}: ${verifierSummary.rejectedReasons?.join("; ") || "No rejection reasons."}`
      : "- No before/after verifier was requested for this controller run."
  }\n\n## Next Recommended QA Batch\n\n- ${nextBatch}\n\n## Manual Steps Still Required\n\n- Live mode requires a running local dev server and valid server-side API keys.\n- Fix agents still need explicit user approval before editing code.\n- Parallel execution is available but should stay low to avoid unnecessary API spend.\n- Workers report evidence only; they do not make product-specific patches.\n\n## Current Worker Files\n\n${workerResults.map((result) => `- ${result.file || result.runId}`).join("\n") || "- None"}\n`;
}

function changeLogMarkdown(changeNote, verifiedCommands) {
  const verified = verifiedCommands.length
    ? verifiedCommands.map((command) => `- \`${command}\``).join("\n")
    : "- Verification not listed by the controller command.";

  return `\n## ${new Date().toISOString().slice(0, 10)}\n\n### Changed\n- ${changeNote}\n\n### Verified\n${verified}\n`;
}

async function appendChangeLogIfNeeded(changeNote, verifiedCommands) {
  if (!changeNote) {
    return false;
  }

  await appendFile(changeLogPath, changeLogMarkdown(changeNote, verifiedCommands));
  return true;
}

async function syncMarkdownSnapshots() {
  if (!process.env.USERPROFILE) {
    return;
  }

  await mkdir(desktopMarkdownDir, { recursive: true });

  const files = [
    {
      source: join(repoRoot, "ReviewRadar-Overview.md"),
      target: join(desktopMarkdownDir, "ReviewRadar-Overview.md"),
    },
    {
      source: qaLogPath,
      target: join(desktopMarkdownDir, "qa-loop-results.md"),
    },
    {
      source: join(docsDir, "change-log.md"),
      target: join(desktopMarkdownDir, "change-log.md"),
    },
  ];

  for (const file of files) {
    if (existsSync(file.source)) {
      await copyFile(file.source, file.target);
    }
  }
}

async function main() {
  const runId = `agent-loop-${nowStamp()}`;
  const batches = splitList(argValue("batches", "price-trust"));
  const mode = argValue("mode", "deterministic");
  const parallel = Math.max(1, Math.min(Number(argValue("parallel", "1")) || 1, 4));
  const baseUrl = argValue("base-url", "http://localhost:3000");
  const changeNote = argValue("change-note", "");
  const changeVerified = splitList(argValue("change-verified", ""));
  await mkdir(workerDir, { recursive: true });

  const workerRuns = await runWorkerBatches(batches, {
    baseUrl,
    mode,
    parallel,
    runId,
  });
  const commandResults = [];

  for (const item of checks) {
    const result = await runCommand(item);
    commandResults.push({ name: item.name, ...result });
  }

  const workerResults = await loadCurrentWorkerResults(workerRuns, runId);
  const repeatedFailures = repeatedFailureSummary(workerResults);
  const runOptions = { batches, changeNote, mode, parallel };
  const changeLogUpdated = await appendChangeLogIfNeeded(changeNote, changeVerified);
  const runResult = {
    runId,
    createdAt: new Date().toISOString(),
    checks: commandResults,
    changeLogUpdated,
    mode,
    parallel,
    repeatedFailures,
    workerRuns: workerRuns.map((run) => ({
      batchName: run.batchName,
      code: run.code,
      durationMs: run.durationMs,
      outputPath: run.outputPath,
    })),
    workerResultFiles: workerResults.map((result) => result.file),
  };

  await writeFile(
    join(workerDir, `${runId}.controller.json`),
    JSON.stringify(runResult, null, 2),
  );
  await writeFile(nextTaskPath, nextTaskMarkdown(runId, repeatedFailures));
  await appendFile(
    qaLogPath,
    qaLogMarkdown(runId, commandResults, workerResults, repeatedFailures, runOptions),
  );
  await writeFile(
    reportPath,
    reportMarkdown(runId, commandResults, workerRuns, workerResults, repeatedFailures, null, runOptions),
  );
  await syncMarkdownSnapshots();

  console.log(JSON.stringify(runResult, null, 2));

  if (
    commandResults.some((result) => result.code !== 0) ||
    workerRuns.some((result) => result.code !== 0)
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

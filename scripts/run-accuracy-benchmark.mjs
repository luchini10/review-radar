import { spawn, execFile as execFileCallback } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");
const execFile = promisify(execFileCallback);
const REQUEST_TIMEOUT_MS = 150_000;
const SERVER_START_TIMEOUT_MS = 45_000;
const SERVER_STOP_TIMEOUT_MS = 5_000;
const SEARCH_SUITE_URL = new URL(
  "../benchmarks/accuracy-v1/searches.json",
  import.meta.url,
);

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function git(...args) {
  const { stdout } = await execFile("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout.trim();
}

async function measuredProductionFiles() {
  const tracked = (await git("ls-files", "app", "components", "lib", "types", "next.config.ts", "package.json", "package-lock.json"))
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !file.includes("tests/fixtures/review-radar-live/"));
  return tracked.sort();
}

async function baselineSnapshot(startedAt) {
  const files = await measuredProductionFiles();
  const fileHashes = {};
  for (const file of files) {
    fileHashes[file] = sha256(await readFile(path.resolve(file)));
  }
  const diff = await git("diff", "--binary", "--", ...files);
  const status = await git("status", "--short", "--", ...files);
  return {
    benchmarkStartTimestamp: startedAt,
    branch: await git("branch", "--show-current"),
    head: await git("rev-parse", "HEAD"),
    productionFiles: files,
    productionFileSha256: fileHashes,
    relevantWorkingTreeDiffSha256: sha256(diff),
    relevantWorkingTreeStatus: status ? status.split(/\r?\n/) : [],
    repositoryState: status ? "dirty_reproducibly_sealed" : "clean",
    runtimeConfiguration: {
      market: "US",
      marketScoutModel: "gpt-5.4-mini",
      marketScoutReasoningEffort: "low",
      maximumHostedSearchCalls: 3,
      maximumMarketScoutTargets: 9,
      maximumLogicalSerperOperations: 15,
      maximumNeutralShoppingQueries: 2,
      maximumTargetShoppingQueries: 4,
      maximumVerificationCandidates: 9,
      maximumDisplayedProducts: 5,
      nextEnvironment: "development",
      responseCache: "no-store",
      retryPolicy: "no application or benchmark retries",
      secretConfiguration: "not inspected; provider use is established from request telemetry",
      constraintAllocation: "captured per run from deterministic query output; .env.local was not inspected"
    }
  };
}

async function persistJson(value, requestedPath) {
  if (!requestedPath) throw new Error("--report-file is required.");
  const reportPath = path.resolve(requestedPath);
  const normalized = reportPath.replaceAll("\\", "/").toLowerCase();
  if (
    path.basename(reportPath).toLowerCase() === ".env.local" ||
    normalized.includes("/tests/fixtures/review-radar-live/")
  ) {
    throw new Error("The report path cannot target a protected repository path.");
  }
  const temporaryPath = `${reportPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, reportPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

function appendBounded(existing, chunk) {
  const combined = `${existing}${chunk}`;
  return combined.length > 12_000 ? combined.slice(-12_000) : combined;
}

function waitForExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    waitForExit(child).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), SERVER_STOP_TIMEOUT_MS)),
  ]);
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}

function startServer(port) {
  let output = "";
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout.on("data", (chunk) => {
    output = appendBounded(output, chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    output = appendBounded(output, chunk.toString());
  });
  return { child, output: () => output };
}

async function waitUntilReady(baseUrl, server) {
  const deadline = performance.now() + SERVER_START_TIMEOUT_MS;
  while (performance.now() < deadline) {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`Next.js exited before readiness. ${server.output()}`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.status > 0) return;
    } catch {
      // A fresh local server can still be compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js did not become ready. ${server.output()}`);
}

function frozenRequestCase(value) {
  const entry = asRecord(value);
  const request = asRecord(entry.request);
  return {
    category: String(entry.category || ""),
    hardRequirements: asArray(entry.hardRequirements),
    id: String(entry.id || ""),
    request: Object.fromEntries(
      ["query", "budget", "priorities", "avoid", "selectedFeatures"]
        .filter((key) => request[key] !== undefined)
        .map((key) => [key, request[key]]),
    ),
    searchType: String(entry.searchType || ""),
  };
}

async function runCase(benchmarkCase, baseUrl) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/recommendations`, {
      body: JSON.stringify(benchmarkCase.request),
      headers: {
        "content-type": "application/json",
        "x-reviewradar-debug": "true",
      },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { malformedResponse: text.slice(0, 500) };
    }
    return {
      body,
      caseId: benchmarkCase.id,
      clientDurationMs: Math.round(performance.now() - started),
      responseBytes: Buffer.byteLength(text),
      status: response.status,
    };
  } catch (error) {
    return {
      body: null,
      caseId: benchmarkCase.id,
      clientDurationMs: Math.round(performance.now() - started),
      error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 500) : String(error),
      responseBytes: 0,
      status: 0,
    };
  }
}

const suite = JSON.parse(await readFile(SEARCH_SUITE_URL, "utf8"));
const cases = asArray(suite.cases).map(frozenRequestCase);
const expectedRuns = cases.length * Number(suite.rounds || 0);
if (suite.version !== "review-radar-accuracy-v1" || cases.length !== 48 || expectedRuns !== 48) {
  throw new Error("Accuracy V1 must contain exactly 48 frozen one-attempt cases.");
}
if (Number(argumentValue("approved-runs")) !== expectedRuns) {
  throw new Error(`This benchmark requires --approved-runs=${expectedRuns}.`);
}

const startedAt = new Date().toISOString();
const baseline = await baselineSnapshot(startedAt);
const port = 44_000 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const server = startServer(port);
const runs = [];
try {
  await waitUntilReady(baseUrl, server);
  for (let index = 0; index < cases.length; index += 1) {
    const benchmarkCase = cases[index];
    process.stderr.write(`[accuracy-v1] ${index + 1}/${cases.length} ${benchmarkCase.id}\n`);
    runs.push(await runCase(benchmarkCase, baseUrl));
  }
} finally {
  await stopServer(server.child);
}

const report = {
  baseline,
  benchmark: suite.version,
  completedAt: new Date().toISOString(),
  methodology: {
    automaticRetries: 0,
    referenceDataLoadedByLiveRunner: false,
    scoredAttemptsPerCase: 1,
  },
  runs,
  schemaVersion: 1,
  startedAt,
};
await persistJson(report, argumentValue("report-file"));
process.stdout.write(`${JSON.stringify({
  benchmark: report.benchmark,
  completedAt: report.completedAt,
  failedRuns: runs.filter((run) => run.status !== 200).length,
  reportFile: path.resolve(argumentValue("report-file")),
  successfulRuns: runs.filter((run) => run.status === 200).length,
}, null, 2)}\n`);
if (runs.some((run) => run.status !== 200)) process.exitCode = 1;

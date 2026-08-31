import { performance } from "node:perf_hooks";

const CASES = [
  {
    id: "broad-shop-vac",
    input: { query: "shop vac" },
  },
  {
    id: "constrained-robot-vacuum",
    input: {
      query: "robot vacuum",
      budget: "under $300",
      priorities: "self-emptying",
    },
  },
  {
    id: "technical-gaming-monitor",
    input: {
      query: "gaming monitor",
      budget: "under $500",
      priorities: "27-inch, 1440p, at least 144Hz",
    },
  },
];

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function requireApprovedRun() {
  const approvedSearches = Number(argumentValue("approved-searches"));
  const phase = argumentValue("phase");

  if (approvedSearches !== CASES.length) {
    throw new Error(
      `This probe requires --approved-searches=${CASES.length}; received ${String(approvedSearches)}.`,
    );
  }

  if (phase !== "before" && phase !== "after") {
    throw new Error("This probe requires --phase=before or --phase=after.");
  }

  return phase;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueProducts(result) {
  const record = asRecord(result);
  const candidates = asArray(record.recommendations);
  const seen = new Set();

  return candidates.flatMap((value) => {
    const product = asRecord(value);
    const name = typeof product.name === "string" ? product.name : "";
    const url =
      typeof product.productPageUrl === "string" ? product.productPageUrl : "";
    const key = `${name.toLowerCase()}|${url.toLowerCase()}`;
    if (!name || seen.has(key)) return [];
    seen.add(key);

    return [
      {
        name,
        category: typeof product.category === "string" ? product.category : "",
        price: product.price ?? null,
        productPageUrl: url,
        hasImage: Boolean(product.imageUrl),
      },
    ];
  });
}

function normalResponseBytes(body) {
  const result = asRecord(body).result;
  if (!result) return 0;

  const normalBody = JSON.stringify({ result });
  return Buffer.byteLength(normalBody);
}

function serperCallSummary(debug) {
  const selectionSearch = asRecord(debug.search);
  return {
    logicalCalls: Number(selectionSearch.logicalSearchCalls || 0),
    physicalAttempts: Number(selectionSearch.physicalSearchAttempts || 0),
  };
}

async function runCase(baseUrl, benchmarkCase) {
  const startedAt = performance.now();
  let response;
  let text = "";

  try {
    response = await fetch(`${baseUrl}/api/recommendations`, {
      body: JSON.stringify(benchmarkCase.input),
      headers: {
        "Content-Type": "application/json",
        "x-reviewradar-debug": "true",
      },
      method: "POST",
      signal: AbortSignal.timeout(240_000),
    });
    text = await response.text();
  } catch (error) {
    return {
      id: benchmarkCase.id,
      input: benchmarkCase.input,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
      status: 0,
    };
  }

  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  const debug = asRecord(asRecord(body).debug);

  return {
    id: benchmarkCase.id,
    input: benchmarkCase.input,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    serverDurationMs: Number(asRecord(debug.timing).totalMs || 0),
    normalResponseBytes: normalResponseBytes(body),
    debugResponseBytes: Buffer.byteLength(text),
    openAiCalls: Number(debug.openAiCalls || 0),
    serperCalls: serperCallSummary(debug),
    plannerPromptChars: Number(asRecord(debug.planner).promptChars || 0),
    plannerSystemPromptChars: Number(
      asRecord(debug.planner).systemPromptChars || 0,
    ),
    slowestStages: asArray(asRecord(debug.timing).slowestStages),
    products: uniqueProducts(asRecord(body).result),
    error:
      typeof asRecord(body).error === "string"
        ? asRecord(body).error
        : null,
  };
}

const phase = requireApprovedRun();
const baseUrl = (process.env.RR_BASE || "http://localhost:3000").replace(/\/$/, "");
const startedAt = new Date().toISOString();
const results = [];

for (const benchmarkCase of CASES) {
  results.push(await runCase(baseUrl, benchmarkCase));
}

const report = {
  schemaVersion: 1,
  phase,
  startedAt,
  completedAt: new Date().toISOString(),
  baseUrl,
  cases: results,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (results.some((result) => result.status !== 200 || result.error)) {
  process.exitCode = 1;
}

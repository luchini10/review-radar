import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const METRICS = [
  ["marketLeaderDiscoveryRecall", "higher"],
  ["finalLeaderRecall", "higher"],
  ["topResultQualityPrecision", "higher"],
  ["ndcgAt3", "higher"],
  ["hardRequirementAccuracy", "higher"],
  ["wrongProductLeakage", "lower"],
  ["modelFamilyDuplicateLeakage", "lower"],
  ["productPageAccuracy", "higher"],
  ["priceAccuracy", "higher"],
  ["latencyMs.p50NearestRank", "lower"],
  ["latencyMs.p95NearestRank", "lower"],
];

function valueAt(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function scalar(value) {
  if (typeof value === "number") return value;
  if (value && typeof value.rate === "number") return value.rate;
  return null;
}

const baselineFile = argumentValue("baseline");
const candidateFile = argumentValue("candidate");
const reportFile = argumentValue("report-file");
if (!baselineFile || !candidateFile || !reportFile) {
  throw new Error("--baseline, --candidate, and --report-file are required.");
}

const baseline = JSON.parse(await readFile(path.resolve(baselineFile), "utf8"));
const candidate = JSON.parse(await readFile(path.resolve(candidateFile), "utf8"));
if (baseline.benchmark !== candidate.benchmark) {
  throw new Error(`Benchmark mismatch: ${baseline.benchmark} vs ${candidate.benchmark}`);
}
const baselineCaseIds = (baseline.perCase || []).map((entry) => entry.caseId);
const candidateCaseIds = (candidate.perCase || []).map((entry) => entry.caseId);
if (JSON.stringify(baselineCaseIds) !== JSON.stringify(candidateCaseIds)) {
  throw new Error("Case IDs or ordering differ; use a new benchmark version or documented delta.");
}

const comparisons = METRICS.map(([metric, preferredDirection]) => {
  const beforeMeasure = valueAt(baseline.metrics, metric);
  const afterMeasure = valueAt(candidate.metrics, metric);
  const before = scalar(beforeMeasure);
  const after = scalar(afterMeasure);
  return {
    after,
    afterMeasure,
    before,
    beforeMeasure,
    delta: before === null || after === null ? null : Number((after - before).toFixed(4)),
    metric,
    preferredDirection,
  };
});

await writeFile(path.resolve(reportFile), `${JSON.stringify({
  baseline: {
    branch: baseline.baseline?.branch || null,
    head: baseline.baseline?.head || null,
    reportFile: path.resolve(baselineFile),
  },
  benchmark: baseline.benchmark,
  candidate: {
    branch: candidate.baseline?.branch || null,
    head: candidate.baseline?.head || null,
    reportFile: path.resolve(candidateFile),
  },
  comparisons,
  generatedAt: new Date().toISOString(),
  schemaVersion: 1,
}, null, 2)}\n`, "utf8");
process.stdout.write(`${path.resolve(reportFile)}\n`);

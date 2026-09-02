import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function percent(value) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "n/a";
}

const reportFile = argumentValue("report-file");
const outputFile = argumentValue("output-file");
if (!reportFile || !outputFile) throw new Error("--report-file and --output-file are required.");
const report = JSON.parse(await readFile(path.resolve(reportFile), "utf8"));
const lines = [
  "# Accuracy Benchmark V1 Per-search Diagnostics",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Loss counts are for frozen grade-2/3 reference products. Product issues are source-bound manual adjudications. `n/a` NDCG means no scored reference denominator.",
  "",
  "| Case | Type | Returned | Discovered leaders | Final leaders | NDCG@3 | Earliest losses | Product issues |",
  "|---|---|---:|---:|---:|---:|---|---|",
];

for (const entry of report.perCase) {
  const discovered = entry.referenceDiagnostics.filter((item) => item.lossStage !== "never_discovered").length;
  const returned = entry.referenceDiagnostics.filter((item) => item.lossStage === "returned").length;
  const lossCounts = {};
  entry.referenceDiagnostics.forEach((item) => {
    lossCounts[item.lossStage] = (lossCounts[item.lossStage] || 0) + 1;
  });
  const losses = Object.entries(lossCounts)
    .filter(([stage]) => stage !== "returned")
    .map(([stage, count]) => `${stage}:${count}`)
    .join(", ") || "none";
  const issues = entry.products.flatMap((product) => {
    const judgment = product.judgment || {};
    const values = [];
    if (judgment.identityIssue && !["none", "unknown"].includes(judgment.identityIssue)) values.push(judgment.identityIssue);
    if (judgment.modelFamilyDuplicateWith) values.push("family_duplicate");
    if ((judgment.hardRequirementViolations || []).length) values.push(`hard_fail:${judgment.hardRequirementViolations.join("+")}`);
    if (judgment.priceAccuracy === "incorrect") values.push("bad_price");
    if (judgment.productPageAccuracy === "incorrect") values.push("bad_page");
    if (judgment.imageAccuracy === "incorrect") values.push("bad_image");
    return values.map((value) => `#${product.position} ${value}`);
  }).join(", ") || "none";
  lines.push(`| ${entry.caseId} | ${entry.searchType} | ${entry.products.length} | ${discovered}/${entry.referenceDiagnostics.length} | ${returned}/${entry.referenceDiagnostics.length} | ${percent(entry.ndcgAt3)} | ${losses} | ${issues} |`);
}

lines.push("");
await writeFile(path.resolve(outputFile), `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`${path.resolve(outputFile)}\n`);

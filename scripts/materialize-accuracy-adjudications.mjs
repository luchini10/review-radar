import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("../", import.meta.url);
const RAW_URL = new URL("benchmarks/accuracy-v1/results/baseline-raw.json", ROOT);
const SEARCHES_URL = new URL("benchmarks/accuracy-v1/searches.json", ROOT);
const REFERENCES_URL = new URL("benchmarks/accuracy-v1/references.json", ROOT);
const DECISIONS_URL = new URL("benchmarks/accuracy-v1/adjudication-decisions.json", ROOT);
const OUTPUT_URL = new URL("benchmarks/accuracy-v1/results/baseline-adjudications.json", ROOT);

function argumentValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((entry) => entry.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[™®©]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const compact = (value) => normalize(value).replaceAll(" ", "");

function productMatchesReference(name, reference) {
  const candidate = normalize(name);
  const candidateCompact = compact(name);
  const brand = normalize(reference.brand);
  const identities = [reference.model, ...asArray(reference.aliases)]
    .map(normalize)
    .filter(Boolean);
  return candidate.includes(brand) && identities.some((identity) =>
    candidate.includes(identity) || candidateCompact.includes(compact(identity)));
}

const rawPath = argumentValue("run-file");
const decisionsPath = argumentValue("decisions");
const outputPathArgument = argumentValue("output-file");
const rawSource = rawPath ? path.resolve(rawPath) : RAW_URL;
const decisionsSource = decisionsPath ? path.resolve(decisionsPath) : DECISIONS_URL;
const outputPath = outputPathArgument
  ? path.resolve(outputPathArgument)
  : path.resolve(OUTPUT_URL.pathname.slice(1));

const rawText = await readFile(rawSource, "utf8");
const raw = JSON.parse(rawText);
const suite = JSON.parse(await readFile(SEARCHES_URL, "utf8"));
const registry = JSON.parse(await readFile(REFERENCES_URL, "utf8"));
const policy = JSON.parse(await readFile(decisionsSource, "utf8"));
const rawSha256 = createHash("sha256").update(rawText).digest("hex");

const reusableJudgments = new Map();
for (const reusablePath of asArray(policy.reuseAdjudications)) {
  const reusable = JSON.parse(await readFile(path.resolve(reusablePath), "utf8"));
  for (const judgment of asArray(reusable.judgments)) {
    const productPageUrl = asArray(judgment.evidenceUrls)[0] || "";
    reusableJudgments.set(
      `${judgment.caseId}\u0000${judgment.productName}\u0000${productPageUrl}`,
      judgment,
    );
  }
}

if (rawSha256 !== policy.runReportSha256) {
  throw new Error("Adjudication decisions are not bound to this raw run.");
}

const caseById = new Map(suite.cases.map((entry) => [entry.id, entry]));
const productById = new Map(registry.products.map((entry) => [entry.id, entry]));
const judgments = [];

for (const run of raw.runs) {
  const benchmarkCase = caseById.get(run.caseId);
  if (!benchmarkCase) throw new Error(`Unknown benchmark case: ${run.caseId}`);
  const products = asArray(run.body?.result?.recommendations);
  const decisions = policy.caseDecisions[run.caseId] || [];
  if (decisions.length !== products.length) {
    throw new Error(`${run.caseId}: expected ${products.length} decisions, found ${decisions.length}`);
  }
  const references = benchmarkCase.referenceProductIds.map((id) => productById.get(id));
  const categoryEvidence = [...new Set(references.flatMap((entry) =>
    asArray(entry?.sources).map((source) => source.url)))]
    .slice(0, 4);

  products.forEach((product, index) => {
    const decision = decisions[index];
    const reusable = reusableJudgments.get(
      `${run.caseId}\u0000${product.name}\u0000${product.productPageUrl || ""}`,
    ) || {};
    const reference = references.find((entry) => productMatchesReference(product.name, entry));
    const duplicate = Number.isInteger(decision.duplicateOfPosition)
      ? products[decision.duplicateOfPosition - 1]
      : null;
    if (decision.duplicateOfPosition && !duplicate) {
      throw new Error(`${run.caseId} position ${index + 1}: invalid duplicate position`);
    }
    const merged = {
      ...policy.defaultDecision,
      ...reusable,
      ...decision,
    };
    delete merged.duplicateOfPosition;
    judgments.push({
      availabilityAccuracy: merged.availabilityAccuracy,
      caseId: run.caseId,
      evidenceUrls: [...new Set([
        product.productPageUrl,
        ...asArray(reusable.evidenceUrls),
        ...asArray(decision.evidenceUrls),
        ...categoryEvidence,
      ].filter(Boolean))],
      hardRequirementViolations: merged.hardRequirementViolations,
      hardRequirementUnknowns: merged.hardRequirementUnknowns || [],
      identityIssue: merged.identityIssue,
      imageAccuracy: merged.imageAccuracy,
      modelFamilyDuplicateWith: duplicate?.name || null,
      notes: merged.notes,
      priceAccuracy: merged.priceAccuracy,
      productName: product.name,
      productPageAccuracy: merged.productPageAccuracy,
      relevanceGrade: decision.relevanceGrade ?? reference?.grade ?? merged.relevanceGrade,
    });
  });
}

await writeFile(outputPath, `${JSON.stringify({
  benchmark: suite.version,
  generatedAt: new Date().toISOString(),
  judgments,
  runReportSha256: rawSha256,
  schemaVersion: 1,
}, null, 2)}\n`, "utf8");
process.stdout.write(`${outputPath}\n`);

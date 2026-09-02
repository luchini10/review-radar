import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const SEARCHES_URL = new URL("../benchmarks/accuracy-v1/searches.json", import.meta.url);
const REFERENCES_URL = new URL("../benchmarks/accuracy-v1/references.json", import.meta.url);

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

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[™®©]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value).replaceAll(" ", "");
}

function productMatchesReference(name, reference) {
  const candidate = normalize(name);
  const candidateCompact = compact(name);
  const brand = normalize(reference.brand);
  const identities = [reference.model, ...asArray(reference.aliases)]
    .map((value) => normalize(value))
    .filter(Boolean);
  return (
    candidate.includes(brand) &&
    identities.some((identity) =>
      candidate.includes(identity) || candidateCompact.includes(compact(identity)),
    )
  );
}

function matchingReference(name, references) {
  return references.find((reference) => productMatchesReference(name, reference)) || null;
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function ratio(numerator, denominator) {
  return {
    denominator,
    numerator,
    rate: denominator ? Number((numerator / denominator).toFixed(4)) : null,
  };
}

function gainForGrade(grade) {
  if (grade >= 3) return 3;
  if (grade >= 2) return 2;
  if (grade >= 1) return 1;
  return 0;
}

function dcg(gains) {
  return gains.reduce(
    (total, gain, index) => total + gain / Math.log2(index + 2),
    0,
  );
}

function ndcgAt3(products, references, judgments) {
  const gains = products.slice(0, 3).map((product) => {
    const reference = matchingReference(product.name, references);
    if (reference) return gainForGrade(reference.grade);
    const judgment = judgments.find((value) => value.productName === product.name);
    return gainForGrade(judgment?.relevanceGrade);
  });
  const ideal = references
    .map((reference) => gainForGrade(reference.grade))
    .sort((a, b) => b - a)
    .slice(0, 3);
  const idealDcg = dcg(ideal);
  return idealDcg ? Number((dcg(gains) / idealDcg).toFixed(4)) : null;
}

function stageCandidates(search, stage) {
  const funnel = asRecord(search.candidateFunnel);
  if (stage === "final") return asArray(funnel.returned);
  if (stage === "verified") return asArray(funnel.verified);
  return asArray(funnel[stage]);
}

function referenceObserved(reference, candidates) {
  return candidates.some((candidate) =>
    productMatchesReference(asRecord(candidate).name, reference),
  );
}

function lossStage(reference, search) {
  const stages = [
    ["discovered", "never_discovered"],
    ["deduplicated", "candidate_deduplication"],
    ["prefiltered", "prefilter_rejection"],
    ["marketCompatible", "merchant_or_market_filter"],
    ["ranked", "candidate_truncation_or_ranking"],
    ["verified", "page_or_commerce_verification"],
    ["final", "final_selection_crowd_out"],
  ];
  for (const [stage, loss] of stages) {
    if (!referenceObserved(reference, stageCandidates(search, stage))) return loss;
  }
  return "returned";
}

function judgmentKey(caseId, productName) {
  return `${caseId}\u0000${productName}`;
}

function gradeForProduct(product, references, judgment) {
  const reference = matchingReference(product.name, references);
  return reference?.grade ?? judgment?.relevanceGrade ?? null;
}

function templateJudgment(caseId, product) {
  return {
    availabilityAccuracy: "unknown",
    caseId,
    evidenceUrls: [],
    hardRequirementViolations: [],
    hardRequirementUnknowns: [],
    identityIssue: "unknown",
    imageAccuracy: "unknown",
    modelFamilyDuplicateWith: null,
    notes: "",
    priceAccuracy: "unknown",
    productName: product.name,
    productPageAccuracy: "unknown",
    relevanceGrade: null,
  };
}

async function atomicWrite(file, value) {
  const target = path.resolve(file);
  const normalized = target.replaceAll("\\", "/").toLowerCase();
  if (normalized.includes("/tests/fixtures/review-radar-live/") || path.basename(target).toLowerCase() === ".env.local") {
    throw new Error("Output cannot target a protected path.");
  }
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, { encoding: "utf8", flag: "wx" });
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

const runFile = argumentValue("run-file");
if (!runFile) throw new Error("--run-file is required.");
const runText = await readFile(path.resolve(runFile), "utf8");
const raw = JSON.parse(runText);
const suite = JSON.parse(await readFile(SEARCHES_URL, "utf8"));
const registry = JSON.parse(await readFile(REFERENCES_URL, "utf8"));
const productById = new Map(registry.products.map((product) => [product.id, product]));
const caseById = new Map(suite.cases.map((entry) => [entry.id, entry]));
const runs = asArray(raw.runs);

const templateFile = argumentValue("write-adjudication-template");
if (templateFile) {
  const judgments = runs.flatMap((run) => {
    const recommendations = asArray(asRecord(asRecord(run.body).result).recommendations);
    return recommendations.map((product) =>
      templateJudgment(run.caseId, asRecord(product)),
    );
  });
  await atomicWrite(
    templateFile,
    `${JSON.stringify({
      benchmark: suite.version,
      generatedAt: new Date().toISOString(),
      judgments,
      runReportSha256: createHash("sha256").update(runText).digest("hex"),
      schemaVersion: 1,
    }, null, 2)}\n`,
  );
  process.stdout.write(`${path.resolve(templateFile)}\n`);
  process.exit(0);
}

const adjudicationFile = argumentValue("adjudications");
const adjudications = adjudicationFile
  ? JSON.parse(await readFile(path.resolve(adjudicationFile), "utf8"))
  : { judgments: [] };
const judgmentMap = new Map(
  asArray(adjudications.judgments).map((judgment) => [
    judgmentKey(judgment.caseId, judgment.productName),
    judgment,
  ]),
);
const lossCounts = {};
const perCase = [];
let discoveryHits = 0;
let discoveryDenominator = 0;
let finalHits = 0;
let finalDenominator = 0;
let displayed = 0;
let judgedDisplayed = 0;
let strongDisplayed = 0;
let hardViolations = 0;
let hardUnknowns = 0;
let hardRequirementOpportunities = 0;
let wrongProducts = 0;
let familyDuplicates = 0;
let correctPages = 0;
let judgedPages = 0;
let correctPrices = 0;
let judgedPrices = 0;
let correctAvailability = 0;
let judgedAvailability = 0;
let correctImages = 0;
let judgedImages = 0;

for (const run of runs) {
  const benchmarkCase = caseById.get(run.caseId);
  if (!benchmarkCase) continue;
  const references = benchmarkCase.referenceProductIds.map((id) => productById.get(id));
  const scoredReferences = references.filter((reference) => reference?.grade >= 2);
  const body = asRecord(run.body);
  const search = asRecord(asRecord(body.debug).search);
  const products = asArray(asRecord(body.result).recommendations).map(asRecord);
  const judgments = products.map((product) =>
    judgmentMap.get(judgmentKey(run.caseId, product.name)),
  );
  const referenceDiagnostics = scoredReferences.map((reference) => {
    const loss = lossStage(reference, search);
    lossCounts[loss] = (lossCounts[loss] || 0) + 1;
    discoveryDenominator += 1;
    finalDenominator += 1;
    if (loss !== "never_discovered") discoveryHits += 1;
    if (loss === "returned") finalHits += 1;
    return { id: reference.id, lossStage: loss };
  });

  const productDiagnostics = products.map((product, index) => {
    const reference = matchingReference(product.name, references);
    const judgment = judgments[index];
    displayed += 1;
    if (reference?.grade >= 2) {
      judgedDisplayed += 1;
      strongDisplayed += 1;
    } else if (reference?.grade === 1) {
      judgedDisplayed += 1;
    } else if (judgment && Number.isInteger(judgment.relevanceGrade)) {
      judgedDisplayed += 1;
      if (judgment.relevanceGrade >= 2) strongDisplayed += 1;
    }
    if (judgment) {
      hardViolations += asArray(judgment.hardRequirementViolations).length;
      hardUnknowns += asArray(judgment.hardRequirementUnknowns).length;
      hardRequirementOpportunities += asArray(benchmarkCase.hardRequirements).length;
      if (judgment.identityIssue !== "none" && judgment.identityIssue !== "unknown") wrongProducts += 1;
      if (judgment.modelFamilyDuplicateWith) familyDuplicates += 1;
      if (judgment.productPageAccuracy !== "unknown") {
        judgedPages += 1;
        if (judgment.productPageAccuracy === "correct") correctPages += 1;
      }
      if (judgment.priceAccuracy !== "unknown") {
        judgedPrices += 1;
        if (judgment.priceAccuracy === "correct") correctPrices += 1;
      }
      if (judgment.availabilityAccuracy !== "unknown") {
        judgedAvailability += 1;
        if (judgment.availabilityAccuracy === "correct") correctAvailability += 1;
      }
      if (product.imageUrl && judgment.imageAccuracy !== "unknown") {
        judgedImages += 1;
        if (judgment.imageAccuracy === "correct") correctImages += 1;
      }
    }
    return {
      judgment: judgment || null,
      matchedReferenceId: reference?.id || null,
      matchedReferenceGrade: reference?.grade ?? null,
      name: product.name,
      position: index + 1,
      price: asRecord(product.price).amount ?? null,
      productPageUrl: product.productPageUrl || null,
    };
  });
  perCase.push({
    caseId: run.caseId,
    category: benchmarkCase.category,
    clientDurationMs: run.clientDurationMs,
    ndcgAt3: ndcgAt3(products, references, judgments.filter(Boolean)),
    products: productDiagnostics,
    referenceDiagnostics,
    searchType: benchmarkCase.searchType,
    status: run.status,
  });
}

const successfulRuns = runs.filter((run) => run.status === 200);
const durations = successfulRuns.map((run) => finite(run.clientDurationMs));
const debugFor = (run) => asRecord(asRecord(run.body).debug);
const broadCases = perCase.filter((entry) => entry.searchType === "broad");
const broadReferenceDiagnostics = broadCases.flatMap((entry) => entry.referenceDiagnostics);
const broadProducts = broadCases.flatMap((entry) => entry.products);
const ndcgValues = perCase.map((entry) => entry.ndcgAt3).filter(Number.isFinite);
const completeJudgmentCount = asArray(adjudications.judgments).filter(
  (judgment) => Number.isInteger(judgment.relevanceGrade),
).length;
const evidenceBoundJudgmentCount = asArray(adjudications.judgments).filter(
  (judgment) => asArray(judgment.evidenceUrls).length > 0,
).length;
const methodologicalBlockers = [];
if (runs.length !== suite.cases.length) methodologicalBlockers.push("run_count_mismatch");
if (completeJudgmentCount !== displayed) methodologicalBlockers.push("displayed_product_adjudication_incomplete");
if (evidenceBoundJudgmentCount !== displayed) methodologicalBlockers.push("displayed_product_evidence_binding_incomplete");
if (adjudicationFile && adjudications.runReportSha256 !== createHash("sha256").update(runText).digest("hex")) {
  methodologicalBlockers.push("adjudication_run_binding_mismatch");
}

function aggregateBreakdown(entries) {
  const products = entries.flatMap((entry) => entry.products);
  const referenceDiagnostics = entries.flatMap((entry) => entry.referenceDiagnostics);
  const durationsForEntries = entries.map((entry) => entry.clientDurationMs).filter(Number.isFinite);
  const rankingValues = entries.map((entry) => entry.ndcgAt3).filter(Number.isFinite);
  const strong = products.filter((product) => {
    const grade = product.matchedReferenceGrade ?? product.judgment?.relevanceGrade;
    return grade >= 2;
  }).length;
  return {
    cases: entries.length,
    displayedProducts: products.length,
    emptyResults: entries.filter((entry) => entry.products.length === 0).length,
    finalLeaderRecall: ratio(
      referenceDiagnostics.filter((entry) => entry.lossStage === "returned").length,
      referenceDiagnostics.length,
    ),
    leaderDiscoveryRecall: ratio(
      referenceDiagnostics.filter((entry) => entry.lossStage !== "never_discovered").length,
      referenceDiagnostics.length,
    ),
    ndcgAt3: rankingValues.length
      ? Number((rankingValues.reduce((sum, value) => sum + value, 0) / rankingValues.length).toFixed(4))
      : null,
    strongResultPrecision: ratio(strong, products.length),
    latencyMs: {
      p50NearestRank: percentile(durationsForEntries, 0.5),
      p95NearestRank: percentile(durationsForEntries, 0.95),
    },
  };
}

const categoryBreakdown = Object.fromEntries(
  [...new Set(perCase.map((entry) => entry.category))]
    .sort()
    .map((category) => [category, aggregateBreakdown(perCase.filter((entry) => entry.category === category))]),
);
const searchTypeBreakdown = Object.fromEntries(
  [...new Set(perCase.map((entry) => entry.searchType))]
    .sort()
    .map((searchType) => [searchType, aggregateBreakdown(perCase.filter((entry) => entry.searchType === searchType))]),
);

const budgetPairDiagnostics = perCase
  .filter((entry) => entry.searchType === "broad_budget")
  .flatMap((entry) => {
    const benchmarkCase = caseById.get(entry.caseId);
    const references = benchmarkCase.referenceProductIds.map((id) => productById.get(id));
    const pairs = [];
    for (let first = 0; first < entry.products.length; first += 1) {
      for (let second = first + 1; second < entry.products.length; second += 1) {
        const firstProduct = entry.products[first];
        const secondProduct = entry.products[second];
        const firstGrade = gradeForProduct(firstProduct, references, firstProduct.judgment);
        const secondGrade = gradeForProduct(secondProduct, references, secondProduct.judgment);
        if (!Number.isFinite(firstProduct.price) || !Number.isFinite(secondProduct.price)) continue;
        if (!(firstGrade < secondGrade && firstProduct.price < secondProduct.price)) continue;
        pairs.push({
          cheaperWeakerPosition: first + 1,
          caseId: entry.caseId,
          strongerHigherPricedPosition: second + 1,
        });
      }
    }
    return pairs;
  });

const allHigherPricedStrongerPairs = perCase
  .filter((entry) => entry.searchType === "broad_budget")
  .reduce((total, entry) => {
    const benchmarkCase = caseById.get(entry.caseId);
    const references = benchmarkCase.referenceProductIds.map((id) => productById.get(id));
    let pairs = 0;
    for (let first = 0; first < entry.products.length; first += 1) {
      for (let second = first + 1; second < entry.products.length; second += 1) {
        const a = entry.products[first];
        const b = entry.products[second];
        const aGrade = gradeForProduct(a, references, a.judgment);
        const bGrade = gradeForProduct(b, references, b.judgment);
        if (!Number.isFinite(a.price) || !Number.isFinite(b.price) || aGrade === bGrade) continue;
        const stronger = aGrade > bGrade ? a : b;
        const weaker = aGrade > bGrade ? b : a;
        if (stronger.price > weaker.price) pairs += 1;
      }
    }
    return total + pairs;
  }, 0);

const result = {
  baseline: raw.baseline,
  benchmark: suite.version,
  completedAt: new Date().toISOString(),
  failureTaxonomy: Object.fromEntries(
    Object.entries(lossCounts).sort((first, second) => second[1] - first[1]),
  ),
  methodology: {
    debatableDisplayedProducts: asArray(adjudications.judgments).filter(
      (judgment) => judgment.relevanceGrade === 1,
    ).length,
    methodologicalBlockers,
    phaseStatus: methodologicalBlockers.length ? "INVALID" : "VALID",
    scoredAttempts: runs.length,
    unadjudicatedDisplayedProducts: displayed - judgedDisplayed,
  },
  metrics: {
    availabilityAccuracy: ratio(correctAvailability, judgedAvailability),
    broadSearch: {
      finalLeaderRecall: ratio(
        broadReferenceDiagnostics.filter((entry) => entry.lossStage === "returned").length,
        broadReferenceDiagnostics.length,
      ),
      leaderDiscoveryRecall: ratio(
        broadReferenceDiagnostics.filter((entry) => entry.lossStage !== "never_discovered").length,
        broadReferenceDiagnostics.length,
      ),
      strongResultPrecision: ratio(
        broadProducts.filter((product) => {
          const grade = product.judgment?.relevanceGrade;
          return product.matchedReferenceId || grade >= 2;
        }).length,
        broadProducts.filter((product) => product.matchedReferenceId || Number.isInteger(product.judgment?.relevanceGrade)).length,
      ),
      mainstreamBrandModelCoverage: (() => {
        const broadCaseIds = new Set(broadCases.map((entry) => entry.caseId));
        const referenceBrands = new Set();
        const returnedBrands = new Set();
        for (const benchmarkCase of suite.cases.filter((entry) => broadCaseIds.has(entry.id))) {
          const references = benchmarkCase.referenceProductIds.map((id) => productById.get(id));
          references.filter((entry) => entry?.grade >= 2).forEach((entry) => referenceBrands.add(normalize(entry.brand)));
          const result = broadCases.find((entry) => entry.caseId === benchmarkCase.id);
          for (const product of result?.products || []) {
            const reference = references.find((entry) => productMatchesReference(product.name, entry));
            if (reference?.grade >= 2) returnedBrands.add(normalize(reference.brand));
          }
        }
        return ratio(returnedBrands.size, referenceBrands.size);
      })(),
    },
    budgetSearch: {
      higherPriceStrongerRankingInversions: ratio(
        budgetPairDiagnostics.length,
        allHigherPricedStrongerPairs,
      ),
      inversionCases: [...new Set(budgetPairDiagnostics.map((entry) => entry.caseId))],
    },
    calls: {
      hostedWebSearchCalls: successfulRuns.reduce((sum, run) => sum + finite(asRecord(debugFor(run).marketScout).hostedSearchCalls), 0),
      logicalSerperOperations: successfulRuns.reduce((sum, run) => sum + finite(asRecord(debugFor(run).search).logicalSearchCalls), 0),
      openAiResponses: successfulRuns.reduce((sum, run) => sum + finite(debugFor(run).openAiCalls), 0),
      physicalSerperAttempts: successfulRuns.reduce((sum, run) => sum + finite(asRecord(debugFor(run).search).physicalSearchAttempts), 0),
      tokens: {
        input: successfulRuns.reduce((sum, run) => sum + finite(asRecord(debugFor(run).marketScout).inputTokens), 0),
        output: successfulRuns.reduce((sum, run) => sum + finite(asRecord(debugFor(run).marketScout).outputTokens), 0),
      },
    },
    exactDuplicateLeakage: ratio(
      perCase.reduce((sum, entry) => {
        const keys = entry.products.map((product) => `${normalize(product.name)}|${normalize(product.productPageUrl)}`);
        return sum + (keys.length - new Set(keys).size);
      }, 0),
      displayed,
    ),
    finalLeaderRecall: ratio(finalHits, finalDenominator),
    hardRequirementViolations: ratio(hardViolations, hardRequirementOpportunities),
    hardRequirementAccuracy: ratio(
      Math.max(0, hardRequirementOpportunities - hardViolations - hardUnknowns),
      hardRequirementOpportunities,
    ),
    hardRequirementUnknowns: ratio(hardUnknowns, hardRequirementOpportunities),
    imageAccuracy: ratio(correctImages, judgedImages),
    latencyMs: {
      maximum: Math.max(0, ...durations),
      mean: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      p50NearestRank: percentile(durations, 0.5),
      p95NearestRank: percentile(durations, 0.95),
    },
    marketLeaderDiscoveryRecall: ratio(discoveryHits, discoveryDenominator),
    modelFamilyDuplicateLeakage: ratio(familyDuplicates, displayed),
    ndcgAt3: ndcgValues.length ? Number((ndcgValues.reduce((sum, value) => sum + value, 0) / ndcgValues.length).toFixed(4)) : null,
    priceAccuracy: ratio(correctPrices, judgedPrices),
    productPageAccuracy: ratio(correctPages, judgedPages),
    requestSuccess: ratio(successfulRuns.length, runs.length),
    topResultQualityPrecision: ratio(strongDisplayed, judgedDisplayed),
    wrongProductLeakage: ratio(wrongProducts, displayed),
  },
  perCase,
  breakdowns: {
    byCategory: categoryBreakdown,
    bySearchType: searchTypeBreakdown,
  },
  schemaVersion: 1,
};

const reportFile = argumentValue("report-file");
if (!reportFile) throw new Error("--report-file is required.");
await atomicWrite(reportFile, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  phaseStatus: result.methodology.phaseStatus,
  reportFile: path.resolve(reportFile),
  scoredCases: perCase.length,
}, null, 2)}\n`);
if (methodologicalBlockers.length) process.exitCode = 1;

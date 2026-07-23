// Zero-live Direct-Terra first-loss audit.
//
// Reads sanitized saved T8A/T8B/T8C fixtures and accounts for every ranked
// product. It intentionally cannot claim whether an unranked leader was absent
// from Terra's research or merely omitted from ranking because the historical
// fixtures did not retain source titles. A future approved diagnostic run can
// resolve that distinction through the server-only trace contract.

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  analyzeDirectTerraSavedRun,
  DIRECT_TERRA_FIRST_LOSS_VERSION,
  summarizeDirectTerraFirstLossRuns,
} from "../lib/directTerraFirstLoss.ts";

const FIXTURE_ROOT = path.resolve("tests/fixtures/review-radar-live");
const T8C_DIRECTORY = "oai-t8c-multi-category-validation-d7a2ec2";
const INTEGRATED_PREFIX = "oai-t8a-integrated-asset-smoke-";
const DEFAULT_OUTPUT = path.join(
  FIXTURE_ROOT,
  T8C_DIRECTORY,
  "first-loss-audit.json",
);

function normalizedFixture(value, id) {
  if (
    value &&
    typeof value === "object" &&
    typeof value.reportMarkdown === "string" &&
    Array.isArray(value.productAssets)
  ) {
    return {
      id,
      reportMarkdown: value.reportMarkdown,
      productAssets: value.productAssets,
      score: value.score ?? null,
      evidenceClass: "t8c_multi_category",
    };
  }
  const response = value?.completedResponse;
  if (
    response &&
    typeof response === "object" &&
    typeof response.reportMarkdown === "string" &&
    Array.isArray(response.productAssets)
  ) {
    return {
      id,
      reportMarkdown: response.reportMarkdown,
      productAssets: response.productAssets,
      score: null,
      evidenceClass: "t8a_t8b_integrated",
    };
  }
  return null;
}

async function jsonFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          entry.name !== "summary.json" &&
          entry.name !== "first-loss-audit.json",
      )
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch {
    return [];
  }
}

export async function loadDirectTerraFirstLossFixtures(
  fixtureRoot = FIXTURE_ROOT,
) {
  const directories = await fs.readdir(fixtureRoot, { withFileTypes: true });
  const selected = directories
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === T8C_DIRECTORY ||
          entry.name.startsWith(INTEGRATED_PREFIX)),
    )
    .map((entry) => entry.name)
    .sort();
  const loaded = [];
  for (const directoryName of selected) {
    const directory = path.join(fixtureRoot, directoryName);
    for (const file of await jsonFiles(directory)) {
      const value = JSON.parse(await fs.readFile(file, "utf8"));
      const normalized = normalizedFixture(
        value,
        `${directoryName}/${path.basename(file)}`,
      );
      if (normalized) loaded.push(normalized);
    }
  }
  return loaded;
}

export async function buildDirectTerraFirstLossAudit(
  fixtureRoot = FIXTURE_ROOT,
) {
  const fixtures = await loadDirectTerraFirstLossFixtures(fixtureRoot);
  const runs = fixtures.map((fixture) => ({
    evidenceClass: fixture.evidenceClass,
    ...analyzeDirectTerraSavedRun(fixture),
  }));
  const summary = summarizeDirectTerraFirstLossRuns(runs);
  const evidenceClassNames = [
    ...new Set(runs.map((run) => run.evidenceClass)),
  ];
  return {
    schemaVersion: DIRECT_TERRA_FIRST_LOSS_VERSION,
    generatedAt: new Date().toISOString(),
    zeroLive: true,
    fixtureCount: runs.length,
    evidenceClasses: Object.fromEntries(
      evidenceClassNames.map((evidenceClass) => [
        evidenceClass,
        runs.filter((run) => run.evidenceClass === evidenceClass).length,
      ]),
    ),
    summary,
    byEvidenceClass: Object.fromEntries(
      evidenceClassNames.map((evidenceClass) => [
        evidenceClass,
        summarizeDirectTerraFirstLossRuns(
          runs.filter((run) => run.evidenceClass === evidenceClass),
        ),
      ]),
    ),
    evidenceLimits: [
      "Historical fixtures retain final assets but not raw Serper rows or per-candidate verifier decisions.",
      "Heading-only replay omits the historical structured price identities, so it can prove newly recovered heading targets but cannot measure the complete current target count.",
      "Historical T8C fixtures retain source hosts but not response source titles, so missed leaders cannot be split between absent-from-research and found-but-not-ranked.",
      "Current target extraction can be replayed, but downstream provider and page-fetch stages require a new approved diagnostic sample for exact first-loss attribution.",
    ],
    runs,
  };
}

async function main() {
  const audit = await buildDirectTerraFirstLossAudit();
  if (process.argv.includes("--write")) {
    const outputIndex = process.argv.indexOf("--output");
    const output =
      outputIndex >= 0 && process.argv[outputIndex + 1]
        ? path.resolve(process.argv[outputIndex + 1])
        : DEFAULT_OUTPUT;
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({
        status: "written",
        output,
        summary: audit.summary,
      })}\n`,
    );
    return;
  }
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}

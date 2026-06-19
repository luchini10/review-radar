#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, join, resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerDir = join(repoRoot, "docs", "agent-worker-results");

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

async function latestWorkerFiles(limit = 2) {
  if (!existsSync(workerDir)) {
    return [];
  }

  const files = await Promise.all(
    (await readdir(workerDir))
      .filter((file) => /(?:^|[.])worker-.*\.json$/.test(file))
      .map(async (file) => ({
        file,
        modifiedAt: (await stat(join(workerDir, file))).mtimeMs,
      })),
  );

  return files
    .sort((first, second) => first.modifiedAt - second.modifiedAt)
    .slice(-limit)
    .map((item) => join(workerDir, item.file));
}

function splitPaths(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function expandInput(value, fallbackIndex) {
  if (!value) {
    const latest = await latestWorkerFiles(2);
    return latest[fallbackIndex] ? [latest[fallbackIndex]] : [];
  }

  const parts = splitPaths(value);
  const expanded = [];

  for (const part of parts) {
    const path = resolve(repoRoot, part);

    if (existsSync(path) && (await stat(path)).isDirectory()) {
      const files = (await readdir(path))
        .filter((file) => /(?:^|[.])worker-.*\.json$/.test(file))
        .map((file) => join(path, file));
      expanded.push(...files);
    } else {
      expanded.push(path);
    }
  }

  return expanded;
}

async function loadResultSet(paths) {
  const results = [];

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    results.push({
      file: basename(path),
      ...(await readJson(path)),
    });
  }

  return results;
}

function allFindings(results) {
  return results.flatMap((result) =>
    (Array.isArray(result.findings) ? result.findings : []).map((finding) => ({
      batchName: result.batchName,
      ...finding,
    })),
  );
}

function rootCauseCounts(results) {
  const counts = new Map();

  for (const finding of allFindings(results)) {
    const key = finding.rootCause || finding.failureType || "unclassified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function suspiciousFailureCount(results, pattern) {
  return allFindings(results).filter((finding) =>
    pattern.test(`${finding.failureType || ""} ${finding.rootCause || ""} ${finding.note || ""}`),
  ).length;
}

function exactMatchFailureCount(results) {
  return allFindings(results).filter((finding) => finding.exactMatchAffected).length;
}

function containsProductSpecificFix(results) {
  const text = JSON.stringify(results).toLowerCase();

  return /\b(?:hardcode|hard-coded|only this product|specific product patch|single product fix|just this product|patch this sku)\b/.test(text);
}

function verify(beforeResults, afterResults) {
  const beforeFindings = allFindings(beforeResults);
  const afterFindings = allFindings(afterResults);
  const beforeRoots = rootCauseCounts(beforeResults);
  const afterRoots = rootCauseCounts(afterResults);
  const resolvedRootCauses = [...beforeRoots.keys()].filter(
    (root) => !afterRoots.has(root),
  );
  const newRootCauses = [...afterRoots.keys()].filter(
    (root) => !beforeRoots.has(root),
  );
  const rejectedReasons = [];
  const wrongPriceBefore = suspiciousFailureCount(beforeResults, /price/i);
  const wrongPriceAfter = suspiciousFailureCount(afterResults, /price/i);
  const wrongProductBefore = suspiciousFailureCount(beforeResults, /wrong_product|category|identity/i);
  const wrongProductAfter = suspiciousFailureCount(afterResults, /wrong_product|category|identity/i);
  const nonProductBefore = suspiciousFailureCount(beforeResults, /non_product|article|forum|support|deal/i);
  const nonProductAfter = suspiciousFailureCount(afterResults, /non_product|article|forum|support|deal/i);

  if (afterFindings.length > beforeFindings.length) {
    rejectedReasons.push("After set has more findings than before.");
  }

  if (newRootCauses.length > 0) {
    rejectedReasons.push(`After set introduced new root causes: ${newRootCauses.join(", ")}.`);
  }

  if (exactMatchFailureCount(afterResults) > exactMatchFailureCount(beforeResults)) {
    rejectedReasons.push("After set has more exact-match-affecting failures.");
  }

  if (wrongPriceAfter > wrongPriceBefore) {
    rejectedReasons.push("Wrong-price findings increased.");
  }

  if (wrongProductAfter > wrongProductBefore) {
    rejectedReasons.push("Wrong-product/category findings increased.");
  }

  if (nonProductAfter > nonProductBefore) {
    rejectedReasons.push("Non-product-card findings increased.");
  }

  if (containsProductSpecificFix(afterResults)) {
    rejectedReasons.push("After set appears to describe a product-specific patch.");
  }

  return {
    accepted: rejectedReasons.length === 0,
    afterFindingCount: afterFindings.length,
    beforeFindingCount: beforeFindings.length,
    newRootCauses,
    rejectedReasons,
    requiredFollowUp:
      rejectedReasons.length > 0
        ? "Investigate rejected reasons before accepting this loop."
        : "No verifier follow-up required.",
    resolvedRootCauses,
  };
}

async function main() {
  const beforePaths = await expandInput(argValue("before"), 0);
  const afterPaths = await expandInput(argValue("after"), 1);

  if (beforePaths.length === 0 || afterPaths.length === 0) {
    console.error(
      "Usage: npm run qa:verify -- --before <file-or-dir-or-list> --after <file-or-dir-or-list>",
    );
    process.exitCode = 1;
    return;
  }

  const beforeResults = await loadResultSet(beforePaths);
  const afterResults = await loadResultSet(afterPaths);
  const summary = {
    runId: `verify-${nowStamp()}`,
    afterFiles: afterResults.map((result) => result.file),
    beforeFiles: beforeResults.map((result) => result.file),
    createdAt: new Date().toISOString(),
    ...verify(beforeResults, afterResults),
    rule: "Accept only generalized improvements that do not harm broader QA.",
  };

  await mkdir(workerDir, { recursive: true });
  await writeFile(
    join(workerDir, `${summary.runId}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.accepted) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

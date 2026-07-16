import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import {
  AUTONOMOUS_COMMERCE_VERIFIER_VERSION,
  commerceVerificationQuery,
  verifyCommerceShoppingResults,
} from "../lib/autonomousCommerceVerifier.ts";

const INPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json",
);
const OUTPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-h2b-commerce-2026-07-16/h2b-result.json",
);
const ENDPOINT = "https://google.serper.dev/shopping";
const EXPECTED_SEARCHES = 4;
const RESULTS_PER_SEARCH = 20;
const TIMEOUT_MS = 12_000;
const EXECUTE = process.argv.includes("--execute");
const APPROVED_SEARCHES = Number(
  process.argv.find((argument) => argument.startsWith("--approved-searches="))?.split("=")[1] ||
    "0",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function loadSerperKey() {
  if (process.env.SERPER_API_KEY) return process.env.SERPER_API_KEY;
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("SERPER_API_KEY="));
  if (!line) return "";
  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^['"]|['"]$/g, "");
}

function sourceCards(slate) {
  return [...(slate.products || []), ...(slate.close_matches || [])];
}

function targetsFromSlate(slate) {
  return sourceCards(slate).map((card) => ({
    key: `rank-${card.rank}-${card.identity.model}`,
    brand: card.identity.brand,
    productName: card.identity.product_name,
    model: card.identity.model,
    category: "vacuum cleaner",
  }));
}

function requestBody(target) {
  return {
    gl: "us",
    hl: "en",
    num: RESULTS_PER_SEARCH,
    q: commerceVerificationQuery(target),
  };
}

function stringValue(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizedShoppingResult(result, index) {
  const candidateUrls = [result.productLink, result.product_link, result.link]
    .filter((value) => typeof value === "string")
    .slice(0, 3);
  return {
    position: numberValue(result.position) ?? index + 1,
    title: stringValue(result.title).slice(0, 300),
    source: stringValue(result.source).slice(0, 160),
    price: stringValue(result.price).slice(0, 80),
    extractedPrice:
      numberValue(result.extractedPrice) ?? numberValue(result.extracted_price),
    candidateUrls,
    imageUrl: stringValue(
      result.imageUrl || result.image || result.thumbnailUrl || result.thumbnail,
    ).slice(0, 1000),
    rating: numberValue(result.rating),
    reviewCount:
      numberValue(result.ratingCount) ??
      numberValue(result.rating_count) ??
      numberValue(result.reviews),
  };
}

async function oneShoppingRequest(apiKey, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();
  let status = null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    status = response.status;
    if (!response.ok) throw new Error("provider_http_error");
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || payload.error) {
      throw new Error("provider_payload_error");
    }
    const shopping = Array.isArray(payload.shopping) ? payload.shopping : [];
    return {
      ok: true,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
      shopping,
    };
  } catch (error) {
    return {
      ok: false,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "request_timeout"
          : error instanceof Error &&
              ["provider_http_error", "provider_payload_error"].includes(error.message)
            ? error.message
            : "request_failed",
      shopping: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

const inputText = readFileSync(INPUT_PATH, "utf8");
const fixture = JSON.parse(inputText);
const slate = fixture.research?.slate;
if (!slate) throw new Error("accepted fixture has no research.slate");
const targets = targetsFromSlate(slate);
if (targets.length !== EXPECTED_SEARCHES) {
  throw new Error(`expected ${EXPECTED_SEARCHES} frozen targets; got ${targets.length}`);
}

const plan = {
  mode: EXECUTE ? "execute" : "dry-run",
  version: "oai-h2b-commerce-oracle-run-v1",
  verifierVersion: AUTONOMOUS_COMMERCE_VERIFIER_VERSION,
  inputPath: INPUT_PATH,
  inputSha256: sha256(inputText),
  outputPath: OUTPUT_PATH,
  endpoint: ENDPOINT,
  bounds: {
    logicalSearches: EXPECTED_SEARCHES,
    physicalAttempts: EXPECTED_SEARCHES,
    retries: 0,
    fallbacks: 0,
    replacements: 0,
    resultsPerSearch: RESULTS_PER_SEARCH,
    timeoutMs: TIMEOUT_MS,
  },
  targets: targets.map((target) => ({
    ...target,
    requestBody: requestBody(target),
  })),
};

if (!EXECUTE) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (APPROVED_SEARCHES !== EXPECTED_SEARCHES) {
  throw new Error(
    `live H2B requires --approved-searches=${EXPECTED_SEARCHES}; received ${APPROVED_SEARCHES}`,
  );
}
if (existsSync(OUTPUT_PATH)) {
  throw new Error(`refusing to repeat H2B: evidence already exists at ${OUTPUT_PATH}`);
}
const apiKey = loadSerperKey();
if (!apiKey) throw new Error("SERPER_API_KEY is unavailable");

const evidence = {
  ...plan,
  mode: "execute",
  status: "running",
  repositoryCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  startedAt: new Date().toISOString(),
  completedAt: null,
  physicalAttempts: 0,
  records: [],
  summary: null,
};
atomicWriteJson(OUTPUT_PATH, evidence);

for (const target of targets) {
  if (evidence.physicalAttempts >= EXPECTED_SEARCHES) {
    throw new Error("H2B physical-attempt ceiling reached");
  }
  evidence.physicalAttempts += 1;
  const body = requestBody(target);
  const provider = await oneShoppingRequest(apiKey, body);
  const verification = verifyCommerceShoppingResults({
    target,
    results: provider.shopping,
  });
  evidence.records.push({
    target,
    request: {
      endpoint: ENDPOINT,
      body,
      attempt: evidence.physicalAttempts,
    },
    provider: provider.ok
      ? {
          ok: true,
          status: provider.status,
          durationMs: provider.durationMs,
          rawShoppingResultCount: provider.shopping.length,
        }
      : {
          ok: false,
          status: provider.status,
          durationMs: provider.durationMs,
          reason: provider.reason,
          rawShoppingResultCount: 0,
        },
    sanitizedShoppingResults: provider.shopping.map(sanitizedShoppingResult),
    verification,
  });
  evidence.summary = {
    completedSearches: evidence.records.length,
    verifiedOffers: evidence.records.filter(
      (record) => record.verification.disposition === "verified",
    ).length,
    requiredVerifiedOffers: 3,
    finalVerdict: "pending_frozen_human_audit_comparison",
  };
  atomicWriteJson(OUTPUT_PATH, evidence);
  console.log(
    `${target.key}: ${provider.ok ? verification.disposition : provider.reason}`,
  );
}

evidence.status = "complete";
evidence.completedAt = new Date().toISOString();
evidence.summary = {
  completedSearches: evidence.records.length,
  verifiedOffers: evidence.records.filter(
    (record) => record.verification.disposition === "verified",
  ).length,
  requiredVerifiedOffers: 3,
  mechanicalCoveragePass:
    evidence.records.filter(
      (record) => record.verification.disposition === "verified",
    ).length >= 3,
  zeroFalseVerified: "requires_frozen_human_audit_comparison",
  finalVerdict: "pending_frozen_human_audit_comparison",
};
atomicWriteJson(OUTPUT_PATH, evidence);
console.log(JSON.stringify(evidence.summary, null, 2));

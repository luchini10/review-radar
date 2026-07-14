// Save a live debug payload as a replayable fixture in tests/fixtures/review-radar-live/.
// Calls the recommendations API once with the debug header — no Serper calls saved beyond
// what the API itself makes. After saving, replay for free with:
//   node scripts/replay-quality-fixtures.mjs tests/fixtures/review-radar-live/<slug>.json
//
// Usage:
//   node scripts/save-debug-fixture.mjs "best robot vacuum"
//   node scripts/save-debug-fixture.mjs "best robot vacuum" --gold "Roborock S8 Pro Ultra" --gold "iRobot Roomba j7+"

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";

import {
  readinessRequestForShape,
  readinessSampleExclusionReasons,
} from "./readiness-sample-contract.mjs";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const FIXTURE_DIR = "tests/fixtures/review-radar-live";
const TIMEOUT_MS = 270000;

const args = process.argv.slice(2);
let query = "";
let budget;
let priorities;
let requestedOutput;
let c4Shape;
let validationPhase;
let dryRun = false;
const goldLeaders = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--gold") {
    if (args[i + 1]) goldLeaders.push(args[++i]);
  } else if (args[i] === "--budget") {
    if (args[i + 1]) budget = args[++i];
  } else if (args[i] === "--priorities") {
    if (args[i + 1]) priorities = args[++i];
  } else if (args[i] === "--out") {
    if (args[i + 1]) requestedOutput = args[++i];
  } else if (args[i] === "--c4-shape") {
    if (args[i + 1]) c4Shape = args[++i];
  } else if (args[i] === "--validation-phase") {
    if (args[i + 1]) validationPhase = args[++i];
  } else if (args[i] === "--dry-run") {
    dryRun = true;
  } else if (!args[i].startsWith("--")) {
    query = args[i];
  }
}

if (!query && !c4Shape) {
  console.error("Usage: node scripts/save-debug-fixture.mjs <query> [--budget <budget>] [--priorities <details>] [--gold <leader>...] [--out <filename>] [--c4-shape broad|constrained] [--validation-phase c4|c5] [--dry-run]");
  process.exit(1);
}

if (c4Shape && !["broad", "constrained"].includes(c4Shape)) {
  console.error("--c4-shape must be broad or constrained");
  process.exit(1);
}
if (c4Shape && (query || budget || priorities)) {
  console.error("--c4-shape supplies the frozen request; do not also pass query, budget, or priorities");
  process.exit(1);
}
if (c4Shape && !requestedOutput) {
  console.error("--c4-shape requires an explicit --out filename");
  process.exit(1);
}
if (validationPhase && !c4Shape) {
  console.error("--validation-phase requires --c4-shape");
  process.exit(1);
}
validationPhase ||= c4Shape ? "c4" : undefined;
if (validationPhase && !["c4", "c5"].includes(validationPhase)) {
  console.error("--validation-phase must be c4 or c5");
  process.exit(1);
}

const request = c4Shape
  ? readinessRequestForShape(c4Shape)
  : {
        query,
        ...(budget ? { budget } : {}),
        ...(priorities ? { priorities } : {}),
      };
query = request.query;

if (dryRun) {
  console.log(JSON.stringify({
    dryRun: true,
    request,
    shape: c4Shape || null,
    validationPhase: validationPhase || null,
    expectedFlagContract: validationPhase === "c5"
      ? {
          REVIEW_RADAR_CONSTRAINT_ALLOCATION: "on",
          REVIEW_RADAR_MAX_SERPER_ATTEMPTS: "120",
          REVIEW_RADAR_NORMALIZATION_RECOVERY: "off_or_unset",
          REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION: "on",
          REVIEW_RADAR_PINNED_PLANNING: "off_or_unset",
        }
      : validationPhase === "c4"
        ? {
            REVIEW_RADAR_CONSTRAINT_ALLOCATION: "on",
            REVIEW_RADAR_MAX_SERPER_ATTEMPTS: "120",
            REVIEW_RADAR_NORMALIZATION_RECOVERY: "on",
            REVIEW_RADAR_PINNED_PLANNING: "off_or_unset",
          }
        : null,
  }, null, 2));
  process.exit(0);
}

const slug = query
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60);
mkdirSync(FIXTURE_DIR, { recursive: true });
if (requestedOutput && basename(requestedOutput) !== requestedOutput) {
  console.error("--out must be a filename within the live-fixture directory");
  process.exit(1);
}
const outPath = join(FIXTURE_DIR, requestedOutput || `${slug}.json`);
if (existsSync(outPath)) {
  console.error(`Refusing to overwrite existing fixture: ${outPath}`);
  process.exit(1);
}

console.log(`[live] Running query: "${query}"\n`);

const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
const requestStartedAt = performance.now();
let rawResponse;
try {
  rawResponse = await fetch(`${BASE}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-reviewradar-debug": "true" },
    body: JSON.stringify(request),
    signal: ctrl.signal,
  });
} finally {
  clearTimeout(t);
}

const json = await rawResponse.json();
const captureDurationMs = Math.round((performance.now() - requestStartedAt) * 1000) / 1000;
if (json.error) {
  console.error("API error:", json.error);
  process.exit(1);
}

let exclusionReasons = [];
if (c4Shape) {
  const ledger = json.debug?.stageFunnel?.searchLedger;
  exclusionReasons = readinessSampleExclusionReasons({
    ledger,
    phase: validationPhase,
    request,
    shape: c4Shape,
  });
}

const fixture = {
  _query: query,
  _request: request,
  _savedAt: new Date().toISOString(),
  _captureDurationMs: captureDurationMs,
  _version: "1",
  _goldLeaders: goldLeaders,
  ...(c4Shape
    ? {
        _c4Shape: c4Shape,
        _validationPhase: validationPhase,
        _sampleStatus: exclusionReasons.length === 0 ? "usable" : "spent_excluded",
        _exclusionReasons: exclusionReasons,
      }
    : {}),
  ...json,
};

writeFileSync(outPath, JSON.stringify(fixture, null, 2));

console.log(`Saved fixture → ${outPath}`);
if (exclusionReasons.length > 0) {
  console.error(`${validationPhase?.toUpperCase()} request spent but excluded: ${exclusionReasons.join(", ")}`);
  process.exitCode = 2;
}
if (goldLeaders.length === 0 && !c4Shape) {
  console.log(`\nTip: add expected leaders with --gold "Brand Model" flags so the replay`);
  console.log(`     script can report which ones were lost and where they dropped.`);
}
console.log(`\nReplay (zero cost):`);
console.log(`  node scripts/replay-quality-fixtures.mjs ${outPath}`);

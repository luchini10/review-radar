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

const BASE = process.env.RR_BASE || "http://localhost:3000";
const FIXTURE_DIR = "tests/fixtures/review-radar-live";
const TIMEOUT_MS = 270000;

const args = process.argv.slice(2);
let query = "";
let budget;
let priorities;
let requestedOutput;
let c4Shape;
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
  } else if (!args[i].startsWith("--")) {
    query = args[i];
  }
}

if (!query && !c4Shape) {
  console.error("Usage: node scripts/save-debug-fixture.mjs <query> [--budget <budget>] [--priorities <details>] [--gold <leader>...] [--out <filename>] [--c4-shape broad|constrained]");
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

const request = c4Shape === "broad"
  ? { query: "shop vac" }
  : c4Shape === "constrained"
    ? {
        query: "robot vacuum",
        budget: "under $300",
        priorities: "self-emptying",
      }
    : {
        query,
        ...(budget ? { budget } : {}),
        ...(priorities ? { priorities } : {}),
      };
query = request.query;

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
if (json.error) {
  console.error("API error:", json.error);
  process.exit(1);
}

const c4ExclusionReasons = [];
if (c4Shape) {
  const ledger = json.debug?.stageFunnel?.searchLedger;
  const flags = ledger?.header?.flags || {};
  const reconciliation = ledger?.dispatch?.reconciliation;
  const attemptGuard = ledger?.dispatch?.attemptGuard;

  if (!ledger) c4ExclusionReasons.push("missing_debug_ledger");
  if (ledger?.header?.serperCacheEmptyAtStart !== true) {
    c4ExclusionReasons.push("warm_serper_cache");
  }
  if (!ledger?.header?.commitHash) c4ExclusionReasons.push("missing_commit_hash");
  if (flags.REVIEW_RADAR_NORMALIZATION_RECOVERY !== "on") {
    c4ExclusionReasons.push("normalization_recovery_not_on");
  }
  if (flags.REVIEW_RADAR_CONSTRAINT_ALLOCATION !== "on") {
    c4ExclusionReasons.push("constraint_allocation_not_on");
  }
  if (!["unset", "off"].includes(flags.REVIEW_RADAR_PINNED_PLANNING)) {
    c4ExclusionReasons.push("pinned_planning_not_off");
  }
  if (flags.REVIEW_RADAR_MAX_SERPER_ATTEMPTS !== "120") {
    c4ExclusionReasons.push("attempt_ceiling_not_120");
  }
  if (!reconciliation?.balanced) c4ExclusionReasons.push("ledger_unbalanced");
  if (attemptGuard?.tripped) c4ExclusionReasons.push("attempt_ceiling_tripped");
  if ((reconciliation?.physicalAttempts || 0) > 120) {
    c4ExclusionReasons.push("physical_attempts_over_120");
  }
}

const fixture = {
  _query: query,
  _request: request,
  _savedAt: new Date().toISOString(),
  _version: "1",
  _goldLeaders: goldLeaders,
  ...(c4Shape
    ? {
        _c4Shape: c4Shape,
        _sampleStatus: c4ExclusionReasons.length === 0 ? "usable" : "spent_excluded",
        _exclusionReasons: c4ExclusionReasons,
      }
    : {}),
  ...json,
};

writeFileSync(outPath, JSON.stringify(fixture, null, 2));

console.log(`Saved fixture → ${outPath}`);
if (c4ExclusionReasons.length > 0) {
  console.error(`C4 request spent but excluded: ${c4ExclusionReasons.join(", ")}`);
  process.exitCode = 2;
}
if (goldLeaders.length === 0 && !c4Shape) {
  console.log(`\nTip: add expected leaders with --gold "Brand Model" flags so the replay`);
  console.log(`     script can report which ones were lost and where they dropped.`);
}
console.log(`\nReplay (zero cost):`);
console.log(`  node scripts/replay-quality-fixtures.mjs ${outPath}`);

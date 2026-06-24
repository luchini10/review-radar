// Save a live debug payload as a replayable fixture in tests/fixtures/review-radar-live/.
// Calls the recommendations API once with the debug header — no Serper calls saved beyond
// what the API itself makes. After saving, replay for free with:
//   node scripts/replay-quality-fixtures.mjs tests/fixtures/review-radar-live/<slug>.json
//
// Usage:
//   node scripts/save-debug-fixture.mjs "best robot vacuum"
//   node scripts/save-debug-fixture.mjs "best robot vacuum" --gold "Roborock S8 Pro Ultra" --gold "iRobot Roomba j7+"

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const FIXTURE_DIR = "tests/fixtures/review-radar-live";
const TIMEOUT_MS = 270000;

const args = process.argv.slice(2);
let query = "";
const goldLeaders = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--gold") {
    if (args[i + 1]) goldLeaders.push(args[++i]);
  } else if (!args[i].startsWith("--")) {
    query = args[i];
  }
}

if (!query) {
  console.error("Usage: node scripts/save-debug-fixture.mjs <query> [--gold <leader>...]");
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
    body: JSON.stringify({ query }),
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

const slug = query
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60);

const fixture = {
  _query: query,
  _savedAt: new Date().toISOString(),
  _version: "1",
  _goldLeaders: goldLeaders,
  ...json,
};

mkdirSync(FIXTURE_DIR, { recursive: true });
const outPath = join(FIXTURE_DIR, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(fixture, null, 2));

console.log(`Saved fixture → ${outPath}`);
if (goldLeaders.length === 0) {
  console.log(`\nTip: add expected leaders with --gold "Brand Model" flags so the replay`);
  console.log(`     script can report which ones were lost and where they dropped.`);
}
console.log(`\nReplay (zero cost):`);
console.log(`  node scripts/replay-quality-fixtures.mjs ${outPath}`);

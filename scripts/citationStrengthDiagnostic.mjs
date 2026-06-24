// Citation-strength diagnostic: per-candidate citation type report for a single query.
//
// Runs ONE API call and saves the payload. On subsequent runs load the payload
// from file instead — zero Serper cost. Compares citation strength across candidates
// in the pool and flags when a self-cited-only product is winning over candidates
// with more independent support.
//
// Usage:
//   node scripts/citationStrengthDiagnostic.mjs "best robot vacuum"
//   node scripts/citationStrengthDiagnostic.mjs --replay .rr_cit_payload.json
//   node scripts/citationStrengthDiagnostic.mjs --replay .rr_cit_payload.json "override query label"

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const TIMEOUT_MS = 270000;
const PAYLOAD_FILE = ".rr_cit_payload.json";

const args = process.argv.slice(2);
let replay = false;
let replayFile = PAYLOAD_FILE;
let query = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--replay") {
    replay = true;
    if (args[i + 1] && !args[i + 1].startsWith("--")) {
      replayFile = args[++i];
    }
  } else {
    query = args[i];
  }
}

// ── Fetch or load ──────────────────────────────────────────────────────────────
let payload;
if (replay) {
  if (!existsSync(replayFile)) {
    console.error(`No saved payload at ${replayFile}. Run without --replay first.`);
    process.exit(1);
  }
  payload = JSON.parse(readFileSync(replayFile, "utf8"));
  console.log(`[replay] Loaded ${replayFile} (query: "${payload._query}")\n`);
  if (!query) query = payload._query;
} else {
  if (!query) {
    console.error("Usage: node citationStrengthDiagnostic.mjs <query>\n       node citationStrengthDiagnostic.mjs --replay [file]");
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
  } finally { clearTimeout(t); }

  const json = await rawResponse.json();
  if (json.error) { console.error("API error:", json.error); process.exit(1); }
  payload = { _query: query, ...json };
  writeFileSync(PAYLOAD_FILE, JSON.stringify(payload, null, 2));
  console.log(`Saved payload → ${PAYLOAD_FILE} (replay with --replay)\n`);
}

// ── Parse ──────────────────────────────────────────────────────────────────────
const result = payload.result || payload;
const debug = payload.debug || {};
const finalExact = result.exactMatches || [];
const finalNear = result.nearMatches || [];
const stageFunnel = debug.stageFunnel || null;
const poolSnapshots = stageFunnel?.poolCandidates || [];

const norm = (s) => ` ${(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const priceVerified = (p) => /\d/.test(p.estimated_price_range || "") && !/not verified|not found/i.test(p.estimated_price_range || "");

function citTypeSummary(citations) {
  const types = (citations || []).map(c => c.citation_type || "weak-uncorroborated");
  const counts = { "product-page-self": 0, "independent-editorial": 0, "retailer-marketplace": 0, "weak-uncorroborated": 0 };
  for (const t of types) counts[t] = (counts[t] || 0) + 1;
  const parts = [];
  if (counts["independent-editorial"]) parts.push(`${counts["independent-editorial"]} editorial`);
  if (counts["retailer-marketplace"]) parts.push(`${counts["retailer-marketplace"]} retailer`);
  if (counts["product-page-self"]) parts.push(`${counts["product-page-self"]} self`);
  if (counts["weak-uncorroborated"]) parts.push(`${counts["weak-uncorroborated"]} weak`);
  return parts.length ? parts.join(" + ") : "(none)";
}

function citStrength(citations) {
  const types = (citations || []).map(c => c.citation_type || "weak-uncorroborated");
  if (types.some(t => t === "independent-editorial")) return "INDEPENDENT";
  if (types.length > 0 && types.every(t => t === "product-page-self")) return "SELF-ONLY";
  if (types.some(t => t === "retailer-marketplace")) return "RETAILER";
  if (types.length === 0) return "NONE";
  return "WEAK";
}


// ── Report: Final 7 ────────────────────────────────────────────────────────────
console.log(`=== FINAL EXACT MATCHES (${finalExact.length}) — "${query}" ===\n`);
console.log(`${"#".padEnd(3)} ${"Product".padEnd(38)} ${"CitStrength".padEnd(12)} ${"Citations".padEnd(38)} ${"Price?".padEnd(9)}`);
console.log("─".repeat(103));
finalExact.forEach((p, i) => {
  const strength = citStrength(p.citations);
  const detail = citTypeSummary(p.citations);
  const priceOk = priceVerified(p) ? "yes" : "NO";
  console.log(`${String(i + 1).padEnd(3)} ${(p.name || "").slice(0, 37).padEnd(38)} ${strength.padEnd(12)} ${detail.padEnd(38)} ${priceOk}`);
});

// ── Winner analysis ────────────────────────────────────────────────────────────
const winner = finalExact[0];
if (winner) {
  const wStrength = citStrength(winner.citations);
  const wSelfOnly = wStrength === "SELF-ONLY";
  console.log(`\n=== WINNER ANALYSIS ===`);
  console.log(`  Winner:       ${winner.name}`);
  console.log(`  Cit strength: ${wStrength} — ${citTypeSummary(winner.citations)}`);
  console.log(`  Price:        ${priceVerified(winner) ? "verified" : "UNVERIFIED"}`);
  console.log(`  Consensus:    ${winner.source_consensus || "(none)"}`);
  if (wSelfOnly) {
    console.log(`\n  ⚠  THIN WINNER: #1 is self-cited-only (product-page-self). Has real product URL,`);
    console.log(`     but no independent editorial or marketplace citation to corroborate it.`);
    // Find runner-up with stronger independent support
    const betterSupported = finalExact.slice(1).filter(p => citStrength(p.citations) === "INDEPENDENT");
    if (betterSupported.length > 0) {
      console.log(`\n  Candidates with INDEPENDENT support that ranked below the self-cited winner:`);
      for (const p of betterSupported) {
        console.log(`     → ${p.name} — ${citTypeSummary(p.citations)}`);
      }
      console.log(`\n  This is the crowding-out pattern to watch. Next step: check score breakdown to`);
      console.log(`  see whether the self-cited winner's other signals (reviews, metadata, popularity)`);
      console.log(`  legitimately outscored these, or whether the rescue inflated its rank.`);
    } else {
      console.log(`\n  No candidates with independent editorial support in final 7 — not a crowding-out case.`);
    }
  } else {
    console.log(`\n  Winner has ${wStrength} citation support. Not a thin-winner pattern.`);
  }
}

// ── Pool snapshot (if available) ───────────────────────────────────────────────
if (poolSnapshots.length > 0) {
  console.log(`\n=== CANDIDATE POOL CITATION SNAPSHOT (${poolSnapshots.length} candidates) ===\n`);
  console.log(`(Only candidates whose citation data is available in the debug payload)`);
  const postVerify = stageFunnel?.postVerifyCandidates || [];
  console.log(`${"Product".padEnd(38)} ${"survived?".padEnd(11)} ${"cites".padEnd(7)} ${"tier".padEnd(6)}`);
  console.log("─".repeat(64));

  // For pool candidates we only have tier/evidenceCount (no citation_type).
  // Show which survived to final and their tier.
  const finalNames = new Set([...finalExact, ...finalNear].map(p => norm(p.name || "").trim()));
  const survived = (c) => finalNames.has(norm(c.name).trim()) ||
    [...finalNames].some(fn => fn.includes(norm(c.name).trim()) || norm(c.name).includes(fn));

  for (const c of poolSnapshots.slice(0, 30)) {
    const inPostVerify = postVerify.some(pv => norm(pv.name).trim() === norm(c.name).trim());
    const fate = survived(c) ? "FINAL" : (inPostVerify ? "dropped-later" : "dropped-verify");
    console.log(`${(c.name || "").slice(0, 37).padEnd(38)} ${fate.padEnd(11)} ${String(c.evidenceCount).padEnd(7)} tier${c.sourceTier}`);
  }
  if (poolSnapshots.length > 30) console.log(`  ... and ${poolSnapshots.length - 30} more`);
}

// ── Near matches ───────────────────────────────────────────────────────────────
if (finalNear.length > 0) {
  console.log(`\n=== NEAR MATCHES (${finalNear.length}) ===\n`);
  for (const p of finalNear) {
    console.log(`  ${p.name} — ${citTypeSummary(p.citations)} — ${p.near_match_reason || ""}`);
  }
}

console.log("\n─── Legend ───────────────────────────────────────────────────────────────────");
console.log("  INDEPENDENT : at least one Tier-1 editorial/expert review citation");
console.log("  RETAILER    : at least one Tier-2 marketplace citation (no editorial)");
console.log("  SELF-ONLY   : only product-page-self citation(s) — rescued from citation verify");
console.log("  WEAK        : Tier 3/4 only (manufacturer, community, unknown)");
console.log("  NONE        : zero citations (should not appear after citation filter)");
console.log("\n  thin#1 = SELF-ONLY winner with verified price and ok consensus");
console.log("  weak#1 = missing price, zero citations, wrong type, or weak consensus");

// TWO-SCORECARD QUALITY HARNESS (Phase 0) — measurement only, never touches the pipeline.
//
// Grades the live pipeline against scripts/goldBenchmark.mjs on two separate skills:
//   BROAD      -> surfaces the recognized CORE LEADERS (main coverage metric);
//                 alternates are fine but don't substitute; wrong-types are penalized.
//   CONSTRAINT -> satisfies the hard requirements (budget/feature) with confident
//                 price; judged on violations + EMPTY results, NOT brand leadership.
//
// Guardrails:
//   - Empty constraint results are an explicit FAILURE (EMPTY flag), never a silent
//     "0 violations" pass.
//   - Records per query: type, poolCore, final7Core, alternates, wrong-type leak,
//     wrong-type winner, weak#1, price confidence, exact count, elapsed, serper calls.
//   - Writes a machine record (.rr_baseline.json) + a markdown block (.rr_baseline.md)
//     for the QA log.
//
// Usage (test modes — see docs/review-radar-test-memory.md "Test Modes"):
//   node scripts/qualityScorecard.mjs --mode diagnostic            # 5-query smoke, runs freely
//   node scripts/qualityScorecard.mjs --mode normal --confirm      # full 14×2 baseline (approval-gated)
//   node scripts/qualityScorecard.mjs --mode high --confirm        # full 14×5 high-confidence baseline
//   node scripts/qualityScorecard.mjs --mode stress --filter shop-vac --confirm   # 1 query × 8 runs
//   node scripts/qualityScorecard.mjs --mode normal --dry-run      # PRINT cost plan only, no calls
//   RR_RUNS=1 RR_FILTER=robot node scripts/qualityScorecard.mjs    # legacy env-driven subset
//
// COST GUARD: any run whose estimated Serper calls exceed GUARD_SERPER refuses to
// execute unless --confirm is passed. --dry-run prints the cost plan and exits for
// ANY mode. This makes "don't run an expensive baseline by accident" a code rule,
// not just a doc convention.

import { writeFileSync } from "node:fs";
import { GOLD } from "./goldBenchmark.mjs";

// ── CLI flags (cross-platform; npm passes args after `--`) ───────────────────
const ARGV = process.argv.slice(2);
const hasFlag = (name) => ARGV.includes(name);
const flagVal = (name) => {
  const i = ARGV.indexOf(name);
  return i >= 0 && ARGV[i + 1] && !ARGV[i + 1].startsWith("--") ? ARGV[i + 1] : null;
};

const BASE = process.env.RR_BASE || "http://localhost:3000";
const FILTER = (flagVal("--filter") || process.env.RR_FILTER || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const TYPE = flagVal("--type") || process.env.RR_TYPE || "";
const MODE = (flagVal("--mode") || process.env.RR_MODE || "").toLowerCase();
const DRY_RUN = hasFlag("--dry-run") || process.env.RR_DRYRUN === "1";
const CONFIRM = hasFlag("--confirm") || process.env.RR_CONFIRM === "1";
const TIMEOUT_MS = 260000;

// ── Cost model (estimates only, derived from the LAST real baseline) ─────────
// Last measured: 1325 Serper calls / 28 searches ≈ 47/search; ~30 min / 28 ≈ 75s/search.
// These are rough — actual cost varies with discovery depth, rescue, and seeding.
const SERPER_PER_SEARCH = 47;
const SECONDS_PER_SEARCH = 75;
const GUARD_SERPER = 600; // ≈ 13 searches; full-set baselines exceed this, diagnostics don't

// ── Test-mode presets (runs/query + query subset + rationale) ────────────────
// Subset IDs reference the gold benchmark (test data — allowed to name products).
const DIAGNOSTIC_IDS = [
  "broad-robot-vacuum",        // known citation-verify wipeout
  "broad-shop-vac",            // known filter drop (ridgid/craftsman)
  "broad-gas-grill",           // known discovery miss
  "con-gas-grill-600-4burner", // constraint filter drop
  "con-robot-vac-300-selfempty", // constraint + self-empty feature
];
const MODES = {
  diagnostic: { runs: 2, ids: DIAGNOSTIC_IDS, question: "Did a SPECIFIC suspected issue change at a known drop point? (smoke, not proof)" },
  normal:     { runs: 2, ids: null,           question: "Broad before/after smoke across all 14 queries. Too noisy alone to prove small gains." },
  high:       { runs: 5, ids: null,           question: "Is a change LARGER than run-to-run variance? (5 runs → mean/range/stability)" },
  stress:     { runs: 8, ids: null,           question: "Why does ONE query swing so much? (single query × many runs — requires --filter)" },
};
const RUNS = MODE && MODES[MODE] ? MODES[MODE].runs : Number(process.env.RR_RUNS || 2);

const norm = (s) => ` ${(s || "").toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim()} `;
const priceNum = (s) => { const m = (s || "").replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
const priceVerified = (p) => /\d/.test(p.estimated_price_range || "") && !/not verified|not found/i.test(p.estimated_price_range || "");

function covers(name, item) {
  const hay = norm(name);
  const brandTokens = norm(item.brand).trim().split(" ");
  if (!brandTokens.every((t) => hay.includes(` ${t} `))) return false;
  if (!item.lines || item.lines.length === 0) return true;
  return item.lines.some((l) => hay.includes(norm(l).trimEnd()));
}
const countCovered = (names, list) => (list || []).filter((item) => names.some((n) => covers(n, item))).length;
const nameHitsWrongType = (name, terms) => (terms || []).some((w) => norm(name).includes(norm(w).trim()));

async function once(g) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const body = { query: g.query };
    if (g.budget) body.budget = g.budget;
    if (g.priorities) body.priorities = g.priorities;
    const res = await fetch(`${BASE}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-reviewradar-debug": "true" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const o = await res.json();
    const ms = Date.now() - started;
    const d = o.debug || {};
    const serperCalls = (d.serperShoppingCalls || 0) + (d.serperOrganicCalls || 0) + (d.serperRetailerDomainCalls || 0) + (d.serperDirectRetailerCalls || 0) + (d.seedSearchesRun || 0);
    if (o.error) return { ok: false, ms, serperCalls, error: o.error };
    const r = o.result || o;
    const map = (p) => {
      const cits = p.citations || [];
      const citTypes = cits.map(c => c.citation_type || "weak-uncorroborated");
      const hasIndependent = citTypes.some(t => t === "independent-editorial");
      const selfCitedOnly = cits.length > 0 && citTypes.every(t => t === "product-page-self");
      return {
        name: p.name || "",
        text: norm([p.name, p.why_recommended, (p.pros || []).join(" "), (p.cons || []).join(" ")].join(" ")),
        priceNum: priceNum(p.estimated_price_range),
        verified: priceVerified(p),
        citations: cits.length,
        citTypes,
        hasIndependent,
        selfCitedOnly,
        consensus: (p.source_consensus || "").toLowerCase(),
      };
    };
    return { ok: true, ms, serperCalls, exact: (r.exactMatches || []).map(map), near: (r.nearMatches || []).map(map), funnel: d.stageFunnel || null };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, serperCalls: 0, error: String(e.name || e) };
  } finally { clearTimeout(t); }
}

function stability(runs) {
  const sets = runs.map((r) => new Set((r.exact || []).map((p) => norm(p.name).trim())));
  const union = new Set();
  for (const s of sets) for (const x of s) union.add(x);
  if (!union.size) return 0;
  const core = [...union].filter((x) => sets.every((s) => s.has(x)));
  return Math.round((core.length / union.size) * 100);
}

function scoreQuery(g, runs) {
  const ok = runs.filter((r) => r.ok);
  const best = (fn) => (ok.length ? Math.max(...ok.map(fn)) : 0);

  const poolCore = best((r) => countCovered([...r.exact, ...r.near].map((p) => p.name), g.coreLeaders));
  const finalCore = best((r) => countCovered(r.exact.map((p) => p.name), g.coreLeaders));
  const altPool = best((r) => countCovered([...r.exact, ...r.near].map((p) => p.name), g.acceptableAlternates));

  const wrongLeak = ok.some((r) => r.exact.some((p) => nameHitsWrongType(p.name, g.wrongTypeTerms)));
  const wrongWins = ok.some((r) => r.exact[0] && nameHitsWrongType(r.exact[0].name, g.wrongTypeTerms));
  // weakWinner: genuinely weak #1 (no price, zero citations, wrong type, weak consensus,
  //   or < 2 citations with NO product-page self-citation).
  // thinWinner: real product-page self-cite only — not strong, but not the same as uncorroborated.
  //   Only flagged here; does not count as weakWinner to avoid double-counting.
  const weakWinner = ok.some((r) => {
    const top = r.exact[0];
    if (!top) return false;
    if (nameHitsWrongType(top.name, g.wrongTypeTerms)) return true;   // wrong category
    if (!top.verified) return true;                                     // no verified price
    if (top.citations === 0) return true;                               // no citation at all
    if (top.selfCitedOnly) return /weak|limited/.test(top.consensus);  // self-cited: only weak if consensus also weak
    return top.citations < 2 || /weak|limited/.test(top.consensus);
  });
  const thinWinner = ok.some((r) => {
    const top = r.exact[0];
    if (!top) return false;
    // Thin = self-cited only, but otherwise ok (price verified, consensus not weak).
    return top.selfCitedOnly && top.verified && !/weak|limited/.test(top.consensus);
  });

  const exactCounts = runs.map((r) => (r.exact || []).length);
  const emptyRuns = ok.filter((r) => r.exact.length === 0).length;
  const emptyResult = ok.length > 0 && emptyRuns === ok.length; // every successful run returned nothing
  const allExact = ok.flatMap((r) => r.exact);
  const priceOk = allExact.length ? Math.round((allExact.filter((p) => p.verified).length / allExact.length) * 100) : 0;
  const avgMs = runs.length ? Math.round(runs.reduce((a, r) => a + r.ms, 0) / runs.length) : 0;
  const serperCalls = runs.reduce((a, r) => a + (r.serperCalls || 0), 0);

  let budgetViol = 0, featUnconfirmed = 0;
  if (g.type === "constraint" && !emptyResult) {
    for (const r of ok) for (const p of r.exact) for (const c of g.constraints || []) {
      if (c.kind === "budget" && p.priceNum !== null && p.priceNum > c.max) budgetViol++;
      if (c.kind === "feature" && !c.any.some((k) => p.text.includes(norm(k).trim()))) featUnconfirmed++;
    }
  }
  return {
    id: g.id, type: g.type, query: g.query,
    coreTotal: (g.coreLeaders || []).length, altTotal: (g.acceptableAlternates || []).length,
    poolCore, finalCore, altPool, wrongLeak, wrongWins, weakWinner, thinWinner, exactCounts, emptyRuns, emptyResult,
    priceOk, stab: stability(ok), budgetViol, featUnconfirmed, avgMs, serperCalls, errors: runs.length - ok.length,
  };
}

// Build the active query set: a mode's `ids` define the subset, but an explicit
// --filter/--type still narrows further (so `--mode stress --filter shop-vac` works).
const modeIds = MODE && MODES[MODE] ? MODES[MODE].ids : null;
const set = GOLD.filter((g) => {
  if (TYPE && g.type !== TYPE) return false;
  if (modeIds && !modeIds.includes(g.id)) return false;
  if (FILTER.length && !FILTER.some((f) => g.id.includes(f))) return false;
  return true;
});

// ── Cost plan + guard (printed for every invocation) ─────────────────────────
const searches = set.length * RUNS;
const estSerper = searches * SERPER_PER_SEARCH;
const estSeconds = searches * SECONDS_PER_SEARCH;
const fmtMin = (s) => `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
const modeLabel = MODE && MODES[MODE] ? MODE : (FILTER.length || TYPE ? "custom-subset" : "custom-full");
const question = MODE && MODES[MODE] ? MODES[MODE].question : "Custom run (no preset). State the question this answers before approving.";

console.log("\n=== ReviewRadar scorecard — COST PLAN ===");
console.log(`  mode:            ${modeLabel}${DRY_RUN ? " (DRY RUN)" : ""}`);
console.log(`  queries:         ${set.length}  [${set.map((g) => g.id).join(", ") || "(none — check --filter/--type)"}]`);
console.log(`  runs/query:      ${RUNS}`);
console.log(`  total searches:  ${searches}`);
console.log(`  est Serper calls:~${Math.round(estSerper * 0.8)}–${Math.round(estSerper * 1.2)}  (≈${SERPER_PER_SEARCH}/search, from last baseline)`);
console.log(`  est runtime:     ~${fmtMin(Math.round(estSeconds * 0.8))}–${fmtMin(Math.round(estSeconds * 1.2))}  (≈${SECONDS_PER_SEARCH}s/search)`);
console.log(`  answers:         ${question}`);
console.log(`  reports:         poolCore, final7Core, alt, wrong-type, weak#1/thin#1, price, stability, budget/feature viol`);
if (MODE === "stress" && !FILTER.length) {
  console.log("\n  ✖ stress mode needs --filter <id> to target a SINGLE query. Aborting.");
  process.exit(1);
}
if (!set.length) {
  console.log("\n  ✖ no queries matched. Aborting.");
  process.exit(1);
}
if (DRY_RUN) {
  console.log("\n  DRY RUN — no live calls made. Re-run without --dry-run to execute.\n");
  process.exit(0);
}
if (estSerper > GUARD_SERPER && !CONFIRM) {
  console.log(`\n  ⛔ COST GUARD: this run is estimated at ~${estSerper} Serper calls (> ${GUARD_SERPER}).`);
  console.log("     This is an expensive live baseline. Get explicit approval, then re-run with --confirm.");
  console.log("     (Or use --mode diagnostic for a cheap 5-query smoke, or --dry-run to preview cost.)\n");
  process.exit(0);
}
console.log(`\n  proceeding with live run${CONFIRM ? " (--confirm)" : ""}...\n`);

const results = [];
const funnelData = [];
for (const g of set) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await once(g);
    runs.push(r);
    process.stderr.write(`  [${g.id}] run ${i + 1}/${RUNS}: ${r.ok ? `exact=${r.exact.length} ${r.ms}ms` : "ERR " + r.error}\n`);
  }
  results.push(scoreQuery(g, runs));
  funnelData.push({ g, funnel: runs.find((r) => r.ok && r.funnel)?.funnel || null });
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const wt = (r) => (r.wrongWins ? "WINS#1" : r.wrongLeak ? "leak" : "ok");
const lines = [];
const out = (s = "") => { console.log(s); lines.push(s); };

const broad = results.filter((r) => r.type === "broad");
if (broad.length) {
  out("\n## BROAD SCORECARD  (goal: surface the CORE LEADERS)\n");
  out("| query | poolCore | final7Core | alt | stab | wrong-type | weak#1 | thin#1 | price | exacts | avg s |");
  out("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of broad)
    out(`| ${r.id} | ${r.poolCore}/${r.coreTotal} | ${r.finalCore}/${r.coreTotal} | ${r.altPool} | ${r.stab}% | ${wt(r)} | ${r.weakWinner ? "WEAK" : "ok"} | ${r.thinWinner ? "THIN" : "ok"} | ${r.priceOk}% | [${r.exactCounts.join(",")}] | ${(r.avgMs / 1000).toFixed(0)} |`);
  out(`\nmean poolCore ${mean(broad.map((r) => r.poolCore)).toFixed(1)}/${broad[0].coreTotal} | mean final7Core ${mean(broad.map((r) => r.finalCore)).toFixed(1)} | wrong-type leaks ${broad.filter((r) => r.wrongLeak).length}/${broad.length} (wins#1 ${broad.filter((r) => r.wrongWins).length}) | weak#1 ${broad.filter((r) => r.weakWinner).length}/${broad.length} | thin#1 ${broad.filter((r) => r.thinWinner).length}/${broad.length} (self-cited-only winner, price ok) | mean stability ${Math.round(mean(broad.map((r) => r.stab)))}% | mean price ${Math.round(mean(broad.map((r) => r.priceOk)))}%`);
  out("target: poolCore>=5, final7Core>=3, 0 wrong-type, 0 weak#1 — thin#1 is measurement only (no target yet)");
}

const con = results.filter((r) => r.type === "constraint");
if (con.length) {
  out("\n## CONSTRAINT SCORECARD  (goal: satisfy hard requirements)\n");
  out("| query | result | budgetViol | feat-unconf | price | wrong-type | weak#1 | stab | (core) | avg s |");
  out("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of con) {
    const result = r.emptyResult ? "EMPTY" : `[${r.exactCounts.join(",")}]`;
    const bv = r.emptyResult ? "-" : String(r.budgetViol);
    const fu = r.emptyResult ? "-" : String(r.featUnconfirmed);
    out(`| ${r.id} | ${result} | ${bv} | ${fu} | ${r.priceOk}% | ${wt(r)} | ${r.weakWinner ? "WEAK" : "ok"} | ${r.stab}% | ${r.poolCore}/${r.coreTotal} | ${(r.avgMs / 1000).toFixed(0)} |`);
  }
  out(`\nEMPTY results ${con.filter((r) => r.emptyResult).length}/${con.length} (FAIL) | budget violations ${con.reduce((a, r) => a + r.budgetViol, 0)} | feature-unconfirmed ${con.reduce((a, r) => a + r.featUnconfirmed, 0)} | wrong-type leaks ${con.filter((r) => r.wrongLeak).length}/${con.length}`);
  out("target: 0 EMPTY, 0 budget violations, low feature-unconfirmed, high price confidence");
}

const totalCalls = set.length * RUNS;
const totalSerper = results.reduce((a, r) => a + r.serperCalls, 0);
const totalSec = Math.round(results.reduce((a, r) => a + r.avgMs * RUNS, 0) / 1000);
out(`\ncost proxy: ${totalCalls} searches | ${totalSerper} Serper calls | ${totalSec}s wall (OpenAI token cost not exposed by the API)`);
out(`errors ${results.reduce((a, r) => a + r.errors, 0)}/${totalCalls}`);

// ---- Stage funnel: which exact stage drops each CORE LEADER? (RR_FUNNEL=1) ----
if (process.env.RR_FUNNEL) {
  const ABBR = { candidatePool: "cand", afterCitationVerify: "verify", afterRequirementFilter: "reqFilt", afterEnrichment: "enrich", afterAssets: "assets", afterRescue: "rescue", afterRevalidation: "reval", final: "final" };
  console.log("\n================ STAGE FUNNEL — core-leader attrition (count surviving each stage) ================\n");
  for (const { g, funnel } of funnelData) {
    if (!funnel || !funnel.stages) { console.log(`### ${g.id}: (no funnel — fallback path)`); continue; }
    const core = g.coreLeaders || [];
    const covers1 = (item, names) => (names || []).some((n) => covers(n, item));
    const stageCov = funnel.stages.map((s) => ({ name: ABBR[s.stage] || s.stage, n: core.filter((it) => covers1(it, s.names)).length, names: s.names }));
    console.log(`### ${g.id}  (core=${core.length})`);
    console.log("   " + stageCov.map((s) => `${s.name}=${s.n}`).join("  →  "));
    // per-leader: last stage present -> dropped after that stage
    const snap = (it) => [...(funnel.postFilterCandidates || []), ...(funnel.postVerifyCandidates || []), ...(funnel.poolCandidates || [])].find((c) => covers(c.name, it));
    for (const it of core) {
      const present = funnel.stages.map((s) => covers1(it, s.names));
      if (!present[0]) continue; // never in candidate pool = discovery miss (reported separately)
      const lastIdx = present.lastIndexOf(true);
      if (lastIdx === funnel.stages.length - 1) continue; // survived to final
      const droppedAfter = ABBR[funnel.stages[lastIdx].stage];
      const finalStage = funnel.stages[funnel.stages.length - 1];
      const shownAsNear = covers1(it, finalStage.near || []);
      const fate = shownAsNear ? "shown-as-NEAR" : "REMOVED";
      const s = snap(it);
      const detail = s ? `tier${s.sourceTier} price=${s.priceVerified ? "verified" : "unverified"}(${(s.price || "—").slice(0, 14)}) cites=${s.evidenceCount} req=${s.requirement ? `${s.requirement.passed}/${s.requirement.failed}f/${s.requirement.unknown}u` : "n/a"}` : "(no snapshot)";
      console.log(`     DROP ${it.brand.padEnd(14)} after ${String(droppedAfter).padEnd(7)} ${fate.padEnd(13)} | ${detail}`);
    }
    const neverFound = core.filter((it) => !covers1(it, funnel.stages[0].names));
    if (neverFound.length) console.log(`     never discovered: ${neverFound.map((it) => it.brand).join(", ")}`);
    console.log("");
  }
  console.log("stages: cand→verify(citations)→reqFilt(requirements)→enrich→assets→rescue→reval→final");
}

writeFileSync("./.rr_baseline.json", JSON.stringify(results, null, 2));
writeFileSync("./.rr_baseline.md", lines.join("\n"));
console.log("\nrecords -> ./.rr_baseline.json , ./.rr_baseline.md");

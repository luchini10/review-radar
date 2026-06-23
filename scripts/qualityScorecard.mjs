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
// Usage:
//   node scripts/qualityScorecard.mjs                              # all, RR_RUNS (default 2)
//   RR_RUNS=1 RR_FILTER=robot node scripts/qualityScorecard.mjs    # subset, 1 run

import { writeFileSync } from "node:fs";
import { GOLD } from "./goldBenchmark.mjs";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const RUNS = Number(process.env.RR_RUNS || 2);
const FILTER = process.env.RR_FILTER || "";
const TYPE = process.env.RR_TYPE || "";
const TIMEOUT_MS = 260000;

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
    const map = (p) => ({
      name: p.name || "",
      text: norm([p.name, p.why_recommended, (p.pros || []).join(" "), (p.cons || []).join(" ")].join(" ")),
      priceNum: priceNum(p.estimated_price_range),
      verified: priceVerified(p),
      citations: (p.citations || []).length,
      consensus: (p.source_consensus || "").toLowerCase(),
    });
    return { ok: true, ms, serperCalls, exact: (r.exactMatches || []).map(map), near: (r.nearMatches || []).map(map) };
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
  const weakWinner = ok.some((r) => {
    const top = r.exact[0];
    if (!top) return false;
    return !top.verified || top.citations < 2 || /weak|limited/.test(top.consensus) || nameHitsWrongType(top.name, g.wrongTypeTerms);
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
    poolCore, finalCore, altPool, wrongLeak, wrongWins, weakWinner, exactCounts, emptyRuns, emptyResult,
    priceOk, stab: stability(ok), budgetViol, featUnconfirmed, avgMs, serperCalls, errors: runs.length - ok.length,
  };
}

const set = GOLD.filter((g) => (!TYPE || g.type === TYPE) && (!FILTER || g.id.includes(FILTER)));
const results = [];
for (const g of set) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await once(g);
    runs.push(r);
    process.stderr.write(`  [${g.id}] run ${i + 1}/${RUNS}: ${r.ok ? `exact=${r.exact.length} ${r.ms}ms` : "ERR " + r.error}\n`);
  }
  results.push(scoreQuery(g, runs));
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const wt = (r) => (r.wrongWins ? "WINS#1" : r.wrongLeak ? "leak" : "ok");
const lines = [];
const out = (s = "") => { console.log(s); lines.push(s); };

const broad = results.filter((r) => r.type === "broad");
if (broad.length) {
  out("\n## BROAD SCORECARD  (goal: surface the CORE LEADERS)\n");
  out("| query | poolCore | final7Core | alt | stab | wrong-type | weak#1 | price | exacts | avg s |");
  out("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of broad)
    out(`| ${r.id} | ${r.poolCore}/${r.coreTotal} | ${r.finalCore}/${r.coreTotal} | ${r.altPool} | ${r.stab}% | ${wt(r)} | ${r.weakWinner ? "WEAK" : "ok"} | ${r.priceOk}% | [${r.exactCounts.join(",")}] | ${(r.avgMs / 1000).toFixed(0)} |`);
  out(`\nmean poolCore ${mean(broad.map((r) => r.poolCore)).toFixed(1)}/${broad[0].coreTotal} | mean final7Core ${mean(broad.map((r) => r.finalCore)).toFixed(1)} | wrong-type leaks ${broad.filter((r) => r.wrongLeak).length}/${broad.length} (wins#1 ${broad.filter((r) => r.wrongWins).length}) | weak#1 ${broad.filter((r) => r.weakWinner).length}/${broad.length} | mean stability ${Math.round(mean(broad.map((r) => r.stab)))}% | mean price ${Math.round(mean(broad.map((r) => r.priceOk)))}%`);
  out("target: poolCore>=5, final7Core>=3, 0 wrong-type, 0 weak#1");
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

writeFileSync("./.rr_baseline.json", JSON.stringify(results, null, 2));
writeFileSync("./.rr_baseline.md", lines.join("\n"));
console.log("\nrecords -> ./.rr_baseline.json , ./.rr_baseline.md");

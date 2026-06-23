// TWO-SCORECARD QUALITY HARNESS (Phase 0).
//
// Grades the live pipeline against scripts/goldBenchmark.mjs on two separate skills:
//   BROAD      -> surfaces the recognized CORE LEADERS (main coverage metric);
//                 alternates are fine but don't substitute; wrong-types are penalized.
//   CONSTRAINT -> satisfies the hard requirements (budget/feature) with confident
//                 price; judged on violations, NOT broad brand leadership.
// Both also report stability, wrong-type leakage into the final 7, price confidence,
// and a weak-winner flag on the #1 pick.
//
// Usage:
//   node scripts/qualityScorecard.mjs                              # all, RR_RUNS (default 2)
//   RR_RUNS=1 RR_FILTER=robot node scripts/qualityScorecard.mjs    # subset, 1 run
//   RR_TYPE=broad node scripts/qualityScorecard.mjs

import { GOLD } from "./goldBenchmark.mjs";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const RUNS = Number(process.env.RR_RUNS || 2);
const FILTER = process.env.RR_FILTER || "";
const TYPE = process.env.RR_TYPE || "";
const TIMEOUT_MS = 260000;

const norm = (s) => ` ${(s || "").toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim()} `;
const priceNum = (s) => { const m = (s || "").replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
const priceVerified = (p) => /\d/.test(p.estimated_price_range || "") && !/not verified|not found/i.test(p.estimated_price_range || "");

// A leader is "covered" by a product if its name has every brand token AND (no model
// lines, or at least one line token).
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
    if (o.error) return { ok: false, ms, error: o.error };
    const r = o.result || o;
    const map = (p) => ({
      name: p.name || "",
      text: norm([p.name, p.why_recommended, (p.pros || []).join(" "), (p.cons || []).join(" ")].join(" ")),
      priceNum: priceNum(p.estimated_price_range),
      verified: priceVerified(p),
      citations: (p.citations || []).length,
      consensus: (p.source_consensus || "").toLowerCase(),
    });
    return { ok: true, ms, exact: (r.exactMatches || []).map(map), near: (r.nearMatches || []).map(map) };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: String(e.name || e) };
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
  const allExact = ok.flatMap((r) => r.exact);
  const priceOk = allExact.length ? Math.round((allExact.filter((p) => p.verified).length / allExact.length) * 100) : 0;

  let budgetViol = 0, featUnconfirmed = 0;
  if (g.type === "constraint") {
    for (const r of ok) for (const p of r.exact) for (const c of g.constraints || []) {
      if (c.kind === "budget" && p.priceNum !== null && p.priceNum > c.max) budgetViol++;
      if (c.kind === "feature" && !c.any.some((k) => p.text.includes(norm(k).trim()))) featUnconfirmed++;
    }
  }
  return {
    coreTotal: (g.coreLeaders || []).length, altTotal: (g.acceptableAlternates || []).length,
    poolCore, finalCore, altPool, wrongLeak, wrongWins, weakWinner, exactCounts, priceOk,
    stab: stability(ok), budgetViol, featUnconfirmed, errors: runs.length - ok.length,
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
  results.push({ g, ...scoreQuery(g, runs) });
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const wt = (r) => (r.wrongWins ? "WINS#1" : r.wrongLeak ? "leak" : "ok");

const broad = results.filter((r) => r.g.type === "broad");
if (broad.length) {
  console.log("\n================ BROAD SCORECARD  (goal: surface the CORE LEADERS) ================\n");
  console.log("query                     | poolCore | final7Core | alt | stab | wrong-type | weak#1 | price | exacts");
  console.log("--------------------------+----------+------------+-----+------+------------+--------+-------+-------");
  for (const r of broad)
    console.log(`${r.g.id.padEnd(25)} | ${`${r.poolCore}/${r.coreTotal}`.padEnd(8)} | ${`${r.finalCore}/${r.coreTotal}`.padEnd(10)} | ${String(r.altPool).padEnd(3)} | ${`${r.stab}%`.padEnd(4)} | ${wt(r).padEnd(10)} | ${(r.weakWinner ? "WEAK" : "ok").padEnd(6)} | ${`${r.priceOk}%`.padEnd(5)} | [${r.exactCounts.join(",")}]`);
  console.log(`\n  mean poolCore ${mean(broad.map((r) => r.poolCore)).toFixed(1)}/${broad[0].coreTotal} | mean final7Core ${mean(broad.map((r) => r.finalCore)).toFixed(1)} | wrong-type leaks ${broad.filter((r) => r.wrongLeak).length}/${broad.length} (wins#1: ${broad.filter((r) => r.wrongWins).length}) | weak#1 ${broad.filter((r) => r.weakWinner).length}/${broad.length} | mean stability ${Math.round(mean(broad.map((r) => r.stab)))}%`);
  console.log("  target: poolCore>=5, final7Core>=3, 0 wrong-type in final 7, 0 weak#1");
}

const con = results.filter((r) => r.g.type === "constraint");
if (con.length) {
  console.log("\n================ CONSTRAINT SCORECARD  (goal: satisfy hard requirements) ================\n");
  console.log("query                     | exacts | budgetViol | feat-unconf | price | wrong-type | weak#1 | stab | (core)");
  console.log("--------------------------+--------+------------+-------------+-------+------------+--------+------+-------");
  for (const r of con)
    console.log(`${r.g.id.padEnd(25)} | ${`[${r.exactCounts.join(",")}]`.padEnd(6)} | ${String(r.budgetViol).padEnd(10)} | ${String(r.featUnconfirmed).padEnd(11)} | ${`${r.priceOk}%`.padEnd(5)} | ${wt(r).padEnd(10)} | ${(r.weakWinner ? "WEAK" : "ok").padEnd(6)} | ${`${r.stab}%`.padEnd(4)} | ${r.poolCore}/${r.coreTotal}`);
  console.log(`\n  budget violations ${con.reduce((a, r) => a + r.budgetViol, 0)} | feature-unconfirmed ${con.reduce((a, r) => a + r.featUnconfirmed, 0)} | wrong-type leaks ${con.filter((r) => r.wrongLeak).length}/${con.length} | weak#1 ${con.filter((r) => r.weakWinner).length}/${con.length}`);
  console.log("  target: 0 budget violations, low feature-unconfirmed, high price confidence, 0 wrong-type");
}

console.log(`\nruns/query ${RUNS} | queries ${set.length} | errors ${results.reduce((a, r) => a + r.errors, 0)}`);

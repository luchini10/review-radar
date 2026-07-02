// Live quality + consistency harness.
//
// Runs a fixed query set N times each against the local API and measures:
//   - stability   : how much the displayed product set changes run-to-run
//   - exact rate  : how many exact (Best Match) products per run; % runs that fill 7
//   - price-verified rate : fraction of displayed products with a real (non-"not
//                   verified") price
//   - source spread : distinct retailer hosts per run
//   - latency / errors
//
// It also dumps the full per-run product lists to ./.rr_quality_dump.json for
// eyeballing actual quality (wrong-category items, variants, near-vs-exact, etc.).
//
// Usage:
//   node scripts/qualityConsistencyHarness.mjs
//   node scripts/qualityConsistencyHarness.mjs --fixtures <run1.json> <run2.json> <run3.json> [...]

import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.RR_BASE || "http://localhost:3000";
const RUNS = Number(process.env.RR_RUNS || 3);
const TIMEOUT_MS = 260000;

const QUERIES = [
  { query: "shop vac" },
  { query: "toaster oven", budget: "$200", priorities: "air fry, easy to clean, compact countertop size" },
  { query: "robot vacuum", budget: "under $500", priorities: "self-emptying, good for pet hair, avoids cords" },
  { query: "office chair", budget: "under $300", priorities: "lumbar support, breathable" },
  { query: "air purifier", priorities: "for allergies, large room" },
  { query: "cordless drill", budget: "under $150", priorities: "brushless" },
  { query: "gas grill", budget: "under $600", priorities: "4 burner, propane" },
];

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const priceVerified = (p) => {
  const r = p.estimated_price_range || "";
  return /\d/.test(r) && !/not verified|not found/i.test(r);
};
const fixtureArgs = process.argv.slice(2);
const fixtureFlag = fixtureArgs.indexOf("--fixtures");
const fixturePaths = fixtureFlag >= 0
  ? fixtureArgs.slice(fixtureFlag + 1).filter((arg) => !arg.startsWith("--"))
  : [];

function setFrom(values) {
  return new Set((values || []).map((value) => norm(value)).filter(Boolean));
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection++;
  }
  return intersection / union.size;
}

function pairwise(values, label) {
  const pairs = [];
  for (let left = 0; left < values.length; left++) {
    for (let right = left + 1; right < values.length; right++) {
      pairs.push({
        pair: `${left + 1}-${right + 1}`,
        value: Number(jaccard(values[left], values[right]).toFixed(4)),
      });
    }
  }
  const mean = pairs.length
    ? pairs.reduce((sum, pair) => sum + pair.value, 0) / pairs.length
    : 0;
  return { label, pairs, mean: Number(mean.toFixed(4)) };
}

function intersectionUnion(sets) {
  const union = new Set(sets.flatMap((set) => [...set]));
  const intersection = new Set(
    [...union].filter((value) => sets.every((set) => set.has(value))),
  );
  return {
    intersection: intersection.size,
    union: union.size,
    value: union.size ? Number((intersection.size / union.size).toFixed(4)) : 1,
  };
}

function rankedFinalNames(fixture) {
  const result = fixture.result || fixture;
  return [
    ...(result.exactMatches || []),
    ...(result.nearMatches || []),
  ].map((product) => norm(product.name));
}

function spearmanForShared(left, right) {
  const leftRanks = new Map(left.map((name, index) => [name, index + 1]));
  const rightRanks = new Map(right.map((name, index) => [name, index + 1]));
  const shared = [...leftRanks.keys()].filter((name) => rightRanks.has(name));
  if (shared.length < 2) return { shared: shared.length, value: null };
  const squaredDifference = shared.reduce((sum, name) => {
    const difference = leftRanks.get(name) - rightRanks.get(name);
    return sum + difference * difference;
  }, 0);
  const n = shared.length;
  const value = 1 - (6 * squaredDifference) / (n * (n * n - 1));
  return { shared: n, value: Number(value.toFixed(4)) };
}

function numericRange(values) {
  return {
    values,
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
  };
}

function fixtureRun(fixture, path) {
  const debug = fixture.debug || {};
  const funnel = debug.stageFunnel || {};
  const result = fixture.result || fixture;
  const stages = Object.fromEntries(
    (funnel.stages || []).map((stage) => [
      stage.stage,
      {
        names: stage.names || [],
        near: stage.near || [],
      },
    ]),
  );
  const exact = result.exactMatches || [];
  const near = result.nearMatches || [];
  const serperCalls = [
    debug.serperShoppingCalls,
    debug.serperOrganicCalls,
    debug.serperRetailerDomainCalls,
    debug.serperDirectRetailerCalls,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);

  return {
    path,
    savedAt: fixture._savedAt || null,
    raw: setFrom(funnel.raw),
    plan: setFrom([
      ...(debug.generatedQueries || []),
      ...(debug.serperSearchedQueries || []),
    ]),
    pool: setFrom(stages.candidatePool?.names || funnel.poolCandidates?.map((p) => p.name)),
    final: setFrom([...exact, ...near].map((product) => product.name)),
    rankedFinal: rankedFinalNames(fixture),
    exactCount: exact.length,
    nearCount: near.length,
    totalMs: Number(debug.timing?.totalMs) || 0,
    serperCalls,
    stages,
    ridgid: {
      raw: [...(funnel.raw || [])].filter((name) => /\bridgid\b/i.test(name)),
      pool: [...(stages.candidatePool?.names || [])].filter((name) => /\bridgid\b/i.test(name)),
      stageCounts: Object.fromEntries(
        Object.entries(stages).map(([stage, value]) => [
          stage,
          [...value.names, ...value.near].filter((name) => /\bridgid\b/i.test(name)).length,
        ]),
      ),
    },
  };
}

function analyzeFixtureGroup(query, fixtures) {
  const runs = fixtures.map(({ fixture, path }) => fixtureRun(fixture, path));
  const stageNames = [...new Set(runs.flatMap((run) => Object.keys(run.stages)))];
  const rankPairs = [];
  for (let left = 0; left < runs.length; left++) {
    for (let right = left + 1; right < runs.length; right++) {
      rankPairs.push({
        pair: `${left + 1}-${right + 1}`,
        ...spearmanForShared(runs[left].rankedFinal, runs[right].rankedFinal),
      });
    }
  }

  return {
    query,
    runCount: runs.length,
    rawProviderOverlap: pairwise(runs.map((run) => run.raw), "rawProvider"),
    queryPlanOverlap: pairwise(runs.map((run) => run.plan), "queryPlan"),
    candidatePoolOverlap: pairwise(runs.map((run) => run.pool), "candidatePool"),
    finalSetOverlap: pairwise(runs.map((run) => run.final), "finalSet"),
    candidatePoolThreeRun: intersectionUnion(runs.map((run) => run.pool)),
    finalSetThreeRun: intersectionUnion(runs.map((run) => run.final)),
    rankCorrelation: rankPairs,
    exactCounts: numericRange(runs.map((run) => run.exactCount)),
    nearCounts: numericRange(runs.map((run) => run.nearCount)),
    stageCounts: Object.fromEntries(
      stageNames.map((stage) => [
        stage,
        numericRange(runs.map((run) => {
          const value = run.stages[stage];
          return value ? value.names.length + value.near.length : 0;
        })),
      ]),
    ),
    latencyMs: numericRange(runs.map((run) => run.totalMs)),
    serperCalls: numericRange(runs.map((run) => run.serperCalls)),
    runs: runs.map((run, index) => ({
      run: index + 1,
      path: run.path,
      savedAt: run.savedAt,
      exactCount: run.exactCount,
      nearCount: run.nearCount,
      totalMs: run.totalMs,
      serperCalls: run.serperCalls,
      ridgid: run.ridgid,
    })),
  };
}

if (fixtureFlag >= 0) {
  if (fixturePaths.length < 2) {
    console.error("Fixture analysis requires at least two fixture paths.");
    process.exit(1);
  }
  const grouped = new Map();
  for (const path of fixturePaths) {
    const fixture = JSON.parse(readFileSync(path, "utf8"));
    const query = fixture._query || "unknown";
    if (!grouped.has(query)) grouped.set(query, []);
    grouped.get(query).push({ fixture, path });
  }
  const report = [...grouped.entries()].map(([query, fixtures]) =>
    analyzeFixtureGroup(query, fixtures),
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

async function once(body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-reviewradar-debug": "true" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const o = await res.json();
    const ms = Date.now() - started;
    if (o.error) return { ok: false, ms, error: o.error, stage: o.debug?.stage || (o.debug?.timing ? "" : ""), exact: [], near: [], eligible: o.debug?.exactMatchCount };
    const r = o.result || o, d = o.debug || {};
    const exact = (r.exactMatches || []).map((p) => ({ name: p.name, price: p.estimated_price_range, host: host(p.product_page_url), verified: priceVerified(p) }));
    const near = (r.nearMatches || []).map((p) => p.name);
    return { ok: true, ms, http: res.status, exact, near, eligible: d.exactMatchCount, ctx: d.finalSearchContextSize, reason: d.verificationBudget?.reason };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: String(e.name || e), exact: [], near: [] };
  } finally {
    clearTimeout(t);
  }
}

function jaccardStability(runs) {
  // sets of exact names per run
  const sets = runs.map((r) => new Set(r.exact.map((p) => norm(p.name))));
  const union = new Set();
  for (const s of sets) for (const x of s) union.add(x);
  if (union.size === 0) return { core: 0, union: 0, pct: 0 };
  const core = [...union].filter((x) => sets.every((s) => s.has(x)));
  return { core: core.length, union: union.size, pct: Math.round((core.length / union.size) * 100) };
}

const dump = [];
const summary = [];

for (const q of QUERIES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await once(q);
    runs.push(res);
    process.stderr.write(`  [${q.query}] run ${i + 1}/${RUNS}: ${res.ok ? `exact=${res.exact.length} near=${res.near.length} ${res.ms}ms` : `ERROR ${res.error}`}\n`);
  }
  dump.push({ query: q, runs });
  const ok = runs.filter((r) => r.ok);
  const exactCounts = runs.map((r) => r.exact.length);
  const hits7 = exactCounts.filter((c) => c >= 7).length;
  const stab = jaccardStability(ok.length ? ok : runs);
  const allExact = ok.flatMap((r) => r.exact);
  const verifiedRate = allExact.length ? Math.round((allExact.filter((p) => p.verified).length / allExact.length) * 100) : 0;
  const hostsPerRun = ok.map((r) => new Set(r.exact.map((p) => p.host)).size);
  const avgHosts = hostsPerRun.length ? (hostsPerRun.reduce((a, b) => a + b, 0) / hostsPerRun.length).toFixed(1) : "0";
  const avgMs = runs.length ? Math.round(runs.reduce((a, r) => a + r.ms, 0) / runs.length) : 0;
  const errors = runs.filter((r) => !r.ok).length;
  summary.push({ query: q.query, exactCounts, hits7, stabPct: stab.pct, core: stab.core, union: stab.union, verifiedRate, avgHosts, avgMs, errors });
}

writeFileSync("./.rr_quality_dump.json", JSON.stringify(dump, null, 2));

console.log("\n================ QUALITY + CONSISTENCY SUMMARY ================\n");
console.log("query            | exacts (3 runs) | fill7 | stability | price-ok | hosts | avg ms | err");
console.log("-----------------+-----------------+-------+-----------+----------+-------+--------+----");
for (const s of summary) {
  console.log(
    `${s.query.padEnd(16)} | ${`[${s.exactCounts.join(",")}]`.padEnd(15)} | ${String(s.hits7 + "/" + RUNS).padEnd(5)} | ${String(s.stabPct + "% (" + s.core + "/" + s.union + ")").padEnd(9)} | ${String(s.verifiedRate + "%").padEnd(8)} | ${String(s.avgHosts).padEnd(5)} | ${String(s.avgMs).padEnd(6)} | ${s.errors}`,
  );
}
const mean = (xs) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
console.log("\n--- aggregate ---");
console.log(`mean exact/run     : ${mean(summary.flatMap((s) => s.exactCounts)).toFixed(1)}`);
console.log(`runs filling 7     : ${summary.reduce((a, s) => a + s.hits7, 0)}/${QUERIES.length * RUNS}`);
console.log(`mean stability     : ${Math.round(mean(summary.map((s) => s.stabPct)))}%  (share of products that appear in ALL ${RUNS} runs)`);
console.log(`mean price-verified: ${Math.round(mean(summary.map((s) => s.verifiedRate)))}%`);
console.log(`total errors       : ${summary.reduce((a, s) => a + s.errors, 0)}/${QUERIES.length * RUNS}`);
console.log(`mean latency       : ${Math.round(mean(summary.map((s) => s.avgMs)))}ms`);
console.log("\nfull per-run product lists -> ./.rr_quality_dump.json");

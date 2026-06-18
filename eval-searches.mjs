/**
 * Review Radar — Real-World Evaluation Script
 *
 * Prerequisites:
 *   - Dev server running: npm run dev (in a separate terminal)
 *   - Default port: 3000
 *
 * Run:  node eval-searches.mjs
 * Results saved to: eval-results.json
 */

import { writeFileSync } from "fs";

const BASE_URL = process.env.RR_BASE_URL || "http://localhost:3000";

const SEARCHES = [
  {
    id: "tv-stand",
    query: "TV stand",
    budget: "under $500",
    priorities: "under 64 inches wide, solid wood, no glass shelves",
    avoid: "glass shelves",
  },
  {
    id: "beige-couch",
    query: "couch",
    budget: "under $900",
    priorities: "must be beige",
    avoid: "futons",
  },
  {
    id: "cordless-vacuum",
    query: "cordless stick vacuum",
    budget: "under $350",
    priorities: "pet hair, lightweight, removable battery",
    avoid: "",
  },
  {
    id: "office-chair",
    query: "office chair",
    budget: "under $250",
    priorities: "adjustable lumbar support",
    avoid: "gaming chairs",
  },
  {
    id: "air-purifier",
    query: "air purifier",
    budget: "under $300",
    priorities: "allergies, bedroom use, quiet operation",
    avoid: "",
  },
  {
    id: "running-shoes",
    query: "running shoes",
    budget: "under $160",
    priorities: "daily walking and running, wide sizes available",
    avoid: "trail shoes",
  },
  {
    id: "coffee-maker",
    query: "coffee maker",
    budget: "under $200",
    priorities: "thermal carafe, programmable",
    avoid: "pod-only machines",
  },
  {
    id: "dog-food",
    query: "dog food",
    budget: "reasonable",
    priorities: "small breed, picky dogs",
    avoid: "chicken",
  },
];

async function runSearch(params) {
  const body = { query: params.query };
  if (params.budget) body.budget = params.budget;
  if (params.priorities) body.priorities = params.priorities;
  if (params.avoid) body.avoid = params.avoid;

  const startMs = Date.now();
  const response = await fetch(`${BASE_URL}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const elapsedMs = Date.now() - startMs;
  const json = await response.json();
  const result = json.result || null;
  const error = json.error || null;

  return { params, status: response.status, elapsedMs, result, error };
}

function summarize(raw) {
  const { params, status, elapsedMs, result, error } = raw;
  if (error || !result) {
    return { id: params.id, query: params.query, status, elapsedMs, error: error || "no result" };
  }

  const pickProduct = (p) => ({
    name: p.name,
    brand: p.brand,
    price: p.price || p.estimated_price_range,
    matchStatus: p.matchStatus,
    disqualifiedReason: p.disqualifiedReason || null,
    requirementComparisons: p.requirementComparisons || [],
    citationCount: (p.citations || []).length,
    topCitationUrl: p.citations?.[0]?.url || null,
  });

  return {
    id: params.id,
    query: params.query,
    budget: params.budget,
    status,
    elapsedMs,
    exactMatches: (result.exactMatches || []).map(pickProduct),
    nearMatches: (result.nearMatches || []).map(pickProduct),
    recommendations: (result.recommendations || []).map(pickProduct),
    search_summary: result.search_summary || "",
    generated_queries: result.generated_queries || [],
    what_to_avoid: result.what_to_avoid || [],
    final_buying_advice: result.final_buying_advice || "",
  };
}

async function main() {
  console.log(`Review Radar Eval — ${SEARCHES.length} searches against ${BASE_URL}\n`);

  const allRaw = [];

  for (let i = 0; i < SEARCHES.length; i++) {
    const s = SEARCHES[i];
    process.stdout.write(`[${i + 1}/${SEARCHES.length}] ${s.id}: "${s.query}"... `);
    try {
      const raw = await runSearch(s);
      allRaw.push(raw);
      const exact = raw.result?.exactMatches?.length ?? 0;
      const near = raw.result?.nearMatches?.length ?? 0;
      const recs = raw.result?.recommendations?.length ?? 0;
      console.log(`done (${(raw.elapsedMs / 1000).toFixed(1)}s) exact=${exact} near=${near} recs=${recs}`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      allRaw.push({ params: s, status: 0, elapsedMs: 0, result: null, error: err.message });
    }
  }

  const summaries = allRaw.map(summarize);
  writeFileSync("eval-results.json", JSON.stringify({ timestamp: new Date().toISOString(), searches: summaries }, null, 2));
  console.log(`\nResults saved to eval-results.json`);

  // Quick console summary
  console.log("\n=== Quick Summary ===\n");
  for (const s of summaries) {
    if (s.error) {
      console.log(`FAIL  ${s.id}: ${s.error}`);
      continue;
    }
    const e = s.exactMatches.length, n = s.nearMatches.length, r = s.recommendations.length;
    const grade = e >= 2 ? "PASS" : e === 1 ? "MINOR" : n >= 2 ? "MINOR" : "FAIL";
    console.log(`${grade.padEnd(5)} ${s.id} — exact:${e} near:${n} recs:${r}`);
    for (const p of s.exactMatches) {
      console.log(`      [EXACT] ${p.name} | ${p.price}`);
    }
    for (const p of s.nearMatches) {
      console.log(`      [NEAR]  ${p.name} | ${p.disqualifiedReason || "ok"}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

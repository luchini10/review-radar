// Phased pipeline evaluation on FIXED candidate sets (deterministic, no live
// fetch). Scores each category with whatever REVIEW_RADAR_* flags are set in the
// environment, prints the exact/near split with the score internals, and runs
// built-in red-flag checks. Run one phase at a time, e.g.:
//
//   node scripts/eval-pipeline.mjs
//   REVIEW_RADAR_CREDIBILITY_PENALTY=on node scripts/eval-pipeline.mjs
//   REVIEW_RADAR_CREDIBILITY_PENALTY=on REVIEW_RADAR_SPEC_VALIDATION=on REVIEW_RADAR_CATEGORY_SCORING=on node scripts/eval-pipeline.mjs

import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { parseMaxBudgetAmount } from "../lib/priceParsing.ts";
import { generateSearchQueries } from "../lib/searchQueryExpansion.ts";

const { productPrice } = recommendationScoringTestExports;

function field(value) {
  return { confidence: "High", sourceType: "serper", sourceUrl: "https://example.com/p", value, verifiedAt: "2026-06-14T00:00:00.000Z" };
}
function offer(price, url) {
  return { availability: field("InStock"), price: field(price), priceCurrency: field("USD"), retailer: url, url };
}
const editorial = (title, host) => ({ title, url: `https://${host}/best`, what_it_supports: "Hands-on tested." });
const retailer = (host) => ({ title: "Product page", url: `https://${host}/product`, what_it_supports: "Specs and price." });

function product(name, category, o) {
  const url = `https://${o.host}/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return {
    recommendation_type: "Best Match", name, category,
    product_page_url: url, product_image_url: "https://example.com/i.jpg",
    why_recommended: `${name}.`, pros: o.pros || [], cons: [], common_complaints: [],
    estimated_price_range: o.priceText ?? `$${o.offer}`, confidence_score: 75,
    source_consensus: o.consensus || "Mixed", price_value_verdict: "", best_for: "", not_for: [],
    citations: o.cites || [retailer(o.host)],
    metadata: {
      brand: field(o.brand), canonicalUrl: field(url), image: field("https://example.com/i.jpg"),
      modelNumber: field(name.replace(/\s+/g, "-")), offers: [offer(o.offer, url)],
      rating: o.rating == null ? undefined : field(o.rating),
      reviewCount: o.reviews == null ? undefined : field(o.reviews),
      title: field(name),
    },
  };
}

const scenarios = [
  {
    key: "leaf blower (hard spec ≥600 CFM)",
    input: { query: "cordless leaf blower", priorities: "at least 600 cfm", budget: "under $300" },
    expectNearWhenSpecOn: ["BudgetAir 400 CFM Cordless Leaf Blower", "QuietPro Cordless Leaf Blower"],
    candidates: [
      product("EGO Power+ 650 CFM Cordless Leaf Blower (Battery Included)", "cordless leaf blower", {
        host: "egopowerplus.com", brand: "EGO", offer: 299, consensus: "Strong", rating: 4.7, reviews: 2000,
        pros: ["Battery included.", "650 CFM airflow."], cites: [retailer("egopowerplus.com"), editorial("Wirecutter pick", "wirecutter.com"), editorial("PTR test", "protoolreviews.com")],
      }),
      product("Maxblow 700 CFM Cordless Leaf Blower", "cordless leaf blower", {
        host: "maxblow.com", brand: "Maxblow", offer: 149, consensus: "Weak", rating: null, reviews: 20,
        pros: ["700 CFM cordless airflow."],
      }),
      product("BudgetAir 400 CFM Cordless Leaf Blower", "cordless leaf blower", {
        host: "budgetair.com", brand: "BudgetAir", offer: 89, consensus: "Weak", rating: 4.1, reviews: 60,
        pros: ["400 CFM cordless."],
      }),
      product("QuietPro Cordless Leaf Blower", "cordless leaf blower", {
        host: "quietpro.com", brand: "QuietPro", offer: 179, consensus: "Mixed", rating: 4.3, reviews: 150,
        pros: ["Quiet cordless operation."],
      }),
    ],
  },
  {
    key: "cordless vacuum (SOFT spec ~150 AW)",
    input: { query: "cordless vacuum", priorities: "around 150 aw suction", budget: "under $500" },
    expectExactWhenSpecOn: ["ValueVac Cordless Vacuum"],
    candidates: [
      product("Dyson V15 240 AW Cordless Vacuum", "cordless vacuum", {
        host: "dyson.com", brand: "Dyson", offer: 499, consensus: "Strong", rating: 4.6, reviews: 3000,
        pros: ["240 AW suction.", "60 min runtime."], cites: [retailer("dyson.com"), editorial("RTINGS vacuum test", "rtings.com")],
      }),
      product("ValueVac Cordless Vacuum", "cordless vacuum", {
        host: "valuevac.com", brand: "ValueVac", offer: 199, consensus: "Weak", rating: 4.2, reviews: 80,
        pros: ["Lightweight cordless cleaning."],
      }),
      product("Bargain Stick Cordless Vacuum", "cordless vacuum", {
        host: "bargain.com", brand: "Bargain", offer: 1, priceText: "$1", consensus: "Mixed", rating: 4.0, reviews: 40,
        pros: ["Cordless cleaning."],
      }),
    ],
  },
  {
    key: "gas grill (propane feature + $1 price)",
    input: { query: "gas grill", priorities: "must be propane", budget: "under $700" },
    candidates: [
      product("Weber Spirit E-310 Gas Grill (Liquid Propane)", "gas grill", {
        host: "weber.com", brand: "Weber", offer: 449, consensus: "Mixed", rating: 4.6, reviews: 1500,
        pros: ["Liquid propane fuel.", "3-burner gas grill."], cites: [retailer("weber.com"), editorial("Wirecutter best grills", "wirecutter.com")],
      }),
      product("Member's Mark 5-Burner Propane Gas Grill", "gas grill", {
        host: "samsclub.com", brand: "Member's Mark", offer: 349, consensus: "Weak", rating: null, reviews: 40,
        pros: ["Propane gas grill.", "5 burners."],
      }),
      product("Weber Spirit II E-315 Gas Grill (Liquid Propane)", "gas grill", {
        host: "weber.com", brand: "Weber", offer: 1, priceText: "$1", consensus: "Mixed", rating: 4.5, reviews: 800,
        pros: ["Liquid propane gas grill."], cites: [retailer("weber.com"), editorial("Wirecutter pick", "wirecutter.com")],
      }),
    ],
  },
  {
    key: "king size mattress (bed-size enforcement)",
    input: { query: "king size mattress", budget: "under $2000" },
    expectNearAlways: ["Leesa Studio Twin Mattress - Article furniture", "Leesa Studio Queen Mattress - Article furniture"],
    candidates: [
      product("Leesa Studio King Mattress - Article furniture", "king size mattress", {
        host: "article.com", brand: "Article", offer: 799, consensus: "Mixed", rating: 4.4, reviews: 200,
        pros: ["Memory foam comfort."], cites: [retailer("article.com"), editorial("Sleep review", "sleepfoundation.org")],
      }),
      product("Leesa Studio Twin Mattress - Article furniture", "king size mattress", {
        host: "article.com", brand: "Article", offer: 384, consensus: "Weak", rating: null, reviews: 30,
        pros: ["Memory foam comfort."],
      }),
      product("Leesa Studio Queen Mattress - Article furniture", "king size mattress", {
        host: "article.com", brand: "Article", offer: 559, consensus: "Weak", rating: null, reviews: 25,
        pros: ["Memory foam comfort."],
      }),
    ],
  },
  {
    key: "running shoes (non-profiled + budget)",
    input: { query: "running shoes", budget: "under $150" },
    candidates: [
      product("Brooks Ghost 15 Running Shoes", "running shoes", {
        host: "brooksrunning.com", brand: "Brooks", offer: 140, consensus: "Strong", rating: 4.6, reviews: 5000,
        pros: ["Cushioned ride."], cites: [retailer("brooksrunning.com"), editorial("RunRepeat review", "runrepeat.com")],
      }),
      product("Generic Runner Running Shoes", "running shoes", {
        host: "generic.com", brand: "Generic", offer: 59, consensus: "Weak", rating: 4.4, reviews: 70,
        pros: ["Lightweight running shoes."],
      }),
      product("Carbon Elite Racer Running Shoes", "running shoes", {
        host: "racer.com", brand: "Racer", offer: 250, consensus: "Mixed", rating: 4.7, reviews: 400,
        pros: ["Carbon plate."],
      }),
    ],
  },
];

function activeFlags() {
  return ["REVIEW_RADAR_SPEC_VALIDATION", "REVIEW_RADAR_CATEGORY_SCORING", "REVIEW_RADAR_CREDIBILITY_PENALTY", "REVIEW_RADAR_SPEC_SEARCH", "REVIEW_RADAR_LLM_NARRATION"]
    .filter((f) => process.env[f] === "on").map((f) => f.replace("REVIEW_RADAR_", "")).join(", ") || "(none — baseline)";
}

console.log(`\n############ FLAGS ON: ${activeFlags()} ############`);
const specOn = process.env.REVIEW_RADAR_SPEC_VALIDATION === "on";
const issues = [];

for (const s of scenarios) {
  const input = { ...s.input, extractedRequirements: extractStructuredRequirements(s.input) };
  const budget = parseMaxBudgetAmount(s.input.budget);
  const res = scoreAndSelectRecommendations(
    { search_summary: "", assumptions: [], exactMatches: structuredClone(s.candidates), nearMatches: [], recommendations: [], what_to_avoid: [], final_buying_advice: "" },
    input,
  );
  console.log(`\n=== ${s.key} | budget $${budget} ===`);
  res.exactMatches.forEach((p) => {
    const sb = p.scoreBreakdown || {};
    const rc = p.requirementCheck || {};
    const price = productPrice(p);
    console.log(`  #${p.rank} ${p.name.slice(0, 40).padEnd(40)} ${(price === null ? "unverified" : "$" + price).padEnd(11)} tier=${(sb.marketConfidenceTier || "?").padEnd(8)} cred=${sb.credibilityFloorPenalty ?? 0} cat=${sb.categoryFitScore ?? 0} P/F/U=${(rc.passed || []).length}/${(rc.failed || []).length}/${(rc.unknown || []).length}`);
    if (price !== null && budget !== null && price > budget) issues.push(`[${s.key}] OVER BUDGET in exact: ${p.name} ($${price} > $${budget})`);
    if (price !== null && price < 10) issues.push(`[${s.key}] BROKEN PRICE in exact: ${p.name} ($${price})`);
  });
  console.log(`  near: ${res.nearMatches.map((p) => p.name.slice(0, 32)).join(" | ") || "(none)"}`);

  const exactNames = res.exactMatches.map((p) => p.name);
  if (specOn && s.expectNearWhenSpecOn) {
    for (const n of s.expectNearWhenSpecOn) {
      if (exactNames.includes(n)) issues.push(`[${s.key}] expected NEAR (hard-spec) but is EXACT: ${n}`);
    }
  }
  if (specOn && s.expectExactWhenSpecOn) {
    for (const n of s.expectExactWhenSpecOn) {
      if (!exactNames.includes(n)) issues.push(`[${s.key}] SOFT spec wrongly eliminated from exact: ${n}`);
    }
  }
  if (s.expectNearAlways) {
    for (const n of s.expectNearAlways) {
      if (exactNames.includes(n)) issues.push(`[${s.key}] WRONG SIZE leaked into exact: ${n}`);
    }
  }
}

if (process.env.REVIEW_RADAR_SPEC_SEARCH === "on") {
  const q = generateSearchQueries({ query: "cordless leaf blower", priorities: "at least 600 cfm" }).join(" | ").toLowerCase();
  console.log(`\n[spec-search] blower queries contain "600 cfm": ${/600\s*cfm/.test(q)}`);
}

console.log("\n---------- RED-FLAG CHECKS ----------");
console.log(issues.length === 0 ? "  ✅ no issues" : issues.map((i) => "  ❌ " + i).join("\n"));

// Deterministic A/B: scores ONE fixed candidate set with the new-pipeline flags
// OFF then ON, so the difference is purely the flags (no live re-fetch). The
// fixture mirrors the real "gas grill, propane, under $700" results, including
// the broken $1 / $100 prices, so it also shows the always-on price floor.
//
//   node scripts/ab-ranking.mjs

import {
  recommendationScoringTestExports,
  scoreAndSelectRecommendations,
} from "../lib/recommendationScoring.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const FLAGS = [
  "REVIEW_RADAR_SPEC_VALIDATION",
  "REVIEW_RADAR_CATEGORY_SCORING",
  "REVIEW_RADAR_CREDIBILITY_PENALTY",
  "REVIEW_RADAR_SPEC_SEARCH",
];

function setFlags(on) {
  for (const flag of FLAGS) {
    if (on) process.env[flag] = "on";
    else delete process.env[flag];
  }
}

function field(value) {
  return {
    confidence: "High",
    sourceType: "serper",
    sourceUrl: "https://example.com/p",
    value,
    verifiedAt: "2026-06-14T00:00:00.000Z",
  };
}

function offer(price, url) {
  return {
    availability: field("InStock"),
    price: field(price),
    priceCurrency: field("USD"),
    retailer: url,
    url,
  };
}

function grill(name, o) {
  const url = `https://${o.host}/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return {
    recommendation_type: "Best Match",
    name,
    category: "gas grill",
    product_page_url: url,
    product_image_url: "https://example.com/img.jpg",
    why_recommended: `${name} is a propane gas grill.`,
    pros: ["Liquid propane fuel.", "Even heat across the grates."],
    cons: [],
    common_complaints: [],
    estimated_price_range: o.priceText,
    confidence_score: 75,
    source_consensus: o.consensus,
    price_value_verdict: "Reasonable value.",
    best_for: "Backyard cooks.",
    not_for: [],
    citations: o.cites,
    metadata: {
      brand: field(o.brand),
      canonicalUrl: field(url),
      image: field("https://example.com/img.jpg"),
      modelNumber: field(name.replace(/\s+/g, "-")),
      offers: [offer(o.offer, url)],
      rating: o.rating === null ? undefined : field(o.rating),
      reviewCount: o.reviews === null ? undefined : field(o.reviews),
      title: field(name),
    },
  };
}

const editorial = (title, host) => ({
  title,
  url: `https://${host}/best-gas-grills`,
  what_it_supports: "Hands-on tested performance.",
});
const retailer = (host) => ({
  title: "Product page",
  url: `https://${host}/product`,
  what_it_supports: "Specs and price.",
});

const candidates = [
  grill("Weber Spirit E-310 Gas Grill (Liquid Propane)", {
    host: "weber.com", brand: "Weber", offer: 449, priceText: "$449", consensus: "Mixed",
    rating: 4.6, reviews: 1500,
    cites: [retailer("weber.com"), editorial("Wirecutter: best gas grills", "wirecutter.com"), editorial("RTINGS gas grill test", "rtings.com")],
  }),
  grill("Member's Mark 5-Burner Propane Gas Grill", {
    host: "samsclub.com", brand: "Member's Mark", offer: 349, priceText: "$349", consensus: "Weak",
    rating: null, reviews: 40, cites: [retailer("samsclub.com")],
  }),
  grill("Member's Mark Pro 4-Burner Gas Grill (Propane)", {
    host: "samsclub.com", brand: "Member's Mark", offer: 499, priceText: "$499", consensus: "Weak",
    rating: null, reviews: 25, cites: [retailer("samsclub.com")],
  }),
  grill("Char-Broil Performance 4-Burner Gas Grill (Propane)", {
    host: "charbroil.com", brand: "Char-Broil", offer: 249, priceText: "$249", consensus: "Mixed",
    rating: 4.3, reviews: 300, cites: [retailer("charbroil.com"), retailer("homedepot.com")],
  }),
  grill("Nexgrill 3-Burner Liquid Propane Gas Grill", {
    host: "nexgrill.com", brand: "Nexgrill", offer: 199, priceText: "$199", consensus: "Weak",
    rating: 4.0, reviews: 30, cites: [retailer("nexgrill.com")],
  }),
  // Broken $1 price — should be floored to "unverified" and drop out of exact.
  grill("Weber Spirit II E-315 Gas Grill (Liquid Propane)", {
    host: "weber.com", brand: "Weber", offer: 1, priceText: "$1", consensus: "Mixed",
    rating: 4.5, reviews: 800, cites: [retailer("weber.com"), editorial("Wirecutter pick", "wirecutter.com")],
  }),
];

const input = {
  query: "gas grill",
  priorities: "must be propane",
  budget: "under $700",
  extractedRequirements: extractStructuredRequirements({
    query: "gas grill", priorities: "must be propane", budget: "under $700",
  }),
};

function baseResult() {
  return {
    search_summary: "", assumptions: [],
    exactMatches: structuredClone(candidates),
    nearMatches: [], recommendations: [], what_to_avoid: [], final_buying_advice: "",
  };
}

const short = (name) => name.replace(/ Gas Grill.*/, "");
const r1 = (n) => Math.round(n * 10) / 10;

setFlags(false);
const off = scoreAndSelectRecommendations(baseResult(), input);
setFlags(true);
const on = scoreAndSelectRecommendations(baseResult(), input);

// Join OFF and ON by product name.
const onByName = new Map(
  [...on.exactMatches, ...on.nearMatches].map((p) => [p.name, p]),
);
const rank = (res, name) => {
  const i = res.exactMatches.findIndex((p) => p.name === name);
  if (i >= 0) return `#${i + 1}`;
  return res.nearMatches.some((p) => p.name === name) ? "near" : "-";
};

console.log("\nSame 6 candidates scored OLD (flags off) vs NEW (flags on).");
console.log("rawPrice = price before the floor; usedPrice = after the floor.\n");
console.log(
  "  " +
    "product".padEnd(26) +
    "rawPrice".padEnd(10) +
    "usedPrice".padEnd(11) +
    "tier".padEnd(10) +
    "OLD rank/total".padEnd(16) +
    "NEW rank/total",
);
for (const p of [...off.exactMatches, ...off.nearMatches]) {
  const sb = p.scoreBreakdown || {};
  const onP = onByName.get(p.name);
  const rawOffer = (p.metadata?.offers || []).map((o) => o.price?.value).find((v) => v != null);
  const used = recommendationScoringTestExports.productPrice(p);
  console.log(
    "  " +
      short(p.name).slice(0, 24).padEnd(26) +
      `$${rawOffer}`.padEnd(10) +
      (used === null ? "unverified" : `$${used}`).padEnd(11) +
      (sb.marketConfidenceTier || "?").padEnd(10) +
      `${rank(off, p.name)} / ${r1(sb.totalScore || 0)}`.padEnd(16) +
      `${rank(on, p.name)} / ${r1(onP?.scoreBreakdown?.totalScore || 0)}`,
  );
}

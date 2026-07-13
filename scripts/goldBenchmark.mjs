// GOLD BENCHMARK — the independent yardstick for "are the picks actually good?"
//
// FROZEN as leaders-v2026-07b. These lists are the ground truth the scorecard
// grades against; revisions require a new dated version and cannot be made to
// improve an observed score retroactively.
//
// Structure per BROAD query (the key change):
//   coreLeaders         - brands ReviewRadar should USUALLY discover. The main
//                         coverage score is measured against these only.
//   acceptableAlternates- legitimate good products that should NOT be scored as
//                         failures, but also should NOT substitute for core leaders.
//   wrongTypeTerms      - terms that indicate a WRONG product class; penalized if
//                         they appear in the final 7 (worse if they win Best Overall).
//   modelFamilies       - (deferred) the `lines` on each leader already act as light
//                         model hints; a fuller model-family map can come later so we
//                         never credit a brand for a random weak SKU.
//
// Matching: a product "covers" a leader if its name contains every brand token AND
// (no `lines`, or at least one line/model token). wrongTypeTerms match the product
// NAME as a substring (wrong TYPE is about what the product IS, not incidental text).
//
// IMPORTANT: benchmark data may be product-specific; the APP LOGIC must stay
// generalized. This file never feeds the pipeline — it only grades it.

// The ONE matching contract (also used by qualityScorecard.mjs and the frozen
// leader snapshots in docs/phase-6-market-leader-evaluation.md). A product
// name covers a leader iff it contains EVERY brand token AND (the leader has
// no lines, or at least one line/model token). Broad line tokens can never
// count without their brand.
export const normalizeLeaderText = (s) =>
  ` ${(s || "").toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim()} `;

export function coversLeader(name, item) {
  const hay = normalizeLeaderText(name);
  const brandTokens = normalizeLeaderText(item.brand).trim().split(" ");
  if (!brandTokens.every((t) => hay.includes(` ${t} `))) return false;
  if (!item.lines || item.lines.length === 0) return true;
  return item.lines.some((l) => hay.includes(normalizeLeaderText(l)));
}

export const GOLD = [
  // ======================= BROAD: "find the market leaders" =======================
  {
    id: "broad-robot-vacuum",
    type: "broad",
    query: "best robot vacuum",
    category: "robot vacuum",
    coreLeaders: [
      { brand: "roborock", lines: ["s8", "q5", "qrevo", "q revo", "s7", "q7"] },
      { brand: "roomba", lines: ["j7", "j9", "i7", "i3", "combo"] },
      { brand: "shark", lines: ["matrix", "ai", "iq", "detect"] },
      { brand: "eufy", lines: ["x10", "x8", "11s", "robovac", "clean"] },
      { brand: "ecovacs", lines: ["deebot", "t30", "x2", "n8"] },
      { brand: "narwal", lines: ["freo"] },
      { brand: "dreame", lines: ["l10", "x30", "l20", "d10"] },
    ],
    acceptableAlternates: [
      { brand: "dyson", lines: ["360"] },
    ],
    wrongTypeTerms: ["shop vac", "stick vacuum", "upright vacuum", "handheld", "dustbuster", "mop pad", "mop cloth", "replacement"],
  },
  {
    id: "broad-office-chair",
    type: "broad",
    query: "best office chair",
    category: "office chair",
    coreLeaders: [
      { brand: "herman miller", lines: ["aeron", "embody", "sayl", "cosm"] },
      { brand: "steelcase", lines: ["leap", "gesture", "series", "amia"] },
      { brand: "haworth", lines: ["fern", "zody"] },
      { brand: "branch", lines: ["ergonomic", "verve", "saddle"] },
      { brand: "hon", lines: ["ignition", "exposure"] },
      { brand: "humanscale", lines: ["freedom", "diffrient", "liberty"] },
      { brand: "knoll", lines: ["generation", "regeneration", "remix"] },
    ],
    acceptableAlternates: [
      { brand: "secretlab", lines: ["titan", "omega"] },
      { brand: "sihoo", lines: ["m18", "doro", "m57"] },
      { brand: "autonomous", lines: ["ergochair", "kinn"] },
    ],
    wrongTypeTerms: ["gaming chair", "chair mat", "seat cushion", "kneeling", "stool", "bar stool"],
  },
  {
    id: "broad-air-purifier",
    type: "broad",
    query: "best air purifier",
    category: "air purifier",
    coreLeaders: [
      { brand: "coway", lines: ["airmega", "1512", "mighty", "400s", "250"] },
      { brand: "levoit", lines: ["core", "400s", "600s", "vital", "300s"] },
      { brand: "blueair", lines: ["blue pure", "211", "311", "411"] },
      { brand: "winix", lines: ["5500", "5300", "am90", "c545"] },
      { brand: "honeywell", lines: ["hpa300", "hpa100", "hpa200", "hpa"] },
      { brand: "alen", lines: ["breathesmart", "75i", "45i"] },
      { brand: "dyson", lines: ["purifier", "tp", "hp", "bp"] },
    ],
    acceptableAlternates: [
      { brand: "austin air", lines: ["healthmate"] },
      { brand: "iqair", lines: ["healthpro", "atem"] },
    ],
    wrongTypeTerms: ["humidifier", "dehumidifier", "diffuser", "hvac filter", "furnace filter", "replacement filter"],
  },
  {
    id: "broad-gas-grill",
    type: "broad",
    query: "best gas grill",
    category: "gas grill",
    coreLeaders: [
      { brand: "weber", lines: ["spirit", "genesis", "summit"] },
      { brand: "napoleon", lines: ["rogue", "prestige", "phantom"] },
      { brand: "char-broil", lines: ["performance", "commercial", "signature"] },
      { brand: "broil king", lines: ["regal", "baron", "monarch", "imperial"] },
      { brand: "monument", lines: [] },
      { brand: "nexgrill", lines: [] },
      { brand: "dyna-glo", lines: [] },
    ],
    acceptableAlternates: [],
    wrongTypeTerms: ["charcoal", "pellet", "electric grill", "griddle", "grill cover", "grill parts", "smoker"],
  },
  {
    id: "broad-cordless-drill",
    type: "broad",
    query: "best cordless drill",
    category: "cordless drill",
    coreLeaders: [
      { brand: "dewalt", lines: ["20v", "atomic", "dcd", "xr"] },
      { brand: "milwaukee", lines: ["m18", "fuel", "m12"] },
      { brand: "makita", lines: ["xfd", "18v", "lxt", "xph"] },
      { brand: "bosch", lines: ["18v", "gsr", "profactor"] },
      { brand: "ryobi", lines: ["one+", "one plus", "hp"] },
      { brand: "craftsman", lines: ["v20", "cmcd"] },
      { brand: "ridgid", lines: ["octane", "18v", "r860"] },
    ],
    acceptableAlternates: [
      { brand: "skil", lines: ["pwrcore"] },
      { brand: "metabo hpt", lines: [] },
    ],
    wrongTypeTerms: ["drill bit", "impact driver", "corded", "screwdriver", "battery only", "charger only", "drill press"],
  },
  {
    id: "broad-toaster-oven",
    type: "broad",
    query: "best toaster oven air fryer",
    category: "toaster oven",
    coreLeaders: [
      { brand: "breville", lines: ["smart oven", "air fry", "joule", "bov"] },
      { brand: "cuisinart", lines: ["toa", "toa-60", "toa-65", "toa-70"] },
      { brand: "ninja", lines: ["foodi", "sp101", "dt"] },
      { brand: "panasonic", lines: ["flashxpress", "nb"] },
      { brand: "hamilton beach", lines: [] },
      { brand: "oster", lines: [] },
      { brand: "instant", lines: ["omni"] },
    ],
    acceptableAlternates: [
      { brand: "june", lines: ["oven"] },
      { brand: "wolf", lines: ["gourmet", "elite"] },
    ],
    wrongTypeTerms: ["slot toaster", "2 slice", "4 slice", "microwave", "air fryer basket", "replacement tray", "wall oven"],
  },
  {
    id: "broad-shop-vac",
    type: "broad",
    query: "best shop vac",
    category: "shop vac",
    coreLeaders: [
      { brand: "ridgid", lines: ["nxt", "wd", "hd"] },
      { brand: "vacmaster", lines: [] },
      { brand: "craftsman", lines: [] },
      { brand: "dewalt", lines: [] },
      { brand: "stanley", lines: [] },
      { brand: "shop vac", lines: [] },
      { brand: "workshop", lines: [] },
    ],
    acceptableAlternates: [
      { brand: "armor all", lines: [] },
      { brand: "milwaukee", lines: [] },
    ],
    wrongTypeTerms: ["robot vacuum", "upright vacuum", "stick vacuum", "dustbuster", "handheld", "filter only", "hose only", "accessory kit"],
  },
  {
    id: "broad-dog-feeder",
    type: "broad",
    query: "best automatic dog feeder",
    category: "automatic dog feeder",
    coreLeaders: [
      { brand: "petlibro", lines: ["granary", "polar", "air"] },
      { brand: "wopet", lines: [] },
      { brand: "petsafe", lines: ["smart feed", "healthy pet"] },
      { brand: "petkit", lines: ["fresh element", "yumshare"] },
      { brand: "arf pets", lines: [] },
      { brand: "veken", lines: [] },
      { brand: "honeyguaridan", lines: [] },
    ],
    acceptableAlternates: [
      { brand: "cat mate", lines: [] },
      { brand: "sure petcare", lines: ["surefeed"] },
    ],
    wrongTypeTerms: ["water fountain", "water dispenser", "treat camera", "slow feeder", "microchip", "bird feeder"],
  },

  // ================= CONSTRAINT: "match the hard requirements" =================
  // Scored on budget/feature/price confidence + no violations — NOT on broad brand
  // leadership (current price & feature availability matter more here).
  {
    id: "con-robot-vac-300-selfempty",
    type: "constraint",
    query: "robot vacuum",
    budget: "under $300",
    priorities: "self-emptying, good for pet hair",
    category: "robot vacuum",
    coreLeaders: [
      { brand: "shark", lines: ["matrix", "ai"] },
      { brand: "eufy", lines: ["clean", "x8", "self"] },
      { brand: "roborock", lines: ["q5"] },
      { brand: "roomba", lines: ["i3", "i4"] },
    ],
    wrongTypeTerms: ["handheld", "stick vacuum", "upright", "shop vac"],
    constraints: [
      { kind: "budget", max: 300 },
      { kind: "feature", label: "self-emptying", any: ["self-empt", "self empt", "auto-empt", "auto empt", "clean base", "self-clean"] },
    ],
  },
  {
    id: "con-office-chair-300-lumbar",
    type: "constraint",
    query: "office chair",
    budget: "under $300",
    priorities: "lumbar support, breathable",
    category: "office chair",
    coreLeaders: [
      { brand: "branch", lines: ["ergonomic"] },
      { brand: "sihoo", lines: [] },
      { brand: "hon", lines: ["ignition"] },
      { brand: "autonomous", lines: ["ergochair"] },
    ],
    wrongTypeTerms: ["gaming chair", "stool", "kneeling", "chair mat"],
    constraints: [
      { kind: "budget", max: 300 },
      { kind: "feature", label: "lumbar", any: ["lumbar"] },
    ],
  },
  {
    id: "con-gas-grill-600-4burner",
    type: "constraint",
    query: "gas grill",
    budget: "under $600",
    priorities: "4 burner, propane",
    category: "gas grill",
    coreLeaders: [
      { brand: "char-broil", lines: ["performance"] },
      { brand: "monument", lines: [] },
      { brand: "nexgrill", lines: [] },
      { brand: "dyna-glo", lines: [] },
    ],
    wrongTypeTerms: ["charcoal", "pellet", "griddle", "smoker", "tabletop"],
    constraints: [
      { kind: "budget", max: 600 },
      { kind: "feature", label: "4-burner", any: ["4 burner", "4-burner", "four burner"] },
      { kind: "feature", label: "propane", any: ["propane", "liquid propane", "lp gas"] },
    ],
  },
  {
    id: "con-air-purifier-large-hepa",
    type: "constraint",
    query: "air purifier",
    priorities: "for allergies, large room, true HEPA",
    category: "air purifier",
    coreLeaders: [
      { brand: "coway", lines: ["400s", "airmega"] },
      { brand: "levoit", lines: ["600s", "vital"] },
      { brand: "alen", lines: ["75i", "breathesmart"] },
      { brand: "blueair", lines: ["211"] },
    ],
    wrongTypeTerms: ["humidifier", "dehumidifier", "diffuser"],
    constraints: [
      { kind: "feature", label: "HEPA", any: ["hepa"] },
      { kind: "feature", label: "large room", any: ["large room", "sq ft", "sq. ft", "square feet", "1000", "1500"] },
    ],
  },
  {
    id: "con-cordless-drill-150-brushless",
    type: "constraint",
    query: "cordless drill",
    budget: "under $150",
    priorities: "brushless",
    category: "cordless drill",
    coreLeaders: [
      { brand: "dewalt", lines: ["atomic", "20v"] },
      { brand: "ryobi", lines: ["one+", "hp"] },
      { brand: "craftsman", lines: ["v20"] },
      { brand: "skil", lines: [] },
    ],
    wrongTypeTerms: ["corded", "impact driver", "drill bit", "drill press"],
    constraints: [
      { kind: "budget", max: 150 },
      { kind: "feature", label: "brushless", any: ["brushless"] },
    ],
  },
  {
    id: "con-dog-feeder-80",
    type: "constraint",
    query: "automatic dog feeder",
    budget: "under $80",
    priorities: "scheduled meals",
    category: "automatic dog feeder",
    coreLeaders: [
      { brand: "petlibro", lines: ["granary"] },
      { brand: "wopet", lines: [] },
      { brand: "arf pets", lines: [] },
      { brand: "honeyguaridan", lines: [] },
      { brand: "petsafe", lines: [] },
    ],
    wrongTypeTerms: ["water fountain", "bird feeder", "slow feeder"],
    constraints: [
      { kind: "budget", max: 80 },
    ],
  },
];

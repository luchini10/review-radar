import type { RecommendationApiRequest } from "@/types/review-radar";
import type { SelectedSmartFeature } from "@/types/smart-features";
import { baseProductCategoryFromQuery } from "../productCategory.ts";
import { selectedSmartFeatureSearchText } from "../smartFeatureSelection.ts";

export type CategoryGroup =
  | "appliances"
  | "automotive"
  | "baby"
  | "beauty"
  | "clothing"
  | "electronics"
  | "furniture"
  | "general"
  | "home_improvement"
  | "outdoor"
  | "pet"
  | "shoes"
  | "tools";

export type DirectRetailerEngine = "home_depot" | "walmart";

export type SourcePack = {
  expertReviewDomains: string[];
  manufacturerDomains: string[];
  ownerDiscussionDomains: string[];
  retailerDomains: string[];
  directRetailerEngines: DirectRetailerEngine[];
};

export type SearchDepth = "dev" | "standard" | "deep";

export type SearchDepthConfig = {
  depth: SearchDepth;
  maxGoogleShoppingQueries: number;
  maxGoogleOrganicQueries: number;
  maxRetailerDomainQueries: number;
  maxDirectRetailerQueries: number;
  maxEnrichedProducts: number;
  maxRawCandidates: number;
};

export const SOURCE_PACKS: Record<CategoryGroup, SourcePack> = {
  appliances: {
    expertReviewDomains: [
      "consumerreports.org",
      "wirecutter.com",
      "goodhousekeeping.com",
      "cnet.com",
      "tomsguide.com",
    ],
    manufacturerDomains: ["geappliances.com", "lg.com", "samsung.com", "whirlpool.com"],
    ownerDiscussionDomains: ["reddit.com", "houzz.com"],
    retailerDomains: [
      "ajmadison.com",
      "bestbuy.com",
      "homedepot.com",
      "lowes.com",
      "costco.com",
      "appliancesconnection.com",
      "walmart.com",
    ],
    directRetailerEngines: ["home_depot"],
  },
  automotive: {
    expertReviewDomains: ["caranddriver.com", "motortrend.com", "edmunds.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "autozone.com",
      "advanceautoparts.com",
      "oreillyauto.com",
      "tirerack.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: [],
  },
  baby: {
    expertReviewDomains: ["babygearlab.com", "wirecutter.com", "whattoexpect.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com", "babycenter.com"],
    retailerDomains: [
      "babylist.com",
      "potterybarnkids.com",
      "albeebaby.com",
      "target.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: [],
  },
  beauty: {
    expertReviewDomains: ["allure.com", "byrdie.com", "wirecutter.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "sephora.com",
      "ulta.com",
      "dermstore.com",
      "target.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: [],
  },
  clothing: {
    expertReviewDomains: ["wirecutter.com", "outdoorgearlab.com", "reviewed.usatoday.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "nordstrom.com",
      "macys.com",
      "rei.com",
      "target.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: [],
  },
  electronics: {
    expertReviewDomains: [
      "rtings.com",
      "wirecutter.com",
      "tomshardware.com",
      "tomsguide.com",
      "cnet.com",
      "pcmag.com",
    ],
    manufacturerDomains: ["dell.com", "hp.com", "lenovo.com", "lg.com", "samsung.com", "sony.com"],
    ownerDiscussionDomains: ["reddit.com", "avsforum.com"],
    retailerDomains: [
      "bestbuy.com",
      "bhphotovideo.com",
      "newegg.com",
      "microcenter.com",
      "crutchfield.com",
      "amazon.com",
      "target.com",
      "walmart.com",
    ],
    directRetailerEngines: [],
  },
  furniture: {
    expertReviewDomains: [
      "wirecutter.com",
      "apartmenttherapy.com",
      "thespruce.com",
      "livingetc.com",
      "goodhousekeeping.com",
    ],
    manufacturerDomains: ["article.com", "ikea.com", "westelm.com", "potterybarn.com"],
    ownerDiscussionDomains: ["reddit.com", "houzz.com"],
    retailerDomains: [
      "wayfair.com",
      "ashleyfurniture.com",
      "ikea.com",
      "article.com",
      "westelm.com",
      "potterybarn.com",
      "roomstogo.com",
      "homedepot.com",
      "lowes.com",
      "costco.com",
      "target.com",
      "walmart.com",
    ],
    directRetailerEngines: [],
  },
  general: {
    expertReviewDomains: ["wirecutter.com", "reviewed.usatoday.com", "consumerreports.org"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: ["amazon.com", "walmart.com", "target.com"],
    directRetailerEngines: [],
  },
  home_improvement: {
    expertReviewDomains: ["thespruce.com", "bobvila.com", "wirecutter.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com", "garagejournal.com"],
    retailerDomains: [
      "homedepot.com",
      "lowes.com",
      "acehardware.com",
      "build.com",
      "amazon.com",
      "walmart.com",
    ],
    directRetailerEngines: ["home_depot"],
  },
  outdoor: {
    expertReviewDomains: ["outdoorgearlab.com", "switchbacktravel.com", "wirecutter.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "rei.com",
      "backcountry.com",
      "basspro.com",
      "cabelas.com",
      "dickssportinggoods.com",
      "homedepot.com",
      "lowes.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: ["home_depot"],
  },
  pet: {
    expertReviewDomains: ["thesprucepets.com", "wirecutter.com", "petmd.com"],
    manufacturerDomains: [],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "chewy.com",
      "petsmart.com",
      "petco.com",
      "petflow.com",
      "amazon.com",
      "walmart.com",
      "target.com",
    ],
    directRetailerEngines: [],
  },
  shoes: {
    expertReviewDomains: ["runrepeat.com", "outdoorgearlab.com", "wirecutter.com"],
    manufacturerDomains: ["nike.com", "adidas.com", "newbalance.com", "asics.com"],
    ownerDiscussionDomains: ["reddit.com"],
    retailerDomains: [
      "zappos.com",
      "nike.com",
      "adidas.com",
      "dickssportinggoods.com",
      "rei.com",
      "nordstrom.com",
      "target.com",
      "walmart.com",
      "amazon.com",
    ],
    directRetailerEngines: [],
  },
  tools: {
    expertReviewDomains: ["protoolreviews.com", "toolguyd.com", "wirecutter.com"],
    manufacturerDomains: ["dewalt.com", "milwaukeetool.com", "makitatools.com", "ryobitools.com"],
    ownerDiscussionDomains: ["reddit.com", "garagejournal.com"],
    retailerDomains: [
      "homedepot.com",
      "lowes.com",
      "acehardware.com",
      "harborfreight.com",
      "northerntool.com",
      "grainger.com",
      "amazon.com",
      "walmart.com",
    ],
    directRetailerEngines: ["home_depot"],
  },
};

export const SEARCH_DEPTH_CONFIGS: Record<SearchDepth, SearchDepthConfig> = {
  deep: {
    depth: "deep",
    maxGoogleShoppingQueries: 5,
    maxGoogleOrganicQueries: 3,
    maxRetailerDomainQueries: 6,
    maxDirectRetailerQueries: 3,
    maxEnrichedProducts: 15,
    maxRawCandidates: 100,
  },
  dev: {
    depth: "dev",
    maxGoogleShoppingQueries: 3,
    maxGoogleOrganicQueries: 1,
    maxRetailerDomainQueries: 3,
    maxDirectRetailerQueries: 1,
    maxEnrichedProducts: 6,
    maxRawCandidates: 50,
  },
  standard: {
    depth: "standard",
    maxGoogleShoppingQueries: 3,
    maxGoogleOrganicQueries: 2,
    maxRetailerDomainQueries: 4,
    maxDirectRetailerQueries: 2,
    maxEnrichedProducts: 10,
    maxRawCandidates: 75,
  },
};

const categoryTerms: Record<CategoryGroup, string[]> = {
  appliances: [
    "vacuum",
    "stick vacuum",
    "cordless vacuum",
    "washer",
    "dryer",
    "refrigerator",
    "fridge",
    "microwave",
    "dishwasher",
    "air fryer",
    "oven",
    "range",
  ],
  automotive: ["car", "truck", "auto", "tire", "battery", "jump starter", "dash cam"],
  baby: ["stroller", "crib", "car seat", "diaper", "baby monitor", "high chair"],
  beauty: ["makeup", "skincare", "hair dryer", "curling iron", "shaver", "serum"],
  clothing: ["shirt", "jacket", "pants", "jeans", "dress", "hoodie", "coat"],
  electronics: ["monitor", "laptop", "tv", "television", "headphones", "keyboard", "mouse", "speaker", "tablet"],
  furniture: [
    "couch",
    "sofa",
    "sleeper sofa",
    "pull out couch",
    "loveseat",
    "sectional",
    "chair",
    "desk",
    "computer desk",
    "writing desk",
    "dresser",
    "mattress",
  ],
  general: [],
  home_improvement: ["paint", "flooring", "faucet", "toilet", "vanity", "lighting", "ceiling fan"],
  outdoor: [
    "baseball glove",
    "baseball mitt",
    "bike",
    "cooler",
    "fishing rod",
    "generator",
    "golf club",
    "grill",
    "lawn mower",
    "patio",
    "sporting goods",
    "tent",
    "backpack",
  ],
  pet: ["dog food", "cat food", "dog bed", "crate", "leash", "litter", "pet"],
  shoes: [
    "shoes",
    "sneakers",
    "footwear",
    "basketball shoes",
    "basketball sneakers",
    "running shoes",
    "walking shoes",
    "boots",
    "sandals",
  ],
  tools: ["drill", "saw", "socket set", "impact wrench", "sander", "tool", "wrench", "driver"],
};

const categorySynonyms: Record<string, string[]> = {
  couch: ["couch", "sofa", "sleeper sofa", "pull out couch", "loveseat"],
  "baseball glove": ["baseball glove", "baseball mitt", "infield glove", "outfield glove"],
  "basketball shoes": [
    "basketball shoes",
    "basketball sneakers",
    "basketball footwear",
  ],
  desk: ["desk", "computer desk", "writing desk", "desk with drawers"],
  microwave: ["microwave", "microwave oven", "countertop microwave"],
  monitor: ["monitor", "display", "screen"],
  oven: ["oven", "gas range", "freestanding gas range", "range", "stove"],
  refrigerator: ["refrigerator", "fridge", "compact refrigerator", "full size refrigerator"],
  "running shoes": ["running shoes", "running sneakers", "road running shoes"],
  shoes: ["shoes", "sneakers", "footwear"],
  vacuum: ["vacuum", "stick vacuum", "cordless vacuum", "cordless stick vacuum"],
  "walking shoes": ["walking shoes", "walking sneakers", "comfortable walking shoes"],
};

const colorWords = [
  "beige",
  "black",
  "blue",
  "brown",
  "charcoal",
  "cream",
  "gray",
  "grey",
  "green",
  "ivory",
  "navy",
  "red",
  "tan",
  "taupe",
  "white",
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCategoryGroup(category: string): CategoryGroup {
  const normalized = normalize(baseProductCategoryFromQuery(category));

  for (const [group, terms] of Object.entries(categoryTerms) as Array<
    [CategoryGroup, string[]]
  >) {
    if (group === "general") {
      continue;
    }

    if (terms.some((term) => normalized.includes(normalize(term)))) {
      return group;
    }
  }

  return "general";
}

export function getSourcePack(categoryGroup: CategoryGroup) {
  return SOURCE_PACKS[categoryGroup] || SOURCE_PACKS.general;
}

export function getSearchDepthConfig(value = process.env.SEARCH_DEPTH) {
  // Default to the documented "standard" depth in production so unset
  // SEARCH_DEPTH does not silently limit discovery coverage. Local and test
  // runs keep the cheaper "dev" depth to save Serper credits.
  const fallbackDepth =
    process.env.NODE_ENV === "production" ? "standard" : "dev";
  const normalized = normalize(value || fallbackDepth) as SearchDepth;

  return SEARCH_DEPTH_CONFIGS[normalized] || SEARCH_DEPTH_CONFIGS.standard;
}

function selectedFeatureValues(selectedFeatures: SelectedSmartFeature[] | undefined) {
  return (selectedFeatures || [])
    .map(selectedSmartFeatureSearchText)
    .filter(Boolean);
}

function requiredBrandValues(input: RecommendationApiRequest) {
  return Array.from(
    new Set(
      (input.extractedRequirements?.brandConstraints || [])
        .map((constraint) => constraint.value)
        .filter(Boolean),
    ),
  );
}

function inlineColorValues(value: string | undefined) {
  const normalized = normalize(value || "");

  return colorWords.filter((color) =>
    new RegExp(`(^|\\W)${color.replace(/\s+/g, "\\s+")}(\\W|$)`, "i").test(
      normalized,
    ),
  );
}

function budgetText(value: string | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(/\$?\s*([\d,]+(?:\.\d+)?)/);

  if (!match?.[1]) {
    return value.trim();
  }

  return `under ${match[1].replace(/,/g, "")}`;
}

function requestBudgetText(input: RecommendationApiRequest) {
  return budgetText(input.budget) || budgetText(input.query);
}

function sizeText(value: string | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(
    /\b(?:under|less than|below|no bigger than|no larger than|at most|max|maximum)\s*(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")/i,
  );

  return match?.[1] ? `under ${match[1]} inches` : "";
}

function bestRetailerBaseQuery(input: RecommendationApiRequest) {
  const baseCategory = baseProductCategoryFromQuery(input.query);
  const normalized = normalize(baseCategory);
  const synonyms = Object.entries(categorySynonyms).find(([key]) =>
    normalized.includes(key),
  )?.[1];
  const category = synonyms?.[1] || baseCategory;
  const features = Array.from(
    new Set([
      ...requiredBrandValues(input),
      ...selectedFeatureValues(input.selectedFeatures),
      ...inlineColorValues(input.query),
    ]),
  ).join(" ");
  const size = sizeText(input.priorities) || sizeText(input.query);
  const budget = requestBudgetText(input);

  return [category, features, size, budget].filter(Boolean).join(" ");
}

export function generateRetailerDomainQueries(
  input: RecommendationApiRequest,
  categoryGroup: CategoryGroup,
  config: SearchDepthConfig,
) {
  const sourcePack = getSourcePack(categoryGroup);
  const baseQuery = bestRetailerBaseQuery(input);

  return sourcePack.retailerDomains
    .slice(0, config.maxRetailerDomainQueries)
    .map((domain) => `site:${domain} ${baseQuery}`)
    .filter((query) => query.trim().length > 0);
}

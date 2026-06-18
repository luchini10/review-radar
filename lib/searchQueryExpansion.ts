import {
  detectCategoryGroup,
  getSearchDepthConfig,
  getSourcePack,
} from "./search/sourcePacks.ts";
import { extractStructuredRequirements, getPremiumCap } from "./requirementExtraction.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { selectedSmartFeatureSearchText } from "./smartFeatureSelection.ts";
import type {
  RecommendationApiRequest,
  SearchPlan,
  SearchQueryCandidate,
  SearchQueryFamily,
  SearchQueryStage,
  StructuredRequirements,
} from "@/types/review-radar";
import type { SelectedSmartFeature } from "@/types/smart-features";

const synonymGroups: Record<string, string[]> = {
  couch: ["couch", "sofa", "sofa bed", "sleeper sofa", "loveseat sleeper"],
  "baseball glove": [
    "baseball glove",
    "baseball mitt",
    "infield glove",
    "outfield glove",
    "youth baseball glove",
  ],
  drill: ["drill", "cordless drill", "drill driver", "20v drill", "brushless drill"],
  desk: ["desk", "computer desk", "writing desk", "office desk", "desk with drawers"],
  headphones: ["headphones", "wireless headphones", "noise cancelling headphones"],
  laptop: ["laptop", "notebook", "ultrabook"],
  microwave: ["microwave", "microwave oven", "countertop microwave", "compact microwave"],
  monitor: ["monitor", "display", "computer monitor", "4k monitor"],
  oven: [
    "oven",
    "range",
    "gas range",
    "freestanding gas range",
    "stove",
    "gas stove",
  ],
  "pull out couch": [
    "pull out couch",
    "sleeper sofa",
    "sofa bed",
    "pull out loveseat",
    "loveseat sleeper",
  ],
  refrigerator: [
    "refrigerator",
    "fridge",
    "compact refrigerator",
    "full size refrigerator",
    "retro refrigerator",
    "counter depth refrigerator",
  ],
  sofa: ["sofa", "couch", "sofa bed", "sleeper sofa", "loveseat sleeper"],
  "stick vacuum": ["stick vacuum", "cordless stick vacuum", "cordless vacuum", "lightweight vacuum"],
  "basketball shoes": [
    "basketball shoes",
    "basketball sneakers",
    "basketball footwear",
    "basketball performance shoes",
  ],
  "running shoes": ["running shoes", "running sneakers", "road running shoes", "trainers"],
  "walking shoes": ["walking shoes", "walking sneakers", "comfortable walking shoes", "walking footwear"],
  shoes: ["shoes", "sneakers", "footwear"],
  vacuum: ["vacuum", "cordless vacuum", "stick vacuum", "pet hair vacuum", "upright vacuum"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const value of values) {
    const normalizedKey = normalize(key(value));

    if (!normalizedKey || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    output.push(value);
  }

  return output;
}

function compact(values: Array<string | undefined>) {
  return values.map((value) => value?.trim() || "").filter(Boolean);
}

function phrase(values: Array<string | undefined>) {
  return compact(values).join(" ");
}

function getCategorySynonyms(category: string) {
  const normalizedCategory = normalize(category);

  if (synonymGroups[normalizedCategory]) {
    return synonymGroups[normalizedCategory];
  }

  for (const [key, synonyms] of Object.entries(synonymGroups)) {
    if (normalizedCategory.includes(key)) {
      return unique([category, ...synonyms], (value) => value);
    }
  }

  return [category];
}

function selectedFeatureValues(selectedFeatures: SelectedSmartFeature[] | undefined) {
  return (selectedFeatures || [])
    .map(selectedSmartFeatureSearchText)
    .filter(Boolean);
}

function selectedFeatureKeywordValues(
  selectedFeatures: Array<SelectedSmartFeature | string> | undefined,
) {
  return (selectedFeatures || [])
    .map((feature) => {
      if (typeof feature === "string") {
        const [, ...rest] = feature.split(":");

        return (rest.join(":") || feature).trim();
      }

      if (feature.operator === "required" && feature.value === true) {
        return feature.name;
      }

      const value = Array.isArray(feature.value)
        ? `${feature.value[0]} to ${feature.value[1]}`
        : String(feature.value);
      const normalizedName = normalize(feature.name);
      const unit = feature.unit ? ` ${feature.unit}` : "";

      if (feature.operator === "lte") {
        return `${feature.name} under ${value}${unit}`;
      }

      if (feature.operator === "gte") {
        return `${feature.name} at least ${value}${unit}`;
      }

      if (
        normalizedName.includes("color") ||
        normalizedName.includes("finish") ||
        normalizedName.includes("fuel") ||
        normalizedName.includes("material")
      ) {
        return `${value}${unit}`.trim();
      }

      return `${feature.name} ${value}${unit}`.trim();
    })
    .filter(Boolean);
}

function budgetPhrase(input: RecommendationApiRequest) {
  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);
  const amount = requirements.budgetRules[0]?.amount;

  if (amount) {
    return `under $${amount}`;
  }

  if (!input.budget) {
    return "";
  }

  const match = input.budget.match(/\$?\s*([\d,]+(?:\.\d+)?)/);

  return match?.[1] ? `under $${match[1]}` : input.budget.trim();
}

function premiumBudgetPhrase(input: RecommendationApiRequest) {
  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);
  const amount = requirements.budgetRules[0]?.amount;
  const premiumCap =
    requirements.budgetRules[0]?.premiumCap ||
    getPremiumCap(amount || null, baseProductCategoryFromQuery(input.query));

  return premiumCap ? `under $${premiumCap}` : "";
}

function sizePhrases(requirements: StructuredRequirements | undefined) {
  return (requirements?.sizeConstraints || []).map((constraint) => {
    const dimension =
      constraint.dimension === "depth"
        ? "deep"
        : constraint.dimension === "height"
          ? "tall"
          : constraint.dimension === "length"
            ? "long"
            : "wide";
    const unit = constraint.unit === "ft" ? "ft" : "inches";

    return constraint.operator === "max"
      ? `under ${constraint.value} ${unit} ${dimension}`
      : constraint.dimension === "length"
        ? `${constraint.value} ${unit} ${dimension}`
        : `at least ${constraint.value} ${unit} ${dimension}`;
  });
}

// Phase 4 gate: spec phrases (e.g. "600 CFM", "battery included") are injected
// into discovery queries only when enabled, so default search behavior is
// unchanged until the flag is flipped.
function specSearchEnabled() {
  return process.env.REVIEW_RADAR_SPEC_SEARCH === "on";
}

function specSearchPhrases(input: RecommendationApiRequest) {
  if (!specSearchEnabled()) {
    return [];
  }

  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);

  return (requirements.specConstraints || [])
    .map((constraint) =>
      constraint.kind === "boolean"
        ? constraint.value === 1
          ? constraint.label.toLowerCase()
          : ""
        : `${constraint.value} ${constraint.unit || ""}`.trim(),
    )
    .filter(Boolean);
}

function hardRequirementPhrases(input: RecommendationApiRequest) {
  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);
  const baseCategory = normalize(baseProductCategoryFromQuery(input.query));
  const structured = [
    ...(requirements?.requiredConstraints || [])
      .filter((constraint) => constraint.type !== "budget")
      .map((constraint) => constraint.value),
    ...sizePhrases(requirements),
    ...specSearchPhrases(input),
  ];

  return unique(
    [...structured, ...selectedFeatureValues(input.selectedFeatures)],
    (value) => value,
  )
    .filter((value) => {
      const normalizedValue = normalize(value);

      return (
        !normalizedValue ||
        !new RegExp(`(^|\\W)${normalizedValue.replace(/\s+/g, "\\s+")}(\\W|$)`, "i").test(
          baseCategory,
        )
      );
    })
    .slice(0, 6);
}

function keyRequirementPhrases(input: RecommendationApiRequest) {
  return hardRequirementPhrases(input)
    .map((value) =>
      value
        .replace(/^Color:\s*/i, "")
        .replace(/^Feature:\s*/i, "")
        .replace(/^Finish:\s*/i, "")
        .replace(/^Finish Color:\s*/i, "")
        .replace(/^Fuel type:\s*/i, "")
        .replace(/^Finish\s+/i, "")
        .replace(/^Finish Color\s+/i, "")
        .replace(/^Fuel type\s+/i, "")
        .replace(/^Material:\s*/i, "")
        .trim(),
    )
    .filter(Boolean);
}

function searchRequirementPhrases(input: RecommendationApiRequest) {
  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);

  return unique(
    [
      ...selectedFeatureKeywordValues(input.selectedFeatures),
      ...(requirements.requiredConstraints || [])
        .filter((constraint) => constraint.type !== "budget")
        .map((constraint) => constraint.value),
      ...sizePhrases(requirements),
      ...specSearchPhrases(input),
    ],
    (value) => value,
  ).slice(0, 6);
}

function preferencePhrases(input: RecommendationApiRequest) {
  const requirements =
    input.extractedRequirements || extractStructuredRequirements(input);

  return (requirements.preferredConstraints || [])
    .map((constraint) => constraint.value)
    .filter(Boolean)
    .slice(0, 4);
}

function avoidPhrases(input: RecommendationApiRequest) {
  return (input.extractedRequirements?.avoidConstraints || [])
    .map((constraint) => constraint.value)
    .slice(0, 4);
}

function sourceDomainQuery(domain: string, query: string) {
  return domain ? `site:${domain} ${query}`.replace(/\s+/g, " ").trim() : query;
}

function omitPhrasesAlreadyInBase(phrases: string[], base: string) {
  const normalizedBase = normalize(base);

  return phrases.filter((value) => {
    const normalizedValue = normalize(value);

    return normalizedValue && !normalizedBase.includes(normalizedValue);
  });
}

function addQuery(
  queries: SearchQueryCandidate[],
  stage: SearchQueryStage,
  family: SearchQueryFamily,
  query: string,
) {
  const clean = query.replace(/\s+/g, " ").trim();

  if (!clean) {
    return;
  }

  queries.push({
    family,
    query: clean,
    stage,
  });
}

export function generateSearchPlan(input: RecommendationApiRequest): SearchPlan {
  const category = baseProductCategoryFromQuery(input.query);
  const categoryGroup = detectCategoryGroup(category);
  const sourcePack = getSourcePack(categoryGroup);
  const config = getSearchDepthConfig();
  const synonyms = getCategorySynonyms(category);
  const hardPhrases = hardRequirementPhrases(input);
  const searchPhrases = searchRequirementPhrases(input);
  const keyRequirements = keyRequirementPhrases(input);
  const preferences = preferencePhrases(input);
  const features = selectedFeatureValues(input.selectedFeatures);
  const budget = budgetPhrase(input);
  const premiumBudget = premiumBudgetPhrase(input);
  const avoid = avoidPhrases(input);
  const primaryFeature = features[0] || hardPhrases[0] || "";
  const secondFeature = features[1] || hardPhrases[1] || "";
  const primaryRequirement = keyRequirements[0] || primaryFeature;
  const secondRequirement = keyRequirements[1] || secondFeature;
  const hardText = hardPhrases.join(" ");
  const searchText = searchPhrases.join(" ");
  const preferenceText = preferences.join(" ");
  const normalizedCategory = normalize(category);
  const normalizedSearchText = normalize(searchText);
  const ovenGasBase =
    normalizedCategory.includes("oven") && normalizedSearchText.includes("gas")
      ? "gas range"
      : synonyms[1] || category;
  const baseSearchPhrases = omitPhrasesAlreadyInBase(searchPhrases, ovenGasBase);
  const baseSearchText = baseSearchPhrases.join(" ") || searchText || hardText;
  const primaryBaseRequirement =
    normalize(ovenGasBase).includes(normalize(primaryRequirement))
      ? secondRequirement
      : primaryRequirement;
  const productBase = phrase([ovenGasBase, baseSearchText, preferenceText, budget]);
  const reviewBase = phrase([ovenGasBase, baseSearchText, preferenceText]);
  const retailerQueries = sourcePack.retailerDomains
    .slice(0, config.maxRetailerDomainQueries)
    .map((domain, index) => ({
      family: "retailer_domain" as const,
      query: sourceDomainQuery(domain, productBase),
      stage: (index < 3 ? 1 : index < 5 ? 2 : 3) as SearchQueryStage,
    }));
  const queries: SearchQueryCandidate[] = [];

  addQuery(queries, 1, "canonical_shopping", phrase([category, searchText || hardText, preferenceText, budget]));
  addQuery(queries, 1, "canonical_shopping", phrase([ovenGasBase, primaryBaseRequirement, budget]));
  addQuery(queries, 1, "hard_filter", phrase([primaryRequirement, category, budget]));
  addQuery(queries, 1, "hard_filter", phrase([secondRequirement, ovenGasBase, budget]));
  addQuery(
    queries,
    1,
    "synonym",
    phrase([
      normalize(synonyms[2] || category).includes(normalize(primaryRequirement))
        ? secondRequirement
        : primaryRequirement,
      synonyms[2] || category,
      budget,
    ]),
  );
  if (ovenGasBase === "gas range") {
    addQuery(queries, 1, "canonical_shopping", phrase(["stainless steel gas range", budget]));
    addQuery(queries, 2, "canonical_shopping", phrase(["freestanding gas range", baseSearchText, budget]));
    addQuery(queries, 2, "canonical_shopping", phrase(["gas stove", baseSearchText, budget]));
  }
  addQuery(queries, 1, "canonical_shopping", phrase([synonyms[3] || category, primaryBaseRequirement, "sale", budget]));
  queries.push(...retailerQueries.filter((query) => query.stage === 1));
  addQuery(queries, 1, "canonical_shopping", phrase([category, "product page", searchText || hardText, preferenceText]));

  queries.push(...retailerQueries.filter((query) => query.stage === 2));
  addQuery(queries, 2, "owner_experience", phrase([synonyms[1] || category, "reddit", searchText || hardText]));
  addQuery(queries, 2, "owner_experience", phrase([synonyms[1] || category, "YouTube review", primaryBaseRequirement]));
  addQuery(
    queries,
    2,
    "editorial_review",
    sourceDomainQuery(sourcePack.expertReviewDomains[0] || "", phrase(["best", reviewBase, budget])),
  );
  addQuery(
    queries,
    2,
    "owner_experience",
    sourceDomainQuery(sourcePack.ownerDiscussionDomains[0] || "", phrase([reviewBase, "owner reviews", avoid.join(" ")])),
  );
  addQuery(queries, 2, "canonical_shopping", phrase([synonyms[4] || synonyms[3] || category, "best value", budget]));
  addQuery(queries, 2, "canonical_shopping", phrase([synonyms[1] || category, "premium best quality", premiumBudget]));

  queries.push(...retailerQueries.filter((query) => query.stage === 3));
  addQuery(queries, 3, "editorial_review", phrase([synonyms[1] || category, "complaints problems long term"]));
  addQuery(
    queries,
    3,
    "fallback",
    sourceDomainQuery(sourcePack.manufacturerDomains[0] || "", phrase([reviewBase, "official specs"])),
  );
  addQuery(queries, 3, "fallback", phrase([synonyms[2] || category, "top rated", primaryBaseRequirement]));
  addQuery(queries, 3, "fallback", phrase([category, "dimensions specs", searchText || hardText]));

  const uniqueQueries = unique(queries, (item) => item.query);
  const pass1 = uniqueQueries.filter((query) => query.stage === 1).slice(0, 8);
  const pass2 = uniqueQueries.filter((query) => query.stage === 2).slice(0, 6);
  const pass3 = uniqueQueries.filter((query) => query.stage === 3).slice(0, 4);
  const allQueries = [...pass1, ...pass2, ...pass3];

  return {
    categoryGroup,
    queries: allQueries,
    stagedQueries: {
      pass1,
      pass2,
      pass3,
    },
  };
}

export function generateSearchQueries(input: RecommendationApiRequest) {
  return generateSearchPlan(input).queries.map((query) => query.query);
}

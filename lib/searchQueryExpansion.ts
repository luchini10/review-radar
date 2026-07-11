import {
  detectCategoryGroup,
  getSearchDepthConfig,
  getSourcePack,
} from "./search/sourcePacks.ts";
import { extractStructuredRequirements, getPremiumCap } from "./requirementExtraction.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import { selectedSmartFeatureSearchText } from "./smartFeatureSelection.ts";
import type { SearchPlanObservabilityObserver } from "./searchObservabilityTypes.ts";
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
  "toaster oven": [
    "toaster oven",
    "countertop toaster oven",
    "countertop convection oven",
    "air fryer toaster oven",
  ],
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

function constraintAllocationEnabled() {
  return process.env.REVIEW_RADAR_CONSTRAINT_ALLOCATION === "on";
}

function getCategorySynonyms(category: string) {
  const normalizedCategory = normalize(category);

  if (synonymGroups[normalizedCategory]) {
    return synonymGroups[normalizedCategory];
  }

  const matchingGroup = Object.entries(synonymGroups)
    .filter(([key]) => normalizedCategory.includes(key))
    .sort((first, second) => second[0].length - first[0].length)[0];

  if (matchingGroup) {
    // R4 (RR-075, flag-gated): the category matched a parent group by
    // inclusion, meaning it carries a subtype the parent synonyms drop
    // ("robot vacuum" -> "cordless vacuum"). Those diluted forms consume
    // protected Shopping slots with wrong product types, so constraint
    // allocation keeps only the shopper's own category. Exact-key groups
    // above keep their full breadth.
    if (constraintAllocationEnabled()) {
      return [category];
    }

    const [, synonyms] = matchingGroup;

    return unique([category, ...synonyms], (value) => value);
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
  observer: SearchPlanObservabilityObserver | undefined,
  stage: SearchQueryStage,
  family: SearchQueryFamily,
  query: string,
) {
  const clean = query.replace(/\s+/g, " ").trim();

  if (!clean) {
    return;
  }

  const candidate: SearchQueryCandidate = {
    family,
    query: clean,
    stage,
  };
  const queryId = observer?.registerSearchQuery({
    origin: "deterministic_plan",
    phase: "deterministic_plan_assembly",
    query: clean,
    family,
    stage,
    sourceDetail: family,
  });

  queries.push(observer?.attachSearchQueryId(candidate, queryId) || candidate);
}

export function generateSearchPlan(
  input: RecommendationApiRequest,
  observer?: SearchPlanObservabilityObserver,
): SearchPlan {
  const category = baseProductCategoryFromQuery(input.query);
  const categoryGroup = detectCategoryGroup(category);
  const sourcePack = getSourcePack(categoryGroup);
  const config = getSearchDepthConfig();
  const synonyms = getCategorySynonyms(category);
  const hardPhrases = hardRequirementPhrases(input);
  const searchPhrases = searchRequirementPhrases(input);
  const keyRequirements = keyRequirementPhrases(input);
  const rawPreferences = preferencePhrases(input);
  // A preference already contained by the product category is not a distinct
  // shopper constraint. Keeping it would duplicate the category text and make
  // every category query look constraint-bearing, masking other preferences.
  const preferences = constraintAllocationEnabled()
    ? omitPhrasesAlreadyInBase(rawPreferences, category)
    : rawPreferences;
  const features = selectedFeatureValues(input.selectedFeatures);
  const budget = budgetPhrase(input);
  const premiumBudget = premiumBudgetPhrase(input);
  const avoid = avoidPhrases(input);
  // R4 (RR-073, flag-gated): preferred details fill the requirement slots
  // when no hard requirement exists, so a standalone Important Detail like
  // "self-emptying" shapes the constraint-bearing queries.
  const preferredFallbacks = constraintAllocationEnabled() ? preferences : [];
  const primaryFeature =
    features[0] || hardPhrases[0] || preferredFallbacks[0] || "";
  const secondFeature =
    features[1] || hardPhrases[1] || preferredFallbacks[1] || "";
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
    .map((domain, index) => {
      const candidate = {
        family: "retailer_domain" as const,
        query: sourceDomainQuery(domain, productBase),
        stage: (index < 3 ? 1 : index < 5 ? 2 : 3) as SearchQueryStage,
      };
      const queryId = observer?.registerSearchQuery({
        origin: "retailer_domain",
        phase: "deterministic_plan_assembly",
        query: candidate.query,
        family: candidate.family,
        stage: candidate.stage,
        sourceDetail: domain,
      });

      return observer?.attachSearchQueryId(candidate, queryId) || candidate;
    });
  const queries: SearchQueryCandidate[] = [];

  addQuery(queries, observer, 1, "canonical_shopping", phrase([category, searchText || hardText, preferenceText, budget]));
  addQuery(queries, observer, 1, "canonical_shopping", phrase([ovenGasBase, primaryBaseRequirement, budget]));
  addQuery(queries, observer, 1, "hard_filter", phrase([primaryRequirement, category, budget]));
  addQuery(queries, observer, 1, "hard_filter", phrase([secondRequirement, ovenGasBase, budget]));
  addQuery(
    queries,
    observer,
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
    addQuery(queries, observer, 1, "canonical_shopping", phrase(["stainless steel gas range", budget]));
    addQuery(queries, observer, 2, "canonical_shopping", phrase(["freestanding gas range", baseSearchText, budget]));
    addQuery(queries, observer, 2, "canonical_shopping", phrase(["gas stove", baseSearchText, budget]));
  }
  addQuery(queries, observer, 1, "canonical_shopping", phrase([synonyms[3] || category, primaryBaseRequirement, "sale", budget]));
  queries.push(...retailerQueries.filter((query) => query.stage === 1));
  addQuery(queries, observer, 1, "canonical_shopping", phrase([category, "product page", searchText || hardText, preferenceText]));

  queries.push(...retailerQueries.filter((query) => query.stage === 2));
  addQuery(queries, observer, 2, "owner_experience", phrase([synonyms[1] || category, "reddit", searchText || hardText]));
  addQuery(queries, observer, 2, "owner_experience", phrase([synonyms[1] || category, "YouTube review", primaryBaseRequirement]));
  addQuery(
    queries,
    observer,
    2,
    "editorial_review",
    sourceDomainQuery(sourcePack.expertReviewDomains[0] || "", phrase(["best", reviewBase, budget])),
  );
  addQuery(
    queries,
    observer,
    2,
    "owner_experience",
    sourceDomainQuery(sourcePack.ownerDiscussionDomains[0] || "", phrase([reviewBase, "owner reviews", avoid.join(" ")])),
  );
  addQuery(queries, observer, 2, "canonical_shopping", phrase([synonyms[4] || synonyms[3] || category, "best value", budget]));
  addQuery(queries, observer, 2, "canonical_shopping", phrase([synonyms[1] || category, "premium best quality", premiumBudget]));

  queries.push(...retailerQueries.filter((query) => query.stage === 3));
  addQuery(queries, observer, 3, "editorial_review", phrase([synonyms[1] || category, "complaints problems long term"]));
  addQuery(
    queries,
    observer,
    3,
    "fallback",
    sourceDomainQuery(sourcePack.manufacturerDomains[0] || "", phrase([reviewBase, "official specs"])),
  );
  addQuery(queries, observer, 3, "fallback", phrase([synonyms[2] || category, "top rated", primaryBaseRequirement]));
  addQuery(queries, observer, 3, "fallback", phrase([category, "dimensions specs", searchText || hardText]));

  const uniqueQueries: SearchQueryCandidate[] = [];
  const seenQueries = new Map<string, string | undefined>();

  for (const query of queries) {
    const key = normalize(query.query);

    if (!key) {
      continue;
    }
    if (seenQueries.has(key)) {
      observer?.recordQueryMerge(
        observer.searchQueryId(query),
        seenQueries.get(key),
      );
      continue;
    }

    seenQueries.set(key, observer?.searchQueryId(query));
    uniqueQueries.push(query);
  }

  // R4 (flag-gated): constraint-bearing queries own the front of pass 1 —
  // and therefore the protected Shopping slots — so generic expansion can
  // never crowd out the shopper's stated constraints (RR-075).
  const constraintBearingPhrases = constraintAllocationEnabled()
    ? unique([...searchPhrases, ...preferences, ...features], (value) => value)
        .map((value) => normalize(value))
        .filter(Boolean)
    : [];

  function carriesConstraint(query: SearchQueryCandidate) {
    const normalized = normalize(query.query);

    return constraintBearingPhrases.some((phrase) =>
      normalized.includes(phrase),
    );
  }

  function observedStage(
    stage: SearchQueryStage,
    limit: number,
  ) {
    let candidates = uniqueQueries.filter((query) => query.stage === stage);

    if (stage === 1 && constraintBearingPhrases.length > 0) {
      candidates = [
        ...candidates.filter(carriesConstraint),
        ...candidates.filter((query) => !carriesConstraint(query)),
      ];
    }

    for (const query of candidates.slice(limit)) {
      observer?.recordQueryCull(
        observer.searchQueryId(query),
        "pass_stage_truncation",
        `deterministic pass-${stage} cap ${limit}`,
      );
    }

    return candidates.slice(0, limit);
  }

  const pass1 = observedStage(1, 8);
  const pass2 = observedStage(2, 6);
  const pass3 = observedStage(3, 4);
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
